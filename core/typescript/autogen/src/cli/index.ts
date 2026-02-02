#!/usr/bin/env node
/**
 * ARTK AutoGen CLI - Command-line interface for test generation
 */
import { VERSION } from '../index.js';

const USAGE = `
Usage: artk-autogen <command> [options]

Pipeline Commands (Hybrid Agentic Architecture):
  analyze        Analyze journey files and output structured analysis
  plan           Create test generation plan from analysis
  generate       Generate Playwright tests from plan (or journey files)
  run            Execute tests via Playwright
  refine         Analyze failures and generate refinement suggestions
  status         Show pipeline state
  clean          Clean autogen artifacts

Validation Commands:
  validate       Validate generated test code
  verify         Run and verify generated tests

Management Commands:
  install        Install ARTK autogen instance in a project
  upgrade        Upgrade ARTK autogen instance to new version
  patterns       Analyze blocked step telemetry and pattern gaps
  llkb-patterns  Manage learned patterns from LLKB integration

Options:
  -h, --help      Show this help message
  -v, --version   Show version

Examples:
  # Pipeline workflow
  artk-autogen analyze "journeys/*.md"
  artk-autogen plan --strategy scot
  artk-autogen generate --output tests/
  artk-autogen run tests/*.spec.ts
  artk-autogen refine
  artk-autogen status

  # Legacy workflow (still supported)
  artk-autogen generate journeys/login.md -o tests/ -m

  # Management
  artk-autogen install --dir ./my-project
  artk-autogen patterns gaps --limit 20
`;

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(USAGE);
    process.exit(0);
  }

  const command = args[0];

  // Check for global flags
  if (command === '-h' || command === '--help') {
    console.log(USAGE);
    process.exit(0);
  }

  if (command === '-v' || command === '--version') {
    console.log(`@artk/core-autogen v${VERSION}`);
    process.exit(0);
  }

  // Route to subcommands
  const subArgs = args.slice(1);

  try {
    switch (command) {
      // ─────────────────────────────────────────────────────────────────────
      // PIPELINE COMMANDS (Hybrid Agentic Architecture)
      // ─────────────────────────────────────────────────────────────────────
      case 'analyze': {
        const { runAnalyze } = await import('./analyze.js');
        await runAnalyze(subArgs);
        break;
      }
      case 'plan': {
        const { runPlan } = await import('./plan.js');
        await runPlan(subArgs);
        break;
      }
      case 'generate': {
        const { runGenerate } = await import('./generate.js');
        await runGenerate(subArgs);
        break;
      }
      case 'run': {
        const { runRun } = await import('./run.js');
        await runRun(subArgs);
        break;
      }
      case 'refine': {
        const { runRefine } = await import('./refine.js');
        await runRefine(subArgs);
        break;
      }
      case 'status': {
        const { runStatus } = await import('./status.js');
        await runStatus(subArgs);
        break;
      }
      case 'clean': {
        const { runClean } = await import('./clean.js');
        await runClean(subArgs);
        break;
      }
      // ─────────────────────────────────────────────────────────────────────
      // VALIDATION COMMANDS
      // ─────────────────────────────────────────────────────────────────────
      case 'validate': {
        const { runValidate } = await import('./validate.js');
        await runValidate(subArgs);
        break;
      }
      case 'verify': {
        const { runVerify } = await import('./verify.js');
        await runVerify(subArgs);
        break;
      }
      // ─────────────────────────────────────────────────────────────────────
      // MANAGEMENT COMMANDS
      // ─────────────────────────────────────────────────────────────────────
      case 'install': {
        const { runInstall } = await import('./install.js');
        await runInstall(subArgs);
        break;
      }
      case 'upgrade': {
        const { runUpgrade } = await import('./upgrade.js');
        await runUpgrade(subArgs);
        break;
      }
      case 'patterns': {
        const { runPatterns } = await import('./patterns.js');
        await runPatterns(subArgs);
        break;
      }
      case 'llkb-patterns': {
        const { runLlkbPatterns } = await import('./llkb-patterns.js');
        await runLlkbPatterns(subArgs);
        break;
      }
      default:
        console.error(`Unknown command: ${command}`);
        console.log(USAGE);
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
