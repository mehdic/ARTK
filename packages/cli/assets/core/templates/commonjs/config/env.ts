/**
 * CommonJS Template: Environment Configuration Module
 * Generated for: {{projectName}}
 * Generated at: {{generatedAt}}
 * Module System: CommonJS
 */
import * as path from 'path';
import * as fs from 'fs';

/**
 * Get the directory path (CommonJS-compatible)
 */
function getDirname(): string {
  return __dirname;
}

/**
 * Environment configuration interface
 */
export interface EnvironmentConfig {
  name: string;
  baseURL: string;
  timeout: number;
  headless: boolean;
}

/**
 * Load environment configuration
 */
export function loadEnvConfig(envName?: string): EnvironmentConfig {
  const projectRoot = '{{projectRoot}}';
  const configFile = path.join(projectRoot, '{{configPath}}/environments.yml');

  if (!fs.existsSync(configFile)) {
    throw new Error(`Environment config not found: ${configFile}`);
  }

  const yaml = require('yaml');
  const content = fs.readFileSync(configFile, 'utf8');
  const allEnvs = yaml.parse(content);

  const environment = envName || process.env.TEST_ENV || 'intg';
  const config = allEnvs[environment];

  if (!config) {
    throw new Error(`Environment '${environment}' not found in config`);
  }

  return config as EnvironmentConfig;
}

/**
 * Get base URL for current environment
 */
export function getBaseURL(): string {
  return loadEnvConfig().baseURL;
}
