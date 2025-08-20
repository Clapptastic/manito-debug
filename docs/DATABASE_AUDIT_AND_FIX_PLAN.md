# Database Audit and Fix Plan

## 🔍 **Audit Summary**

**Date**: August 20, 2025  
**Status**: ⚠️ **CRITICAL ISSUES IDENTIFIED**  
**Production Readiness**: ❌ **NOT READY** - Multiple critical issues found

## 🚨 **Critical Issues Identified**

### 1. **Migration System Failures**
- **Issue**: Duplicate migration entries causing constraint violations
- **Error**: `duplicate key value violates unique constraint "migrations_pkey"`
- **Impact**: Migration system is broken, preventing schema updates
- **Status**: ❌ **CRITICAL**

### 2. **Database Ownership Conflicts**
- **Issue**: Mixed table ownership between `manito_dev` and `andrewclapp`
- **Tables owned by `andrewclapp`**:
  - `code_chunks`
  - `diagnostics`
  - `embeddings`
  - `graph_edges`
  - `graph_nodes`
  - `symbol_references`
- **Tables owned by `manito_dev`**:
  - All other tables (12 tables)
- **Impact**: Permission errors, CKG service failures
- **Status**: ❌ **CRITICAL**

### 3. **CKG Service Failures**
- **Issue**: `must be owner of table graph_nodes` errors
- **Impact**: Code Knowledge Graph functionality completely broken
- **Status**: ❌ **CRITICAL**

### 4. **Database Insert Failures**
- **Issue**: `Parameter 1 contains object - potential injection risk`
- **Impact**: Scan results not being saved to database
- **Status**: ⚠️ **HIGH**

### 5. **Vault Service Issues**
- **Issue**: Vault service not initialized due to missing environment variables
- **Impact**: Secure API key storage not available
- **Status**: ⚠️ **MEDIUM**

## 📊 **Current Database Status**

### **Connection Health**
- ✅ **Database Connected**: PostgreSQL 14.18 (Homebrew)
- ✅ **Pool Status**: 3 total connections, 2 idle, 0 waiting
- ✅ **Cache**: 0 hits, 0 misses (cache not being used effectively)
- ❌ **Mock Mode**: False (good, but some operations failing)

### **Schema Status**
- **Total Tables**: 16 tables
- **Functions**: 7 functions
- **Indexes**: 57 indexes
- **Migration Status**: 6 migrations, 1 failed

### **Service Status**
- ✅ **Database Service**: Connected and healthy
- ✅ **WebSocket**: 2 active connections
- ✅ **Semantic Search**: All indexes and functions present
- ✅ **AI Service**: OpenAI and local providers available
- ❌ **Vault Service**: Not initialized
- ❌ **CKG Service**: Failed due to ownership issues

## 🔧 **Fix Plan**

### **Phase 1: Emergency Fixes (Immediate)**

#### 1.1 **Fix Migration System**
```sql
-- Clean up duplicate migration entries
DELETE FROM manito_dev.migrations WHERE id = '001_initial_schema' AND status = 'failed';
DELETE FROM manito_dev.migrations WHERE id = '001_initial_schema' AND error_message IS NOT NULL;

-- Reset migration sequence if needed
SELECT setval('manito_dev.migrations_id_seq', (SELECT MAX(id::integer) FROM manito_dev.migrations));
```

#### 1.2 **Fix Database Ownership**
```sql
-- Transfer ownership of CKG tables to manito_dev
ALTER TABLE manito_dev.code_chunks OWNER TO manito_dev;
ALTER TABLE manito_dev.diagnostics OWNER TO manito_dev;
ALTER TABLE manito_dev.embeddings OWNER TO manito_dev;
ALTER TABLE manito_dev.graph_edges OWNER TO manito_dev;
ALTER TABLE manito_dev.graph_nodes OWNER TO manito_dev;
ALTER TABLE manito_dev.symbol_references OWNER TO manito_dev;

-- Grant proper permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA manito_dev TO manito_dev;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA manito_dev TO manito_dev;
```

