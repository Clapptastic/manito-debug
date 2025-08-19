/**
 * Multi-Language Analyzer Tests
 */

import { MultiLanguageAnalyzer } from '../analyzers/multi-language-analyzer.js';
import { jest } from '@jest/globals';
import fs from 'fs/promises';

describe('MultiLanguageAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new MultiLanguageAnalyzer();
  });

  test('should detect Python language', () => {
    expect(analyzer.detectLanguage('test.py')).toBe('python');
    expect(analyzer.detectLanguage('script.py')).toBe('python');
  });

  test('should detect Go language', () => {
    expect(analyzer.detectLanguage('main.go')).toBe('go');
    expect(analyzer.detectLanguage('handler.go')).toBe('go');
  });

  test('should detect Rust language', () => {
    expect(analyzer.detectLanguage('main.rs')).toBe('rust');
    expect(analyzer.detectLanguage('lib.rs')).toBe('rust');
  });

  test('should detect Java language', () => {
    expect(analyzer.detectLanguage('Main.java')).toBe('java');
    expect(analyzer.detectLanguage('Service.java')).toBe('java');
  });

  test('should detect unknown language', () => {
    expect(analyzer.detectLanguage('unknown.xyz')).toBe('unknown');
    expect(analyzer.detectLanguage('file.txt')).toBe('unknown');
  });

  test('should get supported languages', () => {
    const languages = analyzer.getSupportedLanguages();
    expect(languages).toContain('python');
    expect(languages).toContain('go');
    expect(languages).toContain('rust');
    expect(languages).toContain('java');
    expect(languages.length).toBeGreaterThan(5);
  });

  test('should check language support', () => {
    expect(analyzer.isLanguageSupported('python')).toBe(true);
    expect(analyzer.isLanguageSupported('javascript')).toBe(false);
    expect(analyzer.isLanguageSupported('unknown')).toBe(false);
  });

  // Integration test with mock file
  test('should analyze generic file', async () => {
    // Mock fs.readFile for testing
    const originalReadFile = fs.readFile;
    fs.readFile = jest.fn().mockResolvedValue('# Sample Python file\ndef hello():\n    print("Hello World")\n\nif __name__ == "__main__":\n    hello()');

    try {
      const result = await analyzer.analyzeFile('test.py');
      
      expect(result).toMatchObject({
        language: 'python',
        filePath: 'test.py',
        lines: expect.any(Number),
        size: expect.any(Number),
        complexity: expect.any(Number)
      });

      expect(result.functions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'hello',
            line: expect.any(Number)
          })
        ])
      );
    } finally {
      // Restore original function
      fs.readFile = originalReadFile;
    }
  });
});
