"use strict";
/**
 * Zod validation schemas for ARTK configuration
 *
 * Provides runtime type checking and validation for configuration loaded
 * from artk.config.yml. All validation errors include field paths for
 * easy debugging (FR-002).
 *
 * @module config/schema
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ARTKConfigSchema = exports.JourneysConfigSchema = exports.JourneyBacklogConfigSchema = exports.JourneyIdConfigSchema = exports.BrowsersConfigSchema = exports.ViewportSizeSchema = exports.ArtifactsConfigSchema = exports.TraceConfigSchema = exports.VideoConfigSchema = exports.ScreenshotsConfigSchema = exports.VideoSizeSchema = exports.ReportersConfigSchema = exports.ArtkReporterConfigSchema = exports.JunitReporterConfigSchema = exports.JsonReporterConfigSchema = exports.HtmlReporterConfigSchema = exports.TiersSchema = exports.TierConfigSchema = exports.FixturesConfigSchema = exports.FixturesApiConfigSchema = exports.DataConfigSchema = exports.DataApiConfigSchema = exports.CleanupConfigSchema = exports.NamespaceConfigSchema = exports.AssertionsConfigSchema = exports.FormAssertionConfigSchema = exports.LoadingAssertionConfigSchema = exports.ToastAssertionConfigSchema = exports.SelectorsConfigSchema = exports.AuthConfigSchema = exports.AuthBypassConfigSchema = exports.RolesSchema = exports.RoleConfigSchema = exports.FormAuthConfigSchema = exports.FormAuthSuccessConfigSchema = exports.FormAuthSelectorsSchema = exports.OIDCConfigSchema = exports.OIDCLogoutConfigSchema = exports.OIDCTimeoutsSchema = exports.MFAConfigSchema = exports.OIDCIdpSelectorsSchema = exports.OIDCSuccessConfigSchema = exports.CredentialsEnvConfigSchema = exports.StorageStateConfigSchema = exports.EnvironmentsSchema = exports.EnvironmentConfigSchema = exports.AppConfigSchema = exports.CURRENT_CONFIG_VERSION = void 0;
const zod_1 = require("zod");
const defaults_js_1 = require("./defaults.js");
// =============================================================================
// Version Constants
// =============================================================================
/**
 * Current configuration version
 *
 * Used for schema migration. When breaking changes are made to the config
 * schema, this version is incremented and a migration is added to migrate.ts.
 */
exports.CURRENT_CONFIG_VERSION = defaults_js_1.SUPPORTED_CONFIG_VERSION;
// =============================================================================
// Primitive Schemas
// =============================================================================
/** Non-empty string */
const nonEmptyString = zod_1.z.string().min(1, 'Must not be empty');
/** Positive integer */
const positiveInt = zod_1.z.number().int().positive();
/** Non-negative integer */
const nonNegativeInt = zod_1.z.number().int().nonnegative();
/** Positive number */
const positiveNumber = zod_1.z.number().positive();
// =============================================================================
// Application Schemas
// =============================================================================
/** Application type schema */
const AppTypeSchema = zod_1.z.enum(['spa', 'ssr', 'hybrid']);
/** Application configuration schema */
exports.AppConfigSchema = zod_1.z.object({
    name: nonEmptyString.describe('Application name'),
    baseUrl: nonEmptyString.describe('Base URL with env var support'),
    type: AppTypeSchema.default(defaults_js_1.DEFAULT_APP_TYPE),
});
// =============================================================================
// Environment Schemas
// =============================================================================
/** Environment configuration schema */
exports.EnvironmentConfigSchema = zod_1.z.object({
    baseUrl: nonEmptyString.describe('Environment base URL'),
    apiUrl: zod_1.z.string().optional(),
});
/** Environments record schema */
exports.EnvironmentsSchema = zod_1.z.record(zod_1.z.string(), exports.EnvironmentConfigSchema);
// =============================================================================
// Storage State Schemas
// =============================================================================
/** Storage state configuration schema */
exports.StorageStateConfigSchema = zod_1.z.object({
    directory: zod_1.z.string().default(defaults_js_1.DEFAULT_STORAGE_STATE.directory),
    maxAgeMinutes: positiveNumber.default(defaults_js_1.DEFAULT_STORAGE_STATE.maxAgeMinutes),
    filePattern: nonEmptyString.default(defaults_js_1.DEFAULT_STORAGE_STATE.filePattern),
});
// =============================================================================
// Credentials Schemas
// =============================================================================
/** Credentials environment variable schema */
exports.CredentialsEnvConfigSchema = zod_1.z.object({
    username: nonEmptyString.describe('Env var name for username'),
    password: nonEmptyString.describe('Env var name for password'),
});
// =============================================================================
// OIDC Schemas
// =============================================================================
/** OIDC IdP type schema */
const OIDCIdpTypeSchema = zod_1.z.enum([
    'keycloak',
    'azure-ad',
    'okta',
    'auth0',
    'generic',
]);
/** MFA type schema */
const MFATypeSchema = zod_1.z.enum(['totp', 'push', 'sms', 'none']);
/** OIDC success configuration schema */
exports.OIDCSuccessConfigSchema = zod_1.z
    .object({
    url: zod_1.z.string().optional(),
    selector: zod_1.z.string().optional(),
    timeout: positiveInt.default(defaults_js_1.DEFAULT_OIDC_SUCCESS_TIMEOUT),
})
    .refine((data) => data.url !== undefined || data.selector !== undefined, {
    message: 'Either success.url or success.selector is required',
});
/** OIDC IdP selectors schema */
exports.OIDCIdpSelectorsSchema = zod_1.z
    .object({
    username: zod_1.z.string().optional(),
    password: zod_1.z.string().optional(),
    submit: zod_1.z.string().optional(),
    staySignedInNo: zod_1.z.string().optional(),
})
    .optional();
