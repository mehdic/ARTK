/**
 * LLKB (Lessons Learned Knowledge Base) Library
 *
 * A TypeScript library for managing lessons learned, reusable components,
 * and analytics for the ARTK automated testing framework.
 *
 * @module @artk/llkb
 */

// Types - All public type definitions
export type {
  // Categories and Scopes
  LLKBCategory,
  ComponentCategory,
  LLKBScope,

  // Lesson types
  Lesson,
  LessonMetrics,
  LessonValidation,
  LessonsFile,
  ConfidenceHistoryEntry,
  GlobalRule,
  AppQuirk,

  // Component types
  Component,
  ComponentMetrics,
  ComponentSource,
  ComponentsFile,

  // Analytics types
  AnalyticsFile,
  AnalyticsOverview,
  LessonStats,
  ComponentStats,
  ImpactMetrics,
  TopPerformers,
  TopPerformerLesson,
  TopPerformerComponent,
  NeedsReview,

  // Configuration types
  LLKBConfig,
  ExtractionConfig,
  RetentionConfig,
  HistoryConfig,
  InjectionConfig,
  ScopesConfig,
  OverridesConfig,

  // History event types
  BaseHistoryEvent,
  LessonAppliedEvent,
  ComponentExtractedEvent,
  ComponentUsedEvent,
  OverrideEvent,
  ExtractionDeferredEvent,
  HistoryEvent,

  // Result types
  SaveResult,
  UpdateResult,
  ExtractionCandidate,
  TestStep,
} from './types.js';

// Normalization functions
export {
  normalizeCode,
  hashCode,
  tokenize,
  countLines,
} from './normalize.js';

// Similarity functions
export type { SimilarPatternResult } from './similarity.js';
export {
  calculateSimilarity,
  jaccardSimilarity,
  lineCountSimilarity,
  isNearDuplicate,
  findNearDuplicates,
  findSimilarPatterns,
} from './similarity.js';

// Category inference functions
export {
  inferCategory,
  inferCategoryWithConfidence,
  isComponentCategory,
  getAllCategories,
  getComponentCategories,
} from './inference.js';

// Confidence calculation functions
export {
  calculateConfidence,
  detectDecliningConfidence,
  updateConfidenceHistory,
  getConfidenceTrend,
  daysBetween,
  needsConfidenceReview,
  MAX_CONFIDENCE_HISTORY_ENTRIES,
  CONFIDENCE_HISTORY_RETENTION_DAYS,
} from './confidence.js';

// File utilities
export {
  saveJSONAtomic,
  saveJSONAtomicSync,
  updateJSONWithLock,
  updateJSONWithLockSync,
  loadJSON,
  ensureDir,
  LOCK_MAX_WAIT_MS,
  STALE_LOCK_THRESHOLD_MS,
  LOCK_RETRY_INTERVAL_MS,
} from './file-utils.js';

// History logging functions
export {
  appendToHistory,
  readHistoryFile,
  readTodayHistory,
  countTodayEvents,
  countPredictiveExtractionsToday,
  countJourneyExtractionsToday,
  isDailyRateLimitReached,
  isJourneyRateLimitReached,
  getHistoryFilesInRange,
  cleanupOldHistoryFiles,
  getHistoryDir,
  getHistoryFilePath,
  formatDate,
  DEFAULT_LLKB_ROOT,
} from './history.js';

// Analytics functions
export {
  updateAnalytics,
  updateAnalyticsWithData,
  createEmptyAnalytics,
  getAnalyticsSummary,
} from './analytics.js';

// CLI functions
export type {
  HealthCheckResult,
  HealthCheck,
  StatsResult,
  PruneResult,
  AutogenExportOptions,
  LearnOptions,
  LearningResult,
  // Versioning CLI types
  CheckUpdatesOptions,
  UpdateTestOptions,
  UpdateTestsOptions,
  UpdateTestResult,
  UpdateTestsResult,
} from './cli.js';

export {
  runHealthCheck,
  getStats,
  prune,
  formatHealthCheck,
  formatStats,
  formatPruneResult,
  runExportForAutogen,
  formatExportResultForConsole,
  runLearnCommand,
  formatLearnResult,
  // Versioning CLI functions
  runCheckUpdates,
  formatCheckUpdatesResult,
  runUpdateTest,
  formatUpdateTestResult,
  runUpdateTests,
  formatUpdateTestsResult,
  compareTestVersion,
  extractLlkbVersionFromTest,
  updateTestLlkbVersion,
  getCurrentLlkbVersion,
  formatVersionComparison,
} from './cli.js';

