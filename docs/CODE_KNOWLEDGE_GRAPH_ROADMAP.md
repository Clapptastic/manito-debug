# 🧠 Code Knowledge Graph (CKG) System - Implementation Roadmap

**Last Updated**: January 2025  
**Integration Status**: Planning Phase  
**Priority**: High (Next Major Feature Set)  
**Estimated Timeline**: 12-16 weeks

## 🎯 Executive Summary

The Code Knowledge Graph (CKG) system represents the next evolutionary step for ManitoDebug, transforming it from a code analysis tool into a comprehensive code intelligence platform. This system will provide deep, structured understanding of codebases through symbolic and semantic indexing, enabling unprecedented AI-powered insights and development assistance.

## 🔗 Integration with Existing ManitoDebug Architecture

### Current Foundation (Ready for CKG)
- ✅ **Core Scanner**: [`core/scanner.js`] - AST parsing and dependency extraction
- ✅ **AI Analysis**: [`core/ai-analysis-service.js`] - AI-powered code insights  
- ✅ **Database Layer**: PostgreSQL with full-text search capabilities
- ✅ **WebSocket Communication**: Real-time updates and progress tracking
- ✅ **Dynamic Port Management**: Production-ready infrastructure

### CKG Enhancement Points
- **Extend Scanner**: Add tree-sitter parsers and LSP integration
- **Enhance Database**: Graph schema for nodes/edges with semantic search
- **Upgrade AI Service**: Context-aware retrieval with symbolic + semantic indexing
- **Expand WebSocket**: Real-time CKG updates and incremental indexing

---

## 📋 Implementation Phases

## Phase 1: Foundation & Core Graph Infrastructure (4-5 weeks)

### 1.1 Enhanced Parsing & Symbol Extraction (Week 1-2)

**Deliverables:**
- `core/parsers/tree-sitter-engine.js` - Multi-language AST parsing
- `core/parsers/lsp-integration.js` - Language server protocol integration  
- `core/extractors/symbol-extractor.js` - Extract types, functions, classes
- `core/extractors/reference-extractor.js` - Extract definitions ↔ references
- `core/extractors/import-export-extractor.js` - Module dependency mapping

**Integration Points:**
- Extend existing `core/scanner.js` with new parsers
- Maintain backward compatibility with current scanning API
- Add language detection and parser selection logic

**Languages Priority:**
1. JavaScript/TypeScript (extend current support)
2. Python (new)
3. Go (new)  
4. Rust (new)
5. Java/Kotlin (future)

### 1.2 Graph Database Schema & Storage (Week 2-3)

**Deliverables:**
- `server/db/schema/graph-nodes.sql` - Node types (File, Symbol, Type, Endpoint, etc.)
- `server/db/schema/graph-edges.sql` - Edge types (defines, references, imports, etc.)  
- `server/services/graph-store.js` - Graph database abstraction layer
- `server/services/incremental-indexer.js` - Delta updates and versioning

**Database Extensions:**
```sql
-- Node Types
CREATE TABLE graph_nodes (
  id UUID PRIMARY KEY,
  type VARCHAR(50) NOT NULL, -- File, Symbol, Type, Endpoint, etc.
  name VARCHAR(255) NOT NULL,
  path TEXT,
  language VARCHAR(50),
  metadata JSONB,
  commit_hash VARCHAR(40),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Edge Types  
CREATE TABLE graph_edges (
  id UUID PRIMARY KEY,
  from_node_id UUID REFERENCES graph_nodes(id),
  to_node_id UUID REFERENCES graph_edges(id),
  relationship VARCHAR(50) NOT NULL, -- defines, references, imports, etc.
  metadata JSONB,
  weight FLOAT DEFAULT 1.0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Full-text search on code content
CREATE TABLE code_chunks (
  id UUID PRIMARY KEY,
  node_id UUID REFERENCES graph_nodes(id),
  content TEXT NOT NULL,
  chunk_type VARCHAR(50), -- signature, implementation, documentation
  ts_vector tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED
);

CREATE INDEX idx_code_chunks_fts ON code_chunks USING GIN(ts_vector);
```

