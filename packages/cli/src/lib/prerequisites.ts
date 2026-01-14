/**
 * Prerequisites checker
 *
 * Verifies that all required tools are installed and configured.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as semver from 'semver';
import { Logger } from './logger.js';

export interface PrerequisiteResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  version?: string;
  required?: string;
  message: string;
  fix?: string;
}

export interface PrerequisiteCheckResult {
  passed: boolean;
  results: PrerequisiteResult[];
}

const MIN_NODE_VERSION = '18.0.0';
const MIN_NPM_VERSION = '8.0.0';

/**
 * Check all prerequisites
 */
export async function checkPrerequisites(): Promise<PrerequisiteCheckResult> {
  const results: PrerequisiteResult[] = [];

  // Check Node.js version
  results.push(checkNodeVersion());

  // Check npm version
  results.push(checkNpmVersion());

  // Check git
  results.push(checkGit());

  // Check for browsers
  results.push(await checkBrowsers());

  const passed = results.every((r) => r.status !== 'fail');

  return { passed, results };
}

/**
 * Check Node.js version
 */
function checkNodeVersion(): PrerequisiteResult {
  const version = process.version.replace(/^v/, '');

  if (semver.gte(version, MIN_NODE_VERSION)) {
    return {
      name: 'Node.js',
      status: 'pass',
      version,
      required: `>= ${MIN_NODE_VERSION}`,
      message: `Node.js ${version} is installed`,
    };
  }

  return {
    name: 'Node.js',
    status: 'fail',
    version,
    required: `>= ${MIN_NODE_VERSION}`,
    message: `Node.js ${version} is too old`,
    fix: `Upgrade to Node.js ${MIN_NODE_VERSION} or later: https://nodejs.org`,
  };
}

/**
 * Check npm version
 */
function checkNpmVersion(): PrerequisiteResult {
  try {
    const version = execSync('npm --version', { encoding: 'utf8' }).trim();

    if (semver.gte(version, MIN_NPM_VERSION)) {
      return {
        name: 'npm',
        status: 'pass',
        version,
        required: `>= ${MIN_NPM_VERSION}`,
        message: `npm ${version} is installed`,
      };
    }

    return {
      name: 'npm',
      status: 'fail',
      version,
      required: `>= ${MIN_NPM_VERSION}`,
      message: `npm ${version} is too old`,
      fix: `Upgrade npm: npm install -g npm@latest`,
    };
  } catch {
    return {
      name: 'npm',
      status: 'fail',
      message: 'npm is not installed or not in PATH',
      fix: 'Install Node.js which includes npm: https://nodejs.org',
    };
  }
}

/**
 * Check git installation
 */
function checkGit(): PrerequisiteResult {
  try {
    const version = execSync('git --version', { encoding: 'utf8' }).trim();
    const match = version.match(/(\d+\.\d+\.\d+)/);
    const versionNum = match ? match[1] : 'unknown';

    return {
      name: 'Git',
      status: 'pass',
      version: versionNum,
      message: `Git ${versionNum} is installed`,
    };
  } catch {
    return {
      name: 'Git',
      status: 'warn',
      message: 'Git is not installed or not in PATH',
      fix: 'Install Git: https://git-scm.com',
    };
  }
}

/**
 * Check for available browsers
 */
async function checkBrowsers(): Promise<PrerequisiteResult> {
  const browsers: string[] = [];

  // Check for system browsers
  if (await checkSystemBrowser('msedge')) {
    browsers.push('Microsoft Edge');
  }
  if (await checkSystemBrowser('chrome')) {
    browsers.push('Google Chrome');
  }

  // Check for Playwright bundled browsers
  const playwrightBrowsersPath = getPlaywrightBrowsersPath();
  if (playwrightBrowsersPath && fs.existsSync(playwrightBrowsersPath)) {
    const entries = fs.readdirSync(playwrightBrowsersPath);
    if (entries.some((e) => e.startsWith('chromium-'))) {
      browsers.push('Playwright Chromium');
    }
  }

  if (browsers.length > 0) {
    return {
      name: 'Browsers',
      status: 'pass',
      message: `Available: ${browsers.join(', ')}`,
    };
  }

  return {
    name: 'Browsers',
    status: 'warn',
    message: 'No browsers detected (will be installed during init)',
    fix: 'Run: npx playwright install chromium',
  };
}

