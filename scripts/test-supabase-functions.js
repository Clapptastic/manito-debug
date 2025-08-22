#!/usr/bin/env node

/**
 * Supabase RPC Functions Test Suite
 * Tests all RPC functions to ensure they are working correctly
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api`;

class SupabaseFunctionsTestSuite {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  async log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async testRPCFunction(functionName, params = {}) {
    try {
      const response = await fetch(`${API_BASE}/test-rpc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          function: functionName,
          params: params
        })
      });

      const data = await response.json();
      return {
        success: response.ok,
        status: response.status,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async testExecuteSQL() {
    await this.log('Testing execute_sql function...');
    
    const result = await this.testRPCFunction('execute_sql', {
      sql_query: 'SELECT COUNT(*) as count FROM projects',
      sql_params: []
    });

    if (result.success && result.data.success) {
      await this.log('execute_sql function working', 'success');
      this.results.passed++;
      return true;
    } else {
      await this.log(`execute_sql failed: ${JSON.stringify(result)}`, 'error');
      this.results.failed++;
      this.results.errors.push('execute_sql function failed');
      return false;
    }
  }

  async testEncryption() {
    await this.log('Testing encrypt/decrypt functions...');
    
    const testData = 'test-api-key-12345';
    const testKey = 'test-encryption-key';

    // Test encryption
    const encryptResult = await this.testRPCFunction('encrypt', {
      data: testData,
      key: testKey
    });

    if (!encryptResult.success || !encryptResult.data.success) {
      await this.log(`encrypt function failed: ${JSON.stringify(encryptResult)}`, 'error');
      this.results.failed++;
      this.results.errors.push('encrypt function failed');
      return false;
    }

    const encryptedData = encryptResult.data.result;

    // Test decryption
    const decryptResult = await this.testRPCFunction('decrypt', {
      encrypted_data: encryptedData,
      key: testKey
    });

    if (!decryptResult.success || !decryptResult.data.success) {
      await this.log(`decrypt function failed: ${JSON.stringify(decryptResult)}`, 'error');
      this.results.failed++;
      this.results.errors.push('decrypt function failed');
      return false;
    }

    const decryptedData = decryptResult.data.result;

    // Verify the result
    if (decryptedData === testData) {
      await this.log('encrypt/decrypt functions working correctly', 'success');
      this.results.passed++;
      return true;
    } else {
      await this.log(`Encryption/decryption mismatch: expected "${testData}", got "${decryptedData}"`, 'error');
      this.results.failed++;
      this.results.errors.push('encryption/decryption mismatch');
      return false;
    }
  }

  async testSearchSimilarChunks() {
    await this.log('Testing search_similar_chunks function...');
    
    // Create a test embedding (1536-dimensional vector)
    const testEmbedding = new Array(1536).fill(0.1);
    
    const result = await this.testRPCFunction('search_similar_chunks', {
      query_embedding: testEmbedding,
      match_threshold: 0.5,
      match_count: 5,
      project_filter: null
    });

    if (result.success) {
      await this.log('search_similar_chunks function working', 'success');
      this.results.passed++;
      return true;
    } else {
      await this.log(`search_similar_chunks failed: ${JSON.stringify(result)}`, 'error');
      this.results.failed++;
      this.results.errors.push('search_similar_chunks function failed');
      return false;
    }
  }

  async testSearchCodeChunks() {
    await this.log('Testing search_code_chunks function...');
    
    const result = await this.testRPCFunction('search_code_chunks', {
      search_query: 'function',
      project_filter: null,
      language_filter: null,
      chunk_type_filter: null,
      match_count: 10
    });

    if (result.success) {
      await this.log('search_code_chunks function working', 'success');
      this.results.passed++;
      return true;
    } else {
      await this.log(`search_code_chunks failed: ${JSON.stringify(result)}`, 'error');
      this.results.failed++;
      this.results.errors.push('search_code_chunks function failed');
      return false;
    }
  }

  async testFindSymbolDefinitions() {
    await this.log('Testing find_symbol_definitions function...');
    
    const result = await this.testRPCFunction('find_symbol_definitions', {
      symbol_name: 'test',
      project_filter: null,
      language_filter: null
    });

    if (result.success) {
      await this.log('find_symbol_definitions function working', 'success');
      this.results.passed++;
      return true;
    } else {
      await this.log(`find_symbol_definitions failed: ${JSON.stringify(result)}`, 'error');
      this.results.failed++;
      this.results.errors.push('find_symbol_definitions function failed');
      return false;
    }
  }

  async testFindSymbolReferences() {
    await this.log('Testing find_symbol_references function...');
    
    const result = await this.testRPCFunction('find_symbol_references', {
      symbol_name: 'test',
      project_filter: null,
      match_count: 10
    });

    if (result.success) {
      await this.log('find_symbol_references function working', 'success');
      this.results.passed++;
      return true;
    } else {
      await this.log(`find_symbol_references failed: ${JSON.stringify(result)}`, 'error');
      this.results.failed++;
      this.results.errors.push('find_symbol_references function failed');
      return false;
    }
  }

  async testGetDependencyGraph() {
    await this.log('Testing get_dependency_graph function...');
    
    const result = await this.testRPCFunction('get_dependency_graph', {
      project_filter: 1,
      max_depth: 2
    });

    if (result.success) {
      await this.log('get_dependency_graph function working', 'success');
      this.results.passed++;
      return true;
    } else {
      await this.log(`get_dependency_graph failed: ${JSON.stringify(result)}`, 'error');
      this.results.failed++;
      this.results.errors.push('get_dependency_graph function failed');
      return false;
    }
  }

  async testFunctionStatus() {
    await this.log('Testing get_function_status function...');
    
    const result = await this.testRPCFunction('get_function_status', {});

    if (result.success && result.data.success) {
      const functions = result.data.result.functions;
      await this.log(`Found ${functions.length} functions`, 'success');
      
      // Log function details
      functions.forEach(func => {
        console.log(`  - ${func.function_name}: ${func.return_type}`);
      });
      
      this.results.passed++;
      return true;
    } else {
      await this.log(`get_function_status failed: ${JSON.stringify(result)}`, 'error');
      this.results.failed++;
      this.results.errors.push('get_function_status function failed');
      return false;
    }
  }

  async testVaultService() {
    await this.log('Testing vault service integration...');
    
    // Test vault status endpoint
    const statusResult = await fetch(`${API_BASE}/vault/status`);
    if (statusResult.ok) {
      await this.log('Vault status endpoint working', 'success');
    } else {
      await this.log('Vault status endpoint not found', 'error');
    }

    // Test vault keys endpoint
    const keysResult = await fetch(`${API_BASE}/vault/keys`);
    if (keysResult.ok) {
      await this.log('Vault keys endpoint working', 'success');
      this.results.passed++;
      return true;
    } else {
      await this.log('Vault keys endpoint not found', 'error');
      this.results.failed++;
      this.results.errors.push('Vault service endpoints not found');
      return false;
    }
  }

  async runAllTests() {
    await this.log('Starting Supabase RPC Functions Test Suite...');
    await this.log('=============================================');

    const tests = [
      this.testExecuteSQL.bind(this),
      this.testEncryption.bind(this),
      this.testSearchSimilarChunks.bind(this),
      this.testSearchCodeChunks.bind(this),
      this.testFindSymbolDefinitions.bind(this),
      this.testFindSymbolReferences.bind(this),
      this.testGetDependencyGraph.bind(this),
      this.testFunctionStatus.bind(this),
      this.testVaultService.bind(this)
    ];

    for (const test of tests) {
      try {
        await test();
      } catch (error) {
        await this.log(`Test failed with error: ${error.message}`, 'error');
        this.results.failed++;
        this.results.errors.push(error.message);
      }
    }

    await this.log('=============================================');
    await this.log(`Test Suite Complete: ${this.results.passed} passed, ${this.results.failed} failed`);

    if (this.results.errors.length > 0) {
      await this.log('Errors encountered:', 'error');
      this.results.errors.forEach(error => {
        console.log(`  - ${error}`);
      });
    }

    return this.results.failed === 0;
  }
}

// Run the test suite
const testSuite = new SupabaseFunctionsTestSuite();
testSuite.runAllTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
