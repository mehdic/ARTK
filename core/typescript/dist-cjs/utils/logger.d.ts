/**
 * Structured logger utility
 *
 * Provides structured JSON logging with verbosity levels (debug, info, warn, error)
 * as required by NFR-001, NFR-002, and NFR-003.
 *
 * All logs include module, operation, and timestamp for filtering and aggregation.
 *
 * @example
 * ```typescript
 * import { createLogger } from './logger.js';
 *
 * const logger = createLogger('config', 'loadConfig');
 * logger.info('Loading configuration', { path: 'artk.config.yml' });
 * logger.error('Validation failed', { errors: [...] });
 * ```
 */
/**
 * Log levels in order of severity
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
/**
 * Log output format
 */
export type LogFormat = 'json' | 'pretty';
/**
 * Structured log entry
 */
export interface LogEntry {
    level: LogLevel;
    module: string;
    operation: string;
    timestamp: string;
    message: string;
    context?: Record<string, unknown>;
}
/**
 * Logger configuration
 */
export interface LoggerConfig {
    minLevel: LogLevel;
    format: LogFormat;
    output: (entry: LogEntry) => void;
}
/**
 * Configure global logger settings
 *
 * @param config - Logger configuration
 *
 * @example
 * ```typescript
 * // JSON format (default, for production)
 * configureLogger({
 *   minLevel: 'debug',
 *   format: 'json'
 * });
 *
 * // Pretty format (for local development)
 * configureLogger({
 *   minLevel: 'debug',
 *   format: 'pretty'
 * });
 *
 * // Custom output
 * configureLogger({
 *   output: (entry) => fs.appendFileSync('artk.log', JSON.stringify(entry) + '\n')
 * });
 * ```
 */
export declare function configureLogger(config: Partial<LoggerConfig>): void;
/**
 * Get current logger configuration
 */
export declare function getLoggerConfig(): Readonly<LoggerConfig>;
/**
 * Logger interface
 */
export interface Logger {
    debug(message: string, context?: Record<string, unknown>): void;
    info(message: string, context?: Record<string, unknown>): void;
    warn(message: string, context?: Record<string, unknown>): void;
    error(message: string, context?: Record<string, unknown>): void;
}
/**
 * Create a logger for a specific module and operation
 *
 * @param module - Module name (e.g., 'config', 'auth', 'fixtures')
 * @param operation - Operation name (e.g., 'loadConfig', 'saveStorageState')
 * @returns Logger instance
 *
 * @example
 * ```typescript
 * const logger = createLogger('auth', 'oidcLogin');
 * logger.info('Starting OIDC login flow', { role: 'admin' });
 * ```
 */
export declare function createLogger(module: string, operation: string): Logger;
/**
 * Parse log level from string (case-insensitive)
 *
 * @param level - Log level string
 * @returns Parsed log level or undefined if invalid
 *
 * @example
 * ```typescript
 * const level = parseLogLevel(process.env.LOG_LEVEL);
 * if (level) {
 *   configureLogger({ minLevel: level });
 * }
 * ```
 */
export declare function parseLogLevel(level: string | undefined): LogLevel | undefined;
//# sourceMappingURL=logger.d.ts.map