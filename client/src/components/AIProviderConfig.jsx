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
  RefreshCw
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from './Toast';

const AIProviderConfig = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  const [apiKeys, setApiKeys] = useState({
    openai: '',
    anthropic: '',
    google: ''
  });
  const [selectedProvider, setSelectedProvider] = useState('openai');
  const [testResults, setTestResults] = useState({});
  const toast = useToast();
  const queryClient = useQueryClient();

  // Fetch AI providers
  const providersQuery = useQuery({
    queryKey: ['ai-providers'],
    queryFn: async () => {
      const response = await fetch('/api/ai/providers');
      const data = await response.json();
      return data.success ? data.providers : {};
    },
    staleTime: 30000,
  });

  // Update AI settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (settings) => {
      const response = await fetch('/api/ai/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to update settings');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['ai-providers']);
      toast.success('AI settings updated successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to update settings: ${error.message}`);
    },
  });

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
    updateSettingsMutation.mutate({
      aiApiKeys: apiKeys,
      aiProvider: selectedProvider
    });
  };

  const handleTestConnection = (provider) => {
    testConnectionMutation.mutate(provider);
  };

  const providers = providersQuery.data || {};
  const isLoading = providersQuery.isLoading;

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
        className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-400 bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600 hover:text-gray-300 transition-colors"
      >
        <Brain className="w-4 h-4" />
        <span>AI Config</span>
        {Object.values(providers).some(p => p.available) && (
          <span className="px-1.5 py-0.5 text-xs bg-green-600 text-white rounded-full">
            ✓
          </span>
        )}
      </button>

      {/* AI Provider Config Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setIsOpen(false)} />
          <div className="relative w-full max-w-4xl bg-gray-900 rounded-lg border border-gray-700 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <div>
                <h2 className="text-xl font-semibold text-white">AI Provider Configuration</h2>
                <p className="text-gray-400 text-sm">Configure AI providers and API keys</p>
              </div>
              <button
                onClick={() => {
                  queryClient.invalidateQueries(['ai-providers']);
                }}
                className="flex items-center space-x-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh</span>
              </button>
            </div>

            {/* Provider Selection */}
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-lg font-medium text-white mb-4">Select AI Provider</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {providerConfigs.map((provider) => (
                  <div
                    key={provider.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      selectedProvider === provider.id
                        ? `${provider.borderColor} ${provider.bgColor}`
                        : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                    }`}
                    onClick={() => setSelectedProvider(provider.id)}
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-2xl">{provider.icon}</span>
                      <div>
                        <h4 className={`font-medium ${provider.color}`}>{provider.name}</h4>
                        <p className="text-xs text-gray-400">{provider.description}</p>
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
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white">API Keys</h3>
                <button
                  onClick={() => setShowKeys(!showKeys)}
                  className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  {showKeys ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  <span>{showKeys ? 'Hide' : 'Show'} Keys</span>
                </button>
              </div>

              <div className="space-y-4">
                {providerConfigs.map((provider) => (
                  <div key={provider.id} className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">
                      {provider.name} API Key
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type={showKeys ? 'text' : 'password'}
                        value={apiKeys[provider.id] || ''}
                        onChange={(e) => setApiKeys(prev => ({
                          ...prev,
                          [provider.id]: e.target.value
                        }))}
                        placeholder={`Enter your ${provider.name} API key`}
                        className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                      />
                      <button
                        onClick={() => handleTestConnection(provider.id)}
                        disabled={!apiKeys[provider.id] || testConnectionMutation.isLoading}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center space-x-2"
                      >
                        <TestTube className="w-4 h-4" />
                        <span>Test</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Provider Status */}
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-lg font-medium text-white mb-4">Provider Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {providerConfigs.map((provider) => (
                  <div key={provider.id} className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-xl">{provider.icon}</span>
                        <span className="text-white font-medium">{provider.name}</span>
                      </div>
                      {providers[provider.id]?.available ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-400" />
                      )}
                    </div>
                    <div className="text-sm text-gray-400">
                      {providers[provider.id]?.available 
                        ? 'Provider is available and configured'
                        : 'Provider not configured or unavailable'
                      }
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 flex justify-end space-x-3">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSettings}
                disabled={updateSettingsMutation.isLoading}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>{updateSettingsMutation.isLoading ? 'Saving...' : 'Save Settings'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIProviderConfig;
