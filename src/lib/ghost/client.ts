/**
 * Ghost (Tiger Data Agentic Postgres) client for hybrid search.
 *
 * Ghost is a parallel read-only search layer — Supabase remains the
 * production database for all CRUD, auth, and RLS. Ghost powers the
 * "Related Ideas" feature on the detail page via hybrid search
 * (pgvectorscale + pg_textsearch BM25).
 *
 * When GHOST_DATABASE_URL is not set, all queries fall back to Supabase
 * same-category matching. The UI is identical either way.
 */

import { Pool } from "pg"

/**
 * True when a Ghost database URL is configured. Used to branch between
 * Ghost hybrid search and Supabase category-based fallback.
 */
export const GHOST_ENABLED = !!process.env.GHOST_DATABASE_URL

let _pool: Pool | null = null

/**
 * Lazy-initialized Ghost connection pool. Only created on first call
 * when GHOST_ENABLED is true. Returns null when Ghost is not configured.
 */
export function getGhostPool(): Pool | null {
  if (!GHOST_ENABLED) return null
  if (_pool) return _pool

  _pool = new Pool({
    connectionString: process.env.GHOST_DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  })

  return _pool
}
