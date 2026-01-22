'use strict';

var zod = require('zod');
var fs$1 = require('fs');
var path = require('path');
var yaml = require('yaml');
var test$1 = require('@playwright/test');
var fs = require('fs/promises');
var otplib = require('otplib');
var crypto = require('crypto');
var child_process = require('child_process');
var util = require('util');

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

var path__namespace = /*#__PURE__*/_interopNamespace(path);
var fs__namespace = /*#__PURE__*/_interopNamespace(fs);

var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// errors/config-error.ts
exports.ARTKConfigError = void 0;
var init_config_error = __esm({
  "errors/config-error.ts"() {
    exports.ARTKConfigError = class _ARTKConfigError extends Error {
      /**
       * JSON path to the invalid field (e.g., 'auth.oidc.idpType')
       */
      field;
      /**
       * Optional suggestion for fixing the error
       */
      suggestion;
      constructor(message, field, suggestion) {
        super(message);
        this.name = "ARTKConfigError";
        this.field = field;
        this.suggestion = suggestion;
        if (Error.captureStackTrace) {
          Error.captureStackTrace(this, _ARTKConfigError);
        }
      }
      /**
       * Format error as a human-readable string with field path and suggestion
       */
      toString() {
        let result = `${this.name}: ${this.message} (field: ${this.field})`;
        if (this.suggestion) {
          result += `
  Suggestion: ${this.suggestion}`;
        }
        return result;
      }
    };
  }
});

