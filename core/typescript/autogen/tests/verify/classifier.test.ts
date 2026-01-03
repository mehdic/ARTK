/**
 * Failure Classifier Tests
 * @see T048 - Unit test for failure classifier
 */
import { describe, it, expect } from 'vitest';
import {
  classifyError,
  classifyTestResult,
  classifyTestResults,
  getFailureStats,
  isHealable,
  getHealableFailures,
  type FailureClassification,
} from '../../src/verify/classifier.js';
import type { TestResult, TestError } from '../../src/verify/parser.js';

// Helper to create test error
function createError(message: string, stack?: string): TestError {
  return { message, stack };
}

// Helper to create test result
function createTestResult(errors: TestError[], status: 'failed' | 'passed' = 'failed'): TestResult {
  return {
    title: 'Test',
    titlePath: ['Suite', 'Test'],
    location: { file: 'test.ts', line: 1, column: 1 },
    status,
    duration: 1000,
    retry: 0,
    errors,
    steps: [],
    attachments: [],
    annotations: [],
    tags: [],
  };
}

describe('classifyError', () => {
  describe('selector issues', () => {
    it('should classify locator resolution errors', () => {
      const error = createError('Locator resolved to 0 elements');
      const result = classifyError(error);

      expect(result.category).toBe('selector');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.isTestIssue).toBe(true);
    });

    it('should classify element visibility errors', () => {
      const error = createError('Element is not visible');
      const result = classifyError(error);

      expect(result.category).toBe('selector');
    });

    it('should classify strict mode violations', () => {
      const error = createError('Strict mode violation: getByRole found 5 elements');
      const result = classifyError(error);

      expect(result.category).toBe('selector');
    });
  });

  describe('timing issues', () => {
    it('should classify timeout errors', () => {
      const error = createError('Timeout 30000ms exceeded');
      const result = classifyError(error);

      expect(result.category).toBe('timing');
      expect(result.isTestIssue).toBe(true);
    });

    it('should classify navigation timeouts', () => {
      const error = createError('Waiting for navigation timed out');
      const result = classifyError(error);

      expect(result.category).toBe('timing');
    });
  });

  describe('navigation issues', () => {
    it('should classify URL mismatch', () => {
      const error = createError('Expected URL to match /dashboard/');
      const result = classifyError(error);

      expect(result.category).toBe('navigation');
      expect(result.isTestIssue).toBe(false);
    });

    it('should classify network errors', () => {
      const error = createError('net::ERR_CONNECTION_REFUSED');
      const result = classifyError(error);

      expect(result.category).toBe('navigation');
    });
  });

  describe('data issues', () => {
    it('should classify assertion failures', () => {
      const error = createError('Expected value to be "Hello" but received "World"');
      const result = classifyError(error);

      expect(result.category).toBe('data');
      expect(result.isTestIssue).toBe(false);
    });

    it('should classify toEqual failures', () => {
      const error = createError('expect(received).toEqual(expected)');
      const result = classifyError(error);

      expect(result.category).toBe('data');
    });
  });

  describe('auth issues', () => {
    it('should classify 401 errors', () => {
      const error = createError('401 Unauthorized');
      const result = classifyError(error);

      expect(result.category).toBe('auth');
      expect(result.isTestIssue).toBe(false);
    });

    it('should classify login failures', () => {
      const error = createError('Authentication failed: invalid credentials');
      const result = classifyError(error);

      expect(result.category).toBe('auth');
    });
  });

  describe('environment issues', () => {
    it('should classify connection refused', () => {
      const error = createError('ECONNREFUSED 127.0.0.1:3000');
      const result = classifyError(error);

      expect(result.category).toBe('env');
      expect(result.isTestIssue).toBe(false);
    });

    it('should classify 503 errors', () => {
      const error = createError('503 Service Unavailable');
      const result = classifyError(error);

      expect(result.category).toBe('env');
    });
  });

  describe('script errors', () => {
    it('should classify TypeError', () => {
      const error = createError("TypeError: Cannot read property 'foo' of undefined");
      const result = classifyError(error);

      expect(result.category).toBe('script');
      expect(result.isTestIssue).toBe(true);
    });

    it('should classify ReferenceError', () => {
      const error = createError('ReferenceError: variable is not defined');
      const result = classifyError(error);

      expect(result.category).toBe('script');
    });
  });

  describe('unknown issues', () => {
    it('should return unknown for unrecognized errors', () => {
      const error = createError('Some random error message');
      const result = classifyError(error);

      expect(result.category).toBe('unknown');
      expect(result.confidence).toBe(0);
    });
  });
});

