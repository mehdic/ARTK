/**
 * LLKB Migration Module
 *
 * This module provides utilities for migrating LLKB data between versions,
 * upgrading schemas, and handling backward compatibility.
 *
 * @module llkb/migration
 */
import type { SaveResult } from './types.js';
/**
 * Migration result
 */
export interface MigrationResult {
    /** Whether migration succeeded */
    success: boolean;
    /** Files that were migrated */
    migratedFiles: string[];
    /** Errors encountered */
    errors: string[];
    /** Warnings */
    warnings: string[];
    /** Version before migration */
    fromVersion: string;
    /** Version after migration */
    toVersion: string;
}
/**
 * Schema version info
 */
export interface VersionInfo {
    /** Major version */
    major: number;
    /** Minor version */
    minor: number;
    /** Patch version */
    patch: number;
    /** Full version string */
    full: string;
}
/** Current schema version */
export declare const CURRENT_VERSION = "1.0.0";
/** Minimum supported version */
export declare const MIN_SUPPORTED_VERSION = "0.1.0";
/**
 * Parse a version string into components
 */
export declare function parseVersion(version: string): VersionInfo;
/**
 * Compare two versions
 * @returns -1 if a < b, 0 if equal, 1 if a > b
 */
export declare function compareVersions(a: string, b: string): number;
/**
 * Check if a version is supported
 */
export declare function isVersionSupported(version: string): boolean;
/**
 * Check if migration is needed
 */
export declare function needsMigration(version: string): boolean;
/**
 * Migrate all LLKB files to the current version
 *
 * @param llkbRoot - Root directory of LLKB
 * @returns Migration result
 *
 * @example
 * ```typescript
 * const result = await migrateLLKB('.artk/llkb');
 * if (result.success) {
 *   console.log(`Migrated ${result.migratedFiles.length} files`);
 * }
 * ```
 */
export declare function migrateLLKB(llkbRoot: string): Promise<MigrationResult>;
/**
 * Check if LLKB needs migration
 *
 * @param llkbRoot - Root directory of LLKB
 * @returns Version check result
 */
export declare function checkMigrationNeeded(llkbRoot: string): {
    needsMigration: boolean;
    currentVersion: string;
    targetVersion: string;
    supported: boolean;
};
/**
 * Initialize LLKB directory structure with default files
 *
 * @param llkbRoot - Root directory for LLKB
 * @returns Save result
 *
 * @example
 * ```typescript
 * const result = await initializeLLKB('.artk/llkb');
 * ```
 */
export declare function initializeLLKB(llkbRoot: string): Promise<SaveResult>;
/**
 * Validate LLKB installation
 *
 * @param llkbRoot - Root directory of LLKB
 * @returns Validation result
 */
export declare function validateLLKBInstallation(llkbRoot: string): {
    valid: boolean;
    missingFiles: string[];
    invalidFiles: string[];
    version: string;
};
//# sourceMappingURL=migration.d.ts.map