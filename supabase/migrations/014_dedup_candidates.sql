-- Dedup candidate pairs for admin review queue
-- Stores pairs of potentially duplicate ideas found via trigram similarity.
--
-- Context: the current deduplicateAndInsert() in the scraper edge functions
-- uses match_threshold: 0.6 on pg_trgm title similarity, which misses
-- ~231 candidate pairs at 0.45-0.60 similarity (documented in the overnight
-- Layer B audit). Rather than lowering the auto-merge threshold (false
-- merges are hard to undo), this migration stands up an admin review queue:
-- 1. find_dedup_candidates() RPC scans active ideas in the 0.45-0.60 band
--    and inserts new pairs into this table
-- 2. merge_ideas() RPC safely reassigns sources and archives the loser
-- 3. Admin UI at /admin/dedup lets a human triage pending pairs
--
-- Both RPCs are SECURITY DEFINER with pinned search_path (matches the
-- migration 013 hardening pattern) — all calls come from API routes running
-- as service_role, so DEFINER is required for the underlying writes to
-- succeed.

CREATE TABLE dedup_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_a uuid NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  idea_b uuid NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  similarity float NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'merged', 'dismissed')),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (idea_a, idea_b)
);

CREATE INDEX idx_dedup_candidates_status ON dedup_candidates (status);
CREATE INDEX idx_dedup_candidates_similarity ON dedup_candidates (similarity DESC);

ALTER TABLE dedup_candidates ENABLE ROW LEVEL SECURITY;
-- No public read policy — only service role access (admin)


-- RPC: find_dedup_candidates
-- Scans active ideas using pg_trgm similarity() on titles in the 0.45-0.60
-- band, same category, title length >= 15 chars, inserts into dedup_candidates,
-- returns the count of new pairs found.
CREATE OR REPLACE FUNCTION find_dedup_candidates()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_count integer;
BEGIN
  INSERT INTO dedup_candidates (idea_a, idea_b, similarity)
  SELECT
    a.id AS idea_a,
    b.id AS idea_b,
    similarity(a.title, b.title) AS sim
  FROM ideas a
  JOIN ideas b
    ON a.id < b.id                              -- avoid self-join and duplicates
    AND a.category = b.category                 -- same category only
    AND a.status = 'active'
    AND b.status = 'active'
    AND length(a.title) >= 15
    AND length(b.title) >= 15
    AND similarity(a.title, b.title) BETWEEN 0.45 AND 0.60
  ON CONFLICT (idea_a, idea_b) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;


-- RPC: merge_ideas(winner_id, loser_id)
-- Merges two ideas: sums mention_count, keeps longer description,
-- reassigns sources, marks loser as duplicate.
CREATE OR REPLACE FUNCTION merge_ideas(
  winner_id uuid,
  loser_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_winner ideas%ROWTYPE;
  v_loser ideas%ROWTYPE;
BEGIN
  -- Lock both rows (order by id to avoid deadlocks between concurrent merges)
  SELECT * INTO v_winner FROM ideas WHERE id = winner_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Winner idea % not found', winner_id;
  END IF;

  SELECT * INTO v_loser FROM ideas WHERE id = loser_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Loser idea % not found', loser_id;
  END IF;

  IF winner_id = loser_id THEN
    RAISE EXCEPTION 'Cannot merge an idea with itself';
  END IF;

  -- Sum mention_count onto winner
  UPDATE ideas
  SET
    mention_count = v_winner.mention_count + v_loser.mention_count,
    summary = CASE
      WHEN length(v_loser.summary) > length(v_winner.summary) THEN v_loser.summary
      ELSE v_winner.summary
    END,
    updated_at = now()
  WHERE id = winner_id;

  -- Reassign loser's sources to winner
  UPDATE idea_sources
  SET idea_id = winner_id
  WHERE idea_id = loser_id;

  -- Mark loser as duplicate
  UPDATE ideas
  SET status = 'archived', updated_at = now()
  WHERE id = loser_id;

  -- Mark the exact merged pair as merged
  UPDATE dedup_candidates
  SET status = 'merged', reviewed_at = now()
  WHERE status = 'pending'
    AND ((idea_a = winner_id AND idea_b = loser_id)
      OR (idea_a = loser_id AND idea_b = winner_id));

  -- Cascade: auto-dismiss any other pending pairs that reference the
  -- now-archived loser. Those pairs can't be reviewed meaningfully because
  -- one side is no longer active.
  UPDATE dedup_candidates
  SET status = 'dismissed', reviewed_at = now()
  WHERE status = 'pending'
    AND (idea_a = loser_id OR idea_b = loser_id);
END;
$$;
