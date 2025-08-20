import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

/**
 * Enhanced Vault Service for secure API key storage
 * Uses Supabase Vault for encryption/decryption with advanced security features
 */
class VaultService {
  constructor() {
    this.supabase = null;
    this.vaultSecret = process.env.SUPABASE_VAULT_SECRET_KEY;
    this.initialized = false;
    this.logger = console;
    this.auditLog = [];
    this.keyRotationSchedule = new Map();
    this.backupInterval = null;
  }

  async initialize() {
    try {
      if (!this.vaultSecret) {
        throw new Error('SUPABASE_VAULT_SECRET_KEY environment variable is required');
      }

      this.supabase = createClient(
        process.env.SUPABASE_URL || 'http://127.0.0.1:54321',
        process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
      );

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

    } catch (error) {
      this.logger.error('Failed to log audit event:', error);
    }
  }

  startKeyRotationMonitoring() {
    // Check for key rotation every hour
    setInterval(async () => {
      try {
        await this.checkKeyRotationSchedule();
      } catch (error) {
        this.logger.error('Key rotation check failed:', error);
      }
    }, 60 * 60 * 1000); // 1 hour
  }

  startBackupProcedures() {
    // Create backup every 24 hours
    this.backupInterval = setInterval(async () => {
      try {
        await this.createBackup();
      } catch (error) {
        this.logger.error('Backup creation failed:', error);
      }
    }, 24 * 60 * 60 * 1000); // 24 hours
  }

  async checkKeyRotationSchedule() {
    try {
      const now = new Date();
      const keysToRotate = [];

      for (const [provider, schedule] of this.keyRotationSchedule.entries()) {
        if (schedule.nextRotation <= now) {
          keysToRotate.push(provider);
        }
      }

      for (const provider of keysToRotate) {
        await this.rotateApiKey(provider);
      }

      if (keysToRotate.length > 0) {
        await this.logAuditEvent('KEY_ROTATION', `Rotated keys for providers: ${keysToRotate.join(', ')}`);
      }
    } catch (error) {
      this.logger.error('Key rotation schedule check failed:', error);
    }
  }

  async rotateApiKey(provider, userId = 'default') {
    try {
      // Get current key
      const currentKey = await this.getApiKey(userId, provider);
      if (!currentKey) {
        throw new Error(`No existing key found for provider: ${provider}`);
      }

      // Generate new key (this would typically come from the provider's API)
      const newKey = await this.generateNewApiKey(provider, currentKey);
      
      // Store new key
      await this.storeApiKey(userId, provider, newKey);
      
      // Update rotation schedule
      this.keyRotationSchedule.set(provider, {
        lastRotation: new Date(),
        nextRotation: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        rotationCount: (this.keyRotationSchedule.get(provider)?.rotationCount || 0) + 1
      });

      await this.logAuditEvent('KEY_ROTATED', `API key rotated for provider: ${provider}`, {
        provider,
        userId,
        rotationCount: this.keyRotationSchedule.get(provider)?.rotationCount
      });

      this.logger.info(`API key rotated for provider: ${provider}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to rotate API key for ${provider}:`, error);
      throw error;
    }
  }

  async generateNewApiKey(provider, currentKey) {
    // This is a placeholder - in production, you would call the provider's API
    // to generate a new key and invalidate the old one
    try {
      // For demonstration, we'll create a mock new key
      const timestamp = Date.now();
      const randomBytes = crypto.randomBytes(16).toString('hex');
      return `${provider}_new_${timestamp}_${randomBytes}`;
    } catch (error) {
      throw new Error(`Failed to generate new API key for ${provider}: ${error.message}`);
    }
  }

  async createBackup() {
    try {
      const backupData = {
        timestamp: new Date().toISOString(),
        apiKeys: await this.getAllApiKeys(),
        auditLog: this.auditLog.slice(-100), // Last 100 audit entries
        keyRotationSchedule: Array.from(this.keyRotationSchedule.entries()),
        metadata: {
          version: '2.0.0',
          backupType: 'scheduled'
        }
      };

      // Encrypt backup data
      const encryptedBackup = await this.encrypt(JSON.stringify(backupData));
      
      // Store backup
      const { error } = await this.supabase
        .from('vault_backups')
        .insert({
          backup_data: encryptedBackup,
          created_at: new Date().toISOString(),
          backup_type: 'scheduled'
        });

      if (error) {
        throw new Error(`Failed to store backup: ${error.message}`);
      }

      await this.logAuditEvent('BACKUP_CREATED', 'Scheduled backup created successfully');
      this.logger.info('Vault backup created successfully');
      
      // Clean up old backups (keep last 7 days)
      await this.cleanupOldBackups();
      
    } catch (error) {
      this.logger.error('Backup creation failed:', error);
      throw error;
    }
  }

