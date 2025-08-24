import React, { useState, useEffect } from 'react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { 
  Search, 
  Play, 
  Settings, 
  AlertCircle, 
  CheckCircle, 
  Loader2, 
  BarChart3,
  Network,
  FileText,
  Brain
} from 'lucide-react'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import GraphVisualization from './components/GraphVisualization'
import MetricsPanel from './components/MetricsPanel'
import ConflictsList from './components/ConflictsList'
import AIPanel from './components/AIPanel'
import CKGPanel from './components/CKGPanel'
import SettingsModal from './components/SettingsModal'
import IntelligentMetricsVisualization from './components/IntelligentMetricsVisualization'
import MockDataAlert from './components/MockDataAlert'
import { ToastProvider, useToast } from './components/Toast'
import { SettingsProvider } from './contexts/SettingsContext'
import { ScanningLoader, LoadingOverlay } from './components/Loading'
import ProgressTracker from './components/ProgressTracker'
import Tooltip from './components/Tooltip'
import EnhancedFilesTab from './components/EnhancedFilesTab'
import useWebSocket from './hooks/useWebSocket'
import { useUserFeedback, handleErrorWithFeedback, handleSuccessWithFeedback } from './utils/userFeedback'
import dynamicPortConfig from './utils/portConfig.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
})

