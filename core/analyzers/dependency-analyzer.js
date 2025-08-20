/**
 * Advanced Dependency Analyzer
 * Provides rich dependency analysis with relationship types, architectural layers, and user flows
 */

import path from 'path';
import fs from 'fs/promises';

export class DependencyAnalyzer {
  constructor() {
    this.dependencyGraph = new Map();
    this.reverseDependencyGraph = new Map();
    this.architecturalLayers = new Map();
    this.userFlows = new Map();
    this.externalDependencies = new Map();
    this.fileMetrics = new Map();
  }

  /**
   * Analyze complete dependency structure
   */
  async analyzeDependencies(scanResults) {
    const analysis = {
      timestamp: new Date().toISOString(),
      
      // Enhanced dependency data
      dependencies: await this.buildEnhancedDependencyGraph(scanResults),
      
      // Architectural analysis
      architecture: await this.analyzeArchitecture(scanResults),
      
      // User flow detection
      userFlows: await this.detectUserFlows(scanResults),
      
      // Performance analysis
      performance: await this.analyzePerformance(scanResults),
      
      // Quality metrics
      quality: await this.analyzeQuality(scanResults)
    };

    return analysis;
  }

  /**
   * Build enhanced dependency graph with relationship types
   */
  async buildEnhancedDependencyGraph(scanResults) {
    const enhancedGraph = {
      nodes: [],
      edges: [],
      metadata: {
        totalFiles: scanResults.files.length,
        totalDependencies: 0,
        circularDependencies: [],
        externalDependencies: [],
        unusedFiles: []
      }
    };

    // Process each file to extract rich dependency information
    for (const file of scanResults.files) {
      const fileNode = await this.createEnhancedFileNode(file);
      enhancedGraph.nodes.push(fileNode);

      // Extract detailed dependencies
      const fileDependencies = await this.extractFileDependencies(file);
      
      for (const dep of fileDependencies) {
        const edge = await this.createEnhancedEdge(file, dep);
        enhancedGraph.edges.push(edge);
        enhancedGraph.metadata.totalDependencies++;
      }
    }

    // Detect circular dependencies
    enhancedGraph.metadata.circularDependencies = this.detectCircularDependencies(enhancedGraph);
    
    // Identify unused files
    enhancedGraph.metadata.unusedFiles = this.findUnusedFiles(enhancedGraph);

    return enhancedGraph;
  }

  /**
   * Create enhanced file node with rich metadata
   */
  async createEnhancedFileNode(file) {
    const filePath = file.filePath;
    const fileContent = file.content || '';
    
    return {
      id: filePath,
      name: path.basename(filePath),
      filePath,
      type: this.determineFileType(filePath, fileContent),
      
      // Size and complexity
      size: {
        lines: file.lines || 0,
        bytes: file.size || 0,
        functions: file.functions?.length || 0,
        classes: file.classes?.length || 0,
        complexity: file.complexity || 0
      },
      
      // Architectural information
      architecture: {
        layer: this.determineArchitecturalLayer(filePath),
        module: this.determineModule(filePath),
        responsibility: this.determineResponsibility(filePath, fileContent)
      },
      
      // Dependency metrics
      dependencies: {
        incoming: 0, // Will be calculated
        outgoing: 0, // Will be calculated
        external: 0, // Will be calculated
        strength: 0  // Will be calculated
      },
      
      // Quality metrics
      quality: {
        testCoverage: this.estimateTestCoverage(filePath),
        maintainability: this.calculateMaintainability(file),
        stability: this.calculateStability(filePath),
        abstractness: this.calculateAbstractness(fileContent)
      },
      
      // User flow involvement
      userFlows: [], // Will be populated by flow detection
      
      // Performance characteristics
      performance: {
        bundleSize: this.estimateBundleSize(file),
        loadTime: this.estimateLoadTime(file),
        renderComplexity: this.calculateRenderComplexity(fileContent)
      },
      
      // Metadata
      metadata: {
        language: file.language || this.detectLanguage(filePath),
        framework: this.detectFramework(fileContent),
        lastModified: file.lastModified || new Date().toISOString(),
        isEntryPoint: this.isEntryPoint(filePath),
        isTestFile: this.isTestFile(filePath),
        isConfigFile: this.isConfigFile(filePath)
      }
    };
  }

