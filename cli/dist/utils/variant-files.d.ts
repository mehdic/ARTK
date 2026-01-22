/**
 * ARTK Variant File Operations
 *
 * Shared utilities for copying variant files and generating AI protection markers.
 * Used by both init and upgrade commands.
 */
import type { VariantId, ArtkContext } from './variant-types.js';
import { getVariantDefinition } from './variant-definitions.js';
/**
 * Get the ARTK version from package.json or fallback.
 */
export declare function getArtkVersion(): string;
/**
 * Find the ARTK core source directory.
 */
export declare function findArtkCorePath(): string | null;
/**
 * Get the dist directory for a variant.
 */
export declare function getVariantDistPath(corePath: string, variant: VariantId): string;
/**
 * Check if variant build files exist and are valid.
 */
export declare function validateVariantBuildFiles(variant: VariantId): {
    valid: boolean;
    corePath?: string;
    distPath?: string;
    error?: string;
};
/**
 * Copy variant files to vendor directory.
 */
export declare function copyVariantFiles(variant: VariantId, targetPath: string): {
    success: boolean;
    error?: string;
    copiedFiles: number;
    warnings?: string[];
};
/**
 * Generate variant-features.json content.
 */
export declare function generateVariantFeatures(variant: VariantId): Record<string, unknown>;
/**
 * Write variant-features.json to vendor directory.
 */
export declare function writeVariantFeatures(vendorPath: string, variant: VariantId): void;
/**
 * Generate READONLY.md content.
 */
export declare function generateReadonlyMarker(variantDef: ReturnType<typeof getVariantDefinition>, context: ArtkContext): string;
/**
 * Write READONLY.md to vendor directory.
 */
export declare function writeReadonlyMarker(vendorPath: string, variantDef: ReturnType<typeof getVariantDefinition>, context: ArtkContext): void;
/**
 * Generate .ai-ignore content.
 */
export declare function generateAiIgnore(variant: VariantId): string;
/**
 * Write .ai-ignore to vendor directory.
 */
export declare function writeAiIgnore(vendorPath: string, variant: VariantId): void;
/**
 * Write all AI protection markers to a vendor directory.
 */
export declare function writeAllAiProtectionMarkers(vendorPath: string, variant: VariantId, context: ArtkContext): void;
/**
 * Check if a variant is compatible with a Node.js version.
 * Returns detailed compatibility info.
 */
export declare function checkVariantNodeCompatibility(variant: VariantId, nodeVersion: number): {
    compatible: boolean;
    variant: VariantId;
    nodeVersion: number;
    supportedRange: string[];
    error?: string;
};
/**
 * Generate variant-aware Copilot instructions content.
 */
export declare function generateCopilotInstructions(variant: VariantId): string;
/**
 * Write variant-aware Copilot instructions to project.
 */
export declare function writeCopilotInstructions(targetPath: string, variant: VariantId): void;
//# sourceMappingURL=variant-files.d.ts.map