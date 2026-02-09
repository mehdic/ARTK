/**
 * LLKB Pattern Discovery Module
 *
 * This module provides functions for discovering app-specific patterns
 * by analyzing the target application's codebase. It detects:
 * - Frameworks (React, Angular, Vue, Next.js)
 * - UI Libraries (MUI, Ant Design, Chakra, AG Grid)
 * - Selector conventions (data-testid, aria-label, role)
 * - Authentication patterns
 *
 * @module llkb/discovery
 */

import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as path from 'path';
import { saveJSONAtomicSync } from './file-utils.js';

// =============================================================================
// Constants
// =============================================================================

/** Confidence boost for each package found in package.json */
const PACKAGE_CONFIDENCE_BOOST = 0.3;
/** Confidence boost for each config file found */
const FILE_CONFIDENCE_BOOST = 0.2;
/** Confidence boost for UI library packages */
const UI_PACKAGE_CONFIDENCE_BOOST = 0.25;
/** Additional confidence boost for enterprise UI library versions */
const UI_ENTERPRISE_BOOST = 0.15;
/** Maximum number of sample selectors to collect */
const MAX_SAMPLE_SELECTORS = 50;

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Signal indicating a detected framework
 */
export interface FrameworkSignal {
  /** Framework name (react, angular, vue, nextjs, svelte) */
  name: string;
  /** Detected version if available */
  version?: string;
  /** Confidence score (0.0 - 1.0) */
  confidence: number;
  /** Evidence that led to detection */
  evidence: string[];
}

/**
 * Signal indicating a detected UI library
 */
export interface UiLibrarySignal {
  /** Library name (mui, antd, chakra, ag-grid) */
  name: string;
  /** Confidence score (0.0 - 1.0) */
  confidence: number;
  /** Evidence that led to detection */
  evidence: string[];
  /** Whether enterprise version is detected */
  hasEnterprise?: boolean;
}

/**
 * Analysis of selector usage patterns in the codebase
 */
export interface SelectorSignals {
  /** Most commonly used selector attribute */
  primaryAttribute: string;
  /** Detected naming convention */
  namingConvention: 'kebab-case' | 'camelCase' | 'snake_case' | 'mixed';
  /** Coverage percentage for each selector type */
  coverage: Record<string, number>;
  /** Total components analyzed */
  totalComponentsAnalyzed: number;
  /** Sample selectors found */
  sampleSelectors: string[];
}

/**
 * Hints about authentication patterns in the application
 */
export interface AuthHints {
  /** Whether auth was detected */
  detected: boolean;
  /** Type of authentication */
  type?: 'form' | 'oidc' | 'oauth' | 'sso' | 'basic';
  /** Login route path */
  loginRoute?: string;
  /** Detected selectors for auth elements */
  selectors?: Record<string, string>;
  /** Whether bypass mechanism is available */
  bypassAvailable?: boolean;
  /** How to bypass auth for testing */
  bypassMethod?: string;
}

/**
 * Complete app profile combining all discovery signals
 * Note: Named DiscoveredProfile to avoid collision with AppProfile in loaders.ts
 */
export interface DiscoveredProfile {
  /** Schema version */
  version: string;
  /** When this profile was generated */
  generatedAt: string;
  /** Root directory of the project */
  projectRoot: string;
  /** Detected frameworks */
  frameworks: FrameworkSignal[];
  /** Detected UI libraries */
  uiLibraries: UiLibrarySignal[];
  /** Selector usage analysis */
  selectorSignals: SelectorSignals;
  /** Authentication hints */
  auth: AuthHints;
  /** Runtime validation status (if performed) */
  runtime: {
    validated: boolean;
    scanUrl: string | null;
    domSampleCount: number;
  };
}

/**
 * Result of a complete discovery run
 */
export interface DiscoveryResult {
  /** Whether discovery was successful */
  success: boolean;
  /** Generated app profile */
  profile: DiscoveredProfile | null;
  /** Any errors encountered */
  errors: string[];
  /** Warnings (non-fatal issues) */
  warnings: string[];
}

// =============================================================================
// Framework Detection Patterns
// =============================================================================

/**
 * Pattern definitions for framework detection
 */
