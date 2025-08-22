# Supabase Edge Functions & RPC Functions Audit

## Executive Summary

This audit examines the Supabase edge functions and RPC functions in the Manito Debug application. The audit reveals that while no traditional edge functions exist, there are several critical RPC functions that are either missing or have implementation issues.

## 🔍 Audit Scope

### What Was Audited:
1. **Edge Functions**: Traditional Deno-based edge functions
2. **RPC Functions**: PostgreSQL functions called via Supabase RPC
3. **Database Functions**: Stored procedures and functions
4. **Service Integration**: How functions are called from the application

## 📊 Audit Results

### ✅ **Working RPC Functions**

#### 1. **CKG (Code Knowledge Graph) Functions**
- ✅ `search_similar_chunks` - Vector similarity search
- ✅ `search_code_chunks` - Full-text search
- ✅ `find_symbol_definitions` - Symbol definition lookup
- ✅ `find_symbol_references` - Symbol reference lookup
- ✅ `get_dependency_graph` - Dependency graph generation

#### 2. **Utility Functions**
- ✅ `update_updated_at_column` - Timestamp update trigger
- ✅ `create_audit_log_table` - Audit log table creation

### ❌ **Missing Critical Functions**

#### 1. **execute_sql Function**
**Problem**: The Supabase service calls `execute_sql` RPC function, but it doesn't exist.

**Impact**: 
- Database queries fail
- Supabase service cannot execute raw SQL
- Core functionality broken

**Code Reference**:
```javascript
// server/services/supabase-service.js:73
const { data, error } = await this.client.rpc('execute_sql', {
  sql_query: sql,
  sql_params: params
});
```

#### 2. **encrypt Function**
**Problem**: Vault service calls `encrypt` RPC function, but it doesn't exist.

**Impact**:
- API key encryption fails
- Vault service cannot secure sensitive data
- Security vulnerability

**Code Reference**:
```javascript
// server/services/vault-service.js:311
const { data, error } = await this.supabase.rpc('encrypt', {
  data: apiKey,
  key: this.encryptionKey
});
```

#### 3. **decrypt Function**
**Problem**: Vault service calls `decrypt` RPC function, but it doesn't exist.

**Impact**:
- API key decryption fails
- Cannot retrieve stored API keys
- Vault service completely broken

**Code Reference**:
```javascript
// server/services/vault-service.js:334
const { data, error } = await this.supabase.rpc('decrypt', {
  data: encryptedKey,
  key: this.encryptionKey
});
```

## 🔧 **Missing Edge Functions**

### Expected Edge Functions (None Found)

The project doesn't contain any traditional Supabase edge functions (Deno-based functions in `supabase/functions/` directory). This is actually correct for this application architecture, as it uses a Node.js server instead of edge functions.

## 📋 **Function Implementation Status**

### Implemented Functions

| Function | Status | Location | Purpose |
|----------|--------|----------|---------|
| `search_similar_chunks` | ✅ Working | `supabase/migrations/20250819000001_ckg_schema.sql` | Vector similarity search |
| `search_code_chunks` | ✅ Working | `supabase/migrations/20250819000001_ckg_schema.sql` | Full-text search |
| `find_symbol_definitions` | ✅ Working | `supabase/migrations/20250819000001_ckg_schema.sql` | Symbol definitions |
| `find_symbol_references` | ✅ Working | `supabase/migrations/20250819000001_ckg_schema.sql` | Symbol references |
| `get_dependency_graph` | ✅ Working | `supabase/migrations/20250819000001_ckg_schema.sql` | Dependency analysis |
| `update_updated_at_column` | ✅ Working | Multiple migrations | Timestamp triggers |
| `create_audit_log_table` | ✅ Working | `supabase/migrations/006_vault_audit_and_backup_tables.sql` | Audit logging |

### Missing Functions

| Function | Status | Impact | Required For |
|----------|--------|--------|--------------|
| `execute_sql` | ❌ Missing | High | Raw SQL execution |
| `encrypt` | ❌ Missing | High | API key encryption |
| `decrypt` | ❌ Missing | High | API key decryption |

## 🚨 **Critical Issues**

### 1. **Supabase Service Broken**
The main Supabase service cannot function without the `execute_sql` function. This affects:
- All database operations
- Query execution
- Data retrieval

### 2. **Vault Service Broken**
The vault service cannot function without `encrypt` and `decrypt` functions. This affects:
- API key storage
- Secure data handling
- Authentication

### 3. **Security Vulnerability**
Without encryption functions, sensitive data is not properly secured.

## 🔧 **Required Fixes**

### 1. **Create execute_sql Function**
```sql
-- Add to supabase/migrations/007_missing_functions.sql
CREATE OR REPLACE FUNCTION execute_sql(
  sql_query TEXT,
  sql_params JSONB DEFAULT '[]'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Execute dynamic SQL with parameters
  EXECUTE sql_query INTO result USING sql_params;
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('error', SQLERRM);
END;
$$;
```

### 2. **Create encrypt Function**
```sql
-- Add to supabase/migrations/007_missing_functions.sql
CREATE OR REPLACE FUNCTION encrypt(
  data TEXT,
  key TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Use pgcrypto for encryption
  RETURN encode(encrypt_iv(data::bytea, key::bytea, '0123456789012345'::bytea, 'aes-cbc'), 'base64');
END;
$$;
```

### 3. **Create decrypt Function**
```sql
-- Add to supabase/migrations/007_missing_functions.sql
CREATE OR REPLACE FUNCTION decrypt(
  encrypted_data TEXT,
  key TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Use pgcrypto for decryption
  RETURN convert_from(decrypt_iv(decode(encrypted_data, 'base64'), key::bytea, '0123456789012345'::bytea, 'aes-cbc'), 'utf8');
END;
$$;
```

## 📝 **Implementation Plan**

### Phase 1: Create Missing Functions
1. Create migration file `007_missing_functions.sql`
2. Implement `execute_sql`, `encrypt`, and `decrypt` functions
3. Test function functionality

### Phase 2: Test Integration
1. Test Supabase service with `execute_sql`
2. Test vault service with `encrypt`/`decrypt`
3. Verify all RPC calls work

### Phase 3: Security Review
1. Review function security settings
2. Ensure proper access controls
3. Test encryption/decryption

## 🎯 **Success Criteria**

1. **All RPC Functions Working**: No missing function errors
2. **Supabase Service Functional**: Database operations work
3. **Vault Service Secure**: API keys properly encrypted
4. **No Security Vulnerabilities**: Proper access controls

## 📊 **Current Status**

- **Edge Functions**: ✅ None required (correct architecture)
- **RPC Functions**: ⚠️ 7/10 working (70% success rate)
- **Critical Functions**: ❌ 3/3 missing (0% success rate)
- **Overall Health**: ❌ **CRITICAL ISSUES**

## 🔍 **Recommendations**

### Immediate Actions
1. **Create missing functions** as outlined above
2. **Test all RPC calls** after implementation
3. **Update documentation** with function specifications

### Long-term Improvements
1. **Add function monitoring** for RPC performance
2. **Implement function versioning** for better management
3. **Add comprehensive testing** for all RPC functions

---

**Audit Date**: 2025-08-21  
**Auditor**: AI Assistant  
**Status**: ❌ **CRITICAL ISSUES - IMMEDIATE ACTION REQUIRED**
