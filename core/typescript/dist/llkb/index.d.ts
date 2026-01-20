/**
 * LLKB (Lessons Learned Knowledge Base) Type Definitions
 *
 * This module defines all TypeScript interfaces for the LLKB system:
 * - Lessons: Captured patterns and fixes from test development
 * - Components: Extracted reusable code modules
 * - Analytics: Usage statistics and performance metrics
 * - Configuration: LLKB behavior settings
 *
 * @module llkb/types
 */
/**
 * Valid LLKB categories for lessons and components
 *
 * Categories are used to organize and filter patterns:
 * - selector: DOM selection patterns
 * - timing: Wait and timing patterns
 * - quirk: App-specific quirks (lessons only, not components)
 * - auth: Authentication patterns
 * - data: Data handling and API patterns
 * - assertion: Test assertion patterns
 * - navigation: Page navigation patterns
 * - ui-interaction: General UI interaction patterns
 */
type LLKBCategory = 'selector' | 'timing' | 'quirk' | 'auth' | 'data' | 'assertion' | 'navigation' | 'ui-interaction';
/**
 * Categories valid for components (excludes 'quirk' which is lesson-only)
 */
type ComponentCategory = Exclude<LLKBCategory, 'quirk'>;
/**
 * Scope indicating where a pattern applies
 *
 * - universal: Works everywhere, could be in @artk/core
 * - framework:*: Framework-specific (angular, react, vue, ag-grid)
 * - app-specific: Unique to this application
 */
type LLKBScope = 'universal' | 'framework:angular' | 'framework:react' | 'framework:vue' | 'framework:ag-grid' | 'app-specific';
/**
 * Metrics tracking for a lesson's effectiveness
 */
interface LessonMetrics {
    /** Number of times the lesson was applied */
    occurrences: number;
    /** Ratio of successful applications (0.0 - 1.0) */
    successRate: number;
    /** Calculated confidence score (0.0 - 1.0) */
    confidence: number;
    /** First time the lesson was recorded (ISO 8601) */
    firstSeen: string;
    /** Most recent successful application (ISO 8601) */
    lastSuccess: string | null;
    /** Most recent application attempt (ISO 8601) */
    lastApplied: string | null;
    /** Historical confidence values for trend detection */
    confidenceHistory?: ConfidenceHistoryEntry[];
}
/**
 * A single entry in the confidence history
 */
interface ConfidenceHistoryEntry {
    /** Date of the confidence measurement (ISO 8601) */
    date: string;
    /** Confidence value at that time (0.0 - 1.0) */
    value: number;
}
/**
 * Validation status of a lesson
 */
interface LessonValidation {
    /** Whether a human has reviewed this lesson */
    humanReviewed: boolean;
    /** Date of human review (ISO 8601) */
    reviewedAt?: string;
    /** Who reviewed it */
    reviewedBy?: string;
}
/**
 * A captured lesson from test development
 *
 * Lessons are patterns, fixes, or knowledge learned during test creation
 * that can be applied to future similar situations.
 */
interface Lesson {
    /** Unique identifier (e.g., "L001") */
    id: string;
    /** Short descriptive title */
    title: string;
    /** The pattern or fix - what the lesson teaches */
    pattern: string;
    /** When to apply this lesson */
    trigger: string;
    /** Category classification */
    category: LLKBCategory;
    /** Where this lesson applies */
    scope: LLKBScope;
    /** Related Journey IDs */
    journeyIds: string[];
    /** Effectiveness metrics */
    metrics: LessonMetrics;
    /** Validation status */
    validation: LessonValidation;
    /** Optional tags for filtering */
    tags?: string[];
    /** Whether this lesson is archived */
    archived?: boolean;
}
/**
 * The lessons.json file structure
 */
interface LessonsFile {
    /** Schema version */
    version: string;
    /** Last modification timestamp (ISO 8601) */
    lastUpdated: string;
    /** Active lessons */
    lessons: Lesson[];
    /** Archived lessons (moved during prune) */
    archived: Lesson[];
    /** Global rules that apply everywhere */
    globalRules: GlobalRule[];
    /** App-specific quirks */
    appQuirks: AppQuirk[];
}
/**
 * A global rule that applies to all tests
 */
interface GlobalRule {
    /** Unique identifier */
    id: string;
    /** Rule description */
    description: string;
    /** When this rule applies */
    trigger: string;
    /** What to do */
    action: string;
}
/**
 * An app-specific quirk or workaround
 */
interface AppQuirk {
    /** Unique identifier */
    id: string;
    /** Quirk description */
    description: string;
    /** What triggers this quirk */
    trigger: string;
    /** The workaround */
    workaround: string;
    /** Related component or page */
    component?: string;
}
/**
 * Metrics tracking for a component's usage
 */
interface ComponentMetrics {
    /** Total number of times the component was used */
    totalUses: number;
    /** Ratio of successful uses (0.0 - 1.0) */
    successRate: number;
    /** Most recent use timestamp (ISO 8601) */
    lastUsed: string | null;
}
/**
 * Source information for an extracted component
 */
interface ComponentSource {
    /** Original code before extraction */
    originalCode: string;
    /** Journey ID where it was extracted from */
    extractedFrom: string;
    /** Which prompt extracted it */
    extractedBy: 'journey-implement' | 'journey-verify';
    /** Extraction timestamp (ISO 8601) */
    extractedAt: string;
}
/**
 * A reusable code component extracted from tests
 */
interface Component {
    /** Unique identifier (e.g., "COMP001") */
    id: string;
    /** Component name (function name) */
    name: string;
    /** Description of what it does */
    description: string;
    /** Category classification */
    category: ComponentCategory;
    /** Where this component applies */
    scope: LLKBScope;
    /** File path where the component lives */
    filePath: string;
    /** Usage metrics */
    metrics: ComponentMetrics;
    /** Source information */
    source: ComponentSource;
    /** Whether this component is archived */
    archived?: boolean;
}
/**
 * The components.json file structure
 */
interface ComponentsFile {
    /** Schema version */
    version: string;
    /** Last modification timestamp (ISO 8601) */
    lastUpdated: string;
    /** All components */
    components: Component[];
    /** Components organized by category */
    componentsByCategory: Record<ComponentCategory, string[]>;
    /** Components organized by scope */
    componentsByScope: Record<LLKBScope, string[]>;
}
/**
 * Overview statistics
 */
interface AnalyticsOverview {
    /** Total lessons in the system */
    totalLessons: number;
    /** Non-archived lessons */
    activeLessons: number;
    /** Archived lessons */
    archivedLessons: number;
    /** Total components */
    totalComponents: number;
    /** Non-archived components */
    activeComponents: number;
    /** Archived components */
    archivedComponents: number;
}
/**
 * Lesson statistics
 */
interface LessonStats {
    /** Count by category */
    byCategory: Record<LLKBCategory, number>;
    /** Average confidence across all active lessons */
    avgConfidence: number;
    /** Average success rate across all active lessons */
    avgSuccessRate: number;
}
/**
 * Component statistics
 */
interface ComponentStats {
    /** Count by category */
    byCategory: Record<ComponentCategory, number>;
    /** Count by scope */
    byScope: Record<LLKBScope, number>;
    /** Total reuses across all components */
    totalReuses: number;
    /** Average reuses per component */
    avgReusesPerComponent: number;
}
/**
 * Impact metrics showing LLKB effectiveness
 */
interface ImpactMetrics {
    /** Estimated test iterations saved by LLKB suggestions */
    verifyIterationsSaved: number;
    /** Average iterations before LLKB */
    avgIterationsBeforeLLKB: number;
    /** Average iterations after LLKB */
    avgIterationsAfterLLKB: number;
    /** Code deduplication achieved (0.0 - 1.0) */
    codeDeduplicationRate: number;
    /** Estimated hours saved */
    estimatedHoursSaved: number;
}
/**
 * Top performing items
 */
interface TopPerformers {
    /** Top lessons by (successRate * occurrences) */
    lessons: TopPerformerLesson[];
    /** Top components by totalUses */
    components: TopPerformerComponent[];
}
/**
 * A top performing lesson entry
 */
interface TopPerformerLesson {
    id: string;
    title: string;
    score: number;
}
/**
 * A top performing component entry
 */
interface TopPerformerComponent {
    id: string;
    name: string;
    uses: number;
}
/**
 * Items needing review
 */
interface NeedsReview {
    /** Lessons with low confidence (< 0.4) */
    lowConfidenceLessons: string[];
    /** Components with low usage */
    lowUsageComponents: string[];
    /** Lessons with declining success rate */
    decliningSuccessRate: string[];
}
/**
 * The analytics.json file structure
 */
