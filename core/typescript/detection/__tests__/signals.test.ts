/**
 * Unit tests for detection signal scoring utilities
 *
 * @group unit
 * @group detection
 */

import { describe, expect, it } from 'vitest';
import {
  SIGNAL_WEIGHTS,
  CONFIDENCE_THRESHOLDS,
  FRAMEWORK_DETECTION_MAP,
  FRONTEND_DIRECTORY_PATTERNS,
  FRONTEND_PACKAGE_INDICATORS,
  calculateScore,
  getConfidenceFromScore,
  getSignalCategory,
  createSignal,
  getSignalWeight,
  clearWarnedSignalsCache,
  isFrontendPackage,
  matchesFrontendDirectoryPattern,
} from '../signals.js';

// =============================================================================
// SIGNAL_WEIGHTS Tests
// =============================================================================

describe('SIGNAL_WEIGHTS', () => {
  it('should have weights for major frameworks', () => {
    expect(SIGNAL_WEIGHTS['package-dependency:react']).toBe(30);
    expect(SIGNAL_WEIGHTS['package-dependency:vue']).toBe(30);
    expect(SIGNAL_WEIGHTS['package-dependency:@angular/core']).toBe(30);
    expect(SIGNAL_WEIGHTS['package-dependency:svelte']).toBe(30);
  });

  it('should have higher weights for meta-frameworks', () => {
    expect(SIGNAL_WEIGHTS['package-dependency:next']).toBe(35);
    expect(SIGNAL_WEIGHTS['package-dependency:nuxt']).toBe(35);
    expect(SIGNAL_WEIGHTS['package-dependency:gatsby']).toBe(35);
    expect(SIGNAL_WEIGHTS['package-dependency:remix']).toBe(35);
    expect(SIGNAL_WEIGHTS['package-dependency:astro']).toBe(35);
  });

  it('should have weights for build tools', () => {
    expect(SIGNAL_WEIGHTS['package-dependency:vite']).toBe(20);
    expect(SIGNAL_WEIGHTS['package-dependency:webpack']).toBe(20);
    expect(SIGNAL_WEIGHTS['package-dependency:parcel']).toBe(20);
  });

  it('should have weights for entry files', () => {
    expect(SIGNAL_WEIGHTS['entry-file:src/App.tsx']).toBe(20);
    expect(SIGNAL_WEIGHTS['entry-file:src/App.jsx']).toBe(20);
    expect(SIGNAL_WEIGHTS['entry-file:src/main.tsx']).toBe(15);
  });

  it('should have weights for directory names', () => {
    expect(SIGNAL_WEIGHTS['directory-name:frontend']).toBe(15);
    expect(SIGNAL_WEIGHTS['directory-name:client']).toBe(15);
    expect(SIGNAL_WEIGHTS['directory-name:web']).toBe(10);
  });

  it('should have weights for index.html locations', () => {
    expect(SIGNAL_WEIGHTS['index-html:public/index.html']).toBe(10);
    expect(SIGNAL_WEIGHTS['index-html:index.html']).toBe(10);
    expect(SIGNAL_WEIGHTS['index-html:src/index.html']).toBe(10);
  });

  it('should have weights for config files', () => {
    expect(SIGNAL_WEIGHTS['config-file:vite.config.ts']).toBe(20);
    expect(SIGNAL_WEIGHTS['config-file:next.config.js']).toBe(25);
    expect(SIGNAL_WEIGHTS['config-file:angular.json']).toBe(25);
  });
});

// =============================================================================
// CONFIDENCE_THRESHOLDS Tests
// =============================================================================

describe('CONFIDENCE_THRESHOLDS', () => {
  it('should have HIGH threshold at 40', () => {
    expect(CONFIDENCE_THRESHOLDS.HIGH).toBe(40);
  });

  it('should have MEDIUM threshold at 20', () => {
    expect(CONFIDENCE_THRESHOLDS.MEDIUM).toBe(20);
  });
});

// =============================================================================
// FRAMEWORK_DETECTION_MAP Tests
// =============================================================================

