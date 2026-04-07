-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Ideas table
CREATE TABLE ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  summary text NOT NULL,
  category text NOT NULL,
  tags text[] DEFAULT '{}',
  mention_count int DEFAULT 1,
  first_seen_at timestamptz DEFAULT now(),
  last_seen_at timestamptz DEFAULT now(),
  status text DEFAULT 'active' CHECK (status IN ('active', 'needs_review', 'archived')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  search_vector tsvector
);

-- Indexes
CREATE INDEX idx_ideas_category ON ideas (category);
CREATE INDEX idx_ideas_mention_count ON ideas (mention_count DESC);
CREATE INDEX idx_ideas_first_seen_at ON ideas (first_seen_at DESC);
CREATE INDEX idx_ideas_search ON ideas USING gin (search_vector);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ideas_updated_at
  BEFORE UPDATE ON ideas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- search_vector trigger (maintains tsvector on insert/update)
CREATE OR REPLACE FUNCTION update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', NEW.title || ' ' || NEW.summary || ' ' || array_to_string(NEW.tags, ' '));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ideas_search_vector
  BEFORE INSERT OR UPDATE OF title, summary, tags ON ideas
  FOR EACH ROW EXECUTE FUNCTION update_search_vector();

-- Idea sources (admin-only)
CREATE TABLE idea_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id uuid NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  source_platform text NOT NULL,
  source_url text,
  raw_text text,
  extracted_at timestamptz DEFAULT now()
);

CREATE INDEX idx_idea_sources_idea_id ON idea_sources (idea_id);
CREATE INDEX idx_idea_sources_platform ON idea_sources (source_platform);

-- Idea embeddings (for deduplication)
CREATE TABLE idea_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id uuid UNIQUE NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  embedding vector(1536)
);

-- RLS
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE idea_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE idea_embeddings ENABLE ROW LEVEL SECURITY;

-- ideas: public read
CREATE POLICY "ideas_public_read" ON ideas
  FOR SELECT USING (true);

-- Cosine similarity match function for deduplication
CREATE OR REPLACE FUNCTION match_idea_embeddings(
  query_embedding vector(1536),
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
