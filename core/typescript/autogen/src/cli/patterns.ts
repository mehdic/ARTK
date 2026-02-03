/**
 * ARTK AutoGen CLI - Pattern Analysis Command
 * Analyzes blocked step telemetry to identify pattern gaps
 *
 * @see research/2026-01-27_autogen-empty-stubs-implementation-plan.md Phase 3
 * @see research/2026-02-03_multi-ai-debate-coverage-improvement.md
 */
import { parseArgs } from 'node:util';
import { createInterface } from 'node:readline';
import {
  analyzeBlockedPatterns,
  getTelemetryStats,
  readBlockedStepRecords,
  clearTelemetry,
  type PatternGap,
  type TelemetryStats,
} from '../mapping/telemetry.js';
import { PATTERN_VERSION, getAllPatternNames } from '../mapping/patterns.js';
import {
  analyzePatternGaps,
  suggestNewPatterns,
} from '../shared/blocked-step-telemetry.js';
import {
  analyzeForPromotion,
  exportPromotionReport,
  getPromotionStats,
} from '../llkb/patternPromotion.js';
import { getPatternStats } from '../llkb/patternExtension.js';

const PATTERNS_USAGE = `
Usage: artk-autogen patterns <subcommand> [options]

Subcommands:
  gaps        Analyze blocked steps and show pattern gaps
  suggest     Generate suggested patterns from telemetry (with regex)
  stats       Show telemetry statistics (combined: telemetry + LLKB)
  list        List all available patterns
  promotion   Show LLKB pattern promotion status and candidates
  export      Export gaps as JSON for pattern development
  clear       Clear telemetry data (use with caution)

Options:
  --dir, -d <path>    Base directory (default: current directory)
  --limit, -n <num>   Limit number of results (default: 20)
  --json              Output as JSON
  --category, -c      Filter by category (navigation|interaction|assertion|wait|unknown)
  --force, -f         Skip confirmation prompts (for clear command)
  --output, -o        Output directory for promotion reports
  -h, --help          Show this help message

Examples:
  artk-autogen patterns gaps                    # Show top 20 pattern gaps
  artk-autogen patterns gaps --limit 50         # Show top 50 pattern gaps
  artk-autogen patterns suggest                 # Get suggested patterns with regex
  artk-autogen patterns suggest --json          # Get suggestions as JSON
  artk-autogen patterns stats                   # Show combined statistics
  artk-autogen patterns promotion               # Show LLKB promotion candidates
  artk-autogen patterns promotion --json        # Export promotion report
  artk-autogen patterns list                    # List all patterns
  artk-autogen patterns export --json           # Export gaps as JSON
  artk-autogen patterns clear                   # Clear telemetry (with confirmation)
`;

/**
 * Format a pattern gap for console output
 */
function formatPatternGap(gap: PatternGap, index: number): string {
  const lines: string[] = [];
  lines.push(`  ${index + 1}. [${gap.count}x] "${gap.exampleText}"`);
  lines.push(`     Category: ${gap.category}`);
  lines.push(`     First seen: ${new Date(gap.firstSeen).toLocaleDateString()}`);

  if (gap.variants.length > 1) {
    lines.push(`     Variants: ${gap.variants.length} unique phrasings`);
    // Show first 3 variants
    for (const variant of gap.variants.slice(0, 3)) {
      if (variant !== gap.exampleText) {
        lines.push(`       - "${variant}"`);
      }
    }
    if (gap.variants.length > 3) {
      lines.push(`       ... and ${gap.variants.length - 3} more`);
    }
  }

  if (gap.suggestedPattern) {
    lines.push(`     Suggested pattern: ${gap.suggestedPattern}`);
  }

  return lines.join('\n');
}

/**
 * Format telemetry stats for console output
 */
function formatStats(stats: TelemetryStats): string {
  const lines: string[] = [];
  lines.push('\n📊 Blocked Steps Telemetry Statistics\n');
  lines.push(`  Total Records: ${stats.totalRecords}`);
  lines.push(`  Unique Patterns: ${stats.uniquePatterns}`);

  if (stats.totalRecords > 0) {
    lines.push('\n  By Category:');
    for (const [category, count] of Object.entries(stats.byCategory)) {
      const percentage = ((count / stats.totalRecords) * 100).toFixed(1);
      lines.push(`    ${category}: ${count} (${percentage}%)`);
    }

    lines.push('\n  Date Range:');
    lines.push(`    Earliest: ${new Date(stats.dateRange.earliest).toLocaleString()}`);
    lines.push(`    Latest: ${new Date(stats.dateRange.latest).toLocaleString()}`);
  }

  return lines.join('\n');
}

