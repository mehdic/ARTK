/**
 * Browser resolver
 *
 * Handles browser detection and installation for Playwright tests.
 * Implements a fallback chain: release cache → bundled install → system browsers
 */

import { execSync, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { getOsArch } from './environment.js';
import { Logger } from './logger.js';

export interface BrowserInfo {
  channel: 'bundled' | 'msedge' | 'chrome' | 'chrome-beta' | 'chrome-dev';
  version: string | null;
  path: string | null;
  strategy: 'release-cache' | 'bundled-install' | 'system' | 'auto';
}

export interface BrowserResolverOptions {
  artkE2ePath: string;
  browsersCachePath: string;
  logger: Logger;
  skipInstall?: boolean;
}

/**
 * Resolve and configure browsers for Playwright
 */
export async function resolveBrowser(targetPath: string, logger?: Logger): Promise<BrowserInfo> {
  const log = logger || new Logger();
  const artkE2ePath = path.join(targetPath, 'artk-e2e');
  const browsersCachePath = path.join(targetPath, '.artk', 'browsers');

  // Ensure browsers cache directory exists
  fs.mkdirSync(browsersCachePath, { recursive: true });

  // Set environment for Playwright
  process.env.PLAYWRIGHT_BROWSERS_PATH = browsersCachePath;

  // Try release cache first (fastest)
  log.debug('Attempting to download pre-built browsers from release cache...');
  const releaseCacheResult = await tryReleaseCacheBrowsers(artkE2ePath, browsersCachePath, log);
  if (releaseCacheResult) {
    return releaseCacheResult;
  }

  // Try bundled Playwright install
  log.debug('Attempting bundled Playwright browser install...');
  const bundledResult = await tryBundledInstall(artkE2ePath, browsersCachePath, log);
  if (bundledResult) {
    return bundledResult;
  }

  // Fall back to system browsers
  log.debug('Detecting system browsers...');
  const systemResult = await detectSystemBrowser(log);
  if (systemResult.channel !== 'bundled') {
    return systemResult;
  }

  // No browsers available
  log.warning('No browsers available. Tests may not run until browsers are installed.');
  return {
    channel: 'bundled',
    version: null,
    path: null,
    strategy: 'auto',
  };
}

/**
 * Try to download pre-built browsers from GitHub release
 */
async function tryReleaseCacheBrowsers(
  artkE2ePath: string,
  browsersCachePath: string,
  logger: Logger
): Promise<BrowserInfo | null> {
  // Get Chromium revision from Playwright
  const browsersJsonPath = path.join(artkE2ePath, 'node_modules', 'playwright-core', 'browsers.json');
  if (!fs.existsSync(browsersJsonPath)) {
    logger.debug('browsers.json not found, skipping release cache');
    return null;
  }

  try {
    const browsersJson = JSON.parse(fs.readFileSync(browsersJsonPath, 'utf8'));
    const chromium = browsersJson.browsers?.find((b: any) => b.name === 'chromium');
    if (!chromium?.revision) {
      logger.debug('Chromium revision not found in browsers.json');
      return null;
    }

    const { os, arch } = getOsArch();
    if (os === 'unknown' || arch === 'unknown') {
      logger.debug(`Unsupported OS/arch: ${os}/${arch}`);
      return null;
    }

    // Check if already cached
    const cachedPath = path.join(browsersCachePath, `chromium-${chromium.revision}`);
    if (fs.existsSync(cachedPath)) {
      logger.debug(`Browsers already cached: ${cachedPath}`);
      return {
        channel: 'bundled',
        version: chromium.revision,
        path: cachedPath,
        strategy: 'release-cache',
      };
    }

    // Get Playwright version for tag
    const playwrightPkgPath = path.join(artkE2ePath, 'node_modules', '@playwright', 'test', 'package.json');
    let playwrightVersion = '1.57.0';
    if (fs.existsSync(playwrightPkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(playwrightPkgPath, 'utf8'));
      playwrightVersion = pkg.version;
    }

    // Try to download from release
    const repo = process.env.ARTK_PLAYWRIGHT_BROWSERS_REPO;
    if (!repo) {
      logger.debug('ARTK_PLAYWRIGHT_BROWSERS_REPO not set, skipping release cache');
      return null;
    }

    const tag = process.env.ARTK_PLAYWRIGHT_BROWSERS_TAG || `playwright-browsers-${playwrightVersion}`;
    const asset = `chromium-${chromium.revision}-${os}-${arch}.zip`;
    const url = `https://github.com/${repo}/releases/download/${tag}/${asset}`;

    logger.debug(`Downloading from: ${url}`);
    // Download implementation would go here
    // For now, return null to fall back to bundled install
    return null;
  } catch (error) {
    logger.debug(`Release cache check failed: ${error}`);
    return null;
  }
}

/**
 * Try to install bundled Playwright browsers
 */
async function tryBundledInstall(
  artkE2ePath: string,
  browsersCachePath: string,
  logger: Logger
): Promise<BrowserInfo | null> {
  return new Promise((resolve) => {
    logger.startSpinner('Installing Playwright browsers...');

    const child = spawn('npx', ['playwright', 'install', 'chromium'], {
      cwd: artkE2ePath,
      env: {
        ...process.env,
        PLAYWRIGHT_BROWSERS_PATH: browsersCachePath,
      },
      shell: true,
      stdio: 'pipe',
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        logger.succeedSpinner('Playwright browsers installed');
        resolve({
          channel: 'bundled',
          version: null,
          path: browsersCachePath,
          strategy: 'bundled-install',
        });
      } else {
        logger.failSpinner('Failed to install Playwright browsers');
        logger.debug(`Exit code: ${code}`);
        logger.debug(`stderr: ${stderr}`);
        resolve(null);
      }
    });

    child.on('error', (error) => {
      logger.failSpinner('Failed to install Playwright browsers');
      logger.debug(`Error: ${error.message}`);
      resolve(null);
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      child.kill();
      logger.failSpinner('Browser installation timed out');
      resolve(null);
    }, 300000);
  });
}

