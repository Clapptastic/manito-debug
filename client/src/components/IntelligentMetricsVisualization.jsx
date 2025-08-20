/**
 * Intelligent Metrics Visualization Component
 * Data visualization best practices for AI and non-developer understanding
 * Information architecture optimized for intuitive comprehension
 */

import React, { useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import {
  BarChart3,
  PieChart,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Shield,
  Target,
  Info,
  Download,
  RefreshCw
} from 'lucide-react';

const IntelligentMetricsVisualization = ({ 
  metricsData, 
  ckgStats, 
  viewMode = 'dashboard',
  onMetricClick 
}) => {
  const [selectedMetrics, setSelectedMetrics] = useState(new Set());
  const [hoveredMetric, setHoveredMetric] = useState(null);
  const [chartType, setChartType] = useState('radar');
  const [timeRange, setTimeRange] = useState('7d');
  const [interactionMode, setInteractionMode] = useState('explore');

  // Enhanced data normalization with validation
  const normalizedMetrics = useMemo(() => {
    if (!metricsData) {
      return {
        complexity: 0, coupling: 0, cohesion: 0, testCoverage: 0,
        dependencies: 0, technicalDebt: 0, buildTime: 0, bundleSize: 0,
        totalFiles: 0, totalLines: 0, conflicts: 0
      };
    }
    
    // Handle case where metricsData is a files object (from scan results)
    if (metricsData && typeof metricsData === 'object' && !Array.isArray(metricsData)) {
      // Check if this is a files object (has file paths as keys)
      const keys = Object.keys(metricsData);
      if (keys.length > 0 && keys[0].includes('/')) {
        // This is a files object, extract metrics from it
        const files = Object.values(metricsData);
        const totalFiles = files.length;
        const totalLines = files.reduce((sum, file) => sum + (file.lines || 0), 0);
        const complexity = files.reduce((sum, file) => sum + (file.complexity || 0), 0) / totalFiles || 0;
        const dependencies = files.reduce((sum, file) => sum + (file.dependencies?.length || 0), 0);
        
        return {
          complexity: Math.round(complexity * 100) / 100,
          coupling: dependencies / totalFiles || 0,
          cohesion: 0, // Would need more analysis
          testCoverage: 0, // Would need test analysis
          dependencies: dependencies,
          technicalDebt: files.filter(f => f.complexity > 10).length,
          buildTime: 0,
          bundleSize: totalLines,
          totalFiles: totalFiles,
          totalLines: totalLines,
          conflicts: 0
        };
      }
      
      // This is a metrics object
      return {
        complexity: metricsData.complexity || metricsData.avgComplexity || 0,
        coupling: metricsData.coupling || metricsData.dependencies || 0,
        cohesion: metricsData.cohesion || 0,
        testCoverage: metricsData.testCoverage || 0,
        dependencies: metricsData.dependencies || 0,
        technicalDebt: metricsData.technicalDebt || metricsData.conflicts || 0,
        buildTime: metricsData.buildTime || 0,
        bundleSize: metricsData.bundleSize || 0,
        totalFiles: metricsData.totalFiles || 0,
        totalLines: metricsData.totalLines || 0,
        conflicts: metricsData.conflicts || 0
      };
    }
    return metricsData;
  }, [metricsData]);

  // Enhanced overall health calculation
  const calculateOverallHealth = useCallback(() => {
    const metrics = normalizedMetrics;
    let score = 100;
    
    // Complexity penalty (0-30 points)
    if (metrics.complexity > 10) {
      score -= Math.min(30, (metrics.complexity - 10) * 3);
    }
    
    // Technical debt penalty (0-25 points)
    if (metrics.technicalDebt > 5) {
      score -= Math.min(25, (metrics.technicalDebt - 5) * 5);
    }
    
    // Test coverage bonus/penalty (-10 to +15 points)
    if (metrics.testCoverage < 50) {
      score -= Math.min(10, (50 - metrics.testCoverage) * 0.2);
    } else if (metrics.testCoverage > 80) {
      score += Math.min(15, (metrics.testCoverage - 80) * 0.75);
    }
    
    // Dependencies penalty (0-20 points)
    if (metrics.dependencies > 20) {
      score -= Math.min(20, (metrics.dependencies - 20) * 0.5);
    }
    
    return {
      score: Math.max(0, Math.min(100, Math.round(score))),
      complexity: metrics.complexity,
      technicalDebt: metrics.technicalDebt,
      testCoverage: metrics.testCoverage,
      dependencies: metrics.dependencies
    };
  }, [normalizedMetrics]);

  const healthData = useMemo(() => calculateOverallHealth(), [calculateOverallHealth]);

  // Advanced chart configurations
  const chartConfigs = useMemo(() => ({
    radar: {
      width: 400,
      height: 400,
      margin: { top: 40, right: 40, bottom: 40, left: 40 },
      colors: d3.scaleOrdinal(d3.schemeCategory10),
      animationDuration: 1000
    },
    treemap: {
      width: 600,
      height: 400,
      margin: { top: 20, right: 20, bottom: 20, left: 20 },
      colors: d3.scaleSequential(d3.interpolateViridis),
      animationDuration: 800
    },
    heatmap: {
      width: 500,
      height: 300,
      margin: { top: 30, right: 30, bottom: 30, left: 30 },
      colors: d3.scaleSequential(d3.interpolateReds),
      animationDuration: 600
    },
    timeline: {
      width: 700,
      height: 200,
      margin: { top: 20, right: 20, bottom: 30, left: 40 },
      colors: d3.scaleOrdinal(d3.schemeSet2),
      animationDuration: 1200
    },
    network: {
      width: 600,
      height: 400,
      margin: { top: 20, right: 20, bottom: 20, left: 20 },
      colors: d3.scaleOrdinal(d3.schemeCategory10),
      animationDuration: 1000
    }
  }), []);

  // Enhanced metric categories with weights and thresholds
  const metricCategories = useMemo(() => [
    {
      name: 'Code Quality',
      metrics: [
        { key: 'complexity', label: 'Complexity', weight: 0.3, threshold: 10, unit: '' },
        { key: 'technicalDebt', label: 'Technical Debt', weight: 0.25, threshold: 5, unit: 'issues' },
        { key: 'testCoverage', label: 'Test Coverage', weight: 0.25, threshold: 80, unit: '%', inverse: true },
        { key: 'cohesion', label: 'Cohesion', weight: 0.2, threshold: 7, unit: '', inverse: true }
      ],
      color: '#3498db'
    },
    {
      name: 'Architecture',
      metrics: [
        { key: 'coupling', label: 'Coupling', weight: 0.4, threshold: 15, unit: '' },
        { key: 'dependencies', label: 'Dependencies', weight: 0.35, threshold: 20, unit: '' },
        { key: 'conflicts', label: 'Conflicts', weight: 0.25, threshold: 3, unit: '' }
      ],
      color: '#e74c3c'
    },
    {
      name: 'Performance',
      metrics: [
        { key: 'buildTime', label: 'Build Time', weight: 0.5, threshold: 60, unit: 's' },
        { key: 'bundleSize', label: 'Bundle Size', weight: 0.5, threshold: 1000, unit: 'KB' }
      ],
      color: '#f39c12'
    },
    {
      name: 'Scale',
      metrics: [
        { key: 'totalFiles', label: 'Total Files', weight: 0.5, threshold: 100, unit: '' },
        { key: 'totalLines', label: 'Total Lines', weight: 0.5, threshold: 10000, unit: '' }
      ],
      color: '#27ae60'
    }
  ], []);

  // Advanced visualization components
  const renderRadarChart = useCallback(() => {
    const config = chartConfigs.radar;
    const svgRef = React.useRef();
    
    React.useEffect(() => {
      if (!svgRef.current) return;
      
      const svg = d3.select(svgRef.current);
      svg.selectAll('*').remove();
      
      const width = config.width - config.margin.left - config.margin.right;
      const height = config.height - config.margin.top - config.margin.bottom;
      const radius = Math.min(width, height) / 2;
      
      const g = svg.append('g')
        .attr('transform', `translate(${config.width / 2}, ${config.height / 2})`);
      
      // Create scales
      const angleScale = d3.scalePoint()
        .domain(metricCategories.map(cat => cat.name))
        .range([0, 2 * Math.PI]);
      
      const radiusScale = d3.scaleLinear()
        .domain([0, 100])
        .range([0, radius]);
      
      // Draw axes
      metricCategories.forEach((category, i) => {
        const angle = angleScale(category.name) - Math.PI / 2;
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);
        
        g.append('line')
          .attr('x1', 0)
          .attr('y1', 0)
          .attr('x2', x)
          .attr('y2', y)
          .attr('stroke', '#ddd')
          .attr('stroke-width', 1);
        
        g.append('text')
          .attr('x', (radius + 20) * Math.cos(angle))
          .attr('y', (radius + 20) * Math.sin(angle))
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .text(category.name)
          .style('font-size', '12px')
          .style('fill', '#666');
      });
      
      // Draw circles
      [20, 40, 60, 80, 100].forEach(value => {
        g.append('circle')
          .attr('cx', 0)
          .attr('cy', 0)
          .attr('r', radiusScale(value))
          .attr('fill', 'none')
          .attr('stroke', '#eee')
          .attr('stroke-width', 1);
      });
      
      // Calculate category scores
      const categoryScores = metricCategories.map(category => {
        const score = category.metrics.reduce((sum, metric) => {
          const value = normalizedMetrics[metric.key] || 0;
          const normalizedValue = Math.min(100, (value / metric.threshold) * 100);
          return sum + (normalizedValue * metric.weight);
        }, 0);
        return { name: category.name, score, color: category.color };
      });
      
      // Draw data polygon
      const line = d3.lineRadial()
        .angle(d => angleScale(d.name) - Math.PI / 2)
        .radius(d => radiusScale(d.score));
      
      g.append('path')
        .datum(categoryScores)
        .attr('d', line)
        .attr('fill', 'rgba(52, 152, 219, 0.2)')
        .attr('stroke', '#3498db')
        .attr('stroke-width', 2);
      
      // Draw data points
      g.selectAll('.data-point')
        .data(categoryScores)
        .enter()
        .append('circle')
        .attr('class', 'data-point')
        .attr('cx', d => radiusScale(d.score) * Math.cos(angleScale(d.name) - Math.PI / 2))
        .attr('cy', d => radiusScale(d.score) * Math.sin(angleScale(d.name) - Math.PI / 2))
        .attr('r', 4)
        .attr('fill', d => d.color)
        .attr('stroke', 'white')
        .attr('stroke-width', 2)
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
          setHoveredMetric(d);
          d3.select(this).attr('r', 6);
        })
        .on('mouseout', function() {
          setHoveredMetric(null);
          d3.select(this).attr('r', 4);
        })
        .on('click', () => onMetricClick?.(d.name, d.score, 'radar'));
      
    }, [normalizedMetrics, chartConfigs.radar, metricCategories, onMetricClick]);
    
    return (
      <svg
        ref={svgRef}
        width={config.width}
        height={config.height}
        className="radar-chart"
      />
    );
  }, [normalizedMetrics, chartConfigs.radar, metricCategories, onMetricClick]);

  const renderTreemap = useCallback(() => {
    const config = chartConfigs.treemap;
    const svgRef = React.useRef();
    
    React.useEffect(() => {
      if (!svgRef.current) return;
      
      const svg = d3.select(svgRef.current);
      svg.selectAll('*').remove();
      
      const width = config.width - config.margin.left - config.margin.right;
      const height = config.height - config.margin.top - config.margin.bottom;
      
      const g = svg.append('g')
        .attr('transform', `translate(${config.margin.left}, ${config.margin.top})`);
      
      // Prepare data for treemap
      const treemapData = {
        name: 'metrics',
        children: metricCategories.map(category => ({
          name: category.name,
          children: category.metrics.map(metric => ({
            name: metric.label,
            value: normalizedMetrics[metric.key] || 0,
            threshold: metric.threshold,
            unit: metric.unit,
            color: category.color
          }))
        }))
      };
      
      const treemap = d3.treemap()
        .size([width, height])
        .padding(2);
      
      const root = d3.hierarchy(treemapData)
        .sum(d => d.value)
        .sort((a, b) => b.value - a.value);
      
      treemap(root);
      
      // Draw rectangles
      const nodes = g.selectAll('.node')
        .data(root.leaves())
        .enter()
        .append('g')
        .attr('class', 'node')
        .attr('transform', d => `translate(${d.x0}, ${d.y0})`);
      
      nodes.append('rect')
        .attr('width', d => d.x1 - d.x0)
        .attr('height', d => d.y1 - d.y0)
        .attr('fill', d => config.colors(d.value))
        .attr('stroke', '#fff')
        .attr('stroke-width', 1)
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
          setHoveredMetric(d.data);
          d3.select(this).attr('stroke-width', 3);
        })
        .on('mouseout', function() {
          setHoveredMetric(null);
          d3.select(this).attr('stroke-width', 1);
        })
        .on('click', () => onMetricClick?.(d.data.name, d.data.value, 'treemap'));
      
      // Add labels
      nodes.append('text')
        .attr('x', 3)
        .attr('y', 15)
        .text(d => d.data.name)
        .style('font-size', '10px')
        .style('fill', '#fff')
        .style('pointer-events', 'none');
      
      nodes.append('text')
        .attr('x', 3)
        .attr('y', 28)
        .text(d => `${d.data.value}${d.data.unit}`)
        .style('font-size', '8px')
        .style('fill', '#fff')
        .style('pointer-events', 'none');
      
    }, [normalizedMetrics, chartConfigs.treemap, metricCategories, onMetricClick]);
    
    return (
      <svg
        ref={svgRef}
        width={config.width}
        height={config.height}
        className="treemap-chart"
      />
    );
  }, [normalizedMetrics, chartConfigs.treemap, metricCategories, onMetricClick]);

  const renderHeatmap = useCallback(() => {
    const config = chartConfigs.heatmap;
    const svgRef = React.useRef();
    
    React.useEffect(() => {
      if (!svgRef.current) return;
      
      const svg = d3.select(svgRef.current);
      svg.selectAll('*').remove();
      
      const width = config.width - config.margin.left - config.margin.right;
      const height = config.height - config.margin.top - config.margin.bottom;
      
      const g = svg.append('g')
        .attr('transform', `translate(${config.margin.left}, ${config.margin.top})`);
      
      // Prepare heatmap data
      const heatmapData = metricCategories.flatMap((category, i) =>
        category.metrics.map((metric, j) => ({
          category: category.name,
          metric: metric.label,
          value: normalizedMetrics[metric.key] || 0,
          threshold: metric.threshold,
          x: i,
          y: j
        }))
      );
      
      const xScale = d3.scaleBand()
        .domain(metricCategories.map(cat => cat.name))
        .range([0, width])
        .padding(0.1);
      
      const yScale = d3.scaleBand()
        .domain(metricCategories.flatMap(cat => cat.metrics.map(m => m.label)))
        .range([0, height])
        .padding(0.1);
      
      const colorScale = config.colors.domain([0, 100]);
      
      // Draw heatmap cells
      g.selectAll('.heatmap-cell')
        .data(heatmapData)
        .enter()
        .append('rect')
        .attr('class', 'heatmap-cell')
        .attr('x', d => xScale(d.category))
        .attr('y', d => yScale(d.metric))
        .attr('width', xScale.bandwidth())
        .attr('height', yScale.bandwidth())
        .attr('fill', d => colorScale(Math.min(100, (d.value / d.threshold) * 100)))
        .attr('stroke', '#fff')
        .attr('stroke-width', 1)
        .style('cursor', 'pointer')
        .on('mouseover', function(event, d) {
          setHoveredMetric(d);
          d3.select(this).attr('stroke-width', 3);
        })
        .on('mouseout', function() {
          setHoveredMetric(null);
          d3.select(this).attr('stroke-width', 1);
        })
        .on('click', () => onMetricClick?.(d.metric, d.value, 'heatmap'));
      
      // Add axis labels
      g.append('g')
        .attr('transform', `translate(0, ${height})`)
        .call(d3.axisBottom(xScale))
        .selectAll('text')
        .style('text-anchor', 'end')
        .attr('dx', '-.8em')
        .attr('dy', '.15em')
        .attr('transform', 'rotate(-45)');
      
      g.append('g')
        .call(d3.axisLeft(yScale));
      
    }, [normalizedMetrics, chartConfigs.heatmap, metricCategories, onMetricClick]);
    
    return (
      <svg
        ref={svgRef}
        width={config.width}
        height={config.height}
        className="heatmap-chart"
      />
    );
  }, [normalizedMetrics, chartConfigs.heatmap, metricCategories, onMetricClick]);

  const renderTimeline = useCallback(() => {
    const config = chartConfigs.timeline;
    const svgRef = React.useRef();
    
    React.useEffect(() => {
      if (!svgRef.current) return;
      
      const svg = d3.select(svgRef.current);
      svg.selectAll('*').remove();
      
      const width = config.width - config.margin.left - config.margin.right;
      const height = config.height - config.margin.top - config.margin.bottom;
      
      const g = svg.append('g')
        .attr('transform', `translate(${config.margin.left}, ${config.margin.top})`);
      
      // Generate mock timeline data (in real app, this would come from historical data)
      const timelineData = metricCategories.map((category, i) => ({
        category: category.name,
        values: Array.from({ length: 10 }, (_, j) => ({
          time: j,
          value: Math.random() * 100,
          threshold: category.metrics[0]?.threshold || 50
        }))
      }));
      
      const xScale = d3.scaleLinear()
        .domain([0, 9])
        .range([0, width]);
      
      const yScale = d3.scaleLinear()
        .domain([0, 100])
        .range([height, 0]);
      
      const line = d3.line()
        .x(d => xScale(d.time))
        .y(d => yScale(d.value));
      
      // Draw lines for each category
      timelineData.forEach((category, i) => {
        g.append('path')
          .datum(category.values)
          .attr('d', line)
          .attr('fill', 'none')
          .attr('stroke', config.colors(i))
          .attr('stroke-width', 2)
          .style('cursor', 'pointer')
          .on('mouseover', function() {
            setHoveredMetric(category);
            d3.select(this).attr('stroke-width', 4);
          })
          .on('mouseout', function() {
            setHoveredMetric(null);
            d3.select(this).attr('stroke-width', 2);
          })
          .on('click', () => onMetricClick?.(category.category, category.values[category.values.length - 1].value, 'timeline'));
      });
      
      // Add axes
      g.append('g')
        .attr('transform', `translate(0, ${height})`)
        .call(d3.axisBottom(xScale).ticks(10));
      
      g.append('g')
        .call(d3.axisLeft(yScale).ticks(5));
      
    }, [chartConfigs.timeline, metricCategories, onMetricClick]);
    
    return (
      <svg
        ref={svgRef}
        width={config.width}
        height={config.height}
        className="timeline-chart"
      />
    );
  }, [chartConfigs.timeline, metricCategories, onMetricClick]);

  const renderNetworkGraph = useCallback(() => {
    const config = chartConfigs.network;
    const svgRef = React.useRef();
    
    React.useEffect(() => {
      if (!svgRef.current) return;
      
      const svg = d3.select(svgRef.current);
      svg.selectAll('*').remove();
      
      const width = config.width - config.margin.left - config.margin.right;
      const height = config.height - config.margin.top - config.margin.bottom;
      
      const g = svg.append('g')
        .attr('transform', `translate(${config.margin.left}, ${config.margin.top})`);
      
      // Generate network data based on metrics relationships
      const nodes = metricCategories.map((category, i) => ({
        id: category.name,
        group: i,
        value: category.metrics.reduce((sum, metric) => sum + (normalizedMetrics[metric.key] || 0), 0) / category.metrics.length
      }));
      
      const links = [];
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          if (Math.random() > 0.5) {
            links.push({
              source: nodes[i].id,
              target: nodes[j].id,
              value: Math.random() * 10
            });
          }
        }
      }
      
      const simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(100))
        .force('charge', d3.forceManyBody().strength(-300))
        .force('center', d3.forceCenter(width / 2, height / 2));
      
      // Draw links
      const link = g.append('g')
        .selectAll('line')
        .data(links)
        .enter()
        .append('line')
        .attr('stroke', '#999')
        .attr('stroke-opacity', 0.6)
        .attr('stroke-width', d => Math.sqrt(d.value));
      
      // Draw nodes
      const node = g.append('g')
        .selectAll('circle')
        .data(nodes)
        .enter()
        .append('circle')
        .attr('r', d => Math.sqrt(d.value) + 5)
        .attr('fill', d => config.colors(d.group))
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)
        .style('cursor', 'pointer')
        .call(d3.drag()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended))
        .on('mouseover', function(event, d) {
          setHoveredMetric(d);
          d3.select(this).attr('stroke-width', 4);
        })
        .on('mouseout', function() {
          setHoveredMetric(null);
          d3.select(this).attr('stroke-width', 2);
        })
        .on('click', () => onMetricClick?.(d.id, d.value, 'network'));
      
      // Add labels
      const label = g.append('g')
        .selectAll('text')
        .data(nodes)
        .enter()
        .append('text')
        .text(d => d.id)
        .attr('text-anchor', 'middle')
        .attr('dy', '.35em')
        .style('font-size', '10px')
        .style('pointer-events', 'none');
      
      // Update positions on simulation tick
      simulation.on('tick', () => {
        link
          .attr('x1', d => d.source.x)
          .attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x)
          .attr('y2', d => d.target.y);
        
        node
          .attr('cx', d => d.x)
          .attr('cy', d => d.y);
        
        label
          .attr('x', d => d.x)
          .attr('y', d => d.y);
      });
      
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
      
      return () => simulation.stop();
    }, [normalizedMetrics, chartConfigs.network, metricCategories, onMetricClick]);
    
    return (
      <svg
        ref={svgRef}
        width={config.width}
        height={config.height}
        className="network-chart"
      />
    );
  }, [normalizedMetrics, chartConfigs.network, metricCategories, onMetricClick]);

  // Chart renderer based on selected type
  const renderChart = useCallback(() => {
    switch (chartType) {
      case 'radar':
        return renderRadarChart();
      case 'treemap':
        return renderTreemap();
      case 'heatmap':
        return renderHeatmap();
      case 'timeline':
        return renderTimeline();
      case 'network':
        return renderNetworkGraph();
      default:
        return renderRadarChart();
    }
  }, [chartType, renderRadarChart, renderTreemap, renderHeatmap, renderTimeline, renderNetworkGraph]);

  // Enhanced health score display
  const getHealthColor = useCallback((score) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  }, []);

  const getHealthIcon = useCallback((score) => {
    if (score >= 80) return '🟢';
    if (score >= 60) return '🟡';
    if (score >= 40) return '🟠';
    return '🔴';
  }, []);

  // Fallback UI for when no metrics data is available
  if (!metricsData) {
    return (
      <div className="h-full bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-semibold text-gray-300 mb-2">No Metrics Available</h3>
          <p className="text-gray-500">Run a code scan to see detailed metrics and visualizations</p>
        </div>
      </div>
    );
  }

  return (
    <div className="intelligent-metrics-visualization bg-gray-950 text-white p-6 rounded-lg">
      {/* Enhanced Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Intelligent Metrics Dashboard</h2>
          <p className="text-gray-400">Advanced code analysis and visualization</p>
        </div>
        
        {/* Health Score Display */}
        <div className="text-right">
          <div className={`text-3xl font-bold ${getHealthColor(healthData.score)}`}>
            {getHealthIcon(healthData.score)} {healthData.score}
          </div>
          <div className="text-sm text-gray-400">Overall Health Score</div>
        </div>
      </div>

      {/* Enhanced Controls */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-300">Chart Type:</label>
          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value)}
            className="bg-gray-800 border border-gray-600 rounded px-3 py-1 text-sm text-white"
          >
            <option value="radar">Radar Chart</option>
            <option value="treemap">Treemap</option>
            <option value="heatmap">Heatmap</option>
            <option value="timeline">Timeline</option>
            <option value="network">Network Graph</option>
          </select>
        </div>
        
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-300">Time Range:</label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-gray-800 border border-gray-600 rounded px-3 py-1 text-sm text-white"
          >
            <option value="1d">Last 24h</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>
        
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-300">Mode:</label>
          <select
            value={interactionMode}
            onChange={(e) => setInteractionMode(e.target.value)}
            className="bg-gray-800 border border-gray-600 rounded px-3 py-1 text-sm text-white"
          >
            <option value="explore">Explore</option>
            <option value="analyze">Analyze</option>
            <option value="compare">Compare</option>
          </select>
        </div>
      </div>

      {/* Main Chart Area */}
      <div className="flex justify-center mb-6">
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
          {renderChart()}
        </div>
      </div>

      {/* Enhanced Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCategories.map((category) => (
          <div
            key={category.name}
            className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-500 transition-colors cursor-pointer"
            onClick={() => onMetricClick?.(category.name, category.metrics.reduce((sum, m) => sum + (normalizedMetrics[m.key] || 0), 0), 'category')}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-white">{category.name}</h3>
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }}></div>
            </div>
            
            <div className="space-y-2">
              {category.metrics.map((metric) => {
                const value = normalizedMetrics[metric.key] || 0;
                const isOverThreshold = value > metric.threshold;
                
                return (
                  <div key={metric.key} className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">{metric.label}:</span>
                    <span className={`text-sm font-medium ${isOverThreshold ? 'text-red-400' : 'text-green-400'}`}>
                      {value}{metric.unit}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Hover Tooltip */}
      {hoveredMetric && (
        <div className="fixed bg-gray-800 border border-gray-600 rounded-lg p-3 text-sm shadow-lg z-50 pointer-events-none">
          <div className="font-semibold text-white">{hoveredMetric.name || hoveredMetric.category}</div>
          <div className="text-gray-400">
            {hoveredMetric.value !== undefined && `Value: ${hoveredMetric.value}`}
            {hoveredMetric.score !== undefined && `Score: ${hoveredMetric.score.toFixed(1)}`}
          </div>
        </div>
      )}
    </div>
  );
};

export default IntelligentMetricsVisualization;
