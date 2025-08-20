/**
 * Performance Optimizer for Large Dependency Graphs
 * Level-of-detail rendering, virtualization, and performance enhancements
 */

export class PerformanceOptimizer {
  constructor() {
    this.renderingThresholds = {
      small: 50,    // < 50 nodes: full detail
      medium: 200,  // 50-200 nodes: reduced detail
      large: 1000,  // 200-1000 nodes: clustering
      huge: 5000    // > 1000 nodes: aggressive optimization
    };

    this.lodLevels = {
      full: { minZoom: 1.5, nodeDetail: 'full', edgeDetail: 'full', labels: true },
      high: { minZoom: 0.8, nodeDetail: 'high', edgeDetail: 'high', labels: true },
      medium: { minZoom: 0.4, nodeDetail: 'medium', edgeDetail: 'medium', labels: false },
      low: { minZoom: 0.1, nodeDetail: 'low', edgeDetail: 'low', labels: false }
    };

    this.viewport = { x: 0, y: 0, width: 0, height: 0, zoom: 1 };
    this.renderCache = new Map();
    this.frameRequestId = null;
  }

  /**
   * Optimize graph rendering based on size and zoom level
   */
  optimizeRendering(nodes, edges, zoomLevel, viewport) {
    const nodeCount = nodes.length;
    const edgeCount = edges.length;
    
    // Update viewport
    this.viewport = { ...viewport, zoom: zoomLevel };

    // Determine optimization strategy
    const strategy = this.determineOptimizationStrategy(nodeCount, edgeCount, zoomLevel);
    
    // Apply optimizations
    const optimizedData = this.applyOptimizations(nodes, edges, strategy);
    
    return {
      ...optimizedData,
      strategy,
      performance: {
        originalNodes: nodeCount,
        originalEdges: edgeCount,
        renderedNodes: optimizedData.nodes.length,
        renderedEdges: optimizedData.edges.length,
        optimizationLevel: strategy.level
      }
    };
  }

  /**
   * Determine optimization strategy based on graph characteristics
   */
  determineOptimizationStrategy(nodeCount, edgeCount, zoomLevel) {
    let level = 'full';
    let techniques = [];

    // Determine detail level based on zoom
    if (zoomLevel < 0.3) {
      level = 'low';
      techniques.push('clustering', 'edge-bundling', 'node-aggregation');
    } else if (zoomLevel < 0.6) {
      level = 'medium';
      techniques.push('viewport-culling', 'simplified-rendering');
    } else if (zoomLevel < 1.2) {
      level = 'high';
      techniques.push('viewport-culling');
    } else {
      level = 'full';
    }

    // Adjust based on graph size
    if (nodeCount > this.renderingThresholds.huge) {
      level = 'low';
      techniques.push('aggressive-clustering', 'virtual-scrolling');
    } else if (nodeCount > this.renderingThresholds.large) {
      level = Math.min(level, 'medium');
      techniques.push('clustering', 'viewport-culling');
    } else if (nodeCount > this.renderingThresholds.medium) {
      level = Math.min(level, 'high');
      techniques.push('viewport-culling');
    }

    return {
      level,
      techniques,
      lodConfig: this.lodLevels[level],
      shouldCluster: techniques.includes('clustering'),
      shouldCull: techniques.includes('viewport-culling'),
      shouldBundle: techniques.includes('edge-bundling')
    };
  }

  /**
   * Apply optimization techniques
   */
  applyOptimizations(nodes, edges, strategy) {
    let optimizedNodes = [...nodes];
    let optimizedEdges = [...edges];

    // Apply viewport culling
    if (strategy.shouldCull) {
      const culled = this.performViewportCulling(optimizedNodes, optimizedEdges);
      optimizedNodes = culled.nodes;
      optimizedEdges = culled.edges;
    }

    // Apply clustering
    if (strategy.shouldCluster) {
      const clustered = this.performClustering(optimizedNodes, optimizedEdges, strategy.level);
      optimizedNodes = clustered.nodes;
      optimizedEdges = clustered.edges;
    }

    // Apply edge bundling
    if (strategy.shouldBundle) {
      optimizedEdges = this.performEdgeBundling(optimizedEdges);
    }

    // Apply level-of-detail rendering
    optimizedNodes = this.applyNodeLOD(optimizedNodes, strategy.lodConfig);
    optimizedEdges = this.applyEdgeLOD(optimizedEdges, strategy.lodConfig);

    return {
      nodes: optimizedNodes,
      edges: optimizedEdges,
      clusters: strategy.shouldCluster ? this.getClusterInfo(optimizedNodes) : []
    };
  }

