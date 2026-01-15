/**
 * ESM Template: Authentication Login Module
 * Generated for: {{projectName}}
 * Generated at: {{generatedAt}}
 * Module System: ESM
 */
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import type { Page } from '@playwright/test';
// @ts-expect-error - Template placeholder resolved at generation time
import type { AuthConfig } from '{{artkCorePath}}/types/auth.js';

/**
 * Get the directory path (ESM-compatible)
 * @internal Reserved for future use
 */
// @ts-ignore - Reserved for future use in generated code
function _getDirname(): string {
  if (typeof import.meta !== 'undefined' && 'dirname' in import.meta) {
    return import.meta.dirname as string;
  }
  return fileURLToPath(new URL('.', import.meta.url));
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

  const yaml = await import('yaml');
  const content = fs.readFileSync(configFile, 'utf8');
  return yaml.parse(content) as AuthConfig;
}

/**
 * Perform login action
 */
export async function login(page: Page, username: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.fill('[data-testid="username"]', username);
  await page.fill('[data-testid="password"]', password);
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('**/dashboard');
}

/**
 * Save authentication state
 */
export async function saveAuthState(page: Page, statePath?: string): Promise<void> {
  const fullPath = statePath || path.join('{{projectRoot}}', '{{authStatePath}}');
  await page.context().storageState({ path: fullPath });
}
