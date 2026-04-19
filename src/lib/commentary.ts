/**
 * Shared commentary generation logic.
 *
 * Used by:
 *   - scripts/backfill-commentary.ts (one-time backfill of existing ideas)
 *   - scripts/backfill-enrichment.ts (future unified backfill if we
 *     consolidate later)
 *
 * NOT used by Edge Functions directly — Deno Edge runtime duplicates the
 * prompt inline in supabase/functions/_shared/extract.ts with a fetch call
 * to Anthropic's REST API (it can't import from src/lib). Keep the prompts
 * in sync manually.
 *
 * Model: Claude Sonnet 4.6. Chosen over Haiku 4.5 after the 2026-04-18
 * A/B test (docs/commentary-ab-test.md) — Sonnet names real competitors
 * and real pricing, which is worth the 4x cost delta (~$44/yr vs ~$11/yr
 * ongoing) for the GEO citation value.
 */

import Anthropic from "@anthropic-ai/sdk"

export const COMMENTARY_MODEL = "claude-sonnet-4-6"

export interface CommentaryInput {
  title: string
  summary: string
  category: string
  difficulty: number | null
  market_signal: string
  competition_level: string
  revenue_potential: string
  mention_count: number
}

export interface CommentaryResult {
  text: string
  model: string
  inputTokens: number
  outputTokens: number
}

/**
 * Prompt for the commentary generator. Intentionally terse — asks for
 * structure (timing / competitor / economics / risk) without specifying
 * bullet format, so the output reads as natural prose. Bans filler phrases
 * that both Haiku and Sonnet tend to produce by default.
 */
export function buildCommentaryPrompt(idea: CommentaryInput): string {
  return `You are writing a one-paragraph "why this is interesting" commentary for a directory page about a SaaS / product idea. The directory audience is indie hackers and developer-founders researching what to build.

Write 2-4 sentences that cover:
1. Market timing — why this is interesting *right now* (mention real trends if they exist, don't fabricate)
2. Closest competitor or substitute — name one if a well-known one exists, otherwise say "no clear incumbent"
3. Unit economics hint — why the revenue band makes sense (or doesn't)
4. Biggest risk — the single most likely reason this idea fails

Tone: direct, specific, no hype. Short declarative sentences. Avoid filler phrases like "could be a great opportunity" or "definitely has potential". If the idea is weak, say so. Do NOT restate the idea's summary. Do NOT use the phrase "this idea" — just discuss the thing. No headers, no bullets, no markdown. Just prose.

Context:
- Title: ${idea.title}
- Summary: ${idea.summary}
- Category: ${idea.category}
- Difficulty: ${idea.difficulty}/5
- Market signal: ${idea.market_signal}
- Competition: ${idea.competition_level}
- Revenue band: ${idea.revenue_potential}
- Cross-source mentions: ${idea.mention_count}

Return only the paragraph. No preamble.`
}

/**
 * Generate commentary for a single idea using the chosen model. Returns
 * the full result including token counts so callers can track cost.
 * Throws on API error — callers decide whether to retry or skip.
 */
export async function generateCommentary(
  client: Anthropic,
  idea: CommentaryInput
): Promise<CommentaryResult> {
  const res = await client.messages.create({
    model: COMMENTARY_MODEL,
    max_tokens: 400,
    messages: [{ role: "user", content: buildCommentaryPrompt(idea) }],
  })

  const block = res.content[0]
  const text = block && block.type === "text" ? block.text.trim() : ""

  if (!text) {
    throw new Error("Commentary generation returned empty text")
  }

  return {
    text,
    model: COMMENTARY_MODEL,
    inputTokens: res.usage.input_tokens,
    outputTokens: res.usage.output_tokens,
  }
}

/**
 * Cost math using Anthropic's published Sonnet 4.6 pricing:
 *   $3.00 / M input tokens, $15.00 / M output tokens
 * Kept in sync with the A/B test script. Exported so the backfill script
 * can report total spend live as it runs.
 */
export function costUsd(result: Pick<CommentaryResult, "inputTokens" | "outputTokens">): number {
  return (result.inputTokens * 3.0 + result.outputTokens * 15.0) / 1_000_000
}
