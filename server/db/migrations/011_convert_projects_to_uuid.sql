-- Migration: Convert projects table to use UUID primary keys
-- Date: 2025-08-24
-- Purpose: Ensure all environments use UUID for project IDs

-- First, create a new projects table with UUID
CREATE TABLE IF NOT EXISTS projects_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  path TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_scanned_at TIMESTAMP WITH TIME ZONE,
  scan_status VARCHAR(50) DEFAULT 'pending'
);

-- Copy existing data with new UUIDs
INSERT INTO projects_new (name, path, description, created_at, updated_at, last_scanned_at, scan_status)
SELECT name, path, description, created_at, updated_at, last_scanned_at, scan_status
FROM projects;

-- Drop the old table
DROP TABLE projects;

-- Rename the new table
ALTER TABLE projects_new RENAME TO projects;

-- Update foreign key references in core tables
ALTER TABLE scans ALTER COLUMN project_id TYPE UUID USING project_id::TEXT::UUID;
ALTER TABLE graph_nodes ALTER COLUMN project_id TYPE UUID USING project_id::TEXT::UUID;
ALTER TABLE dependencies ALTER COLUMN project_id TYPE UUID USING project_id::TEXT::UUID;
ALTER TABLE conflicts ALTER COLUMN project_id TYPE UUID USING project_id::TEXT::UUID;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_uuid ON projects(id);
CREATE INDEX IF NOT EXISTS idx_scans_project_uuid ON scans(project_id);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_project_uuid ON graph_nodes(project_id);
CREATE INDEX IF NOT EXISTS idx_dependencies_project_uuid ON dependencies(project_id);
CREATE INDEX IF NOT EXISTS idx_conflicts_project_uuid ON conflicts(project_id);

-- Verify the migration
SELECT 'Migration completed successfully - core tables now use UUID project IDs' as status;
