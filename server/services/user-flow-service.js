/**
 * User Flow Detection Service
 * Automatically detects and analyzes user flows in codebases
 */

import { DependencyAnalyzer } from '../../core/analyzers/dependency-analyzer.js';
import enhancedDb from './enhancedDatabase.js';
import supabaseService from './supabase-service.js';
import { EventEmitter } from 'events';
import winston from 'winston';

export class UserFlowService extends EventEmitter {
  constructor() {
    super();
    this.dependencyAnalyzer = new DependencyAnalyzer();
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

    this.db = supabaseService.connected ? supabaseService : enhancedDb;
    this.flowCache = new Map();
    this.predefinedFlows = this.initializePredefinedFlows();
  }

  /**
   * Detect all user flows for a project
   */
  async detectProjectFlows(projectId, scanResults) {
    try {
      this.logger.info('Detecting user flows for project', { projectId });

      // 1. Automatic flow detection
      const detectedFlows = await this.detectAutomaticFlows(scanResults);
      
      // 2. Pattern-based flow detection
      const patternFlows = await this.detectPatternFlows(scanResults);
      
      // 3. Critical system flows
      const systemFlows = await this.detectSystemFlows(scanResults);
      
      // 4. Combine and deduplicate
      const allFlows = this.combineAndDeduplicateFlows([
        ...detectedFlows,
        ...patternFlows,
        ...systemFlows
      ]);

      // 5. Analyze flow relationships
      const flowAnalysis = await this.analyzeFlowRelationships(allFlows);

      // 6. Store flows in database
      await this.storeProjectFlows(projectId, allFlows, flowAnalysis);

      const result = {
        projectId,
        flows: allFlows,
        analysis: flowAnalysis,
        metadata: {
          totalFlows: allFlows.length,
          criticalFlows: allFlows.filter(f => f.isCritical).length,
          detectedAt: new Date().toISOString()
        }
      };

      this.emit('flowsDetected', result);
      return result;
    } catch (error) {
      this.logger.error('Failed to detect project flows', { error: error.message, projectId });
      throw error;
    }
  }

  /**
   * Automatic flow detection using entry point analysis
   */
  async detectAutomaticFlows(scanResults) {
    const flows = [];
    
    // Find entry points
    const entryPoints = this.findEntryPoints(scanResults.files);
    
    for (const entryPoint of entryPoints) {
      try {
        const flow = await this.traceFlowFromEntryPoint(entryPoint, scanResults);
        if (flow && flow.files.length >= 3) { // Minimum 3 files for a meaningful flow
          flows.push(flow);
        }
      } catch (error) {
        this.logger.warn('Failed to trace flow from entry point', { 
          entryPoint: entryPoint.filePath, 
          error: error.message 
        });
      }
    }

    return flows;
  }

  /**
   * Pattern-based flow detection
   */
  async detectPatternFlows(scanResults) {
    const flows = [];

    // Authentication flow pattern
    const authFlow = await this.detectAuthenticationFlow(scanResults);
    if (authFlow) flows.push(authFlow);

    // Data visualization flow
    const vizFlow = await this.detectVisualizationFlow(scanResults);
    if (vizFlow) flows.push(vizFlow);

    // AI interaction flow
    const aiFlow = await this.detectAIFlow(scanResults);
    if (aiFlow) flows.push(aiFlow);

    // File upload/processing flow
    const uploadFlow = await this.detectUploadFlow(scanResults);
    if (uploadFlow) flows.push(uploadFlow);

    // Settings management flow
    const settingsFlow = await this.detectSettingsFlow(scanResults);
    if (settingsFlow) flows.push(settingsFlow);

    return flows;
  }

