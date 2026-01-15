/**
 * Test Generator Tests
 * @see T021 - Unit tests for test generator
 */
import { describe, it, expect } from 'vitest';
import {
  generateTest,
  generateTestCode,
} from '../../src/codegen/generateTest.js';
import type { IRJourney, IRStep, IRPrimitive } from '../../src/ir/types.js';

// Helper to create a minimal IRJourney
function createTestJourney(overrides: Partial<IRJourney> = {}): IRJourney {
  return {
    id: 'JRN-TEST-001',
    title: 'Test Journey',
    scope: 'test',
    actor: 'user',
    tier: 'smoke',
    tags: ['@test'],
    steps: [],
    ...overrides,
  };
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

describe('generateTest', () => {
  describe('basic generation', () => {
    it('should generate test code for empty journey', () => {
      const journey = createTestJourney();
      const result = generateTest(journey);

      expect(result.code).toContain("import { test, expect } from '@playwright/test'");
      expect(result.code).toContain('test.describe');
      expect(result.journeyId).toBe('JRN-TEST-001');
      expect(result.filename).toBe('jrn-test-001.spec.ts');
    });

    it('should include journey metadata in generated code', () => {
      const journey = createTestJourney({
        title: 'User Login Journey',
        tier: 'release',
        scope: 'auth',
        actor: 'customer',
        tags: ['@auth', '@smoke'],
      });
      const result = generateTest(journey);

      expect(result.code).toContain('User Login Journey');
      expect(result.code).toContain('@auth');
      expect(result.code).toContain('@smoke');
    });

    it('should generate lowercase filename from journey ID', () => {
      const journey = createTestJourney({ id: 'JRN-LOGIN-001' });
      const result = generateTest(journey);

      expect(result.filename).toBe('jrn-login-001.spec.ts');
    });
  });

  describe('step generation', () => {
    it('should generate test steps with descriptions', () => {
      const journey = createTestJourney({
        steps: [
          createTestStep({
            id: 'STEP-1',
            description: 'Navigate to login page',
            actions: [
              { type: 'goto', url: 'https://example.com/login' },
            ],
          }),
        ],
      });
      const result = generateTest(journey);

      expect(result.code).toContain("test.step('STEP-1: Navigate to login page'");
      expect(result.code).toContain("await page.goto('https://example.com/login')");
    });

    it('should generate click actions', () => {
      const journey = createTestJourney({
        steps: [
          createTestStep({
            actions: [
              {
                type: 'click',
                locator: { strategy: 'role', value: 'button', options: { name: 'Submit' } },
              },
            ],
          }),
        ],
      });
      const result = generateTest(journey);

      expect(result.code).toContain('.click()');
      expect(result.code).toContain('getByRole');
    });

    it('should generate fill actions', () => {
      const journey = createTestJourney({
        steps: [
          createTestStep({
            actions: [
              {
                type: 'fill',
                locator: { strategy: 'label', value: 'Email' },
                value: { type: 'literal', value: 'test@example.com' },
              },
            ],
          }),
        ],
      });
      const result = generateTest(journey);

      expect(result.code).toContain('.fill(');
      expect(result.code).toContain('test@example.com');
    });

    it('should generate assertions', () => {
      const journey = createTestJourney({
        steps: [
          createTestStep({
            assertions: [
              {
                type: 'expectVisible',
                locator: { strategy: 'text', value: 'Welcome' },
              },
            ],
          }),
        ],
      });
      const result = generateTest(journey);

      expect(result.code).toContain('toBeVisible()');
    });
  });

  describe('setup and cleanup', () => {
    it('should generate beforeEach for setup', () => {
      const journey = createTestJourney({
        setup: [
          { type: 'goto', url: 'https://example.com' },
        ],
      });
      const result = generateTest(journey);

      expect(result.code).toContain('test.beforeEach');
    });

    it('should generate afterEach for cleanup', () => {
      const journey = createTestJourney({
        cleanup: [
          { type: 'callModule', module: 'auth', method: 'logout' },
        ],
      });
      const result = generateTest(journey);

      expect(result.code).toContain('test.afterEach');
    });
  });

  describe('completion signals', () => {
    it('should generate completion verification for URL signals', () => {
      const journey = createTestJourney({
        completion: [
          { type: 'url', value: '/dashboard' },
        ],
      });
      const result = generateTest(journey);

      expect(result.code).toContain('Verify completion');
      expect(result.code).toContain('toHaveURL');
    });

    it('should generate completion verification for toast signals', () => {
      const journey = createTestJourney({
        completion: [
          { type: 'toast', value: 'Success!' },
        ],
      });
      const result = generateTest(journey);

      expect(result.code).toContain('Success!');
    });
  });

  describe('imports', () => {
    it('should collect module imports with factory functions', () => {
      const journey = createTestJourney({
        steps: [
          createTestStep({
            actions: [
              { type: 'callModule', module: 'AuthModule', method: 'login' },
            ],
          }),
        ],
      });
      const result = generateTest(journey);

      expect(result.imports).toHaveLength(1);
      // Should import factory function (createAuthModule) not the class itself
      expect(result.imports[0]!.members).toContain('createAuthModule');
      // Path should use lowercase-first convention
      expect(result.imports[0]!.from).toBe('@modules/authModule');
    });

    it('should generate callModule using factory pattern', () => {
      const journey = createTestJourney({
        steps: [
          createTestStep({
            actions: [
              { type: 'callModule', module: 'LoginModule', method: 'performLogin', args: ['admin', 'pass123'] },
            ],
          }),
        ],
      });
      const result = generateTest(journey);

      // Should use factory function to create instance
      expect(result.code).toContain('createLoginModule(page).performLogin(');
      // Should pass args correctly
      expect(result.code).toContain('"admin"');
      expect(result.code).toContain('"pass123"');
      // Import should be the factory function
      expect(result.imports[0]!.members).toContain('createLoginModule');
    });

    it('should deduplicate module imports when same module called multiple times', () => {
      const journey = createTestJourney({
        steps: [
          createTestStep({
            actions: [
              { type: 'callModule', module: 'AuthModule', method: 'login' },
              { type: 'callModule', module: 'AuthModule', method: 'logout' },
            ],
          }),
        ],
      });
      const result = generateTest(journey);

      // Should only have one import for AuthModule
      expect(result.imports).toHaveLength(1);
      expect(result.imports[0]!.members).toContain('createAuthModule');
    });

    it('should add additional imports from options', () => {
      const journey = createTestJourney();
      const result = generateTest(journey, {
        imports: [
          { members: ['CustomHelper'], from: '@helpers/custom' },
        ],
      });

      expect(result.imports).toContainEqual({
        members: ['CustomHelper'],
        from: '@helpers/custom',
      });
    });
  });

  describe('primitive rendering', () => {
    const primitives: Array<{ type: string; primitive: IRPrimitive; expected: string }> = [
      {
        type: 'goto',
        primitive: { type: 'goto', url: 'https://example.com' },
        expected: "await page.goto('https://example.com')",
      },
      {
        type: 'waitForURL',
        primitive: { type: 'waitForURL', pattern: '/dashboard' },
        expected: 'await page.waitForURL',
      },
      {
        type: 'waitForLoadingComplete',
        primitive: { type: 'waitForLoadingComplete' },
        expected: "await page.waitForLoadState('networkidle')",
      },
      {
        type: 'press',
        primitive: { type: 'press', key: 'Enter' },
        expected: "await page.keyboard.press('Enter')",
      },
      {
        type: 'hover',
        primitive: {
          type: 'hover',
          locator: { strategy: 'text', value: 'Menu' },
        },
        expected: '.hover()',
      },
      {
        type: 'focus',
        primitive: {
          type: 'focus',
          locator: { strategy: 'label', value: 'Search' },
        },
        expected: '.focus()',
      },
      {
        type: 'clear',
        primitive: {
          type: 'clear',
          locator: { strategy: 'label', value: 'Input' },
        },
        expected: '.clear()',
      },
      {
        type: 'select',
        primitive: {
          type: 'select',
          locator: { strategy: 'label', value: 'Country' },
          option: 'USA',
        },
        expected: "selectOption('USA')",
      },
      {
        type: 'check',
        primitive: {
          type: 'check',
          locator: { strategy: 'role', value: 'checkbox', options: { name: 'Accept' } },
        },
        expected: '.check()',
      },
      {
        type: 'uncheck',
        primitive: {
          type: 'uncheck',
          locator: { strategy: 'role', value: 'checkbox', options: { name: 'Accept' } },
        },
        expected: '.uncheck()',
      },
      {
        type: 'expectText',
        primitive: {
          type: 'expectText',
          locator: { strategy: 'testid', value: 'message' },
          text: 'Hello World',
        },
        expected: 'toHaveText',
      },
      {
        type: 'expectValue',
        primitive: {
          type: 'expectValue',
          locator: { strategy: 'label', value: 'Name' },
          value: 'John',
        },
        expected: "toHaveValue('John')",
      },
      {
        type: 'expectEnabled',
        primitive: {
          type: 'expectEnabled',
          locator: { strategy: 'role', value: 'button', options: { name: 'Submit' } },
        },
        expected: 'toBeEnabled()',
      },
      {
        type: 'expectDisabled',
        primitive: {
          type: 'expectDisabled',
          locator: { strategy: 'role', value: 'button', options: { name: 'Submit' } },
        },
        expected: 'toBeDisabled()',
      },
      {
        type: 'blocked',
        primitive: {
          type: 'blocked',
          reason: 'Cannot automate this step',
          sourceText: 'Manual verification required',
        },
        expected: 'TODO',
      },
    ];

    for (const { type, primitive, expected } of primitives) {
      it(`should render ${type} primitive`, () => {
        const journey = createTestJourney({
          steps: [
            createTestStep({
              actions: [primitive],
            }),
          ],
        });
        const result = generateTest(journey);

        expect(result.code).toContain(expected);
      });
    }
  });

  describe('string escaping', () => {
    it('should escape single quotes in strings', () => {
      const journey = createTestJourney({
        steps: [
          createTestStep({
            actions: [
              { type: 'goto', url: "https://example.com/path?name=O'Connor" },
            ],
          }),
        ],
      });
      const result = generateTest(journey);

      expect(result.code).toContain("\\'");
    });

    it('should escape newlines in strings', () => {
      const journey = createTestJourney({
        steps: [
          createTestStep({
            assertions: [
              {
                type: 'expectText',
                locator: { strategy: 'text', value: 'test' },
                text: 'Line 1\nLine 2',
              },
            ],
          }),
        ],
      });
      const result = generateTest(journey);

      expect(result.code).toContain('\\n');
    });
  });
});

describe('generateTestCode', () => {
  it('should return just the code string', () => {
    const journey = createTestJourney({
      title: 'Simple Test',
    });
    const code = generateTestCode(journey);

    expect(typeof code).toBe('string');
    expect(code).toContain('Simple Test');
  });
});
