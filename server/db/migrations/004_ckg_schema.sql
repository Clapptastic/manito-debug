-- Code Knowledge Graph Database Schema
-- Migration 004: Create CKG tables for nodes, edges, chunks, and embeddings

-- Note: pgvector extension would be enabled here in production
-- CREATE EXTENSION IF NOT EXISTS vector;

-- Graph Nodes Table
CREATE TABLE IF NOT EXISTS manito_dev.graph_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL, -- File, Symbol, Type, Endpoint, Module, Package
  name VARCHAR(255) NOT NULL,
  path TEXT,
  language VARCHAR(50),
  metadata JSONB DEFAULT '{}',
  commit_hash VARCHAR(40),
  project_id INTEGER REFERENCES manito_dev.projects(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Graph Edges Table  
CREATE TABLE IF NOT EXISTS manito_dev.graph_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_node_id UUID REFERENCES manito_dev.graph_nodes(id) ON DELETE CASCADE,
  to_node_id UUID REFERENCES manito_dev.graph_nodes(id) ON DELETE CASCADE,
  relationship VARCHAR(50) NOT NULL, -- defines, references, imports, exports, calls, extends
  metadata JSONB DEFAULT '{}',
  weight FLOAT DEFAULT 1.0,
  confidence FLOAT DEFAULT 1.0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Code Chunks Table for semantic search
CREATE TABLE IF NOT EXISTS manito_dev.code_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID REFERENCES manito_dev.graph_nodes(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  chunk_type VARCHAR(50) NOT NULL, -- signature, implementation, documentation, usage
  language VARCHAR(50),
  ts_vector tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Embeddings Table for vector search (without pgvector for now)
CREATE TABLE IF NOT EXISTS manito_dev.embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_id UUID REFERENCES manito_dev.code_chunks(id) ON DELETE CASCADE,
  embedding TEXT, -- JSON array of embedding values (fallback without pgvector)
  model VARCHAR(100) DEFAULT 'text-embedding-ada-002',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Diagnostics Table for static analysis results
CREATE TABLE IF NOT EXISTS manito_dev.diagnostics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID REFERENCES manito_dev.graph_nodes(id) ON DELETE CASCADE,
  severity VARCHAR(20) NOT NULL, -- error, warning, info, hint
  message TEXT NOT NULL,
  line_number INTEGER,
  column_number INTEGER,
  source VARCHAR(100), -- tsc, eslint, pyright, rust-analyzer, etc.
  rule VARCHAR(100), -- specific rule that triggered
  fix_suggestion TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Symbol References Table for precise lookups
CREATE TABLE IF NOT EXISTS manito_dev.symbol_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol_node_id UUID REFERENCES manito_dev.graph_nodes(id) ON DELETE CASCADE,
  reference_node_id UUID REFERENCES manito_dev.graph_nodes(id) ON DELETE CASCADE,
  reference_type VARCHAR(50) NOT NULL, -- definition, usage, call, instantiation
  line_number INTEGER,
  column_number INTEGER,
  context TEXT, -- surrounding code context
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_graph_nodes_type ON manito_dev.graph_nodes(type);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_path ON manito_dev.graph_nodes(path);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_language ON manito_dev.graph_nodes(language);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_project ON manito_dev.graph_nodes(project_id);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_name ON manito_dev.graph_nodes(name);

CREATE INDEX IF NOT EXISTS idx_graph_edges_from ON manito_dev.graph_edges(from_node_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_to ON manito_dev.graph_edges(to_node_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_relationship ON manito_dev.graph_edges(relationship);

CREATE INDEX IF NOT EXISTS idx_code_chunks_node ON manito_dev.code_chunks(node_id);
CREATE INDEX IF NOT EXISTS idx_code_chunks_type ON manito_dev.code_chunks(chunk_type);
CREATE INDEX IF NOT EXISTS idx_code_chunks_fts ON manito_dev.code_chunks USING GIN(ts_vector);

CREATE INDEX IF NOT EXISTS idx_embeddings_chunk ON manito_dev.embeddings(chunk_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_model ON manito_dev.embeddings(model);

CREATE INDEX IF NOT EXISTS idx_diagnostics_node ON manito_dev.diagnostics(node_id);
CREATE INDEX IF NOT EXISTS idx_diagnostics_severity ON manito_dev.diagnostics(severity);
CREATE INDEX IF NOT EXISTS idx_diagnostics_source ON manito_dev.diagnostics(source);

CREATE INDEX IF NOT EXISTS idx_symbol_refs_symbol ON manito_dev.symbol_references(symbol_node_id);
CREATE INDEX IF NOT EXISTS idx_symbol_refs_reference ON manito_dev.symbol_references(reference_node_id);
CREATE INDEX IF NOT EXISTS idx_symbol_refs_type ON manito_dev.symbol_references(reference_type);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_graph_nodes_type_project ON manito_dev.graph_nodes(type, project_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_relationship_from ON manito_dev.graph_edges(relationship, from_node_id);
CREATE INDEX IF NOT EXISTS idx_code_chunks_type_language ON manito_dev.code_chunks(chunk_type, language);

-- Full-text search function for code chunks
CREATE OR REPLACE FUNCTION manito_dev.search_code_chunks(
  search_query text,
  project_id integer DEFAULT NULL,
  language_filter text DEFAULT NULL,
  chunk_type_filter text DEFAULT NULL,
  limit_count integer DEFAULT 50
)
RETURNS TABLE(
  chunk_id uuid,
  node_id uuid,
  content text,
  chunk_type text,
  language text,
  node_name text,
  node_path text,
  rank float
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cc.id as chunk_id,
    cc.node_id,
    cc.content,
    cc.chunk_type,
    cc.language,
    gn.name as node_name,
    gn.path as node_path,
    ts_rank(cc.ts_vector, plainto_tsquery('english', search_query)) as rank
  FROM manito_dev.code_chunks cc
  JOIN manito_dev.graph_nodes gn ON cc.node_id = gn.id
  WHERE 
    cc.ts_vector @@ plainto_tsquery('english', search_query)
    AND (project_id IS NULL OR gn.project_id = project_id)
    AND (language_filter IS NULL OR cc.language = language_filter)
    AND (chunk_type_filter IS NULL OR cc.chunk_type = chunk_type_filter)
  ORDER BY rank DESC, cc.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Symbol lookup function
CREATE OR REPLACE FUNCTION manito_dev.find_symbol_definitions(
  symbol_name text,
  project_id integer DEFAULT NULL,
  language text DEFAULT NULL
)
RETURNS TABLE(
  node_id uuid,
  name text,
  type text,
  path text,
  line integer,
  metadata jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gn.id as node_id,
    gn.name,
    gn.type,
    gn.path,
    (gn.metadata->>'startPosition'->>'row')::integer as line,
    gn.metadata
  FROM manito_dev.graph_nodes gn
  WHERE 
    gn.name = symbol_name
    AND gn.type IN ('function', 'class', 'variable', 'interface', 'type')
    AND (project_id IS NULL OR gn.project_id = project_id)
    AND (language IS NULL OR gn.language = language)
  ORDER BY gn.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Symbol references function
CREATE OR REPLACE FUNCTION manito_dev.find_symbol_references(
  symbol_name text,
  project_id integer DEFAULT NULL,
  limit_count integer DEFAULT 100
)
RETURNS TABLE(
  reference_id uuid,
  symbol_node_id uuid,
  reference_node_id uuid,
  reference_type text,
  line_number integer,
  column_number integer,
  context text,
  file_path text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sr.id as reference_id,
    sr.symbol_node_id,
    sr.reference_node_id,
    sr.reference_type,
    sr.line_number,
    sr.column_number,
    sr.context,
    gn.path as file_path
  FROM manito_dev.symbol_references sr
  JOIN manito_dev.graph_nodes gn_symbol ON sr.symbol_node_id = gn_symbol.id
  JOIN manito_dev.graph_nodes gn ON sr.reference_node_id = gn.id
  WHERE 
    gn_symbol.name = symbol_name
    AND (project_id IS NULL OR gn_symbol.project_id = project_id)
  ORDER BY sr.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Dependency graph function
CREATE OR REPLACE FUNCTION manito_dev.get_dependency_graph(
  project_id integer,
  max_depth integer DEFAULT 3
)
RETURNS TABLE(
  from_node_id uuid,
  to_node_id uuid,
  from_name text,
  to_name text,
  from_type text,
  to_type text,
  relationship text,
  weight float,
  depth integer
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE dep_graph AS (
    -- Base case: direct dependencies
    SELECT 
      ge.from_node_id,
      ge.to_node_id,
      gn1.name as from_name,
      gn2.name as to_name,
      gn1.type as from_type,
      gn2.type as to_type,
      ge.relationship,
      ge.weight,
      1 as depth
    FROM manito_dev.graph_edges ge
    JOIN manito_dev.graph_nodes gn1 ON ge.from_node_id = gn1.id
    JOIN manito_dev.graph_nodes gn2 ON ge.to_node_id = gn2.id
    WHERE gn1.project_id = project_id
    
    UNION ALL
    
    -- Recursive case: transitive dependencies
    SELECT 
      dg.from_node_id,
      ge.to_node_id,
      dg.from_name,
      gn.name as to_name,
      dg.from_type,
      gn.type as to_type,
      ge.relationship,
      ge.weight * 0.8 as weight, -- Reduce weight for indirect dependencies
      dg.depth + 1
    FROM dep_graph dg
    JOIN manito_dev.graph_edges ge ON dg.to_node_id = ge.from_node_id
    JOIN manito_dev.graph_nodes gn ON ge.to_node_id = gn.id
    WHERE dg.depth < max_depth
  )
  SELECT * FROM dep_graph
  ORDER BY depth, weight DESC;
END;
$$ LANGUAGE plpgsql;
