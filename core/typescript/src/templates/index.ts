/**
 * Template System Entry Point
 * Exports all template-related functions for dual-template support
 */

// Template resolution
export {
  resolveTemplate,
  validateTemplate,
  listTemplates
} from './resolver';

// Template variant selection
export {
  selectTemplateVariant,
  getRecommendedVariant,
  readTemplateOverride,
  saveTemplateVariant
} from './selector';

// Template migration
export {
  analyzeMigration,
  autoMigrate,
  type MigrationResult
} from './migrate';

// Template generation (NEW)
export {
  generateFromTemplate,
  generateBatch,
  generateFoundationModules
} from './generator';

// Template processing (NEW)
export {
  processTemplate,
  validateTemplateSyntax,
  extractVariables,
  createTemplateContext
} from './processor';

// Template types (NEW)
export type {
  TemplateContext,
  TemplateVariable,
  TemplateMetadata,
  GenerationResult,
  BatchGenerationResult,
  TemplateProcessingOptions
} from './types';

// Re-export template types for convenience
export type {
  TemplateVariant,
  TemplateResolutionResult
} from '../../templates/shared/types/index.js';
