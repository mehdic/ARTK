/**
 * doctor command - Diagnose and fix common issues
 */

import fs from 'fs-extra';
import * as path from 'path';
import { execSync } from 'child_process';
import { Logger } from '../lib/logger.js';
import { resolveBrowser } from '../lib/browser-resolver.js';

export interface DoctorOptions {
  fix?: boolean;
  verbose?: boolean;
}

interface DiagnosticResult {
  name: string;
  status: 'ok' | 'warn' | 'error';
  message: string;
  fix?: () => Promise<void>;
}

export async function doctorCommand(targetPath: string, options: DoctorOptions): Promise<void> {
  const logger = new Logger({ verbose: options.verbose });
  const resolvedPath = path.resolve(targetPath);
  const artkE2ePath = path.join(resolvedPath, 'artk-e2e');
  const artkDir = path.join(resolvedPath, '.artk');

  logger.header('ARTK Doctor');
  logger.info(`Diagnosing: ${resolvedPath}`);
  logger.blank();

  const diagnostics: DiagnosticResult[] = [];

  // Check 1: ARTK installation
  diagnostics.push(await checkArtkInstallation(resolvedPath, artkE2ePath));

  // Check 2: Node modules
  diagnostics.push(await checkNodeModules(artkE2ePath));

  // Check 3: Playwright browsers
  diagnostics.push(await checkPlaywrightBrowsers(resolvedPath, artkE2ePath, logger));

  // Check 4: Configuration files
  diagnostics.push(await checkConfigFiles(artkE2ePath));

  // Check 5: Vendor packages
  diagnostics.push(await checkVendorPackages(artkE2ePath));

  // Check 6: TypeScript compilation
  diagnostics.push(await checkTypeScript(artkE2ePath));

  // Print results
  logger.blank();
  logger.info('Diagnostic Results:');
  logger.blank();

  let hasErrors = false;
  let hasWarnings = false;
  const fixable: DiagnosticResult[] = [];

  for (const diag of diagnostics) {
    if (diag.status === 'ok') {
      logger.success(`${diag.name}: ${diag.message}`);
    } else if (diag.status === 'warn') {
      logger.warning(`${diag.name}: ${diag.message}`);
      hasWarnings = true;
      if (diag.fix) fixable.push(diag);
    } else {
      logger.error(`${diag.name}: ${diag.message}`);
      hasErrors = true;
      if (diag.fix) fixable.push(diag);
    }
  }

  logger.blank();

  // Apply fixes if requested
  if (options.fix && fixable.length > 0) {
    logger.info('Attempting to fix issues...');
    logger.blank();

    for (const diag of fixable) {
      if (diag.fix) {
        logger.startSpinner(`Fixing: ${diag.name}...`);
        try {
          await diag.fix();
          logger.succeedSpinner(`Fixed: ${diag.name}`);
        } catch (error) {
          logger.failSpinner(`Failed to fix: ${diag.name}`);
          const message = error instanceof Error ? error.message : String(error);
          logger.debug(message);
        }
      }
    }

    logger.blank();
    logger.info('Re-run "artk doctor" to verify fixes.');
  } else if (fixable.length > 0 && !options.fix) {
    logger.info(`Found ${fixable.length} fixable issue(s). Run with --fix to attempt automatic fixes.`);
  }

  // Summary
  if (hasErrors) {
    logger.blank();
    logger.error('Some issues require attention.');
    process.exit(1);
  } else if (hasWarnings) {
    logger.blank();
    logger.warning('Some warnings were found, but ARTK should work.');
  } else {
    logger.blank();
    logger.success('All checks passed! ARTK is healthy.');
  }
}

async function checkArtkInstallation(projectPath: string, artkE2ePath: string): Promise<DiagnosticResult> {
  if (!fs.existsSync(artkE2ePath)) {
    return {
      name: 'ARTK Installation',
      status: 'error',
      message: 'artk-e2e directory not found',
    };
  }

  const contextPath = path.join(projectPath, '.artk', 'context.json');
  if (!fs.existsSync(contextPath)) {
    return {
      name: 'ARTK Installation',
      status: 'warn',
      message: 'Missing .artk/context.json',
      fix: async () => {
        await fs.ensureDir(path.join(projectPath, '.artk'));
        await fs.writeJson(contextPath, {
          version: '1.0',
          projectRoot: projectPath,
          artkRoot: artkE2ePath,
          initialized_at: new Date().toISOString(),
        }, { spaces: 2 });
      },
    };
  }

  return {
    name: 'ARTK Installation',
    status: 'ok',
    message: 'Properly installed',
  };
}

