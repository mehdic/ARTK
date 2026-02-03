import { existsSync, readFileSync, mkdirSync, writeFileSync, unlinkSync } from 'fs';
import { join, dirname, resolve } from 'path';
import 'url';
import { parse, stringify } from 'yaml';
import { z } from 'zod';
import { createHash } from 'crypto';

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
function initGlossary(glossaryPath) {
  {
    glossaryCache = defaultGlossary;
  }
  synonymMap = buildSynonymMap(glossaryCache);
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
var GlossaryEntrySchema, LabelAliasSchema, ModuleMethodMappingSchema, defaultGlossary, glossaryCache, synonymMap;
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
    z.object({
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
var cachedHarnessRoot;
var init_paths = __esm({
  "src/utils/paths.ts"() {
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
  const z3 = 1.96;
  const n = total;
  const denominator = 1 + z3 * z3 / n;
  const center = p + z3 * z3 / (2 * n);
  const spread = z3 * Math.sqrt((p * (1 - p) + z3 * z3 / (4 * n)) / n);
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
    PATTERNS_FILE = "learned-patterns.json";
    patternCache = null;
    CACHE_TTL_MS = 5e3;
  }
});
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
var ClarifiedJourneyFrontmatterSchema = JourneyFrontmatterSchema.extend({
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
var ImplementedJourneyFrontmatterSchema = JourneyFrontmatterSchema.extend({
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
var QuarantinedJourneyFrontmatterSchema = JourneyFrontmatterSchema.extend({
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

// src/utils/result.ts
function ok(value, warnings) {
  return warnings?.length ? { success: true, value, warnings } : { success: true, value };
}
function err(error) {
  return { success: false, error };
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

// src/utils/escaping.ts
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\\/]/g, "\\$&");
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
function isJourneyTestCurrent(journeyPath, testPath, testContent) {
  const content = readFileSync(journeyPath, "utf-8");
  const { frontmatter } = splitJourneyContent(content);
  const parsed = parse(frontmatter);
  if (!Array.isArray(parsed.tests)) {
    return false;
  }
  const testEntry = parsed.tests.find(
    (t) => typeof t === "string" ? t === testPath : t.path === testPath
  );
  if (!testEntry || typeof testEntry === "string") {
    return false;
  }
  const currentHash = calculateContentHash(testContent);
  return testEntry.hash === currentHash;
}

export { AccessibilitySchema, AccessibilityTimingSchema, ClarifiedJourneyFrontmatterSchema, CleanupStrategySchema, CompletionSignalSchema, CompletionTypeSchema, DataConfigSchema, DataStrategySchema, ElementStateSchema, ImplementedJourneyFrontmatterSchema, JourneyFrontmatterSchema, JourneyParseError, JourneyStatusSchema, JourneyTierSchema, LinksSchema, ModulesSchema, NegativePathSchema, PerformanceSchema, QuarantinedJourneyFrontmatterSchema, TestDataSetSchema, TestRefSchema, VisualRegressionSchema, completionSignalsToAssertions, isJourneyTestCurrent, normalizeJourney, parseJourney, parseJourneyContent, parseJourneyForAutoGen, parseStructuredSteps, tryParseJourneyContent, updateJourneyFrontmatter, validateForAutoGen, validateJourneyForCodeGen };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map