/**
 * ARTK Multi-Variant Type Definitions
 *
 * Core types for the variant system supporting Node.js 14-22 and ESM/CommonJS.
 */
/**
 * Type guard to check if a string is a valid VariantId.
 */
export function isVariantId(value) {
    return ['modern-esm', 'modern-cjs', 'legacy-16', 'legacy-14'].includes(value);
}
/**
 * Type guard to check if a string is a valid ModuleSystem.
 */
export function isModuleSystem(value) {
    return value === 'esm' || value === 'cjs';
}
//# sourceMappingURL=variant-types.js.map