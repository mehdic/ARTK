/**
 * Tests for LLKB Framework Packs
 */

import { describe, expect, it } from 'vitest';
import {
  getPackRegistry,
  loadDiscoveredPatternsForFrameworks,
  loadPacksForFrameworks,
  packPatternsToDiscovered,
} from '../packs/index.js';
import { getReactPack } from '../packs/react.js';
import { getAngularPack } from '../packs/angular.js';
import { getMuiPack } from '../packs/mui.js';
import { getAntdPack } from '../packs/antd.js';
import { getChakraPack } from '../packs/chakra.js';

describe('LLKB Framework Packs', () => {
  describe('getPackRegistry', () => {
    it('should return all pack registry entries', () => {
      const registry = getPackRegistry();

      expect(registry).toBeDefined();
      expect(Array.isArray(registry)).toBe(true);
      expect(registry.length).toBeGreaterThan(0);

      // Verify each entry has required fields
      for (const entry of registry) {
        expect(entry.name).toBeDefined();
        expect(entry.frameworks).toBeDefined();
        expect(Array.isArray(entry.frameworks)).toBe(true);
        expect(typeof entry.loader).toBe('function');
      }
    });

    it('should include all expected packs', () => {
      const registry = getPackRegistry();
      const packNames = registry.map(e => e.name);

      expect(packNames).toContain('react');
      expect(packNames).toContain('angular');
      expect(packNames).toContain('mui');
      expect(packNames).toContain('antd');
      expect(packNames).toContain('chakra');
    });
  });

  describe('loadPacksForFrameworks', () => {
    it('should load React pack for react framework', () => {
      const packs = loadPacksForFrameworks(['react']);

      expect(packs).toHaveLength(1);
      expect(packs[0]?.name).toBe('react');
      expect(packs[0]?.framework).toBe('react');
    });

    it('should load React pack for nextjs framework', () => {
      const packs = loadPacksForFrameworks(['nextjs']);

      expect(packs).toHaveLength(1);
      expect(packs[0]?.name).toBe('react');
    });

    it('should load Angular pack for angular framework', () => {
      const packs = loadPacksForFrameworks(['angular']);

      expect(packs).toHaveLength(1);
      expect(packs[0]?.name).toBe('angular');
    });

    it('should load MUI pack for mui framework', () => {
      const packs = loadPacksForFrameworks(['mui']);

      expect(packs).toHaveLength(1);
      expect(packs[0]?.name).toBe('mui');
    });

    it('should load multiple packs for multiple frameworks', () => {
      const packs = loadPacksForFrameworks(['react', 'mui', 'antd']);

      expect(packs.length).toBeGreaterThanOrEqual(3);
      const packNames = packs.map(p => p.name);
      expect(packNames).toContain('react');
      expect(packNames).toContain('mui');
      expect(packNames).toContain('antd');
    });

    it('should handle case-insensitive framework names', () => {
      const packs = loadPacksForFrameworks(['REACT', 'MUI']);

      expect(packs.length).toBeGreaterThanOrEqual(2);
      const packNames = packs.map(p => p.name);
      expect(packNames).toContain('react');
      expect(packNames).toContain('mui');
    });

    it('should return empty array for unknown frameworks', () => {
      const packs = loadPacksForFrameworks(['unknown-framework']);

      expect(packs).toHaveLength(0);
    });

    it('should not load duplicate packs', () => {
      const packs = loadPacksForFrameworks(['react', 'react', 'nextjs']);

      // Should only load react pack once (both 'react' and 'nextjs' trigger it)
      expect(packs).toHaveLength(1);
      expect(packs[0]?.name).toBe('react');
    });
  });

  describe('Individual Packs', () => {
    describe('React Pack', () => {
      it('should have minimum 30 patterns', () => {
        const pack = getReactPack();

        expect(pack.patterns.length).toBeGreaterThanOrEqual(30);
      });

      it('should have valid pattern structure', () => {
        const pack = getReactPack();

        for (const pattern of pack.patterns) {
          expect(pattern.text).toBeDefined();
          expect(typeof pattern.text).toBe('string');
          expect(pattern.primitive).toBeDefined();
          expect(pattern.category).toBeDefined();
          expect(['auth', 'navigation', 'ui-interaction', 'data', 'assertion', 'timing']).toContain(pattern.category);
        }
      });

      it('should include hook-related patterns', () => {
        const pack = getReactPack();
        const patternTexts = pack.patterns.map(p => p.text.toLowerCase());

        expect(patternTexts.some(t => t.includes('useeffect'))).toBe(true);
        expect(patternTexts.some(t => t.includes('usestate'))).toBe(true);
      });
    });

    describe('Angular Pack', () => {
      it('should have minimum 30 patterns', () => {
        const pack = getAngularPack();

        expect(pack.patterns.length).toBeGreaterThanOrEqual(30);
      });

      it('should include directive patterns', () => {
        const pack = getAngularPack();
        const patternTexts = pack.patterns.map(p => p.text.toLowerCase());

        expect(patternTexts.some(t => t.includes('ngif'))).toBe(true);
        expect(patternTexts.some(t => t.includes('ngfor'))).toBe(true);
      });

      it('should include router patterns', () => {
        const pack = getAngularPack();
        const patternTexts = pack.patterns.map(p => p.text.toLowerCase());

        expect(patternTexts.some(t => t.includes('route'))).toBe(true);
      });
    });

    describe('MUI Pack', () => {
      it('should have minimum 25 patterns', () => {
        const pack = getMuiPack();

        expect(pack.patterns.length).toBeGreaterThanOrEqual(25);
      });

      it('should include DataGrid patterns with selector hints', () => {
        const pack = getMuiPack();
        const dataGridPatterns = pack.patterns.filter(p => p.text.toLowerCase().includes('datagrid'));

        expect(dataGridPatterns.length).toBeGreaterThan(0);

        for (const pattern of dataGridPatterns) {
          expect(pattern.selectorHints).toBeDefined();
          expect(pattern.selectorHints!.length).toBeGreaterThan(0);
        }
      });

      it('should use MUI-specific CSS selectors', () => {
        const pack = getMuiPack();
        const allSelectors = pack.patterns
          .flatMap(p => p.selectorHints || [])
          .map(h => h.value);

        const muiSelectors = allSelectors.filter(s => s.includes('Mui'));
        expect(muiSelectors.length).toBeGreaterThan(0);
      });
    });

    describe('Ant Design Pack', () => {
      it('should have minimum 25 patterns', () => {
        const pack = getAntdPack();

        expect(pack.patterns.length).toBeGreaterThanOrEqual(25);
      });

      it('should include table patterns with selector hints', () => {
        const pack = getAntdPack();
        const tablePatterns = pack.patterns.filter(p => p.text.toLowerCase().includes('table'));

        expect(tablePatterns.length).toBeGreaterThan(0);

        for (const pattern of tablePatterns) {
          expect(pattern.selectorHints).toBeDefined();
          expect(pattern.selectorHints!.length).toBeGreaterThan(0);
        }
      });

      it('should use Ant-specific CSS selectors', () => {
        const pack = getAntdPack();
        const allSelectors = pack.patterns
          .flatMap(p => p.selectorHints || [])
          .map(h => h.value);

        const antSelectors = allSelectors.filter(s => s.includes('ant-'));
        expect(antSelectors.length).toBeGreaterThan(0);
      });
    });

    describe('Chakra UI Pack', () => {
      it('should have minimum 20 patterns', () => {
        const pack = getChakraPack();

        expect(pack.patterns.length).toBeGreaterThanOrEqual(20);
      });

      it('should include modal and toast patterns', () => {
        const pack = getChakraPack();
        const patternTexts = pack.patterns.map(p => p.text.toLowerCase());

        expect(patternTexts.some(t => t.includes('modal'))).toBe(true);
        expect(patternTexts.some(t => t.includes('toast'))).toBe(true);
      });
    });
  });

  describe('packPatternsToDiscovered', () => {
    it('should convert pack patterns to DiscoveredPattern format', () => {
      const pack = getReactPack();
      const discovered = packPatternsToDiscovered(pack);

      expect(discovered.length).toBe(pack.patterns.length);

      for (const pattern of discovered) {
        expect(pattern.id).toBeDefined();
        expect(pattern.id).toMatch(/^DP-[a-f0-9]{8}$/);
        expect(pattern.normalizedText).toBeDefined();
        expect(pattern.originalText).toBeDefined();
        expect(pattern.mappedPrimitive).toBeDefined();
        expect(Array.isArray(pattern.selectorHints)).toBe(true);
        expect(typeof pattern.confidence).toBe('number');
        expect(pattern.confidence).toBeGreaterThan(0);
        expect(pattern.confidence).toBeLessThanOrEqual(1);
        expect(pattern.layer).toBe('framework');
        expect(pattern.category).toBeDefined();
        expect(Array.isArray(pattern.sourceJourneys)).toBe(true);
        expect(pattern.successCount).toBe(0);
        expect(pattern.failCount).toBe(0);
      }
    });

    it('should preserve selector hints from pack patterns', () => {
      const pack = getMuiPack();
      const discovered = packPatternsToDiscovered(pack);

      const patternsWithHints = discovered.filter(p => p.selectorHints.length > 0);
      expect(patternsWithHints.length).toBeGreaterThan(0);
    });

    it('should normalize text to lowercase', () => {
      const pack = getReactPack();
      const discovered = packPatternsToDiscovered(pack);

      for (const pattern of discovered) {
        expect(pattern.normalizedText).toBe(pattern.normalizedText.toLowerCase());
      }
    });

    it('should use default confidence when not specified', () => {
      const pack = getReactPack();
      const discovered = packPatternsToDiscovered(pack);

      // At least some patterns should have default confidence (0.65)
      const defaultConfidencePatterns = discovered.filter(p => p.confidence === 0.65);
      expect(defaultConfidencePatterns.length).toBeGreaterThan(0);
    });
  });

  describe('loadDiscoveredPatternsForFrameworks', () => {
    it('should load and convert patterns for React', () => {
      const patterns = loadDiscoveredPatternsForFrameworks(['react']);

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns.every(p => p.layer === 'framework')).toBe(true);
    });

    it('should load and convert patterns for multiple frameworks', () => {
      const patterns = loadDiscoveredPatternsForFrameworks(['react', 'mui']);

      expect(patterns.length).toBeGreaterThan(0);

      // Should have patterns from both React and MUI packs
      const reactPatterns = patterns.filter(p => p.entityName === 'react');
      const muiPatterns = patterns.filter(p => p.entityName === 'mui');

      expect(reactPatterns.length).toBeGreaterThan(0);
      expect(muiPatterns.length).toBeGreaterThan(0);
    });

    it('should return empty array for unknown frameworks', () => {
      const patterns = loadDiscoveredPatternsForFrameworks(['unknown']);

      expect(patterns).toHaveLength(0);
    });

    it('should generate unique IDs for each pattern', () => {
      const patterns = loadDiscoveredPatternsForFrameworks(['react', 'angular']);

      const ids = patterns.map(p => p.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });
  });
});
