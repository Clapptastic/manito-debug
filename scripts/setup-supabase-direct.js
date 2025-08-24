#!/usr/bin/env node
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Load environment variables
config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', SERVICE_ROLE_KEY ? '✓' : '✗');
  process.exit(1);
}

console.log('🚀 Setting up Supabase database directly...');

// Create Supabase client with service role
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function setupSupabaseDirect() {
  try {
    console.log('📋 Creating essential tables...');
    
    // Create projects table
    console.log('📋 Creating projects table...');
    const { error: projectsError } = await supabase.rpc('exec_sql', {
      sql: `
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
      `
    });
    
    if (projectsError) {
      console.log('⚠️  Projects table creation failed:', projectsError.message);
    } else {
      console.log('✅ Projects table created successfully');
    }

    // Create scans table
    console.log('📋 Creating scans table...');
    const { error: scansError } = await supabase.rpc('exec_sql', {
      sql: `
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
      `
    });
    
    if (scansError) {
      console.log('⚠️  Scans table creation failed:', scansError.message);
    } else {
      console.log('✅ Scans table created successfully');
    }

    // Try direct table insertion to test
    console.log('📋 Testing table access with direct insert...');
    
    const { data: testProject, error: insertError } = await supabase
      .from('projects')
      .insert([
        { 
          name: 'Test Project',
          description: 'Testing Supabase setup',
          language: 'JavaScript'
        }
      ])
      .select();

    if (insertError) {
      console.log('⚠️  Direct insert test failed:', insertError.message);
      
      // Try creating tables using the direct client query
      console.log('📋 Attempting direct SQL execution...');
      
      try {
        // Try using the database client directly
        const result = await fetch(`${SUPABASE_URL}/rest/v1/rpc/sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            query: `
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
            `
          })
        });
        
        const sqlResult = await result.text();
        console.log('📋 Direct SQL result:', sqlResult);
        
      } catch (sqlError) {
        console.log('⚠️  Direct SQL execution failed:', sqlError.message);
      }
      
    } else {
      console.log('✅ Table access test successful - created test project:', testProject[0].id);
      
      // Clean up test project
      const { error: deleteError } = await supabase
        .from('projects')
        .delete()
        .eq('name', 'Test Project');
        
      if (!deleteError) {
        console.log('✅ Test cleanup completed');
      }
    }

    // Test database health
    console.log('📋 Testing database health...');
    const { data: healthData, error: healthError } = await supabase
      .from('projects')
      .select('count')
      .limit(1);

    if (healthError) {
      console.log('⚠️  Health check failed:', healthError.message);
      console.log('💡 You may need to set up the tables manually in the Supabase dashboard');
      console.log('💡 Go to: https://supabase.com/dashboard/project/dgkwszetmagosuckjior/editor');
      
      // Output the SQL to run manually
      console.log('\n📋 Manual SQL to run in Supabase SQL Editor:');
      console.log('='.repeat(50));
      
      const schemaSQL = `
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
      `;
      
      console.log(schemaSQL);
      console.log('='.repeat(50));
      
    } else {
      console.log('✅ Database health check passed');
    }

    console.log('\n🎉 Supabase setup process completed!');
    console.log('📍 Next steps:');
    console.log('   1. If tables were not created automatically, run the SQL above manually');
    console.log('   2. Test your application to ensure database connectivity');
    console.log('   3. Check the Supabase dashboard for table creation status');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.error('💡 Check your Supabase configuration and network connection');
  }
}

setupSupabaseDirect().catch(console.error);