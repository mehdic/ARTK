/**
 * CLI Clean Command - Clean autogen artifacts
 *
 * Part of the Hybrid Agentic architecture. Cleans all autogen
 * artifacts for a fresh start.
 *
 * @see research/2026-02-02_autogen-enhancement-implementation-plan.md
 */
import { parseArgs } from 'node:util';
import { readdirSync, rmSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  getAutogenDir,
  cleanAutogenArtifacts,
  hasAutogenArtifacts,
} from '../utils/paths.js';
import { resetPipelineState } from '../pipeline/state.js';
import { getTelemetry } from '../shared/telemetry.js';

// ═══════════════════════════════════════════════════════════════════════════
// USAGE
// ═══════════════════════════════════════════════════════════════════════════

const USAGE = `
Usage: artk-autogen clean [options]

Clean autogen artifacts for a fresh start.

Options:
  --dry-run              Show what would be deleted without deleting
  --keep-analysis        Keep analysis.json (only clean generated files)
  --keep-plan            Keep plan.json
  -f, --force            Skip confirmation
  -q, --quiet            Suppress output except errors
  -h, --help             Show this help message

Examples:
  artk-autogen clean
  artk-autogen clean --dry-run
  artk-autogen clean --keep-analysis
  artk-autogen clean --force
`;

// ═══════════════════════════════════════════════════════════════════════════
// CLEAN LOGIC
// ═══════════════════════════════════════════════════════════════════════════

function listArtifacts(): { path: string; size: number; isDir: boolean }[] {
  const autogenDir = getAutogenDir();
  if (!existsSync(autogenDir)) return [];

  const items: { path: string; size: number; isDir: boolean }[] = [];

  try {
    const entries = readdirSync(autogenDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(autogenDir, entry.name);
      const stat = statSync(fullPath);
      items.push({
        path: fullPath,
        size: entry.isDirectory() ? getDirSize(fullPath) : stat.size,
        isDir: entry.isDirectory(),
      });
    }
  } catch {
    // Directory read error
  }

  return items;
}

function getDirSize(dirPath: string): number {
  let size = 0;
  try {
    const entries = readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);
      if (entry.isDirectory()) {
        size += getDirSize(fullPath);
      } else {
        size += statSync(fullPath).size;
      }
    }
  } catch {
    // Ignore errors
  }
  return size;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMMAND
// ═══════════════════════════════════════════════════════════════════════════

export async function runClean(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      'dry-run': { type: 'boolean', default: false },
      'keep-analysis': { type: 'boolean', default: false },
      'keep-plan': { type: 'boolean', default: false },
      force: { type: 'boolean', short: 'f', default: false },
      quiet: { type: 'boolean', short: 'q', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
    allowPositionals: true,
  });

  if (values.help) {
    console.log(USAGE);
    return;
  }

  const dryRun = values['dry-run'];
  const keepAnalysis = values['keep-analysis'];
  const keepPlan = values['keep-plan'];
  const force = values.force;
  const quiet = values.quiet;

  // Initialize telemetry
  const telemetry = getTelemetry();
  await telemetry.load();
  const eventId = telemetry.trackCommandStart('clean');

  if (!hasAutogenArtifacts()) {
    if (!quiet) {
      console.log('No autogen artifacts to clean.');
    }
    telemetry.trackCommandEnd(eventId, true, { skipped: true, reason: 'no_artifacts' });
    await telemetry.save();
    return;
  }

  // List what will be deleted
  const artifacts = listArtifacts();
  const toDelete: typeof artifacts = [];
  const toKeep: typeof artifacts = [];

  for (const artifact of artifacts) {
    const name = artifact.path.split('/').pop() || '';

    if (keepAnalysis && name === 'analysis.json') {
      toKeep.push(artifact);
    } else if (keepPlan && name === 'plan.json') {
      toKeep.push(artifact);
    } else {
      toDelete.push(artifact);
    }
  }

  if (toDelete.length === 0) {
    if (!quiet) {
      console.log('Nothing to delete (all artifacts are marked to keep).');
    }
    telemetry.trackCommandEnd(eventId, true, { skipped: true, reason: 'nothing_to_delete' });
    await telemetry.save();
    return;
  }

  const totalSize = toDelete.reduce((sum, a) => sum + a.size, 0);

  // Show preview
  if (!quiet || dryRun) {
    console.log(dryRun ? 'Would delete:' : 'Will delete:');
    for (const artifact of toDelete) {
      const name = artifact.path.split('/').pop();
      const type = artifact.isDir ? '(dir)' : '';
      console.log(`  - ${name} ${type} [${formatSize(artifact.size)}]`);
    }
    console.log(`\nTotal: ${formatSize(totalSize)}`);

    if (toKeep.length > 0) {
      console.log('\nKeeping:');
      for (const artifact of toKeep) {
        const name = artifact.path.split('/').pop();
        console.log(`  - ${name}`);
      }
    }
  }

  if (dryRun) {
    telemetry.trackCommandEnd(eventId, true, { dryRun: true, wouldDelete: toDelete.length });
    await telemetry.save();
    return;
  }

  // Confirm unless forced
  if (!force && !quiet) {
    const readline = await import('node:readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise<string>((resolve) => {
      rl.question('\nProceed with deletion? [y/N] ', (ans) => {
        rl.close();
        resolve(ans);
      });
    });

    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
      console.log('Aborted.');
      telemetry.trackCommandEnd(eventId, true, { aborted: true });
      await telemetry.save();
      return;
    }
  }

  // Delete
  const deleted: string[] = [];
  const errors: string[] = [];

  for (const artifact of toDelete) {
    try {
      rmSync(artifact.path, { recursive: true });
      deleted.push(artifact.path);
    } catch (e) {
      errors.push(`Failed to delete ${artifact.path}: ${e}`);
    }
  }

  // Report
  if (!quiet) {
    console.log(`\nDeleted ${deleted.length} item(s)`);
    if (errors.length > 0) {
      console.error('\nErrors:');
      for (const err of errors) {
        console.error(`  ${err}`);
      }
    }
  }

  // Recreate empty directory structure if completely cleaned
  if (toKeep.length === 0) {
    await cleanAutogenArtifacts();
    // Reset pipeline state to initial
    await resetPipelineState();
    if (!quiet) {
      console.log('Recreated empty autogen directory.');
      console.log('Reset pipeline state to initial.');
    }
  }

  // Track command completion
  telemetry.trackCommandEnd(eventId, errors.length === 0, {
    deleted: deleted.length,
    kept: toKeep.length,
    errors: errors.length,
    totalSize,
    dryRun,
  });
  await telemetry.save();
}
