#!/usr/bin/env node
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🧪 Testing Supabase Connection...');
console.log('📍 URL:', SUPABASE_URL);
console.log('🔑 Service Key:', SERVICE_ROLE_KEY ? `${SERVICE_ROLE_KEY.substring(0, 20)}...` : 'Missing');

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function testConnection() {
  try {
    console.log('\n🔍 Testing basic connection...');
    
    // Test 1: Basic connection test
    const { data: healthData, error: healthError } = await supabase
      .rpc('database_health');
    
    if (healthError) {
      console.log('⚠️  Health check failed:', healthError.message);
    } else {
      console.log('✅ Database health check passed:', healthData);
    }

    // Test 2: Test projects table access
    console.log('\n📋 Testing projects table access...');
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .limit(5);

    if (projectsError) {
      console.log('⚠️  Projects table access failed:', projectsError.message);
      console.log('   Code:', projectsError.code);
      console.log('   Details:', projectsError.details);
    } else {
      console.log('✅ Projects table accessible, found', projects.length, 'projects');
    }

    // Test 3: Test insert capability
    console.log('\n📝 Testing insert capability...');
    const { data: newProject, error: insertError } = await supabase
      .from('projects')
      .insert([
        {
          name: 'Test Connection Project',
          description: 'Testing Supabase connection',
          language: 'JavaScript'
        }
      ])
      .select();

    if (insertError) {
      console.log('⚠️  Insert test failed:', insertError.message);
      console.log('   Code:', insertError.code);
    } else {
      console.log('✅ Insert test successful, created project:', newProject[0].id);
      
      // Clean up test project
      const { error: deleteError } = await supabase
        .from('projects')
        .delete()
        .eq('id', newProject[0].id);
        
      if (!deleteError) {
        console.log('✅ Cleanup completed');
      }
    }

    // Test 4: Test the search functions
    console.log('\n🔍 Testing search functions...');
    const { data: searchResults, error: searchError } = await supabase
      .rpc('search_projects', { 
        search_query: '', 
        project_filter: null 
      });

    if (searchError) {
      console.log('⚠️  Search function failed:', searchError.message);
    } else {
      console.log('✅ Search function working, found', searchResults.length, 'results');
    }

    console.log('\n🎉 Connection test completed!');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    console.error('   Stack:', error.stack);
  }
}

testConnection();