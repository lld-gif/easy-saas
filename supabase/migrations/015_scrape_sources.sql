-- Configurable scrape sources for the admin UI.
-- Currently the scrapers have hardcoded source lists. This table lets
-- admins view and manage sources via /admin/sources. Future: scrapers
-- will read from this table at runtime instead of hardcoding.

CREATE TABLE scrape_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL CHECK (platform IN ('reddit', 'hackernews', 'github', 'producthunt', 'indiehackers', 'googletrends')),
  source_identifier text NOT NULL,  -- subreddit name, search query, etc.
  label text,                        -- human-friendly label (optional)
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_scrape_sources_platform ON scrape_sources (platform);
ALTER TABLE scrape_sources ENABLE ROW LEVEL SECURITY;

-- Seed with the currently hardcoded values from the Edge Functions
INSERT INTO scrape_sources (platform, source_identifier, label) VALUES
  ('reddit', 'SaaS', 'r/SaaS'),
  ('reddit', 'Entrepreneur', 'r/Entrepreneur'),
  ('reddit', 'SideProject', 'r/SideProject'),
  ('reddit', 'slavelabour', 'r/slavelabour'),
  ('reddit', 'microsaas', 'r/microsaas'),
  ('reddit', 'indiehackers', 'r/indiehackers'),
  ('hackernews', 'Show HN', 'Show HN posts'),
  ('hackernews', 'SaaS idea', 'SaaS idea discussions'),
  ('hackernews', 'I built', '"I built" posts'),
  ('hackernews', 'Ask HN what should', 'Ask HN idea threads'),
  ('hackernews', 'micro saas', 'micro-SaaS discussions'),
  ('hackernews', 'side project revenue', 'revenue discussions');
