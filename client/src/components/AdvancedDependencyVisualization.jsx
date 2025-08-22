/**
 * Advanced Dependency Visualization Component
 * Multi-level drill-down with user flow isolation and intelligent analysis
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Search,
  Filter,
  Layers,
  GitBranch,
  FileText,
  Code,
  TrendingUp,
  Eye,
  EyeOff,
  Target,
  Home,
  ChevronRight,
  Settings,
  Download,
  Play,
  Pause,
  SkipBack
} from 'lucide-react';

const AdvancedDependencyVisualization = ({
  scanResults,
  userFlows = [],
  onNodeClick,
  onFlowSelect,
  width = 1200,
  height = 800
}) => {
  // Multi-level state management
  const [viewLevel, setViewLevel] = useState('project'); // project, module, file, symbol
  const [drillPath, setDrillPath] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [focusedFile, setFocusedFile] = useState(null);
  
  // Flow state
  const [activeFlows, setActiveFlows] = useState(new Set());
  const [isolatedFlow, setIsolatedFlow] = useState(null);
  const [flowAnimation, setFlowAnimation] = useState(false);
  
  // Visualization state
  const [colorMode, setColorMode] = useState('semantic'); // semantic, complexity, health, layer
  const [layoutMode, setLayoutMode] = useState('smart'); // smart, force, hierarchical, circular
  const [showLabels, setShowLabels] = useState(true);
  const [showMetrics, setShowMetrics] = useState(true);
  const [filterMode, setFilterMode] = useState('all');
  
  // Interaction state
  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedNodes, setSelectedNodes] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [zoomLevel, setZoomLevel] = useState(1);

  // Refs
  const svgRef = useRef();
  const containerRef = useRef();
  const tooltipRef = useRef();

  // Enhanced color schemes
  const semanticColors = {
    // File types
    component: { base: '#3b82f6', gradient: ['#3b82f6', '#1d4ed8'], description: 'UI Components' },
    service: { base: '#10b981', gradient: ['#10b981', '#047857'], description: 'Business Logic' },
    model: { base: '#8b5cf6', gradient: ['#8b5cf6', '#6d28d9'], description: 'Data Models' },
    utility: { base: '#6b7280', gradient: ['#6b7280', '#374151'], description: 'Utilities' },
    config: { base: '#f59e0b', gradient: ['#f59e0b', '#d97706'], description: 'Configuration' },
    test: { base: '#22c55e', gradient: ['#22c55e', '#16a34a'], description: 'Tests' },
    page: { base: '#ec4899', gradient: ['#ec4899', '#be185d'], description: 'Pages' },
    hook: { base: '#06b6d4', gradient: ['#06b6d4', '#0891b2'], description: 'React Hooks' }
  };

  const complexityColors = {
    simple: { base: '#22c55e', range: [0, 5] },
    moderate: { base: '#eab308', range: [6, 15] },
    complex: { base: '#f97316', range: [16, 30] },
    critical: { base: '#ef4444', range: [31, Infinity] }
  };

  const layerColors = {
    presentation: { base: '#3b82f6', description: 'User Interface' },
    business: { base: '#10b981', description: 'Business Logic' },
    data: { base: '#8b5cf6', description: 'Data Layer' },
    infrastructure: { base: '#6b7280', description: 'Infrastructure' }
  };

  // Initialize visualization
  useEffect(() => {
    if (scanResults && svgRef.current) {
      renderVisualization();
    }
  }, [scanResults, viewLevel, activeFlows, isolatedFlow, colorMode, layoutMode, searchQuery, filterMode]);

  const renderVisualization = () => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const containerRect = containerRef.current?.getBoundingClientRect();
    const actualWidth = containerRect?.width || width;
    const actualHeight = containerRect?.height || height;

    // Set up SVG
    svg
      .attr('width', actualWidth)
      .attr('height', actualHeight)
      .style('background', 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f1f5f9 100%)');

    // Process data based on current view level
    const { nodes, edges } = processDataForCurrentLevel();

    if (nodes.length === 0) {
      renderEmptyState(svg, actualWidth, actualHeight);
      return;
    }

    // Create definitions for gradients, patterns, and effects
    const defs = svg.append('defs');
    createVisualDefinitions(defs);

    // Set up zoom behavior
    const zoomBehavior = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        setZoomLevel(event.transform.k);
        container.attr('transform', event.transform);
        updateLabelsVisibility(event.transform.k);
      });

    svg.call(zoomBehavior);

    // Main container
    const container = svg.append('g');

    // Render based on current mode
    if (isolatedFlow) {
      renderIsolatedFlow(container, nodes, edges, actualWidth, actualHeight);
    } else {
      renderStandardView(container, nodes, edges, actualWidth, actualHeight);
    }

    // Add flow animations if active
    if (flowAnimation && activeFlows.size > 0) {
      animateActiveFlows(container, nodes, edges);
    }
  };

  const processDataForCurrentLevel = () => {
    let nodes = [];
    let edges = [];

    switch (viewLevel) {
      case 'project':
        ({ nodes, edges } = processProjectLevel());
        break;
      case 'module':
        ({ nodes, edges } = processModuleLevel());
        break;
      case 'file':
        ({ nodes, edges } = processFileLevel());
        break;
      case 'symbol':
        ({ nodes, edges } = processSymbolLevel());
        break;
    }

    // Apply filters
    if (searchQuery) {
      nodes = nodes.filter(node => 
        node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.filePath?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterMode !== 'all') {
      nodes = nodes.filter(node => node.type === filterMode);
    }

    // Apply flow filtering
    if (activeFlows.size > 0 && !isolatedFlow) {
      const flowFiles = new Set();
      activeFlows.forEach(flowId => {
        const flow = userFlows.find(f => f.id === flowId);
        if (flow) {
          flow.files.forEach(file => flowFiles.add(file));
        }
      });
      
      nodes = nodes.filter(node => flowFiles.has(node.filePath));
      edges = edges.filter(edge => 
        flowFiles.has(edge.source) && flowFiles.has(edge.target)
      );
    }

    return { nodes, edges };
  };

  const processProjectLevel = () => {
    // Group files by architectural layers or modules
    const layers = groupFilesByLayers(scanResults.files);
    const nodes = Object.entries(layers).map(([layerName, layerFiles]) => ({
      id: `layer-${layerName}`,
      name: layerName,
      type: 'layer',
      layer: layerName,
      files: layerFiles,
      size: calculateLayerSize(layerFiles),
      color: layerColors[layerName]?.base || '#6b7280',
      complexity: calculateLayerComplexity(layerFiles),
      dependencies: calculateLayerDependencies(layerFiles)
    }));

    const edges = calculateLayerRelationships(layers);
    return { nodes, edges };
  };

  const processFileLevel = () => {
    let files = scanResults.files;
    
    // If we're focused on a specific module/layer, filter files
    if (drillPath.length > 0) {
      const focusContext = drillPath[drillPath.length - 1];
      files = files.filter(file => 
        file.filePath.includes(focusContext.path) ||
        file.layer === focusContext.layer
      );
    }

    const nodes = files.map(file => ({
      id: file.filePath,
      name: file.filePath.split('/').pop(),
      filePath: file.filePath,
      type: determineFileType(file),
      layer: determineFileLayer(file.filePath),
      size: calculateFileSize(file),
      color: getFileColor(file, colorMode),
      complexity: file.complexity || 0,
      dependencies: {
        incoming: 0, // Will be calculated
        outgoing: 0  // Will be calculated
      },
      metadata: {
        lines: file.lines || 0,
        functions: file.functions?.length || 0,
        classes: file.classes?.length || 0,
        isEntryPoint: isEntryPoint(file.filePath),
        lastModified: file.lastModified
      }
    }));

    const edges = calculateFileDependencies(files, scanResults);
    return { nodes, edges };
  };

  const renderStandardView = (container, nodes, edges, width, height) => {
    // Create layout based on mode
    const simulation = createIntelligentLayout(nodes, edges, width, height);

    // Render edges first (so they appear behind nodes)
    const linkGroup = container.append('g').attr('class', 'edges');
    const links = linkGroup
      .selectAll('line')
      .data(edges)
      .enter().append('line')
      .attr('class', 'dependency-edge')
      .attr('stroke', d => d.color || '#6b7280')
      .attr('stroke-width', d => d.width || 2)
      .attr('stroke-dasharray', d => d.style === 'dashed' ? '5,5' : d.style === 'dotted' ? '2,2' : null)
      .attr('opacity', d => d.opacity || 0.7)
      .attr('marker-end', 'url(#arrowhead)')
      .on('mouseover', handleEdgeHover)
      .on('mouseout', handleEdgeOut)
      .on('click', handleEdgeClick);

    // Render nodes
    const nodeGroup = container.append('g').attr('class', 'nodes');
    const nodeElements = nodeGroup
      .selectAll('g')
      .data(nodes)
      .enter().append('g')
      .attr('class', 'dependency-node')
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    // Node backgrounds with gradients
    nodeElements.append('circle')
      .attr('class', 'node-background')
      .attr('r', d => d.size || 20)
      .attr('fill', d => `url(#gradient-${d.type})`)
      .attr('stroke', d => d.color)
      .attr('stroke-width', d => selectedNodes.has(d.id) ? 4 : 2)
      .style('filter', 'url(#node-glow)')
      .on('click', handleNodeClick)
      .on('mouseover', handleNodeHover)
      .on('mouseout', handleNodeOut);

    // Node icons
    nodeElements.append('text')
      .attr('class', 'node-icon')
      .text(d => getNodeIcon(d))
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .attr('font-size', d => Math.max(12, (d.size || 20) / 2))
      .style('pointer-events', 'none')
      .style('fill', 'white')
      .style('text-shadow', '1px 1px 2px rgba(0,0,0,0.8)');

    // Node labels
    if (showLabels) {
      nodeElements.append('text')
        .attr('class', 'node-label')
        .text(d => truncateLabel(d.name, viewLevel))
        .attr('text-anchor', 'middle')
        .attr('dy', d => (d.size || 20) + 15)
        .attr('font-size', '11px')
        .attr('font-weight', '600')
        .attr('fill', '#1f2937')
        .style('text-shadow', '1px 1px 2px rgba(255,255,255,0.8)')
        .style('pointer-events', 'none');
    }

    // Complexity indicators
    if (showMetrics) {
      nodeElements.append('circle')
        .attr('class', 'complexity-indicator')
        .attr('r', 4)
        .attr('cx', d => (d.size || 20) - 6)
        .attr('cy', d => -(d.size || 20) + 6)
        .attr('fill', d => getComplexityColor(d.complexity))
        .attr('stroke', 'white')
        .attr('stroke-width', 1);
    }

    // Update simulation
    simulation.on('tick', () => {
      links
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      nodeElements
        .attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Event handlers
    function handleNodeClick(event, d) {
      event.stopPropagation();
      
      if (event.detail === 2) { // Double click for drill-down
        drillDown(d);
      } else {
        selectNode(d);
      }
    }

    function handleNodeHover(event, d) {
      setHoveredNode(d);
      showTooltip(event, d);
      highlightConnectedElements(d);
    }

    function handleNodeOut(event, d) {
      setHoveredNode(null);
      hideTooltip();
      clearHighlights();
    }

    function handleEdgeClick(event, d) {
      event.stopPropagation();
      showEdgeAnalysis(d);
    }

    function handleEdgeHover(event, d) {
      showEdgeTooltip(event, d);
      highlightEdge(d);
    }

    function handleEdgeOut(event, d) {
      hideTooltip();
      clearEdgeHighlight(d);
    }

    // Drag functions
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
  };

  const drillDown = (node) => {
    // Save current state for breadcrumb navigation
    const currentState = {
      level: viewLevel,
      selectedNode,
      focusedFile,
      zoomLevel,
      timestamp: Date.now()
    };
    
    setDrillPath(prev => [...prev, currentState]);

    // Determine next level and focus
    switch (viewLevel) {
      case 'project':
        if (node.type === 'layer') {
          setViewLevel('module');
          setFocusedFile(null);
        }
        break;
        
      case 'module':
        setViewLevel('file');
        setFocusedFile(node.filePath);
        break;
        
      case 'file':
        setViewLevel('symbol');
        setSelectedNode(node);
        loadSymbolData(node);
        break;
    }

    // Animate transition
    animateTransition('drill-down', node);
  };

  const drillUp = () => {
    if (drillPath.length === 0) return;

    const previousState = drillPath[drillPath.length - 1];
    setDrillPath(prev => prev.slice(0, -1));
    
    // Restore previous state
    setViewLevel(previousState.level);
    setSelectedNode(previousState.selectedNode);
    setFocusedFile(previousState.focusedFile);
    
    // Animate transition
    animateTransition('drill-up');
  };

  const toggleFlow = (flowId, isActive) => {
    setActiveFlows(prev => {
      const newSet = new Set(prev);
      if (isActive) {
        newSet.add(flowId);
      } else {
        newSet.delete(flowId);
      }
      return newSet;
    });

    // Clear isolation if toggling flows
    if (isolatedFlow) {
      setIsolatedFlow(null);
    }
  };

  const isolateFlow = (flowId) => {
    const flow = userFlows.find(f => f.id === flowId);
    if (flow) {
      setIsolatedFlow(flow);
      setActiveFlows(new Set([flowId]));
      setViewLevel('file'); // Switch to file level for better flow visibility
    }
  };

  const createIntelligentLayout = (nodes, edges, width, height) => {
    switch (layoutMode) {
      case 'smart':
        return createSmartLayout(nodes, edges, width, height);
      case 'force':
        return createForceLayout(nodes, edges, width, height);
      case 'hierarchical':
        return createHierarchicalLayout(nodes, edges, width, height);
      case 'circular':
        return createCircularLayout(nodes, edges, width, height);
      default:
        return createForceLayout(nodes, edges, width, height);
    }
  };

  const createSmartLayout = (nodes, edges, width, height) => {
    // Intelligent layout selection based on data characteristics
    const nodeCount = nodes.length;
    const edgeCount = edges.length;
    const density = edgeCount / (nodeCount * (nodeCount - 1) / 2);

    if (viewLevel === 'project') {
      return createLayeredLayout(nodes, edges, width, height);
    } else if (nodeCount < 20) {
      return createCircularLayout(nodes, edges, width, height);
    } else if (density > 0.3) {
      return createHierarchicalLayout(nodes, edges, width, height);
    } else {
      return createForceLayout(nodes, edges, width, height);
    }
  };

  const createLayeredLayout = (nodes, edges, width, height) => {
    // Arrange nodes by architectural layers
    const layers = ['presentation', 'business', 'data', 'infrastructure'];
    const layerHeight = height / layers.length;
    
    layers.forEach((layer, layerIndex) => {
      const layerNodes = nodes.filter(node => node.layer === layer);
      const nodeWidth = width / (layerNodes.length + 1);
      
      layerNodes.forEach((node, nodeIndex) => {
        node.fx = nodeWidth * (nodeIndex + 1);
        node.fy = layerHeight * (layerIndex + 0.5);
      });
    });

    return d3.forceSimulation(nodes)
      .force('link', d3.forceLink(edges).id(d => d.id).distance(80))
      .force('collision', d3.forceCollide().radius(d => (d.size || 20) + 5));
  };

  const animateActiveFlows = (container, nodes, edges) => {
    activeFlows.forEach(flowId => {
      const flow = userFlows.find(f => f.id === flowId);
      if (flow) {
        animateFlowPath(container, flow, nodes, edges);
      }
    });
  };

  const animateFlowPath = (container, flow, nodes, edges) => {
    // Create animated particles flowing through the user flow
    const flowEdges = edges.filter(edge => 
      flow.files.includes(edge.source) && flow.files.includes(edge.target)
    );

    flowEdges.forEach((edge, index) => {
      setTimeout(() => {
        createFlowParticle(container, edge, flow.color);
      }, index * 300); // Staggered animation
    });
  };

  const createFlowParticle = (container, edge, color) => {
    const particle = container.append('circle')
      .attr('r', 4)
      .attr('fill', color)
      .style('filter', `drop-shadow(0 0 6px ${color})`)
      .attr('cx', edge.source.x)
      .attr('cy', edge.source.y);

    particle
      .transition()
      .duration(1500)
      .ease(d3.easeLinear)
      .attr('cx', edge.target.x)
      .attr('cy', edge.target.y)
      .on('end', () => particle.remove());
  };

  const showTooltip = (event, node) => {
    const tooltip = d3.select(tooltipRef.current);
    
    tooltip
      .style('opacity', 1)
      .style('left', (event.pageX + 10) + 'px')
      .style('top', (event.pageY - 10) + 'px')
      .html(createNodeTooltip(node));
  };

  const createNodeTooltip = (node) => {
    return `
      <div class="tooltip-content">
        <div class="tooltip-header">
          <span class="tooltip-icon">${getNodeIcon(node)}</span>
          <h4 class="tooltip-title">${node.name}</h4>
          <span class="tooltip-type">${node.type}</span>
        </div>
        
        <div class="tooltip-metrics">
          <div class="metric">
            <span class="metric-label">Complexity:</span>
            <span class="metric-value complexity-${getComplexityLevel(node.complexity)}">
              ${node.complexity || 0}
            </span>
          </div>
          
          ${node.dependencies ? `
            <div class="metric">
              <span class="metric-label">Dependencies:</span>
              <span class="metric-value">${node.dependencies.outgoing || 0}</span>
            </div>
            
            <div class="metric">
              <span class="metric-label">Used by:</span>
              <span class="metric-value">${node.dependencies.incoming || 0}</span>
            </div>
          ` : ''}
          
          ${node.metadata?.lines ? `
            <div class="metric">
              <span class="metric-label">Lines:</span>
              <span class="metric-value">${node.metadata.lines}</span>
            </div>
          ` : ''}
        </div>
        
        <div class="tooltip-actions">
          <button onclick="drillInto('${node.id}')" class="tooltip-action">
            Explore →
          </button>
          ${node.filePath ? `
            <button onclick="viewCode('${node.filePath}')" class="tooltip-action">
              View Code
            </button>
          ` : ''}
        </div>
      </div>
    `;
  };

  // Helper functions
  const getNodeIcon = (node) => {
    const iconMap = {
      component: '⚛️',
      service: '⚙️',
      model: '📊',
      utility: '🔧',
      config: '⚙️',
      test: '🧪',
      page: '📄',
      hook: '🎣',
      layer: '📚'
    };
    
    return iconMap[node.type] || '📄';
  };

  const getFileColor = (file, mode) => {
    switch (mode) {
      case 'semantic':
        return semanticColors[file.type]?.base || '#6b7280';
      case 'complexity':
        return getComplexityColor(file.complexity);
      case 'layer':
        return layerColors[file.layer]?.base || '#6b7280';
      default:
        return '#6b7280';
    }
  };

  const getComplexityColor = (complexity) => {
    if (complexity <= 5) return complexityColors.simple.base;
    if (complexity <= 15) return complexityColors.moderate.base;
    if (complexity <= 30) return complexityColors.complex.base;
    return complexityColors.critical.base;
  };

  const getComplexityLevel = (complexity) => {
    if (complexity <= 5) return 'simple';
    if (complexity <= 15) return 'moderate';
    if (complexity <= 30) return 'complex';
    return 'critical';
  };

  const truncateLabel = (label, level) => {
    const maxLength = level === 'project' ? 15 : level === 'module' ? 20 : 25;
    return label.length > maxLength ? label.substring(0, maxLength - 3) + '...' : label;
  };

  return (
    <div className="advanced-dependency-visualization h-full bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
      {/* Control Panel */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center space-x-6">
          {/* View Level Controls */}
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-gray-500" />
            <div className="flex border border-gray-300 rounded-md">
              {['project', 'module', 'file', 'symbol'].map(level => (
                <button
                  key={level}
                  onClick={() => setViewLevel(level)}
                  className={`px-3 py-1 text-sm transition-colors ${
                    viewLevel === level
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Color Mode */}
          <div className="flex items-center space-x-2">
            <Target className="w-4 h-4 text-gray-500" />
            <select
              value={colorMode}
              onChange={(e) => setColorMode(e.target.value)}
              className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="semantic">By Type</option>
              <option value="complexity">By Complexity</option>
              <option value="layer">By Layer</option>
              <option value="health">By Health</option>
            </select>
          </div>

          {/* Layout Mode */}
          <div className="flex items-center space-x-2">
            <GitBranch className="w-4 h-4 text-gray-500" />
            <select
              value={layoutMode}
              onChange={(e) => setLayoutMode(e.target.value)}
              className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="smart">Smart Layout</option>
              <option value="force">Force Directed</option>
              <option value="hierarchical">Hierarchical</option>
              <option value="circular">Circular</option>
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* View Options */}
          <button
            onClick={() => setShowLabels(!showLabels)}
            className={`p-2 rounded-md transition-colors ${
              showLabels ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
            title="Toggle Labels"
          >
            <Eye className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowMetrics(!showMetrics)}
            className={`p-2 rounded-md transition-colors ${
              showMetrics ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
            title="Toggle Metrics"
          >
            <TrendingUp className="w-4 h-4" />
          </button>

          {/* Flow Animation */}
          <button
            onClick={() => setFlowAnimation(!flowAnimation)}
            className={`p-2 rounded-md transition-colors ${
              flowAnimation ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
            title="Toggle Flow Animation"
          >
            {flowAnimation ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          {/* Reset View */}
          <button
            onClick={() => {
              setViewLevel('project');
              setDrillPath([]);
              setSelectedNode(null);
              setFocusedFile(null);
              setIsolatedFlow(null);
            }}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            title="Reset to Project View"
          >
            <Home className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      {drillPath.length > 0 && (
        <div className="flex items-center space-x-2 p-3 bg-gray-50 border-b border-gray-200 text-sm">
          <button
            onClick={() => {
              setViewLevel('project');
              setDrillPath([]);
              setSelectedNode(null);
              setFocusedFile(null);
            }}
            className="text-blue-600 hover:text-blue-800 flex items-center space-x-1"
          >
            <Home className="w-3 h-3" />
            <span>Project</span>
          </button>
          
          {drillPath.map((item, index) => (
            <React.Fragment key={index}>
              <ChevronRight className="w-3 h-3 text-gray-400" />
              <button
                onClick={() => {
                  setDrillPath(prev => prev.slice(0, index + 1));
                  setViewLevel(item.level);
                  setSelectedNode(item.selectedNode);
                  setFocusedFile(item.focusedFile);
                }}
                className="text-blue-600 hover:text-blue-800"
              >
                {item.level.charAt(0).toUpperCase() + item.level.slice(1)}
              </button>
            </React.Fragment>
          ))}
          
          <ChevronRight className="w-3 h-3 text-gray-400" />
          <span className="text-gray-700 font-medium">
            {viewLevel.charAt(0).toUpperCase() + viewLevel.slice(1)}
          </span>
        </div>
      )}

      {/* Main Visualization Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* User Flow Panel */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <UserFlowPanel
            flows={userFlows}
            activeFlows={activeFlows}
            isolatedFlow={isolatedFlow}
            onToggleFlow={toggleFlow}
            onIsolateFlow={isolateFlow}
            onAnalyzeFlow={(flow) => console.log('Analyze flow:', flow)}
          />
        </div>

        {/* Visualization Canvas */}
        <div ref={containerRef} className="flex-1 relative">
          <svg ref={svgRef} className="w-full h-full" />
          
          {/* Floating Legend */}
          <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg p-4 shadow-lg max-w-xs">
            <h4 className="font-semibold text-gray-900 mb-3">
              {colorMode === 'semantic' ? 'File Types' : 
               colorMode === 'complexity' ? 'Complexity' :
               colorMode === 'layer' ? 'Architecture Layers' : 'Health Status'}
            </h4>
            <LegendContent colorMode={colorMode} />
          </div>

          {/* Tooltip */}
          <div
            ref={tooltipRef}
            className="absolute pointer-events-none opacity-0 transition-opacity z-[99995]"
            style={{ left: 0, top: 0 }}
          />
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-white border-t border-gray-200 px-4 py-2 text-xs text-gray-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span>
              Level: {viewLevel} • {scanResults?.files?.length || 0} files
            </span>
            {activeFlows.size > 0 && (
              <span>
                {activeFlows.size} flow{activeFlows.size > 1 ? 's' : ''} active
              </span>
            )}
            {isolatedFlow && (
              <span className="text-blue-600">
                Isolated: {isolatedFlow.name}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <span>Zoom: {Math.round(zoomLevel * 100)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// User Flow Panel Component
const UserFlowPanel = ({ flows, activeFlows, isolatedFlow, onToggleFlow, onIsolateFlow, onAnalyzeFlow }) => {
  const [expandedFlow, setExpandedFlow] = useState(null);

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-2">👥 User Flows</h3>
        <div className="text-sm text-gray-600">
          Toggle flows to highlight related files
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {flows.map(flow => (
          <div key={flow.id} className="flow-item border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activeFlows.has(flow.id)}
                  onChange={(e) => onToggleFlow(flow.id, e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: flow.color }}
                />
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{flow.icon}</span>
                  <span className="font-medium text-gray-900">{flow.name}</span>
                </div>
              </label>
              
              {activeFlows.has(flow.id) && (
                <button
                  onClick={() => onIsolateFlow(flow.id)}
                  className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                  title="Isolate this flow"
                >
                  🎯 Isolate
                </button>
              )}
            </div>

            <div className="text-sm text-gray-600 mb-2">
              {flow.description}
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{flow.files?.length || 0} files</span>
              <span>{flow.steps?.length || 0} steps</span>
              {flow.isCritical && (
                <span className="bg-red-100 text-red-700 px-2 py-1 rounded">Critical</span>
              )}
            </div>

            {activeFlows.has(flow.id) && expandedFlow === flow.id && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="space-y-2">
                  <h5 className="font-medium text-gray-800">Flow Steps:</h5>
                  {flow.steps?.slice(0, 5).map((step, index) => (
                    <div key={index} className="flex items-center space-x-2 text-xs">
                      <span className="w-4 h-4 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-medium">
                        {index + 1}
                      </span>
                      <span className="text-gray-600">{step.action}</span>
                    </div>
                  ))}
                  {flow.steps?.length > 5 && (
                    <div className="text-xs text-gray-500">
                      +{flow.steps.length - 5} more steps
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Flow Actions */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            {activeFlows.size} of {flows.length} flows active
          </span>
          <div className="flex space-x-2">
            <button
              onClick={() => flows.forEach(f => onToggleFlow(f.id, false))}
              className="text-gray-500 hover:text-gray-700"
            >
              Clear All
            </button>
            <button
              onClick={() => flows.filter(f => f.isCritical).forEach(f => onToggleFlow(f.id, true))}
              className="text-blue-600 hover:text-blue-800"
            >
              Critical Only
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Legend Component
const LegendContent = ({ colorMode }) => {
  const legends = {
    semantic: Object.entries(semanticColors).map(([type, config]) => ({
      color: config.base,
      label: config.description,
      icon: getNodeIcon({ type })
    })),
    
    complexity: Object.entries(complexityColors).map(([level, config]) => ({
      color: config.base,
      label: level.charAt(0).toUpperCase() + level.slice(1),
      range: `${config.range[0]}-${config.range[1] === Infinity ? '∞' : config.range[1]}`
    })),
    
    layer: Object.entries(layerColors).map(([layer, config]) => ({
      color: config.base,
      label: config.description
    }))
  };

  const currentLegend = legends[colorMode] || legends.semantic;

  return (
    <div className="space-y-2">
      {currentLegend.map((item, index) => (
        <div key={index} className="flex items-center space-x-2">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-xs text-gray-600">
            {item.icon && <span className="mr-1">{item.icon}</span>}
            {item.label}
            {item.range && <span className="text-gray-400"> ({item.range})</span>}
          </span>
        </div>
      ))}
    </div>
  );
};

export default AdvancedDependencyVisualization;
