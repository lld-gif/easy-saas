import { createClient } from "@/lib/supabase/server"

/**
 * Free-text search backing the /check page.
 *
 * Why not getRelatedIdeas from src/lib/ghost/queries.ts:
 *   - getRelatedIdeas() is designed around an existing idea row and
 *     uses Ghost (Tiger Data) for hybrid vector + BM25 search.
 *   - As of 2026-04-30 the Ghost connection is failing silently in
 *     prod; the function falls back to Supabase same-category search,
 *     which requires a non-empty category — useless for free-text
 *     queries from /check that have no category context.
 *   - /check needs vocabulary-tolerant matching against a free-text
 *     query, not similarity to a stored row. Cleaner to use Supabase's
 *     own `search_vector` tsvector column with a websearch query and
 *     ts_rank scoring.
 *
 * Trade-off vs Ghost hybrid: pure BM25 misses some vocabulary-drift
 * cases ("tools for dog owners" → pet ideas) that vector embeddings
 * would catch. Acceptable for v1 — the common /check queries are
 * keyword-rich pitches (people describe what their idea DOES) so BM25
 * is the right primitive. Revisit once Ghost connection is stable.
 */

export interface CheckMatch {
  id: string
  slug: string
  title: string
  summary: string
  category: string
  mention_count: number
  revenue_upper_usd: number | null
  similarity: number
}

const RESULTS_LIMIT = 8

/**
 * Run a free-text similarity search against active ideas, returning up
 * to `limit` matches with normalized scores in [0, 1] for verdict UX.
 *
 * Empty / very-short queries return an empty array — the page treats
 * <5 chars as "no query," so we don't waste a round-trip.
 */
export async function searchIdeasByDescription(
  query: string,
  limit: number = RESULTS_LIMIT
): Promise<CheckMatch[]> {
  const trimmed = query.trim()
  if (trimmed.length < 5) return []

  const supabase = await createClient()

  // Use postgrest's websearch_to_tsquery via .textSearch(type: "websearch")
  // — handles natural-language input including quoted phrases, AND/OR
  // operators, and negation. Falls back gracefully when none of the
  // lexemes match anything (returns []).
  const { data, error } = await supabase
    .from("ideas")
    .select(
      "id, slug, title, summary, category, mention_count, revenue_upper_usd"
    )
    .eq("status", "active")
    .textSearch("search_vector", trimmed, {
      type: "websearch",
      config: "english",
    })
    .order("popularity_score", { ascending: false, nullsFirst: false })
    .limit(limit * 3) // overshoot then rerank by similarity in-process

  if (error) {
    console.error("[check-search] textSearch failed:", error.message)
    return []
  }

  if (!data || data.length === 0) return []

  // For similarity scoring, compute a simple lexeme-overlap ratio
  // between the query and each title+summary. Cheap, deterministic,
  // and good enough to drive the verdict thresholds without an extra
  // round-trip to Postgres for ts_rank (which would require an RPC).
  const queryLexemes = new Set(
    trimmed
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 3)
  )
  if (queryLexemes.size === 0) return []

  const scored = data.map((row) => {
    const text = `${row.title} ${row.summary}`.toLowerCase()
    const textLexemes = new Set(
      text
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 3)
    )
    // Jaccard-flavoured intersection — count of query lexemes that
    // appear in the row's title+summary, divided by total query
    // lexemes. Score is always in [0,1].
    let overlap = 0
    for (const lex of queryLexemes) {
      if (textLexemes.has(lex)) overlap++
    }
    const similarity = overlap / queryLexemes.size
    return {
      id: row.id as string,
      slug: row.slug as string,
      title: row.title as string,
      summary: row.summary as string,
      category: row.category as string,
      mention_count: (row.mention_count as number) ?? 0,
      revenue_upper_usd: (row.revenue_upper_usd as number | null) ?? null,
      similarity,
    } satisfies CheckMatch
  })

  // Rerank by overlap similarity then truncate to the real limit.
  scored.sort((a, b) => b.similarity - a.similarity)
  return scored.slice(0, limit)
}
