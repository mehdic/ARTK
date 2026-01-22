/**
 * Default values for optional configuration fields
 *
 * These defaults are applied when fields are not explicitly specified
 * in the artk.config.yml file.
 *
 * @module config/defaults
 */
import type { AppType, ArtifactsConfig, AssertionsConfig, BrowsersConfig, CaptureMode, DataConfig, JourneysConfig, LocatorStrategy, MFAType, ReporterOpenMode, ReportersConfig, ScreenshotMode, SelectorsConfig, StorageStateConfig, TierConfig } from './types.js';
/** Default application type */
export declare const DEFAULT_APP_TYPE: AppType;
/** Default storage state configuration */
export declare const DEFAULT_STORAGE_STATE: StorageStateConfig;
/** Default OIDC success timeout in ms */
export declare const DEFAULT_OIDC_SUCCESS_TIMEOUT: 5000;
/** Default MFA type */
export declare const DEFAULT_MFA_TYPE: MFAType;
/** Default MFA enabled state */
export declare const DEFAULT_MFA_ENABLED = false;
/** Default push timeout in ms */
export declare const DEFAULT_PUSH_TIMEOUT_MS: 60000;
/** Default OIDC login flow timeout in ms */
export declare const DEFAULT_LOGIN_FLOW_MS: 30000;
/** Default IdP redirect timeout in ms */
export declare const DEFAULT_IDP_REDIRECT_MS: 10000;
/** Default callback timeout in ms */
export declare const DEFAULT_CALLBACK_MS: 5000;
/** Default locator strategy order */
export declare const DEFAULT_LOCATOR_STRATEGY: readonly LocatorStrategy[];
/** Default test ID attribute */
export declare const DEFAULT_TEST_ID_ATTRIBUTE = "data-testid";
/** Default selectors configuration */
export declare const DEFAULT_SELECTORS: SelectorsConfig;
/** Default toast timeout in ms */
export declare const DEFAULT_TOAST_TIMEOUT: 5000;
/** Default loading timeout in ms */
export declare const DEFAULT_LOADING_TIMEOUT: 30000;
/** Default assertions configuration */
export declare const DEFAULT_ASSERTIONS: AssertionsConfig;
/** Default namespace prefix */
export declare const DEFAULT_NAMESPACE_PREFIX = "[artk-";
/** Default namespace suffix */
export declare const DEFAULT_NAMESPACE_SUFFIX = "]";
/** Default data configuration */
export declare const DEFAULT_DATA: DataConfig;
/** Default tier configurations */
export declare const DEFAULT_TIERS: Readonly<Record<string, TierConfig>>;
/** Default reporter open mode */
export declare const DEFAULT_REPORTER_OPEN: ReporterOpenMode;
/** Default reporters configuration */
export declare const DEFAULT_REPORTERS: ReportersConfig;
/** Default screenshot mode */
export declare const DEFAULT_SCREENSHOT_MODE: ScreenshotMode;
/** Default video/trace capture mode */
export declare const DEFAULT_CAPTURE_MODE: CaptureMode;
/** Default artifacts configuration */
export declare const DEFAULT_ARTIFACTS: ArtifactsConfig;
/** Default viewport width */
export declare const DEFAULT_VIEWPORT_WIDTH = 1280;
/** Default viewport height */
export declare const DEFAULT_VIEWPORT_HEIGHT = 720;
/** Default browsers configuration */
export declare const DEFAULT_BROWSERS: BrowsersConfig;
/** Default journey ID prefix */
export declare const DEFAULT_JOURNEY_ID_PREFIX = "JRN";
/** Default journey ID width */
export declare const DEFAULT_JOURNEY_ID_WIDTH = 4;
/** Default journeys configuration */
export declare const DEFAULT_JOURNEYS: JourneysConfig;
/** Supported configuration schema version */
export declare const SUPPORTED_CONFIG_VERSION = 1;
//# sourceMappingURL=defaults.d.ts.map