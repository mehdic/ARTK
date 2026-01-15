/**
 * Tests for Journey Parser
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import {
  parseJourney,
  parseJourneyContent,
  parseJourneyForAutoGen,
  tryParseJourneyContent,
  JourneyParseError,
} from '../../src/journey/parseJourney.js';
import { CodedError } from '../../src/utils/result.js';

describe('Journey Parser', () => {
  const testDir = join(process.cwd(), 'test-fixtures', 'journey-test');

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  const validFrontmatter = `---
id: JRN-0001
title: User Login Journey
status: clarified
tier: smoke
scope: auth
actor: standard-user
revision: 1
modules:
  foundation:
    - auth
    - navigation
  features: []
completion:
  - type: url
    value: /dashboard
  - type: toast
    value: Welcome back
data:
  strategy: reuse
  cleanup: none
tags:
  - critical
  - smoke
---`;

  const validBody = `
# User Login Journey

## Acceptance Criteria

### AC-1: Navigate to Login
- User opens the application
- Login page is displayed
- "Sign In" heading is visible

### AC-2: Enter Credentials
- User enters email in "Email" field
- User enters password in "Password" field
- User clicks "Sign In" button

### AC-3: Verify Login Success
- User sees dashboard
- Welcome toast appears
- URL contains /dashboard

## Procedural Steps

1. Navigate to /login (AC-1)
2. Fill email field with test@example.com (AC-2)
3. Fill password field with secret (AC-2)
4. Click Sign In button (AC-2)
5. Verify dashboard is visible (AC-3)

## Data Notes

- Use test user: test@example.com
- Password stored in secrets manager
`;

  describe('parseJourney', () => {
    it('parses a valid journey file', () => {
      const filePath = join(testDir, 'login.journey.md');
      writeFileSync(filePath, validFrontmatter + validBody);

      const result = parseJourney(filePath);

      expect(result.frontmatter.id).toBe('JRN-0001');
      expect(result.frontmatter.title).toBe('User Login Journey');
      expect(result.frontmatter.status).toBe('clarified');
      expect(result.frontmatter.tier).toBe('smoke');
      expect(result.frontmatter.scope).toBe('auth');
      expect(result.frontmatter.actor).toBe('standard-user');
      expect(result.sourcePath).toBe(filePath);
    });

    it('parses frontmatter modules', () => {
      const filePath = join(testDir, 'login.journey.md');
      writeFileSync(filePath, validFrontmatter + validBody);

      const result = parseJourney(filePath);

      expect(result.frontmatter.modules.foundation).toContain('auth');
      expect(result.frontmatter.modules.foundation).toContain('navigation');
    });

    it('parses completion signals', () => {
      const filePath = join(testDir, 'login.journey.md');
      writeFileSync(filePath, validFrontmatter + validBody);

      const result = parseJourney(filePath);

      expect(result.frontmatter.completion).toHaveLength(2);
      expect(result.frontmatter.completion![0]).toEqual({
        type: 'url',
        value: '/dashboard',
      });
      expect(result.frontmatter.completion![1]).toEqual({
        type: 'toast',
        value: 'Welcome back',
      });
    });

    it('parses data config', () => {
      const filePath = join(testDir, 'login.journey.md');
      writeFileSync(filePath, validFrontmatter + validBody);

      const result = parseJourney(filePath);

      expect(result.frontmatter.data).toEqual({
        strategy: 'reuse',
        cleanup: 'none',
      });
    });

    it('parses tags', () => {
      const filePath = join(testDir, 'login.journey.md');
      writeFileSync(filePath, validFrontmatter + validBody);

      const result = parseJourney(filePath);

      expect(result.frontmatter.tags).toContain('critical');
      expect(result.frontmatter.tags).toContain('smoke');
    });

    it('throws JourneyParseError for missing file', () => {
      const badPath = join(testDir, 'nonexistent.journey.md');

      expect(() => parseJourney(badPath)).toThrow(JourneyParseError);
      expect(() => parseJourney(badPath)).toThrow('Journey file not found');
    });

    it('throws JourneyParseError for missing frontmatter', () => {
      const filePath = join(testDir, 'no-frontmatter.journey.md');
      writeFileSync(filePath, '# Just a heading\n\nNo frontmatter here.');

      expect(() => parseJourney(filePath)).toThrow(JourneyParseError);
      expect(() => parseJourney(filePath)).toThrow('Invalid frontmatter');
    });

    it('throws JourneyParseError for invalid YAML', () => {
      const filePath = join(testDir, 'bad-yaml.journey.md');
      writeFileSync(filePath, '---\nid: JRN-0001\n  bad: indent\n---\n');

      expect(() => parseJourney(filePath)).toThrow(JourneyParseError);
      expect(() => parseJourney(filePath)).toThrow('Invalid YAML');
    });

    it('throws JourneyParseError for invalid frontmatter schema', () => {
      const filePath = join(testDir, 'bad-schema.journey.md');
      writeFileSync(
        filePath,
        `---
id: INVALID-ID
title: Test
status: clarified
tier: smoke
scope: test
actor: user
---
`
      );

      expect(() => parseJourney(filePath)).toThrow(JourneyParseError);
      expect(() => parseJourney(filePath)).toThrow('Invalid journey frontmatter');
    });
  });

  describe('parseJourneyContent', () => {
    it('parses journey from string content', () => {
      const content = validFrontmatter + validBody;

      const result = parseJourneyContent(content);

      expect(result.frontmatter.id).toBe('JRN-0001');
      expect(result.sourcePath).toBe('virtual.journey.md');
    });

    it('accepts custom virtual path', () => {
      const content = validFrontmatter + validBody;

      const result = parseJourneyContent(content, 'test/login.journey.md');

      expect(result.sourcePath).toBe('test/login.journey.md');
    });

    it('parses acceptance criteria', () => {
      const content = validFrontmatter + validBody;

      const result = parseJourneyContent(content);

      expect(result.acceptanceCriteria).toHaveLength(3);
      expect(result.acceptanceCriteria[0].id).toBe('AC-1');
      expect(result.acceptanceCriteria[0].title).toBe('Navigate to Login');
      expect(result.acceptanceCriteria[0].steps).toContain('User opens the application');
    });

    it('parses procedural steps', () => {
      const content = validFrontmatter + validBody;

      const result = parseJourneyContent(content);

      expect(result.proceduralSteps).toHaveLength(5);
      expect(result.proceduralSteps[0].number).toBe(1);
      expect(result.proceduralSteps[0].text).toContain('Navigate to /login');
      expect(result.proceduralSteps[0].linkedAC).toBe('AC-1');
    });

    it('parses data notes', () => {
      const content = validFrontmatter + validBody;

      const result = parseJourneyContent(content);

      expect(result.dataNotes).toHaveLength(2);
      expect(result.dataNotes).toContain('Use test user: test@example.com');
    });

    it('handles missing acceptance criteria section', () => {
      const content = `---
id: JRN-0002
title: Minimal Journey
status: clarified
tier: smoke
scope: test
actor: user
completion:
  - type: url
    value: /done
---

# Minimal Journey

Just some content without AC section.
`;

      const result = parseJourneyContent(content);

      expect(result.acceptanceCriteria).toHaveLength(0);
    });

    it('handles missing procedural steps section', () => {
      const content = `---
id: JRN-0002
title: Minimal Journey
status: clarified
tier: smoke
scope: test
actor: user
completion:
  - type: url
    value: /done
---

# Minimal Journey

## Acceptance Criteria

### AC-1: Do Something
- Step one
- Step two
`;

      const result = parseJourneyContent(content);

      expect(result.proceduralSteps).toHaveLength(0);
    });

    it('handles bullet steps with various formats', () => {
      const content = `---
id: JRN-0003
title: Bullet Test
status: clarified
tier: smoke
scope: test
actor: user
completion:
  - type: url
    value: /done
---

## Acceptance Criteria

### AC-1: Various Bullets
- Step with dash
* Step with asterisk
- Another dash step
`;

      const result = parseJourneyContent(content);

      expect(result.acceptanceCriteria[0].steps).toHaveLength(3);
      expect(result.acceptanceCriteria[0].steps).toContain('Step with dash');
      expect(result.acceptanceCriteria[0].steps).toContain('Step with asterisk');
    });
  });

  describe('parseJourneyForAutoGen', () => {
    it('parses a clarified journey', () => {
      const filePath = join(testDir, 'clarified.journey.md');
      writeFileSync(filePath, validFrontmatter + validBody);

      const result = parseJourneyForAutoGen(filePath);

      expect(result.frontmatter.status).toBe('clarified');
    });

    it('throws for non-clarified journey', () => {
      const content = `---
id: JRN-0004
title: Proposed Journey
status: proposed
tier: smoke
scope: test
actor: user
---

# Not Ready for AutoGen
`;
      const filePath = join(testDir, 'proposed.journey.md');
      writeFileSync(filePath, content);

      expect(() => parseJourneyForAutoGen(filePath)).toThrow(JourneyParseError);
      expect(() => parseJourneyForAutoGen(filePath)).toThrow('not ready for AutoGen');
    });

    it('throws for journey without completion signals', () => {
      const content = `---
id: JRN-0005
title: No Completion
status: clarified
tier: smoke
scope: test
actor: user
---

# No Completion Signals
`;
      const filePath = join(testDir, 'no-completion.journey.md');
      writeFileSync(filePath, content);

      expect(() => parseJourneyForAutoGen(filePath)).toThrow(JourneyParseError);
      expect(() => parseJourneyForAutoGen(filePath)).toThrow('completion signals');
    });
  });

  describe('AC parsing edge cases', () => {
    it('handles AC with colon in title', () => {
      const content = `---
id: JRN-0006
title: Edge Case
status: clarified
tier: smoke
scope: test
actor: user
completion:
  - type: url
    value: /done
---

## Acceptance Criteria

### AC-1: Login: Admin User Access
- Admin can login
`;

      const result = parseJourneyContent(content);

      expect(result.acceptanceCriteria[0].title).toBe('Login: Admin User Access');
    });

    it('handles lowercase AC ids', () => {
      const content = `---
id: JRN-0007
title: Lowercase AC
status: clarified
tier: smoke
scope: test
actor: user
completion:
  - type: url
    value: /done
---

## Acceptance Criteria

### ac-1: Lowercase test
- Step one
`;

      const result = parseJourneyContent(content);

      expect(result.acceptanceCriteria[0].id).toBe('AC-1');
    });

    it('handles multiple ACs in sequence', () => {
      const content = `---
id: JRN-0008
title: Multiple ACs
status: clarified
tier: smoke
scope: test
actor: user
completion:
  - type: url
    value: /done
---

## Acceptance Criteria

### AC-1: First
- Step 1a
- Step 1b

### AC-2: Second
- Step 2a

### AC-3: Third
- Step 3a
- Step 3b
- Step 3c
`;

      const result = parseJourneyContent(content);

      expect(result.acceptanceCriteria).toHaveLength(3);
      expect(result.acceptanceCriteria[0].steps).toHaveLength(2);
      expect(result.acceptanceCriteria[1].steps).toHaveLength(1);
      expect(result.acceptanceCriteria[2].steps).toHaveLength(3);
    });
  });

  describe('Procedural step parsing', () => {
    it('extracts AC references from steps', () => {
      const content = `---
id: JRN-0009
title: Step References
status: clarified
tier: smoke
scope: test
actor: user
completion:
  - type: url
    value: /done
---

## Procedural Steps

1. Do first thing (AC-1)
2. Do second thing (AC-2)
3. Do third thing without reference
`;

      const result = parseJourneyContent(content);

      expect(result.proceduralSteps[0].linkedAC).toBe('AC-1');
      expect(result.proceduralSteps[1].linkedAC).toBe('AC-2');
      expect(result.proceduralSteps[2].linkedAC).toBeUndefined();
    });

    it('removes AC reference from step text', () => {
      const content = `---
id: JRN-0010
title: Clean Step Text
status: clarified
tier: smoke
scope: test
actor: user
completion:
  - type: url
    value: /done
---

## Procedural Steps

1. Do the thing (AC-1)
`;

      const result = parseJourneyContent(content);

      expect(result.proceduralSteps[0].text).toBe('Do the thing');
      expect(result.proceduralSteps[0].text).not.toContain('AC-1');
    });

    it('handles bullet-style procedural steps when no numbered', () => {
      const content = `---
id: JRN-0011
title: Bullet Steps
status: clarified
tier: smoke
scope: test
actor: user
completion:
  - type: url
    value: /done
---

## Procedural Steps

- First step
- Second step
- Third step
`;

      const result = parseJourneyContent(content);

      expect(result.proceduralSteps).toHaveLength(3);
      expect(result.proceduralSteps[0].number).toBe(1);
      expect(result.proceduralSteps[0].text).toBe('First step');
    });
  });

  describe('Data notes parsing', () => {
    it('handles various data section names', () => {
      const sections = [
        '## Data Notes',
        '## Environment Notes',
        '## Data/Environment Notes',
        '## Data',
        '## Environment',
      ];

      for (const section of sections) {
        const content = `---
id: JRN-0012
title: Data Section Test
status: clarified
tier: smoke
scope: test
actor: user
completion:
  - type: url
    value: /done
---

${section}

- Note one
- Note two
`;

        const result = parseJourneyContent(content);
        expect(result.dataNotes.length).toBeGreaterThan(0);
      }
    });
  });

  describe('tryParseJourneyContent (Result type)', () => {
    const validContent = `---
id: JRN-0001
title: User Login Journey
status: clarified
tier: smoke
scope: auth
actor: standard-user
completion:
  - type: url
    value: /dashboard
---

# User Login Journey

## Acceptance Criteria

### AC-1: Navigate to Login
- User opens the application
`;

    it('returns success Result for valid journey content', () => {
      const result = tryParseJourneyContent(validContent);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.frontmatter.id).toBe('JRN-0001');
        expect(result.value.frontmatter.title).toBe('User Login Journey');
        expect(result.value.frontmatter.status).toBe('clarified');
        expect(result.value.sourcePath).toBe('virtual.journey.md');
      }
    });

    it('returns success with custom virtual path', () => {
      const result = tryParseJourneyContent(validContent, 'custom/path.md');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.sourcePath).toBe('custom/path.md');
      }
    });

    it('returns error Result for missing frontmatter', () => {
      const content = '# Just a heading\n\nNo frontmatter here.';

      const result = tryParseJourneyContent(content);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(CodedError);
        expect(result.error.code).toBe('FRONTMATTER_NOT_FOUND');
        expect(result.error.message).toContain('No YAML frontmatter found');
      }
    });

    it('returns error Result for invalid YAML', () => {
      const content = '---\nid: JRN-0001\n  bad: indent\n---\n';

      const result = tryParseJourneyContent(content);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(CodedError);
        expect(result.error.code).toBe('YAML_PARSE_ERROR');
        expect(result.error.message).toContain('Invalid YAML');
      }
    });

    it('returns error Result for invalid frontmatter schema', () => {
      const content = `---
id: INVALID-ID
title: Test
status: clarified
tier: smoke
scope: test
actor: user
---
`;

      const result = tryParseJourneyContent(content);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(CodedError);
        expect(result.error.code).toBe('FRONTMATTER_VALIDATION_ERROR');
        expect(result.error.message).toContain('Invalid journey frontmatter');
        expect(result.error.details).toHaveProperty('issues');
      }
    });

    it('includes path in error details', () => {
      const content = '# No frontmatter';

      const result = tryParseJourneyContent(content, 'test/journey.md');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.details).toHaveProperty('path', 'test/journey.md');
      }
    });

    it('parses acceptance criteria on success', () => {
      const result = tryParseJourneyContent(validContent);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.acceptanceCriteria).toHaveLength(1);
        expect(result.value.acceptanceCriteria[0].id).toBe('AC-1');
        expect(result.value.acceptanceCriteria[0].title).toBe('Navigate to Login');
      }
    });

    it('returns equivalent data to parseJourneyContent for valid input', () => {
      // Both functions should return the same data structure for valid input
      const tryResult = tryParseJourneyContent(validContent);
      const throwResult = parseJourneyContent(validContent);

      expect(tryResult.success).toBe(true);
      if (tryResult.success) {
        expect(tryResult.value.frontmatter).toEqual(throwResult.frontmatter);
        expect(tryResult.value.body).toEqual(throwResult.body);
        expect(tryResult.value.acceptanceCriteria).toEqual(throwResult.acceptanceCriteria);
        expect(tryResult.value.proceduralSteps).toEqual(throwResult.proceduralSteps);
        expect(tryResult.value.dataNotes).toEqual(throwResult.dataNotes);
        expect(tryResult.value.sourcePath).toEqual(throwResult.sourcePath);
      }
    });
  });
});