/**
 * Run the patterns gaps subcommand
 */
async function runGaps(options: {
  baseDir?: string;
  limit: number;
  json: boolean;
  category?: string;
}): Promise<void> {
  let gaps = analyzeBlockedPatterns({
    baseDir: options.baseDir,
    limit: options.category ? undefined : options.limit, // Don't limit before filtering
  });

  // Filter by category if specified
  if (options.category) {
    gaps = gaps.filter((g) => g.category.toLowerCase().includes(options.category!.toLowerCase()));
    gaps = gaps.slice(0, options.limit);
  }

  if (gaps.length === 0) {
    console.log('\n✅ No blocked step gaps found. Either no blocked steps have been recorded,');
    console.log('   or all steps have been successfully matched to patterns.\n');
    return;
  }

  if (options.json) {
    console.log(JSON.stringify(gaps, null, 2));
    return;
  }

  console.log(`\n🔍 Top ${gaps.length} Pattern Gaps (from blocked steps)\n`);
  console.log(`Pattern Version: ${PATTERN_VERSION}\n`);

  for (let i = 0; i < gaps.length; i++) {
    console.log(formatPatternGap(gaps[i]!, i));
    console.log();
  }

  console.log('💡 To add these patterns, edit: autogen/src/mapping/patterns.ts');
  console.log('   Use the suggested patterns as starting points.\n');
}

/**
 * Run the patterns list subcommand
 */
async function runList(options: { json: boolean }): Promise<void> {
  const patternNames = getAllPatternNames();

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          version: PATTERN_VERSION,
          count: patternNames.length,
          patterns: patternNames,
        },
        null,
        2
      )
    );
    return;
  }

  console.log(`\n📋 Available Patterns (v${PATTERN_VERSION})\n`);
  console.log(`Total: ${patternNames.length} patterns\n`);

  // Group by category
  const groups: Record<string, string[]> = {};
  for (const name of patternNames) {
    const category = name.split('-')[0] || 'other';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(name);
  }

  for (const [category, names] of Object.entries(groups).sort()) {
    console.log(`  ${category}:`);
    for (const name of names) {
      console.log(`    - ${name}`);
    }
    console.log();
  }
}

/**
 * Run the patterns export subcommand
 */
async function runExport(options: { baseDir?: string }): Promise<void> {
  const gaps = analyzeBlockedPatterns({ baseDir: options.baseDir });
  const stats = getTelemetryStats({ baseDir: options.baseDir });
  const records = readBlockedStepRecords({ baseDir: options.baseDir });

  const exportData = {
    exportedAt: new Date().toISOString(),
    patternVersion: PATTERN_VERSION,
    statistics: stats,
    gaps,
    rawRecords: records,
  };

  console.log(JSON.stringify(exportData, null, 2));
}

/**
 * Prompt user for confirmation
 */
async function confirmAction(message: string): Promise<boolean> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Run the patterns clear subcommand
 */
async function runClear(options: { baseDir?: string; force?: boolean }): Promise<void> {
  const stats = getTelemetryStats({ baseDir: options.baseDir });

  if (stats.totalRecords === 0) {
    console.log('\n✅ No telemetry data to clear.\n');
    return;
  }

  console.log(`\n⚠️  This will delete ${stats.totalRecords} blocked step records.`);
  console.log('   This action cannot be undone.\n');

  // Require confirmation unless --force is specified
  if (!options.force) {
    const confirmed = await confirmAction('Are you sure you want to proceed?');
    if (!confirmed) {
      console.log('Operation cancelled.\n');
      return;
    }
  }

  clearTelemetry({ baseDir: options.baseDir });
  console.log('✅ Telemetry data cleared.\n');
}

/**
 * Run the patterns suggest subcommand
 */
