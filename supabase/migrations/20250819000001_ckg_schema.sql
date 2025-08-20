-- Code Knowledge Graph Schema for Supabase
-- Optimized for pgvector and Supabase features

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create projects table if not exists (for CKG integration)
CREATE TABLE IF NOT EXISTS projects (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  path TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_scanned_at TIMESTAMP WITH TIME ZONE,
  scan_status VARCHAR(50) DEFAULT 'pending'
);

-- Graph Nodes Table (Supabase optimized)
CREATE TABLE graph_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  node_type VARCHAR(50) NOT NULL, -- File, Symbol, Type, Endpoint, Module, Package
  name VARCHAR(255) NOT NULL,
  file_path TEXT,
  language VARCHAR(50),
  metadata JSONB DEFAULT '{}',
  commit_hash VARCHAR(40),
  project_id BIGINT REFERENCES projects(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Graph Edges Table
CREATE TABLE graph_edges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_node_id UUID REFERENCES graph_nodes(id) ON DELETE CASCADE,
  to_node_id UUID REFERENCES graph_nodes(id) ON DELETE CASCADE,
  relationship VARCHAR(50) NOT NULL, -- defines, references, imports, exports, calls, extends
  metadata JSONB DEFAULT '{}',
  weight FLOAT DEFAULT 1.0,
  confidence FLOAT DEFAULT 1.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Code Chunks Table for semantic search
CREATE TABLE code_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  node_id UUID REFERENCES graph_nodes(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  chunk_type VARCHAR(50) NOT NULL, -- signature, implementation, documentation, usage
  language VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Embeddings Table with native pgvector support
CREATE TABLE embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chunk_id UUID REFERENCES code_chunks(id) ON DELETE CASCADE,
  embedding VECTOR(1536), -- OpenAI embedding dimension with native pgvector
  model VARCHAR(100) DEFAULT 'text-embedding-ada-002',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Diagnostics Table for static analysis results
CREATE TABLE diagnostics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  node_id UUID REFERENCES graph_nodes(id) ON DELETE CASCADE,
  severity VARCHAR(20) NOT NULL, -- error, warning, info, hint
  message TEXT NOT NULL,
  line_number INTEGER,
  column_number INTEGER,
  source VARCHAR(100), -- tsc, eslint, pyright, rust-analyzer, etc.
  rule VARCHAR(100), -- specific rule that triggered
  fix_suggestion TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Symbol References Table for precise lookups
CREATE TABLE symbol_references (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol_node_id UUID REFERENCES graph_nodes(id) ON DELETE CASCADE,
  reference_node_id UUID REFERENCES graph_nodes(id) ON DELETE CASCADE,
  reference_type VARCHAR(50) NOT NULL, -- definition, usage, call, instantiation
  line_number INTEGER,
  column_number INTEGER,
  context TEXT, -- surrounding code context
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Optimized indexes for Supabase performance
CREATE INDEX idx_graph_nodes_type ON graph_nodes(node_type);
CREATE INDEX idx_graph_nodes_path ON graph_nodes(file_path);
CREATE INDEX idx_graph_nodes_language ON graph_nodes(language);
CREATE INDEX idx_graph_nodes_project ON graph_nodes(project_id);
CREATE INDEX idx_graph_nodes_name ON graph_nodes(name);

CREATE INDEX idx_graph_edges_from ON graph_edges(from_node_id);
CREATE INDEX idx_graph_edges_to ON graph_edges(to_node_id);
CREATE INDEX idx_graph_edges_relationship ON graph_edges(relationship);

CREATE INDEX idx_code_chunks_node ON code_chunks(node_id);
CREATE INDEX idx_code_chunks_type ON code_chunks(chunk_type);

-- Full-text search index for code content
CREATE INDEX idx_code_chunks_content_fts ON code_chunks USING GIN (to_tsvector('english', content));

-- Vector similarity index (pgvector)
CREATE INDEX idx_embeddings_vector ON embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_embeddings_chunk ON embeddings(chunk_id);
CREATE INDEX idx_embeddings_model ON embeddings(model);

CREATE INDEX idx_diagnostics_node ON diagnostics(node_id);
CREATE INDEX idx_diagnostics_severity ON diagnostics(severity);
CREATE INDEX idx_diagnostics_source ON diagnostics(source);

CREATE INDEX idx_symbol_refs_symbol ON symbol_references(symbol_node_id);
CREATE INDEX idx_symbol_refs_reference ON symbol_references(reference_node_id);
CREATE INDEX idx_symbol_refs_type ON symbol_references(reference_type);

-- Composite indexes for common queries
CREATE INDEX idx_graph_nodes_type_project ON graph_nodes(node_type, project_id);
CREATE INDEX idx_graph_edges_relationship_from ON graph_edges(relationship, from_node_id);
CREATE INDEX idx_code_chunks_type_language ON code_chunks(chunk_type, language);

-- Supabase-optimized functions for CKG operations

-- Vector similarity search function
CREATE OR REPLACE FUNCTION search_similar_chunks(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.8,
  match_count INTEGER DEFAULT 10,
  project_filter BIGINT DEFAULT NULL
)
RETURNS TABLE(
  chunk_id UUID,
  content TEXT,
  chunk_type VARCHAR(50),
  language VARCHAR(50),
  node_name VARCHAR(255),
  file_path TEXT,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cc.id AS chunk_id,
    cc.content,
    cc.chunk_type,
    cc.language,
    gn.name AS node_name,
    gn.file_path,
    (1 - (e.embedding <=> query_embedding)) AS similarity
  FROM embeddings e
  JOIN code_chunks cc ON e.chunk_id = cc.id
  JOIN graph_nodes gn ON cc.node_id = gn.id
  WHERE 
    (1 - (e.embedding <=> query_embedding)) > match_threshold
    AND (project_filter IS NULL OR gn.project_id = project_filter)
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Full-text search function for code chunks
CREATE OR REPLACE FUNCTION search_code_chunks(
  search_query TEXT,
  project_filter BIGINT DEFAULT NULL,
  language_filter VARCHAR(50) DEFAULT NULL,
  chunk_type_filter VARCHAR(50) DEFAULT NULL,
  match_count INTEGER DEFAULT 50
)
RETURNS TABLE(
  chunk_id UUID,
  node_id UUID,
  content TEXT,
  chunk_type VARCHAR(50),
  language VARCHAR(50),
  node_name VARCHAR(255),
  file_path TEXT,
  rank FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cc.id AS chunk_id,
    cc.node_id,
    cc.content,
    cc.chunk_type,
    cc.language,
    gn.name AS node_name,
    gn.file_path,
    ts_rank(to_tsvector('english', cc.content), plainto_tsquery('english', search_query)) AS rank
  FROM code_chunks cc
  JOIN graph_nodes gn ON cc.node_id = gn.id
  WHERE 
    to_tsvector('english', cc.content) @@ plainto_tsquery('english', search_query)
    AND (project_filter IS NULL OR gn.project_id = project_filter)
    AND (language_filter IS NULL OR cc.language = language_filter)
    AND (chunk_type_filter IS NULL OR cc.chunk_type = chunk_type_filter)
  ORDER BY rank DESC, cc.created_at DESC
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Symbol definition lookup function
CREATE OR REPLACE FUNCTION find_symbol_definitions(
  symbol_name TEXT,
  project_filter BIGINT DEFAULT NULL,
  language_filter VARCHAR(50) DEFAULT NULL
)
RETURNS TABLE(
  node_id UUID,
  name VARCHAR(255),
  node_type VARCHAR(50),
  file_path TEXT,
  line_number INTEGER,
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gn.id AS node_id,
    gn.name,
    gn.node_type,
    gn.file_path,
    COALESCE((gn.metadata->'startPosition'->>'row')::INTEGER, 0) AS line_number,
    gn.metadata
  FROM graph_nodes gn
  WHERE 
    gn.name = symbol_name
    AND gn.node_type IN ('Function', 'Class', 'Variable', 'Interface', 'Type')
    AND (project_filter IS NULL OR gn.project_id = project_filter)
    AND (language_filter IS NULL OR gn.language = language_filter)
  ORDER BY gn.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Symbol references lookup function
CREATE OR REPLACE FUNCTION find_symbol_references(
  symbol_name TEXT,
  project_filter BIGINT DEFAULT NULL,
  match_count INTEGER DEFAULT 100
)
RETURNS TABLE(
  reference_id UUID,
  symbol_node_id UUID,
  reference_node_id UUID,
  reference_type VARCHAR(50),
  line_number INTEGER,
  column_number INTEGER,
  context TEXT,
  file_path TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sr.id AS reference_id,
    sr.symbol_node_id,
    sr.reference_node_id,
    sr.reference_type,
    sr.line_number,
    sr.column_number,
    sr.context,
    gn.file_path
  FROM symbol_references sr
  JOIN graph_nodes gn_symbol ON sr.symbol_node_id = gn_symbol.id
  JOIN graph_nodes gn ON sr.reference_node_id = gn.id
  WHERE 
    gn_symbol.name = symbol_name
    AND (project_filter IS NULL OR gn_symbol.project_id = project_filter)
  ORDER BY sr.created_at DESC
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Dependency graph function with recursive CTE
CREATE OR REPLACE FUNCTION get_dependency_graph(
  project_filter BIGINT,
  max_depth INTEGER DEFAULT 3
)
RETURNS TABLE(
  from_node_id UUID,
  to_node_id UUID,
  from_name VARCHAR(255),
  to_name VARCHAR(255),
  from_type VARCHAR(50),
  to_type VARCHAR(50),
  relationship VARCHAR(50),
  weight FLOAT,
  depth INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE dep_graph AS (
    -- Base case: direct dependencies
    SELECT 
      ge.from_node_id,
      ge.to_node_id,
      gn1.name AS from_name,
      gn2.name AS to_name,
      gn1.node_type AS from_type,
      gn2.node_type AS to_type,
      ge.relationship,
      ge.weight,
      1 AS depth
    FROM graph_edges ge
    JOIN graph_nodes gn1 ON ge.from_node_id = gn1.id
    JOIN graph_nodes gn2 ON ge.to_node_id = gn2.id
    WHERE gn1.project_id = project_filter
    
    UNION ALL
    
    -- Recursive case: transitive dependencies
    SELECT 
      dg.from_node_id,
      ge.to_node_id,
      dg.from_name,
      gn.name AS to_name,
      dg.from_type,
      gn.node_type AS to_type,
      ge.relationship,
      ge.weight * 0.8 AS weight, -- Reduce weight for indirect dependencies
      dg.depth + 1
    FROM dep_graph dg
    JOIN graph_edges ge ON dg.to_node_id = ge.from_node_id
    JOIN graph_nodes gn ON ge.to_node_id = gn.id
    WHERE dg.depth < max_depth
  )
  SELECT * FROM dep_graph
  ORDER BY depth, weight DESC;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security for multi-tenant support
ALTER TABLE graph_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE graph_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostics ENABLE ROW LEVEL SECURITY;
ALTER TABLE symbol_references ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users (when auth is implemented)
CREATE POLICY "Users can view their project's graph nodes" ON graph_nodes
  FOR SELECT USING (true); -- For now, allow all access

CREATE POLICY "Users can insert their project's graph nodes" ON graph_nodes
  FOR INSERT WITH CHECK (true); -- For now, allow all access

CREATE POLICY "Users can update their project's graph nodes" ON graph_nodes
  FOR UPDATE USING (true); -- For now, allow all access

CREATE POLICY "Users can delete their project's graph nodes" ON graph_nodes
  FOR DELETE USING (true); -- For now, allow all access

-- Similar policies for other tables
CREATE POLICY "Allow all access to graph_edges" ON graph_edges FOR ALL USING (true);
CREATE POLICY "Allow all access to code_chunks" ON code_chunks FOR ALL USING (true);
CREATE POLICY "Allow all access to embeddings" ON embeddings FOR ALL USING (true);
CREATE POLICY "Allow all access to diagnostics" ON diagnostics FOR ALL USING (true);
CREATE POLICY "Allow all access to symbol_references" ON symbol_references FOR ALL USING (true);

-- Enable real-time subscriptions for CKG tables
ALTER PUBLICATION supabase_realtime ADD TABLE graph_nodes;
ALTER PUBLICATION supabase_realtime ADD TABLE graph_edges;
ALTER PUBLICATION supabase_realtime ADD TABLE code_chunks;

-- Create helpful views for common queries

-- Node summary view
CREATE VIEW node_summary AS
SELECT 
  gn.id,
  gn.name,
  gn.node_type,
  gn.file_path,
  gn.language,
  gn.project_id,
  COUNT(DISTINCT ge_out.id) AS outgoing_edges,
  COUNT(DISTINCT ge_in.id) AS incoming_edges,
  COUNT(DISTINCT cc.id) AS chunk_count,
  gn.created_at,
  gn.updated_at
FROM graph_nodes gn
LEFT JOIN graph_edges ge_out ON gn.id = ge_out.from_node_id
LEFT JOIN graph_edges ge_in ON gn.id = ge_in.to_node_id
LEFT JOIN code_chunks cc ON gn.id = cc.node_id
GROUP BY gn.id, gn.name, gn.node_type, gn.file_path, gn.language, gn.project_id, gn.created_at, gn.updated_at;

-- Project statistics view
CREATE VIEW project_stats AS
SELECT 
  p.id AS project_id,
  p.name AS project_name,
  COUNT(DISTINCT gn.id) AS total_nodes,
  COUNT(DISTINCT ge.id) AS total_edges,
  COUNT(DISTINCT cc.id) AS total_chunks,
  COUNT(DISTINCT e.id) AS total_embeddings,
  COUNT(DISTINCT CASE WHEN gn.node_type = 'File' THEN gn.id END) AS file_count,
  COUNT(DISTINCT CASE WHEN gn.node_type = 'Function' THEN gn.id END) AS function_count,
  COUNT(DISTINCT CASE WHEN gn.node_type = 'Class' THEN gn.id END) AS class_count,
  COUNT(DISTINCT gn.language) AS language_count,
  MAX(gn.updated_at) AS last_updated
FROM projects p
LEFT JOIN graph_nodes gn ON p.id = gn.project_id
LEFT JOIN graph_edges ge ON gn.id = ge.from_node_id
LEFT JOIN code_chunks cc ON gn.id = cc.node_id
LEFT JOIN embeddings e ON cc.id = e.chunk_id
GROUP BY p.id, p.name;

-- Comments for documentation
COMMENT ON TABLE graph_nodes IS 'Core nodes in the code knowledge graph representing files, symbols, types, etc.';
COMMENT ON TABLE graph_edges IS 'Relationships between nodes (defines, references, imports, calls, etc.)';
COMMENT ON TABLE code_chunks IS 'Semantic chunks of code for embedding and AI retrieval';
COMMENT ON TABLE embeddings IS 'Vector embeddings for semantic similarity search';
COMMENT ON TABLE diagnostics IS 'Static analysis results and code quality issues';
COMMENT ON TABLE symbol_references IS 'Precise symbol usage tracking for definitions and references';

COMMENT ON FUNCTION search_similar_chunks IS 'Vector similarity search using pgvector for semantic code search';
COMMENT ON FUNCTION search_code_chunks IS 'Full-text search across code chunks with ranking';
COMMENT ON FUNCTION find_symbol_definitions IS 'Find symbol definitions by name with filtering options';
COMMENT ON FUNCTION find_symbol_references IS 'Find all references to a symbol across the codebase';
COMMENT ON FUNCTION get_dependency_graph IS 'Generate dependency graph with configurable depth using recursive CTE';
