"use strict";
/**
 * Validation module exports
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateValidationReport = exports.isCodeValid = exports.validateCodeSync = exports.validateCode = exports.generateCoverageReport = exports.validateCodeCoverage = exports.validateIRCoverage = exports.findACReferences = exports.findTestSteps = exports.validateTagsInCode = exports.generateExpectedTags = exports.validateTags = exports.categorizeTags = exports.parseTagsFromFrontmatter = exports.parseTagsFromCode = exports.TAG_PATTERNS = exports.hasLintErrors = exports.lintFile = exports.lintCode = exports.parseESLintOutput = exports.isPlaywrightPluginAvailable = exports.isESLintAvailable = exports.generateESLintConfig = exports.PLAYWRIGHT_LINT_RULES = exports.getViolationSummary = exports.filterBySeverity = exports.hasErrorViolations = exports.getPatternStats = exports.scanResultsToIssues = exports.scanForbiddenPatterns = exports.FORBIDDEN_PATTERNS = exports.isJourneyReady = exports.validateJourneyFrontmatter = exports.validateJourneyTags = exports.validateJourneyTier = exports.validateJourneyStatus = exports.validateJourneySchema = void 0;
// Journey validation
var journey_js_1 = require("./journey.js");
Object.defineProperty(exports, "validateJourneySchema", { enumerable: true, get: function () { return journey_js_1.validateJourneySchema; } });
Object.defineProperty(exports, "validateJourneyStatus", { enumerable: true, get: function () { return journey_js_1.validateJourneyStatus; } });
Object.defineProperty(exports, "validateJourneyTier", { enumerable: true, get: function () { return journey_js_1.validateJourneyTier; } });
Object.defineProperty(exports, "validateJourneyTags", { enumerable: true, get: function () { return journey_js_1.validateJourneyTags; } });
Object.defineProperty(exports, "validateJourneyFrontmatter", { enumerable: true, get: function () { return journey_js_1.validateJourneyFrontmatter; } });
Object.defineProperty(exports, "isJourneyReady", { enumerable: true, get: function () { return journey_js_1.isJourneyReady; } });
// Pattern scanning
var patterns_js_1 = require("./patterns.js");
Object.defineProperty(exports, "FORBIDDEN_PATTERNS", { enumerable: true, get: function () { return patterns_js_1.FORBIDDEN_PATTERNS; } });
Object.defineProperty(exports, "scanForbiddenPatterns", { enumerable: true, get: function () { return patterns_js_1.scanForbiddenPatterns; } });
Object.defineProperty(exports, "scanResultsToIssues", { enumerable: true, get: function () { return patterns_js_1.scanResultsToIssues; } });
Object.defineProperty(exports, "getPatternStats", { enumerable: true, get: function () { return patterns_js_1.getPatternStats; } });
Object.defineProperty(exports, "hasErrorViolations", { enumerable: true, get: function () { return patterns_js_1.hasErrorViolations; } });
Object.defineProperty(exports, "filterBySeverity", { enumerable: true, get: function () { return patterns_js_1.filterBySeverity; } });
Object.defineProperty(exports, "getViolationSummary", { enumerable: true, get: function () { return patterns_js_1.getViolationSummary; } });
// ESLint integration
var lint_js_1 = require("./lint.js");
Object.defineProperty(exports, "PLAYWRIGHT_LINT_RULES", { enumerable: true, get: function () { return lint_js_1.PLAYWRIGHT_LINT_RULES; } });
Object.defineProperty(exports, "generateESLintConfig", { enumerable: true, get: function () { return lint_js_1.generateESLintConfig; } });
Object.defineProperty(exports, "isESLintAvailable", { enumerable: true, get: function () { return lint_js_1.isESLintAvailable; } });
Object.defineProperty(exports, "isPlaywrightPluginAvailable", { enumerable: true, get: function () { return lint_js_1.isPlaywrightPluginAvailable; } });
Object.defineProperty(exports, "parseESLintOutput", { enumerable: true, get: function () { return lint_js_1.parseESLintOutput; } });
Object.defineProperty(exports, "lintCode", { enumerable: true, get: function () { return lint_js_1.lintCode; } });
Object.defineProperty(exports, "lintFile", { enumerable: true, get: function () { return lint_js_1.lintFile; } });
Object.defineProperty(exports, "hasLintErrors", { enumerable: true, get: function () { return lint_js_1.hasLintErrors; } });
// Tag validation
var tags_js_1 = require("./tags.js");
Object.defineProperty(exports, "TAG_PATTERNS", { enumerable: true, get: function () { return tags_js_1.TAG_PATTERNS; } });
Object.defineProperty(exports, "parseTagsFromCode", { enumerable: true, get: function () { return tags_js_1.parseTagsFromCode; } });
Object.defineProperty(exports, "parseTagsFromFrontmatter", { enumerable: true, get: function () { return tags_js_1.parseTagsFromFrontmatter; } });
Object.defineProperty(exports, "categorizeTags", { enumerable: true, get: function () { return tags_js_1.categorizeTags; } });
Object.defineProperty(exports, "validateTags", { enumerable: true, get: function () { return tags_js_1.validateTags; } });
Object.defineProperty(exports, "generateExpectedTags", { enumerable: true, get: function () { return tags_js_1.generateExpectedTags; } });
Object.defineProperty(exports, "validateTagsInCode", { enumerable: true, get: function () { return tags_js_1.validateTagsInCode; } });
// Coverage validation
var coverage_js_1 = require("./coverage.js");
Object.defineProperty(exports, "findTestSteps", { enumerable: true, get: function () { return coverage_js_1.findTestSteps; } });
Object.defineProperty(exports, "findACReferences", { enumerable: true, get: function () { return coverage_js_1.findACReferences; } });
Object.defineProperty(exports, "validateIRCoverage", { enumerable: true, get: function () { return coverage_js_1.validateIRCoverage; } });
Object.defineProperty(exports, "validateCodeCoverage", { enumerable: true, get: function () { return coverage_js_1.validateCodeCoverage; } });
Object.defineProperty(exports, "generateCoverageReport", { enumerable: true, get: function () { return coverage_js_1.generateCoverageReport; } });
// Code validation (aggregated)
var code_js_1 = require("./code.js");
Object.defineProperty(exports, "validateCode", { enumerable: true, get: function () { return code_js_1.validateCode; } });
Object.defineProperty(exports, "validateCodeSync", { enumerable: true, get: function () { return code_js_1.validateCodeSync; } });
Object.defineProperty(exports, "isCodeValid", { enumerable: true, get: function () { return code_js_1.isCodeValid; } });
Object.defineProperty(exports, "generateValidationReport", { enumerable: true, get: function () { return code_js_1.generateValidationReport; } });
//# sourceMappingURL=index.js.map