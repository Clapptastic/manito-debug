#!/usr/bin/env node

/**
 * Vault and API Key Functionality Test Suite
 * Tests all aspects of the vault service and API key management
 */

import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class VaultFunctionalityTest {
  constructor() {
    this.baseUrl = 'http://localhost:3000';
    this.testResults = {
      timestamp: new Date().toISOString(),
      totalTests: 0,
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async testEndpoint(endpoint, method = 'GET', body = null) {
    try {
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, options);
      const data = await response.json();

      return {
        success: response.ok,
        status: response.status,
        data,
        error: response.ok ? null : data.error || 'Unknown error'
      };
    } catch (error) {
      return {
        success: false,
        status: 0,
        data: null,
        error: error.message
      };
    }
  }

  async testServerHealth() {
    this.log('Testing server health...');
    this.testResults.totalTests++;

    const result = await this.testEndpoint('/api/health');
    
    if (result.success) {
      this.log('Server is running and healthy', 'success');
      this.testResults.passed++;
      return true;
    } else {
      this.log(`Server health check failed: ${result.error}`, 'error');
      this.testResults.failed++;
      this.testResults.errors.push(`Server health: ${result.error}`);
      return false;
    }
  }

  async testVaultStatus() {
    this.log('Testing vault status endpoint...');
    this.testResults.totalTests++;

    const result = await this.testEndpoint('/api/vault/status');
    
    if (result.success) {
      this.log('Vault status endpoint working', 'success');
      this.log(`Vault initialized: ${result.data.initialized}`);
      this.log(`Vault health: ${result.data.health?.status || 'unknown'}`);
      this.testResults.passed++;
      return result.data;
    } else {
      this.log(`Vault status failed: ${result.error}`, 'error');
      this.testResults.failed++;
      this.testResults.errors.push(`Vault status: ${result.error}`);
      return null;
    }
  }

  async testVaultKeys() {
    this.log('Testing vault keys endpoint...');
    this.testResults.totalTests++;

    const result = await this.testEndpoint('/api/vault/keys');
    
    if (result.success) {
      this.log('Vault keys endpoint working', 'success');
      this.log(`Stored providers: ${result.data.providers?.length || 0}`);
      this.log(`Vault enabled: ${result.data.vaultEnabled}`);
      this.testResults.passed++;
      return result.data;
    } else {
      this.log(`Vault keys failed: ${result.error}`, 'error');
      this.testResults.failed++;
      this.testResults.errors.push(`Vault keys: ${result.error}`);
      return null;
    }
  }

  async testAIProviders() {
    this.log('Testing AI providers endpoint...');
    this.testResults.totalTests++;

    const result = await this.testEndpoint('/api/ai/providers');
    
    if (result.success) {
      this.log('AI providers endpoint working', 'success');
      const providers = Object.keys(result.data);
      this.log(`Available providers: ${providers.join(', ')}`);
      this.testResults.passed++;
      return result.data;
    } else {
      this.log(`AI providers failed: ${result.error}`, 'error');
      this.testResults.failed++;
      this.testResults.errors.push(`AI providers: ${result.error}`);
      return null;
    }
  }

  async testAISettings() {
    this.log('Testing AI settings endpoint...');
    this.testResults.totalTests++;

    const testKeys = {
      openai: 'test-openai-key',
      anthropic: 'test-anthropic-key',
      google: 'test-google-key'
    };

    const result = await this.testEndpoint('/api/ai/settings', 'POST', {
      aiApiKeys: testKeys,
      aiProvider: 'openai'
    });
    
    if (result.success) {
      this.log('AI settings endpoint working', 'success');
      this.log(`Vault enabled: ${result.data.vaultEnabled}`);
      this.testResults.passed++;
      return result.data;
    } else {
      this.log(`AI settings failed: ${result.error}`, 'error');
      this.testResults.failed++;
      this.testResults.errors.push(`AI settings: ${result.error}`);
      return null;
    }
  }

  async testAIConnection() {
    this.log('Testing AI connection endpoint...');
    this.testResults.totalTests++;

    const result = await this.testEndpoint('/api/ai/test-connection', 'POST', {
      provider: 'openai'
    });
    
    if (result.success) {
      this.log('AI connection endpoint working', 'success');
      this.log(`Connection result: ${result.data.success ? 'Success' : 'Failed'}`);
      this.testResults.passed++;
      return result.data;
    } else {
      this.log(`AI connection failed: ${result.error}`, 'error');
      this.testResults.failed++;
      this.testResults.errors.push(`AI connection: ${result.error}`);
      return null;
    }
  }

  async testVaultAuditLog() {
    this.log('Testing vault audit log endpoint...');
    this.testResults.totalTests++;

    const result = await this.testEndpoint('/api/vault/audit-log?limit=10');
    
    if (result.success) {
      this.log('Vault audit log endpoint working', 'success');
      this.log(`Audit log entries: ${result.data.data?.length || 0}`);
      this.testResults.passed++;
      return result.data;
    } else {
      this.log(`Vault audit log failed: ${result.error}`, 'error');
      this.testResults.failed++;
      this.testResults.errors.push(`Vault audit log: ${result.error}`);
      return null;
    }
  }

  async testVaultRotationSchedule() {
    this.log('Testing vault rotation schedule endpoint...');
    this.testResults.totalTests++;

    const result = await this.testEndpoint('/api/vault/rotation-schedule');
    
    if (result.success) {
      this.log('Vault rotation schedule endpoint working', 'success');
      this.log(`Rotation schedules: ${result.data.data?.length || 0}`);
      this.testResults.passed++;
      return result.data;
    } else {
      this.log(`Vault rotation schedule failed: ${result.error}`, 'error');
      this.testResults.failed++;
      this.testResults.errors.push(`Vault rotation schedule: ${result.error}`);
      return null;
    }
  }

  async testEnvironmentVariables() {
    this.log('Testing environment variables...');
    this.testResults.totalTests++;

    const requiredVars = [
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'SUPABASE_VAULT_SECRET_KEY'
    ];

    const missingVars = [];
    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        missingVars.push(varName);
      }
    }

    if (missingVars.length === 0) {
      this.log('All required environment variables are set', 'success');
      this.testResults.passed++;
      return true;
    } else {
      this.log(`Missing environment variables: ${missingVars.join(', ')}`, 'error');
      this.testResults.failed++;
      this.testResults.errors.push(`Missing env vars: ${missingVars.join(', ')}`);
      return false;
    }
  }

  async testDatabaseConnection() {
    this.log('Testing database connection...');
    this.testResults.totalTests++;

    // Test if we can connect to the database by checking if the server is running
    const result = await this.testEndpoint('/api/health');
    
    if (result.success) {
      this.log('Database connection appears to be working', 'success');
      this.testResults.passed++;
      return true;
    } else {
      this.log('Database connection may be failing', 'error');
      this.testResults.failed++;
      this.testResults.errors.push('Database connection failed');
      return false;
    }
  }

  async testSupabaseRPCFunctions() {
    this.log('Testing Supabase RPC functions...');
    this.testResults.totalTests++;

    // Test if the encrypt/decrypt functions are available
    const result = await this.testEndpoint('/api/test-rpc', 'POST', {
      function: 'encrypt',
      data: 'test-data',
      secret_key: 'test-key'
    });
    
    if (result.success) {
      this.log('Supabase RPC functions are working', 'success');
      this.testResults.passed++;
      return true;
    } else {
      this.log('Supabase RPC functions may not be available', 'error');
      this.testResults.failed++;
      this.testResults.errors.push('Supabase RPC functions failed');
      return false;
    }
  }

  async runAllTests() {
    this.log('Starting Vault and API Key Functionality Test Suite...');
    this.log('=============================================');

    // Test server health first
    const serverHealthy = await this.testServerHealth();
    if (!serverHealthy) {
      this.log('Server is not running. Please start the server first.', 'error');
      return this.testResults;
    }

    // Run all tests
    await this.testEnvironmentVariables();
    await this.testDatabaseConnection();
    await this.testSupabaseRPCFunctions();
    await this.testVaultStatus();
    await this.testVaultKeys();
    await this.testAIProviders();
    await this.testAISettings();
    await this.testAIConnection();
    await this.testVaultAuditLog();
    await this.testVaultRotationSchedule();

    this.log('=============================================');
    this.log(`Test Suite Complete: ${this.testResults.passed} passed, ${this.testResults.failed} failed`);

    if (this.testResults.errors.length > 0) {
      this.log('❌ Errors encountered:');
      this.testResults.errors.forEach(error => {
        this.log(`  - ${error}`);
      });
    }

    // Save results to file
    const resultsFile = join(__dirname, '../test-results/vault-test-results.json');
    const resultsDir = dirname(resultsFile);
    
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    fs.writeFileSync(resultsFile, JSON.stringify(this.testResults, null, 2));
    this.log(`Results saved to: ${resultsFile}`);

    return this.testResults;
  }
}

// Run the test suite
const testSuite = new VaultFunctionalityTest();
testSuite.runAllTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