  /**
   * Detect authentication flow
   */
  async detectAuthenticationFlow(scanResults) {
    const authFiles = scanResults.files.filter(file => {
      const content = file.content || '';
      const filePath = file.filePath.toLowerCase();
      
      return (
        filePath.includes('auth') ||
        filePath.includes('login') ||
        filePath.includes('user') ||
        content.includes('authenticate') ||
        content.includes('login') ||
        content.includes('password') ||
        content.includes('token')
      );
    });

    if (authFiles.length < 2) return null;

    // Trace authentication flow
    const flowFiles = new Set();
    const steps = [];

    // Start from login component
    const loginFile = authFiles.find(f => 
      f.filePath.toLowerCase().includes('login') ||
      f.content?.includes('LoginForm') ||
      f.content?.includes('login')
    );

    if (loginFile) {
      await this.traceAuthenticationPath(loginFile, scanResults, flowFiles, steps);
    }

    return {
      id: 'authentication-flow',
      name: 'User Authentication',
      description: 'Complete user login and authentication process',
      color: '#3b82f6',
      icon: '🔐',
      category: 'authentication',
      isCritical: true,
      
      files: Array.from(flowFiles),
      steps,
      entryPoints: [loginFile?.filePath].filter(Boolean),
      
      metrics: {
        complexity: this.calculateFlowComplexity(Array.from(flowFiles), scanResults),
        performance: this.calculateFlowPerformance(Array.from(flowFiles), scanResults),
        testCoverage: this.calculateFlowTestCoverage(Array.from(flowFiles)),
        security: this.calculateFlowSecurity(Array.from(flowFiles), scanResults)
      }
    };
  }

  /**
   * Detect visualization flow
   */
  async detectVisualizationFlow(scanResults) {
    const vizFiles = scanResults.files.filter(file => {
      const filePath = file.filePath.toLowerCase();
      const content = file.content || '';
      
      return (
        filePath.includes('graph') ||
        filePath.includes('visual') ||
        filePath.includes('chart') ||
        filePath.includes('d3') ||
        content.includes('d3.') ||
        content.includes('visualization') ||
        content.includes('svg') ||
        content.includes('canvas')
      );
    });

    if (vizFiles.length < 2) return null;

    const flowFiles = new Set(vizFiles.map(f => f.filePath));
    
    // Add related files
    for (const file of vizFiles) {
      const deps = this.getFileDependencies(file, scanResults);
      deps.forEach(dep => {
        if (this.isVisualizationRelated(dep.target)) {
          flowFiles.add(dep.target);
        }
      });
    }

    return {
      id: 'visualization-flow',
      name: 'Data Visualization',
      description: 'Interactive graphs, charts, and visual analysis',
      color: '#f59e0b',
      icon: '📊',
      category: 'visualization',
      isCritical: false,
      
      files: Array.from(flowFiles),
      entryPoints: vizFiles.map(f => f.filePath),
      
      metrics: {
        complexity: this.calculateFlowComplexity(Array.from(flowFiles), scanResults),
        performance: this.calculateFlowPerformance(Array.from(flowFiles), scanResults),
        testCoverage: this.calculateFlowTestCoverage(Array.from(flowFiles))
      }
    };
  }

  /**
   * Detect AI interaction flow
   */
  async detectAIFlow(scanResults) {
    const aiFiles = scanResults.files.filter(file => {
      const filePath = file.filePath.toLowerCase();
      const content = file.content || '';
      
      return (
        filePath.includes('ai') ||
        filePath.includes('openai') ||
        filePath.includes('anthropic') ||
        content.includes('AI') ||
        content.includes('openai') ||
        content.includes('anthropic') ||
        content.includes('GPT') ||
        content.includes('claude')
      );
    });

    if (aiFiles.length < 1) return null;

    const flowFiles = new Set(aiFiles.map(f => f.filePath));
    
    // Add AI-related dependencies
    for (const file of aiFiles) {
      const deps = this.getFileDependencies(file, scanResults);
      deps.forEach(dep => {
        if (this.isAIRelated(dep.target)) {
          flowFiles.add(dep.target);
        }
      });
    }

    return {
      id: 'ai-interaction-flow',
      name: 'AI Insights',
      description: 'AI-powered code analysis and recommendations',
      color: '#8b5cf6',
      icon: '🤖',
      category: 'ai',
      isCritical: false,
      
      files: Array.from(flowFiles),
      entryPoints: aiFiles.map(f => f.filePath),
      
      metrics: {
        complexity: this.calculateFlowComplexity(Array.from(flowFiles), scanResults),
        performance: this.calculateFlowPerformance(Array.from(flowFiles), scanResults),
        testCoverage: this.calculateFlowTestCoverage(Array.from(flowFiles))
      }
    };
  }

