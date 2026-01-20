/**
 * TypeScript interfaces for ARTK Core v1 configuration
 *
 * All types are based on the data model specification and designed for:
 * - Type-safe configuration access (FR-005)
 * - Runtime validation with Zod (schema.ts)
 * - Environment variable resolution (${VAR_NAME} and ${VAR_NAME:-default})
 *
 * @module config/types
 */
/**
 * Root configuration object loaded from `artk.config.yml`
 *
 * @see data-model.md Section 1.1
 */
interface ARTKConfig {
    /** Schema version (must be 1) */
    readonly version: number;
    /** Application settings */
    readonly app: AppConfig;
    /** Named environments with URL overrides */
    readonly environments: Readonly<Record<string, EnvironmentConfig>>;
    /** Current environment key (must match a key in environments or be env var) */
    readonly activeEnvironment: string;
    /** Authentication settings */
    readonly auth: AuthConfig;
    /** Locator configuration */
    readonly selectors: SelectorsConfig;
    /** Assertion selectors */
    readonly assertions: AssertionsConfig;
    /** Data harness settings */
    readonly data: DataConfig;
    /** Fixture configuration */
    readonly fixtures: FixturesConfig;
    /** Test tier settings */
    readonly tiers: Readonly<Record<string, TierConfig>>;
    /** Reporter configuration */
    readonly reporters: ReportersConfig;
    /** Artifact settings */
    readonly artifacts: ArtifactsConfig;
    /** Browser configuration */
    readonly browsers: BrowsersConfig;
    /** Journey system settings */
    readonly journeys: JourneysConfig;
}
/**
 * Application type determining rendering strategy
 */
type AppType = 'spa' | 'ssr' | 'hybrid';
/**
 * Application metadata and base URL
 *
 * @see data-model.md Section 1.2
 */
interface AppConfig {
    /** Application name (e.g., "ITSS") */
    readonly name: string;
    /** Base URL with env var support: ${VAR:-default} */
    readonly baseUrl: string;
    /** Application type (default: 'spa') */
    readonly type: AppType;
}
/**
 * Environment-specific URL overrides
 *
 * @see data-model.md Section 1.3
 */
interface EnvironmentConfig {
    /** Environment base URL */
    readonly baseUrl: string;
    /** Optional API URL override */
    readonly apiUrl?: string;
}
/**
 * Supported authentication provider types
 */
type AuthProviderType = 'oidc' | 'form' | 'token' | 'custom';
/**
 * Local auth bypass mode classification.
 */
type AuthBypassMode = 'none' | 'identityless' | 'mock-identity' | 'unknown';
/**
 * Local auth bypass configuration.
 */
interface AuthBypassConfig {
    /** Bypass mode classification */
    readonly mode: AuthBypassMode;
    /** Env var / host rule / config key that enables bypass (optional) */
    readonly toggle?: string;
    /** Environments where bypass applies (optional) */
    readonly environments?: readonly string[];
}
/**
 * Authentication provider and role definitions
 *
 * @see data-model.md Section 1.4
 */
interface AuthConfig {
    /** Authentication provider type */
    readonly provider: AuthProviderType;
    /** Storage state configuration */
    readonly storageState: StorageStateConfig;
    /** Role definitions */
    readonly roles: Readonly<Record<string, RoleConfig>>;
    /** Local auth bypass configuration (optional) */
    readonly bypass?: AuthBypassConfig;
    /** OIDC-specific configuration (required when provider: 'oidc') */
    readonly oidc?: OIDCConfig;
    /** Form authentication configuration (required when provider: 'form') */
    readonly form?: FormAuthConfig;
}
/**
 * Storage state configuration for session persistence
 */
interface StorageStateConfig {
    /** Relative to artk/ (default: '.auth-states') */
    readonly directory: string;
    /** Session validity in minutes (default: 60) */
    readonly maxAgeMinutes: number;
    /** Naming pattern: '{role}.json' or '{role}-{env}.json' */
    readonly filePattern: string;
}
/**
 * Role-specific configuration
 */
interface RoleConfig {
    /** Environment variable names for credentials */
    readonly credentialsEnv: CredentialsEnvConfig;
    /** Human-readable description */
    readonly description?: string;
    /** Role-specific OIDC overrides */
    readonly oidcOverrides?: Partial<OIDCConfig>;
}
/**
 * Environment variable names for credentials
 */
interface CredentialsEnvConfig {
    /** Env var name for username */
    readonly username: string;
    /** Env var name for password */
    readonly password: string;
}
/**
 * Supported OIDC identity provider types
 */
