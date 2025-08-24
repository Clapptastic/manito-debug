#!/usr/bin/env node
import { config } from 'dotenv';
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

// Load environment variables
config();

const DATABASE_URL = process.env.DATABASE_URL || 
  `postgresql://postgres.dgkwszetmagosuckjior:[YOUR-PASSWORD]@aws-1-us-west-1.pooler.supabase.com:5432/postgres`;

console.log('🚀 Setting up Supabase database completely...');
console.log('📍 Using database URL (masked):', DATABASE_URL.replace(/:[^:]*@/, ':****@'));

async function setupSupabaseComplete() {
  let client;
  
  try {
    // Create database client
    client = new Client({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    
    await client.connect();
    console.log('✅ Connected to Supabase database');
    
    // Read and apply schema
    console.log('📋 Reading schema file...');
    const schemaPath = path.join(process.cwd(), 'supabase-schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split into individual statements and clean them
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
      .map(stmt => stmt + ';');
    
    console.log(`📋 Found ${statements.length} SQL statements to execute`);
    
    let successful = 0;
    let failed = 0;
    
    // Execute statements one by one
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      try {
        // Skip empty or comment-only statements
        if (statement.trim() === ';' || statement.trim().startsWith('--')) {
          continue;
        }
        
        console.log(`📋 Executing statement ${i + 1}/${statements.length}...`);
        await client.query(statement);
        successful++;
        
        // Add small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.log(`⚠️  Statement ${i + 1} failed: ${error.message}`);
        failed++;
        
        // Continue with other statements unless it's a critical error
        if (error.message.includes('already exists')) {
          console.log(`   └── Skipping (already exists)`);
        } else if (error.message.includes('permission denied')) {
          console.log(`   └── Permission denied - may need superuser access`);
        }
      }
    }
    
    // Create additional essential functions if they don't exist
    console.log('📋 Creating additional helper functions...');
    
    const helperFunctions = [
      `-- Helper function for executing arbitrary SQL (for migrations)
       CREATE OR REPLACE FUNCTION execute_sql(sql_query TEXT)
       RETURNS TEXT AS $$
       BEGIN
         EXECUTE sql_query;
         RETURN 'Success';
       EXCEPTION WHEN others THEN
         RETURN 'Error: ' || SQLERRM;
       END;
       $$ LANGUAGE plpgsql SECURITY DEFINER;`,
       
      `-- Helper function for health checks
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
       $$ LANGUAGE plpgsql;`,
       
      `-- Enable necessary extensions
       CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
       CREATE EXTENSION IF NOT EXISTS "pgcrypto";
       CREATE EXTENSION IF NOT EXISTS "vector";`
    ];
    
    for (const func of helperFunctions) {
      try {
        await client.query(func);
        console.log('✅ Helper function created');
      } catch (error) {
        console.log(`⚠️  Helper function failed: ${error.message}`);
      }
    }
    
    // Test the setup
    console.log('📋 Testing database setup...');
    
    try {
      const healthResult = await client.query('SELECT database_health()');
      console.log('✅ Health check successful:', healthResult.rows[0]?.database_health);
    } catch (error) {
      console.log('⚠️  Health check failed:', error.message);
    }
    
    // Check tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log(`📊 Database setup completed:`);
    console.log(`   ✅ Successful statements: ${successful}`);
    console.log(`   ⚠️  Failed statements: ${failed}`);
    console.log(`   📋 Tables created: ${tablesResult.rows.length}`);
    console.log(`   📋 Table names: ${tablesResult.rows.map(r => r.table_name).join(', ')}`);
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.error('💡 Check your database credentials and connection');
    
    if (error.message.includes('password authentication failed')) {
      console.error('💡 Hint: Update your database password in the connection string');
    }
    
  } finally {
    if (client) {
      await client.end();
    }
  }
}

setupSupabaseComplete().catch(console.error);