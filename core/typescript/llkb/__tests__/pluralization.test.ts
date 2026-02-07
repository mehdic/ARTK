import { describe, expect, it } from 'vitest';
import {
  getSingularPlural,
  IRREGULAR_PLURALS,
  IRREGULAR_SINGULARS,
  isUncountable,
  pluralize,
  singularize,
  UNCOUNTABLE_NOUNS,
} from '../pluralization.js';

describe('pluralization module', () => {
  describe('IRREGULAR_PLURALS constant', () => {
    it('should have at least 50 irregular words', () => {
      expect(Object.keys(IRREGULAR_PLURALS).length).toBeGreaterThanOrEqual(50);
    });

    it('should be frozen (immutable)', () => {
      expect(Object.isFrozen(IRREGULAR_PLURALS)).toBe(true);
    });

    it('should include words from mining.ts', () => {
      // Words that were only in mining.ts
      expect(IRREGULAR_PLURALS['embargo']).toBe('embargoes');
      expect(IRREGULAR_PLURALS['veto']).toBe('vetoes');
      expect(IRREGULAR_PLURALS['diagnosis']).toBe('diagnoses');
      expect(IRREGULAR_PLURALS['hypothesis']).toBe('hypotheses');
      expect(IRREGULAR_PLURALS['stimulus']).toBe('stimuli');
      expect(IRREGULAR_PLURALS['focus']).toBe('foci');
    });

    it('should include words from template-generators.ts', () => {
      // Words that were only in template-generators.ts
      expect(IRREGULAR_PLURALS['self']).toBe('selves');
      expect(IRREGULAR_PLURALS['cargo']).toBe('cargoes');
      expect(IRREGULAR_PLURALS['vertex']).toBe('vertices');
      expect(IRREGULAR_PLURALS['status']).toBe('statuses');
      expect(IRREGULAR_PLURALS['quiz']).toBe('quizzes');
    });
  });

  describe('IRREGULAR_SINGULARS constant', () => {
    it('should be the reverse of IRREGULAR_PLURALS', () => {
      for (const [singular, plural] of Object.entries(IRREGULAR_PLURALS)) {
        expect(IRREGULAR_SINGULARS[plural]).toBe(singular);
      }
    });

    it('should be frozen (immutable)', () => {
      expect(Object.isFrozen(IRREGULAR_SINGULARS)).toBe(true);
    });
  });

  describe('pluralize', () => {
    describe('irregular plurals', () => {
      it.each([
        ['person', 'people'],
        ['child', 'children'],
        ['man', 'men'],
        ['woman', 'women'],
        ['tooth', 'teeth'],
        ['foot', 'feet'],
        ['mouse', 'mice'],
        ['goose', 'geese'],
        ['ox', 'oxen'],
        ['quiz', 'quizzes'],
        ['status', 'statuses'],
        ['vertex', 'vertices'],
        ['self', 'selves'],
        ['cargo', 'cargoes'],
        ['datum', 'data'],
        ['criterion', 'criteria'],
        ['analysis', 'analyses'],
        ['thesis', 'theses'],
        ['focus', 'foci'],
        ['cactus', 'cacti'],
      ])('should pluralize irregular %s to %s', (singular, expected) => {
        expect(pluralize(singular)).toBe(expected);
      });
    });

    describe('regular plurals', () => {
      it.each([
        ['user', 'users'],
        ['product', 'products'],
        ['order', 'orders'],
        ['item', 'items'],
        ['account', 'accounts'],
      ])('should add -s to regular words: %s -> %s', (singular, expected) => {
        expect(pluralize(singular)).toBe(expected);
      });

      it.each([
        ['category', 'categories'],
        ['company', 'companies'],
        ['story', 'stories'],
        ['inventory', 'inventories'],
        ['territory', 'territories'],
      ])('should change -y to -ies: %s -> %s', (singular, expected) => {
        expect(pluralize(singular)).toBe(expected);
      });

      it.each([
        ['day', 'days'],
        ['key', 'keys'],
        ['boy', 'boys'],
        ['toy', 'toys'],
        ['journey', 'journeys'],
      ])('should add -s when -y is preceded by vowel: %s -> %s', (singular, expected) => {
        expect(pluralize(singular)).toBe(expected);
      });

      it.each([
        ['address', 'addresses'],
        ['box', 'boxes'],
        ['buzz', 'buzzes'],
        ['watch', 'watches'],
        ['wish', 'wishes'],
        ['class', 'classes'],
        ['bus', 'buses'],
        ['gas', 'gases'],
        ['lens', 'lenses'],
        ['atlas', 'atlases'],
        ['iris', 'irises'],
      ])('should add -es to -s/-x/-z/-ch/-sh: %s -> %s', (singular, expected) => {
        expect(pluralize(singular)).toBe(expected);
      });

      it.each([
        ['hero', 'heroes'],
        ['potato', 'potatoes'],
        ['tomato', 'tomatoes'],
      ])('should add -es to -o preceded by consonant: %s -> %s', (singular, expected) => {
        expect(pluralize(singular)).toBe(expected);
      });

      it.each([
        ['radio', 'radios'],
        ['video', 'videos'],
        ['studio', 'studios'],
      ])('should add -s to -o preceded by vowel: %s -> %s', (singular, expected) => {
        expect(pluralize(singular)).toBe(expected);
      });
    });

    describe('edge cases', () => {
      it('should handle uppercase input by returning lowercase', () => {
        expect(pluralize('USER')).toBe('users');
        expect(pluralize('PERSON')).toBe('people');
      });

      it('should handle mixed case input', () => {
        expect(pluralize('User')).toBe('users');
        expect(pluralize('Person')).toBe('people');
      });

      it('should not double-pluralize already plural words', () => {
        expect(pluralize('users')).toBe('users');
        expect(pluralize('items')).toBe('items');
      });

      it('should handle single character words', () => {
        expect(pluralize('a')).toBe('as');
        expect(pluralize('i')).toBe('is');
      });

      it('should handle empty string', () => {
        // Fixed: empty string should return empty string, not 's'
        expect(pluralize('')).toBe('');
      });
    });
  });

  describe('singularize', () => {
    describe('irregular singulars', () => {
      it.each([
        ['people', 'person'],
        ['children', 'child'],
        ['men', 'man'],
        ['women', 'woman'],
        ['teeth', 'tooth'],
        ['feet', 'foot'],
        ['mice', 'mouse'],
        ['geese', 'goose'],
        ['oxen', 'ox'],
        ['quizzes', 'quiz'],
        ['statuses', 'status'],
        ['vertices', 'vertex'],
        ['selves', 'self'],
        ['cargoes', 'cargo'],
        ['data', 'datum'],
        ['criteria', 'criterion'],
        ['analyses', 'analysis'],
        ['theses', 'thesis'],
        ['foci', 'focus'],
        ['cacti', 'cactus'],
      ])('should singularize irregular %s to %s', (plural, expected) => {
        expect(singularize(plural)).toBe(expected);
      });
    });

    describe('regular singulars', () => {
      it.each([
        ['users', 'user'],
        ['products', 'product'],
        ['orders', 'order'],
        ['items', 'item'],
        ['accounts', 'account'],
      ])('should remove -s from regular plurals: %s -> %s', (plural, expected) => {
        expect(singularize(plural)).toBe(expected);
      });

      it.each([
        ['categories', 'category'],
        ['companies', 'company'],
        ['stories', 'story'],
        ['inventories', 'inventory'],
      ])('should change -ies to -y: %s -> %s', (plural, expected) => {
        expect(singularize(plural)).toBe(expected);
      });

      it.each([
        ['addresses', 'address'],
        ['boxes', 'box'],
        ['buzzes', 'buzz'],
        ['watches', 'watch'],
        ['wishes', 'wish'],
        ['classes', 'class'],
        ['buses', 'bus'],
      ])('should remove -es from -s/-x/-z/-ch/-sh: %s -> %s', (plural, expected) => {
        expect(singularize(plural)).toBe(expected);
      });
    });

    describe('edge cases', () => {
      it('should handle uppercase input by returning lowercase', () => {
        expect(singularize('USERS')).toBe('user');
        expect(singularize('PEOPLE')).toBe('person');
      });

      it('should not modify already singular words', () => {
        expect(singularize('user')).toBe('user');
        expect(singularize('item')).toBe('item');
      });

      it('should handle words ending in -ss (not removing s)', () => {
        expect(singularize('class')).toBe('class');
        expect(singularize('glass')).toBe('glass');
        expect(singularize('boss')).toBe('boss');
      });

      it('should handle empty string', () => {
        expect(singularize('')).toBe('');
      });
    });
  });

  describe('getSingularPlural', () => {
    it('should return both forms for irregular words', () => {
      expect(getSingularPlural('person')).toEqual({ singular: 'person', plural: 'people' });
      expect(getSingularPlural('people')).toEqual({ singular: 'person', plural: 'people' });
    });

    it('should return both forms for regular words', () => {
      expect(getSingularPlural('user')).toEqual({ singular: 'user', plural: 'users' });
      expect(getSingularPlural('users')).toEqual({ singular: 'user', plural: 'users' });
    });

    it('should handle category/categories correctly', () => {
      expect(getSingularPlural('category')).toEqual({ singular: 'category', plural: 'categories' });
      expect(getSingularPlural('categories')).toEqual({
        singular: 'category',
        plural: 'categories',
      });
    });
  });

  describe('roundtrip consistency', () => {
    it('should roundtrip all irregular plurals correctly', () => {
      for (const [singular, plural] of Object.entries(IRREGULAR_PLURALS)) {
        expect(pluralize(singular)).toBe(plural);
        expect(singularize(plural)).toBe(singular);
      }
    });

    it('should roundtrip common regular words correctly', () => {
      const regularWords = [
        'user',
        'product',
        'order',
        'item',
        'account',
        'category',
        'company',
        'address',
        'box',
        'watch',
      ];

      for (const word of regularWords) {
        const plural = pluralize(word);
        const backToSingular = singularize(plural);
        expect(backToSingular).toBe(word);
      }
    });
  });

  describe('consistency between mining and template-generators use cases', () => {
    it('should handle entity names consistently', () => {
      const entityNames = ['user', 'product', 'order', 'category', 'person', 'child', 'status'];

      for (const name of entityNames) {
        // Mining extracts singular names
        const singular = singularize(pluralize(name));
        // Template generators need plural for patterns
        const plural = pluralize(singular);

        // Should be consistent
        expect(singularize(plural)).toBe(singular);
      }
    });

    it('should handle API route names consistently', () => {
      // API routes often use plural names: /api/users, /api/products
      const apiRoutes = ['users', 'products', 'orders', 'categories', 'people', 'children'];

      for (const route of apiRoutes) {
        const singular = singularize(route);
        const pluralAgain = pluralize(singular);

        // Should get back to original plural
        expect(pluralAgain).toBe(route);
      }
    });
  });

  describe('UNCOUNTABLE_NOUNS', () => {
    it('should have at least 50 uncountable nouns', () => {
      expect(UNCOUNTABLE_NOUNS.size).toBeGreaterThanOrEqual(50);
    });

    it('should be frozen (immutable)', () => {
      expect(Object.isFrozen(UNCOUNTABLE_NOUNS)).toBe(true);
    });

    describe('tech/software terms', () => {
      it.each([
        'software',
        'hardware',
        'firmware',
        'malware',
        'middleware',
        'feedback',
        'bandwidth',
        'traffic',
        'spam',
        'code',
      ])('should include %s', (word) => {
        expect(UNCOUNTABLE_NOUNS.has(word)).toBe(true);
      });
    });

    describe('abstract concepts', () => {
      it.each([
        'advice',
        'information',
        'knowledge',
        'wisdom',
        'intelligence',
        'evidence',
        'research',
        'progress',
      ])('should include %s', (word) => {
        expect(UNCOUNTABLE_NOUNS.has(word)).toBe(true);
      });
    });

    describe('materials and substances', () => {
      it.each([
        'water',
        'air',
        'oil',
        'gold',
        'silver',
        'iron',
        'wood',
        'paper',
        'glass',
      ])('should include %s', (word) => {
        expect(UNCOUNTABLE_NOUNS.has(word)).toBe(true);
      });
    });

    describe('words same in singular and plural', () => {
      it.each([
        'sheep',
        'fish',
        'deer',
        'moose',
        'aircraft',
        'series',
        'species',
      ])('should include %s', (word) => {
        expect(UNCOUNTABLE_NOUNS.has(word)).toBe(true);
      });
    });
  });

  describe('isUncountable', () => {
    it('should return true for uncountable nouns', () => {
      expect(isUncountable('software')).toBe(true);
      expect(isUncountable('information')).toBe(true);
      expect(isUncountable('sheep')).toBe(true);
    });

    it('should return false for countable nouns', () => {
      expect(isUncountable('user')).toBe(false);
      expect(isUncountable('person')).toBe(false);
      expect(isUncountable('category')).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(isUncountable('SOFTWARE')).toBe(true);
      expect(isUncountable('Software')).toBe(true);
      expect(isUncountable('SHEEP')).toBe(true);
    });

    it('should handle non-string input safely', () => {
      expect(isUncountable(null as unknown as string)).toBe(false);
      expect(isUncountable(undefined as unknown as string)).toBe(false);
      expect(isUncountable(123 as unknown as string)).toBe(false);
    });
  });

  describe('pluralize with uncountable nouns', () => {
    it.each([
      ['software', 'software'],
      ['information', 'information'],
      ['equipment', 'equipment'],
      ['furniture', 'furniture'],
      ['news', 'news'],
      ['sheep', 'sheep'],
      ['fish', 'fish'],
      ['deer', 'deer'],
      ['series', 'series'],
      ['species', 'species'],
    ])('should not pluralize uncountable %s', (word, expected) => {
      expect(pluralize(word)).toBe(expected);
    });

    it('should preserve case for uncountable nouns with preserveCase option', () => {
      expect(pluralize('Software', { preserveCase: true })).toBe('Software');
      expect(pluralize('EQUIPMENT', { preserveCase: true })).toBe('EQUIPMENT');
    });
  });

  describe('singularize with uncountable nouns', () => {
    it.each([
      ['software', 'software'],
      ['information', 'information'],
      ['sheep', 'sheep'],
      ['fish', 'fish'],
    ])('should not modify uncountable %s', (word, expected) => {
      expect(singularize(word)).toBe(expected);
    });
  });

  describe('preserveCase option', () => {
    describe('pluralize with preserveCase', () => {
      it('should preserve title case', () => {
        expect(pluralize('User', { preserveCase: true })).toBe('Users');
        expect(pluralize('Person', { preserveCase: true })).toBe('People');
        expect(pluralize('Category', { preserveCase: true })).toBe('Categories');
      });

      it('should preserve all uppercase', () => {
        expect(pluralize('USER', { preserveCase: true })).toBe('USERS');
        expect(pluralize('PERSON', { preserveCase: true })).toBe('PEOPLE');
        expect(pluralize('API', { preserveCase: true })).toBe('APIS');
      });

      it('should preserve lowercase (default behavior)', () => {
        expect(pluralize('user', { preserveCase: true })).toBe('users');
        expect(pluralize('person', { preserveCase: true })).toBe('people');
      });
    });

    describe('singularize with preserveCase', () => {
      it('should preserve title case', () => {
        expect(singularize('Users', { preserveCase: true })).toBe('User');
        expect(singularize('People', { preserveCase: true })).toBe('Person');
        expect(singularize('Categories', { preserveCase: true })).toBe('Category');
      });

      it('should preserve all uppercase', () => {
        expect(singularize('USERS', { preserveCase: true })).toBe('USER');
        expect(singularize('PEOPLE', { preserveCase: true })).toBe('PERSON');
      });
    });
  });

  describe('prototype pollution protection', () => {
    it('should not be vulnerable to __proto__ lookup', () => {
      // These should return undefined, not Object.prototype methods
      expect(IRREGULAR_PLURALS['__proto__']).toBeUndefined();
      expect(IRREGULAR_SINGULARS['__proto__']).toBeUndefined();
    });

    it('should not be vulnerable to constructor lookup', () => {
      expect(IRREGULAR_PLURALS['constructor']).toBeUndefined();
      expect(IRREGULAR_SINGULARS['constructor']).toBeUndefined();
    });

    it('should not be vulnerable to toString lookup', () => {
      expect(IRREGULAR_PLURALS['toString']).toBeUndefined();
      expect(IRREGULAR_SINGULARS['toString']).toBeUndefined();
    });

    it('should safely handle prototype pollution attempts in pluralize', () => {
      // Should return regular pluralization, not polluted value
      expect(pluralize('__proto__')).toBe('__proto__s');
      expect(pluralize('constructor')).toBe('constructors');
    });

    it('should safely handle prototype pollution attempts in singularize', () => {
      expect(singularize('__proto__s')).toBe('__proto__');
      expect(singularize('constructors')).toBe('constructor');
    });
  });

  describe('input validation and edge cases', () => {
    it('should handle non-string input in pluralize', () => {
      expect(pluralize(null as unknown as string)).toBe('null');
      expect(pluralize(undefined as unknown as string)).toBe('undefined');
      expect(pluralize(123 as unknown as string)).toBe('123');
    });

    it('should handle non-string input in singularize', () => {
      expect(singularize(null as unknown as string)).toBe('null');
      expect(singularize(undefined as unknown as string)).toBe('undefined');
      expect(singularize(123 as unknown as string)).toBe('123');
    });

    it('should handle very long words (DoS prevention)', () => {
      const longWord = 'a'.repeat(200);
      // Should return unchanged (exceeds MAX_WORD_LENGTH)
      expect(pluralize(longWord)).toBe(longWord);
      expect(singularize(longWord)).toBe(longWord);
    });

    it('should handle words at boundary length (100 chars)', () => {
      const boundaryWord = 'a'.repeat(100);
      // 100 chars is still processed (limit is > 100, not >= 100)
      expect(pluralize(boundaryWord)).toBe(boundaryWord + 's');
    });

    it('should handle words just over boundary (101 chars)', () => {
      const overBoundaryWord = 'a'.repeat(101);
      // Should return unchanged (exceeds MAX_WORD_LENGTH)
      expect(pluralize(overBoundaryWord)).toBe(overBoundaryWord);
    });
  });

  describe('getSingularPlural with uncountable nouns', () => {
    it('should return same form for uncountable nouns', () => {
      expect(getSingularPlural('software')).toEqual({
        singular: 'software',
        plural: 'software',
      });
      expect(getSingularPlural('sheep')).toEqual({
        singular: 'sheep',
        plural: 'sheep',
      });
    });

    it('should handle empty string', () => {
      expect(getSingularPlural('')).toEqual({
        singular: '',
        plural: '',
      });
    });
  });
});
