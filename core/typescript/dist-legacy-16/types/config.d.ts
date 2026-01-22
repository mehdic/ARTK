/**
 * @module types/config
 * @description Configuration type definitions for ARTK E2E independent architecture.
 * Defines the main configuration file schema (artk.config.yml).
 */
import type { ArtkTargetType } from './target.js';
import type { ArtkAuthConfig } from './auth.js';
/**
 * Config schema version.
 * Update this when making breaking changes to the config schema.
 */
export declare const CONFIG_SCHEMA_VERSION: "2.0";
/**
 * Supported browser types.
 */
export type ArtkBrowserType = 'chromium' | 'firefox' | 'webkit';
/**
 * Environment-specific URLs for a target.
 */
export interface ArtkEnvironmentUrls {
    /**
     * Base URL for the environment.
     * @format uri
     */
    baseUrl: string;
    /**
     * Optional API URL if different from baseUrl.
     * @format uri
     */
    apiUrl?: string;
}
/**
 * Extended target configuration with per-environment URLs.
 * Used in artk.config.yml.
 */
export interface ArtkConfigTarget {
    /**
     * Unique identifier for the target.
     * Must be lowercase-kebab-case.
     * @pattern ^[a-z][a-z0-9-]*$
     */
    name: string;
    /**
     * Relative path to frontend directory from artk-e2e/.
     */
    path: string;
    /**
     * Application type.
     */
    type: ArtkTargetType;
    /**
     * Optional human-readable description.
     */
    description?: string;
    /**
     * Environment-specific URLs.
     * Keys are environment names (e.g., 'local', 'staging', 'production').
     */
    environments: Record<string, ArtkEnvironmentUrls>;
}
/**
 * Browser configuration settings.
 */
export interface ArtkBrowserConfig {
    /**
     * Enabled browser types.
     * @default ['chromium']
     */
    enabled: ArtkBrowserType[];
    /**
     * Whether to run in headless mode.
     * @default true
     */
    headless: boolean;
}
/**
 * Timeout configuration in milliseconds.
 */
export interface ArtkTimeoutConfig {
    /**
     * Default timeout for operations.
     * @default 30000
     * @minimum 1000
     */
    default: number;
    /**
     * Navigation timeout.
     * @default 60000
     * @minimum 1000
     */
    navigation: number;
    /**
     * Authentication timeout.
     * @default 120000
     * @minimum 1000
     */
    auth: number;
}
/**
 * Main configuration file for ARTK E2E suite (artk.config.yml).
 *
 * @example
 * ```yaml
 * schemaVersion: "2.0"
 *
 * project:
 *   name: my-project
 *   description: E2E tests for my project
 *
 * targets:
 *   - name: user-portal
 *     path: ../iss-frontend
 *     type: react-spa
 *     environments:
 *       local:
 *         baseUrl: http://localhost:3000
 *       staging:
 *         baseUrl: https://staging.example.com
 *
 * defaults:
 *   target: user-portal
 *   environment: local
 * ```
 */
export interface ArtkConfig {
    /**
     * Schema version for backward compatibility.
     * Always '2.0' for this version.
     */
    schemaVersion: typeof CONFIG_SCHEMA_VERSION;
    /**
     * Project metadata.
     */
    project: {
        /**
         * Project name.
         */
        name: string;
        /**
         * Optional project description.
         */
        description?: string;
    };
    /**
     * Frontend targets with environment URLs.
     * Must have 1-5 elements.
     */
    targets: ArtkConfigTarget[];
    /**
     * Default settings.
     */
    defaults: {
        /**
         * Default target name.
         * Must match a targets[].name.
         */
        target: string;
        /**
         * Default environment name.
         * Must exist in all targets' environments.
         */
        environment: string;
    };
    /**
     * Optional authentication configuration.
     */
    auth?: ArtkAuthConfig;
    /**
     * Optional browser configuration.
     */
    browsers?: ArtkBrowserConfig;
    /**
     * Optional timeout configuration.
     */
    timeouts?: ArtkTimeoutConfig;
}
/**
 * Type guard to check if a value is a valid ArtkConfig.
 */
export declare function isArtkConfig(value: unknown): value is ArtkConfig;
/**
 * Default browser configuration.
 */
export declare const DEFAULT_BROWSER_CONFIG: ArtkBrowserConfig;
/**
 * Default timeout configuration.
 */
export declare const DEFAULT_TIMEOUT_CONFIG: ArtkTimeoutConfig;
//# sourceMappingURL=config.d.ts.map