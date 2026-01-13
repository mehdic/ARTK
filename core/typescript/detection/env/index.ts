/**
 * Environment Detection Module
 *
 * Automatically detects project environment (CommonJS/ESM, Node version, TypeScript config)
 * for foundation module generation.
 *
 * @module @artk/core/detection/env
 *
 * @example
 * ```typescript
 * import { detectEnvironment } from '@artk/core/detection';
 *
 * const result = detectEnvironment({ projectRoot: '/path/to/project' });
 * console.log(`Module system: ${result.context.moduleSystem}`);
 * console.log(`Template variant: ${result.context.templateVariant}`);
 * ```
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  EnvironmentContext,
  ModuleSystem,
  DetectionOptions as BaseDetectionOptions,
  DetectionResult,
} from '../../types/environment-context.js';
import { getNodeVersion, validateNodeVersion, determineESMCompatibility, type ParsedNodeVersion } from './node-version.js';
import { detectModuleSystem, type ModuleSystemDetectionResult } from './module-system.js';
import { detectTypeScriptModule, type TypeScriptDetectionResult } from './typescript-config.js';
import { calculateConfidence, type DetectionSignals } from './confidence.js';

// Re-export sub-modules
export * from './node-version.js';
export * from './module-system.js';
export * from './typescript-config.js';
export * from './confidence.js';

/**
 * Extended detection options
 */
export interface DetectionOptions extends BaseDetectionOptions {
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
 * Context file path
 */
const CONTEXT_DIR = '.artk';
const CONTEXT_FILE = 'context.json';

/**
 * Default detection timeout (5 seconds per spec)
 */
const DEFAULT_TIMEOUT = 5000;

/**
 * Reads cached context from .artk/context.json
 */
function readCachedContext(projectRoot: string): EnvironmentContext | null {
  const contextPath = path.join(projectRoot, CONTEXT_DIR, CONTEXT_FILE);

  if (!fs.existsSync(contextPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(contextPath, 'utf8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Writes context to .artk/context.json
 */
function writeCachedContext(projectRoot: string, context: EnvironmentContext): void {
  const contextDir = path.join(projectRoot, CONTEXT_DIR);
  const contextPath = path.join(contextDir, CONTEXT_FILE);

  // Create .artk directory if it doesn't exist
  if (!fs.existsSync(contextDir)) {
    fs.mkdirSync(contextDir, { recursive: true });
  }

  fs.writeFileSync(contextPath, JSON.stringify(context, null, 2));
}

/**
 * Creates an EnvironmentContext from detection results
 */
function createEnvironmentContext(
  nodeVersion: ParsedNodeVersion,
  moduleSystemResult: ModuleSystemDetectionResult,
  tsResult: TypeScriptDetectionResult,
  confidenceResult: ReturnType<typeof calculateConfidence>
): EnvironmentContext {
  const esmCompat = determineESMCompatibility(nodeVersion);

  // Determine final module system
  const moduleSystem = confidenceResult.recommendedModuleSystem;

  // Collect all warnings
  const warnings = [
    ...moduleSystemResult.warnings,
    ...tsResult.warnings,
    ...confidenceResult.warnings,
  ];

  return {
    moduleSystem,
    nodeVersion: nodeVersion.raw,
    nodeVersionParsed: {
      major: nodeVersion.major,
      minor: nodeVersion.minor,
      patch: nodeVersion.patch,
    },
    tsModule: tsResult.tsModule,
    supportsImportMeta: moduleSystem === 'esm' && esmCompat.supportsImportMeta,
    supportsBuiltinDirname: esmCompat.supportsBuiltinDirname,
    templateVariant: moduleSystem,
    templateSource: 'bundled',
    detectionTimestamp: new Date().toISOString(),
    detectionConfidence: confidenceResult.confidence,
    detectionMethod: moduleSystemResult.detectionMethod,
    warnings,
  };
}

/**
 * Detects project environment (FR-001 through FR-010)
 *
 * Performs automatic detection of:
 * - Node.js version (FR-001)
 * - Module system from package.json (FR-002)
 * - TypeScript module setting (FR-003)
 * - ESM compatibility (FR-004)
 *
 * Results are cached to .artk/context.json (FR-005, FR-006).
 *
 * @param options - Detection options
 * @returns Detection result with environment context
 * @throws Error if projectRoot doesn't exist or Node version is unsupported
 *
 * @example
 * ```typescript
 * // Basic detection
 * const result = detectEnvironment({ projectRoot: '/path/to/project' });
 *
 * // Force re-detection (bypass cache)
 * const fresh = detectEnvironment({
 *   projectRoot: '/path/to/project',
 *   forceDetect: true
 * });
 * ```
 */
export function detectEnvironment(options: DetectionOptions): DetectionResult {
  const { projectRoot, forceDetect = false, timeout = DEFAULT_TIMEOUT } = options;
  const startTime = Date.now();

  // Validate project root exists
  if (!fs.existsSync(projectRoot)) {
    throw new Error(`Project directory does not exist: ${projectRoot}`);
  }

  // Check for cached results (unless force-detect)
  if (!forceDetect) {
    const cached = readCachedContext(projectRoot);
    if (cached) {
      return {
        context: cached,
        fromCache: true,
        detectionTime: Date.now() - startTime,
      };
    }
  }

  // Perform detection with timeout protection
  let context: EnvironmentContext;
  let timedOut = false;

  try {
    // Set up timeout check
    const checkTimeout = () => {
      if (Date.now() - startTime > timeout) {
        timedOut = true;
        throw new Error('Detection timeout');
      }
    };

    // 1. Get Node version (FR-001)
    const nodeVersion = getNodeVersion();
    validateNodeVersion(nodeVersion);
    checkTimeout();

    // 2. Detect module system from package.json (FR-002)
    const moduleSystemResult = detectModuleSystem(projectRoot);
    checkTimeout();

    // 3. Detect TypeScript module (FR-003)
    const tsResult = detectTypeScriptModule(projectRoot);
    checkTimeout();

    // 4. Calculate confidence (FR-008)
    const signals: DetectionSignals = {
      packageJsonType: moduleSystemResult.rawType,
      tsconfigModule: tsResult.tsModule,
      usedFallback: moduleSystemResult.detectionMethod === 'fallback',
      timedOut: false,
    };
    const confidenceResult = calculateConfidence(signals);

    // 5. Create context
    context = createEnvironmentContext(nodeVersion, moduleSystemResult, tsResult, confidenceResult);
  } catch (error) {
    if (timedOut || (error instanceof Error && error.message === 'Detection timeout')) {
      // Fallback on timeout
      const nodeVersion = getNodeVersion();
      const esmCompat = determineESMCompatibility(nodeVersion);

      context = {
        moduleSystem: 'commonjs',
        nodeVersion: nodeVersion.raw,
        nodeVersionParsed: {
          major: nodeVersion.major,
          minor: nodeVersion.minor,
          patch: nodeVersion.patch,
        },
        tsModule: null,
        supportsImportMeta: false,
        supportsBuiltinDirname: esmCompat.supportsBuiltinDirname,
        templateVariant: 'commonjs',
        templateSource: 'bundled',
        detectionTimestamp: new Date().toISOString(),
        detectionConfidence: 'low',
        detectionMethod: 'fallback',
        warnings: ['Detection timed out. Using CommonJS fallback.'],
      };
    } else {
      throw error;
    }
  }

  // Cache results (FR-005)
  writeCachedContext(projectRoot, context);

  return {
    context,
    fromCache: false,
    detectionTime: Date.now() - startTime,
  };
}
