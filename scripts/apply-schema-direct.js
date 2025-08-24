#!/usr/bin/env node
import fs from 'fs';
import fetch from 'node-fetch';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

async function applySchema() {
  console.log('📋 Applying schema via direct SQL execution...');
  
  try {
    // Read schema file
    const schema = fs.readFileSync('supabase-schema.sql', 'utf8');
    
    // Apply schema directly via REST API
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        sql: schema
      })
    });
    
    if (response.ok) {
      console.log('✅ Schema applied successfully');
    } else {
      const error = await response.text();
      console.log('❌ Schema application failed:', error);
      
      // Try alternative: Apply essential tables only
      console.log('📋 Trying to create essential tables manually...');
      await createEssentialTables();
    }
    
  } catch (error) {
    console.error('❌ Error applying schema:', error.message);
    console.log('📋 Trying to create essential tables manually...');
    await createEssentialTables();
  }
}

async function createEssentialTables() {
  const essentialSQL = `
-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  path TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create scans table
CREATE TABLE IF NOT EXISTS scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  results JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create files table
CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID REFERENCES scans(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  content TEXT,
  language TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY; 
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Create basic policies
CREATE POLICY "Allow all operations" ON projects FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON scans FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON files FOR ALL USING (true);
`;

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        sql: essentialSQL
      })
    });
    
    if (response.ok) {
      console.log('✅ Essential tables created successfully');
    } else {
      console.log('❌ Failed to create essential tables:', await response.text());
    }
  } catch (error) {
    console.error('❌ Error creating essential tables:', error.message);
  }
}

// Load environment variables
import { config } from 'dotenv';
config();

applySchema().catch(console.error);