/**
 * Scan Worker Thread
 * Handles parallel file processing for large codebases
 */

import { parentPort, workerData } from 'worker_threads';
import { CodeScanner } from '../index.js';

class ScanWorker {
  constructor() {
    this.workerId = workerData.workerId;
    this.options = workerData.options;
    this.scanner = new CodeScanner(this.options.scannerOptions || {});
    
    console.log(`Worker ${this.workerId} initialized`);
  }

  /**
   * Process a chunk of files
   */
  async processChunk(files) {
    const results = [];
    
    try {
      for (const file of files) {
        try {
          const result = await this.scanner.scanFile(file);
          if (result) {
            results.push(result);
          }
        } catch (error) {
          console.warn(`Worker ${this.workerId} - Error scanning ${file}:`, error.message);
          // Continue with other files
        }
      }
      
      return results;
    } catch (error) {
      throw new Error(`Worker ${this.workerId} chunk processing failed: ${error.message}`);
    }
  }

  /**
   * Handle messages from main thread
   */
  async handleMessage(message) {
    switch (message.type) {
      case 'PROCESS_CHUNK':
        try {
          const results = await this.processChunk(message.files);
          parentPort.postMessage({
            type: 'CHUNK_COMPLETE',
            workerId: this.workerId,
            results
          });
        } catch (error) {
          parentPort.postMessage({
            type: 'CHUNK_ERROR',
            workerId: this.workerId,
            error: error.message
          });
        }
        break;
        
      default:
        console.warn(`Worker ${this.workerId} - Unknown message type: ${message.type}`);
    }
  }
}

// Initialize worker
const worker = new ScanWorker();

// Listen for messages
parentPort.on('message', (message) => {
  worker.handleMessage(message);
});

// Handle worker errors
process.on('uncaughtException', (error) => {
  console.error(`Worker ${worker.workerId} uncaught exception:`, error);
  parentPort.postMessage({
    type: 'WORKER_ERROR',
    workerId: worker.workerId,
    error: error.message
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(`Worker ${worker.workerId} unhandled rejection:`, reason);
  parentPort.postMessage({
    type: 'WORKER_ERROR',
    workerId: worker.workerId,
    error: reason.toString()
  });
});

console.log(`Worker ${worker.workerId} ready for processing`);
