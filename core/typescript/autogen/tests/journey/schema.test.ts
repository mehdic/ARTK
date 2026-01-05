/**
 * Tests for Journey Schema - Prerequisites, Negative Paths, Visual Regression, Accessibility, Performance
 */
import { describe, it, expect } from 'vitest';
import {
  JourneyFrontmatterSchema,
  NegativePathSchema,
  VisualRegressionSchema,
  AccessibilitySchema,
  PerformanceSchema,
} from '../../src/journey/schema.js';

describe('Journey Schema - Prerequisites', () => {
  it('should accept journey with prerequisites array', () => {
    const journey = {
      id: 'JRN-0001',
      title: 'User Dashboard',
      status: 'clarified',
      tier: 'smoke',
      scope: 'dashboard',
      actor: 'authenticated-user',
      prerequisites: ['JRN-0000'],
    };

    const result = JourneyFrontmatterSchema.safeParse(journey);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.prerequisites).toEqual(['JRN-0000']);
    }
  });

  it('should accept journey with multiple prerequisites', () => {
    const journey = {
      id: 'JRN-0002',
      title: 'User Profile Edit',
      status: 'clarified',
      tier: 'regression',
      scope: 'profile',
      actor: 'authenticated-user',
      prerequisites: ['JRN-0000', 'JRN-0001'],
    };

    const result = JourneyFrontmatterSchema.safeParse(journey);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.prerequisites).toHaveLength(2);
      expect(result.data.prerequisites).toContain('JRN-0000');
      expect(result.data.prerequisites).toContain('JRN-0001');
    }
  });

  it('should accept journey without prerequisites', () => {
    const journey = {
      id: 'JRN-0001',
      title: 'User Login',
      status: 'clarified',
      tier: 'smoke',
      scope: 'auth',
      actor: 'guest-user',
    };

    const result = JourneyFrontmatterSchema.safeParse(journey);
    expect(result.success).toBe(true);
  });
});

describe('NegativePath Schema', () => {
  it('should validate a valid negative path', () => {
    const negativePath = {
      name: 'invalid_password',
      input: {
        username: 'testuser',
        password: 'wrongpassword',
      },
      expectedError: 'Invalid credentials',
    };

    const result = NegativePathSchema.safeParse(negativePath);
    expect(result.success).toBe(true);
  });

  it('should validate negative path with expectedElement', () => {
    const negativePath = {
      name: 'missing_email',
      input: {
        email: '',
        password: 'test123',
      },
      expectedError: 'Email is required',
      expectedElement: '[data-testid="email-error"]',
    };

    const result = NegativePathSchema.safeParse(negativePath);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.expectedElement).toBe('[data-testid="email-error"]');
    }
  });

  it('should reject negative path without name', () => {
    const negativePath = {
      input: {
        username: 'test',
      },
      expectedError: 'Error',
    };

    const result = NegativePathSchema.safeParse(negativePath);
    expect(result.success).toBe(false);
  });

  it('should reject negative path without expectedError', () => {
    const negativePath = {
      name: 'test',
      input: {
        username: 'test',
      },
    };

    const result = NegativePathSchema.safeParse(negativePath);
    expect(result.success).toBe(false);
  });

  it('should reject negative path with empty name', () => {
    const negativePath = {
      name: '',
      input: {},
      expectedError: 'Error',
    };

    const result = NegativePathSchema.safeParse(negativePath);
    expect(result.success).toBe(false);
  });

  it('should reject negative path with empty expectedError', () => {
    const negativePath = {
      name: 'test',
      input: {},
      expectedError: '',
    };

    const result = NegativePathSchema.safeParse(negativePath);
    expect(result.success).toBe(false);
  });
});

