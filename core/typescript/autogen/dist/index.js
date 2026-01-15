/**
 * @artk/core-autogen - Deterministic Test Generation Engine
 *
 * Transforms clarified Journey markdown files into Playwright E2E tests.
 *
 * @packageDocumentation
 * @module @artk/core-autogen
 */
// Core types
export * from './ir/types.js';
// IR builders and serialization
export * from './ir/builder.js';
export * from './ir/serialize.js';
// Configuration
export * from './config/schema.js';
export * from './config/loader.js';
// Journey parsing
export * from './journey/parseJourney.js';
export * from './journey/normalize.js';
export * from './journey/hintPatterns.js';
export * from './journey/parseHints.js';
// Mapping
export * from './mapping/patterns.js';
export * from './mapping/glossary.js';
export * from './mapping/stepMapper.js';
// Selectors
export * from './selectors/priority.js';
export * from './selectors/infer.js';
export * from './selectors/catalogSchema.js';
export * from './selectors/catalog.js';
export * from './selectors/scanner.js';
export * from './selectors/debt.js';
// Code generation
export * from './codegen/generateTest.js';
export * from './codegen/generateModule.js';
export * from './codegen/astEdit.js';
export * from './codegen/registry.js';
export * from './codegen/blocks.js';
// Utilities
export * from './utils/escaping.js';
export * from './utils/version.js';
// Validation
export * from './validate/index.js';
// Verification
export * from './verify/index.js';
// Healing
export * from './heal/index.js';
// Instance lifecycle
export * from './instance/install.js';
export * from './instance/upgrade.js';
// Main API
import { parseJourney, parseJourneyContent } from './journey/parseJourney.js';
import { normalizeJourney } from './journey/normalize.js';
import { generateTest } from './codegen/generateTest.js';
import { generateModule } from './codegen/generateModule.js';
import { loadConfig } from './config/loader.js';
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
export async function generateJourneyTests(options) {
    const { journeys, isFilePaths = true, config, generateModules = false, testOptions = {}, moduleOptions = {}, } = options;
    const result = {
        tests: [],
        modules: [],
        warnings: [],
        errors: [],
    };
    // Load config if provided (reserved for future use)
    let resolvedConfig;
    void resolvedConfig; // Reserved for future path resolution
    if (config) {
        if (typeof config === 'string') {
            try {
                resolvedConfig = loadConfig(config);
            }
            catch (err) {
                result.errors.push(`Failed to load config: ${err instanceof Error ? err.message : String(err)}`);
            }
        }
        else {
            resolvedConfig = config;
        }
    }
    // Process each journey
    for (const journey of journeys) {
        try {
            // Parse journey
            const parsed = isFilePaths
                ? parseJourney(journey)
                : parseJourneyContent(journey, 'inline');
            // Normalize to IR
            const normalized = normalizeJourney(parsed);
            // Add any mapping warnings
            result.warnings.push(...normalized.warnings);
            // Generate test
            const testResult = generateTest(normalized.journey, testOptions);
            result.tests.push({
                journeyId: testResult.journeyId,
                filename: testResult.filename,
                code: testResult.code,
            });
            // Generate module if requested
            if (generateModules) {
                const moduleResult = generateModule(normalized.journey, moduleOptions);
                result.modules.push({
                    moduleName: moduleResult.moduleName,
                    filename: moduleResult.filename,
                    code: moduleResult.code,
                });
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            result.errors.push(`Failed to process journey ${journey}: ${errorMessage}`);
        }
    }
    return result;
}
/**
 * Generate a single test from an IR Journey
 */
export function generateTestFromIR(journey, options) {
    return generateTest(journey, options);
}
/**
 * Regenerate a test using managed blocks strategy
 *
 * This preserves user code outside of ARTK:BEGIN/END GENERATED markers
 * while updating the generated portions.
 *
 * @example
 * ```typescript
 * import { regenerateTestWithBlocks, parseAndNormalize } from '@artk/core-autogen';
 *
 * const { journey } = parseAndNormalize('journeys/login.md');
 * const existingCode = readFileSync('tests/login.spec.ts', 'utf-8');
 *
 * const result = regenerateTestWithBlocks(journey, existingCode);
 * writeFileSync('tests/login.spec.ts', result.code);
 *
 * // User code outside ARTK markers is preserved
 * // Generated code inside markers is updated
 * ```
 */
export function regenerateTestWithBlocks(journey, existingCode, options) {
    return generateTest(journey, {
        ...options,
        strategy: 'blocks',
        existingCode,
    });
}
/**
 * Generate a single module from an IR Journey
 */
export function generateModuleFromIR(journey, options) {
    return generateModule(journey, options);
}
/**
 * Parse and normalize a journey file
 */
export function parseAndNormalize(filePath) {
    const parsed = parseJourney(filePath);
    const normalized = normalizeJourney(parsed);
    return {
        journey: normalized.journey,
        warnings: normalized.warnings,
    };
}
/**
 * Version of the autogen engine
 */
export const VERSION = '1.0.0';
// Validation API
import { validateCode, validateCodeSync, } from './validate/code.js';
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
export async function validateJourney(journeyInput, options = {}) {
    const { isFilePath = true, runLint = false, ...validationOptions } = options;
    try {
        // Parse journey
        const parsed = isFilePath
            ? parseJourney(journeyInput)
            : parseJourneyContent(journeyInput, 'inline');
        // Normalize to IR
        const normalized = normalizeJourney(parsed);
        // Generate test code
        const testResult = generateTest(normalized.journey);
        // Validate the generated code
        const validationResult = runLint
            ? await validateCode(testResult.code, normalized.journey, parsed.frontmatter, validationOptions)
            : validateCodeSync(testResult.code, normalized.journey, parsed.frontmatter, validationOptions);
        return {
            ...validationResult,
            generatedCode: testResult.code,
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            valid: false,
            journeyId: options.journeyId || 'unknown',
            issues: [
                {
                    code: 'JOURNEY_PARSE_ERROR',
                    message: `Failed to parse or generate: ${errorMessage}`,
                    severity: 'error',
                },
            ],
            counts: { errors: 1, warnings: 0, info: 0 },
            details: {
                patterns: { valid: false, violationCount: 0 },
            },
            timestamp: new Date().toISOString(),
        };
    }
}
/**
 * Validate multiple journeys
 */
export async function validateJourneys(journeys, options = {}) {
    const results = new Map();
    for (const journey of journeys) {
        const result = await validateJourney(journey, options);
        results.set(result.journeyId, result);
    }
    return results;
}
// Verification API
import { runPlaywrightSync, } from './verify/runner.js';
import { generateVerifySummary, } from './verify/summary.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
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
export async function verifyJourney(journeyInput, options = {}) {
    const { isFilePath = true, outputDir, checkStability = false, stabilityRuns = 3, heal = false, maxHealAttempts = 3, ...runnerOptions } = options;
    try {
        // Parse journey
        const parsed = isFilePath
            ? parseJourney(journeyInput)
            : parseJourneyContent(journeyInput, 'inline');
        const journeyId = parsed.frontmatter.id;
        // Normalize to IR
        const normalized = normalizeJourney(parsed);
        // Generate test code
        const testResult = generateTest(normalized.journey);
        // Write test to file
        const testDir = outputDir || join(tmpdir(), `autogen-verify-${Date.now()}`);
        mkdirSync(testDir, { recursive: true });
        const testFilePath = join(testDir, testResult.filename);
        writeFileSync(testFilePath, testResult.code, 'utf-8');
        // Run the test
        const runResult = runPlaywrightSync({
            ...runnerOptions,
            testFile: testFilePath,
            cwd: testDir,
            repeatEach: checkStability ? stabilityRuns : undefined,
            failOnFlaky: checkStability,
        });
        // Generate summary
        let summary = generateVerifySummary(runResult, {
            journeyId,
        });
        let healingResult;
        // Attempt healing if test failed and heal is enabled
        if (heal && summary.status === 'failed') {
            const { runHealingLoop, DEFAULT_HEALING_CONFIG } = await import('./heal/index.js');
            const healResult = await runHealingLoop({
                journeyId,
                testFile: testFilePath,
                outputDir: testDir,
                config: {
                    ...DEFAULT_HEALING_CONFIG,
                    maxAttempts: maxHealAttempts,
                },
                verifyFn: async () => {
                    const rerunResult = runPlaywrightSync({
                        ...runnerOptions,
                        testFile: testFilePath,
                        cwd: testDir,
                    });
                    return generateVerifySummary(rerunResult, { journeyId });
                },
            });
            healingResult = {
                attempted: true,
                success: healResult.success,
                attempts: healResult.attempts,
                appliedFix: healResult.appliedFix,
                logPath: healResult.logPath,
            };
            // If healed, update summary
            if (healResult.success) {
                const finalResult = runPlaywrightSync({
                    ...runnerOptions,
                    testFile: testFilePath,
                    cwd: testDir,
                });
                summary = generateVerifySummary(finalResult, { journeyId });
            }
        }
        return {
            ...summary,
            generatedCode: testResult.code,
            testFilePath,
            healing: healingResult,
        };
    }
    catch {
        return {
            status: 'error',
            journeyId: options.journeyId,
            timestamp: new Date().toISOString(),
            duration: 0,
            counts: { total: 0, passed: 0, failed: 0, skipped: 0, flaky: 0 },
            failures: {
                tests: [],
                classifications: {},
                stats: {},
            },
            runner: { exitCode: 1, command: '' },
        };
    }
}
/**
 * Verify multiple journeys
 */
export async function verifyJourneys(journeys, options = {}) {
    const results = new Map();
    for (const journey of journeys) {
        const result = await verifyJourney(journey, options);
        results.set(result.journeyId || journey, result);
    }
    return results;
}
//# sourceMappingURL=index.js.map