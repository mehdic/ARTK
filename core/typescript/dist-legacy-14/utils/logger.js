"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureLogger = configureLogger;
exports.getLoggerConfig = getLoggerConfig;
exports.createLogger = createLogger;
exports.parseLogLevel = parseLogLevel;
/**
 * Log level numeric values for comparison
 */
const LOG_LEVELS = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};
/**
 * Format log entry as pretty text
 *
 * @param entry - Log entry to format
 * @returns Formatted string
 */
function formatPretty(entry) {
    // Extract time from ISO timestamp (HH:MM:SS)
    const time = entry.timestamp.split('T')[1]?.split('.')[0] || '00:00:00';
    // Format level (uppercase, padded to 5 chars for alignment)
    const level = entry.level.toUpperCase().padEnd(5);
    // Format context if present
    const context = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
    return `[${time}] ${level} [${entry.module}] ${entry.message}${context}`;
}
/**
 * Global logger configuration
 */
let globalConfig = {
    minLevel: 'info',
    format: 'json',
    output: (entry) => {
        // eslint-disable-next-line no-console
        const target = entry.level === 'error' ? console.error : console.log;
        if (globalConfig.format === 'pretty') {
            target(formatPretty(entry));
        }
        else {
            target(JSON.stringify(entry));
        }
    },
};
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
function configureLogger(config) {
    globalConfig = { ...globalConfig, ...config };
}
/**
 * Get current logger configuration
 */
function getLoggerConfig() {
    return { ...globalConfig };
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
function createLogger(module, operation) {
    const log = (level, message, context) => {
        // Check if this log level should be output
        if (LOG_LEVELS[level] < LOG_LEVELS[globalConfig.minLevel]) {
            return;
        }
        const entry = {
            level,
            module,
            operation,
            timestamp: new Date().toISOString(),
            message,
            context,
        };
        globalConfig.output(entry);
    };
    return {
        debug: (message, context) => log('debug', message, context),
        info: (message, context) => log('info', message, context),
        warn: (message, context) => log('warn', message, context),
        error: (message, context) => log('error', message, context),
    };
}
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
function parseLogLevel(level) {
    if (!level) {
        return undefined;
    }
    const normalized = level.toLowerCase();
    if (normalized in LOG_LEVELS) {
        return normalized;
    }
    return undefined;
}
//# sourceMappingURL=logger.js.map