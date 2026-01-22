"use strict";
/**
 * LLKB Data Loaders
 *
 * Functions for loading and validating LLKB configuration and data files.
 *
 * @module @artk/llkb/loaders
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_LLKB_CONFIG = void 0;
exports.loadLLKBConfig = loadLLKBConfig;
exports.isLLKBEnabled = isLLKBEnabled;
exports.loadAppProfile = loadAppProfile;
exports.loadLessonsFile = loadLessonsFile;
exports.loadLessons = loadLessons;
exports.loadComponentsFile = loadComponentsFile;
exports.loadComponents = loadComponents;
exports.loadPatterns = loadPatterns;
exports.loadPatternFile = loadPatternFile;
exports.loadLLKBData = loadLLKBData;
exports.llkbExists = llkbExists;
exports.getPatternFileNames = getPatternFileNames;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const file_utils_js_1 = require("./file-utils.js");
// =============================================================================
// Default Configuration
// =============================================================================
/**
 * Default LLKB configuration when config.yml doesn't exist
 */
exports.DEFAULT_LLKB_CONFIG = {
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
function loadLLKBConfig(llkbRoot = '.artk/llkb') {
    const configPath = (0, node_path_1.join)(llkbRoot, 'config.yml');
    if (!(0, node_fs_1.existsSync)(configPath)) {
        return { ...exports.DEFAULT_LLKB_CONFIG };
    }
    try {
        const content = (0, node_fs_1.readFileSync)(configPath, 'utf-8');
        // Simple YAML parsing for the config structure
        // For production, consider using a proper YAML parser
        const config = parseSimpleYAML(content);
        // Merge with defaults to ensure all fields exist
        return mergeConfig(exports.DEFAULT_LLKB_CONFIG, config);
    }
    catch {
        return { ...exports.DEFAULT_LLKB_CONFIG };
    }
}
/**
 * Simple YAML parser for config files
 * Handles basic key: value and nested structures
 */
function parseSimpleYAML(content) {
    const result = {};
    const lines = content.split('\n');
    const stack = [{ obj: result, indent: -1 }];
    for (const line of lines) {
        // Skip empty lines and comments
        if (!line.trim() || line.trim().startsWith('#')) {
            continue;
        }
        const indent = line.search(/\S/);
        const trimmed = line.trim();
        // Check if it's a key: value pair
        const colonIndex = trimmed.indexOf(':');
        if (colonIndex === -1)
            continue;
        const key = trimmed.substring(0, colonIndex).trim();
        const valueStr = trimmed.substring(colonIndex + 1).trim();
        // Pop stack until we find the right parent
        while (stack.length > 1) {
            const top = stack[stack.length - 1];
            if (!top || top.indent < indent)
                break;
            stack.pop();
        }
        const top = stack[stack.length - 1];
        if (!top)
            continue;
        const parent = top.obj;
        if (valueStr === '' || valueStr === '|' || valueStr === '>') {
            // Nested object
            const newObj = {};
            parent[key] = newObj;
            stack.push({ obj: newObj, indent });
        }
        else {
            // Parse value
            parent[key] = parseYAMLValue(valueStr);
        }
    }
    return result;
}
/**
 * Parse a YAML value string
 */
function parseYAMLValue(value) {
    // Remove quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        return value.slice(1, -1);
    }
    // Boolean
    if (value === 'true')
        return true;
    if (value === 'false')
        return false;
    // Number
    const num = Number(value);
    if (!isNaN(num))
        return num;
    // String
    return value;
}
/**
 * Deep merge config with defaults
 */
function mergeConfig(defaults, overrides) {
    const result = { ...defaults };
    for (const key of Object.keys(overrides)) {
        const override = overrides[key];
        if (override !== undefined) {
            if (typeof override === 'object' && override !== null && !Array.isArray(override)) {
                // Deep merge nested objects
                const defaultValue = defaults[key];
                result[key] = {
                    ...(typeof defaultValue === 'object' && defaultValue !== null ? defaultValue : {}),
                    ...override,
                };
            }
            else {
                result[key] = override;
            }
        }
    }
    return result;
}
/**
 * Check if LLKB is enabled
 */
