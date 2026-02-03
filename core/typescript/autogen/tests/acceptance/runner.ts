#!/usr/bin/env npx tsx
/**
 * Acceptance Test Runner
 *
 * Orchestrates end-to-end acceptance tests for the AutoGen pipeline.
 * Supports both automated (structural) and interactive (human verification) modes.
 *
 * Usage:
 *   npx tsx tests/acceptance/runner.ts --scenario scenarios/happy-path-login.yml
 *   npx tsx tests/acceptance/runner.ts --structural-only
 *   npx tsx tests/acceptance/runner.ts --interactive
 *
 * @see README.md for full documentation
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { execSync, spawnSync } from 'node:child_process';
import { parse as parseYaml } from 'yaml';
// readline used for future interactive mode
// import { createInterface } from 'node:readline';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface Check {
  id: string;
  name: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  path?: string;
  field?: string;
  pattern?: string;
  contains?: string;
  not_contains?: string;
  expected_stage?: string;
  expected_stages?: string[];
  min?: number;
  max?: number;
  prompt?: string;
  description?: string;
  optional?: boolean;
}

interface Checklist {
  stage: string;
  command: string;
  description: string;
  prerequisites?: string[];
  checks: Check[];
  error_cases?: unknown[];
}

interface Stage {
  stage: string;
  checklist: string;
  timeout: string;
  on_failure?: 'abort' | 'continue';
  allow_failure?: boolean;
  skip_human_checks_in_ci?: boolean;
  condition?: string;
  max_iterations?: number;
  loop_with?: string;
}

interface Scenario {
  name: string;
  description: string;
  journey: string;
  timeout: string;
  stages: Stage[];
  final_verification?: Check[];
  reporting?: {
    output_format: string[];
    output_path: string;
  };
}

interface CheckResult {
  check: Check;
  passed: boolean;
  message: string;
  skipped?: boolean;
}

interface StageResult {
  stage: string;
  passed: boolean;
  checks: CheckResult[];
  duration: number;
  error?: string;
}

interface ScenarioResult {
  scenario: string;
  passed: boolean;
  stages: StageResult[];
  totalDuration: number;
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════════

const ACCEPTANCE_DIR = dirname(new URL(import.meta.url).pathname);
const CLI_PATH = resolve(ACCEPTANCE_DIR, '../../dist/cli/index.js');

// ═══════════════════════════════════════════════════════════════════════════
// CHECK EXECUTORS
// ═══════════════════════════════════════════════════════════════════════════

type CheckExecutor = (_check: Check, _workDir: string, _options: RunOptions) => CheckResult;

const checkExecutors: Record<string, CheckExecutor> = {
  file_exists: (check, workDir, _options) => {
    const fullPath = join(workDir, check.path!);
    const exists = existsSync(fullPath);
    return {
      check,
      passed: exists,
      message: exists ? `File exists: ${check.path}` : `File not found: ${check.path}`,
    };
  },

  file_exists_pattern: (check, workDir, _options) => {
    try {
      const result = spawnSync('find', [workDir, '-path', `*/${check.pattern}`], {
        encoding: 'utf-8',
      });
      const found = result.stdout.trim().length > 0;
      return {
        check,
        passed: found,
        message: found
          ? `Found files matching: ${check.pattern}`
          : `No files match: ${check.pattern}`,
      };
    } catch {
      return { check, passed: false, message: `Error checking pattern: ${check.pattern}` };
    }
  },

  file_contains: (check, workDir, _options) => {
    try {
      const files = spawnSync('find', [workDir, '-path', `*/${check.pattern}`], {
        encoding: 'utf-8',
      }).stdout.trim().split('\n').filter(Boolean);

      for (const file of files) {
        const content = readFileSync(file, 'utf-8');
        if (content.includes(check.contains!)) {
          return { check, passed: true, message: `Found "${check.contains}" in ${file}` };
        }
      }
      return { check, passed: false, message: `"${check.contains}" not found in any matching file` };
    } catch {
      return { check, passed: false, message: `Error checking file contents` };
    }
  },

  file_not_contains: (check, workDir, _options) => {
    try {
      const files = spawnSync('find', [workDir, '-path', `*/${check.pattern}`], {
        encoding: 'utf-8',
      }).stdout.trim().split('\n').filter(Boolean);

      for (const file of files) {
        const content = readFileSync(file, 'utf-8');
        if (content.includes(check.not_contains!)) {
          return {
            check,
            passed: false,
            message: `Found forbidden "${check.not_contains}" in ${file}`,
          };
        }
      }
      return { check, passed: true, message: `No files contain "${check.not_contains}"` };
    } catch {
      return { check, passed: false, message: `Error checking file contents` };
    }
  },

  json_contains: (check, workDir, _options) => {
    try {
      const fullPath = join(workDir, check.path!);
      if (!existsSync(fullPath)) {
        return { check, passed: false, message: `File not found: ${check.path}` };
      }
      const content = JSON.parse(readFileSync(fullPath, 'utf-8'));
      const hasField = check.field!.split('.').reduce((obj, key) => obj?.[key], content) !== undefined;
      return {
        check,
        passed: hasField,
        message: hasField
          ? `Field "${check.field}" exists in ${check.path}`
          : `Field "${check.field}" not found in ${check.path}`,
      };
    } catch (err) {
      return { check, passed: false, message: `Error parsing JSON: ${err}` };
    }
  },

  json_array_length: (check, workDir, _options) => {
    try {
      const fullPath = join(workDir, check.path!);
      const content = JSON.parse(readFileSync(fullPath, 'utf-8'));
      const array = check.field!.split('.').reduce((obj, key) => obj?.[key], content);
      if (!Array.isArray(array)) {
        return { check, passed: false, message: `Field "${check.field}" is not an array` };
      }
      const meetsMin = check.min === undefined || array.length >= check.min;
      const meetsMax = check.max === undefined || array.length <= check.max;
      return {
        check,
        passed: meetsMin && meetsMax,
        message: `Array "${check.field}" has ${array.length} items (min: ${check.min ?? 'none'}, max: ${check.max ?? 'none'})`,
      };
    } catch (err) {
      return { check, passed: false, message: `Error: ${err}` };
    }
  },

  state_equals: (check, workDir, _options) => {
    try {
      const statePath = join(workDir, '.artk/autogen/pipeline-state.json');
      if (!existsSync(statePath)) {
        return { check, passed: false, message: 'Pipeline state file not found' };
      }
      const state = JSON.parse(readFileSync(statePath, 'utf-8'));
      const matches = state.stage === check.expected_stage;
      return {
        check,
        passed: matches,
        message: matches
          ? `State is "${check.expected_stage}"`
          : `State is "${state.stage}", expected "${check.expected_stage}"`,
      };
    } catch (err) {
      return { check, passed: false, message: `Error: ${err}` };
    }
  },

  state_in: (check, workDir, _options) => {
    try {
      const statePath = join(workDir, '.artk/autogen/pipeline-state.json');
      const state = JSON.parse(readFileSync(statePath, 'utf-8'));
      const matches = check.expected_stages!.includes(state.stage);
      return {
        check,
        passed: matches,
        message: matches
          ? `State "${state.stage}" is in allowed list`
          : `State "${state.stage}" not in ${check.expected_stages!.join(', ')}`,
      };
    } catch (err) {
      return { check, passed: false, message: `Error: ${err}` };
    }
  },

  state_history_contains: (check, workDir, _options) => {
    try {
      const statePath = join(workDir, '.artk/autogen/pipeline-state.json');
      const state = JSON.parse(readFileSync(statePath, 'utf-8'));
      const field = (check as { command?: string }).command;
      const found = state.history?.some((h: { command: string }) => h.command === field);
      return {
        check,
        passed: found,
        message: found
          ? `History contains command "${field}"`
          : `History does not contain command "${field}"`,
      };
    } catch (err) {
      return { check, passed: false, message: `Error: ${err}` };
    }
  },

  typescript_compiles: (check, workDir, _options) => {
    try {
      execSync('npx tsc --noEmit', { cwd: workDir, encoding: 'utf-8', stdio: 'pipe' });
      return { check, passed: true, message: 'TypeScript compiles without errors' };
    } catch (err) {
      const error = err as { stderr?: string };
      return {
        check,
        passed: false,
        message: `TypeScript compilation failed: ${error.stderr?.slice(0, 200)}`,
      };
    }
  },

  human_verify: (check, _workDir, options) => {
    if (options.structuralOnly || options.ci) {
      return {
        check,
        passed: true,
        skipped: true,
        message: `Skipped human verification: ${check.name}`,
      };
    }

    // In interactive mode, prompt user
    if (options.interactive) {
      console.log('\n' + '═'.repeat(60));
      console.log('HUMAN VERIFICATION REQUIRED');
      console.log('═'.repeat(60));
      console.log(`Check: ${check.id} - ${check.name}`);
      console.log('');
      console.log(check.prompt || check.description || 'Please verify manually');
      console.log('');
      console.log('[P]ass  [F]ail  [S]kip');

      // For now, auto-skip in non-TTY
      if (!process.stdin.isTTY) {
        return {
          check,
          passed: true,
          skipped: true,
          message: 'Human verification skipped (non-interactive)',
        };
      }

      // Simple sync prompt (would need readline for real implementation)
      return {
        check,
        passed: true,
        skipped: true,
        message: 'Human verification pending (auto-skipped)',
      };
    }

    return {
      check,
      passed: true,
      skipped: true,
      message: 'Human verification skipped',
    };
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// RUNNER
// ═══════════════════════════════════════════════════════════════════════════

interface RunOptions {
  structuralOnly: boolean;
  interactive: boolean;
  ci: boolean;
  verbose: boolean;
  workDir: string;
}

function loadChecklist(path: string): Checklist {
  const fullPath = join(ACCEPTANCE_DIR, path);
  const content = readFileSync(fullPath, 'utf-8');
  return parseYaml(content) as Checklist;
}

function loadScenario(path: string): Scenario {
  const fullPath = path.startsWith('/') ? path : join(ACCEPTANCE_DIR, path);
  const content = readFileSync(fullPath, 'utf-8');
  return parseYaml(content) as Scenario;
}

function runCheck(check: Check, workDir: string, options: RunOptions): CheckResult {
  const executor = checkExecutors[check.type];
  if (!executor) {
    return {
      check,
      passed: false,
      message: `Unknown check type: ${check.type}`,
    };
  }

  try {
    return executor(check, workDir, options);
  } catch (err) {
    return {
      check,
      passed: false,
      message: `Check threw error: ${err}`,
    };
  }
}

function runStage(
  stage: Stage,
  workDir: string,
  journeyPath: string,
  options: RunOptions
): StageResult {
  const startTime = Date.now();
  const results: CheckResult[] = [];

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Stage: ${stage.stage.toUpperCase()}`);
  console.log(`${'─'.repeat(60)}`);

  // Load checklist
  const checklist = loadChecklist(stage.checklist);

  // Run the CLI command
  console.log(`Running: artk-autogen ${stage.stage} ${journeyPath}`);
  try {
    const args = stage.stage === 'analyze' ? [stage.stage, journeyPath] : [stage.stage];
    execSync(`node "${CLI_PATH}" ${args.join(' ')}`, {
      cwd: workDir,
      encoding: 'utf-8',
      stdio: options.verbose ? 'inherit' : 'pipe',
    });
    console.log(`✓ Command completed`);
  } catch (err) {
    if (!stage.allow_failure) {
      const error = err as { stderr?: string };
      console.log(`✗ Command failed: ${error.stderr?.slice(0, 100)}`);
      return {
        stage: stage.stage,
        passed: false,
        checks: [],
        duration: Date.now() - startTime,
        error: error.stderr?.slice(0, 500),
      };
    }
    console.log(`⚠ Command failed (allowed)`);
  }

  // Run checks
  for (const check of checklist.checks) {
    if (options.structuralOnly && check.type === 'human_verify') {
      results.push({
        check,
        passed: true,
        skipped: true,
        message: 'Skipped (structural-only mode)',
      });
      continue;
    }

    const result = runCheck(check, workDir, options);
    results.push(result);

    const icon = result.skipped ? '○' : result.passed ? '✓' : '✗';
    const severity = check.severity === 'critical' ? '[CRIT]' : `[${check.severity}]`;
    console.log(`  ${icon} ${severity} ${check.id}: ${check.name}`);
    if (!result.passed && !result.skipped && options.verbose) {
      console.log(`      ${result.message}`);
    }
  }

  const failed = results.filter((r) => !r.passed && !r.skipped && r.check.severity === 'critical');
  const passed = failed.length === 0;

  return {
    stage: stage.stage,
    passed,
    checks: results,
    duration: Date.now() - startTime,
  };
}