async function runSuggest(options: { json: boolean; limit: number }): Promise<void> {
  const suggestions = suggestNewPatterns();

  if (suggestions.length === 0) {
    console.log('\n✅ No pattern suggestions available.');
    console.log('   Record more blocked steps to generate suggestions.\n');
    return;
  }

  const limitedSuggestions = suggestions.slice(0, options.limit);

  if (options.json) {
    console.log(JSON.stringify(limitedSuggestions, null, 2));
    return;
  }

  console.log(`\n💡 Suggested New Patterns (${limitedSuggestions.length} of ${suggestions.length})\n`);
  console.log('These patterns are generated from frequently blocked steps:\n');

  for (let i = 0; i < limitedSuggestions.length; i++) {
    const suggestion = limitedSuggestions[i]!;
    console.log(`  ${i + 1}. Pattern (${suggestion.coveredCount}x blocked)`);
    console.log(`     Regex: ${suggestion.suggestedRegex}`);
    console.log(`     Confidence: ${(suggestion.confidence * 100).toFixed(0)}%`);
    if (suggestion.examples.length > 0) {
      console.log('     Examples:');
      for (const example of suggestion.examples.slice(0, 3)) {
        console.log(`       - "${example}"`);
      }
    }
    console.log();
  }

  console.log('💡 Review these patterns and add validated ones to patterns.ts\n');
}

/**
 * Run the patterns promotion subcommand
 */
async function runPromotion(options: {
  baseDir?: string;
  json: boolean;
  outputDir?: string;
}): Promise<void> {
  // Get LLKB stats
  let llkbStats;
  try {
    llkbStats = getPatternStats({ llkbRoot: options.baseDir });
  } catch {
    llkbStats = null;
  }

  // Analyze for promotion
  let report;
  try {
    report = analyzeForPromotion({ llkbRoot: options.baseDir });
  } catch {
    report = null;
  }

  if (options.json) {
    console.log(JSON.stringify({
      llkbStats,
      promotionReport: report,
    }, null, 2));
    return;
  }

  console.log('\n📈 LLKB Pattern Promotion Status\n');

  if (!llkbStats || llkbStats.total === 0) {
    console.log('  No LLKB patterns recorded yet.');
    console.log('  Patterns are learned as tests are run and refined.\n');
    return;
  }

  console.log('  LLKB Statistics:');
  console.log(`    Total learned patterns: ${llkbStats.total}`);
  console.log(`    Already promoted: ${llkbStats.promoted}`);
  console.log(`    High confidence (≥0.7): ${llkbStats.highConfidence}`);
  console.log(`    Low confidence (<0.3): ${llkbStats.lowConfidence}`);
  console.log(`    Average confidence: ${(llkbStats.avgConfidence * 100).toFixed(1)}%`);
  console.log(`    Total successes: ${llkbStats.totalSuccesses}`);
  console.log(`    Total failures: ${llkbStats.totalFailures}\n`);

  if (report) {
    const stats = getPromotionStats({ llkbRoot: options.baseDir });

    console.log('  Promotion Analysis:');
    console.log(`    Eligible for promotion: ${stats.promotable}`);
    console.log(`    Near promotion (need more data): ${stats.nearPromotion}`);
    console.log(`    Need more work: ${stats.needsWork}`);
    console.log(`    Overall promotion rate: ${(stats.promotionRate * 100).toFixed(1)}%\n`);

    if (report.promotablePatterns.length > 0) {
      console.log('  🎯 Patterns Ready for Promotion:\n');
      for (const pattern of report.promotablePatterns.slice(0, 5)) {
        console.log(`    - ${pattern.name}`);
        console.log(`      Regex: ${pattern.regex}`);
        console.log(`      Type: ${pattern.primitiveType}`);
        console.log(`      Confidence: ${(pattern.confidenceAtPromotion * 100).toFixed(1)}%`);
        console.log(`      Example: "${pattern.example}"\n`);
      }

      if (report.promotablePatterns.length > 5) {
        console.log(`    ... and ${report.promotablePatterns.length - 5} more patterns\n`);
      }

      if (options.outputDir) {
        const { reportPath, codePath } = exportPromotionReport(report, { outputDir: options.outputDir });
        console.log(`  📄 Exported promotion report to: ${reportPath}`);
        if (codePath) {
          console.log(`  📄 Exported TypeScript code to: ${codePath}`);
        }
        console.log();
      }
    }

    if (report.nearPromotionPatterns.length > 0) {
      console.log('  📊 Patterns Near Promotion:\n');
      for (const near of report.nearPromotionPatterns.slice(0, 3)) {
        console.log(`    - "${near.pattern.originalText}"`);
        console.log(`      Missing: ${near.missingCriteria.join(', ')}`);
        console.log(`      Est. uses needed: ${near.estimatedUsesNeeded}\n`);
      }
    }
  }

  console.log('💡 Use "artk-autogen patterns promotion --json -o ./reports" to export detailed report\n');
}

