import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import AdmZip from 'adm-zip';
import { createServer } from 'http';
import Joi from 'joi';
import winston from 'winston';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { CodeScanner } from '@manito/core';
import aiService from './services/ai.js';
import enhancedDb from './services/enhancedDatabase.js';
import Project from './models/Project.js';
import Scan from './models/Scan.js';
import User from './models/User.js';
import authRoutes from './routes/auth.js';
import { authenticate, optionalAuth, apiRateLimit, userContext } from './middleware/auth.js';
import StreamingScanner from './services/scanner.js';
import scanQueue from './services/scanQueue.js';
import migrations from './services/migrations.js';
import AIAnalysisFormatter from '../core/ai-analysis.js';
import WebSocketService from './services/websocket.js';
import semanticSearchService from './services/semanticSearch.js';
import { validateConfig } from './config/ports.js';
import dynamicPortManager from './services/portManager.js';

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

const app = express();
const server = createServer(app);

// Initialize WebSocket service
const wsService = new WebSocketService(server);

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(express.static('public'));

// CORS configuration (will be updated after port manager is initialized)
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Configure multer for file uploads
const uploadDir = path.join(__dirname, 'uploads');
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${timestamp}-${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.zip', '.tar', '.tar.gz'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only zip and tar files are allowed'));
    }
  }
});

// Rate limiting and user context
app.use(apiRateLimit);
app.use(optionalAuth);
app.use(userContext);

// Request validation schemas
const scanRequestSchema = Joi.object({
  path: Joi.string().required(),
  async: Joi.boolean().default(false), // Whether to run scan asynchronously
  options: Joi.object({
    patterns: Joi.array().items(Joi.string()).optional(),
    excludePatterns: Joi.array().items(Joi.string()).optional(),
    maxFileSize: Joi.number().positive().optional(),
    maxConcurrency: Joi.number().min(1).max(8).optional(),
    timeout: Joi.number().min(1000).max(600000).optional() // 1s to 10min
  }).optional()
});

// WebSocket service event handlers
wsService.on('clientConnected', (clientInfo) => {
  logger.info('WebSocket client connected', { clientId: clientInfo.id });
});

wsService.on('clientDisconnected', (clientInfo) => {
  logger.info('WebSocket client disconnected', { clientId: clientInfo.id });
});

wsService.on('serverError', (error) => {
  logger.error('WebSocket server error', { error: error.message });
});

// Broadcast to WebSocket clients using the service
function broadcast(channel, data) {
  return wsService.broadcast(channel, data);
}

// Set up scan queue event listeners for WebSocket broadcasting
scanQueue.on('jobQueued', (jobData) => {
  broadcast('scanQueue', { event: 'jobQueued', job: jobData });
});

scanQueue.on('jobStarted', (jobData) => {
  broadcast('scanQueue', { event: 'jobStarted', job: jobData });
});

scanQueue.on('scanStarted', (data) => {
  broadcast('scan', { event: 'started', ...data });
});

scanQueue.on('scanProgress', (progressData) => {
  broadcast('scan', { event: 'progress', ...progressData });
});

scanQueue.on('jobCompleted', (data) => {
  broadcast('scanQueue', { event: 'jobCompleted', job: data });
  broadcast('scan', { event: 'completed', ...data });
});

scanQueue.on('jobFailed', (data) => {
  broadcast('scanQueue', { event: 'jobFailed', job: data });
  broadcast('scan', { event: 'failed', ...data });
});

scanQueue.on('jobCancelled', (data) => {
  broadcast('scanQueue', { event: 'jobCancelled', job: data });
  broadcast('scan', { event: 'cancelled', ...data });
});

// Auth routes
app.use('/api/auth', authRoutes);

