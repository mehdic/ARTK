/**
 * TypeScript Configuration Detection
 *
 * Detects TypeScript module settings from tsconfig.json.
 * Uses strip-json-comments to handle JSON with comments.
 *
 * @module @artk/core/detection/env/typescript-config
 */

import * as fs from 'fs';
import * as path from 'path';
import stripJsonComments from 'strip-json-comments';
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
 * TypeScript module values that map to ESM
 */
const ESM_TS_MODULES = [
  'es6',
  'es2015',
  'es2020',
  'es2022',
  'esnext',
  'nodenext',
  'node16',
  'node18',
];

/**
 * TypeScript module values that map to CommonJS
 */
const CJS_TS_MODULES = ['commonjs', 'umd', 'amd', 'system'];

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
export function parseTsConfig(content: string): TsConfigMinimal | null {
  try {
    // Strip comments first
    const cleanContent = stripJsonComments(content);
    return JSON.parse(cleanContent);
  } catch {
    // Return null for any parse error (including invalid JSON after comment stripping)
    return null;
  }
}

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
export function getTsModuleFromConfig(config: TsConfigMinimal | null): string | null {
  if (!config || !config.compilerOptions) {
    return null;
  }
  return config.compilerOptions.module ?? null;
}

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
export function inferModuleSystemFromTsModule(tsModule: string | null): ModuleSystem | null {
  if (!tsModule) {
    return null;
  }

  const normalized = tsModule.toLowerCase();

  if (ESM_TS_MODULES.includes(normalized)) {
    return 'esm';
  }

  if (CJS_TS_MODULES.includes(normalized)) {
    return 'commonjs';
  }

  // Unknown module type
  return null;
}

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
export function detectTypeScriptModule(projectRoot: string): TypeScriptDetectionResult {
  const warnings: string[] = [];
  const tsconfigPath = path.join(projectRoot, 'tsconfig.json');

  // Check if tsconfig.json exists
  if (!fs.existsSync(tsconfigPath)) {
    return {
      tsModule: null,
      inferredModuleSystem: null,
      warnings,
      found: false,
    };
  }

  // Read and parse tsconfig.json
  let config: TsConfigMinimal | null;
  try {
    const content = fs.readFileSync(tsconfigPath, 'utf8');
    config = parseTsConfig(content);
  } catch (error) {
    warnings.push(
      `Failed to read tsconfig.json: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    return {
      tsModule: null,
      inferredModuleSystem: null,
      warnings,
      found: true,
    };
  }

  if (!config) {
    warnings.push('Failed to parse tsconfig.json (invalid JSON after comment stripping)');
    return {
      tsModule: null,
      inferredModuleSystem: null,
      warnings,
      found: true,
    };
  }

  const tsModule = getTsModuleFromConfig(config);
  const inferredModuleSystem = inferModuleSystemFromTsModule(tsModule);

  return {
    tsModule,
    inferredModuleSystem,
    warnings,
    found: true,
  };
}
