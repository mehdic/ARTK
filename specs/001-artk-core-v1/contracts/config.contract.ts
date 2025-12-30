/**
 * Config Module API Contract
 *
 * This contract defines the public API for the ARTK Config module.
 * Implementation must satisfy these type signatures.
 */

// =============================================================================
// Types
// =============================================================================

export interface ARTKConfig {
  version: number;
  app: AppConfig;
  environments: Record<string, EnvironmentConfig>;
  activeEnvironment: string;
  auth: AuthConfig;
  selectors: SelectorsConfig;
  assertions: AssertionsConfig;
  data: DataConfig;
  fixtures: FixturesConfig;
  tiers: Record<string, TierConfig>;
  reporters: ReportersConfig;
  artifacts: ArtifactsConfig;
  browsers: BrowsersConfig;
  journeys: JourneysConfig;
}

export interface AppConfig {
  name: string;
  baseUrl: string;
  type: 'spa' | 'ssr' | 'hybrid';
}

export interface EnvironmentConfig {
  baseUrl: string;
  apiUrl?: string;
}

export interface AuthConfig {
  provider: 'oidc' | 'form' | 'token' | 'custom';
  storageState: StorageStateConfig;
  roles: Record<string, RoleConfig>;
  oidc?: OIDCConfig;
  form?: FormAuthConfig;
}

export interface StorageStateConfig {
  directory: string;
  maxAgeMinutes: number;
  filePattern: string;
}

export interface RoleConfig {
  credentialsEnv: {
    username: string;
    password: string;
  };
  description?: string;
  oidcOverrides?: Partial<OIDCConfig>;
}

export interface OIDCConfig {
  idpType: 'keycloak' | 'azure-ad' | 'okta' | 'auth0' | 'generic';
  loginUrl: string;
  idpLoginUrl?: string;
  success: {
    url?: string;
    selector?: string;
    timeout?: number;
  };
  idpSelectors?: {
    username?: string;
    password?: string;
    submit?: string;
    staySignedInNo?: string;
  };
  mfa?: MFAConfig;
  timeouts?: {
    loginFlowMs?: number;
    idpRedirectMs?: number;
    callbackMs?: number;
  };
  logout?: {
    url?: string;
    idpLogout?: boolean;
  };
}

export interface MFAConfig {
  enabled: boolean;
  type: 'totp' | 'push' | 'sms' | 'none';
  totpSecretEnv?: string;
  pushTimeoutMs?: number;
}

export interface FormAuthConfig {
  loginUrl: string;
  selectors: {
    username: string;
    password: string;
    submit: string;
  };
  success: {
    url?: string;
    selector?: string;
  };
}

export interface SelectorsConfig {
  testIdAttribute: string;
  strategy: LocatorStrategy[];
  customTestIds?: string[];
}

export type LocatorStrategy = 'role' | 'label' | 'placeholder' | 'testid' | 'text' | 'css';

export interface AssertionsConfig {
  toast: ToastConfig;
  loading: LoadingConfig;
  form: FormConfig;
}

export interface ToastConfig {
  containerSelector: string;
  messageSelector: string;
  typeAttribute: string;
  timeout?: number;
}

export interface LoadingConfig {
  selectors: string[];
  timeout?: number;
}

export interface FormConfig {
  errorSelector: string;
  formErrorSelector: string;
}

export interface DataConfig {
  namespace: {
    prefix: string;
    suffix: string;
  };
  cleanup: {
    enabled: boolean;
    onFailure: boolean;
    parallel: boolean;
  };
  api?: {
    baseUrl: string;
    useMainAuth: boolean;
  };
}

export interface FixturesConfig {
  defaultRole: string;
  roleFixtures: string[];
  api?: {
    baseURL: string;
    extraHTTPHeaders?: Record<string, string>;
  };
}

export interface TierConfig {
  retries: number;
  workers: number;
  timeout: number;
  tag: string;
}

export interface ReportersConfig {
  html?: HTMLReporterConfig;
  json?: JSONReporterConfig;
  junit?: JUnitReporterConfig;
  artk?: ARTKReporterConfig;
}

export interface HTMLReporterConfig {
  enabled: boolean;
  outputFolder: string;
  open: 'always' | 'never' | 'on-failure';
}

export interface JSONReporterConfig {
  enabled: boolean;
  outputFile: string;
}

export interface JUnitReporterConfig {
  enabled: boolean;
  outputFile: string;
}

export interface ARTKReporterConfig {
  enabled: boolean;
  outputFile: string;
  includeJourneyMapping: boolean;
}

export interface ArtifactsConfig {
  outputDir: string;
  screenshots: ScreenshotConfig;
  video: VideoConfig;
  trace: TraceConfig;
}

export interface ScreenshotConfig {
  mode: 'off' | 'on' | 'only-on-failure';
  fullPage: boolean;
  maskPii: boolean;
  piiSelectors: string[];
}

export interface VideoConfig {
  mode: 'off' | 'on' | 'retain-on-failure' | 'on-first-retry';
  size?: { width: number; height: number };
}

export interface TraceConfig {
  mode: 'off' | 'on' | 'retain-on-failure' | 'on-first-retry';
  screenshots?: boolean;
  snapshots?: boolean;
}

export interface BrowsersConfig {
  enabled: ('chromium' | 'firefox' | 'webkit')[];
  viewport: { width: number; height: number };
  headless: boolean;
  slowMo?: number;
}

export interface JourneysConfig {
  id: {
    prefix: string;
    width: number;
  };
  layout: 'flat' | 'staged';
  backlog: {
    groupBy: 'tier' | 'status' | 'scope';
    thenBy?: 'tier' | 'status' | 'scope';
  };
}

// =============================================================================
// Errors
// =============================================================================

export class ARTKConfigError extends Error {
  constructor(
    message: string,
    public readonly field: string,
    public readonly suggestion?: string
  ) {
    super(message);
    this.name = 'ARTKConfigError';
  }
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Load and validate configuration from artk.config.yml
 *
 * @param configPath - Optional custom config path (default: artk/artk.config.yml)
 * @returns Validated ARTKConfig object
 * @throws ARTKConfigError if config is invalid or missing
 */
export declare function loadConfig(configPath?: string): ARTKConfig;

/**
 * Get cached configuration (must call loadConfig first)
 *
 * @returns Cached ARTKConfig object
 * @throws Error if config not loaded
 */
export declare function getConfig(): ARTKConfig;

/**
 * Resolve environment variable template
 *
 * @param template - String with ${VAR} or ${VAR:-default} syntax
 * @returns Resolved string with env vars substituted
 *
 * @example
 * resolveEnvVar('${BASE_URL:-http://localhost}')
 * // Returns process.env.BASE_URL or 'http://localhost'
 */
export declare function resolveEnvVar(template: string): string;

/**
 * Get current environment configuration
 *
 * @returns Environment config for activeEnvironment
 */
export declare function getCurrentEnvironment(): EnvironmentConfig;

/**
 * Get authentication config section
 */
export declare function getAuthConfig(): AuthConfig;

/**
 * Get selectors config section
 */
export declare function getSelectorsConfig(): SelectorsConfig;

/**
 * Get tier configuration by name
 *
 * @param tier - Tier name: 'smoke' | 'release' | 'regression'
 */
export declare function getTierConfig(tier: string): TierConfig;
