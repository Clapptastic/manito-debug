import React, { useState, useEffect } from 'react';
import { 
  Folder, 
  Plus, 
  Clock, 
  FileText, 
  GitBranch, 
  AlertTriangle, 
  MoreVertical, 
  Trash2, 
  Edit3,
  Download,
  Upload,
  Calendar,
  BarChart3,
  FolderOpen,
  Copy
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from './Toast';

const ProjectManager = ({ onProjectSelect, currentProjectId, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectPath, setNewProjectPath] = useState('');
  const toast = useToast();
  const queryClient = useQueryClient();

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

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => setSelectedProject(null);
    if (selectedProject) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [selectedProject]);

  // Fetch projects
  const projectsQuery = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await fetch('/api/projects');
      const data = await response.json();
      return data.success ? data.data : [];
    },
    staleTime: 30000,
  });

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: async (projectData) => {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to create project');
      return data.data;
    },
    onSuccess: (newProject) => {
      queryClient.invalidateQueries(['projects']);
      setShowCreateForm(false);
      setNewProjectName('');
      setNewProjectPath('');
      toast.success('Project created successfully!');
      onProjectSelect?.(newProject);
    },
    onError: (error) => {
      toast.error(`Failed to create project: ${error.message}`);
    },
  });

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId) => {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to delete project');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      toast.success('Project deleted successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to delete project: ${error.message}`);
    },
  });

  const handleCreateProject = (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) {
      toast.error('Project name is required');
      return;
    }
    createProjectMutation.mutate({
      name: newProjectName.trim(),
      path: newProjectPath.trim() || null,
    });
  };

  const handleDeleteProject = (projectId, projectName) => {
    if (confirm(`Are you sure you want to delete project "${projectName}"? This action cannot be undone.`)) {
      deleteProjectMutation.mutate(projectId);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getProjectStats = (project) => {
    // Extract file count from description if available
    const fileCountMatch = project.description?.match(/(\d+)\s+files?/);
    const fileCount = fileCountMatch ? parseInt(fileCountMatch[1]) : 0;
    
    // Determine project type from path or description
    const projectType = getProjectType(project);
    
    return {
      scanCount: project.scanCount || 0,
      fileCount: fileCount,
      lastScan: project.last_scanned_at ? formatDate(project.last_scanned_at) : 'Never',
      totalSize: project.totalSize || 0,
      projectType: projectType,
      status: project.scan_status || 'pending',
      created: formatDate(project.created_at),
      updated: formatDate(project.updated_at)
    };
  };

  const getProjectType = (project) => {
    const path = project.path?.toLowerCase() || '';
    const description = project.description?.toLowerCase() || '';
    
    if (path.includes('browser-temp') || description.includes('browser directory upload')) {
      return 'Browser Upload';
    }
    if (path.includes('extracted') || description.includes('uploaded project')) {
      return 'File Upload';
    }
    if (path.includes('uploads')) {
      return 'Upload';
    }
    if (path.includes('src') || path.includes('components')) {
      return 'Source Code';
    }
    if (path.includes('server') || path.includes('api')) {
      return 'Backend';
    }
    if (path.includes('client') || path.includes('frontend')) {
      return 'Frontend';
    }
    if (path.includes('docs') || path.includes('documentation')) {
      return 'Documentation';
    }
    if (path.includes('test') || path.includes('spec')) {
      return 'Test';
    }
    return 'Project';
  };

  const projects = projectsQuery.data || [];
  const isLoading = projectsQuery.isLoading;

  return (
    <div className={className}>
      {/* Project Manager Trigger */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-2 text-xs sm:text-sm text-gray-400 bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600 hover:text-gray-300 transition-colors"
      >
        <Folder className="w-3 h-3 sm:w-4 sm:h-4" />
        <span className="hidden sm:inline">Projects</span>
        <span className="sm:hidden">Proj</span>
        {projects.length > 0 && (
          <span className="px-1 sm:px-1.5 py-0.5 text-xs bg-blue-600 text-white rounded-full">
            {projects.length}
          </span>
        )}
      </button>

      {/* Project Manager Modal - High z-index to appear above all elements */}
      {isOpen && (
        <div className="modal-container z-[99999] p-4 sm:p-6 animate-fade-in" onClick={() => setIsOpen(false)}>
          <div className="modal-content w-full max-w-4xl animate-scale-up" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-3 sm:p-6 border-b border-gray-700">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-white">Project Manager</h2>
                <p className="text-gray-400 text-xs sm:text-sm">Manage your code analysis projects</p>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-3">
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-xs sm:text-sm"
                >
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">New Project</span>
                  <span className="sm:hidden">New</span>
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 sm:p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors"
                  title="Close"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Create Project Form */}
            {showCreateForm && (
              <div className="p-6 border-b border-gray-700 bg-gray-800">
                <h3 className="text-lg font-medium text-white mb-4">Create New Project</h3>
                <form onSubmit={handleCreateProject} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Project Name *
                    </label>
                    <input
                      type="text"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      placeholder="Enter project name"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Project Path (Optional)
                    </label>
                    <input
                      type="text"
                      value={newProjectPath}
                      onChange={(e) => setNewProjectPath(e.target.value)}
                      placeholder="/path/to/project"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      disabled={createProjectMutation.isLoading}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                      {createProjectMutation.isLoading ? 'Creating...' : 'Create Project'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateForm(false);
                        setNewProjectName('');
                        setNewProjectPath('');
                      }}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Projects List */}
            <div className="max-h-[60vh] sm:max-h-96 overflow-y-auto px-4 sm:px-6">
              {isLoading ? (
                <div className="p-6 text-center text-gray-400">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="mt-2">Loading projects...</p>
                </div>
              ) : projects.length === 0 ? (
                <div className="p-6 text-center text-gray-400">
                  <Folder className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                  <h3 className="text-lg font-medium text-gray-300 mb-2">No projects yet</h3>
                  <p className="text-gray-500 mb-4">Create your first project to start analyzing code</p>
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    Create Project
                  </button>
                </div>
              ) : (
                <div className="p-6 space-y-4">
                  {projects.map((project) => {
                    const stats = getProjectStats(project);
                    const isCurrentProject = project.id === currentProjectId;
                    
                    return (
                      <div
                        key={project.id}
                        className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                          isCurrentProject
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-gray-700 bg-gray-800 hover:border-gray-600 hover:bg-gray-750'
                        }`}
                        onClick={() => {
                          onProjectSelect?.(project);
                          setIsOpen(false);
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <Folder className={`w-5 h-5 ${isCurrentProject ? 'text-blue-400' : 'text-gray-400'}`} />
                              <h3 className={`text-lg font-medium ${isCurrentProject ? 'text-blue-400' : 'text-white'}`}>
                                {project.name}
                              </h3>
                              {isCurrentProject && (
                                <span className="px-2 py-1 text-xs bg-blue-600 text-white rounded-full">
                                  Current
                                </span>
                              )}
                            </div>
                            
                            {project.path && (
                              <p className="text-gray-400 text-sm mb-3 font-mono">
                                {project.path}
                              </p>
                            )}

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-xs sm:text-sm">
                              <div className="flex items-center space-x-1 sm:space-x-2">
                                <FileText className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                                <span className="text-gray-300">{stats.fileCount} files</span>
                              </div>
                              <div className="flex items-center space-x-1 sm:space-x-2">
                                <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                                <span className="text-gray-300 hidden sm:inline">Last: {stats.lastScan}</span>
                                <span className="text-gray-300 sm:hidden">{stats.lastScan}</span>
                              </div>
                              <div className="flex items-center space-x-1 sm:space-x-2">
                                <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                                <span className="text-gray-300 hidden sm:inline">{stats.created}</span>
                                <span className="text-gray-300 sm:hidden">{stats.created.split(' ')[0]}</span>
                              </div>
                              <div className="flex items-center space-x-1 sm:space-x-2">
                                <span className={`px-1 sm:px-2 py-1 text-xs rounded-full ${
                                  stats.status === 'completed' ? 'bg-green-600 text-green-100' :
                                  stats.status === 'failed' ? 'bg-red-600 text-red-100' :
                                  'bg-yellow-600 text-yellow-100'
                                }`}>
                                  {stats.status}
                                </span>
                              </div>
                            </div>
                            
                            {stats.projectType !== 'Project' && (
                              <div className="mt-2">
                                <span className="inline-flex items-center px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded-full">
                                  {stats.projectType}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center space-x-2 ml-4">
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedProject(selectedProject === project.id ? null : project.id);
                                }}
                                className="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded"
                                title="Project actions"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                              
                              {selectedProject === project.id && (
                                <div className="absolute right-0 top-8 z-[99986] bg-gray-800 border border-gray-600 rounded-lg shadow-lg py-1 min-w-48">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onProjectSelect(project);
                                      setSelectedProject(null);
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center space-x-2"
                                  >
                                    <FolderOpen className="w-4 h-4" />
                                    <span>Open Project</span>
                                  </button>
                                  
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigator.clipboard.writeText(project.path);
                                      toast.success('Project path copied to clipboard');
                                      setSelectedProject(null);
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center space-x-2"
                                  >
                                    <Copy className="w-4 h-4" />
                                    <span>Copy Path</span>
                                  </button>
                                  
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const projectInfo = `Project: ${project.name}\nPath: ${project.path}\nDescription: ${project.description || 'No description'}\nLast Scan: ${project.last_scanned_at || 'Never'}`;
                                      navigator.clipboard.writeText(projectInfo);
                                      toast.success('Project details copied to clipboard');
                                      setSelectedProject(null);
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center space-x-2"
                                  >
                                    <FileText className="w-4 h-4" />
                                    <span>Copy Details</span>
                                  </button>
                                  
                                  <div className="border-t border-gray-600 my-1"></div>
                                  
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteProject(project.id, project.name);
                                      setSelectedProject(null);
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-900/20 flex items-center space-x-2"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    <span>Delete Project</span>
                                  </button>
                                </div>
                              )}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteProject(project.id, project.name);
                              }}
                              className="p-1 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-700 text-xs text-gray-500">
              <div className="flex items-center justify-between">
                <span>{projects.length} project{projects.length !== 1 ? 's' : ''}</span>
                <span>Click to switch projects</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectManager;