/** MFA configuration schema */
exports.MFAConfigSchema = zod_1.z
    .object({
    enabled: zod_1.z.boolean().default(defaults_js_1.DEFAULT_MFA_ENABLED),
    type: MFATypeSchema.default(defaults_js_1.DEFAULT_MFA_TYPE),
    totpSecretEnv: zod_1.z.string().optional(),
    pushTimeoutMs: positiveInt.default(defaults_js_1.DEFAULT_PUSH_TIMEOUT_MS),
})
    .optional();
/** OIDC timeouts schema */
exports.OIDCTimeoutsSchema = zod_1.z
    .object({
    loginFlowMs: positiveInt.default(defaults_js_1.DEFAULT_LOGIN_FLOW_MS),
    idpRedirectMs: positiveInt.default(defaults_js_1.DEFAULT_IDP_REDIRECT_MS),
    callbackMs: positiveInt.default(defaults_js_1.DEFAULT_CALLBACK_MS),
})
    .optional();
/** OIDC logout schema */
exports.OIDCLogoutConfigSchema = zod_1.z
    .object({
    url: zod_1.z.string().optional(),
    idpLogout: zod_1.z.boolean().optional(),
})
    .optional();
/** OIDC configuration schema */
exports.OIDCConfigSchema = zod_1.z
    .object({
    idpType: OIDCIdpTypeSchema,
    loginUrl: nonEmptyString.describe('Login initiation URL'),
    idpLoginUrl: zod_1.z.string().optional(),
    success: exports.OIDCSuccessConfigSchema,
    idpSelectors: exports.OIDCIdpSelectorsSchema,
    mfa: exports.MFAConfigSchema,
    timeouts: exports.OIDCTimeoutsSchema,
    logout: exports.OIDCLogoutConfigSchema,
})
    .optional();
// =============================================================================
// Form Auth Schemas
// =============================================================================
/** Form auth selectors schema */
exports.FormAuthSelectorsSchema = zod_1.z.object({
    username: nonEmptyString,
    password: nonEmptyString,
    submit: nonEmptyString,
});
/** Form auth success schema */
exports.FormAuthSuccessConfigSchema = zod_1.z.object({
    url: zod_1.z.string().optional(),
    selector: zod_1.z.string().optional(),
});
/** Form auth configuration schema */
exports.FormAuthConfigSchema = zod_1.z
    .object({
    loginUrl: nonEmptyString,
    selectors: exports.FormAuthSelectorsSchema,
    success: exports.FormAuthSuccessConfigSchema,
})
    .optional();
