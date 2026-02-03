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
import { join, dirname, resolve, relative, isAbsolute } from 'node:path';
import { readFileSync, existsSync, realpathSync } from 'node:fs';
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
  cachedHarnessRoot = undefined;
}

/**
 * Cached harness root to avoid repeated lookups
 */
let cachedHarnessRoot: string | undefined;

/**
 * Get the ARTK harness root directory (artk-e2e/).
 *
 * This function infers the correct harness root by checking:
 * 1. ARTK_HARNESS_ROOT environment variable (explicit override)
 * 2. artk-e2e/ subdirectory from cwd (standard installation)
 * 3. Current directory if it contains artk.config.yml (inside harness)
 * 4. Fallback to cwd (backwards compatibility)
 *
 * @returns Path to the harness root directory
 */
export function getHarnessRoot(): string {
  if (cachedHarnessRoot) {
    return cachedHarnessRoot;
  }

  // 1. Check environment variable override
  const envRoot = process.env['ARTK_HARNESS_ROOT'];
  if (envRoot && existsSync(envRoot)) {
    cachedHarnessRoot = envRoot;
    return cachedHarnessRoot;
  }

  // 2. Check for artk-e2e/ in cwd (standard installation)
  const artkE2eFromCwd = join(process.cwd(), 'artk-e2e');
  if (existsSync(artkE2eFromCwd)) {
    cachedHarnessRoot = artkE2eFromCwd;
    return cachedHarnessRoot;
  }

  // 3. Check if we're already inside artk-e2e (cwd has artk.config.yml)
  const configInCwd = join(process.cwd(), 'artk.config.yml');
  if (existsSync(configInCwd)) {
    cachedHarnessRoot = process.cwd();
    return cachedHarnessRoot;
  }

  // 4. Walk up from cwd looking for artk-e2e/ or artk.config.yml
  let searchDir = process.cwd();
  const root = dirname(searchDir);
  while (searchDir !== root) {
    // Check if this is artk-e2e (has artk.config.yml)
    if (existsSync(join(searchDir, 'artk.config.yml'))) {
      cachedHarnessRoot = searchDir;
      return cachedHarnessRoot;
    }
    // Check if artk-e2e is a sibling
    const sibling = join(searchDir, 'artk-e2e');
    if (existsSync(sibling)) {
      cachedHarnessRoot = sibling;
      return cachedHarnessRoot;
    }
    searchDir = dirname(searchDir);
  }

  // 5. Fallback to cwd (backwards compatibility)
  cachedHarnessRoot = process.cwd();
  return cachedHarnessRoot;
}

/**
 * Get the LLKB root directory (.artk/llkb inside harness root).
 *
 * @param explicitRoot - Optional explicit path override
 * @returns Path to the LLKB root directory
 */
export function getLlkbRoot(explicitRoot?: string): string {
  if (explicitRoot) {
    return explicitRoot;
  }
  return join(getHarnessRoot(), '.artk', 'llkb');
}

/**
 * Get the .artk directory inside harness root.
 *
 * @param explicitBaseDir - Optional explicit path override
 * @returns Path to the .artk directory
 */
