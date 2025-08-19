/**
 * Large Codebase Performance Optimizer
 * Handles performance optimization for enterprise-scale projects (10k+ files)
 */

import { Worker } from 'worker_threads';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class LargeCodebaseOptimizer {
  constructor(options = {}) {
    this.options = {
      maxWorkers: options.maxWorkers || Math.min(4, require('os').cpus().length),
      chunkSize: options.chunkSize || 100, // Files per chunk
      memoryLimit: options.memoryLimit || 512 * 1024 * 1024, // 512MB
      timeoutPerFile: options.timeoutPerFile || 5000, // 5 seconds
      enableStreaming: options.enableStreaming !== false,
      enableCaching: options.enableCaching !== false,
      ...options
    };

    this.workers = [];
    this.activeJobs = new Map();
    this.cache = new Map();
    this.metrics = {
      filesProcessed: 0,
      totalFiles: 0,
      averageProcessingTime: 0,
      cacheHits: 0,
      cacheMisses: 0,
      memoryUsage: 0
    };
  }

  /**
   * Optimize scanning for large codebases
   */
  async optimizedScan(files, scanner, progressCallback) {
    console.log(`🚀 Starting optimized scan for ${files.length} files...`);
    
    if (files.length < 1000) {
      // Use regular scanning for smaller codebases
      return this.regularScan(files, scanner, progressCallback);
    }

    // Use parallel processing for large codebases
    return this.parallelScan(files, scanner, progressCallback);
  }

  /**
   * Regular scan for smaller codebases
   */
  async regularScan(files, scanner, progressCallback) {
    const results = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        const result = await scanner.scanFile(file);
        if (result) {
          results.push(result);
        }
        
        if (progressCallback) {
          progressCallback({
            progress: ((i + 1) / files.length) * 100,
            currentFile: file,
            processed: i + 1,
            total: files.length
          });
        }
      } catch (error) {
        console.warn(`Error scanning ${file}:`, error.message);
      }
    }

    return results;
  }

  /**
   * Parallel scan for large codebases
   */
  async parallelScan(files, scanner, progressCallback) {
    console.log(`⚡ Using parallel processing (${this.options.maxWorkers} workers)`);
    
    // Initialize workers
    await this.initializeWorkers();
    
    try {
      // Split files into chunks
      const chunks = this.chunkFiles(files);
      console.log(`📦 Split into ${chunks.length} chunks of ~${this.options.chunkSize} files each`);

      // Process chunks in parallel
      const results = await this.processChunksInParallel(chunks, scanner, progressCallback);
      
      return results.flat().filter(Boolean);
    } finally {
      // Clean up workers
      await this.terminateWorkers();
    }
  }

  /**
   * Initialize worker threads
   */
  async initializeWorkers() {
    const workerScript = path.join(__dirname, 'scan-worker.js');
    
    for (let i = 0; i < this.options.maxWorkers; i++) {
      const worker = new Worker(workerScript, {
        workerData: {
          workerId: i,
          options: this.options
        }
      });

      worker.on('error', (error) => {
        console.error(`Worker ${i} error:`, error);
      });

      this.workers.push({
        id: i,
        worker,
        busy: false
      });
    }

    console.log(`👥 Initialized ${this.workers.length} worker threads`);
  }

  /**
   * Terminate all workers
   */
  async terminateWorkers() {
    const promises = this.workers.map(({ worker }) => worker.terminate());
    await Promise.all(promises);
    this.workers = [];
    console.log('🛑 All workers terminated');
  }

  /**
   * Split files into processing chunks
   */
  chunkFiles(files) {
    const chunks = [];
    
    for (let i = 0; i < files.length; i += this.options.chunkSize) {
      chunks.push(files.slice(i, i + this.options.chunkSize));
    }
    
    return chunks;
  }

  /**
   * Process chunks in parallel using workers
   */
  async processChunksInParallel(chunks, scanner, progressCallback) {
    const results = [];
    const activePromises = new Map();
    let completedChunks = 0;
    let processedFiles = 0;

    // Process chunks with worker pool
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // Wait for available worker
      const worker = await this.getAvailableWorker();
      worker.busy = true;

      // Create processing promise
      const promise = this.processChunk(worker, chunk, scanner)
        .then(result => {
          completedChunks++;
          processedFiles += chunk.length;
          
          if (progressCallback) {
            progressCallback({
              progress: (processedFiles / (chunks.length * this.options.chunkSize)) * 100,
              completedChunks,
              totalChunks: chunks.length,
              processedFiles,
              currentChunk: i + 1
            });
          }

          worker.busy = false;
          return result;
        })
        .catch(error => {
          console.error(`Chunk ${i} processing failed:`, error);
          worker.busy = false;
          return [];
        });

      activePromises.set(i, promise);

      // Limit concurrent chunks to prevent memory issues
      if (activePromises.size >= this.options.maxWorkers) {
        const completed = await Promise.race(activePromises.values());
        results.push(completed);
        
        // Remove completed promise
        for (const [key, value] of activePromises.entries()) {
          if (value === completed) {
            activePromises.delete(key);
            break;
          }
        }
      }
    }

    // Wait for remaining chunks
    const remaining = await Promise.all(activePromises.values());
    results.push(...remaining);

    return results;
  }

  /**
   * Get next available worker
   */
  async getAvailableWorker() {
    return new Promise((resolve) => {
      const checkWorkers = () => {
        const available = this.workers.find(w => !w.busy);
        if (available) {
          resolve(available);
        } else {
          setTimeout(checkWorkers, 10);
        }
      };
      checkWorkers();
    });
  }

  /**
   * Process a chunk of files with a worker
   */
  async processChunk(workerInfo, files, scanner) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Chunk processing timeout after ${this.options.timeoutPerFile * files.length}ms`));
      }, this.options.timeoutPerFile * files.length);

      workerInfo.worker.postMessage({
        type: 'PROCESS_CHUNK',
        files,
        scannerOptions: scanner.options
      });

      const handleMessage = (message) => {
        if (message.type === 'CHUNK_COMPLETE') {
          clearTimeout(timeout);
          workerInfo.worker.off('message', handleMessage);
          resolve(message.results);
        } else if (message.type === 'CHUNK_ERROR') {
          clearTimeout(timeout);
          workerInfo.worker.off('message', handleMessage);
          reject(new Error(message.error));
        }
      };

      workerInfo.worker.on('message', handleMessage);
    });
  }

  /**
   * Memory usage monitoring
   */
  monitorMemoryUsage() {
    const usage = process.memoryUsage();
    this.metrics.memoryUsage = usage.heapUsed;

    if (usage.heapUsed > this.options.memoryLimit) {
      console.warn(`⚠️ Memory usage high: ${Math.round(usage.heapUsed / 1024 / 1024)}MB`);
      
      // Trigger garbage collection if available
      if (global.gc) {
        global.gc();
        console.log('🗑️ Garbage collection triggered');
      }
    }

    return usage;
  }

  /**
   * Cache management for repeated scans
   */
  getCachedResult(filePath, lastModified) {
    if (!this.options.enableCaching) return null;

    const cacheKey = `${filePath}:${lastModified}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      this.metrics.cacheHits++;
      return cached;
    }
    
    this.metrics.cacheMisses++;
    return null;
  }

  setCachedResult(filePath, lastModified, result) {
    if (!this.options.enableCaching) return;

    const cacheKey = `${filePath}:${lastModified}`;
    this.cache.set(cacheKey, result);

    // Limit cache size
    if (this.cache.size > 10000) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  /**
   * Get optimization metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      cacheHitRate: this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses),
      memoryUsageMB: Math.round(this.metrics.memoryUsage / 1024 / 1024)
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    await this.terminateWorkers();
    this.cache.clear();
    this.activeJobs.clear();
  }
}
