"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExampleCustomAuthProvider = exports.CustomAuthProvider = exports.getStoredToken = exports.createTokenAuthProvider = exports.TokenAuthProvider = exports.createFormAuthProvider = exports.FormAuthProvider = exports.getIdpHandler = exports.createOIDCAuthProvider = exports.OIDCAuthProvider = exports.DEFAULT_AUTH_RETRY_OPTIONS = exports.BaseAuthProvider = exports.getGenericErrorMessage = exports.detectIdpType = exports.createGenericHandler = exports.genericHandler = exports.isOktaFactorSelectionRequired = exports.getOktaErrorMessage = exports.isOktaLoginPage = exports.oktaHandler = exports.isAzureAdMfaRequired = exports.getAzureAdErrorMessage = exports.isAzureAdLoginPage = exports.azureAdHandler = exports.getKeycloakErrorMessage = exports.isKeycloakLoginPage = exports.keycloakHandler = exports.isOIDCSessionValid = exports.executeOIDCFlow = exports.waitForFreshTOTPWindow = exports.getTimeUntilNextTOTPWindow = exports.verifyTOTPCode = exports.generateTOTPCode = exports.DEFAULT_STORAGE_STATE_CONFIG = exports.listStorageStates = exports.getRoleFromPath = exports.CLEANUP_MAX_AGE_MS = exports.cleanupStorageStatesOlderThan = exports.cleanupExpiredStorageStates = exports.clearStorageState = exports.readStorageState = exports.getStorageStateMetadata = exports.isStorageStateValid = exports.loadStorageState = exports.saveStorageState = exports.hasCredentials = exports.formatMissingCredentialsError = exports.validateCredentials = exports.getCredentialsFromRoleConfig = exports.getCredentials = void 0;
exports.ARTKStorageStateError = exports.ARTKAuthError = exports.getRoleConfig = exports.hasRole = exports.getStorageStateDirectory = exports.getRoleNames = exports.createAuthProviderFromConfig = exports.generateAuthProjects = exports.generateAuthSetupCode = exports.createAllAuthSetups = exports.createAuthSetup = void 0;
// =============================================================================
// Credentials
// =============================================================================
var credentials_js_1 = require("./credentials.js");
Object.defineProperty(exports, "getCredentials", { enumerable: true, get: function () { return credentials_js_1.getCredentials; } });
Object.defineProperty(exports, "getCredentialsFromRoleConfig", { enumerable: true, get: function () { return credentials_js_1.getCredentialsFromRoleConfig; } });
Object.defineProperty(exports, "validateCredentials", { enumerable: true, get: function () { return credentials_js_1.validateCredentials; } });
Object.defineProperty(exports, "formatMissingCredentialsError", { enumerable: true, get: function () { return credentials_js_1.formatMissingCredentialsError; } });
Object.defineProperty(exports, "hasCredentials", { enumerable: true, get: function () { return credentials_js_1.hasCredentials; } });
// =============================================================================
// Storage State
// =============================================================================
var storage_state_js_1 = require("./storage-state.js");
// Core functions
Object.defineProperty(exports, "saveStorageState", { enumerable: true, get: function () { return storage_state_js_1.saveStorageState; } });
Object.defineProperty(exports, "loadStorageState", { enumerable: true, get: function () { return storage_state_js_1.loadStorageState; } });
Object.defineProperty(exports, "isStorageStateValid", { enumerable: true, get: function () { return storage_state_js_1.isStorageStateValid; } });
Object.defineProperty(exports, "getStorageStateMetadata", { enumerable: true, get: function () { return storage_state_js_1.getStorageStateMetadata; } });
Object.defineProperty(exports, "readStorageState", { enumerable: true, get: function () { return storage_state_js_1.readStorageState; } });
Object.defineProperty(exports, "clearStorageState", { enumerable: true, get: function () { return storage_state_js_1.clearStorageState; } });
// Cleanup functions (NFR-007, NFR-008)
Object.defineProperty(exports, "cleanupExpiredStorageStates", { enumerable: true, get: function () { return storage_state_js_1.cleanupExpiredStorageStates; } });
Object.defineProperty(exports, "cleanupStorageStatesOlderThan", { enumerable: true, get: function () { return storage_state_js_1.cleanupStorageStatesOlderThan; } });
Object.defineProperty(exports, "CLEANUP_MAX_AGE_MS", { enumerable: true, get: function () { return storage_state_js_1.CLEANUP_MAX_AGE_MS; } });
// Utilities
Object.defineProperty(exports, "getRoleFromPath", { enumerable: true, get: function () { return storage_state_js_1.getRoleFromPath; } });
Object.defineProperty(exports, "listStorageStates", { enumerable: true, get: function () { return storage_state_js_1.listStorageStates; } });
// Configuration
Object.defineProperty(exports, "DEFAULT_STORAGE_STATE_CONFIG", { enumerable: true, get: function () { return storage_state_js_1.DEFAULT_STORAGE_STATE_CONFIG; } });
// =============================================================================
// OIDC Flow
// =============================================================================
var flow_js_1 = require("./oidc/flow.js");
// TOTP functions (FR-010)
Object.defineProperty(exports, "generateTOTPCode", { enumerable: true, get: function () { return flow_js_1.generateTOTPCode; } });
Object.defineProperty(exports, "verifyTOTPCode", { enumerable: true, get: function () { return flow_js_1.verifyTOTPCode; } });
Object.defineProperty(exports, "getTimeUntilNextTOTPWindow", { enumerable: true, get: function () { return flow_js_1.getTimeUntilNextTOTPWindow; } });
Object.defineProperty(exports, "waitForFreshTOTPWindow", { enumerable: true, get: function () { return flow_js_1.waitForFreshTOTPWindow; } });
// Flow execution
Object.defineProperty(exports, "executeOIDCFlow", { enumerable: true, get: function () { return flow_js_1.executeOIDCFlow; } });
Object.defineProperty(exports, "isOIDCSessionValid", { enumerable: true, get: function () { return flow_js_1.isOIDCSessionValid; } });
// =============================================================================
// IdP Handlers
// =============================================================================
var keycloak_js_1 = require("./oidc/providers/keycloak.js");
Object.defineProperty(exports, "keycloakHandler", { enumerable: true, get: function () { return keycloak_js_1.keycloakHandler; } });
Object.defineProperty(exports, "isKeycloakLoginPage", { enumerable: true, get: function () { return keycloak_js_1.isKeycloakLoginPage; } });
Object.defineProperty(exports, "getKeycloakErrorMessage", { enumerable: true, get: function () { return keycloak_js_1.getKeycloakErrorMessage; } });
var azure_ad_js_1 = require("./oidc/providers/azure-ad.js");
Object.defineProperty(exports, "azureAdHandler", { enumerable: true, get: function () { return azure_ad_js_1.azureAdHandler; } });
Object.defineProperty(exports, "isAzureAdLoginPage", { enumerable: true, get: function () { return azure_ad_js_1.isAzureAdLoginPage; } });
Object.defineProperty(exports, "getAzureAdErrorMessage", { enumerable: true, get: function () { return azure_ad_js_1.getAzureAdErrorMessage; } });
Object.defineProperty(exports, "isAzureAdMfaRequired", { enumerable: true, get: function () { return azure_ad_js_1.isAzureAdMfaRequired; } });
var okta_js_1 = require("./oidc/providers/okta.js");
Object.defineProperty(exports, "oktaHandler", { enumerable: true, get: function () { return okta_js_1.oktaHandler; } });
Object.defineProperty(exports, "isOktaLoginPage", { enumerable: true, get: function () { return okta_js_1.isOktaLoginPage; } });
Object.defineProperty(exports, "getOktaErrorMessage", { enumerable: true, get: function () { return okta_js_1.getOktaErrorMessage; } });
Object.defineProperty(exports, "isOktaFactorSelectionRequired", { enumerable: true, get: function () { return okta_js_1.isOktaFactorSelectionRequired; } });
var generic_js_1 = require("./oidc/providers/generic.js");
Object.defineProperty(exports, "genericHandler", { enumerable: true, get: function () { return generic_js_1.genericHandler; } });
Object.defineProperty(exports, "createGenericHandler", { enumerable: true, get: function () { return generic_js_1.createGenericHandler; } });
Object.defineProperty(exports, "detectIdpType", { enumerable: true, get: function () { return generic_js_1.detectIdpType; } });
Object.defineProperty(exports, "getGenericErrorMessage", { enumerable: true, get: function () { return generic_js_1.getGenericErrorMessage; } });
// =============================================================================
// Auth Providers
// =============================================================================
// Base provider
var base_js_1 = require("./providers/base.js");
Object.defineProperty(exports, "BaseAuthProvider", { enumerable: true, get: function () { return base_js_1.BaseAuthProvider; } });
Object.defineProperty(exports, "DEFAULT_AUTH_RETRY_OPTIONS", { enumerable: true, get: function () { return base_js_1.DEFAULT_AUTH_RETRY_OPTIONS; } });
// OIDC provider
var oidc_js_1 = require("./providers/oidc.js");
Object.defineProperty(exports, "OIDCAuthProvider", { enumerable: true, get: function () { return oidc_js_1.OIDCAuthProvider; } });
Object.defineProperty(exports, "createOIDCAuthProvider", { enumerable: true, get: function () { return oidc_js_1.createOIDCAuthProvider; } });
Object.defineProperty(exports, "getIdpHandler", { enumerable: true, get: function () { return oidc_js_1.getIdpHandler; } });
// Form provider
var form_js_1 = require("./providers/form.js");
Object.defineProperty(exports, "FormAuthProvider", { enumerable: true, get: function () { return form_js_1.FormAuthProvider; } });
Object.defineProperty(exports, "createFormAuthProvider", { enumerable: true, get: function () { return form_js_1.createFormAuthProvider; } });
// Token provider
var token_js_1 = require("./providers/token.js");
Object.defineProperty(exports, "TokenAuthProvider", { enumerable: true, get: function () { return token_js_1.TokenAuthProvider; } });
Object.defineProperty(exports, "createTokenAuthProvider", { enumerable: true, get: function () { return token_js_1.createTokenAuthProvider; } });
Object.defineProperty(exports, "getStoredToken", { enumerable: true, get: function () { return token_js_1.getStoredToken; } });
// Custom provider base
var custom_js_1 = require("./providers/custom.js");
Object.defineProperty(exports, "CustomAuthProvider", { enumerable: true, get: function () { return custom_js_1.CustomAuthProvider; } });
Object.defineProperty(exports, "ExampleCustomAuthProvider", { enumerable: true, get: function () { return custom_js_1.ExampleCustomAuthProvider; } });
// =============================================================================
// Auth Setup Factory
// =============================================================================
var setup_factory_js_1 = require("./setup-factory.js");
// Setup creation
Object.defineProperty(exports, "createAuthSetup", { enumerable: true, get: function () { return setup_factory_js_1.createAuthSetup; } });
Object.defineProperty(exports, "createAllAuthSetups", { enumerable: true, get: function () { return setup_factory_js_1.createAllAuthSetups; } });
Object.defineProperty(exports, "generateAuthSetupCode", { enumerable: true, get: function () { return setup_factory_js_1.generateAuthSetupCode; } });
// Playwright config integration
Object.defineProperty(exports, "generateAuthProjects", { enumerable: true, get: function () { return setup_factory_js_1.generateAuthProjects; } });
// Factory
Object.defineProperty(exports, "createAuthProviderFromConfig", { enumerable: true, get: function () { return setup_factory_js_1.createAuthProviderFromConfig; } });
// Utilities
Object.defineProperty(exports, "getRoleNames", { enumerable: true, get: function () { return setup_factory_js_1.getRoleNames; } });
Object.defineProperty(exports, "getStorageStateDirectory", { enumerable: true, get: function () { return setup_factory_js_1.getStorageStateDirectory; } });
Object.defineProperty(exports, "hasRole", { enumerable: true, get: function () { return setup_factory_js_1.hasRole; } });
Object.defineProperty(exports, "getRoleConfig", { enumerable: true, get: function () { return setup_factory_js_1.getRoleConfig; } });
// =============================================================================
// Errors (re-export from errors module)
// =============================================================================
var auth_error_js_1 = require("../errors/auth-error.js");
Object.defineProperty(exports, "ARTKAuthError", { enumerable: true, get: function () { return auth_error_js_1.ARTKAuthError; } });
var storage_state_error_js_1 = require("../errors/storage-state-error.js");
Object.defineProperty(exports, "ARTKStorageStateError", { enumerable: true, get: function () { return storage_state_error_js_1.ARTKStorageStateError; } });
//# sourceMappingURL=index.js.map