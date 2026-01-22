/**
 * ARTK custom reporter for Playwright
 *
 * This reporter maps test results to Journey definitions and generates
 * ARTK-specific reports with journey status aggregation.
 *
 * @module reporters/artk-reporter
 */
import type { FullConfig, FullResult, Reporter, Suite, TestCase, TestResult } from '@playwright/test/reporter';
import type { ARTKReport, ARTKReporterOptions, JourneyTestMapping } from './types.js';
/**
 * ARTK Reporter implementation
 *
 * Usage in playwright.config.ts:
 * ```typescript
 * import { ARTKReporter } from '@artk/core/reporters';
 *
 * export default defineConfig({
 *   reporter: [
 *     ['@artk/core/reporters', {
 *       outputFile: './test-results/artk-report.json',
 *       includeJourneyMapping: true
 *     }]
 *   ]
 * });
 * ```
 */
export declare class ARTKReporter implements Reporter {
    private readonly options;
    private readonly testMappings;
    private startTime;
    private endTime;
    constructor(options: ARTKReporterOptions);
    /**
     * Called once before running tests
     */
    onBegin(_config: FullConfig, _suite: Suite): void;
    /**
     * Called for each test after it finishes
     */
    onTestEnd(test: TestCase, result: TestResult): void;
    /**
     * Called after all tests finish
     */
    onEnd(result: FullResult): Promise<void>;
    /**
     * Generate ARTK report from collected test mappings
     */
    private generateARTKReport;
    /**
     * Create run summary from full result
     */
    private createRunSummary;
    /**
     * Create journey reports from test mappings
     */
    private createJourneyReports;
    /**
     * Write ARTK report to file
     */
    private writeARTKReport;
    /**
     * Print summary to console
     */
    private printSummary;
}
/**
 * Generate ARTK report from test mappings (standalone function)
 *
 * @param mappings - Array of journey test mappings
 * @param includeJourneyMapping - Whether to include journey mapping
 * @returns ARTK report
 */
export declare function generateARTKReport(mappings: readonly JourneyTestMapping[], includeJourneyMapping?: boolean): ARTKReport;
/**
 * Write ARTK report to file (standalone function)
 *
 * @param report - ARTK report
 * @param outputFile - Output file path
 * @returns Promise that resolves when report is written
 */
export declare function writeARTKReport(report: ARTKReport, outputFile: string): Promise<void>;
//# sourceMappingURL=artk-reporter.d.ts.map