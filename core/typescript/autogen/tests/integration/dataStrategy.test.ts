/**
 * Integration test for Data Strategy code generation
 */
import { describe, it, expect } from 'vitest';
import type { IRJourney } from '../../src/ir/types.js';
import { generateTest } from '../../src/codegen/generateTest.js';

describe('Data Strategy Code Generation', () => {
  it('should generate seed strategy code', () => {
    const journey: IRJourney = {
      id: 'JRN-0001',
      title: 'Test Seed Strategy',
      tier: 'smoke',
      scope: 'products',
      actor: 'guest-user',
      tags: ['data'],
      moduleDependencies: {
        foundation: [],
        feature: [],
      },
      steps: [
        {
          id: 'AC-1',
          description: 'View product',
          actions: [],
          assertions: [],
        },
      ],
      data: {
        strategy: 'seed',
        cleanup: 'required',
        seeds: ['products', 'categories'],
      },
    };

    const result = generateTest(journey);

    expect(result.code).toContain('// Data Strategy: seed | Cleanup: required');
    expect(result.code).toContain('// Seed data references: products, categories');
    expect(result.code).toContain('test.beforeAll');
    expect(result.code).toContain('// Load seed data for this journey');
    expect(result.code).toContain("'products', 'categories'");
  });

  it('should generate create strategy code', () => {
    const journey: IRJourney = {
      id: 'JRN-0002',
      title: 'Test Create Strategy',
      tier: 'regression',
      scope: 'checkout',
      actor: 'authenticated-user',
      tags: ['data'],
      moduleDependencies: {
        foundation: [],
        feature: [],
      },
      steps: [
        {
          id: 'AC-1',
          description: 'Complete checkout',
          actions: [],
          assertions: [],
        },
      ],
      data: {
        strategy: 'create',
        cleanup: 'best-effort',
        factories: ['userFactory', 'orderFactory'],
      },
    };

    const result = generateTest(journey);

    expect(result.code).toContain('// Data Strategy: create | Cleanup: best-effort');
    expect(result.code).toContain('// Factory references: userFactory, orderFactory');
    expect(result.code).toContain('let testData: Record<string, unknown>');
    expect(result.code).toContain('test.beforeEach');
    expect(result.code).toContain('// Create fresh data for each test');
    expect(result.code).toContain("'userFactory', 'orderFactory'");
  });

  it('should generate reuse strategy code', () => {
    const journey: IRJourney = {
      id: 'JRN-0003',
      title: 'Test Reuse Strategy',
      tier: 'smoke',
      scope: 'dashboard',
      actor: 'authenticated-user',
      tags: ['data'],
      moduleDependencies: {
        foundation: [],
        feature: [],
      },
      steps: [
        {
          id: 'AC-1',
          description: 'View dashboard',
          actions: [],
          assertions: [],
        },
      ],
      data: {
        strategy: 'reuse',
        cleanup: 'none',
      },
    };

    const result = generateTest(journey);

    expect(result.code).toContain('// Data Strategy: reuse | Cleanup: none');
    expect(result.code).toContain('// Reuse strategy: Tests share existing data');
    // Should not have data cleanup section when cleanup is 'none'
    expect(result.code).not.toContain('// Data cleanup strategy');
  });

  it('should generate required cleanup code', () => {
    const journey: IRJourney = {
      id: 'JRN-0004',
      title: 'Test Required Cleanup',
      tier: 'regression',
      scope: 'products',
      actor: 'guest-user',
      tags: ['data'],
      moduleDependencies: {
        foundation: [],
        feature: [],
      },
      steps: [
        {
          id: 'AC-1',
          description: 'Create product',
          actions: [],
          assertions: [],
        },
      ],
      data: {
        strategy: 'create',
        cleanup: 'required',
      },
    };

    const result = generateTest(journey);

    expect(result.code).toContain('// Data cleanup strategy: required');
    expect(result.code).toContain('// Required cleanup - test fails if cleanup fails');
    expect(result.code).toContain('cleanupTestData(testData)');
  });

  it('should generate best-effort cleanup code', () => {
    const journey: IRJourney = {
      id: 'JRN-0005',
      title: 'Test Best-Effort Cleanup',
      tier: 'regression',
      scope: 'products',
      actor: 'guest-user',
      tags: ['data'],
      moduleDependencies: {
        foundation: [],
        feature: [],
      },
      steps: [
        {
          id: 'AC-1',
          description: 'Update product',
          actions: [],
          assertions: [],
        },
      ],
      data: {
        strategy: 'create',
        cleanup: 'best-effort',
      },
    };

    const result = generateTest(journey);

    expect(result.code).toContain('// Data cleanup strategy: best-effort');
    expect(result.code).toContain('// Best-effort cleanup - test passes even if cleanup fails');
    expect(result.code).toContain('try {');
    expect(result.code).toContain('cleanupTestData(testData)');
    expect(result.code).toContain('Cleanup failed (best-effort)');
  });

  it('should not generate data section when no data config', () => {
    const journey: IRJourney = {
      id: 'JRN-0006',
      title: 'No Data Config',
      tier: 'smoke',
      scope: 'auth',
      actor: 'guest-user',
      tags: ['auth'],
      moduleDependencies: {
        foundation: [],
        feature: [],
      },
      steps: [
        {
          id: 'AC-1',
          description: 'Login',
          actions: [],
          assertions: [],
        },
      ],
      // No data config
    };

    const result = generateTest(journey);

    expect(result.code).not.toContain('// Data Strategy:');
    expect(result.code).not.toContain('// Data cleanup strategy');
    expect(result.code).not.toContain('seedData');
    expect(result.code).not.toContain('createTestData');
    expect(result.code).not.toContain('cleanupTestData');
  });
});
