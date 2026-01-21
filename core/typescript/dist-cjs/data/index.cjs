'use strict';

var crypto = require('crypto');

// data/namespace.ts
var DEFAULT_CONFIG = {
  prefix: "[artk-",
  suffix: "]"
};
function generateRunId() {
  return crypto.randomBytes(4).toString("hex");
}
function namespace(value, runId, config = DEFAULT_CONFIG) {
  return `${value} ${config.prefix}${runId}${config.suffix}`;
}
function parseNamespace(namespacedValue, config = DEFAULT_CONFIG) {
  const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedPrefix = escapeRegex(config.prefix);
  const escapedSuffix = escapeRegex(config.suffix);
  const pattern = new RegExp(
    `^(.+)\\s${escapedPrefix}([a-f0-9]+)${escapedSuffix}$`
  );
  const match = namespacedValue.match(pattern);
  if (!match || !match[1] || !match[2]) {
    return null;
  }
  return {
    value: match[1],
    runId: match[2]
  };
}
function isNamespaced(value, config = DEFAULT_CONFIG) {
  return parseNamespace(value, config) !== null;
}

// utils/logger.ts
var LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};
var globalConfig = {
  minLevel: "info",
  format: "json",
  output: (entry) => {
    const target = entry.level === "error" ? console.error : console.log;
    {
      target(JSON.stringify(entry));
    }
  }
};
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

// data/cleanup.ts
var AggregateErrorPolyfill = typeof AggregateError !== "undefined" ? AggregateError : class extends Error {
  errors;
  constructor(errors, message) {
    super(message);
    this.name = "AggregateError";
    this.errors = Array.from(errors);
  }
};
var logger = createLogger("data", "CleanupManager");
var CleanupManager = class {
  entries = [];
  cleanupRun = false;
  /**
   * Register a cleanup function
   *
   * @param fn - Async cleanup function
   * @param options - Optional priority and label
   */
  register(fn, options = {}) {
    const { priority = 100, label } = options;
    if (this.cleanupRun) {
      logger.warn("Cleanup already run, new registration will be ignored", {
        label,
        priority
      });
      return;
    }
    this.entries.push({
      fn,
      priority,
      label
    });
    logger.debug("Cleanup registered", {
      priority,
      label: label ?? "unlabeled",
      totalEntries: this.entries.length
    });
  }
  /**
   * Execute all registered cleanup functions
   *
   * - Runs in priority order (lower values first)
   * - Continues execution even if individual cleanups fail
   * - Logs success and failure for each cleanup
   * - Throws aggregate error if any cleanups failed
   *
   * @throws {AggregateError} If any cleanup functions fail (after all have run)
   */
  async runAll() {
    if (this.cleanupRun) {
      logger.warn("Cleanup already executed, skipping duplicate run");
      return;
    }
    this.cleanupRun = true;
    if (this.entries.length === 0) {
      logger.debug("No cleanup entries to execute");
      return;
    }
    const sorted = [...this.entries].sort((a, b) => a.priority - b.priority);
    logger.info(`Executing ${sorted.length} cleanup operations`, {
      entries: sorted.map((e) => ({
        priority: e.priority,
        label: e.label ?? "unlabeled"
      }))
    });
    const errors = [];
    for (const entry of sorted) {
      const label = entry.label ?? "unlabeled";
      try {
        logger.debug(`Running cleanup: ${label}`, {
          priority: entry.priority
        });
        await entry.fn();
        logger.debug(`Cleanup succeeded: ${label}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Cleanup failed: ${label}`, {
          priority: entry.priority,
          error: errorMessage
        });
        errors.push(
          new Error(`Cleanup "${label}" (priority ${entry.priority}) failed: ${errorMessage}`)
        );
      }
    }
    if (errors.length > 0) {
      logger.error(`${errors.length} cleanup operations failed`, {
        failedCount: errors.length,
        totalCount: sorted.length
      });
      throw new AggregateErrorPolyfill(
        errors,
        `${errors.length} of ${sorted.length} cleanup operations failed`
      );
    }
    logger.info("All cleanup operations completed successfully", {
      totalCount: sorted.length
    });
  }
  /**
   * Get count of registered cleanups
   *
   * @returns Number of registered cleanup entries
   */
  count() {
    return this.entries.length;
  }
  /**
   * Check if cleanup has been executed
   *
   * @returns True if runAll() has been called
   */
  hasRun() {
    return this.cleanupRun;
  }
  /**
   * Clear all registered cleanups (useful for testing)
   *
   * NOTE: Does not reset cleanupRun flag
   */
  clear() {
    this.entries.length = 0;
    logger.debug("All cleanup entries cleared");
  }
};

