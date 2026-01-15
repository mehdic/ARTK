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
 * Minimum supported Node.js version
 */
const MIN_NODE_VERSION = 18;

/**
 * Node version for full ESM support
 */
const FULL_ESM_VERSION = 20;

/**
 * Node version for import.meta.dirname support
 */
const BUILTIN_DIRNAME_VERSION = { major: 20, minor: 11, patch: 0 };

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
export function parseNodeVersion(version: string): ParsedNodeVersion {
  if (!version) {
    throw new Error('Node version string is required');
  }

  // Remove 'v' prefix if present
  const cleanVersion = version.replace(/^v/, '');

  // Match semver pattern (allow pre-release suffix)
  const match = cleanVersion.match(/^(\d+)\.(\d+)\.(\d+)/);

  if (!match) {
    throw new Error(`Invalid Node.js version format: "${version}". Expected semver format (e.g., "18.12.1")`);
  }

  const [, majorStr, minorStr, patchStr] = match;

  return {
    major: parseInt(majorStr!, 10),
    minor: parseInt(minorStr!, 10),
    patch: parseInt(patchStr!, 10),
    raw: cleanVersion.split('-')[0]!, // Remove pre-release suffix for raw
  };
}

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
export function getNodeVersion(): ParsedNodeVersion {
  return parseNodeVersion(process.version);
}

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
export function validateNodeVersion(version: ParsedNodeVersion): void {
  if (version.major < MIN_NODE_VERSION) {
    throw new Error(
      `Node.js version must be >= ${MIN_NODE_VERSION}.0.0. ` +
      `Current version: ${version.raw}. ` +
      `Please upgrade Node.js to use ARTK.`
    );
  }
}

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
export function determineESMCompatibility(version: ParsedNodeVersion): ESMCompatibility {
  const supportsESM = version.major >= MIN_NODE_VERSION;
  const supportsFullESM = version.major >= FULL_ESM_VERSION;

  // import.meta.dirname requires Node 20.11.0+
  const supportsBuiltinDirname =
    version.major > BUILTIN_DIRNAME_VERSION.major ||
    (version.major === BUILTIN_DIRNAME_VERSION.major &&
      version.minor >= BUILTIN_DIRNAME_VERSION.minor);

  return {
    supportsESM,
    supportsFullESM,
    supportsImportMeta: supportsESM, // Available in Node 18+ for ESM
    supportsBuiltinDirname,
  };
}

/**
 * Checks if version A is greater than or equal to version B
 *
 * @internal
 */
export function isVersionGte(
  a: { major: number; minor: number; patch: number },
  b: { major: number; minor: number; patch: number }
): boolean {
  if (a.major !== b.major) return a.major > b.major;
  if (a.minor !== b.minor) return a.minor > b.minor;
  return a.patch >= b.patch;
}
