/**
 * Template Migration Script - Helps migrate from old templates to dual-template system
 * Detects old template usage and suggests migration path
 */
import * as path from 'path';
import * as fs from 'fs';
import type { TemplateVariant } from '../../templates/shared/types/index.js';

export interface MigrationResult {
  needsMigration: boolean;
  oldTemplatesFound: string[];
  suggestedVariant: TemplateVariant;
  migrationSteps: string[];
}

/**
 * Analyze project for old template usage and suggest migration
 *
 * @param projectRoot - Path to project root directory
 * @returns Migration analysis result
 */
export function analyzeMigration(projectRoot: string): MigrationResult {
  const oldTemplatesFound: string[] = [];

  // Check for old template locations (before dual-template system)
  const oldTemplatePaths = [
    'artk-e2e/foundation/auth/login.ts',
    'artk-e2e/foundation/config/env.ts',
    'artk-e2e/foundation/navigation/nav.ts',
    'artk-e2e/templates/auth/login.ts',
    'artk-e2e/templates/config/env.ts',
    'artk-e2e/templates/navigation/nav.ts'
  ];

  // Detect old templates
  for (const templatePath of oldTemplatePaths) {
    const fullPath = path.join(projectRoot, templatePath);
    if (fs.existsSync(fullPath)) {
      oldTemplatesFound.push(templatePath);
    }
  }

  const needsMigration = oldTemplatesFound.length > 0;

  if (!needsMigration) {
    return {
      needsMigration: false,
      oldTemplatesFound: [],
      suggestedVariant: 'commonjs',
      migrationSteps: []
    };
  }

  // Detect module system from old templates
  const suggestedVariant = detectVariantFromOldTemplates(projectRoot, oldTemplatesFound);

  // Generate migration steps
  const migrationSteps = generateMigrationSteps(oldTemplatesFound, suggestedVariant);

  return {
    needsMigration,
    oldTemplatesFound,
    suggestedVariant,
    migrationSteps
  };
}

/**
 * Detect appropriate variant by analyzing old template content
 */
function detectVariantFromOldTemplates(
  projectRoot: string,
  oldTemplates: string[]
): TemplateVariant {
  let esmIndicators = 0;
  let cjsIndicators = 0;

  for (const templatePath of oldTemplates) {
    const fullPath = path.join(projectRoot, templatePath);
    if (!fs.existsSync(fullPath)) continue;

    try {
      const content = fs.readFileSync(fullPath, 'utf8');

      // ESM indicators
      if (content.includes('import.meta')) esmIndicators++;
      if (content.includes('await import(')) esmIndicators++;
      if (/^import\s+.*\s+from\s+['"]/.test(content)) esmIndicators++;

      // CommonJS indicators
      if (content.includes('__dirname')) cjsIndicators++;
      if (content.includes('require(')) cjsIndicators++;
      if (content.includes('module.exports')) cjsIndicators++;
    } catch (error) {
      // Skip files that can't be read
      continue;
    }
  }

  // If more ESM indicators, suggest ESM; otherwise CommonJS (safer default)
  return esmIndicators > cjsIndicators ? 'esm' : 'commonjs';
}

/**
 * Generate step-by-step migration instructions
 */
function generateMigrationSteps(
  oldTemplates: string[],
  variant: TemplateVariant
): string[] {
  const steps: string[] = [];

  steps.push(`Detected ${oldTemplates.length} old template file(s) that need migration.`);
  steps.push(`Recommended template variant: ${variant}`);
  steps.push('');
  steps.push('Migration steps:');
  steps.push('');
  steps.push('1. Backup your existing templates:');
  steps.push('   mkdir -p artk-e2e/templates.backup');
  steps.push('   cp -r artk-e2e/foundation/* artk-e2e/templates.backup/ 2>/dev/null || true');
  steps.push('   cp -r artk-e2e/templates/* artk-e2e/templates.backup/ 2>/dev/null || true');
  steps.push('');
  steps.push('2. Run bootstrap with template variant selection:');
  steps.push('   npm run artk:bootstrap -- --template-variant=' + variant);
  steps.push('');
  steps.push('3. Review and merge any custom changes from backup:');
  steps.push('   Compare artk-e2e/templates.backup/ with newly generated templates');
  steps.push('   Merge custom logic, selectors, or test data');
  steps.push('');
  steps.push('4. Update test files to use new template structure:');
  steps.push(`   Old: import { login } from '../foundation/auth/login'`);
  steps.push(`   New: import { login } from '@artk/core/templates/${variant}/auth/login'`);
  steps.push('');
  steps.push('5. Verify tests still pass:');
  steps.push('   npm test');
  steps.push('');
  steps.push('6. Remove backup after verification:');
  steps.push('   rm -rf artk-e2e/templates.backup');

  return steps;
}

/**
 * Auto-migrate old templates (best effort)
 * Backs up old templates and generates new structure
 *
 * @param projectRoot - Path to project root directory
 * @param variant - Template variant to migrate to
 * @returns Success status and any errors
 */
export function autoMigrate(
  projectRoot: string,
  variant: TemplateVariant
): { success: boolean; errors: string[] } {
  const errors: string[] = [];

  try {
    // 1. Create backup
    const backupDir = path.join(projectRoot, 'artk-e2e/templates.backup');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // 2. Copy old templates to backup
    const oldDirs = [
      path.join(projectRoot, 'artk-e2e/foundation'),
      path.join(projectRoot, 'artk-e2e/templates')
    ];

    for (const oldDir of oldDirs) {
      if (fs.existsSync(oldDir)) {
        try {
          copyRecursive(oldDir, backupDir);
        } catch (error) {
          errors.push(`Failed to backup ${oldDir}: ${error}`);
        }
      }
    }

    // 3. Success message
    if (errors.length === 0) {
      console.log(`✅ Old templates backed up to: ${backupDir}`);
      console.log(`   Run bootstrap script with --template-variant=${variant} to generate new templates`);
    }

    return { success: errors.length === 0, errors };
  } catch (error) {
    errors.push(`Migration failed: ${error}`);
    return { success: false, errors };
  }
}

/**
 * Helper: Copy directory recursively
 */
function copyRecursive(src: string, dest: string): void {
  const stats = fs.statSync(src);

  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    const entries = fs.readdirSync(src);
    for (const entry of entries) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}