// Learning functions (learning loop for continuous improvement)
export type {
  LearningInput,
  PatternLearnedInput,
  ComponentUsedInput,
  LessonAppliedInput,
} from './learning.js';

export {
  recordPatternLearned,
  recordComponentUsed,
  recordLessonApplied,
  recordLearning,
  formatLearningResult,
} from './learning.js';

// Adapter types (AutoGen integration)
export type {
  LLKBAdapterConfig,
  LLKBAdapterResult,
  ExportStats,
  PatternSource,
  AdditionalPattern,
  SelectorOverride,
  TimingHint,
  ModuleMapping,
  AutogenLLKBConfig,
  IRPrimitive,
  GlossaryEntry,
  GlossaryMeta,
} from './adapter-types.js';

// Adapter functions (AutoGen integration)
export {
  exportForAutogen,
  formatExportResult,
} from './adapter.js';

// Adapter transform functions
export {
  triggerToRegex,
  componentNameToTrigger,
  generateNameVariations,
  lessonToPattern,
  lessonToSelectorOverride,
  lessonToTimingHint,
  componentToModule,
  componentToGlossaryEntries,
  lessonToGlossaryEntries,
} from './adapter-transforms.js';

// Loaders - Load LLKB data from files
export type {
  LessonFilterOptions,
  ComponentFilterOptions,
  LLKBPatterns,
  LLKBData,
  AppProfile,
} from './loaders.js';

export {
  loadLLKBConfig,
  loadAppProfile,
  loadLessons,
  loadComponents,
  loadPatterns,
  loadLLKBData,
  isLLKBEnabled,
  llkbExists,
} from './loaders.js';

// Context injection - Get relevant context for prompts
export type {
  JourneyContext,
  RelevantContext,
} from './context.js';

export {
  getRelevantContext,
  formatContextForPrompt,
  extractKeywords,
  getRelevantScopes,
} from './context.js';

// Matching - Match steps to components and detect extraction opportunities
export type {
  JourneyStep,
  StepMatchResult,
  MatchOptions,
  ExtractionCheckResult,
  PatternOccurrence,
} from './matching.js';

export {
  matchStepsToComponents,
  shouldExtractAsComponent,
  findExtractionCandidates,
  extractStepKeywords,
} from './matching.js';

// Detection - Cross-journey duplicate detection
export type {
  DuplicateDetectionResult,
  DuplicateGroup,
  DetectionOptions,
} from './detection.js';

export {
  detectDuplicatesAcrossFiles,
  detectDuplicatesInFile,
  findUnusedComponentOpportunities,
} from './detection.js';

// Registry - Module registry management
export type {
  ModuleExport,
  ModuleEntry,
  ModuleRegistry,
  AddToRegistryOptions,
} from './registry.js';

export {
  createEmptyRegistry,
  loadRegistry,
  saveRegistry,
  addComponentToRegistry,
  removeComponentFromRegistry,
  updateComponentInRegistry,
  getModuleForComponent,
  getImportPath,
  listModules,
  findModulesByCategory,
  validateRegistryConsistency,
  syncRegistryWithComponents,
} from './registry.js';

// Migration - Version upgrades and initialization
export type {
  MigrationResult,
  VersionInfo,
} from './migration.js';

export {
  CURRENT_VERSION,
  MIN_SUPPORTED_VERSION,
  parseVersion,
  compareVersions,
  isVersionSupported,
  needsMigration,
  migrateLLKB,
  checkMigrationNeeded,
  initializeLLKB,
  validateLLKBInstallation,
} from './migration.js';

// Search and Export - Search LLKB data and export reports
export type {
  SearchQuery,
  SearchResult,
  ExportFormat,
  ExportOptions,
  ReportSection,
} from './search.js';

export {
  search,
  findLessonsByPattern,
  findComponents,
  getLessonsForJourney,
  getComponentsForJourney,
  exportLLKB,
  generateReport,
  exportToFile,
} from './search.js';

// Versioning - Track LLKB versions in generated tests
export type {
  VersionComparison,
  UpdateCheckResult,
} from './versioning.js';

export {
  extractLlkbVersionFromTest as extractVersionFromTest,
  extractLlkbEntriesFromTest,
  updateTestLlkbVersion as updateVersionInTest,
  getCurrentLlkbVersion as getLlkbVersion,
  countNewEntriesSince,
  compareVersions as compareTestVersions,
  checkUpdates,
  formatVersionComparison as formatComparison,
  formatUpdateCheckResult,
} from './versioning.js';
