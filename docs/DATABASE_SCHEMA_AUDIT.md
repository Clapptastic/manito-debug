# Database Schema Audit Report

## Executive Summary

This audit reveals several critical issues with the database schema and Supabase configuration that are causing migration failures and functionality problems.

## 🔴 Critical Issues Found

### 1. Schema Conflicts Between Supabase and Server Migrations

**Problem**: There are conflicting schema definitions between Supabase migrations and server-side migrations.

**Files Affected**:
- `supabase/migrations/20250819000001_ckg_schema.sql` (Supabase)
- `server/db/migrations/004_ckg_schema.sql` (Server)

**Conflicts**:
- **Schema Namespace**: Supabase uses `public` schema, server uses `manito_dev` schema
- **Column Names**: 
  - Supabase: `node_type` vs Server: `type`
  - Supabase: `file_path` vs Server: `path`
- **Extensions**: Supabase enables `vector` extension, server doesn't
- **Data Types**: Supabase uses `VECTOR(1536)`, server uses `TEXT` for embeddings

### 2. Migration Duplication Errors

**Error**: `duplicate key value violates unique constraint "migrations_pkey"`

**Root Cause**: The migration system is trying to apply the same migration multiple times.

**Affected Migration**: `001_initial_schema`

### 3. Permission Issues

**Error**: `must be owner of function search_code_chunks`

**Root Cause**: Database user lacks permissions to create/modify functions.

### 4. Missing Database Extensions

**Problem**: Server migrations don't enable required extensions that Supabase migrations expect.

**Missing Extensions**:
- `vector` (pgvector)
- `uuid-ossp`
- `pg_trgm`

## 🟡 Schema Inconsistencies

### Table Structure Differences

| Table | Supabase Schema | Server Schema | Issue |
|-------|----------------|---------------|-------|
| `graph_nodes` | `node_type` | `type` | Column name mismatch |
| `graph_nodes` | `file_path` | `path` | Column name mismatch |
| `embeddings` | `VECTOR(1536)` | `TEXT` | Data type mismatch |
| `code_chunks` | No `ts_vector` | `ts_vector` | Missing generated column |

### Index Differences

**Supabase**:
```sql
CREATE INDEX idx_embeddings_vector ON embeddings USING ivfflat (embedding vector_cosine_ops);
```

**Server**:
```sql
-- No vector index (uses TEXT instead of VECTOR)
```

## 🟢 Working Components

### 1. Basic Database Connection
- ✅ Database connection established
- ✅ Projects API working (43 projects returned)
- ✅ Basic CRUD operations functional

### 2. Core Tables
- ✅ `projects` table exists and functional
- ✅ `scans` table exists and functional
- ✅ Basic API endpoints working

## 📋 Recommended Fixes

### Phase 1: Schema Unification

1. **Choose Primary Schema System**
   - **Recommendation**: Use Supabase schema as primary
   - **Reason**: Better integration with Supabase features (pgvector, RLS, etc.)

2. **Update Server Migrations**
   - Align column names with Supabase schema
   - Enable required extensions
   - Remove schema namespace conflicts

3. **Fix Migration System**
   - Implement proper migration tracking
   - Add migration checksums
   - Handle duplicate migration attempts

### Phase 2: Permission Resolution

1. **Database User Permissions**
   - Grant necessary permissions to database user
   - Ensure function creation permissions
   - Set up proper ownership

2. **Extension Installation**
   - Install pgvector extension
   - Install uuid-ossp extension
   - Install pg_trgm extension

### Phase 3: Data Migration

1. **Schema Migration Script**
   - Create migration script to align existing data
   - Handle column renames
   - Migrate data types

2. **Backup Strategy**
   - Create backup before migration
   - Implement rollback procedures

## 🔧 Immediate Actions Required

### 1. Fix Migration Duplication
```sql
-- Check existing migrations
SELECT * FROM migrations ORDER BY created_at;

-- Clean up duplicate entries
DELETE FROM migrations WHERE id IN (
  SELECT id FROM migrations 
  GROUP BY id 
  HAVING COUNT(*) > 1
);
```

### 2. Align Schema Names
```sql
-- Update server schema to match Supabase
ALTER TABLE manito_dev.graph_nodes RENAME COLUMN type TO node_type;
ALTER TABLE manito_dev.graph_nodes RENAME COLUMN path TO file_path;
```

### 3. Enable Extensions
```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

## 📊 Impact Assessment

### High Impact
- ❌ CKG (Code Knowledge Graph) functionality broken
- ❌ Vector similarity search not working
- ❌ Migration system unreliable

### Medium Impact
- ⚠️ Schema inconsistencies causing confusion
- ⚠️ Potential data loss during migrations
- ⚠️ Development environment instability

### Low Impact
- ✅ Basic CRUD operations working
- ✅ API endpoints functional
- ✅ Project management working

## 🎯 Success Criteria

1. **Schema Consistency**: All migrations use same schema definitions
2. **Migration Reliability**: No duplicate migration errors
3. **Permission Resolution**: All functions can be created/modified
4. **Extension Availability**: All required extensions enabled
5. **Data Integrity**: No data loss during migration
6. **Functionality**: CKG and vector search working

## 📝 Next Steps

1. **Immediate**: Fix migration duplication errors
2. **Short-term**: Align schema definitions
3. **Medium-term**: Implement proper migration system
4. **Long-term**: Full Supabase integration

## 🔍 Monitoring

- Monitor migration logs for errors
- Track database performance
- Verify CKG functionality
- Test vector similarity search
- Validate data integrity

---

**Audit Date**: 2025-08-21  
**Auditor**: AI Assistant  
**Status**: Critical Issues Found - Immediate Action Required
