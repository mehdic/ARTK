/**
 * Data-Driven Test Generation Tests
 * Tests for parameterized/data-driven test support
 */
import { describe, it, expect } from 'vitest';
import { generateTest } from '../../src/codegen/generateTest.js';
import type { IRJourney, IRStep } from '../../src/ir/types.js';

// Helper to create a minimal IRJourney
function createTestJourney(overrides: Partial<IRJourney> = {}): IRJourney {
  const defaultJourney: IRJourney = {
    id: 'JRN-TEST-001',
    title: 'Test Journey',
    scope: 'test',
    actor: 'user',
    tier: 'smoke',
    tags: ['@test'],
    moduleDependencies: {
      foundation: [],
      feature: [],
    },
    steps: [],
  };
  return { ...defaultJourney, ...overrides };
}

// Helper to create an IR step
function createTestStep(overrides: Partial<IRStep> = {}): IRStep {
  return {
    id: 'STEP-1',
    description: 'Test step',
    actions: [],
    assertions: [],
    ...overrides,
  };
}

describe('Data-Driven Test Generation', () => {
  describe('testData schema support', () => {
    it('should accept journey with testData field', () => {
      const journey = createTestJourney({
        testData: [
          {
            name: 'valid_user',
            description: 'Valid user credentials',
            data: {
              username: 'testuser',
              password: 'pass123',
            },
          },
        ],
      });

      // Should not throw
      const result = generateTest(journey);
      expect(result).toBeDefined();
    });

    it('should accept journey without testData (backward compatibility)', () => {
      const journey = createTestJourney();

      // Should not throw
      const result = generateTest(journey);
      expect(result).toBeDefined();
    });

    it('should accept multiple test data sets', () => {
      const journey = createTestJourney({
        testData: [
          {
            name: 'user_1',
            data: { username: 'user1', password: 'pass1' },
          },
          {
            name: 'user_2',
            data: { username: 'user2', password: 'pass2' },
          },
          {
            name: 'user_3',
            data: { username: 'user3', password: 'pass3' },
          },
        ],
      });

      const result = generateTest(journey);
      expect(result).toBeDefined();
    });
  });

  describe('test.describe.each generation', () => {
    it('should generate test.describe.each for journey with testData', () => {
      const journey = createTestJourney({
        testData: [
          {
            name: 'valid_user',
            data: {
              username: 'testuser',
              password: 'password123',
            },
          },
        ],
        steps: [
          createTestStep({
            id: 'LOGIN',
            description: 'Login with credentials',
            actions: [],
          }),
        ],
      });

      const result = generateTest(journey);

      // Should use test.describe.each pattern
      expect(result.code).toContain('test.describe.each([');
      expect(result.code).toContain("testName: 'valid_user'");
      // EJS escapes HTML entities
      expect(result.code).toMatch(/username:\s*[&#39;']+testuser[&#39;']+/);
      expect(result.code).toMatch(/password:\s*[&#39;']+password123[&#39;']+/);
    });

    it('should include $testName in test title', () => {
      const journey = createTestJourney({
        id: 'JRN-LOGIN-001',
        title: 'Login Test',
        testData: [
          {
            name: 'admin_user',
            data: { username: 'admin' },
          },
        ],
      });

      const result = generateTest(journey);

      // Test title should include $testName placeholder
      expect(result.code).toMatch(/JRN-LOGIN-001.*Login Test.*\$testName/);
    });

    it('should destructure all data fields in test parameters', () => {
      const journey = createTestJourney({
        testData: [
          {
            name: 'full_user_data',
            data: {
              username: 'user1',
              password: 'pass1',
              email: 'user1@example.com',
              age: 25,
            },
          },
        ],
      });

      const result = generateTest(journey);

      // Should destructure all fields
      expect(result.code).toContain('username');
      expect(result.code).toContain('password');
      expect(result.code).toContain('email');
      expect(result.code).toContain('age');
    });

    it('should handle multiple test data sets with varying fields', () => {
      const journey = createTestJourney({
        testData: [
          {
            name: 'basic_user',
            data: { username: 'user1', password: 'pass1' },
          },
          {
            name: 'full_user',
            data: { username: 'user2', password: 'pass2', email: 'user2@example.com' },
          },
        ],
      });

      const result = generateTest(journey);

      // Should include all unique fields from all data sets
      expect(result.code).toContain('username');
      expect(result.code).toContain('password');
      expect(result.code).toContain('email');
    });

    it('should escape string values in generated data', () => {
      const journey = createTestJourney({
        testData: [
          {
            name: 'special_chars',
            data: {
              username: "user'with'quotes",
              description: 'Line 1\nLine 2',
            },
          },
        ],
      });

      const result = generateTest(journey);

      // Should properly escape special characters (EJS HTML-escapes)
      expect(result.code).toMatch(/user[\\&#39;]+with[\\&#39;]+quotes/);
    });

    it('should serialize non-string values as JSON', () => {
      const journey = createTestJourney({
        testData: [
          {
            name: 'mixed_types',
            data: {
              username: 'user1',
              age: 25,
              active: true,
              roles: ['admin', 'user'],
            },
          },
        ],
      });

      const result = generateTest(journey);

      // Should serialize numbers, booleans, arrays as JSON
      expect(result.code).toContain('age: 25');
      expect(result.code).toContain('active: true');
      // EJS HTML-escapes quotes in arrays
      expect(result.code).toMatch(/roles:\s*\[[&#34;"]+admin[&#34;"]+,[&#34;"]+user[&#34;"]+\]/);
    });
  });

  describe('backward compatibility', () => {
    it('should generate normal test for journey without testData', () => {
      const journey = createTestJourney({
        id: 'JRN-NORMAL-001',
        title: 'Normal Test',
        steps: [
          createTestStep({
            actions: [{ type: 'goto', url: 'https://example.com' }],
          }),
        ],
      });

      const result = generateTest(journey);

      // Should use regular test() not test.describe.each()
      expect(result.code).toContain("test('JRN-NORMAL-001: Normal Test'");
      expect(result.code).not.toContain('test.describe.each');
    });

    it('should maintain existing journey features with testData', () => {
      const journey = createTestJourney({
        testData: [
          {
            name: 'user1',
            data: { username: 'test' },
          },
        ],
        completion: [
          {
            type: 'url',
            value: '/dashboard',
          },
        ],
        setup: [{ type: 'goto', url: 'https://example.com' }],
        cleanup: [{ type: 'goto', url: 'https://example.com/logout' }],
      });

      const result = generateTest(journey);

      // Should still include setup, cleanup, and completion
      expect(result.code).toContain('test.beforeEach');
      expect(result.code).toContain('test.afterEach');
      expect(result.code).toContain('Verify completion');
    });
  });

  describe('edge cases', () => {
    it('should handle empty testData array', () => {
      const journey = createTestJourney({
        testData: [],
      });

      const result = generateTest(journey);

      // Should generate normal test (not data-driven)
      expect(result.code).not.toContain('test.describe.each');
    });

    it('should handle test data with empty data object', () => {
      const journey = createTestJourney({
        testData: [
          {
            name: 'empty_data',
            data: {},
          },
        ],
      });

      const result = generateTest(journey);

      // Should still generate test.describe.each but with only testName
      expect(result.code).toContain('test.describe.each');
      expect(result.code).toContain("testName: 'empty_data'");
    });

    it('should handle special characters in test data set name', () => {
      const journey = createTestJourney({
        testData: [
          {
            name: 'user-with-dashes_and_underscores',
            data: { username: 'test' },
          },
        ],
      });

      const result = generateTest(journey);

      // Should include the name as-is
      expect(result.code).toContain("testName: 'user-with-dashes_and_underscores'");
    });
  });
});
