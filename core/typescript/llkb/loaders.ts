/**
 * LLKB Data Loaders
 *
 * Functions for loading and validating LLKB configuration and data files.
 *
 * @module @artk/llkb/loaders
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { loadJSON } from './file-utils.js';
import type {
  LLKBConfig,
  LessonsFile,
  ComponentsFile,
  Lesson,
  Component,
  LLKBCategory,
  LLKBScope,
} from './types.js';

// =============================================================================
// Types
// =============================================================================

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

// =============================================================================
// Default Configuration
// =============================================================================

/**
 * Default LLKB configuration when config.yml doesn't exist
 */
export const DEFAULT_LLKB_CONFIG: LLKBConfig = {
  version: '1.0.0',
  enabled: true,
  extraction: {
    minOccurrences: 2,
    predictiveExtraction: true,
    confidenceThreshold: 0.7,
    maxPredictivePerDay: 5,
    maxPredictivePerJourney: 2,
    minLinesForExtraction: 3,
    similarityThreshold: 0.8,
  },
  retention: {
    maxLessonAge: 90,
    minSuccessRate: 0.6,
    archiveUnused: 30,
  },
  injection: {
    prioritizeByConfidence: true,
  },
  scopes: {
    universal: true,
    frameworkSpecific: true,
    appSpecific: true,
  },
  history: {
    retentionDays: 365,
  },
  overrides: {
    allowUserOverride: true,
    logOverrides: true,
    flagAfterOverrides: 3,
  },
};

// =============================================================================
// Config Loader
// =============================================================================

/**
 * Load LLKB configuration from config.yml
 *
 * @param llkbRoot - Root directory of LLKB (default: .artk/llkb)
 * @returns Loaded config or default if not found
 */
export function loadLLKBConfig(llkbRoot: string = '.artk/llkb'): LLKBConfig {
  const configPath = join(llkbRoot, 'config.yml');

  if (!existsSync(configPath)) {
    return { ...DEFAULT_LLKB_CONFIG };
  }

  try {
    const content = readFileSync(configPath, 'utf-8');

    // Simple YAML parsing for the config structure
    // For production, consider using a proper YAML parser
    const config = parseSimpleYAML(content);

    // Merge with defaults to ensure all fields exist
    return mergeConfig(DEFAULT_LLKB_CONFIG, config);
  } catch {
    return { ...DEFAULT_LLKB_CONFIG };
  }
}

/**
 * Simple YAML parser for config files
 * Handles basic key: value and nested structures
 */
function parseSimpleYAML(content: string): Partial<LLKBConfig> {
  const result: Record<string, unknown> = {};
  const lines = content.split('\n');
  const stack: Array<{ obj: Record<string, unknown>; indent: number }> = [{ obj: result, indent: -1 }];

  for (const line of lines) {
    // Skip empty lines and comments
    if (!line.trim() || line.trim().startsWith('#')) {
      continue;
    }

    const indent = line.search(/\S/);
    const trimmed = line.trim();

    // Check if it's a key: value pair
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) continue;

    const key = trimmed.substring(0, colonIndex).trim();
    const valueStr = trimmed.substring(colonIndex + 1).trim();

    // Pop stack until we find the right parent
    while (stack.length > 1) {
      const top = stack[stack.length - 1];
      if (!top || top.indent < indent) break;
      stack.pop();
    }

    const top = stack[stack.length - 1];
    if (!top) continue;
    const parent = top.obj;

    if (valueStr === '' || valueStr === '|' || valueStr === '>') {
      // Nested object
      const newObj: Record<string, unknown> = {};
      parent[key] = newObj;
      stack.push({ obj: newObj, indent });
    } else {
      // Parse value
      parent[key] = parseYAMLValue(valueStr);
    }
  }

  return result as Partial<LLKBConfig>;
}

/**
 * Parse a YAML value string
 */
function parseYAMLValue(value: string): unknown {
  // Remove quotes
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }

  // Boolean
  if (value === 'true') return true;
  if (value === 'false') return false;

  // Number
  const num = Number(value);
  if (!isNaN(num)) return num;

  // String
  return value;
}

/**
 * Deep merge config with defaults
 */
