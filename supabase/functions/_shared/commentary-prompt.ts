/**
 * Canonical source for the "why this is interesting" commentary prompt
 * AND the chosen model. Pure TypeScript, zero runtime imports, so it
 * can be consumed by both the Deno Edge runtime (via
 * `supabase/functions/_shared/extract.ts`) and the Next.js / Node
 * runtime (via `src/lib/commentary.ts`).
 *
 * **Why this file exists.** Before 2026-04-19 the prompt was duplicated
 * byte-for-byte in both files with a hand-waved "keep in sync" comment.
 * First prompt tweak would have diverged. This file removes the
 * divergence risk — there is one template and one model constant.
 */

/** Model chosen via the 2026-04-18 A/B test. See docs/commentary-ab-test.md. */
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

/**
 * Commentary prompt. Intentionally terse — asks for structure (timing /
 * competitor / economics / risk) without specifying bullet format so the
 * output reads as natural prose. Bans filler phrases both Haiku and
 * Sonnet tend to produce by default. Any edit here immediately applies
 * to both new-idea inserts (Edge Function pipeline) and backfill runs
 * (scripts/backfill-commentary.ts).
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
