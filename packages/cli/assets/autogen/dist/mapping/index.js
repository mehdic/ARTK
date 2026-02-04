import { existsSync, readFileSync, mkdirSync, writeFileSync, unlinkSync, appendFileSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { pathToFileURL } from 'url';
import { parse } from 'yaml';
import { z } from 'zod';

var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
function buildSynonymMap(glossary) {
  const map = /* @__PURE__ */ new Map();
  for (const entry of glossary.entries) {
    map.set(entry.canonical.toLowerCase(), entry.canonical);
    for (const synonym of entry.synonyms) {
      map.set(synonym.toLowerCase(), entry.canonical);
    }
  }
  return map;
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
  } catch (err) {
    return {
      loaded: false,
      entryCount: 0,
      exportedAt: null,
      error: `Failed to load glossary: ${err instanceof Error ? err.message : String(err)}`
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
function getHarnessRoot() {
  if (cachedHarnessRoot) {
    return cachedHarnessRoot;
  }
  const envRoot = process.env["ARTK_HARNESS_ROOT"];
  if (envRoot && existsSync(envRoot)) {
    cachedHarnessRoot = envRoot;
    return cachedHarnessRoot;
  }
  const artkE2eFromCwd = join(process.cwd(), "artk-e2e");
  if (existsSync(artkE2eFromCwd)) {
    cachedHarnessRoot = artkE2eFromCwd;
    return cachedHarnessRoot;
  }
  const configInCwd = join(process.cwd(), "artk.config.yml");
  if (existsSync(configInCwd)) {
    cachedHarnessRoot = process.cwd();
    return cachedHarnessRoot;
  }
  let searchDir = process.cwd();
  const root = dirname(searchDir);
  while (searchDir !== root) {
    if (existsSync(join(searchDir, "artk.config.yml"))) {
      cachedHarnessRoot = searchDir;
      return cachedHarnessRoot;
    }
    const sibling = join(searchDir, "artk-e2e");
    if (existsSync(sibling)) {
      cachedHarnessRoot = sibling;
      return cachedHarnessRoot;
    }
    searchDir = dirname(searchDir);
  }
  cachedHarnessRoot = process.cwd();
  return cachedHarnessRoot;
}
function getLlkbRoot(explicitRoot) {
  if (explicitRoot) {
    return explicitRoot;
  }
  return join(getHarnessRoot(), ".artk", "llkb");
}
function getArtkDir(explicitBaseDir) {
  if (explicitBaseDir) {
    return join(explicitBaseDir, ".artk");
  }
  return join(getHarnessRoot(), ".artk");
}
var cachedHarnessRoot;
var init_paths = __esm({
  "src/utils/paths.ts"() {
  }
});

// src/mapping/patternDistance.ts
function levenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          // substitution
          matrix[i][j - 1] + 1,
          // insertion
          matrix[i - 1][j] + 1
          // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}
function calculateSimilarity(a, b) {
  const distance = levenshteinDistance(a.toLowerCase(), b.toLowerCase());
  const maxLength = Math.max(a.length, b.length);
  if (maxLength === 0) return 1;
  return 1 - distance / maxLength;
}
function generateExampleFromRegex(regex, patternName) {
  void regex.source;
  if (patternName.includes("navigate")) {
    return "User navigates to /path";
  }
  if (patternName.includes("click")) {
    return 'User clicks "Button" button';
  }
  if (patternName.includes("fill") || patternName.includes("enter") || patternName.includes("type")) {
    return 'User enters "value" in "Field" field';
  }
  if (patternName.includes("see") || patternName.includes("visible") || patternName.includes("expect")) {
    return 'User should see "Content"';
  }
  if (patternName.includes("wait")) {
    return "Wait for network idle";
  }
  return `Step matching ${patternName}`;
}
function findNearestPattern(text, patterns) {
  let nearest = null;
  let minDistance = Infinity;
  const normalizedText = text.toLowerCase().trim();
  const patternArray = patterns instanceof Map ? Array.from(patterns.entries()) : patterns.map((p) => [p.name, p]);
  for (const [name, pattern] of patternArray) {
    const examples = "examples" in pattern && pattern.examples ? pattern.examples : [generateExampleFromRegex(pattern.regex, pattern.name)];
    for (const example of examples) {
      const distance = levenshteinDistance(normalizedText, example.toLowerCase());
      if (distance < minDistance) {
        minDistance = distance;
        nearest = {
          name,
          distance,
          exampleMatch: example,
          mismatchReason: explainMismatch(text, pattern)
        };
      }
    }
  }
  if (nearest && nearest.exampleMatch) {
    const similarity = calculateSimilarity(text, nearest.exampleMatch);
    if (similarity > 0.5) {
      return nearest;
    }
  }
  return null;
}
function explainMismatch(text, pattern) {
  const reasons = [];
  const lowerText = text.toLowerCase();
  const requiredKeywords = "requiredKeywords" in pattern ? pattern.requiredKeywords : inferRequiredKeywords(pattern);
  if (requiredKeywords) {
    const missing = requiredKeywords.filter(
      (kw) => !lowerText.includes(kw.toLowerCase())
    );
    if (missing.length > 0) {
      reasons.push(`Missing keywords: ${missing.join(", ")}`);
    }
  }
  if (!text.includes("(") && !text.includes("testid=") && !text.includes("role=")) {
    reasons.push("Missing locator hint (e.g., testid=..., role=button)");
  }
  if (pattern.primitiveType === "click" && !text.match(/['"].+?['"]/)) {
    reasons.push("Target element name not quoted");
  }
  return reasons.length > 0 ? reasons.join("; ") : "Pattern format mismatch";
}
function inferRequiredKeywords(pattern) {
  const name = pattern.name.toLowerCase();
  if (name.includes("navigate")) {
    return ["navigate", "go", "open"];
  }
  if (name.includes("click")) {
    return ["click", "press", "tap"];
  }
  if (name.includes("fill") || name.includes("enter")) {
    return ["enter", "type", "fill", "input"];
  }
  if (name.includes("see") || name.includes("visible")) {
    return ["see", "visible", "shown"];
  }
  if (name.includes("wait")) {
    return ["wait"];
  }
  return void 0;
}
var init_patternDistance = __esm({
  "src/mapping/patternDistance.ts"() {
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
  const root = getLlkbRoot(llkbRoot);
  return join(root, PATTERNS_FILE);
}
function generatePatternId() {
  return `LP${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
}
function loadLearnedPatterns(options = {}) {
  const llkbRoot = getLlkbRoot(options.llkbRoot);
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
  const z2 = 1.96;
  const n = total;
  const denominator = 1 + z2 * z2 / n;
  const center = p + z2 * z2 / (2 * n);
  const spread = z2 * Math.sqrt((p * (1 - p) + z2 * z2 / (4 * n)) / n);
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
function recordPatternFailure(originalText, _journeyId, options = {}) {
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
  const minConfidence = options.minConfidence ?? 0.5;
  const minSimilarity = options.minSimilarity ?? 0.7;
  const useFuzzyMatch = options.useFuzzyMatch ?? true;
  const exactMatch = patterns.find(
    (p) => p.normalizedText === normalizedText && p.confidence >= minConfidence && !p.promotedToCore
  );
  if (exactMatch) {
    return {
      patternId: exactMatch.id,
      primitive: exactMatch.mappedPrimitive,
      confidence: exactMatch.confidence
    };
  }
  if (useFuzzyMatch) {
    let bestMatch = null;
    let bestSimilarity = 0;
    for (const pattern of patterns) {
      if (pattern.promotedToCore || pattern.confidence < minConfidence) {
        continue;
      }
      const similarity = calculateSimilarity(normalizedText, pattern.normalizedText);
      if (similarity >= minSimilarity && similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = pattern;
      }
    }
    if (bestMatch) {
      const adjustedConfidence = bestMatch.confidence * bestSimilarity;
      return {
        patternId: bestMatch.id,
        primitive: bestMatch.mappedPrimitive,
        confidence: adjustedConfidence
      };
    }
  }
  return null;
}
function generateRegexFromText(text) {
  const pattern = text.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/"[^"]+"/g, '"([^"]+)"').replace(/'[^']+'/g, "'([^']+)'").replace(/\b(the|a|an)\b/g, "(?:$1\\s+)?").replace(/^user\s+/, "(?:user\\s+)?").replace(/\bclicks?\b/g, "clicks?").replace(/\bfills?\b/g, "fills?").replace(/\bselects?\b/g, "selects?").replace(/\btypes?\b/g, "types?").replace(/\bsees?\b/g, "sees?").replace(/\bwaits?\b/g, "waits?");
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
var PATTERNS_FILE, patternCache, CACHE_TTL_MS;
var init_patternExtension = __esm({
  "src/llkb/patternExtension.ts"() {
    init_glossary();
    init_paths();
    init_patternDistance();
    PATTERNS_FILE = "learned-patterns.json";
    patternCache = null;
    CACHE_TTL_MS = 5e3;
  }
});

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
  },
  {
    name: "wait-for-url-change",
    // "Wait for URL to change to '/dashboard'" or "Wait until URL contains '/settings'"
    regex: /^(?:user\s+)?waits?\s+(?:for\s+)?(?:the\s+)?url\s+(?:to\s+)?(?:change\s+to|contain|include)\s+["']?([^"']+)["']?$/i,
    primitiveType: "waitForURL",
    extract: (match) => ({
      type: "waitForURL",
      pattern: match[1]
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
    name: "click-menuitem-quoted",
    // "Click the 'Settings' menu item" or "Click on 'Edit' menuitem"
    regex: /^(?:user\s+)?(?:clicks?|selects?)\s+(?:on\s+)?(?:the\s+)?["']([^"']+)["']\s+menu\s*item$/i,
    primitiveType: "click",
    extract: (match) => ({
      type: "click",
      locator: createLocatorFromMatch("role", "menuitem", match[1])
    })
  },
  {
    name: "click-tab-quoted",
    // "Click the 'Details' tab" or "Select the 'Overview' tab"
    regex: /^(?:user\s+)?(?:clicks?|selects?)\s+(?:on\s+)?(?:the\s+)?["']([^"']+)["']\s+tab$/i,
    primitiveType: "click",
    extract: (match) => ({
      type: "click",
      locator: createLocatorFromMatch("role", "tab", match[1])
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
    name: "fill-placeholder-field",
    // "Fill 'test@example.com' in the field with placeholder 'Enter email'"
    // or "Type 'value' into input with placeholder 'Search'"
    regex: /^(?:user\s+)?(?:enters?|types?|fills?)\s+["']([^"']+)["']\s+(?:in|into)\s+(?:the\s+)?(?:field|input)\s+with\s+placeholder\s+["']([^"']+)["']$/i,
    primitiveType: "fill",
    extract: (match) => ({
      type: "fill",
      locator: createLocatorFromMatch("placeholder", match[2]),
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
    // "Check the terms checkbox" - unquoted checkbox name
    name: "check-checkbox-unquoted",
    regex: /^(?:user\s+)?(?:checks?|enables?|ticks?)\s+(?:the\s+)?(\w+(?:\s+\w+)*)\s+checkbox$/i,
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
  },
  {
    // "Uncheck the newsletter checkbox" - unquoted checkbox name
    name: "uncheck-checkbox-unquoted",
    regex: /^(?:user\s+)?(?:unchecks?|disables?|unticks?)\s+(?:the\s+)?(\w+(?:\s+\w+)*)\s+checkbox$/i,
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
  },
  {
    name: "status-message-visible",
    // "A status message 'Processing...' is visible" or "The status shows 'Loading'"
    regex: /^(?:a\s+)?status\s+(?:message\s+)?["']([^"']+)["']\s+(?:is\s+)?(?:visible|shown|displayed)$/i,
    primitiveType: "expectVisible",
    extract: (match) => ({
      type: "expectVisible",
      locator: createLocatorFromMatch("role", "status", match[1])
    })
  },
  {
    name: "verify-status-message",
    // "Verify the status message shows 'Complete'"
    regex: /^(?:verify|check)\s+(?:that\s+)?(?:the\s+)?status\s+(?:message\s+)?(?:shows?|displays?|contains?)\s+["']([^"']+)["']$/i,
    primitiveType: "expectVisible",
    extract: (match) => ({
      type: "expectVisible",
      locator: createLocatorFromMatch("role", "status", match[1])
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
  const cleanSelector = selector.replace(/^the\s+/i, "").trim();
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
  // ═══════════════════════════════════════════════════════════════════════════
  // MOST SPECIFIC: Negative assertions (must come before positive counterparts)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: "verify-not-visible",
    // "Verify the error container is not visible"
    regex: /^(?:verify|confirm|check)\s+(?:that\s+)?(?:the\s+)?["']?(.+?)["']?\s+is\s+not\s+visible$/i,
    primitiveType: "expectHidden",
    extract: (match) => ({
      type: "expectHidden",
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
  // ═══════════════════════════════════════════════════════════════════════════
  // URL AND TITLE: Specific patterns that match "URL" or "title" keywords
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: "verify-url-contains",
    // "Verify the URL contains '/dashboard'"
    regex: /^(?:verify|confirm|check)\s+(?:that\s+)?(?:the\s+)?url\s+contains?\s+["']([^"']+)["']$/i,
    primitiveType: "expectURL",
    extract: (match) => ({
      type: "expectURL",
      pattern: match[1]
    })
  },
  {
    name: "verify-title-is",
    // "Verify the page title is 'Settings'"
    regex: /^(?:verify|confirm|check)\s+(?:that\s+)?(?:the\s+)?(?:page\s+)?title\s+(?:is|equals?)\s+["']([^"']+)["']$/i,
    primitiveType: "expectTitle",
    extract: (match) => ({
      type: "expectTitle",
      title: match[1]
    })
  },
  // ═══════════════════════════════════════════════════════════════════════════
  // SPECIFIC STATE ASSERTIONS: enabled, disabled, checked, value, count
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: "verify-field-value",
    // "Verify the username field has value 'testuser'"
    regex: /^(?:verify|confirm|check)\s+(?:that\s+)?(?:the\s+)?["']?(\w+)["']?\s+(?:field\s+)?has\s+value\s+["']([^"']+)["']$/i,
    primitiveType: "expectValue",
    extract: (match) => ({
      type: "expectValue",
      locator: createLocatorFromMatch("label", match[1]),
      value: match[2]
    })
  },
  {
    name: "verify-element-enabled",
    // "Verify the submit button is enabled"
    regex: /^(?:verify|confirm|check)\s+(?:that\s+)?(?:the\s+)?["']?(.+?)["']?\s+(?:button\s+)?is\s+enabled$/i,
    primitiveType: "expectEnabled",
    extract: (match) => ({
      type: "expectEnabled",
      locator: createLocatorFromMatch("label", match[1])
    })
  },
  {
    name: "verify-element-disabled",
    // "Verify the disabled input is disabled"
    regex: /^(?:verify|confirm|check)\s+(?:that\s+)?(?:the\s+)?["']?(.+?)["']?\s+(?:input\s+)?is\s+disabled$/i,
    primitiveType: "expectDisabled",
    extract: (match) => ({
      type: "expectDisabled",
      locator: createLocatorFromMatch("label", match[1])
    })
  },
  {
    name: "verify-checkbox-checked",
    // "Verify the checkbox is checked"
    regex: /^(?:verify|confirm|check)\s+(?:that\s+)?(?:the\s+)?["']?(.+?)["']?\s+(?:checkbox\s+)?is\s+checked$/i,
    primitiveType: "expectChecked",
    extract: (match) => ({
      type: "expectChecked",
      locator: createLocatorFromMatch("label", match[1])
    })
  },
  {
    name: "verify-count",
    // "Verify 5 items are shown" or "Verify 3 elements exist"
    regex: /^(?:verify|confirm|check)\s+(?:that\s+)?(\d+)\s+(?:items?|elements?|rows?)\s+(?:are\s+)?(?:shown|displayed|exist|visible)$/i,
    primitiveType: "expectCount",
    extract: (match) => ({
      type: "expectCount",
      locator: { strategy: "text", value: "item" },
      count: parseInt(match[1], 10)
    })
  },
  // ═══════════════════════════════════════════════════════════════════════════
  // GENERIC VISIBILITY: Catch-all patterns for "is visible/displayed/showing"
  // These must come AFTER specific patterns to avoid over-matching
  // ═══════════════════════════════════════════════════════════════════════════
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
    // "Confirm that the message appears", "Verify success message appears", or "Confirm the error is shown"
    regex: /^(?:verify|confirm)\s+(?:that\s+)?(?:the\s+)?["']?(.+?)["']?\s+(?:appears?|is\s+shown|displays?)$/i,
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
  // ═══════════════════════════════════════════════════════════════════════════
  // GENERIC TEXT ASSERTIONS: "contains" patterns (must be last to avoid conflicts)
  // ═══════════════════════════════════════════════════════════════════════════
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
var modalAlertPatterns = [
  {
    name: "dismiss-modal",
    // "Dismiss the modal" or "Close the modal dialog"
    regex: /^(?:dismiss|close)\s+(?:the\s+)?(?:modal|dialog)(?:\s+dialog)?$/i,
    primitiveType: "dismissModal",
    extract: () => ({
      type: "dismissModal"
    })
  },
  {
    name: "accept-alert",
    // "Accept the alert" or "Click OK on alert"
    regex: /^(?:accept|confirm|ok)\s+(?:the\s+)?alert$/i,
    primitiveType: "acceptAlert",
    extract: () => ({
      type: "acceptAlert"
    })
  },
  {
    name: "dismiss-alert",
    // "Dismiss the alert" or "Cancel the alert"
    regex: /^(?:dismiss|cancel|close)\s+(?:the\s+)?alert$/i,
    primitiveType: "dismissAlert",
    extract: () => ({
      type: "dismissAlert"
    })
  }
];
var allPatterns = [
  ...structuredPatterns,
  ...authPatterns,
  ...toastPatterns,
  ...modalAlertPatterns,
  // Modal/alert patterns for dialog handling
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

// src/mapping/index.ts
init_glossary();

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

// src/mapping/index.ts
init_patternDistance();

// src/mapping/blockedStepAnalysis.ts
init_patternDistance();
function categorizeStep(text) {
  const lowerText = text.toLowerCase();
  if (lowerText.includes("navigate") || lowerText.includes("go to") || lowerText.includes("open") || lowerText.includes("visit")) {
    return "navigation";
  }
  if (lowerText.includes("click") || lowerText.includes("fill") || lowerText.includes("enter") || lowerText.includes("type") || lowerText.includes("select") || lowerText.includes("check") || lowerText.includes("press")) {
    return "interaction";
  }
  if (lowerText.includes("see") || lowerText.includes("visible") || lowerText.includes("verify") || lowerText.includes("assert") || lowerText.includes("confirm") || lowerText.includes("should") || lowerText.includes("expect")) {
    return "assertion";
  }
  if (lowerText.includes("wait") || lowerText.includes("load") || lowerText.includes("until") || lowerText.includes("appear")) {
    return "wait";
  }
  return "unknown";
}
function inferMachineHint(text) {
  const lowerText = text.toLowerCase();
  const quotedMatch = text.match(/['"]([^'"]+)['"]/);
  const elementName = quotedMatch?.[1];
  if (!elementName) return void 0;
  if (lowerText.includes("link")) {
    return `(role=link, name=${elementName})`;
  }
  if (lowerText.includes("button") || lowerText.includes("click")) {
    return `(role=button, name=${elementName})`;
  }
  if (lowerText.includes("field") || lowerText.includes("input") || lowerText.includes("enter") || lowerText.includes("type")) {
    return `(role=textbox, name=${elementName})`;
  }
  if (lowerText.includes("heading")) {
    return `(role=heading, name=${elementName})`;
  }
  if (lowerText.includes("checkbox")) {
    return `(role=checkbox, name=${elementName})`;
  }
  return `(text=${elementName})`;
}
function getNavigationSuggestions(text) {
  const suggestions = [];
  const urlMatch = text.match(/\/[a-zA-Z0-9/_-]+/);
  if (urlMatch) {
    suggestions.push({
      priority: 1,
      text: `User navigates to ${urlMatch[0]}`,
      explanation: "Standard navigation pattern",
      confidence: 0.9
    });
  } else {
    suggestions.push({
      priority: 1,
      text: "User navigates to /[path]",
      explanation: "Add explicit URL path",
      confidence: 0.5
    });
  }
  return suggestions;
}
function getInteractionSuggestions(text) {
  const suggestions = [];
  const quotedMatch = text.match(/['"]([^'"]+)['"]/);
  const elementName = quotedMatch?.[1] || "[element]";
  const lowerText = text.toLowerCase();
  if (lowerText.includes("click")) {
    suggestions.push({
      priority: 1,
      text: `User clicks '${elementName}' button \`(role=button, name=${elementName})\``,
      explanation: "Add role=button locator hint",
      confidence: 0.85
    });
  }
  if (lowerText.includes("fill") || lowerText.includes("enter") || lowerText.includes("type")) {
    const valueMatch = text.match(/['"]([^'"]+)['"]/);
    const value = valueMatch?.[1] || "value";
    suggestions.push({
      priority: 1,
      text: `User enters '${value}' in '${elementName}' field \`(role=textbox, name=${elementName})\``,
      explanation: "Add role=textbox locator hint",
      confidence: 0.85
    });
  }
  return suggestions;
}
function getAssertionSuggestions(text) {
  const suggestions = [];
  const quotedMatch = text.match(/['"]([^'"]+)['"]/);
  const content = quotedMatch?.[1] || "[content]";
  suggestions.push({
    priority: 1,
    text: `User should see '${content}' \`(text=${content})\``,
    explanation: "Standard visibility assertion",
    confidence: 0.8
  });
  suggestions.push({
    priority: 2,
    text: `**Assert**: '${content}' is visible \`(role=heading, name=${content})\``,
    explanation: "Structured assertion format with heading role",
    confidence: 0.7
  });
  return suggestions;
}
function getWaitSuggestions(_text) {
  const suggestions = [];
  suggestions.push({
    priority: 1,
    text: "Wait for network idle `(signal=networkidle)`",
    explanation: "Standard network wait pattern",
    confidence: 0.8
  });
  suggestions.push({
    priority: 2,
    text: "Wait for page to load `(signal=load)`",
    explanation: "Wait for load event",
    confidence: 0.7
  });
  return suggestions;
}
function getGenericSuggestions(text) {
  return [{
    priority: 1,
    text: `**Action**: ${text}`,
    explanation: "Use structured format with Action prefix",
    confidence: 0.5
  }];
}
function analyzeBlockedStep(step, reason, patterns) {
  const category = categorizeStep(step);
  const analysis = {
    step,
    reason,
    suggestions: [],
    category
  };
  if (patterns) {
    const nearest = findNearestPattern(step, patterns);
    if (nearest) {
      analysis.nearestPattern = nearest;
    }
  }
  switch (category) {
    case "navigation":
      analysis.suggestions = getNavigationSuggestions(step);
      break;
    case "interaction":
      analysis.suggestions = getInteractionSuggestions(step);
      analysis.machineHintSuggestion = inferMachineHint(step);
      break;
    case "assertion":
      analysis.suggestions = getAssertionSuggestions(step);
      break;
    case "wait":
      analysis.suggestions = getWaitSuggestions();
      break;
    default:
      analysis.suggestions = getGenericSuggestions(step);
  }
  return analysis;
}
function formatBlockedStepAnalysis(analysis) {
  const lines = [];
  lines.push(`
  Step: "${analysis.step}"`);
  lines.push(`  Category: ${analysis.category}`);
  lines.push(`  Reason: ${analysis.reason}`);
  if (analysis.nearestPattern) {
    lines.push(`  Nearest pattern: ${analysis.nearestPattern.name}`);
    lines.push(`  Example that works: "${analysis.nearestPattern.exampleMatch}"`);
    lines.push(`  Why it didn't match: ${analysis.nearestPattern.mismatchReason}`);
  }
  lines.push("  Suggestions:");
  for (const suggestion of analysis.suggestions) {
    lines.push(`    ${suggestion.priority}. ${suggestion.text}`);
    lines.push(`       (${suggestion.explanation}, confidence: ${(suggestion.confidence * 100).toFixed(0)}%)`);
  }
  if (analysis.machineHintSuggestion) {
    lines.push(`  Suggested hint: ${analysis.machineHintSuggestion}`);
  }
  return lines.join("\n");
}

// src/mapping/telemetry.ts
init_paths();
var TELEMETRY_FILE = "blocked-steps-telemetry.jsonl";
function getTelemetryPath(baseDir) {
  const artkDir = getArtkDir(baseDir);
  return join(artkDir, TELEMETRY_FILE);
}
function ensureTelemetryDir(telemetryPath) {
  const dir = dirname(telemetryPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}
function normalizeStepTextForTelemetry(text) {
  return text.toLowerCase().trim().replace(/\b(the|a|an)\b/g, "").replace(/\s+/g, " ").replace(/"[^"]*"/g, '""').replace(/'[^']*'/g, "''").trim();
}
function categorizeStepText(text) {
  const lower = text.toLowerCase();
  if (lower.includes("navigate") || lower.includes("go to") || lower.includes("open") || lower.includes("visit")) {
    return "navigation";
  }
  if (lower.includes("click") || lower.includes("fill") || lower.includes("enter") || lower.includes("type") || lower.includes("select") || lower.includes("check") || lower.includes("press") || lower.includes("submit") || lower.includes("input")) {
    return "interaction";
  }
  if (lower.includes("see") || lower.includes("visible") || lower.includes("verify") || lower.includes("assert") || lower.includes("confirm") || lower.includes("should") || lower.includes("ensure") || lower.includes("expect") || lower.includes("display")) {
    return "assertion";
  }
  if (lower.includes("wait") || lower.includes("load") || lower.includes("until")) {
    return "wait";
  }
  return "unknown";
}
function recordBlockedStep(record, options = {}) {
  const telemetryPath = getTelemetryPath(options.baseDir);
  ensureTelemetryDir(telemetryPath);
  const fullRecord = {
    ...record,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    normalizedText: normalizeStepTextForTelemetry(record.stepText),
    category: record.category || categorizeStepText(record.stepText)
  };
  appendFileSync(telemetryPath, JSON.stringify(fullRecord) + "\n");
}
function readBlockedStepRecords(options = {}) {
  const telemetryPath = getTelemetryPath(options.baseDir);
  if (!existsSync(telemetryPath)) {
    return [];
  }
  try {
    const content = readFileSync(telemetryPath, "utf-8");
    return content.split("\n").filter(Boolean).map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter((record) => record !== null);
  } catch {
    return [];
  }
}
function calculateTokenSimilarity(a, b) {
  const tokensA = new Set(a.split(" ").filter(Boolean));
  const tokensB = new Set(b.split(" ").filter(Boolean));
  if (tokensA.size === 0 && tokensB.size === 0) return 1;
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  const intersection = new Set([...tokensA].filter((x) => tokensB.has(x)));
  const union = /* @__PURE__ */ new Set([...tokensA, ...tokensB]);
  return intersection.size / union.size;
}
function groupBySimilarity(records, threshold = 0.7) {
  const groups = /* @__PURE__ */ new Map();
  const processed = /* @__PURE__ */ new Set();
  for (let i = 0; i < records.length; i++) {
    if (processed.has(i)) continue;
    const record = records[i];
    const normalized = record.normalizedText;
    const group = [record];
    processed.add(i);
    for (let j = i + 1; j < records.length; j++) {
      if (processed.has(j)) continue;
      const other = records[j];
      const similarity = calculateTokenSimilarity(normalized, other.normalizedText);
      if (similarity >= threshold) {
        group.push(other);
        processed.add(j);
      }
    }
    groups.set(normalized, group);
  }
  return groups;
}
function analyzeBlockedPatterns(options = {}) {
  const records = readBlockedStepRecords(options);
  if (records.length === 0) {
    return [];
  }
  const groups = groupBySimilarity(records);
  const gaps = [];
  for (const [normalizedText, groupRecords] of groups) {
    const timestamps = groupRecords.map((r) => r.timestamp).sort();
    const variants = [...new Set(groupRecords.map((r) => r.stepText))];
    gaps.push({
      exampleText: groupRecords[0].stepText,
      normalizedText,
      count: groupRecords.length,
      category: groupRecords[0].category,
      variants,
      suggestedPattern: generateSuggestedPattern(variants),
      firstSeen: timestamps[0],
      lastSeen: timestamps[timestamps.length - 1]
    });
  }
  gaps.sort((a, b) => b.count - a.count);
  return options.limit ? gaps.slice(0, options.limit) : gaps;
}
function generateSuggestedPattern(variants) {
  if (variants.length === 0) return void 0;
  const example = variants[0].toLowerCase();
  const pattern = example.replace(/"[^"]+"/g, '"([^"]+)"').replace(/'[^']+'/g, "'([^']+)'").replace(/[.*+?^${}()|[\]\\]/g, (char) => {
    if (char === "(" || char === ")" || char === "[" || char === "]" || char === "+") {
      return char;
    }
    return "\\" + char;
  });
  return `^(?:user\\s+)?${pattern}$`;
}
function getTelemetryStats(options = {}) {
  const records = readBlockedStepRecords(options);
  if (records.length === 0) {
    return {
      totalRecords: 0,
      uniquePatterns: 0,
      byCategory: {},
      dateRange: {
        earliest: "",
        latest: ""
      }
    };
  }
  const byCategory = {};
  const normalizedSet = /* @__PURE__ */ new Set();
  const timestamps = records.map((r) => r.timestamp).sort();
  for (const record of records) {
    byCategory[record.category] = (byCategory[record.category] || 0) + 1;
    normalizedSet.add(record.normalizedText);
  }
  return {
    totalRecords: records.length,
    uniquePatterns: normalizedSet.size,
    byCategory,
    dateRange: {
      earliest: timestamps[0],
      latest: timestamps[timestamps.length - 1]
    }
  };
}
function recordUserFix(originalStepText, userFixedText, options = {}) {
  const records = readBlockedStepRecords(options);
  const normalizedOriginal = normalizeStepTextForTelemetry(originalStepText);
  const matchingRecord = records.find((r) => r.normalizedText === normalizedOriginal && !r.userFix);
  if (matchingRecord) {
    const { timestamp: _t, normalizedText: _n, ...recordWithoutTimestamp } = matchingRecord;
    recordBlockedStep(
      {
        ...recordWithoutTimestamp,
        userFix: userFixedText
      },
      options
    );
  }
}
function clearTelemetry(options = {}) {
  const telemetryPath = getTelemetryPath(options.baseDir);
  if (existsSync(telemetryPath)) {
    unlinkSync(telemetryPath);
  }
}

// src/mapping/unifiedMatcher.ts
init_patternExtension();

// src/mapping/fuzzyMatcher.ts
init_patternDistance();

// src/mapping/normalize.ts
var VERB_STEMS = {
  // Click variants
  clicking: "click",
  clicked: "click",
  clicks: "click",
  // Fill variants
  filling: "fill",
  filled: "fill",
  fills: "fill",
  entering: "fill",
  entered: "fill",
  enters: "fill",
  typing: "fill",
  typed: "fill",
  types: "fill",
  // Select variants
  selecting: "select",
  selected: "select",
  selects: "select",
  choosing: "select",
  chose: "select",
  chosen: "select",
  chooses: "select",
  // Check variants
  checking: "check",
  checked: "check",
  checks: "check",
  // Uncheck variants
  unchecking: "uncheck",
  unchecked: "uncheck",
  unchecks: "uncheck",
  // Navigate variants
  navigating: "navigate",
  navigated: "navigate",
  navigates: "navigate",
  going: "navigate",
  went: "navigate",
  goes: "navigate",
  visiting: "navigate",
  visited: "navigate",
  visits: "navigate",
  opening: "navigate",
  opened: "navigate",
  opens: "navigate",
  // See/Verify variants
  seeing: "see",
  saw: "see",
  seen: "see",
  sees: "see",
  verifying: "verify",
  verified: "verify",
  verifies: "verify",
  confirming: "verify",
  confirmed: "verify",
  confirms: "verify",
  ensuring: "verify",
  ensured: "verify",
  ensures: "verify",
  // Wait variants
  waiting: "wait",
  waited: "wait",
  waits: "wait",
  // Submit variants
  submitting: "submit",
  submitted: "submit",
  submits: "submit",
  // Press variants
  pressing: "press",
  pressed: "press",
  presses: "press",
  // Hover variants
  hovering: "hover",
  hovered: "hover",
  hovers: "hover",
  // Scroll variants
  scrolling: "scroll",
  scrolled: "scroll",
  scrolls: "scroll",
  // Focus variants
  focusing: "focus",
  focused: "focus",
  focuses: "focus",
  // Drag variants
  dragging: "drag",
  dragged: "drag",
  drags: "drag",
  // Drop variants
  dropping: "drop",
  dropped: "drop",
  drops: "drop",
  // Clear variants
  clearing: "clear",
  cleared: "clear",
  clears: "clear",
  // Upload variants
  uploading: "upload",
  uploaded: "upload",
  uploads: "upload",
  // Download variants
  downloading: "download",
  downloaded: "download",
  downloads: "download",
  // Assert/Expect variants
  asserting: "assert",
  asserted: "assert",
  asserts: "assert",
  expecting: "expect",
  expected: "expect",
  expects: "expect",
  // Show/Display variants
  showing: "show",
  showed: "show",
  shown: "show",
  shows: "show",
  displaying: "display",
  displayed: "display",
  displays: "display",
  // Hide variants
  hiding: "hide",
  hid: "hide",
  hidden: "hide",
  hides: "hide",
  // Enable/Disable variants
  enabling: "enable",
  enabled: "enable",
  enables: "enable",
  disabling: "disable",
  disabled: "disable",
  disables: "disable",
  // Compound verb forms (hyphenated and spaced)
  "double-click": "dblclick",
  "double click": "dblclick",
  "double-clicking": "dblclick",
  "double clicking": "dblclick",
  "double-clicked": "dblclick",
  "double clicked": "dblclick",
  doubleclick: "dblclick",
  doubleclicking: "dblclick",
  doubleclicked: "dblclick",
  "right-click": "rightclick",
  "right click": "rightclick",
  "right-clicking": "rightclick",
  "right clicking": "rightclick",
  "right-clicked": "rightclick",
  "right clicked": "rightclick",
  rightclick: "rightclick",
  rightclicking: "rightclick",
  rightclicked: "rightclick",
  "drag-and-drop": "dragdrop",
  "drag and drop": "dragdrop",
  "drag-n-drop": "dragdrop",
  "sign-in": "login",
  "sign in": "login",
  "signing-in": "login",
  "signing in": "login",
  "signed-in": "login",
  "signed in": "login",
  signin: "login",
  "log-in": "login",
  "log in": "login",
  "logging-in": "login",
  "logging in": "login",
  "logged-in": "login",
  "logged in": "login",
  "sign-out": "logout",
  "sign out": "logout",
  "signing-out": "logout",
  "signing out": "logout",
  "signed-out": "logout",
  "signed out": "logout",
  signout: "logout",
  "log-out": "logout",
  "log out": "logout",
  "logging-out": "logout",
  "logging out": "logout",
  "logged-out": "logout",
  "logged out": "logout",
  "sign-up": "register",
  "sign up": "register",
  "signing-up": "register",
  "signing up": "register",
  "signed-up": "register",
  "signed up": "register",
  signup: "register"
};
var ABBREVIATION_EXPANSIONS = {
  // Common abbreviations
  btn: "button",
  msg: "message",
  err: "error",
  pwd: "password",
  usr: "user",
  nav: "navigation",
  pg: "page",
  txt: "text",
  num: "number",
  val: "value",
  img: "image",
  pic: "picture",
  lbl: "label",
  chk: "checkbox",
  chkbox: "checkbox",
  cb: "checkbox",
  rb: "radio",
  dd: "dropdown",
  sel: "select",
  dlg: "dialog",
  mdl: "modal",
  lnk: "link",
  tbl: "table",
  col: "column",
  hdr: "header",
  ftr: "footer",
  sec: "section",
  // UI element synonyms
  textbox: "field",
  "text field": "field",
  "text input": "field",
  "input field": "field",
  inputbox: "field",
  combobox: "dropdown",
  "combo box": "dropdown",
  selectbox: "dropdown",
  "select box": "dropdown",
  picker: "dropdown",
  listbox: "dropdown",
  "list box": "dropdown",
  // Action synonyms
  "sign in": "login",
  "log in": "login",
  signin: "login",
  "sign out": "logout",
  "log out": "logout",
  signout: "logout",
  // Common element names
  "submit button": "submit",
  "cancel button": "cancel",
  "ok button": "ok",
  "close button": "close",
  "save button": "save",
  "delete button": "delete",
  "edit button": "edit",
  "add button": "add",
  "remove button": "remove",
  "search button": "search",
  "search box": "search field",
  "search bar": "search field"
};
var STOP_WORDS = /* @__PURE__ */ new Set([
  "the",
  "a",
  "an",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "must",
  "shall",
  "can",
  "need",
  "dare",
  "ought",
  "used",
  "to",
  "of",
  "in",
  "for",
  "on",
  "with",
  "at",
  "by",
  "from",
  "up",
  "about",
  "into",
  "through",
  "during",
  "before",
  "after",
  "above",
  "below",
  "between",
  "under",
  "again",
  "further",
  "then",
  "once",
  "here",
  "there",
  "when",
  "where",
  "why",
  "how",
  "all",
  "each",
  "few",
  "more",
  "most",
  "other",
  "some",
  "such",
  "no",
  "nor",
  "not",
  "only",
  "own",
  "same",
  "so",
  "than",
  "too",
  "very",
  "just",
  "and"
]);
var ACTOR_PREFIXES = [
  /^user\s+/i,
  /^the user\s+/i,
  /^i\s+/i,
  /^we\s+/i,
  /^they\s+/i,
  /^customer\s+/i,
  /^visitor\s+/i,
  /^admin\s+/i,
  /^administrator\s+/i
];
var DEFAULT_OPTIONS = {
  stemVerbs: true,
  expandAbbreviations: true,
  removeStopWords: false,
  // Keep stop words by default for better pattern matching
  removeActorPrefixes: true,
  lowercase: true,
  preserveQuoted: true
};
function stemWord(word) {
  const lower = word.toLowerCase();
  return VERB_STEMS[lower] ?? lower;
}
function expandAbbreviations(text) {
  let result = text.toLowerCase();
  const sorted = Object.entries(ABBREVIATION_EXPANSIONS).sort(([a], [b]) => b.length - a.length);
  for (const [abbr, expansion] of sorted) {
    const regex = new RegExp(`\\b${escapeRegex(abbr)}\\b`, "gi");
    result = result.replace(regex, expansion);
  }
  return result;
}
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function removeActorPrefixes(text) {
  let result = text;
  for (const pattern of ACTOR_PREFIXES) {
    result = result.replace(pattern, "");
  }
  return result.trim();
}
function removeStopWords(text) {
  const words = text.split(/\s+/);
  const filtered = words.filter((word) => !STOP_WORDS.has(word.toLowerCase()));
  return filtered.join(" ");
}
function extractQuotedStrings(text) {
  const quotes = /* @__PURE__ */ new Map();
  let placeholderIndex = 0;
  const processedText = text.replace(/(['"])([^'"]*)\1/g, (_match, quote, content) => {
    const placeholder = `__QUOTED_${placeholderIndex}__`;
    quotes.set(placeholder, `${quote}${content}${quote}`);
    placeholderIndex++;
    return placeholder;
  });
  return { text: processedText, quotes };
}
function restoreQuotedStrings(text, quotes) {
  let result = text;
  for (const [placeholder, original] of quotes) {
    result = result.replace(placeholder, original);
  }
  return result;
}
function normalizeStepTextEnhanced(text, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let result = text.trim();
  let quotesMap = /* @__PURE__ */ new Map();
  if (opts.preserveQuoted) {
    const extracted = extractQuotedStrings(result);
    result = extracted.text;
    quotesMap = extracted.quotes;
  }
  if (opts.removeActorPrefixes) {
    result = removeActorPrefixes(result);
  }
  if (opts.lowercase) {
    result = result.toLowerCase();
  }
  if (opts.expandAbbreviations) {
    result = expandAbbreviations(result);
  }
  if (opts.stemVerbs) {
    const words = result.split(/\s+/);
    result = words.map((word) => {
      if (word.startsWith("__QUOTED_") || /[^a-z]/.test(word)) {
        return word;
      }
      return stemWord(word);
    }).join(" ");
  }
  if (opts.removeStopWords) {
    result = removeStopWords(result);
  }
  result = result.replace(/\s+/g, " ").trim();
  if (opts.preserveQuoted) {
    result = restoreQuotedStrings(result, quotesMap);
  }
  return result;
}
function getCanonicalForm(text) {
  return normalizeStepTextEnhanced(text, {
    stemVerbs: true,
    expandAbbreviations: true,
    removeStopWords: true,
    removeActorPrefixes: true,
    lowercase: true,
    preserveQuoted: true
  });
}
function getLightNormalization(text) {
  return normalizeStepTextEnhanced(text, {
    stemVerbs: true,
    expandAbbreviations: true,
    removeStopWords: false,
    removeActorPrefixes: true,
    lowercase: true,
    preserveQuoted: true
  });
}
function areStepsEquivalent(step1, step2) {
  const canonical1 = getCanonicalForm(step1);
  const canonical2 = getCanonicalForm(step2);
  return canonical1 === canonical2;
}
function getAllNormalizations(text) {
  const normalizations = /* @__PURE__ */ new Set();
  normalizations.add(text.toLowerCase().trim());
  normalizations.add(getLightNormalization(text));
  normalizations.add(getCanonicalForm(text));
  normalizations.add(removeActorPrefixes(text.toLowerCase().trim()));
  return Array.from(normalizations);
}

// src/mapping/fuzzyMatcher.ts
function getPatternExamples(pattern) {
  const examples = [];
  const name = pattern.name.toLowerCase();
  if (name.includes("navigate") || name.includes("goto")) {
    examples.push(
      "navigate to /home",
      "go to /login",
      "open /dashboard",
      "visit the homepage",
      "navigate to the settings page"
    );
  }
  if (name.includes("click")) {
    examples.push(
      "click the submit button",
      "click on save",
      "click cancel button",
      "press the login button",
      "tap the menu icon"
    );
  }
  if (name.includes("fill") || name.includes("enter") || name.includes("type")) {
    examples.push(
      "enter username in the username field",
      "fill password in password field",
      "type hello in the search box",
      "input test@example.com in email field",
      "enter value into the input"
    );
  }
  if (name.includes("see") || name.includes("visible") || name.includes("verify")) {
    examples.push(
      "see the welcome message",
      "verify the success message is displayed",
      "confirm the error appears",
      "should see login button",
      "expect the form to be visible"
    );
  }
  if (name.includes("wait")) {
    examples.push(
      "wait for network idle",
      "wait for page to load",
      "wait 3 seconds",
      "wait for the spinner to disappear",
      "wait until the modal closes"
    );
  }
  if (name.includes("select")) {
    examples.push(
      "select option 1 from dropdown",
      "choose value from the list",
      "pick an item from menu",
      "select country from country dropdown"
    );
  }
  if (name.includes("check")) {
    examples.push(
      "check the checkbox",
      "tick the agreement box",
      "check remember me",
      "uncheck the newsletter option"
    );
  }
  if (name.includes("upload")) {
    examples.push(
      "upload file.pdf",
      "attach document.docx",
      "upload image to the form"
    );
  }
  if (name.includes("hover")) {
    examples.push(
      "hover over the menu",
      "mouse over the dropdown",
      "hover on the button"
    );
  }
  if (name.includes("scroll")) {
    examples.push(
      "scroll down",
      "scroll to the bottom",
      "scroll to element"
    );
  }
  if (name.includes("press")) {
    examples.push(
      "press enter",
      "press tab",
      "press escape key",
      "hit the enter key"
    );
  }
  if (name.includes("table") || name.includes("grid")) {
    examples.push(
      "see 5 rows in the table",
      "verify table has data",
      "check grid contains value"
    );
  }
  if (name.includes("text") || name.includes("contain")) {
    examples.push(
      "see text welcome back",
      "page contains login form",
      "element has text submit"
    );
  }
  return examples;
}
function buildPatternExamplesCache() {
  return allPatterns.map((pattern) => ({
    pattern,
    examples: getPatternExamples(pattern)
  }));
}
var patternExamplesCache = null;
function getPatternExamples_cached() {
  if (!patternExamplesCache) {
    patternExamplesCache = buildPatternExamplesCache();
  }
  return patternExamplesCache;
}
function fuzzyMatch(text, config = {}) {
  const {
    minSimilarity = 0.85,
    useNormalization = true,
    maxCandidates = 10,
    debug = false
  } = config;
  const trimmedText = text.trim();
  const normalizedText = useNormalization ? getCanonicalForm(trimmedText) : trimmedText.toLowerCase();
  const patternsWithExamples = getPatternExamples_cached();
  const candidates = [];
  outer: for (const { pattern, examples } of patternsWithExamples) {
    for (const example of examples) {
      const normalizedExample = useNormalization ? getCanonicalForm(example) : example.toLowerCase();
      const similarity = calculateSimilarity(normalizedText, normalizedExample);
      if (similarity >= minSimilarity) {
        candidates.push({ pattern, example, similarity });
        if (similarity >= 0.98) {
          break outer;
        }
      }
    }
  }
  candidates.sort((a, b) => b.similarity - a.similarity);
  const topCandidates = candidates.slice(0, maxCandidates);
  if (debug && topCandidates.length > 0) {
    console.log(
      `[FuzzyMatcher] Top ${topCandidates.length} candidates for "${trimmedText}":`
    );
    for (const c of topCandidates) {
      console.log(`  ${c.pattern.name}: ${(c.similarity * 100).toFixed(1)}% (vs "${c.example}")`);
    }
  }
  if (topCandidates.length > 0) {
    const best = topCandidates[0];
    const match = trimmedText.match(best.pattern.regex);
    if (match) {
      const primitive = best.pattern.extract(match);
      if (primitive) {
        return {
          primitive,
          patternName: best.pattern.name,
          similarity: best.similarity,
          matchedExample: best.example,
          originalText: trimmedText,
          normalizedText
        };
      }
    }
    if (best.similarity >= 0.9) {
      const genericPrimitive = createGenericPrimitive(best.pattern, trimmedText);
      if (genericPrimitive) {
        if (debug) {
          console.log(
            `[FuzzyMatcher] Created generic primitive for ${best.pattern.name}`
          );
        }
        return {
          primitive: genericPrimitive,
          patternName: `${best.pattern.name}:fuzzy`,
          similarity: best.similarity,
          matchedExample: best.example,
          originalText: trimmedText,
          normalizedText
        };
      }
    }
  }
  if (debug) {
    console.log(`[FuzzyMatcher] No match above ${minSimilarity * 100}% for "${trimmedText}"`);
  }
  return null;
}
function createGenericPrimitive(pattern, text) {
  const type = pattern.primitiveType;
  const quotedStrings = text.match(/["']([^"']+)["']/g)?.map((s) => s.slice(1, -1)) || [];
  const targetStr = quotedStrings[0] || extractTarget(text) || "element";
  const valueStr = quotedStrings[1] || quotedStrings[0] || "";
  const makeLocator = (value) => ({
    strategy: "text",
    value
  });
  switch (type) {
    case "click":
    case "dblclick":
    case "rightClick":
      return { type, locator: makeLocator(targetStr) };
    case "fill":
      return {
        type: "fill",
        locator: makeLocator(targetStr),
        value: { type: "literal", value: valueStr }
      };
    case "goto": {
      const urlMatch = text.match(/(?:to|\/)\s*([\/\w.-]+)/i);
      return {
        type: "goto",
        url: urlMatch?.[1] || "/"
      };
    }
    case "waitForTimeout": {
      const timeMatch = text.match(/(\d+)\s*(?:second|sec|ms|millisecond)/i);
      if (timeMatch) {
        const amount = parseInt(timeMatch[1], 10);
        const unit = text.toLowerCase().includes("ms") ? "ms" : "s";
        return {
          type: "waitForTimeout",
          ms: unit === "ms" ? amount : amount * 1e3
        };
      }
      return { type: "waitForTimeout", ms: 1e3 };
    }
    case "waitForNetworkIdle":
      return { type: "waitForNetworkIdle" };
    case "waitForVisible":
      return { type: "waitForVisible", locator: makeLocator(targetStr) };
    case "waitForHidden":
      return { type: "waitForHidden", locator: makeLocator(targetStr) };
    case "expectVisible":
    case "expectNotVisible":
    case "expectHidden":
      return { type, locator: makeLocator(targetStr) };
    case "expectText":
      return {
        type: "expectText",
        locator: makeLocator(targetStr),
        text: valueStr
      };
    case "select":
      return {
        type: "select",
        locator: makeLocator(targetStr),
        option: valueStr
      };
    case "hover":
    case "focus":
    case "clear":
    case "check":
    case "uncheck":
      return { type, locator: makeLocator(targetStr) };
    case "press": {
      const keyMatch = text.match(/(?:press|hit|key)\s+(\w+)/i);
      return {
        type: "press",
        key: keyMatch?.[1] || "Enter"
      };
    }
    default:
      return null;
  }
}
function extractTarget(text) {
  const patterns = [
    /(?:the|a)\s+["']?(\w+(?:\s+\w+)?)["']?\s+(?:button|field|input|link|element)/i,
    /(?:on|click|tap|press)\s+(?:the\s+)?["']?(\w+(?:\s+\w+)?)["']?/i,
    /(?:in|into)\s+(?:the\s+)?["']?(\w+(?:\s+\w+)?)["']?\s+(?:field|input)/i
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }
  return null;
}
function getFuzzyMatchStats() {
  const patternsWithExamples = getPatternExamples_cached();
  const examplesByType = {};
  let totalExamples = 0;
  for (const { pattern, examples } of patternsWithExamples) {
    const type = pattern.primitiveType;
    examplesByType[type] = (examplesByType[type] || 0) + examples.length;
    totalExamples += examples.length;
  }
  return {
    patternsWithExamples: patternsWithExamples.length,
    totalExamples,
    examplesByType
  };
}
function clearFuzzyMatchCache() {
  patternExamplesCache = null;
}

// src/mapping/unifiedMatcher.ts
function unifiedMatch(text, options = {}) {
  const {
    useLlkb = true,
    llkbRoot,
    minLlkbConfidence = 0.7,
    useFuzzy = true,
    minFuzzySimilarity = 0.85,
    debug = false
  } = options;
  const trimmedText = text.trim();
  for (const pattern of allPatterns) {
    const match = trimmedText.match(pattern.regex);
    if (match) {
      const primitive = pattern.extract(match);
      if (primitive) {
        if (debug) {
          console.log(`[UnifiedMatcher] Core match: ${pattern.name} for "${trimmedText}"`);
        }
        return {
          primitive,
          source: "core",
          patternName: pattern.name
        };
      }
    }
  }
  if (useLlkb) {
    try {
      const llkbMatch = matchLlkbPattern(trimmedText, {
        llkbRoot,
        minConfidence: minLlkbConfidence
      });
      if (llkbMatch) {
        if (debug) {
          console.log(
            `[UnifiedMatcher] LLKB match: ${llkbMatch.patternId} (confidence: ${llkbMatch.confidence}) for "${trimmedText}"`
          );
        }
        return {
          primitive: llkbMatch.primitive,
          source: "llkb",
          llkbPatternId: llkbMatch.patternId,
          llkbConfidence: llkbMatch.confidence
        };
      }
    } catch (err) {
      if (debug) {
        console.log(`[UnifiedMatcher] LLKB lookup failed: ${err}`);
      }
    }
  }
  if (useFuzzy) {
    try {
      const fuzzyResult = fuzzyMatch(trimmedText, {
        minSimilarity: minFuzzySimilarity,
        useNormalization: true,
        debug
      });
      if (fuzzyResult) {
        if (debug) {
          console.log(
            `[UnifiedMatcher] Fuzzy match: ${fuzzyResult.patternName} (similarity: ${(fuzzyResult.similarity * 100).toFixed(1)}%) for "${trimmedText}"`
          );
        }
        return {
          primitive: fuzzyResult.primitive,
          source: "fuzzy",
          patternName: fuzzyResult.patternName,
          fuzzySimilarity: fuzzyResult.similarity,
          fuzzyMatchedExample: fuzzyResult.matchedExample
        };
      }
    } catch (err) {
      if (debug) {
        console.log(`[UnifiedMatcher] Fuzzy matching failed: ${err}`);
      }
    }
  }
  if (debug) {
    console.log(`[UnifiedMatcher] No match for: "${trimmedText}"`);
  }
  return {
    primitive: null,
    source: "none"
  };
}
function unifiedMatchAll(text, options = {}) {
  const trimmedText = text.trim();
  const matches = [];
  for (const pattern of allPatterns) {
    const match = trimmedText.match(pattern.regex);
    if (match) {
      const primitive = pattern.extract(match);
      if (primitive) {
        matches.push({
          source: "core",
          name: pattern.name,
          primitive
        });
      }
    }
  }
  if (options.useLlkb !== false) {
    try {
      const llkbMatch = matchLlkbPattern(trimmedText, {
        llkbRoot: options.llkbRoot,
        minConfidence: 0
        // Get all LLKB matches for debugging
      });
      if (llkbMatch) {
        matches.push({
          source: "llkb",
          name: llkbMatch.patternId,
          primitive: llkbMatch.primitive,
          confidence: llkbMatch.confidence
        });
      }
    } catch {
    }
  }
  if (options.useFuzzy !== false) {
    try {
      const fuzzyResult = fuzzyMatch(trimmedText, {
        minSimilarity: 0.5,
        // Lower threshold for debugging (show more candidates)
        useNormalization: true
      });
      if (fuzzyResult) {
        matches.push({
          source: "fuzzy",
          name: fuzzyResult.patternName,
          primitive: fuzzyResult.primitive,
          similarity: fuzzyResult.similarity
        });
      }
    } catch {
    }
  }
  return matches;
}
function getUnifiedMatcherStats(options) {
  let llkbPatternCount = 0;
  try {
    const llkbPatterns = loadLearnedPatterns({ llkbRoot: options?.llkbRoot });
    llkbPatternCount = llkbPatterns.length;
  } catch {
  }
  const coreCategories = {};
  for (const pattern of allPatterns) {
    const category = pattern.name.split("-")[0] || "other";
    coreCategories[category] = (coreCategories[category] || 0) + 1;
  }
  return {
    corePatternCount: allPatterns.length,
    llkbPatternCount,
    totalPatterns: allPatterns.length + llkbPatternCount,
    coreCategories
  };
}
async function warmUpUnifiedMatcher(options) {
  try {
    loadLearnedPatterns({ llkbRoot: options?.llkbRoot, bypassCache: true });
  } catch {
  }
}
function hasPatternMatch(text, options = {}) {
  const result = unifiedMatch(text, options);
  return result.primitive !== null;
}
function getMatchedPatternName(text, options = {}) {
  const result = unifiedMatch(text, options);
  if (result.source === "core" && result.patternName) {
    return result.patternName;
  }
  if (result.source === "llkb" && result.llkbPatternId) {
    return `llkb:${result.llkbPatternId}`;
  }
  return null;
}
function getCorePatterns() {
  return [...allPatterns];
}

// src/mapping/plannedActionAdapter.ts
function irPrimitiveToPlannedAction(primitive) {
  switch (primitive.type) {
    // ═══════════════════════════════════════════════════════════════════════════
    // NAVIGATION
    // ═══════════════════════════════════════════════════════════════════════════
    case "goto":
      return { type: "navigate", target: primitive.url };
    case "reload":
      return { type: "reload" };
    case "goBack":
      return { type: "goBack" };
    case "goForward":
      return { type: "goForward" };
    case "waitForURL":
      return {
        type: "waitForURL",
        target: typeof primitive.pattern === "string" ? primitive.pattern : primitive.pattern.source
      };
    case "waitForResponse":
      return { type: "waitForNetwork", target: primitive.urlPattern };
    case "waitForLoadingComplete":
      return { type: "wait", options: { timeout: primitive.timeout ?? 5e3 } };
    // ═══════════════════════════════════════════════════════════════════════════
    // WAIT PRIMITIVES
    // ═══════════════════════════════════════════════════════════════════════════
    case "waitForVisible":
      return { type: "waitForVisible", target: locatorToTarget(primitive.locator) };
    case "waitForHidden":
      return { type: "waitForHidden", target: locatorToTarget(primitive.locator) };
    case "waitForTimeout":
      return { type: "wait", options: { timeout: primitive.ms } };
    case "waitForNetworkIdle":
      return { type: "waitForNetwork" };
    // ═══════════════════════════════════════════════════════════════════════════
    // CLICK INTERACTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    case "click":
      return { type: "click", target: locatorToTarget(primitive.locator) };
    case "dblclick":
      return { type: "dblclick", target: locatorToTarget(primitive.locator) };
    case "rightClick":
      return { type: "rightClick", target: locatorToTarget(primitive.locator) };
    // ═══════════════════════════════════════════════════════════════════════════
    // FORM INTERACTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    case "fill":
      return {
        type: "fill",
        target: locatorToTarget(primitive.locator),
        value: valueToString(primitive.value)
      };
    case "select":
      return {
        type: "select",
        target: locatorToTarget(primitive.locator),
        value: primitive.option
      };
    case "check":
      return { type: "check", target: locatorToTarget(primitive.locator) };
    case "uncheck":
      return { type: "uncheck", target: locatorToTarget(primitive.locator) };
    case "clear":
      return { type: "clear", target: locatorToTarget(primitive.locator) };
    case "upload":
      return {
        type: "upload",
        target: locatorToTarget(primitive.locator),
        files: primitive.files
      };
    // ═══════════════════════════════════════════════════════════════════════════
    // OTHER INTERACTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    case "press":
      return { type: "press", key: primitive.key };
    case "hover":
      return { type: "hover", target: locatorToTarget(primitive.locator) };
    case "focus":
      return { type: "focus", target: locatorToTarget(primitive.locator) };
    // ═══════════════════════════════════════════════════════════════════════════
    // ASSERTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    case "expectVisible":
      return { type: "assert", target: locatorToTarget(primitive.locator) };
    case "expectNotVisible":
    case "expectHidden":
      return { type: "assertHidden", target: locatorToTarget(primitive.locator) };
    case "expectText":
      return {
        type: "assertText",
        target: locatorToTarget(primitive.locator),
        value: typeof primitive.text === "string" ? primitive.text : primitive.text.source
      };
    case "expectContainsText":
      return {
        type: "assertText",
        target: locatorToTarget(primitive.locator),
        value: primitive.text
      };
    case "expectValue":
      return {
        type: "assertValue",
        target: locatorToTarget(primitive.locator),
        value: primitive.value
      };
    case "expectChecked":
      return { type: "assertChecked", target: locatorToTarget(primitive.locator) };
    case "expectEnabled":
      return { type: "assertEnabled", target: locatorToTarget(primitive.locator) };
    case "expectDisabled":
      return { type: "assertDisabled", target: locatorToTarget(primitive.locator) };
    case "expectURL":
      return {
        type: "assertURL",
        target: typeof primitive.pattern === "string" ? primitive.pattern : primitive.pattern.source
      };
    case "expectTitle":
      return {
        type: "assertTitle",
        target: typeof primitive.title === "string" ? primitive.title : primitive.title.source
      };
    case "expectCount":
      return {
        type: "assertCount",
        target: locatorToTarget(primitive.locator),
        count: primitive.count
      };
    // ═══════════════════════════════════════════════════════════════════════════
    // SIGNALS (TOASTS, MODALS, ALERTS)
    // ═══════════════════════════════════════════════════════════════════════════
    case "expectToast":
      return {
        type: "assertToast",
        toastType: primitive.toastType,
        value: primitive.message
      };
    case "dismissModal":
      return { type: "dismissModal" };
    case "acceptAlert":
      return { type: "acceptAlert" };
    case "dismissAlert":
      return { type: "dismissAlert" };
    // ═══════════════════════════════════════════════════════════════════════════
    // MODULE CALLS
    // ═══════════════════════════════════════════════════════════════════════════
    case "callModule":
      return {
        type: "callModule",
        module: primitive.module,
        method: primitive.method
      };
    // ═══════════════════════════════════════════════════════════════════════════
    // BLOCKED/TODO
    // ═══════════════════════════════════════════════════════════════════════════
    case "blocked":
      return { type: "custom", target: primitive.sourceText };
    default:
      const _exhaustive = primitive;
      return { type: "custom", target: String(_exhaustive.type) };
  }
}
function locatorToTarget(locator) {
  switch (locator.strategy) {
    case "role":
      if (locator.options?.name) {
        return `${locator.value}:${locator.options.name}`;
      }
      return locator.value;
    case "placeholder":
      return `placeholder:${locator.value}`;
    case "label":
    case "text":
    case "testid":
      return locator.value;
    case "css":
      return locator.value;
    default:
      return locator.value;
  }
}
function valueToString(value) {
  switch (value.type) {
    case "literal":
      return value.value;
    case "actor":
      return `{{${value.value}}}`;
    case "testData":
      return `$${value.value}`;
    case "generated":
      return value.value;
    case "runId":
      return "${runId}";
    default:
      return value.value || "";
  }
}
function plannedActionToIRPrimitive(action) {
  switch (action.type) {
    case "navigate":
      return { type: "goto", url: action.target || "/" };
    case "reload":
      return { type: "reload" };
    case "goBack":
      return { type: "goBack" };
    case "goForward":
      return { type: "goForward" };
    case "click":
      return { type: "click", locator: targetToLocator(action.target || "") };
    case "dblclick":
      return { type: "dblclick", locator: targetToLocator(action.target || "") };
    case "rightClick":
      return { type: "rightClick", locator: targetToLocator(action.target || "") };
    case "fill":
      return {
        type: "fill",
        locator: targetToLocator(action.target || ""),
        value: stringToValue(action.value || "")
      };
    case "select":
      return {
        type: "select",
        locator: targetToLocator(action.target || ""),
        option: action.value || ""
      };
    case "check":
      return { type: "check", locator: targetToLocator(action.target || "") };
    case "uncheck":
      return { type: "uncheck", locator: targetToLocator(action.target || "") };
    case "press":
      return { type: "press", key: action.key || "Enter" };
    case "hover":
      return { type: "hover", locator: targetToLocator(action.target || "") };
    case "focus":
      return { type: "focus", locator: targetToLocator(action.target || "") };
    case "clear":
      return { type: "clear", locator: targetToLocator(action.target || "") };
    case "assert":
      return { type: "expectVisible", locator: targetToLocator(action.target || "") };
    case "assertHidden":
      return { type: "expectHidden", locator: targetToLocator(action.target || "") };
    case "assertText":
      return {
        type: "expectText",
        locator: targetToLocator(action.target || ""),
        text: action.value || ""
      };
    case "assertURL":
      return { type: "expectURL", pattern: action.target || "/" };
    case "assertTitle":
      return { type: "expectTitle", title: action.target || "" };
    case "assertToast":
      return {
        type: "expectToast",
        toastType: action.toastType || "info",
        message: action.value
      };
    case "waitForVisible":
      return { type: "waitForVisible", locator: targetToLocator(action.target || "") };
    case "waitForHidden":
      return { type: "waitForHidden", locator: targetToLocator(action.target || "") };
    case "waitForNetwork":
      return { type: "waitForNetworkIdle" };
    case "wait":
      return { type: "waitForTimeout", ms: action.options?.timeout || 5e3 };
    case "dismissModal":
      return { type: "dismissModal" };
    case "acceptAlert":
      return { type: "acceptAlert" };
    case "dismissAlert":
      return { type: "dismissAlert" };
    case "callModule":
      return {
        type: "callModule",
        module: action.module || "unknown",
        method: action.method || "unknown"
      };
    case "custom":
      return { type: "blocked", reason: "custom action", sourceText: action.target || "" };
    default:
      return null;
  }
}
function targetToLocator(target) {
  const roleMatch = target.match(/^(\w+):(.+)$/);
  if (roleMatch) {
    return {
      strategy: "role",
      value: roleMatch[1],
      options: { name: roleMatch[2] }
    };
  }
  return { strategy: "text", value: target };
}
function stringToValue(str) {
  if (/^\{\{.+\}\}$/.test(str)) {
    return { type: "actor", value: str.slice(2, -2) };
  }
  if (/^\$.+/.test(str)) {
    return { type: "testData", value: str.slice(1) };
  }
  if (/\$\{.+\}/.test(str)) {
    return { type: "generated", value: str };
  }
  return { type: "literal", value: str };
}

// src/mapping/llmFallback.ts
var DEFAULT_LLM_CONFIG = {
  enabled: false,
  provider: "claude",
  model: "claude-3-haiku-20240307",
  apiKeyEnvVar: "ANTHROPIC_API_KEY",
  maxTokens: 500,
  temperature: 0.1,
  // Low temperature for consistency
  timeout: 1e4,
  maxRetries: 2,
  cacheResponses: true,
  cacheTtlSeconds: 3600,
  costBudgetUsd: 0.5
};
var telemetry = {
  totalCalls: 0,
  successfulCalls: 0,
  failedCalls: 0,
  cacheHits: 0,
  totalLatencyMs: 0,
  totalCostUsd: 0,
  history: []
};
var responseCache = /* @__PURE__ */ new Map();
var MAX_HISTORY_ENTRIES = 1e3;
function addHistoryEntry(entry) {
  telemetry.history.push(entry);
  if (telemetry.history.length > MAX_HISTORY_ENTRIES) {
    telemetry.history = telemetry.history.slice(-MAX_HISTORY_ENTRIES);
  }
}
var VALID_PRIMITIVE_TYPES = [
  "goto",
  "waitForURL",
  "waitForResponse",
  "waitForLoadingComplete",
  "reload",
  "goBack",
  "goForward",
  "waitForVisible",
  "waitForHidden",
  "waitForTimeout",
  "waitForNetworkIdle",
  "click",
  "dblclick",
  "rightClick",
  "fill",
  "select",
  "check",
  "uncheck",
  "upload",
  "press",
  "hover",
  "focus",
  "clear",
  "expectVisible",
  "expectNotVisible",
  "expectHidden",
  "expectText",
  "expectValue",
  "expectChecked",
  "expectEnabled",
  "expectDisabled",
  "expectURL",
  "expectTitle",
  "expectCount",
  "expectContainsText",
  "expectToast",
  "dismissModal",
  "acceptAlert",
  "dismissAlert",
  "callModule",
  "blocked"
];
var VALID_LOCATOR_STRATEGIES = ["role", "label", "placeholder", "text", "testid", "css"];
function validateLocatorSpec(locator) {
  if (!locator || typeof locator !== "object") return false;
  const loc = locator;
  if (!VALID_LOCATOR_STRATEGIES.includes(loc.strategy)) {
    return false;
  }
  if (typeof loc.value !== "string" || loc.value.length === 0) {
    return false;
  }
  return true;
}
function validateValueSpec(value) {
  if (!value || typeof value !== "object") return false;
  const val = value;
  const validTypes = ["literal", "actor", "runId", "generated", "testData"];
  if (!validTypes.includes(val.type)) {
    return false;
  }
  if (typeof val.value !== "string") {
    return false;
  }
  return true;
}
function validateLlmPrimitive(primitive) {
  const errors = [];
  if (!primitive || typeof primitive !== "object") {
    errors.push("Primitive must be an object");
    return { valid: false, errors };
  }
  const prim = primitive;
  if (!VALID_PRIMITIVE_TYPES.includes(prim.type)) {
    errors.push(`Invalid primitive type: ${prim.type}`);
    return { valid: false, errors };
  }
  switch (prim.type) {
    // Navigation primitives
    case "goto":
      if (typeof prim.url !== "string") errors.push("goto requires url string");
      break;
    case "waitForURL":
      if (typeof prim.pattern !== "string") errors.push("waitForURL requires pattern string");
      break;
    case "waitForResponse":
      if (typeof prim.urlPattern !== "string") errors.push("waitForResponse requires urlPattern string");
      break;
    case "reload":
    case "goBack":
    case "goForward":
      break;
    case "waitForLoadingComplete":
    case "waitForNetworkIdle":
      break;
    // Wait primitives with locator
    case "waitForVisible":
    case "waitForHidden":
      if (!validateLocatorSpec(prim.locator)) errors.push(`${prim.type} requires valid locator`);
      break;
    case "waitForTimeout":
      if (typeof prim.ms !== "number" || prim.ms < 0) errors.push("waitForTimeout requires positive ms");
      break;
    // Interaction primitives with locator
    case "click":
    case "dblclick":
    case "rightClick":
    case "hover":
    case "focus":
    case "clear":
    case "check":
    case "uncheck":
      if (!validateLocatorSpec(prim.locator)) errors.push(`${prim.type} requires valid locator`);
      break;
    case "fill":
      if (!validateLocatorSpec(prim.locator)) errors.push("fill requires valid locator");
      if (!validateValueSpec(prim.value)) errors.push("fill requires valid value");
      break;
    case "select":
      if (!validateLocatorSpec(prim.locator)) errors.push("select requires valid locator");
      if (typeof prim.option !== "string") errors.push("select requires option string");
      break;
    case "press":
      if (typeof prim.key !== "string") errors.push("press requires key string");
      break;
    case "upload":
      if (!validateLocatorSpec(prim.locator)) errors.push("upload requires valid locator");
      if (!Array.isArray(prim.files) || prim.files.length === 0) errors.push("upload requires non-empty files array");
      break;
    // Assertion primitives
    case "expectText":
    case "expectContainsText":
      if (!validateLocatorSpec(prim.locator)) errors.push(`${prim.type} requires valid locator`);
      if (typeof prim.text !== "string") errors.push(`${prim.type} requires text string`);
      break;
    case "expectValue":
      if (!validateLocatorSpec(prim.locator)) errors.push("expectValue requires valid locator");
      if (typeof prim.value !== "string") errors.push("expectValue requires value string");
      break;
    case "expectVisible":
    case "expectNotVisible":
    case "expectHidden":
    case "expectEnabled":
    case "expectDisabled":
    case "expectChecked":
      if (!validateLocatorSpec(prim.locator)) errors.push(`${prim.type} requires valid locator`);
      break;
    case "expectCount":
      if (!validateLocatorSpec(prim.locator)) errors.push("expectCount requires valid locator");
      if (typeof prim.count !== "number") errors.push("expectCount requires count number");
      break;
    case "expectURL":
      if (typeof prim.pattern !== "string") errors.push("expectURL requires pattern string");
      break;
    case "expectTitle":
      if (typeof prim.title !== "string") errors.push("expectTitle requires title string");
      break;
    // Signal primitives
    case "expectToast":
      if (!["success", "error", "info", "warning"].includes(prim.toastType)) {
        errors.push("expectToast requires valid toastType (success|error|info|warning)");
      }
      break;
    case "dismissModal":
    case "acceptAlert":
    case "dismissAlert":
      break;
    // Module calls
    case "callModule":
      if (typeof prim.module !== "string") errors.push("callModule requires module string");
      if (typeof prim.method !== "string") errors.push("callModule requires method string");
      break;
    // Blocked steps
    case "blocked":
      if (typeof prim.reason !== "string") errors.push("blocked requires reason string");
      if (typeof prim.sourceText !== "string") errors.push("blocked requires sourceText string");
      break;
  }
  return { valid: errors.length === 0, errors };
}
function generatePrompt(stepText) {
  return `You are an expert at converting natural language test steps into structured IR (Intermediate Representation) primitives for Playwright test automation.

Given this test step:
"${stepText}"

Return a JSON object representing the IR primitive. The primitive must follow this schema:

Primitive Types:
- Navigation: goto (url), waitForURL (pattern), reload, goBack, goForward
- Wait: waitForVisible (locator), waitForHidden (locator), waitForTimeout (ms), waitForNetworkIdle
- Actions: click (locator), fill (locator, value), select (locator, option), check (locator), uncheck (locator), press (key), hover (locator)
- Assertions: expectVisible (locator), expectText (locator, text), expectValue (locator, value), expectURL (pattern), expectTitle (title)

Locator format:
{
  "strategy": "role" | "label" | "text" | "testid" | "css",
  "value": "string",
  "options": { "name": "string", "exact": boolean } // optional
}

Value format (for fill):
{
  "type": "literal" | "actor" | "testData",
  "value": "string"
}

Examples:
- "Click the Submit button" \u2192 {"type": "click", "locator": {"strategy": "role", "value": "button", "options": {"name": "Submit"}}}
- "Enter 'john@test.com' in email field" \u2192 {"type": "fill", "locator": {"strategy": "label", "value": "email"}, "value": {"type": "literal", "value": "john@test.com"}}
- "Wait for page to load" \u2192 {"type": "waitForNetworkIdle"}

RESPOND WITH ONLY THE JSON OBJECT, NO EXPLANATION.`;
}
function parseResponse(response) {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    const validation = validateLlmPrimitive(parsed);
    if (validation.valid) {
      return parsed;
    }
    console.warn("[LLM Fallback] Validation errors:", validation.errors);
    return null;
  } catch (e) {
    console.warn("[LLM Fallback] Failed to parse response:", e);
    return null;
  }
}
function getCacheKey(stepText, config) {
  return `${config.provider}:${config.model}:${stepText.toLowerCase().trim()}`;
}
function estimateCost(_provider, model, inputTokens, outputTokens) {
  const costs = {
    "claude-3-haiku": { input: 0.25, output: 1.25 },
    "claude-3-sonnet": { input: 3, output: 15 },
    "gpt-4o-mini": { input: 0.15, output: 0.6 },
    "gpt-4o": { input: 5, output: 15 },
    "gemini-1.5-flash": { input: 0.075, output: 0.3 }
  };
  const modelKey = Object.keys(costs).find((k) => model.includes(k)) || "gpt-4o-mini";
  const rates = costs[modelKey];
  return (inputTokens * rates.input + outputTokens * rates.output) / 1e6;
}
async function mockLlmCall(stepText) {
  await new Promise((r) => setTimeout(r, 100));
  const lower = stepText.toLowerCase();
  let primitive;
  if (lower.includes("click")) {
    const match = stepText.match(/["']([^"']+)["']/);
    primitive = {
      type: "click",
      locator: { strategy: "role", value: "button", options: { name: match?.[1] || "button" } }
    };
  } else if (lower.includes("enter") || lower.includes("fill") || lower.includes("type")) {
    const matches = stepText.match(/["']([^"']+)["']/g);
    const value = matches?.[0]?.slice(1, -1) || "";
    const field = matches?.[1]?.slice(1, -1) || "input";
    primitive = {
      type: "fill",
      locator: { strategy: "label", value: field },
      value: { type: "literal", value }
    };
  } else if (lower.includes("see") || lower.includes("visible")) {
    const match = stepText.match(/["']([^"']+)["']/);
    primitive = {
      type: "expectVisible",
      locator: { strategy: "text", value: match?.[1] || "element" }
    };
  } else if (lower.includes("navigate") || lower.includes("go to")) {
    const match = stepText.match(/(?:to|\/)\s*([\/\w.-]+)/i);
    primitive = { type: "goto", url: match?.[1] || "/" };
  } else if (lower.includes("wait")) {
    primitive = { type: "waitForNetworkIdle" };
  } else {
    primitive = { type: "blocked", reason: "LLM mock could not interpret", sourceText: stepText };
  }
  return {
    response: JSON.stringify(primitive),
    latencyMs: 100
  };
}
async function callLlmApi(_prompt, _config) {
  throw new Error(
    "LLM API calls not implemented. Use mock provider for testing or implement callLlmApi with your preferred provider SDK."
  );
}
async function llmFallback(stepText, config = {}) {
  const mergedConfig = { ...DEFAULT_LLM_CONFIG, ...config };
  if (!mergedConfig.enabled) {
    return null;
  }
  const startTime = Date.now();
  const cacheKey = getCacheKey(stepText, mergedConfig);
  if (mergedConfig.cacheResponses) {
    const cached = responseCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      telemetry.cacheHits++;
      return { ...cached.result, fromCache: true };
    }
  }
  if (mergedConfig.costBudgetUsd && telemetry.totalCostUsd >= mergedConfig.costBudgetUsd) {
    console.warn("[LLM Fallback] Cost budget exceeded, skipping LLM call");
    telemetry.failedCalls++;
    addHistoryEntry({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      stepText,
      success: false,
      latencyMs: 0,
      costUsd: 0,
      error: "Cost budget exceeded"
    });
    return null;
  }
  telemetry.totalCalls++;
  try {
    let response;
    let latencyMs;
    let inputTokens = 0;
    let outputTokens = 0;
    if (mergedConfig.provider === "mock") {
      const result2 = await mockLlmCall(stepText);
      response = result2.response;
      latencyMs = result2.latencyMs;
      inputTokens = Math.ceil(stepText.length / 4);
      outputTokens = Math.ceil(response.length / 4);
    } else {
      const prompt = generatePrompt(stepText);
      const result2 = await callLlmApi(prompt, mergedConfig);
      response = result2.response;
      latencyMs = result2.latencyMs;
      inputTokens = result2.inputTokens;
      outputTokens = result2.outputTokens;
    }
    const primitive = parseResponse(response);
    if (!primitive) {
      telemetry.failedCalls++;
      addHistoryEntry({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        stepText,
        success: false,
        latencyMs: Date.now() - startTime,
        costUsd: 0,
        error: "Failed to parse response"
      });
      return null;
    }
    const costUsd = estimateCost(mergedConfig.provider, mergedConfig.model || "", inputTokens, outputTokens);
    const result = {
      primitive,
      confidence: primitive.type === "blocked" ? 0.3 : 0.7,
      fromCache: false,
      latencyMs,
      estimatedCostUsd: costUsd,
      provider: mergedConfig.provider,
      model: mergedConfig.model || "unknown"
    };
    telemetry.successfulCalls++;
    telemetry.totalLatencyMs += latencyMs;
    telemetry.totalCostUsd += costUsd;
    addHistoryEntry({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      stepText,
      success: true,
      latencyMs,
      costUsd
    });
    if (mergedConfig.cacheResponses) {
      responseCache.set(cacheKey, {
        result,
        expiry: Date.now() + (mergedConfig.cacheTtlSeconds || 3600) * 1e3
      });
    }
    return result;
  } catch (error) {
    telemetry.failedCalls++;
    addHistoryEntry({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      stepText,
      success: false,
      latencyMs: Date.now() - startTime,
      costUsd: 0,
      error: error instanceof Error ? error.message : "Unknown error"
    });
    return null;
  }
}
function getLlmFallbackTelemetry() {
  return { ...telemetry };
}
function resetLlmFallbackTelemetry() {
  telemetry = {
    totalCalls: 0,
    successfulCalls: 0,
    failedCalls: 0,
    cacheHits: 0,
    totalLatencyMs: 0,
    totalCostUsd: 0,
    history: []
  };
}
function clearLlmResponseCache() {
  responseCache.clear();
}
function isLlmFallbackAvailable(config = {}) {
  const mergedConfig = { ...DEFAULT_LLM_CONFIG, ...config };
  if (!mergedConfig.enabled) {
    return { available: false, reason: "LLM fallback is disabled" };
  }
  if (mergedConfig.provider === "mock") {
    return { available: true };
  }
  const apiKey = process.env[mergedConfig.apiKeyEnvVar || "ANTHROPIC_API_KEY"];
  if (!apiKey) {
    return {
      available: false,
      reason: `API key not found in environment variable: ${mergedConfig.apiKeyEnvVar}`
    };
  }
  return { available: true };
}

// src/mapping/index.ts
init_patternExtension();

export { DEFAULT_LLM_CONFIG, PATTERN_VERSION, allPatterns, analyzeBlockedPatterns, analyzeBlockedStep, areStepsEquivalent, authPatterns, calculateConfidence, calculateSimilarity, categorizeStep, categorizeStepText, checkPatterns, clearExtendedGlossary, clearFuzzyMatchCache, clearLearnedPatterns, clearLlmResponseCache, clearTelemetry, clickPatterns, createLocatorFromMatch, createValueFromText, defaultGlossary, expandAbbreviations, explainMismatch, exportPatternsToConfig, extendedAssertionPatterns, extendedClickPatterns, extendedFillPatterns, extendedNavigationPatterns, extendedSelectPatterns, extendedWaitPatterns, fillPatterns, findLabelAlias, findMatchingPatterns, findModuleMethod, findNearestPattern, focusPatterns, formatBlockedStepAnalysis, fuzzyMatch, generatePatternId, generateRegexFromText, getAllNormalizations, getAllPatternNames, getAssertionSuggestions, getCanonicalForm, getCorePatterns, getFuzzyMatchStats, getGenericSuggestions, getGlossary, getGlossaryStats, getInteractionSuggestions, getLabelAliases, getLightNormalization, getLlmFallbackTelemetry, getLocatorFromLabel, getMappingStats, getMatchedPatternName, getModuleMethods, getNavigationSuggestions, getPatternCountByCategory, getPatternMatches, getPatternMetadata, getPatternStats, getPatternsFilePath, getPromotablePatterns, getSynonyms, getTelemetryPath, getTelemetryStats, getUnifiedMatcherStats, getWaitSuggestions, hasExtendedGlossary, hasPatternMatch, hoverPatterns, inferMachineHint, initGlossary, initializeLlkb, invalidatePatternCache, irPrimitiveToPlannedAction, isLlkbAvailable, isLlmFallbackAvailable, isSynonymOf, levenshteinDistance, llmFallback, loadExtendedGlossary, loadGlossary, loadLearnedPatterns, lookupCoreGlossary, lookupGlossary, mapAcceptanceCriterion, mapProceduralStep, mapStepText, mapSteps, markPatternsPromoted, matchLlkbPattern, matchPattern, mergeGlossaries, modalAlertPatterns, navigationPatterns, normalizeStepText, normalizeStepTextEnhanced, normalizeStepTextForTelemetry, parseSelectorToLocator, plannedActionToIRPrimitive, prunePatterns, readBlockedStepRecords, recordBlockedStep, recordPatternFailure, recordPatternSuccess, recordUserFix, removeActorPrefixes, removeStopWords, resetGlossaryCache, resetLlmFallbackTelemetry, resolveCanonical, resolveModuleMethod, saveLearnedPatterns, selectPatterns, stemWord, structuredPatterns, suggestImprovements, toastPatterns, unifiedMatch, unifiedMatchAll, urlPatterns, validateLlmPrimitive, visibilityPatterns, waitPatterns, warmUpUnifiedMatcher };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map