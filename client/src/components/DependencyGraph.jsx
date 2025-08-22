import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as d3 from 'd3';
import { VisualizationConfig, VisualizationHelpers } from '../../../core/visualization-config.js';

const DependencyGraph = ({ data, width = 800, height = 600, config = VisualizationConfig }) => {
  const svgRef = useRef();
  const [selectedNodes, setSelectedNodes] = useState(new Set());
  const [hoveredNode, setHoveredNode] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [filters, setFilters] = useState({
    fileTypes: 'all',
    layers: 'all',
    complexity: 'all'
  });
  
  // Enhanced Code Knowledge Graph features
  const [semanticSearch, setSemanticSearch] = useState('');
  const [contextualRecommendations, setContextualRecommendations] = useState([]);
  const [symbolRelationships, setSymbolRelationships] = useState(new Map());
  const [incrementalUpdates, setIncrementalUpdates] = useState([]);
  const [knowledgeGraphMode, setKnowledgeGraphMode] = useState('dependency'); // 'dependency' | 'semantic' | 'symbol'
  const [selectedSymbols, setSelectedSymbols] = useState(new Set());
  const [contextPanel, setContextPanel] = useState(null);

  // Memoized processed data for performance
  const processedData = useMemo(() => {
    if (!data || !data.dependencyGraph) return null;
    
    const { nodes, edges } = data.dependencyGraph;
    
    // Enhanced node processing with semantic information
    const enhancedNodes = nodes.map(node => ({
      ...node,
      semanticScore: calculateSemanticScore(node),
      symbolCount: node.symbols?.length || 0,
      relationshipCount: edges.filter(e => e.source === node.id || e.target === node.id).length,
      contextRelevance: calculateContextRelevance(node),
      knowledgeGraphData: extractKnowledgeGraphData(node)
    }));
    
    // Enhanced edge processing with semantic relationships
    const enhancedEdges = edges.map(edge => ({
      ...edge,
      semanticStrength: calculateSemanticStrength(edge),
      relationshipType: determineRelationshipType(edge),
      contextWeight: calculateContextWeight(edge)
    }));
    
    return {
      nodes: enhancedNodes,
      edges: enhancedEdges,
      semanticIndex: buildSemanticIndex(enhancedNodes),
      symbolGraph: buildSymbolGraph(enhancedNodes),
      contextGraph: buildContextGraph(enhancedNodes, enhancedEdges)
    };
  }, [data, semanticSearch]);

  // Semantic search functionality
  const performSemanticSearch = useCallback((query) => {
    if (!processedData || !query.trim()) return [];
    
    const searchResults = [];
    const queryLower = query.toLowerCase();
    
    // Search in node names, symbols, and semantic data
    processedData.nodes.forEach(node => {
      let score = 0;
      
      // Name matching
      if (node.label.toLowerCase().includes(queryLower)) {
        score += 10;
      }
      
      // Symbol matching
      if (node.symbols) {
        const symbolMatches = node.symbols.filter(symbol => 
          symbol.name.toLowerCase().includes(queryLower) ||
          symbol.type.toLowerCase().includes(queryLower)
        );
        score += symbolMatches.length * 5;
      }
      
      // Semantic content matching
      if (node.semanticContent) {
        const contentMatches = node.semanticContent.filter(content =>
          content.toLowerCase().includes(queryLower)
        );
        score += contentMatches.length * 3;
      }
      
      if (score > 0) {
        searchResults.push({ node, score, matches: [] });
      }
    });
    
    return searchResults.sort((a, b) => b.score - a.score);
  }, [processedData]);

  // Context-aware recommendations
  const generateContextualRecommendations = useCallback((selectedNodeIds) => {
    if (!processedData || selectedNodeIds.size === 0) return [];
    
    const selectedNodes = processedData.nodes.filter(node => selectedNodeIds.has(node.id));
    const recommendations = [];
    
    // Analyze relationships and patterns
    const relationshipPatterns = analyzeRelationshipPatterns(selectedNodes, processedData.edges);
    const complexityPatterns = analyzeComplexityPatterns(selectedNodes);
    const symbolPatterns = analyzeSymbolPatterns(selectedNodes);
    
    // Generate recommendations based on patterns
    if (relationshipPatterns.highCoupling) {
      recommendations.push({
        type: 'refactoring',
        title: 'Reduce High Coupling',
        description: 'Consider breaking down tightly coupled components',
        priority: 'high',
        impact: 'maintainability'
      });
    }
    
    if (complexityPatterns.highComplexity) {
      recommendations.push({
        type: 'optimization',
        title: 'Simplify Complex Functions',
        description: 'Functions with high complexity should be refactored',
        priority: 'medium',
        impact: 'readability'
      });
    }
    
    if (symbolPatterns.duplicateSymbols) {
      recommendations.push({
        type: 'cleanup',
        title: 'Remove Duplicate Symbols',
        description: 'Consider consolidating duplicate symbol definitions',
        priority: 'low',
        impact: 'consistency'
      });
    }
    
    return recommendations;
  }, [processedData]);

  // Symbol relationship analysis
  const analyzeSymbolRelationships = useCallback((symbolName) => {
    if (!processedData) return new Map();
    
    const relationships = new Map();
    
    processedData.nodes.forEach(node => {
      if (node.symbols) {
        node.symbols.forEach(symbol => {
          if (symbol.name === symbolName) {
            // Find all usages and references
            const usages = findSymbolUsages(symbol, processedData.nodes);
            const references = findSymbolReferences(symbol, processedData.edges);
            
            relationships.set(node.id, {
              node,
              symbol,
              usages,
              references,
              impact: calculateSymbolImpact(symbol, usages, references)
            });
          }
        });
      }
    });
    
    return relationships;
  }, [processedData]);

  // Incremental update system
  const processIncrementalUpdates = useCallback((updates) => {
    if (!processedData || !updates.length) return;
    
    const newUpdates = updates.map(update => {
      switch (update.type) {
        case 'node_added':
          return processNodeAddition(update.data, processedData);
        case 'node_modified':
          return processNodeModification(update.data, processedData);
        case 'edge_added':
          return processEdgeAddition(update.data, processedData);
        case 'symbol_changed':
          return processSymbolChange(update.data, processedData);
        default:
          return update;
      }
    });
    
    setIncrementalUpdates(prev => [...prev, ...newUpdates]);
  }, [processedData]);

  // Helper functions for semantic analysis
  const calculateSemanticScore = (node) => {
    let score = 0;
    
    // Base score from complexity
    score += Math.min(node.metrics?.complexity || 0, 10);
    
    // Symbol density
    if (node.symbols) {
      score += Math.min(node.symbols.length * 0.5, 5);
    }
    
    // Relationship density
    score += Math.min((node.metrics?.dependencies || 0) * 0.3, 3);
    
    return Math.min(score, 10);
  };

  const calculateContextRelevance = (node) => {
    if (!semanticSearch) return 0;
    
    const queryTerms = semanticSearch.toLowerCase().split(' ');
    let relevance = 0;
    
    // Check node name
    queryTerms.forEach(term => {
      if (node.label.toLowerCase().includes(term)) {
        relevance += 2;
      }
    });
    
    // Check symbols
    if (node.symbols) {
      node.symbols.forEach(symbol => {
        queryTerms.forEach(term => {
          if (symbol.name.toLowerCase().includes(term)) {
            relevance += 1;
          }
        });
      });
    }
    
    return Math.min(relevance, 10);
  };

  const extractKnowledgeGraphData = (node) => {
    return {
      symbols: node.symbols || [],
      imports: node.imports || [],
      exports: node.exports || [],
      dependencies: node.dependencies || [],
      semanticContent: node.semanticContent || [],
      context: node.context || {}
    };
  };

  const calculateSemanticStrength = (edge) => {
    let strength = 1;
    
    // Import/export relationships are stronger
    if (edge.type === 'import' || edge.type === 'export') {
      strength += 2;
    }
    
    // Dependency relationships
    if (edge.type === 'dependency') {
      strength += 1;
    }
    
    // Circular dependencies are weaker
    if (edge.circular) {
      strength *= 0.5;
    }
    
    return Math.min(strength, 5);
  };

  const determineRelationshipType = (edge) => {
    if (edge.type === 'import') return 'structural';
    if (edge.type === 'dependency') return 'functional';
    if (edge.type === 'inheritance') return 'hierarchical';
    if (edge.type === 'composition') return 'compositional';
    return 'general';
  };

  const calculateContextWeight = (edge) => {
    let weight = 1;
    
    // Higher weight for edges involving selected nodes
    if (selectedNodes.has(edge.source) || selectedNodes.has(edge.target)) {
      weight *= 2;
    }
    
    // Higher weight for edges in search results
    if (semanticSearch) {
      weight *= 1.5;
    }
    
    return weight;
  };

  const buildSemanticIndex = (nodes) => {
    const index = new Map();
    
    nodes.forEach(node => {
      // Index by name
      if (!index.has(node.label)) {
        index.set(node.label, []);
      }
      index.get(node.label).push(node);
      
      // Index by symbols
      if (node.symbols) {
        node.symbols.forEach(symbol => {
          if (!index.has(symbol.name)) {
            index.set(symbol.name, []);
          }
          index.get(symbol.name).push({ node, symbol });
        });
      }
    });
    
    return index;
  };

  const buildSymbolGraph = (nodes) => {
    const symbolGraph = new Map();
    
    nodes.forEach(node => {
      if (node.symbols) {
        node.symbols.forEach(symbol => {
          if (!symbolGraph.has(symbol.name)) {
            symbolGraph.set(symbol.name, {
              symbol,
              nodes: [],
              relationships: []
            });
          }
          symbolGraph.get(symbol.name).nodes.push(node);
        });
      }
    });
    
    return symbolGraph;
  };

  const buildContextGraph = (nodes, edges) => {
    const contextGraph = new Map();
    
    nodes.forEach(node => {
      const context = {
        node,
        neighbors: [],
        dependencies: [],
        dependents: [],
        context: node.context || {}
      };
      
      // Find neighbors
      edges.forEach(edge => {
        if (edge.source === node.id) {
          const targetNode = nodes.find(n => n.id === edge.target);
          if (targetNode) {
            context.neighbors.push(targetNode);
            context.dependencies.push({ node: targetNode, edge });
          }
        }
        if (edge.target === node.id) {
          const sourceNode = nodes.find(n => n.id === edge.source);
          if (sourceNode) {
            context.neighbors.push(sourceNode);
            context.dependents.push({ node: sourceNode, edge });
          }
        }
      });
      
      contextGraph.set(node.id, context);
    });
    
    return contextGraph;
  };

  // Pattern analysis functions
  const analyzeRelationshipPatterns = (nodes, edges) => {
    const patterns = {
      highCoupling: false,
      circularDependencies: false,
      isolatedComponents: false
    };
    
    // Check for high coupling
    const avgDependencies = nodes.reduce((sum, node) => 
      sum + (node.metrics?.dependencies || 0), 0) / nodes.length;
    patterns.highCoupling = avgDependencies > 5;
    
    // Check for circular dependencies
    patterns.circularDependencies = edges.some(edge => edge.circular);
    
    // Check for isolated components
    patterns.isolatedComponents = nodes.some(node => 
      (node.metrics?.dependencies || 0) === 0 && 
      edges.filter(e => e.target === node.id).length === 0
    );
    
    return patterns;
  };

  const analyzeComplexityPatterns = (nodes) => {
    const patterns = {
      highComplexity: false,
      inconsistentComplexity: false
    };
    
    const complexities = nodes.map(node => node.metrics?.complexity || 0);
    const avgComplexity = complexities.reduce((sum, c) => sum + c, 0) / complexities.length;
    
    patterns.highComplexity = avgComplexity > 5;
    patterns.inconsistentComplexity = Math.max(...complexities) - Math.min(...complexities) > 8;
    
    return patterns;
  };

  const analyzeSymbolPatterns = (nodes) => {
    const patterns = {
      duplicateSymbols: false,
      largeSymbols: false
    };
    
    const allSymbols = nodes.flatMap(node => node.symbols || []);
    const symbolNames = allSymbols.map(s => s.name);
    const uniqueSymbols = new Set(symbolNames);
    
    patterns.duplicateSymbols = symbolNames.length !== uniqueSymbols.size;
    patterns.largeSymbols = allSymbols.some(symbol => symbol.size > 100);
    
    return patterns;
  };

  // Update processing functions
  const processNodeAddition = (nodeData, currentData) => {
    return {
      type: 'node_added',
      data: nodeData,
      timestamp: Date.now(),
      impact: 'low'
    };
  };

  const processNodeModification = (nodeData, currentData) => {
    return {
      type: 'node_modified',
      data: nodeData,
      timestamp: Date.now(),
      impact: 'medium'
    };
  };

  const processEdgeAddition = (edgeData, currentData) => {
    return {
      type: 'edge_added',
      data: edgeData,
      timestamp: Date.now(),
      impact: 'medium'
    };
  };

  const processSymbolChange = (symbolData, currentData) => {
    return {
      type: 'symbol_changed',
      data: symbolData,
      timestamp: Date.now(),
      impact: 'high'
    };
  };

  // Initialize D3 visualization
  useEffect(() => {
    if (!processedData || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous content

    const { nodes, edges } = processedData;
    
    // Apply filters and semantic search
    let filteredNodes = applyFilters(nodes, filters);
    
    // Apply semantic search if active
    if (semanticSearch) {
      const searchResults = performSemanticSearch(semanticSearch);
      const searchNodeIds = new Set(searchResults.map(r => r.node.id));
      filteredNodes = filteredNodes.filter(node => searchNodeIds.has(node.id));
    }
    
    const filteredEdges = edges.filter(edge => 
      filteredNodes.some(node => node.id === edge.source) &&
      filteredNodes.some(node => node.id === edge.target)
    );

    // Create force simulation with enhanced physics
    const simulation = d3.forceSimulation(filteredNodes)
      .force('link', d3.forceLink(filteredEdges).id(d => d.id).distance(d => 
        config.layout.force.linkDistance * (1 / d.semanticStrength)))
      .force('charge', d3.forceManyBody().strength(d => 
        config.layout.force.charge * (1 + d.semanticScore * 0.1)))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(d => 
        VisualizationHelpers.calculateNodeSize(d.metrics.complexity, 'complexity') + 10));

    // Create zoom behavior
    const zoomBehavior = d3.zoom()
      .scaleExtent([config.interactions.zoom.min, config.interactions.zoom.max])
      .on('zoom', (event) => {
        setZoom(event.transform.k);
        container.attr('transform', event.transform);
      });

    svg.call(zoomBehavior);

    // Create container for all elements
    const container = svg.append('g');

    // Create arrow markers for edges with semantic strength
    svg.append('defs').selectAll('marker')
      .data(['arrow-strong', 'arrow-medium', 'arrow-weak'])
      .enter().append('marker')
      .attr('id', d => d)
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 15)
      .attr('refY', 0)
      .attr('markerWidth', d => {
        if (d === 'arrow-strong') return config.edges.arrows.size * 1.5;
        if (d === 'arrow-medium') return config.edges.arrows.size;
        return config.edges.arrows.size * 0.7;
      })
      .attr('markerHeight', d => {
        if (d === 'arrow-strong') return config.edges.arrows.size * 1.5;
        if (d === 'arrow-medium') return config.edges.arrows.size;
        return config.edges.arrows.size * 0.7;
      })
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', d => {
        if (d === 'arrow-strong') return '#ff6b6b';
        if (d === 'arrow-medium') return '#4ecdc4';
        return '#95a5a6';
      });

    // Create edges with semantic strength visualization
    const edge = container.append('g')
      .selectAll('line')
      .data(filteredEdges)
      .enter().append('line')
      .attr('stroke', d => {
        const baseColor = VisualizationHelpers.getDependencyColor(d.type);
        const strength = d.semanticStrength;
        return d3.color(baseColor).brighter(1 - strength / 5);
      })
      .attr('stroke-width', d => config.edges.width.default * d.semanticStrength)
      .attr('stroke-opacity', config.edges.line.opacity * d.contextWeight)
      .attr('marker-end', d => {
        if (d.semanticStrength >= 4) return 'url(#arrow-strong)';
        if (d.semanticStrength >= 2) return 'url(#arrow-medium)';
        return 'url(#arrow-weak)';
      })
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this)
          .attr('stroke-width', config.edges.hover.width * d.semanticStrength)
          .attr('stroke-opacity', config.edges.hover.opacity)
          .attr('stroke', config.edges.hover.color);
        
        // Show enhanced edge tooltip
        showTooltip(event, generateEnhancedEdgeTooltip(d), 'edge');
      })
      .on('mouseout', function() {
        d3.select(this)
          .attr('stroke-width', config.edges.width.default * d.semanticStrength)
          .attr('stroke-opacity', config.edges.line.opacity * d.contextWeight)
          .attr('stroke', d => {
            const baseColor = VisualizationHelpers.getDependencyColor(d.type);
            const strength = d.semanticStrength;
            return d3.color(baseColor).brighter(1 - strength / 5);
          });
        
        hideTooltip();
      });

    // Create nodes with enhanced visualization
    const node = container.append('g')
      .selectAll('g')
      .data(filteredNodes)
      .enter().append('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    // Add node circles with semantic score visualization
    node.append('circle')
      .attr('r', d => VisualizationHelpers.calculateNodeSize(d.metrics.complexity, 'complexity'))
      .attr('fill', d => {
        const baseColor = VisualizationHelpers.getFileTypeColor(d.type);
        const semanticScore = d.semanticScore;
        return d3.color(baseColor).brighter(semanticScore / 10);
      })
      .attr('stroke', d => {
        if (selectedNodes.has(d.id)) {
          return config.interactions.selection.style.border;
        }
        return config.nodes.border.color;
      })
      .attr('stroke-width', d => {
        if (selectedNodes.has(d.id)) {
          return 3;
        }
        return config.nodes.border.width;
      })
      .style('transition', `all ${config.animations.hover.duration}ms ${config.animations.hover.easing}`)
      .on('mouseover', function(event, d) {
        setHoveredNode(d);
        d3.select(this)
          .attr('r', d => VisualizationHelpers.calculateNodeSize(d.metrics.complexity, 'complexity') * config.nodes.hover.scale)
          .attr('stroke-width', config.nodes.hover.borderWidth)
          .style('filter', `drop-shadow(${config.nodes.hover.shadow})`);
        
        // Show enhanced node tooltip
        showTooltip(event, generateEnhancedNodeTooltip(d), 'node');
      })
      .on('mouseout', function() {
        setHoveredNode(null);
        d3.select(this)
          .attr('r', d => VisualizationHelpers.calculateNodeSize(d.metrics.complexity, 'complexity'))
          .attr('stroke-width', d => {
            if (selectedNodes.has(d.id)) {
              return 3;
            }
            return config.nodes.border.width;
          })
          .style('filter', 'none');
        
        hideTooltip();
      })
      .on('click', function(event, d) {
        event.stopPropagation();
        const newSelected = new Set(selectedNodes);
        if (newSelected.has(d.id)) {
          newSelected.delete(d.id);
        } else {
          newSelected.add(d.id);
        }
        setSelectedNodes(newSelected);
        
        // Generate contextual recommendations
        const recommendations = generateContextualRecommendations(newSelected);
        setContextualRecommendations(recommendations);
        
        // Highlight selected nodes
        node.selectAll('circle')
          .attr('stroke', d => 
            newSelected.has(d.id) ? config.interactions.selection.style.border : config.nodes.border.color
          )
          .attr('stroke-width', d => 
            newSelected.has(d.id) ? 3 : config.nodes.border.width
          );
      });

    // Add node labels with semantic search highlighting
    node.append('text')
      .text(d => d.label.length > config.nodes.label.maxLength ? 
        d.label.substring(0, config.nodes.label.maxLength) + '...' : d.label)
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .style('font-size', config.nodes.label.fontSize)
      .style('font-family', config.nodes.label.fontFamily)
      .style('fill', d => {
        if (semanticSearch && d.label.toLowerCase().includes(semanticSearch.toLowerCase())) {
          return '#ff6b6b';
        }
        return config.nodes.label.color;
      })
      .style('pointer-events', 'none')
      .style('user-select', 'none');

    // Add semantic score indicator
    node.append('circle')
      .attr('r', 4)
      .attr('cx', d => VisualizationHelpers.calculateNodeSize(d.metrics.complexity, 'complexity') + 8)
      .attr('cy', -8)
      .attr('fill', d => {
        const score = d.semanticScore;
        if (score >= 8) return '#e74c3c';
        if (score >= 6) return '#f39c12';
        if (score >= 4) return '#f1c40f';
        return '#27ae60';
      })
      .style('pointer-events', 'none');

    // Add symbol count indicator
    node.append('text')
      .text(d => d.symbolCount > 0 ? d.symbolCount.toString() : '')
      .attr('x', d => VisualizationHelpers.calculateNodeSize(d.metrics.complexity, 'complexity') + 12)
      .attr('y', -4)
      .style('font-size', '10px')
      .style('font-weight', 'bold')
      .style('fill', '#34495e')
      .style('pointer-events', 'none');

    // Update positions on simulation tick
    simulation.on('tick', () => {
      edge
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      node
        .attr('transform', d => `translate(${d.x},${d.y})`);
    });

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

    // Enhanced tooltip functions
    function generateEnhancedNodeTooltip(node) {
      const baseTooltip = VisualizationHelpers.generateTooltip(node);
      
      return `
        <div class="enhanced-tooltip">
          <h4>${node.label}</h4>
          <p><strong>Type:</strong> ${node.type}</p>
          <p><strong>Complexity:</strong> ${node.metrics?.complexity || 0}</p>
          <p><strong>Semantic Score:</strong> ${node.semanticScore.toFixed(1)}</p>
          <p><strong>Symbols:</strong> ${node.symbolCount}</p>
          <p><strong>Relationships:</strong> ${node.relationshipCount}</p>
          ${node.symbols ? `
            <div class="symbols">
              <strong>Symbols:</strong>
              <ul>
                ${node.symbols.slice(0, 5).map(symbol => 
                  `<li>${symbol.name} (${symbol.type})</li>`
                ).join('')}
                ${node.symbols.length > 5 ? `<li>... and ${node.symbols.length - 5} more</li>` : ''}
              </ul>
            </div>
          ` : ''}
        </div>
      `;
    }

    function generateEnhancedEdgeTooltip(edge) {
      const baseTooltip = VisualizationHelpers.generateEdgeTooltip(edge);
      
      return `
        <div class="enhanced-tooltip">
          <h4>${edge.source} → ${edge.target}</h4>
          <p><strong>Type:</strong> ${edge.type}</p>
          <p><strong>Semantic Strength:</strong> ${edge.semanticStrength.toFixed(1)}</p>
          <p><strong>Relationship:</strong> ${edge.relationshipType}</p>
          ${edge.circular ? '<p><strong>⚠️ Circular Dependency</strong></p>' : ''}
        </div>
      `;
    }

    function showTooltip(event, content, type) {
      const tooltip = d3.select('body').append('div')
        .attr('class', 'tooltip')
        .style('position', 'absolute')
        .style('background', 'rgba(0, 0, 0, 0.9)')
        .style('color', 'white')
        .style('padding', '10px')
        .style('border-radius', '5px')
        .style('font-size', '12px')
        .style('pointer-events', 'none')
        .style('z-index', 50)
        .html(content);

      tooltip
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px');
    }

    function hideTooltip() {
      d3.selectAll('.tooltip').remove();
    }

    // Cleanup function
    return () => {
      simulation.stop();
    };
  }, [processedData, filters, semanticSearch, selectedNodes, config, width, height]);

  // Apply filters function
  const applyFilters = (nodes, filters) => {
    let filtered = nodes;

    if (filters.fileTypes !== 'all') {
      filtered = filtered.filter(node => node.type === filters.fileTypes);
    }

    if (filters.layers !== 'all') {
      filtered = filtered.filter(node => node.layer === filters.layers);
    }

    if (filters.complexity !== 'all') {
      filtered = filtered.filter(node => {
        const complexity = node.metrics?.complexity || 0;
        switch (filters.complexity) {
          case 'low':
            return complexity <= 3;
          case 'medium':
            return complexity > 3 && complexity <= 7;
          case 'high':
            return complexity > 7;
          default:
            return true;
        }
      });
    }

    return filtered;
  };

  return (
    <div className="dependency-graph-container">
      {/* Enhanced Controls */}
      <div className="graph-controls">
        <div className="semantic-search">
          <input
            type="text"
            placeholder="Search symbols, functions, classes..."
            value={semanticSearch}
            onChange={(e) => setSemanticSearch(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="knowledge-graph-mode">
          <select
            value={knowledgeGraphMode}
            onChange={(e) => setKnowledgeGraphMode(e.target.value)}
            className="mode-select"
          >
            <option value="dependency">Dependency View</option>
            <option value="semantic">Semantic View</option>
            <option value="symbol">Symbol View</option>
          </select>
        </div>
      </div>

      {/* Main Visualization */}
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="dependency-graph"
      />

      {/* Context Panel */}
      {contextPanel && (
        <div className="context-panel">
          <h3>Context Analysis</h3>
          <div className="context-content">
            {contextPanel}
          </div>
        </div>
      )}

      {/* Recommendations Panel */}
      {contextualRecommendations.length > 0 && (
        <div className="recommendations-panel">
          <h3>Recommendations</h3>
          <div className="recommendations-list">
            {contextualRecommendations.map((rec, index) => (
              <div key={index} className={`recommendation ${rec.priority}`}>
                <h4>{rec.title}</h4>
                <p>{rec.description}</p>
                <div className="recommendation-meta">
                  <span className={`priority ${rec.priority}`}>{rec.priority}</span>
                  <span className="impact">{rec.impact}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Incremental Updates Panel */}
      {incrementalUpdates.length > 0 && (
        <div className="updates-panel">
          <h3>Recent Updates</h3>
          <div className="updates-list">
            {incrementalUpdates.slice(-5).map((update, index) => (
              <div key={index} className={`update ${update.impact}`}>
                <span className="update-type">{update.type}</span>
                <span className="update-time">
                  {new Date(update.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DependencyGraph;