  /**
   * Create enhanced edge with relationship semantics
   */
  async createEnhancedEdge(fromFile, dependency) {
    const relationshipType = this.determineRelationshipType(fromFile, dependency);
    const strength = this.calculateRelationshipStrength(fromFile, dependency);
    
    return {
      id: `${fromFile.filePath}->${dependency.target}`,
      source: fromFile.filePath,
      target: dependency.target,
      
      // Relationship characteristics
      relationship: {
        type: relationshipType, // import, call, reference, inheritance, composition
        strength: strength,     // weak, medium, strong, critical
        frequency: dependency.usageCount || 1,
        conditional: dependency.isConditional || false,
        isOptional: dependency.isOptional || false
      },
      
      // Import/export details
      importDetails: {
        importType: dependency.importType || 'unknown', // default, named, namespace, dynamic
        specifiers: dependency.specifiers || [],
        localName: dependency.localName,
        isTypeOnly: dependency.isTypeOnly || false
      },
      
      // Performance impact
      performance: {
        bundleImpact: this.calculateBundleImpact(dependency),
        loadImpact: this.calculateLoadImpact(dependency),
        runtimeImpact: this.calculateRuntimeImpact(dependency)
      },
      
      // Quality indicators
      quality: {
        isCircular: false, // Will be detected
        violatesLayering: this.violatesArchitecturalLayering(fromFile, dependency),
        complexity: this.calculateEdgeComplexity(dependency)
      },
      
      // Visual properties
      visual: {
        color: this.getRelationshipColor(relationshipType),
        width: this.getRelationshipWidth(strength),
        style: this.getRelationshipStyle(relationshipType),
        opacity: this.getRelationshipOpacity(strength)
      }
    };
  }

  /**
   * Determine file type with semantic meaning
   */
  determineFileType(filePath, content) {
    const fileName = path.basename(filePath).toLowerCase();
    const dirName = path.dirname(filePath).toLowerCase();
    
    // React components
    if (fileName.includes('component') || content.includes('export default function') || content.includes('export const')) {
      return 'component';
    }
    
    // Services and business logic
    if (dirName.includes('service') || fileName.includes('service') || content.includes('class') && content.includes('async')) {
      return 'service';
    }
    
    // Data models
    if (dirName.includes('model') || fileName.includes('model') || content.includes('interface') || content.includes('type')) {
      return 'model';
    }
    
    // Utilities
    if (dirName.includes('util') || fileName.includes('util') || fileName.includes('helper')) {
      return 'utility';
    }
    
    // Configuration
    if (fileName.includes('config') || fileName.includes('.config.') || fileName.includes('settings')) {
      return 'config';
    }
    
    // Tests
    if (fileName.includes('test') || fileName.includes('spec') || dirName.includes('test')) {
      return 'test';
    }
    
    // Pages/Routes
    if (dirName.includes('page') || dirName.includes('route') || fileName.includes('page')) {
      return 'page';
    }
    
    // Hooks
    if (fileName.startsWith('use') && (fileName.includes('.js') || fileName.includes('.ts'))) {
      return 'hook';
    }
    
    return 'file';
  }

  /**
   * Determine architectural layer
   */
  determineArchitecturalLayer(filePath) {
    const pathSegments = filePath.toLowerCase().split('/');
    
    // Presentation layer
    if (pathSegments.some(segment => 
      ['component', 'page', 'view', 'ui', 'layout'].includes(segment)
    )) {
      return 'presentation';
    }
    
    // Business layer
    if (pathSegments.some(segment => 
      ['service', 'business', 'logic', 'hook', 'store'].includes(segment)
    )) {
      return 'business';
    }
    
    // Data layer
    if (pathSegments.some(segment => 
      ['model', 'data', 'api', 'database', 'repository'].includes(segment)
    )) {
      return 'data';
    }
    
    // Infrastructure layer
    if (pathSegments.some(segment => 
      ['util', 'helper', 'config', 'lib', 'shared', 'common'].includes(segment)
    )) {
      return 'infrastructure';
    }
    
    return 'unknown';
  }

