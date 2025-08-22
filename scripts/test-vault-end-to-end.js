#!/usr/bin/env node

/**
 * End-to-End Vault Service Test
 * Tests the vault service through the HTTP API
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

const BASE_URL = 'http://localhost:3000';

console.log('🔍 Testing Vault Service End-to-End...');
console.log('=====================================');

async function testEndpoint(endpoint, method = 'GET', data = null) {
  try {
    const url = `${BASE_URL}${endpoint}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    const result = await response.json();

    return {
      success: response.ok,
      status: response.status,
      data: result
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function runTests() {
  console.log('\n📋 Testing Server Health...');
  const health = await testEndpoint('/api/health');
  console.log('Health check:', health.success ? '✅ PASS' : '❌ FAIL');
  if (!health.success) {
    console.log('Server not responding, exiting...');
    return;
  }

  console.log('\n🔐 Testing Vault Status...');
  const vaultStatus = await testEndpoint('/api/vault/status');
  console.log('Vault status:', vaultStatus.success ? '✅ PASS' : '❌ FAIL');
  if (vaultStatus.success) {
    console.log('Vault status data:', JSON.stringify(vaultStatus.data, null, 2));
  }

  console.log('\n📋 Testing Vault Keys...');
  const vaultKeys = await testEndpoint('/api/vault/keys');
  console.log('Vault keys:', vaultKeys.success ? '✅ PASS' : '❌ FAIL');
  if (vaultKeys.success) {
    console.log('Vault keys data:', JSON.stringify(vaultKeys.data, null, 2));
  }

  console.log('\n📝 Testing Vault Audit Log...');
  const auditLog = await testEndpoint('/api/vault/audit-log');
  console.log('Audit log:', auditLog.success ? '✅ PASS' : '❌ FAIL');
  if (auditLog.success) {
    console.log('Audit log data:', JSON.stringify(auditLog.data, null, 2));
  }

  console.log('\n🔄 Testing Vault Rotation Schedule...');
  const rotationSchedule = await testEndpoint('/api/vault/rotation-schedule');
  console.log('Rotation schedule:', rotationSchedule.success ? '✅ PASS' : '❌ FAIL');
  if (rotationSchedule.success) {
    console.log('Rotation schedule data:', JSON.stringify(rotationSchedule.data, null, 2));
  }

  console.log('\n💾 Testing API Key Storage...');
  const uniqueId = Date.now();
  const testKey = {
    userId: 'test-user',
    provider: `test-provider-${uniqueId}`,
    apiKey: 'test-api-key-123'
  };

  // Store API key
  const storeResult = await testEndpoint('/api/vault/store-key', 'POST', testKey);
  console.log('Store API key:', storeResult.success ? '✅ PASS' : '❌ FAIL');
  if (storeResult.success) {
    console.log('Store result:', JSON.stringify(storeResult.data, null, 2));
  }

  // Get API key
  const getResult = await testEndpoint(`/api/vault/get-key?userId=${testKey.userId}&provider=${testKey.provider}`);
  console.log('Get API key:', getResult.success ? '✅ PASS' : '❌ FAIL');
  if (getResult.success) {
    console.log('Get result:', JSON.stringify(getResult.data, null, 2));
  }

  console.log('\n🔧 Testing AI Vault Status...');
  const aiVaultStatus = await testEndpoint('/api/ai/vault-status');
  console.log('AI vault status:', aiVaultStatus.success ? '✅ PASS' : '❌ FAIL');
  if (aiVaultStatus.success) {
    console.log('AI vault status data:', JSON.stringify(aiVaultStatus.data, null, 2));
  }

  console.log('\n=====================================');
  console.log('End-to-end vault test complete');
}

runTests().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