// API Routes
  // Health check endpoint
  app.get('/api/health', async (req, res) => {
    const detailed = req.query.detailed === 'true';
    const startTime = Date.now();
    
    try {
      // Basic health check
      const basicHealth = {
        status: 'ok',
        message: 'Manito API Server',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        authenticated: false
      };
      
      if (!detailed) {
        return res.json(basicHealth);
      }
      
      // Detailed health check
      const detailedHealth = {
        ...basicHealth,
        system: {
          memory: process.memoryUsage(),
          cpu: process.cpuUsage(),
          platform: process.platform,
          nodeVersion: process.version
        },
        services: {}
      };
      
      // Database health
      try {
        const dbHealth = await enhancedDb.health();
        detailedHealth.services.database = {
          status: dbHealth.connected ? 'ok' : 'error',
          connected: dbHealth.connected,
          pool: dbHealth.pool,
          cache: dbHealth.cache,
          serverTime: dbHealth.serverTime,
          version: dbHealth.version,
          mockMode: dbHealth.mockMode,
          tables: dbHealth.tables?.length || 0,
          functions: dbHealth.functions?.length || 0,
          indexes: dbHealth.indexes?.length || 0,
          message: dbHealth.connected ? 'Database connected and healthy' : 'Database connection failed'
        };
      } catch (error) {
        detailedHealth.services.database = {
          status: 'error',
          connected: false,
          error: error.message,
          message: 'Database health check failed'
        };
      }
      
      // WebSocket health
      try {
        const wsHealth = wsService.getHealth();
        detailedHealth.services.websocket = {
          status: wsHealth.status,
          connections: wsHealth.connections,
          uptime: wsHealth.uptime,
          timestamp: wsHealth.timestamp
        };
      } catch (error) {
        detailedHealth.services.websocket = {
          status: 'error',
          error: error.message,
          message: 'WebSocket health check failed'
        };
      }
      
      // Semantic search health
      try {
        const searchHealth = await semanticSearchService.getHealth();
        detailedHealth.services.semanticSearch = {
          status: searchHealth.status,
          features: searchHealth.features,
          indexes: searchHealth.indexes,
          functions: searchHealth.functions
        };
      } catch (error) {
        detailedHealth.services.semanticSearch = {
          status: 'error',
          error: error.message,
          message: 'Semantic search health check failed'
        };
      }
      
      // AI service health
      try {
        const aiHealth = await aiService.getHealth();
        detailedHealth.services.ai = {
          status: aiHealth.status,
          providers: aiHealth.providers
        };
      } catch (error) {
        detailedHealth.services.ai = {
          status: 'error',
          error: error.message,
          message: 'AI service health check failed'
        };
      }
      
      // Determine overall status
      const serviceStatuses = Object.values(detailedHealth.services).map(s => s.status);
      if (serviceStatuses.includes('error')) {
        detailedHealth.status = 'degraded';
      }
      
      const duration = Date.now() - startTime;
      detailedHealth.responseTime = `${duration}ms`;
      
      res.json(detailedHealth);
    } catch (error) {
      logger.error('Health check failed', { error: error.message });
      res.status(500).json({
        status: 'error',
        message: 'Health check failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Port configuration endpoint
  app.get('/api/ports', (req, res) => {
    try {
      const portInfo = dynamicPortManager.getPortInfo();
      res.json({
        success: true,
        data: {
          server: portInfo.config.server,
          client: portInfo.config.client,
          websocket: portInfo.config.websocket,
          environment: portInfo.environment,
          urls: portInfo.urls
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Port configuration not available'
      });
    }
  });

// Migration endpoints
app.get('/api/migrations/status', async (req, res) => {
  try {
    const status = await migrations.getMigrationStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Migration status check failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get migration status',
      message: error.message
    });
  }
});

app.post('/api/migrations/run', async (req, res) => {
  try {
    const result = await migrations.runMigrations();
    res.json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (error) {
    logger.error('Migration execution failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Migration failed',
      message: error.message
    });
  }
});

app.get('/api/migrations/reset', async (req, res) => {
  try {
    // Reset circuit breaker
    migrations.circuitBreaker.onSuccess();
    res.json({
      success: true,
      message: 'Migration circuit breaker reset successfully'
    });
  } catch (error) {
    logger.error('Migration reset failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Migration reset failed',
      message: error.message
    });
  }
});



// Scan endpoint - supports both sync and async modes
app.post('/api/scan', async (req, res) => {
  try {
    const { error, value } = scanRequestSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.details.map(d => d.message)
      });
    }

    const { path: scanPath, async: isAsync = false, options = {} } = value;
    
    // Resolve relative paths to absolute paths relative to project root (one level up from server)
    const projectRoot = path.resolve(__dirname, '..');
    const resolvedPath = path.isAbsolute(scanPath) ? scanPath : path.resolve(projectRoot, scanPath);
    
    const userId = req.user ? req.user.id : null;
    
    logger.info('Starting code scan', { 
      path: resolvedPath, 
      async: isAsync, 
      userId: userId || 'anonymous'
    });

    if (isAsync) {
      // Async mode: Queue the job and return immediately
      const jobId = await scanQueue.addJob({
        path: resolvedPath,
        options,
        userId
      });

      logger.info('Scan queued', { jobId, path: resolvedPath });

      res.json({
        success: true,
        async: true,
        jobId,
        message: 'Scan queued for processing',
        data: {
          jobId,
          status: 'queued',
          path: resolvedPath
        }
      });

    } else {
      // Sync mode: Use basic scanner
      let scanResult;
      try {
        const { CodeScanner } = await import('@manito/core');
        const scanner = new CodeScanner();
        scanResult = await scanner.scan(resolvedPath);
      } catch (error) {
        logger.error('Scanner error:', error);
        throw error;
      }
      
      // Ensure scanResult is serializable
      const serializableResult = {
        id: scanResult.id,
        timestamp: scanResult.timestamp,
        scanTime: scanResult.scanTime,
        rootPath: scanResult.rootPath,
        files: scanResult.files || [],
        dependencies: scanResult.dependencies || {},
        metrics: scanResult.metrics || {},
        conflicts: scanResult.conflicts || []
      };
      
      // Find or create project and save results
      let project;
      try {
        project = await Project.findByPath(resolvedPath, userId);
        if (!project) {
          const projectName = resolvedPath.split('/').pop() || 'Unknown Project';
          project = await Project.create({
            name: projectName,
            path: resolvedPath,
            description: `Auto-created for scan of ${resolvedPath}`
          }, userId);
        }
      } catch (error) {
        logger.error('Project operation error:', error);
        throw error;
      }

      // Create scan record and save results
      let scan;
      try {
        scan = await Scan.create({
          project_id: project.id,
          scan_options: options,
          status: 'running'
        });

        await scan.complete({
          files: serializableResult.files || [],
          conflicts: serializableResult.conflicts || [],
          dependencies: serializableResult.dependencies ? Object.entries(serializableResult.dependencies).map(([from, to]) => ({ from, to })) : [],
          metrics: serializableResult.metrics || {}
        });

        await project.updateScanStatus('completed');
      } catch (error) {
        logger.error('Database operation failed', { error: error.message });
        // Continue without database persistence
        scan = { id: 'temp_' + Date.now(), completed_at: new Date() };
      }

      logger.info('Sync scan completed', { 
        scanId: scan.id, 
        files: serializableResult.files.length,
        scanTime: serializableResult.scanTime
      });

      broadcast('scan', { 
        event: 'completed', 
        scanId: scan.id,
        projectId: project.id,
        summary: {
          files: serializableResult.files.length,
          conflicts: serializableResult.conflicts.length,
          linesOfCode: serializableResult.metrics?.linesOfCode || 0
        }
      });

      // Return enhanced result
      const result = {
        ...serializableResult,
        scanId: scan.id,
        projectId: project.id,
        project: {
          name: project.name,
          path: project.path
        },
        savedAt: scan.completed_at
      };

      res.json({ success: true, async: false, data: result });
    }

      } catch (error) {
      logger.error('Scan endpoint error', error);
      
      broadcast('scan', { 
        event: 'failed', 
        error: error.message,
        path: req.body.path
      });

      res.status(500).json({
        success: false,
        error: 'Scan failed',
        message: error.message
      });
    }
});

