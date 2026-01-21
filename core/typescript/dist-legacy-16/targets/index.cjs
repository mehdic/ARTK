'use strict';

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// targets/target-resolver.ts
var TargetNotFoundError = class extends Error {
  constructor(targetName, availableTargets) {
    super(
      `Target "${targetName}" not found. Available targets: ${availableTargets.length > 0 ? availableTargets.join(", ") : "(none)"}`
    );
    this.targetName = targetName;
    this.availableTargets = availableTargets;
    this.name = "TargetNotFoundError";
  }
};
var EnvironmentNotFoundError = class extends Error {
  constructor(targetName, environment, availableEnvironments) {
    super(
      `Environment "${environment}" not found for target "${targetName}". Available environments: ${availableEnvironments.length > 0 ? availableEnvironments.join(", ") : "(none)"}`
    );
    this.targetName = targetName;
    this.environment = environment;
    this.availableEnvironments = availableEnvironments;
    this.name = "EnvironmentNotFoundError";
  }
};
var TargetResolver = class {
  constructor(config, options) {
    __publicField(this, "options");
    __publicField(this, "targetMap");
    this.options = {
      defaultTarget: options?.defaultTarget ?? config.defaults.target,
      defaultEnvironment: options?.defaultEnvironment ?? config.defaults.environment ?? "local",
      throwOnMissing: options?.throwOnMissing ?? true
    };
    this.targetMap = /* @__PURE__ */ new Map();
    for (const target of config.targets) {
      this.targetMap.set(target.name, target);
    }
  }
  /**
   * Resolves a target by name.
   *
   * @param targetName - Name of the target to resolve (or undefined for default)
   * @returns Resolved target
   * @throws TargetNotFoundError if target not found and throwOnMissing is true
   */
  resolve(targetName) {
    const name = targetName ?? this.options.defaultTarget;
    if (!name) {
      if (this.options.throwOnMissing) {
        throw new TargetNotFoundError("(default)", this.getTargetNames());
      }
      return null;
    }
    const configTarget = this.targetMap.get(name);
    if (!configTarget) {
      if (this.options.throwOnMissing) {
        throw new TargetNotFoundError(name, this.getTargetNames());
      }
      return null;
    }
    return this.toResolvedTarget(configTarget);
  }
  /**
   * Gets the URL for a target and environment.
   *
   * @param targetName - Target name (or undefined for default)
   * @param environment - Environment name (or undefined for default)
   * @returns Base URL for the target/environment
   * @throws TargetNotFoundError if target not found
   * @throws EnvironmentNotFoundError if environment not found
   */
  getUrl(targetName, environment) {
    const resolved = this.resolve(targetName);
    if (!resolved) {
      throw new TargetNotFoundError(
        targetName ?? "(default)",
        this.getTargetNames()
      );
    }
    const env = environment ?? this.options.defaultEnvironment;
    const envConfig = resolved.configTarget.environments[env];
    if (!envConfig) {
      throw new EnvironmentNotFoundError(
        resolved.name,
        env,
        resolved.availableEnvironments
      );
    }
    return envConfig.baseUrl;
  }
  /**
   * Gets all target names.
   */
  getTargetNames() {
    return Array.from(this.targetMap.keys());
  }
  /**
   * Gets all resolved targets.
   */
  getAllTargets() {
    return Array.from(this.targetMap.values()).map(
      (t) => this.toResolvedTarget(t)
    );
  }
  /**
   * Gets the default target.
   */
  getDefaultTarget() {
    if (!this.options.defaultTarget) {
      return null;
    }
    return this.resolve(this.options.defaultTarget);
  }
  /**
   * Checks if a target exists.
   */
  hasTarget(targetName) {
    return this.targetMap.has(targetName);
  }
  /**
   * Checks if an environment exists for a target.
   */
  hasEnvironment(targetName, environment) {
    const target = this.targetMap.get(targetName);
    if (!target) {
      return false;
    }
    return environment in target.environments;
  }
  /**
   * Gets all environments for a target.
   */
  getEnvironments(targetName) {
    const target = this.targetMap.get(targetName);
    if (!target) {
      return [];
    }
    return Object.keys(target.environments);
  }
  /**
   * Converts a config target to a resolved target.
   */
  toResolvedTarget(configTarget) {
    return {
      name: configTarget.name,
      path: configTarget.path,
      type: configTarget.type,
      description: configTarget.description,
      isDefault: configTarget.name === this.options.defaultTarget,
      availableEnvironments: Object.keys(configTarget.environments),
      environments: configTarget.environments,
      configTarget
    };
  }
};
function createTargetResolver(config, options) {
  return new TargetResolver(config, options);
}
function resolveTarget(config, targetName) {
  const resolver = new TargetResolver(config, { throwOnMissing: false });
  return resolver.resolve(targetName);
}
function getTargetUrl(config, targetName, environment) {
  const resolver = new TargetResolver(config);
  return resolver.getUrl(targetName, environment);
}
function getTargetNames(config) {
  return config.targets.map((t) => t.name);
}
function validateTargetEnvironments(config, requiredEnvironments) {
  const errors = [];
  for (const target of config.targets) {
    const available = Object.keys(target.environments);
    const missing = requiredEnvironments.filter(
      (env) => !available.includes(env)
    );
    if (missing.length > 0) {
      errors.push({ target: target.name, missing });
    }
  }
  return {
    valid: errors.length === 0,
    errors
  };
}
function configTargetToArtkTarget(configTarget, detectedBy = []) {
  return {
    name: configTarget.name,
    path: configTarget.path,
    type: configTarget.type,
    detected_by: detectedBy,
    description: configTarget.description
  };
}
function filterTargetsByType(config, type) {
  return config.targets.filter((t) => t.type === type);
}
function getTargetStorageStatePath(config, targetName, role = "default") {
  const storageStateDir = config.auth?.storageStateDir ?? ".auth-states";
  return `${storageStateDir}/${targetName}/${role}.json`;
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

// targets/config-generator.ts
var logger = createLogger("targets", "config-generator");
var DEFAULT_OPTIONS = {
  defaultEnvironment: "local",
  includeAuth: false,
  storageStateDir: ".auth-states",
  includeBrowserConfig: true,
  browsers: ["chromium"],
  browserChannel: "bundled",
  browserStrategy: "auto",
  includeTimeouts: true,
  includeComments: true
};
function generateArtkConfig(options) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const lines = [];
  if (opts.includeComments) {
    lines.push("# ARTK E2E Configuration");
    lines.push("# Generated by ARTK init");
    lines.push("# See: https://artk.dev/docs/config");
    lines.push("");
  }
  lines.push('schemaVersion: "2.0"');
  lines.push("");
  if (opts.includeComments) {
    lines.push("# Project metadata");
  }
  lines.push("project:");
  lines.push(`  name: ${opts.projectName}`);
  if (opts.projectDescription) {
    lines.push(`  description: ${quoteIfNeeded(opts.projectDescription)}`);
  }
  lines.push("");
  if (opts.includeComments) {
    lines.push("# Frontend targets to test");
  }
  lines.push("targets:");
  for (const target of opts.targets) {
    lines.push(`  - name: ${target.name}`);
    lines.push(`    path: ${target.path}`);
    lines.push(`    type: ${target.type}`);
    if (target.description) {
      lines.push(`    description: ${quoteIfNeeded(target.description)}`);
    }
    lines.push("    environments:");
    for (const [envName, envConfig] of Object.entries(target.environments)) {
      lines.push(`      ${envName}:`);
      lines.push(`        baseUrl: ${envConfig.baseUrl}`);
      if (envConfig.apiUrl) {
        lines.push(`        apiUrl: ${envConfig.apiUrl}`);
      }
    }
  }
  lines.push("");
  if (opts.includeComments) {
    lines.push("# Default settings");
  }
  lines.push("defaults:");
  lines.push(`  target: ${opts.defaultTarget || opts.targets[0]?.name || "default"}`);
  lines.push(`  environment: ${opts.defaultEnvironment}`);
  lines.push("");
  if (opts.includeAuth) {
    if (opts.includeComments) {
      lines.push("# Authentication configuration");
    }
    lines.push("auth:");
    lines.push("  enabled: true");
    lines.push(`  storageStateDir: ${opts.storageStateDir}`);
    lines.push("  roles:");
    lines.push("    default:");
    lines.push("      credentialsEnv:");
    lines.push("        username: ARTK_USERNAME");
    lines.push("        password: ARTK_PASSWORD");
    if (opts.includeComments) {
      lines.push("  # Uncomment for OIDC authentication:");
      lines.push("  # oidc:");
      lines.push("  #   idpType: keycloak");
      lines.push("  #   loginUrl: /auth/login");
      lines.push("  #   success:");
      lines.push("  #     url: /dashboard");
    }
    lines.push("");
  }
  if (opts.includeBrowserConfig) {
    if (opts.includeComments) {
      lines.push("# Browser configuration");
    }
    lines.push("browsers:");
    lines.push("  enabled:");
    for (const browser of opts.browsers || ["chromium"]) {
      lines.push(`    - ${browser}`);
    }
    lines.push(`  channel: ${opts.browserChannel}`);
    lines.push(`  strategy: ${opts.browserStrategy}`);
    lines.push("  headless: true");
    lines.push("");
  }
  if (opts.includeTimeouts) {
    if (opts.includeComments) {
      lines.push("# Timeout configuration (milliseconds)");
    }
    lines.push("timeouts:");
    lines.push("  default: 30000");
    lines.push("  navigation: 60000");
    lines.push("  auth: 120000");
    lines.push("");
  }
  return lines.join("\n");
}
function generateMinimalArtkConfig(projectName, targetPath, targetType = "react-spa") {
  return generateArtkConfig({
    projectName,
    targets: [
      {
        name: "main",
        path: targetPath,
        type: targetType,
        environments: {
          local: { baseUrl: "http://localhost:3000" }
        }
      }
    ],
    includeAuth: false,
    includeBrowserConfig: false,
    includeTimeouts: false,
    includeComments: false
  });
}
function generateConfigFromDetection(projectName, detectedTargets) {
  const targets = detectedTargets.map((target) => ({
    name: target.name,
    path: target.path,
    type: target.type,
    description: target.description,
    environments: {
      local: {
        baseUrl: "http://localhost:3000"
      },
      staging: {
        baseUrl: `https://staging.${target.name}.example.com`
      },
      production: {
        baseUrl: `https://${target.name}.example.com`
      }
    }
  }));
  return generateArtkConfig({
    projectName,
    targets,
    includeAuth: true,
    includeComments: true
  });
}
function isValidTargetName(name) {
  return /^[a-z][a-z0-9-]*$/.test(name);
}
function normalizeTargetName(dirName) {
  return dirName.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/^-+|-+$/g, "").replace(/-+/g, "-") || "app";
}
function quoteIfNeeded(value) {
  if (/[:#{}[\],&*?|<>=!%@`]/.test(value) || value.includes("\n")) {
    return `"${value.replace(/"/g, '\\"')}"`;
  }
  return value;
}
function generateEnvironmentUrls(baseUrl, targetName) {
  let url;
  try {
    url = new URL(baseUrl);
  } catch (error) {
    logger.warn("Invalid baseUrl provided, using default environment URLs", {
      baseUrl,
      targetName,
      error: error instanceof Error ? error.message : String(error)
    });
    return {
      local: { baseUrl: "http://localhost:3000" },
      staging: {
        baseUrl: `https://staging.${targetName}.example.com`
      },
      production: {
        baseUrl: `https://${targetName}.example.com`
      }
    };
  }
  const isLocalhost = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (isLocalhost) {
    return {
      local: { baseUrl },
      staging: {
        baseUrl: `https://staging.${targetName}.example.com`
      },
      production: {
        baseUrl: `https://${targetName}.example.com`
      }
    };
  }
  const domain = url.hostname.replace(/^(www|staging|dev)\./, "");
  return {
    local: {
      baseUrl: `http://localhost:${url.port || "3000"}`
    },
    staging: {
      baseUrl: `https://staging.${domain}`
    },
    production: {
      baseUrl: `https://${domain}`
    }
  };
}
function generateArtkConfigWithResult(options) {
  const warnings = [];
  const targets = options.targets ?? [];
  if (targets.length === 0) {
    warnings.push("No targets provided - configuration will have no frontend targets");
  }
  const normalizedTargets = targets.map((target) => {
    if (!isValidTargetName(target.name)) {
      const normalized = normalizeTargetName(target.name);
      warnings.push(
        `Target name "${target.name}" normalized to "${normalized}"`
      );
      return { ...target, name: normalized };
    }
    return target;
  });
  const names = normalizedTargets.map((t) => t.name);
  const duplicates = names.filter((name, i) => names.indexOf(name) !== i);
  if (duplicates.length > 0) {
    warnings.push(`Duplicate target names detected: ${duplicates.join(", ")}`);
  }
  if (normalizedTargets.length > 5) {
    warnings.push(
      `Target count (${normalizedTargets.length}) exceeds recommended limit of 5`
    );
  }
  const content = generateArtkConfig({
    ...options,
    targets: normalizedTargets
  });
  const defaultTarget = options.defaultTarget || normalizedTargets[0]?.name || "default";
  return {
    content,
    targetCount: normalizedTargets.length,
    defaultTarget,
    targetNames: normalizedTargets.map((t) => t.name),
    warnings
  };
}

// targets/index.ts
var TARGETS_MODULE_VERSION = "1.0.0";

exports.EnvironmentNotFoundError = EnvironmentNotFoundError;
exports.TARGETS_MODULE_VERSION = TARGETS_MODULE_VERSION;
exports.TargetNotFoundError = TargetNotFoundError;
exports.TargetResolver = TargetResolver;
exports.configTargetToArtkTarget = configTargetToArtkTarget;
exports.createTargetResolver = createTargetResolver;
exports.filterTargetsByType = filterTargetsByType;
exports.generateArtkConfig = generateArtkConfig;
exports.generateArtkConfigWithResult = generateArtkConfigWithResult;
exports.generateConfigFromDetection = generateConfigFromDetection;
exports.generateEnvironmentUrls = generateEnvironmentUrls;
exports.generateMinimalArtkConfig = generateMinimalArtkConfig;
exports.getTargetNames = getTargetNames;
exports.getTargetStorageStatePath = getTargetStorageStatePath;
exports.getTargetUrl = getTargetUrl;
exports.isValidTargetName = isValidTargetName;
exports.normalizeTargetName = normalizeTargetName;
exports.resolveTarget = resolveTarget;
exports.validateTargetEnvironments = validateTargetEnvironments;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map