// =============================================================================
// Role Schemas
// =============================================================================
/** Role configuration schema */
exports.RoleConfigSchema = zod_1.z.object({
    credentialsEnv: exports.CredentialsEnvConfigSchema,
    description: zod_1.z.string().optional(),
    oidcOverrides: exports.OIDCConfigSchema.optional(),
});
/** Roles record schema */
exports.RolesSchema = zod_1.z.record(zod_1.z.string(), exports.RoleConfigSchema);
// =============================================================================
// Auth Schemas
// =============================================================================
/** Auth provider type schema */
const AuthProviderTypeSchema = zod_1.z.enum(['oidc', 'form', 'token', 'custom']);
/** Auth bypass mode schema */
const AuthBypassModeSchema = zod_1.z.enum([
    'none',
    'identityless',
    'mock-identity',
    'unknown',
]);
/** Auth bypass configuration schema */
exports.AuthBypassConfigSchema = zod_1.z.object({
    mode: AuthBypassModeSchema.default('unknown'),
    toggle: zod_1.z.string().optional(),
    environments: zod_1.z.array(zod_1.z.string()).optional(),
});
/** Auth configuration schema with provider-specific validation */
exports.AuthConfigSchema = zod_1.z
    .object({
    provider: AuthProviderTypeSchema,
    storageState: exports.StorageStateConfigSchema.default(defaults_js_1.DEFAULT_STORAGE_STATE),
    roles: exports.RolesSchema.refine((roles) => Object.keys(roles).length > 0, {
        message: 'At least one role must be defined',
    }),
    bypass: exports.AuthBypassConfigSchema.optional(),
    oidc: exports.OIDCConfigSchema,
    form: exports.FormAuthConfigSchema,
})
    .superRefine((data, ctx) => {
    // Validate provider-specific configuration
    if (data.provider === 'oidc' && data.oidc === undefined) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: 'OIDC configuration is required when provider is "oidc"',
            path: ['oidc'],
        });
    }
    if (data.provider === 'form' && data.form === undefined) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: 'Form configuration is required when provider is "form"',
            path: ['form'],
        });
    }
});
// =============================================================================
// Selectors Schemas
// =============================================================================
/** Locator strategy schema */
const LocatorStrategySchema = zod_1.z.enum([
    'role',
    'label',
    'placeholder',
    'testid',
    'text',
    'css',
]);
/** Selectors configuration schema */
exports.SelectorsConfigSchema = zod_1.z.object({
    testIdAttribute: zod_1.z.string().default(defaults_js_1.DEFAULT_TEST_ID_ATTRIBUTE),
    strategy: zod_1.z.array(LocatorStrategySchema).default([...defaults_js_1.DEFAULT_LOCATOR_STRATEGY]),
    customTestIds: zod_1.z.array(zod_1.z.string()).optional(),
});
// =============================================================================
// Assertions Schemas
// =============================================================================
/** Toast assertion schema */
exports.ToastAssertionConfigSchema = zod_1.z.object({
    containerSelector: nonEmptyString,
    messageSelector: nonEmptyString,
    typeAttribute: nonEmptyString,
    timeout: positiveInt.default(defaults_js_1.DEFAULT_TOAST_TIMEOUT),
});
/** Loading assertion schema */
exports.LoadingAssertionConfigSchema = zod_1.z.object({
    selectors: zod_1.z.array(nonEmptyString).min(1, 'At least one loading selector required'),
    timeout: positiveInt.default(defaults_js_1.DEFAULT_LOADING_TIMEOUT),
});
/** Form assertion schema */
exports.FormAssertionConfigSchema = zod_1.z.object({
    errorSelector: nonEmptyString,
    formErrorSelector: nonEmptyString,
});
/** Assertions configuration schema */
exports.AssertionsConfigSchema = zod_1.z.object({
    toast: exports.ToastAssertionConfigSchema.default(defaults_js_1.DEFAULT_ASSERTIONS.toast),
    loading: exports.LoadingAssertionConfigSchema.default(defaults_js_1.DEFAULT_ASSERTIONS.loading),
    form: exports.FormAssertionConfigSchema.default(defaults_js_1.DEFAULT_ASSERTIONS.form),
});
// =============================================================================
// Data Schemas
// =============================================================================
/** Namespace configuration schema */
exports.NamespaceConfigSchema = zod_1.z.object({
    prefix: zod_1.z.string().default(defaults_js_1.DEFAULT_DATA.namespace.prefix),
    suffix: zod_1.z.string().default(defaults_js_1.DEFAULT_DATA.namespace.suffix),
});
/** Cleanup configuration schema */
exports.CleanupConfigSchema = zod_1.z.object({
    enabled: zod_1.z.boolean().default(defaults_js_1.DEFAULT_DATA.cleanup.enabled),
    onFailure: zod_1.z.boolean().default(defaults_js_1.DEFAULT_DATA.cleanup.onFailure),
    parallel: zod_1.z.boolean().default(defaults_js_1.DEFAULT_DATA.cleanup.parallel),
});
/** Data API configuration schema */
exports.DataApiConfigSchema = zod_1.z
    .object({
    baseUrl: nonEmptyString,
    useMainAuth: zod_1.z.boolean().default(true),
})
    .optional();
