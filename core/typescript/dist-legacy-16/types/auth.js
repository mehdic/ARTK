"use strict";
/**
 * @module types/auth
 * @description Authentication type definitions for ARTK E2E independent architecture.
 * Defines authentication provider configuration and role definitions.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_STORAGE_STATE_DIR = void 0;
exports.isArtkRole = isArtkRole;
exports.isValidEnvVarName = isValidEnvVarName;
exports.isArtkAuthConfig = isArtkAuthConfig;
/**
 * Type guard to check if a value is a valid ArtkRole.
 */
function isArtkRole(value) {
    if (typeof value !== 'object' || value === null)
        return false;
    const obj = value;
    // Check credentialsEnv
    if (typeof obj.credentialsEnv !== 'object' || obj.credentialsEnv === null)
        return false;
    const creds = obj.credentialsEnv;
    if (typeof creds.username !== 'string' || creds.username.length === 0)
        return false;
    if (typeof creds.password !== 'string' || creds.password.length === 0)
        return false;
    // Check totpSecretEnv (optional)
    if (obj.totpSecretEnv !== undefined &&
        typeof obj.totpSecretEnv !== 'string') {
        return false;
    }
    // Check storageState (optional)
    if (obj.storageState !== undefined) {
        if (typeof obj.storageState !== 'object' || obj.storageState === null) {
            return false;
        }
        const storage = obj.storageState;
        for (const [, v] of Object.entries(storage)) {
            if (typeof v !== 'string')
                return false;
        }
    }
    return true;
}
/**
 * Validates that an environment variable name follows the expected pattern.
 * @pattern ^[A-Z][A-Z0-9_]*$
 */
function isValidEnvVarName(name) {
    return /^[A-Z][A-Z0-9_]*$/.test(name);
}
/**
 * Type guard to check if a value is a valid ArtkAuthConfig.
 */
function isArtkAuthConfig(value) {
    if (typeof value !== 'object' || value === null)
        return false;
    const obj = value;
    // Check provider
    if (!['oidc', 'saml', 'basic', 'custom'].includes(obj.provider)) {
        return false;
    }
    // Check idpType (optional)
    if (obj.idpType !== undefined) {
        if (!['keycloak', 'auth0', 'okta', 'azure-ad', 'other'].includes(obj.idpType)) {
            return false;
        }
    }
    // Check storageStateDir
    if (typeof obj.storageStateDir !== 'string')
        return false;
    // Check environments
    if (typeof obj.environments !== 'object' || obj.environments === null) {
        return false;
    }
    const envs = obj.environments;
    for (const [, env] of Object.entries(envs)) {
        if (typeof env !== 'object' || env === null)
            return false;
        const envObj = env;
        if (typeof envObj.loginUrl !== 'string')
            return false;
        if (envObj.logoutUrl !== undefined &&
            typeof envObj.logoutUrl !== 'string') {
            return false;
        }
    }
    // Check roles
    if (typeof obj.roles !== 'object' || obj.roles === null)
        return false;
    const roles = obj.roles;
    for (const [, role] of Object.entries(roles)) {
        if (!isArtkRole(role))
            return false;
    }
    return true;
}
/**
 * Default storage state directory.
 */
exports.DEFAULT_STORAGE_STATE_DIR = '.auth-states';
//# sourceMappingURL=auth.js.map