export { b as LogEntry, d as LogLevel, L as Logger, e as LoggerConfig, a as configureLogger, c as createLogger, g as getLoggerConfig, p as parseLogLevel } from '../logger-BXhqSaOe.js';

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
/**
 * Retry configuration options
 */
interface RetryOptions {
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
declare function withRetry<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T>;
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
declare function createRetryWrapper<TArgs extends unknown[], TResult>(fn: (...args: TArgs) => Promise<TResult>, options?: RetryOptions): (...args: TArgs) => Promise<TResult>;
/**
 * Predefined shouldRetry predicates for common scenarios
 */
declare const RetryPredicates: {
    /**
     * Retry all errors
     */
    always: () => boolean;
    /**
     * Never retry
     */
    never: () => boolean;
    /**
     * Retry only network errors
     */
    networkErrors: (error: Error) => boolean;
    /**
     * Retry only specific error messages
     */
    messageIncludes: (substring: string) => ((error: Error) => boolean);
    /**
     * Retry based on error name
     */
    errorName: (name: string) => ((error: Error) => boolean);
};

export { type RetryOptions, RetryPredicates, createRetryWrapper, withRetry };
