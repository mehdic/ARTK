import { describe, it, expect } from 'vitest';
import {
  categorizeStep,
  inferMachineHint,
  analyzeBlockedStep,
  formatBlockedStepAnalysis,
} from '../../src/mapping/blockedStepAnalysis.js';

describe('categorizeStep', () => {
  it('categorizes navigation steps', () => {
    expect(categorizeStep('Navigate to /login')).toBe('navigation');
    expect(categorizeStep('Go to the dashboard')).toBe('navigation');
    expect(categorizeStep('Open /settings page')).toBe('navigation');
    expect(categorizeStep('Visit the homepage')).toBe('navigation');
  });

  it('categorizes interaction steps', () => {
    expect(categorizeStep('Click the Submit button')).toBe('interaction');
    expect(categorizeStep('Fill in the username field')).toBe('interaction');
    expect(categorizeStep('Enter password')).toBe('interaction');
    expect(categorizeStep('Type something')).toBe('interaction');
    expect(categorizeStep('Select an option')).toBe('interaction');
    expect(categorizeStep('Check the box')).toBe('interaction');
    expect(categorizeStep('Press Enter')).toBe('interaction');
  });

  it('categorizes assertion steps', () => {
    expect(categorizeStep('User should see Welcome')).toBe('assertion');
    expect(categorizeStep('Verify the message is visible')).toBe('assertion');
    expect(categorizeStep('Confirm the dialog appears')).toBe('assertion');
    expect(categorizeStep('Assert that text exists')).toBe('assertion');
    expect(categorizeStep('Expect to see content')).toBe('assertion');
  });

  it('categorizes wait steps', () => {
    expect(categorizeStep('Wait for the page to load')).toBe('wait');
    expect(categorizeStep('Wait until loading spinner disappears')).toBe('wait');
    expect(categorizeStep('Wait for element to appear')).toBe('wait');
  });

  it('returns unknown for unrecognized steps', () => {
    expect(categorizeStep('Do something random')).toBe('unknown');
    expect(categorizeStep('Random text')).toBe('unknown');
  });
});

describe('inferMachineHint', () => {
  it('suggests button role for click steps', () => {
    expect(inferMachineHint("Click 'Submit' button")).toBe('(role=button, name=Submit)');
    expect(inferMachineHint("Click the 'Login' button")).toBe('(role=button, name=Login)');
  });

  it('suggests link role for link steps', () => {
    expect(inferMachineHint("Click 'Home' link")).toBe('(role=link, name=Home)');
  });

  it('suggests textbox role for input steps', () => {
    expect(inferMachineHint("Enter value in 'Username' field")).toBe('(role=textbox, name=Username)');
    expect(inferMachineHint("Type text into 'Email' input")).toBe('(role=textbox, name=Email)');
  });

  it('suggests heading role for heading steps', () => {
    expect(inferMachineHint("See 'Welcome' heading")).toBe('(role=heading, name=Welcome)');
  });

  it('suggests checkbox role for checkbox steps', () => {
    expect(inferMachineHint("Check 'Terms' checkbox")).toBe('(role=checkbox, name=Terms)');
  });

  it('suggests text locator as fallback', () => {
    expect(inferMachineHint("Do something with 'Element'")).toBe('(text=Element)');
  });

  it('returns undefined when no element name found', () => {
    expect(inferMachineHint('Click the button')).toBeUndefined();
    expect(inferMachineHint('Do something')).toBeUndefined();
  });
});

describe('analyzeBlockedStep', () => {
  it('analyzes navigation step', () => {
    const analysis = analyzeBlockedStep('Go to /login', 'No pattern match');
    expect(analysis.category).toBe('navigation');
    expect(analysis.suggestions.length).toBeGreaterThan(0);
    expect(analysis.step).toBe('Go to /login');
    expect(analysis.reason).toBe('No pattern match');
  });

  it('analyzes interaction step with hint suggestion', () => {
    const analysis = analyzeBlockedStep("Click 'Login' button", 'No pattern match');
    expect(analysis.category).toBe('interaction');
    expect(analysis.machineHintSuggestion).toBeDefined();
    expect(analysis.machineHintSuggestion).toContain('role=button');
    expect(analysis.suggestions.length).toBeGreaterThan(0);
  });

  it('analyzes assertion step', () => {
    const analysis = analyzeBlockedStep('Verify the page loads', 'No pattern match');
    expect(analysis.category).toBe('assertion');
    expect(analysis.suggestions.length).toBeGreaterThan(0);
  });

  it('analyzes wait step', () => {
    const analysis = analyzeBlockedStep('Wait for page to load', 'No pattern match');
    expect(analysis.category).toBe('wait');
    expect(analysis.suggestions.length).toBeGreaterThan(0);
  });

  it('analyzes unknown step', () => {
    const analysis = analyzeBlockedStep('Do something random', 'No pattern match');
    expect(analysis.category).toBe('unknown');
    expect(analysis.suggestions.length).toBeGreaterThan(0);
  });

  it('provides formatted output', () => {
    const analysis = analyzeBlockedStep('Verify the page loads', 'No pattern match');
    const output = formatBlockedStepAnalysis(analysis);
    expect(output).toContain('Step:');
    expect(output).toContain('Category:');
    expect(output).toContain('Suggestions:');
    expect(output).toContain('Verify the page loads');
  });

  it('includes priority and confidence in suggestions', () => {
    const analysis = analyzeBlockedStep('Click button', 'No pattern match');
    expect(analysis.suggestions[0]).toHaveProperty('priority');
    expect(analysis.suggestions[0]).toHaveProperty('confidence');
    expect(analysis.suggestions[0]).toHaveProperty('text');
    expect(analysis.suggestions[0]).toHaveProperty('explanation');
  });
});

describe('formatBlockedStepAnalysis', () => {
  it('formats analysis with all fields', () => {
    const analysis = analyzeBlockedStep("Click 'Submit' button", 'Pattern mismatch');
    const output = formatBlockedStepAnalysis(analysis);

    expect(output).toContain('Step:');
    expect(output).toContain('Click \'Submit\' button');
    expect(output).toContain('Category: interaction');
    expect(output).toContain('Reason: Pattern mismatch');
    expect(output).toContain('Suggestions:');
    expect(output).toContain('confidence:');
  });

  it('includes machine hint suggestion when available', () => {
    const analysis = analyzeBlockedStep("Click 'Login' button", 'No match');
    const output = formatBlockedStepAnalysis(analysis);

    expect(output).toContain('Suggested hint:');
    expect(output).toContain('role=button');
  });

  it('formats multiple suggestions correctly', () => {
    const analysis = analyzeBlockedStep('User should see text', 'No match');
    const output = formatBlockedStepAnalysis(analysis);

    // Should have numbered suggestions
    expect(output).toMatch(/1\./);
    expect(output).toContain('confidence:');
  });
});
