import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import vaultService from './vault-service.js';

class AIService {
  constructor() {
    this.providers = new Map();
    this.vaultInitialized = false;
    this.auditEnabled = true;
    // Don't initialize vault in constructor - it will be initialized later
  }

  async initialize() {
    await this.initializeVault();
  }

  async initializeVault() {
    try {
      await vaultService.initialize();
      this.vaultInitialized = true;
      console.log('Enhanced vault service initialized for AI service');
      await this.loadApiKeysFromVault();
      
      // Log initialization
      await this.logAuditEvent('AI_SERVICE_INITIALIZED', 'AI service initialized with enhanced vault', {
        providers: Array.from(this.providers.keys()),
        vaultInitialized: true
      });
    } catch (error) {
      console.warn('Vault service not available, using environment variables:', error.message);
      this.initializeProviders();
      
      await this.logAuditEvent('AI_SERVICE_FALLBACK', 'AI service using fallback configuration', {
        error: error.message,
        vaultInitialized: false
      });
    }
  }

  async logAuditEvent(eventType, message, metadata = {}) {
    try {
      if (this.vaultInitialized && this.auditEnabled) {
        await vaultService.logAuditEvent(eventType, message, {
          ...metadata,
          service: 'ai',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.warn('Failed to log audit event:', error);
    }
  }

  async loadApiKeysFromVault() {
    try {
      if (!this.vaultInitialized) {
        this.initializeProviders();
        return;
      }

      const apiKeys = await vaultService.getAllApiKeys('default');
      this.initializeProviders(apiKeys);
      
      await this.logAuditEvent('API_KEYS_LOADED', 'API keys loaded from vault', {
        keyCount: Object.keys(apiKeys).length,
        providers: Object.keys(apiKeys)
      });
    } catch (error) {
      console.error('Failed to load API keys from vault:', error);
      this.initializeProviders();
      
      await this.logAuditEvent('API_KEYS_LOAD_FAILED', 'Failed to load API keys from vault', {
        error: error.message
      });
    }
  }

  initializeProviders(apiKeys = null) {
    // Clear existing providers
    this.providers.clear();
    
    // OpenAI Provider
    const openaiKey = apiKeys?.openai || process.env.OPENAI_API_KEY;
    if (openaiKey) {
      const openai = new OpenAI({
        apiKey: openaiKey,
      });
      
      this.providers.set('openai', {
        name: 'OpenAI GPT',
        client: openai,
        model: process.env.OPENAI_MODEL || 'gpt-5',
        handler: this.handleOpenAI.bind(this),
        keyRotationEnabled: true
      });
    }

    // Claude Provider (Anthropic)
    const anthropicKey = apiKeys?.anthropic || process.env.ANTHROPIC_API_KEY;
    if (anthropicKey) {
      const anthropic = new Anthropic({
        apiKey: anthropicKey,
      });
      
      this.providers.set('anthropic', {
        name: 'Claude',
        client: anthropic,
        model: process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307',
        handler: this.handleClaude.bind(this),
        keyRotationEnabled: true
      });
    }

    // Google AI Provider (placeholder for future implementation)
    const googleKey = apiKeys?.google || process.env.GOOGLE_API_KEY;
    if (googleKey) {
      this.providers.set('google', {
        name: 'Google AI',
        model: 'gemini-pro',
        handler: this.handleGoogle.bind(this),
        keyRotationEnabled: true
      });
    }

    // Local Provider (fallback)
    this.providers.set('local', {
      name: 'Local AI',
      handler: this.handleLocal.bind(this),
      keyRotationEnabled: false
    });

    console.log(`AI Service initialized with providers: ${Array.from(this.providers.keys()).join(', ')}`);
  }

  async updateApiKeys(apiKeys) {
    try {
      if (!this.vaultInitialized) {
        // Fallback to environment variables
        if (apiKeys.openai) process.env.OPENAI_API_KEY = apiKeys.openai;
        if (apiKeys.anthropic) process.env.ANTHROPIC_API_KEY = apiKeys.anthropic;
        if (apiKeys.google) process.env.GOOGLE_API_KEY = apiKeys.google;
        this.initializeProviders();
        
        await this.logAuditEvent('API_KEYS_UPDATED_FALLBACK', 'API keys updated using fallback method', {
          providers: Object.keys(apiKeys)
        });
        return;
      }

      // Store keys in vault with enhanced security
      for (const [provider, key] of Object.entries(apiKeys)) {
        if (key) {
          await vaultService.storeApiKey('default', provider, key, {
            enableRotation: true,
            rotationDays: 90
          });
          
          // Set up key rotation schedule
          if (this.providers.get(provider)?.keyRotationEnabled) {
            await vaultService.setKeyRotationSchedule(provider, 90);
          }
        }
      }

      // Reinitialize providers with new keys
      await this.loadApiKeysFromVault();
      
      await this.logAuditEvent('API_KEYS_UPDATED_VAULT', 'API keys updated in vault with rotation', {
        providers: Object.keys(apiKeys),
        rotationEnabled: true
      });
      
      console.log('API keys updated successfully with enhanced security');
    } catch (error) {
      console.error('Failed to update API keys:', error);
      
      await this.logAuditEvent('API_KEYS_UPDATE_FAILED', 'Failed to update API keys', {
        error: error.message
      });
      
      throw error;
    }
  }

  async testConnection(provider = 'local') {
    try {
      if (!this.providers.has(provider)) {
        throw new Error(`Provider '${provider}' is not available`);
      }

      const testMessage = 'Test connection';
      const result = await this.sendMessage(testMessage, null, provider);
      
      await this.logAuditEvent('CONNECTION_TEST', `Connection test successful for ${provider}`, {
        provider,
        success: true
      });
      
      return {
        success: true,
        provider,
        response: result.response,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      await this.logAuditEvent('CONNECTION_TEST_FAILED', `Connection test failed for ${provider}`, {
        provider,
        error: error.message
      });
      
      return {
        success: false,
        provider,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async sendMessage(message, context = null, provider = 'openai') {
    if (!this.providers.has(provider)) {
      throw new Error(`Provider '${provider}' is not available`);
    }

    const providerConfig = this.providers.get(provider);
    const startTime = Date.now();
    
    try {
      // Log message request
      await this.logAuditEvent('MESSAGE_REQUEST', `Message sent to ${provider}`, {
        provider,
        messageLength: message.length,
        hasContext: !!context
      });
      
      const result = await providerConfig.handler(message, context, providerConfig);
      const processingTime = Date.now() - startTime;
      
      // Log successful response
      await this.logAuditEvent('MESSAGE_RESPONSE', `Response received from ${provider}`, {
        provider,
        processingTime,
        responseLength: result.response.length,
        confidence: result.confidence
      });
      
      return {
        id: `ai_${Date.now()}`,
        provider,
        response: result.response,
        suggestions: result.suggestions || [],
        confidence: result.confidence || 0.8,
        timestamp: new Date().toISOString(),
        model: providerConfig.model || 'unknown',
        processingTime
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      // Log error
      await this.logAuditEvent('MESSAGE_ERROR', `Error from ${provider}`, {
        provider,
        error: error.message,
        processingTime
      });
      
      console.error(`AI Provider Error (${provider}):`, error);
      throw new Error(`AI provider '${provider}' failed: ${error.message}`);
    }
  }

  async handleOpenAI(message, context, config) {
    const systemPrompt = this.buildSystemPrompt(context);
    const userMessage = this.buildUserMessage(message, context);

    const completion = await config.client.chat.completions.create({
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.3,
      max_tokens: 1500,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
    });

    const response = completion.choices[0]?.message?.content || 'No response generated';
    
    return {
      response,
      suggestions: this.extractSuggestions(response),
      confidence: this.calculateConfidence(completion)
    };
  }

  async handleClaude(message, context, config) {
    const systemPrompt = this.buildSystemPrompt(context);
    const userMessage = this.buildUserMessage(message, context);

    const completion = await config.client.messages.create({
      model: config.model,
      max_tokens: 1500,
      temperature: 0.3,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userMessage
        }
      ]
    });

    const response = completion.content[0]?.text || 'No response generated';
    
    return {
      response,
      suggestions: this.extractSuggestions(response),
      confidence: this.calculateClaudeConfidence(completion)
    };
  }

  async handleGoogle(message, context, config) {
    // Placeholder implementation for Google AI
    // In a real implementation, you would integrate with Google's AI API
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate processing
    
    return {
      response: `Google AI response to: ${message}`,
      suggestions: ['Implement Google AI integration'],
      confidence: 0.7
    };
  }

  async handleLocal(message, context) {
    // Local AI implementation with rule-based responses
    await new Promise(resolve => setTimeout(resolve, 200)); // Simulate processing
    
    const responses = {
      'hello': 'Hello! I\'m your local AI assistant. How can I help you with your code analysis?',
      'help': 'I can help you analyze code, identify issues, and provide suggestions. Try asking me about specific code problems or patterns.',
      'default': `I understand you're asking about: "${message}". As a local AI, I can provide basic code analysis and suggestions. For more advanced features, consider using OpenAI or Claude providers.`
    };
    
    const response = responses[message.toLowerCase()] || responses.default;
    
    return {
      response,
      suggestions: ['Use external AI providers for more advanced analysis'],
      confidence: 0.6
    };
  }

  buildSystemPrompt(context) {
    let prompt = `You are an expert code analyst and debugging assistant. Your role is to help developers analyze code, identify issues, and provide actionable suggestions for improvement.

Key capabilities:
- Code analysis and review
- Bug identification and debugging
- Performance optimization suggestions
- Security vulnerability detection
- Code quality improvement recommendations
- Best practices guidance

Please provide clear, actionable advice with specific examples when possible.`;

    if (context) {
      prompt += `\n\nContext: ${JSON.stringify(context, null, 2)}`;
    }

    return prompt;
  }

  buildUserMessage(message, context) {
    let userMessage = message;
    
    if (context && context.code) {
      userMessage += `\n\nCode to analyze:\n\`\`\`\n${context.code}\n\`\`\``;
    }
    
    if (context && context.language) {
      userMessage += `\n\nLanguage: ${context.language}`;
    }
    
    return userMessage;
  }

  extractSuggestions(response) {
    // Extract suggestions from AI response
    const suggestions = [];
    const lines = response.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-') || trimmedLine.startsWith('*')) {
        const suggestion = trimmedLine.replace(/^[•\-\*]\s*/, '').trim();
        if (suggestion) {
          suggestions.push(suggestion);
        }
      }
    }
    
    return suggestions.slice(0, 5); // Limit to 5 suggestions
  }

  calculateConfidence(completion) {
    // Calculate confidence based on OpenAI response
    if (completion.choices && completion.choices[0]) {
      const choice = completion.choices[0];
      let confidence = 0.8; // Base confidence
      
      if (choice.finish_reason === 'stop') {
        confidence += 0.1;
      }
      
      if (choice.message && choice.message.content) {
        const content = choice.message.content;
        if (content.length > 50) {
          confidence += 0.05;
        }
        if (content.includes('suggestion') || content.includes('recommend')) {
          confidence += 0.05;
        }
      }
      
      return Math.min(confidence, 1.0);
    }
    
    return 0.8;
  }

  calculateClaudeConfidence(completion) {
    // Calculate confidence based on Claude response
    if (completion.content && completion.content[0]) {
      const content = completion.content[0];
      let confidence = 0.8; // Base confidence
      
      if (content.type === 'text') {
        confidence += 0.1;
      }
      
      if (content.text && content.text.length > 50) {
        confidence += 0.05;
      }
      
      return Math.min(confidence, 1.0);
    }
    
    return 0.8;
  }

  getAvailableProviders() {
    return Array.from(this.providers.entries()).map(([key, provider]) => ({
      id: key,
      name: provider.name,
      model: provider.model || 'unknown',
      keyRotationEnabled: provider.keyRotationEnabled || false
    }));
  }

  async getVaultStatus() {
    try {
      if (!this.vaultInitialized) {
        return {
          initialized: false,
          message: 'Vault service not available'
        };
      }

      const health = await vaultService.healthCheck();
      const rotationSchedule = await vaultService.getKeyRotationSchedule();
      const auditLog = await vaultService.getAuditLog(10); // Last 10 entries

      return {
        initialized: true,
        health,
        rotationSchedule,
        recentAuditLog: auditLog,
        providers: this.getAvailableProviders()
      };
    } catch (error) {
      return {
        initialized: false,
        error: error.message
      };
    }
  }

  async rotateApiKey(provider) {
    try {
      if (!this.vaultInitialized) {
        throw new Error('Vault service not available');
      }

      const success = await vaultService.rotateApiKey(provider, 'default');
      
      if (success) {
        // Reload API keys after rotation
        await this.loadApiKeysFromVault();
        
        await this.logAuditEvent('API_KEY_ROTATED', `API key rotated for ${provider}`, {
          provider,
          success: true
        });
      }
      
      return success;
    } catch (error) {
      await this.logAuditEvent('API_KEY_ROTATION_FAILED', `Failed to rotate API key for ${provider}`, {
        provider,
        error: error.message
      });
      
      throw error;
    }
  }

  async getAuditLog(limit = 50) {
    try {
      if (!this.vaultInitialized) {
        return [];
      }

      return await vaultService.getAuditLog(limit);
    } catch (error) {
      console.error('Failed to get audit log:', error);
      return [];
    }
  }

  // Cleanup method for graceful shutdown
  async cleanup() {
    try {
      await this.logAuditEvent('AI_SERVICE_SHUTDOWN', 'AI service shutting down');
      
      if (this.vaultInitialized) {
        await vaultService.cleanup();
      }
      
      console.log('AI service cleanup completed');
    } catch (error) {
      console.error('AI service cleanup failed:', error);
    }
  }
}

export default new AIService();