/**
 * Unit tests for file utility functions
 *
 * Tests:
 * - saveJSONAtomic / saveJSONAtomicSync: Atomic file writes
 * - updateJSONWithLock / updateJSONWithLockSync: Locked updates
 * - loadJSON: Safe JSON loading
 * - ensureDir: Directory creation
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  saveJSONAtomic,
  saveJSONAtomicSync,
  updateJSONWithLock,
  updateJSONWithLockSync,
  loadJSON,
  ensureDir,
  LOCK_MAX_WAIT_MS,
  STALE_LOCK_THRESHOLD_MS,
} from '../file-utils.js';

// =============================================================================
// Test Setup
// =============================================================================

function createTempDir(): string {
  const tempDir = join(tmpdir(), `llkb-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(tempDir, { recursive: true });
  return tempDir;
}

let tempDir: string;

beforeEach(() => {
  tempDir = createTempDir();
});

afterEach(() => {
  if (tempDir && existsSync(tempDir)) {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

// =============================================================================
// saveJSONAtomic Tests
// =============================================================================

describe('saveJSONAtomic', () => {
  it('writes JSON file successfully', async () => {
    const filePath = join(tempDir, 'test.json');
    const data = { name: 'test', value: 42 };

    const result = await saveJSONAtomic(filePath, data);

    expect(result.success).toBe(true);
    expect(existsSync(filePath)).toBe(true);

    const content = JSON.parse(readFileSync(filePath, 'utf-8'));
    expect(content).toEqual(data);
  });

  it('creates parent directories if needed', async () => {
    const filePath = join(tempDir, 'nested', 'deep', 'test.json');
    const data = { test: true };

    const result = await saveJSONAtomic(filePath, data);

    expect(result.success).toBe(true);
    expect(existsSync(filePath)).toBe(true);
  });

  it('formats JSON with 2-space indentation', async () => {
    const filePath = join(tempDir, 'formatted.json');
    const data = { a: 1, b: 2 };

    await saveJSONAtomic(filePath, data);

    const content = readFileSync(filePath, 'utf-8');
    expect(content).toContain('\n');
    expect(content).toContain('  ');
  });

  it('overwrites existing file', async () => {
    const filePath = join(tempDir, 'overwrite.json');

    await saveJSONAtomic(filePath, { version: 1 });
    await saveJSONAtomic(filePath, { version: 2 });

    const content = JSON.parse(readFileSync(filePath, 'utf-8'));
    expect(content.version).toBe(2);
  });

  it('cleans up temp file on failure', async () => {
    // Create a directory with the target name to cause write failure
    const filePath = join(tempDir, 'dir-conflict.json');
    mkdirSync(filePath);

    const result = await saveJSONAtomic(filePath, { test: true });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();

    // No .tmp files should be left
    const files = existsSync(tempDir) ? require('fs').readdirSync(tempDir) : [];
    const tmpFiles = files.filter((f: string) => f.endsWith('.tmp'));
    expect(tmpFiles.length).toBe(0);
  });
});

// =============================================================================
// saveJSONAtomicSync Tests
// =============================================================================

describe('saveJSONAtomicSync', () => {
  it('writes JSON file successfully', () => {
    const filePath = join(tempDir, 'sync-test.json');
    const data = { sync: true };

    const result = saveJSONAtomicSync(filePath, data);

    expect(result.success).toBe(true);
    expect(existsSync(filePath)).toBe(true);
  });

  it('creates parent directories if needed', () => {
    const filePath = join(tempDir, 'sync', 'nested', 'test.json');

    const result = saveJSONAtomicSync(filePath, { test: true });

    expect(result.success).toBe(true);
    expect(existsSync(filePath)).toBe(true);
  });

  it('returns error for invalid path', () => {
    const filePath = join(tempDir, 'dir-conflict-sync.json');
    mkdirSync(filePath);

    const result = saveJSONAtomicSync(filePath, { test: true });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

// =============================================================================
// loadJSON Tests
// =============================================================================

describe('loadJSON', () => {
  it('loads valid JSON file', () => {
    const filePath = join(tempDir, 'load.json');
    const data = { loaded: true, value: 42 };
    writeFileSync(filePath, JSON.stringify(data), 'utf-8');

    const result = loadJSON<{ loaded: boolean; value: number }>(filePath);

    expect(result).toEqual(data);
  });

  it('returns null for non-existent file', () => {
    const filePath = join(tempDir, 'nonexistent.json');

    const result = loadJSON(filePath);

    expect(result).toBeNull();
  });

  it('throws for invalid JSON', () => {
    const filePath = join(tempDir, 'invalid.json');
    writeFileSync(filePath, '{ invalid json', 'utf-8');

    expect(() => loadJSON(filePath)).toThrow(/Failed to load JSON/);
  });

  it('loads array JSON', () => {
    const filePath = join(tempDir, 'array.json');
    const data = [1, 2, 3];
    writeFileSync(filePath, JSON.stringify(data), 'utf-8');

    const result = loadJSON<number[]>(filePath);

    expect(result).toEqual(data);
  });

  it('loads nested JSON', () => {
    const filePath = join(tempDir, 'nested.json');
    const data = {
      level1: {
        level2: {
          value: 'deep',
        },
      },
    };
    writeFileSync(filePath, JSON.stringify(data), 'utf-8');

    const result = loadJSON<typeof data>(filePath);

    expect(result?.level1.level2.value).toBe('deep');
  });
});

// =============================================================================
// updateJSONWithLock Tests
// =============================================================================

describe('updateJSONWithLock', () => {
  it('updates existing file', async () => {
    const filePath = join(tempDir, 'update.json');
    writeFileSync(filePath, JSON.stringify({ count: 1 }), 'utf-8');

    const result = await updateJSONWithLock<{ count: number }>(filePath, (data) => ({
      count: data.count + 1,
    }));

    expect(result.success).toBe(true);

    const content = JSON.parse(readFileSync(filePath, 'utf-8'));
    expect(content.count).toBe(2);
  });

  it('creates file if not exists', async () => {
    const filePath = join(tempDir, 'new-update.json');

    const result = await updateJSONWithLock<{ items: string[] }>(filePath, (data) => ({
      items: [...(data.items ?? []), 'new'],
    }));

    expect(result.success).toBe(true);
    expect(existsSync(filePath)).toBe(true);
  });

  it('cleans up lock file after success', async () => {
    const filePath = join(tempDir, 'lock-cleanup.json');
    writeFileSync(filePath, JSON.stringify({ test: true }), 'utf-8');

    await updateJSONWithLock(filePath, (data) => data);

    expect(existsSync(`${filePath}.lock`)).toBe(false);
  });

  it('returns retries count', async () => {
    const filePath = join(tempDir, 'retry-count.json');
    writeFileSync(filePath, JSON.stringify({ test: true }), 'utf-8');

    const result = await updateJSONWithLock(filePath, (data) => data);

    expect(result).toHaveProperty('retriesNeeded');
    expect(typeof result.retriesNeeded).toBe('number');
  });
});

// =============================================================================
// updateJSONWithLockSync Tests
// =============================================================================

describe('updateJSONWithLockSync', () => {
  it('updates existing file', () => {
    const filePath = join(tempDir, 'sync-update.json');
    writeFileSync(filePath, JSON.stringify({ count: 5 }), 'utf-8');

    const result = updateJSONWithLockSync<{ count: number }>(filePath, (data) => ({
      count: data.count * 2,
    }));

    expect(result.success).toBe(true);

    const content = JSON.parse(readFileSync(filePath, 'utf-8'));
    expect(content.count).toBe(10);
  });

  it('handles multiple sequential updates', () => {
    const filePath = join(tempDir, 'sequential.json');
    writeFileSync(filePath, JSON.stringify({ value: 0 }), 'utf-8');

    for (let i = 0; i < 5; i++) {
      updateJSONWithLockSync<{ value: number }>(filePath, (data) => ({
        value: data.value + 1,
      }));
    }

    const content = JSON.parse(readFileSync(filePath, 'utf-8'));
    expect(content.value).toBe(5);
  });
});

// =============================================================================
// ensureDir Tests
// =============================================================================

describe('ensureDir', () => {
  it('creates directory if not exists', () => {
    const dirPath = join(tempDir, 'new-dir');

    ensureDir(dirPath);

    expect(existsSync(dirPath)).toBe(true);
  });

  it('creates nested directories', () => {
    const dirPath = join(tempDir, 'a', 'b', 'c');

    ensureDir(dirPath);

    expect(existsSync(dirPath)).toBe(true);
  });

  it('does nothing if directory exists', () => {
    const dirPath = join(tempDir, 'existing');
    mkdirSync(dirPath);

    // Should not throw
    ensureDir(dirPath);

    expect(existsSync(dirPath)).toBe(true);
  });

  it('handles path with trailing slash', () => {
    const dirPath = join(tempDir, 'trailing') + '/';

    ensureDir(dirPath);

    expect(existsSync(dirPath.slice(0, -1))).toBe(true);
  });
});

// =============================================================================
// Constants Tests
// =============================================================================

describe('Constants', () => {
  it('LOCK_MAX_WAIT_MS is reasonable', () => {
    expect(LOCK_MAX_WAIT_MS).toBeGreaterThan(0);
    expect(LOCK_MAX_WAIT_MS).toBeLessThanOrEqual(30000);
  });

  it('STALE_LOCK_THRESHOLD_MS is reasonable', () => {
    expect(STALE_LOCK_THRESHOLD_MS).toBeGreaterThan(0);
    expect(STALE_LOCK_THRESHOLD_MS).toBeLessThanOrEqual(120000);
  });
});

// =============================================================================
// Lock File Behavior Tests
// =============================================================================

describe('Lock file behavior', () => {
  it('removes stale lock files', async () => {
    const filePath = join(tempDir, 'stale-lock.json');
    const lockPath = `${filePath}.lock`;

    writeFileSync(filePath, JSON.stringify({ test: true }), 'utf-8');

    // Create a lock file and set its modification time to be very old
    // The implementation checks mtimeMs, not file content
    writeFileSync(lockPath, String(Date.now()), 'utf-8');
    const oldTime = new Date(Date.now() - STALE_LOCK_THRESHOLD_MS - 1000);
    const { utimesSync } = await import('node:fs');
    utimesSync(lockPath, oldTime, oldTime); // Set atime and mtime to old time

    // Update should succeed by removing stale lock
    const result = await updateJSONWithLock<{ test: boolean }>(filePath, (data) => ({
      test: !data.test,
    }));

    expect(result.success).toBe(true);
  });
});
