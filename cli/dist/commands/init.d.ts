/**
 * ARTK CLI - Init Command
 *
 * Initializes ARTK in a target project with automatic variant detection.
 */
import type { VariantId } from '../utils/variant-types.js';
/**
 * Init command options.
 */
export interface InitOptions {
    targetPath: string;
    variant?: string;
    force?: boolean;
    skipNpm?: boolean;
    skipBrowsers?: boolean;
}
/**
 * Init command result.
 */
export interface InitResult {
    success: boolean;
    variant?: VariantId;
    error?: string;
    warnings?: string[];
}
/**
 * Execute the init command.
 */
export declare function init(options: InitOptions): Promise<InitResult>;
/**
 * CLI entry point for init command.
 */
export declare function parseInitArgs(args: string[]): InitOptions;
//# sourceMappingURL=init.d.ts.map