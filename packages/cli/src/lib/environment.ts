/**
 * Environment detection utilities
 *
 * Detects the target project's module system (ESM vs CommonJS)
 * and other environment characteristics.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface EnvironmentInfo {
  moduleSystem: 'esm' | 'commonjs' | 'unknown';
  nodeVersion: string;
  npmVersion: string | null;
  hasGit: boolean;
  hasPlaywright: boolean;
  hasArtkCore: boolean;
  platform: NodeJS.Platform;
  arch: string;
  isCI: boolean;
}

/**
 * Detect the target project's environment
 */
export async function detectEnvironment(projectPath: string): Promise<EnvironmentInfo> {
  const resolvedPath = path.resolve(projectPath);

  return {
    moduleSystem: detectModuleSystem(resolvedPath),
    nodeVersion: process.version,
    npmVersion: await detectNpmVersion(),
    hasGit: await detectGit(resolvedPath),
    hasPlaywright: detectPlaywright(resolvedPath),
    hasArtkCore: detectArtkCore(resolvedPath),
    platform: process.platform,
    arch: process.arch,
    isCI: detectCI(),
  };
}

/**
 * Detect the module system from package.json and file extensions
 */
function detectModuleSystem(projectPath: string): 'esm' | 'commonjs' | 'unknown' {
  const packageJsonPath = path.join(projectPath, 'package.json');

  // Check package.json "type" field
  if (fs.existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      if (pkg.type === 'module') {
        return 'esm';
      }
      if (pkg.type === 'commonjs' || !pkg.type) {
        // Check for ESM indicators even without "type": "module"
        const hasEsmConfig = fs.existsSync(path.join(projectPath, 'tsconfig.json'));
        if (hasEsmConfig) {
          try {
            const tsconfig = JSON.parse(fs.readFileSync(path.join(projectPath, 'tsconfig.json'), 'utf8'));
            const module = tsconfig.compilerOptions?.module?.toLowerCase();
            if (module && (module.includes('esnext') || module.includes('es20') || module === 'nodenext')) {
              return 'esm';
            }
          } catch {
            // Ignore tsconfig parse errors
          }
        }
        return 'commonjs';
      }
    } catch {
      // Ignore parse errors
    }
  }

  // Check for .mjs files (strong ESM indicator)
  const srcDir = path.join(projectPath, 'src');
  if (fs.existsSync(srcDir)) {
    try {
      const files = fs.readdirSync(srcDir, { recursive: true }) as string[];
      const hasMjs = files.some((f) => f.endsWith('.mjs'));
      const hasCjs = files.some((f) => f.endsWith('.cjs'));
      if (hasMjs && !hasCjs) return 'esm';
      if (hasCjs && !hasMjs) return 'commonjs';
    } catch {
      // Ignore read errors
    }
  }

  return 'unknown';
}

/**
 * Get npm version
 */
async function detectNpmVersion(): Promise<string | null> {
  try {
    const { execSync } = await import('child_process');
    const version = execSync('npm --version', { encoding: 'utf8' }).trim();
    return version;
  } catch {
    return null;
  }
}

/**
 * Check if the project is a git repository
 */
async function detectGit(projectPath: string): Promise<boolean> {
  // Check for .git directory
  if (fs.existsSync(path.join(projectPath, '.git'))) {
    return true;
  }

  // Check if we're in a subdirectory of a git repo
  try {
    const { execSync } = await import('child_process');
    execSync('git rev-parse --git-dir', { cwd: projectPath, encoding: 'utf8', stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if Playwright is installed
 */
function detectPlaywright(projectPath: string): boolean {
  const playwrightPath = path.join(projectPath, 'node_modules', '@playwright', 'test');
  return fs.existsSync(playwrightPath);
}

/**
 * Check if @artk/core is installed
 */
function detectArtkCore(projectPath: string): boolean {
  // Check vendor location
  const vendorPath = path.join(projectPath, 'artk-e2e', 'vendor', 'artk-core');
  if (fs.existsSync(vendorPath)) return true;

  // Check node_modules
  const nodeModulesPath = path.join(projectPath, 'node_modules', '@artk', 'core');
  return fs.existsSync(nodeModulesPath);
}

/**
 * Detect CI environment
 */
function detectCI(): boolean {
  return !!(
    process.env.CI ||
    process.env.GITHUB_ACTIONS ||
    process.env.GITLAB_CI ||
    process.env.JENKINS_HOME ||
    process.env.CIRCLECI ||
    process.env.TRAVIS ||
    process.env.TF_BUILD
  );
}

/**
 * Get OS and architecture for browser downloads
 */
export function getOsArch(): { os: string; arch: string } {
  let os: string;
  switch (process.platform) {
    case 'darwin':
      os = 'macos';
      break;
    case 'win32':
      os = 'windows';
      break;
    case 'linux':
      os = 'linux';
      break;
    default:
      os = 'unknown';
  }

  let arch: string;
  switch (process.arch) {
    case 'x64':
      arch = 'x64';
      break;
    case 'arm64':
      arch = 'arm64';
      break;
    case 'ia32':
      arch = 'x86';
      break;
    default:
      arch = 'unknown';
  }

  return { os, arch };
}
