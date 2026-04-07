-- Enable trigram extension for text similarity
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Drop embedding-related objects
DROP FUNCTION IF EXISTS match_idea_embeddings;
DROP TABLE IF EXISTS idea_embeddings;

-- Create trigram indexes for fast similarity search
CREATE INDEX idx_ideas_title_trgm ON ideas USING gin (title gin_trgm_ops);
CREATE INDEX idx_ideas_summary_trgm ON ideas USING gin (summary gin_trgm_ops);

-- Function to find similar ideas by title
CREATE OR REPLACE FUNCTION find_similar_ideas(
  search_title text,
  search_summary text,
  match_threshold float DEFAULT 0.6,
  match_count int DEFAULT 1
)
RETURNS TABLE (
  idea_id uuid,
  idea_title text,
  mention_count int,
  title_similarity float,
  summary_similarity float
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id AS idea_id,
    i.title AS idea_title,
    i.mention_count,
    similarity(i.title, search_title)::float AS title_similarity,
    similarity(i.summary, search_summary)::float AS summary_similarity
  FROM ideas i
  WHERE similarity(i.title, search_title) > match_threshold
     OR similarity(i.summary, search_summary) > (match_threshold - 0.1)
  ORDER BY similarity(i.title, search_title) DESC
  LIMIT match_count;
END;
$$;