  async cleanupOldBackups() {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      const { error } = await this.supabase
        .from('vault_backups')
        .delete()
        .lt('created_at', sevenDaysAgo.toISOString());

      if (error) {
        this.logger.warn('Failed to cleanup old backups:', error);
      }
    } catch (error) {
      this.logger.warn('Backup cleanup failed:', error);
    }
  }

  async restoreFromBackup(backupId) {
    try {
      const { data, error } = await this.supabase
        .from('vault_backups')
        .select('backup_data')
        .eq('id', backupId)
        .single();

      if (error || !data) {
        throw new Error('Backup not found');
      }

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

  async testConnection() {
    try {
      // Test vault access by attempting to encrypt/decrypt a test value
      const testKey = 'test-api-key';
      const encrypted = await this.encrypt(testKey);
      const decrypted = await this.decrypt(encrypted);
      
      if (decrypted !== testKey) {
        throw new Error('Vault encryption/decryption test failed');
      }
      
      this.logger.info('Vault connection test successful');
      return true;
    } catch (error) {
      this.logger.error('Vault connection test failed:', error);
      throw error;
    }
  }

  async encrypt(text) {
    if (!this.initialized) {
      throw new Error('Vault service not initialized');
    }

    try {
      // Use Supabase Vault for encryption
      const { data, error } = await this.supabase.rpc('encrypt', {
        data: text,
        secret_key: this.vaultSecret
      });

      if (error) {
        throw new Error(`Encryption failed: ${error.message}`);
      }

      return data;
    } catch (error) {
      this.logger.error('Encryption error:', error);
      throw error;
    }
  }

  async decrypt(encryptedText) {
    if (!this.initialized) {
      throw new Error('Vault service not initialized');
    }

    try {
      // Use Supabase Vault for decryption
      const { data, error } = await this.supabase.rpc('decrypt', {
        data: encryptedText,
        secret_key: this.vaultSecret
      });

      if (error) {
        throw new Error(`Decryption failed: ${error.message}`);
      }

      return data;
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
      const encryptedKey = await this.encrypt(apiKey);
      
      // Set up key rotation schedule if not exists
      if (!this.keyRotationSchedule.has(provider)) {
        this.keyRotationSchedule.set(provider, {
          lastRotation: new Date(),
          nextRotation: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
          rotationCount: 0
        });
      }
      
      // Store encrypted key in database
      const { data, error } = await this.supabase
        .from('api_keys')
        .upsert({
          user_id: userId || 'default',
          provider: provider,
          encrypted_key: encryptedKey,
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
        hasRotationSchedule: true
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
      // Retrieve encrypted key from database
      const { data, error } = await this.supabase
        .from('api_keys')
        .select('encrypted_key')
        .eq('user_id', userId || 'default')
        .eq('provider', provider)
        .single();

      if (error || !data) {
        return null;
      }

      // Decrypt the key
      const decryptedKey = await this.decrypt(data.encrypted_key);
      
      // Log access for audit
      await this.logAuditEvent('API_KEY_ACCESSED', `API key accessed for provider: ${provider}`, {
        provider,
        userId
      });
      
      return decryptedKey;
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
      // Retrieve all encrypted keys for user
      const { data, error } = await this.supabase
        .from('api_keys')
        .select('provider, encrypted_key, created_at, updated_at')
        .eq('user_id', userId || 'default');

      if (error) {
        throw new Error(`Failed to retrieve API keys: ${error.message}`);
      }

      // Decrypt all keys
      const decryptedKeys = {};
      for (const key of data) {
        try {
          decryptedKeys[key.provider] = await this.decrypt(key.encrypted_key);
        } catch (decryptError) {
          this.logger.warn(`Failed to decrypt key for ${key.provider}:`, decryptError);
          decryptedKeys[key.provider] = null;
        }
      }

      await this.logAuditEvent('ALL_API_KEYS_ACCESSED', 'All API keys accessed', {
        userId,
        keyCount: Object.keys(decryptedKeys).length
      });

      return decryptedKeys;
    } catch (error) {
      this.logger.error('Failed to retrieve all API keys:', error);
      return {};
    }
  }

  async deleteApiKey(userId, provider) {
    if (!this.initialized) {
      throw new Error('Vault service not initialized');
    }

    try {
      const { error } = await this.supabase
        .from('api_keys')
        .delete()
        .eq('user_id', userId || 'default')
        .eq('provider', provider);

      if (error) {
        throw new Error(`Failed to delete API key: ${error.message}`);
      }

      // Remove from rotation schedule
      this.keyRotationSchedule.delete(provider);

      await this.logAuditEvent('API_KEY_DELETED', `API key deleted for provider: ${provider}`, {
        provider,
        userId
      });

      this.logger.info(`API key deleted for provider: ${provider}`);
      return true;
    } catch (error) {
      this.logger.error('Failed to delete API key:', error);
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

  async getAuditLog(limit = 100, offset = 0) {
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
      return this.auditLog.slice(-limit);
    }
  }

  async getKeyRotationSchedule() {
    return Array.from(this.keyRotationSchedule.entries()).map(([provider, schedule]) => ({
      provider,
      lastRotation: schedule.lastRotation,
      nextRotation: schedule.nextRotation,
      rotationCount: schedule.rotationCount
    }));
  }

  async setKeyRotationSchedule(provider, daysUntilRotation = 90) {
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

  isInitialized() {
    return this.initialized;
  }

  async healthCheck() {
    try {
      if (!this.initialized) {
        return {
          status: 'error',
          message: 'Vault service not initialized'
        };
      }

      await this.testConnection();
      
      const rotationSchedule = await this.getKeyRotationSchedule();
      const auditLogCount = this.auditLog.length;
      
      return {
        status: 'healthy',
        message: 'Enhanced vault service is operational',
        metrics: {
          rotationScheduleCount: rotationSchedule.length,
          auditLogCount,
          lastBackup: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Vault service health check failed: ${error.message}`
      };
    }
  }

  // Cleanup method for graceful shutdown
  async cleanup() {
    try {
      if (this.backupInterval) {
        clearInterval(this.backupInterval);
      }
      
      await this.logAuditEvent('VAULT_SHUTDOWN', 'Vault service shutting down');
      this.logger.info('Vault service cleanup completed');
    } catch (error) {
      this.logger.error('Vault service cleanup failed:', error);
    }
  }
}

export default new VaultService();
