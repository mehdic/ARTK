'use strict';

var fs = require('fs');
var path = require('path');

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// reporters/journey-reporter.ts
function extractJourneyId(testCase) {
  for (const annotation of testCase.annotations) {
    if (annotation.type === "journey") {
      return annotation.description ?? null;
    }
  }
  const journeyTagRegex = /^@(JRN-\d+)$/;
  for (const tag of testCase.tags) {
    const match = journeyTagRegex.exec(tag);
    if (match?.[1]) {
      return match[1];
    }
  }
  const titleRegex = /^(JRN-\d+):/;
  const titleMatch = titleRegex.exec(testCase.title);
  if (titleMatch?.[1]) {
    return titleMatch[1];
  }
  return null;
}
function mapTestToJourney(testCase, result) {
  const artifacts = extractTestArtifacts(result);
  return {
    journeyId: extractJourneyId(testCase) ?? "UNMAPPED",
    testTitle: testCase.titlePath().join(" \u203A "),
    testFile: testCase.location.file,
    status: result.status,
    duration: result.duration,
    retries: result.retry,
    error: result.error?.message,
    artifacts
  };
}
function extractTestArtifacts(result) {
  const screenshots = [];
  let video;
  let trace;
  for (const attachment of result.attachments) {
    if (attachment.name === "screenshot" && attachment.path) {
      screenshots.push(attachment.path);
    } else if (attachment.name === "video" && attachment.path) {
      video = attachment.path;
    } else if (attachment.name === "trace" && attachment.path) {
      trace = attachment.path;
    }
  }
  return {
    screenshots,
    video,
    trace
  };
}
function groupTestsByJourney(mappings) {
  const groups = /* @__PURE__ */ new Map();
  for (const mapping of mappings) {
    const existing = groups.get(mapping.journeyId) ?? [];
    groups.set(mapping.journeyId, [...existing, mapping]);
  }
  const readonlyGroups = /* @__PURE__ */ new Map();
  for (const entry of Array.from(groups.entries())) {
    const [journeyId, tests] = entry;
    readonlyGroups.set(journeyId, tests);
  }
  return readonlyGroups;
}
function calculateJourneyStatus(tests) {
  if (tests.length === 0) {
    return "not-run";
  }
  let hasFailed = false;
  let hasFlaky = false;
  let allSkipped = true;
  for (const test of tests) {
    if (test.status === "failed" || test.status === "timedOut" || test.status === "interrupted") {
      hasFailed = true;
      allSkipped = false;
    } else if (test.status === "passed") {
      allSkipped = false;
      if (test.retries > 0) {
        hasFlaky = true;
      }
    } else if (test.status !== "skipped") {
      allSkipped = false;
    }
  }
  if (hasFailed) {
    return "failed";
  }
  if (allSkipped) {
    return "skipped";
  }
  if (hasFlaky) {
    return "flaky";
  }
  return "passed";
}
function createJourneyReport(journeyId, tests) {
  let passedTests = 0;
  let failedTests = 0;
  let skippedTests = 0;
  let flakyTests = 0;
  let totalDuration = 0;
  for (const test of tests) {
    totalDuration += test.duration;
    if (test.status === "passed") {
      if (test.retries > 0) {
        flakyTests++;
      } else {
        passedTests++;
      }
    } else if (test.status === "failed" || test.status === "timedOut" || test.status === "interrupted") {
      failedTests++;
    } else if (test.status === "skipped") {
      skippedTests++;
    }
  }
  const status = calculateJourneyStatus(tests);
  return {
    journeyId,
    status,
    totalTests: tests.length,
    passedTests,
    failedTests,
    skippedTests,
    flakyTests,
    totalDuration,
    tests
  };
}
var ARTKReporter = class {
  constructor(options) {
    // Note: config is stored for future use (filtering, metadata, etc.)
    // Currently not used but kept for API compatibility
    // private _config: FullConfig | undefined;
    __publicField(this, "options");
    __publicField(this, "testMappings", []);
    __publicField(this, "startTime", 0);
    __publicField(this, "endTime", 0);
    this.options = options;
  }
  /**
   * Called once before running tests
   */
  onBegin(_config, _suite) {
    this.startTime = Date.now();
  }
  /**
   * Called for each test after it finishes
   */
  onTestEnd(test, result) {
    const mapping = mapTestToJourney(test, result);
    this.testMappings.push(mapping);
  }
  /**
   * Called after all tests finish
   */
  async onEnd(result) {
    this.endTime = Date.now();
    const report = this.generateARTKReport(result);
    await this.writeARTKReport(report);
  }
  /**
   * Generate ARTK report from collected test mappings
   */
  generateARTKReport(result) {
    const summary = this.createRunSummary(result);
    const { journeys, unmappedTests } = this.createJourneyReports();
    return {
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      summary,
      journeys,
      unmappedTests
    };
  }
  /**
   * Create run summary from full result
   */
  createRunSummary(result) {
    let totalTests = 0;
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    let flaky = 0;
    for (const mapping of this.testMappings) {
      totalTests++;
      if (mapping.status === "passed") {
        if (mapping.retries > 0) {
          flaky++;
        } else {
          passed++;
        }
      } else if (mapping.status === "failed" || mapping.status === "timedOut" || mapping.status === "interrupted") {
        failed++;
      } else if (mapping.status === "skipped") {
        skipped++;
      }
    }
    return {
      totalTests,
      passed,
      failed,
      skipped,
      flaky,
      duration: this.endTime - this.startTime,
      status: result.status
    };
  }
  /**
   * Create journey reports from test mappings
   */
  createJourneyReports() {
    if (!this.options.includeJourneyMapping) {
      return {
        journeys: [],
        unmappedTests: []
      };
    }
    const grouped = groupTestsByJourney(this.testMappings);
    const journeys = [];
    const unmappedTests = [];
    for (const entry of Array.from(grouped.entries())) {
      const [journeyId, tests] = entry;
      if (journeyId === "UNMAPPED") {
        unmappedTests.push(...tests);
      } else {
        journeys.push(createJourneyReport(journeyId, tests));
      }
    }
    return {
      journeys,
      unmappedTests
    };
  }
  /**
   * Write ARTK report to file
   */
  async writeARTKReport(report) {
    const outputFile = this.options.outputFile;
    const outputDir = path.dirname(outputFile);
    await fs.promises.mkdir(outputDir, { recursive: true });
    const reportJson = JSON.stringify(report, null, 2);
    await fs.promises.writeFile(outputFile, reportJson, "utf-8");
    console.log(`
ARTK report written to: ${outputFile}`);
    this.printSummary(report);
  }
  /**
   * Print summary to console
   */
  printSummary(report) {
    const { summary, journeys } = report;
    console.log("\n=== ARTK Test Summary ===");
    console.log(`Total Tests: ${summary.totalTests}`);
    console.log(`Passed: ${summary.passed}`);
    console.log(`Failed: ${summary.failed}`);
    console.log(`Skipped: ${summary.skipped}`);
    console.log(`Flaky: ${summary.flaky}`);
    console.log(`Duration: ${(summary.duration / 1e3).toFixed(2)}s`);
    console.log(`Status: ${summary.status}`);
    if (journeys.length > 0) {
      console.log("\n=== Journey Results ===");
      for (const journey of journeys) {
        const statusIcon = journey.status === "passed" ? "\u2713" : journey.status === "failed" ? "\u2717" : "\u25CB";
        console.log(
          `${statusIcon} ${journey.journeyId}: ${journey.passedTests}/${journey.totalTests} passed (${journey.status})`
        );
      }
    }
    console.log("");
  }
};
function generateARTKReport(mappings, includeJourneyMapping = true) {
  const summary = createStandaloneSummary(mappings);
  const { journeys, unmappedTests } = createStandaloneJourneyReports(mappings, includeJourneyMapping);
  return {
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    summary,
    journeys,
    unmappedTests
  };
}
function createStandaloneSummary(mappings) {
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  let flaky = 0;
  let totalDuration = 0;
  for (const mapping of mappings) {
    totalDuration += mapping.duration;
    if (mapping.status === "passed") {
      if (mapping.retries > 0) {
        flaky++;
      } else {
        passed++;
      }
    } else if (mapping.status === "failed" || mapping.status === "timedOut" || mapping.status === "interrupted") {
      failed++;
    } else if (mapping.status === "skipped") {
      skipped++;
    }
  }
  return {
    totalTests: mappings.length,
    passed,
    failed,
    skipped,
    flaky,
    duration: totalDuration,
    status: failed > 0 ? "failed" : "passed"
  };
}
function createStandaloneJourneyReports(mappings, includeJourneyMapping) {
  if (!includeJourneyMapping) {
    return {
      journeys: [],
      unmappedTests: []
    };
  }
  const grouped = groupTestsByJourney(mappings);
  const journeys = [];
  const unmappedTests = [];
  for (const entry of Array.from(grouped.entries())) {
    const [journeyId, tests] = entry;
    if (journeyId === "UNMAPPED") {
      unmappedTests.push(...tests);
    } else {
      journeys.push(createJourneyReport(journeyId, tests));
    }
  }
  return {
    journeys,
    unmappedTests
  };
}
async function writeARTKReport(report, outputFile) {
  const outputDir = path.dirname(outputFile);
  await fs.promises.mkdir(outputDir, { recursive: true });
  const reportJson = JSON.stringify(report, null, 2);
  await fs.promises.writeFile(outputFile, reportJson, "utf-8");
}