  /**
   * Viewport culling - only render visible elements
   */
  performViewportCulling(nodes, edges) {
    const margin = 100; // Render margin outside viewport
    const viewport = this.viewport;

    const visibleNodes = nodes.filter(node => {
      if (!node.x || !node.y) return true; // Include nodes without position

      return (
        node.x >= viewport.x - margin &&
        node.x <= viewport.x + viewport.width + margin &&
        node.y >= viewport.y - margin &&
        node.y <= viewport.y + viewport.height + margin
      );
    });

    const visibleNodeIds = new Set(visibleNodes.map(n => n.id));
    const visibleEdges = edges.filter(edge => 
      visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
    );

    return {
      nodes: visibleNodes,
      edges: visibleEdges
    };
  }

  /**
   * Clustering for large graphs
   */
  performClustering(nodes, edges, level) {
    if (level === 'low') {
      return this.aggressiveClustering(nodes, edges);
    } else if (level === 'medium') {
      return this.moderateClustering(nodes, edges);
    } else {
      return this.lightClustering(nodes, edges);
    }
  }

  /**
   * Aggressive clustering for very large graphs
   */
  aggressiveClustering(nodes, edges) {
    // Group nodes by type and layer
    const clusters = new Map();
    
    nodes.forEach(node => {
      const clusterKey = `${node.type}-${node.layer}`;
      if (!clusters.has(clusterKey)) {
        clusters.set(clusterKey, {
          id: `cluster-${clusterKey}`,
          type: 'cluster',
          clusterType: node.type,
          layer: node.layer,
          nodes: [],
          size: 0,
          complexity: 0,
          color: node.color
        });
      }
      
      const cluster = clusters.get(clusterKey);
      cluster.nodes.push(node);
      cluster.size += node.size || 20;
      cluster.complexity += node.complexity || 0;
    });

    // Create cluster nodes
    const clusterNodes = Array.from(clusters.values()).map(cluster => ({
      ...cluster,
      id: cluster.id,
      name: `${cluster.clusterType} (${cluster.nodes.length})`,
      size: Math.min(Math.max(cluster.size / cluster.nodes.length, 30), 80),
      complexity: cluster.complexity / cluster.nodes.length,
      isCluster: true,
      memberCount: cluster.nodes.length
    }));

    // Create cluster edges
    const clusterEdges = this.createClusterEdges(clusters, edges);

    return {
      nodes: clusterNodes,
      edges: clusterEdges
    };
  }

  /**
   * Edge bundling for cleaner visualization
   */
  performEdgeBundling(edges) {
    // Group edges by source-target pairs
    const edgeGroups = new Map();
    
    edges.forEach(edge => {
      const key = `${edge.source}-${edge.target}`;
      if (!edgeGroups.has(key)) {
        edgeGroups.set(key, []);
      }
      edgeGroups.get(key).push(edge);
    });

    // Create bundled edges
    const bundledEdges = [];
    edgeGroups.forEach((edgeGroup, key) => {
      if (edgeGroup.length === 1) {
        bundledEdges.push(edgeGroup[0]);
      } else {
        // Create bundled edge
        const bundled = {
          ...edgeGroup[0],
          id: `bundled-${key}`,
          bundleCount: edgeGroup.length,
          relationships: edgeGroup.map(e => e.relationship),
          width: Math.min(edgeGroup.length * 2, 8),
          opacity: 0.8,
          isBundled: true
        };
        bundledEdges.push(bundled);
      }
    });

    return bundledEdges;
  }

  /**
   * Apply level-of-detail to nodes
   */
  applyNodeLOD(nodes, lodConfig) {
    return nodes.map(node => {
      const lodNode = { ...node };

      switch (lodConfig.nodeDetail) {
        case 'low':
          // Minimal detail - just basic shape and color
          lodNode.showIcon = false;
          lodNode.showComplexity = false;
          lodNode.showMetrics = false;
          lodNode.size = Math.max((lodNode.size || 20) * 0.7, 8);
          break;

        case 'medium':
          // Moderate detail - icons but no metrics
          lodNode.showIcon = true;
          lodNode.showComplexity = false;
          lodNode.showMetrics = false;
          lodNode.size = (lodNode.size || 20) * 0.85;
          break;

        case 'high':
          // High detail - icons and complexity
          lodNode.showIcon = true;
          lodNode.showComplexity = true;
          lodNode.showMetrics = false;
          break;

        case 'full':
        default:
          // Full detail - everything visible
          lodNode.showIcon = true;
          lodNode.showComplexity = true;
          lodNode.showMetrics = true;
          break;
      }

      lodNode.showLabel = lodConfig.labels && (lodNode.importance > 10 || lodNode.isSelected);
      
      return lodNode;
    });
  }

