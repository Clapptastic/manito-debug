/**
 * AI Service Tests
 * Tests for the AI integration service
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import aiService from '../services/ai.js';

// Mock environment variables
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';

describe('AIService', () => {
  beforeEach(() => {
    // Reset the service for each test
    jest.clearAllMocks();
  });

  test('should initialize with local provider by default', () => {
    const providers = aiService.getAvailableProviders();
    const localProvider = providers.find(p => p.id === 'local');
    
    expect(localProvider).toBeDefined();
    expect(localProvider).toMatchObject({
      id: 'local',
      name: 'Local AI',
      keyRotationEnabled: false
    });
  });

  test('should send message and get response', async () => {
    const message = 'Hello, test message';
    const response = await aiService.sendMessage(message);
    
    expect(response).toMatchObject({
      id: expect.stringMatching(/^ai_\d+$/),
      provider: 'local',
      response: expect.any(String),
      suggestions: expect.any(Array),
      confidence: expect.any(Number),
      timestamp: expect.any(String),
      model: 'unknown',
      processingTime: expect.any(Number)
    });
    
    expect(response.response).toContain('Hello');
  });

  test('should provide contextual responses with scan data', async () => {
    const context = {
      files: [
        { filePath: 'test.js', lines: 100, complexity: 2 },
        { filePath: 'app.js', lines: 200, complexity: 3 }
      ]
    };

    const response = await aiService.sendMessage('Analyze my code', context);
    
    expect(response.response).toContain('code analysis');
    expect(response.suggestions).toHaveLength(1);
    expect(response.suggestions[0]).toContain('external AI providers');
  });

  test('should test connection successfully', async () => {
    const result = await aiService.testConnection('local');
    
    expect(result).toMatchObject({
      success: true,
      provider: 'local',
      response: expect.any(String),
      timestamp: expect.any(String)
    });
  });

  test('should return vault status', async () => {
    const vaultStatus = await aiService.getVaultStatus();
    
    expect(vaultStatus).toMatchObject({
      initialized: expect.any(Boolean)
    });
    
    // Check if health exists (may be undefined if vault not initialized)
    if (vaultStatus.health) {
      expect(vaultStatus.health).toBeDefined();
    }
  });

  test('should extract suggestions from response text', () => {
    const response = `
      Here are some suggestions:
      • Improve error handling
      • Add unit tests
      • Refactor complex functions
    `;

    const suggestions = aiService.extractSuggestions(response);
    
    // The extractSuggestions method removes bullet points and trims
    expect(suggestions).toEqual([
      'Improve error handling',
      'Add unit tests',
      'Refactor complex functions'
    ]);
  });

  test('should build system prompt with context', () => {
    const context = {
      files: [
        { filePath: 'test.js', lines: 100, complexity: 2 }
      ]
    };

    const prompt = aiService.buildSystemPrompt(context);
    
    expect(prompt).toContain('expert code analyst');
    expect(prompt).toContain('Context:');
    expect(prompt).toContain('test.js');
  });

  test('should build user message with code context', () => {
    const message = 'Analyze this code';
    const context = {
      code: 'function test() { return true; }',
      language: 'javascript'
    };

    const userMessage = aiService.buildUserMessage(message, context);
    
    expect(userMessage).toContain('Analyze this code');
    expect(userMessage).toContain('function test()');
    expect(userMessage).toContain('javascript');
  });

  test('should calculate confidence for OpenAI response', () => {
    const mockCompletion = {
      choices: [{
        finish_reason: 'stop',
        message: {
          content: 'This is a test response with suggestions and recommendations'
        }
      }]
    };

    const confidence = aiService.calculateConfidence(mockCompletion);
    
    expect(confidence).toBeGreaterThan(0.8);
    expect(confidence).toBeLessThanOrEqual(1.0);
  });

  test('should calculate confidence for Claude response', () => {
    const mockCompletion = {
      content: [{
        type: 'text',
        text: 'This is a test response from Claude'
      }]
    };

    const confidence = aiService.calculateClaudeConfidence(mockCompletion);
    
    expect(confidence).toBeGreaterThan(0.8);
    expect(confidence).toBeLessThanOrEqual(1.0);
  });

  test('should get audit log', async () => {
    const auditLog = await aiService.getAuditLog(10);
    
    expect(Array.isArray(auditLog)).toBe(true);
  });

  test('should handle message errors gracefully', async () => {
    // Mock a provider that throws an error
    const originalProviders = aiService.providers;
    aiService.providers.set('error-provider', {
      name: 'Error Provider',
      handler: () => { throw new Error('Test error'); }
    });

    try {
      await expect(aiService.sendMessage('test', null, 'error-provider'))
        .rejects.toThrow('AI provider \'error-provider\' failed: Test error');
    } finally {
      // Restore original providers
      aiService.providers = originalProviders;
    }
  });
});
