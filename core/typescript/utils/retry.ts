/**
 * Retry utility with exponential backoff
 *
 * Provides retry logic with exponential backoff as required by NFR-010, NFR-011, and NFR-012.
 *
 * - NFR-010: System MUST retry authentication failures up to 2 times with exponential backoff
 * - NFR-011: After retry exhaustion, fail with actionable error message
 * - NFR-012: Log each retry attempt at warn level
 *
 * @example
 * ```typescript
 * import { withRetry } from './retry.js';
 *
 * const result = await withRetry(
 *   async () => authenticateUser(page, credentials),
 *   {
 *     maxAttempts: 3,
 *     initialDelayMs: 1000,
 *     maxDelayMs: 10000,
 *     onRetry: (attempt, delay, error) => {
 *       logger.warn(`Retry attempt ${attempt} after ${delay}ms`, { error: error.message });
 *     }
 *   }
 * );
 * ```
 */

import { createLogger } from './logger.js';

const logger = createLogger('utils', 'retry');

/**
 * Retry configuration options
 */
export interface RetryOptions {
  /**
   * Maximum number of attempts (including initial attempt)
   * @default 3
   */
  maxAttempts?: number;

  /**
   * Initial delay in milliseconds before first retry
   * @default 1000
   */
  initialDelayMs?: number;

  /**
   * Maximum delay in milliseconds (caps exponential growth)
   * @default 30000
   */
  maxDelayMs?: number;

  /**
   * Backoff multiplier (delay *= multiplier after each retry)
   * @default 2
   */
  backoffMultiplier?: number;

  /**
   * Whether to add jitter to delay (randomizes delay by ±10%)
   * @default true
   */
  jitter?: boolean;

  /**
   * Predicate function to determine if error is retryable
   * @default () => true (retry all errors)
   */
  shouldRetry?: (error: Error, attempt: number) => boolean;

  /**
   * Callback invoked before each retry
   * @param attempt - Current attempt number (1-indexed)
   * @param delayMs - Delay before this retry in milliseconds
   * @param error - Error from previous attempt
   */
  onRetry?: (attempt: number, delayMs: number, error: Error) => void;
}

/**
 * Default retry options
 */
const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitter: true,
  shouldRetry: (): boolean => true,
  onRetry: (): void => {},
};

/**
 * Calculate delay for next retry with exponential backoff
 *
 * @param attempt - Current attempt number (0-indexed)
 * @param options - Retry options
 * @returns Delay in milliseconds
 */
function calculateDelay(attempt: number, options: Required<RetryOptions>): number {
  // Exponential backoff: initialDelay * (multiplier ^ attempt)
  let delay = options.initialDelayMs * Math.pow(options.backoffMultiplier, attempt);

  // Cap at maximum delay
  delay = Math.min(delay, options.maxDelayMs);

  // Add jitter (±10%)
  if (options.jitter) {
    const jitterFactor = 0.9 + Math.random() * 0.2; // Random between 0.9 and 1.1
    delay = Math.floor(delay * jitterFactor);
  }

  return delay;
}

/**
 * Sleep for specified duration
 *
 * @param ms - Duration in milliseconds
 * @returns Promise that resolves after duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute an async function with retry and exponential backoff
 *
 * @param fn - Async function to execute
 * @param options - Retry configuration
 * @returns Promise resolving to function result
 * @throws Last error if all retries are exhausted
 *
 * @example
 * ```typescript
 * const result = await withRetry(
 *   async () => {
 *     const response = await fetch('https://api.example.com/data');
 *     if (!response.ok) throw new Error('Request failed');
 *     return response.json();
 *   },
 *   {
 *     maxAttempts: 3,
 *     initialDelayMs: 1000,
 *     shouldRetry: (error) => error.message.includes('timeout'),
 *   }
 * );
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts: Required<RetryOptions> = { ...DEFAULT_RETRY_OPTIONS, ...options };

  let lastError: Error | undefined;

  for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
    try {
      // Execute function
      return await fn();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      lastError = err;

      // Check if we should retry
      const isLastAttempt = attempt === opts.maxAttempts - 1;
      const shouldRetry = !isLastAttempt && opts.shouldRetry(err, attempt + 1);

      if (!shouldRetry) {
        // Don't retry - throw error
        throw err;
      }

      // Calculate delay and log retry
      const delay = calculateDelay(attempt, opts);
      const attemptNumber = attempt + 1;

      logger.warn(`Retry attempt ${attemptNumber}/${opts.maxAttempts - 1} after ${delay}ms`, {
        attempt: attemptNumber,
        delayMs: delay,
        error: err.message,
      });

      // Invoke callback
      opts.onRetry(attemptNumber, delay, err);

      // Wait before retry
      await sleep(delay);
    }
  }

  // All retries exhausted - throw last error
  throw lastError || new Error('All retry attempts failed');
}

/**
 * Create a retry wrapper for a specific function with fixed options
 *
 * @param fn - Async function to wrap
 * @param options - Retry configuration
 * @returns Wrapped function that retries on failure
 *
 * @example
 * ```typescript
 * const authenticateWithRetry = createRetryWrapper(
 *   async (page, creds) => oidcProvider.login(page, creds),
 *   { maxAttempts: 3, initialDelayMs: 2000 }
 * );
 *
 * await authenticateWithRetry(page, credentials);
 * ```
 */
export function createRetryWrapper<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options: RetryOptions = {}
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs): Promise<TResult> => {
    return withRetry(() => fn(...args), options);
  };
}

/**
 * Predefined shouldRetry predicates for common scenarios
 */
export const RetryPredicates = {
  /**
   * Retry all errors
   */
  always: (): boolean => true,

  /**
   * Never retry
   */
  never: (): boolean => false,

  /**
   * Retry only network errors
   */
  networkErrors: (error: Error): boolean => {
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('econnrefused') ||
      message.includes('enotfound')
    );
  },

  /**
   * Retry only specific error messages
   */
  messageIncludes: (substring: string): ((error: Error) => boolean) => {
    return (error: Error): boolean => error.message.includes(substring);
  },

  /**
   * Retry based on error name
   */
  errorName: (name: string): ((error: Error) => boolean) => {
    return (error: Error): boolean => error.name === name;
  },
};
