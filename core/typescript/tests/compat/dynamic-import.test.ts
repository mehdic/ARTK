/**
 * Unit tests for dynamicImport compatibility function
 * T032: Unit test for dynamicImport()
 */

import { describe, it, expect } from 'vitest';
import * as path from 'path';
import { fileURLToPath } from 'url';

// These will be implemented
import { dynamicImport } from '../../compat/dynamic-import.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('dynamicImport', () => {
  it('should import a built-in module', async () => {
    const fs = await dynamicImport<typeof import('fs')>('fs');
    expect(fs).toBeDefined();
    expect(typeof fs.readFileSync).toBe('function');
  });

  it('should import a built-in module with path specifier', async () => {
    const pathModule = await dynamicImport<typeof import('path')>('path');
    expect(pathModule).toBeDefined();
    expect(typeof pathModule.join).toBe('function');
  });

  it('should import a relative module', async () => {
    // Import another module from this test directory
    const detectEnv = await dynamicImport(
      path.join(__dirname, '../../compat/detect-env.js')
    );
    expect(detectEnv).toBeDefined();
    expect(typeof detectEnv.getModuleSystem).toBe('function');
  });

  it('should reject for non-existent module', async () => {
    await expect(dynamicImport('nonexistent-module-xyz-123')).rejects.toThrow();
  });

  it('should handle file:// URLs', async () => {
    const fileUrl = `file://${path.join(__dirname, '../../compat/detect-env.js')}`;
    const module = await dynamicImport(fileUrl);
    expect(module).toBeDefined();
  });

  it('should return the module with all exports', async () => {
    const os = await dynamicImport<typeof import('os')>('os');
    expect(os).toBeDefined();
    expect(typeof os.platform).toBe('function');
    expect(typeof os.homedir).toBe('function');
  });

  it('should cache imported modules (native behavior)', async () => {
    const first = await dynamicImport<typeof import('url')>('url');
    const second = await dynamicImport<typeof import('url')>('url');
    // Same reference due to module caching
    expect(first).toBe(second);
  });

  it('should handle default exports', async () => {
    // Create a test to verify default export handling
    // Import yaml package which has default export
    const yaml = await dynamicImport('yaml');
    expect(yaml).toBeDefined();
  });
});
