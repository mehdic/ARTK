"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultGlossary = void 0;
exports.loadGlossary = loadGlossary;
exports.mergeGlossaries = mergeGlossaries;
exports.initGlossary = initGlossary;
exports.getGlossary = getGlossary;
exports.resolveCanonical = resolveCanonical;
exports.normalizeStepText = normalizeStepText;
exports.getSynonyms = getSynonyms;
exports.isSynonymOf = isSynonymOf;
exports.resetGlossaryCache = resetGlossaryCache;
exports.findLabelAlias = findLabelAlias;
exports.getLocatorFromLabel = getLocatorFromLabel;
exports.findModuleMethod = findModuleMethod;
exports.resolveModuleMethod = resolveModuleMethod;
exports.getLabelAliases = getLabelAliases;
exports.getModuleMethods = getModuleMethods;
/**
 * Glossary Loader - Load and resolve synonyms for step text normalization
 * @see research/2026-01-02_autogen-refined-plan.md Section 10
 */
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const yaml_1 = require("yaml");
const zod_1 = require("zod");
/**
 * Glossary entry schema
 */
const GlossaryEntrySchema = zod_1.z.object({
    canonical: zod_1.z.string(),
    synonyms: zod_1.z.array(zod_1.z.string()),
});
/**
 * Label alias entry schema (maps display labels to testids/selectors)
 * @see T082 - Extend glossary schema for labelAliases
 */
const LabelAliasSchema = zod_1.z.object({
    label: zod_1.z.string(),
    testid: zod_1.z.string().optional(),
    role: zod_1.z.string().optional(),
    selector: zod_1.z.string().optional(),
});
/**
 * Module method mapping schema (maps phrases to module.method calls)
 * @see T082 - Module method resolution
 */
const ModuleMethodMappingSchema = zod_1.z.object({
    phrase: zod_1.z.string(),
    module: zod_1.z.string(),
    method: zod_1.z.string(),
    params: zod_1.z.record(zod_1.z.string()).optional(),
});
/**
 * Glossary file schema
 */
const GlossarySchema = zod_1.z.object({
    version: zod_1.z.number().default(1),
    entries: zod_1.z.array(GlossaryEntrySchema),
    labelAliases: zod_1.z.array(LabelAliasSchema).default([]),
    moduleMethods: zod_1.z.array(ModuleMethodMappingSchema).default([]),
});
/**
 * Default glossary entries for common terms
 */
exports.defaultGlossary = {
    version: 1,
    labelAliases: [
        // Common label-to-selector mappings
        { label: 'email', testid: 'email-input', role: 'textbox' },
        { label: 'password', testid: 'password-input', role: 'textbox' },
        { label: 'username', testid: 'username-input', role: 'textbox' },
        { label: 'search', testid: 'search-input', role: 'searchbox' },
        { label: 'submit', testid: 'submit-button', role: 'button' },
        { label: 'cancel', testid: 'cancel-button', role: 'button' },
        { label: 'close', testid: 'close-button', role: 'button' },
    ],
    moduleMethods: [
        // Common phrase-to-module mappings
        { phrase: 'log in', module: 'auth', method: 'login' },
        { phrase: 'login', module: 'auth', method: 'login' },
        { phrase: 'sign in', module: 'auth', method: 'login' },
        { phrase: 'log out', module: 'auth', method: 'logout' },
        { phrase: 'logout', module: 'auth', method: 'logout' },
        { phrase: 'sign out', module: 'auth', method: 'logout' },
        { phrase: 'navigate to', module: 'navigation', method: 'goToPath' },
        { phrase: 'go to', module: 'navigation', method: 'goToPath' },
        { phrase: 'open', module: 'navigation', method: 'goToPath' },
        { phrase: 'fill form', module: 'forms', method: 'fillForm' },
        { phrase: 'submit form', module: 'forms', method: 'submitForm' },
        { phrase: 'wait for', module: 'waits', method: 'waitForSignal' },
    ],
    entries: [
        {
            canonical: 'click',
            synonyms: ['press', 'tap', 'select', 'hit'],
        },
        {
            canonical: 'enter',
            synonyms: ['type', 'fill', 'input', 'write'],
        },
        {
            canonical: 'navigate',
            synonyms: ['go', 'open', 'visit', 'browse'],
        },
        {
            canonical: 'see',
            synonyms: ['view', 'observe', 'notice', 'find'],
        },
        {
            canonical: 'visible',
            synonyms: ['displayed', 'shown', 'present'],
        },
        {
            canonical: 'button',
            synonyms: ['btn', 'action', 'cta'],
        },
        {
            canonical: 'field',
            synonyms: ['input', 'textbox', 'text field', 'text input'],
        },
        {
            canonical: 'dropdown',
            synonyms: ['select', 'combo', 'combobox', 'selector', 'picker'],
        },
        {
            canonical: 'checkbox',
            synonyms: ['check', 'tick', 'toggle'],
        },
        {
            canonical: 'login',
            synonyms: ['log in', 'sign in', 'authenticate'],
        },
        {
            canonical: 'logout',
            synonyms: ['log out', 'sign out', 'exit'],
        },
        {
            canonical: 'submit',
            synonyms: ['send', 'save', 'confirm', 'ok'],
        },
        {
            canonical: 'cancel',
            synonyms: ['close', 'dismiss', 'abort', 'back'],
        },
        {
            canonical: 'success',
            synonyms: ['passed', 'completed', 'done', 'finished'],
        },
        {
            canonical: 'error',
            synonyms: ['failure', 'failed', 'problem', 'issue'],
        },
        {
            canonical: 'toast',
            synonyms: ['notification', 'message', 'alert', 'snackbar'],
        },
        {
            canonical: 'modal',
            synonyms: ['dialog', 'popup', 'overlay', 'lightbox'],
        },
        {
            canonical: 'user',
            synonyms: ['customer', 'visitor', 'member', 'client'],
        },
        {
            canonical: 'page',
            synonyms: ['screen', 'view', 'section'],
        },
        {
            canonical: 'form',
            synonyms: ['questionnaire', 'survey', 'wizard'],
        },
    ],
};
/**
 * Loaded glossary cache
 */
