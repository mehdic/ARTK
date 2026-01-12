import { exec } from 'node:child_process';
import { promisify } from 'node:util';

import type { BrowserChannel } from '../config/types.js';

const execAsync = promisify(exec);

export interface BrowserValidationResult {
  available: boolean;
  version?: string;
  path?: string;
  reason?: string;
}

function parseCommandPath(command: string): string {
  const trimmed = command.replace(/\s+--version$/, '').trim();
  return trimmed.replace(/^"(.*)"$/, '$1');
}

async function checkCommands(
  commands: string[]
): Promise<Omit<BrowserValidationResult, 'available'>> {
  for (const cmd of commands) {
    try {
      const { stdout } = await execAsync(cmd, { timeout: 5000 });
      const version = stdout.match(/(\d+\.\d+\.\d+\.\d+)/)?.[1];
      return {
        version,
        path: parseCommandPath(cmd),
      };
    } catch {
      continue;
    }
  }

  return {};
}

/**
 * Validate that the configured browser channel is available on the system.
 */
export async function validateBrowserChannel(
  channel?: BrowserChannel
): Promise<BrowserValidationResult> {
  if (!channel || channel === 'bundled') {
    return { available: true };
  }

  try {
    if (channel === 'msedge') {
      const edgeCommands = [
        'microsoft-edge --version',
        'microsoft-edge-stable --version',
        '"/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" --version',
        '"C:\\\\Program Files (x86)\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe" --version',
        '"C:\\\\Program Files\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe" --version',
        '"%LOCALAPPDATA%\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe" --version',
        '"%USERPROFILE%\\\\AppData\\\\Local\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe" --version',
      ];

      const result = await checkCommands(edgeCommands);
      if (result.path) {
        return { available: true, ...result };
      }

      return {
        available: false,
        reason: `Browser "${channel}" not found. Install from https://microsoft.com/edge`,
      };
    }

    if (channel === 'chrome' || channel === 'chrome-beta' || channel === 'chrome-dev') {
      const chromeCommands = [
        'google-chrome --version',
        'google-chrome-stable --version',
        'google-chrome-beta --version',
        'google-chrome-unstable --version',
        '"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --version',
        'chromium --version',
        '"C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe" --version',
        '"C:\\\\Program Files (x86)\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe" --version',
        '"%LOCALAPPDATA%\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe" --version',
        '"%USERPROFILE%\\\\AppData\\\\Local\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe" --version',
      ];

      const result = await checkCommands(chromeCommands);
      if (result.path) {
        return { available: true, ...result };
      }

      return {
        available: false,
        reason: `Browser "${channel}" not found. Install from https://google.com/chrome`,
      };
    }
  } catch (error) {
    return {
      available: false,
      reason: `Browser validation error: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }

  return { available: true };
}
