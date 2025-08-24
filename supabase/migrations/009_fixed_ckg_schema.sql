-- Migration 009: Fixed Code Knowledge Graph Schema
-- This migration creates a corrected CKG schema that's compatible with UUID project IDs

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Create Code Knowledge Graph tables with UUID compatibility

-- Graph Nodes Table (Files, Classes, Functions, etc.)
CREATE TABLE IF NOT EXISTS graph_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE, -- Fixed: Changed from BIGINT to UUID
  name VARCHAR(255) NOT NULL,
  node_type VARCHAR(50) NOT NULL, -- 'file', 'class', 'function', 'variable', etc.
  file_path TEXT,
  start_line INTEGER,
  end_line INTEGER,
  metadata JSONB DEFAULT '{}',
  content_hash VARCHAR(64),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Graph Edges Table (Dependencies, Calls, Imports, etc.)
CREATE TABLE IF NOT EXISTS graph_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_node_id UUID REFERENCES graph_nodes(id) ON DELETE CASCADE,
  to_node_id UUID REFERENCES graph_nodes(id) ON DELETE CASCADE,
  relationship VARCHAR(50) NOT NULL, -- 'imports', 'calls', 'extends', 'implements', etc.
  weight FLOAT DEFAULT 1.0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Code Chunks Table (For semantic search and analysis)
