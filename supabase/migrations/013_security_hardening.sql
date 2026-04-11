-- Security hardening pass — addresses findings from Supabase database linter
-- run on 2026-04-10 post migration 012.
--
-- STATUS: STAGED, NOT YET APPLIED.
-- Reviewed by the user in the morning launch check. Apply before the
-- develop → main prod merge, or at any time after — all changes are
-- additive/defensive and cannot break existing functionality.
--
-- Advisor report references:
-- https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public
-- https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable
-- https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan
--
-- Sections:
--   1. Enable RLS on public.auto_tweets (was OFF — ERROR level finding)
--   2. Pin search_path on 10 functions (WARN level findings)
--   3. Wrap auth.uid() in (select auth.uid()) in 3 RLS policies (performance)
--
-- Safety notes:
--   - All three sections are defensive only. No behavior change for
--     service_role, no change to query results, no schema change.
--   - auto_tweets will have RLS enabled with NO policies — this matches the
--     existing pattern on idea_sources, newsletter_subscribers, and
--     scrape_runs. The only writer is the cron route which uses
--     service_role (which bypasses RLS), so the cron continues to work.
--   - Function ALTERs pin search_path to `public, pg_catalog`, preventing
--     search_path injection attacks. Functions continue to behave
--     identically because they already reference objects via the public
--     schema or unqualified (which resolves to public under the pinned
--     path).
--   - Policy DROP + CREATE pairs run inside the migration's transaction
--     (Supabase runner wraps each migration file in BEGIN/COMMIT), so the
--     DROP and CREATE are atomic to concurrent readers. No window where
--     the table has no policy.

-- ============================================================================
-- SECTION 1 — auto_tweets RLS
-- ============================================================================

ALTER TABLE public.auto_tweets ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.auto_tweets IS
  'Tweet posting history for the daily auto-tweet cron. RLS enabled with no policies — only the cron route (service_role) writes to this table, and service_role bypasses RLS. Anon and authenticated roles are fully denied, matching the pattern on idea_sources / newsletter_subscribers / scrape_runs.';

-- ============================================================================
-- SECTION 2 — Function search_path hardening
-- ============================================================================

-- Pin search_path to `public, pg_catalog` on every function in the public
-- schema. This prevents a malicious role from creating a shadowing function
-- or type in a schema earlier in search_path and getting their version
-- called instead.
--
-- None of these functions reference objects outside of public/pg_catalog,
-- so the pinned path is a strict superset of what they need.

ALTER FUNCTION public.parse_revenue_upper_usd(revenue text)
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.get_aggregate_stats()
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.find_similar_ideas(
  search_title text,
  search_summary text,
  match_threshold double precision,
  match_count integer
) SET search_path = public, pg_catalog;

ALTER FUNCTION public.compute_popularity_score(p_idea_id uuid)
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.compute_popularity_score(
  p_mention_count integer,
  p_source_count integer,
  p_last_seen_at timestamp with time zone
) SET search_path = public, pg_catalog;

ALTER FUNCTION public.recalculate_all_popularity_scores()
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.trigger_update_popularity()
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.update_search_vector()
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.update_updated_at()
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.handle_new_user()
  SET search_path = public, pg_catalog;

-- ============================================================================
-- SECTION 3 — RLS auth.uid() initplan optimization
-- ============================================================================

-- Wrap auth.uid() in (select auth.uid()) so Postgres evaluates it once per
-- query instead of once per row. The semantic effect is identical — both
-- forms return the same uuid — but the subquery form lets the planner
-- hoist the call out of the row-by-row loop.
--
-- We use DROP + CREATE because CREATE OR REPLACE POLICY doesn't exist.
-- The entire file runs in a single transaction (Supabase migration runner
-- default), so concurrent readers see either the pre-migration state or
-- the post-migration state, never a policy-less window.

-- --- generation_log.gen_log_own ---------------------------------------------

DROP POLICY IF EXISTS gen_log_own ON public.generation_log;
CREATE POLICY gen_log_own ON public.generation_log
  FOR SELECT
  USING ((select auth.uid()) = user_id);

-- --- idea_details.idea_details_pro_read -------------------------------------

DROP POLICY IF EXISTS idea_details_pro_read ON public.idea_details;
CREATE POLICY idea_details_pro_read ON public.idea_details
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = (select auth.uid())
        AND users.subscription_status = 'pro'
    )
  );

-- --- users.users_read_own ---------------------------------------------------

DROP POLICY IF EXISTS users_read_own ON public.users;
CREATE POLICY users_read_own ON public.users
  FOR SELECT
  USING ((select auth.uid()) = id);
