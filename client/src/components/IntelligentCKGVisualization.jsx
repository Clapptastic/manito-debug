/**
 * Intelligent CKG Visualization Component
 * Designed with data visualization best practices for AI and non-developers
 * Follows information architecture principles for intuitive understanding
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Search,
  Filter,
  Download,
  Layers,
  Info,
  HelpCircle,
  Eye,
  EyeOff,
  Target,
  Zap,
  Book,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp
} from 'lucide-react';

const IntelligentCKGVisualization = ({ 
  ckgData, 
  width = 800, 
  height = 600,
  onNodeClick,
  onNodeHover,
  selectedSymbol = null,
  viewMode = 'overview' // overview, detailed, simplified
}) => {
  const svgRef = useRef();
  const containerRef = useRef();
  const tooltipRef = useRef();
  
  // State for intelligent UI
  const [viewState, setViewState] = useState({
    currentView: viewMode,
    zoomLevel: 1,
    focusNode: null,
    selectedNodes: new Set(),
    hoveredNode: null,
    searchTerm: '',
    activeFilters: new Set(),
    layoutMode: 'smart', // smart, force, hierarchy, cluster
    showLabels: true,
    showMetrics: true,
    showLegend: true,
    colorMode: 'semantic', // semantic, complexity, importance, language
    groupingMode: 'type' // type, file, module, complexity
  });

  // Information Architecture: Semantic color mapping for intuitive understanding
  const semanticColors = {
    // Primary code structures (cool colors for stability)
    File: { 
      color: '#2563eb', // Professional blue
      gradient: ['#3b82f6', '#1d4ed8'],
      icon: '📄',
      description: 'Source files containing code',
      importance: 'foundation'
    },
    Module: { 
      color: '#059669', // Trustworthy green
      gradient: ['#10b981', '#047857'],
      icon: '📦',
      description: 'Reusable code modules',
      importance: 'structure'
    },
    
    // Active code elements (warm colors for activity)
    Function: { 
      color: '#dc2626', // Action red
      gradient: ['#ef4444', '#b91c1c'],
      icon: '⚡',
      description: 'Executable functions',
      importance: 'action'
    },
    Class: { 
      color: '#ea580c', // Creative orange
      gradient: ['#f97316', '#c2410c'],
      icon: '🏗️',
      description: 'Object blueprints',
      importance: 'structure'
    },
    
    // Data elements (purple for data/logic)
    Variable: { 
      color: '#7c3aed', // Data purple
      gradient: ['#8b5cf6', '#6d28d9'],
      icon: '📊',
      description: 'Data storage',
      importance: 'data'
    },
    Type: { 
      color: '#c026d3', // Definition magenta
      gradient: ['#d946ef', '#a21caf'],
      icon: '🏷️',
      description: 'Data type definitions',
      importance: 'definition'
    },
    Interface: { 
      color: '#0891b2', // Contract cyan
      gradient: ['#06b6d4', '#0e7490'],
      icon: '🤝',
      description: 'Code contracts',
      importance: 'contract'
    },
    
    // External connections (neutral colors)
    Import: { 
      color: '#6b7280', // Neutral gray
      gradient: ['#9ca3af', '#4b5563'],
      icon: '📥',
      description: 'External dependencies',
      importance: 'dependency'
    }
  };

  // Relationship semantics for clear understanding
  const relationshipSemantics = {
    defines: { 
      color: '#059669', 
      width: 3, 
      style: 'solid',
      description: 'Creates or defines',
      strength: 'strong',
      pattern: null
    },
    uses: { 
      color: '#2563eb', 
      width: 2, 
      style: 'solid',
      description: 'Uses or calls',
      strength: 'medium',
      pattern: null
    },
    imports: { 
      color: '#7c3aed', 
      width: 2.5, 
      style: 'dashed',
      description: 'Brings in from external',
      strength: 'medium',
      pattern: '8,4'
    },
    exports: { 
      color: '#ea580c', 
      width: 2, 
      style: 'dotted',
      description: 'Makes available to others',
      strength: 'medium',
      pattern: '3,3'
    },
    extends: { 
      color: '#dc2626', 
      width: 3, 
      style: 'solid',
      description: 'Inherits from',
      strength: 'strong',
      pattern: null
    },
    implements: { 
      color: '#0891b2', 
      width: 2, 
      style: 'dashed',
      description: 'Fulfills contract',
      strength: 'medium',
      pattern: '6,2'
    }
  };

  // Complexity indicators for AI and non-developer understanding
  const complexityIndicators = {
    low: { color: '#22c55e', icon: '🟢', label: 'Simple', range: '0-5' },
    medium: { color: '#eab308', icon: '🟡', label: 'Moderate', range: '6-15' },
    high: { color: '#f97316', icon: '🟠', label: 'Complex', range: '16-30' },
    critical: { color: '#ef4444', icon: '🔴', label: 'Very Complex', range: '30+' }
  };

  // Initialize visualization with intelligent defaults
  useEffect(() => {
    if (!ckgData || !ckgData.nodes || !svgRef.current) return;
    renderIntelligentVisualization();
  }, [ckgData, viewState]);

  const renderIntelligentVisualization = () => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const containerRect = containerRef.current.getBoundingClientRect();
    const actualWidth = containerRect.width || width;
    const actualHeight = containerRect.height || height;

    // Set up SVG with professional styling
    svg
      .attr('width', actualWidth)
      .attr('height', actualHeight)
      .style('background', 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f1f5f9 100%)')
      .style('border-radius', '8px');

    // Process data with information architecture principles
    const { processedNodes, processedEdges } = processDataForVisualization();

    // Create intelligent layout based on data characteristics
    const layout = createIntelligentLayout(processedNodes, processedEdges, actualWidth, actualHeight);

    // Render with progressive disclosure
    renderProgressiveVisualization(svg, processedNodes, processedEdges, layout, actualWidth, actualHeight);
  };

  const processDataForVisualization = () => {
    const nodes = ckgData.nodes.map(node => {
      const semantic = semanticColors[node.type] || semanticColors.File;
      const complexity = calculateComplexity(node);
      const importance = calculateImportance(node);
      
      return {
        ...node,
        id: node.id || `${node.type}-${node.name}`,
        displayName: createIntelligentLabel(node.name, node.type),
        semantic,
        complexity,
        importance,
        size: calculateIntelligentSize(node, complexity, importance),
        group: determineSemanticGroup(node),
        metrics: extractNodeMetrics(node),
        description: generateNodeDescription(node)
      };
    });

    const edges = (ckgData.edges || []).map(edge => {
      const semantic = relationshipSemantics[edge.relationship] || relationshipSemantics.uses;
      
      return {
        ...edge,
        source: edge.from_node_id,
        target: edge.to_node_id,
        semantic,
        strength: calculateRelationshipStrength(edge),
        description: generateRelationshipDescription(edge)
      };
    });

    return { processedNodes: nodes, processedEdges: edges };
  };

  const createIntelligentLabel = (name, type) => {
    // Smart truncation based on type and importance
    const maxLength = type === 'File' ? 20 : 15;
    
    if (name.length <= maxLength) return name;
    
    // Intelligent truncation preserving meaningful parts
    if (name.includes('.')) {
      const parts = name.split('.');
      const ext = parts.pop();
      const base = parts.join('.');
      const availableLength = maxLength - ext.length - 1;
      
      if (base.length > availableLength) {
        return base.substring(0, availableLength - 3) + '...' + '.' + ext;
      }
      return name;
    }
    
    // CamelCase aware truncation
    if (/[A-Z]/.test(name)) {
      const words = name.split(/(?=[A-Z])/);
      if (words.length > 1) {
        return words[0] + words[words.length - 1];
      }
    }
    
    return name.substring(0, maxLength - 3) + '...';
  };

  const calculateComplexity = (node) => {
    const complexity = node.metadata?.complexity || 0;
    const referenceCount = node.metadata?.referenceCount || 0;
    const lineCount = node.metadata?.lineCount || 0;
    
    // Weighted complexity score
    const score = complexity + (referenceCount * 0.5) + (lineCount / 100);
    
    if (score <= 5) return 'low';
    if (score <= 15) return 'medium';
    if (score <= 30) return 'high';
    return 'critical';
  };

  const calculateImportance = (node) => {
    const referenceCount = node.metadata?.referenceCount || 0;
    const isPublic = node.metadata?.isPublic !== false;
    const hasTests = node.metadata?.hasTests || false;
    
    let score = referenceCount * 2;
    if (isPublic) score += 5;
    if (hasTests) score += 3;
    if (node.type === 'Function' || node.type === 'Class') score += 2;
    
    return Math.min(score, 20);
  };

  const calculateIntelligentSize = (node, complexity, importance) => {
    const baseSize = {
      File: 25,
      Module: 22,
      Class: 20,
      Function: 18,
      Interface: 16,
      Variable: 14,
      Type: 16
    }[node.type] || 18;

    const complexityMultiplier = {
      low: 0.8,
      medium: 1.0,
      high: 1.3,
      critical: 1.6
    }[complexity] || 1.0;

    const importanceMultiplier = 1 + (importance / 40);
    
    return Math.max(12, Math.min(40, baseSize * complexityMultiplier * importanceMultiplier));
  };

  const determineSemanticGroup = (node) => {
    const importance = semanticColors[node.type]?.importance || 'other';
    return importance;
  };

  const extractNodeMetrics = (node) => {
    return {
      lines: node.metadata?.lineCount || 0,
      complexity: node.metadata?.complexity || 0,
      references: node.metadata?.referenceCount || 0,
      lastModified: node.metadata?.lastModified || null,
      hasTests: node.metadata?.hasTests || false,
      isPublic: node.metadata?.isPublic !== false
    };
  };

  const generateNodeDescription = (node) => {
    const semantic = semanticColors[node.type];
    const metrics = extractNodeMetrics(node);
    
    let description = semantic?.description || `${node.type} element`;
    
    if (metrics.references > 0) {
      description += ` • Used ${metrics.references} times`;
    }
    
    if (metrics.complexity > 0) {
      description += ` • Complexity: ${metrics.complexity}`;
    }
    
    return description;
  };

  const calculateRelationshipStrength = (edge) => {
    return edge.weight || 1;
  };

  const generateRelationshipDescription = (edge) => {
    const semantic = relationshipSemantics[edge.relationship];
    return semantic?.description || `${edge.relationship} relationship`;
  };

  const createIntelligentLayout = (nodes, edges, width, height) => {
    // Smart layout selection based on data characteristics
    const nodeCount = nodes.length;
    const edgeCount = edges.length;
    const density = edgeCount / (nodeCount * (nodeCount - 1) / 2);

    if (viewState.layoutMode === 'smart') {
      if (nodeCount < 20) return createClusterLayout(nodes, edges, width, height);
      if (density > 0.3) return createHierarchicalLayout(nodes, edges, width, height);
      return createForceLayout(nodes, edges, width, height);
    }

    switch (viewState.layoutMode) {
      case 'force': return createForceLayout(nodes, edges, width, height);
      case 'hierarchy': return createHierarchicalLayout(nodes, edges, width, height);
      case 'cluster': return createClusterLayout(nodes, edges, width, height);
      default: return createForceLayout(nodes, edges, width, height);
    }
  };

  const createForceLayout = (nodes, edges, width, height) => {
    return d3.forceSimulation(nodes)
      .force('link', d3.forceLink(edges).id(d => d.id).distance(d => 60 + d.strength * 40))
      .force('charge', d3.forceManyBody().strength(d => -200 - d.importance * 10))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(d => d.size + 8))
      .force('x', d3.forceX(width / 2).strength(0.05))
      .force('y', d3.forceY(height / 2).strength(0.05));
  };

  const createHierarchicalLayout = (nodes, edges, width, height) => {
    // Group by semantic importance
    const groups = d3.group(nodes, d => d.group);
    let y = 80;
    
    // Order groups by semantic importance
    const groupOrder = ['foundation', 'structure', 'action', 'data', 'definition', 'contract', 'dependency'];
    
    groupOrder.forEach(groupName => {
      const groupNodes = groups.get(groupName) || [];
      if (groupNodes.length === 0) return;
      
      groupNodes.forEach((node, i) => {
        node.fx = (width / (groupNodes.length + 1)) * (i + 1);
        node.fy = y;
      });
      y += 100;
    });

    return d3.forceSimulation(nodes)
      .force('link', d3.forceLink(edges).id(d => d.id).distance(50))
      .force('collision', d3.forceCollide().radius(d => d.size + 5));
  };

  const createClusterLayout = (nodes, edges, width, height) => {
    // Cluster by file or module
    const clusters = d3.group(nodes, d => d.path?.split('/')[0] || 'root');
    const clusterCount = clusters.size;
    const radius = Math.min(width, height) / 4;
    
    let clusterIndex = 0;
    clusters.forEach((clusterNodes, clusterName) => {
      const angle = (clusterIndex / clusterCount) * 2 * Math.PI;
      const clusterX = width / 2 + radius * Math.cos(angle);
      const clusterY = height / 2 + radius * Math.sin(angle);
      
      clusterNodes.forEach((node, i) => {
        const nodeAngle = (i / clusterNodes.length) * 2 * Math.PI;
        const nodeRadius = 30;
        node.fx = clusterX + nodeRadius * Math.cos(nodeAngle);
        node.fy = clusterY + nodeRadius * Math.sin(nodeAngle);
      });
      
      clusterIndex++;
    });

    return d3.forceSimulation(nodes)
      .force('link', d3.forceLink(edges).id(d => d.id).distance(40))
      .force('collision', d3.forceCollide().radius(d => d.size + 3));
  };

  const renderProgressiveVisualization = (svg, nodes, edges, simulation, width, height) => {
    // Create intelligent definitions
    const defs = svg.append('defs');
    createIntelligentDefinitions(defs);

    // Create zoom with intelligent constraints
    const zoomBehavior = d3.zoom()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        setViewState(prev => ({ ...prev, zoomLevel: event.transform.k }));
        container.attr('transform', event.transform);
        updateLabelsVisibility(event.transform.k);
      });

    svg.call(zoomBehavior);

    // Main container
    const container = svg.append('g');

    // Render edges with semantic styling
    const linkGroup = container.append('g').attr('class', 'relationships');
    const links = linkGroup
      .selectAll('line')
      .data(edges)
      .enter().append('line')
      .attr('class', 'relationship')
      .attr('stroke', d => d.semantic.color)
      .attr('stroke-width', d => d.semantic.width)
      .attr('stroke-dasharray', d => d.semantic.pattern)
      .attr('stroke-opacity', 0.7)
      .attr('marker-end', 'url(#arrowhead)')
      .on('mouseover', showRelationshipTooltip)
      .on('mouseout', hideTooltip);

    // Render nodes with progressive enhancement
    const nodeGroup = container.append('g').attr('class', 'code-elements');
    const nodeElements = nodeGroup
      .selectAll('g')
      .data(nodes)
      .enter().append('g')
      .attr('class', 'code-element')
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    // Node backgrounds with semantic colors
    nodeElements.append('circle')
      .attr('class', 'node-background')
      .attr('r', d => d.size)
      .attr('fill', d => `url(#gradient-${d.type})`)
      .attr('stroke', d => d.semantic.color)
      .attr('stroke-width', d => d.id === selectedSymbol ? 4 : 2)
      .style('filter', 'url(#node-glow)')
      .on('click', handleIntelligentNodeClick)
      .on('mouseover', showIntelligentTooltip)
      .on('mouseout', hideTooltip);

    // Complexity indicators
    nodeElements.append('circle')
      .attr('class', 'complexity-indicator')
      .attr('r', 6)
      .attr('cx', d => d.size - 8)
      .attr('cy', d => -d.size + 8)
      .attr('fill', d => complexityIndicators[d.complexity].color)
      .attr('stroke', 'white')
      .attr('stroke-width', 1)
      .style('opacity', d => viewState.showMetrics ? 1 : 0);

    // Semantic icons
    nodeElements.append('text')
      .attr('class', 'semantic-icon')
      .text(d => d.semantic.icon)
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .attr('font-size', d => Math.max(12, d.size / 2))
      .style('pointer-events', 'none')
      .style('user-select', 'none');

    // Intelligent labels
    const labels = nodeElements.append('text')
      .attr('class', 'intelligent-label')
      .text(d => d.displayName)
      .attr('text-anchor', 'middle')
      .attr('dy', d => d.size + 18)
      .attr('fill', '#1f2937')
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .style('text-shadow', '1px 1px 2px rgba(255,255,255,0.8)')
      .style('pointer-events', 'none')
      .style('opacity', viewState.showLabels ? 1 : 0);

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
    function handleIntelligentNodeClick(event, d) {
      setViewState(prev => ({
        ...prev,
        focusNode: d,
        selectedNodes: new Set([d.id])
      }));
      
      if (onNodeClick) {
        onNodeClick(d);
      }
      
      // Highlight connected elements
      highlightConnectedElements(d, links, nodeElements);
    }

    function showIntelligentTooltip(event, d) {
      const tooltip = d3.select(tooltipRef.current);
      
      tooltip
        .style('opacity', 1)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px')
        .html(createIntelligentTooltip(d));

      setViewState(prev => ({ ...prev, hoveredNode: d }));
    }

    function showRelationshipTooltip(event, d) {
      const tooltip = d3.select(tooltipRef.current);
      
      tooltip
        .style('opacity', 1)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px')
        .html(createRelationshipTooltip(d));
    }

    function hideTooltip() {
      d3.select(tooltipRef.current).style('opacity', 0);
      setViewState(prev => ({ ...prev, hoveredNode: null }));
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

  const createIntelligentDefinitions = (defs) => {
    // Semantic gradients for each node type
    Object.entries(semanticColors).forEach(([type, config]) => {
      const gradient = defs.append('linearGradient')
        .attr('id', `gradient-${type}`)
        .attr('x1', '0%').attr('y1', '0%')
        .attr('x2', '100%').attr('y2', '100%');

      gradient.append('stop')
        .attr('offset', '0%')
        .attr('style', `stop-color:${config.gradient[0]};stop-opacity:0.9`);

      gradient.append('stop')
        .attr('offset', '100%')
        .attr('style', `stop-color:${config.gradient[1]};stop-opacity:1`);
    });

    // Professional glow effect
    const glowFilter = defs.append('filter')
      .attr('id', 'node-glow')
      .attr('x', '-50%').attr('y', '-50%')
      .attr('width', '200%').attr('height', '200%');

    glowFilter.append('feGaussianBlur')
      .attr('stdDeviation', '3')
      .attr('result', 'coloredBlur');

    const feMerge = glowFilter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Arrow marker
    defs.append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 13)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .append('svg:path')
      .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
      .attr('fill', '#6b7280')
      .style('stroke', 'none');
  };

  const createIntelligentTooltip = (node) => {
    const complexity = complexityIndicators[node.complexity];
    
    return `
      <div class="bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-xs">
        <div class="flex items-center space-x-2 mb-2">
          <span class="text-xl">${node.semantic.icon}</span>
          <h4 class="font-semibold text-gray-900">${node.name}</h4>
        </div>
        
        <div class="text-sm text-gray-600 mb-3">
          ${node.description}
        </div>
        
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs text-gray-500">Type:</span>
            <span class="text-xs font-medium">${node.type}</span>
          </div>
          
          <div class="flex items-center justify-between">
            <span class="text-xs text-gray-500">Complexity:</span>
            <div class="flex items-center space-x-1">
              <span class="text-xs">${complexity.icon}</span>
              <span class="text-xs font-medium">${complexity.label}</span>
            </div>
          </div>
          
          ${node.metrics.references > 0 ? `
            <div class="flex items-center justify-between">
              <span class="text-xs text-gray-500">Used:</span>
              <span class="text-xs font-medium">${node.metrics.references} times</span>
            </div>
          ` : ''}
          
          ${node.path ? `
            <div class="text-xs text-gray-400 mt-2 truncate">
              📍 ${node.path}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  };

  const createRelationshipTooltip = (edge) => {
    return `
      <div class="bg-white border border-gray-200 rounded-lg shadow-lg p-3 max-w-xs">
        <div class="text-sm font-medium text-gray-900 mb-1">
          ${edge.semantic.description}
        </div>
        <div class="text-xs text-gray-600">
          ${edge.source.name} → ${edge.target.name}
        </div>
        <div class="text-xs text-gray-400 mt-1">
          Strength: ${edge.semantic.strength}
        </div>
      </div>
    `;
  };

  const highlightConnectedElements = (node, links, nodeElements) => {
    const connectedNodeIds = new Set([node.id]);
    
    // Find connected nodes
    links.each(function(d) {
      if (d.source.id === node.id) connectedNodeIds.add(d.target.id);
      if (d.target.id === node.id) connectedNodeIds.add(d.source.id);
    });

    // Highlight connected elements
    nodeElements
      .select('.node-background')
      .style('opacity', d => connectedNodeIds.has(d.id) ? 1 : 0.3)
      .attr('stroke-width', d => d.id === node.id ? 4 : connectedNodeIds.has(d.id) ? 3 : 2);

    links
      .style('opacity', d => d.source.id === node.id || d.target.id === node.id ? 1 : 0.2)
      .attr('stroke-width', d => d.source.id === node.id || d.target.id === node.id ? d.semantic.width * 1.5 : d.semantic.width);
  };

  const updateLabelsVisibility = (zoomLevel) => {
    const showLabels = zoomLevel > 0.6;
    setViewState(prev => ({ ...prev, showLabels }));
  };

  return (
    <div className="h-full bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
      {/* Intelligent Controls */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center space-x-6">
          {/* View Mode */}
          <div className="flex items-center space-x-2">
            <Eye className="w-4 h-4 text-gray-500" />
            <select
              value={viewState.currentView}
              onChange={(e) => setViewState(prev => ({ ...prev, currentView: e.target.value }))}
              className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="overview">Overview</option>
              <option value="detailed">Detailed</option>
              <option value="simplified">Simplified</option>
            </select>
          </div>

          {/* Layout Mode */}
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-gray-500" />
            <select
              value={viewState.layoutMode}
              onChange={(e) => setViewState(prev => ({ ...prev, layoutMode: e.target.value }))}
              className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="smart">Smart Layout</option>
              <option value="force">Force Directed</option>
              <option value="hierarchy">Hierarchical</option>
              <option value="cluster">Clustered</option>
            </select>
          </div>

          {/* Color Mode */}
          <div className="flex items-center space-x-2">
            <Target className="w-4 h-4 text-gray-500" />
            <select
              value={viewState.colorMode}
              onChange={(e) => setViewState(prev => ({ ...prev, colorMode: e.target.value }))}
              className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="semantic">By Type</option>
              <option value="complexity">By Complexity</option>
              <option value="importance">By Importance</option>
              <option value="language">By Language</option>
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Toggle Controls */}
          <button
            onClick={() => setViewState(prev => ({ ...prev, showMetrics: !prev.showMetrics }))}
            className={`p-2 rounded-md transition-colors ${
              viewState.showMetrics ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
            title="Show Metrics"
          >
            <TrendingUp className="w-4 h-4" />
          </button>

          <button
            onClick={() => setViewState(prev => ({ ...prev, showLegend: !prev.showLegend }))}
            className={`p-2 rounded-md transition-colors ${
              viewState.showLegend ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
            title="Show Legend"
          >
            <Info className="w-4 h-4" />
          </button>

          {/* Help */}
          <button className="p-2 rounded-md bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Visualization Area */}
      <div ref={containerRef} className="flex-1 relative">
        <svg ref={svgRef} className="w-full h-full" />
        
        {/* Intelligent Legend */}
        {viewState.showLegend && (
          <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg p-4 shadow-lg max-w-xs">
            <h4 className="font-semibold text-gray-900 mb-3">Code Elements</h4>
            
            <div className="space-y-3">
              {/* Node Types */}
              <div>
                <h5 className="text-xs font-medium text-gray-700 mb-2">Types</h5>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(semanticColors).slice(0, 6).map(([type, config]) => (
                    <div key={type} className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: config.color }}
                      />
                      <span className="text-xs text-gray-600">{config.icon} {type}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Complexity */}
              <div>
                <h5 className="text-xs font-medium text-gray-700 mb-2">Complexity</h5>
                <div className="space-y-1">
                  {Object.entries(complexityIndicators).map(([level, config]) => (
                    <div key={level} className="flex items-center space-x-2">
                      <span className="text-sm">{config.icon}</span>
                      <span className="text-xs text-gray-600">{config.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {viewState.zoomLevel !== 1 && (
              <div className="mt-3 pt-2 border-t border-gray-200">
                <span className="text-xs text-gray-500">Zoom: {(viewState.zoomLevel * 100).toFixed(0)}%</span>
              </div>
            )}
          </div>
        )}

        {/* Intelligent Tooltip */}
        <div
          ref={tooltipRef}
          className="absolute pointer-events-none opacity-0 transition-opacity z-50"
          style={{ left: 0, top: 0 }}
        />
      </div>

      {/* Status Bar */}
      <div className="bg-white border-t border-gray-200 px-4 py-2 text-xs text-gray-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span>
              {ckgData?.nodes?.length || 0} elements • {ckgData?.edges?.length || 0} relationships
            </span>
            {viewState.focusNode && (
              <span>
                Focus: {viewState.focusNode.name} ({viewState.focusNode.type})
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-3 h-3 text-green-500" />
            <span>Interactive visualization ready</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntelligentCKGVisualization;
