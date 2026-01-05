/**
 * Integration test for P3 fields parse-to-IR flow
 * Verifies that P3 frontmatter fields (testData, visualRegression, accessibility,
 * performance, prerequisites, negativePaths) flow correctly from Journey markdown
 * through normalization to IR output.
 */
import { describe, it, expect } from 'vitest';
import { parseJourneyContent } from '../../src/journey/parseJourney.js';
import { normalizeJourney } from '../../src/journey/normalize.js';

describe('P3 fields parse-to-IR flow', () => {
  it('should pass testData through to IR', () => {
    const journey = `---
id: JRN-9001
title: Test Data Flow
status: clarified
tier: smoke
actor: customer
scope: test
testData:
  - name: validUser
    description: Valid user credentials
    data:
      username: testuser
      password: Test123!
  - name: invalidUser
    description: Invalid user credentials
    data:
      username: baduser
      password: wrong
---
# Test`;

    const parsed = parseJourneyContent(journey);
    const result = normalizeJourney(parsed);

    expect(result.journey.testData).toBeDefined();
    expect(result.journey.testData).toHaveLength(2);
    expect(result.journey.testData![0].name).toBe('validUser');
    expect(result.journey.testData![0].description).toBe('Valid user credentials');
    expect(result.journey.testData![0].data).toEqual({
      username: 'testuser',
      password: 'Test123!',
    });
    expect(result.journey.testData![1].name).toBe('invalidUser');
  });

  it('should pass visualRegression through to IR', () => {
    const journey = `---
id: JRN-9002
title: Visual Regression Flow
status: clarified
tier: regression
actor: customer
scope: test
visualRegression:
  enabled: true
  snapshots:
    - AC-1
    - AC-3
  threshold: 0.05
---
# Test`;

    const parsed = parseJourneyContent(journey);
    const result = normalizeJourney(parsed);

    expect(result.journey.visualRegression).toBeDefined();
    expect(result.journey.visualRegression!.enabled).toBe(true);
    expect(result.journey.visualRegression!.snapshots).toEqual(['AC-1', 'AC-3']);
    expect(result.journey.visualRegression!.threshold).toBe(0.05);
  });

  it('should pass accessibility through to IR', () => {
    const journey = `---
id: JRN-9003
title: Accessibility Flow
status: clarified
tier: regression
actor: customer
scope: test
accessibility:
  enabled: true
  rules:
    - wcag2aa
    - wcag21aa
  exclude:
    - '#legacy-widget'
    - '.ad-banner'
---
# Test`;

    const parsed = parseJourneyContent(journey);
    const result = normalizeJourney(parsed);

    expect(result.journey.accessibility).toBeDefined();
    expect(result.journey.accessibility!.enabled).toBe(true);
    expect(result.journey.accessibility!.rules).toEqual(['wcag2aa', 'wcag21aa']);
    expect(result.journey.accessibility!.exclude).toEqual(['#legacy-widget', '.ad-banner']);
  });

  it('should pass performance through to IR', () => {
    const journey = `---
id: JRN-9004
title: Performance Flow
status: clarified
tier: smoke
actor: customer
scope: test
performance:
  enabled: true
  budgets:
    lcp: 2500
    fid: 100
    cls: 0.1
    ttfb: 600
---
# Test`;

    const parsed = parseJourneyContent(journey);
    const result = normalizeJourney(parsed);

    expect(result.journey.performance).toBeDefined();
    expect(result.journey.performance!.enabled).toBe(true);
    expect(result.journey.performance!.budgets).toBeDefined();
    expect(result.journey.performance!.budgets!.lcp).toBe(2500);
    expect(result.journey.performance!.budgets!.fid).toBe(100);
    expect(result.journey.performance!.budgets!.cls).toBe(0.1);
    expect(result.journey.performance!.budgets!.ttfb).toBe(600);
  });

  it('should pass prerequisites through to IR', () => {
    const journey = `---
id: JRN-9005
title: Prerequisites Flow
status: clarified
tier: regression
actor: customer
scope: test
prerequisites:
  - JRN-0001
  - JRN-0002
  - JRN-0003
---
# Test`;

    const parsed = parseJourneyContent(journey);
    const result = normalizeJourney(parsed);

    expect(result.journey.prerequisites).toBeDefined();
    expect(result.journey.prerequisites).toEqual(['JRN-0001', 'JRN-0002', 'JRN-0003']);
  });

  it('should pass negativePaths through to IR', () => {
    const journey = `---
id: JRN-9006
title: Negative Paths Flow
status: clarified
tier: regression
actor: customer
scope: test
negativePaths:
  - name: Missing username
    input:
      username: ""
      password: Test123!
    expectedError: Username is required
    expectedElement: '#username-error'
  - name: Invalid email format
    input:
      email: notanemail
    expectedError: Invalid email format
---
# Test`;

    const parsed = parseJourneyContent(journey);
    const result = normalizeJourney(parsed);

    expect(result.journey.negativePaths).toBeDefined();
    expect(result.journey.negativePaths).toHaveLength(2);
    expect(result.journey.negativePaths![0].name).toBe('Missing username');
    expect(result.journey.negativePaths![0].input).toEqual({
      username: '',
      password: 'Test123!',
    });
    expect(result.journey.negativePaths![0].expectedError).toBe('Username is required');
    expect(result.journey.negativePaths![0].expectedElement).toBe('#username-error');
    expect(result.journey.negativePaths![1].name).toBe('Invalid email format');
  });

  it('should pass all P3 fields together through to IR', () => {
    const journey = `---
id: JRN-9007
title: All P3 Fields Flow
status: clarified
tier: regression
actor: customer
scope: test
testData:
  - name: testSet1
    data:
      field: value
prerequisites:
  - JRN-0001
negativePaths:
  - name: error1
    input:
      field: bad
    expectedError: Invalid input
visualRegression:
  enabled: true
  snapshots:
    - AC-1
accessibility:
  enabled: true
  rules:
    - wcag2aa
performance:
  enabled: true
  budgets:
    lcp: 3000
---
# Test`;

    const parsed = parseJourneyContent(journey);
    const result = normalizeJourney(parsed);

    // Verify all P3 fields are present in IR
    expect(result.journey.testData).toBeDefined();
    expect(result.journey.testData).toHaveLength(1);

    expect(result.journey.prerequisites).toBeDefined();
    expect(result.journey.prerequisites).toEqual(['JRN-0001']);

    expect(result.journey.negativePaths).toBeDefined();
    expect(result.journey.negativePaths).toHaveLength(1);

    expect(result.journey.visualRegression).toBeDefined();
    expect(result.journey.visualRegression!.enabled).toBe(true);

    expect(result.journey.accessibility).toBeDefined();
    expect(result.journey.accessibility!.enabled).toBe(true);

    expect(result.journey.performance).toBeDefined();
    expect(result.journey.performance!.enabled).toBe(true);
  });

  it('should handle missing P3 fields gracefully (all optional)', () => {
    const journey = `---
id: JRN-9008
title: No P3 Fields
status: clarified
tier: smoke
actor: customer
scope: test
---
# Test`;

    const parsed = parseJourneyContent(journey);
    const result = normalizeJourney(parsed);

    // All P3 fields should be undefined when not provided
    expect(result.journey.testData).toBeUndefined();
    expect(result.journey.prerequisites).toBeUndefined();
    expect(result.journey.negativePaths).toBeUndefined();
    expect(result.journey.visualRegression).toBeUndefined();
    expect(result.journey.accessibility).toBeUndefined();
    expect(result.journey.performance).toBeUndefined();
  });
});
