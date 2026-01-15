/**
 * Template Selector - Selects appropriate template variant based on environment
 * FR-036: Auto-select variant based on detected module system
 * Supports manual override from .artk/context.json
 */
import * as path from 'path';
import * as fs from 'fs';
import type { EnvironmentContext } from '../../types/environment-context.js';
import type { TemplateVariant } from '../../templates/shared/types/index.js';

/**
 * Select appropriate template variant based on environment context
 *
 * Priority order:
 * 1. Manual override from context.templateVariant (if present)
 * 2. Auto-selection based on detected moduleSystem
 *
 * @param context - Environment context with module system detection
 * @param manualOverride - Optional manual override from .artk/context.json
 * @returns Selected template variant
 */
export function selectTemplateVariant(
  context: EnvironmentContext,
  manualOverride?: TemplateVariant
): TemplateVariant {
  // 1. Check manual override
  if (manualOverride) {
    validateVariantMatch(context, manualOverride);
    return manualOverride;
  }

  // 2. Auto-select based on detected module system
  const { moduleSystem } = context;

  if (moduleSystem === 'esm') {
    return 'esm';
  } else if (moduleSystem === 'commonjs') {
    return 'commonjs';
  } else {
    // Default to commonjs for 'unknown' module system
    console.warn(
      `Module system detection returned 'unknown', defaulting to 'commonjs' template variant. ` +
      `To override, set templateVariant in .artk/context.json`
    );
    return 'commonjs';
  }
}

/**
 * Validate that selected variant matches detected environment
 * Warns if there's a mismatch
 *
 * @param context - Environment context
 * @param selectedVariant - Selected template variant
 */
function validateVariantMatch(
  context: EnvironmentContext,
  selectedVariant: TemplateVariant
): void {
  const { moduleSystem, detectionConfidence } = context;

  // Only warn if we have high confidence in detection
  if (detectionConfidence !== 'high') {
    return;
  }

  // Check for mismatch
  if (moduleSystem === 'esm' && selectedVariant === 'commonjs') {
    console.warn(
      `⚠️  Template variant mismatch detected:\n` +
      `   Detected module system: ESM (confidence: ${detectionConfidence})\n` +
      `   Selected template variant: CommonJS\n` +
      `   This may cause runtime errors. Consider using 'esm' template variant.`
    );
  } else if (moduleSystem === 'commonjs' && selectedVariant === 'esm') {
    console.warn(
      `⚠️  Template variant mismatch detected:\n` +
      `   Detected module system: CommonJS (confidence: ${detectionConfidence})\n` +
      `   Selected template variant: ESM\n` +
      `   This may cause runtime errors. Consider using 'commonjs' template variant.`
    );
  }
}

/**
 * Get recommended template variant based on environment
 * Used by bootstrap scripts to suggest the best variant
 *
 * @param context - Environment context
 * @returns Recommended variant with confidence level
 */
export function getRecommendedVariant(context: EnvironmentContext): {
  variant: TemplateVariant;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
} {
  const { moduleSystem, detectionConfidence } = context;

  if (moduleSystem === 'esm') {
    return {
      variant: 'esm',
      confidence: detectionConfidence,
      reason: `Detected ESM module system (type: "module" in package.json or .mjs extension)`
    };
  } else if (moduleSystem === 'commonjs') {
    return {
      variant: 'commonjs',
      confidence: detectionConfidence,
      reason: `Detected CommonJS module system (type: "commonjs" in package.json or .cjs extension)`
    };
  } else {
    return {
      variant: 'commonjs',
      confidence: 'low',
      reason: `Could not determine module system, defaulting to CommonJS (safer fallback)`
    };
  }
}

/**
 * Read manual template variant override from .artk/context.json
 * FR-037: Support manual override for edge cases
 *
 * @param projectRoot - Path to project root directory
 * @returns Template variant from context.json, or undefined if not set
 */
export function readTemplateOverride(projectRoot: string): TemplateVariant | undefined {
  const contextPath = path.join(projectRoot, '.artk/context.json');

  if (!fs.existsSync(contextPath)) {
    return undefined;
  }

  try {
    const content = fs.readFileSync(contextPath, 'utf8');
    const context = JSON.parse(content);

    // Check if templateVariant is explicitly set
    if (context.templateVariant &&
        (context.templateVariant === 'commonjs' || context.templateVariant === 'esm')) {
      return context.templateVariant as TemplateVariant;
    }

    return undefined;
  } catch (error) {
    console.warn(`Failed to read template override from ${contextPath}:`, error);
    return undefined;
  }
}

/**
 * Save template variant selection to .artk/context.json
 * Updates existing context or creates new one
 *
 * @param projectRoot - Path to project root directory
 * @param variant - Template variant to save
 */
export function saveTemplateVariant(projectRoot: string, variant: TemplateVariant): void {
  const artkDir = path.join(projectRoot, '.artk');
  const contextPath = path.join(artkDir, 'context.json');

  // Ensure .artk directory exists
  if (!fs.existsSync(artkDir)) {
    fs.mkdirSync(artkDir, { recursive: true });
  }

  // Read existing context or create new
  let context: Record<string, unknown> = {};
  if (fs.existsSync(contextPath)) {
    try {
      const content = fs.readFileSync(contextPath, 'utf8');
      context = JSON.parse(content);
    } catch (error) {
      console.warn(`Failed to read existing context from ${contextPath}, creating new:`, error);
    }
  }

  // Update templateVariant field
  context.templateVariant = variant;

  // Write back to file
  fs.writeFileSync(contextPath, JSON.stringify(context, null, 2), 'utf8');
}
