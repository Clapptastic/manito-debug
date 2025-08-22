-- Fix Migration Duplication Errors
-- This script cleans up duplicate migration entries and fixes the migration system

-- 1. Check for duplicate migrations
SELECT 'Checking for duplicate migrations...' as status;

SELECT id, COUNT(*) as count
FROM migrations 
GROUP BY id 
HAVING COUNT(*) > 1
ORDER BY id;

-- 2. Clean up duplicate entries (keep the first one)
DELETE FROM migrations 
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY id ORDER BY created_at) as rn
    FROM migrations
  ) t 
  WHERE t.rn > 1
);

-- 3. Verify cleanup
SELECT 'Verifying cleanup...' as status;

SELECT id, COUNT(*) as count
FROM migrations 
GROUP BY id 
HAVING COUNT(*) > 1
ORDER BY id;

-- 4. Check migration table structure
SELECT 'Checking migration table structure...' as status;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'migrations'
ORDER BY ordinal_position;

-- 5. Create migration table if it doesn't exist
CREATE TABLE IF NOT EXISTS migrations (
  id VARCHAR(255) PRIMARY KEY,
  description TEXT,
  checksum VARCHAR(64),
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_migrations_applied_at ON migrations(applied_at);
CREATE INDEX IF NOT EXISTS idx_migrations_created_at ON migrations(created_at);

-- 7. Insert initial migration record if not exists
INSERT INTO migrations (id, description, checksum) 
VALUES ('001_initial_schema', 'Create initial database schema', 'a1b2c3d4e5f6')
ON CONFLICT (id) DO NOTHING;

-- 8. Show final migration status
SELECT 'Final migration status:' as status;

SELECT id, description, applied_at, created_at
FROM migrations 
ORDER BY applied_at;