interface AnalyticsFile {
    /** Schema version */
    version: string;
    /** Last update timestamp (ISO 8601) */
    lastUpdated: string;
    /** Overview statistics */
    overview: AnalyticsOverview;
    /** Lesson statistics */
    lessonStats: LessonStats;
    /** Component statistics */
    componentStats: ComponentStats;
    /** Impact metrics */
    impact: ImpactMetrics;
    /** Top performers */
    topPerformers: TopPerformers;
    /** Items needing review */
    needsReview: NeedsReview;
}
/**
 * Extraction configuration
 */
interface ExtractionConfig {
    /** Minimum occurrences before extraction (default: 2) */
    minOccurrences: number;
    /** Enable predictive extraction on first use */
    predictiveExtraction: boolean;
    /** Minimum confidence to auto-apply (default: 0.7) */
    confidenceThreshold: number;
    /** Max predictive extractions per journey run */
    maxPredictivePerJourney: number;
    /** Max predictive extractions per day */
    maxPredictivePerDay: number;
    /** Minimum code lines to extract */
    minLinesForExtraction: number;
    /** Similarity threshold for duplicate detection (default: 0.8) */
    similarityThreshold: number;
}
/**
 * Retention configuration
 */
interface RetentionConfig {
    /** Days before lesson marked stale */
    maxLessonAge: number;
    /** Demote lessons below this success rate */
    minSuccessRate: number;
    /** Archive components unused for N days */
    archiveUnused: number;
}
/**
 * History file management configuration
 */
interface HistoryConfig {
    /** Delete history files older than N days (default: 365) */
    retentionDays: number;
}
/**
 * Context injection configuration
 */
interface InjectionConfig {
    /** Sort injected context by confidence (highest first) */
    prioritizeByConfidence: boolean;
}
/**
 * Scope tracking configuration
 */
interface ScopesConfig {
    /** Track universal patterns */
    universal: boolean;
    /** Track framework-specific patterns */
    frameworkSpecific: boolean;
    /** Track app-specific patterns */
    appSpecific: boolean;
}
/**
 * Override mechanism configuration
 */
interface OverridesConfig {
    /** Allow user to override LLKB suggestions */
    allowUserOverride: boolean;
    /** Log overrides for analysis */
    logOverrides: boolean;
    /** Flag for review after N overrides */
    flagAfterOverrides: number;
}
/**
 * The config.yml file structure
 */
interface LLKBConfig {
    /** Schema version */
    version: string;
    /** Enable/disable LLKB */
    enabled: boolean;
    /** Extraction settings */
    extraction: ExtractionConfig;
    /** Retention policies */
    retention: RetentionConfig;
    /** History file settings */
    history: HistoryConfig;
    /** Context injection settings */
    injection: InjectionConfig;
    /** Scope tracking */
    scopes: ScopesConfig;
    /** Override mechanism */
    overrides: OverridesConfig;
}
/**
 * Base event structure for history logging
 */
interface BaseHistoryEvent {
    /** Event timestamp (ISO 8601) */
    timestamp: string;
    /** Journey ID if applicable */
    journeyId?: string;
    /** Source prompt */
    prompt: 'journey-implement' | 'journey-verify' | 'discover-foundation' | 'journey-clarify';
}
/**
 * Lesson application event
 */
interface LessonAppliedEvent extends BaseHistoryEvent {
    event: 'lesson_applied';
    lessonId: string;
    success: boolean;
    context?: string;
}
/**
 * Component extraction event
 */
interface ComponentExtractedEvent extends BaseHistoryEvent {
    event: 'component_extracted';
    componentId: string;
    extractionType: 'predictive' | 'reactive';
    sourceCode?: string;
}
/**
 * Component used event
 */
interface ComponentUsedEvent extends BaseHistoryEvent {
    event: 'component_used';
    componentId: string;
    success: boolean;
}
/**
 * Override event
 */
interface OverrideEvent extends BaseHistoryEvent {
    event: 'override';
    lessonId?: string;
    componentId?: string;
    reason?: string;
}
/**
 * Extraction deferred event (rate limit hit)
 */
interface ExtractionDeferredEvent extends BaseHistoryEvent {
    event: 'extraction_deferred';
    reason: 'rate_limit' | 'duplicate' | 'below_threshold';
    patternHash?: string;
}
/**
 * Union type of all history events
 */
type HistoryEvent = LessonAppliedEvent | ComponentExtractedEvent | ComponentUsedEvent | OverrideEvent | ExtractionDeferredEvent;
/**
 * Result of a file save operation
 */
interface SaveResult {
    success: boolean;
    error?: string;
}
/**
 * Result of a file update operation with locking
 */
interface UpdateResult {
    success: boolean;
    error?: string;
    retriesNeeded?: number;
}
/**
 * Extraction candidate for component extraction
 */
interface ExtractionCandidate {
    /** Normalized pattern code */
    pattern: string;
    /** Original code before normalization */
    originalCode: string;
    /** Number of occurrences */
    occurrences: number;
    /** Journeys where this pattern appears */
    journeys: string[];
    /** Files where this pattern appears */
    files: string[];
    /** Inferred category */
    category: ComponentCategory;
    /** Extraction score */
    score: number;
    /** Recommendation based on score */
    recommendation: 'EXTRACT_NOW' | 'CONSIDER' | 'SKIP';
}
/**
 * Test step for pattern analysis
 */
interface TestStep {
    /** File path */
    file: string;
    /** Journey ID */
    journey: string;
    /** Step name */
    stepName: string;
    /** Original code */
    code: string;
    /** Normalized code for comparison */
    normalizedCode: string;
    /** Hash of normalized code */
    hash: string;
    /** Starting line number */
    lineStart: number;
    /** Ending line number */
    lineEnd: number;
}

/**
 * Code Normalization for LLKB Pattern Matching
 *
 * Normalizes code strings for comparison by:
 * - Replacing string literals with placeholders
 * - Replacing numbers with placeholders
 * - Replacing variable names with placeholders
 * - Normalizing whitespace
 *
 * @module llkb/normalize
 */
/**
 * Normalize code for pattern comparison
 *
 * This function transforms code into a canonical form that allows
 * comparing the structure of code rather than specific values.
 *
 * @param code - The source code to normalize
 * @returns Normalized code string
 *
 * @example
 * ```typescript
 * const code1 = `const user = "john"; const count = 5;`;
 * const code2 = `const admin = "jane"; const total = 10;`;
 *
 * normalizeCode(code1) === normalizeCode(code2) // true
 * // Both become: "const <VAR> = <STRING>; const <VAR> = <NUMBER>;"
 * ```
 */
declare function normalizeCode(code: string): string;
/**
 * Generate a simple hash code from a string
 *
 * Uses a variant of the djb2 algorithm for fast hashing.
 * Not cryptographically secure, but good for deduplication.
 *
 * @param str - The string to hash
 * @returns A hash code as a hex string
 *
 * @example
 * ```typescript
 * hashCode("hello world") // "5e01db3e"
 * ```
 */
declare function hashCode(str: string): string;
/**
 * Tokenize code for Jaccard similarity calculation
 *
 * Splits code into meaningful tokens for comparison.
 *
 * @param code - The code to tokenize
 * @returns Set of tokens
 */
declare function tokenize(code: string): Set<string>;
/**
 * Count lines in a code string
 *
 * @param code - The code to count lines in
 * @returns Number of lines
 */
declare function countLines(code: string): number;

/**
 * Code Similarity Calculation for LLKB
 *
 * Provides functions to calculate similarity between code patterns
 * using a combination of Jaccard similarity and structural analysis.
 *
 * @module llkb/similarity
 */
/**
 * Calculate similarity between two code strings
 *
 * Uses a weighted combination of:
 * - Jaccard similarity on tokens (80%)
 * - Line count similarity (20%)
 *
 * @param codeA - First code string
 * @param codeB - Second code string
 * @returns Similarity score between 0.0 and 1.0
 *
 * @example
 * ```typescript
 * const similar = calculateSimilarity(
 *   `await page.click('#submit');`,
 *   `await page.click('#cancel');`
 * );
 * // Returns ~0.9 (very similar structure, different selector)
 * ```
 */
declare function calculateSimilarity(codeA: string, codeB: string): number;
/**
 * Calculate Jaccard similarity between two sets
 *
 * Jaccard index = |A ∩ B| / |A ∪ B|
 *
 * @param setA - First set
 * @param setB - Second set
 * @returns Jaccard similarity (0.0 - 1.0)
 */
declare function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number;
/**
 * Calculate similarity based on line counts
 *
 * Uses the formula: 1 - |diff| / max(a, b)
 *
 * @param linesA - Line count of first code
 * @param linesB - Line count of second code
 * @returns Line similarity (0.0 - 1.0)
 */
