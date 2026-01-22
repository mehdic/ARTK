/**
 * Tests for install-logger.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import { InstallLogger, createInstallLogger } from '../install-logger.js';
// Mock fs module
vi.mock('fs');
describe('install-logger', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-01-19T10:00:00.000Z'));
    });
    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });
    describe('InstallLogger', () => {
        describe('info', () => {
            it('should write INFO log entry', () => {
                vi.mocked(fs.existsSync).mockReturnValue(true);
                vi.mocked(fs.statSync).mockReturnValue({ size: 100 });
                const logger = new InstallLogger('/test/project');
                logger.info('install', 'Test message');
                expect(fs.appendFileSync).toHaveBeenCalledWith(expect.stringContaining('install.log'), expect.stringContaining('"level":"INFO"'), 'utf-8');
                expect(fs.appendFileSync).toHaveBeenCalledWith(expect.any(String), expect.stringContaining('"operation":"install"'), expect.any(String));
                expect(fs.appendFileSync).toHaveBeenCalledWith(expect.any(String), expect.stringContaining('"message":"Test message"'), expect.any(String));
            });
            it('should include details when provided', () => {
                vi.mocked(fs.existsSync).mockReturnValue(true);
                vi.mocked(fs.statSync).mockReturnValue({ size: 100 });
                const logger = new InstallLogger('/test/project');
                logger.info('install', 'Test message', { key: 'value' });
                expect(fs.appendFileSync).toHaveBeenCalledWith(expect.any(String), expect.stringContaining('"details":{"key":"value"}'), expect.any(String));
            });
        });
        describe('warn', () => {
            it('should write WARN log entry', () => {
                vi.mocked(fs.existsSync).mockReturnValue(true);
                vi.mocked(fs.statSync).mockReturnValue({ size: 100 });
                const logger = new InstallLogger('/test/project');
                logger.warn('rollback', 'Warning message');
                expect(fs.appendFileSync).toHaveBeenCalledWith(expect.any(String), expect.stringContaining('"level":"WARN"'), expect.any(String));
            });
        });
        describe('error', () => {
            it('should write ERROR log entry', () => {
                vi.mocked(fs.existsSync).mockReturnValue(true);
                vi.mocked(fs.statSync).mockReturnValue({ size: 100 });
                const logger = new InstallLogger('/test/project');
                logger.error('install', 'Error message');
                expect(fs.appendFileSync).toHaveBeenCalledWith(expect.any(String), expect.stringContaining('"level":"ERROR"'), expect.any(String));
            });
        });
        describe('logInstallStart', () => {
            it('should log installation start with variant and node version', () => {
                vi.mocked(fs.existsSync).mockReturnValue(true);
                vi.mocked(fs.statSync).mockReturnValue({ size: 100 });
                const logger = new InstallLogger('/test/project');
                logger.logInstallStart('modern-esm', 20);
                expect(fs.appendFileSync).toHaveBeenCalledWith(expect.any(String), expect.stringContaining('Starting ARTK installation'), expect.any(String));
                expect(fs.appendFileSync).toHaveBeenCalledWith(expect.any(String), expect.stringContaining('"variant":"modern-esm"'), expect.any(String));
                expect(fs.appendFileSync).toHaveBeenCalledWith(expect.any(String), expect.stringContaining('"nodeVersion":20'), expect.any(String));
            });
        });
        describe('logInstallComplete', () => {
            it('should log installation completion', () => {
                vi.mocked(fs.existsSync).mockReturnValue(true);
                vi.mocked(fs.statSync).mockReturnValue({ size: 100 });
                const logger = new InstallLogger('/test/project');
                logger.logInstallComplete('modern-esm');
                expect(fs.appendFileSync).toHaveBeenCalledWith(expect.any(String), expect.stringContaining('installation completed successfully'), expect.any(String));
            });
        });
        describe('logInstallFailed', () => {
            it('should log installation failure', () => {
                vi.mocked(fs.existsSync).mockReturnValue(true);
                vi.mocked(fs.statSync).mockReturnValue({ size: 100 });
                const logger = new InstallLogger('/test/project');
                logger.logInstallFailed('Permission denied', 'modern-esm');
                expect(fs.appendFileSync).toHaveBeenCalledWith(expect.any(String), expect.stringContaining('"level":"ERROR"'), expect.any(String));
                expect(fs.appendFileSync).toHaveBeenCalledWith(expect.any(String), expect.stringContaining('installation failed'), expect.any(String));
            });
        });
        describe('logDetection', () => {
            it('should log detection results', () => {
                vi.mocked(fs.existsSync).mockReturnValue(true);
                vi.mocked(fs.statSync).mockReturnValue({ size: 100 });
                const logger = new InstallLogger('/test/project');
                logger.logDetection(20, 'esm', 'modern-esm');
                expect(fs.appendFileSync).toHaveBeenCalledWith(expect.any(String), expect.stringContaining('Environment detected'), expect.any(String));
            });
        });
        describe('logRollbackStart', () => {
            it('should log rollback start with reason', () => {
                vi.mocked(fs.existsSync).mockReturnValue(true);
                vi.mocked(fs.statSync).mockReturnValue({ size: 100 });
                const logger = new InstallLogger('/test/project');
                logger.logRollbackStart('Installation failed');
                expect(fs.appendFileSync).toHaveBeenCalledWith(expect.any(String), expect.stringContaining('"level":"WARN"'), expect.any(String));
                expect(fs.appendFileSync).toHaveBeenCalledWith(expect.any(String), expect.stringContaining('Starting rollback'), expect.any(String));
            });
        });
        describe('logUpgradeStart', () => {
            it('should log upgrade start', () => {
                vi.mocked(fs.existsSync).mockReturnValue(true);
                vi.mocked(fs.statSync).mockReturnValue({ size: 100 });
                const logger = new InstallLogger('/test/project');
                logger.logUpgradeStart('legacy-16', 'modern-esm');
                expect(fs.appendFileSync).toHaveBeenCalledWith(expect.any(String), expect.stringContaining('Starting variant upgrade'), expect.any(String));
            });
        });
        describe('readRecent', () => {
            it('should return empty array when log does not exist', () => {
                vi.mocked(fs.existsSync).mockReturnValue(false);
                const logger = new InstallLogger('/test/project');
                const entries = logger.readRecent();
                expect(entries).toEqual([]);
            });
            it('should parse and return recent log entries', () => {
                const logLines = [
                    '{"timestamp":"2025-01-19T10:00:00.000Z","level":"INFO","operation":"install","message":"Test 1"}',
                    '{"timestamp":"2025-01-19T10:01:00.000Z","level":"INFO","operation":"install","message":"Test 2"}',
                ].join('\n');
                vi.mocked(fs.existsSync).mockReturnValue(true);
                vi.mocked(fs.readFileSync).mockReturnValue(logLines);
                const logger = new InstallLogger('/test/project');
                const entries = logger.readRecent();
                expect(entries).toHaveLength(2);
                expect(entries[0].message).toBe('Test 1');
                expect(entries[1].message).toBe('Test 2');
            });
            it('should skip invalid JSON lines', () => {
                const logLines = [
                    '{"timestamp":"2025-01-19T10:00:00.000Z","level":"INFO","operation":"install","message":"Valid"}',
                    'invalid json line',
                    '{"timestamp":"2025-01-19T10:01:00.000Z","level":"INFO","operation":"install","message":"Also valid"}',
                ].join('\n');
                vi.mocked(fs.existsSync).mockReturnValue(true);
                vi.mocked(fs.readFileSync).mockReturnValue(logLines);
                const logger = new InstallLogger('/test/project');
                const entries = logger.readRecent();
                expect(entries).toHaveLength(2);
            });
            it('should limit returned entries', () => {
                const logLines = Array(100)
                    .fill(null)
                    .map((_, i) => `{"timestamp":"2025-01-19T10:00:00.000Z","level":"INFO","operation":"install","message":"Entry ${i}"}`)
                    .join('\n');
                vi.mocked(fs.existsSync).mockReturnValue(true);
                vi.mocked(fs.readFileSync).mockReturnValue(logLines);
                const logger = new InstallLogger('/test/project');
                const entries = logger.readRecent(10);
                expect(entries).toHaveLength(10);
                expect(entries[0].message).toBe('Entry 90'); // Last 10 entries
            });
        });
        describe('log rotation', () => {
            it('should create .artk directory if it does not exist', () => {
                vi.mocked(fs.existsSync).mockReturnValue(false);
                vi.mocked(fs.statSync).mockReturnValue({ size: 100 });
                const logger = new InstallLogger('/test/project');
                logger.info('install', 'Test');
                expect(fs.mkdirSync).toHaveBeenCalledWith(expect.stringContaining('.artk'), { recursive: true });
            });
            it('should rotate log when size exceeds 10MB', () => {
                vi.mocked(fs.existsSync).mockReturnValue(true);
                vi.mocked(fs.statSync).mockReturnValue({
                    size: 11 * 1024 * 1024, // 11MB
                });
                const logger = new InstallLogger('/test/project');
                logger.info('install', 'Test');
                expect(fs.renameSync).toHaveBeenCalled();
            });
            it('should not rotate log when size is below 10MB', () => {
                vi.mocked(fs.existsSync).mockReturnValue(true);
                vi.mocked(fs.statSync).mockReturnValue({
                    size: 5 * 1024 * 1024, // 5MB
                });
                const logger = new InstallLogger('/test/project');
                logger.info('install', 'Test');
                expect(fs.renameSync).not.toHaveBeenCalled();
            });
        });
        describe('getLogPath', () => {
            it('should return the correct log path', () => {
                const logger = new InstallLogger('/test/project');
                const logPath = logger.getLogPath();
                expect(logPath).toContain('.artk');
                expect(logPath).toContain('install.log');
            });
        });
        describe('exists', () => {
            it('should return true when log file exists', () => {
                vi.mocked(fs.existsSync).mockReturnValue(true);
                const logger = new InstallLogger('/test/project');
                expect(logger.exists()).toBe(true);
            });
            it('should return false when log file does not exist', () => {
                vi.mocked(fs.existsSync).mockReturnValue(false);
                const logger = new InstallLogger('/test/project');
                expect(logger.exists()).toBe(false);
            });
        });
    });
    describe('createInstallLogger', () => {
        it('should return an InstallLogger instance', () => {
            const logger = createInstallLogger('/test/project');
            expect(logger).toBeInstanceOf(InstallLogger);
        });
    });
});
//# sourceMappingURL=install-logger.test.js.map