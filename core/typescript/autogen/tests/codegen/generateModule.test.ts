/**
 * Module Generator Tests
 * @see T022 - Unit tests for module generator
 */
import { describe, it, expect } from 'vitest';
import {
  generateModule,
  generateModuleCode,
  extractModuleDefinition,
} from '../../src/codegen/generateModule.js';
import type { IRJourney, IRStep } from '../../src/ir/types.js';

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

describe('generateModule', () => {
  describe('basic generation', () => {
    it('should generate module code for empty journey', () => {
      const journey = createTestJourney({ scope: 'auth' });
      const result = generateModule(journey);

      expect(result.code).toContain("import type { Page, Locator } from '@playwright/test'");
      expect(result.code).toContain('class AuthPage');
      expect(result.moduleName).toBe('Auth');
      expect(result.filename).toBe('auth.page.ts');
    });

    it('should use PascalCase for class name', () => {
      const journey = createTestJourney({ scope: 'user-profile' });
      const result = generateModule(journey);

      expect(result.code).toContain('class UserProfilePage');
      expect(result.moduleName).toBe('UserProfile');
    });

    it('should allow custom suffix', () => {
      const journey = createTestJourney({ scope: 'checkout' });
      const result = generateModule(journey, { suffix: 'Module' });

      expect(result.code).toContain('class CheckoutModule');
    });
  });

  describe('locator extraction', () => {
    it('should extract locators from step actions', () => {
      const journey = createTestJourney({
        scope: 'login',
        steps: [
          createTestStep({
            actions: [
              {
                type: 'click',
                locator: { strategy: 'role', value: 'button', options: { name: 'Submit' } },
              },
              {
                type: 'fill',
                locator: { strategy: 'label', value: 'Email' },
                value: { type: 'literal', value: 'test@example.com' },
              },
            ],
          }),
        ],
      });
      const result = generateModule(journey);

      expect(result.locators.length).toBeGreaterThanOrEqual(1);
      expect(result.code).toContain('readonly');
      expect(result.code).toContain(': Locator');
    });

    it('should extract locators from assertions', () => {
      const journey = createTestJourney({
        scope: 'dashboard',
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
      const result = generateModule(journey);

      expect(result.locators.length).toBeGreaterThanOrEqual(1);
    });

    it('should deduplicate identical locators', () => {
      const journey = createTestJourney({
        scope: 'form',
        steps: [
          createTestStep({
            actions: [
              {
                type: 'click',
                locator: { strategy: 'role', value: 'button', options: { name: 'Submit' } },
              },
            ],
          }),
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
      const result = generateModule(journey);

      // Should only have one locator for the duplicate
      const submitLocators = result.locators.filter(l =>
        l.spec.options?.name === 'Submit'
      );
      expect(submitLocators.length).toBe(1);
    });

    it('should generate unique names for similar locators', () => {
      const journey = createTestJourney({
        scope: 'buttons',
        steps: [
          createTestStep({
            actions: [
              {
                type: 'click',
                locator: { strategy: 'role', value: 'button', options: { name: 'Save' } },
              },
              {
                type: 'click',
                locator: { strategy: 'role', value: 'button', options: { name: 'Cancel' } },
              },
            ],
          }),
        ],
      });
      const result = generateModule(journey);

      const locatorNames = result.locators.map(l => l.name);
      const uniqueNames = new Set(locatorNames);
      expect(uniqueNames.size).toBe(locatorNames.length);
    });
  });

  describe('method generation', () => {
    it('should generate methods from steps', () => {
      const journey = createTestJourney({
        scope: 'login',
        steps: [
          createTestStep({
            id: 'LOGIN-STEP',
            description: 'Enter credentials and submit',
            actions: [
              {
                type: 'fill',
                locator: { strategy: 'label', value: 'Username' },
                value: { type: 'literal', value: 'admin' },
              },
              {
                type: 'click',
                locator: { strategy: 'role', value: 'button', options: { name: 'Login' } },
              },
            ],
          }),
        ],
      });
      const result = generateModule(journey);

      expect(result.methods.length).toBeGreaterThanOrEqual(1);
      expect(result.code).toContain('async');
      expect(result.code).toContain('Promise<void>');
    });

    it('should include method body with actions', () => {
      const journey = createTestJourney({
        scope: 'form',
        steps: [
          createTestStep({
            id: 'FILL-FORM',
            description: 'Fill form fields',
            actions: [
              {
                type: 'fill',
                locator: { strategy: 'label', value: 'Name' },
                value: { type: 'literal', value: 'John' },
              },
            ],
          }),
        ],
      });
      const result = generateModule(journey);

      expect(result.code).toContain('.fill(');
    });

    it('should include assertions in methods', () => {
      const journey = createTestJourney({
        scope: 'verify',
        steps: [
          createTestStep({
            id: 'VERIFY',
            description: 'Verify state',
            assertions: [
              {
                type: 'expectVisible',
                locator: { strategy: 'text', value: 'Success' },
              },
            ],
          }),
        ],
      });
      const result = generateModule(journey);

      expect(result.code).toContain('expect');
      expect(result.code).toContain('toBeVisible');
    });
  });

  describe('constructor generation', () => {
    it('should generate constructor with page parameter', () => {
      const journey = createTestJourney({ scope: 'test' });
      const result = generateModule(journey);

      expect(result.code).toContain('constructor(page: Page)');
      expect(result.code).toContain('this.page = page');
    });

    it('should initialize locators in constructor', () => {
      const journey = createTestJourney({
        scope: 'init',
        steps: [
          createTestStep({
            actions: [
              {
                type: 'click',
                locator: { strategy: 'role', value: 'button', options: { name: 'Start' } },
              },
            ],
          }),
        ],
      });
      const result = generateModule(journey);

      expect(result.code).toContain('this.');
      expect(result.code).toContain('= page.');
    });
  });

  describe('factory function', () => {
    it('should generate factory function', () => {
      const journey = createTestJourney({ scope: 'product' });
      const result = generateModule(journey);

      expect(result.code).toContain('export function createProductPage(page: Page)');
      expect(result.code).toContain('return new ProductPage(page)');
    });
  });

  describe('setup and cleanup', () => {
    it('should extract locators from setup', () => {
      const journey = createTestJourney({
        scope: 'setup',
        setup: [
          {
            type: 'click',
            locator: { strategy: 'text', value: 'Accept Cookies' },
          },
        ],
      });
      const result = generateModule(journey);

      expect(result.locators.length).toBeGreaterThanOrEqual(1);
    });

    it('should extract locators from cleanup', () => {
      const journey = createTestJourney({
        scope: 'cleanup',
        cleanup: [
          {
            type: 'click',
            locator: { strategy: 'role', value: 'button', options: { name: 'Close' } },
          },
        ],
      });
      const result = generateModule(journey);

      expect(result.locators.length).toBeGreaterThanOrEqual(1);
    });
  });
});

describe('generateModuleCode', () => {
  it('should return just the code string', () => {
    const journey = createTestJourney({ scope: 'simple' });
    const code = generateModuleCode(journey);

    expect(typeof code).toBe('string');
    expect(code).toContain('class SimplePage');
  });
});

describe('extractModuleDefinition', () => {
  it('should extract module definition without generating code', () => {
    const journey = createTestJourney({
      scope: 'extract-test',
      steps: [
        createTestStep({
          actions: [
            {
              type: 'click',
              locator: { strategy: 'role', value: 'button', options: { name: 'Test' } },
            },
          ],
        }),
      ],
    });
    const definition = extractModuleDefinition(journey);

    expect(definition.moduleName).toBe('ExtractTest');
    expect(definition.className).toBe('ExtractTestPage');
    expect(definition.scope).toBe('extract-test');
    expect(definition.locators.length).toBeGreaterThanOrEqual(1);
  });

  it('should allow custom suffix in definition', () => {
    const journey = createTestJourney({ scope: 'custom' });
    const definition = extractModuleDefinition(journey, { suffix: 'Helper' });

    expect(definition.className).toBe('CustomHelper');
  });
});
