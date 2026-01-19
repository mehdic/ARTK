/**
 * ARTK Variant Detection Logic
 *
 * Detects Node.js version and module system to select the appropriate variant.
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  VariantId,
  ModuleSystem,
  DetectionResult,
  VariantSelectionOptions,
} from './variant-types.js';
import {
  getRecommendedVariant,
  isVariantCompatible,
  MIN_NODE_VERSION,
  VARIANT_DEFINITIONS,
} from './variant-definitions.js';

/**
 * Get the current Node.js major version.
 */
export function getNodeMajorVersion(): number {
  const version = process.version;
  const match = version.match(/^v(\d+)/);
  if (!match) {
    throw new Error(`Unable to parse Node.js version: ${version}`);
  }
  return parseInt(match[1], 10);
}

/**
 * Get the full Node.js version string.
 */
export function getNodeVersionFull(): string {
  return process.version;
}

/**
 * Find the nearest package.json by walking up the directory tree.
 * This handles monorepo scenarios where the target directory might not
 * have its own package.json but inherits from a parent.
 *
 * @returns The path to the nearest package.json, or null if none found
 */
function findNearestPackageJson(startPath: string): string | null {
  let currentPath = path.resolve(startPath);
  const root = path.parse(currentPath).root;

  while (currentPath !== root) {
    const packageJsonPath = path.join(currentPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      return packageJsonPath;
    }
    currentPath = path.dirname(currentPath);
  }

  return null;
}

/**
 * Detect module system from package.json in target directory or ancestors.
 *
 * Rules:
 * 1. Check target directory's package.json first
 * 2. If not found, walk up to parent directories (monorepo support)
 * 3. If package.json has "type": "module" -> ESM
 * 4. If package.json has "type": "commonjs" -> CJS
 * 5. If package.json has no "type" field -> CJS (Node.js default)
 * 6. If no package.json exists anywhere -> CJS (safe default)
 */
export function detectModuleSystem(targetPath: string): ModuleSystem {
  // First check the target directory itself
  const targetPackageJson = path.join(targetPath, 'package.json');

  if (fs.existsSync(targetPackageJson)) {
    try {
      const content = fs.readFileSync(targetPackageJson, 'utf-8');
      const pkg = JSON.parse(content) as { type?: string };

      if (pkg.type === 'module') {
        return 'esm';
      }

      // "commonjs" or no type field -> CJS
      return 'cjs';
    } catch {
      // Parse error, continue to parent search
    }
  }

  // Monorepo support: check parent directories
  const nearestPackageJson = findNearestPackageJson(targetPath);

  if (nearestPackageJson) {
    try {
      const content = fs.readFileSync(nearestPackageJson, 'utf-8');
      const pkg = JSON.parse(content) as { type?: string };

      if (pkg.type === 'module') {
        return 'esm';
      }

      // "commonjs" or no type field -> CJS
      return 'cjs';
    } catch {
      // Parse error, default to CJS
      return 'cjs';
    }
  }

  // No package.json found anywhere, default to CJS
  return 'cjs';
}

/**
 * Detect environment and select appropriate variant.
 */
