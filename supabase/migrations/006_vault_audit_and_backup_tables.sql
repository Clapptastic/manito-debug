-- Migration: Add vault audit log and backup tables
-- Date: 2025-08-20
-- Description: Enhanced vault functionality with audit logging and backup capabilities

-- Create audit log table
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type TEXT NOT NULL,
    message TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id TEXT NOT NULL DEFAULT 'system',
    ip_address TEXT DEFAULT 'unknown',
    user_agent TEXT DEFAULT 'system',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for audit log
CREATE INDEX IF NOT EXISTS idx_audit_log_event_type ON audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);

-- Create vault backups table
CREATE TABLE IF NOT EXISTS vault_backups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    backup_data TEXT NOT NULL, -- Encrypted backup data
    backup_type TEXT NOT NULL DEFAULT 'scheduled',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Create indexes for vault backups
CREATE INDEX IF NOT EXISTS idx_vault_backups_type ON vault_backups(backup_type);
CREATE INDEX IF NOT EXISTS idx_vault_backups_created_at ON vault_backups(created_at);

-- Add rotation_schedule column to api_keys table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'api_keys' AND column_name = 'rotation_schedule'
    ) THEN
        ALTER TABLE api_keys ADD COLUMN rotation_schedule JSONB DEFAULT '{}';
    END IF;
END $$;

-- Create function to create audit log table (for vault service)
CREATE OR REPLACE FUNCTION create_audit_log_table()
RETURNS void AS $$
BEGIN
    -- This function is called by the vault service to ensure the table exists
    -- The table creation is handled by the migration above
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL PRIVILEGES ON TABLE audit_log TO manito_dev;
GRANT ALL PRIVILEGES ON TABLE vault_backups TO manito_dev;

-- Create RLS policies for audit_log
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Audit log read policy" ON audit_log
    FOR SELECT USING (true);

CREATE POLICY "Audit log insert policy" ON audit_log
    FOR INSERT WITH CHECK (true);

-- Create RLS policies for vault_backups
ALTER TABLE vault_backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vault backups read policy" ON vault_backups
    FOR SELECT USING (true);

CREATE POLICY "Vault backups insert policy" ON vault_backups
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Vault backups delete policy" ON vault_backups
    FOR DELETE USING (true);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger to api_keys table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_api_keys_updated_at'
    ) THEN
        CREATE TRIGGER update_api_keys_updated_at
            BEFORE UPDATE ON api_keys
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Insert initial audit log entry
INSERT INTO audit_log (event_type, message, user_id, metadata) 
VALUES (
    'MIGRATION_COMPLETED', 
    'Vault audit and backup tables migration completed', 
    'system',
    '{"migration": "006_vault_audit_and_backup_tables", "version": "2.0.0"}'
);
