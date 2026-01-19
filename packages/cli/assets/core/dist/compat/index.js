import { fileURLToPath } from 'url';
import * as path2 from 'path';
import * as fs from 'fs';

// compat/detect-env.ts
var cachedModuleSystem = null;
function getModuleSystem() {
  if (cachedModuleSystem !== null) {
    return cachedModuleSystem;
  }
  try {
    if (typeof import.meta !== "undefined" && import.meta.url) {
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
      const filePath = fileURLToPath(metaUrl);
      return path2.dirname(filePath);
    } catch (error) {
      throw new Error(
        `Failed to convert URL to path: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
  if (path2.isAbsolute(metaUrl)) {
    return path2.dirname(metaUrl);
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
      return fileURLToPath(metaUrl);
    } catch (error) {
      throw new Error(
        `Failed to convert URL to path: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
  if (path2.isAbsolute(metaUrl)) {
    return metaUrl;
  }
  throw new Error(
    `Invalid import.meta.url: "${metaUrl}". Expected a file:// URL.`
  );
}
function createDirnameMeta(metaUrl) {
  const filename = getFilename(metaUrl);
  return {
    dirname: path2.dirname(filename),
    filename
  };
}
var cachedProjectRoot = null;
function findPackageJson(startDir) {
  let currentDir = path2.resolve(startDir);
  const root = path2.parse(currentDir).root;
  while (currentDir !== root) {
    const packageJsonPath = path2.join(currentDir, "package.json");
    if (fs.existsSync(packageJsonPath)) {
      return packageJsonPath;
    }
    const parentDir = path2.dirname(currentDir);
    if (parentDir === currentDir) {
      break;
    }
    currentDir = parentDir;
  }
  const rootPackageJson = path2.join(root, "package.json");
  if (fs.existsSync(rootPackageJson)) {
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
  const projectRoot = path2.dirname(packageJsonPath);
  if (!startDir) {
    cachedProjectRoot = projectRoot;
  }
  return projectRoot;
}
function getPackageJson(startDir) {
  const root = resolveProjectRoot(startDir);
  const packageJsonPath = path2.join(root, "package.json");
  try {
    const content = fs.readFileSync(packageJsonPath, "utf8");
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

export { createDirnameMeta, dynamicImport, dynamicImportDefault, findPackageJson, getDirname, getFilename, getModuleSystem, getPackageJson, isCommonJS, isESM, resolveProjectRoot, tryDynamicImport };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map