// Upload and scan endpoint
app.post('/api/upload', upload.single('projectFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No file uploaded' 
      });
    }

    const uploadedFile = req.file;
    const projectName = req.body.projectName || path.parse(uploadedFile.originalname).name;
    const userId = req.user ? req.user.id : null;

    logger.info('Processing uploaded file', {
      filename: uploadedFile.originalname,
      size: uploadedFile.size,
      projectName,
      userId: userId || 'anonymous'
    });

    // Handle single file upload (not just zip files)
    let extractDir;
    let scanPath;

    if (uploadedFile.originalname.endsWith('.zip')) {
      // Extract zip file
      extractDir = path.join(__dirname, 'uploads', 'extracted', `${Date.now()}-${projectName}`);
      await fs.mkdir(extractDir, { recursive: true });

      try {
        const zip = new AdmZip(uploadedFile.path);
        zip.extractAllTo(extractDir, true);
        scanPath = extractDir;
      } catch (extractError) {
        logger.error('Zip extraction failed', extractError);
        throw new Error('Failed to extract zip file');
      }
    } else {
      // Handle single file upload
      const singleFileDir = path.join(__dirname, 'uploads', 'single-files', `${Date.now()}-${projectName}`);
      await fs.mkdir(singleFileDir, { recursive: true });
      
      // Copy the uploaded file to the directory
      const targetPath = path.join(singleFileDir, uploadedFile.originalname);
      await fs.copyFile(uploadedFile.path, targetPath);
      
      extractDir = singleFileDir;
      scanPath = singleFileDir;
    }

    logger.info('File prepared for scanning', { extractDir, scanPath });

    // Clean up uploaded file
    await fs.unlink(uploadedFile.path);

    // Start scanning the prepared directory
    const scanOptions = {
      patterns: req.body.patterns ? JSON.parse(req.body.patterns) : ['**/*.{js,jsx,ts,tsx}'],
      excludePatterns: req.body.excludePatterns ? JSON.parse(req.body.excludePatterns) : ['node_modules/**', 'dist/**', 'build/**', '.git/**']
    };

    let scanResult;
    try {
      const { CodeScanner } = await import('@manito/core');
      const scanner = new CodeScanner();
      scanResult = await scanner.scan(scanPath);
    } catch (error) {
      logger.error('Scanner error:', error);
      throw error;
    }

    // Create project and scan records
    let project;
    try {
      project = await Project.create({
        name: projectName,
        path: extractDir,
        description: `Uploaded project: ${uploadedFile.originalname}`,
        source: 'upload'
      }, userId);
    } catch (error) {
      logger.error('Project creation error:', error);
      throw error;
    }

    let scan;
    try {
      scan = await Scan.create({
        project_id: project.id,
        scan_options: scanOptions,
        status: 'running'
      });

      // Clean and serialize data for database storage
      const cleanScanResults = {
        files: (scanResult.files || []).map(file => ({
          filePath: file.filePath,
          lines: file.lines,
          size: file.size,
          isTypeScript: file.isTypeScript,
          isJSX: file.isJSX,
          complexity: file.complexity,
          imports: file.imports || [],
          exports: file.exports || [],
          functions: file.functions || [],
          variables: file.variables || []
        })),
        conflicts: scanResult.conflicts || [],
        dependencies: scanResult.dependencies ? Object.entries(scanResult.dependencies).map(([from, to]) => ({ from, to })) : [],
        metrics: {
          filesScanned: scanResult.metrics?.filesScanned || 0,
          linesOfCode: scanResult.metrics?.linesOfCode || 0,
          dependencies: scanResult.metrics?.dependencies || 0,
          conflicts: scanResult.metrics?.conflicts?.length || 0
        }
      };

      await scan.complete(cleanScanResults);
      await project.updateScanStatus('completed');
    } catch (error) {
      logger.error('Database operation failed', { error: error.message });
      // Continue without database persistence
      scan = { id: 'temp_' + Date.now(), completed_at: new Date() };
    }

    // Broadcast completion
    broadcast('scan', { 
      event: 'completed', 
      scanId: scan.id,
      projectId: project.id,
      source: 'upload',
      summary: {
        files: scanResult.files.length,
        conflicts: scanResult.conflicts.length,
        linesOfCode: scanResult.metrics?.linesOfCode || 0
      }
    });

    logger.info('Upload scan completed', { 
      projectId: project.id,
      scanId: scan.id, 
      files: scanResult.files.length,
      extractDir
    });

    // Return results
    const result = {
      ...scanResult,
      scanId: scan.id,
      projectId: project.id,
      project: {
        name: project.name,
        path: extractDir,
        source: 'upload'
      },
      savedAt: scan.completed_at,
      extractDir // Include for cleanup later if needed
    };

    res.json({ 
      success: true, 
      source: 'upload',
      data: result 
    });

  } catch (error) {
    logger.error('Upload endpoint error', error);
    
    // Clean up uploaded file if it exists
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        logger.error('Failed to clean up uploaded file', cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      error: 'Upload failed',
      message: error.message
    });
  }
});

