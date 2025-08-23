-- Supabase Schema for ManitoDebug
-- This schema creates all necessary tables and functions for the application

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user',
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  last_login TIMESTAMP,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  path TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_scanned_at TIMESTAMP,
  scan_status VARCHAR(50) DEFAULT 'pending'
);

-- Scans table
CREATE TABLE IF NOT EXISTS public.scans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  results JSONB,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

-- Files table
CREATE TABLE IF NOT EXISTS public.files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  content TEXT,
  lines INTEGER DEFAULT 0,
  size INTEGER DEFAULT 0,
  complexity INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Dependencies table
CREATE TABLE IF NOT EXISTS public.dependencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  version VARCHAR(100),
  type VARCHAR(50),
  source VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Conflicts table
CREATE TABLE IF NOT EXISTS public.conflicts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  type VARCHAR(100) NOT NULL,
  description TEXT,
  severity VARCHAR(20) DEFAULT 'medium',
  file_path TEXT,
  line_number INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Code Knowledge Graph tables
CREATE TABLE IF NOT EXISTS public.graph_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  node_type VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  file_path TEXT,
  line_number INTEGER,
  metadata JSONB DEFAULT '{}',
  embedding vector(1536),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.graph_edges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_node_id UUID REFERENCES public.graph_nodes(id) ON DELETE CASCADE,
  target_node_id UUID REFERENCES public.graph_nodes(id) ON DELETE CASCADE,
  edge_type VARCHAR(50) NOT NULL,
  weight FLOAT DEFAULT 1.0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.code_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  chunk_type VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  start_line INTEGER,
  end_line INTEGER,
  language VARCHAR(50),
  embedding vector(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_name ON public.projects USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_scans_project_id ON public.scans(project_id);
CREATE INDEX IF NOT EXISTS idx_files_project_id ON public.files(project_id);
CREATE INDEX IF NOT EXISTS idx_files_path ON public.files USING gin(file_path gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_dependencies_project_id ON public.dependencies(project_id);
CREATE INDEX IF NOT EXISTS idx_conflicts_project_id ON public.conflicts(project_id);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_project_id ON public.graph_nodes(project_id);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_type ON public.graph_nodes(node_type);
CREATE INDEX IF NOT EXISTS idx_graph_edges_source ON public.graph_edges(source_node_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_target ON public.graph_edges(target_node_id);
CREATE INDEX IF NOT EXISTS idx_code_chunks_project_id ON public.code_chunks(project_id);
CREATE INDEX IF NOT EXISTS idx_code_chunks_language ON public.code_chunks(language);

-- Vector similarity indexes
CREATE INDEX IF NOT EXISTS idx_graph_nodes_embedding ON public.graph_nodes USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_code_chunks_embedding ON public.code_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- RPC Functions for compatibility with existing code
CREATE OR REPLACE FUNCTION execute_sql(sql_text text, sql_params json DEFAULT '[]')
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- This is a simplified version - in production you'd want more robust SQL parsing
  -- For now, we'll return empty results and log the attempt
  RAISE NOTICE 'SQL execution attempted: %', sql_text;
  RETURN '[]'::json;
END;
$$;

-- Vector similarity search function
CREATE OR REPLACE FUNCTION search_similar_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.8,
  match_count int DEFAULT 10,
  project_filter uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  content text,
  similarity float,
  file_path text,
  chunk_type text,
  language text,
  metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cc.id,
    cc.content,
    1 - (cc.embedding <=> query_embedding) AS similarity,
    cc.file_path,
    cc.chunk_type,
    cc.language,
    cc.metadata
  FROM public.code_chunks cc
  WHERE 
    (project_filter IS NULL OR cc.project_id = project_filter)
    AND cc.embedding IS NOT NULL
    AND 1 - (cc.embedding <=> query_embedding) > match_threshold
  ORDER BY cc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Full-text search function
CREATE OR REPLACE FUNCTION search_code_chunks(
  search_query text,
  project_filter uuid DEFAULT NULL,
  language_filter text DEFAULT NULL,
  chunk_type_filter text DEFAULT NULL,
  match_count int DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  content text,
  file_path text,
  chunk_type text,
  language text,
  metadata jsonb,
  rank float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cc.id,
    cc.content,
    cc.file_path,
    cc.chunk_type,
    cc.language,
    cc.metadata,
    ts_rank(to_tsvector('english', cc.content), plainto_tsquery('english', search_query)) AS rank
  FROM public.code_chunks cc
  WHERE 
    (project_filter IS NULL OR cc.project_id = project_filter)
    AND (language_filter IS NULL OR cc.language = language_filter)
    AND (chunk_type_filter IS NULL OR cc.chunk_type = chunk_type_filter)
    AND to_tsvector('english', cc.content) @@ plainto_tsquery('english', search_query)
  ORDER BY rank DESC
  LIMIT match_count;
END;
$$;

-- Symbol definition search
CREATE OR REPLACE FUNCTION find_symbol_definitions(
  symbol_name text,
  project_filter uuid DEFAULT NULL,
  language_filter text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  name text,
  file_path text,
  line_number int,
  node_type text,
  metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gn.id,
    gn.name,
    gn.file_path,
    gn.line_number,
    gn.node_type,
    gn.metadata
  FROM public.graph_nodes gn
  WHERE 
    gn.name = symbol_name
    AND (project_filter IS NULL OR gn.project_id = project_filter)
    AND gn.node_type IN ('function', 'class', 'variable', 'method')
  ORDER BY gn.created_at DESC;
END;
$$;

-- Symbol references search
CREATE OR REPLACE FUNCTION find_symbol_references(
  symbol_name text,
  project_filter uuid DEFAULT NULL,
  match_count int DEFAULT 100
)
RETURNS TABLE (
  id uuid,
  content text,
  file_path text,
  start_line int,
  end_line int,
  chunk_type text,
  metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cc.id,
    cc.content,
    cc.file_path,
    cc.start_line,
    cc.end_line,
    cc.chunk_type,
    cc.metadata
  FROM public.code_chunks cc
  WHERE 
    (project_filter IS NULL OR cc.project_id = project_filter)
    AND cc.content LIKE '%' || symbol_name || '%'
  ORDER BY cc.created_at DESC
  LIMIT match_count;
END;
$$;

-- Dependency graph function
CREATE OR REPLACE FUNCTION get_dependency_graph(
  project_filter uuid,
  max_depth int DEFAULT 3
)
RETURNS TABLE (
  source_name text,
  target_name text,
  edge_type text,
  depth int,
  metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE dependency_tree AS (
    -- Base case: direct dependencies
    SELECT 
      sn.name as source_name,
      tn.name as target_name,
      ge.edge_type,
      1 as depth,
      ge.metadata
    FROM public.graph_edges ge
    JOIN public.graph_nodes sn ON ge.source_node_id = sn.id
    JOIN public.graph_nodes tn ON ge.target_node_id = tn.id
    WHERE sn.project_id = project_filter
    
    UNION ALL
    
    -- Recursive case: indirect dependencies
    SELECT 
      dt.source_name,
      tn.name as target_name,
      ge.edge_type,
      dt.depth + 1,
      ge.metadata
    FROM dependency_tree dt
    JOIN public.graph_nodes sn ON sn.name = dt.target_name
    JOIN public.graph_edges ge ON ge.source_node_id = sn.id
    JOIN public.graph_nodes tn ON ge.target_node_id = tn.id
    WHERE dt.depth < max_depth
  )
  SELECT * FROM dependency_tree;
END;
$$;

-- Row Level Security (RLS) Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.graph_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.graph_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_chunks ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (users can only access their own data)
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid()::text = id::text);

CREATE POLICY "Users can view their own projects" ON public.projects
  FOR ALL USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view their project scans" ON public.scans
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = scans.project_id 
    AND auth.uid()::text = p.user_id::text
  ));

CREATE POLICY "Users can view their project files" ON public.files
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = files.project_id 
    AND auth.uid()::text = p.user_id::text
  ));

CREATE POLICY "Users can view their project dependencies" ON public.dependencies
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = dependencies.project_id 
    AND auth.uid()::text = p.user_id::text
  ));

