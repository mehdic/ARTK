/**
 * LLKB Pattern Promotion - Automated promotion of learned patterns to higher tiers
 * Implements the learning loop that improves coverage over time
 *
 * @see research/2026-02-03_multi-ai-debate-coverage-improvement.md
 */
import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import {
  loadLearnedPatterns,
  saveLearnedPatterns,
  generateRegexFromText,
  type LearnedPattern,
} from './patternExtension.js';
import { getLlkbRoot } from '../utils/paths.js';
import type { IRPrimitive } from '../ir/types.js';

/**
 * Promotion criteria configuration
 */
export interface PromotionCriteria {
  /** Minimum confidence score (default: 0.9) */
  minConfidence: number;
  /** Minimum number of successful uses (default: 5) */
  minSuccessCount: number;
  /** Minimum number of unique source journeys (default: 2) */
  minSourceJourneys: number;
  /** Maximum fail count allowed (default: 2) */
  maxFailCount: number;
  /** Minimum success rate (default: 0.85) */
  minSuccessRate: number;
}

/**
 * Default promotion criteria
 */
export const DEFAULT_PROMOTION_CRITERIA: PromotionCriteria = {
  minConfidence: 0.9,
  minSuccessCount: 5,
  minSourceJourneys: 2,
  maxFailCount: 2,
  minSuccessRate: 0.85,
};

/**
 * A promoted pattern ready for code generation
 */
export interface PromotedPatternDefinition {
  /** Pattern name for the code */
  name: string;
  /** The regex pattern */
  regex: string;
  /** The IR primitive type */
  primitiveType: IRPrimitive['type'];
  /** Example step text */
  example: string;
  /** Extraction logic description */
  extractionLogic: string;
  /** Source LLKB pattern ID */
  llkbPatternId: string;
  /** Confidence at promotion time */
  confidenceAtPromotion: number;
  /** Source journeys count */
  sourceJourneysCount: number;
  /** Promotion timestamp */
  promotedAt: string;
}

/**
 * Promotion report
 */
export interface PromotionReport {
  /** Timestamp of the analysis */
  analyzedAt: string;
  /** Total patterns analyzed */
  totalPatterns: number;
  /** Patterns that meet promotion criteria */
  promotablePatterns: PromotedPatternDefinition[];
  /** Patterns that are close to promotion (need more data) */
  nearPromotionPatterns: Array<{
    pattern: LearnedPattern;
    missingCriteria: string[];
    estimatedUsesNeeded: number;
  }>;
  /** Statistics */
  stats: {
    alreadyPromoted: number;
    eligibleForPromotion: number;
    nearPromotion: number;
    needsMoreData: number;
  };
}

/**
 * Generate a pattern name from step text
 */