declare function lineCountSimilarity(linesA: number, linesB: number): number;
/**
 * Check if two code strings are near-duplicates
 *
 * Uses the configured similarity threshold (default 0.8)
 *
 * @param codeA - First code string
 * @param codeB - Second code string
 * @param threshold - Similarity threshold (default 0.8)
 * @returns true if similarity >= threshold
 */
declare function isNearDuplicate(codeA: string, codeB: string, threshold?: number): boolean;
/**
 * Find all near-duplicates of a pattern in a collection
 *
 * @param pattern - The pattern to find duplicates of
 * @param candidates - Array of candidate code strings
 * @param threshold - Similarity threshold (default 0.8)
 * @returns Array of indices of near-duplicate candidates
 */
declare function findNearDuplicates(pattern: string, candidates: string[], threshold?: number): number[];
/**
 * Result of a pattern similarity search
 */
interface SimilarPatternResult {
    /** The matched pattern */
    pattern: string;
    /** Similarity score (0.0 - 1.0) */
    similarity: number;
    /** Index in the original patterns array */
    index: number;
}
/**
 * Find similar patterns in a collection with similarity scores
 *
 * Returns all patterns that meet the threshold, sorted by similarity (highest first).
 *
 * @param target - The target code to find similar patterns for
 * @param patterns - Array of patterns to search
 * @param threshold - Minimum similarity threshold (default 0.8)
 * @returns Array of similar patterns with scores, sorted by similarity descending
 *
 * @example
 * ```typescript
 * const results = findSimilarPatterns(
 *   `await page.click('.submit')`,
 *   [`await page.click('.button')`, `await page.goto('/home')`],
 *   0.7
 * );
 * // Returns: [{ pattern: "await page.click('.button')", similarity: 0.95, index: 0 }]
 * ```
 */
declare function findSimilarPatterns(target: string, patterns: string[], threshold?: number): SimilarPatternResult[];

/**
 * Category Inference for LLKB
 *
 * Infers the category of code patterns based on keywords and patterns.
 *
 * @module llkb/inference
 */

/**
 * Infer the category of a code pattern
 *
 * Analyzes the code for keywords associated with each category
 * and returns the best matching category.
 *
 * @param code - The code to analyze
 * @returns The inferred category
 *
 * @example
 * ```typescript
 * inferCategory(`await page.goto('/login')`); // 'navigation'
 * inferCategory(`expect(toast).toBeVisible()`); // 'assertion'
 * inferCategory(`await page.click('#submit')`); // 'ui-interaction'
 * ```
 */
declare function inferCategory(code: string): ComponentCategory;
/**
 * Infer category with confidence score
 *
 * Returns both the category and a confidence score based on
 * how many matching keywords were found.
 *
 * @param code - The code to analyze
 * @returns Object with category and confidence
 *
 * @example
 * ```typescript
 * inferCategoryWithConfidence(`await page.goto('/login'); await expect(page).toHaveURL('/login');`);
 * // { category: 'navigation', confidence: 0.8, matchCount: 2 }
 * ```
 */
declare function inferCategoryWithConfidence(code: string): {
    category: ComponentCategory;
    confidence: number;
    matchCount: number;
};
/**
 * Check if a category is valid for components
 *
 * 'quirk' is a lesson-only category and cannot be used for components.
 *
 * @param category - The category to check
 * @returns true if valid for components
 */
declare function isComponentCategory(category: LLKBCategory): category is ComponentCategory;
/**
 * Get all valid categories
 *
 * @returns Array of all valid category names
 */
declare function getAllCategories(): LLKBCategory[];
/**
 * Get all valid component categories
 *
 * @returns Array of valid component category names
 */
declare function getComponentCategories(): ComponentCategory[];

/**
 * Confidence Calculation for LLKB Lessons
 *
 * Provides functions to calculate and track lesson confidence scores.
 *
 * @module llkb/confidence
 */

/**
 * Maximum entries to keep in confidence history
 * Prevents unbounded growth while preserving useful trend data
 */
declare const MAX_CONFIDENCE_HISTORY_ENTRIES = 100;
/**
 * Number of days to retain in confidence history
 */
declare const CONFIDENCE_HISTORY_RETENTION_DAYS = 90;
/**
 * Calculate the confidence score for a lesson
 *
 * The confidence formula combines:
 * - Base score from occurrence count (more uses = higher confidence)
 * - Recency factor (recent success = higher confidence)
 * - Success factor (higher success rate = higher confidence)
 * - Validation boost (human-reviewed lessons get a boost)
 *
 * @param lesson - The lesson to calculate confidence for
 * @returns Confidence score between 0.0 and 1.0
 *
 * @example
 * ```typescript
 * const confidence = calculateConfidence(lesson);
 * if (confidence >= 0.7) {
 *   // Auto-apply this lesson
 * }
 * ```
 */
declare function calculateConfidence(lesson: Lesson): number;
/**
 * Detect if a lesson has declining confidence
 *
 * Compares current confidence to the 30-day rolling average.
 * A decline of 20% or more triggers this detection.
 *
 * @param lesson - The lesson to check
 * @returns true if confidence is declining significantly
 *
 * @example
 * ```typescript
 * if (detectDecliningConfidence(lesson)) {
 *   // Flag for review
 *   analytics.needsReview.decliningSuccessRate.push(lesson.id);
 * }
 * ```
 */
declare function detectDecliningConfidence(lesson: Lesson): boolean;
/**
 * Update the confidence history for a lesson
 *
 * Adds the current confidence to the history and prunes old entries.
 *
 * @param lesson - The lesson to update
 * @returns Updated confidence history array
 */
declare function updateConfidenceHistory(lesson: Lesson): ConfidenceHistoryEntry[];
/**
 * Get the confidence trend direction
 *
 * @param history - Confidence history entries
 * @returns 'increasing', 'decreasing', 'stable', or 'unknown'
 */
declare function getConfidenceTrend(history: ConfidenceHistoryEntry[]): 'increasing' | 'decreasing' | 'stable' | 'unknown';
/**
 * Calculate the number of days between two dates
 *
 * @param date1 - First date
 * @param date2 - Second date
 * @returns Number of days (can be fractional)
 */
declare function daysBetween(date1: Date, date2: Date): number;
/**
 * Check if a lesson should be flagged for review based on confidence
 *
 * @param lesson - The lesson to check
 * @param threshold - Low confidence threshold (default 0.4)
 * @returns true if lesson needs review
 */
declare function needsConfidenceReview(lesson: Lesson, threshold?: number): boolean;

/**
 * File Utilities for LLKB
 *
 * Provides safe file operations including atomic writes and file locking
 * to prevent data corruption from concurrent access.
 *
 * @module llkb/file-utils
 */

/**
 * Maximum wait time for acquiring a lock (in milliseconds)
 */
declare const LOCK_MAX_WAIT_MS = 5000;
/**
 * Stale lock threshold (in milliseconds)
 * Locks older than this are considered abandoned
 */
declare const STALE_LOCK_THRESHOLD_MS = 30000;
/**
 * Retry interval when waiting for a lock (in milliseconds)
 */
declare const LOCK_RETRY_INTERVAL_MS = 50;
/**
 * Save JSON data atomically
 *
 * Writes to a temporary file first, then renames to the target path.
 * This ensures the file is either fully written or not written at all.
 *
 * @param filePath - Target file path
 * @param data - Data to write
 * @returns SaveResult indicating success or failure
 *
 * @example
 * ```typescript
 * const result = await saveJSONAtomic('.artk/llkb/lessons.json', lessons);
 * if (!result.success) {
 *   console.error('Failed to save:', result.error);
 * }
 * ```
 */
declare function saveJSONAtomic(filePath: string, data: unknown): Promise<SaveResult>;
/**
 * Synchronous version of saveJSONAtomic
 *
 * @param filePath - Target file path
 * @param data - Data to write
 * @returns SaveResult indicating success or failure
 */
declare function saveJSONAtomicSync(filePath: string, data: unknown): SaveResult;
/**
 * Update a JSON file with locking
 *
 * Reads the file, applies an update function, and saves atomically.
 * Uses file locking to prevent concurrent modifications.
 *
 * @param filePath - Path to the JSON file
 * @param updateFn - Function that receives current data and returns updated data
 * @returns UpdateResult indicating success or failure
 *
 * @example
 * ```typescript
 * const result = await updateJSONWithLock(
 *   '.artk/llkb/lessons.json',
 *   (lessons) => {
 *     lessons.lessons.push(newLesson);
 *     return lessons;
 *   }
 * );
 * ```
 */
declare function updateJSONWithLock<T>(filePath: string, updateFn: (data: T) => T): Promise<UpdateResult>;
/**
 * Synchronous version of updateJSONWithLock
 *
 * @param filePath - Path to the JSON file
 * @param updateFn - Function that receives current data and returns updated data
 * @returns UpdateResult indicating success or failure
 */
