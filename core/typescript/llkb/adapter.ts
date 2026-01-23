/**
 * LLKB Adapter Module
 *
 * Main adapter module that exports LLKB knowledge for AutoGen consumption.
 * Generates configuration files and glossary files that AutoGen can use
 * to enhance test generation with learned patterns and components.
 *
 * @module llkb/adapter
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadLessons, loadComponents, loadLLKBConfig, llkbExists } from './loaders.js';
import {
  lessonToPattern,
  lessonToSelectorOverride,
  lessonToTimingHint,
  componentToModule,
  componentToGlossaryEntries,
  lessonToGlossaryEntries,
} from './adapter-transforms.js';
import type {
  LLKBAdapterConfig,
  LLKBAdapterResult,
  ExportStats,
  AutogenLLKBConfig,
  AdditionalPattern,
  SelectorOverride,
  TimingHint,
  ModuleMapping,
  GlossaryEntry,
  GlossaryMeta,
} from './adapter-types.js';
import type { LLKBCategory } from './types.js';

// =============================================================================
// Constants
// =============================================================================

/** Default minimum confidence threshold */
const DEFAULT_MIN_CONFIDENCE = 0.7;

/** Default LLKB root directory */
const DEFAULT_LLKB_ROOT = '.artk/llkb';

/** Current LLKB version */
const LLKB_VERSION = '1.0.0';

// =============================================================================
// Main Export Function
// =============================================================================

/**
 * Export LLKB knowledge for AutoGen consumption
 *
 * This is the main entry point for the adapter. It reads LLKB data,
 * transforms it into AutoGen-compatible formats, and writes the output files.
 *
 * @param config - Adapter configuration
 * @returns Export result with paths and statistics
 *
 * @example
 * ```typescript
 * const result = await exportForAutogen({
 *   outputDir: './artk-e2e/',
 *   minConfidence: 0.7,
 * });
 *
 * console.log(`Exported ${result.stats.patternsExported} patterns`);
 * console.log(`Config: ${result.configPath}`);
 * console.log(`Glossary: ${result.glossaryPath}`);
 * ```
 */
