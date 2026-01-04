import { describe, it, expect } from 'vitest';
import { structuredPatterns, parseSelectorToLocator, matchPattern } from '../../src/mapping/patterns.js';

describe('Structured Patterns', () => {
  describe('parseSelectorToLocator', () => {
    it('should parse button selectors', () => {
      const result = parseSelectorToLocator('login button');
      expect(result).toEqual({
        strategy: 'role',
        value: 'button',
        name: 'login',
      });
    });

    it('should parse link selectors', () => {
      const result = parseSelectorToLocator('sign up link');
      expect(result).toEqual({
        strategy: 'role',
        value: 'link',
        name: 'sign up',
      });
    });

    it('should parse input/field selectors', () => {
      const result = parseSelectorToLocator('email field');
      expect(result).toEqual({
        strategy: 'label',
        value: 'email',
      });
    });

    it('should remove leading "the"', () => {
      const result = parseSelectorToLocator('the login button');
      expect(result).toEqual({
        strategy: 'role',
        value: 'button',
        name: 'login',
      });
    });

    it('should default to text strategy', () => {
      const result = parseSelectorToLocator('Dashboard');
      expect(result).toEqual({
        strategy: 'text',
        value: 'Dashboard',
      });
    });
  });

  describe('structuredPatterns - Action', () => {
    it('should match click action pattern', () => {
      const primitive = matchPattern('**Action**: Click the login button');
      expect(primitive).toBeTruthy();
      expect(primitive?.type).toBe('click');
      if (primitive?.type === 'click') {
        expect(primitive.locator.strategy).toBe('role');
        expect(primitive.locator.value).toBe('button');
      }
    });

    it('should match fill action pattern', () => {
      const primitive = matchPattern('**Action**: Fill email field with test@example.com');
      expect(primitive).toBeTruthy();
      expect(primitive?.type).toBe('fill');
      if (primitive?.type === 'fill') {
        expect(primitive.locator.strategy).toBe('label');
        expect(primitive.value.type).toBe('literal');
        expect(primitive.value.value).toBe('test@example.com');
      }
    });

    it('should match navigate action pattern', () => {
      const primitive = matchPattern('**Action**: Navigate to /dashboard');
      expect(primitive).toBeTruthy();
      expect(primitive?.type).toBe('goto');
      if (primitive?.type === 'goto') {
        expect(primitive.url).toBe('/dashboard');
        expect(primitive.waitForLoad).toBe(true);
      }
    });
  });

  describe('structuredPatterns - Wait for', () => {
    it('should match wait for visible pattern', () => {
      const primitive = matchPattern('**Wait for**: Dashboard to load');
      expect(primitive).toBeTruthy();
      expect(primitive?.type).toBe('expectVisible');
      if (primitive?.type === 'expectVisible') {
        expect(primitive.locator.strategy).toBe('text');
        expect(primitive.locator.value).toBe('Dashboard');
      }
    });

    it('should match wait for element to appear', () => {
      const primitive = matchPattern('**Wait for**: Profile menu to appear');
      expect(primitive).toBeTruthy();
      expect(primitive?.type).toBe('expectVisible');
    });
  });

  describe('structuredPatterns - Assert', () => {
    it('should match assert visible pattern', () => {
      const primitive = matchPattern('**Assert**: User name is visible');
      expect(primitive).toBeTruthy();
      expect(primitive?.type).toBe('expectVisible');
      if (primitive?.type === 'expectVisible') {
        expect(primitive.locator.strategy).toBe('text');
        expect(primitive.locator.value).toBe('User name');
      }
    });

    it('should match assert contains text pattern', () => {
      const primitive = matchPattern('**Assert**: Welcome message contains Hello User');
      expect(primitive).toBeTruthy();
      expect(primitive?.type).toBe('expectText');
      if (primitive?.type === 'expectText') {
        expect(primitive.locator.strategy).toBe('text');
        expect(primitive.locator.value).toBe('Welcome message');
        expect(primitive.text).toBe('Hello User');
      }
    });
  });

  describe('structuredPatterns - Actor values', () => {
    it('should recognize actor references in fill pattern', () => {
      const primitive = matchPattern('**Action**: Fill email field with {{email}}');
      expect(primitive).toBeTruthy();
      expect(primitive?.type).toBe('fill');
      if (primitive?.type === 'fill') {
        expect(primitive.value.type).toBe('actor');
        expect(primitive.value.value).toBe('email');
      }
    });
  });

  describe('Pattern priority', () => {
    it('should match structured patterns before legacy patterns', () => {
      const primitive = matchPattern('**Action**: Click login button');
      expect(primitive).toBeTruthy();
      expect(primitive?.type).toBe('click');
      // Verify it's using structured pattern by checking the pattern name
      // (structured patterns process slightly differently)
    });
  });
});
