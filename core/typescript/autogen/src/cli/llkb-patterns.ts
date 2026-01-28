/**
 * ARTK AutoGen CLI - LLKB Patterns Command
 * Manage learned patterns from LLKB integration
 *
 * @see research/2026-01-27_autogen-empty-stubs-implementation-plan.md Phase 4
 */
import { parseArgs } from 'node:util';
import {
  loadLearnedPatterns,
  getPromotablePatterns,
  markPatternsPromoted,
  prunePatterns,
  getPatternStats,
  exportPatternsToConfig,
  clearLearnedPatterns,
  type LearnedPattern,
  type PromotedPattern,
} from '../llkb/patternExtension.js';

const LLKB_PATTERNS_USAGE = `
Usage: artk-autogen llkb-patterns <subcommand> [options]

Subcommands:
  list        List all learned patterns
  stats       Show pattern statistics
  promote     Check and display patterns ready for promotion
  export      Export patterns to LLKB config format
  prune       Remove low-quality patterns
  clear       Clear all learned patterns (use with caution)

Options:
  --llkb-root, -r <path>    LLKB root directory (default: .artk/llkb)
  --limit, -n <num>         Limit number of results (default: 20)
  --min-confidence <num>    Minimum confidence threshold (default: varies by command)
  --json                    Output as JSON
  -h, --help                Show this help message

Examples:
  artk-autogen llkb-patterns list                    # List top 20 learned patterns
  artk-autogen llkb-patterns list --limit 50         # List top 50 patterns
  artk-autogen llkb-patterns stats                   # Show statistics
  artk-autogen llkb-patterns promote                 # Show promotable patterns
  artk-autogen llkb-patterns export                  # Export to config file
  artk-autogen llkb-patterns prune --min-confidence 0.3  # Remove low-confidence patterns
`;

/**
 * Format a learned pattern for console output
 */
function formatPattern(pattern: LearnedPattern, index: number): string {
  const lines: string[] = [];
  const confidenceStr = (pattern.confidence * 100).toFixed(0);
  const status = pattern.promotedToCore ? '[PROMOTED]' : '';

  lines.push(`  ${index + 1}. [${confidenceStr}%] "${pattern.originalText}" ${status}`);
  lines.push(`     ID: ${pattern.id}`);
  lines.push(`     Type: ${pattern.mappedPrimitive.type}`);
  lines.push(`     Success: ${pattern.successCount}, Fail: ${pattern.failCount}`);
  lines.push(`     Sources: ${pattern.sourceJourneys.length} journey(s)`);
  lines.push(`     Last used: ${new Date(pattern.lastUsed).toLocaleDateString()}`);

  return lines.join('\n');
}

/**
 * Format a promotable pattern for console output
 */
function formatPromotablePattern(promoted: PromotedPattern, index: number): string {
  const lines: string[] = [];
  const { pattern } = promoted;

  lines.push(`  ${index + 1}. "${pattern.originalText}"`);
  lines.push(`     ID: ${pattern.id}`);
  lines.push(`     Confidence: ${(pattern.confidence * 100).toFixed(0)}%`);
  lines.push(`     Priority: ${promoted.priority.toFixed(1)}`);
  lines.push(`     Generated regex: ${promoted.generatedRegex}`);
  lines.push(`     Primitive: ${JSON.stringify(pattern.mappedPrimitive)}`);

  return lines.join('\n');
}

/**
 * Run the list subcommand
 */
async function runList(options: {
  llkbRoot?: string;
  limit: number;
  json: boolean;
}): Promise<void> {
  const patterns = loadLearnedPatterns({ llkbRoot: options.llkbRoot });

  if (patterns.length === 0) {
    console.log('\n📚 No learned patterns found.');
    console.log('   Patterns are learned when tests pass after manual fixes.\n');
    return;
  }

  // Sort by confidence descending
  const sorted = patterns.sort((a, b) => b.confidence - a.confidence).slice(0, options.limit);

  if (options.json) {
    console.log(JSON.stringify(sorted, null, 2));
    return;
  }

  console.log(`\n📚 Learned Patterns (${sorted.length} of ${patterns.length})\n`);

  for (let i = 0; i < sorted.length; i++) {
    console.log(formatPattern(sorted[i]!, i));
    console.log();
  }
}

/**
 * Run the stats subcommand
 */
async function runStats(options: { llkbRoot?: string; json: boolean }): Promise<void> {
  const stats = getPatternStats({ llkbRoot: options.llkbRoot });

  if (options.json) {
    console.log(JSON.stringify(stats, null, 2));
    return;
  }

  console.log('\n📊 LLKB Pattern Statistics\n');
  console.log(`  Total patterns: ${stats.total}`);
  console.log(`  Promoted to core: ${stats.promoted}`);
  console.log(`  High confidence (≥70%): ${stats.highConfidence}`);
  console.log(`  Low confidence (<30%): ${stats.lowConfidence}`);
  console.log(`  Average confidence: ${(stats.avgConfidence * 100).toFixed(1)}%`);
  console.log(`  Total successes: ${stats.totalSuccesses}`);
  console.log(`  Total failures: ${stats.totalFailures}`);
  console.log();
}

