/**
 * User Flow Management Hook
 * Manages user flow state, toggling, and isolation
 */

import { useState, useEffect, useCallback } from 'react';

export const useUserFlows = (projectId, scanResults) => {
  const [flows, setFlows] = useState([]);
  const [activeFlows, setActiveFlows] = useState(new Set());
  const [isolatedFlow, setIsolatedFlow] = useState(null);
  const [flowAnalysis, setFlowAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load user flows when project changes
  useEffect(() => {
    if (projectId && scanResults) {
      loadUserFlows();
    }
  }, [projectId, scanResults]);

  const loadUserFlows = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Detect flows from scan results
      const response = await fetch(`/api/flows/${projectId}/detect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scanResults })
      });

      const data = await response.json();
      
      if (data.success) {
        setFlows(data.data.flows);
        setFlowAnalysis(data.data.analysis);
      } else {
        throw new Error(data.message || 'Failed to load user flows');
      }
    } catch (err) {
      console.error('Failed to load user flows:', err);
      setError(err.message);
      
      // Fallback to client-side detection
      const detectedFlows = detectFlowsClientSide(scanResults);
      setFlows(detectedFlows);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFlow = useCallback((flowId, isActive) => {
    setActiveFlows(prev => {
      const newSet = new Set(prev);
      if (isActive) {
        newSet.add(flowId);
      } else {
        newSet.delete(flowId);
      }
      return newSet;
    });

    // Clear isolation if toggling multiple flows
    if (isolatedFlow && activeFlows.size > 1) {
      setIsolatedFlow(null);
    }
  }, [isolatedFlow, activeFlows.size]);

  const isolateFlow = useCallback(async (flowId) => {
    setIsLoading(true);
    
    try {
      // Get detailed flow data
      const response = await fetch(`/api/flows/${projectId}/${flowId}/isolate`);
      const data = await response.json();
      
      if (data.success) {
        setIsolatedFlow(data.data);
        setActiveFlows(new Set([flowId]));
      } else {
        throw new Error(data.message || 'Failed to isolate flow');
      }
    } catch (err) {
      console.error('Failed to isolate flow:', err);
      setError(err.message);
      
      // Fallback to basic isolation
      const flow = flows.find(f => f.id === flowId);
      if (flow) {
        setIsolatedFlow(flow);
        setActiveFlows(new Set([flowId]));
      }
    } finally {
      setIsLoading(false);
    }
  }, [projectId, flows]);

  const clearIsolation = useCallback(() => {
    setIsolatedFlow(null);
  }, []);

  const toggleAllFlows = useCallback((isActive) => {
    if (isActive) {
      setActiveFlows(new Set(flows.map(f => f.id)));
    } else {
      setActiveFlows(new Set());
    }
    setIsolatedFlow(null);
  }, [flows]);

  const toggleCriticalFlows = useCallback(() => {
    const criticalFlows = flows.filter(f => f.isCritical);
    setActiveFlows(new Set(criticalFlows.map(f => f.id)));
    setIsolatedFlow(null);
  }, [flows]);

  const analyzeFlow = useCallback(async (flowId) => {
    try {
      const response = await fetch(`/api/flows/${projectId}/${flowId}/analyze`);
      const data = await response.json();
      
      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to analyze flow');
      }
    } catch (err) {
      console.error('Failed to analyze flow:', err);
      throw err;
    }
  }, [projectId]);

  const compareFlows = useCallback(async (flowIds) => {
    try {
      const response = await fetch(`/api/flows/${projectId}/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flowIds })
      });

      const data = await response.json();
      
      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to compare flows');
      }
    } catch (err) {
      console.error('Failed to compare flows:', err);
      throw err;
    }
  }, [projectId]);

  const getFlowIntersections = useCallback(() => {
    if (activeFlows.size < 2) return [];

    const activeFlowObjects = flows.filter(f => activeFlows.has(f.id));
    const intersections = [];

    // Find files that appear in multiple flows
    const fileFlowMap = new Map();
    
    activeFlowObjects.forEach(flow => {
      flow.files.forEach(file => {
        if (!fileFlowMap.has(file)) {
          fileFlowMap.set(file, []);
        }
        fileFlowMap.get(file).push(flow);
      });
    });

    fileFlowMap.forEach((flowList, file) => {
      if (flowList.length > 1) {
        intersections.push({
          file,
          flows: flowList,
          count: flowList.length
        });
      }
    });

    return intersections.sort((a, b) => b.count - a.count);
  }, [flows, activeFlows]);

  const getFlowMetrics = useCallback(() => {
    const activeFlowObjects = flows.filter(f => activeFlows.has(f.id));
    
    if (activeFlowObjects.length === 0) {
      return null;
    }

    const totalFiles = new Set();
    let totalComplexity = 0;
    let totalSteps = 0;

    activeFlowObjects.forEach(flow => {
      flow.files.forEach(file => totalFiles.add(file));
      totalComplexity += flow.metrics?.complexity || 0;
      totalSteps += flow.steps?.length || 0;
    });

    return {
      totalFiles: totalFiles.size,
      avgComplexity: totalComplexity / activeFlowObjects.length,
      totalSteps,
      criticalFlows: activeFlowObjects.filter(f => f.isCritical).length
    };
  }, [flows, activeFlows]);

  return {
    // State
    flows,
    activeFlows,
    isolatedFlow,
    flowAnalysis,
    isLoading,
    error,
    
    // Actions
    toggleFlow,
    isolateFlow,
    clearIsolation,
    toggleAllFlows,
    toggleCriticalFlows,
    analyzeFlow,
    compareFlows,
    
    // Computed values
    flowIntersections: getFlowIntersections(),
    flowMetrics: getFlowMetrics()
  };
};

// Client-side flow detection fallback
const detectFlowsClientSide = (scanResults) => {
  const flows = [];
  
  // Simple authentication flow detection
  const authFiles = scanResults.files.filter(file => 
    file.filePath.toLowerCase().includes('auth') ||
    file.filePath.toLowerCase().includes('login') ||
    file.content?.includes('authenticate')
  );
  
  if (authFiles.length > 0) {
    flows.push({
      id: 'auth-flow-detected',
      name: 'Authentication',
      description: 'User authentication and login flow',
      color: '#3b82f6',
      icon: '🔐',
      files: authFiles.map(f => f.filePath),
      isCritical: true,
      category: 'authentication'
    });
  }

  // Simple visualization flow detection
  const vizFiles = scanResults.files.filter(file =>
    file.filePath.toLowerCase().includes('graph') ||
    file.filePath.toLowerCase().includes('visual') ||
    file.content?.includes('d3.')
  );
  
  if (vizFiles.length > 0) {
    flows.push({
      id: 'viz-flow-detected',
      name: 'Data Visualization',
      description: 'Interactive graphs and charts',
      color: '#f59e0b',
      icon: '📊',
      files: vizFiles.map(f => f.filePath),
      isCritical: false,
      category: 'visualization'
    });
  }

  // Simple AI flow detection
  const aiFiles = scanResults.files.filter(file =>
    file.filePath.toLowerCase().includes('ai') ||
    file.content?.includes('openai') ||
    file.content?.includes('anthropic')
  );
  
  if (aiFiles.length > 0) {
    flows.push({
      id: 'ai-flow-detected',
      name: 'AI Insights',
      description: 'AI-powered analysis and recommendations',
      color: '#8b5cf6',
      icon: '🤖',
      files: aiFiles.map(f => f.filePath),
      isCritical: false,
      category: 'ai'
    });
  }

  return flows;
};

export default useUserFlows;
