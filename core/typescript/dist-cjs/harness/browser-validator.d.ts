import type { BrowserChannel } from '../config/types.js';
export interface BrowserValidationResult {
    available: boolean;
    version?: string;
    path?: string;
    reason?: string;
}
/**
 * Validate that the configured browser channel is available on the system.
 */
export declare function validateBrowserChannel(channel?: BrowserChannel): Promise<BrowserValidationResult>;
//# sourceMappingURL=browser-validator.d.ts.map