  /**
   * Apply level-of-detail to edges
   */
  applyEdgeLOD(edges, lodConfig) {
    return edges.map(edge => {
      const lodEdge = { ...edge };

      switch (lodConfig.edgeDetail) {
        case 'low':
          // Minimal edges - only strong relationships
          if (edge.relationship?.strength !== 'strong' && edge.relationship?.strength !== 'critical') {
            lodEdge.opacity = 0.2;
            lodEdge.width = 1;
          }
          lodEdge.showArrow = false;
          break;

        case 'medium':
          // Moderate edges - reduced opacity for weak relationships
          if (edge.relationship?.strength === 'weak') {
            lodEdge.opacity = 0.4;
          }
          lodEdge.showArrow = edge.relationship?.strength === 'strong' || edge.relationship?.strength === 'critical';
          break;

        case 'high':
          // High detail - most edges visible
          lodEdge.showArrow = true;
          break;

        case 'full':
        default:
          // Full detail - all edges with full styling
          lodEdge.showArrow = true;
          lodEdge.showAnimation = true;
          break;
      }

      return lodEdge;
    });
  }

  /**
   * Throttled rendering for smooth performance
   */
  throttledRender(renderFunction, delay = 16) {
    if (this.frameRequestId) {
      cancelAnimationFrame(this.frameRequestId);
    }

    this.frameRequestId = requestAnimationFrame(() => {
      renderFunction();
    });
  }

  /**
   * Memory management for large graphs
   */
  manageMemory() {
    // Clear old cache entries
    if (this.renderCache.size > 100) {
      const oldEntries = Array.from(this.renderCache.keys()).slice(0, 50);
      oldEntries.forEach(key => this.renderCache.delete(key));
    }

    // Force garbage collection hint
    if (window.gc && this.renderCache.size > 200) {
      window.gc();
    }
  }

  /**
   * Create cluster edges between clusters
   */
  createClusterEdges(clusters, originalEdges) {
    const clusterEdges = [];
    const clusterMap = new Map();

    // Build cluster lookup map
    clusters.forEach((cluster, key) => {
      cluster.nodes.forEach(node => {
        clusterMap.set(node.id, key);
      });
    });

    // Group edges by cluster pairs
    const clusterConnections = new Map();
    
    originalEdges.forEach(edge => {
      const sourceCluster = clusterMap.get(edge.source);
      const targetCluster = clusterMap.get(edge.target);
      
      if (sourceCluster && targetCluster && sourceCluster !== targetCluster) {
        const connectionKey = `${sourceCluster}-${targetCluster}`;
        if (!clusterConnections.has(connectionKey)) {
          clusterConnections.set(connectionKey, {
            source: `cluster-${sourceCluster}`,
            target: `cluster-${targetCluster}`,
            count: 0,
            relationships: new Set(),
            strength: 0
          });
        }
        
        const connection = clusterConnections.get(connectionKey);
        connection.count++;
        connection.relationships.add(edge.relationship?.type || 'import');
        connection.strength += this.getRelationshipStrength(edge.relationship?.strength || 'medium');
      }
    });

    // Create cluster edges
    clusterConnections.forEach(connection => {
      clusterEdges.push({
        id: `${connection.source}-${connection.target}`,
        source: connection.source,
        target: connection.target,
        count: connection.count,
        relationships: Array.from(connection.relationships),
        strength: connection.strength / connection.count,
        width: Math.min(connection.count / 2 + 1, 6),
        opacity: 0.7,
        isClusterEdge: true
      });
    });

    return clusterEdges;
  }

  /**
   * Get relationship strength as number
   */
  getRelationshipStrength(strength) {
    const strengthMap = {
      'weak': 1,
      'medium': 2,
      'strong': 3,
      'critical': 4
    };
    
    return strengthMap[strength] || 2;
  }

  /**
   * Intelligent node importance calculation
   */
  calculateNodeImportance(node, allNodes, allEdges) {
    let importance = 0;

    // Centrality measures
    const inDegree = allEdges.filter(e => e.target === node.id).length;
    const outDegree = allEdges.filter(e => e.source === node.id).length;
    
    // Betweenness centrality (simplified)
    const betweenness = this.calculateBetweennessCentrality(node, allNodes, allEdges);
    
    // PageRank-style importance
    const pageRank = this.calculatePageRank(node, allNodes, allEdges);

    // Combine measures
    importance += inDegree * 2;      // Incoming dependencies
    importance += outDegree * 0.5;   // Outgoing dependencies (less important)
    importance += betweenness * 3;   // Bridge importance
    importance += pageRank * 4;      // Overall network importance

    // File-specific factors
    importance += (node.complexity || 0) / 10;
    importance += (node.lines || 0) / 500;
    
    if (node.isEntryPoint) importance += 10;
    if (node.isCriticalPath) importance += 8;
    if (node.hasErrors) importance += 5;

    return Math.min(importance, 20);
  }

