'use strict';

var fs2 = require('fs');
var path2 = require('path');
var os = require('os');

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

var fs2__namespace = /*#__PURE__*/_interopNamespace(fs2);
var path2__namespace = /*#__PURE__*/_interopNamespace(path2);
var os__namespace = /*#__PURE__*/_interopNamespace(os);

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// validation/rules/import-meta-usage.ts
var IMPORT_META_PATTERNS = [
  /import\.meta\.url/g,
  /import\.meta\.dirname/g,
  /import\.meta\.filename/g,
  /import\.meta\.resolve/g,
  /import\.meta(?!\.)/g
  // Just import.meta without property
];
var config = {
  id: "import-meta-usage",
  name: "Import Meta Usage",
  description: "Detects usage of import.meta in CommonJS environments where it is not available",
  defaultStrictness: "error"
};
function isInCommentOrString(content, position) {
  const before = content.substring(0, position);
  const lastNewline = before.lastIndexOf("\n");
  const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;
  const lineBefore = before.substring(lineStart);
  if (lineBefore.includes("//")) {
    return true;
  }
  const lastBlockStart = before.lastIndexOf("/*");
  const lastBlockEnd = before.lastIndexOf("*/");
  if (lastBlockStart > lastBlockEnd) {
    return true;
  }
  let inString = false;
  let stringChar = "";
  let escaped = false;
  for (let i = 0; i < position; i++) {
    const char = content[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
        stringChar = "";
      }
    }
  }
  return inString;
}
function getLineNumber(content, position) {
  const before = content.substring(0, position);
  return before.split("\n").length;
}
var ImportMetaUsageRule = class {
  constructor() {
    __publicField(this, "config", config);
  }
  /**
   * Validate a file for import.meta usage
   */
  validate(filePath, content, moduleSystem) {
    if (moduleSystem === "esm") {
      return [];
    }
    const issues = [];
    const processedPositions = /* @__PURE__ */ new Set();
    for (const pattern of IMPORT_META_PATTERNS) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const position = match.index;
        if (processedPositions.has(position)) {
          continue;
        }
        processedPositions.add(position);
        if (isInCommentOrString(content, position)) {
          continue;
        }
        const lineNumber = getLineNumber(content, position);
        const matchedText = match[0];
        issues.push({
          file: filePath,
          line: lineNumber,
          column: null,
          severity: "error",
          ruleId: this.config.id,
          message: `import.meta is not available in CommonJS modules. Found: ${matchedText}`,
          suggestedFix: `Use getDirname() from '@artk/core/compat' instead of import.meta.url, or switch to ESM by adding "type": "module" to package.json`
        });
      }
    }
    return issues;
  }
};
function createImportMetaUsageRule() {
  return new ImportMetaUsageRule();
}

