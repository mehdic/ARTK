/**
 * Step Mapper - Convert step text to IR primitives
 * @see research/2026-01-02_autogen-refined-plan.md Section 10
 * @see T073 - Update step mapper to prioritize explicit hints over inference
 */
import type { IRPrimitive, IRStep } from '../ir/types.js';
import type { AcceptanceCriterion, ProceduralStep } from '../journey/parseJourney.js';
/**
 * Options for step mapping
 */
export interface StepMapperOptions {
    /** Whether to normalize text before matching */
    normalizeText?: boolean;
    /** Whether to include blocked steps for unmatched text */
    includeBlocked?: boolean;
    /** Default timeout for assertions */
    defaultTimeout?: number;
}
/**
 * Result of mapping a single step
 */
export interface StepMappingResult {
    /** The parsed primitive, or null if not matched */
    primitive: IRPrimitive | null;
    /** Original text that was mapped */
    sourceText: string;
    /** Whether this is an assertion (expect*) or action */
    isAssertion: boolean;
    /** Warning or error message if any */
    message?: string;
}
/**
 * Result of mapping an acceptance criterion
 */
export interface ACMappingResult {
    /** The mapped IR step */
    step: IRStep;
    /** Individual step mapping results */
    mappings: StepMappingResult[];
    /** Number of successfully mapped steps */
    mappedCount: number;
    /** Number of blocked/unmatched steps */
    blockedCount: number;
}
/**
 * Map a single text step to an IR primitive
 */
export declare function mapStepText(text: string, options?: StepMapperOptions): StepMappingResult;
/**
 * Map an acceptance criterion to an IR step
 */
export declare function mapAcceptanceCriterion(ac: AcceptanceCriterion, proceduralSteps: ProceduralStep[], options?: StepMapperOptions): ACMappingResult;
/**
 * Map a procedural step to an IR step
 */
export declare function mapProceduralStep(ps: ProceduralStep, options?: StepMapperOptions): ACMappingResult;
/**
 * Batch map multiple steps
 */
export declare function mapSteps(steps: string[], options?: StepMapperOptions): StepMappingResult[];
/**
 * Get mapping statistics
 */
export declare function getMappingStats(mappings: StepMappingResult[]): {
    total: number;
    mapped: number;
    blocked: number;
    actions: number;
    assertions: number;
    mappingRate: number;
};
/**
 * Suggest improvements for blocked steps
 */
export declare function suggestImprovements(blockedSteps: StepMappingResult[]): string[];
//# sourceMappingURL=stepMapper.d.ts.map