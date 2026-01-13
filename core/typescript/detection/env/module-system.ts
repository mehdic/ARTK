/**
 * Module System Detection
 *
 * Detects whether a project uses CommonJS or ESM based on package.json.
 *
 * @module @artk/core/detection/env/module-system
 */

import * as fs from 'fs';
import * as path from 'path';
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
export function getModuleSystemFromType(typeField: string | undefined): ModuleSystem {
  if (typeField === 'module') {
    return 'esm';
  }
  // "commonjs" or any other value (including undefined) = CommonJS
  return 'commonjs';
}

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
export function parsePackageJson(content: string): PackageJsonMinimal {
  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(
      `Failed to parse package.json: ${error instanceof Error ? error.message : 'Invalid JSON'}`
    );
  }
}

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
export function detectModuleSystem(projectRoot: string): ModuleSystemDetectionResult {
  const warnings: string[] = [];
  const packageJsonPath = path.join(projectRoot, 'package.json');

  // Check if package.json exists
  if (!fs.existsSync(packageJsonPath)) {
    warnings.push('package.json not found in project root. Using CommonJS fallback.');
    return {
      moduleSystem: 'commonjs',
      detectionMethod: 'fallback',
      confidence: 'low',
      warnings,
    };
  }

  // Read and parse package.json
  let pkg: PackageJsonMinimal;
  try {
    const content = fs.readFileSync(packageJsonPath, 'utf8');
    pkg = parsePackageJson(content);
  } catch (error) {
    warnings.push(
      `Failed to parse package.json: ${error instanceof Error ? error.message : 'Unknown error'}. Using CommonJS fallback.`
    );
    return {
      moduleSystem: 'commonjs',
      detectionMethod: 'fallback',
      confidence: 'low',
      warnings,
    };
  }

  // Determine module system from type field
  const moduleSystem = getModuleSystemFromType(pkg.type);

  return {
    moduleSystem,
    detectionMethod: 'package.json',
    confidence: 'high',
    warnings,
    rawType: pkg.type,
  };
}
