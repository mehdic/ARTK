/**
 * Tests for Result type utilities
 */
import { describe, it, expect } from 'vitest';
import {
  ok,
  err,
  isOk,
  isErr,
  unwrap,
  unwrapOr,
  map,
  mapErr,
  andThen,
  collect,
  partition,
  tryCatch,
  tryCatchAsync,
  codedError,
  CodedError,
  type Result,
} from '../../src/utils/result.js';

describe('Result type', () => {
  describe('ok', () => {
    it('should create a success result', () => {
      const result = ok(42);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(42);
      }
    });

    it('should include warnings when provided', () => {
      const result = ok('value', ['warning1', 'warning2']);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('value');
        expect(result.warnings).toEqual(['warning1', 'warning2']);
      }
    });

    it('should not include warnings when empty array', () => {
      const result = ok('value', []);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.warnings).toBeUndefined();
      }
    });
  });

  describe('err', () => {
    it('should create a failure result', () => {
      const result = err('error message');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('error message');
      }
    });

    it('should work with complex error types', () => {
      const result = err({ code: 'NOT_FOUND', message: 'File not found' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });
  });

  describe('isOk and isErr', () => {
    it('isOk should return true for success results', () => {
      const success = ok(42);
      const failure = err('error');
      expect(isOk(success)).toBe(true);
      expect(isOk(failure)).toBe(false);
    });

    it('isErr should return true for failure results', () => {
      const success = ok(42);
      const failure = err('error');
      expect(isErr(success)).toBe(false);
      expect(isErr(failure)).toBe(true);
    });

    it('should narrow types correctly', () => {
      const result: Result<number, string> = ok(42);
      if (isOk(result)) {
        // TypeScript should know result.value is number
        const _val: number = result.value;
        expect(_val).toBe(42);
      }
    });
  });

  describe('unwrap', () => {
    it('should return value for success', () => {
      const result = ok(42);
      expect(unwrap(result)).toBe(42);
    });

    it('should throw for failure', () => {
      const result = err('error message');
      expect(() => unwrap(result)).toThrow('error message');
    });

    it('should include custom error message', () => {
      const result = err('original');
      expect(() => unwrap(result, 'Custom')).toThrow('Custom: original');
    });
  });

  describe('unwrapOr', () => {
    it('should return value for success', () => {
      const result = ok(42);
      expect(unwrapOr(result, 0)).toBe(42);
    });

    it('should return default for failure', () => {
      const result = err('error');
      expect(unwrapOr(result, 99)).toBe(99);
    });
  });

  describe('map', () => {
    it('should transform success value', () => {
      const result = ok(42);
      const mapped = map(result, (n) => n * 2);
      expect(isOk(mapped)).toBe(true);
      if (isOk(mapped)) {
        expect(mapped.value).toBe(84);
      }
    });

    it('should preserve failure', () => {
      const result: Result<number, string> = err('error');
      const mapped = map(result, (n) => n * 2);
      expect(isErr(mapped)).toBe(true);
      if (isErr(mapped)) {
        expect(mapped.error).toBe('error');
      }
    });

    it('should preserve warnings', () => {
      const result = ok(42, ['warning']);
      const mapped = map(result, (n) => n * 2);
      if (isOk(mapped)) {
        expect(mapped.warnings).toEqual(['warning']);
      }
    });
  });

  describe('mapErr', () => {
    it('should transform error', () => {
      const result: Result<number, string> = err('error');
      const mapped = mapErr(result, (e) => ({ code: 'ERR', message: e }));
      expect(isErr(mapped)).toBe(true);
      if (isErr(mapped)) {
        expect(mapped.error).toEqual({ code: 'ERR', message: 'error' });
      }
    });

    it('should preserve success', () => {
      const result: Result<number, string> = ok(42);
      const mapped = mapErr(result, (e) => ({ code: 'ERR', message: e }));
      expect(isOk(mapped)).toBe(true);
      if (isOk(mapped)) {
        expect(mapped.value).toBe(42);
      }
    });
  });

  describe('andThen', () => {
    it('should chain successful operations', () => {
      const result = ok(42);
      const chained = andThen(result, (n) => ok(n * 2));
      expect(isOk(chained)).toBe(true);
      if (isOk(chained)) {
        expect(chained.value).toBe(84);
      }
    });

    it('should short-circuit on failure', () => {
      const result: Result<number, string> = err('first error');
      const chained = andThen(result, (n) => ok(n * 2));
      expect(isErr(chained)).toBe(true);
      if (isErr(chained)) {
        expect(chained.error).toBe('first error');
      }
    });

    it('should propagate error from chained function', () => {
      const result = ok(42);
      const chained = andThen(result, (_n): Result<number, string> => err('chained error'));
      expect(isErr(chained)).toBe(true);
      if (isErr(chained)) {
        expect(chained.error).toBe('chained error');
      }
    });

    it('should merge warnings', () => {
      const result = ok(42, ['warning1']);
      const chained = andThen(result, (n) => ok(n * 2, ['warning2']));
      if (isOk(chained)) {
        expect(chained.warnings).toEqual(['warning1', 'warning2']);
      }
    });
  });

  describe('collect', () => {
    it('should collect all success values', () => {
      const results: Result<number, string>[] = [ok(1), ok(2), ok(3)];
      const collected = collect(results);
      expect(isOk(collected)).toBe(true);
      if (isOk(collected)) {
        expect(collected.value).toEqual([1, 2, 3]);
      }
    });

    it('should return first error', () => {
      const results: Result<number, string>[] = [ok(1), err('error'), ok(3)];
      const collected = collect(results);
      expect(isErr(collected)).toBe(true);
      if (isErr(collected)) {
        expect(collected.error).toBe('error');
      }
    });

    it('should merge all warnings', () => {
      const results: Result<number, string>[] = [
        ok(1, ['w1']),
        ok(2, ['w2']),
        ok(3),
      ];
      const collected = collect(results);
      if (isOk(collected)) {
        expect(collected.warnings).toEqual(['w1', 'w2']);
      }
    });

    it('should handle empty array', () => {
      const collected = collect([]);
      expect(isOk(collected)).toBe(true);
      if (isOk(collected)) {
        expect(collected.value).toEqual([]);
      }
    });
  });

  describe('partition', () => {
    it('should separate successes and failures', () => {
      const results: Result<number, string>[] = [
        ok(1),
        err('e1'),
        ok(2),
        err('e2'),
        ok(3),
      ];
      const { values, errors } = partition(results);
      expect(values).toEqual([1, 2, 3]);
      expect(errors).toEqual(['e1', 'e2']);
    });

    it('should collect all warnings', () => {
      const results: Result<number, string>[] = [
        ok(1, ['w1']),
        ok(2, ['w2', 'w3']),
      ];
      const { warnings } = partition(results);
      expect(warnings).toEqual(['w1', 'w2', 'w3']);
    });

    it('should handle all successes', () => {
      const results: Result<number, string>[] = [ok(1), ok(2)];
      const { values, errors } = partition(results);
      expect(values).toEqual([1, 2]);
      expect(errors).toEqual([]);
    });

    it('should handle all failures', () => {
      const results: Result<number, string>[] = [err('e1'), err('e2')];
      const { values, errors } = partition(results);
      expect(values).toEqual([]);
      expect(errors).toEqual(['e1', 'e2']);
    });
  });

  describe('tryCatch', () => {
    it('should wrap successful execution', () => {
      const result = tryCatch(() => 42);
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(42);
      }
    });

    it('should catch thrown errors', () => {
      const result = tryCatch(() => {
        throw new Error('test error');
      });
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toBe('test error');
      }
    });

    it('should wrap non-Error throws', () => {
      const result = tryCatch(() => {
        throw 'string error';
      });
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toBe('string error');
      }
    });
  });

  describe('tryCatchAsync', () => {
    it('should wrap successful async execution', async () => {
      const result = await tryCatchAsync(async () => 42);
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(42);
      }
    });

    it('should catch rejected promises', async () => {
      const result = await tryCatchAsync(async () => {
        throw new Error('async error');
      });
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.message).toBe('async error');
      }
    });
  });

  describe('codedError', () => {
    it('should create error with code and message', () => {
      const error = codedError('NOT_FOUND', 'File not found');
      expect(error.code).toBe('NOT_FOUND');
      expect(error.message).toBe('File not found');
      expect(error.details).toBeUndefined();
    });

    it('should include details when provided', () => {
      const error = codedError('VALIDATION', 'Invalid input', { field: 'email' });
      expect(error.code).toBe('VALIDATION');
      expect(error.message).toBe('Invalid input');
      expect(error.details).toEqual({ field: 'email' });
    });
  });

  describe('CodedError class', () => {
    it('should be an instance of Error', () => {
      const error = new CodedError('TEST', 'Test error');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(CodedError);
    });

    it('should have a stack trace', () => {
      const error = new CodedError('TEST', 'Test error');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('CodedError');
    });

    it('should be throwable and catchable', () => {
      expect(() => {
        throw new CodedError('THROWN', 'This was thrown');
      }).toThrow(CodedError);

      try {
        throw new CodedError('CATCH_TEST', 'Catch me');
      } catch (e) {
        expect(e).toBeInstanceOf(CodedError);
        if (e instanceof CodedError) {
          expect(e.code).toBe('CATCH_TEST');
          expect(e.message).toBe('Catch me');
        }
      }
    });

    it('should serialize to JSON correctly', () => {
      const error = new CodedError('JSON_TEST', 'JSON message', { extra: 'data' });
      const json = error.toJSON();
      expect(json.code).toBe('JSON_TEST');
      expect(json.message).toBe('JSON message');
      expect(json.details).toEqual({ extra: 'data' });
      expect(json.stack).toBeDefined();
    });

    it('should format toString correctly', () => {
      const simple = new CodedError('SIMPLE', 'Simple message');
      expect(simple.toString()).toBe('[SIMPLE] Simple message');

      const withDetails = new CodedError('DETAILED', 'Has details', { key: 'value' });
      expect(withDetails.toString()).toContain('[DETAILED] Has details');
      expect(withDetails.toString()).toContain('"key":"value"');
    });

    it('should work with static create method', () => {
      const error = CodedError.create('STATIC', 'Created statically');
      expect(error).toBeInstanceOf(CodedError);
      expect(error.code).toBe('STATIC');
    });

    it('should have name set to CodedError', () => {
      const error = new CodedError('NAME_TEST', 'Test');
      expect(error.name).toBe('CodedError');
    });
  });
});