// Browser directory upload endpoint
app.post('/api/upload-directory', async (req, res) => {
  try {
    const { projectData, projectName, source } = req.body;
    
    if (!projectData) {
      return res.status(400).json({ 
        success: false, 
        error: 'No project data provided' 
      });
    }

    const data = typeof projectData === 'string' ? JSON.parse(projectData) : projectData;
    const userId = req.user ? req.user.id : null;

    logger.info('Processing browser directory upload', {
      projectName: projectName || data.name,
      filesCount: data.files.length,
      source: source || 'browser-directory',
      userId: userId || 'anonymous'
    });

    // Create a temporary directory structure in memory for scanning
    const tempDir = path.join(__dirname, 'uploads', 'browser-temp', `${Date.now()}-${projectName || data.name}`);
    await fs.mkdir(tempDir, { recursive: true });

    try {
      // Write files to temporary directory
      for (const file of data.files) {
        const filePath = path.join(tempDir, file.path);
        const fileDir = path.dirname(filePath);
        
        // Ensure directory exists
        await fs.mkdir(fileDir, { recursive: true });
        
        // Write file content
        await fs.writeFile(filePath, file.content, 'utf-8');
      }

      logger.info('Files written to temporary directory', { tempDir, fileCount: data.files.length });

      // Scan the temporary directory
      const scanOptions = {
        patterns: ['**/*.{js,jsx,ts,tsx}'],
        excludePatterns: ['node_modules/**', 'dist/**', 'build/**', '.git/**']
      };

      let scanResult;
      try {
        const { CodeScanner } = await import('@manito/core');
        const scanner = new CodeScanner();
        scanResult = await scanner.scan(tempDir);
      } catch (error) {
        logger.error('Scanner error:', error);
        throw error;
      }

      // Create project and scan records
      let project;
      try {
        project = await Project.create({
          name: projectName || data.name,
          path: tempDir,
          description: `Browser directory upload: ${data.files.length} files`,
          source: 'browser-directory'
        }, userId);
      } catch (error) {
        logger.error('Project creation error:', error);
        throw error;
      }

      let scan;
      try {
        scan = await Scan.create({
          project_id: project.id,
          scan_options: scanOptions,
          status: 'running'
        });

        // Clean and serialize data for database storage
        const cleanScanResults = {
          files: (scanResult.files || []).map(file => ({
            filePath: file.filePath,
            lines: file.lines,
            size: file.size,
            isTypeScript: file.isTypeScript,
            isJSX: file.isJSX,
            complexity: file.complexity,
            imports: file.imports || [],
            exports: file.exports || [],
            functions: file.functions || [],
            variables: file.variables || []
          })),
          conflicts: scanResult.conflicts || [],
          dependencies: scanResult.dependencies ? Object.entries(scanResult.dependencies).map(([from, to]) => ({ from, to })) : [],
          metrics: {
            filesScanned: scanResult.metrics?.filesScanned || 0,
            linesOfCode: scanResult.metrics?.linesOfCode || 0,
            dependencies: scanResult.metrics?.dependencies || 0,
            conflicts: scanResult.metrics?.conflicts?.length || 0
          }
        };

        await scan.complete(cleanScanResults);

        await project.updateScanStatus('completed');
      } catch (error) {
        logger.error('Database operation failed', { error: error.message });
        // Continue without database persistence
        scan = { id: 'temp_' + Date.now(), completed_at: new Date() };
      }

      // Clean up temporary directory after a delay (allow time for any additional processing)
      setTimeout(async () => {
        try {
          await fs.rm(tempDir, { recursive: true, force: true });
          logger.info('Cleaned up temporary directory', { tempDir });
        } catch (cleanupError) {
          logger.warn('Failed to clean up temporary directory', { tempDir, error: cleanupError.message });
        }
      }, 30000); // 30 seconds

      // Broadcast completion
      broadcast('scan', { 
        event: 'completed', 
        scanId: scan.id,
        projectId: project.id,
        source: 'browser-directory',
        summary: {
          files: scanResult.files.length,
          conflicts: scanResult.conflicts.length,
          linesOfCode: scanResult.metrics?.linesOfCode || 0
        }
      });

      logger.info('Browser directory scan completed', { 
        projectId: project.id,
        scanId: scan.id, 
        files: scanResult.files.length,
        tempDir
      });

      // Return results
      const result = {
        ...scanResult,
        scanId: scan.id,
        projectId: project.id,
        project: {
          name: project.name,
          path: tempDir,
          source: 'browser-directory'
        },
        savedAt: scan.completed_at,
        filesUploaded: data.files.length
      };

      res.json({ 
        success: true, 
        source: 'browser-directory',
        data: result 
      });

    } catch (processingError) {
      logger.error('Browser directory processing failed', processingError);
      
      // Clean up temporary directory
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (cleanupError) {
        logger.error('Failed to clean up temporary directory after error', cleanupError);
      }

      res.status(500).json({
        success: false,
        error: 'Failed to process directory upload',
        message: processingError.message
      });
    }

  } catch (error) {
    logger.error('Browser directory upload endpoint error', error);
    
    res.status(500).json({
      success: false,
      error: 'Directory upload failed',
      message: error.message
    });
  }
});

// Scan queue endpoints
app.get('/api/scan/queue', (req, res) => {
  try {
    const queueStatus = scanQueue.getQueueStatus();
    res.json({ success: true, data: queueStatus });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get queue status', message: error.message });
  }
});

app.get('/api/scan/jobs', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const jobs = scanQueue.getAllJobs(limit);
    res.json({ success: true, data: jobs });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get jobs', message: error.message });
  }
});

app.get('/api/scan/jobs/:jobId', (req, res) => {
  try {
    const { jobId } = req.params;
    const job = scanQueue.getJobStatus(jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    res.json({ success: true, data: job });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get job status', message: error.message });
  }
});

app.delete('/api/scan/jobs/:jobId', (req, res) => {
  try {
    const { jobId } = req.params;
    const cancelled = scanQueue.cancelJob(jobId);
    
    if (!cancelled) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    res.json({ success: true, message: 'Job cancelled' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel job', message: error.message });
  }
});

// Metrics endpoint - enhanced with queue metrics
app.get('/api/metrics', (req, res) => {
  const queueStatus = scanQueue.getQueueStatus();
  const metrics = {
    server: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    },
    websocket: wsService.getHealth(),
    scanQueue: queueStatus
  };
  res.json(metrics);
});

// AI providers endpoint
app.get('/api/ai/providers', (req, res) => {
  try {
    const providers = aiService.getAvailableProviders();
    res.json({ success: true, providers });
  } catch (error) {
    logger.error('Failed to get AI providers', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get providers', 
      message: error.message 
    });
  }
});

// AI settings update endpoint
app.post('/api/ai/settings', async (req, res) => {
  try {
    const { aiApiKeys, aiProvider } = req.body;
    
    if (!aiApiKeys || typeof aiApiKeys !== 'object') {
      return res.status(400).json({ error: 'AI API keys are required' });
    }
    
    // Update environment variables for the current process
    if (aiApiKeys.openai) {
      process.env.OPENAI_API_KEY = aiApiKeys.openai;
    }
    if (aiApiKeys.anthropic) {
      process.env.ANTHROPIC_API_KEY = aiApiKeys.anthropic;
    }
    if (aiApiKeys.google) {
      process.env.GOOGLE_API_KEY = aiApiKeys.google;
    }
    
    // Reinitialize AI service with new keys
    aiService.initializeProviders();
    
    logger.info('AI settings updated', { 
      hasOpenAI: !!aiApiKeys.openai,
      hasAnthropic: !!aiApiKeys.anthropic,
      hasGoogle: !!aiApiKeys.google,
      provider: aiProvider 
    });
    
    res.json({ 
      success: true, 
      message: 'AI settings updated successfully',
      providers: aiService.getAvailableProviders()
    });
    
  } catch (error) {
    logger.error('Failed to update AI settings', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update AI settings', 
      message: error.message 
    });
  }
});