type OIDCIdpType = 'keycloak' | 'azure-ad' | 'okta' | 'auth0' | 'generic';
/**
 * OIDC-specific authentication configuration
 *
 * @see data-model.md Section 1.5
 */
interface OIDCConfig {
    /** IdP type for provider-specific handling */
    readonly idpType: OIDCIdpType;
    /** App's login initiation URL */
    readonly loginUrl: string;
    /** Direct IdP URL (alternative) */
    readonly idpLoginUrl?: string;
    /** Success detection configuration */
    readonly success: OIDCSuccessConfig;
    /** IdP-specific selectors */
    readonly idpSelectors?: OIDCIdpSelectors;
    /** MFA configuration */
    readonly mfa?: MFAConfig;
    /** Timeout settings */
    readonly timeouts?: OIDCTimeouts;
    /** Logout configuration */
    readonly logout?: OIDCLogoutConfig;
}
/**
 * Success detection configuration for OIDC login
 */
interface OIDCSuccessConfig {
    /** URL to wait for after login */
    readonly url?: string;
    /** Element to wait for after login */
    readonly selector?: string;
    /** Success detection timeout in ms (default: 5000) */
    readonly timeout?: number;
}
/**
 * IdP-specific form selectors
 */
interface OIDCIdpSelectors {
    /** Username input selector */
    readonly username?: string;
    /** Password input selector */
    readonly password?: string;
    /** Submit button selector */
    readonly submit?: string;
    /** "No" to stay signed in prompt */
    readonly staySignedInNo?: string;
}
/**
 * MFA types supported
 */
type MFAType = 'totp' | 'push' | 'sms' | 'none';
/**
 * MFA configuration
 */
interface MFAConfig {
    /** Whether MFA is active */
    readonly enabled: boolean;
    /** MFA type */
    readonly type: MFAType;
    /** Env var for TOTP secret */
    readonly totpSecretEnv?: string;
    /** Push approval timeout in ms (default: 30000) */
    readonly pushTimeoutMs?: number;
}
/**
 * OIDC timeout settings
 */
interface OIDCTimeouts {
    /** Total flow timeout in ms (default: 30000) */
    readonly loginFlowMs?: number;
    /** IdP redirect wait in ms (default: 10000) */
    readonly idpRedirectMs?: number;
    /** App callback wait in ms (default: 10000) */
    readonly callbackMs?: number;
}
/**
 * OIDC logout configuration
 */
interface OIDCLogoutConfig {
    /** App's logout URL */
    readonly url?: string;
    /** Also logout from IdP */
    readonly idpLogout?: boolean;
}
/**
 * Form-based authentication configuration
 */
interface FormAuthConfig {
    /** Login page URL */
    readonly loginUrl: string;
    /** Form field selectors */
    readonly selectors: FormAuthSelectors;
    /** Success detection */
    readonly success: FormAuthSuccessConfig;
}
/**
 * Form authentication selectors
 */
interface FormAuthSelectors {
    /** Username field selector */
    readonly username: string;
    /** Password field selector */
    readonly password: string;
    /** Submit button selector */
    readonly submit: string;
}
/**
 * Form authentication success detection
 */
interface FormAuthSuccessConfig {
    /** URL to wait for after login */
    readonly url?: string;
    /** Element to wait for after login */
    readonly selector?: string;
}
/**
 * Locator strategy types in priority order
 */
type LocatorStrategy = 'role' | 'label' | 'placeholder' | 'testid' | 'text' | 'css';
/**
 * Locator strategy configuration
 *
 * @see data-model.md Section 1.6
 */
interface SelectorsConfig {
    /** Test ID attribute (default: 'data-testid') */
    readonly testIdAttribute: string;
    /** Strategy order (first match wins) */
    readonly strategy: readonly LocatorStrategy[];
    /** Additional test ID attributes */
    readonly customTestIds?: readonly string[];
}
/**
 * Assertion helper selectors
 *
 * @see data-model.md Section 1.7
 */
interface AssertionsConfig {
    /** Toast/notification assertions */
    readonly toast: ToastAssertionConfig;
    /** Loading indicator assertions */
    readonly loading: LoadingAssertionConfig;
    /** Form validation assertions */
    readonly form: FormAssertionConfig;
}
/**
 * Toast assertion configuration
 */
interface ToastAssertionConfig {
    /** Toast container selector */
    readonly containerSelector: string;
    /** Message selector within toast */
    readonly messageSelector: string;
    /** Attribute for toast type detection */
    readonly typeAttribute: string;
    /** Default timeout in ms */
    readonly timeout?: number;
}
/**
 * Loading assertion configuration
 */
interface LoadingAssertionConfig {
    /** Loading indicator selectors */
    readonly selectors: string[];
    /** Default timeout in ms */
    readonly timeout?: number;
}
/**
 * Form assertion configuration
 */
