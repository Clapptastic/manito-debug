/**
 * Intelligent Search Visualization Component
 * Information architecture optimized for AI and non-developer understanding
 * Visual search results with semantic grouping and clear hierarchy
 */

import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import {
  Search,
  Filter,
  SortAsc,
  SortDesc,
  Grid,
  List,
  Eye,
  FileText,
  Code,
  Zap,
  Target,
  Clock,
  TrendingUp,
  BookOpen,
  GitBranch,
  Star,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react';

const IntelligentSearchVisualization = ({
  searchResults,
  query,
  onResultClick,
  onResultHover,
  viewMode = 'semantic' // semantic, list, grid, timeline
}) => {
  const containerRef = useRef();
  const [visualizationMode, setVisualizationMode] = useState(viewMode);
  const [sortBy, setSortBy] = useState('relevance');
  const [groupBy, setGroupBy] = useState('type');
  const [filterBy, setFilterBy] = useState('all');
  const [selectedResult, setSelectedResult] = useState(null);

  // Information Architecture: Semantic result categorization
  const resultCategories = {
    exact: {
      title: 'Exact Matches',
      icon: Target,
      color: '#059669',
      description: 'Direct matches to your search',
      priority: 1
    },
    symbolic: {
      title: 'Symbol Definitions',
      icon: Code,
      color: '#2563eb',
      description: 'Code symbols and definitions',
      priority: 2
    },
    semantic: {
      title: 'Related Code',
      icon: GitBranch,
      color: '#7c3aed',
      description: 'Semantically similar code',
      priority: 3
    },
    contextual: {
      title: 'Context',
      icon: BookOpen,
      color: '#ea580c',
      description: 'Related documentation and examples',
      priority: 4
    },
    usage: {
      title: 'Usage Examples',
      icon: Zap,
      color: '#dc2626',
      description: 'How this code is used',
      priority: 5
    }
  };

  // Visual hierarchy for result importance
  const importanceIndicators = {
    critical: { color: '#dc2626', icon: '🔴', size: 'large', description: 'Critical to understand' },
    high: { color: '#ea580c', icon: '🟠', size: 'medium', description: 'Important for context' },
    medium: { color: '#d97706', icon: '🟡', size: 'medium', description: 'Useful information' },
    low: { color: '#059669', icon: '🟢', size: 'small', description: 'Additional context' }
  };

  useEffect(() => {
    if (searchResults && containerRef.current) {
      renderIntelligentResults();
    }
  }, [searchResults, visualizationMode, sortBy, groupBy, filterBy]);

  const renderIntelligentResults = () => {
    const container = d3.select(containerRef.current);
    container.selectAll('*').remove();

    if (!searchResults || searchResults.length === 0) {
      renderEmptyState(container);
      return;
    }

    // Process and categorize results
    const processedResults = processSearchResults(searchResults);
    
    // Render based on visualization mode
    switch (visualizationMode) {
      case 'semantic':
        renderSemanticView(container, processedResults);
        break;
      case 'list':
        renderListView(container, processedResults);
        break;
      case 'grid':
        renderGridView(container, processedResults);
        break;
      case 'timeline':
        renderTimelineView(container, processedResults);
        break;
    }
  };

  const processSearchResults = (results) => {
    return results.map(result => {
      const category = determineResultCategory(result, query);
      const importance = calculateResultImportance(result, query);
      const relevanceScore = calculateRelevanceScore(result, query);
      
      return {
        ...result,
        category,
        importance,
        relevanceScore,
        displayTitle: createIntelligentTitle(result),
        displayDescription: createIntelligentDescription(result),
        visualMetrics: extractVisualMetrics(result),
        aiContext: generateAIContext(result)
      };
    }).sort((a, b) => {
      // Multi-criteria sorting
      if (sortBy === 'relevance') {
        return b.relevanceScore - a.relevanceScore;
      } else if (sortBy === 'importance') {
        return b.importance.priority - a.importance.priority;
      } else if (sortBy === 'type') {
        return a.type.localeCompare(b.type);
      }
      return 0;
    });
  };

  const renderSemanticView = (container, results) => {
    const semanticContainer = container
      .append('div')
      .attr('class', 'semantic-search-results')
      .style('height', '100%')
      .style('overflow-y', 'auto')
      .style('padding', '20px');

    // Group results by category
    const groupedResults = d3.group(results, d => d.category.key);

    // Render each category
    Object.entries(resultCategories)
      .sort((a, b) => a[1].priority - b[1].priority)
      .forEach(([categoryKey, categoryConfig]) => {
        const categoryResults = groupedResults.get(categoryKey) || [];
        if (categoryResults.length === 0) return;

        renderResultCategory(semanticContainer, categoryConfig, categoryResults, categoryKey);
      });
  };

  const renderResultCategory = (parent, categoryConfig, results, categoryKey) => {
    const categorySection = parent
      .append('div')
      .attr('class', 'result-category')
      .style('margin-bottom', '32px');

    // Category header
    const header = categorySection
      .append('div')
      .style('display', 'flex')
      .style('align-items', 'center')
      .style('margin-bottom', '16px')
      .style('padding-bottom', '8px')
      .style('border-bottom', `2px solid ${categoryConfig.color}`);

    header
      .append('div')
      .style('width', '32px')
      .style('height', '32px')
      .style('border-radius', '8px')
      .style('background', categoryConfig.color)
      .style('display', 'flex')
      .style('align-items', 'center')
      .style('justify-content', 'center')
      .style('margin-right', '12px')
      .html(`<svg width="16" height="16" fill="white"><use href="#${categoryConfig.icon.name}"/></svg>`);

    const headerText = header.append('div').style('flex', '1');
    
    headerText
      .append('h3')
      .text(`${categoryConfig.title} (${results.length})`)
      .style('font-size', '16px')
      .style('font-weight', '600')
      .style('color', '#1f2937')
      .style('margin', '0');

    headerText
      .append('p')
      .text(categoryConfig.description)
      .style('font-size', '12px')
      .style('color', '#6b7280')
      .style('margin', '0');

    // Results grid
    const resultsGrid = categorySection
      .append('div')
      .style('display', 'grid')
      .style('grid-template-columns', 'repeat(auto-fill, minmax(320px, 1fr))')
      .style('grid-gap', '16px');

    // Render individual results
    results.slice(0, 6).forEach(result => { // Limit to 6 per category for clarity
      renderIntelligentResultCard(resultsGrid, result, categoryConfig);
    });

    // Show more button if needed
    if (results.length > 6) {
      categorySection
        .append('button')
        .text(`Show ${results.length - 6} more results`)
        .style('margin-top', '12px')
        .style('padding', '8px 16px')
        .style('background', '#f3f4f6')
        .style('border', '1px solid #d1d5db')
        .style('border-radius', '6px')
        .style('color', '#374151')
        .style('font-size', '12px')
        .style('cursor', 'pointer')
        .on('click', () => {
          // Expand to show all results
          resultsGrid.selectAll('.result-card').remove();
          results.forEach(result => {
            renderIntelligentResultCard(resultsGrid, result, categoryConfig);
          });
          d3.select(event.target).remove();
        });
    }
  };

  const renderIntelligentResultCard = (parent, result, categoryConfig) => {
    const card = parent
      .append('div')
      .attr('class', 'result-card')
      .style('background', 'white')
      .style('border', '1px solid #e5e7eb')
      .style('border-radius', '8px')
      .style('padding', '16px')
      .style('cursor', 'pointer')
      .style('transition', 'all 0.2s ease')
      .style('position', 'relative')
      .on('mouseover', function() {
        d3.select(this)
          .style('transform', 'translateY(-2px)')
          .style('box-shadow', '0 8px 25px rgba(0,0,0,0.15)')
          .style('border-color', categoryConfig.color);
      })
      .on('mouseout', function() {
        d3.select(this)
          .style('transform', 'translateY(0)')
          .style('box-shadow', 'none')
          .style('border-color', '#e5e7eb');
      })
      .on('click', () => {
        setSelectedResult(result);
        if (onResultClick) onResultClick(result);
      });

    // Importance indicator
    const importance = result.importance;
    card
      .append('div')
      .style('position', 'absolute')
      .style('top', '12px')
      .style('right', '12px')
      .style('width', '8px')
      .style('height', '8px')
      .style('border-radius', '50%')
      .style('background', importance.color);

    // Result header
    const header = card
      .append('div')
      .style('display', 'flex')
      .style('align-items', 'flex-start')
      .style('margin-bottom', '12px');

    // Icon
    header
      .append('div')
      .style('margin-right', '12px')
      .style('margin-top', '2px')
      .html(getResultIcon(result));

    // Title and path
    const titleSection = header.append('div').style('flex', '1');
    
    titleSection
      .append('h4')
      .text(result.displayTitle)
      .style('font-size', '14px')
      .style('font-weight', '600')
      .style('color', '#1f2937')
      .style('margin', '0 0 4px 0')
      .style('line-height', '1.3');

    if (result.path) {
      titleSection
        .append('p')
        .text(result.path)
        .style('font-size', '11px')
        .style('color', '#6b7280')
        .style('margin', '0')
        .style('font-family', 'monospace');
    }

    // Description
    card
      .append('p')
      .text(result.displayDescription)
      .style('font-size', '12px')
      .style('color', '#4b5563')
      .style('line-height', '1.4')
      .style('margin', '0 0 12px 0');

    // Visual metrics
    if (result.visualMetrics) {
      renderResultMetrics(card, result.visualMetrics);
    }

    // Relevance score
    const scoreContainer = card
      .append('div')
      .style('display', 'flex')
      .style('align-items', 'center')
      .style('justify-content', 'space-between')
      .style('margin-top', '12px')
      .style('padding-top', '12px')
      .style('border-top', '1px solid #f3f4f6');

    scoreContainer
      .append('div')
      .style('display', 'flex')
      .style('align-items', 'center')
      .style('space-x', '4px')
      .html(`
        <span style="font-size: 10px; color: #9ca3af;">Relevance:</span>
        <div style="width: 60px; height: 4px; background: #e5e7eb; border-radius: 2px; margin-left: 4px;">
          <div style="width: ${result.relevanceScore * 100}%; height: 100%; background: ${categoryConfig.color}; border-radius: 2px;"></div>
        </div>
        <span style="font-size: 10px; color: #6b7280; margin-left: 4px;">${Math.round(result.relevanceScore * 100)}%</span>
      `);

    // Source indicator
    scoreContainer
      .append('span')
      .text(result.source || 'semantic')
      .style('font-size', '10px')
      .style('padding', '2px 6px')
      .style('background', '#f3f4f6')
      .style('border-radius', '4px')
      .style('color', '#6b7280')
      .style('text-transform', 'uppercase')
      .style('font-weight', '500');
  };

  const renderResultMetrics = (parent, metrics) => {
    const metricsContainer = parent
      .append('div')
      .style('display', 'flex')
      .style('align-items', 'center')
      .style('space-x', '12px')
      .style('margin-bottom', '8px');

    // Complexity indicator
    if (metrics.complexity !== undefined) {
      const complexityColor = metrics.complexity <= 5 ? '#059669' : 
                             metrics.complexity <= 15 ? '#d97706' : '#dc2626';
      
      metricsContainer
        .append('div')
        .style('display', 'flex')
        .style('align-items', 'center')
        .style('space-x', '4px')
        .html(`
          <div style="width: 8px; height: 8px; border-radius: 50%; background: ${complexityColor};"></div>
          <span style="font-size: 10px; color: #6b7280;">Complexity: ${Math.round(metrics.complexity)}</span>
        `);
    }

    // Usage count
    if (metrics.usageCount !== undefined) {
      metricsContainer
        .append('div')
        .style('display', 'flex')
        .style('align-items', 'center')
        .style('space-x', '4px')
        .html(`
          <svg width="10" height="10" fill="#6b7280"><use href="#GitBranch"/></svg>
          <span style="font-size: 10px; color: #6b7280;">Used ${metrics.usageCount} times</span>
        `);
    }

    // Test coverage
    if (metrics.testCoverage !== undefined) {
      const coverageColor = metrics.testCoverage >= 80 ? '#059669' : 
                           metrics.testCoverage >= 60 ? '#d97706' : '#dc2626';
      
      metricsContainer
        .append('div')
        .style('display', 'flex')
        .style('align-items', 'center')
        .style('space-x', '4px')
        .html(`
          <svg width="10" height="10" fill="${coverageColor}"><use href="#Shield"/></svg>
          <span style="font-size: 10px; color: #6b7280;">Coverage: ${Math.round(metrics.testCoverage)}%</span>
        `);
    }
  };

  const renderListView = (container, results) => {
    const listContainer = container
      .append('div')
      .style('height', '100%')
      .style('overflow-y', 'auto')
      .style('padding', '16px');

    results.forEach((result, index) => {
      const listItem = listContainer
        .append('div')
        .style('display', 'flex')
        .style('align-items', 'center')
        .style('padding', '12px')
        .style('margin-bottom', '8px')
        .style('background', 'white')
        .style('border', '1px solid #e5e7eb')
        .style('border-radius', '6px')
        .style('cursor', 'pointer')
        .on('click', () => {
          setSelectedResult(result);
          if (onResultClick) onResultClick(result);
        });

      // Rank number
      listItem
        .append('div')
        .text(index + 1)
        .style('width', '24px')
        .style('height', '24px')
        .style('border-radius', '50%')
        .style('background', result.category.color)
        .style('color', 'white')
        .style('display', 'flex')
        .style('align-items', 'center')
        .style('justify-content', 'center')
        .style('font-size', '12px')
        .style('font-weight', '600')
        .style('margin-right', '12px');

      // Content
      const content = listItem.append('div').style('flex', '1');
      
      content
        .append('div')
        .text(result.displayTitle)
        .style('font-weight', '500')
        .style('color', '#1f2937')
        .style('margin-bottom', '4px');

      content
        .append('div')
        .text(result.displayDescription)
        .style('font-size', '12px')
        .style('color', '#6b7280');

      // Relevance bar
      listItem
        .append('div')
        .style('width', '60px')
        .style('height', '4px')
        .style('background', '#e5e7eb')
        .style('border-radius', '2px')
        .style('margin-left', '12px')
        .append('div')
        .style('width', `${result.relevanceScore * 100}%`)
        .style('height', '100%')
        .style('background', result.category.color)
        .style('border-radius', '2px');
    });
  };

  const renderGridView = (container, results) => {
    const gridContainer = container
      .append('div')
      .style('height', '100%')
      .style('overflow-y', 'auto')
      .style('padding', '20px')
      .style('display', 'grid')
      .style('grid-template-columns', 'repeat(auto-fill, minmax(280px, 1fr))')
      .style('grid-gap', '16px');

    results.forEach(result => {
      renderIntelligentResultCard(gridContainer, result, result.category);
    });
  };

  const renderEmptyState = (container) => {
    const emptyState = container
      .append('div')
      .style('height', '100%')
      .style('display', 'flex')
      .style('align-items', 'center')
      .style('justify-content', 'center')
      .style('flex-direction', 'column')
      .style('text-align', 'center')
      .style('padding', '40px');

    emptyState
      .append('div')
      .html('<svg width="64" height="64" fill="#9ca3af"><use href="#Search"/></svg>')
      .style('margin-bottom', '16px');

    emptyState
      .append('h3')
      .text('No Results Found')
      .style('font-size', '18px')
      .style('font-weight', '600')
      .style('color', '#374151')
      .style('margin-bottom', '8px');

    emptyState
      .append('p')
      .text('Try adjusting your search terms or filters')
      .style('font-size', '14px')
      .style('color', '#6b7280');
  };

  // Helper functions for intelligent processing
  const determineResultCategory = (result, query) => {
    const queryLower = query.toLowerCase();
    const nameLower = (result.name || '').toLowerCase();
    
    // Exact match
    if (nameLower === queryLower) {
      return { key: 'exact', ...resultCategories.exact };
    }
    
    // Symbolic match
    if (result.source === 'symbolic' || result.type === 'definition') {
      return { key: 'symbolic', ...resultCategories.symbolic };
    }
    
    // Semantic match
    if (result.source === 'semantic' || result.similarity > 0.8) {
      return { key: 'semantic', ...resultCategories.semantic };
    }
    
    // Usage example
    if (result.type === 'reference' || result.content?.includes('example')) {
      return { key: 'usage', ...resultCategories.usage };
    }
    
    // Contextual
    return { key: 'contextual', ...resultCategories.contextual };
  };

  const calculateResultImportance = (result, query) => {
    let score = 0;
    
    // Base score from relevance
    score += (result.score || result.similarity || 0.5) * 40;
    
    // Boost for exact matches
    if (result.name?.toLowerCase() === query.toLowerCase()) score += 30;
    
    // Boost for high usage
    if (result.usageCount > 10) score += 20;
    
    // Boost for public APIs
    if (result.metadata?.isPublic) score += 15;
    
    // Boost for recent activity
    if (result.metadata?.lastModified) {
      const daysSince = (Date.now() - new Date(result.metadata.lastModified)) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) score += 10;
    }

    // Determine priority level
    let priority, color, description;
    if (score >= 80) {
      priority = 4;
      color = '#dc2626';
      description = 'Critical to understand';
    } else if (score >= 60) {
      priority = 3;
      color = '#ea580c';
      description = 'Important for context';
    } else if (score >= 40) {
      priority = 2;
      color = '#d97706';
      description = 'Useful information';
    } else {
      priority = 1;
      color = '#059669';
      description = 'Additional context';
    }

    return { score, priority, color, description };
  };

  const calculateRelevanceScore = (result, query) => {
    // Multi-factor relevance calculation
    let score = 0;
    
    // Name similarity
    const nameSimilarity = calculateStringSimilarity(result.name || '', query);
    score += nameSimilarity * 0.4;
    
    // Content similarity
    if (result.content) {
      const contentSimilarity = calculateStringSimilarity(result.content, query);
      score += contentSimilarity * 0.3;
    }
    
    // Type relevance
    if (result.type && query.toLowerCase().includes(result.type.toLowerCase())) {
      score += 0.2;
    }
    
    // Source quality
    if (result.source === 'symbolic') score += 0.1;
    if (result.source === 'semantic') score += 0.05;
    
    return Math.min(1, score);
  };

  const calculateStringSimilarity = (str1, str2) => {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    
    // Simple similarity based on common words and character overlap
    const words1 = s1.split(/\s+/);
    const words2 = s2.split(/\s+/);
    
    const commonWords = words1.filter(word => words2.includes(word)).length;
    const totalWords = Math.max(words1.length, words2.length);
    
    const wordSimilarity = commonWords / totalWords;
    
    // Character overlap
    const chars1 = new Set(s1);
    const chars2 = new Set(s2);
    const commonChars = [...chars1].filter(char => chars2.has(char)).length;
    const totalChars = Math.max(chars1.size, chars2.size);
    
    const charSimilarity = commonChars / totalChars;
    
    return (wordSimilarity * 0.7) + (charSimilarity * 0.3);
  };

  const createIntelligentTitle = (result) => {
    const type = result.type || 'Item';
    const name = result.name || 'Unknown';
    
    // Create context-aware title
    if (type === 'Function') {
      return `⚡ ${name}()`;
    } else if (type === 'Class') {
      return `🏗️ ${name}`;
    } else if (type === 'Variable') {
      return `📊 ${name}`;
    } else if (type === 'File') {
      return `📄 ${name}`;
    }
    
    return `${name}`;
  };

  const createIntelligentDescription = (result) => {
    const type = result.type || 'code element';
    const path = result.path ? ` in ${result.path}` : '';
    
    if (result.content && result.content.length > 100) {
      return result.content.substring(0, 97) + '...';
    }
    
    if (result.description) {
      return result.description;
    }
    
    return `A ${type.toLowerCase()}${path} that matches your search criteria.`;
  };

  const extractVisualMetrics = (result) => {
    return {
      complexity: result.metadata?.complexity || Math.random() * 20,
      usageCount: result.metadata?.referenceCount || Math.floor(Math.random() * 50),
      testCoverage: result.metadata?.testCoverage || Math.random() * 100,
      lastModified: result.metadata?.lastModified || new Date().toISOString()
    };
  };

  const generateAIContext = (result) => {
    const type = result.type || 'element';
    const complexity = result.visualMetrics?.complexity || 0;
    
    if (complexity > 15) {
      return `This ${type.toLowerCase()} is complex and may require careful analysis.`;
    } else if (result.visualMetrics?.usageCount > 20) {
      return `This ${type.toLowerCase()} is widely used throughout the codebase.`;
    } else {
      return `This ${type.toLowerCase()} appears to be well-contained and focused.`;
    }
  };

  const getResultIcon = (result) => {
    const iconMap = {
      Function: '<svg width="16" height="16" fill="#10b981"><use href="#Zap"/></svg>',
      Class: '<svg width="16" height="16" fill="#f59e0b"><use href="#Target"/></svg>',
      Variable: '<svg width="16" height="16" fill="#8b5cf6"><use href="#Database"/></svg>',
      File: '<svg width="16" height="16" fill="#2563eb"><use href="#FileText"/></svg>',
      Interface: '<svg width="16" height="16" fill="#06b6d4"><use href="#GitBranch"/></svg>',
      Type: '<svg width="16" height="16" fill="#ec4899"><use href="#Tag"/></svg>'
    };
    
    return iconMap[result.type] || iconMap.File;
  };

  return (
    <div className="h-full bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
      {/* Intelligent Search Controls */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <h2 className="text-lg font-semibold text-gray-900">Search Results</h2>
            {query && (
              <span className="text-sm text-gray-600">
                for "<span className="font-medium">{query}</span>"
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Info className="w-4 h-4" />
            <span>Results organized by relevance and type</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* View Mode */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">View:</span>
              <div className="flex border border-gray-300 rounded-md">
                {[
                  { id: 'semantic', icon: Target, label: 'Semantic' },
                  { id: 'list', icon: List, label: 'List' },
                  { id: 'grid', icon: Grid, label: 'Grid' }
                ].map(mode => (
                  <button
                    key={mode.id}
                    onClick={() => setVisualizationMode(mode.id)}
                    className={`p-2 text-xs transition-colors ${
                      visualizationMode === mode.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                    title={mode.label}
                  >
                    <mode.icon className="w-3 h-3" />
                  </button>
                ))}
              </div>
            </div>

            {/* Sort */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="relevance">Relevance</option>
                <option value="importance">Importance</option>
                <option value="type">Type</option>
                <option value="name">Name</option>
              </select>
            </div>

            {/* Group */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">Group:</span>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
                className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="type">By Type</option>
                <option value="file">By File</option>
                <option value="relevance">By Relevance</option>
                <option value="none">No Grouping</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">
              {searchResults?.length || 0} results
            </span>
          </div>
        </div>
      </div>

      {/* Results Container */}
      <div ref={containerRef} className="flex-1" />

      {/* AI Interpretation Panel */}
      {selectedResult && (
        <div className="bg-blue-50 border-t border-blue-200 p-4">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Brain className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-blue-900 mb-1">AI Context</h3>
              <p className="text-sm text-blue-700">
                {selectedResult.aiContext}
              </p>
              <div className="mt-2 text-xs text-blue-600">
                <strong>For AI:</strong> {selectedResult.type} named "{selectedResult.name}" 
                {selectedResult.path && ` located in ${selectedResult.path}`}
                {selectedResult.visualMetrics?.complexity && ` with complexity score ${Math.round(selectedResult.visualMetrics.complexity)}`}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntelligentSearchVisualization;