declare function updateJSONWithLockSync<T>(filePath: string, updateFn: (data: T) => T): UpdateResult;
/**
 * Load JSON file with error handling
 *
 * @param filePath - Path to the JSON file
 * @returns Parsed JSON data or null if file doesn't exist
 * @throws Error if file exists but is invalid JSON
 */
declare function loadJSON<T>(filePath: string): T | null;
/**
 * Ensure a directory exists
 *
 * @param dirPath - Directory path to ensure
 */
declare function ensureDir(dirPath: string): void;

/**
 * History Logging for LLKB
 *
 * Provides functions for logging LLKB events to history files.
 * History files are append-only JSONL (JSON Lines) format.
 *
 * @module llkb/history
 */

/**
 * Default LLKB root directory
 */
declare const DEFAULT_LLKB_ROOT = ".artk/llkb";
/**
 * Get the history directory path
 *
 * @param llkbRoot - Root LLKB directory (default: .artk/llkb)
 * @returns Path to the history directory
 */
declare function getHistoryDir(llkbRoot?: string): string;
/**
 * Get the history file path for a specific date
 *
 * @param date - The date for the history file
 * @param llkbRoot - Root LLKB directory
 * @returns Path to the history file (YYYY-MM-DD.jsonl)
 */
declare function getHistoryFilePath(date?: Date, llkbRoot?: string): string;
/**
 * Format a date as YYYY-MM-DD
 *
 * @param date - The date to format
 * @returns Formatted date string
 */
declare function formatDate(date: Date): string;
/**
 * Append an event to the history file
 *
 * Creates the history directory and file if they don't exist.
 * Uses graceful degradation - logs warning but doesn't throw on failure.
 *
 * @param event - The event to log
 * @param llkbRoot - Root LLKB directory
 * @returns true if successful, false otherwise
 *
 * @example
 * ```typescript
 * appendToHistory({
 *   event: 'lesson_applied',
 *   timestamp: new Date().toISOString(),
 *   lessonId: 'L001',
 *   success: true,
 *   prompt: 'journey-implement'
 * });
 * ```
 */
declare function appendToHistory(event: HistoryEvent, llkbRoot?: string): boolean;
/**
 * Read events from a history file
 *
 * @param filePath - Path to the history file
 * @returns Array of events, or empty array if file doesn't exist
 */
declare function readHistoryFile(filePath: string): HistoryEvent[];
/**
 * Read today's history events
 *
 * @param llkbRoot - Root LLKB directory
 * @returns Array of today's events
 */
declare function readTodayHistory(llkbRoot?: string): HistoryEvent[];
/**
 * Count events of a specific type from today's history
 *
 * @param eventType - The event type to count
 * @param filter - Optional additional filter function
 * @param llkbRoot - Root LLKB directory
 * @returns Count of matching events
 */
declare function countTodayEvents(eventType: HistoryEvent['event'], filter?: (event: HistoryEvent) => boolean, llkbRoot?: string): number;
/**
 * Count predictive extractions for today
 *
 * Used for rate limiting in journey-implement.
 *
 * @param llkbRoot - Root LLKB directory
 * @returns Number of predictive extractions today
 *
 * @example
 * ```typescript
 * const count = countPredictiveExtractionsToday();
 * if (count >= config.extraction.maxPredictivePerDay) {
 *   // Rate limit reached
 * }
 * ```
 */
declare function countPredictiveExtractionsToday(llkbRoot?: string): number;
/**
 * Count predictive extractions for a specific journey today
 *
 * @param journeyId - The journey ID to check
 * @param llkbRoot - Root LLKB directory
 * @returns Number of extractions for this journey today
 */
declare function countJourneyExtractionsToday(journeyId: string, llkbRoot?: string): number;
/**
 * Check if daily extraction rate limit is reached
 *
 * @param config - LLKB configuration
 * @param llkbRoot - Root LLKB directory
 * @returns true if rate limit is reached
 */
declare function isDailyRateLimitReached(config: LLKBConfig, llkbRoot?: string): boolean;
/**
 * Check if journey extraction rate limit is reached
 *
 * @param journeyId - The journey ID to check
 * @param config - LLKB configuration
 * @param llkbRoot - Root LLKB directory
 * @returns true if rate limit is reached
 */
declare function isJourneyRateLimitReached(journeyId: string, config: LLKBConfig, llkbRoot?: string): boolean;
/**
 * Get all history files in date range
 *
 * @param startDate - Start date (inclusive)
 * @param endDate - End date (inclusive)
 * @param llkbRoot - Root LLKB directory
 * @returns Array of history file paths
 */
declare function getHistoryFilesInRange(startDate: Date, endDate: Date, llkbRoot?: string): string[];
/**
 * Clean up old history files
 *
 * Deletes history files older than the retention period.
 *
 * @param retentionDays - Number of days to retain (default: 365)
 * @param llkbRoot - Root LLKB directory
 * @returns Array of deleted file paths
 */
declare function cleanupOldHistoryFiles(retentionDays?: number, llkbRoot?: string): string[];

/**
 * Analytics Update for LLKB
 *
 * Provides functions to calculate and update LLKB analytics.
 *
 * @module llkb/analytics
 */

/**
 * Update analytics.json based on current lessons and components
 *
 * This function recalculates all statistics and saves the updated analytics.
 *
 * @param llkbRoot - Root LLKB directory
 * @returns true if successful, false otherwise
 *
 * @example
 * ```typescript
 * // Call after modifying lessons or components
 * updateAnalytics();
 * ```
 */
declare function updateAnalytics(llkbRoot?: string): boolean;
/**
 * Update analytics with provided data (for testing or when data is already loaded)
 *
 * @param lessons - Lessons data
 * @param components - Components data
 * @param analyticsPath - Path to save analytics
 * @returns true if successful
 */
declare function updateAnalyticsWithData(lessons: LessonsFile, components: ComponentsFile, analyticsPath: string): boolean;
/**
 * Create an empty analytics structure
 */
declare function createEmptyAnalytics(): AnalyticsFile;
/**
 * Get analytics summary as a formatted string
 *
 * @param llkbRoot - Root LLKB directory
 * @returns Formatted summary string
 */
declare function getAnalyticsSummary(llkbRoot?: string): string;

/**
 * CLI Commands for LLKB
 *
 * Provides command-line interface functions for LLKB management.
 *
 * @module llkb/cli
 */
/**
 * Health check result
 */
interface HealthCheckResult {
    status: 'healthy' | 'warning' | 'error';
    checks: HealthCheck[];
    summary: string;
}
/**
 * Individual health check
 */
interface HealthCheck {
    name: string;
    status: 'pass' | 'warn' | 'fail';
    message: string;
    details?: string;
}
/**
 * Stats result
 */
interface StatsResult {
    lessons: {
        total: number;
        active: number;
        archived: number;
        avgConfidence: number;
        avgSuccessRate: number;
        needsReview: number;
    };
    components: {
        total: number;
        active: number;
        archived: number;
        totalReuses: number;
        avgReusesPerComponent: number;
    };
    history: {
        todayEvents: number;
        historyFiles: number;
        oldestFile: string | null;
        newestFile: string | null;
    };
}
/**
 * Prune result
 */
interface PruneResult {
    historyFilesDeleted: number;
    deletedFiles: string[];
    archivedLessons: number;
    archivedComponents: number;
    errors: string[];
}
/**
 * Run health check on LLKB
 *
 * Verifies that:
 * - All required files exist
 * - JSON files are valid
 * - No data corruption detected
 * - Configuration is valid
 *
 * @param llkbRoot - Root LLKB directory
 * @returns Health check result
 *
 * @example
 * ```typescript
 * const result = runHealthCheck();
 * if (result.status === 'error') {
 *   console.error('LLKB needs attention:', result.summary);
 * }
 * ```
 */
declare function runHealthCheck(llkbRoot?: string): HealthCheckResult;
/**
 * Get LLKB statistics
 *
 * @param llkbRoot - Root LLKB directory
 * @returns Statistics about LLKB contents
 *
 * @example
 * ```typescript
 * const stats = getStats();
 * console.log(`Total lessons: ${stats.lessons.total}`);
 * console.log(`Total reuses: ${stats.components.totalReuses}`);
 * ```
 */
declare function getStats(llkbRoot?: string): StatsResult;
/**
 * Prune old history files and optionally archive stale items
 *
 * @param options - Prune options
 * @returns Prune result with counts of deleted/archived items
 *
 * @example
 * ```typescript
 * const result = prune({ historyRetentionDays: 90 });
 * console.log(`Deleted ${result.historyFilesDeleted} old history files`);
 * ```
 */
