import { describe, it, expect } from 'vitest';
import { detectVariant, getFeatures, hasFeature } from '../../src/variants/index.js';

describe('Variant Detection', () => {
  it('should detect correct variant based on Node version', () => {
    const variant = detectVariant();
    const nodeVersion = parseInt(process.version.slice(1).split('.')[0], 10);

    if (nodeVersion >= 18) {
      expect(variant.id).toMatch(/^modern-/);
    } else if (nodeVersion >= 16) {
      expect(variant.id).toBe('legacy-16');
    } else {
      expect(variant.id).toBe('legacy-14');
    }
  });

  it('should have correct feature flags', () => {
    const variant = detectVariant();

    if (variant.id === 'legacy-14') {
      expect(variant.features.ariaSnapshots).toBe(false);
      expect(variant.features.clockApi).toBe(false);
    } else {
      expect(variant.features.ariaSnapshots).toBe(true);
      expect(variant.features.clockApi).toBe(true);
    }
  });

  it('getFeatures should return current variant features', () => {
    const features = getFeatures();
    expect(features).toHaveProperty('ariaSnapshots');
    expect(features).toHaveProperty('clockApi');
    expect(features).toHaveProperty('topLevelAwait');
    expect(features).toHaveProperty('promiseAny');
  });

  it('hasFeature should check individual features', () => {
    const result = hasFeature('ariaSnapshots');
    expect(typeof result).toBe('boolean');
  });
});
