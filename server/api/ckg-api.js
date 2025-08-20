/**
 * Code Knowledge Graph API Endpoints
 * RESTful API for CKG functionality
 */

import express from 'express';
import Joi from 'joi';
import ckgService from '../services/ckg-service.js';
import graphStore from '../services/graph-store.js';
import symbolicIndex from '../services/symbolic-index.js';
import embeddingService from '../services/embedding-service.js';
import contextBuilder from '../services/context-builder.js';
import { optionalAuth } from '../middleware/auth.js';
import winston from 'winston';

const router = express.Router();

const logger = winston.createLogger({
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

// Validation schemas
const buildGraphSchema = Joi.object({
  projectId: Joi.number().integer().required(),
  rootPath: Joi.string().required(),
  incremental: Joi.boolean().default(false),
  commitHash: Joi.string().optional(),
  enableSemanticChunking: Joi.boolean().default(true),
  enableEmbeddings: Joi.boolean().default(true)
});

const querySchema = Joi.object({
  query: Joi.string().required(),
  projectId: Joi.number().integer().optional(),
  maxTokens: Joi.number().integer().min(100).max(16000).default(8000),
  includeSymbolic: Joi.boolean().default(true),
  includeSemantic: Joi.boolean().default(true),
  includeErrors: Joi.boolean().default(true)
});

const searchSchema = Joi.object({
  query: Joi.string().required(),
  projectId: Joi.number().integer().optional(),
  includeSymbolic: Joi.boolean().default(true),
  includeSemantic: Joi.boolean().default(true),
  includeTextSearch: Joi.boolean().default(true),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

// CKG Health Check
router.get('/health', async (req, res) => {
  try {
    const health = await ckgService.health();
    res.json(health);
  } catch (error) {
    logger.error('CKG health check failed', { error: error.message });
    res.status(500).json({
      status: 'error',
      message: 'CKG health check failed',
      error: error.message
    });
  }
});

// CKG Status Endpoint
router.get('/status', async (req, res) => {
  try {
    const status = await ckgService.getStatus();
    res.json({
      status: 'ok',
      message: 'CKG Service Status',
      data: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('CKG status check failed', { error: error.message });
    res.status(500).json({
      status: 'error',
      message: 'CKG status check failed',
      error: error.message
    });
  }
});

// Build Knowledge Graph
router.post('/build', optionalAuth, async (req, res) => {
  try {
    const { error, value } = buildGraphSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    const { projectId, rootPath, incremental, commitHash, enableSemanticChunking, enableEmbeddings } = value;
    
    logger.info('Building knowledge graph', { projectId, rootPath, incremental });

    // Start building knowledge graph
    const result = await ckgService.buildKnowledgeGraph(projectId, rootPath, {
      incremental,
      commitHash,
      enableSemanticChunking,
      enableEmbeddings
    });

    res.json({
      success: true,
      message: 'Knowledge graph build started',
      data: result
    });

  } catch (error) {
    logger.error('Failed to build knowledge graph', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to build knowledge graph',
      message: error.message
    });
  }
});

// Query with Context
router.post('/query', optionalAuth, async (req, res) => {
  try {
    const { error, value } = querySchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    const result = await ckgService.queryWithContext(value.query, value.projectId, value);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('CKG query failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'CKG query failed',
      message: error.message
    });
  }
});

// Search Knowledge Graph
router.post('/search', optionalAuth, async (req, res) => {
  try {
    const { error, value } = searchSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    const results = await ckgService.search(value.query, value.projectId, value);

    res.json({
      success: true,
      data: results
    });

  } catch (error) {
    logger.error('CKG search failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'CKG search failed',
      message: error.message
    });
  }
});

// Get Symbol Definition
router.get('/symbols/:symbolName/definition', optionalAuth, async (req, res) => {
  try {
    const { symbolName } = req.params;
    const { projectId, filePath } = req.query;

    const definitions = await symbolicIndex.findDefinition(
      symbolName, 
      filePath, 
      projectId ? parseInt(projectId) : null
    );

    res.json({
      success: true,
      data: {
        symbolName,
        definitions,
        count: definitions.length
      }
    });

  } catch (error) {
    logger.error('Failed to get symbol definition', { error: error.message, symbol: req.params.symbolName });
    res.status(500).json({
      success: false,
      error: 'Failed to get symbol definition',
      message: error.message
    });
  }
});

// Get Symbol References
router.get('/symbols/:symbolName/references', optionalAuth, async (req, res) => {
  try {
    const { symbolName } = req.params;
    const { projectId, includeDefinition = 'true' } = req.query;

    const references = await symbolicIndex.findReferences(
      symbolName,
      projectId ? parseInt(projectId) : null,
      includeDefinition === 'true'
    );

    res.json({
      success: true,
      data: {
        symbolName,
        references,
        count: references.length
      }
    });

  } catch (error) {
    logger.error('Failed to get symbol references', { error: error.message, symbol: req.params.symbolName });
    res.status(500).json({
      success: false,
      error: 'Failed to get symbol references',
      message: error.message
    });
  }
});

// Get Symbol Impact Analysis
router.get('/symbols/:symbolName/impact', optionalAuth, async (req, res) => {
  try {
    const { symbolName } = req.params;
    const { projectId } = req.query;

    const impact = await symbolicIndex.analyzeSymbolImpact(
      symbolName,
      projectId ? parseInt(projectId) : null
    );

    res.json({
      success: true,
      data: impact
    });

  } catch (error) {
    logger.error('Failed to analyze symbol impact', { error: error.message, symbol: req.params.symbolName });
    res.status(500).json({
      success: false,
      error: 'Failed to analyze symbol impact',
      message: error.message
    });
  }
});

// Get Module Importers
router.get('/modules/:modulePath/importers', optionalAuth, async (req, res) => {
  try {
    const { modulePath } = req.params;
    const { projectId } = req.query;

    const importers = await symbolicIndex.findImporters(
      decodeURIComponent(modulePath),
      projectId ? parseInt(projectId) : null
    );

    res.json({
      success: true,
      data: {
        modulePath,
        importers,
        count: importers.length
      }
    });

  } catch (error) {
    logger.error('Failed to get module importers', { error: error.message, module: req.params.modulePath });
    res.status(500).json({
      success: false,
      error: 'Failed to get module importers',
      message: error.message
    });
  }
});

// Get Module Exports
router.get('/modules/:modulePath/exports', optionalAuth, async (req, res) => {
  try {
    const { modulePath } = req.params;
    const { projectId } = req.query;

    const exports = await symbolicIndex.findExports(
      decodeURIComponent(modulePath),
      projectId ? parseInt(projectId) : null
    );

    res.json({
      success: true,
      data: {
        modulePath,
        exports,
        count: exports.length
      }
    });

  } catch (error) {
    logger.error('Failed to get module exports', { error: error.message, module: req.params.modulePath });
    res.status(500).json({
      success: false,
      error: 'Failed to get module exports',
      message: error.message
    });
  }
});

// Get Project Graph Statistics
router.get('/projects/:projectId/stats', optionalAuth, async (req, res) => {
  try {
    const { projectId } = req.params;

    const stats = await ckgService.getProjectStatistics(parseInt(projectId));

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Failed to get project stats', { error: error.message, projectId: req.params.projectId });
    res.status(500).json({
      success: false,
      error: 'Failed to get project statistics',
      message: error.message
    });
  }
});

// Get Dependency Graph
router.get('/projects/:projectId/dependencies', optionalAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { maxDepth = '3' } = req.query;

    const dependencies = await graphStore.getDependencyGraph(
      parseInt(projectId),
      parseInt(maxDepth)
    );

    res.json({
      success: true,
      data: {
        projectId: parseInt(projectId),
        dependencies,
        count: dependencies.length,
        maxDepth: parseInt(maxDepth)
      }
    });

  } catch (error) {
    logger.error('Failed to get dependency graph', { error: error.message, projectId: req.params.projectId });
    res.status(500).json({
      success: false,
      error: 'Failed to get dependency graph',
      message: error.message
    });
  }
});

// Find Unused Exports
router.get('/projects/:projectId/unused-exports', optionalAuth, async (req, res) => {
  try {
    const { projectId } = req.params;

    const unusedExports = await symbolicIndex.findUnusedExports(parseInt(projectId));

    res.json({
      success: true,
      data: {
        projectId: parseInt(projectId),
        unusedExports,
        count: unusedExports.length
      }
    });

  } catch (error) {
    logger.error('Failed to find unused exports', { error: error.message, projectId: req.params.projectId });
    res.status(500).json({
      success: false,
      error: 'Failed to find unused exports',
      message: error.message
    });
  }
});

// Find Missing Imports
router.get('/files/:filePath/missing-imports', optionalAuth, async (req, res) => {
  try {
    const { filePath } = req.params;
    const { projectId } = req.query;

    const missingImports = await symbolicIndex.findMissingImports(
      decodeURIComponent(filePath),
      projectId ? parseInt(projectId) : null
    );

    res.json({
      success: true,
      data: {
        filePath: decodeURIComponent(filePath),
        missingImports,
        count: missingImports.length
      }
    });

  } catch (error) {
    logger.error('Failed to find missing imports', { error: error.message, filePath: req.params.filePath });
    res.status(500).json({
      success: false,
      error: 'Failed to find missing imports',
      message: error.message
    });
  }
});

// Semantic Search
router.post('/semantic-search', optionalAuth, async (req, res) => {
  try {
    const { query, projectId, limit = 20 } = req.body;

    if (!query) {
      return res.status(400).json({
        error: 'Query is required'
      });
    }

    const results = await embeddingService.findSimilarChunks(
      query,
      projectId,
      limit
    );

    res.json({
      success: true,
      data: {
        query,
        results,
        count: results.length
      }
    });

  } catch (error) {
    logger.error('Semantic search failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Semantic search failed',
      message: error.message
    });
  }
});

