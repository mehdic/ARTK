/**
 * Browser resolver
 *
 * Handles browser detection and installation for Playwright tests.
 * Implements a fallback chain: release cache → bundled install → system browsers
 */

import { execSync, spawn, SpawnOptions } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as crypto from 'crypto';
import { getOsArch, isCI } from './environment.js';
import { Logger } from './logger.js';

export type BrowserChannel = 'bundled' | 'msedge' | 'chrome' | 'chrome-beta' | 'chrome-dev';
export type BrowserStrategy = 'auto' | 'bundled-only' | 'system-only' | 'prefer-system' | 'prefer-bundled';

export interface BrowserInfo {
  channel: BrowserChannel;
  version: string | null;
  path: string | null;
  strategy: 'release-cache' | 'bundled-install' | 'system' | 'auto';
}

export interface BrowserResolverOptions {
  artkE2ePath: string;
  browsersCachePath: string;
  logger: Logger;
  skipInstall?: boolean;
  strategy?: BrowserStrategy;
  logsDir?: string;
}

/**
 * Resolve and configure browsers for Playwright
 */
export async function resolveBrowser(
  targetPath: string,
  logger?: Logger,
  options: { strategy?: BrowserStrategy; logsDir?: string } = {}
): Promise<BrowserInfo> {
  const log = logger || new Logger();
  const artkE2ePath = path.join(targetPath, 'artk-e2e');
  const browsersCachePath = path.join(targetPath, '.artk', 'browsers');
  const logsDir = options.logsDir || path.join(targetPath, '.artk', 'logs');

  // Ensure directories exist
  fs.mkdirSync(browsersCachePath, { recursive: true });
  fs.mkdirSync(logsDir, { recursive: true });

  // Set environment for Playwright
  process.env.PLAYWRIGHT_BROWSERS_PATH = browsersCachePath;

  // Determine effective strategy
  let strategy = options.strategy || 'auto';

  // CI environment forces bundled browsers for reproducibility
  if (isCI() && strategy !== 'system-only') {
    log.info('CI environment detected - using bundled browsers for reproducibility');
    strategy = 'bundled-only';
  }

  // Strategy-based resolution
  switch (strategy) {
    case 'bundled-only':
      return await resolveBundledOnly(artkE2ePath, browsersCachePath, logsDir, log);

    case 'system-only':
      return await resolveSystemOnly(logsDir, log);

    case 'prefer-system':
      return await resolvePreferSystem(artkE2ePath, browsersCachePath, logsDir, log);

    case 'prefer-bundled':
    case 'auto':
    default:
      return await resolveAuto(artkE2ePath, browsersCachePath, logsDir, log);
  }
}

/**
 * Strategy: bundled-only - Only use bundled browsers, fail if can't install
 */
async function resolveBundledOnly(
  artkE2ePath: string,
  browsersCachePath: string,
  logsDir: string,
  logger: Logger
): Promise<BrowserInfo> {
  // Try release cache first
  logger.debug('Strategy: bundled-only - trying release cache...');
  const releaseCacheResult = await tryReleaseCacheBrowsers(artkE2ePath, browsersCachePath, logsDir, logger);
  if (releaseCacheResult) {
    return releaseCacheResult;
  }

  // Try bundled install
  logger.debug('Release cache unavailable, trying bundled install...');
  const bundledResult = await tryBundledInstall(artkE2ePath, browsersCachePath, logsDir, logger);
  if (bundledResult) {
    return bundledResult;
  }

  // Fail - bundled-only strategy requires bundled browsers
  throw new Error(
    'Strategy is "bundled-only" but bundled browser installation failed.\n' +
    'Solutions:\n' +
    '  1. Check network connectivity\n' +
    '  2. Grant permissions for Playwright browser installation\n' +
    '  3. Set ARTK_PLAYWRIGHT_BROWSERS_REPO for release cache\n' +
    `  4. Check logs at: ${logsDir}`
  );
}

/**
 * Strategy: system-only - Only use system browser, fail if not found
 */