// validation/rules/dirname-usage.ts
var config2 = {
  id: "dirname-usage",
  name: "Dirname Usage",
  description: "Detects usage of __dirname and __filename in ESM environments where they are not available",
  defaultStrictness: "error"
};
function isInCommentOrString2(content, position) {
  const before = content.substring(0, position);
  const lastNewline = before.lastIndexOf("\n");
  const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;
  const lineBefore = before.substring(lineStart);
  if (lineBefore.includes("//")) {
    return true;
  }
  const lastBlockStart = before.lastIndexOf("/*");
  const lastBlockEnd = before.lastIndexOf("*/");
  if (lastBlockStart > lastBlockEnd) {
    return true;
  }
  let inString = false;
  let stringChar = "";
  let escaped = false;
  for (let i = 0; i < position; i++) {
    const char = content[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
        stringChar = "";
      }
    }
  }
  return inString;
}
function isGlobalReference(content, match, varName) {
  const position = match.index;
  const lineStart = content.lastIndexOf("\n", position - 1) + 1;
  const lineEnd = content.indexOf("\n", position);
  const line = content.substring(
    lineStart,
    lineEnd === -1 ? content.length : lineEnd
  );
  const declarationPattern = new RegExp(
    `(?:const|let|var)\\s+${varName}\\s*=`
  );
  if (declarationPattern.test(line)) {
    return false;
  }
  const beforeChar = position > 0 ? content[position - 1] ?? " " : " ";
  const afterChar = content[position + varName.length] ?? " ";
  const identifierChar = /[a-zA-Z0-9_$]/;
  if (identifierChar.test(beforeChar) || identifierChar.test(afterChar)) {
    return false;
  }
  return true;
}
function getLineNumber2(content, position) {
  const before = content.substring(0, position);
  return before.split("\n").length;
}
var DirnameUsageRule = class {
  constructor() {
    __publicField(this, "config", config2);
  }
  /**
   * Validate a file for __dirname/__filename usage
   */
  validate(filePath, content, moduleSystem) {
    if (moduleSystem === "commonjs") {
      return [];
    }
    const issues = [];
    const patterns = [
      { regex: /__dirname/g, name: "__dirname" },
      { regex: /__filename/g, name: "__filename" }
    ];
    for (const { regex, name } of patterns) {
      regex.lastIndex = 0;
      let match;
      while ((match = regex.exec(content)) !== null) {
        const position = match.index;
        if (isInCommentOrString2(content, position)) {
          continue;
        }
        if (!isGlobalReference(content, match, name)) {
          continue;
        }
        const lineNumber = getLineNumber2(content, position);
        issues.push({
          file: filePath,
          line: lineNumber,
          column: null,
          severity: "error",
          ruleId: this.config.id,
          message: `${name} is not available in ESM modules`,
          suggestedFix: `Use getDirname(import.meta.url) from '@artk/core/compat' instead of ${name}`
        });
      }
    }
    return issues;
  }
};
function createDirnameUsageRule() {
  return new DirnameUsageRule();
}

