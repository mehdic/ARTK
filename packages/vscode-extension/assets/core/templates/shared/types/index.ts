/**
 * Shared Types Template: Environment-Agnostic Type Definitions
 * These types work in both CommonJS and ESM
 */

/**
 * Module system type
 */
export type ModuleSystem = 'commonjs' | 'esm' | 'unknown';

/**
 * Template variant type
 */
export type TemplateVariant = 'commonjs' | 'esm';

/**
 * Foundation module type
 */
export interface FoundationModule {
  name: string;
  path: string;
  variant: TemplateVariant;
}

/**
 * Template resolution result
 */
export interface TemplateResolutionResult {
  templatePath: string;
  source: 'bundled' | 'local-override';
  variant: TemplateVariant;
}

/**
 * Auth configuration (shared between CommonJS and ESM)
 */
export interface AuthConfig {
  method: 'basic' | 'oauth' | 'oidc';
  loginURL: string;
  credentials: {
    username: string;
    password: string;
  };
  storageStatePath?: string;
}