CREATE TABLE IF NOT EXISTS code_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID REFERENCES graph_nodes(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  chunk_type VARCHAR(50), -- 'function_body', 'class_definition', 'import_block', etc.
  start_offset INTEGER,
  end_offset INTEGER,
  language VARCHAR(20),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Embeddings Table (For AI-powered semantic search)
CREATE TABLE IF NOT EXISTS embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_id UUID REFERENCES code_chunks(id) ON DELETE CASCADE,
  model_name VARCHAR(100) NOT NULL,
  embedding VECTOR(1536), -- OpenAI embedding dimension
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Diagnostics Table (Errors, Warnings, Suggestions)
CREATE TABLE IF NOT EXISTS diagnostics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID REFERENCES graph_nodes(id) ON DELETE CASCADE,
  diagnostic_type VARCHAR(50) NOT NULL, -- 'error', 'warning', 'info', 'suggestion'
  severity VARCHAR(20) DEFAULT 'info',
  message TEXT NOT NULL,
  rule_id VARCHAR(100),
  start_line INTEGER,
  end_line INTEGER,
  start_column INTEGER,
  end_column INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Symbol References Table (For find references functionality)
CREATE TABLE IF NOT EXISTS symbol_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol_node_id UUID REFERENCES graph_nodes(id) ON DELETE CASCADE,
  reference_node_id UUID REFERENCES graph_nodes(id) ON DELETE CASCADE,
  reference_type VARCHAR(50), -- 'definition', 'usage', 'declaration'
  line_number INTEGER,
  column_number INTEGER,
  context TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_graph_nodes_project_id ON graph_nodes(project_id);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_type ON graph_nodes(node_type);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_file_path ON graph_nodes(file_path);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_name ON graph_nodes(name);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_content_hash ON graph_nodes(content_hash);

CREATE INDEX IF NOT EXISTS idx_graph_edges_from_node ON graph_edges(from_node_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_to_node ON graph_edges(to_node_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_relationship ON graph_edges(relationship);
CREATE INDEX IF NOT EXISTS idx_graph_edges_weight ON graph_edges(weight);

CREATE INDEX IF NOT EXISTS idx_code_chunks_node_id ON code_chunks(node_id);
CREATE INDEX IF NOT EXISTS idx_code_chunks_type ON code_chunks(chunk_type);
CREATE INDEX IF NOT EXISTS idx_code_chunks_language ON code_chunks(language);

CREATE INDEX IF NOT EXISTS idx_embeddings_chunk_id ON embeddings(chunk_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_model ON embeddings(model_name);

CREATE INDEX IF NOT EXISTS idx_diagnostics_node_id ON diagnostics(node_id);
CREATE INDEX IF NOT EXISTS idx_diagnostics_type ON diagnostics(diagnostic_type);
CREATE INDEX IF NOT EXISTS idx_diagnostics_severity ON diagnostics(severity);

CREATE INDEX IF NOT EXISTS idx_symbol_refs_symbol ON symbol_references(symbol_node_id);
CREATE INDEX IF NOT EXISTS idx_symbol_refs_reference ON symbol_references(reference_node_id);
CREATE INDEX IF NOT EXISTS idx_symbol_refs_type ON symbol_references(reference_type);

-- Enable Row Level Security
ALTER TABLE graph_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE graph_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostics ENABLE ROW LEVEL SECURITY;
ALTER TABLE symbol_references ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (permissive for development)
CREATE POLICY "Allow all operations on graph_nodes" ON graph_nodes FOR ALL USING (true);
CREATE POLICY "Allow all operations on graph_edges" ON graph_edges FOR ALL USING (true);
CREATE POLICY "Allow all operations on code_chunks" ON code_chunks FOR ALL USING (true);
CREATE POLICY "Allow all operations on embeddings" ON embeddings FOR ALL USING (true);
CREATE POLICY "Allow all operations on diagnostics" ON diagnostics FOR ALL USING (true);
CREATE POLICY "Allow all operations on symbol_references" ON symbol_references FOR ALL USING (true);

-- Core CKG Functions

-- 1. Get Dependency Graph (Fixed for UUID)
CREATE OR REPLACE FUNCTION get_dependency_graph(
  project_filter UUID, -- Changed from BIGINT to UUID
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

-- 2. Search Similar Code Chunks
CREATE OR REPLACE FUNCTION search_similar_chunks(
  query_embedding VECTOR(1536),
  project_filter UUID DEFAULT NULL,
  similarity_threshold FLOAT DEFAULT 0.7,
  max_results INTEGER DEFAULT 10
)
RETURNS TABLE(
  chunk_id UUID,
  content TEXT,
  similarity FLOAT,
  node_name VARCHAR(255),
  file_path TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cc.id,
    cc.content,
    1 - (e.embedding <=> query_embedding) AS similarity,
    gn.name,
    gn.file_path
  FROM code_chunks cc
  JOIN embeddings e ON cc.id = e.chunk_id
  JOIN graph_nodes gn ON cc.node_id = gn.id
  WHERE (project_filter IS NULL OR gn.project_id = project_filter)
    AND (1 - (e.embedding <=> query_embedding)) >= similarity_threshold
  ORDER BY similarity DESC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- 3. Find Symbol Definitions
CREATE OR REPLACE FUNCTION find_symbol_definitions(
  symbol_name TEXT,
  project_filter UUID DEFAULT NULL,
  language_filter TEXT DEFAULT NULL
)
RETURNS TABLE(
  node_id UUID,
  name VARCHAR(255),
  node_type VARCHAR(50),
  file_path TEXT,
  start_line INTEGER,
  end_line INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gn.id,
    gn.name,
    gn.node_type,
    gn.file_path,
    gn.start_line,
    gn.end_line
  FROM graph_nodes gn
  JOIN code_chunks cc ON gn.id = cc.node_id
  WHERE gn.name ILIKE '%' || symbol_name || '%'
    AND gn.node_type IN ('function', 'class', 'variable', 'interface', 'type')
    AND (project_filter IS NULL OR gn.project_id = project_filter)
    AND (language_filter IS NULL OR cc.language = language_filter)
  ORDER BY gn.name;
END;
$$ LANGUAGE plpgsql;

-- 4. Find Symbol References
CREATE OR REPLACE FUNCTION find_symbol_references(
  symbol_node_id UUID,
  reference_type_filter TEXT DEFAULT NULL
)
RETURNS TABLE(
  reference_id UUID,
  reference_type VARCHAR(50),
  file_path TEXT,
  line_number INTEGER,
  column_number INTEGER,
  context TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sr.id,
    sr.reference_type,
    gn.file_path,
    sr.line_number,
    sr.column_number,
    sr.context
  FROM symbol_references sr
  JOIN graph_nodes gn ON sr.reference_node_id = gn.id
  WHERE sr.symbol_node_id = find_symbol_references.symbol_node_id
    AND (reference_type_filter IS NULL OR sr.reference_type = reference_type_filter)
  ORDER BY gn.file_path, sr.line_number;
END;
$$ LANGUAGE plpgsql;

-- 5. Search Code Chunks (Text-based search)
CREATE OR REPLACE FUNCTION search_code_chunks(
  search_query TEXT,
  project_filter UUID DEFAULT NULL,
  language_filter TEXT DEFAULT NULL,
  chunk_type_filter TEXT DEFAULT NULL,
  max_results INTEGER DEFAULT 20
)
RETURNS TABLE(
  chunk_id UUID,
  content TEXT,
  chunk_type VARCHAR(50),
  node_name VARCHAR(255),
  file_path TEXT,
  language VARCHAR(20),
  relevance_score FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cc.id,
    cc.content,
    cc.chunk_type,
    gn.name,
    gn.file_path,
    cc.language,
    ts_rank(to_tsvector('english', cc.content), plainto_tsquery('english', search_query)) AS relevance_score
  FROM code_chunks cc
  JOIN graph_nodes gn ON cc.node_id = gn.id
  WHERE to_tsvector('english', cc.content) @@ plainto_tsquery('english', search_query)
    AND (project_filter IS NULL OR gn.project_id = project_filter)
    AND (language_filter IS NULL OR cc.language = language_filter)
    AND (chunk_type_filter IS NULL OR cc.chunk_type = chunk_type_filter)
  ORDER BY relevance_score DESC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- 6. Get Project Statistics
CREATE OR REPLACE FUNCTION get_project_statistics(project_filter UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_nodes', (SELECT COUNT(*) FROM graph_nodes WHERE project_id = project_filter),
    'total_edges', (SELECT COUNT(*) FROM graph_edges ge JOIN graph_nodes gn ON ge.from_node_id = gn.id WHERE gn.project_id = project_filter),
    'total_chunks', (SELECT COUNT(*) FROM code_chunks cc JOIN graph_nodes gn ON cc.node_id = gn.id WHERE gn.project_id = project_filter),
    'node_types', (
      SELECT json_object_agg(node_type, count)
      FROM (
        SELECT node_type, COUNT(*) as count
        FROM graph_nodes
        WHERE project_id = project_filter
        GROUP BY node_type
      ) subq
    ),
    'languages', (
      SELECT json_object_agg(language, count)
      FROM (
        SELECT cc.language, COUNT(*) as count
        FROM code_chunks cc
        JOIN graph_nodes gn ON cc.node_id = gn.id
        WHERE gn.project_id = project_filter AND cc.language IS NOT NULL
        GROUP BY cc.language
      ) subq
    ),
    'relationship_types', (
      SELECT json_object_agg(relationship, count)
      FROM (
        SELECT ge.relationship, COUNT(*) as count
        FROM graph_edges ge
        JOIN graph_nodes gn ON ge.from_node_id = gn.id
        WHERE gn.project_id = project_filter
        GROUP BY ge.relationship
      ) subq
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Add function comments
COMMENT ON FUNCTION get_dependency_graph IS 'Generate dependency graph with configurable depth using recursive CTE (UUID compatible)';
COMMENT ON FUNCTION search_similar_chunks IS 'Search for semantically similar code chunks using vector embeddings';
COMMENT ON FUNCTION find_symbol_definitions IS 'Find symbol definitions by name with optional filtering';
COMMENT ON FUNCTION find_symbol_references IS 'Find all references to a specific symbol';
COMMENT ON FUNCTION search_code_chunks IS 'Full-text search in code chunks with relevance scoring';
COMMENT ON FUNCTION get_project_statistics IS 'Get comprehensive statistics for a project';

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_graph_nodes_updated_at 
    BEFORE UPDATE ON graph_nodes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Test data insertion function (for development)
CREATE OR REPLACE FUNCTION insert_test_ckg_data(project_id_param UUID)
RETURNS VOID AS $$
DECLARE
  file_node_id UUID;
  func_node_id UUID;
  class_node_id UUID;
  chunk_id UUID;
BEGIN
  -- Insert a test file node
  INSERT INTO graph_nodes (id, project_id, name, node_type, file_path, start_line, end_line)
  VALUES (gen_random_uuid(), project_id_param, 'test.js', 'file', '/src/test.js', 1, 50)
  RETURNING id INTO file_node_id;
  
  -- Insert a test function node
  INSERT INTO graph_nodes (id, project_id, name, node_type, file_path, start_line, end_line)
  VALUES (gen_random_uuid(), project_id_param, 'testFunction', 'function', '/src/test.js', 10, 20)
  RETURNING id INTO func_node_id;
  
  -- Insert a test class node
  INSERT INTO graph_nodes (id, project_id, name, node_type, file_path, start_line, end_line)
  VALUES (gen_random_uuid(), project_id_param, 'TestClass', 'class', '/src/test.js', 25, 45)
  RETURNING id INTO class_node_id;
  
  -- Insert edges
  INSERT INTO graph_edges (from_node_id, to_node_id, relationship, weight)
  VALUES 
    (file_node_id, func_node_id, 'contains', 1.0),
    (file_node_id, class_node_id, 'contains', 1.0),
    (func_node_id, class_node_id, 'uses', 0.8);
  
  -- Insert code chunks
  INSERT INTO code_chunks (node_id, content, chunk_type, language)
  VALUES 
    (func_node_id, 'function testFunction() {\n  console.log("test");\n}', 'function_body', 'javascript'),
    (class_node_id, 'class TestClass {\n  constructor() {}\n}', 'class_definition', 'javascript');
    
  RAISE NOTICE 'Test CKG data inserted for project %', project_id_param;
END;
$$ LANGUAGE plpgsql;
