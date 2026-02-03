/**
 * Tests for Pipeline State Management
 * @module tests/pipeline/state
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join } from 'node:path';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';

// Mock paths module to control directory locations
const testDir = join(process.cwd(), 'test-fixtures', 'pipeline-state-test');
const autogenDir = join(testDir, '.artk', 'autogen');

vi.mock('../../src/utils/paths.js', () => ({
  getAutogenDir: vi.fn(() => autogenDir),
  getAutogenArtifact: vi.fn((name: string) => join(autogenDir, `${name}.json`)),
  ensureAutogenDir: vi.fn(async () => {
    mkdirSync(autogenDir, { recursive: true });
  }),
}));

import {
  loadPipelineState,
  loadPipelineStateWithInfo,
  savePipelineState,
  updatePipelineState,
  resetPipelineState,
  canProceedTo,
  getPipelineStateSummary,
  type PipelineState,
} from '../../src/pipeline/state.js';
import fg from 'fast-glob';

describe('Pipeline State Management', () => {
  beforeEach(() => {
    mkdirSync(autogenDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    vi.restoreAllMocks();
  });

  describe('loadPipelineState', () => {
    it('should return initial state when no file exists', () => {
      const state = loadPipelineState();

      expect(state.stage).toBe('initial');
      expect(state.journeyIds).toEqual([]);
      expect(state.history).toEqual([]);
      expect(state.isBlocked).toBe(false);
    });

    it('should load existing state from file', () => {
      const existingState: PipelineState = {
        version: '1.0',
        stage: 'analyzed',
        lastCommand: 'analyze',
        lastCommandAt: new Date().toISOString(),
        journeyIds: ['JRN-001', 'JRN-002'],
        testPaths: [],
        refinementAttempts: 0,
        isBlocked: false,
        history: [{ command: 'analyze', stage: 'analyzed', timestamp: new Date().toISOString(), success: true }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const statePath = join(autogenDir, 'state.json');
      writeFileSync(statePath, JSON.stringify(existingState), 'utf-8');

      const state = loadPipelineState();

      expect(state.stage).toBe('analyzed');
      expect(state.journeyIds).toEqual(['JRN-001', 'JRN-002']);
    });

    it('should handle corrupted state file gracefully', () => {
      const statePath = join(autogenDir, 'state.json');
      writeFileSync(statePath, 'invalid json {{{', 'utf-8');

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const state = loadPipelineState();

      // Should return initial state on error
      expect(state.stage).toBe('initial');

      // Should warn about the corruption
      expect(warnSpy).toHaveBeenCalled();
      const warnings = warnSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(warnings).toContain('invalid JSON');
    });

    it('should create backup of corrupted JSON file', async () => {
      const statePath = join(autogenDir, 'state.json');
      writeFileSync(statePath, 'totally broken json', 'utf-8');

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      loadPipelineState();

      // Should have created a backup
      const backups = await fg('*.corrupted.*', { cwd: autogenDir });
      expect(backups.length).toBeGreaterThan(0);

      // Original file should be gone (renamed to backup)
      expect(existsSync(statePath)).toBe(false);

      // Warn should mention the backup
      const warnings = warnSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(warnings).toContain('Backup saved');
    });

    it('should create backup when state has invalid schema', async () => {
      const statePath = join(autogenDir, 'state.json');
      // Valid JSON but missing required fields
      writeFileSync(statePath, JSON.stringify({
        version: '1.0',
        stage: 'analyzed',
        // Missing many required fields
      }), 'utf-8');

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const state = loadPipelineState();

      // Should return initial state
      expect(state.stage).toBe('initial');

      // Should have created a backup
      const backups = await fg('*.corrupted.*', { cwd: autogenDir });
      expect(backups.length).toBeGreaterThan(0);

      // Should warn about invalid structure
      const warnings = warnSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(warnings).toContain('invalid structure');
    });

    it('should warn about unknown fields but still load state', () => {
      const statePath = join(autogenDir, 'state.json');
      const stateWithExtra = {
        version: '1.0',
        stage: 'analyzed',
        lastCommand: 'analyze',
        lastCommandAt: new Date().toISOString(),
        journeyIds: [],
        testPaths: [],
        refinementAttempts: 0,
        isBlocked: false,
        history: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Unknown field from future version
        futureField: 'some value',
        anotherFutureField: 123,
      };
      writeFileSync(statePath, JSON.stringify(stateWithExtra), 'utf-8');

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const state = loadPipelineState();

      // Should still load the state
      expect(state.stage).toBe('analyzed');

      // Should warn about unknown fields
      const warnings = warnSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(warnings).toContain('unknown fields');
      expect(warnings).toContain('futureField');
    });

    it('should handle invalid stage value', () => {
      const statePath = join(autogenDir, 'state.json');
      const stateWithBadStage = {
        version: '1.0',
        stage: 'invalidStage',  // Not a valid PipelineStage
        lastCommand: 'bad',
        lastCommandAt: new Date().toISOString(),
        journeyIds: [],
        testPaths: [],
        refinementAttempts: 0,
        isBlocked: false,
        history: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      writeFileSync(statePath, JSON.stringify(stateWithBadStage), 'utf-8');

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const state = loadPipelineState();

      // Should return initial state (schema validation fails)
      expect(state.stage).toBe('initial');

      expect(warnSpy).toHaveBeenCalled();
    });
  });

  describe('loadPipelineStateWithInfo', () => {
    it('should return wasReset=true when no file exists', () => {
      const result = loadPipelineStateWithInfo();

      expect(result.state.stage).toBe('initial');
      expect(result.wasCorrupted).toBe(false);
      expect(result.wasReset).toBe(true);
      expect(result.backupPath).toBeUndefined();
    });

    it('should return wasCorrupted=true and backupPath when JSON is invalid', async () => {
      const statePath = join(autogenDir, 'state.json');
      writeFileSync(statePath, 'not json at all', 'utf-8');

      vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = loadPipelineStateWithInfo();

      expect(result.state.stage).toBe('initial');
      expect(result.wasCorrupted).toBe(true);
      expect(result.wasReset).toBe(true);
      expect(result.backupPath).toBeDefined();
      expect(result.backupPath).toContain('.corrupted.');
    });

    it('should return wasCorrupted=false for valid state', () => {
      const validState: PipelineState = {
        version: '1.0',
        stage: 'analyzed',
        lastCommand: 'analyze',
        lastCommandAt: new Date().toISOString(),
        journeyIds: ['JRN-001'],
        testPaths: [],
        refinementAttempts: 0,
        isBlocked: false,
        history: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const statePath = join(autogenDir, 'state.json');
      writeFileSync(statePath, JSON.stringify(validState), 'utf-8');

      const result = loadPipelineStateWithInfo();

      expect(result.state.stage).toBe('analyzed');
      expect(result.wasCorrupted).toBe(false);
      expect(result.wasReset).toBe(false);
      expect(result.backupPath).toBeUndefined();
    });
  });

  describe('savePipelineState', () => {
    it('should persist state to file', async () => {
      const now = new Date().toISOString();
      const state: PipelineState = {
        version: '1.0',
        stage: 'planned',
        lastCommand: 'plan',
        lastCommandAt: now,
        journeyIds: ['JRN-001'],
        testPaths: [],
        refinementAttempts: 0,
        isBlocked: false,
        history: [],
        createdAt: now,
        updatedAt: now,
      };

      await savePipelineState(state);

      const statePath = join(autogenDir, 'state.json');
      expect(existsSync(statePath)).toBe(true);

      const loaded = JSON.parse(readFileSync(statePath, 'utf-8'));
      expect(loaded.stage).toBe('planned');
    });
  });

  describe('updatePipelineState', () => {
    it('should update stage and add to history', async () => {
      // Start with initial state
      const initialState = loadPipelineState();
      expect(initialState.stage).toBe('initial');

      // Update to analyzed
      await updatePipelineState('analyze', 'analyzed', true, {
        journeyIds: ['JRN-001'],
      });

      const updatedState = loadPipelineState();
      expect(updatedState.stage).toBe('analyzed');
      expect(updatedState.journeyIds).toContain('JRN-001');
      expect(updatedState.history.length).toBeGreaterThan(0);
    });

    it('should preserve existing journeyIds when updating stage', async () => {
      await updatePipelineState('analyze', 'analyzed', true, {
        journeyIds: ['JRN-001', 'JRN-002'],
      });

      await updatePipelineState('plan', 'planned', true);
      // Note: journeyIds are only updated when explicitly passed

      const state = loadPipelineState();
      expect(state.stage).toBe('planned');
      // journeyIds should still be there from the initial write
      expect(state.journeyIds).toContain('JRN-001');
      expect(state.journeyIds).toContain('JRN-002');
    });

    it('should limit history to 50 entries', async () => {
      // Make many updates
      for (let i = 0; i < 60; i++) {
        await updatePipelineState(
          `cmd-${i}`,
          i % 2 === 0 ? 'analyzed' : 'planned',
          true
        );
      }

      const state = loadPipelineState();
      expect(state.history.length).toBeLessThanOrEqual(50);
    });
  });

  describe('resetPipelineState', () => {
    it('should reset to initial state', async () => {
      // Set up some state
      await updatePipelineState('test', 'tested', true, {
        journeyIds: ['JRN-001'],
      });

      // Reset
      await resetPipelineState();

      const state = loadPipelineState();
      expect(state.stage).toBe('initial');
      expect(state.journeyIds).toEqual([]);
    });
  });

  describe('canProceedTo', () => {
    it('should allow valid transitions', () => {
      const initialState: PipelineState = {
        version: '1.0',
        stage: 'initial',
        lastCommand: 'init',
        lastCommandAt: new Date().toISOString(),
        journeyIds: [],
        testPaths: [],
        refinementAttempts: 0,
        isBlocked: false,
        history: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(canProceedTo({ ...initialState, stage: 'initial' }, 'analyzed').allowed).toBe(true);
      expect(canProceedTo({ ...initialState, stage: 'analyzed' }, 'planned').allowed).toBe(true);
      expect(canProceedTo({ ...initialState, stage: 'planned' }, 'generated').allowed).toBe(true);
      expect(canProceedTo({ ...initialState, stage: 'generated' }, 'tested').allowed).toBe(true);
      expect(canProceedTo({ ...initialState, stage: 'tested' }, 'refining').allowed).toBe(true);
      expect(canProceedTo({ ...initialState, stage: 'tested' }, 'completed').allowed).toBe(true);
      expect(canProceedTo({ ...initialState, stage: 'refining' }, 'tested').allowed).toBe(true);
      expect(canProceedTo({ ...initialState, stage: 'refining' }, 'completed').allowed).toBe(true);
      expect(canProceedTo({ ...initialState, stage: 'refining' }, 'blocked').allowed).toBe(true);
    });

    it('should block invalid transitions', () => {
      const initialState: PipelineState = {
        version: '1.0',
        stage: 'initial',
        lastCommand: 'init',
        lastCommandAt: new Date().toISOString(),
        journeyIds: [],
        testPaths: [],
        refinementAttempts: 0,
        isBlocked: false,
        history: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(canProceedTo({ ...initialState, stage: 'initial' }, 'tested').allowed).toBe(false);
      expect(canProceedTo({ ...initialState, stage: 'analyzed' }, 'completed').allowed).toBe(false);
    });

    it('should allow resetting from blocked', () => {
      const blockedState: PipelineState = {
        version: '1.0',
        stage: 'blocked',
        lastCommand: 'refine',
        lastCommandAt: new Date().toISOString(),
        journeyIds: [],
        testPaths: [],
        refinementAttempts: 5,
        isBlocked: true,
        blockedReason: 'Circuit breaker triggered',
        history: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      expect(canProceedTo(blockedState, 'initial').allowed).toBe(true);
      expect(canProceedTo(blockedState, 'analyzed').allowed).toBe(true);
    });
  });

  describe('getPipelineStateSummary', () => {
    it('should return human-readable summary', async () => {
      await updatePipelineState('analyze', 'analyzed', true, {
        journeyIds: ['JRN-001', 'JRN-002'],
      });

      const state = loadPipelineState();
      const summary = getPipelineStateSummary(state);

      expect(summary).toContain('analyzed');
      expect(summary).toContain('2'); // journey count
    });

    it('should indicate blocked state clearly', async () => {
      await updatePipelineState('refine', 'blocked', false, {
        isBlocked: true,
        blockedReason: 'Circuit breaker triggered',
      });

      const state = loadPipelineState();
      const summary = getPipelineStateSummary(state);

      expect(summary).toContain('blocked');
      expect(summary).toContain('Circuit breaker');
    });
  });

  describe('state machine integrity', () => {
    it('should track complete pipeline flow', async () => {
      // Simulate full pipeline
      await updatePipelineState('analyze', 'analyzed', true, { journeyIds: ['JRN-001'] });
      await updatePipelineState('plan', 'planned', true);
      await updatePipelineState('generate', 'generated', true);
      await updatePipelineState('run', 'tested', true);
      await updatePipelineState('complete', 'completed', true);

      const state = loadPipelineState();

      expect(state.stage).toBe('completed');
      expect(state.history.length).toBe(5);

      // History should show progression
      const stages = state.history.map(h => h.stage);
      expect(stages).toEqual(['analyzed', 'planned', 'generated', 'tested', 'completed']);
    });

    it('should handle refinement loop correctly', async () => {
      await updatePipelineState('run', 'tested', false);
      await updatePipelineState('refine', 'refining', true);
      await updatePipelineState('run', 'tested', false); // After fix applied
      await updatePipelineState('refine', 'refining', true);
      await updatePipelineState('complete', 'completed', true); // Success

      const state = loadPipelineState();
      expect(state.stage).toBe('completed');
    });
  });
});
