# Dependency Graph Functionality Audit Report

## 🔍 Executive Summary

**Status**: ❌ **CRITICAL ISSUES FOUND**

The dependency graph functionality in Manito Debug has significant architectural and implementation issues that prevent it from working properly. While the code structure is well-designed, there are fundamental database schema incompatibilities and missing implementations.

---

## 📊 Audit Results

### ✅ **What Works**
1. **Core Architecture**: Well-structured dependency analyzer in `core/analyzers/dependency-analyzer.js`
2. **Client Components**: Sophisticated React components for visualization
3. **API Endpoints**: Proper REST API structure in place
4. **Edge Function Integration**: New edge functions support dependency analysis

### ❌ **Critical Issues**

#### 1. **Database Schema Incompatibility** 
- **Severity**: CRITICAL
- **Issue**: Type mismatch between `projects.id` (UUID) and `graph_nodes.project_id` (BIGINT)
- **Impact**: CKG schema cannot be applied, dependency graph functions don't exist
- **Error**: `foreign key constraint "graph_nodes_project_id_fkey" cannot be implemented`

#### 2. **Missing Database Functions**
- **Severity**: HIGH
- **Issue**: Core functions like `get_dependency_graph()` don't exist in database
- **Impact**: API calls fail, no dependency data can be retrieved
- **Missing Functions**:
  - `get_dependency_graph()`
  - `search_similar_chunks()`
  - `find_symbol_definitions()`
  - `find_symbol_references()`

#### 3. **Missing Database Tables**
- **Severity**: HIGH
- **Issue**: Core CKG tables don't exist
- **Missing Tables**:
  - `graph_nodes`
  - `graph_edges`
  - `code_chunks`
  - `embeddings`
  - `diagnostics`
  - `symbol_references`

#### 4. **Client-Server Data Flow Broken**
- **Severity**: HIGH
- **Issue**: Client expects specific data format that server cannot provide
- **Impact**: Dependency graph visualizations don't render

---

## 🔧 Detailed Technical Analysis

### **1. Database Schema Issues**

#### Current State
```sql
-- Projects table (from manual setup)
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),  -- UUID type
  ...
);

-- CKG schema expects
CREATE TABLE graph_nodes (
  project_id BIGINT,  -- BIGINT type - INCOMPATIBLE!
  ...
);
```

#### Root Cause
The CKG schema was designed for a different database structure where project IDs are BIGINT, but the current setup uses UUID.

### **2. API Flow Analysis**

#### Expected Flow
```
Client Request → API Endpoint → Database Function → Response
     ↓              ↓              ↓                ↓
/api/ckg/...  → getDependencyGraph() → get_dependency_graph() → JSON
```

#### Actual Flow
```
Client Request → API Endpoint → Database Function → ERROR
     ↓              ↓              ✗
/api/ckg/...  → getDependencyGraph() → FUNCTION DOES NOT EXIST
```

### **3. Code Quality Assessment**

#### **Core Analyzer** (`core/analyzers/dependency-analyzer.js`)
- ✅ **Excellent**: Comprehensive dependency analysis logic
- ✅ **Good**: Circular dependency detection
- ✅ **Good**: Architectural layer analysis
- ⚠️ **Issue**: Not integrated with database storage

#### **Client Components** (`client/src/components/DependencyGraph.jsx`)
- ✅ **Excellent**: Sophisticated D3.js visualization
- ✅ **Good**: Semantic search capabilities
- ✅ **Good**: Interactive features
- ❌ **Issue**: Expects data format that doesn't exist

#### **API Layer** (`server/api/ckg-api.js`)
- ✅ **Good**: Proper error handling
- ✅ **Good**: RESTful design
- ❌ **Issue**: Calls non-existent database functions

---

## 🚨 Impact Assessment

### **User Impact**
- **Severity**: HIGH
- **Users cannot**:
  - View dependency graphs
  - Analyze code relationships
  - Detect circular dependencies
  - Understand architectural layers
  - Use CKG features

### **Development Impact**
- **Severity**: MEDIUM
- **Developers cannot**:
  - Debug dependency issues
  - Visualize code structure
  - Optimize architecture
  - Identify unused code

### **System Impact**
- **Severity**: LOW
- **System still functions** for:
  - Basic code scanning
  - File analysis
  - AI insights
  - Edge functions

---

## 🛠️ Recommended Solutions

### **Phase 1: Database Schema Fix** (Priority: CRITICAL)

#### Option A: Migrate to UUID (Recommended)
```sql
-- Fix CKG schema to use UUID
ALTER TABLE graph_nodes 
  ALTER COLUMN project_id TYPE UUID 
  USING project_id::text::uuid;
```

#### Option B: Migrate Projects to BIGINT
```sql
-- Change projects table to use BIGINT (BREAKING CHANGE)
ALTER TABLE projects 
  ALTER COLUMN id TYPE BIGINT 
  USING (random() * 1000000)::BIGINT;
```

**Recommendation**: Use Option A to maintain compatibility.

