/**
 * ARTK AutoGen CLI - Pattern Analysis Command
 * Analyzes blocked step telemetry to identify pattern gaps
 *
 * @see research/2026-01-27_autogen-empty-stubs-implementation-plan.md Phase 3
 */
import { parseArgs } from 'node:util';
import {
  analyzeBlockedPatterns,
  getTelemetryStats,
  readBlockedStepRecords,
  clearTelemetry,
  type PatternGap,
  type TelemetryStats,
} from '../mapping/telemetry.js';
import { PATTERN_VERSION, getAllPatternNames } from '../mapping/patterns.js';

const PATTERNS_USAGE = `
Usage: artk-autogen patterns <subcommand> [options]

Subcommands:
  gaps        Analyze blocked steps and show pattern gaps
  stats       Show telemetry statistics
  list        List all available patterns
  export      Export gaps as JSON for pattern development
  clear       Clear telemetry data (use with caution)

Options:
  --dir, -d <path>    Base directory (default: current directory)
  --limit, -n <num>   Limit number of results (default: 20)
  --json              Output as JSON
  --category, -c      Filter by category (navigation|interaction|assertion|wait|unknown)
  -h, --help          Show this help message

Examples:
  artk-autogen patterns gaps                    # Show top 20 pattern gaps
  artk-autogen patterns gaps --limit 50         # Show top 50 pattern gaps
  artk-autogen patterns gaps --category click   # Show only click-related gaps
  artk-autogen patterns stats                   # Show telemetry statistics
  artk-autogen patterns list                    # List all patterns
  artk-autogen patterns export --json           # Export gaps as JSON
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
 * Run the patterns stats subcommand
 */
async function runStats(options: { baseDir?: string; json: boolean }): Promise<void> {
  const stats = getTelemetryStats({ baseDir: options.baseDir });

  if (options.json) {
    console.log(JSON.stringify(stats, null, 2));
    return;
  }

  console.log(formatStats(stats));
  console.log();
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
 * Run the patterns clear subcommand
 */
async function runClear(options: { baseDir?: string }): Promise<void> {
  const stats = getTelemetryStats({ baseDir: options.baseDir });

  if (stats.totalRecords === 0) {
    console.log('\n✅ No telemetry data to clear.\n');
    return;
  }

  console.log(`\n⚠️  This will delete ${stats.totalRecords} blocked step records.`);
  console.log('   This action cannot be undone.\n');

  // In CLI context, we proceed (user should have been warned by the help)
  clearTelemetry({ baseDir: options.baseDir });
  console.log('✅ Telemetry data cleared.\n');
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
  };

  switch (subcommand) {
    case 'gaps':
      await runGaps(options);
      break;
    case 'stats':
      await runStats(options);
      break;
    case 'list':
      await runList(options);
      break;
    case 'export':
      await runExport(options);
      break;
    case 'clear':
      await runClear(options);
      break;
    default:
      console.error(`Unknown subcommand: ${subcommand}`);
      console.log(PATTERNS_USAGE);
      process.exit(1);
  }
}
