/**
 * Data fix context
 */
export interface DataFixContext {
    /** Original code */
    code: string;
    /** Test file path */
    testFile: string;
    /** Journey ID */
    journeyId: string;
}
/**
 * Data fix result
 */
export interface DataFixResult {
    /** Whether a fix was applied */
    applied: boolean;
    /** The modified code */
    code: string;
    /** Description of the fix */
    description: string;
    /** Confidence in the fix (0-1) */
    confidence: number;
}
/**
 * Generate unique run ID
 */
export declare function generateRunId(): string;
/**
 * Check if code has data isolation
 */
export declare function hasDataIsolation(code: string): boolean;
/**
 * Add runId variable to test
 */
export declare function addRunIdVariable(code: string): DataFixResult;
/**
 * Namespace email with runId
 */
export declare function namespaceEmail(email: string, runId: string): string;
/**
 * Namespace name with runId
 */
export declare function namespaceName(name: string, runId: string): string;
/**
 * Replace hardcoded email with namespaced version
 */
export declare function replaceHardcodedEmail(code: string): DataFixResult;
/**
 * Replace hardcoded test data with namespaced version
 */
export declare function replaceHardcodedTestData(code: string): DataFixResult;
/**
 * Apply data isolation fix
 */
export declare function applyDataFix(context: DataFixContext): DataFixResult;
/**
 * Add cleanup hook for test data
 */
export declare function addCleanupHook(code: string, cleanupCode: string): DataFixResult;
/**
 * Extract test data patterns from code
 */
export declare function extractTestDataPatterns(code: string): string[];
//# sourceMappingURL=data.d.ts.map