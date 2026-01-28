import { P as ParsedJourney } from './parseJourney-pVvnO7Mc.js';
import { C as CompletionSignal, I as IRPrimitive, a as IRMappingResult } from './types-CBcw78BQ.js';

/**
 * Journey Normalizer - Convert parsed Journey to IR
 * @see research/2026-01-02_autogen-refined-plan.md Section 9
 */

/**
 * Options for normalizing a Journey
 */
interface NormalizeOptions {
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
declare function normalizeJourney(parsed: ParsedJourney, options?: NormalizeOptions): IRMappingResult;
/**
 * Convert completion signals to IR primitives (final assertions)
 */
declare function completionSignalsToAssertions(signals: CompletionSignal[]): IRPrimitive[];
/**
 * Validate that a Journey is ready for code generation
 */
declare function validateJourneyForCodeGen(result: IRMappingResult): {
    valid: boolean;
    errors: string[];
};

export { type NormalizeOptions as N, completionSignalsToAssertions as c, normalizeJourney as n, validateJourneyForCodeGen as v };
