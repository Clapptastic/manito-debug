/**
 * Intelligent Metrics Visualization Component
 * Data visualization best practices for AI and non-developer understanding
 * Information architecture optimized for intuitive comprehension
 */

import React, { useEffect, useRef, useState } from 'react';
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
  onMetricClick,
  viewMode = 'dashboard' // dashboard, detailed, comparison
}) => {
  const containerRef = useRef();
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [timeRange, setTimeRange] = useState('current');
  const [comparisonMode, setComparisonMode] = useState(false);

  // Information Architecture: Semantic grouping of metrics
  const metricCategories = {
    codeHealth: {
      title: 'Code Health',
      icon: Shield,
      color: '#059669',
      description: 'Overall quality and maintainability',
      metrics: ['complexity', 'coupling', 'cohesion', 'testCoverage']
    },
    architecture: {
      title: 'Architecture',
      icon: Target,
      color: '#2563eb',
      description: 'Structural organization and design',
      metrics: ['dependencies', 'layering', 'modularity', 'abstractions']
    },
    performance: {
      title: 'Performance',
      icon: Zap,
      color: '#dc2626',
      description: 'Speed and efficiency indicators',
      metrics: ['buildTime', 'bundleSize', 'loadTime', 'memoryUsage']
    },
    maintenance: {
      title: 'Maintenance',
      icon: Clock,
      color: '#7c3aed',
      description: 'Long-term sustainability metrics',
      metrics: ['technicalDebt', 'documentation', 'updateFrequency', 'bugRate']
    }
  };

  // Data visualization best practices: Clear value interpretation
  const metricDefinitions = {
    complexity: {
      name: 'Code Complexity',
      unit: 'score',
      goodRange: [0, 10],
      warningRange: [10, 20],
      criticalRange: [20, Infinity],
      interpretation: {
        low: 'Easy to understand and modify',
        medium: 'Moderately complex, manageable',
        high: 'Complex, requires careful attention',
        critical: 'Very complex, high maintenance risk'
      },
      aiContext: 'Measures how difficult code is to understand and modify'
    },
    coupling: {
      name: 'Code Coupling',
      unit: 'connections',
      goodRange: [0, 5],
      warningRange: [5, 15],
      criticalRange: [15, Infinity],
      interpretation: {
        low: 'Well-isolated, independent modules',
        medium: 'Some interdependencies, acceptable',
        high: 'Tightly coupled, changes affect many files',
        critical: 'Extremely coupled, high change risk'
      },
      aiContext: 'Measures how interconnected different parts of code are'
    },
    testCoverage: {
      name: 'Test Coverage',
      unit: 'percentage',
      goodRange: [80, 100],
      warningRange: [60, 80],
      criticalRange: [0, 60],
      interpretation: {
        high: 'Excellent test protection',
        medium: 'Good test coverage',
        low: 'Limited test protection',
        critical: 'Insufficient testing, high risk'
      },
      aiContext: 'Percentage of code protected by automated tests'
    },
    technicalDebt: {
      name: 'Technical Debt',
      unit: 'issues',
      goodRange: [0, 10],
      warningRange: [10, 50],
      criticalRange: [50, Infinity],
      interpretation: {
        low: 'Clean, well-maintained codebase',
        medium: 'Some technical debt, manageable',
        high: 'Significant debt, needs attention',
        critical: 'Critical debt, major refactoring needed'
      },
      aiContext: 'Accumulated shortcuts and issues that need fixing'
    }
  };

  useEffect(() => {
    if (metricsData && containerRef.current) {
      renderIntelligentDashboard();
    }
  }, [metricsData, ckgStats, viewMode, timeRange]);

  const renderIntelligentDashboard = () => {
    const container = d3.select(containerRef.current);
    container.selectAll('*').remove();

    // Create responsive grid layout
    const containerRect = containerRef.current.getBoundingClientRect();
    const width = containerRect.width;
    const height = containerRect.height;

    // Render based on view mode
    switch (viewMode) {
      case 'dashboard':
        renderDashboardView(container, width, height);
        break;
      case 'detailed':
        renderDetailedView(container, width, height);
        break;
      case 'comparison':
        renderComparisonView(container, width, height);
        break;
    }
  };

  const renderDashboardView = (container, width, height) => {
    // Create main dashboard grid
    const dashboard = container
      .append('div')
      .attr('class', 'metrics-dashboard')
      .style('width', '100%')
      .style('height', '100%')
      .style('display', 'grid')
      .style('grid-template-columns', 'repeat(auto-fit, minmax(300px, 1fr))')
      .style('grid-gap', '20px')
      .style('padding', '20px')
      .style('background', 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)');

    // Render metric categories
    Object.entries(metricCategories).forEach(([categoryKey, category]) => {
      renderMetricCategory(dashboard, category, categoryKey);
    });

    // Add overall health indicator
    renderHealthIndicator(dashboard);
  };

  const renderMetricCategory = (parent, category, categoryKey) => {
    const categoryCard = parent
      .append('div')
      .attr('class', 'metric-category')
      .style('background', 'white')
      .style('border-radius', '12px')
      .style('box-shadow', '0 4px 6px -1px rgba(0, 0, 0, 0.1)')
      .style('padding', '20px')
      .style('border', '1px solid #e5e7eb');

    // Category header
    const header = categoryCard
      .append('div')
      .style('display', 'flex')
      .style('align-items', 'center')
      .style('margin-bottom', '16px');

    header
      .append('div')
      .style('width', '40px')
      .style('height', '40px')
      .style('border-radius', '8px')
      .style('background', category.color)
      .style('display', 'flex')
      .style('align-items', 'center')
      .style('justify-content', 'center')
      .style('margin-right', '12px')
      .html(`<svg width="20" height="20" fill="white"><use href="#${category.icon.name}"/></svg>`);

    const headerText = header.append('div');
    headerText
      .append('h3')
      .text(category.title)
      .style('font-size', '16px')
      .style('font-weight', '600')
      .style('color', '#1f2937')
      .style('margin', '0');

    headerText
      .append('p')
      .text(category.description)
      .style('font-size', '12px')
      .style('color', '#6b7280')
      .style('margin', '0');

    // Render metrics for this category
    const metricsContainer = categoryCard
      .append('div')
      .style('display', 'grid')
      .style('grid-template-columns', 'repeat(2, 1fr)')
      .style('grid-gap', '12px');

    category.metrics.forEach(metricKey => {
      renderMetricCard(metricsContainer, metricKey, categoryKey);
    });
  };

  const renderMetricCard = (parent, metricKey, categoryKey) => {
    const metric = metricDefinitions[metricKey];
    if (!metric) return;

    // Get metric value (mock data for now, would come from real metrics)
    const value = getMetricValue(metricKey);
    const status = getMetricStatus(value, metric);
    const trend = getMetricTrend(metricKey);

    const card = parent
      .append('div')
      .attr('class', 'metric-card')
      .style('background', '#f9fafb')
      .style('border', '1px solid #e5e7eb')
      .style('border-radius', '8px')
      .style('padding', '12px')
      .style('cursor', 'pointer')
      .style('transition', 'all 0.2s ease')
      .on('mouseover', function() {
        d3.select(this).style('transform', 'translateY(-2px)').style('box-shadow', '0 4px 12px rgba(0,0,0,0.15)');
      })
      .on('mouseout', function() {
        d3.select(this).style('transform', 'translateY(0)').style('box-shadow', 'none');
      })
      .on('click', () => {
        setSelectedMetric({ key: metricKey, category: categoryKey, value, status });
        if (onMetricClick) onMetricClick(metricKey, value, status);
      });

    // Metric header
    const header = card
      .append('div')
      .style('display', 'flex')
      .style('align-items', 'center')
      .style('justify-content', 'space-between')
      .style('margin-bottom', '8px');

    header
      .append('span')
      .text(metric.name)
      .style('font-size', '12px')
      .style('font-weight', '500')
      .style('color', '#374151');

    // Status indicator
    const statusIcon = getStatusIcon(status);
    header
      .append('span')
      .html(statusIcon.icon)
      .style('color', statusIcon.color);

    // Value display
    const valueContainer = card
      .append('div')
      .style('display', 'flex')
      .style('align-items', 'baseline')
      .style('margin-bottom', '4px');

    valueContainer
      .append('span')
      .text(formatMetricValue(value, metric.unit))
      .style('font-size', '20px')
      .style('font-weight', '700')
      .style('color', status === 'good' ? '#059669' : status === 'warning' ? '#d97706' : '#dc2626');

    valueContainer
      .append('span')
      .text(metric.unit)
      .style('font-size', '12px')
      .style('color', '#9ca3af')
      .style('margin-left', '4px');

    // Trend indicator
    if (trend) {
      const trendContainer = valueContainer
        .append('div')
        .style('margin-left', 'auto')
        .style('display', 'flex')
        .style('align-items', 'center');

      const TrendIcon = trend.direction === 'up' ? TrendingUp : TrendingDown;
      trendContainer
        .append('span')
        .html(`<svg width="12" height="12" fill="${trend.isGood ? '#059669' : '#dc2626'}"><use href="#${TrendIcon.name}"/></svg>`)
        .style('margin-right', '2px');

      trendContainer
        .append('span')
        .text(`${trend.percentage}%`)
        .style('font-size', '10px')
        .style('color', trend.isGood ? '#059669' : '#dc2626');
    }

    // Interpretation text for non-developers
    card
      .append('p')
      .text(getMetricInterpretation(value, metric, status))
      .style('font-size', '10px')
      .style('color', '#6b7280')
      .style('margin', '0')
      .style('line-height', '1.3');
  };

  const renderHealthIndicator = (parent) => {
    const healthCard = parent
      .append('div')
      .attr('class', 'health-indicator')
      .style('grid-column', '1 / -1')
      .style('background', 'white')
      .style('border-radius', '12px')
      .style('box-shadow', '0 4px 6px -1px rgba(0, 0, 0, 0.1)')
      .style('padding', '24px')
      .style('border', '1px solid #e5e7eb');

    const overallHealth = calculateOverallHealth();
    const healthColor = overallHealth.score >= 80 ? '#059669' : 
                       overallHealth.score >= 60 ? '#d97706' : '#dc2626';

    // Health header
    const header = healthCard
      .append('div')
      .style('display', 'flex')
      .style('align-items', 'center')
      .style('justify-content', 'space-between')
      .style('margin-bottom', '20px');

    const titleSection = header
      .append('div')
      .style('display', 'flex')
      .style('align-items', 'center');

    titleSection
      .append('div')
      .style('width', '48px')
      .style('height', '48px')
      .style('border-radius', '12px')
      .style('background', healthColor)
      .style('display', 'flex')
      .style('align-items', 'center')
      .style('justify-content', 'center')
      .style('margin-right', '16px')
      .html(`<svg width="24" height="24" fill="white"><use href="#${overallHealth.icon}"/></svg>`);

    const titleText = titleSection.append('div');
    titleText
      .append('h2')
      .text('Overall Code Health')
      .style('font-size', '20px')
      .style('font-weight', '700')
      .style('color', '#1f2937')
      .style('margin', '0');

    titleText
      .append('p')
      .text(overallHealth.interpretation)
      .style('font-size', '14px')
      .style('color', '#6b7280')
      .style('margin', '0');

    // Health score with visual progress
    const scoreSection = header.append('div').style('text-align', 'right');
    
    scoreSection
      .append('div')
      .text(`${overallHealth.score}%`)
      .style('font-size', '32px')
      .style('font-weight', '800')
      .style('color', healthColor);

    scoreSection
      .append('div')
      .text(overallHealth.grade)
      .style('font-size', '14px')
      .style('font-weight', '600')
      .style('color', healthColor);

    // Health breakdown with mini charts
    renderHealthBreakdown(healthCard, overallHealth);
  };

  const renderHealthBreakdown = (parent, healthData) => {
    const breakdown = parent
      .append('div')
      .style('display', 'grid')
      .style('grid-template-columns', 'repeat(4, 1fr)')
      .style('grid-gap', '16px');

    Object.entries(metricCategories).forEach(([key, category]) => {
      const categoryHealth = calculateCategoryHealth(key);
      
      const categoryCard = breakdown
        .append('div')
        .style('background', '#f9fafb')
        .style('border', '1px solid #e5e7eb')
        .style('border-radius', '8px')
        .style('padding', '16px')
        .style('text-align', 'center');

      // Category icon
      categoryCard
        .append('div')
        .style('color', category.color)
        .style('margin-bottom', '8px')
        .html(`<svg width="20" height="20" fill="currentColor"><use href="#${category.icon.name}"/></svg>`);

      // Category score
      categoryCard
        .append('div')
        .text(`${categoryHealth.score}%`)
        .style('font-size', '18px')
        .style('font-weight', '700')
        .style('color', categoryHealth.color);

      // Category name
      categoryCard
        .append('div')
        .text(category.title)
        .style('font-size', '12px')
        .style('color', '#6b7280')
        .style('font-weight', '500');

      // Mini progress bar
      const progressContainer = categoryCard
        .append('div')
        .style('width', '100%')
        .style('height', '4px')
        .style('background', '#e5e7eb')
        .style('border-radius', '2px')
        .style('margin-top', '8px');

      progressContainer
        .append('div')
        .style('width', `${categoryHealth.score}%`)
        .style('height', '100%')
        .style('background', categoryHealth.color)
        .style('border-radius', '2px')
        .style('transition', 'width 1s ease');
    });
  };

  // Helper functions for data interpretation
  const getMetricValue = (metricKey) => {
    // This would connect to real metrics data
    // For now, generating realistic sample data
    const sampleValues = {
      complexity: Math.random() * 25,
      coupling: Math.random() * 20,
      cohesion: 60 + Math.random() * 40,
      testCoverage: 40 + Math.random() * 60,
      dependencies: Math.random() * 50,
      technicalDebt: Math.random() * 30,
      buildTime: 30 + Math.random() * 120,
      bundleSize: 500 + Math.random() * 2000
    };

    return sampleValues[metricKey] || 0;
  };

  const getMetricStatus = (value, metric) => {
    if (value >= metric.goodRange[0] && value <= metric.goodRange[1]) return 'good';
    if (value >= metric.warningRange[0] && value <= metric.warningRange[1]) return 'warning';
    return 'critical';
  };

  const getMetricTrend = (metricKey) => {
    // Mock trend data - would come from historical analysis
    const trends = {
      complexity: { direction: 'down', percentage: 5, isGood: true },
      coupling: { direction: 'up', percentage: 8, isGood: false },
      testCoverage: { direction: 'up', percentage: 12, isGood: true },
      technicalDebt: { direction: 'down', percentage: 15, isGood: true }
    };

    return trends[metricKey] || null;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'good':
        return { icon: '✅', color: '#059669' };
      case 'warning':
        return { icon: '⚠️', color: '#d97706' };
      case 'critical':
        return { icon: '❌', color: '#dc2626' };
      default:
        return { icon: 'ℹ️', color: '#6b7280' };
    }
  };

  const formatMetricValue = (value, unit) => {
    if (unit === 'percentage') {
      return Math.round(value) + '%';
    }
    if (unit === 'score') {
      return Math.round(value * 10) / 10;
    }
    if (unit === 'connections') {
      return Math.round(value);
    }
    if (unit === 'issues') {
      return Math.round(value);
    }
    return Math.round(value);
  };

  const getMetricInterpretation = (value, metric, status) => {
    const level = status === 'good' ? 'low' : status === 'warning' ? 'medium' : 
                 status === 'critical' ? 'critical' : 'high';
    
    return metric.interpretation[level] || 'Needs attention';
  };

  const calculateOverallHealth = () => {
    // Calculate weighted health score
    const categoryScores = Object.keys(metricCategories).map(key => calculateCategoryHealth(key));
    const avgScore = categoryScores.reduce((sum, cat) => sum + cat.score, 0) / categoryScores.length;
    
    let grade, interpretation, icon;
    
    if (avgScore >= 85) {
      grade = 'A';
      interpretation = 'Excellent code health';
      icon = 'CheckCircle';
    } else if (avgScore >= 70) {
      grade = 'B';
      interpretation = 'Good code health';
      icon = 'CheckCircle';
    } else if (avgScore >= 55) {
      grade = 'C';
      interpretation = 'Fair code health';
      icon = 'AlertTriangle';
    } else {
      grade = 'D';
      interpretation = 'Poor code health';
      icon = 'AlertTriangle';
    }

    return {
      score: Math.round(avgScore),
      grade,
      interpretation,
      icon,
      categories: categoryScores
    };
  };

  const calculateCategoryHealth = (categoryKey) => {
    const category = metricCategories[categoryKey];
    const scores = category.metrics.map(metricKey => {
      const value = getMetricValue(metricKey);
      const metric = metricDefinitions[metricKey];
      const status = getMetricStatus(value, metric);
      
      return status === 'good' ? 100 : status === 'warning' ? 70 : 30;
    });

    const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const color = avgScore >= 80 ? '#059669' : avgScore >= 60 ? '#d97706' : '#dc2626';

    return {
      score: Math.round(avgScore),
      color,
      metrics: scores
    };
  };

  const renderDetailedView = (container, width, height) => {
    // Detailed view with charts and deep analysis
    const detailContainer = container
      .append('div')
      .style('width', '100%')
      .style('height', '100%')
      .style('padding', '20px')
      .style('background', 'white');

    // Add detailed charts here
    renderTrendChart(detailContainer, width / 2, height / 2);
    renderDistributionChart(detailContainer, width / 2, height / 2);
  };

  const renderTrendChart = (parent, width, height) => {
    const svg = parent
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    // Generate trend data
    const trendData = generateTrendData();
    
    // Create scales
    const xScale = d3.scaleTime()
      .domain(d3.extent(trendData, d => d.date))
      .range([50, width - 50]);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(trendData, d => d.value)])
      .range([height - 50, 50]);

    // Create line generator
    const line = d3.line()
      .x(d => xScale(d.date))
      .y(d => yScale(d.value))
      .curve(d3.curveCardinal);

    // Add axes
    svg.append('g')
      .attr('transform', `translate(0, ${height - 50})`)
      .call(d3.axisBottom(xScale).tickFormat(d3.timeFormat('%m/%d')));

    svg.append('g')
      .attr('transform', 'translate(50, 0)')
      .call(d3.axisLeft(yScale));

    // Add trend line
    svg.append('path')
      .datum(trendData)
      .attr('fill', 'none')
      .attr('stroke', '#2563eb')
      .attr('stroke-width', 3)
      .attr('d', line);

    // Add data points
    svg.selectAll('.data-point')
      .data(trendData)
      .enter().append('circle')
      .attr('class', 'data-point')
      .attr('cx', d => xScale(d.date))
      .attr('cy', d => yScale(d.value))
      .attr('r', 4)
      .attr('fill', '#2563eb')
      .attr('stroke', 'white')
      .attr('stroke-width', 2);
  };

  const generateTrendData = () => {
    const data = [];
    const now = new Date();
    
    for (let i = 30; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      data.push({
        date,
        value: 50 + Math.random() * 30 + Math.sin(i / 5) * 10
      });
    }
    
    return data;
  };

  return (
    <div className="h-full bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Intelligent Controls */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-gray-900">Code Intelligence Metrics</h2>
          
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Info className="w-4 h-4" />
            <span>Designed for both AI and human understanding</span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* View Mode */}
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
            className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="dashboard">Dashboard</option>
            <option value="detailed">Detailed Analysis</option>
            <option value="comparison">Comparison View</option>
          </select>

          {/* Time Range */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="current">Current</option>
            <option value="week">Past Week</option>
            <option value="month">Past Month</option>
            <option value="quarter">Past Quarter</option>
          </select>

          {/* Export */}
          <button className="p-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors">
            <Download className="w-4 h-4 text-gray-600" />
          </button>

          {/* Refresh */}
          <button className="p-2 bg-blue-100 hover:bg-blue-200 rounded-md transition-colors">
            <RefreshCw className="w-4 h-4 text-blue-600" />
          </button>
        </div>
      </div>

      {/* Metrics Visualization */}
      <div ref={containerRef} className="flex-1" />

      {/* AI Context Panel */}
      <div className="bg-blue-50 border-t border-blue-200 p-4">
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Zap className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-blue-900 mb-1">AI Interpretation</h3>
            <p className="text-sm text-blue-700">
              {generateAIInterpretation()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const generateAIInterpretation = () => {
    const health = calculateOverallHealth();
    
    if (health.score >= 85) {
      return "This codebase demonstrates excellent engineering practices with low complexity, good test coverage, and well-structured architecture. The code is maintainable and follows best practices.";
    } else if (health.score >= 70) {
      return "This codebase is in good condition with some areas for improvement. Focus on reducing complexity in highlighted areas and increasing test coverage where needed.";
    } else if (health.score >= 55) {
      return "This codebase shows moderate technical debt. Priority should be given to refactoring high-complexity areas and improving test coverage to ensure long-term maintainability.";
    } else {
      return "This codebase requires significant attention. High complexity and technical debt present risks to maintainability. Immediate refactoring and testing improvements are recommended.";
    }
  };
};

export default IntelligentMetricsVisualization;
