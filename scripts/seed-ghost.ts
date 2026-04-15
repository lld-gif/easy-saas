/**
 * Seed Ghost (Tiger Data Agentic Postgres) with ideas from Supabase.
 *
 * Usage: npx tsx scripts/seed-ghost.ts
 *
 * Reads all active ideas from Supabase and bulk-inserts them into the
 * Ghost ideas_search table. Embeddings are left NULL for now — BM25
 * text search works without them. Add embeddings later via a separate
 * pass when an OpenAI key is available.
 */

import { createClient } from "@supabase/supabase-js"
import { Pool } from "pg"
import * as dotenv from "dotenv"

dotenv.config({ path: ".env.local", override: true })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ghost = new Pool({
  connectionString: process.env.GHOST_DATABASE_URL!,
  max: 3,
})

const BATCH_SIZE = 100

async function seed() {
  console.log("Fetching active ideas from Supabase...")

  // Fetch all active ideas
  const allIdeas: Record<string, unknown>[] = []
  let offset = 0

  while (true) {
    const { data, error } = await supabase
      .from("ideas")
      .select("id, slug, title, summary, category, tags, mention_count, revenue_upper_usd")
      .eq("status", "active")
      .order("id")
      .range(offset, offset + 999)

    if (error) {
      console.error("Supabase fetch error:", error)
      break
    }

    if (!data || data.length === 0) break
    allIdeas.push(...data)
    offset += data.length
    process.stdout.write(`\r  fetched ${allIdeas.length} ideas...`)
  }

  console.log(`\nTotal ideas fetched: ${allIdeas.length}`)

  // Check existing count in Ghost
  const { rows: [{ count: existingCount }] } = await ghost.query("SELECT COUNT(*)::int AS count FROM ideas_search")
  console.log(`Existing ideas in Ghost: ${existingCount}`)

  // Bulk insert in batches
  let inserted = 0
  let skipped = 0

  for (let i = 0; i < allIdeas.length; i += BATCH_SIZE) {
    const batch = allIdeas.slice(i, i + BATCH_SIZE)

    // Build a multi-row INSERT with parameterized values
    const values: unknown[] = []
    const placeholders: string[] = []

    for (let j = 0; j < batch.length; j++) {
      const idea = batch[j]
      const base = j * 7
      placeholders.push(
        `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7})`
      )
      values.push(
        idea.id,
        idea.slug,
        idea.title,
        idea.summary,
        idea.category,
        idea.mention_count ?? 0,
        idea.revenue_upper_usd ?? null
      )
    }

    const sql = `
      INSERT INTO ideas_search (id, slug, title, summary, category, mention_count, revenue_upper_usd)
      VALUES ${placeholders.join(", ")}
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        summary = EXCLUDED.summary,
        category = EXCLUDED.category,
        mention_count = EXCLUDED.mention_count,
        revenue_upper_usd = EXCLUDED.revenue_upper_usd
    `

    try {
      await ghost.query(sql, values)
      inserted += batch.length
    } catch (err) {
      console.error(`\nBatch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, err)
      skipped += batch.length
    }

    process.stdout.write(`\r  inserted ${inserted} / ${allIdeas.length} (${skipped} skipped)`)
  }

  // Verify
  const { rows: [{ count: finalCount }] } = await ghost.query("SELECT COUNT(*)::int AS count FROM ideas_search")
  console.log(`\n\nDone! Ghost ideas_search: ${finalCount} rows`)
  console.log(`Inserted: ${inserted}, Skipped: ${skipped}`)
  console.log(`Embeddings: NULL (add later with OpenAI key)`)
  console.log(`BM25 text search: READY (search_vector auto-populated from title + summary)`)

  await ghost.end()
}

seed().catch((err) => {
  console.error("Seed failed:", err)
  process.exit(1)
})
