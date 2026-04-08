-- Enrichment columns for ideas
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS popularity_score float DEFAULT 0;
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS market_signal text DEFAULT 'unknown'
  CHECK (market_signal IN ('strong', 'moderate', 'weak', 'unknown'));
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS competition_level text DEFAULT 'unknown'
  CHECK (competition_level IN ('low', 'medium', 'high', 'unknown'));
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS revenue_potential text DEFAULT 'unknown';

CREATE INDEX IF NOT EXISTS idx_ideas_popularity_score ON ideas (popularity_score DESC);
CREATE INDEX IF NOT EXISTS idx_ideas_market_signal ON ideas (market_signal);

-- Function to compute popularity score
CREATE OR REPLACE FUNCTION compute_popularity_score(
  p_mention_count int,
  p_source_count int,
  p_last_seen_at timestamptz
) RETURNS float LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  recency_days float;
  recency_factor float;
BEGIN
  recency_days := EXTRACT(EPOCH FROM (now() - p_last_seen_at)) / 86400.0;
  recency_factor := GREATEST(0, 1.0 - (recency_days / 30.0));
  RETURN (p_mention_count * 0.5) + (p_source_count * 2.0) + (recency_factor * 3.0);
END;
$$;

-- Scrape runs table for pipeline health tracking
CREATE TABLE IF NOT EXISTS scrape_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_platform text NOT NULL,
  started_at timestamptz NOT NULL,
  finished_at timestamptz DEFAULT now(),
  posts_fetched int DEFAULT 0,
  ideas_extracted int DEFAULT 0,
  ideas_new int DEFAULT 0,
  ideas_duplicate int DEFAULT 0,
  ideas_error int DEFAULT 0,
  duration_ms int DEFAULT 0,
  status text DEFAULT 'success' CHECK (status IN ('success', 'failure')),
  error_message text
);

CREATE INDEX IF NOT EXISTS idx_scrape_runs_source ON scrape_runs (source_platform, finished_at DESC);
ALTER TABLE scrape_runs ENABLE ROW LEVEL SECURITY;
-- No public read policy — only service role access