/** Data configuration schema */
exports.DataConfigSchema = zod_1.z.object({
    namespace: exports.NamespaceConfigSchema.default(defaults_js_1.DEFAULT_DATA.namespace),
    cleanup: exports.CleanupConfigSchema.default(defaults_js_1.DEFAULT_DATA.cleanup),
    api: exports.DataApiConfigSchema,
});
// =============================================================================
// Fixtures Schemas
// =============================================================================
/** Fixtures API configuration schema */
exports.FixturesApiConfigSchema = zod_1.z
    .object({
    baseURL: nonEmptyString,
    extraHTTPHeaders: zod_1.z.record(zod_1.z.string(), zod_1.z.string()).optional(),
})
    .optional();
/** Fixtures configuration schema */
exports.FixturesConfigSchema = zod_1.z.object({
    defaultRole: nonEmptyString,
    roleFixtures: zod_1.z.array(nonEmptyString).default([]),
    api: exports.FixturesApiConfigSchema,
});
// =============================================================================
// Tier Schemas
// =============================================================================
/** Tier configuration schema */
exports.TierConfigSchema = zod_1.z.object({
    retries: nonNegativeInt,
    workers: positiveInt,
    timeout: positiveInt,
    tag: nonEmptyString,
});
/** Tiers record schema */
exports.TiersSchema = zod_1.z.record(zod_1.z.string(), exports.TierConfigSchema);
// =============================================================================
// Reporters Schemas
// =============================================================================
/** Reporter open mode schema */
const ReporterOpenModeSchema = zod_1.z.enum(['always', 'never', 'on-failure']);
/** HTML reporter schema */
exports.HtmlReporterConfigSchema = zod_1.z
    .object({
    enabled: zod_1.z.boolean().default(true),
    outputFolder: zod_1.z.string().default('playwright-report'),
    open: ReporterOpenModeSchema.default(defaults_js_1.DEFAULT_REPORTER_OPEN),
})
    .optional();
/** JSON reporter schema */
exports.JsonReporterConfigSchema = zod_1.z
    .object({
    enabled: zod_1.z.boolean().default(false),
    outputFile: zod_1.z.string().default('test-results.json'),
})
    .optional();
/** JUnit reporter schema */
exports.JunitReporterConfigSchema = zod_1.z
    .object({
    enabled: zod_1.z.boolean().default(false),
    outputFile: zod_1.z.string().default('junit.xml'),
})
    .optional();
/** ARTK reporter schema */
exports.ArtkReporterConfigSchema = zod_1.z
    .object({
    enabled: zod_1.z.boolean().default(true),
    outputFile: zod_1.z.string().default('artk-report.json'),
    includeJourneyMapping: zod_1.z.boolean().default(true),
})
    .optional();
/** Reporters configuration schema */
exports.ReportersConfigSchema = zod_1.z.object({
    html: exports.HtmlReporterConfigSchema,
    json: exports.JsonReporterConfigSchema,
    junit: exports.JunitReporterConfigSchema,
    artk: exports.ArtkReporterConfigSchema,
});
// =============================================================================
// Artifacts Schemas
// =============================================================================
/** Screenshot mode schema */
const ScreenshotModeSchema = zod_1.z.enum(['off', 'on', 'only-on-failure']);
/** Capture mode schema */
const CaptureModeSchema = zod_1.z.enum([
    'off',
    'on',
    'retain-on-failure',
    'on-first-retry',
]);
/** Video size schema */
exports.VideoSizeSchema = zod_1.z
    .object({
    width: positiveInt,
    height: positiveInt,
})
    .optional();