export const FRAMEWORK_PATTERNS: Record<string, {
  packages: string[];
  files: string[];
  baseConfidence: number;
}> = {
  react: {
    packages: ['react', 'react-dom'],
    files: ['src/App.tsx', 'src/App.jsx', 'src/index.tsx', 'src/index.jsx'],
    baseConfidence: 0.95,
  },
  angular: {
    packages: ['@angular/core', '@angular/common'],
    files: ['angular.json', 'src/app/app.module.ts', 'src/app/app.component.ts'],
    baseConfidence: 0.95,
  },
  vue: {
    packages: ['vue'],
    files: ['src/App.vue', 'src/main.ts', 'vue.config.js', 'vite.config.ts'],
    baseConfidence: 0.90,
  },
  nextjs: {
    packages: ['next'],
    files: ['next.config.js', 'next.config.mjs', 'next.config.ts', 'src/app/page.tsx', 'pages/_app.tsx'],
    baseConfidence: 0.95,
  },
  svelte: {
    packages: ['svelte'],
    files: ['svelte.config.js', 'src/App.svelte'],
    baseConfidence: 0.90,
  },
};

/**
 * Pattern definitions for UI library detection
 */
export const UI_LIBRARY_PATTERNS: Record<string, {
  packages: string[];
  enterprisePackages?: string[];
  baseConfidence: number;
}> = {
  mui: {
    packages: ['@mui/material', '@mui/core', '@emotion/react', '@emotion/styled'],
    enterprisePackages: ['@mui/x-data-grid-pro', '@mui/x-data-grid-premium'],
    baseConfidence: 0.85,
  },
  antd: {
    packages: ['antd', '@ant-design/icons'],
    enterprisePackages: ['@ant-design/pro-components', '@ant-design/pro-layout'],
    baseConfidence: 0.85,
  },
  chakra: {
    packages: ['@chakra-ui/react', '@chakra-ui/core'],
    baseConfidence: 0.85,
  },
  'ag-grid': {
    packages: ['ag-grid-community', 'ag-grid-react', 'ag-grid-angular', 'ag-grid-vue'],
    enterprisePackages: ['ag-grid-enterprise', '@ag-grid-enterprise/core'],
    baseConfidence: 0.90,
  },
  tailwind: {
    packages: ['tailwindcss'],
    baseConfidence: 0.80,
  },
  bootstrap: {
    packages: ['bootstrap', 'react-bootstrap', 'ng-bootstrap', 'bootstrap-vue'],
    baseConfidence: 0.80,
  },
};

/**
 * Regex source patterns for selector attribute detection.
 * Stored as source strings so each consumer creates a fresh RegExp
 * (avoids shared mutable lastIndex state from /g flag).
 */
const SELECTOR_PATTERN_SOURCES: Record<string, string> = {
  'data-testid': `data-testid=['"]([^'"]+)['"]`,
  'data-cy': `data-cy=['"]([^'"]+)['"]`,
  'data-test': `data-test=['"]([^'"]+)['"]`,
  'data-test-id': `data-test-id=['"]([^'"]+)['"]`,
  'aria-label': `aria-label=['"]([^'"]+)['"]`,
  'role': `role=['"]([^'"]+)['"]`,
};

/**
 * Get fresh regex instances for selector patterns (no shared /g state).
 * @returns Record of selector name to fresh RegExp with /g flag
 */
function createSelectorPatterns(): Record<string, RegExp> {
  const patterns: Record<string, RegExp> = {};
  for (const [key, source] of Object.entries(SELECTOR_PATTERN_SOURCES)) {
    patterns[key] = new RegExp(source, 'g');
  }
  return patterns;
}

/**
 * Exported for backward compatibility. Note: these use /g flag and have
 * mutable lastIndex. Prefer createSelectorPatterns() for repeated use.
 * @deprecated Use createSelectorPatterns() for thread-safe usage
 */
export const SELECTOR_PATTERNS: Record<string, RegExp> = createSelectorPatterns();

// =============================================================================
// Detection Functions
// =============================================================================

/**
 * Detect frameworks used in a project
 *
 * @param projectRoot - Path to the project root directory
 * @returns Array of detected framework signals
 */
