/**
 * AC Coverage Validation - Check that all acceptance criteria have test steps
 * @see T043 - AC→test.step mapping completeness check
 */
import type { ValidationIssue } from './journey.js';
import type { AcceptanceCriterion } from '../journey/parseJourney.js';
import type { IRJourney } from '../ir/types.js';
/**
 * Coverage result for a single AC
 */
export interface ACCoverageResult {
    /** AC identifier */
    acId: string;
    /** AC title */
    acTitle: string;
    /** Whether the AC has a corresponding test.step */
    hasCoverage: boolean;
    /** Number of mapped steps */
    mappedSteps: number;
    /** Number of blocked/unmapped steps */
    blockedSteps: number;
    /** Coverage percentage (mapped / total) */
    coveragePercent: number;
    /** List of unmapped step texts */
    unmappedSteps: string[];
}
/**
 * Overall coverage result
 */
export interface CoverageResult {
    /** Whether all ACs are covered */
    fullCoverage: boolean;
    /** Total number of ACs */
    totalACs: number;
    /** Number of covered ACs */
    coveredACs: number;
    /** Overall coverage percentage */
    overallCoverage: number;
    /** Coverage details per AC */
    perAC: ACCoverageResult[];
    /** Validation issues */
    issues: ValidationIssue[];
}
/**
 * Coverage validation options
 */
export interface CoverageOptions {
    /** Minimum coverage percentage required */
    minCoverage?: number;
    /** Warn on partial coverage */
    warnPartialCoverage?: boolean;
    /** Maximum allowed blocked steps per AC */
    maxBlockedSteps?: number;
}
/**
 * Find test.step calls in generated code
 */
export declare function findTestSteps(code: string): Array<{
    id: string;
    description: string;
}>;
/**
 * Find AC IDs mentioned in code comments
 */
export declare function findACReferences(code: string): string[];
/**
 * Validate AC coverage in IR journey
 */
export declare function validateIRCoverage(journey: IRJourney, options?: CoverageOptions): CoverageResult;
/**
 * Validate coverage in generated test code
 */
export declare function validateCodeCoverage(code: string, acceptanceCriteria: AcceptanceCriterion[], _options?: CoverageOptions): CoverageResult;
/**
 * Generate coverage report as markdown
 */
export declare function generateCoverageReport(result: CoverageResult): string;
//# sourceMappingURL=coverage.d.ts.map