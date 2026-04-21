/**
 * Voyage AI embedding client.
 *
 * Why Voyage: top-tier quality (beats OpenAI text-embedding-3-* on MTEB),
 * 200M token lifetime free tier, no credit card for signup. Anthropic
 * themselves recommend Voyage for embedding workloads since they don't
 * ship their own embedding model.
 *
 * Dimension choice: 1024 (voyage-3 native). The Ghost `ideas_search.embedding`
 * column was originally declared `vector(1536)` sized for OpenAI's
 * text-embedding-3-small. Since we're using Voyage instead, we
 * re-migrate the column to `vector(1024)` — voyage-3 only supports
 * its native 1024 (no output_dimension knob like voyage-3-large).
 * Zero data loss because no row had an embedding populated yet.
 *
 * Input type: `document` for the backfill (we're embedding ideas to
 * be searched against), `query` when we embed a user search string at
 * query time. Voyage tunes these differently internally; passing the
 * right one improves retrieval by a few percentage points.
 */

const VOYAGE_ENDPOINT = "https://api.voyageai.com/v1/embeddings"
export const VOYAGE_MODEL = "voyage-3"
/**
 * voyage-3 emits 1024-dim vectors natively. It does NOT accept an
 * output_dimension override — that knob only exists on voyage-3-large.
 * Keep the Ghost `ideas_search.embedding` column sized to match.
 */
export const VOYAGE_DIMENSION = 1024

export type VoyageInputType = "document" | "query"

interface VoyageResponse {
  object: string
  data: Array<{
    object: string
    embedding: number[]
    index: number
  }>
  model: string
  usage: {
    total_tokens: number
  }
}

interface EmbedResult {
  embeddings: number[][]
  totalTokens: number
}

export class VoyageError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = "VoyageError"
  }
}

/**
 * Embed one or more texts. Voyage accepts up to 128 texts per request
 * (and a ~120K token total), so callers with large batches should
 * chunk before calling.
 *
 * Bounded by a 30s AbortController — embedding is usually fast (<2s
 * for 20 texts) but a single slow call should never wedge the caller.
 */
export async function embed(
  texts: string[],
  inputType: VoyageInputType = "document",
  timeoutMs = 30_000
): Promise<EmbedResult> {
  const apiKey = process.env.VOYAGE_API_KEY
  if (!apiKey) {
    throw new VoyageError("VOYAGE_API_KEY not set", 0)
  }
  if (texts.length === 0) {
    return { embeddings: [], totalTokens: 0 }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(VOYAGE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        input: texts,
        model: VOYAGE_MODEL,
        input_type: inputType,
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      const text = await res.text().catch(() => "")
      throw new VoyageError(
        `Voyage API ${res.status}: ${text.slice(0, 200)}`,
        res.status
      )
    }

    const data = (await res.json()) as VoyageResponse
    // Voyage returns embeddings in the same order as input; sort by
    // index defensively anyway in case the API ever changes.
    const ordered = [...data.data].sort((a, b) => a.index - b.index)
    return {
      embeddings: ordered.map((d) => d.embedding),
      totalTokens: data.usage.total_tokens,
    }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Single-text convenience wrapper. Returns null on failure so callers
 * that use embeddings as a non-fatal enhancement (e.g. Edge Function
 * insert pipeline) can log and proceed without embeddings.
 */
export async function embedOne(
  text: string,
  inputType: VoyageInputType = "document"
): Promise<number[] | null> {
  try {
    const { embeddings } = await embed([text], inputType)
    return embeddings[0] ?? null
  } catch (e) {
    console.warn(
      "[voyage] embedOne failed:",
      e instanceof Error ? e.message : String(e)
    )
    return null
  }
}

/**
 * Cost math. Voyage-3 pricing as of 2026-04-20: $0.06 per million
 * input tokens. No output tokens (embedding endpoint). Export for
 * the backfill script's live cost readout.
 */
export function costUsd(tokens: number): number {
  return (tokens / 1_000_000) * 0.06
}

/**
 * Canonical input text for an idea. Concatenates title + summary so
 * the embedding captures both the what-to-call-it and the what-it-is.
 * Kept as a single function so the backfill script and the Edge
 * Function integration produce identical embeddings for the same row.
 */
export function ideaEmbeddingText(idea: {
  title: string
  summary: string
}): string {
  return `${idea.title}\n\n${idea.summary}`
}
