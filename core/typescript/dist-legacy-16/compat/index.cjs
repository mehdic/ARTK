'use strict';

var url = require('url');
var path2 = require('path');
var fs = require('fs');

var _documentCurrentScript = typeof document !== 'undefined' ? document.currentScript : null;
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

var path2__namespace = /*#__PURE__*/_interopNamespace(path2);
var fs__namespace = /*#__PURE__*/_interopNamespace(fs);

// compat/detect-env.ts
var cachedModuleSystem = null;
function getModuleSystem() {
  if (cachedModuleSystem !== null) {
    return cachedModuleSystem;
  }
  try {
    if (typeof ({ url: (typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === 'SCRIPT' && _documentCurrentScript.src || new URL('index.cjs', document.baseURI).href)) }) !== "undefined" && (typeof document === 'undefined' ? require('u' + 'rl').pathToFileURL(__filename).href : (_documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === 'SCRIPT' && _documentCurrentScript.src || new URL('index.cjs', document.baseURI).href))) {
      cachedModuleSystem = "esm";
      return cachedModuleSystem;
    }
  } catch {
  }
  try {
    if (typeof __dirname !== "undefined" && typeof __dirname === "string") {
      cachedModuleSystem = "commonjs";
      return cachedModuleSystem;
    }
  } catch {
  }
  cachedModuleSystem = "unknown";
  return cachedModuleSystem;
}
function isESM() {
  return getModuleSystem() === "esm";
}
function isCommonJS() {
  return getModuleSystem() === "commonjs";
}
function getDirname(metaUrl) {
  if (!metaUrl) {
    throw new Error("import.meta.url is required to get dirname");
  }
  if (metaUrl.startsWith("file://")) {
    try {
      const filePath = url.fileURLToPath(metaUrl);
      return path2__namespace.dirname(filePath);
    } catch (error) {
      throw new Error(
        `Failed to convert URL to path: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
  if (path2__namespace.isAbsolute(metaUrl)) {
    return path2__namespace.dirname(metaUrl);
  }
  throw new Error(
    `Invalid import.meta.url: "${metaUrl}". Expected a file:// URL.`
  );
}
function getFilename(metaUrl) {
  if (!metaUrl) {
    throw new Error("import.meta.url is required to get filename");
  }
  if (metaUrl.startsWith("file://")) {
    try {
      return url.fileURLToPath(metaUrl);
    } catch (error) {
      throw new Error(
        `Failed to convert URL to path: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
  if (path2__namespace.isAbsolute(metaUrl)) {
    return metaUrl;
  }
  throw new Error(
    `Invalid import.meta.url: "${metaUrl}". Expected a file:// URL.`
  );
}
function createDirnameMeta(metaUrl) {
  const filename = getFilename(metaUrl);
  return {
    dirname: path2__namespace.dirname(filename),
    filename
  };
}
var cachedProjectRoot = null;
function findPackageJson(startDir) {
  let currentDir = path2__namespace.resolve(startDir);
  const root = path2__namespace.parse(currentDir).root;
  while (currentDir !== root) {
    const packageJsonPath = path2__namespace.join(currentDir, "package.json");
    if (fs__namespace.existsSync(packageJsonPath)) {
      return packageJsonPath;
    }
    const parentDir = path2__namespace.dirname(currentDir);
    if (parentDir === currentDir) {
      break;
    }
    currentDir = parentDir;
  }
  const rootPackageJson = path2__namespace.join(root, "package.json");
  if (fs__namespace.existsSync(rootPackageJson)) {
    return rootPackageJson;
  }
  return null;
}
function resolveProjectRoot(startDir) {
  if (!startDir && cachedProjectRoot !== null) {
    return cachedProjectRoot;
  }
  const searchStart = startDir || process.cwd();
  const packageJsonPath = findPackageJson(searchStart);
  if (!packageJsonPath) {
    throw new Error(
      `Cannot determine project root: No package.json found starting from "${searchStart}". Make sure you are running from within a Node.js project.`
    );
  }
  const projectRoot = path2__namespace.dirname(packageJsonPath);
  if (!startDir) {
    cachedProjectRoot = projectRoot;
  }
  return projectRoot;
}
function getPackageJson(startDir) {
  const root = resolveProjectRoot(startDir);
  const packageJsonPath = path2__namespace.join(root, "package.json");
  try {
    const content = fs__namespace.readFileSync(packageJsonPath, "utf8");
    return JSON.parse(content);
  } catch (error) {
    throw new Error(
      `Failed to read package.json at "${packageJsonPath}": ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

// compat/dynamic-import.ts
async function dynamicImport(specifier) {
  if (!specifier) {
    throw new Error("Module specifier is required");
  }
  try {
    const module = await import(specifier);
    return module;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to import module "${specifier}": ${message}`);
  }
}
async function dynamicImportDefault(specifier) {
  const module = await dynamicImport(specifier);
  if ("default" in module) {
    return module.default;
  }
  return module;
}
async function tryDynamicImport(specifier) {
  try {
    return await dynamicImport(specifier);
  } catch {
    return null;
  }
}

exports.createDirnameMeta = createDirnameMeta;
exports.dynamicImport = dynamicImport;
exports.dynamicImportDefault = dynamicImportDefault;
exports.findPackageJson = findPackageJson;
exports.getDirname = getDirname;
exports.getFilename = getFilename;
exports.getModuleSystem = getModuleSystem;
exports.getPackageJson = getPackageJson;
exports.isCommonJS = isCommonJS;
exports.isESM = isESM;
exports.resolveProjectRoot = resolveProjectRoot;
exports.tryDynamicImport = tryDynamicImport;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map