// Semantic Search API endpoints
app.get('/api/search', async (req, res) => {
  try {
    const { q: query, type, userId, limit = 20, offset = 0 } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    let results;
    const userIdParam = req.user?.id || userId;
    
    switch (type) {
      case 'projects':
        results = await semanticSearchService.searchProjects(query, userIdParam, parseInt(limit), parseInt(offset));
        break;
      case 'scans':
        results = await semanticSearchService.searchScanResults(query, null, parseInt(limit), parseInt(offset));
        break;
      case 'files':
        results = await semanticSearchService.searchFiles(query, null, parseInt(limit), parseInt(offset));
        break;
      case 'dependencies':
        results = await semanticSearchService.searchDependencies(query, null, parseInt(limit), parseInt(offset));
        break;
      case 'conflicts':
        results = await semanticSearchService.searchConflicts(query, null, parseInt(limit), parseInt(offset));
        break;
      default:
        results = await semanticSearchService.globalSearch(query, userIdParam, parseInt(limit));
    }
    
    // Log search query
    await semanticSearchService.logSearch({
      query,
      userId: userIdParam,
      resultCount: results.total || results.data?.total || 0,
      duration: 0,
      entityTypes: results.data?.entityTypes || []
    });
    
    res.json({
      success: true,
      data: results
    });
    
  } catch (error) {
    logger.error('Search failed', { error: error.message, query: req.query.q });
    res.status(500).json({ 
      success: false, 
      error: 'Search failed', 
      message: error.message 
    });
  }
});

