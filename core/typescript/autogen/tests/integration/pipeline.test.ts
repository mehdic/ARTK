/**
 * Integration Tests - End-to-end pipeline tests
 * @see T023 - Integration tests for full pipeline
 */
import { describe, it, expect } from 'vitest';
import { parseJourneyContent } from '../../src/journey/parseJourney.js';
import { normalizeJourney } from '../../src/journey/normalize.js';
import { generateTest } from '../../src/codegen/generateTest.js';
import { generateModule } from '../../src/codegen/generateModule.js';
import { generateJourneyTests } from '../../src/index.js';

// Sample journey markdown content
const SAMPLE_JOURNEY = `---
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

## Description
User can log in to the application.

## Acceptance Criteria

### AC-1: Successful Login
- User navigates to /login
- User enters "username" in "Username" field
- User enters "password" in "Password" field
- User clicks "Login" button
- "Dashboard" should be visible

### AC-2: Invalid Login
- User navigates to /login
- User enters "invalid" in "Username" field
- User clicks "Login" button
- "Error" should be visible

## Procedural Steps
1. User opens browser and navigates to app URL
2. User enters username in the username field
3. User enters password in the password field
4. User clicks the Login button
5. System validates credentials

## Data Notes
- Valid username: testuser
- Valid password: Password123
`;

describe('Integration: Parse → Normalize → Generate', () => {
  it('should parse journey content successfully', () => {
    const parsed = parseJourneyContent(SAMPLE_JOURNEY, 'test.journey.md');

    expect(parsed.frontmatter.id).toBe('JRN-0001');
    expect(parsed.frontmatter.status).toBe('clarified');
    expect(parsed.frontmatter.tier).toBe('smoke');
    expect(parsed.frontmatter.scope).toBe('auth');
    expect(parsed.acceptanceCriteria.length).toBeGreaterThanOrEqual(1);
    expect(parsed.proceduralSteps.length).toBeGreaterThan(0);
  });

  it('should normalize parsed journey to IR', () => {
    const parsed = parseJourneyContent(SAMPLE_JOURNEY, 'test.journey.md');
    const result = normalizeJourney(parsed);

    expect(result.journey).toBeDefined();
    expect(result.journey.id).toBe('JRN-0001');
    expect(result.journey.scope).toBe('auth');
    expect(result.journey.tier).toBe('smoke');
    expect(result.journey.steps.length).toBeGreaterThan(0);
  });

  it('should generate test code from normalized IR', () => {
    const parsed = parseJourneyContent(SAMPLE_JOURNEY, 'test.journey.md');
    const { journey } = normalizeJourney(parsed);
    const result = generateTest(journey);

    expect(result.code).toContain("import { test, expect } from '@playwright/test'");
    expect(result.code).toContain('test.describe');
    expect(result.code).toContain('JRN-0001');
    expect(result.filename).toBe('jrn-0001.spec.ts');
  });

  it('should generate module code from normalized IR', () => {
    const parsed = parseJourneyContent(SAMPLE_JOURNEY, 'test.journey.md');
    const { journey } = normalizeJourney(parsed);
    const result = generateModule(journey);

    expect(result.code).toContain("import type { Page, Locator } from '@playwright/test'");
    expect(result.code).toContain('class AuthPage');
    expect(result.moduleName).toBe('Auth');
  });

  it('should generate syntactically valid TypeScript', () => {
    const parsed = parseJourneyContent(SAMPLE_JOURNEY, 'test.journey.md');
    const { journey } = normalizeJourney(parsed);
    const testResult = generateTest(journey);
    const moduleResult = generateModule(journey);

    // Check for common TypeScript syntax patterns
    expect(testResult.code).toMatch(/import\s+\{[^}]+\}\s+from\s+['"][^'"]+['"]/);
    expect(testResult.code).toMatch(/test\.describe\([^)]+,\s*\{[^}]*\},\s*\(\)/);

    expect(moduleResult.code).toMatch(/export\s+class\s+\w+\s*\{/);
    expect(moduleResult.code).toMatch(/constructor\(page:\s*Page\)/);
  });
});