async function resolveSystemOnly(logsDir: string, logger: Logger): Promise<BrowserInfo> {
  logger.debug('Strategy: system-only - detecting system browsers...');
  const systemResult = await detectSystemBrowser(logsDir, logger);

  if (systemResult.channel !== 'bundled') {
    return systemResult;
  }

  // Fail - system-only strategy requires system browsers
  throw new Error(
    'Strategy is "system-only" but no system browsers found.\n' +
    'Solutions:\n' +
    '  1. Install Microsoft Edge: https://microsoft.com/edge\n' +
    '  2. Install Google Chrome: https://google.com/chrome\n' +
    '  3. Change strategy in artk.config.yml to "auto" or "prefer-bundled"\n' +
    `  4. Check logs at: ${logsDir}`
  );
}

/**
 * Strategy: prefer-system - Try system first, then bundled as fallback
 */
async function resolvePreferSystem(
  artkE2ePath: string,
  browsersCachePath: string,
  logsDir: string,
  logger: Logger
): Promise<BrowserInfo> {
  logger.debug('Strategy: prefer-system - checking system browsers first...');

  // Try system browsers first
  const systemResult = await detectSystemBrowser(logsDir, logger);
  if (systemResult.channel !== 'bundled') {
    logger.success(`Using system browser: ${systemResult.channel}`);
    return systemResult;
  }

  // Fall back to bundled
  logger.debug('No system browsers found, falling back to bundled...');

  const releaseCacheResult = await tryReleaseCacheBrowsers(artkE2ePath, browsersCachePath, logsDir, logger);
  if (releaseCacheResult) {
    return releaseCacheResult;
  }

  const bundledResult = await tryBundledInstall(artkE2ePath, browsersCachePath, logsDir, logger);
  if (bundledResult) {
    return bundledResult;
  }

  return failWithDiagnostics(logsDir, logger);
}

/**
 * Strategy: auto/prefer-bundled - Try release cache → bundled → system
 */
async function resolveAuto(
  artkE2ePath: string,
  browsersCachePath: string,
  logsDir: string,
  logger: Logger
): Promise<BrowserInfo> {
  // Try release cache first (fastest)
  logger.debug('Attempting to download pre-built browsers from release cache...');
  const releaseCacheResult = await tryReleaseCacheBrowsers(artkE2ePath, browsersCachePath, logsDir, logger);
  if (releaseCacheResult) {
    return releaseCacheResult;
  }

  // Try bundled Playwright install
  logger.debug('Attempting bundled Playwright browser install...');
  const bundledResult = await tryBundledInstall(artkE2ePath, browsersCachePath, logsDir, logger);
  if (bundledResult) {
    return bundledResult;
  }

  // Fall back to system browsers
  logger.debug('Detecting system browsers...');
  const systemResult = await detectSystemBrowser(logsDir, logger);
  if (systemResult.channel !== 'bundled') {
    return systemResult;
  }

  return failWithDiagnostics(logsDir, logger);
}

/**
 * Fail with diagnostic information when all fallbacks fail
 */
function failWithDiagnostics(logsDir: string, logger: Logger): never {
  logger.error('ERROR: No browsers available');
  logger.error('ARTK tried:');
  logger.error('  1. Pre-built browser cache: Unavailable');
  logger.error('  2. Bundled Chromium install: Failed');
  logger.error('  3. System Microsoft Edge: Not found');
  logger.error('  4. System Google Chrome: Not found');
  logger.error('');
  logger.error('Solutions:');
  logger.error('  1. Install Microsoft Edge: https://microsoft.com/edge');
  logger.error('  2. Install Google Chrome: https://google.com/chrome');
  logger.error('  3. Set ARTK_PLAYWRIGHT_BROWSERS_REPO for release cache');
  logger.error('  4. Grant permissions for Playwright browser installation');
  logger.error(`  5. Check logs at: ${logsDir}`);

  throw new Error('No browsers available. See error messages above for solutions.');
}

