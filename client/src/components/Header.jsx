import React from 'react'
import { 
  Brain, 
  Activity, 
  Settings,
  Bell
} from 'lucide-react'
import Tooltip, { StatusTooltip, HelpTooltip, KeyboardTooltip } from './Tooltip'
import { useToast } from './Toast'
import GlobalSearch from './GlobalSearch'
import ProjectManager from './ProjectManager'
import ScanQueueDashboard from './ScanQueueDashboard'
import SystemMetricsDashboard from './SystemMetricsDashboard'
import AIProviderConfig from './AIProviderConfig'

const Header = ({ onToggleAI, onOpenSettings, onProjectSelect, onSearchSelect }) => {
  const toast = useToast()


  return (
    <header className="glass-panel m-2 sm:m-4 mb-0 p-2 sm:p-4 overflow-visible">
      <div className="flex items-center justify-between">
        {/* Left side - App title */}
        <div className="flex items-center space-x-2 sm:space-x-6">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Activity className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-100">ManitoDebug</h1>
          </div>
        </div>

        {/* Right side - Controls and stats */}
        <div className="flex items-center space-x-1 sm:space-x-4">
          {/* Project Manager */}
          <ProjectManager 
            onProjectSelect={(project) => {
              console.log('Project selected:', project);
              if (onProjectSelect) {
                onProjectSelect(project);
              }
              toast.success(`Switched to project: ${project.name}`);
            }}
          />

          {/* Scan Queue Dashboard */}
          <ScanQueueDashboard />

          {/* System Metrics Dashboard */}
          <SystemMetricsDashboard />

          {/* AI Provider Configuration */}
          <AIProviderConfig />

          {/* Global Search */}
          <GlobalSearch 
            onResultSelect={(result) => {
              console.log('Search result selected:', result);
              if (onSearchSelect) {
                onSearchSelect(result);
              }
              toast.info(`Selected: ${result.title || result.name}`);
            }}
          />

          {/* AI Toggle Button */}
          <KeyboardTooltip shortcut="Alt+A" description="Toggle AI Assistant">
            <button
              onClick={onToggleAI}
              className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105 focus:ring-2 focus:ring-purple-500/50 focus:outline-none text-xs sm:text-sm"
            >
              <Brain className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">AI Assistant</span>
              <span className="sm:hidden">AI</span>
            </button>
          </KeyboardTooltip>

          {/* Test Toast Button */}
          <Tooltip content="Test toast notifications">
            <button 
              onClick={() => {
                toast.success('Test success message!', { title: 'Success' })
                setTimeout(() => toast.error('Test error message!', { title: 'Error' }), 1000)
                setTimeout(() => toast.warning('Test warning message!', { title: 'Warning' }), 2000)
                setTimeout(() => toast.info('Test info message!', { title: 'Info' }), 3000)
              }}
              className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
            >
              <Bell className="w-5 h-5" />
            </button>
          </Tooltip>

          {/* Settings Button */}
          <KeyboardTooltip shortcut="Cmd+," description="Open Settings">
            <button 
              onClick={onOpenSettings}
              className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
            >
              <Settings className="w-5 h-5" />
            </button>
          </KeyboardTooltip>
        </div>
      </div>
    </header>
  )
}

export default Header