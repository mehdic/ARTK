/**
 * Integration tests for managed blocks regeneration strategy
 */
import { describe, it, expect } from 'vitest';
import type { IRJourney } from '../../src/ir/types.js';
import { generateTest } from '../../src/codegen/generateTest.js';
import { regenerateTestWithBlocks } from '../../src/index.js';
import { BLOCK_START, BLOCK_END } from '../../src/codegen/blocks.js';

describe('Managed Blocks Strategy Integration', () => {
  const baseJourney: IRJourney = {
    id: 'JRN-0001',
    title: 'Test Login',
    tier: 'smoke',
    scope: 'auth',
    actor: 'guest-user',
    tags: ['auth'],
    moduleDependencies: {
      foundation: [],
      feature: [],
    },
    steps: [
      {
        id: 'AC-1',
        description: 'Navigate to login',
        actions: [{ type: 'goto', url: '/login' }],
        assertions: [],
      },
    ],
  };

  it('should generate test with block markers using blocks strategy', () => {
    const existingCode = `
// User helper function
function customSetup() {
  return 'preserved';
}
`;

    const result = generateTest(baseJourney, {
      strategy: 'blocks',
      existingCode,
    });

    expect(result.code).toContain('customSetup');
    expect(result.code).toContain(BLOCK_START);
    expect(result.code).toContain(BLOCK_END);
    expect(result.code).toContain('id=test-JRN-0001');
  });

  it('should preserve user code outside blocks on regeneration', () => {
    const existingCode = `
import { test } from '@playwright/test';

// Custom configuration
const config = {
  baseUrl: 'https://example.com',
  timeout: 30000,
};

// Custom helper function - must be preserved
function loginHelper() {
  return 'preserved helper';
}

// ARTK:BEGIN GENERATED id=test-JRN-0001
// Old generated content
test('old test', () => {});
// ARTK:END GENERATED

// More user code - also preserved
const cleanup = () => {};
`;

    const result = generateTest(baseJourney, {
      strategy: 'blocks',
      existingCode,
    });

    // User code should be preserved
    expect(result.code).toContain('const config = {');
    expect(result.code).toContain('function loginHelper()');
    expect(result.code).toContain('const cleanup = () => {}');

    // Old generated content should be replaced
    expect(result.code).not.toContain("test('old test'");
    expect(result.code).toContain('Test Login'); // New content
  });

  it('should use regenerateTestWithBlocks convenience function', () => {
    const existingCode = `
function preserved() {}

// ARTK:BEGIN GENERATED id=test-JRN-0001
test('old', () => {});
// ARTK:END GENERATED
`;

    const result = regenerateTestWithBlocks(baseJourney, existingCode);

    expect(result.code).toContain('function preserved()');
    expect(result.code).toContain('id=test-JRN-0001');
    expect(result.code).not.toContain("test('old'");
  });

  it('should append blocks when no existing blocks', () => {
    const existingCode = `
import { test } from '@playwright/test';

function customTest() {
  console.log('user written test');
}
`;

    const result = generateTest(baseJourney, {
      strategy: 'blocks',
      existingCode,
    });

    // Existing code should be preserved
    expect(result.code).toContain('function customTest()');

    // New block should be appended
    expect(result.code).toContain(BLOCK_START);
    expect(result.code).toContain('Test Login');

    // Order: existing code first, then block
    const existingIdx = result.code.indexOf('customTest');
    const blockIdx = result.code.indexOf(BLOCK_START);
    expect(existingIdx).toBeLessThan(blockIdx);
  });

  it('should handle empty existing code by falling back to full generation', () => {
    const result = generateTest(baseJourney, {
      strategy: 'blocks',
      existingCode: '',
    });

    // Empty string is falsy, so falls back to full generation (no block markers)
    expect(result.code).toContain('Test Login');
    // Full generation doesn't add block markers
    expect(result.code).not.toContain(BLOCK_START);
  });

  it('should fall back to full strategy when no existingCode provided', () => {
    const result = generateTest(baseJourney, {
      strategy: 'blocks',
      // No existingCode - should fall back to full
    });

    // Should generate full test without block markers
    expect(result.code).toContain('Test Login');
    expect(result.code).not.toContain(BLOCK_START);
  });

  it('should maintain proper structure with multiple regenerations', () => {
    // Start with some existing code (not empty)
    let code = '// Initial user code\nconst myHelper = () => {};\n';

    // First generation - should add block
    code = generateTest(baseJourney, {
      strategy: 'blocks',
      existingCode: code,
    }).code;

    expect(code).toContain('id=test-JRN-0001');
    expect(code).toContain('myHelper');

    // Add more user code
    code += '\n\nfunction addedLater() { return "user code"; }\n';

    // Regenerate with updated journey
    const updatedJourney = {
      ...baseJourney,
      steps: [
        ...baseJourney.steps,
        {
          id: 'AC-2',
          description: 'Enter credentials',
          actions: [],
          assertions: [],
        },
      ],
    };

    code = generateTest(updatedJourney, {
      strategy: 'blocks',
      existingCode: code,
    }).code;

    // Original user code should still be preserved
    expect(code).toContain('myHelper');

    // Added user code should still be preserved
    expect(code).toContain('addedLater');

    // New step should be in generated content
    expect(code).toContain('Enter credentials');
  });

  it('should work with journey that has visual regression config', () => {
    const journeyWithVisual: IRJourney = {
      ...baseJourney,
      visualRegression: {
        enabled: true,
        snapshots: ['AC-1'],
        threshold: 0.05,
      },
    };

    const existingCode = `
// My custom viewport setup
function setViewport() {}
`;

    const result = generateTest(journeyWithVisual, {
      strategy: 'blocks',
      existingCode,
    });

    expect(result.code).toContain('setViewport');
    expect(result.code).toContain('toHaveScreenshot');
    expect(result.code).toContain('maxDiffPixelRatio: 0.05');
  });

  it('should work with journey that has accessibility config', () => {
    const journeyWithA11y: IRJourney = {
      ...baseJourney,
      accessibility: {
        enabled: true,
        rules: ['wcag2aa'],
      },
    };

    const existingCode = `
// A11y helper
function checkA11y() {}
`;

    const result = generateTest(journeyWithA11y, {
      strategy: 'blocks',
      existingCode,
    });

    expect(result.code).toContain('checkA11y');
    expect(result.code).toContain('AxeBuilder');
    expect(result.code).toContain('wcag2aa');
  });
});
