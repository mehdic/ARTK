/**
 * Config Validator - Validates artk.config.yml
 *
 * Uses Zod schemas to validate the ARTK configuration file format.
 */

import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';
import yaml from 'yaml';
import { Logger } from './logger.js';

/**
 * Schema for environment configuration
 */
const environmentSchema = z.object({
  baseUrl: z.string().url().or(z.string().regex(/^\$\{[^}]+\}$/)), // Allow env var placeholders
}).passthrough();

/**
 * Schema for auth configuration
 */
const authSchema = z.object({
  provider: z.enum(['oidc', 'saml', 'basic', 'custom', 'none']).default('oidc'),
  storageStateDir: z.string().default('./.auth-states'),
  roles: z.record(z.object({
    username: z.string().optional(),
    password: z.string().optional(),
  })).optional(),
}).passthrough();

/**
 * Schema for browser configuration
 */
const browserSchema = z.object({
  enabled: z.array(z.enum(['chromium', 'firefox', 'webkit'])).default(['chromium']),
  channel: z.enum(['bundled', 'msedge', 'chrome', 'chrome-beta', 'chrome-dev']).default('bundled'),
  strategy: z.enum(['auto', 'bundled-only', 'system-only', 'prefer-system', 'prefer-bundled']).default('auto'),
  viewport: z.object({
    width: z.number().min(320).max(3840).default(1280),
    height: z.number().min(240).max(2160).default(720),
  }).optional(),
  headless: z.boolean().default(true),
}).passthrough();

/**
 * Schema for settings
 */
const settingsSchema = z.object({
  parallel: z.boolean().default(true),
  retries: z.number().min(0).max(10).default(2),
  timeout: z.number().min(1000).max(300000).default(30000),
  traceOnFailure: z.boolean().default(true),
}).passthrough();

/**
 * Main ARTK config schema
 */
const artkConfigSchema = z.object({
  version: z.string().default('1.0'),
  app: z.object({
    name: z.string(),
    type: z.enum(['web', 'mobile', 'api']).default('web'),
    description: z.string().optional(),
  }),
  environments: z.record(environmentSchema),
  auth: authSchema.optional(),
  settings: settingsSchema.optional(),
  browsers: browserSchema.optional(),
}).passthrough();

export type ArtkConfig = z.infer<typeof artkConfigSchema>;

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  config?: ArtkConfig;
}

/**
 * Validate an artk.config.yml file
 */
export function validateArtkConfig(configPath: string, logger?: Logger): ValidationResult {
  const log = logger || new Logger();
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  // Check if file exists
  if (!fs.existsSync(configPath)) {
    result.valid = false;
    result.errors.push(`Config file not found: ${configPath}`);
    return result;
  }

  try {
    // Read and parse YAML
    const content = fs.readFileSync(configPath, 'utf8');
    const rawConfig = yaml.parse(content);

    if (!rawConfig || typeof rawConfig !== 'object') {
      result.valid = false;
      result.errors.push('Config file is empty or invalid YAML');
      return result;
    }

    // Validate against schema
    const parseResult = artkConfigSchema.safeParse(rawConfig);

    if (!parseResult.success) {
      result.valid = false;

      for (const error of parseResult.error.errors) {
        const path = error.path.join('.');
        result.errors.push(`${path}: ${error.message}`);
      }

      return result;
    }

    result.config = parseResult.data;

    // Additional validation checks
    const additionalWarnings = checkAdditionalValidation(parseResult.data);
    result.warnings.push(...additionalWarnings);

    log.debug(`Config validation passed for ${configPath}`);
    return result;

  } catch (error) {
    result.valid = false;
    const errorMessage = error instanceof Error ? error.message : String(error);
    result.errors.push(`Failed to parse config: ${errorMessage}`);
    return result;
  }
}

/**
 * Additional validation checks beyond schema validation
 */
function checkAdditionalValidation(config: ArtkConfig): string[] {
  const warnings: string[] = [];

  // Check if at least one environment is defined
  if (Object.keys(config.environments).length === 0) {
    warnings.push('No environments defined - at least one is recommended');
  }

  // Check for common environment names
  const commonEnvs = ['local', 'dev', 'intg', 'staging', 'prod'];
  const hasCommonEnv = commonEnvs.some(env => env in config.environments);
  if (!hasCommonEnv) {
    warnings.push(`Consider using standard environment names: ${commonEnvs.join(', ')}`);
  }

  // Check browser settings
  if (config.browsers?.strategy === 'system-only') {
    warnings.push('system-only browser strategy may fail in CI environments');
  }

  // Check auth settings
  if (config.auth?.provider === 'none' && config.auth?.roles) {
    warnings.push('Auth roles defined but provider is "none"');
  }

  // Check timeout settings
  if (config.settings?.timeout && config.settings.timeout < 5000) {
    warnings.push('Very short timeout (< 5s) may cause flaky tests');
  }

  return warnings;
}

/**
 * Validate and load config from a path
 */
export function loadAndValidateConfig(configPath: string, logger?: Logger): ArtkConfig | null {
  const result = validateArtkConfig(configPath, logger);

  if (!result.valid) {
    const log = logger || new Logger();
    log.error('Configuration validation failed:');
    for (const error of result.errors) {
      log.error(`  - ${error}`);
    }
    return null;
  }

  if (result.warnings.length > 0) {
    const log = logger || new Logger();
    log.warning('Configuration warnings:');
    for (const warning of result.warnings) {
      log.warning(`  - ${warning}`);
    }
  }

  return result.config || null;
}

/**
 * Create a default config
 */
export function createDefaultConfig(projectName: string): ArtkConfig {
  return {
    version: '1.0',
    app: {
      name: projectName,
      type: 'web',
      description: `E2E tests for ${projectName}`,
    },
    environments: {
      local: { baseUrl: 'http://localhost:3000' },
      intg: { baseUrl: 'https://intg.example.com' },
      ctlq: { baseUrl: 'https://ctlq.example.com' },
      prod: { baseUrl: 'https://example.com' },
    },
    auth: {
      provider: 'oidc',
      storageStateDir: './.auth-states',
    },
    settings: {
      parallel: true,
      retries: 2,
      timeout: 30000,
      traceOnFailure: true,
    },
    browsers: {
      enabled: ['chromium'],
      channel: 'bundled',
      strategy: 'auto',
      viewport: { width: 1280, height: 720 },
      headless: true,
    },
  };
}
