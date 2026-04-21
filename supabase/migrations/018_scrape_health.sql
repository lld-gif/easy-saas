-- 018_scrape_health.sql
-- Observability improvement #3 from the 2026-04-20 "three meaningful
-- improvements" review. Surfaces pipeline health at a glance on the
-- admin dashboard so silent scraper failures can't rot for weeks before
-- anyone notices.
--
-- The "Reddit returned 0 posts for a week" episode earlier this month
-- was exactly the class of bug this is meant to catch. pg_cron quietly
-- logs success rows with posts_fetched=0; to a human that reads as
-- failure, but nothing alerts.
--
-- Two artifacts:
--
-- 1. `scrape_runs_health_7d` VIEW — one row per source_platform, with
--    the last 7 days of stats + consecutive-failure count + stale-ness.
--    Cheap to query (indexed scan on scrape_runs), safe for admin UI.
--
-- 2. `get_platform_health()` RPC — returns the same shape as the view,
--    but wrapped as a function so the admin page can call it through
--    Supabase's PostgREST without needing view-level RLS.
--
-- RLS: scrape_runs is admin-only already (no RLS policy exists for
-- public). Both artifacts here inherit that by reading the table
-- directly — no new grants.

-- Drop existing (idempotent re-runs)
DROP VIEW IF EXISTS scrape_runs_health_7d CASCADE;

CREATE VIEW scrape_runs_health_7d AS
WITH recent_runs AS (
  -- Last 7 days of runs, filtered to the platforms we actively run.
  SELECT
    source_platform,
    started_at,
    status,
    posts_fetched,
    ideas_new,
    ideas_error,
    duration_ms,
    error_message
  FROM scrape_runs
  WHERE started_at >= NOW() - INTERVAL '7 days'
),
-- Per-platform aggregates over the 7-day window.
agg AS (
  SELECT
    source_platform,
    COUNT(*) AS total_runs_7d,
    COUNT(*) FILTER (WHERE status = 'success') AS successful_runs_7d,
    COUNT(*) FILTER (WHERE status = 'failure') AS failed_runs_7d,
    -- "Effective failure": pipeline said success but produced zero new
    -- ideas AND zero dupes. That's the silent-failure mode — usually
    -- means the upstream returned no posts (e.g. Reddit IP-blocked).
    COUNT(*) FILTER (
      WHERE status = 'success' AND posts_fetched = 0
    ) AS zero_post_runs_7d,
    SUM(posts_fetched) AS total_posts_7d,
    SUM(ideas_new) AS total_new_ideas_7d,
    SUM(ideas_error) AS total_ideas_errors_7d,
    AVG(duration_ms) FILTER (WHERE status = 'success')::int AS avg_duration_ms
  FROM recent_runs
  GROUP BY source_platform
),
-- Most recent run per platform (for staleness + last-error fields).
last_runs AS (
  SELECT DISTINCT ON (source_platform)
    source_platform,
    started_at AS last_run_at,
    status AS last_status,
    error_message AS last_error_message,
    posts_fetched AS last_posts_fetched
  FROM scrape_runs
  WHERE started_at >= NOW() - INTERVAL '30 days'
  ORDER BY source_platform, started_at DESC
),
-- Consecutive-failure streak ending at "now" per platform. Count the
-- most recent contiguous run of non-success rows. A 3+ streak is a
-- strong signal that something's broken.
--
-- Implementation is three nested CTEs because Postgres forbids nested
-- window function calls — we compute rn + rn_max in one pass, then
-- use the rn to resolve first_success_rn in a second pass, then
-- aggregate the count in the third.
ranked AS (
  SELECT
    source_platform,
    status,
    posts_fetched,
    ROW_NUMBER() OVER (PARTITION BY source_platform ORDER BY started_at DESC) AS rn,
    COUNT(*) OVER (PARTITION BY source_platform) AS rn_max
  FROM scrape_runs
  WHERE started_at >= NOW() - INTERVAL '30 days'
),
ranked_with_success AS (
  SELECT
    source_platform,
    rn,
    rn_max,
    -- Window MIN over only the success rows' rn values. Null per-row
    -- for failure rows, a number for success rows; MIN picks the
    -- smallest (most-recent) success rn.
    MIN(CASE WHEN status = 'success' AND posts_fetched > 0 THEN rn END)
      OVER (PARTITION BY source_platform) AS first_success_rn
  FROM ranked
),
streaks AS (
  SELECT
    source_platform,
    COUNT(*) FILTER (
      -- Rows before the first success row. If there's no success in
      -- 30 days (first_success_rn IS NULL), every row is in the
      -- streak — fall through to rn_max.
      WHERE rn <= COALESCE(first_success_rn - 1, rn_max)
    ) AS consecutive_failures
  FROM ranked_with_success
  GROUP BY source_platform
)
SELECT
  COALESCE(agg.source_platform, last_runs.source_platform, streaks.source_platform) AS source_platform,
  COALESCE(agg.total_runs_7d, 0) AS total_runs_7d,
  COALESCE(agg.successful_runs_7d, 0) AS successful_runs_7d,
  COALESCE(agg.failed_runs_7d, 0) AS failed_runs_7d,
  COALESCE(agg.zero_post_runs_7d, 0) AS zero_post_runs_7d,
  COALESCE(agg.total_posts_7d, 0) AS total_posts_7d,
  COALESCE(agg.total_new_ideas_7d, 0) AS total_new_ideas_7d,
  COALESCE(agg.total_ideas_errors_7d, 0) AS total_ideas_errors_7d,
  agg.avg_duration_ms,
  last_runs.last_run_at,
  last_runs.last_status,
  last_runs.last_error_message,
  last_runs.last_posts_fetched,
  -- Minutes since the last run of ANY status, capped at 30 days.
  CASE
    WHEN last_runs.last_run_at IS NULL THEN NULL
    ELSE EXTRACT(EPOCH FROM (NOW() - last_runs.last_run_at)) / 60
  END::int AS minutes_since_last_run,
  COALESCE(streaks.consecutive_failures, 0) AS consecutive_failures,
  -- Derived health state for the UI. 'healthy' / 'degraded' / 'stale' / 'broken' / 'unknown'.
  -- Thresholds chosen to match cron cadence:
  --   - Most scrapers run every 12h. >24h since last run = stale.
  --   - >48h = broken.
  --   - 3+ consecutive failures (including zero-post) = degraded.
  CASE
    WHEN last_runs.last_run_at IS NULL THEN 'unknown'
    WHEN EXTRACT(EPOCH FROM (NOW() - last_runs.last_run_at)) / 3600 > 48 THEN 'broken'
    WHEN EXTRACT(EPOCH FROM (NOW() - last_runs.last_run_at)) / 3600 > 24 THEN 'stale'
    WHEN COALESCE(streaks.consecutive_failures, 0) >= 3 THEN 'degraded'
    ELSE 'healthy'
  END AS health_state
