/**
 * Integration test for the full CLI pipeline workflow
 *
 * Tests the complete flow: analyze → plan → generate → run → refine
 * This ensures the state machine transitions work correctly end-to-end.
 *
 * @see src/cli/analyze.ts
 * @see src/cli/plan.ts
 * @see src/cli/generate.ts
 * @see src/cli/run.ts
 * @see src/cli/refine.ts
 * @see src/pipeline/state.ts
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  loadPipelineState,
  updatePipelineState,
  resetPipelineState,
  canProceedTo,
  type PipelineStage,
} from '../../src/pipeline/state.js';

describe('Full Pipeline Integration', () => {
  let testRoot: string;

  beforeEach(() => {
    // Create a temporary test directory
    testRoot = join(tmpdir(), `pipeline-integration-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testRoot, { recursive: true });

    // Create .artk directory structure
    mkdirSync(join(testRoot, '.artk', 'autogen'), { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testRoot)) {
      rmSync(testRoot, { recursive: true, force: true });
    }
  });

  describe('State Machine Transitions', () => {
    it('should follow valid pipeline stages: initial → analyzed → planned → generated → tested', async () => {
      // Start fresh
      await resetPipelineState(testRoot);

      // Verify initial state
      let state = loadPipelineState(testRoot);
      expect(state.stage).toBe('initial');

      // Transition: initial → analyzed
      let transition = canProceedTo(state, 'analyzed');
      expect(transition.allowed).toBe(true);
      await updatePipelineState('analyze', 'analyzed', true, {}, testRoot);
      state = loadPipelineState(testRoot);
      expect(state.stage).toBe('analyzed');

      // Transition: analyzed → planned
      transition = canProceedTo(state, 'planned');
      expect(transition.allowed).toBe(true);
      await updatePipelineState('plan', 'planned', true, {}, testRoot);
      state = loadPipelineState(testRoot);
      expect(state.stage).toBe('planned');

      // Transition: planned → generated
      transition = canProceedTo(state, 'generated');
      expect(transition.allowed).toBe(true);
      await updatePipelineState('generate', 'generated', true, {}, testRoot);
      state = loadPipelineState(testRoot);
      expect(state.stage).toBe('generated');

      // Transition: generated → tested
      transition = canProceedTo(state, 'tested');
      expect(transition.allowed).toBe(true);
      await updatePipelineState('run', 'tested', false, {}, testRoot); // Tests failed
      state = loadPipelineState(testRoot);
      expect(state.stage).toBe('tested');
    });

    it('should allow refining from tested stage', async () => {
      // Set up tested state
      await resetPipelineState(testRoot);
      await updatePipelineState('analyze', 'analyzed', true, {}, testRoot);
      await updatePipelineState('plan', 'planned', true, {}, testRoot);
      await updatePipelineState('generate', 'generated', true, {}, testRoot);
      await updatePipelineState('run', 'tested', false, {}, testRoot);

      const state = loadPipelineState(testRoot);
      expect(state.stage).toBe('tested');

      // Should be able to refine
      const transition = canProceedTo(state, 'refining');
      expect(transition.allowed).toBe(true);
    });

    it('should block skipping stages', async () => {
      // Start fresh
      await resetPipelineState(testRoot);

      const state = loadPipelineState(testRoot);
      expect(state.stage).toBe('initial');

      // Should NOT be able to jump directly to generated
      const transition = canProceedTo(state, 'generated');
      expect(transition.allowed).toBe(false);
      expect(transition.reason).toContain('Cannot transition');
    });

    it('should block running before generating', async () => {
      // Start fresh and only do analyze + plan
      await resetPipelineState(testRoot);
      await updatePipelineState('analyze', 'analyzed', true, {}, testRoot);
      await updatePipelineState('plan', 'planned', true, {}, testRoot);

      const state = loadPipelineState(testRoot);
      expect(state.stage).toBe('planned');

      // Should NOT be able to run tests before generating
      const transition = canProceedTo(state, 'tested');
      expect(transition.allowed).toBe(false);
    });

    it('should track command history', async () => {
      await resetPipelineState(testRoot);

      // Run several commands
      await updatePipelineState('analyze', 'analyzed', true, { journeys: 5 }, testRoot);
      await updatePipelineState('plan', 'planned', true, { plans: 5 }, testRoot);
      await updatePipelineState('generate', 'generated', true, { tests: 5 }, testRoot);

      const state = loadPipelineState(testRoot);
      expect(state.history.length).toBeGreaterThanOrEqual(3);

      // Verify history entries
      const commands = state.history.map((h) => h.command);
      expect(commands).toContain('analyze');
      expect(commands).toContain('plan');
      expect(commands).toContain('generate');
    });

    it('should reset to initial state', async () => {
      // Set up some state
      await resetPipelineState(testRoot);
      await updatePipelineState('analyze', 'analyzed', true, {}, testRoot);
      await updatePipelineState('plan', 'planned', true, {}, testRoot);

      // Verify we're in planned state
      let state = loadPipelineState(testRoot);
      expect(state.stage).toBe('planned');

      // Reset
      await resetPipelineState(testRoot);

      // Should be back to initial
      state = loadPipelineState(testRoot);
      expect(state.stage).toBe('initial');
    });
  });

  describe('Refinement Loop', () => {
    it('should track refinement iterations', async () => {
      await resetPipelineState(testRoot);

      // Set up to tested state with failures
      await updatePipelineState('analyze', 'analyzed', true, {}, testRoot);
      await updatePipelineState('plan', 'planned', true, {}, testRoot);
      await updatePipelineState('generate', 'generated', true, {}, testRoot);
      await updatePipelineState('run', 'tested', false, { failedTests: 3 }, testRoot);

      // First refinement
      await updatePipelineState('refine', 'refining', true, { refinementAttempts: 1 }, testRoot);

      let state = loadPipelineState(testRoot);
      expect(state.stage).toBe('refining');

      // Back to tested after refine + run
      await updatePipelineState('generate', 'generated', true, {}, testRoot);
      await updatePipelineState('run', 'tested', false, { failedTests: 1 }, testRoot);

      // Second refinement
      await updatePipelineState('refine', 'refining', true, { refinementAttempts: 2 }, testRoot);

      state = loadPipelineState(testRoot);

      // Check history has multiple refine entries
      const refineEntries = state.history.filter((h) => h.command === 'refine');
      expect(refineEntries.length).toBeGreaterThanOrEqual(2);
    });

    it('should allow completed state after successful tests', async () => {
      await resetPipelineState(testRoot);

      // Full successful flow
      await updatePipelineState('analyze', 'analyzed', true, {}, testRoot);
      await updatePipelineState('plan', 'planned', true, {}, testRoot);
      await updatePipelineState('generate', 'generated', true, {}, testRoot);
      await updatePipelineState('run', 'completed', true, {}, testRoot); // All tests pass

      const state = loadPipelineState(testRoot);
      expect(state.stage).toBe('completed');
    });
  });

  describe('Stage Validation', () => {
    const validStages: PipelineStage[] = [
      'initial',
      'analyzed',
      'planned',
      'generated',
      'tested',
      'refining',
      'completed',
      'blocked',
    ];

    it('should accept all valid pipeline stages', () => {
      for (const stage of validStages) {
        // Write state directly (bypassing normal transitions for testing)
        const statePath = join(testRoot, '.artk', 'autogen', 'pipeline-state.json');
        writeFileSync(
          statePath,
          JSON.stringify({
            version: '1.0',
            stage,
            lastCommand: 'test',
            lastCommandAt: new Date().toISOString(),
            journeyIds: [],
            testPaths: [],
            refinementAttempts: 0,
            isBlocked: false,
            history: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }),
          'utf-8'
        );

        const state = loadPipelineState(testRoot);
        expect(state.stage).toBe(stage);
      }
    });
  });

  describe('Error Recovery', () => {
    it('should handle corrupted state file gracefully', () => {
      // Write corrupted state
      const statePath = join(testRoot, '.artk', 'autogen', 'pipeline-state.json');
      writeFileSync(statePath, '{ invalid json', 'utf-8');

      // Should not throw, should reset to initial
      const state = loadPipelineState(testRoot);
      expect(state.stage).toBe('initial');
    });

    it('should handle missing state file', () => {
      // Ensure no state file exists
      const statePath = join(testRoot, '.artk', 'autogen', 'pipeline-state.json');
      if (existsSync(statePath)) {
        rmSync(statePath);
      }

      // Should return default initial state
      const state = loadPipelineState(testRoot);
      expect(state.stage).toBe('initial');
    });

    it('should handle state file with invalid schema', () => {
      const statePath = join(testRoot, '.artk', 'autogen', 'pipeline-state.json');
      // Valid JSON but invalid schema (missing required fields)
      writeFileSync(statePath, JSON.stringify({ version: '1.0', stage: 'initial' }), 'utf-8');

      // Should reset to initial due to validation failure
      const state = loadPipelineState(testRoot);
      expect(state.stage).toBe('initial');
    });
  });

  describe('Blocked State', () => {
    it('should allow restart from blocked state', async () => {
      await resetPipelineState(testRoot);

      // Set up blocked state (e.g., circuit breaker triggered)
      await updatePipelineState('refine', 'blocked', false, {
        isBlocked: true,
        blockedReason: 'Circuit breaker triggered after 3 failed refinement attempts',
      }, testRoot);

      const state = loadPipelineState(testRoot);
      expect(state.stage).toBe('blocked');
      expect(state.isBlocked).toBe(true);

      // Should be able to go back to initial (clean) or re-analyze
      expect(canProceedTo(state, 'initial').allowed).toBe(true);
      expect(canProceedTo(state, 'analyzed').allowed).toBe(true);

      // Should NOT be able to continue to other stages
      expect(canProceedTo(state, 'planned').allowed).toBe(false);
      expect(canProceedTo(state, 'generated').allowed).toBe(false);
    });
  });
});
