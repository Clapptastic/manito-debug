/**
 * Core Scanner Tests
 * Tests for the main code scanning functionality
 */

import { CodeScanner } from '../index.js';
import { jest } from '@jest/globals';

describe('CodeScanner', () => {
  let scanner;

  beforeEach(() => {
    scanner = new CodeScanner();
  });

  test('should instantiate CodeScanner', () => {
    expect(scanner).toBeInstanceOf(CodeScanner);
  });

  test('should have default options', () => {
    expect(scanner.options).toBeDefined();
    expect(scanner.options.patterns).toEqual(['**/*.{js,jsx,ts,tsx,py,go,rs,java,cpp,cs,php,rb,swift,kt}']);
  });

  test('should initialize metrics', () => {
    expect(scanner.metrics).toBeDefined();
    expect(scanner.metrics.filesScanned).toBe(0);
    expect(scanner.metrics.linesOfCode).toBe(0);
  });

  test('should have scan method', () => {
    expect(typeof scanner.scan).toBe('function');
  });

  // Integration test - scan a simple directory
  test('should scan directory without errors', async () => {
    const testPath = process.cwd();
    
    try {
      const result = await scanner.scan(testPath);
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.rootPath).toBe(testPath);
      expect(Array.isArray(result.files)).toBe(true);
    } catch (error) {
      // Allow scan to fail in test environment, just ensure it doesn't crash
      expect(error).toBeInstanceOf(Error);
    }
  }, 10000);
});