/**
 * Zod validation schemas for ARTK configuration
 *
 * Provides runtime type checking and validation for configuration loaded
 * from artk.config.yml. All validation errors include field paths for
 * easy debugging (FR-002).
 *
 * @module config/schema
 */

import { z } from 'zod';
import {
  DEFAULT_APP_TYPE,
  DEFAULT_ARTIFACTS,
  DEFAULT_ASSERTIONS,
  DEFAULT_BROWSERS,
  DEFAULT_CALLBACK_MS,
  DEFAULT_CAPTURE_MODE,
  DEFAULT_DATA,
  DEFAULT_IDP_REDIRECT_MS,
  DEFAULT_JOURNEYS,
  DEFAULT_LOADING_TIMEOUT,
  DEFAULT_LOCATOR_STRATEGY,
  DEFAULT_LOGIN_FLOW_MS,
  DEFAULT_MFA_ENABLED,
  DEFAULT_MFA_TYPE,
  DEFAULT_OIDC_SUCCESS_TIMEOUT,
  DEFAULT_PUSH_TIMEOUT_MS,
  DEFAULT_REPORTER_OPEN,
  DEFAULT_REPORTERS,
  DEFAULT_SCREENSHOT_MODE,
  DEFAULT_STORAGE_STATE,
  DEFAULT_TEST_ID_ATTRIBUTE,
  DEFAULT_TIERS,
  DEFAULT_TOAST_TIMEOUT,
  SUPPORTED_CONFIG_VERSION,
} from './defaults.js';

// =============================================================================
// Primitive Schemas
// =============================================================================

/** Non-empty string */
const nonEmptyString = z.string().min(1, 'Must not be empty');

/** Positive integer */
const positiveInt = z.number().int().positive();

/** Non-negative integer */
const nonNegativeInt = z.number().int().nonnegative();

/** Positive number */
const positiveNumber = z.number().positive();

// =============================================================================
// Application Schemas
// =============================================================================

/** Application type schema */
const AppTypeSchema = z.enum(['spa', 'ssr', 'hybrid']);

/** Application configuration schema */
export const AppConfigSchema = z.object({
  name: nonEmptyString.describe('Application name'),
  baseUrl: nonEmptyString.describe('Base URL with env var support'),
  type: AppTypeSchema.default(DEFAULT_APP_TYPE),
});

// =============================================================================
// Environment Schemas
// =============================================================================

/** Environment configuration schema */
export const EnvironmentConfigSchema = z.object({
  baseUrl: nonEmptyString.describe('Environment base URL'),
  apiUrl: z.string().optional(),
});

/** Environments record schema */
export const EnvironmentsSchema = z.record(z.string(), EnvironmentConfigSchema);

// =============================================================================
// Storage State Schemas
// =============================================================================

/** Storage state configuration schema */
export const StorageStateConfigSchema = z.object({
  directory: z.string().default(DEFAULT_STORAGE_STATE.directory),
  maxAgeMinutes: positiveNumber.default(DEFAULT_STORAGE_STATE.maxAgeMinutes),
  filePattern: nonEmptyString.default(DEFAULT_STORAGE_STATE.filePattern),
});

// =============================================================================
// Credentials Schemas
// =============================================================================

/** Credentials environment variable schema */
export const CredentialsEnvConfigSchema = z.object({
  username: nonEmptyString.describe('Env var name for username'),
  password: nonEmptyString.describe('Env var name for password'),
});

// =============================================================================
// OIDC Schemas
// =============================================================================

/** OIDC IdP type schema */
const OIDCIdpTypeSchema = z.enum([
  'keycloak',
  'azure-ad',
  'okta',
  'auth0',
  'generic',
]);

/** MFA type schema */
const MFATypeSchema = z.enum(['totp', 'push', 'sms', 'none']);

/** OIDC success configuration schema */
export const OIDCSuccessConfigSchema = z
  .object({
    url: z.string().optional(),
    selector: z.string().optional(),
    timeout: positiveInt.default(DEFAULT_OIDC_SUCCESS_TIMEOUT),
  })
  .refine((data) => data.url !== undefined || data.selector !== undefined, {
    message: 'Either success.url or success.selector is required',
  });

