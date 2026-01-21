import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

// harness/playwright.config.base.ts
var DEFAULT_AUTH_SETUP_PATTERN = "**/auth.setup.ts";
var DEFAULT_STORAGE_STATE_PATTERN = "{role}.json";
function createAuthSetupProject(role, storageStatePath, testMatch = DEFAULT_AUTH_SETUP_PATTERN) {
  if (!role || typeof role !== "string") {
    throw new Error("Role must be a non-empty string");
  }
  if (!storageStatePath || typeof storageStatePath !== "string") {
    throw new Error("Storage state path must be a non-empty string");
  }
  return {
    name: `auth-setup-${role}`,
    testMatch,
    use: {
      storageState: void 0
      // Auth setup starts without storage state
    }
  };
}
function createAuthSetupProjects(roles, storageStateDir, filePattern = DEFAULT_STORAGE_STATE_PATTERN, testMatch = DEFAULT_AUTH_SETUP_PATTERN) {
  return roles.map((role) => {
    const filename = resolveStorageStateFilename(role, filePattern);
    const storagePath = path.join(storageStateDir, filename);
    return createAuthSetupProject(role, storagePath, testMatch);
  });
}
function createBrowserProjects(browsers, roles, storageStateDir, filePattern = DEFAULT_STORAGE_STATE_PATTERN, dependencies = []) {
  const projects = [];
  for (const browser of browsers) {
    projects.push(createBrowserProject(browser));
    for (const role of roles) {
      const filename = resolveStorageStateFilename(role, filePattern);
      const storageStatePath = path.join(storageStateDir, filename);
      const authDeps = [`auth-setup-${role}`, ...dependencies];
      projects.push(
        createBrowserProject(browser, role, storageStatePath, authDeps)
      );
    }
  }
  return projects;
}
function createBrowserProject(browser, role, storageStatePath, dependencies) {
  const name = role ? `${browser}-${role}` : browser;
  const project = {
    name,
    use: {
      browserName: browser,
      ...storageStatePath && { storageState: storageStatePath }
    },
    ...dependencies && dependencies.length > 0 && { dependencies }
  };
  return project;
}
function createUnauthenticatedBrowserProjects(browsers) {
  return browsers.map((browser) => createBrowserProject(browser));
}
function resolveStorageStateFilename(role, pattern, env = "default") {
  let filename = pattern.replace("{role}", role);
  filename = filename.replace("{env}", env);
  if (!filename.endsWith(".json")) {
    filename = `${filename}.json`;
  }
  return filename;
}
function getStorageStatePathForRole(role, storageStateDir, filePattern = DEFAULT_STORAGE_STATE_PATTERN, env) {
  const filename = resolveStorageStateFilename(role, filePattern, env);
  return path.join(storageStateDir, filename);
}
function filterProjectsByBrowser(projects, browser) {
  return projects.filter(
    (p) => p.name === browser || p.name.startsWith(`${browser}-`)
  );
}
function filterProjectsByRole(projects, role) {
  return projects.filter(
    (p) => p.name.includes(role)
  );
}
function getAuthSetupProjects(projects) {
  return projects.filter((p) => p.name.startsWith("auth-setup-"));
}
function getBrowserProjects(projects) {
  return projects.filter((p) => !p.name.startsWith("auth-setup-"));
}

