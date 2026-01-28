/**
 * Variant detection and feature flags for AutoGen
 */
interface VariantInfo {
    id: 'modern-esm' | 'modern-cjs' | 'legacy-16' | 'legacy-14';
    nodeVersion: number;
    moduleSystem: 'esm' | 'cjs';
    playwrightVersion: string;
    features: VariantFeatures;
}
interface VariantFeatures {
    ariaSnapshots: boolean;
    clockApi: boolean;
    topLevelAwait: boolean;
    promiseAny: boolean;
}
/**
 * Detect the current runtime variant based on Node.js version
 */
declare function detectVariant(): VariantInfo;
/**
 * Get feature availability for current variant
 */
declare function getFeatures(): VariantFeatures;
/**
 * Check if a specific feature is available
 */
declare function hasFeature(feature: keyof VariantFeatures): boolean;

export { type VariantFeatures, type VariantInfo, detectVariant, getFeatures, hasFeature };