/** OIDC IdP selectors schema */
export const OIDCIdpSelectorsSchema = z
  .object({
    username: z.string().optional(),
    password: z.string().optional(),
    submit: z.string().optional(),
    staySignedInNo: z.string().optional(),
  })
  .optional();

/** MFA configuration schema */
export const MFAConfigSchema = z
  .object({
    enabled: z.boolean().default(DEFAULT_MFA_ENABLED),
    type: MFATypeSchema.default(DEFAULT_MFA_TYPE),
    totpSecretEnv: z.string().optional(),
    pushTimeoutMs: positiveInt.default(DEFAULT_PUSH_TIMEOUT_MS),
  })
  .optional();

/** OIDC timeouts schema */
export const OIDCTimeoutsSchema = z
  .object({
    loginFlowMs: positiveInt.default(DEFAULT_LOGIN_FLOW_MS),
    idpRedirectMs: positiveInt.default(DEFAULT_IDP_REDIRECT_MS),
    callbackMs: positiveInt.default(DEFAULT_CALLBACK_MS),
  })
  .optional();

/** OIDC logout schema */
export const OIDCLogoutConfigSchema = z
  .object({
    url: z.string().optional(),
    idpLogout: z.boolean().optional(),
  })
  .optional();

/** OIDC configuration schema */
export const OIDCConfigSchema = z
  .object({
    idpType: OIDCIdpTypeSchema,
    loginUrl: nonEmptyString.describe('Login initiation URL'),
    idpLoginUrl: z.string().optional(),
    success: OIDCSuccessConfigSchema,
    idpSelectors: OIDCIdpSelectorsSchema,
    mfa: MFAConfigSchema,
    timeouts: OIDCTimeoutsSchema,
    logout: OIDCLogoutConfigSchema,
  })
  .optional();

// =============================================================================
// Form Auth Schemas
// =============================================================================

/** Form auth selectors schema */
export const FormAuthSelectorsSchema = z.object({
  username: nonEmptyString,
  password: nonEmptyString,
  submit: nonEmptyString,
});

/** Form auth success schema */
export const FormAuthSuccessConfigSchema = z.object({
  url: z.string().optional(),
  selector: z.string().optional(),
});

/** Form auth configuration schema */
export const FormAuthConfigSchema = z
  .object({
    loginUrl: nonEmptyString,
    selectors: FormAuthSelectorsSchema,
    success: FormAuthSuccessConfigSchema,
  })
  .optional();

// =============================================================================
// Role Schemas
// =============================================================================

/** Role configuration schema */
export const RoleConfigSchema = z.object({
  credentialsEnv: CredentialsEnvConfigSchema,
  description: z.string().optional(),
  oidcOverrides: OIDCConfigSchema.optional(),
});

/** Roles record schema */
export const RolesSchema = z.record(z.string(), RoleConfigSchema);

// =============================================================================
// Auth Schemas
// =============================================================================

/** Auth provider type schema */
const AuthProviderTypeSchema = z.enum(['oidc', 'form', 'token', 'custom']);

/** Auth configuration schema with provider-specific validation */
export const AuthConfigSchema = z
  .object({
    provider: AuthProviderTypeSchema,
    storageState: StorageStateConfigSchema.default(DEFAULT_STORAGE_STATE),
    roles: RolesSchema.refine((roles) => Object.keys(roles).length > 0, {
      message: 'At least one role must be defined',
    }),
    oidc: OIDCConfigSchema,
    form: FormAuthConfigSchema,
  })
  .superRefine((data, ctx) => {
    // Validate provider-specific configuration
    if (data.provider === 'oidc' && data.oidc === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'OIDC configuration is required when provider is "oidc"',
        path: ['oidc'],
      });
    }
    if (data.provider === 'form' && data.form === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Form configuration is required when provider is "form"',
        path: ['form'],
      });
    }
  });

