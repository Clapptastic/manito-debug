-- Database Ownership Fixes
-- Fixes ownership conflicts between manito_dev and andrewclapp users

-- Transfer ownership of CKG tables to manito_dev
ALTER TABLE manito_dev.code_chunks OWNER TO manito_dev;
ALTER TABLE manito_dev.diagnostics OWNER TO manito_dev;
ALTER TABLE manito_dev.embeddings OWNER TO manito_dev;
ALTER TABLE manito_dev.graph_edges OWNER TO manito_dev;
ALTER TABLE manito_dev.graph_nodes OWNER TO manito_dev;
ALTER TABLE manito_dev.symbol_references OWNER TO manito_dev;

-- Grant proper permissions to manito_dev user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA manito_dev TO manito_dev;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA manito_dev TO manito_dev;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA manito_dev TO manito_dev;

-- Grant usage on schema
GRANT USAGE ON SCHEMA manito_dev TO manito_dev;

-- Ensure manito_dev can create tables in the schema
GRANT CREATE ON SCHEMA manito_dev TO manito_dev;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA manito_dev GRANT ALL ON TABLES TO manito_dev;
ALTER DEFAULT PRIVILEGES IN SCHEMA manito_dev GRANT ALL ON SEQUENCES TO manito_dev;
ALTER DEFAULT PRIVILEGES IN SCHEMA manito_dev GRANT ALL ON FUNCTIONS TO manito_dev;

-- Verify ownership changes
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'manito_dev' 
ORDER BY tablename;
