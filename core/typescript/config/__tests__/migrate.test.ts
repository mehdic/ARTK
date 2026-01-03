/**
 * Unit tests for configuration migration system
 *
 * Tests migration from older versions to current version
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  clearMigrations,
  getAllMigrations,
  getMigration,
  isVersionSupported,
  migrateConfig,
  type Migration,
  needsMigration,
  registerMigration,
} from '../migrate.js';
import { CURRENT_CONFIG_VERSION } from '../schema.js';

describe('migrate', () => {
  // Note: We don't use afterEach to clear migrations globally
  // because the built-in v0→v1 migration needs to remain registered.
  // Individual test suites that need isolation will clear/restore manually.

  describe('needsMigration', () => {
    it('returns true for version 0 (no version field)', () => {
      const config = {};
      expect(needsMigration(config)).toBe(true);
    });

    it('returns true for version less than current', () => {
      const config = { version: CURRENT_CONFIG_VERSION - 1 };
      expect(needsMigration(config)).toBe(true);
    });

    it('returns false for current version', () => {
      const config = { version: CURRENT_CONFIG_VERSION };
      expect(needsMigration(config)).toBe(false);
    });

    it('returns false for future version', () => {
      const config = { version: CURRENT_CONFIG_VERSION + 1 };
      expect(needsMigration(config)).toBe(false);
    });
  });

  describe('isVersionSupported', () => {
    it('supports version 0 (legacy)', () => {
      expect(isVersionSupported(0)).toBe(true);
    });

    it('supports version 1', () => {
      expect(isVersionSupported(1)).toBe(true);
    });

    it('supports current version', () => {
      expect(isVersionSupported(CURRENT_CONFIG_VERSION)).toBe(true);
    });

    it('rejects negative versions', () => {
      expect(isVersionSupported(-1)).toBe(false);
    });

    it('rejects future versions', () => {
      expect(isVersionSupported(CURRENT_CONFIG_VERSION + 1)).toBe(false);
    });
  });

  describe('registerMigration', () => {
    let savedV0toV1: Migration | undefined;

    beforeEach(() => {
      // Save built-in migration before clearing
      savedV0toV1 = getMigration(0, 1);
      clearMigrations();
      // Restore built-in migration
      if (savedV0toV1) {
        registerMigration(savedV0toV1);
      }
    });

    it('registers a valid migration', () => {
      const migration: Migration = {
        fromVersion: 1,
        toVersion: 2,
        description: 'Test migration',
        migrate: (config) => config,
      };

      expect(() => registerMigration(migration)).not.toThrow();

      const retrieved = getMigration(1, 2);
      expect(retrieved).toBeDefined();
      expect(retrieved?.description).toBe('Test migration');
    });

    it('rejects duplicate migrations', () => {
      const migration1: Migration = {
        fromVersion: 1,
        toVersion: 2,
        description: 'First',
        migrate: (config) => config,
      };

      const migration2: Migration = {
        fromVersion: 1,
        toVersion: 2,
        description: 'Duplicate',
        migrate: (config) => config,
      };

      registerMigration(migration1);

      expect(() => registerMigration(migration2)).toThrow(/already registered/);
    });

    it('rejects non-sequential migrations', () => {
      const migration: Migration = {
        fromVersion: 1,
        toVersion: 3, // Skips version 2
        description: 'Non-sequential',
        migrate: (config) => config,
      };

      expect(() => registerMigration(migration)).toThrow(/increment version by 1/);
    });
  });

  describe('getMigration', () => {
    it('retrieves built-in v0→v1 migration', () => {
      const migration = getMigration(0, 1);

      expect(migration).toBeDefined();
      expect(migration?.fromVersion).toBe(0);
      expect(migration?.toVersion).toBe(1);
    });

    it('retrieves newly registered migration', () => {
      const migration: Migration = {
        fromVersion: 1,
        toVersion: 2,
        description: 'Test',
        migrate: (config) => config,
      };

      registerMigration(migration);

      const retrieved = getMigration(1, 2);
      expect(retrieved).toBe(migration);
    });

    it('returns undefined for non-existent migration', () => {
      const retrieved = getMigration(99, 100);
      expect(retrieved).toBeUndefined();
    });
  });

  describe('migrateConfig', () => {
    describe('no migration needed', () => {
      it('returns config unchanged when already at current version', () => {
        const config = {
          version: CURRENT_CONFIG_VERSION,
          someField: 'value',
        };

        const result = migrateConfig(config);

        expect(result.fromVersion).toBe(CURRENT_CONFIG_VERSION);
        expect(result.toVersion).toBe(CURRENT_CONFIG_VERSION);
        expect(result.migrationsApplied).toEqual([]);
        expect(result.config.someField).toBe('value');
      });
    });

    describe('version 0 to current', () => {
      it('migrates config without version field', () => {
        const config = {
          app: { name: 'Test' },
          // No version field
        };

        const result = migrateConfig(config);

        expect(result.fromVersion).toBe(0);
        expect(result.toVersion).toBe(CURRENT_CONFIG_VERSION);
        expect(result.config.version).toBe(CURRENT_CONFIG_VERSION);
        expect(result.config.app).toEqual({ name: 'Test' });
      });

      it('applies v0→v1 migration with description', () => {
        const config = {};

        const result = migrateConfig(config);

        expect(result.migrationsApplied).toContain('Add version field to legacy config');
      });
    });

    describe('error handling', () => {
      it('throws error for unsupported version', () => {
        const config = { version: -1 };

        expect(() => migrateConfig(config)).toThrow(/not supported/);
      });

      it('throws error for future version', () => {
        const config = { version: CURRENT_CONFIG_VERSION + 10 };

        expect(() => migrateConfig(config)).toThrow(/not supported/);
      });
    });

    describe('sequential migrations (CURRENT_CONFIG_VERSION = 1)', () => {
      // Since CURRENT_CONFIG_VERSION = 1, we can't test multi-step migrations
      // This test documents expected behavior when future versions exist

      it('applies v0→v1 migration', () => {
        const config = {
          version: 0,
          someField: 'value',
        };

        const result = migrateConfig(config);

        expect(result.fromVersion).toBe(0);
        expect(result.toVersion).toBe(1);
        expect(result.migrationsApplied).toEqual(['Add version field to legacy config']);
        expect(result.config.version).toBe(1);
        expect(result.config.someField).toBe('value');
      });

      it('tracks migration description', () => {
        const config = { version: 0 };

        const result = migrateConfig(config);

        expect(result.migrationsApplied.length).toBe(1);
        expect(result.migrationsApplied[0]).toContain('version field');
      });
    });

    // Note: incomplete migration path tests will be added when version 2 exists
    // This validates error handling for gaps in the migration chain
  });

  describe('built-in migrations', () => {
    it('has v0→v1 migration registered', () => {
      const migration = getMigration(0, 1);

      expect(migration).toBeDefined();
      expect(migration?.description).toContain('version field');
    });

    it('v0→v1 migration preserves all fields', () => {
      const config = {
        app: { name: 'Test', baseUrl: 'https://example.com' },
        auth: { provider: 'oidc' },
        customField: 'preserved',
      };

      const migration = getMigration(0, 1);
      expect(migration).toBeDefined();

      if (migration) {
        const migrated = migration.migrate(config);

        expect(migrated.app).toEqual(config.app);
        expect(migrated.auth).toEqual(config.auth);
        expect(migrated.customField).toBe('preserved');
      }
    });
  });

  describe('getAllMigrations', () => {
    it('returns all registered migrations', () => {
      const all = getAllMigrations();

      expect(all).toBeInstanceOf(Array);
      expect(all.length).toBeGreaterThanOrEqual(1); // At least v0→v1
    });

    it('includes built-in v0→v1 migration', () => {
      const all = getAllMigrations();

      const v0to1 = all.find((m) => m.fromVersion === 0 && m.toVersion === 1);
      expect(v0to1).toBeDefined();
    });
  });

  describe('clearMigrations', () => {
    it('clears all migrations', () => {
      clearMigrations();

      const all = getAllMigrations();
      expect(all.length).toBe(0);
    });

    afterEach(() => {
      // Restore built-in migration for subsequent tests
      // This is necessary because clearMigrations() removes it
      registerMigration({
        fromVersion: 0,
        toVersion: 1,
        description: 'Add version field to legacy config',
        migrate: (config) => ({ ...config }),
      });
    });
  });

  describe('edge cases', () => {
    it('handles config with extra fields', () => {
      const config = {
        version: 0,
        knownField: 'value',
        unknownField: 'preserved',
        nested: { deep: { value: 123 } },
      };

      const result = migrateConfig(config);

      expect(result.config.unknownField).toBe('preserved');
      expect(result.config.nested).toEqual({ deep: { value: 123 } });
    });

    it('handles empty config object', () => {
      const config = {};

      const result = migrateConfig(config);

      expect(result.config.version).toBe(CURRENT_CONFIG_VERSION);
      expect(result.fromVersion).toBe(0);
    });

    it('preserves type of field values', () => {
      const config = {
        version: 0,
        string: 'text',
        number: 42,
        boolean: true,
        array: [1, 2, 3],
        object: { nested: 'value' },
        null: null,
      };

      const result = migrateConfig(config);

      expect(typeof result.config.string).toBe('string');
      expect(typeof result.config.number).toBe('number');
      expect(typeof result.config.boolean).toBe('boolean');
      expect(Array.isArray(result.config.array)).toBe(true);
      expect(typeof result.config.object).toBe('object');
      expect(result.config.null).toBe(null);
    });
  });
});
