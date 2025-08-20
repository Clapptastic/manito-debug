/**
 * Graph Store Service for Code Knowledge Graph
 * Manages nodes, edges, and graph operations in PostgreSQL
 */

import supabaseService from './supabase-service.js';
import enhancedDb from './enhancedDatabase.js';
import { EventEmitter } from 'events';
import winston from 'winston';

export class GraphStore extends EventEmitter {
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

    // Use Supabase as primary database, fallback to PostgreSQL
    this.db = supabaseService.connected ? supabaseService : enhancedDb;
    this.usingSupabase = supabaseService.connected;
    
    if (this.usingSupabase) {
      this.logger.info('Graph store using Supabase database');
    } else {
      this.logger.info('Graph store using PostgreSQL database');
    }
  }

  /**
   * Create a new graph node
   */
  async createNode(nodeData) {
    try {
      const {
        type,
        name,
        path,
        language,
        metadata = {},
        commit_hash,
        project_id
      } = nodeData;

      const result = await this.db.insert('graph_nodes', {
        node_type: type, // Renamed field for Supabase
        name,
        file_path: path, // Renamed field for Supabase
        language,
        metadata,
        commit_hash,
        project_id,
        updated_at: new Date()
      });

      this.emit('nodeCreated', result);
      return result;
    } catch (error) {
      this.logger.error('Failed to create graph node', { error: error.message, nodeData });
      throw error;
    }
  }

  /**
   * Create a new graph edge
   */
  async createEdge(edgeData) {
    try {
      const {
        from_node_id,
        to_node_id,
        relationship,
        metadata = {},
        weight = 1.0,
        confidence = 1.0
      } = edgeData;

      const result = await this.db.insert('graph_edges', {
        from_node_id,
        to_node_id,
        relationship,
        metadata,
        weight,
        confidence
      });

      this.emit('edgeCreated', result);
      return result;
    } catch (error) {
      this.logger.error('Failed to create graph edge', { error: error.message, edgeData });
      throw error;
    }
  }

  /**
   * Find nodes by type
   */
  async findNodesByType(type, projectId = null, limit = 100) {
    try {
      let whereClause = 'type = $1';
      let params = [type];

      if (projectId) {
        whereClause += ' AND project_id = $2';
        params.push(projectId);
      }

      const nodes = await enhancedDb.select(
        'graph_nodes',
        whereClause,
        params,
        'created_at DESC',
        limit
      );

      return nodes;
    } catch (error) {
      this.logger.error('Failed to find nodes by type', { error: error.message, type, projectId });
      throw error;
    }
  }

  /**
   * Find node by name and type
   */
  async findNode(name, type, projectId = null) {
    try {
      let whereClause = 'name = $1 AND type = $2';
      let params = [name, type];

      if (projectId) {
        whereClause += ' AND project_id = $3';
        params.push(projectId);
      }

      const nodes = await enhancedDb.select('graph_nodes', whereClause, params, '', 1);
      return nodes.length > 0 ? nodes[0] : null;
    } catch (error) {
      this.logger.error('Failed to find node', { error: error.message, name, type, projectId });
      throw error;
    }
  }

  /**
   * Get neighbors of a node
   */
  async getNeighbors(nodeId, relationship = null, direction = 'both') {
    try {
      let query;
      let params = [nodeId];

      if (direction === 'outgoing') {
        query = `
          SELECT ge.*, gn.name, gn.type, gn.path, gn.language
          FROM graph_edges ge
          JOIN graph_nodes gn ON ge.to_node_id = gn.id
          WHERE ge.from_node_id = $1
        `;
      } else if (direction === 'incoming') {
        query = `
          SELECT ge.*, gn.name, gn.type, gn.path, gn.language
          FROM graph_edges ge
          JOIN graph_nodes gn ON ge.from_node_id = gn.id
          WHERE ge.to_node_id = $1
        `;
      } else {
        query = `
          SELECT ge.*, gn.name, gn.type, gn.path, gn.language, 'outgoing' as direction
          FROM graph_edges ge
          JOIN graph_nodes gn ON ge.to_node_id = gn.id
          WHERE ge.from_node_id = $1
          
          UNION ALL
          
          SELECT ge.*, gn.name, gn.type, gn.path, gn.language, 'incoming' as direction
          FROM graph_edges ge
          JOIN graph_nodes gn ON ge.from_node_id = gn.id
          WHERE ge.to_node_id = $1
        `;
      }

      if (relationship) {
        query += ` AND ge.relationship = $${params.length + 1}`;
        params.push(relationship);
      }

      query += ' ORDER BY ge.weight DESC, ge.created_at DESC';

      const result = await enhancedDb.query(query, params);
      return result.rows;
    } catch (error) {
      this.logger.error('Failed to get neighbors', { error: error.message, nodeId, relationship });
      throw error;
    }
  }

  /**
   * Find symbol definitions
   */
  async findSymbolDefinitions(symbolName, projectId = null, language = null) {
    try {
      const result = await enhancedDb.query(
        'SELECT * FROM manito_dev.find_symbol_definitions($1, $2, $3)',
        [symbolName, projectId, language]
      );

      return result.rows;
    } catch (error) {
      this.logger.error('Failed to find symbol definitions', { error: error.message, symbolName });
      throw error;
    }
  }

  /**
   * Find symbol references
   */
  async findSymbolReferences(symbolName, projectId = null, limit = 100) {
    try {
      const result = await enhancedDb.query(
        'SELECT * FROM manito_dev.find_symbol_references($1, $2, $3)',
        [symbolName, projectId, limit]
      );

      return result.rows;
    } catch (error) {
      this.logger.error('Failed to find symbol references', { error: error.message, symbolName });
      throw error;
    }
  }

  /**
   * Get dependency graph for project
   */
  async getDependencyGraph(projectId, maxDepth = 3) {
    try {
      const result = await enhancedDb.query(
        'SELECT * FROM manito_dev.get_dependency_graph($1, $2)',
        [projectId, maxDepth]
      );

      return result.rows;
    } catch (error) {
      this.logger.error('Failed to get dependency graph', { error: error.message, projectId });
      throw error;
    }
  }

  /**
   * Update node metadata
   */
  async updateNode(nodeId, updates) {
    try {
      const result = await enhancedDb.update(
        'graph_nodes',
        { ...updates, updated_at: new Date() },
        'id = $1',
        [nodeId]
      );

      this.emit('nodeUpdated', { nodeId, updates });
      return result;
    } catch (error) {
      this.logger.error('Failed to update node', { error: error.message, nodeId, updates });
      throw error;
    }
  }

  /**
   * Delete node and all associated edges
   */
  async deleteNode(nodeId) {
    try {
      // Delete associated edges first (handled by CASCADE)
      const result = await enhancedDb.query(
        'DELETE FROM graph_nodes WHERE id = $1 RETURNING *',
        [nodeId]
      );

      this.emit('nodeDeleted', { nodeId });
      return result.rows[0];
    } catch (error) {
      this.logger.error('Failed to delete node', { error: error.message, nodeId });
      throw error;
    }
  }

  /**
   * Batch create nodes
   */
  async batchCreateNodes(nodesData) {
    try {
      const results = [];
      
      // Use transaction for batch operations
      await enhancedDb.query('BEGIN');
      
      for (const nodeData of nodesData) {
        const result = await this.createNode(nodeData);
        results.push(result);
      }
      
      await enhancedDb.query('COMMIT');
      
      this.emit('batchNodesCreated', { count: results.length });
      return results;
    } catch (error) {
      await enhancedDb.query('ROLLBACK');
      this.logger.error('Failed to batch create nodes', { error: error.message, count: nodesData.length });
      throw error;
    }
  }

  /**
   * Batch create edges
   */
  async batchCreateEdges(edgesData) {
    try {
      const results = [];
      
      await enhancedDb.query('BEGIN');
      
      for (const edgeData of edgesData) {
        const result = await this.createEdge(edgeData);
        results.push(result);
      }
      
      await enhancedDb.query('COMMIT');
      
      this.emit('batchEdgesCreated', { count: results.length });
      return results;
    } catch (error) {
      await enhancedDb.query('ROLLBACK');
      this.logger.error('Failed to batch create edges', { error: error.message, count: edgesData.length });
      throw error;
    }
  }

  /**
   * Clear graph data for project
   */
  async clearProjectGraph(projectId) {
    try {
      await enhancedDb.query('BEGIN');
      
      // Delete in order due to foreign key constraints
      await enhancedDb.query('DELETE FROM graph_edges WHERE from_node_id IN (SELECT id FROM graph_nodes WHERE project_id = $1)', [projectId]);
      await enhancedDb.query('DELETE FROM graph_nodes WHERE project_id = $1', [projectId]);
      
      await enhancedDb.query('COMMIT');
      
      this.emit('projectGraphCleared', { projectId });
      this.logger.info('Project graph cleared', { projectId });
    } catch (error) {
      await enhancedDb.query('ROLLBACK');
      this.logger.error('Failed to clear project graph', { error: error.message, projectId });
      throw error;
    }
  }

  /**
   * Get graph statistics
   */
  async getGraphStats(projectId = null) {
    try {
      let whereClause = '';
      let params = [];

      if (projectId) {
        whereClause = 'WHERE project_id = $1';
        params = [projectId];
      }

      const nodeStats = await enhancedDb.query(`
        SELECT type, COUNT(*) as count
        FROM graph_nodes ${whereClause}
        GROUP BY type
        ORDER BY count DESC
      `, params);

      const edgeStats = await enhancedDb.query(`
        SELECT ge.relationship, COUNT(*) as count
        FROM graph_edges ge
        ${projectId ? 'JOIN graph_nodes gn ON ge.from_node_id = gn.id WHERE gn.project_id = $1' : ''}
        GROUP BY ge.relationship
        ORDER BY count DESC
      `, params);

      const languageStats = await enhancedDb.query(`
        SELECT language, COUNT(*) as count
        FROM graph_nodes ${whereClause}
        GROUP BY language
        ORDER BY count DESC
      `, params);

      return {
        nodes: nodeStats.rows,
        edges: edgeStats.rows,
        languages: languageStats.rows,
        totalNodes: nodeStats.rows.reduce((sum, row) => sum + parseInt(row.count), 0),
        totalEdges: edgeStats.rows.reduce((sum, row) => sum + parseInt(row.count), 0)
      };
    } catch (error) {
      this.logger.error('Failed to get graph stats', { error: error.message, projectId });
      throw error;
    }
  }

  /**
   * Search nodes with text query
   */
  async searchNodes(query, projectId = null, limit = 50) {
    try {
      let whereClause = `
        (name ILIKE $1 OR path ILIKE $1 OR metadata::text ILIKE $1)
      `;
      let params = [`%${query}%`];

      if (projectId) {
        whereClause += ' AND project_id = $2';
        params.push(projectId);
      }

      const nodes = await enhancedDb.select(
        'graph_nodes',
        whereClause,
        params,
        'created_at DESC',
        limit
      );

      return nodes;
    } catch (error) {
      this.logger.error('Failed to search nodes', { error: error.message, query, projectId });
      throw error;
    }
  }

  /**
   * Get shortest path between two nodes
   */
  async getShortestPath(fromNodeId, toNodeId, maxDepth = 5) {
    try {
      const query = `
        WITH RECURSIVE path_search AS (
          SELECT 
            from_node_id,
            to_node_id,
            relationship,
            ARRAY[from_node_id] as path,
            1 as depth
          FROM graph_edges
          WHERE from_node_id = $1
          
          UNION ALL
          
          SELECT 
            ge.from_node_id,
            ge.to_node_id,
            ge.relationship,
            ps.path || ge.from_node_id,
            ps.depth + 1
          FROM graph_edges ge
          JOIN path_search ps ON ge.from_node_id = ps.to_node_id
          WHERE 
            ps.depth < $3
            AND NOT (ge.from_node_id = ANY(ps.path)) -- Prevent cycles
        )
        SELECT * FROM path_search
        WHERE to_node_id = $2
        ORDER BY depth
        LIMIT 1
      `;

      const result = await enhancedDb.query(query, [fromNodeId, toNodeId, maxDepth]);
      return result.rows[0] || null;
    } catch (error) {
      this.logger.error('Failed to find shortest path', { error: error.message, fromNodeId, toNodeId });
      throw error;
    }
  }

  /**
   * Find circular dependencies
   */
  async findCircularDependencies(projectId) {
    try {
      const query = `
        WITH RECURSIVE cycle_search AS (
          SELECT 
            from_node_id,
            to_node_id,
            ARRAY[from_node_id] as path,
            1 as depth
          FROM graph_edges ge
          JOIN graph_nodes gn ON ge.from_node_id = gn.id
          WHERE gn.project_id = $1
          
          UNION ALL
          
          SELECT 
            ge.from_node_id,
            ge.to_node_id,
            cs.path || ge.from_node_id,
            cs.depth + 1
          FROM graph_edges ge
          JOIN cycle_search cs ON ge.from_node_id = cs.to_node_id
          JOIN graph_nodes gn ON ge.from_node_id = gn.id
          WHERE 
            cs.depth < 10
            AND gn.project_id = $1
            AND ge.from_node_id = ANY(cs.path) -- Found a cycle
        )
        SELECT DISTINCT path
        FROM cycle_search
        WHERE depth > 1
      `;

      const result = await enhancedDb.query(query, [projectId]);
      return result.rows;
    } catch (error) {
      this.logger.error('Failed to find circular dependencies', { error: error.message, projectId });
      throw error;
    }
  }

  /**
   * Get node hierarchy (parent-child relationships)
   */
  async getNodeHierarchy(rootNodeId, maxDepth = 3) {
    try {
      const query = `
        WITH RECURSIVE hierarchy AS (
          SELECT 
            id,
            name,
            type,
            path,
            metadata,
            0 as depth,
            ARRAY[id] as node_path
          FROM graph_nodes
          WHERE id = $1
          
          UNION ALL
          
          SELECT 
            gn.id,
            gn.name,
            gn.type,
            gn.path,
            gn.metadata,
            h.depth + 1,
            h.node_path || gn.id
          FROM graph_nodes gn
          JOIN graph_edges ge ON gn.id = ge.to_node_id
          JOIN hierarchy h ON ge.from_node_id = h.id
          WHERE 
            h.depth < $2
            AND NOT (gn.id = ANY(h.node_path)) -- Prevent cycles
            AND ge.relationship IN ('contains', 'defines', 'owns')
        )
        SELECT * FROM hierarchy
        ORDER BY depth, name
      `;

      const result = await enhancedDb.query(query, [rootNodeId, maxDepth]);
      return result.rows;
    } catch (error) {
      this.logger.error('Failed to get node hierarchy', { error: error.message, rootNodeId });
      throw error;
    }
  }

  /**
   * Update edge weight based on usage frequency
   */
  async updateEdgeWeight(edgeId, newWeight) {
    try {
      const result = await enhancedDb.update(
        'graph_edges',
        { weight: newWeight },
        'id = $1',
        [edgeId]
      );

      this.emit('edgeWeightUpdated', { edgeId, newWeight });
      return result;
    } catch (error) {
      this.logger.error('Failed to update edge weight', { error: error.message, edgeId, newWeight });
      throw error;
    }
  }

  /**
   * Get most connected nodes (hub analysis)
   */
  async getMostConnectedNodes(projectId, limit = 20) {
    try {
      const query = `
        SELECT 
          gn.id,
          gn.name,
          gn.type,
          gn.path,
          COUNT(ge.id) as connection_count,
          COUNT(CASE WHEN ge.from_node_id = gn.id THEN 1 END) as outgoing_count,
          COUNT(CASE WHEN ge.to_node_id = gn.id THEN 1 END) as incoming_count
        FROM graph_nodes gn
        LEFT JOIN graph_edges ge ON (gn.id = ge.from_node_id OR gn.id = ge.to_node_id)
        WHERE gn.project_id = $1
        GROUP BY gn.id, gn.name, gn.type, gn.path
        ORDER BY connection_count DESC
        LIMIT $2
      `;

      const result = await enhancedDb.query(query, [projectId, limit]);
      return result.rows;
    } catch (error) {
      this.logger.error('Failed to get most connected nodes', { error: error.message, projectId });
      throw error;
    }
  }

  /**
   * Find orphaned nodes (no connections)
   */
  async findOrphanedNodes(projectId) {
    try {
      const query = `
        SELECT gn.*
        FROM graph_nodes gn
        LEFT JOIN graph_edges ge ON (gn.id = ge.from_node_id OR gn.id = ge.to_node_id)
        WHERE gn.project_id = $1 AND ge.id IS NULL
        ORDER BY gn.created_at DESC
      `;

      const result = await enhancedDb.query(query, [projectId]);
      return result.rows;
    } catch (error) {
      this.logger.error('Failed to find orphaned nodes', { error: error.message, projectId });
      throw error;
    }
  }

  /**
   * Analyze graph connectivity
   */
  async analyzeConnectivity(projectId) {
    try {
      const stats = await this.getGraphStats(projectId);
      const mostConnected = await this.getMostConnectedNodes(projectId, 10);
      const orphaned = await this.findOrphanedNodes(projectId);
      const circular = await this.findCircularDependencies(projectId);

      return {
        statistics: stats,
        hubs: mostConnected,
        orphanedNodes: orphaned,
        circularDependencies: circular,
        connectivity: {
          averageConnections: stats.totalEdges / Math.max(stats.totalNodes, 1),
          orphanedPercentage: (orphaned.length / Math.max(stats.totalNodes, 1)) * 100,
          circularCount: circular.length
        }
      };
    } catch (error) {
      this.logger.error('Failed to analyze connectivity', { error: error.message, projectId });
      throw error;
    }
  }

  /**
   * Export graph data
   */
  async exportGraph(projectId, format = 'json') {
    try {
      const nodes = await this.findNodesByType(null, projectId, 10000);
      const edges = await enhancedDb.select(
        'graph_edges ge JOIN graph_nodes gn ON ge.from_node_id = gn.id',
        'gn.project_id = $1',
        [projectId]
      );

      const graphData = {
        metadata: {
          projectId,
          exportedAt: new Date().toISOString(),
          nodeCount: nodes.length,
          edgeCount: edges.length
        },
        nodes,
        edges
      };

      switch (format) {
        case 'json':
          return JSON.stringify(graphData, null, 2);
        case 'cypher':
          return this.toCypher(graphData);
        case 'gexf':
          return this.toGEXF(graphData);
        default:
          return graphData;
      }
    } catch (error) {
      this.logger.error('Failed to export graph', { error: error.message, projectId, format });
      throw error;
    }
  }

  /**
   * Health check for graph store
   */
  async health() {
    try {
      const nodeCount = await enhancedDb.query('SELECT COUNT(*) FROM graph_nodes');
      const edgeCount = await enhancedDb.query('SELECT COUNT(*) FROM graph_edges');
      const chunkCount = await enhancedDb.query('SELECT COUNT(*) FROM code_chunks');

      return {
        status: 'ok',
        message: 'Graph store is healthy',
        statistics: {
          totalNodes: parseInt(nodeCount.rows[0].count),
          totalEdges: parseInt(edgeCount.rows[0].count),
          totalChunks: parseInt(chunkCount.rows[0].count)
        }
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Graph store health check failed: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Convert to Cypher format (for Neo4j)
   */
  toCypher(graphData) {
    let cypher = '// Code Knowledge Graph Export\n\n';
    
    // Create nodes
    for (const node of graphData.nodes) {
      cypher += `CREATE (n${node.id.replace(/-/g, '_')}:${node.type} {name: "${node.name}", path: "${node.path}", language: "${node.language}"})\n`;
    }
    
    cypher += '\n';
    
    // Create relationships
    for (const edge of graphData.edges) {
      cypher += `MATCH (a {id: "${edge.from_node_id}"}), (b {id: "${edge.to_node_id}"}) CREATE (a)-[:${edge.relationship.toUpperCase()}]->(b)\n`;
    }
    
    return cypher;
  }

  /**
   * Convert to GEXF format (for Gephi)
   */
  toGEXF(graphData) {
    let gexf = `<?xml version="1.0" encoding="UTF-8"?>
<gexf xmlns="http://www.gexf.net/1.2draft" version="1.2">
  <meta lastmodifieddate="${new Date().toISOString()}">
    <creator>ManitoDebug CKG</creator>
    <description>Code Knowledge Graph Export</description>
  </meta>
  <graph mode="static" defaultedgetype="directed">
    <nodes>`;

    for (const node of graphData.nodes) {
      gexf += `
      <node id="${node.id}" label="${node.name}">
        <attvalues>
          <attvalue for="type" value="${node.type}"/>
          <attvalue for="path" value="${node.path}"/>
          <attvalue for="language" value="${node.language}"/>
        </attvalues>
      </node>`;
    }

    gexf += `
    </nodes>
    <edges>`;

    for (const edge of graphData.edges) {
      gexf += `
      <edge id="${edge.id}" source="${edge.from_node_id}" target="${edge.to_node_id}" label="${edge.relationship}" weight="${edge.weight}"/>`;
    }

    gexf += `
    </edges>
  </graph>
</gexf>`;

    return gexf;
  }
}

export default new GraphStore();
