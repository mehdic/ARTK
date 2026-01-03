/**
 * Validation Pipeline Integration Tests
 * @see T038 - Integration test for validation pipeline
 */
import { describe, it, expect } from 'vitest';
import { parseJourneyContent } from '../../src/journey/parseJourney.js';
import { normalizeJourney } from '../../src/journey/normalize.js';
import { generateTest } from '../../src/codegen/generateTest.js';
import { validateCodeSync } from '../../src/validate/code.js';
import { validateJourney } from '../../src/index.js';

// Sample journey for testing
const VALID_JOURNEY = `---
id: JRN-0001
title: User Login Journey
status: clarified
tier: smoke
actor: customer
scope: auth
tags:
  - "@smoke"
  - "@auth"
---

# Login Journey

## Acceptance Criteria

### AC-1: Successful Login
- User navigates to /login
- User enters "username" in "Username" field
- User enters "password" in "Password" field
- User clicks "Login" button
- "Dashboard" should be visible
`;

const DRAFT_JOURNEY = `---
id: JRN-0002
title: Draft Journey
status: defined
tier: smoke
actor: user
scope: test
tags: []
---

# Draft Journey

## Acceptance Criteria

### AC-1: Draft step
- User clicks "Button" button
`;

const UNMAPPED_STEPS_JOURNEY = `---
id: JRN-0003
title: Unmapped Steps Journey
status: clarified
tier: smoke
actor: user
scope: test
tags: []
---

# Unmapped Steps Journey

## Acceptance Criteria

### AC-1: Some unmapped steps
- Do something that cannot be automated
- Verify manually that it works
- Some random action
`;

