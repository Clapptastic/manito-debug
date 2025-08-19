/**
 * Context Builder for Code Knowledge Graph
 * Assembles precise context for AI queries using symbolic + semantic retrieval
 */

import symbolicIndex from './symbolic-index.js';
import embeddingService from './embedding-service.js';
import graphStore from './graph-store.js';
import enhancedDb from './enhancedDatabase.js';
import { EventEmitter } from 'events';
import winston from 'winston';

export class ContextBuilder extends EventEmitter {
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

    this.contextCache = new Map();
    this.maxContextSize = 8000; // Max tokens for context window
    this.retrievalWeights = {
      symbolic: 0.6,
      semantic: 0.4,
      recency: 0.1,
      relevance: 0.8,
      errors: 0.2
    };
  }

  /**
   * Build context for AI query
   */
  async buildContext(query, options = {}) {
    try {
      const {
        projectId = null,
        maxTokens = this.maxContextSize,
        includeSymbolic = true,
        includeSemantic = true,
        includeErrors = true,
        includeExamples = true
      } = options;

      this.logger.info('Building context for query', { query: query.substring(0, 100), projectId });

      // Phase 1: Symbolic pre-filter
      let symbolicResults = [];
      if (includeSymbolic) {
        symbolicResults = await this.symbolicPrefilter(query, projectId);
      }

      // Phase 2: Semantic expansion
      let semanticResults = [];
      if (includeSemantic) {
        semanticResults = await this.semanticExpand(query, projectId, symbolicResults);
      }

      // Phase 3: Rerank results
      const rankedResults = await this.rerank(symbolicResults, semanticResults, query);

      // Phase 4: Assemble bounded context
      const context = await this.assembleContext(rankedResults, {
        maxTokens,
        includeErrors,
        includeExamples,
        projectId
      });

      this.emit('contextBuilt', {
        query: query.substring(0, 100),
        projectId,
        symbolicCount: symbolicResults.length,
        semanticCount: semanticResults.length,
        finalTokens: context.metadata.estimatedTokens
      });

      return context;
    } catch (error) {
      this.logger.error('Failed to build context', { error: error.message, query: query.substring(0, 100) });
      throw error;
    }
  }

  /**
   * Phase 1: Symbolic pre-filter for exact matches
   */
  async symbolicPrefilter(query, projectId) {
    try {
      const results = [];

      // Extract potential symbol names from query
      const symbolNames = this.extractSymbolNames(query);

      for (const symbolName of symbolNames) {
        // Find definitions
        const definitions = await symbolicIndex.findDefinition(symbolName, null, projectId);
        results.push(...definitions.map(def => ({
          ...def,
          source: 'symbolic',
          type: 'definition',
          relevance: 1.0
        })));

        // Find references
        const references = await symbolicIndex.findReferences(symbolName, projectId, false);
        results.push(...references.slice(0, 5).map(ref => ({ // Limit references
          ...ref,
          source: 'symbolic',
          type: 'reference',
          relevance: 0.8
        })));
      }

      // Search for symbols by name similarity
      const searchResults = await symbolicIndex.searchSymbols(query, projectId, {
        fuzzy: true,
        limit: 10
      });
      
      results.push(...searchResults.map(result => ({
        ...result,
        source: 'symbolic',
        type: 'search',
        relevance: result.name_similarity || 0.5
      })));

      return this.deduplicateResults(results);
    } catch (error) {
      this.logger.error('Symbolic pre-filter failed', { error: error.message, query });
      return [];
    }
  }

  /**
   * Phase 2: Semantic expansion using embeddings
   */
  async semanticExpand(query, projectId, symbolicResults = []) {
    try {
      // Find semantically similar chunks
      const semanticResults = await embeddingService.findSimilarChunks(query, projectId, 20);

      // Enhance with additional context
      const enhancedResults = [];
      
      for (const result of semanticResults) {
        // Get node information
        const nodeInfo = await graphStore.findNode(result.node_name, result.node_type, projectId);
        
        if (nodeInfo) {
          enhancedResults.push({
            ...result,
            source: 'semantic',
            type: 'similar',
            relevance: result.similarity || 0.5,
            nodeInfo
          });
        }
      }

      // Add related symbols from symbolic results
      for (const symbolicResult of symbolicResults.slice(0, 5)) {
        if (symbolicResult.node_id) {
          const neighborhood = await symbolicIndex.getSymbolNeighborhood(
            symbolicResult.name, 
            projectId, 
            1 // Single degree
          );
          
          enhancedResults.push(...neighborhood.neighborhood.map(neighbor => ({
            ...neighbor,
            source: 'semantic',
            type: 'related',
            relevance: 0.6
          })));
        }
      }

      return this.deduplicateResults(enhancedResults);
    } catch (error) {
      this.logger.error('Semantic expansion failed', { error: error.message, query });
      return [];
    }
  }

  /**
   * Phase 3: Rerank results by relevance
   */
  async rerank(symbolicResults, semanticResults, query) {
    try {
      const allResults = [...symbolicResults, ...semanticResults];
      
      // Calculate composite scores
      const scoredResults = allResults.map(result => {
        let score = 0;

        // Base relevance score
        score += (result.relevance || 0.5) * this.retrievalWeights.relevance;

        // Source weight (symbolic vs semantic)
        if (result.source === 'symbolic') {
          score += this.retrievalWeights.symbolic;
        } else {
          score += this.retrievalWeights.semantic;
        }

        // Recency bonus (newer symbols ranked higher)
        const ageInDays = this.getAgeInDays(result.created_at || result.updated_at);
        const recencyScore = Math.max(0, 1 - (ageInDays / 365)); // Decay over year
        score += recencyScore * this.retrievalWeights.recency;

        // Error presence (symbols with errors get lower priority)
        if (result.hasErrors) {
          score -= this.retrievalWeights.errors;
        }

        // Query term matching bonus
        const queryTerms = query.toLowerCase().split(/\s+/);
        const nameMatches = queryTerms.filter(term => 
          (result.name || '').toLowerCase().includes(term)
        ).length;
        score += (nameMatches / queryTerms.length) * 0.2;

        return {
          ...result,
          compositeScore: Math.max(0, Math.min(1, score))
        };
      });

      // Sort by composite score
      return scoredResults.sort((a, b) => b.compositeScore - a.compositeScore);
    } catch (error) {
      this.logger.error('Reranking failed', { error: error.message });
      return [...symbolicResults, ...semanticResults];
    }
  }

  /**
   * Phase 4: Assemble bounded context window
   */
  async assembleContext(rankedResults, options) {
    try {
      const {
        maxTokens,
        includeErrors,
        includeExamples,
        projectId
      } = options;

      let currentTokens = 0;
      const contextSections = {
        fileHeaders: [],
        targetSymbols: [],
        nearestCallers: [],
        relatedImports: [],
        diagnostics: [],
        examples: [],
        metadata: {}
      };

      // Add file headers
      const fileHeaders = await this.getFileHeaders(rankedResults, projectId);
      for (const header of fileHeaders.slice(0, 3)) { // Max 3 file headers
        const tokens = this.estimateTokens(header.content);
        if (currentTokens + tokens <= maxTokens * 0.1) { // Max 10% for headers
          contextSections.fileHeaders.push(header);
          currentTokens += tokens;
        }
      }

      // Add target symbols (highest priority)
      for (const result of rankedResults.slice(0, 10)) {
        const symbolContext = await this.getSymbolContext(result);
        const tokens = this.estimateTokens(symbolContext.content);
        
        if (currentTokens + tokens <= maxTokens * 0.6) { // Max 60% for target symbols
          contextSections.targetSymbols.push(symbolContext);
          currentTokens += tokens;
        } else {
          break; // Stop if we would exceed token limit
        }
      }

      // Add callers and callees
      const callers = await this.getNearestCallers(rankedResults.slice(0, 5), projectId);
      for (const caller of callers.slice(0, 5)) {
        const tokens = this.estimateTokens(caller.content);
        if (currentTokens + tokens <= maxTokens * 0.15) { // Max 15% for callers
          contextSections.nearestCallers.push(caller);
          currentTokens += tokens;
        }
      }

      // Add related imports
      const imports = await this.getRelatedImports(rankedResults, projectId);
      for (const imp of imports.slice(0, 10)) {
        const tokens = this.estimateTokens(imp.content);
        if (currentTokens + tokens <= maxTokens * 0.1) { // Max 10% for imports
          contextSections.relatedImports.push(imp);
          currentTokens += tokens;
        }
      }

      // Add diagnostics if requested
      if (includeErrors) {
        const diagnostics = await this.getRelevantDiagnostics(rankedResults, projectId);
        for (const diagnostic of diagnostics.slice(0, 5)) {
          const tokens = this.estimateTokens(diagnostic.message);
          if (currentTokens + tokens <= maxTokens * 0.05) { // Max 5% for diagnostics
            contextSections.diagnostics.push(diagnostic);
            currentTokens += tokens;
          }
        }
      }

      // Add examples if requested
      if (includeExamples) {
        const examples = await this.getUsageExamples(rankedResults, projectId);
        for (const example of examples.slice(0, 3)) {
          const tokens = this.estimateTokens(example.content);
          if (currentTokens + tokens <= maxTokens * 0.1) { // Max 10% for examples
            contextSections.examples.push(example);
            currentTokens += tokens;
          }
        }
      }

      // Add metadata
      contextSections.metadata = {
        query,
        projectId,
        estimatedTokens: currentTokens,
        maxTokens,
        resultCount: rankedResults.length,
        assembledAt: new Date().toISOString(),
        weights: this.retrievalWeights
      };

      return contextSections;
    } catch (error) {
      this.logger.error('Failed to assemble context', { error: error.message });
      throw error;
    }
  }

  /**
   * Extract symbol names from query
   */
  extractSymbolNames(query) {
    // Extract potential symbol names using common patterns
    const patterns = [
      /\b[A-Z][a-zA-Z0-9]*\b/g, // PascalCase (classes, types)
      /\b[a-z][a-zA-Z0-9]*\b/g, // camelCase (functions, variables)
      /\b[a-z_][a-z0-9_]*\b/g,  // snake_case (Python, etc.)
      /\b[A-Z_][A-Z0-9_]*\b/g   // CONSTANT_CASE
    ];

    const symbolNames = new Set();
    
    for (const pattern of patterns) {
      const matches = query.match(pattern);
      if (matches) {
        matches.forEach(match => {
          if (match.length > 2 && !this.isCommonWord(match)) {
            symbolNames.add(match);
          }
        });
      }
    }

    return Array.from(symbolNames);
  }

  /**
   * Check if word is common English word (to filter out)
   */
  isCommonWord(word) {
    const commonWords = new Set([
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
      'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before',
      'after', 'above', 'below', 'between', 'among', 'is', 'are', 'was',
      'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does',
      'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
      'can', 'this', 'that', 'these', 'those', 'what', 'which', 'who',
      'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few',
      'more', 'most', 'other', 'some', 'such', 'only', 'own', 'same', 'so',
      'than', 'too', 'very', 'just', 'now', 'here', 'there', 'then'
    ]);

    return commonWords.has(word.toLowerCase());
  }

  /**
   * Get file headers for context
   */
  async getFileHeaders(results, projectId) {
    try {
      const filePaths = [...new Set(results.map(r => r.path || r.node_path).filter(Boolean))];
      const headers = [];

      for (const filePath of filePaths.slice(0, 5)) {
        try {
          // Get file node
          const fileNode = await graphStore.findNode(filePath.split('/').pop(), 'File', projectId);
          
          if (fileNode) {
            headers.push({
              filePath,
              content: `File: ${filePath}\nLanguage: ${fileNode.language}\nSymbols: ${fileNode.metadata?.symbolCounts || 'unknown'}`,
              type: 'file-header'
            });
          }
        } catch (error) {
          this.logger.warn(`Failed to get header for ${filePath}:`, error.message);
        }
      }

      return headers;
    } catch (error) {
      this.logger.error('Failed to get file headers', { error: error.message });
      return [];
    }
  }

  /**
   * Get symbol context with signature and documentation
   */
  async getSymbolContext(result) {
    try {
      // Get associated code chunk
      const chunks = await enhancedDb.query(`
        SELECT cc.content, cc.chunk_type
        FROM code_chunks cc
        WHERE cc.node_id = $1
        ORDER BY 
          CASE cc.chunk_type 
            WHEN 'symbol' THEN 1 
            WHEN 'function' THEN 2 
            ELSE 3 
          END
        LIMIT 1
      `, [result.node_id || result.id]);

      if (chunks.rows.length > 0) {
        return {
          symbolName: result.name,
          symbolType: result.type,
          content: chunks.rows[0].content,
          chunkType: chunks.rows[0].chunk_type,
          filePath: result.path,
          relevance: result.relevance || result.compositeScore || 0.5
        };
      }

      // Fallback to basic symbol info
      return {
        symbolName: result.name,
        symbolType: result.type,
        content: `${result.type}: ${result.name}\nFile: ${result.path}`,
        chunkType: 'basic',
        filePath: result.path,
        relevance: result.relevance || 0.3
      };
    } catch (error) {
      this.logger.warn('Failed to get symbol context', { error: error.message, symbol: result.name });
      return null;
    }
  }

  /**
   * Get nearest callers and callees
   */
  async getNearestCallers(results, projectId) {
    try {
      const callers = [];

      for (const result of results) {
        if (result.node_id) {
          // Find incoming edges (callers)
          const incomingEdges = await graphStore.getNeighbors(result.node_id, 'calls', 'incoming');
          
          for (const edge of incomingEdges.slice(0, 3)) {
            callers.push({
              callerName: edge.name,
              callerType: edge.type,
              callerPath: edge.path,
              relationship: edge.relationship,
              content: `${edge.type}: ${edge.name} calls ${result.name}\nFile: ${edge.path}`,
              metadata: edge.metadata || {}
            });
          }
        }
      }

      return callers;
    } catch (error) {
      this.logger.error('Failed to get nearest callers', { error: error.message });
      return [];
    }
  }

  /**
   * Get related imports and exports
   */
  async getRelatedImports(results, projectId) {
    try {
      const imports = [];
      const filePaths = [...new Set(results.map(r => r.path || r.node_path).filter(Boolean))];

      for (const filePath of filePaths.slice(0, 5)) {
        // Find imports for this file
        const fileImports = await symbolicIndex.findImporters(filePath, projectId);
        
        imports.push(...fileImports.slice(0, 3).map(imp => ({
          importerPath: imp.importer_path,
          importedPath: imp.imported_path,
          content: `Import: ${imp.imported_name} from ${imp.imported_path}\nUsed in: ${imp.importer_path}`,
          metadata: imp.import_metadata || {}
        })));

        // Find exports from this file
        const fileExports = await symbolicIndex.findExports(filePath, projectId);
        
        imports.push(...fileExports.slice(0, 3).map(exp => ({
          exportName: exp.name,
          exportType: exp.type,
          exportPath: filePath,
          content: `Export: ${exp.type} ${exp.name}\nFrom: ${filePath}`,
          metadata: exp.metadata || {}
        })));
      }

      return imports;
    } catch (error) {
      this.logger.error('Failed to get related imports', { error: error.message });
      return [];
    }
  }

  /**
   * Get relevant diagnostics (errors, warnings)
   */
  async getRelevantDiagnostics(results, projectId) {
    try {
      const nodeIds = results.map(r => r.node_id || r.id).filter(Boolean);
      
      if (nodeIds.length === 0) return [];

      const query = `
        SELECT 
          d.severity,
          d.message,
          d.line,
          d.column,
          d.source,
          d.rule,
          d.fix_suggestion,
          gn.name as node_name,
          gn.path as node_path
        FROM diagnostics d
        JOIN graph_nodes gn ON d.node_id = gn.id
        WHERE d.node_id = ANY($1)
        ORDER BY 
          CASE d.severity 
            WHEN 'error' THEN 1 
            WHEN 'warning' THEN 2 
            ELSE 3 
          END,
          d.created_at DESC
        LIMIT 10
      `;

      const result = await enhancedDb.query(query, [nodeIds]);
      return result.rows;
    } catch (error) {
      this.logger.error('Failed to get relevant diagnostics', { error: error.message });
      return [];
    }
  }

  /**
   * Get usage examples
   */
  async getUsageExamples(results, projectId) {
    try {
      const examples = [];

      for (const result of results.slice(0, 3)) {
        if (result.name) {
          const references = await symbolicIndex.findReferences(result.name, projectId, false);
          
          for (const ref of references.slice(0, 2)) {
            examples.push({
              symbolName: result.name,
              usageType: ref.reference_type,
              content: ref.context || `Usage of ${result.name} in ${ref.file_path}:${ref.line}`,
              filePath: ref.file_path,
              line: ref.line
            });
          }
        }
      }

      return examples;
    } catch (error) {
      this.logger.error('Failed to get usage examples', { error: error.message });
      return [];
    }
  }

  /**
   * Deduplicate results by node ID or name
   */
  deduplicateResults(results) {
    const seen = new Set();
    const deduplicated = [];

    for (const result of results) {
      const key = result.node_id || result.id || `${result.name}:${result.type}:${result.path}`;
      
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(result);
      }
    }

    return deduplicated;
  }

  /**
   * Estimate token count for text
   */
  estimateTokens(text) {
    // Rough estimation: 1 token ≈ 4 characters for code
    return Math.ceil(text.length / 4);
  }

  /**
   * Calculate age in days
   */
  getAgeInDays(dateString) {
    if (!dateString) return 365; // Default to old if no date
    
    const date = new Date(dateString);
    const now = new Date();
    return Math.floor((now - date) / (1000 * 60 * 60 * 24));
  }

  /**
   * Clear context cache
   */
  clearCache() {
    this.contextCache.clear();
    this.logger.info('Context cache cleared');
  }

  /**
   * Get context statistics
   */
  getStats() {
    return {
      cacheSize: this.contextCache.size,
      maxContextSize: this.maxContextSize,
      retrievalWeights: this.retrievalWeights
    };
  }

  /**
   * Health check
   */
  async health() {
    try {
      // Test basic functionality
      const testQuery = 'function test';
      const context = await this.buildContext(testQuery, { maxTokens: 1000 });

      return {
        status: 'ok',
        message: 'Context builder is healthy',
        statistics: this.getStats(),
        testResult: {
          query: testQuery,
          contextSections: Object.keys(context).length,
          estimatedTokens: context.metadata?.estimatedTokens || 0
        }
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Context builder health check failed: ${error.message}`,
        error: error.message
      };
    }
  }
}

export default new ContextBuilder();
