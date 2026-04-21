/**
 * Backfill Voyage AI embeddings for every idea in the Ghost
 * `ideas_search` table that doesn't have one yet.
 *
 * Usage: npx tsx scripts/backfill-embeddings.ts [--limit N] [--dry-run]
 *
 * Resumable — filters on `embedding IS NULL` so a crash mid-run
 * picks up where it stopped. Reports live token usage and estimated
 * cost (~$0.06/M tokens for voyage-3 at 1536-dim output).
 *
 * Input shape: voyage-3 accepts up to 128 texts per call. We batch at
 * 64 to stay comfortably inside that limit (idea summaries can run
 * ~350 tokens, so 64 * 400 = 25K tokens per request — well under
 * the per-request cap).
 */

import { Pool } from "pg"
import * as dotenv from "dotenv"
import { embed, ideaEmbeddingText, costUsd, VOYAGE_DIMENSION } from "../src/lib/voyage"

dotenv.config({ path: ".env.local", override: true })

const BATCH_SIZE = 64

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

async function main() {
  const { limit, dryRun } = parseArgs()

  if (!process.env.VOYAGE_API_KEY) {
    throw new Error("VOYAGE_API_KEY not set")
  }
  if (!process.env.GHOST_DATABASE_URL) {
    throw new Error("GHOST_DATABASE_URL not set")
  }

  const pool = new Pool({
    connectionString: process.env.GHOST_DATABASE_URL,
    max: 3,
  })

  // Quick sanity check on the embedding column dimension so we fail
  // fast if something was migrated behind our back.
  const dimCheck = await pool.query(
    `SELECT atttypmod FROM pg_attribute
     WHERE attrelid = 'ideas_search'::regclass AND attname = 'embedding'`
  )
  const declaredDim = dimCheck.rows[0]?.atttypmod
  if (declaredDim !== VOYAGE_DIMENSION) {
    throw new Error(
      `Ghost ideas_search.embedding declared as vector(${declaredDim}) ` +
        `but Voyage output_dimension=${VOYAGE_DIMENSION}. Bailing to avoid shape mismatch.`
    )
  }

  const countRes = await pool.query(
    `SELECT COUNT(*)::int AS needs
     FROM ideas_search WHERE embedding IS NULL`
  )
  const total: number = countRes.rows[0].needs
  const effective = limit ? Math.min(limit, total) : total

  console.log(`Voyage embedding backfill${dryRun ? " (DRY RUN)" : ""}`)
  console.log(`  ${total} ideas need embeddings`)
  console.log(`  Processing ${effective} this run (batch size ${BATCH_SIZE})`)
  console.log()

  let processed = 0
  let tokensUsed = 0
  let failures = 0
  const startTime = Date.now()

  while (processed < effective) {
    const remaining = effective - processed
    const fetchSize = Math.min(BATCH_SIZE, remaining)

    // Fetch the next chunk of un-embedded ideas. ORDER BY id is
    // arbitrary but stable, so a mid-run crash's resume picks up
    // deterministically.
    const ideasRes = await pool.query<{
      id: string
      title: string
      summary: string
    }>(
      `SELECT id, title, summary
       FROM ideas_search
       WHERE embedding IS NULL
       ORDER BY id
       LIMIT $1`,
      [fetchSize]
    )

    if (ideasRes.rows.length === 0) {
      console.log("No more ideas to embed.")
      break
    }

    const texts = ideasRes.rows.map((row) => ideaEmbeddingText(row))

    let embeddings: number[][] = []
    let batchTokens = 0
    try {
      const result = await embed(texts, "document")
      embeddings = result.embeddings
      batchTokens = result.totalTokens
    } catch (e) {
      failures += ideasRes.rows.length
      console.warn(
        `Batch failed (${ideasRes.rows.length} ideas):`,
        e instanceof Error ? e.message : String(e)
      )
      processed += ideasRes.rows.length
      continue
    }

    tokensUsed += batchTokens

    if (!dryRun) {
      // Update each row individually. A bulk UPDATE with FROM (VALUES ...)
      // would be faster but pgvector's array-of-vector parameter
      // handling through node-postgres is flaky enough that the
      // single-row path is safer. ~2s per batch, acceptable.
      for (let i = 0; i < ideasRes.rows.length; i++) {
        const row = ideasRes.rows[i]
        const vec = embeddings[i]
        if (!vec) continue
        try {
          // pgvector accepts the string form `[0.1,0.2,...]` as input
          // for a vector column. Faster than any parameterized array
          // path through pg's type coercion.
          const vecLiteral = `[${vec.join(",")}]`
          await pool.query(
            `UPDATE ideas_search SET embedding = $1::vector WHERE id = $2`,
            [vecLiteral, row.id]
          )
        } catch (e) {
          failures++
          console.warn(
            `UPDATE failed for ${row.id}:`,
            e instanceof Error ? e.message : String(e)
          )
        }
      }
    } else {
      // Dry-run preview — just log the first embedding's shape.
      if (processed === 0 && embeddings[0]) {
        console.log(
          `  [DRY] first embedding: dim=${embeddings[0].length}, ` +
            `sample=[${embeddings[0].slice(0, 3).map((n) => n.toFixed(4)).join(", ")}...]`
        )
      }
    }

    processed += ideasRes.rows.length
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
    const runningCost = costUsd(tokensUsed)
    console.log(
      `  Progress: ${processed}/${effective}  tokens: ${tokensUsed}  cost: $${runningCost.toFixed(4)}  elapsed: ${elapsed}s  failures: ${failures}`
    )
  }

  const finalCost = costUsd(tokensUsed)
  console.log("\nDone.")
  console.log(`  Processed:  ${processed}`)
  console.log(`  Failures:   ${failures}`)
  console.log(`  Tokens:     ${tokensUsed}`)
  console.log(`  Total cost: $${finalCost.toFixed(4)}`)

  await pool.end()
}

main().catch((err) => {
  console.error("Backfill failed:", err)
  process.exit(1)
})
