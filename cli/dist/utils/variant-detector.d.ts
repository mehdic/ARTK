/**
 * ARTK Variant Detection Logic
 *
 * Detects Node.js version and module system to select the appropriate variant.
 */
import type { VariantId, ModuleSystem, DetectionResult, VariantSelectionOptions } from './variant-types.js';
/**
 * Get the current Node.js major version.
 */
export declare function getNodeMajorVersion(): number;
/**
 * Get the full Node.js version string.
 */
export declare function getNodeVersionFull(): string;
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
export declare function detectModuleSystem(targetPath: string): ModuleSystem;
/**
 * Detect environment and select appropriate variant.
 */
export declare function detectEnvironment(targetPath: string): DetectionResult;
/**
 * Select variant based on options (with optional override).
 */
export declare function selectVariant(options: VariantSelectionOptions): DetectionResult;
/**
 * Validate that the selected variant can run on the current Node.js version.
 */
export declare function validateVariantCompatibility(variantId: VariantId, nodeVersion?: number): {
    valid: boolean;
    error?: string;
};
/**
 * Check if the project has an existing ARTK installation.
 */
export declare function hasExistingInstallation(targetPath: string): boolean;
/**
 * Read existing context from .artk/context.json.
 */
export declare function readExistingContext(targetPath: string): {
    variant: VariantId;
    nodeVersion: number;
} | null;
/**
 * Check if the environment has changed since last installation.
 */
export declare function detectEnvironmentChange(targetPath: string): {
    changed: boolean;
    reason?: string;
    currentNodeVersion: number;
    previousNodeVersion?: number;
    currentVariant: VariantId;
    previousVariant?: VariantId;
};
//# sourceMappingURL=variant-detector.d.ts.map