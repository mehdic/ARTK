/**
 * Selector Catalog Tests
 * @see T086 - Unit test for catalog schema
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createEmptyCatalog,
  validateCatalog,
  type SelectorCatalog,
  type SelectorEntry,
} from '../../src/selectors/catalogSchema.js';
import {
  loadCatalog,
  getCatalog,
  resetCatalogCache,
  findSelectorById,
  findByTestId,
  findByComponent,
  searchSelectors,
  getAllTestIds,
  hasTestId,
  addSelector,
  removeSelector,
  suggestSelector,
} from '../../src/selectors/catalog.js';

describe('SelectorCatalog Schema', () => {
  describe('createEmptyCatalog', () => {
    it('should create an empty catalog with defaults', () => {
      const catalog = createEmptyCatalog();

      expect(catalog.version).toBe('1.0.0');
      expect(catalog.generatedAt).toBeDefined();
      expect(catalog.selectors).toEqual({});
      expect(catalog.components).toEqual({});
      expect(catalog.pages).toEqual({});
      expect(catalog.testIds).toEqual([]);
      expect(catalog.cssDebt).toEqual([]);
    });
  });

  describe('validateCatalog', () => {
    it('should validate a valid catalog', () => {
      const catalog: SelectorCatalog = {
        version: '1.0.0',
        generatedAt: new Date().toISOString(),
        selectors: {
          'login-submit': {
            id: 'login-submit',
            strategy: 'testid',
            value: 'submit-button',
            stable: true,
          },
        },
        components: {},
        pages: {},
        testIds: ['submit-button'],
        cssDebt: [],
      };

      const result = validateCatalog(catalog);

      expect(result.valid).toBe(true);
      expect(result.catalog).toBeDefined();
    });

    it('should reject invalid catalog', () => {
      const invalid = {
        version: '1.0.0',
        // Missing required fields
      };

      const result = validateCatalog(invalid);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate selector entry strategies', () => {
      const catalogWithInvalidStrategy = {
        version: '1.0.0',
        generatedAt: new Date().toISOString(),
        selectors: {
          test: {
            id: 'test',
            strategy: 'invalid-strategy',
            value: 'test',
            stable: true,
          },
        },
        testIds: [],
        cssDebt: [],
      };

      const result = validateCatalog(catalogWithInvalidStrategy);

      expect(result.valid).toBe(false);
    });
  });
});

describe('Catalog Operations', () => {
  beforeEach(() => {
    resetCatalogCache();
  });

  describe('getCatalog', () => {
    it('should return empty catalog when none loaded', () => {
      const catalog = getCatalog();

      expect(catalog).toBeDefined();
      expect(catalog.version).toBe('1.0.0');
    });
  });

  describe('addSelector', () => {
    it('should add selector to catalog', () => {
      const selector: SelectorEntry = {
        id: 'test-selector',
        strategy: 'testid',
        value: 'my-button',
        stable: true,
      };

      addSelector(selector);

      const found = findSelectorById('test-selector');
      expect(found).toEqual(selector);
    });

    it('should track testid in testIds array', () => {
      addSelector({
        id: 'btn-1',
        strategy: 'testid',
        value: 'submit-btn',
        stable: true,
      });

      expect(hasTestId('submit-btn')).toBe(true);
      expect(getAllTestIds()).toContain('submit-btn');
    });
  });

  describe('removeSelector', () => {
    it('should remove selector from catalog', () => {
      addSelector({
        id: 'to-remove',
        strategy: 'testid',
        value: 'remove-me',
        stable: true,
      });

      const removed = removeSelector('to-remove');

      expect(removed).toBe(true);
      expect(findSelectorById('to-remove')).toBeNull();
    });

    it('should return false for non-existent selector', () => {
      const removed = removeSelector('does-not-exist');

      expect(removed).toBe(false);
    });
  });

  describe('findByTestId', () => {
    it('should find selector by testid value', () => {
      addSelector({
        id: 'login-btn',
        strategy: 'testid',
        value: 'login-button',
        stable: true,
      });

      const found = findByTestId('login-button');

      expect(found).not.toBeNull();
      expect(found?.id).toBe('login-btn');
    });

    it('should return null for non-existent testid', () => {
      const found = findByTestId('nonexistent');

      expect(found).toBeNull();
    });
  });

  describe('findByComponent', () => {
    it('should find selectors by component name', () => {
      const catalog = getCatalog();

      // Add component with selectors
      catalog.components['LoginForm'] = {
        name: 'LoginForm',
        selectors: ['login-email', 'login-password'],
      };

      addSelector({
        id: 'login-email',
        strategy: 'label',
        value: 'Email',
        component: 'LoginForm',
        stable: true,
      });

      addSelector({
        id: 'login-password',
        strategy: 'label',
        value: 'Password',
        component: 'LoginForm',
        stable: true,
      });

      const selectors = findByComponent('LoginForm');

      expect(selectors).toHaveLength(2);
    });

    it('should return empty array for unknown component', () => {
      const selectors = findByComponent('UnknownComponent');

      expect(selectors).toEqual([]);
    });
  });

  describe('searchSelectors', () => {
    it('should search by value', () => {
      addSelector({
        id: 'submit-btn',
        strategy: 'testid',
        value: 'submit-button',
        stable: true,
      });

      const results = searchSelectors('submit');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].value).toContain('submit');
    });

    it('should search by description', () => {
      addSelector({
        id: 'login-btn',
        description: 'Login form submit button',
        strategy: 'testid',
        value: 'btn-login',
        stable: true,
      });

      const results = searchSelectors('login form');

      expect(results.length).toBeGreaterThan(0);
    });

    it('should search by tags', () => {
      addSelector({
        id: 'nav-link',
        strategy: 'role',
        value: 'link',
        tags: ['navigation', 'header'],
        stable: true,
      });

      const results = searchSelectors('navigation');

      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('suggestSelector', () => {
    it('should suggest best matching selector', () => {
      addSelector({
        id: 'stable-btn',
        description: 'Main action button',
        strategy: 'testid',
        value: 'action-btn',
        stable: true,
      });

      addSelector({
        id: 'unstable-btn',
        description: 'Main action css',
        strategy: 'css',
        value: '.action-btn',
        stable: false,
      });

      const suggestion = suggestSelector('action');

      // Should prefer stable testid over unstable css
      expect(suggestion?.stable).toBe(true);
      expect(suggestion?.strategy).toBe('testid');
    });

    it('should return null for no match', () => {
      const suggestion = suggestSelector('completely-unknown-element');

      expect(suggestion).toBeNull();
    });
  });
});
