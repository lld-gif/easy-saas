/**
 * One-off Ghost schema migration — resize the
 * `ideas_search.embedding` column from vector(1536) (OpenAI-sized)
 * to vector(1024) (voyage-3 native).
 *
 * Safe because no row has an embedding populated yet (0/2006 before
 * running backfill-embeddings.ts). If rows had data, this would
 * truncate or crash.
 *
 * Drops the existing diskann index, resizes the column, then
 * rebuilds diskann. The diskann rebuild runs in the background on
 * pgvectorscale and will include entries as they're populated by
 * the backfill script — no need to wait for it to complete before
 * running the backfill.
 *
 * Run: npx tsx scripts/ghost-migrate-embedding-dim.ts
 * Idempotent: checks current dim first, no-op if already 1024.
 */

import { Pool } from "pg"
import * as dotenv from "dotenv"

dotenv.config({ path: ".env.local", override: true })

const TARGET_DIM = 1024

async function main() {
  if (!process.env.GHOST_DATABASE_URL) {
    throw new Error("GHOST_DATABASE_URL not set")
  }

  const pool = new Pool({
    connectionString: process.env.GHOST_DATABASE_URL,
    max: 1,
  })

  try {
    // Check current dimension.
    const dimRes = await pool.query(
      `SELECT atttypmod FROM pg_attribute
       WHERE attrelid = 'ideas_search'::regclass AND attname = 'embedding'`
    )
    const currentDim = dimRes.rows[0]?.atttypmod
    console.log(`Current embedding column: vector(${currentDim})`)

    if (currentDim === TARGET_DIM) {
      console.log("Already at target dim. No-op.")
      return
    }

    // Sanity: refuse to run if any row has an embedding populated.
    const coverage = await pool.query(
      `SELECT COUNT(*) FILTER (WHERE embedding IS NOT NULL) AS populated,
              COUNT(*) AS total FROM ideas_search`
    )
    const populated: number = Number(coverage.rows[0].populated)
    const total: number = Number(coverage.rows[0].total)
    console.log(`Rows with embedding: ${populated} / ${total}`)

    if (populated > 0) {
      throw new Error(
        `Refusing to resize — ${populated} rows already have embeddings. ` +
          `Resize would truncate or fail. Back up and clear embeddings first.`
      )
    }

    console.log(`\nDropping diskann index idx_ideas_search_embedding...`)
    await pool.query(`DROP INDEX IF EXISTS idx_ideas_search_embedding`)

    console.log(`Resizing column to vector(${TARGET_DIM})...`)
    // ALTER COLUMN TYPE on a pgvector column needs a USING clause
    // when the old column wasn't all NULL; for all-NULL columns the
    // cast is a no-op. Still include USING for safety.
    await pool.query(
      `ALTER TABLE ideas_search
         ALTER COLUMN embedding TYPE vector(${TARGET_DIM})
         USING NULL::vector(${TARGET_DIM})`
    )

    console.log(`Rebuilding diskann index...`)
    await pool.query(
      `CREATE INDEX idx_ideas_search_embedding
         ON ideas_search USING diskann (embedding)`
    )

    console.log(`\nDone. Verify:`)
    const verify = await pool.query(
      `SELECT atttypmod FROM pg_attribute
       WHERE attrelid = 'ideas_search'::regclass AND attname = 'embedding'`
    )
    console.log(`  embedding is now vector(${verify.rows[0].atttypmod})`)
  } finally {
    await pool.end()
  }
}

main().catch((err) => {
  console.error("Migration failed:", err)
  process.exit(1)
})
