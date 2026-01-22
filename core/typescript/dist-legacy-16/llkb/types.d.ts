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
export type LLKBCategory = 'selector' | 'timing' | 'quirk' | 'auth' | 'data' | 'assertion' | 'navigation' | 'ui-interaction';
/**
 * Categories valid for components (excludes 'quirk' which is lesson-only)
 */
export type ComponentCategory = Exclude<LLKBCategory, 'quirk'>;
/**
 * Scope indicating where a pattern applies
 *
 * - universal: Works everywhere, could be in @artk/core
 * - framework:*: Framework-specific (angular, react, vue, ag-grid)
 * - app-specific: Unique to this application
 */
export type LLKBScope = 'universal' | 'framework:angular' | 'framework:react' | 'framework:vue' | 'framework:ag-grid' | 'app-specific';
/**
 * Metrics tracking for a lesson's effectiveness
 */
export interface LessonMetrics {
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
export interface ConfidenceHistoryEntry {
    /** Date of the confidence measurement (ISO 8601) */
    date: string;
    /** Confidence value at that time (0.0 - 1.0) */
    value: number;
}
/**
 * Validation status of a lesson
 */
export interface LessonValidation {
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
export interface Lesson {
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
export interface LessonsFile {
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
export interface GlobalRule {
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
export interface AppQuirk {
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
export interface ComponentMetrics {
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
export interface ComponentSource {
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
export interface Component {
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
export interface ComponentsFile {
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
export interface AnalyticsOverview {
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
export interface LessonStats {
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
export interface ComponentStats {
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
export interface ImpactMetrics {
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
export interface TopPerformers {
    /** Top lessons by (successRate * occurrences) */
    lessons: TopPerformerLesson[];
    /** Top components by totalUses */
    components: TopPerformerComponent[];
}
/**
 * A top performing lesson entry
 */
export interface TopPerformerLesson {
    id: string;
    title: string;
    score: number;
}
/**
 * A top performing component entry
 */
export interface TopPerformerComponent {
    id: string;
    name: string;
    uses: number;
}
/**
 * Items needing review
 */
export interface NeedsReview {
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
export interface AnalyticsFile {
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
export interface ExtractionConfig {
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
export interface RetentionConfig {
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
export interface HistoryConfig {
    /** Delete history files older than N days (default: 365) */
    retentionDays: number;
}
/**
 * Context injection configuration
 */
export interface InjectionConfig {
    /** Sort injected context by confidence (highest first) */
    prioritizeByConfidence: boolean;
}
/**
 * Scope tracking configuration
 */
export interface ScopesConfig {
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
export interface OverridesConfig {
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
export interface LLKBConfig {
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
export interface BaseHistoryEvent {
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
export interface LessonAppliedEvent extends BaseHistoryEvent {
    event: 'lesson_applied';
    lessonId: string;
    success: boolean;
    context?: string;
}
/**
 * Component extraction event
 */
export interface ComponentExtractedEvent extends BaseHistoryEvent {
    event: 'component_extracted';
    componentId: string;
    extractionType: 'predictive' | 'reactive';
    sourceCode?: string;
}
/**
 * Component used event
 */
export interface ComponentUsedEvent extends BaseHistoryEvent {
    event: 'component_used';
    componentId: string;
    success: boolean;
}
/**
 * Override event
 */
export interface OverrideEvent extends BaseHistoryEvent {
    event: 'override';
    lessonId?: string;
    componentId?: string;
    reason?: string;
}
/**
 * Extraction deferred event (rate limit hit)
 */
export interface ExtractionDeferredEvent extends BaseHistoryEvent {
    event: 'extraction_deferred';
    reason: 'rate_limit' | 'duplicate' | 'below_threshold';
    patternHash?: string;
}
/**
 * Union type of all history events
 */
export type HistoryEvent = LessonAppliedEvent | ComponentExtractedEvent | ComponentUsedEvent | OverrideEvent | ExtractionDeferredEvent;
/**
 * Result of a file save operation
 */
export interface SaveResult {
    success: boolean;
    error?: string;
}
/**
 * Result of a file update operation with locking
 */
export interface UpdateResult {
    success: boolean;
    error?: string;
    retriesNeeded?: number;
}
/**
 * Extraction candidate for component extraction
 */
export interface ExtractionCandidate {
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
export interface TestStep {
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
//# sourceMappingURL=types.d.ts.map