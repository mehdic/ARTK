/**
 * Template Resolver - Resolves template paths with local override support
 * FR-034: Check local override → bundled
 *
 * IMPORTANT: This module uses a dual-strategy approach for ESM/CJS compatibility:
 * - In CJS: Uses __dirname (injected by Node.js module wrapper)
 * - In ESM: Uses import.meta.url (only available in ESM)
 *
 * The TypeScript source uses import.meta.url, which works for ESM builds.
 * For CJS builds, the __ESM_ONLY__ blocks are stripped by post-build script.
 */
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import type { TemplateVariant, TemplateResolutionResult } from '../../templates/shared/types/index.js';

/**
 * Get the directory where this module file is located.
 * Works in both ESM and CJS environments.
 *
 * In CJS: __dirname is injected by Node.js module wrapper
 * In ESM: Uses import.meta.url (ESM-only block stripped from CJS builds)
 */
function getModuleDir(): string {
  // In CJS, __dirname is injected by Node.js module wrapper
  // @ts-ignore - __dirname exists in CJS runtime
  if (typeof __dirname === 'string' && __dirname.length > 0) {
    // @ts-ignore
    return __dirname;
  }

  // In ESM, use import.meta.url directly
  // For CJS builds, this block is removed by post-build script
  // __ESM_ONLY_START__
  try {
    // @ts-ignore - Valid in ESM, removed from CJS by post-build
    const metaUrl: string | undefined = import.meta.url;
    if (metaUrl) {
      return path.dirname(fileURLToPath(metaUrl));
    }
  } catch {
    // import.meta not available
  }
  // __ESM_ONLY_END__

  // Fallback: use process.cwd()
  return process.cwd();
}

// Get module directory using dual-mode approach
const __moduleDirname = getModuleDir();

/**
 * Resolve template path with fallback hierarchy
 * 1. Check local override in artk-e2e/templates/
 * 2. Fall back to bundled template in node_modules/@artk/core/templates/
 */
export function resolveTemplate(
  projectRoot: string,
  moduleName: string,
  variant: TemplateVariant
): TemplateResolutionResult {
  // 1. Check local override
  const localPath = path.join(projectRoot, 'artk-e2e/templates', variant, moduleName);
  if (fs.existsSync(localPath)) {
    // Validate local override
    if (!validateTemplate(localPath)) {
      console.warn(`Local template invalid: ${localPath}, falling back to bundled`);
    } else {
      return {
        templatePath: localPath,
        source: 'local-override',
        variant
      };
    }
  }

  // 2. Fall back to bundled template
  const bundledPath = path.join(__moduleDirname, '../../templates', variant, moduleName);
  if (fs.existsSync(bundledPath)) {
    return {
      templatePath: bundledPath,
      source: 'bundled',
      variant
    };
  }

  throw new Error(`Template not found: ${variant}/${moduleName}`);
}

/**
 * Validate template file
 * FR-079: Check for incomplete/syntax errors in local overrides
 */
export function validateTemplate(templatePath: string): boolean {
  try {
    if (!fs.existsSync(templatePath)) {
      return false;
    }

    const stat = fs.statSync(templatePath);
    if (!stat.isFile()) {
      return false;
    }

    // Check if file is readable and not empty
    const content = fs.readFileSync(templatePath, 'utf8');
    if (content.trim().length === 0) {
      return false;
    }

    // Basic syntax check: must have 'export' or 'function'
    if (!content.includes('export') && !content.includes('function')) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get all available templates for a variant
 */
export function listTemplates(variant: TemplateVariant): string[] {
  const templatesDir = path.join(__moduleDirname, '../../templates', variant);
  const modules: string[] = [];

  if (fs.existsSync(templatesDir)) {
    const categories = fs.readdirSync(templatesDir);
    for (const category of categories) {
      const categoryPath = path.join(templatesDir, category);
      if (fs.statSync(categoryPath).isDirectory()) {
        modules.push(category);
      }
    }
  }

  return modules;
}
