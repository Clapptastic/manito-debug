import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  Settings,
  Palette,
  Bell,
  Shield,
  Database,
  Zap,
  Eye,
  Monitor,
  Smartphone,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Save,
  RotateCcw,
  Download,
  Upload,
  HardDrive,
  Wifi,
  Brain,
  Code,
  BarChart3,
  Search,
  Keyboard,
  Globe,
  AlertTriangle,
  Info,
  Server
} from 'lucide-react'
import { useToast } from './Toast'
import Tooltip, { HelpTooltip, KeyboardTooltip } from './Tooltip'
import { useSettings } from '../contexts/SettingsContext'

function SettingsModal({ isOpen, onClose, healthData, isConnected }) {
  const { toast } = useToast()
  const { 
    settings, 
    hasChanges, 
    updateSetting, 
    saveSettings, 
    resetSettings 
  } = useSettings()
  const [activeTab, setActiveTab] = useState('general')
  const modalRef = useRef(null)

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose()
      }
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden' // Prevent background scrolling
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])



  const handleSettingChange = (key, value) => {
    updateSetting(key, value)
  }

  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'manito-settings.json'
    link.click()
    URL.revokeObjectURL(url)
    toast.downloaded('manito-settings.json')
  }

  const importSettings = (event) => {
    const file = event.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result)
        setSettings(prev => ({ ...prev, ...imported }))
        setHasChanges(true)
        toast.success('Settings imported successfully!')
      } catch (error) {
        toast.error('Invalid settings file format')
      }
    }
    reader.readAsText(file)
  }

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'analysis', label: 'Analysis', icon: Code },
    { id: 'performance', label: 'Performance', icon: Zap },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'ai', label: 'AI Settings', icon: Brain },
    { id: 'environment', label: 'Environment Status', icon: Monitor }
  ]

  if (!isOpen) return null

  const renderGeneralSettings = () => (
    <div className="space-y-4 sm:space-y-6">
      <div className="space-y-3 sm:space-y-4">
        <h3 className="text-base sm:text-lg font-semibold text-white flex items-center space-x-2">
          <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
          <span>Language & Region</span>
        </h3>
        
        <div className="grid grid-cols-1 gap-3 sm:gap-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1 sm:mb-2">
              Language
              <HelpTooltip content="Choose your preferred language for the interface" />
            </label>
            <select
              value={settings.language}
              onChange={(e) => handleSettingChange('language', e.target.value)}
              className="input-field w-full text-sm"
            >
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
              <option value="ja">日本語</option>
              <option value="zh">中文</option>
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-3 sm:space-y-4">
        <h3 className="text-base sm:text-lg font-semibold text-white flex items-center space-x-2">
          <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
          <span>Behavior</span>
        </h3>
        
        <div className="space-y-2 sm:space-y-3">
          <label className="flex items-center justify-between p-2 sm:p-3 bg-gray-800/30 rounded-lg">
            <div className="flex items-center space-x-2">
              <span className="text-xs sm:text-sm text-gray-300">Auto-save settings</span>
              <HelpTooltip content="Automatically save your preferences as you change them" />
            </div>
            <input
              type="checkbox"
              checked={settings.autoSave}
              onChange={(e) => handleSettingChange('autoSave', e.target.checked)}
              className="rounded border-gray-600 text-primary-600 focus:ring-primary-500 w-4 h-4 sm:w-5 sm:h-5"
            />
          </label>
          
          <label className="flex items-center justify-between p-2 sm:p-3 bg-gray-800/30 rounded-lg">
            <div className="flex items-center space-x-2">
              <span className="text-xs sm:text-sm text-gray-300">Confirm destructive actions</span>
              <HelpTooltip content="Show confirmation dialogs for actions like deleting or clearing data" />
            </div>
            <input
              type="checkbox"
              checked={settings.confirmActions}
              onChange={(e) => handleSettingChange('confirmActions', e.target.checked)}
              className="rounded border-gray-600 text-primary-600 focus:ring-primary-500 w-4 h-4 sm:w-5 sm:h-5"
            />
          </label>
        </div>
      </div>
    </div>
  )

  const renderAppearanceSettings = () => (
    <div className="space-y-4 sm:space-y-6">
      <div className="space-y-3 sm:space-y-4">
        <h3 className="text-base sm:text-lg font-semibold text-white flex items-center space-x-2">
          <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
          <span>Visual Preferences</span>
        </h3>
        
        <div className="grid grid-cols-1 gap-3 sm:gap-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1 sm:mb-2">
              Font Size
            </label>
            <select
              value={settings.fontSize}
              onChange={(e) => handleSettingChange('fontSize', e.target.value)}
              className="input-field w-full text-sm"
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
              <option value="extra-large">Extra Large</option>
            </select>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1 sm:mb-2">
              Sidebar Position
            </label>
            <select
              value={settings.sidebarPosition}
              onChange={(e) => handleSettingChange('sidebarPosition', e.target.value)}
              className="input-field w-full text-sm"
            >
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-1 sm:mb-2">
              Color Scheme
            </label>
            <select
              value={settings.colorScheme}
              onChange={(e) => handleSettingChange('colorScheme', e.target.value)}
              className="input-field w-full text-sm"
            >
              <option value="default">Default</option>
              <option value="blue">Blue</option>
              <option value="green">Green</option>
              <option value="purple">Purple</option>
              <option value="red">Red</option>
            </select>
          </div>
        </div>
        
        <div className="space-y-2 sm:space-y-3">
          <label className="flex items-center justify-between p-2 sm:p-3 bg-gray-800/30 rounded-lg">
            <span className="text-xs sm:text-sm text-gray-300">Compact mode</span>
            <input
              type="checkbox"
              checked={settings.compactMode}
              onChange={(e) => handleSettingChange('compactMode', e.target.checked)}
              className="rounded border-gray-600 text-primary-600 focus:ring-primary-500 w-4 h-4 sm:w-5 sm:h-5"
            />
          </label>
          
          <label className="flex items-center justify-between p-2 sm:p-3 bg-gray-800/30 rounded-lg">
            <span className="text-xs sm:text-sm text-gray-300">Show line numbers</span>
            <input
              type="checkbox"
              checked={settings.showLineNumbers}
              onChange={(e) => handleSettingChange('showLineNumbers', e.target.checked)}
              className="rounded border-gray-600 text-primary-600 focus:ring-primary-500 w-4 h-4 sm:w-5 sm:h-5"
            />
          </label>
        </div>
      </div>
    </div>
  )

  const renderNotificationSettings = () => (
    <div className="space-y-4 sm:space-y-6">
      <div className="space-y-3 sm:space-y-4">
        <h3 className="text-base sm:text-lg font-semibold text-white flex items-center space-x-2">
          <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
          <span>Notification Preferences</span>
        </h3>
        
        <div className="space-y-2 sm:space-y-3">
          <label className="flex items-center justify-between p-2 sm:p-3 bg-gray-800/30 rounded-lg">
            <div className="flex items-center space-x-2">
              <span className="text-xs sm:text-sm text-gray-300">Enable notifications</span>
              <HelpTooltip content="Show toast notifications for various events" />
            </div>
            <input
              type="checkbox"
              checked={settings.enableNotifications}
              onChange={(e) => handleSettingChange('enableNotifications', e.target.checked)}
              className="rounded border-gray-600 text-primary-600 focus:ring-primary-500 w-4 h-4 sm:w-5 sm:h-5"
            />
          </label>
          
          <label className="flex items-center justify-between p-2 sm:p-3 bg-gray-800/30 rounded-lg">
            <div className="flex items-center space-x-2">
              <span className="text-xs sm:text-sm text-gray-300">Sound effects</span>
              <Volume2 className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
            </div>
            <input
              type="checkbox"
              checked={settings.soundEnabled}
              onChange={(e) => handleSettingChange('soundEnabled', e.target.checked)}
              className="rounded border-gray-600 text-primary-600 focus:ring-primary-500 w-4 h-4 sm:w-5 sm:h-5"
            />
          </label>
          
          <label className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Scan completion notifications</span>
            <input
              type="checkbox"
              checked={settings.scanCompleteNotify}
              onChange={(e) => handleSettingChange('scanCompleteNotify', e.target.checked)}
              className="rounded border-gray-600 text-primary-600 focus:ring-primary-500 w-4 h-4 sm:w-5 sm:h-5"
            />
          </label>
          
          <label className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Error notifications</span>
            <input
              type="checkbox"
              checked={settings.errorNotifications}
              onChange={(e) => handleSettingChange('errorNotifications', e.target.checked)}
              className="rounded border-gray-600 text-primary-600 focus:ring-primary-500 w-4 h-4 sm:w-5 sm:h-5"
            />
          </label>
          
          <label className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Update notifications</span>
            <input
              type="checkbox"
              checked={settings.updateNotifications}
              onChange={(e) => handleSettingChange('updateNotifications', e.target.checked)}
              className="rounded border-gray-600 text-primary-600 focus:ring-primary-500 w-4 h-4 sm:w-5 sm:h-5"
            />
          </label>
        </div>
      </div>
    </div>
  )

  const renderAnalysisSettings = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
          <Code className="w-5 h-5 text-green-400" />
          <span>Code Analysis</span>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Max file size (KB)
              <HelpTooltip content="Maximum file size to analyze. Larger files will be skipped." />
            </label>
            <input
              type="number"
              value={Math.round(settings.maxFileSize / 1024)}
              onChange={(e) => handleSettingChange('maxFileSize', parseInt(e.target.value) * 1024)}
              className="input-field w-full"
              min="1"
              max="10240"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Scan timeout (seconds)
            </label>
            <input
              type="number"
              value={settings.scanTimeout / 1000}
              onChange={(e) => handleSettingChange('scanTimeout', parseInt(e.target.value) * 1000)}
              className="input-field w-full"
              min="5"
              max="300"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Complexity threshold
              <HelpTooltip content="Cyclomatic complexity threshold for flagging functions" />
            </label>
            <input
              type="number"
              value={settings.complexityThreshold}
              onChange={(e) => handleSettingChange('complexityThreshold', parseInt(e.target.value))}
              className="input-field w-full"
              min="1"
              max="50"
            />
          </div>
        </div>
        
        <div className="space-y-3">
          <label className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-300">Deep analysis</span>
              <HelpTooltip content="Perform detailed analysis including function-level metrics" />
            </div>
            <input
              type="checkbox"
              checked={settings.deepAnalysis}
              onChange={(e) => handleSettingChange('deepAnalysis', e.target.checked)}
              className="rounded border-gray-600 text-primary-600 focus:ring-primary-500 w-4 h-4 sm:w-5 sm:h-5"
            />
          </label>
          
          <label className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Track dependencies</span>
            <input
              type="checkbox"
              checked={settings.trackDependencies}
              onChange={(e) => handleSettingChange('trackDependencies', e.target.checked)}
              className="rounded border-gray-600 text-primary-600 focus:ring-primary-500 w-4 h-4 sm:w-5 sm:h-5"
            />
          </label>
          
          <label className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Detect circular dependencies</span>
            <input
              type="checkbox"
              checked={settings.detectCircular}
              onChange={(e) => handleSettingChange('detectCircular', e.target.checked)}
              className="rounded border-gray-600 text-primary-600 focus:ring-primary-500 w-4 h-4 sm:w-5 sm:h-5"
            />
          </label>
        </div>
      </div>
    </div>
  )

  const renderPerformanceSettings = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
          <Zap className="w-5 h-5 text-orange-400" />
          <span>Performance Optimization</span>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Max cache size (MB)
              <HelpTooltip content="Maximum amount of disk space for caching analysis results" />
            </label>
            <input
              type="number"
              value={Math.round(settings.maxCacheSize / (1024 * 1024))}
              onChange={(e) => handleSettingChange('maxCacheSize', parseInt(e.target.value) * 1024 * 1024)}
              className="input-field w-full"
              min="10"
              max="1024"
            />
          </div>
        </div>
        
        <div className="space-y-3">
          <label className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-300">Enable caching</span>
              <HelpTooltip content="Cache analysis results to speed up subsequent scans" />
            </div>
            <input
              type="checkbox"
              checked={settings.enableCache}
              onChange={(e) => handleSettingChange('enableCache', e.target.checked)}
              className="rounded border-gray-600 text-primary-600 focus:ring-primary-500 w-4 h-4 sm:w-5 sm:h-5"
            />
          </label>
          
          <label className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-300">Preload results</span>
              <HelpTooltip content="Load previous scan results on startup for faster access" />
            </div>
            <input
              type="checkbox"
              checked={settings.preloadResults}
              onChange={(e) => handleSettingChange('preloadResults', e.target.checked)}
              className="rounded border-gray-600 text-primary-600 focus:ring-primary-500 w-4 h-4 sm:w-5 sm:h-5"
            />
          </label>
          
          <label className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-300">Background scanning</span>
              <HelpTooltip content="Continue scanning files in the background while browsing results" />
            </div>
            <input
              type="checkbox"
              checked={settings.backgroundScanning}
              onChange={(e) => handleSettingChange('backgroundScanning', e.target.checked)}
              className="rounded border-gray-600 text-primary-600 focus:ring-primary-500 w-4 h-4 sm:w-5 sm:h-5"
            />
          </label>
        </div>
      </div>
    </div>
  )

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
          <Shield className="w-5 h-5 text-red-400" />
          <span>Security & Privacy</span>
        </h3>
        
        <div className="space-y-3">
          <label className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-300">Allow remote scanning</span>
              <HelpTooltip content="Allow scanning of remote repositories and files via URL" />
            </div>
            <input
              type="checkbox"
              checked={settings.allowRemoteScanning}
              onChange={(e) => handleSettingChange('allowRemoteScanning', e.target.checked)}
              className="rounded border-gray-600 text-primary-600 focus:ring-primary-500 w-4 h-4 sm:w-5 sm:h-5"
            />
          </label>
          
          <label className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-300">Encrypt local data</span>
              <HelpTooltip content="Encrypt cached analysis data and settings stored locally" />
            </div>
            <input
              type="checkbox"
              checked={settings.encryptLocalData}
              onChange={(e) => handleSettingChange('encryptLocalData', e.target.checked)}
              className="rounded border-gray-600 text-primary-600 focus:ring-primary-500 w-4 h-4 sm:w-5 sm:h-5"
            />
          </label>
          
          <label className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-300">Share analytics</span>
              <HelpTooltip content="Share anonymous usage analytics to help improve ManitoDebug" />
            </div>
            <input
              type="checkbox"
              checked={settings.shareAnalytics}
              onChange={(e) => handleSettingChange('shareAnalytics', e.target.checked)}
              className="rounded border-gray-600 text-primary-600 focus:ring-primary-500 w-4 h-4 sm:w-5 sm:h-5"
            />
          </label>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-yellow-400 mb-1">Privacy Notice</h4>
              <p className="text-xs text-gray-300">
                ManitoDebug processes your code locally by default. No code is sent to external servers unless you explicitly enable remote features or AI analysis.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderAISettings = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
          <Brain className="w-5 h-5 text-cyan-400" />
          <span>AI Analysis</span>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Default AI Provider
              <HelpTooltip content="Choose your preferred AI provider for code analysis" />
            </label>
            <select
              value={settings.aiProvider}
              onChange={(e) => handleSettingChange('aiProvider', e.target.value)}
              className="input-field w-full"
            >
              <option value="local">Local Analysis Only</option>
              <option value="openai">OpenAI GPT</option>
              <option value="anthropic">Anthropic Claude</option>
              <option value="google">Google Gemini</option>
              <option value="custom">Custom Endpoint</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Response Length
            </label>
            <select
              value={settings.aiResponseLength}
              onChange={(e) => handleSettingChange('aiResponseLength', e.target.value)}
              className="input-field w-full"
            >
              <option value="brief">Brief</option>
              <option value="medium">Medium</option>
              <option value="detailed">Detailed</option>
            </select>
          </div>
        </div>

        {/* API Keys Section */}
        <form id="ai-settings-form" onSubmit={(e) => e.preventDefault()} className="hidden"></form>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-md font-medium text-white">API Keys</h4>
              <p className="text-sm text-gray-400">
                Configure API keys for your preferred AI providers. Keys are stored locally and encrypted.
              </p>
            </div>
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>Secure & Local</span>
            </div>
          </div>
          
          <div className="space-y-3">
            {/* OpenAI */}
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-300">OpenAI GPT</label>
                <span className="text-xs text-gray-500">
                  {settings.aiApiKeys.openai ? '✓ Configured' : 'Not configured'}
                </span>
              </div>
              <input
                type="password"
                value={settings.aiApiKeys.openai}
                onChange={(e) => handleSettingChange('aiApiKeys', {
                  ...settings.aiApiKeys,
                  openai: e.target.value
                })}
                placeholder="sk-..."
                className="input-field w-full text-sm"
                form="ai-settings-form"
              />
              <div className="flex items-center justify-between mt-2">
                <select
                  value={settings.aiModelPreferences.openai}
                  onChange={(e) => handleSettingChange('aiModelPreferences', {
                    ...settings.aiModelPreferences,
                    openai: e.target.value
                  })}
                  className="input-field text-xs w-32"
                >
                  <option value="gpt-5">GPT-5 (Latest)</option>
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="gpt-4o-mini">GPT-4o Mini</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  <option value="gpt-4">GPT-4</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                </select>
                <a 
                  href="https://platform.openai.com/api-keys" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Get API Key →
                </a>
              </div>
            </div>

            {/* Anthropic */}
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-300">Anthropic Claude</label>
                <span className="text-xs text-gray-500">
                  {settings.aiApiKeys.anthropic ? '✓ Configured' : 'Not configured'}
                </span>
              </div>
              <input
                type="password"
                value={settings.aiApiKeys.anthropic}
                onChange={(e) => handleSettingChange('aiApiKeys', {
                  ...settings.aiApiKeys,
                  anthropic: e.target.value
                })}
                placeholder="sk-ant-..."
                className="input-field w-full text-sm"
                form="ai-settings-form"
              />
              <div className="flex items-center justify-between mt-2">
                <select
                  value={settings.aiModelPreferences.anthropic}
                  onChange={(e) => handleSettingChange('aiModelPreferences', {
                    ...settings.aiModelPreferences,
                    anthropic: e.target.value
                  })}
                  className="input-field text-xs w-32"
                >
                  <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
                  <option value="claude-3-sonnet-20240229">Claude 3 Sonnet</option>
                  <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                </select>
                <a 
                  href="https://console.anthropic.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Get API Key →
                </a>
              </div>
            </div>

            {/* Google Gemini */}
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-300">Google Gemini</label>
                <span className="text-xs text-gray-500">
                  {settings.aiApiKeys.google ? '✓ Configured' : 'Not configured'}
                </span>
              </div>
              <input
                type="password"
                value={settings.aiApiKeys.google}
                onChange={(e) => handleSettingChange('aiApiKeys', {
                  ...settings.aiApiKeys,
                  google: e.target.value
                })}
                placeholder="AIza..."
                className="input-field w-full text-sm"
                form="ai-settings-form"
              />
              <div className="flex items-center justify-between mt-2">
                <select
                  value={settings.aiModelPreferences.google}
                  onChange={(e) => handleSettingChange('aiModelPreferences', {
                    ...settings.aiModelPreferences,
                    google: e.target.value
                  })}
                  className="input-field text-xs w-32"
                >
                  <option value="gemini-pro">Gemini Pro</option>
                  <option value="gemini-pro-vision">Gemini Pro Vision</option>
                </select>
                <a 
                  href="https://makersuite.google.com/app/apikey" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Get API Key →
                </a>
              </div>
            </div>

            {/* Custom Endpoint */}
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-300">Custom Endpoint</label>
                <span className="text-xs text-gray-500">
                  {settings.aiApiKeys.custom ? '✓ Configured' : 'Not configured'}
                </span>
              </div>
              <input
                type="password"
                value={settings.aiApiKeys.custom}
                onChange={(e) => handleSettingChange('aiApiKeys', {
                  ...settings.aiApiKeys,
                  custom: e.target.value
                })}
                placeholder="Custom API key or endpoint URL"
                className="input-field w-full text-sm"
                form="ai-settings-form"
              />
              <p className="text-xs text-gray-500 mt-1">
                For custom AI endpoints or other providers
              </p>
            </div>
          </div>
        </div>
        
        <div className="space-y-3">
          <label className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-300">Enable AI insights</span>
              <HelpTooltip content="Show AI-powered suggestions and explanations in analysis results" />
            </div>
            <input
              type="checkbox"
              checked={settings.enableAIInsights}
              onChange={(e) => handleSettingChange('enableAIInsights', e.target.checked)}
              className="rounded border-gray-600 text-primary-600 focus:ring-primary-500 w-4 h-4 sm:w-5 sm:h-5"
            />
          </label>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-blue-400 mb-1">AI Analysis</h4>
              <p className="text-xs text-gray-300">
                When enabled, code snippets are sent to your chosen AI provider for enhanced analysis. 
                Review your provider's privacy policy before enabling. API keys are stored locally and encrypted.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderEnvironmentStatus = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
          <Monitor className="w-5 h-5 text-blue-400" />
          <span>Environment Status</span>
        </h3>
        
        {/* Connection Status */}
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
          <h4 className="text-md font-medium text-white mb-3 flex items-center space-x-2">
            <Wifi className="w-4 h-4 text-blue-400" />
            <span>Connection Status</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
              <span className="text-sm text-gray-300">
                WebSocket: {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            {healthData?.services?.websocket && (
              <div className="text-sm text-gray-400">
                Active Connections: {healthData.services.websocket.connections || 0}
              </div>
            )}
          </div>
        </div>

        {/* Server Health */}
        {healthData && (
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
            <h4 className="text-md font-medium text-white mb-3 flex items-center space-x-2">
              <Server className="w-4 h-4 text-green-400" />
              <span>Server Health</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-400">Status:</span>
                <span className={`text-sm ml-2 ${healthData.status === 'ok' ? 'text-green-400' : 'text-red-400'}`}>
                  {healthData.status || 'Unknown'}
                </span>
              </div>
              {healthData.system?.memory && (
                <div>
                  <span className="text-sm text-gray-400">Memory:</span>
                  <span className="text-sm text-gray-200 ml-2">
                    {Math.round(healthData.system.memory.used / 1024 / 1024)}MB / {Math.round(healthData.system.memory.total / 1024 / 1024)}MB
                  </span>
                </div>
              )}
              {healthData.system?.cpu && (
                <div>
                  <span className="text-sm text-gray-400">CPU:</span>
                  <span className="text-sm text-gray-200 ml-2">
                    {healthData.system.cpu.user}ms user, {healthData.system.cpu.system}ms system
                  </span>
                </div>
              )}
              {healthData.responseTime && (
                <div>
                  <span className="text-sm text-gray-400">Response Time:</span>
                  <span className="text-sm text-gray-200 ml-2">{healthData.responseTime}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Database Status */}
        {healthData?.services?.database && (
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
            <h4 className="text-md font-medium text-white mb-3 flex items-center space-x-2">
              <Database className="w-4 h-4 text-purple-400" />
              <span>Database Status</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-400">Status:</span>
                <span className={`text-sm ml-2 ${healthData.services.database.status === 'ok' ? 'text-green-400' : 'text-red-400'}`}>
                  {healthData.services.database.connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              {healthData.services.database.pool && (
                <div>
                  <span className="text-sm text-gray-400">Connection Pool:</span>
                  <span className="text-sm text-gray-200 ml-2">
                    {healthData.services.database.pool.idleCount} idle, {healthData.services.database.pool.waitingCount || 0} waiting
                  </span>
                </div>
              )}
              {healthData.services.database.cache && (
                <div>
                  <span className="text-sm text-gray-400">Cache Hit Rate:</span>
                  <span className="text-sm text-gray-200 ml-2">
                    {(() => {
                      const hitRate = healthData.services.database.cache.hitRate;
                      if (hitRate === null || hitRate === undefined || isNaN(hitRate)) {
                        return '0%';
                      }
                      return `${Math.round(hitRate)}%`;
                    })()}
                  </span>
                </div>
              )}
              {healthData.services.database.tables && (
                <div>
                  <span className="text-sm text-gray-400">Tables:</span>
                  <span className="text-sm text-gray-200 ml-2">
                    {healthData.services.database.tables} tables
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Semantic Search Status */}
        {healthData?.services?.semanticSearch && (
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
            <h4 className="text-md font-medium text-white mb-3 flex items-center space-x-2">
              <Search className="w-4 h-4 text-orange-400" />
              <span>Semantic Search</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-400">Status:</span>
                <span className={`text-sm ml-2 ${healthData.services.semanticSearch.status === 'ok' ? 'text-green-400' : 'text-red-400'}`}>
                  {healthData.services.semanticSearch.status}
                </span>
              </div>
              {healthData.services.semanticSearch.indexes && (
                <div>
                  <span className="text-sm text-gray-400">Indexes:</span>
                  <span className="text-sm text-gray-200 ml-2">
                    {healthData.services.semanticSearch.indexes.length} active
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI Service Status */}
        {healthData?.services?.ai && (
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
            <h4 className="text-md font-medium text-white mb-3 flex items-center space-x-2">
              <Brain className="w-4 h-4 text-cyan-400" />
              <span>AI Services</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-400">Status:</span>
                <span className={`text-sm ml-2 ${healthData.services.ai.status === 'ok' ? 'text-green-400' : 'text-red-400'}`}>
                  {healthData.services.ai.status}
                </span>
              </div>
              {healthData.services.ai.providers && (
                <div>
                  <span className="text-sm text-gray-400">Providers:</span>
                  <span className="text-sm text-gray-200 ml-2">
                    {Object.keys(healthData.services.ai.providers).length} configured
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* System Information */}
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
          <h4 className="text-md font-medium text-white mb-3 flex items-center space-x-2">
            <HardDrive className="w-4 h-4 text-gray-400" />
            <span>System Information</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {healthData?.system?.platform && (
              <div>
                <span className="text-sm text-gray-400">Platform:</span>
                <span className="text-sm text-gray-200 ml-2">{healthData.system.platform}</span>
              </div>
            )}
            {healthData?.system?.nodeVersion && (
              <div>
                <span className="text-sm text-gray-400">Node.js:</span>
                <span className="text-sm text-gray-200 ml-2">{healthData.system.nodeVersion}</span>
              </div>
            )}
            {healthData?.uptime && (
              <div>
                <span className="text-sm text-gray-400">Uptime:</span>
                <span className="text-sm text-gray-200 ml-2">
                  {Math.floor(healthData.uptime / 3600)}h {Math.floor((healthData.uptime % 3600) / 60)}m
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    createPortal(
      <div className="modal-container z-[99994] p-4 sm:p-6 animate-fade-in" onClick={onClose}>
        <div ref={modalRef} className="modal-content w-full max-w-4xl animate-scale-up" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-700/50">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
                <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white">Settings</h2>
                <p className="text-xs sm:text-sm text-gray-400">Customize your ManitoDebug experience</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-3">
              {hasChanges && (
                <div className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                  <span className="text-xs text-yellow-400 font-medium hidden sm:inline">Unsaved changes</span>
                  <span className="text-xs text-yellow-400 font-medium sm:hidden">Changes</span>
                </div>
              )}
              <KeyboardTooltip shortcut="Escape" description="Close settings">
                <button
                  onClick={onClose}
                  className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-700/50 transition-all duration-200 hover:scale-105 focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
                  aria-label="Close settings"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                </button>
              </KeyboardTooltip>
            </div>
          </div>

          {/* Mobile Tab Selector */}
          <div className="md:hidden border-b border-gray-700/50 p-3 sm:p-4">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500/50 focus:outline-none text-sm"
            >
              {tabs.map(tab => (
                <option key={tab.id} value={tab.id}>{tab.label}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar */}
            <div className="w-48 sm:w-64 border-r border-gray-700/50 p-3 sm:p-4 hidden md:block">
              <nav className="space-y-1 sm:space-y-2" role="tablist">
                {tabs.map(tab => {
                  const Icon = tab.icon
                  const isActive = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      role="tab"
                      aria-selected={isActive}
                      aria-controls={`panel-${tab.id}`}
                      className={`w-full flex items-center space-x-2 sm:space-x-3 px-3 sm:px-4 py-2 sm:py-3 rounded-xl text-xs sm:text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                        isActive
                          ? 'bg-gradient-to-r from-primary-600/20 to-primary-500/10 text-primary-400 border border-primary-600/30 shadow-lg'
                          : 'text-gray-300 hover:bg-gray-700/30 hover:text-white hover:scale-[1.02]'
                      }`}
                    >
                      <Icon className={`w-3 h-3 sm:w-4 sm:h-4 transition-colors ${isActive ? 'text-primary-400' : 'text-gray-400'}`} />
                      <span className="font-medium">{tab.label}</span>
                      {isActive && (
                        <div className="ml-auto w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary-400 rounded-full"></div>
                      )}
                    </button>
                  )
                })}
              </nav>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col">
              <div className="flex-1 p-3 sm:p-6 overflow-y-auto" role="tabpanel" id={`panel-${activeTab}`}>
                <div className="animate-fade-in">
                  {activeTab === 'general' && renderGeneralSettings()}
                  {activeTab === 'appearance' && renderAppearanceSettings()}
                  {activeTab === 'notifications' && renderNotificationSettings()}
                  {activeTab === 'analysis' && renderAnalysisSettings()}
                  {activeTab === 'performance' && renderPerformanceSettings()}
                  {activeTab === 'security' && renderSecuritySettings()}
                  {activeTab === 'ai' && renderAISettings()}
                  {activeTab === 'environment' && renderEnvironmentStatus()}
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-gray-700/50 p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0">
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <button
                    onClick={exportSettings}
                    className="btn-ghost btn-sm flex items-center space-x-1 hover:bg-blue-500/10 hover:text-blue-400 transition-all duration-200 text-xs sm:text-sm"
                  >
                    <Download className="w-3 h-3" />
                    <span>Export</span>
                  </button>
                  
                  <label className="btn-ghost btn-sm flex items-center space-x-1 cursor-pointer hover:bg-green-500/10 hover:text-green-400 transition-all duration-200 text-xs sm:text-sm">
                    <Upload className="w-3 h-3" />
                    <span>Import</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={importSettings}
                      className="hidden"
                    />
                  </label>
                  
                  <button
                    onClick={resetSettings}
                    className="btn-ghost btn-sm flex items-center space-x-1 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10 transition-all duration-200 text-xs sm:text-sm"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                </div>
                
                <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto">
                  <button
                    onClick={onClose}
                    className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded-lg transition-all duration-200 focus:ring-2 focus:ring-gray-500/50 focus:outline-none text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveSettings}
                    disabled={!hasChanges}
                    className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-1 sm:space-x-2 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-500/50 focus:outline-none hover:scale-105 text-sm"
                  >
                    <Save className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>{hasChanges ? 'Save Changes' : 'No Changes'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>,
      document.body
    )
  )
}

export default SettingsModal