/**
 * Journey Normalizer - Convert parsed Journey to IR
 * @see research/2026-01-02_autogen-refined-plan.md Section 9
 */
import type { ParsedJourney } from './parseJourney.js';
import type { IRPrimitive, IRMappingResult, CompletionSignal } from '../ir/types.js';
/**
 * Options for normalizing a Journey
 */
export interface NormalizeOptions {
    /** Include blocked steps in output */
    includeBlocked?: boolean;
    /** Strict mode - fail on any blocked step */
    strict?: boolean;
    /** Default timeout for assertions (ms) */
    defaultTimeout?: number;
}
/**
 * Normalize a parsed Journey into IR format
 */
export declare function normalizeJourney(parsed: ParsedJourney, options?: NormalizeOptions): IRMappingResult;
/**
 * Convert completion signals to IR primitives (final assertions)
 */
export declare function completionSignalsToAssertions(signals: CompletionSignal[]): IRPrimitive[];
/**
 * Validate that a Journey is ready for code generation
 */
export declare function validateJourneyForCodeGen(result: IRMappingResult): {
    valid: boolean;
    errors: string[];
};
//# sourceMappingURL=normalize.d.ts.map