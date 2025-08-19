/**
 * Code Knowledge Graph Panel Component
 * Main interface for CKG functionality
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Network, 
  FileSearch, 
  GitBranch, 
  Zap, 
  AlertCircle, 
  TrendingUp,
  Database,
  Eye,
  Settings,
  RefreshCw,
  Download,
  Info
} from 'lucide-react';
import { useToast } from './Toast';
import IntelligentCKGVisualization from './IntelligentCKGVisualization';
import IntelligentSearchVisualization from './IntelligentSearchVisualization';

export const CKGPanel = ({ projectId, projectPath, isVisible }) => {
  const [activeTab, setActiveTab] = useState('search');
  const [isLoading, setIsLoading] = useState(false);
  const [ckgStats, setCkgStats] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [symbolQuery, setSymbolQuery] = useState('');
  const [symbolInfo, setSymbolInfo] = useState(null);
  const [dependencies, setDependencies] = useState([]);
  const [unusedExports, setUnusedExports] = useState([]);
  const [circularDeps, setCircularDeps] = useState([]);
  const [hubs, setHubs] = useState([]);
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildProgress, setBuildProgress] = useState(0);
  const [graphData, setGraphData] = useState(null);

  const { toast } = useToast();

  // Load CKG statistics when component mounts or projectId changes
  useEffect(() => {
    if (projectId && isVisible) {
      loadCKGStats();
      loadDependencies();
      loadUnusedExports();
      loadCircularDependencies();
      loadHubs();
      loadGraphData();
    }
  }, [projectId, isVisible]);

  const loadCKGStats = async () => {
    try {
      const response = await fetch(`/api/ckg/projects/${projectId}/stats`);
      const data = await response.json();
      
      if (data.success) {
        setCkgStats(data.data);
      }
    } catch (error) {
      console.error('Failed to load CKG stats:', error);
    }
  };

  const loadDependencies = async () => {
    try {
      const response = await fetch(`/api/ckg/projects/${projectId}/dependencies`);
      const data = await response.json();
      
      if (data.success) {
        setDependencies(data.data.dependencies.slice(0, 20)); // Show top 20
      }
    } catch (error) {
      console.error('Failed to load dependencies:', error);
    }
  };

  const loadUnusedExports = async () => {
    try {
      const response = await fetch(`/api/ckg/projects/${projectId}/unused-exports`);
      const data = await response.json();
      
      if (data.success) {
        setUnusedExports(data.data.unusedExports.slice(0, 10)); // Show top 10
      }
    } catch (error) {
      console.error('Failed to load unused exports:', error);
    }
  };

  const loadCircularDependencies = async () => {
    try {
      const response = await fetch(`/api/ckg/projects/${projectId}/circular-dependencies`);
      const data = await response.json();
      
      if (data.success) {
        setCircularDeps(data.data.circularDependencies.slice(0, 5)); // Show top 5
      }
    } catch (error) {
      console.error('Failed to load circular dependencies:', error);
    }
  };

  const loadHubs = async () => {
    try {
      const response = await fetch(`/api/ckg/projects/${projectId}/hubs?limit=10`);
      const data = await response.json();
      
      if (data.success) {
        setHubs(data.data.hubs);
      }
    } catch (error) {
      console.error('Failed to load hubs:', error);
    }
  };

  const loadGraphData = async () => {
    try {
      // Get dependency graph from CKG
      const response = await fetch(`/api/ckg/projects/${projectId}/dependencies?maxDepth=2`);
      const data = await response.json();
      
      if (data.success) {
        // Transform dependency data into graph format
        const nodes = [];
        const edges = [];
        const nodeMap = new Map();

        // Process dependencies to create nodes and edges
        data.data.dependencies.forEach(dep => {
          // Add from node
          if (!nodeMap.has(dep.from_node_id)) {
            nodes.push({
              id: dep.from_node_id,
              name: dep.from_name,
              type: dep.from_type,
              metadata: { nodeType: dep.from_type }
            });
            nodeMap.set(dep.from_node_id, true);
          }

          // Add to node
          if (!nodeMap.has(dep.to_node_id)) {
            nodes.push({
              id: dep.to_node_id,
              name: dep.to_name,
              type: dep.to_type,
              metadata: { nodeType: dep.to_type }
            });
            nodeMap.set(dep.to_node_id, true);
          }

          // Add edge
          edges.push({
            from_node_id: dep.from_node_id,
            to_node_id: dep.to_node_id,
            relationship: dep.relationship,
            weight: dep.weight || 1
          });
        });

        setGraphData({ nodes, edges });
      }
    } catch (error) {
      console.error('Failed to load graph data:', error);
    }
  };

  const buildKnowledgeGraph = async (incremental = false) => {
    if (!projectPath) {
      toast.error('Project path not available');
      return;
    }

    setIsBuilding(true);
    setBuildProgress(0);

    try {
      const response = await fetch('/api/ckg/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: parseInt(projectId),
          rootPath: projectPath,
          incremental,
          enableSemanticChunking: true,
          enableEmbeddings: true
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Knowledge graph ${incremental ? 'update' : 'build'} started`);
        
        // Simulate progress (in real implementation, this would come from WebSocket)
        const progressInterval = setInterval(() => {
          setBuildProgress(prev => {
            if (prev >= 90) {
              clearInterval(progressInterval);
              return 90;
            }
            return prev + 10;
          });
        }, 2000);

        // Refresh stats after build
        setTimeout(() => {
          setBuildProgress(100);
          setTimeout(() => {
            setIsBuilding(false);
            setBuildProgress(0);
            loadCKGStats();
            loadGraphData(); // Refresh graph data for visualization
            toast.success('Knowledge graph build completed');
          }, 1000);
        }, 15000);
      } else {
        throw new Error(data.message || 'Build failed');
      }
    } catch (error) {
      console.error('Failed to build knowledge graph:', error);
      toast.error(`Failed to build knowledge graph: ${error.message}`);
      setIsBuilding(false);
      setBuildProgress(0);
    }
  };

  const performSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/ckg/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          projectId: parseInt(projectId),
          includeSymbolic: true,
          includeSemantic: true,
          includeTextSearch: true,
          limit: 20
        })
      });

      const data = await response.json();

      if (data.success) {
        setSearchResults(data.data);
      } else {
        throw new Error(data.message || 'Search failed');
      }
    } catch (error) {
      console.error('Search failed:', error);
      toast.error(`Search failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const lookupSymbol = async () => {
    if (!symbolQuery.trim()) return;

    setIsLoading(true);
    try {
      const [defResponse, refResponse, impactResponse] = await Promise.all([
        fetch(`/api/ckg/symbols/${encodeURIComponent(symbolQuery)}/definition?projectId=${projectId}`),
        fetch(`/api/ckg/symbols/${encodeURIComponent(symbolQuery)}/references?projectId=${projectId}`),
        fetch(`/api/ckg/symbols/${encodeURIComponent(symbolQuery)}/impact?projectId=${projectId}`)
      ]);

      const [defData, refData, impactData] = await Promise.all([
        defResponse.json(),
        refResponse.json(),
        impactResponse.json()
      ]);

      setSymbolInfo({
        definitions: defData.success ? defData.data.definitions : [],
        references: refData.success ? refData.data.references : [],
        impact: impactData.success ? impactData.data : null
      });
    } catch (error) {
      console.error('Symbol lookup failed:', error);
      toast.error(`Symbol lookup failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const exportGraph = async (format = 'json') => {
    try {
      const response = await fetch(`/api/ckg/projects/${projectId}/export?format=${format}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `ckg-${projectId}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success(`Graph exported as ${format.toUpperCase()}`);
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      console.error('Export failed:', error);
      toast.error(`Export failed: ${error.message}`);
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="h-full bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <Network className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-semibold">Code Knowledge Graph</h2>
        </div>
        
        <div className="flex items-center space-x-2">
          {isBuilding && (
            <div className="flex items-center space-x-2 text-sm">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>{buildProgress}%</span>
            </div>
          )}
          
          <button
            onClick={() => buildKnowledgeGraph(false)}
            disabled={isBuilding}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded text-sm font-medium transition-colors"
            title="Build Full Knowledge Graph"
          >
            <Database className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => buildKnowledgeGraph(true)}
            disabled={isBuilding}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded text-sm font-medium transition-colors"
            title="Incremental Update"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Build Progress */}
      {isBuilding && (
        <div className="p-4 bg-gray-800">
          <div className="flex items-center justify-between text-sm mb-2">
            <span>Building Knowledge Graph...</span>
            <span>{buildProgress}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${buildProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Statistics Overview */}
      {ckgStats && (
        <div className="p-4 bg-gray-800 border-b border-gray-700">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-400">{ckgStats.graph.totalNodes}</div>
              <div className="text-xs text-gray-400">Nodes</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-400">{ckgStats.graph.totalEdges}</div>
              <div className="text-xs text-gray-400">Edges</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-400">{ckgStats.embeddings.totalEmbeddings}</div>
              <div className="text-xs text-gray-400">Embeddings</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-400">
                {ckgStats.connectivity.connectivity.circularCount}
              </div>
              <div className="text-xs text-gray-400">Cycles</div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-700">
        {[
          { id: 'search', label: 'Search', icon: Search },
          { id: 'symbols', label: 'Symbols', icon: FileSearch },
          { id: 'visualization', label: 'Visualization', icon: Network },
          { id: 'dependencies', label: 'Dependencies', icon: GitBranch },
          { id: 'insights', label: 'Insights', icon: TrendingUp }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-800'
                : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'search' && (
          <div className="h-full flex flex-col">
            {/* Enhanced Search Input */}
            <div className="p-4 bg-white border-b border-gray-200">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && performSearch()}
                  placeholder="Search code, symbols, functions... (e.g., 'user authentication', 'handleLogin')"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={performSearch}
                  disabled={isLoading || !searchQuery.trim()}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
                >
                  <Search className="w-4 h-4" />
                  <span>Search</span>
                </button>
              </div>
              
              {searchQuery && (
                <div className="mt-2 text-sm text-gray-600">
                  💡 <strong>Tip:</strong> Search supports natural language queries and symbol names
                </div>
              )}
            </div>

            {/* Intelligent Search Results */}
            <div className="flex-1">
              {searchResults ? (
                <IntelligentSearchVisualization
                  searchResults={searchResults.combined || []}
                  query={searchQuery}
                  viewMode="semantic"
                  onResultClick={(result) => {
                    setSymbolQuery(result.name);
                    setActiveTab('symbols');
                    lookupSymbol();
                  }}
                  onResultHover={(result) => {
                    // Could trigger preview
                  }}
                />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <Search className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-medium text-gray-700 mb-2">Ready to Search</h3>
                    <p className="text-gray-500 mb-4">Enter a search term to find code, symbols, and documentation</p>
                    <div className="text-sm text-gray-400">
                      <p className="mb-1">🔍 <strong>Examples:</strong></p>
                      <p>"user authentication" • "handleLogin" • "API endpoints"</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'visualization' && (
          <div className="h-full">
            {graphData && graphData.nodes.length > 0 ? (
              <IntelligentCKGVisualization
                ckgData={graphData}
                selectedSymbol={symbolQuery}
                viewMode="overview"
                onNodeClick={(node) => {
                  setSymbolQuery(node.name);
                  setActiveTab('symbols');
                  lookupSymbol();
                }}
                onNodeHover={(node) => {
                  // Could show quick info tooltip
                }}
              />
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <Network className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-white mb-2">No Graph Data</h3>
                  <p className="text-gray-400 mb-4">Build the knowledge graph to see beautiful visualizations</p>
                  <button
                    onClick={() => buildKnowledgeGraph(false)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium transition-colors"
                  >
                    Build Knowledge Graph
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'symbols' && (
          <div className="space-y-4">
            <div className="flex space-x-2">
              <input
                type="text"
                value={symbolQuery}
                onChange={(e) => setSymbolQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && lookupSymbol()}
                placeholder="Enter symbol name (function, class, variable...)"
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={lookupSymbol}
                disabled={isLoading || !symbolQuery.trim()}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded font-medium transition-colors flex items-center space-x-2"
              >
                <Eye className="w-4 h-4" />
                <span>Lookup</span>
              </button>
            </div>

            {symbolInfo && (
              <div className="space-y-4">
                {/* Definitions */}
                <div>
                  <h3 className="font-semibold mb-2 flex items-center space-x-2">
                    <FileSearch className="w-4 h-4" />
                    <span>Definitions ({symbolInfo.definitions.length})</span>
                  </h3>
                  <div className="space-y-2">
                    {symbolInfo.definitions.map((def, index) => (
                      <div key={index} className="p-3 bg-gray-800 rounded border border-gray-700">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium">{def.name}</span>
                          <span className="text-xs bg-gray-700 px-2 py-1 rounded">{def.type}</span>
                        </div>
                        <div className="text-sm text-gray-400">{def.path}:{def.line}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Impact Analysis */}
                {symbolInfo.impact && (
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center space-x-2">
                      <TrendingUp className="w-4 h-4" />
                      <span>Impact Analysis</span>
                    </h3>
                    <div className="p-3 bg-gray-800 rounded border border-gray-700">
                      <div className="grid grid-cols-3 gap-4 text-center mb-4">
                        <div>
                          <div className="text-lg font-bold text-blue-400">
                            {symbolInfo.impact.impact.referenceCount}
                          </div>
                          <div className="text-xs text-gray-400">References</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-green-400">
                            {symbolInfo.impact.impact.fileSpread}
                          </div>
                          <div className="text-xs text-gray-400">Files</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-purple-400">
                            {symbolInfo.impact.impact.complexity}
                          </div>
                          <div className="text-xs text-gray-400">Complexity</div>
                        </div>
                      </div>
                      
                      {symbolInfo.impact.recommendations.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">Recommendations:</h4>
                          <div className="space-y-1">
                            {symbolInfo.impact.recommendations.map((rec, index) => (
                              <div key={index} className="text-sm flex items-start space-x-2">
                                <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                                <span>{rec.message} - {rec.action}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* References */}
                <div>
                  <h3 className="font-semibold mb-2 flex items-center space-x-2">
                    <GitBranch className="w-4 h-4" />
                    <span>References ({symbolInfo.references.length})</span>
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-auto">
                    {symbolInfo.references.slice(0, 20).map((ref, index) => (
                      <div key={index} className="p-2 bg-gray-800 rounded border border-gray-700">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">{ref.file_path}:{ref.line}</span>
                          <span className="text-xs bg-gray-700 px-2 py-1 rounded">{ref.reference_type}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'dependencies' && (
          <div className="space-y-4">
            {/* Dependency Graph */}
            <div>
              <h3 className="font-semibold mb-2 flex items-center space-x-2">
                <GitBranch className="w-4 h-4" />
                <span>Dependency Graph ({dependencies.length})</span>
              </h3>
              <div className="space-y-2 max-h-64 overflow-auto">
                {dependencies.map((dep, index) => (
                  <div key={index} className="p-2 bg-gray-800 rounded border border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm">{dep.from_name}</span>
                        <span className="text-gray-400">→</span>
                        <span className="text-sm">{dep.to_name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs bg-gray-700 px-2 py-1 rounded">{dep.relationship}</span>
                        <span className="text-xs text-gray-400">depth: {dep.depth}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Circular Dependencies */}
            {circularDeps.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <span>Circular Dependencies ({circularDeps.length})</span>
                </h3>
                <div className="space-y-2">
                  {circularDeps.map((cycle, index) => (
                    <div key={index} className="p-2 bg-red-900/20 border border-red-700 rounded">
                      <div className="text-sm text-red-300">
                        Cycle detected in dependency path
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="space-y-4">
            {/* Hubs (Most Connected Nodes) */}
            <div>
              <h3 className="font-semibold mb-2 flex items-center space-x-2">
                <Network className="w-4 h-4" />
                <span>Most Connected Symbols ({hubs.length})</span>
              </h3>
              <div className="space-y-2">
                {hubs.map((hub, index) => (
                  <div key={index} className="p-3 bg-gray-800 rounded border border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{hub.name}</span>
                        <span className="text-xs bg-gray-700 px-2 py-1 rounded">{hub.type}</span>
                      </div>
                      <span className="text-sm text-blue-400">{hub.connection_count} connections</span>
                    </div>
                    <div className="text-sm text-gray-400">{hub.path}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {hub.outgoing_count} outgoing, {hub.incoming_count} incoming
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Unused Exports */}
            {unusedExports.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-yellow-400" />
                  <span>Unused Exports ({unusedExports.length})</span>
                </h3>
                <div className="space-y-2">
                  {unusedExports.map((exp, index) => (
                    <div key={index} className="p-2 bg-yellow-900/20 border border-yellow-700 rounded">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm">{exp.name}</span>
                        <span className="text-xs bg-gray-700 px-2 py-1 rounded">{exp.type}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">{exp.path}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Export Options */}
            <div>
              <h3 className="font-semibold mb-2 flex items-center space-x-2">
                <Download className="w-4 h-4" />
                <span>Export Graph</span>
              </h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => exportGraph('json')}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
                >
                  JSON
                </button>
                <button
                  onClick={() => exportGraph('cypher')}
                  className="px-3 py-2 bg-green-600 hover:bg-green-700 rounded text-sm transition-colors"
                >
                  Cypher
                </button>
                <button
                  onClick={() => exportGraph('gexf')}
                  className="px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded text-sm transition-colors"
                >
                  GEXF
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CKGPanel;
