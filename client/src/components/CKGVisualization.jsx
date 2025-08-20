/**
 * CKG Visualization Component
 * Beautiful D3.js visualization for Code Knowledge Graph data
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { VisualizationConfig, VisualizationHelpers } from '../../../core/visualization-config.js';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Search,
  Filter,
  Download,
  Layers,
  GitBranch,
  AlertCircle,
  FileText,
  Network,
  Brain,
  Eye,
  Target
} from 'lucide-react';

const CKGVisualization = ({ 
  ckgData, 
  width = 800, 
  height = 600, 
  config = VisualizationConfig,
  onNodeClick,
  onNodeHover,
  selectedSymbol = null
}) => {
  const svgRef = useRef();
  const containerRef = useRef();
  const [selectedNodes, setSelectedNodes] = useState(new Set());
  const [hoveredNode, setHoveredNode] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [layoutType, setLayoutType] = useState('force');
  const [showLabels, setShowLabels] = useState(true);
  const [highlightPath, setHighlightPath] = useState(null);

  // Enhanced node types for CKG
  const ckgNodeTypes = {
    File: { color: '#3b82f6', icon: '📄', size: 25 },
    Function: { color: '#10b981', icon: '⚡', size: 20 },
    Class: { color: '#f59e0b', icon: '🏗️', size: 22 },
    Variable: { color: '#8b5cf6', icon: '📦', size: 15 },
    Interface: { color: '#06b6d4', icon: '🔗', size: 18 },
    Type: { color: '#ec4899', icon: '🏷️', size: 16 },
    Module: { color: '#84cc16', icon: '📚', size: 24 },
    Endpoint: { color: '#f97316', icon: '🌐', size: 20 }
  };

  // Enhanced relationship types
  const relationshipTypes = {
    defines: { color: '#10b981', width: 2, style: 'solid' },
    references: { color: '#3b82f6', width: 1.5, style: 'dashed' },
    imports: { color: '#8b5cf6', width: 2.5, style: 'solid' },
    exports: { color: '#f59e0b', width: 2, style: 'dotted' },
    calls: { color: '#ef4444', width: 3, style: 'solid' },
    extends: { color: '#06b6d4', width: 2, style: 'solid' },
    implements: { color: '#ec4899', width: 1.5, style: 'dashed' },
    contains: { color: '#84cc16', width: 1, style: 'solid' }
  };

  // Initialize D3 visualization
  useEffect(() => {
    if (!ckgData || !ckgData.nodes || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { nodes, edges } = processGraphData(ckgData);
    
    if (nodes.length === 0) return;

    // Apply filters
    const filteredNodes = applyFilters(nodes, { searchTerm, filterType });
    const filteredEdges = edges.filter(edge => 
      filteredNodes.some(node => node.id === edge.source) &&
      filteredNodes.some(node => node.id === edge.target)
    );

    renderVisualization(svg, filteredNodes, filteredEdges);
  }, [ckgData, searchTerm, filterType, layoutType, showLabels, selectedSymbol]);

  const processGraphData = (data) => {
    const nodes = [];
    const edges = [];

    // Process nodes
    if (data.nodes) {
      data.nodes.forEach(node => {
        const nodeType = ckgNodeTypes[node.type] || ckgNodeTypes.File;
        nodes.push({
          id: node.id || `${node.type}-${node.name}`,
          name: node.name,
          type: node.type,
          path: node.path,
          language: node.language,
          metadata: node.metadata || {},
          ...nodeType,
          size: calculateNodeSize(node),
          complexity: node.metadata?.complexity || 0,
          isSelected: selectedSymbol === node.name,
          group: getNodeGroup(node)
        });
      });
    }

    // Process edges
    if (data.edges) {
      data.edges.forEach(edge => {
        const relType = relationshipTypes[edge.relationship] || relationshipTypes.references;
        edges.push({
          source: edge.from_node_id,
          target: edge.to_node_id,
          relationship: edge.relationship,
          weight: edge.weight || 1,
          confidence: edge.confidence || 1,
          ...relType,
          id: `${edge.from_node_id}-${edge.to_node_id}-${edge.relationship}`
        });
      });
    }

    return { nodes, edges };
  };

  const calculateNodeSize = (node) => {
    const baseSize = ckgNodeTypes[node.type]?.size || 20;
    const complexity = node.metadata?.complexity || 0;
    const references = node.metadata?.referenceCount || 0;
    
    // Scale based on importance
    const importanceMultiplier = 1 + Math.min(complexity / 50, 0.5) + Math.min(references / 20, 0.3);
    return Math.max(12, Math.min(40, baseSize * importanceMultiplier));
  };

  const getNodeGroup = (node) => {
    if (node.type === 'File') return 'files';
    if (['Function', 'Class', 'Interface'].includes(node.type)) return 'symbols';
    if (['Variable', 'Type'].includes(node.type)) return 'data';
    return 'other';
  };

  const applyFilters = (nodes, filters) => {
    let filtered = nodes;

    // Search filter
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(node => 
        node.name.toLowerCase().includes(term) ||
        node.path?.toLowerCase().includes(term) ||
        node.type.toLowerCase().includes(term)
      );
    }

    // Type filter
    if (filters.filterType !== 'all') {
      filtered = filtered.filter(node => node.type === filters.filterType);
    }

    return filtered;
  };

  const renderVisualization = (svg, nodes, edges) => {
    const containerRect = containerRef.current.getBoundingClientRect();
    const actualWidth = containerRect.width || width;
    const actualHeight = containerRect.height || height;

    svg
      .attr('width', actualWidth)
      .attr('height', actualHeight)
      .style('background', 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)');

    // Create definitions for gradients, patterns, and filters
    const defs = svg.append('defs');
    createDefinitions(defs);

    // Create zoom behavior
    const zoomBehavior = d3.zoom()
      .scaleExtent([config.interactions.zoom.min, config.interactions.zoom.max])
      .on('zoom', (event) => {
        setZoom(event.transform.k);
        container.attr('transform', event.transform);
      });

    svg.call(zoomBehavior);

    // Main container
    const container = svg.append('g');

    // Create layout based on type
    let simulation;
    if (layoutType === 'force') {
      simulation = createForceLayout(nodes, edges, actualWidth, actualHeight);
    } else if (layoutType === 'hierarchical') {
      simulation = createHierarchicalLayout(nodes, edges, actualWidth, actualHeight);
    } else {
      simulation = createCircularLayout(nodes, edges, actualWidth, actualHeight);
    }

    // Render edges
    const linkGroup = container.append('g').attr('class', 'links');
    const link = linkGroup
      .selectAll('line')
      .data(edges)
      .enter().append('line')
      .attr('class', 'link')
      .attr('stroke', d => d.color)
      .attr('stroke-width', d => d.width)
      .attr('stroke-dasharray', d => d.style === 'dashed' ? '5,5' : d.style === 'dotted' ? '2,2' : null)
      .attr('stroke-opacity', 0.6)
      .attr('marker-end', 'url(#arrowhead)')
      .on('mouseover', handleEdgeHover)
      .on('mouseout', handleEdgeOut);

    // Render nodes
    const nodeGroup = container.append('g').attr('class', 'nodes');
    const node = nodeGroup
      .selectAll('g')
      .data(nodes)
      .enter().append('g')
      .attr('class', 'node')
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    // Node circles with gradients
    node.append('circle')
      .attr('r', d => d.size)
      .attr('fill', d => `url(#gradient-${d.type})`)
      .attr('stroke', d => d.isSelected ? '#fbbf24' : d.color)
      .attr('stroke-width', d => d.isSelected ? 4 : 2)
      .style('filter', 'url(#glow)')
      .on('click', handleNodeClick)
      .on('mouseover', handleNodeHover)
      .on('mouseout', handleNodeOut);

    // Node icons (using text for now, could be SVG symbols)
    node.append('text')
      .text(d => d.icon)
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .attr('font-size', d => Math.max(10, d.size / 2))
      .style('pointer-events', 'none')
      .style('user-select', 'none');

    // Node labels
    if (showLabels) {
      node.append('text')
        .text(d => d.name.length > 15 ? d.name.substring(0, 12) + '...' : d.name)
        .attr('text-anchor', 'middle')
        .attr('dy', d => d.size + 15)
        .attr('fill', 'white')
        .attr('font-size', '11px')
        .attr('font-weight', '500')
        .style('text-shadow', '1px 1px 2px rgba(0,0,0,0.8)')
        .style('pointer-events', 'none');
    }

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      node
        .attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Highlight selected symbol path
    if (selectedSymbol) {
      highlightSymbolPath(container, nodes, edges, selectedSymbol);
    }

    // Event handlers
    function handleNodeClick(event, d) {
      setSelectedNodes(prev => {
        const newSet = new Set(prev);
        if (newSet.has(d.id)) {
          newSet.delete(d.id);
        } else {
          newSet.add(d.id);
        }
        return newSet;
      });
      
      if (onNodeClick) {
        onNodeClick(d);
      }
    }

    function handleNodeHover(event, d) {
      setHoveredNode(d);
      
      // Highlight connected nodes and edges
      const connectedNodeIds = new Set();
      edges.forEach(edge => {
        if (edge.source.id === d.id) connectedNodeIds.add(edge.target.id);
        if (edge.target.id === d.id) connectedNodeIds.add(edge.source.id);
      });

      // Fade non-connected elements
      node.style('opacity', n => n.id === d.id || connectedNodeIds.has(n.id) ? 1 : 0.3);
      link.style('opacity', l => l.source.id === d.id || l.target.id === d.id ? 1 : 0.1);

      if (onNodeHover) {
        onNodeHover(d);
      }
    }

    function handleNodeOut(event, d) {
      setHoveredNode(null);
      
      // Reset opacity
      node.style('opacity', 1);
      link.style('opacity', 0.6);
    }

    function handleEdgeHover(event, d) {
      d3.select(event.target)
        .attr('stroke-width', d.width * 2)
        .attr('stroke-opacity', 1);
    }

    function handleEdgeOut(event, d) {
      d3.select(event.target)
        .attr('stroke-width', d.width)
        .attr('stroke-opacity', 0.6);
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

  const createDefinitions = (defs) => {
    // Gradients for each node type
    Object.entries(ckgNodeTypes).forEach(([type, config]) => {
      const gradient = defs.append('linearGradient')
        .attr('id', `gradient-${type}`)
        .attr('x1', '0%').attr('y1', '0%')
        .attr('x2', '100%').attr('y2', '100%');

      gradient.append('stop')
        .attr('offset', '0%')
        .attr('style', `stop-color:${config.color};stop-opacity:0.9`);

      gradient.append('stop')
        .attr('offset', '100%')
        .attr('style', `stop-color:${d3.color(config.color).darker(1)};stop-opacity:1`);
    });

    // Glow filter
    const filter = defs.append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%').attr('y', '-50%')
      .attr('width', '200%').attr('height', '200%');

    filter.append('feGaussianBlur')
      .attr('stdDeviation', '4')
      .attr('result', 'coloredBlur');

    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Arrow markers
    defs.append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 13)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .attr('xoverflow', 'visible')
      .append('svg:path')
      .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
      .attr('fill', '#999')
      .style('stroke', 'none');
  };

  const createForceLayout = (nodes, edges, width, height) => {
    return d3.forceSimulation(nodes)
      .force('link', d3.forceLink(edges).id(d => d.id).distance(d => 80 + d.weight * 20))
      .force('charge', d3.forceManyBody().strength(-500))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(d => d.size + 5))
      .force('x', d3.forceX(width / 2).strength(0.1))
      .force('y', d3.forceY(height / 2).strength(0.1));
  };

  const createHierarchicalLayout = (nodes, edges, width, height) => {
    // Group nodes by type for hierarchical layout
    const groups = d3.group(nodes, d => d.group);
    let y = 100;
    
    groups.forEach((groupNodes, group) => {
      groupNodes.forEach((node, i) => {
        node.fx = (width / (groupNodes.length + 1)) * (i + 1);
        node.fy = y;
      });
      y += 120;
    });

    return d3.forceSimulation(nodes)
      .force('link', d3.forceLink(edges).id(d => d.id).distance(60))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('collision', d3.forceCollide().radius(d => d.size + 5));
  };

  const createCircularLayout = (nodes, edges, width, height) => {
    const radius = Math.min(width, height) / 2 - 100;
    const angleStep = (2 * Math.PI) / nodes.length;

    nodes.forEach((node, i) => {
      const angle = i * angleStep;
      node.fx = width / 2 + radius * Math.cos(angle);
      node.fy = height / 2 + radius * Math.sin(angle);
    });

    return d3.forceSimulation(nodes)
      .force('link', d3.forceLink(edges).id(d => d.id).distance(50))
      .force('collision', d3.forceCollide().radius(d => d.size + 5));
  };

  const highlightSymbolPath = (container, nodes, edges, symbolName) => {
    // Find the symbol node
    const symbolNode = nodes.find(n => n.name === symbolName);
    if (!symbolNode) return;

    // Find all connected nodes
    const connectedNodes = new Set([symbolNode.id]);
    const connectedEdges = [];

    edges.forEach(edge => {
      if (edge.source.id === symbolNode.id || edge.target.id === symbolNode.id) {
        connectedEdges.push(edge);
        connectedNodes.add(edge.source.id);
        connectedNodes.add(edge.target.id);
      }
    });

    // Highlight path with special styling
    container.selectAll('.node circle')
      .style('stroke', d => connectedNodes.has(d.id) ? '#fbbf24' : d.color)
      .style('stroke-width', d => connectedNodes.has(d.id) ? 3 : 2);

    container.selectAll('.link')
      .style('stroke', d => connectedEdges.includes(d) ? '#fbbf24' : d.color)
      .style('stroke-width', d => connectedEdges.includes(d) ? d.width * 2 : d.width);
  };

  const exportVisualization = (format = 'svg') => {
    const svg = d3.select(svgRef.current);
    const svgData = new XMLSerializer().serializeToString(svg.node());
    
    if (format === 'svg') {
      const blob = new Blob([svgData], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'ckg-visualization.svg';
      link.click();
      URL.revokeObjectURL(url);
    } else if (format === 'png') {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob(blob => {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'ckg-visualization.png';
          link.click();
          URL.revokeObjectURL(url);
        });
      };
      
      img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
    }
  };

  const getUniqueTypes = () => {
    if (!ckgData?.nodes) return [];
    return [...new Set(ckgData.nodes.map(node => node.type))];
  };

  return (
    <div className="h-full bg-gray-900 text-white flex flex-col">
      {/* Controls */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700 bg-gray-800">
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search nodes..."
              className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Type Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Types</option>
              {getUniqueTypes().map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Layout */}
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-gray-400" />
            <select
              value={layoutType}
              onChange={(e) => setLayoutType(e.target.value)}
              className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="force">Force Layout</option>
              <option value="hierarchical">Hierarchical</option>
              <option value="circular">Circular</option>
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Labels Toggle */}
          <button
            onClick={() => setShowLabels(!showLabels)}
            className={`px-2 py-1 rounded text-sm transition-colors ${
              showLabels ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <Eye className="w-4 h-4" />
          </button>

          {/* Export */}
          <button
            onClick={() => exportVisualization('svg')}
            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
            title="Export SVG"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Reset Zoom */}
          <button
            onClick={() => {
              const svg = d3.select(svgRef.current);
              svg.transition().duration(750).call(
                d3.zoom().transform,
                d3.zoomIdentity
              );
            }}
            className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
            title="Reset View"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Visualization */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        <svg ref={svgRef} className="w-full h-full" />
        
        {/* Legend */}
        <div className="absolute top-4 right-4 bg-gray-800/90 backdrop-blur-sm border border-gray-600 rounded-lg p-3 text-sm">
          <h4 className="font-semibold mb-2 text-white">Node Types</h4>
          <div className="space-y-1">
            {Object.entries(ckgNodeTypes).map(([type, config]) => (
              <div key={type} className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: config.color }}
                />
                <span className="text-xs text-gray-300">{config.icon} {type}</span>
              </div>
            ))}
          </div>
          
          {zoom !== 1 && (
            <div className="mt-3 pt-2 border-t border-gray-600">
              <span className="text-xs text-gray-400">Zoom: {(zoom * 100).toFixed(0)}%</span>
            </div>
          )}
        </div>

        {/* Hovered Node Info */}
        {hoveredNode && (
          <div className="absolute bottom-4 left-4 bg-gray-800/90 backdrop-blur-sm border border-gray-600 rounded-lg p-3 text-sm max-w-xs">
            <h4 className="font-semibold text-white">{hoveredNode.name}</h4>
            <p className="text-xs text-gray-300 mt-1">Type: {hoveredNode.type}</p>
            {hoveredNode.path && (
              <p className="text-xs text-gray-400 mt-1">Path: {hoveredNode.path}</p>
            )}
            {hoveredNode.complexity > 0 && (
              <p className="text-xs text-gray-400 mt-1">Complexity: {hoveredNode.complexity}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CKGVisualization;