function mergeConfig(defaults: LLKBConfig, overrides: Partial<LLKBConfig>): LLKBConfig {
  const result = { ...defaults } as Record<string, unknown>;

  for (const key of Object.keys(overrides) as (keyof LLKBConfig)[]) {
    const override = overrides[key];
    if (override !== undefined) {
      if (typeof override === 'object' && override !== null && !Array.isArray(override)) {
        // Deep merge nested objects
        const defaultValue = defaults[key];
        result[key] = {
          ...(typeof defaultValue === 'object' && defaultValue !== null ? defaultValue : {}),
          ...(override as object),
        };
      } else {
        result[key] = override;
      }
    }
  }

  return result as unknown as LLKBConfig;
}

/**
 * Check if LLKB is enabled
 */
export function isLLKBEnabled(llkbRoot: string = '.artk/llkb'): boolean {
  if (!existsSync(llkbRoot)) {
    return false;
  }

  const config = loadLLKBConfig(llkbRoot);
  return config.enabled;
}

// =============================================================================
// App Profile Loader
// =============================================================================

/**
 * Load app profile from app-profile.json
 *
 * @param llkbRoot - Root directory of LLKB
 * @returns App profile or null if not found
 */
export function loadAppProfile(llkbRoot: string = '.artk/llkb'): AppProfile | null {
  const profilePath = join(llkbRoot, 'app-profile.json');
  return loadJSON<AppProfile>(profilePath);
}

// =============================================================================
// Lessons Loader
// =============================================================================

/**
 * Load lessons file
 *
 * @param llkbRoot - Root directory of LLKB
 * @returns Lessons file or empty structure
 */
export function loadLessonsFile(llkbRoot: string = '.artk/llkb'): LessonsFile {
  const lessonsPath = join(llkbRoot, 'lessons.json');
  const data = loadJSON<LessonsFile>(lessonsPath);

  if (!data) {
    return {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      lessons: [],
      archived: [],
      globalRules: [],
      appQuirks: [],
    };
  }

  return data;
}

/**
 * Load lessons with optional filtering
 *
 * @param llkbRoot - Root directory of LLKB
 * @param options - Filter options
 * @returns Filtered lessons array
 */
export function loadLessons(
  llkbRoot: string = '.artk/llkb',
  options: LessonFilterOptions = {}
): Lesson[] {
  const lessonsFile = loadLessonsFile(llkbRoot);
  let lessons = lessonsFile.lessons;

  // Filter archived
  if (!options.includeArchived) {
    lessons = lessons.filter((l) => !l.archived);
  }

  // Filter by category
  if (options.category) {
    const categories = Array.isArray(options.category) ? options.category : [options.category];
    lessons = lessons.filter((l) => categories.includes(l.category));
  }

  // Filter by scope
  if (options.scope) {
    const scopes = Array.isArray(options.scope) ? options.scope : [options.scope];
    lessons = lessons.filter((l) => scopes.includes(l.scope));
  }

  // Filter by minimum confidence
  if (options.minConfidence !== undefined) {
    lessons = lessons.filter((l) => l.metrics.confidence >= options.minConfidence!);
  }

  // Filter by tags
  if (options.tags && options.tags.length > 0) {
    lessons = lessons.filter((l) => l.tags && options.tags!.some((tag) => l.tags!.includes(tag)));
  }

  return lessons;
}

// =============================================================================
// Components Loader
// =============================================================================

/**
 * Load components file
 *
 * @param llkbRoot - Root directory of LLKB
 * @returns Components file or empty structure
 */
export function loadComponentsFile(llkbRoot: string = '.artk/llkb'): ComponentsFile {
  const componentsPath = join(llkbRoot, 'components.json');
  const data = loadJSON<ComponentsFile>(componentsPath);

  if (!data) {
    return {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      components: [],
      componentsByCategory: {
        selector: [],
        timing: [],
        auth: [],
        data: [],
        assertion: [],
        navigation: [],
        'ui-interaction': [],
      },
      componentsByScope: {
        universal: [],
        'framework:angular': [],
        'framework:react': [],
        'framework:vue': [],
        'framework:ag-grid': [],
        'app-specific': [],
      },
    };
  }

  return data;
}

/**
 * Load components with optional filtering
 *
 * @param llkbRoot - Root directory of LLKB
 * @param options - Filter options
 * @returns Filtered components array
 */
