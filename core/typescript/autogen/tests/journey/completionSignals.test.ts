/**
 * Tests for Completion Signals Parsing and Conversion
 */
import { describe, it, expect } from 'vitest';
import {
  completionSignalsToAssertions,
} from '../../src/journey/normalize.js';
import type { CompletionSignal } from '../../src/ir/types.js';

describe('Completion Signals', () => {
  describe('completionSignalsToAssertions', () => {
    it('should convert url signal to expectURL assertion', () => {
      const signals: CompletionSignal[] = [
        {
          type: 'url',
          value: '/dashboard',
        },
      ];

      const assertions = completionSignalsToAssertions(signals);

      expect(assertions).toHaveLength(1);
      expect(assertions[0]).toMatchObject({
        type: 'expectURL',
      });
      expect(assertions[0]).toHaveProperty('pattern');
      expect((assertions[0] as { pattern: RegExp }).pattern).toBeInstanceOf(RegExp);
    });

    it('should convert url signal with exact match option', () => {
      const signals: CompletionSignal[] = [
        {
          type: 'url',
          value: '/dashboard',
          options: { exact: true },
        },
      ];

      const assertions = completionSignalsToAssertions(signals);

      expect(assertions).toHaveLength(1);
      expect(assertions[0]).toMatchObject({
        type: 'expectURL',
        pattern: '/dashboard',
      });
    });

    it('should convert toast signal to expectToast assertion', () => {
      const signals: CompletionSignal[] = [
        {
          type: 'toast',
          value: 'Login successful',
        },
      ];

      const assertions = completionSignalsToAssertions(signals);

      expect(assertions).toHaveLength(1);
      expect(assertions[0]).toMatchObject({
        type: 'expectToast',
        toastType: 'success',
        message: 'Login successful',
      });
    });

    it('should detect error toast type from message', () => {
      const signals: CompletionSignal[] = [
        {
          type: 'toast',
          value: 'Login failed - invalid credentials error',
        },
      ];

      const assertions = completionSignalsToAssertions(signals);

      expect(assertions).toHaveLength(1);
      expect(assertions[0]).toMatchObject({
        type: 'expectToast',
        toastType: 'error',
        message: 'Login failed - invalid credentials error',
      });
    });

    it('should detect warning toast type from message', () => {
      const signals: CompletionSignal[] = [
        {
          type: 'toast',
          value: 'Session expiring soon - warning',
        },
      ];

      const assertions = completionSignalsToAssertions(signals);

      expect(assertions).toHaveLength(1);
      expect(assertions[0]).toMatchObject({
        type: 'expectToast',
        toastType: 'warning',
        message: 'Session expiring soon - warning',
      });
    });

    it('should detect info toast type from message', () => {
      const signals: CompletionSignal[] = [
        {
          type: 'toast',
          value: 'New features available - info',
        },
      ];

      const assertions = completionSignalsToAssertions(signals);

      expect(assertions).toHaveLength(1);
      expect(assertions[0]).toMatchObject({
        type: 'expectToast',
        toastType: 'info',
        message: 'New features available - info',
      });
    });

    it('should convert element signal to expectVisible assertion', () => {
      const signals: CompletionSignal[] = [
        {
          type: 'element',
          value: '[data-testid="welcome-banner"]',
        },
      ];

      const assertions = completionSignalsToAssertions(signals);

      expect(assertions).toHaveLength(1);
      expect(assertions[0]).toMatchObject({
        type: 'expectVisible',
        locator: {
          strategy: 'testid',
          value: 'welcome-banner',
        },
      });
    });

    it('should convert element signal with hidden state to expectNotVisible', () => {
      const signals: CompletionSignal[] = [
        {
          type: 'element',
          value: '[data-testid="loading-spinner"]',
          options: { state: 'hidden' },
        },
      ];

      const assertions = completionSignalsToAssertions(signals);

      expect(assertions).toHaveLength(1);
      expect(assertions[0]).toMatchObject({
        type: 'expectNotVisible',
        locator: {
          strategy: 'testid',
          value: 'loading-spinner',
        },
      });
    });

    it('should parse role selector from element signal', () => {
      const signals: CompletionSignal[] = [
        {
          type: 'element',
          value: 'role=button',
        },
      ];

      const assertions = completionSignalsToAssertions(signals);

      expect(assertions[0]).toMatchObject({
        type: 'expectVisible',
        locator: {
          strategy: 'role',
          value: 'button',
        },
      });
    });

    it('should parse text selector from element signal', () => {
      const signals: CompletionSignal[] = [
        {
          type: 'element',
          value: 'text=Welcome',
        },
      ];

      const assertions = completionSignalsToAssertions(signals);

      expect(assertions[0]).toMatchObject({
        type: 'expectVisible',
        locator: {
          strategy: 'text',
          value: 'Welcome',
        },
      });
    });

    it('should parse label selector from element signal', () => {
      const signals: CompletionSignal[] = [
        {
          type: 'element',
          value: 'label=Email',
        },
      ];

      const assertions = completionSignalsToAssertions(signals);

      expect(assertions[0]).toMatchObject({
        type: 'expectVisible',
        locator: {
          strategy: 'label',
          value: 'Email',
        },
      });
    });

    it('should parse placeholder selector from element signal', () => {
      const signals: CompletionSignal[] = [
        {
          type: 'element',
          value: 'placeholder=Enter your email',
        },
      ];

      const assertions = completionSignalsToAssertions(signals);

      expect(assertions[0]).toMatchObject({
        type: 'expectVisible',
        locator: {
          strategy: 'placeholder',
          value: 'Enter your email',
        },
      });
    });

    it('should use CSS selector as fallback for element signal', () => {
      const signals: CompletionSignal[] = [
        {
          type: 'element',
          value: '.welcome-message',
        },
      ];

      const assertions = completionSignalsToAssertions(signals);

      expect(assertions[0]).toMatchObject({
        type: 'expectVisible',
        locator: {
          strategy: 'css',
          value: '.welcome-message',
        },
      });
    });

    it('should convert element signal with timeout option', () => {
      const signals: CompletionSignal[] = [
        {
          type: 'element',
          value: '[data-testid="dashboard"]',
          options: { timeout: 10000 },
        },
      ];

      const assertions = completionSignalsToAssertions(signals);

      expect(assertions[0]).toMatchObject({
        type: 'expectVisible',
        locator: {
          strategy: 'testid',
          value: 'dashboard',
        },
        timeout: 10000,
      });
    });

    it('should convert title signal to expectTitle assertion', () => {
      const signals: CompletionSignal[] = [
        {
          type: 'title',
          value: 'Dashboard',
        },
      ];

      const assertions = completionSignalsToAssertions(signals);

      expect(assertions).toHaveLength(1);
      expect(assertions[0]).toMatchObject({
        type: 'expectTitle',
      });
      expect(assertions[0]).toHaveProperty('title');
      expect((assertions[0] as { title: RegExp }).title).toBeInstanceOf(RegExp);
    });

    it('should convert title signal with exact match option', () => {
      const signals: CompletionSignal[] = [
        {
          type: 'title',
          value: 'Dashboard - My App',
          options: { exact: true },
        },
      ];

      const assertions = completionSignalsToAssertions(signals);

      expect(assertions).toHaveLength(1);
      expect(assertions[0]).toMatchObject({
        type: 'expectTitle',
        title: 'Dashboard - My App',
      });
    });

    it('should convert api signal to waitForResponse assertion', () => {
      const signals: CompletionSignal[] = [
        {
          type: 'api',
          value: '/api/user',
        },
      ];

      const assertions = completionSignalsToAssertions(signals);

      expect(assertions).toHaveLength(1);
      expect(assertions[0]).toMatchObject({
        type: 'waitForResponse',
        urlPattern: '/api/user',
      });
    });

    it('should convert multiple completion signals', () => {
      const signals: CompletionSignal[] = [
        {
          type: 'url',
          value: '/dashboard',
        },
        {
          type: 'toast',
          value: 'Welcome back',
        },
        {
          type: 'element',
          value: '[data-testid="user-menu"]',
        },
      ];

      const assertions = completionSignalsToAssertions(signals);

      expect(assertions).toHaveLength(3);
      expect(assertions[0].type).toBe('expectURL');
      expect(assertions[1].type).toBe('expectToast');
      expect(assertions[2].type).toBe('expectVisible');
    });

    it('should throw error for unknown signal type', () => {
      const signals: CompletionSignal[] = [
        {
          type: 'unknown' as any,
          value: 'test',
        },
      ];

      expect(() => completionSignalsToAssertions(signals)).toThrow(
        'Unknown completion signal type: unknown'
      );
    });

    it('should handle empty signals array', () => {
      const signals: CompletionSignal[] = [];

      const assertions = completionSignalsToAssertions(signals);

      expect(assertions).toHaveLength(0);
    });

    it('should escape regex special characters in url pattern', () => {
      const signals: CompletionSignal[] = [
        {
          type: 'url',
          value: '/dashboard?id=123&tab=overview',
        },
      ];

      const assertions = completionSignalsToAssertions(signals);

      expect(assertions[0]).toHaveProperty('pattern');
      const pattern = (assertions[0] as { pattern: RegExp }).pattern;
      expect(pattern).toBeInstanceOf(RegExp);
      // Should match the URL with escaped special chars
      expect(pattern.test('/dashboard?id=123&tab=overview')).toBe(true);
    });

    it('should escape regex special characters in title pattern', () => {
      const signals: CompletionSignal[] = [
        {
          type: 'title',
          value: 'Dashboard (Admin)',
        },
      ];

      const assertions = completionSignalsToAssertions(signals);

      expect(assertions[0]).toHaveProperty('title');
      const title = (assertions[0] as { title: RegExp }).title;
      expect(title).toBeInstanceOf(RegExp);
      // Should match the title with escaped parentheses
      expect(title.test('Dashboard (Admin)')).toBe(true);
    });
  });
});