// =============================================================================
// Selectors Schemas
// =============================================================================

/** Locator strategy schema */
const LocatorStrategySchema = z.enum([
  'role',
  'label',
  'placeholder',
  'testid',
  'text',
  'css',
]);

/** Selectors configuration schema */
export const SelectorsConfigSchema = z.object({
  testIdAttribute: z.string().default(DEFAULT_TEST_ID_ATTRIBUTE),
  strategy: z.array(LocatorStrategySchema).default([...DEFAULT_LOCATOR_STRATEGY]),
  customTestIds: z.array(z.string()).optional(),
});

// =============================================================================
// Assertions Schemas
// =============================================================================

/** Toast assertion schema */
export const ToastAssertionConfigSchema = z.object({
  containerSelector: nonEmptyString,
  messageSelector: nonEmptyString,
  typeAttribute: nonEmptyString,
  timeout: positiveInt.default(DEFAULT_TOAST_TIMEOUT),
});

/** Loading assertion schema */
export const LoadingAssertionConfigSchema = z.object({
  selectors: z.array(nonEmptyString).min(1, 'At least one loading selector required'),
  timeout: positiveInt.default(DEFAULT_LOADING_TIMEOUT),
});

/** Form assertion schema */
export const FormAssertionConfigSchema = z.object({
  errorSelector: nonEmptyString,
  formErrorSelector: nonEmptyString,
});

/** Assertions configuration schema */
export const AssertionsConfigSchema = z.object({
  toast: ToastAssertionConfigSchema.default(DEFAULT_ASSERTIONS.toast),
  loading: LoadingAssertionConfigSchema.default(DEFAULT_ASSERTIONS.loading),
  form: FormAssertionConfigSchema.default(DEFAULT_ASSERTIONS.form),
});

// =============================================================================
// Data Schemas
// =============================================================================

/** Namespace configuration schema */
export const NamespaceConfigSchema = z.object({
  prefix: z.string().default(DEFAULT_DATA.namespace.prefix),
  suffix: z.string().default(DEFAULT_DATA.namespace.suffix),
});

/** Cleanup configuration schema */
export const CleanupConfigSchema = z.object({
  enabled: z.boolean().default(DEFAULT_DATA.cleanup.enabled),
  onFailure: z.boolean().default(DEFAULT_DATA.cleanup.onFailure),
  parallel: z.boolean().default(DEFAULT_DATA.cleanup.parallel),
});

/** Data API configuration schema */
export const DataApiConfigSchema = z
  .object({
    baseUrl: nonEmptyString,
    useMainAuth: z.boolean().default(true),
  })
  .optional();

/** Data configuration schema */
export const DataConfigSchema = z.object({
  namespace: NamespaceConfigSchema.default(DEFAULT_DATA.namespace),
  cleanup: CleanupConfigSchema.default(DEFAULT_DATA.cleanup),
  api: DataApiConfigSchema,
});

// =============================================================================
// Fixtures Schemas
// =============================================================================

/** Fixtures API configuration schema */
export const FixturesApiConfigSchema = z
  .object({
    baseURL: nonEmptyString,
    extraHTTPHeaders: z.record(z.string(), z.string()).optional(),
  })
  .optional();

/** Fixtures configuration schema */
export const FixturesConfigSchema = z.object({
  defaultRole: nonEmptyString,
  roleFixtures: z.array(nonEmptyString).default([]),
  api: FixturesApiConfigSchema,
});

// =============================================================================
// Tier Schemas
// =============================================================================

/** Tier configuration schema */
export const TierConfigSchema = z.object({
  retries: nonNegativeInt,
  workers: positiveInt,
  timeout: positiveInt,
  tag: nonEmptyString,
});

/** Tiers record schema */
export const TiersSchema = z.record(z.string(), TierConfigSchema);

// =============================================================================
// Reporters Schemas
// =============================================================================

/** Reporter open mode schema */
const ReporterOpenModeSchema = z.enum(['always', 'never', 'on-failure']);

