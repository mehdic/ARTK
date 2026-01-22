'use strict';

var fs = require('fs');
var path = require('path');
var yaml = require('yaml');
var zod = require('zod');

// config/loader.ts

// errors/config-error.ts
var ARTKConfigError = class _ARTKConfigError extends Error {
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

// errors/auth-error.ts
var ARTKAuthError = class _ARTKAuthError extends Error {
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

// auth/credentials.ts
var logger = createLogger("auth", "credentials");
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

// config/env.ts
var logger2 = createLogger("config", "envResolver");
var EnvVarNotFoundError = class _EnvVarNotFoundError extends Error {
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
function parseEnvVarRef(ref) {
  const singleMatch = /^\$\{([A-Z_][A-Z0-9_]*)(:-([^}]*))?\}$/i.exec(ref);
  if (!singleMatch) {
    return void 0;
  }
  const varName = singleMatch[1];
  const defaultValue = singleMatch[3];
  if (varName === void 0) {
    return void 0;
  }
  return {
    match: ref,
    varName,
    defaultValue,
    hasDefault: singleMatch[2] !== void 0
  };
}
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
function hasEnvVarRefs(value) {
  const pattern = /\$\{[A-Z_][A-Z0-9_]*(:-[^}]*)?\}/i;
  return pattern.test(value);
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

// config/timeouts.ts
var TIMEOUTS = {
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
  LOADING_DEFAULT_MS: 3e4};

// config/defaults.ts
var DEFAULT_APP_TYPE = "spa";
var DEFAULT_STORAGE_STATE = {
  directory: ".auth-states",
  maxAgeMinutes: 60,
  filePattern: "{role}.json"
};
var DEFAULT_OIDC_SUCCESS_TIMEOUT = TIMEOUTS.OIDC_SUCCESS_MS;
var DEFAULT_MFA_TYPE = "none";
var DEFAULT_MFA_ENABLED = false;
var DEFAULT_PUSH_TIMEOUT_MS = TIMEOUTS.AUTH_MFA_PUSH_MS;
var DEFAULT_LOGIN_FLOW_MS = TIMEOUTS.AUTH_LOGIN_FLOW_MS;
var DEFAULT_IDP_REDIRECT_MS = TIMEOUTS.AUTH_IDP_REDIRECT_MS;
var DEFAULT_CALLBACK_MS = TIMEOUTS.AUTH_CALLBACK_MS;
var DEFAULT_LOCATOR_STRATEGY = [
  "role",
  "label",
  "placeholder",
  "testid",
  "text",
  "css"
];
var DEFAULT_TEST_ID_ATTRIBUTE = "data-testid";
var DEFAULT_SELECTORS = {
  testIdAttribute: DEFAULT_TEST_ID_ATTRIBUTE,
  strategy: DEFAULT_LOCATOR_STRATEGY
};
var DEFAULT_TOAST_TIMEOUT = TIMEOUTS.TOAST_DEFAULT_MS;
var DEFAULT_LOADING_TIMEOUT = TIMEOUTS.LOADING_DEFAULT_MS;
var DEFAULT_ASSERTIONS = {
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
var DEFAULT_NAMESPACE_PREFIX = "[artk-";
var DEFAULT_NAMESPACE_SUFFIX = "]";
var DEFAULT_DATA = {
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
var DEFAULT_TIERS = {
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
var DEFAULT_REPORTER_OPEN = "on-failure";
var DEFAULT_REPORTERS = {
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
var DEFAULT_SCREENSHOT_MODE = "only-on-failure";
var DEFAULT_CAPTURE_MODE = "retain-on-failure";
var DEFAULT_ARTIFACTS = {
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
var DEFAULT_VIEWPORT_WIDTH = 1280;
var DEFAULT_VIEWPORT_HEIGHT = 720;
var DEFAULT_BROWSERS = {
  enabled: ["chromium"],
  channel: "bundled",
  strategy: "auto",
  viewport: {
    width: DEFAULT_VIEWPORT_WIDTH,
    height: DEFAULT_VIEWPORT_HEIGHT
  },
  headless: true
};
var DEFAULT_JOURNEY_ID_PREFIX = "JRN";
var DEFAULT_JOURNEY_ID_WIDTH = 4;
var DEFAULT_JOURNEYS = {
  id: {
    prefix: DEFAULT_JOURNEY_ID_PREFIX,
    width: DEFAULT_JOURNEY_ID_WIDTH
  },
  layout: "flat",
  backlog: {
    groupBy: "tier"
  }
};
var SUPPORTED_CONFIG_VERSION = 1;

// config/schema.ts
var CURRENT_CONFIG_VERSION = SUPPORTED_CONFIG_VERSION;
var nonEmptyString = zod.z.string().min(1, "Must not be empty");
var positiveInt = zod.z.number().int().positive();
var nonNegativeInt = zod.z.number().int().nonnegative();
var positiveNumber = zod.z.number().positive();
var AppTypeSchema = zod.z.enum(["spa", "ssr", "hybrid"]);
var AppConfigSchema = zod.z.object({
  name: nonEmptyString.describe("Application name"),
  baseUrl: nonEmptyString.describe("Base URL with env var support"),
  type: AppTypeSchema.default(DEFAULT_APP_TYPE)
});
var EnvironmentConfigSchema = zod.z.object({
  baseUrl: nonEmptyString.describe("Environment base URL"),
  apiUrl: zod.z.string().optional()
});
var EnvironmentsSchema = zod.z.record(zod.z.string(), EnvironmentConfigSchema);
var StorageStateConfigSchema = zod.z.object({
  directory: zod.z.string().default(DEFAULT_STORAGE_STATE.directory),
  maxAgeMinutes: positiveNumber.default(DEFAULT_STORAGE_STATE.maxAgeMinutes),
  filePattern: nonEmptyString.default(DEFAULT_STORAGE_STATE.filePattern)
});
var CredentialsEnvConfigSchema = zod.z.object({
  username: nonEmptyString.describe("Env var name for username"),
  password: nonEmptyString.describe("Env var name for password")
});
var OIDCIdpTypeSchema = zod.z.enum([
  "keycloak",
  "azure-ad",
  "okta",
  "auth0",
  "generic"
]);
var MFATypeSchema = zod.z.enum(["totp", "push", "sms", "none"]);
var OIDCSuccessConfigSchema = zod.z.object({
  url: zod.z.string().optional(),
  selector: zod.z.string().optional(),
  timeout: positiveInt.default(DEFAULT_OIDC_SUCCESS_TIMEOUT)
}).refine((data) => data.url !== void 0 || data.selector !== void 0, {
  message: "Either success.url or success.selector is required"
});
var OIDCIdpSelectorsSchema = zod.z.object({
  username: zod.z.string().optional(),
  password: zod.z.string().optional(),
  submit: zod.z.string().optional(),
  staySignedInNo: zod.z.string().optional()
}).optional();
var MFAConfigSchema = zod.z.object({
  enabled: zod.z.boolean().default(DEFAULT_MFA_ENABLED),
  type: MFATypeSchema.default(DEFAULT_MFA_TYPE),
  totpSecretEnv: zod.z.string().optional(),
  pushTimeoutMs: positiveInt.default(DEFAULT_PUSH_TIMEOUT_MS)
}).optional();
var OIDCTimeoutsSchema = zod.z.object({
  loginFlowMs: positiveInt.default(DEFAULT_LOGIN_FLOW_MS),
  idpRedirectMs: positiveInt.default(DEFAULT_IDP_REDIRECT_MS),
  callbackMs: positiveInt.default(DEFAULT_CALLBACK_MS)
}).optional();
var OIDCLogoutConfigSchema = zod.z.object({
  url: zod.z.string().optional(),
  idpLogout: zod.z.boolean().optional()
}).optional();
var OIDCConfigSchema = zod.z.object({
  idpType: OIDCIdpTypeSchema,
  loginUrl: nonEmptyString.describe("Login initiation URL"),
  idpLoginUrl: zod.z.string().optional(),
  success: OIDCSuccessConfigSchema,
  idpSelectors: OIDCIdpSelectorsSchema,
  mfa: MFAConfigSchema,
  timeouts: OIDCTimeoutsSchema,
  logout: OIDCLogoutConfigSchema
}).optional();
var FormAuthSelectorsSchema = zod.z.object({
  username: nonEmptyString,
  password: nonEmptyString,
  submit: nonEmptyString
});
var FormAuthSuccessConfigSchema = zod.z.object({
  url: zod.z.string().optional(),
  selector: zod.z.string().optional()
});
var FormAuthConfigSchema = zod.z.object({
  loginUrl: nonEmptyString,
  selectors: FormAuthSelectorsSchema,
  success: FormAuthSuccessConfigSchema
}).optional();
var RoleConfigSchema = zod.z.object({
  credentialsEnv: CredentialsEnvConfigSchema,
  description: zod.z.string().optional(),
  oidcOverrides: OIDCConfigSchema.optional()
});
var RolesSchema = zod.z.record(zod.z.string(), RoleConfigSchema);
var AuthProviderTypeSchema = zod.z.enum(["oidc", "form", "token", "custom"]);
var AuthBypassModeSchema = zod.z.enum([
  "none",
  "identityless",
  "mock-identity",
  "unknown"
]);
var AuthBypassConfigSchema = zod.z.object({
  mode: AuthBypassModeSchema.default("unknown"),
  toggle: zod.z.string().optional(),
  environments: zod.z.array(zod.z.string()).optional()
});
var AuthConfigSchema = zod.z.object({
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
var LocatorStrategySchema = zod.z.enum([
  "role",
  "label",
  "placeholder",
  "testid",
  "text",
  "css"
]);
var SelectorsConfigSchema = zod.z.object({
  testIdAttribute: zod.z.string().default(DEFAULT_TEST_ID_ATTRIBUTE),
  strategy: zod.z.array(LocatorStrategySchema).default([...DEFAULT_LOCATOR_STRATEGY]),
  customTestIds: zod.z.array(zod.z.string()).optional()
});
var ToastAssertionConfigSchema = zod.z.object({
  containerSelector: nonEmptyString,
  messageSelector: nonEmptyString,
  typeAttribute: nonEmptyString,
  timeout: positiveInt.default(DEFAULT_TOAST_TIMEOUT)
});
var LoadingAssertionConfigSchema = zod.z.object({
  selectors: zod.z.array(nonEmptyString).min(1, "At least one loading selector required"),
  timeout: positiveInt.default(DEFAULT_LOADING_TIMEOUT)
});
var FormAssertionConfigSchema = zod.z.object({
  errorSelector: nonEmptyString,
  formErrorSelector: nonEmptyString
});
var AssertionsConfigSchema = zod.z.object({
  toast: ToastAssertionConfigSchema.default(DEFAULT_ASSERTIONS.toast),
  loading: LoadingAssertionConfigSchema.default(DEFAULT_ASSERTIONS.loading),
  form: FormAssertionConfigSchema.default(DEFAULT_ASSERTIONS.form)
});
var NamespaceConfigSchema = zod.z.object({
  prefix: zod.z.string().default(DEFAULT_DATA.namespace.prefix),
  suffix: zod.z.string().default(DEFAULT_DATA.namespace.suffix)
});
var CleanupConfigSchema = zod.z.object({
  enabled: zod.z.boolean().default(DEFAULT_DATA.cleanup.enabled),
  onFailure: zod.z.boolean().default(DEFAULT_DATA.cleanup.onFailure),
  parallel: zod.z.boolean().default(DEFAULT_DATA.cleanup.parallel)
});
var DataApiConfigSchema = zod.z.object({
  baseUrl: nonEmptyString,
  useMainAuth: zod.z.boolean().default(true)
}).optional();
var DataConfigSchema = zod.z.object({
  namespace: NamespaceConfigSchema.default(DEFAULT_DATA.namespace),
  cleanup: CleanupConfigSchema.default(DEFAULT_DATA.cleanup),
  api: DataApiConfigSchema
});
var FixturesApiConfigSchema = zod.z.object({
  baseURL: nonEmptyString,
  extraHTTPHeaders: zod.z.record(zod.z.string(), zod.z.string()).optional()
}).optional();
var FixturesConfigSchema = zod.z.object({
  defaultRole: nonEmptyString,
  roleFixtures: zod.z.array(nonEmptyString).default([]),
  api: FixturesApiConfigSchema
});
var TierConfigSchema = zod.z.object({
  retries: nonNegativeInt,
  workers: positiveInt,
  timeout: positiveInt,
  tag: nonEmptyString
});
var TiersSchema = zod.z.record(zod.z.string(), TierConfigSchema);
var ReporterOpenModeSchema = zod.z.enum(["always", "never", "on-failure"]);
var HtmlReporterConfigSchema = zod.z.object({
  enabled: zod.z.boolean().default(true),
  outputFolder: zod.z.string().default("playwright-report"),
  open: ReporterOpenModeSchema.default(DEFAULT_REPORTER_OPEN)
}).optional();
var JsonReporterConfigSchema = zod.z.object({
  enabled: zod.z.boolean().default(false),
  outputFile: zod.z.string().default("test-results.json")
}).optional();
var JunitReporterConfigSchema = zod.z.object({
  enabled: zod.z.boolean().default(false),
  outputFile: zod.z.string().default("junit.xml")
}).optional();
var ArtkReporterConfigSchema = zod.z.object({
  enabled: zod.z.boolean().default(true),
  outputFile: zod.z.string().default("artk-report.json"),
  includeJourneyMapping: zod.z.boolean().default(true)
}).optional();
var ReportersConfigSchema = zod.z.object({
  html: HtmlReporterConfigSchema,
  json: JsonReporterConfigSchema,
  junit: JunitReporterConfigSchema,
  artk: ArtkReporterConfigSchema
});
var ScreenshotModeSchema = zod.z.enum(["off", "on", "only-on-failure"]);
var CaptureModeSchema = zod.z.enum([
  "off",
  "on",
  "retain-on-failure",
  "on-first-retry"
]);
var VideoSizeSchema = zod.z.object({
  width: positiveInt,
  height: positiveInt
}).optional();
var ScreenshotsConfigSchema = zod.z.object({
  mode: ScreenshotModeSchema.default(DEFAULT_SCREENSHOT_MODE),
  fullPage: zod.z.boolean().default(DEFAULT_ARTIFACTS.screenshots.fullPage),
  maskPii: zod.z.boolean().default(DEFAULT_ARTIFACTS.screenshots.maskPii),
  piiSelectors: zod.z.array(zod.z.string()).default([])
});
var VideoConfigSchema = zod.z.object({
  mode: CaptureModeSchema.default(DEFAULT_CAPTURE_MODE),
  size: VideoSizeSchema
});
var TraceConfigSchema = zod.z.object({
  mode: CaptureModeSchema.default(DEFAULT_CAPTURE_MODE),
  screenshots: zod.z.boolean().default(true),
  snapshots: zod.z.boolean().default(true)
});
var ArtifactsConfigSchema = zod.z.object({
  outputDir: zod.z.string().default(DEFAULT_ARTIFACTS.outputDir),
  screenshots: ScreenshotsConfigSchema.default(DEFAULT_ARTIFACTS.screenshots),
  video: VideoConfigSchema.default(DEFAULT_ARTIFACTS.video),
  trace: TraceConfigSchema.default(DEFAULT_ARTIFACTS.trace)
});
var BrowserTypeSchema = zod.z.enum(["chromium", "firefox", "webkit"]);
var BrowserChannelSchema = zod.z.enum(["bundled", "msedge", "chrome", "chrome-beta", "chrome-dev"]);
var BrowserStrategySchema = zod.z.enum([
  "auto",
  "prefer-bundled",
  "prefer-system",
  "bundled-only",
  "system-only"
]);
var ViewportSizeSchema = zod.z.object({
  width: positiveInt,
  height: positiveInt
});
var BrowsersConfigSchema = zod.z.object({
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
var JourneyLayoutSchema = zod.z.enum(["flat", "staged"]);
var JourneyGroupBySchema = zod.z.enum(["tier", "status", "scope"]);
var JourneyIdConfigSchema = zod.z.object({
  prefix: zod.z.string().default(DEFAULT_JOURNEYS.id.prefix),
  width: positiveInt.default(DEFAULT_JOURNEYS.id.width)
});
var JourneyBacklogConfigSchema = zod.z.object({
  groupBy: JourneyGroupBySchema.default(DEFAULT_JOURNEYS.backlog.groupBy),
  thenBy: JourneyGroupBySchema.optional()
});
var JourneysConfigSchema = zod.z.object({
  id: JourneyIdConfigSchema.default(DEFAULT_JOURNEYS.id),
  layout: JourneyLayoutSchema.default(DEFAULT_JOURNEYS.layout),
  backlog: JourneyBacklogConfigSchema.default(DEFAULT_JOURNEYS.backlog)
});
var ARTKConfigSchema = zod.z.object({
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

// config/migrate.ts
var logger3 = createLogger("config", "migrate");
var MIGRATIONS = /* @__PURE__ */ new Map();
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
registerMigration({
  fromVersion: 0,
  toVersion: 1,
  description: "Add version field to legacy config",
  migrate: (config) => {
    return { ...config };
  }
});

// config/loader.ts
var logger4 = createLogger("config", "loader");
var cachedConfig = null;
var configFilePath = null;
var DEFAULT_CONFIG_PATH = "artk/artk.config.yml";
var CONFIG_FILE_NAMES = [
  "artk.config.yml",
  "artk.config.yaml",
  "artk.config.json"
];
function findConfigFile(baseDir = process.cwd()) {
  const defaultPath = path.join(baseDir, DEFAULT_CONFIG_PATH);
  if (fs.existsSync(defaultPath)) {
    return defaultPath;
  }
  const artkDir = path.join(baseDir, "artk");
  if (fs.existsSync(artkDir)) {
    for (const fileName of CONFIG_FILE_NAMES) {
      const filePath = path.join(artkDir, fileName);
      if (fs.existsSync(filePath)) {
        return filePath;
      }
    }
  }
  for (const fileName of CONFIG_FILE_NAMES) {
    const filePath = path.join(baseDir, fileName);
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }
  return void 0;
}
function loadYamlFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return yaml.parse(content);
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
    resolvedPath = path.resolve(baseDir, options.configPath);
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
function clearConfigCache() {
  cachedConfig = null;
  configFilePath = null;
  logger4.debug("Configuration cache cleared");
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
function getAppConfig() {
  return getConfig().app;
}
function getAuthConfig() {
  return getConfig().auth;
}
function getSelectorsConfig() {
  return getConfig().selectors;
}
function getAssertionsConfig() {
  return getConfig().assertions;
}
function getDataConfig() {
  return getConfig().data;
}
function getFixturesConfig() {
  return getConfig().fixtures;
}
function getTierConfig(tierName) {
  return getConfig().tiers[tierName];
}
function getTiersConfig() {
  return getConfig().tiers;
}
function getReportersConfig() {
  return getConfig().reporters;
}
function getArtifactsConfig() {
  return getConfig().artifacts;
}
function getBrowsersConfig() {
  return getConfig().browsers;
}
function getJourneysConfig() {
  return getConfig().journeys;
}
function getEnvironmentConfig(envName) {
  return getConfig().environments[envName];
}
function getEnvironmentsConfig() {
  return getConfig().environments;
}
function getBaseUrl(activeEnvironment) {
  const config = getConfig();
  const envName = activeEnvironment ?? config.activeEnvironment;
  const envConfig = config.environments[envName];
  if (envConfig?.baseUrl) {
    return envConfig.baseUrl;
  }
  return config.app.baseUrl;
}
function getApiUrl(activeEnvironment) {
  const config = getConfig();
  const envName = activeEnvironment ?? config.activeEnvironment;
  const envConfig = config.environments[envName];
  if (envConfig?.apiUrl) {
    return envConfig.apiUrl;
  }
  return config.data.api?.baseUrl;
}
function getStorageStateDir(baseDir) {
  const config = getConfig();
  const storageDir = config.auth.storageState.directory;
  const resolvedBaseDir = baseDir ?? (configFilePath ? path.dirname(configFilePath) : process.cwd());
  return path.resolve(resolvedBaseDir, storageDir);
}
function getStorageStatePath(role, env, baseDir) {
  const config = getConfig();
  const pattern = config.auth.storageState.filePattern;
  const envName = env ?? config.activeEnvironment;
  const fileName = pattern.replace("{role}", role).replace("{env}", envName);
  return path.join(getStorageStateDir(baseDir), fileName);
}

exports.ARTKConfigSchema = ARTKConfigSchema;
exports.AppConfigSchema = AppConfigSchema;
exports.ArtifactsConfigSchema = ArtifactsConfigSchema;
exports.ArtkReporterConfigSchema = ArtkReporterConfigSchema;
exports.AssertionsConfigSchema = AssertionsConfigSchema;
exports.AuthConfigSchema = AuthConfigSchema;
exports.BrowsersConfigSchema = BrowsersConfigSchema;
exports.CONFIG_FILE_NAMES = CONFIG_FILE_NAMES;
exports.CleanupConfigSchema = CleanupConfigSchema;
exports.CredentialsEnvConfigSchema = CredentialsEnvConfigSchema;
exports.DEFAULT_APP_TYPE = DEFAULT_APP_TYPE;
exports.DEFAULT_ARTIFACTS = DEFAULT_ARTIFACTS;
exports.DEFAULT_ASSERTIONS = DEFAULT_ASSERTIONS;
exports.DEFAULT_BROWSERS = DEFAULT_BROWSERS;
exports.DEFAULT_CALLBACK_MS = DEFAULT_CALLBACK_MS;
exports.DEFAULT_CAPTURE_MODE = DEFAULT_CAPTURE_MODE;
exports.DEFAULT_CONFIG_PATH = DEFAULT_CONFIG_PATH;
exports.DEFAULT_DATA = DEFAULT_DATA;
exports.DEFAULT_IDP_REDIRECT_MS = DEFAULT_IDP_REDIRECT_MS;
exports.DEFAULT_JOURNEYS = DEFAULT_JOURNEYS;
exports.DEFAULT_JOURNEY_ID_PREFIX = DEFAULT_JOURNEY_ID_PREFIX;
exports.DEFAULT_JOURNEY_ID_WIDTH = DEFAULT_JOURNEY_ID_WIDTH;
exports.DEFAULT_LOADING_TIMEOUT = DEFAULT_LOADING_TIMEOUT;
exports.DEFAULT_LOCATOR_STRATEGY = DEFAULT_LOCATOR_STRATEGY;
exports.DEFAULT_LOGIN_FLOW_MS = DEFAULT_LOGIN_FLOW_MS;
exports.DEFAULT_MFA_ENABLED = DEFAULT_MFA_ENABLED;
exports.DEFAULT_MFA_TYPE = DEFAULT_MFA_TYPE;
exports.DEFAULT_NAMESPACE_PREFIX = DEFAULT_NAMESPACE_PREFIX;
exports.DEFAULT_NAMESPACE_SUFFIX = DEFAULT_NAMESPACE_SUFFIX;
exports.DEFAULT_OIDC_SUCCESS_TIMEOUT = DEFAULT_OIDC_SUCCESS_TIMEOUT;
exports.DEFAULT_PUSH_TIMEOUT_MS = DEFAULT_PUSH_TIMEOUT_MS;
exports.DEFAULT_REPORTERS = DEFAULT_REPORTERS;
exports.DEFAULT_REPORTER_OPEN = DEFAULT_REPORTER_OPEN;
exports.DEFAULT_SCREENSHOT_MODE = DEFAULT_SCREENSHOT_MODE;
exports.DEFAULT_SELECTORS = DEFAULT_SELECTORS;
exports.DEFAULT_STORAGE_STATE = DEFAULT_STORAGE_STATE;
exports.DEFAULT_TEST_ID_ATTRIBUTE = DEFAULT_TEST_ID_ATTRIBUTE;
exports.DEFAULT_TIERS = DEFAULT_TIERS;
exports.DEFAULT_TOAST_TIMEOUT = DEFAULT_TOAST_TIMEOUT;
exports.DEFAULT_VIEWPORT_HEIGHT = DEFAULT_VIEWPORT_HEIGHT;
exports.DEFAULT_VIEWPORT_WIDTH = DEFAULT_VIEWPORT_WIDTH;
exports.DataApiConfigSchema = DataApiConfigSchema;
exports.DataConfigSchema = DataConfigSchema;
exports.EnvVarNotFoundError = EnvVarNotFoundError;
exports.EnvironmentConfigSchema = EnvironmentConfigSchema;
exports.EnvironmentsSchema = EnvironmentsSchema;
exports.FixturesApiConfigSchema = FixturesApiConfigSchema;
exports.FixturesConfigSchema = FixturesConfigSchema;
exports.FormAssertionConfigSchema = FormAssertionConfigSchema;
exports.FormAuthConfigSchema = FormAuthConfigSchema;
exports.FormAuthSelectorsSchema = FormAuthSelectorsSchema;
exports.FormAuthSuccessConfigSchema = FormAuthSuccessConfigSchema;
exports.HtmlReporterConfigSchema = HtmlReporterConfigSchema;
exports.JourneyBacklogConfigSchema = JourneyBacklogConfigSchema;
exports.JourneyIdConfigSchema = JourneyIdConfigSchema;
exports.JourneysConfigSchema = JourneysConfigSchema;
exports.JsonReporterConfigSchema = JsonReporterConfigSchema;
exports.JunitReporterConfigSchema = JunitReporterConfigSchema;
exports.LoadingAssertionConfigSchema = LoadingAssertionConfigSchema;
exports.MFAConfigSchema = MFAConfigSchema;
exports.NamespaceConfigSchema = NamespaceConfigSchema;
exports.OIDCConfigSchema = OIDCConfigSchema;
exports.OIDCIdpSelectorsSchema = OIDCIdpSelectorsSchema;
exports.OIDCLogoutConfigSchema = OIDCLogoutConfigSchema;
exports.OIDCSuccessConfigSchema = OIDCSuccessConfigSchema;
exports.OIDCTimeoutsSchema = OIDCTimeoutsSchema;
exports.ReportersConfigSchema = ReportersConfigSchema;
exports.RoleConfigSchema = RoleConfigSchema;
exports.RolesSchema = RolesSchema;
exports.SUPPORTED_CONFIG_VERSION = SUPPORTED_CONFIG_VERSION;
exports.ScreenshotsConfigSchema = ScreenshotsConfigSchema;
exports.SelectorsConfigSchema = SelectorsConfigSchema;
exports.StorageStateConfigSchema = StorageStateConfigSchema;
exports.TierConfigSchema = TierConfigSchema;
exports.TiersSchema = TiersSchema;
exports.ToastAssertionConfigSchema = ToastAssertionConfigSchema;
exports.TraceConfigSchema = TraceConfigSchema;
exports.VideoConfigSchema = VideoConfigSchema;
exports.VideoSizeSchema = VideoSizeSchema;
exports.ViewportSizeSchema = ViewportSizeSchema;
exports.clearConfigCache = clearConfigCache;
exports.createMissingEnvVarsError = createMissingEnvVarsError;
exports.findConfigFile = findConfigFile;
exports.findEnvVarRefs = findEnvVarRefs;
exports.formatZodError = formatZodError;
exports.getApiUrl = getApiUrl;
exports.getAppConfig = getAppConfig;
exports.getArtifactsConfig = getArtifactsConfig;
exports.getAssertionsConfig = getAssertionsConfig;
exports.getAuthConfig = getAuthConfig;
exports.getBaseUrl = getBaseUrl;
exports.getBrowsersConfig = getBrowsersConfig;
exports.getConfig = getConfig;
exports.getDataConfig = getDataConfig;
exports.getEnvironmentConfig = getEnvironmentConfig;
exports.getEnvironmentsConfig = getEnvironmentsConfig;
exports.getFixturesConfig = getFixturesConfig;
exports.getJourneysConfig = getJourneysConfig;
exports.getMissingEnvVars = getMissingEnvVars;
exports.getReportersConfig = getReportersConfig;
exports.getSelectorsConfig = getSelectorsConfig;
exports.getStorageStateDir = getStorageStateDir;
exports.getStorageStatePath = getStorageStatePath;
exports.getTierConfig = getTierConfig;
exports.getTiersConfig = getTiersConfig;
exports.hasEnvVarRefs = hasEnvVarRefs;
exports.isConfigLoaded = isConfigLoaded;
exports.loadConfig = loadConfig;
exports.loadYamlFile = loadYamlFile;
exports.parseEnvVarRef = parseEnvVarRef;
exports.resolveEnvVarRef = resolveEnvVarRef;
exports.resolveEnvVars = resolveEnvVars;
exports.resolveEnvVarsInObject = resolveEnvVarsInObject;
exports.zodErrorToConfigError = zodErrorToConfigError;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map