export function detectFrameworks(projectRoot: string): FrameworkSignal[] {
  const signals: FrameworkSignal[] = [];
  const packageJsonPath = path.join(projectRoot, 'package.json');

  // Check if package.json exists
  if (!fs.existsSync(packageJsonPath)) {
    return signals;
  }

  let packageJson: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
  try {
    const content = fs.readFileSync(packageJsonPath, 'utf-8');
    const parsed: unknown = JSON.parse(content);
    // SEC-F03: Runtime shape validation
    if (typeof parsed !== 'object' || parsed === null) {
      return signals;
    }
    packageJson = parsed as typeof packageJson;
  } catch {
    return signals;
  }

  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  for (const [framework, patterns] of Object.entries(FRAMEWORK_PATTERNS)) {
    const evidence: string[] = [];
    let confidence = 0;

    // Check packages
    for (const pkg of patterns.packages) {
      if (allDeps[pkg]) {
        evidence.push(`package.json:${pkg}@${allDeps[pkg]}`);
        confidence += PACKAGE_CONFIDENCE_BOOST;
      }
    }

    // Check files
    for (const file of patterns.files) {
      const filePath = path.join(projectRoot, file);
      if (fs.existsSync(filePath)) {
        evidence.push(`file:${file}`);
        confidence += FILE_CONFIDENCE_BOOST;
      }
    }

    if (evidence.length > 0) {
      // Cap confidence at base confidence level
      confidence = Math.min(confidence, patterns.baseConfidence);

      // Extract version from primary package
      const primaryPkg = patterns.packages[0] ?? '';
      const version = primaryPkg ? allDeps[primaryPkg]?.replace(/[\^~>=<]/, '') : undefined;

      signals.push({
        name: framework,
        version,
        confidence,
        evidence,
      });
    }
  }

  // Sort by confidence descending
  return signals.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Detect UI libraries used in a project
 *
 * @param projectRoot - Path to the project root directory
 * @returns Array of detected UI library signals
 */
export function detectUiLibraries(projectRoot: string): UiLibrarySignal[] {
  const signals: UiLibrarySignal[] = [];
  const packageJsonPath = path.join(projectRoot, 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    return signals;
  }

  let packageJson: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
  try {
    const content = fs.readFileSync(packageJsonPath, 'utf-8');
    const parsed: unknown = JSON.parse(content);
    // SEC-F03: Runtime shape validation
    if (typeof parsed !== 'object' || parsed === null) {
      return signals;
    }
    packageJson = parsed as typeof packageJson;
  } catch {
    return signals;
  }

  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  for (const [library, patterns] of Object.entries(UI_LIBRARY_PATTERNS)) {
    const evidence: string[] = [];
    let confidence = 0;
    let hasEnterprise = false;

    // Check packages
    for (const pkg of patterns.packages) {
      if (allDeps[pkg]) {
        evidence.push(`package.json:${pkg}`);
        confidence += UI_PACKAGE_CONFIDENCE_BOOST;
      }
    }

    // Check enterprise packages
    if (patterns.enterprisePackages) {
      for (const pkg of patterns.enterprisePackages) {
        if (allDeps[pkg]) {
          evidence.push(`package.json:${pkg} (enterprise)`);
          hasEnterprise = true;
          confidence += UI_ENTERPRISE_BOOST;
        }
      }
    }

    if (evidence.length > 0) {
      confidence = Math.min(confidence, patterns.baseConfidence);

      signals.push({
        name: library,
        confidence,
        evidence,
        hasEnterprise: hasEnterprise || undefined,
      });
    }
  }

  return signals.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Analyze selector patterns in source files
 *
 * @param projectRoot - Path to the project root directory
 * @returns Selector signal analysis
 */
export async function analyzeSelectorSignals(projectRoot: string): Promise<SelectorSignals> {
  const coverage: Record<string, number> = {};
  const selectorCounts: Record<string, number> = {};
  const sampleSelectors: string[] = [];
  let totalFiles = 0;

  // Initialize counts
  for (const attr of Object.keys(SELECTOR_PATTERNS)) {
    selectorCounts[attr] = 0;
  }

  // Find source files
  const srcDir = path.join(projectRoot, 'src');
  if (fs.existsSync(srcDir)) {
    await scanDirectoryForSelectors(srcDir, selectorCounts, sampleSelectors);
    totalFiles = await countSourceFiles(srcDir);
  }

  // Calculate coverage
  const totalSelectors = Object.values(selectorCounts).reduce((sum, count) => sum + count, 0);
  for (const [attr, count] of Object.entries(selectorCounts)) {
    coverage[attr] = totalSelectors > 0 ? count / totalSelectors : 0;
  }

  // Determine primary attribute
  const primaryAttribute = Object.entries(selectorCounts)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || 'data-testid';

  // Detect naming convention from samples
  const namingConvention = detectNamingConvention(sampleSelectors);

  return {
    primaryAttribute,
    namingConvention,
    coverage,
    totalComponentsAnalyzed: totalFiles,
    sampleSelectors: sampleSelectors.slice(0, 10), // Keep top 10 samples
  };
}

/**
 * Extract authentication hints from project
 *
 * @param projectRoot - Path to the project root directory
 * @returns Authentication hints
 */
export async function extractAuthHints(projectRoot: string): Promise<AuthHints> {
  const hints: AuthHints = {
    detected: false,
  };

  // Check for ARTK discovery output first
  const artkDiscoveryPath = path.join(projectRoot, '.artk', 'discovery.json');
  if (fs.existsSync(artkDiscoveryPath)) {
    try {
      interface DiscoveryJson {
        auth?: {
          type?: AuthHints['type'];
          loginRoute?: string;
          selectors?: AuthHints['selectors'];
          bypassAvailable?: boolean;
          bypassMethod?: string;
        };
      }
      const parsed: unknown = JSON.parse(fs.readFileSync(artkDiscoveryPath, 'utf-8'));
      // SEC-F03: Runtime shape validation
      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('Invalid discovery.json shape');
      }
      const discovery = parsed as DiscoveryJson;
      if (discovery.auth) {
        hints.detected = true;
        hints.type = discovery.auth.type;
        hints.loginRoute = discovery.auth.loginRoute;
        hints.selectors = discovery.auth.selectors;
        hints.bypassAvailable = discovery.auth.bypassAvailable;
        hints.bypassMethod = discovery.auth.bypassMethod;
        return hints;
      }
    } catch {
      // Continue with fallback detection
    }
  }

  // Fallback: scan for auth patterns
  const srcDir = path.join(projectRoot, 'src');
  if (!fs.existsSync(srcDir)) {
    return hints;
  }

  const authPatterns = await scanForAuthPatterns(srcDir);
  if (authPatterns.hasAuth) {
    hints.detected = true;
    hints.type = authPatterns.type;
    hints.loginRoute = authPatterns.loginRoute;
    hints.selectors = authPatterns.selectors;
  }

  return hints;
}

/**
 * Run full discovery and generate app profile
 *
 * @param projectRoot - Path to the project root directory
 * @returns Discovery result with app profile
 */
export async function runDiscovery(projectRoot: string): Promise<DiscoveryResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate project root
  if (!fs.existsSync(projectRoot)) {
    return {
      success: false,
      profile: null,
      errors: [`Project root does not exist: ${projectRoot}`],
      warnings: [],
    };
  }

  // Run all detection functions
  let frameworks: FrameworkSignal[] = [];
  let uiLibraries: UiLibrarySignal[] = [];
  let selectorSignals: SelectorSignals;
  let auth: AuthHints;

  try {
    frameworks = detectFrameworks(projectRoot);
    if (frameworks.length === 0) {
      warnings.push('No frameworks detected');
    }
  } catch (e) {
    errors.push(`Framework detection failed: ${String(e)}`);
  }

  try {
    uiLibraries = detectUiLibraries(projectRoot);
  } catch (e) {
    warnings.push(`UI library detection failed: ${String(e)}`);
  }

  try {
    selectorSignals = await analyzeSelectorSignals(projectRoot);
  } catch (e) {
    warnings.push(`Selector analysis failed: ${String(e)}`);
    selectorSignals = {
      primaryAttribute: 'data-testid',
      namingConvention: 'kebab-case',
      coverage: {},
      totalComponentsAnalyzed: 0,
      sampleSelectors: [],
    };
  }

  try {
    auth = await extractAuthHints(projectRoot);
  } catch (e) {
    warnings.push(`Auth hint extraction failed: ${String(e)}`);
    auth = { detected: false };
  }

  const profile: DiscoveredProfile = {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    projectRoot,
    frameworks,
    uiLibraries,
    selectorSignals,
    auth,
    runtime: {
      validated: false,
      scanUrl: null,
      domSampleCount: 0,
    },
  };

  return {
    success: errors.length === 0,
    profile,
    errors,
    warnings,
  };
}