/** Screenshots configuration schema */
exports.ScreenshotsConfigSchema = zod_1.z.object({
    mode: ScreenshotModeSchema.default(defaults_js_1.DEFAULT_SCREENSHOT_MODE),
    fullPage: zod_1.z.boolean().default(defaults_js_1.DEFAULT_ARTIFACTS.screenshots.fullPage),
    maskPii: zod_1.z.boolean().default(defaults_js_1.DEFAULT_ARTIFACTS.screenshots.maskPii),
    piiSelectors: zod_1.z.array(zod_1.z.string()).default([]),
});
/** Video configuration schema */
exports.VideoConfigSchema = zod_1.z.object({
    mode: CaptureModeSchema.default(defaults_js_1.DEFAULT_CAPTURE_MODE),
    size: exports.VideoSizeSchema,
});
/** Trace configuration schema */
exports.TraceConfigSchema = zod_1.z.object({
    mode: CaptureModeSchema.default(defaults_js_1.DEFAULT_CAPTURE_MODE),
    screenshots: zod_1.z.boolean().default(true),
    snapshots: zod_1.z.boolean().default(true),
});
/** Artifacts configuration schema */
exports.ArtifactsConfigSchema = zod_1.z.object({
    outputDir: zod_1.z.string().default(defaults_js_1.DEFAULT_ARTIFACTS.outputDir),
    screenshots: exports.ScreenshotsConfigSchema.default(defaults_js_1.DEFAULT_ARTIFACTS.screenshots),
    video: exports.VideoConfigSchema.default(defaults_js_1.DEFAULT_ARTIFACTS.video),
    trace: exports.TraceConfigSchema.default(defaults_js_1.DEFAULT_ARTIFACTS.trace),
});
// =============================================================================
// Browsers Schemas
// =============================================================================
/** Browser type schema */
const BrowserTypeSchema = zod_1.z.enum(['chromium', 'firefox', 'webkit']);
/** Browser channel schema */
const BrowserChannelSchema = zod_1.z.enum(['bundled', 'msedge', 'chrome', 'chrome-beta', 'chrome-dev']);
/** Browser strategy schema */
const BrowserStrategySchema = zod_1.z.enum([
    'auto',
    'prefer-bundled',
    'prefer-system',
    'bundled-only',
    'system-only',
]);
/** Viewport size schema */
exports.ViewportSizeSchema = zod_1.z.object({
    width: positiveInt,
    height: positiveInt,
});
/** Browsers configuration schema */
exports.BrowsersConfigSchema = zod_1.z
    .object({
    enabled: zod_1.z.array(BrowserTypeSchema).min(1, 'At least one browser required').default(['chromium']),
    channel: BrowserChannelSchema.optional().default(defaults_js_1.DEFAULT_BROWSERS.channel ?? 'bundled'),
    strategy: BrowserStrategySchema.optional().default(defaults_js_1.DEFAULT_BROWSERS.strategy ?? 'auto'),
    viewport: exports.ViewportSizeSchema.default(defaults_js_1.DEFAULT_BROWSERS.viewport),
    headless: zod_1.z.boolean().default(defaults_js_1.DEFAULT_BROWSERS.headless),
    slowMo: positiveInt.optional(),
})
    .refine((config) => {
    if (config.channel === 'msedge' || config.channel.startsWith('chrome')) {
        return config.enabled.includes('chromium');
    }
    return true;
}, {
    message: "channel 'msedge' or 'chrome' requires 'chromium' in enabled browsers",
});
// =============================================================================
// Journeys Schemas
// =============================================================================
/** Journey layout schema */
const JourneyLayoutSchema = zod_1.z.enum(['flat', 'staged']);
/** Journey group by schema */
const JourneyGroupBySchema = zod_1.z.enum(['tier', 'status', 'scope']);
/** Journey ID configuration schema */
exports.JourneyIdConfigSchema = zod_1.z.object({
    prefix: zod_1.z.string().default(defaults_js_1.DEFAULT_JOURNEYS.id.prefix),
    width: positiveInt.default(defaults_js_1.DEFAULT_JOURNEYS.id.width),
});
/** Journey backlog configuration schema */
exports.JourneyBacklogConfigSchema = zod_1.z.object({
    groupBy: JourneyGroupBySchema.default(defaults_js_1.DEFAULT_JOURNEYS.backlog.groupBy),
    thenBy: JourneyGroupBySchema.optional(),
});
/** Journeys configuration schema */
exports.JourneysConfigSchema = zod_1.z.object({
    id: exports.JourneyIdConfigSchema.default(defaults_js_1.DEFAULT_JOURNEYS.id),
    layout: JourneyLayoutSchema.default(defaults_js_1.DEFAULT_JOURNEYS.layout),
    backlog: exports.JourneyBacklogConfigSchema.default(defaults_js_1.DEFAULT_JOURNEYS.backlog),
});
// =============================================================================
// Root Configuration Schema
// =============================================================================
/**
 * Root configuration schema with all validation rules
 *
 * Validates:
 * - version must equal SUPPORTED_CONFIG_VERSION (currently 1)
 * - app.baseUrl must be present (validated after env var resolution)
 * - auth.roles must have at least one role
 * - activeEnvironment must match a key in environments or be env var template
 * - Provider-specific configuration must be present
 */
