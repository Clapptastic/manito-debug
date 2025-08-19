/**
 * Embedding Service for Code Knowledge Graph
 * Generates and manages vector embeddings for semantic search
 */

import OpenAI from 'openai';
import enhancedDb from './enhancedDatabase.js';
import { EventEmitter } from 'events';
import winston from 'winston';

export class EmbeddingService extends EventEmitter {
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

    this.openai = null;
    this.embeddingCache = new Map();
    this.batchSize = 100; // Process embeddings in batches
    this.maxRetries = 3;
    
    this.initializeProviders();
  }

  /**
   * Initialize embedding providers
   */
  initializeProviders() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
      this.logger.info('OpenAI embedding provider initialized');
    } else {
      this.logger.warn('No OpenAI API key - embeddings will use local fallback');
    }
  }

  /**
   * Generate embedding for text
   */
  async generateEmbedding(text, model = 'text-embedding-ada-002') {
    try {
      // Check cache first
      const cacheKey = `${model}:${this.hashText(text)}`;
      const cached = this.embeddingCache.get(cacheKey);
      if (cached) {
        return cached;
      }

      let embedding;

      if (this.openai) {
        embedding = await this.generateOpenAIEmbedding(text, model);
      } else {
        embedding = await this.generateLocalEmbedding(text);
      }

      // Cache the result
      this.embeddingCache.set(cacheKey, embedding);
      
      // Limit cache size
      if (this.embeddingCache.size > 10000) {
        const firstKey = this.embeddingCache.keys().next().value;
        this.embeddingCache.delete(firstKey);
      }

      return embedding;
    } catch (error) {
      this.logger.error('Failed to generate embedding', { error: error.message, textLength: text.length });
      throw error;
    }
  }

  /**
   * Generate OpenAI embedding
   */
  async generateOpenAIEmbedding(text, model) {
    try {
      const response = await this.openai.embeddings.create({
        model,
        input: text,
        encoding_format: 'float'
      });

      return {
        vector: response.data[0].embedding,
        model,
        dimensions: response.data[0].embedding.length,
        provider: 'openai'
      };
    } catch (error) {
      this.logger.error('OpenAI embedding failed', { error: error.message, model });
      throw error;
    }
  }

  /**
   * Generate local embedding (fallback)
   */
  async generateLocalEmbedding(text) {
    // Simple local embedding using text characteristics
    // This is a fallback when OpenAI is not available
    const features = this.extractTextFeatures(text);
    const vector = this.featuresToVector(features);

    return {
      vector,
      model: 'local-text-features',
      dimensions: vector.length,
      provider: 'local'
    };
  }

  /**
   * Extract text features for local embedding
   */
  extractTextFeatures(text) {
    const features = {
      length: text.length,
      wordCount: text.split(/\s+/).length,
      lineCount: text.split('\n').length,
      hasCode: /```|function|class|def |fn |struct|interface/.test(text),
      hasDocumentation: /\/\*\*|"""|\#\#/.test(text),
      complexity: (text.match(/if|for|while|switch|try|catch/g) || []).length,
      languageKeywords: this.countLanguageKeywords(text),
      camelCaseCount: (text.match(/[a-z][A-Z]/g) || []).length,
      uppercaseRatio: (text.match(/[A-Z]/g) || []).length / text.length
    };

    return features;
  }

  /**
   * Count language-specific keywords
   */
  countLanguageKeywords(text) {
    const keywords = {
      javascript: ['function', 'class', 'const', 'let', 'var', 'import', 'export'],
      python: ['def', 'class', 'import', 'from', 'if', 'for', 'while'],
      go: ['func', 'type', 'struct', 'interface', 'package', 'import'],
      rust: ['fn', 'struct', 'trait', 'impl', 'use', 'mod'],
      java: ['class', 'interface', 'public', 'private', 'static', 'void']
    };

    const counts = {};
    for (const [language, words] of Object.entries(keywords)) {
      counts[language] = words.reduce((count, word) => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        return count + (text.match(regex) || []).length;
      }, 0);
    }

    return counts;
  }

  /**
   * Convert features to vector
   */
  featuresToVector(features) {
    // Create a 384-dimensional vector (common embedding size)
    const vector = new Array(384).fill(0);

    // Normalize and map features to vector positions
    vector[0] = Math.min(features.length / 10000, 1); // Text length (normalized)
    vector[1] = Math.min(features.wordCount / 1000, 1); // Word count
    vector[2] = Math.min(features.lineCount / 100, 1); // Line count
    vector[3] = features.hasCode ? 1 : 0; // Has code
    vector[4] = features.hasDocumentation ? 1 : 0; // Has documentation
    vector[5] = Math.min(features.complexity / 20, 1); // Complexity
    vector[6] = Math.min(features.camelCaseCount / 50, 1); // CamelCase usage
    vector[7] = features.uppercaseRatio; // Uppercase ratio

    // Language keyword features (positions 8-47)
    let pos = 8;
    for (const [language, count] of Object.entries(features.languageKeywords)) {
      vector[pos] = Math.min(count / 10, 1);
      pos++;
    }

    // Fill remaining positions with derived features
    for (let i = pos; i < 384; i++) {
      vector[i] = Math.sin(i * features.length * 0.001) * 0.1; // Pseudo-random based on content
    }

    return vector;
  }

  /**
   * Generate embeddings for multiple chunks
   */
  async batchGenerateEmbeddings(chunks, model = 'text-embedding-ada-002') {
    try {
      const results = [];
      
      // Process in batches to avoid rate limits
      for (let i = 0; i < chunks.length; i += this.batchSize) {
        const batch = chunks.slice(i, i + this.batchSize);
        
        this.logger.info(`Processing embedding batch ${Math.floor(i / this.batchSize) + 1}/${Math.ceil(chunks.length / this.batchSize)}`);

        const batchResults = await Promise.all(
          batch.map(async (chunk) => {
            try {
              const embedding = await this.generateEmbedding(chunk.content, model);
              return {
                chunk_id: chunk.id,
                embedding: embedding.vector,
                model: embedding.model,
                provider: embedding.provider,
                dimensions: embedding.dimensions
              };
            } catch (error) {
              this.logger.warn(`Failed to generate embedding for chunk ${chunk.id}:`, error.message);
              return null;
            }
          })
        );

        results.push(...batchResults.filter(Boolean));

        // Add delay between batches to respect rate limits
        if (i + this.batchSize < chunks.length) {
          await this.delay(1000); // 1 second delay
        }
      }

      return results;
    } catch (error) {
      this.logger.error('Batch embedding generation failed', { error: error.message, chunkCount: chunks.length });
      throw error;
    }
  }

  /**
   * Store embedding in database
   */
  async storeEmbedding(chunkId, embedding, model) {
    try {
      const result = await enhancedDb.insert('embeddings', {
        chunk_id: chunkId,
        embedding,
        model
      });

      this.emit('embeddingStored', { chunkId, model });
      return result;
    } catch (error) {
      this.logger.error('Failed to store embedding', { error: error.message, chunkId, model });
      throw error;
    }
  }

  /**
   * Store multiple embeddings
   */
  async batchStoreEmbeddings(embeddings) {
    try {
      await enhancedDb.query('BEGIN');
      
      const results = [];
      for (const embedding of embeddings) {
        const result = await this.storeEmbedding(
          embedding.chunk_id,
          embedding.embedding,
          embedding.model
        );
        results.push(result);
      }
      
      await enhancedDb.query('COMMIT');
      
      this.emit('batchEmbeddingsStored', { count: results.length });
      this.logger.info('Batch embeddings stored', { count: results.length });
      
      return results;
    } catch (error) {
      await enhancedDb.query('ROLLBACK');
      this.logger.error('Failed to batch store embeddings', { error: error.message, count: embeddings.length });
      throw error;
    }
  }

  /**
   * Search for similar embeddings
   */
  async searchSimilar(queryEmbedding, limit = 10, threshold = 0.7) {
    try {
      // Use pgvector for similarity search
      const query = `
        SELECT 
          cc.id as chunk_id,
          cc.content,
          cc.chunk_type,
          cc.language,
          gn.name as node_name,
          gn.path as node_path,
          gn.type as node_type,
          e.model,
          (1 - (e.embedding <=> $1::vector)) as similarity
        FROM embeddings e
        JOIN code_chunks cc ON e.chunk_id = cc.id
        JOIN graph_nodes gn ON cc.node_id = gn.id
        WHERE (1 - (e.embedding <=> $1::vector)) > $2
        ORDER BY e.embedding <=> $1::vector
        LIMIT $3
      `;

      const result = await enhancedDb.query(query, [
        JSON.stringify(queryEmbedding),
        threshold,
        limit
      ]);

      return result.rows;
    } catch (error) {
      this.logger.error('Similarity search failed', { error: error.message, limit, threshold });
      throw error;
    }
  }

  /**
   * Find semantically similar code chunks
   */
  async findSimilarChunks(queryText, projectId = null, limit = 10) {
    try {
      // Generate embedding for query
      const queryEmbedding = await this.generateEmbedding(queryText);
      
      // Search for similar embeddings
      let query = `
        SELECT 
          cc.id as chunk_id,
          cc.content,
          cc.chunk_type,
          cc.language,
          gn.name as node_name,
          gn.path as node_path,
          gn.type as node_type,
          (1 - (e.embedding <=> $1::vector)) as similarity
        FROM embeddings e
        JOIN code_chunks cc ON e.chunk_id = cc.id
        JOIN graph_nodes gn ON cc.node_id = gn.id
        WHERE 1=1
      `;

      const params = [JSON.stringify(queryEmbedding.vector)];

      if (projectId) {
        query += ' AND gn.project_id = $2';
        params.push(projectId);
      }

      query += `
        ORDER BY e.embedding <=> $1::vector
        LIMIT $${params.length + 1}
      `;
      params.push(limit);

      const result = await enhancedDb.query(query, params);
      return result.rows;
    } catch (error) {
      this.logger.error('Failed to find similar chunks', { error: error.message, queryText, projectId });
      throw error;
    }
  }

  /**
   * Update embedding for chunk
   */
  async updateEmbedding(chunkId, newContent, model = 'text-embedding-ada-002') {
    try {
      // Generate new embedding
      const embedding = await this.generateEmbedding(newContent, model);
      
      // Update in database
      const result = await enhancedDb.update(
        'embeddings',
        {
          embedding: embedding.vector,
          model: embedding.model
        },
        'chunk_id = $1',
        [chunkId]
      );

      this.emit('embeddingUpdated', { chunkId, model });
      return result;
    } catch (error) {
      this.logger.error('Failed to update embedding', { error: error.message, chunkId });
      throw error;
    }
  }

  /**
   * Delete embedding
   */
  async deleteEmbedding(chunkId) {
    try {
      const result = await enhancedDb.query(
        'DELETE FROM embeddings WHERE chunk_id = $1 RETURNING *',
        [chunkId]
      );

      this.emit('embeddingDeleted', { chunkId });
      return result.rows[0];
    } catch (error) {
      this.logger.error('Failed to delete embedding', { error: error.message, chunkId });
      throw error;
    }
  }

  /**
   * Get embedding statistics
   */
  async getEmbeddingStats(projectId = null) {
    try {
      let query = `
        SELECT 
          e.model,
          COUNT(*) as count,
          AVG(array_length(e.embedding, 1)) as avg_dimensions
        FROM embeddings e
        JOIN code_chunks cc ON e.chunk_id = cc.id
        JOIN graph_nodes gn ON cc.node_id = gn.id
      `;

      const params = [];
      if (projectId) {
        query += ' WHERE gn.project_id = $1';
        params.push(projectId);
      }

      query += ' GROUP BY e.model ORDER BY count DESC';

      const result = await enhancedDb.query(query, params);
      
      return {
        byModel: result.rows,
        totalEmbeddings: result.rows.reduce((sum, row) => sum + parseInt(row.count), 0)
      };
    } catch (error) {
      this.logger.error('Failed to get embedding stats', { error: error.message, projectId });
      throw error;
    }
  }

  /**
   * Reindex embeddings for project
   */
  async reindexProject(projectId) {
    try {
      this.logger.info('Reindexing embeddings for project', { projectId });

      // Get all chunks for project
      const chunks = await enhancedDb.query(`
        SELECT cc.*
        FROM code_chunks cc
        JOIN graph_nodes gn ON cc.node_id = gn.id
        WHERE gn.project_id = $1
      `, [projectId]);

      if (chunks.rows.length === 0) {
        this.logger.info('No chunks found for reindexing', { projectId });
        return { processed: 0 };
      }

      // Delete existing embeddings
      await enhancedDb.query(`
        DELETE FROM embeddings 
        WHERE chunk_id IN (
          SELECT cc.id 
          FROM code_chunks cc 
          JOIN graph_nodes gn ON cc.node_id = gn.id 
          WHERE gn.project_id = $1
        )
      `, [projectId]);

      // Generate new embeddings
      const embeddings = await this.batchGenerateEmbeddings(chunks.rows);
      
      // Store new embeddings
      if (embeddings.length > 0) {
        await this.batchStoreEmbeddings(embeddings);
      }

      this.emit('projectReindexed', { projectId, embeddingCount: embeddings.length });
      this.logger.info('Project reindexing completed', { projectId, embeddingCount: embeddings.length });

      return { processed: embeddings.length };
    } catch (error) {
      this.logger.error('Failed to reindex project', { error: error.message, projectId });
      throw error;
    }
  }

  /**
   * Generate embeddings for code chunks
   */
  async generateChunkEmbeddings(chunks) {
    try {
      const embeddings = await this.batchGenerateEmbeddings(chunks);
      
      if (embeddings.length > 0) {
        await this.batchStoreEmbeddings(embeddings);
      }

      return embeddings;
    } catch (error) {
      this.logger.error('Failed to generate chunk embeddings', { error: error.message, chunkCount: chunks.length });
      throw error;
    }
  }

  /**
   * Semantic search with hybrid approach
   */
  async semanticSearch(query, options = {}) {
    try {
      const {
        projectId = null,
        limit = 20,
        threshold = 0.7,
        includeTextSearch = true,
        chunkTypes = null
      } = options;

      // Generate query embedding
      const queryEmbedding = await this.generateEmbedding(query);

      // Build search query
      let searchQuery = `
        SELECT 
          cc.id as chunk_id,
          cc.content,
          cc.chunk_type,
          cc.language,
          gn.name as node_name,
          gn.path as node_path,
          gn.type as node_type,
          (1 - (e.embedding <=> $1::vector)) as semantic_similarity,
          ts_rank(cc.ts_vector, plainto_tsquery('english', $2)) as text_rank
        FROM embeddings e
        JOIN code_chunks cc ON e.chunk_id = cc.id
        JOIN graph_nodes gn ON cc.node_id = gn.id
        WHERE 1=1
      `;

      const params = [JSON.stringify(queryEmbedding.vector), query];

      // Add filters
      if (projectId) {
        searchQuery += ` AND gn.project_id = $${params.length + 1}`;
        params.push(projectId);
      }

      if (chunkTypes) {
        searchQuery += ` AND cc.chunk_type = ANY($${params.length + 1})`;
        params.push(chunkTypes);
      }

      // Combine semantic and text search scores
      if (includeTextSearch) {
        searchQuery += `
          AND (
            (1 - (e.embedding <=> $1::vector)) > $${params.length + 1}
            OR cc.ts_vector @@ plainto_tsquery('english', $2)
          )
          ORDER BY (
            (1 - (e.embedding <=> $1::vector)) * 0.7 + 
            ts_rank(cc.ts_vector, plainto_tsquery('english', $2)) * 0.3
          ) DESC
        `;
        params.push(threshold);
      } else {
        searchQuery += `
          AND (1 - (e.embedding <=> $1::vector)) > $${params.length + 1}
          ORDER BY e.embedding <=> $1::vector
        `;
        params.push(threshold);
      }

      searchQuery += ` LIMIT $${params.length + 1}`;
      params.push(limit);

      const result = await enhancedDb.query(searchQuery, params);
      return result.rows;
    } catch (error) {
      this.logger.error('Semantic search failed', { error: error.message, query, options });
      throw error;
    }
  }

  /**
   * Hash text for caching
   */
  hashText(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  }

  /**
   * Delay helper
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear embedding cache
   */
  clearCache() {
    this.embeddingCache.clear();
    this.logger.info('Embedding cache cleared');
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      cacheSize: this.embeddingCache.size,
      hasOpenAI: !!this.openai,
      batchSize: this.batchSize,
      maxRetries: this.maxRetries
    };
  }

  /**
   * Health check
   */
  async health() {
    try {
      if (this.openai) {
        // Test OpenAI connection with a small embedding
        await this.generateEmbedding('test', 'text-embedding-ada-002');
      }

      const stats = await this.getEmbeddingStats();

      return {
        status: 'ok',
        message: 'Embedding service is healthy',
        provider: this.openai ? 'openai' : 'local',
        statistics: stats
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Embedding service health check failed: ${error.message}`,
        error: error.message
      };
    }
  }
}

export default new EmbeddingService();
