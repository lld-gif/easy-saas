/**
 * Ghost hybrid search queries with Supabase fallback.
 *
 * Two code paths:
 * - Ghost enabled: calls hybrid_search() RPC on the Ghost instance,
 *   combining pgvectorscale (semantic) + pg_textsearch (BM25) scores.
 * - Ghost disabled: queries Supabase for same-category ideas ordered
 *   by popularity_score, excluding the current idea. Functionally
 *   useful (users still see related ideas) but not semantically aware.
 *
 * The caller doesn't need to know which path ran — the return type is
 * the same either way. A `source` field on the response indicates
 * which backend served the results for analytics and debugging.
 */

import type { QueryResultRow } from "pg"
import { GHOST_ENABLED, getGhostPool } from "./client"
import { createClient } from "@/lib/supabase/server"
import { embedOne, ideaEmbeddingText } from "@/lib/voyage"
import type { Idea } from "@/types"

/**
 * Weight for vector similarity vs BM25 in the hybrid score.
 * 0.5 = equal weight. Tilted slightly toward semantic (0.55) because
 * the whole reason for adding embeddings is to catch non-literal matches
 * that BM25 misses. Tune with real data post-launch if needed.
 */
const HYBRID_VECTOR_WEIGHT = 0.55
const HYBRID_BM25_WEIGHT = 1 - HYBRID_VECTOR_WEIGHT

export interface RelatedIdea {
  id: string
  slug: string
  title: string
  summary: string
  category: string
  mention_count: number
  popularity_score: number
  revenue_potential: string
  revenue_upper_usd: number | null
  similarity?: number
}

export interface RelatedIdeasResult {
  ideas: RelatedIdea[]
  source: "ghost" | "fallback"
}

/**
 * Get ideas related to the given idea. Uses Ghost hybrid search when
 * available, falls back to Supabase same-category + popularity sort.
 *
 * Designed to be called from server components — no client-side usage.
 * Returns an empty array on any error (Ghost down, query failure, etc.)
 * so the UI can gracefully hide the section.
 */
export async function getRelatedIdeas(
  idea: Pick<Idea, "id" | "title" | "summary" | "category">,
  limit: number = 5
): Promise<RelatedIdeasResult> {
  if (GHOST_ENABLED) {
    try {
      return await getRelatedFromGhost(idea, limit)
    } catch (err) {
      console.error("[ghost] Hybrid search failed, falling back to Supabase:", err)
      // Fall through to Supabase fallback
    }
  }

  return getRelatedFromSupabase(idea, limit)
}

// ---------------------------------------------------------------------------
// Ghost path — hybrid search via pgvectorscale + pg_textsearch
// ---------------------------------------------------------------------------

