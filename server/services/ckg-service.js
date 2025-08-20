/**
 * Code Knowledge Graph Service
 * Main orchestration service for CKG functionality
 */

import { SymbolExtractor } from '../../core/extractors/symbol-extractor.js';
import { SemanticChunker } from '../../core/chunkers/semantic-chunker.js';
import graphStore from './graph-store.js';
import symbolicIndex from './symbolic-index.js';
import embeddingService from './embedding-service.js';
import contextBuilder from './context-builder.js';
import incrementalIndexer from './incremental-indexer.js';
import enhancedDb from './enhancedDatabase.js';
import { EventEmitter } from 'events';
import winston from 'winston';

export class CKGService extends EventEmitter {
  constructor() {
    super();
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.simple()
        })
      ]
    });

    this.symbolExtractor = new SymbolExtractor();
    this.semanticChunker = new SemanticChunker();
    this.isInitialized = false;
    
    this.initialize();
  }

  /**
   * Initialize CKG service
   */
  async initialize() {
    try {
      this.logger.info('Initializing Code Knowledge Graph service...');

      // Run CKG database migrations
      await this.runCKGMigrations();

      // Initialize components
      await this.initializeComponents();

      this.isInitialized = true;
      this.logger.info('CKG service initialized successfully');
      this.emit('initialized');

      return true;
    } catch (error) {
      this.logger.error('CKG service initialization failed', { error: error.message });
      this.emit('initializationFailed', error);
      throw error;
    }
  }

  /**
   * Run CKG database migrations
   */
  async runCKGMigrations() {
    try {
      this.logger.info('Running CKG database migrations...');

      // Read and execute CKG schema migration
      const fs = await import('fs/promises');
      const path = await import('path');
      const { fileURLToPath } = await import('url');
      
      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      const migrationPath = path.join(__dirname, '..', 'db', 'migrations', '004_ckg_schema.sql');
      
      const migrationSQL = await fs.readFile(migrationPath, 'utf8');
      
      // Execute migration
      await enhancedDb.query(migrationSQL);
      
      this.logger.info('CKG database migrations completed');
    } catch (error) {
      this.logger.error('CKG migration failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Initialize CKG components
   */
  async initializeComponents() {
    try {
      // Test graph store
      const graphHealth = await graphStore.health();
      if (graphHealth.status !== 'ok') {
        this.logger.warn(`Graph store not healthy: ${graphHealth.message}`);
        // Don't throw - allow CKG to run in degraded mode
      }

      // Test symbolic index
      const symbolicHealth = await symbolicIndex.health();
      if (symbolicHealth.status !== 'ok') {
        this.logger.warn(`Symbolic index not healthy: ${symbolicHealth.message}`);
        // Don't throw - allow CKG to run in degraded mode
      }

      // Test embedding service
      const embeddingHealth = await embeddingService.health();
      if (embeddingHealth.status !== 'ok') {
        this.logger.warn('Embedding service degraded:', embeddingHealth.message);
        // Continue - embedding service can run with local fallback
      }

      this.logger.info('All CKG components initialized');
    } catch (error) {
      this.logger.error('Component initialization failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Build complete knowledge graph for project
   */
  async buildKnowledgeGraph(projectId, rootPath, options = {}) {
    try {
      const {
        incremental = false,
        commitHash = null,
        enableSemanticChunking = true,
        enableEmbeddings = true
      } = options;

      this.logger.info('Building knowledge graph', { projectId, rootPath, incremental });

      let result;

      if (incremental) {
        // Start incremental indexing
        result = await incrementalIndexer.startIndexing(projectId, rootPath, commitHash);
      } else {
        // Perform full graph build
        result = await this.performFullGraphBuild(projectId, rootPath, commitHash, {
          enableSemanticChunking,
          enableEmbeddings
        });
      }

      this.emit('knowledgeGraphBuilt', {
        projectId,
        rootPath,
        incremental,
        result
      });

      return result;
    } catch (error) {
      this.logger.error('Failed to build knowledge graph', { error: error.message, projectId });
      throw error;
    }
  }

  /**
   * Perform full knowledge graph build
   */
  async performFullGraphBuild(projectId, rootPath, commitHash, options) {
    try {
      const { enableSemanticChunking, enableEmbeddings } = options;
      
      // Phase 1: Extract symbols and build graph
      this.logger.info('Phase 1: Extracting symbols and building graph...');
      const graphResult = await incrementalIndexer.performFullIndex(projectId, rootPath, commitHash);

      // Phase 2: Create semantic chunks
      let chunkResult = { chunksCreated: 0 };
      if (enableSemanticChunking) {
        this.logger.info('Phase 2: Creating semantic chunks...');
        chunkResult = await this.createSemanticChunks(projectId);
      }

      // Phase 3: Generate embeddings
      let embeddingResult = { embeddingsCreated: 0 };
      if (enableEmbeddings && chunkResult.chunksCreated > 0) {
        this.logger.info('Phase 3: Generating embeddings...');
        embeddingResult = await this.generateProjectEmbeddings(projectId);
      }

      // Phase 4: Build indexes and caches
      this.logger.info('Phase 4: Building indexes...');
      await symbolicIndex.rebuildIndex(projectId);

      const finalResult = {
        phase1: graphResult,
        phase2: chunkResult,
        phase3: embeddingResult,
        statistics: await this.getProjectStatistics(projectId),
        completedAt: new Date().toISOString()
      };

      this.logger.info('Full knowledge graph build completed', finalResult.statistics);
      return finalResult;
    } catch (error) {
      this.logger.error('Full graph build failed', { error: error.message, projectId });
      throw error;
    }
  }

  /**
   * Create semantic chunks for project
   */
  async createSemanticChunks(projectId) {
    try {
      // Get all nodes for project
      const nodes = await graphStore.findNodesByType(null, projectId, 10000);
      const symbolNodes = nodes.filter(node => node.type !== 'File');

      let totalChunks = 0;
      const chunkBatches = [];

      // Process nodes in batches
      const batchSize = 50;
      for (let i = 0; i < symbolNodes.length; i += batchSize) {
        const batch = symbolNodes.slice(i, i + batchSize);
        
        for (const node of batch) {
          try {
            // Create extraction-like object for chunking
            const mockExtraction = {
              filePath: node.path,
              language: node.language,
              nodes: [node],
              references: [],
              content: node.metadata?.signature || ''
            };

            const chunks = await this.semanticChunker.createChunks(mockExtraction);
            
            // Store chunks in database
            for (const chunk of chunks) {
              const storedChunk = await enhancedDb.insert('code_chunks', {
                node_id: node.id,
                content: chunk.content,
                chunk_type: chunk.chunk_type,
                language: chunk.language
              });
              
              chunkBatches.push(storedChunk);
              totalChunks++;
            }
          } catch (error) {
            this.logger.warn(`Failed to create chunks for node ${node.name}:`, error.message);
          }
        }

        // Emit progress
        this.emit('chunkingProgress', {
          projectId,
          progress: ((i + batchSize) / symbolNodes.length) * 100,
          processed: Math.min(i + batchSize, symbolNodes.length),
          total: symbolNodes.length
        });
      }

      this.logger.info('Semantic chunking completed', { projectId, chunksCreated: totalChunks });
      return { chunksCreated: totalChunks, chunks: chunkBatches };
    } catch (error) {
      this.logger.error('Semantic chunking failed', { error: error.message, projectId });
      throw error;
    }
  }

  /**
   * Generate embeddings for project
   */
  async generateProjectEmbeddings(projectId) {
    try {
      // Get all chunks for project
      const chunks = await enhancedDb.query(`
        SELECT cc.*
        FROM code_chunks cc
        JOIN graph_nodes gn ON cc.node_id = gn.id
        WHERE gn.project_id = $1
      `, [projectId]);

      if (chunks.rows.length === 0) {
        this.logger.info('No chunks found for embedding generation', { projectId });
        return { embeddingsCreated: 0 };
      }

      // Generate embeddings
      const embeddings = await embeddingService.generateChunkEmbeddings(chunks.rows);

      this.logger.info('Embedding generation completed', { 
        projectId, 
        embeddingsCreated: embeddings.length 
      });

      return { embeddingsCreated: embeddings.length };
    } catch (error) {
      this.logger.error('Embedding generation failed', { error: error.message, projectId });
      throw error;
    }
  }

  /**
   * Query knowledge graph with AI context
   */
  async queryWithContext(query, projectId = null, options = {}) {
    try {
      if (!this.isInitialized) {
        throw new Error('CKG service not initialized');
      }

      // Build context using context builder
      const context = await contextBuilder.buildContext(query, {
        projectId,
        ...options
      });

      // Get additional graph insights
      const graphInsights = await this.getGraphInsights(query, projectId);

      return {
        query,
        context,
        insights: graphInsights,
        metadata: {
          projectId,
          generatedAt: new Date().toISOString(),
          tokenCount: context.metadata?.estimatedTokens || 0
        }
      };
    } catch (error) {
      this.logger.error('Query with context failed', { error: error.message, query });
      throw error;
    }
  }

  /**
   * Get graph insights for query
   */
  async getGraphInsights(query, projectId) {
    try {
      const insights = {
        symbolMatches: [],
        dependencies: [],
        hotspots: [],
        suggestions: []
      };

      // Find symbol matches
      const symbolNames = contextBuilder.extractSymbolNames(query);
      for (const symbolName of symbolNames.slice(0, 3)) {
        const impact = await symbolicIndex.analyzeSymbolImpact(symbolName, projectId);
        if (impact.symbol) {
          insights.symbolMatches.push(impact);
        }
      }

      // Get dependency information
      if (projectId) {
        const depGraph = await graphStore.getDependencyGraph(projectId, 2);
        insights.dependencies = depGraph.slice(0, 10);
      }

      // Find hotspots (most connected nodes)
      if (projectId) {
        const hotspots = await graphStore.getMostConnectedNodes(projectId, 5);
        insights.hotspots = hotspots;
      }

      // Generate suggestions based on graph analysis
      insights.suggestions = await this.generateSuggestions(query, insights, projectId);

      return insights;
    } catch (error) {
      this.logger.error('Failed to get graph insights', { error: error.message, query });
      return {
        symbolMatches: [],
        dependencies: [],
        hotspots: [],
        suggestions: []
      };
    }
  }

  /**
   * Generate suggestions based on graph analysis
   */
  async generateSuggestions(query, insights, projectId) {
    const suggestions = [];

    try {
      // Suggest based on unused exports
      if (projectId) {
        const unusedExports = await symbolicIndex.findUnusedExports(projectId);
        if (unusedExports.length > 0) {
          suggestions.push({
            type: 'cleanup',
            message: `Found ${unusedExports.length} unused exports that could be removed`,
            action: 'Review and remove unused exports to reduce bundle size',
            priority: 'medium'
          });
        }
      }

      // Suggest based on missing imports
      const symbolMatches = insights.symbolMatches;
      if (symbolMatches.length > 0) {
        for (const match of symbolMatches) {
          if (match.symbol && match.impact.referenceCount === 0) {
            suggestions.push({
              type: 'usage',
              message: `Symbol '${match.symbol.name}' is defined but never used`,
              action: 'Consider removing if no longer needed',
              priority: 'low'
            });
          }
        }
      }

      // Suggest based on hotspots
      if (insights.hotspots.length > 0) {
        const topHotspot = insights.hotspots[0];
        if (topHotspot.connection_count > 20) {
          suggestions.push({
            type: 'architecture',
            message: `'${topHotspot.name}' has many connections (${topHotspot.connection_count})`,
            action: 'Consider if this indicates tight coupling that should be refactored',
            priority: 'medium'
          });
        }
      }

      // Suggest based on circular dependencies
      if (projectId) {
        const circular = await graphStore.findCircularDependencies(projectId);
        if (circular.length > 0) {
          suggestions.push({
            type: 'architecture',
            message: `Found ${circular.length} circular dependency cycles`,
            action: 'Review and break circular dependencies to improve maintainability',
            priority: 'high'
          });
        }
      }

      return suggestions;
    } catch (error) {
      this.logger.error('Failed to generate suggestions', { error: error.message });
      return suggestions;
    }
  }

  /**
   * Get comprehensive project statistics
   */
  async getProjectStatistics(projectId) {
    try {
      const [
        graphStats,
        embeddingStats,
        connectivity,
        symbolicStats
      ] = await Promise.all([
        graphStore.getGraphStats(projectId),
        embeddingService.getEmbeddingStats(projectId),
        graphStore.analyzeConnectivity(projectId),
        symbolicIndex.getStats()
      ]);

      return {
        graph: graphStats,
        embeddings: embeddingStats,
        connectivity,
        symbolic: symbolicStats,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Failed to get project statistics', { error: error.message, projectId });
      throw error;
    }
  }

  /**
   * Update graph for file change
   */
  async updateFileInGraph(filePath, projectId, changeType = 'modified') {
    try {
      this.logger.info('Updating file in graph', { filePath, projectId, changeType });

      if (changeType === 'deleted') {
        await incrementalIndexer.removeFileFromGraph(filePath, projectId);
      } else {
        await incrementalIndexer.updateFileInGraph(filePath, projectId);
      }

      this.emit('fileUpdated', { filePath, projectId, changeType });
    } catch (error) {
      this.logger.error('Failed to update file in graph', { error: error.message, filePath, projectId });
      throw error;
    }
  }

  /**
   * Search across the knowledge graph
   */
  async search(query, projectId = null, options = {}) {
    try {
      const {
        includeSymbolic = true,
        includeSemantic = true,
        includeTextSearch = true,
        limit = 20
      } = options;

      const results = {
        symbolic: [],
        semantic: [],
        textSearch: [],
        combined: []
      };

      // Symbolic search
      if (includeSymbolic) {
        results.symbolic = await symbolicIndex.searchSymbols(query, projectId, { limit });
      }

      // Semantic search
      if (includeSemantic) {
        results.semantic = await embeddingService.findSimilarChunks(query, projectId, limit);
      }

      // Text search
      if (includeTextSearch) {
        results.textSearch = await enhancedDb.query(
          'SELECT * FROM manito_dev.search_code_chunks($1, $2, NULL, NULL, $3)',
          [query, projectId, limit]
        );
        results.textSearch = results.textSearch.rows;
      }

      // Combine and rank results
      results.combined = await this.combineSearchResults(
        results.symbolic,
        results.semantic,
        results.textSearch,
        query
      );

      return results;
    } catch (error) {
      this.logger.error('CKG search failed', { error: error.message, query, projectId });
      throw error;
    }
  }

  /**
   * Combine and rank search results
   */
  async combineSearchResults(symbolic, semantic, textSearch, query) {
    try {
      const combined = [];
      const seen = new Set();

      // Add symbolic results (highest priority)
      symbolic.forEach(result => {
        const key = `${result.name}:${result.type}:${result.path}`;
        if (!seen.has(key)) {
          combined.push({
            ...result,
            source: 'symbolic',
            score: (result.name_similarity || 0.5) * 0.8 + 0.2
          });
          seen.add(key);
        }
      });

      // Add semantic results
      semantic.forEach(result => {
        const key = `${result.node_name}:${result.node_type}:${result.node_path}`;
        if (!seen.has(key)) {
          combined.push({
            name: result.node_name,
            type: result.node_type,
            path: result.node_path,
            content: result.content,
            source: 'semantic',
            score: (result.similarity || 0.5) * 0.7 + 0.1
          });
          seen.add(key);
        }
      });

      // Add text search results
      textSearch.forEach(result => {
        const key = `${result.node_name}:${result.node_type}:${result.node_path}`;
        if (!seen.has(key)) {
          combined.push({
            name: result.node_name,
            type: result.node_type,
            path: result.node_path,
            content: result.content,
            source: 'text',
            score: (result.rank || 0.3) * 0.6 + 0.1
          });
          seen.add(key);
        }
      });

      // Sort by score
      return combined.sort((a, b) => b.score - a.score);
    } catch (error) {
      this.logger.error('Failed to combine search results', { error: error.message });
      return [];
    }
  }

  /**
   * Get AI-enhanced analysis
   */
  async getAIAnalysis(query, projectId = null) {
    try {
      // Build context for AI
      const contextData = await this.queryWithContext(query, projectId);

      // Format context for AI consumption
      const aiContext = this.formatContextForAI(contextData.context);

      return {
        query,
        context: aiContext,
        insights: contextData.insights,
        suggestions: contextData.insights.suggestions,
        metadata: contextData.metadata
      };
    } catch (error) {
      this.logger.error('AI analysis failed', { error: error.message, query });
      throw error;
    }
  }

  /**
   * Format context for AI consumption
   */
  formatContextForAI(context) {
    let formattedContext = '';

    // Add file headers
    if (context.fileHeaders.length > 0) {
      formattedContext += '## File Context\n';
      context.fileHeaders.forEach(header => {
        formattedContext += `${header.content}\n\n`;
      });
    }

    // Add target symbols
    if (context.targetSymbols.length > 0) {
      formattedContext += '## Relevant Symbols\n';
      context.targetSymbols.forEach(symbol => {
        formattedContext += `${symbol.content}\n\n---\n\n`;
      });
    }

    // Add callers
    if (context.nearestCallers.length > 0) {
      formattedContext += '## Related Functions\n';
      context.nearestCallers.forEach(caller => {
        formattedContext += `${caller.content}\n\n`;
      });
    }

    // Add imports
    if (context.relatedImports.length > 0) {
      formattedContext += '## Imports & Exports\n';
      context.relatedImports.forEach(imp => {
        formattedContext += `${imp.content}\n`;
      });
      formattedContext += '\n';
    }

    // Add diagnostics
    if (context.diagnostics.length > 0) {
      formattedContext += '## Issues & Diagnostics\n';
      context.diagnostics.forEach(diag => {
        formattedContext += `${diag.severity.toUpperCase()}: ${diag.message} (${diag.node_path}:${diag.line})\n`;
      });
      formattedContext += '\n';
    }

    // Add examples
    if (context.examples.length > 0) {
      formattedContext += '## Usage Examples\n';
      context.examples.forEach(example => {
        formattedContext += `${example.content}\n\n`;
      });
    }

    return formattedContext.trim();
  }

  /**
   * Health check for entire CKG system
   */
  async health() {
    try {
      const healthChecks = await Promise.all([
        graphStore.health(),
        symbolicIndex.health(),
        embeddingService.health(),
        contextBuilder.health(),
        incrementalIndexer.health()
      ]);

      const allHealthy = healthChecks.every(check => check.status === 'ok');
      const someHealthy = healthChecks.some(check => check.status === 'ok');

      return {
        status: allHealthy ? 'ok' : someHealthy ? 'degraded' : 'error',
        message: allHealthy ? 'CKG system is fully operational' : 
                someHealthy ? 'CKG system is partially operational' : 
                'CKG system has critical issues',
        components: {
          graphStore: healthChecks[0],
          symbolicIndex: healthChecks[1],
          embeddingService: healthChecks[2],
          contextBuilder: healthChecks[3],
          incrementalIndexer: healthChecks[4]
        },
        statistics: this.getServiceStats()
      };
    } catch (error) {
      return {
        status: 'error',
        message: `CKG health check failed: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Get CKG service status
   */
  async getStatus() {
    try {
      const health = await this.health();
      const stats = this.getServiceStats();
      
      return {
        initialized: this.isInitialized,
        health: health,
        statistics: stats,
        uptime: process.uptime(),
        version: '1.0.0',
        features: {
          symbolicIndexing: true,
          semanticChunking: true,
          embeddings: true,
          contextBuilding: true,
          incrementalIndexing: true
        }
      };
    } catch (error) {
      return {
        initialized: this.isInitialized,
        health: { status: 'error', message: error.message },
        statistics: {},
        uptime: process.uptime(),
        version: '1.0.0',
        features: {
          symbolicIndexing: false,
          semanticChunking: false,
          embeddings: false,
          contextBuilding: false,
          incrementalIndexing: false
        }
      };
    }
  }

  /**
   * Get service statistics
   */
  getServiceStats() {
    return {
      isInitialized: this.isInitialized,
      components: {
        graphStore: graphStore.getStats?.() || {},
        symbolicIndex: symbolicIndex.getStats(),
        embeddingService: embeddingService.getStats(),
        contextBuilder: contextBuilder.getStats()
      }
    };
  }

  /**
   * Cleanup and shutdown
   */
  async cleanup() {
    try {
      this.logger.info('Cleaning up CKG service...');

      // Stop incremental indexing
      await incrementalIndexer.cleanup?.();

      // Clear caches
      symbolicIndex.clearCache();
      embeddingService.clearCache();
      contextBuilder.clearCache();

      this.isInitialized = false;
      this.logger.info('CKG service cleanup completed');
    } catch (error) {
      this.logger.error('CKG cleanup failed', { error: error.message });
      throw error;
    }
  }
}

export default new CKGService();
