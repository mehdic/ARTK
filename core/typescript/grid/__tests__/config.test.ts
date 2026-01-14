/**
 * Unit tests for AG Grid configuration utilities
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeConfig,
  mergeTimeouts,
  validateConfig,
  getColumnDisplayName,
  getEnterpriseFeatures,
  hasEnterpriseFeatures,
  getColumnPinnedPosition,
} from '../ag-grid/config.js';
import { DEFAULT_TIMEOUTS } from '../types.js';

describe('normalizeConfig', () => {
  it('should convert string selector to full config', () => {
    const config = normalizeConfig('orders-grid');

    expect(config.selector).toBe('orders-grid');
    expect(config.timeouts).toEqual(DEFAULT_TIMEOUTS);
  });

  it('should preserve existing config properties', () => {
    const config = normalizeConfig({
      selector: 'orders-grid',
      rowIdField: 'orderId',
      columns: [{ colId: 'orderId', displayName: 'Order ID' }],
    });

    expect(config.selector).toBe('orders-grid');
    expect(config.rowIdField).toBe('orderId');
    expect(config.columns).toHaveLength(1);
    expect(config.columns![0].colId).toBe('orderId');
  });

  it('should merge custom timeouts with defaults', () => {
    const config = normalizeConfig({
      selector: 'grid',
      timeouts: { gridReady: 60000 },
    });

    expect(config.timeouts.gridReady).toBe(60000);
    expect(config.timeouts.rowLoad).toBe(DEFAULT_TIMEOUTS.rowLoad);
    expect(config.timeouts.cellEdit).toBe(DEFAULT_TIMEOUTS.cellEdit);
    expect(config.timeouts.scroll).toBe(DEFAULT_TIMEOUTS.scroll);
  });

  it('should handle empty timeouts object', () => {
    const config = normalizeConfig({
      selector: 'grid',
      timeouts: {},
    });

    expect(config.timeouts).toEqual(DEFAULT_TIMEOUTS);
  });
});

describe('mergeTimeouts', () => {
  it('should return defaults when no custom provided', () => {
    const timeouts = mergeTimeouts();
    expect(timeouts).toEqual(DEFAULT_TIMEOUTS);
  });

  it('should return defaults when undefined provided', () => {
    const timeouts = mergeTimeouts(undefined);
    expect(timeouts).toEqual(DEFAULT_TIMEOUTS);
  });

  it('should merge partial custom timeouts', () => {
    const timeouts = mergeTimeouts({ gridReady: 60000, scroll: 100 });

    expect(timeouts.gridReady).toBe(60000);
    expect(timeouts.scroll).toBe(100);
    expect(timeouts.rowLoad).toBe(DEFAULT_TIMEOUTS.rowLoad);
    expect(timeouts.cellEdit).toBe(DEFAULT_TIMEOUTS.cellEdit);
  });

  it('should allow overriding all timeouts', () => {
    const custom = {
      gridReady: 1,
      rowLoad: 2,
      cellEdit: 3,
      scroll: 4,
    };
    const timeouts = mergeTimeouts(custom);

    expect(timeouts).toEqual(custom);
  });
});

describe('validateConfig', () => {
  it('should accept valid config with selector', () => {
    expect(() => validateConfig({ selector: 'orders-grid' })).not.toThrow();
  });

  it('should reject config without selector', () => {
    expect(() => validateConfig({} as any)).toThrow('selector');
  });

  it('should reject config with empty selector', () => {
    expect(() => validateConfig({ selector: '' })).toThrow('selector');
  });

  it('should reject config with whitespace-only selector', () => {
    expect(() => validateConfig({ selector: '   ' })).toThrow('selector');
  });

  it('should accept config with valid columns', () => {
    expect(() =>
      validateConfig({
        selector: 'grid',
        columns: [{ colId: 'orderId' }, { colId: 'amount' }],
      })
    ).not.toThrow();
  });

  it('should reject config with invalid column (no colId)', () => {
    expect(() =>
      validateConfig({
        selector: 'grid',
        columns: [{ colId: '' }],
      })
    ).toThrow('colId');
  });

  it('should accept config with valid timeouts', () => {
    expect(() =>
      validateConfig({
        selector: 'grid',
        timeouts: { gridReady: 60000, rowLoad: 10000 },
      })
    ).not.toThrow();
  });

  it('should reject config with negative timeout', () => {
    expect(() =>
      validateConfig({
        selector: 'grid',
        timeouts: { gridReady: -1 },
      })
    ).toThrow('positive number');
  });

  it('should reject config with non-number timeout', () => {
    expect(() =>
      validateConfig({
        selector: 'grid',
        timeouts: { gridReady: 'fast' as any },
      })
    ).toThrow('positive number');
  });
});

describe('getColumnDisplayName', () => {
  it('should return displayName when defined', () => {
    const config = normalizeConfig({
      selector: 'grid',
      columns: [{ colId: 'orderId', displayName: 'Order ID' }],
    });

    expect(getColumnDisplayName(config, 'orderId')).toBe('Order ID');
  });

  it('should return colId when displayName not defined', () => {
    const config = normalizeConfig({
      selector: 'grid',
      columns: [{ colId: 'orderId' }],
    });

    expect(getColumnDisplayName(config, 'orderId')).toBe('orderId');
  });

  it('should return colId when column not found', () => {
    const config = normalizeConfig({ selector: 'grid' });

    expect(getColumnDisplayName(config, 'unknownColumn')).toBe('unknownColumn');
  });

  it('should return colId when columns not defined', () => {
    const config = normalizeConfig('grid');

    expect(getColumnDisplayName(config, 'orderId')).toBe('orderId');
  });
});

describe('getEnterpriseFeatures', () => {
  it('should return all false when no enterprise config', () => {
    const config = normalizeConfig('grid');
    const features = getEnterpriseFeatures(config);

    expect(features.rowGrouping).toBe(false);
    expect(features.treeData).toBe(false);
    expect(features.masterDetail).toBe(false);
    expect(features.serverSide).toBe(false);
  });

  it('should return configured features', () => {
    const config = normalizeConfig({
      selector: 'grid',
      enterprise: { rowGrouping: true, masterDetail: true },
    });
    const features = getEnterpriseFeatures(config);

    expect(features.rowGrouping).toBe(true);
    expect(features.treeData).toBe(false);
    expect(features.masterDetail).toBe(true);
    expect(features.serverSide).toBe(false);
  });
});

describe('hasEnterpriseFeatures', () => {
  it('should return false when no enterprise features', () => {
    const config = normalizeConfig('grid');
    expect(hasEnterpriseFeatures(config)).toBe(false);
  });

  it('should return true when any enterprise feature is enabled', () => {
    const config = normalizeConfig({
      selector: 'grid',
      enterprise: { treeData: true },
    });
    expect(hasEnterpriseFeatures(config)).toBe(true);
  });

  it('should return false when enterprise is empty object', () => {
    const config = normalizeConfig({
      selector: 'grid',
      enterprise: {},
    });
    expect(hasEnterpriseFeatures(config)).toBe(false);
  });
});

describe('getColumnPinnedPosition', () => {
  it('should return pinned position when defined', () => {
    const config = normalizeConfig({
      selector: 'grid',
      columns: [
        { colId: 'checkbox', pinned: 'left' },
        { colId: 'actions', pinned: 'right' },
      ],
    });

    expect(getColumnPinnedPosition(config, 'checkbox')).toBe('left');
    expect(getColumnPinnedPosition(config, 'actions')).toBe('right');
  });

  it('should return null when not pinned', () => {
    const config = normalizeConfig({
      selector: 'grid',
      columns: [{ colId: 'orderId' }],
    });

    expect(getColumnPinnedPosition(config, 'orderId')).toBeNull();
  });

  it('should return null when column not found', () => {
    const config = normalizeConfig('grid');
    expect(getColumnPinnedPosition(config, 'unknown')).toBeNull();
  });
});