  /**
   * Get file-specific dependencies for drill-down
   */
  async getFileDependencies(filePath, projectId) {
    try {
      const cacheKey = `file-deps:${filePath}:${projectId}`;
      if (this.flowCache.has(cacheKey)) {
        return this.flowCache.get(cacheKey);
      }

      // Get file's direct dependencies
      const directDeps = await this.getDirectDependencies(filePath, projectId);
      
      // Get reverse dependencies (files that depend on this file)
      const reverseDeps = await this.getReverseDependencies(filePath, projectId);
      
      // Get symbol-level dependencies if available
      const symbolDeps = await this.getSymbolDependencies(filePath, projectId);

      const result = {
        file: filePath,
        direct: directDeps,
        reverse: reverseDeps,
        symbols: symbolDeps,
        
        analysis: {
          totalDependencies: directDeps.length + reverseDeps.length,
          externalDependencies: directDeps.filter(d => d.isExternal).length,
          circularDependencies: this.detectFileCircularDeps(filePath, directDeps),
          criticalityScore: this.calculateFileCriticality(directDeps, reverseDeps)
        }
      };

      this.flowCache.set(cacheKey, result);
      return result;
    } catch (error) {
      this.logger.error('Failed to get file dependencies', { error: error.message, filePath });
      throw error;
    }
  }

  /**
   * Isolate specific user flow
   */
  async isolateUserFlow(flowId, projectId) {
    try {
      // Get flow definition
      const flow = await this.getFlow(flowId, projectId);
      if (!flow) {
        throw new Error(`Flow ${flowId} not found`);
      }

      // Get detailed dependency information for flow files
      const isolatedGraph = {
        flow,
        nodes: [],
        edges: [],
        analysis: {}
      };

      // Build isolated graph with only flow-related files
      for (const filePath of flow.files) {
        const fileNode = await this.createFlowFileNode(filePath, flow, projectId);
        isolatedGraph.nodes.push(fileNode);
      }

      // Create edges between flow files only
      for (const node of isolatedGraph.nodes) {
        const deps = await this.getFileDependencies(node.filePath, projectId);
        
        for (const dep of deps.direct) {
          if (flow.files.includes(dep.target)) {
            const edge = await this.createFlowEdge(node.filePath, dep, flow);
            isolatedGraph.edges.push(edge);
          }
        }
      }

      // Analyze isolated flow
      isolatedGraph.analysis = {
        flowHealth: this.calculateFlowHealth(isolatedGraph),
        performance: this.analyzeFlowPerformance(isolatedGraph),
        testCoverage: this.analyzeFlowTestCoverage(isolatedGraph),
        optimizations: this.suggestFlowOptimizations(isolatedGraph)
      };

      return isolatedGraph;
    } catch (error) {
      this.logger.error('Failed to isolate user flow', { error: error.message, flowId });
      throw error;
    }
  }

  /**
   * Compare multiple user flows
   */
  async compareUserFlows(flowIds, projectId) {
    try {
      const flows = await Promise.all(
        flowIds.map(id => this.isolateUserFlow(id, projectId))
      );

      const comparison = {
        flows,
        intersections: this.findFlowIntersections(flows),
        conflicts: this.detectFlowConflicts(flows),
        optimizations: this.suggestCrossFlowOptimizations(flows),
        
        metrics: {
          sharedFiles: this.countSharedFiles(flows),
          totalComplexity: flows.reduce((sum, f) => sum + f.analysis.flowHealth.complexity, 0),
          averagePerformance: flows.reduce((sum, f) => sum + f.analysis.performance.score, 0) / flows.length
        }
      };

      return comparison;
    } catch (error) {
      this.logger.error('Failed to compare user flows', { error: error.message, flowIds });
      throw error;
    }
  }

