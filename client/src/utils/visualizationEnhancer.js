/**
 * Visualization Enhancement Utilities
 * Advanced color coding, visual encoding, and data visualization best practices
 */

export class VisualizationEnhancer {
  constructor() {
    this.colorSchemes = this.initializeColorSchemes();
    this.visualEncoders = this.initializeVisualEncoders();
    this.animationSystem = this.initializeAnimationSystem();
  }

  /**
   * Initialize comprehensive color schemes
   */
  initializeColorSchemes() {
    return {
      // Semantic color mapping (file types)
      semantic: {
        component: {
          base: '#3b82f6',
          gradient: ['#3b82f6', '#1d4ed8'],
          description: 'UI Components',
          icon: '⚛️',
          category: 'presentation'
        },
        service: {
          base: '#10b981',
          gradient: ['#10b981', '#047857'],
          description: 'Business Logic',
          icon: '⚙️',
          category: 'business'
        },
        model: {
          base: '#8b5cf6',
          gradient: ['#8b5cf6', '#6d28d9'],
          description: 'Data Models',
          icon: '📊',
          category: 'data'
        },
        utility: {
          base: '#6b7280',
          gradient: ['#6b7280', '#374151'],
          description: 'Utilities',
          icon: '🔧',
          category: 'infrastructure'
        },
        config: {
          base: '#f59e0b',
          gradient: ['#f59e0b', '#d97706'],
          description: 'Configuration',
          icon: '⚙️',
          category: 'infrastructure'
        },
        test: {
          base: '#22c55e',
          gradient: ['#22c55e', '#16a34a'],
          description: 'Tests',
          icon: '🧪',
          category: 'quality'
        },
        page: {
          base: '#ec4899',
          gradient: ['#ec4899', '#be185d'],
          description: 'Pages/Routes',
          icon: '📄',
          category: 'presentation'
        },
        hook: {
          base: '#06b6d4',
          gradient: ['#06b6d4', '#0891b2'],
          description: 'React Hooks',
          icon: '🎣',
          category: 'presentation'
        }
      },

      // Complexity-based color coding
      complexity: {
        simple: {
          base: '#22c55e',
          range: [0, 5],
          description: 'Simple (0-5)',
          icon: '🟢',
          priority: 'low'
        },
        moderate: {
          base: '#eab308',
          range: [6, 15],
          description: 'Moderate (6-15)',
          icon: '🟡',
          priority: 'medium'
        },
        complex: {
          base: '#f97316',
          range: [16, 30],
          description: 'Complex (16-30)',
          icon: '🟠',
          priority: 'high'
        },
        critical: {
          base: '#ef4444',
          range: [31, Infinity],
          description: 'Critical (30+)',
          icon: '🔴',
          priority: 'critical'
        }
      },

      // Architectural layer colors
      layer: {
        presentation: {
          base: '#3b82f6',
          description: 'Presentation Layer',
          icon: '🎨',
          position: 'top'
        },
        business: {
          base: '#10b981',
          description: 'Business Layer',
          icon: '🏢',
          position: 'middle-top'
        },
        data: {
          base: '#8b5cf6',
          description: 'Data Layer',
          icon: '🗄️',
          position: 'middle-bottom'
        },
        infrastructure: {
          base: '#6b7280',
          description: 'Infrastructure Layer',
          icon: '🔧',
          position: 'bottom'
        }
      },

      // Health-based color coding
      health: {
        excellent: {
          base: '#22c55e',
          range: [90, 100],
          description: 'Excellent Health',
          icon: '💚'
        },
        good: {
          base: '#84cc16',
          range: [70, 89],
          description: 'Good Health',
          icon: '💛'
        },
        fair: {
          base: '#eab308',
          range: [50, 69],
          description: 'Fair Health',
          icon: '🧡'
        },
        poor: {
          base: '#f97316',
          range: [30, 49],
          description: 'Poor Health',
          icon: '❤️‍🩹'
        },
        critical: {
          base: '#ef4444',
          range: [0, 29],
          description: 'Critical Health',
          icon: '💔'
        }
      },

      // User flow colors
      flows: {
        authentication: { base: '#3b82f6', icon: '🔐' },
        dataProcessing: { base: '#10b981', icon: '🔍' },
        userInterface: { base: '#f59e0b', icon: '🎨' },
        ai: { base: '#8b5cf6', icon: '🤖' },
        visualization: { base: '#06b6d4', icon: '📊' },
        system: { base: '#dc2626', icon: '🚀' },
        performance: { base: '#ef4444', icon: '⚡' }
      }
    };
  }

