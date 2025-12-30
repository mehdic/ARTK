/**
 * ARTK custom reporter for Playwright
 *
 * This reporter maps test results to Journey definitions and generates
 * ARTK-specific reports with journey status aggregation.
 *
 * @module reporters/artk-reporter
 */

import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';
import type {
  ARTKReport,
  ARTKReporterOptions,
  JourneyTestMapping,
  RunSummary,
} from './types.js';
import {
  createJourneyReport,
  groupTestsByJourney,
  mapTestToJourney,
} from './journey-reporter.js';
import { promises as fs } from 'fs';
import { dirname } from 'path';

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
export class ARTKReporter implements Reporter {
  // Note: config is stored for future use (filtering, metadata, etc.)
  // Currently not used but kept for API compatibility
  // private _config: FullConfig | undefined;

  private readonly options: ARTKReporterOptions;
  private readonly testMappings: JourneyTestMapping[] = [];
  private startTime: number = 0;
  private endTime: number = 0;

  constructor(options: ARTKReporterOptions) {
    this.options = options;
  }

  /**
   * Called once before running tests
   */
  onBegin(_config: FullConfig, _suite: Suite): void {
    // this._config = config; // Stored for future use
    this.startTime = Date.now();
  }

  /**
   * Called for each test after it finishes
   */
  onTestEnd(test: TestCase, result: TestResult): void {
    const mapping = mapTestToJourney(test, result);
    this.testMappings.push(mapping);
  }

  /**
   * Called after all tests finish
   */
  async onEnd(result: FullResult): Promise<void> {
    this.endTime = Date.now();

    const report = this.generateARTKReport(result);
    await this.writeARTKReport(report);
  }

  /**
   * Generate ARTK report from collected test mappings
   */
  private generateARTKReport(result: FullResult): ARTKReport {
    const summary = this.createRunSummary(result);
    const { journeys, unmappedTests } = this.createJourneyReports();

    return {
      timestamp: new Date().toISOString(),
      summary,
      journeys,
      unmappedTests,
    };
  }

  /**
   * Create run summary from full result
   */
  private createRunSummary(result: FullResult): RunSummary {
    let totalTests = 0;
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    let flaky = 0;

    for (const mapping of this.testMappings) {
      totalTests++;

      if (mapping.status === 'passed') {
        if (mapping.retries > 0) {
          flaky++;
        } else {
          passed++;
        }
      } else if (mapping.status === 'failed' || mapping.status === 'timedOut' || mapping.status === 'interrupted') {
        failed++;
      } else if (mapping.status === 'skipped') {
        skipped++;
      }
    }

    return {
      totalTests,
      passed,
      failed,
      skipped,
      flaky,
      duration: this.endTime - this.startTime,
      status: result.status,
    };
  }

  /**
   * Create journey reports from test mappings
   */
  private createJourneyReports(): {
    journeys: readonly ReturnType<typeof createJourneyReport>[];
    unmappedTests: readonly JourneyTestMapping[];
  } {
    if (!this.options.includeJourneyMapping) {
      return {
        journeys: [],
        unmappedTests: [],
      };
    }

    // Group tests by journey
    const grouped = groupTestsByJourney(this.testMappings);

    const journeys: ReturnType<typeof createJourneyReport>[] = [];
    const unmappedTests: JourneyTestMapping[] = [];

    for (const entry of Array.from(grouped.entries())) {
      const [journeyId, tests] = entry;
      if (journeyId === 'UNMAPPED') {
        unmappedTests.push(...tests);
      } else {
        journeys.push(createJourneyReport(journeyId, tests));
      }
    }

    return {
      journeys,
      unmappedTests,
    };
  }

  /**
   * Write ARTK report to file
   */
  private async writeARTKReport(report: ARTKReport): Promise<void> {
    const outputFile = this.options.outputFile;

    // Ensure output directory exists
    const outputDir = dirname(outputFile);
    await fs.mkdir(outputDir, { recursive: true });

    // Write report as JSON
    const reportJson = JSON.stringify(report, null, 2);
    await fs.writeFile(outputFile, reportJson, 'utf-8');

    // eslint-disable-next-line no-console
    console.log(`\nARTK report written to: ${outputFile}`);
    this.printSummary(report);
  }