interface FormAssertionConfig {
    /** Field error selector (with {field} placeholder) */
    readonly errorSelector: string;
    /** Form-level error selector */
    readonly formErrorSelector: string;
}
/**
 * Data harness configuration
 *
 * @see data-model.md Section 1.8
 */
interface DataConfig {
    /** Namespace configuration */
    readonly namespace: NamespaceConfig;
    /** Cleanup configuration */
    readonly cleanup: CleanupConfig;
    /** Optional API configuration for data operations */
    readonly api?: DataApiConfig;
}
/**
 * Namespace configuration for test isolation
 */
interface NamespaceConfig {
    /** Namespace prefix (default: '[artk-') */
    readonly prefix: string;
    /** Namespace suffix (default: ']') */
    readonly suffix: string;
}
/**
 * Cleanup configuration
 */
interface CleanupConfig {
    /** Enable auto-cleanup */
    readonly enabled: boolean;
    /** Cleanup even on test failure */
    readonly onFailure: boolean;
    /** Run cleanup in parallel */
    readonly parallel: boolean;
}
/**
 * Data API configuration
 */
interface DataApiConfig {
    /** Data API base URL */
    readonly baseUrl: string;
    /** Use main auth for API calls */
    readonly useMainAuth: boolean;
}
/**
 * Fixture configuration
 *
 * @see data-model.md Section 1.9
 */
interface FixturesConfig {
    /** Default role for authenticatedPage */
    readonly defaultRole: string;
    /** Roles that get dedicated fixtures */
    readonly roleFixtures: readonly string[];
    /** API context configuration */
    readonly api?: FixturesApiConfig;
}
/**
 * Fixtures API configuration
 */
interface FixturesApiConfig {
    /** API context base URL */
    readonly baseURL: string;
    /** Extra HTTP headers */
    readonly extraHTTPHeaders?: Readonly<Record<string, string>>;
}
/**
 * Test tier-specific settings
 *
 * @see data-model.md Section 1.10
 */
interface TierConfig {
    /** Retry count */
    readonly retries: number;
    /** Parallel workers */
    readonly workers: number;
    /** Global timeout in ms */
    readonly timeout: number;
    /** Filter tag (e.g., '@smoke') */
    readonly tag: string;
}
/**
 * Reporter open mode
 */
type ReporterOpenMode = 'always' | 'never' | 'on-failure';
/**
 * Reporter configuration
 *
 * @see data-model.md Section 1.11
 */
interface ReportersConfig {
    /** HTML reporter configuration */
    readonly html?: HtmlReporterConfig;
    /** JSON reporter configuration */
    readonly json?: JsonReporterConfig;
    /** JUnit reporter configuration */
    readonly junit?: JunitReporterConfig;
    /** ARTK reporter configuration */
    readonly artk?: ArtkReporterConfig;
}
/**
 * HTML reporter configuration
 */
interface HtmlReporterConfig {
    /** Enable HTML reporter */
    readonly enabled: boolean;
    /** Output folder */
    readonly outputFolder: string;
    /** When to open report */
    readonly open: ReporterOpenMode;
}
/**
 * JSON reporter configuration
 */
interface JsonReporterConfig {
    /** Enable JSON reporter */
    readonly enabled: boolean;
    /** Output file path */
    readonly outputFile: string;
}
/**
 * JUnit reporter configuration
 */
interface JunitReporterConfig {
    /** Enable JUnit reporter */
    readonly enabled: boolean;
    /** Output file path */
    readonly outputFile: string;
}
/**
 * ARTK reporter configuration
 */
interface ArtkReporterConfig {
    /** Enable ARTK reporter */
    readonly enabled: boolean;
    /** Output file path */
    readonly outputFile: string;
    /** Include journey mapping in report */
    readonly includeJourneyMapping: boolean;
}
/**
 * Screenshot capture mode
 */
type ScreenshotMode = 'off' | 'on' | 'only-on-failure';
/**
 * Video/trace capture mode
 */
type CaptureMode = 'off' | 'on' | 'retain-on-failure' | 'on-first-retry';
/**
 * Test artifact settings
 *
 * @see data-model.md Section 1.12
 */
interface ArtifactsConfig {
    /** Base output directory */
    readonly outputDir: string;
    /** Screenshot configuration */
    readonly screenshots: ScreenshotsConfig;
    /** Video configuration */
    readonly video: VideoConfig;
    /** Trace configuration */
    readonly trace: TraceConfig;
}
/**
 * Screenshot configuration
 */
