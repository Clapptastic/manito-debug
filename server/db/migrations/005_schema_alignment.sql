-- Migration 005: Schema Alignment with Supabase
-- This migration aligns the server schema with Supabase schema to resolve conflicts

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Fix graph_nodes table column names to match Supabase schema
DO $$ 
BEGIN
    -- Rename 'type' to 'node_type' if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'graph_nodes' AND column_name = 'type'
    ) THEN
        ALTER TABLE graph_nodes RENAME COLUMN type TO node_type;
    END IF;
    
    -- Rename 'path' to 'file_path' if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'graph_nodes' AND column_name = 'path'
    ) THEN
        ALTER TABLE graph_nodes RENAME COLUMN path TO file_path;
    END IF;
END $$;

-- Update indexes to match new column names
DROP INDEX IF EXISTS idx_graph_nodes_type;
CREATE INDEX IF NOT EXISTS idx_graph_nodes_type ON graph_nodes(node_type);

DROP INDEX IF EXISTS idx_graph_nodes_path;
CREATE INDEX IF NOT EXISTS idx_graph_nodes_path ON graph_nodes(file_path);

-- Fix embeddings table to use VECTOR type instead of TEXT
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'embeddings' AND column_name = 'embedding' AND data_type = 'text'
    ) THEN
        -- Create backup of existing data
        CREATE TABLE IF NOT EXISTS embeddings_backup AS SELECT * FROM embeddings;
        
        -- Drop existing table and recreate with VECTOR type
        DROP TABLE embeddings;
        
        CREATE TABLE embeddings (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            chunk_id UUID REFERENCES code_chunks(id) ON DELETE CASCADE,
            embedding VECTOR(1536),
            model VARCHAR(100) DEFAULT 'text-embedding-ada-002',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;
END $$;

-- Add vector similarity index
CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Add full-text search index for code_chunks (if not exists)
CREATE INDEX IF NOT EXISTS idx_code_chunks_content_fts ON code_chunks USING GIN (to_tsvector('english', content));

-- Create composite indexes for better performance
CREATE INDEX IF NOT EXISTS idx_graph_nodes_type_project ON graph_nodes(node_type, project_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_relationship_from ON graph_edges(relationship, from_node_id);
CREATE INDEX IF NOT EXISTS idx_code_chunks_type_language ON code_chunks(chunk_type, language);

-- Add missing indexes for symbol_references
CREATE INDEX IF NOT EXISTS idx_symbol_refs_symbol ON symbol_references(symbol_node_id);
CREATE INDEX IF NOT EXISTS idx_symbol_refs_reference ON symbol_references(reference_node_id);
CREATE INDEX IF NOT EXISTS idx_symbol_refs_type ON symbol_references(reference_type);

-- Create helpful views for common queries
CREATE OR REPLACE VIEW node_summary AS
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

-- Create project statistics view
CREATE OR REPLACE VIEW project_stats AS
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

-- Add comments for documentation
COMMENT ON TABLE graph_nodes IS 'Core nodes in the code knowledge graph representing files, symbols, types, etc.';
COMMENT ON TABLE graph_edges IS 'Relationships between nodes (defines, references, imports, calls, etc.)';
COMMENT ON TABLE code_chunks IS 'Semantic chunks of code for embedding and AI retrieval';
COMMENT ON TABLE embeddings IS 'Vector embeddings for semantic similarity search';
COMMENT ON TABLE diagnostics IS 'Static analysis results and code quality issues';
COMMENT ON TABLE symbol_references IS 'Precise symbol usage tracking for definitions and references';

-- Log migration completion
INSERT INTO audit_log (event_type, message, user_id, metadata) 
VALUES (
    'MIGRATION_COMPLETED', 
    'Schema alignment migration completed - aligned with Supabase schema', 
    'system',
    '{"migration": "005_schema_alignment", "version": "2.1.0", "changes": ["column_renames", "vector_type", "indexes", "views"]}'
);
