/**
 * Default values for optional configuration fields
 *
 * These defaults are applied when fields are not explicitly specified
 * in the artk.config.yml file.
 *
 * @module config/defaults
 */

import type {
  AppType,
  ArtifactsConfig,
  AssertionsConfig,
  BrowsersConfig,
  CaptureMode,
  DataConfig,
  JourneysConfig,
  LocatorStrategy,
  MFAType,
  ReporterOpenMode,
  ReportersConfig,
  ScreenshotMode,
  SelectorsConfig,
  StorageStateConfig,
  TierConfig,
} from './types.js';

// =============================================================================
// Application Defaults
// =============================================================================

/** Default application type */
export const DEFAULT_APP_TYPE: AppType = 'spa';

// =============================================================================
// Storage State Defaults
// =============================================================================

/** Default storage state configuration */
export const DEFAULT_STORAGE_STATE: StorageStateConfig = {
  directory: '.auth-states',
  maxAgeMinutes: 60,
  filePattern: '{role}.json',
} as const;

// =============================================================================
// OIDC Defaults
// =============================================================================

/** Default OIDC success timeout in ms */
export const DEFAULT_OIDC_SUCCESS_TIMEOUT = 5000;

/** Default MFA type */
export const DEFAULT_MFA_TYPE: MFAType = 'none';

/** Default MFA enabled state */
export const DEFAULT_MFA_ENABLED = false;

/** Default push timeout in ms */
export const DEFAULT_PUSH_TIMEOUT_MS = 30000;

/** Default OIDC login flow timeout in ms */
export const DEFAULT_LOGIN_FLOW_MS = 30000;

/** Default IdP redirect timeout in ms */
export const DEFAULT_IDP_REDIRECT_MS = 10000;

/** Default callback timeout in ms */
export const DEFAULT_CALLBACK_MS = 10000;

// =============================================================================
// Selectors Defaults
// =============================================================================

/** Default locator strategy order */
export const DEFAULT_LOCATOR_STRATEGY: readonly LocatorStrategy[] = [
  'role',
  'label',
  'placeholder',
  'testid',
  'text',
  'css',
] as const;

/** Default test ID attribute */
export const DEFAULT_TEST_ID_ATTRIBUTE = 'data-testid';

/** Default selectors configuration */
export const DEFAULT_SELECTORS: SelectorsConfig = {
  testIdAttribute: DEFAULT_TEST_ID_ATTRIBUTE,
  strategy: DEFAULT_LOCATOR_STRATEGY,
} as const;

// =============================================================================
// Assertions Defaults
// =============================================================================

/** Default toast timeout in ms */
export const DEFAULT_TOAST_TIMEOUT = 5000;

/** Default loading timeout in ms */
export const DEFAULT_LOADING_TIMEOUT = 30000;

/** Default assertions configuration */
export const DEFAULT_ASSERTIONS: AssertionsConfig = {
  toast: {
    containerSelector: '[role="alert"], .toast, .notification',
    messageSelector: '.toast-message, .notification-message',
    typeAttribute: 'data-type',
    timeout: DEFAULT_TOAST_TIMEOUT,
  },
  loading: {
    selectors: ['.loading', '.spinner', '[data-loading="true"]'],
    timeout: DEFAULT_LOADING_TIMEOUT,
  },
  form: {
    errorSelector: '[data-error="{field}"], .field-error[data-field="{field}"]',
    formErrorSelector: '.form-error, [role="alert"].form-error',
  },
};

// =============================================================================
// Data Defaults
// =============================================================================

/** Default namespace prefix */
export const DEFAULT_NAMESPACE_PREFIX = '[artk-';

/** Default namespace suffix */
export const DEFAULT_NAMESPACE_SUFFIX = ']';

/** Default data configuration */
export const DEFAULT_DATA: DataConfig = {
  namespace: {
    prefix: DEFAULT_NAMESPACE_PREFIX,
    suffix: DEFAULT_NAMESPACE_SUFFIX,
  },
  cleanup: {
    enabled: true,
    onFailure: true,
    parallel: false,
  },
} as const;

// =============================================================================
// Tier Defaults
// =============================================================================

/** Default tier configurations */
export const DEFAULT_TIERS: Readonly<Record<string, TierConfig>> = {
  smoke: {
    retries: 0,
    workers: 1,
    timeout: 30000,
    tag: '@smoke',
  },
  release: {
    retries: 1,
    workers: 2,
    timeout: 60000,
    tag: '@release',
  },
  regression: {
    retries: 2,
    workers: 4,
    timeout: 120000,
    tag: '@regression',
  },
} as const;

// =============================================================================
// Reporters Defaults
// =============================================================================

/** Default reporter open mode */
export const DEFAULT_REPORTER_OPEN: ReporterOpenMode = 'on-failure';

/** Default reporters configuration */
export const DEFAULT_REPORTERS: ReportersConfig = {
  html: {
    enabled: true,
    outputFolder: 'playwright-report',
    open: DEFAULT_REPORTER_OPEN,
  },
  json: {
    enabled: false,
    outputFile: 'test-results.json',
  },
  junit: {
    enabled: false,
    outputFile: 'junit.xml',
  },
  artk: {
    enabled: true,
    outputFile: 'artk-report.json',
    includeJourneyMapping: true,
  },
} as const;

// =============================================================================
// Artifacts Defaults
// =============================================================================

/** Default screenshot mode */
export const DEFAULT_SCREENSHOT_MODE: ScreenshotMode = 'only-on-failure';

/** Default video/trace capture mode */
export const DEFAULT_CAPTURE_MODE: CaptureMode = 'retain-on-failure';

/** Default artifacts configuration */
export const DEFAULT_ARTIFACTS: ArtifactsConfig = {
  outputDir: 'test-results',
  screenshots: {
    mode: DEFAULT_SCREENSHOT_MODE,
    fullPage: true,
    maskPii: false,
    piiSelectors: [],
  },
  video: {
    mode: DEFAULT_CAPTURE_MODE,
  },
  trace: {
    mode: DEFAULT_CAPTURE_MODE,
    screenshots: true,
    snapshots: true,
  },
};

// =============================================================================
// Browsers Defaults
// =============================================================================

/** Default viewport width */
export const DEFAULT_VIEWPORT_WIDTH = 1280;

/** Default viewport height */
export const DEFAULT_VIEWPORT_HEIGHT = 720;

/** Default browsers configuration */
export const DEFAULT_BROWSERS: BrowsersConfig = {
  enabled: ['chromium'],
  viewport: {
    width: DEFAULT_VIEWPORT_WIDTH,
    height: DEFAULT_VIEWPORT_HEIGHT,
  },
  headless: true,
};

// =============================================================================
// Journeys Defaults
// =============================================================================

/** Default journey ID prefix */
export const DEFAULT_JOURNEY_ID_PREFIX = 'JRN';

/** Default journey ID width */
export const DEFAULT_JOURNEY_ID_WIDTH = 4;

/** Default journeys configuration */
export const DEFAULT_JOURNEYS: JourneysConfig = {
  id: {
    prefix: DEFAULT_JOURNEY_ID_PREFIX,
    width: DEFAULT_JOURNEY_ID_WIDTH,
  },
  layout: 'flat',
  backlog: {
    groupBy: 'tier',
  },
} as const;

// =============================================================================
// Config Version
// =============================================================================

/** Supported configuration schema version */
export const SUPPORTED_CONFIG_VERSION = 1;
