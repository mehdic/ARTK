"use strict";
/**
 * Reporter Configuration Helper (T104)
 *
 * Generates Playwright reporter configurations from ARTK config.
 *
 * @module harness/reporters
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReporterConfig = getReporterConfig;
exports.getReporterConfigFromOptions = getReporterConfigFromOptions;
exports.getMinimalReporterConfig = getMinimalReporterConfig;
exports.getCIReporterConfig = getCIReporterConfig;
exports.mergeReporterConfigs = mergeReporterConfigs;
exports.hasReporter = hasReporter;
// =============================================================================
// Constants
// =============================================================================
/**
 * Default reporter settings when not configured
 */
const DEFAULT_REPORTER_OPTIONS = {
    html: true,
    htmlOutputFolder: 'playwright-report',
    htmlOpen: 'on-failure',
    json: false,
    jsonOutputFile: 'test-results/results.json',
    junit: false,
    junitOutputFile: 'test-results/junit.xml',
    artk: false,
    artkOutputFile: 'test-results/artk-report.json',
    includeJourneyMapping: true,
    list: true,
    dot: false,
};
// =============================================================================
// Reporter Configuration Factory
// =============================================================================
/**
 * Generate Playwright reporter configuration from ARTK config
 *
 * Creates an array of reporter descriptions based on the reporters
 * section in artk.config.yml.
 *
 * @param config - ARTK configuration
 * @returns Array of Playwright reporter descriptions
 *
 * @example
 * ```typescript
 * import { loadConfig } from '@artk/core/config';
 * import { getReporterConfig } from '@artk/core/harness';
 *
 * const { config } = loadConfig();
 * const reporters = getReporterConfig(config);
 * // [['html', {...}], ['json', {...}], ...]
 * ```
 */
function getReporterConfig(config) {
    const reporters = [];
    const reportersConfig = config.reporters;
    // Always add list reporter for console output (unless disabled)
    reporters.push(['list']);
    // HTML Reporter
    if (reportersConfig.html?.enabled) {
        const htmlReporter = [
            'html',
            {
                outputFolder: reportersConfig.html.outputFolder,
                open: reportersConfig.html.open,
            },
        ];
        reporters.push(htmlReporter);
    }
    // JSON Reporter
    if (reportersConfig.json?.enabled) {
        const jsonReporter = [
            'json',
            {
                outputFile: reportersConfig.json.outputFile,
            },
        ];
        reporters.push(jsonReporter);
    }
    // JUnit Reporter
    if (reportersConfig.junit?.enabled) {
        const junitReporter = [
            'junit',
            {
                outputFile: reportersConfig.junit.outputFile,
            },
        ];
        reporters.push(junitReporter);
    }
    // ARTK Reporter (custom reporter for journey mapping)
    if (reportersConfig.artk?.enabled) {
        const artkReporter = [
            './reporters/artk-reporter.ts',
            {
                outputFile: reportersConfig.artk.outputFile,
                includeJourneyMapping: reportersConfig.artk.includeJourneyMapping,
            },
        ];
        reporters.push(artkReporter);
    }
    return reporters;
}
/**
 * Generate reporter configuration from options object
 *
 * Alternative to using ARTK config, useful for testing or custom setups.
 *
 * @param options - Reporter configuration options
 * @returns Array of Playwright reporter descriptions
 */
function getReporterConfigFromOptions(options = {}) {
    const mergedOptions = { ...DEFAULT_REPORTER_OPTIONS, ...options };
    const reporters = [];
    // Console reporters
    if (mergedOptions.list) {
        reporters.push(['list']);
    }
    else if (mergedOptions.dot) {
        reporters.push(['dot']);
    }
    // HTML Reporter
    if (mergedOptions.html) {
        reporters.push([
            'html',
            {
                outputFolder: mergedOptions.htmlOutputFolder,
                open: mergedOptions.htmlOpen,
            },
        ]);
    }
    // JSON Reporter
    if (mergedOptions.json) {
        reporters.push([
            'json',
            {
                outputFile: mergedOptions.jsonOutputFile,
            },
        ]);
    }
    // JUnit Reporter
    if (mergedOptions.junit) {
        reporters.push([
            'junit',
            {
                outputFile: mergedOptions.junitOutputFile,
            },
        ]);
    }
    // ARTK Reporter
    if (mergedOptions.artk) {
        reporters.push([
            './reporters/artk-reporter.ts',
            {
                outputFile: mergedOptions.artkOutputFile,
                includeJourneyMapping: mergedOptions.includeJourneyMapping,
            },
        ]);
    }
    return reporters;
}
/**
 * Create minimal reporter configuration
 *
 * Returns just the list reporter for quick local development.
 *
 * @returns Minimal reporter array
 */
function getMinimalReporterConfig() {
    return [['list']];
}
/**
 * Create CI-optimized reporter configuration
 *
 * Includes JUnit for CI integration and JSON for processing.
 *
 * @param junitPath - Path for JUnit output
 * @param jsonPath - Path for JSON output
 * @returns CI-optimized reporter array
 */
function getCIReporterConfig(junitPath = 'test-results/junit.xml', jsonPath = 'test-results/results.json') {
    return [
        ['dot'], // Minimal console output for CI
        ['junit', { outputFile: junitPath }],
        ['json', { outputFile: jsonPath }],
    ];
}
/**
 * Merge reporter configurations
 *
 * Combines multiple reporter arrays, deduplicating by reporter type.
 *
 * @param configs - Reporter arrays to merge
 * @returns Merged reporter array
 */
function mergeReporterConfigs(...configs) {
    const seen = new Map();
    for (const config of configs) {
        for (const reporter of config) {
            const type = Array.isArray(reporter) ? reporter[0] : String(reporter);
            // Later configs override earlier ones
            seen.set(type, reporter);
        }
    }
    return Array.from(seen.values());
}
/**
 * Check if a reporter type is enabled in the configuration
 *
 * @param reporters - Reporter array to check
 * @param type - Reporter type (e.g., 'html', 'json')
 * @returns True if the reporter type is in the array
 */
function hasReporter(reporters, type) {
    return reporters.some((r) => {
        const reporterType = Array.isArray(r) ? r[0] : String(r);
        return reporterType === type || (typeof reporterType === 'string' && reporterType.includes(type));
    });
}
//# sourceMappingURL=reporters.js.map