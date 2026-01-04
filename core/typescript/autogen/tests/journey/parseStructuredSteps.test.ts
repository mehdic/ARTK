/**
 * Tests for parseStructuredSteps function
 */
import { describe, it, expect } from 'vitest';
import { parseStructuredSteps } from '../../src/journey/parseJourney.js';

describe('parseStructuredSteps', () => {
  it('should parse structured steps with Action, Wait for, and Assert bullets', () => {
    const content = `
### Step 1: Login to Application
- **Action**: Navigate to /login
- **Action**: Fill username with "testuser"
- **Action**: Fill password with "password123"
- **Action**: Click the submit button
- **Wait for**: Dashboard page to load
- **Assert**: Welcome message is visible

### Step 2: Navigate to Settings
- **Action**: Click the settings link
- **Assert**: Settings page is displayed
`;

    const result = parseStructuredSteps(content);

    expect(result).toHaveLength(2);

    // Check first step
    expect(result[0].stepNumber).toBe(1);
    expect(result[0].stepName).toBe('Login to Application');
    expect(result[0].actions).toHaveLength(6);
    expect(result[0].actions[0].type).toBe('action');
    expect(result[0].actions[0].action).toBe('navigate');
    expect(result[0].actions[4].type).toBe('wait');
    expect(result[0].actions[5].type).toBe('assert');

    // Check second step
    expect(result[1].stepNumber).toBe(2);
    expect(result[1].stepName).toBe('Navigate to Settings');
    expect(result[1].actions).toHaveLength(2);
  });

  it('should handle content with no structured steps', () => {
    const content = `
# Some random markdown
This is just regular content without structured steps.
`;

    const result = parseStructuredSteps(content);
    expect(result).toHaveLength(0);
  });

  it('should skip steps with no actions', () => {
    const content = `
### Step 1: Empty Step

### Step 2: Valid Step
- **Action**: Click button
`;

    const result = parseStructuredSteps(content);
    expect(result).toHaveLength(1);
    expect(result[0].stepNumber).toBe(2);
  });

  it('should parse steps that do not match known patterns', () => {
    const content = `
### Step 1: Custom Action
- **Action**: Some custom action that doesn't match patterns
- **Assert**: Something custom happens
`;

    const result = parseStructuredSteps(content);
    expect(result).toHaveLength(1);
    expect(result[0].actions).toHaveLength(2);
    expect(result[0].actions[0].action).toBe('Some custom action that doesn\'t match patterns');
    expect(result[0].actions[0].target).toBe('');
  });
});
