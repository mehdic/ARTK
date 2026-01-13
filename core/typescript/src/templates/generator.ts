/**
 * Template Generator - Generates code from templates
 * Main entry point for template-based code generation
 */
import * as fs from 'fs';
import * as path from 'path';
import { resolveTemplate, validateTemplate } from './resolver';
import { processTemplate, validateTemplateSyntax, extractVariables } from './processor';
import { ValidationRunner } from '../../validation/runner';
import type {
  TemplateContext,
  GenerationResult,
  BatchGenerationResult,
  TemplateProcessingOptions,
  TemplateVariant
} from './types';
import type { ValidationResult } from '../../types/validation-result';

/**
 * Generate a single file from a template
 *
 * @param moduleName - Template module name (e.g., 'auth/login.ts')
 * @param variant - Template variant ('esm' | 'commonjs')
 * @param targetPath - Absolute path where file should be written
 * @param context - Template context with variables
 * @param options - Processing options
 * @returns Generation result
 */
export async function generateFromTemplate(
  moduleName: string,
  variant: TemplateVariant,
  targetPath: string,
  context: TemplateContext,
  options: TemplateProcessingOptions = {}
): Promise<GenerationResult> {
  const {
    validateBefore = true,
    validateAfter = false,
    overwrite = true,
    createBackup = true,
    dryRun = false,
    verbose = false
  } = options;

  const warnings: string[] = [];

  try {
    // 1. Resolve template
    if (verbose) {
      console.log(`Resolving template: ${moduleName} (${variant})`);
    }

    const resolved = resolveTemplate(context.projectRoot, moduleName, variant);

    if (verbose) {
      console.log(`  Source: ${resolved.source}`);
      console.log(`  Path: ${resolved.templatePath}`);
    }

    // 2. Read template content
    if (!fs.existsSync(resolved.templatePath)) {
      throw new Error(`Template file not found: ${resolved.templatePath}`);
    }

    const templateContent = fs.readFileSync(resolved.templatePath, 'utf8');

    // 3. Validate template syntax
    if (validateBefore) {
      const syntaxValidation = validateTemplateSyntax(templateContent);
      if (!syntaxValidation.valid) {
        throw new Error(
          `Template syntax errors:\n${syntaxValidation.errors.join('\n')}`
        );
      }
    }

    // 4. Check for required variables
    const requiredVars = extractVariables(templateContent);
    const missingVars = requiredVars.filter(v => context[v] === undefined);

    if (missingVars.length > 0) {
      throw new Error(
        `Missing required template variables: ${missingVars.join(', ')}\n` +
        `Available: ${Object.keys(context).join(', ')}`
      );
    }

    // 5. Process template
    if (verbose) {
      console.log(`Processing template with ${requiredVars.length} variables...`);
    }

    const processedContent = processTemplate(templateContent, context);

    // 6. Dry run - just return content without writing
    if (dryRun) {
      return {
        success: true,
        filePath: targetPath,
        content: processedContent,
        warnings
      };
    }

    // 7. Check if target exists
    if (fs.existsSync(targetPath)) {
      if (!overwrite) {
        throw new Error(`Target file already exists: ${targetPath}`);
      }

      if (createBackup) {
        const backupPath = `${targetPath}.backup.${Date.now()}`;
        fs.copyFileSync(targetPath, backupPath);
        warnings.push(`Created backup: ${backupPath}`);

        if (verbose) {
          console.log(`  Backup created: ${backupPath}`);
        }
      }
    }

    // 8. Ensure target directory exists
    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });

      if (verbose) {
        console.log(`  Created directory: ${targetDir}`);
      }
    }

    // 9. Write file
    fs.writeFileSync(targetPath, processedContent, 'utf8');

    if (verbose) {
      console.log(`  ✓ Generated: ${targetPath}`);
    }

    // 10. Validate generated file
    if (validateAfter) {
      if (!validateTemplate(targetPath)) {
        warnings.push(`Generated file failed validation: ${targetPath}`);
      }
    }

    return {
      success: true,
      filePath: targetPath,
      content: processedContent,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  } catch (error) {
    return {
      success: false,
      filePath: targetPath,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Generate multiple files from templates
 *
 * @param templates - Array of templates to generate
 * @param variant - Template variant
 * @param targetDir - Base directory for generated files
 * @param context - Template context
 * @param options - Processing options
 * @returns Batch generation result
 */
export async function generateBatch(
  templates: Array<{ moduleName: string; targetPath: string }>,
  variant: TemplateVariant,
  targetDir: string,
  context: TemplateContext,
  options: TemplateProcessingOptions = {}
): Promise<BatchGenerationResult> {
  const {
    continueOnError = false,
    rollbackOnFailure = true,
    verbose = false
  } = options;

  const filesGenerated: string[] = [];
  const filesFailed: string[] = [];
  const errors: Array<{ file: string; error: string }> = [];
  const warnings: string[] = [];

  // Track for rollback
  const generatedFiles: string[] = [];

  try {
    for (const { moduleName, targetPath } of templates) {
      const fullPath = path.join(targetDir, targetPath);

      if (verbose) {
        console.log(`\nGenerating: ${moduleName} → ${targetPath}`);
      }

      const result = await generateFromTemplate(
        moduleName,
        variant,
        fullPath,
        context,
        options
      );

      if (result.success) {
        filesGenerated.push(fullPath);
        generatedFiles.push(fullPath);

        if (result.warnings) {
          warnings.push(...result.warnings);
        }
      } else {
        filesFailed.push(fullPath);
        errors.push({ file: fullPath, error: result.error || 'Unknown error' });

        if (!continueOnError) {
          throw new Error(`Generation failed for ${moduleName}: ${result.error}`);
        }
      }
    }

    return {
      success: filesFailed.length === 0,
      filesGenerated,
      filesFailed,
      errors,
      warnings
    };
  } catch (error) {
    // Rollback on failure
    if (rollbackOnFailure && generatedFiles.length > 0) {
      if (verbose) {
        console.log(`\nRolling back ${generatedFiles.length} generated files...`);
      }

      for (const filePath of generatedFiles) {
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);

            // Restore backup if it exists
            const backupPattern = `${filePath}.backup.`;
            const dir = path.dirname(filePath);
            const backups = fs.readdirSync(dir).filter(f => f.startsWith(path.basename(filePath) + '.backup.'));

            if (backups.length > 0) {
              // Use most recent backup
              const latestBackup = backups.sort().reverse()[0];
              const backupPath = path.join(dir, latestBackup);
              fs.copyFileSync(backupPath, filePath);
              fs.unlinkSync(backupPath);
            }
          }
        } catch (rollbackError) {
          warnings.push(`Failed to rollback ${filePath}: ${rollbackError}`);
        }
      }

      warnings.push('Generation failed, rolled back all generated files');
    }

    return {
      success: false,
      filesGenerated,
      filesFailed,
      errors: [
        ...errors,
        {
          file: 'batch',
          error: error instanceof Error ? error.message : String(error)
        }
      ],
      warnings
    };
  }
}

