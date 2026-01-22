/**
 * Tests for lock-manager.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import { LockManager, createLockManager, withLock } from '../lock-manager.js';
// Mock fs module
vi.mock('fs');
describe('lock-manager', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-01-19T10:00:00.000Z'));
    });
    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });
    describe('LockManager', () => {
        describe('acquire', () => {
            it('should acquire lock when no existing lock', () => {
                vi.mocked(fs.existsSync).mockReturnValue(false);
                vi.mocked(fs.openSync).mockReturnValue(123); // mock file descriptor
                const manager = new LockManager('/test/project');
                const result = manager.acquire('install');
                expect(result.acquired).toBe(true);
                expect(result.error).toBeUndefined();
                // Now uses atomic file creation via openSync with 'wx' flag
                expect(fs.openSync).toHaveBeenCalledWith(expect.stringContaining('install.lock'), 'wx');
                expect(fs.writeSync).toHaveBeenCalledWith(123, // file descriptor
                expect.stringContaining('"pid":'), 0, 'utf-8');
                expect(fs.closeSync).toHaveBeenCalledWith(123);
            });
            it('should create .artk directory if it does not exist', () => {
                vi.mocked(fs.existsSync).mockReturnValue(false);
                vi.mocked(fs.openSync).mockReturnValue(123);
                const manager = new LockManager('/test/project');
                manager.acquire('install');
                expect(fs.mkdirSync).toHaveBeenCalledWith(expect.stringContaining('.artk'), { recursive: true });
            });
            it('should fail when lock held by another running process', () => {
                const otherPid = process.pid + 1;
                const lockData = {
                    pid: otherPid,
                    startedAt: new Date().toISOString(),
                    operation: 'install',
                };
                vi.mocked(fs.existsSync).mockReturnValue(true);
                vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(lockData));
                // Mock process.kill to indicate process is running
                const originalKill = process.kill;
                process.kill = vi.fn(() => true);
                const manager = new LockManager('/test/project');
                const result = manager.acquire('install');
                expect(result.acquired).toBe(false);
                expect(result.error).toContain('Another install operation is in progress');
                expect(result.error).toContain(String(otherPid));
                process.kill = originalKill;
            });
            it('should acquire lock when existing lock is stale (process dead)', () => {
                const deadPid = 99999;
                const lockData = {
                    pid: deadPid,
                    startedAt: new Date().toISOString(),
                    operation: 'install',
                };
                vi.mocked(fs.existsSync).mockReturnValue(true);
                vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(lockData));
                vi.mocked(fs.openSync).mockReturnValue(123); // Mock successful atomic file creation
                // Mock process.kill to throw (process doesn't exist)
                const originalKill = process.kill;
                process.kill = vi.fn(() => {
                    throw new Error('ESRCH');
                });
                const manager = new LockManager('/test/project');
                const result = manager.acquire('install');
                expect(result.acquired).toBe(true);
                process.kill = originalKill;
            });
            it('should acquire lock when existing lock is stale (timeout)', () => {
                const lockData = {
                    pid: process.pid + 1,
                    startedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
                    operation: 'install',
                };
                vi.mocked(fs.existsSync).mockReturnValue(true);
                vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(lockData));
                vi.mocked(fs.openSync).mockReturnValue(123); // Mock successful atomic file creation
                // Mock process.kill to indicate process is still running
                const originalKill = process.kill;
                process.kill = vi.fn(() => true);
                const manager = new LockManager('/test/project');
                const result = manager.acquire('install');
                expect(result.acquired).toBe(true);
                process.kill = originalKill;
            });
            it('should include operation type in lock file', () => {
                vi.mocked(fs.existsSync).mockReturnValue(false);
                vi.mocked(fs.openSync).mockReturnValue(123);
                const manager = new LockManager('/test/project');
                manager.acquire('upgrade');
                expect(fs.writeSync).toHaveBeenCalled();
                const writeCall = vi.mocked(fs.writeSync).mock.calls[0];
                const lockContent = writeCall[1];
                expect(lockContent).toContain('"operation": "upgrade"');
            });
        });
        describe('release', () => {
            it('should delete lock file when it exists', () => {
                vi.mocked(fs.existsSync).mockReturnValue(true);
                const manager = new LockManager('/test/project');
                manager.release();
                expect(fs.unlinkSync).toHaveBeenCalledWith(expect.stringContaining('install.lock'));
            });
            it('should not throw when lock file does not exist', () => {
                vi.mocked(fs.existsSync).mockReturnValue(false);
                const manager = new LockManager('/test/project');
                expect(() => manager.release()).not.toThrow();
            });
            it('should not throw when delete fails', () => {
                vi.mocked(fs.existsSync).mockReturnValue(true);
                vi.mocked(fs.unlinkSync).mockImplementation(() => {
                    throw new Error('Permission denied');
                });
                const manager = new LockManager('/test/project');
                expect(() => manager.release()).not.toThrow();
            });
        });
        describe('isOwnLock', () => {
            it('should return true when lock is owned by current process', () => {
                const lockData = {
                    pid: process.pid,
                    startedAt: new Date().toISOString(),
                    operation: 'install',
                };
                vi.mocked(fs.existsSync).mockReturnValue(true);
                vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(lockData));
                const manager = new LockManager('/test/project');
                expect(manager.isOwnLock()).toBe(true);
            });
            it('should return false when lock is owned by another process', () => {
                const lockData = {
                    pid: process.pid + 1,
                    startedAt: new Date().toISOString(),
                    operation: 'install',
                };
                vi.mocked(fs.existsSync).mockReturnValue(true);
                vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(lockData));
                const manager = new LockManager('/test/project');
                expect(manager.isOwnLock()).toBe(false);
            });
            it('should return false when no lock exists', () => {
                vi.mocked(fs.existsSync).mockReturnValue(false);
                const manager = new LockManager('/test/project');
                expect(manager.isOwnLock()).toBe(false);
            });
        });
        describe('isLocked', () => {
            it('should return true when valid lock exists', () => {
                const lockData = {
                    pid: process.pid,
                    startedAt: new Date().toISOString(),
                    operation: 'install',
                };
                vi.mocked(fs.existsSync).mockReturnValue(true);
                vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(lockData));
                const manager = new LockManager('/test/project');
                expect(manager.isLocked()).toBe(true);
            });
            it('should return false when no lock exists', () => {
                vi.mocked(fs.existsSync).mockReturnValue(false);
                const manager = new LockManager('/test/project');
                expect(manager.isLocked()).toBe(false);
            });
            it('should return false when lock is stale', () => {
                const lockData = {
                    pid: 99999,
                    startedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
                    operation: 'install',
                };
                vi.mocked(fs.existsSync).mockReturnValue(true);
                vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(lockData));
                // Mock process.kill to throw (process doesn't exist)
                const originalKill = process.kill;
                process.kill = vi.fn(() => {
                    throw new Error('ESRCH');
                });
                const manager = new LockManager('/test/project');
                expect(manager.isLocked()).toBe(false);
                process.kill = originalKill;
            });
        });
        describe('getLockInfo', () => {
            it('should return locked: false when no lock', () => {
                vi.mocked(fs.existsSync).mockReturnValue(false);
                const manager = new LockManager('/test/project');
                const info = manager.getLockInfo();
                expect(info.locked).toBe(false);
                expect(info.lock).toBeUndefined();
            });
            it('should return lock info when lock exists', () => {
                const lockData = {
                    pid: process.pid,
                    startedAt: new Date().toISOString(),
                    operation: 'install',
                };
                vi.mocked(fs.existsSync).mockReturnValue(true);
                vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(lockData));
                const manager = new LockManager('/test/project');
                const info = manager.getLockInfo();
                expect(info.locked).toBe(true);
                expect(info.lock).toEqual(lockData);
                expect(info.stale).toBe(false);
            });
            it('should indicate stale lock', () => {
                const lockData = {
                    pid: 99999,
                    startedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
                    operation: 'install',
                };
                vi.mocked(fs.existsSync).mockReturnValue(true);
                vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(lockData));
                // Mock process.kill to throw (process doesn't exist)
                const originalKill = process.kill;
                process.kill = vi.fn(() => {
                    throw new Error('ESRCH');
                });
                const manager = new LockManager('/test/project');
                const info = manager.getLockInfo();
                expect(info.locked).toBe(false);
                expect(info.stale).toBe(true);
                process.kill = originalKill;
            });
        });
        describe('forceRelease', () => {
            it('should delete lock file', () => {
                vi.mocked(fs.existsSync).mockReturnValue(true);
                const manager = new LockManager('/test/project');
                manager.forceRelease();
                expect(fs.unlinkSync).toHaveBeenCalled();
            });
        });
        describe('getLockPath', () => {
            it('should return correct lock path', () => {
                const manager = new LockManager('/test/project');
                const lockPath = manager.getLockPath();
                expect(lockPath).toContain('.artk');
                expect(lockPath).toContain('install.lock');
            });
        });
    });
    describe('createLockManager', () => {
        it('should return a LockManager instance', () => {
            const manager = createLockManager('/test/project');
            expect(manager).toBeInstanceOf(LockManager);
        });
    });
    describe('withLock', () => {
        it('should execute function with lock', async () => {
            // First call (checking for existing lock) returns false
            // After openSync, the lock exists, so release should find it
            let lockCreated = false;
            vi.mocked(fs.existsSync).mockImplementation(() => {
                return lockCreated;
            });
            vi.mocked(fs.openSync).mockImplementation(() => {
                lockCreated = true;
                return 123; // mock file descriptor
            });
            let executed = false;
            const result = await withLock('/test/project', 'install', async () => {
                executed = true;
                return 'result';
            });
            expect(executed).toBe(true);
            expect(result).toBe('result');
            expect(fs.openSync).toHaveBeenCalled(); // Lock acquired via atomic creation
            expect(fs.unlinkSync).toHaveBeenCalled(); // Lock released
        });
        it('should release lock on error', async () => {
            // Track lock creation state
            let lockCreated = false;
            vi.mocked(fs.existsSync).mockImplementation(() => {
                return lockCreated;
            });
            vi.mocked(fs.openSync).mockImplementation(() => {
                lockCreated = true;
                return 123;
            });
            await expect(withLock('/test/project', 'install', async () => {
                throw new Error('Test error');
            })).rejects.toThrow('Test error');
            expect(fs.unlinkSync).toHaveBeenCalled(); // Lock released
        });
        it('should throw when lock cannot be acquired', async () => {
            const otherPid = process.pid + 1;
            const lockData = {
                pid: otherPid,
                startedAt: new Date().toISOString(),
                operation: 'install',
            };
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(lockData));
            // Mock process.kill to indicate process is running
            const originalKill = process.kill;
            process.kill = vi.fn(() => true);
            await expect(withLock('/test/project', 'install', async () => 'result')).rejects.toThrow('Another install operation is in progress');
            process.kill = originalKill;
        });
    });
});
//# sourceMappingURL=lock-manager.test.js.map