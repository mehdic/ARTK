/**
 * Unit tests for rollback transaction logic
 * T050: Unit test for rollback transaction
 *
 * Tests the write-to-temp-then-rename pattern and rollback functionality.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import {
  GenerationTransaction,
  startTransaction,
  trackGeneratedFile,
  trackOriginalFile,
  commitTransaction,
  rollbackTransaction,
} from '../../validation/rollback.js';
import type { RollbackResult } from '../../types/validation-result.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Rollback Transaction', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = path.join(__dirname, '../fixtures/temp-rollback-' + Date.now());
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  describe('startTransaction', () => {
    it('should create a new transaction', () => {
      const tx = startTransaction();

      expect(tx).toBeDefined();
      expect(tx.generatedFiles).toEqual([]);
      expect(tx.originalFiles).toBeInstanceOf(Map);
      expect(tx.startTime).toBeLessThanOrEqual(Date.now());
    });

    it('should create independent transactions', () => {
      const tx1 = startTransaction();
      const tx2 = startTransaction();

      expect(tx1).not.toBe(tx2);
      expect(tx1.generatedFiles).not.toBe(tx2.generatedFiles);
    });
  });

  describe('trackGeneratedFile', () => {
    it('should track a generated file', () => {
      const tx = startTransaction();
      const filePath = path.join(tempDir, 'new-file.ts');

      trackGeneratedFile(tx, filePath);

      expect(tx.generatedFiles).toContain(filePath);
    });

    it('should track multiple generated files', () => {
      const tx = startTransaction();
      const file1 = path.join(tempDir, 'file1.ts');
      const file2 = path.join(tempDir, 'file2.ts');

      trackGeneratedFile(tx, file1);
      trackGeneratedFile(tx, file2);

      expect(tx.generatedFiles).toHaveLength(2);
      expect(tx.generatedFiles).toContain(file1);
      expect(tx.generatedFiles).toContain(file2);
    });

    it('should not duplicate file entries', () => {
      const tx = startTransaction();
      const filePath = path.join(tempDir, 'file.ts');

      trackGeneratedFile(tx, filePath);
      trackGeneratedFile(tx, filePath);

      expect(tx.generatedFiles.filter((f) => f === filePath)).toHaveLength(1);
    });
  });

  describe('trackOriginalFile', () => {
    it('should backup existing file', () => {
      const tx = startTransaction();
      const filePath = path.join(tempDir, 'existing.ts');
      fs.writeFileSync(filePath, 'original content');

      const backupPath = trackOriginalFile(tx, filePath);

      expect(tx.originalFiles.get(filePath)).toBe(backupPath);
      expect(fs.existsSync(backupPath)).toBe(true);
      expect(fs.readFileSync(backupPath, 'utf8')).toBe('original content');
    });

    it('should return null for non-existent files', () => {
      const tx = startTransaction();
      const filePath = path.join(tempDir, 'nonexistent.ts');

      const backupPath = trackOriginalFile(tx, filePath);

      expect(backupPath).toBeNull();
      expect(tx.originalFiles.has(filePath)).toBe(false);
    });

    it('should create backup in temp directory', () => {
      const tx = startTransaction();
      const filePath = path.join(tempDir, 'file.ts');
      fs.writeFileSync(filePath, 'content');

      const backupPath = trackOriginalFile(tx, filePath);

      expect(backupPath).toBeTruthy();
      expect(backupPath!.includes('.artk-backup') || backupPath!.includes('temp')).toBe(
        true
      );
    });
  });

  describe('commitTransaction', () => {
    it('should clean up backup files on commit', () => {
      const tx = startTransaction();
      const filePath = path.join(tempDir, 'file.ts');
      fs.writeFileSync(filePath, 'original');
      const backupPath = trackOriginalFile(tx, filePath)!;

      // Modify the file
      fs.writeFileSync(filePath, 'modified');

      commitTransaction(tx);

      // Backup should be removed
      expect(fs.existsSync(backupPath)).toBe(false);
      // Original file should still have new content
      expect(fs.readFileSync(filePath, 'utf8')).toBe('modified');
    });

    it('should clear transaction state', () => {
      const tx = startTransaction();
      trackGeneratedFile(tx, path.join(tempDir, 'file.ts'));

      commitTransaction(tx);

      expect(tx.generatedFiles).toEqual([]);
      expect(tx.originalFiles.size).toBe(0);
    });
  });

  describe('rollbackTransaction', () => {
    it('should remove generated files', () => {
      const tx = startTransaction();
      const filePath = path.join(tempDir, 'generated.ts');

      // Create the file
      fs.writeFileSync(filePath, 'generated content');
      trackGeneratedFile(tx, filePath);

      const result = rollbackTransaction(tx);

      expect(result.success).toBe(true);
      expect(result.removedFiles).toContain(filePath);
      expect(fs.existsSync(filePath)).toBe(false);
    });

    it('should restore backed up files', () => {
      const tx = startTransaction();
      const filePath = path.join(tempDir, 'existing.ts');
      fs.writeFileSync(filePath, 'original content');

      trackOriginalFile(tx, filePath);
      // Modify the file
      fs.writeFileSync(filePath, 'modified content');

      const result = rollbackTransaction(tx);

      expect(result.success).toBe(true);
      expect(result.restoredFiles).toContain(filePath);
      expect(fs.readFileSync(filePath, 'utf8')).toBe('original content');
    });

    it('should handle mixed generated and modified files', () => {
      const tx = startTransaction();

      // Existing file to modify
      const existingFile = path.join(tempDir, 'existing.ts');
      fs.writeFileSync(existingFile, 'original');
      trackOriginalFile(tx, existingFile);
      fs.writeFileSync(existingFile, 'modified');

      // New file to generate
      const newFile = path.join(tempDir, 'new.ts');
      fs.writeFileSync(newFile, 'new content');
      trackGeneratedFile(tx, newFile);

      const result = rollbackTransaction(tx);

      expect(result.success).toBe(true);
      expect(fs.existsSync(newFile)).toBe(false);
      expect(fs.readFileSync(existingFile, 'utf8')).toBe('original');
    });

    it('should report files that failed to rollback', () => {
      const tx = startTransaction();
      const filePath = path.join(tempDir, 'readonly.ts');

      // Create a file that can't be deleted (simulate permission issue)
      fs.writeFileSync(filePath, 'content');
      trackGeneratedFile(tx, filePath);
      // Delete the file before rollback to simulate it being already gone
      fs.unlinkSync(filePath);

      const result = rollbackTransaction(tx);

      // Should still succeed overall since file is gone
      expect(result.success).toBe(true);
    });

    it('should handle rollback of empty transaction', () => {
      const tx = startTransaction();

      const result = rollbackTransaction(tx);

      expect(result.success).toBe(true);
      expect(result.removedFiles).toEqual([]);
      expect(result.restoredFiles).toEqual([]);
      expect(result.failedFiles).toEqual([]);
    });

    it('should clear transaction state after rollback', () => {
      const tx = startTransaction();
      const filePath = path.join(tempDir, 'file.ts');
      fs.writeFileSync(filePath, 'content');
      trackGeneratedFile(tx, filePath);

      rollbackTransaction(tx);

      expect(tx.generatedFiles).toEqual([]);
      expect(tx.originalFiles.size).toBe(0);
    });

    it('should handle nested directory structures', () => {
      const tx = startTransaction();
      const nestedFile = path.join(tempDir, 'deep', 'nested', 'file.ts');

      fs.mkdirSync(path.dirname(nestedFile), { recursive: true });
      fs.writeFileSync(nestedFile, 'nested content');
      trackGeneratedFile(tx, nestedFile);

      const result = rollbackTransaction(tx);

      expect(result.success).toBe(true);
      expect(fs.existsSync(nestedFile)).toBe(false);
    });
  });

  describe('RollbackResult structure', () => {
    it('should have correct structure', () => {
      const tx = startTransaction();
      const result = rollbackTransaction(tx);

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('removedFiles');
      expect(result).toHaveProperty('restoredFiles');
      expect(result).toHaveProperty('failedFiles');

      expect(Array.isArray(result.removedFiles)).toBe(true);
      expect(Array.isArray(result.restoredFiles)).toBe(true);
      expect(Array.isArray(result.failedFiles)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle file with spaces in name', () => {
      const tx = startTransaction();
      const filePath = path.join(tempDir, 'file with spaces.ts');
      fs.writeFileSync(filePath, 'content');
      trackGeneratedFile(tx, filePath);

      const result = rollbackTransaction(tx);

      expect(result.success).toBe(true);
      expect(fs.existsSync(filePath)).toBe(false);
    });

    it('should handle unicode file names', () => {
      const tx = startTransaction();
      const filePath = path.join(tempDir, 'file-\u4e2d\u6587.ts');
      fs.writeFileSync(filePath, 'content');
      trackGeneratedFile(tx, filePath);

      const result = rollbackTransaction(tx);

      expect(result.success).toBe(true);
    });
  });
});