// validation/rules/import-paths.ts
var config3 = {
  id: "import-paths",
  name: "Import Paths",
  description: "Validates import paths have correct extensions for the module system",
  defaultStrictness: "warning"
};
function isRelativeImport(importPath) {
  return importPath.startsWith("./") || importPath.startsWith("../");
}
function hasExtension(importPath) {
  const parts = importPath.split("/");
  const lastPart = parts[parts.length - 1] ?? "";
  return lastPart.includes(".");
}
function isInCommentOrString3(content, position) {
  const before = content.substring(0, position);
  const lastNewline = before.lastIndexOf("\n");
  const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;
  const lineBefore = before.substring(lineStart);
  const commentIndex = lineBefore.indexOf("//");
  if (commentIndex !== -1) {
    const quotesBefore = lineBefore.substring(0, commentIndex);
    const singleQuotes = (quotesBefore.match(/'/g) || []).length;
    const doubleQuotes = (quotesBefore.match(/"/g) || []).length;
    const backticks = (quotesBefore.match(/`/g) || []).length;
    if (singleQuotes % 2 === 0 && doubleQuotes % 2 === 0 && backticks % 2 === 0) {
      return true;
    }
  }
  const lastBlockStart = before.lastIndexOf("/*");
  const lastBlockEnd = before.lastIndexOf("*/");
  if (lastBlockStart > lastBlockEnd) {
    return true;
  }
  let inString = false;
  let stringChar = "";
  let escaped = false;
  for (let i = 0; i < position; i++) {
    const char = content[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
        stringChar = "";
      }
    }
  }
  return inString;
}
function getLineNumber3(content, position) {
  const before = content.substring(0, position);
  return before.split("\n").length;
}
function extractImportPaths(content) {
  const imports = [];
  const patterns = [
    // import ... from 'path'
    /import\s+(?:type\s+)?(?:[^'"]*\s+from\s+)?['"]([^'"]+)['"]/g,
    // export ... from 'path'
    /export\s+(?:\*|\{[^}]*\})\s+from\s+['"]([^'"]+)['"]/g,
    // await import('path') or import('path')
    /(?:await\s+)?import\s*\(\s*['"]([^'"]+)['"]\s*\)/g
  ];
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const position = match.index;
      if (isInCommentOrString3(content, position)) {
        continue;
      }
      const isTypeOnly = match[0].includes("import type");
      const importPath = match[1];
      if (!importPath) {
        continue;
      }
      imports.push({
        path: importPath,
        position,
        isTypeOnly
      });
    }
  }
  return imports;
}
var ImportPathsRule = class {
  constructor() {
    __publicField(this, "config", config3);
  }
  /**
   * Validate a file for import path issues
   */
  validate(filePath, content, moduleSystem) {
    if (moduleSystem === "commonjs") {
      return [];
    }
    const issues = [];
    const imports = extractImportPaths(content);
    for (const { path: importPath, position, isTypeOnly } of imports) {
      if (!isRelativeImport(importPath)) {
        continue;
      }
      if (!hasExtension(importPath)) {
        const lineNumber = getLineNumber3(content, position);
        const severity = isTypeOnly ? "warning" : "warning";
        issues.push({
          file: filePath,
          line: lineNumber,
          column: null,
          severity,
          ruleId: this.config.id,
          message: `ESM imports require explicit file extensions. Missing extension in: '${importPath}'`,
          suggestedFix: `Add .js extension: '${importPath}.js' (ESM requires explicit extensions for relative imports)`
        });
      }
    }
    return issues;
  }
};
function createImportPathsRule() {
  return new ImportPathsRule();
}
var config4 = {
  id: "dependency-compat",
  name: "Dependency Compatibility",
  description: "Checks that project dependencies are compatible with the detected module system",
  defaultStrictness: "warning"
};
var ESM_ONLY_PACKAGES = {
  nanoid: ">=5.0.0",
  // v5+ is ESM-only
  chalk: ">=5.0.0",
  // v5+ is ESM-only
  execa: ">=6.0.0",
  // v6+ is ESM-only
  got: ">=12.0.0",
  // v12+ is ESM-only
  "p-limit": ">=4.0.0",
  // v4+ is ESM-only
  "p-queue": ">=7.0.0",
  // v7+ is ESM-only
  "globby": ">=13.0.0",
  // v13+ is ESM-only
  "find-up": ">=6.0.0",
  // v6+ is ESM-only
  "pkg-dir": ">=6.0.0",
  // v6+ is ESM-only
  "read-pkg": ">=7.0.0",
  // v7+ is ESM-only
  "read-pkg-up": ">=9.0.0",
  // v9+ is ESM-only
  "ora": ">=6.0.0",
  // v6+ is ESM-only
  "cli-spinners": ">=3.0.0",
  // v3+ is ESM-only
  "log-symbols": ">=5.0.0",
  // v5+ is ESM-only
  "figures": ">=5.0.0",
  // v5+ is ESM-only
  "boxen": ">=6.0.0",
  // v6+ is ESM-only
  "wrap-ansi": ">=8.0.0",
  // v8+ is ESM-only
  "string-width": ">=5.0.0",
  // v5+ is ESM-only
  "strip-ansi": ">=7.0.0"
  // v7+ is ESM-only
};
var ALTERNATIVES = {
  nanoid: "Use nanoid@^4.0.0 for CommonJS or 'uuid' package as alternative",
  chalk: "Use chalk@^4.0.0 for CommonJS or 'kleur' as alternative",
  execa: "Use execa@^5.0.0 for CommonJS or 'cross-spawn' as alternative",
  got: "Use got@^11.0.0 for CommonJS or 'node-fetch' as alternative",
  "p-limit": "Use p-limit@^3.0.0 for CommonJS"
};
function versionSatisfiesRange(version, range) {
  const versionMatch = version.match(/\^?~?(\d+)\.(\d+)\.(\d+)/);
  const rangeMatch = range.match(/>?=?(\d+)\.(\d+)\.(\d+)/);
  if (!versionMatch || !rangeMatch) {
    return false;
  }
  const vMajor = Number(versionMatch[1] ?? 0);
  const vMinor = Number(versionMatch[2] ?? 0);
  const vPatch = Number(versionMatch[3] ?? 0);
  const rMajor = Number(rangeMatch[1] ?? 0);
  const rMinor = Number(rangeMatch[2] ?? 0);
  const rPatch = Number(rangeMatch[3] ?? 0);
  if (range.startsWith(">=")) {
    if (vMajor > rMajor) return true;
    if (vMajor < rMajor) return false;
    if (vMinor > rMinor) return true;
    if (vMinor < rMinor) return false;
    return vPatch >= rPatch;
  }
  if (version.startsWith("^")) {
    return vMajor >= rMajor;
  }
  return vMajor >= rMajor;
}
function extractPackageName(importPath) {
  if (importPath.startsWith("./") || importPath.startsWith("../")) {
    return null;
  }
  if (importPath.startsWith("node:")) {
    return null;
  }
  if (importPath.startsWith("@")) {
    const parts2 = importPath.split("/");
    if (parts2.length >= 2 && parts2[0] && parts2[1]) {
      return `${parts2[0]}/${parts2[1]}`;
    }
    return null;
  }
  const parts = importPath.split("/");
  return parts[0] ?? null;
}
var DependencyCompatRule = class {
  constructor() {
    __publicField(this, "config", config4);
  }
  /**
   * Get list of known ESM-only packages
   */
  getEsmOnlyPackages() {
    return Object.keys(ESM_ONLY_PACKAGES);
  }
  /**
   * Get version constraints for ESM-only packages
   */
  getEsmOnlyConstraints() {
    return { ...ESM_ONLY_PACKAGES };
  }
  /**
   * Validate a file for ESM-only package imports
   */
  validate(filePath, content, moduleSystem) {
    if (moduleSystem === "esm") {
      return [];
    }
    const issues = [];
    const importedPackages = /* @__PURE__ */ new Set();
    const patterns = [
      /import\s+(?:[^'"]*\s+from\s+)?['"]([^'"]+)['"]/g,
      /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
      /(?:await\s+)?import\s*\(\s*['"]([^'"]+)['"]\s*\)/g
    ];
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const importPath = match[1];
        if (!importPath) continue;
        const packageName = extractPackageName(importPath);
        if (packageName && ESM_ONLY_PACKAGES[packageName]) {
          if (importedPackages.has(packageName)) {
            continue;
          }
          importedPackages.add(packageName);
          const lineNumber = this.getLineNumber(content, match.index);
          issues.push({
            file: filePath,
            line: lineNumber,
            column: null,
            severity: "warning",
            ruleId: this.config.id,
            message: `'${packageName}' is ESM-only in newer versions and may not work in CommonJS`,
            suggestedFix: ALTERNATIVES[packageName] || `Check if your version of '${packageName}' is CommonJS-compatible`
          });
        }
      }
    }
    return issues;
  }
  /**
   * Validate dependencies in package.json
   */
  validateDependencies(projectDir, moduleSystem) {
    if (moduleSystem === "esm") {
      return [];
    }
    const packageJsonPath = path2__namespace.join(projectDir, "package.json");
    if (!fs2__namespace.existsSync(packageJsonPath)) {
      return [];
    }
    let packageJson;
    try {
      const content = fs2__namespace.readFileSync(packageJsonPath, "utf8");
      packageJson = JSON.parse(content);
    } catch {
      return [];
    }
    const issues = [];
    const allDeps = {
      ...packageJson.dependencies || {},
      ...packageJson.devDependencies || {}
    };
    for (const [packageName, versionRange] of Object.entries(allDeps)) {
      const esmOnlyRange = ESM_ONLY_PACKAGES[packageName];
      if (esmOnlyRange && versionSatisfiesRange(versionRange, esmOnlyRange)) {
        issues.push({
          file: packageJsonPath,
          line: null,
          column: null,
          severity: "warning",
          ruleId: this.config.id,
          message: `'${packageName}@${versionRange}' is ESM-only and incompatible with CommonJS`,
          suggestedFix: ALTERNATIVES[packageName] || `Downgrade '${packageName}' to a CommonJS-compatible version`
        });
      }
    }
    return issues;
  }
  /**
   * Get line number for a position in content
   */
  getLineNumber(content, position) {
    const before = content.substring(0, position);
    return before.split("\n").length;
  }
};
function createDependencyCompatRule() {
  return new DependencyCompatRule();
}

// validation/rules/index.ts
function getAllRules() {
  return [
    createImportMetaUsageRule(),
    createDirnameUsageRule(),
    createImportPathsRule(),
    createDependencyCompatRule()
  ];
}
function createBackupDir() {
  const tempDir = os__namespace.tmpdir();
  const backupDir = path2__namespace.join(tempDir, ".artk-backup-" + Date.now());
  fs2__namespace.mkdirSync(backupDir, { recursive: true });
  return backupDir;
}
function startTransaction() {
  return {
    generatedFiles: [],
    originalFiles: /* @__PURE__ */ new Map(),
    startTime: Date.now()
  };
}
function trackGeneratedFile(tx, filePath) {
  if (!tx.generatedFiles.includes(filePath)) {
    tx.generatedFiles.push(filePath);
  }
}
function trackOriginalFile(tx, filePath) {
  if (tx.originalFiles.has(filePath)) {
    return tx.originalFiles.get(filePath) || null;
  }
  if (!fs2__namespace.existsSync(filePath)) {
    return null;
  }
  const backupDir = createBackupDir();
  const fileName = path2__namespace.basename(filePath);
  const backupPath = path2__namespace.join(backupDir, fileName + "." + Date.now() + ".bak");
  try {
    fs2__namespace.copyFileSync(filePath, backupPath);
    tx.originalFiles.set(filePath, backupPath);
    return backupPath;
  } catch (error) {
    console.warn(`Failed to backup ${filePath}: ${error}`);
    return null;
  }
}
function commitTransaction(tx) {
  for (const [, backupPath] of tx.originalFiles) {
    try {
      if (fs2__namespace.existsSync(backupPath)) {
        fs2__namespace.unlinkSync(backupPath);
      }
      const backupDir = path2__namespace.dirname(backupPath);
      if (fs2__namespace.existsSync(backupDir)) {
        const files = fs2__namespace.readdirSync(backupDir);
        if (files.length === 0) {
          fs2__namespace.rmdirSync(backupDir);
        }
      }
    } catch {
    }
  }
  tx.generatedFiles.length = 0;
  tx.originalFiles.clear();
}
function rollbackTransaction(tx) {
  const result = {
    success: true,
    removedFiles: [],
    restoredFiles: [],
    failedFiles: []
  };
  for (const filePath of tx.generatedFiles) {
    try {
      if (fs2__namespace.existsSync(filePath)) {
        fs2__namespace.unlinkSync(filePath);
        result.removedFiles.push(filePath);
      }
    } catch (error) {
      result.success = false;
      result.failedFiles.push({
        file: filePath,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
  for (const [originalPath, backupPath] of tx.originalFiles) {
    try {
      if (fs2__namespace.existsSync(backupPath)) {
        const dir = path2__namespace.dirname(originalPath);
        if (!fs2__namespace.existsSync(dir)) {
          fs2__namespace.mkdirSync(dir, { recursive: true });
        }
        fs2__namespace.copyFileSync(backupPath, originalPath);
        result.restoredFiles.push(originalPath);
        fs2__namespace.unlinkSync(backupPath);
        const backupDir = path2__namespace.dirname(backupPath);
        if (fs2__namespace.existsSync(backupDir)) {
          const files = fs2__namespace.readdirSync(backupDir);
          if (files.length === 0) {
            fs2__namespace.rmdirSync(backupDir);
          }
        }
      }
    } catch (error) {
      result.success = false;
      result.failedFiles.push({
        file: originalPath,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }
  tx.generatedFiles.length = 0;
  tx.originalFiles.clear();
  return result;
}
function generateRollbackMessage(result) {
  const lines = [];
  if (result.success) {
    lines.push("Rollback completed successfully.");
  } else {
    lines.push("Rollback completed with some failures.");
  }
  if (result.removedFiles.length > 0) {
    lines.push(`
Removed ${result.removedFiles.length} generated file(s):`);
    for (const file of result.removedFiles) {
      lines.push(`  - ${file}`);
    }
  }
  if (result.restoredFiles.length > 0) {
    lines.push(`
Restored ${result.restoredFiles.length} original file(s):`);
    for (const file of result.restoredFiles) {
      lines.push(`  - ${file}`);
    }
  }
  if (result.failedFiles.length > 0) {
    lines.push(`
Failed to rollback ${result.failedFiles.length} file(s):`);
    for (const { file, error } of result.failedFiles) {
      lines.push(`  - ${file}: ${error}`);
    }
    lines.push("\nManual cleanup may be required for the above files.");
  }
  return lines.join("\n");
}

// validation/runner.ts
var DEFAULT_TIMEOUT = 1e4;
var ValidationRunner = class {
  /**
   * Create a new ValidationRunner
   */
  constructor(options = {}) {
    __publicField(this, "timeout");
    __publicField(this, "outputDir");
    __publicField(this, "transaction");
    __publicField(this, "rules");
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
    this.outputDir = options.outputDir ?? process.cwd();
    this.transaction = startTransaction();
    this.rules = getAllRules();
  }
  /**
   * Get the configured timeout
   */
  getTimeout() {
    return this.timeout;
  }
  /**
   * Track a newly generated file
   */
  trackGeneratedFile(filePath) {
    trackGeneratedFile(this.transaction, filePath);
  }
  /**
   * Track an existing file before modification
   */
  trackOriginalFile(filePath) {
    return trackOriginalFile(this.transaction, filePath);
  }
  /**
   * Run validation on the specified files
   */
  async validate(options) {
    const startTime = Date.now();
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    if (options.skipValidation) {
      return {
        timestamp,
        environmentContext: options.environmentContext,
        executionTime: Date.now() - startTime,
        status: "passed",
        rules: [],
        errors: [],
        warnings: [],
        validatedFiles: options.files,
        rollbackPerformed: false,
        rollbackSuccess: null
      };
    }
    const errors = [];
    const warnings = [];
    const ruleResults = [];
    const validatedFiles = [];
    const strictness = options.strictness || {};
    const validationPromise = this.validateFiles(
      options.files,
      options.environmentContext,
      strictness,
      errors,
      warnings,
      ruleResults,
      validatedFiles
    );
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Validation timeout")), this.timeout);
    });
    try {
      await Promise.race([validationPromise, timeoutPromise]);
    } catch (error) {
      if (error instanceof Error && error.message === "Validation timeout") {
        warnings.push({
          file: "",
          line: null,
          column: null,
          severity: "warning",
          ruleId: "timeout",
          message: `Validation timed out after ${this.timeout}ms`,
          suggestedFix: "Consider increasing timeout or validating fewer files"
        });
      }
    }
    let status = "passed";
    if (errors.length > 0) {
      status = "failed";
    } else if (warnings.length > 0) {
      status = "warnings";
    }
    let rollbackPerformed = false;
    let rollbackSuccess = null;
    if (status === "failed" && (this.transaction.generatedFiles.length > 0 || this.transaction.originalFiles.size > 0)) {
      const rollbackResult = rollbackTransaction(this.transaction);
      rollbackPerformed = true;
      rollbackSuccess = rollbackResult.success;
      const message = generateRollbackMessage(rollbackResult);
      console.log(message);
    } else if (status === "passed" || status === "warnings") {
      commitTransaction(this.transaction);
    }
    this.transaction = startTransaction();
    const result = {
      timestamp,
      environmentContext: options.environmentContext,
      executionTime: Date.now() - startTime,
      status,
      rules: ruleResults,
      errors,
      warnings,
      validatedFiles,
      rollbackPerformed,
      rollbackSuccess
    };
    await this.persistResult(result);
    return result;
  }
  /**
   * Validate files using all rules
   */
  async validateFiles(files, moduleSystem, strictness, errors, warnings, ruleResults, validatedFiles) {
    const affectedFilesByRule = /* @__PURE__ */ new Map();
    for (const rule of this.rules) {
      affectedFilesByRule.set(rule.config.id, /* @__PURE__ */ new Set());
    }
    for (const filePath of files) {
      if (!fs2__namespace.existsSync(filePath)) {
        continue;
      }
      validatedFiles.push(filePath);
      let content;
      try {
        content = fs2__namespace.readFileSync(filePath, "utf8");
      } catch {
        continue;
      }
      for (const rule of this.rules) {
        const ruleStrictness = strictness[rule.config.id] || rule.config.defaultStrictness;
        if (ruleStrictness === "ignore") {
          continue;
        }
        const issues = rule.validate(
          filePath,
          content,
          moduleSystem
        );
        for (const issue of issues) {
          affectedFilesByRule.get(rule.config.id)?.add(filePath);
          if (ruleStrictness === "warning") {
            warnings.push({ ...issue, severity: "warning" });
          } else {
            if (issue.severity === "error") {
              errors.push(issue);
            } else {
              warnings.push(issue);
            }
          }
        }
      }
    }
    for (const rule of this.rules) {
      const affectedFiles = Array.from(
        affectedFilesByRule.get(rule.config.id) || []
      );
      const pass = affectedFiles.length === 0;
      ruleResults.push({
        ruleId: rule.config.id,
        pass,
        affectedFiles,
        message: pass ? `${rule.config.name}: No issues found` : `${rule.config.name}: Found issues in ${affectedFiles.length} file(s)`
      });
    }
  }
  /**
   * Persist validation result to .artk/validation-results.json
   */
  async persistResult(result) {
    const artkDir = path2__namespace.join(this.outputDir, ".artk");
    const resultsPath = path2__namespace.join(artkDir, "validation-results.json");
    if (!fs2__namespace.existsSync(artkDir)) {
      fs2__namespace.mkdirSync(artkDir, { recursive: true });
    }
    let results = [];
    if (fs2__namespace.existsSync(resultsPath)) {
      try {
        const content = fs2__namespace.readFileSync(resultsPath, "utf8");
        results = JSON.parse(content);
        if (!Array.isArray(results)) {
          results = [];
        }
      } catch {
        results = [];
      }
    }
    results.push(result);
    fs2__namespace.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  }
};
async function validateFoundation(options) {
  const runner = new ValidationRunner();
  return runner.validate(options);
}

exports.DependencyCompatRule = DependencyCompatRule;
exports.DirnameUsageRule = DirnameUsageRule;
exports.ImportMetaUsageRule = ImportMetaUsageRule;
exports.ImportPathsRule = ImportPathsRule;
exports.ValidationRunner = ValidationRunner;
exports.commitTransaction = commitTransaction;
exports.createDependencyCompatRule = createDependencyCompatRule;
exports.createDirnameUsageRule = createDirnameUsageRule;
exports.createImportMetaUsageRule = createImportMetaUsageRule;
exports.createImportPathsRule = createImportPathsRule;
exports.generateRollbackMessage = generateRollbackMessage;
exports.getAllRules = getAllRules;
exports.rollbackTransaction = rollbackTransaction;
exports.startTransaction = startTransaction;
exports.trackGeneratedFile = trackGeneratedFile;
exports.trackOriginalFile = trackOriginalFile;
exports.validateFoundation = validateFoundation;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map