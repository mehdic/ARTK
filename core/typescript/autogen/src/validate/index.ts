/**
 * Validation module exports
 */

// Journey validation
export {
  type ValidationSeverity,
  type ValidationIssue,
  type JourneyValidationResult,
  type JourneyValidationOptions,
  validateJourneySchema,
  validateJourneyStatus,
  validateJourneyTier,
  validateJourneyTags,
  validateJourneyFrontmatter,
  isJourneyReady,
} from './journey.js';

// Pattern scanning
export {
  type ForbiddenPattern,
  type PatternScanResult,
  FORBIDDEN_PATTERNS,
  scanForbiddenPatterns,
  scanResultsToIssues,
  getPatternStats,
  hasErrorViolations,
  filterBySeverity,
  getViolationSummary,
} from './patterns.js';

// ESLint integration
export {
  type LintResult,
  type LintOptions,
  PLAYWRIGHT_LINT_RULES,
  generateESLintConfig,
  isESLintAvailable,
  isPlaywrightPluginAvailable,
  parseESLintOutput,
  lintCode,
  lintFile,
  hasLintErrors,
} from './lint.js';

// Tag validation
export {
  TAG_PATTERNS,
  type TagValidationOptions,
  type TagValidationResult,
  parseTagsFromCode,
  parseTagsFromFrontmatter,
  categorizeTags,
  validateTags,
  generateExpectedTags,
  validateTagsInCode,
} from './tags.js';

// Coverage validation
export {
  type ACCoverageResult,
  type CoverageResult,
  type CoverageOptions,
  findTestSteps,
  findACReferences,
  validateIRCoverage,
  validateCodeCoverage,
  generateCoverageReport,
} from './coverage.js';

// Code validation (aggregated)
export {
  type CodeValidationResult,
  type CodeValidationOptions,
  validateCode,
  validateCodeSync,
  isCodeValid,
  generateValidationReport,
} from './code.js';
