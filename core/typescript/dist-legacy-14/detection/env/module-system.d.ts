/**
 * Module System Detection
 *
 * Detects whether a project uses CommonJS or ESM based on package.json.
 *
 * @module @artk/core/detection/env/module-system
 */
import type { ModuleSystem, DetectionMethod, DetectionConfidence } from '../../types/environment-context.js';
/**
 * Minimal package.json type for detection
 */
export interface PackageJsonMinimal {
    name?: string;
    version?: string;
    type?: string;
    [key: string]: unknown;
}
/**
 * Result of module system detection from package.json
 */
export interface ModuleSystemDetectionResult {
    /**
     * Detected module system
     */
    moduleSystem: ModuleSystem;
    /**
     * How detection was performed
     */
    detectionMethod: DetectionMethod;
    /**
     * Confidence in the detection
     */
    confidence: DetectionConfidence;
    /**
     * Warnings encountered during detection
     */
    warnings: string[];
    /**
     * Raw type field value from package.json
     */
    rawType?: string;
}
/**
 * Gets module system from package.json "type" field (FR-002)
 *
 * Per Node.js specification:
 * - "module" = ESM
 * - "commonjs" or absent = CommonJS
 *
 * @param typeField - Value of "type" field from package.json
 * @returns Module system ('commonjs' or 'esm')
 *
 * @example
 * ```typescript
 * getModuleSystemFromType('module');   // 'esm'
 * getModuleSystemFromType('commonjs'); // 'commonjs'
 * getModuleSystemFromType(undefined);  // 'commonjs'
 * ```
 */
export declare function getModuleSystemFromType(typeField: string | undefined): ModuleSystem;
/**
 * Parses package.json content string
 *
 * @param content - Raw package.json content
 * @returns Parsed package.json object
 * @throws Error if content is invalid JSON
 *
 * @example
 * ```typescript
 * const pkg = parsePackageJson('{"name": "test", "type": "module"}');
 * // { name: 'test', type: 'module' }
 * ```
 */
export declare function parsePackageJson(content: string): PackageJsonMinimal;
/**
 * Detects module system from package.json in the project root (FR-002)
 *
 * @param projectRoot - Path to project root directory
 * @returns Detection result with module system, method, and warnings
 *
 * @example
 * ```typescript
 * const result = detectModuleSystem('/path/to/project');
 * if (result.moduleSystem === 'esm') {
 *   console.log('Project uses ES Modules');
 * }
 * ```
 */
export declare function detectModuleSystem(projectRoot: string): ModuleSystemDetectionResult;
//# sourceMappingURL=module-system.d.ts.map