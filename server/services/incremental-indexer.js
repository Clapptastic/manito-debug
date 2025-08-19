/**
 * Incremental Indexer for Code Knowledge Graph
 * Handles incremental updates to the graph when files change
 */

import { SymbolExtractor } from '../../core/extractors/symbol-extractor.js';
import graphStore from './graph-store.js';
import fileWatcher from './file-watcher.js';
import { EventEmitter } from 'events';
import winston from 'winston';
import path from 'path';

export class IncrementalIndexer extends EventEmitter {
  constructor() {
    super();
    this.symbolExtractor = new SymbolExtractor();
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

    this.processingQueue = [];
    this.isProcessing = false;
    this.projectWatches = new Map();
    
    this.setupFileWatcherListeners();
  }

  /**
   * Setup file watcher event listeners
   */
  setupFileWatcherListeners() {
    fileWatcher.on('filesCreated', (files) => {
      this.queueChanges(files, 'created');
    });

    fileWatcher.on('filesModified', (files) => {
      this.queueChanges(files, 'modified');
    });

    fileWatcher.on('filesDeleted', (files) => {
      this.queueChanges(files, 'deleted');
    });

    fileWatcher.on('error', (error) => {
      this.logger.error('File watcher error:', error);
      this.emit('error', error);
    });
  }

  /**
   * Start incremental indexing for a project
   */
  async startIndexing(projectId, rootPath, commitHash = null) {
    try {
      this.logger.info('Starting incremental indexing', { projectId, rootPath });

      // Start file watching
      const watchName = await fileWatcher.startWatching(rootPath, projectId);
      
      this.projectWatches.set(projectId, {
        rootPath,
        watchName,
        commitHash,
        startedAt: new Date().toISOString()
      });

      // Perform initial full index
      await this.performFullIndex(projectId, rootPath, commitHash);

      this.emit('indexingStarted', { projectId, rootPath });
      this.logger.info('Incremental indexing started', { projectId, rootPath });

      return watchName;
    } catch (error) {
      this.logger.error('Failed to start incremental indexing', { error: error.message, projectId });
      throw error;
    }
  }

  /**
   * Stop incremental indexing for a project
   */
  async stopIndexing(projectId) {
    try {
      await fileWatcher.stopWatching(projectId);
      this.projectWatches.delete(projectId);
      
      this.logger.info('Incremental indexing stopped', { projectId });
      this.emit('indexingStopped', { projectId });
    } catch (error) {
      this.logger.error('Failed to stop incremental indexing', { error: error.message, projectId });
      throw error;
    }
  }