// data/builders.ts
var DataBuilder = class {
  runId;
  namespaceConfig;
  /**
   * Set namespace run ID for test isolation
   *
   * @param runId - Unique run identifier
   * @param config - Optional namespace configuration
   * @returns This builder for chaining
   */
  withNamespace(runId, config) {
    this.runId = runId;
    this.namespaceConfig = config;
    return this;
  }
  /**
   * Apply namespace to a string value if runId is set
   *
   * @param value - Original value
   * @returns Namespaced value if runId is set, otherwise original value
   *
   * @example
   * // Without namespace
   * this.namespacedValue('Test User');
   * // => "Test User"
   *
   * // With namespace
   * this.withNamespace('abc123');
   * this.namespacedValue('Test User');
   * // => "Test User [artk-abc123]"
   */
  namespacedValue(value) {
    if (!this.runId) {
      return value;
    }
    return namespace(value, this.runId, this.namespaceConfig);
  }
};

// data/api-client.ts
var logger2 = createLogger("data", "DataApiClient");
var DataApiClient = class {
  baseUrl;
  headers;
  /**
   * Create a new data API client
   *
   * @param options - Client configuration
   */
  constructor(options) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.headers = {
      "Content-Type": "application/json",
      ...options.headers
    };
    logger2.debug("Client initialized", {
      baseUrl: this.baseUrl,
      hasAuth: "Authorization" in this.headers
    });
  }
  /**
   * Perform GET request
   *
   * @param path - API endpoint path (e.g., '/users/123')
   * @returns Response data
   */
  async get(path) {
    return this.request("GET", path);
  }
  /**
   * Perform POST request
   *
   * @param path - API endpoint path
   * @param data - Request body
   * @returns Response data
   */
  async post(path, data) {
    return this.request("POST", path, data);
  }
  /**
   * Perform PUT request
   *
   * @param path - API endpoint path
   * @param data - Request body
   * @returns Response data
   */
  async put(path, data) {
    return this.request("PUT", path, data);
  }
  /**
   * Perform DELETE request
   *
   * @param path - API endpoint path
   * @param data - Optional request body
   * @returns Response data
   */
  async delete(path, data) {
    return this.request("DELETE", path, data);
  }
  /**
   * Perform HTTP request with error handling
   *
   * @param method - HTTP method
   * @param path - API endpoint path
   * @param data - Optional request body
   * @returns Response data
   * @throws {Error} If request fails
   */
  async request(method, path, data) {
    const url = `${this.baseUrl}${path}`;
    logger2.debug(`${method} ${path}`, {
      url,
      hasBody: !!data
    });
    try {
      const response = await fetch(url, {
        method,
        headers: this.headers,
        body: data ? JSON.stringify(data) : void 0
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP ${response.status} ${response.statusText}: ${errorText}`
        );
      }
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        logger2.debug(`${method} ${path} - non-JSON response`, {
          status: response.status,
          contentType
        });
        return void 0;
      }
      const result = await response.json();
      logger2.debug(`${method} ${path} - success`, {
        status: response.status
      });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger2.error(`${method} ${path} - failed`, {
        error: errorMessage
      });
      throw new Error(`API request failed: ${method} ${path} - ${errorMessage}`);
    }
  }
  /**
   * Create cleanup function for API-based resource deletion
   *
   * @param method - HTTP method (typically 'DELETE')
   * @param path - API endpoint path
   * @param matcher - Optional data matcher for conditional deletion
   * @returns Cleanup function
   *
   * @example
   * const cleanup = client.createCleanup('DELETE', '/users/123');
   * cleanupManager.register(cleanup, { label: 'Delete test user' });
   */
  createCleanup(method, path, matcher) {
    return async () => {
      await this.request(method, path, matcher);
    };
  }
};

// data/factories.ts
function createFactory(defaults) {
  return (overrides) => {
    return {
      ...defaults,
      ...overrides
    };
  };
}
function createSequencedFactory(defaults) {
  let sequence = 0;
  const replaceSequence = (value, seq) => {
    if (typeof value === "string") {
      return value.replace(/\{\{seq\}\}/g, String(seq));
    }
    if (Array.isArray(value)) {
      return value.map((item) => replaceSequence(item, seq));
    }
    if (value !== null && typeof value === "object") {
      const result = {};
      for (const [key, val] of Object.entries(value)) {
        result[key] = replaceSequence(val, seq);
      }
      return result;
    }
    return value;
  };
  return {
    create(overrides) {
      sequence += 1;
      const merged = {
        ...defaults,
        ...overrides
      };
      return replaceSequence(merged, sequence);
    },
    reset() {
      sequence = 0;
    },
    count() {
      return sequence;
    }
  };
}
function createCustomFactory(initFn) {
  return (overrides) => {
    return initFn(overrides);
  };
}

exports.CleanupManager = CleanupManager;
exports.DataApiClient = DataApiClient;
exports.DataBuilder = DataBuilder;
exports.createCustomFactory = createCustomFactory;
exports.createFactory = createFactory;
exports.createSequencedFactory = createSequencedFactory;
exports.generateRunId = generateRunId;
exports.isNamespaced = isNamespaced;
exports.namespace = namespace;
exports.parseNamespace = parseNamespace;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map