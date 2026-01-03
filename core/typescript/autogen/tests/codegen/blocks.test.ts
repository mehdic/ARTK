/**
 * Tests for managed blocks functionality
 */
import { describe, it, expect } from 'vitest';
import {
  extractManagedBlocks,
  injectManagedBlocks,
  BLOCK_START,
  BLOCK_END,
} from '../../src/codegen/blocks.js';

describe('Managed Blocks', () => {
  describe('extractManagedBlocks', () => {
    it('should extract single block without ID', () => {
      const code = `
import { test } from '@playwright/test';

// ARTK:BEGIN GENERATED
test('example', async ({ page }) => {
  await page.goto('/');
});
// ARTK:END GENERATED

// Custom helper
function customHelper() {}
`;

      const result = extractManagedBlocks(code);

      expect(result.hasBlocks).toBe(true);
      expect(result.blocks).toHaveLength(1);
      expect(result.blocks[0].id).toBeUndefined();
      expect(result.blocks[0].content).toContain("test('example'");
      expect(result.preservedCode.join('\n')).toContain('customHelper');
    });

    it('should extract block with ID', () => {
      const code = `
// ARTK:BEGIN GENERATED id=test-login
test('login', async ({ page }) => {
  await page.goto('/login');
});
// ARTK:END GENERATED
`;

      const result = extractManagedBlocks(code);

      expect(result.blocks).toHaveLength(1);
      expect(result.blocks[0].id).toBe('test-login');
      expect(result.blocks[0].content).toContain("test('login'");
    });

    it('should extract multiple blocks', () => {
      const code = `
// ARTK:BEGIN GENERATED id=test-1
test('first', () => {});
// ARTK:END GENERATED

// User code here

// ARTK:BEGIN GENERATED id=test-2
test('second', () => {});
// ARTK:END GENERATED
`;

      const result = extractManagedBlocks(code);

      expect(result.blocks).toHaveLength(2);
      expect(result.blocks[0].id).toBe('test-1');
      expect(result.blocks[1].id).toBe('test-2');
      expect(result.preservedCode.join('\n')).toContain('User code here');
    });

    it('should preserve code outside blocks', () => {
      const code = `
import { test } from '@playwright/test';

function helper() {
  return 'preserved';
}

// ARTK:BEGIN GENERATED
test('generated', () => {});
// ARTK:END GENERATED

// More user code
const config = { key: 'value' };
`;

      const result = extractManagedBlocks(code);

      const preserved = result.preservedCode.join('\n');
      expect(preserved).toContain("import { test }");
      expect(preserved).toContain("function helper()");
      expect(preserved).toContain("More user code");
      expect(preserved).toContain("const config");
    });

    it('should handle unclosed blocks gracefully', () => {
      const code = `
// ARTK:BEGIN GENERATED id=broken
test('broken', () => {});
// Missing END marker
`;

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      extractManagedBlocks(code);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Unclosed'));
      consoleSpy.mockRestore();
    });

    it('should handle nested blocks as malformed', () => {
      const code = `
// ARTK:BEGIN GENERATED id=outer
test('outer', () => {
  // ARTK:BEGIN GENERATED id=inner
  // Nested - should warn
  // ARTK:END GENERATED
});
// ARTK:END GENERATED
`;

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const result = extractManagedBlocks(code);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Nested'));
      consoleSpy.mockRestore();
    });

    it('should return empty result for code without blocks', () => {
      const code = `
import { test } from '@playwright/test';

test('regular test', () => {
  // No managed blocks here
});
`;

      const result = extractManagedBlocks(code);

      expect(result.hasBlocks).toBe(false);
      expect(result.blocks).toHaveLength(0);
      expect(result.preservedCode.join('\n')).toContain('regular test');
    });

    it('should handle empty code', () => {
      const result = extractManagedBlocks('');

      expect(result.hasBlocks).toBe(false);
      expect(result.blocks).toHaveLength(0);
      expect(result.preservedCode).toEqual(['']);
    });
  });

  describe('injectManagedBlocks', () => {
    it('should inject blocks into empty file', () => {
      const result = injectManagedBlocks({
        existingCode: '',
        newBlocks: [
          { id: 'test-1', content: "test('first', () => {});" },
          { id: 'test-2', content: "test('second', () => {});" },
        ],
      });

      expect(result).toContain(BLOCK_START);
      expect(result).toContain(BLOCK_END);
      expect(result).toContain('id=test-1');
      expect(result).toContain('id=test-2');
      expect(result).toContain("test('first'");
      expect(result).toContain("test('second'");
    });

    it('should append blocks to file without existing blocks', () => {
      const existingCode = `
import { test } from '@playwright/test';

function helper() {
  return 'user code';
}
`;

      const result = injectManagedBlocks({
        existingCode,
        newBlocks: [
          { content: "test('new', () => {});" },
        ],
      });

      expect(result).toContain('function helper()');
      expect(result).toContain(BLOCK_START);
      expect(result).toContain("test('new'");
    });

    it('should replace blocks by ID', () => {
      const existingCode = `
// ARTK:BEGIN GENERATED id=test-1
test('old content', () => {});
// ARTK:END GENERATED
`;

      const result = injectManagedBlocks({
        existingCode,
        newBlocks: [
          { id: 'test-1', content: "test('new content', () => {});" },
        ],
      });

      expect(result).toContain("test('new content'");
      expect(result).not.toContain("test('old content'");
      expect(result).toContain('id=test-1');
    });

    it('should preserve user code outside blocks during replacement', () => {
      const existingCode = `
import { test } from '@playwright/test';

// Custom helper function
function customHelper() {
  return 'preserved';
}

// ARTK:BEGIN GENERATED id=test-main
test('old', () => {});
// ARTK:END GENERATED

// More user code
const config = { preserved: true };
`;

      const result = injectManagedBlocks({
        existingCode,
        newBlocks: [
          { id: 'test-main', content: "test('new', () => {});" },
        ],
      });

      expect(result).toContain("import { test }");
      expect(result).toContain("function customHelper()");
      expect(result).toContain("const config");
      expect(result).toContain("test('new'");
      expect(result).not.toContain("test('old'");
    });

    it('should append new blocks that do not match existing IDs', () => {
      const existingCode = `
// ARTK:BEGIN GENERATED id=test-1
test('first', () => {});
// ARTK:END GENERATED
`;

      const result = injectManagedBlocks({
        existingCode,
        newBlocks: [
          { id: 'test-1', content: "test('first updated', () => {});" },
          { id: 'test-2', content: "test('second new', () => {});" },
        ],
      });

      expect(result).toContain("test('first updated'");
      expect(result).toContain("test('second new'");
      expect(result).toContain('id=test-1');
      expect(result).toContain('id=test-2');
    });

    it('should preserve original blocks when no replacement provided', () => {
      const existingCode = `
// ARTK:BEGIN GENERATED id=test-1
test('first', () => {});
// ARTK:END GENERATED

// ARTK:BEGIN GENERATED id=test-2
test('second', () => {});
// ARTK:END GENERATED
`;

      const result = injectManagedBlocks({
        existingCode,
        newBlocks: [
          { id: 'test-1', content: "test('first updated', () => {});" },
          // test-2 not replaced, should be preserved
        ],
      });

      expect(result).toContain("test('first updated'");
      expect(result).toContain("test('second'"); // Original preserved
      expect(result).toContain('id=test-1');
      expect(result).toContain('id=test-2');
    });

    it('should maintain block order', () => {
      const existingCode = `
// User setup
const setup = true;

// ARTK:BEGIN GENERATED id=test-1
test('first', () => {});
// ARTK:END GENERATED

// User middle code
const middle = true;

// ARTK:BEGIN GENERATED id=test-2
test('second', () => {});
// ARTK:END GENERATED

// User teardown
const teardown = true;
`;

      const result = injectManagedBlocks({
        existingCode,
        newBlocks: [
          { id: 'test-1', content: "test('first new', () => {});" },
          { id: 'test-2', content: "test('second new', () => {});" },
        ],
      });

      const lines = result.split('\n');
      const setupIdx = lines.findIndex(l => l.includes('const setup'));
      const test1Idx = lines.findIndex(l => l.includes("test('first new'"));
      const middleIdx = lines.findIndex(l => l.includes('const middle'));
      const test2Idx = lines.findIndex(l => l.includes("test('second new'"));
      const teardownIdx = lines.findIndex(l => l.includes('const teardown'));

      expect(setupIdx).toBeLessThan(test1Idx);
      expect(test1Idx).toBeLessThan(middleIdx);
      expect(middleIdx).toBeLessThan(test2Idx);
      expect(test2Idx).toBeLessThan(teardownIdx);
    });

    it('should handle blocks without IDs', () => {
      const existingCode = `
// ARTK:BEGIN GENERATED
test('anonymous', () => {});
// ARTK:END GENERATED
`;

      const result = injectManagedBlocks({
        existingCode,
        newBlocks: [
          { content: "test('new anonymous', () => {});" },
        ],
      });

      // Anonymous blocks can't be replaced by ID, so both should appear
      expect(result).toContain(BLOCK_START);
      expect(result).toContain(BLOCK_END);
    });

    it('should create properly formatted blocks', () => {
      const result = injectManagedBlocks({
        existingCode: '',
        newBlocks: [
          { id: 'test-example', content: "test('example', () => {});" },
        ],
      });

      const lines = result.split('\n');
      expect(lines[0]).toBe('// ARTK:BEGIN GENERATED id=test-example');
      expect(lines[1]).toBe("test('example', () => {});");
      expect(lines[2]).toBe('// ARTK:END GENERATED');
    });
  });

  describe('integration scenarios', () => {
    it('should handle full regeneration workflow', () => {
      // First generation - empty file
      let code = '';

      // Generate first test
      code = injectManagedBlocks({
        existingCode: code,
        newBlocks: [
          { id: 'test-login', content: "test('login', () => {});" },
        ],
      });

      expect(code).toContain("test('login'");

      // User adds custom helper
      code += `\n\nfunction customAuth() {\n  return 'token';\n}`;

      // Regenerate same test with updates
      code = injectManagedBlocks({
        existingCode: code,
        newBlocks: [
          { id: 'test-login', content: "test('login updated', () => {});" },
        ],
      });

      expect(code).toContain("test('login updated'");
      expect(code).toContain('customAuth');
      expect(code).not.toContain("test('login', () => {});");
    });

    it('should handle multiple test regenerations', () => {
      let code = `
import { test } from '@playwright/test';

function helper() {}
`;

      // Add first test
      code = injectManagedBlocks({
        existingCode: code,
        newBlocks: [
          { id: 'test-1', content: "test('first', () => {});" },
        ],
      });

      // Add second test
      code = injectManagedBlocks({
        existingCode: code,
        newBlocks: [
          { id: 'test-1', content: "test('first', () => {});" },
          { id: 'test-2', content: "test('second', () => {});" },
        ],
      });

      // Update both tests
      code = injectManagedBlocks({
        existingCode: code,
        newBlocks: [
          { id: 'test-1', content: "test('first updated', () => {});" },
          { id: 'test-2', content: "test('second updated', () => {});" },
        ],
      });

      expect(code).toContain("test('first updated'");
      expect(code).toContain("test('second updated'");
      expect(code).toContain('function helper()');
    });
  });
});