interface ScreenshotsConfig {
    /** Screenshot capture mode */
    readonly mode: ScreenshotMode;
    /** Capture full page */
    readonly fullPage: boolean;
    /** Enable PII masking */
    readonly maskPii: boolean;
    /** Selectors to mask */
    readonly piiSelectors: string[];
}
/**
 * Video configuration
 */
interface VideoConfig {
    /** Video capture mode */
    readonly mode: CaptureMode;
    /** Video size */
    readonly size?: VideoSize;
}
/**
 * Video size configuration
 */
interface VideoSize {
    /** Width in pixels */
    readonly width: number;
    /** Height in pixels */
    readonly height: number;
}
/**
 * Trace configuration
 */
interface TraceConfig {
    /** Trace capture mode */
    readonly mode: CaptureMode;
    /** Include screenshots in trace */
    readonly screenshots?: boolean;
    /** Include DOM snapshots in trace */
    readonly snapshots?: boolean;
}
/**
 * Browser types supported by Playwright
 */
type BrowserType = 'chromium' | 'firefox' | 'webkit';
/**
 * Browser channel selection
 */
type BrowserChannel = 'bundled' | 'msedge' | 'chrome' | 'chrome-beta' | 'chrome-dev';
/**
 * Browser selection strategy
 */
type BrowserStrategy = 'auto' | 'prefer-bundled' | 'prefer-system' | 'bundled-only' | 'system-only';
/**
 * Browser configuration
 *
 * @see data-model.md Section 1.13
 */
interface BrowsersConfig {
    /** Enabled browser types */
    readonly enabled: BrowserType[];
    /** Browser channel selection */
    readonly channel?: BrowserChannel;
    /** Browser selection strategy */
    readonly strategy?: BrowserStrategy;
    /** Viewport size */
    readonly viewport: ViewportSize;
    /** Run in headless mode */
    readonly headless: boolean;
    /** Slowdown for debugging in ms */
    readonly slowMo?: number;
}
/**
 * Viewport size configuration
 */
interface ViewportSize {
    /** Width in pixels */
    readonly width: number;
    /** Height in pixels */
    readonly height: number;
}
/**
 * Journey directory layout
 */
type JourneyLayout = 'flat' | 'staged';
/**
 * Journey grouping options
 */
type JourneyGroupBy = 'tier' | 'status' | 'scope';
/**
 * Journey system configuration
 *
 * @see data-model.md Section 1.14
 */
interface JourneysConfig {
    /** Journey ID configuration */
    readonly id: JourneyIdConfig;
    /** Directory layout */
    readonly layout: JourneyLayout;
    /** Backlog grouping configuration */
    readonly backlog: JourneyBacklogConfig;
}
/**
 * Journey ID configuration
 */
interface JourneyIdConfig {
    /** ID prefix (default: 'JRN') */
    readonly prefix: string;
    /** Zero-padded width (default: 4) */
    readonly width: number;
}
/**
 * Journey backlog configuration
 */
interface JourneyBacklogConfig {
    /** Primary grouping */
    readonly groupBy: JourneyGroupBy;
    /** Secondary grouping */
    readonly thenBy?: JourneyGroupBy;
}

export type { JourneyGroupBy as $, ARTKConfig as A, BrowsersConfig as B, CaptureMode as C, DataConfig as D, EnvironmentConfig as E, FixturesConfig as F, FixturesApiConfig as G, HtmlReporterConfig as H, JsonReporterConfig as I, JourneysConfig as J, JunitReporterConfig as K, LocatorStrategy as L, MFAType as M, NamespaceConfig as N, OIDCConfig as O, ArtkReporterConfig as P, ScreenshotsConfig as Q, ReportersConfig as R, SelectorsConfig as S, TierConfig as T, TraceConfig as U, VideoConfig as V, VideoSize as W, ViewportSize as X, JourneyIdConfig as Y, JourneyBacklogConfig as Z, JourneyLayout as _, AppConfig as a, BrowserChannel as a0, BrowserStrategy as a1, AuthConfig as b, AssertionsConfig as c, ArtifactsConfig as d, BrowserType as e, AppType as f, StorageStateConfig as g, ReporterOpenMode as h, ScreenshotMode as i, AuthProviderType as j, RoleConfig as k, CredentialsEnvConfig as l, OIDCIdpType as m, OIDCSuccessConfig as n, OIDCIdpSelectors as o, OIDCTimeouts as p, OIDCLogoutConfig as q, MFAConfig as r, FormAuthConfig as s, FormAuthSelectors as t, FormAuthSuccessConfig as u, ToastAssertionConfig as v, LoadingAssertionConfig as w, FormAssertionConfig as x, CleanupConfig as y, DataApiConfig as z };