/**
 * Try to download pre-built browsers from GitHub release
 */
async function tryReleaseCacheBrowsers(
  artkE2ePath: string,
  browsersCachePath: string,
  logsDir: string,
  logger: Logger
): Promise<BrowserInfo | null> {
  const logFile = path.join(logsDir, 'release-cache-download.log');
  const logLines: string[] = [`Release cache download attempt - ${new Date().toISOString()}`];

  // Get Chromium revision from Playwright
  const browsersJsonPath = path.join(artkE2ePath, 'node_modules', 'playwright-core', 'browsers.json');
  if (!fs.existsSync(browsersJsonPath)) {
    logLines.push('browsers.json not found, skipping release cache');
    writeLogFile(logFile, logLines);
    logger.debug('browsers.json not found, skipping release cache');
    return null;
  }

  try {
    const browsersJson = JSON.parse(fs.readFileSync(browsersJsonPath, 'utf8'));
    const chromium = browsersJson.browsers?.find((b: any) => b.name === 'chromium');
    if (!chromium?.revision) {
      logLines.push('Chromium revision not found in browsers.json');
      writeLogFile(logFile, logLines);
      logger.debug('Chromium revision not found in browsers.json');
      return null;
    }

    logLines.push(`Chromium revision: ${chromium.revision}`);

    const { os, arch } = getOsArch();
    if (os === 'unknown' || arch === 'unknown') {
      logLines.push(`Unsupported OS/arch: ${os}/${arch}`);
      writeLogFile(logFile, logLines);
      logger.debug(`Unsupported OS/arch: ${os}/${arch}`);
      return null;
    }

    logLines.push(`OS/arch: ${os}/${arch}`);

    // Check if already cached
    const cachedPath = path.join(browsersCachePath, `chromium-${chromium.revision}`);
    if (fs.existsSync(cachedPath)) {
      logLines.push(`Browsers already cached: ${cachedPath}`);
      writeLogFile(logFile, logLines);
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

    logLines.push(`Playwright version: ${playwrightVersion}`);

    // Try to download from release
    const repo = process.env.ARTK_PLAYWRIGHT_BROWSERS_REPO;
    if (!repo) {
      logLines.push('ARTK_PLAYWRIGHT_BROWSERS_REPO not set, skipping release cache');
      writeLogFile(logFile, logLines);
      logger.debug('ARTK_PLAYWRIGHT_BROWSERS_REPO not set, skipping release cache');
      return null;
    }

    const tag = process.env.ARTK_PLAYWRIGHT_BROWSERS_TAG || `playwright-browsers-${playwrightVersion}`;
    const asset = `chromium-${chromium.revision}-${os}-${arch}.zip`;
    const baseUrl = `https://github.com/${repo}/releases/download/${tag}`;
    const zipUrl = `${baseUrl}/${asset}`;
    const shaUrl = `${baseUrl}/${asset}.sha256`;

    logLines.push(`Repo: ${repo}`);
    logLines.push(`Tag: ${tag}`);
    logLines.push(`Asset: ${asset}`);
    logLines.push(`URL: ${zipUrl}`);

    logger.startSpinner('Downloading pre-built browsers from release cache...');

    const zipPath = path.join(browsersCachePath, asset);
    const shaPath = `${zipPath}.sha256`;

    try {
      // Download ZIP file
      logLines.push('Downloading ZIP...');
      await downloadFile(zipUrl, zipPath, 30000);
      logLines.push(`ZIP downloaded: ${fs.statSync(zipPath).size} bytes`);

      // Download SHA256 checksum
      logLines.push('Downloading SHA256...');
      await downloadFile(shaUrl, shaPath, 10000);

      // Verify checksum
      const expectedHash = fs.readFileSync(shaPath, 'utf8').split(/\s+/)[0].trim().toLowerCase();
      const actualHash = await computeSha256(zipPath);

      logLines.push(`Expected SHA256: ${expectedHash}`);
      logLines.push(`Actual SHA256: ${actualHash}`);

      if (expectedHash !== actualHash) {
        logLines.push('ERROR: SHA256 checksum mismatch!');
        writeLogFile(logFile, logLines);
        logger.failSpinner('Browser cache checksum mismatch');
        fs.unlinkSync(zipPath);
        fs.unlinkSync(shaPath);
        return null;
      }

      logLines.push('Checksum verified');

      // Extract ZIP
      logLines.push('Extracting ZIP...');
      await extractZip(zipPath, browsersCachePath);
      logLines.push(`Extracted to: ${browsersCachePath}`);

      // Clean up
      fs.unlinkSync(zipPath);
      fs.unlinkSync(shaPath);

      logLines.push('SUCCESS: Browser cache downloaded and verified');
      writeLogFile(logFile, logLines);

      logger.succeedSpinner('Pre-built browsers downloaded from release cache');

      return {
        channel: 'bundled',
        version: chromium.revision,
        path: path.join(browsersCachePath, `chromium-${chromium.revision}`),
        strategy: 'release-cache',
      };
    } catch (downloadError) {
      logLines.push(`Download failed: ${downloadError}`);
      writeLogFile(logFile, logLines);
      logger.failSpinner('Release cache download failed');

      // Clean up partial downloads
      if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
      if (fs.existsSync(shaPath)) fs.unlinkSync(shaPath);

      return null;
    }
  } catch (error) {
    logLines.push(`Release cache check failed: ${error}`);
    writeLogFile(logFile, logLines);
    logger.debug(`Release cache check failed: ${error}`);
    return null;
  }
}

/**
 * Download a file from URL to local path
 */
function downloadFile(url: string, destPath: string, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);

    const request = https.get(url, { timeout: timeoutMs }, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          file.close();
          fs.unlinkSync(destPath);
          downloadFile(redirectUrl, destPath, timeoutMs).then(resolve).catch(reject);
          return;
        }
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(destPath);
        reject(new Error(`HTTP ${response.statusCode}: ${url}`));
        return;
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    });

    request.on('error', (err) => {
      file.close();
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      reject(err);
    });

    request.on('timeout', () => {
      request.destroy();
      file.close();
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      reject(new Error(`Download timeout: ${url}`));
    });
  });
}

