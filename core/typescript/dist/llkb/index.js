import * as fs from 'fs';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import * as path9 from 'path';
import { join } from 'path';

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
    const dir = path9.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const content = JSON.stringify(data, null, 2);
    fs.writeFileSync(tempPath, content, "utf-8");
    fs.renameSync(tempPath, filePath);
    return { success: true };
  } catch (error) {
    try {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
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
    const dir = path9.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const content = JSON.stringify(data, null, 2);
    fs.writeFileSync(tempPath, content, "utf-8");
    fs.renameSync(tempPath, filePath);
    return { success: true };
  } catch (error) {
    try {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
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
    if (fs.existsSync(lockPath)) {
      const lockStat = fs.statSync(lockPath);
      const lockAge = now - lockStat.mtimeMs;
      if (lockAge > STALE_LOCK_THRESHOLD_MS) {
        fs.unlinkSync(lockPath);
      } else {
        return false;
      }
    }
    fs.writeFileSync(lockPath, String(now), { flag: "wx" });
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
    if (fs.existsSync(lockPath)) {
      fs.unlinkSync(lockPath);
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
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, "utf-8");
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
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, "utf-8");
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
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    throw new Error(
      `Failed to load JSON from ${filePath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
var DEFAULT_LLKB_ROOT = ".artk/llkb";
function getHistoryDir(llkbRoot = DEFAULT_LLKB_ROOT) {
  return path9.join(llkbRoot, "history");
}
function getHistoryFilePath(date = /* @__PURE__ */ new Date(), llkbRoot = DEFAULT_LLKB_ROOT) {
  const dateStr = formatDate(date);
  return path9.join(getHistoryDir(llkbRoot), `${dateStr}.jsonl`);
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
    fs.appendFileSync(filePath, line, "utf-8");
    return true;
  } catch (error) {
    console.warn(
      `[LLKB] Failed to append to history: ${error instanceof Error ? error.message : String(error)}`
    );
    return false;
  }
}
function readHistoryFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const content = fs.readFileSync(filePath, "utf-8");
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
  if (!fs.existsSync(historyDir)) {
    return [];
  }
  const files = fs.readdirSync(historyDir).filter((f) => f.endsWith(".jsonl"));
  const results = [];
  for (const file of files) {
    const match = file.match(/^(\d{4}-\d{2}-\d{2})\.jsonl$/);
    if (match?.[1]) {
      const fileDate = new Date(match[1]);
      if (fileDate >= startDate && fileDate <= endDate) {
        results.push(path9.join(historyDir, file));
      }
    }
  }
  return results.sort();
}
function cleanupOldHistoryFiles(retentionDays = 365, llkbRoot = DEFAULT_LLKB_ROOT) {
  const historyDir = getHistoryDir(llkbRoot);
  if (!fs.existsSync(historyDir)) {
    return [];
  }
  const files = fs.readdirSync(historyDir).filter((f) => f.endsWith(".jsonl"));
  const now = /* @__PURE__ */ new Date();
  const cutoffDate = /* @__PURE__ */ new Date();
  cutoffDate.setDate(now.getDate() - retentionDays);
  const deleted = [];
  for (const file of files) {
    const match = file.match(/^(\d{4}-\d{2}-\d{2})\.jsonl$/);
    if (match?.[1]) {
      const fileDate = new Date(match[1]);
      if (fileDate < cutoffDate) {
        const filePath = path9.join(historyDir, file);
        fs.unlinkSync(filePath);
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
    const lessonsPath = path9.join(llkbRoot, "lessons.json");
    const componentsPath = path9.join(llkbRoot, "components.json");
    const analyticsPath = path9.join(llkbRoot, "analytics.json");
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
  const analyticsPath = path9.join(llkbRoot, "analytics.json");
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
  const configPath = join(llkbRoot, "config.yml");
  if (!existsSync(configPath)) {
    return { ...DEFAULT_LLKB_CONFIG };
  }
  try {
    const content = readFileSync(configPath, "utf-8");
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
  if (!existsSync(llkbRoot)) {
    return false;
  }
  const config = loadLLKBConfig(llkbRoot);
  return config.enabled;
}
function loadAppProfile(llkbRoot = ".artk/llkb") {
  const profilePath = join(llkbRoot, "app-profile.json");
  return loadJSON(profilePath);
}
function loadLessonsFile(llkbRoot = ".artk/llkb") {
  const lessonsPath = join(llkbRoot, "lessons.json");
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
  const componentsPath = join(llkbRoot, "components.json");
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
  const patternsDir = join(llkbRoot, "patterns");
  if (!existsSync(patternsDir)) {
    return {};
  }
  const patterns = {};
  const selectorPatterns = loadJSON(join(patternsDir, "selectors.json"));
  if (selectorPatterns) {
    patterns.selectors = selectorPatterns;
  }
  const timingPatterns = loadJSON(join(patternsDir, "timing.json"));
  if (timingPatterns) {
    patterns.timing = timingPatterns;
  }
  const assertionPatterns = loadJSON(join(patternsDir, "assertions.json"));
  if (assertionPatterns) {
    patterns.assertions = assertionPatterns;
  }
  const dataPatterns = loadJSON(join(patternsDir, "data.json"));
  if (dataPatterns) {
    patterns.data = dataPatterns;
  }
  const authPatterns = loadJSON(join(patternsDir, "auth.json"));
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
  return existsSync(llkbRoot) && existsSync(join(llkbRoot, "config.yml"));
}

// llkb/constants.ts
var CONFIDENCE = {
  DEFAULT_WEIGHT: 0.5};
var TIMEOUTS = {
  SHORT_MS: 300,
  MEDIUM_MS: 1e3,
  LONG_MS: 2e3
};
var TABLE = {
  COLUMN_WIDTH: 50
};
var TIME = {
  MS_PER_SECOND: 1e3,
  SECONDS_PER_MINUTE: 60,
  MINUTES_PER_HOUR: 60,
  HOURS_PER_DAY: 24
};
var LIMITS = {
  MAX_RECENT_ITEMS: 5,
  DEFAULT_RETENTION_DAYS: 30
};
var PERCENTAGES = {
  FULL: 100
};

// llkb/adapter-transforms.ts
function categoryToPrimitiveType(category) {
  switch (category) {
    case "navigation":
      return "navigate";
    case "timing":
      return "wait";
    case "assertion":
      return "assert";
    case "selector":
    case "ui-interaction":
      return "click";
    default:
      return "callModule";
  }
}
function inferModuleFromCategory(category) {
  switch (category) {
    case "selector":
      return "selectors";
    case "timing":
      return "timing";
    case "auth":
      return "auth";
    case "data":
      return "data";
    case "assertion":
      return "assertions";
    case "navigation":
      return "navigation";
    case "ui-interaction":
      return "ui";
    default:
      return "helpers";
  }
}
function triggerToRegex(trigger) {
  if (!trigger || trigger.trim().length === 0) {
    return null;
  }
  let pattern = trigger.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\bthe\\b/gi, "(?:the\\s+)?").replace(/\\ba\\b/gi, "(?:a\\s+)?").replace(/\\ban\\b/gi, "(?:an\\s+)?");
  pattern = pattern.replace(/\s+/g, "\\s+");
  pattern = `(?i)${pattern}`;
  return pattern;
}
function componentNameToTrigger(name) {
  const words = name.replace(/([A-Z])/g, " $1").replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase().trim().split(/\s+/);
  const pattern = words.map((word) => {
    if (word === "ag" || word === "aggrid") {
      return "(?:ag-?)?grid";
    }
    return word;
  }).join("\\s+");
  return `(?:${pattern})`;
}
function generateNameVariations(name) {
  const variations = [];
  const words = name.replace(/([A-Z])/g, " $1").replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase().trim();
  variations.push(words);
  variations.push(`the ${words}`);
  if (words.includes("grid")) {
    variations.push(words.replace("grid", "ag-grid"));
    variations.push(words.replace("grid", "ag grid"));
  }
  if (words.includes("wait for")) {
    const afterWaitFor = words.replace("wait for ", "").replace(" to load", "");
    variations.push(`${afterWaitFor} loads`);
    variations.push(`${afterWaitFor} is loaded`);
  }
  return [...new Set(variations)];
}
function lessonToPattern(lesson) {
  const patternCategories = ["selector", "timing", "navigation", "ui-interaction"];
  if (!patternCategories.includes(lesson.category)) {
    return null;
  }
  if (lesson.metrics.confidence < CONFIDENCE.DEFAULT_WEIGHT) {
    return null;
  }
  const regex = triggerToRegex(lesson.trigger);
  if (!regex) {
    return null;
  }
  const source = {
    lessonId: lesson.id,
    confidence: lesson.metrics.confidence,
    occurrences: lesson.metrics.occurrences
  };
  return {
    name: `llkb-${lesson.id.toLowerCase()}`,
    regex,
    primitiveType: categoryToPrimitiveType(lesson.category),
    source
  };
}
function lessonToSelectorOverride(lesson) {
  if (lesson.category !== "selector") {
    return null;
  }
  const pattern = lesson.pattern;
  const testIdMatch = pattern.match(/data-testid[=:]\s*["']?([^"'\s]+)["']?/i);
  const roleMatch = pattern.match(/role[=:]\s*["']?([^"'\s]+)["']?/i);
  const labelMatch = pattern.match(/aria-label[=:]\s*["']?([^"'\s]+)["']?/i);
  let strategy = "testid";
  let value = "";
  if (testIdMatch?.[1]) {
    strategy = "testid";
    value = testIdMatch[1];
  } else if (roleMatch?.[1]) {
    strategy = "role";
    value = roleMatch[1];
  } else if (labelMatch?.[1]) {
    strategy = "label";
    value = labelMatch[1];
  } else {
    return null;
  }
  const source = {
    lessonId: lesson.id,
    confidence: lesson.metrics.confidence,
    occurrences: lesson.metrics.occurrences
  };
  return {
    pattern: lesson.trigger,
    override: {
      strategy,
      value
    },
    source
  };
}
function lessonToTimingHint(lesson) {
  if (lesson.category !== "timing") {
    return null;
  }
  const pattern = lesson.pattern;
  const waitMatch = pattern.match(/wait\s*(?:for\s*)?\s*(\d+)\s*(?:ms|milliseconds?)?/i);
  const timeoutMatch = pattern.match(/timeout\s*(?:of\s*)?\s*(\d+)\s*(?:ms|milliseconds?)?/i);
  const delayMatch = pattern.match(/delay\s*(?:of\s*)?\s*(\d+)\s*(?:ms|milliseconds?)?/i);
  let waitMs = 0;
  if (waitMatch?.[1]) {
    waitMs = parseInt(waitMatch[1], 10);
  } else if (timeoutMatch?.[1]) {
    waitMs = parseInt(timeoutMatch[1], 10);
  } else if (delayMatch?.[1]) {
    waitMs = parseInt(delayMatch[1], 10);
  }
  if (waitMs === 0) {
    if (pattern.toLowerCase().includes("animation")) {
      waitMs = TIMEOUTS.SHORT_MS;
    } else if (pattern.toLowerCase().includes("load")) {
      waitMs = TIMEOUTS.MEDIUM_MS;
    } else if (pattern.toLowerCase().includes("network")) {
      waitMs = TIMEOUTS.LONG_MS;
    } else {
      return null;
    }
  }
  const source = {
    lessonId: lesson.id,
    confidence: lesson.metrics.confidence,
    occurrences: lesson.metrics.occurrences
  };
  return {
    trigger: lesson.trigger,
    waitMs,
    source
  };
}
function componentToModule(component) {
  const trigger = componentNameToTrigger(component.name);
  return {
    name: component.name,
    trigger,
    componentId: component.id,
    importPath: component.filePath,
    confidence: component.metrics.successRate
  };
}
function componentToGlossaryEntries(component) {
  const entries = [];
  const variations = generateNameVariations(component.name);
  const moduleName = inferModuleFromCategory(component.category);
  const primitive = {
    type: "callModule",
    module: moduleName,
    method: component.name
  };
  for (const phrase of variations) {
    entries.push({
      phrase,
      primitive,
      sourceId: component.id,
      confidence: component.metrics.successRate
    });
  }
  return entries;
}
function lessonToGlossaryEntries(lesson) {
  const glossaryCategories = ["navigation", "ui-interaction", "assertion"];
  if (!glossaryCategories.includes(lesson.category)) {
    return [];
  }
  const primitive = {
    type: categoryToPrimitiveType(lesson.category)
  };
  const phrase = lesson.trigger.toLowerCase().trim();
  if (!phrase) {
    return [];
  }
  return [
    {
      phrase,
      primitive,
      sourceId: lesson.id,
      confidence: lesson.metrics.confidence
    }
  ];
}

// llkb/adapter.ts
var DEFAULT_MIN_CONFIDENCE = 0.7;
var DEFAULT_LLKB_ROOT3 = ".artk/llkb";
var LLKB_VERSION = "1.0.0";
async function exportForAutogen(config) {
  const {
    llkbRoot = DEFAULT_LLKB_ROOT3,
    outputDir,
    minConfidence = DEFAULT_MIN_CONFIDENCE,
    includeCategories,
    includeScopes,
    generateGlossary = true,
    generateConfig = true,
    configFormat = "yaml"
  } = config;
  const warnings = [];
  const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
  if (!llkbExists(llkbRoot)) {
    return {
      configPath: null,
      glossaryPath: null,
      stats: createEmptyStats(),
      warnings: [`LLKB not found at ${llkbRoot}. Run /artk.discover-foundation first.`],
      exportedAt
    };
  }
  const llkbConfig = loadLLKBConfig(llkbRoot);
  if (!llkbConfig.enabled) {
    return {
      configPath: null,
      glossaryPath: null,
      stats: createEmptyStats(),
      warnings: ["LLKB is disabled in config.yml. Enable it to export."],
      exportedAt
    };
  }
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  const lessons = loadLessons(llkbRoot, {
    category: includeCategories,
    scope: includeScopes,
    minConfidence,
    includeArchived: false
  });
  const components = loadComponents(llkbRoot, {
    category: includeCategories,
    scope: includeScopes,
    minConfidence,
    includeArchived: false
  });
  const allLessons = loadLessons(llkbRoot, { includeArchived: false });
  const allComponents = loadComponents(llkbRoot, { includeArchived: false });
  const lessonsSkipped = allLessons.length - lessons.length;
  const componentsSkipped = allComponents.length - components.length;
  const patterns = [];
  const selectorOverrides = [];
  const timingHints = [];
  for (const lesson of lessons) {
    const pattern = lessonToPattern(lesson);
    if (pattern) {
      patterns.push(pattern);
    }
    const selector = lessonToSelectorOverride(lesson);
    if (selector) {
      selectorOverrides.push(selector);
    }
    const timing = lessonToTimingHint(lesson);
    if (timing) {
      timingHints.push(timing);
    }
  }
  const modules = [];
  const glossaryEntries = [];
  const sourceComponents = [];
  const sourceLessons = [];
  for (const component of components) {
    const moduleMapping = componentToModule(component);
    modules.push(moduleMapping);
    sourceComponents.push(component.id);
    if (generateGlossary) {
      const entries = componentToGlossaryEntries(component);
      glossaryEntries.push(...entries);
    }
  }
  if (generateGlossary) {
    for (const lesson of lessons) {
      const entries = lessonToGlossaryEntries(lesson);
      if (entries.length > 0) {
        glossaryEntries.push(...entries);
        sourceLessons.push(lesson.id);
      }
    }
  }
  const stats = {
    patternsExported: patterns.length,
    selectorsExported: selectorOverrides.length,
    timingHintsExported: timingHints.length,
    modulesExported: modules.length,
    glossaryEntriesExported: glossaryEntries.length,
    lessonsSkipped,
    componentsSkipped
  };
  let configPath = null;
  if (generateConfig) {
    const autogenConfig = {
      version: 1,
      exportedAt,
      llkbVersion: LLKB_VERSION,
      minConfidence,
      additionalPatterns: patterns,
      selectorOverrides,
      timingHints,
      modules
    };
    const filename = configFormat === "yaml" ? "autogen-llkb.config.yml" : "autogen-llkb.config.json";
    configPath = join(outputDir, filename);
    if (configFormat === "yaml") {
      writeFileSync(configPath, generateYAML(autogenConfig), "utf-8");
    } else {
      writeFileSync(configPath, JSON.stringify(autogenConfig, null, 2), "utf-8");
    }
  }
  let glossaryPath = null;
  if (generateGlossary && glossaryEntries.length > 0) {
    const glossaryMeta = {
      exportedAt,
      minConfidence,
      entryCount: glossaryEntries.length,
      sourceComponents: [...new Set(sourceComponents)],
      sourceLessons: [...new Set(sourceLessons)]
    };
    glossaryPath = join(outputDir, "llkb-glossary.ts");
    writeFileSync(glossaryPath, generateGlossaryFile(glossaryEntries, glossaryMeta), "utf-8");
  }
  if (stats.patternsExported === 0 && stats.modulesExported === 0) {
    warnings.push("No patterns or modules were exported. Consider lowering minConfidence.");
  }
  return {
    configPath,
    glossaryPath,
    stats,
    warnings,
    exportedAt
  };
}
function createEmptyStats() {
  return {
    patternsExported: 0,
    selectorsExported: 0,
    timingHintsExported: 0,
    modulesExported: 0,
    glossaryEntriesExported: 0,
    lessonsSkipped: 0,
    componentsSkipped: 0
  };
}
function generateYAML(config) {
  const lines = [
    "# Generated by LLKB Adapter - DO NOT EDIT MANUALLY",
    "# Regenerate with: npx artk-llkb export --for-autogen",
    "",
    `version: ${config.version}`,
    `exportedAt: "${config.exportedAt}"`,
    `llkbVersion: "${config.llkbVersion}"`,
    `minConfidence: ${config.minConfidence}`,
    "",
    "# Additional patterns from LLKB lessons",
    "additionalPatterns:"
  ];
  for (const pattern of config.additionalPatterns) {
    lines.push(`  - name: "${pattern.name}"`);
    lines.push(`    regex: "${escapeYAMLString(pattern.regex)}"`);
    lines.push(`    primitiveType: "${pattern.primitiveType}"`);
    if (pattern.module) {
      lines.push(`    module: "${pattern.module}"`);
    }
    if (pattern.method) {
      lines.push(`    method: "${pattern.method}"`);
    }
    if (pattern.argMapping && pattern.argMapping.length > 0) {
      lines.push(`    argMapping: [${pattern.argMapping.map((a) => `"${a}"`).join(", ")}]`);
    }
    lines.push("    source:");
    lines.push(`      lessonId: "${pattern.source.lessonId}"`);
    lines.push(`      confidence: ${pattern.source.confidence}`);
    lines.push(`      occurrences: ${pattern.source.occurrences}`);
  }
  lines.push("");
  lines.push("# Selector overrides from LLKB lessons");
  lines.push("selectorOverrides:");
  for (const selector of config.selectorOverrides) {
    lines.push(`  - pattern: "${escapeYAMLString(selector.pattern)}"`);
    lines.push("    override:");
    lines.push(`      strategy: "${selector.override.strategy}"`);
    lines.push(`      value: "${escapeYAMLString(selector.override.value)}"`);
    lines.push("    source:");
    lines.push(`      lessonId: "${selector.source.lessonId}"`);
    lines.push(`      confidence: ${selector.source.confidence}`);
  }
  lines.push("");
  lines.push("# Timing hints from lessons");
  lines.push("timingHints:");
  for (const hint of config.timingHints) {
    lines.push(`  - trigger: "${escapeYAMLString(hint.trigger)}"`);
    lines.push(`    waitMs: ${hint.waitMs}`);
    lines.push("    source:");
    lines.push(`      lessonId: "${hint.source.lessonId}"`);
    lines.push(`      confidence: ${hint.source.confidence}`);
  }
  lines.push("");
  lines.push("# Module mappings from components");
  lines.push("modules:");
  for (const mod of config.modules) {
    lines.push(`  - name: "${mod.name}"`);
    lines.push(`    trigger: "${escapeYAMLString(mod.trigger)}"`);
    lines.push(`    componentId: "${mod.componentId}"`);
    lines.push(`    importPath: "${mod.importPath}"`);
    lines.push(`    confidence: ${mod.confidence}`);
  }
  return lines.join("\n") + "\n";
}
function escapeYAMLString(str) {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
function generateGlossaryFile(entries, meta) {
  const lines = [
    "/**",
    " * LLKB-Generated Glossary Extension",
    ` * Generated: ${meta.exportedAt}`,
    " * Source: .artk/llkb/",
    ` * Min Confidence: ${meta.minConfidence}`,
    " *",
    " * DO NOT EDIT - Regenerate with: npx artk-llkb export --for-autogen",
    " */",
    "",
    "export interface IRPrimitive {",
    "  type: 'callModule' | 'click' | 'fill' | 'navigate' | 'wait' | 'assert';",
    "  module?: string;",
    "  method?: string;",
    "  params?: Record<string, unknown>;",
    "}",
    "",
    "export const llkbGlossary = new Map<string, IRPrimitive>(["
  ];
  const entriesBySource = /* @__PURE__ */ new Map();
  for (const entry of entries) {
    const source = entry.sourceId;
    if (!entriesBySource.has(source)) {
      entriesBySource.set(source, []);
    }
    entriesBySource.get(source)?.push(entry);
  }
  for (const [sourceId, sourceEntries] of entriesBySource) {
    const confidence = sourceEntries[0]?.confidence ?? 0;
    lines.push(`  // From ${sourceId} (confidence: ${confidence.toFixed(2)})`);
    for (const entry of sourceEntries) {
      const primitiveStr = JSON.stringify(entry.primitive);
      lines.push(`  ["${escapeJSString(entry.phrase)}", ${primitiveStr}],`);
    }
    lines.push("");
  }
  lines.push("]);");
  lines.push("");
  lines.push("export const llkbGlossaryMeta = {");
  lines.push(`  exportedAt: "${meta.exportedAt}",`);
  lines.push(`  minConfidence: ${meta.minConfidence},`);
  lines.push(`  entryCount: ${meta.entryCount},`);
  lines.push(`  sourceComponents: ${JSON.stringify(meta.sourceComponents)},`);
  lines.push(`  sourceLessons: ${JSON.stringify(meta.sourceLessons)},`);
  lines.push("};");
  lines.push("");
  return lines.join("\n");
}
function escapeJSString(str) {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}
function formatExportResult(result) {
  const lines = [];
  lines.push("LLKB Export for AutoGen");
  lines.push("========================");
  lines.push(`Exported patterns: ${result.stats.patternsExported}`);
  lines.push(`Exported selector overrides: ${result.stats.selectorsExported}`);
  lines.push(`Exported timing hints: ${result.stats.timingHintsExported}`);
  lines.push(`Exported modules: ${result.stats.modulesExported}`);
  lines.push(`Generated glossary entries: ${result.stats.glossaryEntriesExported}`);
  lines.push("");
  if (result.stats.lessonsSkipped > 0 || result.stats.componentsSkipped > 0) {
    lines.push("Skipped (low confidence):");
    lines.push(`  Lessons: ${result.stats.lessonsSkipped}`);
    lines.push(`  Components: ${result.stats.componentsSkipped}`);
    lines.push("");
  }
  lines.push("Output files:");
  if (result.configPath) {
    lines.push(`  - ${result.configPath}`);
  }
  if (result.glossaryPath) {
    lines.push(`  - ${result.glossaryPath}`);
  }
  if (result.warnings.length > 0) {
    lines.push("");
    lines.push("Warnings:");
    for (const warning of result.warnings) {
      lines.push(`  ! ${warning}`);
    }
  }
  lines.push("");
  lines.push(`Export completed at: ${result.exportedAt}`);
  return lines.join("\n");
}
function calculateNewSuccessRate(currentSuccessRate, currentOccurrences, newSuccess) {
  const totalSuccesses = currentSuccessRate * currentOccurrences;
  const newSuccesses = newSuccess ? totalSuccesses + 1 : totalSuccesses;
  const newOccurrences = currentOccurrences + 1;
  return Math.round(newSuccesses / newOccurrences * PERCENTAGES.FULL) / PERCENTAGES.FULL;
}
function findMatchingLesson(lessons, selectorValue, stepText) {
  const exactMatch = lessons.find(
    (l) => !l.archived && l.pattern.includes(selectorValue)
  );
  if (exactMatch) {
    return exactMatch;
  }
  const triggerMatch = lessons.find(
    (l) => !l.archived && l.trigger.toLowerCase().includes(stepText.toLowerCase())
  );
  return triggerMatch;
}
function recordPatternLearned(input) {
  const llkbRoot = input.llkbRoot ?? DEFAULT_LLKB_ROOT;
  const lessonsPath = path9.join(llkbRoot, "lessons.json");
  try {
    let matchedLessonId;
    let updatedMetrics;
    const updateResult = updateJSONWithLockSync(
      lessonsPath,
      (data) => {
        const existingLesson = findMatchingLesson(
          data.lessons,
          input.selectorUsed.value,
          input.stepText
        );
        if (existingLesson) {
          matchedLessonId = existingLesson.id;
          existingLesson.metrics.occurrences++;
          existingLesson.metrics.lastApplied = (/* @__PURE__ */ new Date()).toISOString();
          if (input.success) {
            existingLesson.metrics.lastSuccess = (/* @__PURE__ */ new Date()).toISOString();
          }
          existingLesson.metrics.successRate = calculateNewSuccessRate(
            existingLesson.metrics.successRate,
            existingLesson.metrics.occurrences - 1,
            input.success
          );
          existingLesson.metrics.confidence = calculateConfidence(existingLesson);
          if (!existingLesson.journeyIds.includes(input.journeyId)) {
            existingLesson.journeyIds.push(input.journeyId);
          }
          updatedMetrics = {
            confidence: existingLesson.metrics.confidence,
            successRate: existingLesson.metrics.successRate,
            occurrences: existingLesson.metrics.occurrences
          };
        }
        data.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
        return data;
      }
    );
    if (matchedLessonId) {
      appendToHistory(
        {
          event: "lesson_applied",
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          journeyId: input.journeyId,
          prompt: input.prompt,
          lessonId: matchedLessonId,
          success: input.success,
          context: input.stepText
        },
        llkbRoot
      );
    }
    return {
      success: updateResult.success,
      error: updateResult.error,
      metrics: updatedMetrics,
      entityId: matchedLessonId
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[LLKB] Failed to record pattern learned: ${message}`);
    return {
      success: false,
      error: message
    };
  }
}
function recordComponentUsed(input) {
  const llkbRoot = input.llkbRoot ?? DEFAULT_LLKB_ROOT;
  const componentsPath = path9.join(llkbRoot, "components.json");
  try {
    let foundComponent = false;
    let updatedMetrics;
    const updateResult = updateJSONWithLockSync(
      componentsPath,
      (data) => {
        const component = data.components.find((c) => c.id === input.componentId);
        if (component && !component.archived) {
          foundComponent = true;
          component.metrics.totalUses++;
          component.metrics.lastUsed = (/* @__PURE__ */ new Date()).toISOString();
          component.metrics.successRate = calculateNewSuccessRate(
            component.metrics.successRate,
            component.metrics.totalUses - 1,
            input.success
          );
          updatedMetrics = {
            totalUses: component.metrics.totalUses,
            successRate: component.metrics.successRate
          };
        }
        data.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
        return data;
      }
    );
    appendToHistory(
      {
        event: "component_used",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        journeyId: input.journeyId,
        prompt: input.prompt,
        componentId: input.componentId,
        success: input.success
      },
      llkbRoot
    );
    if (!foundComponent) {
      return {
        success: false,
        error: `Component not found: ${input.componentId}`
      };
    }
    return {
      success: updateResult.success,
      error: updateResult.error,
      metrics: updatedMetrics,
      entityId: input.componentId
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[LLKB] Failed to record component used: ${message}`);
    return {
      success: false,
      error: message
    };
  }
}
function recordLessonApplied(input) {
  const llkbRoot = input.llkbRoot ?? DEFAULT_LLKB_ROOT;
  const lessonsPath = path9.join(llkbRoot, "lessons.json");
  try {
    let foundLesson = false;
    let updatedMetrics;
    const updateResult = updateJSONWithLockSync(
      lessonsPath,
      (data) => {
        const lesson = data.lessons.find((l) => l.id === input.lessonId);
        if (lesson && !lesson.archived) {
          foundLesson = true;
          lesson.metrics.occurrences++;
          lesson.metrics.lastApplied = (/* @__PURE__ */ new Date()).toISOString();
          if (input.success) {
            lesson.metrics.lastSuccess = (/* @__PURE__ */ new Date()).toISOString();
          }
          lesson.metrics.successRate = calculateNewSuccessRate(
            lesson.metrics.successRate,
            lesson.metrics.occurrences - 1,
            input.success
          );
          lesson.metrics.confidence = calculateConfidence(lesson);
          if (!lesson.journeyIds.includes(input.journeyId)) {
            lesson.journeyIds.push(input.journeyId);
          }
          updatedMetrics = {
            confidence: lesson.metrics.confidence,
            successRate: lesson.metrics.successRate,
            occurrences: lesson.metrics.occurrences
          };
        }
        data.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
        return data;
      }
    );
    appendToHistory(
      {
        event: "lesson_applied",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        journeyId: input.journeyId,
        prompt: input.prompt,
        lessonId: input.lessonId,
        success: input.success,
        context: input.context
      },
      llkbRoot
    );
    if (!foundLesson) {
      return {
        success: false,
        error: `Lesson not found: ${input.lessonId}`
      };
    }
    return {
      success: updateResult.success,
      error: updateResult.error,
      metrics: updatedMetrics,
      entityId: input.lessonId
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[LLKB] Failed to record lesson applied: ${message}`);
    return {
      success: false,
      error: message
    };
  }
}
function recordLearning(args) {
  const baseInput = {
    journeyId: args.journeyId,
    testFile: args.testFile ?? "unknown",
    prompt: args.prompt ?? "journey-verify",
    llkbRoot: args.llkbRoot
  };
  switch (args.type) {
    case "pattern":
      return recordPatternLearned({
        ...baseInput,
        stepText: args.stepText ?? args.context ?? "",
        selectorUsed: {
          strategy: args.selectorStrategy ?? "unknown",
          value: args.selectorValue ?? ""
        },
        success: args.success
      });
    case "component":
      if (!args.id) {
        return {
          success: false,
          error: "Component ID is required for component learning"
        };
      }
      return recordComponentUsed({
        ...baseInput,
        componentId: args.id,
        success: args.success
      });
    case "lesson":
      if (!args.id) {
        return {
          success: false,
          error: "Lesson ID is required for lesson learning"
        };
      }
      return recordLessonApplied({
        ...baseInput,
        lessonId: args.id,
        success: args.success,
        context: args.context
      });
    default:
      return {
        success: false,
        error: `Unknown learning type: ${args.type}`
      };
  }
}
function formatLearningResult(result) {
  const lines = [];
  if (result.success) {
    lines.push("Learning recorded successfully");
    if (result.entityId) {
      lines.push(`  Entity: ${result.entityId}`);
    }
    if (result.metrics) {
      lines.push("  Updated metrics:");
      if (result.metrics.confidence !== void 0) {
        lines.push(`    - Confidence: ${result.metrics.confidence}`);
      }
      if (result.metrics.successRate !== void 0) {
        lines.push(`    - Success Rate: ${result.metrics.successRate}`);
      }
      if (result.metrics.occurrences !== void 0) {
        lines.push(`    - Occurrences: ${result.metrics.occurrences}`);
      }
      if (result.metrics.totalUses !== void 0) {
        lines.push(`    - Total Uses: ${result.metrics.totalUses}`);
      }
    }
  } else {
    lines.push("Learning recording failed");
    if (result.error) {
      lines.push(`  Error: ${result.error}`);
    }
  }
  return lines.join("\n");
}
var DEFAULT_LLKB_ROOT4 = ".artk/llkb";
function extractLlkbVersionFromTest(testContent) {
  const match = testContent.match(/@llkb-version\s+(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)/);
  return match ? match[1] ?? null : null;
}
function extractLlkbEntriesFromTest(testContent) {
  const match = testContent.match(/@llkb-entries\s+(\d+)/);
  return match ? parseInt(match[1] ?? "0", 10) : null;
}
function updateTestLlkbVersion(testContent, newVersion, entryCount) {
  let result = testContent;
  const versionRegex = /(@llkb-version\s+)\S+/;
  if (versionRegex.test(result)) {
    result = result.replace(versionRegex, `$1${newVersion}`);
  } else {
    const timestampRegex = /(@timestamp\s+\S+)/;
    if (timestampRegex.test(result)) {
      result = result.replace(timestampRegex, `$1
 * @llkb-version ${newVersion}`);
    }
  }
  if (entryCount !== void 0) {
    const entriesRegex = /(@llkb-entries\s+)\d+/;
    if (entriesRegex.test(result)) {
      result = result.replace(entriesRegex, `$1${entryCount}`);
    } else {
      const llkbVersionRegex = /(@llkb-version\s+\S+)/;
      if (llkbVersionRegex.test(result)) {
        result = result.replace(llkbVersionRegex, `$1
 * @llkb-entries ${entryCount}`);
      }
    }
  }
  return result;
}
function getCurrentLlkbVersion(llkbRoot = DEFAULT_LLKB_ROOT4) {
  const analyticsPath = path9.join(llkbRoot, "analytics.json");
  try {
    const analytics = loadJSON(analyticsPath);
    if (analytics?.lastUpdated) {
      return analytics.lastUpdated;
    }
  } catch {
  }
  return (/* @__PURE__ */ new Date()).toISOString();
}
function countNewEntriesSince(sinceTimestamp, type, llkbRoot = DEFAULT_LLKB_ROOT4) {
  if (!sinceTimestamp) {
    return 0;
  }
  const sinceDate = new Date(sinceTimestamp);
  if (type === "lessons") {
    const lessonsPath = path9.join(llkbRoot, "lessons.json");
    try {
      const lessons = loadJSON(lessonsPath);
      if (!lessons?.lessons) return 0;
      return lessons.lessons.filter((lesson) => {
        const firstSeen = lesson.metrics.firstSeen;
        if (!firstSeen) return false;
        return new Date(firstSeen) > sinceDate;
      }).length;
    } catch {
      return 0;
    }
  } else {
    const componentsPath = path9.join(llkbRoot, "components.json");
    try {
      const components = loadJSON(componentsPath);
      if (!components?.components) return 0;
      return components.components.filter((component) => {
        const extractedAt = component.source?.extractedAt;
        if (!extractedAt) return false;
        return new Date(extractedAt) > sinceDate;
      }).length;
    } catch {
      return 0;
    }
  }
}
function compareVersions(testFilePath, llkbRoot = DEFAULT_LLKB_ROOT4) {
  const testContent = fs.readFileSync(testFilePath, "utf-8");
  const testLlkbVersion = extractLlkbVersionFromTest(testContent);
  const currentLlkbVersion = getCurrentLlkbVersion(llkbRoot);
  const isOutdated = !testLlkbVersion || new Date(testLlkbVersion) < new Date(currentLlkbVersion);
  const daysSinceUpdate = testLlkbVersion ? Math.floor((Date.now() - new Date(testLlkbVersion).getTime()) / (TIME.MS_PER_SECOND * TIME.SECONDS_PER_MINUTE * TIME.MINUTES_PER_HOUR * TIME.HOURS_PER_DAY)) : Infinity;
  const newPatternsAvailable = countNewEntriesSince(testLlkbVersion, "lessons", llkbRoot);
  const newComponentsAvailable = countNewEntriesSince(testLlkbVersion, "components", llkbRoot);
  let recommendation = "skip";
  if (isOutdated && (newPatternsAvailable > LIMITS.MAX_RECENT_ITEMS || newComponentsAvailable > 2)) {
    recommendation = "update";
  } else if (isOutdated && daysSinceUpdate > LIMITS.DEFAULT_RETENTION_DAYS) {
    recommendation = "review";
  } else if (newPatternsAvailable > 0 || newComponentsAvailable > 0) {
    recommendation = "review";
  }
  return {
    testLlkbVersion,
    currentLlkbVersion,
    isOutdated,
    daysSinceUpdate,
    newPatternsAvailable,
    newComponentsAvailable,
    recommendation
  };
}
function checkUpdates(testsDir, llkbRoot = DEFAULT_LLKB_ROOT4, pattern = "*.spec.ts") {
  const result = {
    outdated: [],
    upToDate: [],
    errors: [],
    summary: {
      total: 0,
      outdated: 0,
      upToDate: 0,
      errors: 0,
      recommendation: ""
    }
  };
  if (!fs.existsSync(testsDir)) {
    return result;
  }
  const testFiles = findTestFiles(testsDir, pattern);
  result.summary.total = testFiles.length;
  for (const testFile of testFiles) {
    try {
      const comparison = compareVersions(testFile, llkbRoot);
      if (comparison.isOutdated) {
        result.outdated.push({ testFile, comparison });
        result.summary.outdated++;
      } else {
        result.upToDate.push({ testFile, comparison });
        result.summary.upToDate++;
      }
    } catch (error) {
      result.errors.push({
        testFile,
        error: error instanceof Error ? error.message : String(error)
      });
      result.summary.errors++;
    }
  }
  if (result.summary.outdated === 0) {
    result.summary.recommendation = "All tests are up to date";
  } else if (result.summary.outdated === 1) {
    result.summary.recommendation = "1 test should be updated";
  } else {
    result.summary.recommendation = `${result.summary.outdated} tests should be updated`;
  }
  return result;
}
function findTestFiles(dir, pattern) {
  const files = [];
  const patternRegex = globToRegex(pattern);
  function walkDir(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path9.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith(".") && entry.name !== "node_modules") {
          walkDir(fullPath);
        }
      } else if (entry.isFile() && patternRegex.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }
  walkDir(dir);
  return files;
}
function globToRegex(pattern) {
  const escaped = pattern.replace(/\./g, "\\.").replace(/\*/g, ".*").replace(/\?/g, ".");
  return new RegExp(`^${escaped}$`);
}
function formatVersionComparison(testFile, comparison) {
  const status = comparison.isOutdated ? "!" : "\u2713";
  const llkbVer = comparison.testLlkbVersion ? comparison.testLlkbVersion.split("T")[0] : "none";
  const currentVer = comparison.currentLlkbVersion.split("T")[0];
  let info = `${status} ${path9.basename(testFile)}`;
  info += ` (LLKB: ${llkbVer}, current: ${currentVer}`;
  if (comparison.newPatternsAvailable > 0 || comparison.newComponentsAvailable > 0) {
    const parts = [];
    if (comparison.newPatternsAvailable > 0) {
      parts.push(`+${comparison.newPatternsAvailable} patterns`);
    }
    if (comparison.newComponentsAvailable > 0) {
      parts.push(`+${comparison.newComponentsAvailable} components`);
    }
    info += `, ${parts.join(", ")}`;
  }
  info += ")";
  return info;
}
function formatUpdateCheckResult(result) {
  const lines = [];
  lines.push("LLKB Version Check");
  lines.push("\u2500".repeat(TABLE.COLUMN_WIDTH));
  lines.push("");
  if (result.outdated.length > 0) {
    lines.push("Tests needing LLKB update:");
    for (const { testFile, comparison } of result.outdated) {
      lines.push(`  ${formatVersionComparison(testFile, comparison)}`);
    }
    lines.push("");
  }
  if (result.upToDate.length > 0 && result.outdated.length === 0) {
    lines.push("All tests are up to date");
    lines.push("");
  } else if (result.upToDate.length > 0) {
    lines.push(`Up to date: ${result.upToDate.length} tests`);
    lines.push("");
  }
  if (result.errors.length > 0) {
    lines.push("Errors:");
    for (const { testFile, error } of result.errors) {
      lines.push(`  \u2717 ${path9.basename(testFile)}: ${error}`);
    }
    lines.push("");
  }
  lines.push("\u2500".repeat(TABLE.COLUMN_WIDTH));
  lines.push(`Total: ${result.summary.total} tests`);
  lines.push(result.summary.recommendation);
  return lines.join("\n");
}

// llkb/cli.ts
var DEFAULT_LLKB_ROOT5 = ".artk/llkb";
function runHealthCheck(llkbRoot = DEFAULT_LLKB_ROOT5) {
  const checks = [];
  let hasError = false;
  let hasWarning = false;
  if (fs.existsSync(llkbRoot)) {
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
  const configPath = path9.join(llkbRoot, "config.yml");
  if (fs.existsSync(configPath)) {
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
  const lessonsPath = path9.join(llkbRoot, "lessons.json");
  const lessonsCheck = checkJSONFile(lessonsPath, "lessons.json");
  checks.push(lessonsCheck);
  if (lessonsCheck.status === "fail") hasError = true;
  if (lessonsCheck.status === "warn") hasWarning = true;
  const componentsPath = path9.join(llkbRoot, "components.json");
  const componentsCheck = checkJSONFile(componentsPath, "components.json");
  checks.push(componentsCheck);
  if (componentsCheck.status === "fail") hasError = true;
  if (componentsCheck.status === "warn") hasWarning = true;
  const analyticsPath = path9.join(llkbRoot, "analytics.json");
  const analyticsCheck = checkJSONFile(analyticsPath, "analytics.json");
  checks.push(analyticsCheck);
  if (analyticsCheck.status === "fail") hasError = true;
  if (analyticsCheck.status === "warn") hasWarning = true;
  const historyDir = getHistoryDir(llkbRoot);
  if (fs.existsSync(historyDir)) {
    const historyFiles = fs.readdirSync(historyDir).filter((f) => f.endsWith(".jsonl"));
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
  if (!fs.existsSync(filePath)) {
    return {
      name: fileName,
      status: "warn",
      message: `${fileName} not found`
    };
  }
  try {
    const content = fs.readFileSync(filePath, "utf-8");
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
function getStats(llkbRoot = DEFAULT_LLKB_ROOT5) {
  const lessonsPath = path9.join(llkbRoot, "lessons.json");
  const componentsPath = path9.join(llkbRoot, "components.json");
  const historyDir = getHistoryDir(llkbRoot);
  const lessons = loadJSON(lessonsPath);
  const activeLessons = lessons?.lessons.filter((l) => !l.archived) ?? [];
  const archivedLessons = lessons?.archived ?? [];
  let avgConfidence = 0;
  let avgSuccessRate = 0;
  let needsReview = 0;
  if (activeLessons.length > 0) {
    avgConfidence = Math.round(
      activeLessons.reduce((acc, l) => acc + l.metrics.confidence, 0) / activeLessons.length * PERCENTAGES.FULL
    ) / PERCENTAGES.FULL;
    avgSuccessRate = Math.round(
      activeLessons.reduce((acc, l) => acc + l.metrics.successRate, 0) / activeLessons.length * PERCENTAGES.FULL
    ) / PERCENTAGES.FULL;
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
  if (fs.existsSync(historyDir)) {
    const files = fs.readdirSync(historyDir).filter((f) => f.endsWith(".jsonl")).sort();
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
    llkbRoot = DEFAULT_LLKB_ROOT5,
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
        path9.join(llkbRoot, "lessons.json"),
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
        path9.join(llkbRoot, "components.json"),
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
  if (!fs.existsSync(filePath)) {
    return 0;
  }
  const content = fs.readFileSync(filePath, "utf-8");
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
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  }
  return archivedCount;
}
function formatHealthCheck(result) {
  const lines = [];
  const statusIcon = result.status === "healthy" ? "\u2713" : result.status === "warning" ? "\u26A0" : "\u2717";
  lines.push(`${statusIcon} LLKB Health Check: ${result.status.toUpperCase()}`);
  lines.push("\u2500".repeat(TABLE.COLUMN_WIDTH));
  for (const check of result.checks) {
    const icon = check.status === "pass" ? "\u2713" : check.status === "warn" ? "\u26A0" : "\u2717";
    lines.push(`${icon} ${check.name}: ${check.message}`);
    if (check.details) {
      lines.push(`  ${check.details}`);
    }
  }
  lines.push("\u2500".repeat(TABLE.COLUMN_WIDTH));
  lines.push(result.summary);
  return lines.join("\n");
}
function formatStats(stats) {
  const lines = [];
  lines.push("LLKB Statistics");
  lines.push("\u2500".repeat(TABLE.COLUMN_WIDTH));
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
  lines.push("\u2500".repeat(TABLE.COLUMN_WIDTH));
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
async function runExportForAutogen(options) {
  const config = {
    llkbRoot: options.llkbRoot,
    outputDir: options.outputDir,
    minConfidence: options.minConfidence,
    includeCategories: options.includeCategories,
    includeScopes: options.includeScopes,
    generateGlossary: options.generateGlossary,
    generateConfig: options.generateConfig,
    configFormat: options.configFormat
  };
  return exportForAutogen(config);
}
function formatExportResultForConsole(result) {
  return formatExportResult(result);
}
function runLearnCommand(options) {
  return recordLearning({
    type: options.type,
    journeyId: options.journeyId,
    testFile: options.testFile,
    prompt: options.prompt,
    id: options.id,
    success: options.success,
    context: options.context,
    stepText: options.context,
    selectorStrategy: options.selectorStrategy,
    selectorValue: options.selectorValue,
    llkbRoot: options.llkbRoot
  });
}
function formatLearnResult(result) {
  return formatLearningResult(result);
}
function runCheckUpdates(options) {
  return checkUpdates(
    options.testsDir,
    options.llkbRoot || DEFAULT_LLKB_ROOT5,
    options.pattern || "*.spec.ts"
  );
}
function formatCheckUpdatesResult(result) {
  return formatUpdateCheckResult(result);
}
function runUpdateTest(options) {
  const { testPath, llkbRoot = DEFAULT_LLKB_ROOT5, dryRun = false } = options;
  try {
    const content = fs.readFileSync(testPath, "utf-8");
    const previousVersion = extractLlkbVersionFromTest(content);
    const newVersion = getCurrentLlkbVersion(llkbRoot);
    if (previousVersion && previousVersion === newVersion) {
      return {
        success: true,
        testPath,
        previousVersion,
        newVersion,
        modified: false,
        dryRun
      };
    }
    const updatedContent = updateTestLlkbVersion(content, newVersion);
    const modified = content !== updatedContent;
    if (!dryRun && modified) {
      fs.writeFileSync(testPath, updatedContent, "utf-8");
    }
    return {
      success: true,
      testPath,
      previousVersion,
      newVersion,
      modified,
      dryRun
    };
  } catch (error) {
    return {
      success: false,
      testPath,
      previousVersion: null,
      newVersion: getCurrentLlkbVersion(llkbRoot),
      modified: false,
      error: error instanceof Error ? error.message : String(error),
      dryRun
    };
  }
}
function formatUpdateTestResult(result) {
  const lines = [];
  const filename = path9.basename(result.testPath);
  if (!result.success) {
    lines.push(`\u2717 ${filename}: ${result.error}`);
    return lines.join("\n");
  }
  if (!result.modified) {
    lines.push(`\u2713 ${filename}: Already up to date`);
    return lines.join("\n");
  }
  const action = result.dryRun ? "Would update" : "Updated";
  const prevVer = result.previousVersion?.split("T")[0] || "none";
  const newVer = result.newVersion.split("T")[0] ?? "unknown";
  lines.push(`\u2713 ${filename}: ${action} LLKB version ${prevVer} \u2192 ${newVer}`);
  if (result.dryRun) {
    lines.push("  (dry run - no changes written)");
  }
  return lines.join("\n");
}
function runUpdateTests(options) {
  const {
    testsDir,
    llkbRoot = DEFAULT_LLKB_ROOT5,
    pattern = "*.spec.ts",
    dryRun = false
  } = options;
  const result = {
    updated: [],
    skipped: [],
    failed: [],
    summary: {
      total: 0,
      updated: 0,
      skipped: 0,
      failed: 0
    }
  };
  const checkResult = checkUpdates(testsDir, llkbRoot, pattern);
  result.summary.total = checkResult.summary.total;
  for (const { testFile } of checkResult.outdated) {
    const updateResult = runUpdateTest({
      testPath: testFile,
      llkbRoot,
      dryRun
    });
    if (updateResult.success) {
      if (updateResult.modified) {
        result.updated.push(updateResult);
        result.summary.updated++;
      } else {
        result.skipped.push({
          testPath: testFile,
          reason: "No changes needed after header update attempt"
        });
        result.summary.skipped++;
      }
    } else {
      result.failed.push({
        testPath: testFile,
        error: updateResult.error || "Unknown error"
      });
      result.summary.failed++;
    }
  }
  for (const { testFile } of checkResult.upToDate) {
    result.skipped.push({
      testPath: testFile,
      reason: "Already up to date"
    });
    result.summary.skipped++;
  }
  for (const { testFile, error } of checkResult.errors) {
    result.failed.push({ testPath: testFile, error });
    result.summary.failed++;
  }
  return result;
}
function formatUpdateTestsResult(result) {
  const lines = [];
  lines.push("LLKB Batch Update Results");
  lines.push("\u2500".repeat(TABLE.COLUMN_WIDTH));
  lines.push("");
  if (result.updated.length > 0) {
    lines.push("Updated:");
    for (const update of result.updated) {
      lines.push(`  ${formatUpdateTestResult(update)}`);
    }
    lines.push("");
  }
  if (result.failed.length > 0) {
    lines.push("Failed:");
    for (const { testPath, error } of result.failed) {
      lines.push(`  \u2717 ${path9.basename(testPath)}: ${error}`);
    }
    lines.push("");
  }
  lines.push("\u2500".repeat(TABLE.COLUMN_WIDTH));
  lines.push(`Total: ${result.summary.total} tests`);
  lines.push(`  Updated: ${result.summary.updated}`);
  lines.push(`  Skipped: ${result.summary.skipped}`);
  lines.push(`  Failed: ${result.summary.failed}`);
  return lines.join("\n");
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
    for (const [path10, names] of Object.entries(byPath)) {
      lines.push(`import { ${names.join(", ")} } from './${path10}';`);
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
  const fileMatch = path9.basename(filePath).match(JOURNEY_ID_REGEX);
  if (fileMatch && fileMatch[1]) {
    return `JRN-${fileMatch[1].padStart(4, "0")}`;
  }
  const contentMatch = content.match(JOURNEY_ID_REGEX);
  if (contentMatch && contentMatch[1]) {
    return `JRN-${contentMatch[1].padStart(4, "0")}`;
  }
  const basename5 = path9.basename(filePath, path9.extname(filePath));
  return `JRN-${basename5.toUpperCase().replace(/[^A-Z0-9]/g, "-").slice(0, 20)}`;
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
function findTestFiles2(dir, extensions, excludeDirs) {
  const files = [];
  if (!fs.existsSync(dir)) {
    return files;
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path9.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!excludeDirs.includes(entry.name)) {
        files.push(...findTestFiles2(fullPath, extensions, excludeDirs));
      }
    } else if (entry.isFile()) {
      const ext = path9.extname(entry.name);
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
  const testFiles = findTestFiles2(testDir, extensions, excludeDirs);
  const allSteps = [];
  for (const file of testFiles) {
    try {
      const content = fs.readFileSync(file, "utf-8");
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
  if (!fs.existsSync(filePath)) {
    return {
      totalSteps: 0,
      uniquePatterns: 0,
      duplicatePatterns: 0,
      duplicateGroups: [],
      extractionCandidates: [],
      filesAnalyzed: []
    };
  }
  const content = fs.readFileSync(filePath, "utf-8");
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
  const testFiles = findTestFiles2(testDir, extensions, excludeDirs);
  const opportunities = /* @__PURE__ */ new Map();
  for (const component of components) {
    if (!component.archived) {
      opportunities.set(component.id, []);
    }
  }
  for (const file of testFiles) {
    try {
      const content = fs.readFileSync(file, "utf-8");
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
  return path9.join(harnessRoot, DEFAULT_MODULES_DIR, REGISTRY_FILENAME);
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
  const dir = path9.dirname(registryPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
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
function compareVersions2(a, b) {
  const va = parseVersion(a);
  const vb = parseVersion(b);
  if (va.major !== vb.major) return va.major < vb.major ? -1 : 1;
  if (va.minor !== vb.minor) return va.minor < vb.minor ? -1 : 1;
  if (va.patch !== vb.patch) return va.patch < vb.patch ? -1 : 1;
  return 0;
}
function isVersionSupported(version) {
  return compareVersions2(version, MIN_SUPPORTED_VERSION) >= 0;
}
function needsMigration(version) {
  return compareVersions2(version, CURRENT_VERSION) < 0;
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
  const path10 = [];
  if (from.major === 0 && to.major >= 1) {
    path10.push("0.x->1.0.0");
  }
  return path10;
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
    fs.copyFileSync(filePath, backupPath);
    const saveResult = await saveJSONAtomic(filePath, migratedData);
    if (!saveResult.success) {
      fs.copyFileSync(backupPath, filePath);
      return { success: false, warnings: allWarnings, error: saveResult.error };
    }
    fs.unlinkSync(backupPath);
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
    path9.join(llkbRoot, "lessons.json"),
    path9.join(llkbRoot, "components.json"),
    path9.join(llkbRoot, "analytics.json")
  ];
  const lessonsPath = path9.join(llkbRoot, "lessons.json");
  if (fs.existsSync(lessonsPath)) {
    const lessonsData = loadJSON(lessonsPath);
    result.fromVersion = lessonsData?.version || "0.0.0";
  }
  for (const file of files) {
    if (!fs.existsSync(file)) {
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
    result.warnings.push(...migrationResult.warnings.map((w) => `${path9.basename(file)}: ${w}`));
  }
  return result;
}
function checkMigrationNeeded(llkbRoot) {
  const lessonsPath = path9.join(llkbRoot, "lessons.json");
  if (!fs.existsSync(lessonsPath)) {
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
    ensureDir(path9.join(llkbRoot, "patterns"));
    ensureDir(path9.join(llkbRoot, "history"));
    const configPath = path9.join(llkbRoot, "config.yml");
    if (!fs.existsSync(configPath)) {
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
      fs.writeFileSync(configPath, defaultConfig, "utf-8");
    }
    const lessonsPath = path9.join(llkbRoot, "lessons.json");
    if (!fs.existsSync(lessonsPath)) {
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
    const componentsPath = path9.join(llkbRoot, "components.json");
    if (!fs.existsSync(componentsPath)) {
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
    const analyticsPath = path9.join(llkbRoot, "analytics.json");
    if (!fs.existsSync(analyticsPath)) {
      const defaultAnalytics = createEmptyAnalytics();
      await saveJSONAtomic(analyticsPath, defaultAnalytics);
    }
    const patternFiles = ["selectors.json", "timing.json", "assertions.json", "auth.json", "data.json"];
    for (const patternFile of patternFiles) {
      const patternPath = path9.join(llkbRoot, "patterns", patternFile);
      if (!fs.existsSync(patternPath)) {
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
    const filePath = path9.join(llkbRoot, file);
    if (!fs.existsSync(filePath)) {
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
  const patternsDir = path9.join(llkbRoot, "patterns");
  if (!fs.existsSync(patternsDir)) {
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
  fs.writeFileSync(outputPath, content, "utf-8");
}

export { CONFIDENCE_HISTORY_RETENTION_DAYS, CURRENT_VERSION, DEFAULT_LLKB_ROOT, LOCK_MAX_WAIT_MS, LOCK_RETRY_INTERVAL_MS, MAX_CONFIDENCE_HISTORY_ENTRIES, MIN_SUPPORTED_VERSION, STALE_LOCK_THRESHOLD_MS, addComponentToRegistry, appendToHistory, calculateConfidence, calculateSimilarity, checkMigrationNeeded, checkUpdates, cleanupOldHistoryFiles, compareVersions as compareTestVersion, compareVersions as compareTestVersions, compareVersions2 as compareVersions, componentNameToTrigger, componentToGlossaryEntries, componentToModule, countJourneyExtractionsToday, countLines, countNewEntriesSince, countPredictiveExtractionsToday, countTodayEvents, createEmptyAnalytics, createEmptyRegistry, daysBetween, detectDecliningConfidence, detectDuplicatesAcrossFiles, detectDuplicatesInFile, ensureDir, exportForAutogen, exportLLKB, exportToFile, extractKeywords, extractLlkbEntriesFromTest, extractLlkbVersionFromTest, extractStepKeywords, extractLlkbVersionFromTest as extractVersionFromTest, findComponents, findExtractionCandidates, findLessonsByPattern, findModulesByCategory, findNearDuplicates, findSimilarPatterns, findUnusedComponentOpportunities, formatCheckUpdatesResult, formatVersionComparison as formatComparison, formatContextForPrompt, formatDate, formatExportResult, formatExportResultForConsole, formatHealthCheck, formatLearnResult, formatLearningResult, formatPruneResult, formatStats, formatUpdateCheckResult, formatUpdateTestResult, formatUpdateTestsResult, formatVersionComparison, generateNameVariations, generateReport, getAllCategories, getAnalyticsSummary, getComponentCategories, getComponentsForJourney, getConfidenceTrend, getCurrentLlkbVersion, getHistoryDir, getHistoryFilePath, getHistoryFilesInRange, getImportPath, getLessonsForJourney, getCurrentLlkbVersion as getLlkbVersion, getModuleForComponent, getRelevantContext, getRelevantScopes, getStats, hashCode, inferCategory, inferCategoryWithConfidence, initializeLLKB, isComponentCategory, isDailyRateLimitReached, isJourneyRateLimitReached, isLLKBEnabled, isNearDuplicate, isVersionSupported, jaccardSimilarity, lessonToGlossaryEntries, lessonToPattern, lessonToSelectorOverride, lessonToTimingHint, lineCountSimilarity, listModules, llkbExists, loadAppProfile, loadComponents, loadJSON, loadLLKBConfig, loadLLKBData, loadLessons, loadPatterns, loadRegistry, matchStepsToComponents, migrateLLKB, needsConfidenceReview, needsMigration, normalizeCode, parseVersion, prune, readHistoryFile, readTodayHistory, recordComponentUsed, recordLearning, recordLessonApplied, recordPatternLearned, removeComponentFromRegistry, runCheckUpdates, runExportForAutogen, runHealthCheck, runLearnCommand, runUpdateTest, runUpdateTests, saveJSONAtomic, saveJSONAtomicSync, saveRegistry, search, shouldExtractAsComponent, syncRegistryWithComponents, tokenize, triggerToRegex, updateAnalytics, updateAnalyticsWithData, updateComponentInRegistry, updateConfidenceHistory, updateJSONWithLock, updateJSONWithLockSync, updateTestLlkbVersion, updateTestLlkbVersion as updateVersionInTest, validateLLKBInstallation, validateRegistryConsistency };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map