import { existsSync, readFileSync, mkdirSync, writeFileSync, unlinkSync, mkdtempSync, rmSync } from 'fs';
import { resolve, join, dirname, relative, basename, extname } from 'path';
import { pathToFileURL, fileURLToPath } from 'url';
import { parse, stringify } from 'yaml';
import { z } from 'zod';
import crypto, { randomBytes, randomUUID, createHash } from 'crypto';
import fg from 'fast-glob';
import ejs from 'ejs';
import { Project, ModuleKind, ScriptTarget, SyntaxKind } from 'ts-morph';
import { spawnSync, execSync, spawn } from 'child_process';
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
  } catch (err3) {
    return {
      loaded: false,
      entryCount: 0,
      exportedAt: null,
      error: `Failed to load glossary: ${err3 instanceof Error ? err3.message : String(err3)}`
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
function getAutogenDir(explicitBaseDir) {
  return join(getArtkDir(explicitBaseDir), "autogen");
}
function getAutogenArtifact(artifact, explicitBaseDir) {
  const dir = getAutogenDir(explicitBaseDir);
  switch (artifact) {
    case "analysis":
      return join(dir, "analysis.json");
    case "plan":
      return join(dir, "plan.json");
    case "state":
      return join(dir, "pipeline-state.json");
    case "results":
      return join(dir, "results.json");
    case "samples":
      return join(dir, "samples");
    case "agreement":
      return join(dir, "samples", "agreement.json");
    case "telemetry":
      return join(dir, "telemetry.json");
  }
}
async function ensureAutogenDir(explicitBaseDir) {
  const { mkdir } = await import('fs/promises');
  const dir = getAutogenDir(explicitBaseDir);
  await mkdir(dir, { recursive: true });
  await mkdir(join(dir, "samples"), { recursive: true });
}
async function cleanAutogenArtifacts(explicitBaseDir) {
  const { rm } = await import('fs/promises');
  const dir = getAutogenDir(explicitBaseDir);
  if (existsSync(dir)) {
    await rm(dir, { recursive: true });
  }
  await ensureAutogenDir(explicitBaseDir);
}
function hasAutogenArtifacts(explicitBaseDir) {
  const dir = getAutogenDir(explicitBaseDir);
  if (!existsSync(dir)) {
    return false;
  }
  const artifactTypes = ["analysis", "plan", "state", "results"];
  return artifactTypes.some((artifact) => existsSync(getAutogenArtifact(artifact, explicitBaseDir)));
}
var cachedPackageRoot, cachedModuleDir, cachedHarnessRoot;
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
  const z8 = 1.96;
  const n = total;
  const denominator = 1 + z8 * z8 / n;
  const center = p + z8 * z8 / (2 * n);
  const spread = z8 * Math.sqrt((p * (1 - p) + z8 * z8 / (4 * n)) / n);
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
  /** Enable LLKB integration (default: true - LLKB enhances test generation) */
  enabled: z.boolean().default(true),
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
  } catch (err3) {
    throw new ConfigLoadError(`Failed to read config file: ${resolvedPath}`, err3);
  }
  let parsed;
  try {
    parsed = parse(rawContent);
  } catch (err3) {
    throw new ConfigLoadError(`Invalid YAML in config file: ${resolvedPath}`, err3);
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
  } catch (err3) {
    throw new ConfigLoadError(`Failed to read config file: ${resolvedPath}`, err3);
  }
  let parsed;
  try {
    parsed = parse(rawContent);
  } catch (err3) {
    throw new ConfigLoadError(`Invalid YAML in config file: ${resolvedPath}`, err3);
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
  if (config.llkb === void 0 || config.llkb === null) {
    config.llkb = {
      enabled: true,
      // LLKB should always be on by default
      level: "enhance"
      // Match schema default
    };
  } else {
    config.llkb = {
      enabled: config.llkb.enabled ?? true,
      // Default to true if not specified
      level: config.llkb.level ?? "enhance",
      // Default to enhance if not specified
      // Preserve any other user-specified fields
      ...config.llkb.configPath !== void 0 && { configPath: config.llkb.configPath },
      ...config.llkb.glossaryPath !== void 0 && { glossaryPath: config.llkb.glossaryPath }
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
  } catch (err3) {
    throw new JourneyParseError(
      `Failed to read journey file: ${resolvedPath}`,
      resolvedPath,
      err3
    );
  }
  let frontmatterStr;
  let body;
  try {
    const extracted = extractFrontmatter(content);
    frontmatterStr = extracted.frontmatter;
    body = extracted.body;
  } catch (err3) {
    throw new JourneyParseError(
      `Invalid frontmatter in journey file: ${resolvedPath}`,
      resolvedPath,
      err3
    );
  }
  let rawFrontmatter;
  try {
    rawFrontmatter = parse(frontmatterStr);
  } catch (err3) {
    throw new JourneyParseError(
      `Invalid YAML in journey frontmatter: ${resolvedPath}`,
      resolvedPath,
      err3
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
    } catch (err3) {
      warnings.push(`Failed to scan ${filePath}: ${err3}`);
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

// src/utils/version.ts
init_paths();
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

// src/codegen/generateTest.ts
init_paths();

// src/variants/index.ts
function detectVariant() {
  const nodeVersionStr = process.version.slice(1);
  const nodeVersion = parseInt(nodeVersionStr.split(".")[0] ?? "18", 10);
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
init_paths();
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

// src/index.ts
init_paths();

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
  const result = spawnSync("npx", ["eslint", "--version"], {
    cwd,
    stdio: "pipe",
    encoding: "utf-8"
  });
  return result.status === 0;
}
function isPlaywrightPluginAvailable(cwd) {
  const result = spawnSync("npm", ["list", "eslint-plugin-playwright"], {
    cwd,
    stdio: "pipe",
    encoding: "utf-8"
  });
  if (result.status !== 0) {
    return false;
  }
  const output = result.stdout || "";
  return output.includes("eslint-plugin-playwright");
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
    const result = spawnSync("npx", args, {
      cwd,
      stdio: "pipe",
      encoding: "utf-8"
    });
    const output = result.stdout || "";
    if (result.status === 0) {
      return {
        passed: true,
        output,
        issues: parseESLintOutput(output),
        errorCount: 0,
        warningCount: 0
      };
    }
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
  const args = ["eslint", "--format", "json"];
  if (fix) {
    args.push("--fix");
  }
  if (configPath && existsSync(configPath)) {
    args.push("--config", configPath);
  }
  args.push(filePath);
  const result = spawnSync("npx", args, {
    cwd,
    stdio: "pipe",
    encoding: "utf-8"
  });
  const output = result.stdout || "";
  if (result.status === 0) {
    return {
      passed: true,
      output,
      issues: parseESLintOutput(output),
      errorCount: 0,
      warningCount: 0
    };
  }
  const issues = parseESLintOutput(output);
  return {
    passed: issues.filter((i) => i.severity === "error").length === 0,
    output,
    issues,
    errorCount: issues.filter((i) => i.severity === "error").length,
    warningCount: issues.filter((i) => i.severity === "warning").length
  };
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
  const tempDir = mkdtempSync(join(tmpdir(), "autogen-verify-"));
  const reportPath = join(tempDir, "results.json");
  const args = buildPlaywrightArgs({
    ...options,
    reporter: `json,line`
  });
  const command = `npx playwright ${args.join(" ")}`;
  const startTime = Date.now();
  try {
    const result = spawnSync("npx", ["playwright", ...args], {
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
    const success = result.status === 0;
    return {
      success,
      exitCode: result.status ?? 1,
      stdout: result.stdout || "",
      stderr: result.stderr || "",
      reportPath: existsSync(reportPath) ? reportPath : void 0,
      duration: Date.now() - startTime,
      command
    };
  } finally {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
    }
  }
}
function runPlaywrightAsync(options = {}) {
  return new Promise((resolve7) => {
    const { cwd = process.cwd(), env = {} } = options;
    const tempDir = mkdtempSync(join(tmpdir(), "autogen-verify-"));
    const reportPath = join(tempDir, "results.json");
    const args = buildPlaywrightArgs({
      ...options,
      reporter: "json,line"
    });
    const command = `npx playwright ${args.join(" ")}`;
    const startTime = Date.now();
    let stdout = "";
    let stderr = "";
    const cleanupAndResolve = (result) => {
      try {
        rmSync(tempDir, { recursive: true, force: true });
      } catch {
      }
      resolve7(result);
    };
    const child = spawn("npx", ["playwright", ...args], {
      cwd,
      env: {
        ...process.env,
        ...env,
        PLAYWRIGHT_JSON_OUTPUT_NAME: reportPath
      }
    });
    child.stdout?.on("data", (data) => {
      stdout += data.toString();
    });
    child.stderr?.on("data", (data) => {
      stderr += data.toString();
    });
    child.on("close", (code) => {
      cleanupAndResolve({
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
      cleanupAndResolve({
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
  const result = spawnSync("npx", ["tsc", "--noEmit", testFilePath], {
    cwd: cwd || dirname(testFilePath),
    stdio: "pipe"
  });
  return result.status === 0;
}
function writeAndRunTest(code, filename, options = {}) {
  const tempDir = mkdtempSync(join(tmpdir(), "autogen-test-"));
  const testPath = join(tempDir, filename);
  writeFileSync(testPath, code, "utf-8");
  try {
    return runTestFile(testPath, options);
  } finally {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
    }
  }
}
function getTestCount(testFile, cwd) {
  const result = spawnSync("npx", ["playwright", "test", "--list", testFile], {
    cwd,
    stdio: "pipe",
    encoding: "utf-8"
  });
  if (result.status !== 0) {
    return 0;
  }
  const output = result.stdout || "";
  const match = output.match(/Listing (\d+) tests?/);
  return match ? parseInt(match[1], 10) : 0;
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
    for (const err3 of evidence.networkErrors) {
      lines.push(`- ${err3}`);
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

// src/shared/index.ts
var shared_exports = {};
__export(shared_exports, {
  AutogenEnhancementConfigSchema: () => AutogenEnhancementConfigSchema,
  CircuitBreakerConfigSchema: () => CircuitBreakerConfigSchema,
  CodeChangeSchema: () => CodeChangeSchema,
  CodeFixResponseSchema: () => CodeFixResponseSchema,
  CostLimitsSchema: () => CostLimitsSchema,
  CostTracker: () => CostTracker,
  ErrorAnalysisResponseSchema: () => ErrorAnalysisResponseSchema,
  LLMConfigSchema: () => LLMConfigSchema,
  LLMProviderSchema: () => LLMProviderSchema,
  RefinementConfigSchema: () => RefinementConfigSchema,
  SCoTAtomicStepSchema: () => SCoTAtomicStepSchema,
  SCoTConditionSchema: () => SCoTConditionSchema,
  SCoTConfigSchema: () => SCoTConfigSchema,
  SCoTIteratorSchema: () => SCoTIteratorSchema,
  SCoTPlanResponseSchema: () => SCoTPlanResponseSchema,
  SCoTStructureSchema: () => SCoTStructureSchema,
  SuggestedApproachSchema: () => SuggestedApproachSchema,
  Telemetry: () => Telemetry,
  TokenUsageSchema: () => TokenUsageSchema,
  UncertaintyConfigSchema: () => UncertaintyConfigSchema,
  checkLLMAvailability: () => checkLLMAvailability,
  createCostTracker: () => createCostTracker,
  createTelemetry: () => createTelemetry,
  err: () => err2,
  estimateCost: () => estimateCost,
  estimateTokensFromText: () => estimateTokensFromText,
  extractJson: () => extractJson,
  getTelemetry: () => getTelemetry,
  isErr: () => isErr2,
  isOk: () => isOk2,
  ok: () => ok2,
  parseLLMResponse: () => parseLLMResponse,
  resetGlobalTelemetry: () => resetGlobalTelemetry,
  validateEnhancementConfig: () => validateEnhancementConfig
});
function ok2(value) {
  return { ok: true, value };
}
function err2(error) {
  return { ok: false, error };
}
function isOk2(result) {
  return result.ok;
}
function isErr2(result) {
  return !result.ok;
}
var LLMProviderSchema = z.enum([
  "openai",
  "anthropic",
  "azure",
  "bedrock",
  "ollama",
  "local",
  "none"
]);
var LLMConfigSchema = z.object({
  provider: LLMProviderSchema.default("none"),
  model: z.string().default(""),
  temperature: z.number().min(0).max(2).default(0.2),
  maxTokens: z.number().min(100).max(32e3).default(2e3),
  timeoutMs: z.number().min(1e3).max(3e5).default(3e4),
  maxRetries: z.number().min(0).max(5).default(2),
  retryDelayMs: z.number().min(100).max(1e4).default(1e3)
});
var CostLimitsSchema = z.object({
  perTestUsd: z.number().min(0.01).max(10).default(0.1),
  perSessionUsd: z.number().min(0.1).max(100).default(5),
  enabled: z.boolean().default(true)
});
var TokenUsageSchema = z.object({
  promptTokens: z.number().default(0),
  completionTokens: z.number().default(0),
  totalTokens: z.number().default(0),
  estimatedCostUsd: z.number().default(0)
});
function extractJson(response) {
  const jsonBlockMatch = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (jsonBlockMatch && jsonBlockMatch[1]) {
    return jsonBlockMatch[1].trim();
  }
  const objectMatch = response.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      JSON.parse(objectMatch[0]);
      return objectMatch[0];
    } catch {
    }
  }
  const arrayMatch = response.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      JSON.parse(arrayMatch[0]);
      return arrayMatch[0];
    } catch {
    }
  }
  return null;
}
async function parseLLMResponse(rawResponse, schema, options = {}) {
  const { maxRetries = 0, onRetry } = options;
  let lastError = null;
  let currentResponse = rawResponse;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const jsonStr = extractJson(currentResponse);
    if (!jsonStr) {
      lastError = {
        type: "EXTRACTION_FAILED",
        message: "Could not find JSON in LLM response",
        rawResponse: currentResponse
      };
      if (attempt < maxRetries && onRetry) {
        currentResponse = await onRetry(attempt + 1, lastError);
        continue;
      }
      return err2(lastError);
    }
    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      lastError = {
        type: "INVALID_JSON",
        message: `JSON parse error: ${e instanceof Error ? e.message : "Unknown"}`,
        rawResponse: currentResponse
      };
      if (attempt < maxRetries && onRetry) {
        currentResponse = await onRetry(attempt + 1, lastError);
        continue;
      }
      return err2(lastError);
    }
    const result = schema.safeParse(parsed);
    if (!result.success) {
      lastError = {
        type: "SCHEMA_VALIDATION",
        message: `Schema validation failed: ${result.error.message}`,
        rawResponse: currentResponse,
        validationErrors: result.error
      };
      if (attempt < maxRetries && onRetry) {
        currentResponse = await onRetry(attempt + 1, lastError);
        continue;
      }
      return err2(lastError);
    }
    return ok2(result.data);
  }
  return err2(lastError);
}
var SCoTAtomicStepSchema = z.object({
  action: z.string(),
  target: z.string().optional(),
  value: z.string().optional(),
  assertion: z.string().optional()
});
var SCoTConditionSchema = z.object({
  element: z.string().optional(),
  state: z.enum(["visible", "hidden", "enabled", "disabled", "exists", "checked", "unchecked"]),
  negate: z.boolean().optional()
});
var SCoTIteratorSchema = z.object({
  variable: z.string(),
  collection: z.string(),
  maxIterations: z.number().optional()
});
var SCoTStructureSchema = z.object({
  type: z.enum(["sequential", "branch", "loop"]),
  description: z.string(),
  steps: z.array(SCoTAtomicStepSchema).optional(),
  condition: SCoTConditionSchema.optional(),
  thenBranch: z.array(SCoTAtomicStepSchema).optional(),
  elseBranch: z.array(SCoTAtomicStepSchema).optional(),
  iterator: SCoTIteratorSchema.optional(),
  body: z.array(SCoTAtomicStepSchema).optional()
});
var SCoTPlanResponseSchema = z.object({
  reasoning: z.string().min(1),
  confidence: z.number().min(0).max(1),
  plan: z.array(SCoTStructureSchema),
  warnings: z.array(z.string()).default([])
});
var SuggestedApproachSchema = z.object({
  name: z.string(),
  description: z.string(),
  confidence: z.number().min(0).max(1),
  complexity: z.enum(["simple", "moderate", "complex"]),
  requiredChanges: z.array(z.string())
});
var ErrorAnalysisResponseSchema = z.object({
  rootCause: z.string().min(1),
  confidence: z.number().min(0).max(1),
  suggestedApproaches: z.array(SuggestedApproachSchema).min(1)
});
var CodeChangeSchema = z.object({
  type: z.enum(["replace", "insert", "delete"]),
  lineStart: z.number(),
  lineEnd: z.number().optional(),
  explanation: z.string()
});
var CodeFixResponseSchema = z.object({
  fixedCode: z.string().min(1),
  changes: z.array(CodeChangeSchema),
  explanation: z.string()
});
var SCoTConfigSchema = z.object({
  enabled: z.boolean().default(false),
  minConfidence: z.number().min(0).max(1).default(0.7),
  maxStructures: z.number().min(1).max(100).default(20),
  includeReasoningComments: z.boolean().default(true),
  llm: LLMConfigSchema.default({}),
  fallback: z.enum(["pattern-only", "error"]).default("pattern-only")
}).default({});
var CircuitBreakerConfigSchema = z.object({
  sameErrorThreshold: z.number().min(1).max(5).default(2),
  errorHistorySize: z.number().min(5).max(50).default(10),
  degradationThreshold: z.number().min(0.1).max(1).default(0.5),
  cooldownMs: z.number().min(1e3).max(3e5).default(6e4)
}).default({});
var RefinementConfigSchema = z.object({
  enabled: z.boolean().default(false),
  maxAttempts: z.number().min(1).max(5).default(3),
  timeouts: z.object({
    session: z.number().min(6e4).max(6e5).default(3e5),
    execution: z.number().min(1e4).max(12e4).default(6e4),
    delayBetweenAttempts: z.number().min(500).max(1e4).default(1e3)
  }).default({}),
  circuitBreaker: CircuitBreakerConfigSchema,
  errorHandling: z.object({
    categories: z.array(z.string()).default([]),
    skip: z.array(z.string()).default(["FIXTURE", "PAGE_ERROR"])
  }).default({}),
  learning: z.object({
    enabled: z.boolean().default(true),
    minGeneralizability: z.number().min(0).max(1).default(0.6)
  }).default({}),
  llm: LLMConfigSchema.default({}),
  advanced: z.object({
    minAutoFixConfidence: z.number().min(0).max(1).default(0.7),
    includeScreenshots: z.boolean().default(true),
    includeTraces: z.boolean().default(false),
    verbose: z.boolean().default(false),
    dryRun: z.boolean().default(false)
  }).default({})
}).default({});
var UncertaintyConfigSchema = z.object({
  enabled: z.boolean().default(false),
  thresholds: z.object({
    autoAccept: z.number().min(0.5).max(1).default(0.85),
    block: z.number().min(0).max(0.8).default(0.5),
    minimumPerDimension: z.number().min(0).max(0.8).default(0.4)
  }).default({}),
  weights: z.object({
    syntax: z.number().min(0).max(1).default(0.2),
    pattern: z.number().min(0).max(1).default(0.3),
    selector: z.number().min(0).max(1).default(0.3),
    agreement: z.number().min(0).max(1).default(0.2)
  }).default({}),
  sampling: z.object({
    enabled: z.boolean().default(false),
    sampleCount: z.number().min(2).max(5).default(3),
    temperatures: z.array(z.number()).default([0.2, 0.5, 0.7])
  }).default({}),
  reporting: z.object({
    includeInTestComments: z.boolean().default(true),
    generateMarkdownReport: z.boolean().default(false)
  }).default({})
}).default({});
var AutogenEnhancementConfigSchema = z.object({
  scot: SCoTConfigSchema,
  refinement: RefinementConfigSchema,
  uncertainty: UncertaintyConfigSchema,
  costLimits: CostLimitsSchema.default({})
});
var PROVIDER_ENV_VARS = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  azure: "AZURE_OPENAI_API_KEY",
  bedrock: "AWS_ACCESS_KEY_ID",
  ollama: null,
  local: null,
  none: null
};
function checkLLMAvailability(provider) {
  if (provider === "none") {
    return { available: true, provider, message: "LLM disabled" };
  }
  if (provider === "local" || provider === "ollama") {
    return { available: true, provider, message: "Local LLM, no API key required" };
  }
  const envVar = PROVIDER_ENV_VARS[provider];
  if (!envVar) {
    return { available: false, provider, message: `Unknown provider: ${provider}` };
  }
  if (!process.env[envVar]) {
    return {
      available: false,
      provider,
      missingEnvVar: envVar,
      message: `${provider} requires ${envVar} environment variable`
    };
  }
  return { available: true, provider, message: `${provider} configured` };
}
function validateEnhancementConfig(rawConfig) {
  const errors = [];
  const warnings = [];
  const result = AutogenEnhancementConfigSchema.safeParse(rawConfig ?? {});
  if (!result.success) {
    for (const issue of result.error.issues) {
      errors.push({
        path: issue.path.join("."),
        message: issue.message,
        severity: "error"
      });
    }
    return { valid: false, errors, warnings };
  }
  const config = result.data;
  if (config.scot.enabled) {
    const llmCheck = checkLLMAvailability(config.scot.llm.provider);
    if (!llmCheck.available) {
      errors.push({
        path: "scot.llm.provider",
        message: `SCoT is enabled but LLM is not available: ${llmCheck.message}. Set ${llmCheck.missingEnvVar} or set scot.enabled: false`,
        severity: "error"
      });
    }
  }
  if (config.refinement.enabled) {
    const llmCheck = checkLLMAvailability(config.refinement.llm.provider);
    if (!llmCheck.available) {
      errors.push({
        path: "refinement.llm.provider",
        message: `Self-Refinement is enabled but LLM is not available: ${llmCheck.message}. Set ${llmCheck.missingEnvVar} or set refinement.enabled: false`,
        severity: "error"
      });
    }
  }
  const weightSum = config.uncertainty.weights.syntax + config.uncertainty.weights.pattern + config.uncertainty.weights.selector + config.uncertainty.weights.agreement;
  if (Math.abs(weightSum - 1) > 1e-3) {
    warnings.push(`Uncertainty weights sum to ${weightSum.toFixed(2)}, not 1.0. Scores may be unexpected.`);
  }
  if (config.uncertainty.thresholds.block >= config.uncertainty.thresholds.autoAccept) {
    warnings.push(`Uncertainty block threshold (${config.uncertainty.thresholds.block}) >= autoAccept (${config.uncertainty.thresholds.autoAccept}). This may cause unexpected blocking.`);
  }
  return {
    valid: errors.length === 0,
    config: errors.length === 0 ? config : void 0,
    errors,
    warnings
  };
}

// src/shared/cost-tracker.ts
var MODEL_PRICING = {
  // OpenAI
  "gpt-4o": { input: 2.5, output: 10 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4-turbo": { input: 10, output: 30 },
  "gpt-3.5-turbo": { input: 0.5, output: 1.5 },
  // Anthropic
  "claude-opus-4-20250514": { input: 15, output: 75 },
  "claude-sonnet-4-20250514": { input: 3, output: 15 },
  "claude-3-5-sonnet-20241022": { input: 3, output: 15 },
  "claude-3-haiku-20240307": { input: 0.25, output: 1.25 },
  // Default for unknown models
  "default": { input: 1, output: 3 }
};
function estimateCost(usage, model) {
  const pricing = MODEL_PRICING[model] ?? MODEL_PRICING["default"];
  if (!pricing) {
    throw new Error("Default pricing not found in MODEL_PRICING");
  }
  const inputCost = usage.promptTokens / 1e6 * pricing.input;
  const outputCost = usage.completionTokens / 1e6 * pricing.output;
  return inputCost + outputCost;
}
function estimateTokensFromText(text) {
  return Math.ceil(text.length / 4);
}
var CostTracker = class {
  state;
  limits;
  model;
  constructor(limits, model = "default") {
    this.limits = limits;
    this.model = model;
    this.state = {
      sessionCost: 0,
      testCost: 0,
      totalTokens: 0,
      sessionStartedAt: /* @__PURE__ */ new Date()
    };
  }
  /**
   * Track token usage and update costs
   */
  trackUsage(usage) {
    const cost = usage.estimatedCostUsd > 0 ? usage.estimatedCostUsd : estimateCost(usage, this.model);
    this.state.sessionCost += cost;
    this.state.testCost += cost;
    this.state.totalTokens += usage.totalTokens;
  }
  /**
   * Get current session cost
   */
  getSessionCost() {
    return this.state.sessionCost;
  }
  /**
   * Get current test cost
   */
  getTestCost() {
    return this.state.testCost;
  }
  /**
   * Get total tokens used
   */
  getTotalTokens() {
    return this.state.totalTokens;
  }
  /**
   * Reset test cost (call between tests)
   */
  resetTestCost() {
    this.state.testCost = 0;
  }
  /**
   * Check if we are still under budget (have not exceeded limit)
   * @returns true if cost is UNDER the limit (can continue), false if limit exceeded
   */
  isUnderBudget(type) {
    if (!this.limits.enabled) return true;
    if (type === "test") {
      return this.state.testCost < this.limits.perTestUsd;
    } else {
      return this.state.sessionCost < this.limits.perSessionUsd;
    }
  }
  /**
   * @deprecated Use isUnderBudget() instead - clearer naming
   */
  checkLimit(type) {
    return this.isUnderBudget(type);
  }
  /**
   * Check if adding estimated tokens would exceed limit
   */
  wouldExceedLimit(estimatedTokens, type = "test") {
    if (!this.limits.enabled) return false;
    const estimatedUsage = {
      promptTokens: estimatedTokens,
      completionTokens: Math.ceil(estimatedTokens * 0.5)};
    const estimatedCost = estimateCost(estimatedUsage, this.model);
    if (type === "test") {
      return this.state.testCost + estimatedCost >= this.limits.perTestUsd;
    } else {
      return this.state.sessionCost + estimatedCost >= this.limits.perSessionUsd;
    }
  }
  /**
   * Get remaining budget
   */
  getRemainingBudget(type) {
    if (!this.limits.enabled) return Infinity;
    if (type === "test") {
      return Math.max(0, this.limits.perTestUsd - this.state.testCost);
    } else {
      return Math.max(0, this.limits.perSessionUsd - this.state.sessionCost);
    }
  }
  /**
   * Get state snapshot
   */
  getState() {
    return { ...this.state };
  }
  /**
   * Create summary report
   */
  getSummary() {
    return {
      sessionCost: this.state.sessionCost,
      testCost: this.state.testCost,
      totalTokens: this.state.totalTokens,
      sessionDurationMs: Date.now() - this.state.sessionStartedAt.getTime(),
      testBudgetRemaining: this.getRemainingBudget("test"),
      sessionBudgetRemaining: this.getRemainingBudget("session"),
      limitsEnabled: this.limits.enabled
    };
  }
};
function createCostTracker(limits, model) {
  const defaultLimits = {
    perTestUsd: 0.1,
    perSessionUsd: 5,
    enabled: true,
    ...limits
  };
  return new CostTracker(defaultLimits, model);
}

// src/shared/telemetry.ts
init_paths();
var DEFAULT_CONFIG = {
  enabled: true,
  maxEvents: 100,
  defaultModel: "gpt-4o-mini"
};
function createEmptyTelemetryData(sessionId) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  return {
    version: 1,
    sessionId,
    createdAt: now,
    updatedAt: now,
    totalTokens: 0,
    totalCostUsd: 0,
    commandStats: {},
    recentEvents: [],
    errorCounts: {}
  };
}
var Telemetry = class {
  data;
  config;
  sessionId;
  pendingCommands;
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sessionId = this.generateSessionId();
    this.data = createEmptyTelemetryData(this.sessionId);
    this.pendingCommands = /* @__PURE__ */ new Map();
  }
  generateSessionId() {
    return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
  /**
   * Load existing telemetry data or create new
   */
  async load(baseDir) {
    if (!this.config.enabled) return;
    try {
      const telemetryPath = getAutogenArtifact("telemetry", baseDir);
      if (existsSync(telemetryPath)) {
        const content = readFileSync(telemetryPath, "utf-8");
        const loaded = JSON.parse(content);
        this.data = {
          ...loaded,
          sessionId: this.sessionId,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
      }
    } catch {
      this.data = createEmptyTelemetryData(this.sessionId);
    }
  }
  /**
   * Save telemetry data to disk
   */
  async save(baseDir) {
    if (!this.config.enabled) return;
    try {
      await ensureAutogenDir(baseDir);
      const telemetryPath = getAutogenArtifact("telemetry", baseDir);
      this.data.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      writeFileSync(telemetryPath, JSON.stringify(this.data, null, 2), "utf-8");
    } catch {
    }
  }
  /**
   * Track command start
   */
  trackCommandStart(command) {
    if (!this.config.enabled) return "";
    const eventId = `${command}-${Date.now()}`;
    this.pendingCommands.set(eventId, {
      startTime: Date.now(),
      command
    });
    this.addEvent({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      type: "command_start",
      command,
      data: { eventId }
    });
    return eventId;
  }
  /**
   * Track command end
   */
  trackCommandEnd(eventId, success, data = {}) {
    if (!this.config.enabled) return;
    const pending = this.pendingCommands.get(eventId);
    if (!pending) return;
    const durationMs = Date.now() - pending.startTime;
    const { command } = pending;
    if (!this.data.commandStats[command]) {
      this.data.commandStats[command] = {
        count: 0,
        successCount: 0,
        errorCount: 0,
        avgDurationMs: 0,
        totalDurationMs: 0,
        lastRun: null
      };
    }
    const stats = this.data.commandStats[command];
    stats.count++;
    if (success) {
      stats.successCount++;
    } else {
      stats.errorCount++;
    }
    stats.totalDurationMs += durationMs;
    stats.avgDurationMs = stats.totalDurationMs / stats.count;
    stats.lastRun = (/* @__PURE__ */ new Date()).toISOString();
    this.addEvent({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      type: "command_end",
      command,
      data: { eventId, success, durationMs, ...data }
    });
    this.pendingCommands.delete(eventId);
  }
  /**
   * Track LLM usage
   */
  trackLLMUsage(command, usage, model = this.config.defaultModel) {
    if (!this.config.enabled) return;
    const cost = usage.estimatedCostUsd > 0 ? usage.estimatedCostUsd : estimateCost(usage, model);
    this.data.totalTokens += usage.totalTokens;
    this.data.totalCostUsd += cost;
    this.addEvent({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      type: "llm_call",
      command,
      data: {
        model,
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        totalTokens: usage.totalTokens,
        costUsd: cost
      }
    });
  }
  /**
   * Track error
   */
  trackError(command, errorType, message) {
    if (!this.config.enabled) return;
    this.data.errorCounts[errorType] = (this.data.errorCounts[errorType] || 0) + 1;
    this.addEvent({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      type: "error",
      command,
      data: { errorType, message }
    });
  }
  /**
   * Track pipeline state transition
   */
  trackPipelineTransition(command, fromStage, toStage, data = {}) {
    if (!this.config.enabled) return;
    this.addEvent({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      type: "pipeline_transition",
      command,
      data: { fromStage, toStage, ...data }
    });
  }
  addEvent(event) {
    this.data.recentEvents.push(event);
    if (this.data.recentEvents.length > this.config.maxEvents) {
      this.data.recentEvents = this.data.recentEvents.slice(-this.config.maxEvents);
    }
  }
  /**
   * Get telemetry summary
   */
  getSummary() {
    return {
      sessionId: this.sessionId,
      totalTokens: this.data.totalTokens,
      totalCostUsd: this.data.totalCostUsd,
      commandStats: { ...this.data.commandStats },
      topErrors: Object.entries(this.data.errorCounts).sort(([, a], [, b]) => b - a).slice(0, 5).map(([type, count]) => ({ type, count })),
      eventCount: this.data.recentEvents.length
    };
  }
  /**
   * Get raw data (for debugging)
   */
  getData() {
    return { ...this.data };
  }
  /**
   * Reset telemetry (for testing)
   */
  reset() {
    this.sessionId = this.generateSessionId();
    this.data = createEmptyTelemetryData(this.sessionId);
    this.pendingCommands.clear();
  }
};
var globalTelemetry = null;
function getTelemetry(config) {
  if (!globalTelemetry) {
    globalTelemetry = new Telemetry(config);
  }
  return globalTelemetry;
}
function createTelemetry(config) {
  return new Telemetry(config);
}
function resetGlobalTelemetry() {
  globalTelemetry = null;
}

// src/scot/index.ts
var scot_exports = {};
__export(scot_exports, {
  FEW_SHOT_EXAMPLES: () => FEW_SHOT_EXAMPLES,
  SCOT_SYSTEM_PROMPT: () => SCOT_SYSTEM_PROMPT,
  createErrorCorrectionPrompt: () => createErrorCorrectionPrompt,
  createUserPrompt: () => createUserPrompt,
  extractCodeContext: () => extractCodeContext,
  generateSCoTPlan: () => generateSCoTPlan,
  generateSCoTPrompts: () => generateSCoTPrompts,
  getValidationSummary: () => getValidationSummary,
  isBranch: () => isBranch,
  isLoop: () => isLoop,
  isSequential: () => isSequential,
  parseSCoTPlan: () => parseSCoTPlan,
  processSCoTPlanFromJSON: () => processSCoTPlanFromJSON,
  quickValidateConfidence: () => quickValidateConfidence,
  validateSCoTPlan: () => validateSCoTPlan
});

// src/scot/types.ts
function isSequential(structure) {
  return structure.type === "sequential";
}
function isBranch(structure) {
  return structure.type === "branch";
}
function isLoop(structure) {
  return structure.type === "loop";
}

// src/scot/parser.ts
var PATTERNS = {
  SEQUENTIAL: /^SEQUENTIAL:\s*(.+)$/im,
  BRANCH: /^BRANCH:\s*(.+)$/im,
  LOOP: /^LOOP:\s*(.+)$/im,
  IF: /^IF\s+(.+)\s+THEN$/im,
  ELSE: /^ELSE$/im,
  ENDIF: /^ENDIF$/im,
  FOR_EACH: /^FOR\s+EACH\s+(\w+)\s+IN\s+(.+)$/im,
  ENDFOR: /^ENDFOR$/im,
  STEP: /^\s*(\d+[a-z]?)\.\s*(.+)$/m,
  REASONING: /REASONING:\s*([\s\S]*?)(?=CONFIDENCE:|PLAN:|$)/i,
  CONFIDENCE: /CONFIDENCE:\s*([\d.]+)/i,
  WARNINGS: /WARNINGS:\s*([\s\S]*?)$/i,
  ACTION_STEP: /^-\s*(.+)$/m
};
async function parseSCoTPlan(llmResponse, options) {
  const { journeyId, llmModel = "unknown", maxRetries = 1 } = options;
  const jsonResult = await parseLLMResponse(llmResponse, SCoTPlanResponseSchema, {
    maxRetries
  });
  if (jsonResult.ok) {
    const normalized = {
      ...jsonResult.value,
      warnings: jsonResult.value.warnings ?? []
    };
    const plan = convertResponseToPlan(normalized, journeyId, llmModel, "json");
    return ok2(plan);
  }
  const textResult = parseTextFormat(llmResponse, journeyId, llmModel);
  return textResult;
}
function convertResponseToPlan(response, journeyId, llmModel, method) {
  const structures = response.plan.map((item) => {
    if (item.type === "sequential") {
      return {
        type: "sequential",
        description: item.description,
        steps: (item.steps ?? []).map(convertStep)
      };
    } else if (item.type === "branch") {
      return {
        type: "branch",
        description: item.description,
        condition: item.condition ?? { state: "visible" },
        thenBranch: (item.thenBranch ?? []).map(convertStep),
        elseBranch: item.elseBranch?.map(convertStep)
      };
    } else {
      return {
        type: "loop",
        description: item.description,
        iterator: item.iterator ?? { variable: "item", collection: "items" },
        body: (item.body ?? []).map(convertStep),
        maxIterations: item.iterator?.maxIterations
      };
    }
  });
  const metadata = {
    generatedAt: /* @__PURE__ */ new Date(),
    llmModel,
    tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCostUsd: 0 },
    parseAttempts: 1,
    parsingMethod: method
  };
  return {
    journeyId,
    structures,
    reasoning: response.reasoning,
    confidence: response.confidence,
    warnings: response.warnings ?? [],
    metadata
  };
}
function convertStep(step) {
  return {
    action: step.action,
    target: step.target,
    value: step.value,
    assertion: step.assertion
  };
}
function parseTextFormat(text, journeyId, llmModel) {
  try {
    const reasoning = extractReasoning(text);
    const confidence = extractConfidence(text);
    const warnings = extractWarnings(text);
    const structures = extractStructures(text);
    if (structures.length === 0) {
      return err2({
        type: "STRUCTURE_ERROR",
        message: "No SEQUENTIAL, BRANCH, or LOOP structures found in response",
        rawContent: text.substring(0, 500)
      });
    }
    const metadata = {
      generatedAt: /* @__PURE__ */ new Date(),
      llmModel,
      tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCostUsd: 0 },
      parseAttempts: 1,
      parsingMethod: "text"
    };
    return ok2({
      journeyId,
      structures,
      reasoning,
      confidence,
      warnings,
      metadata
    });
  } catch (e) {
    return err2({
      type: "STRUCTURE_ERROR",
      message: e instanceof Error ? e.message : "Unknown parsing error",
      rawContent: text.substring(0, 500)
    });
  }
}
function extractReasoning(text) {
  const match = text.match(PATTERNS.REASONING);
  return match && match[1] ? match[1].trim() : "";
}
function extractConfidence(text) {
  const match = text.match(PATTERNS.CONFIDENCE);
  if (match && match[1]) {
    const value = parseFloat(match[1]);
    if (!isNaN(value) && value >= 0 && value <= 1) {
      return value;
    }
  }
  return 0.5;
}
function extractWarnings(text) {
  const match = text.match(PATTERNS.WARNINGS);
  if (!match || !match[1] || match[1].trim().toLowerCase() === "none") {
    return [];
  }
  return match[1].trim().split("\n").map((w) => w.trim()).filter(Boolean);
}
function extractStructures(text) {
  const structures = [];
  const lines = text.split("\n");
  let i = 0;
  while (i < lines.length) {
    const currentLine = lines[i];
    if (!currentLine) {
      i++;
      continue;
    }
    const line = currentLine.trim();
    const seqMatch = line.match(PATTERNS.SEQUENTIAL);
    if (seqMatch && seqMatch[1]) {
      const { structure, endIndex } = parseSequentialBlock(lines, i, seqMatch[1]);
      structures.push(structure);
      i = endIndex + 1;
      continue;
    }
    const branchMatch = line.match(PATTERNS.BRANCH);
    if (branchMatch && branchMatch[1]) {
      const { structure, endIndex } = parseBranchBlock(lines, i, branchMatch[1]);
      structures.push(structure);
      i = endIndex + 1;
      continue;
    }
    const loopMatch = line.match(PATTERNS.LOOP);
    if (loopMatch && loopMatch[1]) {
      const { structure, endIndex } = parseLoopBlock(lines, i, loopMatch[1]);
      structures.push(structure);
      i = endIndex + 1;
      continue;
    }
    i++;
  }
  return structures;
}
function parseSequentialBlock(lines, startIndex, description) {
  const steps = [];
  let i = startIndex + 1;
  while (i < lines.length) {
    const currentLine = lines[i];
    if (!currentLine) {
      i++;
      continue;
    }
    const line = currentLine.trim();
    if (PATTERNS.SEQUENTIAL.test(line) || PATTERNS.BRANCH.test(line) || PATTERNS.LOOP.test(line)) {
      break;
    }
    const stepMatch = line.match(PATTERNS.STEP);
    if (stepMatch && stepMatch[2]) {
      steps.push(parseStepText(stepMatch[2]));
    }
    const bulletMatch = line.match(PATTERNS.ACTION_STEP);
    if (bulletMatch && bulletMatch[1]) {
      steps.push(parseStepText(bulletMatch[1]));
    }
    i++;
  }
  return {
    structure: { type: "sequential", description, steps },
    endIndex: i - 1
  };
}
function parseBranchBlock(lines, startIndex, description) {
  const thenBranch = [];
  const elseBranch = [];
  let condition = { state: "visible" };
  let inElse = false;
  let i = startIndex + 1;
  while (i < lines.length) {
    const currentLine = lines[i];
    if (!currentLine) {
      i++;
      continue;
    }
    const line = currentLine.trim();
    const ifMatch = line.match(PATTERNS.IF);
    if (ifMatch && ifMatch[1]) {
      condition = parseConditionText(ifMatch[1]);
      i++;
      continue;
    }
    if (PATTERNS.ELSE.test(line)) {
      inElse = true;
      i++;
      continue;
    }
    if (PATTERNS.ENDIF.test(line)) {
      break;
    }
    if (PATTERNS.SEQUENTIAL.test(line) || PATTERNS.BRANCH.test(line) || PATTERNS.LOOP.test(line)) {
      break;
    }
    const bulletMatch = line.match(PATTERNS.ACTION_STEP);
    if (bulletMatch && bulletMatch[1]) {
      const step = parseStepText(bulletMatch[1]);
      if (inElse) {
        elseBranch.push(step);
      } else {
        thenBranch.push(step);
      }
    }
    i++;
  }
  return {
    structure: {
      type: "branch",
      description,
      condition,
      thenBranch,
      elseBranch: elseBranch.length > 0 ? elseBranch : void 0
    },
    endIndex: i
  };
}
function parseLoopBlock(lines, startIndex, description) {
  const body = [];
  let iterator = { variable: "item", collection: "items" };
  let i = startIndex + 1;
  while (i < lines.length) {
    const currentLine = lines[i];
    if (!currentLine) {
      i++;
      continue;
    }
    const line = currentLine.trim();
    const forMatch = line.match(PATTERNS.FOR_EACH);
    if (forMatch && forMatch[1] && forMatch[2]) {
      iterator = { variable: forMatch[1], collection: forMatch[2] };
      i++;
      continue;
    }
    if (PATTERNS.ENDFOR.test(line)) {
      break;
    }
    if (PATTERNS.SEQUENTIAL.test(line) || PATTERNS.BRANCH.test(line) || PATTERNS.LOOP.test(line)) {
      break;
    }
    const bulletMatch = line.match(PATTERNS.ACTION_STEP);
    if (bulletMatch && bulletMatch[1]) {
      body.push(parseStepText(bulletMatch[1]));
    }
    i++;
  }
  return {
    structure: { type: "loop", description, iterator, body },
    endIndex: i
  };
}
function parseStepText(stepText) {
  const lowerText = stepText.toLowerCase();
  if (lowerText.includes("navigate") || lowerText.includes("go to") || lowerText.includes("open")) {
    return { action: "navigate", target: stepText };
  }
  if (lowerText.includes("click") || lowerText.includes("press") || lowerText.includes("tap")) {
    return { action: "click", target: stepText };
  }
  if (lowerText.includes("fill") || lowerText.includes("enter") || lowerText.includes("type") || lowerText.includes("input")) {
    return { action: "fill", target: stepText };
  }
  if (lowerText.includes("select") || lowerText.includes("choose")) {
    return { action: "select", target: stepText };
  }
  if (lowerText.includes("check") || lowerText.includes("toggle")) {
    return { action: "check", target: stepText };
  }
  if (lowerText.includes("wait")) {
    return { action: "wait", target: stepText };
  }
  if (lowerText.includes("verify") || lowerText.includes("assert") || lowerText.includes("expect") || lowerText.includes("confirm") || lowerText.includes("should")) {
    return { action: "assert", assertion: stepText };
  }
  return { action: "action", target: stepText };
}
function parseConditionText(conditionText) {
  const lowerText = conditionText.toLowerCase();
  let state = "visible";
  if (lowerText.includes("hidden") || lowerText.includes("not visible")) {
    state = "hidden";
  } else if (lowerText.includes("disabled")) {
    state = "disabled";
  } else if (lowerText.includes("enabled")) {
    state = "enabled";
  } else if (lowerText.includes("exists") || lowerText.includes("present")) {
    state = "exists";
  } else if (lowerText.includes("checked") || lowerText.includes("selected")) {
    state = "checked";
  } else if (lowerText.includes("unchecked") || lowerText.includes("not selected")) {
    state = "unchecked";
  }
  return { element: conditionText, state };
}

// src/scot/validator.ts
function validateSCoTPlan(plan, config) {
  const errors = [];
  const warnings = [];
  if (!plan.journeyId) {
    errors.push({
      path: "journeyId",
      message: "Plan must have a journeyId",
      severity: "error"
    });
  }
  if (!plan.structures || plan.structures.length === 0) {
    errors.push({
      path: "structures",
      message: "Plan must have at least one structure",
      severity: "error"
    });
  }
  if (plan.structures.length > config.maxStructures) {
    errors.push({
      path: "structures",
      message: `Plan has ${plan.structures.length} structures, exceeds maximum of ${config.maxStructures}`,
      severity: "error"
    });
  }
  if (plan.confidence < config.minConfidence) {
    errors.push({
      path: "confidence",
      message: `Plan confidence ${plan.confidence.toFixed(2)} is below minimum ${config.minConfidence}`,
      severity: "error"
    });
  }
  plan.structures.forEach((structure, index) => {
    const structureErrors = validateStructure(structure, `structures[${index}]`);
    errors.push(...structureErrors);
  });
  if (!plan.reasoning || plan.reasoning.trim().length < 10) {
    warnings.push("Plan reasoning is missing or too short");
  }
  if (plan.warnings && plan.warnings.length > 0) {
    warnings.push(...plan.warnings.map((w) => `LLM warning: ${w}`));
  }
  const loopWarnings = checkForInfiniteLoops(plan.structures);
  warnings.push(...loopWarnings);
  const unreachableWarnings = checkForUnreachableCode(plan.structures);
  warnings.push(...unreachableWarnings);
  return {
    valid: errors.filter((e) => e.severity === "error").length === 0,
    errors,
    warnings
  };
}
function validateStructure(structure, path) {
  const errors = [];
  if (!structure.description || structure.description.trim().length === 0) {
    errors.push({
      path: `${path}.description`,
      message: "Structure must have a description",
      severity: "warning"
    });
  }
  if (isSequential(structure)) {
    errors.push(...validateSequential(structure, path));
  } else if (isBranch(structure)) {
    errors.push(...validateBranch(structure, path));
  } else if (isLoop(structure)) {
    errors.push(...validateLoop(structure, path));
  }
  return errors;
}
function validateSequential(structure, path) {
  const errors = [];
  if (!structure.steps || structure.steps.length === 0) {
    errors.push({
      path: `${path}.steps`,
      message: "Sequential structure must have at least one step",
      severity: "error"
    });
    return errors;
  }
  structure.steps.forEach((step, index) => {
    errors.push(...validateStep(step, `${path}.steps[${index}]`));
  });
  return errors;
}
function validateBranch(structure, path) {
  const errors = [];
  if (!structure.condition) {
    errors.push({
      path: `${path}.condition`,
      message: "Branch structure must have a condition",
      severity: "error"
    });
  }
  if (!structure.thenBranch || structure.thenBranch.length === 0) {
    errors.push({
      path: `${path}.thenBranch`,
      message: "Branch structure must have at least one step in thenBranch",
      severity: "error"
    });
  } else {
    structure.thenBranch.forEach((step, index) => {
      errors.push(...validateStep(step, `${path}.thenBranch[${index}]`));
    });
  }
  if (structure.elseBranch) {
    structure.elseBranch.forEach((step, index) => {
      errors.push(...validateStep(step, `${path}.elseBranch[${index}]`));
    });
  }
  return errors;
}
function validateLoop(structure, path) {
  const errors = [];
  if (!structure.iterator) {
    errors.push({
      path: `${path}.iterator`,
      message: "Loop structure must have an iterator",
      severity: "error"
    });
  }
  if (!structure.body || structure.body.length === 0) {
    errors.push({
      path: `${path}.body`,
      message: "Loop structure must have at least one step in body",
      severity: "error"
    });
  } else {
    structure.body.forEach((step, index) => {
      errors.push(...validateStep(step, `${path}.body[${index}]`));
    });
  }
  if (structure.maxIterations !== void 0 && structure.maxIterations <= 0) {
    errors.push({
      path: `${path}.maxIterations`,
      message: "Loop maxIterations must be positive",
      severity: "error"
    });
  }
  return errors;
}
function validateStep(step, path) {
  const errors = [];
  if (!step.action || step.action.trim().length === 0) {
    errors.push({
      path: `${path}.action`,
      message: "Step must have an action",
      severity: "error"
    });
  }
  const action = step.action.toLowerCase();
  if (["click", "fill", "select", "check", "uncheck", "hover", "focus"].includes(action)) {
    if (!step.target) {
      errors.push({
        path: `${path}.target`,
        message: `${action} action requires a target`,
        severity: "warning"
      });
    }
  }
  if (["fill", "type", "input"].includes(action)) {
    if (!step.value && !step.target?.includes("=")) {
      errors.push({
        path: `${path}.value`,
        message: `${action} action should have a value`,
        severity: "warning"
      });
    }
  }
  if (["assert", "expect", "verify"].includes(action)) {
    if (!step.assertion && !step.target) {
      errors.push({
        path: `${path}.assertion`,
        message: `${action} action should have an assertion or target`,
        severity: "warning"
      });
    }
  }
  return errors;
}
function checkForInfiniteLoops(structures) {
  const warnings = [];
  structures.forEach((structure, index) => {
    if (isLoop(structure)) {
      if (!structure.maxIterations) {
        warnings.push(
          `Loop at index ${index} has no maxIterations limit - could potentially loop indefinitely`
        );
      }
      const hasBreakCondition = structure.body.some(
        (step) => ["assert", "expect", "verify", "break"].includes(step.action.toLowerCase())
      );
      if (!hasBreakCondition && !structure.maxIterations) {
        warnings.push(
          `Loop at index ${index} has no break condition or iteration limit`
        );
      }
    }
  });
  return warnings;
}
function checkForUnreachableCode(structures) {
  const warnings = [];
  structures.forEach((structure, index) => {
    if (isBranch(structure)) {
      const condition = structure.condition;
      if (condition.expression) {
        const expr = condition.expression.toLowerCase();
        if (expr === "true" || expr === "1" || expr === "always") {
          warnings.push(
            `Branch at index ${index} has always-true condition - elseBranch may be unreachable`
          );
        }
        if (expr === "false" || expr === "0" || expr === "never") {
          warnings.push(
            `Branch at index ${index} has always-false condition - thenBranch may be unreachable`
          );
        }
      }
    }
  });
  return warnings;
}
function quickValidateConfidence(plan, minConfidence) {
  return plan.confidence >= minConfidence;
}
function getValidationSummary(result) {
  const errorCount = result.errors.filter((e) => e.severity === "error").length;
  const warningCount = result.errors.filter((e) => e.severity === "warning").length + result.warnings.length;
  if (result.valid) {
    if (warningCount > 0) {
      return `Valid with ${warningCount} warning(s)`;
    }
    return "Valid";
  }
  return `Invalid: ${errorCount} error(s), ${warningCount} warning(s)`;
}

// src/scot/prompts.ts
var SCOT_SYSTEM_PROMPT = `You are an expert test automation architect specializing in Playwright E2E tests.

Your task is to analyze a Journey specification and create a Structured Chain-of-Thought (SCoT) plan using these programming structures:

## SEQUENTIAL Structure
For linear, step-by-step actions that must happen in order:
\`\`\`
SEQUENTIAL: <description>
1. <action>
2. <action>
3. <action>
\`\`\`

## BRANCH Structure
For conditional logic where different paths may be taken:
\`\`\`
BRANCH: <condition description>
IF <condition> THEN
  - <action if true>
  - <another action if true>
ELSE
  - <action if false>
ENDIF
\`\`\`

## LOOP Structure
For repeated actions over a collection or until a condition:
\`\`\`
LOOP: <iteration description>
FOR EACH <variable> IN <collection>
  - <action with variable>
ENDFOR
\`\`\`

## Guidelines
1. Use SEQUENTIAL for straightforward test flows
2. Use BRANCH when the test may take different paths (e.g., MFA prompt, error handling)
3. Use LOOP when iterating over table rows, list items, or form fields
4. Each step should be atomic and testable
5. Include assertions as steps (e.g., "Verify redirect to dashboard")
6. Consider edge cases and potential failure points

## Output Format
Your response MUST be valid JSON:
\`\`\`json
{
  "reasoning": "Brief explanation of your understanding of the test flow",
  "confidence": 0.85,
  "plan": [
    {
      "type": "sequential",
      "description": "Login flow",
      "steps": [
        {"action": "navigate", "target": "/login"},
        {"action": "fill", "target": "username field", "value": "test user"},
        {"action": "fill", "target": "password field", "value": "password"},
        {"action": "click", "target": "submit button"},
        {"action": "assert", "assertion": "redirect to dashboard"}
      ]
    },
    {
      "type": "branch",
      "description": "Handle optional MFA",
      "condition": {"element": "MFA prompt", "state": "visible"},
      "thenBranch": [
        {"action": "fill", "target": "TOTP code field", "value": "generated code"},
        {"action": "click", "target": "verify button"}
      ]
    }
  ],
  "warnings": ["MFA handling may need specific TOTP generator setup"]
}
\`\`\`

## Confidence Scoring
- 0.9-1.0: Clear, unambiguous journey with well-defined steps
- 0.7-0.9: Minor ambiguities but overall clear intent
- 0.5-0.7: Several ambiguities or missing details
- Below 0.5: Too vague to create reliable test

Be precise, thorough, and focus on creating a plan that maps directly to Playwright actions.`;
function createUserPrompt(journey) {
  const parts = [];
  parts.push(`# Journey: ${journey.id}`);
  parts.push(`## ${journey.title}`);
  parts.push("");
  if (journey.description) {
    parts.push(`### Description`);
    parts.push(journey.description);
    parts.push("");
  }
  if (journey.tier) {
    parts.push(`**Tier:** ${journey.tier}`);
    parts.push("");
  }
  parts.push(`### Steps`);
  for (const step of journey.steps) {
    parts.push(`${step.number}. ${step.text}`);
    if (step.substeps && step.substeps.length > 0) {
      for (const substep of step.substeps) {
        parts.push(`   - ${substep}`);
      }
    }
  }
  parts.push("");
  if (journey.acceptanceCriteria && journey.acceptanceCriteria.length > 0) {
    parts.push(`### Acceptance Criteria`);
    for (const criterion of journey.acceptanceCriteria) {
      parts.push(`- ${criterion}`);
    }
    parts.push("");
  }
  if (journey.rawMarkdown) {
    parts.push(`### Additional Context (Raw Markdown)`);
    parts.push("```markdown");
    parts.push(journey.rawMarkdown);
    parts.push("```");
    parts.push("");
  }
  parts.push(`---`);
  parts.push(`Create a SCoT plan for this journey. Output your response as valid JSON.`);
  return parts.join("\n");
}
function createErrorCorrectionPrompt(originalResponse, error) {
  return `Your previous response had a parsing error:

**Error:** ${error}

**Your response:**
\`\`\`
${originalResponse.substring(0, 1e3)}${originalResponse.length > 1e3 ? "..." : ""}
\`\`\`

Please fix the JSON and respond with ONLY valid JSON (no markdown code blocks, no explanation).
The JSON must match this structure:
{
  "reasoning": "string",
  "confidence": number (0-1),
  "plan": [...],
  "warnings": [...]
}`;
}
var FEW_SHOT_EXAMPLES = {
  simpleLogin: {
    input: `# Journey: J-AUTH-001
## User Login
### Steps
1. Navigate to login page
2. Enter username
3. Enter password
4. Click login button
5. Verify dashboard is displayed`,
    output: {
      reasoning: "Simple login flow with standard username/password authentication",
      confidence: 0.95,
      plan: [
        {
          type: "sequential",
          description: "Standard login flow",
          steps: [
            { action: "navigate", target: "/login" },
            { action: "fill", target: "username field", value: "test_user" },
            { action: "fill", target: "password field", value: "password" },
            { action: "click", target: "login button" },
            { action: "assert", assertion: "dashboard is visible" }
          ]
        }
      ],
      warnings: []
    }
  },
  loginWithMFA: {
    input: `# Journey: J-AUTH-002
## Login with Optional MFA
### Steps
1. Navigate to login page
2. Enter credentials
3. Submit login form
4. If MFA prompt appears, enter TOTP code
5. Verify successful login`,
    output: {
      reasoning: "Login with conditional MFA handling - need to check if MFA prompt appears",
      confidence: 0.85,
      plan: [
        {
          type: "sequential",
          description: "Initial login",
          steps: [
            { action: "navigate", target: "/login" },
            { action: "fill", target: "username", value: "test_user" },
            { action: "fill", target: "password", value: "password" },
            { action: "click", target: "submit button" }
          ]
        },
        {
          type: "branch",
          description: "Handle MFA if prompted",
          condition: { element: "MFA prompt", state: "visible" },
          thenBranch: [
            { action: "fill", target: "TOTP code field", value: "generated_totp" },
            { action: "click", target: "verify button" }
          ]
        },
        {
          type: "sequential",
          description: "Verify login success",
          steps: [
            { action: "assert", assertion: "user is logged in" }
          ]
        }
      ],
      warnings: ["TOTP code generation requires proper test setup"]
    }
  },
  tableIteration: {
    input: `# Journey: J-DATA-001
## Verify All Table Rows
### Steps
1. Navigate to data table page
2. For each row in the table, verify the status column shows "Active"
3. Verify total row count matches expected`,
    output: {
      reasoning: "Table iteration test - need to loop through rows and verify status",
      confidence: 0.8,
      plan: [
        {
          type: "sequential",
          description: "Navigate to table",
          steps: [
            { action: "navigate", target: "/data-table" },
            { action: "wait", target: "table is loaded" }
          ]
        },
        {
          type: "loop",
          description: "Verify each row status",
          iterator: { variable: "row", collection: "table rows", maxIterations: 100 },
          body: [
            { action: "assert", assertion: "row status is Active" }
          ]
        },
        {
          type: "sequential",
          description: "Verify total",
          steps: [
            { action: "assert", assertion: "row count matches expected" }
          ]
        }
      ],
      warnings: ["Large tables may require pagination handling"]
    }
  }
};

// src/scot/planner.ts
async function generateSCoTPlan(journey, options) {
  const { config, llmClient, costTracker, mode = "direct" } = options;
  if (!config.enabled) {
    return {
      success: false,
      error: {
        type: "LLM_ERROR",
        message: "SCoT is disabled in configuration"
      },
      fallbackUsed: true
    };
  }
  if (mode === "orchestrator") {
    return {
      success: false,
      error: {
        type: "LLM_ERROR",
        message: "Orchestrator mode requires using generateSCoTPrompts() instead"
      },
      fallbackUsed: false
    };
  }
  if (!llmClient) {
    return {
      success: false,
      error: {
        type: "LLM_ERROR",
        message: "LLM client is required for direct mode"
      },
      fallbackUsed: config.fallback === "pattern-only"
    };
  }
  if (costTracker?.wouldExceedLimit(2e3)) {
    return {
      success: false,
      error: {
        type: "COST_LIMIT",
        message: "Cost limit would be exceeded"
      },
      fallbackUsed: config.fallback === "pattern-only"
    };
  }
  try {
    const userPrompt = createUserPrompt(journey);
    const llmResult = await llmClient.generate(userPrompt, SCOT_SYSTEM_PROMPT, {
      temperature: config.llm.temperature,
      maxTokens: config.llm.maxTokens,
      timeoutMs: config.llm.timeoutMs
    });
    if (costTracker) {
      costTracker.trackUsage(llmResult.tokenUsage);
    }
    const parseResult = await parseSCoTPlan(llmResult.content, {
      journeyId: journey.id,
      llmModel: llmResult.model,
      maxRetries: config.llm.maxRetries
    });
    if (!parseResult.ok) {
      return {
        success: false,
        error: {
          type: "PARSE_ERROR",
          message: parseResult.error.message,
          details: parseResult.error,
          tokenUsage: llmResult.tokenUsage
        },
        fallbackUsed: config.fallback === "pattern-only"
      };
    }
    const plan = parseResult.value;
    plan.metadata.tokenUsage = llmResult.tokenUsage;
    plan.metadata.llmModel = llmResult.model;
    const validationResult = validateSCoTPlan(plan, config);
    if (!validationResult.valid) {
      const criticalErrors = validationResult.errors.filter((e) => e.severity === "error");
      return {
        success: false,
        error: {
          type: "VALIDATION_ERROR",
          message: criticalErrors.map((e) => e.message).join("; "),
          details: validationResult,
          tokenUsage: llmResult.tokenUsage
        },
        fallbackUsed: config.fallback === "pattern-only"
      };
    }
    if (plan.confidence < config.minConfidence) {
      return {
        success: false,
        error: {
          type: "LOW_CONFIDENCE",
          message: `Plan confidence ${plan.confidence.toFixed(2)} is below threshold ${config.minConfidence}`,
          tokenUsage: llmResult.tokenUsage
        },
        fallbackUsed: config.fallback === "pattern-only"
      };
    }
    return {
      success: true,
      plan
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const isTimeout = message.toLowerCase().includes("timeout");
    return {
      success: false,
      error: {
        type: isTimeout ? "TIMEOUT" : "LLM_ERROR",
        message,
        details: error
      },
      fallbackUsed: config.fallback === "pattern-only"
    };
  }
}
function extractCodeContext(plan, includeReasoning) {
  const structureComments = [];
  let hasConditionals = false;
  let hasLoops = false;
  let estimatedSteps = 0;
  for (const structure of plan.structures) {
    if (structure.type === "sequential") {
      structureComments.push(`// SEQUENTIAL: ${structure.description}`);
      estimatedSteps += structure.steps.length;
    } else if (structure.type === "branch") {
      structureComments.push(`// BRANCH: ${structure.description}`);
      hasConditionals = true;
      estimatedSteps += structure.thenBranch.length;
      if (structure.elseBranch) {
        estimatedSteps += structure.elseBranch.length;
      }
    } else if (structure.type === "loop") {
      structureComments.push(`// LOOP: ${structure.description}`);
      hasLoops = true;
      estimatedSteps += structure.body.length * (structure.maxIterations ?? 3);
    }
  }
  return {
    reasoning: includeReasoning ? plan.reasoning : "",
    structureComments,
    hasConditionals,
    hasLoops,
    estimatedSteps
  };
}
var SCOT_EXPECTED_FORMAT = `
The response should be a JSON object with:
- reasoning: string explaining the test structure approach
- structures: array of test structures (sequential, branch, loop)
- stepMappings: array mapping journey steps to test actions
- confidence: number 0.0-1.0 for overall plan confidence
- metadata: object with journeyId, generatedAt

Each structure has:
- type: "sequential" | "branch" | "loop"
- description: string explaining the structure
- steps/thenBranch/elseBranch/body: arrays of step references
- condition (for branch/loop): string describing the condition
`;
function generateSCoTPrompts(journey, config) {
  const userPrompt = createUserPrompt(journey);
  return {
    systemPrompt: SCOT_SYSTEM_PROMPT,
    userPrompt,
    expectedFormat: SCOT_EXPECTED_FORMAT,
    journeyId: journey.id,
    parseResponse: async (response) => {
      try {
        const parseResult = await parseSCoTPlan(response, {
          journeyId: journey.id,
          llmModel: "orchestrator",
          maxRetries: config.llm.maxRetries
        });
        if (!parseResult.ok) {
          return {
            success: false,
            error: {
              type: "PARSE_ERROR",
              message: parseResult.error.message,
              details: parseResult.error
            },
            fallbackUsed: config.fallback === "pattern-only"
          };
        }
        const plan = parseResult.value;
        const validationResult = validateSCoTPlan(plan, config);
        if (!validationResult.valid) {
          const criticalErrors = validationResult.errors.filter((e) => e.severity === "error");
          return {
            success: false,
            error: {
              type: "VALIDATION_ERROR",
              message: criticalErrors.map((e) => e.message).join("; "),
              details: validationResult
            },
            fallbackUsed: config.fallback === "pattern-only"
          };
        }
        if (plan.confidence < config.minConfidence) {
          return {
            success: false,
            error: {
              type: "LOW_CONFIDENCE",
              message: `Plan confidence ${plan.confidence.toFixed(2)} is below threshold ${config.minConfidence}`
            },
            fallbackUsed: config.fallback === "pattern-only"
          };
        }
        return {
          success: true,
          plan
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return {
          success: false,
          error: {
            type: "PARSE_ERROR",
            message,
            details: error
          },
          fallbackUsed: config.fallback === "pattern-only"
        };
      }
    }
  };
}
async function processSCoTPlanFromJSON(planJson, journeyId, config) {
  const prompts = generateSCoTPrompts({ id: journeyId, title: journeyId, steps: [] }, config);
  return prompts.parseResponse(planJson);
}

// src/refinement/index.ts
var refinement_exports = {};
__export(refinement_exports, {
  CircuitBreaker: () => CircuitBreaker,
  ConvergenceDetector: () => ConvergenceDetector,
  DEFAULT_CIRCUIT_BREAKER_CONFIG: () => DEFAULT_CIRCUIT_BREAKER_CONFIG,
  addLesson: () => addLesson,
  aggregateLessons: () => aggregateLessons,
  analyzeRefinementProgress: () => analyzeRefinementProgress,
  applyConfidenceDecay: () => applyConfidenceDecay,
  applyLearnedFix: () => applyLearnedFix,
  calculateConfidenceAdjustment: () => calculateConfidenceAdjustment,
  exportLessonsForOrchestrator: () => exportLessonsForOrchestrator,
  extractLessonsFromSession: () => extractLessonsFromSession,
  findLesson: () => findLesson,
  findLessonsForContext: () => findLessonsForContext,
  formatFailures: () => formatFailures,
  formatSummary: () => formatSummary,
  getLlkbRefinementPath: () => getLlkbRefinementPath,
  getSuggestedFixTypes: () => getSuggestedFixTypes,
  getSuggestedFixes: () => getSuggestedFixes,
  isCodeError: () => isCodeError,
  isEnvironmentalError: () => isEnvironmentalError,
  isSelectorRelated: () => isSelectorRelated,
  isTimingRelated: () => isTimingRelated,
  learnFromRefinement: () => learnFromRefinement,
  loadLlkbStore: () => loadLlkbStore,
  parseError: () => parseError,
  parseErrors: () => parseErrors,
  parsePlaywrightReport: () => parsePlaywrightReport,
  pruneLessons: () => pruneLessons,
  quickCheck: () => quickCheck,
  recommendLessons: () => recommendLessons,
  recordFailure: () => recordFailure,
  recordSuccess: () => recordSuccess,
  runPlaywright: () => runPlaywright,
  runRefinementLoop: () => runRefinementLoop,
  runSingleRefinementAttempt: () => runSingleRefinementAttempt,
  runSingleTest: () => runSingleTest,
  saveLlkbStore: () => saveLlkbStore
});
var ERROR_PATTERNS = [
  // Selector not found
  {
    category: "SELECTOR_NOT_FOUND",
    patterns: [
      /locator\..*: Timeout \d+ms exceeded/i,
      /waiting for (locator|selector)/i,
      /No element matches selector/i,
      /Element is not attached to the DOM/i,
      /Element is outside of the viewport/i,
      /page\.\$\(.*\) resolved to (null|undefined)/i,
      /getByRole.*resolved to \d+ element/i,
      /getByTestId.*resolved to \d+ element/i,
      /getByText.*resolved to \d+ element/i,
      /locator resolved to \d+ elements/i
    ],
    severity: "major",
    selectorExtractor: /locator\(['"]([^'"]+)['"]\)|getBy\w+\(['"]([^'"]+)['"]\)/
  },
  // Timeout
  {
    category: "TIMEOUT",
    patterns: [
      /Timeout \d+ms exceeded/i,
      /page\.waitFor.*exceeded/i,
      /Test timeout of \d+ms exceeded/i,
      /Navigation timeout of \d+ms exceeded/i,
      /exceeded .*timeout/i
    ],
    severity: "major"
  },
  // Assertion failed
  {
    category: "ASSERTION_FAILED",
    patterns: [
      /expect\(.*\)\.to/i,
      /Expected.*to (be|have|contain|match|equal)/i,
      /AssertionError/i,
      /Received.*Expected/i,
      /toBeVisible.*but.*hidden/i,
      /toHaveText.*but.*received/i,
      /toHaveValue.*but.*received/i,
      /toBeChecked.*but.*unchecked/i
    ],
    severity: "major",
    valueExtractor: /Expected:?\s*(.+?)\s*(?:Received|Actual|but|$)/i
  },
  // Navigation error
  {
    category: "NAVIGATION_ERROR",
    patterns: [
      /net::ERR_/i,
      /Navigation failed/i,
      /page\.goto.*failed/i,
      /Frame was detached/i,
      /Target page.*closed/i,
      /browser has disconnected/i,
      /Protocol error.*Target closed/i
    ],
    severity: "critical"
  },
  // Network error
  {
    category: "NETWORK_ERROR",
    patterns: [
      /ECONNREFUSED/i,
      /ENOTFOUND/i,
      /ETIMEDOUT/i,
      /fetch failed/i,
      /Request failed/i,
      /Status code: [45]\d{2}/i
    ],
    severity: "major"
  },
  // Authentication error
  {
    category: "AUTHENTICATION_ERROR",
    patterns: [
      /401 Unauthorized/i,
      /403 Forbidden/i,
      /Authentication failed/i,
      /Login failed/i,
      /Invalid credentials/i,
      /Session expired/i,
      /Token expired/i
    ],
    severity: "critical"
  },
  // Permission error
  {
    category: "PERMISSION_ERROR",
    patterns: [
      /Permission denied/i,
      /Access denied/i,
      /not authorized/i,
      /insufficient permissions/i
    ],
    severity: "critical"
  },
  // Type error
  {
    category: "TYPE_ERROR",
    patterns: [
      /TypeError:/i,
      /Cannot read propert/i,
      /is not a function/i,
      /is not defined/i,
      /undefined is not/i,
      /null is not/i
    ],
    severity: "major"
  },
  // Syntax error
  {
    category: "SYNTAX_ERROR",
    patterns: [
      /SyntaxError:/i,
      /Unexpected token/i,
      /Unexpected identifier/i,
      /Invalid or unexpected token/i
    ],
    severity: "critical"
  },
  // Runtime error
  {
    category: "RUNTIME_ERROR",
    patterns: [
      /ReferenceError:/i,
      /RangeError:/i,
      /Error:/i
    ],
    severity: "major"
  }
];
var LOCATION_PATTERNS = [
  // Standard stack trace format
  /at\s+.*\s+\(([^:]+):(\d+):(\d+)\)/,
  // Playwright error format
  /([^:\s]+\.ts):(\d+):(\d+)/,
  // Simple file:line format
  /([^:\s]+\.(ts|js)):(\d+)/
];
function extractLocation(errorText, stackTrace) {
  const textToSearch = stackTrace || errorText;
  for (const pattern of LOCATION_PATTERNS) {
    const match = textToSearch.match(pattern);
    if (match && match[1] && match[2]) {
      return {
        file: match[1],
        line: parseInt(match[2], 10),
        column: match[3] ? parseInt(match[3], 10) : void 0
      };
    }
  }
  return void 0;
}
function generateFingerprint(category, message, selector, location) {
  const normalizedMessage = message.replace(/\d+ms/g, "Xms").replace(/\d+ element/g, "X element").replace(/timeout of \d+/gi, "timeout of X").replace(/'[^']+'/g, "'X'").replace(/"[^"]+"/g, '"X"').toLowerCase().trim();
  const components = [
    category,
    normalizedMessage.substring(0, 100),
    selector || "",
    location?.file || "",
    location?.line?.toString() || ""
  ];
  const hash = crypto.createHash("md5");
  hash.update(components.join("|"));
  return hash.digest("hex").substring(0, 12);
}
function parseError(errorText, options = {}) {
  const { testFile, testName, includeStackTrace = true } = options;
  let matchedPattern;
  for (const pattern of ERROR_PATTERNS) {
    for (const regex of pattern.patterns) {
      if (regex.test(errorText)) {
        matchedPattern = pattern;
        break;
      }
    }
    if (matchedPattern) break;
  }
  const category = matchedPattern?.category || "UNKNOWN";
  const severity = matchedPattern?.severity || "major";
  let selector;
  if (matchedPattern?.selectorExtractor) {
    const selectorMatch = errorText.match(matchedPattern.selectorExtractor);
    if (selectorMatch && (selectorMatch[1] || selectorMatch[2])) {
      selector = selectorMatch[1] || selectorMatch[2];
    }
  }
  let expectedValue;
  let actualValue;
  if (category === "ASSERTION_FAILED") {
    const expectedMatch = errorText.match(/Expected:?\s*(.+?)(?:\n|$)/i);
    const actualMatch = errorText.match(/Received:?\s*(.+?)(?:\n|$)/i);
    expectedValue = expectedMatch?.[1]?.trim();
    actualValue = actualMatch?.[1]?.trim();
  }
  const stackTraceMatch = errorText.match(/(\s+at\s+.+(?:\n\s+at\s+.+)*)/);
  const stackTrace = includeStackTrace ? stackTraceMatch?.[1]?.trim() : void 0;
  const location = extractLocation(errorText, stackTrace);
  if (location && testFile) {
    location.file = testFile;
  }
  if (location && testName) {
    location.testName = testName;
  }
  const firstLine = errorText.split("\n")[0]?.trim() || "";
  const message = firstLine.length > 200 ? firstLine.substring(0, 200) + "..." : firstLine;
  const fingerprint = generateFingerprint(category, message, selector, location);
  return {
    category,
    severity,
    message,
    originalError: errorText,
    location,
    selector,
    expectedValue,
    actualValue,
    stackTrace,
    timestamp: /* @__PURE__ */ new Date(),
    fingerprint
  };
}
function parseErrors(testOutput, options = {}) {
  const errors = [];
  const errorBlocks = testOutput.split(/(?=Error:|AssertionError:|TypeError:|TimeoutError:)/i);
  for (const block of errorBlocks) {
    const trimmed = block.trim();
    if (trimmed.length > 10 && /error|failed|timeout|assert/i.test(trimmed)) {
      errors.push(parseError(trimmed, options));
    }
  }
  const seen = /* @__PURE__ */ new Set();
  return errors.filter((e) => {
    if (seen.has(e.fingerprint)) return false;
    seen.add(e.fingerprint);
    return true;
  });
}
function parsePlaywrightReport(report) {
  const results = [];
  function processSuite(suite, filePath) {
    const file = suite.file || filePath;
    if (suite.specs) {
      for (const spec of suite.specs) {
        if (spec.tests) {
          for (const test of spec.tests) {
            const lastRun = test.results?.[test.results.length - 1];
            const errors = [];
            if (lastRun?.error) {
              const errorText = [lastRun.error.message, lastRun.error.stack].filter(Boolean).join("\n");
              if (errorText) {
                errors.push(parseError(errorText, {
                  testFile: file,
                  testName: `${suite.title} > ${spec.title} > ${test.title}`
                }));
              }
            }
            if (lastRun?.stderr?.length) {
              const stderrErrors = parseErrors(lastRun.stderr.join("\n"), {
                testFile: file,
                testName: `${suite.title} > ${spec.title} > ${test.title}`
              });
              errors.push(...stderrErrors);
            }
            results.push({
              testId: `${file}:${spec.title}:${test.title}`,
              testName: `${suite.title} > ${spec.title} > ${test.title}`,
              testFile: file || "unknown",
              status: mapStatus(test.status),
              duration: test.duration,
              errors: deduplicateErrors(errors),
              retries: (test.results?.length || 1) - 1,
              stdout: lastRun?.stdout?.join("\n"),
              stderr: lastRun?.stderr?.join("\n"),
              attachments: lastRun?.attachments?.map((a) => ({
                name: a.name,
                contentType: a.contentType,
                path: a.path
              }))
            });
          }
        }
      }
    }
    if (suite.suites) {
      for (const nestedSuite of suite.suites) {
        processSuite(nestedSuite, file);
      }
    }
  }
  if (report.suites) {
    for (const suite of report.suites) {
      processSuite(suite);
    }
  }
  return results;
}
function mapStatus(status) {
  switch (status.toLowerCase()) {
    case "passed":
      return "passed";
    case "failed":
      return "failed";
    case "timedout":
      return "timedOut";
    case "skipped":
    case "pending":
      return "skipped";
    case "interrupted":
      return "interrupted";
    default:
      return "failed";
  }
}
function deduplicateErrors(errors) {
  const seen = /* @__PURE__ */ new Set();
  return errors.filter((e) => {
    if (seen.has(e.fingerprint)) return false;
    seen.add(e.fingerprint);
    return true;
  });
}
function isSelectorRelated(error) {
  return error.category === "SELECTOR_NOT_FOUND" && !!error.selector;
}
function isTimingRelated(error) {
  return error.category === "TIMEOUT" || error.category === "SELECTOR_NOT_FOUND" && error.message.includes("Timeout");
}
function isEnvironmentalError(error) {
  return [
    "NETWORK_ERROR",
    "AUTHENTICATION_ERROR",
    "PERMISSION_ERROR"
  ].includes(error.category);
}
function isCodeError(error) {
  return [
    "SYNTAX_ERROR",
    "TYPE_ERROR",
    "RUNTIME_ERROR"
  ].includes(error.category);
}
function getSuggestedFixTypes(category) {
  switch (category) {
    case "SELECTOR_NOT_FOUND":
      return ["SELECTOR_CHANGE", "LOCATOR_STRATEGY_CHANGED", "FRAME_CONTEXT_ADDED"];
    case "TIMEOUT":
      return ["WAIT_ADDED", "TIMEOUT_INCREASED", "RETRY_ADDED"];
    case "ASSERTION_FAILED":
      return ["ASSERTION_MODIFIED", "WAIT_ADDED"];
    case "NAVIGATION_ERROR":
      return ["ERROR_HANDLING_ADDED", "RETRY_ADDED"];
    case "TYPE_ERROR":
    case "RUNTIME_ERROR":
      return ["OTHER"];
    case "SYNTAX_ERROR":
      return ["OTHER"];
    default:
      return ["OTHER"];
  }
}

// src/refinement/convergence-detector.ts
var DEFAULT_CIRCUIT_BREAKER_CONFIG = {
  maxAttempts: 3,
  sameErrorThreshold: 2,
  oscillationDetection: true,
  oscillationWindowSize: 4,
  totalTimeoutMs: 3e5,
  // 5 minutes
  cooldownMs: 1e3,
  maxTokenBudget: 5e4
};
var CircuitBreaker = class {
  config;
  state;
  constructor(options = {}) {
    const { initialState, ...config } = options;
    this.config = { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, ...config };
    if (initialState) {
      this.state = this.restoreState(initialState);
    } else {
      this.state = this.createInitialState();
    }
  }
  createInitialState() {
    return {
      isOpen: false,
      attemptCount: 0,
      errorHistory: [],
      startTime: /* @__PURE__ */ new Date(),
      tokensUsed: 0,
      maxAttempts: this.config.maxAttempts
    };
  }
  /**
   * Restore state from a saved CircuitBreakerState
   * This allows the circuit breaker to continue from a previous session
   * without double-counting attempts
   */
  restoreState(saved) {
    return {
      isOpen: saved.isOpen,
      openReason: saved.openReason,
      attemptCount: saved.attemptCount,
      errorHistory: [...saved.errorHistory || []],
      // Restore startTime or use now if not saved
      startTime: saved.startTime ? new Date(saved.startTime) : /* @__PURE__ */ new Date(),
      tokensUsed: saved.tokensUsed || 0,
      maxAttempts: this.config.maxAttempts
    };
  }
  /**
   * Reset the circuit breaker to initial state
   */
  reset() {
    this.state = this.createInitialState();
  }
  /**
   * Get current state
   */
  getState() {
    return { ...this.state };
  }
  /**
   * Record an attempt and check if circuit should open
   */
  recordAttempt(errors, tokenUsage) {
    if (this.state.isOpen) {
      return this.state;
    }
    this.state.attemptCount++;
    const fingerprints = errors.map((e) => e.fingerprint);
    this.state.errorHistory.push(...fingerprints);
    if (tokenUsage) {
      this.state.tokensUsed += tokenUsage.totalTokens;
    }
    this.checkMaxAttempts();
    this.checkSameError();
    this.checkOscillation();
    this.checkTimeout();
    this.checkBudget();
    return this.state;
  }
  /**
   * Check if we can make another attempt
   */
  canAttempt() {
    if (this.state.isOpen) {
      return false;
    }
    this.checkTimeout();
    return !this.state.isOpen;
  }
  /**
   * Get remaining attempts
   */
  remainingAttempts() {
    if (this.state.isOpen) return 0;
    return Math.max(0, this.config.maxAttempts - this.state.attemptCount);
  }
  /**
   * Get remaining token budget
   */
  remainingTokenBudget() {
    return Math.max(0, this.config.maxTokenBudget - this.state.tokensUsed);
  }
  /**
   * Estimate if operation would exceed budget
   */
  wouldExceedBudget(estimatedTokens) {
    return this.state.tokensUsed + estimatedTokens > this.config.maxTokenBudget;
  }
  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE CHECKS
  // ─────────────────────────────────────────────────────────────────────────
  checkMaxAttempts() {
    if (this.state.attemptCount >= this.config.maxAttempts) {
      this.openCircuit("MAX_ATTEMPTS");
    }
  }
  checkSameError() {
    if (this.state.errorHistory.length < this.config.sameErrorThreshold) {
      return;
    }
    const counts = /* @__PURE__ */ new Map();
    for (const fp of this.state.errorHistory) {
      counts.set(fp, (counts.get(fp) || 0) + 1);
    }
    for (const count of counts.values()) {
      if (count >= this.config.sameErrorThreshold) {
        this.openCircuit("SAME_ERROR");
        return;
      }
    }
  }
  checkOscillation() {
    if (!this.config.oscillationDetection) {
      return;
    }
    const history = this.state.errorHistory;
    const windowSize = this.config.oscillationWindowSize;
    if (history.length < windowSize) {
      return;
    }
    const recentHistory = history.slice(-windowSize);
    const unique = new Set(recentHistory);
    if (unique.size === 2) {
      let isAlternating = true;
      for (let i = 2; i < recentHistory.length; i++) {
        const currentItem = recentHistory[i];
        const previousItem = recentHistory[i - 2];
        if (currentItem !== void 0 && previousItem !== void 0 && currentItem !== previousItem) {
          isAlternating = false;
          break;
        }
      }
      if (isAlternating) {
        this.openCircuit("OSCILLATION");
      }
    }
  }
  checkTimeout() {
    if (!this.state.startTime) return;
    const elapsed = Date.now() - this.state.startTime.getTime();
    if (elapsed >= this.config.totalTimeoutMs) {
      this.openCircuit("TIMEOUT");
    }
  }
  checkBudget() {
    if (this.state.tokensUsed >= this.config.maxTokenBudget) {
      this.openCircuit("BUDGET_EXCEEDED");
    }
  }
  openCircuit(reason) {
    this.state.isOpen = true;
    this.state.openReason = reason;
  }
};
var ConvergenceDetector = class {
  errorCountHistory = [];
  uniqueErrorsHistory = [];
  lastImprovement;
  stagnationCount = 0;
  /**
   * Record errors from an attempt
   */
  recordAttempt(errors) {
    const count = errors.length;
    const uniqueFingerprints = new Set(errors.map((e) => e.fingerprint));
    this.errorCountHistory.push(count);
    this.uniqueErrorsHistory.push(uniqueFingerprints);
    if (this.errorCountHistory.length >= 2) {
      const prev = this.errorCountHistory[this.errorCountHistory.length - 2] ?? 0;
      const curr = this.errorCountHistory[this.errorCountHistory.length - 1] ?? 0;
      if (curr < prev) {
        this.lastImprovement = this.errorCountHistory.length - 1;
        this.stagnationCount = 0;
      } else {
        this.stagnationCount++;
      }
    }
  }
  /**
   * Get convergence information
   */
  getInfo() {
    const converged = this.isConverged();
    const trend = this.detectTrend();
    return {
      converged,
      attempts: this.errorCountHistory.length,
      errorCountHistory: [...this.errorCountHistory],
      uniqueErrorsHistory: this.uniqueErrorsHistory.map((s) => new Set(s)),
      lastImprovement: this.lastImprovement,
      stagnationCount: this.stagnationCount,
      trend
    };
  }
  /**
   * Check if we've converged (no errors)
   */
  isConverged() {
    if (this.errorCountHistory.length === 0) return false;
    return this.errorCountHistory[this.errorCountHistory.length - 1] === 0;
  }
  /**
   * Detect the trend in error counts
   */
  detectTrend() {
    if (this.errorCountHistory.length < 2) {
      return "stagnating";
    }
    const recent = this.errorCountHistory.slice(-3);
    if (this.isOscillating()) {
      return "oscillating";
    }
    const decreasing = recent.every(
      (val, i, arr) => i === 0 || val <= (arr[i - 1] ?? val)
    );
    const increasing = recent.every(
      (val, i, arr) => i === 0 || val >= (arr[i - 1] ?? val)
    );
    const allSame = recent.every((val, _, arr) => val === arr[0]);
    if (allSame || this.stagnationCount >= 2) {
      return "stagnating";
    }
    if (decreasing) {
      return "improving";
    }
    if (increasing) {
      return "degrading";
    }
    return "stagnating";
  }
  /**
   * Check if error counts are oscillating
   */
  isOscillating() {
    if (this.errorCountHistory.length < 4) {
      return false;
    }
    const recent = this.errorCountHistory.slice(-4);
    const diff01 = (recent[1] || 0) - (recent[0] || 0);
    const diff12 = (recent[2] || 0) - (recent[1] || 0);
    const diff23 = (recent[3] || 0) - (recent[2] || 0);
    const signsAlternate = Math.sign(diff01) !== 0 && Math.sign(diff01) === -Math.sign(diff12) && Math.sign(diff12) === -Math.sign(diff23);
    return signsAlternate;
  }
  /**
   * Calculate improvement percentage
   */
  getImprovementPercentage() {
    if (this.errorCountHistory.length < 2) {
      return 0;
    }
    const first = this.errorCountHistory[0] || 0;
    const last = this.errorCountHistory[this.errorCountHistory.length - 1] || 0;
    if (first === 0) {
      return last === 0 ? 100 : 0;
    }
    return Math.round((first - last) / first * 100);
  }
  /**
   * Get new errors introduced in last attempt (not in previous)
   */
  getNewErrors() {
    if (this.uniqueErrorsHistory.length < 2) {
      const firstEntry = this.uniqueErrorsHistory[0];
      return firstEntry ? firstEntry : /* @__PURE__ */ new Set();
    }
    const prev = this.uniqueErrorsHistory[this.uniqueErrorsHistory.length - 2];
    const curr = this.uniqueErrorsHistory[this.uniqueErrorsHistory.length - 1];
    if (!prev || !curr) {
      return /* @__PURE__ */ new Set();
    }
    const newErrors = /* @__PURE__ */ new Set();
    for (const fp of curr) {
      if (!prev.has(fp)) {
        newErrors.add(fp);
      }
    }
    return newErrors;
  }
  /**
   * Get errors fixed in last attempt (in previous but not current)
   */
  getFixedErrors() {
    if (this.uniqueErrorsHistory.length < 2) {
      return /* @__PURE__ */ new Set();
    }
    const prev = this.uniqueErrorsHistory[this.uniqueErrorsHistory.length - 2];
    const curr = this.uniqueErrorsHistory[this.uniqueErrorsHistory.length - 1];
    if (!prev || !curr) {
      return /* @__PURE__ */ new Set();
    }
    const fixedErrors = /* @__PURE__ */ new Set();
    for (const fp of prev) {
      if (!curr.has(fp)) {
        fixedErrors.add(fp);
      }
    }
    return fixedErrors;
  }
  /**
   * Reset the detector
   */
  reset() {
    this.errorCountHistory = [];
    this.uniqueErrorsHistory = [];
    this.lastImprovement = void 0;
    this.stagnationCount = 0;
  }
  /**
   * Restore detector state from saved error count history
   * This allows the detector to continue from a previous session
   * without losing context about convergence trends
   */
  restoreFromHistory(savedErrorCounts) {
    if (!savedErrorCounts || savedErrorCounts.length === 0) {
      return;
    }
    this.errorCountHistory = [...savedErrorCounts];
    this.uniqueErrorsHistory = savedErrorCounts.map(() => /* @__PURE__ */ new Set());
    this.lastImprovement = void 0;
    this.stagnationCount = 0;
    for (let i = 1; i < savedErrorCounts.length; i++) {
      const prev = savedErrorCounts[i - 1];
      const curr = savedErrorCounts[i];
      if (prev !== void 0 && curr !== void 0 && curr < prev) {
        this.lastImprovement = i;
        this.stagnationCount = 0;
      } else {
        this.stagnationCount++;
      }
    }
  }
  /**
   * Get the error count history for serialization
   */
  getErrorCountHistory() {
    return [...this.errorCountHistory];
  }
};
function analyzeRefinementProgress(_attempts, circuitBreaker, convergenceDetector) {
  const cbState = circuitBreaker.getState();
  const convergenceInfo = convergenceDetector.getInfo();
  if (cbState.isOpen) {
    return {
      shouldContinue: false,
      reason: `Circuit breaker open: ${cbState.openReason}`,
      circuitBreaker: cbState,
      convergence: convergenceInfo,
      recommendation: "stop"
    };
  }
  if (convergenceInfo.converged) {
    return {
      shouldContinue: false,
      reason: "All errors resolved",
      circuitBreaker: cbState,
      convergence: convergenceInfo,
      recommendation: "stop"
    };
  }
  if (convergenceInfo.trend === "degrading") {
    return {
      shouldContinue: false,
      reason: "Error count increasing - fixes are making things worse",
      circuitBreaker: cbState,
      convergence: convergenceInfo,
      recommendation: "escalate"
    };
  }
  if (convergenceInfo.trend === "oscillating") {
    return {
      shouldContinue: false,
      reason: "Error counts oscillating - cannot converge",
      circuitBreaker: cbState,
      convergence: convergenceInfo,
      recommendation: "escalate"
    };
  }
  if (convergenceInfo.stagnationCount >= 2) {
    return {
      shouldContinue: false,
      reason: "No improvement in last 2 attempts - stagnating",
      circuitBreaker: cbState,
      convergence: convergenceInfo,
      recommendation: "escalate"
    };
  }
  return {
    shouldContinue: true,
    reason: "Progress being made",
    circuitBreaker: cbState,
    convergence: convergenceInfo,
    recommendation: "continue"
  };
}

// src/refinement/refinement-loop.ts
var REFINEMENT_SYSTEM_PROMPT = `You are an expert Playwright test debugger. Your task is to fix failing E2E tests.

## Context
You will receive:
1. The current test code (TypeScript/Playwright)
2. A list of errors with detailed analysis
3. Previous fix attempts (if any)

## Your Task
Analyze the errors and provide fixes. For each error:
1. Understand the root cause
2. Propose a minimal, targeted fix
3. Explain your reasoning

## Fix Guidelines
- Prefer more robust selectors (testId > role > text > css)
- Add appropriate waits for async operations
- Don't over-engineer - fix only what's broken
- Preserve the original test intent
- Avoid changing test assertions unless they're incorrect

## Response Format
Respond with JSON:
{
  "reasoning": "Brief explanation of root cause",
  "fixes": [
    {
      "type": "SELECTOR_CHANGE" | "WAIT_ADDED" | "ASSERTION_MODIFIED" | "OTHER",
      "description": "What this fix does",
      "originalCode": "exact code being replaced",
      "fixedCode": "replacement code",
      "location": { "file": "test.spec.ts", "line": 42 },
      "confidence": 0.85,
      "reasoning": "Why this fix should work"
    }
  ]
}

## Important
- fixes[].originalCode must be an EXACT substring of the current code
- Each fix should target one specific issue
- Order fixes by confidence (highest first)
- If you cannot determine a fix, set confidence < 0.5`;
async function runRefinementLoop(journeyId, testFile, originalCode, initialErrors, options) {
  const {
    config,
    llmClient,
    testRunner,
    costTracker,
    circuitBreakerConfig,
    onAttemptComplete,
    onProgressUpdate
  } = options;
  const sessionId = `refine-${journeyId}-${Date.now()}`;
  const circuitBreaker = new CircuitBreaker({
    ...DEFAULT_CIRCUIT_BREAKER_CONFIG,
    maxAttempts: config.maxAttempts,
    ...circuitBreakerConfig
  });
  const convergenceDetector = new ConvergenceDetector();
  convergenceDetector.recordAttempt(initialErrors);
  const session = {
    sessionId,
    journeyId,
    testFile,
    startTime: /* @__PURE__ */ new Date(),
    originalCode,
    currentCode: originalCode,
    attempts: [],
    circuitBreakerState: circuitBreaker.getState(),
    convergenceInfo: convergenceDetector.getInfo(),
    finalStatus: "SUCCESS",
    // Will be updated
    totalTokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCostUsd: 0 }
  };
  let currentCode = originalCode;
  let currentErrors = initialErrors;
  const appliedFixes = [];
  const lessonsLearned = [];
  let consecutiveSkips = 0;
  const MAX_CONSECUTIVE_SKIPS = 3;
  while (true) {
    const analysis = analyzeRefinementProgress(
      session.attempts,
      circuitBreaker,
      convergenceDetector
    );
    if (!analysis.shouldContinue) {
      session.finalStatus = mapAnalysisToStatus(analysis.reason, currentErrors.length === 0);
      break;
    }
    if (costTracker?.wouldExceedLimit(5e3)) {
      session.finalStatus = "BUDGET_EXCEEDED";
      break;
    }
    if (onProgressUpdate) {
      onProgressUpdate({
        attemptNumber: session.attempts.length + 1,
        maxAttempts: config.maxAttempts,
        currentErrorCount: currentErrors.length,
        originalErrorCount: initialErrors.length,
        trend: convergenceDetector.getInfo().trend,
        status: "running"
      });
    }
    let fixResult;
    try {
      fixResult = await llmClient.generateFix(
        currentCode,
        currentErrors,
        session.attempts,
        {
          maxTokens: config.llm.maxTokens,
          temperature: config.llm.temperature,
          systemPrompt: REFINEMENT_SYSTEM_PROMPT
        }
      );
    } catch (error) {
      const llmError = parseError(error instanceof Error ? error.message : "LLM error");
      const primaryError2 = currentErrors[0];
      if (!primaryError2) {
        circuitBreaker.recordAttempt([llmError]);
        session.finalStatus = "CANNOT_FIX";
        break;
      }
      const attempt2 = {
        attemptNumber: session.attempts.length + 1,
        timestamp: /* @__PURE__ */ new Date(),
        error: primaryError2,
        proposedFixes: [],
        outcome: "failure",
        newErrors: [llmError]
      };
      session.attempts.push(attempt2);
      circuitBreaker.recordAttempt([...currentErrors, llmError]);
      convergenceDetector.recordAttempt([...currentErrors, llmError]);
      if (onAttemptComplete) {
        onAttemptComplete(attempt2);
      }
      session.finalStatus = "CANNOT_FIX";
      break;
    }
    session.totalTokenUsage = addTokenUsage(session.totalTokenUsage, fixResult.tokenUsage);
    if (costTracker) {
      costTracker.trackUsage(fixResult.tokenUsage);
    }
    const viableFixes = fixResult.fixes.filter((f) => f.confidence >= 0.5);
    const primaryError = currentErrors[0];
    if (!primaryError) {
      session.finalStatus = "SUCCESS";
      break;
    }
    if (viableFixes.length === 0) {
      consecutiveSkips++;
      const attempt2 = {
        attemptNumber: session.attempts.length + 1,
        timestamp: /* @__PURE__ */ new Date(),
        error: primaryError,
        proposedFixes: fixResult.fixes,
        outcome: "skipped",
        tokenUsage: fixResult.tokenUsage
      };
      session.attempts.push(attempt2);
      circuitBreaker.recordAttempt(currentErrors, fixResult.tokenUsage);
      if (onAttemptComplete) {
        onAttemptComplete(attempt2);
      }
      if (consecutiveSkips >= MAX_CONSECUTIVE_SKIPS) {
        session.finalStatus = "CANNOT_FIX";
        break;
      }
      continue;
    }
    consecutiveSkips = 0;
    const fixToApply = viableFixes[0];
    const applyResult = applyFix2(currentCode, fixToApply);
    if (!applyResult.ok) {
      const attempt2 = {
        attemptNumber: session.attempts.length + 1,
        timestamp: /* @__PURE__ */ new Date(),
        error: primaryError,
        proposedFixes: fixResult.fixes,
        outcome: "failure",
        tokenUsage: fixResult.tokenUsage
      };
      session.attempts.push(attempt2);
      circuitBreaker.recordAttempt(currentErrors, fixResult.tokenUsage);
      if (onAttemptComplete) {
        onAttemptComplete(attempt2);
      }
      continue;
    }
    const fixedCode = applyResult.value;
    let testResult;
    try {
      testResult = await testRunner.runTest(testFile, fixedCode);
    } catch (error) {
      const attempt2 = {
        attemptNumber: session.attempts.length + 1,
        timestamp: /* @__PURE__ */ new Date(),
        error: primaryError,
        proposedFixes: fixResult.fixes,
        appliedFix: fixToApply,
        outcome: "failure",
        newErrors: [parseError(error instanceof Error ? error.message : "Test run error")],
        tokenUsage: fixResult.tokenUsage
      };
      session.attempts.push(attempt2);
      circuitBreaker.recordAttempt(currentErrors, fixResult.tokenUsage);
      if (onAttemptComplete) {
        onAttemptComplete(attempt2);
      }
      continue;
    }
    const newErrors = testResult.errors;
    const outcome = determineOutcome(currentErrors, newErrors);
    const attempt = {
      attemptNumber: session.attempts.length + 1,
      timestamp: /* @__PURE__ */ new Date(),
      error: primaryError,
      proposedFixes: fixResult.fixes,
      appliedFix: fixToApply,
      outcome,
      newErrors: newErrors.length > 0 ? newErrors : void 0,
      tokenUsage: fixResult.tokenUsage
    };
    session.attempts.push(attempt);
    if (outcome === "success" || outcome === "partial") {
      currentCode = fixedCode;
      session.currentCode = currentCode;
      appliedFixes.push(fixToApply);
      const lesson = createLesson(journeyId, fixToApply, primaryError);
      if (lesson) {
        lessonsLearned.push(lesson);
      }
    }
    currentErrors = newErrors;
    convergenceDetector.recordAttempt(newErrors);
    circuitBreaker.recordAttempt(newErrors, fixResult.tokenUsage);
    session.circuitBreakerState = circuitBreaker.getState();
    session.convergenceInfo = convergenceDetector.getInfo();
    if (onAttemptComplete) {
      onAttemptComplete(attempt);
    }
    if (config.timeouts.delayBetweenAttempts > 0) {
      await sleep(config.timeouts.delayBetweenAttempts);
    }
  }
  session.endTime = /* @__PURE__ */ new Date();
  session.circuitBreakerState = circuitBreaker.getState();
  session.convergenceInfo = convergenceDetector.getInfo();
  if (onProgressUpdate) {
    onProgressUpdate({
      attemptNumber: session.attempts.length,
      maxAttempts: config.maxAttempts,
      currentErrorCount: currentErrors.length,
      originalErrorCount: initialErrors.length,
      trend: convergenceDetector.getInfo().trend,
      status: currentErrors.length === 0 ? "success" : "failed"
    });
  }
  return {
    success: currentErrors.length === 0,
    session,
    fixedCode: currentErrors.length === 0 ? currentCode : void 0,
    remainingErrors: currentErrors,
    appliedFixes,
    lessonsLearned,
    diagnostics: createDiagnostics(session)
  };
}
function applyFix2(code, fix) {
  if (!code.includes(fix.originalCode)) {
    return err2(`Original code not found: "${fix.originalCode.substring(0, 50)}..."`);
  }
  const fixedCode = code.replace(fix.originalCode, fix.fixedCode);
  return ok2(fixedCode);
}
function determineOutcome(previousErrors, newErrors) {
  if (newErrors.length === 0) {
    return "success";
  }
  if (newErrors.length < previousErrors.length) {
    return "partial";
  }
  const previousFingerprints = new Set(previousErrors.map((e) => e.fingerprint));
  const newFingerprints = new Set(newErrors.map((e) => e.fingerprint));
  let fixedCount = 0;
  for (const fp of previousFingerprints) {
    if (!newFingerprints.has(fp)) {
      fixedCount++;
    }
  }
  if (fixedCount > 0) {
    return "partial";
  }
  return "failure";
}
function mapAnalysisToStatus(reason, noErrors) {
  if (noErrors) {
    return "SUCCESS";
  }
  if (reason.includes("Circuit breaker")) {
    if (reason.includes("MAX_ATTEMPTS")) return "MAX_ATTEMPTS_REACHED";
    if (reason.includes("SAME_ERROR")) return "SAME_ERROR_LOOP";
    if (reason.includes("OSCILLATION")) return "OSCILLATION_DETECTED";
    if (reason.includes("TIMEOUT")) return "TIMEOUT";
    if (reason.includes("BUDGET")) return "BUDGET_EXCEEDED";
  }
  if (reason.includes("stagnating")) return "CANNOT_FIX";
  if (reason.includes("degrading")) return "CANNOT_FIX";
  if (reason.includes("oscillating")) return "OSCILLATION_DETECTED";
  return "PARTIAL_SUCCESS";
}
function createDiagnostics(session) {
  const lastAttempt = session.attempts.length > 0 ? session.attempts[session.attempts.length - 1] : void 0;
  const lastError = lastAttempt?.error?.message || "";
  return {
    attempts: session.attempts.length,
    lastError,
    convergenceFailure: session.convergenceInfo.trend === "stagnating" || session.convergenceInfo.trend === "oscillating",
    sameErrorRepeated: session.circuitBreakerState.openReason === "SAME_ERROR",
    oscillationDetected: session.circuitBreakerState.openReason === "OSCILLATION" || session.convergenceInfo.trend === "oscillating",
    budgetExhausted: session.circuitBreakerState.openReason === "BUDGET_EXCEEDED",
    timedOut: session.circuitBreakerState.openReason === "TIMEOUT"
  };
}
function createLesson(journeyId, fix, error) {
  if (fix.confidence < 0.7) {
    return void 0;
  }
  const lessonType = mapFixTypeToLessonType(fix.type);
  if (!lessonType) {
    return void 0;
  }
  return {
    id: `lesson-${journeyId}-${Date.now()}`,
    type: lessonType,
    context: {
      journeyId,
      errorCategory: error.category,
      originalSelector: error.selector,
      element: fix.location.stepDescription || ""
    },
    solution: {
      pattern: fix.type,
      code: fix.fixedCode,
      explanation: fix.reasoning || fix.description
    },
    confidence: fix.confidence,
    createdAt: /* @__PURE__ */ new Date(),
    verified: true
    // It worked!
  };
}
function mapFixTypeToLessonType(fixType) {
  switch (fixType) {
    case "SELECTOR_CHANGE":
    case "LOCATOR_STRATEGY_CHANGED":
      return "selector_pattern";
    case "WAIT_ADDED":
    case "TIMEOUT_INCREASED":
      return "wait_strategy";
    case "FLOW_REORDERED":
      return "flow_pattern";
    default:
      return "error_fix";
  }
}
function addTokenUsage(a, b) {
  return {
    promptTokens: a.promptTokens + b.promptTokens,
    completionTokens: a.completionTokens + b.completionTokens,
    totalTokens: a.totalTokens + b.totalTokens,
    estimatedCostUsd: a.estimatedCostUsd + b.estimatedCostUsd
  };
}
function sleep(ms) {
  return new Promise((resolve7) => setTimeout(resolve7, ms));
}
async function runSingleRefinementAttempt(code, errors, llmClient, options = {}) {
  try {
    const result = await llmClient.generateFix(code, errors, [], {
      maxTokens: options.maxTokens || 4096,
      temperature: options.temperature || 0.2,
      systemPrompt: REFINEMENT_SYSTEM_PROMPT
    });
    return ok2({
      fixes: result.fixes,
      reasoning: result.reasoning
    });
  } catch (error) {
    return err2(error instanceof Error ? error.message : "Unknown error");
  }
}

// src/refinement/llkb-learning.ts
var DEFAULT_EXTRACTION_OPTIONS = {
  minConfidence: 0.7,
  includeUnverified: false,
  maxLessonsPerSession: 10
};
function extractLessonsFromSession(session, options = {}) {
  const opts = { ...DEFAULT_EXTRACTION_OPTIONS, ...options };
  const lessons = [];
  for (const attempt of session.attempts) {
    if (attempt.outcome !== "success" && attempt.outcome !== "partial") {
      continue;
    }
    if (!attempt.appliedFix) {
      continue;
    }
    const fix = attempt.appliedFix;
    if (fix.confidence < opts.minConfidence) {
      continue;
    }
    const lesson = createLessonFromFix(
      session.journeyId,
      fix,
      attempt.error,
      attempt.outcome === "success"
      // verified only if full success
    );
    if (lesson && (lesson.verified || opts.includeUnverified)) {
      lessons.push(lesson);
    }
    if (lessons.length >= opts.maxLessonsPerSession) {
      break;
    }
  }
  return lessons;
}
function createLessonFromFix(journeyId, fix, error, verified) {
  const type = mapFixTypeToLessonType2(fix.type);
  if (!type) {
    return void 0;
  }
  return {
    id: generateLessonId(journeyId, fix, error),
    type,
    context: {
      journeyId,
      errorCategory: error.category,
      originalSelector: error.selector,
      element: extractElementDescription(fix, error)
    },
    solution: {
      pattern: extractPattern(fix),
      code: fix.fixedCode,
      explanation: fix.reasoning || fix.description
    },
    confidence: fix.confidence,
    createdAt: /* @__PURE__ */ new Date(),
    verified
  };
}
function mapFixTypeToLessonType2(fixType) {
  switch (fixType) {
    case "SELECTOR_CHANGE":
    case "LOCATOR_STRATEGY_CHANGED":
    case "FRAME_CONTEXT_ADDED":
      return "selector_pattern";
    case "WAIT_ADDED":
    case "TIMEOUT_INCREASED":
    case "RETRY_ADDED":
      return "wait_strategy";
    case "FLOW_REORDERED":
      return "flow_pattern";
    case "ASSERTION_MODIFIED":
    case "ERROR_HANDLING_ADDED":
    case "OTHER":
      return "error_fix";
    default:
      return void 0;
  }
}
function generateLessonId(journeyId, fix, error) {
  const timestamp = Date.now();
  const fixHash = hashString(fix.fixedCode.substring(0, 50));
  return `lesson-${journeyId}-${error.category}-${fixHash}-${timestamp}`;
}
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}
function extractElementDescription(fix, error) {
  if (fix.location.stepDescription) {
    return fix.location.stepDescription;
  }
  if (error.selector) {
    return extractElementFromSelector(error.selector);
  }
  const locatorMatch = fix.fixedCode.match(/getBy\w+\(['"]([^'"]+)['"]\)/);
  if (locatorMatch && locatorMatch[1]) {
    return locatorMatch[1];
  }
  return "unknown element";
}
function extractElementFromSelector(selector) {
  const testIdMatch = selector.match(/data-testid[=~*^$]*["']?([^"'\]]+)/);
  if (testIdMatch && testIdMatch[1]) {
    return testIdMatch[1];
  }
  const roleMatch = selector.match(/role=["']?([^"'\]]+)/);
  if (roleMatch && roleMatch[1]) {
    return roleMatch[1];
  }
  const classMatch = selector.match(/\.([a-zA-Z0-9_-]+)/);
  if (classMatch && classMatch[1]) {
    return classMatch[1];
  }
  return selector.substring(0, 30);
}
function extractPattern(fix) {
  switch (fix.type) {
    case "SELECTOR_CHANGE":
      return extractSelectorPattern(fix.fixedCode);
    case "WAIT_ADDED":
      return extractWaitPattern(fix.fixedCode);
    case "ASSERTION_MODIFIED":
      return extractAssertionPattern(fix.fixedCode);
    default:
      return fix.type;
  }
}
function extractSelectorPattern(code) {
  if (code.includes("getByTestId")) return "testid";
  if (code.includes("getByRole")) return "role";
  if (code.includes("getByText")) return "text";
  if (code.includes("getByLabel")) return "label";
  if (code.includes("getByPlaceholder")) return "placeholder";
  if (code.includes("locator")) return "css";
  return "unknown";
}
function extractWaitPattern(code) {
  if (code.includes("waitForSelector")) return "waitForSelector";
  if (code.includes("waitForLoadState")) return "waitForLoadState";
  if (code.includes("waitForResponse")) return "waitForResponse";
  if (code.includes("waitForTimeout")) return "waitForTimeout";
  if (code.includes("toBeVisible")) return "expectVisible";
  return "unknown";
}
function extractAssertionPattern(code) {
  if (code.includes("toHaveText")) return "toHaveText";
  if (code.includes("toHaveValue")) return "toHaveValue";
  if (code.includes("toBeVisible")) return "toBeVisible";
  if (code.includes("toBeEnabled")) return "toBeEnabled";
  if (code.includes("toHaveCount")) return "toHaveCount";
  return "unknown";
}
function aggregateLessons(lessons) {
  const patterns = /* @__PURE__ */ new Map();
  for (const lesson of lessons) {
    const key = `${lesson.type}:${lesson.solution.pattern}`;
    const existing = patterns.get(key);
    if (existing) {
      existing.occurrences++;
      existing.totalConfidence += lesson.confidence;
      existing.contexts.add(lesson.context.errorCategory);
      existing.codes.push(lesson.solution.code);
    } else {
      patterns.set(key, {
        occurrences: 1,
        totalConfidence: lesson.confidence,
        contexts: /* @__PURE__ */ new Set([lesson.context.errorCategory]),
        codes: [lesson.solution.code]
      });
    }
  }
  return Array.from(patterns.entries()).map(([key, data]) => ({
    pattern: key,
    occurrences: data.occurrences,
    averageConfidence: data.totalConfidence / data.occurrences,
    contexts: Array.from(data.contexts),
    representativeCode: data.codes[0] || ""
    // Use first occurrence as representative
  })).sort((a, b) => b.occurrences - a.occurrences);
}
function calculateConfidenceAdjustment(lesson, outcome, currentUsageCount) {
  const oldConfidence = lesson.confidence;
  let newConfidence;
  let reason;
  if (outcome === "success") {
    const increment = 0.05 * Math.pow(0.9, currentUsageCount);
    newConfidence = Math.min(1, oldConfidence + increment);
    reason = "success";
  } else {
    const decrement = 0.1 * Math.pow(1.1, currentUsageCount);
    newConfidence = Math.max(0, oldConfidence - decrement);
    reason = "failure";
  }
  return {
    lessonId: lesson.id,
    oldConfidence,
    newConfidence,
    reason
  };
}
function applyConfidenceDecay(lessons, decayRate = 0.01, referenceDate = /* @__PURE__ */ new Date()) {
  const adjustments = [];
  for (const lesson of lessons) {
    const ageInDays = (referenceDate.getTime() - lesson.createdAt.getTime()) / (1e3 * 60 * 60 * 24);
    if (ageInDays > 30) {
      const decayFactor = Math.pow(1 - decayRate, Math.floor(ageInDays / 30));
      const newConfidence = lesson.confidence * decayFactor;
      if (newConfidence !== lesson.confidence) {
        adjustments.push({
          lessonId: lesson.id,
          oldConfidence: lesson.confidence,
          newConfidence,
          reason: "decay"
        });
      }
    }
  }
  return adjustments;
}
function recommendLessons(errors, availableLessons, maxRecommendations = 5) {
  const recommendations = [];
  for (const lesson of availableLessons) {
    if (lesson.confidence < 0.6 || !lesson.verified) {
      continue;
    }
    for (const error of errors) {
      const relevance = calculateRelevance(lesson, error);
      if (relevance > 0) {
        recommendations.push({
          lesson,
          relevanceScore: relevance * lesson.confidence,
          applicabilityReason: explainRelevance(lesson, error)
        });
        break;
      }
    }
  }
  return recommendations.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, maxRecommendations);
}
function calculateRelevance(lesson, error) {
  let score = 0;
  if (lesson.context.errorCategory === error.category) {
    score += 0.5;
  }
  if (lesson.context.originalSelector && error.selector) {
    const similarity = calculateSelectorSimilarity(
      lesson.context.originalSelector,
      error.selector
    );
    score += similarity * 0.3;
  }
  const suggestedFixes = getSuggestedFixTypesForLesson(error.category);
  if (suggestedFixes.includes(lessonTypeToFixType(lesson.type))) {
    score += 0.2;
  }
  return score;
}
function calculateSelectorSimilarity(selector1, selector2) {
  const strategy1 = extractSelectorStrategy(selector1);
  const strategy2 = extractSelectorStrategy(selector2);
  if (strategy1 === strategy2) {
    return 0.8;
  }
  if (["testid", "role", "label"].includes(strategy1) && ["testid", "role", "label"].includes(strategy2)) {
    return 0.5;
  }
  return 0.2;
}
function extractSelectorStrategy(selector) {
  if (selector.includes("data-testid")) return "testid";
  if (selector.includes("role=")) return "role";
  if (selector.includes("aria-label")) return "label";
  if (selector.match(/^[.#]/)) return "css";
  return "other";
}
function explainRelevance(lesson, error) {
  const reasons = [];
  if (lesson.context.errorCategory === error.category) {
    reasons.push(`Same error type: ${error.category}`);
  }
  if (lesson.context.originalSelector && error.selector) {
    reasons.push("Similar selector pattern");
  }
  reasons.push(`Solution: ${lesson.solution.pattern}`);
  return reasons.join("; ");
}
function getSuggestedFixTypesForLesson(category) {
  switch (category) {
    case "SELECTOR_NOT_FOUND":
      return ["SELECTOR_CHANGE", "LOCATOR_STRATEGY_CHANGED"];
    case "TIMEOUT":
      return ["WAIT_ADDED", "TIMEOUT_INCREASED"];
    case "ASSERTION_FAILED":
      return ["ASSERTION_MODIFIED"];
    default:
      return ["OTHER"];
  }
}
function lessonTypeToFixType(lessonType) {
  switch (lessonType) {
    case "selector_pattern":
      return "SELECTOR_CHANGE";
    case "wait_strategy":
      return "WAIT_ADDED";
    case "flow_pattern":
      return "FLOW_REORDERED";
    case "error_fix":
      return "OTHER";
  }
}

// src/refinement/llkb-storage.ts
init_paths();
var LLKB_REFINEMENT_FILE = "refinement-lessons.json";
function getLlkbRefinementPath() {
  return join(getLlkbRoot(), LLKB_REFINEMENT_FILE);
}
function createEmptyStore() {
  return {
    version: "1.0",
    lessons: [],
    stats: {
      totalLessons: 0,
      lessonsByType: {
        "selector": 0,
        "timing": 0,
        "assertion": 0,
        "navigation": 0,
        "form": 0,
        "error-fix": 0
      },
      avgConfidence: 0,
      totalApplications: 0,
      successRate: 0
    },
    lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
  };
}
function loadLlkbStore() {
  const path = getLlkbRefinementPath();
  if (!existsSync(path)) {
    return createEmptyStore();
  }
  try {
    const content = readFileSync(path, "utf-8");
    return JSON.parse(content);
  } catch {
    return createEmptyStore();
  }
}
function saveLlkbStore(store) {
  const path = getLlkbRefinementPath();
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  store.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
  updateStats(store);
  writeFileSync(path, JSON.stringify(store, null, 2), "utf-8");
}
function updateStats(store) {
  const stats = store.stats;
  stats.totalLessons = store.lessons.length;
  for (const type of Object.keys(stats.lessonsByType)) {
    stats.lessonsByType[type] = 0;
  }
  let totalConfidence = 0;
  let totalApplications = 0;
  let totalSuccesses = 0;
  for (const lesson of store.lessons) {
    stats.lessonsByType[lesson.type]++;
    totalConfidence += lesson.confidence;
    totalApplications += lesson.successCount + lesson.failureCount;
    totalSuccesses += lesson.successCount;
  }
  stats.avgConfidence = store.lessons.length > 0 ? totalConfidence / store.lessons.length : 0;
  stats.totalApplications = totalApplications;
  stats.successRate = totalApplications > 0 ? totalSuccesses / totalApplications : 0;
}
function generateLessonId2(type, pattern) {
  const hash = pattern.split("").reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);
  return `${type}-${Math.abs(hash).toString(36)}`;
}
function findLesson(store, type, pattern) {
  return store.lessons.find(
    (l) => l.type === type && l.pattern === pattern
  );
}
function findLessonsForContext(store, context, minConfidence = 0.5) {
  return store.lessons.filter((lesson) => {
    if (lesson.confidence < minConfidence) {
      return false;
    }
    const lc = lesson.context;
    if (context.errorType && lc.errorType !== context.errorType) {
      return false;
    }
    if (context.stepType && lc.stepType !== context.stepType) {
      return false;
    }
    if (context.componentType && lc.componentType !== context.componentType) {
      return false;
    }
    if (context.errorMessage && lc.errorMessage) {
      const contextWords = context.errorMessage.toLowerCase().split(/\s+/);
      const lessonWords = lc.errorMessage.toLowerCase().split(/\s+/);
      const overlap = contextWords.filter((w) => lessonWords.includes(w));
      if (overlap.length < Math.min(3, contextWords.length * 0.5)) {
        return false;
      }
    }
    return true;
  }).sort((a, b) => b.confidence - a.confidence);
}
function addLesson(store, type, pattern, context, fix, initialConfidence = 0.5) {
  const existing = findLesson(store, type, pattern);
  if (existing) {
    existing.context = { ...existing.context, ...context };
    existing.fix = fix;
    existing.lastUsedAt = (/* @__PURE__ */ new Date()).toISOString();
    return existing;
  }
  const lesson = {
    id: generateLessonId2(type, pattern),
    type,
    pattern,
    context,
    fix,
    confidence: initialConfidence,
    successCount: 0,
    failureCount: 0,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  store.lessons.push(lesson);
  return lesson;
}
function recordSuccess(store, lessonId) {
  const lesson = store.lessons.find((l) => l.id === lessonId);
  if (lesson) {
    lesson.successCount++;
    lesson.lastSuccessAt = (/* @__PURE__ */ new Date()).toISOString();
    lesson.lastUsedAt = (/* @__PURE__ */ new Date()).toISOString();
    lesson.confidence = Math.min(0.95, lesson.confidence + 0.05);
  }
}
function recordFailure(store, lessonId) {
  const lesson = store.lessons.find((l) => l.id === lessonId);
  if (lesson) {
    lesson.failureCount++;
    lesson.lastUsedAt = (/* @__PURE__ */ new Date()).toISOString();
    lesson.confidence = Math.max(0.1, lesson.confidence - 0.1);
  }
}
function pruneLessons(store, minConfidence = 0.2, minApplications = 3) {
  const before = store.lessons.length;
  store.lessons = store.lessons.filter((lesson) => {
    const applications = lesson.successCount + lesson.failureCount;
    return applications < minApplications || lesson.confidence >= minConfidence;
  });
  return before - store.lessons.length;
}
function learnFromRefinement(errorType, errorMessage, originalCode, fixedCode, stepType) {
  const store = loadLlkbStore();
  const pattern = `${errorType}:${errorMessage.substring(0, 50)}`;
  let fixType = "replace";
  if (fixedCode.length > originalCode.length * 1.5) {
    fixType = "wrap";
  } else if (!originalCode.trim()) {
    fixType = "insert";
  }
  const lesson = addLesson(
    store,
    "error-fix",
    pattern,
    {
      errorType,
      errorMessage: errorMessage.substring(0, 200),
      stepType
    },
    {
      type: fixType,
      pattern: originalCode,
      replacement: fixedCode,
      explanation: `Fix for ${errorType} error`
    },
    0.6
    // Start with higher confidence since it worked
  );
  recordSuccess(store, lesson.id);
  saveLlkbStore(store);
  return lesson;
}
function getSuggestedFixes(errorType, errorMessage, stepType) {
  const store = loadLlkbStore();
  return findLessonsForContext(store, {
    errorType,
    errorMessage,
    stepType
  });
}
function applyLearnedFix(lessonId, success) {
  const store = loadLlkbStore();
  if (success) {
    recordSuccess(store, lessonId);
  } else {
    recordFailure(store, lessonId);
  }
  saveLlkbStore(store);
}
function exportLessonsForOrchestrator() {
  const store = loadLlkbStore();
  const exportLessons = store.lessons.filter((l) => l.confidence >= 0.5).sort((a, b) => b.confidence - a.confidence).slice(0, 100);
  return {
    lessons: exportLessons,
    stats: store.stats,
    exportedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}

// src/refinement/playwright-runner.ts
init_paths();
var ERROR_PATTERNS2 = [
  {
    type: "selector",
    patterns: [
      /locator.*not found/i,
      /element.*not found/i,
      /strict mode violation/i,
      /resolved to \d+ elements/i,
      /waiting for locator/i
    ]
  },
  {
    type: "timeout",
    patterns: [
      /timeout.*exceeded/i,
      /test.*timeout/i,
      /exceeded.*timeout/i,
      /timed out/i
    ]
  },
  {
    type: "assertion",
    patterns: [
      /expect.*received/i,
      /assertion.*failed/i,
      /toequal.*failed/i,
      /tobehave.*failed/i,
      /expected.*but got/i
    ]
  },
  {
    type: "navigation",
    patterns: [
      /page\.goto/i,
      /navigation.*failed/i,
      /net::ERR/i,
      /NS_ERROR/i,
      /navigating to/i
    ]
  },
  {
    type: "typescript",
    patterns: [
      /syntaxerror/i,
      /typeerror/i,
      /referenceerror/i,
      /ts\(\d+\)/i,
      /cannot find module/i
    ]
  },
  {
    type: "network",
    patterns: [
      /ECONNREFUSED/i,
      /ENOTFOUND/i,
      /network.*error/i,
      /fetch.*failed/i
    ]
  }
];
function classifyError2(message) {
  for (const { type, patterns } of ERROR_PATTERNS2) {
    if (patterns.some((p) => p.test(message))) {
      return type;
    }
  }
  return "unknown";
}
function parseJsonReport(jsonPath) {
  try {
    if (!existsSync(jsonPath)) {
      return null;
    }
    const content = readFileSync(jsonPath, "utf-8");
    const report = JSON.parse(content);
    const counts = {
      total: (report.stats.expected ?? 0) + (report.stats.unexpected ?? 0) + (report.stats.skipped ?? 0) + (report.stats.flaky ?? 0),
      passed: report.stats.expected ?? 0,
      failed: report.stats.unexpected ?? 0,
      skipped: report.stats.skipped ?? 0,
      flaky: report.stats.flaky ?? 0
    };
    const failures = [];
    parseFailuresFromSuites(report.suites, failures);
    for (const error of report.errors ?? []) {
      failures.push({
        title: "Global Error",
        fullTitle: "Global Error",
        file: error.location?.file ?? "",
        line: error.location?.line,
        error: error.message.substring(0, 500),
        errorType: classifyError2(error.message)
      });
    }
    return { counts, failures };
  } catch (err3) {
    console.warn(`[playwright-runner] Failed to parse JSON report: ${err3 instanceof Error ? err3.message : "unknown"}`);
    return null;
  }
}
function parseFailuresFromSuites(suites, failures) {
  for (const suite of suites) {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        if (test.status === "unexpected" || test.status === "flaky") {
          const lastResult = test.results[test.results.length - 1];
          if (lastResult?.error) {
            failures.push({
              title: spec.title,
              fullTitle: `${suite.title} > ${spec.title}`,
              file: suite.file,
              line: suite.line,
              error: (lastResult.error.message ?? "Unknown error").substring(0, 500),
              errorType: classifyError2(lastResult.error.message ?? ""),
              stack: lastResult.error.stack?.split("\n").slice(0, 5).join("\n"),
              duration: lastResult.duration,
              retryCount: lastResult.retry
            });
          }
        }
      }
    }
    if (suite.suites) {
      parseFailuresFromSuites(suite.suites, failures);
    }
  }
}
function parseTestCounts(output) {
  const counts = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    flaky: 0
  };
  const summaryMatch = output.match(/(\d+)\s+passed.*?(\d+)\s+failed.*?(\d+)\s+skipped/i);
  if (summaryMatch && summaryMatch[1] && summaryMatch[2] && summaryMatch[3]) {
    counts.passed = parseInt(summaryMatch[1], 10);
    counts.failed = parseInt(summaryMatch[2], 10);
    counts.skipped = parseInt(summaryMatch[3], 10);
    counts.total = counts.passed + counts.failed + counts.skipped;
    return counts;
  }
  const passedMatches = output.match(/✓|✔|passed/gi);
  const failedMatches = output.match(/✗|✘|failed/gi);
  const skippedMatches = output.match(/⊘|skipped/gi);
  counts.passed = passedMatches?.length || 0;
  counts.failed = failedMatches?.length || 0;
  counts.skipped = skippedMatches?.length || 0;
  counts.total = counts.passed + counts.failed + counts.skipped;
  const flakyMatch = output.match(/(\d+)\s+flaky/i);
  if (flakyMatch && flakyMatch[1]) {
    counts.flaky = parseInt(flakyMatch[1], 10);
  }
  return counts;
}
function parseFailures(stdout, stderr) {
  const failures = [];
  const combined = `${stdout}
${stderr}`;
  const errorBlocks = combined.split(/(?=\d+\)\s+\[|Error:|✘\s+\d+\s+)/);
  for (const block of errorBlocks) {
    if (!block.trim() || block.length < 30) continue;
    if (!block.includes("Error") && !block.includes("\u2718") && !block.includes("failed")) {
      continue;
    }
    const titleMatch = block.match(/(?:✘|✗|\d+\))\s+(?:\[.*?\])?\s*(.+?)(?:\(|at\s|Error)/);
    const title = titleMatch && titleMatch[1] ? titleMatch[1].trim() : "Unknown test";
    const fileMatch = block.match(/([^\s:]+\.(?:ts|js)):(\d+)/);
    const file = fileMatch && fileMatch[1] ? fileMatch[1] : "";
    const line = fileMatch && fileMatch[2] ? parseInt(fileMatch[2], 10) : void 0;
    const errorMatch = block.match(/Error:\s*([^\n]+)/);
    const error = errorMatch && errorMatch[1] ? errorMatch[1].trim() : block.split("\n")[0]?.trim() || "Unknown error";
    const stackLines = block.split("\n").filter((l) => l.trim().startsWith("at ")).slice(0, 5);
    const stack = stackLines.length > 0 ? stackLines.join("\n") : void 0;
    const durationMatch = block.match(/(\d+(?:\.\d+)?)\s*(?:ms|s)/);
    const duration = durationMatch && durationMatch[1] ? parseFloat(durationMatch[1]) * (durationMatch[0].includes("s") && !durationMatch[0].includes("ms") ? 1e3 : 1) : void 0;
    failures.push({
      title,
      fullTitle: title,
      file,
      line,
      error: error.substring(0, 500),
      errorType: classifyError2(error),
      stack,
      duration
    });
  }
  return failures;
}
async function runPlaywright(options) {
  const {
    testFiles,
    cwd = getHarnessRoot(),
    timeout = 3e4,
    retries = 0,
    headed = false,
    debug = false,
    reporter = "list",
    extraArgs = [],
    env = {},
    grep,
    project,
    workers = 1
  } = options;
  const startTime = Date.now();
  const jsonReportDir = join(cwd, ".artk", "autogen", "temp");
  const jsonReportPath = join(jsonReportDir, `playwright-report-${randomUUID()}.json`);
  mkdirSync(jsonReportDir, { recursive: true });
  const args = [
    "playwright",
    "test",
    ...testFiles,
    `--timeout=${timeout}`,
    `--retries=${retries}`,
    // Use multiple reporters: JSON for parsing + user's choice for display
    `--reporter=json,${reporter}`,
    `--workers=${workers}`
  ];
  if (headed) args.push("--headed");
  if (debug) args.push("--debug");
  if (grep) args.push(`--grep=${grep}`);
  if (project) args.push(`--project=${project}`);
  args.push(...extraArgs);
  return new Promise((resolve7) => {
    let stdout = "";
    let stderr = "";
    const spawnOptions = {
      cwd,
      env: {
        ...process.env,
        ...env,
        FORCE_COLOR: "1",
        // Force colored output for display reporter
        PLAYWRIGHT_JSON_OUTPUT_NAME: jsonReportPath
        // Direct JSON output to our file
      }
    };
    const proc = spawn("npx", args, spawnOptions);
    proc.stdout?.on("data", (data) => {
      stdout += data.toString();
    });
    proc.stderr?.on("data", (data) => {
      stderr += data.toString();
    });
    proc.on("close", (code) => {
      const duration = Date.now() - startTime;
      const exitCode = code ?? 1;
      let counts;
      let failures;
      const jsonResult = parseJsonReport(jsonReportPath);
      if (jsonResult) {
        counts = jsonResult.counts;
        failures = jsonResult.failures;
      } else {
        console.warn("[playwright-runner] JSON report not available, falling back to stdout parsing");
        counts = parseTestCounts(stdout);
        failures = parseFailures(stdout, stderr);
      }
      try {
        if (existsSync(jsonReportPath)) {
          unlinkSync(jsonReportPath);
        }
      } catch {
      }
      let status = "passed";
      if (exitCode !== 0) {
        if (stdout.includes("timeout") || stderr.includes("timeout") || failures.some((f) => f.errorType === "timeout")) {
          status = "timeout";
        } else if (failures.length > 0 || counts.failed > 0) {
          status = "failed";
        } else {
          status = "error";
        }
      }
      let reportPath;
      let tracePath;
      const reportDir = join(cwd, "playwright-report");
      if (existsSync(join(reportDir, "index.html"))) {
        reportPath = join(reportDir, "index.html");
      }
      const testResultsDir = join(cwd, "test-results");
      if (existsSync(testResultsDir)) {
        const traceFile = join(testResultsDir, "trace.zip");
        if (existsSync(traceFile)) {
          tracePath = traceFile;
        }
      }
      resolve7({
        status,
        exitCode,
        duration,
        counts,
        failures,
        stdout: stdout.substring(0, 5e4),
        // Limit size
        stderr: stderr.substring(0, 5e4),
        reportPath,
        tracePath
      });
    });
    proc.on("error", (err3) => {
      try {
        if (existsSync(jsonReportPath)) {
          unlinkSync(jsonReportPath);
        }
      } catch {
      }
      resolve7({
        status: "error",
        exitCode: 1,
        duration: Date.now() - startTime,
        counts: { total: 0, passed: 0, failed: 0, skipped: 0, flaky: 0 },
        failures: [{
          title: "Runner Error",
          fullTitle: "Runner Error",
          file: "",
          error: `Failed to spawn Playwright: ${err3.message}`,
          errorType: "unknown"
        }],
        stdout: "",
        stderr: err3.message
      });
    });
  });
}
async function runSingleTest(testFile, options = {}) {
  return runPlaywright({
    ...options,
    testFiles: [testFile]
  });
}
async function quickCheck(testFile, cwd) {
  const result = await runSingleTest(testFile, {
    cwd,
    timeout: 6e4,
    retries: 0,
    workers: 1
  });
  return result.status === "passed";
}
function formatFailures(failures) {
  return failures.map((f, i) => {
    const lines = [
      `${i + 1}) ${f.title}`,
      `   File: ${f.file}${f.line ? `:${f.line}` : ""}`,
      `   Error [${f.errorType}]: ${f.error}`
    ];
    if (f.stack) {
      lines.push(`   Stack:
${f.stack.split("\n").map((l) => `      ${l}`).join("\n")}`);
    }
    return lines.join("\n");
  }).join("\n\n");
}
function formatSummary(result) {
  const { counts, duration, status } = result;
  const durationSec = (duration / 1e3).toFixed(1);
  let summary = `Status: ${status.toUpperCase()}
`;
  summary += `Duration: ${durationSec}s
`;
  summary += `Tests: ${counts.passed}/${counts.total} passed`;
  if (counts.failed > 0) {
    summary += `, ${counts.failed} failed`;
  }
  if (counts.skipped > 0) {
    summary += `, ${counts.skipped} skipped`;
  }
  if (counts.flaky > 0) {
    summary += `, ${counts.flaky} flaky`;
  }
  return summary;
}

// src/uncertainty/index.ts
var uncertainty_exports = {};
__export(uncertainty_exports, {
  DEFAULT_DIMENSION_WEIGHTS: () => DEFAULT_DIMENSION_WEIGHTS,
  DEFAULT_MULTI_SAMPLER_CONFIG: () => DEFAULT_MULTI_SAMPLER_CONFIG,
  DEFAULT_THRESHOLDS: () => DEFAULT_THRESHOLDS,
  analyzeAgreement: () => analyzeAgreement2,
  analyzeSelectors: () => analyzeSelectors,
  calculateConfidence: () => calculateConfidence2,
  calculateConfidenceWithSamples: () => calculateConfidenceWithSamples,
  createOrchestratorSampleRequest: () => createOrchestratorSampleRequest,
  createPatternDimensionScore: () => createPatternDimensionScore,
  createSelectorDimensionScore: () => createSelectorDimensionScore,
  createSyntaxDimensionScore: () => createSyntaxDimensionScore,
  generateMultipleSamples: () => generateMultipleSamples,
  getBlockingIssues: () => getBlockingIssues,
  getBuiltinPatterns: () => getBuiltinPatterns,
  getDeprecatedAPIs: () => getDeprecatedAPIs,
  getPatternCategories: () => getPatternCategories,
  hasMinimumPatterns: () => hasMinimumPatterns,
  identifyStrategy: () => identifyStrategy,
  isSelectorFragile: () => isSelectorFragile,
  loadSamples: () => loadSamples,
  matchPatterns: () => matchPatterns,
  passesMinimumConfidence: () => passesMinimumConfidence,
  processOrchestratorSamples: () => processOrchestratorSamples,
  quickConfidenceCheck: () => quickConfidenceCheck,
  quickSyntaxCheck: () => quickSyntaxCheck,
  usesRecommendedSelectors: () => usesRecommendedSelectors,
  validateSyntax: () => validateSyntax2
});

// src/uncertainty/types.ts
var DEFAULT_DIMENSION_WEIGHTS = {
  syntax: 0.25,
  pattern: 0.25,
  selector: 0.3,
  agreement: 0.2
};
var DEFAULT_THRESHOLDS = {
  overall: 0.7,
  perDimension: {
    syntax: 0.9,
    // Syntax must be very high
    pattern: 0.6,
    selector: 0.7,
    agreement: 0.5
    // Agreement can be lower if single sample
  },
  blockOnAnyBelow: 0.4
};

// src/uncertainty/syntax-validator.ts
var PLAYWRIGHT_IMPORTS = [
  "@playwright/test",
  "playwright"
];
var PLAYWRIGHT_TEST_PATTERNS = [
  /test\s*\(\s*['"`]/,
  /test\.describe\s*\(\s*['"`]/,
  /test\.beforeEach\s*\(/,
  /test\.afterEach\s*\(/,
  /test\.beforeAll\s*\(/,
  /test\.afterAll\s*\(/
];
var PLAYWRIGHT_FIXTURE_PATTERNS = [
  /\{\s*page\s*\}/,
  /\{\s*page\s*,/,
  /,\s*page\s*\}/,
  /\{\s*browser\s*\}/,
  /\{\s*context\s*\}/,
  /\{\s*request\s*\}/
];
var DEPRECATED_APIS = [
  { pattern: /page\.waitForTimeout\s*\(\s*\d+\s*\)/g, api: "waitForTimeout with fixed delay", suggestion: "Use waitForSelector or expect assertions" },
  { pattern: /page\.\$\(/g, api: "page.$()", suggestion: "Use page.locator()" },
  { pattern: /page\.\$\$\(/g, api: "page.$$()", suggestion: "Use page.locator().all()" },
  { pattern: /page\.waitForSelector\(/g, api: "waitForSelector", suggestion: "Use locator.waitFor() or expect assertions" },
  { pattern: /elementHandle\./g, api: "ElementHandle", suggestion: "Use Locator API instead" },
  { pattern: /page\.click\(/g, api: "page.click()", suggestion: "Use locator.click()" },
  { pattern: /page\.fill\(/g, api: "page.fill()", suggestion: "Use locator.fill()" },
  { pattern: /page\.type\(/g, api: "page.type()", suggestion: "Use locator.fill() or locator.pressSequentially()" }
];
var SYNTAX_ERROR_PATTERNS = [
  { pattern: /await\s+await\s+/g, message: "Duplicate await", severity: "error" },
  { pattern: /\}\s*\)\s*;?\s*\)\s*;/g, message: "Unbalanced parentheses/braces", severity: "error" },
  { pattern: /\(\s*\)\s*=>\s*\{[^}]*$/m, message: "Unclosed arrow function", severity: "error" },
  { pattern: /expect\([^)]*\)\s*\.\s*$/m, message: "Incomplete expect chain", severity: "error" },
  { pattern: /const\s+\w+\s*=\s*$/m, message: "Incomplete variable declaration", severity: "error" }
];
var SYNTAX_WARNING_PATTERNS = [
  { pattern: /\/\/\s*TODO/gi, message: "TODO comment found - incomplete implementation", suggestion: "Complete the TODO items" },
  { pattern: /console\.log\(/g, message: "Console.log in test code", suggestion: "Remove debug statements" },
  { pattern: /\.only\s*\(/g, message: ".only() will skip other tests", suggestion: "Remove .only() before committing" },
  { pattern: /\.skip\s*\(/g, message: ".skip() found - test will not run", suggestion: "Remove .skip() or add explanation" },
  { pattern: /any\s*[,)]/g, message: 'Use of "any" type', suggestion: "Add proper type annotations" },
  { pattern: /as\s+any/g, message: "Type assertion to any", suggestion: "Use proper type instead" }
];
function validateSyntax2(code) {
  const errors = [];
  const warnings = [];
  const bracketErrors = validateBrackets(code);
  errors.push(...bracketErrors);
  const patternErrors = validatePatterns(code);
  errors.push(...patternErrors);
  const patternWarnings = checkWarningPatterns(code);
  warnings.push(...patternWarnings);
  const typescript = validateTypeScript(code);
  errors.push(...typescript.errors);
  const playwright = validatePlaywright(code);
  const score = calculateSyntaxScore(errors, warnings, typescript, playwright);
  return {
    valid: errors.filter((e) => e.severity === "error").length === 0,
    score,
    errors,
    warnings,
    typescript,
    playwright
  };
}
function createSyntaxDimensionScore(result) {
  const subScores = [
    {
      name: "TypeScript Compilation",
      score: result.typescript.compiles ? 1 : 0,
      details: result.typescript.compiles ? "Code compiles" : "Compilation errors found"
    },
    {
      name: "Type Inference",
      score: result.typescript.typeInferenceScore,
      details: `Type coverage: ${Math.round(result.typescript.typeInferenceScore * 100)}%`
    },
    {
      name: "Playwright API Usage",
      score: result.playwright.apiUsageScore,
      details: `API correctness: ${Math.round(result.playwright.apiUsageScore * 100)}%`
    },
    {
      name: "Test Structure",
      score: result.playwright.hasValidTestBlocks ? 1 : 0.3,
      details: result.playwright.hasValidTestBlocks ? "Valid test blocks" : "Missing test blocks"
    }
  ];
  const reasoning = generateSyntaxReasoning(result);
  return {
    dimension: "syntax",
    score: result.score,
    weight: 0.25,
    reasoning,
    subScores
  };
}
function validateBrackets(code) {
  const errors = [];
  const stack = [];
  const pairs = { "(": ")", "[": "]", "{": "}" };
  const closers = { ")": "(", "]": "[", "}": "{" };
  const lines = code.split("\n");
  let inString = false;
  let stringChar = "";
  let inMultilineComment = false;
  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum] || "";
    for (let col = 0; col < line.length; col++) {
      const char = line[col] || "";
      const prevChar = col > 0 ? line[col - 1] || "" : "";
      const nextChar = col < line.length - 1 ? line[col + 1] || "" : "";
      if (!inString) {
        if (char === "/" && nextChar === "/" && !inMultilineComment) {
          break;
        }
        if (char === "/" && nextChar === "*") {
          inMultilineComment = true;
          continue;
        }
        if (char === "*" && nextChar === "/" && inMultilineComment) {
          inMultilineComment = false;
          col++;
          continue;
        }
        if (inMultilineComment) continue;
      }
      if ((char === '"' || char === "'" || char === "`") && prevChar !== "\\") {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
        continue;
      }
      if (inString) continue;
      if (pairs[char]) {
        stack.push({ char, line: lineNum + 1, column: col + 1 });
      } else if (closers[char]) {
        const last = stack.pop();
        if (!last) {
          errors.push({
            line: lineNum + 1,
            column: col + 1,
            message: `Unexpected closing '${char}'`,
            code: "BRACKET_MISMATCH",
            severity: "error"
          });
        } else {
          const expectedCloser = pairs[last.char];
          if (expectedCloser && last.char !== closers[char]) {
            errors.push({
              line: lineNum + 1,
              column: col + 1,
              message: `Mismatched brackets: expected '${expectedCloser}' but found '${char}'`,
              code: "BRACKET_MISMATCH",
              severity: "error"
            });
          }
        }
      }
    }
  }
  for (const unclosed of stack) {
    errors.push({
      line: unclosed.line,
      column: unclosed.column,
      message: `Unclosed '${unclosed.char}'`,
      code: "BRACKET_UNCLOSED",
      severity: "error"
    });
  }
  if (inString) {
    errors.push({
      line: lines.length,
      column: 1,
      message: `Unterminated string literal`,
      code: "STRING_UNTERMINATED",
      severity: "error"
    });
  }
  return errors;
}
function validatePatterns(code) {
  const errors = [];
  for (const errorPattern of SYNTAX_ERROR_PATTERNS) {
    let match;
    const regex = new RegExp(errorPattern.pattern.source, errorPattern.pattern.flags);
    while ((match = regex.exec(code)) !== null) {
      const lineNum = code.substring(0, match.index).split("\n").length;
      const lineStart = code.lastIndexOf("\n", match.index) + 1;
      errors.push({
        line: lineNum,
        column: match.index - lineStart + 1,
        message: errorPattern.message,
        code: "PATTERN_ERROR",
        severity: errorPattern.severity
      });
    }
  }
  return errors;
}
function checkWarningPatterns(code) {
  const warnings = [];
  for (const warningPattern of SYNTAX_WARNING_PATTERNS) {
    let match;
    const regex = new RegExp(warningPattern.pattern.source, warningPattern.pattern.flags);
    while ((match = regex.exec(code)) !== null) {
      const lineNum = code.substring(0, match.index).split("\n").length;
      warnings.push({
        line: lineNum,
        message: warningPattern.message,
        suggestion: warningPattern.suggestion
      });
    }
  }
  return warnings;
}
function validateTypeScript(code) {
  const errors = [];
  const incompleteStatements = code.match(/(?:const|let|var|function|class)\s+\w+\s*(?::|=)?\s*$/gm);
  if (incompleteStatements) {
    for (const stmt of incompleteStatements) {
      const lineNum = code.substring(0, code.indexOf(stmt)).split("\n").length;
      errors.push({
        line: lineNum,
        column: 1,
        message: "Incomplete statement",
        code: "TS_INCOMPLETE",
        severity: "error"
      });
    }
  }
  const badArrows = code.match(/=>\s*\{[^}]*(?!\})/gm);
  if (badArrows) {
    errors.push({
      line: 1,
      column: 1,
      message: "Unclosed arrow function body",
      code: "TS_ARROW_ERROR",
      severity: "error"
    });
  }
  const typeInferenceScore = calculateTypeInferenceScore(code);
  return {
    compiles: errors.length === 0,
    errors,
    typeInferenceScore
  };
}
function calculateTypeInferenceScore(code) {
  let score = 1;
  const anyCount = (code.match(/:\s*any\b/g) || []).length;
  score -= anyCount * 0.1;
  const untypedParams = (code.match(/\(\s*\w+\s*[,)]/g) || []).length;
  const typedParams = (code.match(/\(\s*\w+\s*:/g) || []).length;
  if (untypedParams + typedParams > 0) {
    score -= untypedParams / (untypedParams + typedParams) * 0.2;
  }
  const hasReturnTypes = /\)\s*:\s*\w+/.test(code);
  if (hasReturnTypes) {
    score += 0.1;
  }
  return Math.max(0, Math.min(1, score));
}
function validatePlaywright(code) {
  const hasValidImports = PLAYWRIGHT_IMPORTS.some(
    (imp) => code.includes(`from '${imp}'`) || code.includes(`from "${imp}"`)
  );
  const usesTestFixtures = PLAYWRIGHT_FIXTURE_PATTERNS.some((pattern) => pattern.test(code));
  const hasValidTestBlocks = PLAYWRIGHT_TEST_PATTERNS.some((pattern) => pattern.test(code));
  const deprecatedAPIs = [];
  for (const deprecated of DEPRECATED_APIS) {
    if (deprecated.pattern.test(code)) {
      deprecatedAPIs.push(deprecated.api);
    }
  }
  const apiUsageScore = calculatePlaywrightAPIScore(code, deprecatedAPIs);
  return {
    hasValidImports,
    usesTestFixtures,
    hasValidTestBlocks,
    apiUsageScore,
    deprecatedAPIs
  };
}
function calculatePlaywrightAPIScore(code, deprecatedAPIs) {
  let score = 1;
  score -= deprecatedAPIs.length * 0.15;
  if (code.includes(".locator(") || code.includes("getBy")) {
    score += 0.1;
  }
  if (code.includes("expect(") && code.includes(").to")) {
    score += 0.1;
  }
  if (code.includes("test.step(")) {
    score += 0.05;
  }
  const hardWaits = (code.match(/waitForTimeout\s*\(\s*\d{4,}/g) || []).length;
  score -= hardWaits * 0.2;
  return Math.max(0, Math.min(1, score));
}
function calculateSyntaxScore(errors, warnings, typescript, playwright) {
  let score = 1;
  const criticalErrors = errors.filter((e) => e.severity === "error").length;
  score -= criticalErrors * 0.3;
  score -= warnings.length * 0.05;
  if (!typescript.compiles) {
    score -= 0.4;
  }
  score *= 0.7 + 0.3 * typescript.typeInferenceScore;
  if (!playwright.hasValidImports) score -= 0.2;
  if (!playwright.hasValidTestBlocks) score -= 0.3;
  if (!playwright.usesTestFixtures) score -= 0.1;
  score *= 0.7 + 0.3 * playwright.apiUsageScore;
  return Math.max(0, Math.min(1, score));
}
function generateSyntaxReasoning(result) {
  const reasons = [];
  if (result.errors.length > 0) {
    reasons.push(`${result.errors.length} syntax error(s) found`);
  }
  if (result.warnings.length > 0) {
    reasons.push(`${result.warnings.length} warning(s)`);
  }
  if (!result.typescript.compiles) {
    reasons.push("TypeScript compilation failed");
  }
  if (!result.playwright.hasValidImports) {
    reasons.push("Missing Playwright imports");
  }
  if (!result.playwright.hasValidTestBlocks) {
    reasons.push("No valid test blocks found");
  }
  if (result.playwright.deprecatedAPIs.length > 0) {
    reasons.push(`${result.playwright.deprecatedAPIs.length} deprecated API(s) used`);
  }
  if (reasons.length === 0) {
    reasons.push("Syntax is valid");
  }
  return reasons.join("; ");
}
function quickSyntaxCheck(code) {
  if (!code.includes("test(") && !code.includes("test.describe(")) {
    return false;
  }
  const brackets = validateBrackets(code);
  if (brackets.length > 0) {
    return false;
  }
  return true;
}
function getDeprecatedAPIs(code) {
  const found = [];
  for (const deprecated of DEPRECATED_APIS) {
    if (deprecated.pattern.test(code)) {
      found.push({
        api: deprecated.api,
        suggestion: deprecated.suggestion
      });
    }
  }
  return found;
}

// src/uncertainty/pattern-matcher.ts
var BUILTIN_PATTERNS = [
  // Navigation patterns
  {
    id: "nav-goto",
    name: "Page Navigation",
    category: "navigation",
    patterns: [/page\.goto\s*\(/],
    confidence: 0.95,
    source: "builtin"
  },
  {
    id: "nav-reload",
    name: "Page Reload",
    category: "navigation",
    patterns: [/page\.reload\s*\(/],
    confidence: 0.95,
    source: "builtin"
  },
  {
    id: "nav-back",
    name: "Navigate Back",
    category: "navigation",
    patterns: [/page\.goBack\s*\(/, /page\.goForward\s*\(/],
    confidence: 0.95,
    source: "builtin"
  },
  // Interaction patterns
  {
    id: "click-locator",
    name: "Locator Click",
    category: "interaction",
    patterns: [/\.click\s*\(\s*\)/, /locator\([^)]+\)\.click/],
    confidence: 0.9,
    source: "builtin"
  },
  {
    id: "fill-locator",
    name: "Locator Fill",
    category: "interaction",
    patterns: [/\.fill\s*\([^)]+\)/, /locator\([^)]+\)\.fill/],
    confidence: 0.9,
    source: "builtin"
  },
  {
    id: "type-locator",
    name: "Locator Type",
    category: "interaction",
    patterns: [/\.pressSequentially\s*\(/, /\.type\s*\(/],
    confidence: 0.85,
    source: "builtin"
  },
  {
    id: "select-option",
    name: "Select Option",
    category: "interaction",
    patterns: [/\.selectOption\s*\(/],
    confidence: 0.9,
    source: "builtin"
  },
  {
    id: "check-uncheck",
    name: "Checkbox Toggle",
    category: "interaction",
    patterns: [/\.check\s*\(\s*\)/, /\.uncheck\s*\(\s*\)/, /\.setChecked\s*\(/],
    confidence: 0.9,
    source: "builtin"
  },
  {
    id: "hover",
    name: "Hover Action",
    category: "interaction",
    patterns: [/\.hover\s*\(\s*\)/],
    confidence: 0.9,
    source: "builtin"
  },
  {
    id: "focus",
    name: "Focus Element",
    category: "interaction",
    patterns: [/\.focus\s*\(\s*\)/],
    confidence: 0.9,
    source: "builtin"
  },
  {
    id: "keyboard",
    name: "Keyboard Action",
    category: "interaction",
    patterns: [/\.press\s*\(['"]/, /keyboard\.press\s*\(/],
    confidence: 0.85,
    source: "builtin"
  },
  // Assertion patterns
  {
    id: "expect-visible",
    name: "Visibility Assertion",
    category: "assertion",
    patterns: [/expect\([^)]+\)\.toBeVisible/, /expect\([^)]+\)\.toBeHidden/],
    confidence: 0.95,
    source: "builtin"
  },
  {
    id: "expect-text",
    name: "Text Assertion",
    category: "assertion",
    patterns: [/expect\([^)]+\)\.toHaveText/, /expect\([^)]+\)\.toContainText/],
    confidence: 0.9,
    source: "builtin"
  },
  {
    id: "expect-value",
    name: "Value Assertion",
    category: "assertion",
    patterns: [/expect\([^)]+\)\.toHaveValue/],
    confidence: 0.9,
    source: "builtin"
  },
  {
    id: "expect-url",
    name: "URL Assertion",
    category: "assertion",
    patterns: [/expect\(page\)\.toHaveURL/],
    confidence: 0.95,
    source: "builtin"
  },
  {
    id: "expect-title",
    name: "Title Assertion",
    category: "assertion",
    patterns: [/expect\(page\)\.toHaveTitle/],
    confidence: 0.95,
    source: "builtin"
  },
  {
    id: "expect-count",
    name: "Count Assertion",
    category: "assertion",
    patterns: [/expect\([^)]+\)\.toHaveCount/],
    confidence: 0.9,
    source: "builtin"
  },
  {
    id: "expect-enabled",
    name: "Enabled State Assertion",
    category: "assertion",
    patterns: [/expect\([^)]+\)\.toBeEnabled/, /expect\([^)]+\)\.toBeDisabled/],
    confidence: 0.9,
    source: "builtin"
  },
  {
    id: "expect-checked",
    name: "Checked State Assertion",
    category: "assertion",
    patterns: [/expect\([^)]+\)\.toBeChecked/],
    confidence: 0.9,
    source: "builtin"
  },
  // Wait patterns
  {
    id: "wait-selector",
    name: "Wait for Selector",
    category: "wait",
    patterns: [/\.waitFor\s*\(\s*\{/, /locator\.waitFor/],
    confidence: 0.85,
    source: "builtin"
  },
  {
    id: "wait-load-state",
    name: "Wait for Load State",
    category: "wait",
    patterns: [/page\.waitForLoadState\s*\(/],
    confidence: 0.9,
    source: "builtin"
  },
  {
    id: "wait-response",
    name: "Wait for Response",
    category: "wait",
    patterns: [/page\.waitForResponse\s*\(/],
    confidence: 0.9,
    source: "builtin"
  },
  {
    id: "wait-request",
    name: "Wait for Request",
    category: "wait",
    patterns: [/page\.waitForRequest\s*\(/],
    confidence: 0.9,
    source: "builtin"
  },
  // Form patterns
  {
    id: "form-submit",
    name: "Form Submit",
    category: "form",
    patterns: [/getByRole\(['"]button['"].*submit/i, /type=['"]submit['"]/],
    confidence: 0.85,
    source: "builtin"
  },
  // Data patterns
  {
    id: "table-row",
    name: "Table Row Access",
    category: "data",
    patterns: [/getByRole\(['"]row['"]/, /locator\(['"]tr['"]\)/],
    confidence: 0.85,
    source: "builtin"
  },
  {
    id: "table-cell",
    name: "Table Cell Access",
    category: "data",
    patterns: [/getByRole\(['"]cell['"]/, /locator\(['"]td['"]\)/],
    confidence: 0.85,
    source: "builtin"
  },
  // Utility patterns
  {
    id: "screenshot",
    name: "Screenshot",
    category: "utility",
    patterns: [/page\.screenshot\s*\(/],
    confidence: 0.95,
    source: "builtin"
  },
  {
    id: "test-step",
    name: "Test Step",
    category: "utility",
    patterns: [/test\.step\s*\(/],
    confidence: 0.95,
    source: "builtin"
  }
];
function matchPatterns(code, options = {}) {
  const {
    customPatterns = [],
    llkbPatterns = [],
    includeBuiltins = true,
    minConfidence = 0.5
  } = options;
  const allPatterns2 = [
    ...includeBuiltins ? BUILTIN_PATTERNS : [],
    ...customPatterns,
    ...llkbPatterns
  ];
  const matchedPatterns = [];
  const matchedLineRanges = /* @__PURE__ */ new Set();
  for (const pattern of allPatterns2) {
    for (const regex of pattern.patterns) {
      const globalRegex = new RegExp(regex.source, "gm");
      let match;
      while ((match = globalRegex.exec(code)) !== null) {
        const startLine = code.substring(0, match.index).split("\n").length;
        const endLine = startLine;
        const lineRange = `${startLine}-${endLine}`;
        if (!matchedLineRanges.has(`${pattern.id}:${lineRange}`)) {
          matchedLineRanges.add(`${pattern.id}:${lineRange}`);
          matchedPatterns.push({
            patternId: pattern.id,
            patternName: pattern.name,
            confidence: pattern.confidence,
            codeLocation: { startLine, endLine },
            source: pattern.source
          });
        }
      }
    }
  }
  const unmatchedElements = findUnmatchedElements(code, matchedPatterns, allPatterns2);
  const noveltyScore = calculateNoveltyScore(matchedPatterns);
  const consistencyScore = calculateConsistencyScore(matchedPatterns);
  const overallScore = calculatePatternScore(
    matchedPatterns,
    unmatchedElements,
    noveltyScore,
    consistencyScore);
  return {
    score: overallScore,
    matchedPatterns,
    unmatchedElements,
    noveltyScore,
    consistencyScore
  };
}
function createPatternDimensionScore(result) {
  const subScores = [
    {
      name: "Pattern Coverage",
      score: Math.min(1, result.matchedPatterns.length / 10),
      details: `${result.matchedPatterns.length} patterns matched`
    },
    {
      name: "Novelty",
      score: result.noveltyScore,
      details: `Novelty score: ${Math.round(result.noveltyScore * 100)}%`
    },
    {
      name: "Consistency",
      score: result.consistencyScore,
      details: `Consistency score: ${Math.round(result.consistencyScore * 100)}%`
    },
    {
      name: "Unmatched Risk",
      score: Math.max(0, 1 - result.unmatchedElements.length * 0.2),
      details: `${result.unmatchedElements.length} unmatched elements`
    }
  ];
  const reasoning = generatePatternReasoning(result);
  return {
    dimension: "pattern",
    score: result.score,
    weight: 0.25,
    reasoning,
    subScores
  };
}
function findUnmatchedElements(code, matchedPatterns, allPatterns2) {
  const unmatched = [];
  const actionPatterns = [
    { regex: /page\.(\w+)\s*\(/g, type: "page method" },
    { regex: /locator\([^)]+\)\.(\w+)\s*\(/g, type: "locator method" },
    { regex: /getBy\w+\([^)]+\)\.(\w+)\s*\(/g, type: "locator method" },
    { regex: /expect\([^)]+\)\.(\w+)/g, type: "assertion" }
  ];
  for (const actionPattern of actionPatterns) {
    let match;
    const regex = new RegExp(actionPattern.regex.source, "g");
    while ((match = regex.exec(code)) !== null) {
      const methodName = match[1] || "";
      const lineNum = code.substring(0, match.index).split("\n").length;
      const isCovered = matchedPatterns.some(
        (p) => p.codeLocation.startLine <= lineNum && p.codeLocation.endLine >= lineNum
      );
      if (!isCovered && methodName) {
        const suggestions = findSuggestedPatterns(methodName, allPatterns2);
        unmatched.push({
          element: `${actionPattern.type}: ${methodName}`,
          reason: "No matching pattern found",
          suggestedPatterns: suggestions,
          riskLevel: determineRiskLevel(methodName)
        });
      }
    }
  }
  const seen = /* @__PURE__ */ new Set();
  return unmatched.filter((u) => {
    if (seen.has(u.element)) return false;
    seen.add(u.element);
    return true;
  });
}
function findSuggestedPatterns(methodName, patterns) {
  const suggestions = [];
  for (const pattern of patterns) {
    const patternText = pattern.patterns.map((p) => p.source).join(" ");
    if (patternText.toLowerCase().includes(methodName.toLowerCase())) {
      suggestions.push(pattern.name);
    }
  }
  return suggestions.slice(0, 3);
}
function determineRiskLevel(methodName) {
  const highRiskMethods = ["evaluate", "evaluateHandle", "addScriptTag", "setContent"];
  const mediumRiskMethods = ["waitForTimeout", "waitForFunction", "route", "unroute"];
  if (highRiskMethods.includes(methodName)) return "high";
  if (mediumRiskMethods.includes(methodName)) return "medium";
  return "low";
}
function calculateNoveltyScore(matchedPatterns, _allPatterns) {
  if (matchedPatterns.length === 0) return 0.5;
  const llkbCount = matchedPatterns.filter((p) => p.source === "llkb").length;
  const glossaryCount = matchedPatterns.filter((p) => p.source === "glossary").length;
  const total = matchedPatterns.length;
  const learnedRatio = (llkbCount + glossaryCount) / total;
  return 0.5 + learnedRatio * 0.5;
}
function calculateConsistencyScore(matchedPatterns) {
  if (matchedPatterns.length < 2) return 1;
  const categories = matchedPatterns.map((p) => {
    const pattern = BUILTIN_PATTERNS.find((bp) => bp.id === p.patternId);
    return pattern?.category || "unknown";
  });
  let transitions = 0;
  for (let i = 1; i < categories.length; i++) {
    const currCategory = categories[i];
    const prevCategory = categories[i - 1];
    if (currCategory && prevCategory && currCategory !== prevCategory) {
      transitions++;
    }
  }
  const transitionRatio = categories.length > 1 ? transitions / (categories.length - 1) : 0;
  return Math.max(0.6, 1 - transitionRatio * 0.4);
}
function calculatePatternScore(matchedPatterns, unmatchedElements, noveltyScore, consistencyScore, _minConfidence) {
  const avgConfidence = matchedPatterns.length > 0 ? matchedPatterns.reduce((sum, p) => sum + p.confidence, 0) / matchedPatterns.length : 0.5;
  const highRiskCount = unmatchedElements.filter((u) => u.riskLevel === "high").length;
  const mediumRiskCount = unmatchedElements.filter((u) => u.riskLevel === "medium").length;
  const riskPenalty = highRiskCount * 0.15 + mediumRiskCount * 0.05;
  let score = avgConfidence * 0.4 + noveltyScore * 0.2 + consistencyScore * 0.2 + (1 - riskPenalty) * 0.2;
  if (matchedPatterns.length < 3) {
    score *= 0.8;
  }
  return Math.max(0, Math.min(1, score));
}
function generatePatternReasoning(result) {
  const reasons = [];
  const patternCount = result.matchedPatterns.length;
  if (patternCount === 0) {
    reasons.push("No recognized patterns found");
  } else if (patternCount < 5) {
    reasons.push(`${patternCount} patterns matched (low coverage)`);
  } else {
    reasons.push(`${patternCount} patterns matched`);
  }
  const llkbCount = result.matchedPatterns.filter((p) => p.source === "llkb").length;
  if (llkbCount > 0) {
    reasons.push(`${llkbCount} LLKB patterns used`);
  }
  const highRisk = result.unmatchedElements.filter((u) => u.riskLevel === "high");
  if (highRisk.length > 0) {
    reasons.push(`${highRisk.length} high-risk unmatched elements`);
  }
  if (result.consistencyScore < 0.7) {
    reasons.push("Pattern usage inconsistent");
  }
  return reasons.join("; ");
}
function getPatternCategories(matchedPatterns) {
  const categories = {
    navigation: 0,
    interaction: 0,
    assertion: 0,
    wait: 0,
    form: 0,
    authentication: 0,
    data: 0,
    utility: 0
  };
  for (const matched of matchedPatterns) {
    const pattern = BUILTIN_PATTERNS.find((p) => p.id === matched.patternId);
    if (pattern) {
      categories[pattern.category]++;
    }
  }
  return categories;
}
function hasMinimumPatterns(matchedPatterns, requirements) {
  const categories = getPatternCategories(matchedPatterns);
  for (const [category, minCount] of Object.entries(requirements)) {
    if (categories[category] < minCount) {
      return false;
    }
  }
  return true;
}
function getBuiltinPatterns() {
  return [...BUILTIN_PATTERNS];
}

// src/uncertainty/selector-analyzer.ts
var SELECTOR_PATTERNS = [
  // Test ID selectors (most stable)
  {
    strategy: "testId",
    pattern: /getByTestId\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    stabilityScore: 1,
    accessibilityBonus: 0
  },
  {
    strategy: "testId",
    pattern: /locator\s*\(\s*['"]\[data-testid=['"]?([^'"\]]+)['"]?\]['"]\s*\)/g,
    stabilityScore: 0.95,
    accessibilityBonus: 0
  },
  // Role selectors (stable + accessible)
  {
    strategy: "role",
    pattern: /getByRole\s*\(\s*['"]([^'"]+)['"](?:\s*,\s*\{[^}]*\})?\s*\)/g,
    stabilityScore: 0.9,
    accessibilityBonus: 0.2
  },
  // Label selectors (stable + accessible)
  {
    strategy: "label",
    pattern: /getByLabel\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    stabilityScore: 0.85,
    accessibilityBonus: 0.15
  },
  {
    strategy: "label",
    pattern: /getByLabelText\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    stabilityScore: 0.85,
    accessibilityBonus: 0.15
  },
  // Placeholder selectors (moderately stable)
  {
    strategy: "placeholder",
    pattern: /getByPlaceholder\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    stabilityScore: 0.75,
    accessibilityBonus: 0
  },
  // Text selectors (less stable due to content changes)
  {
    strategy: "text",
    pattern: /getByText\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    stabilityScore: 0.65,
    accessibilityBonus: 0.05
  },
  {
    strategy: "text",
    pattern: /getByText\s*\(\s*\/([^/]+)\/[a-z]*\s*\)/g,
    stabilityScore: 0.6,
    // Regex text is slightly less stable
    accessibilityBonus: 0.05
  },
  // Title selectors
  {
    strategy: "title",
    pattern: /getByTitle\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    stabilityScore: 0.7,
    accessibilityBonus: 0.1
  },
  // Alt text selectors
  {
    strategy: "altText",
    pattern: /getByAltText\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    stabilityScore: 0.75,
    accessibilityBonus: 0.15
  },
  // CSS selectors (fragile)
  {
    strategy: "css",
    pattern: /locator\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    stabilityScore: 0.5,
    accessibilityBonus: 0
  },
  // XPath selectors (most fragile)
  {
    strategy: "xpath",
    pattern: /locator\s*\(\s*['"]xpath=([^'"]+)['"]\s*\)/g,
    stabilityScore: 0.3,
    accessibilityBonus: 0
  },
  {
    strategy: "xpath",
    pattern: /locator\s*\(\s*['"]\/\/([^'"]+)['"]\s*\)/g,
    stabilityScore: 0.3,
    accessibilityBonus: 0
  },
  // nth selectors (order-dependent, fragile)
  {
    strategy: "nth",
    pattern: /\.nth\s*\(\s*(\d+)\s*\)/g,
    stabilityScore: 0.4,
    accessibilityBonus: 0
  },
  {
    strategy: "nth",
    pattern: /\.first\s*\(\s*\)/g,
    stabilityScore: 0.45,
    accessibilityBonus: 0
  },
  {
    strategy: "nth",
    pattern: /\.last\s*\(\s*\)/g,
    stabilityScore: 0.45,
    accessibilityBonus: 0
  },
  // Chained selectors
  {
    strategy: "chain",
    pattern: /locator\([^)]+\)\s*\.\s*locator\s*\(/g,
    stabilityScore: 0.55,
    accessibilityBonus: 0
  }
];
var FRAGILITY_INDICATORS = [
  { pattern: /\[class[*^$~|]?=['"][^'"]*['"]\]/i, reason: "Class-based selector (may change)" },
  { pattern: /\[id[*^$~|]?=['"][^'"]*['"]\]/i, reason: "ID-based selector (may be dynamic)" },
  { pattern: /:nth-child\(\d+\)/i, reason: "Position-based selector" },
  { pattern: /:nth-of-type\(\d+\)/i, reason: "Position-based selector" },
  { pattern: /\s>\s/g, reason: "Direct child combinator (structure-sensitive)" },
  { pattern: /\s+\s/g, reason: "Descendant combinator (structure-sensitive)" },
  { pattern: /\[style[*^$~|]?=/i, reason: "Style-based selector (highly volatile)" },
  { pattern: /\.btn-[a-z]+/i, reason: "Framework-specific class (may change)" },
  { pattern: /\.col-[a-z0-9-]+/i, reason: "Grid class (layout-dependent)" },
  { pattern: /auto-generated|generated-id|uuid|guid/i, reason: "Contains generated ID pattern" }
];
function analyzeSelectors(code) {
  const selectors = [];
  const strategyDistribution = {
    testId: 0,
    role: 0,
    text: 0,
    label: 0,
    placeholder: 0,
    title: 0,
    altText: 0,
    css: 0,
    xpath: 0,
    nth: 0,
    chain: 0
  };
  for (const selectorPattern of SELECTOR_PATTERNS) {
    const regex = new RegExp(selectorPattern.pattern.source, "g");
    let match;
    while ((match = regex.exec(code)) !== null) {
      const selector = match[0];
      const lineNum = code.substring(0, match.index).split("\n").length;
      const fragilityReasons = analyzeSelectorFragility(selector);
      const isFragile = fragilityReasons.length > 0;
      const specificity = calculateSpecificity(selector, selectorPattern.strategy);
      let stabilityScore2 = selectorPattern.stabilityScore;
      if (isFragile) {
        stabilityScore2 *= 1 - fragilityReasons.length * 0.1;
      }
      selectors.push({
        selector,
        strategy: selectorPattern.strategy,
        stabilityScore: Math.max(0, stabilityScore2),
        specificity,
        hasTestId: selectorPattern.strategy === "testId",
        usesRole: selectorPattern.strategy === "role",
        isFragile,
        fragilityReasons,
        line: lineNum
      });
      strategyDistribution[selectorPattern.strategy]++;
    }
  }
  const stabilityScore = calculateOverallStability(selectors);
  const accessibilityScore = calculateAccessibilityScore(selectors);
  const recommendations = generateRecommendations(selectors);
  const overallScore = calculateSelectorScore(
    selectors,
    stabilityScore,
    accessibilityScore,
    strategyDistribution
  );
  return {
    score: overallScore,
    selectors,
    strategyDistribution,
    stabilityScore,
    accessibilityScore,
    recommendations
  };
}
function createSelectorDimensionScore(result) {
  const subScores = [
    {
      name: "Stability",
      score: result.stabilityScore,
      details: `Stability: ${Math.round(result.stabilityScore * 100)}%`
    },
    {
      name: "Accessibility",
      score: result.accessibilityScore,
      details: `A11y: ${Math.round(result.accessibilityScore * 100)}%`
    },
    {
      name: "TestId Usage",
      score: calculateTestIdRatio(result.strategyDistribution),
      details: `TestId: ${result.strategyDistribution.testId} selectors`
    },
    {
      name: "Fragility",
      score: calculateFragilityScore(result.selectors),
      details: `${result.selectors.filter((s) => s.isFragile).length} fragile selectors`
    }
  ];
  const reasoning = generateSelectorReasoning(result);
  return {
    dimension: "selector",
    score: result.score,
    weight: 0.3,
    reasoning,
    subScores
  };
}
function analyzeSelectorFragility(selector) {
  const reasons = [];
  for (const indicator of FRAGILITY_INDICATORS) {
    if (indicator.pattern.test(selector)) {
      reasons.push(indicator.reason);
    }
  }
  if (selector.length > 100) {
    reasons.push("Very long selector (likely over-specified)");
  }
  const combinatorCount = (selector.match(/[>\s+~]/g) || []).length;
  if (combinatorCount > 3) {
    reasons.push("Too many combinators (deep nesting)");
  }
  return reasons;
}
function calculateSpecificity(selector, strategy) {
  switch (strategy) {
    case "testId":
      return 1;
    // Most specific and intentional
    case "role":
      return 0.9;
    // Very specific
    case "label":
    case "altText":
      return 0.85;
    case "placeholder":
    case "title":
      return 0.8;
    case "text":
      return 0.7;
    case "css":
      const idCount = (selector.match(/#/g) || []).length;
      const classCount = (selector.match(/\./g) || []).length;
      return Math.min(1, 0.3 + idCount * 0.3 + classCount * 0.1);
    case "xpath":
      return 0.4;
    // XPath is usually less specific
    case "nth":
      return 0.3;
    // Position-based is not semantic
    case "chain":
      return 0.5;
    // Depends on the chain
    default:
      return 0.5;
  }
}
function calculateOverallStability(selectors) {
  if (selectors.length === 0) return 0.5;
  const totalStability = selectors.reduce((sum, s) => sum + s.stabilityScore, 0);
  return totalStability / selectors.length;
}
function calculateAccessibilityScore(selectors) {
  if (selectors.length === 0) return 0.5;
  const accessibleStrategies = ["role", "label", "altText", "title"];
  const accessibleCount = selectors.filter(
    (s) => accessibleStrategies.includes(s.strategy)
  ).length;
  return accessibleCount / selectors.length;
}
function calculateTestIdRatio(distribution) {
  const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);
  if (total === 0) return 0;
  return distribution.testId / total;
}
function calculateFragilityScore(selectors) {
  if (selectors.length === 0) return 1;
  const fragileCount = selectors.filter((s) => s.isFragile).length;
  return 1 - fragileCount / selectors.length;
}
function calculateSelectorScore(selectors, stabilityScore, accessibilityScore, distribution) {
  if (selectors.length === 0) return 0.5;
  const weights = {
    stability: 0.4,
    accessibility: 0.2,
    testIdUsage: 0.25,
    fragility: 0.15
  };
  const testIdRatio = calculateTestIdRatio(distribution);
  const fragilityScore = calculateFragilityScore(selectors);
  let score = stabilityScore * weights.stability + accessibilityScore * weights.accessibility + testIdRatio * weights.testIdUsage + fragilityScore * weights.fragility;
  const fragileStrategyCount = distribution.css + distribution.xpath + distribution.nth;
  const total = Object.values(distribution).reduce((sum, c) => sum + c, 0);
  if (total > 0 && fragileStrategyCount / total > 0.5) {
    score *= 0.8;
  }
  return Math.max(0, Math.min(1, score));
}
function generateRecommendations(selectors) {
  const recommendations = [];
  for (const selector of selectors) {
    if (selector.strategy === "css" || selector.strategy === "xpath") {
      recommendations.push({
        selector: selector.selector,
        currentStrategy: selector.strategy,
        suggestedStrategy: "testId",
        reason: "CSS/XPath selectors are fragile. Add data-testid to element.",
        priority: "high"
      });
    }
    if (selector.strategy === "nth") {
      recommendations.push({
        selector: selector.selector,
        currentStrategy: selector.strategy,
        suggestedStrategy: "role",
        reason: "Position-based selectors break when order changes. Use role with name.",
        priority: "medium"
      });
    }
    if (selector.isFragile && selector.strategy !== "testId") {
      recommendations.push({
        selector: selector.selector,
        currentStrategy: selector.strategy,
        suggestedStrategy: "testId",
        reason: `Fragile selector: ${selector.fragilityReasons.join(", ")}`,
        priority: "high"
      });
    }
    if (selector.strategy === "text" && !selector.usesRole) {
      recommendations.push({
        selector: selector.selector,
        currentStrategy: selector.strategy,
        suggestedStrategy: "role",
        reason: "Text selectors break on content changes. Use role for stability.",
        priority: "low"
      });
    }
  }
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  return recommendations.slice(0, 10);
}
function generateSelectorReasoning(result) {
  const reasons = [];
  if (result.selectors.length === 0) {
    return "No selectors found in code";
  }
  const totalSelectors = result.selectors.length;
  const testIdCount = result.strategyDistribution.testId;
  const roleCount = result.strategyDistribution.role;
  const fragileCount = result.strategyDistribution.css + result.strategyDistribution.xpath + result.strategyDistribution.nth;
  if (testIdCount > totalSelectors * 0.5) {
    reasons.push("Good test-id coverage");
  } else if (testIdCount < totalSelectors * 0.2) {
    reasons.push("Low test-id usage");
  }
  if (roleCount > 0) {
    reasons.push(`${roleCount} role-based selectors (accessible)`);
  }
  if (fragileCount > totalSelectors * 0.3) {
    reasons.push(`${fragileCount} fragile selectors (CSS/XPath/nth)`);
  }
  const fragileSelectors = result.selectors.filter((s) => s.isFragile);
  if (fragileSelectors.length > 0) {
    reasons.push(`${fragileSelectors.length} selectors with fragility issues`);
  }
  if (result.stabilityScore > 0.8) {
    reasons.push("High stability");
  } else if (result.stabilityScore < 0.5) {
    reasons.push("Low stability");
  }
  return reasons.join("; ");
}
function usesRecommendedSelectors(code) {
  const hasTestId2 = /getByTestId|data-testid/.test(code);
  const hasRole = /getByRole/.test(code);
  return hasTestId2 || hasRole;
}
function identifyStrategy(selectorCode) {
  for (const pattern of SELECTOR_PATTERNS) {
    if (new RegExp(pattern.pattern.source).test(selectorCode)) {
      return pattern.strategy;
    }
  }
  return "css";
}
function isSelectorFragile(selector) {
  return analyzeSelectorFragility(selector).length > 0;
}

// src/uncertainty/confidence-scorer.ts
async function calculateConfidence2(code, options) {
  const {
    config,
    // Note: llmClient and costTracker are available in options for future multi-sample LLM calls
    customPatterns,
    llkbPatterns
  } = options;
  const weights = config.weights ? {
    syntax: config.weights.syntax,
    pattern: config.weights.pattern,
    selector: config.weights.selector,
    agreement: config.weights.agreement
  } : DEFAULT_DIMENSION_WEIGHTS;
  const thresholds = config.thresholds ? {
    overall: config.thresholds.autoAccept,
    perDimension: {
      syntax: config.thresholds.minimumPerDimension,
      pattern: config.thresholds.minimumPerDimension,
      selector: config.thresholds.minimumPerDimension,
      agreement: config.thresholds.minimumPerDimension
    },
    blockOnAnyBelow: config.thresholds.block
  } : DEFAULT_THRESHOLDS;
  const dimensions = [];
  const syntaxResult = validateSyntax2(code);
  const syntaxScore = createSyntaxDimensionScore(syntaxResult);
  syntaxScore.weight = weights.syntax;
  dimensions.push(syntaxScore);
  const patternResult = matchPatterns(code, {
    customPatterns,
    llkbPatterns,
    includeBuiltins: true
  });
  const patternScore = createPatternDimensionScore(patternResult);
  patternScore.weight = weights.pattern;
  dimensions.push(patternScore);
  const selectorResult = analyzeSelectors(code);
  const selectorScore = createSelectorDimensionScore(selectorResult);
  selectorScore.weight = weights.selector;
  dimensions.push(selectorScore);
  if (config.sampling?.enabled && config.sampling.sampleCount > 1) {
    throw new Error(
      "[confidence-scorer] Multi-sampling is enabled (sampleCount=" + config.sampling.sampleCount + ") but calculateConfidence() only accepts single code. Use calculateConfidenceWithSamples() with pre-generated samples for agreement scoring."
    );
  }
  const overall = calculateOverallScore(dimensions);
  const { verdict, blockedDimensions } = determineVerdict(dimensions, thresholds);
  const diagnostics = createDiagnostics2(dimensions);
  return {
    overall,
    dimensions,
    threshold: thresholds,
    verdict,
    blockedDimensions,
    diagnostics
  };
}
async function calculateConfidenceWithSamples(samples, options) {
  if (samples.length === 0) {
    throw new Error("At least one sample is required");
  }
  if (samples.length === 1) {
    const sample = samples[0];
    return calculateConfidence2(sample.code, options);
  }
  const { config, customPatterns, llkbPatterns } = options;
  const weights = config.weights ? {
    syntax: config.weights.syntax,
    pattern: config.weights.pattern,
    selector: config.weights.selector,
    agreement: config.weights.agreement
  } : DEFAULT_DIMENSION_WEIGHTS;
  const thresholds = config.thresholds ? {
    overall: config.thresholds.autoAccept,
    perDimension: {
      syntax: config.thresholds.minimumPerDimension,
      pattern: config.thresholds.minimumPerDimension,
      selector: config.thresholds.minimumPerDimension,
      agreement: config.thresholds.minimumPerDimension
    },
    blockOnAnyBelow: config.thresholds.block
  } : DEFAULT_THRESHOLDS;
  const sampleScores = samples.map((sample) => ({
    sample,
    syntax: validateSyntax2(sample.code),
    patterns: matchPatterns(sample.code, { customPatterns, llkbPatterns }),
    selectors: analyzeSelectors(sample.code)
  }));
  const syntaxScores = sampleScores.map((s) => s.syntax.score).sort((a, b) => a - b);
  const patternScores = sampleScores.map((s) => s.patterns.score).sort((a, b) => a - b);
  const selectorScores = sampleScores.map((s) => s.selectors.score).sort((a, b) => a - b);
  const medianIndex = Math.floor(samples.length / 2);
  const dimensions = [
    {
      dimension: "syntax",
      score: syntaxScores[medianIndex] ?? 0,
      weight: weights.syntax,
      reasoning: `Median of ${samples.length} samples`,
      subScores: []
    },
    {
      dimension: "pattern",
      score: patternScores[medianIndex] ?? 0,
      weight: weights.pattern,
      reasoning: `Median of ${samples.length} samples`,
      subScores: []
    },
    {
      dimension: "selector",
      score: selectorScores[medianIndex] ?? 0,
      weight: weights.selector,
      reasoning: `Median of ${samples.length} samples`,
      subScores: []
    }
  ];
  const agreementResult = analyzeAgreement(samples.map((s) => s.code));
  const agreementScore = {
    dimension: "agreement",
    score: agreementResult.score,
    weight: weights.agreement,
    reasoning: `Agreement across ${samples.length} samples`,
    subScores: [
      { name: "Structural", score: agreementResult.structuralAgreement },
      { name: "Selector", score: agreementResult.selectorAgreement },
      { name: "Flow", score: agreementResult.flowAgreement },
      { name: "Assertion", score: agreementResult.assertionAgreement }
    ]
  };
  dimensions.push(agreementScore);
  const overall = calculateOverallScore(dimensions);
  const { verdict, blockedDimensions } = determineVerdict(dimensions, thresholds);
  const diagnostics = createDiagnostics2(dimensions);
  return {
    overall,
    dimensions,
    threshold: thresholds,
    verdict,
    blockedDimensions,
    diagnostics
  };
}
function analyzeAgreement(codes) {
  if (codes.length < 2) {
    return {
      score: 1,
      sampleCount: codes.length,
      structuralAgreement: 1,
      selectorAgreement: 1,
      flowAgreement: 1,
      assertionAgreement: 1,
      disagreementAreas: []
    };
  }
  const features = codes.map((code) => extractCodeFeatures(code));
  const structuralAgreement = calculateStructuralAgreement(features);
  const selectorAgreement = calculateSelectorAgreement(features);
  const flowAgreement = calculateFlowAgreement(features);
  const assertionAgreement = calculateAssertionAgreement(features);
  const disagreementAreas = findDisagreementAreas(features);
  const score = structuralAgreement * 0.3 + selectorAgreement * 0.3 + flowAgreement * 0.2 + assertionAgreement * 0.2;
  const consensusCode = selectConsensusCode(codes, features);
  return {
    score,
    sampleCount: codes.length,
    structuralAgreement,
    selectorAgreement,
    flowAgreement,
    assertionAgreement,
    consensusCode,
    disagreementAreas
  };
}
function extractCodeFeatures(code) {
  return {
    testCount: (code.match(/test\s*\(/g) || []).length,
    stepCount: (code.match(/test\.step\s*\(/g) || []).length,
    selectorStrategies: extractSelectorStrategies(code),
    assertions: extractAssertions(code),
    flowStructure: extractFlowStructure(code)
  };
}
function extractSelectorStrategies(code) {
  const strategies = [];
  if (/getByTestId/.test(code)) strategies.push("testId");
  if (/getByRole/.test(code)) strategies.push("role");
  if (/getByText/.test(code)) strategies.push("text");
  if (/getByLabel/.test(code)) strategies.push("label");
  if (/locator\(/.test(code)) strategies.push("css");
  return strategies;
}
function extractAssertions(code) {
  const assertions = [];
  const assertionMatches = code.match(/expect\([^)]+\)\.\w+/g) || [];
  for (const match of assertionMatches) {
    const method = match.match(/\.(\w+)$/)?.[1] || "";
    if (method) assertions.push(method);
  }
  return assertions;
}
function extractFlowStructure(code) {
  const actions = [];
  if (/page\.goto/.test(code)) actions.push("navigate");
  if (/\.click/.test(code)) actions.push("click");
  if (/\.fill/.test(code)) actions.push("fill");
  if (/\.selectOption/.test(code)) actions.push("select");
  if (/waitFor/.test(code)) actions.push("wait");
  if (/expect\(/.test(code)) actions.push("assert");
  return actions.join("->");
}
function calculateStructuralAgreement(features) {
  if (features.length < 2) return 1;
  const testCounts = features.map((f) => f.testCount);
  const testCountAgreement = calculateValueAgreement(testCounts);
  const stepCounts = features.map((f) => f.stepCount);
  const stepCountAgreement = calculateValueAgreement(stepCounts);
  return (testCountAgreement + stepCountAgreement) / 2;
}
function calculateSelectorAgreement(features) {
  if (features.length < 2) return 1;
  let totalSimilarity = 0;
  let comparisons = 0;
  for (let i = 0; i < features.length; i++) {
    for (let j = i + 1; j < features.length; j++) {
      const featureI = features[i];
      const featureJ = features[j];
      if (featureI && featureJ) {
        const set1 = new Set(featureI.selectorStrategies);
        const set2 = new Set(featureJ.selectorStrategies);
        totalSimilarity += jaccardSimilarity(set1, set2);
        comparisons++;
      }
    }
  }
  return comparisons > 0 ? totalSimilarity / comparisons : 1;
}
function calculateFlowAgreement(features) {
  if (features.length < 2) return 1;
  const flows = features.map((f) => f.flowStructure);
  const uniqueFlows = new Set(flows);
  if (uniqueFlows.size === 1) return 1;
  const flowCounts = /* @__PURE__ */ new Map();
  for (const flow of flows) {
    flowCounts.set(flow, (flowCounts.get(flow) || 0) + 1);
  }
  const maxCount = Math.max(...flowCounts.values());
  return maxCount / flows.length;
}
function calculateAssertionAgreement(features) {
  if (features.length < 2) return 1;
  let totalSimilarity = 0;
  let comparisons = 0;
  for (let i = 0; i < features.length; i++) {
    for (let j = i + 1; j < features.length; j++) {
      const featureI = features[i];
      const featureJ = features[j];
      if (featureI && featureJ) {
        const set1 = new Set(featureI.assertions);
        const set2 = new Set(featureJ.assertions);
        totalSimilarity += jaccardSimilarity(set1, set2);
        comparisons++;
      }
    }
  }
  return comparisons > 0 ? totalSimilarity / comparisons : 1;
}
function calculateValueAgreement(values) {
  if (values.length < 2) return 1;
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === 0) return 1;
  return min / max;
}
function jaccardSimilarity(set1, set2) {
  if (set1.size === 0 && set2.size === 0) return 1;
  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = /* @__PURE__ */ new Set([...set1, ...set2]);
  return intersection.size / union.size;
}
function findDisagreementAreas(features) {
  const areas = [];
  const allStrategies = features.map((f) => f.selectorStrategies.join(","));
  if (new Set(allStrategies).size > 1) {
    const voteCounts = {};
    for (const s of allStrategies) {
      voteCounts[s] = (voteCounts[s] || 0) + 1;
    }
    const voteValues = Object.values(voteCounts);
    areas.push({
      area: "Selector Strategies",
      variants: [...new Set(allStrategies)],
      voteCounts,
      confidence: voteValues.length > 0 ? Math.max(...voteValues) / features.length : 0
    });
  }
  const flows = features.map((f) => f.flowStructure);
  if (new Set(flows).size > 1) {
    const voteCounts = {};
    for (const f of flows) {
      voteCounts[f] = (voteCounts[f] || 0) + 1;
    }
    const voteValues = Object.values(voteCounts);
    areas.push({
      area: "Test Flow",
      variants: [...new Set(flows)],
      voteCounts,
      confidence: voteValues.length > 0 ? Math.max(...voteValues) / features.length : 0
    });
  }
  return areas;
}
function selectConsensusCode(codes, features) {
  const structures = features.map((f) => JSON.stringify({
    testCount: f.testCount,
    stepCount: f.stepCount,
    flow: f.flowStructure
  }));
  const structureCounts = /* @__PURE__ */ new Map();
  for (const s of structures) {
    structureCounts.set(s, (structureCounts.get(s) || 0) + 1);
  }
  let maxCount = 0;
  let consensusStructure = structures[0] || "";
  for (const [structure, count] of structureCounts) {
    if (count > maxCount) {
      maxCount = count;
      consensusStructure = structure;
    }
  }
  const index = structures.indexOf(consensusStructure);
  return codes[index] || codes[0] || "";
}
function calculateOverallScore(dimensions) {
  let weightedSum = 0;
  let totalWeight = 0;
  for (const dim of dimensions) {
    weightedSum += dim.score * dim.weight;
    totalWeight += dim.weight;
  }
  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}
function determineVerdict(dimensions, thresholds) {
  const blockedDimensions = [];
  for (const dim of dimensions) {
    const dimThreshold = thresholds.perDimension[dim.dimension];
    if (dim.score < thresholds.blockOnAnyBelow || dim.score < dimThreshold) {
      blockedDimensions.push(dim.dimension);
    }
  }
  if (blockedDimensions.length > 0) {
    return { verdict: "REJECT", blockedDimensions };
  }
  const overall = calculateOverallScore(dimensions);
  if (overall >= thresholds.overall) {
    return { verdict: "ACCEPT", blockedDimensions: [] };
  }
  return { verdict: "REVIEW", blockedDimensions: [] };
}
function createDiagnostics2(dimensions) {
  const sorted = [...dimensions].sort((a, b) => a.score - b.score);
  const lowest = sorted[0];
  const highest = sorted[sorted.length - 1];
  const suggestions = [];
  for (const dim of dimensions) {
    if (dim.score < 0.7) {
      suggestions.push(...generateSuggestions(dim));
    }
  }
  const riskAreas = [];
  for (const dim of dimensions) {
    if (dim.score < 0.5) {
      riskAreas.push(`Low ${dim.dimension} score (${Math.round(dim.score * 100)}%)`);
    }
  }
  return {
    lowestDimension: lowest ? {
      name: lowest.dimension,
      score: lowest.score
    } : { name: "syntax", score: 0 },
    highestDimension: highest ? {
      name: highest.dimension,
      score: highest.score
    } : { name: "syntax", score: 0 },
    improvementSuggestions: suggestions.slice(0, 5),
    riskAreas
  };
}
function generateSuggestions(dim) {
  switch (dim.dimension) {
    case "syntax":
      return [
        "Fix TypeScript compilation errors",
        "Use proper Playwright imports",
        "Ensure all brackets are balanced"
      ];
    case "pattern":
      return [
        "Use recognized Playwright patterns",
        "Follow established test structure",
        "Add test.step() for better organization"
      ];
    case "selector":
      return [
        "Use data-testid attributes for stability",
        "Prefer getByRole for accessibility",
        "Avoid CSS selectors with class names"
      ];
    case "agreement":
      return [
        "Increase sample count for better consensus",
        "Review disagreement areas manually"
      ];
    default:
      return [];
  }
}
function quickConfidenceCheck(code, dimension) {
  switch (dimension) {
    case "syntax":
      return validateSyntax2(code).score;
    case "pattern":
      return matchPatterns(code).score;
    case "selector":
      return analyzeSelectors(code).score;
    case "agreement":
      return 0.7;
  }
}
function passesMinimumConfidence(code, minOverall = 0.7, minPerDimension = 0.4) {
  const syntaxScore = validateSyntax2(code).score;
  if (syntaxScore < minPerDimension) return false;
  const patternScore = matchPatterns(code).score;
  if (patternScore < minPerDimension) return false;
  const selectorScore = analyzeSelectors(code).score;
  if (selectorScore < minPerDimension) return false;
  const overall = (syntaxScore + patternScore + selectorScore) / 3;
  return overall >= minOverall;
}
function getBlockingIssues(code) {
  const issues = [];
  const syntax = validateSyntax2(code);
  if (syntax.errors.length > 0) {
    issues.push(`${syntax.errors.length} syntax error(s)`);
  }
  const selectors = analyzeSelectors(code);
  const fragileCount = selectors.selectors.filter((s) => s.isFragile).length;
  if (fragileCount > selectors.selectors.length * 0.5) {
    issues.push(`${fragileCount} fragile selector(s)`);
  }
  return issues;
}

// src/uncertainty/multi-sampler.ts
init_paths();
var DEFAULT_MULTI_SAMPLER_CONFIG = {
  sampleCount: 3,
  temperatures: [0.2, 0.5, 0.8],
  minAgreementScore: 0.7,
  persistSamples: true
};
function extractStructure(code) {
  const lines = code.split("\n");
  const imports = [];
  const testBlocks = [];
  const assertions = [];
  const selectors = [];
  const actions = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("import ")) {
      imports.push(trimmed);
    }
    if (trimmed.match(/^(test|it|describe)\s*\(/)) {
      const nameMatch = trimmed.match(/['"]([^'"]+)['"]/);
      if (nameMatch && nameMatch[1]) {
        testBlocks.push(nameMatch[1]);
      }
    }
    if (trimmed.includes("expect(") || trimmed.includes(".should")) {
      const assertMatch = trimmed.match(/expect\(([^)]+)\)|\.should\(([^)]+)\)/);
      if (assertMatch) {
        assertions.push(assertMatch[0]);
      }
    }
    const selectorMatches = trimmed.matchAll(/(?:locator|getBy\w+)\(['"]([^'"]+)['"]\)/g);
    for (const match of selectorMatches) {
      if (match[1]) {
        selectors.push(match[1]);
      }
    }
    if (trimmed.match(/\.(click|fill|type|press|check|uncheck|select|hover)\(/)) {
      actions.push(trimmed.substring(0, 100));
    }
  }
  return { imports, testBlocks, assertions, selectors, actions };
}
function arraySimilarity(a, b) {
  if (a.length === 0 && b.length === 0) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = [...setA].filter((x) => setB.has(x)).length;
  const union = (/* @__PURE__ */ new Set([...setA, ...setB])).size;
  return intersection / union;
}
function calculateStructuralAgreement2(struct1, struct2) {
  const weights = {
    imports: 0.1,
    testBlocks: 0.2,
    assertions: 0.3,
    selectors: 0.25,
    actions: 0.15
  };
  let score = 0;
  score += weights.imports * arraySimilarity(struct1.imports, struct2.imports);
  score += weights.testBlocks * arraySimilarity(struct1.testBlocks, struct2.testBlocks);
  score += weights.assertions * arraySimilarity(struct1.assertions, struct2.assertions);
  score += weights.selectors * arraySimilarity(struct1.selectors, struct2.selectors);
  score += weights.actions * arraySimilarity(struct1.actions, struct2.actions);
  return score;
}
function findDisagreements(structures) {
  const areas = [];
  const allSelectors = structures.flatMap((s) => s.selectors);
  const selectorCounts = /* @__PURE__ */ new Map();
  for (const sel of allSelectors) {
    selectorCounts.set(sel, (selectorCounts.get(sel) || 0) + 1);
  }
  const uniqueSelectors = [...selectorCounts.entries()].filter(([, count]) => count < structures.length).map(([sel]) => sel);
  if (uniqueSelectors.length > 0) {
    const voteCounts = {};
    for (const [sel, count] of selectorCounts) {
      voteCounts[sel] = count;
    }
    areas.push({
      area: "selectors",
      variants: uniqueSelectors,
      voteCounts,
      confidence: selectorCounts.size > 0 ? Math.max(...selectorCounts.values()) / structures.length : 0
    });
  }
  const allAssertions = structures.flatMap((s) => s.assertions);
  const assertionCounts = /* @__PURE__ */ new Map();
  for (const a of allAssertions) {
    assertionCounts.set(a, (assertionCounts.get(a) || 0) + 1);
  }
  const uniqueAssertions = [...assertionCounts.entries()].filter(([, count]) => count < structures.length).map(([a]) => a);
  if (uniqueAssertions.length > 0) {
    const voteCounts = {};
    for (const [a, count] of assertionCounts) {
      voteCounts[a] = count;
    }
    areas.push({
      area: "assertions",
      variants: uniqueAssertions,
      voteCounts,
      confidence: assertionCounts.size > 0 ? Math.max(...assertionCounts.values()) / structures.length : 0
    });
  }
  return areas;
}
function analyzeAgreement2(samples) {
  if (samples.length === 0) {
    return {
      score: 0,
      sampleCount: 0,
      structuralAgreement: 0,
      selectorAgreement: 0,
      flowAgreement: 0,
      assertionAgreement: 0,
      disagreementAreas: []
    };
  }
  if (samples.length === 1) {
    return {
      score: 1,
      // Single sample has perfect agreement with itself
      sampleCount: 1,
      structuralAgreement: 1,
      selectorAgreement: 1,
      flowAgreement: 1,
      assertionAgreement: 1,
      consensusCode: samples[0]?.code || "",
      disagreementAreas: []
    };
  }
  const structures = samples.map((s) => extractStructure(s.code));
  let totalStructural = 0;
  let totalSelector = 0;
  let totalAssertion = 0;
  let pairCount = 0;
  for (let i = 0; i < structures.length; i++) {
    for (let j = i + 1; j < structures.length; j++) {
      const structI = structures[i];
      const structJ = structures[j];
      if (structI && structJ) {
        totalStructural += calculateStructuralAgreement2(structI, structJ);
        totalSelector += arraySimilarity(structI.selectors, structJ.selectors);
        totalAssertion += arraySimilarity(structI.assertions, structJ.assertions);
        pairCount++;
      }
    }
  }
  const structuralAgreement = totalStructural / pairCount;
  const selectorAgreement = totalSelector / pairCount;
  const assertionAgreement = totalAssertion / pairCount;
  let totalFlow = 0;
  for (let i = 0; i < structures.length; i++) {
    for (let j = i + 1; j < structures.length; j++) {
      const structI = structures[i];
      const structJ = structures[j];
      if (structI && structJ) {
        totalFlow += arraySimilarity(structI.actions, structJ.actions);
      }
    }
  }
  const flowAgreement = pairCount > 0 ? totalFlow / pairCount : 1;
  const score = structuralAgreement * 0.3 + selectorAgreement * 0.3 + assertionAgreement * 0.25 + flowAgreement * 0.15;
  const disagreementAreas = findDisagreements(structures);
  let bestSampleIndex = 0;
  let bestAvgAgreement = 0;
  for (let i = 0; i < samples.length; i++) {
    let avgAgreement = 0;
    for (let j = 0; j < samples.length; j++) {
      if (i !== j) {
        const structI = structures[i];
        const structJ = structures[j];
        if (structI && structJ) {
          avgAgreement += calculateStructuralAgreement2(structI, structJ);
        }
      }
    }
    avgAgreement /= samples.length - 1;
    if (avgAgreement > bestAvgAgreement) {
      bestAvgAgreement = avgAgreement;
      bestSampleIndex = i;
    }
  }
  return {
    score,
    sampleCount: samples.length,
    structuralAgreement,
    selectorAgreement,
    flowAgreement,
    assertionAgreement,
    consensusCode: samples[bestSampleIndex]?.code || "",
    disagreementAreas
  };
}
async function generateMultipleSamples(request, generator) {
  const { prompt, journeyId, config } = request;
  const samples = [];
  const totalTokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCostUsd: 0 };
  for (let i = 0; i < config.sampleCount; i++) {
    const temperature = config.temperatures[i] ?? 0.5;
    try {
      const result = await generator.generate(prompt, temperature);
      samples.push({
        id: `sample-${i}-t${temperature}`,
        code: result.code,
        temperature,
        tokenUsage: result.tokenUsage
      });
      totalTokenUsage.promptTokens += result.tokenUsage.promptTokens;
      totalTokenUsage.completionTokens += result.tokenUsage.completionTokens;
      totalTokenUsage.totalTokens += result.tokenUsage.totalTokens;
    } catch (error) {
      console.warn(`Sample ${i} generation failed:`, error);
    }
  }
  const agreement = analyzeAgreement2(samples);
  const bestSampleIndex = samples.findIndex((s) => s.code === agreement.consensusCode);
  const bestSample = (bestSampleIndex >= 0 ? samples[bestSampleIndex] : samples[0]) || samples[0];
  let samplesDir;
  if (config.persistSamples && samples.length > 0) {
    await ensureAutogenDir();
    samplesDir = getAutogenArtifact("samples");
    mkdirSync(samplesDir, { recursive: true });
    for (let i = 0; i < samples.length; i++) {
      const sample = samples[i];
      if (!sample) continue;
      const samplePath = join(samplesDir, `${journeyId}-sample-${i}.ts`);
      writeFileSync(samplePath, sample.code, "utf-8");
    }
    const agreementPath = getAutogenArtifact("agreement");
    writeFileSync(agreementPath, JSON.stringify({
      journeyId,
      agreement,
      samples: samples.map((s) => ({
        id: s.id,
        temperature: s.temperature,
        tokenUsage: s.tokenUsage
      })),
      totalTokenUsage,
      generatedAt: (/* @__PURE__ */ new Date()).toISOString()
    }, null, 2), "utf-8");
  }
  return {
    samples,
    agreement,
    bestSample: bestSample ?? samples[0],
    totalTokenUsage,
    samplesDir
  };
}
function loadSamples(journeyId) {
  const samplesDir = getAutogenArtifact("samples");
  const agreementPath = getAutogenArtifact("agreement");
  if (!existsSync(agreementPath)) {
    return null;
  }
  try {
    const agreementData = JSON.parse(readFileSync(agreementPath, "utf-8"));
    if (agreementData.journeyId !== journeyId) {
      return null;
    }
    const samples = [];
    for (let i = 0; ; i++) {
      const samplePath = join(samplesDir, `${journeyId}-sample-${i}.ts`);
      if (!existsSync(samplePath)) break;
      const code = readFileSync(samplePath, "utf-8");
      const meta = agreementData.samples?.[i] || { id: `sample-${i}`, temperature: 0.5 };
      samples.push({
        id: meta.id || `sample-${i}`,
        code,
        temperature: meta.temperature ?? 0.5,
        tokenUsage: meta.tokenUsage
      });
    }
    return samples.length > 0 ? samples : null;
  } catch {
    return null;
  }
}
function createOrchestratorSampleRequest(prompt, journeyId, config = DEFAULT_MULTI_SAMPLER_CONFIG) {
  return {
    prompt,
    journeyId,
    temperatures: config.temperatures,
    instructions: `
Generate ${config.sampleCount} different versions of the Playwright test code.
For each version, use a different "creative temperature":
${config.temperatures.map((t, i) => `- Version ${i + 1}: Temperature ${t} (${t < 0.3 ? "conservative" : t < 0.6 ? "balanced" : "creative"})`).join("\n")}

Save each version as a separate code block labeled with the version number.
The goal is to explore different approaches and identify areas of agreement/disagreement.

After generating all versions, provide a brief analysis:
1. What elements are consistent across all versions (high agreement)
2. What elements differ between versions (disagreement areas)
3. Which version you recommend as the best consensus

Minimum agreement score threshold: ${config.minAgreementScore}
`
  };
}
function processOrchestratorSamples(samples, _journeyId) {
  const codeSamples = samples.map((s, i) => ({
    id: `orchestrator-sample-${i}`,
    code: s.code,
    temperature: s.temperature
  }));
  const agreement = analyzeAgreement2(codeSamples);
  const bestSampleIndex = codeSamples.findIndex((s) => s.code === agreement.consensusCode);
  const bestSample = (bestSampleIndex >= 0 ? codeSamples[bestSampleIndex] : codeSamples[0]) ?? codeSamples[0];
  return {
    samples: codeSamples,
    agreement,
    bestSample,
    totalTokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCostUsd: 0 }
  };
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
      } catch (err3) {
        result.errors.push(`Failed to load config: ${err3 instanceof Error ? err3.message : String(err3)}`);
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

export { AutogenConfigSchema, BLOCK_END, BLOCK_ID_PATTERN, BLOCK_START, CSSDebtEntrySchema, CodedError, ComponentEntrySchema, ConfigLoadError, DEFAULT_HEALING_CONFIG, DEFAULT_HEALING_RULES, DEFAULT_SELECTOR_PRIORITY, ELEMENT_TYPE_STRATEGIES, EslintRulesSchema, EslintSeveritySchema, FORBIDDEN_PATTERNS, HINTS_SECTION_PATTERN, HINT_BLOCK_PATTERN, HINT_PATTERNS, HealSchema, HealingLogger, IR, JourneyBuilder, JourneyFrontmatterSchema, JourneyParseError, JourneyStatusSchema, LLKBIntegrationLevelSchema, LLKBIntegrationSchema, LocatorBuilder, NAMEABLE_ROLES, PATTERN_VERSION, PLAYWRIGHT_LINT_RULES, PageEntrySchema, PathsSchema, RegenerationStrategySchema, SelectorCatalogSchema, SelectorEntrySchema, SelectorPolicySchema, SelectorStrategySchema, StepBuilder, TAG_PATTERNS, UNHEALABLE_CATEGORIES, VALID_ROLES, VERSION, ValidationSchema, ValueBuilder, __test_checkFeature, addCleanupHook, addExactToLocator, addLocatorProperty, addMethod, addNamedImport, addNavigationWaitAfterClick, addRunIdVariable, addSelector, addTimeout, addToRegistry, aggregateHealingLogs, allPatterns, andThen, applyDataFix, applyNavigationFix, applySelectorFix, applyTimingFix, authPatterns, buildPlaywrightArgs, categorizeTags, checkPatterns, checkStability, checkTestSyntax, classifyError, classifyTestResult, classifyTestResults, cleanAutogenArtifacts, clearDebt, clearExtendedGlossary, clickPatterns, codedError, collect, compareARIASnapshots, compareLocators, completionSignalsToAssertions, containsCSSSelector, containsHints, convertToWebFirstAssertion, createCssSelector, createEmptyCatalog, createEvidenceDir, createHealingReport, createLocatorFromMatch, createProject, createRegistry, createValueFromText, defaultGlossary, describeLocator, describePrimitive, shared_exports as enhancementShared, ensureAutogenDir, err, escapeRegex, escapeSelector, escapeString, evaluateHealing, extendedAssertionPatterns, extendedClickPatterns, extendedFillPatterns, extendedNavigationPatterns, extendedSelectPatterns, extendedWaitPatterns, extractCSSSelector, extractClassStructure, extractErrorMessages, extractErrorStacks, extractHintValue, extractHints, extractManagedBlocks, extractModuleDefinition, extractName, extractNameFromSelector, extractTestDataPatterns, extractTestResults, extractTimeoutFromError, extractUrlFromError, extractUrlFromGoto, fillPatterns, filterBySeverity, findACReferences, findByComponent, findByPage, findByTestId, findClass, findConfigFile, findEntriesByScope, findEntry, findInSnapshot, findLabelAlias, findMatchingPatterns, findMethod, findModuleMethod, findProperty, findSelectorById, findTestSteps, findTestsByTag, findTestsByTitle, fixMissingAwait, fixMissingGotoAwait, focusPatterns, formatARIATree, formatHealingLog, formatTestResult, formatVerifySummary, generateARIACaptureCode, generateClassificationReport, generateCoverageReport, generateDebtMarkdown, generateDebtReport, generateESLintConfig, generateEvidenceCaptureCode, generateEvidenceReport, generateExpectedTags, generateFileHeader, generateIndexContent, generateJourneyTests, generateLabelLocator, generateLocatorFromHints, generateMarkdownSummary, generateMigrationPlan, generateModule, generateModuleCode, generateModuleFromIR, generateRoleLocator, generateRunId, generateStabilityReport, generateSummaryFromReport, generateTest, generateTestCode, generateTestFromIR, generateTestIdLocator, generateTextLocator, generateToHaveURL, generateValidationReport, generateVerifySummary, generateWaitForURL, getAllPatternNames, getAllTestIds, getApplicableRules, getArtkDir, getAutogenArtifact, getAutogenDir, getBrandingComment, getCSSDebt, getCatalog, getDefaultConfig, getFailedStep, getFailedTests, getFailureStats, getFlakinessScore, getFlakyTests, getGeneratedTimestamp, getGlossary, getGlossaryStats, getHarnessRoot, getHealableFailures, getHealingRecommendation, getImport, getLabelAliases, getLlkbRoot, getLocatorFromLabel, getMappingStats, getModuleMethods, getModuleNames, getNextFix, getPackageRoot, getPackageVersion, getPatternCountByCategory, getPatternMatches, getPatternMetadata, getPatternStats2 as getPatternStats, getPlaywrightVersion, getPostHealingRecommendation, getRecommendations, getRecommendedStrategies, getRegistryStats, getSchemaVersion, getSelectorPriority, getSummary, getSynonyms, getTemplatePath, getTemplatesDir, getTestCount, getViolationSummary, hasAutogenArtifacts, hasBehaviorHints, hasDataIsolation, hasErrorViolations, hasExtendedGlossary, hasFailures, hasImport, hasLintErrors, hasLocatorHints, hasModule, hasNavigationWait, hasTestId, hoverPatterns, inferBestSelector, inferButtonSelector, inferCheckboxSelector, inferElementType, inferHeadingSelector, inferInputSelector, inferLinkSelector, inferRole, inferRoleFromSelector, inferSelectorWithCatalog, inferSelectors, inferSelectorsWithCatalog, inferTabSelector, inferTestIdSelector, inferTextSelector, inferUrlPattern, initGlossary, initializeLlkb, injectManagedBlocks, insertNavigationWait, installAutogenInstance, isCategoryHealable, isCodeValid, isCssLocator, isESLintAvailable, isErr, isFixAllowed, isFixForbidden, isForbiddenSelector, isHealable, isJourneyReady, isLlkbAvailable, isOk, isPlaywrightAvailable, isPlaywrightPluginAvailable, isReportSuccessful, isRoleLocator, isSemanticLocator, isSynonymOf, isTestIdLocator, isTestStable, isValidRole, isVerificationPassed, isVersionSupported, lintCode, lintFile, loadCatalog, loadConfig, loadConfigWithMigration, loadConfigs, loadEvidence, loadExtendedGlossary, loadGlossary, loadHealingLog, loadLLKBConfig, loadRegistry, loadSourceFile, lookupCoreGlossary, lookupGlossary, map, mapAcceptanceCriterion, mapErr, mapProceduralStep, mapStepText, mapSteps, matchPattern, mergeConfigs, mergeGlossaries, mergeModuleFiles, mergeWithInferred, modalAlertPatterns, namespaceEmail, namespaceName, navigationPatterns, needsConfigMigration, needsMigration, normalizeJourney, normalizeStepText, ok, parseAndNormalize, parseBoolSafe, parseESLintOutput, parseEnumSafe, parseFloatSafe, parseHints, parseIndexFile, parseIntSafe, parseIntSafeAllowNegative, parseJourney, parseJourneyContent, parseJourneyForAutoGen, parseModuleHint, parseReportContent, parseReportFile, parseSelectorToLocator, parseStructuredSteps, parseTagsFromCode, parseTagsFromFrontmatter, parseWithValidator, partition, previewHealingFixes, quickScanTestIds, quickStabilityCheck, recordCSSDebt, refinement_exports as refinement, regenerateTestWithBlocks, removeDebt, removeFromRegistry, removeHints, removeSelector, replaceHardcodedEmail, replaceHardcodedTestData, reportHasFlaky, resetCatalogCache, resetGlossaryCache, resolveCanonical, resolveConfigPath, resolveModuleMethod, runHealingLoop, runJourneyTests, runPlaywrightAsync, runPlaywrightSync, runTestFile, saveCatalog, saveEvidence, saveRegistry, saveSummary, scanForTestIds, scanForbiddenPatterns, scanModulesDirectory, scanResultsToIssues, scoreLocator, scot_exports as scot, searchSelectors, selectBestLocator, selectPatterns, serializeJourney, serializePrimitive, serializeStep, shouldQuarantine, structuredPatterns, suggestImprovements, suggestReplacement, suggestSelector, suggestSelectorApproach, suggestTimeoutIncrease, summarizeJourney, summaryHasFlaky, thoroughStabilityCheck, toPlaywrightLocator, toastPatterns, tryCatch, tryCatchAsync, tryParseJourneyContent, uncertainty_exports as uncertainty, unwrap, unwrapOr, updateDebtPriority, updateIndexFile, updateModuleFile, upgradeAutogenInstance, urlPatterns, validateCatalog, validateCode, validateCodeCoverage, validateCodeSync, validateHints, validateIRCoverage, validateJourney, validateJourneyForCodeGen, validateJourneyFrontmatter, validateJourneySchema, validateJourneyStatus, validateJourneyTags, validateJourneyTier, validateJourneys, validateLocator, validateSyntax, validateTags, validateTagsInCode, verifyJourney, verifyJourneys, visibilityPatterns, waitPatterns, wouldFixApply, wrapInBlock, wrapWithExpectPoll, wrapWithExpectToPass, writeAndRunTest };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map