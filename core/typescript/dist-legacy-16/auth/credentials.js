"use strict";
/**
 * Credential management for ARTK Auth
 *
 * Provides secure credential loading from environment variables.
 *
 * FR-011: System MUST read credentials from environment variables (never hardcoded)
 *
 * @module auth/credentials
 * @example
 * ```typescript
 * import { getCredentials } from './credentials.js';
 *
 * // Given config: roles.admin.credentialsEnv = { username: 'ADMIN_USER', password: 'ADMIN_PASS' }
 * const creds = getCredentials('admin', config);
 * // Returns: { username: process.env.ADMIN_USER, password: process.env.ADMIN_PASS }
 * ```
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCredentials = getCredentials;
exports.getCredentialsFromRoleConfig = getCredentialsFromRoleConfig;
exports.validateCredentials = validateCredentials;
exports.formatMissingCredentialsError = formatMissingCredentialsError;
exports.hasCredentials = hasCredentials;
exports.validateCredentialsConfig = validateCredentialsConfig;
const auth_error_js_1 = require("../errors/auth-error.js");
const logger_js_1 = require("../utils/logger.js");
const logger = (0, logger_js_1.createLogger)('auth', 'credentials');
// =============================================================================
// Functions
// =============================================================================
/**
 * Get credentials for a role from environment variables
 *
 * Reads the environment variable names from the role configuration
 * and returns the actual credential values from the environment.
 *
 * @param role - Role name as defined in config (e.g., 'admin', 'standardUser')
 * @param authConfig - Authentication configuration containing role definitions
 * @param options - Optional configuration
 * @returns Credentials object with username and password
 * @throws ARTKAuthError if role is not found or env vars are not set
 *
 * @example
 * ```typescript
 * // Config defines:
 * // auth.roles.admin.credentialsEnv = { username: 'ADMIN_USER', password: 'ADMIN_PASS' }
 *
 * // Environment has:
 * // ADMIN_USER=admin@example.com
 * // ADMIN_PASS=secret123
 *
 * const creds = getCredentials('admin', authConfig);
 * // Returns: { username: 'admin@example.com', password: 'secret123' }
 * ```
 */
function getCredentials(role, authConfig, options = {}) {
    const env = options.env ?? process.env;
    const maskPassword = options.maskPassword ?? true;
    logger.debug('Getting credentials for role', { role });
    // Get role configuration
    const roleConfig = authConfig.roles[role];
    if (!roleConfig) {
        const availableRoles = Object.keys(authConfig.roles).join(', ');
        logger.error('Role not found in configuration', { role, availableRoles });
        throw new auth_error_js_1.ARTKAuthError(`Role "${role}" not found in auth configuration. Available roles: ${availableRoles}`, role, 'credentials', undefined, `Check that the role "${role}" is defined in auth.roles in your artk.config.yml`);
    }
    // Get environment variable names
    const { username: usernameEnvVar, password: passwordEnvVar } = roleConfig.credentialsEnv;
    // Read username from environment
    const username = env[usernameEnvVar];
    if (!username) {
        logger.error('Username environment variable not set', {
            role,
            envVar: usernameEnvVar,
        });
        throw new auth_error_js_1.ARTKAuthError(`Environment variable "${usernameEnvVar}" for role "${role}" username is not set`, role, 'credentials', undefined, `Set the ${usernameEnvVar} environment variable with the username for the "${role}" role`);
    }
    // Read password from environment
    const password = env[passwordEnvVar];
    if (!password) {
        logger.error('Password environment variable not set', {
            role,
            envVar: passwordEnvVar,
        });
        throw new auth_error_js_1.ARTKAuthError(`Environment variable "${passwordEnvVar}" for role "${role}" password is not set`, role, 'credentials', undefined, `Set the ${passwordEnvVar} environment variable with the password for the "${role}" role`);
    }
    logger.info('Credentials loaded successfully', {
        role,
        username,
        password: maskPassword ? '***' : password,
    });
    return { username, password };
}
/**
 * Get credentials for a role using role config directly
 *
 * Lower-level function that takes role config instead of full auth config.
 *
 * @param role - Role name for error messages
 * @param roleConfig - Role configuration with credentialsEnv
 * @param options - Optional configuration
 * @returns Credentials object
 * @throws ARTKAuthError if env vars are not set
 */
