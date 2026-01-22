"use strict";
/**
 * LLKB (Lessons Learned Knowledge Base) Library
 *
 * A TypeScript library for managing lessons learned, reusable components,
 * and analytics for the ARTK automated testing framework.
 *
 * @module @artk/llkb
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAnalyticsSummary = exports.createEmptyAnalytics = exports.updateAnalyticsWithData = exports.updateAnalytics = exports.DEFAULT_LLKB_ROOT = exports.formatDate = exports.getHistoryFilePath = exports.getHistoryDir = exports.cleanupOldHistoryFiles = exports.getHistoryFilesInRange = exports.isJourneyRateLimitReached = exports.isDailyRateLimitReached = exports.countJourneyExtractionsToday = exports.countPredictiveExtractionsToday = exports.countTodayEvents = exports.readTodayHistory = exports.readHistoryFile = exports.appendToHistory = exports.LOCK_RETRY_INTERVAL_MS = exports.STALE_LOCK_THRESHOLD_MS = exports.LOCK_MAX_WAIT_MS = exports.ensureDir = exports.loadJSON = exports.updateJSONWithLockSync = exports.updateJSONWithLock = exports.saveJSONAtomicSync = exports.saveJSONAtomic = exports.CONFIDENCE_HISTORY_RETENTION_DAYS = exports.MAX_CONFIDENCE_HISTORY_ENTRIES = exports.needsConfidenceReview = exports.daysBetween = exports.getConfidenceTrend = exports.updateConfidenceHistory = exports.detectDecliningConfidence = exports.calculateConfidence = exports.getComponentCategories = exports.getAllCategories = exports.isComponentCategory = exports.inferCategoryWithConfidence = exports.inferCategory = exports.findSimilarPatterns = exports.findNearDuplicates = exports.isNearDuplicate = exports.lineCountSimilarity = exports.jaccardSimilarity = exports.calculateSimilarity = exports.countLines = exports.tokenize = exports.hashCode = exports.normalizeCode = void 0;
exports.findComponents = exports.findLessonsByPattern = exports.search = exports.validateLLKBInstallation = exports.initializeLLKB = exports.checkMigrationNeeded = exports.migrateLLKB = exports.needsMigration = exports.isVersionSupported = exports.compareVersions = exports.parseVersion = exports.MIN_SUPPORTED_VERSION = exports.CURRENT_VERSION = exports.syncRegistryWithComponents = exports.validateRegistryConsistency = exports.findModulesByCategory = exports.listModules = exports.getImportPath = exports.getModuleForComponent = exports.updateComponentInRegistry = exports.removeComponentFromRegistry = exports.addComponentToRegistry = exports.saveRegistry = exports.loadRegistry = exports.createEmptyRegistry = exports.findUnusedComponentOpportunities = exports.detectDuplicatesInFile = exports.detectDuplicatesAcrossFiles = exports.extractStepKeywords = exports.findExtractionCandidates = exports.shouldExtractAsComponent = exports.matchStepsToComponents = exports.getRelevantScopes = exports.extractKeywords = exports.formatContextForPrompt = exports.getRelevantContext = exports.llkbExists = exports.isLLKBEnabled = exports.loadLLKBData = exports.loadPatterns = exports.loadComponents = exports.loadLessons = exports.loadAppProfile = exports.loadLLKBConfig = exports.formatPruneResult = exports.formatStats = exports.formatHealthCheck = exports.prune = exports.getStats = exports.runHealthCheck = void 0;
exports.exportToFile = exports.generateReport = exports.exportLLKB = exports.getComponentsForJourney = exports.getLessonsForJourney = void 0;
// Normalization functions
var normalize_js_1 = require("./normalize.js");
Object.defineProperty(exports, "normalizeCode", { enumerable: true, get: function () { return normalize_js_1.normalizeCode; } });
Object.defineProperty(exports, "hashCode", { enumerable: true, get: function () { return normalize_js_1.hashCode; } });
Object.defineProperty(exports, "tokenize", { enumerable: true, get: function () { return normalize_js_1.tokenize; } });
Object.defineProperty(exports, "countLines", { enumerable: true, get: function () { return normalize_js_1.countLines; } });
var similarity_js_1 = require("./similarity.js");
Object.defineProperty(exports, "calculateSimilarity", { enumerable: true, get: function () { return similarity_js_1.calculateSimilarity; } });
Object.defineProperty(exports, "jaccardSimilarity", { enumerable: true, get: function () { return similarity_js_1.jaccardSimilarity; } });
Object.defineProperty(exports, "lineCountSimilarity", { enumerable: true, get: function () { return similarity_js_1.lineCountSimilarity; } });
Object.defineProperty(exports, "isNearDuplicate", { enumerable: true, get: function () { return similarity_js_1.isNearDuplicate; } });
Object.defineProperty(exports, "findNearDuplicates", { enumerable: true, get: function () { return similarity_js_1.findNearDuplicates; } });
Object.defineProperty(exports, "findSimilarPatterns", { enumerable: true, get: function () { return similarity_js_1.findSimilarPatterns; } });
// Category inference functions
var inference_js_1 = require("./inference.js");
Object.defineProperty(exports, "inferCategory", { enumerable: true, get: function () { return inference_js_1.inferCategory; } });
Object.defineProperty(exports, "inferCategoryWithConfidence", { enumerable: true, get: function () { return inference_js_1.inferCategoryWithConfidence; } });
Object.defineProperty(exports, "isComponentCategory", { enumerable: true, get: function () { return inference_js_1.isComponentCategory; } });
Object.defineProperty(exports, "getAllCategories", { enumerable: true, get: function () { return inference_js_1.getAllCategories; } });
Object.defineProperty(exports, "getComponentCategories", { enumerable: true, get: function () { return inference_js_1.getComponentCategories; } });
// Confidence calculation functions
var confidence_js_1 = require("./confidence.js");
Object.defineProperty(exports, "calculateConfidence", { enumerable: true, get: function () { return confidence_js_1.calculateConfidence; } });
Object.defineProperty(exports, "detectDecliningConfidence", { enumerable: true, get: function () { return confidence_js_1.detectDecliningConfidence; } });
Object.defineProperty(exports, "updateConfidenceHistory", { enumerable: true, get: function () { return confidence_js_1.updateConfidenceHistory; } });
Object.defineProperty(exports, "getConfidenceTrend", { enumerable: true, get: function () { return confidence_js_1.getConfidenceTrend; } });
Object.defineProperty(exports, "daysBetween", { enumerable: true, get: function () { return confidence_js_1.daysBetween; } });
Object.defineProperty(exports, "needsConfidenceReview", { enumerable: true, get: function () { return confidence_js_1.needsConfidenceReview; } });
Object.defineProperty(exports, "MAX_CONFIDENCE_HISTORY_ENTRIES", { enumerable: true, get: function () { return confidence_js_1.MAX_CONFIDENCE_HISTORY_ENTRIES; } });
Object.defineProperty(exports, "CONFIDENCE_HISTORY_RETENTION_DAYS", { enumerable: true, get: function () { return confidence_js_1.CONFIDENCE_HISTORY_RETENTION_DAYS; } });
// File utilities
var file_utils_js_1 = require("./file-utils.js");
Object.defineProperty(exports, "saveJSONAtomic", { enumerable: true, get: function () { return file_utils_js_1.saveJSONAtomic; } });
Object.defineProperty(exports, "saveJSONAtomicSync", { enumerable: true, get: function () { return file_utils_js_1.saveJSONAtomicSync; } });
Object.defineProperty(exports, "updateJSONWithLock", { enumerable: true, get: function () { return file_utils_js_1.updateJSONWithLock; } });
Object.defineProperty(exports, "updateJSONWithLockSync", { enumerable: true, get: function () { return file_utils_js_1.updateJSONWithLockSync; } });
Object.defineProperty(exports, "loadJSON", { enumerable: true, get: function () { return file_utils_js_1.loadJSON; } });
Object.defineProperty(exports, "ensureDir", { enumerable: true, get: function () { return file_utils_js_1.ensureDir; } });
Object.defineProperty(exports, "LOCK_MAX_WAIT_MS", { enumerable: true, get: function () { return file_utils_js_1.LOCK_MAX_WAIT_MS; } });
Object.defineProperty(exports, "STALE_LOCK_THRESHOLD_MS", { enumerable: true, get: function () { return file_utils_js_1.STALE_LOCK_THRESHOLD_MS; } });
Object.defineProperty(exports, "LOCK_RETRY_INTERVAL_MS", { enumerable: true, get: function () { return file_utils_js_1.LOCK_RETRY_INTERVAL_MS; } });
// History logging functions
var history_js_1 = require("./history.js");
Object.defineProperty(exports, "appendToHistory", { enumerable: true, get: function () { return history_js_1.appendToHistory; } });
Object.defineProperty(exports, "readHistoryFile", { enumerable: true, get: function () { return history_js_1.readHistoryFile; } });
Object.defineProperty(exports, "readTodayHistory", { enumerable: true, get: function () { return history_js_1.readTodayHistory; } });
Object.defineProperty(exports, "countTodayEvents", { enumerable: true, get: function () { return history_js_1.countTodayEvents; } });
Object.defineProperty(exports, "countPredictiveExtractionsToday", { enumerable: true, get: function () { return history_js_1.countPredictiveExtractionsToday; } });
Object.defineProperty(exports, "countJourneyExtractionsToday", { enumerable: true, get: function () { return history_js_1.countJourneyExtractionsToday; } });
Object.defineProperty(exports, "isDailyRateLimitReached", { enumerable: true, get: function () { return history_js_1.isDailyRateLimitReached; } });
Object.defineProperty(exports, "isJourneyRateLimitReached", { enumerable: true, get: function () { return history_js_1.isJourneyRateLimitReached; } });
Object.defineProperty(exports, "getHistoryFilesInRange", { enumerable: true, get: function () { return history_js_1.getHistoryFilesInRange; } });
Object.defineProperty(exports, "cleanupOldHistoryFiles", { enumerable: true, get: function () { return history_js_1.cleanupOldHistoryFiles; } });
Object.defineProperty(exports, "getHistoryDir", { enumerable: true, get: function () { return history_js_1.getHistoryDir; } });
Object.defineProperty(exports, "getHistoryFilePath", { enumerable: true, get: function () { return history_js_1.getHistoryFilePath; } });
Object.defineProperty(exports, "formatDate", { enumerable: true, get: function () { return history_js_1.formatDate; } });
Object.defineProperty(exports, "DEFAULT_LLKB_ROOT", { enumerable: true, get: function () { return history_js_1.DEFAULT_LLKB_ROOT; } });
// Analytics functions
var analytics_js_1 = require("./analytics.js");
Object.defineProperty(exports, "updateAnalytics", { enumerable: true, get: function () { return analytics_js_1.updateAnalytics; } });
Object.defineProperty(exports, "updateAnalyticsWithData", { enumerable: true, get: function () { return analytics_js_1.updateAnalyticsWithData; } });
Object.defineProperty(exports, "createEmptyAnalytics", { enumerable: true, get: function () { return analytics_js_1.createEmptyAnalytics; } });
Object.defineProperty(exports, "getAnalyticsSummary", { enumerable: true, get: function () { return analytics_js_1.getAnalyticsSummary; } });
var cli_js_1 = require("./cli.js");
Object.defineProperty(exports, "runHealthCheck", { enumerable: true, get: function () { return cli_js_1.runHealthCheck; } });
Object.defineProperty(exports, "getStats", { enumerable: true, get: function () { return cli_js_1.getStats; } });
Object.defineProperty(exports, "prune", { enumerable: true, get: function () { return cli_js_1.prune; } });
Object.defineProperty(exports, "formatHealthCheck", { enumerable: true, get: function () { return cli_js_1.formatHealthCheck; } });
Object.defineProperty(exports, "formatStats", { enumerable: true, get: function () { return cli_js_1.formatStats; } });
Object.defineProperty(exports, "formatPruneResult", { enumerable: true, get: function () { return cli_js_1.formatPruneResult; } });
var loaders_js_1 = require("./loaders.js");
Object.defineProperty(exports, "loadLLKBConfig", { enumerable: true, get: function () { return loaders_js_1.loadLLKBConfig; } });
Object.defineProperty(exports, "loadAppProfile", { enumerable: true, get: function () { return loaders_js_1.loadAppProfile; } });
Object.defineProperty(exports, "loadLessons", { enumerable: true, get: function () { return loaders_js_1.loadLessons; } });
Object.defineProperty(exports, "loadComponents", { enumerable: true, get: function () { return loaders_js_1.loadComponents; } });
Object.defineProperty(exports, "loadPatterns", { enumerable: true, get: function () { return loaders_js_1.loadPatterns; } });
Object.defineProperty(exports, "loadLLKBData", { enumerable: true, get: function () { return loaders_js_1.loadLLKBData; } });
Object.defineProperty(exports, "isLLKBEnabled", { enumerable: true, get: function () { return loaders_js_1.isLLKBEnabled; } });
Object.defineProperty(exports, "llkbExists", { enumerable: true, get: function () { return loaders_js_1.llkbExists; } });
var context_js_1 = require("./context.js");
Object.defineProperty(exports, "getRelevantContext", { enumerable: true, get: function () { return context_js_1.getRelevantContext; } });
Object.defineProperty(exports, "formatContextForPrompt", { enumerable: true, get: function () { return context_js_1.formatContextForPrompt; } });
Object.defineProperty(exports, "extractKeywords", { enumerable: true, get: function () { return context_js_1.extractKeywords; } });
Object.defineProperty(exports, "getRelevantScopes", { enumerable: true, get: function () { return context_js_1.getRelevantScopes; } });
var matching_js_1 = require("./matching.js");
Object.defineProperty(exports, "matchStepsToComponents", { enumerable: true, get: function () { return matching_js_1.matchStepsToComponents; } });
Object.defineProperty(exports, "shouldExtractAsComponent", { enumerable: true, get: function () { return matching_js_1.shouldExtractAsComponent; } });
Object.defineProperty(exports, "findExtractionCandidates", { enumerable: true, get: function () { return matching_js_1.findExtractionCandidates; } });
Object.defineProperty(exports, "extractStepKeywords", { enumerable: true, get: function () { return matching_js_1.extractStepKeywords; } });
var detection_js_1 = require("./detection.js");
Object.defineProperty(exports, "detectDuplicatesAcrossFiles", { enumerable: true, get: function () { return detection_js_1.detectDuplicatesAcrossFiles; } });
Object.defineProperty(exports, "detectDuplicatesInFile", { enumerable: true, get: function () { return detection_js_1.detectDuplicatesInFile; } });
Object.defineProperty(exports, "findUnusedComponentOpportunities", { enumerable: true, get: function () { return detection_js_1.findUnusedComponentOpportunities; } });
var registry_js_1 = require("./registry.js");
Object.defineProperty(exports, "createEmptyRegistry", { enumerable: true, get: function () { return registry_js_1.createEmptyRegistry; } });
Object.defineProperty(exports, "loadRegistry", { enumerable: true, get: function () { return registry_js_1.loadRegistry; } });
Object.defineProperty(exports, "saveRegistry", { enumerable: true, get: function () { return registry_js_1.saveRegistry; } });
Object.defineProperty(exports, "addComponentToRegistry", { enumerable: true, get: function () { return registry_js_1.addComponentToRegistry; } });
Object.defineProperty(exports, "removeComponentFromRegistry", { enumerable: true, get: function () { return registry_js_1.removeComponentFromRegistry; } });
Object.defineProperty(exports, "updateComponentInRegistry", { enumerable: true, get: function () { return registry_js_1.updateComponentInRegistry; } });
Object.defineProperty(exports, "getModuleForComponent", { enumerable: true, get: function () { return registry_js_1.getModuleForComponent; } });
Object.defineProperty(exports, "getImportPath", { enumerable: true, get: function () { return registry_js_1.getImportPath; } });
Object.defineProperty(exports, "listModules", { enumerable: true, get: function () { return registry_js_1.listModules; } });
Object.defineProperty(exports, "findModulesByCategory", { enumerable: true, get: function () { return registry_js_1.findModulesByCategory; } });
Object.defineProperty(exports, "validateRegistryConsistency", { enumerable: true, get: function () { return registry_js_1.validateRegistryConsistency; } });
Object.defineProperty(exports, "syncRegistryWithComponents", { enumerable: true, get: function () { return registry_js_1.syncRegistryWithComponents; } });
var migration_js_1 = require("./migration.js");
Object.defineProperty(exports, "CURRENT_VERSION", { enumerable: true, get: function () { return migration_js_1.CURRENT_VERSION; } });
Object.defineProperty(exports, "MIN_SUPPORTED_VERSION", { enumerable: true, get: function () { return migration_js_1.MIN_SUPPORTED_VERSION; } });
Object.defineProperty(exports, "parseVersion", { enumerable: true, get: function () { return migration_js_1.parseVersion; } });
Object.defineProperty(exports, "compareVersions", { enumerable: true, get: function () { return migration_js_1.compareVersions; } });
Object.defineProperty(exports, "isVersionSupported", { enumerable: true, get: function () { return migration_js_1.isVersionSupported; } });
Object.defineProperty(exports, "needsMigration", { enumerable: true, get: function () { return migration_js_1.needsMigration; } });
Object.defineProperty(exports, "migrateLLKB", { enumerable: true, get: function () { return migration_js_1.migrateLLKB; } });
Object.defineProperty(exports, "checkMigrationNeeded", { enumerable: true, get: function () { return migration_js_1.checkMigrationNeeded; } });
Object.defineProperty(exports, "initializeLLKB", { enumerable: true, get: function () { return migration_js_1.initializeLLKB; } });
Object.defineProperty(exports, "validateLLKBInstallation", { enumerable: true, get: function () { return migration_js_1.validateLLKBInstallation; } });
var search_js_1 = require("./search.js");
Object.defineProperty(exports, "search", { enumerable: true, get: function () { return search_js_1.search; } });
Object.defineProperty(exports, "findLessonsByPattern", { enumerable: true, get: function () { return search_js_1.findLessonsByPattern; } });
Object.defineProperty(exports, "findComponents", { enumerable: true, get: function () { return search_js_1.findComponents; } });
Object.defineProperty(exports, "getLessonsForJourney", { enumerable: true, get: function () { return search_js_1.getLessonsForJourney; } });
Object.defineProperty(exports, "getComponentsForJourney", { enumerable: true, get: function () { return search_js_1.getComponentsForJourney; } });
Object.defineProperty(exports, "exportLLKB", { enumerable: true, get: function () { return search_js_1.exportLLKB; } });
Object.defineProperty(exports, "generateReport", { enumerable: true, get: function () { return search_js_1.generateReport; } });
Object.defineProperty(exports, "exportToFile", { enumerable: true, get: function () { return search_js_1.exportToFile; } });
//# sourceMappingURL=index.js.map