### **Phase 2: Database Function Implementation** (Priority: HIGH)

1. **Create Fixed CKG Migration**:
   ```bash
   # Create new migration file
   supabase/migrations/009_fixed_ckg_schema.sql
   ```

2. **Update Function Signatures**:
   ```sql
   CREATE OR REPLACE FUNCTION get_dependency_graph(
     project_filter UUID,  -- Changed from BIGINT
     max_depth INTEGER DEFAULT 3
   )
   ```

3. **Apply Missing Tables**:
   - Create all CKG tables with correct types
   - Add proper indexes and constraints
   - Set up RLS policies

### **Phase 3: Integration Testing** (Priority: MEDIUM)

1. **Database Function Tests**
2. **API Endpoint Tests** 
3. **Client Component Tests**
4. **End-to-End Flow Tests**

### **Phase 4: Enhanced Features** (Priority: LOW)

1. **Performance Optimization**
2. **Advanced Visualizations**
3. **Real-time Updates**
4. **Export Capabilities**

---

## 📋 Implementation Plan

### **Immediate Actions (Week 1)**
- [ ] Create fixed CKG schema migration
- [ ] Update all UUID/BIGINT references
- [ ] Apply database migrations
- [ ] Test core functions

### **Short Term (Week 2-3)**
- [ ] Fix API integration
- [ ] Update client components
- [ ] Implement missing features
- [ ] Add comprehensive tests

### **Medium Term (Month 1)**
- [ ] Performance optimization
- [ ] Advanced visualizations
- [ ] Documentation updates
- [ ] User training materials

---

## 🧪 Testing Strategy

### **Unit Tests**
```javascript
// Test dependency analyzer
describe('DependencyAnalyzer', () => {
  it('should detect circular dependencies', () => {
    // Test implementation
  });
});
```

### **Integration Tests**
```javascript
// Test API endpoints
describe('/api/ckg/projects/:id/dependencies', () => {
  it('should return dependency graph', async () => {
    // Test implementation
  });
});
```

### **End-to-End Tests**
```javascript
// Test full workflow
describe('Dependency Graph Workflow', () => {
  it('should scan code and display graph', async () => {
    // Test implementation
  });
});
```

---

## 📊 Risk Assessment

### **High Risk**
- **Data Loss**: Schema changes could affect existing data
- **Breaking Changes**: API modifications may break client code
- **Performance**: Large graphs may cause performance issues

### **Medium Risk**
- **Compatibility**: Edge function integration complexity
- **User Experience**: Temporary feature unavailability during fixes

### **Low Risk**
- **Visualization**: D3.js rendering issues are easily fixable
- **Documentation**: Missing docs don't affect functionality

---

## 💰 Cost-Benefit Analysis

### **Costs**
- **Development Time**: ~2-3 weeks for complete fix
- **Testing Time**: ~1 week for comprehensive testing
- **Risk Management**: ~1 week for rollback planning

### **Benefits**
- **User Value**: Restored critical functionality
- **Developer Experience**: Better debugging capabilities
- **System Completeness**: Full feature parity
- **Technical Debt**: Reduced maintenance burden

**ROI**: HIGH - Critical feature restoration justifies investment

---

## 🎯 Success Metrics

### **Technical Metrics**
- [ ] All database functions working (100%)
- [ ] All API endpoints returning data (100%)
- [ ] Client components rendering graphs (100%)
- [ ] Zero critical errors in logs

### **User Metrics**
- [ ] Dependency graphs load in <2 seconds
- [ ] Support for projects with 1000+ files
- [ ] Interactive features respond in <100ms
- [ ] Zero user-reported issues

### **Quality Metrics**
- [ ] 90%+ test coverage
- [ ] All linting issues resolved
- [ ] Documentation complete
- [ ] Performance benchmarks met

---

## 📚 Resources Needed

### **Development Resources**
- **Senior Developer**: 2-3 weeks
- **Database Expert**: 1 week (consultation)
- **Frontend Developer**: 1 week
- **QA Engineer**: 1 week

### **Infrastructure Resources**
- **Test Database**: For migration testing
- **Staging Environment**: For integration testing
- **Monitoring Tools**: For performance tracking

---

## 🔗 Related Issues

### **GitHub Issues** (if applicable)
- Dependency graph not loading
- CKG functions missing
- Schema migration failures
- Client visualization errors

### **Dependencies**
- Supabase Edge Functions (implemented ✅)
- Database migrations (needs fix ❌)
- Client components (needs update ⚠️)
- API endpoints (needs fix ❌)

---

## 📞 Next Steps

1. **Immediate**: Create fixed database migration
2. **This Week**: Implement core database functions
3. **Next Week**: Update API and client integration
4. **Following Week**: Comprehensive testing and deployment

**Contact**: Development team for implementation coordination

---

**Report Generated**: August 24, 2025  
**Auditor**: AI Assistant  
**Status**: CRITICAL ISSUES IDENTIFIED - IMMEDIATE ACTION REQUIRED
