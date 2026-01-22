/**
 * Environment Context Types
 *
 * Represents the detected project environment configuration for ARTK foundation generation.
 * Matches the JSON schema at specs/001-foundation-compatibility/contracts/environment-context.schema.json
 *
 * @module @artk/core/types
 */
/**
 * Module system type - either CommonJS or ESM
 */
export type ModuleSystem = 'commonjs' | 'esm';
/**
 * Template source - where templates came from
 */
export type TemplateSource = 'bundled' | 'local-override';
/**
 * Detection confidence level based on signal consistency
 */
export type DetectionConfidence = 'high' | 'medium' | 'low';
/**
 * Detection method that determined module system
 */
export type DetectionMethod = 'package.json' | 'tsconfig.json' | 'fallback';
/**
 * Parsed Node.js version components
 */
export interface NodeVersionParsed {
    /** Major version number (must be >= 18) */
    major: number;
    /** Minor version number */
    minor: number;
    /** Patch version number */
    patch: number;
}
/**
 * Environment Context - Detected project environment configuration
 *
 * Storage: `.artk/context.json`
 * Lifecycle: Created during first bootstrap run, updated when `--force-detect` flag is used
 *
 * @example
 * ```json
 * {
 *   "moduleSystem": "commonjs",
 *   "nodeVersion": "18.12.1",
 *   "nodeVersionParsed": { "major": 18, "minor": 12, "patch": 1 },
 *   "tsModule": "commonjs",
 *   "supportsImportMeta": false,
 *   "supportsBuiltinDirname": false,
 *   "templateVariant": "commonjs",
 *   "templateSource": "bundled",
 *   "detectionTimestamp": "2026-01-13T15:30:00.000Z",
 *   "detectionConfidence": "high",
 *   "detectionMethod": "package.json",
 *   "warnings": []
 * }
 * ```
 */
export interface EnvironmentContext {
    /**
     * Detected module system from package.json or tsconfig.json
     */
    moduleSystem: ModuleSystem;
    /**
     * Semantic version of Node.js (e.g., "18.12.1")
     */
    nodeVersion: string;
    /**
     * Parsed Node.js version components
     */
    nodeVersionParsed: NodeVersionParsed;
    /**
     * TypeScript module setting from tsconfig.json, or null if not present
     */
    tsModule: string | null;
    /**
     * true if Node 18+ and ESM environment (can use import.meta.url)
     */
    supportsImportMeta: boolean;
    /**
     * true if Node 20.11.0+ (has import.meta.dirname built-in)
     */
    supportsBuiltinDirname: boolean;
    /**
     * Which template set was used for generation
     */
    templateVariant: ModuleSystem;
    /**
     * Where templates came from (bundled with @artk/core or local override)
     */
    templateSource: TemplateSource;
    /**
     * ISO 8601 timestamp when detection ran
     */
    detectionTimestamp: string;
    /**
     * Confidence level based on signal consistency
     * - 'high': package.json and tsconfig.json agree, or only one present
     * - 'medium': package.json and tsconfig.json conflict, but clear precedence rule applied
     * - 'low': fallback used, or detection timeout occurred
     */
    detectionConfidence: DetectionConfidence;
    /**
     * Primary method that determined module system
     */
    detectionMethod: DetectionMethod;
    /**
     * List of warnings encountered during detection
     */
    warnings: string[];
}
/**
 * Options for environment detection
 */
export interface DetectionOptions {
    /**
     * Project root directory to detect environment for
     */
    projectRoot: string;
    /**
     * Force re-detection even if cached results exist
     * @default false
     */
    forceDetect?: boolean;
    /**
     * Timeout in milliseconds for detection
     * @default 5000
     */
    timeout?: number;
}
/**
 * Result of environment detection
 */
export interface DetectionResult {
    /**
     * The detected environment context
     */
    context: EnvironmentContext;
    /**
     * Whether results were loaded from cache
     */
    fromCache: boolean;
    /**
     * Time taken for detection in milliseconds
     */
    detectionTime: number;
}
//# sourceMappingURL=environment-context.d.ts.map