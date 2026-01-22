/**
 * ARTK CLI - Upgrade Command
 *
 * Upgrades ARTK installation, detecting environment changes and migrating variants.
 */
import type { VariantId } from '../utils/variant-types.js';
/**
 * Upgrade command options.
 */
export interface UpgradeOptions {
    targetPath: string;
    force?: boolean;
    skipNpm?: boolean;
}
/**
 * Upgrade command result.
 */
export interface UpgradeResult {
    success: boolean;
    previousVariant?: VariantId;
    newVariant?: VariantId;
    variantChanged: boolean;
    error?: string;
    warnings?: string[];
}
/**
 * Execute the upgrade command.
 */
export declare function upgrade(options: UpgradeOptions): Promise<UpgradeResult>;
/**
 * Print upgrade results.
 */
export declare function printUpgradeResults(result: UpgradeResult): void;
/**
 * CLI entry point for upgrade command.
 */
export declare function parseUpgradeArgs(args: string[]): UpgradeOptions;
//# sourceMappingURL=upgrade.d.ts.map