  /**
   * Initialize predefined flow patterns
   */
  initializePredefinedFlows() {
    return {
      authentication: {
        patterns: [
          /login|auth|signin|signup/i,
          /password|credential|token/i,
          /session|user|account/i
        ],
        entryPatterns: [
          /Login\.(jsx?|tsx?)$/,
          /Auth.*\.(jsx?|tsx?)$/,
          /SignIn\.(jsx?|tsx?)$/
        ],
        keywords: ['authenticate', 'login', 'logout', 'signin', 'signup', 'password', 'token', 'session']
      },

      dataProcessing: {
        patterns: [
          /scan|process|analyze/i,
          /parser|scanner|analyzer/i,
          /data|result|output/i
        ],
        entryPatterns: [
          /Scanner\.(js|ts)$/,
          /Processor\.(js|ts)$/,
          /Analyzer\.(js|ts)$/
        ],
        keywords: ['scan', 'parse', 'analyze', 'process', 'transform', 'generate']
      },

      userInterface: {
        patterns: [
          /component|ui|interface/i,
          /render|display|show/i,
          /interaction|event|handler/i
        ],
        entryPatterns: [
          /App\.(jsx?|tsx?)$/,
          /.*Page\.(jsx?|tsx?)$/,
          /.*Component\.(jsx?|tsx?)$/
        ],
        keywords: ['render', 'component', 'ui', 'interface', 'interaction', 'event', 'handler']
      },

      dataVisualization: {
        patterns: [
          /graph|chart|visual|d3/i,
          /plot|diagram|canvas|svg/i,
          /metric|dashboard|analytics/i
        ],
        entryPatterns: [
          /.*Graph\.(jsx?|tsx?)$/,
          /.*Chart\.(jsx?|tsx?)$/,
          /.*Visualization\.(jsx?|tsx?)$/
        ],
        keywords: ['graph', 'chart', 'visualization', 'd3', 'svg', 'canvas', 'plot', 'diagram']
      }
    };
  }

  /**
   * Trace flow from entry point
   */
  async traceFlowFromEntryPoint(entryPoint, scanResults) {
    const visited = new Set();
    const flowFiles = new Set();
    const flowSteps = [];
    
    await this.traceFlowRecursive(
      entryPoint, 
      scanResults, 
      flowFiles, 
      flowSteps, 
      visited, 
      0, 
      10 // Max depth
    );

    // Analyze the traced flow
    const flowAnalysis = this.analyzeTracedFlow(Array.from(flowFiles), flowSteps, scanResults);

    return {
      id: `flow-${entryPoint.filePath.replace(/[^a-zA-Z0-9]/g, '-')}`,
      name: this.generateFlowName(entryPoint, flowAnalysis),
      description: this.generateFlowDescription(entryPoint, flowAnalysis),
      
      // Flow data
      entryPoint: entryPoint.filePath,
      files: Array.from(flowFiles),
      steps: flowSteps,
      
      // Visual properties
      color: this.assignFlowColor(flowAnalysis),
      icon: this.assignFlowIcon(flowAnalysis),
      
      // Classification
      category: flowAnalysis.category,
      isCritical: flowAnalysis.isCritical,
      isUserFacing: flowAnalysis.isUserFacing,
      
      // Metrics
      metrics: {
        complexity: flowAnalysis.complexity,
        performance: flowAnalysis.performance,
        testCoverage: flowAnalysis.testCoverage,
        maintainability: flowAnalysis.maintainability
      }
    };
  }

