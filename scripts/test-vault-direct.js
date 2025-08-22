#!/usr/bin/env node

/**
 * Direct Vault Service Test
 * Tests the vault service directly without going through the HTTP API
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

console.log('🔍 Testing Vault Service Directly...');
console.log('=====================================');

// Check environment variables
console.log('\n📋 Environment Variables:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL || 'NOT SET');
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'SET' : 'NOT SET');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET');
console.log('SUPABASE_VAULT_SECRET_KEY:', process.env.SUPABASE_VAULT_SECRET_KEY ? 'SET' : 'NOT SET');

// Test vault service import
try {
  console.log('\n📦 Testing vault service import...');
  const vaultService = await import('../server/services/vault-service.js');
  console.log('✅ Vault service imported successfully');
  
  // Test initialization
  console.log('\n🚀 Testing vault service initialization...');
  try {
    await vaultService.default.initialize();
    console.log('✅ Vault service initialized successfully');
    
    // Test health check
    console.log('\n🏥 Testing vault health check...');
    const health = await vaultService.default.healthCheck();
    console.log('Health status:', health);
    
    // Test encryption/decryption
    console.log('\n🔐 Testing encryption/decryption...');
    const testData = 'test-api-key-123';
    const encrypted = await vaultService.default.encrypt(testData);
    console.log('Encrypted:', encrypted ? 'SUCCESS' : 'FAILED');
    
    const decrypted = await vaultService.default.decrypt(encrypted);
    console.log('Decrypted matches original:', decrypted === testData ? 'YES' : 'NO');
    
    // Test API key storage
    console.log('\n💾 Testing API key storage...');
    const uniqueId = Date.now();
    const providerName = `test-provider-${uniqueId}`;
    await vaultService.default.storeApiKey('default', providerName, 'test-key-456');
    console.log('✅ API key stored successfully');
    
    const retrieved = await vaultService.default.getApiKey('default', providerName);
    console.log('Retrieved key matches:', retrieved === 'test-key-456' ? 'YES' : 'NO');
    
    // Test getting all keys
    console.log('\n📋 Testing get all API keys...');
    const allKeys = await vaultService.default.getAllApiKeys('default');
    console.log('All keys:', Object.keys(allKeys));
    
  } catch (initError) {
    console.log('❌ Vault service initialization failed:', initError.message);
    console.log('Error details:', initError);
  }
  
} catch (importError) {
  console.log('❌ Failed to import vault service:', importError.message);
}

console.log('\n=====================================');
console.log('Direct vault test complete');
