import { describe, it, expect } from 'vitest';
import {
  parseStepsFromContent,
  hasMachineHints,
  isStructuredFormat,
  validateJourneyFormat,
  attemptAutoFix,
  applyAutoFixes,
  formatValidationResult,
} from '../../src/journey/validator.js';

describe('parseStepsFromContent', () => {
  it('parses numbered steps', () => {
    const content = `
## Steps

1. Navigate to /login
2. Click the Login button
3. Enter username
`;
    const steps = parseStepsFromContent(content);
    expect(steps.length).toBe(3);
    expect(steps[0].text).toContain('Navigate');
  });

  it('parses structured format steps', () => {
    const content = `
## Procedure

1. **Action**: Click Submit button \`(role=button, name=Submit)\`
2. **Assert**: User sees Welcome \`(text=Welcome)\`
`;
    const steps = parseStepsFromContent(content);
    expect(steps.length).toBe(2);
    expect(steps[0].text).toContain('Click Submit button');
  });

  it('ignores non-step content', () => {
    const content = `
# Journey Title

## Description
This is a description, not a step.

## Steps
1. Actual step
`;
    const steps = parseStepsFromContent(content);
    expect(steps.length).toBe(1);
  });
});

describe('hasMachineHints', () => {
  it('detects backtick-enclosed hints', () => {
    expect(hasMachineHints('Click button `(role=button, name=Submit)`')).toBe(true);
  });

  it('detects role= pattern', () => {
    expect(hasMachineHints('Click role=button name=Submit')).toBe(true);
  });

  it('detects testid= pattern', () => {
    expect(hasMachineHints('Fill testid=username-input')).toBe(true);
  });

  it('returns false when no hints', () => {
    expect(hasMachineHints('Click the Submit button')).toBe(false);
  });
});

describe('isStructuredFormat', () => {
  it('detects Action format', () => {
    expect(isStructuredFormat('**Action**: Click button')).toBe(true);
  });

  it('detects Assert format', () => {
    expect(isStructuredFormat('**Assert**: User sees message')).toBe(true);
  });

  it('detects Wait for format', () => {
    expect(isStructuredFormat('**Wait for**: Page to load')).toBe(true);
  });

  it('returns false for plain text', () => {
    expect(isStructuredFormat('Click the button')).toBe(false);
  });
});

describe('validateJourneyFormat', () => {
  it('validates journey with hints as valid', () => {
    const content = `
## Steps
1. **Action**: Click Login button \`(role=button, name=Login)\`
2. **Assert**: Dashboard visible \`(text=Dashboard)\`
`;
    const result = validateJourneyFormat(content);
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('flags interaction steps without hints', () => {
    const content = `
## Steps
1. Click the Submit button
2. Enter username in field
`;
    const result = validateJourneyFormat(content);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('provides suggestions for invalid steps', () => {
    const content = `
## Steps
1. Click 'Login' button
`;
    const result = validateJourneyFormat(content);
    expect(result.errors[0].suggestion).toBeDefined();
  });

  it('generates auto-fix suggestions', () => {
    const content = `
## Steps
1. Click 'Submit' button
`;
    const result = validateJourneyFormat(content);
    expect(result.autoFixable.length).toBeGreaterThan(0);
  });
});

describe('attemptAutoFix', () => {
  it('fixes click button steps', () => {
    const fix = attemptAutoFix("Click 'Submit' button");
    expect(fix).not.toBeNull();
    expect(fix?.fixed).toContain('role=button');
    expect(fix?.confidence).toBeGreaterThan(0.8);
  });

  it('fixes input field steps', () => {
    const fix = attemptAutoFix("Enter value in 'Username' field");
    expect(fix).not.toBeNull();
    expect(fix?.fixed).toContain('role=textbox');
  });

  it('returns null for steps already with hints', () => {
    const fix = attemptAutoFix('Click button `(role=button)`');
    expect(fix).toBeNull();
  });

  it('returns null for steps without quoted element', () => {
    const fix = attemptAutoFix('Click the button');
    expect(fix).toBeNull();
  });
});

describe('applyAutoFixes', () => {
  it('applies fixes to content', () => {
    const content = "1. Click 'Submit' button\n2. See 'Welcome'";
    const fixes = [
      { line: 1, original: "'Submit' button", fixed: "'Submit' button `(role=button)`", confidence: 0.9 },
    ];
    const fixed = applyAutoFixes(content, fixes);
    expect(fixed).toContain('role=button');
  });
});

describe('formatValidationResult', () => {
  it('shows valid status for valid journeys', () => {
    const result = {
      valid: true,
      errors: [],
      warnings: [],
      autoFixable: [],
      summary: { totalSteps: 2, validSteps: 2, stepsWithHints: 2, stepsWithoutHints: 0 },
    };
    const output = formatValidationResult(result);
    expect(output).toContain('✅');
    expect(output).toContain('AutoGen-compatible');
  });

  it('shows error count for invalid journeys', () => {
    const result = {
      valid: false,
      errors: [{ line: 1, step: 'Click button', error: 'Missing hint' }],
      warnings: [],
      autoFixable: [],
      summary: { totalSteps: 1, validSteps: 0, stepsWithHints: 0, stepsWithoutHints: 1 },
    };
    const output = formatValidationResult(result);
    expect(output).toContain('❌');
    expect(output).toContain('1 errors');
  });
});