let glossaryCache = null;
let synonymMap = null;
/**
 * Build a synonym lookup map from glossary
 */
function buildSynonymMap(glossary) {
    const map = new Map();
    for (const entry of glossary.entries) {
        // Map canonical to itself
        map.set(entry.canonical.toLowerCase(), entry.canonical);
        // Map all synonyms to canonical
        for (const synonym of entry.synonyms) {
            map.set(synonym.toLowerCase(), entry.canonical);
        }
    }
    return map;
}
/**
 * Load glossary from file
 * @param glossaryPath - Path to glossary YAML file
 */
function loadGlossary(glossaryPath) {
    const resolvedPath = (0, node_path_1.resolve)(glossaryPath);
    if (!(0, node_fs_1.existsSync)(resolvedPath)) {
        console.warn(`Glossary file not found at ${resolvedPath}, using defaults`);
        return exports.defaultGlossary;
    }
    try {
        const content = (0, node_fs_1.readFileSync)(resolvedPath, 'utf-8');
        const parsed = (0, yaml_1.parse)(content);
        const result = GlossarySchema.safeParse(parsed);
        if (!result.success) {
            console.warn(`Invalid glossary file at ${resolvedPath}, using defaults`);
            return exports.defaultGlossary;
        }
        // Merge with defaults
        return mergeGlossaries(exports.defaultGlossary, result.data);
    }
    catch (err) {
        console.warn(`Failed to load glossary from ${resolvedPath}, using defaults`);
        return exports.defaultGlossary;
    }
}
/**
 * Merge two glossaries (user glossary extends defaults)
 */
function mergeGlossaries(base, extension) {
    const merged = {
        version: Math.max(base.version, extension.version),
        entries: [...base.entries],
        labelAliases: [...(base.labelAliases ?? [])],
        moduleMethods: [...(base.moduleMethods ?? [])],
    };
    // Add or extend entries from extension
    for (const extEntry of extension.entries) {
        const existing = merged.entries.find((e) => e.canonical.toLowerCase() === extEntry.canonical.toLowerCase());
        if (existing) {
            // Merge synonyms
            const allSynonyms = new Set([...existing.synonyms, ...extEntry.synonyms]);
            existing.synonyms = Array.from(allSynonyms);
        }
        else {
            // Add new entry
            merged.entries.push(extEntry);
        }
    }
    // Add or extend label aliases from extension
    for (const extAlias of extension.labelAliases ?? []) {
        const existing = merged.labelAliases.find((a) => a.label.toLowerCase() === extAlias.label.toLowerCase());
        if (!existing) {
            merged.labelAliases.push(extAlias);
        }
        else {
            // Override with extension values
            Object.assign(existing, extAlias);
        }
    }
    // Add or extend module methods from extension
    for (const extMethod of extension.moduleMethods ?? []) {
        const existing = merged.moduleMethods.find((m) => m.phrase.toLowerCase() === extMethod.phrase.toLowerCase());
        if (!existing) {
            merged.moduleMethods.push(extMethod);
        }
        else {
            // Override with extension values
            Object.assign(existing, extMethod);
        }
    }
    return merged;
}
/**
 * Initialize the glossary (call once at startup)
 * @param glossaryPath - Optional path to custom glossary
 */
