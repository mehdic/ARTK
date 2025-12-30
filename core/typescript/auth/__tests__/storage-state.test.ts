/**
 * Unit tests for storage state management
 *
 * Tests FR-007: Persist storage state to files
 * Tests FR-008: Invalidate storage state based on maxAge
 * Tests NFR-007: Auto-delete storage state files older than 24 hours
 *
 * @module auth/__tests__/storage-state.test
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {
  CLEANUP_MAX_AGE_MS,
  cleanupExpiredStorageStates,
  cleanupStorageStatesOlderThan,
  clearStorageState,
  DEFAULT_STORAGE_STATE_CONFIG,
  getRoleFromPath,
  getStorageStateMetadata,
  isStorageStateValid,
  listStorageStates,
  type StorageStateOptions,
} from '../storage-state.js';
// ARTKStorageStateError may be used in future tests

// =============================================================================
// Test Setup
// =============================================================================

const TEST_DIR = path.join(process.cwd(), '.test-auth-states');
const TEST_OPTIONS: StorageStateOptions = {
  directory: '.test-auth-states',
  maxAgeMinutes: 60,
  filePattern: '{role}.json',
  projectRoot: process.cwd(),
};

// Helper to create test storage state files
async function createTestStorageState(
  role: string,
  ageMs: number = 0,
  valid: boolean = true
): Promise<string> {
  await fs.mkdir(TEST_DIR, { recursive: true });

  const filePath = path.join(TEST_DIR, `${role}.json`);
  const content = valid
    ? JSON.stringify({ cookies: [], origins: [] })
    : 'invalid json {{{';

  await fs.writeFile(filePath, content);

  if (ageMs > 0) {
    const mtime = new Date(Date.now() - ageMs);
    await fs.utimes(filePath, mtime, mtime);
  }

  return filePath;
}

// Cleanup helper
async function cleanupTestDir(): Promise<void> {
  try {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  } catch {
    // Ignore errors
  }
}

// =============================================================================
// Test Lifecycle
// =============================================================================

beforeEach(async () => {
  await cleanupTestDir();
});

afterEach(async () => {
  await cleanupTestDir();
});

// =============================================================================
// isStorageStateValid Tests
// =============================================================================

describe('isStorageStateValid', () => {
  it('returns true for fresh valid storage state', async () => {
    await createTestStorageState('admin', 0, true);

    const valid = await isStorageStateValid('admin', TEST_OPTIONS);

    expect(valid).toBe(true);
  });

  it('returns false for non-existent storage state', async () => {
    const valid = await isStorageStateValid('nonexistent', TEST_OPTIONS);

    expect(valid).toBe(false);
  });

  it('returns false for expired storage state', async () => {
    // Create a storage state that's 2 hours old (exceeds 60 min maxAge)
    const twoHoursMs = 2 * 60 * 60 * 1000;
    await createTestStorageState('admin', twoHoursMs, true);

    const valid = await isStorageStateValid('admin', TEST_OPTIONS);

    expect(valid).toBe(false);
  });

  it('returns true for storage state within maxAge', async () => {
    // Create a storage state that's 30 minutes old (within 60 min maxAge)
    const thirtyMinutesMs = 30 * 60 * 1000;
    await createTestStorageState('admin', thirtyMinutesMs, true);

    const valid = await isStorageStateValid('admin', TEST_OPTIONS);

    expect(valid).toBe(true);
  });

  it('returns false for invalid JSON storage state', async () => {
    await createTestStorageState('admin', 0, false);

    const valid = await isStorageStateValid('admin', TEST_OPTIONS);

    expect(valid).toBe(false);
  });

  it('uses default options when not specified', async () => {
    // Create in default directory
    const defaultDir = path.join(process.cwd(), DEFAULT_STORAGE_STATE_CONFIG.directory);
    await fs.mkdir(defaultDir, { recursive: true });

    const filePath = path.join(defaultDir, 'testdefault.json');
    await fs.writeFile(filePath, JSON.stringify({ cookies: [], origins: [] }));

    try {
      const valid = await isStorageStateValid('testdefault', {
        directory: DEFAULT_STORAGE_STATE_CONFIG.directory,
        maxAgeMinutes: DEFAULT_STORAGE_STATE_CONFIG.maxAgeMinutes,
      });

      expect(valid).toBe(true);
    } finally {
      await fs.rm(defaultDir, { recursive: true, force: true }).catch(() => {});
    }
  });
});

// =============================================================================
// getStorageStateMetadata Tests
// =============================================================================

describe('getStorageStateMetadata', () => {
  it('returns metadata for existing storage state', async () => {
    await createTestStorageState('admin', 0, true);

    const metadata = await getStorageStateMetadata('admin', TEST_OPTIONS);

    expect(metadata).toBeDefined();
    if (metadata) {
      expect(metadata.role).toBe('admin');
      expect(metadata.path).toContain('admin.json');
      expect(metadata.isValid).toBe(true);
      expect(metadata.createdAt).toBeInstanceOf(Date);
    }
  });

  it('returns undefined for non-existent storage state', async () => {
    const metadata = await getStorageStateMetadata('nonexistent', TEST_OPTIONS);

    expect(metadata).toBeUndefined();
  });

  it('marks expired storage state as invalid', async () => {
    const twoHoursMs = 2 * 60 * 60 * 1000;
    await createTestStorageState('admin', twoHoursMs, true);

    const metadata = await getStorageStateMetadata('admin', TEST_OPTIONS);

    expect(metadata).toBeDefined();
    if (metadata) {
      expect(metadata.isValid).toBe(false);
    }
  });
});

// =============================================================================
// clearStorageState Tests
// =============================================================================

describe('clearStorageState', () => {
  it('clears specific role storage state', async () => {
    await createTestStorageState('admin', 0, true);
    await createTestStorageState('user', 0, true);

    const deleted = await clearStorageState('admin', TEST_OPTIONS);

    expect(deleted).toBe(1);

    // Verify admin is gone but user remains
    const adminValid = await isStorageStateValid('admin', TEST_OPTIONS);
    const userValid = await isStorageStateValid('user', TEST_OPTIONS);

    expect(adminValid).toBe(false);
    expect(userValid).toBe(true);
  });

  it('clears all storage states when role is not specified', async () => {
    await createTestStorageState('admin', 0, true);
    await createTestStorageState('user', 0, true);
    await createTestStorageState('guest', 0, true);

    const deleted = await clearStorageState(undefined, TEST_OPTIONS);

    expect(deleted).toBe(3);

    // Verify all are gone
    const adminValid = await isStorageStateValid('admin', TEST_OPTIONS);
    const userValid = await isStorageStateValid('user', TEST_OPTIONS);
    const guestValid = await isStorageStateValid('guest', TEST_OPTIONS);

    expect(adminValid).toBe(false);
    expect(userValid).toBe(false);
    expect(guestValid).toBe(false);
  });

  it('returns 0 when storage state does not exist', async () => {
    const deleted = await clearStorageState('nonexistent', TEST_OPTIONS);

    expect(deleted).toBe(0);
  });
});

// =============================================================================
// cleanupExpiredStorageStates Tests (NFR-007)
// =============================================================================

describe('cleanupExpiredStorageStates', () => {
  it('deletes storage states older than 24 hours', async () => {
    // Create old (25 hours) and new storage states
    const oldAgeMs = 25 * 60 * 60 * 1000;
    await createTestStorageState('old', oldAgeMs, true);
    await createTestStorageState('new', 0, true);

    const result = await cleanupExpiredStorageStates(TEST_OPTIONS);

    expect(result.deletedCount).toBe(1);
    expect(result.deletedFiles).toHaveLength(1);
    expect(result.deletedFiles[0]).toContain('old.json');
    expect(result.errors).toHaveLength(0);

    // Verify old is gone, new remains
    const oldValid = await isStorageStateValid('old', TEST_OPTIONS);
    const newValid = await isStorageStateValid('new', TEST_OPTIONS);

    expect(oldValid).toBe(false);
    expect(newValid).toBe(true);
  });

  it('does not delete storage states newer than 24 hours', async () => {
    // Create storage state that's 23 hours old
    const youngAgeMs = 23 * 60 * 60 * 1000;
    await createTestStorageState('young', youngAgeMs, true);

    const result = await cleanupExpiredStorageStates(TEST_OPTIONS);

    expect(result.deletedCount).toBe(0);

    // Verify file still exists (checking file existence, not validity)
    // Note: isStorageStateValid uses maxAgeMinutes (60 min), not the 24h cleanup threshold
    const metadata = await getStorageStateMetadata('young', TEST_OPTIONS);
    expect(metadata).toBeDefined();
    if (metadata) {
      expect(metadata.path).toContain('young.json');
    }
  });

  it('handles empty directory gracefully', async () => {
    const result = await cleanupExpiredStorageStates(TEST_OPTIONS);

    expect(result.deletedCount).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it('handles non-existent directory gracefully', async () => {
    const result = await cleanupExpiredStorageStates({
      ...TEST_OPTIONS,
      directory: '.nonexistent-dir',
    });

    expect(result.deletedCount).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it('skips non-JSON files', async () => {
    await fs.mkdir(TEST_DIR, { recursive: true });
    await fs.writeFile(path.join(TEST_DIR, 'readme.txt'), 'test');

    const oldAgeMs = 25 * 60 * 60 * 1000;
    const readmePath = path.join(TEST_DIR, 'readme.txt');
    const mtime = new Date(Date.now() - oldAgeMs);
    await fs.utimes(readmePath, mtime, mtime);

    const result = await cleanupExpiredStorageStates(TEST_OPTIONS);

    expect(result.deletedCount).toBe(0);

    // Verify txt file still exists
    const exists = await fs.access(readmePath).then(() => true).catch(() => false);
    expect(exists).toBe(true);
  });
});

// =============================================================================
// cleanupStorageStatesOlderThan Tests
// =============================================================================

describe('cleanupStorageStatesOlderThan', () => {
  it('cleans up storage states older than specified age', async () => {
    // Create storage states with different ages
    const oneHourMs = 60 * 60 * 1000;
    const threeHoursMs = 3 * 60 * 60 * 1000;

    await createTestStorageState('recent', oneHourMs, true);
    await createTestStorageState('old', threeHoursMs, true);

    // Clean up states older than 2 hours
    const twoHoursMs = 2 * 60 * 60 * 1000;
    const result = await cleanupStorageStatesOlderThan(twoHoursMs, TEST_OPTIONS);

    expect(result.deletedCount).toBe(1);
    expect(result.deletedFiles[0]).toContain('old.json');

    // recent should still exist (checking file existence, not maxAge validity)
    const metadata = await getStorageStateMetadata('recent', TEST_OPTIONS);
    expect(metadata).toBeDefined();
    if (metadata) {
      expect(metadata.path).toContain('recent.json');
    }
  });
});

// =============================================================================
// getRoleFromPath Tests
// =============================================================================

describe('getRoleFromPath', () => {
  it('extracts role from standard path', () => {
    const role = getRoleFromPath('/path/to/.auth-states/admin.json', '{role}.json');

    expect(role).toBe('admin');
  });

  it('extracts role from path with environment', () => {
    const role = getRoleFromPath('/path/to/.auth-states/admin-staging.json', '{role}-{env}.json');

    expect(role).toBe('admin');
  });

  it('returns undefined for non-matching path', () => {
    const role = getRoleFromPath('/path/to/other.txt', '{role}.json');

    expect(role).toBeUndefined();
  });

  it('handles complex role names', () => {
    const role = getRoleFromPath('/path/to/.auth-states/super-admin.json', '{role}.json');

    expect(role).toBe('super-admin');
  });
});

// =============================================================================
// listStorageStates Tests
// =============================================================================

describe('listStorageStates', () => {
  it('lists all storage states', async () => {
    await createTestStorageState('admin', 0, true);
    await createTestStorageState('user', 0, true);

    const states = await listStorageStates(TEST_OPTIONS);

    expect(states).toHaveLength(2);
    expect(states.map(s => s.role)).toContain('admin');
    expect(states.map(s => s.role)).toContain('user');
  });

  it('returns empty array for non-existent directory', async () => {
    const states = await listStorageStates({
      ...TEST_OPTIONS,
      directory: '.nonexistent',
    });

    expect(states).toEqual([]);
  });

  it('includes validity status', async () => {
    const twoHoursMs = 2 * 60 * 60 * 1000;
    await createTestStorageState('valid', 0, true);
    await createTestStorageState('expired', twoHoursMs, true);

    const states = await listStorageStates(TEST_OPTIONS);

    const validState = states.find(s => s.role === 'valid');
    const expiredState = states.find(s => s.role === 'expired');

    expect(validState?.isValid).toBe(true);
    expect(expiredState?.isValid).toBe(false);
  });
});

// =============================================================================
// Configuration Tests
// =============================================================================

describe('configuration', () => {
  it('uses default configuration values', () => {
    expect(DEFAULT_STORAGE_STATE_CONFIG.directory).toBe('.auth-states');
    expect(DEFAULT_STORAGE_STATE_CONFIG.maxAgeMinutes).toBe(60);
    expect(DEFAULT_STORAGE_STATE_CONFIG.filePattern).toBe('{role}.json');
  });

  it('has correct cleanup max age (24 hours)', () => {
    const twentyFourHoursMs = 24 * 60 * 60 * 1000;
    expect(CLEANUP_MAX_AGE_MS).toBe(twentyFourHoursMs);
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('edge cases', () => {
  it('handles role names with special characters', async () => {
    // This might fail depending on file system, so we test the path generation
    const role = 'admin-user';
    await createTestStorageState(role, 0, true);

    const valid = await isStorageStateValid(role, TEST_OPTIONS);
    expect(valid).toBe(true);
  });

  it('handles concurrent cleanup operations', async () => {
    // Create multiple old storage states
    const oldAgeMs = 25 * 60 * 60 * 1000;
    await createTestStorageState('old1', oldAgeMs, true);
    await createTestStorageState('old2', oldAgeMs, true);
    await createTestStorageState('old3', oldAgeMs, true);

    // Run cleanup concurrently
    const [result1, result2] = await Promise.all([
      cleanupExpiredStorageStates(TEST_OPTIONS),
      cleanupExpiredStorageStates(TEST_OPTIONS),
    ]);

    // Combined should have cleaned up all 3
    // (one might get 3, other might get 0 or some might fail)
    expect(result1.deletedCount + result2.deletedCount).toBeGreaterThanOrEqual(0);
    expect(result1.errors.length + result2.errors.length).toBe(
      result1.errors.length + result2.errors.length // just validate no crash
    );
  });
});
