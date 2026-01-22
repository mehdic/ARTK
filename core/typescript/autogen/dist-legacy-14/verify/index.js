"use strict";
/**
 * Verification module exports
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSummaryFromReport = exports.generateVerifySummary = exports.generateEvidenceReport = exports.formatARIATree = exports.findInSnapshot = exports.compareARIASnapshots = exports.loadEvidence = exports.saveEvidence = exports.createEvidenceDir = exports.generateEvidenceCaptureCode = exports.generateARIACaptureCode = exports.generateStabilityReport = exports.shouldQuarantine = exports.getFlakinessScore = exports.isTestStable = exports.thoroughStabilityCheck = exports.quickStabilityCheck = exports.checkStability = exports.generateClassificationReport = exports.getHealableFailures = exports.isHealable = exports.getFailureStats = exports.classifyTestResults = exports.classifyTestResult = exports.classifyError = exports.generateMarkdownSummary = exports.formatTestResult = exports.reportHasFlaky = exports.isReportSuccessful = exports.getFailedStep = exports.extractErrorStacks = exports.extractErrorMessages = exports.findTestsByTag = exports.findTestsByTitle = exports.getFlakyTests = exports.getFailedTests = exports.getSummary = exports.extractTestResults = exports.parseReportContent = exports.parseReportFile = exports.getTestCount = exports.writeAndRunTest = exports.checkTestSyntax = exports.runJourneyTests = exports.runTestFile = exports.runPlaywrightAsync = exports.runPlaywrightSync = exports.buildPlaywrightArgs = exports.getPlaywrightVersion = exports.isPlaywrightAvailable = void 0;
exports.saveSummary = exports.formatVerifySummary = exports.getRecommendations = exports.summaryHasFlaky = exports.hasFailures = exports.isVerificationPassed = void 0;
// Runner
var runner_js_1 = require("./runner.js");
Object.defineProperty(exports, "isPlaywrightAvailable", { enumerable: true, get: function () { return runner_js_1.isPlaywrightAvailable; } });
Object.defineProperty(exports, "getPlaywrightVersion", { enumerable: true, get: function () { return runner_js_1.getPlaywrightVersion; } });
Object.defineProperty(exports, "buildPlaywrightArgs", { enumerable: true, get: function () { return runner_js_1.buildPlaywrightArgs; } });
Object.defineProperty(exports, "runPlaywrightSync", { enumerable: true, get: function () { return runner_js_1.runPlaywrightSync; } });
Object.defineProperty(exports, "runPlaywrightAsync", { enumerable: true, get: function () { return runner_js_1.runPlaywrightAsync; } });
Object.defineProperty(exports, "runTestFile", { enumerable: true, get: function () { return runner_js_1.runTestFile; } });
Object.defineProperty(exports, "runJourneyTests", { enumerable: true, get: function () { return runner_js_1.runJourneyTests; } });
Object.defineProperty(exports, "checkTestSyntax", { enumerable: true, get: function () { return runner_js_1.checkTestSyntax; } });
Object.defineProperty(exports, "writeAndRunTest", { enumerable: true, get: function () { return runner_js_1.writeAndRunTest; } });
Object.defineProperty(exports, "getTestCount", { enumerable: true, get: function () { return runner_js_1.getTestCount; } });
// Parser
var parser_js_1 = require("./parser.js");
Object.defineProperty(exports, "parseReportFile", { enumerable: true, get: function () { return parser_js_1.parseReportFile; } });
Object.defineProperty(exports, "parseReportContent", { enumerable: true, get: function () { return parser_js_1.parseReportContent; } });
Object.defineProperty(exports, "extractTestResults", { enumerable: true, get: function () { return parser_js_1.extractTestResults; } });
Object.defineProperty(exports, "getSummary", { enumerable: true, get: function () { return parser_js_1.getSummary; } });
Object.defineProperty(exports, "getFailedTests", { enumerable: true, get: function () { return parser_js_1.getFailedTests; } });
Object.defineProperty(exports, "getFlakyTests", { enumerable: true, get: function () { return parser_js_1.getFlakyTests; } });
Object.defineProperty(exports, "findTestsByTitle", { enumerable: true, get: function () { return parser_js_1.findTestsByTitle; } });
Object.defineProperty(exports, "findTestsByTag", { enumerable: true, get: function () { return parser_js_1.findTestsByTag; } });
Object.defineProperty(exports, "extractErrorMessages", { enumerable: true, get: function () { return parser_js_1.extractErrorMessages; } });
Object.defineProperty(exports, "extractErrorStacks", { enumerable: true, get: function () { return parser_js_1.extractErrorStacks; } });
Object.defineProperty(exports, "getFailedStep", { enumerable: true, get: function () { return parser_js_1.getFailedStep; } });
Object.defineProperty(exports, "isReportSuccessful", { enumerable: true, get: function () { return parser_js_1.isReportSuccessful; } });
Object.defineProperty(exports, "reportHasFlaky", { enumerable: true, get: function () { return parser_js_1.hasFlaky; } });
Object.defineProperty(exports, "formatTestResult", { enumerable: true, get: function () { return parser_js_1.formatTestResult; } });
Object.defineProperty(exports, "generateMarkdownSummary", { enumerable: true, get: function () { return parser_js_1.generateMarkdownSummary; } });
// Classifier
var classifier_js_1 = require("./classifier.js");
Object.defineProperty(exports, "classifyError", { enumerable: true, get: function () { return classifier_js_1.classifyError; } });
Object.defineProperty(exports, "classifyTestResult", { enumerable: true, get: function () { return classifier_js_1.classifyTestResult; } });
Object.defineProperty(exports, "classifyTestResults", { enumerable: true, get: function () { return classifier_js_1.classifyTestResults; } });
Object.defineProperty(exports, "getFailureStats", { enumerable: true, get: function () { return classifier_js_1.getFailureStats; } });
Object.defineProperty(exports, "isHealable", { enumerable: true, get: function () { return classifier_js_1.isHealable; } });
Object.defineProperty(exports, "getHealableFailures", { enumerable: true, get: function () { return classifier_js_1.getHealableFailures; } });
Object.defineProperty(exports, "generateClassificationReport", { enumerable: true, get: function () { return classifier_js_1.generateClassificationReport; } });
// Stability
var stability_js_1 = require("./stability.js");
Object.defineProperty(exports, "checkStability", { enumerable: true, get: function () { return stability_js_1.checkStability; } });
Object.defineProperty(exports, "quickStabilityCheck", { enumerable: true, get: function () { return stability_js_1.quickStabilityCheck; } });
Object.defineProperty(exports, "thoroughStabilityCheck", { enumerable: true, get: function () { return stability_js_1.thoroughStabilityCheck; } });
Object.defineProperty(exports, "isTestStable", { enumerable: true, get: function () { return stability_js_1.isTestStable; } });
Object.defineProperty(exports, "getFlakinessScore", { enumerable: true, get: function () { return stability_js_1.getFlakinessScore; } });
Object.defineProperty(exports, "shouldQuarantine", { enumerable: true, get: function () { return stability_js_1.shouldQuarantine; } });
Object.defineProperty(exports, "generateStabilityReport", { enumerable: true, get: function () { return stability_js_1.generateStabilityReport; } });
// Evidence
var evidence_js_1 = require("./evidence.js");
Object.defineProperty(exports, "generateARIACaptureCode", { enumerable: true, get: function () { return evidence_js_1.generateARIACaptureCode; } });
Object.defineProperty(exports, "generateEvidenceCaptureCode", { enumerable: true, get: function () { return evidence_js_1.generateEvidenceCaptureCode; } });
Object.defineProperty(exports, "createEvidenceDir", { enumerable: true, get: function () { return evidence_js_1.createEvidenceDir; } });
Object.defineProperty(exports, "saveEvidence", { enumerable: true, get: function () { return evidence_js_1.saveEvidence; } });
Object.defineProperty(exports, "loadEvidence", { enumerable: true, get: function () { return evidence_js_1.loadEvidence; } });
Object.defineProperty(exports, "compareARIASnapshots", { enumerable: true, get: function () { return evidence_js_1.compareARIASnapshots; } });
Object.defineProperty(exports, "findInSnapshot", { enumerable: true, get: function () { return evidence_js_1.findInSnapshot; } });
Object.defineProperty(exports, "formatARIATree", { enumerable: true, get: function () { return evidence_js_1.formatARIATree; } });
Object.defineProperty(exports, "generateEvidenceReport", { enumerable: true, get: function () { return evidence_js_1.generateEvidenceReport; } });
// Summary
var summary_js_1 = require("./summary.js");
Object.defineProperty(exports, "generateVerifySummary", { enumerable: true, get: function () { return summary_js_1.generateVerifySummary; } });
Object.defineProperty(exports, "generateSummaryFromReport", { enumerable: true, get: function () { return summary_js_1.generateSummaryFromReport; } });
Object.defineProperty(exports, "isVerificationPassed", { enumerable: true, get: function () { return summary_js_1.isVerificationPassed; } });
Object.defineProperty(exports, "hasFailures", { enumerable: true, get: function () { return summary_js_1.hasFailures; } });
Object.defineProperty(exports, "summaryHasFlaky", { enumerable: true, get: function () { return summary_js_1.hasFlaky; } });
Object.defineProperty(exports, "getRecommendations", { enumerable: true, get: function () { return summary_js_1.getRecommendations; } });
Object.defineProperty(exports, "formatVerifySummary", { enumerable: true, get: function () { return summary_js_1.formatVerifySummary; } });
Object.defineProperty(exports, "saveSummary", { enumerable: true, get: function () { return summary_js_1.saveSummary; } });
//# sourceMappingURL=index.js.map