export function loadComponents(
  llkbRoot: string = '.artk/llkb',
  options: ComponentFilterOptions = {}
): Component[] {
  const componentsFile = loadComponentsFile(llkbRoot);
  let components = componentsFile.components;

  // Filter archived
  if (!options.includeArchived) {
    components = components.filter((c) => !c.archived);
  }

  // Filter by category
  if (options.category) {
    const categories = Array.isArray(options.category) ? options.category : [options.category];
    components = components.filter((c) => categories.includes(c.category));
  }

  // Filter by scope
  if (options.scope) {
    const scopes = Array.isArray(options.scope) ? options.scope : [options.scope];
    components = components.filter((c) => scopes.includes(c.scope));
  }

  // Filter by minimum confidence (uses successRate as proxy for confidence)
  if (options.minConfidence !== undefined) {
    components = components.filter((c) => c.metrics.successRate >= options.minConfidence!);
  }

  return components;
}

// =============================================================================
// Pattern Loaders
// =============================================================================

/**
 * Load all pattern files
 *
 * @param llkbRoot - Root directory of LLKB
 * @returns All loaded patterns
 */
export function loadPatterns(llkbRoot: string = '.artk/llkb'): LLKBPatterns {
  const patternsDir = join(llkbRoot, 'patterns');

  if (!existsSync(patternsDir)) {
    return {};
  }

  const patterns: LLKBPatterns = {};

  // Load each pattern file if it exists
  const selectorPatterns = loadJSON<SelectorPatterns>(join(patternsDir, 'selectors.json'));
  if (selectorPatterns) {
    patterns.selectors = selectorPatterns;
  }

  const timingPatterns = loadJSON<TimingPatterns>(join(patternsDir, 'timing.json'));
  if (timingPatterns) {
    patterns.timing = timingPatterns;
  }

  const assertionPatterns = loadJSON<AssertionPatterns>(join(patternsDir, 'assertions.json'));
  if (assertionPatterns) {
    patterns.assertions = assertionPatterns;
  }

  const dataPatterns = loadJSON<PatternFile>(join(patternsDir, 'data.json'));
  if (dataPatterns) {
    patterns.data = dataPatterns;
  }

  const authPatterns = loadJSON<PatternFile>(join(patternsDir, 'auth.json'));
  if (authPatterns) {
    patterns.auth = authPatterns;
  }

  return patterns;
}

/**
 * Load a specific pattern file
 *
 * @param llkbRoot - Root directory of LLKB
 * @param patternName - Name of the pattern file (without .json)
 * @returns Pattern file or null
 */
export function loadPatternFile<T extends PatternFile>(
  llkbRoot: string,
  patternName: string
): T | null {
  const patternPath = join(llkbRoot, 'patterns', `${patternName}.json`);
  return loadJSON<T>(patternPath);
}

// =============================================================================
// Full LLKB Loader
// =============================================================================

/**
 * Load all LLKB data in one call
 *
 * @param llkbRoot - Root directory of LLKB
 * @returns Complete LLKB data bundle
 */
export function loadLLKBData(llkbRoot: string = '.artk/llkb'): LLKBData {
  return {
    config: loadLLKBConfig(llkbRoot),
    appProfile: loadAppProfile(llkbRoot),
    lessons: loadLessonsFile(llkbRoot),
    components: loadComponentsFile(llkbRoot),
    patterns: loadPatterns(llkbRoot),
  };
}

/**
 * Check if LLKB exists at the given path
 *
 * @param llkbRoot - Root directory to check
 * @returns True if LLKB structure exists
 */
export function llkbExists(llkbRoot: string = '.artk/llkb'): boolean {
  return existsSync(llkbRoot) && existsSync(join(llkbRoot, 'config.yml'));
}

/**
 * Get list of all pattern file names in the patterns directory
 *
 * @param llkbRoot - Root directory of LLKB
 * @returns Array of pattern file names (without .json extension)
 */
export function getPatternFileNames(llkbRoot: string = '.artk/llkb'): string[] {
  const patternsDir = join(llkbRoot, 'patterns');

  if (!existsSync(patternsDir)) {
    return [];
  }

  try {
    return readdirSync(patternsDir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace('.json', ''));
  } catch {
    return [];
  }
}
