/**
 * Tests for variant-detector.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import { getNodeMajorVersion, getNodeVersionFull, detectModuleSystem, detectEnvironment, selectVariant, validateVariantCompatibility, hasExistingInstallation, readExistingContext, detectEnvironmentChange, } from '../variant-detector.js';
// Mock fs module
vi.mock('fs');
describe('variant-detector', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });
    afterEach(() => {
        vi.restoreAllMocks();
    });
    describe('getNodeMajorVersion', () => {
        it('should return the major version number', () => {
            // This tests the actual running Node version
            const version = getNodeMajorVersion();
            expect(typeof version).toBe('number');
            expect(version).toBeGreaterThanOrEqual(14);
        });
    });
    describe('getNodeVersionFull', () => {
        it('should return the full version string starting with v', () => {
            const version = getNodeVersionFull();
            expect(version).toMatch(/^v\d+\.\d+\.\d+/);
        });
    });
    describe('detectModuleSystem', () => {
        it('should return esm when package.json has type: module', () => {
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ type: 'module' }));
            const result = detectModuleSystem('/test/project');
            expect(result).toBe('esm');
        });
        it('should return cjs when package.json has type: commonjs', () => {
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ type: 'commonjs' }));
            const result = detectModuleSystem('/test/project');
            expect(result).toBe('cjs');
        });
        it('should return cjs when package.json has no type field', () => {
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ name: 'test' }));
            const result = detectModuleSystem('/test/project');
            expect(result).toBe('cjs');
        });
        it('should return cjs when package.json does not exist', () => {
            vi.mocked(fs.existsSync).mockReturnValue(false);
            const result = detectModuleSystem('/test/project');
            expect(result).toBe('cjs');
        });
        it('should return cjs when package.json is invalid JSON', () => {
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue('invalid json');
            const result = detectModuleSystem('/test/project');
            expect(result).toBe('cjs');
        });
    });
    describe('detectEnvironment', () => {
        it('should return successful detection for valid environment', () => {
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ type: 'module' }));
            const result = detectEnvironment('/test/project');
            expect(result.success).toBe(true);
            expect(typeof result.nodeVersion).toBe('number');
            expect(result.nodeVersionFull).toMatch(/^v\d+/);
            expect(['esm', 'cjs']).toContain(result.moduleSystem);
            expect([
                'modern-esm',
                'modern-cjs',
                'legacy-16',
                'legacy-14',
            ]).toContain(result.selectedVariant);
        });
        it('should detect module system from package.json', () => {
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ type: 'module' }));
            const result = detectEnvironment('/test/project');
            expect(result.moduleSystem).toBe('esm');
        });
    });
    describe('selectVariant', () => {
        it('should use auto-detected variant when no override', () => {
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ type: 'module' }));
            const result = selectVariant({
                targetPath: '/test/project',
            });
            expect(result.success).toBe(true);
            expect(result.selectedVariant).toBeDefined();
        });
        it('should use override variant when specified and compatible', () => {
            vi.mocked(fs.existsSync).mockReturnValue(false);
            const result = selectVariant({
                targetPath: '/test/project',
                overrideVariant: 'modern-cjs',
            });
            // Whether this succeeds depends on the actual Node version
            const nodeVersion = getNodeMajorVersion();
            if (nodeVersion >= 18) {
                expect(result.selectedVariant).toBe('modern-cjs');
            }
        });
    });
    describe('validateVariantCompatibility', () => {
        it('should return valid for compatible variant and node version', () => {
            const result = validateVariantCompatibility('modern-esm', 20);
            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
        });
        it('should return invalid for incompatible variant and node version', () => {
            const result = validateVariantCompatibility('modern-esm', 14);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('requires Node.js');
        });
        it('should use current node version when not specified', () => {
            const result = validateVariantCompatibility('modern-esm');
            expect(typeof result.valid).toBe('boolean');
        });
    });
    describe('hasExistingInstallation', () => {
        it('should return true when context.json exists', () => {
            vi.mocked(fs.existsSync).mockReturnValue(true);
            const result = hasExistingInstallation('/test/project');
            expect(result).toBe(true);
        });
        it('should return false when context.json does not exist', () => {
            vi.mocked(fs.existsSync).mockReturnValue(false);
            const result = hasExistingInstallation('/test/project');
            expect(result).toBe(false);
        });
    });
    describe('readExistingContext', () => {
        it('should return context when valid context.json exists', () => {
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({
                variant: 'modern-esm',
                nodeVersion: 20,
            }));
            const result = readExistingContext('/test/project');
            expect(result).toEqual({
                variant: 'modern-esm',
                nodeVersion: 20,
            });
        });
        it('should return null when context.json does not exist', () => {
            vi.mocked(fs.existsSync).mockReturnValue(false);
            const result = readExistingContext('/test/project');
            expect(result).toBeNull();
        });
        it('should return null when context.json has invalid JSON', () => {
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue('invalid json');
            const result = readExistingContext('/test/project');
            expect(result).toBeNull();
        });
        it('should return null when context.json is missing required fields', () => {
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ variant: 'modern-esm' }) // missing nodeVersion
            );
            const result = readExistingContext('/test/project');
            expect(result).toBeNull();
        });
    });
    describe('detectEnvironmentChange', () => {
        it('should detect no change when no existing installation', () => {
            // No context.json
            vi.mocked(fs.existsSync).mockImplementation((p) => {
                const pathStr = String(p);
                if (pathStr.includes('context.json'))
                    return false;
                if (pathStr.includes('package.json'))
                    return true;
                return false;
            });
            vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ name: 'test' }));
            const result = detectEnvironmentChange('/test/project');
            expect(result.changed).toBe(false);
        });
        it('should detect change when node version differs', () => {
            const currentNodeVersion = getNodeMajorVersion();
            const previousNodeVersion = currentNodeVersion - 2;
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readFileSync).mockImplementation((p) => {
                const pathStr = String(p);
                if (pathStr.includes('context.json')) {
                    return JSON.stringify({
                        variant: 'legacy-16',
                        nodeVersion: previousNodeVersion,
                    });
                }
                return JSON.stringify({ name: 'test' });
            });
            const result = detectEnvironmentChange('/test/project');
            expect(result.changed).toBe(true);
            expect(result.reason).toContain('Node.js version changed');
            expect(result.previousNodeVersion).toBe(previousNodeVersion);
            expect(result.currentNodeVersion).toBe(currentNodeVersion);
        });
    });
});
//# sourceMappingURL=variant-detector.test.js.map