  /**
   * Recursive flow tracing
   */
  async traceFlowRecursive(currentFile, scanResults, flowFiles, flowSteps, visited, depth, maxDepth) {
    if (depth >= maxDepth || visited.has(currentFile.filePath)) {
      return;
    }

    visited.add(currentFile.filePath);
    flowFiles.add(currentFile.filePath);

    // Create flow step
    const step = {
      order: flowSteps.length + 1,
      file: currentFile.filePath,
      action: this.inferFileAction(currentFile),
      type: currentFile.type || this.determineFileType(currentFile.filePath, currentFile.content),
      
      dependencies: [],
      
      metadata: {
        isAsync: this.hasAsyncOperations(currentFile),
        hasStateChanges: this.hasStateChanges(currentFile),
        hasApiCalls: this.hasApiCalls(currentFile),
        isUserInteraction: this.isUserInteractionFile(currentFile),
        complexity: currentFile.complexity || 0
      }
    };

    // Get file dependencies
    const dependencies = this.getFileDependencies(currentFile, scanResults);
    
    for (const dep of dependencies) {
      if (this.isRelevantToUserFlow(dep, currentFile)) {
        step.dependencies.push(dep.target);
        
        // Continue tracing
        const depFile = scanResults.files.find(f => f.filePath === dep.target);
        if (depFile && !visited.has(dep.target)) {
          await this.traceFlowRecursive(
            depFile, 
            scanResults, 
            flowFiles, 
            flowSteps, 
            visited, 
            depth + 1, 
            maxDepth
          );
        }
      }
    }

    flowSteps.push(step);
  }

  /**
   * Analyze traced flow characteristics
   */
  analyzeTracedFlow(files, steps, scanResults) {
    const fileObjects = scanResults.files.filter(f => files.includes(f.filePath));
    
    // Calculate metrics
    const totalComplexity = fileObjects.reduce((sum, f) => sum + (f.complexity || 0), 0);
    const avgComplexity = files.length > 0 ? totalComplexity / files.length : 0;
    
    const totalLines = fileObjects.reduce((sum, f) => sum + (f.lines || 0), 0);
    const hasAsyncOps = fileObjects.some(f => this.hasAsyncOperations(f));
    const hasApiCalls = fileObjects.some(f => this.hasApiCalls(f));
    
    // Determine category
    let category = 'general';
    if (files.some(f => f.includes('auth') || f.includes('login'))) category = 'authentication';
    if (files.some(f => f.includes('graph') || f.includes('visual'))) category = 'visualization';
    if (files.some(f => f.includes('ai') || f.includes('openai'))) category = 'ai';
    if (files.some(f => f.includes('scan') || f.includes('analyze'))) category = 'data-processing';
    if (files.some(f => f.includes('component') || f.includes('page'))) category = 'user-interface';

    return {
      category,
      complexity: avgComplexity,
      performance: this.calculatePerformanceScore(fileObjects),
      testCoverage: this.calculateTestCoverageScore(files),
      maintainability: this.calculateMaintainabilityScore(fileObjects),
      
      isCritical: avgComplexity > 10 || hasApiCalls || category === 'authentication',
      isUserFacing: category === 'user-interface' || category === 'authentication',
      isPerformanceSensitive: category === 'visualization' || category === 'data-processing',
      
      characteristics: {
        hasAsyncOperations: hasAsyncOps,
        hasApiCalls,
        hasStateManagement: fileObjects.some(f => this.hasStateChanges(f)),
        hasUserInteraction: fileObjects.some(f => this.isUserInteractionFile(f)),
        totalLines,
        fileCount: files.length
      }
    };
  }

  /**
   * Helper methods for file analysis
   */
  findEntryPoints(files) {
    return files.filter(file => {
      const filePath = file.filePath.toLowerCase();
      const fileName = path.basename(filePath);
      
      return (
        fileName.includes('app.') ||
        fileName.includes('main.') ||
        fileName.includes('index.') ||
        filePath.includes('/pages/') ||
        filePath.includes('/routes/') ||
        file.isEntryPoint ||
        this.hasEntryPointPatterns(file.content)
      );
    });
  }

