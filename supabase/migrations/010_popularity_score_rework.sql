-- Migration: rework popularity score formula
-- Applied to Supabase project uailhfoyxaorntqwtebq on 2026-04-10
--
-- Problem with 009's formula, (mc * 0.5) + (sc * 2.0) + (rf * 3.0):
--   * source_count was weighted 4x more per unit than mention_count
--   * recency_factor contributed up to 3.0 points — a massive "fresh idea" plateau
--   * A fresh idea with mc=2, sc=2 scored 8.0 and cleared p99 (7.98)
--   * Result: popular badges firing on ideas users perceive as low-volume
--   * 98.6% of the corpus has sc=1, so sc*2.0 only rewarded a tiny minority —
--     but that reward was large enough to outweigh real mention volume
--
-- New formula: LN(1 + mc) * 3.0 + SQRT(sc) * 0.5 + rf * 0.3
--   * Log-scaled mention count dominates; prevents any single high-mc idea
--     from blowing out the distribution while still making mentions the
--     primary signal
--   * sqrt(source_count) * 0.5 is a small tiebreaker (sc=1 → 0.5, sc=2 → 0.71)
--   * recency_factor * 0.3 is a minor fresh-idea boost (max +0.3)
--
-- Validated against live corpus (n=1969) on 2026-04-10:
--   * p99 threshold: 6.607
--   * 20 ideas at or above p99 (same count as old formula — the percentile
--     is a function of corpus size, not formula choice)
--   * min mention_count of popular ideas: 6 (was 3 under old formula)
--   * All 20 popular ideas land within trending-sort ranks 1-23
--     (was: scattered across ranks 1-104 under old formula)

CREATE OR REPLACE FUNCTION compute_popularity_score(
  p_idea_id uuid
) RETURNS float LANGUAGE plpgsql AS $$
DECLARE
  v_mention_count int;
  v_source_count int;
  v_last_seen_at timestamptz;
  recency_days float;
  recency_factor float;
BEGIN
  SELECT mention_count, last_seen_at
  INTO v_mention_count, v_last_seen_at
  FROM ideas WHERE id = p_idea_id;

  SELECT COUNT(DISTINCT source_platform)
  INTO v_source_count
  FROM idea_sources WHERE idea_id = p_idea_id;

  v_mention_count := COALESCE(v_mention_count, 1);
  v_source_count := GREATEST(v_source_count, 1);
  v_last_seen_at := COALESCE(v_last_seen_at, now());

  recency_days := EXTRACT(EPOCH FROM (now() - v_last_seen_at)) / 86400.0;
  recency_factor := GREATEST(0, 1.0 - (recency_days / 30.0));

  -- Log-dominant: mentions are the primary signal, sources and recency are
  -- tiebreakers. See migration header for rationale and validation data.
  RETURN (LN(1 + v_mention_count) * 3.0)
       + (SQRT(v_source_count) * 0.5)
       + (recency_factor * 0.3);
END;
$$;

-- Recalculate every active idea's score under the new formula.
-- The 008 daily cron will also catch this, but doing it inline keeps the
-- preview/production transition clean.
SELECT recalculate_all_popularity_scores();