describe('FRAMEWORK_DETECTION_MAP', () => {
  it('should map React packages to react-spa', () => {
    expect(FRAMEWORK_DETECTION_MAP['react']).toBe('react-spa');
    expect(FRAMEWORK_DETECTION_MAP['react-dom']).toBe('react-spa');
  });

  it('should map Vue to vue-spa', () => {
    expect(FRAMEWORK_DETECTION_MAP['vue']).toBe('vue-spa');
  });

  it('should map Angular to angular', () => {
    expect(FRAMEWORK_DETECTION_MAP['@angular/core']).toBe('angular');
    expect(FRAMEWORK_DETECTION_MAP['@angular/platform-browser']).toBe('angular');
  });

  it('should map meta-frameworks correctly', () => {
    expect(FRAMEWORK_DETECTION_MAP['next']).toBe('next');
    expect(FRAMEWORK_DETECTION_MAP['nuxt']).toBe('nuxt');
    expect(FRAMEWORK_DETECTION_MAP['nuxt3']).toBe('nuxt');
  });

  it('should map Gatsby and Remix to react-spa', () => {
    expect(FRAMEWORK_DETECTION_MAP['gatsby']).toBe('react-spa');
    expect(FRAMEWORK_DETECTION_MAP['remix']).toBe('react-spa');
  });

  it('should map Svelte and Astro to other', () => {
    expect(FRAMEWORK_DETECTION_MAP['svelte']).toBe('other');
    expect(FRAMEWORK_DETECTION_MAP['astro']).toBe('other');
  });
});

// =============================================================================
// FRONTEND_DIRECTORY_PATTERNS Tests
// =============================================================================

describe('FRONTEND_DIRECTORY_PATTERNS', () => {
  it('should include common frontend directory names', () => {
    expect(FRONTEND_DIRECTORY_PATTERNS).toContain('frontend');
    expect(FRONTEND_DIRECTORY_PATTERNS).toContain('client');
    expect(FRONTEND_DIRECTORY_PATTERNS).toContain('web');
    expect(FRONTEND_DIRECTORY_PATTERNS).toContain('app');
    expect(FRONTEND_DIRECTORY_PATTERNS).toContain('ui');
  });
});

// =============================================================================
// FRONTEND_PACKAGE_INDICATORS Tests
// =============================================================================

describe('FRONTEND_PACKAGE_INDICATORS', () => {
  it('should include major frameworks', () => {
    expect(FRONTEND_PACKAGE_INDICATORS).toContain('react');
    expect(FRONTEND_PACKAGE_INDICATORS).toContain('vue');
    expect(FRONTEND_PACKAGE_INDICATORS).toContain('@angular/core');
    expect(FRONTEND_PACKAGE_INDICATORS).toContain('svelte');
  });

  it('should include meta-frameworks', () => {
    expect(FRONTEND_PACKAGE_INDICATORS).toContain('next');
    expect(FRONTEND_PACKAGE_INDICATORS).toContain('nuxt');
    expect(FRONTEND_PACKAGE_INDICATORS).toContain('gatsby');
    expect(FRONTEND_PACKAGE_INDICATORS).toContain('astro');
  });

  it('should include build tools', () => {
    expect(FRONTEND_PACKAGE_INDICATORS).toContain('vite');
    expect(FRONTEND_PACKAGE_INDICATORS).toContain('webpack');
  });
});

// =============================================================================
// calculateScore Tests
// =============================================================================

describe('calculateScore', () => {
  it('should return 0 for empty signals array', () => {
    expect(calculateScore([])).toBe(0);
  });

  it('should calculate score for single signal', () => {
    expect(calculateScore(['package-dependency:react'])).toBe(30);
    expect(calculateScore(['package-dependency:next'])).toBe(35);
  });

  it('should sum scores for multiple signals', () => {
    const signals = ['package-dependency:react', 'entry-file:src/App.tsx'];
    expect(calculateScore(signals)).toBe(50); // 30 + 20
  });

  it('should return 0 for unknown signals', () => {
    expect(calculateScore(['unknown:signal'])).toBe(0);
  });

  it('should handle mix of known and unknown signals', () => {
    const signals = ['package-dependency:react', 'unknown:signal'];
    expect(calculateScore(signals)).toBe(30); // only react counted
  });

  it('should calculate complex multi-signal score', () => {
    const signals = [
      'package-dependency:next',       // 35
      'entry-file:app/page.tsx',        // 20
      'config-file:next.config.js',     // 25
    ];
    expect(calculateScore(signals)).toBe(80);
  });
});

