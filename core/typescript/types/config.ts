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
export const CONFIG_SCHEMA_VERSION = '2.0' as const;

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
export function isArtkConfig(value: unknown): value is ArtkConfig {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;

  // Check schemaVersion
  if (obj.schemaVersion !== CONFIG_SCHEMA_VERSION) return false;

  // Check project
  if (typeof obj.project !== 'object' || obj.project === null) return false;
  const project = obj.project as Record<string, unknown>;
  if (typeof project.name !== 'string') return false;

  // Check targets
  if (!Array.isArray(obj.targets)) return false;
  if (obj.targets.length < 1 || obj.targets.length > 5) return false;

  // Check defaults
  if (typeof obj.defaults !== 'object' || obj.defaults === null) return false;
  const defaults = obj.defaults as Record<string, unknown>;
  if (typeof defaults.target !== 'string') return false;
  if (typeof defaults.environment !== 'string') return false;

  return true;
}

/**
 * Default browser configuration.
 */
export const DEFAULT_BROWSER_CONFIG: ArtkBrowserConfig = {
  enabled: ['chromium'],
  headless: true,
};

/**
 * Default timeout configuration.
 */
export const DEFAULT_TIMEOUT_CONFIG: ArtkTimeoutConfig = {
  default: 30000,
  navigation: 60000,
  auth: 120000,
};