function generatePatternName(text: string, primitiveType: string): string {
  // Clean the text and extract key words
  const words = text
    .toLowerCase()
    .replace(/["']/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2)
    .slice(0, 4);

  // Create camelCase name
  const baseName = words
    .map((w, i) => (i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join('');

  return `llkb-${primitiveType}-${baseName}`;
}

/**
 * Generate extraction logic description from primitive
 */
function generateExtractionLogic(primitive: IRPrimitive): string {
  const type = primitive.type;

  switch (type) {
    case 'click':
    case 'dblclick':
    case 'rightClick':
    case 'hover':
    case 'focus':
    case 'clear':
    case 'check':
    case 'uncheck':
      return `Extract locator from match groups, return { type: '${type}', locator: { strategy, value } }`;
    case 'fill':
      return `Extract locator and value from match groups, return { type: 'fill', locator, value: { type: 'literal', value } }`;
    case 'goto':
      return `Extract URL/path from match groups, return { type: 'goto', url }`;
    case 'expectVisible':
    case 'expectNotVisible':
    case 'expectHidden':
    case 'expectEnabled':
    case 'expectDisabled':
      return `Extract locator from match groups, return { type: '${type}', locator }`;
    case 'expectText':
    case 'expectContainsText':
      return `Extract locator and text from match groups, return { type: '${type}', locator, text }`;
    case 'waitForTimeout':
      return `Extract milliseconds from match groups, return { type: 'waitForTimeout', ms }`;
    case 'waitForNetworkIdle':
      return `Return { type: 'waitForNetworkIdle' }`;
    case 'waitForVisible':
    case 'waitForHidden':
      return `Extract locator from match groups, return { type: '${type}', locator }`;
    case 'select':
      return `Extract locator and option from match groups, return { type: 'select', locator, option }`;
    case 'press':
      return `Extract key from match groups, return { type: 'press', key }`;
    default:
      return `Extract parameters from match groups, return primitive`;
  }
}

/**
 * Check if a pattern meets promotion criteria
 */
export function meetsPromotionCriteria(
  pattern: LearnedPattern,
  criteria: PromotionCriteria = DEFAULT_PROMOTION_CRITERIA
): { meets: boolean; missingCriteria: string[] } {
  const missingCriteria: string[] = [];

  if (pattern.confidence < criteria.minConfidence) {
    missingCriteria.push(`confidence: ${(pattern.confidence * 100).toFixed(1)}% < ${(criteria.minConfidence * 100).toFixed(1)}%`);
  }

  if (pattern.successCount < criteria.minSuccessCount) {
    missingCriteria.push(`successCount: ${pattern.successCount} < ${criteria.minSuccessCount}`);
  }

  if (pattern.sourceJourneys.length < criteria.minSourceJourneys) {
    missingCriteria.push(`sourceJourneys: ${pattern.sourceJourneys.length} < ${criteria.minSourceJourneys}`);
  }

  if (pattern.failCount > criteria.maxFailCount) {
    missingCriteria.push(`failCount: ${pattern.failCount} > ${criteria.maxFailCount}`);
  }

  const successRate = pattern.successCount / (pattern.successCount + pattern.failCount || 1);
  if (successRate < criteria.minSuccessRate) {
    missingCriteria.push(`successRate: ${(successRate * 100).toFixed(1)}% < ${(criteria.minSuccessRate * 100).toFixed(1)}%`);
  }

  return {
    meets: missingCriteria.length === 0,
    missingCriteria,
  };
}

/**
 * Estimate how many more uses needed for promotion
 */
function estimateUsesNeeded(
  pattern: LearnedPattern,
  criteria: PromotionCriteria
): number {
  const needed: number[] = [];

  // Success count needed
  if (pattern.successCount < criteria.minSuccessCount) {
    needed.push(criteria.minSuccessCount - pattern.successCount);
  }

  // Confidence needed (rough estimate)
  if (pattern.confidence < criteria.minConfidence) {
    // Estimate successes needed to reach target confidence
    // Using simplified Wilson score approximation
    const targetSuccesses = Math.ceil(
      criteria.minSuccessCount * (1 + pattern.failCount / 5)
    );
    needed.push(Math.max(0, targetSuccesses - pattern.successCount));
  }

  return Math.max(...needed, 1);
}

/**
 * Analyze patterns and generate promotion report
 */
export function analyzeForPromotion(options: {
  llkbRoot?: string;
  criteria?: Partial<PromotionCriteria>;
}): PromotionReport {
  const criteria: PromotionCriteria = {
    ...DEFAULT_PROMOTION_CRITERIA,
    ...options.criteria,
  };

  const patterns = loadLearnedPatterns({ llkbRoot: options.llkbRoot });

  const promotablePatterns: PromotedPatternDefinition[] = [];
  const nearPromotionPatterns: PromotionReport['nearPromotionPatterns'] = [];

  let alreadyPromoted = 0;
  let needsMoreData = 0;

  for (const pattern of patterns) {
    if (pattern.promotedToCore) {
      alreadyPromoted++;
      continue;
    }

    const { meets, missingCriteria } = meetsPromotionCriteria(pattern, criteria);

    if (meets) {
      // Pattern is ready for promotion
      promotablePatterns.push({
        name: generatePatternName(pattern.originalText, pattern.mappedPrimitive.type),
        regex: generateRegexFromText(pattern.originalText),
        primitiveType: pattern.mappedPrimitive.type,
        example: pattern.originalText,
        extractionLogic: generateExtractionLogic(pattern.mappedPrimitive),
        llkbPatternId: pattern.id,
        confidenceAtPromotion: pattern.confidence,
        sourceJourneysCount: pattern.sourceJourneys.length,
        promotedAt: new Date().toISOString(),
      });
    } else if (missingCriteria.length <= 2 && pattern.successCount >= 2) {
      // Pattern is close to promotion
      nearPromotionPatterns.push({
        pattern,
        missingCriteria,
        estimatedUsesNeeded: estimateUsesNeeded(pattern, criteria),
      });
    } else {
      needsMoreData++;
    }
  }

  return {
    analyzedAt: new Date().toISOString(),
    totalPatterns: patterns.length,
    promotablePatterns,
    nearPromotionPatterns,
    stats: {
      alreadyPromoted,
      eligibleForPromotion: promotablePatterns.length,
      nearPromotion: nearPromotionPatterns.length,
      needsMoreData,
    },
  };
}

/**
 * Generate TypeScript code for promoted patterns
 */
export function generatePromotedPatternsCode(
  patterns: PromotedPatternDefinition[]
): string {
  if (patterns.length === 0) {
    return '// No patterns ready for promotion\n';
  }

  const lines: string[] = [
    '/**',
    ' * LLKB-Promoted Patterns',
    ` * Generated at: ${new Date().toISOString()}`,
    ' * Review and merge into patterns.ts after validation',
    ' */',
    '',
    "import type { StepPattern } from './patterns.js';",
    '',
    'export const llkbPromotedPatterns: StepPattern[] = [',
  ];

  for (const pattern of patterns) {
    lines.push('  {');
    lines.push(`    name: '${pattern.name}',`);
    lines.push(`    regex: /${pattern.regex}/i,`);
    lines.push(`    primitiveType: '${pattern.primitiveType}',`);
    lines.push('    extract: (match: RegExpMatchArray) => {');
    lines.push(`      // ${pattern.extractionLogic}`);
    lines.push(`      // Example: "${pattern.example}"`);
    lines.push(`      // LLKB Pattern ID: ${pattern.llkbPatternId}`);
    lines.push(`      // Confidence at promotion: ${(pattern.confidenceAtPromotion * 100).toFixed(1)}%`);
    // Generate actual JavaScript code, not JSON
    lines.push(`      ${generateExtractorCode(pattern.primitiveType)}`);
    lines.push('    },');
    lines.push('  },');
  }

  lines.push('];');
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate JavaScript extractor code for a primitive type
 * Returns actual executable code, not JSON-serialized strings
 */
function generateExtractorCode(type: IRPrimitive['type']): string {
  switch (type) {
    case 'click':
    case 'dblclick':
    case 'rightClick':
    case 'hover':
    case 'focus':
    case 'clear':
    case 'check':
    case 'uncheck':
      return `return { type: '${type}', locator: { strategy: 'text', value: match[1] || 'element' } };`;

    case 'fill':
      return `return { type: 'fill', locator: { strategy: 'text', value: match[1] || 'field' }, value: { type: 'literal', value: match[2] || '' } };`;

    case 'goto':
      return `return { type: 'goto', url: match[1] || '/' };`;

    case 'expectVisible':
    case 'expectNotVisible':
    case 'expectHidden':
    case 'expectEnabled':
    case 'expectDisabled':
    case 'waitForVisible':
    case 'waitForHidden':
      return `return { type: '${type}', locator: { strategy: 'text', value: match[1] || 'element' } };`;

    case 'expectText':
    case 'expectContainsText':
      return `return { type: '${type}', locator: { strategy: 'text', value: match[1] || 'element' }, text: match[2] || '' };`;

    case 'waitForTimeout':
      return `return { type: 'waitForTimeout', ms: parseInt(match[1], 10) || 1000 };`;

    case 'waitForNetworkIdle':
      return `return { type: 'waitForNetworkIdle' };`;

    case 'select':
      return `return { type: 'select', locator: { strategy: 'text', value: match[1] || 'dropdown' }, option: match[2] || '' };`;

    case 'press':
      return `return { type: 'press', key: match[1] || 'Enter' };`;

    default:
      return `return { type: 'blocked', reason: 'Unknown type: ${type}', sourceText: match[0] || '' };`;
  }
}

/**
 * Export promotion report to file
 */
export function exportPromotionReport(
  report: PromotionReport,
  options: { outputDir?: string; llkbRoot?: string }
): { reportPath: string; codePath?: string } {
  const outputDir = options.outputDir || dirname(getLlkbRoot(options.llkbRoot));

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  // Write JSON report
  const reportPath = join(outputDir, `promotion-report-${timestamp}.json`);
  writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');

  // Write TypeScript code if there are promotable patterns
  let codePath: string | undefined;
  if (report.promotablePatterns.length > 0) {
    codePath = join(outputDir, `llkb-promoted-patterns-${timestamp}.ts`);
    const code = generatePromotedPatternsCode(report.promotablePatterns);
    writeFileSync(codePath, code, 'utf-8');
  }

  return { reportPath, codePath };
}

/**
 * Promote patterns and update LLKB storage
 */
export function promotePatterns(options: {
  llkbRoot?: string;
  patternIds?: string[];
  criteria?: Partial<PromotionCriteria>;
}): {
  promoted: string[];
  skipped: string[];
} {
  const patterns = loadLearnedPatterns({ llkbRoot: options.llkbRoot });
  const criteria: PromotionCriteria = {
    ...DEFAULT_PROMOTION_CRITERIA,
    ...options.criteria,
  };

  const promoted: string[] = [];
  const skipped: string[] = [];
  const now = new Date().toISOString();

  for (const pattern of patterns) {
    // Skip if already promoted
    if (pattern.promotedToCore) {
      continue;
    }

    // If specific IDs provided, only process those
    if (options.patternIds && !options.patternIds.includes(pattern.id)) {
      continue;
    }

    const { meets } = meetsPromotionCriteria(pattern, criteria);

    if (meets) {
      pattern.promotedToCore = true;
      pattern.promotedAt = now;
      promoted.push(pattern.id);
    } else {
      skipped.push(pattern.id);
    }
  }

  if (promoted.length > 0) {
    saveLearnedPatterns(patterns, { llkbRoot: options.llkbRoot });
  }

  return { promoted, skipped };
}

/**
 * Get promotion summary statistics
 */
export function getPromotionStats(options: { llkbRoot?: string }): {
  total: number;
  promoted: number;
  promotable: number;
  nearPromotion: number;
  needsWork: number;
  promotionRate: number;
} {
  const report = analyzeForPromotion(options);

  return {
    total: report.totalPatterns,
    promoted: report.stats.alreadyPromoted,
    promotable: report.stats.eligibleForPromotion,
    nearPromotion: report.stats.nearPromotion,
    needsWork: report.stats.needsMoreData,
    promotionRate: report.totalPatterns > 0
      ? (report.stats.alreadyPromoted + report.stats.eligibleForPromotion) / report.totalPatterns
      : 0,
  };
}
