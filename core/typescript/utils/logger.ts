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
  output: (entry: LogEntry) => void;
}

/**
 * Log level numeric values for comparison
 */
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Global logger configuration
 */
let globalConfig: LoggerConfig = {
  minLevel: 'info',
  output: (entry: LogEntry): void => {
    const target = entry.level === 'error' ? console.error : console.log;
    target(JSON.stringify(entry));
  },
};

/**
 * Configure global logger settings
 *
 * @param config - Logger configuration
 *
 * @example
 * ```typescript
 * configureLogger({
 *   minLevel: 'debug',
 *   output: (entry) => fs.appendFileSync('artk.log', JSON.stringify(entry) + '\n')
 * });
 * ```
 */
export function configureLogger(config: Partial<LoggerConfig>): void {
  globalConfig = { ...globalConfig, ...config };
}

/**
 * Get current logger configuration
 */
export function getLoggerConfig(): Readonly<LoggerConfig> {
  return { ...globalConfig };
}

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
export function createLogger(module: string, operation: string): Logger {
  const log = (level: LogLevel, message: string, context?: Record<string, unknown>): void => {
    // Check if this log level should be output
    if (LOG_LEVELS[level] < LOG_LEVELS[globalConfig.minLevel]) {
      return;
    }

    const entry: LogEntry = {
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
    debug: (message: string, context?: Record<string, unknown>): void => log('debug', message, context),
    info: (message: string, context?: Record<string, unknown>): void => log('info', message, context),
    warn: (message: string, context?: Record<string, unknown>): void => log('warn', message, context),
    error: (message: string, context?: Record<string, unknown>): void => log('error', message, context),
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
export function parseLogLevel(level: string | undefined): LogLevel | undefined {
  if (!level) {
    return undefined;
  }

  const normalized = level.toLowerCase() as LogLevel;
  if (normalized in LOG_LEVELS) {
    return normalized;
  }

  return undefined;
}
