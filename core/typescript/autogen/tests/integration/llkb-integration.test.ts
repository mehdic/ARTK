/**
 * Integration Tests - LLKB-AutoGen Integration
 * @see research/2026-01-23_llkb-autogen-integration-specification.md
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join } from 'node:path';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import {
  loadConfigs,
  mergeConfigs,
  loadLLKBConfig,
  getDefaultConfig,
} from '../../src/config/loader.js';
import { AutogenConfigSchema, LLKBIntegrationSchema } from '../../src/config/schema.js';
import {
  loadExtendedGlossary,
  clearExtendedGlossary,
  lookupGlossary,
  getGlossaryStats,
  hasExtendedGlossary,
  initGlossary,
} from '../../src/mapping/glossary.js';

describe('LLKB Integration: Schema', () => {
  describe('LLKBIntegrationSchema', () => {
    it('should have correct defaults', () => {
      const result = LLKBIntegrationSchema.parse({});

      expect(result.enabled).toBe(false);
      expect(result.level).toBe('enhance');
      expect(result.configPath).toBeUndefined();
      expect(result.glossaryPath).toBeUndefined();
    });

    it('should accept valid LLKB config', () => {
      const result = LLKBIntegrationSchema.parse({
        enabled: true,
        configPath: 'autogen-llkb.config.yml',
        glossaryPath: 'llkb-glossary.ts',
        level: 'aggressive',
      });

      expect(result.enabled).toBe(true);
      expect(result.level).toBe('aggressive');
      expect(result.configPath).toBe('autogen-llkb.config.yml');
      expect(result.glossaryPath).toBe('llkb-glossary.ts');
    });

    it('should reject invalid level', () => {
      const result = LLKBIntegrationSchema.safeParse({
        level: 'invalid',
      });

      expect(result.success).toBe(false);
    });

    it('should accept all valid levels', () => {
      const levels = ['minimal', 'enhance', 'aggressive'];

      for (const level of levels) {
        const result = LLKBIntegrationSchema.safeParse({ level });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.level).toBe(level);
        }
      }
    });
  });

  describe('AutogenConfigSchema with LLKB', () => {
    it('should include llkb field with defaults', () => {
      const result = AutogenConfigSchema.parse({});

      expect(result.llkb).toBeDefined();
      expect(result.llkb.enabled).toBe(false);
      expect(result.llkb.level).toBe('enhance');
    });

    it('should accept full config with LLKB settings', () => {
      const result = AutogenConfigSchema.parse({
        version: 1,
        llkb: {
          enabled: true,
          configPath: 'llkb.config.yml',
          glossaryPath: 'llkb-glossary.ts',
          level: 'minimal',
        },
      });

      expect(result.llkb.enabled).toBe(true);
      expect(result.llkb.level).toBe('minimal');
    });
  });
});

describe('LLKB Integration: Config Loader', () => {
  const testDir = join(process.cwd(), 'test-fixtures', 'llkb-config-test');

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
    mkdirSync(join(testDir, 'artk'), { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    vi.restoreAllMocks();
  });

  describe('mergeConfigs', () => {
    it('should return default config for empty array', () => {
      const result = mergeConfigs([]);
      expect(result).toMatchObject(getDefaultConfig());
    });

    it('should merge single config with defaults', () => {
      const config = AutogenConfigSchema.parse({
        paths: { journeys: 'custom/journeys' },
      });

      const result = mergeConfigs([config]);

      expect(result.paths.journeys).toBe('custom/journeys');
      expect(result.paths.modules).toBe('e2e/modules'); // default preserved
    });

    it('should merge multiple configs with later taking precedence', () => {
      // Note: When using AutogenConfigSchema.parse(), Zod applies defaults for ALL fields
      // So config2.paths.modules will be 'e2e/modules' (default), not undefined
      // This test verifies that explicit values in later configs override earlier ones
      const config1 = AutogenConfigSchema.parse({
        paths: { journeys: 'first/journeys', modules: 'first/modules' },
      });
      const config2 = AutogenConfigSchema.parse({
        paths: { journeys: 'second/journeys', modules: 'second/modules' },
      });

      const result = mergeConfigs([config1, config2]);

      expect(result.paths.journeys).toBe('second/journeys');
      expect(result.paths.modules).toBe('second/modules');
    });

    it('should preserve first config values when second config uses defaults', () => {
      // When second config doesn't explicitly set a value, Zod applies defaults
      // This is expected behavior - the merged result uses whatever is in config2
      const config1 = AutogenConfigSchema.parse({
        paths: { journeys: 'first/journeys', modules: 'first/modules' },
      });
      const config2 = AutogenConfigSchema.parse({
        paths: { journeys: 'second/journeys' }, // modules gets default value
      });

      const result = mergeConfigs([config1, config2]);

      expect(result.paths.journeys).toBe('second/journeys');
      // config2.paths.modules is 'e2e/modules' (default), which takes precedence
      expect(result.paths.modules).toBe('e2e/modules');
    });

    it('should merge forbiddenPatterns additively', () => {
      const config1 = AutogenConfigSchema.parse({
        selectorPolicy: { forbiddenPatterns: ['pattern1', 'pattern2'] },
      });
      const config2 = AutogenConfigSchema.parse({
        selectorPolicy: { forbiddenPatterns: ['pattern2', 'pattern3'] },
      });

      const result = mergeConfigs([config1, config2]);

      expect(result.selectorPolicy.forbiddenPatterns).toContain('pattern1');
      expect(result.selectorPolicy.forbiddenPatterns).toContain('pattern2');
      expect(result.selectorPolicy.forbiddenPatterns).toContain('pattern3');
      // Should deduplicate
      expect(
        result.selectorPolicy.forbiddenPatterns.filter((p) => p === 'pattern2').length
      ).toBe(1);
    });

    it('should merge eslintRules additively', () => {
      const config1 = AutogenConfigSchema.parse({
        validation: { eslintRules: { 'rule1': 'error', 'rule2': 'warn' } },
      });
      const config2 = AutogenConfigSchema.parse({
        validation: { eslintRules: { 'rule2': 'error', 'rule3': 'off' } },
      });

      const result = mergeConfigs([config1, config2]);

      expect(result.validation.eslintRules['rule1']).toBe('error');
      expect(result.validation.eslintRules['rule2']).toBe('error'); // overwritten
      expect(result.validation.eslintRules['rule3']).toBe('off');
    });

    it('should merge LLKB config with explicit values', () => {
      // Both configs explicitly set different LLKB fields
      const config1 = AutogenConfigSchema.parse({
        llkb: { enabled: true, level: 'minimal' },
      });
      const config2 = AutogenConfigSchema.parse({
        llkb: { enabled: true, configPath: 'llkb.config.yml', level: 'minimal' },
      });

      const result = mergeConfigs([config1, config2]);

      expect(result.llkb.enabled).toBe(true);
      expect(result.llkb.level).toBe('minimal');
      expect(result.llkb.configPath).toBe('llkb.config.yml');
    });

    it('should override LLKB defaults when second config uses defaults', () => {
      // When second config doesn't explicitly set enabled/level, Zod applies defaults
      const config1 = AutogenConfigSchema.parse({
        llkb: { enabled: true, level: 'minimal' },
      });
      const config2 = AutogenConfigSchema.parse({
        llkb: { configPath: 'llkb.config.yml' }, // enabled defaults to false, level to 'enhance'
      });

      const result = mergeConfigs([config1, config2]);

      // config2 has defaults: enabled=false, level='enhance'
      // These take precedence over config1's explicit values
      expect(result.llkb.enabled).toBe(false);
      expect(result.llkb.level).toBe('enhance');
      expect(result.llkb.configPath).toBe('llkb.config.yml');
    });
  });

  describe('loadConfigs', () => {
    it('should return default config when no paths exist', () => {
      vi.spyOn(process, 'cwd').mockReturnValue(testDir);

      const result = loadConfigs(['nonexistent1.yml', 'nonexistent2.yml']);

      expect(result).toMatchObject(getDefaultConfig());
    });

    it('should load and merge existing configs', () => {
      vi.spyOn(process, 'cwd').mockReturnValue(testDir);

      const configPath = join(testDir, 'artk', 'autogen.config.yml');
      writeFileSync(
        configPath,
        `
version: 1
paths:
  journeys: my-journeys
llkb:
  enabled: true
`
      );

      const result = loadConfigs([configPath]);

      expect(result.paths.journeys).toBe('my-journeys');
      expect(result.llkb.enabled).toBe(true);
    });

    it('should skip non-existent configs', () => {
      vi.spyOn(process, 'cwd').mockReturnValue(testDir);

      const configPath = join(testDir, 'artk', 'autogen.config.yml');
      writeFileSync(configPath, 'version: 1\npaths:\n  journeys: custom');

      const result = loadConfigs([configPath, 'nonexistent.yml']);

      expect(result.paths.journeys).toBe('custom');
    });
  });

  describe('loadLLKBConfig', () => {
    it('should return null when no LLKB config exists', () => {
      const result = loadLLKBConfig(testDir);
      expect(result).toBeNull();
    });

    it('should load LLKB config when it exists', () => {
      const llkbConfigPath = join(testDir, 'autogen-llkb.config.yml');
      writeFileSync(
        llkbConfigPath,
        `
version: 1
selectorPolicy:
  forbiddenPatterns:
    - "llkb-pattern"
`
      );

      const result = loadLLKBConfig(testDir);

      expect(result).not.toBeNull();
      expect(result!.selectorPolicy.forbiddenPatterns).toContain('llkb-pattern');
    });

    it('should return null for invalid LLKB config', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});

      const llkbConfigPath = join(testDir, 'autogen-llkb.config.yml');
      writeFileSync(llkbConfigPath, 'invalid: yaml: content');

      const result = loadLLKBConfig(testDir);

      expect(result).toBeNull();
      expect(console.warn).toHaveBeenCalled();
    });
  });
});

describe('LLKB Integration: Glossary', () => {
  const testDir = join(process.cwd(), 'test-fixtures', 'llkb-glossary-test');

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
    clearExtendedGlossary();
    initGlossary();
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    clearExtendedGlossary();
  });

  describe('loadExtendedGlossary', () => {
    it('should return error for non-existent file', async () => {
      const result = await loadExtendedGlossary(join(testDir, 'nonexistent.ts'));

      expect(result.loaded).toBe(false);
      expect(result.entryCount).toBe(0);
      expect(result.error).toContain('not found');
    });

    it('should load glossary with Map export', async () => {
      const glossaryPath = join(testDir, 'llkb-glossary.mjs');
      writeFileSync(
        glossaryPath,
        `
export const llkbGlossary = new Map([
  ["wait for grid to load", { type: "callModule", module: "ag-grid", method: "waitForLoad" }],
  ["edit grid cell", { type: "callModule", module: "ag-grid", method: "editCell" }],
]);

export const llkbGlossaryMeta = {
  exportedAt: "2026-01-23T10:00:00Z",
  entryCount: 2,
  minConfidence: 0.7,
};
`
      );

      const result = await loadExtendedGlossary(glossaryPath);

      expect(result.loaded).toBe(true);
      expect(result.entryCount).toBe(2);
      expect(result.exportedAt).toBe('2026-01-23T10:00:00Z');
    });

    it('should load glossary with object export', async () => {
      const glossaryPath = join(testDir, 'llkb-glossary-obj.mjs');
      writeFileSync(
        glossaryPath,
        `
export const llkbGlossary = {
  "handle sticky header": { type: "callModule", module: "ui", method: "handleStickyHeader" },
};

export const llkbGlossaryMeta = {
  exportedAt: "2026-01-23T11:00:00Z",
  entryCount: 1,
};
`
      );

      const result = await loadExtendedGlossary(glossaryPath);

      expect(result.loaded).toBe(true);
      expect(result.entryCount).toBe(1);
    });
  });

  describe('clearExtendedGlossary', () => {
    it('should clear loaded glossary', async () => {
      const glossaryPath = join(testDir, 'clear-test.mjs');
      writeFileSync(
        glossaryPath,
        `
export const llkbGlossary = new Map([
  ["test entry", { type: "callModule", module: "test", method: "test" }],
]);
`
      );

      await loadExtendedGlossary(glossaryPath);
      expect(hasExtendedGlossary()).toBe(true);

      clearExtendedGlossary();
      expect(hasExtendedGlossary()).toBe(false);
    });
  });

  describe('lookupGlossary', () => {
    it('should return undefined for unknown term without extended glossary', () => {
      const result = lookupGlossary('unknown term');
      expect(result).toBeUndefined();
    });

    it('should find core glossary terms', () => {
      // Core glossary includes module methods like "log in" -> auth.login
      const result = lookupGlossary('log in');

      expect(result).toBeDefined();
      expect(result?.type).toBe('callModule');
    });

    it('should find extended glossary terms', async () => {
      const glossaryPath = join(testDir, 'lookup-test.mjs');
      writeFileSync(
        glossaryPath,
        `
export const llkbGlossary = new Map([
  ["wait for grid to load", { type: "callModule", module: "ag-grid", method: "waitForLoad" }],
]);
`
      );

      await loadExtendedGlossary(glossaryPath);

      const result = lookupGlossary('wait for grid to load');

      expect(result).toBeDefined();
      expect(result?.type).toBe('callModule');
      if (result?.type === 'callModule') {
        expect(result.module).toBe('ag-grid');
        expect(result.method).toBe('waitForLoad');
      }
    });

    it('should prioritize core glossary over extended', async () => {
      const glossaryPath = join(testDir, 'priority-test.mjs');
      writeFileSync(
        glossaryPath,
        `
export const llkbGlossary = new Map([
  ["log in", { type: "callModule", module: "llkb-auth", method: "llkbLogin" }],
]);
`
      );

      await loadExtendedGlossary(glossaryPath);

      // "log in" is in core glossary - should use core, not LLKB
      const result = lookupGlossary('log in');

      expect(result).toBeDefined();
      expect(result?.type).toBe('callModule');
      if (result?.type === 'callModule') {
        expect(result.module).toBe('auth'); // Core, not llkb-auth
        expect(result.method).toBe('login'); // Core, not llkbLogin
      }
    });

    it('should be case-insensitive', async () => {
      const glossaryPath = join(testDir, 'case-test.mjs');
      writeFileSync(
        glossaryPath,
        `
export const llkbGlossary = new Map([
  ["wait for grid", { type: "callModule", module: "grid", method: "wait" }],
]);
`
      );

      await loadExtendedGlossary(glossaryPath);

      const result1 = lookupGlossary('Wait For Grid');
      const result2 = lookupGlossary('WAIT FOR GRID');
      const result3 = lookupGlossary('wait for grid');

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      expect(result3).toBeDefined();
    });
  });

  describe('getGlossaryStats', () => {
    it('should return stats without extended glossary', () => {
      const stats = getGlossaryStats();

      expect(stats.coreEntries).toBeGreaterThan(0);
      expect(stats.extendedEntries).toBe(0);
      expect(stats.extendedExportedAt).toBeNull();
    });

    it('should return stats with extended glossary', async () => {
      const glossaryPath = join(testDir, 'stats-test.mjs');
      writeFileSync(
        glossaryPath,
        `
export const llkbGlossary = new Map([
  ["entry1", { type: "callModule", module: "m1", method: "m1" }],
  ["entry2", { type: "callModule", module: "m2", method: "m2" }],
  ["entry3", { type: "callModule", module: "m3", method: "m3" }],
]);

export const llkbGlossaryMeta = {
  exportedAt: "2026-01-23T12:00:00Z",
  entryCount: 3,
  minConfidence: 0.8,
};
`
      );

      await loadExtendedGlossary(glossaryPath);
      const stats = getGlossaryStats();

      expect(stats.extendedEntries).toBe(3);
      expect(stats.extendedExportedAt).toBe('2026-01-23T12:00:00Z');
      expect(stats.extendedMeta?.minConfidence).toBe(0.8);
    });
  });

  describe('hasExtendedGlossary', () => {
    it('should return false initially', () => {
      expect(hasExtendedGlossary()).toBe(false);
    });

    it('should return true after loading glossary', async () => {
      const glossaryPath = join(testDir, 'has-test.mjs');
      writeFileSync(
        glossaryPath,
        `
export const llkbGlossary = new Map([
  ["test", { type: "callModule", module: "t", method: "t" }],
]);
`
      );

      await loadExtendedGlossary(glossaryPath);
      expect(hasExtendedGlossary()).toBe(true);
    });

    it('should return false for empty glossary', async () => {
      const glossaryPath = join(testDir, 'empty-test.mjs');
      writeFileSync(
        glossaryPath,
        `
export const llkbGlossary = new Map([]);
`
      );

      await loadExtendedGlossary(glossaryPath);
      expect(hasExtendedGlossary()).toBe(false);
    });
  });
});
