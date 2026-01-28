import { existsSync, readFileSync, mkdirSync, writeFileSync, unlinkSync } from 'fs';
import { resolve, join, dirname, relative, basename, extname } from 'path';
import { pathToFileURL, fileURLToPath } from 'url';
import { parse, stringify } from 'yaml';
import { z } from 'zod';
import { randomBytes, createHash } from 'crypto';
import fg from 'fast-glob';
import ejs from 'ejs';
import { Project, ModuleKind, ScriptTarget, SyntaxKind } from 'ts-morph';
import { execSync, spawn } from 'child_process';
import { tmpdir } from 'os';

var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
function buildSynonymMap(glossary) {
  const map2 = /* @__PURE__ */ new Map();
  for (const entry of glossary.entries) {
    map2.set(entry.canonical.toLowerCase(), entry.canonical);
    for (const synonym of entry.synonyms) {
      map2.set(synonym.toLowerCase(), entry.canonical);
    }
  }
  return map2;
}
function loadGlossary(glossaryPath) {
  const resolvedPath = resolve(glossaryPath);
  if (!existsSync(resolvedPath)) {
    console.warn(`Glossary file not found at ${resolvedPath}, using defaults`);
    return defaultGlossary;
  }
  try {
    const content = readFileSync(resolvedPath, "utf-8");
    const parsed = parse(content);
    const result = GlossarySchema.safeParse(parsed);
    if (!result.success) {
      console.warn(`Invalid glossary file at ${resolvedPath}, using defaults`);
      return defaultGlossary;
    }
    return mergeGlossaries(defaultGlossary, result.data);
  } catch {
    console.warn(`Failed to load glossary from ${resolvedPath}, using defaults`);
    return defaultGlossary;
  }
}
function mergeGlossaries(base, extension) {
  const merged = {
    version: Math.max(base.version, extension.version),
    entries: [...base.entries],
    labelAliases: [...base.labelAliases ?? []],
    moduleMethods: [...base.moduleMethods ?? []]
  };
  for (const extEntry of extension.entries) {
    const existing = merged.entries.find(
      (e) => e.canonical.toLowerCase() === extEntry.canonical.toLowerCase()
    );
    if (existing) {
      const allSynonyms = /* @__PURE__ */ new Set([...existing.synonyms, ...extEntry.synonyms]);
      existing.synonyms = Array.from(allSynonyms);
    } else {
      merged.entries.push(extEntry);
    }
  }
  for (const extAlias of extension.labelAliases ?? []) {
    const existing = merged.labelAliases.find(
      (a) => a.label.toLowerCase() === extAlias.label.toLowerCase()
    );
    if (!existing) {
      merged.labelAliases.push(extAlias);
    } else {
      Object.assign(existing, extAlias);
    }
  }
  for (const extMethod of extension.moduleMethods ?? []) {
    const existing = merged.moduleMethods.find(
      (m) => m.phrase.toLowerCase() === extMethod.phrase.toLowerCase()
    );
    if (!existing) {
      merged.moduleMethods.push(extMethod);
    } else {
      Object.assign(existing, extMethod);
    }
  }
  return merged;
}
function initGlossary(glossaryPath) {
  if (glossaryPath) {
    glossaryCache = loadGlossary(glossaryPath);
  } else {
    glossaryCache = defaultGlossary;
  }
  synonymMap = buildSynonymMap(glossaryCache);
}
function getGlossary() {
  if (!glossaryCache) {
    initGlossary();
  }
  return glossaryCache;
}
function resolveCanonical(term) {
  if (!synonymMap) {
    initGlossary();
  }
  return synonymMap.get(term.toLowerCase()) ?? term;
}
function normalizeStepText(text) {
  if (!synonymMap) {
    initGlossary();
  }
  const parts = [];
  const regex = /(['"][^'"]+['"])|(\S+)/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const part = match[0];
    if (part.startsWith('"') || part.startsWith("'")) {
      parts.push(part);
    } else {
      const lowerPart = part.toLowerCase();
      const canonical = synonymMap.get(lowerPart);
      parts.push(canonical ?? lowerPart);
    }
  }
  return parts.join(" ");
}
function getSynonyms(canonical) {
  if (!glossaryCache) {
    initGlossary();
  }
  const entry = glossaryCache.entries.find(
    (e) => e.canonical.toLowerCase() === canonical.toLowerCase()
  );
  return entry?.synonyms ?? [];
}
function isSynonymOf(term, canonical) {
  const resolved = resolveCanonical(term);
  return resolved.toLowerCase() === canonical.toLowerCase();
}
function resetGlossaryCache() {
  glossaryCache = null;
  synonymMap = null;
}
function findLabelAlias(label) {
  if (!glossaryCache) {
    initGlossary();
  }
  const normalizedLabel = label.toLowerCase().trim();
  return glossaryCache.labelAliases?.find(
    (alias) => alias.label.toLowerCase() === normalizedLabel
  ) ?? null;
}
function getLocatorFromLabel(label) {
  const alias = findLabelAlias(label);
  if (!alias) return null;
  if (alias.testid) {
    return { strategy: "testid", value: alias.testid };
  }
  if (alias.role) {
    return { strategy: "role", value: alias.role };
  }
  if (alias.selector) {
    return { strategy: "css", value: alias.selector };
  }
  return null;
}
function findModuleMethod(text) {
  if (!glossaryCache) {
    initGlossary();
  }
  const normalizedText = text.toLowerCase().trim();
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
function resolveModuleMethod(text) {
  const mapping = findModuleMethod(text);
  if (!mapping) return null;
  return {
    module: mapping.module,
    method: mapping.method,
    params: mapping.params
  };
}
function getLabelAliases() {
  if (!glossaryCache) {
    initGlossary();
  }
  return glossaryCache.labelAliases ?? [];
}
function getModuleMethods() {
  if (!glossaryCache) {
    initGlossary();
  }
  return glossaryCache.moduleMethods ?? [];
}
async function loadExtendedGlossary(glossaryPath) {
  try {
    const resolvedPath = resolve(glossaryPath);
    if (!existsSync(resolvedPath)) {
      return {
        loaded: false,
        entryCount: 0,
        exportedAt: null,
        error: `Glossary file not found: ${resolvedPath}`
      };
    }
    const fileUrl = pathToFileURL(resolvedPath).href;
    const module = await import(fileUrl);
    if (module.llkbGlossary instanceof Map) {
      const glossaryMap = module.llkbGlossary;
      extendedGlossary = glossaryMap;
      extendedGlossaryMeta = module.llkbGlossaryMeta ?? null;
      return {
        loaded: true,
        entryCount: glossaryMap.size,
        exportedAt: extendedGlossaryMeta?.exportedAt ?? null
      };
    }
    if (module.llkbGlossary && typeof module.llkbGlossary === "object") {
      const glossaryMap = new Map(
        Object.entries(module.llkbGlossary)
      );
      extendedGlossary = glossaryMap;
      extendedGlossaryMeta = module.llkbGlossaryMeta ?? null;
      return {
        loaded: true,
        entryCount: glossaryMap.size,
        exportedAt: extendedGlossaryMeta?.exportedAt ?? null
      };
    }
    return {
      loaded: false,
      entryCount: 0,
      exportedAt: null,
      error: "Invalid glossary format: llkbGlossary not found or not a Map/object"
    };
  } catch (err2) {
    return {
      loaded: false,
      entryCount: 0,
      exportedAt: null,
      error: `Failed to load glossary: ${err2 instanceof Error ? err2.message : String(err2)}`
    };
  }
}
function clearExtendedGlossary() {
  extendedGlossary = null;
  extendedGlossaryMeta = null;
}
function isExactCoreMatch(term) {
  if (!glossaryCache) {
    initGlossary();
  }
  const normalizedTerm = term.toLowerCase().trim();
  for (const mapping of glossaryCache.moduleMethods ?? []) {
    if (mapping.phrase.toLowerCase() === normalizedTerm) {
      return true;
    }
  }
  return false;
}
function lookupGlossary(term) {
  const normalizedTerm = term.toLowerCase().trim();
  if (isExactCoreMatch(normalizedTerm)) {
    const coreMapping2 = findModuleMethod(normalizedTerm);
    if (coreMapping2) {
      return {
        type: "callModule",
        module: coreMapping2.module,
        method: coreMapping2.method,
        args: coreMapping2.params ? [coreMapping2.params] : void 0
      };
    }
  }
  if (extendedGlossary) {
    const extendedMatch = extendedGlossary.get(normalizedTerm);
    if (extendedMatch) {
      return extendedMatch;
    }
  }
  const coreMapping = findModuleMethod(normalizedTerm);
  if (coreMapping) {
    return {
      type: "callModule",
      module: coreMapping.module,
      method: coreMapping.method,
      args: coreMapping.params ? [coreMapping.params] : void 0
    };
  }
  return void 0;
}
function lookupCoreGlossary(term) {
  const normalizedTerm = term.toLowerCase().trim();
  const coreMapping = findModuleMethod(normalizedTerm);
  if (coreMapping) {
    return {
      type: "callModule",
      module: coreMapping.module,
      method: coreMapping.method,
      args: coreMapping.params ? [coreMapping.params] : void 0
    };
  }
  return void 0;
}
function getGlossaryStats() {
  if (!glossaryCache) {
    initGlossary();
  }
  return {
    coreEntries: glossaryCache.moduleMethods?.length ?? 0,
    extendedEntries: extendedGlossary?.size ?? 0,
    extendedExportedAt: extendedGlossaryMeta?.exportedAt ?? null,
    extendedMeta: extendedGlossaryMeta
  };
}
function hasExtendedGlossary() {
  return extendedGlossary !== null && extendedGlossary.size > 0;
}
var GlossaryEntrySchema, LabelAliasSchema, ModuleMethodMappingSchema, GlossarySchema, defaultGlossary, glossaryCache, synonymMap, extendedGlossary, extendedGlossaryMeta;
var init_glossary = __esm({
  "src/mapping/glossary.ts"() {
    GlossaryEntrySchema = z.object({
      canonical: z.string(),
      synonyms: z.array(z.string())
    });
    LabelAliasSchema = z.object({
      label: z.string(),
      testid: z.string().optional(),
      role: z.string().optional(),
      selector: z.string().optional()
    });
    ModuleMethodMappingSchema = z.object({
      phrase: z.string(),
      module: z.string(),
      method: z.string(),
      params: z.record(z.string()).optional()
    });
    GlossarySchema = z.object({
      version: z.number().default(1),
      entries: z.array(GlossaryEntrySchema),
      labelAliases: z.array(LabelAliasSchema).default([]),
      moduleMethods: z.array(ModuleMethodMappingSchema).default([])
    });
    defaultGlossary = {
      version: 1,
      labelAliases: [
        // Common label-to-selector mappings
        { label: "email", testid: "email-input", role: "textbox" },
        { label: "password", testid: "password-input", role: "textbox" },
        { label: "username", testid: "username-input", role: "textbox" },
        { label: "search", testid: "search-input", role: "searchbox" },
        { label: "submit", testid: "submit-button", role: "button" },
        { label: "cancel", testid: "cancel-button", role: "button" },
        { label: "close", testid: "close-button", role: "button" }
      ],
      moduleMethods: [
        // Common phrase-to-module mappings
        { phrase: "log in", module: "auth", method: "login" },
        { phrase: "login", module: "auth", method: "login" },
        { phrase: "sign in", module: "auth", method: "login" },
        { phrase: "log out", module: "auth", method: "logout" },
        { phrase: "logout", module: "auth", method: "logout" },
        { phrase: "sign out", module: "auth", method: "logout" },
        { phrase: "navigate to", module: "navigation", method: "goToPath" },
        { phrase: "go to", module: "navigation", method: "goToPath" },
        { phrase: "open", module: "navigation", method: "goToPath" },
        { phrase: "fill form", module: "forms", method: "fillForm" },
        { phrase: "submit form", module: "forms", method: "submitForm" },
        { phrase: "wait for", module: "waits", method: "waitForSignal" }
      ],
      entries: [
        {
          canonical: "click",
          synonyms: ["press", "tap", "select", "hit"]
        },
        {
          canonical: "enter",
          synonyms: ["type", "fill", "input", "write"]
        },
        {
          canonical: "navigate",
          synonyms: ["go", "open", "visit", "browse"]
        },
        {
          canonical: "see",
          synonyms: ["view", "observe", "notice", "find"]
        },
        {
          canonical: "visible",
          synonyms: ["displayed", "shown", "present"]
        },
        {
          canonical: "button",
          synonyms: ["btn", "action", "cta"]
        },
        {
          canonical: "field",
          synonyms: ["input", "textbox", "text field", "text input"]
        },
        {
          canonical: "dropdown",
          synonyms: ["select", "combo", "combobox", "selector", "picker"]
        },
        {
          canonical: "checkbox",
          synonyms: ["check", "tick", "toggle"]
        },
        {
          canonical: "login",
          synonyms: ["log in", "sign in", "authenticate"]
        },
        {
          canonical: "logout",
          synonyms: ["log out", "sign out", "exit"]
        },
        {
          canonical: "submit",
          synonyms: ["send", "save", "confirm", "ok"]
        },
        {
          canonical: "cancel",
          synonyms: ["close", "dismiss", "abort", "back"]
        },
        {
          canonical: "success",
          synonyms: ["passed", "completed", "done", "finished"]
        },
        {
          canonical: "error",
          synonyms: ["failure", "failed", "problem", "issue"]
        },
        {
          canonical: "toast",
          synonyms: ["notification", "message", "alert", "snackbar"]
        },
        {
          canonical: "modal",
          synonyms: ["dialog", "popup", "overlay", "lightbox"]
        },
        {
          canonical: "user",
          synonyms: ["customer", "visitor", "member", "client"]
        },
        {
          canonical: "page",
          synonyms: ["screen", "view", "section"]
        },
        {
          canonical: "form",
          synonyms: ["questionnaire", "survey", "wizard"]
        }
      ]
    };
    glossaryCache = null;
    synonymMap = null;
    extendedGlossary = null;
    extendedGlossaryMeta = null;
  }
});

// src/llkb/patternExtension.ts
var patternExtension_exports = {};
__export(patternExtension_exports, {
  calculateConfidence: () => calculateConfidence,
  clearLearnedPatterns: () => clearLearnedPatterns,
  exportPatternsToConfig: () => exportPatternsToConfig,
  generatePatternId: () => generatePatternId,
  generateRegexFromText: () => generateRegexFromText,
  getPatternStats: () => getPatternStats,
  getPatternsFilePath: () => getPatternsFilePath,
  getPromotablePatterns: () => getPromotablePatterns,
  invalidatePatternCache: () => invalidatePatternCache,
  loadLearnedPatterns: () => loadLearnedPatterns,
  markPatternsPromoted: () => markPatternsPromoted,
  matchLlkbPattern: () => matchLlkbPattern,
  prunePatterns: () => prunePatterns,
  recordPatternFailure: () => recordPatternFailure,
  recordPatternSuccess: () => recordPatternSuccess,
  saveLearnedPatterns: () => saveLearnedPatterns
});
function invalidatePatternCache() {
  patternCache = null;
}
function getPatternsFilePath(llkbRoot) {
  const root = llkbRoot || join(process.cwd(), DEFAULT_LLKB_ROOT);
  return join(root, PATTERNS_FILE);
}
function generatePatternId() {
  return `LP${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
}
function loadLearnedPatterns(options = {}) {
  const llkbRoot = options.llkbRoot || join(process.cwd(), DEFAULT_LLKB_ROOT);
  const now = Date.now();
  if (!options.bypassCache && patternCache && patternCache.llkbRoot === llkbRoot && now - patternCache.loadedAt < CACHE_TTL_MS) {
    return patternCache.patterns;
  }
  const filePath = getPatternsFilePath(options.llkbRoot);
  if (!existsSync(filePath)) {
    patternCache = { patterns: [], llkbRoot, loadedAt: now };
    return [];
  }
  try {
    const content = readFileSync(filePath, "utf-8");
    const data = JSON.parse(content);
    const patterns = Array.isArray(data.patterns) ? data.patterns : [];
    patternCache = { patterns, llkbRoot, loadedAt: now };
    return patterns;
  } catch {
    patternCache = { patterns: [], llkbRoot, loadedAt: now };
    return [];
  }
}
function saveLearnedPatterns(patterns, options = {}) {
  const filePath = getPatternsFilePath(options.llkbRoot);
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const data = {
    version: "1.0.0",
    lastUpdated: (/* @__PURE__ */ new Date()).toISOString(),
    patterns
  };
  writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  invalidatePatternCache();
}
function calculateConfidence(successCount, failCount) {
  const total = successCount + failCount;
  if (total === 0) return 0.5;
  const p = successCount / total;
  const z5 = 1.96;
  const n = total;
  const denominator = 1 + z5 * z5 / n;
  const center = p + z5 * z5 / (2 * n);
  const spread = z5 * Math.sqrt((p * (1 - p) + z5 * z5 / (4 * n)) / n);
  return Math.max(0, Math.min(1, (center - spread) / denominator));
}
function recordPatternSuccess(originalText, primitive, journeyId, options = {}) {
  const patterns = loadLearnedPatterns(options);
  const normalizedText = normalizeStepText(originalText);
  let pattern = patterns.find((p) => p.normalizedText === normalizedText);
  if (pattern) {
    pattern.successCount++;
    pattern.confidence = calculateConfidence(pattern.successCount, pattern.failCount);
    pattern.lastUsed = (/* @__PURE__ */ new Date()).toISOString();
    if (!pattern.sourceJourneys.includes(journeyId)) {
      pattern.sourceJourneys.push(journeyId);
    }
  } else {
    pattern = {
      id: generatePatternId(),
      originalText,
      normalizedText,
      mappedPrimitive: primitive,
      confidence: 0.5,
      // Initial confidence
      sourceJourneys: [journeyId],
      successCount: 1,
      failCount: 0,
      lastUsed: (/* @__PURE__ */ new Date()).toISOString(),
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      promotedToCore: false
    };
    patterns.push(pattern);
  }
  saveLearnedPatterns(patterns, options);
  return pattern;
}
function recordPatternFailure(originalText, journeyId, options = {}) {
  const patterns = loadLearnedPatterns(options);
  const normalizedText = normalizeStepText(originalText);
  const pattern = patterns.find((p) => p.normalizedText === normalizedText);
  if (pattern) {
    pattern.failCount++;
    pattern.confidence = calculateConfidence(pattern.successCount, pattern.failCount);
    pattern.lastUsed = (/* @__PURE__ */ new Date()).toISOString();
    saveLearnedPatterns(patterns, options);
    return pattern;
  }
  return null;
}
function matchLlkbPattern(text, options = {}) {
  const patterns = loadLearnedPatterns(options);
  const normalizedText = normalizeStepText(text);
  const minConfidence = options.minConfidence ?? 0.7;
  const match = patterns.find(
    (p) => p.normalizedText === normalizedText && p.confidence >= minConfidence && !p.promotedToCore
  );
  if (match) {
    return {
      patternId: match.id,
      primitive: match.mappedPrimitive,
      confidence: match.confidence
    };
  }
  return null;
}
function generateRegexFromText(text) {
  let pattern = text.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/"[^"]+"/g, '"([^"]+)"').replace(/'[^']+'/g, "'([^']+)'").replace(/\b(the|a|an)\b/g, "(?:$1\\s+)?").replace(/^user\s+/, "(?:user\\s+)?").replace(/\bclicks?\b/g, "clicks?").replace(/\bfills?\b/g, "fills?").replace(/\bselects?\b/g, "selects?").replace(/\btypes?\b/g, "types?").replace(/\bsees?\b/g, "sees?").replace(/\bwaits?\b/g, "waits?");
  return `^${pattern}$`;
}
function getPromotablePatterns(options = {}) {
  const patterns = loadLearnedPatterns(options);
  const promotable = patterns.filter(
    (p) => p.confidence >= 0.9 && p.successCount >= 5 && p.sourceJourneys.length >= 2 && !p.promotedToCore
  );
  return promotable.map((pattern) => ({
    pattern,
    generatedRegex: generateRegexFromText(pattern.originalText),
    priority: pattern.successCount * pattern.confidence
  }));
}
function markPatternsPromoted(patternIds, options = {}) {
  const patterns = loadLearnedPatterns(options);
  const now = (/* @__PURE__ */ new Date()).toISOString();
  for (const pattern of patterns) {
    if (patternIds.includes(pattern.id)) {
      pattern.promotedToCore = true;
      pattern.promotedAt = now;
    }
  }
  saveLearnedPatterns(patterns, options);
}
function prunePatterns(options = {}) {
  const patterns = loadLearnedPatterns(options);
  const now = Date.now();
  const maxAge = (options.maxAgeDays ?? 90) * 24 * 60 * 60 * 1e3;
  const minConfidence = options.minConfidence ?? 0.3;
  const minSuccess = options.minSuccess ?? 1;
  const filtered = patterns.filter((p) => {
    if (p.promotedToCore) return true;
    if (p.confidence < minConfidence) return false;
    if (minSuccess > 0 && p.successCount < minSuccess) return false;
    const age = now - new Date(p.createdAt).getTime();
    if (age > maxAge && p.successCount === 0) return false;
    return true;
  });
  const removed = patterns.length - filtered.length;
  if (removed > 0) {
    saveLearnedPatterns(filtered, options);
  }
  return {
    removed,
    remaining: filtered.length
  };
}
function getPatternStats(options = {}) {
  const patterns = loadLearnedPatterns(options);
  if (patterns.length === 0) {
    return {
      total: 0,
      promoted: 0,
      highConfidence: 0,
      lowConfidence: 0,
      avgConfidence: 0,
      totalSuccesses: 0,
      totalFailures: 0
    };
  }
  const promoted = patterns.filter((p) => p.promotedToCore).length;
  const highConfidence = patterns.filter((p) => p.confidence >= 0.7).length;
  const lowConfidence = patterns.filter((p) => p.confidence < 0.3).length;
  const totalConfidence = patterns.reduce((sum, p) => sum + p.confidence, 0);
  const totalSuccesses = patterns.reduce((sum, p) => sum + p.successCount, 0);
  const totalFailures = patterns.reduce((sum, p) => sum + p.failCount, 0);
  return {
    total: patterns.length,
    promoted,
    highConfidence,
    lowConfidence,
    avgConfidence: totalConfidence / patterns.length,
    totalSuccesses,
    totalFailures
  };
}
function exportPatternsToConfig(options) {
  const patterns = loadLearnedPatterns(options);
  const minConfidence = options.minConfidence ?? 0.7;
  const exportable = patterns.filter((p) => p.confidence >= minConfidence && !p.promotedToCore);
  const config = {
    version: "1.0.0",
    exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
    patterns: exportable.map((p) => ({
      id: p.id,
      trigger: generateRegexFromText(p.originalText),
      primitive: p.mappedPrimitive,
      confidence: p.confidence,
      sourceCount: p.sourceJourneys.length
    }))
  };
  const outputPath = options.outputPath || join(dirname(getPatternsFilePath(options.llkbRoot)), "autogen-patterns.json");
  writeFileSync(outputPath, JSON.stringify(config, null, 2), "utf-8");
  return {
    exported: exportable.length,
    path: outputPath
  };
}
function clearLearnedPatterns(options = {}) {
  const filePath = getPatternsFilePath(options.llkbRoot);
  if (existsSync(filePath)) {
    unlinkSync(filePath);
  }
  invalidatePatternCache();
}
var PATTERNS_FILE, DEFAULT_LLKB_ROOT, patternCache, CACHE_TTL_MS;
var init_patternExtension = __esm({
  "src/llkb/patternExtension.ts"() {
    init_glossary();
    PATTERNS_FILE = "learned-patterns.json";
    DEFAULT_LLKB_ROOT = ".artk/llkb";
    patternCache = null;
    CACHE_TTL_MS = 5e3;
  }
});

// src/heal/rules.ts
function isCategoryHealable(category) {
  return !UNHEALABLE_CATEGORIES.includes(category);
}
function getApplicableRules(classification, config = DEFAULT_HEALING_CONFIG) {
  if (!config.enabled) {
    return [];
  }
  if (!isCategoryHealable(classification.category)) {
    return [];
  }
  return DEFAULT_HEALING_RULES.filter((rule) => {
    if (!rule.appliesTo.includes(classification.category)) {
      return false;
    }
    if (!config.allowedFixes.includes(rule.fixType)) {
      return false;
    }
    return true;
  }).sort((a, b) => a.priority - b.priority);
}
function evaluateHealing(classification, config = DEFAULT_HEALING_CONFIG) {
  if (!config.enabled) {
    return {
      canHeal: false,
      applicableFixes: [],
      reason: "Healing is disabled"
    };
  }
  if (!isCategoryHealable(classification.category)) {
    return {
      canHeal: false,
      applicableFixes: [],
      reason: `Category '${classification.category}' cannot be healed automatically`
    };
  }
  const applicableRules = getApplicableRules(classification, config);
  if (applicableRules.length === 0) {
    return {
      canHeal: false,
      applicableFixes: [],
      reason: "No applicable healing rules for this failure"
    };
  }
  return {
    canHeal: true,
    applicableFixes: applicableRules.map((r) => r.fixType)
  };
}
function getNextFix(classification, attemptedFixes, config = DEFAULT_HEALING_CONFIG) {
  const evaluation = evaluateHealing(classification, config);
  if (!evaluation.canHeal) {
    return null;
  }
  for (const fix of evaluation.applicableFixes) {
    if (!attemptedFixes.includes(fix)) {
      return fix;
    }
  }
  return null;
}
function isFixAllowed(fixType, config = DEFAULT_HEALING_CONFIG) {
  return config.enabled && config.allowedFixes.includes(fixType);
}
function isFixForbidden(fixType) {
  const forbidden = [
    "add-sleep",
    "remove-assertion",
    "weaken-assertion",
    "force-click",
    "bypass-auth"
  ];
  return forbidden.includes(fixType);
}
function getHealingRecommendation(classification) {
  switch (classification.category) {
    case "selector":
      return "Refine selector to use role, label, or testid locator strategy";
    case "timing":
      return "Add explicit wait for expected state or use web-first assertion";
    case "navigation":
      return "Add waitForURL or toHaveURL assertion after navigation";
    case "data":
      return "Verify test data and consider using expect.poll for dynamic values";
    case "auth":
      return "Check authentication state; may need to refresh session";
    case "env":
      return "Verify environment connectivity and application availability";
    case "script":
      return "Fix the JavaScript/TypeScript error in the test code";
    default:
      return "Review error details manually to determine appropriate fix";
  }
}
function getPostHealingRecommendation(classification, attemptCount) {
  const baseMsg = `Healing exhausted after ${attemptCount} attempts.`;
  switch (classification.category) {
    case "selector":
      return `${baseMsg} Consider adding data-testid to the target element or quarantining the test.`;
    case "timing":
      return `${baseMsg} The application may have a genuine performance issue. Consider quarantining.`;
    case "navigation":
      return `${baseMsg} The navigation flow may have changed. Review Journey steps.`;
    default:
      return `${baseMsg} Consider quarantining the test and filing a bug report.`;
  }
}
var DEFAULT_HEALING_RULES, DEFAULT_HEALING_CONFIG, UNHEALABLE_CATEGORIES;
var init_rules = __esm({
  "src/heal/rules.ts"() {
    DEFAULT_HEALING_RULES = [
      {
        fixType: "missing-await",
        appliesTo: ["selector", "timing", "script"],
        priority: 1,
        description: "Add missing await to async operations",
        enabledByDefault: true
      },
      {
        fixType: "selector-refine",
        appliesTo: ["selector"],
        priority: 2,
        description: "Replace CSS selector with role/label/testid",
        enabledByDefault: true
      },
      {
        fixType: "add-exact",
        appliesTo: ["selector"],
        priority: 3,
        description: "Add exact: true to resolve ambiguous locators",
        enabledByDefault: true
      },
      {
        fixType: "navigation-wait",
        appliesTo: ["navigation", "timing"],
        priority: 4,
        description: "Add waitForURL or toHaveURL assertion",
        enabledByDefault: true
      },
      {
        fixType: "web-first-assertion",
        appliesTo: ["timing", "data"],
        priority: 5,
        description: "Convert to auto-retrying web-first assertion",
        enabledByDefault: true
      },
      {
        fixType: "timeout-increase",
        appliesTo: ["timing"],
        priority: 6,
        description: "Increase operation timeout (bounded)",
        enabledByDefault: false
        // Disabled by default as it can mask real issues
      }
    ];
    DEFAULT_HEALING_CONFIG = {
      enabled: true,
      maxAttempts: 3,
      allowedFixes: [
        "selector-refine",
        "add-exact",
        "missing-await",
        "navigation-wait",
        "web-first-assertion"
      ],
      forbiddenFixes: [
        "add-sleep",
        "remove-assertion",
        "weaken-assertion",
        "force-click",
        "bypass-auth"
      ],
      maxTimeoutIncrease: 3e4
      // Max 30 seconds
    };
    UNHEALABLE_CATEGORIES = [
      "auth",
      // Requires credential/session fix
      "env",
      // Requires environment fix
      "unknown"
      // Cannot determine appropriate fix
    ];
  }
});
function loadHealingLog(filePath) {
  if (!existsSync(filePath)) {
    return null;
  }
  try {
    const content = readFileSync(filePath, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}
function formatHealingLog(log) {
  const lines = [];
  lines.push(`# Healing Log: ${log.journeyId}`);
  lines.push("");
  lines.push(`Status: ${log.status.toUpperCase()}`);
  lines.push(`Started: ${log.sessionStart}`);
  if (log.sessionEnd) {
    lines.push(`Ended: ${log.sessionEnd}`);
  }
  lines.push("");
  lines.push("## Attempts");
  lines.push("");
  for (const attempt of log.attempts) {
    const icon = attempt.result === "pass" ? "\u2705" : "\u274C";
    lines.push(`### Attempt ${attempt.attempt} ${icon}`);
    lines.push("");
    lines.push(`- **Fix Type**: ${attempt.fixType}`);
    lines.push(`- **Failure Type**: ${attempt.failureType}`);
    lines.push(`- **File**: ${attempt.file}`);
    lines.push(`- **Duration**: ${attempt.duration}ms`);
    lines.push(`- **Result**: ${attempt.result}`);
    if (attempt.errorMessage) {
      lines.push(`- **Error**: ${attempt.errorMessage}`);
    }
    if (attempt.change) {
      lines.push(`- **Change**: ${attempt.change}`);
    }
    if (attempt.evidence.length > 0) {
      lines.push(`- **Evidence**: ${attempt.evidence.join(", ")}`);
    }
    lines.push("");
  }
  if (log.summary) {
    lines.push("## Summary");
    lines.push("");
    lines.push(`- Total Attempts: ${log.summary.totalAttempts}`);
    lines.push(`- Successful Fixes: ${log.summary.successfulFixes}`);
    lines.push(`- Failed Attempts: ${log.summary.failedAttempts}`);
    lines.push(`- Total Duration: ${log.summary.totalDuration}ms`);
    lines.push(`- Fix Types Tried: ${log.summary.fixTypesAttempted.join(", ")}`);
    if (log.summary.recommendation) {
      lines.push("");
      lines.push(`**Recommendation**: ${log.summary.recommendation}`);
    }
  }
  return lines.join("\n");
}
function createHealingReport(log) {
  const lastSuccessfulAttempt = log.attempts.find((a) => a.result === "pass");
  return {
    success: log.status === "healed",
    attemptCount: log.attempts.length,
    fixApplied: lastSuccessfulAttempt?.fixType,
    recommendation: log.summary?.recommendation
  };
}
function aggregateHealingLogs(logs) {
  const fixCounts = /* @__PURE__ */ new Map();
  const failureCounts = /* @__PURE__ */ new Map();
  let totalAttempts = 0;
  for (const log of logs) {
    for (const attempt of log.attempts) {
      totalAttempts++;
      fixCounts.set(attempt.fixType, (fixCounts.get(attempt.fixType) || 0) + 1);
      failureCounts.set(attempt.failureType, (failureCounts.get(attempt.failureType) || 0) + 1);
    }
  }
  const mostCommonFixes = [...fixCounts.entries()].sort((a, b) => b[1] - a[1]).map(([fix, count]) => ({ fix, count }));
  const mostCommonFailures = [...failureCounts.entries()].sort((a, b) => b[1] - a[1]).map(([failure, count]) => ({ failure, count }));
  return {
    totalJourneys: logs.length,
    healed: logs.filter((l) => l.status === "healed").length,
    failed: logs.filter((l) => l.status === "failed").length,
    exhausted: logs.filter((l) => l.status === "exhausted").length,
    totalAttempts,
    mostCommonFixes,
    mostCommonFailures
  };
}
var HealingLogger;
var init_logger = __esm({
  "src/heal/logger.ts"() {
    HealingLogger = class {
      log;
      outputPath;
      constructor(journeyId, outputDir, maxAttempts = 3) {
        this.outputPath = join(outputDir, `${journeyId}.heal-log.json`);
        this.log = {
          journeyId,
          sessionStart: (/* @__PURE__ */ new Date()).toISOString(),
          maxAttempts,
          status: "in_progress",
          attempts: []
        };
      }
      /**
       * Log a healing attempt
       */
      logAttempt(attempt) {
        this.log.attempts.push({
          ...attempt,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
        this.save();
      }
      /**
       * Mark healing as complete (success)
       */
      markHealed() {
        this.log.status = "healed";
        this.log.sessionEnd = (/* @__PURE__ */ new Date()).toISOString();
        this.calculateSummary();
        this.save();
      }
      /**
       * Mark healing as failed (gave up)
       */
      markFailed(recommendation) {
        this.log.status = "failed";
        this.log.sessionEnd = (/* @__PURE__ */ new Date()).toISOString();
        this.calculateSummary();
        if (recommendation && this.log.summary) {
          this.log.summary.recommendation = recommendation;
        }
        this.save();
      }
      /**
       * Mark healing as exhausted (all attempts used)
       */
      markExhausted(recommendation) {
        this.log.status = "exhausted";
        this.log.sessionEnd = (/* @__PURE__ */ new Date()).toISOString();
        this.calculateSummary();
        if (recommendation && this.log.summary) {
          this.log.summary.recommendation = recommendation;
        }
        this.save();
      }
      /**
       * Get current log
       */
      getLog() {
        return { ...this.log };
      }
      /**
       * Get last attempt
       */
      getLastAttempt() {
        return this.log.attempts[this.log.attempts.length - 1] || null;
      }
      /**
       * Get attempt count
       */
      getAttemptCount() {
        return this.log.attempts.length;
      }
      /**
       * Check if max attempts reached
       */
      isMaxAttemptsReached() {
        return this.log.attempts.length >= this.log.maxAttempts;
      }
      /**
       * Calculate summary statistics
       */
      calculateSummary() {
        const attempts = this.log.attempts;
        this.log.summary = {
          totalAttempts: attempts.length,
          successfulFixes: attempts.filter((a) => a.result === "pass").length,
          failedAttempts: attempts.filter((a) => a.result === "fail" || a.result === "error").length,
          totalDuration: attempts.reduce((sum, a) => sum + a.duration, 0),
          fixTypesAttempted: [...new Set(attempts.map((a) => a.fixType))]
        };
      }
      /**
       * Save log to file
       */
      save() {
        const dir = dirname(this.outputPath);
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }
        writeFileSync(this.outputPath, JSON.stringify(this.log, null, 2), "utf-8");
      }
      /**
       * Get output path
       */
      getOutputPath() {
        return this.outputPath;
      }
    };
  }
});

// src/heal/fixes/selector.ts
function extractCSSSelector(code) {
  for (const pattern of CSS_SELECTOR_PATTERNS) {
    pattern.lastIndex = 0;
    const match = pattern.exec(code);
    if (match) {
      return match[1] ?? null;
    }
  }
  return null;
}
function containsCSSSelector(code) {
  return CSS_SELECTOR_PATTERNS.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(code);
  });
}
function inferRoleFromSelector(selector) {
  const lowerSelector = selector.toLowerCase();
  for (const [pattern, roleInfo] of Object.entries(UI_PATTERN_TO_ROLE)) {
    if (lowerSelector.includes(pattern)) {
      return roleInfo;
    }
  }
  return null;
}
function extractNameFromSelector(selector) {
  const attrMatch = selector.match(/\[(?:aria-label|title|alt|name)=['"]([^'"]+)['"]\]/);
  if (attrMatch) {
    return attrMatch[1] ?? null;
  }
  const classMatch = selector.match(/\.([a-zA-Z][-a-zA-Z0-9_]*)/);
  if (classMatch) {
    const className = classMatch[1];
    const words = className.split(/[-_]/).filter(Boolean);
    if (words.length > 0 && words[0].length > 2) {
      return words.join(" ");
    }
  }
  return null;
}
function generateRoleLocator(role, name, options) {
  const parts = [];
  if (name) {
    if (options?.exact) {
      parts.push(`{ name: '${name}', exact: true }`);
    } else {
      parts.push(`{ name: '${name}' }`);
    }
  }
  if (options?.level !== void 0 && role === "heading") {
    if (parts.length > 0) {
      const existing = parts[0].slice(0, -2);
      parts[0] = `${existing}, level: ${options.level} }`;
    } else {
      parts.push(`{ level: ${options.level} }`);
    }
  }
  if (parts.length > 0) {
    return `page.getByRole('${role}', ${parts[0]})`;
  }
  return `page.getByRole('${role}')`;
}
function generateLabelLocator(label, exact) {
  if (exact) {
    return `page.getByLabel('${label}', { exact: true })`;
  }
  return `page.getByLabel('${label}')`;
}
function generateTextLocator(text, exact) {
  if (exact) {
    return `page.getByText('${text}', { exact: true })`;
  }
  return `page.getByText('${text}')`;
}
function generateTestIdLocator(testId) {
  return `page.getByTestId('${testId}')`;
}
function applySelectorFix(context) {
  const { code, ariaInfo } = context;
  if (ariaInfo) {
    return applySelectorFixWithARIA(code, ariaInfo);
  }
  const cssSelector = extractCSSSelector(code);
  if (!cssSelector) {
    return {
      applied: false,
      code,
      description: "No CSS selector found to refine",
      confidence: 0
    };
  }
  return applySelectorFixFromCSS(code, cssSelector);
}
function applySelectorFixWithARIA(code, ariaInfo) {
  let newLocator = null;
  let confidence = 0;
  if (ariaInfo.testId) {
    newLocator = generateTestIdLocator(ariaInfo.testId);
    confidence = 1;
  } else if (ariaInfo.role && ariaInfo.name) {
    newLocator = generateRoleLocator(ariaInfo.role, ariaInfo.name, {
      exact: true,
      level: ariaInfo.level
    });
    confidence = 0.9;
  } else if (ariaInfo.label) {
    newLocator = generateLabelLocator(ariaInfo.label, true);
    confidence = 0.85;
  } else if (ariaInfo.role) {
    newLocator = generateRoleLocator(ariaInfo.role);
    confidence = 0.6;
  }
  if (!newLocator) {
    return {
      applied: false,
      code,
      description: "Unable to generate locator from ARIA info",
      confidence: 0
    };
  }
  let modifiedCode = code;
  for (const pattern of CSS_SELECTOR_PATTERNS) {
    modifiedCode = modifiedCode.replace(pattern, newLocator);
  }
  return {
    applied: modifiedCode !== code,
    code: modifiedCode,
    description: `Replaced CSS selector with ${newLocator.split("(")[0]}`,
    newLocator,
    confidence
  };
}
function applySelectorFixFromCSS(code, cssSelector) {
  const roleInfo = inferRoleFromSelector(cssSelector);
  const extractedName = extractNameFromSelector(cssSelector);
  let newLocator = null;
  let confidence = 0;
  if (roleInfo) {
    const name = extractedName;
    if (name) {
      newLocator = generateRoleLocator(roleInfo.role, name);
      confidence = 0.6;
    } else {
      newLocator = generateRoleLocator(roleInfo.role);
      confidence = 0.4;
    }
  } else if (extractedName) {
    newLocator = generateTextLocator(extractedName);
    confidence = 0.3;
  }
  if (!newLocator) {
    return {
      applied: false,
      code,
      description: "Unable to infer semantic locator from CSS selector",
      confidence: 0
    };
  }
  let modifiedCode = code;
  for (const pattern of CSS_SELECTOR_PATTERNS) {
    modifiedCode = modifiedCode.replace(pattern, newLocator);
  }
  return {
    applied: modifiedCode !== code,
    code: modifiedCode,
    description: `Inferred ${newLocator.split("(")[0]} from CSS selector pattern`,
    newLocator,
    confidence
  };
}
function addExactToLocator(code) {
  let modifiedCode = code;
  let applied = false;
  modifiedCode = modifiedCode.replace(
    /page\.getByRole\s*\(\s*['"](\w+)['"]\s*,\s*\{\s*name:\s*['"]([^'"]+)['"]\s*\}\s*\)/g,
    (_, role, name) => {
      applied = true;
      return `page.getByRole('${role}', { name: '${name}', exact: true })`;
    }
  );
  modifiedCode = modifiedCode.replace(
    /page\.getByLabel\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    (_, label) => {
      applied = true;
      return `page.getByLabel('${label}', { exact: true })`;
    }
  );
  modifiedCode = modifiedCode.replace(
    /page\.getByText\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    (_, text) => {
      applied = true;
      return `page.getByText('${text}', { exact: true })`;
    }
  );
  return {
    applied,
    code: modifiedCode,
    description: applied ? "Added exact: true to locator" : "No locator found to add exact option",
    confidence: applied ? 0.8 : 0
  };
}
var CSS_SELECTOR_PATTERNS, UI_PATTERN_TO_ROLE;
var init_selector = __esm({
  "src/heal/fixes/selector.ts"() {
    CSS_SELECTOR_PATTERNS = [
      // page.locator('.class') or page.locator('#id')
      /page\.locator\s*\(\s*['"`]([.#][^'"`]+)['"`]\s*\)/g,
      // page.locator('[attribute]')
      /page\.locator\s*\(\s*['"`](\[[^\]]+\])['"`]\s*\)/g,
      // page.locator('tag.class')
      /page\.locator\s*\(\s*['"`]([a-z]+[.#][^'"`]+)['"`]\s*\)/g
    ];
    UI_PATTERN_TO_ROLE = {
      "button": { role: "button" },
      "btn": { role: "button" },
      "submit": { role: "button", nameHint: "submit" },
      "input": { role: "textbox" },
      "textbox": { role: "textbox" },
      "checkbox": { role: "checkbox" },
      "radio": { role: "radio" },
      "select": { role: "combobox" },
      "dropdown": { role: "combobox" },
      "link": { role: "link" },
      "heading": { role: "heading" },
      "h1": { role: "heading" },
      "h2": { role: "heading" },
      "h3": { role: "heading" },
      "dialog": { role: "dialog" },
      "modal": { role: "dialog" },
      "alert": { role: "alert" },
      "tab": { role: "tab" },
      "menu": { role: "menu" },
      "menuitem": { role: "menuitem" },
      "table": { role: "table" },
      "row": { role: "row" },
      "cell": { role: "cell" },
      "grid": { role: "grid" },
      "list": { role: "list" },
      "listitem": { role: "listitem" },
      "img": { role: "img" },
      "image": { role: "img" },
      "nav": { role: "navigation" },
      "navigation": { role: "navigation" },
      "search": { role: "search" },
      "main": { role: "main" },
      "banner": { role: "banner" },
      "footer": { role: "contentinfo" }
    };
  }
});

// src/heal/fixes/navigation.ts
function hasNavigationWait(code) {
  return EXISTING_WAIT_PATTERNS.some((pattern) => pattern.test(code));
}
function extractUrlFromError(errorMessage) {
  const matchPattern2 = errorMessage.match(/Expected\s+URL\s+to\s+match\s+['"]([^'"]+)['"]/i);
  if (matchPattern2) {
    return matchPattern2[1] ?? null;
  }
  const matchUrl = errorMessage.match(/expected\s+['"]([^'"]+)['"]\s+to\s+match/i);
  if (matchUrl) {
    return matchUrl[1] ?? null;
  }
  const waitingPattern = errorMessage.match(/waiting\s+for\s+URL\s+['"]([^'"]+)['"]/i);
  if (waitingPattern) {
    return waitingPattern[1] ?? null;
  }
  return null;
}
function extractUrlFromGoto(code) {
  const match = code.match(/page\.goto\s*\(\s*['"`]([^'"`]+)['"`]/);
  return match ? match[1] ?? null : null;
}
function inferUrlPattern(code, errorMessage) {
  const errorUrl = extractUrlFromError(errorMessage);
  if (errorUrl) {
    return errorUrl;
  }
  const gotoUrl = extractUrlFromGoto(code);
  if (gotoUrl) {
    return gotoUrl;
  }
  return null;
}
function generateWaitForURL(urlPattern, options) {
  const opts = options?.timeout ? `, { timeout: ${options.timeout} }` : "";
  if (urlPattern.includes("*") || urlPattern.includes("\\")) {
    return `await page.waitForURL(/${urlPattern}/${opts})`;
  }
  return `await page.waitForURL('${urlPattern}'${opts})`;
}
function generateToHaveURL(urlPattern) {
  if (urlPattern.includes("*") || urlPattern.includes("\\")) {
    return `await expect(page).toHaveURL(/${urlPattern}/)`;
  }
  return `await expect(page).toHaveURL('${urlPattern}')`;
}
function insertNavigationWait(code, lineNumber, urlPattern) {
  const lines = code.split("\n");
  if (lineNumber < 1 || lineNumber > lines.length) {
    return {
      applied: false,
      code,
      description: "Invalid line number",
      confidence: 0
    };
  }
  const contextStart = Math.max(0, lineNumber - 2);
  const contextEnd = Math.min(lines.length, lineNumber + 2);
  const context = lines.slice(contextStart, contextEnd).join("\n");
  if (hasNavigationWait(context)) {
    return {
      applied: false,
      code,
      description: "Navigation wait already exists in context",
      confidence: 0
    };
  }
  const actionLine = lines[lineNumber - 1];
  const indentation = actionLine.match(/^(\s*)/)?.[1] || "";
  const waitStatement = `${indentation}${generateToHaveURL(urlPattern)}`;
  lines.splice(lineNumber, 0, waitStatement);
  return {
    applied: true,
    code: lines.join("\n"),
    description: `Added toHaveURL assertion for '${urlPattern}'`,
    confidence: 0.7
  };
}
function applyNavigationFix(context) {
  const { code, lineNumber, expectedUrl, errorMessage } = context;
  const urlPattern = expectedUrl || inferUrlPattern(code, errorMessage);
  if (!urlPattern) {
    return applyLoadStateWait(code, lineNumber);
  }
  if (hasNavigationWait(code)) {
    return {
      applied: false,
      code,
      description: "Navigation wait already exists",
      confidence: 0
    };
  }
  return insertNavigationWait(code, lineNumber, urlPattern);
}
function applyLoadStateWait(code, lineNumber) {
  const lines = code.split("\n");
  if (lineNumber < 1 || lineNumber > lines.length) {
    return {
      applied: false,
      code,
      description: "Invalid line number",
      confidence: 0
    };
  }
  const actionLine = lines[lineNumber - 1];
  const indentation = actionLine.match(/^(\s*)/)?.[1] || "";
  const waitStatement = `${indentation}await page.waitForLoadState('networkidle')`;
  lines.splice(lineNumber, 0, waitStatement);
  return {
    applied: true,
    code: lines.join("\n"),
    description: "Added waitForLoadState as fallback",
    confidence: 0.5
  };
}
function fixMissingGotoAwait(code) {
  const pattern = /(?<!\bawait\s+)(\bpage\.goto\s*\()/g;
  if (!pattern.test(code)) {
    return {
      applied: false,
      code,
      description: "No missing await on goto found",
      confidence: 0
    };
  }
  const modifiedCode = code.replace(
    /(?<!\bawait\s+)(\bpage\.goto\s*\()/g,
    "await $1"
  );
  return {
    applied: modifiedCode !== code,
    code: modifiedCode,
    description: "Added missing await to page.goto",
    confidence: 0.9
  };
}
function addNavigationWaitAfterClick(code, clickLineNumber, expectedUrl) {
  const urlPattern = expectedUrl || ".*";
  return insertNavigationWait(code, clickLineNumber, urlPattern);
}
var EXISTING_WAIT_PATTERNS;
var init_navigation = __esm({
  "src/heal/fixes/navigation.ts"() {
    EXISTING_WAIT_PATTERNS = [
      /await\s+page\.waitForURL/,
      /await\s+expect\s*\(\s*page\s*\)\.toHaveURL/,
      /await\s+page\.waitForNavigation/,
      /await\s+page\.waitForLoadState/
    ];
  }
});

// src/heal/fixes/timing.ts
function extractTimeoutFromError(errorMessage) {
  const match = errorMessage.match(/timeout\s+(\d+)ms/i);
  return match ? parseInt(match[1], 10) : null;
}
function suggestTimeoutIncrease(currentTimeout, maxTimeout = 3e4) {
  const suggested = Math.min(Math.round(currentTimeout * 1.5), maxTimeout);
  return suggested;
}
function fixMissingAwait(code) {
  let modifiedCode = code;
  let fixCount = 0;
  for (const pattern of MISSING_AWAIT_PATTERNS) {
    pattern.lastIndex = 0;
    modifiedCode = modifiedCode.replace(pattern, (_match, p1) => {
      fixCount++;
      return `await ${p1}`;
    });
  }
  return {
    applied: fixCount > 0,
    code: modifiedCode,
    description: fixCount > 0 ? `Added ${fixCount} missing await statement(s)` : "No missing await found",
    confidence: fixCount > 0 ? 0.9 : 0
  };
}
function convertToWebFirstAssertion(code) {
  let modifiedCode = code;
  let applied = false;
  modifiedCode = modifiedCode.replace(
    /const\s+(\w+)\s*=\s*await\s+(\w+)\.textContent\s*\(\s*\)\s*;?\s*\n(\s*)expect\s*\(\s*\1\s*\)\.toBe\s*\(\s*(['"][^'"]+['"])\s*\)/g,
    (_, _varName, locator, indent, expected) => {
      applied = true;
      return `${indent}await expect(${locator}).toHaveText(${expected})`;
    }
  );
  modifiedCode = modifiedCode.replace(
    /const\s+(\w+)\s*=\s*await\s+(\w+)\.innerText\s*\(\s*\)\s*;?\s*\n(\s*)expect\s*\(\s*\1\s*\)\.toBe\s*\(\s*(['"][^'"]+['"])\s*\)/g,
    (_, _varName, locator, indent, expected) => {
      applied = true;
      return `${indent}await expect(${locator}).toHaveText(${expected})`;
    }
  );
  modifiedCode = modifiedCode.replace(
    /const\s+(\w+)\s*=\s*await\s+(\w+)\.isVisible\s*\(\s*\)\s*;?\s*\n(\s*)expect\s*\(\s*\1\s*\)\.toBe\s*\(\s*true\s*\)/g,
    (_, _varName, locator, indent) => {
      applied = true;
      return `${indent}await expect(${locator}).toBeVisible()`;
    }
  );
  modifiedCode = modifiedCode.replace(
    /const\s+(\w+)\s*=\s*await\s+(\w+)\.isHidden\s*\(\s*\)\s*;?\s*\n(\s*)expect\s*\(\s*\1\s*\)\.toBe\s*\(\s*true\s*\)/g,
    (_, _varName, locator, indent) => {
      applied = true;
      return `${indent}await expect(${locator}).toBeHidden()`;
    }
  );
  return {
    applied,
    code: modifiedCode,
    description: applied ? "Converted to web-first assertion" : "No conversion needed",
    confidence: applied ? 0.85 : 0
  };
}
function addTimeout(code, lineNumber, timeout) {
  const lines = code.split("\n");
  if (lineNumber < 1 || lineNumber > lines.length) {
    return {
      applied: false,
      code,
      description: "Invalid line number",
      confidence: 0
    };
  }
  const line = lines[lineNumber - 1];
  if (/\btimeout\s*:/i.test(line)) {
    return {
      applied: false,
      code,
      description: "Timeout already specified",
      confidence: 0
    };
  }
  let modifiedLine = line;
  modifiedLine = modifiedLine.replace(
    /\.(click|fill|press|type|hover|focus|check|uncheck)\s*\(\s*\)/g,
    `.$1({ timeout: ${timeout} })`
  );
  modifiedLine = modifiedLine.replace(
    /\.(click|fill|press|type|hover|focus|check|uncheck)\s*\(\s*(['"][^'"]*['"])\s*\)/g,
    `.$1($2, { timeout: ${timeout} })`
  );
  modifiedLine = modifiedLine.replace(
    /\.(click|fill|press|type|hover|focus|check|uncheck)\s*\(\s*\{([^}]*)\}\s*\)/g,
    (_, action, options) => {
      if (options.includes("timeout")) {
        return _;
      }
      return `.${action}({ ${options.trim()}, timeout: ${timeout} })`;
    }
  );
  modifiedLine = modifiedLine.replace(
    /\.(toBeVisible|toBeHidden|toHaveText|toContainText|toHaveValue)\s*\(\s*\)/g,
    `.$1({ timeout: ${timeout} })`
  );
  const applied = modifiedLine !== line;
  lines[lineNumber - 1] = modifiedLine;
  return {
    applied,
    code: lines.join("\n"),
    description: applied ? `Added timeout: ${timeout}ms` : "Unable to add timeout",
    confidence: applied ? 0.6 : 0
  };
}
function applyTimingFix(context) {
  const { code, lineNumber, currentTimeout, errorMessage } = context;
  const awaitFix = fixMissingAwait(code);
  if (awaitFix.applied) {
    return awaitFix;
  }
  const webFirstFix = convertToWebFirstAssertion(code);
  if (webFirstFix.applied) {
    return webFirstFix;
  }
  const timeout = currentTimeout || extractTimeoutFromError(errorMessage) || 5e3;
  const newTimeout = suggestTimeoutIncrease(timeout);
  return addTimeout(code, lineNumber, newTimeout);
}
function wrapWithExpectToPass(code, lineStart, lineEnd, options) {
  const lines = code.split("\n");
  if (lineStart < 1 || lineEnd > lines.length || lineStart > lineEnd) {
    return {
      applied: false,
      code,
      description: "Invalid line range",
      confidence: 0
    };
  }
  const blockLines = lines.slice(lineStart - 1, lineEnd);
  const indentation = blockLines[0].match(/^(\s*)/)?.[1] || "";
  const optParts = [];
  if (options?.timeout) {
    optParts.push(`timeout: ${options.timeout}`);
  }
  if (options?.intervals) {
    optParts.push(`intervals: [${options.intervals.join(", ")}]`);
  }
  const optString = optParts.length > 0 ? `, { ${optParts.join(", ")} }` : "";
  const wrapped = [
    `${indentation}await expect(async () => {`,
    ...blockLines.map((line) => `  ${line}`),
    `${indentation}}).toPass(${optString.slice(2)})`
  ];
  lines.splice(lineStart - 1, lineEnd - lineStart + 1, ...wrapped);
  return {
    applied: true,
    code: lines.join("\n"),
    description: "Wrapped with expect.toPass for retry behavior",
    confidence: 0.7
  };
}
function wrapWithExpectPoll(_code, _lineNumber, getter, expected, options) {
  const optParts = [];
  if (options?.timeout) {
    optParts.push(`timeout: ${options.timeout}`);
  }
  if (options?.intervals) {
    optParts.push(`intervals: [${options.intervals.join(", ")}]`);
  }
  const optString = optParts.length > 0 ? `, { ${optParts.join(", ")} }` : "";
  return `await expect.poll(async () => ${getter}${optString}).toBe(${expected})`;
}
var MISSING_AWAIT_PATTERNS;
var init_timing = __esm({
  "src/heal/fixes/timing.ts"() {
    MISSING_AWAIT_PATTERNS = [
      // Playwright actions without await
      /(?<!\bawait\s+)(page\.(?:click|fill|type|check|uncheck|selectOption|hover|focus|press|dblclick|dragTo)\s*\()/g,
      // Expectations without await
      /(?<!\bawait\s+)(expect\s*\([^)]+\)\.(?:toBeVisible|toBeHidden|toHaveText|toContainText|toHaveValue|toHaveURL|toHaveTitle)\s*\()/g,
      // Locator actions without await
      /(?<!\bawait\s+)([a-zA-Z_$][a-zA-Z0-9_$]*\.(?:click|fill|type|check|hover|press)\s*\()/g
    ];
  }
});
function applyFix(code, fixType, context) {
  const { lineNumber, errorMessage, ariaInfo } = context;
  switch (fixType) {
    case "selector-refine":
      return applySelectorFix({
        code,
        ariaInfo
      });
    case "add-exact":
      return addExactToLocator(code);
    case "missing-await":
      return fixMissingAwait(code);
    case "navigation-wait":
      return applyNavigationFix({
        code,
        lineNumber,
        errorMessage
      });
    case "web-first-assertion":
      return convertToWebFirstAssertion(code);
    case "timeout-increase":
      return applyTimingFix({
        code,
        lineNumber,
        errorMessage
      });
    default:
      return {
        applied: false,
        code,
        description: `Unknown fix type: ${fixType}`
      };
  }
}
function extractLineNumber(summary) {
  const firstTest = summary.failures.tests[0];
  if (firstTest) {
    const lineMatch = firstTest.match(/:(\d+)(?::\d+)?(?:\)|$)/);
    if (lineMatch) {
      return parseInt(lineMatch[1], 10);
    }
    const atLineMatch = firstTest.match(/at line (\d+)/i);
    if (atLineMatch) {
      return parseInt(atLineMatch[1], 10);
    }
  }
  for (const [, classification] of Object.entries(summary.failures.classifications)) {
    if (classification && typeof classification === "object" && "explanation" in classification) {
      const explanation = classification.explanation;
      const lineMatch = explanation.match(/:(\d+)(?::\d+)?/);
      if (lineMatch) {
        return parseInt(lineMatch[1], 10);
      }
    }
  }
  return 1;
}
function extractClassification(summary) {
  const classifications = summary.failures.classifications;
  const firstKey = Object.keys(classifications)[0];
  if (firstKey && classifications[firstKey]) {
    return classifications[firstKey];
  }
  return null;
}
async function runHealingLoop(options) {
  const {
    journeyId,
    testFile,
    outputDir,
    config = DEFAULT_HEALING_CONFIG,
    verifyFn,
    ariaInfo
  } = options;
  const logger = new HealingLogger(journeyId, outputDir, config.maxAttempts);
  const attemptedFixes = [];
  if (!existsSync(testFile)) {
    logger.markFailed("Test file not found");
    return {
      success: false,
      status: "failed",
      attempts: 0,
      logPath: logger.getOutputPath(),
      recommendation: "Test file not found"
    };
  }
  let currentCode = readFileSync(testFile, "utf-8");
  let lastSummary = null;
  try {
    lastSummary = await verifyFn();
    if (lastSummary.status === "passed") {
      logger.markHealed();
      return {
        success: true,
        status: "healed",
        attempts: 0,
        logPath: logger.getOutputPath()
      };
    }
  } catch (error) {
    logger.markFailed(`Initial verification failed: ${error}`);
    return {
      success: false,
      status: "failed",
      attempts: 0,
      logPath: logger.getOutputPath(),
      recommendation: "Initial verification failed"
    };
  }
  const classification = extractClassification(lastSummary);
  if (!classification) {
    logger.markFailed("Unable to classify failure");
    return {
      success: false,
      status: "failed",
      attempts: 0,
      logPath: logger.getOutputPath(),
      recommendation: "Unable to classify failure for healing"
    };
  }
  const evaluation = evaluateHealing(classification, config);
  if (!evaluation.canHeal) {
    logger.markFailed(evaluation.reason);
    return {
      success: false,
      status: "not_healable",
      attempts: 0,
      logPath: logger.getOutputPath(),
      recommendation: evaluation.reason
    };
  }
  while (!logger.isMaxAttemptsReached()) {
    const attemptNumber = logger.getAttemptCount() + 1;
    const startTime = Date.now();
    const nextFix = getNextFix(classification, attemptedFixes, config);
    if (!nextFix) {
      logger.markExhausted(getPostHealingRecommendation(classification, attemptNumber));
      return {
        success: false,
        status: "exhausted",
        attempts: attemptNumber - 1,
        logPath: logger.getOutputPath(),
        recommendation: getPostHealingRecommendation(classification, attemptNumber)
      };
    }
    attemptedFixes.push(nextFix);
    const fixResult = applyFix(currentCode, nextFix, {
      lineNumber: extractLineNumber(lastSummary),
      errorMessage: lastSummary.failures.tests[0] || "",
      ariaInfo
    });
    if (!fixResult.applied) {
      logger.logAttempt({
        attempt: attemptNumber,
        failureType: classification.category,
        fixType: nextFix,
        file: testFile,
        change: fixResult.description,
        evidence: [],
        result: "fail",
        errorMessage: "Fix not applied",
        duration: Date.now() - startTime
      });
      continue;
    }
    writeFileSync(testFile, fixResult.code, "utf-8");
    currentCode = fixResult.code;
    try {
      lastSummary = await verifyFn();
      const attempt = {
        attempt: attemptNumber,
        failureType: classification.category,
        fixType: nextFix,
        file: testFile,
        change: fixResult.description,
        evidence: lastSummary.reportPath ? [lastSummary.reportPath] : [],
        result: lastSummary.status === "passed" ? "pass" : "fail",
        duration: Date.now() - startTime
      };
      if (lastSummary.status !== "passed") {
        attempt.errorMessage = lastSummary.failures.tests[0] || "Unknown error";
        const newClassification = extractClassification(lastSummary);
        if (newClassification && newClassification.category !== classification.category) {
          Object.assign(classification, newClassification);
        }
      }
      logger.logAttempt(attempt);
      if (lastSummary.status === "passed") {
        logger.markHealed();
        return {
          success: true,
          status: "healed",
          attempts: attemptNumber,
          appliedFix: nextFix,
          logPath: logger.getOutputPath(),
          modifiedCode: currentCode
        };
      }
    } catch (error) {
      logger.logAttempt({
        attempt: attemptNumber,
        failureType: classification.category,
        fixType: nextFix,
        file: testFile,
        change: fixResult.description,
        evidence: [],
        result: "error",
        errorMessage: String(error),
        duration: Date.now() - startTime
      });
    }
  }
  logger.markExhausted(getPostHealingRecommendation(classification, config.maxAttempts));
  return {
    success: false,
    status: "exhausted",
    attempts: config.maxAttempts,
    logPath: logger.getOutputPath(),
    recommendation: getPostHealingRecommendation(classification, config.maxAttempts)
  };
}
function previewHealingFixes(code, classification, config = DEFAULT_HEALING_CONFIG) {
  const previews = [];
  const evaluation = evaluateHealing(classification, config);
  if (!evaluation.canHeal) {
    return previews;
  }
  for (const fixType of evaluation.applicableFixes) {
    const result = applyFix(code, fixType, {
      lineNumber: 1,
      errorMessage: ""});
    if (result.applied) {
      previews.push({
        fixType,
        preview: result.description,
        confidence: 0.5
        // Could be enhanced with actual confidence scores
      });
    }
  }
  return previews;
}
function wouldFixApply(code, fixType, classification) {
  const result = applyFix(code, fixType, {
    lineNumber: 1,
    errorMessage: ""});
  return result.applied;
}
var init_loop = __esm({
  "src/heal/loop.ts"() {
    init_rules();
    init_logger();
    init_selector();
    init_navigation();
    init_timing();
  }
});
function generateRunId() {
  const timestamp = Date.now().toString(36);
  const random = randomBytes(4).toString("hex");
  return `${timestamp}-${random}`;
}
function hasDataIsolation(code) {
  if (/\brunId\b/i.test(code)) {
    return true;
  }
  if (/testInfo\.testId/i.test(code)) {
    return true;
  }
  if (/Date\.now\(\)|Math\.random\(\)|crypto|uuid/i.test(code)) {
    return true;
  }
  return false;
}
function addRunIdVariable(code) {
  if (/\bconst\s+runId\b/.test(code)) {
    return {
      applied: false,
      code,
      description: "runId already defined",
      confidence: 0
    };
  }
  const testMatch = code.match(/test\s*\(\s*['"`][^'"`]+['"`]\s*,\s*async\s*\(\s*\{[^}]*\}\s*\)\s*=>\s*\{/);
  if (!testMatch) {
    return {
      applied: false,
      code,
      description: "Unable to find test function",
      confidence: 0
    };
  }
  const insertIndex = testMatch.index + testMatch[0].length;
  const indentation = "    ";
  const runIdDeclaration = `
${indentation}const runId = \`\${Date.now()}-\${Math.random().toString(36).slice(2, 8)}\`;`;
  const modifiedCode = code.slice(0, insertIndex) + runIdDeclaration + code.slice(insertIndex);
  return {
    applied: true,
    code: modifiedCode,
    description: "Added runId variable for data isolation",
    confidence: 0.8
  };
}
function namespaceEmail(email, runId) {
  const [local, domain] = email.split("@");
  if (!domain) return `${email}-${runId}`;
  return `${local}+${runId}@${domain}`;
}
function namespaceName(name, runId) {
  return `${name} ${runId}`;
}
function replaceHardcodedEmail(code) {
  const emailPattern = /(['"`])([\w.+-]+@[\w.-]+\.[\w]{2,})(['"`])/g;
  let applied = false;
  const modifiedCode = code.replace(emailPattern, (match, _q1, email, _q2) => {
    if (code.includes("`") && code.includes("${runId}")) {
      return match;
    }
    const before = code.slice(Math.max(0, code.indexOf(match) - 50), code.indexOf(match));
    if (/\.fill\s*\([^,]*$/.test(before)) {
      applied = true;
      const [local, domain] = email.split("@");
      return `\`${local}+\${runId}@${domain}\``;
    }
    return match;
  });
  return {
    applied,
    code: modifiedCode,
    description: applied ? "Namespaced email with runId" : "No hardcoded email to namespace",
    confidence: applied ? 0.7 : 0
  };
}
function replaceHardcodedTestData(code) {
  let modifiedCode = code;
  let applied = false;
  modifiedCode = modifiedCode.replace(
    /(['"`])(Test\s*(?:User|Name|Account|Client|Customer))\s*(['"`])/gi,
    (_match, _q1, name, _q2) => {
      applied = true;
      return `\`${name} \${runId}\``;
    }
  );
  modifiedCode = modifiedCode.replace(
    /\.fill\s*\([^,]+,\s*['"`](test[-_]?\w+)['"`]\s*\)/gi,
    (match, value) => {
      applied = true;
      return match.replace(`'${value}'`, `\`${value}-\${runId}\``).replace(`"${value}"`, `\`${value}-\${runId}\``);
    }
  );
  return {
    applied,
    code: modifiedCode,
    description: applied ? "Namespaced test data with runId" : "No hardcoded test data found",
    confidence: applied ? 0.6 : 0
  };
}
function applyDataFix(context) {
  const { code } = context;
  if (hasDataIsolation(code)) {
    return {
      applied: false,
      code,
      description: "Data isolation already present",
      confidence: 0
    };
  }
  let result = addRunIdVariable(code);
  if (!result.applied) {
    return result;
  }
  let modifiedCode = result.code;
  let fixCount = 1;
  const emailResult = replaceHardcodedEmail(modifiedCode);
  if (emailResult.applied) {
    modifiedCode = emailResult.code;
    fixCount++;
  }
  const dataResult = replaceHardcodedTestData(modifiedCode);
  if (dataResult.applied) {
    modifiedCode = dataResult.code;
    fixCount++;
  }
  return {
    applied: true,
    code: modifiedCode,
    description: `Applied ${fixCount} data isolation fix(es)`,
    confidence: 0.7
  };
}
function addCleanupHook(code, cleanupCode) {
  if (/test\.afterEach\s*\(/.test(code)) {
    return {
      applied: false,
      code,
      description: "afterEach hook already exists",
      confidence: 0
    };
  }
  const describeMatch = code.match(/test\.describe\s*\(\s*['"`][^'"`]+['"`]\s*,\s*\(\s*\)\s*=>\s*\{/);
  if (describeMatch) {
    const insertIndex = describeMatch.index + describeMatch[0].length;
    const indentation = "  ";
    const hookCode = `
${indentation}test.afterEach(async () => {
${indentation}  ${cleanupCode}
${indentation}});
`;
    const modifiedCode = code.slice(0, insertIndex) + hookCode + code.slice(insertIndex);
    return {
      applied: true,
      code: modifiedCode,
      description: "Added afterEach cleanup hook",
      confidence: 0.7
    };
  }
  return {
    applied: false,
    code,
    description: "Unable to find suitable location for cleanup hook",
    confidence: 0
  };
}
function extractTestDataPatterns(code) {
  const patterns = [];
  const fillMatches = code.matchAll(/\.fill\s*\([^,]+,\s*['"`]([^'"`]+)['"`]\s*\)/g);
  for (const match of fillMatches) {
    patterns.push(match[1]);
  }
  const emailMatches = code.matchAll(/['"`]([\w.+-]+@[\w.-]+\.[\w]{2,})['"`]/g);
  for (const match of emailMatches) {
    patterns.push(match[1]);
  }
  return patterns;
}
var init_data = __esm({
  "src/heal/fixes/data.ts"() {
  }
});

// src/heal/index.ts
var heal_exports = {};
__export(heal_exports, {
  DEFAULT_HEALING_CONFIG: () => DEFAULT_HEALING_CONFIG,
  DEFAULT_HEALING_RULES: () => DEFAULT_HEALING_RULES,
  HealingLogger: () => HealingLogger,
  UNHEALABLE_CATEGORIES: () => UNHEALABLE_CATEGORIES,
  addCleanupHook: () => addCleanupHook,
  addExactToLocator: () => addExactToLocator,
  addNavigationWaitAfterClick: () => addNavigationWaitAfterClick,
  addRunIdVariable: () => addRunIdVariable,
  addTimeout: () => addTimeout,
  aggregateHealingLogs: () => aggregateHealingLogs,
  applyDataFix: () => applyDataFix,
  applyNavigationFix: () => applyNavigationFix,
  applySelectorFix: () => applySelectorFix,
  applyTimingFix: () => applyTimingFix,
  containsCSSSelector: () => containsCSSSelector,
  convertToWebFirstAssertion: () => convertToWebFirstAssertion,
  createHealingReport: () => createHealingReport,
  evaluateHealing: () => evaluateHealing,
  extractCSSSelector: () => extractCSSSelector,
  extractNameFromSelector: () => extractNameFromSelector,
  extractTestDataPatterns: () => extractTestDataPatterns,
  extractTimeoutFromError: () => extractTimeoutFromError,
  extractUrlFromError: () => extractUrlFromError,
  extractUrlFromGoto: () => extractUrlFromGoto,
  fixMissingAwait: () => fixMissingAwait,
  fixMissingGotoAwait: () => fixMissingGotoAwait,
  formatHealingLog: () => formatHealingLog,
  generateLabelLocator: () => generateLabelLocator,
  generateRoleLocator: () => generateRoleLocator,
  generateRunId: () => generateRunId,
  generateTestIdLocator: () => generateTestIdLocator,
  generateTextLocator: () => generateTextLocator,
  generateToHaveURL: () => generateToHaveURL,
  generateWaitForURL: () => generateWaitForURL,
  getApplicableRules: () => getApplicableRules,
  getHealingRecommendation: () => getHealingRecommendation,
  getNextFix: () => getNextFix,
  getPostHealingRecommendation: () => getPostHealingRecommendation,
  hasDataIsolation: () => hasDataIsolation,
  hasNavigationWait: () => hasNavigationWait,
  inferRoleFromSelector: () => inferRoleFromSelector,
  inferUrlPattern: () => inferUrlPattern,
  insertNavigationWait: () => insertNavigationWait,
  isCategoryHealable: () => isCategoryHealable,
  isFixAllowed: () => isFixAllowed,
  isFixForbidden: () => isFixForbidden,
  loadHealingLog: () => loadHealingLog,
  namespaceEmail: () => namespaceEmail,
  namespaceName: () => namespaceName,
  previewHealingFixes: () => previewHealingFixes,
  replaceHardcodedEmail: () => replaceHardcodedEmail,
  replaceHardcodedTestData: () => replaceHardcodedTestData,
  runHealingLoop: () => runHealingLoop,
  suggestTimeoutIncrease: () => suggestTimeoutIncrease,
  wouldFixApply: () => wouldFixApply,
  wrapWithExpectPoll: () => wrapWithExpectPoll,
  wrapWithExpectToPass: () => wrapWithExpectToPass
});
var init_heal = __esm({
  "src/heal/index.ts"() {
    init_rules();
    init_logger();
    init_loop();
    init_selector();
    init_navigation();
    init_timing();
    init_data();
  }
});

// src/ir/builder.ts
var LocatorBuilder = class _LocatorBuilder {
  spec = {};
  static role(role, name) {
    const builder = new _LocatorBuilder();
    builder.spec.strategy = "role";
    builder.spec.value = role;
    if (name) {
      builder.spec.options = { ...builder.spec.options, name };
    }
    return builder;
  }
  static label(label) {
    const builder = new _LocatorBuilder();
    builder.spec.strategy = "label";
    builder.spec.value = label;
    return builder;
  }
  static placeholder(placeholder) {
    const builder = new _LocatorBuilder();
    builder.spec.strategy = "placeholder";
    builder.spec.value = placeholder;
    return builder;
  }
  static text(text) {
    const builder = new _LocatorBuilder();
    builder.spec.strategy = "text";
    builder.spec.value = text;
    return builder;
  }
  static testId(testId) {
    const builder = new _LocatorBuilder();
    builder.spec.strategy = "testid";
    builder.spec.value = testId;
    return builder;
  }
  static css(selector) {
    const builder = new _LocatorBuilder();
    builder.spec.strategy = "css";
    builder.spec.value = selector;
    return builder;
  }
  static fromSpec(strategy, value) {
    const builder = new _LocatorBuilder();
    builder.spec.strategy = strategy;
    builder.spec.value = value;
    return builder;
  }
  exact(exact = true) {
    this.spec.options = { ...this.spec.options, exact };
    return this;
  }
  level(level) {
    this.spec.options = { ...this.spec.options, level };
    return this;
  }
  strict(strict = true) {
    this.spec.options = { ...this.spec.options, strict };
    return this;
  }
  name(name) {
    this.spec.options = { ...this.spec.options, name };
    return this;
  }
  build() {
    if (!this.spec.strategy || !this.spec.value) {
      throw new Error("LocatorSpec requires strategy and value");
    }
    return this.spec;
  }
};
var ValueBuilder = class {
  static literal(value) {
    return { type: "literal", value };
  }
  static actor(path) {
    return { type: "actor", value: path };
  }
  static runId() {
    return { type: "runId", value: "runId" };
  }
  static generated(template) {
    return { type: "generated", value: template };
  }
  static testData(path) {
    return { type: "testData", value: path };
  }
};
var StepBuilder = class {
  step = {
    actions: [],
    assertions: [],
    notes: []
  };
  constructor(id, description) {
    this.step.id = id;
    this.step.description = description;
  }
  sourceText(text) {
    this.step.sourceText = text;
    return this;
  }
  note(note) {
    this.step.notes.push(note);
    return this;
  }
  // Navigation actions
  goto(url, waitForLoad = true) {
    this.step.actions.push({ type: "goto", url, waitForLoad });
    return this;
  }
  waitForURL(pattern) {
    this.step.actions.push({ type: "waitForURL", pattern });
    return this;
  }
  // Interaction actions
  click(locator) {
    const spec = locator instanceof LocatorBuilder ? locator.build() : locator;
    this.step.actions.push({ type: "click", locator: spec });
    return this;
  }
  fill(locator, value) {
    const spec = locator instanceof LocatorBuilder ? locator.build() : locator;
    const valueSpec = typeof value === "string" ? ValueBuilder.literal(value) : value;
    this.step.actions.push({ type: "fill", locator: spec, value: valueSpec });
    return this;
  }
  select(locator, option) {
    const spec = locator instanceof LocatorBuilder ? locator.build() : locator;
    this.step.actions.push({ type: "select", locator: spec, option });
    return this;
  }
  check(locator) {
    const spec = locator instanceof LocatorBuilder ? locator.build() : locator;
    this.step.actions.push({ type: "check", locator: spec });
    return this;
  }
  press(key, locator) {
    const spec = locator ? locator instanceof LocatorBuilder ? locator.build() : locator : void 0;
    this.step.actions.push({ type: "press", key, locator: spec });
    return this;
  }
  // Assertions
  expectVisible(locator, timeout) {
    const spec = locator instanceof LocatorBuilder ? locator.build() : locator;
    this.step.assertions.push({ type: "expectVisible", locator: spec, timeout });
    return this;
  }
  expectNotVisible(locator, timeout) {
    const spec = locator instanceof LocatorBuilder ? locator.build() : locator;
    this.step.assertions.push({ type: "expectNotVisible", locator: spec, timeout });
    return this;
  }
  expectText(locator, text, timeout) {
    const spec = locator instanceof LocatorBuilder ? locator.build() : locator;
    this.step.assertions.push({ type: "expectText", locator: spec, text, timeout });
    return this;
  }
  expectURL(pattern) {
    this.step.assertions.push({ type: "expectURL", pattern });
    return this;
  }
  expectTitle(title) {
    this.step.assertions.push({ type: "expectTitle", title });
    return this;
  }
  expectToast(toastType, message) {
    this.step.assertions.push({ type: "expectToast", toastType, message });
    return this;
  }
  // Module calls
  callModule(module, method, args) {
    this.step.actions.push({ type: "callModule", module, method, args });
    return this;
  }
  // Blocked step
  blocked(reason, sourceText) {
    this.step.actions.push({ type: "blocked", reason, sourceText });
    return this;
  }
  // Raw primitive
  action(primitive) {
    this.step.actions.push(primitive);
    return this;
  }
  assertion(primitive) {
    this.step.assertions.push(primitive);
    return this;
  }
  build() {
    if (!this.step.id || !this.step.description) {
      throw new Error("IRStep requires id and description");
    }
    return this.step;
  }
};
var JourneyBuilder = class {
  journey = {
    tags: [],
    steps: [],
    moduleDependencies: { foundation: [], feature: [] }
  };
  constructor(id, title) {
    this.journey.id = id;
    this.journey.title = title;
  }
  tier(tier) {
    this.journey.tier = tier;
    return this;
  }
  scope(scope) {
    this.journey.scope = scope;
    return this;
  }
  actor(actor) {
    this.journey.actor = actor;
    return this;
  }
  tag(tag) {
    this.journey.tags.push(tag);
    return this;
  }
  tags(tags) {
    this.journey.tags.push(...tags);
    return this;
  }
  foundationModule(module) {
    this.journey.moduleDependencies.foundation.push(module);
    return this;
  }
  featureModule(module) {
    this.journey.moduleDependencies.feature.push(module);
    return this;
  }
  modules(deps) {
    this.journey.moduleDependencies = deps;
    return this;
  }
  data(config) {
    this.journey.data = config;
    return this;
  }
  completion(signals) {
    this.journey.completion = signals;
    return this;
  }
  setup(primitives) {
    this.journey.setup = primitives;
    return this;
  }
  step(step) {
    const builtStep = step instanceof StepBuilder ? step.build() : step;
    this.journey.steps.push(builtStep);
    return this;
  }
  cleanup(primitives) {
    this.journey.cleanup = primitives;
    return this;
  }
  revision(rev) {
    this.journey.revision = rev;
    return this;
  }
  sourcePath(path) {
    this.journey.sourcePath = path;
    return this;
  }
  build() {
    if (!this.journey.id || !this.journey.title || !this.journey.tier || !this.journey.scope || !this.journey.actor) {
      throw new Error("IRJourney requires id, title, tier, scope, and actor");
    }
    const standardTags = [
      "@artk",
      "@journey",
      `@${this.journey.id}`,
      `@tier-${this.journey.tier}`,
      `@scope-${this.journey.scope}`
    ];
    const allTags = [.../* @__PURE__ */ new Set([...standardTags, ...this.journey.tags])];
    this.journey.tags = allTags;
    return this.journey;
  }
};
var IR = {
  journey: (id, title) => new JourneyBuilder(id, title),
  step: (id, description) => new StepBuilder(id, description),
  locator: {
    role: LocatorBuilder.role,
    label: LocatorBuilder.label,
    placeholder: LocatorBuilder.placeholder,
    text: LocatorBuilder.text,
    testId: LocatorBuilder.testId,
    css: LocatorBuilder.css
  },
  value: ValueBuilder
};

// src/ir/serialize.ts
function serializeJourney(journey, options = {}) {
  const { pretty = true, indent = 2 } = options;
  const cleaned = cleanObject(journey, options.includeEmpty ?? false);
  return pretty ? JSON.stringify(cleaned, null, indent) : JSON.stringify(cleaned);
}
function serializeStep(step, options = {}) {
  const { pretty = true, indent = 2 } = options;
  const cleaned = cleanObject(step, options.includeEmpty ?? false);
  return pretty ? JSON.stringify(cleaned, null, indent) : JSON.stringify(cleaned);
}
function serializePrimitive(primitive, options = {}) {
  const { pretty = true, indent = 2 } = options;
  const cleaned = cleanObject(primitive, options.includeEmpty ?? false);
  return pretty ? JSON.stringify(cleaned, null, indent) : JSON.stringify(cleaned);
}
function describeLocator(locator) {
  const { strategy, value, options } = locator;
  switch (strategy) {
    case "role": {
      let desc = `getByRole('${value}'`;
      if (options?.name) {
        desc += `, { name: '${options.name}'`;
        if (options.exact) desc += ", exact: true";
        if (options.level) desc += `, level: ${options.level}`;
        desc += " }";
      }
      desc += ")";
      return desc;
    }
    case "label":
      return `getByLabel('${value}'${options?.exact ? ", { exact: true }" : ""})`;
    case "placeholder":
      return `getByPlaceholder('${value}'${options?.exact ? ", { exact: true }" : ""})`;
    case "text":
      return `getByText('${value}'${options?.exact ? ", { exact: true }" : ""})`;
    case "testid":
      return `getByTestId('${value}')`;
    case "css":
      return `locator('${value}')`;
    default:
      return `unknown('${value}')`;
  }
}
function describePrimitive(primitive) {
  switch (primitive.type) {
    case "goto":
      return `Navigate to ${primitive.url}`;
    case "click":
      return `Click ${describeLocator(primitive.locator)}`;
    case "fill":
      return `Fill ${describeLocator(primitive.locator)} with "${primitive.value.value}"`;
    case "select":
      return `Select "${primitive.option}" in ${describeLocator(primitive.locator)}`;
    case "check":
      return `Check ${describeLocator(primitive.locator)}`;
    case "uncheck":
      return `Uncheck ${describeLocator(primitive.locator)}`;
    case "press":
      return `Press "${primitive.key}"`;
    case "hover":
      return `Hover ${describeLocator(primitive.locator)}`;
    case "expectVisible":
      return `Expect ${describeLocator(primitive.locator)} to be visible`;
    case "expectNotVisible":
      return `Expect ${describeLocator(primitive.locator)} to be hidden`;
    case "expectText":
      return `Expect ${describeLocator(primitive.locator)} to have text "${primitive.text}"`;
    case "expectURL":
      return `Expect URL to match ${primitive.pattern}`;
    case "expectTitle":
      return `Expect title to be "${primitive.title}"`;
    case "expectToast":
      return `Expect ${primitive.toastType} toast${primitive.message ? `: "${primitive.message}"` : ""}`;
    case "callModule":
      return `Call ${primitive.module}.${primitive.method}()`;
    case "blocked":
      return `BLOCKED: ${primitive.reason}`;
    case "waitForURL":
      return `Wait for URL to match ${primitive.pattern}`;
    case "waitForResponse":
      return `Wait for response matching ${primitive.urlPattern}`;
    case "waitForLoadingComplete":
      return `Wait for loading to complete`;
    default:
      return `Unknown primitive: ${primitive.type}`;
  }
}
function summarizeJourney(journey) {
  const lines = [
    `Journey: ${journey.id} - ${journey.title}`,
    `  Tier: ${journey.tier}`,
    `  Scope: ${journey.scope}`,
    `  Actor: ${journey.actor}`,
    `  Tags: ${journey.tags.join(", ")}`,
    "",
    `  Steps (${journey.steps.length}):`
  ];
  for (const step of journey.steps) {
    lines.push(`    ${step.id}: ${step.description}`);
    lines.push(`      Actions: ${step.actions.length}`);
    lines.push(`      Assertions: ${step.assertions.length}`);
  }
  if (journey.moduleDependencies.foundation.length > 0) {
    lines.push("");
    lines.push(`  Foundation Modules: ${journey.moduleDependencies.foundation.join(", ")}`);
  }
  if (journey.moduleDependencies.feature.length > 0) {
    lines.push(`  Feature Modules: ${journey.moduleDependencies.feature.join(", ")}`);
  }
  return lines.join("\n");
}
function cleanObject(obj, includeEmpty) {
  if (obj === null || obj === void 0) {
    return includeEmpty ? obj : void 0;
  }
  if (Array.isArray(obj)) {
    const cleaned = obj.map((item) => cleanObject(item, includeEmpty)).filter((item) => includeEmpty || item !== void 0);
    return cleaned.length > 0 || includeEmpty ? cleaned : void 0;
  }
  if (typeof obj === "object") {
    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      const cleanedValue = cleanObject(value, includeEmpty);
      if (includeEmpty || cleanedValue !== void 0) {
        cleaned[key] = cleanedValue;
      }
    }
    return Object.keys(cleaned).length > 0 || includeEmpty ? cleaned : void 0;
  }
  return obj;
}
var SelectorStrategySchema = z.enum([
  "role",
  "label",
  "placeholder",
  "text",
  "testid",
  "css"
]);
var PathsSchema = z.object({
  journeys: z.string().default("journeys"),
  modules: z.string().default("e2e/modules"),
  tests: z.string().default("e2e/tests"),
  templates: z.string().default("artk/templates"),
  catalog: z.string().default("artk/selectors")
});
var EslintSeveritySchema = z.enum(["error", "warn", "off"]);
var EslintRulesSchema = z.record(z.string(), EslintSeveritySchema).default({
  "no-wait-for-timeout": "error",
  "no-force-option": "error",
  "prefer-web-first-assertions": "error"
});
var SelectorPolicySchema = z.object({
  priority: z.array(SelectorStrategySchema).default([
    "role",
    "label",
    "placeholder",
    "text",
    "testid",
    "css"
  ]),
  forbiddenPatterns: z.array(z.string()).default([])
});
var ValidationSchema = z.object({
  eslintRules: EslintRulesSchema.default({
    "no-wait-for-timeout": "error",
    "no-force-option": "error",
    "prefer-web-first-assertions": "error"
  }),
  customRules: z.array(z.string()).default([])
});
var HealSchema = z.object({
  enabled: z.boolean().default(true),
  maxSuggestions: z.number().min(1).max(10).default(5),
  skipPatterns: z.array(z.string()).default([])
});
var RegenerationStrategySchema = z.enum(["ast", "blocks"]).default("ast");
var LLKBIntegrationLevelSchema = z.enum(["minimal", "enhance", "aggressive"]).default("enhance");
var LLKBIntegrationSchema = z.object({
  /** Enable LLKB integration */
  enabled: z.boolean().default(false),
  /** Path to LLKB-generated config file */
  configPath: z.string().optional(),
  /** Path to LLKB-generated glossary file */
  glossaryPath: z.string().optional(),
  /** Integration level */
  level: LLKBIntegrationLevelSchema
}).default({});
var AutogenConfigSchema = z.object({
  version: z.literal(1).default(1),
  paths: PathsSchema.default({}),
  selectorPolicy: SelectorPolicySchema.default({}),
  validation: ValidationSchema.default({}),
  heal: HealSchema.default({}),
  regenerationStrategy: RegenerationStrategySchema,
  llkb: LLKBIntegrationSchema
});
var CONFIG_PATHS = [
  "artk/autogen.config.yml",
  "artk/autogen.config.yaml",
  ".artk/autogen.config.yml",
  ".artk/autogen.config.yaml"
];
var ConfigLoadError = class extends Error {
  constructor(message, cause) {
    super(message);
    this.cause = cause;
    this.name = "ConfigLoadError";
    if (cause !== void 0) {
      this.cause = cause;
    }
  }
};
function findConfigFile(rootDir) {
  for (const configPath of CONFIG_PATHS) {
    const fullPath = join(rootDir, configPath);
    if (existsSync(fullPath)) {
      return fullPath;
    }
  }
  return null;
}
function loadConfig(configPath) {
  const rootDir = process.cwd();
  let resolvedPath;
  if (configPath) {
    resolvedPath = resolve(rootDir, configPath);
  } else {
    const found = findConfigFile(rootDir);
    if (!found) {
      console.warn(
        "No autogen config file found, using defaults. Create artk/autogen.config.yml to customize."
      );
      return AutogenConfigSchema.parse({});
    }
    resolvedPath = found;
  }
  if (!existsSync(resolvedPath)) {
    throw new ConfigLoadError(`Config file not found: ${resolvedPath}`);
  }
  let rawContent;
  try {
    rawContent = readFileSync(resolvedPath, "utf-8");
  } catch (err2) {
    throw new ConfigLoadError(`Failed to read config file: ${resolvedPath}`, err2);
  }
  let parsed;
  try {
    parsed = parse(rawContent);
  } catch (err2) {
    throw new ConfigLoadError(`Invalid YAML in config file: ${resolvedPath}`, err2);
  }
  const result = AutogenConfigSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new ConfigLoadError(
      `Invalid config in ${resolvedPath}:
${issues}`,
      result.error
    );
  }
  return result.data;
}
function getDefaultConfig() {
  return AutogenConfigSchema.parse({});
}
function resolveConfigPath(config, pathKey, rootDir) {
  const base = rootDir || process.cwd();
  return resolve(base, config.paths[pathKey]);
}
function loadSingleConfig(configPath) {
  const resolvedPath = resolve(process.cwd(), configPath);
  if (!existsSync(resolvedPath)) {
    throw new ConfigLoadError(`Config file not found: ${resolvedPath}`);
  }
  let rawContent;
  try {
    rawContent = readFileSync(resolvedPath, "utf-8");
  } catch (err2) {
    throw new ConfigLoadError(`Failed to read config file: ${resolvedPath}`, err2);
  }
  let parsed;
  try {
    parsed = parse(rawContent);
  } catch (err2) {
    throw new ConfigLoadError(`Invalid YAML in config file: ${resolvedPath}`, err2);
  }
  const result = AutogenConfigSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new ConfigLoadError(
      `Invalid config in ${resolvedPath}:
${issues}`,
      result.error
    );
  }
  return result.data;
}
function deepMerge(base, override) {
  const result = { ...base };
  for (const key of Object.keys(override)) {
    const overrideValue = override[key];
    if (overrideValue !== void 0) {
      result[key] = overrideValue;
    }
  }
  return result;
}
function mergeConfigs(configs) {
  if (configs.length === 0) {
    return getDefaultConfig();
  }
  return configs.reduce((merged, config, index) => {
    if (index === 0) {
      return config;
    }
    return {
      ...merged,
      version: config.version ?? merged.version,
      regenerationStrategy: config.regenerationStrategy ?? merged.regenerationStrategy,
      paths: deepMerge(merged.paths, config.paths),
      selectorPolicy: {
        ...merged.selectorPolicy,
        ...config.selectorPolicy,
        // Merge arrays additively for forbiddenPatterns
        forbiddenPatterns: [
          .../* @__PURE__ */ new Set([
            ...merged.selectorPolicy?.forbiddenPatterns ?? [],
            ...config.selectorPolicy?.forbiddenPatterns ?? []
          ])
        ],
        // Priority is overwritten if provided, not merged
        priority: config.selectorPolicy?.priority?.length ? config.selectorPolicy.priority : merged.selectorPolicy?.priority
      },
      validation: {
        ...merged.validation,
        ...config.validation,
        eslintRules: {
          ...merged.validation?.eslintRules,
          ...config.validation?.eslintRules
        },
        customRules: [
          .../* @__PURE__ */ new Set([
            ...merged.validation?.customRules ?? [],
            ...config.validation?.customRules ?? []
          ])
        ]
      },
      heal: deepMerge(merged.heal, config.heal),
      llkb: deepMerge(merged.llkb, config.llkb)
    };
  });
}
function loadConfigs(configPaths) {
  const existingPaths = configPaths.filter((p) => {
    const resolved = resolve(process.cwd(), p);
    return existsSync(resolved);
  });
  if (existingPaths.length === 0) {
    return getDefaultConfig();
  }
  const configs = existingPaths.map((p) => loadSingleConfig(p));
  return mergeConfigs(configs);
}
function loadLLKBConfig(basePath) {
  const llkbConfigPaths = [
    join(basePath, "autogen-llkb.config.yml"),
    join(basePath, "autogen-llkb.config.yaml")
  ];
  for (const llkbConfigPath of llkbConfigPaths) {
    if (existsSync(llkbConfigPath)) {
      try {
        return loadSingleConfig(llkbConfigPath);
      } catch {
        console.warn(`Warning: Invalid LLKB config at ${llkbConfigPath}, skipping`);
        return null;
      }
    }
  }
  return null;
}
function loadConfigWithMigration(configPath) {
  const config = loadConfig(configPath);
  if (config.llkb === void 0) {
    config.llkb = {
      enabled: false,
      level: "minimal"
    };
  }
  return config;
}
function needsConfigMigration(config) {
  if (typeof config !== "object" || config === null) {
    return false;
  }
  const obj = config;
  return obj.llkb === void 0;
}
function getSchemaVersion(config) {
  return config.version;
}
var JourneyStatusSchema = z.enum([
  "proposed",
  "defined",
  "clarified",
  "implemented",
  "quarantined",
  "deprecated"
]);
var JourneyTierSchema = z.enum(["smoke", "release", "regression"]);
var DataStrategySchema = z.enum(["seed", "create", "reuse"]);
var CleanupStrategySchema = z.enum(["required", "best-effort", "none"]);
var CompletionTypeSchema = z.enum(["url", "toast", "element", "text", "title", "api"]);
var ElementStateSchema = z.enum(["visible", "hidden", "attached", "detached"]);
var CompletionSignalSchema = z.object({
  type: CompletionTypeSchema,
  value: z.string().min(1, "Completion signal value is required"),
  options: z.object({
    timeout: z.number().positive().optional(),
    exact: z.boolean().optional(),
    state: ElementStateSchema.optional(),
    method: z.string().optional(),
    status: z.number().int().positive().optional()
  }).optional()
});
var DataConfigSchema = z.object({
  strategy: DataStrategySchema.default("create"),
  cleanup: CleanupStrategySchema.default("best-effort")
});
var ModulesSchema = z.object({
  foundation: z.array(z.string()).default([]),
  features: z.array(z.string()).default([])
});
var TestRefSchema = z.object({
  file: z.string(),
  line: z.number().optional()
});
var LinksSchema = z.object({
  issues: z.array(z.string()).optional(),
  prs: z.array(z.string()).optional(),
  docs: z.array(z.string()).optional()
});
var NegativePathSchema = z.object({
  name: z.string().min(1, "Negative path name is required"),
  input: z.record(z.any()),
  expectedError: z.string().min(1, "Expected error message is required"),
  expectedElement: z.string().optional()
});
var VisualRegressionSchema = z.object({
  enabled: z.boolean(),
  snapshots: z.array(z.string()).optional(),
  threshold: z.number().min(0).max(1).optional()
});
var AccessibilityTimingSchema = z.enum(["afterEach", "inTest"]);
var AccessibilitySchema = z.object({
  enabled: z.boolean(),
  rules: z.array(z.string()).optional(),
  exclude: z.array(z.string()).optional(),
  /**
   * When to run accessibility checks:
   * - 'afterEach': Run after each test (default, catches issues but doesn't fail individual tests)
   * - 'inTest': Run within test steps (fails immediately, better for CI)
   */
  timing: AccessibilityTimingSchema.default("afterEach")
});
var PerformanceSchema = z.object({
  enabled: z.boolean(),
  budgets: z.object({
    lcp: z.number().positive().optional(),
    fid: z.number().positive().optional(),
    cls: z.number().min(0).optional(),
    ttfb: z.number().positive().optional()
  }).optional(),
  /** Timeout for collecting performance metrics in ms (default: 3000) */
  collectTimeout: z.number().positive().optional()
});
var TestDataSetSchema = z.object({
  name: z.string().min(1, "Test data set name is required"),
  description: z.string().optional(),
  data: z.record(z.string(), z.any())
});
var JourneyFrontmatterSchema = z.object({
  id: z.string().regex(/^JRN-\d{4}$/, "Journey ID must be in format JRN-XXXX"),
  title: z.string().min(1, "Title is required"),
  status: JourneyStatusSchema,
  tier: JourneyTierSchema,
  scope: z.string().min(1, "Scope is required"),
  actor: z.string().min(1, "Actor is required"),
  revision: z.number().int().positive().default(1),
  owner: z.string().optional(),
  statusReason: z.string().optional(),
  modules: ModulesSchema.default({ foundation: [], features: [] }),
  tests: z.array(z.union([z.string(), TestRefSchema])).default([]),
  data: DataConfigSchema.optional(),
  completion: z.array(CompletionSignalSchema).optional(),
  links: LinksSchema.optional(),
  tags: z.array(z.string()).optional(),
  flags: z.object({
    required: z.array(z.string()).optional(),
    forbidden: z.array(z.string()).optional()
  }).optional(),
  prerequisites: z.array(z.string()).optional().describe("Array of Journey IDs that must run first"),
  negativePaths: z.array(NegativePathSchema).optional().describe("Error scenarios to test"),
  testData: z.array(TestDataSetSchema).optional().describe("Parameterized test data sets for data-driven testing"),
  visualRegression: VisualRegressionSchema.optional(),
  accessibility: AccessibilitySchema.optional(),
  performance: PerformanceSchema.optional()
});
JourneyFrontmatterSchema.extend({
  status: z.literal("clarified")
}).refine(
  (data) => {
    return data.completion && data.completion.length > 0;
  },
  {
    message: "Clarified journeys must have at least one completion signal",
    path: ["completion"]
  }
);
JourneyFrontmatterSchema.extend({
  status: z.literal("implemented")
}).refine(
  (data) => {
    return data.tests && data.tests.length > 0;
  },
  {
    message: "Implemented journeys must have at least one test reference",
    path: ["tests"]
  }
);
JourneyFrontmatterSchema.extend({
  status: z.literal("quarantined"),
  owner: z.string().min(1, "Quarantined journeys require an owner"),
  statusReason: z.string().min(1, "Quarantined journeys require a status reason")
}).refine(
  (data) => {
    return data.links?.issues && data.links.issues.length > 0;
  },
  {
    message: "Quarantined journeys must have at least one linked issue",
    path: ["links", "issues"]
  }
);
function validateForAutoGen(frontmatter) {
  const errors = [];
  if (frontmatter.status !== "clarified") {
    errors.push(
      `Journey status must be "clarified" for AutoGen, got "${frontmatter.status}"`
    );
  }
  if (!frontmatter.completion || frontmatter.completion.length === 0) {
    errors.push("Journey must have completion signals defined");
  }
  if (!frontmatter.actor) {
    errors.push("Journey must have an actor defined");
  }
  if (!frontmatter.scope) {
    errors.push("Journey must have a scope defined");
  }
  return {
    valid: errors.length === 0,
    errors
  };
}

// src/mapping/patterns.ts
var PATTERN_VERSION = "1.1.0";
function createLocatorFromMatch(strategy, value, name) {
  const locator = { strategy, value };
  if (name) {
    locator.options = { name };
  }
  return locator;
}
function createValueFromText(text) {
  if (/^\{\{.+\}\}$/.test(text)) {
    const path = text.slice(2, -2).trim();
    return { type: "actor", value: path };
  }
  if (/^\$.+/.test(text)) {
    return { type: "testData", value: text.slice(1) };
  }
  if (/\$\{.+\}/.test(text)) {
    return { type: "generated", value: text };
  }
  return { type: "literal", value: text };
}
var navigationPatterns = [
  {
    name: "navigate-to-url",
    regex: /^(?:user\s+)?(?:navigates?|go(?:es)?|opens?)\s+(?:to\s+)?(?:the\s+)?["']?([^"'\s]+)["']?$/i,
    primitiveType: "goto",
    extract: (match) => ({
      type: "goto",
      url: match[1],
      waitForLoad: true
    })
  },
  {
    name: "navigate-to-page",
    regex: /^(?:user\s+)?(?:navigates?|go(?:es)?|opens?)\s+(?:to\s+)?(?:the\s+)?(.+?)\s+page$/i,
    primitiveType: "goto",
    extract: (match) => ({
      type: "goto",
      url: `/${match[1].toLowerCase().replace(/\s+/g, "-")}`,
      waitForLoad: true
    })
  }
];
var clickPatterns = [
  {
    name: "click-button-quoted",
    regex: /^(?:user\s+)?(?:clicks?|presses?|taps?)\s+(?:on\s+)?(?:the\s+)?["']([^"']+)["']\s+button$/i,
    primitiveType: "click",
    extract: (match) => ({
      type: "click",
      locator: createLocatorFromMatch("role", "button", match[1])
    })
  },
  {
    name: "click-link-quoted",
    regex: /^(?:user\s+)?(?:clicks?|presses?|taps?)\s+(?:on\s+)?(?:the\s+)?["']([^"']+)["']\s+link$/i,
    primitiveType: "click",
    extract: (match) => ({
      type: "click",
      locator: createLocatorFromMatch("role", "link", match[1])
    })
  },
  {
    name: "click-element-quoted",
    regex: /^(?:user\s+)?(?:clicks?|presses?|taps?)\s+(?:on\s+)?(?:the\s+)?["']([^"']+)["']$/i,
    primitiveType: "click",
    extract: (match) => ({
      type: "click",
      locator: createLocatorFromMatch("text", match[1])
    })
  },
  {
    name: "click-element-generic",
    regex: /^(?:user\s+)?(?:clicks?|presses?|taps?)\s+(?:on\s+)?(?:the\s+)?(.+?)\s+(?:button|link|icon|menu|tab)$/i,
    primitiveType: "click",
    extract: (match) => ({
      type: "click",
      locator: createLocatorFromMatch("text", match[1])
    })
  }
];
var fillPatterns = [
  {
    name: "fill-field-quoted-value",
    regex: /^(?:user\s+)?(?:enters?|types?|fills?\s+in?|inputs?)\s+["']([^"']+)["']\s+(?:in|into)\s+(?:the\s+)?["']([^"']+)["']\s*(?:field|input)?$/i,
    primitiveType: "fill",
    extract: (match) => ({
      type: "fill",
      locator: createLocatorFromMatch("label", match[2]),
      value: createValueFromText(match[1])
    })
  },
  {
    name: "fill-field-actor-value",
    regex: /^(?:user\s+)?(?:enters?|types?|fills?\s+in?|inputs?)\s+(\{\{[^}]+\}\})\s+(?:in|into)\s+(?:the\s+)?["']([^"']+)["']\s*(?:field|input)?$/i,
    primitiveType: "fill",
    extract: (match) => ({
      type: "fill",
      locator: createLocatorFromMatch("label", match[2]),
      value: createValueFromText(match[1])
    })
  },
  {
    name: "fill-field-generic",
    regex: /^(?:user\s+)?(?:enters?|types?|fills?\s+in?|inputs?)\s+(.+?)\s+(?:in|into)\s+(?:the\s+)?(.+?)\s*(?:field|input)?$/i,
    primitiveType: "fill",
    extract: (match) => ({
      type: "fill",
      locator: createLocatorFromMatch("label", match[2].replace(/["']/g, "")),
      value: createValueFromText(match[1].replace(/["']/g, ""))
    })
  }
];
var selectPatterns = [
  {
    name: "select-option",
    regex: /^(?:user\s+)?(?:selects?|chooses?)\s+["']([^"']+)["']\s+(?:from|in)\s+(?:the\s+)?["']([^"']+)["']\s*(?:dropdown|select|menu)?$/i,
    primitiveType: "select",
    extract: (match) => ({
      type: "select",
      locator: createLocatorFromMatch("label", match[2]),
      option: match[1]
    })
  }
];
var checkPatterns = [
  {
    name: "check-checkbox",
    regex: /^(?:user\s+)?(?:checks?|enables?|ticks?)\s+(?:the\s+)?["']([^"']+)["']\s*(?:checkbox|option)?$/i,
    primitiveType: "check",
    extract: (match) => ({
      type: "check",
      locator: createLocatorFromMatch("label", match[1])
    })
  },
  {
    name: "uncheck-checkbox",
    regex: /^(?:user\s+)?(?:unchecks?|disables?|unticks?)\s+(?:the\s+)?["']([^"']+)["']\s*(?:checkbox|option)?$/i,
    primitiveType: "uncheck",
    extract: (match) => ({
      type: "uncheck",
      locator: createLocatorFromMatch("label", match[1])
    })
  }
];
var visibilityPatterns = [
  {
    name: "should-see-text",
    regex: /^(?:user\s+)?(?:should\s+)?(?:sees?|views?)\s+(?:the\s+)?["']([^"']+)["']$/i,
    primitiveType: "expectVisible",
    extract: (match) => ({
      type: "expectVisible",
      locator: createLocatorFromMatch("text", match[1])
    })
  },
  {
    name: "is-visible",
    regex: /^["']?([^"']+)["']?\s+(?:is\s+)?(?:visible|displayed|shown)$/i,
    primitiveType: "expectVisible",
    extract: (match) => ({
      type: "expectVisible",
      locator: createLocatorFromMatch("text", match[1])
    })
  },
  {
    name: "should-see-element",
    regex: /^(?:user\s+)?(?:should\s+)?(?:sees?|views?)\s+(?:the\s+)?(.+?)\s+(?:heading|button|link|form|page|element)$/i,
    primitiveType: "expectVisible",
    extract: (match) => ({
      type: "expectVisible",
      locator: createLocatorFromMatch("text", match[1])
    })
  },
  {
    name: "page-displayed",
    regex: /^(?:the\s+)?(.+?)\s+(?:page|screen|view)\s+(?:is\s+)?(?:displayed|shown|visible)$/i,
    primitiveType: "expectVisible",
    extract: (match) => ({
      type: "expectVisible",
      locator: createLocatorFromMatch("text", match[1])
    })
  }
];
var toastPatterns = [
  {
    name: "success-toast-message",
    regex: /^(?:a\s+)?success\s+toast\s+(?:with\s+)?["']([^"']+)["']\s*(?:message\s+)?(?:appears?|is\s+shown|displays?)$/i,
    primitiveType: "expectToast",
    extract: (match) => ({
      type: "expectToast",
      toastType: "success",
      message: match[1]
    })
  },
  {
    name: "error-toast-message",
    regex: /^(?:an?\s+)?error\s+toast\s+(?:with\s+)?["']([^"']+)["']\s*(?:message\s+)?(?:appears?|is\s+shown|displays?)$/i,
    primitiveType: "expectToast",
    extract: (match) => ({
      type: "expectToast",
      toastType: "error",
      message: match[1]
    })
  },
  {
    name: "toast-appears",
    regex: /^(?:a\s+)?(success|error|info|warning)\s+toast\s+(?:appears?|is\s+shown|displays?)$/i,
    primitiveType: "expectToast",
    extract: (match) => ({
      type: "expectToast",
      toastType: match[1].toLowerCase()
    })
  },
  {
    name: "toast-with-text",
    regex: /^(?:toast|notification)\s+(?:with\s+)?["']([^"']+)["']\s+(?:appears?|is\s+shown|displays?)$/i,
    primitiveType: "expectToast",
    extract: (match) => ({
      type: "expectToast",
      toastType: "info",
      message: match[1]
    })
  }
];
var urlPatterns = [
  {
    name: "url-contains",
    regex: /^(?:the\s+)?url\s+(?:should\s+)?(?:contains?|includes?)\s+["']?([^"'\s]+)["']?$/i,
    primitiveType: "expectURL",
    extract: (match) => ({
      type: "expectURL",
      pattern: match[1]
    })
  },
  {
    name: "url-is",
    regex: /^(?:the\s+)?url\s+(?:should\s+)?(?:is|equals?|be)\s+["']?([^"'\s]+)["']?$/i,
    primitiveType: "expectURL",
    extract: (match) => ({
      type: "expectURL",
      pattern: match[1]
    })
  },
  {
    name: "redirected-to",
    regex: /^(?:user\s+)?(?:is\s+)?redirected\s+to\s+["']?([^"'\s]+)["']?$/i,
    primitiveType: "expectURL",
    extract: (match) => ({
      type: "expectURL",
      pattern: match[1]
    })
  }
];
var authPatterns = [
  {
    name: "user-login",
    regex: /^(?:user\s+)?(?:logs?\s*in|login\s+is\s+performed|authenticates?)$/i,
    primitiveType: "callModule",
    extract: (_match) => ({
      type: "callModule",
      module: "auth",
      method: "login"
    })
  },
  {
    name: "user-logout",
    regex: /^(?:user\s+)?(?:logs?\s*out|logout\s+is\s+performed|signs?\s*out)$/i,
    primitiveType: "callModule",
    extract: (_match) => ({
      type: "callModule",
      module: "auth",
      method: "logout"
    })
  },
  {
    name: "login-as-role",
    regex: /^(?:user\s+)?logs?\s*in\s+as\s+(?:an?\s+)?(.+?)(?:\s+user)?$/i,
    primitiveType: "callModule",
    extract: (match) => ({
      type: "callModule",
      module: "auth",
      method: "loginAs",
      args: [match[1].toLowerCase()]
    })
  }
];
var waitPatterns = [
  {
    name: "wait-for-navigation",
    regex: /^(?:user\s+)?(?:waits?\s+)?(?:for\s+)?navigation\s+to\s+["']?([^"'\s]+)["']?$/i,
    primitiveType: "waitForURL",
    extract: (match) => ({
      type: "waitForURL",
      pattern: match[1]
    })
  },
  {
    name: "wait-for-page",
    regex: /^(?:user\s+)?(?:waits?\s+)?(?:for\s+)?(?:the\s+)?(.+?)\s+(?:page|screen)\s+to\s+load$/i,
    primitiveType: "waitForLoadingComplete",
    extract: (_match) => ({
      type: "waitForLoadingComplete"
    })
  }
];
function parseSelectorToLocator(selector) {
  let cleanSelector = selector.replace(/^the\s+/i, "").trim();
  if (/button$/i.test(cleanSelector)) {
    const buttonName = cleanSelector.replace(/\s*button$/i, "").trim();
    return { strategy: "role", value: "button", name: buttonName };
  }
  if (/link$/i.test(cleanSelector)) {
    const linkName = cleanSelector.replace(/\s*link$/i, "").trim();
    return { strategy: "role", value: "link", name: linkName };
  }
  if (/(?:input|field)$/i.test(cleanSelector)) {
    const labelName = cleanSelector.replace(/\s*(?:input|field)$/i, "").trim();
    return { strategy: "label", value: labelName };
  }
  return { strategy: "text", value: cleanSelector };
}
var structuredPatterns = [
  // Action patterns
  {
    name: "structured-action-click",
    regex: /^\*\*Action\*\*:\s*[Cc]lick\s+(?:the\s+)?['"]?(.+?)['"]?\s*(?:button|link)?$/i,
    primitiveType: "click",
    extract: (match) => {
      const target = match[1];
      const locatorInfo = parseSelectorToLocator(target + " button");
      return {
        type: "click",
        locator: locatorInfo.name ? createLocatorFromMatch(locatorInfo.strategy, locatorInfo.value, locatorInfo.name) : { strategy: locatorInfo.strategy, value: locatorInfo.value }
      };
    }
  },
  {
    name: "structured-action-fill",
    regex: /^\*\*Action\*\*:\s*[Ff]ill\s+(?:in\s+)?['"]?(.+?)['"]?\s+with\s+['"]?(.+?)['"]?$/i,
    primitiveType: "fill",
    extract: (match) => {
      const target = match[1];
      const value = match[2];
      const locatorInfo = parseSelectorToLocator(target);
      return {
        type: "fill",
        locator: locatorInfo.name ? createLocatorFromMatch(locatorInfo.strategy, locatorInfo.value, locatorInfo.name) : { strategy: locatorInfo.strategy, value: locatorInfo.value },
        value: createValueFromText(value)
      };
    }
  },
  {
    name: "structured-action-navigate",
    regex: /^\*\*Action\*\*:\s*[Nn]avigate\s+to\s+['"]?(.+?)['"]?$/i,
    primitiveType: "goto",
    extract: (match) => ({
      type: "goto",
      url: match[1],
      waitForLoad: true
    })
  },
  // Wait patterns
  {
    name: "structured-wait-for-visible",
    regex: /^\*\*Wait for\*\*:\s*(.+?)\s+(?:to\s+)?(?:be\s+)?(?:visible|appear|load)/i,
    primitiveType: "expectVisible",
    extract: (match) => {
      const target = match[1];
      const locatorInfo = parseSelectorToLocator(target);
      return {
        type: "expectVisible",
        locator: locatorInfo.name ? createLocatorFromMatch(locatorInfo.strategy, locatorInfo.value, locatorInfo.name) : { strategy: locatorInfo.strategy, value: locatorInfo.value }
      };
    }
  },
  // Assert patterns
  {
    name: "structured-assert-visible",
    regex: /^\*\*Assert\*\*:\s*(.+?)\s+(?:is\s+)?visible$/i,
    primitiveType: "expectVisible",
    extract: (match) => {
      const target = match[1];
      const locatorInfo = parseSelectorToLocator(target);
      return {
        type: "expectVisible",
        locator: locatorInfo.name ? createLocatorFromMatch(locatorInfo.strategy, locatorInfo.value, locatorInfo.name) : { strategy: locatorInfo.strategy, value: locatorInfo.value }
      };
    }
  },
  {
    name: "structured-assert-text",
    regex: /^\*\*Assert\*\*:\s*(.+?)\s+(?:contains|has text)\s+['"]?(.+?)['"]?$/i,
    primitiveType: "expectText",
    extract: (match) => {
      const target = match[1];
      const text = match[2];
      const locatorInfo = parseSelectorToLocator(target);
      return {
        type: "expectText",
        locator: locatorInfo.name ? createLocatorFromMatch(locatorInfo.strategy, locatorInfo.value, locatorInfo.name) : { strategy: locatorInfo.strategy, value: locatorInfo.value },
        text
      };
    }
  }
];
var extendedClickPatterns = [
  {
    name: "click-on-element",
    // "Click on Submit" or "Click on the Submit button"
    regex: /^(?:user\s+)?clicks?\s+on\s+(?:the\s+)?(.+?)(?:\s+button|\s+link)?$/i,
    primitiveType: "click",
    extract: (match) => ({
      type: "click",
      locator: createLocatorFromMatch("text", match[1].replace(/["']/g, ""))
    })
  },
  {
    name: "press-enter-key",
    // "Press Enter" or "Press the Enter key" or "Hit Enter"
    regex: /^(?:user\s+)?(?:press(?:es)?|hits?)\s+(?:the\s+)?(?:enter|return)(?:\s+key)?$/i,
    primitiveType: "press",
    extract: () => ({
      type: "press",
      key: "Enter"
    })
  },
  {
    name: "press-tab-key",
    // "Press Tab" or "Press the Tab key"
    regex: /^(?:user\s+)?(?:press(?:es)?|hits?)\s+(?:the\s+)?tab(?:\s+key)?$/i,
    primitiveType: "press",
    extract: () => ({
      type: "press",
      key: "Tab"
    })
  },
  {
    name: "press-escape-key",
    // "Press Escape" or "Press Esc"
    regex: /^(?:user\s+)?(?:press(?:es)?|hits?)\s+(?:the\s+)?(?:escape|esc)(?:\s+key)?$/i,
    primitiveType: "press",
    extract: () => ({
      type: "press",
      key: "Escape"
    })
  },
  {
    name: "double-click",
    // "Double click on" or "Double-click the"
    regex: /^(?:user\s+)?double[-\s]?clicks?\s+(?:on\s+)?(?:the\s+)?["']?(.+?)["']?$/i,
    primitiveType: "dblclick",
    extract: (match) => ({
      type: "dblclick",
      locator: createLocatorFromMatch("text", match[1].replace(/["']/g, ""))
    })
  },
  {
    name: "right-click",
    // "Right click on" or "Right-click the"
    regex: /^(?:user\s+)?right[-\s]?clicks?\s+(?:on\s+)?(?:the\s+)?["']?(.+?)["']?$/i,
    primitiveType: "rightClick",
    extract: (match) => ({
      type: "rightClick",
      locator: createLocatorFromMatch("text", match[1].replace(/["']/g, ""))
    })
  },
  {
    name: "submit-form",
    // "Submit the form" or "Submits form"
    regex: /^(?:user\s+)?submits?\s+(?:the\s+)?form$/i,
    primitiveType: "click",
    extract: () => ({
      type: "click",
      locator: createLocatorFromMatch("role", "button", "Submit")
    })
  }
];
var extendedFillPatterns = [
  {
    name: "type-into-field",
    // "Type 'password' into the Password field"
    regex: /^(?:user\s+)?types?\s+['"](.+?)['"]\s+into\s+(?:the\s+)?["']?(.+?)["']?\s*(?:field|input)?$/i,
    primitiveType: "fill",
    extract: (match) => ({
      type: "fill",
      locator: createLocatorFromMatch("label", match[2]),
      value: createValueFromText(match[1])
    })
  },
  {
    name: "fill-in-field-no-value",
    // "Fill in the email address" (without explicit value - uses actor data)
    regex: /^(?:user\s+)?fills?\s+in\s+(?:the\s+)?["']?(.+?)["']?\s*(?:field|input)?$/i,
    primitiveType: "fill",
    extract: (match) => {
      const fieldName = match[1].replace(/["']/g, "");
      return {
        type: "fill",
        locator: createLocatorFromMatch("label", fieldName),
        value: { type: "actor", value: fieldName.toLowerCase().replace(/\s+/g, "_") }
      };
    }
  },
  {
    name: "clear-field",
    // "Clear the email field" or "Clears the input"
    regex: /^(?:user\s+)?clears?\s+(?:the\s+)?["']?(.+?)["']?\s*(?:field|input)?$/i,
    primitiveType: "clear",
    extract: (match) => ({
      type: "clear",
      locator: createLocatorFromMatch("label", match[1].replace(/["']/g, ""))
    })
  },
  {
    name: "set-value",
    // "Set the value to 'test'" or "Sets field to 'value'"
    regex: /^(?:user\s+)?sets?\s+(?:the\s+)?(?:value\s+)?(?:of\s+)?["']?(.+?)["']?\s+to\s+['"](.+?)['"]$/i,
    primitiveType: "fill",
    extract: (match) => ({
      type: "fill",
      locator: createLocatorFromMatch("label", match[1]),
      value: createValueFromText(match[2])
    })
  }
];
var extendedAssertionPatterns = [
  {
    name: "verify-element-showing",
    // "Verify the dashboard is showing/displayed"
    regex: /^(?:verify|confirm|ensure)\s+(?:that\s+)?(?:the\s+)?["']?(.+?)["']?\s+(?:is\s+)?(?:showing|displayed|visible)$/i,
    primitiveType: "expectVisible",
    extract: (match) => ({
      type: "expectVisible",
      locator: createLocatorFromMatch("text", match[1])
    })
  },
  {
    name: "page-should-show",
    // "The page should show 'Welcome'" or "Page should display 'text'"
    regex: /^(?:the\s+)?page\s+should\s+(?:show|display|contain)\s+['"](.+?)['"]$/i,
    primitiveType: "expectText",
    extract: (match) => ({
      type: "expectText",
      locator: { strategy: "role", value: "main" },
      text: match[1]
    })
  },
  {
    name: "make-sure-assertion",
    // "Make sure the button is visible" or "Make sure user sees 'text'"
    regex: /^make\s+sure\s+(?:that\s+)?(?:the\s+)?(.+?)\s+(?:is\s+)?(?:visible|displayed|shown)$/i,
    primitiveType: "expectVisible",
    extract: (match) => ({
      type: "expectVisible",
      locator: createLocatorFromMatch("text", match[1])
    })
  },
  {
    name: "confirm-that-assertion",
    // "Confirm that the message appears" or "Confirm the error is shown"
    regex: /^confirm\s+(?:that\s+)?(?:the\s+)?["']?(.+?)["']?\s+(?:appears?|is\s+shown|displays?)$/i,
    primitiveType: "expectVisible",
    extract: (match) => ({
      type: "expectVisible",
      locator: createLocatorFromMatch("text", match[1])
    })
  },
  {
    name: "check-element-exists",
    // "Check that the element exists" or "Check the button is present"
    regex: /^check\s+(?:that\s+)?(?:the\s+)?["']?(.+?)["']?\s+(?:exists?|is\s+present)$/i,
    primitiveType: "expectVisible",
    extract: (match) => ({
      type: "expectVisible",
      locator: createLocatorFromMatch("text", match[1])
    })
  },
  {
    name: "element-should-not-be-visible",
    // "The error should not be visible" or "Error message is not displayed"
    regex: /^(?:the\s+)?["']?(.+?)["']?\s+(?:should\s+)?(?:not\s+be|is\s+not)\s+(?:visible|displayed|shown)$/i,
    primitiveType: "expectHidden",
    extract: (match) => ({
      type: "expectHidden",
      locator: createLocatorFromMatch("text", match[1])
    })
  },
  {
    name: "element-contains-text",
    // "The header contains 'Welcome'" or "Element should contain 'text'"
    regex: /^(?:the\s+)?["']?(.+?)["']?\s+(?:should\s+)?contains?\s+['"](.+?)['"]$/i,
    primitiveType: "expectText",
    extract: (match) => ({
      type: "expectText",
      locator: createLocatorFromMatch("text", match[1]),
      text: match[2]
    })
  }
];
var extendedWaitPatterns = [
  {
    name: "wait-for-element-visible",
    // "Wait for the loading spinner to disappear"
    regex: /^(?:user\s+)?waits?\s+(?:for\s+)?(?:the\s+)?["']?(.+?)["']?\s+to\s+(?:disappear|be\s+hidden)$/i,
    primitiveType: "waitForHidden",
    extract: (match) => ({
      type: "waitForHidden",
      locator: createLocatorFromMatch("text", match[1])
    })
  },
  {
    name: "wait-for-element-appear",
    // "Wait for the modal to appear" or "Wait for dialog to show"
    regex: /^(?:user\s+)?waits?\s+(?:for\s+)?(?:the\s+)?["']?(.+?)["']?\s+to\s+(?:appear|show|be\s+visible)$/i,
    primitiveType: "waitForVisible",
    extract: (match) => ({
      type: "waitForVisible",
      locator: createLocatorFromMatch("text", match[1])
    })
  },
  {
    name: "wait-until-loaded",
    // "Wait until the page is loaded" or "Wait until content loads"
    regex: /^(?:user\s+)?waits?\s+until\s+(?:the\s+)?(?:page|content|data)\s+(?:is\s+)?loaded$/i,
    primitiveType: "waitForLoadingComplete",
    extract: () => ({
      type: "waitForLoadingComplete"
    })
  },
  {
    name: "wait-seconds",
    // "Wait for 2 seconds" or "Wait 3 seconds"
    regex: /^(?:user\s+)?waits?\s+(?:for\s+)?(\d+)\s+seconds?$/i,
    primitiveType: "waitForTimeout",
    extract: (match) => ({
      type: "waitForTimeout",
      ms: parseInt(match[1], 10) * 1e3
    })
  },
  {
    name: "wait-for-network",
    // "Wait for network to be idle" or "Wait for network idle"
    regex: /^(?:user\s+)?waits?\s+(?:for\s+)?(?:the\s+)?network\s+(?:to\s+be\s+)?idle$/i,
    primitiveType: "waitForNetworkIdle",
    extract: () => ({
      type: "waitForNetworkIdle"
    })
  }
];
var extendedNavigationPatterns = [
  {
    name: "refresh-page",
    // "Refresh the page" or "Reload the page"
    regex: /^(?:user\s+)?(?:refresh(?:es)?|reloads?)\s+(?:the\s+)?page$/i,
    primitiveType: "reload",
    extract: () => ({
      type: "reload"
    })
  },
  {
    name: "go-back",
    // "Go back" or "Navigate back" or "User goes back"
    regex: /^(?:user\s+)?(?:go(?:es)?|navigates?)\s+back$/i,
    primitiveType: "goBack",
    extract: () => ({
      type: "goBack"
    })
  },
  {
    name: "go-forward",
    // "Go forward" or "Navigate forward"
    regex: /^(?:user\s+)?(?:go(?:es)?|navigates?)\s+forward$/i,
    primitiveType: "goForward",
    extract: () => ({
      type: "goForward"
    })
  }
];
var extendedSelectPatterns = [
  {
    name: "select-from-dropdown",
    // "Select 'Option' from dropdown" or "Choose 'Value' from the dropdown"
    regex: /^(?:user\s+)?(?:selects?|chooses?)\s+['"](.+?)['"]\s+from\s+(?:the\s+)?dropdown$/i,
    primitiveType: "select",
    extract: (match) => ({
      type: "select",
      locator: { strategy: "role", value: "combobox" },
      option: match[1]
    })
  },
  {
    name: "select-option-named",
    // "Select option 'Value'" or "Choose the 'Option' option"
    regex: /^(?:user\s+)?(?:selects?|chooses?)\s+(?:the\s+)?(?:option\s+)?['"](.+?)['"](?:\s+option)?$/i,
    primitiveType: "select",
    extract: (match) => ({
      type: "select",
      locator: { strategy: "role", value: "combobox" },
      option: match[1]
    })
  }
];
var hoverPatterns = [
  {
    name: "hover-over-element",
    // "Hover over the menu" or "User hovers on button"
    regex: /^(?:user\s+)?hovers?\s+(?:over|on)\s+(?:the\s+)?["']?(.+?)["']?$/i,
    primitiveType: "hover",
    extract: (match) => ({
      type: "hover",
      locator: createLocatorFromMatch("text", match[1].replace(/["']/g, ""))
    })
  },
  {
    name: "mouse-over",
    // "Mouse over the element" or "Mouseover the button"
    regex: /^(?:user\s+)?mouse\s*over\s+(?:the\s+)?["']?(.+?)["']?$/i,
    primitiveType: "hover",
    extract: (match) => ({
      type: "hover",
      locator: createLocatorFromMatch("text", match[1].replace(/["']/g, ""))
    })
  }
];
var focusPatterns = [
  {
    name: "focus-on-element",
    // "Focus on the input" or "User focuses the field"
    regex: /^(?:user\s+)?focus(?:es)?\s+(?:on\s+)?(?:the\s+)?["']?(.+?)["']?$/i,
    primitiveType: "focus",
    extract: (match) => ({
      type: "focus",
      locator: createLocatorFromMatch("label", match[1].replace(/["']/g, ""))
    })
  }
];
var allPatterns = [
  ...structuredPatterns,
  ...authPatterns,
  ...toastPatterns,
  // Extended patterns come BEFORE base patterns to match more specific cases first
  ...extendedNavigationPatterns,
  // Must be before navigationPatterns (e.g., "Go back" vs "Go to")
  ...navigationPatterns,
  ...extendedClickPatterns,
  // Must be before clickPatterns (e.g., "Click on" vs "Click")
  ...clickPatterns,
  ...extendedFillPatterns,
  ...fillPatterns,
  ...extendedSelectPatterns,
  ...selectPatterns,
  ...checkPatterns,
  ...extendedAssertionPatterns,
  // Must be before visibilityPatterns (e.g., "not be visible")
  ...visibilityPatterns,
  ...urlPatterns,
  ...extendedWaitPatterns,
  ...waitPatterns,
  ...hoverPatterns,
  ...focusPatterns
];
function matchPattern(text) {
  const trimmedText = text.trim();
  for (const pattern of allPatterns) {
    const match = trimmedText.match(pattern.regex);
    if (match) {
      const primitive = pattern.extract(match);
      if (primitive) {
        return primitive;
      }
    }
  }
  return null;
}
function getPatternMatches(text) {
  const trimmedText = text.trim();
  const matches = [];
  for (const pattern of allPatterns) {
    const match = trimmedText.match(pattern.regex);
    if (match) {
      const primitive = pattern.extract(match);
      if (primitive) {
        matches.push({ pattern: pattern.name, match: primitive });
      }
    }
  }
  return matches;
}
function getAllPatternNames() {
  return allPatterns.map((p) => p.name);
}
function getPatternCountByCategory() {
  const counts = {};
  for (const pattern of allPatterns) {
    const category = pattern.name.split("-")[0] || "other";
    counts[category] = (counts[category] || 0) + 1;
  }
  return counts;
}
function getPatternMetadata(patternName) {
  const pattern = allPatterns.find((p) => p.name === patternName);
  if (!pattern) return null;
  const isExtended = patternName.includes("extended") || patternName.startsWith("hover") || patternName.startsWith("focus") || patternName.startsWith("press-") || patternName.startsWith("double-") || patternName.startsWith("right-");
  return {
    name: pattern.name,
    version: isExtended ? "1.1.0" : "1.0.0",
    addedDate: isExtended ? "2026-01-27" : "2026-01-02",
    source: "core",
    category: pattern.name.split("-")[0] || "other"
  };
}
function findMatchingPatterns(text) {
  const trimmedText = text.trim();
  const matchingNames = [];
  for (const pattern of allPatterns) {
    if (pattern.regex.test(trimmedText)) {
      matchingNames.push(pattern.name);
    }
  }
  return matchingNames;
}

// src/utils/result.ts
function ok(value, warnings) {
  return warnings?.length ? { success: true, value, warnings } : { success: true, value };
}
function err(error) {
  return { success: false, error };
}
function isOk(result) {
  return result.success;
}
function isErr(result) {
  return !result.success;
}
function unwrap(result, errorMessage) {
  if (result.success) {
    return result.value;
  }
  const message = errorMessage ? `${errorMessage}: ${String(result.error)}` : String(result.error);
  throw new Error(message);
}
function unwrapOr(result, defaultValue) {
  return result.success ? result.value : defaultValue;
}
function map(result, fn) {
  if (result.success) {
    return ok(fn(result.value), result.warnings);
  }
  return result;
}
function mapErr(result, fn) {
  if (!result.success) {
    return err(fn(result.error));
  }
  return result;
}
function andThen(result, fn) {
  if (result.success) {
    const newResult = fn(result.value);
    if (newResult.success && result.warnings?.length) {
      return ok(newResult.value, [
        ...result.warnings,
        ...newResult.warnings || []
      ]);
    }
    return newResult;
  }
  return result;
}
function collect(results) {
  const values = [];
  const allWarnings = [];
  for (const result of results) {
    if (!result.success) {
      return result;
    }
    values.push(result.value);
    if (result.warnings) {
      allWarnings.push(...result.warnings);
    }
  }
  return allWarnings.length > 0 ? ok(values, allWarnings) : ok(values);
}
function partition(results) {
  const values = [];
  const errors = [];
  const warnings = [];
  for (const result of results) {
    if (result.success) {
      values.push(result.value);
      if (result.warnings) {
        warnings.push(...result.warnings);
      }
    } else {
      errors.push(result.error);
    }
  }
  return { values, errors, warnings };
}
function tryCatch(fn) {
  try {
    return ok(fn());
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}
async function tryCatchAsync(fn) {
  try {
    return ok(await fn());
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}
var CodedError = class _CodedError extends Error {
  code;
  details;
  constructor(code, message, details) {
    super(message);
    this.name = "CodedError";
    this.code = code;
    this.details = details;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, _CodedError);
    }
  }
  /**
   * Create a CodedError (convenience factory, same as constructor)
   */
  static create(code, message, details) {
    return new _CodedError(code, message, details);
  }
  /**
   * Convert to plain object (for serialization/logging)
   */
  toJSON() {
    return {
      code: this.code,
      message: this.message,
      ...this.details && { details: this.details },
      ...this.stack && { stack: this.stack }
    };
  }
  /**
   * Format error for display
   */
  toString() {
    const base = `[${this.code}] ${this.message}`;
    if (this.details) {
      return `${base} ${JSON.stringify(this.details)}`;
    }
    return base;
  }
};
function codedError(code, message, details) {
  return new CodedError(code, message, details);
}

// src/journey/parseJourney.ts
var JourneyParseError = class extends Error {
  filePath;
  cause;
  constructor(message, filePath, cause) {
    super(message);
    this.name = "JourneyParseError";
    this.filePath = filePath;
    this.cause = cause;
  }
};
var FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---/;
function extractFrontmatter(content) {
  const match = FRONTMATTER_REGEX.exec(content);
  if (!match) {
    throw new Error("No YAML frontmatter found (content should start with ---)");
  }
  return {
    frontmatter: match[1],
    body: content.slice(match[0].length).trim()
  };
}
function parseAcceptanceCriteria(body) {
  const criteria = [];
  const acSectionMatch = body.match(/##\s*Acceptance\s*Criteria\s*\n([\s\S]*?)(?=\n##\s[^#]|$)/i);
  if (!acSectionMatch) {
    return criteria;
  }
  const acSection = acSectionMatch[1];
  const acPattern = /^###?\s*(AC-\d+)[:\s]*(.*?)$/gim;
  const parts = [];
  let match;
  while ((match = acPattern.exec(acSection)) !== null) {
    parts.push({
      id: match[1].toUpperCase(),
      title: match[2].trim(),
      startIndex: match.index + match[0].length
    });
  }
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const contentStart = part.startIndex;
    const contentEnd = i + 1 < parts.length ? acSection.lastIndexOf("###", parts[i + 1].startIndex) : acSection.length;
    const content = acSection.slice(contentStart, contentEnd > contentStart ? contentEnd : acSection.length);
    const steps = [];
    const bulletPattern = /^[-*]\s+(.+)$/gm;
    let bulletMatch;
    while ((bulletMatch = bulletPattern.exec(content)) !== null) {
      steps.push(bulletMatch[1].trim());
    }
    const headerMatch = acSection.match(new RegExp(`###?\\s*${part.id}[:\\s]*${part.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i"));
    const rawContent = headerMatch ? headerMatch[0] + content.slice(0, content.indexOf("\n###") > 0 ? content.indexOf("\n###") : content.length) : content;
    criteria.push({
      id: part.id,
      title: part.title,
      steps,
      rawContent: rawContent.trim()
    });
  }
  return criteria;
}
function parseProceduralSteps(body) {
  const steps = [];
  const psMatch = body.match(
    /##\s*Procedural\s*Steps?\s*\n([\s\S]*?)(?=\n##\s[^#]|$)/i
  );
  if (!psMatch) {
    return steps;
  }
  const psSection = psMatch[1];
  const numberedPattern = /^\d+\.\s+(.+)$/gm;
  let match;
  let stepNumber = 1;
  while ((match = numberedPattern.exec(psSection)) !== null) {
    const text = match[1].trim();
    const acRef = text.match(/\(AC-(\d+)\)/i);
    steps.push({
      number: stepNumber++,
      text: text.replace(/\s*\(AC-\d+\)\s*/gi, "").trim(),
      linkedAC: acRef ? `AC-${acRef[1]}` : void 0
    });
  }
  if (steps.length === 0) {
    const bulletPattern = /^[-*]\s+(.+)$/gm;
    while ((match = bulletPattern.exec(psSection)) !== null) {
      const text = match[1].trim();
      const acRef = text.match(/\(AC-(\d+)\)/i);
      steps.push({
        number: stepNumber++,
        text: text.replace(/\s*\(AC-\d+\)\s*/gi, "").trim(),
        linkedAC: acRef ? `AC-${acRef[1]}` : void 0
      });
    }
  }
  return steps;
}
function parseDataNotes(body) {
  const notes = [];
  const dataMatch = body.match(
    /##\s*(Data|Environment|Data\/Environment)\s*(Notes?)?\s*\n([\s\S]*?)(?=\n##\s[^#]|$)/i
  );
  if (!dataMatch) {
    return notes;
  }
  const dataSection = dataMatch[3];
  const bulletPattern = /^[-*]\s+(.+)$/gm;
  let match;
  while ((match = bulletPattern.exec(dataSection)) !== null) {
    notes.push(match[1].trim());
  }
  return notes;
}
function parseStructuredSteps(content) {
  const steps = [];
  const sections = content.split(/(?=^###\s*Step\s+\d+:)/m);
  for (const section of sections) {
    const headerMatch = section.match(/^###\s*Step\s+(\d+):\s*(.+)$/m);
    if (!headerMatch) continue;
    const step = {
      stepNumber: parseInt(headerMatch[1], 10),
      stepName: headerMatch[2].trim(),
      actions: []
    };
    let bulletMatch;
    const sectionBulletRegex = /^-\s*\*\*(Action|Wait for|Assert)\*\*:\s*(.+)$/gm;
    while ((bulletMatch = sectionBulletRegex.exec(section)) !== null) {
      const [, type, text] = bulletMatch;
      const actionType = type.toLowerCase() === "action" ? "action" : type.toLowerCase() === "wait for" ? "wait" : "assert";
      const primitive = matchPattern(text.trim());
      if (primitive) {
        let action = "";
        let target = "";
        let value;
        switch (primitive.type) {
          case "goto":
            action = "navigate";
            target = primitive.url;
            break;
          case "click":
            action = "click";
            target = primitive.locator.value;
            break;
          case "fill":
            action = "fill";
            target = primitive.locator.value;
            value = primitive.value.value;
            break;
          case "select":
            action = "select";
            target = primitive.locator.value;
            value = primitive.option;
            break;
          case "check":
            action = "check";
            target = primitive.locator.value;
            break;
          case "uncheck":
            action = "uncheck";
            target = primitive.locator.value;
            break;
          case "expectVisible":
            action = "expectVisible";
            target = primitive.locator.value;
            break;
          case "expectToast":
            action = "expectToast";
            target = primitive.toastType || "info";
            value = primitive.message;
            break;
          case "expectURL":
            action = "expectURL";
            target = typeof primitive.pattern === "string" ? primitive.pattern : primitive.pattern.source;
            break;
          case "callModule":
            action = `${primitive.module}.${primitive.method}`;
            target = primitive.args?.join(", ") || "";
            break;
          case "waitForURL":
            action = "waitForURL";
            target = typeof primitive.pattern === "string" ? primitive.pattern : primitive.pattern.source;
            break;
          case "waitForLoadingComplete":
            action = "waitForLoadingComplete";
            target = "";
            break;
          default:
            action = text.trim();
            target = "";
        }
        step.actions.push({
          type: actionType,
          action,
          target,
          value
        });
      } else {
        step.actions.push({
          type: actionType,
          action: text.trim(),
          target: "",
          value: void 0
        });
      }
    }
    if (step.actions.length > 0) {
      steps.push(step);
    }
  }
  return steps;
}
function parseJourney(filePath) {
  const resolvedPath = resolve(filePath);
  if (!existsSync(resolvedPath)) {
    throw new JourneyParseError(
      `Journey file not found: ${resolvedPath}`,
      resolvedPath
    );
  }
  let content;
  try {
    content = readFileSync(resolvedPath, "utf-8");
  } catch (err2) {
    throw new JourneyParseError(
      `Failed to read journey file: ${resolvedPath}`,
      resolvedPath,
      err2
    );
  }
  let frontmatterStr;
  let body;
  try {
    const extracted = extractFrontmatter(content);
    frontmatterStr = extracted.frontmatter;
    body = extracted.body;
  } catch (err2) {
    throw new JourneyParseError(
      `Invalid frontmatter in journey file: ${resolvedPath}`,
      resolvedPath,
      err2
    );
  }
  let rawFrontmatter;
  try {
    rawFrontmatter = parse(frontmatterStr);
  } catch (err2) {
    throw new JourneyParseError(
      `Invalid YAML in journey frontmatter: ${resolvedPath}`,
      resolvedPath,
      err2
    );
  }
  const result = JourneyFrontmatterSchema.safeParse(rawFrontmatter);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new JourneyParseError(
      `Invalid journey frontmatter in ${resolvedPath}:
${issues}`,
      resolvedPath,
      result.error
    );
  }
  const acceptanceCriteria = parseAcceptanceCriteria(body);
  const proceduralSteps = parseProceduralSteps(body);
  const dataNotes = parseDataNotes(body);
  return {
    frontmatter: result.data,
    body,
    acceptanceCriteria,
    proceduralSteps,
    dataNotes,
    sourcePath: resolvedPath
  };
}
function parseJourneyForAutoGen(filePath) {
  const parsed = parseJourney(filePath);
  const validation = validateForAutoGen(parsed.frontmatter);
  if (!validation.valid) {
    throw new JourneyParseError(
      `Journey not ready for AutoGen:
${validation.errors.map((e) => `  - ${e}`).join("\n")}`,
      filePath
    );
  }
  return parsed;
}
function parseJourneyContent(content, virtualPath = "virtual.journey.md") {
  const { frontmatter: frontmatterStr, body } = extractFrontmatter(content);
  const rawFrontmatter = parse(frontmatterStr);
  const result = JourneyFrontmatterSchema.safeParse(rawFrontmatter);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new JourneyParseError(
      `Invalid journey frontmatter:
${issues}`,
      virtualPath,
      result.error
    );
  }
  const acceptanceCriteria = parseAcceptanceCriteria(body);
  const proceduralSteps = parseProceduralSteps(body);
  const dataNotes = parseDataNotes(body);
  return {
    frontmatter: result.data,
    body,
    acceptanceCriteria,
    proceduralSteps,
    dataNotes,
    sourcePath: virtualPath
  };
}
function tryParseJourneyContent(content, virtualPath = "virtual.journey.md") {
  const frontmatterMatch = FRONTMATTER_REGEX.exec(content);
  if (!frontmatterMatch) {
    return err(new CodedError(
      "FRONTMATTER_NOT_FOUND",
      "No YAML frontmatter found (content should start with ---)",
      { path: virtualPath }
    ));
  }
  const frontmatterStr = frontmatterMatch[1];
  const body = content.slice(frontmatterMatch[0].length).trim();
  let rawFrontmatter;
  try {
    rawFrontmatter = parse(frontmatterStr);
  } catch (yamlError) {
    return err(new CodedError(
      "YAML_PARSE_ERROR",
      "Invalid YAML in journey frontmatter",
      {
        path: virtualPath,
        cause: yamlError instanceof Error ? yamlError.message : String(yamlError)
      }
    ));
  }
  const zodResult = JourneyFrontmatterSchema.safeParse(rawFrontmatter);
  if (!zodResult.success) {
    const issues = zodResult.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return err(new CodedError(
      "FRONTMATTER_VALIDATION_ERROR",
      `Invalid journey frontmatter: ${issues}`,
      {
        path: virtualPath,
        issues: zodResult.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
          code: i.code
        }))
      }
    ));
  }
  const acceptanceCriteria = parseAcceptanceCriteria(body);
  const proceduralSteps = parseProceduralSteps(body);
  const dataNotes = parseDataNotes(body);
  return ok({
    frontmatter: zodResult.data,
    body,
    acceptanceCriteria,
    proceduralSteps,
    dataNotes,
    sourcePath: virtualPath
  });
}

// src/mapping/stepMapper.ts
init_glossary();

// src/journey/hintPatterns.ts
var HINT_BLOCK_PATTERN = /\(([a-z]+)=(?:"([^"]+)"|'([^']+)'|([^,)\s]+))\)/gi;
var HINTS_SECTION_PATTERN = /\((?:[a-z]+=(?:"[^"]+"|'[^']+'|[^,)\s]+)(?:,\s*)?)+\)/gi;
var HINT_PATTERNS = {
  role: /role=(?:"([^"]+)"|'([^']+)'|([a-z]+))/i,
  testid: /testid=(?:"([^"]+)"|'([^']+)'|([a-z0-9_-]+))/i,
  label: /label=(?:"([^"]+)"|'([^']+)')/i,
  text: /text=(?:"([^"]+)"|'([^']+)')/i,
  exact: /exact=(true|false)/i,
  level: /level=([1-6])/i,
  signal: /signal=(?:"([^"]+)"|'([^']+)'|([a-z0-9_-]+))/i,
  module: /module=(?:"([^"]+)"|'([^']+)'|([a-z0-9_.]+))/i,
  wait: /wait=(networkidle|domcontentloaded|load|commit)/i,
  timeout: /timeout=(\d+)/i
};
var VALID_ROLES = [
  "alert",
  "alertdialog",
  "application",
  "article",
  "banner",
  "button",
  "cell",
  "checkbox",
  "columnheader",
  "combobox",
  "complementary",
  "contentinfo",
  "definition",
  "dialog",
  "directory",
  "document",
  "feed",
  "figure",
  "form",
  "grid",
  "gridcell",
  "group",
  "heading",
  "img",
  "link",
  "list",
  "listbox",
  "listitem",
  "log",
  "main",
  "marquee",
  "math",
  "menu",
  "menubar",
  "menuitem",
  "menuitemcheckbox",
  "menuitemradio",
  "navigation",
  "none",
  "note",
  "option",
  "presentation",
  "progressbar",
  "radio",
  "radiogroup",
  "region",
  "row",
  "rowgroup",
  "rowheader",
  "scrollbar",
  "search",
  "searchbox",
  "separator",
  "slider",
  "spinbutton",
  "status",
  "switch",
  "tab",
  "table",
  "tablist",
  "tabpanel",
  "term",
  "textbox",
  "timer",
  "toolbar",
  "tooltip",
  "tree",
  "treegrid",
  "treeitem"
];
function isValidRole(role) {
  return VALID_ROLES.includes(role.toLowerCase());
}
function extractHintValue(match) {
  for (let i = 1; i < match.length; i++) {
    if (match[i] !== void 0) {
      return match[i] ?? null;
    }
  }
  return null;
}
function containsHints(text) {
  HINTS_SECTION_PATTERN.lastIndex = 0;
  return HINTS_SECTION_PATTERN.test(text);
}
function removeHints(text) {
  return text.replace(HINTS_SECTION_PATTERN, "").trim();
}

// src/journey/parseHints.ts
function parseHints(text) {
  const hints = [];
  const warnings = [];
  if (!containsHints(text)) {
    return {
      hints: [],
      cleanText: text,
      originalText: text,
      warnings: []
    };
  }
  HINT_BLOCK_PATTERN.lastIndex = 0;
  let match;
  while ((match = HINT_BLOCK_PATTERN.exec(text)) !== null) {
    const key = match[1].toLowerCase();
    const value = match[2] || match[3] || match[4];
    if (!value) {
      warnings.push(`Empty value for hint: ${key}`);
      continue;
    }
    if (!(key in HINT_PATTERNS)) {
      warnings.push(`Unknown hint type: ${key}`);
      continue;
    }
    if (key === "role" && !isValidRole(value)) {
      warnings.push(`Invalid ARIA role: ${value}`);
    }
    hints.push({
      type: key,
      value,
      raw: match[0]
    });
  }
  return {
    hints,
    cleanText: removeHints(text),
    originalText: text,
    warnings
  };
}
function extractHints(text) {
  const parsed = parseHints(text);
  const locator = {};
  const behavior = {};
  for (const hint of parsed.hints) {
    switch (hint.type) {
      case "role":
        locator.role = hint.value;
        break;
      case "testid":
        locator.testid = hint.value;
        break;
      case "label":
        locator.label = hint.value;
        break;
      case "text":
        locator.text = hint.value;
        break;
      case "exact":
        locator.exact = hint.value.toLowerCase() === "true";
        break;
      case "level":
        locator.level = parseInt(hint.value, 10);
        break;
      case "signal":
        behavior.signal = hint.value;
        break;
      case "module":
        behavior.module = hint.value;
        break;
      case "wait":
        behavior.wait = hint.value;
        break;
      case "timeout":
        behavior.timeout = parseInt(hint.value, 10);
        break;
    }
  }
  return {
    locator,
    behavior,
    hasHints: parsed.hints.length > 0,
    cleanText: parsed.cleanText,
    warnings: parsed.warnings
  };
}
function hasLocatorHints(hints) {
  const { locator } = hints;
  return !!(locator.role || locator.testid || locator.label || locator.text);
}
function hasBehaviorHints(hints) {
  const { behavior } = hints;
  return !!(behavior.signal || behavior.module || behavior.wait || behavior.timeout);
}
function generateLocatorFromHints(hints) {
  if (hints.testid) {
    return `page.getByTestId('${hints.testid}')`;
  }
  if (hints.role) {
    const options = [];
    if (hints.label) {
      options.push(`name: '${hints.label}'`);
    }
    if (hints.exact) {
      options.push("exact: true");
    }
    if (hints.level && hints.role === "heading") {
      options.push(`level: ${hints.level}`);
    }
    if (options.length > 0) {
      return `page.getByRole('${hints.role}', { ${options.join(", ")} })`;
    }
    return `page.getByRole('${hints.role}')`;
  }
  if (hints.label) {
    if (hints.exact) {
      return `page.getByLabel('${hints.label}', { exact: true })`;
    }
    return `page.getByLabel('${hints.label}')`;
  }
  if (hints.text) {
    if (hints.exact) {
      return `page.getByText('${hints.text}', { exact: true })`;
    }
    return `page.getByText('${hints.text}')`;
  }
  return null;
}
function parseModuleHint(moduleHint) {
  const parts = moduleHint.split(".");
  if (parts.length !== 2) {
    return null;
  }
  return {
    module: parts[0],
    method: parts[1]
  };
}
function validateHints(hints) {
  const errors = [];
  const locatorCount = [
    hints.locator.testid,
    hints.locator.role,
    hints.locator.label && !hints.locator.role,
    // label with role is fine
    hints.locator.text
  ].filter(Boolean).length;
  if (locatorCount > 1) {
    errors.push("Multiple conflicting locator hints specified");
  }
  if (hints.locator.level && hints.locator.role !== "heading") {
    errors.push("level hint only applies to role=heading");
  }
  if (hints.behavior.module) {
    const parsed = parseModuleHint(hints.behavior.module);
    if (!parsed) {
      errors.push("module hint must be in format: moduleName.methodName");
    }
  }
  return errors;
}
function mergeWithInferred(hints, inferred) {
  if (hints.testid) {
    return { strategy: "testid", value: hints.testid };
  }
  if (hints.role) {
    const options = {};
    if (hints.label) {
      options.name = hints.label;
    }
    if (hints.exact) {
      options.exact = true;
    }
    if (hints.level) {
      options.level = hints.level;
    }
    return { strategy: "role", value: hints.role, options };
  }
  if (hints.label) {
    const options = {};
    if (hints.exact) {
      options.exact = true;
    }
    return { strategy: "label", value: hints.label, options };
  }
  if (hints.text) {
    const options = {};
    if (hints.exact) {
      options.exact = true;
    }
    return { strategy: "text", value: hints.text, options };
  }
  if (hints.exact) {
    return { ...inferred, options: { exact: true } };
  }
  return inferred;
}

// src/mapping/stepMapper.ts
var llkbModule = null;
var llkbLoadAttempted = false;
async function loadLlkbModule() {
  if (llkbLoadAttempted) return llkbModule;
  llkbLoadAttempted = true;
  try {
    const mod = await Promise.resolve().then(() => (init_patternExtension(), patternExtension_exports));
    llkbModule = {
      matchLlkbPattern: mod.matchLlkbPattern,
      recordPatternSuccess: mod.recordPatternSuccess
    };
  } catch {
    llkbModule = null;
  }
  return llkbModule;
}
function tryLlkbMatch(text, options) {
  if (!llkbModule) {
    if (!llkbLoadAttempted) {
      void loadLlkbModule();
    }
    return null;
  }
  return llkbModule.matchLlkbPattern(text, options);
}
function isAssertion(primitive) {
  return primitive.type.startsWith("expect");
}
function mapStepText(text, options = {}) {
  const {
    normalizeText = true,
    useLlkb = true,
    llkbRoot,
    llkbMinConfidence = 0.7
  } = options;
  const hints = extractHints(text);
  const cleanText = hints.hasHints ? hints.cleanText : text;
  const processedText = normalizeText ? normalizeStepText(cleanText) : cleanText;
  let primitive = matchPattern(processedText);
  let matchSource = primitive ? "pattern" : "none";
  if (primitive && hints.hasHints) {
    primitive = applyHintsToPrimitive(primitive, hints);
  }
  let llkbPatternId;
  let llkbConfidence;
  if (!primitive && useLlkb) {
    const llkbMatch = tryLlkbMatch(processedText, {
      llkbRoot,
      minConfidence: llkbMinConfidence
    });
    if (llkbMatch) {
      primitive = llkbMatch.primitive;
      matchSource = "llkb";
      llkbPatternId = llkbMatch.patternId;
      llkbConfidence = llkbMatch.confidence;
      if (llkbModule && options.journeyId) {
        try {
          llkbModule.recordPatternSuccess(
            text,
            // Original text, not processed
            llkbMatch.primitive,
            options.journeyId,
            { llkbRoot }
          );
        } catch {
        }
      }
      if (hints.hasHints) {
        primitive = applyHintsToPrimitive(primitive, hints);
      }
    }
  }
  if (!primitive && hasLocatorHints(hints)) {
    primitive = createPrimitiveFromHints(processedText, hints);
    if (primitive) {
      matchSource = "hints";
    }
  }
  if (primitive) {
    return {
      primitive,
      sourceText: text,
      isAssertion: isAssertion(primitive),
      matchSource,
      llkbPatternId,
      llkbConfidence
    };
  }
  return {
    primitive: null,
    sourceText: text,
    isAssertion: false,
    message: `Could not map step: "${text}"`,
    matchSource: "none"
  };
}
function applyHintsToPrimitive(primitive, hints) {
  const enhanced = { ...primitive };
  if (hasLocatorHints(hints)) {
    const locatorSpec = buildLocatorFromHints(hints);
    if (locatorSpec && "locator" in enhanced) {
      enhanced.locator = locatorSpec;
    }
  }
  if (hasBehaviorHints(hints)) {
    if (hints.behavior.timeout !== void 0 && "timeout" in enhanced) {
      enhanced.timeout = hints.behavior.timeout;
    }
    if (hints.behavior.signal && "signal" in enhanced) {
      enhanced.signal = hints.behavior.signal;
    }
    if (hints.behavior.module) {
      const parsed = parseModuleHint(hints.behavior.module);
      if (parsed) {
        enhanced.module = parsed.module;
        enhanced.method = parsed.method;
      }
    }
  }
  return enhanced;
}
function buildLocatorFromHints(hints) {
  const { locator } = hints;
  if (locator.testid) {
    return { strategy: "testid", value: locator.testid };
  }
  if (locator.role) {
    const options = {};
    if (locator.label) options.name = locator.label;
    if (locator.exact) options.exact = true;
    if (locator.level) options.level = locator.level;
    return {
      strategy: "role",
      value: locator.role,
      options: Object.keys(options).length > 0 ? options : void 0
    };
  }
  if (locator.label) {
    return {
      strategy: "label",
      value: locator.label,
      options: locator.exact ? { exact: true } : void 0
    };
  }
  if (locator.text) {
    return {
      strategy: "text",
      value: locator.text,
      options: locator.exact ? { exact: true } : void 0
    };
  }
  return null;
}
function createPrimitiveFromHints(text, hints) {
  const locator = buildLocatorFromHints(hints);
  if (!locator) return null;
  const lowerText = text.toLowerCase();
  if (lowerText.includes("click") || lowerText.includes("press")) {
    return { type: "click", locator };
  }
  if (lowerText.includes("enter") || lowerText.includes("type") || lowerText.includes("fill")) {
    const valueMatch = text.match(/['"]([^'"]+)['"]/);
    return {
      type: "fill",
      locator,
      value: { type: "literal", value: valueMatch ? valueMatch[1] : "" }
    };
  }
  if (lowerText.includes("see") || lowerText.includes("visible") || lowerText.includes("display")) {
    return { type: "expectVisible", locator };
  }
  if (lowerText.includes("check") || lowerText.includes("select")) {
    return { type: "check", locator };
  }
  return { type: "click", locator };
}
function mapAcceptanceCriterion(ac, proceduralSteps, options = {}) {
  const { includeBlocked = true } = options;
  const actions = [];
  const assertions = [];
  const mappings = [];
  const notes = [];
  const linkedProcedural = proceduralSteps.filter((ps) => ps.linkedAC === ac.id);
  for (const stepText of ac.steps) {
    const result = mapStepText(stepText, options);
    mappings.push(result);
    if (result.primitive) {
      if (result.isAssertion) {
        assertions.push(result.primitive);
      } else {
        actions.push(result.primitive);
      }
    } else if (includeBlocked) {
      actions.push({
        type: "blocked",
        reason: result.message || "Could not map step",
        sourceText: stepText
      });
    }
  }
  for (const ps of linkedProcedural) {
    const result = mapStepText(ps.text, options);
    if (result.primitive && !ac.steps.includes(ps.text)) {
      if (result.isAssertion) {
        assertions.push(result.primitive);
      } else {
        actions.push(result.primitive);
      }
    }
  }
  if (assertions.length === 0 && ac.title) {
    notes.push(`TODO: Add assertion for: ${ac.title}`);
  }
  const step = {
    id: ac.id,
    description: ac.title || `Step ${ac.id}`,
    actions,
    assertions,
    sourceText: ac.rawContent,
    notes: notes.length > 0 ? notes : void 0
  };
  return {
    step,
    mappings,
    mappedCount: mappings.filter((m) => m.primitive !== null).length,
    blockedCount: mappings.filter((m) => m.primitive === null).length
  };
}
function mapProceduralStep(ps, options = {}) {
  const { includeBlocked = true } = options;
  const result = mapStepText(ps.text, options);
  const actions = [];
  const assertions = [];
  if (result.primitive) {
    if (result.isAssertion) {
      assertions.push(result.primitive);
    } else {
      actions.push(result.primitive);
    }
  } else if (includeBlocked) {
    actions.push({
      type: "blocked",
      reason: result.message || "Could not map procedural step",
      sourceText: ps.text
    });
  }
  const step = {
    id: `PS-${ps.number}`,
    description: ps.text,
    actions,
    assertions
  };
  return {
    step,
    mappings: [result],
    mappedCount: result.primitive ? 1 : 0,
    blockedCount: result.primitive ? 0 : 1
  };
}
function mapSteps(steps, options = {}) {
  return steps.map((step) => mapStepText(step, options));
}
function getMappingStats(mappings) {
  const mapped = mappings.filter((m) => m.primitive !== null);
  const blocked = mappings.filter((m) => m.primitive === null);
  const actions = mapped.filter((m) => !m.isAssertion);
  const assertions = mapped.filter((m) => m.isAssertion);
  const patternMatches = mappings.filter((m) => m.matchSource === "pattern").length;
  const llkbMatches = mappings.filter((m) => m.matchSource === "llkb").length;
  const hintMatches = mappings.filter((m) => m.matchSource === "hints").length;
  return {
    total: mappings.length,
    mapped: mapped.length,
    blocked: blocked.length,
    actions: actions.length,
    assertions: assertions.length,
    mappingRate: mappings.length > 0 ? mapped.length / mappings.length : 0,
    patternMatches,
    llkbMatches,
    hintMatches
  };
}
async function initializeLlkb() {
  const mod = await loadLlkbModule();
  return mod !== null;
}
function isLlkbAvailable() {
  return llkbModule !== null;
}
function suggestImprovements(blockedSteps) {
  const suggestions = [];
  for (const step of blockedSteps) {
    const text = step.sourceText.toLowerCase();
    if (text.includes("go") || text.includes("open") || text.includes("navigate")) {
      suggestions.push(
        `"${step.sourceText}" - Try: "User navigates to /path" or "User opens /path"`
      );
    } else if (text.includes("click") || text.includes("press") || text.includes("button")) {
      suggestions.push(
        `"${step.sourceText}" - Try: "User clicks 'Button Name' button" or "Click the 'Label' button"`
      );
    } else if (text.includes("enter") || text.includes("type") || text.includes("field")) {
      suggestions.push(
        `"${step.sourceText}" - Try: "User enters 'value' in 'Field Label' field"`
      );
    } else if (text.includes("see") || text.includes("visible") || text.includes("display")) {
      suggestions.push(
        `"${step.sourceText}" - Try: "User should see 'Text'" or "'Element' is visible"`
      );
    } else {
      suggestions.push(
        `"${step.sourceText}" - Could not determine intent. Check the patterns documentation.`
      );
    }
  }
  return suggestions;
}

// src/utils/escaping.ts
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\\/]/g, "\\$&");
}
function escapeString(str) {
  return str.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "\\r");
}
function escapeSelector(str) {
  return str.replace(/'/g, "\\'");
}

// src/journey/normalize.ts
function normalizeJourney(parsed, options = {}) {
  const { includeBlocked = true, strict = false } = options;
  const blockedSteps = [];
  const warnings = [];
  const steps = [];
  for (const ac of parsed.acceptanceCriteria) {
    const step = mapAcceptanceCriterionToStep(ac, parsed.proceduralSteps, warnings);
    const blockedPrimitives = [
      ...step.actions.filter((a) => a.type === "blocked"),
      ...step.assertions.filter((a) => a.type === "blocked")
    ];
    if (blockedPrimitives.length > 0) {
      for (const blocked of blockedPrimitives) {
        blockedSteps.push({
          stepId: step.id,
          sourceText: blocked.sourceText,
          reason: blocked.reason
        });
      }
      if (strict) {
        continue;
      }
    }
    if (includeBlocked || blockedPrimitives.length === 0) {
      steps.push(step);
    }
  }
  if (steps.length === 0 && parsed.proceduralSteps.length > 0) {
    for (const ps of parsed.proceduralSteps) {
      const step = mapProceduralStepToIRStep(ps, warnings);
      steps.push(step);
    }
  }
  const moduleDependencies = {
    foundation: parsed.frontmatter.modules?.foundation ?? [],
    feature: parsed.frontmatter.modules?.features ?? []
  };
  const completion = parsed.frontmatter.completion?.map((c) => ({
    type: c.type,
    value: c.value,
    options: c.options
  }));
  const data = parsed.frontmatter.data ? {
    strategy: parsed.frontmatter.data.strategy,
    cleanup: parsed.frontmatter.data.cleanup
  } : void 0;
  const journey = {
    id: parsed.frontmatter.id,
    title: parsed.frontmatter.title,
    tier: parsed.frontmatter.tier,
    scope: parsed.frontmatter.scope,
    actor: parsed.frontmatter.actor,
    tags: buildTags(parsed),
    moduleDependencies,
    data,
    completion,
    steps,
    revision: parsed.frontmatter.revision,
    prerequisites: parsed.frontmatter.prerequisites,
    negativePaths: parsed.frontmatter.negativePaths,
    sourcePath: parsed.sourcePath,
    // P3 Feature fields - pass through from frontmatter
    testData: parsed.frontmatter.testData,
    visualRegression: parsed.frontmatter.visualRegression,
    accessibility: parsed.frontmatter.accessibility,
    performance: parsed.frontmatter.performance
  };
  const stats = {
    totalSteps: parsed.acceptanceCriteria.length || parsed.proceduralSteps.length,
    mappedSteps: steps.length,
    blockedSteps: blockedSteps.length,
    totalActions: steps.reduce((sum, s) => sum + s.actions.length, 0),
    totalAssertions: steps.reduce((sum, s) => sum + s.assertions.length, 0)
  };
  return {
    journey,
    blockedSteps,
    warnings,
    stats
  };
}
function mapAcceptanceCriterionToStep(ac, proceduralSteps, warnings) {
  const actions = [];
  const assertions = [];
  const notes = [];
  const relatedProcedural = proceduralSteps.filter((ps) => ps.linkedAC === ac.id);
  for (const stepText of ac.steps) {
    const result = mapStepText(stepText, { normalizeText: false });
    if (result.primitive) {
      if (isAssertion2(result.primitive)) {
        assertions.push(result.primitive);
      } else {
        actions.push(result.primitive);
      }
    } else {
      actions.push({
        type: "blocked",
        reason: result.message || "Could not parse step into primitive",
        sourceText: stepText
      });
      if (result.message) {
        warnings.push(result.message);
      }
    }
  }
  for (const ps of relatedProcedural) {
    const result = mapStepText(ps.text, { normalizeText: false });
    if (result.primitive) {
      if (isAssertion2(result.primitive)) {
        assertions.push(result.primitive);
      } else {
        actions.push(result.primitive);
      }
    } else if (result.message) {
      warnings.push(result.message);
    }
  }
  if (assertions.length === 0 && ac.title) {
    notes.push(`TODO: Add assertion for: ${ac.title}`);
  }
  return {
    id: ac.id,
    description: ac.title || `Step ${ac.id}`,
    actions,
    assertions,
    sourceText: ac.rawContent,
    notes: notes.length > 0 ? notes : void 0
  };
}
function mapProceduralStepToIRStep(ps, warnings) {
  const actions = [];
  const assertions = [];
  const result = mapStepText(ps.text, { normalizeText: false });
  if (result.primitive) {
    if (isAssertion2(result.primitive)) {
      assertions.push(result.primitive);
    } else {
      actions.push(result.primitive);
    }
  } else {
    actions.push({
      type: "blocked",
      reason: result.message || "Could not parse procedural step",
      sourceText: ps.text
    });
    if (result.message) {
      warnings.push(result.message);
    }
  }
  return {
    id: `PS-${ps.number}`,
    description: ps.text,
    actions,
    assertions
  };
}
function isAssertion2(primitive) {
  return primitive.type.startsWith("expect");
}
function buildTags(parsed) {
  const tags = /* @__PURE__ */ new Set();
  tags.add("@artk");
  tags.add("@journey");
  tags.add(`@${parsed.frontmatter.id}`);
  tags.add(`@tier-${parsed.frontmatter.tier}`);
  tags.add(`@scope-${parsed.frontmatter.scope}`);
  tags.add(`@actor-${parsed.frontmatter.actor}`);
  if (parsed.frontmatter.tags) {
    for (const tag of parsed.frontmatter.tags) {
      tags.add(tag.startsWith("@") ? tag : `@${tag}`);
    }
  }
  return Array.from(tags);
}
function completionSignalsToAssertions(signals) {
  return signals.map((signal) => {
    switch (signal.type) {
      case "url":
        return {
          type: "expectURL",
          pattern: signal.options?.exact ? signal.value : new RegExp(escapeRegex(signal.value))
        };
      case "toast": {
        const lowerValue = signal.value.toLowerCase();
        let toastType = "success";
        if (lowerValue.includes("error")) {
          toastType = "error";
        } else if (lowerValue.includes("warning")) {
          toastType = "warning";
        } else if (lowerValue.includes("info")) {
          toastType = "info";
        }
        return {
          type: "expectToast",
          toastType,
          message: signal.value
        };
      }
      case "element": {
        const state = signal.options?.state || "visible";
        return {
          type: state === "hidden" || state === "detached" ? "expectNotVisible" : "expectVisible",
          locator: parseLocatorFromSelector(signal.value),
          timeout: signal.options?.timeout
        };
      }
      case "text":
        return {
          type: "expectVisible",
          locator: { strategy: "text", value: signal.value },
          timeout: signal.options?.timeout
        };
      case "title":
        return {
          type: "expectTitle",
          title: signal.options?.exact ? signal.value : new RegExp(escapeRegex(signal.value))
        };
      case "api":
        return {
          type: "waitForResponse",
          urlPattern: signal.value
        };
      default:
        throw new Error(`Unknown completion signal type: ${signal.type}`);
    }
  });
}
function parseLocatorFromSelector(selector) {
  if (selector.includes("data-testid")) {
    const match = selector.match(/\[data-testid=['"]([^'"]+)['"]\]/);
    if (match) {
      return { strategy: "testid", value: match[1] };
    }
  }
  if (selector.startsWith("role=")) {
    return { strategy: "role", value: selector.slice(5) };
  }
  if (selector.startsWith("text=")) {
    return { strategy: "text", value: selector.slice(5) };
  }
  if (selector.startsWith("label=")) {
    return { strategy: "label", value: selector.slice(6) };
  }
  if (selector.startsWith("placeholder=")) {
    return { strategy: "placeholder", value: selector.slice(12) };
  }
  return { strategy: "css", value: selector };
}
function validateJourneyForCodeGen(result) {
  const errors = [];
  if (result.journey.steps.length === 0) {
    errors.push("Journey has no steps");
  }
  if (!result.journey.completion || result.journey.completion.length === 0) {
    errors.push("Journey has no completion signals");
  }
  if (result.stats.blockedSteps > result.stats.mappedSteps) {
    errors.push(`Too many blocked steps: ${result.stats.blockedSteps} blocked vs ${result.stats.mappedSteps} mapped`);
  }
  if (result.stats.totalAssertions === 0) {
    errors.push("Journey has no assertions");
  }
  return {
    valid: errors.length === 0,
    errors
  };
}

// src/index.ts
init_glossary();

// src/selectors/priority.ts
var DEFAULT_SELECTOR_PRIORITY = [
  "role",
  "label",
  "placeholder",
  "text",
  "testid",
  "css"
];
var ELEMENT_TYPE_STRATEGIES = {
  button: ["role", "text", "testid"],
  link: ["role", "text", "testid"],
  textbox: ["role", "label", "placeholder", "testid"],
  checkbox: ["role", "label", "testid"],
  radio: ["role", "label", "testid"],
  combobox: ["role", "label", "testid"],
  heading: ["role", "text", "testid"],
  listitem: ["role", "text", "testid"],
  menuitem: ["role", "text", "testid"],
  tab: ["role", "text", "testid"],
  dialog: ["role", "testid"],
  alert: ["role", "testid"],
  generic: ["text", "testid", "css"]
};
var NAMEABLE_ROLES = [
  "button",
  "link",
  "textbox",
  "checkbox",
  "radio",
  "combobox",
  "heading",
  "tab",
  "menuitem",
  "listitem",
  "option",
  "cell",
  "row",
  "columnheader",
  "rowheader"
];
function getSelectorPriority(config) {
  if (config?.selectorPolicy?.priority) {
    return config.selectorPolicy.priority.map((s) => {
      return s;
    });
  }
  return DEFAULT_SELECTOR_PRIORITY;
}
function isForbiddenSelector(locator, config) {
  const forbiddenPatterns = config?.selectorPolicy?.forbiddenPatterns ?? [];
  for (const pattern of forbiddenPatterns) {
    const regex = new RegExp(pattern);
    if (regex.test(locator.value)) {
      return true;
    }
  }
  return false;
}
function scoreLocator(locator, priority = DEFAULT_SELECTOR_PRIORITY) {
  const index = priority.indexOf(locator.strategy);
  return index >= 0 ? index : priority.length;
}
function compareLocators(a, b, priority = DEFAULT_SELECTOR_PRIORITY) {
  const scoreA = scoreLocator(a, priority);
  const scoreB = scoreLocator(b, priority);
  return scoreA <= scoreB ? a : b;
}
function selectBestLocator(alternatives, config) {
  if (alternatives.length === 0) {
    return null;
  }
  const priority = getSelectorPriority(config);
  const allowed = alternatives.filter((loc) => !isForbiddenSelector(loc, config));
  if (allowed.length === 0) {
    return alternatives[0] ?? null;
  }
  allowed.sort((a, b) => scoreLocator(a, priority) - scoreLocator(b, priority));
  return allowed[0] ?? null;
}
function isRoleLocator(locator) {
  return locator.strategy === "role";
}
function isSemanticLocator(locator) {
  return ["role", "label", "text", "placeholder"].includes(locator.strategy);
}
function isTestIdLocator(locator) {
  return locator.strategy === "testid";
}
function isCssLocator(locator) {
  return locator.strategy === "css";
}
function getRecommendedStrategies(elementType) {
  return ELEMENT_TYPE_STRATEGIES[elementType] ?? ELEMENT_TYPE_STRATEGIES.generic;
}
function validateLocator(locator, config) {
  const warnings = [];
  if (isForbiddenSelector(locator, config)) {
    warnings.push(`Selector matches forbidden pattern: ${locator.value}`);
  }
  if (isCssLocator(locator)) {
    warnings.push(
      `CSS selector "${locator.value}" is fragile. Consider using role, label, or testid.`
    );
  }
  if (locator.value.includes("//") || locator.value.includes("..")) {
    warnings.push(`Selector "${locator.value}" appears to use XPath syntax in CSS.`);
  }
  if (locator.value.includes("nth-child") || locator.value.includes("nth-of-type")) {
    warnings.push(`Selector "${locator.value}" uses nth-child which is position-dependent.`);
  }
  if (locator.strategy === "css" && /^#[a-z]+-\d+$/i.test(locator.value)) {
    warnings.push(`Selector "${locator.value}" appears to have a dynamic ID.`);
  }
  return {
    valid: warnings.length === 0,
    warnings
  };
}
function toPlaywrightLocator(locator) {
  switch (locator.strategy) {
    case "role": {
      const opts = [];
      if (locator.options?.name) {
        opts.push(`name: '${escapeString2(locator.options.name)}'`);
      }
      if (locator.options?.exact) {
        opts.push("exact: true");
      }
      if (locator.options?.level) {
        opts.push(`level: ${locator.options.level}`);
      }
      const optsStr = opts.length > 0 ? `, { ${opts.join(", ")} }` : "";
      return `getByRole('${locator.value}'${optsStr})`;
    }
    case "label": {
      const exact = locator.options?.exact ? ", { exact: true }" : "";
      return `getByLabel('${escapeString2(locator.value)}'${exact})`;
    }
    case "placeholder": {
      const exact = locator.options?.exact ? ", { exact: true }" : "";
      return `getByPlaceholder('${escapeString2(locator.value)}'${exact})`;
    }
    case "text": {
      const exact = locator.options?.exact ? ", { exact: true }" : "";
      return `getByText('${escapeString2(locator.value)}'${exact})`;
    }
    case "testid":
      return `getByTestId('${escapeString2(locator.value)}')`;
    case "css":
      return `locator('${escapeString2(locator.value)}')`;
    default:
      return `locator('${escapeString2(locator.value)}')`;
  }
}
function escapeString2(str) {
  return str.replace(/'/g, "\\'").replace(/\n/g, "\\n");
}
var SelectorEntrySchema = z.object({
  /** Unique identifier for this selector */
  id: z.string(),
  /** Human-readable description */
  description: z.string().optional(),
  /** The selector strategy */
  strategy: z.enum(["testid", "role", "label", "text", "css", "xpath"]),
  /** The selector value */
  value: z.string(),
  /** Additional options for the locator */
  options: z.object({
    name: z.string().optional(),
    exact: z.boolean().optional(),
    level: z.number().optional()
  }).optional(),
  /** Component or page this selector belongs to */
  component: z.string().optional(),
  /** File where this selector was discovered */
  sourceFile: z.string().optional(),
  /** Line number in source file */
  sourceLine: z.number().optional(),
  /** Tags for categorization */
  tags: z.array(z.string()).optional(),
  /** Whether this is a stable selector (not likely to change) */
  stable: z.boolean().default(true),
  /** Last verified timestamp */
  lastVerified: z.string().optional()
});
var ComponentEntrySchema = z.object({
  /** Component name */
  name: z.string(),
  /** Component file path */
  path: z.string().optional(),
  /** Selectors within this component */
  selectors: z.array(z.string()),
  // References to selector IDs
  /** Child components */
  children: z.array(z.string()).optional()
});
var PageEntrySchema = z.object({
  /** Page name */
  name: z.string(),
  /** Route pattern */
  route: z.string().optional(),
  /** Page file path */
  path: z.string().optional(),
  /** Components on this page */
  components: z.array(z.string()).optional(),
  /** Direct selectors on this page */
  selectors: z.array(z.string()).optional()
});
var CSSDebtEntrySchema = z.object({
  /** The CSS selector being used */
  selector: z.string(),
  /** Files using this selector */
  usages: z.array(
    z.object({
      file: z.string(),
      line: z.number()
    })
  ),
  /** Suggested replacement */
  suggestedReplacement: z.object({
    strategy: z.string(),
    value: z.string()
  }).optional(),
  /** Priority for migration (higher = more urgent) */
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  /** Reason this is considered debt */
  reason: z.string().optional()
});
var SelectorCatalogSchema = z.object({
  /** Schema version */
  version: z.string().default("1.0.0"),
  /** Generation timestamp */
  generatedAt: z.string(),
  /** Source directory that was scanned */
  sourceDir: z.string().optional(),
  /** All selectors indexed by ID */
  selectors: z.record(SelectorEntrySchema),
  /** Components indexed by name */
  components: z.record(ComponentEntrySchema).default({}),
  /** Pages indexed by name */
  pages: z.record(PageEntrySchema).default({}),
  /** TestIDs found in the codebase */
  testIds: z.array(z.string()).default([]),
  /** CSS debt entries */
  cssDebt: z.array(CSSDebtEntrySchema).default([]),
  /** Statistics */
  stats: z.object({
    totalSelectors: z.number(),
    byStrategy: z.record(z.number()),
    stableCount: z.number(),
    unstableCount: z.number(),
    cssDebtCount: z.number()
  }).optional()
});
function createEmptyCatalog() {
  return {
    version: "1.0.0",
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    selectors: {},
    components: {},
    pages: {},
    testIds: [],
    cssDebt: []
  };
}
function validateCatalog(catalog) {
  const result = SelectorCatalogSchema.safeParse(catalog);
  if (result.success) {
    return { valid: true, errors: [], catalog: result.data };
  }
  return {
    valid: false,
    errors: result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`)
  };
}

// src/selectors/catalog.ts
var DEFAULT_CATALOG_PATH = "config/selector-catalog.json";
var catalogCache = null;
var catalogPath = null;
function loadCatalog(path) {
  const resolvedPath = resolve(path ?? DEFAULT_CATALOG_PATH);
  if (!existsSync(resolvedPath)) {
    console.warn(`Selector catalog not found at ${resolvedPath}, using empty catalog`);
    return createEmptyCatalog();
  }
  try {
    const content = readFileSync(resolvedPath, "utf-8");
    const parsed = JSON.parse(content);
    const result = validateCatalog(parsed);
    if (!result.valid) {
      console.warn(`Invalid selector catalog at ${resolvedPath}: ${result.errors.join(", ")}`);
      return createEmptyCatalog();
    }
    catalogCache = result.catalog;
    catalogPath = resolvedPath;
    return catalogCache;
  } catch (_err) {
    console.warn(`Failed to load selector catalog from ${resolvedPath}`);
    return createEmptyCatalog();
  }
}
function saveCatalog(catalog, path) {
  const resolvedPath = resolve(path ?? catalogPath ?? DEFAULT_CATALOG_PATH);
  const dir = dirname(resolvedPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  catalog.generatedAt = (/* @__PURE__ */ new Date()).toISOString();
  catalog.stats = calculateStats(catalog);
  writeFileSync(resolvedPath, JSON.stringify(catalog, null, 2));
  catalogCache = catalog;
  catalogPath = resolvedPath;
}
function calculateStats(catalog) {
  const selectors = Object.values(catalog.selectors);
  const byStrategy = {};
  let stableCount = 0;
  let unstableCount = 0;
  for (const selector of selectors) {
    byStrategy[selector.strategy] = (byStrategy[selector.strategy] ?? 0) + 1;
    if (selector.stable) {
      stableCount++;
    } else {
      unstableCount++;
    }
  }
  return {
    totalSelectors: selectors.length,
    byStrategy,
    stableCount,
    unstableCount,
    cssDebtCount: catalog.cssDebt?.length ?? 0
  };
}
function getCatalog() {
  if (!catalogCache) {
    catalogCache = loadCatalog();
  }
  return catalogCache;
}
function resetCatalogCache() {
  catalogCache = null;
  catalogPath = null;
}
function findSelectorById(id) {
  const catalog = getCatalog();
  return catalog.selectors[id] ?? null;
}
function findByTestId(testId) {
  const catalog = getCatalog();
  for (const selector of Object.values(catalog.selectors)) {
    if (selector.strategy === "testid" && selector.value === testId) {
      return selector;
    }
  }
  return null;
}
function findByComponent(componentName) {
  const catalog = getCatalog();
  const component = catalog.components[componentName];
  if (!component) {
    return [];
  }
  return component.selectors.map((id) => catalog.selectors[id]).filter((s) => s !== void 0);
}
function findByPage(pageName) {
  const catalog = getCatalog();
  const page = catalog.pages[pageName];
  if (!page) {
    return [];
  }
  const selectorIds = /* @__PURE__ */ new Set();
  for (const id of page.selectors ?? []) {
    selectorIds.add(id);
  }
  for (const componentName of page.components ?? []) {
    const component = catalog.components[componentName];
    if (component) {
      for (const id of component.selectors) {
        selectorIds.add(id);
      }
    }
  }
  return Array.from(selectorIds).map((id) => catalog.selectors[id]).filter((s) => s !== void 0);
}
function searchSelectors(query) {
  const catalog = getCatalog();
  const lowerQuery = query.toLowerCase();
  return Object.values(catalog.selectors).filter((selector) => {
    if (selector.value.toLowerCase().includes(lowerQuery)) return true;
    if (selector.description?.toLowerCase().includes(lowerQuery)) return true;
    if (selector.component?.toLowerCase().includes(lowerQuery)) return true;
    if (selector.tags?.some((t) => t.toLowerCase().includes(lowerQuery))) return true;
    return false;
  });
}
function getAllTestIds() {
  const catalog = getCatalog();
  return catalog.testIds;
}
function hasTestId(testId) {
  const catalog = getCatalog();
  return catalog.testIds.includes(testId);
}
function addSelector(selector) {
  const catalog = getCatalog();
  catalog.selectors[selector.id] = selector;
  if (selector.strategy === "testid" && !catalog.testIds.includes(selector.value)) {
    catalog.testIds.push(selector.value);
  }
}
function removeSelector(id) {
  const catalog = getCatalog();
  if (catalog.selectors[id]) {
    delete catalog.selectors[id];
    return true;
  }
  return false;
}
function getCSSDebt() {
  return getCatalog().cssDebt ?? [];
}
function suggestSelector(description) {
  const results = searchSelectors(description);
  if (results.length === 0) {
    return null;
  }
  const strategyPriority = {
    testid: 1,
    role: 2,
    label: 3,
    text: 4,
    css: 5,
    xpath: 6
  };
  return results.sort((a, b) => {
    if (a.stable && !b.stable) return -1;
    if (!a.stable && b.stable) return 1;
    return (strategyPriority[a.strategy] ?? 99) - (strategyPriority[b.strategy] ?? 99);
  })[0] ?? null;
}

// src/selectors/infer.ts
var ELEMENT_KEYWORDS = {
  button: "button",
  btn: "button",
  submit: "button",
  link: "link",
  anchor: "link",
  input: "textbox",
  textbox: "textbox",
  field: "textbox",
  textarea: "textbox",
  checkbox: "checkbox",
  check: "checkbox",
  radio: "radio",
  dropdown: "combobox",
  select: "combobox",
  combo: "combobox",
  heading: "heading",
  title: "heading",
  header: "heading",
  menu: "menu",
  menuitem: "menuitem",
  tab: "tab",
  dialog: "dialog",
  modal: "dialog",
  alert: "alert",
  list: "list",
  listitem: "listitem",
  table: "table",
  row: "row",
  cell: "cell"
};
function inferElementType(text) {
  const lowerText = text.toLowerCase();
  for (const [keyword, elementType] of Object.entries(ELEMENT_KEYWORDS)) {
    if (lowerText.includes(keyword)) {
      return elementType;
    }
  }
  return null;
}
function inferRole(elementType) {
  const roleMap = {
    button: "button",
    link: "link",
    textbox: "textbox",
    checkbox: "checkbox",
    radio: "radio",
    combobox: "combobox",
    heading: "heading",
    menu: "menu",
    menuitem: "menuitem",
    tab: "tab",
    dialog: "dialog",
    alert: "alert",
    list: "list",
    listitem: "listitem",
    table: "table",
    row: "row",
    cell: "cell"
  };
  return roleMap[elementType] ?? null;
}
function extractName(text) {
  const quotedMatch = text.match(/['"]([^'"]+)['"]/);
  if (quotedMatch) {
    return quotedMatch[1] ?? null;
  }
  const theMatch = text.match(/(?:the\s+)?['"]?([^'"]+?)['"]?\s+(?:button|link|field|input|checkbox|dropdown)/i);
  if (theMatch) {
    return theMatch[1].trim();
  }
  return null;
}
function inferSelectors(text) {
  const alternatives = [];
  const elementType = inferElementType(text);
  const name = extractName(text);
  const role = elementType ? inferRole(elementType) : null;
  if (role && NAMEABLE_ROLES.includes(role)) {
    if (name) {
      alternatives.push({
        strategy: "role",
        value: role,
        options: { name }
      });
    } else {
      alternatives.push({
        strategy: "role",
        value: role
      });
    }
  }
  if (name && ["textbox", "checkbox", "radio", "combobox"].includes(elementType || "")) {
    alternatives.push({
      strategy: "label",
      value: name
    });
  }
  if (name) {
    alternatives.push({
      strategy: "text",
      value: name
    });
  }
  return alternatives;
}
function inferBestSelector(text) {
  const alternatives = inferSelectors(text);
  return selectBestLocator(alternatives);
}
function inferButtonSelector(name) {
  return {
    strategy: "role",
    value: "button",
    options: { name }
  };
}
function inferLinkSelector(name) {
  return {
    strategy: "role",
    value: "link",
    options: { name }
  };
}
function inferInputSelector(labelOrPlaceholder) {
  return {
    strategy: "label",
    value: labelOrPlaceholder
  };
}
function inferCheckboxSelector(label) {
  return {
    strategy: "role",
    value: "checkbox",
    options: { name: label }
  };
}
function inferHeadingSelector(text, level) {
  const locator = {
    strategy: "role",
    value: "heading",
    options: { name: text }
  };
  if (level) {
    locator.options.level = level;
  }
  return locator;
}
function inferTabSelector(name) {
  return {
    strategy: "role",
    value: "tab",
    options: { name }
  };
}
function inferTextSelector(text) {
  return {
    strategy: "text",
    value: text
  };
}
function inferTestIdSelector(testId) {
  return {
    strategy: "testid",
    value: testId
  };
}
function createCssSelector(selector) {
  return {
    strategy: "css",
    value: selector
  };
}
function suggestSelectorApproach(text) {
  const elementType = inferElementType(text);
  const role = elementType ? inferRole(elementType) : null;
  const name = extractName(text);
  const alternatives = inferSelectors(text);
  let recommendedStrategy = "text";
  if (role && NAMEABLE_ROLES.includes(role)) {
    recommendedStrategy = "role";
  } else if (name && ["textbox", "checkbox", "radio", "combobox"].includes(elementType || "")) {
    recommendedStrategy = "label";
  } else if (name) {
    recommendedStrategy = "text";
  }
  return {
    elementType,
    role,
    name,
    recommendedStrategy,
    alternatives
  };
}
function inferSelectorWithCatalog(text, options) {
  const useCatalog = options?.useCatalog ?? true;
  if (useCatalog) {
    const catalogEntry = suggestSelector(text);
    if (catalogEntry) {
      return {
        strategy: catalogEntry.strategy,
        value: catalogEntry.value,
        options: catalogEntry.options
      };
    }
    const name = extractName(text);
    if (name) {
      const possibleTestIds = [
        name.toLowerCase().replace(/\s+/g, "-"),
        name.toLowerCase().replace(/\s+/g, "_"),
        name
      ];
      for (const testId of possibleTestIds) {
        if (hasTestId(testId)) {
          return {
            strategy: "testid",
            value: testId
          };
        }
      }
    }
  }
  return inferBestSelector(text);
}
function inferSelectorsWithCatalog(text, options) {
  const useCatalog = options?.useCatalog ?? true;
  const alternatives = [];
  if (useCatalog) {
    const catalogEntry = suggestSelector(text);
    if (catalogEntry) {
      alternatives.push({
        strategy: catalogEntry.strategy,
        value: catalogEntry.value,
        options: catalogEntry.options
      });
    }
  }
  alternatives.push(...inferSelectors(text));
  const seen = /* @__PURE__ */ new Set();
  return alternatives.filter((loc) => {
    const key = `${loc.strategy}:${loc.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
var DEFAULT_INCLUDE = [
  "**/*.tsx",
  "**/*.jsx",
  "**/*.ts",
  "**/*.js",
  "**/*.vue",
  "**/*.svelte"
];
var DEFAULT_EXCLUDE = [
  "**/node_modules/**",
  "**/dist/**",
  "**/build/**",
  "**/*.test.*",
  "**/*.spec.*",
  "**/__tests__/**"
];
var TESTID_PATTERNS = {
  // data-testid="value" or data-testid='value'
  dataTestId: /data-testid=["']([^"']+)["']/gi,
  // data-test="value" or data-test='value'
  dataTest: /data-test=["']([^"']+)["']/gi,
  // data-cy="value" (Cypress)
  dataCy: /data-cy=["']([^"']+)["']/gi,
  // getByTestId('value') in tests
  getByTestId: /getByTestId\s*\(\s*["']([^"']+)["']\s*\)/gi
};
var CSS_DEBT_PATTERNS = {
  // .className selectors in locator/querySelector
  classSelector: /(?:locator|querySelector|querySelectorAll)\s*\(\s*["']\.([a-zA-Z_-][a-zA-Z0-9_-]*)["']/gi,
  // #id selectors
  idSelector: /(?:locator|querySelector)\s*\(\s*["']#([a-zA-Z_-][a-zA-Z0-9_-]*)["']/gi,
  // Complex CSS selectors
  complexSelector: /(?:locator|querySelector)\s*\(\s*["']([^"']+\s+[^"']+)["']/gi
};
function extractComponentName(filePath) {
  const baseName = basename(filePath, extname(filePath));
  return baseName.replace(/\.(component|page|view|screen|container)$/i, "").replace(/[-_]/g, " ").split(" ").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join("");
}
function inferDescription(testId) {
  return testId.replace(/[-_]/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
}
function generateSelectorId(testId, component) {
  return `${component.toLowerCase()}-${testId}`;
}
function scanFile(filePath, testIdAttribute, trackCSSDebt) {
  const content = readFileSync(filePath, "utf-8");
  const component = extractComponentName(filePath);
  const selectors = [];
  const testIds = [];
  const cssDebt = [];
  const seenTestIds = /* @__PURE__ */ new Set();
  let primaryPattern;
  if (testIdAttribute === "data-testid") {
    primaryPattern = TESTID_PATTERNS.dataTestId;
  } else if (testIdAttribute === "data-test") {
    primaryPattern = TESTID_PATTERNS.dataTest;
  } else if (testIdAttribute === "data-cy") {
    primaryPattern = TESTID_PATTERNS.dataCy;
  } else {
    primaryPattern = new RegExp(`${testIdAttribute}=["']([^"']+)["']`, "gi");
  }
  primaryPattern.lastIndex = 0;
  let match;
  while ((match = primaryPattern.exec(content)) !== null) {
    const testId = match[1];
    if (!seenTestIds.has(testId)) {
      seenTestIds.add(testId);
      testIds.push(testId);
      const lineNumber = content.substring(0, match.index).split("\n").length;
      selectors.push({
        id: generateSelectorId(testId, component),
        description: inferDescription(testId),
        strategy: "testid",
        value: testId,
        component,
        sourceFile: filePath,
        sourceLine: lineNumber,
        stable: true
      });
    }
  }
  TESTID_PATTERNS.getByTestId.lastIndex = 0;
  while ((match = TESTID_PATTERNS.getByTestId.exec(content)) !== null) {
    const testId = match[1];
    if (!seenTestIds.has(testId)) {
      seenTestIds.add(testId);
      testIds.push(testId);
    }
  }
  if (trackCSSDebt) {
    for (const [patternName, pattern] of Object.entries(CSS_DEBT_PATTERNS)) {
      pattern.lastIndex = 0;
      while ((match = pattern.exec(content)) !== null) {
        const selector = match[1];
        const lineNumber = content.substring(0, match.index).split("\n").length;
        const existing = cssDebt.find((d) => d.selector === selector);
        if (existing) {
          existing.usages.push({ file: filePath, line: lineNumber });
        } else {
          cssDebt.push({
            selector: patternName === "classSelector" ? `.${selector}` : selector,
            usages: [{ file: filePath, line: lineNumber }],
            priority: "medium",
            reason: `CSS ${patternName} found - consider using testid or role`
          });
        }
      }
    }
  }
  return { selectors, testIds, cssDebt };
}
async function scanForTestIds(options) {
  const {
    sourceDir,
    testIdAttribute = "data-testid",
    include = DEFAULT_INCLUDE,
    exclude = DEFAULT_EXCLUDE,
    trackCSSDebt = true,
    existingCatalog
  } = options;
  const resolvedDir = resolve(sourceDir);
  const warnings = [];
  if (!existsSync(resolvedDir)) {
    return {
      catalog: existingCatalog ?? createEmptyCatalog(),
      filesScanned: 0,
      testIdsFound: 0,
      cssDebtFound: 0,
      warnings: [`Source directory not found: ${resolvedDir}`]
    };
  }
  const files = await fg(include, {
    cwd: resolvedDir,
    ignore: exclude,
    absolute: true
  });
  const catalog = existingCatalog ?? createEmptyCatalog();
  catalog.sourceDir = sourceDir;
  const allTestIds = new Set(catalog.testIds);
  let filesScanned = 0;
  let testIdsFound = 0;
  let cssDebtFound = 0;
  for (const filePath of files) {
    try {
      const result = scanFile(filePath, testIdAttribute, trackCSSDebt);
      filesScanned++;
      for (const selector of result.selectors) {
        selector.sourceFile = relative(resolvedDir, filePath);
        catalog.selectors[selector.id] = selector;
      }
      for (const testId of result.testIds) {
        if (!allTestIds.has(testId)) {
          allTestIds.add(testId);
          testIdsFound++;
        }
      }
      for (const debt of result.cssDebt) {
        debt.usages = debt.usages.map((u) => ({
          ...u,
          file: relative(resolvedDir, u.file)
        }));
        const existing = catalog.cssDebt?.find((d) => d.selector === debt.selector);
        if (existing) {
          existing.usages.push(...debt.usages);
        } else {
          catalog.cssDebt = catalog.cssDebt ?? [];
          catalog.cssDebt.push(debt);
          cssDebtFound++;
        }
      }
    } catch (err2) {
      warnings.push(`Failed to scan ${filePath}: ${err2}`);
    }
  }
  catalog.testIds = Array.from(allTestIds).sort();
  return {
    catalog,
    filesScanned,
    testIdsFound,
    cssDebtFound,
    warnings
  };
}
async function quickScanTestIds(sourceDir, testIdAttribute = "data-testid") {
  const result = await scanForTestIds({
    sourceDir,
    testIdAttribute,
    trackCSSDebt: false
  });
  return result.catalog.testIds;
}

// src/selectors/debt.ts
function recordCSSDebt(selector, file, line, reason) {
  const catalog = getCatalog();
  let debt = catalog.cssDebt?.find((d) => d.selector === selector);
  if (!debt) {
    debt = {
      selector,
      usages: [],
      priority: determinePriority(selector),
      reason: reason ?? inferDebtReason(selector)
    };
    catalog.cssDebt = catalog.cssDebt ?? [];
    catalog.cssDebt.push(debt);
  }
  const existingUsage = debt.usages.find((u) => u.file === file && u.line === line);
  if (!existingUsage) {
    debt.usages.push({ file, line });
  }
}
function determinePriority(selector) {
  if (selector.includes("[class*=") || selector.includes("[class^=")) {
    return "high";
  }
  if (selector.match(/\d+/)) {
    return "high";
  }
  if (selector.split(" ").length > 3) {
    return "high";
  }
  if (selector.startsWith(".")) {
    return "medium";
  }
  if (selector.startsWith("#")) {
    return "low";
  }
  return "medium";
}
function inferDebtReason(selector) {
  if (selector.includes("[class*=") || selector.includes("[class^=")) {
    return "Partial class matching is fragile - may break with CSS changes";
  }
  if (selector.match(/\d+/)) {
    return "Selector contains numbers - may be auto-generated and unstable";
  }
  if (selector.split(" ").length > 3) {
    return "Complex nested selector - hard to maintain and fragile";
  }
  if (selector.startsWith(".")) {
    return "Class selector - consider using testid or role";
  }
  if (selector.startsWith("#")) {
    return "ID selector - consider using testid for test stability";
  }
  return "CSS selector - consider using semantic locators";
}
function suggestReplacement(selector) {
  let name = selector.replace(/[.#\[\]="'^*~$]/g, " ").trim().split(/\s+/).filter((s) => s.length > 2).join("-").toLowerCase();
  if (!name) {
    name = "element";
  }
  const testId = name.replace(/\s+/g, "-");
  return {
    strategy: "testid",
    value: testId,
    code: `page.getByTestId('${testId}')`
  };
}
function generateDebtReport(catalog) {
  const cat = catalog ?? getCatalog();
  const debt = cat.cssDebt ?? [];
  const byPriority = { high: 0, medium: 0, low: 0 };
  let totalUsages = 0;
  const fileUsages = {};
  for (const entry of debt) {
    byPriority[entry.priority]++;
    totalUsages += entry.usages.length;
    for (const usage of entry.usages) {
      fileUsages[usage.file] = (fileUsages[usage.file] ?? 0) + 1;
    }
  }
  const topDebtFiles = Object.entries(fileUsages).sort(([, a], [, b]) => b - a).slice(0, 10).map(([file, count]) => ({ file, count }));
  const topSelectors = debt.sort((a, b) => b.usages.length - a.usages.length).slice(0, 10).map((d) => ({
    selector: d.selector,
    usageCount: d.usages.length,
    priority: d.priority
  }));
  return {
    totalDebt: debt.length,
    byPriority,
    totalUsages,
    topDebtFiles,
    topSelectors
  };
}
function generateMigrationPlan(catalog) {
  const cat = catalog ?? getCatalog();
  const debt = cat.cssDebt ?? [];
  const entries = debt.map((d) => {
    const suggestion = suggestReplacement(d.selector);
    const effort = d.priority === "high" ? "high" : d.usages.length > 5 ? "medium" : "low";
    return {
      debt: d,
      suggestedFix: suggestion.code,
      effort
    };
  });
  entries.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const pDiff = priorityOrder[a.debt.priority] - priorityOrder[b.debt.priority];
    if (pDiff !== 0) return pDiff;
    return b.debt.usages.length - a.debt.usages.length;
  });
  const effortCounts = { low: 0, medium: 0, high: 0 };
  for (const entry of entries) {
    effortCounts[entry.effort]++;
  }
  let estimatedEffort;
  if (effortCounts.high > 10 || effortCounts.medium > 20) {
    estimatedEffort = "Large refactoring effort required";
  } else if (effortCounts.high > 5 || effortCounts.medium > 10) {
    estimatedEffort = "Medium refactoring effort required";
  } else {
    estimatedEffort = "Small refactoring effort required";
  }
  const migrationOrder = entries.slice(0, 20).map((e) => e.debt.selector);
  return {
    entries,
    estimatedEffort,
    migrationOrder
  };
}
function clearDebt() {
  const catalog = getCatalog();
  catalog.cssDebt = [];
}
function removeDebt(selector) {
  const catalog = getCatalog();
  const index = catalog.cssDebt?.findIndex((d) => d.selector === selector) ?? -1;
  if (index >= 0) {
    catalog.cssDebt?.splice(index, 1);
    return true;
  }
  return false;
}
function updateDebtPriority(selector, priority) {
  const catalog = getCatalog();
  const debt = catalog.cssDebt?.find((d) => d.selector === selector);
  if (debt) {
    debt.priority = priority;
    return true;
  }
  return false;
}
function generateDebtMarkdown(catalog) {
  const report = generateDebtReport(catalog);
  const plan = generateMigrationPlan(catalog);
  const lines = [
    "# Selector Debt Report",
    "",
    `Generated: ${(/* @__PURE__ */ new Date()).toISOString()}`,
    "",
    "## Summary",
    "",
    `- **Total Debt Entries:** ${report.totalDebt}`,
    `- **Total Usages:** ${report.totalUsages}`,
    `- **High Priority:** ${report.byPriority.high}`,
    `- **Medium Priority:** ${report.byPriority.medium}`,
    `- **Low Priority:** ${report.byPriority.low}`,
    "",
    `**Effort Estimate:** ${plan.estimatedEffort}`,
    "",
    "## Top Selectors to Address",
    "",
    "| Selector | Usages | Priority | Suggested Fix |",
    "|----------|--------|----------|---------------|"
  ];
  for (const entry of plan.entries.slice(0, 15)) {
    lines.push(
      `| \`${entry.debt.selector}\` | ${entry.debt.usages.length} | ${entry.debt.priority} | \`${entry.suggestedFix}\` |`
    );
  }
  lines.push("", "## Files with Most Debt", "");
  for (const file of report.topDebtFiles.slice(0, 10)) {
    lines.push(`- \`${file.file}\`: ${file.count} debt usages`);
  }
  lines.push("", "## Migration Order", "", "Address these selectors first:", "");
  for (let i = 0; i < Math.min(10, plan.migrationOrder.length); i++) {
    lines.push(`${i + 1}. \`${plan.migrationOrder[i]}\``);
  }
  return lines.join("\n");
}

// src/codegen/blocks.ts
var BLOCK_START = "// ARTK:BEGIN GENERATED";
var BLOCK_END = "// ARTK:END GENERATED";
var BLOCK_ID_PATTERN = /ARTK:BEGIN GENERATED(?:\s+id=([a-zA-Z0-9_-]+))?/;
function extractManagedBlocks(code) {
  const lines = code.split("\n");
  const blocks = [];
  const preservedCode = [];
  const warnings = [];
  let inBlock = false;
  let currentBlock = null;
  let blockContent = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes(BLOCK_START)) {
      if (inBlock) {
        warnings.push({
          type: "nested",
          line: i + 1,
          message: `Nested managed block detected at line ${i + 1}. Previous block starting at line ${(currentBlock?.startLine ?? 0) + 1} will be closed.`
        });
        if (currentBlock) {
          blocks.push({
            ...currentBlock,
            endLine: i - 1,
            content: blockContent.join("\n")
          });
        }
      }
      inBlock = true;
      const match = line.match(BLOCK_ID_PATTERN);
      currentBlock = {
        id: match?.[1],
        startLine: i
      };
      blockContent = [];
      continue;
    }
    if (line.includes(BLOCK_END) && inBlock) {
      inBlock = false;
      if (currentBlock) {
        blocks.push({
          ...currentBlock,
          endLine: i,
          content: blockContent.join("\n")
        });
      }
      currentBlock = null;
      blockContent = [];
      continue;
    }
    if (inBlock) {
      blockContent.push(line);
    } else {
      preservedCode.push(line);
    }
  }
  if (inBlock && currentBlock) {
    warnings.push({
      type: "unclosed",
      line: (currentBlock.startLine ?? 0) + 1,
      message: `Unclosed managed block starting at line ${(currentBlock.startLine ?? 0) + 1} - block will be ignored`
    });
  }
  return {
    blocks,
    preservedCode,
    hasBlocks: blocks.length > 0,
    warnings
  };
}
function wrapInBlock(content, id) {
  const startMarker = id ? `${BLOCK_START} id=${id}` : BLOCK_START;
  return `${startMarker}
${content}
${BLOCK_END}`;
}
function injectManagedBlocks(options) {
  const { existingCode, newBlocks } = options;
  if (!existingCode.trim()) {
    return newBlocks.map((block) => wrapInBlock(block.content, block.id)).join("\n\n");
  }
  const { preservedCode, hasBlocks } = extractManagedBlocks(existingCode);
  if (!hasBlocks) {
    const preserved = preservedCode.join("\n").trim();
    const newContent = newBlocks.map((block) => wrapInBlock(block.content, block.id)).join("\n\n");
    return preserved ? `${preserved}

${newContent}` : newContent;
  }
  const result = [];
  const processedIds = /* @__PURE__ */ new Set();
  let idLessBlockIndex = 0;
  const idLessNewBlocks = newBlocks.filter((b) => !b.id);
  const processedIdLessIndices = /* @__PURE__ */ new Set();
  const lines = existingCode.split("\n");
  let inBlock = false;
  let currentBlockId;
  let skipUntilEnd = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes(BLOCK_START)) {
      inBlock = true;
      const match = line.match(BLOCK_ID_PATTERN);
      currentBlockId = match?.[1];
      let replacement;
      if (currentBlockId) {
        replacement = newBlocks.find((b) => b.id === currentBlockId);
        if (replacement) {
          processedIds.add(currentBlockId);
        }
      } else {
        if (idLessBlockIndex < idLessNewBlocks.length) {
          replacement = idLessNewBlocks[idLessBlockIndex];
          processedIdLessIndices.add(idLessBlockIndex);
        }
        idLessBlockIndex++;
      }
      if (replacement) {
        result.push(wrapInBlock(replacement.content, replacement.id));
        skipUntilEnd = true;
      } else {
        result.push(line);
        skipUntilEnd = false;
      }
      continue;
    }
    if (line.includes(BLOCK_END) && inBlock) {
      inBlock = false;
      if (!skipUntilEnd) {
        result.push(line);
      }
      currentBlockId = void 0;
      skipUntilEnd = false;
      continue;
    }
    if (!inBlock) {
      result.push(line);
    } else if (!skipUntilEnd) {
      result.push(line);
    }
  }
  for (let i = 0; i < newBlocks.length; i++) {
    const block = newBlocks[i];
    if (block.id) {
      if (!processedIds.has(block.id)) {
        result.push("");
        result.push(wrapInBlock(block.content, block.id));
      }
    } else {
      const idLessIndex = idLessNewBlocks.indexOf(block);
      if (!processedIdLessIndices.has(idLessIndex)) {
        result.push("");
        result.push(wrapInBlock(block.content, block.id));
      }
    }
  }
  return result.join("\n");
}
function splitJourneyContent(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    throw new Error(
      "Invalid Journey format: missing frontmatter delimiters (content should be wrapped in --- ... ---)"
    );
  }
  return {
    frontmatter: match[1],
    body: match[2]
  };
}
function calculateContentHash(content) {
  return createHash("sha256").update(content).digest("hex").substring(0, 8);
}
function updateJourneyFrontmatter(options) {
  const {
    journeyPath,
    testPath,
    testContent,
    modules = { foundation: [], features: [] }
  } = options;
  const content = readFileSync(journeyPath, "utf-8");
  const { frontmatter, body } = splitJourneyContent(content);
  const parsed = parse(frontmatter);
  const previousTests = Array.isArray(parsed.tests) ? parsed.tests.map(
    (t) => typeof t === "string" ? { path: t, generated: "", hash: "" } : { ...t }
  ) : [];
  const hash = calculateContentHash(testContent);
  const testEntry = {
    path: testPath,
    generated: (/* @__PURE__ */ new Date()).toISOString(),
    hash
  };
  if (!Array.isArray(parsed.tests)) {
    parsed.tests = [];
  }
  const existingIndex = parsed.tests.findIndex(
    (t) => typeof t === "string" ? t === testPath : t.path === testPath
  );
  if (existingIndex >= 0) {
    parsed.tests[existingIndex] = testEntry;
  } else {
    parsed.tests.push(testEntry);
  }
  const modulesAdded = {
    foundation: [],
    features: []
  };
  if (!parsed.modules || typeof parsed.modules !== "object") {
    parsed.modules = { foundation: [], features: [] };
  }
  const parsedModules = parsed.modules;
  if (!Array.isArray(parsedModules.foundation)) {
    parsedModules.foundation = [];
  }
  if (!Array.isArray(parsedModules.features)) {
    parsedModules.features = [];
  }
  if (modules.foundation) {
    const existingFoundation = new Set(parsedModules.foundation);
    for (const mod of modules.foundation) {
      if (!existingFoundation.has(mod)) {
        modulesAdded.foundation.push(mod);
        parsedModules.foundation.push(mod);
      }
    }
    parsedModules.foundation.sort();
  }
  if (modules.features) {
    const existingFeatures = new Set(parsedModules.features);
    for (const mod of modules.features) {
      if (!existingFeatures.has(mod)) {
        modulesAdded.features.push(mod);
        parsedModules.features.push(mod);
      }
    }
    parsedModules.features.sort();
  }
  const newFrontmatter = stringify(parsed, {
    lineWidth: 0,
    // Prevent line wrapping
    defaultKeyType: "PLAIN",
    defaultStringType: "QUOTE_DOUBLE"
  });
  const newContent = `---
${newFrontmatter}---
${body}`;
  writeFileSync(journeyPath, newContent, "utf-8");
  return {
    success: true,
    previousTests,
    updatedTests: parsed.tests,
    modulesAdded
  };
}
var cachedPackageRoot;
var cachedModuleDir;
function getModuleDir() {
  if (cachedModuleDir) {
    return cachedModuleDir;
  }
  if (typeof __dirname === "string" && __dirname.length > 0) {
    cachedModuleDir = __dirname;
    return cachedModuleDir;
  }
  try {
    const metaUrl = import.meta.url;
    if (metaUrl) {
      cachedModuleDir = dirname(fileURLToPath(metaUrl));
      return cachedModuleDir;
    }
  } catch {
  }
  try {
    if (typeof __require !== "undefined" && __require?.resolve) {
      const resolved = __require.resolve("@artk/core-autogen/package.json");
      cachedModuleDir = dirname(resolved);
      return cachedModuleDir;
    }
  } catch {
  }
  cachedModuleDir = process.cwd();
  return cachedModuleDir;
}
function getPackageRoot() {
  if (cachedPackageRoot) {
    return cachedPackageRoot;
  }
  const envRoot = process.env["ARTK_AUTOGEN_ROOT"];
  if (envRoot && existsSync(join(envRoot, "package.json"))) {
    cachedPackageRoot = envRoot;
    return cachedPackageRoot;
  }
  const moduleDir = getModuleDir();
  const possibleRoots = [
    join(moduleDir, "..", ".."),
    // from dist/utils/ or dist-cjs/utils/
    join(moduleDir, ".."),
    // from dist/ directly
    moduleDir
    // if already at root
  ];
  for (const root of possibleRoots) {
    const pkgPath = join(root, "package.json");
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
        if (pkg.name === "@artk/core-autogen") {
          cachedPackageRoot = root;
          return cachedPackageRoot;
        }
      } catch {
      }
    }
  }
  const cwdPaths = [
    join(process.cwd(), "node_modules", "@artk", "core-autogen"),
    join(process.cwd(), "artk-e2e", "vendor", "artk-core-autogen"),
    process.cwd()
  ];
  for (const searchPath of cwdPaths) {
    const pkgPath = join(searchPath, "package.json");
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
        if (pkg.name === "@artk/core-autogen") {
          cachedPackageRoot = searchPath;
          return cachedPackageRoot;
        }
      } catch {
      }
    }
  }
  cachedPackageRoot = join(moduleDir, "..", "..");
  return cachedPackageRoot;
}
function getTemplatesDir() {
  const root = getPackageRoot();
  const moduleDir = getModuleDir();
  const relativeToModule = join(moduleDir, "..", "codegen", "templates");
  if (existsSync(relativeToModule)) {
    return relativeToModule;
  }
  const possiblePaths = [
    join(root, "dist", "codegen", "templates"),
    join(root, "dist-cjs", "codegen", "templates"),
    join(root, "dist-legacy-16", "codegen", "templates"),
    join(root, "dist-legacy-14", "codegen", "templates")
  ];
  for (const templatesPath of possiblePaths) {
    if (existsSync(templatesPath)) {
      return templatesPath;
    }
  }
  return possiblePaths[0] ?? join(root, "dist", "codegen", "templates");
}
function getTemplatePath(templateName) {
  return join(getTemplatesDir(), templateName);
}

// src/utils/version.ts
var cachedVersion;
function getPackageVersion() {
  if (cachedVersion) {
    return cachedVersion;
  }
  try {
    if (typeof __ARTK_VERSION__ !== "undefined" && __ARTK_VERSION__) {
      cachedVersion = __ARTK_VERSION__;
      return cachedVersion;
    }
  } catch {
  }
  const envVersion = process.env["ARTK_VERSION"];
  if (envVersion) {
    cachedVersion = envVersion;
    return cachedVersion;
  }
  try {
    const packageRoot = getPackageRoot();
    const pkgPath = join(packageRoot, "package.json");
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      if (pkg.version) {
        cachedVersion = pkg.version;
        return cachedVersion;
      }
    }
  } catch {
  }
  cachedVersion = "unknown";
  return cachedVersion;
}
function getGeneratedTimestamp() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function generateFileHeader(options = {}) {
  const version = getPackageVersion();
  const timestamp = getGeneratedTimestamp();
  const lines = [
    "/**",
    options.title ? ` * ${options.title}` : " * Generated file",
    options.journeyId ? ` * Journey: ${options.journeyId}` : null,
    ` *`,
    ` * @generated by @artk/core-autogen v${version}`,
    ` * @timestamp ${timestamp}`,
    ` * @warning Generated regions (ARTK:BEGIN/END GENERATED) will be overwritten.`,
    ` *          Code outside these blocks is preserved on regeneration.`
  ];
  if (options.tags && options.tags.length > 0) {
    lines.push(` * @tags ${options.tags.join(", ")}`);
  }
  if (options.tier) {
    lines.push(` * @tier ${options.tier}`);
  }
  if (options.scope) {
    lines.push(` * @scope ${options.scope}`);
  }
  if (options.actor) {
    lines.push(` * @actor ${options.actor}`);
  }
  lines.push(" */");
  return lines.filter((l) => l !== null).join("\n");
}
function getBrandingComment() {
  const version = getPackageVersion();
  return `@artk/core-autogen v${version}`;
}

// src/variants/index.ts
function detectVariant() {
  const nodeVersionStr = process.version.slice(1);
  const nodeVersion = parseInt(nodeVersionStr.split(".")[0], 10);
  const isESM = typeof import.meta !== "undefined";
  if (nodeVersion >= 18) {
    return {
      id: isESM ? "modern-esm" : "modern-cjs",
      nodeVersion,
      moduleSystem: isESM ? "esm" : "cjs",
      playwrightVersion: "1.57.x",
      features: {
        ariaSnapshots: true,
        clockApi: true,
        topLevelAwait: true,
        promiseAny: true
      }
    };
  } else if (nodeVersion >= 16) {
    return {
      id: "legacy-16",
      nodeVersion,
      moduleSystem: "cjs",
      playwrightVersion: "1.49.x",
      features: {
        ariaSnapshots: true,
        clockApi: true,
        topLevelAwait: true,
        promiseAny: true
      }
    };
  } else {
    return {
      id: "legacy-14",
      nodeVersion,
      moduleSystem: "cjs",
      playwrightVersion: "1.33.x",
      features: {
        ariaSnapshots: false,
        clockApi: false,
        topLevelAwait: false,
        promiseAny: false
      }
    };
  }
}

// src/codegen/generateTest.ts
function _checkFeature(ctx, feature, featureName, primitiveType) {
  const available = ctx.variant.features[feature];
  if (!available && ctx.warnOnIncompatible) {
    ctx.warnings.push(
      `Primitive '${primitiveType}' uses ${featureName} which requires ${getFeatureRequirement(feature)}. Current variant: ${ctx.variant.id} (Playwright ${ctx.variant.playwrightVersion})`
    );
  }
  return available;
}
var __test_checkFeature = _checkFeature;
function getFeatureRequirement(feature) {
  switch (feature) {
    case "ariaSnapshots":
      return "Playwright 1.49+ (Node 16+)";
    case "clockApi":
      return "Playwright 1.45+ (Node 18+)";
    case "topLevelAwait":
      return "Node 14.8+ with ESM";
    case "promiseAny":
      return "Node 15+ or polyfill";
    default:
      return "unknown version";
  }
}
function escapeString3(str) {
  return str.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "\\r");
}
function renderValue(value) {
  switch (value.type) {
    case "literal":
      return `'${escapeString3(value.value)}'`;
    case "actor":
      return `actor.${value.value}`;
    case "runId":
      return "runId";
    case "generated":
      return `\`${value.value}\``;
    case "testData":
      return `testData.${value.value}`;
    default:
      return `'${escapeString3(value.value)}'`;
  }
}
function renderPrimitive(primitive, indent = "", _ctx) {
  switch (primitive.type) {
    // Navigation
    case "goto":
      return `${indent}await page.goto('${escapeString3(primitive.url)}');`;
    case "waitForURL":
      const urlPattern = typeof primitive.pattern === "string" ? `/${escapeRegex(primitive.pattern)}/` : primitive.pattern.toString();
      return `${indent}await page.waitForURL(${urlPattern});`;
    case "waitForResponse":
      return `${indent}await page.waitForResponse(resp => resp.url().includes('${escapeString3(primitive.urlPattern)}'));`;
    case "waitForLoadingComplete":
      return `${indent}await page.waitForLoadState('networkidle');`;
    case "reload":
      return `${indent}await page.reload();`;
    case "goBack":
      return `${indent}await page.goBack();`;
    case "goForward":
      return `${indent}await page.goForward();`;
    // Wait primitives
    case "waitForVisible":
      const waitVisibleTimeout = primitive.timeout ? `, timeout: ${primitive.timeout}` : "";
      return `${indent}await page.${toPlaywrightLocator(primitive.locator)}.waitFor({ state: 'visible'${waitVisibleTimeout} });`;
    case "waitForHidden":
      const waitHiddenTimeout = primitive.timeout ? `, timeout: ${primitive.timeout}` : "";
      return `${indent}await page.${toPlaywrightLocator(primitive.locator)}.waitFor({ state: 'hidden'${waitHiddenTimeout} });`;
    case "waitForTimeout":
      return `${indent}await page.waitForTimeout(${primitive.ms});`;
    case "waitForNetworkIdle":
      const networkIdleOptions = primitive.timeout ? `, { timeout: ${primitive.timeout} }` : "";
      return `${indent}await page.waitForLoadState('networkidle'${networkIdleOptions});`;
    // Interactions
    case "click":
      return `${indent}await page.${toPlaywrightLocator(primitive.locator)}.click();`;
    case "dblclick":
      return `${indent}await page.${toPlaywrightLocator(primitive.locator)}.dblclick();`;
    case "rightClick":
      return `${indent}await page.${toPlaywrightLocator(primitive.locator)}.click({ button: 'right' });`;
    case "fill":
      return `${indent}await page.${toPlaywrightLocator(primitive.locator)}.fill(${renderValue(primitive.value)});`;
    case "select":
      return `${indent}await page.${toPlaywrightLocator(primitive.locator)}.selectOption('${escapeString3(primitive.option)}');`;
    case "check":
      return `${indent}await page.${toPlaywrightLocator(primitive.locator)}.check();`;
    case "uncheck":
      return `${indent}await page.${toPlaywrightLocator(primitive.locator)}.uncheck();`;
    case "press":
      if (primitive.locator) {
        return `${indent}await page.${toPlaywrightLocator(primitive.locator)}.press('${primitive.key}');`;
      }
      return `${indent}await page.keyboard.press('${primitive.key}');`;
    case "hover":
      return `${indent}await page.${toPlaywrightLocator(primitive.locator)}.hover();`;
    case "focus":
      return `${indent}await page.${toPlaywrightLocator(primitive.locator)}.focus();`;
    case "clear":
      return `${indent}await page.${toPlaywrightLocator(primitive.locator)}.clear();`;
    case "upload":
      return `${indent}await page.${toPlaywrightLocator(primitive.locator)}.setInputFiles([${primitive.files.map((f) => `'${escapeString3(f)}'`).join(", ")}]);`;
    // Assertions
    case "expectVisible":
      const visibleOptions = primitive.timeout ? `{ timeout: ${primitive.timeout} }` : "";
      return `${indent}await expect(page.${toPlaywrightLocator(primitive.locator)}).toBeVisible(${visibleOptions});`;
    case "expectNotVisible":
      return `${indent}await expect(page.${toPlaywrightLocator(primitive.locator)}).not.toBeVisible();`;
    case "expectHidden":
      return `${indent}await expect(page.${toPlaywrightLocator(primitive.locator)}).toBeHidden();`;
    case "expectText":
      const textPattern = typeof primitive.text === "string" ? `'${escapeString3(primitive.text)}'` : primitive.text.toString();
      return `${indent}await expect(page.${toPlaywrightLocator(primitive.locator)}).toHaveText(${textPattern});`;
    case "expectValue":
      return `${indent}await expect(page.${toPlaywrightLocator(primitive.locator)}).toHaveValue('${escapeString3(primitive.value)}');`;
    case "expectChecked":
      if (primitive.checked === false) {
        return `${indent}await expect(page.${toPlaywrightLocator(primitive.locator)}).not.toBeChecked();`;
      }
      return `${indent}await expect(page.${toPlaywrightLocator(primitive.locator)}).toBeChecked();`;
    case "expectEnabled":
      return `${indent}await expect(page.${toPlaywrightLocator(primitive.locator)}).toBeEnabled();`;
    case "expectDisabled":
      return `${indent}await expect(page.${toPlaywrightLocator(primitive.locator)}).toBeDisabled();`;
    case "expectURL":
      const urlExpectPattern = typeof primitive.pattern === "string" ? `/${escapeRegex(primitive.pattern)}/` : primitive.pattern.toString();
      return `${indent}await expect(page).toHaveURL(${urlExpectPattern});`;
    case "expectTitle":
      const titlePattern = typeof primitive.title === "string" ? `'${escapeString3(primitive.title)}'` : primitive.title.toString();
      return `${indent}await expect(page).toHaveTitle(${titlePattern});`;
    case "expectCount":
      return `${indent}await expect(page.${toPlaywrightLocator(primitive.locator)}).toHaveCount(${primitive.count});`;
    case "expectContainsText":
      return `${indent}await expect(page.${toPlaywrightLocator(primitive.locator)}).toContainText('${escapeString3(primitive.text)}');`;
    // Signals
    case "expectToast":
      const toastSelector = primitive.message ? `getByText('${escapeString3(primitive.message)}')` : `getByRole('alert')`;
      return `${indent}await expect(page.${toastSelector}).toBeVisible();`;
    case "dismissModal":
      return `${indent}await page.getByRole('dialog').getByRole('button', { name: /close|cancel|dismiss/i }).click();`;
    case "acceptAlert":
      return `${indent}page.on('dialog', dialog => dialog.accept());`;
    case "dismissAlert":
      return `${indent}page.on('dialog', dialog => dialog.dismiss());`;
    // Module calls - use factory function to create instance
    case "callModule":
      const factoryName = `create${primitive.module}`;
      const args = primitive.args ? primitive.args.map((a) => JSON.stringify(a)).join(", ") : "";
      return `${indent}await ${factoryName}(page).${primitive.method}(${args});`;
    // Blocked - must throw to fail the test
    case "blocked":
      return `${indent}// ARTK BLOCKED: ${primitive.reason}
${indent}// Source: ${escapeString3(primitive.sourceText)}
${indent}throw new Error('ARTK BLOCKED: ${escapeString3(primitive.reason)}');`;
    default:
      return `${indent}// Unknown primitive type: ${primitive.type}`;
  }
}
function createVariantAwareRenderer(ctx) {
  return (primitive, indent = "") => renderPrimitive(primitive, indent);
}
function loadDefaultTemplate() {
  const templatePath = getTemplatePath("test.ejs");
  return readFileSync(templatePath, "utf-8");
}
function collectImports(journey) {
  const imports = [];
  const usedModules = /* @__PURE__ */ new Set();
  for (const step of journey.steps) {
    for (const action of step.actions) {
      if (action.type === "callModule") {
        usedModules.add(action.module);
      }
    }
  }
  for (const module of usedModules) {
    const modulePath = module.charAt(0).toLowerCase() + module.slice(1);
    const factoryName = `create${module}`;
    imports.push({
      members: [factoryName],
      from: `@modules/${modulePath}`
    });
  }
  return imports;
}
function getLlkbInfo(llkbRoot) {
  const analyticsPath = join(llkbRoot, "analytics.json");
  if (!existsSync(analyticsPath)) {
    return { llkbVersion: null, llkbEntries: null };
  }
  try {
    const content = readFileSync(analyticsPath, "utf-8");
    const analytics = JSON.parse(content);
    const llkbVersion = analytics.lastUpdated || (/* @__PURE__ */ new Date()).toISOString();
    const totalLessons = analytics.overview?.totalLessons || 0;
    const totalComponents = analytics.overview?.totalComponents || 0;
    const llkbEntries = totalLessons + totalComponents;
    return { llkbVersion, llkbEntries };
  } catch {
    return { llkbVersion: null, llkbEntries: null };
  }
}
function generateTest(journey, options = {}) {
  const {
    templatePath,
    imports: additionalImports = [],
    strategy = "full",
    existingCode,
    llkbRoot = ".artk/llkb",
    includeLlkbVersion = true,
    targetVariant,
    warnOnIncompatible = true
  } = options;
  const variant = targetVariant || detectVariant();
  const variantCtx = {
    warnings: []};
  const template = templatePath ? readFileSync(templatePath, "utf-8") : loadDefaultTemplate();
  const imports = [...collectImports(journey), ...additionalImports];
  let llkbVersion = null;
  let llkbEntries = null;
  if (includeLlkbVersion) {
    const llkbInfo = getLlkbInfo(llkbRoot);
    llkbVersion = llkbInfo.llkbVersion;
    llkbEntries = llkbInfo.llkbEntries;
  }
  const variantAwareRenderPrimitive = createVariantAwareRenderer();
  let code = ejs.render(template, {
    journey,
    imports,
    renderPrimitive: variantAwareRenderPrimitive,
    escapeString: escapeString3,
    escapeRegex,
    version: getPackageVersion(),
    timestamp: getGeneratedTimestamp(),
    llkbVersion,
    llkbEntries,
    variant: variant.id,
    playwrightVersion: variant.playwrightVersion
  });
  if (strategy === "blocks" && existingCode) {
    const testBlock = {
      id: `test-${journey.id}`,
      content: code.trim()
    };
    code = injectManagedBlocks({
      existingCode,
      newBlocks: [testBlock]
    });
  } else if (strategy === "ast" && existingCode) {
    console.warn("AST strategy not yet implemented for blocks integration, using full generation");
  }
  const filename = `${journey.id.toLowerCase()}.spec.ts`;
  if (options.updateJourney && options.journeyPath) {
    try {
      const testPath = options.outputPath || filename;
      const modules = {
        foundation: journey.moduleDependencies?.foundation || [],
        features: journey.moduleDependencies?.feature || []
        // Note: IR uses 'feature' (singular)
      };
      updateJourneyFrontmatter({
        journeyPath: options.journeyPath,
        testPath,
        testContent: code,
        modules
      });
    } catch (error) {
      console.error(
        `Warning: Failed to update journey frontmatter: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  return {
    code,
    journeyId: journey.id,
    filename,
    imports,
    variant,
    variantWarnings: variantCtx.warnings.length > 0 ? variantCtx.warnings : void 0
  };
}
function generateTestCode(journey) {
  return generateTest(journey).code;
}
function toPascalCase(str) {
  return str.split(/[-_\s]+/).map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join("");
}
function toCamelCase(str) {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}
function generateLocatorName(spec, existingNames) {
  let baseName;
  switch (spec.strategy) {
    case "role":
      baseName = spec.options?.name ? `${toCamelCase(spec.options.name)}${toPascalCase(spec.value)}` : `${toCamelCase(spec.value)}Element`;
      break;
    case "label":
    case "placeholder":
    case "text":
      baseName = `${toCamelCase(spec.value)}Field`;
      break;
    case "testid":
      baseName = toCamelCase(spec.value);
      break;
    case "css":
      const match = spec.value.match(/[#.]?([a-zA-Z][a-zA-Z0-9_-]*)/);
      baseName = match ? toCamelCase(match[1]) : "element";
      break;
    default:
      baseName = "element";
  }
  let name = baseName;
  let counter = 1;
  while (existingNames.has(name)) {
    name = `${baseName}${counter}`;
    counter++;
  }
  existingNames.add(name);
  return name;
}
function extractLocators(journey) {
  const locators = [];
  const existingNames = /* @__PURE__ */ new Set();
  const seenSpecs = /* @__PURE__ */ new Map();
  const processPrimitive = (primitive) => {
    const locatorSpec = primitive.locator;
    if (!locatorSpec) return;
    const specKey = JSON.stringify(locatorSpec);
    if (seenSpecs.has(specKey)) return;
    const name = generateLocatorName(locatorSpec, existingNames);
    const playwrightLocator = toPlaywrightLocator(locatorSpec);
    const locator = {
      name,
      playwright: playwrightLocator,
      spec: locatorSpec,
      description: `Locator for ${locatorSpec.strategy}: ${locatorSpec.value}`
    };
    locators.push(locator);
    seenSpecs.set(specKey, locator);
  };
  if (journey.setup) {
    for (const primitive of journey.setup) {
      processPrimitive(primitive);
    }
  }
  for (const step of journey.steps) {
    for (const action of step.actions) {
      processPrimitive(action);
    }
    for (const assertion of step.assertions) {
      processPrimitive(assertion);
    }
  }
  if (journey.cleanup) {
    for (const primitive of journey.cleanup) {
      processPrimitive(primitive);
    }
  }
  return locators;
}
function generateMethods(journey, locators) {
  const methods = [];
  const locatorMap = /* @__PURE__ */ new Map();
  for (const locator of locators) {
    const specKey = JSON.stringify(locator.spec);
    locatorMap.set(specKey, locator.name);
  }
  const getLocatorRef = (spec) => {
    const specKey = JSON.stringify(spec);
    const locatorName = locatorMap.get(specKey);
    return locatorName ? `this.${locatorName}` : `this.page.${toPlaywrightLocator(spec)}`;
  };
  for (const step of journey.steps) {
    const methodName = toCamelCase(step.id.replace(/[^a-zA-Z0-9]/g, "_"));
    const body = [];
    for (const action of step.actions) {
      const line = primitiveToMethodLine(action, getLocatorRef);
      if (line) {
        body.push(line);
      }
    }
    for (const assertion of step.assertions) {
      const line = primitiveToMethodLine(assertion, getLocatorRef);
      if (line) {
        body.push(line);
      }
    }
    if (body.length > 0) {
      methods.push({
        name: methodName,
        description: step.description,
        params: [],
        returnType: "void",
        body
      });
    }
  }
  return methods;
}
function primitiveToMethodLine(primitive, getLocatorRef) {
  switch (primitive.type) {
    // Navigation
    case "goto":
      return `await this.page.goto('${escapeString4(primitive.url)}');`;
    case "waitForURL":
      const urlPattern = typeof primitive.pattern === "string" ? `'${escapeString4(primitive.pattern)}'` : primitive.pattern.toString();
      return `await this.page.waitForURL(${urlPattern});`;
    case "waitForLoadingComplete":
      return `await this.page.waitForLoadState('networkidle');`;
    // Interactions
    case "click":
      return `await ${getLocatorRef(primitive.locator)}.click();`;
    case "fill":
      const value = primitive.value.type === "literal" ? `'${escapeString4(primitive.value.value)}'` : primitive.value.value;
      return `await ${getLocatorRef(primitive.locator)}.fill(${value});`;
    case "select":
      return `await ${getLocatorRef(primitive.locator)}.selectOption('${escapeString4(primitive.option)}');`;
    case "check":
      return `await ${getLocatorRef(primitive.locator)}.check();`;
    case "uncheck":
      return `await ${getLocatorRef(primitive.locator)}.uncheck();`;
    case "press":
      if (primitive.locator) {
        return `await ${getLocatorRef(primitive.locator)}.press('${primitive.key}');`;
      }
      return `await this.page.keyboard.press('${primitive.key}');`;
    case "hover":
      return `await ${getLocatorRef(primitive.locator)}.hover();`;
    case "focus":
      return `await ${getLocatorRef(primitive.locator)}.focus();`;
    case "clear":
      return `await ${getLocatorRef(primitive.locator)}.clear();`;
    // Assertions (using expect)
    case "expectVisible":
      return `await expect(${getLocatorRef(primitive.locator)}).toBeVisible();`;
    case "expectNotVisible":
      return `await expect(${getLocatorRef(primitive.locator)}).not.toBeVisible();`;
    case "expectText":
      const textPattern = typeof primitive.text === "string" ? `'${escapeString4(primitive.text)}'` : primitive.text.toString();
      return `await expect(${getLocatorRef(primitive.locator)}).toHaveText(${textPattern});`;
    case "expectValue":
      return `await expect(${getLocatorRef(primitive.locator)}).toHaveValue('${escapeString4(primitive.value)}');`;
    case "expectEnabled":
      return `await expect(${getLocatorRef(primitive.locator)}).toBeEnabled();`;
    case "expectDisabled":
      return `await expect(${getLocatorRef(primitive.locator)}).toBeDisabled();`;
    // Blocked - must throw to fail the test
    case "blocked":
      return `// ARTK BLOCKED: ${primitive.reason}
    throw new Error('ARTK BLOCKED: ${primitive.reason}');`;
    default:
      return null;
  }
}
function escapeString4(str) {
  return str.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "\\r");
}
function loadDefaultTemplate2() {
  const templatePath = getTemplatePath("module.ejs");
  return readFileSync(templatePath, "utf-8");
}
function generateModule(journey, options = {}) {
  const { templatePath, suffix = "Page" } = options;
  const template = templatePath ? readFileSync(templatePath, "utf-8") : loadDefaultTemplate2();
  const moduleName = toPascalCase(journey.scope);
  const className = `${moduleName}${suffix}`;
  const locators = extractLocators(journey);
  const methods = generateMethods(journey, locators);
  const moduleDef = {
    moduleName,
    className,
    scope: journey.scope,
    locators,
    methods
  };
  const code = ejs.render(template, {
    ...moduleDef,
    version: getPackageVersion(),
    timestamp: getGeneratedTimestamp()
  });
  const filename = `${journey.scope.toLowerCase()}.page.ts`;
  return {
    code,
    moduleName,
    filename,
    locators,
    methods
  };
}
function generateModuleCode(journey) {
  return generateModule(journey).code;
}
function extractModuleDefinition(journey, options = {}) {
  const { suffix = "Page" } = options;
  const moduleName = toPascalCase(journey.scope);
  const className = `${moduleName}${suffix}`;
  const locators = extractLocators(journey);
  const methods = generateMethods(journey, locators);
  return {
    moduleName,
    className,
    scope: journey.scope,
    locators,
    methods
  };
}
function createProject() {
  return new Project({
    useInMemoryFileSystem: true,
    compilerOptions: {
      target: ScriptTarget.ESNext,
      module: ModuleKind.ESNext,
      strict: true
    }
  });
}
function loadSourceFile(project, code, filename = "temp.ts") {
  return project.createSourceFile(filename, code, { overwrite: true });
}
function findClass(sourceFile, className) {
  return sourceFile.getClass(className);
}
function findMethod(classDecl, methodName) {
  return classDecl.getMethod(methodName);
}
function findProperty(classDecl, propertyName) {
  return classDecl.getProperty(propertyName);
}
function hasImport(sourceFile, moduleSpecifier) {
  return sourceFile.getImportDeclarations().some(
    (imp) => imp.getModuleSpecifierValue() === moduleSpecifier
  );
}
function getImport(sourceFile, moduleSpecifier) {
  return sourceFile.getImportDeclarations().find(
    (imp) => imp.getModuleSpecifierValue() === moduleSpecifier
  );
}
function addNamedImport(sourceFile, moduleSpecifier, namedImport) {
  const existingImport = getImport(sourceFile, moduleSpecifier);
  if (existingImport) {
    const namedImports = existingImport.getNamedImports();
    const exists = namedImports.some((ni) => ni.getName() === namedImport);
    if (!exists) {
      existingImport.addNamedImport(namedImport);
      return true;
    }
    return false;
  }
  sourceFile.addImportDeclaration({
    moduleSpecifier,
    namedImports: [namedImport]
  });
  return true;
}
function addLocatorProperty(classDecl, locator, options = {}) {
  const existing = findProperty(classDecl, locator.name);
  if (existing) {
    if (options.preserveExisting) {
      return { added: false, initialized: false };
    }
    existing.remove();
  }
  classDecl.addProperty({
    name: locator.name,
    isReadonly: true,
    type: "Locator",
    docs: locator.description ? [{ description: locator.description }] : void 0
  });
  const initStatement = `this.${locator.name} = page.${locator.playwright};`;
  let constructor = classDecl.getConstructors()[0];
  if (!constructor) {
    constructor = classDecl.addConstructor({
      parameters: [{ name: "page", type: "Page" }],
      statements: [`this.page = page;`, initStatement]
    });
    if (!findProperty(classDecl, "page")) {
      classDecl.insertProperty(0, {
        name: "page",
        isReadonly: true,
        type: "Page"
      });
    }
    return { added: true, initialized: true };
  }
  let body = constructor.getBody();
  if (!body) {
    constructor.setBodyText("");
    body = constructor.getBody();
    if (!body) {
      return {
        added: true,
        initialized: false,
        warning: `Cannot add body to constructor for '${locator.name}' initialization`
      };
    }
  }
  const existingInit = body.getDescendantsOfKind(SyntaxKind.ExpressionStatement).find((stmt) => stmt.getText().includes(`this.${locator.name}`));
  if (!existingInit) {
    constructor.addStatements(initStatement);
  }
  return { added: true, initialized: true };
}
function addMethod(classDecl, method, options = {}) {
  const existing = findMethod(classDecl, method.name);
  if (existing) {
    if (options.preserveExisting) {
      return false;
    }
    existing.remove();
  }
  classDecl.addMethod({
    name: method.name,
    isAsync: true,
    parameters: method.params.map((p) => ({
      name: p.name,
      type: p.type,
      hasQuestionToken: p.optional,
      initializer: p.defaultValue
    })),
    returnType: `Promise<${method.returnType}>`,
    docs: [{ description: method.description }],
    statements: method.body.join("\n")
  });
  return true;
}
function updateModuleFile(code, className, locators, methods, options = {}) {
  const project = createProject();
  const sourceFile = loadSourceFile(project, code);
  const changes = [];
  const warnings = [];
  const classDecl = findClass(sourceFile, className);
  if (!classDecl) {
    return {
      modified: false,
      changes: [],
      code,
      warnings: [`Class '${className}' not found in source file`]
    };
  }
  if (options.addImports !== false) {
    if (addNamedImport(sourceFile, "@playwright/test", "Locator")) {
      changes.push("Added Locator import");
    }
    if (addNamedImport(sourceFile, "@playwright/test", "expect")) {
      changes.push("Added expect import");
    }
  }
  for (const locator of locators) {
    const result = addLocatorProperty(classDecl, locator, options);
    if (result.added) {
      changes.push(`Added locator: ${locator.name}`);
      if (result.warning) {
        warnings.push(result.warning);
      }
    } else if (options.preserveExisting) {
      warnings.push(`Skipped existing locator: ${locator.name}`);
    }
  }
  for (const method of methods) {
    const added = addMethod(classDecl, method, options);
    if (added) {
      changes.push(`Added method: ${method.name}`);
    } else if (options.preserveExisting) {
      warnings.push(`Skipped existing method: ${method.name}`);
    }
  }
  if (options.formatOutput !== false) {
    sourceFile.formatText();
  }
  return {
    modified: changes.length > 0,
    changes,
    code: sourceFile.getFullText(),
    warnings
  };
}
function extractMethodBodyText(method) {
  const body = method.getBody();
  if (!body) return "";
  const fullText = body.getText();
  const inner = fullText.slice(1, -1).trim();
  return inner;
}
function mergeModuleFiles(existingCode, newCode, className, options = {}) {
  const project = createProject();
  const existingFile = loadSourceFile(project, existingCode, "existing.ts");
  const newFile = loadSourceFile(project, newCode, "new.ts");
  const changes = [];
  const warnings = [];
  const existingClass = findClass(existingFile, className);
  const newClass = findClass(newFile, className);
  if (!existingClass) {
    return {
      modified: false,
      changes: [],
      code: existingCode,
      warnings: [`Class '${className}' not found in existing file`]
    };
  }
  if (!newClass) {
    return {
      modified: false,
      changes: [],
      code: existingCode,
      warnings: [`Class '${className}' not found in new file`]
    };
  }
  const newImports = newFile.getImportDeclarations();
  for (const imp of newImports) {
    const moduleSpec = imp.getModuleSpecifierValue();
    for (const namedImp of imp.getNamedImports()) {
      if (addNamedImport(existingFile, moduleSpec, namedImp.getName())) {
        changes.push(`Added import: ${namedImp.getName()} from ${moduleSpec}`);
      }
    }
  }
  const newProperties = newClass.getProperties();
  for (const prop of newProperties) {
    const propName = prop.getName();
    const existingProp = findProperty(existingClass, propName);
    if (!existingProp) {
      existingClass.addProperty({
        name: propName,
        isReadonly: prop.isReadonly(),
        type: prop.getType().getText()
      });
      changes.push(`Added property: ${propName}`);
    } else if (!options.preserveExisting) {
      existingProp.remove();
      existingClass.addProperty({
        name: propName,
        isReadonly: prop.isReadonly(),
        type: prop.getType().getText()
      });
      changes.push(`Updated property: ${propName}`);
    } else {
      warnings.push(`Skipped existing property: ${propName}`);
    }
  }
  const newMethods = newClass.getMethods();
  for (const method of newMethods) {
    const methodName = method.getName();
    const existingMethod = findMethod(existingClass, methodName);
    if (!existingMethod) {
      existingClass.addMethod({
        name: methodName,
        isAsync: method.isAsync(),
        parameters: method.getParameters().map((p) => ({
          name: p.getName(),
          type: p.getType().getText(),
          hasQuestionToken: p.hasQuestionToken(),
          initializer: p.getInitializer()?.getText()
        })),
        returnType: method.getReturnType().getText(),
        statements: extractMethodBodyText(method)
      });
      changes.push(`Added method: ${methodName}`);
    } else if (!options.preserveExisting) {
      existingMethod.remove();
      existingClass.addMethod({
        name: methodName,
        isAsync: method.isAsync(),
        parameters: method.getParameters().map((p) => ({
          name: p.getName(),
          type: p.getType().getText(),
          hasQuestionToken: p.hasQuestionToken(),
          initializer: p.getInitializer()?.getText()
        })),
        returnType: method.getReturnType().getText(),
        statements: extractMethodBodyText(method)
      });
      changes.push(`Updated method: ${methodName}`);
    } else {
      warnings.push(`Skipped existing method: ${methodName}`);
    }
  }
  if (options.formatOutput !== false) {
    existingFile.formatText();
  }
  return {
    modified: changes.length > 0,
    changes,
    code: existingFile.getFullText(),
    warnings
  };
}
function extractClassStructure(code, className) {
  const project = createProject();
  const sourceFile = loadSourceFile(project, code);
  const classDecl = findClass(sourceFile, className);
  if (!classDecl) {
    return null;
  }
  return {
    properties: classDecl.getProperties().map((p) => p.getName()),
    methods: classDecl.getMethods().map((m) => m.getName()),
    imports: sourceFile.getImportDeclarations().flatMap((imp) => imp.getNamedImports().map((ni) => ni.getName()))
  };
}
function validateSyntax(code) {
  const project = createProject();
  try {
    const sourceFile = loadSourceFile(project, code);
    const diagnostics = sourceFile.getPreEmitDiagnostics();
    const errors = diagnostics.filter((d) => d.getCategory() === 1).map((d) => d.getMessageText().toString());
    return {
      valid: errors.length === 0,
      errors
    };
  } catch (error) {
    return {
      valid: false,
      errors: [error.message]
    };
  }
}
function loadRegistry(indexPath) {
  if (!existsSync(indexPath)) {
    return null;
  }
  const content = readFileSync(indexPath, "utf-8");
  const entries = parseIndexFile(content);
  return {
    registryPath: indexPath,
    entries,
    lastUpdated: /* @__PURE__ */ new Date()
  };
}
function parseIndexFile(content, _indexPath) {
  const entries = [];
  const project = new Project({ useInMemoryFileSystem: true });
  const sourceFile = project.createSourceFile("index.ts", content);
  const exportDeclarations = sourceFile.getExportDeclarations();
  for (const exportDecl of exportDeclarations) {
    const moduleSpecifier = exportDecl.getModuleSpecifierValue();
    if (!moduleSpecifier) continue;
    const namedExports = exportDecl.getNamedExports();
    for (const namedExport of namedExports) {
      const exportName = namedExport.getName();
      const aliasNode = namedExport.getAliasNode();
      const alias = aliasNode ? aliasNode.getText() : exportName;
      let exportType = "class";
      if (exportName.startsWith("create") || exportName.endsWith("Factory")) {
        exportType = "function";
      } else if (exportName === exportName.toUpperCase()) {
        exportType = "const";
      }
      entries.push({
        moduleName: alias,
        className: exportName,
        filePath: moduleSpecifier,
        scope: extractScope(moduleSpecifier),
        exportType
      });
    }
  }
  const starExports = content.match(/export\s+\*\s+from\s+['"]([^'"]+)['"]/g);
  if (starExports) {
    for (const match of starExports) {
      const pathMatch = match.match(/['"]([^'"]+)['"]/);
      if (pathMatch) {
        const modulePath = pathMatch[1];
        entries.push({
          moduleName: extractModuleName(modulePath),
          className: "*",
          filePath: modulePath,
          scope: extractScope(modulePath),
          exportType: "class"
        });
      }
    }
  }
  return entries;
}
function extractModuleName(filePath) {
  const base = basename(filePath, ".js").replace(".page", "");
  return toPascalCase2(base);
}
function extractScope(filePath) {
  const dir = dirname(filePath);
  if (dir === "." || dir === "./") {
    return basename(filePath, ".js").replace(".page", "");
  }
  return basename(dir);
}
function toPascalCase2(str) {
  return str.split(/[-_\s]+/).map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join("");
}
function generateIndexContent(entries, options = {}) {
  const lines = [
    "/**",
    " * Module Registry - Auto-generated index",
    " * @generated by @artk/core-autogen",
    " */"
  ];
  const byFile = /* @__PURE__ */ new Map();
  for (const entry of entries) {
    const existing = byFile.get(entry.filePath) || [];
    existing.push(entry);
    byFile.set(entry.filePath, existing);
  }
  let filePaths = Array.from(byFile.keys());
  if (options.sortExports) {
    filePaths = filePaths.sort();
  }
  for (const filePath of filePaths) {
    const fileEntries = byFile.get(filePath);
    if (fileEntries.length === 1 && fileEntries[0].className === "*") {
      lines.push(`export * from '${filePath}';`);
    } else {
      const exports$1 = fileEntries.map((e) => {
        if (e.moduleName !== e.className) {
          return `${e.className} as ${e.moduleName}`;
        }
        return e.className;
      });
      if (options.sortExports) {
        exports$1.sort();
      }
      lines.push(`export { ${exports$1.join(", ")} } from '${filePath}';`);
    }
  }
  return lines.join("\n") + "\n";
}
function addToRegistry(registry, module, filePath) {
  const entry = {
    moduleName: module.moduleName,
    className: module.className,
    filePath,
    scope: module.scope,
    exportType: "class"
  };
  const existingIndex = registry.entries.findIndex(
    (e) => e.filePath === filePath || e.moduleName === module.moduleName
  );
  if (existingIndex >= 0) {
    registry.entries[existingIndex] = entry;
  } else {
    registry.entries.push(entry);
  }
  registry.lastUpdated = /* @__PURE__ */ new Date();
  return entry;
}
function removeFromRegistry(registry, moduleNameOrPath) {
  const initialLength = registry.entries.length;
  registry.entries = registry.entries.filter(
    (e) => e.moduleName !== moduleNameOrPath && e.filePath !== moduleNameOrPath
  );
  const removed = registry.entries.length < initialLength;
  if (removed) {
    registry.lastUpdated = /* @__PURE__ */ new Date();
  }
  return removed;
}
function updateIndexFile(indexPath, newModules, options = {}) {
  let registry = loadRegistry(indexPath);
  const added = [];
  const removed = [];
  if (!registry) {
    if (!options.createIfMissing) {
      return {
        modified: false,
        added: [],
        removed: [],
        content: ""
      };
    }
    registry = {
      registryPath: indexPath,
      entries: [],
      lastUpdated: /* @__PURE__ */ new Date()
    };
  }
  const existingNames = new Set(registry.entries.map((e) => e.moduleName));
  for (const { module, filePath } of newModules) {
    const relativePath = filePath.startsWith(".") ? filePath : `./${relative(dirname(indexPath), filePath).replace(/\\/g, "/")}`;
    const importPath = relativePath.replace(/\.ts$/, ".js");
    addToRegistry(registry, module, importPath);
    if (!existingNames.has(module.moduleName)) {
      added.push(module.moduleName);
    }
  }
  const content = generateIndexContent(registry.entries, options);
  return {
    modified: added.length > 0 || removed.length > 0,
    added,
    removed,
    content
  };
}
function scanModulesDirectory(_dirPath, _pattern = "*.page.ts") {
  return [];
}
function createRegistry(indexPath) {
  return {
    registryPath: indexPath,
    entries: [],
    lastUpdated: /* @__PURE__ */ new Date()
  };
}
function saveRegistry(registry, options = {}) {
  const content = generateIndexContent(registry.entries, options);
  writeFileSync(registry.registryPath, content, "utf-8");
}
function findEntry(registry, moduleName) {
  return registry.entries.find((e) => e.moduleName === moduleName);
}
function findEntriesByScope(registry, scope) {
  return registry.entries.filter((e) => e.scope === scope);
}
function hasModule(registry, moduleName) {
  return registry.entries.some((e) => e.moduleName === moduleName);
}
function getModuleNames(registry) {
  return registry.entries.map((e) => e.moduleName);
}
function getRegistryStats(registry) {
  const byScope = {};
  const byType = {};
  for (const entry of registry.entries) {
    byScope[entry.scope] = (byScope[entry.scope] || 0) + 1;
    byType[entry.exportType] = (byType[entry.exportType] || 0) + 1;
  }
  return {
    totalModules: registry.entries.length,
    byScope,
    byType
  };
}

// src/utils/parsing.ts
function parseIntSafe(value, name, defaultValue) {
  if (value === void 0) {
    return defaultValue;
  }
  const trimmed = value.trim();
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || trimmed === "") {
    console.warn(
      `Warning: Invalid value '${value}' for --${name}, using default: ${defaultValue}`
    );
    return defaultValue;
  }
  if (parsed < 0) {
    console.warn(
      `Warning: Negative value '${value}' for --${name}, using default: ${defaultValue}`
    );
    return defaultValue;
  }
  return parsed;
}
function parseIntSafeAllowNegative(value, name, defaultValue) {
  if (value === void 0) {
    return defaultValue;
  }
  const trimmed = value.trim();
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || trimmed === "") {
    console.warn(
      `Warning: Invalid value '${value}' for --${name}, using default: ${defaultValue}`
    );
    return defaultValue;
  }
  return parsed;
}
function parseFloatSafe(value, name, defaultValue) {
  if (value === void 0) {
    return defaultValue;
  }
  const trimmed = value.trim();
  const parsed = Number(trimmed);
  if (isNaN(parsed) || trimmed === "") {
    console.warn(
      `Warning: Invalid value '${value}' for --${name}, using default: ${defaultValue}`
    );
    return defaultValue;
  }
  if (parsed < 0) {
    console.warn(
      `Warning: Negative value '${value}' for --${name}, using default: ${defaultValue}`
    );
    return defaultValue;
  }
  return parsed;
}
function parseBoolSafe(value, defaultValue) {
  if (value === void 0) {
    return defaultValue;
  }
  const normalized = value.toLowerCase().trim();
  if (["true", "yes", "1", "on"].includes(normalized)) {
    return true;
  }
  if (["false", "no", "0", "off"].includes(normalized)) {
    return false;
  }
  return defaultValue;
}
function parseEnumSafe(value, validValues, name, defaultValue) {
  if (value === void 0) {
    return defaultValue;
  }
  const trimmed = value.trim();
  const match = validValues.find(
    (v) => v.toLowerCase() === trimmed.toLowerCase()
  );
  if (match !== void 0) {
    return match;
  }
  console.warn(
    `Warning: Invalid value '${value}' for --${name}, valid values are: ${validValues.join(", ")}. Using default: ${defaultValue}`
  );
  return defaultValue;
}
function parseWithValidator(value, parser, validator, name, defaultValue) {
  if (value === void 0) {
    return defaultValue;
  }
  try {
    const parsed = parser(value);
    if (validator(parsed)) {
      return parsed;
    }
    console.warn(
      `Warning: Invalid value '${value}' for --${name}, using default`
    );
    return defaultValue;
  } catch {
    console.warn(
      `Warning: Failed to parse '${value}' for --${name}, using default`
    );
    return defaultValue;
  }
}

// src/validate/journey.ts
var DEFAULT_OPTIONS = {
  allowDrafts: false,
  requiredTags: [],
  validTiers: ["smoke", "release", "regression"],
  warnEmptyAC: true
};
function validateJourneySchema(frontmatter) {
  const result = JourneyFrontmatterSchema.safeParse(frontmatter);
  const issues = [];
  if (!result.success) {
    for (const error of result.error.errors) {
      issues.push({
        code: "SCHEMA_INVALID",
        message: `${error.path.join(".")}: ${error.message}`,
        severity: "error",
        field: error.path.join(".")
      });
    }
  }
  return { valid: result.success, issues };
}
function validateJourneyStatus(status, options = {}) {
  const { allowDrafts = false } = options;
  const issues = [];
  const validStatuses = ["clarified", "implemented"];
  if (!validStatuses.includes(status)) {
    if (allowDrafts) {
      issues.push({
        code: "STATUS_NOT_READY",
        message: `Journey status is '${status}', ideally should be 'clarified' for code generation`,
        severity: "warning",
        field: "status",
        suggestion: "Run /journey-clarify to add execution details"
      });
    } else {
      issues.push({
        code: "STATUS_NOT_CLARIFIED",
        message: `Journey status is '${status}', must be 'clarified' for code generation`,
        severity: "error",
        field: "status",
        suggestion: "Run /journey-clarify to add execution details"
      });
    }
  }
  if (status === "quarantined") {
    issues.push({
      code: "STATUS_QUARANTINED",
      message: "Journey is quarantined - tests are disabled",
      severity: "warning",
      field: "status"
    });
  }
  if (status === "deprecated") {
    issues.push({
      code: "STATUS_DEPRECATED",
      message: "Journey is deprecated - consider removing",
      severity: "warning",
      field: "status"
    });
  }
  return issues;
}
function validateJourneyTier(tier, options = {}) {
  const { validTiers = ["smoke", "release", "regression"] } = options;
  const issues = [];
  if (!validTiers.includes(tier)) {
    issues.push({
      code: "TIER_INVALID",
      message: `Invalid tier '${tier}', expected one of: ${validTiers.join(", ")}`,
      severity: "error",
      field: "tier"
    });
  }
  return issues;
}
function validateJourneyTags(tags, journeyId, options = {}) {
  const { requiredTags = [] } = options;
  const issues = [];
  const idTag = `@${journeyId}`;
  if (!tags.includes(idTag)) {
    issues.push({
      code: "TAG_MISSING_ID",
      message: `Journey should have ID tag '${idTag}'`,
      severity: "warning",
      field: "tags",
      suggestion: `Add '${idTag}' to tags array`
    });
  }
  for (const requiredTag of requiredTags) {
    if (!tags.includes(requiredTag)) {
      issues.push({
        code: "TAG_MISSING_REQUIRED",
        message: `Missing required tag '${requiredTag}'`,
        severity: "error",
        field: "tags",
        suggestion: `Add '${requiredTag}' to tags array`
      });
    }
  }
  return issues;
}
function validateJourneyFrontmatter(frontmatter, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const issues = [];
  const schemaResult = validateJourneySchema(frontmatter);
  issues.push(...schemaResult.issues);
  issues.push(...validateJourneyStatus(frontmatter.status, opts));
  issues.push(...validateJourneyTier(frontmatter.tier, opts));
  issues.push(...validateJourneyTags(frontmatter.tags || [], frontmatter.id, opts));
  if (!frontmatter.actor) {
    issues.push({
      code: "ACTOR_MISSING",
      message: "Journey should specify an actor (user role)",
      severity: "warning",
      field: "actor"
    });
  }
  if (!frontmatter.scope) {
    issues.push({
      code: "SCOPE_MISSING",
      message: "Journey should specify a scope (feature area)",
      severity: "warning",
      field: "scope"
    });
  }
  const counts = {
    errors: issues.filter((i) => i.severity === "error").length,
    warnings: issues.filter((i) => i.severity === "warning").length,
    info: issues.filter((i) => i.severity === "info").length
  };
  return {
    valid: counts.errors === 0,
    journeyId: frontmatter.id,
    issues,
    counts
  };
}
function isJourneyReady(frontmatter) {
  const result = validateJourneyFrontmatter(frontmatter, { allowDrafts: false });
  return result.valid;
}

// src/validate/patterns.ts
var FORBIDDEN_PATTERNS = [
  {
    id: "WAIT_TIMEOUT",
    name: "waitForTimeout",
    regex: /\bpage\.waitForTimeout\s*\(\s*\d+\s*\)/g,
    severity: "error",
    reason: "Hard-coded waits cause flakiness and slow down tests",
    suggestion: "Use waitForSelector, waitForLoadState, or assertion auto-wait"
  },
  {
    id: "WAIT_ARBITRARY",
    name: "arbitrary-wait",
    regex: /\bawait\s+new\s+Promise\s*\(\s*(?:resolve|r)\s*=>\s*setTimeout/g,
    severity: "error",
    reason: "Custom setTimeout-based waits cause flakiness",
    suggestion: "Use Playwright auto-wait assertions instead"
  },
  {
    id: "FORCE_CLICK",
    name: "force-click",
    regex: /\.click\s*\([^)]*\{\s*force\s*:\s*true/g,
    severity: "warning",
    reason: "Force clicking bypasses visibility checks and masks issues",
    suggestion: "Ensure element is visible and actionable, or use scrollIntoView"
  },
  {
    id: "FORCE_FILL",
    name: "force-fill",
    regex: /\.fill\s*\(\s*[^,]+,\s*\{\s*force\s*:\s*true/g,
    severity: "warning",
    reason: "Force filling bypasses visibility checks",
    suggestion: "Ensure input is visible and enabled"
  },
  {
    id: "CSS_SELECTOR_CLASS",
    name: "css-class-selector",
    regex: /(?:page|locator)\s*\.\s*(?:locator|querySelector)\s*\(\s*['"][^'"]*\.[a-z][a-z0-9_-]*(?:\s|['">\[])/gi,
    severity: "warning",
    reason: "CSS class selectors are fragile and may change",
    suggestion: "Use role, label, placeholder, text, or testid locators"
  },
  {
    id: "CSS_SELECTOR_TAG",
    name: "css-tag-selector",
    regex: /(?:page|locator)\s*\.\s*locator\s*\(\s*['"](?:div|span|p|h[1-6]|section|header|footer|main|nav|aside|article)(?:\s*>|\s*\[|['"])/gi,
    severity: "warning",
    reason: "Generic tag selectors are too broad and fragile",
    suggestion: "Use more specific selectors like role, label, or testid"
  },
  {
    id: "XPATH_SELECTOR",
    name: "xpath-selector",
    regex: /(?:page|locator)\s*\.\s*locator\s*\(\s*['"]\/\/[^'"]+['"]/g,
    severity: "warning",
    reason: "XPath selectors are verbose and often fragile",
    suggestion: "Use role, label, or testid locators instead"
  },
  {
    id: "NTH_CHILD",
    name: "nth-child-selector",
    regex: /:nth-child\s*\(\s*\d+\s*\)/g,
    severity: "warning",
    reason: "nth-child selectors break when DOM order changes",
    suggestion: "Use unique identifiers like testid or text content"
  },
  {
    id: "INDEX_LOCATOR",
    name: "index-based-locator",
    regex: /\.(?:first|last|nth)\s*\(\s*(?:\d+)?\s*\)/g,
    severity: "info",
    reason: "Index-based locators may break when list order changes",
    suggestion: "Consider filtering by unique content or attributes"
  },
  {
    id: "HARDCODED_URL",
    name: "hardcoded-url",
    regex: /\bpage\.goto\s*\(\s*['"]https?:\/\/[^'"]+['"]/g,
    severity: "warning",
    reason: "Hardcoded URLs make tests environment-specific",
    suggestion: "Use baseURL from config or relative paths"
  },
  {
    id: "HARDCODED_CREDENTIALS",
    name: "hardcoded-credentials",
    regex: /(?:password|secret|apikey|api_key|token)\s*[=:]\s*['"][^'"]+['"]/gi,
    severity: "error",
    reason: "Credentials should not be hardcoded in test files",
    suggestion: "Use environment variables or secure config"
  },
  {
    id: "CONSOLE_LOG",
    name: "console-log",
    regex: /\bconsole\.(log|info|warn|error)\s*\(/g,
    severity: "info",
    reason: "Console statements should be removed from production tests",
    suggestion: "Use test reporter or remove debug statements"
  },
  {
    id: "MISSING_AWAIT",
    name: "missing-await-locator",
    regex: /(?<!await\s+)page\.(?:click|fill|type|check|uncheck|selectOption|press|hover|focus)\s*\(/g,
    severity: "error",
    reason: "Playwright actions must be awaited",
    suggestion: "Add await before the action"
  },
  {
    id: "SKIP_TEST",
    name: "test-skip",
    regex: /\btest\.skip\s*\(/g,
    severity: "info",
    reason: "Skipped tests may be forgotten",
    suggestion: "Remove skip or convert to fixme with issue link"
  },
  {
    id: "TEST_ONLY",
    name: "test-only",
    regex: /\btest\.only\s*\(/g,
    severity: "error",
    reason: "test.only excludes all other tests",
    suggestion: "Remove .only before committing"
  },
  {
    id: "ELEMENT_HANDLE",
    name: "element-handle",
    regex: /\.\$\s*\(|\.\$\$\s*\(/g,
    severity: "warning",
    reason: "ElementHandle is deprecated, use locators instead",
    suggestion: "Use page.locator() instead of page.$() or page.$$()"
  },
  {
    id: "EVAL_SELECTOR",
    name: "eval-selector",
    regex: /\.\$eval\s*\(|\.\$\$eval\s*\(/g,
    severity: "warning",
    reason: "eval methods are fragile and hard to debug",
    suggestion: "Use locator methods like textContent(), getAttribute()"
  },
  {
    id: "SLEEP_IMPORT",
    name: "sleep-import",
    regex: /import\s*\{[^}]*sleep[^}]*\}|require\s*\(['"'][^'"]*sleep/gi,
    severity: "warning",
    reason: "Sleep utilities encourage flaky tests",
    suggestion: "Use Playwright auto-wait mechanisms"
  }
];
function scanForbiddenPatterns(code, patterns = FORBIDDEN_PATTERNS) {
  const results = [];
  const lines = code.split("\n");
  for (const pattern of patterns) {
    pattern.regex.lastIndex = 0;
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      let match;
      const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
      while ((match = regex.exec(line)) !== null) {
        results.push({
          line: lineIndex + 1,
          column: match.index + 1,
          match: match[0],
          lineContent: line.trim(),
          pattern
        });
        if (match.index === regex.lastIndex) {
          regex.lastIndex++;
        }
      }
    }
  }
  results.sort((a, b) => a.line - b.line || a.column - b.column);
  return results;
}
function scanResultsToIssues(results) {
  return results.map((result) => ({
    code: result.pattern.id,
    message: `Line ${result.line}: ${result.pattern.name} - ${result.pattern.reason}`,
    severity: result.pattern.severity,
    suggestion: result.pattern.suggestion
  }));
}
function getPatternStats2(results) {
  const stats = {};
  for (const result of results) {
    stats[result.pattern.id] = (stats[result.pattern.id] || 0) + 1;
  }
  return stats;
}
function hasErrorViolations(results) {
  return results.some((r) => r.pattern.severity === "error");
}
function filterBySeverity(results, severity) {
  return results.filter((r) => r.pattern.severity === severity);
}
function getViolationSummary(results) {
  return {
    total: results.length,
    errors: filterBySeverity(results, "error").length,
    warnings: filterBySeverity(results, "warning").length,
    info: filterBySeverity(results, "info").length,
    byPattern: getPatternStats2(results)
  };
}
var PLAYWRIGHT_LINT_RULES = {
  // Playwright plugin rules
  "playwright/missing-playwright-await": "error",
  "playwright/no-conditional-in-test": "warn",
  "playwright/no-element-handle": "error",
  "playwright/no-eval": "error",
  "playwright/no-focused-test": "error",
  "playwright/no-force-option": "warn",
  "playwright/no-nested-step": "warn",
  "playwright/no-networkidle": "warn",
  "playwright/no-page-pause": "error",
  "playwright/no-skipped-test": "warn",
  "playwright/no-useless-await": "warn",
  "playwright/no-useless-not": "warn",
  "playwright/no-wait-for-timeout": "error",
  "playwright/prefer-lowercase-title": "off",
  "playwright/prefer-strict-equal": "warn",
  "playwright/prefer-to-be": "warn",
  "playwright/prefer-to-contain": "warn",
  "playwright/prefer-to-have-count": "warn",
  "playwright/prefer-to-have-length": "warn",
  "playwright/prefer-web-first-assertions": "error",
  "playwright/require-soft-assertions": "off",
  "playwright/valid-describe-callback": "error",
  "playwright/valid-expect": "error",
  "playwright/valid-expect-in-promise": "error",
  "playwright/valid-title": "warn"
};
function generateESLintConfig(rules = PLAYWRIGHT_LINT_RULES) {
  return `import playwright from 'eslint-plugin-playwright';

export default [
  {
    files: ['**/*.spec.ts', '**/*.test.ts'],
    plugins: {
      playwright,
    },
    rules: ${JSON.stringify(rules, null, 2)},
  },
];
`;
}
function isESLintAvailable(cwd) {
  try {
    execSync("npx eslint --version", {
      cwd,
      stdio: "pipe",
      encoding: "utf-8"
    });
    return true;
  } catch {
    return false;
  }
}
function isPlaywrightPluginAvailable(cwd) {
  try {
    const result = execSync("npm list eslint-plugin-playwright", {
      cwd,
      stdio: "pipe",
      encoding: "utf-8"
    });
    return result.includes("eslint-plugin-playwright");
  } catch {
    return false;
  }
}
function convertSeverity(eslintSeverity) {
  return eslintSeverity === 2 ? "error" : "warning";
}
function parseESLintOutput(output) {
  try {
    const results = JSON.parse(output);
    const issues = [];
    for (const file of results) {
      for (const msg of file.messages) {
        issues.push({
          code: msg.ruleId || "ESLINT_ERROR",
          message: `Line ${msg.line}:${msg.column} - ${msg.message}`,
          severity: convertSeverity(msg.severity),
          suggestion: msg.fix ? "Auto-fixable with --fix" : void 0
        });
      }
    }
    return issues;
  } catch {
    return [
      {
        code: "ESLINT_PARSE_ERROR",
        message: "Failed to parse ESLint output",
        severity: "error"
      }
    ];
  }
}
async function lintCode(code, filename = "test.spec.ts", options = {}) {
  const { cwd = process.cwd(), fix = false, configPath } = options;
  if (!isESLintAvailable(cwd)) {
    return {
      passed: true,
      output: "ESLint not available - skipping lint check",
      issues: [
        {
          code: "ESLINT_NOT_AVAILABLE",
          message: "ESLint is not installed",
          severity: "info",
          suggestion: "Run npm install eslint eslint-plugin-playwright"
        }
      ],
      errorCount: 0,
      warningCount: 0
    };
  }
  const tempDir = join(tmpdir(), "autogen-lint");
  mkdirSync(tempDir, { recursive: true });
  const tempFile = join(tempDir, filename);
  try {
    writeFileSync(tempFile, code, "utf-8");
    const args = ["eslint", "--format", "json"];
    if (fix) {
      args.push("--fix");
    }
    if (configPath && existsSync(configPath)) {
      args.push("--config", configPath);
    }
    args.push(tempFile);
    const result = execSync(`npx ${args.join(" ")}`, {
      cwd,
      stdio: "pipe",
      encoding: "utf-8"
    });
    return {
      passed: true,
      output: result,
      issues: parseESLintOutput(result),
      errorCount: 0,
      warningCount: 0
    };
  } catch (err2) {
    const error = err2;
    const output = error.stdout || "";
    try {
      const results = JSON.parse(output);
      const issues = parseESLintOutput(output);
      let errorCount = 0;
      let warningCount = 0;
      for (const file of results) {
        errorCount += file.errorCount;
        warningCount += file.warningCount;
      }
      return {
        passed: errorCount === 0,
        output,
        issues,
        errorCount,
        warningCount
      };
    } catch {
      return {
        passed: false,
        output: output || "ESLint execution failed",
        issues: [
          {
            code: "ESLINT_EXECUTION_ERROR",
            message: "ESLint execution failed",
            severity: "error"
          }
        ],
        errorCount: 1,
        warningCount: 0
      };
    }
  } finally {
    try {
      unlinkSync(tempFile);
    } catch {
    }
  }
}
async function lintFile(filePath, options = {}) {
  const { cwd = dirname(filePath), fix = false, configPath } = options;
  if (!existsSync(filePath)) {
    return {
      passed: false,
      output: `File not found: ${filePath}`,
      issues: [
        {
          code: "FILE_NOT_FOUND",
          message: `File not found: ${filePath}`,
          severity: "error"
        }
      ],
      errorCount: 1,
      warningCount: 0
    };
  }
  if (!isESLintAvailable(cwd)) {
    return {
      passed: true,
      output: "ESLint not available - skipping lint check",
      issues: [],
      errorCount: 0,
      warningCount: 0
    };
  }
  try {
    const args = ["eslint", "--format", "json"];
    if (fix) {
      args.push("--fix");
    }
    if (configPath && existsSync(configPath)) {
      args.push("--config", configPath);
    }
    args.push(filePath);
    const result = execSync(`npx ${args.join(" ")}`, {
      cwd,
      stdio: "pipe",
      encoding: "utf-8"
    });
    return {
      passed: true,
      output: result,
      issues: parseESLintOutput(result),
      errorCount: 0,
      warningCount: 0
    };
  } catch (err2) {
    const error = err2;
    const output = error.stdout || "";
    const issues = parseESLintOutput(output);
    return {
      passed: issues.filter((i) => i.severity === "error").length === 0,
      output,
      issues,
      errorCount: issues.filter((i) => i.severity === "error").length,
      warningCount: issues.filter((i) => i.severity === "warning").length
    };
  }
}
function hasLintErrors(code) {
  const patterns = [
    /test\.only\s*\(/g,
    /\.waitForTimeout\s*\(/g,
    /page\.pause\s*\(/g
  ];
  for (const pattern of patterns) {
    if (pattern.test(code)) {
      return true;
    }
  }
  return false;
}

// src/validate/tags.ts
var TAG_PATTERNS = {
  journeyId: /^@JRN-\d{4}$/,
  tier: /^@tier-(smoke|release|regression)$/,
  scope: /^@scope-[a-z][a-z0-9-]*$/,
  actor: /^@actor-[a-z][a-z0-9-]*$/,
  custom: /^@[a-z][a-z0-9-]*$/
};
var DEFAULT_OPTIONS2 = {
  requireJourneyId: true,
  requireTier: true,
  requireScope: true,
  requireActor: false,
  requiredTags: [],
  forbiddenTags: [],
  maxTags: 10
};
function parseTagsFromCode(code) {
  const tagArrayMatch = code.match(/tag:\s*\[([^\]]*)\]/);
  if (!tagArrayMatch) {
    return [];
  }
  const tagArrayContent = tagArrayMatch[1];
  const tagMatches = tagArrayContent.match(/'[^']+'/g) || [];
  return tagMatches.map((t) => t.replace(/'/g, ""));
}
function parseTagsFromFrontmatter(tags) {
  return tags.map((t) => {
    const cleaned = t.replace(/^['"]|['"]$/g, "");
    return cleaned.startsWith("@") ? cleaned : `@${cleaned}`;
  });
}
function categorizeTags(tags) {
  const result = { custom: [] };
  for (const tag of tags) {
    if (TAG_PATTERNS.journeyId.test(tag)) {
      result.journeyId = tag;
    } else if (TAG_PATTERNS.tier.test(tag)) {
      result.tier = tag;
    } else if (TAG_PATTERNS.scope.test(tag)) {
      result.scope = tag;
    } else if (TAG_PATTERNS.actor.test(tag)) {
      result.actor = tag;
    } else if (TAG_PATTERNS.custom.test(tag)) {
      result.custom.push(tag);
    }
  }
  return result;
}
function validateTags(tags, journeyId, tier, scope, options = {}) {
  const opts = { ...DEFAULT_OPTIONS2, ...options };
  const issues = [];
  const parsedTags = categorizeTags(tags);
  if (opts.requireJourneyId) {
    const expectedIdTag = `@${journeyId}`;
    if (!tags.includes(expectedIdTag) && parsedTags.journeyId !== expectedIdTag) {
      issues.push({
        code: "TAG_MISSING_JOURNEY_ID",
        message: `Missing journey ID tag '${expectedIdTag}'`,
        severity: "error",
        field: "tags",
        suggestion: `Add '${expectedIdTag}' to the tags array`
      });
    }
  }
  if (opts.requireTier) {
    const expectedTierTag = `@tier-${tier}`;
    if (!tags.includes(expectedTierTag) && parsedTags.tier !== expectedTierTag) {
      if (!parsedTags.tier) {
        issues.push({
          code: "TAG_MISSING_TIER",
          message: `Missing tier tag, expected '${expectedTierTag}'`,
          severity: "warning",
          field: "tags",
          suggestion: `Add '${expectedTierTag}' to the tags array`
        });
      } else if (parsedTags.tier !== expectedTierTag) {
        issues.push({
          code: "TAG_TIER_MISMATCH",
          message: `Tier tag '${parsedTags.tier}' does not match journey tier '${tier}'`,
          severity: "warning",
          field: "tags",
          suggestion: `Change to '${expectedTierTag}' or update journey tier`
        });
      }
    }
  }
  if (opts.requireScope) {
    const expectedScopeTag = `@scope-${scope}`;
    if (!tags.includes(expectedScopeTag) && parsedTags.scope !== expectedScopeTag) {
      if (!parsedTags.scope) {
        issues.push({
          code: "TAG_MISSING_SCOPE",
          message: `Missing scope tag, expected '${expectedScopeTag}'`,
          severity: "warning",
          field: "tags",
          suggestion: `Add '${expectedScopeTag}' to the tags array`
        });
      } else if (parsedTags.scope !== expectedScopeTag) {
        issues.push({
          code: "TAG_SCOPE_MISMATCH",
          message: `Scope tag '${parsedTags.scope}' does not match journey scope '${scope}'`,
          severity: "warning",
          field: "tags",
          suggestion: `Change to '${expectedScopeTag}' or update journey scope`
        });
      }
    }
  }
  for (const requiredTag of opts.requiredTags || []) {
    if (!tags.includes(requiredTag)) {
      issues.push({
        code: "TAG_MISSING_REQUIRED",
        message: `Missing required tag '${requiredTag}'`,
        severity: "error",
        field: "tags",
        suggestion: `Add '${requiredTag}' to the tags array`
      });
    }
  }
  for (const forbiddenTag of opts.forbiddenTags || []) {
    if (tags.includes(forbiddenTag)) {
      issues.push({
        code: "TAG_FORBIDDEN",
        message: `Forbidden tag '${forbiddenTag}' should not be used`,
        severity: "error",
        field: "tags",
        suggestion: `Remove '${forbiddenTag}' from the tags array`
      });
    }
  }
  if (opts.maxTags && tags.length > opts.maxTags) {
    issues.push({
      code: "TAG_TOO_MANY",
      message: `Too many tags (${tags.length}), maximum is ${opts.maxTags}`,
      severity: "warning",
      field: "tags",
      suggestion: "Remove unnecessary tags"
    });
  }
  for (const tag of tags) {
    if (!TAG_PATTERNS.custom.test(tag)) {
      issues.push({
        code: "TAG_INVALID_FORMAT",
        message: `Invalid tag format '${tag}', tags should start with @ followed by lowercase letters`,
        severity: "warning",
        field: "tags",
        suggestion: `Rename to a valid format like '@${tag.replace(/[^a-z0-9-]/gi, "-").toLowerCase()}'`
      });
    }
  }
  const duplicates = tags.filter((tag, index) => tags.indexOf(tag) !== index);
  for (const duplicate of new Set(duplicates)) {
    issues.push({
      code: "TAG_DUPLICATE",
      message: `Duplicate tag '${duplicate}'`,
      severity: "warning",
      field: "tags",
      suggestion: "Remove duplicate tags"
    });
  }
  return {
    valid: issues.filter((i) => i.severity === "error").length === 0,
    issues,
    parsedTags
  };
}
function generateExpectedTags(journeyId, tier, scope, additionalTags = []) {
  return [
    `@${journeyId}`,
    `@tier-${tier}`,
    `@scope-${scope}`,
    ...additionalTags
  ];
}
function validateTagsInCode(code, journeyId, tier, scope, options = {}) {
  const tags = parseTagsFromCode(code);
  return validateTags(tags, journeyId, tier, scope, options);
}

// src/validate/coverage.ts
var DEFAULT_OPTIONS3 = {
  minCoverage: 80,
  warnPartialCoverage: true,
  maxBlockedSteps: 2
};
function findTestSteps(code) {
  const steps = [];
  const stepRegex = /test\.step\s*\(\s*['"]([^:]+):\s*([^'"]+)['"]/g;
  let match;
  while ((match = stepRegex.exec(code)) !== null) {
    steps.push({
      id: match[1].trim(),
      description: match[2].trim()
    });
  }
  return steps;
}
function findACReferences(code) {
  const references = [];
  const acRegex = /\/\/\s*(AC-\d+)|['"]?(AC-\d+)['"]?/g;
  let match;
  while ((match = acRegex.exec(code)) !== null) {
    const acId = match[1] || match[2];
    if (acId && !references.includes(acId)) {
      references.push(acId);
    }
  }
  return references;
}
function calculateStepCoverage(step) {
  const totalSteps = step.actions.length + step.assertions.length;
  const blockedSteps = step.actions.filter((a) => a.type === "blocked").length;
  const mappedSteps = totalSteps - blockedSteps;
  const unmappedSteps = [];
  for (const action of step.actions) {
    if (action.type === "blocked" && action.sourceText) {
      unmappedSteps.push(action.sourceText);
    }
  }
  return {
    acId: step.id,
    acTitle: step.description,
    hasCoverage: mappedSteps > 0,
    mappedSteps,
    blockedSteps,
    coveragePercent: totalSteps > 0 ? mappedSteps / totalSteps * 100 : 100,
    unmappedSteps
  };
}
function validateIRCoverage(journey, options = {}) {
  const opts = { ...DEFAULT_OPTIONS3, ...options };
  const issues = [];
  const perAC = [];
  for (const step of journey.steps) {
    const coverage = calculateStepCoverage(step);
    perAC.push(coverage);
    if (!coverage.hasCoverage) {
      issues.push({
        code: "AC_NO_COVERAGE",
        message: `${step.id} has no mapped test steps`,
        severity: "error",
        field: step.id,
        suggestion: "Clarify the AC steps or add supported patterns"
      });
    } else if (coverage.coveragePercent < (opts.minCoverage || 80)) {
      if (opts.warnPartialCoverage) {
        issues.push({
          code: "AC_PARTIAL_COVERAGE",
          message: `${step.id} has only ${Math.round(coverage.coveragePercent)}% coverage (${coverage.mappedSteps}/${coverage.mappedSteps + coverage.blockedSteps} steps)`,
          severity: "warning",
          field: step.id,
          suggestion: `Unmapped steps: ${coverage.unmappedSteps.join(", ")}`
        });
      }
    }
    if (opts.maxBlockedSteps && coverage.blockedSteps > opts.maxBlockedSteps) {
      issues.push({
        code: "AC_TOO_MANY_BLOCKED",
        message: `${step.id} has ${coverage.blockedSteps} blocked steps (max: ${opts.maxBlockedSteps})`,
        severity: "warning",
        field: step.id,
        suggestion: "Consider clarifying these steps or marking the journey as needing manual implementation"
      });
    }
  }
  const totalACs = perAC.length;
  const coveredACs = perAC.filter((ac) => ac.hasCoverage).length;
  const overallCoverage = totalACs > 0 ? coveredACs / totalACs * 100 : 100;
  if (totalACs > 0 && overallCoverage < (opts.minCoverage || 80)) {
    issues.push({
      code: "JOURNEY_LOW_COVERAGE",
      message: `Journey has only ${Math.round(overallCoverage)}% AC coverage (${coveredACs}/${totalACs} ACs)`,
      severity: overallCoverage < 50 ? "error" : "warning",
      suggestion: "Review and clarify uncovered acceptance criteria"
    });
  }
  return {
    fullCoverage: coveredACs === totalACs && issues.filter((i) => i.severity === "error").length === 0,
    totalACs,
    coveredACs,
    overallCoverage,
    perAC,
    issues
  };
}
function validateCodeCoverage(code, acceptanceCriteria, _options = {}) {
  const issues = [];
  const perAC = [];
  const testSteps = findTestSteps(code);
  const stepIds = testSteps.map((s) => s.id);
  for (const ac of acceptanceCriteria) {
    const hasCoverage = stepIds.includes(ac.id);
    perAC.push({
      acId: ac.id,
      acTitle: ac.title,
      hasCoverage,
      mappedSteps: hasCoverage ? ac.steps.length : 0,
      blockedSteps: hasCoverage ? 0 : ac.steps.length,
      coveragePercent: hasCoverage ? 100 : 0,
      unmappedSteps: hasCoverage ? [] : ac.steps
    });
    if (!hasCoverage) {
      issues.push({
        code: "AC_NOT_IN_CODE",
        message: `${ac.id}: ${ac.title} is not covered in generated test`,
        severity: "error",
        field: ac.id,
        suggestion: "Regenerate the test or add manual test.step"
      });
    }
  }
  for (const step of testSteps) {
    if (!acceptanceCriteria.find((ac) => ac.id === step.id)) {
      issues.push({
        code: "ORPHAN_TEST_STEP",
        message: `test.step '${step.id}' does not match any acceptance criterion`,
        severity: "warning",
        suggestion: "Remove orphan step or add corresponding AC"
      });
    }
  }
  const totalACs = perAC.length;
  const coveredACs = perAC.filter((ac) => ac.hasCoverage).length;
  const overallCoverage = totalACs > 0 ? coveredACs / totalACs * 100 : 100;
  return {
    fullCoverage: coveredACs === totalACs,
    totalACs,
    coveredACs,
    overallCoverage,
    perAC,
    issues
  };
}
function generateCoverageReport(result) {
  const lines = [];
  lines.push("# AC Coverage Report");
  lines.push("");
  lines.push(`**Overall Coverage**: ${Math.round(result.overallCoverage)}% (${result.coveredACs}/${result.totalACs} ACs)`);
  lines.push("");
  if (result.fullCoverage) {
    lines.push("\u2705 All acceptance criteria are covered");
  } else {
    lines.push("\u26A0\uFE0F Some acceptance criteria are missing coverage");
  }
  lines.push("");
  lines.push("## Per-AC Coverage");
  lines.push("");
  lines.push("| AC ID | Title | Coverage | Status |");
  lines.push("|-------|-------|----------|--------|");
  for (const ac of result.perAC) {
    const status = ac.hasCoverage ? ac.coveragePercent >= 80 ? "\u2705" : "\u26A0\uFE0F" : "\u274C";
    lines.push(
      `| ${ac.acId} | ${ac.acTitle.slice(0, 30)}${ac.acTitle.length > 30 ? "..." : ""} | ${Math.round(ac.coveragePercent)}% | ${status} |`
    );
  }
  if (result.issues.length > 0) {
    lines.push("");
    lines.push("## Issues");
    lines.push("");
    for (const issue of result.issues) {
      const icon = issue.severity === "error" ? "\u274C" : issue.severity === "warning" ? "\u26A0\uFE0F" : "\u2139\uFE0F";
      lines.push(`- ${icon} **${issue.code}**: ${issue.message}`);
      if (issue.suggestion) {
        lines.push(`  - Suggestion: ${issue.suggestion}`);
      }
    }
  }
  return lines.join("\n");
}

// src/validate/code.ts
var DEFAULT_OPTIONS4 = {
  runLint: false,
  // ESLint requires setup, disabled by default
  validateTags: true,
  validateCoverage: true,
  validateFrontmatter: true,
  minCoverage: 80,
  allowDrafts: false
};
async function validateCode(code, journey, frontmatter, options = {}) {
  const opts = { ...DEFAULT_OPTIONS4, ...options };
  const allIssues = [];
  const details = {
    patterns: { valid: true, violationCount: 0 }
  };
  if (opts.validateFrontmatter && frontmatter) {
    const frontmatterResult = validateJourneyFrontmatter(frontmatter, {
      allowDrafts: opts.allowDrafts
    });
    details.frontmatter = frontmatterResult;
    allIssues.push(...frontmatterResult.issues);
  }
  const patternResults = scanForbiddenPatterns(code);
  const patternIssues = scanResultsToIssues(patternResults);
  allIssues.push(...patternIssues);
  const patternSummary = getViolationSummary(patternResults);
  details.patterns = {
    valid: patternSummary.errors === 0,
    violationCount: patternSummary.total
  };
  if (opts.runLint) {
    const lintResult = await lintCode(code, `${journey.id.toLowerCase()}.spec.ts`);
    details.lint = lintResult;
    allIssues.push(...lintResult.issues);
  }
  if (opts.validateTags) {
    const tagResult = validateTagsInCode(code, journey.id, journey.tier, journey.scope);
    details.tags = tagResult;
    allIssues.push(...tagResult.issues);
  }
  if (opts.validateCoverage) {
    const coverageResult = validateIRCoverage(journey, {
      minCoverage: opts.minCoverage,
      warnPartialCoverage: true
    });
    details.coverage = coverageResult;
    allIssues.push(...coverageResult.issues);
  }
  const counts = {
    errors: allIssues.filter((i) => i.severity === "error").length,
    warnings: allIssues.filter((i) => i.severity === "warning").length,
    info: allIssues.filter((i) => i.severity === "info").length
  };
  return {
    valid: counts.errors === 0,
    journeyId: journey.id,
    issues: allIssues,
    counts,
    details,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function validateCodeSync(code, journey, frontmatter, options = {}) {
  const opts = { ...DEFAULT_OPTIONS4, ...options};
  const allIssues = [];
  const details = {
    patterns: { valid: true, violationCount: 0 }
  };
  if (opts.validateFrontmatter && frontmatter) {
    const frontmatterResult = validateJourneyFrontmatter(frontmatter, {
      allowDrafts: opts.allowDrafts
    });
    details.frontmatter = frontmatterResult;
    allIssues.push(...frontmatterResult.issues);
  }
  const patternResults = scanForbiddenPatterns(code);
  const patternIssues = scanResultsToIssues(patternResults);
  allIssues.push(...patternIssues);
  const patternSummary = getViolationSummary(patternResults);
  details.patterns = {
    valid: patternSummary.errors === 0,
    violationCount: patternSummary.total
  };
  if (opts.validateTags) {
    const tagResult = validateTagsInCode(code, journey.id, journey.tier, journey.scope);
    details.tags = tagResult;
    allIssues.push(...tagResult.issues);
  }
  if (opts.validateCoverage) {
    const coverageResult = validateIRCoverage(journey, {
      minCoverage: opts.minCoverage,
      warnPartialCoverage: true
    });
    details.coverage = coverageResult;
    allIssues.push(...coverageResult.issues);
  }
  const counts = {
    errors: allIssues.filter((i) => i.severity === "error").length,
    warnings: allIssues.filter((i) => i.severity === "warning").length,
    info: allIssues.filter((i) => i.severity === "info").length
  };
  return {
    valid: counts.errors === 0,
    journeyId: journey.id,
    issues: allIssues,
    counts,
    details,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function isCodeValid(code, journey, frontmatter) {
  const result = validateCodeSync(code, journey, frontmatter);
  return result.valid;
}
function generateValidationReport(result) {
  const lines = [];
  lines.push("# Code Validation Report");
  lines.push("");
  lines.push(`**Journey**: ${result.journeyId}`);
  lines.push(`**Status**: ${result.valid ? "\u2705 PASSED" : "\u274C FAILED"}`);
  lines.push(`**Timestamp**: ${result.timestamp}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Errors: ${result.counts.errors}`);
  lines.push(`- Warnings: ${result.counts.warnings}`);
  lines.push(`- Info: ${result.counts.info}`);
  lines.push("");
  lines.push("## Validation Checks");
  lines.push("");
  if (result.details.frontmatter) {
    const fm = result.details.frontmatter;
    lines.push(`### Frontmatter: ${fm.valid ? "\u2705" : "\u274C"}`);
    lines.push("");
  }
  const patterns = result.details.patterns;
  lines.push(`### Forbidden Patterns: ${patterns.valid ? "\u2705" : "\u274C"}`);
  lines.push(`- Violations found: ${patterns.violationCount}`);
  lines.push("");
  if (result.details.lint) {
    const lint = result.details.lint;
    lines.push(`### ESLint: ${lint.passed ? "\u2705" : "\u274C"}`);
    lines.push(`- Errors: ${lint.errorCount}`);
    lines.push(`- Warnings: ${lint.warningCount}`);
    lines.push("");
  }
  if (result.details.tags) {
    const tags = result.details.tags;
    lines.push(`### Tags: ${tags.valid ? "\u2705" : "\u274C"}`);
    lines.push("");
  }
  if (result.details.coverage) {
    const coverage = result.details.coverage;
    lines.push(`### Coverage: ${coverage.fullCoverage ? "\u2705" : "\u274C"}`);
    lines.push(`- Overall: ${Math.round(coverage.overallCoverage)}%`);
    lines.push(`- ACs Covered: ${coverage.coveredACs}/${coverage.totalACs}`);
    lines.push("");
  }
  if (result.issues.length > 0) {
    lines.push("## Issues");
    lines.push("");
    const groupedIssues = {
      error: [],
      warning: [],
      info: []
    };
    for (const issue of result.issues) {
      groupedIssues[issue.severity].push(issue);
    }
    if (groupedIssues.error.length > 0) {
      lines.push("### Errors");
      for (const issue of groupedIssues.error) {
        lines.push(`- \u274C **${issue.code}**: ${issue.message}`);
        if (issue.suggestion) {
          lines.push(`  - \u{1F4A1} ${issue.suggestion}`);
        }
      }
      lines.push("");
    }
    if (groupedIssues.warning.length > 0) {
      lines.push("### Warnings");
      for (const issue of groupedIssues.warning) {
        lines.push(`- \u26A0\uFE0F **${issue.code}**: ${issue.message}`);
        if (issue.suggestion) {
          lines.push(`  - \u{1F4A1} ${issue.suggestion}`);
        }
      }
      lines.push("");
    }
    if (groupedIssues.info.length > 0) {
      lines.push("### Info");
      for (const issue of groupedIssues.info) {
        lines.push(`- \u2139\uFE0F **${issue.code}**: ${issue.message}`);
        if (issue.suggestion) {
          lines.push(`  - \u{1F4A1} ${issue.suggestion}`);
        }
      }
      lines.push("");
    }
  }
  return lines.join("\n");
}
function isPlaywrightAvailable(cwd) {
  try {
    execSync("npx playwright --version", {
      cwd,
      stdio: "pipe",
      encoding: "utf-8"
    });
    return true;
  } catch {
    return false;
  }
}
function getPlaywrightVersion(cwd) {
  try {
    const result = execSync("npx playwright --version", {
      cwd,
      stdio: "pipe",
      encoding: "utf-8"
    });
    return result.trim();
  } catch {
    return null;
  }
}
function buildPlaywrightArgs(options) {
  const args = ["test"];
  if (options.testFile) {
    args.push(options.testFile);
  }
  if (options.grep) {
    args.push("--grep", options.grep);
  }
  if (options.project) {
    args.push("--project", options.project);
  }
  if (options.workers !== void 0) {
    args.push("--workers", String(options.workers));
  }
  if (options.retries !== void 0) {
    args.push("--retries", String(options.retries));
  }
  if (options.repeatEach !== void 0) {
    args.push("--repeat-each", String(options.repeatEach));
  }
  if (options.failOnFlaky) {
    args.push("--fail-on-flaky-tests");
  }
  if (options.timeout !== void 0) {
    args.push("--timeout", String(options.timeout));
  }
  if (options.reporter) {
    args.push("--reporter", options.reporter);
  }
  if (options.outputDir) {
    args.push("--output", options.outputDir);
  }
  if (options.headed) {
    args.push("--headed");
  }
  if (options.debug) {
    args.push("--debug");
  }
  if (options.updateSnapshots) {
    args.push("--update-snapshots");
  }
  return args;
}
function runPlaywrightSync(options = {}) {
  const { cwd = process.cwd(), env = {} } = options;
  if (!isPlaywrightAvailable(cwd)) {
    return {
      success: false,
      exitCode: 1,
      stdout: "",
      stderr: "Playwright is not installed",
      duration: 0,
      command: "npx playwright test"
    };
  }
  const tempDir = join(tmpdir(), `autogen-verify-${Date.now()}`);
  mkdirSync(tempDir, { recursive: true });
  const reportPath = join(tempDir, "results.json");
  const args = buildPlaywrightArgs({
    ...options,
    reporter: `json,line`
  });
  const command = `npx playwright ${args.join(" ")}`;
  const startTime = Date.now();
  try {
    const result = execSync(command, {
      cwd,
      stdio: "pipe",
      encoding: "utf-8",
      env: {
        ...process.env,
        ...env,
        PLAYWRIGHT_JSON_OUTPUT_NAME: reportPath
      },
      timeout: options.timeout ? options.timeout * 10 : 6e5
      // 10x test timeout or 10 min
    });
    return {
      success: true,
      exitCode: 0,
      stdout: result,
      stderr: "",
      reportPath: existsSync(reportPath) ? reportPath : void 0,
      duration: Date.now() - startTime,
      command
    };
  } catch (error) {
    const execError = error;
    return {
      success: false,
      exitCode: execError.status || 1,
      stdout: execError.stdout || "",
      stderr: execError.stderr || String(error),
      reportPath: existsSync(reportPath) ? reportPath : void 0,
      duration: Date.now() - startTime,
      command
    };
  }
}
function runPlaywrightAsync(options = {}) {
  return new Promise((resolve6) => {
    const { cwd = process.cwd(), env = {} } = options;
    const tempDir = join(tmpdir(), `autogen-verify-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
    const reportPath = join(tempDir, "results.json");
    const args = buildPlaywrightArgs({
      ...options,
      reporter: "json,line"
    });
    const command = `npx playwright ${args.join(" ")}`;
    const startTime = Date.now();
    let stdout = "";
    let stderr = "";
    const child = spawn("npx", ["playwright", ...args], {
      cwd,
      env: {
        ...process.env,
        ...env,
        PLAYWRIGHT_JSON_OUTPUT_NAME: reportPath
      },
      shell: true
    });
    child.stdout?.on("data", (data) => {
      stdout += data.toString();
    });
    child.stderr?.on("data", (data) => {
      stderr += data.toString();
    });
    child.on("close", (code) => {
      resolve6({
        success: code === 0,
        exitCode: code || 1,
        stdout,
        stderr,
        reportPath: existsSync(reportPath) ? reportPath : void 0,
        duration: Date.now() - startTime,
        command
      });
    });
    child.on("error", (error) => {
      resolve6({
        success: false,
        exitCode: 1,
        stdout,
        stderr: error.message,
        duration: Date.now() - startTime,
        command
      });
    });
  });
}
function runTestFile(testFilePath, options = {}) {
  if (!existsSync(testFilePath)) {
    return {
      success: false,
      exitCode: 1,
      stdout: "",
      stderr: `Test file not found: ${testFilePath}`,
      duration: 0,
      command: ""
    };
  }
  return runPlaywrightSync({
    ...options,
    testFile: testFilePath,
    cwd: options.cwd || dirname(testFilePath)
  });
}
function runJourneyTests(journeyId, options = {}) {
  return runPlaywrightSync({
    ...options,
    grep: `@${journeyId}`
  });
}
function checkTestSyntax(testFilePath, cwd) {
  if (!existsSync(testFilePath)) {
    return false;
  }
  try {
    execSync(`npx tsc --noEmit ${testFilePath}`, {
      cwd: cwd || dirname(testFilePath),
      stdio: "pipe"
    });
    return true;
  } catch {
    return false;
  }
}
function writeAndRunTest(code, filename, options = {}) {
  const tempDir = join(tmpdir(), `autogen-test-${Date.now()}`);
  mkdirSync(tempDir, { recursive: true });
  const testPath = join(tempDir, filename);
  writeFileSync(testPath, code, "utf-8");
  return runTestFile(testPath, options);
}
function getTestCount(testFile, cwd) {
  try {
    const result = execSync(`npx playwright test --list ${testFile}`, {
      cwd,
      stdio: "pipe",
      encoding: "utf-8"
    });
    const match = result.match(/Listing (\d+) tests?/);
    return match ? parseInt(match[1], 10) : 0;
  } catch {
    return 0;
  }
}
function parseReportFile(filePath) {
  if (!existsSync(filePath)) {
    return null;
  }
  try {
    const content = readFileSync(filePath, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}
function parseReportContent(content) {
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}
function extractTestResults(report) {
  const results = [];
  function extractFromSuite(suite, titlePath = []) {
    const currentPath = [...titlePath, suite.title].filter(Boolean);
    for (const spec of suite.specs) {
      for (const test of spec.tests) {
        for (const result of test.results) {
          results.push({
            ...result,
            titlePath: [...currentPath, spec.title]
          });
        }
      }
    }
    for (const childSuite of suite.suites) {
      extractFromSuite(childSuite, currentPath);
    }
  }
  for (const suite of report.suites) {
    extractFromSuite(suite);
  }
  return results;
}
function getSummary(report) {
  const allResults = extractTestResults(report);
  const failedTests = allResults.filter((r) => r.status === "failed");
  const passedTests = allResults.filter((r) => r.status === "passed");
  const skippedTests = allResults.filter((r) => r.status === "skipped");
  const flakyTests = allResults.filter((r) => r.status === "passed" && r.retry > 0);
  const files = [...new Set(allResults.map((r) => r.location.file))];
  return {
    total: allResults.length,
    passed: passedTests.length,
    failed: failedTests.length,
    skipped: skippedTests.length,
    flaky: flakyTests.length,
    duration: report.stats.duration,
    startTime: new Date(report.stats.startTime),
    files,
    failedTests,
    flakyTests
  };
}
function getFailedTests(report) {
  return extractTestResults(report).filter((r) => r.status === "failed");
}
function getFlakyTests(report) {
  return extractTestResults(report).filter(
    (r) => r.status === "passed" && r.retry > 0
  );
}
function findTestsByTitle(report, pattern) {
  const allResults = extractTestResults(report);
  const regex = typeof pattern === "string" ? new RegExp(pattern, "i") : pattern;
  return allResults.filter((r) => regex.test(r.title));
}
function findTestsByTag(report, tag) {
  const allResults = extractTestResults(report);
  return allResults.filter((r) => r.tags.includes(tag));
}
function extractErrorMessages(result) {
  return result.errors.map((e) => e.message);
}
function extractErrorStacks(result) {
  return result.errors.map((e) => e.stack).filter((s) => s !== void 0);
}
function getFailedStep(result) {
  function findFailedStep(steps) {
    for (const step of steps) {
      if (step.error) {
        return step;
      }
      if (step.steps) {
        const found = findFailedStep(step.steps);
        if (found) return found;
      }
    }
    return null;
  }
  return findFailedStep(result.steps);
}
function isReportSuccessful(report) {
  return report.stats.unexpected === 0;
}
function reportHasFlaky(report) {
  return report.stats.flaky > 0;
}
function formatTestResult(result) {
  const status = result.status.toUpperCase();
  const title = result.titlePath.join(" > ");
  const duration = `${result.duration}ms`;
  const retry = result.retry > 0 ? ` (retry ${result.retry})` : "";
  let output = `[${status}] ${title} (${duration})${retry}`;
  if (result.errors.length > 0) {
    output += "\n  Errors:";
    for (const error of result.errors) {
      output += `
    - ${error.message}`;
    }
  }
  return output;
}
function generateMarkdownSummary(report) {
  const summary = getSummary(report);
  const lines = [];
  lines.push("# Test Results Summary");
  lines.push("");
  lines.push(`**Status**: ${summary.failed === 0 ? "\u2705 PASSED" : "\u274C FAILED"}`);
  lines.push(`**Duration**: ${Math.round(summary.duration / 1e3)}s`);
  lines.push("");
  lines.push("## Stats");
  lines.push("");
  lines.push(`- Total: ${summary.total}`);
  lines.push(`- Passed: ${summary.passed}`);
  lines.push(`- Failed: ${summary.failed}`);
  lines.push(`- Skipped: ${summary.skipped}`);
  lines.push(`- Flaky: ${summary.flaky}`);
  if (summary.failedTests.length > 0) {
    lines.push("");
    lines.push("## Failed Tests");
    lines.push("");
    for (const test of summary.failedTests) {
      lines.push(`### ${test.titlePath.join(" > ")}`);
      for (const error of test.errors) {
        lines.push("");
        lines.push("```");
        lines.push(error.message);
        lines.push("```");
      }
    }
  }
  if (summary.flakyTests.length > 0) {
    lines.push("");
    lines.push("## Flaky Tests");
    lines.push("");
    for (const test of summary.flakyTests) {
      lines.push(`- ${test.titlePath.join(" > ")} (passed on retry ${test.retry})`);
    }
  }
  return lines.join("\n");
}

// src/verify/classifier.ts
var CLASSIFICATION_PATTERNS = [
  // Selector issues
  {
    category: "selector",
    keywords: [
      /locator\s+resolved\s+to\s+\d+\s+elements/i,
      /locator\.click:\s+Error/i,
      /waiting\s+for\s+locator/i,
      /element\s+is\s+not\s+visible/i,
      /element\s+is\s+not\s+attached/i,
      /element\s+is\s+not\s+enabled/i,
      /getBy\w+\s*\([^)]+\)/i,
      /strict\s+mode\s+violation/i,
      /No\s+element\s+matches\s+selector/i,
      /Target\s+closed/i,
      /element\s+is\s+outside\s+of\s+the\s+viewport/i
    ],
    explanation: "Element locator failed to find or interact with element",
    suggestion: "Update selector to use more stable locator strategy (role, label, testid)",
    isTestIssue: true
  },
  // Timing issues
  {
    category: "timing",
    keywords: [
      /timeout\s+\d+ms\s+exceeded/i,
      /exceeded\s+while\s+waiting/i,
      /timed?\s*out/i,
      /waiting\s+for\s+navigation/i,
      /waiting\s+for\s+load\s+state/i,
      /response\s+took\s+too\s+long/i,
      /expect\.\w+:\s+Timeout/i,
      /navigation\s+was\s+interrupted/i
    ],
    explanation: "Operation timed out waiting for element or network",
    suggestion: "Increase timeout or add explicit wait for expected state",
    isTestIssue: true
  },
  // Navigation issues
  {
    category: "navigation",
    keywords: [
      /expected\s+url.*to.*match/i,
      /expected.*toHaveURL/i,
      /page\s+has\s+been\s+closed/i,
      /navigation\s+failed/i,
      /net::ERR_/i,
      /ERR_CONNECTION/i,
      /ERR_NAME_NOT_RESOLVED/i,
      /redirect/i,
      /page\.goto:\s+Error/i,
      /URL\s+is\s+not\s+valid/i
    ],
    explanation: "Navigation to URL failed or URL mismatch",
    suggestion: "Check URL configuration and network connectivity",
    isTestIssue: false
  },
  // Data/assertion issues
  {
    category: "data",
    keywords: [
      /expected.*to\s+(?:be|equal|match|contain|have)/i,
      /received.*but\s+expected/i,
      /toEqual/i,
      /toBe\(/i,
      /toContain/i,
      /toHaveText/i,
      /toHaveValue/i,
      /assertion\s+failed/i,
      /expected\s+value/i,
      /does\s+not\s+match/i
    ],
    explanation: "Assertion failed due to unexpected data",
    suggestion: "Verify test data matches expected application state",
    isTestIssue: false
  },
  // Auth issues
  {
    category: "auth",
    keywords: [
      /401\s+Unauthorized/i,
      /403\s+Forbidden/i,
      /authentication\s+failed/i,
      /login\s+failed/i,
      /session\s+expired/i,
      /token\s+invalid/i,
      /access\s+denied/i,
      /not\s+authenticated/i,
      /sign\s*in\s+required/i,
      /invalid\s+credentials/i
    ],
    explanation: "Authentication or authorization failed",
    suggestion: "Check authentication state and credentials",
    isTestIssue: false
  },
  // Environment issues
  {
    category: "env",
    keywords: [
      /ECONNREFUSED/i,
      /ENOTFOUND/i,
      /ETIMEDOUT/i,
      /connection\s+refused/i,
      /network\s+error/i,
      /502\s+Bad\s+Gateway/i,
      /503\s+Service\s+Unavailable/i,
      /504\s+Gateway\s+Timeout/i,
      /server\s+error/i,
      /browser\s+has\s+been\s+closed/i,
      /browser\s+crash/i,
      /context\s+closed/i
    ],
    explanation: "Environment or infrastructure issue",
    suggestion: "Check application availability and environment configuration",
    isTestIssue: false
  },
  // Script errors
  {
    category: "script",
    keywords: [
      /SyntaxError/i,
      /TypeError/i,
      /ReferenceError/i,
      /undefined\s+is\s+not/i,
      /is\s+not\s+a\s+function/i,
      /Cannot\s+read\s+propert/i,
      /null\s+is\s+not/i,
      /is\s+not\s+defined/i,
      /Unexpected\s+token/i
    ],
    explanation: "Test script has a code error",
    suggestion: "Fix the JavaScript/TypeScript error in the test",
    isTestIssue: true
  }
];
function classifyError(error) {
  const errorText = `${error.message} ${error.stack || ""}`;
  const matchedKeywords = [];
  let bestMatch = null;
  let maxMatches = 0;
  for (const pattern of CLASSIFICATION_PATTERNS) {
    let matches = 0;
    const patternMatches = [];
    for (const keyword of pattern.keywords) {
      if (keyword.test(errorText)) {
        matches++;
        patternMatches.push(keyword.source);
      }
    }
    if (matches > maxMatches) {
      maxMatches = matches;
      bestMatch = pattern;
      matchedKeywords.length = 0;
      matchedKeywords.push(...patternMatches);
    }
  }
  if (bestMatch && maxMatches > 0) {
    return {
      category: bestMatch.category,
      confidence: Math.min(maxMatches / 3, 1),
      // Normalize to 0-1
      explanation: bestMatch.explanation,
      suggestion: bestMatch.suggestion,
      isTestIssue: bestMatch.isTestIssue,
      matchedKeywords
    };
  }
  return {
    category: "unknown",
    confidence: 0,
    explanation: "Unable to classify failure",
    suggestion: "Review error details manually",
    isTestIssue: false,
    matchedKeywords: []
  };
}
function classifyTestResult(result) {
  if (result.status !== "failed" || result.errors.length === 0) {
    return {
      category: "unknown",
      confidence: 0,
      explanation: "Test did not fail or has no errors",
      suggestion: "N/A",
      isTestIssue: false,
      matchedKeywords: []
    };
  }
  const classifications = result.errors.map(classifyError);
  const best = classifications.reduce(
    (prev, curr) => curr.confidence > prev.confidence ? curr : prev
  );
  return best;
}
function classifyTestResults(results) {
  const classified = /* @__PURE__ */ new Map();
  for (const result of results) {
    if (result.status === "failed") {
      const key = result.titlePath.join(" > ");
      classified.set(key, classifyTestResult(result));
    }
  }
  return classified;
}
function getFailureStats(classifications) {
  const stats = {
    selector: 0,
    timing: 0,
    navigation: 0,
    data: 0,
    auth: 0,
    env: 0,
    script: 0,
    unknown: 0
  };
  for (const classification of classifications.values()) {
    stats[classification.category]++;
  }
  return stats;
}
function isHealable(classification) {
  return classification.category === "selector" || classification.category === "timing";
}
function getHealableFailures(classifications) {
  const healable = /* @__PURE__ */ new Map();
  for (const [key, classification] of classifications.entries()) {
    if (isHealable(classification)) {
      healable.set(key, classification);
    }
  }
  return healable;
}
function generateClassificationReport(classifications) {
  const lines = [];
  const stats = getFailureStats(classifications);
  lines.push("# Failure Classification Report");
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  for (const [category, count] of Object.entries(stats)) {
    if (count > 0) {
      lines.push(`- ${category}: ${count}`);
    }
  }
  lines.push("");
  lines.push("## Detailed Classifications");
  lines.push("");
  for (const [testName, classification] of classifications.entries()) {
    lines.push(`### ${testName}`);
    lines.push("");
    lines.push(`- **Category**: ${classification.category}`);
    lines.push(`- **Confidence**: ${Math.round(classification.confidence * 100)}%`);
    lines.push(`- **Explanation**: ${classification.explanation}`);
    lines.push(`- **Suggestion**: ${classification.suggestion}`);
    lines.push(`- **Is Test Issue**: ${classification.isTestIssue ? "Yes" : "No"}`);
    lines.push("");
  }
  return lines.join("\n");
}

// src/verify/stability.ts
var DEFAULT_OPTIONS5 = {
  repeatCount: 3,
  maxFlakyRate: 0,
  stopOnFlaky: false
};
function checkStability(options = {}) {
  const opts = { ...DEFAULT_OPTIONS5, ...options };
  const result = {
    stable: true,
    runsCompleted: 0,
    flakyTests: [],
    flakyRate: 0,
    runSummaries: [],
    runnerResult: {
      success: false,
      exitCode: 0,
      stdout: "",
      stderr: "",
      duration: 0,
      command: ""
    }
  };
  const runnerResult = runPlaywrightSync({
    ...options,
    repeatEach: opts.repeatCount,
    failOnFlaky: true
  });
  result.runnerResult = runnerResult;
  result.runsCompleted = opts.repeatCount;
  if (runnerResult.reportPath) {
    const report = parseReportFile(runnerResult.reportPath);
    if (report) {
      const summary = getSummary(report);
      result.runSummaries.push(summary);
      result.flakyTests = summary.flakyTests.map((t) => t.titlePath.join(" > "));
      result.flakyRate = summary.total > 0 ? summary.flaky / summary.total : 0;
      result.stable = result.flakyRate <= opts.maxFlakyRate;
    }
  }
  if (!runnerResult.success && result.flakyTests.length === 0) {
    if (runnerResult.stdout.includes("flaky") || runnerResult.stderr.includes("flaky")) {
      result.stable = false;
    }
  }
  return result;
}
function quickStabilityCheck(options = {}) {
  return checkStability({
    ...options,
    repeatCount: 2
  });
}
function thoroughStabilityCheck(options = {}) {
  return checkStability({
    ...options,
    repeatCount: 5
  });
}
function isTestStable(testFile, testName, repeatCount = 3, options = {}) {
  const result = checkStability({
    ...options,
    testFile,
    grep: testName,
    repeatCount
  });
  return result.stable;
}
function getFlakinessScore(result) {
  if (result.runsCompleted === 0) return 0;
  return result.flakyRate;
}
function shouldQuarantine(result, threshold = 0.3) {
  return result.flakyRate > threshold;
}
function generateStabilityReport(result) {
  const lines = [];
  lines.push("# Stability Check Report");
  lines.push("");
  lines.push(`**Status**: ${result.stable ? "\u2705 STABLE" : "\u26A0\uFE0F UNSTABLE"}`);
  lines.push(`**Runs Completed**: ${result.runsCompleted}`);
  lines.push(`**Flaky Rate**: ${Math.round(result.flakyRate * 100)}%`);
  lines.push("");
  if (result.flakyTests.length > 0) {
    lines.push("## Flaky Tests Detected");
    lines.push("");
    for (const test of result.flakyTests) {
      lines.push(`- ${test}`);
    }
    lines.push("");
    lines.push("### Recommendations");
    lines.push("");
    lines.push("1. Review test steps for race conditions");
    lines.push("2. Add explicit waits for expected states");
    lines.push("3. Check for shared state between tests");
    lines.push("4. Consider isolation improvements");
  } else {
    lines.push("## All Tests Stable");
    lines.push("");
    lines.push("No flakiness detected after repeated runs.");
  }
  return lines.join("\n");
}
function generateARIACaptureCode() {
  return `
// ARIA Snapshot Helper - Insert this in your test for debugging
async function captureARIASnapshot(page) {
  return await page.evaluate(() => {
    function getSnapshot(element) {
      const role = element.getAttribute('role') ||
                   element.tagName.toLowerCase();

      const snapshot = { role };

      // Get accessible name
      const name = element.getAttribute('aria-label') ||
                   element.getAttribute('aria-labelledby') ?
                   document.getElementById(element.getAttribute('aria-labelledby'))?.textContent :
                   element.textContent?.trim().slice(0, 100);
      if (name) snapshot.name = name;

      // Get ARIA states
      if (element.getAttribute('aria-disabled') === 'true') {
        snapshot.disabled = true;
      }
      if (element.getAttribute('aria-checked') === 'true') {
        snapshot.checked = true;
      }
      if (element.getAttribute('aria-expanded') === 'true') {
        snapshot.expanded = true;
      }
      if (element.getAttribute('aria-pressed') === 'true') {
        snapshot.pressed = true;
      }

      // Get heading level
      const levelMatch = element.tagName.match(/^H(\\d)$/i);
      if (levelMatch) {
        snapshot.level = parseInt(levelMatch[1], 10);
      }

      // Get children
      const children = Array.from(element.children)
        .map(child => getSnapshot(child))
        .filter(c => c.role !== 'none' && c.role !== 'presentation');

      if (children.length > 0) {
        snapshot.children = children;
      }

      return snapshot;
    }

    return getSnapshot(document.body);
  });
}
`.trim();
}
function generateEvidenceCaptureCode(options = {}) {
  const {
    captureScreenshot = true,
    captureAria = true,
    captureConsole = true
  } = options;
  const parts = [];
  parts.push("// Evidence Capture Helper");
  parts.push("const evidence = {");
  parts.push("  timestamp: new Date().toISOString(),");
  parts.push("  url: page.url(),");
  parts.push("  title: await page.title(),");
  if (captureAria) {
    parts.push("  ariaSnapshot: await captureARIASnapshot(page),");
  }
  if (captureScreenshot) {
    parts.push('  screenshotPath: await page.screenshot({ path: "evidence.png" }),');
  }
  if (captureConsole) {
    parts.push('  consoleMessages: [], // Collect from page.on("console")');
  }
  parts.push("};");
  return parts.join("\n");
}
function createEvidenceDir(basePath, testId) {
  const evidenceDir = join(basePath, "evidence", testId);
  mkdirSync(evidenceDir, { recursive: true });
  return evidenceDir;
}
function saveEvidence(evidence, outputDir, testId) {
  const dir = createEvidenceDir(outputDir, testId);
  const filename = `evidence-${Date.now()}.json`;
  const filepath = join(dir, filename);
  writeFileSync(filepath, JSON.stringify(evidence, null, 2), "utf-8");
  return filepath;
}
function loadEvidence(filepath) {
  if (!existsSync(filepath)) {
    return null;
  }
  try {
    const content = readFileSync(filepath, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}
function compareARIASnapshots(expected, actual) {
  const differences = [];
  function compare(path, exp, act) {
    if (exp.role !== act.role) {
      differences.push(`${path}: role mismatch (expected: ${exp.role}, actual: ${act.role})`);
    }
    if (exp.name !== act.name) {
      differences.push(`${path}: name mismatch (expected: ${exp.name}, actual: ${act.name})`);
    }
    if (exp.disabled !== act.disabled) {
      differences.push(`${path}: disabled state mismatch`);
    }
    if (exp.checked !== act.checked) {
      differences.push(`${path}: checked state mismatch`);
    }
    const expChildren = exp.children || [];
    const actChildren = act.children || [];
    if (expChildren.length !== actChildren.length) {
      differences.push(`${path}: children count mismatch (expected: ${expChildren.length}, actual: ${actChildren.length})`);
    }
    const minLen = Math.min(expChildren.length, actChildren.length);
    for (let i = 0; i < minLen; i++) {
      compare(`${path}/${expChildren[i].role}[${i}]`, expChildren[i], actChildren[i]);
    }
  }
  compare("/", expected, actual);
  return {
    matches: differences.length === 0,
    differences
  };
}
function findInSnapshot(snapshot, role, name) {
  if (snapshot.role === role && (!name || snapshot.name === name)) {
    return snapshot;
  }
  for (const child of snapshot.children || []) {
    const found = findInSnapshot(child, role, name);
    if (found) return found;
  }
  return null;
}
function formatARIATree(snapshot, indent = 0) {
  const prefix = "  ".repeat(indent);
  let line = `${prefix}${snapshot.role}`;
  if (snapshot.name) {
    line += ` "${snapshot.name}"`;
  }
  const states = [];
  if (snapshot.disabled) states.push("disabled");
  if (snapshot.checked) states.push("checked");
  if (snapshot.expanded) states.push("expanded");
  if (snapshot.pressed) states.push("pressed");
  if (snapshot.level) states.push(`level=${snapshot.level}`);
  if (states.length > 0) {
    line += ` [${states.join(", ")}]`;
  }
  const lines = [line];
  for (const child of snapshot.children || []) {
    lines.push(formatARIATree(child, indent + 1));
  }
  return lines.join("\n");
}
function generateEvidenceReport(evidence) {
  const lines = [];
  lines.push("# Evidence Report");
  lines.push("");
  lines.push(`**Captured**: ${evidence.timestamp}`);
  lines.push(`**URL**: ${evidence.url}`);
  lines.push(`**Title**: ${evidence.title}`);
  lines.push("");
  if (evidence.screenshotPath) {
    lines.push("## Screenshot");
    lines.push("");
    lines.push(`![Screenshot](${evidence.screenshotPath})`);
    lines.push("");
  }
  if (evidence.ariaSnapshot) {
    lines.push("## ARIA Snapshot");
    lines.push("");
    lines.push("```");
    lines.push(formatARIATree(evidence.ariaSnapshot));
    lines.push("```");
    lines.push("");
  }
  if (evidence.consoleMessages && evidence.consoleMessages.length > 0) {
    lines.push("## Console Messages");
    lines.push("");
    for (const msg of evidence.consoleMessages) {
      lines.push(`- ${msg}`);
    }
    lines.push("");
  }
  if (evidence.networkErrors && evidence.networkErrors.length > 0) {
    lines.push("## Network Errors");
    lines.push("");
    for (const err2 of evidence.networkErrors) {
      lines.push(`- ${err2}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}
function generateVerifySummary(runnerResult, options = {}) {
  const summary = {
    status: "error",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    duration: runnerResult.duration,
    counts: {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      flaky: 0
    },
    failures: {
      tests: [],
      classifications: {},
      stats: {}
    },
    runner: {
      exitCode: runnerResult.exitCode,
      command: runnerResult.command
    },
    reportPath: runnerResult.reportPath
  };
  if (options.journeyId) {
    summary.journeyId = options.journeyId;
  }
  if (options.metadata) {
    summary.metadata = options.metadata;
  }
  if (runnerResult.reportPath) {
    const report = parseReportFile(runnerResult.reportPath);
    if (report) {
      const parsed = getSummary(report);
      summary.counts = {
        total: parsed.total,
        passed: parsed.passed,
        failed: parsed.failed,
        skipped: parsed.skipped,
        flaky: parsed.flaky
      };
      const failedTests = getFailedTests(report);
      summary.failures.tests = failedTests.map((t) => t.titlePath.join(" > "));
      const classifications = classifyTestResults(failedTests);
      summary.failures.classifications = Object.fromEntries(classifications);
      summary.failures.stats = getFailureStats(classifications);
      if (parsed.failed === 0) {
        summary.status = parsed.flaky > 0 ? "flaky" : "passed";
      } else {
        summary.status = "failed";
      }
    }
  } else {
    summary.status = runnerResult.success ? "passed" : "failed";
  }
  if (options.stabilityResult) {
    summary.stability = {
      stable: options.stabilityResult.stable,
      flakyTests: options.stabilityResult.flakyTests,
      flakyRate: options.stabilityResult.flakyRate
    };
    if (!options.stabilityResult.stable && summary.status === "passed") {
      summary.status = "flaky";
    }
  }
  return summary;
}
function generateSummaryFromReport(report, options = {}) {
  const parsed = getSummary(report);
  const failedTests = getFailedTests(report);
  const classifications = classifyTestResults(failedTests);
  const summary = {
    status: parsed.failed === 0 ? parsed.flaky > 0 ? "flaky" : "passed" : "failed",
    timestamp: parsed.startTime.toISOString(),
    duration: parsed.duration,
    counts: {
      total: parsed.total,
      passed: parsed.passed,
      failed: parsed.failed,
      skipped: parsed.skipped,
      flaky: parsed.flaky
    },
    failures: {
      tests: failedTests.map((t) => t.titlePath.join(" > ")),
      classifications: Object.fromEntries(classifications),
      stats: getFailureStats(classifications)
    },
    runner: {
      exitCode: parsed.failed > 0 ? 1 : 0,
      command: "N/A"
    }
  };
  if (options.journeyId) {
    summary.journeyId = options.journeyId;
  }
  if (options.metadata) {
    summary.metadata = options.metadata;
  }
  return summary;
}
function isVerificationPassed(summary) {
  return summary.status === "passed";
}
function hasFailures(summary) {
  return summary.counts.failed > 0;
}
function summaryHasFlaky(summary) {
  return summary.counts.flaky > 0 || summary.stability?.flakyRate !== void 0 && summary.stability.flakyRate > 0;
}
function getRecommendations(summary) {
  const recommendations = [];
  if (summary.counts.failed > 0) {
    const stats = summary.failures.stats;
    if (stats.selector > 0) {
      recommendations.push(
        `${stats.selector} selector issue(s): Update locators to use stable selectors (role, label, testid)`
      );
    }
    if (stats.timing > 0) {
      recommendations.push(
        `${stats.timing} timing issue(s): Add explicit waits or increase timeout`
      );
    }
    if (stats.auth > 0) {
      recommendations.push(
        `${stats.auth} auth issue(s): Check authentication state and credentials`
      );
    }
    if (stats.env > 0) {
      recommendations.push(
        `${stats.env} environment issue(s): Verify application is running and accessible`
      );
    }
    if (stats.data > 0) {
      recommendations.push(
        `${stats.data} data issue(s): Review test data and expected values`
      );
    }
  }
  if (summary.stability && !summary.stability.stable) {
    recommendations.push(
      `${summary.stability.flakyTests.length} flaky test(s) detected: Review for race conditions and add proper waits`
    );
  }
  return recommendations;
}
function formatVerifySummary(summary) {
  const lines = [];
  const statusIcon = summary.status === "passed" ? "\u2705" : summary.status === "flaky" ? "\u26A0\uFE0F" : "\u274C";
  lines.push(`${statusIcon} Verification ${summary.status.toUpperCase()}`);
  lines.push("");
  if (summary.journeyId) {
    lines.push(`Journey: ${summary.journeyId}`);
  }
  lines.push(`Duration: ${Math.round(summary.duration / 1e3)}s`);
  lines.push("");
  lines.push("## Results");
  lines.push(`- Total: ${summary.counts.total}`);
  lines.push(`- Passed: ${summary.counts.passed}`);
  lines.push(`- Failed: ${summary.counts.failed}`);
  lines.push(`- Skipped: ${summary.counts.skipped}`);
  lines.push(`- Flaky: ${summary.counts.flaky}`);
  lines.push("");
  if (summary.failures.tests.length > 0) {
    lines.push("## Failed Tests");
    for (const test of summary.failures.tests) {
      lines.push(`- ${test}`);
    }
    lines.push("");
  }
  if (summary.stability) {
    lines.push("## Stability");
    lines.push(`- Stable: ${summary.stability.stable ? "Yes" : "No"}`);
    lines.push(`- Flaky Rate: ${Math.round(summary.stability.flakyRate * 100)}%`);
    lines.push("");
  }
  const recommendations = getRecommendations(summary);
  if (recommendations.length > 0) {
    lines.push("## Recommendations");
    for (const rec of recommendations) {
      lines.push(`- ${rec}`);
    }
  }
  return lines.join("\n");
}
function saveSummary(summary, outputPath) {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(summary, null, 2), "utf-8");
}

// src/index.ts
init_heal();
var CURRENT_CONFIG_VERSION = 1;
async function installAutogenInstance(options) {
  const {
    rootDir,
    projectName = "my-project",
    baseUrl = "http://localhost:3000",
    testIdAttribute = "data-testid",
    skipIfExists = false,
    includeExample = true,
    force = false
  } = options;
  const result = {
    success: true,
    created: [],
    skipped: [],
    errors: []
  };
  try {
    const directories = [
      "journeys",
      "tests/journeys",
      "tests/modules",
      ".artk"
    ];
    for (const dir of directories) {
      const fullPath = join(rootDir, dir);
      if (existsSync(fullPath)) {
        if (skipIfExists && !force) {
          result.skipped.push(dir);
          continue;
        }
      } else {
        mkdirSync(fullPath, { recursive: true });
        result.created.push(dir);
      }
    }
    const configPath = join(rootDir, "autogen.config.yml");
    if (!existsSync(configPath) || force) {
      const config = {
        version: CURRENT_CONFIG_VERSION,
        project: projectName,
        baseUrl,
        testIdAttribute,
        paths: {
          journeys: "journeys",
          tests: "tests/journeys",
          modules: "tests/modules"
        },
        healing: {
          enabled: true,
          maxAttempts: 3
        },
        validation: {
          requireClarified: true,
          forbiddenPatterns: [
            "page\\.waitForTimeout",
            "force:\\s*true"
          ]
        }
      };
      writeFileSync(configPath, stringify(config));
      result.created.push("autogen.config.yml");
    } else if (skipIfExists) {
      result.skipped.push("autogen.config.yml");
    }
    const gitignorePath = join(rootDir, ".artk/.gitignore");
    if (!existsSync(gitignorePath) || force) {
      writeFileSync(gitignorePath, [
        "# ARTK temporary files",
        "heal-logs/",
        "*.heal.json",
        "selector-catalog.local.json"
      ].join("\n"));
      result.created.push(".artk/.gitignore");
    } else if (skipIfExists) {
      result.skipped.push(".artk/.gitignore");
    }
    const glossaryPath = join(rootDir, ".artk/glossary.yml");
    if (!existsSync(glossaryPath) || force) {
      const glossary = {
        terms: [],
        aliases: {}
      };
      writeFileSync(glossaryPath, stringify(glossary));
      result.created.push(".artk/glossary.yml");
    } else if (skipIfExists) {
      result.skipped.push(".artk/glossary.yml");
    }
    if (includeExample) {
      const examplePath = join(rootDir, "journeys/EXAMPLE-001.md");
      if (!existsSync(examplePath) || force) {
        const exampleJourney = `---
id: EXAMPLE-001
title: Example Journey
status: proposed
tier: smoke
scope: example
actor: user
tags:
  - example
  - smoke
tests: []
modules: []
---

# Example Journey

## Overview
This is an example Journey to demonstrate the format.

## Preconditions
- User is on the home page

## Acceptance Criteria
- [ ] AC1: User can see the welcome message

## Steps
1. Navigate to the home page
2. Verify the welcome message is visible
`;
        writeFileSync(examplePath, exampleJourney);
        result.created.push("journeys/EXAMPLE-001.md");
      } else if (skipIfExists) {
        result.skipped.push("journeys/EXAMPLE-001.md");
      }
    }
    const vscodePath = join(rootDir, ".vscode");
    if (!existsSync(vscodePath)) {
      mkdirSync(vscodePath, { recursive: true });
    }
    const settingsPath = join(vscodePath, "settings.json");
    if (!existsSync(settingsPath) || force) {
      const settings = {
        "files.associations": {
          "*.journey.md": "markdown"
        },
        "editor.quickSuggestions": {
          strings: true
        },
        "chat.promptFilesRecommendations": {
          "artk.init-playbook": true,
          "artk.discover-foundation": true,
          "artk.journey-propose": true,
          "artk.journey-define": true,
          "artk.journey-clarify": true,
          "artk.testid-audit": true,
          "artk.journey-implement": true,
          "artk.journey-validate": true,
          "artk.journey-verify": true
        }
      };
      writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
      result.created.push(".vscode/settings.json");
    } else if (skipIfExists) {
      result.skipped.push(".vscode/settings.json");
    }
  } catch (error) {
    result.success = false;
    result.errors.push(String(error));
  }
  return result;
}
var CURRENT_CONFIG_VERSION2 = 1;
async function upgradeAutogenInstance(options) {
  const {
    rootDir,
    toVersion = CURRENT_CONFIG_VERSION2,
    backup = true,
    dryRun = false
  } = options;
  const result = {
    success: true,
    fromVersion: 0,
    toVersion,
    changes: [],
    errors: []
  };
  try {
    const configPath = join(rootDir, "autogen.config.yml");
    if (!existsSync(configPath)) {
      throw new Error("No autogen.config.yml found. Run install first.");
    }
    const configContent = readFileSync(configPath, "utf-8");
    const config = parse(configContent);
    result.fromVersion = config.version || 0;
    if (result.fromVersion >= toVersion) {
      result.changes.push({
        type: "config",
        path: configPath,
        description: `Already at version ${result.fromVersion}, no upgrade needed`
      });
      return result;
    }
    if (backup && !dryRun) {
      const backupPath = `${configPath}.backup-v${result.fromVersion}`;
      writeFileSync(backupPath, configContent);
      result.backupPath = backupPath;
      result.changes.push({
        type: "file",
        path: backupPath,
        description: "Created config backup"
      });
    }
    const migrationResult = migrateConfig(config, toVersion);
    for (const migration of migrationResult.migrationsApplied) {
      result.changes.push({
        type: "config",
        path: configPath,
        description: migration
      });
    }
    if (!dryRun) {
      writeFileSync(configPath, stringify(migrationResult.config));
    }
    result.changes.push({
      type: "config",
      path: configPath,
      description: `Upgraded config from v${result.fromVersion} to v${toVersion}`
    });
    const versionUpgrades = getVersionUpgrades(result.fromVersion, toVersion);
    for (const upgrade of versionUpgrades) {
      if (!dryRun) {
        await upgrade.apply(rootDir);
      }
      result.changes.push({
        type: upgrade.type,
        path: upgrade.path,
        description: upgrade.description
      });
    }
  } catch (error) {
    result.success = false;
    result.errors.push(String(error));
  }
  return result;
}
var MIGRATIONS = [
  // Future migrations go here
  // {
  //   fromVersion: 1,
  //   toVersion: 2,
  //   description: 'Rename selectorPolicy to locatorPolicy',
  //   migrate: (config) => {
  //     if (config.selectorPolicy) {
  //       config.locatorPolicy = config.selectorPolicy;
  //       delete config.selectorPolicy;
  //     }
  //     return config;
  //   },
  // },
];
function migrateConfig(config, toVersion = CURRENT_CONFIG_VERSION2) {
  const fromVersion = config.version || 0;
  let currentConfig = { ...config };
  const migrationsApplied = [];
  if (fromVersion === toVersion) {
    return {
      migrated: false,
      fromVersion,
      toVersion: fromVersion,
      migrationsApplied: [],
      config: currentConfig
    };
  }
  for (const migration of MIGRATIONS) {
    if (migration.fromVersion >= fromVersion && migration.toVersion <= toVersion) {
      currentConfig = migration.migrate(currentConfig);
      migrationsApplied.push(migration.description);
    }
  }
  currentConfig.version = toVersion;
  return {
    migrated: true,
    fromVersion,
    toVersion,
    migrationsApplied,
    config: currentConfig
  };
}
function getVersionUpgrades(_fromVersion, _toVersion) {
  const upgrades = [];
  return upgrades;
}
function needsMigration(config) {
  const version = config.version || 0;
  return version < CURRENT_CONFIG_VERSION2;
}
function isVersionSupported(version) {
  return version >= 1 && version <= CURRENT_CONFIG_VERSION2;
}
async function generateJourneyTests(options) {
  const {
    journeys,
    isFilePaths = true,
    config,
    generateModules = false,
    testOptions = {},
    moduleOptions = {},
    useLlkb = true
  } = options;
  const result = {
    tests: [],
    modules: [],
    warnings: [],
    errors: []
  };
  if (useLlkb) {
    const llkbLoaded = await initializeLlkb();
    if (llkbLoaded) {
      result.llkbEnabled = true;
    }
  }
  let resolvedConfig;
  if (config) {
    if (typeof config === "string") {
      try {
        resolvedConfig = loadConfig(config);
      } catch (err2) {
        result.errors.push(`Failed to load config: ${err2 instanceof Error ? err2.message : String(err2)}`);
      }
    } else {
      resolvedConfig = config;
    }
  }
  for (const journey of journeys) {
    try {
      const parsed = isFilePaths ? parseJourney(journey) : parseJourneyContent(journey, "inline");
      const normalized = normalizeJourney(parsed);
      result.warnings.push(...normalized.warnings);
      const testResult = generateTest(normalized.journey, testOptions);
      result.tests.push({
        journeyId: testResult.journeyId,
        filename: testResult.filename,
        code: testResult.code
      });
      if (generateModules) {
        const moduleResult = generateModule(normalized.journey, moduleOptions);
        result.modules.push({
          moduleName: moduleResult.moduleName,
          filename: moduleResult.filename,
          code: moduleResult.code
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(`Failed to process journey ${journey}: ${errorMessage}`);
    }
  }
  return result;
}
function generateTestFromIR(journey, options) {
  return generateTest(journey, options);
}
function regenerateTestWithBlocks(journey, existingCode, options) {
  return generateTest(journey, {
    ...options,
    strategy: "blocks",
    existingCode
  });
}
function generateModuleFromIR(journey, options) {
  return generateModule(journey, options);
}
function parseAndNormalize(filePath) {
  const parsed = parseJourney(filePath);
  const normalized = normalizeJourney(parsed);
  return {
    journey: normalized.journey,
    warnings: normalized.warnings
  };
}
var VERSION = "1.0.0";
async function validateJourney(journeyInput, options = {}) {
  const { isFilePath = true, runLint = false, ...validationOptions } = options;
  try {
    const parsed = isFilePath ? parseJourney(journeyInput) : parseJourneyContent(journeyInput, "inline");
    const normalized = normalizeJourney(parsed);
    const testResult = generateTest(normalized.journey);
    const validationResult = runLint ? await validateCode(testResult.code, normalized.journey, parsed.frontmatter, validationOptions) : validateCodeSync(testResult.code, normalized.journey, parsed.frontmatter, validationOptions);
    return {
      ...validationResult,
      generatedCode: testResult.code
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      valid: false,
      journeyId: options.journeyId || "unknown",
      issues: [
        {
          code: "JOURNEY_PARSE_ERROR",
          message: `Failed to parse or generate: ${errorMessage}`,
          severity: "error"
        }
      ],
      counts: { errors: 1, warnings: 0, info: 0 },
      details: {
        patterns: { valid: false, violationCount: 0 }
      },
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
}
async function validateJourneys(journeys, options = {}) {
  const results = /* @__PURE__ */ new Map();
  for (const journey of journeys) {
    const result = await validateJourney(journey, options);
    results.set(result.journeyId, result);
  }
  return results;
}
async function verifyJourney(journeyInput, options = {}) {
  const {
    isFilePath = true,
    outputDir,
    checkStability: checkStability2 = false,
    stabilityRuns = 3,
    heal = false,
    maxHealAttempts = 3,
    ...runnerOptions
  } = options;
  try {
    const parsed = isFilePath ? parseJourney(journeyInput) : parseJourneyContent(journeyInput, "inline");
    const journeyId = parsed.frontmatter.id;
    const normalized = normalizeJourney(parsed);
    const testResult = generateTest(normalized.journey);
    const testDir = outputDir || join(tmpdir(), `autogen-verify-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    const testFilePath = join(testDir, testResult.filename);
    writeFileSync(testFilePath, testResult.code, "utf-8");
    const runResult = runPlaywrightSync({
      ...runnerOptions,
      testFile: testFilePath,
      cwd: testDir,
      repeatEach: checkStability2 ? stabilityRuns : void 0,
      failOnFlaky: checkStability2
    });
    let summary = generateVerifySummary(runResult, {
      journeyId
    });
    let healingResult;
    if (heal && summary.status === "failed") {
      const { runHealingLoop: runHealingLoop2, DEFAULT_HEALING_CONFIG: DEFAULT_HEALING_CONFIG2 } = await Promise.resolve().then(() => (init_heal(), heal_exports));
      const healResult = await runHealingLoop2({
        journeyId,
        testFile: testFilePath,
        outputDir: testDir,
        config: {
          ...DEFAULT_HEALING_CONFIG2,
          maxAttempts: maxHealAttempts
        },
        verifyFn: async () => {
          const rerunResult = runPlaywrightSync({
            ...runnerOptions,
            testFile: testFilePath,
            cwd: testDir
          });
          return generateVerifySummary(rerunResult, { journeyId });
        }
      });
      healingResult = {
        attempted: true,
        success: healResult.success,
        attempts: healResult.attempts,
        appliedFix: healResult.appliedFix,
        logPath: healResult.logPath
      };
      if (healResult.success) {
        const finalResult = runPlaywrightSync({
          ...runnerOptions,
          testFile: testFilePath,
          cwd: testDir
        });
        summary = generateVerifySummary(finalResult, { journeyId });
      }
    }
    return {
      ...summary,
      generatedCode: testResult.code,
      testFilePath,
      healing: healingResult
    };
  } catch {
    return {
      status: "error",
      journeyId: options.journeyId,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      duration: 0,
      counts: { total: 0, passed: 0, failed: 0, skipped: 0, flaky: 0 },
      failures: {
        tests: [],
        classifications: {},
        stats: {}
      },
      runner: { exitCode: 1, command: "" }
    };
  }
}
async function verifyJourneys(journeys, options = {}) {
  const results = /* @__PURE__ */ new Map();
  for (const journey of journeys) {
    const result = await verifyJourney(journey, options);
    results.set(result.journeyId || journey, result);
  }
  return results;
}

export { AutogenConfigSchema, BLOCK_END, BLOCK_ID_PATTERN, BLOCK_START, CSSDebtEntrySchema, CodedError, ComponentEntrySchema, ConfigLoadError, DEFAULT_HEALING_CONFIG, DEFAULT_HEALING_RULES, DEFAULT_SELECTOR_PRIORITY, ELEMENT_TYPE_STRATEGIES, EslintRulesSchema, EslintSeveritySchema, FORBIDDEN_PATTERNS, HINTS_SECTION_PATTERN, HINT_BLOCK_PATTERN, HINT_PATTERNS, HealSchema, HealingLogger, IR, JourneyBuilder, JourneyFrontmatterSchema, JourneyParseError, JourneyStatusSchema, LLKBIntegrationLevelSchema, LLKBIntegrationSchema, LocatorBuilder, NAMEABLE_ROLES, PATTERN_VERSION, PLAYWRIGHT_LINT_RULES, PageEntrySchema, PathsSchema, RegenerationStrategySchema, SelectorCatalogSchema, SelectorEntrySchema, SelectorPolicySchema, SelectorStrategySchema, StepBuilder, TAG_PATTERNS, UNHEALABLE_CATEGORIES, VALID_ROLES, VERSION, ValidationSchema, ValueBuilder, __test_checkFeature, addCleanupHook, addExactToLocator, addLocatorProperty, addMethod, addNamedImport, addNavigationWaitAfterClick, addRunIdVariable, addSelector, addTimeout, addToRegistry, aggregateHealingLogs, allPatterns, andThen, applyDataFix, applyNavigationFix, applySelectorFix, applyTimingFix, authPatterns, buildPlaywrightArgs, categorizeTags, checkPatterns, checkStability, checkTestSyntax, classifyError, classifyTestResult, classifyTestResults, clearDebt, clearExtendedGlossary, clickPatterns, codedError, collect, compareARIASnapshots, compareLocators, completionSignalsToAssertions, containsCSSSelector, containsHints, convertToWebFirstAssertion, createCssSelector, createEmptyCatalog, createEvidenceDir, createHealingReport, createLocatorFromMatch, createProject, createRegistry, createValueFromText, defaultGlossary, describeLocator, describePrimitive, err, escapeRegex, escapeSelector, escapeString, evaluateHealing, extendedAssertionPatterns, extendedClickPatterns, extendedFillPatterns, extendedNavigationPatterns, extendedSelectPatterns, extendedWaitPatterns, extractCSSSelector, extractClassStructure, extractErrorMessages, extractErrorStacks, extractHintValue, extractHints, extractManagedBlocks, extractModuleDefinition, extractName, extractNameFromSelector, extractTestDataPatterns, extractTestResults, extractTimeoutFromError, extractUrlFromError, extractUrlFromGoto, fillPatterns, filterBySeverity, findACReferences, findByComponent, findByPage, findByTestId, findClass, findConfigFile, findEntriesByScope, findEntry, findInSnapshot, findLabelAlias, findMatchingPatterns, findMethod, findModuleMethod, findProperty, findSelectorById, findTestSteps, findTestsByTag, findTestsByTitle, fixMissingAwait, fixMissingGotoAwait, focusPatterns, formatARIATree, formatHealingLog, formatTestResult, formatVerifySummary, generateARIACaptureCode, generateClassificationReport, generateCoverageReport, generateDebtMarkdown, generateDebtReport, generateESLintConfig, generateEvidenceCaptureCode, generateEvidenceReport, generateExpectedTags, generateFileHeader, generateIndexContent, generateJourneyTests, generateLabelLocator, generateLocatorFromHints, generateMarkdownSummary, generateMigrationPlan, generateModule, generateModuleCode, generateModuleFromIR, generateRoleLocator, generateRunId, generateStabilityReport, generateSummaryFromReport, generateTest, generateTestCode, generateTestFromIR, generateTestIdLocator, generateTextLocator, generateToHaveURL, generateValidationReport, generateVerifySummary, generateWaitForURL, getAllPatternNames, getAllTestIds, getApplicableRules, getBrandingComment, getCSSDebt, getCatalog, getDefaultConfig, getFailedStep, getFailedTests, getFailureStats, getFlakinessScore, getFlakyTests, getGeneratedTimestamp, getGlossary, getGlossaryStats, getHealableFailures, getHealingRecommendation, getImport, getLabelAliases, getLocatorFromLabel, getMappingStats, getModuleMethods, getModuleNames, getNextFix, getPackageVersion, getPatternCountByCategory, getPatternMatches, getPatternMetadata, getPatternStats2 as getPatternStats, getPlaywrightVersion, getPostHealingRecommendation, getRecommendations, getRecommendedStrategies, getRegistryStats, getSchemaVersion, getSelectorPriority, getSummary, getSynonyms, getTestCount, getViolationSummary, hasBehaviorHints, hasDataIsolation, hasErrorViolations, hasExtendedGlossary, hasFailures, hasImport, hasLintErrors, hasLocatorHints, hasModule, hasNavigationWait, hasTestId, hoverPatterns, inferBestSelector, inferButtonSelector, inferCheckboxSelector, inferElementType, inferHeadingSelector, inferInputSelector, inferLinkSelector, inferRole, inferRoleFromSelector, inferSelectorWithCatalog, inferSelectors, inferSelectorsWithCatalog, inferTabSelector, inferTestIdSelector, inferTextSelector, inferUrlPattern, initGlossary, initializeLlkb, injectManagedBlocks, insertNavigationWait, installAutogenInstance, isCategoryHealable, isCodeValid, isCssLocator, isESLintAvailable, isErr, isFixAllowed, isFixForbidden, isForbiddenSelector, isHealable, isJourneyReady, isLlkbAvailable, isOk, isPlaywrightAvailable, isPlaywrightPluginAvailable, isReportSuccessful, isRoleLocator, isSemanticLocator, isSynonymOf, isTestIdLocator, isTestStable, isValidRole, isVerificationPassed, isVersionSupported, lintCode, lintFile, loadCatalog, loadConfig, loadConfigWithMigration, loadConfigs, loadEvidence, loadExtendedGlossary, loadGlossary, loadHealingLog, loadLLKBConfig, loadRegistry, loadSourceFile, lookupCoreGlossary, lookupGlossary, map, mapAcceptanceCriterion, mapErr, mapProceduralStep, mapStepText, mapSteps, matchPattern, mergeConfigs, mergeGlossaries, mergeModuleFiles, mergeWithInferred, namespaceEmail, namespaceName, navigationPatterns, needsConfigMigration, needsMigration, normalizeJourney, normalizeStepText, ok, parseAndNormalize, parseBoolSafe, parseESLintOutput, parseEnumSafe, parseFloatSafe, parseHints, parseIndexFile, parseIntSafe, parseIntSafeAllowNegative, parseJourney, parseJourneyContent, parseJourneyForAutoGen, parseModuleHint, parseReportContent, parseReportFile, parseSelectorToLocator, parseStructuredSteps, parseTagsFromCode, parseTagsFromFrontmatter, parseWithValidator, partition, previewHealingFixes, quickScanTestIds, quickStabilityCheck, recordCSSDebt, regenerateTestWithBlocks, removeDebt, removeFromRegistry, removeHints, removeSelector, replaceHardcodedEmail, replaceHardcodedTestData, reportHasFlaky, resetCatalogCache, resetGlossaryCache, resolveCanonical, resolveConfigPath, resolveModuleMethod, runHealingLoop, runJourneyTests, runPlaywrightAsync, runPlaywrightSync, runTestFile, saveCatalog, saveEvidence, saveRegistry, saveSummary, scanForTestIds, scanForbiddenPatterns, scanModulesDirectory, scanResultsToIssues, scoreLocator, searchSelectors, selectBestLocator, selectPatterns, serializeJourney, serializePrimitive, serializeStep, shouldQuarantine, structuredPatterns, suggestImprovements, suggestReplacement, suggestSelector, suggestSelectorApproach, suggestTimeoutIncrease, summarizeJourney, summaryHasFlaky, thoroughStabilityCheck, toPlaywrightLocator, toastPatterns, tryCatch, tryCatchAsync, tryParseJourneyContent, unwrap, unwrapOr, updateDebtPriority, updateIndexFile, updateModuleFile, upgradeAutogenInstance, urlPatterns, validateCatalog, validateCode, validateCodeCoverage, validateCodeSync, validateHints, validateIRCoverage, validateJourney, validateJourneyForCodeGen, validateJourneyFrontmatter, validateJourneySchema, validateJourneyStatus, validateJourneyTags, validateJourneyTier, validateJourneys, validateLocator, validateSyntax, validateTags, validateTagsInCode, verifyJourney, verifyJourneys, visibilityPatterns, waitPatterns, wouldFixApply, wrapInBlock, wrapWithExpectPoll, wrapWithExpectToPass, writeAndRunTest };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map