export function getArtkDir(explicitBaseDir?: string): string {
  if (explicitBaseDir) {
    return join(explicitBaseDir, '.artk');
  }
  return join(getHarnessRoot(), '.artk');
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTOGEN ARTIFACT PATHS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Autogen artifact types
 */
export type AutogenArtifact =
  | 'analysis'      // analysis.json - Journey analysis results
  | 'plan'          // plan.json - Test generation plan
  | 'state'         // pipeline-state.json - Pipeline execution state
  | 'results'       // results.json - Test execution results
  | 'samples'       // samples/ directory - Multi-sample outputs
  | 'agreement'     // samples/agreement.json - Sample agreement analysis
  | 'telemetry';    // telemetry.json - Session telemetry

/**
 * Get the autogen artifacts directory (.artk/autogen inside harness root).
 *
 * @param explicitBaseDir - Optional explicit path override
 * @returns Path to the autogen directory
 */
export function getAutogenDir(explicitBaseDir?: string): string {
  return join(getArtkDir(explicitBaseDir), 'autogen');
}

/**
 * Get the path to a specific autogen artifact.
 *
 * @param artifact - The artifact type to get path for
 * @param explicitBaseDir - Optional explicit path override
 * @returns Path to the artifact
 */
export function getAutogenArtifact(artifact: AutogenArtifact, explicitBaseDir?: string): string {
  const dir = getAutogenDir(explicitBaseDir);
  switch (artifact) {
    case 'analysis':
      return join(dir, 'analysis.json');
    case 'plan':
      return join(dir, 'plan.json');
    case 'state':
      return join(dir, 'pipeline-state.json');
    case 'results':
      return join(dir, 'results.json');
    case 'samples':
      return join(dir, 'samples');
    case 'agreement':
      return join(dir, 'samples', 'agreement.json');
    case 'telemetry':
      return join(dir, 'telemetry.json');
  }
}

/**
 * Ensure the autogen directory structure exists.
 *
 * Creates:
 * - <harnessRoot>/.artk/autogen/
 * - <harnessRoot>/.artk/autogen/samples/
 *
 * @param explicitBaseDir - Optional explicit path override
 */
export async function ensureAutogenDir(explicitBaseDir?: string): Promise<void> {
  const { mkdir } = await import('node:fs/promises');
  const dir = getAutogenDir(explicitBaseDir);
  await mkdir(dir, { recursive: true });
  await mkdir(join(dir, 'samples'), { recursive: true });
}

/**
 * Clean all autogen artifacts for a fresh start.
 *
 * Removes and recreates the autogen directory.
 *
 * @param explicitBaseDir - Optional explicit path override
 */
export async function cleanAutogenArtifacts(explicitBaseDir?: string): Promise<void> {
  const { rm } = await import('node:fs/promises');
  const dir = getAutogenDir(explicitBaseDir);
  if (existsSync(dir)) {
    await rm(dir, { recursive: true });
  }
  await ensureAutogenDir(explicitBaseDir);
}

/**
 * Check if autogen artifacts exist.
 *
 * @param explicitBaseDir - Optional explicit path override
 * @returns true if the autogen directory exists and contains artifacts
 */
export function hasAutogenArtifacts(explicitBaseDir?: string): boolean {
  const dir = getAutogenDir(explicitBaseDir);
  if (!existsSync(dir)) {
    return false;
  }
  // Check for at least one artifact
  const artifactTypes: AutogenArtifact[] = ['analysis', 'plan', 'state', 'results'];
  return artifactTypes.some(artifact => existsSync(getAutogenArtifact(artifact, explicitBaseDir)));
}

// ═══════════════════════════════════════════════════════════════════════════
// PATH VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Custom error for path traversal attempts.
 */
export class PathTraversalError extends Error {
  public readonly resolvedPath: string;

  constructor(
    public readonly userPath: string,
    public readonly allowedRoot: string,
    resolvedPath: string
  ) {
    super(`Path traversal detected: "${userPath}" resolves outside allowed root "${allowedRoot}"`);
    this.name = 'PathTraversalError';
    this.resolvedPath = resolvedPath;
  }
}

/**
 * Validate that a user-provided path stays within an allowed root directory.
 *
 * Security: This function prevents path traversal attacks by:
 * 1. Resolving the path to an absolute path
 * 2. Resolving symlinks to their real targets
 * 3. Checking that the resolved path is within the allowed root
 *
 * @param userPath - The user-provided path (relative or absolute)
 * @param allowedRoot - The root directory that the path must stay within
 * @returns The resolved absolute path (safe to use)
 * @throws PathTraversalError if the path would escape the allowed root
 *
 * @example
 * // Valid paths
 * validatePath('tests/login.spec.ts', '/project') // => '/project/tests/login.spec.ts'
 * validatePath('./src/index.ts', '/project') // => '/project/src/index.ts'
 *
 * // Invalid paths (throw PathTraversalError)
 * validatePath('../../../etc/passwd', '/project') // throws
 * validatePath('/etc/passwd', '/project') // throws (absolute path outside root)
 */
export function validatePath(userPath: string, allowedRoot: string): string {
  // Handle empty path
  if (!userPath || userPath.trim() === '') {
    throw new PathTraversalError(userPath, allowedRoot, '');
  }

  // Security: Check for dangerous characters that could bypass validation
  // Null bytes can truncate strings in some file system APIs
  // Newlines can be used for log injection or command splitting
  if (userPath.includes('\0') || userPath.includes('\n') || userPath.includes('\r')) {
    throw new PathTraversalError(userPath, allowedRoot, 'invalid-characters');
  }

  // Windows-specific security checks
  if (process.platform === 'win32') {
    // Block Alternate Data Streams (ADS) - e.g., file.txt:Zone.Identifier
    // ADS format: filename:streamname or filename::$DATA
    // Only allow : as second character (drive letter like C:)
    const colonIndex = userPath.indexOf(':');
    if (colonIndex !== -1 && colonIndex !== 1) {
      throw new PathTraversalError(userPath, allowedRoot, 'alternate-data-stream');
    }

    // Block UNC paths - \\server\share or //server/share
    if (userPath.startsWith('\\\\') || userPath.startsWith('//')) {
      throw new PathTraversalError(userPath, allowedRoot, 'unc-path');
    }
  }

  // Resolve the user path relative to the allowed root
  const resolved = resolve(allowedRoot, userPath);

  // Try to resolve symlinks - if the file doesn't exist yet, just use the resolved path
  let realResolved: string;
  let realRoot: string;

  try {
    realRoot = realpathSync(allowedRoot);
  } catch {
    // If allowed root doesn't exist, use the resolved version
    realRoot = resolve(allowedRoot);
  }

  try {
    realResolved = realpathSync(resolved);
  } catch {
    // File doesn't exist yet - try to resolve the parent directory chain
    // to ensure we get a consistent path (handles /var -> /private/var on macOS)
    let current = resolved;
    let parentResolved = resolved;
    while (current !== dirname(current)) {
      const parent = dirname(current);
      try {
        // Find the deepest existing directory and resolve from there
        const realParent = realpathSync(parent);
        const relativePart = relative(parent, resolved);
        parentResolved = join(realParent, relativePart);
        break;
      } catch {
        current = parent;
      }
    }
    realResolved = parentResolved;
  }

  // Calculate relative path from root to resolved
  const rel = relative(realRoot, realResolved);

  // Check for traversal:
  // - Path starts with '..' (escapes upward)
  // - Path is absolute and different from root (e.g., /etc/passwd resolved)
  if (rel.startsWith('..') || (isAbsolute(rel) && !rel.startsWith(realRoot))) {
    throw new PathTraversalError(userPath, allowedRoot, realResolved);
  }

  return realResolved;
}

/**
 * Validate multiple paths and return only the valid ones.
 *
 * @param paths - Array of user-provided paths
 * @param allowedRoot - The root directory that paths must stay within
 * @param onInvalid - Optional callback for invalid paths (for logging/reporting)
 * @returns Array of validated absolute paths (invalid paths are filtered out)
 */
export function validatePaths(
  paths: string[],
  allowedRoot: string,
  onInvalid?: (_invalidPath: string) => void
): string[] {
  const validPaths: string[] = [];

  for (const userPath of paths) {
    try {
      const validated = validatePath(userPath, allowedRoot);
      validPaths.push(validated);
    } catch (e) {
      if (e instanceof PathTraversalError && onInvalid) {
        onInvalid(userPath);
      }
      // Skip invalid paths
    }
  }

  return validPaths;
}