// Export Graph Data
router.get('/projects/:projectId/export', optionalAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { format = 'json' } = req.query;

    const exportData = await graphStore.exportGraph(parseInt(projectId), format);

    // Set appropriate content type
    switch (format) {
      case 'json':
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="ckg-${projectId}.json"`);
        break;
      case 'cypher':
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename="ckg-${projectId}.cypher"`);
        break;
      case 'gexf':
        res.setHeader('Content-Type', 'application/xml');
        res.setHeader('Content-Disposition', `attachment; filename="ckg-${projectId}.gexf"`);
        break;
    }

    res.send(exportData);

  } catch (error) {
    logger.error('Failed to export graph', { error: error.message, projectId: req.params.projectId });
    res.status(500).json({
      success: false,
      error: 'Failed to export graph',
      message: error.message
    });
  }
});

// Reindex Project
router.post('/projects/:projectId/reindex', optionalAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { type = 'full' } = req.body;

    let result;
    
    if (type === 'embeddings') {
      result = await embeddingService.reindexProject(parseInt(projectId));
    } else if (type === 'symbolic') {
      result = await symbolicIndex.rebuildIndex(parseInt(projectId));
    } else {
      // Full reindex
      const projectData = await enhancedDb.select('projects', 'id = $1', [projectId]);
      if (projectData.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }

      result = await ckgService.buildKnowledgeGraph(
        parseInt(projectId),
        projectData[0].path,
        { incremental: false }
      );
    }

    res.json({
      success: true,
      message: `${type} reindex completed`,
      data: result
    });

  } catch (error) {
    logger.error('Failed to reindex project', { error: error.message, projectId: req.params.projectId });
    res.status(500).json({
      success: false,
      error: 'Failed to reindex project',
      message: error.message
    });
  }
});

