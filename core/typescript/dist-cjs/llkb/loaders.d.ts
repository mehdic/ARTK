/**
 * LLKB Data Loaders
 *
 * Functions for loading and validating LLKB configuration and data files.
 *
 * @module @artk/llkb/loaders
 */
import type { LLKBConfig, LessonsFile, ComponentsFile, Lesson, Component, LLKBCategory, LLKBScope } from './types.js';
/**
 * App profile structure from app-profile.json
 */
export interface AppProfile {
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
export interface PatternFile {
    version: string;
    [key: string]: unknown;
}
/**
 * Selector patterns file
 */
export interface SelectorPatterns extends PatternFile {
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
export interface TimingPatterns extends PatternFile {
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
export interface AssertionPatterns extends PatternFile {
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
export interface LLKBPatterns {
    selectors?: SelectorPatterns;
    timing?: TimingPatterns;
    assertions?: AssertionPatterns;
    data?: PatternFile;
    auth?: PatternFile;
}
/**
 * Filter options for loading lessons
 */
export interface LessonFilterOptions {
    category?: LLKBCategory | LLKBCategory[];
    scope?: LLKBScope | LLKBScope[];
    minConfidence?: number;
    tags?: string[];
    includeArchived?: boolean;
}
/**
 * Filter options for loading components
 */
export interface ComponentFilterOptions {
    category?: LLKBCategory | LLKBCategory[];
    scope?: LLKBScope | LLKBScope[];
    minConfidence?: number;
    includeArchived?: boolean;
}
/**
 * Loaded LLKB data bundle
 */
export interface LLKBData {
    config: LLKBConfig;
    appProfile: AppProfile | null;
    lessons: LessonsFile;
    components: ComponentsFile;
    patterns: LLKBPatterns;
}
/**
 * Default LLKB configuration when config.yml doesn't exist
 */
export declare const DEFAULT_LLKB_CONFIG: LLKBConfig;
/**
 * Load LLKB configuration from config.yml
 *
 * @param llkbRoot - Root directory of LLKB (default: .artk/llkb)
 * @returns Loaded config or default if not found
 */
export declare function loadLLKBConfig(llkbRoot?: string): LLKBConfig;
/**
 * Check if LLKB is enabled
 */
export declare function isLLKBEnabled(llkbRoot?: string): boolean;
/**
 * Load app profile from app-profile.json
 *
 * @param llkbRoot - Root directory of LLKB
 * @returns App profile or null if not found
 */
export declare function loadAppProfile(llkbRoot?: string): AppProfile | null;
/**
 * Load lessons file
 *
 * @param llkbRoot - Root directory of LLKB
 * @returns Lessons file or empty structure
 */
export declare function loadLessonsFile(llkbRoot?: string): LessonsFile;
/**
 * Load lessons with optional filtering
 *
 * @param llkbRoot - Root directory of LLKB
 * @param options - Filter options
 * @returns Filtered lessons array
 */
export declare function loadLessons(llkbRoot?: string, options?: LessonFilterOptions): Lesson[];
/**
 * Load components file
 *
 * @param llkbRoot - Root directory of LLKB
 * @returns Components file or empty structure
 */
export declare function loadComponentsFile(llkbRoot?: string): ComponentsFile;
/**
 * Load components with optional filtering
 *
 * @param llkbRoot - Root directory of LLKB
 * @param options - Filter options
 * @returns Filtered components array
 */
export declare function loadComponents(llkbRoot?: string, options?: ComponentFilterOptions): Component[];
/**
 * Load all pattern files
 *
 * @param llkbRoot - Root directory of LLKB
 * @returns All loaded patterns
 */
export declare function loadPatterns(llkbRoot?: string): LLKBPatterns;
/**
 * Load a specific pattern file
 *
 * @param llkbRoot - Root directory of LLKB
 * @param patternName - Name of the pattern file (without .json)
 * @returns Pattern file or null
 */
export declare function loadPatternFile<T extends PatternFile>(llkbRoot: string, patternName: string): T | null;
/**
 * Load all LLKB data in one call
 *
 * @param llkbRoot - Root directory of LLKB
 * @returns Complete LLKB data bundle
 */
export declare function loadLLKBData(llkbRoot?: string): LLKBData;
/**
 * Check if LLKB exists at the given path
 *
 * @param llkbRoot - Root directory to check
 * @returns True if LLKB structure exists
 */
export declare function llkbExists(llkbRoot?: string): boolean;
/**
 * Get list of all pattern file names in the patterns directory
 *
 * @param llkbRoot - Root directory of LLKB
 * @returns Array of pattern file names (without .json extension)
 */
export declare function getPatternFileNames(llkbRoot?: string): string[];
//# sourceMappingURL=loaders.d.ts.map