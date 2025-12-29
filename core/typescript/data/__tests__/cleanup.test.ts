/**
 * Unit tests for CleanupManager
 */

/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CleanupManager } from '../cleanup.js';

describe('CleanupManager', () => {
  let manager: CleanupManager;

  beforeEach(() => {
    manager = new CleanupManager();
  });

  describe('register', () => {
    it('should register cleanup function', async () => {
      const cleanup = vi.fn(async () => {});

      manager.register(cleanup);

      expect(manager.count()).toBe(1);

      await manager.runAll();

      expect(cleanup).toHaveBeenCalledTimes(1);
    });

    it('should register multiple cleanup functions', async () => {
      const cleanup1 = vi.fn(async () => {});
      const cleanup2 = vi.fn(async () => {});
      const cleanup3 = vi.fn(async () => {});

      manager.register(cleanup1);
      manager.register(cleanup2);
      manager.register(cleanup3);

      expect(manager.count()).toBe(3);

      await manager.runAll();

      expect(cleanup1).toHaveBeenCalledTimes(1);
      expect(cleanup2).toHaveBeenCalledTimes(1);
      expect(cleanup3).toHaveBeenCalledTimes(1);
    });

    it('should accept options with priority', async () => {
      const cleanup = vi.fn(async () => {});

      manager.register(cleanup, { priority: 50 });

      expect(manager.count()).toBe(1);

      await manager.runAll();

      expect(cleanup).toHaveBeenCalledTimes(1);
    });

    it('should accept options with label', async () => {
      const cleanup = vi.fn(async () => {});

      manager.register(cleanup, { label: 'Delete test user' });

      expect(manager.count()).toBe(1);

      await manager.runAll();

      expect(cleanup).toHaveBeenCalledTimes(1);
    });

    it('should ignore registrations after cleanup has run', async () => {
      const cleanup1 = vi.fn(async () => {});
      const cleanup2 = vi.fn(async () => {});

      manager.register(cleanup1);
      await manager.runAll();

      // Try to register after cleanup
      manager.register(cleanup2);

      expect(manager.count()).toBe(1); // Should still be 1
      expect(cleanup2).not.toHaveBeenCalled();
    });
  });

  describe('runAll', () => {
    it('should execute cleanup functions in priority order', async () => {
      const order: number[] = [];

      const cleanup1 = vi.fn(async () => {
        order.push(1);
      });
      const cleanup2 = vi.fn(async () => {
        order.push(2);
      });
      const cleanup3 = vi.fn(async () => {
        order.push(3);
      });

      // Register in reverse priority order
      manager.register(cleanup3, { priority: 30 });
      manager.register(cleanup1, { priority: 10 });
      manager.register(cleanup2, { priority: 20 });

      await manager.runAll();

      // Should execute in priority order: 10, 20, 30
      expect(order).toEqual([1, 2, 3]);
    });

    it('should execute cleanups with same priority in registration order', async () => {
      const order: number[] = [];

      const cleanup1 = vi.fn(async () => {
        order.push(1);
      });
      const cleanup2 = vi.fn(async () => {
        order.push(2);
      });
      const cleanup3 = vi.fn(async () => {
        order.push(3);
      });

      // All same priority
      manager.register(cleanup1, { priority: 10 });
      manager.register(cleanup2, { priority: 10 });
      manager.register(cleanup3, { priority: 10 });

      await manager.runAll();

      // Should execute in registration order
      expect(order).toEqual([1, 2, 3]);
    });

    it('should use default priority of 100', async () => {
      const order: number[] = [];

      const cleanup1 = vi.fn(async () => {
        order.push(1);
      });
      const cleanup2 = vi.fn(async () => {
        order.push(2);
      });

      manager.register(cleanup2, { priority: 200 }); // Higher priority
      manager.register(cleanup1); // Default priority 100

      await manager.runAll();

      // cleanup1 should run first (priority 100 < 200)
      expect(order).toEqual([1, 2]);
    });

    it('should continue execution when cleanup fails', async () => {
      const cleanup1 = vi.fn(async () => {
        throw new Error('Cleanup 1 failed');
      });
      const cleanup2 = vi.fn(async () => {});
      const cleanup3 = vi.fn(async () => {
        throw new Error('Cleanup 3 failed');
      });

      manager.register(cleanup1, { priority: 10, label: 'Cleanup 1' });
      manager.register(cleanup2, { priority: 20, label: 'Cleanup 2' });
      manager.register(cleanup3, { priority: 30, label: 'Cleanup 3' });

      await expect(manager.runAll()).rejects.toThrow(AggregateError);

      // All cleanups should have been attempted
      expect(cleanup1).toHaveBeenCalledTimes(1);
      expect(cleanup2).toHaveBeenCalledTimes(1);
      expect(cleanup3).toHaveBeenCalledTimes(1);
    });

    it('should throw AggregateError with all failures', async () => {
      const cleanup1 = vi.fn(async () => {
        throw new Error('Error 1');
      });
      const cleanup2 = vi.fn(async () => {
        throw new Error('Error 2');
      });

      manager.register(cleanup1, { label: 'Cleanup 1' });
      manager.register(cleanup2, { label: 'Cleanup 2' });

      try {
        await manager.runAll();
        expect.fail('Should have thrown AggregateError');
      } catch (error) {
        expect(error).toBeInstanceOf(AggregateError);
        const aggError = error as AggregateError;
        expect(aggError.errors).toHaveLength(2);
        expect(aggError.errors[0]?.message).toContain('Cleanup "Cleanup 1"');
        expect(aggError.errors[1]?.message).toContain('Cleanup "Cleanup 2"');
        expect(aggError.message).toContain('2 of 2 cleanup operations failed');
      }
    });

    it('should complete successfully when all cleanups succeed', async () => {
      const cleanup1 = vi.fn(async () => {});
      const cleanup2 = vi.fn(async () => {});

      manager.register(cleanup1);
      manager.register(cleanup2);

      await expect(manager.runAll()).resolves.toBeUndefined();
    });

    it('should handle empty cleanup list', async () => {
      await expect(manager.runAll()).resolves.toBeUndefined();
    });

    it('should not execute cleanups twice', async () => {
      const cleanup = vi.fn(async () => {});

      manager.register(cleanup);

      await manager.runAll();
      await manager.runAll(); // Second call

      // Should only be called once
      expect(cleanup).toHaveBeenCalledTimes(1);
    });

    it('should handle async cleanup functions', async () => {
      let executed = false;

      const cleanup = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        executed = true;
      });

      manager.register(cleanup);

      await manager.runAll();

      expect(executed).toBe(true);
      expect(cleanup).toHaveBeenCalledTimes(1);
    });
  });

  describe('count', () => {
    it('should return 0 for new manager', () => {
      expect(manager.count()).toBe(0);
    });

    it('should return correct count after registrations', () => {
      manager.register(async () => {});
      manager.register(async () => {});
      manager.register(async () => {});

      expect(manager.count()).toBe(3);
    });

    it('should not change count after runAll', async () => {
      manager.register(async () => {});
      manager.register(async () => {});

      await manager.runAll();

      expect(manager.count()).toBe(2);
    });
  });

  describe('hasRun', () => {
    it('should return false initially', () => {
      expect(manager.hasRun()).toBe(false);
    });

    it('should return true after runAll', async () => {
      manager.register(async () => {});

      await manager.runAll();

      expect(manager.hasRun()).toBe(true);
    });

    it('should return true even if runAll failed', async () => {
      manager.register(async () => {
        throw new Error('Cleanup failed');
      });

      try {
        await manager.runAll();
      } catch {
        // Ignore error
      }

      expect(manager.hasRun()).toBe(true);
    });

    it('should return true for empty cleanup list', async () => {
      await manager.runAll();

      expect(manager.hasRun()).toBe(true);
    });
  });

  describe('clear', () => {
    it('should remove all cleanup entries', () => {
      manager.register(async () => {});
      manager.register(async () => {});

      expect(manager.count()).toBe(2);

      manager.clear();

      expect(manager.count()).toBe(0);
    });

    it('should not reset hasRun flag', async () => {
      manager.register(async () => {});

      await manager.runAll();

      expect(manager.hasRun()).toBe(true);

      manager.clear();

      expect(manager.hasRun()).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should include label in error message', async () => {
      manager.register(
        async () => {
          throw new Error('Something went wrong');
        },
        { label: 'Delete user' },
      );

      try {
        await manager.runAll();
        expect.fail('Should have thrown AggregateError');
      } catch (error) {
        const aggError = error as AggregateError;
        expect(aggError.errors[0]?.message).toContain('Delete user');
        expect(aggError.errors[0]?.message).toContain('Something went wrong');
      }
    });

    it('should include priority in error message', async () => {
      manager.register(
        async () => {
          throw new Error('Failed');
        },
        { priority: 42, label: 'Test cleanup' },
      );

      try {
        await manager.runAll();
        expect.fail('Should have thrown AggregateError');
      } catch (error) {
        const aggError = error as AggregateError;
        expect(aggError.errors[0]?.message).toContain('priority 42');
      }
    });

    it('should handle unlabeled cleanup failures', async () => {
      manager.register(async () => {
        throw new Error('Failed');
      });

      try {
        await manager.runAll();
        expect.fail('Should have thrown AggregateError');
      } catch (error) {
        const aggError = error as AggregateError;
        expect(aggError.errors[0]?.message).toContain('unlabeled');
      }
    });
  });
});
