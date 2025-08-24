-- Migration: Fix scan table schema mismatches
-- Date: 2025-08-24
-- Purpose: Align database schema with Scan model expectations

-- Add missing columns to scans table
ALTER TABLE scans ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE scans ADD COLUMN IF NOT EXISTS files_scanned INTEGER DEFAULT 0;
ALTER TABLE scans ADD COLUMN IF NOT EXISTS lines_of_code INTEGER DEFAULT 0;
ALTER TABLE scans ADD COLUMN IF NOT EXISTS conflicts_found INTEGER DEFAULT 0;
ALTER TABLE scans ADD COLUMN IF NOT EXISTS scan_options JSONB DEFAULT '{}';
ALTER TABLE scans ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Update existing records to populate started_at from created_at if started_at is null
UPDATE scans SET started_at = created_at WHERE started_at IS NULL;

-- Create index on started_at for better query performance
CREATE INDEX IF NOT EXISTS idx_scans_started_at ON scans(started_at);

-- Create index on project_id and started_at for project queries
CREATE INDEX IF NOT EXISTS idx_scans_project_started ON scans(project_id, started_at);

-- Add comments to document the schema
COMMENT ON COLUMN scans.started_at IS 'When the scan started (used for ordering)';
COMMENT ON COLUMN scans.created_at IS 'When the scan record was created';
COMMENT ON COLUMN scans.files_scanned IS 'Number of files scanned';
COMMENT ON COLUMN scans.lines_of_code IS 'Total lines of code scanned';
COMMENT ON COLUMN scans.conflicts_found IS 'Number of conflicts detected';
COMMENT ON COLUMN scans.scan_options IS 'Scan configuration options';
COMMENT ON COLUMN scans.error_message IS 'Error message if scan failed';

-- Verify the migration
SELECT 'Migration completed successfully' as status;