/** HTML reporter schema */
export const HtmlReporterConfigSchema = z
  .object({
    enabled: z.boolean().default(true),
    outputFolder: z.string().default('playwright-report'),
    open: ReporterOpenModeSchema.default(DEFAULT_REPORTER_OPEN),
  })
  .optional();

/** JSON reporter schema */
export const JsonReporterConfigSchema = z
  .object({
    enabled: z.boolean().default(false),
    outputFile: z.string().default('test-results.json'),
  })
  .optional();

/** JUnit reporter schema */
export const JunitReporterConfigSchema = z
  .object({
    enabled: z.boolean().default(false),
    outputFile: z.string().default('junit.xml'),
  })
  .optional();

/** ARTK reporter schema */
export const ArtkReporterConfigSchema = z
  .object({
    enabled: z.boolean().default(true),
    outputFile: z.string().default('artk-report.json'),
    includeJourneyMapping: z.boolean().default(true),
  })
  .optional();

/** Reporters configuration schema */
export const ReportersConfigSchema = z.object({
  html: HtmlReporterConfigSchema,
  json: JsonReporterConfigSchema,
  junit: JunitReporterConfigSchema,
  artk: ArtkReporterConfigSchema,
});

// =============================================================================
// Artifacts Schemas
// =============================================================================

/** Screenshot mode schema */
const ScreenshotModeSchema = z.enum(['off', 'on', 'only-on-failure']);

/** Capture mode schema */
const CaptureModeSchema = z.enum([
  'off',
  'on',
  'retain-on-failure',
  'on-first-retry',
]);

/** Video size schema */
export const VideoSizeSchema = z
  .object({
    width: positiveInt,
    height: positiveInt,
  })
  .optional();

/** Screenshots configuration schema */
export const ScreenshotsConfigSchema = z.object({
  mode: ScreenshotModeSchema.default(DEFAULT_SCREENSHOT_MODE),
  fullPage: z.boolean().default(DEFAULT_ARTIFACTS.screenshots.fullPage),
  maskPii: z.boolean().default(DEFAULT_ARTIFACTS.screenshots.maskPii),
  piiSelectors: z.array(z.string()).default([]),
});

/** Video configuration schema */
export const VideoConfigSchema = z.object({
  mode: CaptureModeSchema.default(DEFAULT_CAPTURE_MODE),
  size: VideoSizeSchema,
});

/** Trace configuration schema */
export const TraceConfigSchema = z.object({
  mode: CaptureModeSchema.default(DEFAULT_CAPTURE_MODE),
  screenshots: z.boolean().default(true),
  snapshots: z.boolean().default(true),
});

/** Artifacts configuration schema */
export const ArtifactsConfigSchema = z.object({
  outputDir: z.string().default(DEFAULT_ARTIFACTS.outputDir),
  screenshots: ScreenshotsConfigSchema.default(DEFAULT_ARTIFACTS.screenshots),
  video: VideoConfigSchema.default(DEFAULT_ARTIFACTS.video),
  trace: TraceConfigSchema.default(DEFAULT_ARTIFACTS.trace),
});

// =============================================================================
// Browsers Schemas
// =============================================================================

/** Browser type schema */
const BrowserTypeSchema = z.enum(['chromium', 'firefox', 'webkit']);

/** Viewport size schema */
export const ViewportSizeSchema = z.object({
  width: positiveInt,
  height: positiveInt,
});

/** Browsers configuration schema */
export const BrowsersConfigSchema = z.object({
  enabled: z.array(BrowserTypeSchema).min(1, 'At least one browser required').default(['chromium']),
  viewport: ViewportSizeSchema.default(DEFAULT_BROWSERS.viewport),
  headless: z.boolean().default(DEFAULT_BROWSERS.headless),
  slowMo: positiveInt.optional(),
});

// =============================================================================
// Journeys Schemas
// =============================================================================

/** Journey layout schema */
const JourneyLayoutSchema = z.enum(['flat', 'staged']);

