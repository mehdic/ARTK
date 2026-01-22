"use strict";
/**
 * @artk/core-autogen - Deterministic Test Generation Engine
 *
 * Transforms clarified Journey markdown files into Playwright E2E tests.
 *
 * @packageDocumentation
 * @module @artk/core-autogen
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.VERSION = void 0;
exports.generateJourneyTests = generateJourneyTests;
exports.generateTestFromIR = generateTestFromIR;
exports.regenerateTestWithBlocks = regenerateTestWithBlocks;
exports.generateModuleFromIR = generateModuleFromIR;
exports.parseAndNormalize = parseAndNormalize;
exports.validateJourney = validateJourney;
exports.validateJourneys = validateJourneys;
exports.verifyJourney = verifyJourney;
exports.verifyJourneys = verifyJourneys;
// Core types
__exportStar(require("./ir/types.js"), exports);
// IR builders and serialization
__exportStar(require("./ir/builder.js"), exports);
__exportStar(require("./ir/serialize.js"), exports);
// Configuration
__exportStar(require("./config/schema.js"), exports);
__exportStar(require("./config/loader.js"), exports);
// Journey parsing
__exportStar(require("./journey/parseJourney.js"), exports);
__exportStar(require("./journey/normalize.js"), exports);
__exportStar(require("./journey/hintPatterns.js"), exports);
__exportStar(require("./journey/parseHints.js"), exports);
// Mapping
__exportStar(require("./mapping/patterns.js"), exports);
__exportStar(require("./mapping/glossary.js"), exports);
__exportStar(require("./mapping/stepMapper.js"), exports);
// Selectors
__exportStar(require("./selectors/priority.js"), exports);
__exportStar(require("./selectors/infer.js"), exports);
__exportStar(require("./selectors/catalogSchema.js"), exports);
__exportStar(require("./selectors/catalog.js"), exports);
__exportStar(require("./selectors/scanner.js"), exports);
__exportStar(require("./selectors/debt.js"), exports);
// Code generation
__exportStar(require("./codegen/generateTest.js"), exports);
__exportStar(require("./codegen/generateModule.js"), exports);
__exportStar(require("./codegen/astEdit.js"), exports);
__exportStar(require("./codegen/registry.js"), exports);
__exportStar(require("./codegen/blocks.js"), exports);
// Utilities
__exportStar(require("./utils/escaping.js"), exports);
__exportStar(require("./utils/version.js"), exports);
__exportStar(require("./utils/parsing.js"), exports);
__exportStar(require("./utils/result.js"), exports);
// Validation
__exportStar(require("./validate/index.js"), exports);
// Verification
__exportStar(require("./verify/index.js"), exports);
// Healing
__exportStar(require("./heal/index.js"), exports);
// Instance lifecycle
__exportStar(require("./instance/install.js"), exports);
__exportStar(require("./instance/upgrade.js"), exports);
// Main API
const parseJourney_js_1 = require("./journey/parseJourney.js");
const normalize_js_1 = require("./journey/normalize.js");
const generateTest_js_1 = require("./codegen/generateTest.js");
const generateModule_js_1 = require("./codegen/generateModule.js");
const loader_js_1 = require("./config/loader.js");
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
async function generateJourneyTests(options) {
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
                resolvedConfig = (0, loader_js_1.loadConfig)(config);
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
                ? (0, parseJourney_js_1.parseJourney)(journey)
                : (0, parseJourney_js_1.parseJourneyContent)(journey, 'inline');
            // Normalize to IR
            const normalized = (0, normalize_js_1.normalizeJourney)(parsed);
            // Add any mapping warnings
            result.warnings.push(...normalized.warnings);
            // Generate test
            const testResult = (0, generateTest_js_1.generateTest)(normalized.journey, testOptions);
            result.tests.push({
                journeyId: testResult.journeyId,
                filename: testResult.filename,
                code: testResult.code,
            });
            // Generate module if requested
            if (generateModules) {
                const moduleResult = (0, generateModule_js_1.generateModule)(normalized.journey, moduleOptions);
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
function generateTestFromIR(journey, options) {
    return (0, generateTest_js_1.generateTest)(journey, options);
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
function regenerateTestWithBlocks(journey, existingCode, options) {
    return (0, generateTest_js_1.generateTest)(journey, {
        ...options,
        strategy: 'blocks',
        existingCode,
    });
}
/**
 * Generate a single module from an IR Journey
 */
function generateModuleFromIR(journey, options) {
    return (0, generateModule_js_1.generateModule)(journey, options);
}
/**
 * Parse and normalize a journey file
 */