// harness/reporters.ts
var DEFAULT_REPORTER_OPTIONS = {
  html: true,
  htmlOutputFolder: "playwright-report",
  htmlOpen: "on-failure",
  json: false,
  jsonOutputFile: "test-results/results.json",
  junit: false,
  junitOutputFile: "test-results/junit.xml",
  artk: false,
  artkOutputFile: "test-results/artk-report.json",
  includeJourneyMapping: true,
  list: true,
  dot: false
};
function getReporterConfig(config) {
  const reporters = [];
  const reportersConfig = config.reporters;
  reporters.push(["list"]);
  if (reportersConfig.html?.enabled) {
    const htmlReporter = [
      "html",
      {
        outputFolder: reportersConfig.html.outputFolder,
        open: reportersConfig.html.open
      }
    ];
    reporters.push(htmlReporter);
  }
  if (reportersConfig.json?.enabled) {
    const jsonReporter = [
      "json",
      {
        outputFile: reportersConfig.json.outputFile
      }
    ];
    reporters.push(jsonReporter);
  }
  if (reportersConfig.junit?.enabled) {
    const junitReporter = [
      "junit",
      {
        outputFile: reportersConfig.junit.outputFile
      }
    ];
    reporters.push(junitReporter);
  }
  if (reportersConfig.artk?.enabled) {
    const artkReporter = [
      "./reporters/artk-reporter.ts",
      {
        outputFile: reportersConfig.artk.outputFile,
        includeJourneyMapping: reportersConfig.artk.includeJourneyMapping
      }
    ];
    reporters.push(artkReporter);
  }
  return reporters;
}
function getReporterConfigFromOptions(options = {}) {
  const mergedOptions = { ...DEFAULT_REPORTER_OPTIONS, ...options };
  const reporters = [];
  if (mergedOptions.list) {
    reporters.push(["list"]);
  } else if (mergedOptions.dot) {
    reporters.push(["dot"]);
  }
  if (mergedOptions.html) {
    reporters.push([
      "html",
      {
        outputFolder: mergedOptions.htmlOutputFolder,
        open: mergedOptions.htmlOpen
      }
    ]);
  }
  if (mergedOptions.json) {
    reporters.push([
      "json",
      {
        outputFile: mergedOptions.jsonOutputFile
      }
    ]);
  }
  if (mergedOptions.junit) {
    reporters.push([
      "junit",
      {
        outputFile: mergedOptions.junitOutputFile
      }
    ]);
  }
  if (mergedOptions.artk) {
    reporters.push([
      "./reporters/artk-reporter.ts",
      {
        outputFile: mergedOptions.artkOutputFile,
        includeJourneyMapping: mergedOptions.includeJourneyMapping
      }
    ]);
  }
  return reporters;
}
function getMinimalReporterConfig() {
  return [["list"]];
}
function getCIReporterConfig(junitPath = "test-results/junit.xml", jsonPath = "test-results/results.json") {
  return [
    ["dot"],
    // Minimal console output for CI
    ["junit", { outputFile: junitPath }],
    ["json", { outputFile: jsonPath }]
  ];
}
function mergeReporterConfigs(...configs) {
  const seen = /* @__PURE__ */ new Map();
  for (const config of configs) {
    for (const reporter of config) {
      const type = Array.isArray(reporter) ? reporter[0] : String(reporter);
      seen.set(type, reporter);
    }
  }
  return Array.from(seen.values());
}
function hasReporter(reporters, type) {
  return reporters.some((r) => {
    const reporterType = Array.isArray(r) ? r[0] : String(r);
    return reporterType === type || typeof reporterType === "string" && reporterType.includes(type);
  });
}

