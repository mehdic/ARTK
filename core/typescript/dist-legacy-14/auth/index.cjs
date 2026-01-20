'use strict';

var fs = require('fs/promises');
var path = require('path');
var otplib = require('otplib');

function _interopNamespace(e) {
  if (e && e.__esModule) return e;
  var n = Object.create(null);
  if (e) {
    Object.keys(e).forEach(function (k) {
      if (k !== 'default') {
        var d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: function () { return e[k]; }
        });
      }
    });
  }
  n.default = e;
  return Object.freeze(n);
}

var fs__namespace = /*#__PURE__*/_interopNamespace(fs);
var path__namespace = /*#__PURE__*/_interopNamespace(path);

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// errors/auth-error.ts
var ARTKAuthError = class _ARTKAuthError extends Error {
  constructor(message, role, phase, idpResponse, remediation) {
    super(message);
    /**
     * Role that failed to authenticate
     */
    __publicField(this, "role");
    /**
     * Phase where authentication failed
     */
    __publicField(this, "phase");
    /**
     * Optional IdP response or error message
     */
    __publicField(this, "idpResponse");
    /**
     * Optional remediation steps to fix the error
     */
    __publicField(this, "remediation");
    this.name = "ARTKAuthError";
    this.role = role;
    this.phase = phase;
    this.idpResponse = idpResponse;
    this.remediation = remediation;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, _ARTKAuthError);
    }
  }
  /**
   * Format error as a human-readable string with context
   */
  toString() {
    let result = `${this.name}: ${this.message}
`;
    result += `  Role: ${this.role}
`;
    result += `  Phase: ${this.phase}`;
    if (this.idpResponse) {
      result += `
  IdP Response: ${this.idpResponse}`;
    }
    if (this.remediation) {
      result += `
  Remediation: ${this.remediation}`;
    }
    return result;
  }
};

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

// auth/credentials.ts
var logger = createLogger("auth", "credentials");
function getCredentials(role, authConfig, options = {}) {
  const env = options.env ?? process.env;
  const maskPassword = options.maskPassword ?? true;
  logger.debug("Getting credentials for role", { role });
  const roleConfig = authConfig.roles[role];
  if (!roleConfig) {
    const availableRoles = Object.keys(authConfig.roles).join(", ");
    logger.error("Role not found in configuration", { role, availableRoles });
    throw new ARTKAuthError(
      `Role "${role}" not found in auth configuration. Available roles: ${availableRoles}`,
      role,
      "credentials",
      void 0,
      `Check that the role "${role}" is defined in auth.roles in your artk.config.yml`
    );
  }
  const { username: usernameEnvVar, password: passwordEnvVar } = roleConfig.credentialsEnv;
  const username = env[usernameEnvVar];
  if (!username) {
    logger.error("Username environment variable not set", {
      role,
      envVar: usernameEnvVar
    });
    throw new ARTKAuthError(
      `Environment variable "${usernameEnvVar}" for role "${role}" username is not set`,
      role,
      "credentials",
      void 0,
      `Set the ${usernameEnvVar} environment variable with the username for the "${role}" role`
    );
  }
  const password = env[passwordEnvVar];
  if (!password) {
    logger.error("Password environment variable not set", {
      role,
      envVar: passwordEnvVar
    });
    throw new ARTKAuthError(
      `Environment variable "${passwordEnvVar}" for role "${role}" password is not set`,
      role,
      "credentials",
      void 0,
      `Set the ${passwordEnvVar} environment variable with the password for the "${role}" role`
    );
  }
  logger.info("Credentials loaded successfully", {
    role,
    username,
    password: maskPassword ? "***" : password
  });
  return { username, password };
}
function getCredentialsFromRoleConfig(role, roleConfig, options = {}) {
  const env = options.env ?? process.env;
  const maskPassword = options.maskPassword ?? true;
  const { username: usernameEnvVar, password: passwordEnvVar } = roleConfig.credentialsEnv;
  const username = env[usernameEnvVar];
  if (!username) {
    throw new ARTKAuthError(
      `Environment variable "${usernameEnvVar}" for role "${role}" username is not set`,
      role,
      "credentials",
      void 0,
      `Set the ${usernameEnvVar} environment variable`
    );
  }
  const password = env[passwordEnvVar];
  if (!password) {
    throw new ARTKAuthError(
      `Environment variable "${passwordEnvVar}" for role "${role}" password is not set`,
      role,
      "credentials",
      void 0,
      `Set the ${passwordEnvVar} environment variable`
    );
  }
  logger.debug("Credentials loaded from role config", {
    role,
    username,
    password: maskPassword ? "***" : password
  });
  return { username, password };
}
function validateCredentials(roles, authConfig, env = process.env) {
  const missing = [];
  for (const role of roles) {
    const roleConfig = authConfig.roles[role];
    if (!roleConfig) {
      missing.push({
        role,
        type: "role",
        message: `Role "${role}" not found in configuration`
      });
      continue;
    }
    const { username: usernameEnvVar, password: passwordEnvVar } = roleConfig.credentialsEnv;
    if (!env[usernameEnvVar]) {
      missing.push({
        role,
        type: "username",
        envVar: usernameEnvVar,
        message: `Environment variable "${usernameEnvVar}" not set`
      });
    }
    if (!env[passwordEnvVar]) {
      missing.push({
        role,
        type: "password",
        envVar: passwordEnvVar,
        message: `Environment variable "${passwordEnvVar}" not set`
      });
    }
  }
  return missing;
}
function formatMissingCredentialsError(missing) {
  if (missing.length === 0) {
    return "";
  }
  const lines = ["Missing credentials:"];
  const byRole = /* @__PURE__ */ new Map();
  for (const m of missing) {
    const existing = byRole.get(m.role) ?? [];
    existing.push(m);
    byRole.set(m.role, existing);
  }
  for (const [role, items] of byRole) {
    lines.push(`  Role "${role}":`);
    for (const item of items) {
      if (item.type === "role") {
        lines.push(`    - ${item.message}`);
      } else {
        lines.push(`    - ${item.type}: ${item.envVar} (${item.message})`);
      }
    }
  }
  lines.push("");
  lines.push("To fix, set the required environment variables:");
  const envVars = missing.filter((m) => m.envVar).map((m) => m.envVar);
  const uniqueEnvVars = [...new Set(envVars)];
  for (const envVar of uniqueEnvVars) {
    lines.push(`  export ${envVar}="<value>"`);
  }
  return lines.join("\n");
}
function hasCredentials(role, authConfig, env = process.env) {
  const roleConfig = authConfig.roles[role];
  if (!roleConfig) {
    return false;
  }
  const { username: usernameEnvVar, password: passwordEnvVar } = roleConfig.credentialsEnv;
  return Boolean(env[usernameEnvVar]) && Boolean(env[passwordEnvVar]);
}

// errors/storage-state-error.ts
var ARTKStorageStateError = class _ARTKStorageStateError extends Error {
  constructor(message, role, path3, cause) {
    super(message);
    /**
     * Role associated with the storage state
     */
    __publicField(this, "role");
    /**
     * Path to the storage state file
     */
    __publicField(this, "path");
    /**
     * Cause of the storage state error
     */
    __publicField(this, "cause");
    this.name = "ARTKStorageStateError";
    this.role = role;
    this.path = path3;
    this.cause = cause;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, _ARTKStorageStateError);
    }
  }
  /**
   * Format error as a human-readable string with context
   */
  toString() {
    return `${this.name}: ${this.message}
  Role: ${this.role}
  Path: ${this.path}
  Cause: ${this.cause}`;
  }
};