// Advanced search endpoint
app.post('/api/search/advanced', async (req, res) => {
  try {
    const { query, entityTypes, projectId, dateRange, severity, limit = 50, offset = 0 } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const userId = req.user?.id;
    
    const results = await semanticSearchService.advancedSearch({
      query,
      userId,
      entityTypes,
      projectId,
      dateRange,
      severity,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    // Log search query
    await semanticSearchService.logSearch(query, userId, 'advanced', results.total);
    
    res.json({
      success: true,
      data: results
    });
    
  } catch (error) {
    logger.error('Advanced search failed', { error: error.message });
    res.status(500).json({ 
      success: false, 
      error: 'Advanced search failed', 
      message: error.message 
    });
  }
});

// Search suggestions endpoint
app.get('/api/search/suggestions', async (req, res) => {
  try {
    const { q: query, userId, limit = 10 } = req.query;
    
    if (!query) {
      return res.json({ success: true, data: [] });
    }
    
    const userIdParam = req.user?.id || userId;
    const suggestions = await semanticSearchService.getSearchSuggestions(query, userIdParam, parseInt(limit));
    
    res.json({
      success: true,
      data: suggestions
    });
    
  } catch (error) {
    logger.error('Search suggestions failed', { error: error.message });
    res.status(500).json({ 
      success: false, 
      error: 'Search suggestions failed', 
      message: error.message 
    });
  }
});

// Search analytics endpoint
app.get('/api/search/analytics', async (req, res) => {
  try {
    const { userId, days = 30 } = req.query;
    const userIdParam = req.user?.id || userId;
    
    const analytics = await semanticSearchService.getSearchAnalytics(userIdParam, parseInt(days));
    
    res.json({
      success: true,
      data: analytics
    });
    
  } catch (error) {
    logger.error('Search analytics failed', { error: error.message });
    res.status(500).json({ 
      success: false, 
      error: 'Search analytics failed', 
      message: error.message 
    });
  }
});

// AI integration endpoint
app.post('/api/ai/send', async (req, res) => {
  try {
    const { message, context, provider = 'local' } = req.body;
    
    // Validate input
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required and must be a string' });
    }
    
    logger.info('AI request', { provider, messageLength: message.length, hasContext: !!context });
    
    // Use real AI service
    const response = await aiService.sendMessage(message, context, provider);
    
    logger.info('AI response generated', { 
      provider: response.provider, 
      confidence: response.confidence,
      suggestionsCount: response.suggestions.length 
    });
    
    res.json({ success: true, data: response });
    broadcast('ai', { status: 'response', response });
    
  } catch (error) {
    logger.error('AI request failed', error);
    res.status(500).json({ 
      success: false, 
      error: 'AI request failed', 
      message: error.message 
    });
  }
});

// AI Analysis endpoint - generates comprehensive data for AI tools
app.post('/api/ai/analyze', async (req, res) => {
  try {
    const { path: scanPath, options = {} } = req.body;
    
    if (!scanPath) {
      return res.status(400).json({ error: 'Path is required' });
    }

    // Resolve relative paths to absolute paths relative to project root
    const projectRoot = path.resolve(__dirname, '..');
    const resolvedPath = path.isAbsolute(scanPath) ? scanPath : path.resolve(projectRoot, scanPath);

    logger.info('Starting comprehensive AI analysis', { path: resolvedPath });

    // Step 1: Perform initial scan to get file list
    const { CodeScanner } = await import('@manito/core');
    const scanner = new CodeScanner(options);
    const scanResult = await scanner.scan(resolvedPath);

    // Step 2: Get all file paths for AI analysis
    const filePaths = scanResult.files
      .filter(file => file && file.path)
      .map(file => file.path);

    // Step 3: Perform AI-powered analysis
    const { AIAnalysisService } = await import('@manito/core');
    const aiAnalysisService = new AIAnalysisService(aiService);
    const aiAnalysis = await aiAnalysisService.analyzeCodebase(filePaths, options);

    // Step 4: Generate comprehensive AI-ready analysis data
    const aiAnalysisData = {
      metadata: {
        projectName: scanResult.packageInfo?.name || 'Unknown Project',
        version: scanResult.packageInfo?.version || '1.0.0',
        scanTimestamp: new Date().toISOString(),
        totalFiles: scanResult.metrics.filesScanned,
        totalLines: scanResult.metrics.linesOfCode,
        totalDependencies: scanResult.metrics.dependencies,
        projectType: detectProjectType(scanResult),
        framework: detectFramework(scanResult),
        buildTools: detectBuildTools(scanResult)
      },
      
      // AI-powered quality metrics
      qualityMetrics: {
        complexity: aiAnalysis.aiInsights.qualityMetrics.complexity,
        maintainability: aiAnalysis.aiInsights.qualityMetrics.maintainability,
        readability: aiAnalysis.aiInsights.qualityMetrics.readability,
        testability: aiAnalysis.aiInsights.qualityMetrics.testability,
        documentation: aiAnalysis.aiInsights.qualityMetrics.documentation,
        hotspots: aiAnalysis.aiInsights.qualityMetrics.hotspots,
        trends: aiAnalysis.aiInsights.qualityMetrics.trends,
        distribution: aiAnalysis.aiInsights.qualityMetrics.distribution
      },

      // AI-powered architecture analysis
      architecture: {
        patterns: aiAnalysis.aiInsights.architectureAnalysis.patterns,
        layers: aiAnalysis.aiInsights.architectureAnalysis.layers,
        boundaries: aiAnalysis.aiInsights.architectureAnalysis.boundaries,
        coupling: aiAnalysis.aiInsights.architectureAnalysis.coupling,
        cohesion: aiAnalysis.aiInsights.architectureAnalysis.cohesion,
        violations: aiAnalysis.aiInsights.architectureAnalysis.violations,
        recommendations: aiAnalysis.aiInsights.architectureAnalysis.recommendations
      },

      // AI-powered security assessment
      security: {
        vulnerabilities: aiAnalysis.aiInsights.securityAssessment.vulnerabilities,
        risks: aiAnalysis.aiInsights.securityAssessment.risks,
        bestPractices: aiAnalysis.aiInsights.securityAssessment.bestPractices,
        compliance: aiAnalysis.aiInsights.securityAssessment.compliance,
        recommendations: aiAnalysis.aiInsights.securityAssessment.recommendations,
        severity: aiAnalysis.aiInsights.securityAssessment.severity
      },

      // AI-powered performance analysis
      performance: {
        bottlenecks: aiAnalysis.aiInsights.performanceAnalysis.bottlenecks,
        optimizations: aiAnalysis.aiInsights.performanceAnalysis.optimizations,
        metrics: aiAnalysis.aiInsights.performanceAnalysis.metrics,
        patterns: aiAnalysis.aiInsights.performanceAnalysis.patterns,
        recommendations: aiAnalysis.aiInsights.performanceAnalysis.recommendations
      },

      // AI-powered code patterns
      patterns: {
        designPatterns: aiAnalysis.aiInsights.codePatterns.designPatterns,
        antiPatterns: aiAnalysis.aiInsights.codePatterns.antiPatterns,
        codeSmells: aiAnalysis.aiInsights.codePatterns.codeSmells,
        duplication: aiAnalysis.aiInsights.codePatterns.duplication,
        consistency: aiAnalysis.aiInsights.codePatterns.consistency,
        recommendations: aiAnalysis.aiInsights.codePatterns.recommendations
      },

      // AI-powered technical debt assessment
      technicalDebt: {
        total: aiAnalysis.aiInsights.technicalDebt.total,
        categories: aiAnalysis.aiInsights.technicalDebt.categories,
        hotspots: aiAnalysis.aiInsights.technicalDebt.hotspots,
        impact: aiAnalysis.aiInsights.technicalDebt.impact,
        recommendations: aiAnalysis.aiInsights.technicalDebt.recommendations
      },

      // AI-powered maintainability assessment
      maintainability: {
        score: aiAnalysis.aiInsights.maintainability.score,
        factors: aiAnalysis.aiInsights.maintainability.factors,
        trends: aiAnalysis.aiInsights.maintainability.trends,
        recommendations: aiAnalysis.aiInsights.maintainability.recommendations
      },

      // AI-powered testability assessment
      testability: {
        score: aiAnalysis.aiInsights.testability.score,
        coverage: aiAnalysis.aiInsights.testability.coverage,
        gaps: aiAnalysis.aiInsights.testability.gaps,
        recommendations: aiAnalysis.aiInsights.testability.recommendations
      },

      // AI-powered documentation assessment
      documentation: {
        coverage: aiAnalysis.aiInsights.documentation.coverage,
        quality: aiAnalysis.aiInsights.documentation.quality,
        gaps: aiAnalysis.aiInsights.documentation.gaps,
        recommendations: aiAnalysis.aiInsights.documentation.recommendations
      },

      // Comprehensive recommendations
      recommendations: {
        refactoring: aiAnalysis.aiInsights.recommendations.refactoring,
        optimization: aiAnalysis.aiInsights.recommendations.optimization,
        security: aiAnalysis.aiInsights.recommendations.security,
        testing: aiAnalysis.aiInsights.recommendations.testing,
        documentation: aiAnalysis.aiInsights.recommendations.documentation,
        architecture: aiAnalysis.aiInsights.recommendations.architecture,
        priority: aiAnalysis.aiInsights.recommendations.priority
      },

      // Enhanced dependency graph with AI insights
      dependencyGraph: {
        nodes: (scanResult.dependencyGraph?.nodes || []).map(node => ({
          ...node,
          quality: getNodeQuality(node, aiAnalysis),
          architecture: getNodeArchitecture(node, aiAnalysis),
          security: getNodeSecurity(node, aiAnalysis),
          performance: getNodePerformance(node, aiAnalysis)
        })),
        edges: scanResult.dependencyGraph?.edges || [],
        clusters: scanResult.dependencyGraph?.clusters || [],
        layers: scanResult.dependencyGraph?.layers || { presentation: [], business: [], data: [], infrastructure: [], shared: [] }
      },

      // Issues with AI-powered detection
      issues: {
        circularDependencies: scanResult.issues?.circularDependencies || [],
        deadCode: scanResult.issues?.deadCode || { unusedFunctions: [], unusedVariables: [], unusedImports: [], unreachableCode: [] },
        duplicatePatterns: aiAnalysis.aiInsights.codePatterns.duplication,
        unusedDependencies: scanResult.issues?.unusedDependencies || [],
        securityVulnerabilities: {
          high: aiAnalysis.aiInsights.securityAssessment.vulnerabilities.filter(v => v.severity === 'high'),
          medium: aiAnalysis.aiInsights.securityAssessment.vulnerabilities.filter(v => v.severity === 'medium'),
          low: aiAnalysis.aiInsights.securityAssessment.vulnerabilities.filter(v => v.severity === 'low'),
          total: aiAnalysis.aiInsights.securityAssessment.vulnerabilities.length
        },
        performanceIssues: {
          largeFiles: aiAnalysis.aiInsights.performanceAnalysis.bottlenecks,
          complexFunctions: aiAnalysis.aiInsights.qualityMetrics.hotspots,
          heavyDependencies: scanResult.issues?.heavyDependencies || [],
          inefficientPatterns: aiAnalysis.aiInsights.performanceAnalysis.patterns
        }
      },

      // Scan metadata
      scanMetadata: {
        scanId: scanResult.id,
        scanTime: scanResult.scanTime,
        rootPath: scanResult.rootPath,
        timestamp: scanResult.timestamp,
        aiAnalysisVersion: aiAnalysis.version,
        aiAnalysisTimestamp: aiAnalysis.timestamp
      },

      // Raw AI analysis data for advanced processing
      rawAIAnalysis: aiAnalysis
    };

    res.json({
      success: true,
      data: aiAnalysisData,
      message: 'Comprehensive AI analysis completed successfully'
    });

  } catch (error) {
    logger.error('AI analysis error:', error);
    res.status(500).json({
      error: 'AI analysis failed',
      message: error.message
    });
  }
});

// Projects endpoints
app.get('/api/projects', async (req, res) => {
  try {
    let projects;
    if (req.user) {
      // Get user's projects
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;
      projects = await Project.findByUserId(req.user.id, limit, offset);
    } else {
      // Anonymous users see projects with user_id = NULL
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;
      projects = await Project.findAll(limit, offset);
    }
    
    res.json({ 
      success: true, 
      data: projects,
      user: req.user ? req.user.email : 'anonymous'
    });
  } catch (error) {
    logger.error('Failed to get projects', error);
    res.status(500).json({ error: 'Failed to get projects', message: error.message });
  }
});

app.get('/api/projects/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json({ success: true, data: project });
  } catch (error) {
    logger.error('Failed to get project', error);
    res.status(500).json({ error: 'Failed to get project', message: error.message });
  }
});

