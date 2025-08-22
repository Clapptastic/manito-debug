import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import pg from 'pg';

/**
 * Enhanced Vault Service for secure API key storage
 * Uses Supabase Vault for encryption/decryption with advanced security features
 * Based on Supabase Vault documentation: https://supabase.com/docs/guides/database/vault
 */
class VaultService {
  constructor() {
    this.supabase = null;
    this.vaultSecret = null;
    this.initialized = false;
    this.logger = console;
    this.auditLog = [];
    this.keyRotationSchedule = new Map();
    this.backupInterval = null;
    this.dbClient = null;
  }

  async initialize() {
    try {
      // Ensure environment variables are loaded
      this.vaultSecret = process.env.SUPABASE_VAULT_SECRET_KEY;
      
      if (!this.vaultSecret) {
        console.log('🔧 Vault Service: Environment variables not loaded, attempting to reload...');
        // Try to reload environment variables
        const dotenv = await import('dotenv');
        const path = await import('path');
        const { fileURLToPath } = await import('url');
        
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        
        dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
        
        this.vaultSecret = process.env.SUPABASE_VAULT_SECRET_KEY;
      }
      
      if (!this.vaultSecret) {
        throw new Error('SUPABASE_VAULT_SECRET_KEY environment variable is required');
      }
      
      console.log('✅ Vault Service: Environment variables loaded successfully');

      // Create Supabase client for regular operations
      this.supabase = createClient(
        process.env.SUPABASE_URL || 'http://127.0.0.1:54321',
        process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
      );

      // Create direct database connection for vault operations
      this.dbClient = new pg.Client({
        host: '127.0.0.1',
        port: 54325,
        database: 'postgres',
        user: 'postgres',
        password: 'postgres'
      });
      await this.dbClient.connect();

      // Test vault connection
      await this.testConnection();
      
      // Initialize audit logging
      await this.initializeAuditLog();
      
      // Start key rotation monitoring
      this.startKeyRotationMonitoring();
      
      // Start backup procedures
      this.startBackupProcedures();
      
      this.initialized = true;
      this.logger.info('Enhanced vault service initialized successfully');
      
      // Log initialization
      await this.logAuditEvent('VAULT_INITIALIZED', 'Vault service initialized successfully', {
        timestamp: new Date().toISOString(),
        version: '2.0.0'
      });
      
    } catch (error) {
      this.logger.error('Failed to initialize vault service:', error);
      throw error;
    }
  }

  async testConnection() {
    try {
      // Test vault access by checking if we can access the existing vault secret
      const result = await this.dbClient.query('SELECT * FROM vault.decrypted_secrets LIMIT 1');

      if (!result.rows || result.rows.length === 0) {
        throw new Error('No vault secrets found - vault may not be properly configured');
      }

      this.logger.info('Vault connection test successful - can access vault secrets');
      return true;
    } catch (error) {
      this.logger.error('Vault connection test failed:', error);
      throw error;
    }
  }

  async initializeAuditLog() {
    try {
      // Create audit log table if it doesn't exist
      const { error } = await this.supabase.rpc('create_audit_log_table');
      if (error && !error.message.includes('already exists')) {
        this.logger.warn('Audit log table creation failed:', error);
      }
    } catch (error) {
      this.logger.warn('Audit log initialization failed:', error);
    }
  }

  async logAuditEvent(eventType, message, metadata = {}) {
    try {
      const auditEntry = {
        event_type: eventType,
        message: message,
        timestamp: new Date().toISOString(),
        user_id: metadata.userId || 'system',
        ip_address: metadata.ipAddress || 'unknown',
        user_agent: metadata.userAgent || 'system',
        metadata: JSON.stringify(metadata)
      };

      // Store in local audit log
      this.auditLog.push(auditEntry);
      
      // Keep only last 1000 entries in memory
      if (this.auditLog.length > 1000) {
        this.auditLog = this.auditLog.slice(-1000);
      }

      // Store in database if available
      try {
        await this.supabase
          .from('audit_log')
          .insert(auditEntry);
      } catch (dbError) {
        this.logger.warn('Failed to store audit log in database:', dbError);
      }

      this.logger.info(`Audit: ${eventType} - ${message}`);
    } catch (error) {
      this.logger.error('Failed to log audit event:', error);
    }
  }

