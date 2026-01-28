import { appendFileSync, existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { pathToFileURL } from 'url';
import { parse } from 'yaml';
import { z } from 'zod';

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
function getTelemetryPath(baseDir) {
  const dir = baseDir || process.cwd();
  return join(dir, DEFAULT_TELEMETRY_DIR, TELEMETRY_FILE);
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
    const { unlinkSync } = __require("fs");
    unlinkSync(telemetryPath);
  }
}
var DEFAULT_TELEMETRY_DIR, TELEMETRY_FILE;
var init_telemetry = __esm({
  "src/mapping/telemetry.ts"() {
    DEFAULT_TELEMETRY_DIR = ".artk";
    TELEMETRY_FILE = "blocked-steps-telemetry.jsonl";
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
  loadLearnedPatterns: () => loadLearnedPatterns,
  markPatternsPromoted: () => markPatternsPromoted,
  matchLlkbPattern: () => matchLlkbPattern,
  prunePatterns: () => prunePatterns,
  recordPatternFailure: () => recordPatternFailure,
  recordPatternSuccess: () => recordPatternSuccess,
  saveLearnedPatterns: () => saveLearnedPatterns
});
function getPatternsFilePath(llkbRoot) {
  const root = llkbRoot || join(process.cwd(), DEFAULT_LLKB_ROOT);
  return join(root, PATTERNS_FILE);
}
function generatePatternId() {
  return `LP${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
}
function loadLearnedPatterns(options = {}) {
  const filePath = getPatternsFilePath(options.llkbRoot);
  if (!existsSync(filePath)) {
    return [];
  }
  try {
    const content = readFileSync(filePath, "utf-8");
    const data = JSON.parse(content);
    return Array.isArray(data.patterns) ? data.patterns : [];
  } catch {
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
  const normalizedText = normalizeStepTextForTelemetry(originalText);
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
  const normalizedText = normalizeStepTextForTelemetry(originalText);
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
  const normalizedText = normalizeStepTextForTelemetry(text);
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
    const { unlinkSync } = __require("fs");
    unlinkSync(filePath);
  }
}
var PATTERNS_FILE, DEFAULT_LLKB_ROOT;
var init_patternExtension = __esm({
  "src/llkb/patternExtension.ts"() {
    init_telemetry();
    PATTERNS_FILE = "learned-patterns.json";
    DEFAULT_LLKB_ROOT = ".artk/llkb";
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
var GlossaryEntrySchema = z.object({
  canonical: z.string(),
  synonyms: z.array(z.string())
});
var LabelAliasSchema = z.object({
  label: z.string(),
  testid: z.string().optional(),
  role: z.string().optional(),
  selector: z.string().optional()
});
var ModuleMethodMappingSchema = z.object({
  phrase: z.string(),
  module: z.string(),
  method: z.string(),
  params: z.record(z.string()).optional()
});
var GlossarySchema = z.object({
  version: z.number().default(1),
  entries: z.array(GlossaryEntrySchema),
  labelAliases: z.array(LabelAliasSchema).default([]),
  moduleMethods: z.array(ModuleMethodMappingSchema).default([])
});
var defaultGlossary = {
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
var glossaryCache = null;
var synonymMap = null;
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
      const canonical = synonymMap.get(part.toLowerCase());
      parts.push(canonical ?? part);
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
var extendedGlossary = null;
var extendedGlossaryMeta = null;
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
  if (!llkbModule) return null;
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
  return nearest;
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

// src/mapping/blockedStepAnalysis.ts
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

// src/mapping/index.ts
init_telemetry();

export { PATTERN_VERSION, allPatterns, analyzeBlockedPatterns, analyzeBlockedStep, authPatterns, calculateSimilarity, categorizeStep, categorizeStepText, checkPatterns, clearExtendedGlossary, clearTelemetry, clickPatterns, createLocatorFromMatch, createValueFromText, defaultGlossary, explainMismatch, extendedAssertionPatterns, extendedClickPatterns, extendedFillPatterns, extendedNavigationPatterns, extendedSelectPatterns, extendedWaitPatterns, fillPatterns, findLabelAlias, findMatchingPatterns, findModuleMethod, findNearestPattern, focusPatterns, formatBlockedStepAnalysis, getAllPatternNames, getAssertionSuggestions, getGenericSuggestions, getGlossary, getGlossaryStats, getInteractionSuggestions, getLabelAliases, getLocatorFromLabel, getMappingStats, getModuleMethods, getNavigationSuggestions, getPatternCountByCategory, getPatternMatches, getPatternMetadata, getSynonyms, getTelemetryPath, getTelemetryStats, getWaitSuggestions, hasExtendedGlossary, hoverPatterns, inferMachineHint, initGlossary, initializeLlkb, isLlkbAvailable, isSynonymOf, levenshteinDistance, loadExtendedGlossary, loadGlossary, lookupCoreGlossary, lookupGlossary, mapAcceptanceCriterion, mapProceduralStep, mapStepText, mapSteps, matchPattern, mergeGlossaries, navigationPatterns, normalizeStepText, normalizeStepTextForTelemetry, parseSelectorToLocator, readBlockedStepRecords, recordBlockedStep, recordUserFix, resetGlossaryCache, resolveCanonical, resolveModuleMethod, selectPatterns, structuredPatterns, suggestImprovements, toastPatterns, urlPatterns, visibilityPatterns, waitPatterns };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map