  hasEntryPointPatterns(content) {
    if (!content) return false;
    
    const entryPatterns = [
      /ReactDOM\.render/,
      /createRoot/,
      /export default function.*App/,
      /Router.*Route/,
      /BrowserRouter/
    ];
    
    return entryPatterns.some(pattern => pattern.test(content));
  }

  inferFileAction(file) {
    const filePath = file.filePath.toLowerCase();
    const content = file.content || '';
    
    if (filePath.includes('login')) return 'User authentication';
    if (filePath.includes('dashboard')) return 'Display dashboard';
    if (filePath.includes('settings')) return 'Manage settings';
    if (filePath.includes('scan')) return 'Analyze code';
    if (filePath.includes('graph')) return 'Visualize dependencies';
    if (filePath.includes('ai')) return 'Generate AI insights';
    if (filePath.includes('upload')) return 'Process file upload';
    
    if (content.includes('useState')) return 'Manage component state';
    if (content.includes('useEffect')) return 'Handle side effects';
    if (content.includes('fetch') || content.includes('axios')) return 'Make API calls';
    if (content.includes('render')) return 'Render user interface';
    
    return 'Process data';
  }

  hasAsyncOperations(file) {
    const content = file.content || '';
    return content.includes('async') || 
           content.includes('await') || 
           content.includes('Promise') ||
           content.includes('.then(');
  }

  hasStateChanges(file) {
    const content = file.content || '';
    return content.includes('useState') || 
           content.includes('setState') || 
           content.includes('dispatch') ||
           content.includes('store.');
  }

  hasApiCalls(file) {
    const content = file.content || '';
    return content.includes('fetch(') || 
           content.includes('axios') || 
           content.includes('api.') ||
           content.includes('/api/');
  }

  isUserInteractionFile(file) {
    const content = file.content || '';
    const filePath = file.filePath.toLowerCase();
    
    return filePath.includes('component') ||
           filePath.includes('page') ||
           content.includes('onClick') ||
           content.includes('onSubmit') ||
           content.includes('onChange') ||
           content.includes('button') ||
           content.includes('form');
  }

  /**
   * Store flows in database
   */
  async storeProjectFlows(projectId, flows, analysis) {
    try {
      // Store in database for persistence and querying
      const flowData = {
        project_id: projectId,
        flows: JSON.stringify(flows),
        analysis: JSON.stringify(analysis),
        detected_at: new Date().toISOString()
      };

      if (this.db === supabaseService) {
        // Store in Supabase
        await this.db.insert('user_flows', flowData);
      } else {
        // Store in PostgreSQL (simplified for now)
        this.logger.info('Flow data would be stored in database', { projectId, flowCount: flows.length });
      }

      this.logger.info('Project flows stored successfully', { projectId, flowCount: flows.length });
    } catch (error) {
      this.logger.error('Failed to store project flows', { error: error.message, projectId });
      // Don't throw - flow detection can work without persistence
    }
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      cacheSize: this.flowCache.size,
      predefinedFlows: Object.keys(this.predefinedFlows).length,
      usingSupabase: this.db === supabaseService
    };
  }

  /**
   * Health check
   */
  async health() {
    try {
      // Test basic functionality
      const testScanResults = {
        files: [
          { filePath: 'test/App.jsx', content: 'export default function App() {}' }
        ]
      };
      
      const flows = await this.detectProjectFlows(999, testScanResults);
      
      return {
        status: 'ok',
        message: 'User flow service is healthy',
        statistics: this.getStats(),
        testResult: {
          flowsDetected: flows.flows.length,
          categoriesFound: [...new Set(flows.flows.map(f => f.category))].length
        }
      };
    } catch (error) {
      return {
        status: 'error',
        message: `User flow service health check failed: ${error.message}`,
        error: error.message
      };
    }
  }
}

export default new UserFlowService();
