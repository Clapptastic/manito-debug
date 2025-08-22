#!/usr/bin/env node

/**
 * Database Functionality Test Suite
 * Tests all critical database operations after schema fixes
 */

import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api`;

class DatabaseTestSuite {
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

      const response = await fetch(`${API_BASE}${endpoint}`, options);
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

  async testHealthCheck() {
    await this.log('Testing health check endpoint...');
    
    const result = await this.testEndpoint('/health');
    
    if (result.success && result.data.status === 'ok') {
      await this.log('Health check passed', 'success');
      this.results.passed++;
      return true;
    } else {
      await this.log(`Health check failed: ${JSON.stringify(result)}`, 'error');
      this.results.failed++;
      this.results.errors.push('Health check failed');
      return false;
    }
  }

  async testProjectsAPI() {
    await this.log('Testing projects API...');
    
    // Test GET /projects
    const getResult = await this.testEndpoint('/projects');
    if (!getResult.success) {
      await this.log(`GET /projects failed: ${JSON.stringify(getResult)}`, 'error');
      this.results.failed++;
      this.results.errors.push('GET /projects failed');
      return false;
    }

    const projects = getResult.data.data || [];
    await this.log(`Found ${projects.length} projects`, 'success');

    // Test creating a test project
    const testProject = {
      name: 'Database Test Project',
      path: '/tmp/test-db-project',
      description: 'Test project for database functionality verification'
    };

    const createResult = await this.testEndpoint('/projects', 'POST', testProject);
    if (!createResult.success) {
      await this.log(`POST /projects failed: ${JSON.stringify(createResult)}`, 'error');
      this.results.failed++;
      this.results.errors.push('POST /projects failed');
      return false;
    }

    const createdProject = createResult.data.data;
    await this.log(`Created test project with ID: ${createdProject.id}`, 'success');

    // Test deleting the test project
    const deleteResult = await this.testEndpoint(`/projects/${createdProject.id}`, 'DELETE');
    if (!deleteResult.success) {
      await this.log(`DELETE /projects/${createdProject.id} failed: ${JSON.stringify(deleteResult)}`, 'error');
      this.results.failed++;
      this.results.errors.push('DELETE /projects failed');
      return false;
    }

    await this.log('Projects API tests passed', 'success');
    this.results.passed++;
    return true;
  }

  async testScanAPI() {
    await this.log('Testing scan API...');
    
    // Test scan queue endpoint
    const queueResult = await this.testEndpoint('/scan/queue');
    if (!queueResult.success) {
      await this.log(`GET /scan/queue failed: ${JSON.stringify(queueResult)}`, 'error');
      this.results.failed++;
      this.results.errors.push('GET /scan/queue failed');
      return false;
    }

    await this.log('Scan queue endpoint working', 'success');

    // Test scan jobs endpoint
    const jobsResult = await this.testEndpoint('/scan/jobs');
    if (!jobsResult.success) {
      await this.log(`GET /scan/jobs failed: ${JSON.stringify(jobsResult)}`, 'error');
      this.results.failed++;
      this.results.errors.push('GET /scan/jobs failed');
      return false;
    }

    await this.log('Scan jobs endpoint working', 'success');
    this.results.passed++;
    return true;
  }

  async testAIService() {
    await this.log('Testing AI service...');
    
    // Test AI providers endpoint
    const providersResult = await this.testEndpoint('/ai/providers');
    if (!providersResult.success) {
      await this.log(`GET /ai/providers failed: ${JSON.stringify(providersResult)}`, 'error');
      this.results.failed++;
      this.results.errors.push('GET /ai/providers failed');
      return false;
    }

    await this.log('AI providers endpoint working', 'success');

    // Test AI settings endpoint
    const settingsResult = await this.testEndpoint('/ai/settings', 'POST', {
      provider: 'openai',
      hasOpenAI: true,
      hasAnthropic: false,
      hasGoogle: false
    });

    if (!settingsResult.success) {
      await this.log(`POST /ai/settings failed: ${JSON.stringify(settingsResult)}`, 'error');
      this.results.failed++;
      this.results.errors.push('POST /ai/settings failed');
      return false;
    }

    await this.log('AI service tests passed', 'success');
    this.results.passed++;
    return true;
  }

  async testVaultService() {
    await this.log('Testing vault service...');
    
    // Test vault status endpoint
    const statusResult = await this.testEndpoint('/vault/status');
    if (!statusResult.success) {
      await this.log(`GET /vault/status failed: ${JSON.stringify(statusResult)}`, 'error');
      this.results.failed++;
      this.results.errors.push('GET /vault/status failed');
      return false;
    }

    await this.log('Vault status endpoint working', 'success');

    // Test vault keys endpoint
    const keysResult = await this.testEndpoint('/vault/keys');
    if (!keysResult.success) {
      await this.log(`GET /vault/keys failed: ${JSON.stringify(keysResult)}`, 'error');
      this.results.failed++;
      this.results.errors.push('GET /vault/keys failed');
      return false;
    }

    await this.log('Vault service tests passed', 'success');
    this.results.passed++;
    return true;
  }

  async testMetricsAPI() {
    await this.log('Testing metrics API...');
    
    const result = await this.testEndpoint('/metrics');
    if (!result.success) {
      await this.log(`GET /metrics failed: ${JSON.stringify(result)}`, 'error');
      this.results.failed++;
      this.results.errors.push('GET /metrics failed');
      return false;
    }

    await this.log('Metrics API working', 'success');
    this.results.passed++;
    return true;
  }

  async testPortsAPI() {
    await this.log('Testing ports API...');
    
    const result = await this.testEndpoint('/ports');
    if (!result.success) {
      await this.log(`GET /ports failed: ${JSON.stringify(result)}`, 'error');
      this.results.failed++;
      this.results.errors.push('GET /ports failed');
      return false;
    }

    await this.log('Ports API working', 'success');
    this.results.passed++;
    return true;
  }

  async runAllTests() {
    await this.log('Starting Database Functionality Test Suite...');
    await this.log('=============================================');

    const tests = [
      this.testHealthCheck.bind(this),
      this.testProjectsAPI.bind(this),
      this.testScanAPI.bind(this),
      this.testAIService.bind(this),
      this.testVaultService.bind(this),
      this.testMetricsAPI.bind(this),
      this.testPortsAPI.bind(this)
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
const testSuite = new DatabaseTestSuite();
testSuite.runAllTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