function initGlossary(glossaryPath) {
    if (glossaryPath) {
        glossaryCache = loadGlossary(glossaryPath);
    }
    else {
        glossaryCache = exports.defaultGlossary;
    }
    synonymMap = buildSynonymMap(glossaryCache);
}
/**
 * Get the current glossary
 */
function getGlossary() {
    if (!glossaryCache) {
        initGlossary();
    }
    return glossaryCache;
}
/**
 * Resolve a term to its canonical form
 * @param term - Term to resolve
 * @returns Canonical form or original term if not found
 */
function resolveCanonical(term) {
    if (!synonymMap) {
        initGlossary();
    }
    return synonymMap.get(term.toLowerCase()) ?? term;
}
/**
 * Normalize step text by replacing synonyms with canonical terms
 * @param text - Step text to normalize
 * @returns Normalized text
 */
function normalizeStepText(text) {
    if (!synonymMap) {
        initGlossary();
    }
    // Split into words, preserving quoted strings
    const parts = [];
    const regex = /(['"][^'"]+['"])|(\S+)/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
        const part = match[0];
        // Don't normalize quoted strings
        if (part.startsWith('"') || part.startsWith("'")) {
            parts.push(part);
        }
        else {
            // Check if this word has a canonical form
            const canonical = synonymMap.get(part.toLowerCase());
            parts.push(canonical ?? part);
        }
    }
    return parts.join(' ');
}
/**
 * Get all synonyms for a canonical term
 */
function getSynonyms(canonical) {
    if (!glossaryCache) {
        initGlossary();
    }
    const entry = glossaryCache.entries.find((e) => e.canonical.toLowerCase() === canonical.toLowerCase());
    return entry?.synonyms ?? [];
}
/**
 * Check if a term is a synonym of a canonical term
 */
function isSynonymOf(term, canonical) {
    const resolved = resolveCanonical(term);
    return resolved.toLowerCase() === canonical.toLowerCase();
}
/**
 * Reset the glossary cache (for testing)
 */
function resetGlossaryCache() {
    glossaryCache = null;
    synonymMap = null;
}
/**
 * Find a label alias by label text
 * @see T082 - Label alias matching
 */
function findLabelAlias(label) {
    if (!glossaryCache) {
        initGlossary();
    }
    const normalizedLabel = label.toLowerCase().trim();
    return (glossaryCache.labelAliases?.find((alias) => alias.label.toLowerCase() === normalizedLabel) ?? null);
}
/**
 * Get locator info from label alias
 */
function getLocatorFromLabel(label) {
    const alias = findLabelAlias(label);
    if (!alias)
        return null;
    // Priority: testid > role > selector
    if (alias.testid) {
        return { strategy: 'testid', value: alias.testid };
    }
    if (alias.role) {
        return { strategy: 'role', value: alias.role };
    }
    if (alias.selector) {
        return { strategy: 'css', value: alias.selector };
    }
    return null;
}
/**
 * Find a module method mapping by phrase
 * @see T083 - Module method resolution in step mapper
 */
function findModuleMethod(text) {
    if (!glossaryCache) {
        initGlossary();
    }
    const normalizedText = text.toLowerCase().trim();
    // Find the best matching phrase (longest match wins)
    let bestMatch = null;
    let bestMatchLength = 0;
    for (const mapping of glossaryCache.moduleMethods ?? []) {
        const phrase = mapping.phrase.toLowerCase();
        if (normalizedText.includes(phrase) && phrase.length > bestMatchLength) {
            bestMatch = mapping;
            bestMatchLength = phrase.length;
        }
    }
    return bestMatch;
}
/**
 * Resolve a step to a module method call if it matches
 */
function resolveModuleMethod(text) {
    const mapping = findModuleMethod(text);
    if (!mapping)
        return null;
    return {
        module: mapping.module,
        method: mapping.method,
        params: mapping.params,
    };
}
/**
 * Get all label aliases
 */
function getLabelAliases() {
    if (!glossaryCache) {
        initGlossary();
    }
    return glossaryCache.labelAliases ?? [];
}
/**
 * Get all module method mappings
 */
function getModuleMethods() {
    if (!glossaryCache) {
        initGlossary();
    }
    return glossaryCache.moduleMethods ?? [];
}
//# sourceMappingURL=glossary.js.map