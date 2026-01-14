/**
 * Template Processor - Generates foundation modules from templates
 *
 * This module reads template files from the bundled @artk/core assets
 * and generates foundation modules for the target project.
 */

import * as fs from 'fs';
import * as path from 'path';
import { Logger } from './logger.js';

export interface TemplateContext {
  projectName: string;
  projectRoot: string;
  artkRoot: string;
  artkCorePath: string;
  configPath: string;
  authStatePath: string;
  baseURL: string;
  generatedAt: string;
  moduleSystem: 'esm' | 'commonjs';
}

export interface FoundationGenerationResult {
  success: boolean;
  filesGenerated: string[];
  errors: Array<{ file: string; error: string }>;
  warnings: string[];
}

/**
 * Process a template string by replacing placeholders
 */
export function processTemplate(template: string, context: TemplateContext): string {
  let result = template;

  // Replace all {{placeholder}} occurrences
  for (const [key, value] of Object.entries(context)) {
    const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(placeholder, String(value));
  }

  return result;
}

/**
 * Generate foundation modules from templates
 */
export async function generateFoundationModules(
  artkE2ePath: string,
  assetsDir: string,
  context: TemplateContext,
  logger: Logger
): Promise<FoundationGenerationResult> {
  const result: FoundationGenerationResult = {
    success: true,
    filesGenerated: [],
    errors: [],
    warnings: [],
  };

  // Define foundation modules to generate
  const modules = [
    { template: 'auth/login.ts', target: 'src/modules/foundation/auth/login.ts' },
    { template: 'config/env.ts', target: 'src/modules/foundation/config/env.ts' },
    { template: 'navigation/nav.ts', target: 'src/modules/foundation/navigation/nav.ts' },
  ];

  // Get template variant directory
  const variant = context.moduleSystem === 'esm' ? 'esm' : 'commonjs';
  const templatesDir = path.join(assetsDir, 'core', 'templates', variant);

  // Check if templates exist
  if (!fs.existsSync(templatesDir)) {
    // Fall back to generating basic stubs
    logger.warning(`Template directory not found: ${templatesDir}`);
    logger.debug('Generating basic foundation stubs instead');
    result.warnings.push('Templates not found, generated basic stubs');

    await generateBasicStubs(artkE2ePath, context, logger);
    return result;
  }

  // Generate each module
  for (const module of modules) {
    const templatePath = path.join(templatesDir, module.template);
    const targetPath = path.join(artkE2ePath, module.target);

    try {
      if (!fs.existsSync(templatePath)) {
        logger.debug(`Template not found: ${templatePath}`);
        result.warnings.push(`Template not found: ${module.template}`);
        continue;
      }

      // Read template
      const templateContent = fs.readFileSync(templatePath, 'utf8');

      // Process template
      const processedContent = processTemplate(templateContent, context);

      // Ensure target directory exists
      const targetDir = path.dirname(targetPath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // Write generated file
      fs.writeFileSync(targetPath, processedContent, 'utf8');

      result.filesGenerated.push(targetPath);
      logger.debug(`Generated: ${module.target}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push({ file: module.target, error: errorMessage });
      result.success = false;
      logger.debug(`Failed to generate ${module.target}: ${errorMessage}`);
    }
  }

  // Generate index files
  await generateIndexFiles(artkE2ePath, context, logger);

  return result;
}

/**
 * Generate basic foundation stubs when templates are not available
 */
async function generateBasicStubs(
  artkE2ePath: string,
  context: TemplateContext,
  logger: Logger
): Promise<void> {
  const foundationPath = path.join(artkE2ePath, 'src', 'modules', 'foundation');

  // Auth login stub
  const loginStub = context.moduleSystem === 'esm'
    ? getEsmLoginStub(context)
    : getCjsLoginStub(context);
  await writeFile(path.join(foundationPath, 'auth', 'login.ts'), loginStub);

  // Config env stub
  const envStub = context.moduleSystem === 'esm'
    ? getEsmEnvStub(context)
    : getCjsEnvStub(context);
  await writeFile(path.join(foundationPath, 'config', 'env.ts'), envStub);

  // Navigation stub
  const navStub = context.moduleSystem === 'esm'
    ? getEsmNavStub(context)
    : getCjsNavStub(context);
  await writeFile(path.join(foundationPath, 'navigation', 'nav.ts'), navStub);

  logger.debug('Generated basic foundation stubs');
}

/**
 * Generate index files for foundation modules
 */
async function generateIndexFiles(
  artkE2ePath: string,
  context: TemplateContext,
  logger: Logger
): Promise<void> {
  const foundationPath = path.join(artkE2ePath, 'src', 'modules', 'foundation');

  // Main foundation index
  await writeFile(
    path.join(foundationPath, 'index.ts'),
    `/**
 * Foundation Modules - Core testing infrastructure
 * Generated for: ${context.projectName}
 * Generated at: ${context.generatedAt}
 *
 * These modules provide:
 * - Auth: Login flows and storage state management
 * - Config: Environment configuration loading
 * - Navigation: Route helpers and URL builders
 */

export * from './auth/login';
export * from './config/env';
export * from './navigation/nav';
`
  );

  // Auth index
  await writeFile(
    path.join(foundationPath, 'auth', 'index.ts'),
    `/**
 * Authentication Module
 * Generated for: ${context.projectName}
 */
export * from './login';
`
  );

  // Config index
  await writeFile(
    path.join(foundationPath, 'config', 'index.ts'),
    `/**
 * Configuration Module
 * Generated for: ${context.projectName}
 */
export * from './env';
`
  );

  // Navigation index
  await writeFile(
    path.join(foundationPath, 'navigation', 'index.ts'),
    `/**
 * Navigation Module
 * Generated for: ${context.projectName}
 */
export * from './nav';
`
  );

  logger.debug('Generated foundation index files');
}

/**
 * Helper to write a file, creating directories as needed
 */
async function writeFile(filePath: string, content: string): Promise<void> {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content, 'utf8');
}

// ESM Stubs

function getEsmLoginStub(context: TemplateContext): string {
  return `/**
 * ESM Authentication Login Module
 * Generated for: ${context.projectName}
 * Generated at: ${context.generatedAt}
 */
import { fileURLToPath } from 'url';
import * as path from 'path';
import * as fs from 'fs';
import type { Page } from '@playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Perform login action
 */
export async function login(page: Page, username: string, password: string): Promise<void> {
  // Navigate to login page
  await page.goto('/login');

  // Fill credentials - update selectors for your app
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
  const fullPath = statePath || path.join('${context.artkRoot}', '${context.authStatePath}', 'user.json');
  await page.context().storageState({ path: fullPath });
}
`;
}

function getCjsLoginStub(context: TemplateContext): string {
  return `/**
 * CommonJS Authentication Login Module
 * Generated for: ${context.projectName}
 * Generated at: ${context.generatedAt}
 */
import * as path from 'path';
import * as fs from 'fs';
import type { Page } from '@playwright/test';

/**
 * Perform login action
 */
export async function login(page: Page, username: string, password: string): Promise<void> {
  // Navigate to login page
  await page.goto('/login');

  // Fill credentials - update selectors for your app
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
  const fullPath = statePath || path.join('${context.artkRoot}', '${context.authStatePath}', 'user.json');
  await page.context().storageState({ path: fullPath });
}
`;
}

function getEsmEnvStub(context: TemplateContext): string {
  return `/**
 * ESM Environment Configuration Module
 * Generated for: ${context.projectName}
 * Generated at: ${context.generatedAt}
 */
import { fileURLToPath } from 'url';
import * as path from 'path';
import * as fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface EnvironmentConfig {
  name: string;
  baseURL: string;
  timeout?: number;
}

/**
 * Get base URL for current environment
 */
export function getBaseURL(env?: string): string {
  const targetEnv = env || process.env.ARTK_ENV || 'local';

  // Try to load from artk.config.yml
  const configPath = path.join(__dirname, '..', '..', '..', 'artk.config.yml');
  if (fs.existsSync(configPath)) {
    // Dynamic import for ESM
    const yaml = await import('yaml');
    const config = yaml.parse(fs.readFileSync(configPath, 'utf8'));
    return config.environments?.[targetEnv]?.baseUrl || '${context.baseURL}';
  }

  // Fallback defaults
  const defaults: Record<string, string> = {
    local: '${context.baseURL}',
    intg: 'https://intg.example.com',
    ctlq: 'https://ctlq.example.com',
    prod: 'https://example.com',
  };

  return defaults[targetEnv] || defaults.local;
}

export function getCurrentEnv(): string {
  return process.env.ARTK_ENV || 'local';
}
`;
}

function getCjsEnvStub(context: TemplateContext): string {
  return `/**
 * CommonJS Environment Configuration Module
 * Generated for: ${context.projectName}
 * Generated at: ${context.generatedAt}
 */
import * as path from 'path';
import * as fs from 'fs';

export interface EnvironmentConfig {
  name: string;
  baseURL: string;
  timeout?: number;
}

/**
 * Get base URL for current environment
 */
export function getBaseURL(env?: string): string {
  const targetEnv = env || process.env.ARTK_ENV || 'local';

  // Try to load from artk.config.yml
  const configPath = path.join(__dirname, '..', '..', '..', 'artk.config.yml');
  if (fs.existsSync(configPath)) {
    const yaml = require('yaml');
    const config = yaml.parse(fs.readFileSync(configPath, 'utf8'));
    return config.environments?.[targetEnv]?.baseUrl || '${context.baseURL}';
  }

  // Fallback defaults
  const defaults: Record<string, string> = {
    local: '${context.baseURL}',
    intg: 'https://intg.example.com',
    ctlq: 'https://ctlq.example.com',
    prod: 'https://example.com',
  };

  return defaults[targetEnv] || defaults.local;
}

export function getCurrentEnv(): string {
  return process.env.ARTK_ENV || 'local';
}
`;
}

function getEsmNavStub(context: TemplateContext): string {
  return `/**
 * ESM Navigation Module
 * Generated for: ${context.projectName}
 * Generated at: ${context.generatedAt}
 */
import { fileURLToPath } from 'url';
import * as path from 'path';
import type { Page } from '@playwright/test';
import { getBaseURL } from '../config/env';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Navigate to a route
 */
export async function navigateTo(page: Page, route: string): Promise<void> {
  const baseURL = getBaseURL();
  const fullURL = route.startsWith('/') ? \`\${baseURL}\${route}\` : \`\${baseURL}/\${route}\`;
  await page.goto(fullURL);
}

/**
 * Get current route
 */
export function getCurrentRoute(page: Page): string {
  const url = new URL(page.url());
  return url.pathname;
}

/**
 * Wait for route change
 */
export async function waitForRoute(page: Page, route: string): Promise<void> {
  await page.waitForURL(\`**\${route}\`);
}
`;
}

function getCjsNavStub(context: TemplateContext): string {
  return `/**
 * CommonJS Navigation Module
 * Generated for: ${context.projectName}
 * Generated at: ${context.generatedAt}
 */
import * as path from 'path';
import type { Page } from '@playwright/test';
import { getBaseURL } from '../config/env';

/**
 * Navigate to a route
 */
export async function navigateTo(page: Page, route: string): Promise<void> {
  const baseURL = getBaseURL();
  const fullURL = route.startsWith('/') ? \`\${baseURL}\${route}\` : \`\${baseURL}/\${route}\`;
  await page.goto(fullURL);
}

/**
 * Get current route
 */
export function getCurrentRoute(page: Page): string {
  const url = new URL(page.url());
  return url.pathname;
}

/**
 * Wait for route change
 */
export async function waitForRoute(page: Page, route: string): Promise<void> {
  await page.waitForURL(\`**\${route}\`);
}
`;
}