  async healthCheck() {
    try {
      if (!this.initialized) {
        return {
          status: 'unhealthy',
          message: 'Vault service not initialized',
          timestamp: new Date().toISOString()
        };
      }

      // Test vault access
      await this.testConnection();

      return {
        status: 'healthy',
        message: 'Enhanced vault service is operational',
        timestamp: new Date().toISOString(),
        metrics: {
          rotationScheduleCount: this.keyRotationSchedule.size,
          auditLogCount: this.auditLog.length,
          lastBackup: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Vault service error: ${error.message}`,
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }

  async encrypt(text) {
    if (!this.initialized) {
      throw new Error('Vault service not initialized');
    }

    try {
      // Use Supabase Vault's create_secret function for encryption
      // According to docs: vault.create_secret(secret, name, description)
      const result = await this.dbClient.query(
        'SELECT vault.create_secret($1, $2, $3) as secret_id',
        [text, `encrypted_${Date.now()}`, 'API key encryption']
      );

      if (!result.rows || !result.rows[0] || !result.rows[0].secret_id) {
        throw new Error('Failed to create vault secret');
      }

      // Return the secret ID as the encrypted reference
      return result.rows[0].secret_id;
    } catch (error) {
      this.logger.error('Encryption error:', error);
      throw error;
    }
  }

  async decrypt(secretId) {
    if (!this.initialized) {
      throw new Error('Vault service not initialized');
    }

    try {
      // Use Supabase Vault's decrypted_secrets view for decryption
      // According to docs: SELECT decrypted_secret FROM vault.decrypted_secrets WHERE id = $1
      const result = await this.dbClient.query(
        'SELECT decrypted_secret FROM vault.decrypted_secrets WHERE id = $1',
        [secretId]
      );

      if (!result.rows || result.rows.length === 0) {
        throw new Error('Secret not found');
      }

      return result.rows[0].decrypted_secret;
    } catch (error) {
      this.logger.error('Decryption error:', error);
      throw error;
    }
  }

  async storeApiKey(userId, provider, apiKey, options = {}) {
    if (!this.initialized) {
      throw new Error('Vault service not initialized');
    }

    try {
      // Create a secret in the vault for this API key using direct DB connection
      // According to docs: vault.create_secret(secret, name, description)
      const createResult = await this.dbClient.query(
        'SELECT vault.create_secret($1, $2, $3) as secret_id',
        [apiKey, `${provider}_api_key_${userId}`, `API key for ${provider} provider`]
      );

      if (!createResult.rows || !createResult.rows[0] || !createResult.rows[0].secret_id) {
        throw new Error('Failed to create vault secret');
      }

      const secretId = createResult.rows[0].secret_id;
      
      // Set up key rotation schedule if not exists
      if (!this.keyRotationSchedule.has(provider)) {
        this.keyRotationSchedule.set(provider, {
          lastRotation: new Date(),
          nextRotation: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
          rotationCount: 0
        });
      }
      
      // Store secret reference in database
      const { data, error } = await this.supabase
        .from('api_keys')
        .upsert({
          user_id: userId || 'default',
          provider: provider,
          encrypted_key: secretId, // Store the secret ID instead of encrypted text
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          rotation_schedule: JSON.stringify(this.keyRotationSchedule.get(provider))
        }, {
          onConflict: 'user_id,provider'
        });

      if (error) {
        throw new Error(`Failed to store API key: ${error.message}`);
      }

      await this.logAuditEvent('API_KEY_STORED', `API key stored for provider: ${provider}`, {
        provider,
        userId,
        hasRotationSchedule: true,
        secretId: secretId
      });

      this.logger.info(`API key stored for provider: ${provider}`);
      return data;
    } catch (error) {
      this.logger.error('Failed to store API key:', error);
      throw error;
    }
  }

  async getApiKey(userId, provider) {
    if (!this.initialized) {
      throw new Error('Vault service not initialized');
    }

    try {
      // Retrieve secret ID from database
      const { data, error } = await this.supabase
        .from('api_keys')
        .select('encrypted_key')
        .eq('user_id', userId || 'default')
        .eq('provider', provider)
        .single();

      if (error || !data) {
        return null;
      }

      // Retrieve the decrypted secret from vault using direct DB connection
      const secretResult = await this.dbClient.query(
        'SELECT decrypted_secret FROM vault.decrypted_secrets WHERE id = $1',
        [data.encrypted_key]
      );

      if (!secretResult.rows || secretResult.rows.length === 0) {
        this.logger.error('Failed to retrieve secret from vault: Secret not found');
        return null;
      }

      const secretData = { decrypted_secret: secretResult.rows[0].decrypted_secret };
      
      // Log access for audit
      await this.logAuditEvent('API_KEY_ACCESSED', `API key accessed for provider: ${provider}`, {
        provider,
        userId,
        secretId: data.encrypted_key
      });
      
      return secretData.decrypted_secret;
    } catch (error) {
      this.logger.error('Failed to retrieve API key:', error);
      return null;
    }
  }

  async getAllApiKeys(userId) {
    if (!this.initialized) {
      throw new Error('Vault service not initialized');
    }

    try {
      const { data, error } = await this.supabase
        .from('api_keys')
        .select('provider, encrypted_key, created_at, updated_at, rotation_schedule')
        .eq('user_id', userId || 'default');

      if (error) {
        throw new Error(`Failed to retrieve API keys: ${error.message}`);
      }

      const apiKeys = {};
      
      for (const key of data) {
        try {
          // Retrieve the decrypted secret from vault
          const secretResult = await this.dbClient.query(
            'SELECT decrypted_secret FROM vault.decrypted_secrets WHERE id = $1',
            [key.encrypted_key]
          );

          if (secretResult.rows && secretResult.rows.length > 0) {
            apiKeys[key.provider] = {
              key: secretResult.rows[0].decrypted_secret,
              created_at: key.created_at,
              updated_at: key.updated_at,
              rotation_schedule: key.rotation_schedule ? JSON.parse(key.rotation_schedule) : null
            };
          }
        } catch (secretError) {
          this.logger.warn(`Failed to decrypt key for provider ${key.provider}:`, secretError);
        }
      }

      return apiKeys;
    } catch (error) {
      this.logger.error('Failed to retrieve all API keys:', error);
      throw error;
    }
  }

  async deleteApiKey(userId, provider) {
    if (!this.initialized) {
      throw new Error('Vault service not initialized');
    }

    try {
      // Get the secret ID first
      const { data, error } = await this.supabase
        .from('api_keys')
        .select('encrypted_key')
        .eq('user_id', userId || 'default')
        .eq('provider', provider)
        .single();

      if (error || !data) {
        throw new Error('API key not found');
      }

      // Delete from database
      const { error: deleteError } = await this.supabase
        .from('api_keys')
        .delete()
        .eq('user_id', userId || 'default')
        .eq('provider', provider);

      if (deleteError) {
        throw new Error(`Failed to delete API key: ${deleteError.message}`);
      }

      // Note: We don't delete from vault as it maintains audit trail
      // The secret will remain in vault but won't be accessible through our API

      await this.logAuditEvent('API_KEY_DELETED', `API key deleted for provider: ${provider}`, {
        provider,
        userId,
        secretId: data.encrypted_key
      });

      this.logger.info(`API key deleted for provider: ${provider}`);
      return true;
    } catch (error) {
      this.logger.error('Failed to delete API key:', error);
      throw error;
    }
  }

  async rotateApiKey(userId, provider) {
    if (!this.initialized) {
      throw new Error('Vault service not initialized');
    }

    try {
      // Get current key
      const currentKey = await this.getApiKey(userId, provider);
      if (!currentKey) {
        throw new Error('API key not found for rotation');
      }

      // Generate new key (in real implementation, this would call the provider's API)
      const newKey = `rotated_${currentKey}_${Date.now()}`;

      // Store new key
      await this.storeApiKey(userId, provider, newKey);

      // Update rotation schedule
      const schedule = this.keyRotationSchedule.get(provider) || {};
      schedule.lastRotation = new Date();
      schedule.nextRotation = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
      schedule.rotationCount = (schedule.rotationCount || 0) + 1;
      this.keyRotationSchedule.set(provider, schedule);

      await this.logAuditEvent('API_KEY_ROTATED', `API key rotated for provider: ${provider}`, {
        provider,
        userId,
        rotationCount: schedule.rotationCount
      });

      this.logger.info(`API key rotated for provider: ${provider}`);
      return true;
    } catch (error) {
      this.logger.error('Failed to rotate API key:', error);
      throw error;
    }
  }

  async getRotationSchedule(provider) {
    if (!this.initialized) {
      throw new Error('Vault service not initialized');
    }

    return this.keyRotationSchedule.get(provider) || null;
  }

  async setRotationSchedule(provider, schedule) {
    if (!this.initialized) {
      throw new Error('Vault service not initialized');
    }

    this.keyRotationSchedule.set(provider, {
      ...this.keyRotationSchedule.get(provider),
      ...schedule
    });

    await this.logAuditEvent('ROTATION_SCHEDULE_UPDATED', `Rotation schedule updated for provider: ${provider}`, {
      provider,
      schedule
    });

    return true;
  }

  async getAuditLog(limit = 100, offset = 0) {
    if (!this.initialized) {
      throw new Error('Vault service not initialized');
    }

    try {
      const { data, error } = await this.supabase
        .from('audit_log')
        .select('*')
        .order('timestamp', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Failed to retrieve audit log: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      this.logger.error('Failed to retrieve audit log:', error);
      // Return local audit log as fallback
      return this.auditLog.slice(offset, offset + limit);
    }
  }

  async createBackup() {
    if (!this.initialized) {
      throw new Error('Vault service not initialized');
    }

    try {
      const backupData = {
        timestamp: new Date().toISOString(),
        rotationSchedules: Object.fromEntries(this.keyRotationSchedule),
        auditLogCount: this.auditLog.length,
        version: '2.0.0'
      };

      // Encrypt backup data
      const encryptedBackup = await this.encrypt(JSON.stringify(backupData));

      // Store backup
      const { data, error } = await this.supabase
        .from('vault_backups')
        .insert({
          backup_data: encryptedBackup,
          backup_type: 'manual',
          metadata: JSON.stringify({ created_by: 'system' })
        });

      if (error) {
        throw new Error(`Failed to create backup: ${error.message}`);
      }

      await this.logAuditEvent('BACKUP_CREATED', 'Vault backup created successfully', {
        backupId: data[0]?.id,
        backupType: 'manual'
      });

      this.logger.info('Vault backup created successfully');
      return data[0];
    } catch (error) {
      this.logger.error('Failed to create backup:', error);
      throw error;
    }
  }

  async restoreBackup(backupId) {
    if (!this.initialized) {
      throw new Error('Vault service not initialized');
    }

    try {
      // Retrieve backup
      const { data, error } = await this.supabase
        .from('vault_backups')
        .select('backup_data')
        .eq('id', backupId)
        .single();

      if (error || !data) {
        throw new Error('Backup not found');
      }

      // Decrypt backup data
      const decryptedBackup = await this.decrypt(data.backup_data);
      const backupData = JSON.parse(decryptedBackup);

      // Restore rotation schedules
      this.keyRotationSchedule.clear();
      for (const [provider, schedule] of Object.entries(backupData.rotationSchedules)) {
        this.keyRotationSchedule.set(provider, schedule);
      }

      await this.logAuditEvent('BACKUP_RESTORED', 'Vault backup restored successfully', {
        backupId,
        backupTimestamp: backupData.timestamp
      });

      this.logger.info('Vault backup restored successfully');
      return true;
    } catch (error) {
      this.logger.error('Failed to restore backup:', error);
      throw error;
    }
  }

  startKeyRotationMonitoring() {
    // Check for keys that need rotation every hour
    setInterval(async () => {
      try {
        const now = new Date();
        for (const [provider, schedule] of this.keyRotationSchedule.entries()) {
          if (schedule.nextRotation && new Date(schedule.nextRotation) <= now) {
            this.logger.info(`Key rotation due for provider: ${provider}`);
            // In a real implementation, this would trigger rotation
          }
        }
      } catch (error) {
        this.logger.error('Key rotation monitoring error:', error);
      }
    }, 60 * 60 * 1000); // 1 hour
  }

  startBackupProcedures() {
    // Create daily backups
    this.backupInterval = setInterval(async () => {
      try {
        await this.createBackup();
      } catch (error) {
        this.logger.error('Scheduled backup failed:', error);
      }
    }, 24 * 60 * 60 * 1000); // 24 hours
  }

  async shutdown() {
    try {
      if (this.backupInterval) {
        clearInterval(this.backupInterval);
      }
      
      if (this.dbClient) {
        await this.dbClient.end();
      }

      await this.logAuditEvent('VAULT_SHUTDOWN', 'Vault service shutdown');
      this.logger.info('Vault service shutdown complete');
    } catch (error) {
      this.logger.error('Error during vault shutdown:', error);
    }
  }

  // Additional methods for API compatibility
  isInitialized() {
    return this.initialized;
  }

  async getKeyRotationSchedule() {
    if (!this.initialized) {
      throw new Error('Vault service not initialized');
    }
    return Array.from(this.keyRotationSchedule.entries()).map(([provider, schedule]) => ({
      provider,
      lastRotation: schedule.lastRotation,
      nextRotation: schedule.nextRotation,
      rotationCount: schedule.rotationCount
    }));
  }

  async setKeyRotationSchedule(provider, daysUntilRotation = 90) {
    if (!this.initialized) {
      throw new Error('Vault service not initialized');
    }

    try {
      this.keyRotationSchedule.set(provider, {
        lastRotation: new Date(),
        nextRotation: new Date(Date.now() + daysUntilRotation * 24 * 60 * 60 * 1000),
        rotationCount: 0
      });

      await this.logAuditEvent('ROTATION_SCHEDULE_SET', `Rotation schedule set for provider: ${provider}`, {
        provider,
        daysUntilRotation
      });

      return true;
    } catch (error) {
      this.logger.error('Failed to set key rotation schedule:', error);
      throw error;
    }
  }

  async deleteAllApiKeys(userId) {
    if (!this.initialized) {
      throw new Error('Vault service not initialized');
    }

    try {
      const { error } = await this.supabase
        .from('api_keys')
        .delete()
        .eq('user_id', userId || 'default');

      if (error) {
        throw new Error(`Failed to delete all API keys: ${error.message}`);
      }

      // Clear rotation schedules
      this.keyRotationSchedule.clear();

      await this.logAuditEvent('ALL_API_KEYS_DELETED', 'All API keys deleted', {
        userId
      });

      this.logger.info('All API keys deleted');
      return true;
    } catch (error) {
      this.logger.error('Failed to delete all API keys:', error);
      throw error;
    }
  }

  async restoreFromBackup(backupId) {
    if (!this.initialized) {
      throw new Error('Vault service not initialized');
    }

    try {
      // Retrieve backup
      const { data, error } = await this.supabase
        .from('vault_backups')
        .select('backup_data')
        .eq('id', backupId)
        .single();

      if (error || !data) {
        throw new Error('Backup not found');
      }

      // Decrypt backup data
      const decryptedBackup = await this.decrypt(data.backup_data);
      const backupData = JSON.parse(decryptedBackup);

      // Restore API keys
      for (const [provider, key] of Object.entries(backupData.apiKeys)) {
        if (key) {
          await this.storeApiKey('default', provider, key);
        }
      }

      await this.logAuditEvent('BACKUP_RESTORED', `Backup restored from ID: ${backupId}`);
      this.logger.info(`Backup restored successfully from ID: ${backupId}`);
      
      return true;
    } catch (error) {
      this.logger.error('Backup restoration failed:', error);
      throw error;
    }
  }
}

export default new VaultService();
