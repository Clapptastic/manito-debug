import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  Settings, 
  Key, 
  Eye, 
  EyeOff, 
  TestTube, 
  CheckCircle, 
  AlertCircle,
  Save,
  RefreshCw,
  X
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from './Toast';

const AIProviderConfig = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showKeys, setShowKeys] = useState(false);

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

  const [providers, setProviders] = useState({});
  const [apiKeys, setApiKeys] = useState({
    openai: '',
    anthropic: '',
    google: ''
  });
  const [selectedProvider, setSelectedProvider] = useState('openai');
  const [testResults, setTestResults] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [vaultStatus, setVaultStatus] = useState(null);
  const [storedKeys, setStoredKeys] = useState([]);
  const toast = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isOpen) {
      loadProviders();
      loadVaultStatus();
      loadStoredKeys();
    }
  }, [isOpen]);

  const loadProviders = async () => {
    try {
      const response = await fetch('/api/ai/providers');
      const data = await response.json();
      setProviders(data);
    } catch (error) {
      console.error('Failed to load providers:', error);
    }
  };

  const loadVaultStatus = async () => {
    try {
      const response = await fetch('/api/vault/status');
      const data = await response.json();
      setVaultStatus(data);
    } catch (error) {
      console.error('Failed to load vault status:', error);
      setVaultStatus({ initialized: false, health: { status: 'error' } });
    }
  };

  const loadStoredKeys = async () => {
    try {
      const response = await fetch('/api/vault/keys');
      const data = await response.json();
      setStoredKeys(data.providers || []);
    } catch (error) {
      console.error('Failed to load stored keys:', error);
      setStoredKeys([]);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/ai/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          aiApiKeys: apiKeys,
          aiProvider: selectedProvider
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        // Reload data to reflect changes
        await loadProviders();
        await loadStoredKeys();
        
        // Show success message
        if (result.vaultEnabled) {
          toast.success('API keys saved securely to vault');
        } else {
          toast.success('API keys saved (vault not available)');
        }
      } else {
        toast.error(result.error || 'Failed to save API keys');
      }
    } catch (error) {
      console.error('Failed to save API keys:', error);
      toast.error('Failed to save API keys');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteKey = async (provider) => {
    try {
      const response = await fetch(`/api/vault/keys/${provider}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      
      if (result.success) {
        await loadStoredKeys();
        toast.success(`API key for ${provider} deleted`);
      } else {
        toast.error(result.error || 'Failed to delete API key');
      }
    } catch (error) {
      console.error('Failed to delete API key:', error);
      toast.error('Failed to delete API key');
    }
  };

  const handleDeleteAllKeys = async () => {
    if (!confirm('Are you sure you want to delete all stored API keys?')) {
      return;
    }

    try {
      const response = await fetch('/api/vault/keys', {
        method: 'DELETE',
      });

      const result = await response.json();
      
      if (result.success) {
        await loadStoredKeys();
        setApiKeys({ openai: '', anthropic: '', google: '' });
        toast.success('All API keys deleted');
      } else {
        toast.error(result.error || 'Failed to delete API keys');
      }
    } catch (error) {
      console.error('Failed to delete API keys:', error);
      toast.error('Failed to delete API keys');
    }
  };

  // Test AI connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async (provider) => {
      const response = await fetch('/api/ai/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });
      const data = await response.json();
      return data;
    },
    onSuccess: (data, provider) => {
      setTestResults(prev => ({
        ...prev,
        [provider]: data.success ? 'success' : 'error'
      }));
      if (data.success) {
        toast.success(`${provider} connection test successful!`);
      } else {
        toast.error(`${provider} connection test failed: ${data.error}`);
      }
    },
    onError: (error, provider) => {
      setTestResults(prev => ({
        ...prev,
        [provider]: 'error'
      }));
      toast.error(`${provider} connection test failed: ${error.message}`);
    },
  });

  const handleSaveSettings = () => {
    handleSave();
  };

  const handleTestConnection = (provider) => {
    testConnectionMutation.mutate(provider);
  };

  const providerConfigs = [
    {
      id: 'openai',
      name: 'OpenAI',
      description: 'GPT-4, GPT-3.5 Turbo, and other OpenAI models',
      icon: '🤖',
      color: 'text-green-400',
      bgColor: 'bg-green-400/10',
      borderColor: 'border-green-400/20'
    },
    {
      id: 'anthropic',
      name: 'Anthropic',
      description: 'Claude and other Anthropic models',
      icon: '🧠',
      color: 'text-purple-400',
      bgColor: 'bg-purple-400/10',
      borderColor: 'border-purple-400/20'
    },
    {
      id: 'google',
      name: 'Google AI',
      description: 'Gemini and other Google AI models',
      icon: '🔍',
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/10',
      borderColor: 'border-blue-400/20'
    }
  ];

  return (
    <div className={className}>
      {/* AI Provider Config Trigger */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center space-x-2 px-2 sm:px-3 py-2 text-xs sm:text-sm text-gray-400 bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600 hover:text-gray-300 transition-colors"
      >
        <Brain className="w-3 h-3 sm:w-4 sm:h-4" />
        <span className="hidden sm:inline">AI Config</span>
        <span className="sm:hidden">AI</span>
        {Object.values(providers).some(p => p.available) && (
          <span className="px-1 py-0.5 text-xs bg-green-600 text-white rounded-full">
            ✓
          </span>
        )}
      </button>

      {/* AI Provider Config Modal */}
      {isOpen && (
        <div className="modal-container z-[99996] p-4 sm:p-6 animate-fade-in" onClick={() => setIsOpen(false)}>
          <div className="modal-content w-full max-w-4xl animate-scale-up" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-700 flex-shrink-0">
              <div className="flex-1">
                <h2 className="text-lg sm:text-xl font-semibold text-white">AI Provider Configuration</h2>
                <p className="text-gray-400 text-xs sm:text-sm">Configure AI providers and API keys</p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    queryClient.invalidateQueries(['ai-providers']);
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

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
              {/* Provider Selection */}
              <div className="p-4 sm:p-6 border-b border-gray-700">
                <h3 className="text-base sm:text-lg font-medium text-white mb-4">Select AI Provider</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {providerConfigs.map((provider) => (
                    <div
                      key={provider.id}
                      className={`p-3 sm:p-4 rounded-lg border cursor-pointer transition-colors ${
                        selectedProvider === provider.id
                          ? `${provider.borderColor} ${provider.bgColor}`
                          : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                      }`}
                      onClick={() => setSelectedProvider(provider.id)}
                    >
                      <div className="flex items-center space-x-2 sm:space-x-3 mb-2">
                        <span className="text-xl sm:text-2xl">{provider.icon}</span>
                        <div className="flex-1 min-w-0">
                          <h4 className={`font-medium text-sm sm:text-base ${provider.color} truncate`}>{provider.name}</h4>
                          <p className="text-xs text-gray-400 line-clamp-2">{provider.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">
                          Status: {providers[provider.id]?.available ? 'Available' : 'Not configured'}
                        </span>
                        {testResults[provider.id] && (
                          <span className={`text-xs ${
                            testResults[provider.id] === 'success' ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {testResults[provider.id] === 'success' ? '✓ Tested' : '✗ Failed'}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* API Keys Configuration */}
              <div className="p-4 sm:p-6 border-b border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base sm:text-lg font-medium text-white">API Keys</h3>
                  <button
                    onClick={() => setShowKeys(!showKeys)}
                    className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-2 text-xs sm:text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    {showKeys ? <EyeOff className="w-3 h-3 sm:w-4 sm:h-4" /> : <Eye className="w-3 h-3 sm:w-4 sm:h-4" />}
                    <span>{showKeys ? 'Hide' : 'Show'} Keys</span>
                  </button>
                </div>

                <div className="space-y-3 sm:space-y-4">
                  {providerConfigs.map((provider) => (
                    <div key={provider.id} className="space-y-2">
                      <label className="block text-xs sm:text-sm font-medium text-gray-300">
                        {provider.name} API Key
                      </label>
                      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                        <input
                          type={showKeys ? 'text' : 'password'}
                          value={apiKeys[provider.id] || ''}
                          onChange={(e) => setApiKeys(prev => ({
                            ...prev,
                            [provider.id]: e.target.value
                          }))}
                          placeholder={`Enter your ${provider.name} API key`}
                          className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 text-sm"
                        />
                        <button
                          onClick={() => handleTestConnection(provider.id)}
                          disabled={!apiKeys[provider.id] || testConnectionMutation.isLoading}
                          className="px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center justify-center space-x-1 sm:space-x-2 text-xs sm:text-sm"
                        >
                          <TestTube className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span>Test</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Provider Status */}
              <div className="p-4 sm:p-6 border-b border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base sm:text-lg font-medium text-white">Provider Status</h3>
                  {vaultStatus && (
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${vaultStatus.initialized ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className="text-xs sm:text-sm text-gray-400">
                        Vault: {vaultStatus.initialized ? 'Secure' : 'Not Available'}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {providerConfigs.map((provider) => (
                    <div key={provider.id} className="p-3 sm:p-4 bg-gray-800 rounded-lg border border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg sm:text-xl">{provider.icon}</span>
                          <span className="text-white font-medium text-sm sm:text-base">{provider.name}</span>
                        </div>
                        {providers[provider.id]?.available ? (
                          <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
                        ) : (
                          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
                        )}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-400">
                        {providers[provider.id]?.available 
                          ? 'Provider is available and configured'
                          : 'Provider not configured or unavailable'
                        }
                      </div>
                      {storedKeys.includes(provider.id) && (
                        <div className="mt-2 flex items-center space-x-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                          <span className="text-xs text-blue-400">Securely stored</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {storedKeys.length > 0 && (
                  <div className="mt-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm sm:text-base font-medium text-gray-200">Stored API Keys</h4>
                      <button
                        onClick={handleDeleteAllKeys}
                        className="text-red-400 hover:text-red-300 text-xs sm:text-sm"
                      >
                        Delete All
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {storedKeys.map((provider) => (
                        <div key={provider} className="flex items-center space-x-2 bg-gray-700 rounded px-3 py-1">
                          <span className="text-xs sm:text-sm text-gray-300 capitalize">{provider}</span>
                          <button
                            onClick={() => handleDeleteKey(provider)}
                            className="text-red-400 hover:text-red-300 text-xs"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 sm:p-6 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 border-t border-gray-700 flex-shrink-0">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full sm:w-auto px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSettings}
                disabled={isLoading}
                className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors text-sm"
              >
                <Save className="w-4 h-4" />
                <span>{isLoading ? 'Saving...' : 'Save Settings'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIProviderConfig;
