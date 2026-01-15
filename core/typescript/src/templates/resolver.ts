/**
 * Template Resolver - Resolves template paths with local override support
 * FR-034: Check local override → bundled
 */
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import type { TemplateVariant, TemplateResolutionResult } from '../../templates/shared/types/index.js';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  const bundledPath = path.join(__dirname, '../../templates', variant, moduleName);
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
  const templatesDir = path.join(__dirname, '../../templates', variant);
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