function parseAndNormalize(filePath) {
    const parsed = (0, parseJourney_js_1.parseJourney)(filePath);
    const normalized = (0, normalize_js_1.normalizeJourney)(parsed);
    return {
        journey: normalized.journey,
        warnings: normalized.warnings,
    };
}
/**
 * Version of the autogen engine
 */
exports.VERSION = '1.0.0';
// Validation API
const code_js_1 = require("./validate/code.js");
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
async function validateJourney(journeyInput, options = {}) {
    const { isFilePath = true, runLint = false, ...validationOptions } = options;
    try {
        // Parse journey
        const parsed = isFilePath
            ? (0, parseJourney_js_1.parseJourney)(journeyInput)
            : (0, parseJourney_js_1.parseJourneyContent)(journeyInput, 'inline');
        // Normalize to IR
        const normalized = (0, normalize_js_1.normalizeJourney)(parsed);
        // Generate test code
        const testResult = (0, generateTest_js_1.generateTest)(normalized.journey);
        // Validate the generated code
        const validationResult = runLint
            ? await (0, code_js_1.validateCode)(testResult.code, normalized.journey, parsed.frontmatter, validationOptions)
            : (0, code_js_1.validateCodeSync)(testResult.code, normalized.journey, parsed.frontmatter, validationOptions);
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
async function validateJourneys(journeys, options = {}) {
    const results = new Map();
    for (const journey of journeys) {
        const result = await validateJourney(journey, options);
        results.set(result.journeyId, result);
    }
    return results;
}
// Verification API
const runner_js_1 = require("./verify/runner.js");
const summary_js_1 = require("./verify/summary.js");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const node_os_1 = require("node:os");
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
async function verifyJourney(journeyInput, options = {}) {
    const { isFilePath = true, outputDir, checkStability = false, stabilityRuns = 3, heal = false, maxHealAttempts = 3, ...runnerOptions } = options;
    try {
        // Parse journey
        const parsed = isFilePath
            ? (0, parseJourney_js_1.parseJourney)(journeyInput)
            : (0, parseJourney_js_1.parseJourneyContent)(journeyInput, 'inline');
        const journeyId = parsed.frontmatter.id;
        // Normalize to IR
        const normalized = (0, normalize_js_1.normalizeJourney)(parsed);
        // Generate test code
        const testResult = (0, generateTest_js_1.generateTest)(normalized.journey);
        // Write test to file
        const testDir = outputDir || (0, node_path_1.join)((0, node_os_1.tmpdir)(), `autogen-verify-${Date.now()}`);
        (0, node_fs_1.mkdirSync)(testDir, { recursive: true });
        const testFilePath = (0, node_path_1.join)(testDir, testResult.filename);
        (0, node_fs_1.writeFileSync)(testFilePath, testResult.code, 'utf-8');
        // Run the test
        const runResult = (0, runner_js_1.runPlaywrightSync)({
            ...runnerOptions,
            testFile: testFilePath,
            cwd: testDir,
            repeatEach: checkStability ? stabilityRuns : undefined,
            failOnFlaky: checkStability,
        });
        // Generate summary
        let summary = (0, summary_js_1.generateVerifySummary)(runResult, {
            journeyId,
        });
        let healingResult;
        // Attempt healing if test failed and heal is enabled
        if (heal && summary.status === 'failed') {
            const { runHealingLoop, DEFAULT_HEALING_CONFIG } = await Promise.resolve().then(() => __importStar(require('./heal/index.js')));
            const healResult = await runHealingLoop({
                journeyId,
                testFile: testFilePath,
                outputDir: testDir,
                config: {
                    ...DEFAULT_HEALING_CONFIG,
                    maxAttempts: maxHealAttempts,
                },
                verifyFn: async () => {
                    const rerunResult = (0, runner_js_1.runPlaywrightSync)({
                        ...runnerOptions,
                        testFile: testFilePath,
                        cwd: testDir,
                    });
                    return (0, summary_js_1.generateVerifySummary)(rerunResult, { journeyId });
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
                const finalResult = (0, runner_js_1.runPlaywrightSync)({
                    ...runnerOptions,
                    testFile: testFilePath,
                    cwd: testDir,
                });
                summary = (0, summary_js_1.generateVerifySummary)(finalResult, { journeyId });
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
async function verifyJourneys(journeys, options = {}) {
    const results = new Map();
    for (const journey of journeys) {
        const result = await verifyJourney(journey, options);
        results.set(result.journeyId || journey, result);
    }
    return results;
}
//# sourceMappingURL=index.js.map