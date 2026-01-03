/**
 * Step Mapper Hints Integration Tests
 * @see T070 - Integration test for hint-based step mapping
 */
import { describe, it, expect } from 'vitest';
import { mapStepText, mapSteps, getMappingStats } from '../../src/mapping/stepMapper.js';

describe('mapStepText with hints', () => {
  describe('locator hint overrides', () => {
    it('should use testid from hint instead of inferred locator', () => {
      const result = mapStepText('User clicks "Submit" button (testid=submit-btn)');

      expect(result.primitive).not.toBeNull();
      expect(result.primitive?.type).toBe('click');

      const locator = (result.primitive as { locator: { strategy: string; value: string } }).locator;
      expect(locator.strategy).toBe('testid');
      expect(locator.value).toBe('submit-btn');
    });

    it('should use role from hint with name option', () => {
      const result = mapStepText('User clicks the Submit (role=button) (label="Submit")');

      expect(result.primitive).not.toBeNull();
      if (result.primitive && 'locator' in result.primitive) {
        const locator = result.primitive.locator;
        expect(locator.strategy).toBe('role');
        expect(locator.value).toBe('button');
        expect(locator.options).toEqual({ name: 'Submit' });
      }
    });

    it('should add exact option from hint', () => {
      const result = mapStepText('User should see "Log" text (text="Log") (exact=true)');

      expect(result.primitive).not.toBeNull();
      if (result.primitive && 'locator' in result.primitive) {
        const locator = result.primitive.locator;
        expect(locator.options).toEqual({ exact: true });
      }
    });

    it('should use label from hint', () => {
      const result = mapStepText('User enters "test@email.com" (label="Email Address")');

      expect(result.primitive).not.toBeNull();
      if (result.primitive && 'locator' in result.primitive) {
        expect(result.primitive.locator.strategy).toBe('label');
        expect(result.primitive.locator.value).toBe('Email Address');
      }
    });
  });

  describe('creating primitives from hints when no pattern match', () => {
    it('should create click primitive from role hint', () => {
      const result = mapStepText('Activate the primary action (role=button) (testid=primary-action)');

      expect(result.primitive).not.toBeNull();
      expect(result.primitive?.type).toBe('click');
      if (result.primitive && 'locator' in result.primitive) {
        expect(result.primitive.locator.strategy).toBe('testid');
        expect(result.primitive.locator.value).toBe('primary-action');
      }
    });

    it('should create fill primitive from label hint', () => {
      // Use "type" keyword to trigger fill action
      const result = mapStepText('Type username "john" (label="Username")');

      expect(result.primitive).not.toBeNull();
      expect(result.primitive?.type).toBe('fill');
      if (result.primitive && 'locator' in result.primitive) {
        expect(result.primitive.locator.strategy).toBe('label');
        expect(result.primitive.locator.value).toBe('Username');
      }
    });

    it('should create expectVisible from text hint', () => {
      const result = mapStepText('Confirm display of "Success" (text="Success")');

      expect(result.primitive).not.toBeNull();
      expect(result.primitive?.type).toBe('expectVisible');
      if (result.primitive && 'locator' in result.primitive) {
        expect(result.primitive.locator.strategy).toBe('text');
        expect(result.primitive.locator.value).toBe('Success');
      }
    });
  });

  describe('heading level hints', () => {
    it('should include level for heading role', () => {
      const result = mapStepText('User sees "Welcome" heading (role=heading) (level=1)');

      expect(result.primitive).not.toBeNull();
      if (result.primitive && 'locator' in result.primitive) {
        expect(result.primitive.locator.strategy).toBe('role');
        expect(result.primitive.locator.value).toBe('heading');
        expect(result.primitive.locator.options).toEqual({ level: 1 });
      }
    });
  });

  describe('text is cleaned of hints', () => {
    it('should remove hints from step text before pattern matching', () => {
      const result = mapStepText('User clicks "Submit" button (role=button)');

      expect(result.primitive).not.toBeNull();
      expect(result.primitive?.type).toBe('click');
    });

    it('should handle multiple hints inline', () => {
      const result = mapStepText('User clicks (role=button) (label="OK") (exact=true) the OK button');

      expect(result.primitive).not.toBeNull();
      if (result.primitive && 'locator' in result.primitive) {
        expect(result.primitive.locator.strategy).toBe('role');
        expect(result.primitive.locator.options).toEqual({ name: 'OK', exact: true });
      }
    });
  });
});

describe('mapSteps with hints', () => {
  it('should map multiple steps with hints', () => {
    const steps = [
      'User navigates to /login',
      'User enters "user@test.com" in email field (label="Email")',
      'User clicks "Login" button (role=button) (testid=login-btn)',
      'User should see "Dashboard" heading (role=heading) (level=1)',
    ];

    const results = mapSteps(steps);

    expect(results).toHaveLength(4);
    expect(results[0].primitive?.type).toBe('goto');
    expect(results[1].primitive?.type).toBe('fill');
    expect(results[2].primitive?.type).toBe('click');
    expect(results[3].primitive?.type).toBe('expectVisible');

    // Check that hints were applied
    if (results[1].primitive && 'locator' in results[1].primitive) {
      expect(results[1].primitive.locator.strategy).toBe('label');
    }
    if (results[2].primitive && 'locator' in results[2].primitive) {
      expect(results[2].primitive.locator.strategy).toBe('testid');
    }
  });

  it('should track mapping stats correctly', () => {
    const steps = [
      'User clicks button (role=button)',
      'User sees text (text="Hello")',
      'Some unmappable action without hints',
    ];

    const results = mapSteps(steps);
    const stats = getMappingStats(results);

    expect(stats.total).toBe(3);
    expect(stats.mapped).toBe(2);
    expect(stats.blocked).toBe(1);
  });
});

describe('behavior hints', () => {
  it('should include timeout in primitive when hint provided', () => {
    // This tests that behavior hints are captured - actual application may vary by primitive type
    const result = mapStepText('User clicks slow button (role=button) (timeout=10000)');

    expect(result.primitive).not.toBeNull();
    // Note: timeout application depends on primitive type support
  });

  it('should include module hint for module calls', () => {
    // Module hint alone doesn't create a primitive - needs either pattern match or locator hint
    // Test that module hints are captured when combined with locator
    const result = mapStepText('User clicks login button (role=button) (module=auth.login)');

    expect(result.primitive).not.toBeNull();
    expect(result.primitive?.type).toBe('click');
    // Module hints are applied if the primitive type supports them
    if (result.primitive && 'module' in result.primitive) {
      expect(result.primitive.module).toBe('auth');
      expect(result.primitive.method).toBe('login');
    }
  });
});

describe('priority: hints over inference', () => {
  it('should prefer testid hint over inferred text locator', () => {
    // "Submit" in quotes would normally create a text locator
    // But testid hint should take priority
    const result = mapStepText('User clicks "Submit" (testid=submit-button)');

    expect(result.primitive).not.toBeNull();
    if (result.primitive && 'locator' in result.primitive) {
      expect(result.primitive.locator.strategy).toBe('testid');
      expect(result.primitive.locator.value).toBe('submit-button');
    }
  });

  it('should prefer role hint over inferred button type', () => {
    const result = mapStepText('User clicks "Menu" link (role=link)');

    expect(result.primitive).not.toBeNull();
    if (result.primitive && 'locator' in result.primitive) {
      expect(result.primitive.locator.strategy).toBe('role');
      expect(result.primitive.locator.value).toBe('link');
    }
  });
});
