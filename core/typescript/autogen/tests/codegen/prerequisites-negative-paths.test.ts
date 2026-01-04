/**
 * Integration Tests for Prerequisites and Negative Paths Code Generation
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseJourneyContent } from '../../src/journey/parseJourney.js';
import { normalizeJourney } from '../../src/journey/normalize.js';
import { generateTest } from '../../src/codegen/generateTest.js';

describe('Prerequisites Code Generation', () => {
  it('should generate test with prerequisites comment', () => {
    const journeyPath = join(
      process.cwd(),
      'tests/fixtures/journeys/JRN-9001-prerequisites-demo.md'
    );
    const journeyContent = readFileSync(journeyPath, 'utf-8');
    const journey = parseJourneyContent(journeyContent);
    const { journey: ir } = normalizeJourney(journey);
    const result = generateTest(ir);

    expect(result.code).toContain('// Prerequisites:');
    expect(result.code).toContain('JRN-0001');
    expect(result.code).toContain('Use Playwright project dependencies or test.beforeAll()');
  });

  it('should generate valid TypeScript for journey with prerequisites', () => {
    const journeyPath = join(
      process.cwd(),
      'tests/fixtures/journeys/JRN-9001-prerequisites-demo.md'
    );
    const journeyContent = readFileSync(journeyPath, 'utf-8');
    const journey = parseJourneyContent(journeyContent);
    const { journey: ir } = normalizeJourney(journey);
    const result = generateTest(ir);

    // Should be valid TypeScript with import and test structure
    expect(result.code).toContain("import { test, expect } from '@playwright/test'");
    expect(result.code).toContain('test.describe(');
    expect(result.code).toContain('test(');
  });
});

describe('Negative Paths Code Generation', () => {
  it('should generate negative path tests', () => {
    const journeyPath = join(
      process.cwd(),
      'tests/fixtures/journeys/JRN-9002-negative-paths-demo.md'
    );
    const journeyContent = readFileSync(journeyPath, 'utf-8');
    const journey = parseJourneyContent(journeyContent);
    const { journey: ir } = normalizeJourney(journey);
    const result = generateTest(ir);

    // Should contain negative paths section
    expect(result.code).toContain('// Negative Paths - Error Scenario Testing');
    expect(result.code).toContain("test.describe('Negative paths'");
  });

  it('should generate test for each negative path', () => {
    const journeyPath = join(
      process.cwd(),
      'tests/fixtures/journeys/JRN-9002-negative-paths-demo.md'
    );
    const journeyContent = readFileSync(journeyPath, 'utf-8');
    const journey = parseJourneyContent(journeyContent);
    const { journey: ir } = normalizeJourney(journey);
    const result = generateTest(ir);

    // Should have all three negative path tests
    expect(result.code).toContain("test('invalid_password should show error'");
    expect(result.code).toContain("test('missing_username should show error'");
    expect(result.code).toContain("test('missing_password should show error'");
  });

  it('should generate assertions for expected errors', () => {
    const journeyPath = join(
      process.cwd(),
      'tests/fixtures/journeys/JRN-9002-negative-paths-demo.md'
    );
    const journeyContent = readFileSync(journeyPath, 'utf-8');
    const journey = parseJourneyContent(journeyContent);
    const { journey: ir } = normalizeJourney(journey);
    const result = generateTest(ir);

    // Should contain error assertions
    expect(result.code).toContain("toContainText('Invalid credentials')");
    expect(result.code).toContain("toContainText('Username is required')");
    expect(result.code).toContain("toContainText('Password is required')");
  });

  it('should use custom error element selectors', () => {
    const journeyPath = join(
      process.cwd(),
      'tests/fixtures/journeys/JRN-9002-negative-paths-demo.md'
    );
    const journeyContent = readFileSync(journeyPath, 'utf-8');
    const journey = parseJourneyContent(journeyContent);
    const { journey: ir } = normalizeJourney(journey);
    const result = generateTest(ir);

    // Should use specified error elements (now using getByTestId for data-testid selectors)
    expect(result.code).toContain("getByTestId('login-error')");
    expect(result.code).toContain("getByTestId('username-error')");
    expect(result.code).toContain("getByTestId('password-error')");
  });

  it('should fill inputs using getByLabel', () => {
    const journeyPath = join(
      process.cwd(),
      'tests/fixtures/journeys/JRN-9002-negative-paths-demo.md'
    );
    const journeyContent = readFileSync(journeyPath, 'utf-8');
    const journey = parseJourneyContent(journeyContent);
    const { journey: ir } = normalizeJourney(journey);
    const result = generateTest(ir);

    // Should fill inputs using getByLabel (not just comments)
    expect(result.code).toContain("getByLabel('Username'");
    expect(result.code).toContain("getByLabel('Password'");
    expect(result.code).toContain('.fill(');
    // Should still include comment for expected error
    expect(result.code).toContain('// Assert error message');
  });
});

describe('Combined Features', () => {
  it('should handle journey with both prerequisites and negative paths', () => {
    // Create a journey with both features
    const journeyMd = `---
id: JRN-9003
title: Profile Edit with Validation
status: clarified
tier: regression
scope: profile
actor: authenticated-user
prerequisites:
  - JRN-0001
modules:
  foundation:
    - auth
    - navigation
  features:
    - profile
completion:
  - type: url
    value: /profile
negativePaths:
  - name: invalid_email
    input:
      email: not-an-email
    expectedError: Invalid email format
tags:
  - regression
---

# Profile Edit

## Acceptance Criteria

### AC-1: Update email
**Given** user is authenticated
**When** user updates email
**Then** profile is updated
`;

    const journey = parseJourneyContent(journeyMd);
    const { journey: ir } = normalizeJourney(journey);
    const result = generateTest(ir);

    // Should have both features
    expect(result.code).toContain('// Prerequisites:');
    expect(result.code).toContain('JRN-0001');
    expect(result.code).toContain("test.describe('Negative paths'");
    expect(result.code).toContain("test('invalid_email should show error'");
  });
});