declare function prune(options?: {
    llkbRoot?: string;
    historyRetentionDays?: number;
    archiveInactiveLessons?: boolean;
    archiveInactiveComponents?: boolean;
    inactiveDays?: number;
}): PruneResult;
/**
 * Format health check result for console output
 *
 * @param result - Health check result
 * @returns Formatted string for console
 */
declare function formatHealthCheck(result: HealthCheckResult): string;
/**
 * Format stats result for console output
 *
 * @param stats - Stats result
 * @returns Formatted string for console
 */
declare function formatStats(stats: StatsResult): string;
/**
 * Format prune result for console output
 *
 * @param result - Prune result
 * @returns Formatted string for console
 */
declare function formatPruneResult(result: PruneResult): string;

/**
 * LLKB Data Loaders
 *
 * Functions for loading and validating LLKB configuration and data files.
 *
 * @module @artk/llkb/loaders
 */

/**
 * App profile structure from app-profile.json
 */
interface AppProfile {
    version: string;
    createdBy: string;
    lastUpdated: string;
    application: {
        name: string;
        framework: 'angular' | 'react' | 'vue' | 'nextjs' | 'other';
        uiLibrary: 'material' | 'antd' | 'primeng' | 'bootstrap' | 'custom' | 'none';
        dataGrid: 'ag-grid' | 'tanstack-table' | 'custom' | 'none';
        authProvider: 'azure-ad' | 'okta' | 'auth0' | 'cognito' | 'custom' | 'none';
        stateManagement: 'ngrx' | 'redux' | 'zustand' | 'none';
    };
    testability: {
        testIdAttribute: string;
        testIdCoverage: 'high' | 'medium' | 'low';
        ariaCoverage: 'high' | 'medium' | 'low';
        asyncComplexity: 'high' | 'medium' | 'low';
    };
    environment: {
        baseUrls: Record<string, string>;
        authBypass: {
            available: boolean;
            method: 'storage-state' | 'api-token' | 'mock-user' | 'none';
        };
    };
}
/**
 * Pattern file structure
 */
interface PatternFile {
    version: string;
    [key: string]: unknown;
}
/**
 * Selector patterns file
 */
interface SelectorPatterns extends PatternFile {
    selectorPriority: {
        order: Array<{
            type: string;
            reliability: number;
            note?: string;
        }>;
    };
    selectorPatterns: Array<{
        id: string;
        name: string;
        context: string;
        problem: string;
        solution: string;
        template: string;
        applicableTo: string[];
        confidence: number;
    }>;
    avoidSelectors: Array<{
        pattern: string;
        reason: string;
    }>;
    preferredSelectors: Array<{
        pattern: string;
        priority: number;
        reason: string;
    }>;
}
/**
 * Timing patterns file
 */
interface TimingPatterns extends PatternFile {
    asyncPatterns: Array<{
        id: string;
        name: string;
        context: string;
        pattern: string;
        observedDelays: {
            min: number;
            avg: number;
            max: number;
            p95: number;
        };
        recommendation: string;
    }>;
    loadingIndicators: Array<{
        component: string;
        indicator: string;
        avgLoadTime: number;
        maxObservedTime: number;
        waitStrategy: string;
    }>;
    networkPatterns: Array<{
        endpoint: string;
        avgResponseTime: number;
        p95ResponseTime: number;
        retryRecommended: boolean;
        maxRetries: number;
    }>;
    forbiddenPatterns: Array<{
        pattern: string;
        severity: 'error' | 'warning';
        alternative: string;
    }>;
}
/**
 * Assertion patterns file
 */
interface AssertionPatterns extends PatternFile {
    commonAssertions: Array<{
        id: string;
        name: string;
        pattern: string;
        usageContext: string;
        componentRef?: string;
    }>;
    assertionHelpers: Array<{
        name: string;
        module: string;
        signature: string;
        scope: LLKBScope;
    }>;
}
/**
 * All patterns combined
 */
interface LLKBPatterns {
    selectors?: SelectorPatterns;
    timing?: TimingPatterns;
    assertions?: AssertionPatterns;
    data?: PatternFile;
    auth?: PatternFile;
}
/**
 * Filter options for loading lessons
 */
interface LessonFilterOptions {
    category?: LLKBCategory | LLKBCategory[];
    scope?: LLKBScope | LLKBScope[];
    minConfidence?: number;
    tags?: string[];
    includeArchived?: boolean;
}
/**
 * Filter options for loading components
 */
interface ComponentFilterOptions {
    category?: LLKBCategory | LLKBCategory[];
    scope?: LLKBScope | LLKBScope[];
    minConfidence?: number;
    includeArchived?: boolean;
}
/**
 * Loaded LLKB data bundle
 */
interface LLKBData {
    config: LLKBConfig;
    appProfile: AppProfile | null;
    lessons: LessonsFile;
    components: ComponentsFile;
    patterns: LLKBPatterns;
}
/**
 * Load LLKB configuration from config.yml
 *
 * @param llkbRoot - Root directory of LLKB (default: .artk/llkb)
 * @returns Loaded config or default if not found
 */
declare function loadLLKBConfig(llkbRoot?: string): LLKBConfig;
/**
 * Check if LLKB is enabled
 */
declare function isLLKBEnabled(llkbRoot?: string): boolean;
/**
 * Load app profile from app-profile.json
 *
 * @param llkbRoot - Root directory of LLKB
 * @returns App profile or null if not found
 */
declare function loadAppProfile(llkbRoot?: string): AppProfile | null;
/**
 * Load lessons with optional filtering
 *
 * @param llkbRoot - Root directory of LLKB
 * @param options - Filter options
 * @returns Filtered lessons array
 */
declare function loadLessons(llkbRoot?: string, options?: LessonFilterOptions): Lesson[];
/**
 * Load components with optional filtering
 *
 * @param llkbRoot - Root directory of LLKB
 * @param options - Filter options
 * @returns Filtered components array
 */
declare function loadComponents(llkbRoot?: string, options?: ComponentFilterOptions): Component[];
/**
 * Load all pattern files
 *
 * @param llkbRoot - Root directory of LLKB
 * @returns All loaded patterns
 */
declare function loadPatterns(llkbRoot?: string): LLKBPatterns;
/**
 * Load all LLKB data in one call
 *
 * @param llkbRoot - Root directory of LLKB
 * @returns Complete LLKB data bundle
 */
declare function loadLLKBData(llkbRoot?: string): LLKBData;
/**
 * Check if LLKB exists at the given path
 *
 * @param llkbRoot - Root directory to check
 * @returns True if LLKB structure exists
 */
declare function llkbExists(llkbRoot?: string): boolean;

/**
 * LLKB Context Injection
 *
 * Functions for filtering and prioritizing LLKB data based on journey context.
 * Used to inject relevant lessons, components, and patterns into prompts.
 *
 * @module @artk/llkb/context
 */

/**
 * Journey context for filtering LLKB data
 */
interface JourneyContext {
    /** Journey ID (e.g., JRN-0001) */
    id: string;
    /** Journey scope (e.g., "orders", "catalog") */
    scope: string;
    /** Journey title */
    title: string;
    /** Inferred routes from journey */
    routes?: string[];
    /** Keywords extracted from journey steps */
    keywords?: string[];
    /** Categories of actions in the journey */
    categories?: LLKBCategory[];
}
/**
 * Filtered and prioritized LLKB context
 */
interface RelevantContext {
    /** Filtered lessons sorted by relevance */
    lessons: ScoredLesson[];
    /** Filtered components sorted by relevance */
    components: ScoredComponent[];
    /** Relevant app quirks */
    quirks: AppQuirkInfo[];
    /** Relevant selector patterns */
    selectorPatterns: SelectorPatternInfo[];
    /** Relevant timing patterns */
    timingPatterns: TimingPatternInfo[];
    /** Summary statistics */
    summary: ContextSummary;
}
/**
 * Lesson with relevance score
 */
interface ScoredLesson extends Lesson {
    relevanceScore: number;
    matchReasons: string[];
}
/**
 * Component with relevance score
 */
interface ScoredComponent extends Component {
    relevanceScore: number;
    matchReasons: string[];
}
/**
 * App quirk info for context
 */
interface AppQuirkInfo {
    id: string;
    component: string;
    location: string;
    quirk: string;
    impact: string;
    workaround: string;
}
/**
 * Selector pattern info for context
 */
interface SelectorPatternInfo {
    id: string;
    name: string;
    template: string;
    confidence: number;
}
/**
 * Timing pattern info for context
 */
interface TimingPatternInfo {
    id: string;
    name: string;
    pattern: string;
    recommendation: string;
}
/**
 * Summary of injected context
 */