// harness/playwright.config.base.ts
var DEFAULT_TIER = "regression";
var DEFAULT_TEST_DIR = "tests";
var DEFAULT_OUTPUT_DIR = "test-results";
var DEFAULT_EXPECT_TIMEOUT = 5e3;
var DEFAULT_TIER_SETTINGS = {
  smoke: {
    retries: 0,
    workers: 1,
    timeout: 3e4,
    tag: "@smoke"
  },
  release: {
    retries: 1,
    workers: 2,
    timeout: 6e4,
    tag: "@release"
  },
  regression: {
    retries: 2,
    workers: 4,
    timeout: 12e4,
    tag: "@regression"
  }
};
function getTierSettings(config, tier = DEFAULT_TIER) {
  const tierConfig = config.tiers[tier];
  if (!tierConfig) {
    return DEFAULT_TIER_SETTINGS[tier] ?? DEFAULT_TIER_SETTINGS.regression;
  }
  return {
    retries: tierConfig.retries,
    workers: tierConfig.workers,
    timeout: tierConfig.timeout,
    tag: tierConfig.tag
  };
}
function getAllTierSettings(config) {
  return {
    smoke: getTierSettings(config, "smoke"),
    release: getTierSettings(config, "release"),
    regression: getTierSettings(config, "regression")
  };
}
function mapBrowserChannel(channel) {
  if (!channel || channel === "bundled") {
    return void 0;
  }
  return channel;
}
function getUseOptions(config, activeEnvironment) {
  const envName = activeEnvironment ?? config.activeEnvironment;
  const envConfig = config.environments[envName];
  const baseURL = envConfig?.baseUrl ?? config.app.baseUrl;
  const screenshotMode = mapScreenshotMode(config.artifacts.screenshots.mode);
  const videoMode = mapCaptureMode(config.artifacts.video.mode);
  const traceMode = mapCaptureMode(config.artifacts.trace.mode);
  const playwrightChannel = mapBrowserChannel(config.browsers.channel);
  return {
    baseURL,
    viewport: {
      width: config.browsers.viewport.width,
      height: config.browsers.viewport.height
    },
    headless: config.browsers.headless,
    ...config.browsers.slowMo && { slowMo: config.browsers.slowMo },
    ...playwrightChannel && { channel: playwrightChannel },
    screenshot: screenshotMode,
    video: videoMode,
    trace: traceMode,
    testIdAttribute: config.selectors.testIdAttribute
  };
}
function mapScreenshotMode(mode) {
  return mode;
}
function mapCaptureMode(mode) {
  return mode;
}
function createPlaywrightConfig(options) {
  const {
    config,
    activeEnvironment,
    tier = DEFAULT_TIER,
    projectRoot = process.cwd(),
    includeAuthSetup = true,
    testDir = DEFAULT_TEST_DIR,
    outputDir = DEFAULT_OUTPUT_DIR,
    additionalProjects = []
  } = options;
  const tierSettings = getTierSettings(config, tier);
  const useOptions = getUseOptions(config, activeEnvironment);
  const reporters = getReporterConfig(config);
  const projects = buildProjects(
    config,
    projectRoot,
    includeAuthSetup,
    additionalProjects
  );
  const isCI = Boolean(process.env.CI);
  return {
    testDir,
    outputDir: config.artifacts.outputDir ?? outputDir,
    fullyParallel: true,
    forbidOnly: isCI,
    retries: tierSettings.retries,
    workers: tierSettings.workers,
    timeout: tierSettings.timeout,
    expect: {
      timeout: DEFAULT_EXPECT_TIMEOUT
    },
    reporter: reporters,
    use: useOptions,
    projects
  };
}
function buildProjects(config, projectRoot, includeAuthSetup, additionalProjects) {
  const projects = [];
  const roles = Object.keys(config.auth.roles);
  const browsers = config.browsers.enabled;
  const storageStateDir = path.join(
    projectRoot,
    config.auth.storageState.directory
  );
  const filePattern = config.auth.storageState.filePattern;
  if (includeAuthSetup && roles.length > 0) {
    const authProjects = createAuthSetupProjects(
      roles,
      storageStateDir,
      filePattern
    );
    projects.push(...authProjects);
  }
  const browserProjects = createBrowserProjects(
    browsers,
    roles,
    storageStateDir,
    filePattern
  );
  projects.push(...browserProjects);
  projects.push(...additionalProjects);
  return projects;
}
function createMinimalPlaywrightConfig(baseURL, browsers = ["chromium"]) {
  const projects = browsers.map((browser) => ({
    name: browser,
    use: {
      browserName: browser
    }
  }));
  return {
    testDir: DEFAULT_TEST_DIR,
    outputDir: DEFAULT_OUTPUT_DIR,
    fullyParallel: true,
    forbidOnly: Boolean(process.env.CI),
    retries: 0,
    workers: 1,
    timeout: 3e4,
    expect: {
      timeout: DEFAULT_EXPECT_TIMEOUT
    },
    reporter: [["list"]],
    use: {
      baseURL,
      viewport: { width: 1280, height: 720 },
      headless: true,
      screenshot: "only-on-failure",
      video: "off",
      trace: "off",
      testIdAttribute: "data-testid"
    },
    projects
  };
}
function mergePlaywrightConfigs(base, overrides) {
  return {
    ...base,
    ...overrides,
    use: {
      ...base.use,
      ...overrides.use
    },
    projects: overrides.projects ?? base.projects,
    reporter: overrides.reporter ?? base.reporter ?? []
  };
}
function createTierOverrides(config, tier) {
  const settings = getTierSettings(config, tier);
  return {
    retries: settings.retries,
    workers: settings.workers,
    timeout: settings.timeout
  };
}
var execAsync = promisify(exec);
function parseCommandPath(command) {
  const trimmed = command.replace(/\s+--version$/, "").trim();
  return trimmed.replace(/^"(.*)"$/, "$1");
}
async function checkCommands(commands) {
  for (const cmd of commands) {
    try {
      const { stdout } = await execAsync(cmd, { timeout: 5e3 });
      const version = stdout.match(/(\d+\.\d+\.\d+\.\d+)/)?.[1];
      return {
        version,
        path: parseCommandPath(cmd)
      };
    } catch {
      continue;
    }
  }
  return {};
}
async function validateBrowserChannel(channel) {
  if (!channel || channel === "bundled") {
    return { available: true };
  }
  try {
    if (channel === "msedge") {
      const edgeCommands = [
        "microsoft-edge --version",
        "microsoft-edge-stable --version",
        '"/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" --version',
        '"C:\\\\Program Files (x86)\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe" --version',
        '"C:\\\\Program Files\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe" --version',
        '"%LOCALAPPDATA%\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe" --version',
        '"%USERPROFILE%\\\\AppData\\\\Local\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe" --version'
      ];
      const result = await checkCommands(edgeCommands);
      if (result.path) {
        return { available: true, ...result };
      }
      return {
        available: false,
        reason: `Browser "${channel}" not found. Install from https://microsoft.com/edge`
      };
    }
    if (channel === "chrome" || channel === "chrome-beta" || channel === "chrome-dev") {
      const chromeCommands = [
        "google-chrome --version",
        "google-chrome-stable --version",
        "google-chrome-beta --version",
        "google-chrome-unstable --version",
        '"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --version',
        "chromium --version",
        '"C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe" --version',
        '"C:\\\\Program Files (x86)\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe" --version',
        '"%LOCALAPPDATA%\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe" --version',
        '"%USERPROFILE%\\\\AppData\\\\Local\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe" --version'
      ];
      const result = await checkCommands(chromeCommands);
      if (result.path) {
        return { available: true, ...result };
      }
      return {
        available: false,
        reason: `Browser "${channel}" not found. Install from https://google.com/chrome`
      };
    }
  } catch (error) {
    return {
      available: false,
      reason: `Browser validation error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
  return { available: true };
}

export { createAuthSetupProject, createAuthSetupProjects, createBrowserProject, createBrowserProjects, createMinimalPlaywrightConfig, createPlaywrightConfig, createTierOverrides, createUnauthenticatedBrowserProjects, filterProjectsByBrowser, filterProjectsByRole, getAllTierSettings, getAuthSetupProjects, getBrowserProjects, getCIReporterConfig, getMinimalReporterConfig, getReporterConfig, getReporterConfigFromOptions, getStorageStatePathForRole, getTierSettings, getUseOptions, hasReporter, mergePlaywrightConfigs, mergeReporterConfigs, resolveStorageStateFilename, validateBrowserChannel };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map