/**
 * ARTK Multi-Variant Type Definitions
 *
 * Core types for the variant system supporting Node.js 14-22 and ESM/CommonJS.
 */
/**
 * Valid variant identifiers.
 * - modern-esm: Node 18+ with ESM module system
 * - modern-cjs: Node 18+ with CommonJS module system
 * - legacy-16: Node 16-17 with CommonJS (Playwright 1.49.x)
 * - legacy-14: Node 14-15 with CommonJS (Playwright 1.33.x)
 */
export type VariantId = 'modern-esm' | 'modern-cjs' | 'legacy-16' | 'legacy-14';
/**
 * Module system types.
 */
export type ModuleSystem = 'esm' | 'cjs';
/**
 * Installation method types.
 */
export type InstallMethod = 'cli' | 'bootstrap' | 'manual';
/**
 * Log levels for install operations.
 */
export type LogLevel = 'INFO' | 'WARN' | 'ERROR';
/**
 * Operation types for logging.
 */
export type OperationType = 'install' | 'upgrade' | 'rollback' | 'detect';
/**
 * Lock file operation types.
 */
export type LockOperation = 'install' | 'upgrade';
/**
 * Variant definition containing all metadata for a variant.
 */
export interface Variant {
    /** Unique variant identifier */
    id: VariantId;
    /** Human-readable display name */
    displayName: string;
    /** Supported Node.js major versions */
    nodeRange: string[];
    /** Playwright version pattern (e.g., "1.57.x") */
    playwrightVersion: string;
    /** Module system used by this variant */
    moduleSystem: ModuleSystem;
    /** TypeScript target (e.g., "ES2022") */
    tsTarget: string;
    /** Output directory name */
    distDirectory: string;
}
/**
 * Installation context stored in .artk/context.json.
 */
export interface ArtkContext {
    /** Installed variant identifier */
    variant: VariantId;
    /** ISO8601 timestamp of variant installation */
    variantInstalledAt: string;
    /** Node.js major version at install time */
    nodeVersion: number;
    /** Detected module system of the target project */
    moduleSystem: ModuleSystem;
    /** Playwright version in installed variant */
    playwrightVersion: string;
    /** ARTK version installed */
    artkVersion: string;
    /** How ARTK was installed */
    installMethod: InstallMethod;
    /** True if --variant override was used */
    overrideUsed?: boolean;
    /** Previous variant if this is an upgrade */
    previousVariant?: VariantId;
    /** History of variant upgrades */
    upgradeHistory?: UpgradeRecord[];
}
/**
 * Record of a variant upgrade.
 */
export interface UpgradeRecord {
    /** Previous variant */
    from: VariantId;
    /** New variant */
    to: VariantId;
    /** ISO8601 timestamp of upgrade */
    at: string;
}
/**
 * Install log entry stored in .artk/install.log.
 */
export interface InstallLogEntry {
    /** ISO8601 timestamp */
    timestamp: string;
    /** Log level */
    level: LogLevel;
    /** Operation type */
    operation: OperationType;
    /** Log message */
    message: string;
    /** Additional structured data */
    details?: Record<string, unknown>;
}
/**
 * Lock file content for preventing concurrent installations.
 */
export interface LockFile {
    /** Process ID holding the lock */
    pid: number;
    /** ISO8601 timestamp when lock was acquired */
    startedAt: string;
    /** Operation type */
    operation: LockOperation;
}
/**
 * Feature entry in variant-features.json.
 */
export interface FeatureEntry {
    /** Whether this feature is available in this variant */
    available: boolean;
    /** Suggested alternative approach if feature is unavailable */
    alternative?: string;
    /** Additional context or caveats */
    notes?: string;
    /** Playwright version when this feature was introduced */
    sincePlaywright?: string;
}
/**
 * Feature compatibility document for a variant.
 */
export interface FeatureCompatibility {
    /** Variant identifier */
    variant: VariantId;
    /** Playwright version */
    playwrightVersion: string;
    /** Supported Node.js major versions */
    nodeRange: string[];
    /** Module system */
    moduleSystem?: ModuleSystem;
    /** Map of feature name to availability info */
    features: Record<string, FeatureEntry>;
    /** ISO8601 timestamp when this file was generated */
    generatedAt?: string;
}
/**
 * Environment detection result.
 */
export interface DetectionResult {
    /** Detected Node.js major version */
    nodeVersion: number;
    /** Full Node.js version string */
    nodeVersionFull: string;
    /** Detected module system */
    moduleSystem: ModuleSystem;
    /** Selected variant based on detection */
    selectedVariant: VariantId;
    /** Whether detection was successful */
    success: boolean;
    /** Error message if detection failed */
    error?: string;
}
/**
 * Variant selection options.
 */
export interface VariantSelectionOptions {
    /** Override variant (from --variant flag) */
    overrideVariant?: VariantId;
    /** Target project path */
    targetPath: string;
    /** Force re-detection even if context exists */
    forceDetect?: boolean;
}
/**
 * Installation options.
 */
export interface InstallOptions {
    /** Target project path */
    targetPath: string;
    /** Variant to install (auto-detected if not specified) */
    variant?: VariantId;
    /** Skip npm install */
    skipNpm?: boolean;
    /** Skip browser installation */
    skipBrowsers?: boolean;
    /** Force overwrite existing installation */
    force?: boolean;
    /** Install method */
    installMethod: InstallMethod;
}
/**
 * Type guard to check if a string is a valid VariantId.
 */
export declare function isVariantId(value: string): value is VariantId;
/**
 * Type guard to check if a string is a valid ModuleSystem.
 */
export declare function isModuleSystem(value: string): value is ModuleSystem;
//# sourceMappingURL=variant-types.d.ts.map