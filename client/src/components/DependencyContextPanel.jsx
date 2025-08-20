/**
 * Dependency Context Panel
 * Rich contextual analysis with AI insights for selected nodes and flows
 */

import React, { useState, useEffect } from 'react';
import {
  FileText,
  GitBranch,
  TrendingUp,
  Code,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Brain,
  Target,
  Layers,
  Database,
  Settings,
  TestTube,
  Shield,
  Gauge
} from 'lucide-react';

const DependencyContextPanel = ({ 
  selectedNode, 
  selectedFlow, 
  dependencies, 
  projectId, 
  onNodeClick,
  onFlowAnalysis 
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [analysisData, setAnalysisData] = useState(null);
  const [aiInsights, setAiInsights] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Tab configuration
  const tabs = {
    overview: {
      id: 'overview',
      label: 'Overview',
      icon: FileText,
      description: 'General information and metrics'
    },
    dependencies: {
      id: 'dependencies',
      label: 'Dependencies',
      icon: GitBranch,
      description: 'Dependency relationships and analysis'
    },
    performance: {
      id: 'performance',
      label: 'Performance',
      icon: Zap,
      description: 'Performance metrics and optimization'
    },
    quality: {
      id: 'quality',
      label: 'Quality',
      icon: Shield,
      description: 'Code quality and health metrics'
    },
    ai: {
      id: 'ai',
      label: 'AI Insights',
      icon: Brain,
      description: 'AI-powered analysis and recommendations'
    }
  };

  // Load analysis data when selection changes
  useEffect(() => {
    if (selectedNode) {
      loadNodeAnalysis();
    } else if (selectedFlow) {
      loadFlowAnalysis();
    }
  }, [selectedNode, selectedFlow]);

  const loadNodeAnalysis = async () => {
    if (!selectedNode) return;

    setIsLoading(true);
    try {
      // Load comprehensive node analysis
      const [depResponse, aiResponse] = await Promise.all([
        fetch(`/api/flows/${projectId}/files/${encodeURIComponent(selectedNode.filePath)}/dependencies`),
        fetch('/api/ai/analyze-node', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            node: selectedNode,
            context: 'dependency-analysis'
          })
        })
      ]);

      const depData = await depResponse.json();
      const aiData = await aiResponse.json();

      setAnalysisData(depData.success ? depData.data : null);
      setAiInsights(aiData.success ? aiData.data : null);
    } catch (error) {
      console.error('Failed to load node analysis:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadFlowAnalysis = async () => {
    if (!selectedFlow) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/flows/${projectId}/${selectedFlow.id}/analyze`);
      const data = await response.json();

      setAnalysisData(data.success ? data.data : null);

      // Get AI insights for the flow
      const aiResponse = await fetch('/api/ai/analyze-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flow: selectedFlow,
          context: 'user-flow-analysis'
        })
      });

      const aiData = await aiResponse.json();
      setAiInsights(aiData.success ? aiData.data : null);
    } catch (error) {
      console.error('Failed to load flow analysis:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!selectedNode && !selectedFlow) {
    return (
      <div className="w-96 bg-white border-l border-gray-200 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <Target className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <h3 className="font-medium mb-2">No Selection</h3>
          <p className="text-sm">Click on a node or select a flow to see detailed analysis</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-96 bg-white border-l border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3 mb-2">
          {selectedNode ? (
            <>
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <FileText className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{selectedNode.name}</h3>
                <p className="text-sm text-gray-600">{selectedNode.type} • {selectedNode.layer}</p>
              </div>
            </>
          ) : (
            <>
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: selectedFlow.color + '20' }}
              >
                <span className="text-lg">{selectedFlow.icon}</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{selectedFlow.name}</h3>
                <p className="text-sm text-gray-600">{selectedFlow.files.length} files • {selectedFlow.steps?.length} steps</p>
              </div>
            </>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          {Object.values(tabs).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center space-x-1 px-2 py-1 rounded-md text-xs transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              title={tab.description}
            >
              <tab.icon className="w-3 h-3" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'overview' && (
          <OverviewTab 
            selectedNode={selectedNode}
            selectedFlow={selectedFlow}
            analysisData={analysisData}
            isLoading={isLoading}
          />
        )}

        {activeTab === 'dependencies' && (
          <DependenciesTab
            selectedNode={selectedNode}
            selectedFlow={selectedFlow}
            dependencies={dependencies}
            analysisData={analysisData}
            onNodeClick={onNodeClick}
          />
        )}

        {activeTab === 'performance' && (
          <PerformanceTab
            selectedNode={selectedNode}
            selectedFlow={selectedFlow}
            analysisData={analysisData}
          />
        )}

        {activeTab === 'quality' && (
          <QualityTab
            selectedNode={selectedNode}
            selectedFlow={selectedFlow}
            analysisData={analysisData}
          />
        )}

        {activeTab === 'ai' && (
          <AIInsightsTab
            selectedNode={selectedNode}
            selectedFlow={selectedFlow}
            aiInsights={aiInsights}
            isLoading={isLoading}
            onAnalyze={() => selectedFlow ? loadFlowAnalysis() : loadNodeAnalysis()}
          />
        )}
      </div>
    </div>
  );
};

// Overview Tab Component
const OverviewTab = ({ selectedNode, selectedFlow, analysisData, isLoading }) => {
  if (isLoading) {
    return <LoadingState />;
  }

  if (selectedNode) {
    return (
      <div className="p-4 space-y-4">
        {/* File Information */}
        <div className="bg-gray-50 rounded-lg p-3">
          <h4 className="font-medium text-gray-900 mb-2">File Information</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Path:</span>
              <span className="font-mono text-xs text-gray-800">{selectedNode.filePath}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Type:</span>
              <span className="font-medium">{selectedNode.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Layer:</span>
              <span className="font-medium">{selectedNode.architecture?.layer || 'Unknown'}</span>
            </div>
            {selectedNode.metadata?.lines && (
              <div className="flex justify-between">
                <span className="text-gray-600">Lines:</span>
                <span className="font-medium">{selectedNode.metadata.lines}</span>
              </div>
            )}
          </div>
        </div>

        {/* Metrics Overview */}
        <div className="bg-gray-50 rounded-lg p-3">
          <h4 className="font-medium text-gray-900 mb-3">Metrics</h4>
          <div className="grid grid-cols-2 gap-3">
            <MetricCard
              icon={TrendingUp}
              label="Complexity"
              value={selectedNode.complexity || 0}
              color={getComplexityColor(selectedNode.complexity || 0)}
            />
            <MetricCard
              icon={GitBranch}
              label="Dependencies"
              value={selectedNode.dependencies?.outgoing || 0}
              color="#6b7280"
            />
            <MetricCard
              icon={Target}
              label="Used By"
              value={selectedNode.dependencies?.incoming || 0}
              color="#6b7280"
            />
            <MetricCard
              icon={TestTube}
              label="Test Coverage"
              value={`${Math.round(selectedNode.quality?.testCoverage || 0)}%`}
              color={getCoverageColor(selectedNode.quality?.testCoverage || 0)}
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-2">
          <button className="w-full px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors flex items-center space-x-2">
            <Code className="w-4 h-4" />
            <span>View Source Code</span>
          </button>
          <button className="w-full px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors flex items-center space-x-2">
            <TestTube className="w-4 h-4" />
            <span>Run Tests</span>
          </button>
        </div>
      </div>
    );
  }

  if (selectedFlow) {
    return (
      <div className="p-4 space-y-4">
        {/* Flow Information */}
        <div className="bg-gray-50 rounded-lg p-3">
          <h4 className="font-medium text-gray-900 mb-2">Flow Information</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Category:</span>
              <span className="font-medium">{selectedFlow.category}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Files:</span>
              <span className="font-medium">{selectedFlow.files.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Steps:</span>
              <span className="font-medium">{selectedFlow.steps?.length || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Critical:</span>
              <span className={`font-medium ${selectedFlow.isCritical ? 'text-red-600' : 'text-green-600'}`}>
                {selectedFlow.isCritical ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>

        {/* Flow Metrics */}
        <div className="bg-gray-50 rounded-lg p-3">
          <h4 className="font-medium text-gray-900 mb-3">Flow Metrics</h4>
          <div className="grid grid-cols-2 gap-3">
            <MetricCard
              icon={TrendingUp}
              label="Complexity"
              value={selectedFlow.metrics?.complexity || 0}
              color={getComplexityColor(selectedFlow.metrics?.complexity || 0)}
            />
            <MetricCard
              icon={Zap}
              label="Performance"
              value={selectedFlow.metrics?.performance || 'Unknown'}
              color="#f59e0b"
            />
            <MetricCard
              icon={TestTube}
              label="Test Coverage"
              value={`${Math.round(selectedFlow.metrics?.testCoverage || 0)}%`}
              color={getCoverageColor(selectedFlow.metrics?.testCoverage || 0)}
            />
            <MetricCard
              icon={Gauge}
              label="Health"
              value={selectedFlow.metrics?.health || 'Good'}
              color="#10b981"
            />
          </div>
        </div>

        {/* Flow Steps */}
        {selectedFlow.steps && (
          <div className="bg-gray-50 rounded-lg p-3">
            <h4 className="font-medium text-gray-900 mb-3">Flow Steps</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {selectedFlow.steps.slice(0, 10).map((step, index) => (
                <div key={index} className="flex items-center space-x-3 p-2 bg-white rounded border">
                  <div className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-medium">
                    {step.order || index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">{step.action}</div>
                    <div className="text-xs text-gray-600 truncate">{step.file}</div>
                  </div>
                  {step.metadata?.isAsync && (
                    <div className="w-2 h-2 bg-purple-400 rounded-full" title="Async operation" />
                  )}
                </div>
              ))}
              {selectedFlow.steps.length > 10 && (
                <div className="text-center text-xs text-gray-500 py-2">
                  +{selectedFlow.steps.length - 10} more steps
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
};

// Dependencies Tab Component
const DependenciesTab = ({ selectedNode, selectedFlow, dependencies, analysisData, onNodeClick }) => {
  if (selectedNode && analysisData) {
    return (
      <div className="p-4 space-y-4">
        {/* Incoming Dependencies */}
        <div className="bg-gray-50 rounded-lg p-3">
          <h4 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
            <GitBranch className="w-4 h-4 text-blue-600" />
            <span>Incoming Dependencies ({analysisData.reverse?.length || 0})</span>
          </h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {(analysisData.reverse || []).slice(0, 5).map((dep, index) => (
              <button
                key={index}
                onClick={() => onNodeClick?.(dep)}
                className="w-full text-left p-2 bg-white rounded border hover:bg-blue-50 transition-colors"
              >
                <div className="text-sm font-medium text-gray-900">{dep.fileName}</div>
                <div className="text-xs text-gray-600">{dep.relationship}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Outgoing Dependencies */}
        <div className="bg-gray-50 rounded-lg p-3">
          <h4 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
            <GitBranch className="w-4 h-4 text-green-600" />
            <span>Outgoing Dependencies ({analysisData.direct?.length || 0})</span>
          </h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {(analysisData.direct || []).slice(0, 5).map((dep, index) => (
              <button
                key={index}
                onClick={() => onNodeClick?.(dep)}
                className="w-full text-left p-2 bg-white rounded border hover:bg-green-50 transition-colors"
              >
                <div className="text-sm font-medium text-gray-900">{dep.target}</div>
                <div className="text-xs text-gray-600">{dep.type} • {dep.strength}</div>
              </button>
            ))}
          </div>
        </div>

        {/* External Dependencies */}
        {analysisData.external && analysisData.external.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-3">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
              <Database className="w-4 h-4 text-orange-600" />
              <span>External Dependencies ({analysisData.external.length})</span>
            </h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {analysisData.external.slice(0, 5).map((dep, index) => (
                <div key={index} className="p-2 bg-white rounded border">
                  <div className="text-sm font-medium text-gray-900">{dep.package}</div>
                  <div className="text-xs text-gray-600">{dep.version} • {dep.size}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return <div className="p-4 text-center text-gray-500">No dependency data available</div>;
};

// Performance Tab Component
const PerformanceTab = ({ selectedNode, selectedFlow, analysisData }) => {
  const performanceData = selectedNode ? 
    selectedNode.performance : 
    selectedFlow?.metrics?.performance;

  return (
    <div className="p-4 space-y-4">
      {/* Performance Metrics */}
      <div className="bg-gray-50 rounded-lg p-3">
        <h4 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
          <Zap className="w-4 h-4 text-yellow-600" />
          <span>Performance Metrics</span>
        </h4>
        
        {selectedNode && (
          <div className="space-y-3">
            <PerformanceMetric
              label="Bundle Size"
              value={formatBytes(performanceData?.bundleSize || 0)}
              status={getPerformanceStatus(performanceData?.bundleSize, 'size')}
            />
            <PerformanceMetric
              label="Load Time"
              value={`${Math.round(performanceData?.loadTime || 0)}ms`}
              status={getPerformanceStatus(performanceData?.loadTime, 'time')}
            />
            <PerformanceMetric
              label="Render Complexity"
              value={performanceData?.renderComplexity || 0}
              status={getPerformanceStatus(performanceData?.renderComplexity, 'complexity')}
            />
          </div>
        )}

        {selectedFlow && (
          <div className="space-y-3">
            <PerformanceMetric
              label="Flow Complexity"
              value={selectedFlow.metrics?.complexity || 0}
              status={getPerformanceStatus(selectedFlow.metrics?.complexity, 'complexity')}
            />
            <PerformanceMetric
              label="Total Files"
              value={selectedFlow.files.length}
              status={getPerformanceStatus(selectedFlow.files.length, 'fileCount')}
            />
            <PerformanceMetric
              label="Critical Path"
              value={selectedFlow.isCritical ? 'Yes' : 'No'}
              status={selectedFlow.isCritical ? 'warning' : 'good'}
            />
          </div>
        )}
      </div>

      {/* Optimization Suggestions */}
      <div className="bg-blue-50 rounded-lg p-3">
        <h4 className="font-medium text-blue-900 mb-2">💡 Optimization Suggestions</h4>
        <div className="space-y-2 text-sm text-blue-800">
          {getOptimizationSuggestions(selectedNode, selectedFlow).map((suggestion, index) => (
            <div key={index} className="flex items-start space-x-2">
              <div className="w-1 h-1 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
              <span>{suggestion}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Quality Tab Component
const QualityTab = ({ selectedNode, selectedFlow, analysisData }) => {
  return (
    <div className="p-4 space-y-4">
      {/* Quality Metrics */}
      <div className="bg-gray-50 rounded-lg p-3">
        <h4 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
          <Shield className="w-4 h-4 text-green-600" />
          <span>Quality Metrics</span>
        </h4>
        
        {selectedNode && (
          <div className="space-y-3">
            <QualityMetric
              label="Maintainability"
              value={selectedNode.quality?.maintainability || 0}
              max={100}
              unit="%"
            />
            <QualityMetric
              label="Stability"
              value={Math.round((selectedNode.quality?.stability || 0) * 100)}
              max={100}
              unit="%"
            />
            <QualityMetric
              label="Abstractness"
              value={Math.round((selectedNode.quality?.abstractness || 0) * 100)}
              max={100}
              unit="%"
            />
            <QualityMetric
              label="Test Coverage"
              value={selectedNode.quality?.testCoverage || 0}
              max={100}
              unit="%"
            />
          </div>
        )}
      </div>

      {/* Quality Issues */}
      <div className="bg-red-50 rounded-lg p-3">
        <h4 className="font-medium text-red-900 mb-2">⚠️ Quality Issues</h4>
        <div className="space-y-2 text-sm">
          {getQualityIssues(selectedNode, selectedFlow).map((issue, index) => (
            <div key={index} className="flex items-start space-x-2 text-red-800">
              <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span>{issue}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// AI Insights Tab Component
const AIInsightsTab = ({ selectedNode, selectedFlow, aiInsights, isLoading, onAnalyze }) => {
  return (
    <div className="p-4 space-y-4">
      {/* AI Analysis */}
      <div className="bg-purple-50 rounded-lg p-3">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-purple-900 flex items-center space-x-2">
            <Brain className="w-4 h-4" />
            <span>AI Analysis</span>
          </h4>
          <button
            onClick={onAnalyze}
            disabled={isLoading}
            className="px-3 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700 disabled:bg-gray-400 transition-colors"
          >
            {isLoading ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>

        {aiInsights ? (
          <div className="space-y-3">
            {/* AI Recommendations */}
            <div>
              <h5 className="font-medium text-purple-800 mb-2">🎯 Recommendations</h5>
              <div className="space-y-2 text-sm text-purple-700">
                {(aiInsights.recommendations || []).map((rec, index) => (
                  <div key={index} className="bg-white rounded p-2 border border-purple-200">
                    <div className="font-medium">{rec.title}</div>
                    <div className="text-xs text-purple-600">{rec.description}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Insights */}
            <div>
              <h5 className="font-medium text-purple-800 mb-2">💡 Insights</h5>
              <div className="text-sm text-purple-700 bg-white rounded p-2 border border-purple-200">
                {aiInsights.summary || 'No insights available'}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-purple-600 py-4">
            <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Click "Analyze" to get AI insights</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper Components
const MetricCard = ({ icon: Icon, label, value, color }) => (
  <div className="bg-white rounded-lg p-3 border">
    <div className="flex items-center space-x-2 mb-1">
      <Icon className="w-4 h-4" style={{ color }} />
      <span className="text-xs text-gray-600">{label}</span>
    </div>
    <div className="text-lg font-bold" style={{ color }}>
      {value}
    </div>
  </div>
);

const QualityMetric = ({ label, value, max, unit }) => (
  <div className="space-y-1">
    <div className="flex justify-between text-sm">
      <span className="text-gray-600">{label}</span>
      <span className="font-medium">{value}{unit}</span>
    </div>
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div 
        className={`h-2 rounded-full transition-all duration-300 ${
          value >= 80 ? 'bg-green-500' : 
          value >= 60 ? 'bg-yellow-500' : 
          'bg-red-500'
        }`}
        style={{ width: `${Math.min((value / max) * 100, 100)}%` }}
      />
    </div>
  </div>
);

const PerformanceMetric = ({ label, value, status }) => (
  <div className="flex items-center justify-between">
    <span className="text-sm text-gray-600">{label}</span>
    <div className="flex items-center space-x-2">
      <span className="text-sm font-medium">{value}</span>
      <div className={`w-2 h-2 rounded-full ${
        status === 'good' ? 'bg-green-500' :
        status === 'warning' ? 'bg-yellow-500' :
        'bg-red-500'
      }`} />
    </div>
  </div>
);

const LoadingState = () => (
  <div className="p-4 flex items-center justify-center">
    <div className="text-center">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
      <p className="text-sm text-gray-600">Loading analysis...</p>
    </div>
  </div>
);

// Helper functions
const getComplexityColor = (complexity) => {
  if (complexity <= 5) return '#22c55e';
  if (complexity <= 15) return '#eab308';
  if (complexity <= 30) return '#f97316';
  return '#ef4444';
};

const getCoverageColor = (coverage) => {
  if (coverage >= 80) return '#22c55e';
  if (coverage >= 60) return '#eab308';
  return '#ef4444';
};

const getPerformanceStatus = (value, type) => {
  switch (type) {
    case 'size':
      return value < 50000 ? 'good' : value < 200000 ? 'warning' : 'poor';
    case 'time':
      return value < 100 ? 'good' : value < 500 ? 'warning' : 'poor';
    case 'complexity':
      return value < 10 ? 'good' : value < 20 ? 'warning' : 'poor';
    case 'fileCount':
      return value < 10 ? 'good' : value < 25 ? 'warning' : 'poor';
    default:
      return 'good';
  }
};

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const getOptimizationSuggestions = (node, flow) => {
  const suggestions = [];
  
  if (node) {
    if (node.complexity > 20) {
      suggestions.push('Consider breaking down this complex file into smaller modules');
    }
    if (node.dependencies?.outgoing > 15) {
      suggestions.push('High dependency count - consider dependency injection');
    }
    if (node.performance?.bundleSize > 100000) {
      suggestions.push('Large file size - consider code splitting');
    }
    if (node.quality?.testCoverage < 60) {
      suggestions.push('Low test coverage - add unit tests');
    }
  }

  if (flow) {
    if (flow.files.length > 20) {
      suggestions.push('Large flow - consider breaking into smaller user journeys');
    }
    if (flow.metrics?.complexity > 15) {
      suggestions.push('Complex flow - simplify user journey steps');
    }
    if (flow.isCritical && flow.metrics?.testCoverage < 80) {
      suggestions.push('Critical flow needs higher test coverage');
    }
  }

  if (suggestions.length === 0) {
    suggestions.push('No optimization suggestions - code looks good!');
  }

  return suggestions;
};

const getQualityIssues = (node, flow) => {
  const issues = [];
  
  if (node) {
    if (node.complexity > 30) {
      issues.push('Very high complexity - refactoring recommended');
    }
    if (node.quality?.maintainability < 50) {
      issues.push('Low maintainability score');
    }
    if (node.quality?.testCoverage < 40) {
      issues.push('Insufficient test coverage');
    }
    if (node.dependencies?.circular?.length > 0) {
      issues.push('Circular dependency detected');
    }
  }

  if (flow) {
    if (flow.isCritical && flow.metrics?.testCoverage < 70) {
      issues.push('Critical flow has insufficient test coverage');
    }
    if (flow.metrics?.complexity > 20) {
      issues.push('Flow complexity is very high');
    }
  }

  if (issues.length === 0) {
    issues.push('No quality issues detected');
  }

  return issues;
};

export default DependencyContextPanel;
