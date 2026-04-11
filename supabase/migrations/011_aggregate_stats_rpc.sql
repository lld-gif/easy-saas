-- Migration: server-side aggregate stats RPC
-- Applied to Supabase project uailhfoyxaorntqwtebq on 2026-04-10
--
-- Problem: `getAggregateStats()` in src/lib/queries.ts fetched all active
-- ideas' popularity_score via a `.select("popularity_score").limit(100000)`
-- query, then computed p99 client-side in Node. PostgREST silently clamped
-- the response to ~1766 rows (short of the true 1969-row corpus) — the
-- client-requested `.limit(100000)` cannot override the server-configured
-- max-rows ceiling. The "p99 of a truncated 1766-row sample" = 4.07, which
-- made ~203 mid-ranked ideas qualify as Popular instead of the top ~20.
-- Observed as the Popular badge lighting up well past rank 200 on the
-- feature/popular-badge preview.
--
-- Root cause is architectural, not a limit value: any aggregate derived
-- from a fetched row set is vulnerable to transport truncation. The fix is
-- to compute the aggregate where the data lives — in Postgres — and only
-- ship the scalar across the wire.
--
-- This RPC returns { popularity_threshold, max_score, total } in a single
-- roundtrip. Zero rows transferred. percentile_disc matches the nearest-rank
-- semantics the previous client-side code was trying to implement.
--
-- See Knowledge/Midrank Percentile Computation for the full story —
-- the "Fifth fix" is: compute aggregates where the data lives.

CREATE OR REPLACE FUNCTION get_aggregate_stats()
RETURNS TABLE(
  popularity_threshold numeric,
  max_score numeric,
  total bigint
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    COALESCE(
      percentile_disc(0.99) WITHIN GROUP (ORDER BY popularity_score),
      0
    )::numeric AS popularity_threshold,
    COALESCE(MAX(popularity_score), 0)::numeric AS max_score,
    COUNT(*)::bigint AS total
  FROM ideas
  WHERE status = 'active'
    AND popularity_score IS NOT NULL;
$$;

-- Grant access to both anon and authenticated so server-rendered pages
-- (which use the anon key at request time via @/lib/supabase/server) and
-- any authenticated edge routes can both call it.
GRANT EXECUTE ON FUNCTION get_aggregate_stats() TO anon, authenticated;

-- Sanity check: expected result on the current corpus should be
-- { popularity_threshold: ~6.607, max_score: ~9.44, total: 1969 }
-- SELECT * FROM get_aggregate_stats();
