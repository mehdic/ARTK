/**
 * CommonJS Template: Authentication Login Module
 * Generated for: {{projectName}}
 * Generated at: {{generatedAt}}
 * Module System: CommonJS
 */
import * as path from 'path';
import * as fs from 'fs';
import type { Page } from '@playwright/test';
import type { AuthConfig } from '{{artkCorePath}}/types/auth';

/**
 * Get the directory path (CommonJS-compatible)
 */
function getDirname(): string {
  return __dirname;
}

/**
 * Load authentication configuration
 */
export async function loadAuthConfig(configPath?: string): Promise<AuthConfig> {
  const projectRoot = '{{projectRoot}}';
  const configFile = configPath || path.join(projectRoot, '{{configPath}}/auth.yml');

  if (!fs.existsSync(configFile)) {
    throw new Error(`Auth config not found: ${configFile}`);
  }

  // Dynamic require for YAML parsing
  const yaml = require('yaml');
  const content = fs.readFileSync(configFile, 'utf8');
  return yaml.parse(content) as AuthConfig;
}

/**
 * Perform login action
 */
export async function login(page: Page, username: string, password: string): Promise<void> {
  // Navigate to login page
  await page.goto('/login');

  // Fill credentials
  await page.fill('[data-testid="username"]', username);
  await page.fill('[data-testid="password"]', password);

  // Submit
  await page.click('[data-testid="login-button"]');

  // Wait for navigation
  await page.waitForURL('**/dashboard');
}

/**
 * Save authentication state
 */
export async function saveAuthState(page: Page, statePath?: string): Promise<void> {
  const fullPath = statePath || path.join('{{projectRoot}}', '{{authStatePath}}');
  await page.context().storageState({ path: fullPath });
}