interface ContextSummary {
    totalLessons: number;
    totalComponents: number;
    totalQuirks: number;
    avgLessonConfidence: number;
    avgComponentSuccessRate: number;
    topCategories: string[];
}
/**
 * Get relevant LLKB context for a journey
 *
 * @param journey - Journey context for filtering
 * @param lessons - All available lessons
 * @param components - All available components
 * @param config - LLKB configuration
 * @param appProfile - Application profile
 * @param patterns - Pattern files
 * @returns Filtered and prioritized context
 */
declare function getRelevantContext(journey: JourneyContext, lessons: Lesson[], components: Component[], config: LLKBConfig, appProfile?: AppProfile | null, patterns?: LLKBPatterns): RelevantContext;
/**
 * Extract keywords from journey context
 */
declare function extractKeywords(journey: JourneyContext): string[];
/**
 * Format context for prompt injection
 *
 * @param context - Relevant context to format
 * @param journey - Journey context
 * @returns Markdown-formatted context string
 */
declare function formatContextForPrompt(context: RelevantContext, journey: JourneyContext): string;
/**
 * Get scopes relevant to the app profile
 */
declare function getRelevantScopes(appProfile: AppProfile | null): LLKBScope[];

/**
 * LLKB Component Matching Module
 *
 * This module provides functions to match journey steps to existing components
 * and determine whether code should be extracted as a reusable component.
 *
 * @module llkb/matching
 */

/**
 * A journey step to match against components
 */
interface JourneyStep {
    /** Step name or description */
    name: string;
    /** Step description (if separate from name) */
    description?: string;
    /** Action keywords (verify, navigate, click, etc.) */
    keywords?: string[];
    /** The journey scope */
    scope?: string;
    /** Inline code if available */
    code?: string;
}
/**
 * Result of matching a step to a component
 */
interface StepMatchResult {
    /** The step that was matched */
    step: JourneyStep;
    /** Matched component (if any) */
    component: Component | null;
    /** Match score (0.0 - 1.0) */
    score: number;
    /** Match recommendation */
    recommendation: 'USE' | 'SUGGEST' | 'NONE';
    /** Reason for the recommendation */
    reason: string;
}
/**
 * Options for step matching
 */
interface MatchOptions {
    /** Minimum score to use component (default: 0.7) */
    useThreshold?: number;
    /** Minimum score to suggest component (default: 0.4) */
    suggestThreshold?: number;
    /** App framework for scope filtering */
    appFramework?: string;
    /** Filter by categories */
    categories?: ComponentCategory[];
}
/**
 * Result of extraction check
 */
interface ExtractionCheckResult {
    /** Whether the code should be extracted */
    shouldExtract: boolean;
    /** Confidence score (0.0 - 1.0) */
    confidence: number;
    /** Reason for the decision */
    reason: string;
    /** Suggested component category */
    suggestedCategory?: ComponentCategory;
    /** Suggested module path */
    suggestedPath?: string;
}
/**
 * Pattern occurrence info for extraction analysis
 */
interface PatternOccurrence {
    /** File path */
    file: string;
    /** Journey ID */
    journeyId: string;
    /** Step name */
    stepName: string;
    /** Line start */
    lineStart: number;
    /** Line end */
    lineEnd: number;
}
/**
 * Extract keywords from a journey step
 */
declare function extractStepKeywords(step: JourneyStep): string[];
/**
 * Match journey steps to existing components
 *
 * For each step, finds the best matching component and provides
 * a recommendation on whether to use it, suggest it, or skip.
 *
 * @param steps - Array of journey steps to match
 * @param components - Available components to match against
 * @param options - Matching options
 * @returns Array of match results for each step
 *
 * @example
 * ```typescript
 * const results = matchStepsToComponents(
 *   [{ name: 'Verify sidebar is ready', scope: 'orders' }],
 *   components,
 *   { appFramework: 'angular', useThreshold: 0.7 }
 * );
 * ```
 */
declare function matchStepsToComponents(steps: JourneyStep[], components: Component[], options?: MatchOptions): StepMatchResult[];
/**
 * Determine if code should be extracted as a reusable component
 *
 * Analyzes code patterns, occurrences, and configuration to decide
 * whether to extract the code into a reusable module.
 *
 * @param code - The code to analyze
 * @param occurrences - Where this pattern appears
 * @param config - LLKB configuration
 * @param existingComponents - Existing components to check for duplicates
 * @returns Extraction check result with recommendation
 *
 * @example
 * ```typescript
 * const result = shouldExtractAsComponent(
 *   'await page.waitForSelector(".sidebar");',
 *   [{ file: 'test1.spec.ts', journeyId: 'JRN-001', stepName: 'Verify sidebar', lineStart: 10, lineEnd: 15 }],
 *   config,
 *   existingComponents
 * );
 * if (result.shouldExtract) {
 *   // Extract as component
 * }
 * ```
 */
declare function shouldExtractAsComponent(code: string, occurrences: PatternOccurrence[], config: LLKBConfig, existingComponents?: Component[]): ExtractionCheckResult;
/**
 * Analyze multiple code snippets and identify extraction candidates
 *
 * Groups similar code patterns and recommends which ones to extract.
 *
 * @param codeSnippets - Array of code snippets with metadata
 * @param config - LLKB configuration
 * @param existingComponents - Existing components
 * @returns Array of extraction candidates sorted by score
 */
declare function findExtractionCandidates(codeSnippets: Array<{
    code: string;
    file: string;
    journeyId: string;
    stepName: string;
    lineStart: number;
    lineEnd: number;
}>, config: LLKBConfig, existingComponents?: Component[]): ExtractionCandidate[];

/**
 * LLKB Cross-Journey Detection Module
 *
 * This module provides functions to detect duplicate patterns across
 * multiple journey test files and identify extraction opportunities.
 *
 * @module llkb/detection
 */

/**
 * Result of duplicate detection across files
 */
interface DuplicateDetectionResult {
    /** All test steps extracted from files */
    totalSteps: number;
    /** Number of unique patterns found */
    uniquePatterns: number;
    /** Number of duplicate patterns found */
    duplicatePatterns: number;
    /** Duplicate groups with their occurrences */
    duplicateGroups: DuplicateGroup[];
    /** Extraction candidates (sorted by priority) */
    extractionCandidates: ExtractionCandidate[];
    /** Files analyzed */
    filesAnalyzed: string[];
}
/**
 * A group of duplicate patterns
 */
interface DuplicateGroup {
    /** Hash of the normalized pattern */
    patternHash: string;
    /** Normalized pattern code */
    normalizedCode: string;
    /** Original code samples */
    originalSamples: string[];
    /** All occurrences */
    occurrences: TestStep[];
    /** Number of unique journeys */
    uniqueJourneys: number;
    /** Number of unique files */
    uniqueFiles: number;
    /** Inferred category */
    category: string;
    /** Similarity score between occurrences */
    internalSimilarity: number;
}
/**
 * Options for duplicate detection
 */
interface DetectionOptions {
    /** Minimum similarity threshold (default: 0.8) */
    similarityThreshold?: number;
    /** Minimum occurrences to report (default: 2) */
    minOccurrences?: number;
    /** Minimum lines for a pattern (default: 3) */
    minLines?: number;
    /** Include archived patterns */
    includeArchived?: boolean;
    /** File extensions to scan (default: ['.ts', '.js']) */
    extensions?: string[];
    /** Directories to exclude */
    excludeDirs?: string[];
}
/**
 * Detect duplicate patterns across multiple test files
 *
 * Scans test files for test.step blocks, normalizes the code,
 * and groups similar patterns to identify extraction opportunities.
 *
 * @param testDir - Directory containing test files
 * @param options - Detection options
 * @returns Duplicate detection result with groups and candidates
 *
 * @example
 * ```typescript
 * const result = detectDuplicatesAcrossFiles(
 *   'artk-e2e/tests',
 *   { similarityThreshold: 0.8, minOccurrences: 2 }
 * );
 * console.log(`Found ${result.duplicatePatterns} duplicate patterns`);
 * ```
 */
declare function detectDuplicatesAcrossFiles(testDir: string, options?: DetectionOptions): DuplicateDetectionResult;
/**
 * Detect duplicates within a single file
 *
 * @param filePath - Path to the test file
 * @param options - Detection options
 * @returns Duplicate detection result
 */
declare function detectDuplicatesInFile(filePath: string, options?: DetectionOptions): DuplicateDetectionResult;
/**
 * Find patterns in test files that match existing components
 *
 * Useful for identifying code that should be refactored to use components.
 *
 * @param testDir - Directory containing test files
 * @param components - Existing components to match against
 * @param options - Detection options
 * @returns Array of matches with component and location
 */
declare function findUnusedComponentOpportunities(testDir: string, components: Component[], options?: DetectionOptions): Array<{
    component: Component;
    matches: Array<{
        file: string;
        stepName: string;
        similarity: number;
        lineStart: number;
        lineEnd: number;
    }>;
}>;

