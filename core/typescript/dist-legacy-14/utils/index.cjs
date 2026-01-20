'use strict';

// utils/logger.ts
var LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};
function formatPretty(entry) {
  const time = entry.timestamp.split("T")[1]?.split(".")[0] || "00:00:00";
  const level = entry.level.toUpperCase().padEnd(5);
  const context = entry.context ? ` ${JSON.stringify(entry.context)}` : "";
  return `[${time}] ${level} [${entry.module}] ${entry.message}${context}`;
}
var globalConfig = {
  minLevel: "info",
  format: "json",
  output: (entry) => {
    const target = entry.level === "error" ? console.error : console.log;
    if (globalConfig.format === "pretty") {
      target(formatPretty(entry));
    } else {
      target(JSON.stringify(entry));
    }
  }
};
function configureLogger(config) {
  globalConfig = { ...globalConfig, ...config };
}
function getLoggerConfig() {
  return { ...globalConfig };
}
function createLogger(module, operation) {
  const log = (level, message, context) => {
    if (LOG_LEVELS[level] < LOG_LEVELS[globalConfig.minLevel]) {
      return;
    }
    const entry = {
      level,
      module,
      operation,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      message,
      context
    };
    globalConfig.output(entry);
  };
  return {
    debug: (message, context) => log("debug", message, context),
    info: (message, context) => log("info", message, context),
    warn: (message, context) => log("warn", message, context),
    error: (message, context) => log("error", message, context)
  };
}
function parseLogLevel(level) {
  if (!level) {
    return void 0;
  }
  const normalized = level.toLowerCase();
  if (normalized in LOG_LEVELS) {
    return normalized;
  }
  return void 0;
}

// utils/retry.ts
var logger = createLogger("utils", "retry");
var DEFAULT_RETRY_OPTIONS = {
  maxAttempts: 3,
  initialDelayMs: 1e3,
  maxDelayMs: 3e4,
  backoffMultiplier: 2,
  jitter: true,
  shouldRetry: () => true,
  onRetry: () => {
  }
};
function calculateDelay(attempt, options) {
  let delay = options.initialDelayMs * Math.pow(options.backoffMultiplier, attempt);
  delay = Math.min(delay, options.maxDelayMs);
  if (options.jitter) {
    const jitterFactor = 0.9 + Math.random() * 0.2;
    delay = Math.floor(delay * jitterFactor);
  }
  return delay;
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function withRetry(fn, options = {}) {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError;
  for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      lastError = err;
      const isLastAttempt = attempt === opts.maxAttempts - 1;
      const shouldRetry = !isLastAttempt && opts.shouldRetry(err, attempt + 1);
      if (!shouldRetry) {
        throw err;
      }
      const delay = calculateDelay(attempt, opts);
      const attemptNumber = attempt + 1;
      logger.warn(`Retry attempt ${attemptNumber}/${opts.maxAttempts - 1} after ${delay}ms`, {
        attempt: attemptNumber,
        delayMs: delay,
        error: err.message
      });
      opts.onRetry(attemptNumber, delay, err);
      await sleep(delay);
    }
  }
  throw lastError || new Error("All retry attempts failed");
}
function createRetryWrapper(fn, options = {}) {
  return async (...args) => {
    return withRetry(() => fn(...args), options);
  };
}
var RetryPredicates = {
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
    return message.includes("network") || message.includes("timeout") || message.includes("econnrefused") || message.includes("enotfound");
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
  }
};

exports.RetryPredicates = RetryPredicates;
exports.configureLogger = configureLogger;
exports.createLogger = createLogger;
exports.createRetryWrapper = createRetryWrapper;
exports.getLoggerConfig = getLoggerConfig;
exports.parseLogLevel = parseLogLevel;
exports.withRetry = withRetry;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map