import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { 
  Activity, 
  Server, 
  Database, 
  Wifi, 
  Cpu, 
  HardDrive, 
  HardDriveIcon, 
  Clock,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

const SystemMetricsDashboard = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  // Fetch system metrics
  const metricsQuery = useQuery({
    queryKey: ['system-metrics'],
    queryFn: async () => {
      const response = await fetch('/api/metrics');
      const data = await response.json();
      return data;
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Fetch health data
  const healthQuery = useQuery({
    queryKey: ['health-detailed'],
    queryFn: async () => {
      const response = await fetch('/api/health?detailed=true');
      const data = await response.json();
      return data;
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const metrics = metricsQuery.data || {};
  const health = healthQuery.data || {};
  const isLoading = metricsQuery.isLoading || healthQuery.isLoading;

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatUptime = (seconds) => {
    if (!seconds) return '0s';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ok':
      case 'connected':
        return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'error':
      case 'disconnected':
        return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'warning':
        return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      default:
        return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'ok':
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'error':
      case 'disconnected':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-400" />;
      default:
        return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  const serverMetrics = metrics.server || {};
  const queueMetrics = metrics.scanQueue || {};
  const websocketMetrics = metrics.websocket || {};

  return (
    <div className={className}>
      {/* System Metrics Trigger */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-400 bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600 hover:text-gray-300 transition-colors"
      >
        <Activity className="w-4 h-4" />
        <span>System</span>
        {health.status === 'error' && (
          <span className="px-1.5 py-0.5 text-xs bg-red-600 text-white rounded-full">
            !
          </span>
        )}
      </button>

      {/* System Metrics Modal */}
      {isOpen && createPortal(
        <div className="modal-container z-[99997] p-4 sm:p-6 animate-fade-in" onClick={() => setIsOpen(false)}>
          <div className="modal-content w-full max-w-6xl animate-scale-up" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <div>
                <h2 className="text-xl font-semibold text-white">System Metrics Dashboard</h2>
                <p className="text-gray-400 text-sm">Real-time system performance and health monitoring</p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    metricsQuery.refetch();
                    healthQuery.refetch();
                  }}
                  className="flex items-center space-x-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Refresh</span>
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors"
                  title="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* System Overview */}
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-lg font-medium text-white mb-4">System Overview</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                  <div className="flex items-center space-x-2 mb-2">
                    <Server className="w-5 h-5 text-blue-400" />
                    <span className="text-white font-medium">Server</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-400">
                    {formatUptime(serverMetrics.uptime)}
                  </div>
                  <div className="text-xs text-gray-400">Uptime</div>
                </div>
                <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                  <div className="flex items-center space-x-2 mb-2">
                    <Database className="w-5 h-5 text-green-400" />
                    <span className="text-white font-medium">Database</span>
                  </div>
                  <div className="text-2xl font-bold text-green-400">
                    {health.services?.database?.status === 'ok' ? 'Connected' : 'Error'}
                  </div>
                  <div className="text-xs text-gray-400">Status</div>
                </div>
                <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                  <div className="flex items-center space-x-2 mb-2">
                    <Wifi className="w-5 h-5 text-purple-400" />
                    <span className="text-white font-medium">WebSocket</span>
                  </div>
                  <div className="text-2xl font-bold text-purple-400">
                    {websocketMetrics.connections || 0}
                  </div>
                  <div className="text-xs text-gray-400">Connections</div>
                </div>
                <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                  <div className="flex items-center space-x-2 mb-2">
                    <BarChart3 className="w-5 h-5 text-orange-400" />
                    <span className="text-white font-medium">Queue</span>
                  </div>
                  <div className="text-2xl font-bold text-orange-400">
                    {queueMetrics.pending || 0}
                  </div>
                  <div className="text-xs text-gray-400">Pending Jobs</div>
                </div>
              </div>
            </div>

            {/* Detailed Metrics */}
            <div className="p-6 space-y-6">
              {/* Server Performance */}
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Server Performance</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-400 text-sm">Memory Usage</span>
                      <HardDriveIcon className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="text-xl font-bold text-white">
                      {formatBytes(serverMetrics.memory?.heapUsed || 0)}
                    </div>
                    <div className="text-xs text-gray-400">
                      of {formatBytes(serverMetrics.memory?.heapTotal || 0)}
                    </div>
                    <div className="mt-2 w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${serverMetrics.memory?.heapTotal ? 
                            (serverMetrics.memory.heapUsed / serverMetrics.memory.heapTotal * 100) : 0}%` 
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-400 text-sm">CPU Usage</span>
                      <Cpu className="w-4 h-4 text-green-400" />
                    </div>
                    <div className="text-xl font-bold text-white">
                      {serverMetrics.cpu ? 
                        `${Math.round(serverMetrics.cpu.user / 1000000)}ms` : 'N/A'
                      }
                    </div>
                    <div className="text-xs text-gray-400">User CPU Time</div>
                  </div>

                  <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-400 text-sm">Disk Usage</span>
                      <HardDrive className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="text-xl font-bold text-white">
                      {formatBytes(serverMetrics.memory?.external || 0)}
                    </div>
                    <div className="text-xs text-gray-400">External Memory</div>
                  </div>
                </div>
              </div>

              {/* Service Status */}
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Service Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {health.services && Object.entries(health.services).map(([service, data]) => (
                    <div key={service} className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(data.status)}
                          <span className="text-white font-medium capitalize">
                            {service.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(data.status)}`}>
                          {data.status}
                        </span>
                      </div>
                      <div className="text-sm text-gray-400">
                        {data.message || 'No status message'}
                      </div>
                      {data.features && (
                        <div className="mt-2 text-xs text-gray-500">
                          Features: {Object.keys(data.features).join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Queue Details */}
              {queueMetrics && (
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Scan Queue Details</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                      <div className="text-2xl font-bold text-yellow-400">{queueMetrics.pending || 0}</div>
                      <div className="text-sm text-gray-400">Pending</div>
                    </div>
                    <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                      <div className="text-2xl font-bold text-blue-400">{queueMetrics.running || 0}</div>
                      <div className="text-sm text-gray-400">Running</div>
                    </div>
                    <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                      <div className="text-2xl font-bold text-green-400">{queueMetrics.completed || 0}</div>
                      <div className="text-sm text-gray-400">Completed</div>
                    </div>
                    <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                      <div className="text-2xl font-bold text-red-400">{queueMetrics.failed || 0}</div>
                      <div className="text-sm text-gray-400">Failed</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-700 text-xs text-gray-500">
              <div className="flex items-center justify-between">
                <span>Last updated: {new Date().toLocaleTimeString()}</span>
                <span>Auto-refreshing every 5 seconds</span>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default SystemMetricsDashboard;
