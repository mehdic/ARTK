/**
 * Tests for rollback.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import { rollback, needsRollback, createBackup, restoreFromBackup, } from '../rollback.js';
// Mock fs module
vi.mock('fs');
// Mock install-logger to avoid side effects
vi.mock('../install-logger.js', () => ({
    createInstallLogger: () => ({
        logRollbackStart: vi.fn(),
        logRollbackComplete: vi.fn(),
        error: vi.fn(),
    }),
}));
describe('rollback', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-01-19T10:00:00.000Z'));
    });
    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });
    describe('rollback function', () => {
        it('should remove vendor directories that exist', () => {
            vi.mocked(fs.existsSync).mockImplementation((p) => {
                const pathStr = String(p);
                return pathStr.includes('vendor');
            });
            const result = rollback('/test/project', 'Installation failed');
            expect(result.success).toBe(true);
            expect(fs.rmSync).toHaveBeenCalledWith(expect.stringContaining('artk-core'), { recursive: true, force: true });
        });
        it('should remove context.json if it exists', () => {
            vi.mocked(fs.existsSync).mockImplementation((p) => {
                const pathStr = String(p);
                return pathStr.includes('context.json');
            });
            const result = rollback('/test/project', 'Installation failed');
            expect(result.success).toBe(true);
            expect(fs.unlinkSync).toHaveBeenCalledWith(expect.stringContaining('context.json'));
        });
        it('should track removed directories and files', () => {
            vi.mocked(fs.existsSync).mockReturnValue(true);
            const result = rollback('/test/project', 'Installation failed');
            expect(result.removedDirectories.length).toBeGreaterThan(0);
            expect(result.removedFiles.length).toBeGreaterThan(0);
        });
        it('should not fail if directories do not exist', () => {
            vi.mocked(fs.existsSync).mockReturnValue(false);
            const result = rollback('/test/project', 'Installation failed');
            expect(result.success).toBe(true);
            expect(result.removedDirectories).toHaveLength(0);
            expect(result.removedFiles).toHaveLength(0);
        });
        it('should report errors when removal fails', () => {
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.rmSync).mockImplementation(() => {
                throw new Error('Permission denied');
            });
            const result = rollback('/test/project', 'Installation failed');
            expect(result.success).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0]).toContain('Permission denied');
        });
    });
    describe('needsRollback', () => {
        it('should return false when nothing is installed', () => {
            vi.mocked(fs.existsSync).mockReturnValue(false);
            const result = needsRollback('/test/project');
            expect(result.needed).toBe(false);
        });
        it('should return true when context exists but vendor is missing', () => {
            vi.mocked(fs.existsSync).mockImplementation((p) => {
                const pathStr = String(p);
                if (pathStr.includes('context.json'))
                    return true;
                if (pathStr.includes('vendor'))
                    return false;
                return false;
            });
            const result = needsRollback('/test/project');
            expect(result.needed).toBe(true);
            expect(result.reason).toContain('Partial installation');
        });
        it('should return true when vendor core is incomplete (missing index.js)', () => {
            vi.mocked(fs.existsSync).mockImplementation((p) => {
                const pathStr = String(p);
                // context.json exists
                if (pathStr.endsWith('context.json'))
                    return true;
                // artk-core directory exists (but not autogen path check)
                if (pathStr.endsWith('artk-core'))
                    return true;
                // artk-core-autogen directory exists
                if (pathStr.endsWith('artk-core-autogen'))
                    return true;
                // index.js is missing
                if (pathStr.endsWith('index.js'))
                    return false;
                // package.json exists in vendor
                if (pathStr.endsWith('package.json'))
                    return true;
                return false;
            });
            const result = needsRollback('/test/project');
            expect(result.needed).toBe(true);
            expect(result.reason).toContain('Incomplete');
        });
        it('should return false when installation is complete', () => {
            vi.mocked(fs.existsSync).mockImplementation((p) => {
                const pathStr = String(p);
                // All required files exist
                if (pathStr.includes('context.json'))
                    return true;
                if (pathStr.includes('artk-core'))
                    return true;
                if (pathStr.includes('artk-core-autogen'))
                    return true;
                if (pathStr.includes('index.js'))
                    return true;
                if (pathStr.includes('package.json'))
                    return true;
                return true;
            });
            const result = needsRollback('/test/project');
            expect(result.needed).toBe(false);
        });
    });
    describe('createBackup', () => {
        it('should create backup directory', () => {
            vi.mocked(fs.existsSync).mockReturnValue(false);
            createBackup('/test/project');
            expect(fs.mkdirSync).toHaveBeenCalledWith(expect.stringContaining('backups'), { recursive: true });
        });
        it('should backup context.json if it exists', () => {
            vi.mocked(fs.existsSync).mockImplementation((p) => {
                const pathStr = String(p);
                return pathStr.includes('context.json');
            });
            const result = createBackup('/test/project');
            expect(result.success).toBe(true);
            expect(fs.copyFileSync).toHaveBeenCalledWith(expect.stringContaining('context.json'), expect.stringContaining('context.json'));
        });
        it('should backup artk.config.yml if it exists', () => {
            vi.mocked(fs.existsSync).mockImplementation((p) => {
                const pathStr = String(p);
                return pathStr.includes('artk.config.yml');
            });
            const result = createBackup('/test/project');
            expect(result.success).toBe(true);
            expect(fs.copyFileSync).toHaveBeenCalledWith(expect.stringContaining('artk.config.yml'), expect.stringContaining('artk.config.yml'));
        });
        it('should return backup path on success', () => {
            vi.mocked(fs.existsSync).mockReturnValue(false);
            const result = createBackup('/test/project');
            expect(result.success).toBe(true);
            expect(result.backupPath).toContain('backups');
            expect(result.backupPath).toContain('2025-01-19');
        });
        it('should return error on failure', () => {
            vi.mocked(fs.mkdirSync).mockImplementation(() => {
                throw new Error('Permission denied');
            });
            const result = createBackup('/test/project');
            expect(result.success).toBe(false);
            expect(result.error).toContain('Permission denied');
        });
    });
    describe('restoreFromBackup', () => {
        it('should restore context.json from backup', () => {
            vi.mocked(fs.existsSync).mockImplementation((p) => {
                const pathStr = String(p);
                return pathStr.includes('context.json');
            });
            const result = restoreFromBackup('/test/project', '/backup/path');
            expect(result.success).toBe(true);
            expect(fs.copyFileSync).toHaveBeenCalledWith(expect.stringContaining('context.json'), expect.stringContaining('context.json'));
        });
        it('should restore artk.config.yml from backup', () => {
            vi.mocked(fs.existsSync).mockImplementation((p) => {
                const pathStr = String(p);
                return pathStr.includes('artk.config.yml');
            });
            const result = restoreFromBackup('/test/project', '/backup/path');
            expect(result.success).toBe(true);
            expect(fs.copyFileSync).toHaveBeenCalledWith(expect.stringContaining('artk.config.yml'), expect.stringContaining('artk.config.yml'));
        });
        it('should succeed even if backup files do not exist', () => {
            vi.mocked(fs.existsSync).mockReturnValue(false);
            const result = restoreFromBackup('/test/project', '/backup/path');
            expect(result.success).toBe(true);
        });
        it('should return error on failure', () => {
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.copyFileSync).mockImplementation(() => {
                throw new Error('Permission denied');
            });
            const result = restoreFromBackup('/test/project', '/backup/path');
            expect(result.success).toBe(false);
            expect(result.error).toContain('Permission denied');
        });
    });
});
//# sourceMappingURL=rollback.test.js.map