  /**
   * Initialize visual encoders
   */
  initializeVisualEncoders() {
    return {
      // Size encoding based on importance
      size: {
        calculateNodeSize: (node, metric = 'importance') => {
          const baseSize = 20;
          let multiplier = 1;

          switch (metric) {
            case 'importance':
              multiplier = 1 + (node.dependencies?.incoming || 0) / 20;
              break;
            case 'complexity':
              multiplier = 1 + Math.min((node.complexity || 0) / 30, 1);
              break;
            case 'lines':
              multiplier = 1 + Math.min((node.lines || 0) / 500, 1);
              break;
            case 'usage':
              multiplier = 1 + Math.min((node.usageCount || 0) / 50, 1);
              break;
          }

          return Math.max(12, Math.min(50, baseSize * multiplier));
        },

        calculateEdgeWidth: (edge, metric = 'strength') => {
          const baseWidth = 2;
          let multiplier = 1;

          switch (metric) {
            case 'strength':
              const strengthMap = { weak: 0.5, medium: 1, strong: 1.5, critical: 2 };
              multiplier = strengthMap[edge.strength] || 1;
              break;
            case 'frequency':
              multiplier = 1 + Math.min((edge.frequency || 1) / 10, 1);
              break;
            case 'importance':
              multiplier = edge.isCritical ? 2 : 1;
              break;
          }

          return Math.max(1, Math.min(6, baseWidth * multiplier));
        }
      },

      // Opacity encoding based on relevance
      opacity: {
        calculateNodeOpacity: (node, context) => {
          if (context.isolatedFlow) {
            return context.isolatedFlow.files.includes(node.filePath) ? 1.0 : 0.2;
          }
          
          if (context.activeFlows.size > 0) {
            const isInActiveFlow = Array.from(context.activeFlows).some(flowId => {
              const flow = context.flows.find(f => f.id === flowId);
              return flow && flow.files.includes(node.filePath);
            });
            return isInActiveFlow ? 1.0 : 0.3;
          }

          return 1.0;
        },

        calculateEdgeOpacity: (edge, context) => {
          if (context.isolatedFlow) {
            return context.isolatedFlow.files.includes(edge.source) && 
                   context.isolatedFlow.files.includes(edge.target) ? 0.8 : 0.1;
          }

          return 0.7;
        }
      },

      // Position encoding for architectural layers
      position: {
        calculateLayerPosition: (node, containerWidth, containerHeight) => {
          const layerPositions = {
            presentation: { x: containerWidth * 0.2, y: containerHeight * 0.2 },
            business: { x: containerWidth * 0.5, y: containerHeight * 0.4 },
            data: { x: containerWidth * 0.8, y: containerHeight * 0.6 },
            infrastructure: { x: containerWidth * 0.5, y: containerHeight * 0.8 }
          };

          return layerPositions[node.layer] || { x: containerWidth * 0.5, y: containerHeight * 0.5 };
        }
      }
    };
  }

  /**
   * Initialize animation system
   */
  initializeAnimationSystem() {
    return {
      // Transition animations
      transitions: {
        drillDown: {
          duration: 800,
          easing: 'easeInOutCubic',
          type: 'zoom-focus'
        },
        drillUp: {
          duration: 600,
          easing: 'easeOutQuart',
          type: 'zoom-out'
        },
        flowToggle: {
          duration: 400,
          easing: 'easeInOutQuad',
          type: 'highlight-fade'
        }
      },

      // Flow animations
      flows: {
        particleFlow: {
          duration: 1500,
          particleSize: 4,
          particleCount: 3,
          staggerDelay: 300
        },
        pathHighlight: {
          duration: 1000,
          pulseCount: 3,
          glowIntensity: 8
        }
      },

      // Interaction animations
      interactions: {
        hover: {
          duration: 200,
          scaleMultiplier: 1.1,
          glowIntensity: 6
        },
        select: {
          duration: 300,
          borderWidth: 4,
          pulseEffect: true
        }
      }
    };
  }

