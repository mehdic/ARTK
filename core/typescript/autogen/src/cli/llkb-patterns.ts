/**
 * ARTK AutoGen CLI - LLKB Patterns Command
 * Manage learned patterns from LLKB integration
 *
 * @see research/2026-01-27_autogen-empty-stubs-implementation-plan.md Phase 4
 */
import { parseArgs } from 'node:util';
import { createInterface } from 'node:readline';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

// __dirname may exist in CJS builds (injected by tsup/Node.js) but not in ESM
declare const __dirname: string | undefined;
import {
  loadLearnedPatterns,
  getPatternsFilePath,
  invalidatePatternCache,
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
  discover    Run full LLKB discovery pipeline on a project
  reseed      Re-apply universal seed patterns (restores seeds after clear)

Options:
  --llkb-root, -r <path>       LLKB root directory (default: .artk/llkb)
  --project-root, -p <path>    Project root directory (default: cwd, for discover)
  --limit, -n <num>            Limit number of results (default: 20)
  --min-confidence <num>       Minimum confidence threshold (default: varies by command)
  --json                       Output as JSON
  --force, -f                  Skip confirmation prompts (for clear command)
  -h, --help                   Show this help message

Examples:
  artk-autogen llkb-patterns list                    # List top 20 learned patterns
  artk-autogen llkb-patterns list --limit 50         # List top 50 patterns
  artk-autogen llkb-patterns stats                   # Show statistics
  artk-autogen llkb-patterns promote                 # Show promotable patterns
  artk-autogen llkb-patterns export                  # Export to config file
  artk-autogen llkb-patterns prune --min-confidence 0.3  # Remove low-confidence patterns
  artk-autogen llkb-patterns clear                   # Clear all patterns (with confirmation)
  artk-autogen llkb-patterns clear --force           # Clear all patterns (no confirmation)
  artk-autogen llkb-patterns discover                # Run discovery on current project
  artk-autogen llkb-patterns discover -p /path/to/project  # Discover with explicit project root
  artk-autogen llkb-patterns reseed                  # Re-apply 39 universal seed patterns
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
 * Run the clear subcommand
 */
async function runClear(options: { llkbRoot?: string; force?: boolean }): Promise<void> {
  const stats = getPatternStats({ llkbRoot: options.llkbRoot });

  if (stats.total === 0) {
    console.log('\n✅ No patterns to clear.\n');
    return;
  }

  console.log(`\n⚠️  This will delete ${stats.total} learned patterns.`);
  console.log('   This action cannot be undone.\n');

  // Require confirmation unless --force is specified
  if (!options.force) {
    const confirmed = await confirmAction('Are you sure you want to proceed?');
    if (!confirmed) {
      console.log('Operation cancelled.\n');
      return;
    }
  }

  clearLearnedPatterns({ llkbRoot: options.llkbRoot });
  console.log('✅ All learned patterns cleared.\n');
}

/**
 * Run the reseed subcommand — re-apply universal seed patterns.
 *
 * Seeds are written in persistence format (irPrimitive: string).
 * loadLearnedPatterns() normalizes them to runtime format on next load.
 * Existing patterns with matching normalizedText are not overwritten.
 */
async function runReseed(options: { llkbRoot?: string; json: boolean }): Promise<void> {
  // Read raw file to preserve existing pattern shapes
  const filePath = getPatternsFilePath(options.llkbRoot);
  const { existsSync: fileExists, readFileSync: readFile } = await import('node:fs');

   
  let rawPatterns: any[] = [];
  if (fileExists(filePath)) {
    try {
      const data = JSON.parse(readFile(filePath, 'utf-8'));
      rawPatterns = Array.isArray(data.patterns) ? data.patterns : [];
    } catch {
      // Corrupted file — start fresh
    }
  }

  // Resolve seed patterns from core LLKB
  const currentDir = getCurrentDir();
  const seedPaths = [
    path.resolve(currentDir, '..', '..', '..', 'dist', 'llkb', 'index.js'),
    path.resolve(currentDir, '..', '..', '..', 'llkb', 'universal-seeds.js'),
  ];

  let createSeeds: (() => Array<Record<string, unknown>>) | null = null;
  for (const seedPath of seedPaths) {
    try {
      const mod = await import(seedPath);
      createSeeds = mod.createUniversalSeedPatterns;
      break;
    } catch {
      // Try next
    }
  }

  if (!createSeeds) {
    console.error('❌ Could not resolve universal seeds module.');
    process.exit(1);
  }

  const seeds = createSeeds();
  const existingTexts = new Set(
    rawPatterns.map((p: Record<string, unknown>) =>
      (p.normalizedText as string) || ''
    )
  );
  let added = 0;
  let skipped = 0;

  for (const seed of seeds) {
    if (existingTexts.has(seed.normalizedText as string)) {
      skipped++;
    } else {
      // Add in persistence format — loadLearnedPatterns normalizes on load
      rawPatterns.push(seed);
      added++;
    }
  }

  // Write directly to file (persistence format)
  const data = {
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
    patterns: rawPatterns,
  };
  // Write raw to preserve existing shapes + seed persistence format
  const { writeFileSync: writeFile, mkdirSync: mkDir, renameSync: renameFile } = await import('node:fs');
  const dir = path.dirname(filePath);
  if (!fileExists(dir)) {
    mkDir(dir, { recursive: true });
  }
  const content = JSON.stringify(data, null, 2);
  const tempPath = `${filePath}.tmp.${Date.now()}`;
  writeFile(tempPath, content, 'utf-8');
  renameFile(tempPath, filePath);

  // Invalidate cache
  invalidatePatternCache();

  if (options.json) {
    console.log(JSON.stringify({ added, skipped, total: rawPatterns.length }));
    return;
  }

  console.log(`\n🌱 Universal seed patterns applied:`);
  console.log(`   Added:   ${added}`);
  console.log(`   Skipped: ${skipped} (already exist)`);
  console.log(`   Total:   ${rawPatterns.length} patterns\n`);
}

/** Result type for the pipeline module */
interface PipelineModule {
  runFullDiscoveryPipeline: (
    _projectRoot: string,
    _llkbDir: string,
    _options?: Record<string, unknown>
  ) => Promise<{
    success: boolean;
    profile: unknown;
    patternsFile: unknown;
    stats: {
      durationMs: number;
      patternSources: Record<string, number>;
      totalBeforeQC: number;
      totalAfterQC: number;
      mining: Record<string, number> | null;
    };
    warnings: string[];
    errors: string[];
  }>;
}

/**
 * Get the directory of the current module (ESM-safe).
 */
function getCurrentDir(): string {
  try {
    return path.dirname(fileURLToPath(import.meta.url));
  } catch {
    // Fallback for CJS (tsup CJS build injects __dirname)
    if (typeof __dirname === 'string') {
      return __dirname;
    }
    return process.cwd();
  }
}

/**
 * Resolve the core LLKB pipeline module.
 *
 * Tries multiple resolution strategies:
 * 1. Monorepo: autogen/dist/cli/ → core/typescript/dist/llkb/index.js (bundled barrel)
 * 2. Monorepo dev (tsx): autogen/src/cli/ → core/typescript/llkb/index.ts (source)
 * 3. Vendored: node_modules/@artk/core/dist/llkb/index.js
 */
async function resolvePipeline(): Promise<PipelineModule> {
  const currentDir = getCurrentDir();
  const tried: string[] = [];

  // Strategy 1: Monorepo built output
  // From autogen/dist/cli/ → ../../../dist/llkb/index.js
  const builtPath = path.resolve(currentDir, '..', '..', '..', 'dist', 'llkb', 'index.js');
  tried.push(builtPath);
  try {
    return await import(builtPath);
  } catch {
    // Not found, try next
  }

  // Strategy 2: Monorepo dev mode (running via tsx from source)
  // From autogen/src/cli/ → ../../../llkb/index.ts (ts-node/tsx resolves .ts)
  const devPath = path.resolve(currentDir, '..', '..', '..', 'llkb', 'index.js');
  tried.push(devPath);
  try {
    return await import(devPath);
  } catch {
    // Not found, try next
  }

  // Strategy 3: Vendored @artk/core (client project)
  // From node_modules/@artk/core-autogen/dist/cli/ → ../../core/dist/llkb/index.js
  const vendoredPath = path.resolve(currentDir, '..', '..', 'core', 'dist', 'llkb', 'index.js');
  tried.push(vendoredPath);
  try {
    return await import(vendoredPath);
  } catch {
    // Not found
  }

  throw new Error(
    'Could not resolve @artk/core LLKB pipeline module.\n' +
    'Ensure you are running from the ARTK monorepo or a project with @artk/core installed.\n' +
    `Tried:\n${tried.map(p => `  - ${p}`).join('\n')}`
  );
}

/**
 * Run the discover subcommand — full LLKB discovery pipeline
 */
async function runDiscover(options: {
  llkbRoot?: string;
  projectRoot?: string;
  json: boolean;
}): Promise<void> {
  const projectRoot = options.projectRoot
    ? path.resolve(options.projectRoot)
    : process.cwd();
  const llkbRoot = options.llkbRoot
    ? path.resolve(options.llkbRoot)
    : path.join(process.cwd(), '.artk', 'llkb');

  // Validate directories exist
  const { existsSync } = await import('node:fs');
  if (!existsSync(projectRoot)) {
    console.error(`❌ Project root does not exist: ${projectRoot}`);
    process.exit(1);
  }
  if (!existsSync(llkbRoot)) {
    console.error(`❌ LLKB root does not exist: ${llkbRoot}`);
    console.error(`   Run 'artk init' or 'artk llkb init' first to create the LLKB directory.`);
    process.exit(1);
  }

  if (!options.json) {
    console.log(`\n🔍 Running LLKB discovery pipeline...`);
    console.log(`   Project root: ${projectRoot}`);
    console.log(`   LLKB root:    ${llkbRoot}\n`);
  }

  let pipeline: PipelineModule;
  try {
    pipeline = await resolvePipeline();
  } catch (err) {
    console.error(`❌ ${err instanceof Error ? err.message : 'Failed to load pipeline module'}`);
    process.exit(1);
  }

  const result = await pipeline.runFullDiscoveryPipeline(projectRoot, llkbRoot);

  if (options.json) {
    console.log(JSON.stringify({
      success: result.success,
      stats: result.stats,
      warnings: result.warnings,
      errors: result.errors,
    }, null, 2));
    return;
  }

  if (!result.success) {
    console.error('❌ Discovery pipeline failed');
    for (const error of result.errors) {
      console.error(`   ${error}`);
    }
    process.exit(1);
  }

  const s = result.stats;
  const durationSec = (s.durationMs / 1000).toFixed(1);

  console.log(`✅ Discovery pipeline completed`);
  console.log(`   Duration: ${durationSec}s`);
  console.log(`   Patterns before QC: ${s.totalBeforeQC}`);
  console.log(`   Patterns after QC:  ${s.totalAfterQC}`);
  console.log();
  console.log(`📊 Pattern Sources:`);
  console.log(`   Discovery:       ${s.patternSources.discovery}`);
  console.log(`   Templates:       ${s.patternSources.templates}`);
  console.log(`   Framework Packs: ${s.patternSources.frameworkPacks}`);
  console.log(`   i18n:            ${s.patternSources.i18n}`);
  console.log(`   Analytics:       ${s.patternSources.analytics}`);
  console.log(`   Feature Flags:   ${s.patternSources.featureFlags}`);

  if (s.mining) {
    console.log();
    console.log(`⛏️  Mining Results:`);
    console.log(`   Entities: ${s.mining.entitiesFound} | Routes: ${s.mining.routesFound}`);
    console.log(`   Forms: ${s.mining.formsFound} | Tables: ${s.mining.tablesFound} | Modals: ${s.mining.modalsFound}`);
    console.log(`   Files scanned: ${s.mining.filesScanned}`);
  }

  if (result.warnings.length > 0) {
    console.log();
    console.log(`⚠️  Warnings:`);
    for (const warning of result.warnings) {
      console.log(`   ${warning}`);
    }
  }

  console.log();
}

/**
 * Main entry point for llkb-patterns command
 */
export async function runLlkbPatterns(args: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args,
    options: {
      'llkb-root': { type: 'string', short: 'r' },
      'project-root': { type: 'string', short: 'p' },
      limit: { type: 'string', short: 'n', default: '20' },
      'min-confidence': { type: 'string', default: '0.7' },
      'min-success': { type: 'string', default: '1' },
      'max-age-days': { type: 'string', default: '90' },
      output: { type: 'string', short: 'o' },
      json: { type: 'boolean', default: false },
      apply: { type: 'boolean', default: false },
      force: { type: 'boolean', short: 'f', default: false },
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
      await runClear({ llkbRoot: baseOptions.llkbRoot, force: values.force as boolean });
      break;

    case 'discover':
      await runDiscover({
        ...baseOptions,
        projectRoot: values['project-root'] as string | undefined,
      });
      break;

    case 'reseed':
      await runReseed(baseOptions);
      break;

    default:
      console.error(`Unknown subcommand: ${subcommand}`);
      console.log(LLKB_PATTERNS_USAGE);
      process.exit(1);
  }
}
