/**
 * TypeScript Configuration Detection
 *
 * Detects TypeScript module settings from tsconfig.json.
 * Uses strip-json-comments to handle JSON with comments.
 *
 * @module @artk/core/detection/env/typescript-config
 */
import type { ModuleSystem } from '../../types/environment-context.js';
/**
 * Minimal tsconfig.json structure for detection
 */
export interface TsConfigMinimal {
    compilerOptions?: {
        module?: string;
        target?: string;
        moduleResolution?: string;
        [key: string]: unknown;
    };
    extends?: string;
    [key: string]: unknown;
}
/**
 * Result of TypeScript config detection
 */
export interface TypeScriptDetectionResult {
    /**
     * TypeScript module setting (e.g., "commonjs", "esnext", "nodenext")
     */
    tsModule: string | null;
    /**
     * Inferred module system based on tsconfig module setting
     */
    inferredModuleSystem: ModuleSystem | null;
    /**
     * Warnings encountered during detection
     */
    warnings: string[];
    /**
     * Whether tsconfig.json was found
     */
    found: boolean;
}
/**
 * Parses tsconfig.json content, handling JSON with comments
 *
 * Uses strip-json-comments to remove single-line and block style comments.
 *
 * @param content - Raw tsconfig.json content (may contain comments)
 * @returns Parsed config object, or null if parsing fails
 *
 * @example
 * ```typescript
 * const config = parseTsConfig(`{
 *   // TypeScript configuration
 *   "compilerOptions": {
 *     "module": "esnext"
 *   }
 * }`);
 * // { compilerOptions: { module: 'esnext' } }
 * ```
 */
export declare function parseTsConfig(content: string): TsConfigMinimal | null;
/**
 * Extracts module setting from tsconfig
 *
 * @param config - Parsed tsconfig object
 * @returns Module setting or null if not found
 *
 * @example
 * ```typescript
 * getTsModuleFromConfig({ compilerOptions: { module: 'esnext' } });
 * // 'esnext'
 *
 * getTsModuleFromConfig({});
 * // null
 * ```
 */
export declare function getTsModuleFromConfig(config: TsConfigMinimal | null): string | null;
/**
 * Infers module system from TypeScript module setting
 *
 * @param tsModule - TypeScript module setting
 * @returns Inferred module system or null if cannot determine
 *
 * @example
 * ```typescript
 * inferModuleSystemFromTsModule('esnext');   // 'esm'
 * inferModuleSystemFromTsModule('commonjs'); // 'commonjs'
 * inferModuleSystemFromTsModule('unknown');  // null
 * ```
 */
export declare function inferModuleSystemFromTsModule(tsModule: string | null): ModuleSystem | null;
/**
 * Detects TypeScript module setting from tsconfig.json (FR-003)
 *
 * @param projectRoot - Path to project root directory
 * @returns Detection result with module setting and inferred system
 *
 * @example
 * ```typescript
 * const result = detectTypeScriptModule('/path/to/project');
 * if (result.tsModule === 'esnext') {
 *   console.log('TypeScript configured for ESM');
 * }
 * ```
 */
export declare function detectTypeScriptModule(projectRoot: string): TypeScriptDetectionResult;
//# sourceMappingURL=typescript-config.d.ts.map