/**
 * Save discovered profile to disk
 *
 * @param profile - The discovered profile to save
 * @param outputDir - Directory to save to (usually .artk/llkb/)
 */
export function saveDiscoveredProfile(profile: DiscoveredProfile, outputDir: string): void {
  const outputPath = path.join(outputDir, 'discovered-profile.json');
  fs.mkdirSync(outputDir, { recursive: true });

  // SEC-F05: Redact absolute projectRoot to prevent info disclosure if committed.
  // SEC-F09: Redact auth selector values (credential-adjacent data).
  // Auth metadata (type, loginRoute, bypassAvailable) is safe; raw selectors are not.
  const redactedAuth = profile.auth.selectors
    ? { ...profile.auth, selectors: Object.fromEntries(
        Object.keys(profile.auth.selectors).map(k => [k, '[REDACTED]'])
      ) }
    : profile.auth;

  const redacted = {
    ...profile,
    projectRoot: path.basename(profile.projectRoot),
    auth: redactedAuth,
  };
  saveJSONAtomicSync(outputPath, redacted);
}

/**
 * Load discovered profile from disk
 *
 * @param llkbDir - Directory containing the profile (usually .artk/llkb/)
 * @returns The discovered profile, or null if not found
 */
export function loadDiscoveredProfile(llkbDir: string): DiscoveredProfile | null {
  const filePath = path.join(llkbDir, 'discovered-profile.json');
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed: unknown = JSON.parse(content);
    // SEC-F03: Runtime shape validation
    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }
    // Validate minimum required fields
    const obj = parsed as Record<string, unknown>;
    if (!obj.version || !Array.isArray(obj.frameworks)) {
      return null;
    }
    return obj as unknown as DiscoveredProfile;
  } catch {
    return null;
  }
}

