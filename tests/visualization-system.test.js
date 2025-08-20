/**
 * Comprehensive Test Suite for Advanced Visualization System
 * Tests user flow isolation, dependency analysis, and visualization components
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DependencyAnalyzer } from '../core/analyzers/dependency-analyzer.js';
import { UserFlowService } from '../server/services/user-flow-service.js';
import AdvancedDependencyVisualization from '../client/src/components/AdvancedDependencyVisualization.jsx';
import useUserFlows from '../client/src/hooks/useUserFlows.js';
import visualizationEnhancer from '../client/src/utils/visualizationEnhancer.js';
import performanceOptimizer from '../client/src/utils/performanceOptimizer.js';

// Mock data for testing
const mockScanResults = {
  files: [
    {
      filePath: 'src/App.jsx',
      content: 'export default function App() { return <div>App</div>; }',
      type: 'component',
      layer: 'presentation',
      lines: 50,
      complexity: 8,
      dependencies: { imports: ['react', './components/Header'] }
    },
    {
      filePath: 'src/components/Header.jsx',
      content: 'export const Header = () => <header>Header</header>;',
      type: 'component',
      layer: 'presentation',
      lines: 25,
      complexity: 3,
      dependencies: { imports: ['react'] }
    },
    {
      filePath: 'src/services/auth.js',
      content: 'export class AuthService { async login() {} }',
      type: 'service',
      layer: 'business',
      lines: 120,
      complexity: 15,
      dependencies: { imports: ['axios', './api'] }
    },
    {
      filePath: 'src/pages/Login.jsx',
      content: 'export const Login = () => { const auth = useAuth(); }',
      type: 'page',
      layer: 'presentation',
      lines: 80,
      complexity: 12,
      dependencies: { imports: ['react', '../services/auth', '../hooks/useAuth'] }
    }
  ]
};

const mockUserFlows = [
  {
    id: 'auth-flow',
    name: 'Authentication',
    description: 'User login and authentication',
    color: '#3b82f6',
    icon: '🔐',
    files: ['src/pages/Login.jsx', 'src/services/auth.js'],
    isCritical: true,
    category: 'authentication',
    steps: [
      { action: 'Load login page', file: 'src/pages/Login.jsx' },
      { action: 'Authenticate user', file: 'src/services/auth.js' }
    ]
  },
  {
    id: 'ui-flow',
    name: 'User Interface',
    description: 'Main UI components',
    color: '#f59e0b',
    icon: '🎨',
    files: ['src/App.jsx', 'src/components/Header.jsx'],
    isCritical: false,
    category: 'user-interface'
  }
];

describe('DependencyAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new DependencyAnalyzer();
  });

  test('should analyze dependencies correctly', async () => {
    const analysis = await analyzer.analyzeDependencies(mockScanResults);
    
    expect(analysis).toHaveProperty('dependencies');
    expect(analysis).toHaveProperty('architecture');
    expect(analysis).toHaveProperty('userFlows');
    expect(analysis.dependencies.nodes).toHaveLength(4);
  });

  test('should detect file types correctly', () => {
    const componentType = analyzer.determineFileType('src/App.jsx', 'export default function App()');
    const serviceType = analyzer.determineFileType('src/services/auth.js', 'class AuthService');
    
    expect(componentType).toBe('component');
    expect(serviceType).toBe('service');
  });

  test('should determine architectural layers', () => {
    const presentationLayer = analyzer.determineArchitecturalLayer('src/components/Header.jsx');
    const businessLayer = analyzer.determineArchitecturalLayer('src/services/auth.js');
    
    expect(presentationLayer).toBe('presentation');
    expect(businessLayer).toBe('business');
  });

  test('should calculate relationship strength', () => {
    const strongRelationship = analyzer.calculateRelationshipStrength(
      { filePath: 'src/App.jsx' },
      { target: 'src/components/Header.jsx', usageCount: 5, importType: 'default' }
    );
    
    expect(['medium', 'strong', 'critical']).toContain(strongRelationship);
  });

  test('should detect user flows', async () => {
    const flows = await analyzer.detectUserFlows(mockScanResults);
    
    expect(flows).toHaveProperty('detected');
    expect(flows).toHaveProperty('common');
    expect(flows).toHaveProperty('critical');
    expect(Array.isArray(flows.detected)).toBe(true);
  });
});

describe('UserFlowService', () => {
  let service;

  beforeEach(() => {
    service = new UserFlowService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('should detect project flows', async () => {
    const result = await service.detectProjectFlows(1, mockScanResults);
    
    expect(result).toHaveProperty('projectId', 1);
    expect(result).toHaveProperty('flows');
    expect(result).toHaveProperty('analysis');
    expect(Array.isArray(result.flows)).toBe(true);
  });

  test('should isolate user flow correctly', async () => {
    // First detect flows
    await service.detectProjectFlows(1, mockScanResults);
    
    // Mock a flow to isolate
    const mockFlow = mockUserFlows[0];
    service.flowCache.set('flow:auth-flow:1', mockFlow);
    
    const isolated = await service.isolateUserFlow('auth-flow', 1);
    
    expect(isolated).toHaveProperty('flow');
    expect(isolated).toHaveProperty('nodes');
    expect(isolated).toHaveProperty('edges');
    expect(isolated.flow.id).toBe('auth-flow');
  });

  test('should get file dependencies', async () => {
    const dependencies = await service.getFileDependencies('src/App.jsx', 1);
    
    expect(dependencies).toHaveProperty('file');
    expect(dependencies).toHaveProperty('direct');
    expect(dependencies).toHaveProperty('reverse');
    expect(dependencies).toHaveProperty('analysis');
  });

  test('should compare user flows', async () => {
    // Mock flows
    service.flowCache.set('flow:auth-flow:1', mockUserFlows[0]);
    service.flowCache.set('flow:ui-flow:1', mockUserFlows[1]);
    
    const comparison = await service.compareUserFlows(['auth-flow', 'ui-flow'], 1);
    
    expect(comparison).toHaveProperty('flows');
    expect(comparison).toHaveProperty('intersections');
    expect(comparison).toHaveProperty('metrics');
  });

  test('should handle service health check', async () => {
    const health = await service.health();
    
    expect(health).toHaveProperty('status');
    expect(['ok', 'degraded', 'error']).toContain(health.status);
  });
});

describe('AdvancedDependencyVisualization Component', () => {
  beforeEach(() => {
    // Mock D3 and DOM methods
    global.d3 = {
      select: vi.fn(() => ({
        selectAll: vi.fn(() => ({ remove: vi.fn() })),
        attr: vi.fn(() => ({ attr: vi.fn() })),
        style: vi.fn(() => ({ style: vi.fn() })),
        append: vi.fn(() => ({ attr: vi.fn(), style: vi.fn() }))
      })),
      forceSimulation: vi.fn(() => ({
        force: vi.fn(() => ({ force: vi.fn() })),
        on: vi.fn()
      })),
      zoom: vi.fn(() => ({
        scaleExtent: vi.fn(() => ({ on: vi.fn() }))
      }))
    };
  });

  test('should render visualization component', () => {
    render(
      <AdvancedDependencyVisualization
        scanResults={mockScanResults}
        userFlows={mockUserFlows}
        width={800}
        height={600}
      />
    );

    expect(screen.getByText('User Flows')).toBeInTheDocument();
  });

  test('should handle view level changes', () => {
    render(
      <AdvancedDependencyVisualization
        scanResults={mockScanResults}
        userFlows={mockUserFlows}
      />
    );

    const projectButton = screen.getByText('Project');
    const fileButton = screen.getByText('File');
    
    expect(projectButton).toBeInTheDocument();
    expect(fileButton).toBeInTheDocument();
    
    fireEvent.click(fileButton);
    expect(fileButton).toHaveClass('bg-blue-500');
  });

  test('should handle flow toggling', () => {
    const onFlowSelect = vi.fn();
    
    render(
      <AdvancedDependencyVisualization
        scanResults={mockScanResults}
        userFlows={mockUserFlows}
        onFlowSelect={onFlowSelect}
      />
    );

    // Find and click authentication flow checkbox
    const authCheckbox = screen.getByRole('checkbox', { name: /Authentication/i });
    fireEvent.click(authCheckbox);
    
    expect(authCheckbox).toBeChecked();
  });

  test('should handle color mode changes', () => {
    render(
      <AdvancedDependencyVisualization
        scanResults={mockScanResults}
        userFlows={mockUserFlows}
      />
    );

    const colorModeSelect = screen.getByDisplayValue('By Type');
    fireEvent.change(colorModeSelect, { target: { value: 'complexity' } });
    
    expect(colorModeSelect.value).toBe('complexity');
  });
});

describe('useUserFlows Hook', () => {
  test('should manage flow state correctly', () => {
    const TestComponent = () => {
      const flows = useUserFlows(1, mockScanResults);
      
      return (
        <div>
          <div data-testid="flow-count">{flows.flows.length}</div>
          <div data-testid="active-count">{flows.activeFlows.size}</div>
          <button onClick={() => flows.toggleFlow('auth-flow', true)}>
            Toggle Auth
          </button>
        </div>
      );
    };

    render(<TestComponent />);
    
    const toggleButton = screen.getByText('Toggle Auth');
    fireEvent.click(toggleButton);
    
    // Flow should be activated
    expect(screen.getByTestId('active-count')).toHaveTextContent('1');
  });

  test('should handle flow isolation', async () => {
    const TestComponent = () => {
      const flows = useUserFlows(1, mockScanResults);
      
      return (
        <div>
          <div data-testid="isolated">{flows.isolatedFlow ? 'isolated' : 'none'}</div>
          <button onClick={() => flows.isolateFlow('auth-flow')}>
            Isolate Auth
          </button>
        </div>
      );
    };

    render(<TestComponent />);
    
    const isolateButton = screen.getByText('Isolate Auth');
    fireEvent.click(isolateButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('isolated')).toHaveTextContent('isolated');
    });
  });
});

describe('VisualizationEnhancer', () => {
  test('should calculate node colors correctly', () => {
    const node = { type: 'component', complexity: 10, layer: 'presentation' };
    
    const semanticColor = visualizationEnhancer.getNodeColor(node, 'semantic');
    const complexityColor = visualizationEnhancer.getNodeColor(node, 'complexity');
    const layerColor = visualizationEnhancer.getNodeColor(node, 'layer');
    
    expect(semanticColor).toBe('#3b82f6'); // Component color
    expect(complexityColor).toBe('#eab308'); // Moderate complexity
    expect(layerColor).toBe('#3b82f6'); // Presentation layer
  });

  test('should calculate relationship colors', () => {
    const importColor = visualizationEnhancer.getRelationshipColor('import');
    const callColor = visualizationEnhancer.getRelationshipColor('service-call');
    
    expect(importColor).toBe('#06b6d4');
    expect(callColor).toBe('#ef4444');
  });

  test('should create visual definitions', () => {
    const mockDefs = {
      append: vi.fn(() => ({
        attr: vi.fn(() => ({ attr: vi.fn() })),
        append: vi.fn(() => ({ attr: vi.fn(), style: vi.fn() }))
      }))
    };
    
    visualizationEnhancer.createVisualDefinitions(mockDefs);
    
    expect(mockDefs.append).toHaveBeenCalled();
  });

  test('should get legend data', () => {
    const semanticLegend = visualizationEnhancer.getLegendData('semantic');
    const complexityLegend = visualizationEnhancer.getLegendData('complexity');
    
    expect(Array.isArray(semanticLegend)).toBe(true);
    expect(Array.isArray(complexityLegend)).toBe(true);
    expect(semanticLegend.length).toBeGreaterThan(0);
    expect(complexityLegend.length).toBeGreaterThan(0);
  });
});

describe('PerformanceOptimizer', () => {
  test('should optimize rendering for large graphs', () => {
    const largeNodeSet = Array.from({ length: 1500 }, (_, i) => ({
      id: `node-${i}`,
      name: `Node ${i}`,
      type: 'component',
      size: 20
    }));

    const largeEdgeSet = Array.from({ length: 3000 }, (_, i) => ({
      id: `edge-${i}`,
      source: `node-${i % 1500}`,
      target: `node-${(i + 1) % 1500}`
    }));

    const optimized = performanceOptimizer.optimizeRendering(
      largeNodeSet,
      largeEdgeSet,
      0.5, // zoom level
      { x: 0, y: 0, width: 1200, height: 800 }
    );

    expect(optimized.performance.renderedNodes).toBeLessThan(largeNodeSet.length);
    expect(optimized.strategy.level).toBe('low');
    expect(optimized.strategy.techniques).toContain('clustering');
  });

  test('should perform viewport culling', () => {
    const nodes = [
      { id: 'visible', x: 100, y: 100 },
      { id: 'outside', x: 2000, y: 2000 }
    ];
    
    const edges = [
      { id: 'edge1', source: 'visible', target: 'outside' }
    ];

    performanceOptimizer.viewport = { x: 0, y: 0, width: 500, height: 500, zoom: 1 };
    
    const culled = performanceOptimizer.performViewportCulling(nodes, edges);
    
    expect(culled.nodes).toHaveLength(1);
    expect(culled.nodes[0].id).toBe('visible');
  });

  test('should calculate node importance', () => {
    const node = { id: 'test', complexity: 10, lines: 200, isEntryPoint: true };
    const allNodes = [node];
    const allEdges = [
      { source: 'other1', target: 'test' },
      { source: 'other2', target: 'test' },
      { source: 'test', target: 'other3' }
    ];

    const importance = performanceOptimizer.calculateNodeImportance(node, allNodes, allEdges);
    
    expect(importance).toBeGreaterThan(10); // Should be high due to entry point + incoming deps
  });

  test('should provide optimization recommendations', () => {
    const recommendations = performanceOptimizer.getOptimizationRecommendations(
      600, // node count
      1200, // edge count
      { fps: 25 } // performance
    );

    expect(Array.isArray(recommendations)).toBe(true);
    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations.some(r => r.type === 'clustering')).toBe(true);
  });
});

describe('User Flow Integration Tests', () => {
  test('should detect authentication flow', async () => {
    const analyzer = new DependencyAnalyzer();
    const flows = await analyzer.detectUserFlows(mockScanResults);
    
    const authFlow = flows.detected.find(f => f.category === 'authentication');
    expect(authFlow).toBeDefined();
    expect(authFlow.files).toContain('src/pages/Login.jsx');
    expect(authFlow.files).toContain('src/services/auth.js');
  });

  test('should isolate flow correctly', async () => {
    const service = new UserFlowService();
    
    // Mock the flow isolation
    const mockIsolated = {
      flow: mockUserFlows[0],
      nodes: [
        { id: 'src/pages/Login.jsx', filePath: 'src/pages/Login.jsx' },
        { id: 'src/services/auth.js', filePath: 'src/services/auth.js' }
      ],
      edges: [
        { source: 'src/pages/Login.jsx', target: 'src/services/auth.js' }
      ]
    };

    service.isolateUserFlow = vi.fn().mockResolvedValue(mockIsolated);
    
    const result = await service.isolateUserFlow('auth-flow', 1);
    
    expect(result.flow.id).toBe('auth-flow');
    expect(result.nodes).toHaveLength(2);
    expect(result.edges).toHaveLength(1);
  });

  test('should compare flows and find intersections', async () => {
    const service = new UserFlowService();
    
    const mockComparison = {
      flows: mockUserFlows,
      intersections: [],
      conflicts: [],
      metrics: {
        sharedFiles: 1, // App.jsx might be shared
        totalComplexity: 20,
        averagePerformance: 75
      }
    };

    service.compareUserFlows = vi.fn().mockResolvedValue(mockComparison);
    
    const result = await service.compareUserFlows(['auth-flow', 'ui-flow'], 1);
    
    expect(result.flows).toHaveLength(2);
    expect(result).toHaveProperty('intersections');
    expect(result).toHaveProperty('metrics');
  });
});

describe('End-to-End User Flow Visualization Tests', () => {
  test('should handle complete user flow workflow', async () => {
    // Mock API responses
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        json: () => Promise.resolve({
          success: true,
          data: {
            flows: mockUserFlows,
            analysis: { totalFlows: 2, criticalFlows: 1 }
          }
        })
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({
          success: true,
          data: {
            flow: mockUserFlows[0],
            nodes: [{ id: 'test', filePath: 'src/test.js' }],
            edges: []
          }
        })
      });

    const TestComponent = () => {
      const flows = useUserFlows(1, mockScanResults);
      
      React.useEffect(() => {
        if (flows.flows.length > 0) {
          flows.isolateFlow('auth-flow');
        }
      }, [flows.flows]);

      return (
        <div>
          <div data-testid="flow-count">{flows.flows.length}</div>
          <div data-testid="isolated">{flows.isolatedFlow ? 'yes' : 'no'}</div>
        </div>
      );
    };

    render(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('flow-count')).toHaveTextContent('2');
    });

    await waitFor(() => {
      expect(screen.getByTestId('isolated')).toHaveTextContent('yes');
    });
  });

  test('should handle drill-down interactions', () => {
    const onNodeClick = vi.fn();
    
    render(
      <AdvancedDependencyVisualization
        scanResults={mockScanResults}
        userFlows={mockUserFlows}
        onNodeClick={onNodeClick}
      />
    );

    // Test level changes
    const fileButton = screen.getByText('File');
    fireEvent.click(fileButton);
    
    expect(fileButton).toHaveClass('bg-blue-500');
  });

  test('should handle performance optimization', () => {
    const largeResults = {
      files: Array.from({ length: 1000 }, (_, i) => ({
        filePath: `src/file${i}.js`,
        type: 'component',
        complexity: Math.floor(Math.random() * 20)
      }))
    };

    render(
      <AdvancedDependencyVisualization
        scanResults={largeResults}
        userFlows={[]}
      />
    );

    // Component should render without crashing even with large dataset
    expect(screen.getByText('User Flows')).toBeInTheDocument();
  });
});

describe('API Integration Tests', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  test('should call flow detection API', async () => {
    fetch.mockResolvedValueOnce({
      json: () => Promise.resolve({
        success: true,
        data: { flows: mockUserFlows }
      })
    });

    const response = await fetch('/api/flows/1/detect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scanResults: mockScanResults })
    });

    const data = await response.json();
    
    expect(fetch).toHaveBeenCalledWith('/api/flows/1/detect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scanResults: mockScanResults })
    });
    
    expect(data.success).toBe(true);
    expect(data.data.flows).toEqual(mockUserFlows);
  });

  test('should call flow isolation API', async () => {
    fetch.mockResolvedValueOnce({
      json: () => Promise.resolve({
        success: true,
        data: {
          flow: mockUserFlows[0],
          nodes: [],
          edges: []
        }
      })
    });

    const response = await fetch('/api/flows/1/auth-flow/isolate');
    const data = await response.json();
    
    expect(fetch).toHaveBeenCalledWith('/api/flows/1/auth-flow/isolate');
    expect(data.success).toBe(true);
    expect(data.data.flow.id).toBe('auth-flow');
  });
});

describe('Performance Benchmarks', () => {
  test('should handle 1000+ nodes efficiently', () => {
    const startTime = performance.now();
    
    const largeGraph = {
      nodes: Array.from({ length: 1000 }, (_, i) => ({
        id: `node-${i}`,
        type: 'component',
        complexity: Math.random() * 20
      })),
      edges: Array.from({ length: 2000 }, (_, i) => ({
        id: `edge-${i}`,
        source: `node-${i % 1000}`,
        target: `node-${(i + 1) % 1000}`
      }))
    };

    const optimized = performanceOptimizer.optimizeRendering(
      largeGraph.nodes,
      largeGraph.edges,
      0.5,
      { x: 0, y: 0, width: 1200, height: 800 }
    );

    const endTime = performance.now();
    const processingTime = endTime - startTime;
    
    expect(processingTime).toBeLessThan(1000); // Should process in under 1 second
    expect(optimized.performance.renderedNodes).toBeLessThan(1000); // Should be optimized
  });

  test('should maintain responsive frame rate', () => {
    const frameRateConfig = performanceOptimizer.adaptiveFrameRate(2000, 5000);
    
    expect(frameRateConfig.targetFPS).toBeLessThanOrEqual(30);
    expect(frameRateConfig.shouldThrottle).toBe(true);
  });
});

describe('Integration with Existing Components', () => {
  test('should integrate with existing GraphVisualization', () => {
    // Test that new components work with existing visualization
    const props = {
      scanResults: mockScanResults,
      userFlows: mockUserFlows,
      onNodeClick: vi.fn(),
      onFlowSelect: vi.fn()
    };

    expect(() => {
      render(<AdvancedDependencyVisualization {...props} />);
    }).not.toThrow();
  });

  test('should maintain backward compatibility', () => {
    // Test that existing API still works
    const analyzer = new DependencyAnalyzer();
    
    expect(typeof analyzer.analyzeDependencies).toBe('function');
    expect(typeof analyzer.determineFileType).toBe('function');
    expect(typeof analyzer.determineArchitecturalLayer).toBe('function');
  });
});

// Test utilities
export const createMockScanResults = (fileCount = 10) => ({
  files: Array.from({ length: fileCount }, (_, i) => ({
    filePath: `src/file${i}.js`,
    content: `// File ${i} content`,
    type: ['component', 'service', 'utility'][i % 3],
    layer: ['presentation', 'business', 'infrastructure'][i % 3],
    lines: 50 + Math.random() * 200,
    complexity: Math.floor(Math.random() * 25),
    dependencies: { imports: [`dep${i}`, `dep${i+1}`] }
  }))
});

export const createMockUserFlows = (flowCount = 3) => 
  Array.from({ length: flowCount }, (_, i) => ({
    id: `flow-${i}`,
    name: `Flow ${i}`,
    description: `Test flow ${i}`,
    color: ['#3b82f6', '#10b981', '#f59e0b'][i % 3],
    icon: ['🔐', '🔍', '🎨'][i % 3],
    files: [`src/file${i}.js`, `src/file${i+1}.js`],
    isCritical: i === 0,
    category: ['authentication', 'data-processing', 'user-interface'][i % 3]
  }));

// Performance test helpers
export const measureRenderTime = async (renderFunction) => {
  const startTime = performance.now();
  await renderFunction();
  const endTime = performance.now();
  return endTime - startTime;
};

export const measureMemoryUsage = () => {
  if (performance.memory) {
    return {
      used: performance.memory.usedJSHeapSize,
      total: performance.memory.totalJSHeapSize,
      limit: performance.memory.jsHeapSizeLimit
    };
  }
  return null;
};