  /**
   * Print summary to console
   */
  private printSummary(report: ARTKReport): void {
    const { summary, journeys } = report;

    // eslint-disable-next-line no-console
    console.log('\n=== ARTK Test Summary ===');
    // eslint-disable-next-line no-console
    console.log(`Total Tests: ${summary.totalTests}`);
    // eslint-disable-next-line no-console
    console.log(`Passed: ${summary.passed}`);
    // eslint-disable-next-line no-console
    console.log(`Failed: ${summary.failed}`);
    // eslint-disable-next-line no-console
    console.log(`Skipped: ${summary.skipped}`);
    // eslint-disable-next-line no-console
    console.log(`Flaky: ${summary.flaky}`);
    // eslint-disable-next-line no-console
    console.log(`Duration: ${(summary.duration / 1000).toFixed(2)}s`);
    // eslint-disable-next-line no-console
    console.log(`Status: ${summary.status}`);

    if (journeys.length > 0) {
      // eslint-disable-next-line no-console
      console.log('\n=== Journey Results ===');
      for (const journey of journeys) {
        const statusIcon = journey.status === 'passed' ? '✓' : journey.status === 'failed' ? '✗' : '○';
        // eslint-disable-next-line no-console
        console.log(
          `${statusIcon} ${journey.journeyId}: ${journey.passedTests}/${journey.totalTests} passed (${journey.status})`
        );
      }
    }

    // eslint-disable-next-line no-console
    console.log('');
  }
}

/**
 * Generate ARTK report from test mappings (standalone function)
 *
 * @param mappings - Array of journey test mappings
 * @param includeJourneyMapping - Whether to include journey mapping
 * @returns ARTK report
 */
export function generateARTKReport(
  mappings: readonly JourneyTestMapping[],
  includeJourneyMapping: boolean = true
): ARTKReport {
  const summary = createStandaloneSummary(mappings);
  const { journeys, unmappedTests } = createStandaloneJourneyReports(mappings, includeJourneyMapping);

  return {
    timestamp: new Date().toISOString(),
    summary,
    journeys,
    unmappedTests,
  };
}

/**
 * Create run summary from mappings (standalone)
 */
function createStandaloneSummary(mappings: readonly JourneyTestMapping[]): RunSummary {
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  let flaky = 0;
  let totalDuration = 0;

  for (const mapping of mappings) {
    totalDuration += mapping.duration;

    if (mapping.status === 'passed') {
      if (mapping.retries > 0) {
        flaky++;
      } else {
        passed++;
      }
    } else if (mapping.status === 'failed' || mapping.status === 'timedOut' || mapping.status === 'interrupted') {
      failed++;
    } else if (mapping.status === 'skipped') {
      skipped++;
    }
  }

  return {
    totalTests: mappings.length,
    passed,
    failed,
    skipped,
    flaky,
    duration: totalDuration,
    status: failed > 0 ? 'failed' : 'passed',
  };
}

/**
 * Create journey reports (standalone)
 */
function createStandaloneJourneyReports(
  mappings: readonly JourneyTestMapping[],
  includeJourneyMapping: boolean
): {
  journeys: readonly ReturnType<typeof createJourneyReport>[];
  unmappedTests: readonly JourneyTestMapping[];
} {
  if (!includeJourneyMapping) {
    return {
      journeys: [],
      unmappedTests: [],
    };
  }

  const grouped = groupTestsByJourney(mappings);
  const journeys: ReturnType<typeof createJourneyReport>[] = [];
  const unmappedTests: JourneyTestMapping[] = [];

  for (const entry of Array.from(grouped.entries())) {
    const [journeyId, tests] = entry;
    if (journeyId === 'UNMAPPED') {
      unmappedTests.push(...tests);
    } else {
      journeys.push(createJourneyReport(journeyId, tests));
    }
  }

  return {
    journeys,
    unmappedTests,
  };
}

/**
 * Write ARTK report to file (standalone function)
 *
 * @param report - ARTK report
 * @param outputFile - Output file path
 * @returns Promise that resolves when report is written
 */
export async function writeARTKReport(report: ARTKReport, outputFile: string): Promise<void> {
  const outputDir = dirname(outputFile);
  await fs.mkdir(outputDir, { recursive: true });

  const reportJson = JSON.stringify(report, null, 2);
  await fs.writeFile(outputFile, reportJson, 'utf-8');
}
