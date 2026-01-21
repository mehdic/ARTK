'use strict';

var fs = require('fs');
var path = require('path');
require('yaml');
var zod = require('zod');
var child_process = require('child_process');
var os = require('os');

// src/journey/parseJourney.ts
var JourneyStatusSchema = zod.z.enum([
  "proposed",
  "defined",
  "clarified",
  "implemented",
  "quarantined",
  "deprecated"
]);
var JourneyTierSchema = zod.z.enum(["smoke", "release", "regression"]);
var DataStrategySchema = zod.z.enum(["seed", "create", "reuse"]);
var CleanupStrategySchema = zod.z.enum(["required", "best-effort", "none"]);
var CompletionTypeSchema = zod.z.enum(["url", "toast", "element", "text", "title", "api"]);
var ElementStateSchema = zod.z.enum(["visible", "hidden", "attached", "detached"]);
var CompletionSignalSchema = zod.z.object({
  type: CompletionTypeSchema,
  value: zod.z.string().min(1, "Completion signal value is required"),
  options: zod.z.object({
    timeout: zod.z.number().positive().optional(),
    exact: zod.z.boolean().optional(),
    state: ElementStateSchema.optional(),
    method: zod.z.string().optional(),
    status: zod.z.number().int().positive().optional()
  }).optional()
});
var DataConfigSchema = zod.z.object({
  strategy: DataStrategySchema.default("create"),
  cleanup: CleanupStrategySchema.default("best-effort")
});
var ModulesSchema = zod.z.object({
  foundation: zod.z.array(zod.z.string()).default([]),
  features: zod.z.array(zod.z.string()).default([])
});
var TestRefSchema = zod.z.object({
  file: zod.z.string(),
  line: zod.z.number().optional()
});
var LinksSchema = zod.z.object({
  issues: zod.z.array(zod.z.string()).optional(),
  prs: zod.z.array(zod.z.string()).optional(),
  docs: zod.z.array(zod.z.string()).optional()
});
var NegativePathSchema = zod.z.object({
  name: zod.z.string().min(1, "Negative path name is required"),
  input: zod.z.record(zod.z.any()),
  expectedError: zod.z.string().min(1, "Expected error message is required"),
  expectedElement: zod.z.string().optional()
});
var VisualRegressionSchema = zod.z.object({
  enabled: zod.z.boolean(),
  snapshots: zod.z.array(zod.z.string()).optional(),
  threshold: zod.z.number().min(0).max(1).optional()
});
var AccessibilityTimingSchema = zod.z.enum(["afterEach", "inTest"]);
var AccessibilitySchema = zod.z.object({
  enabled: zod.z.boolean(),
  rules: zod.z.array(zod.z.string()).optional(),
  exclude: zod.z.array(zod.z.string()).optional(),
  /**
   * When to run accessibility checks:
   * - 'afterEach': Run after each test (default, catches issues but doesn't fail individual tests)
   * - 'inTest': Run within test steps (fails immediately, better for CI)
   */
  timing: AccessibilityTimingSchema.default("afterEach")
});
var PerformanceSchema = zod.z.object({
  enabled: zod.z.boolean(),
  budgets: zod.z.object({
    lcp: zod.z.number().positive().optional(),
    fid: zod.z.number().positive().optional(),
    cls: zod.z.number().min(0).optional(),
    ttfb: zod.z.number().positive().optional()
  }).optional(),
  /** Timeout for collecting performance metrics in ms (default: 3000) */
  collectTimeout: zod.z.number().positive().optional()
});
var TestDataSetSchema = zod.z.object({
  name: zod.z.string().min(1, "Test data set name is required"),
  description: zod.z.string().optional(),
  data: zod.z.record(zod.z.string(), zod.z.any())
});
var JourneyFrontmatterSchema = zod.z.object({
  id: zod.z.string().regex(/^JRN-\d{4}$/, "Journey ID must be in format JRN-XXXX"),
  title: zod.z.string().min(1, "Title is required"),
  status: JourneyStatusSchema,
  tier: JourneyTierSchema,
  scope: zod.z.string().min(1, "Scope is required"),
  actor: zod.z.string().min(1, "Actor is required"),
  revision: zod.z.number().int().positive().default(1),
  owner: zod.z.string().optional(),
  statusReason: zod.z.string().optional(),
  modules: ModulesSchema.default({ foundation: [], features: [] }),
  tests: zod.z.array(zod.z.union([zod.z.string(), TestRefSchema])).default([]),
  data: DataConfigSchema.optional(),
  completion: zod.z.array(CompletionSignalSchema).optional(),
  links: LinksSchema.optional(),
  tags: zod.z.array(zod.z.string()).optional(),
  flags: zod.z.object({
    required: zod.z.array(zod.z.string()).optional(),
    forbidden: zod.z.array(zod.z.string()).optional()
  }).optional(),
  prerequisites: zod.z.array(zod.z.string()).optional().describe("Array of Journey IDs that must run first"),
  negativePaths: zod.z.array(NegativePathSchema).optional().describe("Error scenarios to test"),
  testData: zod.z.array(TestDataSetSchema).optional().describe("Parameterized test data sets for data-driven testing"),
  visualRegression: VisualRegressionSchema.optional(),
  accessibility: AccessibilitySchema.optional(),
  performance: PerformanceSchema.optional()
});
JourneyFrontmatterSchema.extend({
  status: zod.z.literal("clarified")
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
  status: zod.z.literal("implemented")
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
  status: zod.z.literal("quarantined"),
  owner: zod.z.string().min(1, "Quarantined journeys require an owner"),
  statusReason: zod.z.string().min(1, "Quarantined journeys require a status reason")
}).refine(
  (data) => {
    return data.links?.issues && data.links.issues.length > 0;
  },
  {
    message: "Quarantined journeys must have at least one linked issue",
    path: ["links", "issues"]
  }
);

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
function getPatternStats(results) {
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
    byPattern: getPatternStats(results)
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
    child_process.execSync("npx eslint --version", {
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
    const result = child_process.execSync("npm list eslint-plugin-playwright", {
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
  const tempDir = path.join(os.tmpdir(), "autogen-lint");
  fs.mkdirSync(tempDir, { recursive: true });
  const tempFile = path.join(tempDir, filename);
  try {
    fs.writeFileSync(tempFile, code, "utf-8");
    const args = ["eslint", "--format", "json"];
    if (fix) {
      args.push("--fix");
    }
    if (configPath && fs.existsSync(configPath)) {
      args.push("--config", configPath);
    }
    args.push(tempFile);
    const result = child_process.execSync(`npx ${args.join(" ")}`, {
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
      fs.unlinkSync(tempFile);
    } catch {
    }
  }
}
async function lintFile(filePath, options = {}) {
  const { cwd = path.dirname(filePath), fix = false, configPath } = options;
  if (!fs.existsSync(filePath)) {
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
    if (configPath && fs.existsSync(configPath)) {
      args.push("--config", configPath);
    }
    args.push(filePath);
    const result = child_process.execSync(`npx ${args.join(" ")}`, {
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

exports.FORBIDDEN_PATTERNS = FORBIDDEN_PATTERNS;
exports.PLAYWRIGHT_LINT_RULES = PLAYWRIGHT_LINT_RULES;
exports.TAG_PATTERNS = TAG_PATTERNS;
exports.categorizeTags = categorizeTags;
exports.filterBySeverity = filterBySeverity;
exports.findACReferences = findACReferences;
exports.findTestSteps = findTestSteps;
exports.generateCoverageReport = generateCoverageReport;
exports.generateESLintConfig = generateESLintConfig;
exports.generateExpectedTags = generateExpectedTags;
exports.generateValidationReport = generateValidationReport;
exports.getPatternStats = getPatternStats;
exports.getViolationSummary = getViolationSummary;
exports.hasErrorViolations = hasErrorViolations;
exports.hasLintErrors = hasLintErrors;
exports.isCodeValid = isCodeValid;
exports.isESLintAvailable = isESLintAvailable;
exports.isJourneyReady = isJourneyReady;
exports.isPlaywrightPluginAvailable = isPlaywrightPluginAvailable;
exports.lintCode = lintCode;
exports.lintFile = lintFile;
exports.parseESLintOutput = parseESLintOutput;
exports.parseTagsFromCode = parseTagsFromCode;
exports.parseTagsFromFrontmatter = parseTagsFromFrontmatter;
exports.scanForbiddenPatterns = scanForbiddenPatterns;
exports.scanResultsToIssues = scanResultsToIssues;
exports.validateCode = validateCode;
exports.validateCodeCoverage = validateCodeCoverage;
exports.validateCodeSync = validateCodeSync;
exports.validateIRCoverage = validateIRCoverage;
exports.validateJourneyFrontmatter = validateJourneyFrontmatter;
exports.validateJourneySchema = validateJourneySchema;
exports.validateJourneyStatus = validateJourneyStatus;
exports.validateJourneyTags = validateJourneyTags;
exports.validateJourneyTier = validateJourneyTier;
exports.validateTags = validateTags;
exports.validateTagsInCode = validateTagsInCode;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map