  /**
   * Simplified betweenness centrality calculation
   */
  calculateBetweennessCentrality(node, nodes, edges) {
    // Simplified calculation for performance
    const connectedNodes = new Set();
    
    edges.forEach(edge => {
      if (edge.source === node.id) connectedNodes.add(edge.target);
      if (edge.target === node.id) connectedNodes.add(edge.source);
    });

    // Node is important if it connects many otherwise unconnected components
    let bridgeScore = 0;
    connectedNodes.forEach(nodeA => {
      connectedNodes.forEach(nodeB => {
        if (nodeA !== nodeB) {
          const directConnection = edges.some(edge => 
            (edge.source === nodeA && edge.target === nodeB) ||
            (edge.source === nodeB && edge.target === nodeA)
          );
          if (!directConnection) {
            bridgeScore += 1;
          }
        }
      });
    });

    return Math.min(bridgeScore / 10, 5);
  }

  /**
   * Simplified PageRank calculation
   */
  calculatePageRank(node, nodes, edges) {
    const incomingEdges = edges.filter(e => e.target === node.id);
    const incomingNodes = incomingEdges.map(e => e.source);
    
    // Simple PageRank approximation
    let rank = 0.15; // Base rank
    
    incomingNodes.forEach(sourceId => {
      const sourceNode = nodes.find(n => n.id === sourceId);
      if (sourceNode) {
        const sourceOutDegree = edges.filter(e => e.source === sourceId).length;
        rank += 0.85 * (1 / Math.max(sourceOutDegree, 1));
      }
    });

    return Math.min(rank, 2);
  }

  /**
   * Adaptive frame rate control
   */
  adaptiveFrameRate(nodeCount, edgeCount) {
    let targetFPS = 60;

    if (nodeCount > 1000 || edgeCount > 2000) {
      targetFPS = 30;
    }
    if (nodeCount > 2000 || edgeCount > 5000) {
      targetFPS = 15;
    }
    if (nodeCount > 5000 || edgeCount > 10000) {
      targetFPS = 10;
    }

    return {
      targetFPS,
      frameDelay: 1000 / targetFPS,
      shouldThrottle: targetFPS < 60
    };
  }

  /**
   * Batch DOM updates for better performance
   */
  batchDOMUpdates(updates) {
    return new Promise(resolve => {
      requestAnimationFrame(() => {
        // Group updates by type
        const groupedUpdates = {
          attributes: [],
          styles: [],
          classes: []
        };

        updates.forEach(update => {
          groupedUpdates[update.type].push(update);
        });

        // Apply updates in batches
        Object.values(groupedUpdates).forEach(updateGroup => {
          updateGroup.forEach(update => {
            try {
              update.apply();
            } catch (error) {
              console.warn('DOM update failed:', error);
            }
          });
        });

        resolve();
      });
    });
  }

  /**
   * Performance monitoring
   */
  startPerformanceMonitoring() {
    const startTime = performance.now();
    let frameCount = 0;
    
    const monitor = () => {
      frameCount++;
      const currentTime = performance.now();
      const elapsed = currentTime - startTime;
      
      if (elapsed >= 1000) { // Every second
        const fps = frameCount / (elapsed / 1000);
        
        // Log performance metrics
        console.log('Visualization Performance:', {
          fps: Math.round(fps),
          renderTime: elapsed / frameCount,
          cacheSize: this.renderCache.size,
          viewport: this.viewport
        });
        
        // Reset counters
        frameCount = 0;
      }
      
      requestAnimationFrame(monitor);
    };
    
    requestAnimationFrame(monitor);
  }

  /**
   * Get optimization recommendations
   */
  getOptimizationRecommendations(nodeCount, edgeCount, performance) {
    const recommendations = [];

    if (nodeCount > 500) {
      recommendations.push({
        type: 'clustering',
        message: 'Large graph detected - enable clustering for better performance',
        action: 'Enable clustering in visualization settings'
      });
    }

    if (edgeCount > 1000) {
      recommendations.push({
        type: 'edge-bundling',
        message: 'Many edges detected - enable edge bundling',
        action: 'Enable edge bundling to reduce visual complexity'
      });
    }

    if (performance.fps < 30) {
      recommendations.push({
        type: 'lod',
        message: 'Low frame rate detected - reduce detail level',
        action: 'Lower the level-of-detail settings'
      });
    }

    return recommendations;
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.frameRequestId) {
      cancelAnimationFrame(this.frameRequestId);
    }
    
    this.renderCache.clear();
  }
}

export default new PerformanceOptimizer();