CREATE POLICY "Users can view their project conflicts" ON public.conflicts
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = conflicts.project_id 
    AND auth.uid()::text = p.user_id::text
  ));

CREATE POLICY "Users can view their project graph nodes" ON public.graph_nodes
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = graph_nodes.project_id 
    AND auth.uid()::text = p.user_id::text
  ));

CREATE POLICY "Users can view their project graph edges" ON public.graph_edges
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.graph_nodes gn
    JOIN public.projects p ON p.id = gn.project_id
    WHERE gn.id = graph_edges.source_node_id 
    AND auth.uid()::text = p.user_id::text
  ));

CREATE POLICY "Users can view their project code chunks" ON public.code_chunks
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = code_chunks.project_id 
    AND auth.uid()::text = p.user_id::text
  ));

-- Service role policies (bypass RLS for server-side operations)
CREATE POLICY "Service role can manage all data" ON public.users
  FOR ALL USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

CREATE POLICY "Service role can manage all projects" ON public.projects
  FOR ALL USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Apply similar service role policies to other tables
CREATE POLICY "Service role can manage all scans" ON public.scans
  FOR ALL USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

CREATE POLICY "Service role can manage all files" ON public.files
  FOR ALL USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

CREATE POLICY "Service role can manage all dependencies" ON public.dependencies
  FOR ALL USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

CREATE POLICY "Service role can manage all conflicts" ON public.conflicts
  FOR ALL USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

CREATE POLICY "Service role can manage all graph nodes" ON public.graph_nodes
  FOR ALL USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

CREATE POLICY "Service role can manage all graph edges" ON public.graph_edges
  FOR ALL USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

CREATE POLICY "Service role can manage all code chunks" ON public.code_chunks
  FOR ALL USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Update triggers for timestamp fields
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_graph_nodes_updated_at BEFORE UPDATE ON public.graph_nodes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();