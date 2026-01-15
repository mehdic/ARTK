import type { HealFixType, HealingConfig } from './rules.js';
import type { FailureClassification } from '../verify/classifier.js';
import type { VerifySummary } from '../verify/summary.js';
/**
 * Healing loop options
 */
export interface HealingLoopOptions {
    /** Journey ID */
    journeyId: string;
    /** Path to test file */
    testFile: string;
    /** Output directory for logs */
    outputDir: string;
    /** Healing configuration */
    config?: HealingConfig;
    /** Function to verify the test */
    verifyFn: () => Promise<VerifySummary>;
    /** Optional ARIA info for selector fixes */
    ariaInfo?: Record<string, unknown>;
}
/**
 * Healing loop result
 */
export interface HealingLoopResult {
    /** Whether healing succeeded */
    success: boolean;
    /** Final status */
    status: 'healed' | 'failed' | 'exhausted' | 'not_healable';
    /** Number of attempts made */
    attempts: number;
    /** Fix that worked (if any) */
    appliedFix?: HealFixType;
    /** Path to heal log */
    logPath: string;
    /** Recommendation if not healed */
    recommendation?: string;
    /** Modified code (if any changes) */
    modifiedCode?: string;
}
/**
 * Run the bounded healing loop
 */
export declare function runHealingLoop(options: HealingLoopOptions): Promise<HealingLoopResult>;
/**
 * Dry run healing to preview fixes without applying
 */
export declare function previewHealingFixes(code: string, classification: FailureClassification, config?: HealingConfig): Array<{
    fixType: HealFixType;
    preview: string;
    confidence: number;
}>;
/**
 * Check if a specific fix type would apply to code
 */
export declare function wouldFixApply(code: string, fixType: HealFixType, classification: FailureClassification): boolean;
//# sourceMappingURL=loop.d.ts.map