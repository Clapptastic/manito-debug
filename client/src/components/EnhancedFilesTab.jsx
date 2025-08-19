import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Search, 
  Filter, 
  SortAsc, 
  SortDesc, 
  Code, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  HardDrive,
  GitBranch,
  Eye,
  Download,
  Copy,
  MoreVertical,
  ExternalLink
} from 'lucide-react';
import { useToast } from './Toast';

const EnhancedFilesTab = ({ files = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const { toast } = useToast();
  const [filterType, setFilterType] = useState('all');
  const [filterComplexity, setFilterComplexity] = useState('all');
  const [selectedFile, setSelectedFile] = useState(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => setSelectedFile(null);
    if (selectedFile) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [selectedFile]);

  const fileTypes = useMemo(() => {
    const types = {};
    files.forEach(file => {
      const ext = file.filePath?.split('.').pop()?.toLowerCase() || 'unknown';
      types[ext] = (types[ext] || 0) + 1;
    });
    return types;
  }, [files]);

  const filteredAndSortedFiles = useMemo(() => {
    let filtered = files.filter(file => {
      // Search filter
      const matchesSearch = searchTerm === '' || 
        file.filePath?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        file.functions?.some(f => f.name?.toLowerCase().includes(searchTerm.toLowerCase()));

      // Type filter
      const matchesType = filterType === 'all' || 
        file.filePath?.toLowerCase().endsWith(`.${filterType}`);

      // Complexity filter
      const matchesComplexity = filterComplexity === 'all' ||
        (filterComplexity === 'low' && (file.complexity || 0) <= 3) ||
        (filterComplexity === 'medium' && (file.complexity || 0) > 3 && (file.complexity || 0) <= 6) ||
        (filterComplexity === 'high' && (file.complexity || 0) > 6);

      return matchesSearch && matchesType && matchesComplexity;
    });

    // Sort
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = a.filePath || '';
          bValue = b.filePath || '';
          break;
        case 'size':
          aValue = a.size || 0;
          bValue = b.size || 0;
          break;
        case 'lines':
          aValue = a.lines || 0;
          bValue = b.lines || 0;
          break;
        case 'complexity':
          aValue = a.complexity || 0;
          bValue = b.complexity || 0;
          break;
        case 'functions':
          aValue = a.functions?.length || 0;
          bValue = b.functions?.length || 0;
          break;
        default:
          aValue = a.filePath || '';
          bValue = b.filePath || '';
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [files, searchTerm, sortBy, sortOrder, filterType, filterComplexity]);

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const getComplexityColor = (complexity) => {
    if (complexity <= 3) return 'text-green-400';
    if (complexity <= 6) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getComplexityIcon = (complexity) => {
    if (complexity <= 3) return <CheckCircle className="w-4 h-4 text-green-400" />;
    if (complexity <= 6) return <Clock className="w-4 h-4 text-yellow-400" />;
    return <AlertTriangle className="w-4 h-4 text-red-400" />;
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const SortButton = ({ field, label }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center space-x-1 px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
    >
      <span>{label}</span>
      {sortBy === field && (
        sortOrder === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />
      )}
    </button>
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header with Stats */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Files Analysis</h2>
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <FileText className="w-4 h-4" />
            <span>{filteredAndSortedFiles.length} of {files.length} files</span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="p-3 bg-gray-800 rounded-lg border border-gray-700">
            <div className="text-lg font-bold text-white">{files.length}</div>
            <div className="text-xs text-gray-400">Total Files</div>
          </div>
          <div className="p-3 bg-gray-800 rounded-lg border border-gray-700">
            <div className="text-lg font-bold text-white">
              {Object.keys(fileTypes).length}
            </div>
            <div className="text-xs text-gray-400">File Types</div>
          </div>
          <div className="p-3 bg-gray-800 rounded-lg border border-gray-700">
            <div className="text-lg font-bold text-white">
              {files.reduce((sum, f) => sum + (f.lines || 0), 0).toLocaleString()}
            </div>
            <div className="text-xs text-gray-400">Total Lines</div>
          </div>
          <div className="p-3 bg-gray-800 rounded-lg border border-gray-700">
            <div className="text-lg font-bold text-white">
              {formatBytes(files.reduce((sum, f) => sum + (f.size || 0), 0))}
            </div>
            <div className="text-xs text-gray-400">Total Size</div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search files or functions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Filters */}
          <div className="flex space-x-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Types</option>
              {Object.keys(fileTypes).map(type => (
                <option key={type} value={type}>{type} ({fileTypes[type]})</option>
              ))}
            </select>

            <select
              value={filterComplexity}
              onChange={(e) => setFilterComplexity(e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Complexity</option>
              <option value="low">Low (≤3)</option>
              <option value="medium">Medium (4-6)</option>
                              <option value="high">High (&gt;6)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Files List */}
      <div className="flex-1 overflow-auto">
        {filteredAndSortedFiles.length === 0 ? (
          <div className="p-6 text-center text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-600" />
            <h3 className="text-lg font-medium text-gray-300 mb-2">No files found</h3>
            <p className="text-gray-500">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {filteredAndSortedFiles.map((file, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                  selectedFile === file
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                }`}
                onClick={() => setSelectedFile(selectedFile === file ? null : file)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <FileText className="w-5 h-5 text-blue-400" />
                      <h3 className="text-lg font-medium text-white truncate">
                        {file.filePath}
                      </h3>
                      {getComplexityIcon(file.complexity)}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm mb-3">
                      <div className="flex items-center space-x-2">
                        <Code className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-300">{file.lines || 0} lines</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <HardDrive className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-300">{formatBytes(file.size || 0)}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-4 h-4 text-gray-500" />
                        <span className={`${getComplexityColor(file.complexity)}`}>
                          {file.complexity || 0} complexity
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <GitBranch className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-300">{file.functions?.length || 0} functions</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Eye className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-300">
                          {file.filePath?.split('.').pop()?.toUpperCase() || 'UNKNOWN'}
                        </span>
                      </div>
                    </div>

                    {/* Functions List */}
                    {file.functions && file.functions.length > 0 && (
                      <div className="mt-3">
                        <h4 className="text-sm font-medium text-gray-300 mb-2">Functions:</h4>
                        <div className="flex flex-wrap gap-2">
                          {file.functions.slice(0, 5).map((func, funcIndex) => (
                            <span
                              key={funcIndex}
                              className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded"
                            >
                              {func.name || `function_${funcIndex}`}
                            </span>
                          ))}
                          {file.functions.length > 5 && (
                            <span className="px-2 py-1 text-xs bg-gray-700 text-gray-400 rounded">
                              +{file.functions.length - 5} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* File Details (expanded view) */}
                    {selectedFile === file && (
                      <div className="mt-4 p-3 bg-gray-700 rounded border border-gray-600">
                        <h4 className="text-sm font-medium text-white mb-2">File Details</h4>
                        <div className="space-y-1 text-xs text-gray-300">
                          <div>Path: {file.filePath}</div>
                          <div>Lines: {file.lines || 0}</div>
                          <div>Size: {formatBytes(file.size || 0)}</div>
                          <div>Complexity: {file.complexity || 0}</div>
                          <div>Functions: {file.functions?.length || 0}</div>
                          {file.dependencies && (
                            <div>Dependencies: {file.dependencies.length}</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(selectedFile === file.filePath ? null : file.filePath);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded"
                        title="File actions"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      
                      {selectedFile === file.filePath && (
                        <div className="absolute right-0 top-8 z-10 bg-gray-800 border border-gray-600 rounded-lg shadow-lg py-1 min-w-48">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(file.filePath);
                              toast.success('File path copied to clipboard');
                              setSelectedFile(null);
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center space-x-2"
                          >
                            <Copy className="w-4 h-4" />
                            <span>Copy Path</span>
                          </button>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const fileInfo = `File: ${file.filePath}\nLines: ${file.lines || 'N/A'}\nSize: ${file.size || 'N/A'} bytes\nComplexity: ${file.complexity || 'N/A'}`;
                              navigator.clipboard.writeText(fileInfo);
                              toast.success('File details copied to clipboard');
                              setSelectedFile(null);
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center space-x-2"
                          >
                            <Eye className="w-4 h-4" />
                            <span>Copy Details</span>
                          </button>
                          
                          {file.content && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const blob = new Blob([file.content], { type: 'text/plain' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = file.filePath.split('/').pop() || 'file.txt';
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                URL.revokeObjectURL(url);
                                toast.success('File downloaded');
                                setSelectedFile(null);
                              }}
                              className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center space-x-2"
                            >
                              <Download className="w-4 h-4" />
                              <span>Download File</span>
                            </button>
                          )}
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`https://github.com/search?q=${encodeURIComponent(file.filePath.split('/').pop())}&type=code`, '_blank');
                              setSelectedFile(null);
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center space-x-2"
                          >
                            <ExternalLink className="w-4 h-4" />
                            <span>Search on GitHub</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sort Controls */}
      <div className="p-4 border-t border-gray-700 bg-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <span>Sort by:</span>
            <SortButton field="name" label="Name" />
            <SortButton field="size" label="Size" />
            <SortButton field="lines" label="Lines" />
            <SortButton field="complexity" label="Complexity" />
            <SortButton field="functions" label="Functions" />
          </div>
          <div className="text-xs text-gray-500">
            Showing {filteredAndSortedFiles.length} of {files.length} files
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedFilesTab;