function getCredentialsFromRoleConfig(role, roleConfig, options = {}) {
    const env = options.env ?? process.env;
    const maskPassword = options.maskPassword ?? true;
    const { username: usernameEnvVar, password: passwordEnvVar } = roleConfig.credentialsEnv;
    const username = env[usernameEnvVar];
    if (!username) {
        throw new auth_error_js_1.ARTKAuthError(`Environment variable "${usernameEnvVar}" for role "${role}" username is not set`, role, 'credentials', undefined, `Set the ${usernameEnvVar} environment variable`);
    }
    const password = env[passwordEnvVar];
    if (!password) {
        throw new auth_error_js_1.ARTKAuthError(`Environment variable "${passwordEnvVar}" for role "${role}" password is not set`, role, 'credentials', undefined, `Set the ${passwordEnvVar} environment variable`);
    }
    logger.debug('Credentials loaded from role config', {
        role,
        username,
        password: maskPassword ? '***' : password,
    });
    return { username, password };
}
/**
 * Validate that all required credentials are available for a set of roles
 *
 * Checks all roles without throwing, returns list of missing credentials.
 *
 * @param roles - Array of role names to validate
 * @param authConfig - Authentication configuration
 * @param env - Environment variables (defaults to process.env)
 * @returns Array of missing credential info (empty if all valid)
 *
 * @example
 * ```typescript
 * const missing = validateCredentials(['admin', 'user'], authConfig);
 * if (missing.length > 0) {
 *   console.error('Missing credentials:', missing);
 * }
 * ```
 */
function validateCredentials(roles, authConfig, env = process.env) {
    const missing = [];
    for (const role of roles) {
        const roleConfig = authConfig.roles[role];
        if (!roleConfig) {
            missing.push({
                role,
                type: 'role',
                message: `Role "${role}" not found in configuration`,
            });
            continue;
        }
        const { username: usernameEnvVar, password: passwordEnvVar } = roleConfig.credentialsEnv;
        if (!env[usernameEnvVar]) {
            missing.push({
                role,
                type: 'username',
                envVar: usernameEnvVar,
                message: `Environment variable "${usernameEnvVar}" not set`,
            });
        }
        if (!env[passwordEnvVar]) {
            missing.push({
                role,
                type: 'password',
                envVar: passwordEnvVar,
                message: `Environment variable "${passwordEnvVar}" not set`,
            });
        }
    }
    return missing;
}
/**
 * Create a formatted error message for missing credentials
 *
 * @param missing - Array of missing credentials from validateCredentials
 * @returns Formatted error message
 */
function formatMissingCredentialsError(missing) {
    if (missing.length === 0) {
        return '';
    }
    const lines = ['Missing credentials:'];
    // Group by role
    const byRole = new Map();
    for (const m of missing) {
        const existing = byRole.get(m.role) ?? [];
        existing.push(m);
        byRole.set(m.role, existing);
    }
    for (const [role, items] of byRole) {
        lines.push(`  Role "${role}":`);
        for (const item of items) {
            if (item.type === 'role') {
                lines.push(`    - ${item.message}`);
            }
            else {
                lines.push(`    - ${item.type}: ${item.envVar} (${item.message})`);
            }
        }
    }
    lines.push('');
    lines.push('To fix, set the required environment variables:');
    const envVars = missing
        .filter((m) => m.envVar)
        .map((m) => m.envVar);
    const uniqueEnvVars = [...new Set(envVars)];
    for (const envVar of uniqueEnvVars) {
        lines.push(`  export ${envVar}="<value>"`);
    }
    return lines.join('\n');
}
/**
 * Check if credentials are available for a role (without throwing)
 *
 * @param role - Role name
 * @param authConfig - Auth configuration
 * @param env - Environment variables
 * @returns true if credentials are available
 */
function hasCredentials(role, authConfig, env = process.env) {
    const roleConfig = authConfig.roles[role];
    if (!roleConfig) {
        return false;
    }
    const { username: usernameEnvVar, password: passwordEnvVar } = roleConfig.credentialsEnv;
    return Boolean(env[usernameEnvVar]) && Boolean(env[passwordEnvVar]);
}
/**
 * Validate that credentials environment variables are set for all roles
 *
 * This function checks that all required environment variables for role credentials
 * are present at config load time, providing early failure with clear error messages.
 *
 * @param roles - Record of role configurations from auth config
 * @param env - Environment variables to check (defaults to process.env)
 * @throws ARTKAuthError if any required environment variables are missing
 *
 * @example
 * ```typescript
 * // Validate all roles from config
 * validateCredentialsConfig(config.auth.roles);
 *
 * // Skip validation (for dry-run scenarios)
 * // Don't call this function
 * ```
 */
function validateCredentialsConfig(roles, env = process.env) {
    const missingVars = [];
    for (const [roleName, roleConfig] of Object.entries(roles)) {
        const { username, password } = roleConfig.credentialsEnv;
        if (!env[username]) {
            missingVars.push(`${username} (for role '${roleName}')`);
        }
        if (!env[password]) {
            missingVars.push(`${password} (for role '${roleName}')`);
        }
    }
    if (missingVars.length > 0) {
        throw new auth_error_js_1.ARTKAuthError(`Missing required environment variables:\n` +
            missingVars.map(v => `  - ${v}`).join('\n') +
            `\n\nSet these variables before running tests.`, 'credentials', 'credentials', undefined, 'Export the missing environment variables or set them in your .env file');
    }
    logger.debug('All credential environment variables validated', {
        roleCount: Object.keys(roles).length,
    });
}
//# sourceMappingURL=credentials.js.map