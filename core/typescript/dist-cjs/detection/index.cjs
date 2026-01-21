'use strict';

var promises = require('fs/promises');
var fs3 = require('fs');
var path5 = require('path');
var child_process = require('child_process');
var stripJsonComments = require('strip-json-comments');

function _interopDefault (e) { return e && e.__esModule ? e : { default: e }; }

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

var fs3__namespace = /*#__PURE__*/_interopNamespace(fs3);
var path5__namespace = /*#__PURE__*/_interopNamespace(path5);
var stripJsonComments__default = /*#__PURE__*/_interopDefault(stripJsonComments);

// utils/logger.ts
var LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};
var globalConfig = {
  minLevel: "info",
  format: "json",
  output: (entry) => {
    const target = entry.level === "error" ? console.error : console.log;
    {
      target(JSON.stringify(entry));
    }
  }
};
function createLogger(module, operation) {
  const log = (level, message, context) => {
    if (LOG_LEVELS[level] < LOG_LEVELS[globalConfig.minLevel]) {
      return;
    }
    const entry = {
      level,
      module,
      operation,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      message,
      context
    };
    globalConfig.output(entry);
  };
  return {
    debug: (message, context) => log("debug", message, context),
    info: (message, context) => log("info", message, context),
    warn: (message, context) => log("warn", message, context),
    error: (message, context) => log("error", message, context)
  };
}

