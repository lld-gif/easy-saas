/**
 * Commentary generation for the Next.js / Node runtime.
 *
 * Used by:
 *   - scripts/backfill-commentary.ts (one-time + on-demand backfill)
 *   - any future server-component or API route that needs to regenerate
 *     commentary on the fly
 *
 * The prompt template and model identifier live in
 * `supabase/functions/_shared/commentary-prompt.ts`, which is a
 * dependency-free TypeScript module that both this file and the Deno
 * Edge-runtime scraper share. That means a prompt tweak only has to
 * land in one place — no more "keep in sync manually" risk.
 */

import Anthropic from "@anthropic-ai/sdk"

import {
  COMMENTARY_MODEL,
  buildCommentaryPrompt,
  type CommentaryInput,
} from "../../supabase/functions/_shared/commentary-prompt"

export { COMMENTARY_MODEL, buildCommentaryPrompt }
export type { CommentaryInput }

export interface CommentaryResult {
  text: string
  model: string
  inputTokens: number
  outputTokens: number
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
