-- Align Server Schema with Supabase Schema
-- This script fixes schema inconsistencies between server and Supabase migrations

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. Fix graph_nodes table column names
-- Rename 'type' to 'node_type' if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'graph_nodes' AND column_name = 'type'
    ) THEN
        ALTER TABLE graph_nodes RENAME COLUMN type TO node_type;
        RAISE NOTICE 'Renamed column "type" to "node_type" in graph_nodes table';
    ELSE
        RAISE NOTICE 'Column "node_type" already exists in graph_nodes table';
    END IF;
END $$;

-- Rename 'path' to 'file_path' if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'graph_nodes' AND column_name = 'path'
    ) THEN
        ALTER TABLE graph_nodes RENAME COLUMN path TO file_path;
        RAISE NOTICE 'Renamed column "path" to "file_path" in graph_nodes table';
    ELSE
        RAISE NOTICE 'Column "file_path" already exists in graph_nodes table';
    END IF;
END $$;

-- 3. Fix embeddings table data type
-- Check if embeddings table exists and has TEXT column
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
        
        RAISE NOTICE 'Recreated embeddings table with VECTOR(1536) type';
    ELSE
        RAISE NOTICE 'Embeddings table already has correct VECTOR type or does not exist';
    END IF;
END $$;

-- 4. Add missing indexes for vector similarity search
CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_embeddings_chunk ON embeddings(chunk_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_model ON embeddings(model);

-- 5. Add missing indexes for graph_nodes
CREATE INDEX IF NOT EXISTS idx_graph_nodes_type ON graph_nodes(node_type);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_path ON graph_nodes(file_path);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_language ON graph_nodes(language);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_project ON graph_nodes(project_id);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_name ON graph_nodes(name);

-- 6. Add missing indexes for graph_edges
CREATE INDEX IF NOT EXISTS idx_graph_edges_from ON graph_edges(from_node_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_to ON graph_edges(to_node_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_relationship ON graph_edges(relationship);

-- 7. Add missing indexes for code_chunks
CREATE INDEX IF NOT EXISTS idx_code_chunks_node ON code_chunks(node_id);
CREATE INDEX IF NOT EXISTS idx_code_chunks_type ON code_chunks(chunk_type);

-- 8. Add full-text search index for code_chunks
CREATE INDEX IF NOT EXISTS idx_code_chunks_content_fts ON code_chunks USING GIN (to_tsvector('english', content));

-- 9. Add missing indexes for diagnostics
CREATE INDEX IF NOT EXISTS idx_diagnostics_node ON diagnostics(node_id);
CREATE INDEX IF NOT EXISTS idx_diagnostics_severity ON diagnostics(severity);
CREATE INDEX IF NOT EXISTS idx_diagnostics_source ON diagnostics(source);

-- 10. Add missing indexes for symbol_references
CREATE INDEX IF NOT EXISTS idx_symbol_refs_symbol ON symbol_references(symbol_node_id);
CREATE INDEX IF NOT EXISTS idx_symbol_refs_reference ON symbol_references(reference_node_id);
CREATE INDEX IF NOT EXISTS idx_symbol_refs_type ON symbol_references(reference_type);

-- 11. Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_graph_nodes_type_project ON graph_nodes(node_type, project_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_relationship_from ON graph_edges(relationship, from_node_id);
CREATE INDEX IF NOT EXISTS idx_code_chunks_type_language ON code_chunks(chunk_type, language);

-- 12. Verify schema alignment
SELECT 'Verifying schema alignment...' as status;

-- Check table structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('graph_nodes', 'graph_edges', 'code_chunks', 'embeddings', 'diagnostics', 'symbol_references')
ORDER BY table_name, ordinal_position;

-- Check indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('graph_nodes', 'graph_edges', 'code_chunks', 'embeddings', 'diagnostics', 'symbol_references')
ORDER BY tablename, indexname;

-- Check extensions
SELECT extname, extversion 
FROM pg_extension 
WHERE extname IN ('uuid-ossp', 'vector', 'pg_trgm');
