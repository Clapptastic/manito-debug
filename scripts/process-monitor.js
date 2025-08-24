#!/usr/bin/env node
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..');

class ProcessMonitor {
  constructor() {
    this.processes = new Map();
    this.config = {
      server: {
        script: 'server/app.js',
        name: 'manito-server',
        maxRestarts: 5,
        restartDelay: 2000,
        healthCheck: {
          url: 'http://localhost:3000/health',
          interval: 30000,
          timeout: 5000
        }
      }
    };
    this.restartCounts = new Map();
    this.isShuttingDown = false;
    
    // Setup graceful shutdown
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
  }

  log(message, data = {}) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`, data);
    
    // Append to log file
    const logEntry = `[${timestamp}] ${message} ${JSON.stringify(data)}\n`;
    fs.appendFileSync(path.join(PROJECT_ROOT, 'process-monitor.log'), logEntry);
  }

  async startProcess(processName) {
    const config = this.config[processName];
    if (!config) {
      this.log(`Unknown process: ${processName}`);
      return false;
    }

    if (this.processes.has(processName)) {
      this.log(`Process ${processName} is already running`);
      return true;
    }

    try {
      this.log(`Starting ${processName}...`);
      
      // Load environment variables from .env file
      const envPath = path.join(PROJECT_ROOT, '.env');
      const envVars = { ...process.env, NODE_ENV: 'production' };
      
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const envLines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));
        
        for (const line of envLines) {
          const [key, ...valueParts] = line.split('=');
          if (key && valueParts.length > 0) {
            envVars[key.trim()] = valueParts.join('=').trim();
          }
        }
      }

      const child = spawn('node', [config.script], {
        cwd: PROJECT_ROOT,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: envVars
      });

      // Setup logging
      const logFile = path.join(PROJECT_ROOT, `${processName}.log`);
      const logStream = fs.createWriteStream(logFile, { flags: 'a' });

      child.stdout.on('data', (data) => {
        logStream.write(`[STDOUT] ${data}`);
        if (process.env.DEBUG) {
          console.log(`[${processName}] ${data.toString().trim()}`);
        }
      });

      child.stderr.on('data', (data) => {
        logStream.write(`[STDERR] ${data}`);
        console.error(`[${processName}] ERROR: ${data.toString().trim()}`);
      });

      child.on('exit', (code, signal) => {
        this.log(`Process ${processName} exited`, { code, signal });
        logStream.end();
        this.processes.delete(processName);
        
        if (!this.isShuttingDown) {
          this.handleProcessExit(processName, code, signal);
        }
      });

      child.on('error', (error) => {
        this.log(`Process ${processName} error`, { error: error.message });
        logStream.end();
        this.processes.delete(processName);
        
        if (!this.isShuttingDown) {
          this.handleProcessExit(processName, -1, 'ERROR');
        }
      });

      this.processes.set(processName, {
        child,
        config,
        startTime: new Date(),
        logFile,
        logStream
      });

      this.log(`Process ${processName} started with PID: ${child.pid}`);
      
      // Setup health monitoring if configured
      if (config.healthCheck) {
        this.setupHealthCheck(processName);
      }
      
      return true;
    } catch (error) {
      this.log(`Failed to start ${processName}`, { error: error.message });
      return false;
    }
  }

  setupHealthCheck(processName) {
    const process = this.processes.get(processName);
    if (!process || !process.config.healthCheck) return;

    const { url, interval, timeout } = process.config.healthCheck;
    
    // Wait a bit before starting health checks
    setTimeout(() => {
      const healthInterval = setInterval(async () => {
        if (!this.processes.has(processName) || this.isShuttingDown) {
          clearInterval(healthInterval);
          return;
        }

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeout);
          
          const response = await fetch(url, {
            signal: controller.signal,
            timeout: timeout
          });
          
          clearTimeout(timeoutId);
          
          if (response.ok) {
            this.log(`Health check passed for ${processName}`, { status: response.status });
          } else {
            this.log(`Health check failed for ${processName}`, { status: response.status });
            // Could restart process here if needed
          }
        } catch (error) {
          this.log(`Health check error for ${processName}`, { error: error.message });
          // Could restart process here if needed
        }
      }, interval);
      
      // Store interval for cleanup
      process.healthInterval = healthInterval;
      
    }, 10000); // Wait 10 seconds before starting health checks
  }

  handleProcessExit(processName, code, signal) {
    const restartCount = this.restartCounts.get(processName) || 0;
    const maxRestarts = this.config[processName]?.maxRestarts || 5;
    
    this.log(`Process ${processName} needs restart`, { 
      restartCount, 
      maxRestarts, 
      code, 
      signal 
    });

    if (restartCount < maxRestarts) {
      this.restartCounts.set(processName, restartCount + 1);
      
      setTimeout(() => {
        if (!this.isShuttingDown) {
          this.log(`Attempting restart ${restartCount + 1}/${maxRestarts} for ${processName}`);
          this.startProcess(processName);
        }
      }, this.config[processName]?.restartDelay || 2000);
    } else {
      this.log(`Max restarts exceeded for ${processName}. Process will not be restarted.`);
    }
  }

  stopProcess(processName) {
    const process = this.processes.get(processName);
    if (!process) {
      this.log(`Process ${processName} is not running`);
      return false;
    }

    this.log(`Stopping ${processName}...`);
    
    // Clear health check interval
    if (process.healthInterval) {
      clearInterval(process.healthInterval);
    }
    
    // Close log stream
    if (process.logStream) {
      process.logStream.end();
    }
    
    // Graceful shutdown
    process.child.kill('SIGTERM');
    
    // Force kill after timeout
    setTimeout(() => {
      if (this.processes.has(processName)) {
        this.log(`Force killing ${processName}`);
        process.child.kill('SIGKILL');
      }
    }, 5000);
    
    return true;
  }

  getStatus() {
    const status = {};
    
    for (const [name, process] of this.processes.entries()) {
      status[name] = {
        pid: process.child.pid,
        startTime: process.startTime,
        uptime: Date.now() - process.startTime.getTime(),
        restarts: this.restartCounts.get(name) || 0,
        logFile: process.logFile
      };
    }
    
    return status;
  }

  async shutdown() {
    if (this.isShuttingDown) return;
    
    this.isShuttingDown = true;
    this.log('Shutting down process monitor...');
    
    // Stop all processes
    const stopPromises = [];
    for (const processName of this.processes.keys()) {
      stopPromises.push(new Promise((resolve) => {
        this.stopProcess(processName);
        // Wait for process to exit
        const checkInterval = setInterval(() => {
          if (!this.processes.has(processName)) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      }));
    }
    
    // Wait for all processes to stop
    await Promise.all(stopPromises);
    
    this.log('All processes stopped. Monitor exiting.');
    process.exit(0);
  }

  // CLI interface
  async handleCommand(command, processName) {
    switch (command) {
      case 'start':
        if (processName) {
          await this.startProcess(processName);
        } else {
          // Start all configured processes
          for (const name of Object.keys(this.config)) {
            await this.startProcess(name);
          }
        }
        break;
        
      case 'stop':
        if (processName) {
          this.stopProcess(processName);
        } else {
          this.shutdown();
        }
        break;
        
      case 'restart':
        if (processName) {
          this.stopProcess(processName);
          setTimeout(() => this.startProcess(processName), 2000);
        }
        break;
        
      case 'status':
        console.log('Process Status:');
        console.log(JSON.stringify(this.getStatus(), null, 2));
        break;
        
      case 'logs':
        if (processName) {
          const process = this.processes.get(processName);
          if (process && fs.existsSync(process.logFile)) {
            console.log(`\n=== Logs for ${processName} ===`);
            console.log(fs.readFileSync(process.logFile, 'utf8'));
          } else {
            console.log(`No logs found for ${processName}`);
          }
        }
        break;
        
      default:
        console.log(`
Process Monitor Commands:
  node scripts/process-monitor.js start [processName]  - Start process(es)
  node scripts/process-monitor.js stop [processName]   - Stop process(es)
  node scripts/process-monitor.js restart processName  - Restart process
  node scripts/process-monitor.js status               - Show status
  node scripts/process-monitor.js logs processName     - Show logs

Available processes: ${Object.keys(this.config).join(', ')}
        `);
    }
  }
}

// CLI entry point
if (process.argv[1] === __filename) {
  const monitor = new ProcessMonitor();
  const command = process.argv[2];
  const processName = process.argv[3];
  
  monitor.handleCommand(command, processName).catch(console.error);
  
  // Keep alive for monitoring mode
  if (command === 'start') {
    console.log('Process monitor running. Press Ctrl+C to stop all processes and exit.');
  }
}

export default ProcessMonitor;