describe('Validation Pipeline Integration', () => {
  describe('Full validation pipeline', () => {
    it('should validate a well-formed journey', () => {
      const parsed = parseJourneyContent(VALID_JOURNEY, 'valid.journey.md');
      const { journey } = normalizeJourney(parsed);
      const testResult = generateTest(journey);

      const validationResult = validateCodeSync(testResult.code, journey, parsed.frontmatter);

      expect(validationResult.journeyId).toBe('JRN-0001');
      // May have warnings for tags but should pass
      expect(validationResult.counts.errors).toBe(0);
    });

    it('should detect issues in draft journeys', () => {
      const parsed = parseJourneyContent(DRAFT_JOURNEY, 'draft.journey.md');
      const { journey } = normalizeJourney(parsed);
      const testResult = generateTest(journey);

      const validationResult = validateCodeSync(testResult.code, journey, parsed.frontmatter, {
        allowDrafts: false,
      });

      // Should have error for non-clarified status
      expect(validationResult.counts.errors).toBeGreaterThan(0);
      expect(validationResult.issues.some((i) => i.code === 'STATUS_NOT_CLARIFIED')).toBe(true);
    });

    it('should allow draft journeys when configured', () => {
      const parsed = parseJourneyContent(DRAFT_JOURNEY, 'draft.journey.md');
      const { journey } = normalizeJourney(parsed);
      const testResult = generateTest(journey);

      const validationResult = validateCodeSync(testResult.code, journey, parsed.frontmatter, {
        allowDrafts: true,
      });

      // Should pass but may have warnings
      const statusErrors = validationResult.issues.filter(
        (i) => i.code === 'STATUS_NOT_CLARIFIED' && i.severity === 'error'
      );
      expect(statusErrors.length).toBe(0);
    });

    it('should detect low coverage from unmapped steps', () => {
      const parsed = parseJourneyContent(UNMAPPED_STEPS_JOURNEY, 'unmapped.journey.md');
      const { journey } = normalizeJourney(parsed);
      const testResult = generateTest(journey);

      const validationResult = validateCodeSync(testResult.code, journey, parsed.frontmatter, {
        minCoverage: 80,
      });

      // Should have coverage warnings/errors
      const coverageIssues = validationResult.issues.filter(
        (i) => i.code.includes('COVERAGE') || i.code.includes('BLOCKED')
      );
      expect(coverageIssues.length).toBeGreaterThan(0);
    });
  });

  describe('validateJourney API', () => {
    it('should validate journey content directly', async () => {
      const result = await validateJourney(VALID_JOURNEY, {
        isFilePath: false,
      });

      expect(result.journeyId).toBe('JRN-0001');
      expect(result.generatedCode).toBeDefined();
      expect(result.generatedCode).toContain('test.describe');
    });

    it('should handle invalid journey content', async () => {
      const invalidContent = `---
id: invalid
---
No proper structure`;

      const result = await validateJourney(invalidContent, {
        isFilePath: false,
        journeyId: 'invalid',
      });

      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('should include generated code in result', async () => {
      const result = await validateJourney(VALID_JOURNEY, {
        isFilePath: false,
      });

      expect(result.generatedCode).toBeDefined();
      expect(result.generatedCode).toContain("import { test, expect } from '@playwright/test'");
    });
  });

  describe('Forbidden pattern detection in generated code', () => {
    it('should not have forbidden patterns in well-generated code', () => {
      const parsed = parseJourneyContent(VALID_JOURNEY, 'valid.journey.md');
      const { journey } = normalizeJourney(parsed);
      const testResult = generateTest(journey);

      const validationResult = validateCodeSync(testResult.code, journey, parsed.frontmatter);

      // Generated code should not have waitForTimeout, test.only, etc.
      const patternViolations = validationResult.issues.filter(
        (i) =>
          i.code === 'WAIT_TIMEOUT' ||
          i.code === 'TEST_ONLY' ||
          i.code === 'HARDCODED_CREDENTIALS'
      );
      expect(patternViolations.length).toBe(0);
    });
  });

  describe('Tag validation', () => {
    it('should validate tags in generated code', () => {
      const parsed = parseJourneyContent(VALID_JOURNEY, 'valid.journey.md');
      const { journey } = normalizeJourney(parsed);
      const testResult = generateTest(journey);

      const validationResult = validateCodeSync(testResult.code, journey, parsed.frontmatter, {
        validateTags: true,
      });

      expect(validationResult.details.tags).toBeDefined();
    });
  });

  describe('Coverage validation', () => {
    it('should include coverage details', () => {
      const parsed = parseJourneyContent(VALID_JOURNEY, 'valid.journey.md');
      const { journey } = normalizeJourney(parsed);
      const testResult = generateTest(journey);

      const validationResult = validateCodeSync(testResult.code, journey, parsed.frontmatter, {
        validateCoverage: true,
      });

      expect(validationResult.details.coverage).toBeDefined();
      expect(validationResult.details.coverage?.totalACs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Validation report generation', () => {
    it('should provide comprehensive validation summary', () => {
      const parsed = parseJourneyContent(VALID_JOURNEY, 'valid.journey.md');
      const { journey } = normalizeJourney(parsed);
      const testResult = generateTest(journey);

      const validationResult = validateCodeSync(testResult.code, journey, parsed.frontmatter);

      expect(validationResult.timestamp).toBeDefined();
      expect(validationResult.counts).toBeDefined();
      expect(validationResult.details.patterns).toBeDefined();
    });
  });
});

describe('Edge Cases', () => {
  it('should handle journey with empty acceptance criteria', () => {
    const emptyACJourney = `---
id: JRN-0004
title: Empty AC Journey
status: clarified
tier: smoke
actor: user
scope: test
tags: []
---

# Empty Journey

Just some description without ACs.
`;

    const parsed = parseJourneyContent(emptyACJourney, 'empty.journey.md');
    const { journey } = normalizeJourney(parsed);
    const testResult = generateTest(journey);

    const validationResult = validateCodeSync(testResult.code, journey, parsed.frontmatter);

    // Should still produce a result
    expect(validationResult.journeyId).toBe('JRN-0004');
  });

  it('should handle special characters in journey', () => {
    const specialCharsJourney = `---
id: JRN-0005
title: Special Characters Journey
status: clarified
tier: smoke
actor: user
scope: test
tags: []
---

# Special Characters

## Acceptance Criteria

### AC-1: Handle quotes
- Enter "Hello 'World'" in the field
`;

    const parsed = parseJourneyContent(specialCharsJourney, 'special.journey.md');
    const { journey } = normalizeJourney(parsed);
    const testResult = generateTest(journey);

    const validationResult = validateCodeSync(testResult.code, journey, parsed.frontmatter);

    // Should not crash on special characters
    expect(validationResult.journeyId).toBe('JRN-0005');
  });
});
