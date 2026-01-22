"use strict";
/**
 * ARTK Configuration Module
 *
 * Provides config-driven test infrastructure setup through a single YAML file.
 *
 * Key Features:
 * - FR-001: Load configuration from artk/artk.config.yml file
 * - FR-002: Validate configuration against defined schema with detailed error messages
 * - FR-003: Resolve environment variables using ${VAR_NAME} and ${VAR_NAME:-default} syntax
 * - FR-004: Support named environment profiles switchable via ARTK_ENV
 * - FR-005: Provide typed access to all configuration sections
 *
 * @module config
 *
 * @example
 * ```typescript
 * import {
 *   loadConfig,
 *   getConfig,
 *   getAuthConfig,
 *   getBaseUrl,
 * } from '@artk/core/config';
 *
 * // Load configuration
 * const { config, activeEnvironment } = loadConfig();
 *
 * // Access typed configuration sections
 * const authConfig = getAuthConfig();
 * const baseUrl = getBaseUrl(activeEnvironment);
 *
 * console.log(`Testing ${config.app.name} at ${baseUrl}`);
 * ```
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MFAConfigSchema = exports.OIDCIdpSelectorsSchema = exports.OIDCSuccessConfigSchema = exports.OIDCConfigSchema = exports.RolesSchema = exports.RoleConfigSchema = exports.CredentialsEnvConfigSchema = exports.StorageStateConfigSchema = exports.AuthConfigSchema = exports.EnvironmentsSchema = exports.EnvironmentConfigSchema = exports.AppConfigSchema = exports.ARTKConfigSchema = exports.EnvVarNotFoundError = exports.createMissingEnvVarsError = exports.getMissingEnvVars = exports.resolveEnvVarsInObject = exports.resolveEnvVarRef = exports.resolveEnvVars = exports.hasEnvVarRefs = exports.findEnvVarRefs = exports.parseEnvVarRef = exports.CONFIG_FILE_NAMES = exports.DEFAULT_CONFIG_PATH = exports.getStorageStatePath = exports.getStorageStateDir = exports.getApiUrl = exports.getBaseUrl = exports.getEnvironmentsConfig = exports.getEnvironmentConfig = exports.getJourneysConfig = exports.getBrowsersConfig = exports.getArtifactsConfig = exports.getReportersConfig = exports.getTiersConfig = exports.getTierConfig = exports.getFixturesConfig = exports.getDataConfig = exports.getAssertionsConfig = exports.getSelectorsConfig = exports.getAuthConfig = exports.getAppConfig = exports.getConfig = exports.isConfigLoaded = exports.zodErrorToConfigError = exports.formatZodError = exports.loadYamlFile = exports.findConfigFile = exports.clearConfigCache = exports.loadConfig = void 0;
exports.DEFAULT_NAMESPACE_SUFFIX = exports.DEFAULT_NAMESPACE_PREFIX = exports.DEFAULT_ASSERTIONS = exports.DEFAULT_LOADING_TIMEOUT = exports.DEFAULT_TOAST_TIMEOUT = exports.DEFAULT_SELECTORS = exports.DEFAULT_TEST_ID_ATTRIBUTE = exports.DEFAULT_LOCATOR_STRATEGY = exports.DEFAULT_CALLBACK_MS = exports.DEFAULT_IDP_REDIRECT_MS = exports.DEFAULT_LOGIN_FLOW_MS = exports.DEFAULT_PUSH_TIMEOUT_MS = exports.DEFAULT_MFA_ENABLED = exports.DEFAULT_MFA_TYPE = exports.DEFAULT_OIDC_SUCCESS_TIMEOUT = exports.DEFAULT_STORAGE_STATE = exports.DEFAULT_APP_TYPE = exports.JourneyBacklogConfigSchema = exports.JourneyIdConfigSchema = exports.JourneysConfigSchema = exports.BrowsersConfigSchema = exports.ViewportSizeSchema = exports.VideoSizeSchema = exports.TraceConfigSchema = exports.VideoConfigSchema = exports.ScreenshotsConfigSchema = exports.ArtifactsConfigSchema = exports.ArtkReporterConfigSchema = exports.JunitReporterConfigSchema = exports.JsonReporterConfigSchema = exports.HtmlReporterConfigSchema = exports.ReportersConfigSchema = exports.TiersSchema = exports.TierConfigSchema = exports.FixturesApiConfigSchema = exports.FixturesConfigSchema = exports.DataApiConfigSchema = exports.CleanupConfigSchema = exports.NamespaceConfigSchema = exports.DataConfigSchema = exports.FormAssertionConfigSchema = exports.LoadingAssertionConfigSchema = exports.ToastAssertionConfigSchema = exports.AssertionsConfigSchema = exports.SelectorsConfigSchema = exports.FormAuthSuccessConfigSchema = exports.FormAuthSelectorsSchema = exports.FormAuthConfigSchema = exports.OIDCLogoutConfigSchema = exports.OIDCTimeoutsSchema = void 0;
exports.SUPPORTED_CONFIG_VERSION = exports.DEFAULT_JOURNEYS = exports.DEFAULT_JOURNEY_ID_WIDTH = exports.DEFAULT_JOURNEY_ID_PREFIX = exports.DEFAULT_BROWSERS = exports.DEFAULT_VIEWPORT_HEIGHT = exports.DEFAULT_VIEWPORT_WIDTH = exports.DEFAULT_ARTIFACTS = exports.DEFAULT_CAPTURE_MODE = exports.DEFAULT_SCREENSHOT_MODE = exports.DEFAULT_REPORTERS = exports.DEFAULT_REPORTER_OPEN = exports.DEFAULT_TIERS = exports.DEFAULT_DATA = void 0;
// =============================================================================
// Loader Exports
// =============================================================================
var loader_js_1 = require("./loader.js");
// Loading functions
Object.defineProperty(exports, "loadConfig", { enumerable: true, get: function () { return loader_js_1.loadConfig; } });
Object.defineProperty(exports, "clearConfigCache", { enumerable: true, get: function () { return loader_js_1.clearConfigCache; } });
Object.defineProperty(exports, "findConfigFile", { enumerable: true, get: function () { return loader_js_1.findConfigFile; } });
Object.defineProperty(exports, "loadYamlFile", { enumerable: true, get: function () { return loader_js_1.loadYamlFile; } });
Object.defineProperty(exports, "formatZodError", { enumerable: true, get: function () { return loader_js_1.formatZodError; } });
Object.defineProperty(exports, "zodErrorToConfigError", { enumerable: true, get: function () { return loader_js_1.zodErrorToConfigError; } });
// State checking
Object.defineProperty(exports, "isConfigLoaded", { enumerable: true, get: function () { return loader_js_1.isConfigLoaded; } });
// Accessors
Object.defineProperty(exports, "getConfig", { enumerable: true, get: function () { return loader_js_1.getConfig; } });
Object.defineProperty(exports, "getAppConfig", { enumerable: true, get: function () { return loader_js_1.getAppConfig; } });
Object.defineProperty(exports, "getAuthConfig", { enumerable: true, get: function () { return loader_js_1.getAuthConfig; } });
Object.defineProperty(exports, "getSelectorsConfig", { enumerable: true, get: function () { return loader_js_1.getSelectorsConfig; } });
Object.defineProperty(exports, "getAssertionsConfig", { enumerable: true, get: function () { return loader_js_1.getAssertionsConfig; } });
Object.defineProperty(exports, "getDataConfig", { enumerable: true, get: function () { return loader_js_1.getDataConfig; } });
Object.defineProperty(exports, "getFixturesConfig", { enumerable: true, get: function () { return loader_js_1.getFixturesConfig; } });
Object.defineProperty(exports, "getTierConfig", { enumerable: true, get: function () { return loader_js_1.getTierConfig; } });
Object.defineProperty(exports, "getTiersConfig", { enumerable: true, get: function () { return loader_js_1.getTiersConfig; } });
Object.defineProperty(exports, "getReportersConfig", { enumerable: true, get: function () { return loader_js_1.getReportersConfig; } });
Object.defineProperty(exports, "getArtifactsConfig", { enumerable: true, get: function () { return loader_js_1.getArtifactsConfig; } });
Object.defineProperty(exports, "getBrowsersConfig", { enumerable: true, get: function () { return loader_js_1.getBrowsersConfig; } });
Object.defineProperty(exports, "getJourneysConfig", { enumerable: true, get: function () { return loader_js_1.getJourneysConfig; } });
Object.defineProperty(exports, "getEnvironmentConfig", { enumerable: true, get: function () { return loader_js_1.getEnvironmentConfig; } });
Object.defineProperty(exports, "getEnvironmentsConfig", { enumerable: true, get: function () { return loader_js_1.getEnvironmentsConfig; } });
Object.defineProperty(exports, "getBaseUrl", { enumerable: true, get: function () { return loader_js_1.getBaseUrl; } });
Object.defineProperty(exports, "getApiUrl", { enumerable: true, get: function () { return loader_js_1.getApiUrl; } });
Object.defineProperty(exports, "getStorageStateDir", { enumerable: true, get: function () { return loader_js_1.getStorageStateDir; } });
Object.defineProperty(exports, "getStorageStatePath", { enumerable: true, get: function () { return loader_js_1.getStorageStatePath; } });
// Constants
Object.defineProperty(exports, "DEFAULT_CONFIG_PATH", { enumerable: true, get: function () { return loader_js_1.DEFAULT_CONFIG_PATH; } });
Object.defineProperty(exports, "CONFIG_FILE_NAMES", { enumerable: true, get: function () { return loader_js_1.CONFIG_FILE_NAMES; } });
// =============================================================================
// Environment Variable Exports
// =============================================================================
var env_js_1 = require("./env.js");
// Parsing
Object.defineProperty(exports, "parseEnvVarRef", { enumerable: true, get: function () { return env_js_1.parseEnvVarRef; } });
Object.defineProperty(exports, "findEnvVarRefs", { enumerable: true, get: function () { return env_js_1.findEnvVarRefs; } });
Object.defineProperty(exports, "hasEnvVarRefs", { enumerable: true, get: function () { return env_js_1.hasEnvVarRefs; } });
// Resolution
Object.defineProperty(exports, "resolveEnvVars", { enumerable: true, get: function () { return env_js_1.resolveEnvVars; } });
Object.defineProperty(exports, "resolveEnvVarRef", { enumerable: true, get: function () { return env_js_1.resolveEnvVarRef; } });
Object.defineProperty(exports, "resolveEnvVarsInObject", { enumerable: true, get: function () { return env_js_1.resolveEnvVarsInObject; } });
// Validation
Object.defineProperty(exports, "getMissingEnvVars", { enumerable: true, get: function () { return env_js_1.getMissingEnvVars; } });
Object.defineProperty(exports, "createMissingEnvVarsError", { enumerable: true, get: function () { return env_js_1.createMissingEnvVarsError; } });
// Error types
Object.defineProperty(exports, "EnvVarNotFoundError", { enumerable: true, get: function () { return env_js_1.EnvVarNotFoundError; } });
// =============================================================================
// Schema Exports
// =============================================================================
var schema_js_1 = require("./schema.js");
// Root schema
Object.defineProperty(exports, "ARTKConfigSchema", { enumerable: true, get: function () { return schema_js_1.ARTKConfigSchema; } });
// Section schemas
Object.defineProperty(exports, "AppConfigSchema", { enumerable: true, get: function () { return schema_js_1.AppConfigSchema; } });
Object.defineProperty(exports, "EnvironmentConfigSchema", { enumerable: true, get: function () { return schema_js_1.EnvironmentConfigSchema; } });
Object.defineProperty(exports, "EnvironmentsSchema", { enumerable: true, get: function () { return schema_js_1.EnvironmentsSchema; } });
Object.defineProperty(exports, "AuthConfigSchema", { enumerable: true, get: function () { return schema_js_1.AuthConfigSchema; } });
Object.defineProperty(exports, "StorageStateConfigSchema", { enumerable: true, get: function () { return schema_js_1.StorageStateConfigSchema; } });
Object.defineProperty(exports, "CredentialsEnvConfigSchema", { enumerable: true, get: function () { return schema_js_1.CredentialsEnvConfigSchema; } });
Object.defineProperty(exports, "RoleConfigSchema", { enumerable: true, get: function () { return schema_js_1.RoleConfigSchema; } });
Object.defineProperty(exports, "RolesSchema", { enumerable: true, get: function () { return schema_js_1.RolesSchema; } });
Object.defineProperty(exports, "OIDCConfigSchema", { enumerable: true, get: function () { return schema_js_1.OIDCConfigSchema; } });
Object.defineProperty(exports, "OIDCSuccessConfigSchema", { enumerable: true, get: function () { return schema_js_1.OIDCSuccessConfigSchema; } });
Object.defineProperty(exports, "OIDCIdpSelectorsSchema", { enumerable: true, get: function () { return schema_js_1.OIDCIdpSelectorsSchema; } });
Object.defineProperty(exports, "MFAConfigSchema", { enumerable: true, get: function () { return schema_js_1.MFAConfigSchema; } });
Object.defineProperty(exports, "OIDCTimeoutsSchema", { enumerable: true, get: function () { return schema_js_1.OIDCTimeoutsSchema; } });
Object.defineProperty(exports, "OIDCLogoutConfigSchema", { enumerable: true, get: function () { return schema_js_1.OIDCLogoutConfigSchema; } });
Object.defineProperty(exports, "FormAuthConfigSchema", { enumerable: true, get: function () { return schema_js_1.FormAuthConfigSchema; } });
Object.defineProperty(exports, "FormAuthSelectorsSchema", { enumerable: true, get: function () { return schema_js_1.FormAuthSelectorsSchema; } });
Object.defineProperty(exports, "FormAuthSuccessConfigSchema", { enumerable: true, get: function () { return schema_js_1.FormAuthSuccessConfigSchema; } });
Object.defineProperty(exports, "SelectorsConfigSchema", { enumerable: true, get: function () { return schema_js_1.SelectorsConfigSchema; } });
Object.defineProperty(exports, "AssertionsConfigSchema", { enumerable: true, get: function () { return schema_js_1.AssertionsConfigSchema; } });
Object.defineProperty(exports, "ToastAssertionConfigSchema", { enumerable: true, get: function () { return schema_js_1.ToastAssertionConfigSchema; } });
Object.defineProperty(exports, "LoadingAssertionConfigSchema", { enumerable: true, get: function () { return schema_js_1.LoadingAssertionConfigSchema; } });
Object.defineProperty(exports, "FormAssertionConfigSchema", { enumerable: true, get: function () { return schema_js_1.FormAssertionConfigSchema; } });
Object.defineProperty(exports, "DataConfigSchema", { enumerable: true, get: function () { return schema_js_1.DataConfigSchema; } });
Object.defineProperty(exports, "NamespaceConfigSchema", { enumerable: true, get: function () { return schema_js_1.NamespaceConfigSchema; } });
Object.defineProperty(exports, "CleanupConfigSchema", { enumerable: true, get: function () { return schema_js_1.CleanupConfigSchema; } });
Object.defineProperty(exports, "DataApiConfigSchema", { enumerable: true, get: function () { return schema_js_1.DataApiConfigSchema; } });
Object.defineProperty(exports, "FixturesConfigSchema", { enumerable: true, get: function () { return schema_js_1.FixturesConfigSchema; } });
Object.defineProperty(exports, "FixturesApiConfigSchema", { enumerable: true, get: function () { return schema_js_1.FixturesApiConfigSchema; } });
Object.defineProperty(exports, "TierConfigSchema", { enumerable: true, get: function () { return schema_js_1.TierConfigSchema; } });
Object.defineProperty(exports, "TiersSchema", { enumerable: true, get: function () { return schema_js_1.TiersSchema; } });
Object.defineProperty(exports, "ReportersConfigSchema", { enumerable: true, get: function () { return schema_js_1.ReportersConfigSchema; } });
Object.defineProperty(exports, "HtmlReporterConfigSchema", { enumerable: true, get: function () { return schema_js_1.HtmlReporterConfigSchema; } });
Object.defineProperty(exports, "JsonReporterConfigSchema", { enumerable: true, get: function () { return schema_js_1.JsonReporterConfigSchema; } });
Object.defineProperty(exports, "JunitReporterConfigSchema", { enumerable: true, get: function () { return schema_js_1.JunitReporterConfigSchema; } });
Object.defineProperty(exports, "ArtkReporterConfigSchema", { enumerable: true, get: function () { return schema_js_1.ArtkReporterConfigSchema; } });
Object.defineProperty(exports, "ArtifactsConfigSchema", { enumerable: true, get: function () { return schema_js_1.ArtifactsConfigSchema; } });
Object.defineProperty(exports, "ScreenshotsConfigSchema", { enumerable: true, get: function () { return schema_js_1.ScreenshotsConfigSchema; } });
Object.defineProperty(exports, "VideoConfigSchema", { enumerable: true, get: function () { return schema_js_1.VideoConfigSchema; } });
Object.defineProperty(exports, "TraceConfigSchema", { enumerable: true, get: function () { return schema_js_1.TraceConfigSchema; } });
Object.defineProperty(exports, "VideoSizeSchema", { enumerable: true, get: function () { return schema_js_1.VideoSizeSchema; } });
Object.defineProperty(exports, "ViewportSizeSchema", { enumerable: true, get: function () { return schema_js_1.ViewportSizeSchema; } });
Object.defineProperty(exports, "BrowsersConfigSchema", { enumerable: true, get: function () { return schema_js_1.BrowsersConfigSchema; } });
Object.defineProperty(exports, "JourneysConfigSchema", { enumerable: true, get: function () { return schema_js_1.JourneysConfigSchema; } });
Object.defineProperty(exports, "JourneyIdConfigSchema", { enumerable: true, get: function () { return schema_js_1.JourneyIdConfigSchema; } });
Object.defineProperty(exports, "JourneyBacklogConfigSchema", { enumerable: true, get: function () { return schema_js_1.JourneyBacklogConfigSchema; } });
// =============================================================================
// Defaults Exports
// =============================================================================
var defaults_js_1 = require("./defaults.js");
// Application defaults
Object.defineProperty(exports, "DEFAULT_APP_TYPE", { enumerable: true, get: function () { return defaults_js_1.DEFAULT_APP_TYPE; } });
// Storage state defaults
Object.defineProperty(exports, "DEFAULT_STORAGE_STATE", { enumerable: true, get: function () { return defaults_js_1.DEFAULT_STORAGE_STATE; } });
// OIDC defaults
Object.defineProperty(exports, "DEFAULT_OIDC_SUCCESS_TIMEOUT", { enumerable: true, get: function () { return defaults_js_1.DEFAULT_OIDC_SUCCESS_TIMEOUT; } });
Object.defineProperty(exports, "DEFAULT_MFA_TYPE", { enumerable: true, get: function () { return defaults_js_1.DEFAULT_MFA_TYPE; } });
Object.defineProperty(exports, "DEFAULT_MFA_ENABLED", { enumerable: true, get: function () { return defaults_js_1.DEFAULT_MFA_ENABLED; } });
Object.defineProperty(exports, "DEFAULT_PUSH_TIMEOUT_MS", { enumerable: true, get: function () { return defaults_js_1.DEFAULT_PUSH_TIMEOUT_MS; } });
Object.defineProperty(exports, "DEFAULT_LOGIN_FLOW_MS", { enumerable: true, get: function () { return defaults_js_1.DEFAULT_LOGIN_FLOW_MS; } });
Object.defineProperty(exports, "DEFAULT_IDP_REDIRECT_MS", { enumerable: true, get: function () { return defaults_js_1.DEFAULT_IDP_REDIRECT_MS; } });
Object.defineProperty(exports, "DEFAULT_CALLBACK_MS", { enumerable: true, get: function () { return defaults_js_1.DEFAULT_CALLBACK_MS; } });
// Selector defaults
Object.defineProperty(exports, "DEFAULT_LOCATOR_STRATEGY", { enumerable: true, get: function () { return defaults_js_1.DEFAULT_LOCATOR_STRATEGY; } });
Object.defineProperty(exports, "DEFAULT_TEST_ID_ATTRIBUTE", { enumerable: true, get: function () { return defaults_js_1.DEFAULT_TEST_ID_ATTRIBUTE; } });
Object.defineProperty(exports, "DEFAULT_SELECTORS", { enumerable: true, get: function () { return defaults_js_1.DEFAULT_SELECTORS; } });
// Assertion defaults
Object.defineProperty(exports, "DEFAULT_TOAST_TIMEOUT", { enumerable: true, get: function () { return defaults_js_1.DEFAULT_TOAST_TIMEOUT; } });
Object.defineProperty(exports, "DEFAULT_LOADING_TIMEOUT", { enumerable: true, get: function () { return defaults_js_1.DEFAULT_LOADING_TIMEOUT; } });
Object.defineProperty(exports, "DEFAULT_ASSERTIONS", { enumerable: true, get: function () { return defaults_js_1.DEFAULT_ASSERTIONS; } });
// Data defaults
Object.defineProperty(exports, "DEFAULT_NAMESPACE_PREFIX", { enumerable: true, get: function () { return defaults_js_1.DEFAULT_NAMESPACE_PREFIX; } });
Object.defineProperty(exports, "DEFAULT_NAMESPACE_SUFFIX", { enumerable: true, get: function () { return defaults_js_1.DEFAULT_NAMESPACE_SUFFIX; } });
Object.defineProperty(exports, "DEFAULT_DATA", { enumerable: true, get: function () { return defaults_js_1.DEFAULT_DATA; } });
// Tier defaults
Object.defineProperty(exports, "DEFAULT_TIERS", { enumerable: true, get: function () { return defaults_js_1.DEFAULT_TIERS; } });
// Reporter defaults
Object.defineProperty(exports, "DEFAULT_REPORTER_OPEN", { enumerable: true, get: function () { return defaults_js_1.DEFAULT_REPORTER_OPEN; } });
Object.defineProperty(exports, "DEFAULT_REPORTERS", { enumerable: true, get: function () { return defaults_js_1.DEFAULT_REPORTERS; } });
// Artifact defaults
Object.defineProperty(exports, "DEFAULT_SCREENSHOT_MODE", { enumerable: true, get: function () { return defaults_js_1.DEFAULT_SCREENSHOT_MODE; } });
Object.defineProperty(exports, "DEFAULT_CAPTURE_MODE", { enumerable: true, get: function () { return defaults_js_1.DEFAULT_CAPTURE_MODE; } });
Object.defineProperty(exports, "DEFAULT_ARTIFACTS", { enumerable: true, get: function () { return defaults_js_1.DEFAULT_ARTIFACTS; } });
// Browser defaults
Object.defineProperty(exports, "DEFAULT_VIEWPORT_WIDTH", { enumerable: true, get: function () { return defaults_js_1.DEFAULT_VIEWPORT_WIDTH; } });
Object.defineProperty(exports, "DEFAULT_VIEWPORT_HEIGHT", { enumerable: true, get: function () { return defaults_js_1.DEFAULT_VIEWPORT_HEIGHT; } });
Object.defineProperty(exports, "DEFAULT_BROWSERS", { enumerable: true, get: function () { return defaults_js_1.DEFAULT_BROWSERS; } });
// Journey defaults
Object.defineProperty(exports, "DEFAULT_JOURNEY_ID_PREFIX", { enumerable: true, get: function () { return defaults_js_1.DEFAULT_JOURNEY_ID_PREFIX; } });
Object.defineProperty(exports, "DEFAULT_JOURNEY_ID_WIDTH", { enumerable: true, get: function () { return defaults_js_1.DEFAULT_JOURNEY_ID_WIDTH; } });
Object.defineProperty(exports, "DEFAULT_JOURNEYS", { enumerable: true, get: function () { return defaults_js_1.DEFAULT_JOURNEYS; } });
// Version
Object.defineProperty(exports, "SUPPORTED_CONFIG_VERSION", { enumerable: true, get: function () { return defaults_js_1.SUPPORTED_CONFIG_VERSION; } });
//# sourceMappingURL=index.js.map