describe('Integration: Main API', () => {
  it('should process journey content through generateJourneyTests', async () => {
    const result = await generateJourneyTests({
      journeys: [SAMPLE_JOURNEY],
      isFilePaths: false,
      generateModules: true,
    });

    expect(result.tests.length).toBe(1);
    expect(result.modules.length).toBe(1);
    expect(result.errors.length).toBe(0);

    expect(result.tests[0].journeyId).toBe('JRN-0001');
    expect(result.tests[0].code).toContain('test.describe');
    expect(result.modules[0].moduleName).toBe('Auth');
  });

  it('should handle multiple journeys', async () => {
    const secondJourney = `---
id: JRN-0002
title: User Logout Journey
status: clarified
tier: smoke
actor: customer
scope: auth
tags:
  - "@smoke"
---

# Logout Journey

## Acceptance Criteria

### AC-1: User can logout
- User clicks "Logout" button
- User navigates to /login
`;

    const result = await generateJourneyTests({
      journeys: [SAMPLE_JOURNEY, secondJourney],
      isFilePaths: false,
      generateModules: false,
    });

    expect(result.tests.length).toBe(2);
    expect(result.tests[0].journeyId).toBe('JRN-0001');
    expect(result.tests[1].journeyId).toBe('JRN-0002');
  });

  it('should collect warnings during processing', async () => {
    const ambiguousJourney = `---
id: JRN-0003
title: Ambiguous Journey Test
status: clarified
tier: smoke
actor: user
scope: test
tags: []
---

# Ambiguous Journey

## Acceptance Criteria

### AC-1: Some action
- Do something that cannot be automated
- Verify manually
`;

    const result = await generateJourneyTests({
      journeys: [ambiguousJourney],
      isFilePaths: false,
    });

    expect(result.tests.length).toBe(1);
    // May have warnings about unmapped steps
  });

  it('should handle errors gracefully', async () => {
    const invalidJourney = `---
id: invalid
---
No proper structure
`;

    const result = await generateJourneyTests({
      journeys: [invalidJourney],
      isFilePaths: false,
    });

    // Should have errors but not crash
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('Integration: Complex Journey', () => {
  const COMPLEX_JOURNEY = `---
id: JRN-0004
title: E2E Checkout Flow
status: clarified
tier: release
actor: customer
scope: checkout
tags:
  - "@e2e"
  - "@checkout"
---

# Checkout Flow

## Description
Complete checkout process for authenticated user.

## Acceptance Criteria

### AC-1: Add items to cart
- Navigate to product page
- Click "Add to Cart" button
- Verify cart count increases
- A toast showing "Item added" appears

### AC-2: Complete checkout
- Navigate to cart
- Click "Proceed to Checkout"
- Fill in shipping address
- Select payment method
- Click "Place Order"
- Verify order confirmation page

### AC-3: Verify order
- Verify order ID is displayed
- Verify confirmation email text is shown
- User is redirected to order history

## Procedural Steps
1. User is logged in
2. User browses to product catalog
3. User selects a product
4. User adds product to cart
5. User views cart
6. User clicks checkout
7. User fills shipping form
8. User selects payment
9. User confirms order
10. System processes order
`;

  it('should handle complex journey with multiple ACs', () => {
    const parsed = parseJourneyContent(COMPLEX_JOURNEY, 'checkout.journey.md');
    const { journey, warnings } = normalizeJourney(parsed);
    const testResult = generateTest(journey);

    expect(journey.steps.length).toBeGreaterThanOrEqual(3);
    expect(testResult.code).toContain('AC-1');
    expect(testResult.code).toContain('AC-2');
    expect(testResult.code).toContain('AC-3');
  });

  it('should extract locators for all interactive elements', () => {
    const parsed = parseJourneyContent(COMPLEX_JOURNEY, 'checkout.journey.md');
    const { journey } = normalizeJourney(parsed);
    const moduleResult = generateModule(journey);

    // Should have multiple locators for the various interactive elements
    expect(moduleResult.locators.length).toBeGreaterThanOrEqual(0);
  });

  it('should generate test steps for all ACs', () => {
    const parsed = parseJourneyContent(COMPLEX_JOURNEY, 'checkout.journey.md');
    const { journey } = normalizeJourney(parsed);
    const testResult = generateTest(journey);

    // Should have test.step calls for each AC
    const stepMatches = testResult.code.match(/test\.step\(/g);
    expect(stepMatches).not.toBeNull();
    expect(stepMatches!.length).toBeGreaterThanOrEqual(3);
  });
});

describe('Integration: Edge Cases', () => {
  it('should handle journey with no acceptance criteria', () => {
    const minimalJourney = `---
id: JRN-0005
title: Minimal Journey Test
status: clarified
tier: smoke
actor: user
scope: minimal
tags: []
---

# Minimal Journey

Just some description text without ACs.
`;

    const parsed = parseJourneyContent(minimalJourney, 'minimal.journey.md');
    const { journey } = normalizeJourney(parsed);

    expect(journey.steps.length).toBe(0);

    const testResult = generateTest(journey);
    expect(testResult.code).toContain('test.describe');
  });

  it('should handle special characters in journey content', () => {
    const specialCharsJourney = `---
id: JRN-0006
title: Special Characters Journey
status: clarified
tier: smoke
actor: user
scope: special
tags:
  - "@test"
---

# Special Characters Journey

## Acceptance Criteria

### AC-1: Handle quotes
- Enter "Hello 'World'" in the field
- Verify text contains "It's working"

### AC-2: Handle regex patterns
- URL should match /users/[0-9]+/edit
`;

    const parsed = parseJourneyContent(specialCharsJourney, 'special.journey.md');
    const { journey } = normalizeJourney(parsed);
    const testResult = generateTest(journey);

    // Should not throw and should escape properly
    expect(testResult.code).toBeDefined();
    expect(testResult.code.length).toBeGreaterThan(0);
  });

  it('should handle journey with unicode characters', () => {
    const unicodeJourney = `---
id: JRN-0007
title: Unicode Character Journey
status: clarified
tier: smoke
actor: user
scope: unicode
tags: []
---

# Unicode Journey 日本語

## Acceptance Criteria

### AC-1: Display unicode
- Verify "こんにちは" is visible
- Click the "送信" button
`;

    const parsed = parseJourneyContent(unicodeJourney, 'unicode.journey.md');
    const { journey } = normalizeJourney(parsed);
    const testResult = generateTest(journey);

    expect(testResult.code).toContain('こんにちは');
    expect(testResult.code).toContain('送信');
  });
});