  /**
   * Perform full index of project
   */
  async performFullIndex(projectId, rootPath, commitHash) {
    try {
      this.logger.info('Performing full index', { projectId, rootPath });

      // Clear existing graph data for project
      await graphStore.clearProjectGraph(projectId);

      // Find all supported files
      const files = await this.findSupportedFiles(rootPath);
      this.logger.info(`Found ${files.length} files to index`);

      // Extract symbols from all files
      const allNodes = [];
      const allEdges = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        try {
          const extraction = await this.symbolExtractor.extractFromFile(file, projectId, commitHash);
          
          if (extraction.nodes.length > 0) {
            allNodes.push(...extraction.nodes);
            allEdges.push(...extraction.edges);
          }

          // Emit progress
          this.emit('indexProgress', {
            projectId,
            progress: ((i + 1) / files.length) * 100,
            currentFile: file,
            processed: i + 1,
            total: files.length
          });

        } catch (error) {
          this.logger.warn(`Failed to extract symbols from ${file}:`, error.message);
        }
      }

      // Batch insert nodes and edges
      this.logger.info('Inserting graph data', { nodes: allNodes.length, edges: allEdges.length });
      
      if (allNodes.length > 0) {
        await graphStore.batchCreateNodes(allNodes);
      }
      
      if (allEdges.length > 0) {
        await graphStore.batchCreateEdges(allEdges);
      }

      this.emit('fullIndexComplete', { 
        projectId, 
        nodeCount: allNodes.length, 
        edgeCount: allEdges.length 
      });

      this.logger.info('Full index completed', { 
        projectId, 
        files: files.length, 
        nodes: allNodes.length, 
        edges: allEdges.length 
      });

      return {
        filesProcessed: files.length,
        nodesCreated: allNodes.length,
        edgesCreated: allEdges.length
      };
    } catch (error) {
      this.logger.error('Full index failed', { error: error.message, projectId });
      throw error;
    }
  }

  /**
   * Queue file changes for processing
   */
  queueChanges(files, changeType) {
    const changes = files.map(file => ({
      ...file,
      changeType,
      queuedAt: Date.now()
    }));

    this.processingQueue.push(...changes);
    
    this.logger.debug('Queued file changes', { 
      count: changes.length, 
      type: changeType,
      queueSize: this.processingQueue.length 
    });

    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Process queued file changes
   */
  async processQueue() {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    this.logger.info('Starting queue processing', { queueSize: this.processingQueue.length });

    try {
      while (this.processingQueue.length > 0) {
        const change = this.processingQueue.shift();
        await this.processFileChange(change);
      }
    } catch (error) {
      this.logger.error('Queue processing failed', { error: error.message });
      this.emit('processingError', error);
    } finally {
      this.isProcessing = false;
      this.logger.info('Queue processing completed');
    }
  }

  /**
   * Process individual file change
   */
  async processFileChange(change) {
    try {
      const { path: filePath, changeType } = change;
      const projectId = this.getProjectIdFromPath(filePath);
      
      if (!projectId) {
        this.logger.warn('Cannot determine project ID for file', { filePath });
        return;
      }

      this.logger.debug('Processing file change', { filePath, changeType, projectId });

      switch (changeType) {
        case 'created':
        case 'modified':
          await this.updateFileInGraph(filePath, projectId);
          break;
        case 'deleted':
          await this.removeFileFromGraph(filePath, projectId);
          break;
      }

      this.emit('fileProcessed', { filePath, changeType, projectId });

    } catch (error) {
      this.logger.error('Failed to process file change', { 
        error: error.message, 
        change 
      });
      this.emit('fileProcessingError', { change, error });
    }
  }

  /**
   * Update file in graph (create or modify)
   */
  async updateFileInGraph(filePath, projectId) {
    try {
      // Remove existing nodes for this file
      await this.removeFileFromGraph(filePath, projectId);

      // Extract new symbols
      const extraction = await this.symbolExtractor.extractFromFile(filePath, projectId);

      if (extraction.nodes.length > 0) {
        // Create new nodes
        await graphStore.batchCreateNodes(extraction.nodes);
        
        // Create new edges
        if (extraction.edges.length > 0) {
          await graphStore.batchCreateEdges(extraction.edges);
        }

        this.logger.info('File updated in graph', { 
          filePath, 
          projectId, 
          nodes: extraction.nodes.length, 
          edges: extraction.edges.length 
        });

        this.emit('fileUpdated', { 
          filePath, 
          projectId, 
          extraction 
        });
      }
    } catch (error) {
      this.logger.error('Failed to update file in graph', { 
        error: error.message, 
        filePath, 
        projectId 
      });
      throw error;
    }
  }

  /**
   * Remove file from graph
   */
  async removeFileFromGraph(filePath, projectId) {
    try {
      // Find all nodes for this file
      const nodes = await graphStore.findNodesByType(null, projectId);
      const fileNodes = nodes.filter(node => node.path === filePath);

      // Delete nodes (edges will be deleted by CASCADE)
      for (const node of fileNodes) {
        await graphStore.deleteNode(node.id);
      }

      this.logger.info('File removed from graph', { 
        filePath, 
        projectId, 
        nodesRemoved: fileNodes.length 
      });

      this.emit('fileRemoved', { filePath, projectId, nodesRemoved: fileNodes.length });

    } catch (error) {
      this.logger.error('Failed to remove file from graph', { 
        error: error.message, 
        filePath, 
        projectId 
      });
      throw error;
    }
  }

  /**
   * Find supported files in directory
   */
  async findSupportedFiles(rootPath) {
    const { glob } = await import('glob');
    const patterns = [
      '**/*.{js,jsx,ts,tsx}',
      '**/*.py',
      '**/*.go',
      '**/*.rs',
      '**/*.java',
      '**/*.{cpp,cxx,cc,c}',
      '**/*.cs',
      '**/*.php',
      '**/*.rb',
      '**/*.swift',
      '**/*.{kt,kts}'
    ];

    const allFiles = [];
    
    for (const pattern of patterns) {
      const files = await glob(pattern, {
        cwd: rootPath,
        absolute: true,
        ignore: [
          '**/node_modules/**',
          '**/dist/**',
          '**/build/**',
          '**/target/**',
          '**/bin/**',
          '**/__pycache__/**',
          '**/.git/**'
        ]
      });
      allFiles.push(...files);
    }

    return [...new Set(allFiles)]; // Remove duplicates
  }

  /**
   * Get project ID from file path
   */
  getProjectIdFromPath(filePath) {
    // Find project that contains this file path
    for (const [projectId, watch] of this.projectWatches.entries()) {
      if (filePath.startsWith(watch.rootPath)) {
        return projectId;
      }
    }
    return null;
  }

  /**
   * Get processing statistics
   */
  getStats() {
    return {
      queueSize: this.processingQueue.length,
      isProcessing: this.isProcessing,
      activeWatches: this.projectWatches.size,
      watches: Array.from(this.projectWatches.entries()).map(([projectId, watch]) => ({
        projectId,
        rootPath: watch.rootPath,
        startedAt: watch.startedAt
      }))
    };
  }

  /**
   * Health check
   */
  async health() {
    try {
      const fileWatcherHealth = await fileWatcher.health();
      
      return {
        status: fileWatcherHealth.status === 'ok' ? 'ok' : 'degraded',
        message: 'Incremental indexer is operational',
        fileWatcher: fileWatcherHealth,
        statistics: this.getStats()
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Incremental indexer health check failed: ${error.message}`,
        error: error.message
      };
    }
  }
}

export default new IncrementalIndexer();
