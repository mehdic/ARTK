/**
 * Verification module exports
 */

// Runner
export {
  type RunnerOptions,
  type RunnerResult,
  isPlaywrightAvailable,
  getPlaywrightVersion,
  buildPlaywrightArgs,
  runPlaywrightSync,
  runPlaywrightAsync,
  runTestFile,
  runJourneyTests,
  checkTestSyntax,
  writeAndRunTest,
  getTestCount,
} from './runner.js';

// Parser
export {
  type TestStatus,
  type ErrorAttachment,
  type TestError,
  type ReportStep,
  type TestResult,
  type TestSuite,
  type TestSpec,
  type PlaywrightReport,
  type ParsedSummary,
  parseReportFile,
  parseReportContent,
  extractTestResults,
  getSummary,
  getFailedTests,
  getFlakyTests,
  findTestsByTitle,
  findTestsByTag,
  extractErrorMessages,
  extractErrorStacks,
  getFailedStep,
  isReportSuccessful,
  hasFlaky as reportHasFlaky,
  formatTestResult,
  generateMarkdownSummary,
} from './parser.js';

// Classifier
export {
  type FailureCategory,
  type FailureClassification,
  classifyError,
  classifyTestResult,
  classifyTestResults,
  getFailureStats,
  isHealable,
  getHealableFailures,
  generateClassificationReport,
} from './classifier.js';

// Stability
export {
  type StabilityOptions,
  type StabilityResult,
  checkStability,
  quickStabilityCheck,
  thoroughStabilityCheck,
  isTestStable,
  getFlakinessScore,
  shouldQuarantine,
  generateStabilityReport,
} from './stability.js';

// Evidence
export {
  type ARIASnapshot,
  type Evidence,
  type EvidenceOptions,
  generateARIACaptureCode,
  generateEvidenceCaptureCode,
  createEvidenceDir,
  saveEvidence,
  loadEvidence,
  compareARIASnapshots,
  findInSnapshot,
  formatARIATree,
  generateEvidenceReport,
} from './evidence.js';

// Summary
export {
  type VerifySummary,
  type SummaryOptions,
  generateVerifySummary,
  generateSummaryFromReport,
  isVerificationPassed,
  hasFailures,
  hasFlaky as summaryHasFlaky,
  getRecommendations,
  formatVerifySummary,
  saveSummary,
} from './summary.js';
