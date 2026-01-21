import { z } from 'zod';
import { existsSync, readFileSync } from 'fs';
import { resolve, join } from 'path';
import { parse } from 'yaml';
import { request, test as test$1 } from '@playwright/test';
export { expect } from '@playwright/test';
import { randomBytes } from 'crypto';

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
var ARTKConfigError;
var init_config_error = __esm({
  "errors/config-error.ts"() {
    ARTKConfigError = class _ARTKConfigError extends Error {
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
var ARTKAuthError;
var init_auth_error = __esm({
  "errors/auth-error.ts"() {
    ARTKAuthError = class _ARTKAuthError extends Error {
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
    throw new ARTKAuthError(
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
      const path = currentPath ? `${currentPath}.${key}` : key;
      result[key] = resolveEnvVarsInObject(value, options, path);
    }
    return result;
  }
  return obj;
}
function getMissingEnvVars(value, env = process.env) {
  const missing = [];
  function check(val, path) {
    if (typeof val === "string") {
      const refs = findEnvVarRefs(val);
      for (const ref of refs) {
        if (!ref.hasDefault && (env[ref.varName] === void 0 || env[ref.varName] === "")) {
          missing.push({ varName: ref.varName, fieldPath: path });
        }
      }
    } else if (Array.isArray(val)) {
      val.forEach((item, index) => check(item, `${path}[${index}]`));
    } else if (val !== null && typeof val === "object") {
      for (const [key, childVal] of Object.entries(val)) {
        check(childVal, path ? `${path}.${key}` : key);
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
  return new ARTKConfigError(message, fieldPaths.join(", "), suggestion);
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
    nonEmptyString = z.string().min(1, "Must not be empty");
    positiveInt = z.number().int().positive();
    nonNegativeInt = z.number().int().nonnegative();
    positiveNumber = z.number().positive();
    AppTypeSchema = z.enum(["spa", "ssr", "hybrid"]);
    AppConfigSchema = z.object({
      name: nonEmptyString.describe("Application name"),
      baseUrl: nonEmptyString.describe("Base URL with env var support"),
      type: AppTypeSchema.default(DEFAULT_APP_TYPE)
    });
    EnvironmentConfigSchema = z.object({
      baseUrl: nonEmptyString.describe("Environment base URL"),
      apiUrl: z.string().optional()
    });
    EnvironmentsSchema = z.record(z.string(), EnvironmentConfigSchema);
    StorageStateConfigSchema = z.object({
      directory: z.string().default(DEFAULT_STORAGE_STATE.directory),
      maxAgeMinutes: positiveNumber.default(DEFAULT_STORAGE_STATE.maxAgeMinutes),
      filePattern: nonEmptyString.default(DEFAULT_STORAGE_STATE.filePattern)
    });
    CredentialsEnvConfigSchema = z.object({
      username: nonEmptyString.describe("Env var name for username"),
      password: nonEmptyString.describe("Env var name for password")
    });
    OIDCIdpTypeSchema = z.enum([
      "keycloak",
      "azure-ad",
      "okta",
      "auth0",
      "generic"
    ]);
    MFATypeSchema = z.enum(["totp", "push", "sms", "none"]);
    OIDCSuccessConfigSchema = z.object({
      url: z.string().optional(),
      selector: z.string().optional(),
      timeout: positiveInt.default(DEFAULT_OIDC_SUCCESS_TIMEOUT)
    }).refine((data) => data.url !== void 0 || data.selector !== void 0, {
      message: "Either success.url or success.selector is required"
    });
    OIDCIdpSelectorsSchema = z.object({
      username: z.string().optional(),
      password: z.string().optional(),
      submit: z.string().optional(),
      staySignedInNo: z.string().optional()
    }).optional();
    MFAConfigSchema = z.object({
      enabled: z.boolean().default(DEFAULT_MFA_ENABLED),
      type: MFATypeSchema.default(DEFAULT_MFA_TYPE),
      totpSecretEnv: z.string().optional(),
      pushTimeoutMs: positiveInt.default(DEFAULT_PUSH_TIMEOUT_MS)
    }).optional();
    OIDCTimeoutsSchema = z.object({
      loginFlowMs: positiveInt.default(DEFAULT_LOGIN_FLOW_MS),
      idpRedirectMs: positiveInt.default(DEFAULT_IDP_REDIRECT_MS),
      callbackMs: positiveInt.default(DEFAULT_CALLBACK_MS)
    }).optional();
    OIDCLogoutConfigSchema = z.object({
      url: z.string().optional(),
      idpLogout: z.boolean().optional()
    }).optional();
    OIDCConfigSchema = z.object({
      idpType: OIDCIdpTypeSchema,
      loginUrl: nonEmptyString.describe("Login initiation URL"),
      idpLoginUrl: z.string().optional(),
      success: OIDCSuccessConfigSchema,
      idpSelectors: OIDCIdpSelectorsSchema,
      mfa: MFAConfigSchema,
      timeouts: OIDCTimeoutsSchema,
      logout: OIDCLogoutConfigSchema
    }).optional();
    FormAuthSelectorsSchema = z.object({
      username: nonEmptyString,
      password: nonEmptyString,
      submit: nonEmptyString
    });
    FormAuthSuccessConfigSchema = z.object({
      url: z.string().optional(),
      selector: z.string().optional()
    });
    FormAuthConfigSchema = z.object({
      loginUrl: nonEmptyString,
      selectors: FormAuthSelectorsSchema,
      success: FormAuthSuccessConfigSchema
    }).optional();
    RoleConfigSchema = z.object({
      credentialsEnv: CredentialsEnvConfigSchema,
      description: z.string().optional(),
      oidcOverrides: OIDCConfigSchema.optional()
    });
    RolesSchema = z.record(z.string(), RoleConfigSchema);
    AuthProviderTypeSchema = z.enum(["oidc", "form", "token", "custom"]);
    AuthBypassModeSchema = z.enum([
      "none",
      "identityless",
      "mock-identity",
      "unknown"
    ]);
    AuthBypassConfigSchema = z.object({
      mode: AuthBypassModeSchema.default("unknown"),
      toggle: z.string().optional(),
      environments: z.array(z.string()).optional()
    });
    AuthConfigSchema = z.object({
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
          code: z.ZodIssueCode.custom,
          message: 'OIDC configuration is required when provider is "oidc"',
          path: ["oidc"]
        });
      }
      if (data.provider === "form" && data.form === void 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Form configuration is required when provider is "form"',
          path: ["form"]
        });
      }
    });
    LocatorStrategySchema = z.enum([
      "role",
      "label",
      "placeholder",
      "testid",
      "text",
      "css"
    ]);
    SelectorsConfigSchema = z.object({
      testIdAttribute: z.string().default(DEFAULT_TEST_ID_ATTRIBUTE),
      strategy: z.array(LocatorStrategySchema).default([...DEFAULT_LOCATOR_STRATEGY]),
      customTestIds: z.array(z.string()).optional()
    });
    ToastAssertionConfigSchema = z.object({
      containerSelector: nonEmptyString,
      messageSelector: nonEmptyString,
      typeAttribute: nonEmptyString,
      timeout: positiveInt.default(DEFAULT_TOAST_TIMEOUT)
    });
    LoadingAssertionConfigSchema = z.object({
      selectors: z.array(nonEmptyString).min(1, "At least one loading selector required"),
      timeout: positiveInt.default(DEFAULT_LOADING_TIMEOUT)
    });
    FormAssertionConfigSchema = z.object({
      errorSelector: nonEmptyString,
      formErrorSelector: nonEmptyString
    });
    AssertionsConfigSchema = z.object({
      toast: ToastAssertionConfigSchema.default(DEFAULT_ASSERTIONS.toast),
      loading: LoadingAssertionConfigSchema.default(DEFAULT_ASSERTIONS.loading),
      form: FormAssertionConfigSchema.default(DEFAULT_ASSERTIONS.form)
    });
    NamespaceConfigSchema = z.object({
      prefix: z.string().default(DEFAULT_DATA.namespace.prefix),
      suffix: z.string().default(DEFAULT_DATA.namespace.suffix)
    });
    CleanupConfigSchema = z.object({
      enabled: z.boolean().default(DEFAULT_DATA.cleanup.enabled),
      onFailure: z.boolean().default(DEFAULT_DATA.cleanup.onFailure),
      parallel: z.boolean().default(DEFAULT_DATA.cleanup.parallel)
    });
    DataApiConfigSchema = z.object({
      baseUrl: nonEmptyString,
      useMainAuth: z.boolean().default(true)
    }).optional();
    DataConfigSchema = z.object({
      namespace: NamespaceConfigSchema.default(DEFAULT_DATA.namespace),
      cleanup: CleanupConfigSchema.default(DEFAULT_DATA.cleanup),
      api: DataApiConfigSchema
    });
    FixturesApiConfigSchema = z.object({
      baseURL: nonEmptyString,
      extraHTTPHeaders: z.record(z.string(), z.string()).optional()
    }).optional();
    FixturesConfigSchema = z.object({
      defaultRole: nonEmptyString,
      roleFixtures: z.array(nonEmptyString).default([]),
      api: FixturesApiConfigSchema
    });
    TierConfigSchema = z.object({
      retries: nonNegativeInt,
      workers: positiveInt,
      timeout: positiveInt,
      tag: nonEmptyString
    });
    TiersSchema = z.record(z.string(), TierConfigSchema);
    ReporterOpenModeSchema = z.enum(["always", "never", "on-failure"]);
    HtmlReporterConfigSchema = z.object({
      enabled: z.boolean().default(true),
      outputFolder: z.string().default("playwright-report"),
      open: ReporterOpenModeSchema.default(DEFAULT_REPORTER_OPEN)
    }).optional();
    JsonReporterConfigSchema = z.object({
      enabled: z.boolean().default(false),
      outputFile: z.string().default("test-results.json")
    }).optional();
    JunitReporterConfigSchema = z.object({
      enabled: z.boolean().default(false),
      outputFile: z.string().default("junit.xml")
    }).optional();
    ArtkReporterConfigSchema = z.object({
      enabled: z.boolean().default(true),
      outputFile: z.string().default("artk-report.json"),
      includeJourneyMapping: z.boolean().default(true)
    }).optional();
    ReportersConfigSchema = z.object({
      html: HtmlReporterConfigSchema,
      json: JsonReporterConfigSchema,
      junit: JunitReporterConfigSchema,
      artk: ArtkReporterConfigSchema
    });
    ScreenshotModeSchema = z.enum(["off", "on", "only-on-failure"]);
    CaptureModeSchema = z.enum([
      "off",
      "on",
      "retain-on-failure",
      "on-first-retry"
    ]);
    VideoSizeSchema = z.object({
      width: positiveInt,
      height: positiveInt
    }).optional();
    ScreenshotsConfigSchema = z.object({
      mode: ScreenshotModeSchema.default(DEFAULT_SCREENSHOT_MODE),
      fullPage: z.boolean().default(DEFAULT_ARTIFACTS.screenshots.fullPage),
      maskPii: z.boolean().default(DEFAULT_ARTIFACTS.screenshots.maskPii),
      piiSelectors: z.array(z.string()).default([])
    });
    VideoConfigSchema = z.object({
      mode: CaptureModeSchema.default(DEFAULT_CAPTURE_MODE),
      size: VideoSizeSchema
    });
    TraceConfigSchema = z.object({
      mode: CaptureModeSchema.default(DEFAULT_CAPTURE_MODE),
      screenshots: z.boolean().default(true),
      snapshots: z.boolean().default(true)
    });
    ArtifactsConfigSchema = z.object({
      outputDir: z.string().default(DEFAULT_ARTIFACTS.outputDir),
      screenshots: ScreenshotsConfigSchema.default(DEFAULT_ARTIFACTS.screenshots),
      video: VideoConfigSchema.default(DEFAULT_ARTIFACTS.video),
      trace: TraceConfigSchema.default(DEFAULT_ARTIFACTS.trace)
    });
    BrowserTypeSchema = z.enum(["chromium", "firefox", "webkit"]);
    BrowserChannelSchema = z.enum(["bundled", "msedge", "chrome", "chrome-beta", "chrome-dev"]);
    BrowserStrategySchema = z.enum([
      "auto",
      "prefer-bundled",
      "prefer-system",
      "bundled-only",
      "system-only"
    ]);
    ViewportSizeSchema = z.object({
      width: positiveInt,
      height: positiveInt
    });
    BrowsersConfigSchema = z.object({
      enabled: z.array(BrowserTypeSchema).min(1, "At least one browser required").default(["chromium"]),
      channel: BrowserChannelSchema.optional().default(DEFAULT_BROWSERS.channel ?? "bundled"),
      strategy: BrowserStrategySchema.optional().default(DEFAULT_BROWSERS.strategy ?? "auto"),
      viewport: ViewportSizeSchema.default(DEFAULT_BROWSERS.viewport),
      headless: z.boolean().default(DEFAULT_BROWSERS.headless),
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
    JourneyLayoutSchema = z.enum(["flat", "staged"]);
    JourneyGroupBySchema = z.enum(["tier", "status", "scope"]);
    JourneyIdConfigSchema = z.object({
      prefix: z.string().default(DEFAULT_JOURNEYS.id.prefix),
      width: positiveInt.default(DEFAULT_JOURNEYS.id.width)
    });
    JourneyBacklogConfigSchema = z.object({
      groupBy: JourneyGroupBySchema.default(DEFAULT_JOURNEYS.backlog.groupBy),
      thenBy: JourneyGroupBySchema.optional()
    });
    JourneysConfigSchema = z.object({
      id: JourneyIdConfigSchema.default(DEFAULT_JOURNEYS.id),
      layout: JourneyLayoutSchema.default(DEFAULT_JOURNEYS.layout),
      backlog: JourneyBacklogConfigSchema.default(DEFAULT_JOURNEYS.backlog)
    });
    ARTKConfigSchema = z.object({
      version: z.number().int().min(1).optional().default(SUPPORTED_CONFIG_VERSION),
      app: AppConfigSchema,
      environments: EnvironmentsSchema.default({}),
      activeEnvironment: z.string().default("default"),
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
          code: z.ZodIssueCode.custom,
          message: `activeEnvironment "${data.activeEnvironment}" does not match any defined environment. Available: ${envKeys.join(", ")}`,
          path: ["activeEnvironment"]
        });
      }
      const roleKeys = Object.keys(data.auth.roles);
      if (!roleKeys.includes(data.fixtures.defaultRole)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `fixtures.defaultRole "${data.fixtures.defaultRole}" does not match any defined role. Available: ${roleKeys.join(", ")}`,
          path: ["fixtures", "defaultRole"]
        });
      }
      for (const roleFixture of data.fixtures.roleFixtures) {
        if (!roleKeys.includes(roleFixture)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
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
  const defaultPath = join(baseDir, DEFAULT_CONFIG_PATH);
  if (existsSync(defaultPath)) {
    return defaultPath;
  }
  const artkDir = join(baseDir, "artk");
  if (existsSync(artkDir)) {
    for (const fileName of CONFIG_FILE_NAMES) {
      const filePath = join(artkDir, fileName);
      if (existsSync(filePath)) {
        return filePath;
      }
    }
  }
  for (const fileName of CONFIG_FILE_NAMES) {
    const filePath = join(baseDir, fileName);
    if (existsSync(filePath)) {
      return filePath;
    }
  }
  return void 0;
}
function loadYamlFile(filePath) {
  try {
    const content = readFileSync(filePath, "utf-8");
    return parse(content);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      throw new ARTKConfigError(
        `Configuration file not found: ${filePath}`,
        "configPath",
        `Create the file at ${filePath} or specify a different path`
      );
    }
    if (error instanceof Error) {
      throw new ARTKConfigError(
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
    const path = issue.path.join(".");
    return `  - ${path || "root"}: ${issue.message}`;
  });
  return `Configuration validation failed:
${issues.join("\n")}`;
}
function zodErrorToConfigError(error) {
  const firstIssue = error.issues[0];
  const path = firstIssue ? firstIssue.path.join(".") : "unknown";
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
  return new ARTKConfigError(message, path, suggestion);
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
    resolvedPath = resolve(baseDir, options.configPath);
  } else {
    const foundPath = findConfigFile(baseDir);
    if (!foundPath) {
      throw new ARTKConfigError(
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
    throw new ARTKConfigError(
      "Configuration file must contain a YAML object",
      "root",
      "Ensure your configuration file starts with valid YAML"
    );
  }
  const resolveOptions = { env, throwOnMissing: false };
  const missingVars = getMissingEnvVars(rawConfig, env);
  if (missingVars.length > 0) {
    throw createMissingEnvVarsError(missingVars);
  }
  let resolvedConfig = resolveEnvVarsInObject(rawConfig, resolveOptions);
  const configVersion = resolvedConfig.version ?? 0;
  if (configVersion > CURRENT_CONFIG_VERSION) {
    throw new ARTKConfigError(
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
function getConfig() {
  if (cachedConfig === null) {
    throw new ARTKConfigError(
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
  getStorageStateDirectory: () => getStorageStateDirectory,
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
function getStorageStateDirectory(config, baseDir = process.cwd()) {
  const { resolve: resolve2 } = __require("path");
  return resolve2(baseDir, config.auth.storageState.directory);
}
function getStorageStatePathForRole(config, role, baseDir) {
  const { join: join2 } = __require("path");
  const directory = getStorageStateDirectory(config, baseDir);
  const pattern = config.auth.storageState.filePattern;
  const fileName = pattern.replace("{role}", role).replace("{env}", config.activeEnvironment);
  return join2(directory, fileName);
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
var logger5, testWithConfig;
var init_base = __esm({
  "fixtures/base.ts"() {
    init_loader();
    init_logger();
    logger5 = createLogger("fixtures", "base");
    testWithConfig = test$1.extend({
      config: async ({}, use) => {
        logger5.debug("Loading ARTK configuration");
        if (!isConfigLoaded()) {
          loadConfig();
        }
        const config = getConfig();
        logger5.info("Configuration loaded", {
          appName: config.app.name,
          environment: config.activeEnvironment,
          roles: Object.keys(config.auth.roles)
        });
        await use(config);
      }
    });
  }
});

// fixtures/auth.ts
init_base();
init_logger();
var logger6 = createLogger("fixtures", "auth");
async function createAuthenticatedContext(browser, config, role) {
  const storageStatePath = getStorageStatePathForRole(config, role);
  const isValid = await isStorageStateValidForRole(config, role);
  if (!isValid) {
    logger6.warn("Storage state not valid or missing for role", {
      role,
      path: storageStatePath,
      suggestion: "Run auth setup before tests"
    });
  }
  logger6.debug("Creating authenticated context", { role, storageStatePath });
  const { existsSync: existsSync2 } = await import('fs');
  const contextOptions = {};
  if (existsSync2(storageStatePath)) {
    contextOptions.storageState = storageStatePath;
    logger6.info("Using storage state for role", { role, path: storageStatePath });
  } else {
    logger6.warn("Storage state file not found", {
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
function createRolePageFixture(role) {
  return async ({ browser, config }, use) => {
    if (!config.auth.roles[role]) {
      const availableRoles = Object.keys(config.auth.roles).join(", ");
      throw new Error(
        `Role "${role}" not found in auth configuration. Available roles: ${availableRoles}`
      );
    }
    logger6.debug("Creating page fixture for role", { role });
    const { page, cleanup } = await createAuthenticatedPage(browser, config, role);
    try {
      await use(page);
    } finally {
      await cleanup();
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
      logger6.warn("admin role not found, using fallback", { fallback: effectiveRole });
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
    logger6.debug("Using user role", { role: effectiveRole });
    const { page, cleanup } = await createAuthenticatedPage(browser, config, effectiveRole);
    try {
      await use(page);
    } finally {
      await cleanup();
    }
  }
});
function createDynamicRoleFixtures(config) {
  const fixtures = {};
  const roleFixtureNames = config.fixtures.roleFixtures ?? [];
  for (const role of roleFixtureNames) {
    const fixtureName = `${role}Page`;
    fixtures[fixtureName] = createRolePageFixture(role);
  }
  return fixtures;
}
function getAvailableRoles(config) {
  return Object.keys(config.auth.roles);
}

// fixtures/api.ts
init_logger();
var logger7 = createLogger("fixtures", "api");
function createAPIContextOptions(config, storageStatePath) {
  const options = {};
  if (config.fixtures.api?.baseURL) {
    options.baseURL = config.fixtures.api.baseURL;
  } else if (config.data.api?.baseUrl) {
    options.baseURL = config.data.api.baseUrl;
  } else {
    const envConfig = config.environments[config.activeEnvironment];
    options.baseURL = envConfig?.apiUrl ?? envConfig?.baseUrl ?? config.app.baseUrl;
  }
  const headers = {};
  if (config.fixtures.api?.extraHTTPHeaders) {
    Object.assign(headers, config.fixtures.api.extraHTTPHeaders);
  }
  if (Object.keys(headers).length > 0) {
    options.extraHTTPHeaders = headers;
  }
  if (storageStatePath) {
    options.storageState = storageStatePath;
  }
  return options;
}
async function createAPIContext(config, storageStatePath) {
  const options = createAPIContextOptions(config, storageStatePath);
  logger7.debug("Creating API context", {
    baseURL: options.baseURL,
    hasStorageState: !!options.storageState,
    headerCount: Object.keys(options.extraHTTPHeaders ?? {}).length
  });
  return request.newContext({
    baseURL: options.baseURL,
    extraHTTPHeaders: options.extraHTTPHeaders,
    storageState: options.storageState
  });
}
async function createCustomAPIContext(options) {
  logger7.debug("Creating custom API context", {
    baseURL: options.baseURL,
    hasStorageState: !!options.storageState
  });
  return request.newContext({
    baseURL: options.baseURL,
    extraHTTPHeaders: options.extraHTTPHeaders,
    storageState: options.storageState
  });
}
var testWithAPIContext = testWithAuthPages.extend({
  apiContext: async ({ config }, use) => {
    const { getStorageStatePathForRole: getStorageStatePathForRole2 } = await Promise.resolve().then(() => (init_base(), base_exports));
    const { existsSync: existsSync2 } = await import('fs');
    const defaultRole = config.fixtures.defaultRole;
    const storageStatePath = getStorageStatePathForRole2(config, defaultRole);
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
    logger7.info("Creating API context", {
      baseURL: apiBaseUrl,
      hasStorageState: storageStateExists,
      role: defaultRole
    });
    const apiContext = await request.newContext({
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
async function extractAuthToken(storageStatePath, tokenKey = "auth_token") {
  const { readFile } = await import('fs/promises');
  try {
    const content = await readFile(storageStatePath, "utf-8");
    const state = JSON.parse(content);
    for (const origin of state.origins ?? []) {
      const tokenEntry = origin.localStorage.find((item) => item.name === tokenKey);
      if (tokenEntry) {
        return tokenEntry.value;
      }
    }
    return void 0;
  } catch (error) {
    logger7.warn("Failed to extract auth token", {
      path: storageStatePath,
      error: String(error)
    });
    return void 0;
  }
}
async function createAPIContextWithToken(config, token) {
  const options = createAPIContextOptions(config);
  const headers = {
    ...options.extraHTTPHeaders ?? {},
    Authorization: `Bearer ${token}`
  };
  logger7.debug("Creating API context with token auth");
  return request.newContext({
    baseURL: options.baseURL,
    extraHTTPHeaders: headers
  });
}
var DEFAULT_CONFIG = {
  prefix: "[artk-",
  suffix: "]"
};
function generateRunId() {
  return randomBytes(4).toString("hex");
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
var logger8 = createLogger("data", "CleanupManager");
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
      logger8.warn("Cleanup already run, new registration will be ignored", {
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
    logger8.debug("Cleanup registered", {
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
      logger8.warn("Cleanup already executed, skipping duplicate run");
      return;
    }
    this.cleanupRun = true;
    if (this.entries.length === 0) {
      logger8.debug("No cleanup entries to execute");
      return;
    }
    const sorted = [...this.entries].sort((a, b) => a.priority - b.priority);
    logger8.info(`Executing ${sorted.length} cleanup operations`, {
      entries: sorted.map((e) => ({
        priority: e.priority,
        label: e.label ?? "unlabeled"
      }))
    });
    const errors = [];
    for (const entry of sorted) {
      const label = entry.label ?? "unlabeled";
      try {
        logger8.debug(`Running cleanup: ${label}`, {
          priority: entry.priority
        });
        await entry.fn();
        logger8.debug(`Cleanup succeeded: ${label}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger8.error(`Cleanup failed: ${label}`, {
          priority: entry.priority,
          error: errorMessage
        });
        errors.push(
          new Error(`Cleanup "${label}" (priority ${entry.priority}) failed: ${errorMessage}`)
        );
      }
    }
    if (errors.length > 0) {
      logger8.error(`${errors.length} cleanup operations failed`, {
        failedCount: errors.length,
        totalCount: sorted.length
      });
      throw new AggregateErrorPolyfill(
        errors,
        `${errors.length} of ${sorted.length} cleanup operations failed`
      );
    }
    logger8.info("All cleanup operations completed successfully", {
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
    logger8.debug("All cleanup entries cleared");
  }
};

// fixtures/data.ts
init_logger();
var logger9 = createLogger("fixtures", "data");
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
      logger9.debug("Cleanup registered", {
        runId,
        label: options?.label ?? "unlabeled",
        priority: options?.priority ?? 100
      });
    },
    cleanupApi(method, url, matcher) {
      pendingApiCleanups.push({ method, url, matcher });
      logger9.debug("API cleanup registered", {
        runId,
        method,
        url
      });
    },
    async runCleanup() {
      logger9.info("Running cleanups", {
        runId,
        registeredCount: cleanupManager.count(),
        apiCleanupCount: pendingApiCleanups.length
      });
      if (pendingApiCleanups.length > 0) {
        logger9.warn("API cleanups registered but not executed", {
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
    logger9.debug("Generated run ID", { runId: id });
    await use(id);
  },
  // Test data manager with cleanup registration
  testData: async ({ runId, config }, use) => {
    const manager = createTestDataManager(runId);
    logger9.info("Test data manager created", { runId });
    try {
      await use(manager);
    } finally {
      const shouldCleanup = config.data.cleanup.enabled;
      const cleanupOnFailure = config.data.cleanup.onFailure;
      if (shouldCleanup) {
        logger9.debug("Running cleanup after test", {
          runId,
          cleanupEnabled: shouldCleanup,
          cleanupOnFailure
        });
        try {
          await manager.runCleanup();
        } catch (error) {
          logger9.error("Cleanup failed", {
            runId,
            error: String(error)
          });
        }
      } else {
        logger9.debug("Cleanup disabled in config", { runId });
      }
    }
  }
});
function namespaceValue(value, runId, config) {
  return namespace(value, runId, {
    prefix: config.data.namespace.prefix,
    suffix: config.data.namespace.suffix
  });
}
function createUniqueName(baseName, runId) {
  return `${baseName}-${runId}`;
}
function createUniqueEmail(prefix, runId, domain = "test.example.com") {
  return `${prefix}-${runId}@${domain}`;
}
function shouldRunCleanup(config, testPassed) {
  if (!config.data.cleanup.enabled) {
    return false;
  }
  if (!testPassed && !config.data.cleanup.onFailure) {
    return false;
  }
  return true;
}

// fixtures/index.ts
init_base();
var test = testWithData;

export { CleanupManager, createAPIContext, createAPIContextWithToken, createCustomAPIContext, createDynamicRoleFixtures, createRolePageFixture, createTestDataManager, createUniqueEmail, createUniqueName, ensureConfigLoaded, extractAuthToken, generateRunId2 as generateRunId, getAvailableRoles, getStorageStateDirectory, getStorageStatePathForRole, isNamespaced, isStorageStateValidForRole, namespace, namespaceValue, parseNamespace, shouldRunCleanup, test, testWithAPIContext, testWithAuthPages, testWithConfig, testWithData };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map