/**
 * Run the promote subcommand
 */
async function runPromote(options: {
  llkbRoot?: string;
  json: boolean;
  apply: boolean;
}): Promise<void> {
  const promotable = getPromotablePatterns({ llkbRoot: options.llkbRoot });

  if (promotable.length === 0) {
    console.log('\n✅ No patterns ready for promotion.');
    console.log('   Patterns need ≥90% confidence, ≥5 successes, and ≥2 source journeys.\n');
    return;
  }

  if (options.json) {
    console.log(JSON.stringify(promotable, null, 2));
    return;
  }

  console.log(`\n🚀 Patterns Ready for Promotion (${promotable.length})\n`);

  for (let i = 0; i < promotable.length; i++) {
    console.log(formatPromotablePattern(promotable[i]!, i));
    console.log();
  }

  if (options.apply) {
    const ids = promotable.map((p) => p.pattern.id);
    markPatternsPromoted(ids, { llkbRoot: options.llkbRoot });
    console.log(`\n✅ Marked ${ids.length} patterns as promoted.\n`);
  } else {
    console.log('💡 Run with --apply to mark these patterns as promoted.\n');
  }
}

/**
 * Run the export subcommand
 */
async function runExport(options: {
  llkbRoot?: string;
  outputPath?: string;
  minConfidence: number;
}): Promise<void> {
  const result = exportPatternsToConfig({
    llkbRoot: options.llkbRoot,
    outputPath: options.outputPath,
    minConfidence: options.minConfidence,
  });

  console.log(`\n✅ Exported ${result.exported} patterns to: ${result.path}\n`);
}

/**
 * Run the prune subcommand
 */
async function runPrune(options: {
  llkbRoot?: string;
  minConfidence: number;
  minSuccess: number;
  maxAgeDays: number;
}): Promise<void> {
  const result = prunePatterns({
    llkbRoot: options.llkbRoot,
    minConfidence: options.minConfidence,
    minSuccess: options.minSuccess,
    maxAgeDays: options.maxAgeDays,
  });

  console.log(`\n🧹 Pruned ${result.removed} low-quality patterns.`);
  console.log(`   Remaining: ${result.remaining} patterns.\n`);
}

/**
 * Run the clear subcommand
 */
async function runClear(options: { llkbRoot?: string }): Promise<void> {
  const stats = getPatternStats({ llkbRoot: options.llkbRoot });

  if (stats.total === 0) {
    console.log('\n✅ No patterns to clear.\n');
    return;
  }

  console.log(`\n⚠️  This will delete ${stats.total} learned patterns.`);
  console.log('   This action cannot be undone.\n');

  clearLearnedPatterns({ llkbRoot: options.llkbRoot });
  console.log('✅ All learned patterns cleared.\n');
}

/**
 * Main entry point for llkb-patterns command
 */
export async function runLlkbPatterns(args: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args,
    options: {
      'llkb-root': { type: 'string', short: 'r' },
      limit: { type: 'string', short: 'n', default: '20' },
      'min-confidence': { type: 'string', default: '0.7' },
      'min-success': { type: 'string', default: '1' },
      'max-age-days': { type: 'string', default: '90' },
      output: { type: 'string', short: 'o' },
      json: { type: 'boolean', default: false },
      apply: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h' },
    },
    allowPositionals: true,
  });

  if (values.help || positionals.length === 0) {
    console.log(LLKB_PATTERNS_USAGE);
    return;
  }

  const subcommand = positionals[0];
  const baseOptions = {
    llkbRoot: values['llkb-root'] as string | undefined,
    json: values.json as boolean,
  };

  switch (subcommand) {
    case 'list':
      await runList({
        ...baseOptions,
        limit: parseInt(values.limit as string, 10) || 20,
      });
      break;

    case 'stats':
      await runStats(baseOptions);
      break;

    case 'promote':
      await runPromote({
        ...baseOptions,
        apply: values.apply as boolean,
      });
      break;

    case 'export':
      await runExport({
        llkbRoot: baseOptions.llkbRoot,
        outputPath: values.output as string | undefined,
        minConfidence: parseFloat(values['min-confidence'] as string) || 0.7,
      });
      break;

    case 'prune':
      await runPrune({
        llkbRoot: baseOptions.llkbRoot,
        minConfidence: parseFloat(values['min-confidence'] as string) || 0.3,
        minSuccess: parseInt(values['min-success'] as string, 10) || 1,
        maxAgeDays: parseInt(values['max-age-days'] as string, 10) || 90,
      });
      break;

    case 'clear':
      await runClear({ llkbRoot: baseOptions.llkbRoot });
      break;

    default:
      console.error(`Unknown subcommand: ${subcommand}`);
      console.log(LLKB_PATTERNS_USAGE);
      process.exit(1);
  }
}
