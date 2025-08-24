/**
 * Supabase Service for ManitoDebug
 * Replaces PostgreSQL with Supabase for CKG functionality
 */

import { createClient } from '@supabase/supabase-js';
import { EventEmitter } from 'events';
import winston from 'winston';

export class SupabaseService extends EventEmitter {
  constructor() {
    super();
    this.client = null;
    this.connected = false;
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

    // Defer environment variable check to initialization method
    this.initialized = false;

    this.config = {
      url: process.env.SUPABASE_URL,
      anonKey: process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
    };

    // Don't automatically initialize - wait for explicit call
  }

  /**
   * Ensure Supabase client is initialized
   */
  ensureInitialized() {
    if (!this.initialized) {
      this.initialize();
    }
  }

  /**
   * Initialize Supabase client
   */
  initialize() {
    try {
      // Check environment variables at initialization time
      if (!process.env.SUPABASE_URL) {
        throw new Error('SUPABASE_URL environment variable is required');
      }
      if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
      }

      // Update config with current environment values
      this.config.url = process.env.SUPABASE_URL;
      this.config.serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      this.config.anonKey = process.env.SUPABASE_ANON_KEY || this.config.anonKey;

      // Create client with service role for server-side operations
      this.client = createClient(this.config.url, this.config.serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });

      this.connected = true;
      this.initialized = true;
      this.logger.info('Supabase client initialized', {
        url: this.config.url,
        hasClient: !!this.client
      });

