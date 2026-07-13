-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create content sections table for AI RAG
-- Stores chunked content from books, posts, courses, and videos as vector embeddings
CREATE TABLE IF NOT EXISTS public.content_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL CHECK (content_type IN ('book', 'post', 'course', 'video', 'podcast')),
  content_id UUID NOT NULL,
  section_index INTEGER NOT NULL,
  heading TEXT DEFAULT '',
  body_text TEXT NOT NULL,
  embedding VECTOR(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for faster content lookup by type and ID
CREATE INDEX IF NOT EXISTS idx_content_sections_content
  ON public.content_sections (content_type, content_id);

-- IVFFlat index for vector similarity search (create after ~1,000 rows)
CREATE INDEX IF NOT EXISTS idx_content_sections_embedding
  ON public.content_sections
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Index for updated_at ordering
CREATE INDEX IF NOT EXISTS idx_content_sections_updated_at
  ON public.content_sections (updated_at DESC);

-- Enable Row Level Security
ALTER TABLE public.content_sections ENABLE ROW LEVEL SECURITY;

-- Everyone can read published content sections
CREATE POLICY "Anyone can read content sections"
  ON public.content_sections FOR SELECT
  USING (true);

-- Only service role (server-side) can insert/update/delete
CREATE POLICY "Service role manages content sections"
  ON public.content_sections FOR ALL
  USING (auth.role() = 'service_role');

-- Create match_content_sections function for cosine similarity search
CREATE OR REPLACE FUNCTION public.match_content_sections(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10,
  filter_content_type TEXT DEFAULT NULL,
  filter_content_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  content_type TEXT,
  content_id UUID,
  section_index INTEGER,
  heading TEXT,
  body_text TEXT,
  similarity FLOAT,
  metadata JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cs.id,
    cs.content_type,
    cs.content_id,
    cs.section_index,
    cs.heading,
    cs.body_text,
    1 - (cs.embedding <=> query_embedding) AS similarity,
    cs.metadata,
    cs.created_at
  FROM public.content_sections cs
  WHERE
    cs.embedding IS NOT NULL
    AND 1 - (cs.embedding <=> query_embedding) > match_threshold
    AND (filter_content_type IS NULL OR cs.content_type = filter_content_type)
    AND (filter_content_id IS NULL OR cs.content_id = filter_content_id)
  ORDER BY cs.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_content_sections_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_content_sections_updated_at
  BEFORE UPDATE ON public.content_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_content_sections_updated_at();
