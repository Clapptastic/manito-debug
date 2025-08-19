/**
 * File Watcher Service for Code Knowledge Graph
 * Monitors file changes and triggers incremental graph updates
 */

import { Client } from 'fb-watchman';
import { EventEmitter } from 'events';
import winston from 'winston';
import path from 'path';
import fs from 'fs/promises';

export class FileWatcher extends EventEmitter {
  constructor() {
    super();
    this.client = new Client();
    this.watches = new Map();
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

    this.isConnected = false;
    this.watchConfig = {
      expression: [
        'allof',
        ['type', 'f'], // Files only
        ['anyof',
          ['suffix', 'js'],
          ['suffix', 'jsx'],
          ['suffix', 'ts'],
          ['suffix', 'tsx'],
          ['suffix', 'py'],
          ['suffix', 'go'],
          ['suffix', 'rs'],
          ['suffix', 'java'],
          ['suffix', 'cpp'],
          ['suffix', 'cs'],
          ['suffix', 'php'],
          ['suffix', 'rb'],
          ['suffix', 'swift'],
          ['suffix', 'kt']
        ],
        ['not', ['dirname', 'node_modules']],
        ['not', ['dirname', 'dist']],
        ['not', ['dirname', 'build']],
        ['not', ['dirname', 'target']],
        ['not', ['dirname', '__pycache__']]
      ],
      fields: ['name', 'size', 'mtime_ms', 'exists', 'type']
    };

    this.setupClient();
  }

  /**
   * Setup Watchman client
   */
  setupClient() {
    this.client.on('connect', () => {
      this.isConnected = true;
      this.logger.info('Watchman client connected');
      this.emit('connected');
    });

    this.client.on('error', (error) => {
      this.logger.error('Watchman client error:', error);
      this.isConnected = false;
      this.emit('error', error);
    });

    this.client.on('subscription', (resp) => {
      this.handleFileChanges(resp);
    });

    this.client.on('end', () => {
      this.isConnected = false;
      this.logger.info('Watchman client disconnected');
      this.emit('disconnected');
    });
  }

  /**
   * Start watching a directory
   */
  async startWatching(rootPath, projectId) {
    try {
      if (!this.isConnected) {
        await this.connect();
      }

      const watchName = `manito_${projectId}_${Date.now()}`;
      
      // Establish watch
      await this.watchProject(rootPath, watchName);
      
      // Subscribe to changes
      await this.subscribeToChanges(watchName, projectId);
      
      this.watches.set(projectId, {
        rootPath,
        watchName,
        startedAt: new Date().toISOString()
      });

      this.logger.info('Started watching directory', { rootPath, projectId, watchName });
      this.emit('watchStarted', { rootPath, projectId });

      return watchName;
    } catch (error) {
      this.logger.error('Failed to start watching', { error: error.message, rootPath, projectId });
      throw error;
    }
  }

  /**
   * Stop watching a directory
   */
  async stopWatching(projectId) {
    try {
      const watch = this.watches.get(projectId);
      if (!watch) {
        this.logger.warn('No watch found for project', { projectId });
        return;
      }

      // Unsubscribe
      await this.unsubscribe(watch.watchName);
      
      // Remove watch
      await this.removeWatch(watch.rootPath);
      
      this.watches.delete(projectId);
      
      this.logger.info('Stopped watching directory', { projectId, watchName: watch.watchName });
      this.emit('watchStopped', { projectId });
    } catch (error) {
      this.logger.error('Failed to stop watching', { error: error.message, projectId });
      throw error;
    }
  }