  /**
   * Get color for node based on mode
   */
  getNodeColor(node, mode = 'semantic') {
    switch (mode) {
      case 'semantic':
        return this.colorSchemes.semantic[node.type]?.base || '#6b7280';
      case 'complexity':
        return this.getComplexityColor(node.complexity || 0);
      case 'layer':
        return this.colorSchemes.layer[node.layer]?.base || '#6b7280';
      case 'health':
        return this.getHealthColor(node.health || 50);
      default:
        return '#6b7280';
    }
  }

  /**
   * Get complexity-based color
   */
  getComplexityColor(complexity) {
    const schemes = this.colorSchemes.complexity;
    
    for (const [level, config] of Object.entries(schemes)) {
      if (complexity >= config.range[0] && complexity <= config.range[1]) {
        return config.base;
      }
    }
    
    return schemes.moderate.base;
  }

  /**
   * Get health-based color
   */
  getHealthColor(health) {
    const schemes = this.colorSchemes.health;
    
    for (const [level, config] of Object.entries(schemes)) {
      if (health >= config.range[0] && health <= config.range[1]) {
        return config.base;
      }
    }
    
    return schemes.fair.base;
  }

  /**
   * Get relationship color based on type
   */
  getRelationshipColor(relationshipType) {
    const relationshipColors = {
      'import': '#06b6d4',
      'external-import': '#f59e0b',
      'dynamic-import': '#8b5cf6',
      'type-import': '#ec4899',
      'composition': '#10b981',
      'service-call': '#ef4444',
      'utility-usage': '#84cc16',
      'config-usage': '#6b7280',
      'call': '#dc2626',
      'reference': '#84cc16',
      'inheritance': '#ec4899'
    };

    return relationshipColors[relationshipType] || '#6b7280';
  }

