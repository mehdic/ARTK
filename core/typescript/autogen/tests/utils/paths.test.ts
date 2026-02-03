/**
 * Tests for path validation utilities
 *
 * @see src/utils/paths.ts
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync, symlinkSync, existsSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  validatePath,
  validatePaths,
  PathTraversalError,
} from '../../src/utils/paths.js';

describe('validatePath', () => {
  let testRoot: string;
  let realTestRoot: string;

  beforeEach(() => {
    // Create a temporary test directory
    // Use realpathSync to get the real path (handles macOS /var -> /private/var)
    const tempDir = join(tmpdir(), `paths-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
    testRoot = tempDir;
    realTestRoot = realpathSync(tempDir);
    mkdirSync(join(testRoot, 'tests'), { recursive: true });
    writeFileSync(join(testRoot, 'tests', 'login.spec.ts'), '// test file');
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testRoot)) {
      rmSync(testRoot, { recursive: true, force: true });
    }
  });

  describe('valid paths', () => {
    it('should accept relative paths within root', () => {
      const result = validatePath('tests/login.spec.ts', testRoot);
      // realpathSync resolves symlinks, so compare with realTestRoot
      expect(result).toBe(join(realTestRoot, 'tests', 'login.spec.ts'));
    });

    it('should accept paths starting with ./', () => {
      const result = validatePath('./tests/login.spec.ts', testRoot);
      expect(result).toBe(join(realTestRoot, 'tests', 'login.spec.ts'));
    });

    it('should accept absolute paths within root', () => {
      const absolutePath = join(testRoot, 'tests', 'login.spec.ts');
      const result = validatePath(absolutePath, testRoot);
      // Result is the realpath-resolved version
      expect(result).toBe(join(realTestRoot, 'tests', 'login.spec.ts'));
    });

    it('should accept paths to non-existent files within root', () => {
      // File doesn't exist but path is within root - should work
      // Note: parent directory (tests/) exists, so this path should be valid
      const result = validatePath('tests/new-file.spec.ts', testRoot);
      // For non-existent files, the parent must exist for realpath to work
      expect(result).toContain('tests');
      expect(result).toContain('new-file.spec.ts');
    });

    it('should accept nested paths within root', () => {
      mkdirSync(join(testRoot, 'tests', 'e2e', 'auth'), { recursive: true });
      writeFileSync(join(testRoot, 'tests', 'e2e', 'auth', 'login.spec.ts'), '// test');
      const result = validatePath('tests/e2e/auth/login.spec.ts', testRoot);
      expect(result).toBe(join(realTestRoot, 'tests', 'e2e', 'auth', 'login.spec.ts'));
    });
  });

  describe('path traversal attacks', () => {
    it('should reject paths with ../', () => {
      expect(() => validatePath('../../../etc/passwd', testRoot))
        .toThrow(PathTraversalError);
    });

    it('should reject paths escaping via ../..', () => {
      expect(() => validatePath('tests/../../secret.txt', testRoot))
        .toThrow(PathTraversalError);
    });

    it('should reject absolute paths outside root', () => {
      expect(() => validatePath('/etc/passwd', testRoot))
        .toThrow(PathTraversalError);
    });

    it('should reject paths escaping via encoded characters', () => {
      // While validatePath uses resolve, it should still catch escapes
      expect(() => validatePath('tests/../../../etc/passwd', testRoot))
        .toThrow(PathTraversalError);
    });

    it('should provide descriptive error message', () => {
      try {
        validatePath('../../../etc/passwd', testRoot);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(PathTraversalError);
        const pathError = error as PathTraversalError;
        expect(pathError.message).toContain('Path traversal detected');
        expect(pathError.userPath).toBe('../../../etc/passwd');
        expect(pathError.allowedRoot).toBe(testRoot);
      }
    });
  });

  describe('symlink handling', () => {
    it('should reject symlinks pointing outside root', () => {
      // Create a symlink inside the test root that points outside
      const symlinkPath = join(testRoot, 'tests', 'bad-link');
      try {
        symlinkSync('/etc', symlinkPath);
        expect(() => validatePath('tests/bad-link/passwd', testRoot))
          .toThrow(PathTraversalError);
      } catch (err) {
        // Skip if symlink creation fails (e.g., Windows without admin)
        if ((err as NodeJS.ErrnoException).code !== 'EPERM') {
          throw err;
        }
      }
    });

    it('should accept symlinks within root', () => {
      // Create a symlink inside the test root that points to another dir inside root
      mkdirSync(join(testRoot, 'src'), { recursive: true });
      writeFileSync(join(testRoot, 'src', 'index.ts'), '// source');
      const symlinkPath = join(testRoot, 'tests', 'src-link');
      try {
        symlinkSync(join(testRoot, 'src'), symlinkPath);
        const result = validatePath('tests/src-link/index.ts', testRoot);
        // Result should resolve to the real path (src/index.ts)
        expect(result).toBe(join(realTestRoot, 'src', 'index.ts'));
      } catch (err) {
        // Skip if symlink creation fails (e.g., Windows without admin)
        if ((err as NodeJS.ErrnoException).code !== 'EPERM') {
          throw err;
        }
      }
    });
  });

  describe('edge cases', () => {
    it('should reject empty paths', () => {
      expect(() => validatePath('', testRoot))
        .toThrow(PathTraversalError);
    });

    it('should reject whitespace-only paths', () => {
      expect(() => validatePath('   ', testRoot))
        .toThrow(PathTraversalError);
    });

    it('should handle paths with spaces', () => {
      mkdirSync(join(testRoot, 'tests with spaces'), { recursive: true });
      writeFileSync(join(testRoot, 'tests with spaces', 'file.ts'), '// test');
      const result = validatePath('tests with spaces/file.ts', testRoot);
      expect(result).toBe(join(realTestRoot, 'tests with spaces', 'file.ts'));
    });

    it('should handle paths with special characters', () => {
      const dirName = 'tests-[special]_chars';
      mkdirSync(join(testRoot, dirName), { recursive: true });
      writeFileSync(join(testRoot, dirName, 'test.ts'), '// test');
      const result = validatePath(`${dirName}/test.ts`, testRoot);
      expect(result).toBe(join(realTestRoot, dirName, 'test.ts'));
    });

    it('should handle root path correctly', () => {
      const result = validatePath('.', testRoot);
      expect(result).toBe(realTestRoot);
    });
  });

  describe('security: dangerous character injection', () => {
    it('should reject paths with null bytes', () => {
      expect(() => validatePath('tests/file.ts\0../../etc/passwd', testRoot))
        .toThrow(PathTraversalError);
    });

    it('should reject paths with embedded null bytes', () => {
      expect(() => validatePath('tests\0/secret.ts', testRoot))
        .toThrow(PathTraversalError);
    });

    it('should reject paths with newlines', () => {
      expect(() => validatePath('tests/file.ts\n../../etc/passwd', testRoot))
        .toThrow(PathTraversalError);
    });

    it('should reject paths with carriage returns', () => {
      expect(() => validatePath('tests/file.ts\r../../etc/passwd', testRoot))
        .toThrow(PathTraversalError);
    });
  });

  describe('security: Windows-specific attacks', () => {
    it('should reject Windows Alternate Data Streams on Windows', () => {
      // Only test on Windows or simulate
      if (process.platform === 'win32') {
        expect(() => validatePath('tests/file.ts:Zone.Identifier', testRoot))
          .toThrow(PathTraversalError);
        expect(() => validatePath('tests/file.ts::$DATA', testRoot))
          .toThrow(PathTraversalError);
      }
    });

    it('should reject UNC paths on Windows', () => {
      if (process.platform === 'win32') {
        expect(() => validatePath('\\\\server\\share\\file.ts', testRoot))
          .toThrow(PathTraversalError);
        expect(() => validatePath('//server/share/file.ts', testRoot))
          .toThrow(PathTraversalError);
      }
    });

    it('should allow normal Windows drive paths on Windows', () => {
      // On Windows, C:\path is valid if within root
      // This test just ensures we don't over-block
      if (process.platform === 'win32') {
        // Create path within testRoot using absolute Windows path
        const absolutePath = join(testRoot, 'tests', 'login.spec.ts');
        // Should not throw (assuming testRoot is on a valid drive)
        expect(() => validatePath(absolutePath, testRoot)).not.toThrow();
      }
    });

    it('should reject Windows reserved device names on Windows', () => {
      if (process.platform === 'win32') {
        // Basic reserved names
        expect(() => validatePath('CON', testRoot)).toThrow(PathTraversalError);
        expect(() => validatePath('PRN', testRoot)).toThrow(PathTraversalError);
        expect(() => validatePath('AUX', testRoot)).toThrow(PathTraversalError);
        expect(() => validatePath('NUL', testRoot)).toThrow(PathTraversalError);

        // COM and LPT ports
        expect(() => validatePath('COM1', testRoot)).toThrow(PathTraversalError);
        expect(() => validatePath('LPT1', testRoot)).toThrow(PathTraversalError);

        // With extensions (still reserved)
        expect(() => validatePath('CON.txt', testRoot)).toThrow(PathTraversalError);
        expect(() => validatePath('tests/NUL.ts', testRoot)).toThrow(PathTraversalError);

        // Case insensitive
        expect(() => validatePath('con', testRoot)).toThrow(PathTraversalError);
        expect(() => validatePath('Com1', testRoot)).toThrow(PathTraversalError);
      }
    });

    it('should allow normal filenames that contain reserved name substrings on Windows', () => {
      if (process.platform === 'win32') {
        // These should NOT be blocked - they contain reserved names as substrings
        // but are not the reserved names themselves
        mkdirSync(join(testRoot, 'CONSOLE'), { recursive: true });
        writeFileSync(join(testRoot, 'CONSOLE', 'test.ts'), '// test');
        expect(() => validatePath('CONSOLE/test.ts', testRoot)).not.toThrow();
      }
    });
  });
});

describe('validatePaths', () => {
  let testRoot: string;
  let realTestRoot: string;

  beforeEach(() => {
    const tempDir = join(tmpdir(), `paths-test-batch-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
    testRoot = tempDir;
    realTestRoot = realpathSync(tempDir);
    mkdirSync(join(testRoot, 'tests'), { recursive: true });
    writeFileSync(join(testRoot, 'tests', 'a.spec.ts'), '// a');
    writeFileSync(join(testRoot, 'tests', 'b.spec.ts'), '// b');
    writeFileSync(join(testRoot, 'tests', 'c.spec.ts'), '// c');
  });

  afterEach(() => {
    if (existsSync(testRoot)) {
      rmSync(testRoot, { recursive: true, force: true });
    }
  });

  it('should validate multiple paths', () => {
    const paths = [
      'tests/a.spec.ts',
      'tests/b.spec.ts',
      'tests/c.spec.ts',
    ];
    const validated = validatePaths(paths, testRoot);
    expect(validated).toHaveLength(3);
    expect(validated).toEqual([
      join(realTestRoot, 'tests', 'a.spec.ts'),
      join(realTestRoot, 'tests', 'b.spec.ts'),
      join(realTestRoot, 'tests', 'c.spec.ts'),
    ]);
  });

  it('should filter out invalid paths', () => {
    const paths = [
      'tests/a.spec.ts',
      '../../../etc/passwd',  // Invalid
      'tests/b.spec.ts',
    ];
    const validated = validatePaths(paths, testRoot);
    expect(validated).toHaveLength(2);
    expect(validated).toEqual([
      join(realTestRoot, 'tests', 'a.spec.ts'),
      join(realTestRoot, 'tests', 'b.spec.ts'),
    ]);
  });

  it('should call onInvalid callback for invalid paths', () => {
    const invalidPaths: string[] = [];
    const paths = [
      'tests/a.spec.ts',
      '../../../etc/passwd',
      '/etc/shadow',
    ];
    validatePaths(paths, testRoot, (path) => {
      invalidPaths.push(path);
    });
    expect(invalidPaths).toEqual(['../../../etc/passwd', '/etc/shadow']);
  });

  it('should return empty array if all paths are invalid', () => {
    const paths = [
      '../../../etc/passwd',
      '/etc/shadow',
    ];
    const validated = validatePaths(paths, testRoot);
    expect(validated).toHaveLength(0);
  });
});
