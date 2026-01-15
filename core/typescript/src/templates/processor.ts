/**
 * Template Processor - Variable substitution and template processing
 * Supports:
 * - {{VARIABLE}} - simple substitution
 * - {{#if VARIABLE}}...{{/if}} - conditional blocks
 * - {{! comment }} - comments (removed)
 */
import type { TemplateContext } from './types';

/**
 * Process template content with variable substitution
 *
 * @param templateContent - Raw template content
 * @param context - Template context with variables
 * @returns Processed content with variables substituted
 */
export function processTemplate(
  templateContent: string,
  context: TemplateContext
): string {
  let processed = templateContent;

  // 1. Remove comments
  processed = removeComments(processed);

  // 2. Process conditional blocks
  processed = processConditionals(processed, context);

  // 3. Substitute variables
  processed = substituteVariables(processed, context);

  return processed;
}

/**
 * Remove template comments {{! ... }}
 */
function removeComments(content: string): string {
  return content.replace(/\{\{!.*?\}\}/gs, '');
}

/**
 * Process conditional blocks {{#if VAR}}...{{/if}}
 */
function processConditionals(content: string, context: TemplateContext): string {
  // Match {{#if VARIABLE}}...{{/if}} blocks
  const conditionalRegex = /\{\{#if\s+(\w+)\}\}(.*?)\{\{\/if\}\}/gs;

  return content.replace(conditionalRegex, (_match, variable, blockContent) => {
    const value = context[variable];

    // Include block if variable is truthy
    if (isTruthy(value)) {
      return blockContent;
    }

    return '';
  });
}

/**
 * Substitute {{VARIABLE}} with actual values
 */
function substituteVariables(content: string, context: TemplateContext): string {
  // Match {{VARIABLE_NAME}}
  const variableRegex = /\{\{(\w+)\}\}/g;

  return content.replace(variableRegex, (_match, variableName) => {
    const value = context[variableName];

    if (value === undefined) {
      throw new Error(
        `Template variable '${variableName}' is not defined in context. ` +
        `Available variables: ${Object.keys(context).join(', ')}`
      );
    }

    return String(value);
  });
}

/**
 * Check if value is truthy for conditional evaluation
 */
function isTruthy(value: any): boolean {
  if (value === undefined || value === null) {
    return false;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return value !== '' && value !== 'false' && value !== '0';
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  return true;
}

/**
 * Validate template content for syntax errors
 *
 * @param templateContent - Template content to validate
 * @returns Validation result with errors
 */
export function validateTemplateSyntax(templateContent: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check for unclosed conditionals
  const ifCount = (templateContent.match(/\{\{#if/g) || []).length;
  const endifCount = (templateContent.match(/\{\{\/if\}\}/g) || []).length;

  if (ifCount !== endifCount) {
    errors.push(
      `Mismatched conditional blocks: ${ifCount} {{#if}} but ${endifCount} {{/if}}`
    );
  }

  // Check for malformed variable tags
  const malformedTags = templateContent.match(/\{\{(?![#/!])[^}]*$/gm);
  if (malformedTags) {
    errors.push(`Malformed template tags found: ${malformedTags.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Extract all variables used in a template
 *
 * @param templateContent - Template content
 * @returns Array of variable names used
 */
export function extractVariables(templateContent: string): string[] {
  const variables = new Set<string>();

  // Extract from {{VARIABLE}}
  const variableRegex = /\{\{(\w+)\}\}/g;
  let match;
  while ((match = variableRegex.exec(templateContent)) !== null) {
    variables.add(match[1]!);
  }

  // Extract from {{#if VARIABLE}}
  const conditionalRegex = /\{\{#if\s+(\w+)\}\}/g;
  while ((match = conditionalRegex.exec(templateContent)) !== null) {
    variables.add(match[1]!);
  }

  return Array.from(variables);
}

/**
 * Create a template context with defaults
 *
 * @param partial - Partial context with user-provided values
 * @returns Complete context with defaults filled in
 */
export function createTemplateContext(
  partial: Partial<TemplateContext>
): TemplateContext {
  const now = new Date();

  return {
    // Required fields with defaults
    projectName: partial.projectName || 'artk-project',
    projectRoot: partial.projectRoot || process.cwd(),
    artkRoot: partial.artkRoot || 'artk-e2e',

    moduleSystem: partial.moduleSystem || 'commonjs',
    nodeVersion: partial.nodeVersion || process.version.replace('v', ''),
    packageType: partial.packageType,
    tsConfigModule: partial.tsConfigModule,

    baseURL: partial.baseURL || 'http://localhost:3000',
    authProvider: partial.authProvider || 'oidc',

    artkCorePath: partial.artkCorePath || '@artk/core',
    configPath: partial.configPath || 'artk-e2e/config',
    authStatePath: partial.authStatePath || '.auth-states',

    generatedAt: partial.generatedAt || now.toISOString(),
    artkVersion: partial.artkVersion || '1.0.0',
    templateVariant: partial.templateVariant || 'commonjs',

    // Include any additional user-provided fields
    ...partial
  };
}