async function checkNodeModules(artkE2ePath: string): Promise<DiagnosticResult> {
  const nodeModulesPath = path.join(artkE2ePath, 'node_modules');

  if (!fs.existsSync(nodeModulesPath)) {
    return {
      name: 'Dependencies',
      status: 'error',
      message: 'node_modules not found',
      fix: async () => {
        execSync('npm install --legacy-peer-deps', { cwd: artkE2ePath, stdio: 'pipe' });
      },
    };
  }

  // Check for @playwright/test
  const playwrightPath = path.join(nodeModulesPath, '@playwright', 'test');
  if (!fs.existsSync(playwrightPath)) {
    return {
      name: 'Dependencies',
      status: 'error',
      message: '@playwright/test not installed',
      fix: async () => {
        execSync('npm install --legacy-peer-deps', { cwd: artkE2ePath, stdio: 'pipe' });
      },
    };
  }

  return {
    name: 'Dependencies',
    status: 'ok',
    message: 'All dependencies installed',
  };
}

async function checkPlaywrightBrowsers(
  projectPath: string,
  artkE2ePath: string,
  logger: Logger
): Promise<DiagnosticResult> {
  // Check for browsers in .artk/browsers or system
  const browsersCachePath = path.join(projectPath, '.artk', 'browsers');
  const hasCachedBrowsers = fs.existsSync(browsersCachePath) &&
    fs.readdirSync(browsersCachePath).some(f => f.startsWith('chromium-'));

  if (hasCachedBrowsers) {
    return {
      name: 'Playwright Browsers',
      status: 'ok',
      message: 'Browsers cached in .artk/browsers/',
    };
  }

  // Check artk.config.yml for system browser
  const configPath = path.join(artkE2ePath, 'artk.config.yml');
  if (fs.existsSync(configPath)) {
    const content = fs.readFileSync(configPath, 'utf8');
    if (content.includes('channel: msedge') || content.includes('channel: chrome')) {
      return {
        name: 'Playwright Browsers',
        status: 'ok',
        message: 'Using system browser',
      };
    }
  }

  return {
    name: 'Playwright Browsers',
    status: 'warn',
    message: 'No browsers configured',
    fix: async () => {
      await resolveBrowser(projectPath, logger);
    },
  };
}

async function checkConfigFiles(artkE2ePath: string): Promise<DiagnosticResult> {
  const requiredFiles = [
    'package.json',
    'playwright.config.ts',
    'tsconfig.json',
    'artk.config.yml',
  ];

  const missing: string[] = [];
  for (const file of requiredFiles) {
    if (!fs.existsSync(path.join(artkE2ePath, file))) {
      missing.push(file);
    }
  }

  if (missing.length > 0) {
    return {
      name: 'Configuration Files',
      status: 'error',
      message: `Missing: ${missing.join(', ')}`,
    };
  }

  return {
    name: 'Configuration Files',
    status: 'ok',
    message: 'All configuration files present',
  };
}

async function checkVendorPackages(artkE2ePath: string): Promise<DiagnosticResult> {
  const vendorCore = path.join(artkE2ePath, 'vendor', 'artk-core');
  const vendorAutogen = path.join(artkE2ePath, 'vendor', 'artk-core-autogen');

  const issues: string[] = [];

  if (!fs.existsSync(path.join(vendorCore, 'package.json'))) {
    issues.push('@artk/core');
  }

  if (!fs.existsSync(path.join(vendorAutogen, 'package.json'))) {
    issues.push('@artk/core-autogen');
  }

  if (issues.length > 0) {
    return {
      name: 'Vendor Packages',
      status: 'error',
      message: `Missing: ${issues.join(', ')}`,
    };
  }

  return {
    name: 'Vendor Packages',
    status: 'ok',
    message: 'Vendor packages installed',
  };
}

async function checkTypeScript(artkE2ePath: string): Promise<DiagnosticResult> {
  if (!fs.existsSync(path.join(artkE2ePath, 'node_modules'))) {
    return {
      name: 'TypeScript',
      status: 'warn',
      message: 'Cannot check - node_modules missing',
    };
  }

  try {
    execSync('npx tsc --noEmit', { cwd: artkE2ePath, stdio: 'pipe' });
    return {
      name: 'TypeScript',
      status: 'ok',
      message: 'No type errors',
    };
  } catch (error) {
    return {
      name: 'TypeScript',
      status: 'warn',
      message: 'Type errors found (run "npm run typecheck" for details)',
    };
  }
}