export function detectEnvironment(targetPath: string): DetectionResult {
  try {
    const nodeVersion = getNodeMajorVersion();
    const nodeVersionFull = getNodeVersionFull();

    // Check minimum version
    if (nodeVersion < MIN_NODE_VERSION) {
      return {
        nodeVersion,
        nodeVersionFull,
        moduleSystem: 'cjs',
        selectedVariant: 'legacy-14', // Will fail validation later
        success: false,
        error: `Node.js ${nodeVersion} is not supported. ARTK requires Node.js ${MIN_NODE_VERSION} or higher.`,
      };
    }

    const moduleSystem = detectModuleSystem(targetPath);
    const selectedVariant = getRecommendedVariant(nodeVersion, moduleSystem);

    return {
      nodeVersion,
      nodeVersionFull,
      moduleSystem,
      selectedVariant,
      success: true,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown detection error';
    return {
      nodeVersion: 0,
      nodeVersionFull: process.version,
      moduleSystem: 'cjs',
      selectedVariant: 'modern-cjs',
      success: false,
      error: message,
    };
  }
}

/**
 * Select variant based on options (with optional override).
 */
export function selectVariant(options: VariantSelectionOptions): DetectionResult {
  const detection = detectEnvironment(options.targetPath);

  // If override is specified, use it (but validate compatibility)
  if (options.overrideVariant) {
    const isCompatible = isVariantCompatible(
      options.overrideVariant,
      detection.nodeVersion
    );

    if (!isCompatible) {
      const variant = VARIANT_DEFINITIONS[options.overrideVariant];
      return {
        ...detection,
        selectedVariant: options.overrideVariant,
        success: false,
        error: `Variant '${options.overrideVariant}' is not compatible with Node.js ${detection.nodeVersion}. ` +
          `This variant supports Node.js ${variant.nodeRange.join(', ')}.`,
      };
    }

    return {
      ...detection,
      selectedVariant: options.overrideVariant,
      success: true,
    };
  }

  return detection;
}

/**
 * Validate that the selected variant can run on the current Node.js version.
 */
export function validateVariantCompatibility(
  variantId: VariantId,
  nodeVersion?: number
): { valid: boolean; error?: string } {
  const nodeMajor = nodeVersion ?? getNodeMajorVersion();
  const variant = VARIANT_DEFINITIONS[variantId];

  if (!variant) {
    return {
      valid: false,
      error: `Unknown variant: ${variantId}`,
    };
  }

  if (!isVariantCompatible(variantId, nodeMajor)) {
    return {
      valid: false,
      error: `Variant '${variantId}' requires Node.js ${variant.nodeRange.join(' or ')}, ` +
        `but current version is ${nodeMajor}.`,
    };
  }

  return { valid: true };
}

/**
 * Check if the project has an existing ARTK installation.
 */
export function hasExistingInstallation(targetPath: string): boolean {
  const contextPath = path.join(targetPath, '.artk', 'context.json');
  return fs.existsSync(contextPath);
}

/**
 * Read existing context from .artk/context.json.
 */
export function readExistingContext(
  targetPath: string
): { variant: VariantId; nodeVersion: number } | null {
  const contextPath = path.join(targetPath, '.artk', 'context.json');

  if (!fs.existsSync(contextPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(contextPath, 'utf-8');
    const context = JSON.parse(content) as {
      variant?: string;
      nodeVersion?: number;
    };

    if (context.variant && context.nodeVersion) {
      return {
        variant: context.variant as VariantId,
        nodeVersion: context.nodeVersion,
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Check if the environment has changed since last installation.
 */
export function detectEnvironmentChange(
  targetPath: string
): {
  changed: boolean;
  reason?: string;
  currentNodeVersion: number;
  previousNodeVersion?: number;
  currentVariant: VariantId;
  previousVariant?: VariantId;
} {
  const current = detectEnvironment(targetPath);
  const existing = readExistingContext(targetPath);

  if (!existing) {
    return {
      changed: false,
      currentNodeVersion: current.nodeVersion,
      currentVariant: current.selectedVariant,
    };
  }

  const nodeVersionChanged = current.nodeVersion !== existing.nodeVersion;
  const variantWouldChange = current.selectedVariant !== existing.variant;

  if (nodeVersionChanged || variantWouldChange) {
    let reason = '';

    if (nodeVersionChanged) {
      reason = `Node.js version changed from ${existing.nodeVersion} to ${current.nodeVersion}`;
    }

    if (variantWouldChange && !nodeVersionChanged) {
      reason = `Module system change detected, variant would change from ${existing.variant} to ${current.selectedVariant}`;
    }

    return {
      changed: true,
      reason,
      currentNodeVersion: current.nodeVersion,
      previousNodeVersion: existing.nodeVersion,
      currentVariant: current.selectedVariant,
      previousVariant: existing.variant,
    };
  }

  return {
    changed: false,
    currentNodeVersion: current.nodeVersion,
    previousNodeVersion: existing.nodeVersion,
    currentVariant: current.selectedVariant,
    previousVariant: existing.variant,
  };
}
