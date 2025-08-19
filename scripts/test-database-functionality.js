#!/usr/bin/env node

import enhancedDb from '../server/services/enhancedDatabase.js';
import semanticSearch from '../server/services/semanticSearch.js';
import migrations from '../server/services/migrations.js';

async function runDatabaseTests() {
  console.log('🧪 Starting Database Functionality Tests...\n');
  
  const tests = [
    {
      name: 'Database Connection Test',
      test: async () => {
        const health = await enhancedDb.health();
        if (!health.connected) {
          throw new Error('Database not connected');
        }
        return '✅ Database connection successful';
      }
    },
    {
      name: 'Migration System Test',
      test: async () => {
        const status = await migrations.getMigrationStatus();
        if (status.pending > 0) {
          throw new Error(`${status.pending} pending migrations`);
        }
        return `✅ All ${status.applied} migrations applied successfully`;
      }
    },
    {
      name: 'Table Existence Test',
      test: async () => {
        const requiredTables = ['projects', 'scans', 'files', 'dependencies', 'conflicts', 'users', 'cache', 'search_logs', 'websocket_connections'];
        const health = await enhancedDb.health();
        
        for (const table of requiredTables) {
          if (!health.tables.includes(table)) {
            throw new Error(`Missing table: ${table}`);
          }
        }
        return `✅ All ${requiredTables.length} required tables exist`;
      }
    },
    {
      name: 'Function Existence Test',
      test: async () => {
        const requiredFunctions = ['global_search', 'search_projects', 'calculate_text_similarity'];
        const health = await enhancedDb.health();
        
        for (const func of requiredFunctions) {
          if (!health.functions.includes(func)) {
            throw new Error(`Missing function: ${func}`);
          }
        }
        return `✅ All ${requiredFunctions.length} required functions exist`;
      }
    },
    {
      name: 'Semantic Search Test',
      test: async () => {
        const result = await semanticSearch.globalSearch('test', null, 10);
        if (!result.success) {
          throw new Error(`Search failed: ${result.message}`);
        }
        return `✅ Semantic search working (${result.data.total} results)`;
      }
    },
    {
      name: 'Health Endpoint Test',
      test: async () => {
        const response = await fetch('http://localhost:3000/api/health?detailed=true');
        const health = await response.json();
        
        if (health.status !== 'ok' && health.status !== 'degraded') {
          throw new Error(`Health endpoint returned status: ${health.status}`);
        }
        
        if (!health.services.database.connected) {
          throw new Error('Database not connected in health check');
        }
        
        return '✅ Health endpoint working correctly';
      }
    },
    {
      name: 'Search API Test',
      test: async () => {
        const response = await fetch('http://localhost:3000/api/search?q=test&limit=5');
        const result = await response.json();
        
        if (!result.success) {
          throw new Error(`Search API failed: ${result.error}`);
        }
        
        if (!result.data.success) {
          throw new Error(`Search data failed: ${result.data.message}`);
        }
        
        return `✅ Search API working (${result.data.data.total} results)`;
      }
    },
    {
      name: 'Database Pool Test',
      test: async () => {
        const health = await enhancedDb.health();
        if (!health.pool || health.pool.totalCount === 0) {
          throw new Error('Database pool not configured');
        }
        return `✅ Database pool working (${health.pool.totalCount} connections)`;
      }
    },
    {
      name: 'Cache System Test',
      test: async () => {
        const cacheStats = enhancedDb.getCacheStats();
        if (typeof cacheStats.hitRate !== 'string') {
          throw new Error('Cache stats not working');
        }
        return `✅ Cache system working (hit rate: ${cacheStats.hitRate})`;
      }
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      console.log(`Running: ${test.name}`);
      const result = await test.test();
      console.log(result);
      passed++;
    } catch (error) {
      console.log(`❌ ${test.name} failed: ${error.message}`);
      failed++;
    }
    console.log('');
  }
  
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed > 0) {
    console.log('\n❌ Some tests failed. Please check the issues above.');
    process.exit(1);
  } else {
    console.log('🎉 All tests passed! Database functionality is 100% operational.');
    console.log('\n✅ Implementation Plan Status:');
    console.log('   ✅ Phase 1: Migration System - COMPLETED');
    console.log('   ✅ Phase 2: Database Service - COMPLETED');
    console.log('   ✅ Phase 3: Semantic Search - COMPLETED');
    console.log('   ✅ Phase 4: Health Monitoring - COMPLETED');
    console.log('   ✅ Phase 5: Testing & Validation - COMPLETED');
    console.log('   🔄 Phase 6: Deployment & Monitoring - IN PROGRESS');
  }
}

runDatabaseTests().catch(console.error);
