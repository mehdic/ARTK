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
export const VARIANT_DEFINITIONS: Record<VariantId, Variant> = {
  'modern-esm': {
    id: 'modern-esm',
    displayName: 'Modern ESM',
    nodeRange: ['18', '20', '22'], // LTS only
    playwrightVersion: '1.57.x',
    moduleSystem: 'esm',
    tsTarget: 'ES2022',
    distDirectory: 'dist',
  },

  'modern-cjs': {
    id: 'modern-cjs',
    displayName: 'Modern CJS',
    nodeRange: ['18', '20', '22'], // LTS only
    playwrightVersion: '1.57.x',
    moduleSystem: 'cjs',
    tsTarget: 'ES2022',
    distDirectory: 'dist-cjs',
  },

  'legacy-16': {
    id: 'legacy-16',
    displayName: 'Legacy Node 16',
    nodeRange: ['16', '18', '20'], // LTS only
    playwrightVersion: '1.49.x',
    moduleSystem: 'cjs',
    tsTarget: 'ES2021',
    distDirectory: 'dist-legacy-16',
  },

  'legacy-14': {
    id: 'legacy-14',
    displayName: 'Legacy Node 14',
    nodeRange: ['14', '16', '18'], // LTS only
    playwrightVersion: '1.33.x',
    moduleSystem: 'cjs',
    tsTarget: 'ES2020',
    distDirectory: 'dist-legacy-14',
  },
};

/**
 * Array of all variant IDs.
 */
export const ALL_VARIANT_IDS: VariantId[] = [
  'modern-esm',
  'modern-cjs',
  'legacy-16',
  'legacy-14',
];

/**
 * Get variant definition by ID.
 */
export function getVariantDefinition(id: VariantId): Variant {
  return VARIANT_DEFINITIONS[id];
}

/**
 * Get all variant definitions as an array.
 */
export function getAllVariants(): Variant[] {
  return Object.values(VARIANT_DEFINITIONS);
}

/**
 * Get variant IDs that support a given Node.js major version.
 */
export function getVariantsForNodeVersion(nodeMajor: number): VariantId[] {
  return ALL_VARIANT_IDS.filter((id) =>
    VARIANT_DEFINITIONS[id].nodeRange.includes(String(nodeMajor))
  );
}

/**
 * Get the recommended variant for a Node.js version and module system.
 *
 * Priority:
 * 1. Node 18+: modern-esm (if ESM) or modern-cjs (if CJS)
 * 2. Node 16-17: legacy-16
 * 3. Node 14-15: legacy-14
 * 4. Node < 14: Error (unsupported)
 */
export function getRecommendedVariant(
  nodeMajor: number,
  moduleSystem: 'esm' | 'cjs'
): VariantId {
  if (nodeMajor >= 18) {
    return moduleSystem === 'esm' ? 'modern-esm' : 'modern-cjs';
  }

  if (nodeMajor >= 16) {
    return 'legacy-16';
  }

  if (nodeMajor >= 14) {
    return 'legacy-14';
  }

  throw new Error(
    `Node.js ${nodeMajor} is not supported. ARTK requires Node.js 14 or higher.`
  );
}

/**
 * Check if a variant is compatible with a Node.js version.
 */
export function isVariantCompatible(
  variantId: VariantId,
  nodeMajor: number
): boolean {
  const variant = VARIANT_DEFINITIONS[variantId];
  return variant.nodeRange.includes(String(nodeMajor));
}

/**
 * Get display information for CLI help text.
 */
export function getVariantHelpText(): string {
  const lines = ['Available variants:'];

  for (const variant of getAllVariants()) {
    const nodeRange = variant.nodeRange.join(', ');
    lines.push(
      `  ${variant.id.padEnd(12)} - ${variant.displayName} (Node ${nodeRange}, Playwright ${variant.playwrightVersion})`
    );
  }

  return lines.join('\n');
}

/**
 * Minimum supported Node.js version.
 */
export const MIN_NODE_VERSION = 14;

/**
 * Maximum supported Node.js version (current LTS + next).
 */
export const MAX_NODE_VERSION = 22;