/**
 * Detect system browsers (Edge, Chrome)
 */
async function detectSystemBrowser(logger: Logger): Promise<BrowserInfo> {
  // Try Microsoft Edge first
  const edgeInfo = await tryDetectBrowser('msedge', logger);
  if (edgeInfo) {
    logger.success(`Detected Microsoft Edge: ${edgeInfo.version || 'unknown version'}`);
    return edgeInfo;
  }

  // Try Google Chrome
  const chromeInfo = await tryDetectBrowser('chrome', logger);
  if (chromeInfo) {
    logger.success(`Detected Google Chrome: ${chromeInfo.version || 'unknown version'}`);
    return chromeInfo;
  }

  return {
    channel: 'bundled',
    version: null,
    path: null,
    strategy: 'auto',
  };
}

/**
 * Try to detect a specific browser
 */
async function tryDetectBrowser(
  browser: 'msedge' | 'chrome',
  logger: Logger
): Promise<BrowserInfo | null> {
  const paths = getBrowserPaths(browser);

  for (const browserPath of paths) {
    if (fs.existsSync(browserPath)) {
      const version = await getBrowserVersion(browserPath);
      return {
        channel: browser,
        version,
        path: browserPath,
        strategy: 'system',
      };
    }
  }

  // Try command-line detection
  const commands =
    browser === 'msedge'
      ? ['microsoft-edge', 'microsoft-edge-stable']
      : ['google-chrome', 'google-chrome-stable'];

  for (const cmd of commands) {
    try {
      const output = execSync(`${cmd} --version`, { encoding: 'utf8', stdio: 'pipe', timeout: 5000 });
      const versionMatch = output.match(/(\d+\.\d+\.\d+\.\d+)/);
      return {
        channel: browser,
        version: versionMatch ? versionMatch[1] : null,
        path: cmd,
        strategy: 'system',
      };
    } catch {
      // Try next command
    }
  }

  return null;
}

/**
 * Get browser version from executable path
 */
async function getBrowserVersion(browserPath: string): Promise<string | null> {
  try {
    const output = execSync(`"${browserPath}" --version`, { encoding: 'utf8', stdio: 'pipe', timeout: 5000 });
    const versionMatch = output.match(/(\d+\.\d+\.\d+\.\d+)/);
    return versionMatch ? versionMatch[1] : null;
  } catch {
    return null;
  }
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
      paths.push('/usr/bin/microsoft-edge', '/usr/bin/microsoft-edge-stable', '/snap/bin/microsoft-edge');
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
 * Update artk.config.yml with browser configuration
 */
export function updateArtkConfigBrowser(configPath: string, browserInfo: BrowserInfo): void {
  if (!fs.existsSync(configPath)) {
    return;
  }

  let content = fs.readFileSync(configPath, 'utf8');

  // Check if browsers section exists
  if (!/^\s*browsers\s*:/m.test(content)) {
    // Add browsers section
    content += `
browsers:
  enabled:
    - chromium
  channel: ${browserInfo.channel}
  strategy: ${browserInfo.strategy}
  viewport:
    width: 1280
    height: 720
  headless: true
`;
  } else {
    // Update channel in existing section
    content = content.replace(
      /^(\s*channel\s*:\s*).*$/m,
      `$1${browserInfo.channel}`
    );
    content = content.replace(
      /^(\s*strategy\s*:\s*).*$/m,
      `$1${browserInfo.strategy}`
    );
  }

  fs.writeFileSync(configPath, content);
}
