/**
 * @module types/target
 * @description Target type definitions for ARTK E2E independent architecture.
 * Represents a frontend application to test in a monorepo.
 */

/**
 * Allowed application types for ARTK targets.
 */
export type ArtkTargetType =
  | 'react-spa'
  | 'vue-spa'
  | 'angular'
  | 'next'
  | 'nuxt'
  | 'other';

/**
 * Represents a frontend target in the ARTK context.
 * Stored in .artk/context.json and used for inter-prompt communication.
 *
 * @example
 * ```typescript
 * const target: ArtkTarget = {
 *   name: 'user-portal',
 *   path: '../iss-frontend',
 *   type: 'react-spa',
 *   detected_by: ['package.json:react', 'file:src/App.tsx'],
 *   description: 'Main user-facing portal'
 * };
 * ```
 */
export interface ArtkTarget {
  /**
   * Unique identifier for the target.
   * Must be lowercase-kebab-case, e.g., 'user-portal', 'admin-dashboard'.
   * @pattern ^[a-z][a-z0-9-]*$
   */
  name: string;

  /**
   * Relative path to frontend directory from artk-e2e/.
   * Must not start with '/' or contain '..' escaping project root.
   * @example '../iss-frontend', '../apps/web'
   */
  path: string;

  /**
   * Detected or specified application type.
   */
  type: ArtkTargetType;

  /**
   * Signals that identified this target during detection.
   * @example ['package.json:react', 'dirname:frontend', 'file:src/App.tsx']
   */
  detected_by: string[];

  /**
   * Optional human-readable description.
   */
  description?: string;
}

/**
 * Type guard to check if a value is a valid ArtkTarget.
 */
export function isArtkTarget(value: unknown): value is ArtkTarget {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;

  return (
    typeof obj.name === 'string' &&
    typeof obj.path === 'string' &&
    typeof obj.type === 'string' &&
    ['react-spa', 'vue-spa', 'angular', 'next', 'nuxt', 'other'].includes(
      obj.type
    ) &&
    Array.isArray(obj.detected_by) &&
    obj.detected_by.every((s) => typeof s === 'string')
  );
}

/**
 * Validates that a target name follows the lowercase-kebab-case pattern.
 */
export function isValidTargetName(name: string): boolean {
  return /^[a-z][a-z0-9-]*$/.test(name);
}

/**
 * Validates that a path is relative (not absolute, no ..).
 */
export function isValidRelativePath(path: string): boolean {
  // Must not start with / and must not contain ../ escaping
  return !path.startsWith('/') && !/(^|\/)\.\.(\/|$)/.test(path);
}
