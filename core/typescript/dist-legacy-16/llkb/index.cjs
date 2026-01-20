'use strict';

var fs = require('fs');
var path7 = require('path');

function _interopNamespace(e) {
  if (e && e.__esModule) return e;
  var n = Object.create(null);
  if (e) {
    Object.keys(e).forEach(function (k) {
      if (k !== 'default') {
        var d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: function () { return e[k]; }
        });
      }
    });
  }
  n.default = e;
  return Object.freeze(n);
}

var fs__namespace = /*#__PURE__*/_interopNamespace(fs);
var path7__namespace = /*#__PURE__*/_interopNamespace(path7);

// llkb/normalize.ts
function normalizeCode(code) {
  let normalized = code;
  normalized = normalized.replace(/'[^']*'/g, "<STRING>");
  normalized = normalized.replace(/"[^"]*"/g, "<STRING>");
  normalized = normalized.replace(/`[^`]*`/g, "<STRING>");
  normalized = normalized.replace(/\b\d+(?:\.\d+)?\b/g, "<NUMBER>");
  normalized = normalized.replace(/\bconst\s+(\w+)/g, "const <VAR>");
  normalized = normalized.replace(/\blet\s+(\w+)/g, "let <VAR>");
  normalized = normalized.replace(/\bvar\s+(\w+)/g, "var <VAR>");
  normalized = normalized.replace(/\s+/g, " ");
  normalized = normalized.trim();
  return normalized;
}
function hashCode(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + str.charCodeAt(i) >>> 0;
  }
  return hash.toString(16);
}
function tokenize(code) {
  const tokens = code.split(/[\s.,;:(){}[\]<>]+/).filter((token) => token.length > 0);
  return new Set(tokens);
}
function countLines(code) {
  if (!code || code.length === 0) {
    return 0;
  }
  return code.split("\n").length;
}

// llkb/similarity.ts
function calculateSimilarity(codeA, codeB) {
  const normA = normalizeCode(codeA);
  const normB = normalizeCode(codeB);
  if (normA === normB) {
    return 1;
  }
  const tokensA = tokenize(normA);
  const tokensB = tokenize(normB);
  const jaccardScore = jaccardSimilarity(tokensA, tokensB);
  const linesA = countLines(codeA);
  const linesB = countLines(codeB);
  const lineSimilarity = lineCountSimilarity(linesA, linesB);
  const similarity = jaccardScore * 0.8 + lineSimilarity * 0.2;
  return Math.round(similarity * 100) / 100;
}
function jaccardSimilarity(setA, setB) {
  if (setA.size === 0 && setB.size === 0) {
    return 1;
  }
  if (setA.size === 0 || setB.size === 0) {
    return 0;
  }
  const intersection = /* @__PURE__ */ new Set();
  for (const item of setA) {
    if (setB.has(item)) {
      intersection.add(item);
    }
  }
  const union = /* @__PURE__ */ new Set([...setA, ...setB]);
  return intersection.size / union.size;
}
function lineCountSimilarity(linesA, linesB) {
  if (linesA === 0 && linesB === 0) {
    return 1;
  }
  const maxLines = Math.max(linesA, linesB);
  const diff = Math.abs(linesA - linesB);
  return 1 - diff / maxLines;
}
function isNearDuplicate(codeA, codeB, threshold = 0.8) {
  return calculateSimilarity(codeA, codeB) >= threshold;
}
function findNearDuplicates(pattern, candidates, threshold = 0.8) {
  const duplicates = [];
  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    if (candidate !== void 0 && isNearDuplicate(pattern, candidate, threshold)) {
      duplicates.push(i);
    }
  }
  return duplicates;
}
function findSimilarPatterns(target, patterns, threshold = 0.8) {
  const results = [];
  for (let i = 0; i < patterns.length; i++) {
    const pattern = patterns[i];
    if (pattern !== void 0) {
      const similarity = calculateSimilarity(target, pattern);
      if (similarity >= threshold) {
        results.push({ pattern, similarity, index: i });
      }
    }
  }
  results.sort((a, b) => b.similarity - a.similarity);
  return results;
}

// llkb/inference.ts
var CATEGORY_PATTERNS = {
  navigation: [
    "goto",
    "navigate",
    "route",
    "url",
    "path",
    "sidebar",
    "menu",
    "breadcrumb",
    "nav",
    "link",
    "href",
    "router"
  ],
  auth: [
    "login",
    "logout",
    "auth",
    "password",
    "credential",
    "session",
    "token",
    "user",
    "signin",
    "signout",
    "authenticate",
    "authorization"
  ],
  assertion: [
    "expect",
    "assert",
    "verify",
    "should",
    "tobevisible",
    "tohavetext",
    "tobehidden",
    "tocontain",
    "tohaveattribute",
    "tobeenabled",
    "tobedisabled",
    "tohavevalue"
  ],
  data: [
    "api",
    "fetch",
    "response",
    "request",
    "json",
    "payload",
    "data",
    "post",
    "get",
    "put",
    "delete",
    "endpoint",
    "graphql",
    "rest"
  ],
  selector: [
    "locator",
    "getby",
    "selector",
    "testid",
    "data-testid",
    "queryselector",
    "findby",
    "getbyrole",
    "getbylabel",
    "getbytext",
    "getbyplaceholder"
  ],
  timing: [
    "wait",
    "timeout",
    "delay",
    "sleep",
    "settimeout",
    "poll",
    "retry",
    "interval",
    "waitfor",
    "waituntil"
  ],
  "ui-interaction": [
    "click",
    "fill",
    "type",
    "select",
    "check",
    "uncheck",
    "upload",
    "drag",
    "drop",
    "hover",
    "focus",
    "blur",
    "press",
    "scroll",
    "dblclick"
  ]
};
var CATEGORY_PRIORITY = [
  "auth",
  // Auth patterns are distinctive
  "navigation",
  // Navigation patterns are common
  "assertion",
  // Assertions are easy to identify
  "data",
  // Data/API patterns
  "timing",
  // Wait patterns
  "selector",
  // Selector patterns
  "ui-interaction"
  // Default fallback for UI ops
];
function inferCategory(code) {
  const codeLower = code.toLowerCase();
  for (const category of CATEGORY_PRIORITY) {
    const patterns = CATEGORY_PATTERNS[category];
    if (patterns !== void 0) {
      for (const pattern of patterns) {
        if (codeLower.includes(pattern)) {
          return category;
        }
      }
    }
  }
  return "ui-interaction";
}
function inferCategoryWithConfidence(code) {
  const codeLower = code.toLowerCase();
  const categoryMatches = /* @__PURE__ */ new Map();
  for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
    let matchCount = 0;
    for (const pattern of patterns) {
      if (codeLower.includes(pattern)) {
        matchCount++;
      }
    }
    if (matchCount > 0) {
      categoryMatches.set(category, matchCount);
    }
  }
  let bestCategory = "ui-interaction";
  let maxMatches = 0;
  for (const [category, count] of categoryMatches) {
    if (count > maxMatches) {
      maxMatches = count;
      bestCategory = category;
    }
  }
  const totalPatterns = CATEGORY_PATTERNS[bestCategory]?.length ?? 1;
  const confidence = Math.min(maxMatches / Math.min(totalPatterns, 5), 1);
  return {
    category: bestCategory,
    confidence: Math.round(confidence * 100) / 100,
    matchCount: maxMatches
  };
}
function isComponentCategory(category) {
  return category !== "quirk";
}
function getAllCategories() {
  return [
    "selector",
    "timing",
    "quirk",
    "auth",
    "data",
    "assertion",
    "navigation",
    "ui-interaction"
  ];
}
function getComponentCategories() {
  return [
    "selector",
    "timing",
    "auth",
    "data",
    "assertion",
    "navigation",
    "ui-interaction"
  ];
}

// llkb/confidence.ts
var MAX_CONFIDENCE_HISTORY_ENTRIES = 100;
var CONFIDENCE_HISTORY_RETENTION_DAYS = 90;
function calculateConfidence(lesson) {
  const metrics = lesson.metrics;
  const occurrences = metrics.occurrences;
  const baseScore = Math.min(occurrences / 10, 1);
  let recencyFactor;
  if (metrics.lastSuccess) {
    const daysSinceLastSuccess = daysBetween(/* @__PURE__ */ new Date(), new Date(metrics.lastSuccess));
    recencyFactor = Math.max(1 - daysSinceLastSuccess / 90 * 0.3, 0.7);
  } else {
    const daysSinceCreation = daysBetween(/* @__PURE__ */ new Date(), new Date(metrics.firstSeen));
    recencyFactor = Math.max(1 - daysSinceCreation / 30 * 0.5, 0.5);
  }
  const successRate = metrics.successRate;
  const successFactor = Math.sqrt(successRate);
  const validationBoost = lesson.validation.humanReviewed ? 1.2 : 1;
  const rawConfidence = baseScore * recencyFactor * successFactor * validationBoost;
  const confidence = Math.min(Math.max(rawConfidence, 0), 1);
  return Math.round(confidence * 100) / 100;
}
function detectDecliningConfidence(lesson) {
  const history = lesson.metrics.confidenceHistory;
  if (!history || history.length < 2) {
    return false;
  }
  const currentConfidence = lesson.metrics.confidence;
  const recentHistory = history.slice(-30);
  const sum = recentHistory.reduce((acc, entry) => acc + entry.value, 0);
  const historicalAverage = sum / recentHistory.length;
  return currentConfidence < historicalAverage * 0.8;
}
function updateConfidenceHistory(lesson) {
  const history = lesson.metrics.confidenceHistory ?? [];
  const now = /* @__PURE__ */ new Date();
  const newEntry = {
    date: now.toISOString(),
    value: lesson.metrics.confidence
  };
  history.push(newEntry);
  const cutoffDate = /* @__PURE__ */ new Date();
  cutoffDate.setDate(cutoffDate.getDate() - CONFIDENCE_HISTORY_RETENTION_DAYS);
  const filtered = history.filter((entry) => new Date(entry.date) >= cutoffDate);
  return filtered.slice(-MAX_CONFIDENCE_HISTORY_ENTRIES);
}
function getConfidenceTrend(history) {
  if (!history || history.length < 3) {
    return "unknown";
  }
  const third = Math.floor(history.length / 3);
  const firstThird = history.slice(0, third);
  const lastThird = history.slice(-third);
  const firstAvg = firstThird.reduce((acc, e) => acc + e.value, 0) / firstThird.length;
  const lastAvg = lastThird.reduce((acc, e) => acc + e.value, 0) / lastThird.length;
  const change = (lastAvg - firstAvg) / firstAvg;
  if (change > 0.1) {
    return "increasing";
  } else if (change < -0.1) {
    return "decreasing";
  } else {
    return "stable";
  }
}
function daysBetween(date1, date2) {
  const msPerDay = 24 * 60 * 60 * 1e3;
  return Math.abs(date1.getTime() - date2.getTime()) / msPerDay;
}
function needsConfidenceReview(lesson, threshold = 0.4) {
  return lesson.metrics.confidence < threshold;
}
var LOCK_MAX_WAIT_MS = 5e3;
var STALE_LOCK_THRESHOLD_MS = 3e4;
var LOCK_RETRY_INTERVAL_MS = 50;
function generateRandomId() {
  return Math.random().toString(36).substring(2, 15);
}
async function saveJSONAtomic(filePath, data) {
  const tempPath = `${filePath}.tmp.${generateRandomId()}`;
  try {
    const dir = path7__namespace.dirname(filePath);
    if (!fs__namespace.existsSync(dir)) {
      fs__namespace.mkdirSync(dir, { recursive: true });
    }
    const content = JSON.stringify(data, null, 2);
    fs__namespace.writeFileSync(tempPath, content, "utf-8");
    fs__namespace.renameSync(tempPath, filePath);
    return { success: true };
  } catch (error) {
    try {
      if (fs__namespace.existsSync(tempPath)) {
        fs__namespace.unlinkSync(tempPath);
      }
    } catch {
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
function saveJSONAtomicSync(filePath, data) {
  const tempPath = `${filePath}.tmp.${generateRandomId()}`;
  try {
    const dir = path7__namespace.dirname(filePath);
    if (!fs__namespace.existsSync(dir)) {
      fs__namespace.mkdirSync(dir, { recursive: true });
    }
    const content = JSON.stringify(data, null, 2);
    fs__namespace.writeFileSync(tempPath, content, "utf-8");
    fs__namespace.renameSync(tempPath, filePath);
    return { success: true };
  } catch (error) {
    try {
      if (fs__namespace.existsSync(tempPath)) {
        fs__namespace.unlinkSync(tempPath);
      }
    } catch {
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
function acquireLock(filePath) {
  const lockPath = `${filePath}.lock`;
  const now = Date.now();
  try {
    if (fs__namespace.existsSync(lockPath)) {
      const lockStat = fs__namespace.statSync(lockPath);
      const lockAge = now - lockStat.mtimeMs;
      if (lockAge > STALE_LOCK_THRESHOLD_MS) {
        fs__namespace.unlinkSync(lockPath);
      } else {
        return false;
      }
    }
    fs__namespace.writeFileSync(lockPath, String(now), { flag: "wx" });
    return true;
  } catch (error) {
    if (error.code === "EEXIST") {
      return false;
    }
    throw error;
  }
}
function releaseLock(filePath) {
  const lockPath = `${filePath}.lock`;
  try {
    if (fs__namespace.existsSync(lockPath)) {
      fs__namespace.unlinkSync(lockPath);
    }
  } catch {
  }
}
async function updateJSONWithLock(filePath, updateFn) {
  const startTime = Date.now();
  let retriesNeeded = 0;
  while (Date.now() - startTime < LOCK_MAX_WAIT_MS) {
    if (acquireLock(filePath)) {
      try {
        let data;
        if (fs__namespace.existsSync(filePath)) {
          const content = fs__namespace.readFileSync(filePath, "utf-8");
          data = JSON.parse(content);
        } else {
          data = {};
        }
        const updated = updateFn(data);
        const saveResult = await saveJSONAtomic(filePath, updated);
        if (!saveResult.success) {
          return {
            success: false,
            error: saveResult.error,
            retriesNeeded
          };
        }
        return { success: true, retriesNeeded };
      } finally {
        releaseLock(filePath);
      }
    }
    retriesNeeded++;
    await sleep(LOCK_RETRY_INTERVAL_MS);
  }
  return {
    success: false,
    error: `Could not acquire lock within ${LOCK_MAX_WAIT_MS}ms`,
    retriesNeeded
  };
}
function updateJSONWithLockSync(filePath, updateFn) {
  const startTime = Date.now();
  let retriesNeeded = 0;
  while (Date.now() - startTime < LOCK_MAX_WAIT_MS) {
    if (acquireLock(filePath)) {
      try {
        let data;
        if (fs__namespace.existsSync(filePath)) {
          const content = fs__namespace.readFileSync(filePath, "utf-8");
          data = JSON.parse(content);
        } else {
          data = {};
        }
        const updated = updateFn(data);
        const saveResult = saveJSONAtomicSync(filePath, updated);
        if (!saveResult.success) {
          return {
            success: false,
            error: saveResult.error,
            retriesNeeded
          };
        }
        return { success: true, retriesNeeded };
      } finally {
        releaseLock(filePath);
      }
    }
    retriesNeeded++;
  }
  return {
    success: false,
    error: `Could not acquire lock within ${LOCK_MAX_WAIT_MS}ms`,
    retriesNeeded
  };
}
function loadJSON(filePath) {
  try {
    if (!fs__namespace.existsSync(filePath)) {
      return null;
    }
    const content = fs__namespace.readFileSync(filePath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    throw new Error(
      `Failed to load JSON from ${filePath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
function ensureDir(dirPath) {
  if (!fs__namespace.existsSync(dirPath)) {
    fs__namespace.mkdirSync(dirPath, { recursive: true });
  }
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
var DEFAULT_LLKB_ROOT = ".artk/llkb";
function getHistoryDir(llkbRoot = DEFAULT_LLKB_ROOT) {
  return path7__namespace.join(llkbRoot, "history");
}
function getHistoryFilePath(date = /* @__PURE__ */ new Date(), llkbRoot = DEFAULT_LLKB_ROOT) {
  const dateStr = formatDate(date);
  return path7__namespace.join(getHistoryDir(llkbRoot), `${dateStr}.jsonl`);
}
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function appendToHistory(event, llkbRoot = DEFAULT_LLKB_ROOT) {
  try {
    const historyDir = getHistoryDir(llkbRoot);
    ensureDir(historyDir);
    const filePath = getHistoryFilePath(/* @__PURE__ */ new Date(), llkbRoot);
    const line = JSON.stringify(event) + "\n";
    fs__namespace.appendFileSync(filePath, line, "utf-8");
    return true;
  } catch (error) {
    console.warn(
      `[LLKB] Failed to append to history: ${error instanceof Error ? error.message : String(error)}`
    );
    return false;
  }
}
function readHistoryFile(filePath) {
  if (!fs__namespace.existsSync(filePath)) {
    return [];
  }
  const content = fs__namespace.readFileSync(filePath, "utf-8");
  const lines = content.split("\n").filter((line) => line.trim().length > 0);
  return lines.map((line) => JSON.parse(line));
}
function readTodayHistory(llkbRoot = DEFAULT_LLKB_ROOT) {
  const filePath = getHistoryFilePath(/* @__PURE__ */ new Date(), llkbRoot);
  return readHistoryFile(filePath);
}
function countTodayEvents(eventType, filter, llkbRoot = DEFAULT_LLKB_ROOT) {
  const events = readTodayHistory(llkbRoot);
  return events.filter((e) => {
    if (e.event !== eventType) {
      return false;
    }
    return filter ? filter(e) : true;
  }).length;
}
function countPredictiveExtractionsToday(llkbRoot = DEFAULT_LLKB_ROOT) {
  return countTodayEvents(
    "component_extracted",
    (e) => e.event === "component_extracted" && e.prompt === "journey-implement",
    llkbRoot
  );
}
function countJourneyExtractionsToday(journeyId, llkbRoot = DEFAULT_LLKB_ROOT) {
  return countTodayEvents(
    "component_extracted",
    (e) => e.event === "component_extracted" && e.prompt === "journey-implement" && e.journeyId === journeyId,
    llkbRoot
  );
}
function isDailyRateLimitReached(config, llkbRoot = DEFAULT_LLKB_ROOT) {
  const count = countPredictiveExtractionsToday(llkbRoot);
  return count >= config.extraction.maxPredictivePerDay;
}
function isJourneyRateLimitReached(journeyId, config, llkbRoot = DEFAULT_LLKB_ROOT) {
  const count = countJourneyExtractionsToday(journeyId, llkbRoot);
  return count >= config.extraction.maxPredictivePerJourney;
}
function getHistoryFilesInRange(startDate, endDate, llkbRoot = DEFAULT_LLKB_ROOT) {
  const historyDir = getHistoryDir(llkbRoot);
  if (!fs__namespace.existsSync(historyDir)) {
    return [];
  }
  const files = fs__namespace.readdirSync(historyDir).filter((f) => f.endsWith(".jsonl"));
  const results = [];
  for (const file of files) {
    const match = file.match(/^(\d{4}-\d{2}-\d{2})\.jsonl$/);
    if (match?.[1]) {
      const fileDate = new Date(match[1]);
      if (fileDate >= startDate && fileDate <= endDate) {
        results.push(path7__namespace.join(historyDir, file));
      }
    }
  }
  return results.sort();
}
function cleanupOldHistoryFiles(retentionDays = 365, llkbRoot = DEFAULT_LLKB_ROOT) {
  const historyDir = getHistoryDir(llkbRoot);
  if (!fs__namespace.existsSync(historyDir)) {
    return [];
  }
  const files = fs__namespace.readdirSync(historyDir).filter((f) => f.endsWith(".jsonl"));
  const now = /* @__PURE__ */ new Date();
  const cutoffDate = /* @__PURE__ */ new Date();
  cutoffDate.setDate(now.getDate() - retentionDays);
  const deleted = [];
  for (const file of files) {
    const match = file.match(/^(\d{4}-\d{2}-\d{2})\.jsonl$/);
    if (match?.[1]) {
      const fileDate = new Date(match[1]);
      if (fileDate < cutoffDate) {
        const filePath = path7__namespace.join(historyDir, file);
        fs__namespace.unlinkSync(filePath);
        deleted.push(filePath);
      }
    }
  }
  return deleted;
}
var DEFAULT_LLKB_ROOT2 = ".artk/llkb";
var ALL_CATEGORIES = [
  "selector",
  "timing",
  "quirk",
  "auth",
  "data",
  "assertion",
  "navigation",
  "ui-interaction"
];
var COMPONENT_CATEGORIES = [
  "selector",
  "timing",
  "auth",
  "data",
  "assertion",
  "navigation",
  "ui-interaction"
];
var ALL_SCOPES = [
  "universal",
  "framework:angular",
  "framework:react",
  "framework:vue",
  "framework:ag-grid",
  "app-specific"
];
function updateAnalytics(llkbRoot = DEFAULT_LLKB_ROOT2) {
  try {
    const lessonsPath = path7__namespace.join(llkbRoot, "lessons.json");
    const componentsPath = path7__namespace.join(llkbRoot, "components.json");
    const analyticsPath = path7__namespace.join(llkbRoot, "analytics.json");
    const lessons = loadJSON(lessonsPath);
    const components = loadJSON(componentsPath);
    let analytics = loadJSON(analyticsPath);
    if (!lessons || !components) {
      console.warn("[LLKB] Cannot update analytics: lessons or components not found");
      return false;
    }
    if (!analytics) {
      analytics = createEmptyAnalytics();
    }
    analytics.overview = calculateOverview(lessons, components);
    analytics.lessonStats = calculateLessonStats(lessons);
    analytics.componentStats = calculateComponentStats(components);
    analytics.topPerformers = calculateTopPerformers(lessons, components);
    analytics.needsReview = calculateNeedsReview(lessons, components);
    analytics.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
    const result = saveJSONAtomicSync(analyticsPath, analytics);
    return result.success;
  } catch (error) {
    console.error(
      `[LLKB] Failed to update analytics: ${error instanceof Error ? error.message : String(error)}`
    );
    return false;
  }
}
function updateAnalyticsWithData(lessons, components, analyticsPath) {
  try {
    let analytics = loadJSON(analyticsPath) ?? createEmptyAnalytics();
    analytics.overview = calculateOverview(lessons, components);
    analytics.lessonStats = calculateLessonStats(lessons);
    analytics.componentStats = calculateComponentStats(components);
    analytics.topPerformers = calculateTopPerformers(lessons, components);
    analytics.needsReview = calculateNeedsReview(lessons, components);
    analytics.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
    const result = saveJSONAtomicSync(analyticsPath, analytics);
    return result.success;
  } catch (error) {
    console.error(`[LLKB] Failed to update analytics: ${error}`);
    return false;
  }
}
function createEmptyAnalytics() {
  return {
    version: "1.0.0",
    lastUpdated: (/* @__PURE__ */ new Date()).toISOString(),
    overview: {
      totalLessons: 0,
      activeLessons: 0,
      archivedLessons: 0,
      totalComponents: 0,
      activeComponents: 0,
      archivedComponents: 0
    },
    lessonStats: {
      byCategory: Object.fromEntries(ALL_CATEGORIES.map((c) => [c, 0])),
      avgConfidence: 0,
      avgSuccessRate: 0
    },
    componentStats: {
      byCategory: Object.fromEntries(COMPONENT_CATEGORIES.map((c) => [c, 0])),
      byScope: Object.fromEntries(ALL_SCOPES.map((s) => [s, 0])),
      totalReuses: 0,
      avgReusesPerComponent: 0
    },
    impact: {
      verifyIterationsSaved: 0,
      avgIterationsBeforeLLKB: 0,
      avgIterationsAfterLLKB: 0,
      codeDeduplicationRate: 0,
      estimatedHoursSaved: 0
    },
    topPerformers: {
      lessons: [],
      components: []
    },
    needsReview: {
      lowConfidenceLessons: [],
      lowUsageComponents: [],
      decliningSuccessRate: []
    }
  };
}
function calculateOverview(lessons, components) {
  const activeLessons = lessons.lessons.filter((l) => !l.archived);
  const activeComponents = components.components.filter((c) => !c.archived);
  const archivedComponents = components.components.filter((c) => c.archived);
  return {
    totalLessons: lessons.lessons.length,
    activeLessons: activeLessons.length,
    archivedLessons: (lessons.archived ?? []).length,
    totalComponents: components.components.length,
    activeComponents: activeComponents.length,
    archivedComponents: archivedComponents.length
  };
}
function calculateLessonStats(lessons) {
  const activeLessons = lessons.lessons.filter((l) => !l.archived);
  const byCategory = Object.fromEntries(ALL_CATEGORIES.map((c) => [c, 0]));
  for (const lesson of activeLessons) {
    const category = lesson.category;
    if (category in byCategory) {
      byCategory[category]++;
    }
  }
  let avgConfidence = 0;
  let avgSuccessRate = 0;
  if (activeLessons.length > 0) {
    const confidenceSum = activeLessons.reduce((acc, l) => acc + l.metrics.confidence, 0);
    const successRateSum = activeLessons.reduce((acc, l) => acc + l.metrics.successRate, 0);
    avgConfidence = Math.round(confidenceSum / activeLessons.length * 100) / 100;
    avgSuccessRate = Math.round(successRateSum / activeLessons.length * 100) / 100;
  }
  return {
    byCategory,
    avgConfidence,
    avgSuccessRate
  };
}
function calculateComponentStats(components) {
  const activeComponents = components.components.filter((c) => !c.archived);
  const byCategory = Object.fromEntries(COMPONENT_CATEGORIES.map((c) => [c, 0]));
  for (const comp of activeComponents) {
    const category = comp.category;
    if (category in byCategory) {
      byCategory[category]++;
    }
  }
  const byScope = Object.fromEntries(ALL_SCOPES.map((s) => [s, 0]));
  for (const comp of activeComponents) {
    const scope = comp.scope;
    if (scope in byScope) {
      byScope[scope]++;
    }
  }
  let totalReuses = 0;
  let avgReusesPerComponent = 0;
  if (activeComponents.length > 0) {
    totalReuses = activeComponents.reduce((acc, c) => acc + (c.metrics.totalUses ?? 0), 0);
    avgReusesPerComponent = Math.round(totalReuses / activeComponents.length * 100) / 100;
  }
  return {
    byCategory,
    byScope,
    totalReuses,
    avgReusesPerComponent
  };
}
function calculateTopPerformers(lessons, components) {
  const activeLessons = lessons.lessons.filter((l) => !l.archived);
  const activeComponents = components.components.filter((c) => !c.archived);
  const topLessons = activeLessons.map((l) => ({
    id: l.id,
    title: l.title,
    score: Math.round(l.metrics.successRate * l.metrics.occurrences * 100) / 100
  })).sort((a, b) => b.score - a.score).slice(0, 5);
  const topComponents = activeComponents.map((c) => ({
    id: c.id,
    name: c.name,
    uses: c.metrics.totalUses ?? 0
  })).sort((a, b) => b.uses - a.uses).slice(0, 5);
  return {
    lessons: topLessons,
    components: topComponents
  };
}
function calculateNeedsReview(lessons, components) {
  const activeLessons = lessons.lessons.filter((l) => !l.archived);
  const activeComponents = components.components.filter((c) => !c.archived);
  const now = /* @__PURE__ */ new Date();
  const lowConfidenceLessons = activeLessons.filter((l) => l.metrics.confidence < 0.4).map((l) => l.id);
  const decliningSuccessRate = activeLessons.filter((l) => detectDecliningConfidence(l)).map((l) => l.id);
  const lowUsageComponents = activeComponents.filter((c) => {
    const uses = c.metrics.totalUses ?? 0;
    const extractedAt = new Date(c.source.extractedAt);
    const age = daysBetween(now, extractedAt);
    return uses < 2 && age > 30;
  }).map((c) => c.id);
  return {
    lowConfidenceLessons,
    lowUsageComponents,
    decliningSuccessRate
  };
}
function getAnalyticsSummary(llkbRoot = DEFAULT_LLKB_ROOT2) {
  const analyticsPath = path7__namespace.join(llkbRoot, "analytics.json");
  const analytics = loadJSON(analyticsPath);
  if (!analytics) {
    return "Analytics not available";
  }
  const o = analytics.overview;
  const l = analytics.lessonStats;
  const c = analytics.componentStats;
  return [
    `LLKB Analytics (${analytics.lastUpdated})`,
    "\u2500".repeat(50),
    `Lessons: ${o.activeLessons} active, ${o.archivedLessons} archived`,
    `  Avg Confidence: ${l.avgConfidence}`,
    `  Avg Success Rate: ${l.avgSuccessRate}`,
    `Components: ${o.activeComponents} active, ${o.archivedComponents} archived`,
    `  Total Reuses: ${c.totalReuses}`,
    `  Avg Reuses/Component: ${c.avgReusesPerComponent}`,
    `Items Needing Review: ${analytics.needsReview.lowConfidenceLessons.length + analytics.needsReview.lowUsageComponents.length + analytics.needsReview.decliningSuccessRate.length}`
  ].join("\n");
}
var DEFAULT_LLKB_ROOT3 = ".artk/llkb";
function runHealthCheck(llkbRoot = DEFAULT_LLKB_ROOT3) {
  const checks = [];
  let hasError = false;
  let hasWarning = false;
  if (fs__namespace.existsSync(llkbRoot)) {
    checks.push({
      name: "Directory exists",
      status: "pass",
      message: `LLKB directory found at ${llkbRoot}`
    });
  } else {
    checks.push({
      name: "Directory exists",
      status: "fail",
      message: `LLKB directory not found at ${llkbRoot}`
    });
    hasError = true;
  }
  const configPath = path7__namespace.join(llkbRoot, "config.yml");
  if (fs__namespace.existsSync(configPath)) {
    checks.push({
      name: "Config file",
      status: "pass",
      message: "config.yml found"
    });
  } else {
    checks.push({
      name: "Config file",
      status: "warn",
      message: "config.yml not found - using defaults"
    });
    hasWarning = true;
  }
  const lessonsPath = path7__namespace.join(llkbRoot, "lessons.json");
  const lessonsCheck = checkJSONFile(lessonsPath, "lessons.json");
  checks.push(lessonsCheck);
  if (lessonsCheck.status === "fail") hasError = true;
  if (lessonsCheck.status === "warn") hasWarning = true;
  const componentsPath = path7__namespace.join(llkbRoot, "components.json");
  const componentsCheck = checkJSONFile(componentsPath, "components.json");
  checks.push(componentsCheck);
  if (componentsCheck.status === "fail") hasError = true;
  if (componentsCheck.status === "warn") hasWarning = true;
  const analyticsPath = path7__namespace.join(llkbRoot, "analytics.json");
  const analyticsCheck = checkJSONFile(analyticsPath, "analytics.json");
  checks.push(analyticsCheck);
  if (analyticsCheck.status === "fail") hasError = true;
  if (analyticsCheck.status === "warn") hasWarning = true;
  const historyDir = getHistoryDir(llkbRoot);
  if (fs__namespace.existsSync(historyDir)) {
    const historyFiles = fs__namespace.readdirSync(historyDir).filter((f) => f.endsWith(".jsonl"));
    checks.push({
      name: "History directory",
      status: "pass",
      message: `History directory found with ${historyFiles.length} files`
    });
  } else {
    checks.push({
      name: "History directory",
      status: "warn",
      message: "History directory not found - will be created on first event"
    });
    hasWarning = true;
  }
  if (lessonsCheck.status === "pass") {
    try {
      const lessons = loadJSON(lessonsPath);
      if (lessons) {
        const lowConfidence = lessons.lessons.filter(
          (l) => !l.archived && needsConfidenceReview(l)
        );
        const declining = lessons.lessons.filter(
          (l) => !l.archived && detectDecliningConfidence(l)
        );
        if (lowConfidence.length > 0 || declining.length > 0) {
          checks.push({
            name: "Lesson health",
            status: "warn",
            message: `${lowConfidence.length} low confidence, ${declining.length} declining`,
            details: [
              ...lowConfidence.map((l) => `Low confidence: ${l.id} (${l.metrics.confidence})`),
              ...declining.map((l) => `Declining: ${l.id}`)
            ].join(", ")
          });
          hasWarning = true;
        } else {
          checks.push({
            name: "Lesson health",
            status: "pass",
            message: "All lessons healthy"
          });
        }
      }
    } catch {
    }
  }
  let status;
  let summary;
  if (hasError) {
    status = "error";
    summary = `LLKB has errors: ${checks.filter((c) => c.status === "fail").length} failed checks`;
  } else if (hasWarning) {
    status = "warning";
    summary = `LLKB has warnings: ${checks.filter((c) => c.status === "warn").length} warnings`;
  } else {
    status = "healthy";
    summary = "LLKB is healthy";
  }
  return { status, checks, summary };
}
function checkJSONFile(filePath, fileName) {
  if (!fs__namespace.existsSync(filePath)) {
    return {
      name: fileName,
      status: "warn",
      message: `${fileName} not found`
    };
  }
  try {
    const content = fs__namespace.readFileSync(filePath, "utf-8");
    JSON.parse(content);
    return {
      name: fileName,
      status: "pass",
      message: `${fileName} is valid JSON`
    };
  } catch (error) {
    return {
      name: fileName,
      status: "fail",
      message: `${fileName} is invalid JSON`,
      details: error instanceof Error ? error.message : String(error)
    };
  }
}
function getStats(llkbRoot = DEFAULT_LLKB_ROOT3) {
  const lessonsPath = path7__namespace.join(llkbRoot, "lessons.json");
  const componentsPath = path7__namespace.join(llkbRoot, "components.json");
  const historyDir = getHistoryDir(llkbRoot);
  const lessons = loadJSON(lessonsPath);
  const activeLessons = lessons?.lessons.filter((l) => !l.archived) ?? [];
  const archivedLessons = lessons?.archived ?? [];
  let avgConfidence = 0;
  let avgSuccessRate = 0;
  let needsReview = 0;
  if (activeLessons.length > 0) {
    avgConfidence = Math.round(
      activeLessons.reduce((acc, l) => acc + l.metrics.confidence, 0) / activeLessons.length * 100
    ) / 100;
    avgSuccessRate = Math.round(
      activeLessons.reduce((acc, l) => acc + l.metrics.successRate, 0) / activeLessons.length * 100
    ) / 100;
    needsReview = activeLessons.filter(
      (l) => needsConfidenceReview(l) || detectDecliningConfidence(l)
    ).length;
  }
  const components = loadJSON(componentsPath);
  const activeComponents = components?.components.filter((c) => !c.archived) ?? [];
  const archivedComponents = components?.components.filter((c) => c.archived) ?? [];
  let totalReuses = 0;
  let avgReusesPerComponent = 0;
  if (activeComponents.length > 0) {
    totalReuses = activeComponents.reduce((acc, c) => acc + (c.metrics.totalUses ?? 0), 0);
    avgReusesPerComponent = Math.round(totalReuses / activeComponents.length * 100) / 100;
  }
  let todayEvents = 0;
  let historyFiles = 0;
  let oldestFile = null;
  let newestFile = null;
  if (fs__namespace.existsSync(historyDir)) {
    const files = fs__namespace.readdirSync(historyDir).filter((f) => f.endsWith(".jsonl")).sort();
    historyFiles = files.length;
    if (files.length > 0) {
      oldestFile = files[0] ?? null;
      newestFile = files[files.length - 1] ?? null;
    }
    todayEvents = readTodayHistory(llkbRoot).length;
  }
  return {
    lessons: {
      total: (lessons?.lessons.length ?? 0) + archivedLessons.length,
      active: activeLessons.length,
      archived: archivedLessons.length,
      avgConfidence,
      avgSuccessRate,
      needsReview
    },
    components: {
      total: components?.components.length ?? 0,
      active: activeComponents.length,
      archived: archivedComponents.length,
      totalReuses,
      avgReusesPerComponent
    },
    history: {
      todayEvents,
      historyFiles,
      oldestFile,
      newestFile
    }
  };
}
function prune(options = {}) {
  const {
    llkbRoot = DEFAULT_LLKB_ROOT3,
    historyRetentionDays = 365,
    archiveInactiveLessons = false,
    archiveInactiveComponents = false,
    inactiveDays = 180
  } = options;
  const result = {
    historyFilesDeleted: 0,
    deletedFiles: [],
    archivedLessons: 0,
    archivedComponents: 0,
    errors: []
  };
  try {
    const deletedFiles = cleanupOldHistoryFiles(historyRetentionDays, llkbRoot);
    result.historyFilesDeleted = deletedFiles.length;
    result.deletedFiles = deletedFiles;
  } catch (error) {
    result.errors.push(
      `Failed to clean history files: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  if (archiveInactiveLessons) {
    try {
      const archivedCount = archiveInactiveItems(
        path7__namespace.join(llkbRoot, "lessons.json"),
        "lessons",
        inactiveDays
      );
      result.archivedLessons = archivedCount;
    } catch (error) {
      result.errors.push(
        `Failed to archive lessons: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  if (archiveInactiveComponents) {
    try {
      const archivedCount = archiveInactiveItems(
        path7__namespace.join(llkbRoot, "components.json"),
        "components",
        inactiveDays
      );
      result.archivedComponents = archivedCount;
    } catch (error) {
      result.errors.push(
        `Failed to archive components: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  try {
    updateAnalytics(llkbRoot);
  } catch (error) {
    result.errors.push(
      `Failed to update analytics: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  return result;
}
function archiveInactiveItems(filePath, itemsKey, inactiveDays) {
  if (!fs__namespace.existsSync(filePath)) {
    return 0;
  }
  const content = fs__namespace.readFileSync(filePath, "utf-8");
  const data = JSON.parse(content);
  const items = data[itemsKey];
  if (!Array.isArray(items)) {
    return 0;
  }
  const now = /* @__PURE__ */ new Date();
  const cutoffDate = /* @__PURE__ */ new Date();
  cutoffDate.setDate(now.getDate() - inactiveDays);
  let archivedCount = 0;
  for (const item of items) {
    if (item.archived) continue;
    const lastUsedStr = item.metrics.lastSuccess ?? item.metrics.lastUsed;
    if (!lastUsedStr) continue;
    const lastUsed = new Date(lastUsedStr);
    if (lastUsed < cutoffDate) {
      item.archived = true;
      archivedCount++;
    }
  }
  if (archivedCount > 0) {
    fs__namespace.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  }
  return archivedCount;
}
function formatHealthCheck(result) {
  const lines = [];
  const statusIcon = result.status === "healthy" ? "\u2713" : result.status === "warning" ? "\u26A0" : "\u2717";
  lines.push(`${statusIcon} LLKB Health Check: ${result.status.toUpperCase()}`);
  lines.push("\u2500".repeat(50));
  for (const check of result.checks) {
    const icon = check.status === "pass" ? "\u2713" : check.status === "warn" ? "\u26A0" : "\u2717";
    lines.push(`${icon} ${check.name}: ${check.message}`);
    if (check.details) {
      lines.push(`  ${check.details}`);
    }
  }
  lines.push("\u2500".repeat(50));
  lines.push(result.summary);
  return lines.join("\n");
}
function formatStats(stats) {
  const lines = [];
  lines.push("LLKB Statistics");
  lines.push("\u2500".repeat(50));
  lines.push("");
  lines.push("Lessons:");
  lines.push(`  Total: ${stats.lessons.total} (${stats.lessons.active} active, ${stats.lessons.archived} archived)`);
  lines.push(`  Avg Confidence: ${stats.lessons.avgConfidence}`);
  lines.push(`  Avg Success Rate: ${stats.lessons.avgSuccessRate}`);
  lines.push(`  Needs Review: ${stats.lessons.needsReview}`);
  lines.push("");
  lines.push("Components:");
  lines.push(`  Total: ${stats.components.total} (${stats.components.active} active, ${stats.components.archived} archived)`);
  lines.push(`  Total Reuses: ${stats.components.totalReuses}`);
  lines.push(`  Avg Reuses/Component: ${stats.components.avgReusesPerComponent}`);
  lines.push("");
  lines.push("History:");
  lines.push(`  Today's Events: ${stats.history.todayEvents}`);
  lines.push(`  History Files: ${stats.history.historyFiles}`);
  if (stats.history.oldestFile) {
    lines.push(`  Date Range: ${stats.history.oldestFile} to ${stats.history.newestFile}`);
  }
  return lines.join("\n");
}
function formatPruneResult(result) {
  const lines = [];
  lines.push("LLKB Prune Results");
  lines.push("\u2500".repeat(50));
  lines.push(`History files deleted: ${result.historyFilesDeleted}`);
  if (result.archivedLessons > 0) {
    lines.push(`Lessons archived: ${result.archivedLessons}`);
  }
  if (result.archivedComponents > 0) {
    lines.push(`Components archived: ${result.archivedComponents}`);
  }
  if (result.errors.length > 0) {
    lines.push("");
    lines.push("Errors:");
    for (const error of result.errors) {
      lines.push(`  \u2717 ${error}`);
    }
  }
  return lines.join("\n");
}
var DEFAULT_LLKB_CONFIG = {
  version: "1.0.0",
  enabled: true,
  extraction: {
    minOccurrences: 2,
    predictiveExtraction: true,
    confidenceThreshold: 0.7,
    maxPredictivePerDay: 5,
    maxPredictivePerJourney: 2,
    minLinesForExtraction: 3,
    similarityThreshold: 0.8
  },
  retention: {
    maxLessonAge: 90,
    minSuccessRate: 0.6,
    archiveUnused: 30
  },
  injection: {
    prioritizeByConfidence: true
  },
  scopes: {
    universal: true,
    frameworkSpecific: true,
    appSpecific: true
  },
  history: {
    retentionDays: 365
  },
  overrides: {
    allowUserOverride: true,
    logOverrides: true,
    flagAfterOverrides: 3
  }
};
function loadLLKBConfig(llkbRoot = ".artk/llkb") {
  const configPath = path7.join(llkbRoot, "config.yml");
  if (!fs.existsSync(configPath)) {
    return { ...DEFAULT_LLKB_CONFIG };
  }
  try {
    const content = fs.readFileSync(configPath, "utf-8");
    const config = parseSimpleYAML(content);
    return mergeConfig(DEFAULT_LLKB_CONFIG, config);
  } catch {
    return { ...DEFAULT_LLKB_CONFIG };
  }
}
function parseSimpleYAML(content) {
  const result = {};
  const lines = content.split("\n");
  const stack = [{ obj: result, indent: -1 }];
  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith("#")) {
      continue;
    }
    const indent = line.search(/\S/);
    const trimmed = line.trim();
    const colonIndex = trimmed.indexOf(":");
    if (colonIndex === -1) continue;
    const key = trimmed.substring(0, colonIndex).trim();
    const valueStr = trimmed.substring(colonIndex + 1).trim();
    while (stack.length > 1) {
      const top2 = stack[stack.length - 1];
      if (!top2 || top2.indent < indent) break;
      stack.pop();
    }
    const top = stack[stack.length - 1];
    if (!top) continue;
    const parent = top.obj;
    if (valueStr === "" || valueStr === "|" || valueStr === ">") {
      const newObj = {};
      parent[key] = newObj;
      stack.push({ obj: newObj, indent });
    } else {
      parent[key] = parseYAMLValue(valueStr);
    }
  }
  return result;
}
function parseYAMLValue(value) {
  if (value.startsWith('"') && value.endsWith('"') || value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }
  if (value === "true") return true;
  if (value === "false") return false;
  const num = Number(value);
  if (!isNaN(num)) return num;
  return value;
}
function mergeConfig(defaults, overrides) {
  const result = { ...defaults };
  for (const key of Object.keys(overrides)) {
    const override = overrides[key];
    if (override !== void 0) {
      if (typeof override === "object" && override !== null && !Array.isArray(override)) {
        const defaultValue = defaults[key];
        result[key] = {
          ...typeof defaultValue === "object" && defaultValue !== null ? defaultValue : {},
          ...override
        };
      } else {
        result[key] = override;
      }
    }
  }
  return result;
}
function isLLKBEnabled(llkbRoot = ".artk/llkb") {
  if (!fs.existsSync(llkbRoot)) {
    return false;
  }
  const config = loadLLKBConfig(llkbRoot);
  return config.enabled;
}
function loadAppProfile(llkbRoot = ".artk/llkb") {
  const profilePath = path7.join(llkbRoot, "app-profile.json");
  return loadJSON(profilePath);
}
function loadLessonsFile(llkbRoot = ".artk/llkb") {
  const lessonsPath = path7.join(llkbRoot, "lessons.json");
  const data = loadJSON(lessonsPath);
  if (!data) {
    return {
      version: "1.0.0",
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString(),
      lessons: [],
      archived: [],
      globalRules: [],
      appQuirks: []
    };
  }
  return data;
}
function loadLessons(llkbRoot = ".artk/llkb", options = {}) {
  const lessonsFile = loadLessonsFile(llkbRoot);
  let lessons = lessonsFile.lessons;
  if (!options.includeArchived) {
    lessons = lessons.filter((l) => !l.archived);
  }
  if (options.category) {
    const categories = Array.isArray(options.category) ? options.category : [options.category];
    lessons = lessons.filter((l) => categories.includes(l.category));
  }
  if (options.scope) {
    const scopes = Array.isArray(options.scope) ? options.scope : [options.scope];
    lessons = lessons.filter((l) => scopes.includes(l.scope));
  }
  if (options.minConfidence !== void 0) {
    lessons = lessons.filter((l) => l.metrics.confidence >= options.minConfidence);
  }
  if (options.tags && options.tags.length > 0) {
    lessons = lessons.filter((l) => l.tags && options.tags.some((tag) => l.tags.includes(tag)));
  }
  return lessons;
}
function loadComponentsFile(llkbRoot = ".artk/llkb") {
  const componentsPath = path7.join(llkbRoot, "components.json");
  const data = loadJSON(componentsPath);
  if (!data) {
    return {
      version: "1.0.0",
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString(),
      components: [],
      componentsByCategory: {
        selector: [],
        timing: [],
        auth: [],
        data: [],
        assertion: [],
        navigation: [],
        "ui-interaction": []
      },
      componentsByScope: {
        universal: [],
        "framework:angular": [],
        "framework:react": [],
        "framework:vue": [],
        "framework:ag-grid": [],
        "app-specific": []
      }
    };
  }
  return data;
}
function loadComponents(llkbRoot = ".artk/llkb", options = {}) {
  const componentsFile = loadComponentsFile(llkbRoot);
  let components = componentsFile.components;
  if (!options.includeArchived) {
    components = components.filter((c) => !c.archived);
  }
  if (options.category) {
    const categories = Array.isArray(options.category) ? options.category : [options.category];
    components = components.filter((c) => categories.includes(c.category));
  }
  if (options.scope) {
    const scopes = Array.isArray(options.scope) ? options.scope : [options.scope];
    components = components.filter((c) => scopes.includes(c.scope));
  }
  if (options.minConfidence !== void 0) {
    components = components.filter((c) => c.metrics.successRate >= options.minConfidence);
  }
  return components;
}
function loadPatterns(llkbRoot = ".artk/llkb") {
  const patternsDir = path7.join(llkbRoot, "patterns");
  if (!fs.existsSync(patternsDir)) {
    return {};
  }
  const patterns = {};
  const selectorPatterns = loadJSON(path7.join(patternsDir, "selectors.json"));
  if (selectorPatterns) {
    patterns.selectors = selectorPatterns;
  }
  const timingPatterns = loadJSON(path7.join(patternsDir, "timing.json"));
  if (timingPatterns) {
    patterns.timing = timingPatterns;
  }
  const assertionPatterns = loadJSON(path7.join(patternsDir, "assertions.json"));
  if (assertionPatterns) {
    patterns.assertions = assertionPatterns;
  }
  const dataPatterns = loadJSON(path7.join(patternsDir, "data.json"));
  if (dataPatterns) {
    patterns.data = dataPatterns;
  }
  const authPatterns = loadJSON(path7.join(patternsDir, "auth.json"));
  if (authPatterns) {
    patterns.auth = authPatterns;
  }
  return patterns;
}
function loadLLKBData(llkbRoot = ".artk/llkb") {
  return {
    config: loadLLKBConfig(llkbRoot),
    appProfile: loadAppProfile(llkbRoot),
    lessons: loadLessonsFile(llkbRoot),
    components: loadComponentsFile(llkbRoot),
    patterns: loadPatterns(llkbRoot)
  };
}
function llkbExists(llkbRoot = ".artk/llkb") {
  return fs.existsSync(llkbRoot) && fs.existsSync(path7.join(llkbRoot, "config.yml"));
}

// llkb/context.ts
var DEFAULT_MAX_LESSONS = 10;
var DEFAULT_MAX_COMPONENTS = 10;
function calculateLessonRelevance(lesson, journey, appProfile) {
  let score = 0;
  const reasons = [];
  score += lesson.metrics.confidence * 0.3;
  if (lesson.scope === "universal") {
    score += 0.2;
    reasons.push("universal scope");
  } else if (appProfile && lesson.scope === `framework:${appProfile.application.framework}`) {
    score += 0.25;
    reasons.push(`framework match: ${appProfile.application.framework}`);
  } else if (lesson.scope === "app-specific") {
    score += 0.15;
    reasons.push("app-specific");
  }
  const journeyKeywords = journey.keywords || extractKeywords(journey);
  if (lesson.tags && lesson.tags.length > 0) {
    const matchingTags = lesson.tags.filter(
      (tag) => journeyKeywords.some((kw) => tag.toLowerCase().includes(kw.toLowerCase()))
    );
    if (matchingTags.length > 0) {
      score += Math.min(matchingTags.length * 0.1, 0.3);
      reasons.push(`tags: ${matchingTags.join(", ")}`);
    }
  }
  if (lesson.journeyIds && lesson.journeyIds.length > 0) {
    if (lesson.journeyIds.includes(journey.id)) {
      score += 0.25;
      reasons.push("same journey");
    } else {
      const journeyScopePattern = journey.scope.toLowerCase();
      const matchingJourneys = lesson.journeyIds.filter(
        (jid) => jid.toLowerCase().includes(journeyScopePattern)
      );
      if (matchingJourneys.length > 0) {
        score += 0.15;
        reasons.push(`similar journeys: ${matchingJourneys.length}`);
      }
    }
  }
  if (journey.categories && journey.categories.includes(lesson.category)) {
    score += 0.15;
    reasons.push(`category: ${lesson.category}`);
  }
  const triggerTokens = tokenize(lesson.trigger);
  const triggerMatches = journeyKeywords.filter(
    (kw) => [...triggerTokens].some((t) => t.toLowerCase().includes(kw.toLowerCase()))
  );
  if (triggerMatches.length > 0) {
    score += Math.min(triggerMatches.length * 0.05, 0.15);
    reasons.push(`trigger match: ${triggerMatches.slice(0, 2).join(", ")}`);
  }
  if (lesson.metrics.lastSuccess) {
    const daysSinceSuccess = daysSince(lesson.metrics.lastSuccess);
    if (daysSinceSuccess < 7) {
      score += 0.1;
      reasons.push("recently successful");
    } else if (daysSinceSuccess < 30) {
      score += 0.05;
    }
  }
  if (lesson.metrics.successRate >= 0.9) {
    score += 0.1;
    reasons.push("high success rate");
  }
  return { score: Math.min(score, 1), reasons };
}
function calculateComponentRelevance(component, journey, appProfile) {
  let score = 0;
  const reasons = [];
  score += component.metrics.successRate * 0.3;
  if (component.scope === "universal") {
    score += 0.2;
    reasons.push("universal scope");
  } else if (appProfile && component.scope === `framework:${appProfile.application.framework}`) {
    score += 0.25;
    reasons.push(`framework match: ${appProfile.application.framework}`);
  } else if (appProfile && component.scope === `framework:${appProfile.application.dataGrid}` && appProfile.application.dataGrid !== "none") {
    score += 0.25;
    reasons.push(`data grid match: ${appProfile.application.dataGrid}`);
  }
  if (journey.categories && journey.categories.includes(component.category)) {
    score += 0.2;
    reasons.push(`category: ${component.category}`);
  }
  const journeyKeywords = journey.keywords || extractKeywords(journey);
  const descTokens = tokenize(component.description);
  const contextMatches = journeyKeywords.filter(
    (kw) => [...descTokens].some((t) => t.toLowerCase().includes(kw.toLowerCase()))
  );
  if (contextMatches.length > 0) {
    score += Math.min(contextMatches.length * 0.05, 0.2);
    reasons.push(`context match: ${contextMatches.slice(0, 3).join(", ")}`);
  }
  if (component.metrics.totalUses > 10) {
    score += 0.15;
    reasons.push("widely used");
  } else if (component.metrics.totalUses > 3) {
    score += 0.1;
    reasons.push("commonly used");
  }
  if (component.metrics.successRate >= 0.95) {
    score += 0.1;
    reasons.push("high reliability");
  }
  return { score: Math.min(score, 1), reasons };
}
function getRelevantContext(journey, lessons, components, config, appProfile = null, patterns = {}) {
  const maxLessons = DEFAULT_MAX_LESSONS;
  const maxComponents = DEFAULT_MAX_COMPONENTS;
  const journeyWithKeywords = {
    ...journey,
    keywords: journey.keywords || extractKeywords(journey)
  };
  const scoredLessons = lessons.filter((l) => !l.archived).map((lesson) => {
    const { score, reasons } = calculateLessonRelevance(lesson, journeyWithKeywords, appProfile);
    return { ...lesson, relevanceScore: score, matchReasons: reasons };
  }).filter((l) => l.relevanceScore > 0.2).sort((a, b) => {
    if (config.injection.prioritizeByConfidence) {
      return b.metrics.confidence - a.metrics.confidence || b.relevanceScore - a.relevanceScore;
    }
    return b.relevanceScore - a.relevanceScore;
  }).slice(0, maxLessons);
  const scoredComponents = components.filter((c) => !c.archived).map((component) => {
    const { score, reasons } = calculateComponentRelevance(
      component,
      journeyWithKeywords,
      appProfile
    );
    return { ...component, relevanceScore: score, matchReasons: reasons };
  }).filter((c) => c.relevanceScore > 0.2).sort((a, b) => {
    if (config.injection.prioritizeByConfidence) {
      return b.metrics.successRate - a.metrics.successRate || b.relevanceScore - a.relevanceScore;
    }
    return b.relevanceScore - a.relevanceScore;
  }).slice(0, maxComponents);
  const quirks = extractRelevantQuirks(lessons, journeyWithKeywords);
  const selectorPatterns = extractRelevantSelectorPatterns(
    patterns.selectors,
    journeyWithKeywords,
    appProfile
  );
  const timingPatterns = extractRelevantTimingPatterns(patterns.timing, journeyWithKeywords);
  const summary = calculateSummary(scoredLessons, scoredComponents, quirks);
  return {
    lessons: scoredLessons,
    components: scoredComponents,
    quirks,
    selectorPatterns,
    timingPatterns,
    summary
  };
}
function extractRelevantQuirks(lessons, journey) {
  const quirks = [];
  for (const lesson of lessons) {
    if (lesson.category === "quirk") {
      const journeyKeywords = journey.keywords || extractKeywords(journey);
      const triggerTokens = tokenize(lesson.trigger);
      const patternTokens = tokenize(lesson.pattern);
      const matchesScope = lesson.journeyIds.some(
        (jid) => journey.scope.toLowerCase().includes(jid.toLowerCase()) || jid.toLowerCase().includes(journey.scope.toLowerCase())
      ) || journeyKeywords.some(
        (kw) => [...triggerTokens].some((t) => t.toLowerCase().includes(kw.toLowerCase())) || [...patternTokens].some((t) => t.toLowerCase().includes(kw.toLowerCase()))
      ) || journey.routes && journey.routes.some(
        (route) => lesson.journeyIds.some((jid) => route.toLowerCase().includes(jid.toLowerCase()))
      );
      if (matchesScope) {
        quirks.push({
          id: lesson.id,
          component: lesson.title,
          location: lesson.journeyIds.join(", ") || lesson.scope,
          quirk: lesson.trigger,
          impact: `Confidence: ${Math.round(lesson.metrics.confidence * 100)}%`,
          workaround: lesson.pattern
        });
      }
    }
  }
  return quirks.slice(0, 5);
}
function extractRelevantSelectorPatterns(selectorPatterns, journey, appProfile) {
  if (!selectorPatterns) return [];
  const relevant = [];
  for (const pattern of selectorPatterns.selectorPatterns || []) {
    const matchesApp = appProfile && pattern.applicableTo.some(
      (app) => app === appProfile.application.framework || app === appProfile.application.dataGrid || app === appProfile.application.uiLibrary
    );
    const matchesKeywords = journey.keywords && pattern.applicableTo.some(
      (app) => journey.keywords.some((kw) => app.toLowerCase().includes(kw.toLowerCase()))
    );
    if (matchesApp || matchesKeywords || pattern.confidence >= 0.9) {
      relevant.push({
        id: pattern.id,
        name: pattern.name,
        template: pattern.template,
        confidence: pattern.confidence
      });
    }
  }
  return relevant.slice(0, 5);
}
function extractRelevantTimingPatterns(timingPatterns, journey) {
  if (!timingPatterns) return [];
  const relevant = [];
  for (const pattern of timingPatterns.asyncPatterns || []) {
    const contextTokens = tokenize(pattern.context);
    const journeyKeywords = journey.keywords || [];
    const matches = journeyKeywords.some(
      (kw) => [...contextTokens].some((t) => t.toLowerCase().includes(kw.toLowerCase()))
    );
    if (matches) {
      relevant.push({
        id: pattern.id,
        name: pattern.name,
        pattern: pattern.pattern,
        recommendation: pattern.recommendation
      });
    }
  }
  return relevant.slice(0, 5);
}
function calculateSummary(lessons, components, quirks) {
  const avgLessonConfidence = lessons.length > 0 ? lessons.reduce((sum, l) => sum + l.metrics.confidence, 0) / lessons.length : 0;
  const avgComponentSuccessRate = components.length > 0 ? components.reduce((sum, c) => sum + c.metrics.successRate, 0) / components.length : 0;
  const categoryCounts = {};
  for (const lesson of lessons) {
    categoryCounts[lesson.category] = (categoryCounts[lesson.category] || 0) + 1;
  }
  for (const component of components) {
    categoryCounts[component.category] = (categoryCounts[component.category] || 0) + 1;
  }
  const topCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([cat]) => cat);
  return {
    totalLessons: lessons.length,
    totalComponents: components.length,
    totalQuirks: quirks.length,
    avgLessonConfidence,
    avgComponentSuccessRate,
    topCategories
  };
}
function extractKeywords(journey) {
  const keywords = [];
  const titleTokens = journey.title.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  keywords.push(...titleTokens);
  keywords.push(journey.scope.toLowerCase());
  if (journey.routes) {
    for (const route of journey.routes) {
      const routeParts = route.split("/").filter((p) => p && p.length > 2).map((p) => p.toLowerCase());
      keywords.push(...routeParts);
    }
  }
  return [...new Set(keywords)];
}
function daysSince(dateStr) {
  const date = new Date(dateStr);
  const now = /* @__PURE__ */ new Date();
  return Math.floor((now.getTime() - date.getTime()) / (1e3 * 60 * 60 * 24));
}
function formatContextForPrompt(context, journey) {
  const lines = [];
  lines.push(`## LLKB Context (Auto-Injected for ${journey.id})`);
  lines.push("");
  if (context.components.length > 0) {
    lines.push(`### Available Components (Top ${context.components.length} for this scope)`);
    lines.push("");
    lines.push("| Component | File | Success Rate | Description |");
    lines.push("|-----------|------|--------------|-------------|");
    for (const comp of context.components) {
      const successRate = Math.round(comp.metrics.successRate * 100);
      const description = comp.description.slice(0, 50) + (comp.description.length > 50 ? "..." : "");
      lines.push(`| ${comp.name} | ${comp.filePath} | ${successRate}% | ${description} |`);
    }
    lines.push("");
    lines.push("**Import Example:**");
    lines.push("```typescript");
    const byPath = {};
    for (const comp of context.components) {
      const importPath = comp.filePath.replace(/\.ts$/, "").replace(/^\.\//, "");
      if (!byPath[importPath]) byPath[importPath] = [];
      byPath[importPath].push(comp.name);
    }
    for (const [path8, names] of Object.entries(byPath)) {
      lines.push(`import { ${names.join(", ")} } from './${path8}';`);
    }
    lines.push("```");
    lines.push("");
  }
  if (context.lessons.length > 0) {
    lines.push(`### Relevant Lessons (Top ${context.lessons.length})`);
    lines.push("");
    for (let i = 0; i < context.lessons.length; i++) {
      const lesson = context.lessons[i];
      if (!lesson) continue;
      const confidence = lesson.metrics.confidence >= 0.8 ? "HIGH" : lesson.metrics.confidence >= 0.5 ? "MEDIUM" : "LOW";
      lines.push(`${i + 1}. **[${confidence}] ${lesson.id}: ${lesson.title}**`);
      lines.push(`   - Trigger: ${lesson.trigger}`);
      lines.push(`   - Pattern: \`${lesson.pattern.slice(0, 100)}${lesson.pattern.length > 100 ? "..." : ""}\``);
      lines.push("");
    }
  }
  if (context.quirks.length > 0) {
    lines.push("### Known Quirks for This Scope");
    lines.push("");
    for (const quirk of context.quirks) {
      lines.push(`- **${quirk.id} (${quirk.component})**: ${quirk.quirk}`);
      if (quirk.workaround) {
        lines.push(`  - Workaround: ${quirk.workaround}`);
      }
    }
    lines.push("");
  }
  lines.push("---");
  return lines.join("\n");
}
function getRelevantScopes(appProfile) {
  const scopes = ["universal", "app-specific"];
  if (appProfile) {
    if (appProfile.application.framework !== "other") {
      scopes.push(`framework:${appProfile.application.framework}`);
    }
    if (appProfile.application.dataGrid !== "none") {
      scopes.push(`framework:${appProfile.application.dataGrid}`);
    }
    if (appProfile.application.uiLibrary !== "custom" && appProfile.application.uiLibrary !== "none") {
      scopes.push(`framework:${appProfile.application.uiLibrary}`);
    }
  }
  return scopes;
}

// llkb/matching.ts
var ACTION_KEYWORDS = [
  "verify",
  "check",
  "assert",
  "expect",
  "navigate",
  "goto",
  "click",
  "fill",
  "type",
  "select",
  "wait",
  "load",
  "submit",
  "upload",
  "download",
  "hover",
  "drag",
  "drop",
  "scroll",
  "resize",
  "close",
  "open",
  "toggle",
  "expand",
  "collapse",
  "search",
  "filter",
  "sort",
  "create",
  "delete",
  "update",
  "edit",
  "save",
  "cancel",
  "confirm",
  "login",
  "logout",
  "authenticate"
];
var REUSABLE_PATTERNS = [
  { pattern: /navigation|sidebar|menu|breadcrumb/i, category: "navigation" },
  { pattern: /form|input|submit|validation/i, category: "ui-interaction" },
  { pattern: /table|grid|row|cell|column/i, category: "data" },
  { pattern: /modal|dialog|popup|overlay/i, category: "ui-interaction" },
  { pattern: /toast|alert|notification|message/i, category: "assertion" },
  { pattern: /login|auth|logout|session/i, category: "auth" },
  { pattern: /loading|spinner|skeleton|progress/i, category: "timing" },
  { pattern: /select|dropdown|picker|autocomplete/i, category: "ui-interaction" },
  { pattern: /tab|accordion|panel|collapse/i, category: "ui-interaction" },
  { pattern: /search|filter|sort|pagination/i, category: "data" }
];
function extractStepKeywords(step) {
  const text = `${step.name} ${step.description || ""}`.toLowerCase();
  const keywords = [];
  for (const keyword of ACTION_KEYWORDS) {
    if (text.includes(keyword)) {
      keywords.push(keyword);
    }
  }
  if (step.keywords) {
    keywords.push(...step.keywords.map((k) => k.toLowerCase()));
  }
  const elementMatches = text.match(/\b(button|link|input|field|table|grid|form|modal|dialog|toast|sidebar|menu|dropdown|checkbox|radio)\b/gi);
  if (elementMatches) {
    keywords.push(...elementMatches.map((m) => m.toLowerCase()));
  }
  return [...new Set(keywords)];
}
function calculateStepComponentSimilarity(step, component, stepKeywords) {
  let score = 0;
  let factors = 0;
  if (step.code) {
    const stepCategory = inferCategory(step.code);
    if (stepCategory === component.category) {
      score += 0.3;
    }
  }
  factors += 0.3;
  const componentKeywords = [
    component.category,
    ...component.description?.toLowerCase().split(/\s+/) || [],
    component.name.toLowerCase()
  ];
  const keywordOverlap = stepKeywords.filter(
    (k) => componentKeywords.some((ck) => ck.includes(k) || k.includes(ck))
  ).length;
  const keywordScore = Math.min(keywordOverlap / Math.max(stepKeywords.length, 1), 1);
  score += keywordScore * 0.4;
  factors += 0.4;
  const stepText = `${step.name} ${step.description || ""}`.toLowerCase();
  const componentText = `${component.name} ${component.description}`.toLowerCase();
  const stepWords = new Set(stepText.split(/\s+/).filter((w) => w.length > 2));
  const componentWords = new Set(componentText.split(/\s+/).filter((w) => w.length > 2));
  let overlap = 0;
  for (const word of stepWords) {
    if (componentWords.has(word)) {
      overlap++;
    }
  }
  const nameScore = overlap / Math.max(stepWords.size, 1);
  score += nameScore * 0.3;
  factors += 0.3;
  return score / factors;
}
function scopeMatches(componentScope, _journeyScope, appFramework) {
  if (componentScope === "universal") {
    return true;
  }
  if (componentScope.startsWith("framework:")) {
    const framework = componentScope.replace("framework:", "");
    return appFramework === framework;
  }
  if (componentScope === "app-specific") {
    return true;
  }
  return false;
}
function matchStepsToComponents(steps, components, options = {}) {
  const { useThreshold = 0.7, suggestThreshold = 0.4, appFramework, categories } = options;
  const filteredComponents = components.filter((c) => {
    if (c.archived) {
      return false;
    }
    if (categories && categories.length > 0 && !categories.includes(c.category)) {
      return false;
    }
    return true;
  });
  return steps.map((step) => {
    const stepKeywords = extractStepKeywords(step);
    let bestMatch = null;
    let bestScore = 0;
    for (const component of filteredComponents) {
      if (!scopeMatches(component.scope, step.scope, appFramework)) {
        continue;
      }
      const score = calculateStepComponentSimilarity(step, component, stepKeywords);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = component;
      }
    }
    let recommendation;
    let reason;
    if (bestScore >= useThreshold) {
      recommendation = "USE";
      reason = `High confidence match (${(bestScore * 100).toFixed(0)}%) - use ${bestMatch.name} component`;
    } else if (bestScore >= suggestThreshold) {
      recommendation = "SUGGEST";
      reason = `Moderate match (${(bestScore * 100).toFixed(0)}%) - consider ${bestMatch.name} component`;
    } else {
      recommendation = "NONE";
      reason = bestMatch ? `Low match score (${(bestScore * 100).toFixed(0)}%) - write inline code` : "No matching components found";
      bestMatch = null;
    }
    return {
      step,
      component: bestMatch,
      score: bestScore,
      recommendation,
      reason
    };
  });
}
function matchesReusablePattern(code) {
  for (const { pattern, category } of REUSABLE_PATTERNS) {
    if (pattern.test(code)) {
      return { matches: true, category };
    }
  }
  return { matches: false };
}
function suggestModulePath(category, scope) {
  if (scope.startsWith("framework:")) {
    const framework = scope.replace("framework:", "");
    return `@artk/core/${framework}/${category}`;
  }
  return `modules/foundation/${category}`;
}
function shouldExtractAsComponent(code, occurrences, config, existingComponents = []) {
  const {
    minOccurrences = 2,
    predictiveExtraction = true,
    minLinesForExtraction = 3,
    similarityThreshold = 0.8
  } = config.extraction;
  const lineCount = countLines(code);
  if (lineCount < minLinesForExtraction) {
    return {
      shouldExtract: false,
      confidence: 0,
      reason: `Code too short (${lineCount} lines < ${minLinesForExtraction} minimum)`
    };
  }
  const normalizedCode = normalizeCode(code);
  for (const component of existingComponents) {
    if (component.archived) continue;
    const sourceNormalized = normalizeCode(component.source.originalCode);
    const similarity = calculateSimilarity(normalizedCode, sourceNormalized);
    if (similarity >= similarityThreshold) {
      return {
        shouldExtract: false,
        confidence: 1,
        reason: `Similar component already exists: ${component.name} (${(similarity * 100).toFixed(0)}% similar)`
      };
    }
  }
  const category = inferCategory(code);
  const patternMatch = matchesReusablePattern(code);
  const uniqueJourneys = new Set(occurrences.map((o) => o.journeyId)).size;
  if (occurrences.length >= minOccurrences) {
    return {
      shouldExtract: true,
      confidence: Math.min(0.7 + uniqueJourneys * 0.1, 0.95),
      reason: `Pattern appears ${occurrences.length} times across ${uniqueJourneys} journey(s) (>= ${minOccurrences} threshold)`,
      suggestedCategory: patternMatch.category || category,
      suggestedPath: suggestModulePath(patternMatch.category || category, "app-specific")
    };
  }
  if (predictiveExtraction && patternMatch.matches) {
    return {
      shouldExtract: true,
      confidence: 0.6,
      reason: `Predictive extraction: matches common ${patternMatch.category} pattern`,
      suggestedCategory: patternMatch.category,
      suggestedPath: suggestModulePath(patternMatch.category, "app-specific")
    };
  }
  if (occurrences.length === 1 && !patternMatch.matches) {
    return {
      shouldExtract: false,
      confidence: 0.3,
      reason: "Single occurrence, not a common pattern - keep inline",
      suggestedCategory: category
    };
  }
  return {
    shouldExtract: false,
    confidence: 0.4,
    reason: `Not enough occurrences (${occurrences.length} < ${minOccurrences}) and no common pattern match`,
    suggestedCategory: category
  };
}
function findExtractionCandidates(codeSnippets, config, existingComponents = []) {
  const { similarityThreshold = 0.8 } = config.extraction;
  const groups = /* @__PURE__ */ new Map();
  const codeByHash = /* @__PURE__ */ new Map();
  for (const snippet of codeSnippets) {
    const normalized = normalizeCode(snippet.code);
    const hash = hashCode(normalized);
    let matchedHash = null;
    for (const [existingHash, existingCode] of codeByHash.entries()) {
      const similarity = calculateSimilarity(normalized, existingCode);
      if (similarity >= similarityThreshold) {
        matchedHash = existingHash;
        break;
      }
    }
    const groupHash = matchedHash || hash;
    if (!groups.has(groupHash)) {
      groups.set(groupHash, []);
      codeByHash.set(groupHash, normalized);
    }
    groups.get(groupHash).push({
      file: snippet.file,
      journeyId: snippet.journeyId,
      stepName: snippet.stepName,
      lineStart: snippet.lineStart,
      lineEnd: snippet.lineEnd
    });
  }
  const candidates = [];
  for (const [hash, occurrences] of groups.entries()) {
    const code = codeByHash.get(hash);
    const firstOccurrence = occurrences[0];
    if (!firstOccurrence) continue;
    const originalSnippet = codeSnippets.find(
      (s) => s.file === firstOccurrence.file && s.lineStart === firstOccurrence.lineStart
    );
    const checkResult = shouldExtractAsComponent(
      originalSnippet?.code || code,
      occurrences,
      config,
      existingComponents
    );
    const uniqueJourneys = new Set(occurrences.map((o) => o.journeyId)).size;
    const score = occurrences.length * 0.3 + uniqueJourneys * 0.4 + checkResult.confidence * 0.3;
    let recommendation;
    if (checkResult.shouldExtract && score >= 0.7) {
      recommendation = "EXTRACT_NOW";
    } else if (checkResult.shouldExtract || score >= 0.5) {
      recommendation = "CONSIDER";
    } else {
      recommendation = "SKIP";
    }
    candidates.push({
      pattern: code,
      originalCode: originalSnippet?.code || code,
      occurrences: occurrences.length,
      journeys: [...new Set(occurrences.map((o) => o.journeyId))],
      files: [...new Set(occurrences.map((o) => o.file))],
      category: checkResult.suggestedCategory || inferCategory(code),
      score,
      recommendation
    });
  }
  return candidates.sort((a, b) => b.score - a.score);
}
var DEFAULT_EXTENSIONS = [".ts", ".js"];
var DEFAULT_EXCLUDE_DIRS = ["node_modules", "dist", "build", ".git", "coverage"];
var TEST_STEP_REGEX = /(?:await\s+)?test\.step\s*\(\s*(['"`])(.+?)\1\s*,\s*async\s*\([^)]*\)\s*=>\s*\{([\s\S]*?)\}\s*\)/g;
var JOURNEY_ID_REGEX = /(?:JRN|jrn)[-_]?(\d+)/i;
function extractJourneyId(filePath, content) {
  const fileMatch = path7__namespace.basename(filePath).match(JOURNEY_ID_REGEX);
  if (fileMatch && fileMatch[1]) {
    return `JRN-${fileMatch[1].padStart(4, "0")}`;
  }
  const contentMatch = content.match(JOURNEY_ID_REGEX);
  if (contentMatch && contentMatch[1]) {
    return `JRN-${contentMatch[1].padStart(4, "0")}`;
  }
  const basename3 = path7__namespace.basename(filePath, path7__namespace.extname(filePath));
  return `JRN-${basename3.toUpperCase().replace(/[^A-Z0-9]/g, "-").slice(0, 20)}`;
}
function parseTestSteps(filePath, content) {
  const steps = [];
  const journeyId = extractJourneyId(filePath, content);
  TEST_STEP_REGEX.lastIndex = 0;
  let match;
  while ((match = TEST_STEP_REGEX.exec(content)) !== null) {
    const stepName = match[2];
    const stepCode = match[3];
    if (!stepName || !stepCode) continue;
    const trimmedCode = stepCode.trim();
    const beforeMatch = content.slice(0, match.index);
    const lineStart = beforeMatch.split("\n").length;
    const lineEnd = lineStart + match[0].split("\n").length - 1;
    const codeWithoutComments = trimmedCode.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "").trim();
    if (codeWithoutComments.length > 0) {
      steps.push({
        file: filePath,
        journeyId,
        stepName,
        code: trimmedCode,
        lineStart,
        lineEnd
      });
    }
  }
  return steps;
}
function findTestFiles(dir, extensions, excludeDirs) {
  const files = [];
  if (!fs__namespace.existsSync(dir)) {
    return files;
  }
  const entries = fs__namespace.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path7__namespace.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!excludeDirs.includes(entry.name)) {
        files.push(...findTestFiles(fullPath, extensions, excludeDirs));
      }
    } else if (entry.isFile()) {
      const ext = path7__namespace.extname(entry.name);
      if (extensions.includes(ext)) {
        if (entry.name.includes(".spec.") || entry.name.includes(".test.") || entry.name.includes(".e2e.")) {
          files.push(fullPath);
        }
      }
    }
  }
  return files;
}
function groupSimilarPatterns(steps, similarityThreshold, minLines) {
  const groups = /* @__PURE__ */ new Map();
  const normalizedByStep = /* @__PURE__ */ new Map();
  for (const step of steps) {
    const normalized = normalizeCode(step.code);
    const lineCount = countLines(step.code);
    if (lineCount < minLines) {
      continue;
    }
    normalizedByStep.set(step, normalized);
  }
  const processed = /* @__PURE__ */ new Set();
  for (const [step, normalized] of normalizedByStep) {
    if (processed.has(step)) continue;
    const hash = hashCode(normalized);
    let foundGroup = false;
    for (const [groupHash, groupSteps] of groups) {
      const firstGroupStep = groupSteps[0];
      if (!firstGroupStep) continue;
      const groupNormalized = normalizedByStep.get(firstGroupStep);
      if (!groupNormalized) continue;
      const similarity = calculateSimilarity(normalized, groupNormalized);
      if (similarity >= similarityThreshold) {
        const existingGroup = groups.get(groupHash);
        if (existingGroup) {
          existingGroup.push(step);
        }
        processed.add(step);
        foundGroup = true;
        break;
      }
    }
    if (!foundGroup) {
      groups.set(hash, [step]);
      processed.add(step);
    }
  }
  return groups;
}
function buildDuplicateGroups(stepGroups, minOccurrences) {
  const duplicateGroups = [];
  for (const [hash, steps] of stepGroups) {
    if (steps.length < minOccurrences) {
      continue;
    }
    const uniqueJourneys = new Set(steps.map((s) => s.journeyId)).size;
    const uniqueFiles = new Set(steps.map((s) => s.file)).size;
    let totalSimilarity = 0;
    let pairs = 0;
    for (let i = 0; i < steps.length; i++) {
      for (let j = i + 1; j < steps.length; j++) {
        const stepI = steps[i];
        const stepJ = steps[j];
        if (!stepI || !stepJ) continue;
        const sim = calculateSimilarity(
          normalizeCode(stepI.code),
          normalizeCode(stepJ.code)
        );
        totalSimilarity += sim;
        pairs++;
      }
    }
    const internalSimilarity = pairs > 0 ? totalSimilarity / pairs : 1;
    const originalSamples = steps.slice(0, 3).map((s) => s.code);
    const firstStep = steps[0];
    if (!firstStep) continue;
    const category = inferCategory(firstStep.code);
    const occurrences = steps.map((s) => ({
      file: s.file,
      journey: s.journeyId,
      stepName: s.stepName,
      code: s.code,
      normalizedCode: normalizeCode(s.code),
      hash: hashCode(normalizeCode(s.code)),
      lineStart: s.lineStart,
      lineEnd: s.lineEnd
    }));
    duplicateGroups.push({
      patternHash: hash,
      normalizedCode: normalizeCode(firstStep.code),
      originalSamples,
      occurrences,
      uniqueJourneys,
      uniqueFiles,
      category,
      internalSimilarity
    });
  }
  return duplicateGroups.sort((a, b) => b.occurrences.length - a.occurrences.length);
}
function detectDuplicatesAcrossFiles(testDir, options = {}) {
  const {
    similarityThreshold = 0.8,
    minOccurrences = 2,
    minLines = 3,
    extensions = DEFAULT_EXTENSIONS,
    excludeDirs = DEFAULT_EXCLUDE_DIRS
  } = options;
  const testFiles = findTestFiles(testDir, extensions, excludeDirs);
  const allSteps = [];
  for (const file of testFiles) {
    try {
      const content = fs__namespace.readFileSync(file, "utf-8");
      const steps = parseTestSteps(file, content);
      allSteps.push(...steps);
    } catch (error) {
      console.warn(`Warning: Could not read file ${file}`);
    }
  }
  const stepGroups = groupSimilarPatterns(allSteps, similarityThreshold, minLines);
  const duplicateGroups = buildDuplicateGroups(stepGroups, minOccurrences);
  const uniquePatterns = Array.from(stepGroups.values()).filter(
    (g) => g.length === 1
  ).length;
  const extractionCandidates = duplicateGroups.map((group) => ({
    pattern: group.normalizedCode,
    originalCode: group.originalSamples[0] || group.normalizedCode,
    occurrences: group.occurrences.length,
    journeys: [...new Set(group.occurrences.map((o) => o.journey))],
    files: [...new Set(group.occurrences.map((o) => o.file))],
    category: group.category,
    score: group.occurrences.length * 0.3 + group.uniqueJourneys * 0.4 + group.internalSimilarity * 0.3,
    recommendation: group.occurrences.length >= 3 ? "EXTRACT_NOW" : group.occurrences.length >= 2 ? "CONSIDER" : "SKIP"
  }));
  return {
    totalSteps: allSteps.length,
    uniquePatterns,
    duplicatePatterns: duplicateGroups.length,
    duplicateGroups,
    extractionCandidates: extractionCandidates.sort((a, b) => b.score - a.score),
    filesAnalyzed: testFiles
  };
}
function detectDuplicatesInFile(filePath, options = {}) {
  const {
    similarityThreshold = 0.8,
    minOccurrences = 2,
    minLines = 2
    // Lower threshold for single file
  } = options;
  if (!fs__namespace.existsSync(filePath)) {
    return {
      totalSteps: 0,
      uniquePatterns: 0,
      duplicatePatterns: 0,
      duplicateGroups: [],
      extractionCandidates: [],
      filesAnalyzed: []
    };
  }
  const content = fs__namespace.readFileSync(filePath, "utf-8");
  const steps = parseTestSteps(filePath, content);
  const stepGroups = groupSimilarPatterns(steps, similarityThreshold, minLines);
  const duplicateGroups = buildDuplicateGroups(stepGroups, minOccurrences);
  const uniquePatterns = Array.from(stepGroups.values()).filter(
    (g) => g.length === 1
  ).length;
  const extractionCandidates = duplicateGroups.map((group) => {
    const firstOccurrence = group.occurrences[0];
    return {
      pattern: group.normalizedCode,
      originalCode: group.originalSamples[0] || group.normalizedCode,
      occurrences: group.occurrences.length,
      journeys: firstOccurrence ? [firstOccurrence.journey] : [],
      files: [filePath],
      category: group.category,
      score: group.occurrences.length * 0.5 + group.internalSimilarity * 0.5,
      recommendation: group.occurrences.length >= 2 ? "CONSIDER" : "SKIP"
    };
  });
  return {
    totalSteps: steps.length,
    uniquePatterns,
    duplicatePatterns: duplicateGroups.length,
    duplicateGroups,
    extractionCandidates: extractionCandidates.sort((a, b) => b.score - a.score),
    filesAnalyzed: [filePath]
  };
}
function findUnusedComponentOpportunities(testDir, components, options = {}) {
  const {
    similarityThreshold = 0.6,
    // Lower threshold for opportunities
    extensions = DEFAULT_EXTENSIONS,
    excludeDirs = DEFAULT_EXCLUDE_DIRS
  } = options;
  const testFiles = findTestFiles(testDir, extensions, excludeDirs);
  const opportunities = /* @__PURE__ */ new Map();
  for (const component of components) {
    if (!component.archived) {
      opportunities.set(component.id, []);
    }
  }
  for (const file of testFiles) {
    try {
      const content = fs__namespace.readFileSync(file, "utf-8");
      const steps = parseTestSteps(file, content);
      for (const step of steps) {
        const normalizedStep = normalizeCode(step.code);
        for (const component of components) {
          if (component.archived) continue;
          const normalizedComponent = normalizeCode(component.source.originalCode);
          const similarity = calculateSimilarity(normalizedStep, normalizedComponent);
          if (similarity >= similarityThreshold) {
            const componentOpportunities = opportunities.get(component.id);
            if (componentOpportunities) {
              componentOpportunities.push({
                file: step.file,
                stepName: step.stepName,
                similarity,
                lineStart: step.lineStart,
                lineEnd: step.lineEnd
              });
            }
          }
        }
      }
    } catch {
    }
  }
  return components.filter((c) => {
    if (c.archived) return false;
    const ops = opportunities.get(c.id);
    return ops && ops.length > 0;
  }).map((component) => ({
    component,
    matches: (opportunities.get(component.id) || []).sort((a, b) => b.similarity - a.similarity)
  })).sort((a, b) => b.matches.length - a.matches.length);
}
var REGISTRY_FILENAME = "registry.json";
var DEFAULT_MODULES_DIR = "src/modules";
function getRegistryPath(harnessRoot) {
  return path7__namespace.join(harnessRoot, DEFAULT_MODULES_DIR, REGISTRY_FILENAME);
}
function createEmptyRegistry() {
  return {
    version: "1.0.0",
    lastUpdated: (/* @__PURE__ */ new Date()).toISOString(),
    modules: [],
    componentToModule: {},
    exportToModule: {}
  };
}
function loadRegistry(harnessRoot) {
  const registryPath = getRegistryPath(harnessRoot);
  try {
    const data = loadJSON(registryPath);
    return data || createEmptyRegistry();
  } catch {
    return null;
  }
}
async function saveRegistry(harnessRoot, registry) {
  const registryPath = getRegistryPath(harnessRoot);
  registry.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
  const dir = path7__namespace.dirname(registryPath);
  if (!fs__namespace.existsSync(dir)) {
    fs__namespace.mkdirSync(dir, { recursive: true });
  }
  return saveJSONAtomic(registryPath, registry);
}
function rebuildIndexes(registry) {
  registry.componentToModule = {};
  registry.exportToModule = {};
  for (const module of registry.modules) {
    for (const exp of module.exports) {
      if (exp.componentId) {
        registry.componentToModule[exp.componentId] = module.path;
      }
      registry.exportToModule[exp.name] = module.path;
    }
  }
}
async function addComponentToRegistry(harnessRoot, component, options) {
  let registry = loadRegistry(harnessRoot);
  if (!registry) {
    registry = createEmptyRegistry();
  }
  let moduleEntry = registry.modules.find((m) => m.path === options.modulePath);
  if (!moduleEntry) {
    moduleEntry = {
      name: options.moduleName,
      path: options.modulePath,
      description: options.moduleDescription || `${options.moduleName} utilities`,
      exports: [],
      dependencies: options.dependencies || [],
      peerDependencies: options.peerDependencies || ["@playwright/test"],
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
    };
    registry.modules.push(moduleEntry);
  }
  const existingExport = moduleEntry.exports.find((e) => e.name === options.exportDetails.name);
  if (existingExport) {
    existingExport.componentId = component.id;
    existingExport.signature = options.exportDetails.signature;
    existingExport.description = options.exportDetails.description;
  } else {
    moduleEntry.exports.push({
      name: options.exportDetails.name,
      type: options.exportDetails.type,
      componentId: component.id,
      signature: options.exportDetails.signature,
      description: options.exportDetails.description
    });
  }
  moduleEntry.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
  rebuildIndexes(registry);
  return saveRegistry(harnessRoot, registry);
}
async function removeComponentFromRegistry(harnessRoot, componentId) {
  const registry = loadRegistry(harnessRoot);
  if (!registry) {
    return { success: false, error: "Registry not found" };
  }
  let found = false;
  for (const module of registry.modules) {
    const exportIndex = module.exports.findIndex((e) => e.componentId === componentId);
    if (exportIndex !== -1) {
      module.exports.splice(exportIndex, 1);
      module.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
      found = true;
      break;
    }
  }
  if (!found) {
    return { success: false, error: `Component ${componentId} not found in registry` };
  }
  rebuildIndexes(registry);
  return saveRegistry(harnessRoot, registry);
}
async function updateComponentInRegistry(harnessRoot, componentId, updates) {
  const registry = loadRegistry(harnessRoot);
  if (!registry) {
    return { success: false, error: "Registry not found" };
  }
  let found = false;
  for (const module of registry.modules) {
    const exportEntry = module.exports.find((e) => e.componentId === componentId);
    if (exportEntry) {
      if (updates.signature !== void 0) {
        exportEntry.signature = updates.signature;
      }
      if (updates.description !== void 0) {
        exportEntry.description = updates.description;
      }
      if (updates.type !== void 0) {
        exportEntry.type = updates.type;
      }
      module.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
      found = true;
      break;
    }
  }
  if (!found) {
    return { success: false, error: `Component ${componentId} not found in registry` };
  }
  return saveRegistry(harnessRoot, registry);
}
function getModuleForComponent(harnessRoot, componentId) {
  const registry = loadRegistry(harnessRoot);
  if (!registry) {
    return null;
  }
  const modulePath = registry.componentToModule[componentId];
  if (!modulePath) {
    return null;
  }
  const module = registry.modules.find((m) => m.path === modulePath);
  if (!module) {
    return null;
  }
  const exportEntry = module.exports.find((e) => e.componentId === componentId);
  if (!exportEntry) {
    return null;
  }
  return { module, export: exportEntry };
}
function getImportPath(harnessRoot, componentId) {
  const info = getModuleForComponent(harnessRoot, componentId);
  if (!info) {
    return null;
  }
  return `import { ${info.export.name} } from '@modules/${info.module.path}';`;
}
function listModules(harnessRoot) {
  const registry = loadRegistry(harnessRoot);
  return registry?.modules || [];
}
function findModulesByCategory(harnessRoot, category) {
  const registry = loadRegistry(harnessRoot);
  if (!registry) {
    return [];
  }
  return registry.modules.filter(
    (m) => m.path.includes(category) || m.name.includes(category)
  );
}
function validateRegistryConsistency(harnessRoot, components) {
  const registry = loadRegistry(harnessRoot);
  const result = {
    valid: true,
    missingInRegistry: [],
    missingInComponents: [],
    pathMismatches: []
  };
  if (!registry) {
    result.valid = false;
    result.missingInRegistry = components.filter((c) => !c.archived).map((c) => c.id);
    return result;
  }
  const registryComponentIds = /* @__PURE__ */ new Set();
  for (const module of registry.modules) {
    for (const exp of module.exports) {
      if (exp.componentId) {
        registryComponentIds.add(exp.componentId);
      }
    }
  }
  for (const component of components) {
    if (component.archived) continue;
    if (!registryComponentIds.has(component.id)) {
      result.missingInRegistry.push(component.id);
      result.valid = false;
    } else {
      const modulePath = registry.componentToModule[component.id];
      if (modulePath && !component.filePath.includes(modulePath)) {
        result.pathMismatches.push({
          componentId: component.id,
          registryPath: modulePath,
          componentPath: component.filePath
        });
        result.valid = false;
      }
    }
  }
  const componentIds = new Set(components.map((c) => c.id));
  for (const componentId of registryComponentIds) {
    if (!componentIds.has(componentId)) {
      result.missingInComponents.push(componentId);
      result.valid = false;
    }
  }
  return result;
}
async function syncRegistryWithComponents(harnessRoot, components) {
  const validation = validateRegistryConsistency(harnessRoot, components);
  let registry = loadRegistry(harnessRoot);
  if (!registry) {
    registry = createEmptyRegistry();
  }
  let added = 0;
  let removed = 0;
  for (const staleId of validation.missingInComponents) {
    for (const module of registry.modules) {
      const index = module.exports.findIndex((e) => e.componentId === staleId);
      if (index !== -1) {
        module.exports.splice(index, 1);
        removed++;
      }
    }
  }
  registry.modules = registry.modules.filter((m) => m.exports.length > 0);
  added = validation.missingInRegistry.length;
  rebuildIndexes(registry);
  const saveResult = await saveRegistry(harnessRoot, registry);
  return {
    ...saveResult,
    added,
    removed
  };
}
var CURRENT_VERSION = "1.0.0";
var MIN_SUPPORTED_VERSION = "0.1.0";
function parseVersion(version) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) {
    return { major: 0, minor: 0, patch: 0, full: "0.0.0" };
  }
  const major = match[1] || "0";
  const minor = match[2] || "0";
  const patch = match[3] || "0";
  return {
    major: parseInt(major, 10),
    minor: parseInt(minor, 10),
    patch: parseInt(patch, 10),
    full: `${major}.${minor}.${patch}`
  };
}
function compareVersions(a, b) {
  const va = parseVersion(a);
  const vb = parseVersion(b);
  if (va.major !== vb.major) return va.major < vb.major ? -1 : 1;
  if (va.minor !== vb.minor) return va.minor < vb.minor ? -1 : 1;
  if (va.patch !== vb.patch) return va.patch < vb.patch ? -1 : 1;
  return 0;
}
function isVersionSupported(version) {
  return compareVersions(version, MIN_SUPPORTED_VERSION) >= 0;
}
function needsMigration(version) {
  return compareVersions(version, CURRENT_VERSION) < 0;
}
var migrations = /* @__PURE__ */ new Map();
migrations.set("0.x->1.0.0", async (data, _llkbRoot) => {
  const warnings = [];
  if (data.lessons && Array.isArray(data.lessons)) {
    data.lessons = data.lessons.map((lesson) => {
      if (!lesson.metrics) {
        lesson.metrics = {
          occurrences: lesson.occurrences || 0,
          successRate: lesson.successRate || 0.5,
          confidence: lesson.confidence || 0.5,
          firstSeen: lesson.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
          lastSuccess: null,
          lastApplied: null
        };
        warnings.push(`Added missing metrics to lesson ${lesson.id}`);
      }
      if (!lesson.validation) {
        lesson.validation = {
          humanReviewed: false
        };
      }
      if (lesson.created && !lesson.metrics.firstSeen) {
        lesson.metrics.firstSeen = lesson.created;
        delete lesson.created;
      }
      return lesson;
    });
  }
  if (data.components && Array.isArray(data.components)) {
    data.components = data.components.map((component) => {
      if (!component.metrics) {
        component.metrics = {
          totalUses: component.uses || 0,
          successRate: 1,
          lastUsed: null
        };
        delete component.uses;
        warnings.push(`Added missing metrics to component ${component.id}`);
      }
      if (!component.source) {
        component.source = {
          originalCode: component.code || "",
          extractedFrom: component.journeyId || "unknown",
          extractedBy: "journey-verify",
          extractedAt: component.createdAt || (/* @__PURE__ */ new Date()).toISOString()
        };
        delete component.code;
        delete component.journeyId;
        warnings.push(`Added missing source info to component ${component.id}`);
      }
      return component;
    });
  }
  data.version = "1.0.0";
  data.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
  return { data, warnings };
});
function getMigrationPath(fromVersion, toVersion) {
  const from = parseVersion(fromVersion);
  const to = parseVersion(toVersion);
  const path8 = [];
  if (from.major === 0 && to.major >= 1) {
    path8.push("0.x->1.0.0");
  }
  return path8;
}
async function applyMigration(data, migrationKey, llkbRoot) {
  const migrationFn = migrations.get(migrationKey);
  if (!migrationFn) {
    return { data, warnings: [`No migration found for ${migrationKey}`] };
  }
  return migrationFn(data, llkbRoot);
}
async function migrateFile(filePath, llkbRoot) {
  try {
    const data = loadJSON(filePath);
    if (!data) {
      return { success: false, warnings: [], error: `Could not read ${filePath}` };
    }
    const currentVersion = data.version || "0.0.0";
    if (!needsMigration(currentVersion)) {
      return { success: true, warnings: ["Already at current version"] };
    }
    if (!isVersionSupported(currentVersion)) {
      return {
        success: false,
        warnings: [],
        error: `Version ${currentVersion} is not supported (min: ${MIN_SUPPORTED_VERSION})`
      };
    }
    const migrationPath = getMigrationPath(currentVersion, CURRENT_VERSION);
    let migratedData = data;
    const allWarnings = [];
    for (const migrationKey of migrationPath) {
      const result = await applyMigration(migratedData, migrationKey, llkbRoot);
      migratedData = result.data;
      allWarnings.push(...result.warnings);
    }
    const backupPath = `${filePath}.backup.${Date.now()}`;
    fs__namespace.copyFileSync(filePath, backupPath);
    const saveResult = await saveJSONAtomic(filePath, migratedData);
    if (!saveResult.success) {
      fs__namespace.copyFileSync(backupPath, filePath);
      return { success: false, warnings: allWarnings, error: saveResult.error };
    }
    fs__namespace.unlinkSync(backupPath);
    return { success: true, warnings: allWarnings };
  } catch (error) {
    return {
      success: false,
      warnings: [],
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
async function migrateLLKB(llkbRoot) {
  const result = {
    success: true,
    migratedFiles: [],
    errors: [],
    warnings: [],
    fromVersion: "0.0.0",
    toVersion: CURRENT_VERSION
  };
  const files = [
    path7__namespace.join(llkbRoot, "lessons.json"),
    path7__namespace.join(llkbRoot, "components.json"),
    path7__namespace.join(llkbRoot, "analytics.json")
  ];
  const lessonsPath = path7__namespace.join(llkbRoot, "lessons.json");
  if (fs__namespace.existsSync(lessonsPath)) {
    const lessonsData = loadJSON(lessonsPath);
    result.fromVersion = lessonsData?.version || "0.0.0";
  }
  for (const file of files) {
    if (!fs__namespace.existsSync(file)) {
      result.warnings.push(`File not found: ${file}`);
      continue;
    }
    const migrationResult = await migrateFile(file, llkbRoot);
    if (migrationResult.success) {
      result.migratedFiles.push(file);
    } else {
      result.success = false;
      if (migrationResult.error) {
        result.errors.push(`${file}: ${migrationResult.error}`);
      }
    }
    result.warnings.push(...migrationResult.warnings.map((w) => `${path7__namespace.basename(file)}: ${w}`));
  }
  return result;
}
function checkMigrationNeeded(llkbRoot) {
  const lessonsPath = path7__namespace.join(llkbRoot, "lessons.json");
  if (!fs__namespace.existsSync(lessonsPath)) {
    return {
      needsMigration: false,
      currentVersion: CURRENT_VERSION,
      targetVersion: CURRENT_VERSION,
      supported: true
    };
  }
  const lessonsData = loadJSON(lessonsPath);
  const currentVersion = lessonsData?.version || "0.0.0";
  return {
    needsMigration: needsMigration(currentVersion),
    currentVersion,
    targetVersion: CURRENT_VERSION,
    supported: isVersionSupported(currentVersion)
  };
}
async function initializeLLKB(llkbRoot) {
  try {
    ensureDir(llkbRoot);
    ensureDir(path7__namespace.join(llkbRoot, "patterns"));
    ensureDir(path7__namespace.join(llkbRoot, "history"));
    const configPath = path7__namespace.join(llkbRoot, "config.yml");
    if (!fs__namespace.existsSync(configPath)) {
      const defaultConfig = `# LLKB Configuration
version: "1.0.0"
enabled: true

extraction:
  minOccurrences: 2
  predictiveExtraction: true
  confidenceThreshold: 0.7
  maxPredictivePerJourney: 3
  maxPredictivePerDay: 10
  minLinesForExtraction: 3
  similarityThreshold: 0.8

retention:
  maxLessonAge: 90
  minSuccessRate: 0.6
  archiveUnused: 30

history:
  retentionDays: 365

injection:
  prioritizeByConfidence: true

scopes:
  universal: true
  frameworkSpecific: true
  appSpecific: true

overrides:
  allowUserOverride: true
  logOverrides: true
  flagAfterOverrides: 3
`;
      fs__namespace.writeFileSync(configPath, defaultConfig, "utf-8");
    }
    const lessonsPath = path7__namespace.join(llkbRoot, "lessons.json");
    if (!fs__namespace.existsSync(lessonsPath)) {
      const defaultLessons = {
        version: CURRENT_VERSION,
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString(),
        lessons: [],
        archived: [],
        globalRules: [],
        appQuirks: []
      };
      await saveJSONAtomic(lessonsPath, defaultLessons);
    }
    const componentsPath = path7__namespace.join(llkbRoot, "components.json");
    if (!fs__namespace.existsSync(componentsPath)) {
      const defaultComponents = {
        version: CURRENT_VERSION,
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString(),
        components: [],
        componentsByCategory: {
          selector: [],
          timing: [],
          auth: [],
          data: [],
          assertion: [],
          navigation: [],
          "ui-interaction": []
        },
        componentsByScope: {
          universal: [],
          "framework:angular": [],
          "framework:react": [],
          "framework:vue": [],
          "framework:ag-grid": [],
          "app-specific": []
        }
      };
      await saveJSONAtomic(componentsPath, defaultComponents);
    }
    const analyticsPath = path7__namespace.join(llkbRoot, "analytics.json");
    if (!fs__namespace.existsSync(analyticsPath)) {
      const defaultAnalytics = createEmptyAnalytics();
      await saveJSONAtomic(analyticsPath, defaultAnalytics);
    }
    const patternFiles = ["selectors.json", "timing.json", "assertions.json", "auth.json", "data.json"];
    for (const patternFile of patternFiles) {
      const patternPath = path7__namespace.join(llkbRoot, "patterns", patternFile);
      if (!fs__namespace.existsSync(patternPath)) {
        await saveJSONAtomic(patternPath, {
          version: CURRENT_VERSION,
          patterns: []
        });
      }
    }
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
function validateLLKBInstallation(llkbRoot) {
  const result = {
    valid: true,
    missingFiles: [],
    invalidFiles: [],
    version: CURRENT_VERSION
  };
  const requiredFiles = [
    "config.yml",
    "lessons.json",
    "components.json",
    "analytics.json"
  ];
  for (const file of requiredFiles) {
    const filePath = path7__namespace.join(llkbRoot, file);
    if (!fs__namespace.existsSync(filePath)) {
      result.missingFiles.push(file);
      result.valid = false;
    } else if (file.endsWith(".json")) {
      try {
        const data = loadJSON(filePath);
        if (!data || !data.version) {
          result.invalidFiles.push(file);
          result.valid = false;
        } else if (file === "lessons.json") {
          result.version = data.version;
        }
      } catch {
        result.invalidFiles.push(file);
        result.valid = false;
      }
    }
  }
  const patternsDir = path7__namespace.join(llkbRoot, "patterns");
  if (!fs__namespace.existsSync(patternsDir)) {
    result.missingFiles.push("patterns/");
    result.valid = false;
  }
  return result;
}
function calculateTextRelevance(text, query) {
  if (!query) return 1;
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const queryWords = lowerQuery.split(/\s+/).filter((w) => w.length > 1);
  if (queryWords.length === 0) return 1;
  if (lowerText.includes(lowerQuery)) {
    return 1;
  }
  let matchedWords = 0;
  for (const word of queryWords) {
    if (lowerText.includes(word)) {
      matchedWords++;
    }
  }
  return matchedWords / queryWords.length;
}
function searchLessons(lessons, query) {
  return lessons.filter((lesson) => {
    if (!query.includeArchived && lesson.archived) {
      return false;
    }
    if (query.category && lesson.category !== query.category) {
      return false;
    }
    if (query.scope && lesson.scope !== query.scope) {
      return false;
    }
    if (query.tags && query.tags.length > 0) {
      const lessonTags = lesson.tags || [];
      if (!query.tags.some((t) => lessonTags.includes(t))) {
        return false;
      }
    }
    if (query.minConfidence !== void 0) {
      if (lesson.metrics.confidence < query.minConfidence) {
        return false;
      }
    }
    if (query.journeyId && !lesson.journeyIds.includes(query.journeyId)) {
      return false;
    }
    return true;
  }).map((lesson) => {
    const searchText = `${lesson.title} ${lesson.pattern} ${lesson.trigger}`;
    const relevance = calculateTextRelevance(searchText, query.text || "");
    return {
      type: "lesson",
      id: lesson.id,
      title: lesson.title,
      description: lesson.pattern,
      category: lesson.category,
      scope: lesson.scope,
      relevance,
      item: lesson
    };
  }).filter((result) => result.relevance > 0.1);
}
function searchComponents(components, query) {
  return components.filter((component) => {
    if (!query.includeArchived && component.archived) {
      return false;
    }
    if (query.category && component.category !== query.category) {
      return false;
    }
    if (query.scope && component.scope !== query.scope) {
      return false;
    }
    return true;
  }).map((component) => {
    const searchText = `${component.name} ${component.description}`;
    const relevance = calculateTextRelevance(searchText, query.text || "");
    return {
      type: "component",
      id: component.id,
      title: component.name,
      description: component.description,
      category: component.category,
      scope: component.scope,
      relevance,
      item: component
    };
  }).filter((result) => result.relevance > 0.1);
}
function search(llkbRoot, query) {
  const lessons = loadLessons(llkbRoot, { includeArchived: query.includeArchived });
  const components = loadComponents(llkbRoot, { includeArchived: query.includeArchived });
  const lessonResults = searchLessons(lessons, query);
  const componentResults = searchComponents(components, query);
  const allResults = [...lessonResults, ...componentResults];
  allResults.sort((a, b) => b.relevance - a.relevance);
  if (query.limit && query.limit > 0) {
    return allResults.slice(0, query.limit);
  }
  return allResults;
}
function findLessonsByPattern(llkbRoot, pattern) {
  const lessons = loadLessons(llkbRoot);
  return lessons.filter((lesson) => {
    const lowerPattern = pattern.toLowerCase();
    const lowerLessonPattern = lesson.pattern.toLowerCase();
    const lowerTrigger = lesson.trigger.toLowerCase();
    return lowerLessonPattern.includes(lowerPattern) || lowerTrigger.includes(lowerPattern);
  });
}
function findComponents(llkbRoot, searchTerm) {
  const components = loadComponents(llkbRoot);
  const lowerSearch = searchTerm.toLowerCase();
  return components.filter((component) => {
    return component.name.toLowerCase().includes(lowerSearch) || component.description.toLowerCase().includes(lowerSearch);
  });
}
function getLessonsForJourney(llkbRoot, journeyId) {
  const lessons = loadLessons(llkbRoot);
  return lessons.filter((lesson) => lesson.journeyIds.includes(journeyId));
}
function getComponentsForJourney(llkbRoot, journeyId) {
  const components = loadComponents(llkbRoot);
  return components.filter(
    (component) => component.source.extractedFrom === journeyId
  );
}
function exportLessonsToMarkdown(lessons, includeMetrics) {
  let md = "# Lessons\n\n";
  const byCategory = /* @__PURE__ */ new Map();
  for (const lesson of lessons) {
    const category = lesson.category;
    if (!byCategory.has(category)) {
      byCategory.set(category, []);
    }
    byCategory.get(category).push(lesson);
  }
  for (const [category, categoryLessons] of byCategory) {
    md += `## ${category.charAt(0).toUpperCase() + category.slice(1)}

`;
    for (const lesson of categoryLessons) {
      md += `### ${lesson.id}: ${lesson.title}

`;
      md += `**Trigger:** ${lesson.trigger}

`;
      md += `**Pattern:** ${lesson.pattern}

`;
      md += `**Scope:** ${lesson.scope}

`;
      if (includeMetrics) {
        md += `**Metrics:**
`;
        md += `- Occurrences: ${lesson.metrics.occurrences}
`;
        md += `- Success Rate: ${(lesson.metrics.successRate * 100).toFixed(1)}%
`;
        md += `- Confidence: ${(lesson.metrics.confidence * 100).toFixed(1)}%
`;
        md += "\n";
      }
      md += "---\n\n";
    }
  }
  return md;
}
function exportComponentsToMarkdown(components, includeMetrics, includeSource) {
  let md = "# Components\n\n";
  const byCategory = /* @__PURE__ */ new Map();
  for (const component of components) {
    const category = component.category;
    if (!byCategory.has(category)) {
      byCategory.set(category, []);
    }
    byCategory.get(category).push(component);
  }
  for (const [category, categoryComponents] of byCategory) {
    md += `## ${category.charAt(0).toUpperCase() + category.slice(1)}

`;
    for (const component of categoryComponents) {
      md += `### ${component.id}: ${component.name}

`;
      md += `${component.description}

`;
      md += `**File:** \`${component.filePath}\`

`;
      md += `**Scope:** ${component.scope}

`;
      if (includeMetrics) {
        md += `**Metrics:**
`;
        md += `- Total Uses: ${component.metrics.totalUses}
`;
        md += `- Success Rate: ${(component.metrics.successRate * 100).toFixed(1)}%
`;
        md += "\n";
      }
      if (includeSource && component.source.originalCode) {
        md += "**Original Code:**\n\n";
        md += "```typescript\n";
        md += component.source.originalCode;
        md += "\n```\n\n";
      }
      md += "---\n\n";
    }
  }
  return md;
}
function exportLessonsToCSV(lessons) {
  const headers = [
    "ID",
    "Title",
    "Category",
    "Scope",
    "Trigger",
    "Pattern",
    "Occurrences",
    "Success Rate",
    "Confidence"
  ];
  const rows = lessons.map((lesson) => [
    lesson.id,
    `"${lesson.title.replace(/"/g, '""')}"`,
    lesson.category,
    lesson.scope,
    `"${lesson.trigger.replace(/"/g, '""')}"`,
    `"${lesson.pattern.replace(/"/g, '""')}"`,
    lesson.metrics.occurrences.toString(),
    lesson.metrics.successRate.toFixed(3),
    lesson.metrics.confidence.toFixed(3)
  ]);
  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}
function exportComponentsToCSV(components) {
  const headers = [
    "ID",
    "Name",
    "Category",
    "Scope",
    "File Path",
    "Description",
    "Total Uses",
    "Success Rate",
    "Extracted From"
  ];
  const rows = components.map((component) => [
    component.id,
    component.name,
    component.category,
    component.scope,
    `"${component.filePath}"`,
    `"${component.description.replace(/"/g, '""')}"`,
    component.metrics.totalUses.toString(),
    component.metrics.successRate.toFixed(3),
    component.source.extractedFrom
  ]);
  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}
function exportLLKB(llkbRoot, options) {
  const lessons = loadLessons(llkbRoot, {
    includeArchived: options.includeArchived,
    category: options.categories,
    scope: options.scopes
  });
  const components = loadComponents(llkbRoot, {
    includeArchived: options.includeArchived,
    category: options.categories,
    scope: options.scopes
  });
  switch (options.format) {
    case "markdown":
      return [
        exportLessonsToMarkdown(lessons, options.includeMetrics || false),
        exportComponentsToMarkdown(
          components,
          options.includeMetrics || false,
          options.includeSource || false
        )
      ].join("\n\n");
    case "csv":
      return [
        "# Lessons",
        exportLessonsToCSV(lessons),
        "",
        "# Components",
        exportComponentsToCSV(components)
      ].join("\n");
    case "json":
    default:
      return JSON.stringify(
        {
          exported: (/* @__PURE__ */ new Date()).toISOString(),
          lessons,
          components
        },
        null,
        2
      );
  }
}
function generateReport(llkbRoot) {
  loadLLKBConfig(llkbRoot);
  const lessons = loadLessons(llkbRoot);
  const components = loadComponents(llkbRoot);
  const appProfile = loadAppProfile(llkbRoot);
  const archivedLessons = loadLessons(llkbRoot, { includeArchived: true }).filter(
    (l) => l.archived
  ).length;
  const archivedComponents = loadComponents(llkbRoot, { includeArchived: true }).filter(
    (c) => c.archived
  ).length;
  const avgConfidence = lessons.length > 0 ? lessons.reduce((sum, l) => sum + l.metrics.confidence, 0) / lessons.length : 0;
  const avgSuccessRate = lessons.length > 0 ? lessons.reduce((sum, l) => sum + l.metrics.successRate, 0) / lessons.length : 0;
  const totalComponentUses = components.reduce(
    (sum, c) => sum + c.metrics.totalUses,
    0
  );
  const lessonsByCategory = /* @__PURE__ */ new Map();
  for (const lesson of lessons) {
    const count = lessonsByCategory.get(lesson.category) || 0;
    lessonsByCategory.set(lesson.category, count + 1);
  }
  const componentsByCategory = /* @__PURE__ */ new Map();
  for (const component of components) {
    const count = componentsByCategory.get(component.category) || 0;
    componentsByCategory.set(component.category, count + 1);
  }
  let report = "# LLKB Status Report\n\n";
  report += `**Generated:** ${(/* @__PURE__ */ new Date()).toISOString()}

`;
  if (appProfile) {
    report += "## Application Profile\n\n";
    report += `- **Framework:** ${appProfile.application.framework}
`;
    report += `- **UI Library:** ${appProfile.application.uiLibrary}
`;
    report += `- **Data Grid:** ${appProfile.application.dataGrid}
`;
    report += "\n";
  }
  report += "## Overview\n\n";
  report += `| Metric | Value |
`;
  report += `|--------|-------|
`;
  report += `| Active Lessons | ${lessons.length} |
`;
  report += `| Archived Lessons | ${archivedLessons} |
`;
  report += `| Active Components | ${components.length} |
`;
  report += `| Archived Components | ${archivedComponents} |
`;
  report += `| Avg. Lesson Confidence | ${(avgConfidence * 100).toFixed(1)}% |
`;
  report += `| Avg. Lesson Success Rate | ${(avgSuccessRate * 100).toFixed(1)}% |
`;
  report += `| Total Component Uses | ${totalComponentUses} |
`;
  report += "\n";
  report += "## Lessons by Category\n\n";
  report += `| Category | Count |
`;
  report += `|----------|-------|
`;
  for (const [category, count] of lessonsByCategory) {
    report += `| ${category} | ${count} |
`;
  }
  report += "\n";
  report += "## Components by Category\n\n";
  report += `| Category | Count |
`;
  report += `|----------|-------|
`;
  for (const [category, count] of componentsByCategory) {
    report += `| ${category} | ${count} |
`;
  }
  report += "\n";
  const topLessons = [...lessons].sort((a, b) => b.metrics.confidence - a.metrics.confidence).slice(0, 5);
  if (topLessons.length > 0) {
    report += "## Top Lessons (by Confidence)\n\n";
    for (const lesson of topLessons) {
      report += `- **${lesson.id}** - ${lesson.title} (${(lesson.metrics.confidence * 100).toFixed(0)}%)
`;
    }
    report += "\n";
  }
  const topComponents = [...components].sort((a, b) => b.metrics.totalUses - a.metrics.totalUses).slice(0, 5);
  if (topComponents.length > 0) {
    report += "## Most Used Components\n\n";
    for (const component of topComponents) {
      report += `- **${component.id}** - ${component.name} (${component.metrics.totalUses} uses)
`;
    }
    report += "\n";
  }
  const lowConfidence = lessons.filter((l) => l.metrics.confidence < 0.4);
  if (lowConfidence.length > 0) {
    report += "## Needs Review (Low Confidence)\n\n";
    for (const lesson of lowConfidence.slice(0, 5)) {
      report += `- **${lesson.id}** - ${lesson.title} (${(lesson.metrics.confidence * 100).toFixed(0)}%)
`;
    }
    report += "\n";
  }
  return report;
}
async function exportToFile(llkbRoot, outputPath, options) {
  const content = exportLLKB(llkbRoot, options);
  fs__namespace.writeFileSync(outputPath, content, "utf-8");
}

exports.CONFIDENCE_HISTORY_RETENTION_DAYS = CONFIDENCE_HISTORY_RETENTION_DAYS;
exports.CURRENT_VERSION = CURRENT_VERSION;
exports.DEFAULT_LLKB_ROOT = DEFAULT_LLKB_ROOT;
exports.LOCK_MAX_WAIT_MS = LOCK_MAX_WAIT_MS;
exports.LOCK_RETRY_INTERVAL_MS = LOCK_RETRY_INTERVAL_MS;
exports.MAX_CONFIDENCE_HISTORY_ENTRIES = MAX_CONFIDENCE_HISTORY_ENTRIES;
exports.MIN_SUPPORTED_VERSION = MIN_SUPPORTED_VERSION;
exports.STALE_LOCK_THRESHOLD_MS = STALE_LOCK_THRESHOLD_MS;
exports.addComponentToRegistry = addComponentToRegistry;
exports.appendToHistory = appendToHistory;
exports.calculateConfidence = calculateConfidence;
exports.calculateSimilarity = calculateSimilarity;
exports.checkMigrationNeeded = checkMigrationNeeded;
exports.cleanupOldHistoryFiles = cleanupOldHistoryFiles;
exports.compareVersions = compareVersions;
exports.countJourneyExtractionsToday = countJourneyExtractionsToday;
exports.countLines = countLines;
exports.countPredictiveExtractionsToday = countPredictiveExtractionsToday;
exports.countTodayEvents = countTodayEvents;
exports.createEmptyAnalytics = createEmptyAnalytics;
exports.createEmptyRegistry = createEmptyRegistry;
exports.daysBetween = daysBetween;
exports.detectDecliningConfidence = detectDecliningConfidence;
exports.detectDuplicatesAcrossFiles = detectDuplicatesAcrossFiles;
exports.detectDuplicatesInFile = detectDuplicatesInFile;
exports.ensureDir = ensureDir;
exports.exportLLKB = exportLLKB;
exports.exportToFile = exportToFile;
exports.extractKeywords = extractKeywords;
exports.extractStepKeywords = extractStepKeywords;
exports.findComponents = findComponents;
exports.findExtractionCandidates = findExtractionCandidates;
exports.findLessonsByPattern = findLessonsByPattern;
exports.findModulesByCategory = findModulesByCategory;
exports.findNearDuplicates = findNearDuplicates;
exports.findSimilarPatterns = findSimilarPatterns;
exports.findUnusedComponentOpportunities = findUnusedComponentOpportunities;
exports.formatContextForPrompt = formatContextForPrompt;
exports.formatDate = formatDate;
exports.formatHealthCheck = formatHealthCheck;
exports.formatPruneResult = formatPruneResult;
exports.formatStats = formatStats;
exports.generateReport = generateReport;
exports.getAllCategories = getAllCategories;
exports.getAnalyticsSummary = getAnalyticsSummary;
exports.getComponentCategories = getComponentCategories;
exports.getComponentsForJourney = getComponentsForJourney;
exports.getConfidenceTrend = getConfidenceTrend;
exports.getHistoryDir = getHistoryDir;
exports.getHistoryFilePath = getHistoryFilePath;
exports.getHistoryFilesInRange = getHistoryFilesInRange;
exports.getImportPath = getImportPath;
exports.getLessonsForJourney = getLessonsForJourney;
exports.getModuleForComponent = getModuleForComponent;
exports.getRelevantContext = getRelevantContext;
exports.getRelevantScopes = getRelevantScopes;
exports.getStats = getStats;
exports.hashCode = hashCode;
exports.inferCategory = inferCategory;
exports.inferCategoryWithConfidence = inferCategoryWithConfidence;
exports.initializeLLKB = initializeLLKB;
exports.isComponentCategory = isComponentCategory;
exports.isDailyRateLimitReached = isDailyRateLimitReached;
exports.isJourneyRateLimitReached = isJourneyRateLimitReached;
exports.isLLKBEnabled = isLLKBEnabled;
exports.isNearDuplicate = isNearDuplicate;
exports.isVersionSupported = isVersionSupported;
exports.jaccardSimilarity = jaccardSimilarity;
exports.lineCountSimilarity = lineCountSimilarity;
exports.listModules = listModules;
exports.llkbExists = llkbExists;
exports.loadAppProfile = loadAppProfile;
exports.loadComponents = loadComponents;
exports.loadJSON = loadJSON;
exports.loadLLKBConfig = loadLLKBConfig;
exports.loadLLKBData = loadLLKBData;
exports.loadLessons = loadLessons;
exports.loadPatterns = loadPatterns;
exports.loadRegistry = loadRegistry;
exports.matchStepsToComponents = matchStepsToComponents;
exports.migrateLLKB = migrateLLKB;
exports.needsConfidenceReview = needsConfidenceReview;
exports.needsMigration = needsMigration;
exports.normalizeCode = normalizeCode;
exports.parseVersion = parseVersion;
exports.prune = prune;
exports.readHistoryFile = readHistoryFile;
exports.readTodayHistory = readTodayHistory;
exports.removeComponentFromRegistry = removeComponentFromRegistry;
exports.runHealthCheck = runHealthCheck;
exports.saveJSONAtomic = saveJSONAtomic;
exports.saveJSONAtomicSync = saveJSONAtomicSync;
exports.saveRegistry = saveRegistry;
exports.search = search;
exports.shouldExtractAsComponent = shouldExtractAsComponent;
exports.syncRegistryWithComponents = syncRegistryWithComponents;
exports.tokenize = tokenize;
exports.updateAnalytics = updateAnalytics;
exports.updateAnalyticsWithData = updateAnalyticsWithData;
exports.updateComponentInRegistry = updateComponentInRegistry;
exports.updateConfidenceHistory = updateConfidenceHistory;
exports.updateJSONWithLock = updateJSONWithLock;
exports.updateJSONWithLockSync = updateJSONWithLockSync;
exports.validateLLKBInstallation = validateLLKBInstallation;
exports.validateRegistryConsistency = validateRegistryConsistency;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map