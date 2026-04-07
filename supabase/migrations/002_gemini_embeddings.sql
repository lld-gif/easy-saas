-- Switch from OpenAI (1536) to Gemini (768) embeddings
ALTER TABLE idea_embeddings ALTER COLUMN embedding TYPE vector(768);

-- Recreate match function with new dimension
CREATE OR REPLACE FUNCTION match_idea_embeddings(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.85,
  match_count int DEFAULT 1
)
RETURNS TABLE (
  idea_id uuid,
  mention_count int,
  similarity float
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ie.idea_id,
    i.mention_count,
    1 - (ie.embedding <=> query_embedding) AS similarity
  FROM idea_embeddings ie
  JOIN ideas i ON i.id = ie.idea_id
  WHERE 1 - (ie.embedding <=> query_embedding) > match_threshold
  ORDER BY ie.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
