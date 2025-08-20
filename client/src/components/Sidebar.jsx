import React, { useState, useRef } from 'react'
import {
  FolderOpen,
  Play,
  Square,
  Loader2,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  FileText,
  Settings,
  RefreshCw,
  Zap,
  Clock,
  HardDrive,
  Upload,
  Archive,
  Folder,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { selectDirectory, isFileSystemAccessSupported, createUploadFormData } from '../utils/fileSystemAccess'
import Tooltip, { HelpTooltip, KeyboardTooltip } from './Tooltip'
import { useUserFeedback } from '../utils/userFeedback'

function Sidebar({ scanPath, setScanPath, onScan, onUpload, onBrowseDirectory, isScanning, scanResults, onOpenSettings }) {
  const feedback = useUserFeedback()
  const [isDragOver, setIsDragOver] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [inputMode, setInputMode] = useState(() => {
    // Default to browse mode if File System Access API is supported
    return isFileSystemAccessSupported() ? 'browse' : 'path'
  }) // 'path', 'upload', or 'browse'
  const [uploadFile, setUploadFile] = useState(null)
  const [selectedDirectory, setSelectedDirectory] = useState(null)
  const [projectName, setProjectName] = useState('')
  const fileInputRef = useRef(null)
  const zipInputRef = useRef(null)

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      const file = files[0]
      if (file.name.endsWith('.zip')) {
        // Handle zip file drop for upload mode
        setInputMode('upload')
        setUploadFile(file)
        setProjectName(file.name.replace('.zip', ''))
        feedback.info('ZIP file detected. Ready to upload and analyze.')
      } else if (file.webkitGetAsEntry) {
        // Handle folder drop for path mode
        const entry = file.webkitGetAsEntry()
        if (entry && entry.isDirectory) {
          setInputMode('path')
          setScanPath(file.path)
          feedback.info('Directory detected. Ready to analyze.')
        } else {
          feedback.warning('Please drop a ZIP file or directory.')
        }
      } else {
        feedback.warning('Please drop a ZIP file or directory.')
      }
    }
  }

  const handleFolderSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files)
    if (files.length > 0) {
      // Get the root folder name from the relative path
      const firstFile = files[0]
      if (firstFile.webkitRelativePath) {
        const folderName = firstFile.webkitRelativePath.split('/')[0]
        setScanPath(folderName)
        setInputMode('path')
      } else {
        // Fallback for single file selection
        setScanPath(firstFile.name)
        setInputMode('path')
      }
    }
  }

  const handleZipSelect = () => {
    if (zipInputRef.current) {
      zipInputRef.current.click()
    }
  }

  const handleZipChange = (e) => {
    const files = Array.from(e.target.files)
    if (files.length > 0) {
      const file = files[0]
      setUploadFile(file)
      setProjectName(file.name.replace(/\.(zip|tar|tar\.gz)$/, ''))
      setInputMode('upload')
    }
  }

  const handleBrowseDirectory = async () => {
    try {
      const directoryData = await selectDirectory()
      if (directoryData) {
        setSelectedDirectory(directoryData)
        setProjectName(directoryData.name)
        setInputMode('browse')
      }
    } catch (error) {
      console.error('Failed to select directory:', error)
      // Could show a toast error here
    }
  }

  const formatFileCount = (count) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`
    }
    return count
  }

  const formatSize = (bytes) => {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / 1024 / 1024).toFixed(1)}MB`
    } else if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(1)}KB`
    }
    return `${bytes}B`
  }

  return (
    <aside className={`${isMinimized ? 'w-16 lg:w-16' : 'w-full lg:w-80'} glass-panel m-2 sm:m-4 lg:mr-0 flex flex-col overflow-visible sidebar-container transition-all duration-300 ease-in-out`}>
      {/* Header */}
      <div className="p-3 sm:p-6 border-b border-gray-700/50">
        <div className="flex items-center justify-between mb-4">
          {!isMinimized ? (
            <>
              <h2 className="text-base sm:text-lg font-semibold text-white flex items-center space-x-2">
                <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-primary-400" />
                <span>Code Scanner</span>
              </h2>
              <HelpTooltip content="Configure scan settings and analysis options">
                <button 
                  onClick={onOpenSettings}
                  className="p-1 sm:p-2 rounded-lg hover:bg-gray-700/50 transition-colors focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
                >
                  <Settings className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                </button>
              </HelpTooltip>
            </>
          ) : (
            <div className="flex items-center justify-center w-full">
              <Zap className="w-5 h-5 text-primary-400" />
            </div>
          )}
        </div>
        
        {/* Minimize/Expand Button */}
        <div className="flex justify-center mb-4">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 rounded-lg hover:bg-gray-700/50 transition-colors"
            title={isMinimized ? "Expand sidebar" : "Minimize sidebar"}
          >
            {isMinimized ? (
              <ChevronRight className="w-4 h-4 text-gray-400 hover:text-white" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-gray-400 hover:text-white" />
            )}
          </button>
        </div>

        {/* Mode Selector */}
        {!isMinimized && (
          <div className="mb-4">
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-gray-800/50 p-1">
              {isFileSystemAccessSupported() && (
                <button
                  onClick={() => setInputMode('browse')}
                  className={`px-1 sm:px-2 py-2 text-xs font-medium rounded-md transition-all flex items-center justify-center space-x-1 ${
                    inputMode === 'browse'
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/50'
                  }`}
                >
                  <Folder className="w-3 h-3" />
                  <span className="hidden sm:inline">Browse</span>
                  <span className="sm:hidden">Browse</span>
                </button>
              )}
              <button
                onClick={() => setInputMode('upload')}
                className={`px-1 sm:px-2 py-2 text-xs font-medium rounded-md transition-all flex items-center justify-center space-x-1 ${
                  inputMode === 'upload'
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/50'
                }`}
              >
                <Archive className="w-3 h-3" />
                <span className="hidden sm:inline">Upload</span>
                <span className="sm:hidden">Upload</span>
              </button>
              <button
                onClick={() => setInputMode('path')}
                className={`px-1 sm:px-2 py-2 text-xs font-medium rounded-md transition-all flex items-center justify-center space-x-1 ${
                  inputMode === 'path'
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/50'
                }`}
              >
                <FolderOpen className="w-3 h-3" />
                <span className="hidden sm:inline">Path</span>
                <span className="sm:hidden">Path</span>
              </button>
            </div>
          </div>
        )}

        {/* Input Forms */}
        {!isMinimized && (
          <>
            {inputMode === 'browse' ? (
              /* Browse Mode */
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-300 flex items-center space-x-2">
                  <span>Browse Local Directory</span>
                  <HelpTooltip content="Select a local directory using your browser's directory picker" />
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Project name..."
                    className="input-field w-full text-sm focus:ring-2 focus:ring-primary-500/50"
                  />
                  <div className="relative">
                    <input
                      type="text"
                      value={selectedDirectory ? `${selectedDirectory.name} (${selectedDirectory.files.length} files)` : ''}
                      placeholder="No directory selected..."
                      readOnly
                      className="input-field w-full pr-12 text-sm focus:ring-2 focus:ring-primary-500/50"
                    />
                    <Tooltip content="Browse for directory" position="top">
                      <button
                        onClick={handleBrowseDirectory}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 rounded hover:bg-gray-600/50 transition-colors focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
                      >
                        <Folder className="w-4 h-4 text-gray-400" />
                      </button>
                    </Tooltip>
                  </div>
                </div>
              </div>
            ) : inputMode === 'path' ? (
              /* Path Input Mode */
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-300 flex items-center space-x-2">
                  <span>Enter Project Path</span>
                  <HelpTooltip content="Enter the full path to your project directory" />
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Project name..."
                    className="input-field w-full text-sm focus:ring-2 focus:ring-primary-500/50"
                  />
                  <input
                    type="text"
                    value={scanPath}
                    onChange={(e) => setScanPath(e.target.value)}
                    placeholder="Enter project path..."
                    className="input-field w-full text-sm focus:ring-2 focus:ring-primary-500/50"
                  />
                </div>
              </div>
            ) : (
              /* Upload Mode */
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-300 flex items-center space-x-2">
                  <span>Upload Project Archive</span>
                  <HelpTooltip content="Upload a ZIP file containing your project" />
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Project name..."
                    className="input-field w-full text-sm focus:ring-2 focus:ring-primary-500/50"
                  />
                  <div className="relative">
                    <input
                      type="text"
                      value={uploadFile ? uploadFile.name : ''}
                      placeholder="No file selected..."
                      readOnly
                      className="input-field w-full pr-12 text-sm focus:ring-2 focus:ring-primary-500/50"
                    />
                    <Tooltip content="Select ZIP file" position="top">
                      <button
                        onClick={handleZipSelect}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 rounded hover:bg-gray-600/50 transition-colors focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
                      >
                        <Archive className="w-4 h-4 text-gray-400" />
                      </button>
                    </Tooltip>
                  </div>
                </div>
              </div>
            )}

            {/* Scan Button */}
            <div className="mt-4">
              <KeyboardTooltip 
                content="Start code analysis (Ctrl+Enter)"
                shortcut="Ctrl+Enter"
              >
                <button
                  onClick={inputMode === 'upload' ? onUpload : onScan}
                  disabled={isScanning || !scanPath}
                  className={`w-full py-2 px-4 rounded-lg font-medium transition-all flex items-center justify-center space-x-2 ${
                    isScanning
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : scanPath
                      ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Analyzing...</span>
                    </>
                  ) : inputMode === 'browse' ? (
                    <>
                      <Play className="w-4 h-4" />
                      <span>Start Analysis</span>
                    </>
                  ) : inputMode === 'upload' ? (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Upload & Analyze</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      <span>Start Analysis</span>
                    </>
                  )}
                </button>
              </KeyboardTooltip>
            </div>
          </>
        )}

        {/* Scan Results Summary */}
        {!isMinimized && scanResults && (
          <div className="p-6 border-b border-gray-700/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-300">Scan Results</h3>
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                <span>{Math.round(scanResults.scanTime)}ms</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Tooltip content={`${scanResults.files?.length || 0} files analyzed`} position="top">
                <div className="metric-card hover:bg-gray-800/50 transition-colors cursor-help">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-blue-400" />
                    <div>
                      <div className="text-sm font-semibold text-white">
                        {formatFileCount(scanResults.files?.length || 0)}
                      </div>
                      <div className="text-xs text-gray-400">Files</div>
                    </div>
                  </div>
                </div>
              </Tooltip>

              <Tooltip content={`${scanResults.metrics?.linesOfCode?.toLocaleString() || 0} lines of code analyzed`} position="top">
                <div className="metric-card hover:bg-gray-800/50 transition-colors cursor-help">
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="w-4 h-4 text-green-400" />
                    <div>
                      <div className="text-sm font-semibold text-white">
                        {scanResults.metrics?.linesOfCode?.toLocaleString() || '0'}
                      </div>
                      <div className="text-xs text-gray-400">Lines</div>
                    </div>
                  </div>
                </div>
              </Tooltip>

              <Tooltip 
                content={
                  scanResults.conflicts?.length > 0 
                    ? `${scanResults.conflicts.length} conflicts detected - click to view details`
                    : "No conflicts found - great job!"
                } 
                position="top"
              >
                <div className={`metric-card hover:bg-gray-800/50 transition-colors cursor-help ${
                  scanResults.conflicts?.length > 0 ? 'ring-1 ring-yellow-500/20' : ''
                }`}>
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className={`w-4 h-4 ${
                      scanResults.conflicts?.length > 0 ? 'text-yellow-400' : 'text-gray-500'
                    }`} />
                    <div>
                      <div className="text-sm font-semibold text-white">
                        {scanResults.conflicts?.length || 0}
                      </div>
                      <div className="text-xs text-gray-400">Conflicts</div>
                    </div>
                  </div>
                </div>
              </Tooltip>

              <Tooltip 
                content={`Total codebase size: ${formatSize(scanResults.files?.reduce((acc, f) => acc + (f.size || 0), 0) || 0)}`} 
                position="top"
              >
                <div className="metric-card hover:bg-gray-800/50 transition-colors cursor-help">
                  <div className="flex items-center space-x-2">
                    <HardDrive className="w-4 h-4 text-purple-400" />
                    <div>
                      <div className="text-sm font-semibold text-white">
                        {formatSize(scanResults.files?.reduce((acc, f) => acc + (f.size || 0), 0) || 0)}
                      </div>
                      <div className="text-xs text-gray-400">Size</div>
                    </div>
                  </div>
                </div>
              </Tooltip>
            </div>

            {/* Health Score */}
            {scanResults && (
              <div className="mt-4 p-3 rounded-lg bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-medium text-green-300">Health Score</span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-400">
                      {Math.max(0, 100 - (scanResults.conflicts?.length || 0) * 10)}%
                    </div>
                    <div className="text-xs text-green-300/70">
                      {scanResults.conflicts?.length === 0 ? 'Excellent' : 
                       scanResults.conflicts?.length < 3 ? 'Good' : 
                       scanResults.conflicts?.length < 6 ? 'Fair' : 'Needs Work'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* File Tree Preview */}
      {!isMinimized && (
        <div className="flex-1 overflow-hidden">
          <div className="p-6">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Recent Files</h3>
            <div className="space-y-2 overflow-y-auto max-h-64 overflow-x-hidden">
              {scanResults?.files?.slice(0, 10).map((file, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-700/30 transition-colors cursor-pointer group"
                >
                  <FileText className="w-4 h-4 text-gray-400 group-hover:text-gray-300" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-300 truncate">
                      {file.filePath?.split('/').pop() || 'Unknown'}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center space-x-2">
                      <span>{file.lines || 0} lines</span>
                      <span>•</span>
                      <span>{formatSize(file.size || 0)}</span>
                      {file.complexity > 5 && (
                        <>
                          <span>•</span>
                          <span className="text-yellow-400">Complex</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      {!isMinimized && (
        <div className="p-4 border-t border-gray-700/50">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-1">
              <RefreshCw className="w-3 h-3" />
              <span>Last scan: {scanResults ? new Date(scanResults.timestamp).toLocaleTimeString() : 'Never'}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Zap className="w-3 h-3" />
              <span>v1.0.0</span>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        webkitdirectory=""
        multiple
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <input
        ref={zipInputRef}
        type="file"
        accept=".zip,.tar,.tar.gz"
        onChange={handleZipChange}
        style={{ display: 'none' }}
      />
    </aside>
  )
}

export default Sidebar