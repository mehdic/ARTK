/**
 * Auth Setup Factory
 *
 * Creates Playwright auth setup project configurations for each role.
 * These projects run before browser tests to establish authenticated sessions.
 *
 * FR-007: Persist authentication state to files and reuse valid state across test runs
 * FR-009: Support multiple named roles with separate credentials and storage states
 *
 * @module auth/setup-factory
 */
import type { AuthSetupOptions, AuthSetupProject } from './types.js';
import type { ARTKConfig, AuthConfig, RoleConfig } from '../config/types.js';
/**
 * Create Playwright auth setup project configuration for a role
 *
 * Creates a project configuration that:
 * 1. Runs before browser tests
 * 2. Checks for valid existing storage state
 * 3. Authenticates and saves storage state if needed
 *
 * @param role - Role name (e.g., 'admin', 'standardUser')
 * @param authConfig - Authentication configuration
 * @param options - Optional setup configuration
 * @returns Playwright project configuration with name, testMatch, and setup paths
 */
export declare function createAuthSetup(role: string, authConfig: AuthConfig, _options?: AuthSetupOptions): AuthSetupProject;
/**
 * Create auth setup projects for all configured roles
 *
 * FR-009: Support multiple named roles with separate credentials and storage states
 *
 * @param authConfig - Authentication configuration
 * @param options - Optional setup configuration
 * @returns Array of Playwright project configurations for all roles
 */
export declare function createAllAuthSetups(authConfig: AuthConfig, options?: AuthSetupOptions): AuthSetupProject[];
/**
 * Create auth setup code for a role
 *
 * Generates the TypeScript code for an auth setup file that can be
 * imported into Playwright's globalSetup.
 *
 * @param role - Role name
 * @param authConfig - Authentication configuration
 * @returns TypeScript code as string
 */
export declare function generateAuthSetupCode(role: string, authConfig: AuthConfig): string;
/**
 * Generate Playwright project configurations for auth setup
 *
 * Creates the full project configuration array needed for playwright.config.ts
 * including dependencies between auth setups and browser tests.
 *
 * Use these projects in playwright.config.ts by spreading them into the projects
 * array and setting browser test projects to depend on them.
 *
 * @param config - Full ARTK configuration
 * @returns Array of Playwright project configurations with name, testMatch, and metadata
 */
export declare function generateAuthProjects(config: ARTKConfig): PlaywrightAuthProject[];
/**
 * Playwright project configuration for auth
 */
export interface PlaywrightAuthProject {
    name: string;
    testMatch: RegExp;
    metadata: {
        role: string;
        storageStatePath: string;
    };
}
/**
 * Create an auth provider from configuration
 *
 * Factory function that creates the appropriate AuthProvider based on
 * the configuration's provider type.
 *
 * @param authConfig - Authentication configuration
 * @param role - Role name for provider setup
 * @returns AuthProvider instance
 */
export declare function createAuthProviderFromConfig(authConfig: AuthConfig, role: string): AuthProviderLike;
/**
 * Auth provider-like object for lazy instantiation
 */
export interface AuthProviderLike {
    type: 'oidc' | 'form' | 'token' | 'custom';
    role: string;
    config?: unknown;
    roleOverrides?: unknown;
}
/**
 * Get all configured role names
 */
export declare function getRoleNames(authConfig: AuthConfig): string[];
/**
 * Get storage state directory path
 */
export declare function getStorageStateDirectory(authConfig: AuthConfig, projectRoot?: string): string;
/**
 * Check if a role is configured
 */
export declare function hasRole(role: string, authConfig: AuthConfig): boolean;
/**
 * Get role configuration
 */
export declare function getRoleConfig(role: string, authConfig: AuthConfig): RoleConfig | undefined;
//# sourceMappingURL=setup-factory.d.ts.map