  /**
   * Determine relationship type between files
   */
  determineRelationshipType(fromFile, dependency) {
    const depTarget = dependency.target;
    const importType = dependency.importType;
    
    // External package dependency
    if (!depTarget.startsWith('.') && !depTarget.startsWith('/')) {
      return 'external-import';
    }
    
    // Dynamic import
    if (importType === 'dynamic' || dependency.isDynamic) {
      return 'dynamic-import';
    }
    
    // Type-only import
    if (dependency.isTypeOnly) {
      return 'type-import';
    }
    
    // Component composition
    if (fromFile.type === 'component' && this.isComponent(depTarget)) {
      return 'composition';
    }
    
    // Service dependency
    if (fromFile.type === 'component' && this.isService(depTarget)) {
      return 'service-call';
    }
    
    // Utility usage
    if (this.isUtility(depTarget)) {
      return 'utility-usage';
    }
    
    // Configuration dependency
    if (this.isConfig(depTarget)) {
      return 'config-usage';
    }
    
    // Default import relationship
    return 'import';
  }

  /**
   * Calculate relationship strength
   */
  calculateRelationshipStrength(fromFile, dependency) {
    let strength = 0;
    
    // Usage frequency
    const usageCount = dependency.usageCount || 1;
    strength += Math.min(usageCount / 10, 3); // 0-3 points
    
    // Import type importance
    if (dependency.importType === 'default') strength += 2;
    if (dependency.importType === 'namespace') strength += 3;
    if (dependency.importType === 'named') strength += 1;
    
    // Conditional usage reduces strength
    if (dependency.isConditional) strength *= 0.7;
    if (dependency.isOptional) strength *= 0.5;
    
    // Critical path importance
    if (this.isInCriticalPath(fromFile, dependency)) strength += 2;
    
    // Normalize to categories
    if (strength >= 5) return 'critical';
    if (strength >= 3) return 'strong';
    if (strength >= 1.5) return 'medium';
    return 'weak';
  }

  /**
   * Detect user flows automatically
   */
  async detectUserFlows(scanResults) {
    const flows = [];
    
    // 1. Find entry points (pages, routes, main components)
    const entryPoints = this.findEntryPoints(scanResults.files);
    
    // 2. Trace execution paths from each entry point
    for (const entryPoint of entryPoints) {
      const flow = await this.traceUserFlow(entryPoint, scanResults);
      if (flow.files.length > 2) { // Only include substantial flows
        flows.push(flow);
      }
    }
    
    // 3. Detect common flow patterns
    const commonFlows = this.detectCommonFlowPatterns(flows);
    
    // 4. Add predefined critical flows
    const criticalFlows = this.addCriticalFlows(scanResults);
    
    return {
      detected: flows,
      common: commonFlows,
      critical: criticalFlows,
      all: [...flows, ...commonFlows, ...criticalFlows]
    };
  }

