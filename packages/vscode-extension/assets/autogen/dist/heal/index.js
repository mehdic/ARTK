import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { randomBytes } from 'crypto';

// src/heal/rules.ts
var DEFAULT_HEALING_RULES = [
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
var DEFAULT_HEALING_CONFIG = {
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
var UNHEALABLE_CATEGORIES = [
  "auth",
  // Requires credential/session fix
  "env",
  // Requires environment fix
  "unknown"
  // Cannot determine appropriate fix
];
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
var HealingLogger = class {
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

// src/heal/fixes/selector.ts
var CSS_SELECTOR_PATTERNS = [
  // page.locator('.class') or page.locator('#id')
  /page\.locator\s*\(\s*['"`]([.#][^'"`]+)['"`]\s*\)/g,
  // page.locator('[attribute]')
  /page\.locator\s*\(\s*['"`](\[[^\]]+\])['"`]\s*\)/g,
  // page.locator('tag.class')
  /page\.locator\s*\(\s*['"`]([a-z]+[.#][^'"`]+)['"`]\s*\)/g
];
var UI_PATTERN_TO_ROLE = {
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

// src/heal/fixes/navigation.ts
var EXISTING_WAIT_PATTERNS = [
  /await\s+page\.waitForURL/,
  /await\s+expect\s*\(\s*page\s*\)\.toHaveURL/,
  /await\s+page\.waitForNavigation/,
  /await\s+page\.waitForLoadState/
];
function hasNavigationWait(code) {
  return EXISTING_WAIT_PATTERNS.some((pattern) => pattern.test(code));
}
function extractUrlFromError(errorMessage) {
  const matchPattern = errorMessage.match(/Expected\s+URL\s+to\s+match\s+['"]([^'"]+)['"]/i);
  if (matchPattern) {
    return matchPattern[1] ?? null;
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

// src/heal/fixes/timing.ts
var MISSING_AWAIT_PATTERNS = [
  // Playwright actions without await
  /(?<!\bawait\s+)(page\.(?:click|fill|type|check|uncheck|selectOption|hover|focus|press|dblclick|dragTo)\s*\()/g,
  // Expectations without await
  /(?<!\bawait\s+)(expect\s*\([^)]+\)\.(?:toBeVisible|toBeHidden|toHaveText|toContainText|toHaveValue|toHaveURL|toHaveTitle)\s*\()/g,
  // Locator actions without await
  /(?<!\bawait\s+)([a-zA-Z_$][a-zA-Z0-9_$]*\.(?:click|fill|type|check|hover|press)\s*\()/g
];
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

// src/heal/loop.ts
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

export { DEFAULT_HEALING_CONFIG, DEFAULT_HEALING_RULES, HealingLogger, UNHEALABLE_CATEGORIES, addCleanupHook, addExactToLocator, addNavigationWaitAfterClick, addRunIdVariable, addTimeout, aggregateHealingLogs, applyDataFix, applyNavigationFix, applySelectorFix, applyTimingFix, containsCSSSelector, convertToWebFirstAssertion, createHealingReport, evaluateHealing, extractCSSSelector, extractNameFromSelector, extractTestDataPatterns, extractTimeoutFromError, extractUrlFromError, extractUrlFromGoto, fixMissingAwait, fixMissingGotoAwait, formatHealingLog, generateLabelLocator, generateRoleLocator, generateRunId, generateTestIdLocator, generateTextLocator, generateToHaveURL, generateWaitForURL, getApplicableRules, getHealingRecommendation, getNextFix, getPostHealingRecommendation, hasDataIsolation, hasNavigationWait, inferRoleFromSelector, inferUrlPattern, insertNavigationWait, isCategoryHealable, isFixAllowed, isFixForbidden, loadHealingLog, namespaceEmail, namespaceName, previewHealingFixes, replaceHardcodedEmail, replaceHardcodedTestData, runHealingLoop, suggestTimeoutIncrease, wouldFixApply, wrapWithExpectPoll, wrapWithExpectToPass };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map