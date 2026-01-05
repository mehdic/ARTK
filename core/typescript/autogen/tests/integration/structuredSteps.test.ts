import { describe, it, expect } from 'vitest';
import { parseStructuredSteps } from '../../src/journey/parseJourney.js';

describe('structured steps integration', () => {
  const sampleJourney = `
### Step 1: Login to Application
- **Action**: Navigate to /login
- **Action**: Fill username with "testuser"
- **Action**: Fill password with "password123"
- **Action**: Click the submit button
- **Wait for**: Dashboard page to load
- **Assert**: Welcome message is visible

### Step 2: Navigate to Settings
- **Action**: Click the settings link
- **Wait for**: Settings page to load
- **Assert**: Settings form is visible
`;

  it('should parse multiple steps from Journey markdown', () => {
    const steps = parseStructuredSteps(sampleJourney);
    expect(steps).toHaveLength(2);
    expect(steps[0].stepNumber).toBe(1);
    expect(steps[0].stepName).toBe('Login to Application');
    expect(steps[1].stepNumber).toBe(2);
    expect(steps[1].stepName).toBe('Navigate to Settings');
  });

  it('should extract actions from step bullets', () => {
    const steps = parseStructuredSteps(sampleJourney);
    const loginStep = steps[0];
    expect(loginStep.actions.length).toBeGreaterThan(0);

    // Check for navigate action (goto primitive)
    const navigateAction = loginStep.actions.find(a => a.action === 'navigate');
    expect(navigateAction).toBeTruthy();
    expect(navigateAction?.type).toBe('action');
    expect(navigateAction?.target).toBe('/login');

    // Check for fill actions (pattern not matched, so stored as raw text)
    const fillActions = loginStep.actions.filter(a => a.action.includes('Fill'));
    expect(fillActions.length).toBeGreaterThanOrEqual(2);
    expect(fillActions[0].action).toContain('username');
    expect(fillActions[1].action).toContain('password');

    // Check for click action
    const clickActions = loginStep.actions.filter(a => a.action === 'click');
    expect(clickActions.length).toBeGreaterThan(0);
    expect(clickActions[0]?.type).toBe('action');
  });

  it('should handle wait and assert actions', () => {
    const steps = parseStructuredSteps(sampleJourney);
    const loginStep = steps[0];

    // Check for wait action - Wait for "page to load" becomes waitForLoadingComplete
    const waitAction = loginStep.actions.find(a => a.type === 'wait');
    expect(waitAction).toBeTruthy();
    // The action field depends on what the pattern matcher returns
    expect(waitAction?.type).toBe('wait');

    // Check for assert action
    const assertAction = loginStep.actions.find(a => a.type === 'assert');
    expect(assertAction).toBeTruthy();
    expect(assertAction?.type).toBe('assert');
    expect(assertAction?.action).toBe('expectVisible');
  });

  it('should handle Journey with no structured steps gracefully', () => {
    const plainJourney = '# Just some markdown\n\nNo steps here.';
    const steps = parseStructuredSteps(plainJourney);
    expect(steps).toHaveLength(0);
  });

  it('should parse fill action with values correctly', () => {
    const steps = parseStructuredSteps(sampleJourney);
    const loginStep = steps[0];

    // Find fill actions (stored as raw text when pattern doesn't match)
    const fillActions = loginStep.actions.filter(a => a.action.includes('Fill'));
    expect(fillActions.length).toBeGreaterThanOrEqual(2);

    // The fill actions should contain the values in the action text
    const usernameAction = fillActions.find(a => a.action.includes('testuser'));
    expect(usernameAction).toBeTruthy();
    expect(usernameAction?.action).toContain('username');

    const passwordAction = fillActions.find(a => a.action.includes('password123'));
    expect(passwordAction).toBeTruthy();
    expect(passwordAction?.action).toContain('password');
  });

  it('should handle multiple steps with different action types', () => {
    const steps = parseStructuredSteps(sampleJourney);

    // First step should have action, wait, and assert types
    const step1Types = new Set(steps[0].actions.map(a => a.type));
    expect(step1Types.has('action')).toBe(true);
    expect(step1Types.has('wait')).toBe(true);
    expect(step1Types.has('assert')).toBe(true);

    // Second step should also have action, wait, and assert
    const step2Types = new Set(steps[1].actions.map(a => a.type));
    expect(step2Types.has('action')).toBe(true);
    expect(step2Types.has('wait')).toBe(true);
    expect(step2Types.has('assert')).toBe(true);
  });

  it('should handle edge case with empty steps section', () => {
    const emptyStepsJourney = `
### Step 1: Empty Step
`;
    const steps = parseStructuredSteps(emptyStepsJourney);
    // Step without actions should not be included
    expect(steps).toHaveLength(0);
  });

  it('should handle complex journey with actor values', () => {
    const actorJourney = `
### Step 1: Login with Actor Data
- **Action**: Navigate to /login
- **Action**: Fill username with {{email}}
- **Action**: Fill password with {{password}}
- **Action**: Click the login button
- **Assert**: Dashboard is visible
`;
    const steps = parseStructuredSteps(actorJourney);
    expect(steps).toHaveLength(1);

    const step = steps[0];
    const fillActions = step.actions.filter(a => a.action.includes('Fill'));
    expect(fillActions.length).toBeGreaterThanOrEqual(2);

    // Actor values are stored in the raw action text when pattern doesn't match
    const emailAction = fillActions.find(a => a.action.includes('{{email}}'));
    expect(emailAction).toBeTruthy();
    expect(emailAction?.action).toContain('username');

    const passwordAction = fillActions.find(a => a.action.includes('{{password}}'));
    expect(passwordAction).toBeTruthy();
    expect(passwordAction?.action).toContain('password');
  });

  it('should correctly identify action types for each structured bullet', () => {
    const mixedJourney = `
### Step 1: Mixed Actions
- **Action**: Click the start button
- **Wait for**: Loading spinner to disappear
- **Assert**: Result panel is visible
`;
    const steps = parseStructuredSteps(mixedJourney);
    expect(steps).toHaveLength(1);

    const actions = steps[0].actions;
    expect(actions).toHaveLength(3);

    expect(actions[0].type).toBe('action');
    expect(actions[1].type).toBe('wait');
    expect(actions[2].type).toBe('assert');
  });

  it('should handle step numbers correctly when parsed', () => {
    const multiStepJourney = `
### Step 1: First Step
- **Action**: Click button A

### Step 5: Fifth Step
- **Action**: Click button B

### Step 10: Tenth Step
- **Action**: Click button C
`;
    const steps = parseStructuredSteps(multiStepJourney);
    expect(steps).toHaveLength(3);

    expect(steps[0].stepNumber).toBe(1);
    expect(steps[1].stepNumber).toBe(5);
    expect(steps[2].stepNumber).toBe(10);
  });
});