#### 1.3 **Fix Database Insert Issues**
- **Root Cause**: Parameter binding issues in scan result insertion
- **Fix**: Update database service to properly handle object parameters
- **Location**: `server/services/enhancedDatabase.js`

### **Phase 2: Production Hardening**

#### 2.1 **Environment Configuration**
```bash
# Required environment variables for production
SUPABASE_VAULT_SECRET_KEY=your_vault_secret_key
POSTGRES_USER=manito_prod
POSTGRES_PASSWORD=secure_production_password
POSTGRES_HOST=production_host
POSTGRES_DB=manito_prod
POSTGRES_SCHEMA=manito_prod
DB_SSL=true
```

#### 2.2 **Database Security**
- Enable SSL connections
- Implement connection pooling optimization
- Add database monitoring and alerting
- Set up automated backups
- Implement proper user permissions

#### 2.3 **Migration System Enhancement**
- Add migration validation
- Implement rollback capabilities
- Add migration testing in CI/CD
- Improve error handling and recovery

### **Phase 3: Performance Optimization**

#### 3.1 **Connection Pool Optimization**
```javascript
// Optimize pool settings for production
const config = {
  min: 5,           // Increased from 2
  max: 50,          // Increased from 20
  acquireTimeoutMillis: 30000,  // Reduced from 60000
  idleTimeoutMillis: 300000,    // Reduced from 600000
  connectionTimeoutMillis: 5000, // Increased from 2000
  statement_timeout: 60000,      // Increased from 30000
};
```

#### 3.2 **Cache Optimization**
- Implement Redis caching for frequently accessed data
- Add cache invalidation strategies
- Monitor cache hit rates
- Optimize query performance

## 🚀 **Implementation Steps**

### **Step 1: Emergency Database Fixes**
```bash
# 1. Connect to database and run ownership fixes
psql -h localhost -U manito_dev -d manito_dev -f fixes/ownership_fixes.sql

# 2. Clean up migration table
psql -h localhost -U manito_dev -d manito_dev -f fixes/migration_cleanup.sql

# 3. Restart server to test fixes
npm run dev:server
```

### **Step 2: Code Fixes**
```bash
# 1. Fix database service parameter binding
# 2. Update vault service initialization
# 3. Add proper error handling for CKG operations
# 4. Test all database operations
```

### **Step 3: Production Deployment**
```bash
# 1. Set up production environment variables
# 2. Configure SSL and security settings
# 3. Set up monitoring and alerting
# 4. Deploy with proper backup strategy
```

## 📋 **Testing Checklist**

### **Database Connection Tests**
- [ ] Connection pool health
- [ ] SSL connection (production)
- [ ] Connection timeout handling
- [ ] Pool exhaustion recovery

### **Migration Tests**
- [ ] Migration application
- [ ] Migration rollback
- [ ] Duplicate migration handling
- [ ] Migration validation

### **CKG Service Tests**
- [ ] Graph node creation
- [ ] Graph edge creation
- [ ] Symbol reference storage
- [ ] Embedding storage

### **Scan Operation Tests**
- [ ] Scan result insertion
- [ ] File metadata storage
- [ ] Dependency tracking
- [ ] Conflict detection

### **Vault Service Tests**
- [ ] API key encryption
- [ ] API key decryption
- [ ] Key rotation
- [ ] Access control

## 🎯 **Success Criteria**

### **Immediate Goals**
- [ ] All database operations working without errors
- [ ] CKG service fully functional
- [ ] Migration system stable
- [ ] Vault service operational

### **Production Goals**
- [ ] 99.9% uptime
- [ ] <100ms average query response time
- [ ] Zero data loss
- [ ] Automated backup and recovery
- [ ] Comprehensive monitoring and alerting

## 📊 **Monitoring and Alerting**

### **Key Metrics to Monitor**
- Database connection pool utilization
- Query response times
- Cache hit rates
- Migration success/failure rates
- CKG operation success rates
- Vault service health

### **Alerting Thresholds**
- Connection pool >80% utilization
- Query response time >500ms
- Cache hit rate <70%
- Migration failures
- CKG service errors
- Vault service failures

---

**Next Action**: Execute Phase 1 emergency fixes immediately to restore database functionality.