describe('Journey Schema - Negative Paths', () => {
  it('should accept journey with negativePaths array', () => {
    const journey = {
      id: 'JRN-0003',
      title: 'User Login with Error Cases',
      status: 'clarified',
      tier: 'smoke',
      scope: 'auth',
      actor: 'guest-user',
      negativePaths: [
        {
          name: 'invalid_password',
          input: {
            username: 'testuser',
            password: 'wrongpassword',
          },
          expectedError: 'Invalid credentials',
        },
      ],
    };

    const result = JourneyFrontmatterSchema.safeParse(journey);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.negativePaths).toHaveLength(1);
      expect(result.data.negativePaths?.[0].name).toBe('invalid_password');
    }
  });

  it('should accept journey with multiple negative paths', () => {
    const journey = {
      id: 'JRN-0004',
      title: 'Registration Form Validation',
      status: 'clarified',
      tier: 'regression',
      scope: 'auth',
      actor: 'guest-user',
      negativePaths: [
        {
          name: 'missing_email',
          input: { email: '', password: 'test123' },
          expectedError: 'Email is required',
        },
        {
          name: 'weak_password',
          input: { email: 'test@example.com', password: '123' },
          expectedError: 'Password must be at least 8 characters',
        },
      ],
    };

    const result = JourneyFrontmatterSchema.safeParse(journey);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.negativePaths).toHaveLength(2);
    }
  });

  it('should accept journey without negativePaths', () => {
    const journey = {
      id: 'JRN-0005',
      title: 'Simple Journey',
      status: 'clarified',
      tier: 'smoke',
      scope: 'dashboard',
      actor: 'authenticated-user',
    };

    const result = JourneyFrontmatterSchema.safeParse(journey);
    expect(result.success).toBe(true);
  });
});

describe('Journey Schema - Combined Features', () => {
  it('should accept journey with both prerequisites and negativePaths', () => {
    const journey = {
      id: 'JRN-0006',
      title: 'User Profile Edit with Validation',
      status: 'clarified',
      tier: 'regression',
      scope: 'profile',
      actor: 'authenticated-user',
      prerequisites: ['JRN-0000'],
      negativePaths: [
        {
          name: 'invalid_email_format',
          input: { email: 'not-an-email' },
          expectedError: 'Please enter a valid email address',
          expectedElement: '[data-testid="email-error"]',
        },
      ],
    };

    const result = JourneyFrontmatterSchema.safeParse(journey);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.prerequisites).toEqual(['JRN-0000']);
      expect(result.data.negativePaths).toHaveLength(1);
    }
  });
});

describe('VisualRegression Schema', () => {
  it('should validate basic visual regression config', () => {
    const config = {
      enabled: true,
    };

    const result = VisualRegressionSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('should validate visual regression with snapshots', () => {
    const config = {
      enabled: true,
      snapshots: ['AC-1', 'AC-3'],
    };

    const result = VisualRegressionSchema.safeParse(config);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.snapshots).toEqual(['AC-1', 'AC-3']);
    }
  });

  it('should validate visual regression with threshold', () => {
    const config = {
      enabled: true,
      threshold: 0.05,
    };

    const result = VisualRegressionSchema.safeParse(config);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.threshold).toBe(0.05);
    }
  });

  it('should reject threshold less than 0', () => {
    const config = {
      enabled: true,
      threshold: -0.1,
    };

    const result = VisualRegressionSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('should reject threshold greater than 1', () => {
    const config = {
      enabled: true,
      threshold: 1.5,
    };

    const result = VisualRegressionSchema.safeParse(config);
    expect(result.success).toBe(false);
  });
});

describe('Accessibility Schema', () => {
  it('should validate basic accessibility config', () => {
    const config = {
      enabled: true,
    };

    const result = AccessibilitySchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('should validate accessibility with rules', () => {
    const config = {
      enabled: true,
      rules: ['wcag2a', 'wcag2aa', 'wcag21a'],
    };

    const result = AccessibilitySchema.safeParse(config);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rules).toHaveLength(3);
      expect(result.data.rules).toContain('wcag2aa');
    }
  });

  it('should validate accessibility with exclude selectors', () => {
    const config = {
      enabled: true,
      exclude: ['[data-test-ignore]', '#legacy-widget'],
    };

    const result = AccessibilitySchema.safeParse(config);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.exclude).toEqual(['[data-test-ignore]', '#legacy-widget']);
    }
  });

  it('should validate accessibility with both rules and exclude', () => {
    const config = {
      enabled: true,
      rules: ['wcag2aa'],
      exclude: ['#ad-container'],
    };

    const result = AccessibilitySchema.safeParse(config);
    expect(result.success).toBe(true);
  });
});