// detection/signals.ts
var logger = createLogger("detection", "signals");
var MAX_WARNED_SIGNALS = 1e3;
var warnedSignals = /* @__PURE__ */ new Set();
var SIGNAL_WEIGHTS = {
  // Package.json framework dependencies (highest weight)
  "package-dependency:react": 30,
  "package-dependency:vue": 30,
  "package-dependency:@angular/core": 30,
  "package-dependency:svelte": 30,
  // Package.json meta-framework dependencies (highest weight)
  "package-dependency:next": 35,
  "package-dependency:nuxt": 35,
  "package-dependency:gatsby": 35,
  "package-dependency:remix": 35,
  "package-dependency:astro": 35,
  // Package.json build tool dependencies (medium weight)
  "package-dependency:vite": 20,
  "package-dependency:webpack": 20,
  "package-dependency:parcel": 20,
  "package-dependency:rollup": 15,
  "package-dependency:esbuild": 15,
  // Entry files - React/TypeScript (medium-high weight)
  "entry-file:src/App.tsx": 20,
  "entry-file:src/App.jsx": 20,
  "entry-file:src/app.tsx": 20,
  "entry-file:src/app.jsx": 20,
  "entry-file:src/main.tsx": 15,
  "entry-file:src/main.jsx": 15,
  "entry-file:src/index.tsx": 15,
  "entry-file:src/index.jsx": 15,
  // Entry files - Vue (vue.config.js or vite.config.ts for disambiguation)
  "entry-file:src/App.vue": 20,
  "entry-file:vue.config.js": 20,
  // Shared entry files (Vue/Angular both use these - disambiguation via config files)
  "entry-file:src/main.ts": 15,
  "entry-file:src/main.js": 15,
  // Entry files - Next.js
  "entry-file:app/page.tsx": 20,
  "entry-file:app/page.jsx": 20,
  "entry-file:app/layout.tsx": 15,
  "entry-file:pages/index.tsx": 15,
  "entry-file:pages/index.jsx": 15,
  "entry-file:pages/_app.tsx": 15,
  "entry-file:pages/_app.jsx": 15,
  // Entry files - Nuxt
  "entry-file:pages/index.vue": 15,
  "entry-file:app.vue": 15,
  "entry-file:nuxt.config.ts": 20,
  "entry-file:nuxt.config.js": 20,
  // Entry files - Angular (angular.json is the definitive indicator)
  "entry-file:src/app/app.component.ts": 20,
  "entry-file:angular.json": 25,
  "entry-file:src/app/app.module.ts": 15,
  // Directory names (medium weight)
  "directory-name:frontend": 15,
  "directory-name:client": 15,
  "directory-name:web": 10,
  "directory-name:app": 10,
  "directory-name:ui": 10,
  "directory-name:webapp": 15,
  "directory-name:web-app": 15,
  "directory-name:web-client": 15,
  // index.html presence (low weight)
  "index-html:public/index.html": 10,
  "index-html:index.html": 10,
  "index-html:src/index.html": 10,
  // Config files (various weights)
  "config-file:vite.config.ts": 20,
  "config-file:vite.config.js": 20,
  "config-file:webpack.config.js": 15,
  "config-file:next.config.js": 25,
  "config-file:next.config.mjs": 25,
  "config-file:nuxt.config.ts": 25,
  "config-file:angular.json": 25,
  "config-file:svelte.config.js": 20,
  "config-file:astro.config.mjs": 20,
  // AG Grid dependencies (indicates data-heavy frontend)
  "package-dependency:ag-grid-community": 25,
  "package-dependency:ag-grid-enterprise": 30,
  "package-dependency:ag-grid-react": 25,
  "package-dependency:ag-grid-vue": 25,
  "package-dependency:ag-grid-vue3": 25,
  "package-dependency:ag-grid-angular": 25,
  "package-dependency:@ag-grid-community/core": 25,
  "package-dependency:@ag-grid-enterprise/core": 30
};
var CONFIDENCE_THRESHOLDS = {
  HIGH: 40,
  MEDIUM: 20
};
var FRAMEWORK_DETECTION_MAP = {
  "react": "react-spa",
  "react-dom": "react-spa",
  "vue": "vue-spa",
  "@angular/core": "angular",
  "@angular/platform-browser": "angular",
  "next": "next",
  "nuxt": "nuxt",
  "nuxt3": "nuxt",
  "gatsby": "react-spa",
  // Gatsby uses React
  "svelte": "other",
  "astro": "other",
  "remix": "react-spa"
  // Remix uses React
};
var FRONTEND_DIRECTORY_PATTERNS = [
  "frontend",
  "client",
  "web",
  "webapp",
  "web-app",
  "web-client",
  "app",
  "ui"
];
var FRONTEND_PACKAGE_INDICATORS = [
  // Frameworks
  "react",
  "react-dom",
  "vue",
  "@angular/core",
  "svelte",
  "solid-js",
  // Meta-frameworks
  "next",
  "nuxt",
  "gatsby",
  "astro",
  "remix",
  "@remix-run/react",
  // Build tools (secondary indicators)
  "vite",
  "webpack",
  "parcel",
  "@vitejs/plugin-react",
  "@vitejs/plugin-vue",
  // Data grid libraries (indicates data-heavy frontend)
  "ag-grid-community",
  "ag-grid-enterprise",
  "ag-grid-react",
  "ag-grid-vue",
  "ag-grid-vue3",
  "ag-grid-angular",
  "@ag-grid-community/core",
  "@ag-grid-enterprise/core"
];
function calculateScore(signals) {
  return signals.reduce((score, signal) => {
    return score + getSignalWeight(signal);
  }, 0);
}
function getConfidenceFromScore(score) {
  if (score >= CONFIDENCE_THRESHOLDS.HIGH) return "high";
  if (score >= CONFIDENCE_THRESHOLDS.MEDIUM) return "medium";
  return "low";
}
function getSignalCategory(signal) {
  const [category] = signal.split(":");
  const validCategories = [
    "package-dependency",
    "entry-file",
    "directory-name",
    "index-html",
    "config-file"
  ];
  return validCategories.includes(category) ? category : void 0;
}
function createSignal(category, source) {
  return `${category}:${source}`;
}
function getSignalWeight(signal) {
  const weight = SIGNAL_WEIGHTS[signal];
  if (weight === void 0) {
    if (!warnedSignals.has(signal)) {
      if (warnedSignals.size >= MAX_WARNED_SIGNALS) {
        warnedSignals.clear();
      }
      warnedSignals.add(signal);
      logger.warn("Unknown detection signal (returning weight 0)", {
        signal,
        hint: "Check for typos or add the signal to SIGNAL_WEIGHTS"
      });
    }
    return 0;
  }
  return weight;
}
function clearWarnedSignalsCache() {
  warnedSignals.clear();
}
function isFrontendPackage(packageName) {
  return FRONTEND_PACKAGE_INDICATORS.includes(
    packageName
  );
}
function matchesFrontendDirectoryPattern(dirName) {
  const normalized = dirName.toLowerCase();
  return FRONTEND_DIRECTORY_PATTERNS.some(
    (pattern) => normalized.includes(pattern)
  );
}
var AG_GRID_PACKAGE_INDICATORS = [
  "ag-grid-community",
  "ag-grid-enterprise",
  "ag-grid-react",
  "ag-grid-vue",
  "ag-grid-vue3",
  "ag-grid-angular",
  "@ag-grid-community/core",
  "@ag-grid-enterprise/core"
];
function isAgGridPackage(packageName) {
  return AG_GRID_PACKAGE_INDICATORS.includes(
    packageName
  );
}
function isAgGridEnterprisePackage(packageName) {
  return packageName === "ag-grid-enterprise" || packageName === "@ag-grid-enterprise/core";
}
var logger2 = createLogger("detection", "package-scanner");
var PackageScanner = class {
  /**
   * Scans a package.json file for frontend dependencies.
   *
   * @param dirPath - Directory containing package.json
   * @returns Scan result with signals and detected type
   */
  async scan(dirPath) {
    const packageJsonPath = path5__namespace.default.join(dirPath, "package.json");
    const emptyResult = {
      found: false,
      packageJsonPath: null,
      packageName: null,
      signals: [],
      detailedSignals: [],
      score: 0,
      detectedType: null,
      allDependencies: []
    };
    if (!fs3.existsSync(packageJsonPath)) {
      return emptyResult;
    }
    try {
      const content = await promises.readFile(packageJsonPath, "utf-8");
      const pkg = JSON.parse(content);
      return this.analyzePackage(pkg, packageJsonPath);
    } catch (error) {
      logger2.warn("Failed to parse package.json (treating as empty)", {
        path: packageJsonPath,
        error: error instanceof Error ? error.message : String(error)
      });
      return {
        ...emptyResult,
        packageJsonPath
      };
    }
  }
  /**
   * Analyzes a parsed package.json for frontend indicators.
   */
  analyzePackage(pkg, packageJsonPath) {
    const allDeps = this.getAllDependencies(pkg);
    const signals = [];
    const detailedSignals = [];
    for (const dep of allDeps) {
      if (this.isFrontendDependency(dep)) {
        const signal = createSignal("package-dependency", dep);
        const weight = getSignalWeight(signal);
        if (weight > 0) {
          signals.push(signal);
          detailedSignals.push({
            type: "package-dependency",
            source: signal,
            weight,
            description: `Found ${dep} in package.json dependencies`
          });
        }
      }
    }
    const score = detailedSignals.reduce((sum, s) => sum + s.weight, 0);
    const detectedType = this.detectFrameworkType(allDeps);
    return {
      found: true,
      packageJsonPath,
      packageName: pkg.name ?? null,
      signals,
      detailedSignals,
      score,
      detectedType,
      allDependencies: allDeps
    };
  }
  /**
   * Gets all dependencies from package.json (deps + devDeps + peerDeps).
   */
  getAllDependencies(pkg) {
    const deps = /* @__PURE__ */ new Set();
    if (pkg.dependencies) {
      Object.keys(pkg.dependencies).forEach((d) => deps.add(d));
    }
    if (pkg.devDependencies) {
      Object.keys(pkg.devDependencies).forEach((d) => deps.add(d));
    }
    if (pkg.peerDependencies) {
      Object.keys(pkg.peerDependencies).forEach((d) => deps.add(d));
    }
    return Array.from(deps);
  }
  /**
   * Checks if a dependency indicates a frontend project.
   */
  isFrontendDependency(dep) {
    if (FRONTEND_PACKAGE_INDICATORS.includes(
      dep
    )) {
      return true;
    }
    if (dep in FRAMEWORK_DETECTION_MAP) {
      return true;
    }
    const scopedPatterns = [
      /^@angular\//,
      /^@vue\//,
      /^@vitejs\//,
      /^@remix-run\//,
      /^@sveltejs\//,
      /^@astrojs\//,
      /^@nuxt\//,
      /^@next\//
    ];
    return scopedPatterns.some((pattern) => pattern.test(dep));
  }
  /**
   * Detects the primary framework type from dependencies.
   * Priority: meta-frameworks > frameworks > build tools
   */
  detectFrameworkType(deps) {
    if (deps.includes("next")) return "next";
    if (deps.includes("nuxt") || deps.includes("nuxt3")) return "nuxt";
    if (deps.includes("react") || deps.includes("react-dom")) return "react-spa";
    if (deps.includes("vue")) return "vue-spa";
    if (deps.includes("@angular/core") || deps.includes("@angular/platform-browser")) {
      return "angular";
    }
    if (deps.includes("svelte")) return "other";
    if (deps.includes("astro")) return "other";
    if (deps.includes("solid-js")) return "other";
    const hasReactVitePlugin = deps.includes("@vitejs/plugin-react");
    const hasVueVitePlugin = deps.includes("@vitejs/plugin-vue");
    const hasReactWebpackPlugin = deps.includes("babel-preset-react-app") || deps.includes("@babel/preset-react");
    if (hasReactVitePlugin || hasReactWebpackPlugin) return "react-spa";
    if (hasVueVitePlugin) return "vue-spa";
    return null;
  }
};
async function scanPackageJson(dirPath) {
  const scanner = new PackageScanner();
  return scanner.scan(dirPath);
}
function hasPackageJson(dirPath) {
  return fs3.existsSync(path5__namespace.default.join(dirPath, "package.json"));
}
var ENTRY_FILE_PATTERNS = {
  // React/Generic SPA
  react: [
    "src/App.tsx",
    "src/App.jsx",
    "src/app.tsx",
    "src/app.jsx",
    "src/main.tsx",
    "src/main.jsx",
    "src/index.tsx",
    "src/index.jsx"
  ],
  // Vue (src/App.vue is definitive, vue.config.js for Vue 2 CLI projects)
  // Note: src/main.ts and src/main.js are shared with Angular and other frameworks
  // so we exclude them from Vue type detection to avoid false positives
  vue: ["src/App.vue", "vue.config.js"],
  // Next.js (App Router)
  "next-app": ["app/page.tsx", "app/page.jsx", "app/layout.tsx", "app/layout.jsx"],
  // Next.js (Pages Router)
  "next-pages": [
    "pages/index.tsx",
    "pages/index.jsx",
    "pages/_app.tsx",
    "pages/_app.jsx",
    "pages/_document.tsx",
    "pages/_document.jsx"
  ],
  // Nuxt
  nuxt: [
    "pages/index.vue",
    "app.vue",
    "nuxt.config.ts",
    "nuxt.config.js"
  ],
  // Angular (angular.json is definitive, app.module.ts is legacy but still common)
  angular: [
    "src/app/app.component.ts",
    "src/app/app.module.ts",
    "src/main.ts",
    "angular.json"
  ],
  // Config files (secondary indicators)
  config: [
    "vite.config.ts",
    "vite.config.js",
    "webpack.config.js",
    "webpack.config.ts",
    "next.config.js",
    "next.config.mjs",
    "next.config.ts",
    "svelte.config.js",
    "astro.config.mjs"
  ]
};
var EntryFileDetector = class {
  /**
   * Detects entry files in a directory.
   *
   * @param dirPath - Directory to scan for entry files
   * @returns Detection result with signals and type
   */
  async detect(dirPath) {
    const foundFiles = [];
    const signals = [];
    const detailedSignals = [];
    for (const [category, patterns] of Object.entries(ENTRY_FILE_PATTERNS)) {
      for (const pattern of patterns) {
        const fullPath = path5__namespace.default.join(dirPath, pattern);
        if (fs3.existsSync(fullPath) && this.isFile(fullPath)) {
          foundFiles.push(pattern);
          const signalCategory = pattern.includes("config") ? "config-file" : "entry-file";
          const signal = createSignal(signalCategory, pattern);
          const weight = getSignalWeight(signal);
          if (weight > 0) {
            signals.push(signal);
            detailedSignals.push({
              type: signalCategory,
              source: signal,
              weight,
              description: `Found ${category} entry file: ${pattern}`
            });
          }
        }
      }
    }
    const score = detailedSignals.reduce((sum, s) => sum + s.weight, 0);
    const detectedType = this.detectTypeFromFiles(foundFiles);
    return {
      foundFiles,
      signals,
      detailedSignals,
      score,
      detectedType
    };
  }
  /**
   * Checks if a path is a file (not a directory).
   */
  isFile(filePath) {
    try {
      return fs3.statSync(filePath).isFile();
    } catch {
      return false;
    }
  }
  /**
   * Detects the framework type from found entry files.
   */
  detectTypeFromFiles(files) {
    const hasNextApp = files.some(
      (f) => ENTRY_FILE_PATTERNS["next-app"].includes(f)
    );
    const hasNextPages = files.some(
      (f) => ENTRY_FILE_PATTERNS["next-pages"].includes(f)
    );
    const hasNextConfig = files.some(
      (f) => f.startsWith("next.config")
    );
    if (hasNextApp || hasNextPages || hasNextConfig) {
      return "next";
    }
    const hasNuxt = files.some(
      (f) => ENTRY_FILE_PATTERNS.nuxt.includes(f) || f.startsWith("nuxt.config")
    );
    if (hasNuxt) {
      return "nuxt";
    }
    const hasAngularJson = files.includes("angular.json");
    const hasAngularComponent = files.includes("src/app/app.component.ts");
    const hasAngularModule = files.includes("src/app/app.module.ts");
    if (hasAngularJson || hasAngularComponent && hasAngularModule) {
      return "angular";
    }
    const hasVue = files.some(
      (f) => ENTRY_FILE_PATTERNS.vue.includes(f)
    );
    if (hasVue) {
      return "vue-spa";
    }
    const hasReact = files.some(
      (f) => ENTRY_FILE_PATTERNS.react.includes(f)
    );
    if (hasReact) {
      return "react-spa";
    }
    return null;
  }
};
async function detectEntryFiles(dirPath) {
  const detector = new EntryFileDetector();
  return detector.detect(dirPath);
}
async function hasEntryFiles(dirPath) {
  const result = await detectEntryFiles(dirPath);
  return result.foundFiles.length > 0;
}
function getAllEntryPatterns() {
  return Object.values(ENTRY_FILE_PATTERNS).flat();
}
var DIRECTORY_PATTERNS = {
  // High confidence patterns
  high: ["frontend", "client", "webapp", "web-app", "web-client"],
  // Medium confidence patterns
  medium: ["web", "app", "ui"],
  // Low confidence (too generic, needs other signals)
  low: ["src", "public", "assets"]
};
var NON_FRONTEND_PATTERNS = [
  "backend",
  "server",
  "api",
  "service",
  "services",
  "lib",
  "libs",
  "packages",
  "tools",
  "scripts",
  "docs",
  "documentation",
  "test",
  "tests",
  "__tests__",
  "e2e",
  "spec",
  "specs",
  "node_modules",
  ".git",
  ".github",
  "dist",
  "build",
  "out",
  "coverage"
];
var DirectoryAnalyzer = class {
  /**
   * Analyzes a directory name for frontend indicators.
   *
   * @param dirPath - Path to the directory (uses basename for analysis)
   * @returns Analysis result
   */
  analyze(dirPath) {
    const dirName = path5__namespace.default.basename(dirPath).toLowerCase();
    const signals = [];
    const detailedSignals = [];
    const isNonFrontend = NON_FRONTEND_PATTERNS.some(
      (pattern) => dirName === pattern || dirName.startsWith(`${pattern}-`)
    );
    if (isNonFrontend) {
      return {
        dirName,
        isFrontend: false,
        isNonFrontend: true,
        confidence: "none",
        signals: [],
        detailedSignals: [],
        score: 0
      };
    }
    for (const pattern of DIRECTORY_PATTERNS.high) {
      if (this.matchesPattern(dirName, pattern)) {
        const signal = createSignal("directory-name", pattern);
        const weight = getSignalWeight(signal);
        signals.push(signal);
        detailedSignals.push({
          type: "directory-name",
          source: signal,
          weight,
          description: `Directory name matches frontend pattern: ${pattern}`
        });
      }
    }
    for (const pattern of DIRECTORY_PATTERNS.medium) {
      if (this.matchesPattern(dirName, pattern)) {
        const signal = createSignal("directory-name", pattern);
        const weight = getSignalWeight(signal);
        if (weight > 0) {
          signals.push(signal);
          detailedSignals.push({
            type: "directory-name",
            source: signal,
            weight,
            description: `Directory name matches frontend pattern: ${pattern}`
          });
        }
      }
    }
    const score = detailedSignals.reduce((sum, s) => sum + s.weight, 0);
    let confidence = "none";
    if (DIRECTORY_PATTERNS.high.some((p) => this.matchesPattern(dirName, p))) {
      confidence = "high";
    } else if (DIRECTORY_PATTERNS.medium.some((p) => this.matchesPattern(dirName, p))) {
      confidence = "medium";
    } else if (signals.length > 0) {
      confidence = "low";
    }
    return {
      dirName,
      isFrontend: signals.length > 0,
      isNonFrontend: false,
      confidence,
      signals,
      detailedSignals,
      score
    };
  }
  /**
   * Scans a directory for subdirectories that might be frontends.
   *
   * @param rootPath - Root directory to scan
   * @param maxDepth - Maximum depth to scan (default: 2)
   * @returns List of potential frontend directories with analysis
   */
  async scanForFrontends(rootPath, maxDepth = 2) {
    const results = [];
    await this.scanRecursive(rootPath, rootPath, 0, maxDepth, results);
    return results.filter((r) => r.isFrontend);
  }
  /**
   * Recursive directory scanning.
   */
  async scanRecursive(currentPath, rootPath, depth, maxDepth, results) {
    if (depth > maxDepth) return;
    try {
      const entries = await promises.readdir(currentPath, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const entryPath = path5__namespace.default.join(currentPath, entry.name);
        const analysis = this.analyze(entryPath);
        if (analysis.isNonFrontend) continue;
        if (analysis.isFrontend) {
          results.push(analysis);
        }
        await this.scanRecursive(
          entryPath,
          rootPath,
          depth + 1,
          maxDepth,
          results
        );
      }
    } catch {
    }
  }
  /**
   * Checks if a directory name matches a pattern.
   * Supports exact match and prefix/suffix matching.
   */
  matchesPattern(dirName, pattern) {
    if (dirName === pattern) return true;
    if (dirName.endsWith(`-${pattern}`)) return true;
    if (dirName.startsWith(`${pattern}-`)) return true;
    return false;
  }
};
function analyzeDirectoryName(dirPath) {
  const analyzer = new DirectoryAnalyzer();
  return analyzer.analyze(dirPath);
}
function isFrontendDirectory(dirPath) {
  const result = analyzeDirectoryName(dirPath);
  return result.isFrontend;
}
function isNonFrontendDirectory(dirPath) {
  const result = analyzeDirectoryName(dirPath);
  return result.isNonFrontend;
}
async function scanForFrontendDirectories(rootPath, maxDepth = 2) {
  const analyzer = new DirectoryAnalyzer();
  return analyzer.scanForFrontends(rootPath, maxDepth);
}
var DEFAULT_OPTIONS = {
  maxDepth: 3,
  minScore: 10,
  maxResults: 5,
  includeLowConfidence: true,
  relativeTo: process.cwd()
};
var FrontendDetector = class {
  packageScanner;
  entryDetector;
  directoryAnalyzer;
  constructor() {
    this.packageScanner = new PackageScanner();
    this.entryDetector = new EntryFileDetector();
    this.directoryAnalyzer = new DirectoryAnalyzer();
  }
  /**
   * Detects all potential frontend applications in a directory tree.
   *
   * @param rootPath - Root directory to start scanning from
   * @param options - Detection options
   * @returns Array of detection results, sorted by score (highest first)
   */
  async detectAll(rootPath, options) {
    const opts = {
      ...DEFAULT_OPTIONS,
      ...options
    };
    const results = [];
    const visited = /* @__PURE__ */ new Set();
    await this.scanDirectory(rootPath, 0, opts, results, visited);
    results.sort((a, b) => b.score - a.score);
    let filtered = results;
    if (!opts.includeLowConfidence) {
      filtered = results.filter((r) => r.confidence !== "low");
    }
    return filtered.slice(0, opts.maxResults);
  }
  /**
   * Detects a single frontend at a specific path.
   *
   * @param dirPath - Directory to analyze
   * @param relativeTo - Base path for relative path calculation
   * @returns Detection result or null if not a frontend
   */
  async detectSingle(dirPath, relativeTo) {
    const result = await this.analyzeDirectory(
      dirPath,
      relativeTo ?? process.cwd()
    );
    if (result.score < DEFAULT_OPTIONS.minScore) {
      return null;
    }
    return result;
  }
  /**
   * Recursively scans directories for frontends.
   */
  async scanDirectory(currentPath, depth, options, results, visited) {
    if (depth > options.maxDepth) return;
    const normalizedPath = path5__namespace.default.resolve(currentPath);
    if (visited.has(normalizedPath)) return;
    visited.add(normalizedPath);
    if (!fs3.existsSync(currentPath)) return;
    const result = await this.analyzeDirectory(currentPath, options.relativeTo);
    if (result.score >= options.minScore) {
      results.push(result);
    }
    if (result.confidence !== "high" || result.score < CONFIDENCE_THRESHOLDS.HIGH) {
      await this.scanSubdirectories(
        currentPath,
        depth,
        options,
        results,
        visited
      );
    }
  }
  /**
   * Scans subdirectories of a path.
   */
  async scanSubdirectories(currentPath, depth, options, results, visited) {
    try {
      const entries = await promises.readdir(currentPath, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const lowerName = entry.name.toLowerCase();
        if (this.shouldSkipDirectory(lowerName)) continue;
        const subPath = path5__namespace.default.join(currentPath, entry.name);
        await this.scanDirectory(subPath, depth + 1, options, results, visited);
      }
    } catch {
    }
  }
  /**
   * Checks if a directory should be skipped during scanning.
   */
  shouldSkipDirectory(dirName) {
    if (dirName.startsWith(".")) return true;
    return NON_FRONTEND_PATTERNS.some((pattern) => dirName === pattern);
  }
  /**
   * Analyzes a single directory for frontend signals.
   */
  async analyzeDirectory(dirPath, relativeTo) {
    const allSignals = [];
    const allDetailedSignals = [];
    const packageResult = await this.packageScanner.scan(dirPath);
    if (packageResult.found) {
      allSignals.push(...packageResult.signals);
      allDetailedSignals.push(...packageResult.detailedSignals);
    }
    const entryResult = await this.entryDetector.detect(dirPath);
    allSignals.push(...entryResult.signals);
    allDetailedSignals.push(...entryResult.detailedSignals);
    const dirResult = this.directoryAnalyzer.analyze(dirPath);
    allSignals.push(...dirResult.signals);
    allDetailedSignals.push(...dirResult.detailedSignals);
    const indexHtmlSignals = await this.checkIndexHtml(dirPath);
    allSignals.push(...indexHtmlSignals.signals);
    allDetailedSignals.push(...indexHtmlSignals.detailedSignals);
    const score = calculateScore(allSignals);
    const confidence = getConfidenceFromScore(score);
    const detectedType = this.determineType(packageResult, entryResult, dirResult);
    const relativePath = path5__namespace.default.relative(relativeTo, dirPath);
    return {
      path: path5__namespace.default.resolve(dirPath),
      relativePath: relativePath || ".",
      confidence,
      type: detectedType,
      signals: allSignals,
      score,
      detailedSignals: allDetailedSignals
    };
  }
  /**
   * Checks for index.html files.
   */
  async checkIndexHtml(dirPath) {
    const signals = [];
    const detailedSignals = [];
    const locations = [
      "public/index.html",
      "index.html",
      "src/index.html"
    ];
    for (const location of locations) {
      const fullPath = path5__namespace.default.join(dirPath, location);
      if (fs3.existsSync(fullPath)) {
        const signal = `index-html:${location}`;
        const weight = getSignalWeight(signal);
        signals.push(signal);
        detailedSignals.push({
          type: "index-html",
          source: signal,
          weight,
          description: `Found index.html at ${location}`
        });
      }
    }
    return { signals, detailedSignals };
  }
  /**
   * Determines the frontend type from all detection results.
   */
  determineType(packageResult, entryResult, _dirResult) {
    if (packageResult.detectedType) {
      return packageResult.detectedType;
    }
    if (entryResult.detectedType) {
      return entryResult.detectedType;
    }
    return "other";
  }
};
async function detectFrontends(rootPath, options) {
  const detector = new FrontendDetector();
  return detector.detectAll(rootPath, options);
}
async function detectSingleFrontend(dirPath, relativeTo) {
  const detector = new FrontendDetector();
  return detector.detectSingle(dirPath, relativeTo);
}
function filterByConfidence(results, minConfidence) {
  const confidenceOrder = ["low", "medium", "high"];
  const minIndex = confidenceOrder.indexOf(minConfidence);
  return results.filter((r) => {
    const resultIndex = confidenceOrder.indexOf(r.confidence);
    return resultIndex >= minIndex;
  });
}
function detectionResultsToTargets(results) {
  return results.map((result, index) => ({
    name: generateTargetName(result, index),
    path: result.relativePath,
    type: result.type,
    detected_by: result.signals,
    description: `Detected ${result.type} frontend (${result.confidence} confidence, score: ${result.score})`
  }));
}
function generateTargetName(result, index) {
  const dirName = path5__namespace.default.basename(result.path).toLowerCase();
  const cleaned = dirName.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (cleaned && /^[a-z][a-z0-9-]*$/.test(cleaned)) {
    return cleaned;
  }
  return index === 0 ? "frontend" : `frontend-${index + 1}`;
}
var DEFAULT_OPTIONS2 = {
  checkInitStatus: true,
  includeUrls: false
};
var SubmoduleChecker = class {
  /**
   * Checks all submodules in a repository.
   *
   * @param repoRoot - Root directory of the git repository
   * @param options - Checker options
   * @returns Array of submodule statuses
   */
  async checkAll(repoRoot, options) {
    const opts = {
      ...DEFAULT_OPTIONS2,
      ...options
    };
    const gitmodulesPath = path5__namespace.default.join(repoRoot, ".gitmodules");
    if (!fs3.existsSync(gitmodulesPath)) {
      return [];
    }
    const entries = await this.parseGitmodules(gitmodulesPath);
    if (entries.length === 0) {
      return [];
    }
    const statuses = [];
    for (const entry of entries) {
      const fullPath = path5__namespace.default.join(repoRoot, entry.path);
      const status = {
        path: entry.path,
        initialized: false
      };
      if (!fs3.existsSync(fullPath)) {
        status.warning = "Submodule directory does not exist";
        statuses.push(status);
        continue;
      }
      if (opts.checkInitStatus) {
        const initStatus = this.checkInitialization(repoRoot, entry.path);
        status.initialized = initStatus.initialized;
        status.commit = initStatus.commit;
        if (initStatus.warning) {
          status.warning = initStatus.warning;
        }
      } else {
        status.initialized = fs3.existsSync(path5__namespace.default.join(fullPath, ".git"));
      }
      if (opts.includeUrls && entry.url) {
        status.url = entry.url;
      }
      statuses.push(status);
    }
    return statuses;
  }
  /**
   * Scans a directory to determine if it's a submodule.
   *
   * @param dirPath - Directory to check
   * @param repoRoot - Root of the parent repository
   * @returns Scan result with submodule information
   */
  async scan(dirPath, repoRoot) {
    const gitmodulesPath = path5__namespace.default.join(repoRoot, ".gitmodules");
    if (!fs3.existsSync(gitmodulesPath)) {
      return {
        isSubmodule: false,
        path: dirPath
      };
    }
    const relativePath = path5__namespace.default.relative(repoRoot, dirPath);
    const entries = await this.parseGitmodules(gitmodulesPath);
    const matchingEntry = entries.find(
      (e) => e.path === relativePath || e.path === relativePath.replace(/\\/g, "/")
    );
    if (!matchingEntry) {
      return {
        isSubmodule: false,
        path: dirPath
      };
    }
    const initStatus = this.checkInitialization(repoRoot, matchingEntry.path);
    return {
      isSubmodule: true,
      path: dirPath,
      relativePath: matchingEntry.path,
      status: {
        path: matchingEntry.path,
        initialized: initStatus.initialized,
        commit: initStatus.commit,
        url: matchingEntry.url,
        warning: initStatus.warning
      }
    };
  }
  /**
   * Checks if a path is within a submodule.
   *
   * @param checkPath - Path to check
   * @param repoRoot - Root of the parent repository
   * @returns True if path is inside a submodule
   */
  async isInSubmodule(checkPath, repoRoot) {
    const gitmodulesPath = path5__namespace.default.join(repoRoot, ".gitmodules");
    if (!fs3.existsSync(gitmodulesPath)) {
      return false;
    }
    const relativePath = path5__namespace.default.relative(repoRoot, checkPath);
    const normalizedPath = relativePath.replace(/\\/g, "/");
    const entries = await this.parseGitmodules(gitmodulesPath);
    return entries.some((entry) => {
      const submodulePath = entry.path.replace(/\\/g, "/");
      return normalizedPath === submodulePath || normalizedPath.startsWith(submodulePath + "/");
    });
  }
  /**
   * Parses a .gitmodules file.
   *
   * @param gitmodulesPath - Path to .gitmodules file
   * @returns Array of parsed submodule entries
   */
  async parseGitmodules(gitmodulesPath) {
    try {
      const content = await promises.readFile(gitmodulesPath, "utf-8");
      return this.parseGitmodulesContent(content);
    } catch {
      return [];
    }
  }
  /**
   * Parses the content of a .gitmodules file.
   *
   * .gitmodules format:
   * [submodule "name"]
   *     path = some/path
   *     url = https://github.com/...
   *     branch = main
   */
  parseGitmodulesContent(content) {
    const entries = [];
    const lines = content.split("\n");
    let currentEntry = null;
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }
      const sectionMatch = trimmed.match(/^\[submodule\s+"([^"]+)"\]$/);
      if (sectionMatch) {
        if (currentEntry?.name && currentEntry?.path) {
          entries.push(currentEntry);
        }
        currentEntry = {
          name: sectionMatch[1]
        };
        continue;
      }
      if (currentEntry) {
        const keyValueMatch = trimmed.match(/^(\w+)\s*=\s*(.+)$/);
        if (keyValueMatch && keyValueMatch[1] && keyValueMatch[2]) {
          const key = keyValueMatch[1];
          const value = keyValueMatch[2];
          switch (key.toLowerCase()) {
            case "path":
              currentEntry.path = value.trim();
              break;
            case "url":
              currentEntry.url = value.trim();
              break;
            case "branch":
              currentEntry.branch = value.trim();
              break;
          }
        }
      }
    }
    if (currentEntry?.name && currentEntry?.path) {
      entries.push(currentEntry);
    }
    return entries;
  }
  /**
   * Checks initialization status of a submodule via git command.
   */
  checkInitialization(repoRoot, submodulePath) {
    try {
      const output = child_process.execSync(`git submodule status "${submodulePath}"`, {
        cwd: repoRoot,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"]
      });
      const trimmed = output.trim();
      if (trimmed.startsWith("-")) {
        return { initialized: false };
      }
      if (trimmed.startsWith("+")) {
        const commitMatch2 = trimmed.match(/^\+([a-f0-9]+)/);
        return {
          initialized: true,
          commit: commitMatch2?.[1],
          warning: "Submodule has uncommitted changes"
        };
      }
      const commitMatch = trimmed.match(/^\s*([a-f0-9]+)/);
      return {
        initialized: true,
        commit: commitMatch?.[1]
      };
    } catch {
      return {
        initialized: false,
        warning: "Could not determine git status"
      };
    }
  }
};
async function checkSubmodules(repoRoot, options) {
  const checker = new SubmoduleChecker();
  return checker.checkAll(repoRoot, options);
}
async function scanSubmodule(dirPath, repoRoot) {
  const checker = new SubmoduleChecker();
  return checker.scan(dirPath, repoRoot);
}
async function isPathInSubmodule(checkPath, repoRoot) {
  const checker = new SubmoduleChecker();
  return checker.isInSubmodule(checkPath, repoRoot);
}
async function parseGitmodulesFile(gitmodulesPath) {
  if (!fs3.existsSync(gitmodulesPath)) {
    return [];
  }
  try {
    const content = await promises.readFile(gitmodulesPath, "utf-8");
    const paths = [];
    const lines = content.split("\n");
    for (const line of lines) {
      const match = line.trim().match(/^path\s*=\s*(.+)$/);
      if (match && match[1]) {
        paths.push(match[1].trim());
      }
    }
    return paths;
  } catch {
    return [];
  }
}

