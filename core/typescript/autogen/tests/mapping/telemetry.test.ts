/**
 * Tests for telemetry.ts - Blocked step recording and analysis
 * @see research/2026-01-27_autogen-empty-stubs-implementation-plan.md Phase 3
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import {
  recordBlockedStep,
  readBlockedStepRecords,
  analyzeBlockedPatterns,
  getTelemetryStats,
  clearTelemetry,
  normalizeStepTextForTelemetry as normalizeStepText,
  categorizeStepText,
  getTelemetryPath,
  type BlockedStepRecord,
} from '../../src/mapping/telemetry.js';
import {
  matchPattern,
  PATTERN_VERSION,
  getAllPatternNames,
  getPatternCountByCategory,
  getPatternMetadata,
} from '../../src/mapping/patterns.js';

describe('Telemetry Module', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'telemetry-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('normalizeStepText', () => {
    it('should lowercase and trim text', () => {
      expect(normalizeStepText('  Click Button  ')).toBe('click button');
    });

    it('should remove articles', () => {
      expect(normalizeStepText('Click the button')).toBe('click button');
      expect(normalizeStepText('Click a button')).toBe('click button');
      expect(normalizeStepText('Click an element')).toBe('click element');
    });

    it('should normalize whitespace', () => {
      expect(normalizeStepText('Click   the    button')).toBe('click button');
    });

    it('should replace quoted values with placeholders', () => {
      expect(normalizeStepText('Enter "test@example.com" in email')).toBe('enter "" in email');
      expect(normalizeStepText("Enter 'password' in field")).toBe("enter '' in field");
    });
  });

  describe('categorizeStepText', () => {
    it('should categorize navigation steps', () => {
      expect(categorizeStepText('Navigate to /home')).toBe('navigation');
      expect(categorizeStepText('Go to the dashboard')).toBe('navigation');
      expect(categorizeStepText('Open the login page')).toBe('navigation');
      expect(categorizeStepText('Visit /settings')).toBe('navigation');
    });

    it('should categorize interaction steps', () => {
      expect(categorizeStepText('Click the button')).toBe('interaction');
      expect(categorizeStepText('Fill in the email field')).toBe('interaction');
      expect(categorizeStepText('Enter username')).toBe('interaction');
      expect(categorizeStepText('Type password')).toBe('interaction');
      expect(categorizeStepText('Select an option')).toBe('interaction');
      expect(categorizeStepText('Check the checkbox')).toBe('interaction');
      expect(categorizeStepText('Press Enter')).toBe('interaction');
      expect(categorizeStepText('Submit the form')).toBe('interaction');
    });

    it('should categorize assertion steps', () => {
      expect(categorizeStepText('User should see welcome')).toBe('assertion');
      expect(categorizeStepText('Element is visible')).toBe('assertion');
      expect(categorizeStepText('Verify the message')).toBe('assertion');
      expect(categorizeStepText('Assert page loaded')).toBe('assertion');
      expect(categorizeStepText('Confirm success')).toBe('assertion');
      expect(categorizeStepText('Ensure data displayed')).toBe('assertion');
      expect(categorizeStepText('Expect result')).toBe('assertion');
    });

    it('should categorize wait steps', () => {
      expect(categorizeStepText('Wait for page')).toBe('wait');
      expect(categorizeStepText('Loading complete')).toBe('wait');
      expect(categorizeStepText('Until element appears')).toBe('wait');
    });

    it('should return unknown for unrecognized steps', () => {
      expect(categorizeStepText('Some random text')).toBe('unknown');
      expect(categorizeStepText('Do something')).toBe('unknown');
    });
  });

  describe('recordBlockedStep', () => {
    it('should record a blocked step with all fields', () => {
      recordBlockedStep(
        {
          journeyId: 'JRN-001',
          stepText: 'Click on the Submit button',
          reason: 'No matching pattern',
          suggestedFix: 'Click "Submit" button',
        },
        { baseDir: tempDir }
      );

      const records = readBlockedStepRecords({ baseDir: tempDir });
      expect(records).toHaveLength(1);
      expect(records[0]).toMatchObject({
        journeyId: 'JRN-001',
        stepText: 'Click on the Submit button',
        reason: 'No matching pattern',
        suggestedFix: 'Click "Submit" button',
        category: 'interaction',
      });
      expect(records[0]!.timestamp).toBeDefined();
      expect(records[0]!.normalizedText).toBe("click on submit button");
    });

    it('should auto-detect category if not provided', () => {
      recordBlockedStep(
        {
          journeyId: 'JRN-001',
          stepText: 'Verify the error message',
          reason: 'No matching pattern',
        },
        { baseDir: tempDir }
      );

      const records = readBlockedStepRecords({ baseDir: tempDir });
      expect(records[0]!.category).toBe('assertion');
    });

    it('should append multiple records', () => {
      recordBlockedStep(
        { journeyId: 'JRN-001', stepText: 'Step 1', reason: 'Reason 1' },
        { baseDir: tempDir }
      );
      recordBlockedStep(
        { journeyId: 'JRN-002', stepText: 'Step 2', reason: 'Reason 2' },
        { baseDir: tempDir }
      );

      const records = readBlockedStepRecords({ baseDir: tempDir });
      expect(records).toHaveLength(2);
    });
  });

  describe('readBlockedStepRecords', () => {
    it('should return empty array for non-existent file', () => {
      const records = readBlockedStepRecords({ baseDir: tempDir });
      expect(records).toEqual([]);
    });

    it('should skip invalid JSON lines', () => {
      // Manually create a file with some invalid lines
      const path = getTelemetryPath(tempDir);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(
        path,
        '{"journeyId":"J1","stepText":"Step 1","normalizedText":"step 1","category":"interaction","reason":"R1","timestamp":"2026-01-01T00:00:00Z"}\n' +
          'invalid json line\n' +
          '{"journeyId":"J2","stepText":"Step 2","normalizedText":"step 2","category":"assertion","reason":"R2","timestamp":"2026-01-01T00:00:01Z"}\n'
      );

      const records = readBlockedStepRecords({ baseDir: tempDir });
      expect(records).toHaveLength(2);
      expect(records[0]!.journeyId).toBe('J1');
      expect(records[1]!.journeyId).toBe('J2');
    });
  });

  describe('analyzeBlockedPatterns', () => {
    it('should group similar blocked steps', () => {
      // Record similar steps
      recordBlockedStep(
        { journeyId: 'J1', stepText: 'Click on the Submit button', reason: 'No match' },
        { baseDir: tempDir }
      );
      recordBlockedStep(
        { journeyId: 'J2', stepText: 'Click on the Cancel button', reason: 'No match' },
        { baseDir: tempDir }
      );
      recordBlockedStep(
        { journeyId: 'J3', stepText: 'Navigate to /dashboard', reason: 'No match' },
        { baseDir: tempDir }
      );

      const gaps = analyzeBlockedPatterns({ baseDir: tempDir });

      // Should have multiple gaps (click patterns group together, navigate is separate)
      expect(gaps.length).toBeGreaterThanOrEqual(1);
    });

    it('should sort gaps by count', () => {
      // Record some patterns multiple times
      for (let i = 0; i < 5; i++) {
        recordBlockedStep(
          { journeyId: `J${i}`, stepText: 'Click on button', reason: 'No match' },
          { baseDir: tempDir }
        );
      }
      for (let i = 0; i < 2; i++) {
        recordBlockedStep(
          { journeyId: `J${i}`, stepText: 'Go to page', reason: 'No match' },
          { baseDir: tempDir }
        );
      }

      const gaps = analyzeBlockedPatterns({ baseDir: tempDir });
      expect(gaps[0]!.count).toBeGreaterThanOrEqual(gaps[gaps.length - 1]!.count);
    });

    it('should respect limit option', () => {
      for (let i = 0; i < 10; i++) {
        recordBlockedStep(
          { journeyId: `J${i}`, stepText: `Unique step ${i}`, reason: 'No match' },
          { baseDir: tempDir }
        );
      }

      const gaps = analyzeBlockedPatterns({ baseDir: tempDir, limit: 5 });
      expect(gaps.length).toBeLessThanOrEqual(5);
    });

    it('should return empty array for no records', () => {
      const gaps = analyzeBlockedPatterns({ baseDir: tempDir });
      expect(gaps).toEqual([]);
    });

    it('should include suggested pattern', () => {
      recordBlockedStep(
        { journeyId: 'J1', stepText: 'Click on "Submit"', reason: 'No match' },
        { baseDir: tempDir }
      );

      const gaps = analyzeBlockedPatterns({ baseDir: tempDir });
      expect(gaps[0]!.suggestedPattern).toBeDefined();
    });
  });

  describe('getTelemetryStats', () => {
    it('should return zeros for no records', () => {
      const stats = getTelemetryStats({ baseDir: tempDir });
      expect(stats.totalRecords).toBe(0);
      expect(stats.uniquePatterns).toBe(0);
      expect(stats.byCategory).toEqual({});
    });

    it('should calculate correct statistics', () => {
      recordBlockedStep(
        { journeyId: 'J1', stepText: 'Click button', reason: 'R1' },
        { baseDir: tempDir }
      );
      recordBlockedStep(
        { journeyId: 'J2', stepText: 'Click link', reason: 'R2' },
        { baseDir: tempDir }
      );
      recordBlockedStep(
        { journeyId: 'J3', stepText: 'Verify message', reason: 'R3' },
        { baseDir: tempDir }
      );

      const stats = getTelemetryStats({ baseDir: tempDir });
      expect(stats.totalRecords).toBe(3);
      expect(stats.uniquePatterns).toBeGreaterThanOrEqual(2);
      expect(stats.byCategory.interaction).toBe(2);
      expect(stats.byCategory.assertion).toBe(1);
      expect(stats.dateRange.earliest).toBeDefined();
      expect(stats.dateRange.latest).toBeDefined();
    });
  });

  describe('clearTelemetry', () => {
    it('should clear all telemetry data', () => {
      recordBlockedStep(
        { journeyId: 'J1', stepText: 'Step 1', reason: 'R1' },
        { baseDir: tempDir }
      );

      expect(readBlockedStepRecords({ baseDir: tempDir })).toHaveLength(1);

      clearTelemetry({ baseDir: tempDir });

      expect(readBlockedStepRecords({ baseDir: tempDir })).toHaveLength(0);
    });

    it('should not error on non-existent file', () => {
      expect(() => clearTelemetry({ baseDir: tempDir })).not.toThrow();
    });
  });
});

describe('Extended Patterns Tests', () => {
  describe('Extended click patterns', () => {
    it('should match "Click on Submit"', () => {
      const result = matchPattern('Click on Submit');
      expect(result).not.toBeNull();
      expect(result!.type).toBe('click');
    });

    it('should match "Press Enter"', () => {
      const result = matchPattern('Press Enter');
      expect(result).not.toBeNull();
      expect(result!.type).toBe('press');
    });

    it('should match "Press Tab key"', () => {
      const result = matchPattern('Press Tab key');
      expect(result).not.toBeNull();
      expect(result!.type).toBe('press');
    });

    it('should match "Double click on element"', () => {
      const result = matchPattern('Double click on the item');
      expect(result).not.toBeNull();
      expect(result!.type).toBe('dblclick');
    });

    it('should match "Submit the form"', () => {
      const result = matchPattern('Submit the form');
      expect(result).not.toBeNull();
      expect(result!.type).toBe('click');
    });
  });

  describe('Extended fill patterns', () => {
    it('should match "Type value into field"', () => {
      const result = matchPattern('Type "password" into the Password field');
      expect(result).not.toBeNull();
      expect(result!.type).toBe('fill');
    });

    it('should match "Fill in the email"', () => {
      const result = matchPattern('Fill in the email');
      expect(result).not.toBeNull();
      expect(result!.type).toBe('fill');
    });

    it('should match "Clear the field"', () => {
      const result = matchPattern('Clear the username field');
      expect(result).not.toBeNull();
      expect(result!.type).toBe('clear');
    });
  });

  describe('Extended assertion patterns', () => {
    it('should match "Verify element is showing"', () => {
      const result = matchPattern('Verify the dashboard is showing');
      expect(result).not.toBeNull();
      expect(result!.type).toBe('expectVisible');
    });

    it('should match "Page should show text"', () => {
      const result = matchPattern('The page should show "Welcome"');
      expect(result).not.toBeNull();
      expect(result!.type).toBe('expectText');
    });

    it('should match "Make sure element is visible"', () => {
      const result = matchPattern('Make sure the button is visible');
      expect(result).not.toBeNull();
      expect(result!.type).toBe('expectVisible');
    });

    it('should match "Element should not be visible"', () => {
      const result = matchPattern('The error should not be visible');
      expect(result).not.toBeNull();
      expect(result!.type).toBe('expectHidden');
    });
  });

  describe('Extended wait patterns', () => {
    it('should match "Wait for element to disappear"', () => {
      const result = matchPattern('Wait for the spinner to disappear');
      expect(result).not.toBeNull();
      expect(result!.type).toBe('waitForHidden');
    });

    it('should match "Wait for element to appear"', () => {
      const result = matchPattern('Wait for the modal to appear');
      expect(result).not.toBeNull();
      expect(result!.type).toBe('waitForVisible');
    });

    it('should match "Wait 2 seconds"', () => {
      const result = matchPattern('Wait for 2 seconds');
      expect(result).not.toBeNull();
      expect(result!.type).toBe('waitForTimeout');
      expect((result as { type: string; ms: number }).ms).toBe(2000);
    });

    it('should match "Wait for network idle"', () => {
      const result = matchPattern('Wait for network idle');
      expect(result).not.toBeNull();
      expect(result!.type).toBe('waitForNetworkIdle');
    });
  });

  describe('Extended navigation patterns', () => {
    it('should match "Refresh the page"', () => {
      const result = matchPattern('Refresh the page');
      expect(result).not.toBeNull();
      expect(result!.type).toBe('reload');
    });

    it('should match "Go back"', () => {
      const result = matchPattern('Go back');
      expect(result).not.toBeNull();
      expect(result!.type).toBe('goBack');
    });

    it('should match "Navigate forward"', () => {
      const result = matchPattern('Navigate forward');
      expect(result).not.toBeNull();
      expect(result!.type).toBe('goForward');
    });
  });

  describe('Hover patterns', () => {
    it('should match "Hover over menu"', () => {
      const result = matchPattern('Hover over the menu');
      expect(result).not.toBeNull();
      expect(result!.type).toBe('hover');
    });

    it('should match "Mouse over element"', () => {
      const result = matchPattern('Mouse over the button');
      expect(result).not.toBeNull();
      expect(result!.type).toBe('hover');
    });
  });

  describe('Focus patterns', () => {
    it('should match "Focus on input"', () => {
      const result = matchPattern('Focus on the input');
      expect(result).not.toBeNull();
      expect(result!.type).toBe('focus');
    });
  });
});

describe('Pattern Versioning', () => {
  it('should export PATTERN_VERSION', () => {
    expect(PATTERN_VERSION).toBeDefined();
    expect(typeof PATTERN_VERSION).toBe('string');
    expect(PATTERN_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('should return all pattern names', () => {
    const names = getAllPatternNames();
    expect(Array.isArray(names)).toBe(true);
    expect(names.length).toBeGreaterThan(0);
    expect(names).toContain('click-button-quoted');
    expect(names).toContain('navigate-to-url');
  });

  it('should count patterns by category', () => {
    const counts = getPatternCountByCategory();
    expect(typeof counts).toBe('object');
    expect(counts.click).toBeGreaterThan(0);
    expect(counts.navigate).toBeGreaterThan(0);
  });

  it('should return pattern metadata', () => {
    const metadata = getPatternMetadata('click-button-quoted');
    expect(metadata).not.toBeNull();
    expect(metadata!.name).toBe('click-button-quoted');
    expect(metadata!.source).toBe('core');
    expect(metadata!.version).toBeDefined();
  });

  it('should return null for unknown pattern', () => {
    const metadata = getPatternMetadata('unknown-pattern');
    expect(metadata).toBeNull();
  });
});