/**
 * LLKB Module Registry Module
 *
 * This module provides functions to manage the module registry,
 * which tracks all exported components and their metadata.
 *
 * @module llkb/registry
 */

/**
 * An export entry in the module registry
 */
interface ModuleExport {
    /** Export name */
    name: string;
    /** Export type (async function, function, class, const) */
    type: 'async function' | 'function' | 'class' | 'const' | 'type';
    /** Component ID (if registered in components.json) */
    componentId?: string;
    /** TypeScript signature */
    signature: string;
    /** Description */
    description: string;
}
/**
 * A module entry in the registry
 */
interface ModuleEntry {
    /** Module name */
    name: string;
    /** Module path (relative to modules directory) */
    path: string;
    /** Module description */
    description: string;
    /** Exports from this module */
    exports: ModuleExport[];
    /** Dependencies on other modules */
    dependencies: string[];
    /** Peer dependencies (external packages) */
    peerDependencies: string[];
    /** Module version */
    version?: string;
    /** Last updated timestamp */
    lastUpdated?: string;
}
/**
 * The modules registry.json file structure
 */
interface ModuleRegistry {
    /** Schema version */
    version: string;
    /** Last updated timestamp */
    lastUpdated: string;
    /** All modules in the registry */
    modules: ModuleEntry[];
    /** Quick lookup: component ID to module path */
    componentToModule: Record<string, string>;
    /** Quick lookup: export name to module path */
    exportToModule: Record<string, string>;
}
/**
 * Options for adding a component to the registry
 */
interface AddToRegistryOptions {
    /** Module name (e.g., 'navigation') */
    moduleName: string;
    /** Module path (e.g., 'foundation/navigation') */
    modulePath: string;
    /** Module description */
    moduleDescription?: string;
    /** Export details */
    exportDetails: {
        name: string;
        type: ModuleExport['type'];
        signature: string;
        description: string;
    };
    /** Dependencies */
    dependencies?: string[];
    /** Peer dependencies */
    peerDependencies?: string[];
}
/**
 * Create an empty registry
 */
declare function createEmptyRegistry(): ModuleRegistry;
/**
 * Load the module registry
 *
 * @param harnessRoot - Root directory of the test harness
 * @returns The module registry or null if not found
 */
declare function loadRegistry(harnessRoot: string): ModuleRegistry | null;
/**
 * Save the module registry
 *
 * @param harnessRoot - Root directory of the test harness
 * @param registry - Registry to save
 * @returns Save result
 */
declare function saveRegistry(harnessRoot: string, registry: ModuleRegistry): Promise<SaveResult>;
/**
 * Add a component to the module registry
 *
 * If the module exists, adds the export to it. If not, creates a new module entry.
 *
 * @param harnessRoot - Root directory of the test harness
 * @param component - The component to register
 * @param options - Registration options
 * @returns Save result
 *
 * @example
 * ```typescript
 * await addComponentToRegistry(
 *   'artk-e2e',
 *   component,
 *   {
 *     moduleName: 'navigation',
 *     modulePath: 'foundation/navigation',
 *     moduleDescription: 'Navigation utilities',
 *     exportDetails: {
 *       name: 'verifySidebarReady',
 *       type: 'async function',
 *       signature: 'verifySidebarReady(page: Page, options?: Options): Promise<void>',
 *       description: 'Verify sidebar is loaded and interactive',
 *     },
 *   }
 * );
 * ```
 */
declare function addComponentToRegistry(harnessRoot: string, component: Component, options: AddToRegistryOptions): Promise<SaveResult>;
/**
 * Remove a component from the registry
 *
 * @param harnessRoot - Root directory of the test harness
 * @param componentId - ID of the component to remove
 * @returns Save result
 */
declare function removeComponentFromRegistry(harnessRoot: string, componentId: string): Promise<SaveResult>;
/**
 * Update component details in the registry
 *
 * @param harnessRoot - Root directory of the test harness
 * @param componentId - ID of the component to update
 * @param updates - Fields to update
 * @returns Save result
 */
declare function updateComponentInRegistry(harnessRoot: string, componentId: string, updates: Partial<{
    signature: string;
    description: string;
    type: ModuleExport['type'];
}>): Promise<SaveResult>;
/**
 * Get module info for a component
 *
 * @param harnessRoot - Root directory of the test harness
 * @param componentId - Component ID
 * @returns Module entry and export info, or null if not found
 */
declare function getModuleForComponent(harnessRoot: string, componentId: string): {
    module: ModuleEntry;
    export: ModuleExport;
} | null;
/**
 * Get the import path for a component
 *
 * @param harnessRoot - Root directory of the test harness
 * @param componentId - Component ID
 * @returns Import statement or null if not found
 *
 * @example
 * ```typescript
 * const importPath = getImportPath('artk-e2e', 'COMP001');
 * // Returns: "import { verifySidebarReady } from '@modules/foundation/navigation';"
 * ```
 */
declare function getImportPath(harnessRoot: string, componentId: string): string | null;
/**
 * List all modules in the registry
 *
 * @param harnessRoot - Root directory of the test harness
 * @returns Array of module entries
 */
declare function listModules(harnessRoot: string): ModuleEntry[];
/**
 * Find modules by category
 *
 * @param harnessRoot - Root directory of the test harness
 * @param category - Category to filter by
 * @returns Array of modules that have components in the given category
 */
declare function findModulesByCategory(harnessRoot: string, category: ComponentCategory): ModuleEntry[];
/**
 * Validate registry consistency with components.json
 *
 * @param harnessRoot - Root directory of the test harness
 * @param components - Components from components.json
 * @returns Validation result with inconsistencies
 */
declare function validateRegistryConsistency(harnessRoot: string, components: Component[]): {
    valid: boolean;
    missingInRegistry: string[];
    missingInComponents: string[];
    pathMismatches: Array<{
        componentId: string;
        registryPath: string;
        componentPath: string;
    }>;
};
/**
 * Synchronize registry with components.json
 *
 * Adds missing components and removes stale entries.
 *
 * @param harnessRoot - Root directory of the test harness
 * @param components - Components from components.json
 * @returns Save result
 */
declare function syncRegistryWithComponents(harnessRoot: string, components: Component[]): Promise<SaveResult & {
    added: number;
    removed: number;
}>;

/**
 * LLKB Migration Module
 *
 * This module provides utilities for migrating LLKB data between versions,
 * upgrading schemas, and handling backward compatibility.
 *
 * @module llkb/migration
 */

/**
 * Migration result
 */
interface MigrationResult {
    /** Whether migration succeeded */
    success: boolean;
    /** Files that were migrated */
    migratedFiles: string[];
    /** Errors encountered */
    errors: string[];
    /** Warnings */
    warnings: string[];
    /** Version before migration */
    fromVersion: string;
    /** Version after migration */
    toVersion: string;
}
/**
 * Schema version info
 */
interface VersionInfo {
    /** Major version */
    major: number;
    /** Minor version */
    minor: number;
    /** Patch version */
    patch: number;
    /** Full version string */
    full: string;
}
/** Current schema version */
declare const CURRENT_VERSION = "1.0.0";
/** Minimum supported version */
declare const MIN_SUPPORTED_VERSION = "0.1.0";
/**
 * Parse a version string into components
 */
declare function parseVersion(version: string): VersionInfo;
/**
 * Compare two versions
 * @returns -1 if a < b, 0 if equal, 1 if a > b
 */
declare function compareVersions(a: string, b: string): number;
/**
 * Check if a version is supported
 */
declare function isVersionSupported(version: string): boolean;
/**
 * Check if migration is needed
 */
declare function needsMigration(version: string): boolean;
/**
 * Migrate all LLKB files to the current version
 *
 * @param llkbRoot - Root directory of LLKB
 * @returns Migration result
 *
 * @example
 * ```typescript
 * const result = await migrateLLKB('.artk/llkb');
 * if (result.success) {
 *   console.log(`Migrated ${result.migratedFiles.length} files`);
 * }
 * ```
 */
declare function migrateLLKB(llkbRoot: string): Promise<MigrationResult>;
/**
 * Check if LLKB needs migration
 *
 * @param llkbRoot - Root directory of LLKB
 * @returns Version check result
 */
declare function checkMigrationNeeded(llkbRoot: string): {
    needsMigration: boolean;
    currentVersion: string;
    targetVersion: string;
    supported: boolean;
};
/**
 * Initialize LLKB directory structure with default files
 *
 * @param llkbRoot - Root directory for LLKB
 * @returns Save result
 *
 * @example
 * ```typescript
 * const result = await initializeLLKB('.artk/llkb');
 * ```
 */
declare function initializeLLKB(llkbRoot: string): Promise<SaveResult>;
/**
 * Validate LLKB installation
 *
 * @param llkbRoot - Root directory of LLKB
 * @returns Validation result
 */
