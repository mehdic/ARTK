/**
 * Template Generation Types
 * Defines the schema for template variables and generation context
 */

/**
 * Template context - all variables available for substitution
 */
export interface TemplateContext {
  // Project information
  projectName: string;
  projectRoot: string;
  artkRoot: string;

  // Environment detection results
  moduleSystem: 'esm' | 'commonjs' | 'unknown';
  nodeVersion: string;
  packageType?: string;
  tsConfigModule?: string;

  // Configuration
  baseURL: string;
  authProvider: 'basic' | 'oauth' | 'oidc' | 'token';

  // Paths (relative to generated file)
  artkCorePath: string;
  configPath: string;
  authStatePath: string;

  // Generation metadata
  generatedAt: string;
  artkVersion: string;
  templateVariant: 'esm' | 'commonjs';

  // Optional user-provided values
  [key: string]: string | undefined;
}

/**
 * Template variable definition
 */
export interface TemplateVariable {
  name: string;
  description: string;
  required: boolean;
  default?: string;
  type: 'string' | 'boolean' | 'number';
}

/**
 * Template metadata
 */
export interface TemplateMetadata {
  name: string;
  description: string;
  variant: 'esm' | 'commonjs' | 'shared';
  category: string; // e.g., 'auth', 'config', 'navigation'
  variables: TemplateVariable[];
  dependencies?: string[];
  nodeVersion?: string;
}

/**
 * File generation result
 */
export interface GenerationResult {
  success: boolean;
  filePath: string;
  content?: string;
  error?: string;
  warnings?: string[];
}

/**
 * Batch generation result
 */
export interface BatchGenerationResult {
  success: boolean;
  filesGenerated: string[];
  filesFailed: string[];
  errors: Array<{ file: string; error: string }>;
  warnings: string[];
}

/**
 * Template processing options
 */
export interface TemplateProcessingOptions {
  // Validation
  validateBefore?: boolean;
  validateAfter?: boolean;

  // File system
  overwrite?: boolean;
  createBackup?: boolean;

  // Output
  dryRun?: boolean;
  verbose?: boolean;

  // Error handling
  continueOnError?: boolean;
  rollbackOnFailure?: boolean;
}
