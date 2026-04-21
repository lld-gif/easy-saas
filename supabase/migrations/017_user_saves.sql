-- 017_user_saves.sql
-- Feature #2 from Projects/VCI Feature Brainstorm — 2026-04-17.
--
-- Stores "⭐ saved" relationships between users and ideas. Backed by a
-- client-side SaveStar button on IdeaCard + idea detail page; rendered
-- as a list at /saved.
--
-- Privacy model: each row is owned by exactly one auth user. RLS
-- policies below enforce that a user can only see + mutate their own
-- saves. The service role (used by Edge Functions and admin routes)
-- bypasses RLS, but we don't currently read saves from the edge.
--
-- Uniqueness: (user_id, idea_id) is UNIQUE so duplicate saves are
-- idempotent — a double-click or a retried POST doesn't produce two
-- rows.

CREATE TABLE IF NOT EXISTS user_saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, idea_id)
);

-- Index for the /saved page's primary query: "show this user's saves
-- ordered by most recent". Partial index isn't appropriate here
-- because the table is expected to be predominantly saved rows
-- (unsaved ideas simply don't have a row).
CREATE INDEX IF NOT EXISTS idx_user_saves_user_saved_at
  ON user_saves (user_id, saved_at DESC);

-- Index used by getUserSavedIdeaIds() on every ideas-list render:
-- "give me the set of idea IDs this user has saved". Covering so the
-- query doesn't need a table lookup.
CREATE INDEX IF NOT EXISTS idx_user_saves_user_idea
  ON user_saves (user_id, idea_id);

-- Row-Level Security: a user can only see and modify their own saves.
ALTER TABLE user_saves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_saves_select_own"
  ON user_saves FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "user_saves_insert_own"
  ON user_saves FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "user_saves_delete_own"
  ON user_saves FOR DELETE
  USING ((SELECT auth.uid()) = user_id);

-- No UPDATE policy — saves are immutable once created.

COMMENT ON TABLE user_saves IS
  'Join table between auth.users and ideas. Every row is a single ''⭐ save'' event by a user. RLS-gated; users only see their own rows.';

COMMENT ON COLUMN user_saves.saved_at IS
  'When the user saved the idea. Drives ordering on /saved (most-recent first).';
