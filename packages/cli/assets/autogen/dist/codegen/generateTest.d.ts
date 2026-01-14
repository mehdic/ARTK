import type { IRJourney } from '../ir/types.js';
/**
 * Import statement for generated test
 */
export interface ImportStatement {
    members: string[];
    from: string;
}
/**
 * Options for test generation
 */
export interface GenerateTestOptions {
    /** Custom template path */
    templatePath?: string;
    /** Whether to include source comments */
    includeComments?: boolean;
    /** Module imports to add */
    imports?: ImportStatement[];
    /** Custom test ID attribute */
    testIdAttribute?: string;
    /**
     * Code generation strategy
     * - 'full': Generate complete file (default)
     * - 'blocks': Use managed blocks for partial regeneration
     * - 'ast': Use AST editing to preserve structure
     */
    strategy?: 'full' | 'blocks' | 'ast';
    /** Existing code (required for 'blocks' and 'ast' strategies) */
    existingCode?: string;
    /** Whether to update journey frontmatter with test metadata */
    updateJourney?: boolean;
    /** Path to the source journey file (required if updateJourney is true) */
    journeyPath?: string;
    /** Output path for the generated test file (for journey update) */
    outputPath?: string;
}
/**
 * Result of test generation
 */
export interface GenerateTestResult {
    /** Generated test code */
    code: string;
    /** Journey ID */
    journeyId: string;
    /** Suggested filename */
    filename: string;
    /** Imports used */
    imports: ImportStatement[];
}
/**
 * Generate Playwright test code from IR Journey
 */
export declare function generateTest(journey: IRJourney, options?: GenerateTestOptions): GenerateTestResult;
/**
 * Generate test code as a string (convenience function)
 */
export declare function generateTestCode(journey: IRJourney): string;
//# sourceMappingURL=generateTest.d.ts.map