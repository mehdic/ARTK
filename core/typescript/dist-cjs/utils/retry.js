"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetryPredicates = void 0;
exports.withRetry = withRetry;
exports.createRetryWrapper = createRetryWrapper;
const logger_js_1 = require("./logger.js");
const logger = (0, logger_js_1.createLogger)('utils', 'retry');
/**
 * Default retry options
 */
const DEFAULT_RETRY_OPTIONS = {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    jitter: true,
    shouldRetry: () => true,
    onRetry: () => { },
};
/**
 * Calculate delay for next retry with exponential backoff
 *
 * @param attempt - Current attempt number (0-indexed)
 * @param options - Retry options
 * @returns Delay in milliseconds
 */
function calculateDelay(attempt, options) {
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
function sleep(ms) {
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
async function withRetry(fn, options = {}) {
    const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
    let lastError;
    for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
        try {
            // Execute function
            return await fn();
        }
        catch (error) {
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
function createRetryWrapper(fn, options = {}) {
    return async (...args) => {
        return withRetry(() => fn(...args), options);
    };
}
/**
 * Predefined shouldRetry predicates for common scenarios
 */
exports.RetryPredicates = {
    /**
     * Retry all errors
     */
    always: () => true,
    /**
     * Never retry
     */
    never: () => false,
    /**
     * Retry only network errors
     */
    networkErrors: (error) => {
        const message = error.message.toLowerCase();
        return (message.includes('network') ||
            message.includes('timeout') ||
            message.includes('econnrefused') ||
            message.includes('enotfound'));
    },
    /**
     * Retry only specific error messages
     */
    messageIncludes: (substring) => {
        return (error) => error.message.includes(substring);
    },
    /**
     * Retry based on error name
     */
    errorName: (name) => {
        return (error) => error.name === name;
    },
};
//# sourceMappingURL=retry.js.map