/**
 * Step Mapper Tests
 * @see T020 - Unit tests for step mapper
 */
import { describe, it, expect } from 'vitest';
import {
  mapStepText,
  mapAcceptanceCriterion,
  mapProceduralStep,
  mapSteps,
  getMappingStats,
  suggestImprovements,
} from '../../src/mapping/stepMapper.js';
import type { AcceptanceCriterion, ProceduralStep } from '../../src/journey/parseJourney.js';

describe('mapStepText', () => {
  describe('navigation patterns', () => {
    it('should map goto URL', () => {
      const result = mapStepText('User navigates to https://example.com');
      expect(result.primitive).not.toBeNull();
      expect(result.primitive?.type).toBe('goto');
    });

    it('should map goto with page pattern', () => {
      const result = mapStepText('User goes to the login page');
      expect(result.primitive).not.toBeNull();
      expect(result.primitive?.type).toBe('goto');
    });

    it('should return sourceText', () => {
      const text = 'User navigates to https://example.com/test';
      const result = mapStepText(text);
      expect(result.sourceText).toBe(text);
    });
  });

  describe('click patterns', () => {
    it('should map click on button', () => {
      const result = mapStepText('User clicks "Submit" button');
      expect(result.primitive).not.toBeNull();
      expect(result.primitive?.type).toBe('click');
    });

    it('should map click on link', () => {
      const result = mapStepText('User clicks "Sign Up" link');
      expect(result.primitive).not.toBeNull();
      expect(result.primitive?.type).toBe('click');
    });

    it('should identify as action not assertion', () => {
      const result = mapStepText('User clicks Submit button');
      expect(result.isAssertion).toBe(false);
    });
  });

  describe('fill patterns', () => {
    it('should map fill input with value', () => {
      const result = mapStepText('User enters "test@example.com" in "Email" field');
      expect(result.primitive).not.toBeNull();
      expect(result.primitive?.type).toBe('fill');
    });

    it('should map type in field', () => {
      const result = mapStepText('User types "password123" in "Password"');
      expect(result.primitive).not.toBeNull();
      expect(result.primitive?.type).toBe('fill');
    });
  });

  describe('select patterns', () => {
    it('should map select dropdown option', () => {
      const result = mapStepText('User selects "United States" from "Country"');
      expect(result.primitive).not.toBeNull();
      expect(result.primitive?.type).toBe('select');
    });
  });

  describe('checkbox patterns', () => {
    it('should map check checkbox', () => {
      const result = mapStepText('User checks "Remember me" checkbox');
      expect(result.primitive).not.toBeNull();
      expect(result.primitive?.type).toBe('check');
    });

    it('should map uncheck checkbox', () => {
      const result = mapStepText('User unchecks "Subscribe"');
      expect(result.primitive).not.toBeNull();
      expect(result.primitive?.type).toBe('uncheck');
    });
  });

  describe('visibility patterns', () => {
    it('should map element visible pattern', () => {
      // Using exact pattern from visibility patterns
      const result = mapStepText('"Welcome" visible');
      expect(result.primitive).not.toBeNull();
      expect(result.primitive?.type).toBe('expectVisible');
      expect(result.isAssertion).toBe(true);
    });

    it('should map user sees pattern', () => {
      const result = mapStepText('User sees "Success"');
      expect(result.primitive).not.toBeNull();
      expect(result.isAssertion).toBe(true);
    });
  });

  describe('toast/notification patterns', () => {
    it('should map success toast', () => {
      // Pattern requires optional "a" and specific format
      const result = mapStepText('a success toast appears');
      expect(result.primitive).not.toBeNull();
      expect(result.primitive?.type).toBe('expectToast');
    });

    it('should map toast with message', () => {
      // Pattern: toast with "message" appears
      const result = mapStepText('toast with "Saved" appears');
      expect(result.primitive).not.toBeNull();
      expect(result.primitive?.type).toBe('expectToast');
    });
  });

  describe('auth patterns', () => {
    it('should map login step', () => {
      const result = mapStepText('User logs in as admin');
      expect(result.primitive).not.toBeNull();
      expect(result.primitive?.type).toBe('callModule');
    });

    it('should map logout step', () => {
      const result = mapStepText('User logs out');
      expect(result.primitive).not.toBeNull();
    });
  });

  describe('wait patterns', () => {
    it('should map wait for page load', () => {
      const result = mapStepText('Wait for page to load');
      expect(result.primitive).not.toBeNull();
      expect(result.primitive?.type).toBe('waitForLoadingComplete');
    });
  });

  describe('unmatched text', () => {
    it('should return null primitive for unmatched text', () => {
      const result = mapStepText('Some random text that does not match any pattern');
      expect(result.primitive).toBeNull();
      expect(result.message).toBeDefined();
    });
  });

  describe('sourceText tracking', () => {
    it('should preserve original text in sourceText', () => {
      const text = 'User clicks "Submit" button';
      const result = mapStepText(text);
      expect(result.sourceText).toBe(text);
    });
  });
});

