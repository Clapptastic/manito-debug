/**
 * User Flow API Endpoints
 * RESTful API for user flow detection, analysis, and visualization
 */

import express from 'express';
import Joi from 'joi';
import userFlowService from '../services/user-flow-service.js';
import { DependencyAnalyzer } from '../../core/analyzers/dependency-analyzer.js';
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
const detectFlowsSchema = Joi.object({
  scanResults: Joi.object({
    files: Joi.array().items(Joi.object({
      filePath: Joi.string().required(),
      content: Joi.string().optional(),
      lines: Joi.number().optional(),
      complexity: Joi.number().optional(),
      dependencies: Joi.object().optional()
    })).required()
  }).required()
});

const compareFlowsSchema = Joi.object({
  flowIds: Joi.array().items(Joi.string()).min(2).required()
});

// Flow Detection
router.post('/:projectId/detect', optionalAuth, async (req, res) => {
  try {
    const { error, value } = detectFlowsSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    const projectId = parseInt(req.params.projectId);
    const { scanResults } = value;

    logger.info('Detecting user flows', { projectId, fileCount: scanResults.files.length });

    const flowData = await userFlowService.detectProjectFlows(projectId, scanResults);

    res.json({
      success: true,
      data: flowData
    });

  } catch (error) {
    logger.error('Flow detection failed', { error: error.message, projectId: req.params.projectId });
    res.status(500).json({
      success: false,
      error: 'Flow detection failed',
      message: error.message
    });
  }
});

// Get Project Flows
router.get('/:projectId', optionalAuth, async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    
    // Try to get cached flows first
    const flows = await userFlowService.getProjectFlows(projectId);
    
    res.json({
      success: true,
      data: {
        projectId,
        flows: flows || [],
        cached: !!flows
      }
    });

  } catch (error) {
    logger.error('Failed to get project flows', { error: error.message, projectId: req.params.projectId });
    res.status(500).json({
      success: false,
      error: 'Failed to get project flows',
      message: error.message
    });
  }
});

// Isolate Specific Flow
router.get('/:projectId/:flowId/isolate', optionalAuth, async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const { flowId } = req.params;

    logger.info('Isolating user flow', { projectId, flowId });

    const isolatedFlow = await userFlowService.isolateUserFlow(flowId, projectId);

    res.json({
      success: true,
      data: isolatedFlow
    });

  } catch (error) {
    logger.error('Flow isolation failed', { error: error.message, flowId: req.params.flowId });
    res.status(500).json({
      success: false,
      error: 'Flow isolation failed',
      message: error.message
    });
  }
});

// Analyze Specific Flow
router.get('/:projectId/:flowId/analyze', optionalAuth, async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const { flowId } = req.params;

    const analysis = await userFlowService.analyzeFlow(flowId, projectId);

    res.json({
      success: true,
      data: analysis
    });

  } catch (error) {
    logger.error('Flow analysis failed', { error: error.message, flowId: req.params.flowId });
    res.status(500).json({
      success: false,
      error: 'Flow analysis failed',
      message: error.message
    });
  }
});

// Compare Multiple Flows
router.post('/:projectId/compare', optionalAuth, async (req, res) => {
  try {
    const { error, value } = compareFlowsSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    const projectId = parseInt(req.params.projectId);
    const { flowIds } = value;

    logger.info('Comparing user flows', { projectId, flowIds });

    const comparison = await userFlowService.compareUserFlows(flowIds, projectId);

    res.json({
      success: true,
      data: comparison
    });

  } catch (error) {
    logger.error('Flow comparison failed', { error: error.message, flowIds: req.body.flowIds });
    res.status(500).json({
      success: false,
      error: 'Flow comparison failed',
      message: error.message
    });
  }
});

// Get File Dependencies (for drill-down)
router.get('/:projectId/files/:filePath/dependencies', optionalAuth, async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const filePath = decodeURIComponent(req.params.filePath);

    const dependencies = await userFlowService.getFileDependencies(filePath, projectId);

    res.json({
      success: true,
      data: dependencies
    });

  } catch (error) {
    logger.error('Failed to get file dependencies', { 
      error: error.message, 
      filePath: req.params.filePath 
    });
    res.status(500).json({
      success: false,
      error: 'Failed to get file dependencies',
      message: error.message
    });
  }
});

// Flow Health Check
router.get('/health', async (req, res) => {
  try {
    const health = await userFlowService.health();
    res.json(health);
  } catch (error) {
    logger.error('User flow health check failed', { error: error.message });
    res.status(500).json({
      status: 'error',
      message: 'User flow health check failed',
      error: error.message
    });
  }
});

// Flow Statistics
router.get('/:projectId/stats', optionalAuth, async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    
    const stats = await userFlowService.getFlowStatistics(projectId);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Failed to get flow statistics', { error: error.message, projectId: req.params.projectId });
    res.status(500).json({
      success: false,
      error: 'Failed to get flow statistics',
      message: error.message
    });
  }
});

// Create Custom Flow
router.post('/:projectId/custom', optionalAuth, async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const { name, description, files, entryPoints } = req.body;

    if (!name || !files || !Array.isArray(files)) {
      return res.status(400).json({
        error: 'Name and files array are required'
      });
    }

    const customFlow = await userFlowService.createCustomFlow(projectId, {
      name,
      description,
      files,
      entryPoints: entryPoints || []
    });

    res.json({
      success: true,
      data: customFlow
    });

  } catch (error) {
    logger.error('Failed to create custom flow', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to create custom flow',
      message: error.message
    });
  }
});

// Delete Custom Flow
router.delete('/:projectId/:flowId', optionalAuth, async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const { flowId } = req.params;

    await userFlowService.deleteCustomFlow(flowId, projectId);

    res.json({
      success: true,
      message: 'Custom flow deleted successfully'
    });

  } catch (error) {
    logger.error('Failed to delete custom flow', { error: error.message, flowId: req.params.flowId });
    res.status(500).json({
      success: false,
      error: 'Failed to delete custom flow',
      message: error.message
    });
  }
});

export default router;
