"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runHealingLoop = runHealingLoop;
exports.previewHealingFixes = previewHealingFixes;
exports.wouldFixApply = wouldFixApply;
/**
 * Bounded Healing Loop Controller - Orchestrate healing attempts
 * @see T067 - Implement bounded healing loop controller
 */
const node_fs_1 = require("node:fs");
const rules_js_1 = require("./rules.js");
const logger_js_1 = require("./logger.js");
const selector_js_1 = require("./fixes/selector.js");
const navigation_js_1 = require("./fixes/navigation.js");
const timing_js_1 = require("./fixes/timing.js");
/**
 * Apply a specific fix to code
 */
function applyFix(code, fixType, context) {
    const { lineNumber, errorMessage, ariaInfo } = context;
    switch (fixType) {
        case 'selector-refine':
            return (0, selector_js_1.applySelectorFix)({
                code,
                lineNumber,
                selector: '', // Will be extracted from code
                errorMessage,
                ariaInfo: ariaInfo,
            });
        case 'add-exact':
            return (0, selector_js_1.addExactToLocator)(code);
        case 'missing-await':
            return (0, timing_js_1.fixMissingAwait)(code);
        case 'navigation-wait':
            return (0, navigation_js_1.applyNavigationFix)({
                code,
                lineNumber,
                errorMessage,
            });
        case 'web-first-assertion':
            return (0, timing_js_1.convertToWebFirstAssertion)(code);
        case 'timeout-increase':
            return (0, timing_js_1.applyTimingFix)({
                code,
                lineNumber,
                errorMessage,
            });
        default:
            return {
                applied: false,
                code,
                description: `Unknown fix type: ${fixType}`,
            };
    }
}
/**
 * Extract line number from verification summary
 */
function extractLineNumber(summary) {
    // Try to extract from first failure test name or error message
    const firstTest = summary.failures.tests[0];
    if (firstTest) {
        // Try to extract line number from error message patterns like:
        // "at /path/to/file.ts:42:10"
        // "Error: ... at line 42"
        const lineMatch = firstTest.match(/:(\d+)(?::\d+)?(?:\)|$)/);
        if (lineMatch) {
            return parseInt(lineMatch[1], 10);
        }
        // Try "at line N" pattern
        const atLineMatch = firstTest.match(/at line (\d+)/i);
        if (atLineMatch) {
            return parseInt(atLineMatch[1], 10);
        }
    }
    // Check classifications for error messages
    for (const [, classification] of Object.entries(summary.failures.classifications)) {
        if (classification && typeof classification === 'object' && 'explanation' in classification) {
            const explanation = classification.explanation;
            const lineMatch = explanation.match(/:(\d+)(?::\d+)?/);
            if (lineMatch) {
                return parseInt(lineMatch[1], 10);
            }
        }
    }
    // Default to line 1 if we can't determine
    return 1;
}
/**
 * Extract failure classification from verification summary
 */
function extractClassification(summary) {
    const classifications = summary.failures.classifications;
    const firstKey = Object.keys(classifications)[0];
    if (firstKey && classifications[firstKey]) {
        return classifications[firstKey];
    }
    return null;
}
/**
 * Run the bounded healing loop
 */
