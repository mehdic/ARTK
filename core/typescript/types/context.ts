/**
 * @module types/context
 * @description Context type definitions for ARTK E2E independent architecture.
 * Defines the persistent state for inter-prompt communication.
 */

import type { ArtkTarget } from './target.js';

/**
 * Context schema version.
 * Update this when making breaking changes to the context schema.
 */
export const CONTEXT_SCHEMA_VERSION = '1.0' as const;

/**
 * Persistent state for inter-prompt communication in ARTK E2E suites.
 * Stored in artk-e2e/.artk/context.json and committed to version control.
 *
 * @example
 * ```typescript
 * const context: ArtkContext = {
 *   version: '1.0',
 *   initialized_at: '2024-01-15T10:30:00Z',
 *   project: {
 *     name: 'my-monorepo',
 *     root: '..'
 *   },
 *   targets: [
 *     {
 *       name: 'user-portal',
 *       path: '../iss-frontend',
 *       type: 'react-spa',
 *       detected_by: ['package.json:react']
 *     }
 *   ],
 *   install: {
 *     artk_core_version: '1.0.0',
 *     playwright_version: '1.40.0',
 *     script_path: '/path/to/install-to-project.sh'
 *   }
 * };
 * ```
 */
export interface ArtkContext {
  /**
   * Schema version for migration support.
   * Always '1.0' for this version.
   */
  version: typeof CONTEXT_SCHEMA_VERSION;

  /**
   * ISO8601 timestamp when this context was created.
   */
  initialized_at: string;

  /**
   * Project metadata.
   */
  project: {
    /**
     * Human-readable project name.
     */
    name: string;

    /**
     * Relative path to project root from artk-e2e/.
     * Typically '..' for standard setup.
     */
    root: string;
  };

  /**
   * Configured frontend targets.
   * Must have 1-5 elements.
   */
  targets: ArtkTarget[];

  /**
   * Installation metadata.
   */
  install: {
    /**
     * Semantic version of @artk/core.
     * @pattern ^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$
     */
    artk_core_version: string;

    /**
     * Semantic version of @playwright/test.
     * @pattern ^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$
     */
    playwright_version: string;

    /**
     * Path to the install script used.
     */
    script_path: string;
  };
}

/**
 * Type guard to check if a value is a valid ArtkContext.
 */
export function isArtkContext(value: unknown): value is ArtkContext {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;

  // Check version
  if (obj.version !== CONTEXT_SCHEMA_VERSION) return false;

  // Check initialized_at
  if (typeof obj.initialized_at !== 'string') return false;

  // Check project
  if (typeof obj.project !== 'object' || obj.project === null) return false;
  const project = obj.project as Record<string, unknown>;
  if (typeof project.name !== 'string') return false;
  if (typeof project.root !== 'string') return false;

  // Check targets (basic check, detailed validation elsewhere)
  if (!Array.isArray(obj.targets)) return false;
  if (obj.targets.length < 1 || obj.targets.length > 5) return false;

  // Check install
  if (typeof obj.install !== 'object' || obj.install === null) return false;
  const install = obj.install as Record<string, unknown>;
  if (typeof install.artk_core_version !== 'string') return false;
  if (typeof install.playwright_version !== 'string') return false;
  if (typeof install.script_path !== 'string') return false;

  return true;
}

/**
 * Maximum number of targets allowed.
 */
export const MAX_TARGETS = 5;

/**
 * Minimum number of targets required.
 */
export const MIN_TARGETS = 1;
