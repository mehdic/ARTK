/**
 * Node.js Version Detection
 *
 * Detects and validates Node.js version for ESM compatibility determination.
 *
 * @module @artk/core/detection/env/node-version
 */
import type { NodeVersionParsed } from '../../types/environment-context.js';
/**
 * Parsed Node version with raw string
 */
export interface ParsedNodeVersion extends NodeVersionParsed {
    /**
     * Raw version string (e.g., "18.12.1")
     */
    raw: string;
}
/**
 * ESM compatibility flags
 */
export interface ESMCompatibility {
    /**
     * Basic ESM support (Node 18+)
     */
    supportsESM: boolean;
    /**
     * Full ESM support including all features (Node 20+)
     */
    supportsFullESM: boolean;
    /**
     * Supports import.meta.url (Node 18+ in ESM mode)
     */
    supportsImportMeta: boolean;
    /**
     * Supports import.meta.dirname (Node 20.11.0+)
     */
    supportsBuiltinDirname: boolean;
}
/**
 * Parses a Node.js version string into components
 *
 * @param version - Version string (e.g., "v18.12.1" or "18.12.1")
 * @returns Parsed version components
 * @throws Error if version format is invalid
 *
 * @example
 * ```typescript
 * parseNodeVersion('v18.12.1');
 * // { major: 18, minor: 12, patch: 1 }
 * ```
 */
export declare function parseNodeVersion(version: string): ParsedNodeVersion;
/**
 * Gets the current Node.js version
 *
 * @returns Parsed version of the running Node.js process
 *
 * @example
 * ```typescript
 * const version = getNodeVersion();
 * console.log(`Running Node ${version.major}.${version.minor}.${version.patch}`);
 * ```
 */
export declare function getNodeVersion(): ParsedNodeVersion;
/**
 * Validates that Node.js version meets minimum requirements (FR-009)
 *
 * @param version - Parsed Node version
 * @throws Error if Node version is below minimum supported
 *
 * @example
 * ```typescript
 * validateNodeVersion({ major: 18, minor: 0, patch: 0, raw: '18.0.0' });
 * // No error
 *
 * validateNodeVersion({ major: 16, minor: 20, patch: 0, raw: '16.20.0' });
 * // Throws: Node.js version must be >= 18.0.0
 * ```
 */
export declare function validateNodeVersion(version: ParsedNodeVersion): void;
/**
 * Determines ESM compatibility based on Node version (FR-004)
 *
 * @param version - Parsed Node version
 * @returns ESM compatibility flags
 *
 * @example
 * ```typescript
 * determineESMCompatibility({ major: 18, minor: 12, patch: 1, raw: '18.12.1' });
 * // { supportsESM: true, supportsFullESM: false, supportsImportMeta: true, supportsBuiltinDirname: false }
 *
 * determineESMCompatibility({ major: 20, minor: 11, patch: 0, raw: '20.11.0' });
 * // { supportsESM: true, supportsFullESM: true, supportsImportMeta: true, supportsBuiltinDirname: true }
 * ```
 */
export declare function determineESMCompatibility(version: ParsedNodeVersion): ESMCompatibility;
/**
 * Checks if version A is greater than or equal to version B
 *
 * @internal
 */
export declare function isVersionGte(a: {
    major: number;
    minor: number;
    patch: number;
}, b: {
    major: number;
    minor: number;
    patch: number;
}): boolean;
//# sourceMappingURL=node-version.d.ts.map