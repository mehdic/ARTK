'use strict';

var zod = require('zod');

// types/target.ts
function isArtkTarget(value) {
  if (typeof value !== "object" || value === null) return false;
  const obj = value;
  return typeof obj.name === "string" && typeof obj.path === "string" && typeof obj.type === "string" && ["react-spa", "vue-spa", "angular", "next", "nuxt", "other"].includes(
    obj.type
  ) && Array.isArray(obj.detected_by) && obj.detected_by.every((s) => typeof s === "string");
}
function isValidTargetName(name) {
  return /^[a-z][a-z0-9-]*$/.test(name);
}
function isValidRelativePath(path) {
  return !path.startsWith("/") && !/(^|\/)\.\.(\/|$)/.test(path);
}
var CONTEXT_SCHEMA_VERSION = "1.0";
function isArtkContext(value) {
  if (typeof value !== "object" || value === null) return false;
  const obj = value;
  if (obj.version !== CONTEXT_SCHEMA_VERSION) return false;
  if (typeof obj.initialized_at !== "string") return false;
  if (typeof obj.project !== "object" || obj.project === null) return false;
  const project = obj.project;
  if (typeof project.name !== "string") return false;
  if (typeof project.root !== "string") return false;
  if (!Array.isArray(obj.targets)) return false;
  if (obj.targets.length < 1 || obj.targets.length > 5) return false;
  if (typeof obj.install !== "object" || obj.install === null) return false;
  const install = obj.install;
  if (typeof install.artk_core_version !== "string") return false;
  if (typeof install.playwright_version !== "string") return false;
  if (typeof install.script_path !== "string") return false;
  return true;
}
var MAX_TARGETS = 5;
var MIN_TARGETS = 1;
var ArtkTargetSchema = zod.z.object({
  name: zod.z.string().regex(/^[a-z][a-z0-9-]*$/),
  path: zod.z.string(),
  type: zod.z.enum(["react-spa", "vue-spa", "angular", "next", "nuxt", "other"]),
  detected_by: zod.z.array(zod.z.string()),
  description: zod.z.string().optional()
});
var PilotContextSchema = zod.z.object({
  project: zod.z.string(),
  phase: zod.z.enum([
    "discovery",
    "propose",
    "define",
    "implement",
    "validate",
    "verify"
  ]),
  lastCommand: zod.z.string(),
  lastCommandAt: zod.z.string()
});
var DetectedTargetSchema = zod.z.object({
  name: zod.z.string(),
  path: zod.z.string(),
  type: zod.z.enum(["react-spa", "vue-spa", "angular", "next", "nuxt", "other"]),
  confidence: zod.z.enum(["high", "medium", "low"]),
  signals: zod.z.array(zod.z.string())
});
var DiscoveryContextSchema = zod.z.object({
  routes: zod.z.array(
    zod.z.object({
      path: zod.z.string(),
      name: zod.z.string(),
      authRequired: zod.z.boolean(),
      roles: zod.z.array(zod.z.string()).optional()
    })
  ),
  components: zod.z.array(
    zod.z.object({
      name: zod.z.string(),
      path: zod.z.string(),
      type: zod.z.enum(["page", "layout", "form", "table", "modal"])
    })
  )
});
var JourneyStatsSchema = zod.z.object({
  proposed: zod.z.number().int().min(0),
  defined: zod.z.number().int().min(0),
  implemented: zod.z.number().int().min(0),
  verified: zod.z.number().int().min(0)
});
var ArtkContextSchemaBase = zod.z.object({
  version: zod.z.literal(CONTEXT_SCHEMA_VERSION),
  initialized_at: zod.z.string(),
  project: zod.z.object({
    name: zod.z.string(),
    root: zod.z.string()
  }),
  targets: zod.z.array(ArtkTargetSchema).min(1).max(5),
  install: zod.z.object({
    artk_core_version: zod.z.string(),
    playwright_version: zod.z.string(),
    script_path: zod.z.string()
  })
});
var ArtkContextExtendedSchema = ArtkContextSchemaBase.extend({
  pilot: PilotContextSchema.optional(),
  detectedTargets: zod.z.array(DetectedTargetSchema).optional(),
  discovery: DiscoveryContextSchema.optional(),
  journeys: JourneyStatsSchema.optional()
});
function validateArtkContextExtended(value) {
  const result = ArtkContextExtendedSchema.safeParse(value);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

// types/config.ts
var CONFIG_SCHEMA_VERSION = "2.0";
function isArtkConfig(value) {
  if (typeof value !== "object" || value === null) return false;
  const obj = value;
  if (obj.schemaVersion !== CONFIG_SCHEMA_VERSION) return false;
  if (typeof obj.project !== "object" || obj.project === null) return false;
  const project = obj.project;
  if (typeof project.name !== "string") return false;
  if (!Array.isArray(obj.targets)) return false;
  if (obj.targets.length < 1 || obj.targets.length > 5) return false;
  if (typeof obj.defaults !== "object" || obj.defaults === null) return false;
  const defaults = obj.defaults;
  if (typeof defaults.target !== "string") return false;
  if (typeof defaults.environment !== "string") return false;
  return true;
}
var DEFAULT_BROWSER_CONFIG = {
  enabled: ["chromium"],
  headless: true
};
var DEFAULT_TIMEOUT_CONFIG = {
  default: 3e4,
  navigation: 6e4,
  auth: 12e4
};

// types/auth.ts
function isArtkRole(value) {
  if (typeof value !== "object" || value === null) return false;
  const obj = value;
  if (typeof obj.credentialsEnv !== "object" || obj.credentialsEnv === null)
    return false;
  const creds = obj.credentialsEnv;
  if (typeof creds.username !== "string" || creds.username.length === 0)
    return false;
  if (typeof creds.password !== "string" || creds.password.length === 0)
    return false;
  if (obj.totpSecretEnv !== void 0 && typeof obj.totpSecretEnv !== "string") {
    return false;
  }
  if (obj.storageState !== void 0) {
    if (typeof obj.storageState !== "object" || obj.storageState === null) {
      return false;
    }
    const storage = obj.storageState;
    for (const [, v] of Object.entries(storage)) {
      if (typeof v !== "string") return false;
    }
  }
  return true;
}
function isValidEnvVarName(name) {
  return /^[A-Z][A-Z0-9_]*$/.test(name);
}
function isArtkAuthConfig(value) {
  if (typeof value !== "object" || value === null) return false;
  const obj = value;
  if (!["oidc", "saml", "basic", "custom"].includes(obj.provider)) {
    return false;
  }
  if (obj.idpType !== void 0) {
    if (!["keycloak", "auth0", "okta", "azure-ad", "other"].includes(
      obj.idpType
    )) {
      return false;
    }
  }
  if (typeof obj.storageStateDir !== "string") return false;
  if (typeof obj.environments !== "object" || obj.environments === null) {
    return false;
  }
  const envs = obj.environments;
  for (const [, env] of Object.entries(envs)) {
    if (typeof env !== "object" || env === null) return false;
    const envObj = env;
    if (typeof envObj.loginUrl !== "string") return false;
    if (envObj.logoutUrl !== void 0 && typeof envObj.logoutUrl !== "string") {
      return false;
    }
  }
  if (typeof obj.roles !== "object" || obj.roles === null) return false;
  const roles = obj.roles;
  for (const [, role] of Object.entries(roles)) {
    if (!isArtkRole(role)) return false;
  }
  return true;
}
var DEFAULT_STORAGE_STATE_DIR = ".auth-states";

// types/detection.ts
function isDetectionResult(value) {
  if (typeof value !== "object" || value === null) return false;
  const obj = value;
  if (typeof obj.path !== "string") return false;
  if (typeof obj.relativePath !== "string") return false;
  if (!["high", "medium", "low"].includes(obj.confidence)) {
    return false;
  }
  if (!["react-spa", "vue-spa", "angular", "next", "nuxt", "other"].includes(
    obj.type
  )) {
    return false;
  }
  if (!Array.isArray(obj.signals)) return false;
  if (!obj.signals.every((s) => typeof s === "string")) return false;
  if (typeof obj.score !== "number") return false;
  if (!Array.isArray(obj.detailedSignals)) return false;
  if (!obj.detailedSignals.every(
    (s) => typeof s === "object" && s !== null && typeof s.type === "string" && typeof s.source === "string" && typeof s.weight === "number"
  )) {
    return false;
  }
  return true;
}

// types/submodule.ts
function isSubmoduleStatus(value) {
  if (typeof value !== "object" || value === null) return false;
  const obj = value;
  if (typeof obj.path !== "string") return false;
  if (typeof obj.initialized !== "boolean") return false;
  if (obj.commit !== void 0 && typeof obj.commit !== "string") return false;
  if (obj.url !== void 0 && typeof obj.url !== "string") return false;
  if (obj.warning !== void 0 && typeof obj.warning !== "string") {
    return false;
  }
  return true;
}
function isSubmoduleScanResult(value) {
  if (typeof value !== "object" || value === null) return false;
  const obj = value;
  if (typeof obj.isSubmodule !== "boolean") return false;
  if (typeof obj.path !== "string") return false;
  if (obj.relativePath !== void 0 && typeof obj.relativePath !== "string") {
    return false;
  }
  if (obj.status !== void 0 && !isSubmoduleStatus(obj.status)) return false;
  if (obj.submodules !== void 0) {
    if (!Array.isArray(obj.submodules)) return false;
    if (!obj.submodules.every(isSubmoduleStatus)) return false;
  }
  if (obj.warnings !== void 0) {
    if (!Array.isArray(obj.warnings)) return false;
    if (!obj.warnings.every((w) => typeof w === "string")) return false;
  }
  return true;
}
function createEmptySubmoduleScanResult(dirPath) {
  return {
    isSubmodule: false,
    path: dirPath,
    submodules: [],
    warnings: []
  };
}
var nonEmptyString = zod.z.string().min(1, "Must not be empty");
var positiveIntMin = (min) => zod.z.number().int().min(min, `Must be at least ${min}`);
var kebabCaseId = zod.z.string().regex(
  /^[a-z][a-z0-9-]*$/,
  "Must be lowercase-kebab-case starting with a letter"
);
var relativePath = zod.z.string().refine((p) => !p.startsWith("/"), "Path must be relative (no leading /)").refine(
  (p) => !/(^|\/)\.\.($|\/)/.test(p),
  "Path must not contain .. escaping project root"
);
var envVarName = zod.z.string().regex(/^[A-Z][A-Z0-9_]*$/, "Must be UPPER_SNAKE_CASE");
var semver = zod.z.string().regex(
  /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/,
  "Must be valid semantic version (e.g., 1.0.0 or 1.0.0-beta.1)"
);
var urlString = zod.z.string().url("Must be a valid URL");
var ArtkTargetTypeSchema = zod.z.enum([
  "react-spa",
  "vue-spa",
  "angular",
  "next",
  "nuxt",
  "other"
]);
var ArtkTargetSchema2 = zod.z.object({
  /** Unique identifier, lowercase-kebab-case */
  name: kebabCaseId.describe("Unique target identifier"),
  /** Relative path to frontend directory from artk-e2e/ */
  path: relativePath.describe("Relative path to frontend"),
  /** Detected or specified application type */
  type: ArtkTargetTypeSchema,
  /** Signals that identified this target during detection */
  detected_by: zod.z.array(nonEmptyString).describe("Detection signals (e.g., package.json:react)"),
  /** Optional description */
  description: zod.z.string().optional()
});
var ArtkContextSchema = zod.z.object({
  /** Schema version for migration support */
  version: zod.z.literal(CONTEXT_SCHEMA_VERSION, {
    errorMap: () => ({
      message: `Context version must be "${CONTEXT_SCHEMA_VERSION}"`
    })
  }),
  /** When this context was created (ISO8601) */
  initialized_at: nonEmptyString.describe("ISO8601 timestamp"),
  /** Project metadata */
  project: zod.z.object({
    /** Human-readable project name */
    name: nonEmptyString,
    /** Relative path to project root from artk-e2e/ */
    root: relativePath
  }),
  /** Configured frontend targets (1-5 max) */
  targets: zod.z.array(ArtkTargetSchema2).min(MIN_TARGETS, `At least ${MIN_TARGETS} target required`).max(MAX_TARGETS, `Maximum ${MAX_TARGETS} targets allowed`),
  /** Installation metadata */
  install: zod.z.object({
    /** Semantic version of @artk/core */
    artk_core_version: semver,
    /** Semantic version of @playwright/test */
    playwright_version: semver,
    /** Path to the install script used */
    script_path: nonEmptyString
  })
}).superRefine((data, ctx) => {
  const names = data.targets.map((t) => t.name);
  const duplicates = names.filter((n, i) => names.indexOf(n) !== i);
  if (duplicates.length > 0) {
    ctx.addIssue({
      code: zod.z.ZodIssueCode.custom,
      message: `Duplicate target names: ${[...new Set(duplicates)].join(", ")}`,
      path: ["targets"]
    });
  }
});
var ArtkAuthProviderSchema = zod.z.enum([
  "oidc",
  "saml",
  "basic",
  "custom"
]);
var ArtkIdpTypeSchema = zod.z.enum([
  "keycloak",
  "auth0",
  "okta",
  "azure-ad",
  "other"
]);
var ArtkCredentialsEnvSchema = zod.z.object({
  username: envVarName.describe("Env var name for username"),
  password: envVarName.describe("Env var name for password")
});
var ArtkRoleSchema = zod.z.object({
  /** Environment variable names for credentials */
  credentialsEnv: ArtkCredentialsEnvSchema,
  /** TOTP secret environment variable (if MFA enabled) */
  totpSecretEnv: envVarName.optional(),
  /** Per-target storage state path overrides */
  storageState: zod.z.record(zod.z.string(), relativePath).optional()
});
var ArtkAuthEnvironmentUrlsSchema = zod.z.object({
  /** Login URL for this environment */
  loginUrl: urlString,
  /** Optional logout URL for this environment */
  logoutUrl: urlString.optional()
});
var ArtkAuthConfigSchema = zod.z.object({
  /** Authentication provider type */
  provider: ArtkAuthProviderSchema,
  /** Identity provider type (for OIDC provider) */
  idpType: ArtkIdpTypeSchema.optional(),
  /** Directory for storage states (relative to artk-e2e/) */
  storageStateDir: relativePath.default(".auth-states"),
  /** Per-environment authentication URLs */
  environments: zod.z.record(zod.z.string(), ArtkAuthEnvironmentUrlsSchema),
  /** Role definitions */
  roles: zod.z.record(zod.z.string(), ArtkRoleSchema).refine(
    (roles) => Object.keys(roles).length > 0,
    "At least one role must be defined"
  )
});
var ArtkEnvironmentUrlsSchema = zod.z.object({
  /** Base URL for the environment */
  baseUrl: urlString,
  /** Optional API URL if different from baseUrl */
  apiUrl: urlString.optional()
});
var ArtkConfigTargetSchema = zod.z.object({
  /** Unique identifier */
  name: kebabCaseId,
  /** Relative path to frontend directory */
  path: relativePath,
  /** Application type */
  type: ArtkTargetTypeSchema,
  /** Optional description */
  description: zod.z.string().optional(),
  /** Environment-specific URLs */
  environments: zod.z.record(zod.z.string(), ArtkEnvironmentUrlsSchema).refine(
    (envs) => Object.keys(envs).length > 0,
    "At least one environment must be defined"
  )
});
var ArtkBrowserTypeSchema = zod.z.enum(["chromium", "firefox", "webkit"]);
var ArtkBrowserConfigSchema = zod.z.object({
  /** Enabled browser types */
  enabled: zod.z.array(ArtkBrowserTypeSchema).min(1, "At least one browser required").default(["chromium"]),
  /** Whether to run in headless mode */
  headless: zod.z.boolean().default(true)
});
var ArtkTimeoutConfigSchema = zod.z.object({
  /** Default timeout for operations (ms) */
  default: positiveIntMin(1e3).default(3e4),
  /** Navigation timeout (ms) */
  navigation: positiveIntMin(1e3).default(6e4),
  /** Authentication timeout (ms) */
  auth: positiveIntMin(1e3).default(12e4)
});
var ArtkConfigSchema = zod.z.object({
  /** Schema version for backward compatibility */
  schemaVersion: zod.z.literal(CONFIG_SCHEMA_VERSION, {
    errorMap: () => ({
      message: `Config schema version must be "${CONFIG_SCHEMA_VERSION}"`
    })
  }),
  /** Project metadata */
  project: zod.z.object({
    /** Project name */
    name: nonEmptyString,
    /** Optional project description */
    description: zod.z.string().optional()
  }),
  /** Frontend targets with environment URLs */
  targets: zod.z.array(ArtkConfigTargetSchema).min(MIN_TARGETS, `At least ${MIN_TARGETS} target required`).max(MAX_TARGETS, `Maximum ${MAX_TARGETS} targets allowed`),
  /** Default settings */
  defaults: zod.z.object({
    /** Default target name (must match a targets[].name) */
    target: nonEmptyString,
    /** Default environment name (must exist in all targets' environments) */
    environment: nonEmptyString
  }),
  /** Optional authentication configuration */
  auth: ArtkAuthConfigSchema.optional(),
  /** Optional browser configuration */
  browsers: ArtkBrowserConfigSchema.optional(),
  /** Optional timeout configuration */
  timeouts: ArtkTimeoutConfigSchema.optional()
}).superRefine((data, ctx) => {
  const names = data.targets.map((t) => t.name);
  const duplicates = names.filter((n, i) => names.indexOf(n) !== i);
  if (duplicates.length > 0) {
    ctx.addIssue({
      code: zod.z.ZodIssueCode.custom,
      message: `Duplicate target names: ${[...new Set(duplicates)].join(", ")}`,
      path: ["targets"]
    });
  }
  if (!names.includes(data.defaults.target)) {
    ctx.addIssue({
      code: zod.z.ZodIssueCode.custom,
      message: `defaults.target "${data.defaults.target}" does not match any target. Available: ${names.join(", ")}`,
      path: ["defaults", "target"]
    });
  }
  for (const target of data.targets) {
    const envNames = Object.keys(target.environments);
    if (!envNames.includes(data.defaults.environment)) {
      ctx.addIssue({
        code: zod.z.ZodIssueCode.custom,
        message: `defaults.environment "${data.defaults.environment}" does not exist in target "${target.name}". Available: ${envNames.join(", ")}`,
        path: ["defaults", "environment"]
      });
    }
  }
});
var ArtkConfidenceLevelSchema = zod.z.enum(["high", "medium", "low"]);
var DetectionSignalSchema = zod.z.object({
  type: zod.z.enum([
    "package-dependency",
    "entry-file",
    "directory-name",
    "index-html",
    "config-file"
  ]),
  source: nonEmptyString,
  weight: zod.z.number(),
  description: zod.z.string().optional()
});
var DetectionResultSchema = zod.z.object({
  path: nonEmptyString,
  relativePath,
  confidence: ArtkConfidenceLevelSchema,
  type: ArtkTargetTypeSchema,
  signals: zod.z.array(nonEmptyString),
  score: zod.z.number(),
  detailedSignals: zod.z.array(DetectionSignalSchema).optional()
});
var SubmoduleStatusSchema = zod.z.object({
  path: nonEmptyString,
  initialized: zod.z.boolean(),
  commit: zod.z.string().optional(),
  url: urlString.optional(),
  warning: zod.z.string().optional()
});
var SubmoduleScanResultSchema = zod.z.object({
  hasSubmodules: zod.z.boolean(),
  submodules: zod.z.array(SubmoduleStatusSchema),
  warnings: zod.z.array(zod.z.string())
});
function validateArtkContext(data) {
  return ArtkContextSchema.parse(data);
}
function safeValidateArtkContext(data) {
  return ArtkContextSchema.safeParse(data);
}
function validateArtkConfig(data) {
  return ArtkConfigSchema.parse(data);
}
function safeValidateArtkConfig(data) {
  return ArtkConfigSchema.safeParse(data);
}

exports.ArtkAuthConfigSchema = ArtkAuthConfigSchema;
exports.ArtkAuthEnvironmentUrlsSchema = ArtkAuthEnvironmentUrlsSchema;
exports.ArtkAuthProviderSchema = ArtkAuthProviderSchema;
exports.ArtkBrowserConfigSchema = ArtkBrowserConfigSchema;
exports.ArtkBrowserTypeSchema = ArtkBrowserTypeSchema;
exports.ArtkConfidenceLevelSchema = ArtkConfidenceLevelSchema;
exports.ArtkConfigSchema = ArtkConfigSchema;
exports.ArtkConfigTargetSchema = ArtkConfigTargetSchema;
exports.ArtkContextExtendedSchema = ArtkContextExtendedSchema;
exports.ArtkContextSchema = ArtkContextSchema;
exports.ArtkCredentialsEnvSchema = ArtkCredentialsEnvSchema;
exports.ArtkEnvironmentUrlsSchema = ArtkEnvironmentUrlsSchema;
exports.ArtkIdpTypeSchema = ArtkIdpTypeSchema;
exports.ArtkRoleSchema = ArtkRoleSchema;
exports.ArtkTargetSchema = ArtkTargetSchema2;
exports.ArtkTargetTypeSchema = ArtkTargetTypeSchema;
exports.ArtkTimeoutConfigSchema = ArtkTimeoutConfigSchema;
exports.CONFIG_SCHEMA_VERSION = CONFIG_SCHEMA_VERSION;
exports.CONTEXT_SCHEMA_VERSION = CONTEXT_SCHEMA_VERSION;
exports.DEFAULT_BROWSER_CONFIG = DEFAULT_BROWSER_CONFIG;
exports.DEFAULT_STORAGE_STATE_DIR = DEFAULT_STORAGE_STATE_DIR;
exports.DEFAULT_TIMEOUT_CONFIG = DEFAULT_TIMEOUT_CONFIG;
exports.DetectedTargetSchema = DetectedTargetSchema;
exports.DetectionResultSchema = DetectionResultSchema;
exports.DetectionSignalSchema = DetectionSignalSchema;
exports.DiscoveryContextSchema = DiscoveryContextSchema;
exports.JourneyStatsSchema = JourneyStatsSchema;
exports.MAX_TARGETS = MAX_TARGETS;
exports.MIN_TARGETS = MIN_TARGETS;
exports.PilotContextSchema = PilotContextSchema;
exports.SubmoduleScanResultSchema = SubmoduleScanResultSchema;
exports.SubmoduleStatusSchema = SubmoduleStatusSchema;
exports.createEmptySubmoduleScanResult = createEmptySubmoduleScanResult;
exports.isArtkAuthConfig = isArtkAuthConfig;
exports.isArtkConfig = isArtkConfig;
exports.isArtkContext = isArtkContext;
exports.isArtkRole = isArtkRole;
exports.isArtkTarget = isArtkTarget;
exports.isDetectionResult = isDetectionResult;
exports.isSubmoduleScanResult = isSubmoduleScanResult;
exports.isSubmoduleStatus = isSubmoduleStatus;
exports.isValidEnvVarName = isValidEnvVarName;
exports.isValidRelativePath = isValidRelativePath;
exports.isValidTargetName = isValidTargetName;
exports.safeValidateArtkConfig = safeValidateArtkConfig;
exports.safeValidateArtkContext = safeValidateArtkContext;
exports.validateArtkConfig = validateArtkConfig;
exports.validateArtkContext = validateArtkContext;
exports.validateArtkContextExtended = validateArtkContextExtended;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map