/**
 * @deprecated Use saveDiscoveredProfile instead
 */
export const saveAppProfile = saveDiscoveredProfile;

// =============================================================================
// Helper Functions
// =============================================================================

/** Maximum recursion depth for directory scanning */
const MAX_SCAN_DEPTH = 20;
/** Maximum number of files to scan */
const MAX_FILES_TO_SCAN = 5000;

/**
 * Recursively scan directory for selector patterns (async)
 */
async function scanDirectoryForSelectors(
  dir: string,
  selectorCounts: Record<string, number>,
  sampleSelectors: string[],
  depth: number = 0,
  fileCount: { count: number } = { count: 0 }
): Promise<void> {
  // Guard against excessive recursion or file count
  if (depth > MAX_SCAN_DEPTH || fileCount.count > MAX_FILES_TO_SCAN) {
    return;
  }

  const extensions = ['.tsx', '.jsx', '.vue', '.html', '.ts', '.js'];

  let entries: fs.Dirent[];
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch {
    return; // Directory not readable
  }

  for (const entry of entries) {
    if (fileCount.count > MAX_FILES_TO_SCAN) {break;}

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Skip node_modules, hidden directories, and symlinks
      if (entry.name !== 'node_modules' && !entry.name.startsWith('.') && !entry.isSymbolicLink()) {
        await scanDirectoryForSelectors(fullPath, selectorCounts, sampleSelectors, depth + 1, fileCount);
      }
    } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
      fileCount.count++;
      try {
        const content = await fsp.readFile(fullPath, 'utf-8');

        // Create fresh regex instances per file to avoid shared lastIndex state
        const freshPatterns = createSelectorPatterns();
        for (const [attr, pattern] of Object.entries(freshPatterns)) {
          let match: RegExpExecArray | null;
          while ((match = pattern.exec(content)) !== null) {
            selectorCounts[attr]!++;
            if (sampleSelectors.length < MAX_SAMPLE_SELECTORS && match[1]) {
              sampleSelectors.push(match[1]);
            }
          }
        }
      } catch {
        // Skip files that can't be read
      }
    }
  }
}