/**
 * Check if a system browser is available
 */
async function checkSystemBrowser(browser: 'msedge' | 'chrome'): Promise<boolean> {
  const paths = getBrowserPaths(browser);

  for (const browserPath of paths) {
    if (fs.existsSync(browserPath)) {
      return true;
    }
  }

  // Try running with --version
  try {
    const commands =
      browser === 'msedge'
        ? ['microsoft-edge', 'microsoft-edge-stable', 'msedge']
        : ['google-chrome', 'google-chrome-stable', 'chrome'];

    for (const cmd of commands) {
      try {
        execSync(`${cmd} --version`, { encoding: 'utf8', stdio: 'pipe' });
        return true;
      } catch {
        // Try next command
      }
    }
  } catch {
    // Not found
  }

  return false;
}

/**
 * Get browser executable paths for the current platform
 */
function getBrowserPaths(browser: 'msedge' | 'chrome'): string[] {
  const paths: string[] = [];

  if (process.platform === 'win32') {
    const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
    const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
    const localAppData = process.env['LOCALAPPDATA'] || '';

    if (browser === 'msedge') {
      paths.push(
        `${programFilesX86}\\Microsoft\\Edge\\Application\\msedge.exe`,
        `${programFiles}\\Microsoft\\Edge\\Application\\msedge.exe`,
        `${localAppData}\\Microsoft\\Edge\\Application\\msedge.exe`
      );
    } else {
      paths.push(
        `${programFiles}\\Google\\Chrome\\Application\\chrome.exe`,
        `${programFilesX86}\\Google\\Chrome\\Application\\chrome.exe`,
        `${localAppData}\\Google\\Chrome\\Application\\chrome.exe`
      );
    }
  } else if (process.platform === 'darwin') {
    if (browser === 'msedge') {
      paths.push('/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge');
    } else {
      paths.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
    }
  } else {
    // Linux
    if (browser === 'msedge') {
      paths.push(
        '/usr/bin/microsoft-edge',
        '/usr/bin/microsoft-edge-stable',
        '/snap/bin/microsoft-edge'
      );
    } else {
      paths.push(
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/snap/bin/chromium',
        '/usr/bin/chromium-browser'
      );
    }
  }

  return paths;
}

/**
 * Get Playwright browsers cache path
 */
function getPlaywrightBrowsersPath(): string | null {
  // Check environment variable first
  if (process.env.PLAYWRIGHT_BROWSERS_PATH) {
    return process.env.PLAYWRIGHT_BROWSERS_PATH;
  }

  // Default paths by platform
  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA;
    if (localAppData) {
      return `${localAppData}\\ms-playwright`;
    }
  } else if (process.platform === 'darwin') {
    const home = process.env.HOME;
    if (home) {
      return `${home}/Library/Caches/ms-playwright`;
    }
  } else {
    const home = process.env.HOME;
    if (home) {
      return `${home}/.cache/ms-playwright`;
    }
  }

  return null;
}

/**
 * Print prerequisites check results
 */
export function printPrerequisitesReport(result: PrerequisiteCheckResult, logger: Logger): void {
  logger.blank();

  for (const check of result.results) {
    const icon = check.status === 'pass' ? '✓' : check.status === 'fail' ? '✗' : '⚠';
    const color = check.status === 'pass' ? 'green' : check.status === 'fail' ? 'red' : 'yellow';

    if (check.status === 'pass') {
      logger.success(`${check.name}: ${check.message}`);
    } else if (check.status === 'fail') {
      logger.error(`${check.name}: ${check.message}`);
      if (check.fix) {
        logger.info(`  Fix: ${check.fix}`);
      }
    } else {
      logger.warning(`${check.name}: ${check.message}`);
      if (check.fix) {
        logger.info(`  Fix: ${check.fix}`);
      }
    }
  }

  logger.blank();

  if (result.passed) {
    logger.success('All prerequisites satisfied!');
  } else {
    logger.error('Some prerequisites are not met. Please fix the issues above.');
  }
}
