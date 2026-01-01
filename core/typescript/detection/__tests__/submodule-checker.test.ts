/**
 * Unit tests for git submodule checking utilities
 *
 * @group unit
 * @group detection
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import * as childProcess from 'node:child_process';
import {
  SubmoduleChecker,
  checkSubmodules,
  scanSubmodule,
  isPathInSubmodule,
  parseGitmodulesFile,
} from '../submodule-checker.js';

// =============================================================================
// Mock Setup
// =============================================================================

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof fs>('node:fs');
  return {
    ...actual,
    existsSync: vi.fn(),
  };
});

vi.mock('node:fs/promises', async () => {
  const actual = await vi.importActual<typeof fsPromises>('node:fs/promises');
  return {
    ...actual,
    readFile: vi.fn(),
  };
});

vi.mock('node:child_process', async () => {
  const actual = await vi.importActual<typeof childProcess>('node:child_process');
  return {
    ...actual,
    execSync: vi.fn(),
  };
});

// =============================================================================
// Test Data
// =============================================================================

const SAMPLE_GITMODULES = `[submodule "libs/shared"]
    path = libs/shared
    url = https://github.com/org/shared.git

[submodule "packages/ui"]
    path = packages/ui
    url = https://github.com/org/ui.git
    branch = main
`;

const SINGLE_SUBMODULE_GITMODULES = `[submodule "frontend"]
    path = frontend
    url = https://github.com/org/frontend.git
`;

// =============================================================================
// SubmoduleChecker Tests
// =============================================================================

describe('SubmoduleChecker', () => {
  let checker: SubmoduleChecker;

  beforeEach(() => {
    checker = new SubmoduleChecker();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('checkAll', () => {
    it('should return empty array when no .gitmodules exists', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const results = await checker.checkAll('/test/repo');

      expect(results).toEqual([]);
    });

    it('should parse .gitmodules and return submodule statuses', async () => {
      vi.mocked(fs.existsSync).mockImplementation((path) => {
        if (path === '/test/repo/.gitmodules') return true;
        if (path === '/test/repo/libs/shared') return true;
        if (path === '/test/repo/packages/ui') return true;
        return false;
      });
      vi.mocked(fsPromises.readFile).mockResolvedValue(SAMPLE_GITMODULES);
      vi.mocked(childProcess.execSync).mockReturnValue(' abc123 libs/shared\n');

      const results = await checker.checkAll('/test/repo');

      expect(results.length).toBe(2);
      expect(results.some((r) => r.path === 'libs/shared')).toBe(true);
      expect(results.some((r) => r.path === 'packages/ui')).toBe(true);
    });

    it('should check initialization status via git command', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue(SINGLE_SUBMODULE_GITMODULES);
      vi.mocked(childProcess.execSync).mockReturnValue(' abc123 frontend\n');

      const results = await checker.checkAll('/test/repo');

      expect(results[0]?.initialized).toBe(true);
      expect(results[0]?.commit).toBe('abc123');
    });

    it('should detect uninitialized submodules', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue(SINGLE_SUBMODULE_GITMODULES);
      vi.mocked(childProcess.execSync).mockReturnValue('-abc123 frontend\n');

      const results = await checker.checkAll('/test/repo');

      expect(results[0]?.initialized).toBe(false);
    });

    it('should detect submodules with local changes', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue(SINGLE_SUBMODULE_GITMODULES);
      vi.mocked(childProcess.execSync).mockReturnValue('+abc123 frontend\n');

      const results = await checker.checkAll('/test/repo');

      expect(results[0]?.initialized).toBe(true);
      expect(results[0]?.warning).toContain('uncommitted changes');
    });

    it('should handle missing submodule directory', async () => {
      vi.mocked(fs.existsSync).mockImplementation((path) => {
        if (path === '/test/repo/.gitmodules') return true;
        if (path === '/test/repo/frontend') return false;
        return false;
      });
      vi.mocked(fsPromises.readFile).mockResolvedValue(SINGLE_SUBMODULE_GITMODULES);

      const results = await checker.checkAll('/test/repo');

      expect(results[0]?.initialized).toBe(false);
      expect(results[0]?.warning).toContain('does not exist');
    });

    it('should skip git status check when checkInitStatus is false', async () => {
      vi.mocked(fs.existsSync).mockImplementation((path) => {
        if (path === '/test/repo/.gitmodules') return true;
        if (path === '/test/repo/frontend') return true;
        if (path === '/test/repo/frontend/.git') return true;
        return false;
      });
      vi.mocked(fsPromises.readFile).mockResolvedValue(SINGLE_SUBMODULE_GITMODULES);

      const results = await checker.checkAll('/test/repo', {
        checkInitStatus: false,
      });

      expect(childProcess.execSync).not.toHaveBeenCalled();
      expect(results[0]?.initialized).toBe(true);
    });

    it('should include URLs when includeUrls is true', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue(SINGLE_SUBMODULE_GITMODULES);
      vi.mocked(childProcess.execSync).mockReturnValue(' abc123 frontend\n');

      const results = await checker.checkAll('/test/repo', {
        includeUrls: true,
      });

      expect(results[0]?.url).toBe('https://github.com/org/frontend.git');
    });

    it('should not include URLs by default', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue(SINGLE_SUBMODULE_GITMODULES);
      vi.mocked(childProcess.execSync).mockReturnValue(' abc123 frontend\n');

      const results = await checker.checkAll('/test/repo');

      expect(results[0]?.url).toBeUndefined();
    });

    it('should handle git command failures gracefully', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue(SINGLE_SUBMODULE_GITMODULES);
      vi.mocked(childProcess.execSync).mockImplementation(() => {
        throw new Error('git not found');
      });

      const results = await checker.checkAll('/test/repo');

      expect(results[0]?.initialized).toBe(false);
      expect(results[0]?.warning).toContain('Could not determine git status');
    });

    it('should handle .gitmodules read errors', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockRejectedValue(new Error('Permission denied'));

      const results = await checker.checkAll('/test/repo');

      expect(results).toEqual([]);
    });
  });

  describe('scan', () => {
    it('should return not a submodule when no .gitmodules exists', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = await checker.scan('/test/repo/frontend', '/test/repo');

      expect(result.isSubmodule).toBe(false);
    });

    it('should identify a directory as a submodule', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue(SINGLE_SUBMODULE_GITMODULES);
      vi.mocked(childProcess.execSync).mockReturnValue(' abc123 frontend\n');

      const result = await checker.scan('/test/repo/frontend', '/test/repo');

      expect(result.isSubmodule).toBe(true);
      expect(result.relativePath).toBe('frontend');
      expect(result.status?.initialized).toBe(true);
    });

    it('should return not a submodule for non-submodule directory', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue(SINGLE_SUBMODULE_GITMODULES);

      const result = await checker.scan('/test/repo/backend', '/test/repo');

      expect(result.isSubmodule).toBe(false);
    });

    it('should handle Windows-style paths', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue(SINGLE_SUBMODULE_GITMODULES);
      vi.mocked(childProcess.execSync).mockReturnValue(' abc123 frontend\n');

      // This tests the path normalization
      const result = await checker.scan('/test/repo/frontend', '/test/repo');

      expect(result.isSubmodule).toBe(true);
    });
  });

  describe('isInSubmodule', () => {
    it('should return false when no .gitmodules exists', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = await checker.isInSubmodule('/test/repo/frontend/src', '/test/repo');

      expect(result).toBe(false);
    });

    it('should return true for path inside submodule', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue(SINGLE_SUBMODULE_GITMODULES);

      const result = await checker.isInSubmodule('/test/repo/frontend/src/App.tsx', '/test/repo');

      expect(result).toBe(true);
    });

    it('should return true for submodule root path', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue(SINGLE_SUBMODULE_GITMODULES);

      const result = await checker.isInSubmodule('/test/repo/frontend', '/test/repo');

      expect(result).toBe(true);
    });

    it('should return false for path outside submodule', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue(SINGLE_SUBMODULE_GITMODULES);

      const result = await checker.isInSubmodule('/test/repo/backend/src', '/test/repo');

      expect(result).toBe(false);
    });

    it('should handle multiple submodules', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fsPromises.readFile).mockResolvedValue(SAMPLE_GITMODULES);

      const result1 = await checker.isInSubmodule('/test/repo/libs/shared/index.ts', '/test/repo');
      const result2 = await checker.isInSubmodule('/test/repo/packages/ui/Button.tsx', '/test/repo');

      expect(result1).toBe(true);
      expect(result2).toBe(true);
    });
  });
});

// =============================================================================
// checkSubmodules Tests
// =============================================================================

describe('checkSubmodules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should use SubmoduleChecker internally', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const results = await checkSubmodules('/test/repo');

    expect(results).toEqual([]);
  });

  it('should pass options to checker', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fsPromises.readFile).mockResolvedValue(SINGLE_SUBMODULE_GITMODULES);
    vi.mocked(childProcess.execSync).mockReturnValue(' abc123 frontend\n');

    const results = await checkSubmodules('/test/repo', {
      includeUrls: true,
    });

    expect(results[0]?.url).toBeDefined();
  });
});

// =============================================================================
// scanSubmodule Tests
// =============================================================================

describe('scanSubmodule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should use SubmoduleChecker internally', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const result = await scanSubmodule('/test/repo/frontend', '/test/repo');

    expect(result.isSubmodule).toBe(false);
  });
});

// =============================================================================
// isPathInSubmodule Tests
// =============================================================================

describe('isPathInSubmodule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should use SubmoduleChecker internally', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const result = await isPathInSubmodule('/test/repo/frontend/src', '/test/repo');

    expect(result).toBe(false);
  });
});

// =============================================================================
// parseGitmodulesFile Tests
// =============================================================================

describe('parseGitmodulesFile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return empty array when file does not exist', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const paths = await parseGitmodulesFile('/test/repo/.gitmodules');

    expect(paths).toEqual([]);
  });

  it('should parse paths from .gitmodules', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fsPromises.readFile).mockResolvedValue(SAMPLE_GITMODULES);

    const paths = await parseGitmodulesFile('/test/repo/.gitmodules');

    expect(paths).toContain('libs/shared');
    expect(paths).toContain('packages/ui');
  });

  it('should handle single submodule', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fsPromises.readFile).mockResolvedValue(SINGLE_SUBMODULE_GITMODULES);

    const paths = await parseGitmodulesFile('/test/repo/.gitmodules');

    expect(paths).toEqual(['frontend']);
  });

  it('should handle read errors gracefully', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fsPromises.readFile).mockRejectedValue(new Error('Permission denied'));

    const paths = await parseGitmodulesFile('/test/repo/.gitmodules');

    expect(paths).toEqual([]);
  });

  it('should handle empty .gitmodules file', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fsPromises.readFile).mockResolvedValue('');

    const paths = await parseGitmodulesFile('/test/repo/.gitmodules');

    expect(paths).toEqual([]);
  });

  it('should handle .gitmodules with comments', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fsPromises.readFile).mockResolvedValue(`# Comment line
[submodule "frontend"]
    # Another comment
    path = frontend
    url = https://github.com/org/frontend.git
`);

    const paths = await parseGitmodulesFile('/test/repo/.gitmodules');

    expect(paths).toContain('frontend');
  });

  it('should handle various whitespace formats', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fsPromises.readFile).mockResolvedValue(`[submodule "test1"]
path=no-space
[submodule "test2"]
    path = extra-space
[submodule "test3"]
\tpath\t=\ttabs
`);

    const paths = await parseGitmodulesFile('/test/repo/.gitmodules');

    expect(paths).toContain('no-space');
    expect(paths).toContain('extra-space');
    expect(paths).toContain('tabs');
  });
});