function AppContent() {
  const [scanPath, setScanPath] = useState('/Users/andrewclapp/Desktop/ai debug planning/manito-package/client/src')
  const [isScanning, setIsScanning] = useState(false)
  const [scanResults, setScanResults] = useState(null)
  const [selectedTab, setSelectedTab] = useState('graph')
  const [showAIPanel, setShowAIPanel] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [currentProject, setCurrentProject] = useState(null)
  const [scanProgress, setScanProgress] = useState({ stage: 'idle', progress: 0, files: 0, details: '' })
  const [scanStage, setScanStage] = useState('idle')
  const [isLoadingProject, setIsLoadingProject] = useState(false)
  const { toast } = useToast()
  const feedback = useUserFeedback()

  // Get port configuration with safe defaults
  const [portConfig, setPortConfig] = useState({
    server: 3000,
    client: 5173,
    websocket: 3000
  });
  const [portConfigLoaded, setPortConfigLoaded] = useState(true); // Start as loaded with defaults

  useEffect(() => {
    const initializePorts = async () => {
      try {
        await dynamicPortConfig.initialize();
        const config = dynamicPortConfig.getConfig();
        setPortConfig(config);
        // Only log once when config is loaded
        console.log('🔧 Dynamic port configuration loaded');
      } catch (error) {
        console.warn('⚠️  Using default port configuration due to error:', error.message);
        // Keep the default configuration - no need to change portConfigLoaded
      }
    };

    // Initialize ports in background, don't block rendering
    initializePorts();
  }, []);

  // Remove excessive logging - only log once
  // console.log('🔧 Port configuration:', portConfig);
  // console.log('🔧 Environment variables:', {
  //   VITE_SERVER_PORT: import.meta.env.VITE_SERVER_PORT,
  //   NODE_ENV: import.meta.env.NODE_ENV
  // });
  
  const { isConnected, messages } = useWebSocket()
  const lastMessage = messages[messages.length - 1]

  // Health check query
  const { data: healthData } = useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const response = await fetch('/api/health?detailed=true')
      return response.json()
    },
    refetchInterval: 30000, // 30 seconds
  })

  // Handle WebSocket messages for real-time progress updates
  useEffect(() => {
    if (lastMessage && isScanning) {
      try {
        // Check if message data exists and is not undefined
        if (!lastMessage.data || lastMessage.data === 'undefined' || lastMessage.data.trim() === '') {
          return; // Skip undefined or empty messages
        }
        
        const data = JSON.parse(lastMessage.data);
        if (data.type === 'scan_progress') {
          setScanProgress({
            stage: data.stage || 'scanning',
            progress: data.progress || 0,
            files: data.files || 0
          });
          setScanStage(data.stage || 'scanning');
        } else if (data.type === 'scan_complete') {
          setScanResults(data.results);
          setIsScanning(false);
          setScanProgress({ stage: 'completed', progress: 100, files: data.results?.files?.length || 0 });
          setScanStage('completed');
          feedback.scanCompleted(data.results?.files?.length || 0, data.results?.conflicts?.length || 0);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error, 'Raw data:', lastMessage.data);
      }
    }
  }, [lastMessage, isScanning, feedback])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Cmd/Ctrl + , to open settings
      if ((event.metaKey || event.ctrlKey) && event.key === ',') {
        event.preventDefault()
        setShowSettings(true)
      }
      
      // Alt + A to toggle AI panel
      if (event.altKey && event.key === 'a') {
        event.preventDefault()
        setShowAIPanel(!showAIPanel)
      }
      
      // Cmd/Ctrl + Enter to start scan
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault()
        if (!isScanning && scanPath) {
          handleScan()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showAIPanel, isScanning, scanPath])

  const handleScan = async () => {
    if (isScanning || !portConfigLoaded) return;
    
    try {
      setIsScanning(true);
      setScanStage('initializing');
      setScanProgress({ stage: 'initializing', progress: 0, files: 0, details: 'Preparing scan environment...' });
      
      console.log('🔍 Starting scan...');
      console.log('🔍 Scan path:', scanPath);
      console.log('🔍 Existing results:', scanResults);
      
      // If we already have scan results from upload, use those
      if (scanResults && scanResults.files && scanResults.files.length > 0) {
        console.log('🔍 Using existing scan results');
        setScanProgress({ stage: 'completed', progress: 100, files: scanResults.files.length, details: 'Using existing scan results' });
        
        const fileCount = scanResults.files.length;
        const conflictCount = scanResults.conflicts?.length || 0;
        
        if (fileCount === 0) {
          feedback.scanNoFiles();
        } else {
          feedback.scanCompleted(fileCount, conflictCount);
        }
        
        return;
      }
      
      // If no scan path, show error
      if (!scanPath) {
        feedback.scanFailed('No scan path provided. Please upload files or enter a path.');
        setScanProgress({ stage: 'error', progress: 0, files: 0, details: 'No scan path provided' });
        return;
      }
      
      console.log('🔍 Request URL:', '/api/scan');
      
      const requestBody = {
        path: scanPath,
        options: {
          patterns: ['**/*.{js,jsx,ts,tsx}'],
          excludePatterns: ['node_modules/**', 'dist/**', 'build/**']
        }
      };
      
      console.log('🔍 Request body:', JSON.stringify(requestBody, null, 2));
      
      // Update progress to scanning stage
      setScanStage('scanning');
      setScanProgress({ stage: 'scanning', progress: 10, files: 0, details: 'Starting file scan...' });
      
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      console.log('🔍 Response status:', response.status, response.statusText);
      console.log('🔍 Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('🔍 Error response text:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Update progress to processing stage
      setScanStage('processing');
      setScanProgress({ stage: 'processing', progress: 50, files: 0, details: 'Processing scan results...' });
      
      const result = await response.json();
      console.log('🔍 Response result:', result);
      
      if (result.success) {
        // Update progress to finalizing stage
        setScanStage('finalizing');
        setScanProgress({ stage: 'finalizing', progress: 90, files: result.data.files?.length || 0, details: 'Preparing results...' });
        
        setScanResults(result.data);
        
        // Check if files were found
        const fileCount = result.data.files?.length || 0;
        const conflictCount = result.data.conflicts?.length || 0;
        
        if (fileCount === 0) {
          feedback.scanNoFiles();
        } else {
          feedback.scanCompleted(fileCount, conflictCount);
        }
        
        // Complete the scan
        setScanStage('completed');
        setScanProgress({ stage: 'completed', progress: 100, files: fileCount, details: 'Analysis complete!' });
      } else {
        console.error('Scan failed:', result.error);
        setScanStage('error');
        setScanProgress({ stage: 'error', progress: 0, files: 0, details: result.error || 'Scan failed' });
        feedback.scanFailed(result.error || 'Failed to scan project');
      }
    } catch (error) {
      console.error('🔍 Scan error details:', error);
      console.error('🔍 Error stack:', error.stack);
      setScanStage('error');
      setScanProgress({ stage: 'error', progress: 0, files: 0, details: error.message });
      handleErrorWithFeedback(error, 'scan operation', feedback);
    } finally {
      setTimeout(() => {
        setIsScanning(false);
      }, 1000); // Keep progress visible for a moment
    }
  }

  const handleUpload = async (file, projectName) => {
    try {
      // Validate file parameter
      if (!file || !file.name) {
        console.error('Invalid file object:', file);
        feedback.uploadInvalidFile();
        return;
      }

      setIsScanning(true)
      setScanStage('uploading')
      setScanProgress({ stage: 'uploading', progress: 0, files: 0, details: 'Preparing upload...' })
      feedback.uploadStarted()
      
      // Validate file type
      if (!file.name.endsWith('.zip')) {
        feedback.uploadInvalidFile()
        return
      }
      
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        feedback.uploadFileTooLarge()
        return
      }
      
      // Update progress - File validation complete
      setScanProgress({ stage: 'uploading', progress: 10, files: 0, details: 'File validated, preparing upload...' })
      
      const formData = new FormData()
      formData.append('projectFile', file)
      formData.append('projectName', projectName || file.name.replace('.zip', ''))
      formData.append('patterns', JSON.stringify(['**/*.{js,jsx,ts,tsx}']))
      formData.append('excludePatterns', JSON.stringify(['node_modules/**', 'dist/**', 'build/**', '.git/**']))
      
      // Update progress - Form data prepared
      setScanProgress({ stage: 'uploading', progress: 20, files: 0, details: 'Starting file upload...' })
      
      // Create XMLHttpRequest for upload progress tracking
      const xhr = new XMLHttpRequest()
      
      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const uploadProgress = (event.loaded / event.total) * 60 // Upload is 60% of total process
          const totalProgress = 20 + uploadProgress // Start from 20% (after validation)
          setScanProgress({ 
            stage: 'uploading', 
            progress: Math.round(totalProgress), 
            files: 0,
            details: `Uploading ${file.name} (${Math.round(event.loaded / 1024 / 1024)}MB / ${Math.round(event.total / 1024 / 1024)}MB)`
          })
        }
      })
      
      // Create promise for XMLHttpRequest
      const uploadPromise = new Promise((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText))
          } else {
            reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`))
          }
        }
        xhr.onerror = () => reject(new Error('Network error during upload'))
        xhr.ontimeout = () => reject(new Error('Upload timeout'))
      })
      
      // Start upload
      xhr.open('POST', `/api/upload`)
      xhr.timeout = 300000 // 5 minutes timeout
      xhr.send(formData)
      
      // Update progress - Upload started
      setScanProgress({ stage: 'uploading', progress: 25, files: 0 })
      
      // Wait for upload to complete
      const result = await uploadPromise
      
      // Update progress - Upload complete, starting processing
      setScanStage('processing')
      setScanProgress({ stage: 'processing', progress: 80, files: 0, details: 'Extracting and processing files...' })
      
      if (result.success) {
        // Update progress - Processing complete, finalizing
        setScanStage('finalizing')
        setScanProgress({ 
          stage: 'finalizing', 
          progress: 90, 
          files: result.data.files?.length || 0,
          details: `Found ${result.data.files?.length || 0} files, analyzing...`
        })
        
        setScanResults(result.data)
        setScanStage('completed')
        setScanProgress({ 
          stage: 'completed', 
          progress: 100, 
          files: result.data.files?.length || 0,
          details: 'Analysis complete!'
        })
        
        // Check if files were found
        const fileCount = result.data.files?.length || 0;
        const conflictCount = result.data.conflicts?.length || 0;
        
        if (fileCount === 0) {
          feedback.scanNoFiles();
        } else {
          feedback.scanCompleted(fileCount, conflictCount);
        }
      } else {
        console.error('Upload failed:', result.error);
        setScanStage('error');
        setScanProgress({ stage: 'error', progress: 0, files: 0, details: result.error || 'Upload failed' });
        feedback.scanFailed(result.error || 'Failed to upload and process file');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setScanStage('error');
      setScanProgress({ stage: 'error', progress: 0, files: 0, details: error.message });
      handleErrorWithFeedback(error, 'upload operation', feedback);
    } finally {
      setTimeout(() => {
        setIsScanning(false);
      }, 1000);
    }
  }

  const handleBrowseDirectory = async (directoryData, projectName) => {
    try {
      setIsScanning(true)
      setScanStage('processing')
      setScanProgress({ stage: 'processing', progress: 0, files: directoryData.files.length })
      feedback.scanStarted()
      
      // Validate directory data
      if (!directoryData.files || directoryData.files.length === 0) {
        feedback.scanNoFiles()
        return
      }
      
      setScanStage('analyzing')
      setScanProgress({ stage: 'analyzing', progress: 30, files: directoryData.files.length })
      
      const response = await fetch(`/api/upload-directory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectData: {
            name: directoryData.name,
            files: directoryData.files.map(file => ({
              path: file.path,
              content: file.content,
              size: file.size
            }))
          },
          projectName: projectName || directoryData.name,
          source: 'browser-directory'
        })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      setScanStage('finalizing')
      setScanProgress({ stage: 'finalizing', progress: 80, files: directoryData.files.length })
      
      const result = await response.json()
      if (result.success) {
        setScanResults(result.data)
        setScanStage('completed')
        setScanProgress({ stage: 'completed', progress: 100, files: result.data.files?.length || 0 })
        feedback.scanCompleted(result.data.files?.length || 0, result.data.conflicts?.length || 0)
      } else {
        console.error('Directory analysis failed:', result.error)
        setScanStage('error')
        setScanProgress({ stage: 'error', progress: 0, files: 0 })
        feedback.scanFailed(result.error || 'Failed to analyze directory')
      }
    } catch (error) {
      console.error('Directory analysis error:', error)
      setScanStage('error')
      setScanProgress({ stage: 'error', progress: 0, files: 0 })
      handleErrorWithFeedback(error, 'directory analysis', feedback)
    } finally {
      setTimeout(() => {
        setIsScanning(false)
      }, 1000)
    }
  }

  const fetchScanResults = async () => {
    // This would normally fetch existing scan results by ID
    // For now, we'll use mock data
  }

  const tabConfig = [
    { id: 'graph', label: 'Dependency Graph', icon: Network },
    { id: 'metrics', label: 'Metrics', icon: BarChart3 },
    { id: 'conflicts', label: 'Conflicts', icon: AlertCircle },
    { id: 'files', label: 'Files', icon: FileText },
    { id: 'ckg', label: 'Knowledge Graph', icon: Brain },
  ]

  return (
    <div className="h-screen bg-gray-950 flex flex-col overflow-visible relative">
        <Header 
          onToggleAI={() => setShowAIPanel(!showAIPanel)}
          onOpenSettings={() => setShowSettings(true)}
          onProjectSelect={async (project) => {
            console.log('App: Project selected:', project);
            setCurrentProject(project);
            setScanPath(project.path);
            setIsLoadingProject(true);
            
            // Load existing scan results for this project
            try {
              const response = await fetch(`/api/projects/${project.id}/latest-scan`);
              if (response.ok) {
                const data = await response.json();
                if (data.success && data.data.hasData && data.data.scan) {
                  // Try to load scan results from the latest scan
                  try {
                    const scanResultsResponse = await fetch(`/api/scans/${data.data.scan.id}`);
                    if (scanResultsResponse.ok) {
                      const scanData = await scanResultsResponse.json();
                      if (scanData.success && scanData.data) {
                        setScanResults(scanData.data);
                        toast.success(`Loaded project: ${project.name} with existing scan data`);
                      } else {
                        // If scan results not found, check if scan has results in its data
                        if (data.data.scan.results && Object.keys(data.data.scan.results).length > 0) {
                          setScanResults(data.data.scan.results);
                          toast.success(`Loaded project: ${project.name} with scan data`);
                        } else {
                          toast.info(`Switched to project: ${project.name} (no scan data available)`);
                        }
                      }
                    } else {
                      // If scan results endpoint fails, check if scan has results in its data
                      if (data.data.scan.results && Object.keys(data.data.scan.results).length > 0) {
                        setScanResults(data.data.scan.results);
                        toast.success(`Loaded project: ${project.name} with scan data`);
                      } else {
                        toast.info(`Switched to project: ${project.name} (no scan data available)`);
                      }
                    }
                  } catch (scanError) {
                    console.warn('Failed to load scan results, checking scan data:', scanError);
                    // If scan results endpoint fails, check if scan has results in its data
                    if (data.data.scan.results && Object.keys(data.data.scan.results).length > 0) {
                      setScanResults(data.data.scan.results);
                      toast.success(`Loaded project: ${project.name} with scan data`);
                    } else {
                      toast.info(`Switched to project: ${project.name} (no scan data available)`);
                    }
                  }
                } else {
                  toast.info(`Switched to project: ${project.name} (no scan data available)`);
                }
              } else {
                toast.error(`Failed to load project data: ${response.statusText}`);
              }
            } catch (error) {
              console.error('Failed to load project data:', error);
              toast.error('Failed to load project data');
            } finally {
              setIsLoadingProject(false);
            }
          }}
          onSearchSelect={(result) => {
            if (result.entity_type === 'project') {
              setScanPath(result.metadata.path);
              toast.info(`Navigated to: ${result.title}`);
            } else if (result.entity_type === 'file') {
              // Focus on specific file in results
              toast.info(`Found: ${result.title}`);
            }
          }}
        />
      
      <div className="flex flex-1 overflow-hidden flex-col lg:flex-row relative">
        <Sidebar 
          scanPath={scanPath}
          setScanPath={setScanPath}
          onScan={handleScan}
          onUpload={handleUpload}
          onBrowseDirectory={handleBrowseDirectory}
          isScanning={isScanning}
          scanResults={scanResults}
          onOpenSettings={() => setShowSettings(true)}
        />
        
        <main className="flex-1 overflow-hidden min-w-0 relative">
          {isScanning ? (
            <div className="h-full flex items-center justify-center p-4">
              <ScanningLoader 
                progress={scanProgress.progress}
                stage={scanProgress.stage}
                files={scanProgress.files}
              />
            </div>
          ) : isLoadingProject ? (
            <div className="h-full flex items-center justify-center p-4">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
                <p className="text-gray-400">Loading project data...</p>
              </div>
            </div>
          ) : scanResults ? (
            <div className="h-full flex flex-col">
              {/* Tab Navigation */}
              <nav className="flex border-b border-gray-800 bg-gray-900 overflow-x-auto scrollbar-hide">
                {tabConfig.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedTab(tab.id)}
                    className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 min-w-fit ${
                      selectedTab === tab.id
                        ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-800'
                        : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    <tab.icon className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                  </button>
                ))}
              </nav>

              {/* Tab Content */}
              <div className="flex-1 overflow-hidden">
                {selectedTab === 'graph' && (
                  <GraphVisualization 
                    data={scanResults}
                    dependencies={scanResults.dependencies}
                    conflicts={scanResults.conflicts}
                    files={scanResults.files}
                  />
                )}
                {selectedTab === 'metrics' && (
                  <div className="h-full p-2 sm:p-4">
                    <IntelligentMetricsVisualization
                      metricsData={{
                        complexity: scanResults.complexity || 0,
                        coupling: scanResults.coupling || 0,
                        cohesion: scanResults.cohesion || 0,
                        testCoverage: scanResults.testCoverage || 0,
                        dependencies: scanResults.dependencies?.length || 0,
                        technicalDebt: scanResults.conflicts?.length || 0,
                        buildTime: scanResults.buildTime || 0,
                        bundleSize: scanResults.bundleSize || 0,
                        totalFiles: Object.keys(scanResults.files || {}).length,
                        totalLines: Object.values(scanResults.files || {}).reduce((sum, file) => sum + (file.lines || 0), 0),
                        conflicts: scanResults.conflicts?.length || 0
                      }}
                      ckgStats={null} // Would be loaded from CKG API
                      viewMode="dashboard"
                      onMetricClick={(metric, value, status) => {
                        toast.info(`${metric}: ${value} (${status})`);
                      }}
                    />
                  </div>
                )}
                {selectedTab === 'conflicts' && (
                  <div className="h-full p-2 sm:p-4">
                    <ConflictsList 
                      conflicts={scanResults.conflicts}
                      files={scanResults.files}
                    />
                  </div>
                )}
                {selectedTab === 'files' && (
                  <div className="h-full p-2 sm:p-4">
                    <EnhancedFilesTab files={scanResults.files} />
                  </div>
                )}
                {selectedTab === 'ckg' && (
                  <div className="h-full p-2 sm:p-4">
                    <CKGPanel 
                      projectId={currentProject?.id}
                      projectPath={scanPath}
                      isVisible={selectedTab === 'ckg'}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center p-4">
              <div className="text-center max-w-md">
                <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 bg-gray-800 rounded-full flex items-center justify-center">
                  <Search className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
                </div>
                <h3 className="text-base sm:text-lg font-medium text-white mb-2">Ready to Analyze</h3>
                <p className="text-xs sm:text-sm text-gray-400 mb-4">
                  Enter a path, upload a file, or browse a directory to start analyzing your code.
                </p>
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                  <span>Press</span>
                  <kbd className="px-2 py-1 bg-gray-800 rounded text-xs">⌘</kbd>
                  <span>+</span>
                  <kbd className="px-2 py-1 bg-gray-800 rounded text-xs">Enter</kbd>
                  <span>to scan</span>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Progress Tracker */}
      <ProgressTracker
        isActive={isScanning}
        stage={scanStage}
        progress={scanProgress.progress}
        files={scanProgress.files}
        scanResults={scanResults}
        details={scanProgress.details}
        onComplete={(results) => {
          console.log('Scan completed with results:', results);
          setIsScanning(false);
          setScanStage('idle');
          // Keep scanResults for display but mark scan as complete
        }}
        onError={(error) => {
          console.error('Scan error:', error);
          setIsScanning(false);
          setScanStage('error');
          setScanResults(null); // Clear results on error
        }}
      />

      {/* AI Panel */}
      {showAIPanel && (
        <AIPanel 
          scanResults={scanResults}
          onClose={() => setShowAIPanel(false)}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal 
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          healthData={healthData}
          isConnected={isConnected}
        />
      )}
    </div>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <SettingsProvider>
          <AppContent />
        </SettingsProvider>
      </ToastProvider>
    </QueryClientProvider>
  )
}

export default App