  /**
   * Trace complete user flow from entry point
   */
  async traceUserFlow(entryPoint, scanResults) {
    const flowFiles = new Set();
    const flowSteps = [];
    const visited = new Set();
    
    // Start tracing from entry point
    await this.traceFlowRecursive(entryPoint, scanResults, flowFiles, flowSteps, visited, 0, 8);
    
    // Analyze the traced flow
    const flowAnalysis = this.analyzeTracedFlow(Array.from(flowFiles), flowSteps);
    
    return {
      id: `flow-${entryPoint.name.replace(/[^a-zA-Z0-9]/g, '-')}`,
      name: this.generateFlowName(entryPoint, flowSteps),
      description: this.generateFlowDescription(entryPoint, flowAnalysis),
      
      // Flow characteristics
      entryPoint: entryPoint.filePath,
      files: Array.from(flowFiles),
      steps: flowSteps,
      
      // Visual properties
      color: this.assignFlowColor(flowAnalysis),
      icon: this.assignFlowIcon(flowAnalysis),
      
      // Flow metrics
      metrics: {
        complexity: flowAnalysis.complexity,
        performance: flowAnalysis.performance,
        testCoverage: flowAnalysis.testCoverage,
        maintainability: flowAnalysis.maintainability
      },
      
      // Flow classification
      classification: {
        isCritical: flowAnalysis.isCritical,
        isUserFacing: flowAnalysis.isUserFacing,
        isPerformanceSensitive: flowAnalysis.isPerformanceSensitive,
        category: flowAnalysis.category
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
    
    // Add step to flow
    const step = {
      order: flowSteps.length + 1,
      file: currentFile.filePath,
      action: this.inferFileAction(currentFile),
      dependencies: [],
      metadata: {
        isAsync: this.hasAsyncOperations(currentFile),
        hasStateChanges: this.hasStateChanges(currentFile),
        hasApiCalls: this.hasApiCalls(currentFile),
        isUserInteraction: this.isUserInteractionFile(currentFile)
      }
    };
    
    // Find dependencies of this file
    const dependencies = this.getFileDependencies(currentFile, scanResults);
    
    for (const dep of dependencies) {
      if (this.isRelevantToUserFlow(dep)) {
        step.dependencies.push(dep.target);
        
        // Continue tracing
        const depFile = scanResults.files.find(f => f.filePath === dep.target);
        if (depFile) {
          await this.traceFlowRecursive(depFile, scanResults, flowFiles, flowSteps, visited, depth + 1, maxDepth);
        }
      }
    }
    
    flowSteps.push(step);
  }

  /**
   * Analyze architectural layers
   */
  async analyzeArchitecture(scanResults) {
    const layers = {
      presentation: {
        name: 'Presentation Layer',
        description: 'User interface components and pages',
        color: '#3b82f6',
        files: [],
        dependencies: { internal: 0, external: 0 },
        metrics: { complexity: 0, testCoverage: 0 }
      },
      
      business: {
        name: 'Business Layer',
        description: 'Business logic and application services',
        color: '#10b981',
        files: [],
        dependencies: { internal: 0, external: 0 },
        metrics: { complexity: 0, testCoverage: 0 }
      },
      
      data: {
        name: 'Data Layer',
        description: 'Data models and API integrations',
        color: '#8b5cf6',
        files: [],
        dependencies: { internal: 0, external: 0 },
        metrics: { complexity: 0, testCoverage: 0 }
      },
      
      infrastructure: {
        name: 'Infrastructure Layer',
        description: 'Utilities, configuration, and shared code',
        color: '#6b7280',
        files: [],
        dependencies: { internal: 0, external: 0 },
        metrics: { complexity: 0, testCoverage: 0 }
      }
    };

    // Classify files into layers
    for (const file of scanResults.files) {
      const layer = this.determineArchitecturalLayer(file.filePath);
      if (layers[layer]) {
        layers[layer].files.push(file.filePath);
        layers[layer].metrics.complexity += file.complexity || 0;
      }
    }

    // Calculate layer metrics
    Object.values(layers).forEach(layer => {
      layer.metrics.complexity = layer.files.length > 0 
        ? layer.metrics.complexity / layer.files.length 
        : 0;
      layer.metrics.testCoverage = this.calculateLayerTestCoverage(layer.files);
    });

    // Detect architectural violations
    const violations = this.detectArchitecturalViolations(scanResults, layers);

    return {
      layers,
      violations,
      health: this.calculateArchitecturalHealth(layers, violations)
    };
  }

  /**
   * Detect common flow patterns
   */
  detectCommonFlowPatterns(flows) {
    const patterns = [];
    
    // Authentication flow pattern
    const authFlow = this.detectAuthenticationFlow(flows);
    if (authFlow) patterns.push(authFlow);
    
    // CRUD operation flows
    const crudFlows = this.detectCRUDFlows(flows);
    patterns.push(...crudFlows);
    
    // Navigation flows
    const navFlows = this.detectNavigationFlows(flows);
    patterns.push(...navFlows);
    
    // Data processing flows
    const dataFlows = this.detectDataProcessingFlows(flows);
    patterns.push(...dataFlows);
    
    return patterns;
  }

  /**
   * Add predefined critical flows
   */
  addCriticalFlows(scanResults) {
    return [
      {
        id: 'app-initialization',
        name: 'Application Initialization',
        description: 'Critical application startup sequence',
        color: '#dc2626',
        icon: '🚀',
        isCritical: true,
        files: this.findInitializationFiles(scanResults),
        category: 'system'
      },
      
      {
        id: 'error-handling',
        name: 'Error Handling',
        description: 'Error boundary and error handling flow',
        color: '#f59e0b',
        icon: '⚠️',
        isCritical: true,
        files: this.findErrorHandlingFiles(scanResults),
        category: 'reliability'
      },
      
      {
        id: 'performance-critical',
        name: 'Performance Critical Path',
        description: 'Files that impact application performance',
        color: '#ef4444',
        icon: '⚡',
        isCritical: true,
        files: this.findPerformanceCriticalFiles(scanResults),
        category: 'performance'
      }
    ];
  }

  /**
   * Helper methods for file classification
   */
  findEntryPoints(files) {
    return files.filter(file => {
      const filePath = file.filePath.toLowerCase();
      return (
        filePath.includes('app.') ||
        filePath.includes('main.') ||
        filePath.includes('index.') ||
        filePath.includes('route') ||
        filePath.includes('page') ||
        file.isEntryPoint
      );
    });
  }

  isComponent(filePath) {
    return filePath.includes('component') || 
           filePath.includes('page') || 
           /\.(jsx|tsx)$/.test(filePath);
  }

  isService(filePath) {
    return filePath.includes('service') || 
           filePath.includes('api') || 
           filePath.includes('business');
  }

  isUtility(filePath) {
    return filePath.includes('util') || 
           filePath.includes('helper') || 
           filePath.includes('lib');
  }

  isConfig(filePath) {
    return filePath.includes('config') || 
           filePath.includes('setting') || 
           /\.config\.(js|ts)$/.test(filePath);
  }

  isEntryPoint(filePath) {
    const fileName = path.basename(filePath).toLowerCase();
    return fileName.includes('app.') || 
           fileName.includes('main.') || 
           fileName.includes('index.');
  }

  isTestFile(filePath) {
    return filePath.includes('.test.') || 
           filePath.includes('.spec.') || 
           filePath.includes('/test/');
  }

  isConfigFile(filePath) {
    return this.isConfig(filePath);
  }

  /**
   * Calculate various quality metrics
   */
  estimateTestCoverage(filePath) {
    // Estimate test coverage based on file patterns
    const testFile = this.findCorrespondingTestFile(filePath);
    return testFile ? 75 + Math.random() * 25 : Math.random() * 40;
  }

  calculateMaintainability(file) {
    let score = 100;
    
    // Reduce score for complexity
    score -= Math.min((file.complexity || 0) * 2, 30);
    
    // Reduce score for file size
    score -= Math.min((file.lines || 0) / 50, 20);
    
    // Reduce score for dependency count
    const depCount = file.dependencies?.imports?.length || 0;
    score -= Math.min(depCount * 2, 25);
    
    return Math.max(0, Math.min(100, score));
  }

  calculateStability(filePath) {
    // Stability = outgoing dependencies / (incoming + outgoing)
    // Higher stability = fewer outgoing dependencies
    const outgoing = this.dependencyGraph.get(filePath)?.length || 0;
    const incoming = this.reverseDependencyGraph.get(filePath)?.length || 0;
    
    if (incoming + outgoing === 0) return 1;
    return incoming / (incoming + outgoing);
  }

  calculateAbstractness(content) {
    // Abstractness = abstract elements / total elements
    const abstractCount = (content.match(/abstract|interface|type/g) || []).length;
    const totalCount = (content.match(/class|function|const|let|var/g) || []).length;
    
    if (totalCount === 0) return 0;
    return Math.min(abstractCount / totalCount, 1);
  }

  /**
   * Performance and bundle analysis
   */
  estimateBundleSize(file) {
    // Estimate bundle contribution
    const baseSize = file.size || 0;
    const dependencySize = (file.dependencies?.imports?.length || 0) * 1024; // Rough estimate
    return baseSize + dependencySize;
  }

  estimateLoadTime(file) {
    // Estimate load time based on size and complexity
    const size = file.size || 0;
    const complexity = file.complexity || 0;
    return (size / 1000) + (complexity * 10); // Rough millisecond estimate
  }

  calculateRenderComplexity(content) {
    // Analyze rendering complexity for UI components
    const renderingPatterns = [
      /useEffect/g,
      /useState/g,
      /map\(/g,
      /filter\(/g,
      /reduce\(/g,
      /\.map\(/g
    ];
    
    let complexity = 0;
    renderingPatterns.forEach(pattern => {
      complexity += (content.match(pattern) || []).length;
    });
    
    return complexity;
  }

  /**
   * Flow analysis methods
   */
  generateFlowName(entryPoint, steps) {
    const fileName = path.basename(entryPoint.filePath, path.extname(entryPoint.filePath));
    
    if (fileName.toLowerCase().includes('login')) return 'User Authentication';
    if (fileName.toLowerCase().includes('dashboard')) return 'Dashboard Overview';
    if (fileName.toLowerCase().includes('settings')) return 'Settings Management';
    if (fileName.toLowerCase().includes('project')) return 'Project Management';
    if (fileName.toLowerCase().includes('scan')) return 'Code Analysis';
    if (fileName.toLowerCase().includes('ai')) return 'AI Insights';
    
    return `${fileName} Flow`;
  }

  assignFlowColor(analysis) {
    if (analysis.category === 'authentication') return '#3b82f6';
    if (analysis.category === 'data-processing') return '#10b981';
    if (analysis.category === 'user-interface') return '#f59e0b';
    if (analysis.category === 'system') return '#dc2626';
    if (analysis.category === 'ai') return '#8b5cf6';
    return '#6b7280';
  }

  assignFlowIcon(analysis) {
    if (analysis.category === 'authentication') return '🔐';
    if (analysis.category === 'data-processing') return '🔍';
    if (analysis.category === 'user-interface') return '🎨';
    if (analysis.category === 'system') return '🚀';
    if (analysis.category === 'ai') return '🤖';
    return '📄';
  }

  /**
   * Get visual properties for relationships
   */
  getRelationshipColor(type) {
    const colorMap = {
      'import': '#06b6d4',
      'external-import': '#f59e0b',
      'dynamic-import': '#8b5cf6',
      'type-import': '#ec4899',
      'composition': '#10b981',
      'service-call': '#ef4444',
      'utility-usage': '#84cc16',
      'config-usage': '#6b7280'
    };
    
    return colorMap[type] || '#6b7280';
  }

  getRelationshipWidth(strength) {
    const widthMap = {
      'critical': 4,
      'strong': 3,
      'medium': 2,
      'weak': 1
    };
    
    return widthMap[strength] || 2;
  }

  getRelationshipStyle(type) {
    const styleMap = {
      'import': 'solid',
      'external-import': 'dashed',
      'dynamic-import': 'dotted',
      'type-import': 'dashed',
      'composition': 'solid',
      'service-call': 'solid',
      'utility-usage': 'dashed',
      'config-usage': 'dotted'
    };
    
    return styleMap[type] || 'solid';
  }

  getRelationshipOpacity(strength) {
    const opacityMap = {
      'critical': 1.0,
      'strong': 0.9,
      'medium': 0.7,
      'weak': 0.5
    };
    
    return opacityMap[strength] || 0.7;
  }
}

export default DependencyAnalyzer;