async function runHealingLoop(options) {
    const { journeyId, testFile, outputDir, config = rules_js_1.DEFAULT_HEALING_CONFIG, verifyFn, ariaInfo, } = options;
    // Initialize logger
    const logger = new logger_js_1.HealingLogger(journeyId, outputDir, config.maxAttempts);
    const attemptedFixes = [];
    // Read original code
    if (!(0, node_fs_1.existsSync)(testFile)) {
        logger.markFailed('Test file not found');
        return {
            success: false,
            status: 'failed',
            attempts: 0,
            logPath: logger.getOutputPath(),
            recommendation: 'Test file not found',
        };
    }
    let currentCode = (0, node_fs_1.readFileSync)(testFile, 'utf-8');
    let lastSummary = null;
    // Initial verification to get failure info
    try {
        lastSummary = await verifyFn();
        if (lastSummary.status === 'passed') {
            logger.markHealed();
            return {
                success: true,
                status: 'healed',
                attempts: 0,
                logPath: logger.getOutputPath(),
            };
        }
    }
    catch (error) {
        logger.markFailed(`Initial verification failed: ${error}`);
        return {
            success: false,
            status: 'failed',
            attempts: 0,
            logPath: logger.getOutputPath(),
            recommendation: 'Initial verification failed',
        };
    }
    // Get classification from initial failure
    const classification = extractClassification(lastSummary);
    if (!classification) {
        logger.markFailed('Unable to classify failure');
        return {
            success: false,
            status: 'failed',
            attempts: 0,
            logPath: logger.getOutputPath(),
            recommendation: 'Unable to classify failure for healing',
        };
    }
    // Check if healable
    const evaluation = (0, rules_js_1.evaluateHealing)(classification, config);
    if (!evaluation.canHeal) {
        logger.markFailed(evaluation.reason);
        return {
            success: false,
            status: 'not_healable',
            attempts: 0,
            logPath: logger.getOutputPath(),
            recommendation: evaluation.reason,
        };
    }
    // Healing loop
    while (!logger.isMaxAttemptsReached()) {
        const attemptNumber = logger.getAttemptCount() + 1;
        const startTime = Date.now();
        // Get next fix to try
        const nextFix = (0, rules_js_1.getNextFix)(classification, attemptedFixes, config);
        if (!nextFix) {
            logger.markExhausted((0, rules_js_1.getPostHealingRecommendation)(classification, attemptNumber));
            return {
                success: false,
                status: 'exhausted',
                attempts: attemptNumber - 1,
                logPath: logger.getOutputPath(),
                recommendation: (0, rules_js_1.getPostHealingRecommendation)(classification, attemptNumber),
            };
        }
        attemptedFixes.push(nextFix);
        // Apply the fix
        const fixResult = applyFix(currentCode, nextFix, {
            lineNumber: extractLineNumber(lastSummary),
            errorMessage: lastSummary.failures.tests[0] || '',
            classification,
            ariaInfo,
        });
        if (!fixResult.applied) {
            // Log skipped attempt
            logger.logAttempt({
                attempt: attemptNumber,
                failureType: classification.category,
                fixType: nextFix,
                file: testFile,
                change: fixResult.description,
                evidence: [],
                result: 'fail',
                errorMessage: 'Fix not applied',
                duration: Date.now() - startTime,
            });
            continue;
        }
        // Write fixed code
        (0, node_fs_1.writeFileSync)(testFile, fixResult.code, 'utf-8');
        currentCode = fixResult.code;
        // Verify the fix
        try {
            lastSummary = await verifyFn();
            const attempt = {
                attempt: attemptNumber,
                failureType: classification.category,
                fixType: nextFix,
                file: testFile,
                change: fixResult.description,
                evidence: lastSummary.reportPath ? [lastSummary.reportPath] : [],
                result: lastSummary.status === 'passed' ? 'pass' : 'fail',
                duration: Date.now() - startTime,
            };
            if (lastSummary.status !== 'passed') {
                attempt.errorMessage = lastSummary.failures.tests[0] || 'Unknown error';
                // Re-classify after failed attempt - failure category may have changed
                const newClassification = extractClassification(lastSummary);
                if (newClassification && newClassification.category !== classification.category) {
                    // Update classification for next iteration
                    Object.assign(classification, newClassification);
                }
            }
            logger.logAttempt(attempt);
            if (lastSummary.status === 'passed') {
                logger.markHealed();
                return {
                    success: true,
                    status: 'healed',
                    attempts: attemptNumber,
                    appliedFix: nextFix,
                    logPath: logger.getOutputPath(),
                    modifiedCode: currentCode,
                };
            }
        }
        catch (error) {
            logger.logAttempt({
                attempt: attemptNumber,
                failureType: classification.category,
                fixType: nextFix,
                file: testFile,
                change: fixResult.description,
                evidence: [],
                result: 'error',
                errorMessage: String(error),
                duration: Date.now() - startTime,
            });
        }
    }
    // Max attempts reached
    logger.markExhausted((0, rules_js_1.getPostHealingRecommendation)(classification, config.maxAttempts));
    return {
        success: false,
        status: 'exhausted',
        attempts: config.maxAttempts,
        logPath: logger.getOutputPath(),
        recommendation: (0, rules_js_1.getPostHealingRecommendation)(classification, config.maxAttempts),
    };
}
/**
 * Dry run healing to preview fixes without applying
 */
function previewHealingFixes(code, classification, config = rules_js_1.DEFAULT_HEALING_CONFIG) {
    const previews = [];
    const evaluation = (0, rules_js_1.evaluateHealing)(classification, config);
    if (!evaluation.canHeal) {
        return previews;
    }
    for (const fixType of evaluation.applicableFixes) {
        const result = applyFix(code, fixType, {
            lineNumber: 1,
            errorMessage: '',
            classification,
        });
        if (result.applied) {
            previews.push({
                fixType,
                preview: result.description,
                confidence: 0.5, // Could be enhanced with actual confidence scores
            });
        }
    }
    return previews;
}
/**
 * Check if a specific fix type would apply to code
 */
function wouldFixApply(code, fixType, classification) {
    const result = applyFix(code, fixType, {
        lineNumber: 1,
        errorMessage: '',
        classification,
    });
    return result.applied;
}
//# sourceMappingURL=loop.js.map