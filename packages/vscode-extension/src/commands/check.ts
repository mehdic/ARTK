/**
 * ARTK Check Command - Check prerequisites
 *
 * Native implementation that doesn't require npm registry access.
 * Detects Node.js, npm, and available browsers locally.
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import { execSync, spawn } from 'child_process';
import type { CheckPrerequisitesResult } from '../cli/types';

const MIN_NODE_VERSION = 14;

/**
 * Detect Node.js version
 */
function detectNode(): { found: boolean; version?: string; meetsMinimum: boolean } {
  try {
    const result = execSync('node --version', { encoding: 'utf-8', timeout: 5000 }).trim();
    const version = result.replace(/^v/, '');
    const major = parseInt(version.split('.')[0], 10);
    return {
      found: true,
      version,
      meetsMinimum: major >= MIN_NODE_VERSION,
    };
  } catch {
    return { found: false, meetsMinimum: false };
  }
}

/**
 * Detect npm version
 */
function detectNpm(): { found: boolean; version?: string } {
  try {
    const result = execSync('npm --version', { encoding: 'utf-8', timeout: 5000 }).trim();
    return { found: true, version: result };
  } catch {
    return { found: false };
  }
}

/**
 * Test if a browser executable exists and runs
 */
async function testBrowser(browserPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    let resolved = false;

    const proc = spawn(browserPath, ['--version'], {
      shell: false,
      windowsHide: true,
    });

    const done = (result: boolean) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);
      resolve(result);
    };

    proc.on('close', (code) => {
      done(code === 0);
    });

    proc.on('error', () => {
      done(false);
    });

    const timer = setTimeout(() => {
      proc.kill();
      done(false);
    }, 5000);
  });
}

/**
 * Detect available browsers
 */
async function detectBrowsers(): Promise<{ chromium?: boolean; msedge?: boolean; chrome?: boolean }> {
  const isWindows = process.platform === 'win32';
  const isMac = process.platform === 'darwin';

  const result: { chromium?: boolean; msedge?: boolean; chrome?: boolean } = {};

  // Check for Edge
  const edgePaths = isWindows
    ? [
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      ]
    : isMac
      ? ['/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge']
      : ['microsoft-edge', 'microsoft-edge-stable'];

  for (const edgePath of edgePaths) {
    if (isWindows && !fs.existsSync(edgePath)) continue;
    if (await testBrowser(edgePath)) {
      result.msedge = true;
      break;
    }
  }

  // Check for Chrome
  const chromePaths = isWindows
    ? [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      ]
    : isMac
      ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
      : ['google-chrome', 'google-chrome-stable'];

  for (const chromePath of chromePaths) {
    if (isWindows && !fs.existsSync(chromePath)) continue;
    if (await testBrowser(chromePath)) {
      result.chrome = true;
      break;
    }
  }

  // Check for Playwright's bundled Chromium
  // This is in ~/.cache/ms-playwright on Linux/Mac or %LOCALAPPDATA%\ms-playwright on Windows
  const playwrightCache = isWindows
    ? process.env.LOCALAPPDATA
      ? `${process.env.LOCALAPPDATA}\\ms-playwright`
      : undefined
    : isMac
      ? `${process.env.HOME}/Library/Caches/ms-playwright`
      : `${process.env.HOME}/.cache/ms-playwright`;

  if (playwrightCache && fs.existsSync(playwrightCache)) {
    // Check if chromium directory exists
    try {
      const entries = fs.readdirSync(playwrightCache);
      if (entries.some((e) => e.startsWith('chromium'))) {
        result.chromium = true;
      }
    } catch {
      // Ignore errors
    }
  }

  return result;
}

/**
 * Run native prerequisites check
 */
async function checkPrerequisitesNative(): Promise<CheckPrerequisitesResult> {
  const node = detectNode();
  const npm = detectNpm();
  const browsers = await detectBrowsers();

  const issues: string[] = [];

  if (!node.found) {
    issues.push('Node.js not found. Please install Node.js 14 or later.');
  } else if (!node.meetsMinimum) {
    issues.push(`Node.js ${node.version} found, but 14+ is required.`);
  }

  if (!npm.found) {
    issues.push('npm not found. Please install npm.');
  }

  if (!browsers.chromium && !browsers.msedge && !browsers.chrome) {
    issues.push('No browsers detected. Install Edge, Chrome, or run "npx playwright install chromium".');
  }

  const passed = node.found && node.meetsMinimum && npm.found && (browsers.chromium || browsers.msedge || browsers.chrome);

  return {
    passed,
    node,
    npm,
    browsers,
    issues,
  };
}

/**
 * Run the check command
 */
export async function runCheck(): Promise<void> {
  const prereqs = await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Checking prerequisites...',
      cancellable: false,
    },
    async () => {
      return await checkPrerequisitesNative();
    }
  );

  // Build result message
  const lines: string[] = ['ARTK Prerequisites Check', ''];

  // Node.js
  if (prereqs.node.found) {
    const status = prereqs.node.meetsMinimum ? '✓' : '⚠';
    lines.push(`${status} Node.js: ${prereqs.node.version}`);
    if (!prereqs.node.meetsMinimum) {
      lines.push('   Node.js 14+ required');
    }
  } else {
    lines.push('✗ Node.js: Not found');
  }

  // npm
  if (prereqs.npm.found) {
    lines.push(`✓ npm: ${prereqs.npm.version}`);
  } else {
    lines.push('✗ npm: Not found');
  }

  // Browsers
  lines.push('');
  lines.push('Browsers:');
  if (prereqs.browsers.chromium) {
    lines.push('  ✓ Chromium (bundled)');
  }
  if (prereqs.browsers.msedge) {
    lines.push('  ✓ Microsoft Edge');
  }
  if (prereqs.browsers.chrome) {
    lines.push('  ✓ Google Chrome');
  }
  if (!prereqs.browsers.chromium && !prereqs.browsers.msedge && !prereqs.browsers.chrome) {
    lines.push('  ⚠ No browsers detected');
  }

  // Issues
  if (prereqs.issues.length > 0) {
    lines.push('');
    lines.push('Issues:');
    for (const issue of prereqs.issues) {
      lines.push(`  • ${issue}`);
    }
  }

  // Show in output channel
  const outputChannel = vscode.window.createOutputChannel('ARTK');
  outputChannel.clear();
  outputChannel.appendLine(lines.join('\n'));
  outputChannel.show();

  // Show notification
  if (prereqs.passed) {
    vscode.window.showInformationMessage('All prerequisites met!');
  } else {
    vscode.window.showWarningMessage(
      'Some prerequisites not met. See Output panel for details.',
      'Show Output'
    ).then((selection) => {
      if (selection === 'Show Output') {
        outputChannel.show();
      }
    });
  }
}