// =============================================================================
// getConfidenceFromScore Tests
// =============================================================================

describe('getConfidenceFromScore', () => {
  it('should return low for score < 20', () => {
    expect(getConfidenceFromScore(0)).toBe('low');
    expect(getConfidenceFromScore(10)).toBe('low');
    expect(getConfidenceFromScore(19)).toBe('low');
  });

  it('should return medium for score 20-39', () => {
    expect(getConfidenceFromScore(20)).toBe('medium');
    expect(getConfidenceFromScore(30)).toBe('medium');
    expect(getConfidenceFromScore(39)).toBe('medium');
  });

  it('should return high for score >= 40', () => {
    expect(getConfidenceFromScore(40)).toBe('high');
    expect(getConfidenceFromScore(50)).toBe('high');
    expect(getConfidenceFromScore(100)).toBe('high');
  });

  it('should handle edge cases at thresholds', () => {
    expect(getConfidenceFromScore(19.9)).toBe('low');
    expect(getConfidenceFromScore(39.9)).toBe('medium');
  });
});

// =============================================================================
// getSignalCategory Tests
// =============================================================================

describe('getSignalCategory', () => {
  it('should extract package-dependency category', () => {
    expect(getSignalCategory('package-dependency:react')).toBe('package-dependency');
  });

  it('should extract entry-file category', () => {
    expect(getSignalCategory('entry-file:src/App.tsx')).toBe('entry-file');
  });

  it('should extract directory-name category', () => {
    expect(getSignalCategory('directory-name:frontend')).toBe('directory-name');
  });

  it('should extract index-html category', () => {
    expect(getSignalCategory('index-html:public/index.html')).toBe('index-html');
  });

  it('should extract config-file category', () => {
    expect(getSignalCategory('config-file:vite.config.ts')).toBe('config-file');
  });

  it('should return undefined for invalid category', () => {
    expect(getSignalCategory('unknown:something')).toBeUndefined();
    expect(getSignalCategory('invalid-category:value')).toBeUndefined();
  });

  it('should return undefined for malformed signal', () => {
    expect(getSignalCategory('noseparator')).toBeUndefined();
    expect(getSignalCategory('')).toBeUndefined();
  });
});

// =============================================================================
// createSignal Tests
// =============================================================================

describe('createSignal', () => {
  it('should create package-dependency signal', () => {
    expect(createSignal('package-dependency', 'react')).toBe('package-dependency:react');
  });

  it('should create entry-file signal', () => {
    expect(createSignal('entry-file', 'src/App.tsx')).toBe('entry-file:src/App.tsx');
  });

  it('should create directory-name signal', () => {
    expect(createSignal('directory-name', 'frontend')).toBe('directory-name:frontend');
  });

  it('should create index-html signal', () => {
    expect(createSignal('index-html', 'public/index.html')).toBe('index-html:public/index.html');
  });

  it('should create config-file signal', () => {
    expect(createSignal('config-file', 'vite.config.ts')).toBe('config-file:vite.config.ts');
  });
});

// =============================================================================
// getSignalWeight Tests
// =============================================================================

describe('getSignalWeight', () => {
  it('should return weight for known signal', () => {
    expect(getSignalWeight('package-dependency:react')).toBe(30);
    expect(getSignalWeight('package-dependency:next')).toBe(35);
    expect(getSignalWeight('entry-file:src/App.tsx')).toBe(20);
  });

  it('should return 0 for unknown signal', () => {
    expect(getSignalWeight('unknown:signal')).toBe(0);
    expect(getSignalWeight('package-dependency:unknown-package')).toBe(0);
  });

  it('should return 0 for empty string', () => {
    expect(getSignalWeight('')).toBe(0);
  });

  it('should be case-sensitive', () => {
    expect(getSignalWeight('package-dependency:React')).toBe(0);
    expect(getSignalWeight('PACKAGE-DEPENDENCY:react')).toBe(0);
  });

  it('should return weight for new Vue signal', () => {
    expect(getSignalWeight('entry-file:vue.config.js')).toBe(20);
  });

  it('should return weight for new Angular signal', () => {
    expect(getSignalWeight('entry-file:src/app/app.module.ts')).toBe(15);
  });
});

// =============================================================================
// isFrontendPackage Tests
// =============================================================================