export async function exportForAutogen(
  config: LLKBAdapterConfig
): Promise<LLKBAdapterResult> {
  const {
    llkbRoot = DEFAULT_LLKB_ROOT,
    outputDir,
    minConfidence = DEFAULT_MIN_CONFIDENCE,
    includeCategories,
    includeScopes,
    generateGlossary = true,
    generateConfig = true,
    configFormat = 'yaml',
  } = config;

  const warnings: string[] = [];
  const exportedAt = new Date().toISOString();

  // Validate LLKB exists
  if (!llkbExists(llkbRoot)) {
    return {
      configPath: null,
      glossaryPath: null,
      stats: createEmptyStats(),
      warnings: [`LLKB not found at ${llkbRoot}. Run /artk.discover-foundation first.`],
      exportedAt,
    };
  }

  // Load LLKB configuration
  const llkbConfig = loadLLKBConfig(llkbRoot);
  if (!llkbConfig.enabled) {
    return {
      configPath: null,
      glossaryPath: null,
      stats: createEmptyStats(),
      warnings: ['LLKB is disabled in config.yml. Enable it to export.'],
      exportedAt,
    };
  }

  // Ensure output directory exists
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // Load lessons and components with filters
  const lessons = loadLessons(llkbRoot, {
    category: includeCategories,
    scope: includeScopes,
    minConfidence,
    includeArchived: false,
  });

  const components = loadComponents(llkbRoot, {
    category: includeCategories as LLKBCategory[] | undefined,
    scope: includeScopes,
    minConfidence,
    includeArchived: false,
  });

  // Count skipped items
  const allLessons = loadLessons(llkbRoot, { includeArchived: false });
  const allComponents = loadComponents(llkbRoot, { includeArchived: false });
  const lessonsSkipped = allLessons.length - lessons.length;
  const componentsSkipped = allComponents.length - components.length;

  // Transform lessons
  const patterns: AdditionalPattern[] = [];
  const selectorOverrides: SelectorOverride[] = [];
  const timingHints: TimingHint[] = [];

  for (const lesson of lessons) {
    // Try to convert to pattern
    const pattern = lessonToPattern(lesson);
    if (pattern) {
      patterns.push(pattern);
    }

    // Try to convert to selector override
    const selector = lessonToSelectorOverride(lesson);
    if (selector) {
      selectorOverrides.push(selector);
    }

    // Try to convert to timing hint
    const timing = lessonToTimingHint(lesson);
    if (timing) {
      timingHints.push(timing);
    }
  }

  // Transform components
  const modules: ModuleMapping[] = [];
  const glossaryEntries: GlossaryEntry[] = [];
  const sourceComponents: string[] = [];
  const sourceLessons: string[] = [];

  for (const component of components) {
    const moduleMapping = componentToModule(component);
    modules.push(moduleMapping);
    sourceComponents.push(component.id);

    if (generateGlossary) {
      const entries = componentToGlossaryEntries(component);
      glossaryEntries.push(...entries);
    }
  }

  // Add lesson glossary entries
  if (generateGlossary) {
    for (const lesson of lessons) {
      const entries = lessonToGlossaryEntries(lesson);
      if (entries.length > 0) {
        glossaryEntries.push(...entries);
        sourceLessons.push(lesson.id);
      }
    }
  }

  // Build stats
  const stats: ExportStats = {
    patternsExported: patterns.length,
    selectorsExported: selectorOverrides.length,
    timingHintsExported: timingHints.length,
    modulesExported: modules.length,
    glossaryEntriesExported: glossaryEntries.length,
    lessonsSkipped,
    componentsSkipped,
  };

  // Generate config file
  let configPath: string | null = null;
  if (generateConfig) {
    const autogenConfig: AutogenLLKBConfig = {
      version: 1,
      exportedAt,
      llkbVersion: LLKB_VERSION,
      minConfidence,
      additionalPatterns: patterns,
      selectorOverrides,
      timingHints,
      modules,
    };

    const filename = configFormat === 'yaml' ? 'autogen-llkb.config.yml' : 'autogen-llkb.config.json';
    configPath = join(outputDir, filename);

    if (configFormat === 'yaml') {
      writeFileSync(configPath, generateYAML(autogenConfig), 'utf-8');
    } else {
      writeFileSync(configPath, JSON.stringify(autogenConfig, null, 2), 'utf-8');
    }
  }

  // Generate glossary file
  let glossaryPath: string | null = null;
  if (generateGlossary && glossaryEntries.length > 0) {
    const glossaryMeta: GlossaryMeta = {
      exportedAt,
      minConfidence,
      entryCount: glossaryEntries.length,
      sourceComponents: [...new Set(sourceComponents)],
      sourceLessons: [...new Set(sourceLessons)],
    };

    glossaryPath = join(outputDir, 'llkb-glossary.ts');
    writeFileSync(glossaryPath, generateGlossaryFile(glossaryEntries, glossaryMeta), 'utf-8');
  }

  // Add warnings for low export counts
  if (stats.patternsExported === 0 && stats.modulesExported === 0) {
    warnings.push('No patterns or modules were exported. Consider lowering minConfidence.');
  }

  return {
    configPath,
    glossaryPath,
    stats,
    warnings,
    exportedAt,
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create empty stats object
 */
function createEmptyStats(): ExportStats {
  return {
    patternsExported: 0,
    selectorsExported: 0,
    timingHintsExported: 0,
    modulesExported: 0,
    glossaryEntriesExported: 0,
    lessonsSkipped: 0,
    componentsSkipped: 0,
  };
}

/**
 * Generate YAML string from AutogenLLKBConfig
 *
 * Simple YAML generator for the config structure.
 * For production, consider using a proper YAML library.
 */
function generateYAML(config: AutogenLLKBConfig): string {
  const lines: string[] = [
    '# Generated by LLKB Adapter - DO NOT EDIT MANUALLY',
    '# Regenerate with: npx artk-llkb export --for-autogen',
    '',
    `version: ${config.version}`,
    `exportedAt: "${config.exportedAt}"`,
    `llkbVersion: "${config.llkbVersion}"`,
    `minConfidence: ${config.minConfidence}`,
    '',
    '# Additional patterns from LLKB lessons',
    'additionalPatterns:',
  ];

  for (const pattern of config.additionalPatterns) {
    lines.push(`  - name: "${pattern.name}"`);
    lines.push(`    regex: "${escapeYAMLString(pattern.regex)}"`);
    lines.push(`    primitiveType: "${pattern.primitiveType}"`);
    if (pattern.module) {
      lines.push(`    module: "${pattern.module}"`);
    }
    if (pattern.method) {
      lines.push(`    method: "${pattern.method}"`);
    }
    if (pattern.argMapping && pattern.argMapping.length > 0) {
      lines.push(`    argMapping: [${pattern.argMapping.map((a) => `"${a}"`).join(', ')}]`);
    }
    lines.push('    source:');
    lines.push(`      lessonId: "${pattern.source.lessonId}"`);
    lines.push(`      confidence: ${pattern.source.confidence}`);
    lines.push(`      occurrences: ${pattern.source.occurrences}`);
  }

  lines.push('');
  lines.push('# Selector overrides from LLKB lessons');
  lines.push('selectorOverrides:');

  for (const selector of config.selectorOverrides) {
    lines.push(`  - pattern: "${escapeYAMLString(selector.pattern)}"`);
    lines.push('    override:');
    lines.push(`      strategy: "${selector.override.strategy}"`);
    lines.push(`      value: "${escapeYAMLString(selector.override.value)}"`);
    lines.push('    source:');
    lines.push(`      lessonId: "${selector.source.lessonId}"`);
    lines.push(`      confidence: ${selector.source.confidence}`);
  }

  lines.push('');
  lines.push('# Timing hints from lessons');
  lines.push('timingHints:');

  for (const hint of config.timingHints) {
    lines.push(`  - trigger: "${escapeYAMLString(hint.trigger)}"`);
    lines.push(`    waitMs: ${hint.waitMs}`);
    lines.push('    source:');
    lines.push(`      lessonId: "${hint.source.lessonId}"`);
    lines.push(`      confidence: ${hint.source.confidence}`);
  }

  lines.push('');
  lines.push('# Module mappings from components');
  lines.push('modules:');

  for (const mod of config.modules) {
    lines.push(`  - name: "${mod.name}"`);
    lines.push(`    trigger: "${escapeYAMLString(mod.trigger)}"`);
    lines.push(`    componentId: "${mod.componentId}"`);
    lines.push(`    importPath: "${mod.importPath}"`);
    lines.push(`    confidence: ${mod.confidence}`);
  }

  return lines.join('\n') + '\n';
}

/**
 * Escape special characters for YAML strings
 */
function escapeYAMLString(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Generate TypeScript glossary file content
 */
function generateGlossaryFile(entries: GlossaryEntry[], meta: GlossaryMeta): string {
  const lines: string[] = [
    '/**',
    ' * LLKB-Generated Glossary Extension',
    ` * Generated: ${meta.exportedAt}`,
    ' * Source: .artk/llkb/',
    ` * Min Confidence: ${meta.minConfidence}`,
    ' *',
    ' * DO NOT EDIT - Regenerate with: npx artk-llkb export --for-autogen',
    ' */',
    '',
    'export interface IRPrimitive {',
    "  type: 'callModule' | 'click' | 'fill' | 'navigate' | 'wait' | 'assert';",
    '  module?: string;',
    '  method?: string;',
    '  params?: Record<string, unknown>;',
    '}',
    '',
    'export const llkbGlossary = new Map<string, IRPrimitive>([',
  ];

  // Group entries by source for comments
  const entriesBySource = new Map<string, GlossaryEntry[]>();
  for (const entry of entries) {
    const source = entry.sourceId;
    if (!entriesBySource.has(source)) {
      entriesBySource.set(source, []);
    }
    entriesBySource.get(source)?.push(entry);
  }

  for (const [sourceId, sourceEntries] of entriesBySource) {
    const confidence = sourceEntries[0]?.confidence ?? 0;
    lines.push(`  // From ${sourceId} (confidence: ${confidence.toFixed(2)})`);

    for (const entry of sourceEntries) {
      const primitiveStr = JSON.stringify(entry.primitive);
      lines.push(`  ["${escapeJSString(entry.phrase)}", ${primitiveStr}],`);
    }
    lines.push('');
  }

  lines.push(']);');
  lines.push('');
  lines.push('export const llkbGlossaryMeta = {');
  lines.push(`  exportedAt: "${meta.exportedAt}",`);
  lines.push(`  minConfidence: ${meta.minConfidence},`);
  lines.push(`  entryCount: ${meta.entryCount},`);
  lines.push(`  sourceComponents: ${JSON.stringify(meta.sourceComponents)},`);
  lines.push(`  sourceLessons: ${JSON.stringify(meta.sourceLessons)},`);
  lines.push('};');
  lines.push('');

  return lines.join('\n');
}

/**
 * Escape special characters for JavaScript strings
 */
function escapeJSString(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

// =============================================================================
// Utility Exports
// =============================================================================

/**
 * Format export result for console output
 *
 * @param result - The export result
 * @returns Formatted string for display
 */
export function formatExportResult(result: LLKBAdapterResult): string {
  const lines: string[] = [];

  lines.push('LLKB Export for AutoGen');
  lines.push('========================');
  lines.push(`Exported patterns: ${result.stats.patternsExported}`);
  lines.push(`Exported selector overrides: ${result.stats.selectorsExported}`);
  lines.push(`Exported timing hints: ${result.stats.timingHintsExported}`);
  lines.push(`Exported modules: ${result.stats.modulesExported}`);
  lines.push(`Generated glossary entries: ${result.stats.glossaryEntriesExported}`);
  lines.push('');

  if (result.stats.lessonsSkipped > 0 || result.stats.componentsSkipped > 0) {
    lines.push('Skipped (low confidence):');
    lines.push(`  Lessons: ${result.stats.lessonsSkipped}`);
    lines.push(`  Components: ${result.stats.componentsSkipped}`);
    lines.push('');
  }

  lines.push('Output files:');
  if (result.configPath) {
    lines.push(`  - ${result.configPath}`);
  }
  if (result.glossaryPath) {
    lines.push(`  - ${result.glossaryPath}`);
  }

  if (result.warnings.length > 0) {
    lines.push('');
    lines.push('Warnings:');
    for (const warning of result.warnings) {
      lines.push(`  ! ${warning}`);
    }
  }

  lines.push('');
  lines.push(`Export completed at: ${result.exportedAt}`);

  return lines.join('\n');
}
