/**
 * Symbolic Index Service for Code Knowledge Graph
 * Provides exact symbol lookups, definitions, and references
 */

import graphStore from './graph-store.js';
import enhancedDb from './enhancedDatabase.js';
import { EventEmitter } from 'events';
import winston from 'winston';

export class SymbolicIndex extends EventEmitter {
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

    this.cache = new Map();
    this.indexStats = {
      totalSymbols: 0,
      totalReferences: 0,
      cacheHits: 0,
      cacheMisses: 0,
      lastIndexed: null
    };
  }

  /**
   * Find symbol definition
   */
  async findDefinition(symbolName, filePath = null, projectId = null) {
    try {
      const cacheKey = `def:${symbolName}:${projectId}:${filePath}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      // Search for symbol definition in graph
      const definitions = await graphStore.findSymbolDefinitions(symbolName, projectId);
      
      // If filePath provided, prefer definitions in same file or nearby
      let result = definitions;
      if (filePath && definitions.length > 1) {
        const sameFile = definitions.filter(def => def.path === filePath);
        if (sameFile.length > 0) {
          result = sameFile;
        }
      }

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      this.logger.error('Failed to find definition', { error: error.message, symbolName, filePath });
      throw error;
    }
  }

  /**
   * Find all references to a symbol
   */
  async findReferences(symbolName, projectId = null, includeDefinition = true) {
    try {
      const cacheKey = `refs:${symbolName}:${projectId}:${includeDefinition}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      const references = await graphStore.findSymbolReferences(symbolName, projectId);
      
      let result = references;
      if (includeDefinition) {
        const definitions = await this.findDefinition(symbolName, null, projectId);
        result = [...definitions, ...references];
      }

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      this.logger.error('Failed to find references', { error: error.message, symbolName, projectId });
      throw error;
    }
  }

  /**
   * Find all imports of a module
   */
  async findImporters(modulePath, projectId = null) {
    try {
      const cacheKey = `importers:${modulePath}:${projectId}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      // Find all import edges pointing to this module
      const query = `
        SELECT 
          gn_from.name as importer_name,
          gn_from.path as importer_path,
          gn_from.type as importer_type,
          gn_to.name as imported_name,
          gn_to.path as imported_path,
          ge.metadata as import_metadata
        FROM graph_edges ge
        JOIN graph_nodes gn_from ON ge.from_node_id = gn_from.id
        JOIN graph_nodes gn_to ON ge.to_node_id = gn_to.id
        WHERE 
          ge.relationship = 'imports'
          AND gn_to.path = $1
          ${projectId ? 'AND gn_from.project_id = $2' : ''}
        ORDER BY gn_from.path
      `;

      const params = projectId ? [modulePath, projectId] : [modulePath];
      const result = await enhancedDb.query(query, params);

      this.setCache(cacheKey, result.rows);
      return result.rows;
    } catch (error) {
      this.logger.error('Failed to find importers', { error: error.message, modulePath, projectId });
      throw error;
    }
  }

  /**
   * Find all exports from a module
   */
  async findExports(modulePath, projectId = null) {
    try {
      const cacheKey = `exports:${modulePath}:${projectId}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      // Find all nodes that are exported from this module
      const query = `
        SELECT 
          gn.name,
          gn.type,
          gn.metadata,
          ge.metadata as export_metadata
        FROM graph_nodes gn
        JOIN graph_edges ge ON gn.id = ge.from_node_id
        WHERE 
          gn.path = $1
          AND ge.relationship = 'exports'
          ${projectId ? 'AND gn.project_id = $2' : ''}
        ORDER BY gn.name
      `;

      const params = projectId ? [modulePath, projectId] : [modulePath];
      const result = await enhancedDb.query(query, params);

      this.setCache(cacheKey, result.rows);
      return result.rows;
    } catch (error) {
      this.logger.error('Failed to find exports', { error: error.message, modulePath, projectId });
      throw error;
    }
  }

  /**
   * Find symbol usage patterns
   */
  async findUsagePatterns(symbolName, projectId = null) {
    try {
      const references = await this.findReferences(symbolName, projectId, false);
      
      // Analyze usage patterns
      const patterns = {
        totalUsages: references.length,
        fileUsage: new Map(),
        usageTypes: new Map(),
        hotspots: [],
        trends: []
      };

      references.forEach(ref => {
        // Count usage per file
        const fileCount = patterns.fileUsage.get(ref.file_path) || 0;
        patterns.fileUsage.set(ref.file_path, fileCount + 1);

        // Count usage types
        const typeCount = patterns.usageTypes.get(ref.reference_type) || 0;
        patterns.usageTypes.set(ref.reference_type, typeCount + 1);
      });

      // Identify hotspots (files with high usage)
      patterns.hotspots = Array.from(patterns.fileUsage.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([file, count]) => ({ file, count }));

      return patterns;
    } catch (error) {
      this.logger.error('Failed to find usage patterns', { error: error.message, symbolName });
      throw error;
    }
  }

  /**
   * Find unused exports (dead code detection)
   */
  async findUnusedExports(projectId) {
    try {
      const query = `
        SELECT 
          gn.name,
          gn.path,
          gn.type,
          gn.metadata
        FROM graph_nodes gn
        WHERE 
          gn.project_id = $1
          AND gn.type IN ('Function', 'Class', 'Variable', 'Type', 'Interface')
          AND NOT EXISTS (
            SELECT 1 FROM symbol_references sr
            WHERE sr.symbol_node_id = gn.id
            AND sr.reference_type IN ('usage', 'call', 'reference')
          )
          AND EXISTS (
            SELECT 1 FROM graph_edges ge
            WHERE ge.from_node_id = gn.id
            AND ge.relationship = 'exports'
          )
        ORDER BY gn.path, gn.name
      `;

      const result = await enhancedDb.query(query, [projectId]);
      return result.rows;
    } catch (error) {
      this.logger.error('Failed to find unused exports', { error: error.message, projectId });
      throw error;
    }
  }

  /**
   * Find missing imports (symbols used but not imported)
   */
  async findMissingImports(filePath, projectId = null) {
    try {
      // Find all symbol references in the file
      const query = `
        SELECT DISTINCT
          sr.symbol_node_id,
          gn_symbol.name as symbol_name,
          gn_symbol.type as symbol_type,
          gn_symbol.path as symbol_path
        FROM symbol_references sr
        JOIN graph_nodes gn_ref ON sr.reference_node_id = gn_ref.id
        JOIN graph_nodes gn_symbol ON sr.symbol_node_id = gn_symbol.id
        WHERE 
          gn_ref.path = $1
          AND sr.reference_type IN ('usage', 'call', 'reference')
          AND gn_symbol.path != $1  -- External symbols only
          ${projectId ? 'AND gn_ref.project_id = $2' : ''}
          AND NOT EXISTS (
            SELECT 1 FROM graph_edges ge
            JOIN graph_nodes gn_file ON ge.from_node_id = gn_file.id
            WHERE 
              gn_file.path = $1
              AND ge.to_node_id = gn_symbol.id
              AND ge.relationship = 'imports'
          )
      `;

      const params = projectId ? [filePath, projectId] : [filePath];
      const result = await enhancedDb.query(query, params);

      return result.rows;
    } catch (error) {
      this.logger.error('Failed to find missing imports', { error: error.message, filePath });
      throw error;
    }
  }

  /**
   * Find type information for symbol
   */
  async findTypeInfo(symbolName, filePath = null, projectId = null) {
    try {
      const query = `
        SELECT 
          gn.name,
          gn.type,
          gn.metadata,
          gn.path
        FROM graph_nodes gn
        WHERE 
          gn.name = $1
          AND gn.type IN ('Type', 'Interface', 'Class')
          ${projectId ? 'AND gn.project_id = $2' : ''}
          ${filePath ? 'AND gn.path = $3' : ''}
        ORDER BY 
          CASE WHEN gn.path = $3 THEN 0 ELSE 1 END,
          gn.created_at DESC
      `;

      const params = [symbolName];
      if (projectId) params.push(projectId);
      if (filePath) params.push(filePath);

      const result = await enhancedDb.query(query, params);
      return result.rows;
    } catch (error) {
      this.logger.error('Failed to find type info', { error: error.message, symbolName });
      throw error;
    }
  }

  /**
   * Analyze symbol complexity and impact
   */
  async analyzeSymbolImpact(symbolName, projectId = null) {
    try {
      const definition = await this.findDefinition(symbolName, null, projectId);
      const references = await this.findReferences(symbolName, projectId, false);
      const usagePatterns = await this.findUsagePatterns(symbolName, projectId);

      return {
        symbol: definition[0] || null,
        impact: {
          referenceCount: references.length,
          fileSpread: usagePatterns.fileUsage.size,
          usageTypes: Object.fromEntries(usagePatterns.usageTypes),
          hotspots: usagePatterns.hotspots,
          complexity: this.calculateSymbolComplexity(definition[0], references)
        },
        recommendations: this.generateSymbolRecommendations(definition[0], references, usagePatterns)
      };
    } catch (error) {
      this.logger.error('Failed to analyze symbol impact', { error: error.message, symbolName });
      throw error;
    }
  }

  /**
   * Calculate symbol complexity based on usage
   */
  calculateSymbolComplexity(definition, references) {
    if (!definition) return 0;

    let complexity = 1; // Base complexity

    // Add complexity based on references
    complexity += Math.min(references.length * 0.1, 5);

    // Add complexity based on symbol type
    switch (definition.type) {
      case 'Class':
        complexity += 2;
        break;
      case 'Interface':
        complexity += 1.5;
        break;
      case 'Function':
        complexity += 1;
        break;
      default:
        complexity += 0.5;
    }

    // Add complexity based on metadata
    if (definition.metadata?.methods?.length > 0) {
      complexity += definition.metadata.methods.length * 0.2;
    }

    return Math.min(Math.round(complexity * 10) / 10, 10);
  }

  /**
   * Generate recommendations for symbol usage
   */
  generateSymbolRecommendations(definition, references, usagePatterns) {
    const recommendations = [];

    if (!definition) {
      recommendations.push({
        type: 'error',
        message: 'Symbol definition not found',
        action: 'Check if symbol is properly exported or imported'
      });
      return recommendations;
    }

    // High usage recommendations
    if (references.length > 50) {
      recommendations.push({
        type: 'performance',
        message: 'High usage symbol - consider optimization',
        action: 'Review performance and consider caching if appropriate'
      });
    }

    // Scattered usage recommendations
    if (usagePatterns.fileUsage.size > 20) {
      recommendations.push({
        type: 'architecture',
        message: 'Symbol used across many files',
        action: 'Consider if this indicates tight coupling or if it should be refactored'
      });
    }

    // No usage recommendations
    if (references.length === 0) {
      recommendations.push({
        type: 'cleanup',
        message: 'Unused symbol detected',
        action: 'Consider removing if no longer needed'
      });
    }

    return recommendations;
  }

  /**
   * Cache management
   */
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < 300000) { // 5 minutes TTL
      this.indexStats.cacheHits++;
      return cached.data;
    }
    this.indexStats.cacheMisses++;
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });

    // Limit cache size
    if (this.cache.size > 5000) {
      const oldestKey = Array.from(this.cache.keys())[0];
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    this.logger.info('Symbolic index cache cleared');
  }

  /**
   * Rebuild index for project
   */
  async rebuildIndex(projectId) {
    try {
      this.logger.info('Rebuilding symbolic index', { projectId });
      
      // Clear cache for this project
      for (const [key] of this.cache.entries()) {
        if (key.includes(`:${projectId}:`)) {
          this.cache.delete(key);
        }
      }

      // Update statistics
      const stats = await graphStore.getGraphStats(projectId);
      this.indexStats.totalSymbols = stats.totalNodes;
      this.indexStats.lastIndexed = new Date().toISOString();

      this.emit('indexRebuilt', { projectId, stats });
      this.logger.info('Symbolic index rebuilt', { projectId, stats });

      return stats;
    } catch (error) {
      this.logger.error('Failed to rebuild index', { error: error.message, projectId });
      throw error;
    }
  }

  /**
   * Get index statistics
   */
  getStats() {
    return {
      ...this.indexStats,
      cacheSize: this.cache.size,
      cacheHitRate: this.indexStats.cacheHits / (this.indexStats.cacheHits + this.indexStats.cacheMisses) || 0
    };
  }

  /**
   * Health check
   */
  async health() {
    try {
      // Test basic functionality
      const testSymbol = 'test_symbol_' + Date.now();
      const definitions = await this.findDefinition(testSymbol);
      
      return {
        status: 'ok',
        message: 'Symbolic index is healthy',
        statistics: this.getStats()
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Symbolic index health check failed: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Advanced symbol search with fuzzy matching
   */
  async searchSymbols(query, projectId = null, options = {}) {
    try {
      const {
        limit = 50,
        types = ['Function', 'Class', 'Variable', 'Type', 'Interface'],
        fuzzy = true,
        includeMetadata = true
      } = options;

      let searchQuery;
      let params = [];

      if (fuzzy) {
        // Fuzzy search using similarity
        searchQuery = `
          SELECT 
            gn.*,
            similarity(gn.name, $1) as name_similarity,
            similarity(gn.path, $1) as path_similarity
          FROM graph_nodes gn
          WHERE 
            gn.type = ANY($2)
            ${projectId ? 'AND gn.project_id = $3' : ''}
            AND (
              similarity(gn.name, $1) > 0.3
              OR similarity(gn.path, $1) > 0.2
              OR gn.name ILIKE '%' || $1 || '%'
            )
          ORDER BY 
            GREATEST(name_similarity, path_similarity) DESC,
            gn.name
          LIMIT $${projectId ? '4' : '3'}
        `;
        params = [query, types];
        if (projectId) params.push(projectId);
        params.push(limit);
      } else {
        // Exact search
        searchQuery = `
          SELECT gn.*
          FROM graph_nodes gn
          WHERE 
            gn.type = ANY($2)
            ${projectId ? 'AND gn.project_id = $3' : ''}
            AND gn.name ILIKE '%' || $1 || '%'
          ORDER BY gn.name
          LIMIT $${projectId ? '4' : '3'}
        `;
        params = [query, types];
        if (projectId) params.push(projectId);
        params.push(limit);
      }

      const result = await enhancedDb.query(searchQuery, params);
      return result.rows;
    } catch (error) {
      this.logger.error('Failed to search symbols', { error: error.message, query, projectId });
      throw error;
    }
  }

  /**
   * Get symbol neighborhood (related symbols)
   */
  async getSymbolNeighborhood(symbolName, projectId = null, depth = 2) {
    try {
      const definition = await this.findDefinition(symbolName, null, projectId);
      if (!definition || definition.length === 0) {
        return { symbol: null, neighborhood: [] };
      }

      const symbolNode = definition[0];
      const neighbors = await graphStore.getNeighbors(symbolNode.node_id);
      
      // Get extended neighborhood if depth > 1
      let extendedNeighbors = neighbors;
      if (depth > 1) {
        const secondDegree = [];
        for (const neighbor of neighbors) {
          const subNeighbors = await graphStore.getNeighbors(neighbor.id);
          secondDegree.push(...subNeighbors);
        }
        extendedNeighbors = [...neighbors, ...secondDegree];
      }

      // Remove duplicates and sort by relevance
      const uniqueNeighbors = Array.from(
        new Map(extendedNeighbors.map(n => [n.id, n])).values()
      ).sort((a, b) => (b.weight || 0) - (a.weight || 0));

      return {
        symbol: symbolNode,
        neighborhood: uniqueNeighbors
      };
    } catch (error) {
      this.logger.error('Failed to get symbol neighborhood', { error: error.message, symbolName });
      throw error;
    }
  }
}

export default new SymbolicIndex();
