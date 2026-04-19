-- 016_commentary.sql
-- Add "Why this is interesting" commentary to the ideas table.
--
-- Feature #4 from Projects/VCI Feature Brainstorm — 2026-04-17. One paragraph
-- of LLM-generated analysis per idea (market timing, closest competitor,
-- unit economics hint, biggest risk). Rendered above the summary on idea
-- pages and included in /ideas/{slug}.md and /llms-full.txt.
--
-- Generated once per idea by Claude Sonnet 4.6 at insert time (new ideas)
-- or via the backfill script scripts/backfill-commentary.ts (existing 2,157
-- ideas). Regenerated rarely — we expect these to be stable across the
-- life of an idea unless the underlying summary changes materially.

-- Commentary body. Nullable because existing ideas won't have it until
-- the backfill runs, and new ideas may fail generation (we don't want
-- pipeline errors to block idea ingestion).
ALTER TABLE ideas
  ADD COLUMN IF NOT EXISTS commentary TEXT;

-- When the current commentary was generated. NULL means no commentary yet.
-- Used by the backfill script to resume work and by ops to tell how stale
-- a given commentary is.
ALTER TABLE ideas
  ADD COLUMN IF NOT EXISTS commentary_generated_at TIMESTAMPTZ;

-- Which model generated the current commentary. Gives us an audit trail
-- when we upgrade models in future (e.g. Sonnet 4.6 → Sonnet 5.0). No FK;
-- free-form string.
ALTER TABLE ideas
  ADD COLUMN IF NOT EXISTS commentary_model TEXT;

-- Index for the backfill script's resume logic: "find ideas without
-- commentary, ordered by popularity_score desc". Partial index keeps it
-- small once the backfill is complete.
CREATE INDEX IF NOT EXISTS idx_ideas_needs_commentary
  ON ideas (popularity_score DESC)
  WHERE commentary IS NULL AND status = 'active';

COMMENT ON COLUMN ideas.commentary IS
  'LLM-generated "why this is interesting" paragraph. 2-4 sentences covering market timing, closest competitor, unit economics, and biggest risk. Shown above the summary on /ideas/{slug}. NULL until the backfill runs or a new idea is ingested.';

COMMENT ON COLUMN ideas.commentary_generated_at IS
  'When commentary was last generated. NULL if no commentary yet.';

COMMENT ON COLUMN ideas.commentary_model IS
  'Model identifier that produced the current commentary (e.g. claude-sonnet-4-6). Audit trail for when we upgrade models.';
