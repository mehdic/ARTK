/**
 * ARTK Variant Definitions
 *
 * Constant mapping of all 4 variants with their complete metadata.
 */
import type { Variant, VariantId } from './variant-types.js';
/**
 * Complete definitions for all ARTK variants.
 *
 * Node.js version ranges only include LTS versions (even numbers: 14, 16, 18, 20, 22).
 * Non-LTS versions (15, 17, 19, 21) have short support windows and are not recommended
 * for production use, so they are intentionally excluded.
 */
export declare const VARIANT_DEFINITIONS: Record<VariantId, Variant>;
/**
 * Array of all variant IDs.
 */
export declare const ALL_VARIANT_IDS: VariantId[];
/**
 * Get variant definition by ID.
 */
export declare function getVariantDefinition(id: VariantId): Variant;
/**
 * Get all variant definitions as an array.
 */
export declare function getAllVariants(): Variant[];
/**
 * Get variant IDs that support a given Node.js major version.
 */
export declare function getVariantsForNodeVersion(nodeMajor: number): VariantId[];
/**
 * Get the recommended variant for a Node.js version and module system.
 *
 * Priority:
 * 1. Node 18+: modern-esm (if ESM) or modern-cjs (if CJS)
 * 2. Node 16-17: legacy-16
 * 3. Node 14-15: legacy-14
 * 4. Node < 14: Error (unsupported)
 */
export declare function getRecommendedVariant(nodeMajor: number, moduleSystem: 'esm' | 'cjs'): VariantId;
/**
 * Check if a variant is compatible with a Node.js version.
 */
export declare function isVariantCompatible(variantId: VariantId, nodeMajor: number): boolean;
/**
 * Get display information for CLI help text.
 */
export declare function getVariantHelpText(): string;
/**
 * Minimum supported Node.js version.
 */
export declare const MIN_NODE_VERSION = 14;
/**
 * Maximum supported Node.js version (current LTS + next).
 */
export declare const MAX_NODE_VERSION = 22;
//# sourceMappingURL=variant-definitions.d.ts.map