### 1.3 Symbolic Index Implementation (Week 3-4)

**Deliverables:**
- `server/services/symbolic-index.js` - Exact symbol lookups
- `server/api/graph-query.js` - REST API for graph queries  
- `core/analyzers/dependency-analyzer.js` - Import/export resolution
- `core/analyzers/type-analyzer.js` - Type system analysis

**Query API Examples:**
```javascript
// WHO imports this symbol?
GET /api/graph/symbols/Foo.bar/importers

// WHERE is this function defined?  
GET /api/graph/symbols/calculateTotal/definition

// WHAT files import from this module?
GET /api/graph/modules/api/users/dependents
```

### 1.4 File Watcher & Incremental Updates (Week 4-5)

**Deliverables:**
- `server/services/file-watcher.js` - Watchman integration
- `server/services/incremental-updater.js` - Delta processing
- `server/workers/graph-worker.js` - Background processing queue
- `server/api/reindex.js` - Manual reindexing endpoints

**Integration:**
- Extend existing WebSocket system for real-time graph updates
- Add to existing scan queue system for background processing
- Integrate with current database migration system

---

## Phase 2: Semantic Intelligence & AI Integration (3-4 weeks)

### 2.1 Semantic Chunking & Embeddings (Week 6-7)

**Deliverables:**
- `core/chunkers/symbol-chunker.js` - One-symbol-per-chunk strategy
- `core/chunkers/endpoint-chunker.js` - API endpoint documentation  
- `server/services/embedding-service.js` - Vector embeddings with metadata
- `server/services/semantic-search.js` - Hybrid symbolic + semantic search

**Chunk Strategy:**
```javascript
// Symbol chunks include:
{
  content: "function signature + docstring + implementation summary",
  metadata: {
    language: "typescript",
    symbolKind: "function", 
    path: "src/utils/helpers.ts",
    package: "@acme/utils",
    isPublic: true,
    testCoverage: 85,
    lastTouched: "2025-01-15",
    owningTeam: "platform"
  }
}
```

### 2.2 Context-Aware AI Retrieval (Week 7-8)

**Deliverables:**
- `server/services/context-builder.js` - Bounded context assembly
- `server/services/ai-retrieval.js` - Multi-stage retrieval strategy
- `core/analyzers/proximity-analyzer.js` - Code relationship scoring
- `server/api/ai-context.js` - Context API for AI queries

**Retrieval Strategy:**
1. **Symbolic Pre-filter**: Follow refs/defs/imports for precise neighborhood
2. **Semantic Expand**: Pull semantically similar chunks for context  
3. **Rerank**: By proximity + recency + error presence
4. **Assemble**: Bounded context window with metadata

### 2.3 Enhanced AI Analysis Service (Week 8-9)

**Deliverables:**
- Update `core/ai-analysis-service.js` with CKG integration
- `server/services/ai-tools.js` - Sandboxed analysis tools
- `core/analyzers/gap-detector.js` - Missing imports/exports detection
- `server/api/ai-tools.js` - Tool invocation API

**AI Tools Integration:**
```javascript
// Available tools for AI
const tools = {
  whoImports: (symbol) => graphQuery.getImporters(symbol),
  missingExports: (module) => gapDetector.findMissingExports(module),
  endpointsWithoutTests: (service) => testAnalyzer.findUntested(service),
  conflictingVersions: (package) => dependencyAnalyzer.findConflicts(package)
};
```

---

## Phase 3: Advanced Analysis & Developer Tools (3-4 weeks)

### 3.1 Static Analysis Integration (Week 10-11)