/**
 * Compute SHA256 hash of a file
 */
function computeSha256(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);

    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex').toLowerCase()));
    stream.on('error', reject);
  });
}

/**
 * Extract ZIP file using built-in unzip or tar commands
 */
async function extractZip(zipPath: string, destDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Try unzip first (most common), then bsdtar
    const commands = [
      { cmd: 'unzip', args: ['-q', zipPath, '-d', destDir] },
      { cmd: 'bsdtar', args: ['-xf', zipPath, '-C', destDir] },
      { cmd: 'tar', args: ['-xzf', zipPath, '-C', destDir] },
    ];

    const tryCommand = (index: number) => {
      if (index >= commands.length) {
        reject(new Error('No suitable unzip command found (tried: unzip, bsdtar, tar)'));
        return;
      }

      const { cmd, args } = commands[index];
      const child = spawn(cmd, args, { stdio: 'pipe' });

      child.on('error', () => {
        // Command not found, try next
        tryCommand(index + 1);
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          // Command failed, try next
          tryCommand(index + 1);
        }
      });
    };

    tryCommand(0);
  });
}

/**
 * Write log lines to file
 */
function writeLogFile(logPath: string, lines: string[]): void {
  try {
    fs.writeFileSync(logPath, lines.join('\n') + '\n');
  } catch {
    // Best effort logging
  }
}

/**
 * Try to install bundled Playwright browsers
 */
