/**
 * @module types/target
 * @description Target type definitions for ARTK E2E independent architecture.
 * Represents a frontend application to test in a monorepo.
 */
/**
 * Allowed application types for ARTK targets.
 */
type ArtkTargetType = 'react-spa' | 'vue-spa' | 'angular' | 'next' | 'nuxt' | 'other';
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
interface ArtkTarget {
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
declare function isArtkTarget(value: unknown): value is ArtkTarget;
/**
 * Validates that a target name follows the lowercase-kebab-case pattern.
 */
declare function isValidTargetName(name: string): boolean;
/**
 * Validates that a path is relative (not absolute, no ..).
 */
declare function isValidRelativePath(path: string): boolean;

export { type ArtkTarget as A, type ArtkTargetType as a, isValidTargetName as b, isValidRelativePath as c, isArtkTarget as i };