async function getRelatedFromGhost(
  idea: Pick<Idea, "id" | "title" | "summary" | "category">,
  limit: number
): Promise<RelatedIdeasResult> {
  const pool = await getGhostPool()
  if (!pool) return { ideas: [], source: "ghost" }

  // Build an OR-combined tsquery from the idea's title words so that
  // any matching keyword contributes to the ranking. This enables
  // cross-category discovery — "Competitor Price Monitoring for
  // Ecommerce Sellers" finds monitoring tools in productivity,
  // pricing tools in marketing, etc.
  //
  // Stop words (for, the, a, an, etc.) are stripped by Postgres's
  // english text search config automatically.
  const queryText = idea.title

  // Also embed the idea's title + summary for a vector-space search.
  // Non-fatal if Voyage is unreachable — falls through to BM25-only.
  const queryEmbedding = await embedOne(ideaEmbeddingText(idea), "query")
  const vecLiteral = queryEmbedding ? `[${queryEmbedding.join(",")}]` : null

  // Hybrid query. When we have a query embedding, run both BM25 and
  // vector-cosine, normalize each into [0,1], and blend with the
  // configured weights. When the embedding is unavailable (Voyage
  // down, key missing), fall back to pure BM25 — same shape as the
  // pre-embedding path.
  if (vecLiteral) {
    const result = await pool.query(
      `WITH query AS (
         SELECT
           to_tsquery('english',
             array_to_string(
               array(
                 SELECT lexeme FROM unnest(to_tsvector('english', $1)) AS t(lexeme, positions)
               ), ' | '
             )
           ) AS q,
           $4::vector AS qvec
       ),
       bm25 AS (
         SELECT i.id,
                ts_rank(i.search_vector, query.q) AS raw_score
         FROM ideas_search i, query
         WHERE i.search_vector @@ query.q
           AND i.id != $2
         ORDER BY raw_score DESC
         LIMIT 50
       ),
       vec AS (
         -- pgvector cosine distance (<=>): 0 = identical, 2 = opposite.
         -- Convert to similarity = 1 - distance, normalized to [0,1]
         -- (cosine distance on unit vectors is already in [0,2]).
         SELECT i.id,
                1 - (i.embedding <=> query.qvec) / 2.0 AS raw_score
         FROM ideas_search i, query
         WHERE i.embedding IS NOT NULL
           AND i.id != $2
         ORDER BY i.embedding <=> query.qvec ASC
         LIMIT 50
       ),
       -- Normalize each source's top score to [0,1] so blending is
       -- stable regardless of absolute ts_rank magnitudes.
       bm25_max AS (SELECT COALESCE(MAX(raw_score), 0) AS m FROM bm25),
       vec_max  AS (SELECT COALESCE(MAX(raw_score), 0) AS m FROM vec),
       combined AS (
         SELECT i.id,
                COALESCE(
                  (SELECT raw_score / NULLIF((SELECT m FROM bm25_max), 0) FROM bm25 WHERE bm25.id = i.id),
                  0
                ) AS bm25_norm,
                COALESCE(
                  (SELECT raw_score / NULLIF((SELECT m FROM vec_max), 0) FROM vec WHERE vec.id = i.id),
                  0
                ) AS vec_norm
         FROM ideas_search i
         WHERE i.id IN (SELECT id FROM bm25 UNION SELECT id FROM vec)
       )
       SELECT
         i.id, i.slug, i.title, i.summary, i.category,
         i.mention_count, i.revenue_upper_usd,
         (combined.bm25_norm * $5 + combined.vec_norm * $6) AS similarity
       FROM combined
       JOIN ideas_search i ON i.id = combined.id
       ORDER BY similarity DESC
       LIMIT $3`,
      [queryText, idea.id, limit, vecLiteral, HYBRID_BM25_WEIGHT, HYBRID_VECTOR_WEIGHT]
    )

    return {
      ideas: result.rows.map((row: QueryResultRow) => ({
        id: row.id as string,
        slug: (row.slug as string) ?? "",
        title: row.title as string,
        summary: row.summary as string,
        category: row.category as string,
        mention_count: (row.mention_count as number) ?? 0,
        popularity_score: 0,
        revenue_potential: "",
        revenue_upper_usd: (row.revenue_upper_usd as number | null) ?? null,
        similarity: row.similarity as number,
      })),
      source: "ghost",
    }
  }

  // Fallback: BM25-only (same as pre-embedding behavior).
  const result = await pool.query(
    `WITH query AS (
       SELECT to_tsquery('english',
         array_to_string(
           array(
             SELECT lexeme FROM unnest(to_tsvector('english', $1)) AS t(lexeme, positions)
           ), ' | '
         )
       ) AS q
     )
     SELECT
       i.id, i.slug, i.title, i.summary, i.category,
       i.mention_count, i.revenue_upper_usd,
       ts_rank(i.search_vector, query.q) AS similarity
     FROM ideas_search i, query
     WHERE i.search_vector @@ query.q
       AND i.id != $2
     ORDER BY similarity DESC
     LIMIT $3`,
    [queryText, idea.id, limit]
  )

  return {
    ideas: result.rows.map((row: QueryResultRow) => ({
      id: row.id as string,
      slug: (row.slug as string) ?? "",
      title: row.title as string,
      summary: row.summary as string,
      category: row.category as string,
      mention_count: (row.mention_count as number) ?? 0,
      popularity_score: 0,
      revenue_potential: "",
      revenue_upper_usd: (row.revenue_upper_usd as number | null) ?? null,
      similarity: row.similarity as number,
    })),
    source: "ghost",
  }
}

// ---------------------------------------------------------------------------
// Supabase fallback — same category, ordered by popularity
// ---------------------------------------------------------------------------

async function getRelatedFromSupabase(
  idea: Pick<Idea, "id" | "title" | "summary" | "category">,
  limit: number
): Promise<RelatedIdeasResult> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("ideas")
    .select(
      "id, slug, title, summary, category, mention_count, popularity_score, revenue_potential, revenue_upper_usd"
    )
    .eq("status", "active")
    .eq("category", idea.category)
    .neq("id", idea.id)
    .order("popularity_score", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("[ghost/fallback] Supabase query failed:", error)
    return { ideas: [], source: "fallback" }
  }

  return {
    ideas: (data ?? []) as RelatedIdea[],
    source: "fallback",
  }
}