describe('isFrontendPackage', () => {
  it('should return true for major frameworks', () => {
    expect(isFrontendPackage('react')).toBe(true);
    expect(isFrontendPackage('vue')).toBe(true);
    expect(isFrontendPackage('@angular/core')).toBe(true);
    expect(isFrontendPackage('svelte')).toBe(true);
  });

  it('should return true for meta-frameworks', () => {
    expect(isFrontendPackage('next')).toBe(true);
    expect(isFrontendPackage('nuxt')).toBe(true);
    expect(isFrontendPackage('gatsby')).toBe(true);
  });

  it('should return true for build tools', () => {
    expect(isFrontendPackage('vite')).toBe(true);
    expect(isFrontendPackage('webpack')).toBe(true);
  });

  it('should return false for backend packages', () => {
    expect(isFrontendPackage('express')).toBe(false);
    expect(isFrontendPackage('fastify')).toBe(false);
    expect(isFrontendPackage('pg')).toBe(false);
  });

  it('should return false for random packages', () => {
    expect(isFrontendPackage('lodash')).toBe(false);
    expect(isFrontendPackage('moment')).toBe(false);
    expect(isFrontendPackage('axios')).toBe(false);
  });
});

// =============================================================================
// matchesFrontendDirectoryPattern Tests
// =============================================================================

describe('matchesFrontendDirectoryPattern', () => {
  it('should match exact frontend directory names', () => {
    expect(matchesFrontendDirectoryPattern('frontend')).toBe(true);
    expect(matchesFrontendDirectoryPattern('client')).toBe(true);
    expect(matchesFrontendDirectoryPattern('web')).toBe(true);
    expect(matchesFrontendDirectoryPattern('app')).toBe(true);
    expect(matchesFrontendDirectoryPattern('ui')).toBe(true);
  });

  it('should match case-insensitively', () => {
    expect(matchesFrontendDirectoryPattern('Frontend')).toBe(true);
    expect(matchesFrontendDirectoryPattern('FRONTEND')).toBe(true);
    expect(matchesFrontendDirectoryPattern('CLIENT')).toBe(true);
  });

  it('should match partial matches', () => {
    expect(matchesFrontendDirectoryPattern('web-client')).toBe(true);
    expect(matchesFrontendDirectoryPattern('webapp')).toBe(true);
    expect(matchesFrontendDirectoryPattern('frontend-app')).toBe(true);
  });

  it('should return false for non-frontend directories', () => {
    expect(matchesFrontendDirectoryPattern('backend')).toBe(false);
    expect(matchesFrontendDirectoryPattern('server')).toBe(false);
    expect(matchesFrontendDirectoryPattern('api')).toBe(false);
    expect(matchesFrontendDirectoryPattern('lib')).toBe(false);
  });
});

// =============================================================================
// clearWarnedSignalsCache Tests
// =============================================================================

describe('clearWarnedSignalsCache', () => {
  it('should be a function that clears the cache', () => {
    // First, trigger a warning by getting weight for unknown signal
    getSignalWeight('test-unknown:signal-1');

    // Clear the cache
    clearWarnedSignalsCache();

    // This should not throw - the function clears the internal Set
    expect(clearWarnedSignalsCache).toBeDefined();
  });

  it('should allow warnings to be triggered again after clearing', () => {
    // Clear any previous state
    clearWarnedSignalsCache();

    // Get weight for unknown signal (triggers internal warning)
    const weight1 = getSignalWeight('test-cache-clear:unique-signal');
    expect(weight1).toBe(0);

    // Get weight again for same signal (should not trigger warning due to cache)
    const weight2 = getSignalWeight('test-cache-clear:unique-signal');
    expect(weight2).toBe(0);

    // Clear the cache
    clearWarnedSignalsCache();

    // Get weight for same signal again (should be able to trigger warning again)
    const weight3 = getSignalWeight('test-cache-clear:unique-signal');
    expect(weight3).toBe(0);
  });

  it('should not affect valid signal lookups', () => {
    clearWarnedSignalsCache();

    // Valid signals should still return correct weights
    expect(getSignalWeight('package-dependency:react')).toBe(30);

    clearWarnedSignalsCache();

    // Should still work after clearing
    expect(getSignalWeight('package-dependency:react')).toBe(30);
  });
});