declare function validateLLKBInstallation(llkbRoot: string): {
    valid: boolean;
    missingFiles: string[];
    invalidFiles: string[];
    version: string;
};

/**
 * LLKB Search and Export Module
 *
 * This module provides search functionality across LLKB data
 * and export capabilities for reports and sharing.
 *
 * @module llkb/search
 */

/**
 * Search query options
 */
interface SearchQuery {
    /** Text to search for (searches titles, descriptions, patterns) */
    text?: string;
    /** Filter by category */
    category?: LLKBCategory | ComponentCategory;
    /** Filter by scope */
    scope?: LLKBScope;
    /** Filter by tags */
    tags?: string[];
    /** Filter by minimum confidence */
    minConfidence?: number;
    /** Filter by journey ID */
    journeyId?: string;
    /** Include archived items */
    includeArchived?: boolean;
    /** Maximum results */
    limit?: number;
}
/**
 * Unified search result
 */
interface SearchResult {
    /** Result type */
    type: 'lesson' | 'component' | 'quirk' | 'rule';
    /** Item ID */
    id: string;
    /** Title or name */
    title: string;
    /** Description or pattern */
    description: string;
    /** Category */
    category: string;
    /** Scope */
    scope: LLKBScope;
    /** Relevance score (0.0 - 1.0) */
    relevance: number;
    /** The original item */
    item: Lesson | Component | AppQuirk | GlobalRule;
}
/**
 * Export format
 */
type ExportFormat = 'json' | 'markdown' | 'csv';
/**
 * Export options
 */
interface ExportOptions {
    /** Export format */
    format: ExportFormat;
    /** Include archived items */
    includeArchived?: boolean;
    /** Include metrics */
    includeMetrics?: boolean;
    /** Include source code */
    includeSource?: boolean;
    /** Filter by categories */
    categories?: (LLKBCategory | ComponentCategory)[];
    /** Filter by scopes */
    scopes?: LLKBScope[];
}
/**
 * Report section
 */
interface ReportSection {
    title: string;
    content: string;
}
/**
 * Search LLKB data
 *
 * Searches across lessons, components, quirks, and rules.
 *
 * @param llkbRoot - Root directory of LLKB
 * @param query - Search query
 * @returns Array of search results sorted by relevance
 *
 * @example
 * ```typescript
 * const results = search('.artk/llkb', {
 *   text: 'sidebar navigation',
 *   category: 'navigation',
 *   minConfidence: 0.7,
 * });
 * ```
 */
declare function search(llkbRoot: string, query: SearchQuery): SearchResult[];
/**
 * Find lessons by pattern
 *
 * Searches for lessons that match a specific code pattern.
 *
 * @param llkbRoot - Root directory of LLKB
 * @param pattern - Pattern to search for
 * @returns Matching lessons
 */
declare function findLessonsByPattern(llkbRoot: string, pattern: string): Lesson[];
/**
 * Find components by name or description
 *
 * @param llkbRoot - Root directory of LLKB
 * @param searchTerm - Term to search for
 * @returns Matching components
 */
declare function findComponents(llkbRoot: string, searchTerm: string): Component[];
/**
 * Get lessons for a specific journey
 *
 * @param llkbRoot - Root directory of LLKB
 * @param journeyId - Journey ID
 * @returns Lessons associated with the journey
 */
declare function getLessonsForJourney(llkbRoot: string, journeyId: string): Lesson[];
/**
 * Get components for a specific journey
 *
 * @param llkbRoot - Root directory of LLKB
 * @param journeyId - Journey ID
 * @returns Components used in or extracted from the journey
 */
declare function getComponentsForJourney(llkbRoot: string, journeyId: string): Component[];
/**
 * Export LLKB data
 *
 * @param llkbRoot - Root directory of LLKB
 * @param options - Export options
 * @returns Export content as string
 *
 * @example
 * ```typescript
 * const markdown = exportLLKB('.artk/llkb', {
 *   format: 'markdown',
 *   includeMetrics: true,
 * });
 * fs.writeFileSync('llkb-export.md', markdown);
 * ```
 */
declare function exportLLKB(llkbRoot: string, options: ExportOptions): string;
/**
 * Generate a summary report of LLKB
 *
 * @param llkbRoot - Root directory of LLKB
 * @returns Markdown report
 */
declare function generateReport(llkbRoot: string): string;
/**
 * Export to file
 *
 * @param llkbRoot - Root directory of LLKB
 * @param outputPath - Output file path
 * @param options - Export options
 */
declare function exportToFile(llkbRoot: string, outputPath: string, options: ExportOptions): Promise<void>;

export { type AddToRegistryOptions, type AnalyticsFile, type AnalyticsOverview, type AppProfile, type AppQuirk, type BaseHistoryEvent, CONFIDENCE_HISTORY_RETENTION_DAYS, CURRENT_VERSION, type Component, type ComponentCategory, type ComponentExtractedEvent, type ComponentFilterOptions, type ComponentMetrics, type ComponentSource, type ComponentStats, type ComponentUsedEvent, type ComponentsFile, type ConfidenceHistoryEntry, DEFAULT_LLKB_ROOT, type DetectionOptions, type DuplicateDetectionResult, type DuplicateGroup, type ExportFormat, type ExportOptions, type ExtractionCandidate, type ExtractionCheckResult, type ExtractionConfig, type ExtractionDeferredEvent, type GlobalRule, type HealthCheck, type HealthCheckResult, type HistoryConfig, type HistoryEvent, type ImpactMetrics, type InjectionConfig, type JourneyContext, type JourneyStep, type LLKBCategory, type LLKBConfig, type LLKBData, type LLKBPatterns, type LLKBScope, LOCK_MAX_WAIT_MS, LOCK_RETRY_INTERVAL_MS, type Lesson, type LessonAppliedEvent, type LessonFilterOptions, type LessonMetrics, type LessonStats, type LessonValidation, type LessonsFile, MAX_CONFIDENCE_HISTORY_ENTRIES, MIN_SUPPORTED_VERSION, type MatchOptions, type MigrationResult, type ModuleEntry, type ModuleExport, type ModuleRegistry, type NeedsReview, type OverrideEvent, type OverridesConfig, type PatternOccurrence, type PruneResult, type RelevantContext, type ReportSection, type RetentionConfig, STALE_LOCK_THRESHOLD_MS, type SaveResult, type ScopesConfig, type SearchQuery, type SearchResult, type SimilarPatternResult, type StatsResult, type StepMatchResult, type TestStep, type TopPerformerComponent, type TopPerformerLesson, type TopPerformers, type UpdateResult, type VersionInfo, addComponentToRegistry, appendToHistory, calculateConfidence, calculateSimilarity, checkMigrationNeeded, cleanupOldHistoryFiles, compareVersions, countJourneyExtractionsToday, countLines, countPredictiveExtractionsToday, countTodayEvents, createEmptyAnalytics, createEmptyRegistry, daysBetween, detectDecliningConfidence, detectDuplicatesAcrossFiles, detectDuplicatesInFile, ensureDir, exportLLKB, exportToFile, extractKeywords, extractStepKeywords, findComponents, findExtractionCandidates, findLessonsByPattern, findModulesByCategory, findNearDuplicates, findSimilarPatterns, findUnusedComponentOpportunities, formatContextForPrompt, formatDate, formatHealthCheck, formatPruneResult, formatStats, generateReport, getAllCategories, getAnalyticsSummary, getComponentCategories, getComponentsForJourney, getConfidenceTrend, getHistoryDir, getHistoryFilePath, getHistoryFilesInRange, getImportPath, getLessonsForJourney, getModuleForComponent, getRelevantContext, getRelevantScopes, getStats, hashCode, inferCategory, inferCategoryWithConfidence, initializeLLKB, isComponentCategory, isDailyRateLimitReached, isJourneyRateLimitReached, isLLKBEnabled, isNearDuplicate, isVersionSupported, jaccardSimilarity, lineCountSimilarity, listModules, llkbExists, loadAppProfile, loadComponents, loadJSON, loadLLKBConfig, loadLLKBData, loadLessons, loadPatterns, loadRegistry, matchStepsToComponents, migrateLLKB, needsConfidenceReview, needsMigration, normalizeCode, parseVersion, prune, readHistoryFile, readTodayHistory, removeComponentFromRegistry, runHealthCheck, saveJSONAtomic, saveJSONAtomicSync, saveRegistry, search, shouldExtractAsComponent, syncRegistryWithComponents, tokenize, updateAnalytics, updateAnalyticsWithData, updateComponentInRegistry, updateConfidenceHistory, updateJSONWithLock, updateJSONWithLockSync, validateLLKBInstallation, validateRegistryConsistency };
