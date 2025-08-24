#!/usr/bin/env node
import { config } from 'dotenv';
import fetch from 'node-fetch';

config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🚀 Setting up Supabase via HTTP API...');

async function executeSQL(sql) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ sql })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HTTP ${response.status}: ${error}`);
  }
  
  return await response.json();
}

async function setupTables() {
  console.log('📋 Creating essential tables and functions...');
  
  const setup_queries = [
    // Enable extensions
    `DO $$ 
     BEGIN
       CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
       CREATE EXTENSION IF NOT EXISTS "pgcrypto";
     EXCEPTION WHEN OTHERS THEN NULL;
     END $$;`,
    
    // Create projects table
    `CREATE TABLE IF NOT EXISTS projects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      description TEXT,
      path TEXT,
      language TEXT,
      framework TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );`,
    
    // Create scans table
    `CREATE TABLE IF NOT EXISTS scans (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
      status TEXT DEFAULT 'pending',
      results JSONB DEFAULT '{}',
      metadata JSONB DEFAULT '{}',
      scan_type TEXT DEFAULT 'full',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      completed_at TIMESTAMP WITH TIME ZONE
    );`,
    
    // Create files table
    `CREATE TABLE IF NOT EXISTS files (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      scan_id UUID REFERENCES scans(id) ON DELETE CASCADE,
      path TEXT NOT NULL,
      content TEXT,
      language TEXT,
      file_type TEXT,
      size_bytes INTEGER,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );`,
    
    // Create dependencies table
    `CREATE TABLE IF NOT EXISTS dependencies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      scan_id UUID REFERENCES scans(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      version TEXT,
      type TEXT,
      description TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );`,
    
    // Create conflicts table
    `CREATE TABLE IF NOT EXISTS conflicts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      scan_id UUID REFERENCES scans(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      description TEXT,
      severity TEXT DEFAULT 'medium',
      file_path TEXT,
      line_number INTEGER,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );`,
    
    // Enable RLS on all tables
    `ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
     ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
     ALTER TABLE files ENABLE ROW LEVEL SECURITY;
     ALTER TABLE dependencies ENABLE ROW LEVEL SECURITY;
     ALTER TABLE conflicts ENABLE ROW LEVEL SECURITY;`,
    
    // Create permissive policies (for development)
    `DROP POLICY IF EXISTS "Allow all for projects" ON projects;
     CREATE POLICY "Allow all for projects" ON projects FOR ALL USING (true);
     
     DROP POLICY IF EXISTS "Allow all for scans" ON scans;
     CREATE POLICY "Allow all for scans" ON scans FOR ALL USING (true);
     
     DROP POLICY IF EXISTS "Allow all for files" ON files;
     CREATE POLICY "Allow all for files" ON files FOR ALL USING (true);
     
     DROP POLICY IF EXISTS "Allow all for dependencies" ON dependencies;
     CREATE POLICY "Allow all for dependencies" ON dependencies FOR ALL USING (true);
     
     DROP POLICY IF EXISTS "Allow all for conflicts" ON conflicts;
     CREATE POLICY "Allow all for conflicts" ON conflicts FOR ALL USING (true);`,
    
    // Create search functions
    `CREATE OR REPLACE FUNCTION search_projects(search_query TEXT DEFAULT '', project_filter UUID DEFAULT NULL)
     RETURNS TABLE(id UUID, name TEXT, description TEXT, path TEXT, rank REAL) AS $$
     BEGIN
       RETURN QUERY
       SELECT p.id, p.name, p.description, p.path, 1.0::REAL as rank
       FROM projects p
       WHERE (project_filter IS NULL OR p.id = project_filter)
       AND (search_query = '' OR p.name ILIKE '%' || search_query || '%' 
            OR p.description ILIKE '%' || search_query || '%');
     END;
     $$ LANGUAGE plpgsql;`,
    
    `CREATE OR REPLACE FUNCTION search_scan_results(search_query TEXT DEFAULT '', scan_filter UUID DEFAULT NULL)
     RETURNS TABLE(id UUID, project_id UUID, status TEXT, results JSONB, rank REAL) AS $$
     BEGIN
       RETURN QUERY
       SELECT s.id, s.project_id, s.status, s.results, 1.0::REAL as rank
       FROM scans s
       WHERE (scan_filter IS NULL OR s.id = scan_filter)
       AND (search_query = '' OR s.results::TEXT ILIKE '%' || search_query || '%');
     END;
     $$ LANGUAGE plpgsql;`,
     
    // Create helper functions needed by the application
    `CREATE OR REPLACE FUNCTION execute_sql(sql_query TEXT)
     RETURNS TEXT AS $$
     BEGIN
       EXECUTE sql_query;
       RETURN 'Success';
     EXCEPTION WHEN others THEN
       RETURN 'Error: ' || SQLERRM;
     END;
     $$ LANGUAGE plpgsql SECURITY DEFINER;`,
     
    `CREATE OR REPLACE FUNCTION find_symbol_definitions(
       language_filter TEXT DEFAULT NULL,
       project_filter UUID DEFAULT NULL, 
       symbol_name TEXT DEFAULT ''
     )
     RETURNS TABLE(id UUID, file_path TEXT, line_number INTEGER, symbol_type TEXT) AS $$
     BEGIN
       -- Mock implementation for now
       RETURN QUERY SELECT 
         gen_random_uuid() as id,
         'mock/path.js' as file_path, 
         1 as line_number,
         'function' as symbol_type
       LIMIT 0;
     END;
     $$ LANGUAGE plpgsql;`
  ];
  
  let successful = 0;
  let failed = 0;
  
  for (let i = 0; i < setup_queries.length; i++) {
    const query = setup_queries[i];
    
    try {
      console.log(`📋 Executing setup query ${i + 1}/${setup_queries.length}...`);
      await executeSQL(query);
      successful++;
      console.log(`   ✅ Success`);
    } catch (error) {
      failed++;
      console.log(`   ⚠️  Failed: ${error.message}`);
      
      // Continue with other queries
    }
  }
  
  console.log(`\n📊 Setup Results:`);
  console.log(`   ✅ Successful: ${successful}`);
  console.log(`   ⚠️  Failed: ${failed}`);
  
  // Test the setup
  try {
    console.log('\n📋 Testing setup...');
    
    // Try to insert a test project
    const testResponse = await fetch(`${SUPABASE_URL}/rest/v1/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        name: 'Test Project',
        description: 'Database connection test'
      })
    });
    
    if (testResponse.ok) {
      console.log('✅ Database is working - can create projects');
      
      // Clean up test project
      const projects = await fetch(`${SUPABASE_URL}/rest/v1/projects?name=eq.Test Project`, {
        method: 'DELETE',
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        }
      });
      
      console.log('✅ Test cleanup completed');
      
    } else {
      console.log('⚠️  Database test failed:', await testResponse.text());
    }
    
  } catch (error) {
    console.log('⚠️  Database test error:', error.message);
  }
  
  console.log('\n🎉 Supabase setup completed!');
}

setupTables().catch(console.error);