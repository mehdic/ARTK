/**
 * Cross-module-system path utilities
 *
 * Provides directory resolution that works in both ESM and CJS environments.
 *
 * IMPORTANT: This module uses a dual-strategy approach:
 * - In CJS: Uses __dirname (injected by Node.js module wrapper)
 * - In ESM: Uses import.meta.url (only available in ESM)
 *
 * The TypeScript source uses import.meta.url, which works for ESM builds.
 * For CJS builds, we detect that __dirname is available and use it instead.
 */
import { join, dirname } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// CJS-specific globals - these are injected by Node.js module wrapper in CJS context
// They will be undefined in ESM context
declare const __dirname: string | undefined;
 
declare const require: ((_id: string) => any) & { resolve: (_id: string) => string } | undefined;

/**
 * Cached package root to avoid repeated lookups
 */
let cachedPackageRoot: string | undefined;

/**
 * Cached module directory
 */
let cachedModuleDir: string | undefined;

/**
 * Get the directory where this module file is located.
 * Works in both ESM and CJS environments.
 */
function getModuleDir(): string {
  if (cachedModuleDir) {
    return cachedModuleDir;
  }

  // In CJS, __dirname is injected by Node.js module wrapper
  // It will be undefined in ESM context
  if (typeof __dirname === 'string' && __dirname.length > 0) {
    cachedModuleDir = __dirname;
    return cachedModuleDir;
  }

  // In ESM, use import.meta.url directly
  // For CJS builds, this block is removed by post-build script (not needed since __dirname works)
  // __ESM_ONLY_START__
  try {
    // @ts-ignore - Valid in ESM, removed from CJS by post-build
    const metaUrl: string | undefined = import.meta.url;
    if (metaUrl) {
      cachedModuleDir = dirname(fileURLToPath(metaUrl));
      return cachedModuleDir;
    }
  } catch {
    // import.meta not available
  }
  // __ESM_ONLY_END__

  // Fallback: try to find via require.resolve (CJS only)
  try {
    if (typeof require !== 'undefined' && require?.resolve) {
      const resolved = require.resolve('@artk/core-autogen/package.json');
      cachedModuleDir = dirname(resolved);
      return cachedModuleDir;
    }
  } catch {
    // Package not found via require.resolve
  }

  // Last resort: use process.cwd()
  // This is unreliable but better than crashing
  cachedModuleDir = process.cwd();
  return cachedModuleDir;
}

/**
 * Get the package root directory.
 *
 * Strategy:
 * 1. Check ARTK_AUTOGEN_ROOT env var (for testing/override)
 * 2. Use module location to find package root
 * 3. Fallback to cwd-based search
 */
export function getPackageRoot(): string {
  if (cachedPackageRoot) {
    return cachedPackageRoot;
  }

  // 1. Check environment variable override
  const envRoot = process.env['ARTK_AUTOGEN_ROOT'];
  if (envRoot && existsSync(join(envRoot, 'package.json'))) {
    cachedPackageRoot = envRoot;
    return cachedPackageRoot;
  }

  // 2. Find package root from module location
  // This file is at: <package-root>/dist[-variant]/utils/paths.js
  // So we go up 2 levels to find package root
  const moduleDir = getModuleDir();
  const possibleRoots = [
    join(moduleDir, '..', '..'),     // from dist/utils/ or dist-cjs/utils/
    join(moduleDir, '..'),           // from dist/ directly
    moduleDir,                        // if already at root
  ];

  for (const root of possibleRoots) {
    const pkgPath = join(root, 'package.json');
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
        if (pkg.name === '@artk/core-autogen') {
          cachedPackageRoot = root;
          return cachedPackageRoot;
        }
      } catch {
        // Continue searching
      }
    }
  }

  // 3. Fallback to cwd-based search (for vendored installations)
  const cwdPaths = [
    join(process.cwd(), 'node_modules', '@artk', 'core-autogen'),
    join(process.cwd(), 'artk-e2e', 'vendor', 'artk-core-autogen'),
    process.cwd(),
  ];

  for (const searchPath of cwdPaths) {
    const pkgPath = join(searchPath, 'package.json');
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
        if (pkg.name === '@artk/core-autogen') {
          cachedPackageRoot = searchPath;
          return cachedPackageRoot;
        }
      } catch {
        // Continue searching
      }
    }
  }

  // Final fallback - use module directory's parent
  cachedPackageRoot = join(moduleDir, '..', '..');
  return cachedPackageRoot;
}

/**
 * Get the templates directory path.
 *
 * Templates are copied to dist/codegen/templates/ during build.
 * When installed, only one dist variant exists.
 */
export function getTemplatesDir(): string {
  const root = getPackageRoot();
  const moduleDir = getModuleDir();

  // First, try relative to the module itself (most reliable)
  // Module is at dist[-variant]/utils/paths.js
  // Templates are at dist[-variant]/codegen/templates/
  const relativeToModule = join(moduleDir, '..', 'codegen', 'templates');
  if (existsSync(relativeToModule)) {
    return relativeToModule;
  }

  // Fallback: check standard locations from package root
  const possiblePaths = [
    join(root, 'dist', 'codegen', 'templates'),
    join(root, 'dist-cjs', 'codegen', 'templates'),
    join(root, 'dist-legacy-16', 'codegen', 'templates'),
    join(root, 'dist-legacy-14', 'codegen', 'templates'),
  ];

  for (const templatesPath of possiblePaths) {
    if (existsSync(templatesPath)) {
      return templatesPath;
    }
  }

  // Final fallback
  return possiblePaths[0] ?? join(root, 'dist', 'codegen', 'templates');
}

/**
 * Get the path to a specific template file.
 */
export function getTemplatePath(templateName: string): string {
  return join(getTemplatesDir(), templateName);
}

/**
 * Clear cached paths (for testing)
 */
export function clearPathCache(): void {
  cachedPackageRoot = undefined;
  cachedModuleDir = undefined;
}
