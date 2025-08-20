-- Migration Table Cleanup
-- Fixes duplicate migration entries and constraint violations

-- Clean up duplicate migration entries
DELETE FROM manito_dev.migrations 
WHERE id = '001_initial_schema' 
AND status = 'failed';

DELETE FROM manito_dev.migrations 
WHERE id = '001_initial_schema' 
AND error_message IS NOT NULL;

-- Remove any duplicate entries for the same migration
DELETE FROM manito_dev.migrations 
WHERE id IN (
    SELECT id 
    FROM manito_dev.migrations 
    GROUP BY id 
    HAVING COUNT(*) > 1
) 
AND applied_at IS NULL;

-- Reset migration sequence if needed
SELECT setval(
    'manito_dev.migrations_id_seq', 
    COALESCE((SELECT MAX(CAST(id AS INTEGER)) FROM manito_dev.migrations), 0)
);

-- Verify migration table state
SELECT 
    id,
    description,
    status,
    applied_at,
    error_message
FROM manito_dev.migrations 
ORDER BY applied_at;

-- Show current sequence value
SELECT currval('manito_dev.migrations_id_seq') as current_sequence_value;
