import React, { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
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
  Info
} from 'lucide-react'

function GraphVisualization({ data }) {
  const svgRef = useRef()
  const containerRef = useRef()
  const [selectedNode, setSelectedNode] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [zoomLevel, setZoomLevel] = useState(1)
  const [hoveredNode, setHoveredNode] = useState(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })

  const nodeTypes = {
    entry: { color: '#3b82f6', icon: '🚀', label: 'Entry Point' },
    component: { color: '#10b981', icon: '⚛️', label: 'Component' },
    utility: { color: '#f59e0b', icon: '🔧', label: 'Utility' },
    service: { color: '#8b5cf6', icon: '⚙️', label: 'Service' },
    dependency: { color: '#ef4444', icon: '📦', label: 'Dependency' },
    external: { color: '#6b7280', icon: '🔗', label: 'External' },
    file: { color: '#6b7280', icon: '📄', label: 'File' },
    test: { color: '#28a745', icon: '🧪', label: 'Test' }
  }

  // Fix data structure processing
  const processDependencies = (dependencies) => {
    if (Array.isArray(dependencies)) {
      // Convert array format to object format
      const dependencyMap = {};
      dependencies.forEach(dep => {
        if (dep.from && dep.to) {
          dependencyMap[dep.from] = dep.to;
        }
      });
      return dependencyMap;
    }
    return dependencies || {};
  };

  // Improve node type detection
  const determineNodeType = (file) => {
    const path = file.filePath || file.path || '';
    const ext = path.split('.').pop()?.toLowerCase();
    
    if (path.includes('component') || path.includes('Component')) return 'component';
    if (path.includes('service') || path.includes('Service')) return 'service';
    if (path.includes('util') || path.includes('helper')) return 'utility';
    if (path.includes('test') || path.includes('spec')) return 'test';
    if (path.includes('index') || path.includes('main')) return 'entry';
    if (ext === 'jsx' || ext === 'tsx') return 'component';
    if (ext === 'js' || ext === 'ts') return 'utility';
    
    return 'file';
  };

  // Empty state component
  const EmptyState = ({ message, action }) => (
    <div className="flex flex-col items-center justify-center h-full text-gray-400">
      <FileText className="w-16 h-16 mb-4" />
      <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
      <p className="text-sm text-center mb-4">{message}</p>
      {action && (
        <button className="btn btn-primary">{action}</button>
      )}
    </div>
  );

  // Legend component
  const Legend = ({ nodeTypes, onFilterChange }) => (
    <div className="absolute top-4 left-4 bg-gray-800/90 p-3 rounded-lg backdrop-blur-sm border border-gray-600">
      <h4 className="text-sm font-semibold mb-2 text-white">Node Types</h4>
      {Object.entries(nodeTypes).map(([type, config]) => (
        <div key={type} className="flex items-center space-x-2 mb-1 cursor-pointer hover:bg-gray-700/50 p-1 rounded" onClick={() => onFilterChange(type)}>
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: config.color }}
          />
          <span className="text-xs text-gray-300 capitalize">{config.label}</span>
        </div>
      ))}
    </div>
  );

  // Controls component
  const Controls = ({ onSearch, onFilter, onReset, nodeCount, linkCount }) => (
    <div className="absolute top-4 right-4 bg-gray-800/90 p-3 rounded-lg backdrop-blur-sm border border-gray-600">
      <div className="text-xs text-gray-400 mb-2">
        {nodeCount} nodes • {linkCount} links
      </div>
      <input
        type="text"
        placeholder="Search files..."
        className="w-full mb-2 px-2 py-1 text-sm bg-gray-700 rounded border border-gray-600 text-white"
        onChange={(e) => onSearch(e.target.value)}
      />
      <select 
        className="w-full px-2 py-1 text-sm bg-gray-700 rounded border border-gray-600 text-white"
        onChange={(e) => onFilter(e.target.value)}
      >
        <option value="all">All Types</option>
        <option value="component">Components</option>
        <option value="service">Services</option>
        <option value="utility">Utilities</option>
        <option value="test">Tests</option>
        <option value="entry">Entry Points</option>
      </select>
      <button 
        onClick={onReset}
        className="w-full mt-2 px-2 py-1 text-xs bg-gray-600 hover:bg-gray-500 rounded text-white transition-colors"
      >
        Reset View
      </button>
    </div>
  );

  // Tooltip component
  const Tooltip = ({ node, position }) => {
    if (!node) return null;
    
    return (
      <div 
        className="absolute bg-gray-800 border border-gray-600 rounded-lg p-3 text-sm shadow-lg z-[99995] pointer-events-none"
        style={{ left: position.x + 10, top: position.y - 10 }}
      >
        <div className="font-semibold text-white">{node.label}</div>
        <div className="text-gray-400">Type: {nodeTypes[node.type]?.label || node.type}</div>
        <div className="text-gray-400">Lines: {node.lines || 0}</div>
        <div className="text-gray-400">Complexity: {node.complexity || 0}</div>
        {node.filePath && (
          <div className="text-gray-400 text-xs mt-1 max-w-xs truncate">
            {node.filePath}
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    if (!data || !data.files || !Array.isArray(data.files) || data.files.length === 0) {
      // Clear previous visualization if no data
      d3.select(svgRef.current).selectAll('*').remove()
      return
    }

    // Clear previous visualization
    d3.select(svgRef.current).selectAll('*').remove()

    const container = containerRef.current
    if (!container) return
    
    try {
      const containerRect = container.getBoundingClientRect()
      const width = containerRect.width
      const height = containerRect.height

      // Create SVG
      const svg = d3.select(svgRef.current)
        .attr('width', width)
        .attr('height', height)
        .style('background', 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)')

      // Create definitions for gradients and filters
      const defs = svg.append('defs')

      // Gradient definitions for nodes
      Object.entries(nodeTypes).forEach(([type, config]) => {
        const gradient = defs.append('linearGradient')
          .attr('id', `gradient-${type}`)
          .attr('x1', '0%').attr('y1', '0%')
          .attr('x2', '100%').attr('y2', '100%')

        gradient.append('stop')
          .attr('offset', '0%')
          .attr('style', `stop-color:${config.color};stop-opacity:0.8`)

        gradient.append('stop')
          .attr('offset', '100%')
          .attr('style', `stop-color:${d3.color(config.color).darker(0.5)};stop-opacity:1`)
      })

      // Glow filter
      const filter = defs.append('filter')
        .attr('id', 'glow')
        .attr('x', '-50%').attr('y', '-50%')
        .attr('width', '200%').attr('height', '200%')

      filter.append('feGaussianBlur')
        .attr('stdDeviation', '3')
        .attr('result', 'coloredBlur')

      const feMerge = filter.append('feMerge')
      feMerge.append('feMergeNode').attr('in', 'coloredBlur')
      feMerge.append('feMergeNode').attr('in', 'SourceGraphic')

      // Create zoom behavior
      const zoom = d3.zoom()
        .scaleExtent([0.1, 4])
        .on('zoom', (event) => {
          setZoomLevel(event.transform.k)
          g.attr('transform', event.transform)
        })

      svg.call(zoom)

      // Main group for zoom/pan
      const g = svg.append('g')

      // Process data into nodes and links with improved data handling
      const nodes = data.files.map((file, index) => ({
        id: file.filePath || file.path || `file-${index}`,
        label: (file.filePath || file.path || `File ${index}`).split('/').pop(),
        type: determineNodeType(file),
        size: Math.max(20, Math.min(60, (file.lines || 0) / 10)),
        complexity: file.complexity || 0,
        lines: file.lines || 0,
        filePath: file.filePath || file.path || ''
      }))

      // Create links from dependencies with fixed data processing
      const processedDeps = processDependencies(data.dependencies);
      const links = []
      
      if (processedDeps && typeof processedDeps === 'object') {
        Object.entries(processedDeps).forEach(([from, to]) => {
          if (from && to) {
            links.push({
              source: from,
              target: to,
              value: 1
            })
          }
        })
      }

      // Create force simulation
      const simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(100))
        .force('charge', d3.forceManyBody().strength(-300))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(d => d.size + 10))

      // Create links
      const link = g.append('g')
        .selectAll('line')
        .data(links)
        .enter().append('line')
        .attr('stroke', '#4b5563')
        .attr('stroke-width', 2)
        .attr('stroke-opacity', 0.6)

      // Create nodes
      const node = g.append('g')
        .selectAll('g')
        .data(nodes)
        .enter().append('g')
        .call(d3.drag()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended))

      // Add circles to nodes
      node.append('circle')
        .attr('r', d => d.size)
        .attr('fill', d => `url(#gradient-${d.type})`)
        .attr('stroke', d => nodeTypes[d.type]?.color || '#6b7280')
        .attr('stroke-width', 2)
        .style('filter', 'url(#glow)')
        .on('click', (event, d) => setSelectedNode(d))
        .on('mouseover', function(event, d) {
          d3.select(this).attr('stroke-width', 4)
          setHoveredNode(d)
          setTooltipPosition({ x: event.pageX, y: event.pageY })
        })
        .on('mouseout', function(event, d) {
          d3.select(this).attr('stroke-width', 2)
          setHoveredNode(null)
        })

      // Add labels to nodes
      node.append('text')
        .text(d => d.label)
        .attr('text-anchor', 'middle')
        .attr('dy', '.35em')
        .attr('fill', 'white')
        .attr('font-size', '12px')
        .attr('font-weight', 'bold')
        .style('pointer-events', 'none')

      // Update positions on simulation tick
      simulation.on('tick', () => {
        link
          .attr('x1', d => d.source.x)
          .attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x)
          .attr('y2', d => d.target.y)

        node
          .attr('transform', d => `translate(${d.x},${d.y})`)
      })

      // Drag functions
      function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart()
        d.fx = d.x
        d.fy = d.y
      }

      function dragged(event, d) {
        d.fx = event.x
        d.fy = event.y
      }

      function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0)
        d.fx = null
        d.fy = null
      }

    } catch (error) {
      console.error('Error creating graph visualization:', error)
      // Show error state
      svg.append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', '#ef4444')
        .text('Error creating visualization')
    }
  }, [data])

  // Handle search and filter
  const handleSearch = (term) => {
    setSearchTerm(term)
    // TODO: Implement search filtering
  }

  const handleFilter = (type) => {
    setFilterType(type)
    // TODO: Implement type filtering
  }

  const handleReset = () => {
    setSearchTerm('')
    setFilterType('all')
    setSelectedNode(null)
    setHoveredNode(null)
  }

  // Show empty state if no data
  if (!data || !data.files || !Array.isArray(data.files) || data.files.length === 0) {
    return (
      <div className="relative w-full h-full">
        <EmptyState 
          message="No scan data available. Please run a code scan to generate dependency graph."
          action="Run Scan"
        />
      </div>
    )
  }

  const processedDeps = processDependencies(data.dependencies);
  const nodeCount = data.files.length;
  const linkCount = Object.keys(processedDeps).length;

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full">
        <svg ref={svgRef} className="w-full h-full" />
      </div>
      
      {/* Legend */}
      <Legend 
        nodeTypes={nodeTypes} 
        onFilterChange={handleFilter}
      />
      
      {/* Controls */}
      <Controls 
        onSearch={handleSearch}
        onFilter={handleFilter}
        onReset={handleReset}
        nodeCount={nodeCount}
        linkCount={linkCount}
      />
      
      {/* Tooltip */}
      <Tooltip 
        node={hoveredNode}
        position={tooltipPosition}
      />
      
      {/* Selected Node Info */}
      {selectedNode && (
        <div className="absolute bottom-4 left-4 bg-gray-800/90 p-3 rounded-lg backdrop-blur-sm border border-gray-600 max-w-xs">
          <h4 className="text-sm font-semibold text-white mb-2">Selected File</h4>
          <div className="text-xs text-gray-300">
            <div><strong>Name:</strong> {selectedNode.label}</div>
            <div><strong>Type:</strong> {nodeTypes[selectedNode.type]?.label || selectedNode.type}</div>
            <div><strong>Lines:</strong> {selectedNode.lines}</div>
            <div><strong>Complexity:</strong> {selectedNode.complexity}</div>
            {selectedNode.filePath && (
              <div className="mt-1 text-gray-400 truncate">
                {selectedNode.filePath}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default GraphVisualization