  /**
   * Create visual definitions for SVG
   */
  createVisualDefinitions(defs) {
    // Create gradients for each node type
    Object.entries(this.colorSchemes.semantic).forEach(([type, config]) => {
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

    // Create glow filter
    const glowFilter = defs.append('filter')
      .attr('id', 'node-glow')
      .attr('x', '-50%').attr('y', '-50%')
      .attr('width', '200%').attr('height', '200%');

    glowFilter.append('feGaussianBlur')
      .attr('stdDeviation', '4')
      .attr('result', 'coloredBlur');

    const feMerge = glowFilter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Create arrow markers for different relationship types
    const relationshipTypes = ['import', 'call', 'reference', 'inheritance', 'composition'];
    relationshipTypes.forEach(type => {
      const color = this.getRelationshipColor(type);
      
      defs.append('marker')
        .attr('id', `arrow-${type}`)
        .attr('viewBox', '-0 -5 10 10')
        .attr('refX', 13)
        .attr('refY', 0)
        .attr('orient', 'auto')
        .attr('markerWidth', 8)
        .attr('markerHeight', 8)
        .append('svg:path')
        .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
        .attr('fill', color)
        .style('stroke', 'none');
    });

    // Create patterns for special edge types
    const circularPattern = defs.append('pattern')
      .attr('id', 'circular-pattern')
      .attr('patternUnits', 'userSpaceOnUse')
      .attr('width', 8)
      .attr('height', 8);

    circularPattern.append('rect')
      .attr('width', 8)
      .attr('height', 8)
      .attr('fill', '#dc2626')
      .attr('opacity', 0.3);

    circularPattern.append('path')
      .attr('d', 'M0,4 L8,4')
      .attr('stroke', '#dc2626')
      .attr('stroke-width', 2);
  }

  /**
   * Calculate node importance score
   */
  calculateNodeImportance(node, graph) {
    let importance = 0;

    // Incoming dependencies (how much other code depends on this)
    const incomingDeps = graph.edges.filter(edge => edge.target === node.id).length;
    importance += incomingDeps * 2;

    // Outgoing dependencies (how much this depends on others)
    const outgoingDeps = graph.edges.filter(edge => edge.source === node.id).length;
    importance += Math.min(outgoingDeps, 10); // Cap to prevent over-weighting

    // Complexity contribution
    importance += Math.min((node.complexity || 0) / 5, 5);

    // File size contribution
    importance += Math.min((node.lines || 0) / 100, 3);

    // Entry point bonus
    if (node.isEntryPoint) importance += 10;

    // Critical path bonus
    if (node.isCriticalPath) importance += 5;

    return Math.min(importance, 20); // Normalize to 0-20 scale
  }

  /**
   * Calculate visual properties for node
   */
  calculateNodeVisuals(node, context) {
    const colorMode = context.colorMode || 'semantic';
    const importance = this.calculateNodeImportance(node, context.graph);

    return {
      // Color based on selected mode
      fill: `url(#gradient-${node.type})`,
      stroke: this.getNodeColor(node, colorMode),
      strokeWidth: context.selectedNodes?.has(node.id) ? 4 : 2,
      
      // Size based on importance
      radius: this.visualEncoders.size.calculateNodeSize(node, 'importance'),
      
      // Opacity based on flow context
      opacity: this.visualEncoders.opacity.calculateNodeOpacity(node, context),
      
      // Special effects
      filter: importance > 15 ? 'url(#node-glow)' : null,
      
      // Animation properties
      animation: {
        shouldPulse: node.hasErrors || node.isModified,
        shouldGlow: importance > 18,
        shouldScale: context.hoveredNode?.id === node.id
      }
    };
  }

  /**
   * Calculate visual properties for edge
   */
  calculateEdgeVisuals(edge, context) {
    return {
      // Color based on relationship type
      stroke: this.getRelationshipColor(edge.relationship?.type || 'import'),
      
      // Width based on strength
      strokeWidth: this.visualEncoders.size.calculateEdgeWidth(edge, 'strength'),
      
      // Style based on relationship
      strokeDasharray: this.getEdgeStyle(edge.relationship?.type),
      
      // Opacity based on context
      opacity: this.visualEncoders.opacity.calculateEdgeOpacity(edge, context),
      
      // Marker based on relationship
      markerEnd: `url(#arrow-${edge.relationship?.type || 'import'})`,
      
      // Special properties
      isCircular: edge.quality?.isCircular,
      isExternal: edge.target.startsWith('external:'),
      
      // Animation properties
      animation: {
        shouldFlow: context.flowAnimation && this.isInActiveFlow(edge, context),
        shouldPulse: edge.quality?.isCircular,
        shouldHighlight: context.hoveredEdge?.id === edge.id
      }
    };
  }

  /**
   * Get edge style based on relationship type
   */
  getEdgeStyle(relationshipType) {
    const styleMap = {
      'import': null, // solid
      'external-import': '8,4', // dashed
      'dynamic-import': '3,3', // dotted
      'type-import': '6,2', // dash-dot
      'call': null, // solid
      'reference': '5,5', // dashed
      'inheritance': '10,2', // long dash
      'composition': null // solid
    };

    return styleMap[relationshipType] || null;
  }

  /**
   * Create flow highlight effects
   */
  createFlowHighlight(flow, nodes, edges, container) {
    // Highlight flow nodes
    const flowNodes = nodes.filter(node => flow.files.includes(node.filePath));
    flowNodes.forEach(node => {
      container.select(`#node-${CSS.escape(node.id)}`)
        .transition()
        .duration(this.animationSystem.transitions.flowToggle.duration)
        .attr('stroke', flow.color)
        .attr('stroke-width', 3)
        .style('filter', `drop-shadow(0 0 8px ${flow.color})`);
    });

    // Highlight flow edges
    const flowEdges = edges.filter(edge => 
      flow.files.includes(edge.source) && flow.files.includes(edge.target)
    );
    flowEdges.forEach(edge => {
      container.select(`#edge-${CSS.escape(edge.id)}`)
        .transition()
        .duration(this.animationSystem.transitions.flowToggle.duration)
        .attr('stroke', flow.color)
        .attr('stroke-width', 4)
        .attr('opacity', 1)
        .style('filter', `drop-shadow(0 0 4px ${flow.color})`);
    });

    return { highlightedNodes: flowNodes.length, highlightedEdges: flowEdges.length };
  }

  /**
   * Create complexity visualization
   */
  createComplexityVisualization(nodes, container) {
    // Add complexity indicators to nodes
    const complexityIndicators = container.selectAll('.complexity-indicator')
      .data(nodes.filter(node => node.complexity > 0))
      .enter().append('circle')
      .attr('class', 'complexity-indicator')
      .attr('r', 6)
      .attr('cx', d => d.x + (d.radius || 20) - 8)
      .attr('cy', d => d.y - (d.radius || 20) + 8)
      .attr('fill', d => this.getComplexityColor(d.complexity))
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .style('pointer-events', 'none');

    return complexityIndicators;
  }

  /**
   * Create architectural layer visualization
   */
  createLayerVisualization(nodes, container, width, height) {
    const layers = ['presentation', 'business', 'data', 'infrastructure'];
    const layerHeight = height / layers.length;

    // Create layer backgrounds
    const layerBackgrounds = container.selectAll('.layer-background')
      .data(layers)
      .enter().append('rect')
      .attr('class', 'layer-background')
      .attr('x', 0)
      .attr('y', (d, i) => i * layerHeight)
      .attr('width', width)
      .attr('height', layerHeight)
      .attr('fill', d => this.colorSchemes.layer[d]?.base || '#f3f4f6')
      .attr('opacity', 0.1)
      .attr('stroke', d => this.colorSchemes.layer[d]?.base || '#e5e7eb')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '5,5');

    // Add layer labels
    const layerLabels = container.selectAll('.layer-label')
      .data(layers)
      .enter().append('text')
      .attr('class', 'layer-label')
      .attr('x', 20)
      .attr('y', (d, i) => i * layerHeight + 30)
      .text(d => this.colorSchemes.layer[d]?.description || d)
      .attr('font-size', '14px')
      .attr('font-weight', '600')
      .attr('fill', d => this.colorSchemes.layer[d]?.base || '#6b7280')
      .attr('opacity', 0.7);

    return { backgrounds: layerBackgrounds, labels: layerLabels };
  }

  /**
   * Animate flow particles
   */
  animateFlowParticles(edges, flow, container) {
    const flowEdges = edges.filter(edge => 
      flow.files.includes(edge.source) && flow.files.includes(edge.target)
    );

    flowEdges.forEach((edge, index) => {
      setTimeout(() => {
        this.createFlowParticle(edge, flow, container);
      }, index * this.animationSystem.flows.particleFlow.staggerDelay);
    });
  }

  /**
   * Create individual flow particle
   */
  createFlowParticle(edge, flow, container) {
    const particle = container.append('circle')
      .attr('class', 'flow-particle')
      .attr('r', this.animationSystem.flows.particleFlow.particleSize)
      .attr('fill', flow.color)
      .attr('cx', edge.source.x)
      .attr('cy', edge.source.y)
      .style('filter', `drop-shadow(0 0 6px ${flow.color})`)
      .style('pointer-events', 'none');

    // Animate along edge path
    particle
      .transition()
      .duration(this.animationSystem.flows.particleFlow.duration)
      .ease(d3.easeLinear)
      .attr('cx', edge.target.x)
      .attr('cy', edge.target.y)
      .on('end', () => particle.remove());
  }

  /**
   * Check if edge is in active flow
   */
  isInActiveFlow(edge, context) {
    if (!context.activeFlows || context.activeFlows.size === 0) return false;

    return Array.from(context.activeFlows).some(flowId => {
      const flow = context.flows.find(f => f.id === flowId);
      return flow && 
             flow.files.includes(edge.source) && 
             flow.files.includes(edge.target);
    });
  }

  /**
   * Get legend data for current color mode
   */
  getLegendData(colorMode) {
    switch (colorMode) {
      case 'semantic':
        return Object.entries(this.colorSchemes.semantic).map(([type, config]) => ({
          color: config.base,
          label: config.description,
          icon: config.icon,
          category: config.category
        }));
        
      case 'complexity':
        return Object.entries(this.colorSchemes.complexity).map(([level, config]) => ({
          color: config.base,
          label: config.description,
          icon: config.icon,
          priority: config.priority
        }));
        
      case 'layer':
        return Object.entries(this.colorSchemes.layer).map(([layer, config]) => ({
          color: config.base,
          label: config.description,
          icon: config.icon,
          position: config.position
        }));
        
      case 'health':
        return Object.entries(this.colorSchemes.health).map(([level, config]) => ({
          color: config.base,
          label: config.description,
          icon: config.icon,
          range: `${config.range[0]}-${config.range[1]}%`
        }));
        
      default:
        return [];
    }
  }
}

export default new VisualizationEnhancer();
