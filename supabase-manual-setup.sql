-- Supabase Manual Setup SQL
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/dgkwszetmagosuckjior/editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  path TEXT,
  language TEXT,
  framework TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create scans table
CREATE TABLE IF NOT EXISTS scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  results JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  scan_type TEXT DEFAULT 'full',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create files table
CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID REFERENCES scans(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  content TEXT,
  language TEXT,
  file_type TEXT,
  size_bytes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create dependencies table
CREATE TABLE IF NOT EXISTS dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID REFERENCES scans(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  version TEXT,
  type TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create conflicts table
CREATE TABLE IF NOT EXISTS conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID REFERENCES scans(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  description TEXT,
  severity TEXT DEFAULT 'medium',
  file_path TEXT,
  line_number INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE conflicts ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for development
CREATE POLICY "Allow all operations on projects" ON projects FOR ALL USING (true);
CREATE POLICY "Allow all operations on scans" ON scans FOR ALL USING (true);
CREATE POLICY "Allow all operations on files" ON files FOR ALL USING (true);
CREATE POLICY "Allow all operations on dependencies" ON dependencies FOR ALL USING (true);
CREATE POLICY "Allow all operations on conflicts" ON conflicts FOR ALL USING (true);

-- Create helper functions
CREATE OR REPLACE FUNCTION search_projects(search_query TEXT DEFAULT '', project_filter UUID DEFAULT NULL)
RETURNS TABLE(id UUID, name TEXT, description TEXT, path TEXT, rank REAL) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.name, p.description, p.path, 1.0::REAL as rank
  FROM projects p
  WHERE (project_filter IS NULL OR p.id = project_filter)
  AND (search_query = '' OR p.name ILIKE '%' || search_query || '%' 
       OR p.description ILIKE '%' || search_query || '%');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION search_scan_results(search_query TEXT DEFAULT '', scan_filter UUID DEFAULT NULL)
RETURNS TABLE(id UUID, project_id UUID, status TEXT, results JSONB, rank REAL) AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.project_id, s.status, s.results, 1.0::REAL as rank
  FROM scans s
  WHERE (scan_filter IS NULL OR s.id = scan_filter)
  AND (search_query = '' OR s.results::TEXT ILIKE '%' || search_query || '%');
END;
$$ LANGUAGE plpgsql;

-- Create database health function
CREATE OR REPLACE FUNCTION database_health()
RETURNS JSON AS $$
BEGIN
  RETURN json_build_object(
    'status', 'healthy',
    'timestamp', NOW(),
    'tables', (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'),
    'functions', (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public')
  );
END;
$$ LANGUAGE plpgsql;

-- Test the setup
SELECT 'Setup completed successfully' as status;
SELECT database_health();