function isLLKBEnabled(llkbRoot = '.artk/llkb') {
    if (!(0, node_fs_1.existsSync)(llkbRoot)) {
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
function loadAppProfile(llkbRoot = '.artk/llkb') {
    const profilePath = (0, node_path_1.join)(llkbRoot, 'app-profile.json');
    return (0, file_utils_js_1.loadJSON)(profilePath);
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
function loadLessonsFile(llkbRoot = '.artk/llkb') {
    const lessonsPath = (0, node_path_1.join)(llkbRoot, 'lessons.json');
    const data = (0, file_utils_js_1.loadJSON)(lessonsPath);
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
function loadLessons(llkbRoot = '.artk/llkb', options = {}) {
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
        lessons = lessons.filter((l) => l.metrics.confidence >= options.minConfidence);
    }
    // Filter by tags
    if (options.tags && options.tags.length > 0) {
        lessons = lessons.filter((l) => l.tags && options.tags.some((tag) => l.tags.includes(tag)));
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
function loadComponentsFile(llkbRoot = '.artk/llkb') {
    const componentsPath = (0, node_path_1.join)(llkbRoot, 'components.json');
    const data = (0, file_utils_js_1.loadJSON)(componentsPath);
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
function loadComponents(llkbRoot = '.artk/llkb', options = {}) {
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
        components = components.filter((c) => c.metrics.successRate >= options.minConfidence);
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
function loadPatterns(llkbRoot = '.artk/llkb') {
    const patternsDir = (0, node_path_1.join)(llkbRoot, 'patterns');
    if (!(0, node_fs_1.existsSync)(patternsDir)) {
        return {};
    }
    const patterns = {};
    // Load each pattern file if it exists
    const selectorPatterns = (0, file_utils_js_1.loadJSON)((0, node_path_1.join)(patternsDir, 'selectors.json'));
    if (selectorPatterns) {
        patterns.selectors = selectorPatterns;
    }
    const timingPatterns = (0, file_utils_js_1.loadJSON)((0, node_path_1.join)(patternsDir, 'timing.json'));
    if (timingPatterns) {
        patterns.timing = timingPatterns;
    }
    const assertionPatterns = (0, file_utils_js_1.loadJSON)((0, node_path_1.join)(patternsDir, 'assertions.json'));
    if (assertionPatterns) {
        patterns.assertions = assertionPatterns;
    }
    const dataPatterns = (0, file_utils_js_1.loadJSON)((0, node_path_1.join)(patternsDir, 'data.json'));
    if (dataPatterns) {
        patterns.data = dataPatterns;
    }
    const authPatterns = (0, file_utils_js_1.loadJSON)((0, node_path_1.join)(patternsDir, 'auth.json'));
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
function loadPatternFile(llkbRoot, patternName) {
    const patternPath = (0, node_path_1.join)(llkbRoot, 'patterns', `${patternName}.json`);
    return (0, file_utils_js_1.loadJSON)(patternPath);
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
function loadLLKBData(llkbRoot = '.artk/llkb') {
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
function llkbExists(llkbRoot = '.artk/llkb') {
    return (0, node_fs_1.existsSync)(llkbRoot) && (0, node_fs_1.existsSync)((0, node_path_1.join)(llkbRoot, 'config.yml'));
}
/**
 * Get list of all pattern file names in the patterns directory
 *
 * @param llkbRoot - Root directory of LLKB
 * @returns Array of pattern file names (without .json extension)
 */
function getPatternFileNames(llkbRoot = '.artk/llkb') {
    const patternsDir = (0, node_path_1.join)(llkbRoot, 'patterns');
    if (!(0, node_fs_1.existsSync)(patternsDir)) {
        return [];
    }
    try {
        return (0, node_fs_1.readdirSync)(patternsDir)
            .filter((f) => f.endsWith('.json'))
            .map((f) => f.replace('.json', ''));
    }
    catch {
        return [];
    }
}
//# sourceMappingURL=loaders.js.map