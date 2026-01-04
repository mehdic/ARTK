/**
 * Integration test for Visual Regression, Accessibility, and Performance features
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { IRJourney } from '../../src/ir/types.js';
import { generateTest } from '../../src/codegen/generateTest.js';

describe('Visual Regression, Accessibility, and Performance Integration', () => {
  it('should generate test with visual regression assertions', () => {
    const journey: IRJourney = {
      id: 'JRN-0001',
      title: 'Test Visual Regression',
      tier: 'smoke',
      scope: 'products',
      actor: 'guest-user',
      tags: ['visual'],
      moduleDependencies: {
        foundation: [],
        feature: [],
      },
      steps: [
        {
          id: 'AC-1',
          description: 'View product page',
          actions: [],
          assertions: [],
        },
      ],
      visualRegression: {
        enabled: true,
        snapshots: ['AC-1'],
        threshold: 0.1,
      },
    };

    const result = generateTest(journey);

    expect(result.code).toContain('Visual regression check');
    expect(result.code).toContain('toHaveScreenshot');
    expect(result.code).toContain('ac-1-snapshot.png');
    expect(result.code).toContain('maxDiffPixelRatio: 0.1');
  });

  it('should generate test with accessibility audits', () => {
    const journey: IRJourney = {
      id: 'JRN-0002',
      title: 'Test Accessibility',
      tier: 'regression',
      scope: 'dashboard',
      actor: 'authenticated-user',
      tags: ['a11y'],
      moduleDependencies: {
        foundation: [],
        feature: [],
      },
      steps: [
        {
          id: 'AC-1',
          description: 'View dashboard',
          actions: [],
          assertions: [],
        },
      ],
      accessibility: {
        enabled: true,
        rules: ['wcag2aa', 'wcag21aa'],
        exclude: ['#legacy-widget'],
      },
    };

    const result = generateTest(journey);

    expect(result.code).toContain('import AxeBuilder from \'@axe-core/playwright\'');
    expect(result.code).toContain('Accessibility audits');
    expect(result.code).toContain('AxeBuilder');
    // Check for rules and exclude (HTML entities may be used)
    expect(result.code).toContain('wcag2aa');
    expect(result.code).toContain('wcag21aa');
    expect(result.code).toContain('#legacy-widget');
    expect(result.code).toContain('accessibilityResults.violations');
  });

  it('should generate test with performance budgets', () => {
    const journey: IRJourney = {
      id: 'JRN-0003',
      title: 'Test Performance',
      tier: 'smoke',
      scope: 'products',
      actor: 'guest-user',
      tags: ['performance'],
      moduleDependencies: {
        foundation: [],
        feature: [],
      },
      steps: [
        {
          id: 'AC-1',
          description: 'Load product page',
          actions: [],
          assertions: [],
        },
      ],
      performance: {
        enabled: true,
        budgets: {
          lcp: 2500,
          fid: 100,
          cls: 0.1,
          ttfb: 600,
        },
      },
    };

    const result = generateTest(journey);

    expect(result.code).toContain('Performance budgets');
    expect(result.code).toContain('PerformanceObserver');
    expect(result.code).toContain('largest-contentful-paint');
    expect(result.code).toContain('first-input');
    expect(result.code).toContain('layout-shift');
    expect(result.code).toContain('expect(metrics.lcp).toBeLessThan(2500)');
    expect(result.code).toContain('expect(metrics.fid).toBeLessThan(100)');
    expect(result.code).toContain('expect(metrics.cls).toBeLessThan(0.1)');
    expect(result.code).toContain('expect(metrics.ttfb).toBeLessThan(600)');
  });

  it('should generate test with all three features enabled', () => {
    const journey: IRJourney = {
      id: 'JRN-0004',
      title: 'Comprehensive Test',
      tier: 'regression',
      scope: 'checkout',
      actor: 'authenticated-user',
      tags: ['visual', 'a11y', 'performance'],
      moduleDependencies: {
        foundation: [],
        feature: [],
      },
      steps: [
        {
          id: 'AC-1',
          description: 'Complete checkout',
          actions: [],
          assertions: [],
        },
      ],
      visualRegression: {
        enabled: true,
        snapshots: ['AC-1'],
        threshold: 0.05,
      },
      accessibility: {
        enabled: true,
        rules: ['wcag2aa'],
      },
      performance: {
        enabled: true,
        budgets: {
          lcp: 3000,
          cls: 0.1,
        },
      },
    };

    const result = generateTest(journey);

    // Check all three features are present
    expect(result.code).toContain('Visual regression check');
    expect(result.code).toContain('toHaveScreenshot');
    expect(result.code).toContain('AxeBuilder');
    expect(result.code).toContain('Accessibility audits');
    expect(result.code).toContain('Performance budgets');
    expect(result.code).toContain('PerformanceObserver');

    // Verify multiple afterEach hooks are generated
    const afterEachCount = (result.code.match(/test\.afterEach/g) || []).length;
    expect(afterEachCount).toBeGreaterThanOrEqual(2); // At least accessibility and performance
  });

  it('should not include features when disabled', () => {
    const journey: IRJourney = {
      id: 'JRN-0005',
      title: 'Standard Test',
      tier: 'smoke',
      scope: 'auth',
      actor: 'guest-user',
      tags: ['auth'],
      moduleDependencies: {
        foundation: [],
        feature: [],
      },
      steps: [
        {
          id: 'AC-1',
          description: 'Login',
          actions: [],
          assertions: [],
        },
      ],
      // No visual regression, accessibility, or performance config
    };

    const result = generateTest(journey);

    expect(result.code).not.toContain('Visual regression check');
    expect(result.code).not.toContain('toHaveScreenshot');
    expect(result.code).not.toContain('AxeBuilder');
    expect(result.code).not.toContain('Accessibility audits');
    expect(result.code).not.toContain('Performance budgets');
    expect(result.code).not.toContain('PerformanceObserver');
  });

  it('should only include visual regression for specified snapshots', () => {
    const journey: IRJourney = {
      id: 'JRN-0006',
      title: 'Selective Visual Regression',
      tier: 'regression',
      scope: 'products',
      actor: 'guest-user',
      tags: ['visual'],
      moduleDependencies: {
        foundation: [],
        feature: [],
      },
      steps: [
        {
          id: 'AC-1',
          description: 'View product',
          actions: [],
          assertions: [],
        },
        {
          id: 'AC-2',
          description: 'View details',
          actions: [],
          assertions: [],
        },
        {
          id: 'AC-3',
          description: 'Add to cart',
          actions: [],
          assertions: [],
        },
      ],
      visualRegression: {
        enabled: true,
        snapshots: ['AC-1', 'AC-3'], // Only AC-1 and AC-3, not AC-2
        threshold: 0.1,
      },
    };

    const result = generateTest(journey);

    // AC-1 should have snapshot
    expect(result.code).toContain('ac-1-snapshot.png');

    // AC-2 should NOT have snapshot
    expect(result.code).not.toContain('ac-2-snapshot.png');

    // AC-3 should have snapshot
    expect(result.code).toContain('ac-3-snapshot.png');
  });
});