**Deliverables:**
- `core/analyzers/multi-language-linter.js` - Language-specific linting
- `core/analyzers/type-checker.js` - Type system validation
- `core/analyzers/dependency-checker.js` - Lockfile and manifest analysis
- `server/services/diagnostic-collector.js` - Centralized error/warning storage

**Language Tool Integration:**
- **TypeScript**: `tsc --noEmit`, ESLint integration
- **Python**: Pyright/mypy, Ruff integration  
- **Go**: `gopls`, `go vet`, module analysis
- **Rust**: `rust-analyzer`, `cargo check`

### 3.2 Endpoint & Contract Intelligence (Week 11-12)

**Deliverables:**
- `core/extractors/endpoint-extractor.js` - Framework-aware route detection
- `core/analyzers/contract-analyzer.js` - OpenAPI/schema validation
- `core/analyzers/api-drift-detector.js` - Spec vs implementation comparison
- `server/api/endpoints.js` - Endpoint catalog API

**Framework Support:**
- Express.js, Fastify (Node.js)
- FastAPI, Django, Flask (Python)  
- Gin, Echo, Mux (Go)
- Axum, Warp (Rust)

### 3.3 Context Packs & Fast Retrieval (Week 12-13)

**Deliverables:**
- `core/generators/context-pack-generator.js` - Lightweight context files
- `server/services/context-cache.js` - Optimized context delivery
- `core/generators/repo-map-generator.js` - Project structure summaries
- `core/generators/api-catalog-generator.js` - Public API documentation

**Context Pack Structure:**
```javascript
{
  repoMap: { tree, sizes, languages, buildTargets },
  publicAPI: { exports, signatures, examples, tests },
  endpointCatalog: { routes, handlers, types, auth, tests },
  hotDiagnostics: { errors, warnings, fixes },
  changeSummaries: { commits, symbols, endpoints }
}
```

---

## Phase 4: CI/CD Integration & Production Features (2-3 weeks)

### 4.1 CI/CD Pipeline Integration (Week 14-15)

**Deliverables:**
- `scripts/ci/pre-merge-analysis.js` - PR analysis and comments
- `scripts/ci/ckg-artifact-publisher.js` - Graph publishing for branches
- `server/services/pr-bot.js` - Automated PR feedback
- `.github/workflows/ckg-analysis.yml` - GitHub Actions integration

**CI Features:**
- Pre-merge bot comments with focused findings
- Branch-specific CKG artifact publishing  
- Performance regression detection
- Test coverage analysis for changed code

### 4.2 IDE Integration & Developer Experience (Week 15-16)

**Deliverables:**
- Update `vscode-extension/extension.js` with CKG features
- `vscode-extension/quick-actions.js` - Fix imports, generate tests
- `vscode-extension/explainer.js` - Error explanation and fixes
- `client/src/components/CKGDashboard.jsx` - Web-based CKG explorer

**IDE Quick Actions:**
- "Fix missing import" - Auto-resolve and add imports
- "Generate export barrel" - Create index files
- "Create test skeleton" - Generate test boilerplate
- "Sync OpenAPI" - Update API specifications

---

## 🛠️ Technical Implementation Details

### Minimal Implementation Stack

**Parsing & Analysis:**
- **tree-sitter** for multi-language AST parsing
- **Language servers** (tsserver, pyright, gopls, rust-analyzer) where available
- **Static analysis tools** integrated via CLI

**Storage & Indexing:**  
- **PostgreSQL** with graph tables + FTS5 for code text
- **FAISS** or similar for vector embeddings with metadata
- **Redis** for caching and job queues

**Processing & Updates:**
- **Watchman** for file system monitoring
- **Background workers** for incremental updates  
- **WebSocket** for real-time updates

**AI & Retrieval:**
- **Hybrid search** (symbolic + semantic)
- **Context assembly** with metadata-driven ranking
- **Tool integration** for AI-powered analysis

### Performance Considerations

