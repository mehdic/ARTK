/**
 * Tests for LLKB Mining Modules (i18n, analytics, feature flags)
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as fsp from 'fs/promises';
import * as path from 'path';
import { tmpdir } from 'os';
import {
  generateI18nPatterns,
  type I18nMiningResult,
  mineI18nKeys,
} from '../mining/i18n-mining.js';
import {
  type AnalyticsMiningResult,
  generateAnalyticsPatterns,
  mineAnalyticsEvents,
} from '../mining/analytics-mining.js';
import {
  type FeatureFlagMiningResult,
  generateFeatureFlagPatterns,
  mineFeatureFlags,
} from '../mining/feature-flag-mining.js';

// =============================================================================
// Test Fixtures
// =============================================================================

const I18N_FIXTURE_FILES = {
  'src/components/Login.tsx': `
import { useTranslation } from 'react-i18next';

export function Login() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('login.title')}</h1>
      <p>{t('login.subtitle', { defaultValue: 'Welcome back' })}</p>
      <button>{t('common:login_button')}</button>
      <Trans i18nKey="login.footer">Footer text</Trans>
    </div>
  );
}
`,
  'src/components/Profile.vue': `
<template>
  <div>
    <h1>{{ $t('profile.title') }}</h1>
    <p>{{ $t('profile.description') }}</p>
  </div>
</template>
`,
  'src/app/page.tsx': `
import { useTranslations } from 'next-intl';

export default function Home() {
  const t = useTranslations('home');

  return <h1>{t('welcome')}</h1>;
}
`,
  'locales/en/common.json': JSON.stringify({
    login_button: 'Log In',
    signup_button: 'Sign Up',
  }),
};

const ANALYTICS_FIXTURE_FILES = {
  'src/components/Checkout.tsx': `
import mixpanel from 'mixpanel-browser';

export function Checkout() {
  const handlePurchase = () => {
    mixpanel.track('Purchase Completed', {
      amount: 99.99,
      currency: 'USD',
    });
  };

  return <button onClick={handlePurchase}>Complete Purchase</button>;
}
`,
  'src/analytics/ga.ts': `
export const trackPageView = (page: string) => {
  gtag('event', 'page_view', { page_path: page });
};

export const trackButtonClick = (buttonName: string) => {
  gtag('event', 'button_click', { button_name: buttonName });
};
`,
  'src/tracking/segment.ts': `
export const trackEvent = (eventName: string, properties?: any) => {
  analytics.track(eventName, properties);
};

trackEvent('User Signup', { plan: 'premium' });
`,
  'src/utils/amplitude.ts': `
import amplitude from 'amplitude-js';

amplitude.logEvent('Feature Used', { feature: 'dark_mode' });
`,
};

const FEATURE_FLAG_FIXTURE_FILES = {
  'src/features/FeatureToggle.tsx': `
import { useFlags, useLDClient } from 'launchdarkly-react-client-sdk';

export function FeatureToggle() {
  const flags = useFlags();
  const ldClient = useLDClient();

  const newCheckout = ldClient?.variation('new-checkout-flow', false);
  const darkMode = flags['dark-mode-enabled'];

  return <div>...</div>;
}
`,
  'src/utils/split.ts': `
const treatment = splitClient.getTreatment('feature-rollout');
const enabledFeature = splitClient.getTreatment('beta-feature');
`,
  'src/config/flags.ts': `
export const isFeatureEnabled = (flag: string) => {
  return featureFlags.isEnabled(flag);
};

const experimentEnabled = isFeatureEnabled('experiment-v2');
const newUIEnabled = process.env.FEATURE_NEW_UI === 'true';
`,
  'src/flagsmith/client.ts': `
import flagsmith from 'flagsmith';

const hasNewFeature = flagsmith.hasFeature('new-dashboard');
const featureValue = flagsmith.getValue('max-items');
`,
};

// =============================================================================
// Test Utilities
// =============================================================================

let tempDir: string;

async function createTestProject(files: Record<string, string>): Promise<string> {
  const projectDir = path.join(tempDir, `test-project-${Date.now()}-${Math.random().toString(36).slice(2)}`);

  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = path.join(projectDir, filePath);
    await fsp.mkdir(path.dirname(fullPath), { recursive: true });
    await fsp.writeFile(fullPath, content, 'utf-8');
  }

  return projectDir;
}

async function cleanupTestProject(projectDir: string): Promise<void> {
  try {
    await fsp.rm(projectDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

// =============================================================================
// Tests
// =============================================================================

describe('LLKB Mining Modules', () => {
  beforeAll(async () => {
    tempDir = await fsp.mkdtemp(path.join(tmpdir(), 'llkb-mining-test-'));
  });

  afterAll(async () => {
    try {
      await fsp.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  // ===========================================================================
  // i18n Mining Tests
  // ===========================================================================

  describe('i18n Mining', () => {
    it('should detect react-i18next library', async () => {
      const projectDir = await createTestProject(I18N_FIXTURE_FILES);

      try {
        const result = await mineI18nKeys(projectDir);

        expect(result.library).toBe('react-i18next');
      } finally {
        await cleanupTestProject(projectDir);
      }
    });

    it('should extract i18n keys from react-i18next', async () => {
      const projectDir = await createTestProject(I18N_FIXTURE_FILES);

      try {
        const result = await mineI18nKeys(projectDir);

        expect(result.keys.length).toBeGreaterThanOrEqual(4);

        const keyNames = result.keys.map(k => k.key);
        expect(keyNames).toContain('title');
        expect(keyNames).toContain('subtitle');

        // Check namespace extraction
        const loginButton = result.keys.find(k => k.key === 'login_button');
        expect(loginButton?.namespace).toBe('common');
      } finally {
        await cleanupTestProject(projectDir);
      }
    });

    it('should find locale files', async () => {
      const projectDir = await createTestProject(I18N_FIXTURE_FILES);

      try {
        const result = await mineI18nKeys(projectDir);

        expect(result.localeFiles.length).toBeGreaterThan(0);
        expect(result.localeFiles.some(f => f.includes('common.json'))).toBe(true);
      } finally {
        await cleanupTestProject(projectDir);
      }
    });

    it('should generate patterns from i18n keys', () => {
      const result: I18nMiningResult = {
        library: 'react-i18next',
        keys: [
          { key: 'login_button', source: 'test.ts' },
          { key: 'error_message', defaultValue: 'An error occurred', source: 'test.ts' },
        ],
        localeFiles: [],
      };

      const patterns = generateI18nPatterns(result);

      // Should generate 2 patterns per key (verify text + verify visible)
      expect(patterns.length).toBeGreaterThanOrEqual(2);

      // Check pattern structure
      const verifyPattern = patterns.find(p => p.normalizedText.includes('verify') && p.normalizedText.includes('text'));
      expect(verifyPattern).toBeDefined();
      expect(verifyPattern?.mappedPrimitive).toBe('assert');
      expect(verifyPattern?.category).toBe('assertion');
      expect(verifyPattern?.confidence).toBe(0.75);
      expect(verifyPattern?.selectorHints.length).toBeGreaterThan(0);
      expect(verifyPattern?.selectorHints[0].strategy).toBe('text');
    });
  });

  // ===========================================================================
  // Analytics Mining Tests
  // ===========================================================================

  describe('Analytics Mining', () => {
    it('should detect analytics providers', async () => {
      const projectDir = await createTestProject(ANALYTICS_FIXTURE_FILES);

      try {
        const result = await mineAnalyticsEvents(projectDir);

        // Should detect one of the supported providers
        expect(['mixpanel', 'ga4', 'segment', 'amplitude', 'custom']).toContain(result.provider);
      } finally {
        await cleanupTestProject(projectDir);
      }
    });

    it('should extract analytics events', async () => {
      const projectDir = await createTestProject(ANALYTICS_FIXTURE_FILES);

      try {
        const result = await mineAnalyticsEvents(projectDir);

        expect(result.events.length).toBeGreaterThanOrEqual(4);

        const eventNames = result.events.map(e => e.name);
        expect(eventNames).toContain('Purchase Completed');
        expect(eventNames).toContain('page_view');
        expect(eventNames).toContain('User Signup');
        expect(eventNames).toContain('Feature Used');
      } finally {
        await cleanupTestProject(projectDir);
      }
    });

    it('should extract event properties', async () => {
      const projectDir = await createTestProject(ANALYTICS_FIXTURE_FILES);

      try {
        const result = await mineAnalyticsEvents(projectDir);

        const purchaseEvent = result.events.find(e => e.name === 'Purchase Completed');
        expect(purchaseEvent).toBeDefined();
        expect(purchaseEvent?.properties).toBeDefined();
        expect(purchaseEvent?.properties).toContain('amount');
        expect(purchaseEvent?.properties).toContain('currency');
      } finally {
        await cleanupTestProject(projectDir);
      }
    });

    it('should generate patterns from analytics events', () => {
      const result: AnalyticsMiningResult = {
        provider: 'mixpanel',
        events: [
          { name: 'button_click', provider: 'ga4', source: 'test.ts' },
          { name: 'User Signup', provider: 'segment', properties: ['plan', 'email'], source: 'test.ts' },
        ],
      };

      const patterns = generateAnalyticsPatterns(result);

      // Should generate 2 patterns per event (verify tracked + trigger event)
      expect(patterns.length).toBeGreaterThanOrEqual(2);

      // Check pattern structure
      const verifyPattern = patterns.find(p => p.normalizedText.includes('verify') && p.normalizedText.includes('tracked'));
      expect(verifyPattern).toBeDefined();
      expect(verifyPattern?.mappedPrimitive).toBe('assert');
      expect(verifyPattern?.category).toBe('assertion');

      const triggerPattern = patterns.find(p => p.normalizedText.includes('trigger') && p.normalizedText.includes('event'));
      expect(triggerPattern).toBeDefined();
      expect(triggerPattern?.mappedPrimitive).toBe('click');
      expect(triggerPattern?.category).toBe('ui-interaction');
    });
  });

  // ===========================================================================
  // Feature Flag Mining Tests
  // ===========================================================================

  describe('Feature Flag Mining', () => {
    it('should detect feature flag providers', async () => {
      const projectDir = await createTestProject(FEATURE_FLAG_FIXTURE_FILES);

      try {
        const result = await mineFeatureFlags(projectDir);

        // Should detect launchdarkly (highest score)
        expect(['launchdarkly', 'split', 'flagsmith', 'custom']).toContain(result.provider);
      } finally {
        await cleanupTestProject(projectDir);
      }
    });

    it('should extract feature flags', async () => {
      const projectDir = await createTestProject(FEATURE_FLAG_FIXTURE_FILES);

      try {
        const result = await mineFeatureFlags(projectDir);

        expect(result.flags.length).toBeGreaterThanOrEqual(6);

        const flagNames = result.flags.map(f => f.name);
        expect(flagNames).toContain('new-checkout-flow');
        expect(flagNames).toContain('dark-mode-enabled');
        expect(flagNames).toContain('feature-rollout');
        expect(flagNames).toContain('experiment-v2');
        expect(flagNames).toContain('new-dashboard');
      } finally {
        await cleanupTestProject(projectDir);
      }
    });

    it('should extract default values from LaunchDarkly flags', async () => {
      const projectDir = await createTestProject(FEATURE_FLAG_FIXTURE_FILES);

      try {
        const result = await mineFeatureFlags(projectDir);

        const checkoutFlag = result.flags.find(f => f.name === 'new-checkout-flow');
        expect(checkoutFlag).toBeDefined();
        expect(checkoutFlag?.defaultValue).toBe(false);
      } finally {
        await cleanupTestProject(projectDir);
      }
    });

    it('should generate patterns from feature flags', () => {
      const result: FeatureFlagMiningResult = {
        provider: 'launchdarkly',
        flags: [
          { name: 'new_feature', provider: 'launchdarkly', defaultValue: false, source: 'test.ts' },
          { name: 'beta-experiment', provider: 'split', source: 'test.ts' },
        ],
      };

      const patterns = generateFeatureFlagPatterns(result);

      // Should generate 3 patterns per flag (ensure visible + verify enabled + test disabled)
      expect(patterns.length).toBeGreaterThanOrEqual(3);

      // Check pattern structure
      const ensurePattern = patterns.find(p => p.normalizedText.includes('ensure') && p.normalizedText.includes('visible'));
      expect(ensurePattern).toBeDefined();
      expect(ensurePattern?.mappedPrimitive).toBe('assert');
      expect(ensurePattern?.category).toBe('assertion');

      const verifyPattern = patterns.find(p => p.normalizedText.includes('verify') && p.normalizedText.includes('enabled'));
      expect(verifyPattern).toBeDefined();
      expect(verifyPattern?.mappedPrimitive).toBe('assert');

      const testPattern = patterns.find(p => p.normalizedText.includes('test with') && p.normalizedText.includes('disabled'));
      expect(testPattern).toBeDefined();
      expect(testPattern?.mappedPrimitive).toBe('navigate');
      expect(testPattern?.category).toBe('navigation');
    });
  });

  // ===========================================================================
  // Integration Tests
  // ===========================================================================

  describe('Integration', () => {
    it('should handle projects with all three mining types', async () => {
      const combinedFiles = {
        ...I18N_FIXTURE_FILES,
        ...ANALYTICS_FIXTURE_FILES,
        ...FEATURE_FLAG_FIXTURE_FILES,
      };

      const projectDir = await createTestProject(combinedFiles);

      try {
        const [i18nResult, analyticsResult, flagResult] = await Promise.all([
          mineI18nKeys(projectDir),
          mineAnalyticsEvents(projectDir),
          mineFeatureFlags(projectDir),
        ]);

        expect(i18nResult.keys.length).toBeGreaterThan(0);
        expect(analyticsResult.events.length).toBeGreaterThan(0);
        expect(flagResult.flags.length).toBeGreaterThan(0);

        // Generate all patterns
        const i18nPatterns = generateI18nPatterns(i18nResult);
        const analyticsPatterns = generateAnalyticsPatterns(analyticsResult);
        const flagPatterns = generateFeatureFlagPatterns(flagResult);

        expect(i18nPatterns.length).toBeGreaterThan(0);
        expect(analyticsPatterns.length).toBeGreaterThan(0);
        expect(flagPatterns.length).toBeGreaterThan(0);

        // All patterns should have valid structure
        const allPatterns = [...i18nPatterns, ...analyticsPatterns, ...flagPatterns];
        for (const pattern of allPatterns) {
          expect(pattern.id).toMatch(/^DP-[a-f0-9]{8}$/);
          expect(pattern.normalizedText).toBeTruthy();
          expect(pattern.mappedPrimitive).toBeTruthy();
          expect(pattern.confidence).toBeGreaterThan(0);
          expect(pattern.confidence).toBeLessThanOrEqual(1);
          expect(['app-specific', 'framework', 'universal']).toContain(pattern.layer);
        }
      } finally {
        await cleanupTestProject(projectDir);
      }
    });

    it('should handle projects with no detectable patterns gracefully', async () => {
      const emptyProject = {
        'src/index.ts': 'console.log("Hello World");',
      };

      const projectDir = await createTestProject(emptyProject);

      try {
        const [i18nResult, analyticsResult, flagResult] = await Promise.all([
          mineI18nKeys(projectDir),
          mineAnalyticsEvents(projectDir),
          mineFeatureFlags(projectDir),
        ]);

        // Should return empty results, not throw
        expect(i18nResult.keys).toEqual([]);
        expect(analyticsResult.events).toEqual([]);
        expect(flagResult.flags).toEqual([]);

        // Pattern generation should handle empty results
        const i18nPatterns = generateI18nPatterns(i18nResult);
        const analyticsPatterns = generateAnalyticsPatterns(analyticsResult);
        const flagPatterns = generateFeatureFlagPatterns(flagResult);

        expect(i18nPatterns).toEqual([]);
        expect(analyticsPatterns).toEqual([]);
        expect(flagPatterns).toEqual([]);
      } finally {
        await cleanupTestProject(projectDir);
      }
    });
  });
});