async function tryBundledInstall(
  artkE2ePath: string,
  browsersCachePath: string,
  logsDir: string,
  logger: Logger
): Promise<BrowserInfo | null> {
  const logFile = path.join(logsDir, 'playwright-browser-install.log');

  return new Promise((resolve) => {
    logger.startSpinner('Installing Playwright browsers...');

    const logLines: string[] = [`Playwright browser install attempt - ${new Date().toISOString()}`];
    logLines.push(`Working directory: ${artkE2ePath}`);
    logLines.push(`Browsers cache: ${browsersCachePath}`);

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
      logLines.push(`Exit code: ${code}`);
      logLines.push('--- STDOUT ---');
      logLines.push(stdout || '(empty)');
      logLines.push('--- STDERR ---');
      logLines.push(stderr || '(empty)');
      writeLogFile(logFile, logLines);

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
        logger.debug(`Details saved to: ${logFile}`);
        resolve(null);
      }
    });

    child.on('error', (error) => {
      logLines.push(`Process error: ${error.message}`);
      writeLogFile(logFile, logLines);
      logger.failSpinner('Failed to install Playwright browsers');
      logger.debug(`Error: ${error.message}`);
      resolve(null);
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      logLines.push('TIMEOUT: Installation took longer than 5 minutes');
      writeLogFile(logFile, logLines);
      child.kill();
      logger.failSpinner('Browser installation timed out');
      resolve(null);
    }, 300000);
  });
}

/**
 * Detect system browsers (Edge, Chrome)
 */
async function detectSystemBrowser(logsDir: string, logger: Logger): Promise<BrowserInfo> {
  const logFile = path.join(logsDir, 'system-browser-detect.log');
  const logLines: string[] = [`System browser detection - ${new Date().toISOString()}`];
  logLines.push(`Platform: ${process.platform}`);

  // Try Microsoft Edge first
  logLines.push('Checking Microsoft Edge...');
  const edgeInfo = await tryDetectBrowser('msedge', logLines, logger);
  if (edgeInfo) {
    logLines.push(`SUCCESS: Found Edge at ${edgeInfo.path} (${edgeInfo.version})`);
    writeLogFile(logFile, logLines);
    logger.success(`Detected Microsoft Edge: ${edgeInfo.version || 'unknown version'}`);
    return edgeInfo;
  }

  // Try Google Chrome
  logLines.push('Checking Google Chrome...');
  const chromeInfo = await tryDetectBrowser('chrome', logLines, logger);
  if (chromeInfo) {
    logLines.push(`SUCCESS: Found Chrome at ${chromeInfo.path} (${chromeInfo.version})`);
    writeLogFile(logFile, logLines);
    logger.success(`Detected Google Chrome: ${chromeInfo.version || 'unknown version'}`);
    return chromeInfo;
  }

  logLines.push('No system browsers found');
  writeLogFile(logFile, logLines);

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
  logLines: string[],
  logger: Logger
): Promise<BrowserInfo | null> {
  const paths = getBrowserPaths(browser);

  for (const browserPath of paths) {
    logLines.push(`  Checking path: ${browserPath}`);
    if (fs.existsSync(browserPath)) {
      const version = await getBrowserVersion(browserPath);
      logLines.push(`    Found! Version: ${version || 'unknown'}`);
      return {
        channel: browser,
        version,
        path: browserPath,
        strategy: 'system',
      };
    } else {
      logLines.push('    Not found');
    }
  }

  // Try command-line detection
  const commands =
    browser === 'msedge'
      ? ['microsoft-edge', 'microsoft-edge-stable']
      : ['google-chrome', 'google-chrome-stable'];

  for (const cmd of commands) {
    logLines.push(`  Checking command: ${cmd}`);
    try {
      const output = execSync(`${cmd} --version`, { encoding: 'utf8', stdio: 'pipe', timeout: 5000 });
      const versionMatch = output.match(/(\d+\.\d+\.\d+\.\d+)/);
      logLines.push(`    Found! Version: ${versionMatch ? versionMatch[1] : 'unknown'}`);
      return {
        channel: browser,
        version: versionMatch ? versionMatch[1] : null,
        path: cmd,
        strategy: 'system',
      };
    } catch (err) {
      logLines.push(`    Not found: ${err instanceof Error ? err.message : 'unknown error'}`);
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
