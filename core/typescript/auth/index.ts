/**
 * ARTK Auth Module
 *
 * Provides authentication infrastructure for Playwright tests including:
 * - OIDC authentication with multiple IdP support (Keycloak, Azure AD, Okta)
 * - Form-based authentication
 * - Token-based authentication
 * - Storage state persistence and validation
 * - MFA (TOTP) support
 * - Auth setup project generation
 *
 * @module auth
 * @see FR-006 to FR-011 in spec.md
 * @see NFR-007 to NFR-012 in spec.md
 *
 * @example
 * ```typescript
 * // Basic OIDC authentication
 * import { OIDCAuthProvider, getCredentials, saveStorageState } from '@artk/core/auth';
 *
 * const provider = new OIDCAuthProvider({
 *   idpType: 'keycloak',
 *   loginUrl: 'https://app.example.com/login',
 *   success: { url: '/dashboard' },
 * });
 *
 * const credentials = getCredentials('admin', authConfig);
 * await provider.login(page, credentials);
 * await saveStorageState(context, 'admin');
 * ```
 */

// =============================================================================
// Types
// =============================================================================

export type {
  // Core types
  Credentials,
  StorageStateMetadata,
  StorageState,
  StorageStateCookie,
  StorageStateOrigin,
  LocalStorageEntry,

  // Provider interface
  AuthProvider,
  AuthRetryOptions,
  AuthPhase,
  AuthProviderType,
  AuthProviderFactory,

  // OIDC types
  OIDCIdpType,
  MFAType,
  OIDCAuthProviderConfig,
  OIDCSuccessConfig,
  OIDCIdpSelectors,
  OIDCMfaConfig,
  OIDCTimeoutsConfig,
  OIDCLogoutConfig,

  // Form auth types
  FormAuthProviderConfig,
  FormAuthSelectors,
  FormAuthSuccessConfig,
  FormAuthTimeoutsConfig,

  // Token auth types
  TokenAuthProviderConfig,
  TokenAuthRequestBody,

  // Setup types
  AuthSetupProject,
  AuthSetupOptions,

  // IdP handler types
  IdpHandler,

  // Cleanup types
  CleanupResult,
  CleanupError,
} from './types.js';

// =============================================================================
// Credentials
// =============================================================================

export {
  getCredentials,
  getCredentialsFromRoleConfig,
  validateCredentials,
  formatMissingCredentialsError,
  hasCredentials,
  type GetCredentialsOptions,
  type MissingCredential,
} from './credentials.js';

// =============================================================================
// Storage State
// =============================================================================

export {
  // Core functions
  saveStorageState,
  loadStorageState,
  isStorageStateValid,
  getStorageStateMetadata,
  readStorageState,
  clearStorageState,

  // Cleanup functions (NFR-007, NFR-008)
  cleanupExpiredStorageStates,
  cleanupStorageStatesOlderThan,
  CLEANUP_MAX_AGE_MS,

  // Utilities
  getRoleFromPath,
  listStorageStates,

  // Configuration
  DEFAULT_STORAGE_STATE_CONFIG,
  type StorageStateOptions,
} from './storage-state.js';

// =============================================================================
// OIDC Flow
// =============================================================================

export {
  // TOTP functions (FR-010)
  generateTOTPCode,
  verifyTOTPCode,
  getTimeUntilNextTOTPWindow,
  waitForFreshTOTPWindow,

  // Flow execution
  executeOIDCFlow,
  isOIDCSessionValid,

  // Types
  type OIDCFlowOptions,
  type OIDCFlowResult,
} from './oidc/flow.js';

// =============================================================================
// IdP Handlers
// =============================================================================

export { keycloakHandler, isKeycloakLoginPage, getKeycloakErrorMessage } from './oidc/providers/keycloak.js';
export { azureAdHandler, isAzureAdLoginPage, getAzureAdErrorMessage, isAzureAdMfaRequired } from './oidc/providers/azure-ad.js';
export { oktaHandler, isOktaLoginPage, getOktaErrorMessage, isOktaFactorSelectionRequired } from './oidc/providers/okta.js';
export { genericHandler, createGenericHandler, detectIdpType, getGenericErrorMessage } from './oidc/providers/generic.js';

// =============================================================================
// Auth Providers
// =============================================================================

// Base provider
export { BaseAuthProvider, DEFAULT_AUTH_RETRY_OPTIONS, type LoginOptions, type LogoutOptions } from './providers/base.js';

// OIDC provider
export { OIDCAuthProvider, createOIDCAuthProvider, getIdpHandler } from './providers/oidc.js';

// Form provider
export { FormAuthProvider, createFormAuthProvider } from './providers/form.js';

// Token provider
export { TokenAuthProvider, createTokenAuthProvider, getStoredToken } from './providers/token.js';

// Custom provider base
export { CustomAuthProvider, ExampleCustomAuthProvider } from './providers/custom.js';

// =============================================================================
// Auth Setup Factory
// =============================================================================

export {
  // Setup creation
  createAuthSetup,
  createAllAuthSetups,
  generateAuthSetupCode,

  // Playwright config integration
  generateAuthProjects,
  type PlaywrightAuthProject,

  // Factory
  createAuthProviderFromConfig,
  type AuthProviderLike,

  // Utilities
  getRoleNames,
  getStorageStateDirectory,
  hasRole,
  getRoleConfig,
} from './setup-factory.js';

// =============================================================================
// Errors (re-export from errors module)
// =============================================================================

export { ARTKAuthError } from '../errors/auth-error.js';
export { ARTKStorageStateError } from '../errors/storage-state-error.js';
