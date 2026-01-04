/**
 * @artk/core-autogen - Deterministic Test Generation Engine
 *
 * Transforms clarified Journey markdown files into Playwright E2E tests.
 *
 * @packageDocumentation
 * @module @artk/core-autogen
 */
export * from './ir/types.js';
export * from './ir/builder.js';
export * from './ir/serialize.js';
export * from './config/schema.js';
export * from './config/loader.js';
export * from './journey/parseJourney.js';
export * from './journey/normalize.js';
export * from './journey/hintPatterns.js';
export * from './journey/parseHints.js';
export * from './mapping/patterns.js';
export * from './mapping/glossary.js';
export * from './mapping/stepMapper.js';
export * from './selectors/priority.js';
export * from './selectors/infer.js';
export * from './selectors/catalogSchema.js';
export * from './selectors/catalog.js';
export * from './selectors/scanner.js';
export * from './selectors/debt.js';
export * from './codegen/generateTest.js';
export * from './codegen/generateModule.js';
export * from './codegen/astEdit.js';
export * from './codegen/registry.js';
export * from './utils/escaping.js';
export * from './validate/index.js';
export * from './verify/index.js';
export * from './heal/index.js';
export * from './instance/install.js';
export * from './instance/upgrade.js';
import { type GenerateTestOptions, type GenerateTestResult } from './codegen/generateTest.js';
import { type GenerateModuleOptions, type GenerateModuleResult } from './codegen/generateModule.js';
import type { AutogenConfig } from './config/schema.js';
import type { IRJourney } from './ir/types.js';
/**
 * Options for the main generation pipeline
 */
export interface GenerateJourneyTestsOptions {
    /** Journey file paths or content */
    journeys: string[];
    /** Whether inputs are file paths (true) or content (false) */
    isFilePaths?: boolean;
    /** Output directory for generated files */
    outputDir?: string;
    /** Configuration object or path to config file */
    config?: AutogenConfig | string;
    /** Generate modules alongside tests */
    generateModules?: boolean;
    /** Test generation options */
    testOptions?: GenerateTestOptions;
    /** Module generation options */
    moduleOptions?: GenerateModuleOptions;
}
/**
 * Result of the generation pipeline
 */
export interface GenerateJourneyTestsResult {
    /** Generated test files */
    tests: Array<{
        journeyId: string;
        filename: string;
        code: string;
    }>;
    /** Generated module files (if requested) */
    modules: Array<{
        moduleName: string;
        filename: string;
        code: string;
    }>;
    /** Warnings encountered during generation */
    warnings: string[];
    /** Errors encountered (generation continues on non-fatal errors) */
    errors: string[];
}
/**
 * Main API: Generate Playwright tests from Journey files
 *
 * @example
 * ```typescript
 * import { generateJourneyTests } from '@artk/core-autogen';
 *
 * const result = await generateJourneyTests({
 *   journeys: ['journeys/login.md', 'journeys/checkout.md'],
 *   isFilePaths: true,
 *   generateModules: true,
 * });
 *
 * for (const test of result.tests) {
 *   console.log(`Generated: ${test.filename}`);
 * }
 * ```
 */
export declare function generateJourneyTests(options: GenerateJourneyTestsOptions): Promise<GenerateJourneyTestsResult>;
/**
 * Generate a single test from an IR Journey
 */
export declare function generateTestFromIR(journey: IRJourney, options?: GenerateTestOptions): GenerateTestResult;
/**
 * Generate a single module from an IR Journey
 */
export declare function generateModuleFromIR(journey: IRJourney, options?: GenerateModuleOptions): GenerateModuleResult;
/**
 * Parse and normalize a journey file
 */
export declare function parseAndNormalize(filePath: string): {
    journey: IRJourney;
    warnings: string[];
};
/**
 * Version of the autogen engine
 */
export declare const VERSION = "1.0.0";
import { type CodeValidationResult, type CodeValidationOptions } from './validate/code.js';
/**
 * Options for validating a journey
 */
export interface ValidateJourneyOptions extends CodeValidationOptions {
    /** Journey ID to validate */
    journeyId?: string;
    /** Whether inputs are file paths (true) or content (false) */
    isFilePath?: boolean;
}
/**
 * Result of journey validation
 */
export interface ValidateJourneyResult extends CodeValidationResult {
    /** The generated code that was validated */
    generatedCode?: string;
}
/**
 * Validate a generated journey test
 *
 * @example
 * ```typescript
 * import { validateJourney } from '@artk/core-autogen';
 *
 * const result = await validateJourney('journeys/login.md', {
 *   isFilePath: true,
 *   runLint: true,
 * });
 *
 * if (result.valid) {
 *   console.log('Journey passes validation');
 * } else {
 *   console.log('Issues:', result.issues);
 * }
 * ```
 */
export declare function validateJourney(journeyInput: string, options?: ValidateJourneyOptions): Promise<ValidateJourneyResult>;
/**
 * Validate multiple journeys
 */
export declare function validateJourneys(journeys: string[], options?: ValidateJourneyOptions): Promise<Map<string, ValidateJourneyResult>>;
import { type RunnerOptions } from './verify/runner.js';
import { type VerifySummary } from './verify/summary.js';
/**
 * Options for verifying a journey
 */
export interface VerifyJourneyOptions extends RunnerOptions {
    /** Journey ID to verify */
    journeyId?: string;
    /** Whether input is a file path (true) or content (false) */
    isFilePath?: boolean;
    /** Output directory for generated test */
    outputDir?: string;
    /** Whether to check stability (repeat runs) */
    checkStability?: boolean;
    /** Number of stability runs */
    stabilityRuns?: number;
    /** Whether to attempt healing on failure */
    heal?: boolean;
    /** Maximum healing attempts */
    maxHealAttempts?: number;
}
/**
 * Result of journey verification
 */
export interface VerifyJourneyResult extends VerifySummary {
    /** The generated test code */
    generatedCode?: string;
    /** Path to generated test file */
    testFilePath?: string;
    /** Healing result (if heal was enabled) */
    healing?: {
        attempted: boolean;
        success: boolean;
        attempts: number;
        appliedFix?: string;
        logPath?: string;
    };
}
/**
 * Verify a journey by generating and running tests
 *
 * @example
 * ```typescript
 * import { verifyJourney } from '@artk/core-autogen';
 *
 * const result = await verifyJourney('journeys/login.md', {
 *   isFilePath: true,
 *   checkStability: true,
 * });
 *
 * if (result.status === 'passed') {
 *   console.log('Journey verification passed!');
 * } else {
 *   console.log('Failures:', result.failures.tests);
 * }
 * ```
 */
export declare function verifyJourney(journeyInput: string, options?: VerifyJourneyOptions): Promise<VerifyJourneyResult>;
/**
 * Verify multiple journeys
 */
export declare function verifyJourneys(journeys: string[], options?: VerifyJourneyOptions): Promise<Map<string, VerifyJourneyResult>>;
//# sourceMappingURL=index.d.ts.map