/**
 * LLKB Context Injection
 *
 * Functions for filtering and prioritizing LLKB data based on journey context.
 * Used to inject relevant lessons, components, and patterns into prompts.
 *
 * @module @artk/llkb/context
 */
import type { Lesson, Component, LLKBConfig, LLKBScope, LLKBCategory } from './types.js';
import type { AppProfile, LLKBPatterns } from './loaders.js';
/**
 * Journey context for filtering LLKB data
 */
export interface JourneyContext {
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
export interface RelevantContext {
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
export interface ScoredLesson extends Lesson {
    relevanceScore: number;
    matchReasons: string[];
}
/**
 * Component with relevance score
 */
export interface ScoredComponent extends Component {
    relevanceScore: number;
    matchReasons: string[];
}
/**
 * App quirk info for context
 */
export interface AppQuirkInfo {
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
export interface SelectorPatternInfo {
    id: string;
    name: string;
    template: string;
    confidence: number;
}
/**
 * Timing pattern info for context
 */
export interface TimingPatternInfo {
    id: string;
    name: string;
    pattern: string;
    recommendation: string;
}
/**
 * Summary of injected context
 */
export interface ContextSummary {
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
export declare function getRelevantContext(journey: JourneyContext, lessons: Lesson[], components: Component[], config: LLKBConfig, appProfile?: AppProfile | null, patterns?: LLKBPatterns): RelevantContext;
/**
 * Extract keywords from journey context
 */
export declare function extractKeywords(journey: JourneyContext): string[];
/**
 * Format context for prompt injection
 *
 * @param context - Relevant context to format
 * @param journey - Journey context
 * @returns Markdown-formatted context string
 */
export declare function formatContextForPrompt(context: RelevantContext, journey: JourneyContext): string;
/**
 * Get scopes relevant to the app profile
 */
export declare function getRelevantScopes(appProfile: AppProfile | null): LLKBScope[];
//# sourceMappingURL=context.d.ts.map