// utils/logger.ts
function formatPretty(entry) {
  const time = entry.timestamp.split("T")[1]?.split(".")[0] || "00:00:00";
  const level = entry.level.toUpperCase().padEnd(5);
  const context = entry.context ? ` ${JSON.stringify(entry.context)}` : "";
  return `[${time}] ${level} [${entry.module}] ${entry.message}${context}`;
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
var LOG_LEVELS, globalConfig;
var init_logger = __esm({
  "utils/logger.ts"() {
    LOG_LEVELS = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
    globalConfig = {
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
  }
});

// errors/auth-error.ts
exports.ARTKAuthError = void 0;
var init_auth_error = __esm({
  "errors/auth-error.ts"() {
    exports.ARTKAuthError = class _ARTKAuthError extends Error {
      /**
       * Role that failed to authenticate
       */
      role;
      /**
       * Phase where authentication failed
       */
      phase;
      /**
       * Optional IdP response or error message
       */
      idpResponse;
      /**
       * Optional remediation steps to fix the error
       */
      remediation;
      constructor(message, role, phase, idpResponse, remediation) {
        super(message);
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
  }
});

// auth/credentials.ts
function getCredentials(role, authConfig, options = {}) {
  const env = options.env ?? process.env;
  const maskPassword = options.maskPassword ?? true;
  logger.debug("Getting credentials for role", { role });
  const roleConfig = authConfig.roles[role];
  if (!roleConfig) {
    const availableRoles = Object.keys(authConfig.roles).join(", ");
    logger.error("Role not found in configuration", { role, availableRoles });
    throw new exports.ARTKAuthError(
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
    throw new exports.ARTKAuthError(
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
    throw new exports.ARTKAuthError(
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
function validateCredentialsConfig(roles, env = process.env) {
  const missingVars = [];
  for (const [roleName, roleConfig] of Object.entries(roles)) {
    const { username, password } = roleConfig.credentialsEnv;
    if (!env[username]) {
      missingVars.push(`${username} (for role '${roleName}')`);
    }
    if (!env[password]) {
      missingVars.push(`${password} (for role '${roleName}')`);
    }
  }
  if (missingVars.length > 0) {
    throw new exports.ARTKAuthError(
      `Missing required environment variables:
` + missingVars.map((v) => `  - ${v}`).join("\n") + `

Set these variables before running tests.`,
      "credentials",
      "credentials",
      void 0,
      "Export the missing environment variables or set them in your .env file"
    );
  }
  logger.debug("All credential environment variables validated", {
    roleCount: Object.keys(roles).length
  });
}
var logger;
var init_credentials = __esm({
  "auth/credentials.ts"() {
    init_auth_error();
    init_logger();
    logger = createLogger("auth", "credentials");
  }
});

// config/env.ts
function findEnvVarRefs(value) {
  const refs = [];
  const pattern = /\$\{([A-Z_][A-Z0-9_]*)(:-([^}]*))?\}/gi;
  let match;
  while ((match = pattern.exec(value)) !== null) {
    const varName = match[1];
    if (varName === void 0) {
      continue;
    }
    refs.push({
      match: match[0],
      varName,
      defaultValue: match[3],
      hasDefault: match[2] !== void 0
    });
  }
  return refs;
}
function resolveEnvVarRef(ref, options = {}) {
  const { env = process.env, fieldPath, throwOnMissing = true } = options;
  const value = env[ref.varName];
  if (value !== void 0 && value !== "") {
    logger2.debug(`Resolved env var ${ref.varName}`, {
      fieldPath,
      hasValue: true
    });
    return value;
  }
  if (ref.hasDefault && ref.defaultValue !== void 0) {
    logger2.debug(`Using default for ${ref.varName}`, {
      fieldPath,
      defaultValue: ref.defaultValue
    });
    return ref.defaultValue;
  }
  if (throwOnMissing) {
    throw new EnvVarNotFoundError(ref.varName, fieldPath);
  }
  return ref.match;
}
function resolveEnvVars(value, options = {}) {
  const refs = findEnvVarRefs(value);
  if (refs.length === 0) {
    return value;
  }
  let result = value;
  for (const ref of refs) {
    const resolved = resolveEnvVarRef(ref, options);
    result = result.replace(ref.match, resolved);
  }
  return result;
}
function resolveEnvVarsInObject(obj, options = {}, currentPath = "") {
  if (obj === null || obj === void 0) {
    return obj;
  }
  if (typeof obj === "string") {
    return resolveEnvVars(obj, {
      ...options,
      fieldPath: currentPath || options.fieldPath
    });
  }
  if (Array.isArray(obj)) {
    const resolved = obj.map(
      (item, index) => resolveEnvVarsInObject(item, options, `${currentPath}[${index}]`)
    );
    return resolved;
  }
  if (typeof obj === "object") {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      const path5 = currentPath ? `${currentPath}.${key}` : key;
      result[key] = resolveEnvVarsInObject(value, options, path5);
    }
    return result;
  }
  return obj;
}
function getMissingEnvVars(value, env = process.env) {
  const missing = [];
  function check(val, path5) {
    if (typeof val === "string") {
      const refs = findEnvVarRefs(val);
      for (const ref of refs) {
        if (!ref.hasDefault && (env[ref.varName] === void 0 || env[ref.varName] === "")) {
          missing.push({ varName: ref.varName, fieldPath: path5 });
        }
      }
    } else if (Array.isArray(val)) {
      val.forEach((item, index) => check(item, `${path5}[${index}]`));
    } else if (val !== null && typeof val === "object") {
      for (const [key, childVal] of Object.entries(val)) {
        check(childVal, path5 ? `${path5}.${key}` : key);
      }
    }
  }
  check(value, "");
  return missing;
}
function createMissingEnvVarsError(missing) {
  const varNames = [...new Set(missing.map((m) => m.varName))];
  const fieldPaths = missing.map((m) => m.fieldPath);
  const firstMissing = missing[0];
  const message = missing.length === 1 && firstMissing ? `Missing required environment variable: ${firstMissing.varName}` : `Missing required environment variables: ${varNames.join(", ")}`;
  const suggestion = missing.length === 1 && firstMissing ? `Set the ${firstMissing.varName} environment variable or provide a default value using \${${firstMissing.varName}:-default}` : `Set these environment variables or provide default values using \${VAR:-default} syntax`;
  return new exports.ARTKConfigError(message, fieldPaths.join(", "), suggestion);
}
var logger2, EnvVarNotFoundError;
var init_env = __esm({
  "config/env.ts"() {
    init_config_error();
    init_logger();
    logger2 = createLogger("config", "envResolver");
    EnvVarNotFoundError = class _EnvVarNotFoundError extends Error {
      constructor(varName, fieldPath) {
        super(`Environment variable "${varName}" is not defined`);
        this.varName = varName;
        this.fieldPath = fieldPath;
        this.name = "EnvVarNotFoundError";
        if (Error.captureStackTrace) {
          Error.captureStackTrace(this, _EnvVarNotFoundError);
        }
      }
    };
  }
});

// config/timeouts.ts
var TIMEOUTS;
var init_timeouts = __esm({
  "config/timeouts.ts"() {
    TIMEOUTS = {
      // =============================================================================
      // Authentication Timeouts
      // =============================================================================
      /** Navigation timeout for auth pages */
      AUTH_NAVIGATION_MS: 3e4,
      /** Timeout for submitting credentials */
      AUTH_SUBMIT_MS: 1e4,
      /** Timeout for detecting successful authentication */
      AUTH_SUCCESS_MS: 5e3,
      /** Timeout for MFA push notification approval */
      AUTH_MFA_PUSH_MS: 6e4,
      /** Total timeout for complete login flow */
      AUTH_LOGIN_FLOW_MS: 3e4,
      /** Timeout for IdP redirect */
      AUTH_IDP_REDIRECT_MS: 1e4,
      /** Timeout for OAuth callback processing */
      AUTH_CALLBACK_MS: 5e3,
      // =============================================================================
      // OIDC Specific Timeouts
      // =============================================================================
      /** Timeout for OIDC success URL detection */
      OIDC_SUCCESS_MS: 5e3,
      // =============================================================================
      // Assertion Timeouts
      // =============================================================================
      /** Default timeout for toast notifications */
      TOAST_DEFAULT_MS: 5e3,
      /** Default timeout for loading indicators */
      LOADING_DEFAULT_MS: 3e4,
      /** Default timeout for form validation */
      FORM_VALIDATION_MS: 5e3,
      // =============================================================================
      // API Timeouts
      // =============================================================================
      /** Timeout for API requests */
      API_REQUEST_MS: 3e4,
      /** Timeout for acquiring tokens */
      TOKEN_ACQUIRE_MS: 1e4
    };
  }
});

// config/defaults.ts
var DEFAULT_APP_TYPE, DEFAULT_STORAGE_STATE, DEFAULT_OIDC_SUCCESS_TIMEOUT, DEFAULT_MFA_TYPE, DEFAULT_MFA_ENABLED, DEFAULT_PUSH_TIMEOUT_MS, DEFAULT_LOGIN_FLOW_MS, DEFAULT_IDP_REDIRECT_MS, DEFAULT_CALLBACK_MS, DEFAULT_LOCATOR_STRATEGY, DEFAULT_TEST_ID_ATTRIBUTE, DEFAULT_TOAST_TIMEOUT, DEFAULT_LOADING_TIMEOUT, DEFAULT_ASSERTIONS, DEFAULT_NAMESPACE_PREFIX, DEFAULT_NAMESPACE_SUFFIX, DEFAULT_DATA, DEFAULT_TIERS, DEFAULT_REPORTER_OPEN, DEFAULT_REPORTERS, DEFAULT_SCREENSHOT_MODE, DEFAULT_CAPTURE_MODE, DEFAULT_ARTIFACTS, DEFAULT_VIEWPORT_WIDTH, DEFAULT_VIEWPORT_HEIGHT, DEFAULT_BROWSERS, DEFAULT_JOURNEY_ID_PREFIX, DEFAULT_JOURNEY_ID_WIDTH, DEFAULT_JOURNEYS, SUPPORTED_CONFIG_VERSION;
var init_defaults = __esm({
  "config/defaults.ts"() {
    init_timeouts();
    DEFAULT_APP_TYPE = "spa";
    DEFAULT_STORAGE_STATE = {
      directory: ".auth-states",
      maxAgeMinutes: 60,
      filePattern: "{role}.json"
    };
    DEFAULT_OIDC_SUCCESS_TIMEOUT = TIMEOUTS.OIDC_SUCCESS_MS;
    DEFAULT_MFA_TYPE = "none";
    DEFAULT_MFA_ENABLED = false;
    DEFAULT_PUSH_TIMEOUT_MS = TIMEOUTS.AUTH_MFA_PUSH_MS;
    DEFAULT_LOGIN_FLOW_MS = TIMEOUTS.AUTH_LOGIN_FLOW_MS;
    DEFAULT_IDP_REDIRECT_MS = TIMEOUTS.AUTH_IDP_REDIRECT_MS;
    DEFAULT_CALLBACK_MS = TIMEOUTS.AUTH_CALLBACK_MS;
    DEFAULT_LOCATOR_STRATEGY = [
      "role",
      "label",
      "placeholder",
      "testid",
      "text",
      "css"
    ];
    DEFAULT_TEST_ID_ATTRIBUTE = "data-testid";
    DEFAULT_TOAST_TIMEOUT = TIMEOUTS.TOAST_DEFAULT_MS;
    DEFAULT_LOADING_TIMEOUT = TIMEOUTS.LOADING_DEFAULT_MS;
    DEFAULT_ASSERTIONS = {
      toast: {
        containerSelector: '[role="alert"], .toast, .notification',
        messageSelector: ".toast-message, .notification-message",
        typeAttribute: "data-type",
        timeout: DEFAULT_TOAST_TIMEOUT
      },
      loading: {
        selectors: [".loading", ".spinner", '[data-loading="true"]'],
        timeout: DEFAULT_LOADING_TIMEOUT
      },
      form: {
        errorSelector: '[data-error="{field}"], .field-error[data-field="{field}"]',
        formErrorSelector: '.form-error, [role="alert"].form-error'
      }
    };
    DEFAULT_NAMESPACE_PREFIX = "[artk-";
    DEFAULT_NAMESPACE_SUFFIX = "]";
    DEFAULT_DATA = {
      namespace: {
        prefix: DEFAULT_NAMESPACE_PREFIX,
        suffix: DEFAULT_NAMESPACE_SUFFIX
      },
      cleanup: {
        enabled: true,
        onFailure: true,
        parallel: false
      }
    };
    DEFAULT_TIERS = {
      smoke: {
        retries: 0,
        workers: 1,
        timeout: 3e4,
        tag: "@smoke"
      },
      release: {
        retries: 1,
        workers: 2,
        timeout: 6e4,
        tag: "@release"
      },
      regression: {
        retries: 2,
        workers: 4,
        timeout: 12e4,
        tag: "@regression"
      }
    };
    DEFAULT_REPORTER_OPEN = "on-failure";
    DEFAULT_REPORTERS = {
      html: {
        enabled: true,
        outputFolder: "playwright-report",
        open: DEFAULT_REPORTER_OPEN
      },
      json: {
        enabled: false,
        outputFile: "test-results.json"
      },
      junit: {
        enabled: false,
        outputFile: "junit.xml"
      },
      artk: {
        enabled: true,
        outputFile: "artk-report.json",
        includeJourneyMapping: true
      }
    };
    DEFAULT_SCREENSHOT_MODE = "only-on-failure";
    DEFAULT_CAPTURE_MODE = "retain-on-failure";
    DEFAULT_ARTIFACTS = {
      outputDir: "test-results",
      screenshots: {
        mode: DEFAULT_SCREENSHOT_MODE,
        fullPage: true,
        maskPii: false,
        piiSelectors: [
          // Common PII input patterns
          'input[type="password"]',
          'input[name*="ssn"]',
          'input[name*="social"]',
          'input[name*="credit"]',
          'input[name*="card"]',
          'input[name*="cvv"]',
          'input[name*="account"]',
          'input[autocomplete="cc-number"]',
          'input[autocomplete="cc-csc"]',
          // Data attribute markers
          "[data-pii]",
          "[data-sensitive]",
          "[data-mask]",
          // Common class patterns
          ".pii-field",
          ".sensitive-data"
        ]
      },
      video: {
        mode: DEFAULT_CAPTURE_MODE
      },
      trace: {
        mode: DEFAULT_CAPTURE_MODE,
        screenshots: true,
        snapshots: true
      }
    };
    DEFAULT_VIEWPORT_WIDTH = 1280;
    DEFAULT_VIEWPORT_HEIGHT = 720;
    DEFAULT_BROWSERS = {
      enabled: ["chromium"],
      channel: "bundled",
      strategy: "auto",
      viewport: {
        width: DEFAULT_VIEWPORT_WIDTH,
        height: DEFAULT_VIEWPORT_HEIGHT
      },
      headless: true
    };
    DEFAULT_JOURNEY_ID_PREFIX = "JRN";
    DEFAULT_JOURNEY_ID_WIDTH = 4;
    DEFAULT_JOURNEYS = {
      id: {
        prefix: DEFAULT_JOURNEY_ID_PREFIX,
        width: DEFAULT_JOURNEY_ID_WIDTH
      },
      layout: "flat",
      backlog: {
        groupBy: "tier"
      }
    };
    SUPPORTED_CONFIG_VERSION = 1;
  }
});
var CURRENT_CONFIG_VERSION, nonEmptyString, positiveInt, nonNegativeInt, positiveNumber, AppTypeSchema, AppConfigSchema, EnvironmentConfigSchema, EnvironmentsSchema, StorageStateConfigSchema, CredentialsEnvConfigSchema, OIDCIdpTypeSchema, MFATypeSchema, OIDCSuccessConfigSchema, OIDCIdpSelectorsSchema, MFAConfigSchema, OIDCTimeoutsSchema, OIDCLogoutConfigSchema, OIDCConfigSchema, FormAuthSelectorsSchema, FormAuthSuccessConfigSchema, FormAuthConfigSchema, RoleConfigSchema, RolesSchema, AuthProviderTypeSchema, AuthBypassModeSchema, AuthBypassConfigSchema, AuthConfigSchema, LocatorStrategySchema, SelectorsConfigSchema, ToastAssertionConfigSchema, LoadingAssertionConfigSchema, FormAssertionConfigSchema, AssertionsConfigSchema, NamespaceConfigSchema, CleanupConfigSchema, DataApiConfigSchema, DataConfigSchema, FixturesApiConfigSchema, FixturesConfigSchema, TierConfigSchema, TiersSchema, ReporterOpenModeSchema, HtmlReporterConfigSchema, JsonReporterConfigSchema, JunitReporterConfigSchema, ArtkReporterConfigSchema, ReportersConfigSchema, ScreenshotModeSchema, CaptureModeSchema, VideoSizeSchema, ScreenshotsConfigSchema, VideoConfigSchema, TraceConfigSchema, ArtifactsConfigSchema, BrowserTypeSchema, BrowserChannelSchema, BrowserStrategySchema, ViewportSizeSchema, BrowsersConfigSchema, JourneyLayoutSchema, JourneyGroupBySchema, JourneyIdConfigSchema, JourneyBacklogConfigSchema, JourneysConfigSchema, ARTKConfigSchema;
var init_schema = __esm({
  "config/schema.ts"() {
    init_defaults();
    CURRENT_CONFIG_VERSION = SUPPORTED_CONFIG_VERSION;
    nonEmptyString = zod.z.string().min(1, "Must not be empty");
    positiveInt = zod.z.number().int().positive();
    nonNegativeInt = zod.z.number().int().nonnegative();
    positiveNumber = zod.z.number().positive();
    AppTypeSchema = zod.z.enum(["spa", "ssr", "hybrid"]);
    AppConfigSchema = zod.z.object({
      name: nonEmptyString.describe("Application name"),
      baseUrl: nonEmptyString.describe("Base URL with env var support"),
      type: AppTypeSchema.default(DEFAULT_APP_TYPE)
    });
    EnvironmentConfigSchema = zod.z.object({
      baseUrl: nonEmptyString.describe("Environment base URL"),
      apiUrl: zod.z.string().optional()
    });
    EnvironmentsSchema = zod.z.record(zod.z.string(), EnvironmentConfigSchema);
    StorageStateConfigSchema = zod.z.object({
      directory: zod.z.string().default(DEFAULT_STORAGE_STATE.directory),
      maxAgeMinutes: positiveNumber.default(DEFAULT_STORAGE_STATE.maxAgeMinutes),
      filePattern: nonEmptyString.default(DEFAULT_STORAGE_STATE.filePattern)
    });
    CredentialsEnvConfigSchema = zod.z.object({
      username: nonEmptyString.describe("Env var name for username"),
      password: nonEmptyString.describe("Env var name for password")
    });
    OIDCIdpTypeSchema = zod.z.enum([
      "keycloak",
      "azure-ad",
      "okta",
      "auth0",
      "generic"
    ]);
    MFATypeSchema = zod.z.enum(["totp", "push", "sms", "none"]);
    OIDCSuccessConfigSchema = zod.z.object({
      url: zod.z.string().optional(),
      selector: zod.z.string().optional(),
      timeout: positiveInt.default(DEFAULT_OIDC_SUCCESS_TIMEOUT)
    }).refine((data) => data.url !== void 0 || data.selector !== void 0, {
      message: "Either success.url or success.selector is required"
    });
    OIDCIdpSelectorsSchema = zod.z.object({
      username: zod.z.string().optional(),
      password: zod.z.string().optional(),
      submit: zod.z.string().optional(),
      staySignedInNo: zod.z.string().optional()
    }).optional();
    MFAConfigSchema = zod.z.object({
      enabled: zod.z.boolean().default(DEFAULT_MFA_ENABLED),
      type: MFATypeSchema.default(DEFAULT_MFA_TYPE),
      totpSecretEnv: zod.z.string().optional(),
      pushTimeoutMs: positiveInt.default(DEFAULT_PUSH_TIMEOUT_MS)
    }).optional();
    OIDCTimeoutsSchema = zod.z.object({
      loginFlowMs: positiveInt.default(DEFAULT_LOGIN_FLOW_MS),
      idpRedirectMs: positiveInt.default(DEFAULT_IDP_REDIRECT_MS),
      callbackMs: positiveInt.default(DEFAULT_CALLBACK_MS)
    }).optional();
    OIDCLogoutConfigSchema = zod.z.object({
      url: zod.z.string().optional(),
      idpLogout: zod.z.boolean().optional()
    }).optional();
    OIDCConfigSchema = zod.z.object({
      idpType: OIDCIdpTypeSchema,
      loginUrl: nonEmptyString.describe("Login initiation URL"),
      idpLoginUrl: zod.z.string().optional(),
      success: OIDCSuccessConfigSchema,
      idpSelectors: OIDCIdpSelectorsSchema,
      mfa: MFAConfigSchema,
      timeouts: OIDCTimeoutsSchema,
      logout: OIDCLogoutConfigSchema
    }).optional();
    FormAuthSelectorsSchema = zod.z.object({
      username: nonEmptyString,
      password: nonEmptyString,
      submit: nonEmptyString
    });
    FormAuthSuccessConfigSchema = zod.z.object({
      url: zod.z.string().optional(),
      selector: zod.z.string().optional()
    });
    FormAuthConfigSchema = zod.z.object({
      loginUrl: nonEmptyString,
      selectors: FormAuthSelectorsSchema,
      success: FormAuthSuccessConfigSchema
    }).optional();
    RoleConfigSchema = zod.z.object({
      credentialsEnv: CredentialsEnvConfigSchema,
      description: zod.z.string().optional(),
      oidcOverrides: OIDCConfigSchema.optional()
    });
    RolesSchema = zod.z.record(zod.z.string(), RoleConfigSchema);
    AuthProviderTypeSchema = zod.z.enum(["oidc", "form", "token", "custom"]);
    AuthBypassModeSchema = zod.z.enum([
      "none",
      "identityless",
      "mock-identity",
      "unknown"
    ]);
    AuthBypassConfigSchema = zod.z.object({
      mode: AuthBypassModeSchema.default("unknown"),
      toggle: zod.z.string().optional(),
      environments: zod.z.array(zod.z.string()).optional()
    });
    AuthConfigSchema = zod.z.object({
      provider: AuthProviderTypeSchema,
      storageState: StorageStateConfigSchema.default(DEFAULT_STORAGE_STATE),
      roles: RolesSchema.refine((roles) => Object.keys(roles).length > 0, {
        message: "At least one role must be defined"
      }),
      bypass: AuthBypassConfigSchema.optional(),
      oidc: OIDCConfigSchema,
      form: FormAuthConfigSchema
    }).superRefine((data, ctx) => {
      if (data.provider === "oidc" && data.oidc === void 0) {
        ctx.addIssue({
          code: zod.z.ZodIssueCode.custom,
          message: 'OIDC configuration is required when provider is "oidc"',
          path: ["oidc"]
        });
      }
      if (data.provider === "form" && data.form === void 0) {
        ctx.addIssue({
          code: zod.z.ZodIssueCode.custom,
          message: 'Form configuration is required when provider is "form"',
          path: ["form"]
        });
      }
    });
    LocatorStrategySchema = zod.z.enum([
      "role",
      "label",
      "placeholder",
      "testid",
      "text",
      "css"
    ]);
    SelectorsConfigSchema = zod.z.object({
      testIdAttribute: zod.z.string().default(DEFAULT_TEST_ID_ATTRIBUTE),
      strategy: zod.z.array(LocatorStrategySchema).default([...DEFAULT_LOCATOR_STRATEGY]),
      customTestIds: zod.z.array(zod.z.string()).optional()
    });
    ToastAssertionConfigSchema = zod.z.object({
      containerSelector: nonEmptyString,
      messageSelector: nonEmptyString,
      typeAttribute: nonEmptyString,
      timeout: positiveInt.default(DEFAULT_TOAST_TIMEOUT)
    });
    LoadingAssertionConfigSchema = zod.z.object({
      selectors: zod.z.array(nonEmptyString).min(1, "At least one loading selector required"),
      timeout: positiveInt.default(DEFAULT_LOADING_TIMEOUT)
    });
    FormAssertionConfigSchema = zod.z.object({
      errorSelector: nonEmptyString,
      formErrorSelector: nonEmptyString
    });
    AssertionsConfigSchema = zod.z.object({
      toast: ToastAssertionConfigSchema.default(DEFAULT_ASSERTIONS.toast),
      loading: LoadingAssertionConfigSchema.default(DEFAULT_ASSERTIONS.loading),
      form: FormAssertionConfigSchema.default(DEFAULT_ASSERTIONS.form)
    });
    NamespaceConfigSchema = zod.z.object({
      prefix: zod.z.string().default(DEFAULT_DATA.namespace.prefix),
      suffix: zod.z.string().default(DEFAULT_DATA.namespace.suffix)
    });
    CleanupConfigSchema = zod.z.object({
      enabled: zod.z.boolean().default(DEFAULT_DATA.cleanup.enabled),
      onFailure: zod.z.boolean().default(DEFAULT_DATA.cleanup.onFailure),
      parallel: zod.z.boolean().default(DEFAULT_DATA.cleanup.parallel)
    });
    DataApiConfigSchema = zod.z.object({
      baseUrl: nonEmptyString,
      useMainAuth: zod.z.boolean().default(true)
    }).optional();
    DataConfigSchema = zod.z.object({
      namespace: NamespaceConfigSchema.default(DEFAULT_DATA.namespace),
      cleanup: CleanupConfigSchema.default(DEFAULT_DATA.cleanup),
      api: DataApiConfigSchema
    });
    FixturesApiConfigSchema = zod.z.object({
      baseURL: nonEmptyString,
      extraHTTPHeaders: zod.z.record(zod.z.string(), zod.z.string()).optional()
    }).optional();
    FixturesConfigSchema = zod.z.object({
      defaultRole: nonEmptyString,
      roleFixtures: zod.z.array(nonEmptyString).default([]),
      api: FixturesApiConfigSchema
    });
    TierConfigSchema = zod.z.object({
      retries: nonNegativeInt,
      workers: positiveInt,
      timeout: positiveInt,
      tag: nonEmptyString
    });
    TiersSchema = zod.z.record(zod.z.string(), TierConfigSchema);
    ReporterOpenModeSchema = zod.z.enum(["always", "never", "on-failure"]);
    HtmlReporterConfigSchema = zod.z.object({
      enabled: zod.z.boolean().default(true),
      outputFolder: zod.z.string().default("playwright-report"),
      open: ReporterOpenModeSchema.default(DEFAULT_REPORTER_OPEN)
    }).optional();
    JsonReporterConfigSchema = zod.z.object({
      enabled: zod.z.boolean().default(false),
      outputFile: zod.z.string().default("test-results.json")
    }).optional();
    JunitReporterConfigSchema = zod.z.object({
      enabled: zod.z.boolean().default(false),
      outputFile: zod.z.string().default("junit.xml")
    }).optional();
    ArtkReporterConfigSchema = zod.z.object({
      enabled: zod.z.boolean().default(true),
      outputFile: zod.z.string().default("artk-report.json"),
      includeJourneyMapping: zod.z.boolean().default(true)
    }).optional();
    ReportersConfigSchema = zod.z.object({
      html: HtmlReporterConfigSchema,
      json: JsonReporterConfigSchema,
      junit: JunitReporterConfigSchema,
      artk: ArtkReporterConfigSchema
    });
    ScreenshotModeSchema = zod.z.enum(["off", "on", "only-on-failure"]);
    CaptureModeSchema = zod.z.enum([
      "off",
      "on",
      "retain-on-failure",
      "on-first-retry"
    ]);
    VideoSizeSchema = zod.z.object({
      width: positiveInt,
      height: positiveInt
    }).optional();
    ScreenshotsConfigSchema = zod.z.object({
      mode: ScreenshotModeSchema.default(DEFAULT_SCREENSHOT_MODE),
      fullPage: zod.z.boolean().default(DEFAULT_ARTIFACTS.screenshots.fullPage),
      maskPii: zod.z.boolean().default(DEFAULT_ARTIFACTS.screenshots.maskPii),
      piiSelectors: zod.z.array(zod.z.string()).default([])
    });
    VideoConfigSchema = zod.z.object({
      mode: CaptureModeSchema.default(DEFAULT_CAPTURE_MODE),
      size: VideoSizeSchema
    });
    TraceConfigSchema = zod.z.object({
      mode: CaptureModeSchema.default(DEFAULT_CAPTURE_MODE),
      screenshots: zod.z.boolean().default(true),
      snapshots: zod.z.boolean().default(true)
    });
    ArtifactsConfigSchema = zod.z.object({
      outputDir: zod.z.string().default(DEFAULT_ARTIFACTS.outputDir),
      screenshots: ScreenshotsConfigSchema.default(DEFAULT_ARTIFACTS.screenshots),
      video: VideoConfigSchema.default(DEFAULT_ARTIFACTS.video),
      trace: TraceConfigSchema.default(DEFAULT_ARTIFACTS.trace)
    });
    BrowserTypeSchema = zod.z.enum(["chromium", "firefox", "webkit"]);
    BrowserChannelSchema = zod.z.enum(["bundled", "msedge", "chrome", "chrome-beta", "chrome-dev"]);
    BrowserStrategySchema = zod.z.enum([
      "auto",
      "prefer-bundled",
      "prefer-system",
      "bundled-only",
      "system-only"
    ]);
    ViewportSizeSchema = zod.z.object({
      width: positiveInt,
      height: positiveInt
    });
    BrowsersConfigSchema = zod.z.object({
      enabled: zod.z.array(BrowserTypeSchema).min(1, "At least one browser required").default(["chromium"]),
      channel: BrowserChannelSchema.optional().default(DEFAULT_BROWSERS.channel ?? "bundled"),
      strategy: BrowserStrategySchema.optional().default(DEFAULT_BROWSERS.strategy ?? "auto"),
      viewport: ViewportSizeSchema.default(DEFAULT_BROWSERS.viewport),
      headless: zod.z.boolean().default(DEFAULT_BROWSERS.headless),
      slowMo: positiveInt.optional()
    }).refine(
      (config) => {
        if (config.channel === "msedge" || config.channel.startsWith("chrome")) {
          return config.enabled.includes("chromium");
        }
        return true;
      },
      {
        message: "channel 'msedge' or 'chrome' requires 'chromium' in enabled browsers"
      }
    );
    JourneyLayoutSchema = zod.z.enum(["flat", "staged"]);
    JourneyGroupBySchema = zod.z.enum(["tier", "status", "scope"]);
    JourneyIdConfigSchema = zod.z.object({
      prefix: zod.z.string().default(DEFAULT_JOURNEYS.id.prefix),
      width: positiveInt.default(DEFAULT_JOURNEYS.id.width)
    });
    JourneyBacklogConfigSchema = zod.z.object({
      groupBy: JourneyGroupBySchema.default(DEFAULT_JOURNEYS.backlog.groupBy),
      thenBy: JourneyGroupBySchema.optional()
    });
    JourneysConfigSchema = zod.z.object({
      id: JourneyIdConfigSchema.default(DEFAULT_JOURNEYS.id),
      layout: JourneyLayoutSchema.default(DEFAULT_JOURNEYS.layout),
      backlog: JourneyBacklogConfigSchema.default(DEFAULT_JOURNEYS.backlog)
    });
    ARTKConfigSchema = zod.z.object({
      /**
       * Configuration schema version (integer, not semver).
       * Increment when making breaking changes to schema.
       * Example: 1, 2, 3 (NOT "1.0.0")
       */
      version: zod.z.number().int().min(1).optional().default(SUPPORTED_CONFIG_VERSION),
      app: AppConfigSchema,
      environments: EnvironmentsSchema.default({}),
      activeEnvironment: zod.z.string().default("default"),
      auth: AuthConfigSchema,
      selectors: SelectorsConfigSchema.default({
        testIdAttribute: DEFAULT_TEST_ID_ATTRIBUTE,
        strategy: [...DEFAULT_LOCATOR_STRATEGY]
      }),
      assertions: AssertionsConfigSchema.default(DEFAULT_ASSERTIONS),
      data: DataConfigSchema.default(DEFAULT_DATA),
      fixtures: FixturesConfigSchema,
      tiers: TiersSchema.default(DEFAULT_TIERS),
      reporters: ReportersConfigSchema.default(DEFAULT_REPORTERS),
      artifacts: ArtifactsConfigSchema.default(DEFAULT_ARTIFACTS),
      browsers: BrowsersConfigSchema.default(DEFAULT_BROWSERS),
      journeys: JourneysConfigSchema.default(DEFAULT_JOURNEYS)
    }).superRefine((data, ctx) => {
      const isEnvVarTemplate = data.activeEnvironment.startsWith("${") && data.activeEnvironment.includes("}");
      const envKeys = Object.keys(data.environments);
      if (!isEnvVarTemplate && envKeys.length > 0 && !envKeys.includes(data.activeEnvironment)) {
        ctx.addIssue({
          code: zod.z.ZodIssueCode.custom,
          message: `activeEnvironment "${data.activeEnvironment}" does not match any defined environment. Available: ${envKeys.join(", ")}`,
          path: ["activeEnvironment"]
        });
      }
      const roleKeys = Object.keys(data.auth.roles);
      if (!roleKeys.includes(data.fixtures.defaultRole)) {
        ctx.addIssue({
          code: zod.z.ZodIssueCode.custom,
          message: `fixtures.defaultRole "${data.fixtures.defaultRole}" does not match any defined role. Available: ${roleKeys.join(", ")}`,
          path: ["fixtures", "defaultRole"]
        });
      }
      for (const roleFixture of data.fixtures.roleFixtures) {
        if (!roleKeys.includes(roleFixture)) {
          ctx.addIssue({
            code: zod.z.ZodIssueCode.custom,
            message: `fixtures.roleFixtures contains "${roleFixture}" which is not a defined role. Available: ${roleKeys.join(", ")}`,
            path: ["fixtures", "roleFixtures"]
          });
        }
      }
    });
  }
});

// config/migrate.ts
function registerMigration(migration) {
  const key = `${migration.fromVersion}-${migration.toVersion}`;
  if (MIGRATIONS.has(key)) {
    throw new Error(
      `Migration from v${migration.fromVersion} to v${migration.toVersion} already registered`
    );
  }
  if (migration.toVersion !== migration.fromVersion + 1) {
    throw new Error(
      `Migration must increment version by 1 (got ${migration.fromVersion} \u2192 ${migration.toVersion})`
    );
  }
  MIGRATIONS.set(key, migration);
  logger3.debug(`Registered migration: ${migration.description}`, {
    fromVersion: migration.fromVersion,
    toVersion: migration.toVersion
  });
}
function getMigration(fromVersion, toVersion) {
  const key = `${fromVersion}-${toVersion}`;
  return MIGRATIONS.get(key);
}
function needsMigration(config) {
  const version = config.version ?? 0;
  return version < CURRENT_CONFIG_VERSION;
}
function isVersionSupported(version) {
  return version >= 0 && version <= CURRENT_CONFIG_VERSION;
}
function migrateConfig(config) {
  const fromVersion = config.version ?? 0;
  let currentConfig = { ...config };
  const migrationsApplied = [];
  logger3.debug("Starting migration", {
    fromVersion,
    targetVersion: CURRENT_CONFIG_VERSION
  });
  if (!isVersionSupported(fromVersion)) {
    throw new Error(
      `Config version ${fromVersion} is not supported. Supported versions: 0-${CURRENT_CONFIG_VERSION}`
    );
  }
  if (fromVersion === CURRENT_CONFIG_VERSION) {
    logger3.debug("Config already at current version, no migration needed");
    return {
      config: currentConfig,
      fromVersion,
      toVersion: CURRENT_CONFIG_VERSION,
      migrationsApplied: []
    };
  }
  let currentVersion = fromVersion;
  while (currentVersion < CURRENT_CONFIG_VERSION) {
    const nextVersion = currentVersion + 1;
    const migration = getMigration(currentVersion, nextVersion);
    if (!migration) {
      throw new Error(
        `No migration found from v${currentVersion} to v${nextVersion}. Migration path is incomplete.`
      );
    }
    logger3.debug(`Applying migration: ${migration.description}`, {
      fromVersion: currentVersion,
      toVersion: nextVersion
    });
    currentConfig = migration.migrate(currentConfig);
    migrationsApplied.push(migration.description);
    currentVersion = nextVersion;
  }
  currentConfig.version = CURRENT_CONFIG_VERSION;
  logger3.info("Migration completed", {
    fromVersion,
    toVersion: CURRENT_CONFIG_VERSION,
    migrationsApplied: migrationsApplied.length
  });
  return {
    config: currentConfig,
    fromVersion,
    toVersion: CURRENT_CONFIG_VERSION,
    migrationsApplied
  };
}
var logger3, MIGRATIONS;
var init_migrate = __esm({
  "config/migrate.ts"() {
    init_logger();
    init_schema();
    init_schema();
    logger3 = createLogger("config", "migrate");
    MIGRATIONS = /* @__PURE__ */ new Map();
    registerMigration({
      fromVersion: 0,
      toVersion: 1,
      description: "Add version field to legacy config",
      migrate: (config) => {
        return { ...config };
      }
    });
  }
});
function findConfigFile(baseDir = process.cwd()) {
  const defaultPath = path.join(baseDir, DEFAULT_CONFIG_PATH);
  if (fs$1.existsSync(defaultPath)) {
    return defaultPath;
  }
  const artkDir = path.join(baseDir, "artk");
  if (fs$1.existsSync(artkDir)) {
    for (const fileName of CONFIG_FILE_NAMES) {
      const filePath = path.join(artkDir, fileName);
      if (fs$1.existsSync(filePath)) {
        return filePath;
      }
    }
  }
  for (const fileName of CONFIG_FILE_NAMES) {
    const filePath = path.join(baseDir, fileName);
    if (fs$1.existsSync(filePath)) {
      return filePath;
    }
  }
  return void 0;
}
function loadYamlFile(filePath) {
  try {
    const content = fs$1.readFileSync(filePath, "utf-8");
    return yaml.parse(content);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      throw new exports.ARTKConfigError(
        `Configuration file not found: ${filePath}`,
        "configPath",
        `Create the file at ${filePath} or specify a different path`
      );
    }
    if (error instanceof Error) {
      throw new exports.ARTKConfigError(
        `Failed to parse configuration file: ${error.message}`,
        "configPath",
        "Check the YAML syntax in your configuration file"
      );
    }
    throw error;
  }
}
function formatZodError(error) {
  const issues = error.issues.map((issue) => {
    const path5 = issue.path.join(".");
    return `  - ${path5 || "root"}: ${issue.message}`;
  });
  return `Configuration validation failed:
${issues.join("\n")}`;
}
function zodErrorToConfigError(error) {
  const firstIssue = error.issues[0];
  const path5 = firstIssue ? firstIssue.path.join(".") : "unknown";
  const message = formatZodError(error);
  let suggestion;
  if (firstIssue) {
    switch (firstIssue.code) {
      case "invalid_type":
        suggestion = `Expected ${firstIssue.expected}, received ${firstIssue.received}`;
        break;
      case "invalid_enum_value":
        suggestion = `Valid values: ${firstIssue.options.join(", ")}`;
        break;
      case "too_small":
        suggestion = firstIssue.type === "string" ? "Value cannot be empty" : `Minimum value is ${firstIssue.minimum}`;
        break;
      case "custom":
        suggestion = firstIssue.message;
        break;
    }
  }
  return new exports.ARTKConfigError(message, path5, suggestion);
}
function loadConfig(options = {}) {
  const {
    baseDir = process.cwd(),
    env = process.env,
    forceReload = false,
    activeEnvironment: overrideEnv,
    skipCredentialsValidation = false
  } = options;
  if (!forceReload && cachedConfig !== null && configFilePath !== null) {
    const envName2 = determineActiveEnvironment(cachedConfig, { env, override: overrideEnv });
    const envConfig2 = cachedConfig.environments[envName2];
    logger4.debug("Returning cached configuration", { path: configFilePath });
    return {
      config: cachedConfig,
      configPath: configFilePath,
      activeEnvironment: envName2,
      environmentConfig: envConfig2
    };
  }
  let resolvedPath;
  if (options.configPath) {
    resolvedPath = path.resolve(baseDir, options.configPath);
  } else {
    const foundPath = findConfigFile(baseDir);
    if (!foundPath) {
      throw new exports.ARTKConfigError(
        `Configuration file not found in ${baseDir}`,
        "configPath",
        `Create ${DEFAULT_CONFIG_PATH} or specify a custom path`
      );
    }
    resolvedPath = foundPath;
  }
  logger4.info("Loading configuration", { path: resolvedPath });
  const rawConfig = loadYamlFile(resolvedPath);
  if (typeof rawConfig !== "object" || rawConfig === null) {
    throw new exports.ARTKConfigError(
      "Configuration file must contain a YAML object",
      "root",
      "Ensure your configuration file starts with valid YAML"
    );
  }
  const resolveOptions2 = { env, throwOnMissing: false };
  const missingVars = getMissingEnvVars(rawConfig, env);
  if (missingVars.length > 0) {
    throw createMissingEnvVarsError(missingVars);
  }
  let resolvedConfig = resolveEnvVarsInObject(rawConfig, resolveOptions2);
  const configVersion = resolvedConfig.version ?? 0;
  if (configVersion > CURRENT_CONFIG_VERSION) {
    throw new exports.ARTKConfigError(
      `Configuration version ${configVersion} is not supported. Current version is ${CURRENT_CONFIG_VERSION}.`,
      "version",
      `Downgrade your configuration to version ${CURRENT_CONFIG_VERSION} or upgrade @artk/core`
    );
  }
  if (needsMigration(resolvedConfig)) {
    const migrationResult = migrateConfig(resolvedConfig);
    if (migrationResult.migrationsApplied.length > 0) {
      logger4.warn(
        `Config migrated from v${migrationResult.fromVersion} to v${migrationResult.toVersion}:
` + migrationResult.migrationsApplied.map((m) => `  - ${m}`).join("\n")
      );
    } else {
      logger4.info(
        `Config version updated from v${migrationResult.fromVersion} to v${migrationResult.toVersion} (no schema changes)`
      );
    }
    resolvedConfig = migrationResult.config;
  }
  const parseResult = ARTKConfigSchema.safeParse(resolvedConfig);
  if (!parseResult.success) {
    throw zodErrorToConfigError(parseResult.error);
  }
  const config = parseResult.data;
  if (!skipCredentialsValidation) {
    logger4.debug("Validating credentials configuration");
    validateCredentialsConfig(config.auth.roles, env);
  } else {
    logger4.debug("Skipping credentials validation (skipCredentialsValidation = true)");
  }
  const envName = determineActiveEnvironment(config, { env, override: overrideEnv });
  const envConfig = config.environments[envName];
  cachedConfig = config;
  configFilePath = resolvedPath;
  logger4.info("Configuration loaded successfully", {
    path: resolvedPath,
    activeEnvironment: envName,
    roles: Object.keys(config.auth.roles)
  });
  return {
    config,
    configPath: resolvedPath,
    activeEnvironment: envName,
    environmentConfig: envConfig
  };
}
function determineActiveEnvironment(config, options = {}) {
  const { env = process.env, override } = options;
  if (override) {
    return resolveEnvVars(override, { env });
  }
  const artkEnv = env["ARTK_ENV"];
  if (artkEnv) {
    return artkEnv;
  }
  return resolveEnvVars(config.activeEnvironment, { env, throwOnMissing: false });
}
function clearConfigCache() {
  cachedConfig = null;
  configFilePath = null;
  logger4.debug("Configuration cache cleared");
}
function getConfig() {
  if (cachedConfig === null) {
    throw new exports.ARTKConfigError(
      "Configuration not loaded. Call loadConfig() first.",
      "config",
      "Ensure loadConfig() is called before accessing configuration"
    );
  }
  return cachedConfig;
}
function isConfigLoaded() {
  return cachedConfig !== null;
}
var logger4, cachedConfig, configFilePath, DEFAULT_CONFIG_PATH, CONFIG_FILE_NAMES;
var init_loader = __esm({
  "config/loader.ts"() {
    init_config_error();
    init_logger();
    init_credentials();
    init_env();
    init_migrate();
    init_schema();
    logger4 = createLogger("config", "loader");
    cachedConfig = null;
    configFilePath = null;
    DEFAULT_CONFIG_PATH = "artk/artk.config.yml";
    CONFIG_FILE_NAMES = [
      "artk.config.yml",
      "artk.config.yaml",
      "artk.config.json"
    ];
  }
});

// fixtures/base.ts
var base_exports = {};
__export(base_exports, {
  ensureConfigLoaded: () => ensureConfigLoaded,
  getStorageStateDirectory: () => getStorageStateDirectory3,
  getStorageStatePathForRole: () => getStorageStatePathForRole,
  isStorageStateValidForRole: () => isStorageStateValidForRole,
  testWithConfig: () => testWithConfig
});
function ensureConfigLoaded(options) {
  if (!isConfigLoaded()) {
    loadConfig(options);
  }
  return getConfig();
}
function getStorageStateDirectory3(config, baseDir = process.cwd()) {
  const { resolve: resolve2 } = __require("path");
  return resolve2(baseDir, config.auth.storageState.directory);
}
function getStorageStatePathForRole(config, role, baseDir) {
  const { join: join6 } = __require("path");
  const directory = getStorageStateDirectory3(config, baseDir);
  const pattern = config.auth.storageState.filePattern;
  const fileName = pattern.replace("{role}", role).replace("{env}", config.activeEnvironment);
  return join6(directory, fileName);
}
async function isStorageStateValidForRole(config, role, baseDir) {
  const { existsSync: existsSync2, statSync } = __require("fs");
  const filePath = getStorageStatePathForRole(config, role, baseDir);
  try {
    if (!existsSync2(filePath)) {
      return false;
    }
    const stats = statSync(filePath);
    const age = Date.now() - stats.mtimeMs;
    const maxAge = config.auth.storageState.maxAgeMinutes * 60 * 1e3;
    return age <= maxAge;
  } catch {
    return false;
  }
}
var logger12, testWithConfig;
var init_base = __esm({
  "fixtures/base.ts"() {
    init_loader();
    init_logger();
    logger12 = createLogger("fixtures", "base");
    testWithConfig = test$1.test.extend({
      config: async ({}, use) => {
        logger12.debug("Loading ARTK configuration");
        if (!isConfigLoaded()) {
          loadConfig();
        }
        const config = getConfig();
        logger12.info("Configuration loaded", {
          appName: config.app.name,
          environment: config.activeEnvironment,
          roles: Object.keys(config.auth.roles)
        });
        await use(config);
      }
    });
  }
});

// version.json
var version_default = {
  version: "1.0.0",
  releaseDate: "2025-12-29",
  description: "ARTK Core v1 - Initial release with config-driven setup, OIDC auth, fixtures, locators, assertions, data harness, and reporters",
  minNodeVersion: "18.0.0",
  minPlaywrightVersion: "1.57.0",
  breakingChanges: [],
  features: [
    "Config-driven test setup via artk.config.yml",
    "OIDC authentication with storage state management",
    "Pre-built fixtures (authenticatedPage, apiContext, testData, runId)",
    "Accessibility-first locator utilities",
    "Common assertion helpers (toast, table, form, loading)",
    "Test data isolation and cleanup",
    "Journey-aware reporting with PII masking",
    "Vendorable library design for offline operation"
  ],
  compatibilityNotes: [
    "This is the initial v1 release - no backward compatibility requirements"
  ],
  gitSha: "800150e",
  buildTime: "2025-12-30T09:48:45.861Z"
};

// config/index.ts
init_loader();
init_env();
init_schema();
init_defaults();

// auth/index.ts
init_credentials();

// errors/storage-state-error.ts
var ARTKStorageStateError = class _ARTKStorageStateError extends Error {
  /**
   * Role associated with the storage state
   */
  role;
  /**
   * Path to the storage state file
   */
  path;
  /**
   * Cause of the storage state error
   */
  cause;
  constructor(message, role, path5, cause) {
    super(message);
    this.name = "ARTKStorageStateError";
    this.role = role;
    this.path = path5;
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
init_logger();
var logger5 = createLogger("auth", "storage-state");
var DEFAULT_STORAGE_STATE_CONFIG = {
  directory: ".auth-states",
  maxAgeMinutes: 60,
  filePattern: "{role}.json"
};
async function saveStorageState(context, role, options = {}) {
  const config = resolveOptions(options);
  const filePath = getStorageStatePath2(role, config);
  logger5.info("Saving storage state", { role, path: filePath });
  try {
    const dir = path__namespace.dirname(filePath);
    await fs__namespace.mkdir(dir, { recursive: true });
    await context.storageState({ path: filePath });
    logger5.info("Storage state saved successfully", { role, path: filePath });
    return filePath;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger5.error("Failed to save storage state", { role, path: filePath, error: message });
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
  const filePath = getStorageStatePath2(role, config);
  logger5.debug("Loading storage state", { role, path: filePath });
  const valid = await isStorageStateValid(role, config);
  if (!valid) {
    logger5.debug("Storage state not valid or not found", { role, path: filePath });
    return void 0;
  }
  logger5.info("Storage state loaded successfully", { role, path: filePath });
  return filePath;
}
async function isStorageStateValid(role, options = {}) {
  const config = resolveOptions(options);
  const filePath = getStorageStatePath2(role, config);
  const maxAgeMs = config.maxAgeMinutes * 60 * 1e3;
  try {
    const stats = await fs__namespace.stat(filePath);
    const age = Date.now() - stats.mtimeMs;
    if (age > maxAgeMs) {
      logger5.debug("Storage state expired", {
        role,
        path: filePath,
        ageMinutes: Math.round(age / 6e4),
        maxAgeMinutes: config.maxAgeMinutes
      });
      return false;
    }
    const content = await fs__namespace.readFile(filePath, "utf-8");
    JSON.parse(content);
    logger5.debug("Storage state is valid", {
      role,
      path: filePath,
      ageMinutes: Math.round(age / 6e4)
    });
    return true;
  } catch (error) {
    logger5.debug("Storage state not found or invalid", { role, path: filePath });
    return false;
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
function getStorageStatePath2(role, config) {
  const directory = getStorageStateDirectory(config);
  let filename = config.filePattern.replace("{role}", role).replace("{env}", config.environment ?? "default");
  if (!filename.endsWith(".json")) {
    filename += ".json";
  }
  return path__namespace.join(directory, filename);
}

// auth/oidc/flow.ts
init_auth_error();
init_logger();
var logger6 = createLogger("auth", "oidc-flow");
function generateTOTPCode(secretEnvVar, env = process.env) {
  const secret = env[secretEnvVar];
  if (!secret) {
    logger6.error("TOTP secret environment variable not set", { envVar: secretEnvVar });
    throw new exports.ARTKAuthError(
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
    logger6.debug("Generated TOTP code", {
      envVar: secretEnvVar,
      codeLength: code.length
    });
    return code;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger6.error("Failed to generate TOTP code", { envVar: secretEnvVar, error: message });
    throw new exports.ARTKAuthError(
      `Failed to generate TOTP code: ${message}`,
      "unknown",
      "mfa",
      void 0,
      `Verify that ${secretEnvVar} contains a valid base32-encoded TOTP secret`
    );
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
    logger6.debug("Waiting for fresh TOTP window", { remaining, threshold: thresholdSeconds });
    await new Promise((resolve2) => setTimeout(resolve2, (remaining + 1) * 1e3));
    return true;
  }
  return false;
}
async function executeOIDCFlow(page, config, credentials, options) {
  const startTime = Date.now();
  const role = options.role ?? "unknown";
  const { idpHandler } = options;
  logger6.info("Starting OIDC flow", {
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
    logger6.info("OIDC flow completed successfully", {
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
    const authError = error instanceof exports.ARTKAuthError ? error : new exports.ARTKAuthError(
      error instanceof Error ? error.message : String(error),
      role,
      "credentials"
    );
    logger6.error("OIDC flow failed", {
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
  logger6.debug("Navigating to login URL", { url: config.loginUrl });
  try {
    await page.goto(config.loginUrl, {
      waitUntil: "domcontentloaded",
      timeout
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new exports.ARTKAuthError(
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
  logger6.debug("Waiting for IdP redirect");
  if (config.idpLoginUrl) {
    try {
      await page.waitForURL((url) => url.toString().includes(new URL(config.idpLoginUrl).host), {
        timeout
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new exports.ARTKAuthError(
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
      logger6.debug("URL did not change, may be SPA behavior");
    }
  }
}
async function fillIdPCredentials(page, config, credentials, idpHandler, role) {
  logger6.debug("Filling credentials on IdP page");
  try {
    await idpHandler.fillCredentials(page, credentials, config.idpSelectors);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new exports.ARTKAuthError(
      `Failed to fill credentials on IdP page: ${message}`,
      role,
      "credentials",
      void 0,
      "Check if the IdP selectors are correct for username/password fields"
    );
  }
}
async function submitIdPForm(page, config, idpHandler, role) {
  logger6.debug("Submitting IdP login form");
  try {
    await idpHandler.submitForm(page, config.idpSelectors);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new exports.ARTKAuthError(
      `Failed to submit login form: ${message}`,
      role,
      "credentials",
      void 0,
      "Check if the submit button selector is correct"
    );
  }
}
async function handleMFA(page, mfaConfig, idpHandler, role) {
  logger6.info("Handling MFA challenge", { type: mfaConfig.type });
  switch (mfaConfig.type) {
    case "totp":
      await handleTOTPMFA(page, mfaConfig, idpHandler, role);
      break;
    case "push":
      await handlePushMFA(page, mfaConfig, role);
      break;
    case "sms":
      throw new exports.ARTKAuthError(
        "SMS-based MFA is not supported for automated testing",
        role,
        "mfa",
        void 0,
        "Configure TOTP-based MFA for the test account instead"
      );
    case "none":
      logger6.debug("MFA type is none, skipping");
      break;
    default:
      if (idpHandler.handleMFA) {
        await idpHandler.handleMFA(page, mfaConfig);
      }
  }
}
async function handleTOTPMFA(page, mfaConfig, idpHandler, role) {
  if (!mfaConfig.totpSecretEnv) {
    throw new exports.ARTKAuthError(
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
    logger6.debug("TOTP code submitted");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new exports.ARTKAuthError(
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
  logger6.info("Waiting for push notification approval", { timeoutMs: timeout });
  try {
    await page.waitForURL((url) => {
      return !url.toString().includes("mfa") && !url.toString().includes("2fa");
    }, { timeout });
  } catch (error) {
    throw new exports.ARTKAuthError(
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
  logger6.debug("Waiting for authentication success");
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
    throw new exports.ARTKAuthError(
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
init_logger();
var logger7 = createLogger("auth", "keycloak");
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
    logger7.debug("Filling Keycloak credentials");
    await page.waitForSelector(usernameSelector, { state: "visible", timeout: 1e4 });
    const isPasswordVisible = await page.locator(passwordSelector).isVisible().catch(() => false);
    if (isPasswordVisible) {
      await page.fill(usernameSelector, credentials.username);
      await page.fill(passwordSelector, credentials.password);
    } else {
      await page.fill(usernameSelector, credentials.username);
      logger7.debug("Two-step login detected, submitting username first");
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
        logger7.debug("Password field visible after submit, checking if needs input");
        const passwordValue = await passwordField.inputValue();
        if (!passwordValue) {
          logger7.warn("Password field is empty after username submit - two-step flow may need handling");
        }
      }
    } catch {
    }
    logger7.debug("Keycloak form submitted");
  },
  /**
   * Handle Keycloak MFA challenge
   */
  async handleMFA(page, mfaConfig) {
    if (mfaConfig.type !== "totp") {
      logger7.warn("Non-TOTP MFA type, attempting generic handling", { type: mfaConfig.type });
      return;
    }
    const totpSelector = mfaConfig.totpInputSelector ?? DEFAULT_KEYCLOAK_SELECTORS.totpInput;
    const submitSelector = mfaConfig.totpSubmitSelector ?? DEFAULT_KEYCLOAK_SELECTORS.totpSubmit;
    logger7.debug("Handling Keycloak TOTP MFA");
    await page.waitForSelector(totpSelector, { state: "visible", timeout: 1e4 });
    if (!mfaConfig.totpSecretEnv) {
      throw new Error("TOTP secret environment variable not configured");
    }
    const code = generateTOTPCode(mfaConfig.totpSecretEnv);
    await page.fill(totpSelector, code);
    await page.click(submitSelector);
    logger7.debug("TOTP code submitted to Keycloak");
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
          logger7.warn("Keycloak required action detected", { indicator });
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

// auth/oidc/providers/azure-ad.ts
init_logger();
var logger8 = createLogger("auth", "azure-ad");
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
    logger8.debug("Filling Azure AD credentials (two-step flow)");
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
    logger8.debug("Azure AD form submitted");
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
        logger8.debug('Handling "Stay signed in?" prompt');
        await noButton.click();
        await page.waitForLoadState("domcontentloaded", { timeout: 5e3 });
      }
    } catch {
      logger8.debug('"Stay signed in?" prompt not shown');
    }
  },
  /**
   * Handle Azure AD MFA challenge
   */
  async handleMFA(page, mfaConfig) {
    if (mfaConfig.type !== "totp") {
      logger8.warn("Non-TOTP MFA type for Azure AD", { type: mfaConfig.type });
      return;
    }
    const totpSelector = mfaConfig.totpInputSelector ?? DEFAULT_AZURE_AD_SELECTORS.totpInput;
    const submitSelector = mfaConfig.totpSubmitSelector ?? DEFAULT_AZURE_AD_SELECTORS.totpSubmit;
    logger8.debug("Handling Azure AD TOTP MFA");
    await page.waitForSelector(totpSelector, { state: "visible", timeout: 1e4 });
    if (!mfaConfig.totpSecretEnv) {
      throw new Error("TOTP secret environment variable not configured");
    }
    const code = generateTOTPCode(mfaConfig.totpSecretEnv);
    await page.fill(totpSelector, code);
    await page.click(submitSelector);
    logger8.debug("TOTP code submitted to Azure AD");
  },
  /**
   * Get default Azure AD selectors
   */
  getDefaultSelectors() {
    return { ...DEFAULT_AZURE_AD_SELECTORS };
  }
};

// auth/oidc/providers/okta.ts
init_logger();
var logger9 = createLogger("auth", "okta");
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
    logger9.debug("Filling Okta credentials");
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
          logger9.debug("OIE two-step flow detected, password page loaded");
        }
      }
    } catch {
    }
    logger9.debug("Okta form submitted");
  },
  /**
   * Handle Okta MFA challenge
   */
  async handleMFA(page, mfaConfig) {
    if (mfaConfig.type !== "totp") {
      logger9.warn("Non-TOTP MFA type for Okta", { type: mfaConfig.type });
      if (mfaConfig.type === "push") {
        await handleOktaPushMfa(page, mfaConfig);
        return;
      }
      return;
    }
    const totpSelector = mfaConfig.totpInputSelector ?? DEFAULT_OKTA_SELECTORS.totpInput;
    const submitSelector = mfaConfig.totpSubmitSelector ?? DEFAULT_OKTA_SELECTORS.totpSubmit;
    logger9.debug("Handling Okta TOTP MFA");
    await page.waitForSelector(totpSelector, { state: "visible", timeout: 1e4 });
    if (!mfaConfig.totpSecretEnv) {
      throw new Error("TOTP secret environment variable not configured");
    }
    const code = generateTOTPCode(mfaConfig.totpSecretEnv);
    await page.fill(totpSelector, code);
    await page.click(submitSelector);
    logger9.debug("TOTP code submitted to Okta");
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
  logger9.info("Waiting for Okta Push approval", { timeoutMs: timeout });
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

// auth/oidc/providers/generic.ts
init_logger();
var logger10 = createLogger("auth", "generic-idp");
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
    logger10.debug("Filling credentials on generic IdP");
    const usernameField = page.locator(usernameSelector).first();
    await usernameField.waitFor({ state: "visible", timeout: 1e4 });
    const passwordField = page.locator(passwordSelector).first();
    const isPasswordVisible = await passwordField.isVisible().catch(() => false);
    if (isPasswordVisible) {
      await usernameField.fill(credentials.username);
      await passwordField.fill(credentials.password);
      logger10.debug("Filled both username and password (single-page flow)");
    } else {
      await usernameField.fill(credentials.username);
      logger10.debug("Filled username (possible two-step flow)");
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
          logger10.debug("Two-step flow detected, password field now visible");
        }
      }
    } catch {
    }
    logger10.debug("Form submitted");
  },
  /**
   * Handle MFA challenge
   */
  async handleMFA(page, mfaConfig) {
    if (mfaConfig.type !== "totp") {
      logger10.warn("Non-TOTP MFA type for generic handler", { type: mfaConfig.type });
      return;
    }
    const totpSelector = mfaConfig.totpInputSelector ?? DEFAULT_GENERIC_SELECTORS.totpInput;
    const submitSelector = mfaConfig.totpSubmitSelector ?? DEFAULT_GENERIC_SELECTORS.totpSubmit;
    logger10.debug("Handling generic TOTP MFA");
    const totpField = page.locator(totpSelector).first();
    await totpField.waitFor({ state: "visible", timeout: 1e4 });
    if (!mfaConfig.totpSecretEnv) {
      throw new Error("TOTP secret environment variable not configured");
    }
    const code = generateTOTPCode(mfaConfig.totpSecretEnv);
    await totpField.fill(code);
    const submitButton = page.locator(submitSelector).first();
    await submitButton.click();
    logger10.debug("TOTP code submitted");
  },
  /**
   * Handle post-login prompts (generic - does nothing by default)
   */
  async handlePostLoginPrompts(_page, _selectors) {
    logger10.debug("No post-login prompt handling for generic IdP");
  },
  /**
   * Get default generic selectors
   */
  getDefaultSelectors() {
    return { ...DEFAULT_GENERIC_SELECTORS };
  }
};

// auth/providers/base.ts
init_logger();
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
   * Logger instance for this provider
   */
  logger;
  /**
   * Retry options for authentication operations
   */
  retryOptions;
  /**
   * Provider name for logging
   */
  providerName;
  /**
   * Create a new base auth provider
   *
   * @param providerName - Name for logging (e.g., 'oidc', 'form', 'token')
   * @param retryOptions - Optional retry configuration override
   */
  constructor(providerName, retryOptions = {}) {
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
    return new Promise((resolve2) => setTimeout(resolve2, ms));
  }
};

// auth/providers/oidc.ts
init_auth_error();
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
  config;
  idpHandler;
  currentRole = "unknown";
  /**
   * Create OIDC auth provider
   *
   * @param config - OIDC configuration
   * @param retryOptions - Optional retry configuration
   */
  constructor(config, retryOptions = {}) {
    super(`oidc-${config.idpType}`, retryOptions);
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
        lastError = result.error ?? new exports.ARTKAuthError(
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
        if (error instanceof exports.ARTKAuthError) {
          lastError = error;
        } else {
          lastError = new exports.ARTKAuthError(
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
    throw new exports.ARTKAuthError(
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

// auth/providers/form.ts
init_auth_error();
var DEFAULT_TIMEOUTS = {
  navigationMs: 3e4,
  successMs: 5e3
};
var FormAuthProvider = class extends BaseAuthProvider {
  config;
  currentRole = "unknown";
  /**
   * Create form auth provider
   *
   * @param config - Form auth configuration
   * @param retryOptions - Optional retry configuration
   */
  constructor(config, retryOptions = {}) {
    super("form", retryOptions);
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
        lastError = error instanceof exports.ARTKAuthError ? error : new exports.ARTKAuthError(
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
    throw new exports.ARTKAuthError(
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
      throw new exports.ARTKAuthError(
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
      throw new exports.ARTKAuthError(
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
      throw new exports.ARTKAuthError(
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
      throw new exports.ARTKAuthError(
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

// auth/providers/token.ts
init_auth_error();
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
  config;
  currentRole = "unknown";
  cachedToken;
  /**
   * Create token auth provider
   *
   * @param config - Token auth configuration
   * @param retryOptions - Optional retry configuration
   */
  constructor(config, retryOptions = {}) {
    super("token", retryOptions);
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
        lastError = error instanceof exports.ARTKAuthError ? error : new exports.ARTKAuthError(
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
    throw new exports.ARTKAuthError(
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
        throw new exports.ARTKAuthError(
          `Token request failed: ${response.error}`,
          this.currentRole,
          "credentials",
          response.error,
          "Check credentials and token endpoint configuration"
        );
      }
      const token = response.data?.[tokenField];
      if (!token) {
        throw new exports.ARTKAuthError(
          `Token not found in response (expected field: ${tokenField})`,
          this.currentRole,
          "callback",
          JSON.stringify(response.data).slice(0, 200),
          `Check that token endpoint returns token in "${tokenField}" field`
        );
      }
      return token;
    } catch (error) {
      if (error instanceof exports.ARTKAuthError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new exports.ARTKAuthError(
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
init_logger();

// auth/index.ts
init_auth_error();

// fixtures/auth.ts
init_base();
init_logger();
var logger13 = createLogger("fixtures", "auth");
async function createAuthenticatedContext(browser, config, role) {
  const storageStatePath = getStorageStatePathForRole(config, role);
  const isValid = await isStorageStateValidForRole(config, role);
  if (!isValid) {
    logger13.warn("Storage state not valid or missing for role", {
      role,
      path: storageStatePath,
      suggestion: "Run auth setup before tests"
    });
  }
  logger13.debug("Creating authenticated context", { role, storageStatePath });
  const { existsSync: existsSync2 } = await import('fs');
  const contextOptions = {};
  if (existsSync2(storageStatePath)) {
    contextOptions.storageState = storageStatePath;
    logger13.info("Using storage state for role", { role, path: storageStatePath });
  } else {
    logger13.warn("Storage state file not found", {
      role,
      path: storageStatePath,
      hint: "Tests may fail if authentication is required"
    });
  }
  if (config.browsers) {
    contextOptions.viewport = config.browsers.viewport;
  }
  return browser.newContext(contextOptions);
}
async function createAuthenticatedPage(browser, config, role) {
  const context = await createAuthenticatedContext(browser, config, role);
  const page = await context.newPage();
  return {
    page,
    cleanup: async () => {
      await page.close();
      await context.close();
    }
  };
}
var testWithAuthPages = testWithConfig.extend({
  // Default authenticated page - uses fixtures.defaultRole from config
  authenticatedPage: async ({ browser, config }, use) => {
    const defaultRole = config.fixtures.defaultRole;
    if (!config.auth.roles[defaultRole]) {
      throw new Error(
        `Default role "${defaultRole}" not found in auth.roles. Update fixtures.defaultRole in your config to a valid role.`
      );
    }
    const { page, cleanup } = await createAuthenticatedPage(browser, config, defaultRole);
    try {
      await use(page);
    } finally {
      await cleanup();
    }
  },
  // Admin page fixture
  adminPage: async ({ browser, config }, use) => {
    const role = "admin";
    const effectiveRole = config.auth.roles[role] ? role : Object.keys(config.auth.roles)[0];
    if (!effectiveRole) {
      throw new Error("No roles defined in auth configuration");
    }
    if (effectiveRole !== role) {
      logger13.warn("admin role not found, using fallback", { fallback: effectiveRole });
    }
    const { page, cleanup } = await createAuthenticatedPage(browser, config, effectiveRole);
    try {
      await use(page);
    } finally {
      await cleanup();
    }
  },
  // User page fixture (standardUser or similar)
  userPage: async ({ browser, config }, use) => {
    const userRoleNames = ["standardUser", "user", "viewer", "member"];
    let effectiveRole;
    for (const roleName of userRoleNames) {
      if (config.auth.roles[roleName]) {
        effectiveRole = roleName;
        break;
      }
    }
    if (!effectiveRole) {
      const availableRoles = Object.keys(config.auth.roles);
      effectiveRole = availableRoles.find((r) => r !== "admin") ?? availableRoles[0];
    }
    if (!effectiveRole) {
      throw new Error("No roles defined in auth configuration");
    }
    logger13.debug("Using user role", { role: effectiveRole });
    const { page, cleanup } = await createAuthenticatedPage(browser, config, effectiveRole);
    try {
      await use(page);
    } finally {
      await cleanup();
    }
  }
});

// fixtures/api.ts
init_logger();
var logger14 = createLogger("fixtures", "api");
var testWithAPIContext = testWithAuthPages.extend({
  apiContext: async ({ config }, use) => {
    const { getStorageStatePathForRole: getStorageStatePathForRole3 } = await Promise.resolve().then(() => (init_base(), base_exports));
    const { existsSync: existsSync2 } = await import('fs');
    const defaultRole = config.fixtures.defaultRole;
    const storageStatePath = getStorageStatePathForRole3(config, defaultRole);
    const storageStateExists = existsSync2(storageStatePath);
    const envConfig = config.environments[config.activeEnvironment];
    const apiBaseUrl = config.fixtures.api?.baseURL ?? config.data.api?.baseUrl ?? envConfig?.apiUrl ?? envConfig?.baseUrl ?? config.app.baseUrl;
    const contextOptions = {
      baseURL: apiBaseUrl
    };
    if (config.fixtures.api?.extraHTTPHeaders) {
      contextOptions.extraHTTPHeaders = config.fixtures.api.extraHTTPHeaders;
    }
    if (storageStateExists) {
      contextOptions.storageState = storageStatePath;
    }
    logger14.info("Creating API context", {
      baseURL: apiBaseUrl,
      hasStorageState: storageStateExists,
      role: defaultRole
    });
    const apiContext = await test$1.request.newContext({
      baseURL: contextOptions.baseURL,
      extraHTTPHeaders: contextOptions.extraHTTPHeaders,
      storageState: contextOptions.storageState
    });
    try {
      await use(apiContext);
    } finally {
      await apiContext.dispose();
    }
  }
});
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

// data/cleanup.ts
init_logger();
var AggregateErrorPolyfill = typeof AggregateError !== "undefined" ? AggregateError : class extends Error {
  errors;
  constructor(errors, message) {
    super(message);
    this.name = "AggregateError";
    this.errors = Array.from(errors);
  }
};
var logger15 = createLogger("data", "CleanupManager");
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
      logger15.warn("Cleanup already run, new registration will be ignored", {
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
    logger15.debug("Cleanup registered", {
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
      logger15.warn("Cleanup already executed, skipping duplicate run");
      return;
    }
    this.cleanupRun = true;
    if (this.entries.length === 0) {
      logger15.debug("No cleanup entries to execute");
      return;
    }
    const sorted = [...this.entries].sort((a, b) => a.priority - b.priority);
    logger15.info(`Executing ${sorted.length} cleanup operations`, {
      entries: sorted.map((e) => ({
        priority: e.priority,
        label: e.label ?? "unlabeled"
      }))
    });
    const errors = [];
    for (const entry of sorted) {
      const label = entry.label ?? "unlabeled";
      try {
        logger15.debug(`Running cleanup: ${label}`, {
          priority: entry.priority
        });
        await entry.fn();
        logger15.debug(`Cleanup succeeded: ${label}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger15.error(`Cleanup failed: ${label}`, {
          priority: entry.priority,
          error: errorMessage
        });
        errors.push(
          new Error(`Cleanup "${label}" (priority ${entry.priority}) failed: ${errorMessage}`)
        );
      }
    }
    if (errors.length > 0) {
      logger15.error(`${errors.length} cleanup operations failed`, {
        failedCount: errors.length,
        totalCount: sorted.length
      });
      throw new AggregateErrorPolyfill(
        errors,
        `${errors.length} of ${sorted.length} cleanup operations failed`
      );
    }
    logger15.info("All cleanup operations completed successfully", {
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
    logger15.debug("All cleanup entries cleared");
  }
};

// fixtures/data.ts
init_logger();
var logger16 = createLogger("fixtures", "data");
function generateRunId2() {
  return generateRunId();
}
function createTestDataManager(runId, _config) {
  const cleanupManager = new CleanupManager();
  const pendingApiCleanups = [];
  return {
    runId,
    cleanup(fn, options) {
      cleanupManager.register(fn, options);
      logger16.debug("Cleanup registered", {
        runId,
        label: options?.label ?? "unlabeled",
        priority: options?.priority ?? 100
      });
    },
    cleanupApi(method, url, matcher) {
      pendingApiCleanups.push({ method, url, matcher });
      logger16.debug("API cleanup registered", {
        runId,
        method,
        url
      });
    },
    async runCleanup() {
      logger16.info("Running cleanups", {
        runId,
        registeredCount: cleanupManager.count(),
        apiCleanupCount: pendingApiCleanups.length
      });
      if (pendingApiCleanups.length > 0) {
        logger16.warn("API cleanups registered but not executed", {
          count: pendingApiCleanups.length,
          hint: "Use cleanup() with async function for actual API calls"
        });
      }
      await cleanupManager.runAll();
    }
  };
}
var testWithData = testWithAPIContext.extend({
  // Unique run ID per test
  runId: async ({}, use) => {
    const id = generateRunId2();
    logger16.debug("Generated run ID", { runId: id });
    await use(id);
  },
  // Test data manager with cleanup registration
  testData: async ({ runId, config }, use) => {
    const manager = createTestDataManager(runId);
    logger16.info("Test data manager created", { runId });
    try {
      await use(manager);
    } finally {
      const shouldCleanup = config.data.cleanup.enabled;
      const cleanupOnFailure = config.data.cleanup.onFailure;
      if (shouldCleanup) {
        logger16.debug("Running cleanup after test", {
          runId,
          cleanupEnabled: shouldCleanup,
          cleanupOnFailure
        });
        try {
          await manager.runCleanup();
        } catch (error) {
          logger16.error("Cleanup failed", {
            runId,
            error: String(error)
          });
        }
      } else {
        logger16.debug("Cleanup disabled in config", { runId });
      }
    }
  }
});

// fixtures/index.ts
init_base();
var test = testWithData;

// locators/strategies.ts
function byRole(page, role, options) {
  const playwrightOptions = {};
  if (options) {
    if (options.name !== void 0) {
      playwrightOptions.name = options.name;
    }
    if (options.checked !== void 0) {
      playwrightOptions.checked = options.checked;
    }
    if (options.disabled !== void 0) {
      playwrightOptions.disabled = options.disabled;
    }
    if (options.expanded !== void 0) {
      playwrightOptions.expanded = options.expanded;
    }
    if (options.level !== void 0) {
      playwrightOptions.level = options.level;
    }
    if (options.pressed !== void 0) {
      playwrightOptions.pressed = options.pressed;
    }
    if (options.selected !== void 0) {
      playwrightOptions.selected = options.selected;
    }
    if (options.exact !== void 0) {
      playwrightOptions.exact = options.exact;
    }
    if (options.includeHidden !== void 0) {
      playwrightOptions.includeHidden = options.includeHidden;
    }
  }
  return page.getByRole(
    role,
    playwrightOptions
  );
}
function byLabel(page, label, options) {
  return page.getByLabel(label, options);
}
function byPlaceholder(page, placeholder, options) {
  return page.getByPlaceholder(placeholder, options);
}
function byText(page, text, options) {
  return page.getByText(text, options);
}
function byCss(page, selector) {
  return page.locator(selector);
}

// locators/testid.ts
function byTestId(page, testId, config) {
  const primarySelector = `[${config.testIdAttribute}="${testId}"]`;
  const primaryLocator = page.locator(primarySelector);
  if (!config.customTestIds || config.customTestIds.length === 0) {
    return primaryLocator;
  }
  const allSelectors = [
    config.testIdAttribute,
    ...config.customTestIds || []
  ].map((attr) => `[${attr}="${testId}"]`);
  const combinedSelector = allSelectors.join(", ");
  return page.locator(combinedSelector).first();
}

// locators/factory.ts
function locate(page, selector, config, options) {
  for (const strategy of config.strategies) {
    try {
      switch (strategy) {
        case "role":
          return byRole(page, selector, options);
        case "label":
          return byLabel(page, selector, options);
        case "placeholder":
          return byPlaceholder(page, selector, options);
        case "testid":
          return byTestId(page, selector, config);
        case "text":
          return byText(page, selector, options);
        case "css":
          return byCss(page, selector);
      }
    } catch {
      continue;
    }
  }
  return byCss(page, selector);
}
function withinForm(formLocator, config) {
  return {
    field(name) {
      const byName = formLocator.locator(`[name="${name}"]`);
      if (byName) {
        return byName;
      }
      return byTestId(
        formLocator.page(),
        name,
        config
      ).and(formLocator.locator("input, select, textarea"));
    },
    fieldByLabel(label) {
      return formLocator.getByLabel(label);
    },
    submit() {
      return formLocator.locator(
        'button[type="submit"], input[type="submit"]'
      );
    },
    cancel() {
      return formLocator.getByRole("button", { name: /cancel|close/i });
    },
    error(field) {
      return formLocator.locator(
        `[data-field="${field}"][role="alert"], [data-field="${field}"].error, #${field}-error, .${field}-error`
      );
    }
  };
}
function withinTable(tableLocator) {
  return {
    row(index) {
      return tableLocator.locator("tbody tr").nth(index);
    },
    rowContaining(text) {
      return tableLocator.locator("tbody tr").filter({ hasText: text });
    },
    cell(row, column) {
      const rowLocator = tableLocator.locator("tbody tr").nth(row);
      if (typeof column === "number") {
        return rowLocator.locator("td").nth(column);
      } else {
        return rowLocator.locator("td").filter({
          has: tableLocator.locator(`thead th:has-text("${column}")`)
        }).first();
      }
    },
    header(column) {
      if (typeof column === "number") {
        return tableLocator.locator("thead th").nth(column);
      } else {
        return tableLocator.locator("thead th").filter({ hasText: column });
      }
    }
  };
}
async function expectToast(page, message, options = {}, config) {
  const { type, timeout = 5e3, exact = false } = options;
  const toastConfig = config?.assertions?.toast ?? {
    containerSelector: '[role="alert"], .toast, .notification',
    typeAttribute: "data-type"
  };
  const { containerSelector, typeAttribute } = toastConfig;
  const toastContainer = page.locator(containerSelector);
  await test$1.expect(toastContainer).toBeVisible({ timeout });
  if (exact) {
    await test$1.expect(toastContainer).toHaveText(message, { timeout });
  } else {
    await test$1.expect(toastContainer).toContainText(message, { timeout });
  }
  if (type !== void 0) {
    const actualType = await toastContainer.getAttribute(typeAttribute);
    if (actualType !== type) {
      throw new Error(
        `Expected toast type "${type}" but got "${actualType ?? "none"}"`
      );
    }
  }
}
async function expectTableToContainRow(page, tableSelector, rowData, options = {}) {
  const { timeout = 5e3, exact = false } = options;
  const table = getTableLocator(page, tableSelector);
  const rows = table.locator("tbody tr, tr").filter({ has: page.locator("td") });
  await test$1.expect(table).toBeAttached({ timeout });
  const rowCount = await rows.count();
  if (rowCount === 0) {
    throw new Error(`Table "${tableSelector}" has no data rows`);
  }
  await test$1.expect(table).toBeVisible({ timeout });
  let foundMatch = false;
  for (let i = 0; i < rowCount; i++) {
    const row = rows.nth(i);
    const matches = await rowMatchesData(row, rowData, exact);
    if (matches) {
      foundMatch = true;
      break;
    }
  }
  if (!foundMatch) {
    const rowDataStr = JSON.stringify(rowData);
    throw new Error(
      `Table "${tableSelector}" does not contain a row matching: ${rowDataStr}`
    );
  }
}
function getTableLocator(page, tableSelector) {
  if (!tableSelector.includes("[") && !tableSelector.includes(".") && !tableSelector.includes("#")) {
    return page.getByTestId(tableSelector);
  }
  if (tableSelector === "table") {
    return page.getByRole("table");
  }
  return page.locator(tableSelector);
}
async function rowMatchesData(row, expectedData, exact) {
  for (const [column, expectedValue] of Object.entries(expectedData)) {
    const cell = row.locator(`[data-testid="${column}"], [data-column="${column}"]`);
    if (await cell.count() === 0) {
      const cells = row.locator("td");
      const cellCount = await cells.count();
      let foundCell = false;
      for (let i = 0; i < cellCount; i++) {
        const cellText = await cells.nth(i).textContent();
        const expectedStr = String(expectedValue);
        if (exact ? cellText?.trim() === expectedStr : cellText?.includes(expectedStr)) {
          foundCell = true;
          break;
        }
      }
      if (!foundCell) {
        return false;
      }
    } else {
      const cellText = await cell.textContent();
      const expectedStr = String(expectedValue);
      const matches = exact ? cellText?.trim() === expectedStr : cellText?.includes(expectedStr);
      if (!matches) {
        return false;
      }
    }
  }
  return true;
}
async function expectFormFieldError(page, fieldName, expectedError, options = {}, config) {
  const { timeout = 5e3, exact = false } = options;
  const formConfig = config?.assertions?.form ?? {
    errorSelector: '[data-field-error="{field}"], [data-error-for="{field}"], #error-{field}'};
  const { errorSelector } = formConfig;
  const fieldErrorSelector = errorSelector.replace(/{field}/g, fieldName);
  const errorElement = page.locator(fieldErrorSelector);
  await test$1.expect(errorElement).toBeVisible({ timeout });
  if (exact) {
    await test$1.expect(errorElement).toHaveText(expectedError, { timeout });
  } else {
    await test$1.expect(errorElement).toContainText(expectedError, { timeout });
  }
}
var DEFAULT_LOADING_SELECTORS = [
  '[data-loading="true"]',
  ".loading",
  ".spinner",
  '[aria-busy="true"]',
  ".loading-overlay",
  '[role="progressbar"]'
];
async function expectLoading(page, options = {}, config) {
  const { timeout = 5e3, selectors } = options;
  const loadingSelectors = selectors ?? config?.assertions?.loading?.selectors ?? DEFAULT_LOADING_SELECTORS;
  const combinedSelector = loadingSelectors.join(", ");
  const loadingIndicator = page.locator(combinedSelector);
  await test$1.expect(loadingIndicator.first()).toBeVisible({ timeout });
}
async function waitForLoadingComplete(page, options = {}, config) {
  const { timeout = 3e4, selectors } = options;
  const loadingSelectors = selectors ?? config?.assertions?.loading?.selectors ?? DEFAULT_LOADING_SELECTORS;
  const combinedSelector = loadingSelectors.join(", ");
  const loadingIndicator = page.locator(combinedSelector);
  try {
    await test$1.expect(loadingIndicator.first()).toBeVisible({ timeout: 1e3 });
  } catch {
  }
  for (const selector of loadingSelectors) {
    const indicator = page.locator(selector);
    await test$1.expect(indicator).not.toBeVisible({ timeout });
  }
}

// data/api-client.ts
init_logger();

// reporters/journey-reporter.ts
function extractJourneyId(testCase) {
  for (const annotation of testCase.annotations) {
    if (annotation.type === "journey") {
      return annotation.description ?? null;
    }
  }
  const journeyTagRegex = /^@(JRN-\d+)$/;
  for (const tag of testCase.tags) {
    const match = journeyTagRegex.exec(tag);
    if (match?.[1]) {
      return match[1];
    }
  }
  const titleRegex = /^(JRN-\d+):/;
  const titleMatch = titleRegex.exec(testCase.title);
  if (titleMatch?.[1]) {
    return titleMatch[1];
  }
  return null;
}
function mapTestToJourney(testCase, result) {
  const artifacts = extractTestArtifacts(result);
  return {
    journeyId: extractJourneyId(testCase) ?? "UNMAPPED",
    testTitle: testCase.titlePath().join(" \u203A "),
    testFile: testCase.location.file,
    status: result.status,
    duration: result.duration,
    retries: result.retry,
    error: result.error?.message,
    artifacts
  };
}
function extractTestArtifacts(result) {
  const screenshots = [];
  let video;
  let trace;
  for (const attachment of result.attachments) {
    if (attachment.name === "screenshot" && attachment.path) {
      screenshots.push(attachment.path);
    } else if (attachment.name === "video" && attachment.path) {
      video = attachment.path;
    } else if (attachment.name === "trace" && attachment.path) {
      trace = attachment.path;
    }
  }
  return {
    screenshots,
    video,
    trace
  };
}
function groupTestsByJourney(mappings) {
  const groups = /* @__PURE__ */ new Map();
  for (const mapping of mappings) {
    const existing = groups.get(mapping.journeyId) ?? [];
    groups.set(mapping.journeyId, [...existing, mapping]);
  }
  const readonlyGroups = /* @__PURE__ */ new Map();
  for (const entry of Array.from(groups.entries())) {
    const [journeyId, tests] = entry;
    readonlyGroups.set(journeyId, tests);
  }
  return readonlyGroups;
}
function calculateJourneyStatus(tests) {
  if (tests.length === 0) {
    return "not-run";
  }
  let hasFailed = false;
  let hasFlaky = false;
  let allSkipped = true;
  for (const test2 of tests) {
    if (test2.status === "failed" || test2.status === "timedOut" || test2.status === "interrupted") {
      hasFailed = true;
      allSkipped = false;
    } else if (test2.status === "passed") {
      allSkipped = false;
      if (test2.retries > 0) {
        hasFlaky = true;
      }
    } else if (test2.status !== "skipped") {
      allSkipped = false;
    }
  }
  if (hasFailed) {
    return "failed";
  }
  if (allSkipped) {
    return "skipped";
  }
  if (hasFlaky) {
    return "flaky";
  }
  return "passed";
}
function createJourneyReport(journeyId, tests) {
  let passedTests = 0;
  let failedTests = 0;
  let skippedTests = 0;
  let flakyTests = 0;
  let totalDuration = 0;
  for (const test2 of tests) {
    totalDuration += test2.duration;
    if (test2.status === "passed") {
      if (test2.retries > 0) {
        flakyTests++;
      } else {
        passedTests++;
      }
    } else if (test2.status === "failed" || test2.status === "timedOut" || test2.status === "interrupted") {
      failedTests++;
    } else if (test2.status === "skipped") {
      skippedTests++;
    }
  }
  const status = calculateJourneyStatus(tests);
  return {
    journeyId,
    status,
    totalTests: tests.length,
    passedTests,
    failedTests,
    skippedTests,
    flakyTests,
    totalDuration,
    tests
  };
}
var ARTKReporter = class {
  // Note: config is stored for future use (filtering, metadata, etc.)
  // Currently not used but kept for API compatibility
  // private _config: FullConfig | undefined;
  options;
  testMappings = [];
  startTime = 0;
  endTime = 0;
  constructor(options) {
    this.options = options;
  }
  /**
   * Called once before running tests
   */
  onBegin(_config, _suite) {
    this.startTime = Date.now();
  }
  /**
   * Called for each test after it finishes
   */
  onTestEnd(test2, result) {
    const mapping = mapTestToJourney(test2, result);
    this.testMappings.push(mapping);
  }
  /**
   * Called after all tests finish
   */
  async onEnd(result) {
    this.endTime = Date.now();
    const report = this.generateARTKReport(result);
    await this.writeARTKReport(report);
  }
  /**
   * Generate ARTK report from collected test mappings
   */
  generateARTKReport(result) {
    const summary = this.createRunSummary(result);
    const { journeys, unmappedTests } = this.createJourneyReports();
    return {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      summary,
      journeys,
      unmappedTests
    };
  }
  /**
   * Create run summary from full result
   */
  createRunSummary(result) {
    let totalTests = 0;
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    let flaky = 0;
    for (const mapping of this.testMappings) {
      totalTests++;
      if (mapping.status === "passed") {
        if (mapping.retries > 0) {
          flaky++;
        } else {
          passed++;
        }
      } else if (mapping.status === "failed" || mapping.status === "timedOut" || mapping.status === "interrupted") {
        failed++;
      } else if (mapping.status === "skipped") {
        skipped++;
      }
    }
    return {
      totalTests,
      passed,
      failed,
      skipped,
      flaky,
      duration: this.endTime - this.startTime,
      status: result.status
    };
  }
  /**
   * Create journey reports from test mappings
   */
  createJourneyReports() {
    if (!this.options.includeJourneyMapping) {
      return {
        journeys: [],
        unmappedTests: []
      };
    }
    const grouped = groupTestsByJourney(this.testMappings);
    const journeys = [];
    const unmappedTests = [];
    for (const entry of Array.from(grouped.entries())) {
      const [journeyId, tests] = entry;
      if (journeyId === "UNMAPPED") {
        unmappedTests.push(...tests);
      } else {
        journeys.push(createJourneyReport(journeyId, tests));
      }
    }
    return {
      journeys,
      unmappedTests
    };
  }
  /**
   * Write ARTK report to file
   */
  async writeARTKReport(report) {
    const outputFile = this.options.outputFile;
    const outputDir = path.dirname(outputFile);
    await fs$1.promises.mkdir(outputDir, { recursive: true });
    const reportJson = JSON.stringify(report, null, 2);
    await fs$1.promises.writeFile(outputFile, reportJson, "utf-8");
    console.log(`
ARTK report written to: ${outputFile}`);
    this.printSummary(report);
  }
  /**
   * Print summary to console
   */
  printSummary(report) {
    const { summary, journeys } = report;
    console.log("\n=== ARTK Test Summary ===");
    console.log(`Total Tests: ${summary.totalTests}`);
    console.log(`Passed: ${summary.passed}`);
    console.log(`Failed: ${summary.failed}`);
    console.log(`Skipped: ${summary.skipped}`);
    console.log(`Flaky: ${summary.flaky}`);
    console.log(`Duration: ${(summary.duration / 1e3).toFixed(2)}s`);
    console.log(`Status: ${summary.status}`);
    if (journeys.length > 0) {
      console.log("\n=== Journey Results ===");
      for (const journey of journeys) {
        const statusIcon = journey.status === "passed" ? "\u2713" : journey.status === "failed" ? "\u2717" : "\u25CB";
        console.log(
          `${statusIcon} ${journey.journeyId}: ${journey.passedTests}/${journey.totalTests} passed (${journey.status})`
        );
      }
    }
    console.log("");
  }
};
var DEFAULT_AUTH_SETUP_PATTERN = "**/auth.setup.ts";
var DEFAULT_STORAGE_STATE_PATTERN = "{role}.json";
function createAuthSetupProject(role, storageStatePath, testMatch = DEFAULT_AUTH_SETUP_PATTERN) {
  if (!role || typeof role !== "string") {
    throw new Error("Role must be a non-empty string");
  }
  if (!storageStatePath || typeof storageStatePath !== "string") {
    throw new Error("Storage state path must be a non-empty string");
  }
  return {
    name: `auth-setup-${role}`,
    testMatch,
    use: {
      storageState: void 0
      // Auth setup starts without storage state
    }
  };
}
function createAuthSetupProjects(roles, storageStateDir, filePattern = DEFAULT_STORAGE_STATE_PATTERN, testMatch = DEFAULT_AUTH_SETUP_PATTERN) {
  return roles.map((role) => {
    const filename = resolveStorageStateFilename(role, filePattern);
    const storagePath = path__namespace.join(storageStateDir, filename);
    return createAuthSetupProject(role, storagePath, testMatch);
  });
}
function createBrowserProjects(browsers, roles, storageStateDir, filePattern = DEFAULT_STORAGE_STATE_PATTERN, dependencies = []) {
  const projects = [];
  for (const browser of browsers) {
    projects.push(createBrowserProject(browser));
    for (const role of roles) {
      const filename = resolveStorageStateFilename(role, filePattern);
      const storageStatePath = path__namespace.join(storageStateDir, filename);
      const authDeps = [`auth-setup-${role}`, ...dependencies];
      projects.push(
        createBrowserProject(browser, role, storageStatePath, authDeps)
      );
    }
  }
  return projects;
}
function createBrowserProject(browser, role, storageStatePath, dependencies) {
  const name = role ? `${browser}-${role}` : browser;
  const project = {
    name,
    use: {
      browserName: browser,
      ...storageStatePath && { storageState: storageStatePath }
    },
    ...dependencies && dependencies.length > 0 && { dependencies }
  };
  return project;
}
function resolveStorageStateFilename(role, pattern, env = "default") {
  let filename = pattern.replace("{role}", role);
  filename = filename.replace("{env}", env);
  if (!filename.endsWith(".json")) {
    filename = `${filename}.json`;
  }
  return filename;
}

// harness/reporters.ts
function getReporterConfig(config) {
  const reporters = [];
  const reportersConfig = config.reporters;
  reporters.push(["list"]);
  if (reportersConfig.html?.enabled) {
    const htmlReporter = [
      "html",
      {
        outputFolder: reportersConfig.html.outputFolder,
        open: reportersConfig.html.open
      }
    ];
    reporters.push(htmlReporter);
  }
  if (reportersConfig.json?.enabled) {
    const jsonReporter = [
      "json",
      {
        outputFile: reportersConfig.json.outputFile
      }
    ];
    reporters.push(jsonReporter);
  }
  if (reportersConfig.junit?.enabled) {
    const junitReporter = [
      "junit",
      {
        outputFile: reportersConfig.junit.outputFile
      }
    ];
    reporters.push(junitReporter);
  }
  if (reportersConfig.artk?.enabled) {
    const artkReporter = [
      "./reporters/artk-reporter.ts",
      {
        outputFile: reportersConfig.artk.outputFile,
        includeJourneyMapping: reportersConfig.artk.includeJourneyMapping
      }
    ];
    reporters.push(artkReporter);
  }
  return reporters;
}

// harness/playwright.config.base.ts
var DEFAULT_TIER = "regression";
var DEFAULT_TEST_DIR = "tests";
var DEFAULT_OUTPUT_DIR = "test-results";
var DEFAULT_EXPECT_TIMEOUT = 5e3;
var DEFAULT_TIER_SETTINGS = {
  smoke: {
    retries: 0,
    workers: 1,
    timeout: 3e4,
    tag: "@smoke"
  },
  release: {
    retries: 1,
    workers: 2,
    timeout: 6e4,
    tag: "@release"
  },
  regression: {
    retries: 2,
    workers: 4,
    timeout: 12e4,
    tag: "@regression"
  }
};
function getTierSettings(config, tier = DEFAULT_TIER) {
  const tierConfig = config.tiers[tier];
  if (!tierConfig) {
    return DEFAULT_TIER_SETTINGS[tier] ?? DEFAULT_TIER_SETTINGS.regression;
  }
  return {
    retries: tierConfig.retries,
    workers: tierConfig.workers,
    timeout: tierConfig.timeout,
    tag: tierConfig.tag
  };
}
function mapBrowserChannel(channel) {
  if (!channel || channel === "bundled") {
    return void 0;
  }
  return channel;
}
function getUseOptions(config, activeEnvironment) {
  const envName = activeEnvironment ?? config.activeEnvironment;
  const envConfig = config.environments[envName];
  const baseURL = envConfig?.baseUrl ?? config.app.baseUrl;
  const screenshotMode = mapScreenshotMode(config.artifacts.screenshots.mode);
  const videoMode = mapCaptureMode(config.artifacts.video.mode);
  const traceMode = mapCaptureMode(config.artifacts.trace.mode);
  const playwrightChannel = mapBrowserChannel(config.browsers.channel);
  return {
    baseURL,
    viewport: {
      width: config.browsers.viewport.width,
      height: config.browsers.viewport.height
    },
    headless: config.browsers.headless,
    ...config.browsers.slowMo && { slowMo: config.browsers.slowMo },
    ...playwrightChannel && { channel: playwrightChannel },
    screenshot: screenshotMode,
    video: videoMode,
    trace: traceMode,
    testIdAttribute: config.selectors.testIdAttribute
  };
}
function mapScreenshotMode(mode) {
  return mode;
}
function mapCaptureMode(mode) {
  return mode;
}
function createPlaywrightConfig(options) {
  const {
    config,
    activeEnvironment,
    tier = DEFAULT_TIER,
    projectRoot = process.cwd(),
    includeAuthSetup = true,
    testDir = DEFAULT_TEST_DIR,
    outputDir = DEFAULT_OUTPUT_DIR,
    additionalProjects = []
  } = options;
  const tierSettings = getTierSettings(config, tier);
  const useOptions = getUseOptions(config, activeEnvironment);
  const reporters = getReporterConfig(config);
  const projects = buildProjects(
    config,
    projectRoot,
    includeAuthSetup,
    additionalProjects
  );
  const isCI = Boolean(process.env.CI);
  return {
    testDir,
    outputDir: config.artifacts.outputDir ?? outputDir,
    fullyParallel: true,
    forbidOnly: isCI,
    retries: tierSettings.retries,
    workers: tierSettings.workers,
    timeout: tierSettings.timeout,
    expect: {
      timeout: DEFAULT_EXPECT_TIMEOUT
    },
    reporter: reporters,
    use: useOptions,
    projects
  };
}
function buildProjects(config, projectRoot, includeAuthSetup, additionalProjects) {
  const projects = [];
  const roles = Object.keys(config.auth.roles);
  const browsers = config.browsers.enabled;
  const storageStateDir = path__namespace.join(
    projectRoot,
    config.auth.storageState.directory
  );
  const filePattern = config.auth.storageState.filePattern;
  if (includeAuthSetup && roles.length > 0) {
    const authProjects = createAuthSetupProjects(
      roles,
      storageStateDir,
      filePattern
    );
    projects.push(...authProjects);
  }
  const browserProjects = createBrowserProjects(
    browsers,
    roles,
    storageStateDir,
    filePattern
  );
  projects.push(...browserProjects);
  projects.push(...additionalProjects);
  return projects;
}
util.promisify(child_process.exec);

// grid/types.ts
var DEFAULT_TIMEOUTS2 = {
  gridReady: 3e4,
  rowLoad: 1e4,
  cellEdit: 5e3,
  scroll: 50
};

// grid/ag-grid/config.ts
function normalizeConfig(config) {
  if (typeof config === "string") {
    return {
      selector: config,
      timeouts: { ...DEFAULT_TIMEOUTS2 }
    };
  }
  return {
    ...config,
    timeouts: mergeTimeouts(config.timeouts)
  };
}
function mergeTimeouts(custom) {
  return {
    ...DEFAULT_TIMEOUTS2,
    ...custom
  };
}
function validateConfig(config) {
  if (!config.selector || typeof config.selector !== "string") {
    throw new Error("AG Grid config requires a valid selector string");
  }
  if (config.selector.trim() === "") {
    throw new Error("AG Grid config selector cannot be empty");
  }
  if (config.columns) {
    for (const col of config.columns) {
      if (!col.colId || typeof col.colId !== "string") {
        throw new Error(`AG Grid column definition requires a valid colId`);
      }
    }
  }
  if (config.timeouts) {
    const timeoutKeys = ["gridReady", "rowLoad", "cellEdit", "scroll"];
    for (const key of timeoutKeys) {
      const value = config.timeouts[key];
      if (value !== void 0 && (typeof value !== "number" || value < 0)) {
        throw new Error(`AG Grid timeout "${key}" must be a positive number`);
      }
    }
  }
}
function getColumnDisplayName(config, colId) {
  const column = config.columns?.find((c) => c.colId === colId);
  return column?.displayName ?? colId;
}
function getColumnPinnedPosition(config, colId) {
  const column = config.columns?.find((c) => c.colId === colId);
  return column?.pinned ?? null;
}

// grid/ag-grid/selectors.ts
var AG_GRID_SELECTORS = {
  // Grid structure
  ROOT_WRAPPER: ".ag-root-wrapper",
  HEADER: ".ag-header",
  HEADER_CELL: ".ag-header-cell",
  PINNED_LEFT_CONTAINER: ".ag-pinned-left-cols-container",
  PINNED_RIGHT_CONTAINER: ".ag-pinned-right-cols-container",
  // Row and cell
  ROW: ".ag-row",
  CELL: ".ag-cell",
  ROW_SELECTED: ".ag-row-selected",
  // Overlays
  LOADING_OVERLAY: ".ag-overlay-loading-center",
  NO_ROWS_OVERLAY: ".ag-overlay-no-rows-center",
  // Floating filter
  FLOATING_FILTER: ".ag-floating-filter",
  // Attributes
  ATTR_COL_ID: "col-id",
  ATTR_ROW_INDEX: "row-index",
  ATTR_ROW_ID: "row-id",
  ATTR_ARIA_ROW_INDEX: "aria-rowindex",
  ATTR_ARIA_SORT: "aria-sort"};
function getGridRoot(page, selector) {
  const byTestId2 = page.locator(`[data-testid="${selector}"]`);
  if (selector.startsWith("#") || selector.startsWith(".") || selector.startsWith("[")) {
    return page.locator(selector).locator(AG_GRID_SELECTORS.ROOT_WRAPPER).or(page.locator(selector));
  }
  return byTestId2.locator(AG_GRID_SELECTORS.ROOT_WRAPPER).or(byTestId2);
}
function buildCellSelector(colId) {
  return `${AG_GRID_SELECTORS.CELL}[${AG_GRID_SELECTORS.ATTR_COL_ID}="${colId}"]`;
}
function buildHeaderCellSelector(colId) {
  return `${AG_GRID_SELECTORS.HEADER_CELL}[${AG_GRID_SELECTORS.ATTR_COL_ID}="${colId}"]`;
}
function buildFilterInputSelector(colId) {
  return `${AG_GRID_SELECTORS.FLOATING_FILTER}[${AG_GRID_SELECTORS.ATTR_COL_ID}="${colId}"] input`;
}
async function isGroupRow(rowLocator) {
  const classAttr = await rowLocator.getAttribute("class");
  return classAttr?.includes("ag-row-group") ?? false;
}
async function isRowExpanded(rowLocator) {
  const ariaExpanded = await rowLocator.getAttribute("aria-expanded");
  return ariaExpanded === "true";
}
async function isRowSelected(rowLocator) {
  const classAttr = await rowLocator.getAttribute("class");
  const ariaSelected = await rowLocator.getAttribute("aria-selected");
  return classAttr?.includes("ag-row-selected") || ariaSelected === "true";
}
async function getAriaRowIndex(rowLocator) {
  const ariaRowIndex = await rowLocator.getAttribute(AG_GRID_SELECTORS.ATTR_ARIA_ROW_INDEX);
  return ariaRowIndex ? parseInt(ariaRowIndex, 10) : -1;
}
async function getRowIndex(rowLocator) {
  const rowIndex = await rowLocator.getAttribute(AG_GRID_SELECTORS.ATTR_ROW_INDEX);
  return rowIndex ? parseInt(rowIndex, 10) : -1;
}
async function getRowId(rowLocator) {
  return rowLocator.getAttribute(AG_GRID_SELECTORS.ATTR_ROW_ID);
}
async function getSortDirection(headerCellLocator) {
  const ariaSort = await headerCellLocator.getAttribute(AG_GRID_SELECTORS.ATTR_ARIA_SORT);
  if (ariaSort === "ascending") return "asc";
  if (ariaSort === "descending") return "desc";
  return void 0;
}
function buildRowSelectorFromMatcher(matcher) {
  if (matcher.ariaRowIndex !== void 0) {
    return `${AG_GRID_SELECTORS.ROW}[${AG_GRID_SELECTORS.ATTR_ARIA_ROW_INDEX}="${matcher.ariaRowIndex}"]`;
  }
  if (matcher.rowId !== void 0) {
    return `${AG_GRID_SELECTORS.ROW}[${AG_GRID_SELECTORS.ATTR_ROW_ID}="${matcher.rowId}"]`;
  }
  if (matcher.rowIndex !== void 0) {
    return `${AG_GRID_SELECTORS.ROW}[${AG_GRID_SELECTORS.ATTR_ROW_INDEX}="${matcher.rowIndex}"]`;
  }
  if (matcher.cellValues || matcher.predicate) {
    return null;
  }
  return AG_GRID_SELECTORS.ROW;
}
function isDirectMatcher(matcher) {
  return matcher.ariaRowIndex !== void 0 || matcher.rowId !== void 0 || matcher.rowIndex !== void 0;
}
function formatRowMatcher(matcher) {
  const parts = [];
  if (matcher.ariaRowIndex !== void 0) {
    parts.push(`ariaRowIndex=${matcher.ariaRowIndex}`);
  }
  if (matcher.rowId !== void 0) {
    parts.push(`rowId="${matcher.rowId}"`);
  }
  if (matcher.rowIndex !== void 0) {
    parts.push(`rowIndex=${matcher.rowIndex}`);
  }
  if (matcher.cellValues) {
    const cellParts = Object.entries(matcher.cellValues).map(([key, val]) => `${key}="${val}"`).join(", ");
    parts.push(`cellValues={${cellParts}}`);
  }
  if (matcher.predicate) {
    parts.push("predicate=[function]");
  }
  if (parts.length === 0) {
    return "(empty matcher)";
  }
  return parts.join(", ");
}

// grid/ag-grid/locators.ts
function createLocatorContext(page, config) {
  return {
    page,
    config,
    gridLocator: getGridRoot(page, config.selector)
  };
}
function getGrid(ctx) {
  return ctx.gridLocator;
}
function getRow(ctx, matcher) {
  const { gridLocator } = ctx;
  const selector = buildRowSelectorFromMatcher(matcher);
  if (selector) {
    return gridLocator.locator(selector);
  }
  return gridLocator.locator(AG_GRID_SELECTORS.ROW);
}
function getVisibleRows(ctx) {
  return ctx.gridLocator.locator(AG_GRID_SELECTORS.ROW);
}
function getCell(ctx, rowMatcher, colId) {
  const { gridLocator, config } = ctx;
  const pinnedPosition = getColumnPinnedPosition(config, colId);
  if (pinnedPosition) {
    const containerSelector = pinnedPosition === "left" ? AG_GRID_SELECTORS.PINNED_LEFT_CONTAINER : AG_GRID_SELECTORS.PINNED_RIGHT_CONTAINER;
    const rowSelector = buildRowSelectorFromMatcher(rowMatcher) ?? AG_GRID_SELECTORS.ROW;
    return gridLocator.locator(containerSelector).locator(rowSelector).locator(buildCellSelector(colId));
  }
  const rowLocator = getRow(ctx, rowMatcher);
  return rowLocator.locator(buildCellSelector(colId));
}
function getHeaderCell(ctx, colId) {
  return ctx.gridLocator.locator(buildHeaderCellSelector(colId));
}
function getFilterInput(ctx, colId) {
  return ctx.gridLocator.locator(buildFilterInputSelector(colId));
}
async function waitForReady(gridLocator, config, options) {
  const timeout = options?.timeout ?? config.timeouts.gridReady;
  await test$1.expect(gridLocator.locator(AG_GRID_SELECTORS.ROOT_WRAPPER).or(gridLocator)).toBeVisible({ timeout });
  await test$1.expect(gridLocator.locator(AG_GRID_SELECTORS.HEADER)).toBeVisible({ timeout });
  await waitForDataLoaded(gridLocator, config, { timeout });
}
async function waitForDataLoaded(gridLocator, config, options) {
  const timeout = options?.timeout ?? config.timeouts.gridReady;
  const loadingOverlay = gridLocator.locator(AG_GRID_SELECTORS.LOADING_OVERLAY);
  const overlayCount = await loadingOverlay.count();
  if (overlayCount > 0) {
    const visibleOverlay = loadingOverlay.locator(".visible");
    const visibleCount = await visibleOverlay.count();
    if (visibleCount > 0) {
      await test$1.expect(visibleOverlay).toHaveCount(0, { timeout });
    }
  }
}
async function waitForRowCount(gridLocator, count, config, options) {
  const timeout = options?.timeout ?? config.timeouts.rowLoad;
  const rows = gridLocator.locator(AG_GRID_SELECTORS.ROW);
  await test$1.expect(rows).toHaveCount(count, { timeout });
}
async function waitForRow(gridLocator, matcher, config, options) {
  const timeout = options?.timeout ?? config.timeouts.rowLoad;
  let rowLocator;
  if (matcher.ariaRowIndex !== void 0) {
    rowLocator = gridLocator.locator(
      `${AG_GRID_SELECTORS.ROW}[${AG_GRID_SELECTORS.ATTR_ARIA_ROW_INDEX}="${matcher.ariaRowIndex}"]`
    );
  } else if (matcher.rowId !== void 0) {
    rowLocator = gridLocator.locator(
      `${AG_GRID_SELECTORS.ROW}[${AG_GRID_SELECTORS.ATTR_ROW_ID}="${matcher.rowId}"]`
    );
  } else if (matcher.rowIndex !== void 0) {
    rowLocator = gridLocator.locator(
      `${AG_GRID_SELECTORS.ROW}[${AG_GRID_SELECTORS.ATTR_ROW_INDEX}="${matcher.rowIndex}"]`
    );
  } else {
    rowLocator = gridLocator.locator(AG_GRID_SELECTORS.ROW).first();
  }
  await test$1.expect(rowLocator).toBeVisible({ timeout });
  return rowLocator;
}

// grid/ag-grid/cell-renderers.ts
var BUILT_IN_EXTRACTORS = {
  // Checkbox cell
  checkbox: {
    valueSelector: 'input[type="checkbox"]',
    extractValue: async (el) => String(await el.isChecked())
  },
  // Link/anchor cell
  link: {
    valueSelector: "a",
    extractValue: async (el) => (await el.textContent())?.trim() ?? ""
  },
  // Input cell (for inline editing)
  input: {
    valueSelector: 'input:not([type="checkbox"])',
    extractValue: async (el) => await el.inputValue()
  },
  // Select/dropdown cell
  select: {
    valueSelector: "select",
    extractValue: async (el) => await el.inputValue()
  },
  // Badge/tag cell
  badge: {
    valueSelector: ".badge, .tag, .chip, .label",
    extractValue: async (el) => (await el.textContent())?.trim() ?? ""
  },
  // Button cell
  button: {
    valueSelector: "button",
    extractValue: async (el) => (await el.textContent())?.trim() ?? ""
  }
};
async function extractCellValue(cellLocator, config, colId) {
  if (colId && config.cellRenderers?.[colId]) {
    const renderer = config.cellRenderers[colId];
    return extractWithRenderer(cellLocator, renderer);
  }
  if (colId && config.columns) {
    const column = config.columns.find((c) => c.colId === colId);
    if (column?.valueExtractor) {
      return column.valueExtractor(cellLocator);
    }
  }
  for (const [, extractor] of Object.entries(BUILT_IN_EXTRACTORS)) {
    const element = cellLocator.locator(extractor.valueSelector);
    const count = await element.count();
    if (count > 0 && extractor.extractValue) {
      return extractor.extractValue(element.first());
    }
  }
  return normalizeText(await cellLocator.textContent());
}
async function extractWithRenderer(cellLocator, renderer) {
  const element = cellLocator.locator(renderer.valueSelector);
  if (renderer.extractValue) {
    return renderer.extractValue(element.first());
  }
  return normalizeText(await element.first().textContent());
}
function normalizeText(text) {
  if (!text) return "";
  return text.replace(/\s+/g, " ").trim();
}
async function getAllCellValues(rowLocator, config) {
  const cells = rowLocator.locator(".ag-cell");
  const cellCount = await cells.count();
  const values = {};
  for (let i = 0; i < cellCount; i++) {
    const cell = cells.nth(i);
    const colId = await cell.getAttribute("col-id");
    if (colId) {
      values[colId] = await extractCellValue(cell, config, colId);
    }
  }
  return values;
}

// grid/ag-grid/row-data.ts
async function getRowData(rowLocator, config) {
  const [ariaRowIndex, rowIndex, rowId, isGroup, isExpanded, cells] = await Promise.all([
    getAriaRowIndex(rowLocator),
    getRowIndex(rowLocator),
    getRowId(rowLocator),
    isGroupRow(rowLocator),
    isRowExpanded(rowLocator),
    getAllCellValues(rowLocator, config)
  ]);
  const rowData = {
    rowIndex,
    ariaRowIndex,
    cells
  };
  if (rowId) {
    rowData.rowId = rowId;
  }
  if (isGroup) {
    rowData.isGroup = true;
    rowData.isExpanded = isExpanded;
    const level = await rowLocator.getAttribute("aria-level");
    if (level) {
      rowData.groupLevel = parseInt(level, 10);
    }
  }
  return rowData;
}
async function getAllVisibleRowData(gridLocator, config) {
  const rows = gridLocator.locator(AG_GRID_SELECTORS.ROW);
  const rowCount = await rows.count();
  const results = [];
  for (let i = 0; i < rowCount; i++) {
    const rowLocator = rows.nth(i);
    const rowData = await getRowData(rowLocator, config);
    results.push(rowData);
  }
  return results;
}
async function findRowByMatcher(gridLocator, matcher, config) {
  if (isDirectMatcher(matcher)) {
    const selector = buildRowSelectorFromMatcher(matcher);
    if (selector) {
      const row = gridLocator.locator(selector);
      const count = await row.count();
      if (count > 0) {
        return { row: row.first(), data: await getRowData(row.first(), config) };
      }
    }
    return null;
  }
  if (matcher.cellValues || matcher.predicate) {
    const allRows = await getAllVisibleRowData(gridLocator, config);
    for (let i = 0; i < allRows.length; i++) {
      const rowData = allRows[i];
      if (!rowData) {
        continue;
      }
      const matches = matcher.cellValues ? matchesCellValues(rowData, matcher.cellValues) : matcher.predicate?.(rowData);
      if (matches) {
        const row = gridLocator.locator(AG_GRID_SELECTORS.ROW).nth(i);
        return { row, data: rowData };
      }
    }
    return null;
  }
  return null;
}
function matchesCellValues(rowData, expectedValues) {
  for (const [colId, expectedValue] of Object.entries(expectedValues)) {
    const actualValue = rowData.cells[colId];
    const normalizedExpected = normalizeForComparison(expectedValue);
    const normalizedActual = normalizeForComparison(actualValue);
    if (normalizedExpected !== normalizedActual) {
      return false;
    }
  }
  return true;
}
async function findClosestMatch(gridLocator, expectedValues, config) {
  const allRows = await getAllVisibleRowData(gridLocator, config);
  if (allRows.length === 0) {
    return null;
  }
  let bestMatch = null;
  let bestMatchCount = -1;
  const expectedKeys = Object.keys(expectedValues);
  const totalFields = expectedKeys.length;
  for (const rowData of allRows) {
    let matchedFields = 0;
    const mismatches = [];
    for (const colId of expectedKeys) {
      const expectedValue = expectedValues[colId];
      const actualValue = rowData.cells[colId];
      const normalizedExpected = normalizeForComparison(expectedValue);
      const normalizedActual = normalizeForComparison(actualValue);
      if (normalizedExpected === normalizedActual) {
        matchedFields++;
      } else {
        mismatches.push({
          field: colId,
          expected: expectedValue,
          actual: actualValue
        });
      }
    }
    if (matchedFields > bestMatchCount) {
      bestMatchCount = matchedFields;
      bestMatch = {
        row: rowData,
        matchedFields,
        totalFields,
        mismatches
      };
    }
  }
  return bestMatch;
}
function normalizeForComparison(value) {
  if (value === null || value === void 0) {
    return "";
  }
  if (typeof value === "string") {
    return value.trim().toLowerCase();
  }
  return String(value).trim().toLowerCase();
}
async function countVisibleRows(gridLocator) {
  return gridLocator.locator(AG_GRID_SELECTORS.ROW).count();
}
async function countSelectedRows(gridLocator) {
  return gridLocator.locator(AG_GRID_SELECTORS.ROW_SELECTED).count();
}

// grid/ag-grid/state.ts
async function getGridState(gridLocator, _config) {
  const [visibleRows, selectedRows, sortedBy, isLoading, totalRows] = await Promise.all([
    countVisibleRows(gridLocator),
    countSelectedRows(gridLocator),
    getSortState(gridLocator),
    checkIsLoading(gridLocator),
    getTotalRowCount(gridLocator)
  ]);
  const state = {
    totalRows,
    visibleRows,
    selectedRows,
    isLoading
  };
  if (sortedBy.length > 0) {
    state.sortedBy = sortedBy;
  }
  return state;
}
async function getSortState(gridLocator) {
  const headerCells = gridLocator.locator(AG_GRID_SELECTORS.HEADER_CELL);
  const cellCount = await headerCells.count();
  const sortedColumns = [];
  for (let i = 0; i < cellCount; i++) {
    const cell = headerCells.nth(i);
    const colId = await cell.getAttribute(AG_GRID_SELECTORS.ATTR_COL_ID);
    const direction = await getSortDirection(cell);
    if (colId && direction) {
      sortedColumns.push({ colId, direction });
    }
  }
  return sortedColumns;
}
async function isOverlayVisible(overlayLocator) {
  const count = await overlayLocator.count();
  if (count === 0) {
    return false;
  }
  const visibleOverlay = overlayLocator.locator(".visible");
  const visibleCount = await visibleOverlay.count();
  if (visibleCount > 0) {
    return true;
  }
  try {
    const isVisible = await overlayLocator.first().isVisible({ timeout: 100 });
    return isVisible;
  } catch {
    return false;
  }
}
async function checkIsLoading(gridLocator) {
  const loadingOverlay = gridLocator.locator(AG_GRID_SELECTORS.LOADING_OVERLAY);
  return isOverlayVisible(loadingOverlay);
}
async function getTotalRowCount(gridLocator) {
  const paginationPanel = gridLocator.locator(".ag-paging-panel");
  const paginationCount = await paginationPanel.count();
  if (paginationCount > 0) {
    const paginationText = await paginationPanel.textContent();
    if (paginationText) {
      const match = paginationText.match(/of\s*(\d+)/i);
      const matchedValue = match?.[1];
      if (matchedValue) {
        return parseInt(matchedValue, 10);
      }
    }
  }
  const statusBar = gridLocator.locator(".ag-status-bar");
  const statusBarCount = await statusBar.count();
  if (statusBarCount > 0) {
    const statusText = await statusBar.textContent();
    if (statusText) {
      const match = statusText.match(/(\d+)\s*(rows?|records?|items?)/i);
      const matchedValue = match?.[1];
      if (matchedValue) {
        return parseInt(matchedValue, 10);
      }
    }
  }
  return countVisibleRows(gridLocator);
}
async function isNoRowsOverlayVisible(gridLocator) {
  const noRowsOverlay = gridLocator.locator(AG_GRID_SELECTORS.NO_ROWS_OVERLAY);
  return isOverlayVisible(noRowsOverlay);
}

// grid/ag-grid/assertions.ts
async function expectRowCount(gridLocator, count, config, options) {
  const timeout = options?.timeout ?? 5e3;
  const rows = gridLocator.locator(AG_GRID_SELECTORS.ROW);
  if (options?.min !== void 0 || options?.max !== void 0) {
    const actualCount = await rows.count();
    if (options.min !== void 0 && actualCount < options.min) {
      throw new Error(
        `Grid "${config.selector}" has ${actualCount} rows, expected at least ${options.min}`
      );
    }
    if (options.max !== void 0 && actualCount > options.max) {
      throw new Error(
        `Grid "${config.selector}" has ${actualCount} rows, expected at most ${options.max}`
      );
    }
    return;
  }
  await test$1.expect(rows).toHaveCount(count, { timeout });
}
async function expectRowContains(gridLocator, cellValues, config, options) {
  const timeout = options?.timeout ?? 5e3;
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const match = await findRowByMatcher(gridLocator, { cellValues }, config);
    if (match) {
      return;
    }
    await gridLocator.page().waitForTimeout(100);
  }
  const visibleRowCount = await countVisibleRows(gridLocator);
  const closestMatch = await findClosestMatch(gridLocator, cellValues, config);
  let errorMessage = `Grid "${config.selector}" does not contain a row matching:
`;
  errorMessage += `   Expected: ${formatCellValues(cellValues, config)}

`;
  errorMessage += `   Visible rows checked: ${visibleRowCount}
`;
  if (closestMatch && closestMatch.matchedFields > 0) {
    errorMessage += `   Closest match: ${formatCellValues(closestMatch.row.cells, config)}
`;
    errorMessage += `   Mismatched fields:
`;
    for (const mismatch of closestMatch.mismatches) {
      const displayName = getColumnDisplayName(config, mismatch.field);
      errorMessage += `     - ${displayName}: expected "${String(mismatch.expected)}", got "${String(mismatch.actual)}"
`;
    }
  } else {
    errorMessage += `   No similar rows found
`;
  }
  errorMessage += `
   Tip: If the row exists but isn't visible, it may require scrolling.
`;
  errorMessage += `   The helper automatically scrolls for you - check if the data exists.`;
  throw new Error(errorMessage);
}
async function expectRowNotContains(gridLocator, cellValues, config, options) {
  const timeout = options?.timeout ?? 5e3;
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const allRows = await getAllVisibleRowData(gridLocator, config);
    let foundMatch = false;
    for (const rowData of allRows) {
      if (matchesCellValues(rowData, cellValues)) {
        foundMatch = true;
        break;
      }
    }
    if (foundMatch) {
      await gridLocator.page().waitForTimeout(100);
    } else {
      return;
    }
  }
  throw new Error(
    `Grid "${config.selector}" contains a row matching:
   ${formatCellValues(cellValues, config)}

   Expected this row to NOT exist.`
  );
}
async function expectCellValue(gridLocator, rowMatcher, colId, expectedValue, config, options) {
  options?.timeout ?? 5e3;
  const exact = options?.exact ?? false;
  const match = await findRowByMatcher(gridLocator, rowMatcher, config);
  if (!match) {
    throw new Error(
      `Grid "${config.selector}": Could not find row matching ${formatMatcher(rowMatcher)}`
    );
  }
  const actualValue = match.data.cells[colId];
  const displayName = getColumnDisplayName(config, colId);
  if (exact) {
    if (actualValue !== expectedValue) {
      throw new Error(
        `Grid "${config.selector}": Cell "${displayName}" has value "${String(actualValue)}", expected exactly "${String(expectedValue)}"`
      );
    }
  } else {
    const normalizedExpected = normalizeForComparison2(expectedValue);
    const normalizedActual = normalizeForComparison2(actualValue);
    if (normalizedExpected !== normalizedActual) {
      throw new Error(
        `Grid "${config.selector}": Cell "${displayName}" has value "${String(actualValue)}", expected "${String(expectedValue)}"`
      );
    }
  }
}
async function expectSortedBy(gridLocator, colId, direction, config, _options) {
  const sortState = await getSortState(gridLocator);
  const columnSort = sortState.find((s) => s.colId === colId);
  const displayName = getColumnDisplayName(config, colId);
  if (!columnSort) {
    const sortedCols = sortState.map((s) => `${s.colId} (${s.direction})`).join(", ") || "none";
    throw new Error(
      `Grid "${config.selector}": Column "${displayName}" is not sorted. Currently sorted: ${sortedCols}`
    );
  }
  if (columnSort.direction !== direction) {
    throw new Error(
      `Grid "${config.selector}": Column "${displayName}" is sorted "${columnSort.direction}", expected "${direction}"`
    );
  }
}
async function expectEmpty(gridLocator, _config, options) {
  const timeout = options?.timeout ?? 5e3;
  const rows = gridLocator.locator(AG_GRID_SELECTORS.ROW);
  await test$1.expect(rows).toHaveCount(0, { timeout });
}
async function expectNoRowsOverlay(gridLocator, config, _options) {
  const isVisible = await isNoRowsOverlayVisible(gridLocator);
  if (!isVisible) {
    const rowCount = await countVisibleRows(gridLocator);
    throw new Error(
      `Grid "${config.selector}": "No rows" overlay is not visible. Grid has ${rowCount} rows.`
    );
  }
}
async function expectRowSelected(gridLocator, matcher, config, _options) {
  const match = await findRowByMatcher(gridLocator, matcher, config);
  if (!match) {
    throw new Error(
      `Grid "${config.selector}": Could not find row matching ${formatMatcher(matcher)}`
    );
  }
  const selected = await isRowSelected(match.row);
  if (!selected) {
    throw new Error(
      `Grid "${config.selector}": Row matching ${formatMatcher(matcher)} is not selected`
    );
  }
}
function formatCellValues(values, config) {
  const parts = [];
  for (const [colId, value] of Object.entries(values)) {
    const displayName = getColumnDisplayName(config, colId);
    parts.push(`${displayName}: "${String(value)}"`);
  }
  return `{ ${parts.join(", ")} }`;
}
function formatMatcher(matcher) {
  if (matcher.ariaRowIndex !== void 0) {
    return `aria-rowindex=${matcher.ariaRowIndex}`;
  }
  if (matcher.rowId !== void 0) {
    return `row-id="${matcher.rowId}"`;
  }
  if (matcher.rowIndex !== void 0) {
    return `row-index=${matcher.rowIndex}`;
  }
  if (matcher.cellValues) {
    return JSON.stringify(matcher.cellValues);
  }
  return "<custom predicate>";
}
function normalizeForComparison2(value) {
  if (value === null || value === void 0) {
    return "";
  }
  if (typeof value === "string") {
    return value.trim().toLowerCase();
  }
  return String(value).trim().toLowerCase();
}

// grid/ag-grid/helper.ts
var AgGridHelperImpl = class _AgGridHelperImpl {
  page;
  config;
  ctx;
  constructor(page, config) {
    this.page = page;
    if (typeof config !== "string") {
      validateConfig(config);
    }
    this.config = normalizeConfig(config);
    this.ctx = createLocatorContext(page, this.config);
  }
  // ─────────────────────────────────────────────────────────────────────────
  // Locators
  // ─────────────────────────────────────────────────────────────────────────
  getGrid() {
    return getGrid(this.ctx);
  }
  getRow(matcher) {
    return getRow(this.ctx, matcher);
  }
  getVisibleRows() {
    return getVisibleRows(this.ctx);
  }
  getCell(rowMatcher, colId) {
    return getCell(this.ctx, rowMatcher, colId);
  }
  getHeaderCell(colId) {
    return getHeaderCell(this.ctx, colId);
  }
  getFilterInput(colId) {
    return getFilterInput(this.ctx, colId);
  }
  // ─────────────────────────────────────────────────────────────────────────
  // Wait Utilities
  // ─────────────────────────────────────────────────────────────────────────
  async waitForReady(options) {
    await waitForReady(this.getGrid(), this.config, options);
  }
  async waitForDataLoaded(options) {
    await waitForDataLoaded(this.getGrid(), this.config, options);
  }
  async waitForRowCount(count, options) {
    await waitForRowCount(this.getGrid(), count, this.config, options);
  }
  async waitForRow(matcher, options) {
    return waitForRow(this.getGrid(), matcher, this.config, options);
  }
  // ─────────────────────────────────────────────────────────────────────────
  // Assertions
  // ─────────────────────────────────────────────────────────────────────────
  async expectRowCount(count, options) {
    await expectRowCount(this.getGrid(), count, this.config, options);
  }
  async expectRowContains(cellValues, options) {
    await expectRowContains(this.getGrid(), cellValues, this.config, options);
  }
  async expectRowNotContains(cellValues, options) {
    await expectRowNotContains(this.getGrid(), cellValues, this.config, options);
  }
  async expectCellValue(rowMatcher, colId, expectedValue, options) {
    await expectCellValue(this.getGrid(), rowMatcher, colId, expectedValue, this.config, options);
  }
  async expectSortedBy(colId, direction, options) {
    await expectSortedBy(this.getGrid(), colId, direction, this.config);
  }
  async expectEmpty(options) {
    await expectEmpty(this.getGrid(), this.config, options);
  }
  async expectRowSelected(matcher, options) {
    await expectRowSelected(this.getGrid(), matcher, this.config);
  }
  async expectNoRowsOverlay(options) {
    await expectNoRowsOverlay(this.getGrid(), this.config);
  }
  // ─────────────────────────────────────────────────────────────────────────
  // Actions (stubs - implemented in Phase 4)
  // ─────────────────────────────────────────────────────────────────────────
  async clickCell(rowMatcher, colId) {
    const cell = this.getCell(rowMatcher, colId);
    await cell.click();
  }
  async editCell(rowMatcher, colId, newValue) {
    const cell = this.getCell(rowMatcher, colId);
    await cell.dblclick();
    await cell.locator("input, textarea").fill(newValue);
    await cell.press("Enter");
  }
  async sortByColumn(colId, direction) {
    const header = this.getHeaderCell(colId);
    if (!direction) {
      await header.click();
      return;
    }
    for (let i = 0; i < 3; i++) {
      const currentSort = await header.getAttribute("aria-sort");
      if (direction === "asc" && currentSort === "ascending" || direction === "desc" && currentSort === "descending") {
        return;
      }
      await header.click();
      await this.page.waitForTimeout(100);
    }
  }
  async filterColumn(colId, filterValue) {
    const filterInput = this.getFilterInput(colId);
    await filterInput.fill(filterValue);
  }
  async clearFilter(colId) {
    const filterInput = this.getFilterInput(colId);
    await filterInput.clear();
  }
  async clearAllFilters() {
    const filterInputs = this.getGrid().locator(".ag-floating-filter input");
    const count = await filterInputs.count();
    for (let i = 0; i < count; i++) {
      await filterInputs.nth(i).clear();
    }
  }
  async selectRow(matcher) {
    const row = this.getRow(matcher);
    const checkbox = row.locator(".ag-selection-checkbox input");
    const checkboxCount = await checkbox.count();
    if (checkboxCount > 0) {
      await checkbox.check();
    } else {
      await row.click();
    }
    await this.page.waitForTimeout(50);
    const rowCount = await row.count();
    if (rowCount > 0) {
      const selected = await isRowSelected(row.first());
      if (!selected && checkboxCount > 0) {
        throw new Error(
          `Failed to select row matching: ${formatRowMatcher(matcher)}. Checkbox was checked but selection state did not change.`
        );
      }
    }
  }
  async deselectRow(matcher) {
    const row = this.getRow(matcher);
    const checkbox = row.locator(".ag-selection-checkbox input");
    const checkboxCount = await checkbox.count();
    if (checkboxCount > 0) {
      await checkbox.uncheck();
    }
  }
  async selectAllRows() {
    const selectAll = this.getGrid().locator(".ag-header-select-all input");
    await selectAll.check();
  }
  async deselectAllRows() {
    const selectAll = this.getGrid().locator(".ag-header-select-all input");
    await selectAll.uncheck();
  }
  async scrollToRow(matcher) {
    const row = this.getRow(matcher);
    await row.scrollIntoViewIfNeeded();
  }
  async scrollToColumn(colId) {
    const cell = this.getGrid().locator(`.ag-cell[col-id="${colId}"]`).first();
    await cell.scrollIntoViewIfNeeded();
  }
  // ─────────────────────────────────────────────────────────────────────────
  // Enterprise Features (stubs - implemented in Phase 6)
  // ─────────────────────────────────────────────────────────────────────────
  async expandGroup(matcher) {
    const row = this.getRow(matcher);
    const expandIcon = row.locator(".ag-group-contracted");
    await expandIcon.click();
  }
  async collapseGroup(matcher) {
    const row = this.getRow(matcher);
    const collapseIcon = row.locator(".ag-group-expanded");
    await collapseIcon.click();
  }
  async expandAllGroups() {
    const maxIterations = 100;
    let iterations = 0;
    while (iterations < maxIterations) {
      const contractedGroup = this.getGrid().locator(".ag-group-contracted").first();
      const count = await contractedGroup.count();
      if (count === 0) {
        break;
      }
      await contractedGroup.click();
      await this.page.waitForTimeout(50);
      iterations++;
    }
  }
  async collapseAllGroups() {
    const maxIterations = 100;
    let iterations = 0;
    while (iterations < maxIterations) {
      const expandedGroup = this.getGrid().locator(".ag-group-expanded").first();
      const count = await expandedGroup.count();
      if (count === 0) {
        break;
      }
      await expandedGroup.click();
      await this.page.waitForTimeout(50);
      iterations++;
    }
  }
  async getGroupChildCount(matcher) {
    const row = this.getRow(matcher);
    const childCountEl = row.locator(".ag-group-child-count");
    const count = await childCountEl.count();
    if (count > 0) {
      const text = await childCountEl.textContent();
      const match = text?.match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    }
    return 0;
  }
  async expandMasterRow(matcher) {
    const row = this.getRow(matcher);
    const expandIcon = row.locator(".ag-group-contracted, .ag-row-group-expand");
    await expandIcon.click();
  }
  getDetailGrid(_masterRowMatcher) {
    const detailSelector = ".ag-details-row .ag-root-wrapper";
    return new _AgGridHelperImpl(this.page, {
      ...this.config,
      selector: detailSelector
    });
  }
  // ─────────────────────────────────────────────────────────────────────────
  // Data Extraction
  // ─────────────────────────────────────────────────────────────────────────
  async getCellValue(rowMatcher, colId) {
    const match = await findRowByMatcher(this.getGrid(), rowMatcher, this.config);
    if (!match) {
      const visibleCount = await this.getVisibleRows().count();
      throw new Error(
        `Could not find row matching: ${formatRowMatcher(rowMatcher)}. Grid has ${visibleCount} visible row(s).`
      );
    }
    return match.data.cells[colId];
  }
  async getRowData(matcher) {
    const match = await findRowByMatcher(this.getGrid(), matcher, this.config);
    if (!match) {
      const visibleCount = await this.getVisibleRows().count();
      throw new Error(
        `Could not find row matching: ${formatRowMatcher(matcher)}. Grid has ${visibleCount} visible row(s).`
      );
    }
    return match.data;
  }
  async getAllVisibleRowData() {
    return getAllVisibleRowData(this.getGrid(), this.config);
  }
  async getGridState() {
    return getGridState(this.getGrid(), this.config);
  }
  async getSelectedRowIds() {
    const selectedRows = this.getGrid().locator(".ag-row-selected");
    const count = await selectedRows.count();
    const ids = [];
    for (let i = 0; i < count; i++) {
      const rowId = await selectedRows.nth(i).getAttribute("row-id");
      if (rowId) {
        ids.push(rowId);
      }
    }
    return ids;
  }
};

// grid/ag-grid/factory.ts
var agGrid = (page, config) => {
  return new AgGridHelperImpl(page, config);
};

// errors/index.ts
init_config_error();
init_auth_error();

// utils/index.ts
init_logger();

// utils/retry.ts
init_logger();
var logger18 = createLogger("utils", "retry");
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
  return new Promise((resolve2) => setTimeout(resolve2, ms));
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
      logger18.warn(`Retry attempt ${attemptNumber}/${opts.maxAttempts - 1} after ${delay}ms`, {
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

Object.defineProperty(exports, "expect", {
  enumerable: true,
  get: function () { return test$1.expect; }
});
exports.ARTKReporter = ARTKReporter;
exports.ARTKStorageStateError = ARTKStorageStateError;
exports.CleanupManager = CleanupManager;
exports.DEFAULT_TIMEOUTS = DEFAULT_TIMEOUTS2;
exports.FormAuthProvider = FormAuthProvider;
exports.OIDCAuthProvider = OIDCAuthProvider;
exports.TokenAuthProvider = TokenAuthProvider;
exports.agGrid = agGrid;
exports.byLabel = byLabel;
exports.byRole = byRole;
exports.byTestId = byTestId;
exports.clearConfigCache = clearConfigCache;
exports.createLogger = createLogger;
exports.createPlaywrightConfig = createPlaywrightConfig;
exports.expectFormFieldError = expectFormFieldError;
exports.expectLoading = expectLoading;
exports.expectTableToContainRow = expectTableToContainRow;
exports.expectToast = expectToast;
exports.extractJourneyId = extractJourneyId;
exports.generateRunId = generateRunId;
exports.getConfig = getConfig;
exports.getCredentials = getCredentials;
exports.getTierSettings = getTierSettings;
exports.getUseOptions = getUseOptions;
exports.loadConfig = loadConfig;
exports.loadStorageState = loadStorageState;
exports.locate = locate;
exports.mapTestToJourney = mapTestToJourney;
exports.namespace = namespace;
exports.saveStorageState = saveStorageState;
exports.test = test;
exports.version = version_default;
exports.waitForLoadingComplete = waitForLoadingComplete;
exports.withRetry = withRetry;
exports.withinForm = withinForm;
exports.withinTable = withinTable;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map