/**
 * Run the enhanced stats subcommand (combined telemetry + LLKB)
 */
async function runEnhancedStats(options: { baseDir?: string; json: boolean }): Promise<void> {
  const telemetryStats = getTelemetryStats({ baseDir: options.baseDir });

  // Get shared telemetry stats
  let sharedStats;
  try {
    sharedStats = analyzePatternGaps();
  } catch {
    sharedStats = null;
  }

  // Get LLKB stats
  let llkbStats;
  try {
    llkbStats = getPatternStats({ llkbRoot: options.baseDir });
  } catch {
    llkbStats = null;
  }

  if (options.json) {
    console.log(JSON.stringify({
      telemetry: telemetryStats,
      sharedTelemetry: sharedStats,
      llkb: llkbStats,
    }, null, 2));
    return;
  }

  console.log(formatStats(telemetryStats));

  if (sharedStats && sharedStats.totalBlocked > 0) {
    console.log('\n📊 Shared Blocked Step Telemetry:\n');
    console.log(`  Total blocked steps: ${sharedStats.totalBlocked}`);
    console.log(`  Unique patterns: ${sharedStats.topPatterns.length}`);
    console.log('\n  Top blocked patterns:');
    for (const pattern of sharedStats.topPatterns.slice(0, 5)) {
      console.log(`    [${pattern.count}x] ${pattern.pattern.substring(0, 60)}...`);
    }
  }

  if (llkbStats && llkbStats.total > 0) {
    console.log('\n📚 LLKB Pattern Statistics:\n');
    console.log(`  Total learned: ${llkbStats.total}`);
    console.log(`  Promoted: ${llkbStats.promoted}`);
    console.log(`  High confidence: ${llkbStats.highConfidence}`);
    console.log(`  Avg confidence: ${(llkbStats.avgConfidence * 100).toFixed(1)}%`);
  }

  console.log();
}

/**
 * Main entry point for patterns command
 */
export async function runPatterns(args: string[]): Promise<void> {
  // Parse arguments
  const { values, positionals } = parseArgs({
    args,
    options: {
      dir: { type: 'string', short: 'd' },
      limit: { type: 'string', short: 'n', default: '20' },
      json: { type: 'boolean', default: false },
      category: { type: 'string', short: 'c' },
      force: { type: 'boolean', short: 'f', default: false },
      output: { type: 'string', short: 'o' },
      help: { type: 'boolean', short: 'h' },
    },
    allowPositionals: true,
  });

  if (values.help || positionals.length === 0) {
    console.log(PATTERNS_USAGE);
    return;
  }

  const subcommand = positionals[0];
  const options = {
    baseDir: values.dir,
    limit: parseInt(values.limit as string, 10) || 20,
    json: values.json as boolean,
    category: values.category as string | undefined,
    outputDir: values.output as string | undefined,
  };

  switch (subcommand) {
    case 'gaps':
      await runGaps(options);
      break;
    case 'suggest':
      await runSuggest({ json: options.json, limit: options.limit });
      break;
    case 'stats':
      await runEnhancedStats(options);
      break;
    case 'list':
      await runList(options);
      break;
    case 'promotion':
      await runPromotion(options);
      break;
    case 'export':
      await runExport(options);
      break;
    case 'clear':
      await runClear({ baseDir: options.baseDir, force: values.force as boolean });
      break;
    default:
      console.error(`Unknown subcommand: ${subcommand}`);
      console.log(PATTERNS_USAGE);
      process.exit(1);
  }
}