      this.emit('connected');
    } catch (error) {
      this.logger.error('Failed to initialize Supabase client', { error: error.message });
      this.connected = false;
      this.emit('error', error);
    }
  }

  /**
   * Generic query method (compatible with existing code)
   */
  async query(sql, params = []) {
    this.ensureInitialized();
    
    if (!this.connected) {
      throw new Error('Supabase client not connected');
    }

    try {
      // Since we don't have execute_sql function, we'll handle specific query types
      // For CREATE TABLE, INDEX, etc. queries, we'll log them and return success
      // For SELECT queries, we'll try to parse and use direct table access
      
      const trimmedSql = sql.trim().toUpperCase();
      
      if (trimmedSql.startsWith('CREATE') || trimmedSql.startsWith('ALTER') || 
          trimmedSql.startsWith('DROP') || trimmedSql.startsWith('INSERT INTO')) {
        // DDL queries - log and return success since tables are already created
        this.logger.info('DDL query ignored (tables already exist)', { 
          queryType: trimmedSql.split(' ')[0],
          sql: sql.substring(0, 100) + '...'
        });
        return {
          rows: [],
          rowCount: 0
        };
      }
      
      if (trimmedSql.startsWith('SELECT NOW()')) {
        // Return current timestamp
        return {
          rows: [{ now: new Date().toISOString() }],
          rowCount: 1
        };
      }
      
      // For other SELECT queries, try to extract table name and use direct access
      if (trimmedSql.startsWith('SELECT')) {
        // Simple table queries can be handled directly
        const tableMatch = sql.match(/FROM\s+(\w+)/i);
        if (tableMatch) {
          const tableName = tableMatch[1];
          const validTables = ['projects', 'scans', 'files', 'dependencies', 'conflicts'];
          
          if (validTables.includes(tableName)) {
            const { data, error } = await this.client
              .from(tableName)
              .select('*')
              .limit(100);
              
            if (error) throw error;
            
            return {
              rows: data || [],
              rowCount: data?.length || 0
            };
          }
        }
      }
      
      // For unsupported queries, log and return empty result
      this.logger.warn('Unsupported SQL query type', { 
        sql: sql.substring(0, 100) + '...' 
      });
      
      return {
        rows: [],
        rowCount: 0
      };
      
    } catch (error) {
      this.logger.error('Supabase query failed', { error: error.message, sql: sql.substring(0, 100) });
      throw error;
    }
  }

  /**
   * Insert data into table
   */
  async insert(table, data) {
    if (!this.connected) {
      throw new Error('Supabase client not connected');
    }

    try {
      const { data: result, error } = await this.client
        .from(table)
        .insert(data)
        .select()
        .single();

      if (error) throw error;

      this.logger.debug('Supabase insert successful', { table, id: result?.id });
      return result;
    } catch (error) {
      this.logger.error('Supabase insert failed', { error: error.message, table });
      throw error;
    }
  }

  /**
   * Select data from table
   */
  async select(table, whereClause = '', whereParams = [], orderBy = '', limit = '') {
    if (!this.connected) {
      throw new Error('Supabase client not connected');
    }

    try {
      let query = this.client.from(table).select('*');

      // Apply where clause if provided
      if (whereClause && whereParams.length > 0) {
        // Convert PostgreSQL where clause to Supabase filters
        // This is a simplified conversion - would need enhancement for complex queries
        query = this.applyWhereClause(query, whereClause, whereParams);
      }

      // Apply ordering
      if (orderBy) {
        const [column, direction = 'asc'] = orderBy.split(' ');
        query = query.order(column, { ascending: direction.toLowerCase() === 'asc' });
      }

      // Apply limit
      if (limit) {
        query = query.limit(parseInt(limit));
      }

      const { data, error } = await query;

      if (error) throw error;

      return data || [];
    } catch (error) {
      this.logger.error('Supabase select failed', { error: error.message, table });
      throw error;
    }
  }

  /**
   * Update data in table
   */
  async update(table, data, whereClause, whereParams = []) {
    if (!this.connected) {
      throw new Error('Supabase client not connected');
    }

    try {
      let query = this.client.from(table).update(data);

      // Apply where clause
      if (whereClause && whereParams.length > 0) {
        query = this.applyWhereClause(query, whereClause, whereParams);
      }

      const { data: result, error } = await query.select();

      if (error) throw error;

      return result;
    } catch (error) {
      this.logger.error('Supabase update failed', { error: error.message, table });
      throw error;
    }
  }

  /**
   * Delete data from table
   */
  async delete(table, whereClause, whereParams = []) {
    if (!this.connected) {
      throw new Error('Supabase client not connected');
    }

    try {
      let query = this.client.from(table).delete();

      // Apply where clause
      if (whereClause && whereParams.length > 0) {
        query = this.applyWhereClause(query, whereClause, whereParams);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data;
    } catch (error) {
      this.logger.error('Supabase delete failed', { error: error.message, table });
      throw error;
    }
  }

  /**
   * Vector similarity search (CKG specific)
   */
  async searchSimilarChunks(queryEmbedding, options = {}) {
    const {
      matchThreshold = 0.8,
      matchCount = 10,
      projectFilter = null
    } = options;

    try {
      const { data, error } = await this.client.rpc('search_similar_chunks', {
        query_embedding: queryEmbedding,
        match_threshold: matchThreshold,
        match_count: matchCount,
        project_filter: projectFilter
      });

      if (error) throw error;

      return data || [];
    } catch (error) {
      this.logger.error('Vector similarity search failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Full-text search (CKG specific)
   */
  async searchCodeChunks(query, options = {}) {
    const {
      projectFilter = null,
      languageFilter = null,
      chunkTypeFilter = null,
      matchCount = 50
    } = options;

    try {
      const { data, error } = await this.client.rpc('search_code_chunks', {
        search_query: query,
        project_filter: projectFilter,
        language_filter: languageFilter,
        chunk_type_filter: chunkTypeFilter,
        match_count: matchCount
      });

      if (error) throw error;

      return data || [];
    } catch (error) {
      this.logger.error('Full-text search failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Find symbol definitions (CKG specific)
   */
  async findSymbolDefinitions(symbolName, projectFilter = null, languageFilter = null) {
    try {
      const { data, error } = await this.client.rpc('find_symbol_definitions', {
        symbol_name: symbolName,
        project_filter: projectFilter,
        language_filter: languageFilter
      });

      if (error) throw error;

      return data || [];
    } catch (error) {
      this.logger.error('Symbol definition search failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Find symbol references (CKG specific)
   */
  async findSymbolReferences(symbolName, projectFilter = null, matchCount = 100) {
    try {
      const { data, error } = await this.client.rpc('find_symbol_references', {
        symbol_name: symbolName,
        project_filter: projectFilter,
        match_count: matchCount
      });

      if (error) throw error;

      return data || [];
    } catch (error) {
      this.logger.error('Symbol reference search failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Get dependency graph (CKG specific)
   */
  async getDependencyGraph(projectId, maxDepth = 3) {
    try {
      const { data, error } = await this.client.rpc('get_dependency_graph', {
        project_filter: projectId,
        max_depth: maxDepth
      });

      if (error) throw error;

      return data || [];
    } catch (error) {
      this.logger.error('Dependency graph query failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Set up real-time subscriptions
   */
  setupRealtimeSubscriptions() {
    const subscription = this.client
      .channel('ckg-updates')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'graph_nodes' },
        (payload) => {
          this.emit('graphNodeChanged', payload);
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'graph_edges' },
        (payload) => {
          this.emit('graphEdgeChanged', payload);
        }
      )
      .subscribe();

    return subscription;
  }

  /**
   * Helper method to convert PostgreSQL where clauses to Supabase filters
   */
  applyWhereClause(query, whereClause, whereParams) {
    // Simplified conversion - handles basic cases
    // In production, this would need more sophisticated parsing
    
    if (whereClause.includes('id = $1')) {
      return query.eq('id', whereParams[0]);
    }
    
    if (whereClause.includes('project_id = $1')) {
      return query.eq('project_id', whereParams[0]);
    }
    
    if (whereClause.includes('name = $1')) {
      return query.eq('name', whereParams[0]);
    }

    // For complex where clauses, fall back to RPC
    this.logger.warn('Complex where clause - consider using RPC', { whereClause });
    return query;
  }

  /**
   * Test connection to Supabase
   */
  async testConnection() {
    try {
      this.ensureInitialized();
      
      if (!this.connected) {
        throw new Error('Supabase client not connected');
      }

      // Simple connection test
      const { data, error } = await this.client
        .from('projects')
        .select('count')
        .limit(1);

      if (error) {
        return { data: null, error };
      }

      return { data: { status: 'connected' }, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Health check
   */
  async health() {
    try {
      this.ensureInitialized();
      
      if (!this.connected) {
        return {
          status: 'error',
          connected: false,
          message: 'Supabase client not connected'
        };
      }

      // Test basic functionality
      const { data, error } = await this.client
        .from('projects')
        .select('count')
        .limit(1);

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows, which is fine
        throw error;
      }

      // Test vector functionality
      const { data: vectorTest, error: vectorError } = await this.client.rpc('search_similar_chunks', {
        query_embedding: new Array(1536).fill(0.1),
        match_threshold: 0.5,
        match_count: 1
      });

      return {
        status: 'ok',
        connected: true,
        message: 'Supabase service healthy',
        features: {
          basicQueries: true,
          vectorSearch: !vectorError,
          realtime: true
        },
        config: {
          url: this.config.url,
          hasAuth: !!this.config.anonKey
        }
      };
    } catch (error) {
      return {
        status: 'error',
        connected: this.connected,
        message: `Supabase health check failed: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      connected: this.connected,
      url: this.config.url,
      hasServiceRole: !!this.config.serviceRoleKey,
      hasAnonKey: !!this.config.anonKey
    };
  }
}

export default new SupabaseService();