describe('classifyTestResult', () => {
  it('should classify failed test result', () => {
    const result = createTestResult([createError('Locator resolved to 0 elements')]);
    const classification = classifyTestResult(result);

    expect(classification.category).toBe('selector');
  });

  it('should return unknown for passed tests', () => {
    const result = createTestResult([], 'passed');
    const classification = classifyTestResult(result);

    expect(classification.category).toBe('unknown');
  });

  it('should return unknown for empty errors', () => {
    const result = createTestResult([]);
    const classification = classifyTestResult(result);

    expect(classification.category).toBe('unknown');
  });

  it('should use most confident classification for multiple errors', () => {
    const result = createTestResult([
      createError('Some unknown error'),
      createError('Timeout 30000ms exceeded'),
    ]);
    const classification = classifyTestResult(result);

    expect(classification.category).toBe('timing');
  });
});

describe('classifyTestResults', () => {
  it('should classify multiple test results', () => {
    // Create results with unique title paths so they get unique Map keys
    const result1: TestResult = {
      title: 'Test 1',
      titlePath: ['Suite', 'Test 1'],
      location: { file: 'test.ts', line: 1, column: 1 },
      status: 'failed',
      duration: 1000,
      retry: 0,
      errors: [createError('Locator resolved to 0 elements')],
      steps: [],
      attachments: [],
      annotations: [],
      tags: [],
    };
    const result2: TestResult = {
      title: 'Test 2',
      titlePath: ['Suite', 'Test 2'],
      location: { file: 'test.ts', line: 10, column: 1 },
      status: 'failed',
      duration: 1000,
      retry: 0,
      errors: [createError('Timeout 30000ms exceeded')],
      steps: [],
      attachments: [],
      annotations: [],
      tags: [],
    };

    const classifications = classifyTestResults([result1, result2]);

    expect(classifications.size).toBe(2);
  });

  it('should use title path as key', () => {
    const results = [createTestResult([createError('Error')])];
    const classifications = classifyTestResults(results);

    expect(classifications.has('Suite > Test')).toBe(true);
  });

  it('should skip passed tests', () => {
    const results = [createTestResult([], 'passed')];
    const classifications = classifyTestResults(results);

    expect(classifications.size).toBe(0);
  });
});

describe('getFailureStats', () => {
  it('should count failures by category', () => {
    const classifications = new Map<string, FailureClassification>([
      ['test1', { category: 'selector', confidence: 1, explanation: '', suggestion: '', isTestIssue: true, matchedKeywords: [] }],
      ['test2', { category: 'selector', confidence: 1, explanation: '', suggestion: '', isTestIssue: true, matchedKeywords: [] }],
      ['test3', { category: 'timing', confidence: 1, explanation: '', suggestion: '', isTestIssue: true, matchedKeywords: [] }],
    ]);

    const stats = getFailureStats(classifications);

    expect(stats.selector).toBe(2);
    expect(stats.timing).toBe(1);
    expect(stats.data).toBe(0);
  });
});

describe('isHealable', () => {
  it('should return true for selector issues', () => {
    const classification: FailureClassification = {
      category: 'selector',
      confidence: 1,
      explanation: '',
      suggestion: '',
      isTestIssue: true,
      matchedKeywords: [],
    };

    expect(isHealable(classification)).toBe(true);
  });

  it('should return true for timing issues', () => {
    const classification: FailureClassification = {
      category: 'timing',
      confidence: 1,
      explanation: '',
      suggestion: '',
      isTestIssue: true,
      matchedKeywords: [],
    };

    expect(isHealable(classification)).toBe(true);
  });

  it('should return false for auth issues', () => {
    const classification: FailureClassification = {
      category: 'auth',
      confidence: 1,
      explanation: '',
      suggestion: '',
      isTestIssue: false,
      matchedKeywords: [],
    };

    expect(isHealable(classification)).toBe(false);
  });

  it('should return false for env issues', () => {
    const classification: FailureClassification = {
      category: 'env',
      confidence: 1,
      explanation: '',
      suggestion: '',
      isTestIssue: false,
      matchedKeywords: [],
    };

    expect(isHealable(classification)).toBe(false);
  });
});

describe('getHealableFailures', () => {
  it('should filter to only healable failures', () => {
    const classifications = new Map<string, FailureClassification>([
      ['test1', { category: 'selector', confidence: 1, explanation: '', suggestion: '', isTestIssue: true, matchedKeywords: [] }],
      ['test2', { category: 'auth', confidence: 1, explanation: '', suggestion: '', isTestIssue: false, matchedKeywords: [] }],
      ['test3', { category: 'timing', confidence: 1, explanation: '', suggestion: '', isTestIssue: true, matchedKeywords: [] }],
    ]);

    const healable = getHealableFailures(classifications);

    expect(healable.size).toBe(2);
    expect(healable.has('test1')).toBe(true);
    expect(healable.has('test3')).toBe(true);
    expect(healable.has('test2')).toBe(false);
  });
});
