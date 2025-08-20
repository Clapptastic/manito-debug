import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Clock, FileText, GitBranch, AlertTriangle, TrendingUp, Filter } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

const GlobalSearch = ({ onResultSelect, className = '' }) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [searchType, setSearchType] = useState('all');

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
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef(null);

  // Search suggestions query
  const suggestionsQuery = useQuery({
    queryKey: ['search-suggestions', query],
    queryFn: async () => {
      if (!query || query.length < 2) return [];
      const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query)}&limit=5`);
      const data = await response.json();
      return data.success ? data.data : [];
    },
    enabled: query.length >= 2 && showSuggestions,
    staleTime: 30000,
  });

  // Main search query
  const searchQuery = useQuery({
    queryKey: ['global-search', query, searchType],
    queryFn: async () => {
      if (!query || query.length < 2) return { data: [], total: 0 };
      
      const params = new URLSearchParams({
        q: query,
        type: searchType,
        limit: '20'
      });
      
      const response = await fetch(`/api/search?${params}`);
      const data = await response.json();
      return data.success ? data.data : { data: [], total: 0 };
    },
    enabled: query.length >= 2 && !showSuggestions,
    staleTime: 30000,
  });

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => searchRef.current?.focus(), 100);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setQuery('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Close search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
        setShowSuggestions(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSearch = (searchQuery) => {
    setQuery(searchQuery);
    setShowSuggestions(false);
  };

  const handleResultSelect = (result) => {
    onResultSelect?.(result);
    setIsOpen(false);
    setQuery('');
  };

  const getResultIcon = (type) => {
    switch (type) {
      case 'project': return <FileText className="w-4 h-4 text-blue-400" />;
      case 'file': return <FileText className="w-4 h-4 text-green-400" />;
      case 'dependency': return <GitBranch className="w-4 h-4 text-purple-400" />;
      case 'conflict': return <AlertTriangle className="w-4 h-4 text-red-400" />;
      default: return <FileText className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatResult = (result) => {
    if (result.type === 'file') {
      return {
        title: result.filePath || result.name,
        subtitle: `${result.lines || 0} lines • ${result.size || 0} bytes`,
        type: 'file',
        data: result
      };
    }
    if (result.type === 'project') {
      return {
        title: result.name,
        subtitle: `${result.scanCount || 0} scans • ${result.fileCount || 0} files`,
        type: 'project',
        data: result
      };
    }
    if (result.type === 'dependency') {
      return {
        title: result.name,
        subtitle: `${result.version || 'unknown'} • ${result.type || 'dependency'}`,
        type: 'dependency',
        data: result
      };
    }
    if (result.type === 'conflict') {
      return {
        title: result.message,
        subtitle: `${result.severity || 'unknown'} • ${result.files?.length || 0} files affected`,
        type: 'conflict',
        data: result
      };
    }
    return {
      title: result.name || result.message || 'Unknown',
      subtitle: result.description || '',
      type: result.type || 'unknown',
      data: result
    };
  };

  const searchTypes = [
    { id: 'all', label: 'All', icon: Search },
    { id: 'projects', label: 'Projects', icon: FileText },
    { id: 'files', label: 'Files', icon: FileText },
    { id: 'dependencies', label: 'Dependencies', icon: GitBranch },
    { id: 'conflicts', label: 'Conflicts', icon: AlertTriangle }
  ];

  return (
    <div className={`relative ${className}`}>
      {/* Search Trigger */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-400 bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600 hover:text-gray-300 transition-colors"
      >
        <Search className="w-4 h-4" />
        <span>Search...</span>
        <kbd className="px-1.5 py-0.5 text-xs bg-gray-700 rounded">⌘K</kbd>
      </button>

      {/* Search Modal */}
      {isOpen && (
        <div className="modal-container z-[99995] p-4 sm:p-6 animate-fade-in" onClick={() => setIsOpen(false)}>
          <div className="modal-content w-full max-w-2xl animate-scale-up" onClick={(e) => e.stopPropagation()}>
            {/* Search Input */}
            <div className="p-4 border-b border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Search projects, files, dependencies, conflicts..."
                  className="w-full pl-10 pr-10 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Search Type Filters */}
              <div className="flex space-x-2 mt-3">
                {searchTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setSearchType(type.id)}
                    className={`flex items-center space-x-1 px-3 py-1.5 text-xs rounded-md transition-colors ${
                      searchType === type.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <type.icon className="w-3 h-3" />
                    <span>{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Search Results */}
            <div className="max-h-96 overflow-y-auto">
              {query.length < 2 ? (
                <div className="p-6 text-center text-gray-400">
                  <Search className="w-8 h-8 mx-auto mb-2" />
                  <p>Type at least 2 characters to search</p>
                </div>
              ) : showSuggestions && suggestionsQuery.data?.length > 0 ? (
                <div className="p-2">
                  <div className="text-xs text-gray-500 px-3 py-2">Suggestions</div>
                  {suggestionsQuery.data.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSearch(suggestion)}
                      className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 rounded flex items-center space-x-2"
                    >
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span>{suggestion}</span>
                    </button>
                  ))}
                </div>
              ) : searchQuery.isLoading ? (
                <div className="p-6 text-center text-gray-400">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="mt-2">Searching...</p>
                </div>
              ) : searchQuery.data?.data?.length > 0 ? (
                <div className="p-2">
                  <div className="text-xs text-gray-500 px-3 py-2">
                    {searchQuery.data.total} results
                  </div>
                  {searchQuery.data.data.map((result, index) => {
                    const formatted = formatResult(result);
                    return (
                      <button
                        key={index}
                        onClick={() => handleResultSelect(formatted)}
                        className="w-full text-left px-3 py-3 text-sm hover:bg-gray-800 rounded flex items-center space-x-3 group"
                      >
                        {getResultIcon(formatted.type)}
                        <div className="flex-1 min-w-0">
                          <div className="text-white group-hover:text-blue-400 truncate">
                            {formatted.title}
                          </div>
                          <div className="text-gray-400 text-xs truncate">
                            {formatted.subtitle}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 bg-gray-700 px-2 py-1 rounded">
                          {formatted.type}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : query.length >= 2 && !searchQuery.isLoading ? (
                <div className="p-6 text-center text-gray-400">
                  <Search className="w-8 h-8 mx-auto mb-2" />
                  <p>No results found for "{query}"</p>
                </div>
              ) : null}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-700 text-xs text-gray-500">
              <div className="flex items-center justify-between">
                <span>Press Enter to select, Esc to close</span>
                <span>Global semantic search</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