/** Journey group by schema */
const JourneyGroupBySchema = z.enum(['tier', 'status', 'scope']);

/** Journey ID configuration schema */
export const JourneyIdConfigSchema = z.object({
  prefix: z.string().default(DEFAULT_JOURNEYS.id.prefix),
  width: positiveInt.default(DEFAULT_JOURNEYS.id.width),
});

/** Journey backlog configuration schema */
export const JourneyBacklogConfigSchema = z.object({
  groupBy: JourneyGroupBySchema.default(DEFAULT_JOURNEYS.backlog.groupBy),
  thenBy: JourneyGroupBySchema.optional(),
});

/** Journeys configuration schema */
export const JourneysConfigSchema = z.object({
  id: JourneyIdConfigSchema.default(DEFAULT_JOURNEYS.id),
  layout: JourneyLayoutSchema.default(DEFAULT_JOURNEYS.layout),
  backlog: JourneyBacklogConfigSchema.default(DEFAULT_JOURNEYS.backlog),
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
export const ARTKConfigSchema = z
  .object({
    version: z.literal(SUPPORTED_CONFIG_VERSION, {
      errorMap: () => ({
        message: `Configuration version must be ${SUPPORTED_CONFIG_VERSION}`,
      }),
    }),
    app: AppConfigSchema,
    environments: EnvironmentsSchema.default({}),
    activeEnvironment: z.string().default('default'),
    auth: AuthConfigSchema,
    selectors: SelectorsConfigSchema.default({
      testIdAttribute: DEFAULT_TEST_ID_ATTRIBUTE,
      strategy: [...DEFAULT_LOCATOR_STRATEGY],
    }),
    assertions: AssertionsConfigSchema.default(DEFAULT_ASSERTIONS),
    data: DataConfigSchema.default(DEFAULT_DATA),
    fixtures: FixturesConfigSchema,
    tiers: TiersSchema.default(DEFAULT_TIERS),
    reporters: ReportersConfigSchema.default(DEFAULT_REPORTERS),
    artifacts: ArtifactsConfigSchema.default(DEFAULT_ARTIFACTS),
    browsers: BrowsersConfigSchema.default(DEFAULT_BROWSERS),
    journeys: JourneysConfigSchema.default(DEFAULT_JOURNEYS),
  })
  .superRefine((data, ctx) => {
    // Validate activeEnvironment matches an environment key or is env var template
    const isEnvVarTemplate =
      data.activeEnvironment.startsWith('${') &&
      data.activeEnvironment.includes('}');
    const envKeys = Object.keys(data.environments);

    if (
      !isEnvVarTemplate &&
      envKeys.length > 0 &&
      !envKeys.includes(data.activeEnvironment)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `activeEnvironment "${data.activeEnvironment}" does not match any defined environment. Available: ${envKeys.join(', ')}`,
        path: ['activeEnvironment'],
      });
    }

    // Validate fixtures.defaultRole exists in auth.roles
    const roleKeys = Object.keys(data.auth.roles);
    if (!roleKeys.includes(data.fixtures.defaultRole)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `fixtures.defaultRole "${data.fixtures.defaultRole}" does not match any defined role. Available: ${roleKeys.join(', ')}`,
        path: ['fixtures', 'defaultRole'],
      });
    }

    // Validate fixtures.roleFixtures all exist in auth.roles
    for (const roleFixture of data.fixtures.roleFixtures) {
      if (!roleKeys.includes(roleFixture)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `fixtures.roleFixtures contains "${roleFixture}" which is not a defined role. Available: ${roleKeys.join(', ')}`,
          path: ['fixtures', 'roleFixtures'],
        });
      }
    }
  });

// =============================================================================
// Type Exports
// =============================================================================

/** Inferred type from ARTKConfigSchema */
export type ARTKConfigInput = z.input<typeof ARTKConfigSchema>;

/** Validated ARTKConfig type */
export type ARTKConfigOutput = z.output<typeof ARTKConfigSchema>;