**Scalability Targets:**
- **Small projects**: <1,000 files, <100ms query response
- **Medium projects**: 1,000-10,000 files, <500ms query response  
- **Large projects**: 10,000+ files, <2s query response
- **Enterprise**: 100,000+ files, distributed processing

**Optimization Strategies:**
- Incremental indexing with commit-based versioning
- Lazy loading of embeddings and context
- Caching of frequent queries and context packs
- Horizontal scaling for very large monorepos

---

## 🔄 Integration with Existing Roadmap

### Current Status Integration
This CKG roadmap builds directly on ManitoDebug's existing strengths:

**Phase 1 Prerequisites (from STATUS.md):**
- ✅ Fix test suite → **Required before CKG development**
- ✅ Real AI integration → **Enhanced by CKG in Phase 2**  
- ✅ Database persistence → **Extended with graph schema**
- ✅ Authentication/security → **Required for CKG API access**

**Timeline Coordination:**
- **Months 1-2**: Complete existing Phase 1 critical fixes
- **Months 3-5**: CKG Phase 1 (Foundation)  
- **Months 6-7**: CKG Phase 2 (Semantic Intelligence)
- **Months 8-9**: CKG Phase 3 (Advanced Analysis)
- **Months 10**: CKG Phase 4 (CI/CD Integration)

### Enhanced Value Proposition

**Before CKG**: Code analysis tool with basic dependency mapping
**After CKG**: Comprehensive code intelligence platform with:
- Deep symbolic understanding of codebases
- Semantic search across code, documentation, and specs
- AI-powered development assistance with precise context
- Automated gap detection and fix suggestions
- Enterprise-grade analysis for large monorepos

---

## 📊 Success Metrics & KPIs

### Technical Metrics
- **Index Build Time**: <5min for 10k files, <30min for 100k files
- **Query Performance**: 95% of queries <500ms, 99% <2s
- **Accuracy**: >90% precision for symbol resolution and gap detection
- **Incremental Updates**: <30s for typical file changes

### User Experience Metrics  
- **Time to Insight**: <30s from question to AI-powered answer
- **Developer Adoption**: >80% of team using CKG features weekly
- **Problem Resolution**: 50% faster debugging with context assistance
- **Code Quality**: 25% reduction in missing imports/exports

### Business Impact
- **Enterprise Readiness**: Support for 100k+ file codebases
- **Competitive Advantage**: Unique symbolic + semantic intelligence
- **Revenue Growth**: Premium CKG features drive subscription upgrades
- **Market Position**: Industry leader in AI-powered code intelligence

---

## 🚀 Getting Started

### Immediate Next Steps (Week 1)
1. **Architecture Review**: Validate CKG design with team
2. **Dependency Planning**: Evaluate tree-sitter, Watchman, FAISS
3. **Database Design**: Finalize graph schema and migration strategy
4. **Resource Allocation**: Assign developers to CKG phases

### Phase 1 Kickoff Checklist
- [ ] Complete existing STATUS.md Phase 1 prerequisites  
- [ ] Set up tree-sitter development environment
- [ ] Design graph database schema and migrations
- [ ] Create CKG development branch and project structure
- [ ] Establish testing strategy for graph operations

---

## 🎯 Long-term Vision

The Code Knowledge Graph system positions ManitoDebug as the definitive code intelligence platform, capable of understanding and reasoning about codebases at unprecedented depth. This foundation enables future innovations like:

- **Automated Refactoring**: AI-guided code transformations with safety guarantees
- **Predictive Analysis**: Anticipate bugs and performance issues before they occur  
- **Team Intelligence**: Understand team expertise and code ownership patterns
- **Cross-Repository Analysis**: Enterprise-wide code intelligence and governance

**By implementing the CKG system, ManitoDebug evolves from a useful development tool into an indispensable code intelligence platform that transforms how developers understand, navigate, and improve their codebases.**

---

*This roadmap represents a strategic evolution of ManitoDebug's capabilities, building on the solid foundation already established while opening new possibilities for AI-powered development assistance.*
