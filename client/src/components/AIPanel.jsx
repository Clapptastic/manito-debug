import React, { useState, useRef, useEffect } from 'react'
import {
  Brain,
  Send,
  Loader2,
  X,
  Sparkles,
  MessageCircle,
  Code,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  Copy,
  ExternalLink,
  Maximize2,
  Minimize2,
  RotateCcw,
  Zap,
  Star,
  AlertCircle
} from 'lucide-react'
import { useSettings } from '../contexts/SettingsContext'
import { useUserFeedback } from '../utils/userFeedback'
import dynamicPortConfig from '../utils/portConfig.js';

function AIPanel({ scanResults, onClose }) {
  const { 
    settings, 
    getValidAIProvider, 
    getAIApiKey, 
    getAIModel
  } = useSettings()
  const feedback = useUserFeedback()
  
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      content: 'Hello! I\'m your AI code analysis assistant. I can help you understand your codebase, identify potential improvements, and answer questions about your code structure.',
      timestamp: new Date()
    }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState(() => getValidAIProvider() || 'openai')
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const aiProviders = {
    openai: { 
      name: 'OpenAI GPT', 
      icon: '🤖', 
      color: 'text-green-400',
      apiKey: getAIApiKey('openai'),
      model: getAIModel('openai')
    },
    anthropic: { 
      name: 'Claude', 
      icon: '🧠', 
      color: 'text-purple-400',
      apiKey: getAIApiKey('anthropic'),
      model: getAIModel('anthropic')
    },
    google: { 
      name: 'Google Gemini', 
      icon: '🔍', 
      color: 'text-orange-400',
      apiKey: getAIApiKey('google'),
      model: getAIModel('google')
    },
    custom: { 
      name: 'Custom API', 
      icon: '⚙️', 
      color: 'text-gray-400',
      apiKey: getAIApiKey('custom'),
      model: 'custom'
    }
  }

  const suggestedQuestions = [
    "Analyze my codebase architecture and identify potential improvements",
    "What security vulnerabilities should I be aware of?",
    "How can I improve the performance of my code?",
    "What are the main technical debt issues in my project?",
    "Analyze the code quality and suggest refactoring opportunities",
    "What testing gaps exist in my codebase?",
    "How maintainable is my current code structure?",
    "What are the best practices I should implement?"
  ]

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (scanResults && messages.length === 1) {
      // Auto-generate insights when scan results are available
      generateInitialInsights()
    }
  }, [scanResults])

  const generateInitialInsights = async () => {
    if (!scanResults || !scanResults.files || scanResults.files.length === 0) {
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'ai',
        content: `⚠️ **No Scan Data Available**\n\nI don't see any scan results to analyze. Please run a code scan first to get comprehensive insights about your codebase.\n\n**To get started:**\n1. Use the sidebar to scan your code\n2. Wait for the scan to complete\n3. Ask me to analyze the results`,
        timestamp: new Date(),
        isWarning: true
      }]);
      return;
    }

    setIsLoading(true)
    
    try {
      const serverUrl = dynamicPortConfig.getServerUrl();
      const response = await fetch(`${serverUrl}/api/ai/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          path: scanResults.rootPath || '/path/to/codebase',
          options: {
            patterns: ['**/*.{js,jsx,ts,tsx}'],
            excludePatterns: ['node_modules/**', 'dist/**', 'build/**']
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const analysisData = result.data;
          const insights = formatComprehensiveAnalysis(analysisData, 'Initial codebase analysis');
          
          setMessages(prev => [...prev, {
            id: Date.now(),
            type: 'ai',
            content: insights,
            timestamp: new Date(),
            isInsight: true,
            isRealData: true,
            isComprehensiveAnalysis: true,
            analysisData: analysisData
          }]);
        } else {
          // Fallback to local analysis if backend fails
          const insights = generateCodeInsights(scanResults);
          setMessages(prev => [...prev, {
            id: Date.now(),
            type: 'ai',
            content: `⚠️ **Backend AI Analysis Unavailable**: Using local analysis.\n\n${insights}`,
            timestamp: new Date(),
            isInsight: true,
            isFallback: true
          }]);
        }
      } else {
        // Check if it's a configuration error
        const errorData = await response.json();
        if (errorData.error?.includes('Provider') || errorData.error?.includes('API key')) {
          setMessages(prev => [...prev, {
            id: Date.now(),
            type: 'ai',
            content: `⚠️ **AI Configuration Required**\n\nI can't provide comprehensive analysis because no AI provider is configured.\n\n**To enable AI analysis:**\n1. Click the AI Settings button (⚙️) in the header\n2. Add your OpenAI API key\n3. Test the connection\n4. Ask me to analyze your code again\n\n**Current Scan Results:**\n- Files: ${scanResults.files.length}\n- Lines: ${scanResults.metrics?.linesOfCode || 'Unknown'}\n- Dependencies: ${scanResults.dependencies?.length || 0}`,
            timestamp: new Date(),
            isWarning: true,
            isConfigError: true
          }]);
        } else {
          // Fallback to local analysis
          const insights = generateCodeInsights(scanResults);
          setMessages(prev => [...prev, {
            id: Date.now(),
            type: 'ai',
            content: `⚠️ **Backend AI Analysis Unavailable**: Using local analysis.\n\n${insights}`,
            timestamp: new Date(),
            isInsight: true,
            isFallback: true
          }]);
        }
      }
    } catch (error) {
      console.error('AI analysis failed:', error);
      
      // Check if it's a configuration error
      if (error.message?.includes('Provider') || error.message?.includes('API key')) {
        setMessages(prev => [...prev, {
          id: Date.now(),
          type: 'ai',
          content: `⚠️ **AI Configuration Required**\n\nI can't provide comprehensive analysis because no AI provider is configured.\n\n**To enable AI analysis:**\n1. Click the AI Settings button (⚙️) in the header\n2. Add your OpenAI API key\n3. Test the connection\n4. Ask me to analyze your code again\n\n**Current Scan Results:**\n- Files: ${scanResults.files.length}\n- Lines: ${scanResults.metrics?.linesOfCode || 'Unknown'}\n- Dependencies: ${scanResults.dependencies?.length || 0}`,
          timestamp: new Date(),
          isWarning: true,
          isConfigError: true
        }]);
      } else {
        // Fallback to local analysis
        const insights = generateCodeInsights(scanResults);
        setMessages(prev => [...prev, {
          id: Date.now(),
          type: 'ai',
          content: `⚠️ **AI Analysis Failed**: Using local analysis.\n\n${insights}\n\n**Error:** ${error.message}`,
          timestamp: new Date(),
          isInsight: true,
          isFallback: true
        }]);
      }
    } finally {
      setIsLoading(false)
    }
  }

  const generateCodeInsights = (data) => {
    const files = data.files || []
    const conflicts = data.conflicts || []
    const totalLines = files.reduce((sum, f) => sum + (f.lines || 0), 0)
    const avgComplexity = files.reduce((sum, f) => sum + (f.complexity || 0), 0) / files.length
    const largeFiles = files.filter(f => (f.lines || 0) > 200)
    const complexFiles = files.filter(f => (f.complexity || 0) > 5)

    let insights = `## 📊 Code Analysis Insights\n\n`
    
    // Overall Health
    const healthScore = Math.max(0, 100 - (conflicts.length * 10) - (complexFiles.length * 5))
    insights += `### 🎯 Overall Health: ${healthScore}%\n`
    
    if (healthScore >= 80) {
      insights += `🎉 **Excellent!** Your codebase is well-structured and maintainable.\n\n`
    } else if (healthScore >= 60) {
      insights += `👍 **Good!** Your codebase has a solid foundation with some areas for improvement.\n\n`
    } else {
      insights += `⚠️ **Needs Attention** There are several areas that could benefit from refactoring.\n\n`
    }

    // Key Metrics
    insights += `### 📈 Key Metrics\n`
    insights += `- **Files Analyzed:** ${files.length}\n`
    insights += `- **Lines of Code:** ${totalLines.toLocaleString()}\n`
    insights += `- **Average Complexity:** ${avgComplexity.toFixed(1)}\n`
    insights += `- **Conflicts Found:** ${conflicts.length}\n\n`

    // Recommendations
    insights += `### 💡 Recommendations\n`
    
    if (complexFiles.length > 0) {
      insights += `🔧 **Complexity:** ${complexFiles.length} files have high complexity. Consider breaking them into smaller, more focused modules.\n\n`
    }
    
    if (largeFiles.length > 0) {
      insights += `📏 **File Size:** ${largeFiles.length} files are quite large (&gt;200 lines). Consider splitting them for better maintainability.\n\n`
    }
    
    if (conflicts.length === 0) {
      insights += `✅ **Dependencies:** No circular dependencies detected - great job!\n\n`
    } else {
      insights += `🔄 **Dependencies:** Found ${conflicts.length} dependency issues that should be addressed.\n\n`
    }

    // File Type Analysis
    const fileTypes = {}
    files.forEach(f => {
      const ext = f.filePath.split('.').pop() || 'unknown'
      fileTypes[ext] = (fileTypes[ext] || 0) + 1
    })
    
    insights += `### 📁 Project Composition\n`
    Object.entries(fileTypes)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .forEach(([ext, count]) => {
        insights += `- **${ext.toUpperCase()}:** ${count} files\n`
      })

    return insights
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      const serverUrl = dynamicPortConfig.getServerUrl();
      
      // Check if we have scan results for comprehensive analysis
      const hasScanData = scanResults && scanResults.files && scanResults.files.length > 0;
      
      let response;
      let result;
      
      if (hasScanData && inputMessage.toLowerCase().includes('analyze') || 
          inputMessage.toLowerCase().includes('insights') || 
          inputMessage.toLowerCase().includes('architecture') ||
          inputMessage.toLowerCase().includes('security') ||
          inputMessage.toLowerCase().includes('performance')) {
        
        // Use comprehensive AI analysis for analysis requests
        response = await fetch(`${serverUrl}/api/ai/analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            path: scanResults.rootPath || '/path/to/codebase',
            options: {
              patterns: ['**/*.{js,jsx,ts,tsx}'],
              excludePatterns: ['node_modules/**', 'dist/**', 'build/**']
            }
          })
        });
        
        if (response.ok) {
          result = await response.json();
          if (result.success && result.data) {
            // Format comprehensive analysis results
            const analysisData = result.data;
            const insights = formatComprehensiveAnalysis(analysisData, inputMessage);
            
            const aiResponse = {
              id: Date.now() + 1,
              type: 'ai',
              content: insights,
              timestamp: new Date(),
              isRealData: true,
              isComprehensiveAnalysis: true,
              analysisData: analysisData
            };
            setMessages(prev => [...prev, aiResponse]);
            return;
          }
        }
      }
      
      // Fallback to regular AI message endpoint
      response = await fetch(`${serverUrl}/api/ai/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
          provider: selectedProvider,
          context: {
            files: scanResults?.files?.length || 0,
            conflicts: scanResults?.conflicts?.length || 0,
            totalLines: scanResults?.metrics?.linesOfCode || 0,
            scanResults: hasScanData ? scanResults : null
          }
        })
      });

      if (response.ok) {
        result = await response.json();
        if (result.success && result.data) {
          const aiResponse = {
            id: Date.now() + 1,
            type: 'ai',
            content: result.data.response,
            timestamp: new Date(),
            isRealData: true,
            confidence: result.data.confidence,
            suggestions: result.data.suggestions
          };
          setMessages(prev => [...prev, aiResponse]);
        } else {
          throw new Error(result.error || 'No response from AI service');
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Error getting AI response:', error)
      
      // Determine specific error type and provide appropriate feedback
      let errorMessage = error.message;
      let isConfigError = false;
      
      if (error.message?.includes('Provider') && error.message?.includes('not available')) {
        errorMessage = `No AI provider configured. Please configure an AI provider in settings.`;
        isConfigError = true;
      } else if (error.message?.includes('API key')) {
        errorMessage = `AI API key not configured. Please add your API key in settings.`;
        isConfigError = true;
      } else if (error.message?.includes('Rate limit')) {
        errorMessage = `AI rate limit exceeded. Please try again later.`;
      } else {
        errorMessage = `AI service error: ${error.message}`;
      }
      
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'ai',
        content: `${isConfigError ? '⚠️ **AI Configuration Required**\n\n' : '❌ **AI Error**\n\n'}${errorMessage}\n\n${isConfigError ? '**To fix this:**\n1. Click the AI Settings button (⚙️) in the header\n2. Add your OpenAI API key\n3. Test the connection\n4. Try your question again' : ''}`,
        timestamp: new Date(),
        isError: true,
        isConfigError: isConfigError
      }])
    } finally {
      setIsLoading(false)
    }
  }

  // Format comprehensive analysis results
  const formatComprehensiveAnalysis = (analysisData, userQuestion) => {
    const { metadata, qualityMetrics, architecture, security, performance, patterns, technicalDebt, maintainability, testability, documentation, recommendations } = analysisData;
    
    let response = `## 🤖 **Comprehensive AI Analysis**\n\n`;
    response += `**Question:** ${userQuestion}\n\n`;
    
    // Project Overview
    if (metadata) {
      response += `### 📊 **Project Overview**\n`;
      response += `- **Files Analyzed:** ${metadata.totalFiles}\n`;
      response += `- **Total Lines:** ${metadata.totalLines.toLocaleString()}\n`;
      response += `- **Project Type:** ${metadata.projectType || 'Unknown'}\n`;
      response += `- **Framework:** ${metadata.framework || 'None detected'}\n\n`;
    }
    
    // Quality Metrics
    if (qualityMetrics && qualityMetrics.complexity) {
      response += `### 🎯 **Code Quality**\n`;
      response += `- **Average Complexity:** ${qualityMetrics.complexity.average || 'N/A'}\n`;
      response += `- **Maintainability Score:** ${maintainability?.score || 'N/A'}/100\n`;
      response += `- **Testability Score:** ${testability?.score || 'N/A'}/100\n`;
      response += `- **Documentation Coverage:** ${documentation?.coverage || 'N/A'}%\n\n`;
    }
    
    // Architecture Insights
    if (architecture && architecture.patterns) {
      response += `### 🏗️ **Architecture Analysis**\n`;
      if (architecture.patterns.length > 0) {
        response += `**Detected Patterns:**\n`;
        architecture.patterns.forEach(pattern => {
          response += `- ${pattern}\n`;
        });
      } else {
        response += `- No specific architectural patterns detected\n`;
      }
      
      if (architecture.recommendations && architecture.recommendations.length > 0) {
        response += `\n**Architecture Recommendations:**\n`;
        architecture.recommendations.slice(0, 3).forEach(rec => {
          response += `- ${rec}\n`;
        });
      }
      response += `\n`;
    }
    
    // Security Assessment
    if (security) {
      response += `### 🔒 **Security Assessment**\n`;
      response += `- **Overall Risk:** ${security.risks?.overall || 'Unknown'}\n`;
      response += `- **Vulnerabilities Found:** ${security.vulnerabilities?.length || 0}\n`;
      response += `- **Compliance Status:** ${security.compliance?.compliant ? '✅ Compliant' : '❌ Issues Found'}\n\n`;
    }
    
    // Performance Analysis
    if (performance) {
      response += `### ⚡ **Performance Analysis**\n`;
      response += `- **Average Load Time:** ${performance.metrics?.averageLoadTime || 'N/A'}s\n`;
      response += `- **Memory Usage:** ${performance.metrics?.memoryUsage || 'N/A'}\n`;
      if (performance.recommendations && performance.recommendations.length > 0) {
        response += `\n**Performance Recommendations:**\n`;
        performance.recommendations.slice(0, 3).forEach(rec => {
          response += `- ${rec}\n`;
        });
      }
      response += `\n`;
    }
    
    // Technical Debt
    if (technicalDebt) {
      response += `### 💳 **Technical Debt**\n`;
      response += `- **Total Debt:** ${technicalDebt.total || 0} points\n`;
      if (technicalDebt.recommendations && technicalDebt.recommendations.length > 0) {
        response += `\n**Debt Reduction Recommendations:**\n`;
        technicalDebt.recommendations.slice(0, 3).forEach(rec => {
          response += `- ${rec}\n`;
        });
      }
      response += `\n`;
    }
    
    // Top Recommendations
    if (recommendations && recommendations.priority && recommendations.priority.length > 0) {
      response += `### 🎯 **Top Recommendations**\n`;
      recommendations.priority.slice(0, 5).forEach(rec => {
        response += `- **${rec.type}**: ${rec.description || 'Improvement needed'}\n`;
      });
      response += `\n`;
    }
    
    response += `---\n*Analysis generated by AI based on your codebase scan results.*`;
    
    return response;
  }

  // Note: All AI API calls are now handled by the backend
  // These functions are kept for reference but not used
  const callAIAPI = async (message, provider) => {
    // This function is no longer used - all AI calls go through backend
    throw new Error('AI calls should go through backend API')
  }

  const callOpenAI = async (apiKey, model, message) => {
    // This function is no longer used - all AI calls go through backend
    throw new Error('AI calls should go through backend API')
  }

  const callAnthropic = async (apiKey, model, message) => {
    // This function is no longer used - all AI calls go through backend
    throw new Error('AI calls should go through backend API')
  }

  const callGoogle = async (apiKey, model, message) => {
    // This function is no longer used - all AI calls go through backend
    throw new Error('AI calls should go through backend API')
  }

  const callCustomAPI = async (apiKey, message) => {
    // This function is no longer used - all AI calls go through backend
    throw new Error('AI calls should go through backend API')
  }

  const generateLocalResponse = (message) => {
    // This function is no longer used since we're using real backend calls
    // Keeping for potential fallback scenarios
    return `Local analysis: ${message.substring(0, 100)}...`
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleCopyMessage = (content) => {
    navigator.clipboard.writeText(content)
    // Could add a toast notification here
  }

  const handleSuggestedQuestion = (question) => {
    setInputMessage(question)
    inputRef.current?.focus()
  }

  const clearConversation = () => {
    setMessages([{
      id: 1,
      type: 'ai',
      content: 'Conversation cleared! How can I help you analyze your code?',
      timestamp: new Date()
    }])
  }

  const MessageBubble = ({ message }) => {
    const isAI = message.type === 'ai'
    const isError = message.isError
    const isWarning = message.isWarning
    const isConfigError = message.isConfigError
    const isComprehensiveAnalysis = message.isComprehensiveAnalysis
    
    return (
      <div className={`flex ${isAI ? 'justify-start' : 'justify-end'} mb-4`}>
        <div className={`max-w-[80%] ${isAI ? 'order-2' : 'order-1'}`}>
          {/* Avatar */}
          {isAI && (
            <div className="flex items-center space-x-2 mb-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                isConfigError ? 'bg-yellow-500' : 
                isError ? 'bg-red-500' : 
                isComprehensiveAnalysis ? 'bg-gradient-to-r from-purple-500 to-blue-500' :
                'bg-gradient-to-r from-purple-500 to-pink-500'
              }`}>
                {isConfigError ? (
                  <AlertCircle className="w-3 h-3 text-white" />
                ) : isError ? (
                  <AlertCircle className="w-3 h-3 text-white" />
                ) : (
                  <Brain className="w-3 h-3 text-white" />
                )}
              </div>
              <span className="text-xs text-gray-400">
                {isConfigError ? 'Configuration Required' : 
                 isError ? 'AI Error' : 
                 isComprehensiveAnalysis ? 'AI Analysis' : 'AI Assistant'}
              </span>
              {message.confidence && (
                <div className="flex items-center space-x-1">
                  <Star className="w-3 h-3 text-yellow-400" />
                  <span className="text-xs text-gray-400">{Math.round(message.confidence * 100)}%</span>
                </div>
              )}
            </div>
          )}
          
          {/* Message Content */}
          <div className={`p-3 rounded-lg ${
            isConfigError 
              ? 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-200'
              : isError 
                ? 'bg-red-500/10 border border-red-500/30 text-red-200'
                : isWarning
                  ? 'bg-orange-500/10 border border-orange-500/30 text-orange-200'
                  : isAI 
                    ? 'bg-gray-800/70 text-gray-100' 
                    : 'bg-primary-600 text-white'
          } ${message.isInsight ? 'border border-purple-500/30' : ''} ${
            isComprehensiveAnalysis ? 'border-2 border-purple-500/50' : ''
          }`}>
            {message.isInsight && !isComprehensiveAnalysis && (
              <div className="flex items-center space-x-1 mb-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-purple-400 font-medium">AI Insights</span>
              </div>
            )}
            
            {isComprehensiveAnalysis && (
              <div className="flex items-center space-x-1 mb-2">
                <Brain className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-purple-400 font-medium">Comprehensive Analysis</span>
              </div>
            )}
            
            {/* Render markdown-like content */}
            <div className="prose prose-invert prose-sm max-w-none">
              {message.content.split('\n').map((line, index) => {
                if (line.startsWith('### ')) {
                  return <h3 key={index} className="text-lg font-semibold mt-4 mb-2">{line.slice(4)}</h3>
                } else if (line.startsWith('## ')) {
                  return <h2 key={index} className="text-xl font-bold mt-4 mb-3">{line.slice(3)}</h2>
                } else if (line.startsWith('- ')) {
                  return <li key={index} className="ml-4">{line.slice(2)}</li>
                } else if (line.includes('**') && line.includes('**')) {
                  const parts = line.split('**')
                  return (
                    <p key={index} className="mb-2">
                      {parts.map((part, i) => 
                        i % 2 === 1 ? <strong key={i}>{part}</strong> : part
                      )}
                    </p>
                  )
                } else if (line.trim()) {
                  return <p key={index} className="mb-2">{line}</p>
                } else {
                  return <br key={index} />
                }
              })}
            </div>
            
            {/* Suggestions */}
            {message.suggestions && message.suggestions.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-600/30">
                <div className="text-xs text-gray-400 mb-2">Suggestions:</div>
                <div className="space-y-1">
                  {message.suggestions.map((suggestion, index) => (
                    <div key={index} className="text-xs text-gray-300 bg-gray-700/50 p-2 rounded">
                      {suggestion}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Configuration Error Actions */}
            {isConfigError && (
              <div className="mt-3 pt-3 border-t border-yellow-500/30">
                <div className="text-xs text-yellow-400 mb-2">Quick Actions:</div>
                <button 
                  onClick={() => {
                    // Trigger AI settings modal
                    const event = new CustomEvent('openAISettings');
                    window.dispatchEvent(event);
                  }}
                  className="text-xs bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded transition-colors"
                >
                  Open AI Settings
                </button>
              </div>
            )}
          </div>
          
          {/* Message Actions */}
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-gray-500">
              {message.timestamp.toLocaleTimeString()}
            </span>
            {(isAI || isError) && (
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => handleCopyMessage(message.content)}
                  className="text-gray-500 hover:text-gray-300 transition-colors"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`glass-panel flex flex-col transition-all duration-300 ${
      isExpanded ? 'fixed inset-4 z-[99990] animate-in fade-in duration-200' : 'w-96 h-full'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">AI Assistant</h3>
            <div className="flex items-center space-x-2">
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="text-xs bg-gray-800 border border-gray-600 text-gray-300 rounded px-2 py-1"
              >
                {Object.entries(aiProviders).map(([key, provider]) => (
                  <option key={key} value={key}>
                    {provider.icon} {provider.name}
                  </option>
                ))}
              </select>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-xs text-gray-400">Online</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={clearConversation}
            className="p-2 rounded-lg hover:bg-gray-700/50 transition-colors"
            title="Clear conversation"
          >
            <RotateCcw className="w-4 h-4 text-gray-400" />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-lg hover:bg-gray-700/50 transition-colors"
            title={isExpanded ? "Minimize" : "Maximize"}
          >
            {isExpanded ? (
              <Minimize2 className="w-4 h-4 text-gray-400" />
            ) : (
              <Maximize2 className="w-4 h-4 text-gray-400" />
            )}
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-700/50 transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        
        {isLoading && (
          <div className="flex items-center space-x-2 text-gray-400">
            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
              <Loader2 className="w-3 h-3 text-white animate-spin" />
            </div>
            <span className="text-sm">AI is thinking...</span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions */}
      {messages.length <= 2 && !isLoading && (
        <div className="p-4 border-t border-gray-700/50">
          <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center space-x-1">
            <MessageCircle className="w-4 h-4" />
            <span>Suggested Questions</span>
          </h4>
          <div className="space-y-2">
            {suggestedQuestions.slice(0, 3).map((question, index) => (
              <button
                key={index}
                onClick={() => handleSuggestedQuestion(question)}
                className="w-full text-left text-sm text-gray-400 hover:text-gray-200 p-2 rounded-lg hover:bg-gray-700/30 transition-colors"
              >
                💡 {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-700/50">
        <div className="flex items-center space-x-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about your code, request analysis, or get suggestions..."
              className="input-field w-full pr-12 py-3 resize-none"
              rows={1}
              style={{
                minHeight: '44px',
                maxHeight: '120px'
              }}
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
              <Code className="w-4 h-4 text-gray-500" />
            </div>
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className={`p-3 rounded-lg transition-all duration-200 ${
              inputMessage.trim() && !isLoading
                ? 'bg-primary-600 hover:bg-primary-700 text-white hover:shadow-lg'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
          <span>Press Enter to send, Shift+Enter for new line</span>
          <div className="flex items-center space-x-1">
            <Zap className="w-3 h-3" />
            <span>Powered by AI</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AIPanel