/**
 * Count source files in a directory (async)
 */
async function countSourceFiles(dir: string, depth: number = 0): Promise<number> {
  if (depth > MAX_SCAN_DEPTH) {return 0;}

  const extensions = ['.tsx', '.jsx', '.vue', '.ts', '.js'];
  let count = 0;

  let entries: fs.Dirent[];
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch {
    return 0;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory() && entry.name !== 'node_modules' && !entry.name.startsWith('.') && !entry.isSymbolicLink()) {
      count += await countSourceFiles(fullPath, depth + 1);
    } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
      count++;
    }
  }

  return count;
}

/**
 * Detect naming convention from selector samples
 */
function detectNamingConvention(samples: string[]): 'kebab-case' | 'camelCase' | 'snake_case' | 'mixed' {
  if (samples.length === 0) {return 'kebab-case';}

  let kebabCount = 0;
  let camelCount = 0;
  let snakeCount = 0;

  for (const sample of samples) {
    if (sample.includes('-')) {kebabCount++;}
    if (/[a-z][A-Z]/.test(sample)) {camelCount++;}
    if (sample.includes('_')) {snakeCount++;}
  }

  const maxCount = Math.max(kebabCount, camelCount, snakeCount);

  if (maxCount === 0) {return 'kebab-case';}
  if (kebabCount === maxCount && camelCount < maxCount && snakeCount < maxCount) {return 'kebab-case';}
  if (camelCount === maxCount && kebabCount < maxCount && snakeCount < maxCount) {return 'camelCase';}
  if (snakeCount === maxCount && kebabCount < maxCount && camelCount < maxCount) {return 'snake_case';}

  return 'mixed';
}

/**
 * Scan for authentication patterns
 */
async function scanForAuthPatterns(srcDir: string, depth: number = 0): Promise<{
  hasAuth: boolean;
  type?: 'form' | 'oidc' | 'oauth' | 'sso' | 'basic';
  loginRoute?: string;
  selectors?: Record<string, string>;
}> {
  // SEC-F04 FIX: Add depth limit (all other scan functions have one)
  if (depth > MAX_SCAN_DEPTH) {
    return { hasAuth: false };
  }

  const result: { hasAuth: boolean; type?: 'form' | 'oidc' | 'oauth' | 'sso' | 'basic'; loginRoute?: string; selectors?: Record<string, string> } = {
    hasAuth: false,
  };

  // Auth-related file patterns
  const authFilePatterns = [
    /auth/i,
    /login/i,
    /signin/i,
    /oauth/i,
    /sso/i,
  ];

  // Auth-related code patterns
  const authCodePatterns = {
    oidc: [/oidc/i, /openid/i, /id_token/i, /authorization_code/i],
    oauth: [/oauth/i, /access_token/i, /refresh_token/i],
    form: [/login.*form/i, /username.*password/i, /signin/i],
    sso: [/sso/i, /saml/i, /federation/i],
  };

  let entries: fs.Dirent[];
  try {
    entries = await fsp.readdir(srcDir, { withFileTypes: true });
  } catch {
    return result; // Directory not readable
  }

  for (const entry of entries) {
    const fullPath = path.join(srcDir, entry.name);

    if (entry.isFile() && authFilePatterns.some(p => p.test(entry.name))) {
      result.hasAuth = true;

      try {
        const content = await fsp.readFile(fullPath, 'utf-8');

        // Check for auth type
        for (const [type, patterns] of Object.entries(authCodePatterns)) {
          if (patterns.some(p => p.test(content))) {
            result.type = type as 'oidc' | 'oauth' | 'form' | 'sso';
            break;
          }
        }

        // Look for login route
        const routeMatch = content.match(/['"](\/login|\/signin|\/auth)['"]/i);
        if (routeMatch) {
          result.loginRoute = routeMatch[1];
        }
      } catch {
        // Skip files that can't be read
      }
    } else if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      const subResult = await scanForAuthPatterns(fullPath, depth + 1);
      if (subResult.hasAuth) {
        result.hasAuth = true;
        result.type = result.type || subResult.type;
        result.loginRoute = result.loginRoute || subResult.loginRoute;
      }
    }
  }

  return result;
}