async function runScenario(scenarioPath: string, options: RunOptions): Promise<ScenarioResult> {
  const scenario = loadScenario(scenarioPath);
  const startTime = Date.now();
  const stageResults: StageResult[] = [];

  console.log('\n' + '═'.repeat(60));
  console.log(`SCENARIO: ${scenario.name}`);
  console.log('═'.repeat(60));
  console.log(scenario.description);

  // Setup work directory
  const workDir = options.workDir;
  mkdirSync(join(workDir, '.artk/autogen'), { recursive: true });
  mkdirSync(join(workDir, 'journeys'), { recursive: true });
  mkdirSync(join(workDir, 'tests'), { recursive: true });

  // Copy journey fixture
  const journeySource = join(ACCEPTANCE_DIR, scenario.journey);
  const journeyDest = join(workDir, 'journeys', 'test-journey.md');
  writeFileSync(journeyDest, readFileSync(journeySource, 'utf-8'));

  const journeyPath = 'journeys/test-journey.md';

  // Run stages
  for (const stage of scenario.stages) {
    const result = runStage(stage, workDir, journeyPath, options);
    stageResults.push(result);

    if (!result.passed && stage.on_failure === 'abort') {
      console.log(`\n⚠ Stage ${stage.stage} failed with abort policy. Stopping.`);
      break;
    }
  }

  // Calculate summary
  const allChecks = stageResults.flatMap((s) => s.checks);
  const summary = {
    total: allChecks.length,
    passed: allChecks.filter((c) => c.passed).length,
    failed: allChecks.filter((c) => !c.passed && !c.skipped).length,
    skipped: allChecks.filter((c) => c.skipped).length,
  };

  const passed = summary.failed === 0;

  // Final report
  console.log('\n' + '═'.repeat(60));
  console.log('SUMMARY');
  console.log('═'.repeat(60));
  console.log(`Total checks: ${summary.total}`);
  console.log(`Passed: ${summary.passed}`);
  console.log(`Failed: ${summary.failed}`);
  console.log(`Skipped: ${summary.skipped}`);
  console.log(`Duration: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
  console.log(`Result: ${passed ? '✓ PASSED' : '✗ FAILED'}`);

  return {
    scenario: scenario.name,
    passed,
    stages: stageResults,
    totalDuration: Date.now() - startTime,
    summary,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  const options: RunOptions = {
    structuralOnly: args.includes('--structural-only'),
    interactive: args.includes('--interactive'),
    ci: args.includes('--ci') || process.env.CI === 'true',
    verbose: args.includes('--verbose') || args.includes('-v'),
    workDir: '',
  };

  // Get scenario path
  const scenarioIndex = args.indexOf('--scenario');
  const scenarioPath = scenarioIndex >= 0 ? args[scenarioIndex + 1] : 'scenarios/happy-path-login.yml';

  // Create temp work directory
  const tmpDir = join(
    process.env.TMPDIR || '/tmp',
    `acceptance-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  options.workDir = tmpDir;
  mkdirSync(tmpDir, { recursive: true });

  console.log(`Work directory: ${tmpDir}`);

  try {
    const result = await runScenario(scenarioPath, options);
    process.exit(result.passed ? 0 : 1);
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
}

main();