/**
 * Generate all foundation modules for a project
 *
 * @param projectRoot - Project root directory
 * @param variant - Template variant
 * @param context - Template context
 * @param options - Processing options
 * @returns Batch generation result
 */
export async function generateFoundationModules(
  projectRoot: string,
  variant: TemplateVariant,
  context: TemplateContext,
  options: TemplateProcessingOptions = {}
): Promise<BatchGenerationResult> {
  const { verbose = false, validateAfter = true } = options;

  // Define foundation modules to generate
  const foundationModules = [
    { moduleName: 'auth/login.ts', targetPath: 'foundation/auth/login.ts' },
    { moduleName: 'config/env.ts', targetPath: 'foundation/config/env.ts' },
    { moduleName: 'navigation/nav.ts', targetPath: 'foundation/navigation/nav.ts' }
  ];

  const targetDir = path.join(projectRoot, context.artkRoot);

  if (verbose) {
    console.log(`\n╔════════════════════════════════════════════╗`);
    console.log(`║     Generating Foundation Modules          ║`);
    console.log(`╚════════════════════════════════════════════╝\n`);
    console.log(`Variant: ${variant}`);
    console.log(`Target:  ${targetDir}`);
    console.log(`Modules: ${foundationModules.length}\n`);
  }

  // Generate all modules
  const result = await generateBatch(
    foundationModules,
    variant,
    targetDir,
    context,
    { ...options, verbose }
  );

  // Run validation if requested
  if (validateAfter && result.success) {
    if (verbose) {
      console.log(`\nValidating generated files...`);
    }

    try {
      // Use the ValidationRunner for comprehensive validation
      const runner = new ValidationRunner({
        outputDir: targetDir,
        timeout: 10000
      });

      // Track all generated files
      for (const file of result.filesGenerated) {
        runner.trackGeneratedFile(file);
      }

      // Run validation
      const validationResult: ValidationResult = await runner.validate({
        files: result.filesGenerated,
        environmentContext: context.moduleSystem,
        skipValidation: false,
        strictness: {
          'import-meta-usage': 'error',
          'dirname-usage': 'error',
          'import-paths': 'warning',
          'dependency-compat': 'error'
        }
      });

      if (verbose) {
        console.log(`  Status: ${validationResult.status}`);
        console.log(`  Execution time: ${validationResult.executionTime}ms`);

        if (validationResult.errors.length > 0) {
          console.log(`  Errors: ${validationResult.errors.length}`);
          for (const error of validationResult.errors) {
            console.log(`    - ${error.file}:${error.line || '?'} - ${error.message}`);
          }
        }

        if (validationResult.warnings.length > 0) {
          console.log(`  Warnings: ${validationResult.warnings.length}`);
          for (const warning of validationResult.warnings) {
            console.log(`    - ${warning.file}:${warning.line || '?'} - ${warning.message}`);
          }
        }
      }

      // Handle validation failure
      if (validationResult.status === 'failed') {
        result.success = false;

        // Add validation errors to result
        for (const error of validationResult.errors) {
          result.errors.push({
            file: error.file,
            error: `${error.ruleId}: ${error.message}`
          });
        }

        // ValidationRunner handles rollback automatically
        if (validationResult.rollbackPerformed) {
          result.warnings.push(
            `Validation failed, ${validationResult.rollbackSuccess ? 'successfully' : 'unsuccessfully'} rolled back generated files`
          );
        }
      } else if (verbose) {
        console.log(`  ✓ Validation passed`);
      }
    } catch (error) {
      // Validation error - handle gracefully
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.warnings.push(`Validation error: ${errorMessage}`);

      if (verbose) {
        console.log(`  ⚠ Validation encountered an error: ${errorMessage}`);
      }
    }
  }

  if (verbose) {
    console.log(`\n─────────────────────────────────────────────`);
    console.log(`Success: ${result.success}`);
    console.log(`Generated: ${result.filesGenerated.length} files`);
    console.log(`Failed: ${result.filesFailed.length} files`);
    if (result.warnings.length > 0) {
      console.log(`Warnings: ${result.warnings.length}`);
    }
    console.log(`─────────────────────────────────────────────\n`);
  }

  return result;
}