describe('Performance Schema', () => {
  it('should validate basic performance config', () => {
    const config = {
      enabled: true,
    };

    const result = PerformanceSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('should validate performance with LCP budget', () => {
    const config = {
      enabled: true,
      budgets: {
        lcp: 2500,
      },
    };

    const result = PerformanceSchema.safeParse(config);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.budgets?.lcp).toBe(2500);
    }
  });

  it('should validate performance with all budgets', () => {
    const config = {
      enabled: true,
      budgets: {
        lcp: 2500,
        fid: 100,
        cls: 0.1,
        ttfb: 600,
      },
    };

    const result = PerformanceSchema.safeParse(config);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.budgets?.lcp).toBe(2500);
      expect(result.data.budgets?.fid).toBe(100);
      expect(result.data.budgets?.cls).toBe(0.1);
      expect(result.data.budgets?.ttfb).toBe(600);
    }
  });

  it('should reject negative LCP budget', () => {
    const config = {
      enabled: true,
      budgets: {
        lcp: -100,
      },
    };

    const result = PerformanceSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('should reject negative CLS budget', () => {
    const config = {
      enabled: true,
      budgets: {
        cls: -0.1,
      },
    };

    const result = PerformanceSchema.safeParse(config);
    expect(result.success).toBe(false);
  });
});

describe('Journey Schema - Visual Regression, Accessibility, Performance', () => {
  it('should accept journey with visual regression enabled', () => {
    const journey = {
      id: 'JRN-0007',
      title: 'Login with Visual Regression',
      status: 'clarified',
      tier: 'smoke',
      scope: 'auth',
      actor: 'guest-user',
      visualRegression: {
        enabled: true,
        snapshots: ['AC-1', 'AC-2'],
        threshold: 0.1,
      },
    };

    const result = JourneyFrontmatterSchema.safeParse(journey);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.visualRegression?.enabled).toBe(true);
      expect(result.data.visualRegression?.snapshots).toEqual(['AC-1', 'AC-2']);
      expect(result.data.visualRegression?.threshold).toBe(0.1);
    }
  });

  it('should accept journey with accessibility enabled', () => {
    const journey = {
      id: 'JRN-0008',
      title: 'Dashboard with A11y Audit',
      status: 'clarified',
      tier: 'regression',
      scope: 'dashboard',
      actor: 'authenticated-user',
      accessibility: {
        enabled: true,
        rules: ['wcag2aa'],
        exclude: ['#legacy-widget'],
      },
    };

    const result = JourneyFrontmatterSchema.safeParse(journey);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.accessibility?.enabled).toBe(true);
      expect(result.data.accessibility?.rules).toContain('wcag2aa');
      expect(result.data.accessibility?.exclude).toContain('#legacy-widget');
    }
  });

  it('should accept journey with performance budgets enabled', () => {
    const journey = {
      id: 'JRN-0009',
      title: 'Product Page with Performance Budgets',
      status: 'clarified',
      tier: 'smoke',
      scope: 'products',
      actor: 'guest-user',
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

    const result = JourneyFrontmatterSchema.safeParse(journey);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.performance?.enabled).toBe(true);
      expect(result.data.performance?.budgets?.lcp).toBe(2500);
      expect(result.data.performance?.budgets?.fid).toBe(100);
      expect(result.data.performance?.budgets?.cls).toBe(0.1);
      expect(result.data.performance?.budgets?.ttfb).toBe(600);
    }
  });

  it('should accept journey with all new features enabled', () => {
    const journey = {
      id: 'JRN-0010',
      title: 'Comprehensive Test Journey',
      status: 'clarified',
      tier: 'regression',
      scope: 'checkout',
      actor: 'authenticated-user',
      visualRegression: {
        enabled: true,
        snapshots: ['AC-1', 'AC-3', 'AC-5'],
        threshold: 0.05,
      },
      accessibility: {
        enabled: true,
        rules: ['wcag2aa', 'wcag21aa'],
      },
      performance: {
        enabled: true,
        budgets: {
          lcp: 3000,
          cls: 0.1,
        },
      },
    };

    const result = JourneyFrontmatterSchema.safeParse(journey);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.visualRegression?.enabled).toBe(true);
      expect(result.data.accessibility?.enabled).toBe(true);
      expect(result.data.performance?.enabled).toBe(true);
    }
  });

  it('should accept journey without any new features', () => {
    const journey = {
      id: 'JRN-0011',
      title: 'Simple Journey Without Extra Features',
      status: 'clarified',
      tier: 'smoke',
      scope: 'auth',
      actor: 'guest-user',
    };

    const result = JourneyFrontmatterSchema.safeParse(journey);
    expect(result.success).toBe(true);
  });
});
