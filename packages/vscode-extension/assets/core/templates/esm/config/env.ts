/**
 * ESM Template: Environment Configuration Module
 * Generated for: {{projectName}}
 * Generated at: {{generatedAt}}
 * Module System: ESM
 */
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

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

export interface EnvironmentConfig {
  name: string;
  baseURL: string;
  timeout: number;
  headless: boolean;
}

export async function loadEnvConfig(envName?: string): Promise<EnvironmentConfig> {
  const projectRoot = '{{projectRoot}}';
  const configFile = path.join(projectRoot, '{{configPath}}/environments.yml');

  if (!fs.existsSync(configFile)) {
    throw new Error(`Environment config not found: ${configFile}`);
  }

  const yaml = await import('yaml');
  const content = fs.readFileSync(configFile, 'utf8');
  const allEnvs = yaml.parse(content);

  const environment = envName || process.env.TEST_ENV || 'intg';
  const config = allEnvs[environment];

  if (!config) {
    throw new Error(`Environment '${environment}' not found in config`);
  }

  return config as EnvironmentConfig;
}

export async function getBaseURL(): Promise<string> {
  const config = await loadEnvConfig();
  return config.baseURL;
}
