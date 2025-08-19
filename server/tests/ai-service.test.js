/**
 * AI Service Tests
 * Tests for the AI integration service
 */

import { jest } from '@jest/globals';
import aiService from '../services/ai.js';

describe('AIService', () => {
  beforeEach(() => {
    // Reset environment variables for each test
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
  });

  test('should initialize with local provider by default', () => {
    const providers = aiService.getAvailableProviders();
    expect(providers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'local',
          name: 'Local AI',
          available: true
        })
      ])
    );
  });

  test('should handle local AI messages', async () => {
    const response = await aiService.sendMessage('Hello, can you help me analyze my code?');
    
    expect(response).toMatchObject({
      id: expect.stringMatching(/^ai_\d+$/),
      provider: 'local',
      response: expect.any(String),
      suggestions: expect.any(Array),
      confidence: expect.any(Number),
      timestamp: expect.any(String)
    });

    expect(response.confidence).toBeGreaterThan(0.5);
    expect(response.confidence).toBeLessThanOrEqual(1.0);
    expect(response.suggestions.length).toBeGreaterThan(0);
  });

  test('should provide contextual responses with scan data', async () => {
    const context = {
      files: [
        { filePath: 'test.js', lines: 100, complexity: 3 },
        { filePath: 'app.jsx', lines: 200, complexity: 5 }
      ],
      conflicts: []
    };

    const response = await aiService.sendMessage('Analyze my code', context);
    
    expect(response.response).toContain('2'); // Should mention file count
    expect(response.response).toContain('300'); // Should mention total lines
  });

  test('should handle provider errors gracefully', async () => {
    await expect(
      aiService.sendMessage('test', null, 'nonexistent-provider')
    ).rejects.toThrow("Provider 'nonexistent-provider' is not available");
  });

  test('should return health status', async () => {
    const health = await aiService.getHealth();
    
    expect(health).toMatchObject({
      status: expect.stringMatching(/^(ok|error)$/),
      providers: expect.any(Object),
      message: expect.any(String)
    });
  });

  test('should extract suggestions from response text', () => {
    const response = `Here are some recommendations:
- Improve error handling
- Add unit tests
- Refactor complex functions
1. Consider using TypeScript
2. Implement code reviews`;

    const suggestions = aiService.extractSuggestions(response);
    expect(suggestions).toEqual(
      expect.arrayContaining([
        'Improve error handling',
        'Add unit tests', 
        'Refactor complex functions',
        'Consider using TypeScript'
      ])
    );
    expect(suggestions.length).toBeLessThanOrEqual(4);
  });

  test('should build system prompt with context', () => {
    const context = {
      files: [
        { filePath: 'test.js', lines: 100, complexity: 2 }
      ]
    };

    const prompt = aiService.buildSystemPrompt(context);
    expect(prompt).toContain('Manito');
    expect(prompt).toContain('Files analyzed: 1');
    expect(prompt).toContain('Total lines of code: 100');
  });
});
