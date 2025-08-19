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
  BarChart3
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
    return {
      scanCount: project.scanCount || 0,
      fileCount: project.fileCount || 0,
      lastScan: project.lastScanAt ? formatDate(project.lastScanAt) : 'Never',
      totalSize: project.totalSize || 0,
    };
  };

  const projects = projectsQuery.data || [];
  const isLoading = projectsQuery.isLoading;

  return (
    <div className={className}>
      {/* Project Manager Trigger */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-400 bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600 hover:text-gray-300 transition-colors"
      >
        <Folder className="w-4 h-4" />
        <span>Projects</span>
        {projects.length > 0 && (
          <span className="px-1.5 py-0.5 text-xs bg-blue-600 text-white rounded-full">
            {projects.length}
          </span>
        )}
      </button>

      {/* Project Manager Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setIsOpen(false)} />
          <div className="relative w-full max-w-4xl bg-gray-900 rounded-lg border border-gray-700 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <div>
                <h2 className="text-xl font-semibold text-white">Project Manager</h2>
                <p className="text-gray-400 text-sm">Manage your code analysis projects</p>
              </div>
              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>New Project</span>
              </button>
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
            <div className="max-h-96 overflow-y-auto">
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

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div className="flex items-center space-x-2">
                                <BarChart3 className="w-4 h-4 text-gray-500" />
                                <span className="text-gray-300">{stats.scanCount} scans</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <FileText className="w-4 h-4 text-gray-500" />
                                <span className="text-gray-300">{stats.fileCount} files</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Clock className="w-4 h-4 text-gray-500" />
                                <span className="text-gray-300">Last: {stats.lastScan}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <GitBranch className="w-4 h-4 text-gray-500" />
                                <span className="text-gray-300">
                                  {project.dependencies?.length || 0} deps
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 ml-4">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                // TODO: Implement project actions
                                toast.info('Project actions coming soon!');
                              }}
                              className="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
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
