import { a as ArtkTargetType } from './target-BGR8NLDg.js';

/**
 * @module types/detection
 * @description Detection type definitions for ARTK E2E independent architecture.
 * Defines types for frontend detection heuristics during /init.
 */

/**
 * Confidence levels for detection results.
 * Based on weighted scoring: ≥40=high, 20-39=medium, <20=low
 */
type ArtkConfidenceLevel = 'high' | 'medium' | 'low';
/**
 * Detection signal categories.
 */
type ArtkDetectionSignalCategory = 'package-dependency' | 'entry-file' | 'directory-name' | 'index-html' | 'config-file';
/**
 * A single detection signal with its weight and source.
 *
 * @example
 * ```typescript
 * const signal: DetectionSignal = {
 *   type: 'package-dependency',
 *   source: 'package-dependency:react',
 *   weight: 30,
 *   description: 'Found react in dependencies'
 * };
 * ```
 */
interface DetectionSignal {
    /**
     * Category of the signal.
     */
    type: ArtkDetectionSignalCategory;
    /**
     * Source identifier - the full signal string
     * (e.g., 'package-dependency:react', 'entry-file:src/App.tsx').
     */
    source: string;
    /**
     * Weight contribution to the overall score.
     */
    weight: number;
    /**
     * Human-readable description of what was detected.
     */
    description?: string;
}
/**
 * Result of frontend detection heuristics during /init.
 * Transient - not persisted, used only during detection.
 *
 * @example
 * ```typescript
 * const result: DetectionResult = {
 *   path: '/absolute/path/to/frontend',
 *   relativePath: '../frontend',
 *   confidence: 'high',
 *   type: 'react-spa',
 *   signals: ['package-dependency:react', 'entry-file:src/App.tsx'],
 *   score: 50,
 *   detailedSignals: [
 *     { type: 'package-dependency', source: 'package-dependency:react', weight: 30 },
 *     { type: 'entry-file', source: 'entry-file:src/App.tsx', weight: 20 }
 *   ]
 * };
 * ```
 */
interface DetectionResult$1 {
    /**
     * Absolute path to detected frontend.
     */
    path: string;
    /**
     * Relative path from artk-e2e/ to the frontend.
     */
    relativePath: string;
    /**
     * Detection confidence level.
     * Based on weighted scoring: ≥40=high, 20-39=medium, <20=low
     */
    confidence: ArtkConfidenceLevel;
    /**
     * Detected application type.
     */
    type: ArtkTargetType;
    /**
     * Detection signal identifiers that matched.
     * @example ['package-dependency:react', 'entry-file:src/App.tsx', 'directory-name:frontend']
     */
    signals: string[];
    /**
     * Combined score from weighted signals.
     */
    score: number;
    /**
     * Detailed signal information for debugging and analysis.
     */
    detailedSignals: DetectionSignal[];
}
/**
 * Type guard to check if a value is a valid DetectionResult.
 */
declare function isDetectionResult(value: unknown): value is DetectionResult$1;

/**
 * @module types/submodule
 * @description Submodule type definitions for ARTK E2E independent architecture.
 * Defines types for Git submodule state during /init.
 */
/**
 * Git submodule initialization states.
 */
type SubmoduleState = 'initialized' | 'uninitialized' | 'not-submodule';
/**
 * Git submodule state for warning users.
 * Transient - not persisted, used only during /init.
 *
 * @example
 * ```typescript
 * const status: SubmoduleStatus = {
 *   path: 'libs/shared-ui',
 *   initialized: true,
 *   commit: 'abc123def456...',
 *   url: 'https://github.com/org/shared-ui.git'
 * };
 * ```
 */
interface SubmoduleStatus {
    /**
     * Path to submodule (from .gitmodules).
     */
    path: string;
    /**
     * Whether the submodule is initialized.
     */
    initialized: boolean;
    /**
     * Commit SHA if initialized.
     */
    commit?: string;
    /**
     * Remote URL of the submodule (from .gitmodules).
     */
    url?: string;
    /**
     * Optional warning message if submodule affects testing.
     */
    warning?: string;
}
/**
 * Result of scanning all submodules in a project.
 *
 * @example
 * ```typescript
 * const result: SubmoduleScanResult = {
 *   hasSubmodules: true,
 *   submodules: [
 *     { path: 'libs/shared-ui', initialized: true, commit: 'abc123...' },
 *     { path: 'libs/legacy', initialized: false, warning: 'Submodule not initialized' }
 *   ],
 *   warnings: ['Some submodules are not initialized. Run: git submodule update --init']
 * };
 * ```
 */
interface SubmoduleScanResult {
    /**
     * Whether the scanned path is a submodule.
     * Used when scanning a single directory.
     */
    isSubmodule: boolean;
    /**
     * The scanned path.
     */
    path: string;
    /**
     * Relative path from repo root (if is a submodule).
     */
    relativePath?: string;
    /**
     * Submodule status details (if is a submodule).
     */
    status?: SubmoduleStatus;
    /**
     * Whether the project has any submodules.
     * @deprecated Use isSubmodule for single path checks
     */
    hasSubmodules?: boolean;
    /**
     * List of submodule statuses (for bulk scans).
     */
    submodules?: SubmoduleStatus[];
    /**
     * Warnings about submodule state.
     */
    warnings?: string[];
}
/**
 * Type guard to check if a value is a valid SubmoduleStatus.
 */
declare function isSubmoduleStatus(value: unknown): value is SubmoduleStatus;
/**
 * Type guard to check if a value is a valid SubmoduleScanResult.
 */
declare function isSubmoduleScanResult(value: unknown): value is SubmoduleScanResult;
/**
 * Creates an empty submodule scan result.
 */
declare function createEmptySubmoduleScanResult(dirPath: string): SubmoduleScanResult;

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
type ModuleSystem = 'commonjs' | 'esm';
/**
 * Template source - where templates came from
 */
type TemplateSource = 'bundled' | 'local-override';
/**
 * Detection confidence level based on signal consistency
 */
type DetectionConfidence = 'high' | 'medium' | 'low';
/**
 * Detection method that determined module system
 */
type DetectionMethod = 'package.json' | 'tsconfig.json' | 'fallback';
/**
 * Parsed Node.js version components
 */
interface NodeVersionParsed {
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
interface EnvironmentContext {
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
interface DetectionOptions {
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
interface DetectionResult {
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

export { type ArtkConfidenceLevel as A, type DetectionConfidence as D, type EnvironmentContext as E, type ModuleSystem as M, type NodeVersionParsed as N, type SubmoduleState as S, type TemplateSource as T, type DetectionMethod as a, type DetectionOptions as b, type DetectionResult as c, type ArtkDetectionSignalCategory as d, type DetectionSignal as e, type DetectionResult$1 as f, type SubmoduleStatus as g, type SubmoduleScanResult as h, isDetectionResult as i, isSubmoduleStatus as j, isSubmoduleScanResult as k, createEmptySubmoduleScanResult as l };
