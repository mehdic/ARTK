/**
 * Tests for variant-schemas.ts
 */
import { describe, it, expect } from 'vitest';
import { VariantIdSchema, ModuleSystemSchema, InstallMethodSchema, LogLevelSchema, OperationTypeSchema, LockOperationSchema, UpgradeRecordSchema, ArtkContextSchema, LockFileSchema, InstallLogEntrySchema, FeatureEntrySchema, FeatureCompatibilitySchema, DetectionResultSchema, validateContext, validateLockFile, validateFeatureCompatibility, } from '../variant-schemas.js';
describe('variant-schemas', () => {
    describe('VariantIdSchema', () => {
        it('should accept valid variant IDs', () => {
            expect(VariantIdSchema.parse('modern-esm')).toBe('modern-esm');
            expect(VariantIdSchema.parse('modern-cjs')).toBe('modern-cjs');
            expect(VariantIdSchema.parse('legacy-16')).toBe('legacy-16');
            expect(VariantIdSchema.parse('legacy-14')).toBe('legacy-14');
        });
        it('should reject invalid variant IDs', () => {
            expect(() => VariantIdSchema.parse('invalid')).toThrow();
            expect(() => VariantIdSchema.parse('')).toThrow();
        });
    });
    describe('ModuleSystemSchema', () => {
        it('should accept valid module systems', () => {
            expect(ModuleSystemSchema.parse('esm')).toBe('esm');
            expect(ModuleSystemSchema.parse('cjs')).toBe('cjs');
        });
        it('should reject invalid module systems', () => {
            expect(() => ModuleSystemSchema.parse('commonjs')).toThrow();
        });
    });
    describe('InstallMethodSchema', () => {
        it('should accept valid install methods', () => {
            expect(InstallMethodSchema.parse('cli')).toBe('cli');
            expect(InstallMethodSchema.parse('bootstrap')).toBe('bootstrap');
            expect(InstallMethodSchema.parse('manual')).toBe('manual');
        });
    });
    describe('LogLevelSchema', () => {
        it('should accept valid log levels', () => {
            expect(LogLevelSchema.parse('INFO')).toBe('INFO');
            expect(LogLevelSchema.parse('WARN')).toBe('WARN');
            expect(LogLevelSchema.parse('ERROR')).toBe('ERROR');
        });
    });
    describe('OperationTypeSchema', () => {
        it('should accept valid operation types', () => {
            expect(OperationTypeSchema.parse('install')).toBe('install');
            expect(OperationTypeSchema.parse('upgrade')).toBe('upgrade');
            expect(OperationTypeSchema.parse('rollback')).toBe('rollback');
            expect(OperationTypeSchema.parse('detect')).toBe('detect');
        });
    });
    describe('LockOperationSchema', () => {
        it('should accept valid lock operations', () => {
            expect(LockOperationSchema.parse('install')).toBe('install');
            expect(LockOperationSchema.parse('upgrade')).toBe('upgrade');
        });
        it('should reject invalid lock operations', () => {
            expect(() => LockOperationSchema.parse('rollback')).toThrow();
        });
    });
    describe('UpgradeRecordSchema', () => {
        it('should accept valid upgrade record', () => {
            const record = {
                from: 'legacy-16',
                to: 'modern-cjs',
                at: '2025-01-19T10:00:00.000Z',
            };
            expect(UpgradeRecordSchema.parse(record)).toEqual(record);
        });
        it('should reject invalid timestamps', () => {
            const record = {
                from: 'legacy-16',
                to: 'modern-cjs',
                at: 'invalid-date',
            };
            expect(() => UpgradeRecordSchema.parse(record)).toThrow();
        });
    });
    describe('ArtkContextSchema', () => {
        const validContext = {
            variant: 'modern-esm',
            variantInstalledAt: '2025-01-19T10:00:00.000Z',
            nodeVersion: 20,
            moduleSystem: 'esm',
            playwrightVersion: '1.57.x',
            artkVersion: '1.0.0',
            installMethod: 'cli',
        };
        it('should accept valid context', () => {
            expect(ArtkContextSchema.parse(validContext)).toEqual(validContext);
        });
        it('should accept context with optional fields', () => {
            const contextWithOptional = {
                ...validContext,
                overrideUsed: true,
                previousVariant: 'legacy-16',
                upgradeHistory: [
                    { from: 'legacy-16', to: 'modern-esm', at: '2025-01-19T10:00:00.000Z' },
                ],
            };
            expect(ArtkContextSchema.parse(contextWithOptional)).toEqual(contextWithOptional);
        });
        it('should reject invalid playwright version format', () => {
            const invalid = { ...validContext, playwrightVersion: '1.57.0' };
            expect(() => ArtkContextSchema.parse(invalid)).toThrow();
        });
        it('should reject node version below minimum', () => {
            const invalid = { ...validContext, nodeVersion: 10 };
            expect(() => ArtkContextSchema.parse(invalid)).toThrow();
        });
    });
    describe('LockFileSchema', () => {
        it('should accept valid lock file', () => {
            const lockFile = {
                pid: 12345,
                startedAt: '2025-01-19T10:00:00.000Z',
                operation: 'install',
            };
            expect(LockFileSchema.parse(lockFile)).toEqual(lockFile);
        });
        it('should reject non-positive PID', () => {
            const invalid = {
                pid: 0,
                startedAt: '2025-01-19T10:00:00.000Z',
                operation: 'install',
            };
            expect(() => LockFileSchema.parse(invalid)).toThrow();
        });
    });
    describe('InstallLogEntrySchema', () => {
        it('should accept valid log entry', () => {
            const entry = {
                timestamp: '2025-01-19T10:00:00.000Z',
                level: 'INFO',
                operation: 'install',
                message: 'Starting installation',
            };
            expect(InstallLogEntrySchema.parse(entry)).toEqual(entry);
        });
        it('should accept log entry with details', () => {
            const entry = {
                timestamp: '2025-01-19T10:00:00.000Z',
                level: 'ERROR',
                operation: 'install',
                message: 'Installation failed',
                details: { error: 'Permission denied', code: 'EPERM' },
            };
            expect(InstallLogEntrySchema.parse(entry)).toEqual(entry);
        });
    });
    describe('FeatureEntrySchema', () => {
        it('should accept minimal feature entry', () => {
            const entry = { available: true };
            expect(FeatureEntrySchema.parse(entry)).toEqual(entry);
        });
        it('should accept full feature entry', () => {
            const entry = {
                available: false,
                alternative: 'Use page.goto instead',
                notes: 'Not available in Playwright 1.33',
                sincePlaywright: '1.40',
            };
            expect(FeatureEntrySchema.parse(entry)).toEqual(entry);
        });
        it('should reject invalid sincePlaywright format', () => {
            const invalid = {
                available: true,
                sincePlaywright: 'v1.40', // should not have 'v' prefix
            };
            expect(() => FeatureEntrySchema.parse(invalid)).toThrow();
        });
    });
    describe('FeatureCompatibilitySchema', () => {
        const validFeatureCompat = {
            variant: 'legacy-14',
            playwrightVersion: '1.33.x',
            nodeRange: ['14', '15', '16'],
            features: {
                'page.waitForResponse': { available: true },
                'page.route': {
                    available: false,
                    alternative: 'Use page.on("request") handler',
                },
            },
        };
        it('should accept valid feature compatibility', () => {
            expect(FeatureCompatibilitySchema.parse(validFeatureCompat)).toEqual(validFeatureCompat);
        });
        it('should accept with optional fields', () => {
            const withOptional = {
                ...validFeatureCompat,
                moduleSystem: 'cjs',
                generatedAt: '2025-01-19T10:00:00.000Z',
            };
            expect(FeatureCompatibilitySchema.parse(withOptional)).toEqual(withOptional);
        });
    });
    describe('DetectionResultSchema', () => {
        it('should accept successful detection result', () => {
            const result = {
                nodeVersion: 20,
                nodeVersionFull: 'v20.10.0',
                moduleSystem: 'esm',
                selectedVariant: 'modern-esm',
                success: true,
            };
            expect(DetectionResultSchema.parse(result)).toEqual(result);
        });
        it('should accept failed detection result with error', () => {
            const result = {
                nodeVersion: 12,
                nodeVersionFull: 'v12.22.0',
                moduleSystem: 'cjs',
                selectedVariant: 'legacy-14',
                success: false,
                error: 'Node.js 12 is not supported',
            };
            expect(DetectionResultSchema.parse(result)).toEqual(result);
        });
    });
    describe('validateContext', () => {
        it('should return success for valid context', () => {
            const validContext = {
                variant: 'modern-esm',
                variantInstalledAt: '2025-01-19T10:00:00.000Z',
                nodeVersion: 20,
                moduleSystem: 'esm',
                playwrightVersion: '1.57.x',
                artkVersion: '1.0.0',
                installMethod: 'cli',
            };
            const result = validateContext(validContext);
            expect(result.success).toBe(true);
        });
        it('should return failure for invalid context', () => {
            const invalid = { variant: 'invalid' };
            const result = validateContext(invalid);
            expect(result.success).toBe(false);
        });
    });
    describe('validateLockFile', () => {
        it('should return success for valid lock file', () => {
            const lockFile = {
                pid: 12345,
                startedAt: '2025-01-19T10:00:00.000Z',
                operation: 'install',
            };
            const result = validateLockFile(lockFile);
            expect(result.success).toBe(true);
        });
        it('should return failure for invalid lock file', () => {
            const invalid = { pid: 'not-a-number' };
            const result = validateLockFile(invalid);
            expect(result.success).toBe(false);
        });
    });
    describe('validateFeatureCompatibility', () => {
        it('should return success for valid feature compatibility', () => {
            const featureCompat = {
                variant: 'modern-esm',
                playwrightVersion: '1.57.x',
                nodeRange: ['18', '20', '22'],
                features: {},
            };
            const result = validateFeatureCompatibility(featureCompat);
            expect(result.success).toBe(true);
        });
        it('should return failure for invalid feature compatibility', () => {
            const invalid = { variant: 'modern-esm' };
            const result = validateFeatureCompatibility(invalid);
            expect(result.success).toBe(false);
        });
    });
});
//# sourceMappingURL=variant-schemas.test.js.map