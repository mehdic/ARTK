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

// =============================================================================
// Type Exports
// =============================================================================

export type {
  // Root configuration
  ARTKConfig,

  // Application
  AppConfig,
  AppType,

  // Environment
  EnvironmentConfig,

  // Authentication
  AuthConfig,
  AuthProviderType,
  StorageStateConfig,
  RoleConfig,
  CredentialsEnvConfig,

  // OIDC
  OIDCConfig,
  OIDCIdpType,
  OIDCSuccessConfig,
  OIDCIdpSelectors,
  OIDCTimeouts,
  OIDCLogoutConfig,
  MFAConfig,
  MFAType,

  // Form Auth
  FormAuthConfig,
  FormAuthSelectors,
  FormAuthSuccessConfig,

  // Selectors
  SelectorsConfig,
  LocatorStrategy,

  // Assertions
  AssertionsConfig,
  ToastAssertionConfig,
  LoadingAssertionConfig,
  FormAssertionConfig,

  // Data
  DataConfig,
  NamespaceConfig,
  CleanupConfig,
  DataApiConfig,

  // Fixtures
  FixturesConfig,
  FixturesApiConfig,

  // Tiers
  TierConfig,

  // Reporters
  ReportersConfig,
  HtmlReporterConfig,
  JsonReporterConfig,
  JunitReporterConfig,
  ArtkReporterConfig,
  ReporterOpenMode,

  // Artifacts
  ArtifactsConfig,
  ScreenshotsConfig,
  VideoConfig,
  TraceConfig,
  VideoSize,
  ScreenshotMode,
  CaptureMode,

  // Browsers
  BrowsersConfig,
  BrowserType,
  ViewportSize,

  // Journeys
  JourneysConfig,
  JourneyIdConfig,
  JourneyBacklogConfig,
  JourneyLayout,
  JourneyGroupBy,
} from './types.js';

// =============================================================================
// Loader Exports
// =============================================================================

export {
  // Loading functions
  loadConfig,
  clearConfigCache,
  findConfigFile,
  loadYamlFile,
  formatZodError,
  zodErrorToConfigError,

  // State checking
  isConfigLoaded,

  // Accessors
  getConfig,
  getAppConfig,
  getAuthConfig,
  getSelectorsConfig,
  getAssertionsConfig,
  getDataConfig,
  getFixturesConfig,
  getTierConfig,
  getTiersConfig,
  getReportersConfig,
  getArtifactsConfig,
  getBrowsersConfig,
  getJourneysConfig,
  getEnvironmentConfig,
  getEnvironmentsConfig,
  getBaseUrl,
  getApiUrl,
  getStorageStateDir,
  getStorageStatePath,

  // Constants
  DEFAULT_CONFIG_PATH,
  CONFIG_FILE_NAMES,

  // Types
  type LoadConfigOptions,
  type LoadConfigResult,
} from './loader.js';

// =============================================================================
// Environment Variable Exports
// =============================================================================

export {
  // Parsing
  parseEnvVarRef,
  findEnvVarRefs,
  hasEnvVarRefs,

  // Resolution
  resolveEnvVars,
  resolveEnvVarRef,
  resolveEnvVarsInObject,

  // Validation
  getMissingEnvVars,
  createMissingEnvVarsError,

  // Error types
  EnvVarNotFoundError,

  // Types
  type EnvVarRef,
  type ResolveOptions,
} from './env.js';

// =============================================================================
// Schema Exports
// =============================================================================

export {
  // Root schema
  ARTKConfigSchema,

  // Section schemas
  AppConfigSchema,
  EnvironmentConfigSchema,
  EnvironmentsSchema,
  AuthConfigSchema,
  StorageStateConfigSchema,
  CredentialsEnvConfigSchema,
  RoleConfigSchema,
  RolesSchema,
  OIDCConfigSchema,
  OIDCSuccessConfigSchema,
  OIDCIdpSelectorsSchema,
  MFAConfigSchema,
  OIDCTimeoutsSchema,
  OIDCLogoutConfigSchema,
  FormAuthConfigSchema,
  FormAuthSelectorsSchema,
  FormAuthSuccessConfigSchema,
  SelectorsConfigSchema,
  AssertionsConfigSchema,
  ToastAssertionConfigSchema,
  LoadingAssertionConfigSchema,
  FormAssertionConfigSchema,
  DataConfigSchema,
  NamespaceConfigSchema,
  CleanupConfigSchema,
  DataApiConfigSchema,
  FixturesConfigSchema,
  FixturesApiConfigSchema,
  TierConfigSchema,
  TiersSchema,
  ReportersConfigSchema,
  HtmlReporterConfigSchema,
  JsonReporterConfigSchema,
  JunitReporterConfigSchema,
  ArtkReporterConfigSchema,
  ArtifactsConfigSchema,
  ScreenshotsConfigSchema,
  VideoConfigSchema,
  TraceConfigSchema,
  VideoSizeSchema,
  ViewportSizeSchema,
  BrowsersConfigSchema,
  JourneysConfigSchema,
  JourneyIdConfigSchema,
  JourneyBacklogConfigSchema,

  // Inferred types
  type ARTKConfigInput,
  type ARTKConfigOutput,
} from './schema.js';

// =============================================================================
// Defaults Exports
// =============================================================================

export {
  // Application defaults
  DEFAULT_APP_TYPE,

  // Storage state defaults
  DEFAULT_STORAGE_STATE,

  // OIDC defaults
  DEFAULT_OIDC_SUCCESS_TIMEOUT,
  DEFAULT_MFA_TYPE,
  DEFAULT_MFA_ENABLED,
  DEFAULT_PUSH_TIMEOUT_MS,
  DEFAULT_LOGIN_FLOW_MS,
  DEFAULT_IDP_REDIRECT_MS,
  DEFAULT_CALLBACK_MS,

  // Selector defaults
  DEFAULT_LOCATOR_STRATEGY,
  DEFAULT_TEST_ID_ATTRIBUTE,
  DEFAULT_SELECTORS,

  // Assertion defaults
  DEFAULT_TOAST_TIMEOUT,
  DEFAULT_LOADING_TIMEOUT,
  DEFAULT_ASSERTIONS,

  // Data defaults
  DEFAULT_NAMESPACE_PREFIX,
  DEFAULT_NAMESPACE_SUFFIX,
  DEFAULT_DATA,

  // Tier defaults
  DEFAULT_TIERS,

  // Reporter defaults
  DEFAULT_REPORTER_OPEN,
  DEFAULT_REPORTERS,

  // Artifact defaults
  DEFAULT_SCREENSHOT_MODE,
  DEFAULT_CAPTURE_MODE,
  DEFAULT_ARTIFACTS,

  // Browser defaults
  DEFAULT_VIEWPORT_WIDTH,
  DEFAULT_VIEWPORT_HEIGHT,
  DEFAULT_BROWSERS,

  // Journey defaults
  DEFAULT_JOURNEY_ID_PREFIX,
  DEFAULT_JOURNEY_ID_WIDTH,
  DEFAULT_JOURNEYS,

  // Version
  SUPPORTED_CONFIG_VERSION,
} from './defaults.js';
