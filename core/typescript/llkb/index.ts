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

// Pluralization functions (ARCH-001: shared module)
export type { PluralizeOptions, SingularizeOptions } from './pluralization.js';
export {
  pluralize,
  singularize,
  getSingularPlural,
  isUncountable,
  IRREGULAR_PLURALS,
  IRREGULAR_SINGULARS,
  UNCOUNTABLE_NOUNS,
} from './pluralization.js';

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
  BatchLearningEvent,
  BatchResult,
} from './learning.js';

export {
  recordPatternLearned,
  recordComponentUsed,
  recordLessonApplied,
  recordLearning,
  formatLearningResult,
  recordBatch,
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
  runAdapterCLI,
  parseAdapterArgs,
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
  UpdateTestSafeOptions,
  UpdateTestSafeResult,
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
  updateTestSafe,
} from './versioning.js';

// Result types - Standardized error handling
export type {
  LLKBResult,
} from './result-types.js';

export {
  ok,
  fail,
  tryCatch,
  mapResult,
  combineResults,
  isOk,
  isFail,
} from './result-types.js';

// Discovery - App-specific pattern discovery (F12)
export type {
  FrameworkSignal,
  UiLibrarySignal,
  SelectorSignals,
  AuthHints,
  DiscoveredProfile,
  DiscoveryResult,
} from './discovery.js';

export {
  FRAMEWORK_PATTERNS,
  UI_LIBRARY_PATTERNS as DISCOVERY_UI_LIBRARY_PATTERNS,
  SELECTOR_PATTERNS,
  detectFrameworks,
  detectUiLibraries,
  analyzeSelectorSignals,
  extractAuthHints,
  runDiscovery,
  saveDiscoveredProfile,
  loadDiscoveredProfile,
  saveAppProfile, // deprecated alias
} from './discovery.js';

// Pattern Generation - Generate patterns from discovery
export type {
  SelectorHint,
  DiscoveredPattern,
  DiscoveredPatternsFile,
  LearnedPattern,
  LearnedPatternEntry,
} from './pattern-generation.js';

export {
  AUTH_PATTERN_TEMPLATES,
  NAVIGATION_PATTERN_TEMPLATES,
  UI_LIBRARY_PATTERNS as PATTERN_UI_LIBRARY_PATTERNS,
  resetPatternIdCounter,
  generatePatterns,
  mergeDiscoveredPatterns,
  createDiscoveredPatternsFile,
  deduplicatePatterns,
  saveDiscoveredPatterns,
  loadDiscoveredPatterns,
} from './pattern-generation.js';

// Template Generators - CRUD, Form, Table, Modal, Navigation pattern multiplication
export type {
  DiscoveredEntity,
  DiscoveredRoute,
  DiscoveredForm,
  FormField,
  DiscoveredTable,
  DiscoveredModal,
  DiscoveredElements,
  PatternTemplate,
  GenerationResult,
} from './template-generators.js';

export {
  // Main generation functions
  generateCrudPatterns,
  generateFormPatterns,
  generateTablePatterns,
  generateModalPatterns,
  generateNavigationPatterns as generateExtendedNavigationPatterns,
  generateNotificationPatterns,
  generateAllPatterns,
  // Helper functions
  createEntity,
  createForm,
  createTable,
  createModal,
  createRoute,
  // Templates
  CRUD_TEMPLATES,
  FORM_TEMPLATES,
  TABLE_TEMPLATES,
  MODAL_TEMPLATES,
  EXTENDED_NAVIGATION_TEMPLATES,
  NOTIFICATION_TEMPLATES,
} from './template-generators.js';

// Mining - Zero-config element discovery (F12)
export type {
  MiningResult,
} from './mining.js';

export {
  mineEntities,
  mineRoutes,
  mineForms,
  mineTables,
  mineModals,
  mineElements,
  runMiningPipeline,
} from './mining.js';

// Mining Cache - File caching for performance (ARCH-002, ARCH-003)
export type {
  CacheStats,
  ScannedFile,
  ScanOptions,
  SourceDirectory,
} from './mining-cache.js';

export {
  MiningCache,
  SOURCE_DIRECTORIES,
  scanDirectory,
  scanAllSourceDirectories,
  createCacheFromFiles,
} from './mining-cache.js';

// Quality Controls - Pattern quality management
export type {
  UsageStats,
  QualityControlResult,
} from './quality-controls.js';

export {
  deduplicatePatterns as deduplicatePatternsQC,
  applyConfidenceThreshold,
  boostCrossSourcePatterns,
  pruneUnusedPatterns,
  applyAllQualityControls,
  applySignalWeighting,
} from './quality-controls.js';

// Framework Packs - Lazy-loaded framework-specific patterns (F12)
export type {
  PackPattern,
  FrameworkPack,
  PackRegistryEntry,
} from './packs/index.js';

export {
  getPackRegistry,
  loadPacksForFrameworks,
  packPatternsToDiscovered,
  loadDiscoveredPatternsForFrameworks,
} from './packs/index.js';

// Mining Modules - i18n, analytics, feature flag mining (F12)
export type {
  I18nKey,
  I18nMiningResult,
} from './mining/i18n-mining.js';

export type {
  AnalyticsEvent,
  AnalyticsMiningResult,
} from './mining/analytics-mining.js';

export type {
  FeatureFlag,
  FeatureFlagMiningResult,
} from './mining/feature-flag-mining.js';

export {
  mineI18nKeys,
  generateI18nPatterns,
} from './mining/i18n-mining.js';

export {
  mineAnalyticsEvents,
  generateAnalyticsPatterns,
} from './mining/analytics-mining.js';

export {
  mineFeatureFlags,
  generateFeatureFlagPatterns,
} from './mining/feature-flag-mining.js';

// Pipeline Orchestrator - Full discovery pipeline (F12)
export type {
  PipelineOptions,
  PipelineResult,
  PipelineStats,
} from './pipeline.js';

export {
  runFullDiscoveryPipeline,
} from './pipeline.js';
