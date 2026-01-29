/**
 * Variant detection and feature flags for AutoGen
 */

export interface VariantInfo {
  id: 'modern-esm' | 'modern-cjs' | 'legacy-16' | 'legacy-14';
  nodeVersion: number;
  moduleSystem: 'esm' | 'cjs';
  playwrightVersion: string;
  features: VariantFeatures;
}

export interface VariantFeatures {
  ariaSnapshots: boolean;
  clockApi: boolean;
  topLevelAwait: boolean;
  promiseAny: boolean;
}

/**
 * Detect the current runtime variant based on Node.js version
 */
export function detectVariant(): VariantInfo {
  const nodeVersionStr = process.version.slice(1);
  const nodeVersion = parseInt(nodeVersionStr.split('.')[0] ?? '18', 10);

  // Check if running in ESM context
  const isESM = typeof import.meta !== 'undefined';

  if (nodeVersion >= 18) {
    return {
      id: isESM ? 'modern-esm' : 'modern-cjs',
      nodeVersion,
      moduleSystem: isESM ? 'esm' : 'cjs',
      playwrightVersion: '1.57.x',
      features: {
        ariaSnapshots: true,
        clockApi: true,
        topLevelAwait: true,
        promiseAny: true,
      },
    };
  } else if (nodeVersion >= 16) {
    return {
      id: 'legacy-16',
      nodeVersion,
      moduleSystem: 'cjs',
      playwrightVersion: '1.49.x',
      features: {
        ariaSnapshots: true,
        clockApi: true,
        topLevelAwait: true,
        promiseAny: true,
      },
    };
  } else {
    return {
      id: 'legacy-14',
      nodeVersion,
      moduleSystem: 'cjs',
      playwrightVersion: '1.33.x',
      features: {
        ariaSnapshots: false,
        clockApi: false,
        topLevelAwait: false,
        promiseAny: false,
      },
    };
  }
}

/**
 * Get feature availability for current variant
 */
export function getFeatures(): VariantFeatures {
  return detectVariant().features;
}

/**
 * Check if a specific feature is available
 */
export function hasFeature(feature: keyof VariantFeatures): boolean {
  return detectVariant().features[feature];
}
