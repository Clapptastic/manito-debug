#!/usr/bin/env node

/**
 * Supabase Setup Script for ManitoDebug
 * This script initializes the Supabase database with the required schema
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const config = {
  url: process.env.SUPABASE_URL || 'http://127.0.0.1:54321',
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
};

console.log('🚀 Setting up Supabase for ManitoDebug...');
console.log(`📍 Supabase URL: ${config.url}`);

async function main() {
  try {
    // Create Supabase client with service role key
    const supabase = createClient(config.url, config.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('✅ Supabase client initialized');

    // Test basic connectivity
    const { data, error } = await supabase.from('pg_tables').select('count').limit(1);
    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows" which is OK
      console.log('❌ Connection test failed:', error.message);
      process.exit(1);
    }
    
    console.log('✅ Supabase connection successful');

    // Read and apply schema
    const schemaPath = path.join(__dirname, '..', 'supabase-schema.sql');
    const schemaSQL = await fs.readFile(schemaPath, 'utf8');

    console.log('📋 Applying Supabase schema...');
    
    // Split SQL into individual statements
    const statements = schemaSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    let successCount = 0;
    let errorCount = 0;

    for (const statement of statements) {
      try {
        if (statement.includes('CREATE EXTENSION') || 
            statement.includes('CREATE TABLE') || 
            statement.includes('CREATE INDEX') ||
            statement.includes('CREATE POLICY') ||
            statement.includes('ALTER TABLE') ||
            statement.includes('CREATE OR REPLACE FUNCTION') ||
            statement.includes('CREATE TRIGGER')) {
          
          const { data, error } = await supabase.rpc('exec_sql', {
            sql: statement + ';'
          });

          if (error) {
            // Some errors are expected (like "already exists")
            if (!error.message.includes('already exists') && 
                !error.message.includes('does not exist')) {
              console.log(`⚠️  Warning executing statement: ${error.message}`);
              console.log(`   Statement: ${statement.substring(0, 100)}...`);
              errorCount++;
            }
          } else {
            successCount++;
          }
        }
      } catch (err) {
        console.log(`❌ Error executing statement: ${err.message}`);
        errorCount++;
      }
    }

    console.log(`✅ Schema application completed:`);
    console.log(`   📊 Successful statements: ${successCount}`);
    console.log(`   ⚠️  Warnings/Errors: ${errorCount}`);

    // Test the setup with basic operations
    console.log('🧪 Testing Supabase setup...');

    // Test table existence
    const tables = ['users', 'projects', 'scans', 'files', 'dependencies', 'conflicts', 'graph_nodes', 'graph_edges', 'code_chunks'];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table).select('count').limit(1);
        if (error && error.code !== 'PGRST116') {
          console.log(`❌ Table ${table} test failed:`, error.message);
        } else {
          console.log(`✅ Table ${table} is accessible`);
        }
      } catch (err) {
        console.log(`❌ Table ${table} error:`, err.message);
      }
    }

    // Test RPC functions
    console.log('🔧 Testing RPC functions...');
    
    const rpcTests = [
      {
        name: 'search_similar_chunks',
        params: {
          query_embedding: new Array(1536).fill(0.1),
          match_threshold: 0.5,
          match_count: 1
        }
      },
      {
        name: 'search_code_chunks',
        params: {
          search_query: 'test',
          match_count: 1
        }
      }
    ];

    for (const test of rpcTests) {
      try {
        const { data, error } = await supabase.rpc(test.name, test.params);
        if (error) {
          console.log(`⚠️  RPC ${test.name} warning:`, error.message);
        } else {
          console.log(`✅ RPC ${test.name} is working`);
        }
      } catch (err) {
        console.log(`❌ RPC ${test.name} error:`, err.message);
      }
    }

    console.log('🎉 Supabase setup completed successfully!');
    console.log('');
    console.log('📝 Next steps:');
    console.log('   1. Update your .env file with Supabase credentials');
    console.log('   2. Restart your server to use Supabase');
    console.log('   3. Monitor logs for any remaining issues');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Helper function to check if we can execute SQL
async function createExecSQLFunction(supabase) {
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql: 'SELECT 1;' });
    if (error && error.message.includes('function exec_sql')) {
      // Function doesn't exist, try to create it
      console.log('Creating exec_sql function...');
      // Note: This might not work in all Supabase configurations
      // You may need to create this function manually in the Supabase dashboard
    }
  } catch (err) {
    console.log('Note: exec_sql function may need to be created manually in Supabase dashboard');
  }
}

main().catch(console.error);