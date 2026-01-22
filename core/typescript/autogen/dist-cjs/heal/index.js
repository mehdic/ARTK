"use strict";
/**
 * Healing Module Exports
 * @see Phase 6 - User Story 4: Developer Heals Failing Tests Safely
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRunIdVariable = exports.hasDataIsolation = exports.generateRunId = exports.wrapWithExpectPoll = exports.wrapWithExpectToPass = exports.applyTimingFix = exports.addTimeout = exports.convertToWebFirstAssertion = exports.fixMissingAwait = exports.suggestTimeoutIncrease = exports.extractTimeoutFromError = exports.addNavigationWaitAfterClick = exports.fixMissingGotoAwait = exports.applyNavigationFix = exports.insertNavigationWait = exports.generateToHaveURL = exports.generateWaitForURL = exports.inferUrlPattern = exports.extractUrlFromGoto = exports.extractUrlFromError = exports.hasNavigationWait = exports.addExactToLocator = exports.applySelectorFix = exports.generateTestIdLocator = exports.generateTextLocator = exports.generateLabelLocator = exports.generateRoleLocator = exports.extractNameFromSelector = exports.inferRoleFromSelector = exports.containsCSSSelector = exports.extractCSSSelector = exports.wouldFixApply = exports.previewHealingFixes = exports.runHealingLoop = exports.aggregateHealingLogs = exports.createHealingReport = exports.formatHealingLog = exports.loadHealingLog = exports.HealingLogger = exports.getPostHealingRecommendation = exports.getHealingRecommendation = exports.isFixForbidden = exports.isFixAllowed = exports.getNextFix = exports.evaluateHealing = exports.getApplicableRules = exports.isCategoryHealable = exports.UNHEALABLE_CATEGORIES = exports.DEFAULT_HEALING_CONFIG = exports.DEFAULT_HEALING_RULES = void 0;
exports.extractTestDataPatterns = exports.addCleanupHook = exports.applyDataFix = exports.replaceHardcodedTestData = exports.replaceHardcodedEmail = exports.namespaceName = exports.namespaceEmail = void 0;
// Rules
var rules_js_1 = require("./rules.js");
Object.defineProperty(exports, "DEFAULT_HEALING_RULES", { enumerable: true, get: function () { return rules_js_1.DEFAULT_HEALING_RULES; } });
Object.defineProperty(exports, "DEFAULT_HEALING_CONFIG", { enumerable: true, get: function () { return rules_js_1.DEFAULT_HEALING_CONFIG; } });
Object.defineProperty(exports, "UNHEALABLE_CATEGORIES", { enumerable: true, get: function () { return rules_js_1.UNHEALABLE_CATEGORIES; } });
Object.defineProperty(exports, "isCategoryHealable", { enumerable: true, get: function () { return rules_js_1.isCategoryHealable; } });
Object.defineProperty(exports, "getApplicableRules", { enumerable: true, get: function () { return rules_js_1.getApplicableRules; } });
Object.defineProperty(exports, "evaluateHealing", { enumerable: true, get: function () { return rules_js_1.evaluateHealing; } });
Object.defineProperty(exports, "getNextFix", { enumerable: true, get: function () { return rules_js_1.getNextFix; } });
Object.defineProperty(exports, "isFixAllowed", { enumerable: true, get: function () { return rules_js_1.isFixAllowed; } });
Object.defineProperty(exports, "isFixForbidden", { enumerable: true, get: function () { return rules_js_1.isFixForbidden; } });
Object.defineProperty(exports, "getHealingRecommendation", { enumerable: true, get: function () { return rules_js_1.getHealingRecommendation; } });
Object.defineProperty(exports, "getPostHealingRecommendation", { enumerable: true, get: function () { return rules_js_1.getPostHealingRecommendation; } });
// Logger
var logger_js_1 = require("./logger.js");
Object.defineProperty(exports, "HealingLogger", { enumerable: true, get: function () { return logger_js_1.HealingLogger; } });
Object.defineProperty(exports, "loadHealingLog", { enumerable: true, get: function () { return logger_js_1.loadHealingLog; } });
Object.defineProperty(exports, "formatHealingLog", { enumerable: true, get: function () { return logger_js_1.formatHealingLog; } });
Object.defineProperty(exports, "createHealingReport", { enumerable: true, get: function () { return logger_js_1.createHealingReport; } });
Object.defineProperty(exports, "aggregateHealingLogs", { enumerable: true, get: function () { return logger_js_1.aggregateHealingLogs; } });
// Loop Controller
var loop_js_1 = require("./loop.js");
Object.defineProperty(exports, "runHealingLoop", { enumerable: true, get: function () { return loop_js_1.runHealingLoop; } });
Object.defineProperty(exports, "previewHealingFixes", { enumerable: true, get: function () { return loop_js_1.previewHealingFixes; } });
Object.defineProperty(exports, "wouldFixApply", { enumerable: true, get: function () { return loop_js_1.wouldFixApply; } });
// Fix Strategies
var selector_js_1 = require("./fixes/selector.js");
Object.defineProperty(exports, "extractCSSSelector", { enumerable: true, get: function () { return selector_js_1.extractCSSSelector; } });
Object.defineProperty(exports, "containsCSSSelector", { enumerable: true, get: function () { return selector_js_1.containsCSSSelector; } });
Object.defineProperty(exports, "inferRoleFromSelector", { enumerable: true, get: function () { return selector_js_1.inferRoleFromSelector; } });
Object.defineProperty(exports, "extractNameFromSelector", { enumerable: true, get: function () { return selector_js_1.extractNameFromSelector; } });
Object.defineProperty(exports, "generateRoleLocator", { enumerable: true, get: function () { return selector_js_1.generateRoleLocator; } });
Object.defineProperty(exports, "generateLabelLocator", { enumerable: true, get: function () { return selector_js_1.generateLabelLocator; } });
Object.defineProperty(exports, "generateTextLocator", { enumerable: true, get: function () { return selector_js_1.generateTextLocator; } });
Object.defineProperty(exports, "generateTestIdLocator", { enumerable: true, get: function () { return selector_js_1.generateTestIdLocator; } });
Object.defineProperty(exports, "applySelectorFix", { enumerable: true, get: function () { return selector_js_1.applySelectorFix; } });
Object.defineProperty(exports, "addExactToLocator", { enumerable: true, get: function () { return selector_js_1.addExactToLocator; } });
var navigation_js_1 = require("./fixes/navigation.js");
Object.defineProperty(exports, "hasNavigationWait", { enumerable: true, get: function () { return navigation_js_1.hasNavigationWait; } });
Object.defineProperty(exports, "extractUrlFromError", { enumerable: true, get: function () { return navigation_js_1.extractUrlFromError; } });
Object.defineProperty(exports, "extractUrlFromGoto", { enumerable: true, get: function () { return navigation_js_1.extractUrlFromGoto; } });
Object.defineProperty(exports, "inferUrlPattern", { enumerable: true, get: function () { return navigation_js_1.inferUrlPattern; } });
Object.defineProperty(exports, "generateWaitForURL", { enumerable: true, get: function () { return navigation_js_1.generateWaitForURL; } });
Object.defineProperty(exports, "generateToHaveURL", { enumerable: true, get: function () { return navigation_js_1.generateToHaveURL; } });
Object.defineProperty(exports, "insertNavigationWait", { enumerable: true, get: function () { return navigation_js_1.insertNavigationWait; } });
Object.defineProperty(exports, "applyNavigationFix", { enumerable: true, get: function () { return navigation_js_1.applyNavigationFix; } });
Object.defineProperty(exports, "fixMissingGotoAwait", { enumerable: true, get: function () { return navigation_js_1.fixMissingGotoAwait; } });
Object.defineProperty(exports, "addNavigationWaitAfterClick", { enumerable: true, get: function () { return navigation_js_1.addNavigationWaitAfterClick; } });
var timing_js_1 = require("./fixes/timing.js");
Object.defineProperty(exports, "extractTimeoutFromError", { enumerable: true, get: function () { return timing_js_1.extractTimeoutFromError; } });
Object.defineProperty(exports, "suggestTimeoutIncrease", { enumerable: true, get: function () { return timing_js_1.suggestTimeoutIncrease; } });
Object.defineProperty(exports, "fixMissingAwait", { enumerable: true, get: function () { return timing_js_1.fixMissingAwait; } });
Object.defineProperty(exports, "convertToWebFirstAssertion", { enumerable: true, get: function () { return timing_js_1.convertToWebFirstAssertion; } });
Object.defineProperty(exports, "addTimeout", { enumerable: true, get: function () { return timing_js_1.addTimeout; } });
Object.defineProperty(exports, "applyTimingFix", { enumerable: true, get: function () { return timing_js_1.applyTimingFix; } });
Object.defineProperty(exports, "wrapWithExpectToPass", { enumerable: true, get: function () { return timing_js_1.wrapWithExpectToPass; } });
Object.defineProperty(exports, "wrapWithExpectPoll", { enumerable: true, get: function () { return timing_js_1.wrapWithExpectPoll; } });
var data_js_1 = require("./fixes/data.js");
Object.defineProperty(exports, "generateRunId", { enumerable: true, get: function () { return data_js_1.generateRunId; } });
Object.defineProperty(exports, "hasDataIsolation", { enumerable: true, get: function () { return data_js_1.hasDataIsolation; } });
Object.defineProperty(exports, "addRunIdVariable", { enumerable: true, get: function () { return data_js_1.addRunIdVariable; } });
Object.defineProperty(exports, "namespaceEmail", { enumerable: true, get: function () { return data_js_1.namespaceEmail; } });
Object.defineProperty(exports, "namespaceName", { enumerable: true, get: function () { return data_js_1.namespaceName; } });
Object.defineProperty(exports, "replaceHardcodedEmail", { enumerable: true, get: function () { return data_js_1.replaceHardcodedEmail; } });
Object.defineProperty(exports, "replaceHardcodedTestData", { enumerable: true, get: function () { return data_js_1.replaceHardcodedTestData; } });
Object.defineProperty(exports, "applyDataFix", { enumerable: true, get: function () { return data_js_1.applyDataFix; } });
Object.defineProperty(exports, "addCleanupHook", { enumerable: true, get: function () { return data_js_1.addCleanupHook; } });
Object.defineProperty(exports, "extractTestDataPatterns", { enumerable: true, get: function () { return data_js_1.extractTestDataPatterns; } });
//# sourceMappingURL=index.js.map