// Get AI Analysis with CKG Context
router.post('/ai-analysis', optionalAuth, async (req, res) => {
  try {
    const { error, value } = querySchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    const analysis = await ckgService.getAIAnalysis(value.query, value.projectId);

    res.json({
      success: true,
      data: analysis
    });

  } catch (error) {
    logger.error('AI analysis with CKG failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'AI analysis failed',
      message: error.message
    });
  }
});

// Get Graph Connectivity Analysis
router.get('/projects/:projectId/connectivity', optionalAuth, async (req, res) => {
  try {
    const { projectId } = req.params;

    const connectivity = await graphStore.analyzeConnectivity(parseInt(projectId));

    res.json({
      success: true,
      data: connectivity
    });

  } catch (error) {
    logger.error('Failed to analyze connectivity', { error: error.message, projectId: req.params.projectId });
    res.status(500).json({
      success: false,
      error: 'Failed to analyze connectivity',
      message: error.message
    });
  }
});

// Find Circular Dependencies
router.get('/projects/:projectId/circular-dependencies', optionalAuth, async (req, res) => {
  try {
    const { projectId } = req.params;

    const circular = await graphStore.findCircularDependencies(parseInt(projectId));

    res.json({
      success: true,
      data: {
        projectId: parseInt(projectId),
        circularDependencies: circular,
        count: circular.length
      }
    });

  } catch (error) {
    logger.error('Failed to find circular dependencies', { error: error.message, projectId: req.params.projectId });
    res.status(500).json({
      success: false,
      error: 'Failed to find circular dependencies',
      message: error.message
    });
  }
});

// Get Most Connected Nodes (Hubs)
router.get('/projects/:projectId/hubs', optionalAuth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { limit = '20' } = req.query;

    const hubs = await graphStore.getMostConnectedNodes(
      parseInt(projectId),
      parseInt(limit)
    );

    res.json({
      success: true,
      data: {
        projectId: parseInt(projectId),
        hubs,
        count: hubs.length
      }
    });

  } catch (error) {
    logger.error('Failed to get hubs', { error: error.message, projectId: req.params.projectId });
    res.status(500).json({
      success: false,
      error: 'Failed to get hubs',
      message: error.message
    });
  }
});

// Update File in Graph
router.post('/files/update', optionalAuth, async (req, res) => {
  try {
    const { filePath, projectId, changeType = 'modified' } = req.body;

    if (!filePath || !projectId) {
      return res.status(400).json({
        error: 'filePath and projectId are required'
      });
    }

    await ckgService.updateFileInGraph(filePath, parseInt(projectId), changeType);

    res.json({
      success: true,
      message: 'File updated in graph',
      data: {
        filePath,
        projectId: parseInt(projectId),
        changeType
      }
    });

  } catch (error) {
    logger.error('Failed to update file in graph', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to update file in graph',
      message: error.message
    });
  }
});

export default router;
