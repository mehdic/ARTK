/**
 * Playwright Configuration for ARTK E2E Tests
 *
 * This is the SINGLE SOURCE OF TRUTH for all bootstrap scripts.
 * - scripts/bootstrap.ps1 reads this file
 * - scripts/bootstrap.sh reads this file
 * - packages/cli bundles this at build time
 *
 * DO NOT create inline templates in bootstrap scripts.
 * Edit THIS file to change the generated playwright.config.ts.
 */
import { defineConfig, devices } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Load ARTK configuration from artk.config.yml
 * Uses inline loading to avoid ESM/CommonJS resolution issues with vendored packages.
 */
function loadArtkConfig(): Record<string, any> {
  const configPath = path.join(__dirname, 'artk.config.yml');
  if (!fs.existsSync(configPath)) {
    console.warn(`[ARTK] Config not found: ${configPath}, using defaults`);
    return { environments: { local: { baseUrl: 'http://localhost:3000' } } };
  }

  try {
    const yaml = require('yaml');
    return yaml.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (e: any) {
    console.error(`[ARTK] Failed to parse artk.config.yml: ${e.message}`);
    console.error('[ARTK] Using default configuration');
    return { environments: { local: { baseUrl: 'http://localhost:3000' } } };
  }
}

/**
 * Resolve environment variable placeholders in config values.
 * Supports: ${VAR_NAME} and ${VAR_NAME:-default}
 *
 * Collects missing variables and logs a single summary warning.
 */
const _missingEnvVars: string[] = [];

function resolveEnvVars(value: string): string {
  if (typeof value !== 'string') return String(value);
  return value.replace(
    /\$\{([A-Z_][A-Z0-9_]*)(:-([^}]*))?\}/gi,
    (match, varName, _hasDefault, defaultValue) => {
      const envValue = process.env[varName];
      if (envValue !== undefined && envValue !== '') {
        return envValue;
      }
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      _missingEnvVars.push(varName);
      return '';
    }
  );
}

// Load and resolve configuration
const artkConfig = loadArtkConfig();
const env = process.env.ARTK_ENV || 'local';
const rawBaseUrl = artkConfig.environments?.[env]?.baseUrl || 'http://localhost:3000';
const baseURL = resolveEnvVars(rawBaseUrl);
const browserChannel = artkConfig.browsers?.channel;

// Log summary of missing env vars (deduplicated)
if (_missingEnvVars.length > 0) {
  const unique = [...new Set(_missingEnvVars)];
  console.warn(`[ARTK] Missing env vars (no defaults): ${unique.join(', ')}`);
}

// Build browser use config with optional channel
const browserUse: Record<string, any> = { ...devices['Desktop Chrome'] };
if (browserChannel && browserChannel !== 'bundled') {
  browserUse.channel = browserChannel;
}

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }]],
  timeout: artkConfig.settings?.timeout || 30000,

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    // Auth setup project - runs first to create storage states
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    // Main browser project with auth dependency
    {
      name: 'chromium',
      use: browserUse,
      dependencies: ['setup'],
    },
    // Validation project - no auth needed, includes baseURL
    {
      name: 'validation',
      testMatch: /foundation\.validation\.spec\.ts/,
      use: { ...browserUse, baseURL },
    },
  ],
});
