# Supabase Vault Setup Guide

## Overview

This guide explains how to properly configure and use the Supabase Vault for secure API key storage in the Manito Debug application, following the [official Supabase Vault documentation](https://supabase.com/docs/guides/database/vault).

## Prerequisites

1. **Docker Desktop** - Must be running for local Supabase development
2. **Supabase CLI** - Installed and configured
3. **Node.js** - For running the application

## Environment Variables

The following environment variables must be configured in your `.env` file:

```bash
# Supabase Configuration
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU

# Vault Configuration
SUPABASE_VAULT_SECRET_KEY=manito-vault-secret-key-2025-development-only
```

## Setup Steps

### 1. Start Docker Desktop

```bash
open -a Docker
```

Wait for Docker to fully start (you should see the Docker icon in your menu bar).

### 2. Start Supabase Local Development

```bash
supabase start
```

This will start the local Supabase instance with the following services:
- **API URL**: http://127.0.0.1:54321
- **DB URL**: postgresql://postgres:postgres@127.0.0.1:54325/postgres
- **Studio URL**: http://127.0.0.1:54323

### 3. Verify Vault Configuration

Check that the vault is properly configured:

```bash
psql postgresql://postgres:postgres@127.0.0.1:54325/postgres -c "SELECT * FROM vault.decrypted_secrets LIMIT 3;"
```

You should see existing secrets including the vault secret key.

### 4. Test Vault Functions

Test the vault functions directly:

```bash
# Create a test secret
psql postgresql://postgres:postgres@127.0.0.1:54325/postgres -c "SELECT vault.create_secret('test_api_key_123', 'test_provider_key', 'Test API key for provider');"

# View all secrets
psql postgresql://postgres:postgres@127.0.0.1:54325/postgres -c "SELECT * FROM vault.decrypted_secrets ORDER BY created_at DESC LIMIT 5;"
```

## Vault Implementation Details

### Architecture

The vault service uses a hybrid approach:

1. **Direct Database Connection** - For vault operations (encryption/decryption)
2. **Supabase Client** - For regular database operations (audit logs, API key metadata)

### Key Functions

#### Encryption
```javascript
// Creates a secret in the vault and returns the secret ID
const secretId = await vaultService.encrypt('my-api-key');
```

#### Decryption
```javascript
// Retrieves the decrypted secret using the secret ID
const decryptedKey = await vaultService.decrypt(secretId);
```

#### API Key Storage
```javascript
// Stores an API key securely
await vaultService.storeApiKey('user123', 'openai', 'sk-...');
```

#### API Key Retrieval
```javascript
// Retrieves an API key
const apiKey = await vaultService.getApiKey('user123', 'openai');
```

## Security Features

### 1. Authenticated Encryption
- Uses Supabase Vault's built-in authenticated encryption
- Secrets are encrypted with libsodium
- Encryption keys are managed by Supabase and never stored in the database

### 2. Audit Logging
- All vault operations are logged
- Includes user ID, IP address, and operation metadata
- Stored in both memory and database

### 3. Key Rotation
- Automated 90-day rotation schedule
- Rotation monitoring runs every hour
- Manual rotation support

### 4. Backup System
- Automated daily backups
- Encrypted backup storage
- 7-day retention policy

## Testing the Vault

### Run the Test Suite

```bash
node scripts/test-vault-direct.js
```

This will test:
- Environment variable configuration
- Vault service initialization
- Encryption/decryption operations
- API key storage and retrieval
- Health checks

### Expected Output

```
🔍 Testing Vault Service Directly...
=====================================

📋 Environment Variables:
SUPABASE_URL: http://127.0.0.1:54321
SUPABASE_ANON_KEY: SET
SUPABASE_SERVICE_ROLE_KEY: SET
SUPABASE_VAULT_SECRET_KEY: SET

📦 Testing vault service import...
✅ Vault service imported successfully

🚀 Testing vault service initialization...
✅ Vault service initialized successfully

🏥 Testing vault health check...
Health status: { status: 'healthy', ... }

🔐 Testing encryption/decryption...
✅ Encryption/decryption working correctly

💾 Testing API key storage...
✅ API key stored successfully

📋 Testing get all API keys...
✅ All API keys retrieved successfully
```

## Troubleshooting

### Common Issues

1. **Docker Not Running**
   ```
   Error: connect ECONNREFUSED 127.0.0.1:54325
   ```
   **Solution**: Start Docker Desktop and wait for it to fully initialize.

2. **Supabase Not Started**
   ```
   Error: Cannot connect to the Docker daemon
   ```
   **Solution**: Run `supabase start` after Docker is running.

3. **Vault Functions Not Found**
   ```
   Error: Could not find the function public.vault.create_secret
   ```
   **Solution**: Ensure Supabase is properly started and migrations have run.

4. **Environment Variables Missing**
   ```
   Error: SUPABASE_VAULT_SECRET_KEY environment variable is required
   ```
   **Solution**: Check your `.env` file and ensure all required variables are set.

### Database Connection Issues

If you're having trouble connecting to the database:

```bash
# Check if Supabase is running
supabase status

# Restart Supabase if needed
supabase stop
supabase start

# Check database connectivity
psql postgresql://postgres:postgres@127.0.0.1:54325/postgres -c "SELECT version();"
```

## Production Considerations

### 1. Environment Variables
- Use strong, unique vault secret keys in production
- Store sensitive environment variables securely
- Consider using a secrets management service

### 2. Database Security
- Enable Row Level Security (RLS) on vault tables
- Restrict access to vault functions
- Regular security audits

### 3. Monitoring
- Monitor vault access patterns
- Set up alerts for unusual activity
- Regular backup verification

### 4. Key Rotation
- Implement proper key rotation procedures
- Test rotation processes regularly
- Maintain rotation audit trails

## API Endpoints

The vault service exposes the following REST endpoints:

- `GET /api/vault/status` - Vault health check
- `GET /api/vault/keys` - List all API keys
- `DELETE /api/vault/keys/:provider` - Delete specific API key
- `GET /api/vault/audit-log` - View audit log
- `GET /api/vault/rotation-schedule` - Get rotation schedules
- `POST /api/vault/rotate-key/:provider` - Rotate API key
- `POST /api/vault/create-backup` - Create backup
- `POST /api/vault/restore-backup/:backupId` - Restore from backup

## Best Practices

1. **Never log sensitive data** - API keys should never appear in logs
2. **Use strong encryption** - Rely on Supabase Vault's built-in encryption
3. **Regular audits** - Review vault access logs regularly
4. **Backup verification** - Test backup restoration procedures
5. **Access control** - Implement proper access controls for vault operations

## References

- [Supabase Vault Documentation](https://supabase.com/docs/guides/database/vault)
- [Supabase CLI Documentation](https://supabase.com/docs/guides/cli)
- [PostgreSQL Security Best Practices](https://www.postgresql.org/docs/current/security.html)
