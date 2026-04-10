-- Migration: popularity score computation, trigger, and bulk recalculation
-- Applied manually to Supabase project uailhfoyxaorntqwtebq on 2026-04-09

-- Updated compute_popularity_score function (takes idea_id, looks up data itself)
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

  RETURN (v_mention_count * 0.5) + (v_source_count * 2.0) + (recency_factor * 3.0);
END;
$$;

-- Trigger function
CREATE OR REPLACE FUNCTION trigger_update_popularity()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.popularity_score := compute_popularity_score(NEW.id);
  RETURN NEW;
END;
$$;

-- Trigger on ideas table
DROP TRIGGER IF EXISTS ideas_popularity_score ON ideas;
CREATE TRIGGER ideas_popularity_score
  BEFORE INSERT OR UPDATE OF mention_count, last_seen_at ON ideas
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_popularity();

-- Bulk recalculation function (called by daily cron)
CREATE OR REPLACE FUNCTION recalculate_all_popularity_scores()
RETURNS int LANGUAGE plpgsql AS $$
DECLARE
  v_count int := 0;
  v_idea RECORD;
BEGIN
  FOR v_idea IN SELECT id FROM ideas WHERE status = 'active' LOOP
    UPDATE ideas
    SET popularity_score = compute_popularity_score(v_idea.id)
    WHERE id = v_idea.id;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;