  /**
   * Connect to Watchman
   */
  async connect() {
    return new Promise((resolve, reject) => {
      if (this.isConnected) {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Watchman connection timeout'));
      }, 10000);

      this.client.once('connect', () => {
        clearTimeout(timeout);
        resolve();
      });

      this.client.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      // Initiate connection
      this.client.capabilityCheck({
        optional: [],
        required: ['relative_root']
      }, (error) => {
        if (error) {
          clearTimeout(timeout);
          reject(error);
        }
      });
    });
  }

  /**
   * Establish watch on directory
   */
  async watchProject(rootPath, watchName) {
    return new Promise((resolve, reject) => {
      this.client.command(['watch-project', rootPath], (error, resp) => {
        if (error) {
          reject(new Error(`Failed to watch project: ${error.message}`));
          return;
        }

        if ('warning' in resp) {
          this.logger.warn('Watchman warning:', resp.warning);
        }

        this.logger.info('Watch established', { 
          watch: resp.watch, 
          relativePath: resp.relative_path 
        });
        resolve(resp);
      });
    });
  }

  /**
   * Subscribe to file changes
   */
  async subscribeToChanges(watchName, projectId) {
    return new Promise((resolve, reject) => {
      const subscription = {
        expression: this.watchConfig.expression,
        fields: this.watchConfig.fields,
        since: 'n:manito_' + watchName
      };

      this.client.command(['subscribe', watchName, watchName, subscription], (error, resp) => {
        if (error) {
          reject(new Error(`Failed to subscribe: ${error.message}`));
          return;
        }

        this.logger.info('Subscription established', { watchName, projectId });
        resolve(resp);
      });
    });
  }

  /**
   * Handle file change events
   */
  handleFileChanges(resp) {
    try {
      if (!resp.files || resp.files.length === 0) {
        return;
      }

      const changes = resp.files.map(file => ({
        path: file.name,
        exists: file.exists,
        size: file.size,
        mtime: file.mtime_ms,
        type: file.type,
        changeType: this.determineChangeType(file)
      }));

      // Group changes by type
      const grouped = {
        created: changes.filter(c => c.changeType === 'created'),
        modified: changes.filter(c => c.changeType === 'modified'),
        deleted: changes.filter(c => c.changeType === 'deleted')
      };

      this.logger.info('File changes detected', {
        subscription: resp.subscription,
        created: grouped.created.length,
        modified: grouped.modified.length,
        deleted: grouped.deleted.length
      });

      // Emit events for each change type
      if (grouped.created.length > 0) {
        this.emit('filesCreated', grouped.created);
      }
      if (grouped.modified.length > 0) {
        this.emit('filesModified', grouped.modified);
      }
      if (grouped.deleted.length > 0) {
        this.emit('filesDeleted', grouped.deleted);
      }

      // Emit general change event
      this.emit('filesChanged', {
        subscription: resp.subscription,
        changes: grouped,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error('Error handling file changes', { error: error.message, resp });
      this.emit('error', error);
    }
  }

  /**
   * Determine type of file change
   */
  determineChangeType(file) {
    if (!file.exists) {
      return 'deleted';
    } else if (file.new) {
      return 'created';
    } else {
      return 'modified';
    }
  }

  /**
   * Unsubscribe from changes
   */
  async unsubscribe(watchName) {
    return new Promise((resolve, reject) => {
      this.client.command(['unsubscribe', watchName, watchName], (error, resp) => {
        if (error) {
          reject(new Error(`Failed to unsubscribe: ${error.message}`));
          return;
        }
        resolve(resp);
      });
    });
  }

  /**
   * Remove watch
   */
  async removeWatch(rootPath) {
    return new Promise((resolve, reject) => {
      this.client.command(['watch-del', rootPath], (error, resp) => {
        if (error) {
          reject(new Error(`Failed to remove watch: ${error.message}`));
          return;
        }
        resolve(resp);
      });
    });
  }

  /**
   * Get watch status
   */
  getWatchStatus() {
    return {
      isConnected: this.isConnected,
      activeWatches: this.watches.size,
      watches: Array.from(this.watches.entries()).map(([projectId, watch]) => ({
        projectId,
        rootPath: watch.rootPath,
        startedAt: watch.startedAt
      }))
    };
  }

  /**
   * Cleanup and disconnect
   */
  async cleanup() {
    try {
      // Stop all watches
      for (const [projectId] of this.watches.entries()) {
        await this.stopWatching(projectId);
      }

      // End client connection
      this.client.end();
      
      this.logger.info('File watcher cleanup completed');
    } catch (error) {
      this.logger.error('Error during cleanup', { error: error.message });
      throw error;
    }
  }

  /**
   * Health check
   */
  async health() {
    try {
      if (!this.isConnected) {
        return {
          status: 'error',
          message: 'Watchman client not connected'
        };
      }

      return new Promise((resolve) => {
        this.client.command(['version'], (error, resp) => {
          if (error) {
            resolve({
              status: 'error',
              message: `Watchman health check failed: ${error.message}`
            });
          } else {
            resolve({
              status: 'ok',
              message: 'File watcher is healthy',
              version: resp.version,
              watchCount: this.watches.size
            });
          }
        });
      });
    } catch (error) {
      return {
        status: 'error',
        message: `File watcher health check failed: ${error.message}`
      };
    }
  }
}

export default new FileWatcher();