FROM agg
FULL OUTER JOIN last_runs USING (source_platform)
FULL OUTER JOIN streaks USING (source_platform)
ORDER BY
  CASE
    WHEN last_runs.last_run_at IS NULL THEN 'unknown'
    WHEN EXTRACT(EPOCH FROM (NOW() - last_runs.last_run_at)) / 3600 > 48 THEN 'broken'
    WHEN EXTRACT(EPOCH FROM (NOW() - last_runs.last_run_at)) / 3600 > 24 THEN 'stale'
    WHEN COALESCE(streaks.consecutive_failures, 0) >= 3 THEN 'degraded'
    ELSE 'healthy'
  END DESC,  -- broken/stale/degraded float to the top
  source_platform;

COMMENT ON VIEW scrape_runs_health_7d IS
  'Per-platform pipeline health over the last 7 days + 30-day staleness check. Drives the /admin Pipeline Health widget and the alert cron. health_state: healthy / degraded / stale / broken / unknown.';

-- RPC wrapper so the admin page can call this through PostgREST.
-- SECURITY DEFINER is safe here because the function only reads from
-- scrape_runs which is not publicly readable anyway — but the function
-- itself is also not exposed to anon (see grants below).
CREATE OR REPLACE FUNCTION get_platform_health()
RETURNS TABLE (
  source_platform text,
  total_runs_7d bigint,
  successful_runs_7d bigint,
  failed_runs_7d bigint,
  zero_post_runs_7d bigint,
  total_posts_7d bigint,
  total_new_ideas_7d bigint,
  total_ideas_errors_7d bigint,
  avg_duration_ms int,
  last_run_at timestamptz,
  last_status text,
  last_error_message text,
  last_posts_fetched int,
  minutes_since_last_run int,
  consecutive_failures bigint,
  health_state text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM scrape_runs_health_7d;
$$;

COMMENT ON FUNCTION get_platform_health() IS
  'RPC wrapper for scrape_runs_health_7d view. Callable from the admin dashboard (requires admin auth upstream). Not granted to anon/authenticated — service-role only.';

-- Revoke default grants — this is admin-path only.
REVOKE ALL ON FUNCTION get_platform_health() FROM PUBLIC;
REVOKE ALL ON FUNCTION get_platform_health() FROM anon, authenticated;
