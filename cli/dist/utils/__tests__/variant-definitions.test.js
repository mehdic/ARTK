/**
 * Tests for variant-definitions.ts
 */
import { describe, it, expect } from 'vitest';
import { VARIANT_DEFINITIONS, ALL_VARIANT_IDS, getVariantDefinition, getAllVariants, getVariantsForNodeVersion, getRecommendedVariant, isVariantCompatible, getVariantHelpText, MIN_NODE_VERSION, MAX_NODE_VERSION, } from '../variant-definitions.js';
describe('variant-definitions', () => {
    describe('VARIANT_DEFINITIONS', () => {
        it('should have all 4 variants defined', () => {
            expect(Object.keys(VARIANT_DEFINITIONS)).toHaveLength(4);
            expect(VARIANT_DEFINITIONS['modern-esm']).toBeDefined();
            expect(VARIANT_DEFINITIONS['modern-cjs']).toBeDefined();
            expect(VARIANT_DEFINITIONS['legacy-16']).toBeDefined();
            expect(VARIANT_DEFINITIONS['legacy-14']).toBeDefined();
        });
        it('should have correct properties for modern-esm', () => {
            const variant = VARIANT_DEFINITIONS['modern-esm'];
            expect(variant.id).toBe('modern-esm');
            expect(variant.displayName).toBe('Modern ESM');
            expect(variant.moduleSystem).toBe('esm');
            expect(variant.playwrightVersion).toBe('1.57.x');
            expect(variant.tsTarget).toBe('ES2022');
            expect(variant.distDirectory).toBe('dist');
            expect(variant.nodeRange).toContain('18');
            expect(variant.nodeRange).toContain('20');
            expect(variant.nodeRange).toContain('22');
        });
        it('should have correct properties for modern-cjs', () => {
            const variant = VARIANT_DEFINITIONS['modern-cjs'];
            expect(variant.id).toBe('modern-cjs');
            expect(variant.moduleSystem).toBe('cjs');
            expect(variant.distDirectory).toBe('dist-cjs');
        });
        it('should have correct properties for legacy-16', () => {
            const variant = VARIANT_DEFINITIONS['legacy-16'];
            expect(variant.id).toBe('legacy-16');
            expect(variant.playwrightVersion).toBe('1.49.x');
            expect(variant.tsTarget).toBe('ES2021');
            expect(variant.distDirectory).toBe('dist-legacy-16');
            expect(variant.nodeRange).toContain('16');
            expect(variant.nodeRange).toContain('18');
            expect(variant.nodeRange).toContain('20');
        });
        it('should have correct properties for legacy-14', () => {
            const variant = VARIANT_DEFINITIONS['legacy-14'];
            expect(variant.id).toBe('legacy-14');
            expect(variant.playwrightVersion).toBe('1.33.x');
            expect(variant.tsTarget).toBe('ES2020');
            expect(variant.distDirectory).toBe('dist-legacy-14');
            expect(variant.nodeRange).toContain('14');
            expect(variant.nodeRange).toContain('16');
            expect(variant.nodeRange).toContain('18');
        });
    });
    describe('ALL_VARIANT_IDS', () => {
        it('should contain all 4 variant IDs', () => {
            expect(ALL_VARIANT_IDS).toHaveLength(4);
            expect(ALL_VARIANT_IDS).toContain('modern-esm');
            expect(ALL_VARIANT_IDS).toContain('modern-cjs');
            expect(ALL_VARIANT_IDS).toContain('legacy-16');
            expect(ALL_VARIANT_IDS).toContain('legacy-14');
        });
    });
    describe('getVariantDefinition', () => {
        it('should return correct definition for each variant', () => {
            expect(getVariantDefinition('modern-esm').id).toBe('modern-esm');
            expect(getVariantDefinition('modern-cjs').id).toBe('modern-cjs');
            expect(getVariantDefinition('legacy-16').id).toBe('legacy-16');
            expect(getVariantDefinition('legacy-14').id).toBe('legacy-14');
        });
    });
    describe('getAllVariants', () => {
        it('should return all variant definitions', () => {
            const variants = getAllVariants();
            expect(variants).toHaveLength(4);
            expect(variants.map((v) => v.id)).toEqual(expect.arrayContaining(['modern-esm', 'modern-cjs', 'legacy-16', 'legacy-14']));
        });
    });
    describe('getVariantsForNodeVersion', () => {
        it('should return modern variants for Node 20', () => {
            const variants = getVariantsForNodeVersion(20);
            expect(variants).toContain('modern-esm');
            expect(variants).toContain('modern-cjs');
            expect(variants).toContain('legacy-16');
        });
        it('should return legacy variants for Node 16', () => {
            const variants = getVariantsForNodeVersion(16);
            expect(variants).toContain('legacy-16');
            expect(variants).toContain('legacy-14');
            expect(variants).not.toContain('modern-esm');
            expect(variants).not.toContain('modern-cjs');
        });
        it('should return legacy-14 for Node 14', () => {
            const variants = getVariantsForNodeVersion(14);
            expect(variants).toContain('legacy-14');
            expect(variants).not.toContain('modern-esm');
        });
        it('should return empty array for unsupported Node version', () => {
            const variants = getVariantsForNodeVersion(12);
            expect(variants).toHaveLength(0);
        });
    });
    describe('getRecommendedVariant', () => {
        it('should return modern-esm for Node 20 with ESM', () => {
            expect(getRecommendedVariant(20, 'esm')).toBe('modern-esm');
        });
        it('should return modern-cjs for Node 20 with CJS', () => {
            expect(getRecommendedVariant(20, 'cjs')).toBe('modern-cjs');
        });
        it('should return modern-esm for Node 18 with ESM', () => {
            expect(getRecommendedVariant(18, 'esm')).toBe('modern-esm');
        });
        it('should return legacy-16 for Node 16', () => {
            expect(getRecommendedVariant(16, 'cjs')).toBe('legacy-16');
            expect(getRecommendedVariant(16, 'esm')).toBe('legacy-16');
        });
        it('should return legacy-14 for Node 14', () => {
            expect(getRecommendedVariant(14, 'cjs')).toBe('legacy-14');
        });
        it('should return legacy-14 for Node 15 (non-LTS, falls in 14-17 range)', () => {
            expect(getRecommendedVariant(15, 'cjs')).toBe('legacy-14');
        });
        it('should return legacy-16 for Node 17 (non-LTS, falls in 16-17 range)', () => {
            expect(getRecommendedVariant(17, 'cjs')).toBe('legacy-16');
        });
        it('should throw for unsupported Node version', () => {
            expect(() => getRecommendedVariant(12, 'cjs')).toThrow('Node.js 12 is not supported');
        });
    });
    describe('isVariantCompatible', () => {
        it('should return true for compatible Node versions', () => {
            expect(isVariantCompatible('modern-esm', 20)).toBe(true);
            expect(isVariantCompatible('modern-cjs', 18)).toBe(true);
            expect(isVariantCompatible('legacy-16', 16)).toBe(true);
            expect(isVariantCompatible('legacy-14', 14)).toBe(true);
        });
        it('should return false for incompatible Node versions', () => {
            expect(isVariantCompatible('modern-esm', 14)).toBe(false);
            expect(isVariantCompatible('modern-cjs', 16)).toBe(false);
            expect(isVariantCompatible('legacy-16', 14)).toBe(false);
        });
    });
    describe('getVariantHelpText', () => {
        it('should return formatted help text', () => {
            const helpText = getVariantHelpText();
            expect(helpText).toContain('Available variants:');
            expect(helpText).toContain('modern-esm');
            expect(helpText).toContain('modern-cjs');
            expect(helpText).toContain('legacy-16');
            expect(helpText).toContain('legacy-14');
            expect(helpText).toContain('Playwright');
        });
    });
    describe('constants', () => {
        it('should have correct MIN_NODE_VERSION', () => {
            expect(MIN_NODE_VERSION).toBe(14);
        });
        it('should have correct MAX_NODE_VERSION', () => {
            expect(MAX_NODE_VERSION).toBe(22);
        });
    });
});
//# sourceMappingURL=variant-definitions.test.js.map