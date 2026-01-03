/**
 * Completion Signals Tests
 * Tests for parsing, normalizing, and generating completion signal assertions
 */
import { describe, it, expect } from 'vitest';
import { parseJourneyContent } from '../../src/journey/parseJourney.js';
import { normalizeJourney } from '../../src/journey/normalize.js';
import { generateTest } from '../../src/codegen/generateTest.js';

describe('Completion Signals', () => {
  describe('Schema Parsing', () => {
    it('should parse url completion signal', () => {
      const content = `---
id: JRN-0001
title: Test Journey
status: clarified
tier: smoke
scope: test
actor: user
completion:
  - type: url
    value: "/dashboard"
---

## Acceptance Criteria
### AC-1: Navigate
- User navigates to dashboard
`;

      const parsed = parseJourneyContent(content);
      expect(parsed.frontmatter.completion).toBeDefined();
      expect(parsed.frontmatter.completion).toHaveLength(1);
      expect(parsed.frontmatter.completion![0]).toEqual({
        type: 'url',
        value: '/dashboard',
      });
    });

    it('should parse toast completion signal', () => {
      const content = `---
id: JRN-0001
title: Test Journey
status: clarified
tier: smoke
scope: test
actor: user
completion:
  - type: toast
    value: "Login successful"
---

## Acceptance Criteria
### AC-1: Login
- User logs in
`;

      const parsed = parseJourneyContent(content);
      expect(parsed.frontmatter.completion).toBeDefined();
      expect(parsed.frontmatter.completion![0]).toEqual({
        type: 'toast',
        value: 'Login successful',
      });
    });

    it('should parse element completion signal', () => {
      const content = `---
id: JRN-0001
title: Test Journey
status: clarified
tier: smoke
scope: test
actor: user
completion:
  - type: element
    value: "[data-testid='welcome-banner']"
---

## Acceptance Criteria
### AC-1: Check element
- Element is visible
`;

      const parsed = parseJourneyContent(content);
      expect(parsed.frontmatter.completion).toBeDefined();
      expect(parsed.frontmatter.completion![0]).toEqual({
        type: 'element',
        value: "[data-testid='welcome-banner']",
      });
    });

    it('should parse text completion signal', () => {
      const content = `---
id: JRN-0001
title: Test Journey
status: clarified
tier: smoke
scope: test
actor: user
completion:
  - type: text
    value: "Welcome back"
---

## Acceptance Criteria
### AC-1: Check text
- Text is visible
`;

      const parsed = parseJourneyContent(content);
      expect(parsed.frontmatter.completion).toBeDefined();
      expect(parsed.frontmatter.completion![0]).toEqual({
        type: 'text',
        value: 'Welcome back',
      });
    });

    it('should parse completion signal with timeout', () => {
      const content = `---
id: JRN-0001
title: Test Journey
status: clarified
tier: smoke
scope: test
actor: user
completion:
  - type: url
    value: "/dashboard"
    timeout: 10000
---

## Acceptance Criteria
### AC-1: Navigate
- User navigates
`;

      const parsed = parseJourneyContent(content);
      expect(parsed.frontmatter.completion).toBeDefined();
      expect(parsed.frontmatter.completion![0]).toEqual({
        type: 'url',
        value: '/dashboard',
        timeout: 10000,
      });
    });

    it('should parse multiple completion signals', () => {
      const content = `---
id: JRN-0001
title: Test Journey
status: clarified
tier: smoke
scope: test
actor: user
completion:
  - type: url
    value: "/dashboard"
  - type: toast
    value: "Login successful"
  - type: element
    value: "[data-testid='profile']"
---

## Acceptance Criteria
### AC-1: Login
- User logs in successfully
`;

      const parsed = parseJourneyContent(content);
      expect(parsed.frontmatter.completion).toBeDefined();
      expect(parsed.frontmatter.completion).toHaveLength(3);
      expect(parsed.frontmatter.completion![0].type).toBe('url');
      expect(parsed.frontmatter.completion![1].type).toBe('toast');
      expect(parsed.frontmatter.completion![2].type).toBe('element');
    });

    it('should handle journey without completion signals', () => {
      const content = `---
id: JRN-0001
title: Test Journey
status: defined
tier: smoke
scope: test
actor: user
---

## Acceptance Criteria
### AC-1: Test
- Something happens
`;

      const parsed = parseJourneyContent(content);
      expect(parsed.frontmatter.completion).toBeUndefined();
    });

    it('should reject invalid completion signal type', () => {
      const content = `---
id: JRN-0001
title: Test Journey
status: clarified
tier: smoke
scope: test
actor: user
completion:
  - type: invalid
    value: "test"
---

## Acceptance Criteria
### AC-1: Test
- Test
`;

      expect(() => parseJourneyContent(content)).toThrow();
    });

    it('should reject negative timeout', () => {
      const content = `---
id: JRN-0001
title: Test Journey
status: clarified
tier: smoke
scope: test
actor: user
completion:
  - type: url
    value: "/dashboard"
    timeout: -1000
---

## Acceptance Criteria
### AC-1: Test
- Test
`;

      expect(() => parseJourneyContent(content)).toThrow();
    });
  });

  describe('IR Normalization', () => {
    it('should pass through completion signals to IR', () => {
      const content = `---
id: JRN-0001
title: Test Journey
status: clarified
tier: smoke
scope: test
actor: user
completion:
  - type: url
    value: "/dashboard"
  - type: toast
    value: "Success"
    timeout: 5000
---

## Acceptance Criteria
### AC-1: Login
- User logs in
`;

      const parsed = parseJourneyContent(content);
      const result = normalizeJourney(parsed);

      expect(result.journey.completion).toBeDefined();
      expect(result.journey.completion).toHaveLength(2);
      expect(result.journey.completion![0]).toEqual({
        type: 'url',
        value: '/dashboard',
        timeout: undefined,
      });
      expect(result.journey.completion![1]).toEqual({
        type: 'toast',
        value: 'Success',
        timeout: 5000,
      });
    });

    it('should handle undefined completion signals', () => {
      const content = `---
id: JRN-0001
title: Test Journey
status: defined
tier: smoke
scope: test
actor: user
---

## Acceptance Criteria
### AC-1: Test
- Test
`;

      const parsed = parseJourneyContent(content);
      const result = normalizeJourney(parsed);

      expect(result.journey.completion).toBeUndefined();
    });
  });

  describe('Code Generation', () => {
    it('should generate expectURL assertion for url signal', () => {
      const content = `---
id: JRN-0001
title: Test Journey
status: clarified
tier: smoke
scope: test
actor: user
completion:
  - type: url
    value: "/dashboard"
---

## Acceptance Criteria
### AC-1: Navigate
- Navigate to dashboard
`;

      const parsed = parseJourneyContent(content);
      const result = normalizeJourney(parsed);
      const testResult = generateTest(result.journey);

      expect(testResult.code).toContain('Verify completion');
      expect(testResult.code).toContain('await expect(page).toHaveURL(//dashboard/)');
    });

    it('should generate toast assertion for toast signal', () => {
      const content = `---
id: JRN-0001
title: Test Journey
status: clarified
tier: smoke
scope: test
actor: user
completion:
  - type: toast
    value: "Login successful"
---

## Acceptance Criteria
### AC-1: Login
- User logs in
`;

      const parsed = parseJourneyContent(content);
      const result = normalizeJourney(parsed);
      const testResult = generateTest(result.journey);

      expect(testResult.code).toContain('Verify completion');
      expect(testResult.code).toContain("page.getByRole('alert').getByText('Login successful')");
      expect(testResult.code).toContain('.toBeVisible()');
    });

    it('should generate element assertion for element signal', () => {
      const content = `---
id: JRN-0001
title: Test Journey
status: clarified
tier: smoke
scope: test
actor: user
completion:
  - type: element
    value: "[data-testid='welcome']"
---

## Acceptance Criteria
### AC-1: Check
- Element visible
`;

      const parsed = parseJourneyContent(content);
      const result = normalizeJourney(parsed);
      const testResult = generateTest(result.journey);

      expect(testResult.code).toContain('Verify completion');
      expect(testResult.code).toContain("page.locator('[data-testid=\\&#39;welcome\\&#39;]')");
      expect(testResult.code).toContain('.toBeVisible()');
    });

    it('should generate text assertion for text signal', () => {
      const content = `---
id: JRN-0001
title: Test Journey
status: clarified
tier: smoke
scope: test
actor: user
completion:
  - type: text
    value: "Welcome back"
---

## Acceptance Criteria
### AC-1: Check
- Text visible
`;

      const parsed = parseJourneyContent(content);
      const result = normalizeJourney(parsed);
      const testResult = generateTest(result.journey);

      expect(testResult.code).toContain('Verify completion');
      expect(testResult.code).toContain("page.getByText('Welcome back')");
      expect(testResult.code).toContain('.toBeVisible()');
    });

    it('should include timeout in generated assertion', () => {
      const content = `---
id: JRN-0001
title: Test Journey
status: clarified
tier: smoke
scope: test
actor: user
completion:
  - type: url
    value: "/dashboard"
    timeout: 10000
---

## Acceptance Criteria
### AC-1: Navigate
- Navigate
`;

      const parsed = parseJourneyContent(content);
      const result = normalizeJourney(parsed);
      const testResult = generateTest(result.journey);

      expect(testResult.code).toContain('await expect(page).toHaveURL(//dashboard/, { timeout: 10000 })');
    });

    it('should generate multiple completion assertions', () => {
      const content = `---
id: JRN-0001
title: Test Journey
status: clarified
tier: smoke
scope: test
actor: user
completion:
  - type: url
    value: "/success"
  - type: toast
    value: "Done"
  - type: element
    value: "[data-testid='result']"
---

## Acceptance Criteria
### AC-1: Complete
- Task completes
`;

      const parsed = parseJourneyContent(content);
      const result = normalizeJourney(parsed);
      const testResult = generateTest(result.journey);

      expect(testResult.code).toContain('Verify completion');
      expect(testResult.code).toContain('await expect(page).toHaveURL(//success/)');
      expect(testResult.code).toContain("page.getByRole('alert').getByText('Done')");
      expect(testResult.code).toContain("page.locator('[data-testid=\\&#39;result\\&#39;]')");
    });

    it('should not generate completion step when no signals defined', () => {
      const content = `---
id: JRN-0001
title: Test Journey
status: defined
tier: smoke
scope: test
actor: user
---

## Acceptance Criteria
### AC-1: Test
- Test
`;

      const parsed = parseJourneyContent(content);
      const result = normalizeJourney(parsed);
      const testResult = generateTest(result.journey);

      expect(testResult.code).not.toContain('Verify completion');
    });

    it('should handle special characters in completion values', () => {
      const content = `---
id: JRN-0001
title: Test Journey
status: clarified
tier: smoke
scope: test
actor: user
completion:
  - type: text
    value: "User's profile updated successfully!"
---

## Acceptance Criteria
### AC-1: Update
- Profile updates
`;

      const parsed = parseJourneyContent(content);
      const result = normalizeJourney(parsed);
      const testResult = generateTest(result.journey);

      expect(testResult.code).toContain('Verify completion');
      // Should properly escape the apostrophe with HTML entity
      expect(testResult.code).toContain("User\\&#39;s profile updated successfully!");
    });
  });
});