exports.ARTKConfigSchema = zod_1.z
    .object({
    version: zod_1.z.number().int().min(1).optional().default(defaults_js_1.SUPPORTED_CONFIG_VERSION),
    app: exports.AppConfigSchema,
    environments: exports.EnvironmentsSchema.default({}),
    activeEnvironment: zod_1.z.string().default('default'),
    auth: exports.AuthConfigSchema,
    selectors: exports.SelectorsConfigSchema.default({
        testIdAttribute: defaults_js_1.DEFAULT_TEST_ID_ATTRIBUTE,
        strategy: [...defaults_js_1.DEFAULT_LOCATOR_STRATEGY],
    }),
    assertions: exports.AssertionsConfigSchema.default(defaults_js_1.DEFAULT_ASSERTIONS),
    data: exports.DataConfigSchema.default(defaults_js_1.DEFAULT_DATA),
    fixtures: exports.FixturesConfigSchema,
    tiers: exports.TiersSchema.default(defaults_js_1.DEFAULT_TIERS),
    reporters: exports.ReportersConfigSchema.default(defaults_js_1.DEFAULT_REPORTERS),
    artifacts: exports.ArtifactsConfigSchema.default(defaults_js_1.DEFAULT_ARTIFACTS),
    browsers: exports.BrowsersConfigSchema.default(defaults_js_1.DEFAULT_BROWSERS),
    journeys: exports.JourneysConfigSchema.default(defaults_js_1.DEFAULT_JOURNEYS),
})
    .superRefine((data, ctx) => {
    // Validate activeEnvironment matches an environment key or is env var template
    const isEnvVarTemplate = data.activeEnvironment.startsWith('${') &&
        data.activeEnvironment.includes('}');
    const envKeys = Object.keys(data.environments);
    // Validate activeEnvironment matches defined environments (only when environments is non-empty)
    // Note: Empty environments with custom activeEnvironment is allowed for backward compatibility
    // but may indicate misconfiguration - consider logging a warning at runtime
    if (!isEnvVarTemplate &&
        envKeys.length > 0 &&
        !envKeys.includes(data.activeEnvironment)) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: `activeEnvironment "${data.activeEnvironment}" does not match any defined environment. Available: ${envKeys.join(', ')}`,
            path: ['activeEnvironment'],
        });
    }
    // Validate fixtures.defaultRole exists in auth.roles
    const roleKeys = Object.keys(data.auth.roles);
    if (!roleKeys.includes(data.fixtures.defaultRole)) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: `fixtures.defaultRole "${data.fixtures.defaultRole}" does not match any defined role. Available: ${roleKeys.join(', ')}`,
            path: ['fixtures', 'defaultRole'],
        });
    }
    // Validate fixtures.roleFixtures all exist in auth.roles
    for (const roleFixture of data.fixtures.roleFixtures) {
        if (!roleKeys.includes(roleFixture)) {
            ctx.addIssue({
                code: zod_1.z.ZodIssueCode.custom,
                message: `fixtures.roleFixtures contains "${roleFixture}" which is not a defined role. Available: ${roleKeys.join(', ')}`,
                path: ['fixtures', 'roleFixtures'],
            });
        }
    }
});
//# sourceMappingURL=schema.js.map