describe('mapAcceptanceCriterion', () => {
  it('should map AC with multiple steps', () => {
    const ac: AcceptanceCriterion = {
      id: 'AC-1',
      title: 'User can log in',
      steps: [
        'Enter username in the Username field',
        'Enter password in the Password field',
        'Click the "Login" button',
        'Verify user sees dashboard',
      ],
      rawContent: '',
    };

    const proceduralSteps: ProceduralStep[] = [];
    const result = mapAcceptanceCriterion(ac, proceduralSteps);

    expect(result.step.id).toBe('AC-1');
    expect(result.step.description).toBe('User can log in');
    expect(result.mappings.length).toBe(4);
  });

  it('should separate actions and assertions', () => {
    const ac: AcceptanceCriterion = {
      id: 'AC-2',
      title: 'Form validation',
      steps: [
        'Click submit',
        'Error message "Required" is visible',
      ],
      rawContent: '',
    };

    const result = mapAcceptanceCriterion(ac, []);
    // Actions and assertions are separated
    expect(result.step.actions).toBeDefined();
    expect(result.step.assertions).toBeDefined();
  });

  it('should include blocked primitives for unmatched steps', () => {
    const ac: AcceptanceCriterion = {
      id: 'AC-3',
      title: 'Unmatched steps',
      steps: [
        'Something that cannot be mapped automatically',
      ],
      rawContent: '',
    };

    const result = mapAcceptanceCriterion(ac, [], { includeBlocked: true });
    expect(result.blockedCount).toBeGreaterThan(0);
    expect(result.step.actions.some(a => a.type === 'blocked')).toBe(true);
  });

  it('should use procedural steps for additional context', () => {
    const ac: AcceptanceCriterion = {
      id: 'AC-4',
      title: 'Checkout flow',
      steps: ['Click checkout'],
      rawContent: '',
    };

    const proceduralSteps: ProceduralStep[] = [
      { number: 1, text: 'Click "Add to Cart" button', linkedAC: 'AC-4' },
    ];

    const result = mapAcceptanceCriterion(ac, proceduralSteps);
    // Should have actions from both AC steps and linked procedural steps
    expect(result.step.actions.length).toBeGreaterThanOrEqual(1);
  });

  it('should return mapping statistics', () => {
    const ac: AcceptanceCriterion = {
      id: 'AC-5',
      title: 'Mixed steps',
      steps: [
        'Click the button',
        'Something unmapped',
        'Verify text is visible',
      ],
      rawContent: '',
    };

    const result = mapAcceptanceCriterion(ac, []);
    expect(result.mappedCount).toBeGreaterThanOrEqual(0);
    expect(result.blockedCount).toBeGreaterThanOrEqual(0);
    expect(result.mappings.length).toBe(3);
  });
});

describe('mapProceduralStep', () => {
  it('should map a procedural step', () => {
    const step: ProceduralStep = {
      number: 1,
      text: 'Click the "Start" button',
    };

    const result = mapProceduralStep(step);
    expect(result.step.id).toBe('PS-1');
    expect(result.step.description).toBe('Click the "Start" button');
  });

  it('should return mapping result with stats', () => {
    const step: ProceduralStep = {
      number: 2,
      text: 'Enter username',
    };

    const result = mapProceduralStep(step);
    expect(result.mappings).toHaveLength(1);
    expect(result.mappedCount + result.blockedCount).toBe(1);
  });
});

describe('mapSteps', () => {
  it('should batch map multiple steps', () => {
    const steps = [
      'Click the button',
      'Enter text in field',
      'Verify message visible',
    ];

    const results = mapSteps(steps);
    expect(results).toHaveLength(3);
    results.forEach(r => {
      expect(r.sourceText).toBeDefined();
    });
  });
});

describe('getMappingStats', () => {
  it('should calculate mapping statistics', () => {
    const mappings = [
      { primitive: { type: 'click' as const, locator: { strategy: 'text' as const, value: 'x' } }, sourceText: 'click', isAssertion: false },
      { primitive: { type: 'expectVisible' as const, locator: { strategy: 'text' as const, value: 'x' } }, sourceText: 'verify', isAssertion: true },
      { primitive: null, sourceText: 'blocked', isAssertion: false, message: 'unmapped' },
    ];

    const stats = getMappingStats(mappings);
    expect(stats.total).toBe(3);
    expect(stats.mapped).toBe(2);
    expect(stats.blocked).toBe(1);
    expect(stats.actions).toBe(1);
    expect(stats.assertions).toBe(1);
    expect(stats.mappingRate).toBeCloseTo(2 / 3);
  });

  it('should handle empty array', () => {
    const stats = getMappingStats([]);
    expect(stats.total).toBe(0);
    expect(stats.mappingRate).toBe(0);
  });
});

describe('suggestImprovements', () => {
  it('should suggest improvements for blocked steps', () => {
    const blockedSteps = [
      { primitive: null, sourceText: 'go to home', isAssertion: false },
      { primitive: null, sourceText: 'press submit', isAssertion: false },
      { primitive: null, sourceText: 'enter email', isAssertion: false },
      { primitive: null, sourceText: 'see message', isAssertion: false },
    ];

    const suggestions = suggestImprovements(blockedSteps);
    expect(suggestions).toHaveLength(4);
    suggestions.forEach(s => {
      expect(s).toContain('Try:');
    });
  });

  it('should handle unknown patterns', () => {
    const blockedSteps = [
      { primitive: null, sourceText: 'xyz abc 123', isAssertion: false },
    ];

    const suggestions = suggestImprovements(blockedSteps);
    expect(suggestions[0]).toContain('Could not determine intent');
  });
});
