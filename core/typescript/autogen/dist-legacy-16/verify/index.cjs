'use strict';

var child_process = require('child_process');
var fs = require('fs');
var path = require('path');
var os = require('os');

var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
function isPlaywrightAvailable(cwd) {
  try {
    child_process.execSync("npx playwright --version", {
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
    const result = child_process.execSync("npx playwright --version", {
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
  const tempDir = path.join(os.tmpdir(), `autogen-verify-${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });
  const reportPath = path.join(tempDir, "results.json");
  const args = buildPlaywrightArgs({
    ...options,
    reporter: `json,line`
  });
  const command = `npx playwright ${args.join(" ")}`;
  const startTime = Date.now();
  try {
    const result = child_process.execSync(command, {
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
      reportPath: fs.existsSync(reportPath) ? reportPath : void 0,
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
      reportPath: fs.existsSync(reportPath) ? reportPath : void 0,
      duration: Date.now() - startTime,
      command
    };
  }
}
function runPlaywrightAsync(options = {}) {
  return new Promise((resolve) => {
    const { cwd = process.cwd(), env = {} } = options;
    const tempDir = path.join(os.tmpdir(), `autogen-verify-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    const reportPath = path.join(tempDir, "results.json");
    const args = buildPlaywrightArgs({
      ...options,
      reporter: "json,line"
    });
    const command = `npx playwright ${args.join(" ")}`;
    const startTime = Date.now();
    let stdout = "";
    let stderr = "";
    const child = child_process.spawn("npx", ["playwright", ...args], {
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
      resolve({
        success: code === 0,
        exitCode: code || 1,
        stdout,
        stderr,
        reportPath: fs.existsSync(reportPath) ? reportPath : void 0,
        duration: Date.now() - startTime,
        command
      });
    });
    child.on("error", (error) => {
      resolve({
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
  if (!fs.existsSync(testFilePath)) {
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
    cwd: options.cwd || path.dirname(testFilePath)
  });
}
function runJourneyTests(journeyId, options = {}) {
  return runPlaywrightSync({
    ...options,
    grep: `@${journeyId}`
  });
}
function checkTestSyntax(testFilePath, cwd) {
  if (!fs.existsSync(testFilePath)) {
    return false;
  }
  try {
    child_process.execSync(`npx tsc --noEmit ${testFilePath}`, {
      cwd: cwd || path.dirname(testFilePath),
      stdio: "pipe"
    });
    return true;
  } catch {
    return false;
  }
}
function writeAndRunTest(code, filename, options = {}) {
  const tempDir = path.join(os.tmpdir(), `autogen-test-${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });
  const testPath = path.join(tempDir, filename);
  fs.writeFileSync(testPath, code, "utf-8");
  return runTestFile(testPath, options);
}
function getTestCount(testFile, cwd) {
  try {
    const result = child_process.execSync(`npx playwright test --list ${testFile}`, {
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
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    const content = fs.readFileSync(filePath, "utf-8");
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
var DEFAULT_OPTIONS = {
  repeatCount: 3,
  maxFlakyRate: 0,
  stopOnFlaky: false
};
function checkStability(options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
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
  const evidenceDir = path.join(basePath, "evidence", testId);
  fs.mkdirSync(evidenceDir, { recursive: true });
  return evidenceDir;
}
function saveEvidence(evidence, outputDir, testId) {
  const dir = createEvidenceDir(outputDir, testId);
  const filename = `evidence-${Date.now()}.json`;
  const filepath = path.join(dir, filename);
  fs.writeFileSync(filepath, JSON.stringify(evidence, null, 2), "utf-8");
  return filepath;
}
function loadEvidence(filepath) {
  if (!fs.existsSync(filepath)) {
    return null;
  }
  try {
    const content = fs.readFileSync(filepath, "utf-8");
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
    for (const err of evidence.networkErrors) {
      lines.push(`- ${err}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

// src/verify/summary.ts
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
  const { writeFileSync: writeFileSync3, mkdirSync: mkdirSync3 } = __require("fs");
  const { dirname: dirname2 } = __require("path");
  mkdirSync3(dirname2(outputPath), { recursive: true });
  writeFileSync3(outputPath, JSON.stringify(summary, null, 2), "utf-8");
}

exports.buildPlaywrightArgs = buildPlaywrightArgs;
exports.checkStability = checkStability;
exports.checkTestSyntax = checkTestSyntax;
exports.classifyError = classifyError;
exports.classifyTestResult = classifyTestResult;
exports.classifyTestResults = classifyTestResults;
exports.compareARIASnapshots = compareARIASnapshots;
exports.createEvidenceDir = createEvidenceDir;
exports.extractErrorMessages = extractErrorMessages;
exports.extractErrorStacks = extractErrorStacks;
exports.extractTestResults = extractTestResults;
exports.findInSnapshot = findInSnapshot;
exports.findTestsByTag = findTestsByTag;
exports.findTestsByTitle = findTestsByTitle;
exports.formatARIATree = formatARIATree;
exports.formatTestResult = formatTestResult;
exports.formatVerifySummary = formatVerifySummary;
exports.generateARIACaptureCode = generateARIACaptureCode;
exports.generateClassificationReport = generateClassificationReport;
exports.generateEvidenceCaptureCode = generateEvidenceCaptureCode;
exports.generateEvidenceReport = generateEvidenceReport;
exports.generateMarkdownSummary = generateMarkdownSummary;
exports.generateStabilityReport = generateStabilityReport;
exports.generateSummaryFromReport = generateSummaryFromReport;
exports.generateVerifySummary = generateVerifySummary;
exports.getFailedStep = getFailedStep;
exports.getFailedTests = getFailedTests;
exports.getFailureStats = getFailureStats;
exports.getFlakinessScore = getFlakinessScore;
exports.getFlakyTests = getFlakyTests;
exports.getHealableFailures = getHealableFailures;
exports.getPlaywrightVersion = getPlaywrightVersion;
exports.getRecommendations = getRecommendations;
exports.getSummary = getSummary;
exports.getTestCount = getTestCount;
exports.hasFailures = hasFailures;
exports.isHealable = isHealable;
exports.isPlaywrightAvailable = isPlaywrightAvailable;
exports.isReportSuccessful = isReportSuccessful;
exports.isTestStable = isTestStable;
exports.isVerificationPassed = isVerificationPassed;
exports.loadEvidence = loadEvidence;
exports.parseReportContent = parseReportContent;
exports.parseReportFile = parseReportFile;
exports.quickStabilityCheck = quickStabilityCheck;
exports.reportHasFlaky = reportHasFlaky;
exports.runJourneyTests = runJourneyTests;
exports.runPlaywrightAsync = runPlaywrightAsync;
exports.runPlaywrightSync = runPlaywrightSync;
exports.runTestFile = runTestFile;
exports.saveEvidence = saveEvidence;
exports.saveSummary = saveSummary;
exports.shouldQuarantine = shouldQuarantine;
exports.summaryHasFlaky = summaryHasFlaky;
exports.thoroughStabilityCheck = thoroughStabilityCheck;
exports.writeAndRunTest = writeAndRunTest;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map