// auth/storage-state.ts
var logger2 = createLogger("auth", "storage-state");
var DEFAULT_STORAGE_STATE_CONFIG = {
  directory: ".auth-states",
  maxAgeMinutes: 60,
  filePattern: "{role}.json"
};
var CLEANUP_MAX_AGE_MS = 24 * 60 * 60 * 1e3;
async function saveStorageState(context, role, options = {}) {
  const config = resolveOptions(options);
  const filePath = getStorageStatePath(role, config);
  logger2.info("Saving storage state", { role, path: filePath });
  try {
    const dir = path__namespace.dirname(filePath);
    await fs__namespace.mkdir(dir, { recursive: true });
    await context.storageState({ path: filePath });
    logger2.info("Storage state saved successfully", { role, path: filePath });
    return filePath;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger2.error("Failed to save storage state", { role, path: filePath, error: message });
    throw new ARTKStorageStateError(
      `Failed to save storage state for role "${role}": ${message}`,
      role,
      filePath,
      "invalid"
    );
  }
}
async function loadStorageState(role, options = {}) {
  const config = resolveOptions(options);
  const filePath = getStorageStatePath(role, config);
  logger2.debug("Loading storage state", { role, path: filePath });
  const valid = await isStorageStateValid(role, config);
  if (!valid) {
    logger2.debug("Storage state not valid or not found", { role, path: filePath });
    return void 0;
  }
  logger2.info("Storage state loaded successfully", { role, path: filePath });
  return filePath;
}
async function isStorageStateValid(role, options = {}) {
  const config = resolveOptions(options);
  const filePath = getStorageStatePath(role, config);
  const maxAgeMs = config.maxAgeMinutes * 60 * 1e3;
  try {
    const stats = await fs__namespace.stat(filePath);
    const age = Date.now() - stats.mtimeMs;
    if (age > maxAgeMs) {
      logger2.debug("Storage state expired", {
        role,
        path: filePath,
        ageMinutes: Math.round(age / 6e4),
        maxAgeMinutes: config.maxAgeMinutes
      });
      return false;
    }
    const content = await fs__namespace.readFile(filePath, "utf-8");
    JSON.parse(content);
    logger2.debug("Storage state is valid", {
      role,
      path: filePath,
      ageMinutes: Math.round(age / 6e4)
    });
    return true;
  } catch (error) {
    logger2.debug("Storage state not found or invalid", { role, path: filePath });
    return false;
  }
}
async function getStorageStateMetadata(role, options = {}) {
  const config = resolveOptions(options);
  const filePath = getStorageStatePath(role, config);
  const maxAgeMs = config.maxAgeMinutes * 60 * 1e3;
  try {
    const stats = await fs__namespace.stat(filePath);
    const age = Date.now() - stats.mtimeMs;
    return {
      role,
      createdAt: stats.mtime,
      path: filePath,
      isValid: age <= maxAgeMs
    };
  } catch {
    return void 0;
  }
}
async function readStorageState(role, options = {}) {
  const config = resolveOptions(options);
  const filePath = getStorageStatePath(role, config);
  try {
    const content = await fs__namespace.readFile(filePath, "utf-8");
    const state = JSON.parse(content);
    if (!Array.isArray(state.cookies) || !Array.isArray(state.origins)) {
      throw new Error("Invalid storage state structure");
    }
    return state;
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new ARTKStorageStateError(
        `Storage state file not found for role "${role}"`,
        role,
        filePath,
        "missing"
      );
    }
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("JSON")) {
      throw new ARTKStorageStateError(
        `Storage state file corrupted for role "${role}": ${message}`,
        role,
        filePath,
        "corrupted"
      );
    }
    throw new ARTKStorageStateError(
      `Failed to read storage state for role "${role}": ${message}`,
      role,
      filePath,
      "invalid"
    );
  }
}
async function clearStorageState(role, options = {}) {
  const config = resolveOptions(options);
  const directory = getStorageStateDirectory(config);
  if (role) {
    const filePath = getStorageStatePath(role, config);
    try {
      await fs__namespace.unlink(filePath);
      logger2.info("Storage state cleared", { role, path: filePath });
      return 1;
    } catch (error) {
      if (error.code !== "ENOENT") {
        logger2.warn("Failed to clear storage state", { role, error: String(error) });
      }
      return 0;
    }
  }
  try {
    const files = await fs__namespace.readdir(directory);
    let deletedCount = 0;
    for (const file of files) {
      if (file.endsWith(".json")) {
        try {
          await fs__namespace.unlink(path__namespace.join(directory, file));
          deletedCount++;
        } catch {
        }
      }
    }
    logger2.info("All storage states cleared", { count: deletedCount });
    return deletedCount;
  } catch (error) {
    if (error.code !== "ENOENT") {
      logger2.warn("Failed to clear storage states", { error: String(error) });
    }
    return 0;
  }
}
async function cleanupExpiredStorageStates(options = {}) {
  const config = resolveOptions(options);
  const directory = getStorageStateDirectory(config);
  const deletedFiles = [];
  const errors = [];
  logger2.info("Starting storage state cleanup", { directory, maxAgeHours: 24 });
  try {
    try {
      await fs__namespace.access(directory);
    } catch {
      logger2.debug("Storage state directory does not exist, nothing to clean up");
      return { deletedCount: 0, deletedFiles: [], errors: [] };
    }
    const files = await fs__namespace.readdir(directory);
    const now = Date.now();
    for (const file of files) {
      if (!file.endsWith(".json")) {
        continue;
      }
      const filePath = path__namespace.join(directory, file);
      try {
        const stats = await fs__namespace.stat(filePath);
        const age = now - stats.mtimeMs;
        if (age > CLEANUP_MAX_AGE_MS) {
          await fs__namespace.unlink(filePath);
          deletedFiles.push(filePath);
          logger2.debug("Deleted expired storage state", {
            path: filePath,
            ageHours: Math.round(age / 36e5)
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push({ path: filePath, message });
        logger2.warn("Failed to process file during cleanup", { path: filePath, error: message });
      }
    }
    logger2.info("Storage state cleanup complete", {
      deletedCount: deletedFiles.length,
      errorCount: errors.length
    });
    return {
      deletedCount: deletedFiles.length,
      deletedFiles,
      errors
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger2.error("Storage state cleanup failed", { error: message });
    return {
      deletedCount: 0,
      deletedFiles: [],
      errors: [{ path: directory, message }]
    };
  }
}
async function cleanupStorageStatesOlderThan(maxAgeMs, options = {}) {
  const config = resolveOptions(options);
  const directory = getStorageStateDirectory(config);
  const deletedFiles = [];
  const errors = [];
  try {
    try {
      await fs__namespace.access(directory);
    } catch {
      return { deletedCount: 0, deletedFiles: [], errors: [] };
    }
    const files = await fs__namespace.readdir(directory);
    const now = Date.now();
    for (const file of files) {
      if (!file.endsWith(".json")) {
        continue;
      }
      const filePath = path__namespace.join(directory, file);
      try {
        const stats = await fs__namespace.stat(filePath);
        const age = now - stats.mtimeMs;
        if (age > maxAgeMs) {
          await fs__namespace.unlink(filePath);
          deletedFiles.push(filePath);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push({ path: filePath, message });
      }
    }
    return { deletedCount: deletedFiles.length, deletedFiles, errors };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      deletedCount: 0,
      deletedFiles: [],
      errors: [{ path: directory, message }]
    };
  }
}
function resolveOptions(options) {
  return {
    directory: options.directory ?? DEFAULT_STORAGE_STATE_CONFIG.directory,
    maxAgeMinutes: options.maxAgeMinutes ?? DEFAULT_STORAGE_STATE_CONFIG.maxAgeMinutes,
    filePattern: options.filePattern ?? DEFAULT_STORAGE_STATE_CONFIG.filePattern,
    projectRoot: options.projectRoot ?? process.cwd(),
    environment: options.environment
  };
}
function getStorageStateDirectory(config) {
  return path__namespace.join(config.projectRoot, config.directory);
}
function getStorageStatePath(role, config) {
  const directory = getStorageStateDirectory(config);
  let filename = config.filePattern.replace("{role}", role).replace("{env}", config.environment ?? "default");
  if (!filename.endsWith(".json")) {
    filename += ".json";
  }
  return path__namespace.join(directory, filename);
}
function getRoleFromPath(filePath, pattern = "{role}.json") {
  const filename = path__namespace.basename(filePath);
  let patternRegex = pattern.replace(/\./g, "\\.").replace("\\{role\\}", "([\\w-]+)").replace("\\{env\\}", "[\\w-]+");
  patternRegex = patternRegex.replace("{role}", "([\\w-]+)").replace("{env}", "[\\w-]+");
  const match = filename.match(new RegExp(`^${patternRegex}$`));
  return match?.[1];
}
async function listStorageStates(options = {}) {
  const config = resolveOptions(options);
  const directory = getStorageStateDirectory(config);
  const maxAgeMs = config.maxAgeMinutes * 60 * 1e3;
  const results = [];
  try {
    const files = await fs__namespace.readdir(directory);
    for (const file of files) {
      if (!file.endsWith(".json")) {
        continue;
      }
      const filePath = path__namespace.join(directory, file);
      const role = getRoleFromPath(filePath, config.filePattern);
      if (!role) {
        continue;
      }
      try {
        const stats = await fs__namespace.stat(filePath);
        const age = Date.now() - stats.mtimeMs;
        results.push({
          role,
          createdAt: stats.mtime,
          path: filePath,
          isValid: age <= maxAgeMs
        });
      } catch {
      }
    }
  } catch {
  }
  return results;
}
var logger3 = createLogger("auth", "oidc-flow");
function generateTOTPCode(secretEnvVar, env = process.env) {
  const secret = env[secretEnvVar];
  if (!secret) {
    logger3.error("TOTP secret environment variable not set", { envVar: secretEnvVar });
    throw new ARTKAuthError(
      `TOTP secret environment variable "${secretEnvVar}" is not set`,
      "unknown",
      "mfa",
      void 0,
      `Set the ${secretEnvVar} environment variable with your TOTP secret`
    );
  }
  try {
    const cleanSecret = secret.replace(/\s+/g, "").toUpperCase();
    const code = otplib.authenticator.generate(cleanSecret);
    logger3.debug("Generated TOTP code", {
      envVar: secretEnvVar,
      codeLength: code.length
    });
    return code;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger3.error("Failed to generate TOTP code", { envVar: secretEnvVar, error: message });
    throw new ARTKAuthError(
      `Failed to generate TOTP code: ${message}`,
      "unknown",
      "mfa",
      void 0,
      `Verify that ${secretEnvVar} contains a valid base32-encoded TOTP secret`
    );
  }
}
function verifyTOTPCode(code, secretEnvVar, env = process.env) {
  const secret = env[secretEnvVar];
  if (!secret) {
    return false;
  }
  try {
    const cleanSecret = secret.replace(/\s+/g, "").toUpperCase();
    return otplib.authenticator.verify({ token: code, secret: cleanSecret });
  } catch {
    return false;
  }
}
function getTimeUntilNextTOTPWindow() {
  const step = otplib.authenticator.options.step ?? 30;
  const now = Math.floor(Date.now() / 1e3);
  return step - now % step;
}
async function waitForFreshTOTPWindow(thresholdSeconds = 5) {
  const remaining = getTimeUntilNextTOTPWindow();
  if (remaining < thresholdSeconds) {
    logger3.debug("Waiting for fresh TOTP window", { remaining, threshold: thresholdSeconds });
    await new Promise((resolve) => setTimeout(resolve, (remaining + 1) * 1e3));
    return true;
  }
  return false;
}
async function executeOIDCFlow(page, config, credentials, options) {
  const startTime = Date.now();
  const role = options.role ?? "unknown";
  const { idpHandler } = options;
  logger3.info("Starting OIDC flow", {
    role,
    idpType: config.idpType,
    loginUrl: config.loginUrl
  });
  try {
    await navigateToLogin(page, config, role);
    if (!options.skipIdpRedirect && config.loginUrl !== config.idpLoginUrl) {
      await waitForIdPRedirect(page, config, role);
    }
    await fillIdPCredentials(page, config, credentials, idpHandler, role);
    await submitIdPForm(page, config, idpHandler, role);
    if (config.mfa?.enabled) {
      await handleMFA(page, config.mfa, idpHandler, role);
    }
    if (idpHandler.handlePostLoginPrompts) {
      await idpHandler.handlePostLoginPrompts(page, config.idpSelectors);
    }
    await waitForSuccess(page, config, role);
    const duration = Date.now() - startTime;
    logger3.info("OIDC flow completed successfully", {
      role,
      durationMs: duration,
      finalUrl: page.url()
    });
    return {
      success: true,
      finalUrl: page.url(),
      durationMs: duration,
      phase: "callback"
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const authError = error instanceof ARTKAuthError ? error : new ARTKAuthError(
      error instanceof Error ? error.message : String(error),
      role,
      "credentials"
    );
    logger3.error("OIDC flow failed", {
      role,
      phase: authError.phase,
      durationMs: duration,
      error: authError.message
    });
    return {
      success: false,
      finalUrl: page.url(),
      durationMs: duration,
      phase: authError.phase,
      error: authError
    };
  }
}
async function navigateToLogin(page, config, role) {
  const timeout = config.timeouts?.loginFlowMs ?? 3e4;
  logger3.debug("Navigating to login URL", { url: config.loginUrl });
  try {
    await page.goto(config.loginUrl, {
      waitUntil: "domcontentloaded",
      timeout
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new ARTKAuthError(
      `Failed to navigate to login URL: ${message}`,
      role,
      "navigation",
      void 0,
      `Verify the login URL is correct and accessible: ${config.loginUrl}`
    );
  }
}
async function waitForIdPRedirect(page, config, role) {
  const timeout = config.timeouts?.idpRedirectMs ?? 1e4;
  logger3.debug("Waiting for IdP redirect");
  if (config.idpLoginUrl) {
    try {
      await page.waitForURL((url) => url.toString().includes(new URL(config.idpLoginUrl).host), {
        timeout
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new ARTKAuthError(
        `Timeout waiting for IdP redirect: ${message}`,
        role,
        "navigation",
        void 0,
        "The application may not have redirected to the IdP login page"
      );
    }
  } else {
    const originalUrl = page.url();
    try {
      await page.waitForURL((url) => url.toString() !== originalUrl, { timeout });
    } catch {
      logger3.debug("URL did not change, may be SPA behavior");
    }
  }
}
async function fillIdPCredentials(page, config, credentials, idpHandler, role) {
  logger3.debug("Filling credentials on IdP page");
  try {
    await idpHandler.fillCredentials(page, credentials, config.idpSelectors);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new ARTKAuthError(
      `Failed to fill credentials on IdP page: ${message}`,
      role,
      "credentials",
      void 0,
      "Check if the IdP selectors are correct for username/password fields"
    );
  }
}
async function submitIdPForm(page, config, idpHandler, role) {
  logger3.debug("Submitting IdP login form");
  try {
    await idpHandler.submitForm(page, config.idpSelectors);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new ARTKAuthError(
      `Failed to submit login form: ${message}`,
      role,
      "credentials",
      void 0,
      "Check if the submit button selector is correct"
    );
  }
}
async function handleMFA(page, mfaConfig, idpHandler, role) {
  logger3.info("Handling MFA challenge", { type: mfaConfig.type });
  switch (mfaConfig.type) {
    case "totp":
      await handleTOTPMFA(page, mfaConfig, idpHandler, role);
      break;
    case "push":
      await handlePushMFA(page, mfaConfig, role);
      break;
    case "sms":
      throw new ARTKAuthError(
        "SMS-based MFA is not supported for automated testing",
        role,
        "mfa",
        void 0,
        "Configure TOTP-based MFA for the test account instead"
      );
    case "none":
      logger3.debug("MFA type is none, skipping");
      break;
    default:
      if (idpHandler.handleMFA) {
        await idpHandler.handleMFA(page, mfaConfig);
      }
  }
}
async function handleTOTPMFA(page, mfaConfig, idpHandler, role) {
  if (!mfaConfig.totpSecretEnv) {
    throw new ARTKAuthError(
      "TOTP secret environment variable not configured",
      role,
      "mfa",
      void 0,
      "Configure mfa.totpSecretEnv in your artk.config.yml"
    );
  }
  await waitForFreshTOTPWindow(5);
  const code = generateTOTPCode(mfaConfig.totpSecretEnv);
  const totpSelector = mfaConfig.totpInputSelector ?? idpHandler.getDefaultSelectors().totpInput ?? 'input[name*="otp"], input[name*="totp"], input[name*="code"]';
  const submitSelector = mfaConfig.totpSubmitSelector ?? idpHandler.getDefaultSelectors().totpSubmit ?? 'button[type="submit"]';
  try {
    await page.waitForSelector(totpSelector, { state: "visible", timeout: 1e4 });
    await page.fill(totpSelector, code);
    await page.click(submitSelector);
    logger3.debug("TOTP code submitted");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new ARTKAuthError(
      `Failed to complete TOTP MFA: ${message}`,
      role,
      "mfa",
      void 0,
      "Check TOTP input selector configuration and verify the secret is correct"
    );
  }
}
async function handlePushMFA(page, mfaConfig, role) {
  const timeout = mfaConfig.pushTimeoutMs ?? 3e4;
  logger3.info("Waiting for push notification approval", { timeoutMs: timeout });
  try {
    await page.waitForURL((url) => {
      return !url.toString().includes("mfa") && !url.toString().includes("2fa");
    }, { timeout });
  } catch (error) {
    throw new ARTKAuthError(
      `Push MFA approval timeout after ${timeout}ms`,
      role,
      "mfa",
      void 0,
      "Approve the push notification on your device or configure TOTP instead"
    );
  }
}
async function waitForSuccess(page, config, role) {
  const timeout = config.success.timeout ?? config.timeouts?.callbackMs ?? 1e4;
  logger3.debug("Waiting for authentication success");
  const { url, selector } = config.success;
  if (!url && !selector) {
    try {
      await page.waitForLoadState("networkidle", { timeout });
    } catch {
    }
    return;
  }
  try {
    if (url && selector) {
      await Promise.race([
        page.waitForURL(url, { timeout }),
        page.waitForSelector(selector, { state: "visible", timeout })
      ]);
    } else if (url) {
      await page.waitForURL(url, { timeout });
    } else if (selector) {
      await page.waitForSelector(selector, { state: "visible", timeout });
    }
  } catch (error) {
    const errorText = await detectAuthError(page);
    throw new ARTKAuthError(
      "Authentication callback failed",
      role,
      "callback",
      errorText,
      "Verify credentials are correct and the success URL/selector configuration"
    );
  }
}
async function detectAuthError(page) {
  const errorSelectors = [
    ".error-message",
    ".alert-danger",
    ".error",
    '[role="alert"]',
    ".login-error",
    "#error-message"
  ];
  for (const selector of errorSelectors) {
    try {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 500 })) {
        return await element.textContent() ?? void 0;
      }
    } catch {
    }
  }
  return void 0;
}
async function isOIDCSessionValid(page, config) {
  const { url, selector } = config.success;
  if (url) {
    const currentUrl = page.url();
    const urlMatches = typeof url === "string" ? currentUrl.includes(url) : new RegExp(url).test(currentUrl);
    if (!urlMatches) {
      return false;
    }
  }
  if (selector) {
    try {
      await page.waitForSelector(selector, { state: "visible", timeout: 1e3 });
    } catch {
      return false;
    }
  }
  return true;
}

// auth/oidc/providers/keycloak.ts
var logger4 = createLogger("auth", "keycloak");
var DEFAULT_KEYCLOAK_SELECTORS = {
  // Username can be on a separate page or same page as password
  username: '#username, input[name="username"], #kc-login input[name="username"]',
  password: '#password, input[name="password"], #kc-login input[name="password"]',
  submit: '#kc-login, button[type="submit"], input[type="submit"]',
  // TOTP/OTP selectors
  totpInput: '#otp, input[name="otp"], input[name="totp"]',
  totpSubmit: 'button[type="submit"], input[type="submit"]'
};
var keycloakHandler = {
  idpType: "keycloak",
  /**
   * Fill credentials on Keycloak login page
   *
   * Handles both single-page and two-step login flows.
   */
  async fillCredentials(page, credentials, selectors) {
    const { username: usernameSelector, password: passwordSelector } = {
      ...DEFAULT_KEYCLOAK_SELECTORS,
      ...selectors
    };
    logger4.debug("Filling Keycloak credentials");
    await page.waitForSelector(usernameSelector, { state: "visible", timeout: 1e4 });
    const isPasswordVisible = await page.locator(passwordSelector).isVisible().catch(() => false);
    if (isPasswordVisible) {
      await page.fill(usernameSelector, credentials.username);
      await page.fill(passwordSelector, credentials.password);
    } else {
      await page.fill(usernameSelector, credentials.username);
      logger4.debug("Two-step login detected, submitting username first");
    }
  },
  /**
   * Submit the Keycloak login form
   */
  async submitForm(page, selectors) {
    const { submit: submitSelector, password: passwordSelector } = {
      ...DEFAULT_KEYCLOAK_SELECTORS,
      ...selectors
    };
    await page.click(submitSelector);
    try {
      await page.waitForLoadState("domcontentloaded", { timeout: 3e3 });
      const passwordField = page.locator(passwordSelector);
      const isPasswordVisible = await passwordField.isVisible({ timeout: 1e3 });
      if (isPasswordVisible) {
        logger4.debug("Password field visible after submit, checking if needs input");
        const passwordValue = await passwordField.inputValue();
        if (!passwordValue) {
          logger4.warn("Password field is empty after username submit - two-step flow may need handling");
        }
      }
    } catch {
    }
    logger4.debug("Keycloak form submitted");
  },
  /**
   * Handle Keycloak MFA challenge
   */
  async handleMFA(page, mfaConfig) {
    if (mfaConfig.type !== "totp") {
      logger4.warn("Non-TOTP MFA type, attempting generic handling", { type: mfaConfig.type });
      return;
    }
    const totpSelector = mfaConfig.totpInputSelector ?? DEFAULT_KEYCLOAK_SELECTORS.totpInput;
    const submitSelector = mfaConfig.totpSubmitSelector ?? DEFAULT_KEYCLOAK_SELECTORS.totpSubmit;
    logger4.debug("Handling Keycloak TOTP MFA");
    await page.waitForSelector(totpSelector, { state: "visible", timeout: 1e4 });
    if (!mfaConfig.totpSecretEnv) {
      throw new Error("TOTP secret environment variable not configured");
    }
    const code = generateTOTPCode(mfaConfig.totpSecretEnv);
    await page.fill(totpSelector, code);
    await page.click(submitSelector);
    logger4.debug("TOTP code submitted to Keycloak");
  },
  /**
   * Handle Keycloak post-login prompts
   *
   * Keycloak may show required actions like:
   * - Update password
   * - Verify email
   * - Configure OTP
   */
  async handlePostLoginPrompts(page, _selectors) {
    const requiredActionIndicators = [
      "#kc-update-password",
      "#kc-update-profile",
      "#kc-verify-email",
      ".required-action"
    ];
    for (const indicator of requiredActionIndicators) {
      try {
        const element = await page.waitForSelector(indicator, { timeout: 1e3, state: "visible" });
        if (element) {
          logger4.warn("Keycloak required action detected", { indicator });
          throw new Error(`Keycloak required action page detected: ${indicator}. Please complete required actions manually first.`);
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes("required action")) {
          throw error;
        }
      }
    }
  },
  /**
   * Get default Keycloak selectors
   */
  getDefaultSelectors() {
    return { ...DEFAULT_KEYCLOAK_SELECTORS };
  }
};
function isKeycloakLoginPage(page) {
  const url = page.url();
  return url.includes("/auth/realms/") || url.includes("/realms/") || url.includes("/protocol/openid-connect/");
}
async function getKeycloakErrorMessage(page) {
  const errorSelectors = [
    ".alert-error",
    ".kc-feedback-text",
    "#input-error",
    ".error-message"
  ];
  for (const selector of errorSelectors) {
    try {
      const element = page.locator(selector);
      if (await element.isVisible({ timeout: 500 })) {
        return await element.textContent() ?? void 0;
      }
    } catch {
    }
  }
  return void 0;
}

// auth/oidc/providers/azure-ad.ts
var logger5 = createLogger("auth", "azure-ad");
var DEFAULT_AZURE_AD_SELECTORS = {
  // Username input (email field)
  username: 'input[type="email"], input[name="loginfmt"], #i0116',
  // Password input
  password: 'input[type="password"], input[name="passwd"], #i0118, #passwordInput',
  // Primary submit button (Next / Sign in)
  submit: 'input[type="submit"], #idSIButton9',
  // "No" button on "Stay signed in?" prompt
  staySignedInNo: '#idBtn_Back, input[value="No"]',
  // TOTP/OTP selectors
  totpInput: 'input[name="otc"], #idTxtBx_SAOTCC_OTC',
  totpSubmit: 'input[type="submit"], #idSubmit_SAOTCC_Continue'
};
var azureAdHandler = {
  idpType: "azure-ad",
  /**
   * Fill credentials on Azure AD login page
   *
   * Azure AD uses a two-step process:
   * 1. Enter username, click Next
   * 2. Enter password
   */
  async fillCredentials(page, credentials, selectors) {
    const {
      username: usernameSelector,
      password: passwordSelector,
      submit: submitSelector
    } = {
      ...DEFAULT_AZURE_AD_SELECTORS,
      ...selectors
    };
    logger5.debug("Filling Azure AD credentials (two-step flow)");
    await page.waitForSelector(usernameSelector, { state: "visible", timeout: 1e4 });
    await page.fill(usernameSelector, credentials.username);
    await page.click(submitSelector);
    await page.waitForSelector(passwordSelector, { state: "visible", timeout: 1e4 });
    await page.fill(passwordSelector, credentials.password);
  },
  /**
   * Submit the Azure AD login form (Sign in)
   */
  async submitForm(page, selectors) {
    const { submit: submitSelector } = {
      ...DEFAULT_AZURE_AD_SELECTORS,
      ...selectors
    };
    await page.click(submitSelector);
    await page.waitForLoadState("domcontentloaded", { timeout: 1e4 });
    logger5.debug("Azure AD form submitted");
  },
  /**
   * Handle "Stay signed in?" prompt
   */
  async handlePostLoginPrompts(page, selectors) {
    const { staySignedInNo } = {
      ...DEFAULT_AZURE_AD_SELECTORS,
      ...selectors
    };
    try {
      const noButton = page.locator(staySignedInNo);
      const isVisible = await noButton.isVisible({ timeout: 3e3 });
      if (isVisible) {
        logger5.debug('Handling "Stay signed in?" prompt');
        await noButton.click();
        await page.waitForLoadState("domcontentloaded", { timeout: 5e3 });
      }
    } catch {
      logger5.debug('"Stay signed in?" prompt not shown');
    }
  },
  /**
   * Handle Azure AD MFA challenge
   */
  async handleMFA(page, mfaConfig) {
    if (mfaConfig.type !== "totp") {
      logger5.warn("Non-TOTP MFA type for Azure AD", { type: mfaConfig.type });
      return;
    }
    const totpSelector = mfaConfig.totpInputSelector ?? DEFAULT_AZURE_AD_SELECTORS.totpInput;
    const submitSelector = mfaConfig.totpSubmitSelector ?? DEFAULT_AZURE_AD_SELECTORS.totpSubmit;
    logger5.debug("Handling Azure AD TOTP MFA");
    await page.waitForSelector(totpSelector, { state: "visible", timeout: 1e4 });
    if (!mfaConfig.totpSecretEnv) {
      throw new Error("TOTP secret environment variable not configured");
    }
    const code = generateTOTPCode(mfaConfig.totpSecretEnv);
    await page.fill(totpSelector, code);
    await page.click(submitSelector);
    logger5.debug("TOTP code submitted to Azure AD");
  },
  /**
   * Get default Azure AD selectors
   */
  getDefaultSelectors() {
    return { ...DEFAULT_AZURE_AD_SELECTORS };
  }
};
function isAzureAdLoginPage(page) {
  const url = page.url();
  return url.includes("login.microsoftonline.com") || url.includes("login.live.com") || url.includes("login.windows.net");
}
async function getAzureAdErrorMessage(page) {
  const errorSelectors = [
    "#usernameError",
    "#passwordError",
    ".error-text",
    "#errorMessage",
    ".alert-error"
  ];
  for (const selector of errorSelectors) {
    try {
      const element = page.locator(selector);
      if (await element.isVisible({ timeout: 500 })) {
        return await element.textContent() ?? void 0;
      }
    } catch {
    }
  }
  return void 0;
}
async function isAzureAdMfaRequired(page) {
  const mfaIndicators = [
    "#idTxtBx_SAOTCC_OTC",
    // TOTP input
    "#idDiv_SAOTCC_Description",
    // MFA description
    ".verifyInput"
    // Verification input
  ];
  for (const selector of mfaIndicators) {
    try {
      const element = page.locator(selector);
      if (await element.isVisible({ timeout: 500 })) {
        return true;
      }
    } catch {
    }
  }
  return false;
}

// auth/oidc/providers/okta.ts
var logger6 = createLogger("auth", "okta");
var DEFAULT_OKTA_SELECTORS = {
  // Username input
  username: '#okta-signin-username, input[name="identifier"], input[name="username"]',
  // Password input
  password: '#okta-signin-password, input[name="credentials.passcode"], input[name="password"]',
  // Submit button
  submit: '#okta-signin-submit, input[type="submit"], button[type="submit"]',
  // TOTP/OTP selectors
  totpInput: 'input[name="credentials.passcode"], input[name="answer"], #input-container input',
  totpSubmit: 'input[type="submit"], button[type="submit"]'
};
var oktaHandler = {
  idpType: "okta",
  /**
   * Fill credentials on Okta login page
   */
  async fillCredentials(page, credentials, selectors) {
    const { username: usernameSelector, password: passwordSelector } = {
      ...DEFAULT_OKTA_SELECTORS,
      ...selectors
    };
    logger6.debug("Filling Okta credentials");
    await page.waitForSelector(usernameSelector, { state: "visible", timeout: 1e4 });
    const passwordField = page.locator(passwordSelector);
    const isPasswordVisible = await passwordField.isVisible().catch(() => false);
    if (isPasswordVisible) {
      await page.fill(usernameSelector, credentials.username);
      await page.fill(passwordSelector, credentials.password);
    } else {
      await page.fill(usernameSelector, credentials.username);
    }
  },
  /**
   * Submit the Okta login form
   */
  async submitForm(page, selectors) {
    const { submit: submitSelector, password: passwordSelector } = {
      ...DEFAULT_OKTA_SELECTORS,
      ...selectors
    };
    await page.click(submitSelector);
    await page.waitForLoadState("domcontentloaded", { timeout: 5e3 }).catch(() => {
    });
    try {
      const passwordField = page.locator(passwordSelector);
      const isPasswordVisible = await passwordField.isVisible({ timeout: 2e3 });
      if (isPasswordVisible) {
        const passwordValue = await passwordField.inputValue();
        if (!passwordValue) {
          logger6.debug("OIE two-step flow detected, password page loaded");
        }
      }
    } catch {
    }
    logger6.debug("Okta form submitted");
  },
  /**
   * Handle Okta MFA challenge
   */
  async handleMFA(page, mfaConfig) {
    if (mfaConfig.type !== "totp") {
      logger6.warn("Non-TOTP MFA type for Okta", { type: mfaConfig.type });
      if (mfaConfig.type === "push") {
        await handleOktaPushMfa(page, mfaConfig);
        return;
      }
      return;
    }
    const totpSelector = mfaConfig.totpInputSelector ?? DEFAULT_OKTA_SELECTORS.totpInput;
    const submitSelector = mfaConfig.totpSubmitSelector ?? DEFAULT_OKTA_SELECTORS.totpSubmit;
    logger6.debug("Handling Okta TOTP MFA");
    await page.waitForSelector(totpSelector, { state: "visible", timeout: 1e4 });
    if (!mfaConfig.totpSecretEnv) {
      throw new Error("TOTP secret environment variable not configured");
    }
    const code = generateTOTPCode(mfaConfig.totpSecretEnv);
    await page.fill(totpSelector, code);
    await page.click(submitSelector);
    logger6.debug("TOTP code submitted to Okta");
  },
  /**
   * Get default Okta selectors
   */
  getDefaultSelectors() {
    return { ...DEFAULT_OKTA_SELECTORS };
  }
};
async function handleOktaPushMfa(page, mfaConfig) {
  const timeout = mfaConfig.pushTimeoutMs ?? 3e4;
  logger6.info("Waiting for Okta Push approval", { timeoutMs: timeout });
  try {
    await page.waitForFunction(
      () => {
        const url = window.location.href;
        return !url.includes("/signin/verify") && !url.includes("/mfa/");
      },
      { timeout }
    );
  } catch {
    throw new Error(`Okta Push MFA approval timeout after ${timeout}ms`);
  }
}
function isOktaLoginPage(page) {
  const url = page.url();
  return url.includes(".okta.com") || url.includes(".oktapreview.com") || url.includes("/oauth2/") || url.includes("/login/login.htm");
}
async function getOktaErrorMessage(page) {
  const errorSelectors = [
    ".okta-form-infobox-error",
    ".o-form-error-container",
    ".error-box",
    '[data-se="o-form-error-container"]'
  ];
  for (const selector of errorSelectors) {
    try {
      const element = page.locator(selector);
      if (await element.isVisible({ timeout: 500 })) {
        return await element.textContent() ?? void 0;
      }
    } catch {
    }
  }
  return void 0;
}
async function isOktaFactorSelectionRequired(page) {
  const factorSelectors = [
    ".factor-list",
    '[data-se="factor-list"]',
    ".authenticator-verify-list"
  ];
  for (const selector of factorSelectors) {
    try {
      const element = page.locator(selector);
      if (await element.isVisible({ timeout: 500 })) {
        return true;
      }
    } catch {
    }
  }
  return false;
}

// auth/oidc/providers/generic.ts
var logger7 = createLogger("auth", "generic-idp");
var DEFAULT_GENERIC_SELECTORS = {
  // Common username/email input patterns
  username: [
    'input[type="email"]',
    'input[name="username"]',
    'input[name="email"]',
    'input[id*="username"]',
    'input[id*="email"]',
    'input[autocomplete="username"]'
  ].join(", "),
  // Common password input patterns
  password: [
    'input[type="password"]',
    'input[name="password"]',
    'input[id*="password"]',
    'input[autocomplete="current-password"]'
  ].join(", "),
  // Common submit button patterns
  submit: [
    'button[type="submit"]',
    'input[type="submit"]',
    'button:has-text("Sign in")',
    'button:has-text("Log in")',
    'button:has-text("Login")',
    'button:has-text("Submit")'
  ].join(", "),
  // Common TOTP input patterns
  totpInput: [
    'input[name*="otp"]',
    'input[name*="totp"]',
    'input[name*="code"]',
    'input[name*="token"]',
    'input[type="tel"][maxlength="6"]',
    'input[autocomplete="one-time-code"]'
  ].join(", "),
  // Common TOTP submit patterns
  totpSubmit: [
    'button[type="submit"]',
    'input[type="submit"]',
    'button:has-text("Verify")',
    'button:has-text("Submit")'
  ].join(", ")
};
var genericHandler = {
  idpType: "generic",
  /**
   * Fill credentials on generic IdP login page
   */
  async fillCredentials(page, credentials, selectors) {
    const { username: usernameSelector, password: passwordSelector } = {
      ...DEFAULT_GENERIC_SELECTORS,
      ...selectors
    };
    logger7.debug("Filling credentials on generic IdP");
    const usernameField = page.locator(usernameSelector).first();
    await usernameField.waitFor({ state: "visible", timeout: 1e4 });
    const passwordField = page.locator(passwordSelector).first();
    const isPasswordVisible = await passwordField.isVisible().catch(() => false);
    if (isPasswordVisible) {
      await usernameField.fill(credentials.username);
      await passwordField.fill(credentials.password);
      logger7.debug("Filled both username and password (single-page flow)");
    } else {
      await usernameField.fill(credentials.username);
      logger7.debug("Filled username (possible two-step flow)");
    }
  },
  /**
   * Submit the login form
   */
  async submitForm(page, selectors) {
    const { submit: submitSelector, password: passwordSelector } = {
      ...DEFAULT_GENERIC_SELECTORS,
      ...selectors
    };
    const submitButton = page.locator(submitSelector).first();
    await submitButton.click();
    await page.waitForLoadState("domcontentloaded", { timeout: 5e3 }).catch(() => {
    });
    try {
      const passwordField = page.locator(passwordSelector).first();
      const isPasswordVisible = await passwordField.isVisible({ timeout: 2e3 });
      if (isPasswordVisible) {
        const passwordValue = await passwordField.inputValue();
        if (!passwordValue) {
          logger7.debug("Two-step flow detected, password field now visible");
        }
      }
    } catch {
    }
    logger7.debug("Form submitted");
  },
  /**
   * Handle MFA challenge
   */
  async handleMFA(page, mfaConfig) {
    if (mfaConfig.type !== "totp") {
      logger7.warn("Non-TOTP MFA type for generic handler", { type: mfaConfig.type });
      return;
    }
    const totpSelector = mfaConfig.totpInputSelector ?? DEFAULT_GENERIC_SELECTORS.totpInput;
    const submitSelector = mfaConfig.totpSubmitSelector ?? DEFAULT_GENERIC_SELECTORS.totpSubmit;
    logger7.debug("Handling generic TOTP MFA");
    const totpField = page.locator(totpSelector).first();
    await totpField.waitFor({ state: "visible", timeout: 1e4 });
    if (!mfaConfig.totpSecretEnv) {
      throw new Error("TOTP secret environment variable not configured");
    }
    const code = generateTOTPCode(mfaConfig.totpSecretEnv);
    await totpField.fill(code);
    const submitButton = page.locator(submitSelector).first();
    await submitButton.click();
    logger7.debug("TOTP code submitted");
  },
  /**
   * Handle post-login prompts (generic - does nothing by default)
   */
  async handlePostLoginPrompts(_page, _selectors) {
    logger7.debug("No post-login prompt handling for generic IdP");
  },
  /**
   * Get default generic selectors
   */
  getDefaultSelectors() {
    return { ...DEFAULT_GENERIC_SELECTORS };
  }
};
function createGenericHandler(customSelectors) {
  const mergedSelectors = {
    ...DEFAULT_GENERIC_SELECTORS,
    ...customSelectors
  };
  return {
    idpType: "generic",
    async fillCredentials(page, credentials, selectors) {
      const finalSelectors = { ...mergedSelectors, ...selectors };
      return genericHandler.fillCredentials(page, credentials, finalSelectors);
    },
    async submitForm(page, selectors) {
      const finalSelectors = { ...mergedSelectors, ...selectors };
      return genericHandler.submitForm(page, finalSelectors);
    },
    async handleMFA(page, mfaConfig) {
      return genericHandler.handleMFA(page, mfaConfig);
    },
    async handlePostLoginPrompts(page, selectors) {
      const finalSelectors = { ...mergedSelectors, ...selectors };
      return genericHandler.handlePostLoginPrompts(page, finalSelectors);
    },
    getDefaultSelectors() {
      return { ...mergedSelectors };
    }
  };
}
function detectIdpType(page) {
  const url = page.url().toLowerCase();
  if (url.includes("keycloak") || url.includes("/auth/realms/")) {
    return "keycloak";
  }
  if (url.includes("login.microsoftonline.com") || url.includes("login.live.com")) {
    return "azure-ad";
  }
  if (url.includes(".okta.com") || url.includes(".oktapreview.com")) {
    return "okta";
  }
  if (url.includes("auth0.com")) {
    return "auth0";
  }
  return "generic";
}
async function getGenericErrorMessage(page) {
  const errorSelectors = [
    ".error",
    ".error-message",
    ".alert-danger",
    ".alert-error",
    '[role="alert"]',
    ".form-error",
    ".login-error"
  ];
  for (const selector of errorSelectors) {
    try {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 500 })) {
        return await element.textContent() ?? void 0;
      }
    } catch {
    }
  }
  return void 0;
}

// auth/providers/base.ts
var DEFAULT_AUTH_RETRY_OPTIONS = {
  maxRetries: 2,
  initialDelayMs: 1e3,
  maxDelayMs: 1e4,
  backoffMultiplier: 2,
  retryOnTimeout: true,
  retryOnNetworkError: true
};
var BaseAuthProvider = class {
  /**
   * Create a new base auth provider
   *
   * @param providerName - Name for logging (e.g., 'oidc', 'form', 'token')
   * @param retryOptions - Optional retry configuration override
   */
  constructor(providerName, retryOptions = {}) {
    /**
     * Logger instance for this provider
     */
    __publicField(this, "logger");
    /**
     * Retry options for authentication operations
     */
    __publicField(this, "retryOptions");
    /**
     * Provider name for logging
     */
    __publicField(this, "providerName");
    this.providerName = providerName;
    this.logger = createLogger("auth", providerName);
    this.retryOptions = {
      ...DEFAULT_AUTH_RETRY_OPTIONS,
      ...retryOptions
    };
  }
  /**
   * Attempt to refresh the session (optional)
   *
   * Default implementation returns false (refresh not supported).
   * Override in subclasses that support session refresh.
   *
   * @param page - Playwright Page object
   * @returns true if refresh succeeded, false if login required
   */
  refreshSession(_page) {
    this.logger.debug("Session refresh not supported by this provider");
    return Promise.resolve(false);
  }
  // ===========================================================================
  // Protected Helper Methods
  // ===========================================================================
  /**
   * Wait for successful navigation after login
   *
   * Waits for either a URL pattern or element selector to indicate success.
   *
   * @param page - Playwright Page
   * @param options - Success detection options
   */
  async waitForLoginSuccess(page, options) {
    const timeout = options.timeout ?? 5e3;
    if (options.url && options.selector) {
      await Promise.race([
        page.waitForURL(options.url, { timeout }),
        page.waitForSelector(options.selector, { timeout, state: "visible" })
      ]);
    } else if (options.url) {
      await page.waitForURL(options.url, { timeout });
    } else if (options.selector) {
      await page.waitForSelector(options.selector, { timeout, state: "visible" });
    } else {
      await page.waitForLoadState("networkidle", { timeout });
    }
  }
  /**
   * Fill a form field with retry on failure
   *
   * @param page - Playwright Page
   * @param selector - Field selector
   * @param value - Value to fill
   * @param options - Fill options
   */
  async fillField(page, selector, value, options = {}) {
    const timeout = options.timeout ?? 5e3;
    const clearFirst = options.clearFirst ?? true;
    const locator = page.locator(selector);
    await locator.waitFor({ state: "visible", timeout });
    if (clearFirst) {
      await locator.clear();
    }
    await locator.fill(value);
  }
  /**
   * Click an element with retry on failure
   *
   * @param page - Playwright Page
   * @param selector - Element selector
   * @param options - Click options
   */
  async clickElement(page, selector, options = {}) {
    const timeout = options.timeout ?? 5e3;
    const force = options.force ?? false;
    const locator = page.locator(selector);
    await locator.waitFor({ state: "visible", timeout });
    await locator.click({ force, timeout });
  }
  /**
   * Check if an element is visible on page
   *
   * @param page - Playwright Page
   * @param selector - Element selector
   * @param timeout - How long to check for visibility
   * @returns true if element is visible
   */
  async isElementVisible(page, selector, timeout = 1e3) {
    try {
      await page.waitForSelector(selector, { state: "visible", timeout });
      return true;
    } catch {
      return false;
    }
  }
  /**
   * Get the current page URL
   *
   * @param page - Playwright Page
   * @returns Current URL
   */
  getCurrentUrl(page) {
    return page.url();
  }
  /**
   * Check if current URL matches a pattern
   *
   * @param page - Playwright Page
   * @param pattern - URL pattern (string or RegExp)
   * @returns true if URL matches
   */
  urlMatches(page, pattern) {
    const url = this.getCurrentUrl(page);
    if (typeof pattern === "string") {
      return url.includes(pattern);
    }
    return pattern.test(url);
  }
  /**
   * Calculate delay for retry attempt using exponential backoff
   *
   * @param attempt - Current attempt number (0-indexed)
   * @returns Delay in milliseconds
   */
  calculateRetryDelay(attempt) {
    const baseDelay = this.retryOptions.initialDelayMs;
    const multiplier = this.retryOptions.backoffMultiplier;
    const maxDelay = this.retryOptions.maxDelayMs;
    const delay = baseDelay * Math.pow(multiplier, attempt);
    return Math.min(delay, maxDelay);
  }
  /**
   * Determine if an error should trigger a retry
   *
   * @param error - Error that occurred
   * @returns true if should retry
   */
  shouldRetry(error) {
    const message = error.message.toLowerCase();
    if (this.retryOptions.retryOnTimeout) {
      if (message.includes("timeout") || message.includes("timed out")) {
        return true;
      }
    }
    if (this.retryOptions.retryOnNetworkError) {
      if (message.includes("network") || message.includes("net::") || message.includes("econnrefused") || message.includes("enotfound")) {
        return true;
      }
    }
    return false;
  }
  /**
   * Sleep for a specified duration
   *
   * @param ms - Duration in milliseconds
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
};

// auth/providers/oidc.ts
var IDP_HANDLERS = {
  keycloak: keycloakHandler,
  "azure-ad": azureAdHandler,
  okta: oktaHandler,
  auth0: genericHandler,
  // Auth0 uses generic handler with Auth0-specific selectors
  generic: genericHandler
};
function getIdpHandler(idpType) {
  const handler = IDP_HANDLERS[idpType];
  if (!handler) {
    return genericHandler;
  }
  return handler;
}
var OIDCAuthProvider = class extends BaseAuthProvider {
  /**
   * Create OIDC auth provider
   *
   * @param config - OIDC configuration
   * @param retryOptions - Optional retry configuration
   */
  constructor(config, retryOptions = {}) {
    super(`oidc-${config.idpType}`, retryOptions);
    __publicField(this, "config");
    __publicField(this, "idpHandler");
    __publicField(this, "currentRole", "unknown");
    this.config = config;
    this.idpHandler = getIdpHandler(config.idpType);
  }
  /**
   * Set the role for error reporting
   *
   * @param role - Role name
   */
  setRole(role) {
    this.currentRole = role;
  }
  /**
   * Perform OIDC login with retry
   *
   * NFR-010: Retry authentication failures up to 2 times with exponential backoff
   * NFR-011: After retry exhaustion, fail with actionable error message
   * NFR-012: Log each retry attempt at warn level
   *
   * @param page - Playwright Page
   * @param credentials - User credentials
   * @throws ARTKAuthError on login failure
   */
  async login(page, credentials) {
    let lastError;
    for (let attempt = 0; attempt <= this.retryOptions.maxRetries; attempt++) {
      try {
        const result = await executeOIDCFlow(page, this.config, credentials, {
          idpHandler: this.idpHandler,
          role: this.currentRole
        });
        if (result.success) {
          this.logger.info("OIDC login successful", {
            role: this.currentRole,
            idpType: this.config.idpType,
            durationMs: result.durationMs,
            attempts: attempt + 1
          });
          return;
        }
        lastError = result.error ?? new ARTKAuthError(
          "OIDC login failed",
          this.currentRole,
          result.phase,
          void 0,
          "Check credentials and OIDC configuration"
        );
        if (attempt < this.retryOptions.maxRetries) {
          const delay = this.calculateRetryDelay(attempt);
          this.logger.warn(`OIDC login attempt ${attempt + 1} failed, retrying in ${delay}ms`, {
            role: this.currentRole,
            attempt: attempt + 1,
            maxRetries: this.retryOptions.maxRetries,
            delayMs: delay,
            error: lastError.message
          });
          await this.sleep(delay);
        }
      } catch (error) {
        if (error instanceof ARTKAuthError) {
          lastError = error;
        } else {
          lastError = new ARTKAuthError(
            error instanceof Error ? error.message : String(error),
            this.currentRole,
            "credentials"
          );
        }
        if (attempt < this.retryOptions.maxRetries && this.shouldRetry(lastError)) {
          const delay = this.calculateRetryDelay(attempt);
          this.logger.warn(`OIDC login error, retrying in ${delay}ms`, {
            role: this.currentRole,
            attempt: attempt + 1,
            delayMs: delay,
            error: lastError.message
          });
          await this.sleep(delay);
        }
      }
    }
    this.logger.error("OIDC login failed after all retries", {
      role: this.currentRole,
      maxRetries: this.retryOptions.maxRetries,
      error: lastError?.message
    });
    throw new ARTKAuthError(
      `OIDC login failed after ${this.retryOptions.maxRetries + 1} attempts: ${lastError?.message ?? "Unknown error"}`,
      this.currentRole,
      lastError?.phase ?? "credentials",
      lastError?.idpResponse,
      `Verify credentials for role "${this.currentRole}" are correct. Check OIDC configuration and IdP status.`
    );
  }
  /**
   * Check if current session is valid
   *
   * @param page - Playwright Page
   * @returns true if session is valid
   */
  async isSessionValid(page) {
    try {
      const currentUrl = page.url();
      if (currentUrl.includes(this.config.loginUrl)) {
        return false;
      }
      return await isOIDCSessionValid(page, this.config);
    } catch (error) {
      this.logger.debug("Session validation failed", {
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }
  /**
   * Attempt to refresh the session
   *
   * OIDC sessions are typically refreshed via silent renewal.
   * This method attempts a simple page refresh to trigger token refresh.
   *
   * @param page - Playwright Page
   * @returns true if session is still valid after refresh
   */
  async refreshSession(page) {
    try {
      this.logger.debug("Attempting OIDC session refresh");
      await page.reload({ waitUntil: "networkidle" });
      if (page.url().includes(this.config.loginUrl)) {
        this.logger.debug("Session refresh failed - redirected to login");
        return false;
      }
      const isValid = await this.isSessionValid(page);
      this.logger.debug("Session refresh result", { isValid });
      return isValid;
    } catch (error) {
      this.logger.warn("Session refresh error", {
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }
  /**
   * Perform logout
   *
   * @param page - Playwright Page
   */
  async logout(page) {
    this.logger.debug("Performing OIDC logout", { role: this.currentRole });
    try {
      const logoutConfig = this.config.logout;
      if (logoutConfig?.url) {
        await page.goto(logoutConfig.url, { waitUntil: "networkidle" });
        if (logoutConfig.idpLogout) {
          await page.waitForLoadState("networkidle", { timeout: 1e4 });
        }
      } else {
        const baseUrl = new URL(this.config.loginUrl).origin;
        const logoutUrls = [
          `${baseUrl}/logout`,
          `${baseUrl}/api/logout`,
          `${baseUrl}/auth/logout`
        ];
        for (const url of logoutUrls) {
          try {
            const response = await page.goto(url, { waitUntil: "networkidle", timeout: 5e3 });
            if (response?.ok()) {
              this.logger.debug("Logout successful", { url });
              return;
            }
          } catch {
          }
        }
        await page.context().clearCookies();
        this.logger.debug("Cleared cookies as logout fallback");
      }
    } catch (error) {
      this.logger.warn("Logout error", {
        error: error instanceof Error ? error.message : String(error)
      });
      await page.context().clearCookies();
    }
  }
  /**
   * Get the configured IdP handler
   */
  getIdpHandler() {
    return this.idpHandler;
  }
  /**
   * Get the OIDC configuration
   */
  getConfig() {
    return this.config;
  }
};
function createOIDCAuthProvider(config, retryOptions) {
  return new OIDCAuthProvider(config, retryOptions);
}

// auth/providers/form.ts
var DEFAULT_TIMEOUTS = {
  navigationMs: 3e4,
  successMs: 5e3
};
var FormAuthProvider = class extends BaseAuthProvider {
  /**
   * Create form auth provider
   *
   * @param config - Form auth configuration
   * @param retryOptions - Optional retry configuration
   */
  constructor(config, retryOptions = {}) {
    super("form", retryOptions);
    __publicField(this, "config");
    __publicField(this, "currentRole", "unknown");
    this.config = config;
  }
  /**
   * Set the role for error reporting
   */
  setRole(role) {
    this.currentRole = role;
  }
  /**
   * Perform form-based login
   *
   * @param page - Playwright Page
   * @param credentials - User credentials
   * @throws ARTKAuthError on login failure
   */
  async login(page, credentials) {
    let lastError;
    for (let attempt = 0; attempt <= this.retryOptions.maxRetries; attempt++) {
      try {
        await this.navigateToLogin(page);
        await this.fillCredentials(page, credentials);
        await this.submitForm(page);
        await this.waitForSuccess(page);
        this.logger.info("Form login successful", {
          role: this.currentRole,
          attempts: attempt + 1
        });
        return;
      } catch (error) {
        lastError = error instanceof ARTKAuthError ? error : new ARTKAuthError(
          error instanceof Error ? error.message : String(error),
          this.currentRole,
          "credentials"
        );
        if (attempt < this.retryOptions.maxRetries && this.shouldRetry(lastError)) {
          const delay = this.calculateRetryDelay(attempt);
          this.logger.warn(`Form login attempt ${attempt + 1} failed, retrying in ${delay}ms`, {
            role: this.currentRole,
            attempt: attempt + 1,
            delayMs: delay,
            error: lastError.message
          });
          await this.sleep(delay);
        }
      }
    }
    this.logger.error("Form login failed after all retries", {
      role: this.currentRole,
      maxRetries: this.retryOptions.maxRetries,
      error: lastError?.message
    });
    throw new ARTKAuthError(
      `Form login failed after ${this.retryOptions.maxRetries + 1} attempts: ${lastError?.message ?? "Unknown error"}`,
      this.currentRole,
      lastError?.phase ?? "credentials",
      void 0,
      `Verify credentials for role "${this.currentRole}" are correct. Check login URL and form selectors.`
    );
  }
  /**
   * Navigate to the login page
   */
  async navigateToLogin(page) {
    const timeout = this.config.timeouts?.navigationMs ?? DEFAULT_TIMEOUTS.navigationMs;
    this.logger.debug("Navigating to login page", { url: this.config.loginUrl });
    try {
      await page.goto(this.config.loginUrl, {
        waitUntil: "domcontentloaded",
        timeout
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new ARTKAuthError(
        `Failed to navigate to login page: ${message}`,
        this.currentRole,
        "navigation",
        void 0,
        `Verify the login URL is correct and accessible: ${this.config.loginUrl}`
      );
    }
  }
  /**
   * Fill credentials in the login form
   */
  async fillCredentials(page, credentials) {
    const { selectors } = this.config;
    this.logger.debug("Filling credentials");
    try {
      await this.fillField(page, selectors.username, credentials.username);
      await this.fillField(page, selectors.password, credentials.password);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new ARTKAuthError(
        `Failed to fill credentials: ${message}`,
        this.currentRole,
        "credentials",
        void 0,
        "Check that username and password selectors are correct"
      );
    }
  }
  /**
   * Submit the login form
   */
  async submitForm(page) {
    const { selectors } = this.config;
    this.logger.debug("Submitting login form");
    try {
      await this.clickElement(page, selectors.submit);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new ARTKAuthError(
        `Failed to submit login form: ${message}`,
        this.currentRole,
        "credentials",
        void 0,
        "Check that submit button selector is correct"
      );
    }
  }
  /**
   * Wait for successful login
   */
  async waitForSuccess(page) {
    const { success } = this.config;
    const timeout = success.timeout ?? DEFAULT_TIMEOUTS.successMs;
    this.logger.debug("Waiting for login success");
    try {
      await this.waitForLoginSuccess(page, {
        url: success.url,
        selector: success.selector,
        timeout
      });
    } catch (error) {
      const errorText = await this.detectLoginError(page);
      throw new ARTKAuthError(
        "Login failed - success condition not met",
        this.currentRole,
        "callback",
        errorText,
        "Verify credentials are correct and success URL/selector configuration"
      );
    }
  }
  /**
   * Detect login error messages on page
   */
  async detectLoginError(page) {
    const errorSelectors = [
      ".error-message",
      ".alert-danger",
      ".error",
      '[role="alert"]',
      ".login-error",
      "#error"
    ];
    for (const selector of errorSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 500 })) {
          return await element.textContent() ?? void 0;
        }
      } catch {
      }
    }
    return void 0;
  }
  /**
   * Check if current session is valid
   */
  async isSessionValid(page) {
    const { success } = this.config;
    const currentUrl = page.url();
    if (currentUrl.includes(this.config.loginUrl)) {
      return false;
    }
    if (success.url && !currentUrl.includes(success.url)) {
      return false;
    }
    if (success.selector) {
      try {
        await page.waitForSelector(success.selector, { state: "visible", timeout: 1e3 });
      } catch {
        return false;
      }
    }
    return true;
  }
  /**
   * Perform logout
   */
  async logout(page) {
    this.logger.debug("Performing form auth logout");
    const baseUrl = new URL(this.config.loginUrl).origin;
    const logoutUrls = [
      `${baseUrl}/logout`,
      `${baseUrl}/api/logout`,
      `${baseUrl}/signout`
    ];
    for (const url of logoutUrls) {
      try {
        const response = await page.goto(url, { waitUntil: "networkidle", timeout: 5e3 });
        if (response?.ok()) {
          this.logger.debug("Logout successful", { url });
          return;
        }
      } catch {
      }
    }
    await page.context().clearCookies();
    this.logger.debug("Cleared cookies as logout fallback");
  }
  /**
   * Get the form auth configuration
   */
  getConfig() {
    return this.config;
  }
};
function createFormAuthProvider(config, retryOptions) {
  return new FormAuthProvider(config, retryOptions);
}

// auth/providers/token.ts
var DEFAULT_TOKEN_CONFIG = {
  headerName: "Authorization",
  headerPrefix: "Bearer ",
  tokenField: "access_token",
  timeoutMs: 1e4,
  usernameField: "username",
  passwordField: "password"
};
var TOKEN_STORAGE_KEY = "artk_auth_token";
var TokenAuthProvider = class extends BaseAuthProvider {
  /**
   * Create token auth provider
   *
   * @param config - Token auth configuration
   * @param retryOptions - Optional retry configuration
   */
  constructor(config, retryOptions = {}) {
    super("token", retryOptions);
    __publicField(this, "config");
    __publicField(this, "currentRole", "unknown");
    __publicField(this, "cachedToken");
    this.config = config;
  }
  /**
   * Set the role for error reporting
   */
  setRole(role) {
    this.currentRole = role;
  }
  /**
   * Perform token-based login
   *
   * Acquires an access token from the token endpoint and stores it
   * in the browser's local storage for use by test fixtures.
   *
   * @param page - Playwright Page
   * @param credentials - User credentials
   * @throws ARTKAuthError on login failure
   */
  async login(page, credentials) {
    let lastError;
    for (let attempt = 0; attempt <= this.retryOptions.maxRetries; attempt++) {
      try {
        const token = await this.acquireToken(page, credentials);
        await this.storeToken(page, token);
        this.cachedToken = token;
        this.logger.info("Token login successful", {
          role: this.currentRole,
          attempts: attempt + 1
        });
        return;
      } catch (error) {
        lastError = error instanceof ARTKAuthError ? error : new ARTKAuthError(
          error instanceof Error ? error.message : String(error),
          this.currentRole,
          "credentials"
        );
        if (attempt < this.retryOptions.maxRetries && this.shouldRetry(lastError)) {
          const delay = this.calculateRetryDelay(attempt);
          this.logger.warn(`Token login attempt ${attempt + 1} failed, retrying in ${delay}ms`, {
            role: this.currentRole,
            attempt: attempt + 1,
            delayMs: delay,
            error: lastError.message
          });
          await this.sleep(delay);
        }
      }
    }
    this.logger.error("Token login failed after all retries", {
      role: this.currentRole,
      maxRetries: this.retryOptions.maxRetries,
      error: lastError?.message
    });
    throw new ARTKAuthError(
      `Token login failed after ${this.retryOptions.maxRetries + 1} attempts: ${lastError?.message ?? "Unknown error"}`,
      this.currentRole,
      lastError?.phase ?? "credentials",
      void 0,
      `Verify credentials for role "${this.currentRole}" are correct. Check token endpoint configuration.`
    );
  }
  /**
   * Acquire token from endpoint
   */
  async acquireToken(page, credentials) {
    const {
      tokenEndpoint,
      tokenField = DEFAULT_TOKEN_CONFIG.tokenField,
      timeoutMs = DEFAULT_TOKEN_CONFIG.timeoutMs,
      requestBody
    } = this.config;
    const usernameField = requestBody?.usernameField ?? DEFAULT_TOKEN_CONFIG.usernameField;
    const passwordField = requestBody?.passwordField ?? DEFAULT_TOKEN_CONFIG.passwordField;
    this.logger.debug("Acquiring token", { endpoint: tokenEndpoint });
    try {
      const body = {
        [usernameField]: credentials.username,
        [passwordField]: credentials.password,
        ...requestBody?.additionalFields
      };
      const response = await page.evaluate(
        async ({ endpoint, body: body2, timeout }) => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeout);
          try {
            const res = await fetch(endpoint, {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify(body2),
              signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (!res.ok) {
              const text = await res.text().catch(() => "");
              return { error: `HTTP ${res.status}: ${text}` };
            }
            return { data: await res.json() };
          } catch (e) {
            clearTimeout(timeoutId);
            return { error: e instanceof Error ? e.message : String(e) };
          }
        },
        { endpoint: tokenEndpoint, body, timeout: timeoutMs }
      );
      if (response.error) {
        throw new ARTKAuthError(
          `Token request failed: ${response.error}`,
          this.currentRole,
          "credentials",
          response.error,
          "Check credentials and token endpoint configuration"
        );
      }
      const token = response.data?.[tokenField];
      if (!token) {
        throw new ARTKAuthError(
          `Token not found in response (expected field: ${tokenField})`,
          this.currentRole,
          "callback",
          JSON.stringify(response.data).slice(0, 200),
          `Check that token endpoint returns token in "${tokenField}" field`
        );
      }
      return token;
    } catch (error) {
      if (error instanceof ARTKAuthError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new ARTKAuthError(
        `Token acquisition failed: ${message}`,
        this.currentRole,
        "credentials",
        void 0,
        "Check token endpoint URL and network connectivity"
      );
    }
  }
  /**
   * Store token in browser local storage
   */
  async storeToken(page, token) {
    const {
      headerName = DEFAULT_TOKEN_CONFIG.headerName,
      headerPrefix = DEFAULT_TOKEN_CONFIG.headerPrefix
    } = this.config;
    await page.evaluate(
      ({ key, token: token2, headerName: headerName2, headerPrefix: headerPrefix2 }) => {
        localStorage.setItem(key, JSON.stringify({
          token: token2,
          headerName: headerName2,
          headerPrefix: headerPrefix2,
          timestamp: Date.now()
        }));
      },
      { key: TOKEN_STORAGE_KEY, token, headerName, headerPrefix }
    );
    this.logger.debug("Token stored in local storage");
  }
  /**
   * Check if current session is valid
   */
  async isSessionValid(page) {
    try {
      const stored = await page.evaluate((key) => {
        const data = localStorage.getItem(key);
        if (!data) {
          return null;
        }
        return JSON.parse(data);
      }, TOKEN_STORAGE_KEY);
      if (!stored?.token) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }
  /**
   * Perform logout - clear stored token
   */
  async logout(page) {
    this.logger.debug("Performing token auth logout");
    await page.evaluate((key) => {
      localStorage.removeItem(key);
    }, TOKEN_STORAGE_KEY);
    this.cachedToken = void 0;
    this.logger.debug("Token cleared from local storage");
  }
  /**
   * Get the current cached token
   */
  getToken() {
    return this.cachedToken;
  }
  /**
   * Get the token auth configuration
   */
  getConfig() {
    return this.config;
  }
  /**
   * Get the authorization header value
   */
  getAuthHeader() {
    if (!this.cachedToken) {
      return void 0;
    }
    const prefix = this.config.headerPrefix ?? DEFAULT_TOKEN_CONFIG.headerPrefix;
    return `${prefix}${this.cachedToken}`;
  }
  /**
   * Get the header name for authorization
   */
  getHeaderName() {
    return this.config.headerName ?? DEFAULT_TOKEN_CONFIG.headerName;
  }
};
function createTokenAuthProvider(config, retryOptions) {
  return new TokenAuthProvider(config, retryOptions);
}
async function getStoredToken(page) {
  try {
    const stored = await page.evaluate((key) => {
      const data = localStorage.getItem(key);
      if (!data) {
        return null;
      }
      return JSON.parse(data);
    }, TOKEN_STORAGE_KEY);
    return stored ?? void 0;
  } catch {
    return void 0;
  }
}

// auth/providers/custom.ts
var CustomAuthProvider = class extends BaseAuthProvider {
  /**
   * Create a custom auth provider
   *
   * @param providerName - Name for logging
   * @param retryOptions - Retry configuration
   */
  constructor(providerName = "custom", retryOptions = {}) {
    super(providerName, retryOptions);
    __publicField(this, "currentRole", "unknown");
  }
  /**
   * Set the role for error reporting
   */
  setRole(role) {
    this.currentRole = role;
  }
  /**
   * Get the current role
   */
  getRole() {
    return this.currentRole;
  }
  // ===========================================================================
  // Interface Implementation (with retry)
  // ===========================================================================
  /**
   * Login with retry support
   *
   * Calls performLogin() with automatic retry on failure.
   */
  async login(page, credentials) {
    let lastError;
    for (let attempt = 0; attempt <= this.retryOptions.maxRetries; attempt++) {
      try {
        await this.performLogin(page, credentials);
        this.logger.info("Custom login successful", {
          role: this.currentRole,
          attempts: attempt + 1
        });
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < this.retryOptions.maxRetries && this.shouldRetry(lastError)) {
          const delay = this.calculateRetryDelay(attempt);
          this.logger.warn(`Custom login attempt ${attempt + 1} failed, retrying in ${delay}ms`, {
            role: this.currentRole,
            attempt: attempt + 1,
            delayMs: delay,
            error: lastError.message
          });
          await this.sleep(delay);
        }
      }
    }
    this.logger.error("Custom login failed after all retries", {
      role: this.currentRole,
      maxRetries: this.retryOptions.maxRetries,
      error: lastError?.message
    });
    throw lastError;
  }
  /**
   * Check session validity
   */
  async isSessionValid(page) {
    try {
      return await this.checkSessionValidity(page);
    } catch (error) {
      this.logger.debug("Session validation error", {
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }
  /**
   * Perform logout
   */
  async logout(page) {
    try {
      await this.performLogout(page);
      this.logger.debug("Custom logout completed");
    } catch (error) {
      this.logger.warn("Custom logout error", {
        error: error instanceof Error ? error.message : String(error)
      });
      await page.context().clearCookies();
    }
  }
};
var ExampleCustomAuthProvider = class extends CustomAuthProvider {
  constructor(options) {
    super("example-custom");
    __publicField(this, "loginUrl");
    __publicField(this, "successUrl");
    this.loginUrl = options.loginUrl;
    this.successUrl = options.successUrl;
  }
  async performLogin(page, credentials) {
    await page.goto(this.loginUrl);
    await page.fill('input[name="username"]', credentials.username);
    await page.fill('input[name="password"]', credentials.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(this.successUrl);
  }
  async checkSessionValidity(page) {
    return Promise.resolve(!page.url().includes(this.loginUrl));
  }
  async performLogout(page) {
    await page.goto(`${new URL(this.loginUrl).origin}/logout`);
  }
};
var logger8 = createLogger("auth", "setup-factory");
var DEFAULT_AUTH_SETUP_OPTIONS = {
  outputDir: DEFAULT_STORAGE_STATE_CONFIG.directory,
  filePattern: DEFAULT_STORAGE_STATE_CONFIG.filePattern};
function createAuthSetup(role, authConfig, _options = {}) {
  logger8.debug("Creating auth setup for role", { role });
  const roleConfig = authConfig.roles[role];
  if (!roleConfig) {
    throw new Error(`Role "${role}" not found in auth configuration`);
  }
  const projectName = `auth-setup-${role}`;
  return {
    name: projectName,
    testMatch: "**/auth.setup.ts",
    setup: `auth/setup/${role}.setup.ts`
  };
}
function createAllAuthSetups(authConfig, options = {}) {
  const roles = Object.keys(authConfig.roles);
  logger8.debug("Creating auth setups for all roles", { roles });
  return roles.map((role) => createAuthSetup(role, authConfig, options));
}
function generateAuthSetupCode(role, authConfig) {
  const roleConfig = authConfig.roles[role];
  if (!roleConfig) {
    throw new Error(`Role "${role}" not found in auth configuration`);
  }
  return `/**
 * Auth Setup for role: ${role}
 *
 * This file is auto-generated by ARTK.
 * It runs before browser tests to establish an authenticated session.
 */

import { chromium } from '@playwright/test';
import {
  getCredentials,
  saveStorageState,
  loadStorageState,
  cleanupExpiredStorageStates,
  createAuthProviderFromConfig,
} from '@artk/core/auth';
import { loadConfig } from '@artk/core/config';

async function setup() {
  // Load configuration
  const config = await loadConfig();

  // Cleanup expired storage states (NFR-007)
  await cleanupExpiredStorageStates();

  // Check for valid existing storage state
  const existingState = await loadStorageState('${role}', {
    directory: config.auth.storageState.directory,
    maxAgeMinutes: config.auth.storageState.maxAgeMinutes,
  });

  if (existingState) {
    console.log('Reusing existing storage state for role: ${role}');
    return;
  }

  console.log('Authenticating for role: ${role}');

  // Get credentials
  const credentials = getCredentials('${role}', config.auth);

  // Create auth provider
  const provider = createAuthProviderFromConfig(config.auth, '${role}');

  // Launch browser
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Perform login
    await provider.login(page, credentials);

    // Save storage state
    await saveStorageState(context, '${role}', {
      directory: config.auth.storageState.directory,
      filePattern: config.auth.storageState.filePattern,
    });

    console.log('Authentication successful for role: ${role}');
  } finally {
    await browser.close();
  }
}

export default setup;
`;
}
function generateAuthProjects(config) {
  const authConfig = config.auth;
  const roles = Object.keys(authConfig.roles);
  return roles.map((role) => ({
    name: `auth-setup-${role}`,
    testMatch: /auth\.setup\.ts$/,
    metadata: {
      role,
      storageStatePath: getStorageStatePath2(role, {
        outputDir: authConfig.storageState.directory,
        filePattern: authConfig.storageState.filePattern
      })
    }
  }));
}
function getStorageStatePath2(role, options) {
  const directory = options.outputDir ?? DEFAULT_AUTH_SETUP_OPTIONS.outputDir;
  const pattern = options.filePattern ?? DEFAULT_AUTH_SETUP_OPTIONS.filePattern;
  const filename = pattern.replace("{role}", role).replace("{env}", "default");
  return path__namespace.join(directory, filename.endsWith(".json") ? filename : `${filename}.json`);
}
function createAuthProviderFromConfig(authConfig, role) {
  const roleConfig = authConfig.roles[role];
  if (!roleConfig) {
    throw new Error(`Role "${role}" not found in auth configuration`);
  }
  const providerType = authConfig.provider;
  switch (providerType) {
    case "oidc": {
      return {
        type: "oidc",
        role,
        config: authConfig.oidc,
        roleOverrides: roleConfig.oidcOverrides
      };
    }
    case "form": {
      return {
        type: "form",
        role,
        config: authConfig.form
      };
    }
    case "token": {
      return {
        type: "token",
        role
        // Token config would be in a similar structure
      };
    }
    case "custom": {
      return {
        type: "custom",
        role
      };
    }
    default:
      throw new Error(`Unknown auth provider type: ${providerType}`);
  }
}
function getRoleNames(authConfig) {
  return Object.keys(authConfig.roles);
}
function getStorageStateDirectory2(authConfig, projectRoot = process.cwd()) {
  return path__namespace.join(projectRoot, authConfig.storageState.directory);
}
function hasRole(role, authConfig) {
  return role in authConfig.roles;
}
function getRoleConfig(role, authConfig) {
  return authConfig.roles[role];
}

exports.ARTKAuthError = ARTKAuthError;
exports.ARTKStorageStateError = ARTKStorageStateError;
exports.BaseAuthProvider = BaseAuthProvider;
exports.CLEANUP_MAX_AGE_MS = CLEANUP_MAX_AGE_MS;
exports.CustomAuthProvider = CustomAuthProvider;
exports.DEFAULT_AUTH_RETRY_OPTIONS = DEFAULT_AUTH_RETRY_OPTIONS;
exports.DEFAULT_STORAGE_STATE_CONFIG = DEFAULT_STORAGE_STATE_CONFIG;
exports.ExampleCustomAuthProvider = ExampleCustomAuthProvider;
exports.FormAuthProvider = FormAuthProvider;
exports.OIDCAuthProvider = OIDCAuthProvider;
exports.TokenAuthProvider = TokenAuthProvider;
exports.azureAdHandler = azureAdHandler;
exports.cleanupExpiredStorageStates = cleanupExpiredStorageStates;
exports.cleanupStorageStatesOlderThan = cleanupStorageStatesOlderThan;
exports.clearStorageState = clearStorageState;
exports.createAllAuthSetups = createAllAuthSetups;
exports.createAuthProviderFromConfig = createAuthProviderFromConfig;
exports.createAuthSetup = createAuthSetup;
exports.createFormAuthProvider = createFormAuthProvider;
exports.createGenericHandler = createGenericHandler;
exports.createOIDCAuthProvider = createOIDCAuthProvider;
exports.createTokenAuthProvider = createTokenAuthProvider;
exports.detectIdpType = detectIdpType;
exports.executeOIDCFlow = executeOIDCFlow;
exports.formatMissingCredentialsError = formatMissingCredentialsError;
exports.generateAuthProjects = generateAuthProjects;
exports.generateAuthSetupCode = generateAuthSetupCode;
exports.generateTOTPCode = generateTOTPCode;
exports.genericHandler = genericHandler;
exports.getAzureAdErrorMessage = getAzureAdErrorMessage;
exports.getCredentials = getCredentials;
exports.getCredentialsFromRoleConfig = getCredentialsFromRoleConfig;
exports.getGenericErrorMessage = getGenericErrorMessage;
exports.getIdpHandler = getIdpHandler;
exports.getKeycloakErrorMessage = getKeycloakErrorMessage;
exports.getOktaErrorMessage = getOktaErrorMessage;
exports.getRoleConfig = getRoleConfig;
exports.getRoleFromPath = getRoleFromPath;
exports.getRoleNames = getRoleNames;
exports.getStorageStateDirectory = getStorageStateDirectory2;
exports.getStorageStateMetadata = getStorageStateMetadata;
exports.getStoredToken = getStoredToken;
exports.getTimeUntilNextTOTPWindow = getTimeUntilNextTOTPWindow;
exports.hasCredentials = hasCredentials;
exports.hasRole = hasRole;
exports.isAzureAdLoginPage = isAzureAdLoginPage;
exports.isAzureAdMfaRequired = isAzureAdMfaRequired;
exports.isKeycloakLoginPage = isKeycloakLoginPage;
exports.isOIDCSessionValid = isOIDCSessionValid;
exports.isOktaFactorSelectionRequired = isOktaFactorSelectionRequired;
exports.isOktaLoginPage = isOktaLoginPage;
exports.isStorageStateValid = isStorageStateValid;
exports.keycloakHandler = keycloakHandler;
exports.listStorageStates = listStorageStates;
exports.loadStorageState = loadStorageState;
exports.oktaHandler = oktaHandler;
exports.readStorageState = readStorageState;
exports.saveStorageState = saveStorageState;
exports.validateCredentials = validateCredentials;
exports.verifyTOTPCode = verifyTOTPCode;
exports.waitForFreshTOTPWindow = waitForFreshTOTPWindow;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map