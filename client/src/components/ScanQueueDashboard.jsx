import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Clock, 
  Play, 
  Pause, 
  X, 
  CheckCircle, 
  AlertCircle, 
  Loader, 
  Trash2,
  RefreshCw,
  BarChart3,
  FileText,
  Activity
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from './Toast';

const ScanQueueDashboard = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen]);

  const toast = useToast();
  const queryClient = useQueryClient();

  // Fetch queue status
  const queueStatusQuery = useQuery({
    queryKey: ['scan-queue-status'],
    queryFn: async () => {
      const response = await fetch('/api/scan/queue');
      const data = await response.json();
      return data.success ? data.data : {};
    },
    refetchInterval: 2000, // Refresh every 2 seconds
  });

  // Fetch all jobs
  const jobsQuery = useQuery({
    queryKey: ['scan-jobs'],
    queryFn: async () => {
      const response = await fetch('/api/scan/jobs?limit=50');
      const data = await response.json();
      return data.success ? data.data : [];
    },
    refetchInterval: 2000, // Refresh every 2 seconds
  });

  // Cancel job mutation
  const cancelJobMutation = useMutation({
    mutationFn: async (jobId) => {
      const response = await fetch(`/api/scan/jobs/${jobId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to cancel job');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['scan-queue-status']);
      queryClient.invalidateQueries(['scan-jobs']);
      toast.success('Job cancelled successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to cancel job: ${error.message}`);
    },
  });

  const handleCancelJob = (jobId, jobName) => {
    if (confirm(`Are you sure you want to cancel job "${jobName}"?`)) {
      cancelJobMutation.mutate(jobId);
    }
  };

  const getJobStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'running':
        return <Loader className="w-4 h-4 text-blue-400 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      case 'cancelled':
        return <X className="w-4 h-4 text-gray-400" />;
      default:
        return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  const getJobStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'running':
        return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'completed':
        return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'failed':
        return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'cancelled':
        return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
      default:
        return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  const formatDuration = (startTime, endTime) => {
    if (!startTime) return 'N/A';
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const duration = Math.floor((end - start) / 1000);
    
    if (duration < 60) return `${duration}s`;
    if (duration < 3600) return `${Math.floor(duration / 60)}m ${duration % 60}s`;
    return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const queueStatus = queueStatusQuery.data || {};
  const jobs = jobsQuery.data || [];
  const isLoading = queueStatusQuery.isLoading || jobsQuery.isLoading;

  const pendingJobs = jobs.filter(job => job.status === 'pending');
  const runningJobs = jobs.filter(job => job.status === 'running');
  const completedJobs = jobs.filter(job => job.status === 'completed');
  const failedJobs = jobs.filter(job => job.status === 'failed');

  return (
    <div className={className}>
      {/* Queue Dashboard Trigger */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center space-x-2 px-2 sm:px-3 py-2 text-xs sm:text-sm text-gray-400 bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600 hover:text-gray-300 transition-colors"
      >
        <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
        <span className="hidden sm:inline">Queue</span>
        <span className="sm:hidden">Q</span>
        {(pendingJobs.length > 0 || runningJobs.length > 0) && (
          <span className="px-1 py-0.5 text-xs bg-orange-600 text-white rounded-full">
            {pendingJobs.length + runningJobs.length}
          </span>
        )}
      </button>

      {/* Scan Queue Dashboard Modal */}
      {isOpen && createPortal(
        <div className="modal-container z-[99993] p-4 sm:p-6 animate-fade-in" onClick={() => setIsOpen(false)}>
          <div className="modal-content w-full max-w-6xl animate-scale-up" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-700 flex-shrink-0">
              <div className="flex-1">
                <h2 className="text-lg sm:text-xl font-semibold text-white">Scan Queue Dashboard</h2>
                <p className="text-gray-400 text-xs sm:text-sm">Monitor and manage scan jobs</p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    queryClient.invalidateQueries(['scan-queue-status']);
                    queryClient.invalidateQueries(['scan-jobs']);
                  }}
                  className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-xs sm:text-sm"
                >
                  <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-center w-8 h-8 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Queue Status Overview */}
            <div className="p-4 sm:p-6 border-b border-gray-700 flex-shrink-0">
              <h3 className="text-base sm:text-lg font-medium text-white mb-4">Queue Status</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-3 sm:p-4 bg-gray-800 rounded-lg border border-gray-700">
                  <div className="flex items-center space-x-2 mb-2">
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
                    <span className="text-white font-medium text-sm sm:text-base">Pending</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-yellow-400">{pendingJobs.length}</div>
                </div>
                <div className="p-3 sm:p-4 bg-gray-800 rounded-lg border border-gray-700">
                  <div className="flex items-center space-x-2 mb-2">
                    <Loader className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                    <span className="text-white font-medium text-sm sm:text-base">Running</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-blue-400">{runningJobs.length}</div>
                </div>
                <div className="p-3 sm:p-4 bg-gray-800 rounded-lg border border-gray-700">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
                    <span className="text-white font-medium text-sm sm:text-base">Completed</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-green-400">{completedJobs.length}</div>
                </div>
                <div className="p-3 sm:p-4 bg-gray-800 rounded-lg border border-gray-700">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
                    <span className="text-white font-medium text-sm sm:text-base">Failed</span>
                  </div>
                  <div className="text-xl sm:text-2xl font-bold text-red-400">{failedJobs.length}</div>
                </div>
              </div>
            </div>

            {/* Jobs List */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 sm:p-6 text-center text-gray-400">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="mt-2 text-sm">Loading queue status...</p>
                </div>
              ) : jobs.length === 0 ? (
                <div className="p-4 sm:p-6 text-center text-gray-400">
                  <BarChart3 className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-4 text-gray-600" />
                  <h3 className="text-base sm:text-lg font-medium text-gray-300 mb-2">No scan jobs</h3>
                  <p className="text-gray-500 text-sm">Start a scan to see jobs in the queue</p>
                </div>
              ) : (
                <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                  {jobs.map((job) => (
                    <div
                      key={job.id}
                      className={`p-3 sm:p-4 rounded-lg border transition-colors ${
                        selectedJob?.id === job.id
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                      }`}
                      onClick={() => setSelectedJob(selectedJob?.id === job.id ? null : job)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 sm:space-x-3 mb-2">
                            {getJobStatusIcon(job.status)}
                            <h3 className="text-base sm:text-lg font-medium text-white truncate">
                              {job.name || `Scan Job ${job.id}`}
                            </h3>
                            <span className={`px-2 py-1 text-xs rounded-full border flex-shrink-0 ${getJobStatusColor(job.status)}`}>
                              {job.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 text-xs sm:text-sm mb-3">
                            <div className="flex items-center space-x-2">
                              <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" />
                              <span className="text-gray-300 truncate">
                                Duration: {formatDuration(job.startedAt, job.completedAt)}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <FileText className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" />
                              <span className="text-gray-300 truncate">
                                Files: {job.progress?.totalFiles || 0}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Activity className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" />
                              <span className="text-gray-300 truncate">
                                Progress: {job.progress?.percentage || 0}%
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" />
                              <span className="text-gray-300 truncate">
                                Started: {formatDate(job.startedAt)}
                              </span>
                            </div>
                          </div>

                          {job.error && (
                            <div className="text-red-400 text-xs sm:text-sm bg-red-500/10 p-2 rounded border border-red-500/20">
                              Error: {job.error}
                            </div>
                          )}

                          {selectedJob?.id === job.id && (
                            <div className="mt-3 p-3 bg-gray-700 rounded border border-gray-600">
                              <h4 className="text-xs sm:text-sm font-medium text-white mb-2">Job Details</h4>
                              <div className="space-y-1 text-xs text-gray-300">
                                <div>ID: {job.id}</div>
                                <div>Created: {formatDate(job.createdAt)}</div>
                                <div>Started: {formatDate(job.startedAt)}</div>
                                {job.completedAt && <div>Completed: {formatDate(job.completedAt)}</div>}
                                {job.scanData?.path && <div>Path: {job.scanData.path}</div>}
                                {job.scanData?.options && <div>Options: {JSON.stringify(job.scanData.options)}</div>}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center space-x-1 sm:space-x-2 ml-2 sm:ml-4 flex-shrink-0">
                          {(job.status === 'pending' || job.status === 'running') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelJob(job.id, job.name);
                              }}
                              className="p-1 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded"
                              title="Cancel job"
                            >
                              <X className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedJob(selectedJob?.id === job.id ? null : job);
                            }}
                            className="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded"
                            title="Toggle details"
                          >
                            <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 sm:p-4 border-t border-gray-700 text-xs text-gray-500 flex-shrink-0">
              <div className="flex items-center justify-between w-full">
                <span>{jobs.length} job{jobs.length !== 1 ? 's' : ''} total</span>
                <span className="hidden sm:inline">Auto-refreshing every 2 seconds</span>
                <span className="sm:hidden">Auto-refresh: 2s</span>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ScanQueueDashboard;