// reporters/masking.ts
var DEFAULT_MASK_COLOR = "#000000";
async function maskPiiInScreenshot(page, options) {
  if (options.selectors.length === 0) {
    return;
  }
  const maskColor = options.maskColor ?? DEFAULT_MASK_COLOR;
  const blurRadius = options.blurRadius;
  const selectorList = options.selectors.join(", ");
  const cssRules = [];
  if (blurRadius !== void 0 && blurRadius > 0) {
    cssRules.push(`
      ${selectorList} {
        filter: blur(${blurRadius}px) !important;
        -webkit-filter: blur(${blurRadius}px) !important;
      }
    `);
  } else {
    cssRules.push(`
      ${selectorList} {
        background-color: ${maskColor} !important;
        color: ${maskColor} !important;
        border-color: ${maskColor} !important;
        opacity: 1 !important;
      }
      ${selectorList} * {
        visibility: hidden !important;
      }
    `);
  }
  const cssContent = cssRules.join("\n");
  await page.addStyleTag({
    content: cssContent
  });
  await page.waitForTimeout(100);
}
async function removePiiMasking(page) {
  await page.evaluate(() => {
    const styles = document.querySelectorAll("style");
    for (const style of Array.from(styles)) {
      if (style.textContent?.includes("!important")) {
        style.remove();
      }
    }
  });
}
function validatePiiSelectors(selectors) {
  for (const selector of selectors) {
    try {
      document.querySelector(selector);
    } catch {
      return false;
    }
  }
  return true;
}
function sanitizePiiSelectors(selectors) {
  const valid = [];
  for (const selector of selectors) {
    try {
      document.querySelector(selector);
      valid.push(selector);
    } catch {
      continue;
    }
  }
  return valid;
}
async function saveScreenshot(page, options) {
  const outputDir = path.dirname(options.path);
  await fs.promises.mkdir(outputDir, { recursive: true });
  if (options.maskPii && options.piiSelectors && options.piiSelectors.length > 0) {
    await maskPiiInScreenshot(page, {
      selectors: options.piiSelectors
    });
    try {
      await page.screenshot({
        path: options.path,
        fullPage: true
      });
    } finally {
      await removePiiMasking(page);
    }
  } else {
    await page.screenshot({
      path: options.path,
      fullPage: true
    });
  }
}
async function ensureArtifactDir(dirPath) {
  await fs.promises.mkdir(dirPath, { recursive: true });
}
function getArtifactExtension(filePath) {
  const parts = filePath.split(".");
  return parts[parts.length - 1] ?? "";
}
function validateArtifactPath(filePath) {
  if (filePath.includes("..")) {
    return false;
  }
  if (filePath.startsWith("/") || /^[A-Z]:/i.test(filePath)) {
    return false;
  }
  return true;
}

exports.ARTKReporter = ARTKReporter;
exports.calculateJourneyStatus = calculateJourneyStatus;
exports.createJourneyReport = createJourneyReport;
exports.ensureArtifactDir = ensureArtifactDir;
exports.extractJourneyId = extractJourneyId;
exports.generateARTKReport = generateARTKReport;
exports.getArtifactExtension = getArtifactExtension;
exports.groupTestsByJourney = groupTestsByJourney;
exports.mapTestToJourney = mapTestToJourney;
exports.maskPiiInScreenshot = maskPiiInScreenshot;
exports.removePiiMasking = removePiiMasking;
exports.sanitizePiiSelectors = sanitizePiiSelectors;
exports.saveScreenshot = saveScreenshot;
exports.validateArtifactPath = validateArtifactPath;
exports.validatePiiSelectors = validatePiiSelectors;
exports.writeARTKReport = writeARTKReport;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map