// Scans endpoints
app.get('/api/scans', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const scans = await Scan.findRecent(limit);
    res.json({ success: true, data: scans });
  } catch (error) {
    logger.error('Failed to get scans', error);
    res.status(500).json({ error: 'Failed to get scans', message: error.message });
  }
});

app.get('/api/scans/:id', async (req, res) => {
  try {
    const scan = await Scan.findById(req.params.id);
    if (!scan) {
      return res.status(404).json({ error: 'Scan not found' });
    }
    
    const fullDetails = await scan.getFullDetails();
    res.json({ success: true, data: fullDetails });
  } catch (error) {
    logger.error('Failed to get scan details', error);
    res.status(500).json({ error: 'Failed to get scan details', message: error.message });
  }
});

app.get('/api/projects/:id/scans', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const scans = await Scan.findByProjectId(req.params.id, limit);
    res.json({ success: true, data: scans });
  } catch (error) {
    logger.error('Failed to get project scans', error);
    res.status(500).json({ error: 'Failed to get project scans', message: error.message });
  }
});

// Graph endpoint - updated to use real scan data
app.get('/api/graph/:scanId?', async (req, res) => {
  try {
    const { scanId } = req.params;
    
    if (scanId && scanId !== 'mock') {
      // Try to get real graph data from scan
      const scan = await Scan.findById(scanId);
      if (scan) {
        const details = await scan.getFullDetails();
        
        // Convert scan data to graph format
        const nodes = details.files.map(file => ({
          id: file.file_path,
          type: file.file_type || 'file',
          size: file.file_size || 0,
          complexity: file.complexity || 0,
          lines: file.lines_of_code || 0
        }));
        
        const links = details.dependencies.map(dep => ({
          source: dep.from_file,
          target: dep.to_file,
          type: dep.dependency_type,
          circular: dep.is_circular
        }));
        
        return res.json({
          scanId,
          graph: { nodes, links },
          metadata: {
            nodes: nodes.length,
            edges: links.length,
            generated: scan.completed_at || new Date().toISOString(),
            conflicts: details.conflicts.length,
            filesScanned: details.files_scanned
          }
        });
      }
    }
    
    // Fallback to mock data
    const mockGraph = {
      nodes: [
        { id: 'app.js', type: 'entry', size: 150, complexity: 5 },
        { id: 'utils.js', type: 'utility', size: 80, complexity: 2 },
        { id: 'api.js', type: 'service', size: 120, complexity: 4 },
        { id: 'components/Header.jsx', type: 'component', size: 60, complexity: 2 },
        { id: 'components/Graph.jsx', type: 'component', size: 200, complexity: 8 }
      ],
      links: [
        { source: 'app.js', target: 'utils.js', type: 'import', strength: 1 },
        { source: 'app.js', target: 'api.js', type: 'import', strength: 1 },
        { source: 'app.js', target: 'components/Header.jsx', type: 'import', strength: 1 },
        { source: 'components/Graph.jsx', target: 'utils.js', type: 'import', strength: 1 }
      ]
    };
    
    res.json({
      scanId: scanId || 'mock',
      graph: mockGraph,
      metadata: {
        nodes: mockGraph.nodes.length,
        edges: mockGraph.links.length,
        generated: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error('Failed to get graph data', error);
    res.status(500).json({ error: 'Failed to get graph data', message: error.message });
  }
});

// Error handling
app.use((error, req, res, next) => {
  logger.error('Unhandled error', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// Initialize port configuration and start server
async function startServer() {
  let PORT;

  try {
    // Initialize dynamic port manager first
    await dynamicPortManager.initialize();
    const portConfig = dynamicPortManager.getConfig();
    
    // Get port configuration with automatic conflict resolution
    PORT = dynamicPortManager.getServerPort();
    
    // Validate configuration
    const validation = validateConfig(portConfig);
    if (!validation.valid) {
      logger.warn('⚠️  Port configuration validation issues:');
      validation.issues.forEach(issue => logger.warn(`  - ${issue}`));
    }
    
    if (validation.warnings.length > 0) {
      logger.warn('⚠️  Port configuration warnings:');
      validation.warnings.forEach(warning => logger.warn(`  - ${warning}`));
    }
    
    logger.info(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`📊 Port configuration:`, portConfig);
    logger.info(`Manito API Server starting on port ${PORT}`);
  } catch (error) {
    logger.error('❌ Failed to initialize port configuration:', error);
    process.exit(1);
  }

  server.listen(PORT, async () => {
  logger.info(`Manito API Server running on port ${PORT}`);
  
  // Run database migrations
  try {
    await migrations.runMigrations();
    logger.info('Database migrations completed');
  } catch (error) {
    logger.error('Database migration failed:', error);
  }
  
  logger.info('Available endpoints:');
  logger.info('  GET  /api/health');
  logger.info('  POST /api/scan (sync/async)');
  logger.info('  POST /api/upload (file upload & scan)');
  logger.info('  POST /api/upload-directory (browser directory access)');
  logger.info('  GET  /api/scan/queue');
  logger.info('  GET  /api/scan/jobs');
  logger.info('  GET  /api/scan/jobs/:jobId');
  logger.info('  DELETE /api/scan/jobs/:jobId');
  logger.info('  GET  /api/metrics');
  logger.info('  GET  /api/ports'); // Added this line
  logger.info('  GET  /api/projects');
  logger.info('  GET  /api/projects/:id');
  logger.info('  GET  /api/projects/:id/scans');
  logger.info('  GET  /api/scans');
  logger.info('  GET  /api/scans/:id');
  logger.info('  GET  /api/ai/providers');
  logger.info('  POST /api/ai/send');
  logger.info('  GET  /api/graph/:scanId?');
  logger.info('Performance optimizations enabled:');
  logger.info('  • Streaming scanner with parallel processing');
  logger.info('  • Async job queue for large scans');
  logger.info('  • WebSocket real-time progress updates');
  logger.info('  • Worker threads for CPU-intensive tasks');
  });
}

// Start the server
startServer().catch(error => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});

// Helper functions for AI analysis
function detectProjectType(scanResult) {
  if (scanResult.packageInfo?.dependencies?.react) return 'react';
  if (scanResult.packageInfo?.dependencies?.vue) return 'vue';
  if (scanResult.packageInfo?.dependencies?.angular) return 'angular';
  if (scanResult.packageInfo?.dependencies?.express) return 'nodejs';
  return 'unknown';
}

function detectFramework(scanResult) {
  if (scanResult.packageInfo?.dependencies?.react) return 'react';
  if (scanResult.packageInfo?.dependencies?.vue) return 'vue';
  if (scanResult.packageInfo?.dependencies?.angular) return 'angular';
  if (scanResult.packageInfo?.dependencies?.express) return 'express';
  return 'none';
}

function detectBuildTools(scanResult) {
  const buildTools = [];
  if (scanResult.packageInfo?.devDependencies?.webpack) buildTools.push('webpack');
  if (scanResult.packageInfo?.devDependencies?.vite) buildTools.push('vite');
  if (scanResult.packageInfo?.devDependencies?.babel) buildTools.push('babel');
  if (scanResult.packageInfo?.devDependencies?.typescript) buildTools.push('typescript');
  return buildTools;
}

// Helper methods for node enhancement
function getNodeQuality(node, aiAnalysis) {
  const file = aiAnalysis.files.find(f => f.name === node.label);
  return file ? file.metrics : { complexity: 0, maintainability: 0, readability: 0 };
}

function getNodeArchitecture(node, aiAnalysis) {
  const file = aiAnalysis.files.find(f => f.name === node.label);
  return file ? file.architecture : { layer: 'unknown', pattern: 'unknown' };
}

function getNodeSecurity(node, aiAnalysis) {
  const file = aiAnalysis.files.find(f => f.name === node.label);
  return file ? file.security : { vulnerabilities: [], risks: [] };
}

function getNodePerformance(node, aiAnalysis) {
  const file = aiAnalysis.files.find(f => f.name === node.label);
  return file ? file.performance : { bottlenecks: [], optimizations: [] };
}

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  scanQueue.shutdown();
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  scanQueue.shutdown();
  server.close(() => {
    process.exit(0);
  });
});

export { app, server, wsService, broadcast };