// detection/env/node-version.ts
var MIN_NODE_VERSION = 18;
var FULL_ESM_VERSION = 20;
var BUILTIN_DIRNAME_VERSION = { major: 20, minor: 11};
function parseNodeVersion(version) {
  if (!version) {
    throw new Error("Node version string is required");
  }
  const cleanVersion = version.replace(/^v/, "");
  const match = cleanVersion.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) {
    throw new Error(`Invalid Node.js version format: "${version}". Expected semver format (e.g., "18.12.1")`);
  }
  const majorStr = match[1];
  const minorStr = match[2];
  const patchStr = match[3];
  const rawVersion = cleanVersion.split("-")[0];
  return {
    major: parseInt(majorStr, 10),
    minor: parseInt(minorStr, 10),
    patch: parseInt(patchStr, 10),
    raw: rawVersion
    // Remove pre-release suffix for raw
  };
}
function getNodeVersion() {
  return parseNodeVersion(process.version);
}
function validateNodeVersion(version) {
  if (version.major < MIN_NODE_VERSION) {
    throw new Error(
      `Node.js version must be >= ${MIN_NODE_VERSION}.0.0. Current version: ${version.raw}. Please upgrade Node.js to use ARTK.`
    );
  }
}
function determineESMCompatibility(version) {
  const supportsESM = version.major >= MIN_NODE_VERSION;
  const supportsFullESM = version.major >= FULL_ESM_VERSION;
  const supportsBuiltinDirname = version.major > BUILTIN_DIRNAME_VERSION.major || version.major === BUILTIN_DIRNAME_VERSION.major && version.minor >= BUILTIN_DIRNAME_VERSION.minor;
  return {
    supportsESM,
    supportsFullESM,
    supportsImportMeta: supportsESM,
    // Available in Node 18+ for ESM
    supportsBuiltinDirname
  };
}
function isVersionGte(a, b) {
  if (a.major !== b.major) return a.major > b.major;
  if (a.minor !== b.minor) return a.minor > b.minor;
  return a.patch >= b.patch;
}
function getModuleSystemFromType(typeField) {
  if (typeField === "module") {
    return "esm";
  }
  return "commonjs";
}
function parsePackageJson(content) {
  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(
      `Failed to parse package.json: ${error instanceof Error ? error.message : "Invalid JSON"}`
    );
  }
}
function detectModuleSystem(projectRoot) {
  const warnings = [];
  const packageJsonPath = path5__namespace.join(projectRoot, "package.json");
  if (!fs3__namespace.existsSync(packageJsonPath)) {
    warnings.push("package.json not found in project root. Using CommonJS fallback.");
    return {
      moduleSystem: "commonjs",
      detectionMethod: "fallback",
      confidence: "low",
      warnings
    };
  }
  let pkg;
  try {
    const content = fs3__namespace.readFileSync(packageJsonPath, "utf8");
    pkg = parsePackageJson(content);
  } catch (error) {
    warnings.push(
      `Failed to parse package.json: ${error instanceof Error ? error.message : "Unknown error"}. Using CommonJS fallback.`
    );
    return {
      moduleSystem: "commonjs",
      detectionMethod: "fallback",
      confidence: "low",
      warnings
    };
  }
  const moduleSystem = getModuleSystemFromType(pkg.type);
  return {
    moduleSystem,
    detectionMethod: "package.json",
    confidence: "high",
    warnings,
    rawType: pkg.type
  };
}
var ESM_TS_MODULES = [
  "es6",
  "es2015",
  "es2020",
  "es2022",
  "esnext",
  "nodenext",
  "node16",
  "node18"
];
var CJS_TS_MODULES = ["commonjs", "umd", "amd", "system"];
function parseTsConfig(content) {
  try {
    const cleanContent = stripJsonComments__default.default(content);
    return JSON.parse(cleanContent);
  } catch {
    return null;
  }
}
function getTsModuleFromConfig(config) {
  if (!config || !config.compilerOptions) {
    return null;
  }
  return config.compilerOptions.module ?? null;
}
function inferModuleSystemFromTsModule(tsModule) {
  if (!tsModule) {
    return null;
  }
  const normalized = tsModule.toLowerCase();
  if (ESM_TS_MODULES.includes(normalized)) {
    return "esm";
  }
  if (CJS_TS_MODULES.includes(normalized)) {
    return "commonjs";
  }
  return null;
}
function detectTypeScriptModule(projectRoot) {
  const warnings = [];
  const tsconfigPath = path5__namespace.join(projectRoot, "tsconfig.json");
  if (!fs3__namespace.existsSync(tsconfigPath)) {
    return {
      tsModule: null,
      inferredModuleSystem: null,
      warnings,
      found: false
    };
  }
  let config;
  try {
    const content = fs3__namespace.readFileSync(tsconfigPath, "utf8");
    config = parseTsConfig(content);
  } catch (error) {
    warnings.push(
      `Failed to read tsconfig.json: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    return {
      tsModule: null,
      inferredModuleSystem: null,
      warnings,
      found: true
    };
  }
  if (!config) {
    warnings.push("Failed to parse tsconfig.json (invalid JSON after comment stripping)");
    return {
      tsModule: null,
      inferredModuleSystem: null,
      warnings,
      found: true
    };
  }
  const tsModule = getTsModuleFromConfig(config);
  const inferredModuleSystem = inferModuleSystemFromTsModule(tsModule);
  return {
    tsModule,
    inferredModuleSystem,
    warnings,
    found: true
  };
}

// detection/env/confidence.ts
var ESM_TS_MODULES2 = /* @__PURE__ */ new Set([
  "es6",
  "es2015",
  "es2020",
  "es2022",
  "esnext",
  "nodenext",
  "node16",
  "node18"
]);
function isTsModuleESM(tsModule) {
  if (!tsModule) return null;
  return ESM_TS_MODULES2.has(tsModule.toLowerCase());
}
function isPackageTypeESM(packageType) {
  return packageType === "module";
}
function calculateConfidence(signals) {
  const warnings = [];
  if (signals.usedFallback || signals.timedOut) {
    const reason = signals.timedOut ? "detection timed out" : "fallback was used";
    warnings.push(`Low confidence: ${reason}`);
    return {
      confidence: "low",
      recommendedModuleSystem: "commonjs",
      // Safe default
      warnings
    };
  }
  const packageIsESM = isPackageTypeESM(signals.packageJsonType);
  const tsIsESM = isTsModuleESM(signals.tsconfigModule);
  if (tsIsESM === null) {
    return {
      confidence: "high",
      recommendedModuleSystem: packageIsESM ? "esm" : "commonjs",
      warnings
    };
  }
  if (signals.packageJsonType === void 0) {
    return {
      confidence: "high",
      recommendedModuleSystem: tsIsESM ? "esm" : "commonjs",
      warnings
    };
  }
  const packageModuleSystem = packageIsESM ? "esm" : "commonjs";
  const tsModuleSystem = tsIsESM ? "esm" : "commonjs";
  if (packageModuleSystem === tsModuleSystem) {
    return {
      confidence: "high",
      recommendedModuleSystem: packageModuleSystem,
      warnings
    };
  }
  warnings.push(
    `Conflicting module system settings: package.json indicates "${packageModuleSystem}", tsconfig.json indicates "${tsModuleSystem}".`
  );
  warnings.push(
    "TypeScript configuration is prioritized for .ts files (recommended for foundation modules)."
  );
  return {
    confidence: "medium",
    recommendedModuleSystem: tsModuleSystem,
    // Prioritize TypeScript config
    warnings
  };
}

// detection/env/index.ts
var CONTEXT_DIR = ".artk";
var CONTEXT_FILE = "context.json";
var DEFAULT_TIMEOUT = 5e3;
function readCachedContext(projectRoot) {
  const contextPath = path5__namespace.join(projectRoot, CONTEXT_DIR, CONTEXT_FILE);
  if (!fs3__namespace.existsSync(contextPath)) {
    return null;
  }
  try {
    const content = fs3__namespace.readFileSync(contextPath, "utf8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}
function writeCachedContext(projectRoot, context) {
  const contextDir = path5__namespace.join(projectRoot, CONTEXT_DIR);
  const contextPath = path5__namespace.join(contextDir, CONTEXT_FILE);
  if (!fs3__namespace.existsSync(contextDir)) {
    fs3__namespace.mkdirSync(contextDir, { recursive: true });
  }
  fs3__namespace.writeFileSync(contextPath, JSON.stringify(context, null, 2));
}
function createEnvironmentContext(nodeVersion, moduleSystemResult, tsResult, confidenceResult) {
  const esmCompat = determineESMCompatibility(nodeVersion);
  const moduleSystem = confidenceResult.recommendedModuleSystem;
  const warnings = [
    ...moduleSystemResult.warnings,
    ...tsResult.warnings,
    ...confidenceResult.warnings
  ];
  return {
    moduleSystem,
    nodeVersion: nodeVersion.raw,
    nodeVersionParsed: {
      major: nodeVersion.major,
      minor: nodeVersion.minor,
      patch: nodeVersion.patch
    },
    tsModule: tsResult.tsModule,
    supportsImportMeta: moduleSystem === "esm" && esmCompat.supportsImportMeta,
    supportsBuiltinDirname: esmCompat.supportsBuiltinDirname,
    templateVariant: moduleSystem,
    templateSource: "bundled",
    detectionTimestamp: (/* @__PURE__ */ new Date()).toISOString(),
    detectionConfidence: confidenceResult.confidence,
    detectionMethod: moduleSystemResult.detectionMethod,
    warnings
  };
}
function detectEnvironment(options) {
  const { projectRoot, forceDetect = false, timeout = DEFAULT_TIMEOUT } = options;
  const startTime = Date.now();
  if (!fs3__namespace.existsSync(projectRoot)) {
    throw new Error(`Project directory does not exist: ${projectRoot}`);
  }
  if (!forceDetect) {
    const cached = readCachedContext(projectRoot);
    if (cached) {
      return {
        context: cached,
        fromCache: true,
        detectionTime: Date.now() - startTime
      };
    }
  }
  let context;
  let timedOut = false;
  try {
    const checkTimeout = () => {
      if (Date.now() - startTime > timeout) {
        timedOut = true;
        throw new Error("Detection timeout");
      }
    };
    const nodeVersion = getNodeVersion();
    validateNodeVersion(nodeVersion);
    checkTimeout();
    const moduleSystemResult = detectModuleSystem(projectRoot);
    checkTimeout();
    const tsResult = detectTypeScriptModule(projectRoot);
    checkTimeout();
    const signals = {
      packageJsonType: moduleSystemResult.rawType,
      tsconfigModule: tsResult.tsModule,
      usedFallback: moduleSystemResult.detectionMethod === "fallback",
      timedOut: false
    };
    const confidenceResult = calculateConfidence(signals);
    context = createEnvironmentContext(nodeVersion, moduleSystemResult, tsResult, confidenceResult);
  } catch (error) {
    if (timedOut || error instanceof Error && error.message === "Detection timeout") {
      const nodeVersion = getNodeVersion();
      const esmCompat = determineESMCompatibility(nodeVersion);
      context = {
        moduleSystem: "commonjs",
        nodeVersion: nodeVersion.raw,
        nodeVersionParsed: {
          major: nodeVersion.major,
          minor: nodeVersion.minor,
          patch: nodeVersion.patch
        },
        tsModule: null,
        supportsImportMeta: false,
        supportsBuiltinDirname: esmCompat.supportsBuiltinDirname,
        templateVariant: "commonjs",
        templateSource: "bundled",
        detectionTimestamp: (/* @__PURE__ */ new Date()).toISOString(),
        detectionConfidence: "low",
        detectionMethod: "fallback",
        warnings: ["Detection timed out. Using CommonJS fallback."]
      };
    } else {
      throw error;
    }
  }
  writeCachedContext(projectRoot, context);
  return {
    context,
    fromCache: false,
    detectionTime: Date.now() - startTime
  };
}

exports.AG_GRID_PACKAGE_INDICATORS = AG_GRID_PACKAGE_INDICATORS;
exports.CONFIDENCE_THRESHOLDS = CONFIDENCE_THRESHOLDS;
exports.DIRECTORY_PATTERNS = DIRECTORY_PATTERNS;
exports.DirectoryAnalyzer = DirectoryAnalyzer;
exports.ENTRY_FILE_PATTERNS = ENTRY_FILE_PATTERNS;
exports.EntryFileDetector = EntryFileDetector;
exports.FRAMEWORK_DETECTION_MAP = FRAMEWORK_DETECTION_MAP;
exports.FRONTEND_DIRECTORY_PATTERNS = FRONTEND_DIRECTORY_PATTERNS;
exports.FRONTEND_PACKAGE_INDICATORS = FRONTEND_PACKAGE_INDICATORS;
exports.FrontendDetector = FrontendDetector;
exports.NON_FRONTEND_PATTERNS = NON_FRONTEND_PATTERNS;
exports.PackageScanner = PackageScanner;
exports.SIGNAL_WEIGHTS = SIGNAL_WEIGHTS;
exports.SubmoduleChecker = SubmoduleChecker;
exports.analyzeDirectoryName = analyzeDirectoryName;
exports.calculateConfidence = calculateConfidence;
exports.calculateScore = calculateScore;
exports.checkSubmodules = checkSubmodules;
exports.clearWarnedSignalsCache = clearWarnedSignalsCache;
exports.createSignal = createSignal;
exports.detectEntryFiles = detectEntryFiles;
exports.detectEnvironment = detectEnvironment;
exports.detectFrontends = detectFrontends;
exports.detectModuleSystem = detectModuleSystem;
exports.detectSingleFrontend = detectSingleFrontend;
exports.detectTypeScriptModule = detectTypeScriptModule;
exports.detectionResultsToTargets = detectionResultsToTargets;
exports.determineESMCompatibility = determineESMCompatibility;
exports.filterByConfidence = filterByConfidence;
exports.getAllEntryPatterns = getAllEntryPatterns;
exports.getConfidenceFromScore = getConfidenceFromScore;
exports.getModuleSystemFromType = getModuleSystemFromType;
exports.getNodeVersion = getNodeVersion;
exports.getSignalCategory = getSignalCategory;
exports.getSignalWeight = getSignalWeight;
exports.getTsModuleFromConfig = getTsModuleFromConfig;
exports.hasEntryFiles = hasEntryFiles;
exports.hasPackageJson = hasPackageJson;
exports.inferModuleSystemFromTsModule = inferModuleSystemFromTsModule;
exports.isAgGridEnterprisePackage = isAgGridEnterprisePackage;
exports.isAgGridPackage = isAgGridPackage;
exports.isFrontendDirectory = isFrontendDirectory;
exports.isFrontendPackage = isFrontendPackage;
exports.isNonFrontendDirectory = isNonFrontendDirectory;
exports.isPathInSubmodule = isPathInSubmodule;
exports.isVersionGte = isVersionGte;
exports.matchesFrontendDirectoryPattern = matchesFrontendDirectoryPattern;
exports.parseGitmodulesFile = parseGitmodulesFile;
exports.parseNodeVersion = parseNodeVersion;
exports.parsePackageJson = parsePackageJson;
exports.parseTsConfig = parseTsConfig;
exports.scanForFrontendDirectories = scanForFrontendDirectories;
exports.scanPackageJson = scanPackageJson;
exports.scanSubmodule = scanSubmodule;
exports.validateNodeVersion = validateNodeVersion;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map