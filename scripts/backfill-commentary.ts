/**
 * Backfill "why this is interesting" commentary for all active ideas that
 * don't have it yet.
 *
 * Uses Sonnet 4.6 (chosen via the 2026-04-18 A/B test — see
 * docs/commentary-ab-test.md). Cost estimate: ~$9 for 2,157 ideas.
 *
 * Resumable: filters on `commentary IS NULL`, so re-running after a crash
 * picks up where the previous run stopped. Partial index
 * `idx_ideas_needs_commentary` (migration 016) makes the filter cheap.
 *
 * Concurrency: processes ideas in batches of 5 concurrent API calls. Sonnet
 * rate limits are generous enough for this and it cuts wall time from
 * ~25min serial to ~5-7min. Checkpoints after every batch so a crash
 * loses at most 5 ideas' commentary to rerun.
 *
 * Run: npx tsx scripts/backfill-commentary.ts [--limit N] [--dry-run]
 */

import Anthropic from "@anthropic-ai/sdk"
import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"
import {
  generateCommentary,
  costUsd,
  COMMENTARY_MODEL,
  type CommentaryInput,
} from "../src/lib/commentary"

dotenv.config({ path: ".env.local", override: true })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const CONCURRENCY = 5
const BATCH_SIZE = 50

interface IdeaRow extends CommentaryInput {
  id: string
  slug: string
}

function parseArgs(): { limit: number | null; dryRun: boolean } {
  const args = process.argv.slice(2)
  let limit: number | null = null
  let dryRun = false
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--limit") {
      limit = parseInt(args[i + 1] ?? "0", 10) || null
      i++
    } else if (args[i] === "--dry-run") {
      dryRun = true
    }
  }
  return { limit, dryRun }
}

async function fetchBatch(batchSize: number): Promise<IdeaRow[]> {
  const { data, error } = await supabase
    .from("ideas")
    .select(
      "id, slug, title, summary, category, difficulty, market_signal, competition_level, revenue_potential, mention_count"
    )
    .eq("status", "active")
    .is("commentary", null)
    .order("popularity_score", { ascending: false })
    .limit(batchSize)

  if (error) {
    throw new Error(`Fetch failed: ${error.message}`)
  }
  return (data ?? []) as IdeaRow[]
}

async function countRemaining(): Promise<number> {
  const { count, error } = await supabase
    .from("ideas")
    .select("id", { count: "exact", head: true })
    .eq("status", "active")
    .is("commentary", null)

  if (error) {
    throw new Error(`Count failed: ${error.message}`)
  }
  return count ?? 0
}

async function processIdea(idea: IdeaRow, dryRun: boolean): Promise<{
  ok: boolean
  inputTokens: number
  outputTokens: number
  error?: string
}> {
  try {
    const result = await generateCommentary(anthropic, idea)

    if (dryRun) {
      console.log(`  [DRY] ${idea.slug}: ${result.text.slice(0, 120)}...`)
      return {
        ok: true,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      }
    }

    const { error } = await supabase
      .from("ideas")
      .update({
        commentary: result.text,
        commentary_generated_at: new Date().toISOString(),
        commentary_model: result.model,
      })
      .eq("id", idea.id)

    if (error) {
      return { ok: false, inputTokens: 0, outputTokens: 0, error: error.message }
    }

    return {
      ok: true,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
    }
  } catch (e) {
    return {
      ok: false,
      inputTokens: 0,
      outputTokens: 0,
      error: e instanceof Error ? e.message : String(e),
    }
  }
}

async function processBatchConcurrent(batch: IdeaRow[], dryRun: boolean) {
  const results: Awaited<ReturnType<typeof processIdea>>[] = []
  for (let i = 0; i < batch.length; i += CONCURRENCY) {
    const chunk = batch.slice(i, i + CONCURRENCY)
    const chunkResults = await Promise.all(
      chunk.map((idea) => processIdea(idea, dryRun))
    )
    results.push(...chunkResults)
  }
  return results
}

async function main() {
  const { limit, dryRun } = parseArgs()

  const total = await countRemaining()
  const effectiveTotal = limit ? Math.min(limit, total) : total
  console.log(
    `Commentary backfill — model: ${COMMENTARY_MODEL}${dryRun ? " (DRY RUN — no DB writes)" : ""}`
  )
  console.log(`  ${total} ideas need commentary`)
  console.log(`  Processing ${effectiveTotal} this run (concurrency=${CONCURRENCY}, batch=${BATCH_SIZE})`)
  console.log(`  Estimated cost: ~$${(effectiveTotal * 0.004).toFixed(2)}`)
  console.log()

  let processed = 0
  let succeeded = 0
  let failed = 0
  let totalInputTokens = 0
  let totalOutputTokens = 0
  const startTime = Date.now()

  while (processed < effectiveTotal) {
    const remaining = effectiveTotal - processed
    const batchSize = Math.min(BATCH_SIZE, remaining)
    const batch = await fetchBatch(batchSize)

    if (batch.length === 0) {
      console.log("No more ideas to process.")
      break
    }

    console.log(
      `Batch ${Math.floor(processed / BATCH_SIZE) + 1}: processing ${batch.length} ideas...`
    )
    const results = await processBatchConcurrent(batch, dryRun)

    for (const r of results) {
      if (r.ok) {
        succeeded++
        totalInputTokens += r.inputTokens
        totalOutputTokens += r.outputTokens
      } else {
        failed++
        console.warn(`  FAIL: ${r.error}`)
      }
    }

    processed += batch.length
    const cost = costUsd({
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
    })
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
    console.log(
      `  Progress: ${processed}/${effectiveTotal}  OK: ${succeeded}  FAIL: ${failed}  Cost so far: $${cost.toFixed(3)}  Elapsed: ${elapsed}s`
    )
    console.log()
  }

  const finalCost = costUsd({
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens,
  })
  console.log("Done.")
  console.log(`  Processed: ${processed}`)
  console.log(`  Succeeded: ${succeeded}`)
  console.log(`  Failed:    ${failed}`)
  console.log(`  Tokens:    in=${totalInputTokens} out=${totalOutputTokens}`)
  console.log(`  Total cost: $${finalCost.toFixed(4)}`)
}

main().catch((e) => {
  console.error("Backfill failed:", e)
  process.exit(1)
})
