/**
 * ARTK CLI - Doctor Command
 *
 * Diagnoses ARTK installation and detects variant mismatches.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { VariantId, ArtkContext } from '../utils/variant-types.js';
import {
  detectEnvironmentChange,
  hasExistingInstallation,
  getNodeMajorVersion,
} from '../utils/variant-detector.js';
import {
  getVariantDefinition,
  isVariantCompatible,
  MIN_NODE_VERSION,
} from '../utils/variant-definitions.js';
import { ArtkContextSchema } from '../utils/variant-schemas.js';

/**
 * Doctor command options.
 */
export interface DoctorOptions {
  targetPath: string;
  verbose?: boolean;
}

/**
 * Diagnostic check result.
 */
export interface DiagnosticCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  details?: string;
}

/**
 * Doctor command result.
 */
export interface DoctorResult {
  healthy: boolean;
  checks: DiagnosticCheck[];
  recommendations: string[];
  installedVariant?: VariantId;
  recommendedVariant?: VariantId;
}

/**
 * Execute the doctor command.
 */
export async function doctor(options: DoctorOptions): Promise<DoctorResult> {
  const { targetPath } = options;
  const checks: DiagnosticCheck[] = [];
  const recommendations: string[] = [];

  // Check 1: Target directory exists
  if (!fs.existsSync(targetPath)) {
    checks.push({
      name: 'Target Directory',
      status: 'fail',
      message: 'Target directory does not exist',
      details: targetPath,
    });

    return {
      healthy: false,
      checks,
      recommendations: ['Verify the target path is correct'],
    };
  }

  checks.push({
    name: 'Target Directory',
    status: 'pass',
    message: 'Directory exists',
  });

  // Check 2: Node.js version
  const nodeVersion = getNodeMajorVersion();

  if (nodeVersion < MIN_NODE_VERSION) {
    checks.push({
      name: 'Node.js Version',
      status: 'fail',
      message: `Node.js ${nodeVersion} is not supported`,
      details: `ARTK requires Node.js ${MIN_NODE_VERSION} or higher`,
    });

    return {
      healthy: false,
      checks,
      recommendations: [`Upgrade to Node.js ${MIN_NODE_VERSION} or higher`],
    };
  }

  checks.push({
    name: 'Node.js Version',
    status: 'pass',
    message: `Node.js ${nodeVersion} (${process.version})`,
  });

  // Check 3: ARTK installation exists
  if (!hasExistingInstallation(targetPath)) {
    checks.push({
      name: 'ARTK Installation',
      status: 'fail',
      message: 'ARTK is not installed',
      details: 'No .artk/context.json found',
    });

    return {
      healthy: false,
      checks,
      recommendations: ['Run `artk init` to install ARTK'],
    };
  }

  // Check 4: Context.json validity
  const contextPath = path.join(targetPath, '.artk', 'context.json');
  let context: ArtkContext | null = null;

  try {
    const content = fs.readFileSync(contextPath, 'utf-8');
    const data = JSON.parse(content);
    const result = ArtkContextSchema.safeParse(data);

    if (!result.success) {
      checks.push({
        name: 'Context File',
        status: 'fail',
        message: 'Invalid context.json format',
        details: result.error.message,
      });
      recommendations.push('Run `artk init --force` to reinitialize');
    } else {
      context = result.data;
      checks.push({
        name: 'Context File',
        status: 'pass',
        message: 'Valid context.json',
      });
    }
  } catch (error) {
    checks.push({
      name: 'Context File',
      status: 'fail',
      message: 'Cannot read context.json',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
    recommendations.push('Run `artk init --force` to reinitialize');
  }

  if (!context) {
    return {
      healthy: false,
      checks,
      recommendations,
    };
  }

  // Check 5: Variant compatibility
  const installedVariant = context.variant;
  const variantDef = getVariantDefinition(installedVariant);

  if (!isVariantCompatible(installedVariant, nodeVersion)) {
    checks.push({
      name: 'Variant Compatibility',
      status: 'fail',
      message: `Installed variant '${installedVariant}' is not compatible with Node.js ${nodeVersion}`,
      details: `This variant supports Node.js ${variantDef.nodeRange.join(', ')}`,
    });
    recommendations.push('Run `artk upgrade` to switch to a compatible variant');
  } else {
    checks.push({
      name: 'Variant Compatibility',
      status: 'pass',
      message: `Variant '${installedVariant}' is compatible with Node.js ${nodeVersion}`,
    });
  }

  // Check 6: Environment change detection
  const envChange = detectEnvironmentChange(targetPath);

  if (envChange.changed) {
    checks.push({
      name: 'Environment Match',
      status: 'warn',
      message: 'Environment has changed since installation',
      details: envChange.reason,
    });

    if (envChange.currentVariant !== envChange.previousVariant) {
      recommendations.push(
        `Environment changed. Consider running \`artk upgrade\` to switch from '${envChange.previousVariant}' to '${envChange.currentVariant}'`
      );
    }
  } else {
    checks.push({
      name: 'Environment Match',
      status: 'pass',
      message: 'Environment matches installed variant',
    });
  }

  // Check 7: Vendor directories exist
  const vendorCorePath = path.join(targetPath, 'artk-e2e', 'vendor', 'artk-core');
  const vendorAutogenPath = path.join(
    targetPath,
    'artk-e2e',
    'vendor',
    'artk-core-autogen'
  );

  const vendorCoreExists = fs.existsSync(vendorCorePath);
  const vendorAutogenExists = fs.existsSync(vendorAutogenPath);

  if (!vendorCoreExists || !vendorAutogenExists) {
    checks.push({
      name: 'Vendor Directories',
      status: 'fail',
      message: 'Vendor directories are missing',
      details: `artk-core: ${vendorCoreExists ? 'OK' : 'MISSING'}, artk-core-autogen: ${vendorAutogenExists ? 'OK' : 'MISSING'}`,
    });
    recommendations.push('Run `artk init --force` to reinstall vendor files');
  } else {
    checks.push({
      name: 'Vendor Directories',
      status: 'pass',
      message: 'Vendor directories exist',
    });
  }

  // Check 8: AI protection markers
  const readonlyPath = path.join(vendorCorePath, 'READONLY.md');
  const aiIgnorePath = path.join(vendorCorePath, '.ai-ignore');
  const featuresPath = path.join(vendorCorePath, 'variant-features.json');

  const hasReadonly = fs.existsSync(readonlyPath);
  const hasAiIgnore = fs.existsSync(aiIgnorePath);
  const hasFeatures = fs.existsSync(featuresPath);

  if (!hasReadonly || !hasAiIgnore || !hasFeatures) {
    checks.push({
      name: 'AI Protection Markers',
      status: 'warn',
      message: 'Some AI protection markers are missing',
      details: `READONLY.md: ${hasReadonly ? 'OK' : 'MISSING'}, .ai-ignore: ${hasAiIgnore ? 'OK' : 'MISSING'}, variant-features.json: ${hasFeatures ? 'OK' : 'MISSING'}`,
    });
    recommendations.push(
      'Run `artk init --force` to regenerate AI protection markers'
    );
  } else {
    checks.push({
      name: 'AI Protection Markers',
      status: 'pass',
      message: 'AI protection markers present',
    });
  }

  // Determine overall health
  const hasFails = checks.some((c) => c.status === 'fail');
  return {
    healthy: !hasFails,
    checks,
    recommendations,
    installedVariant,
    recommendedVariant: envChange.currentVariant,
  };
}

/**
 * Print doctor results.
 */
export function printDoctorResults(result: DoctorResult, verbose = false): void {
  console.log('\nARTK Doctor Report\n');
  console.log('='.repeat(50));

  for (const check of result.checks) {
    const icon =
      check.status === 'pass' ? '✓' : check.status === 'warn' ? '⚠' : '✗';
    const color =
      check.status === 'pass' ? '32' : check.status === 'warn' ? '33' : '31';

    console.log(`\x1b[${color}m${icon}\x1b[0m ${check.name}: ${check.message}`);

    if (verbose && check.details) {
      console.log(`  ${check.details}`);
    }
  }

  console.log('\n' + '='.repeat(50));

  if (result.installedVariant) {
    console.log(`Installed Variant: ${result.installedVariant}`);
  }

  if (
    result.recommendedVariant &&
    result.recommendedVariant !== result.installedVariant
  ) {
    console.log(`Recommended Variant: ${result.recommendedVariant}`);
  }

  if (result.recommendations.length > 0) {
    console.log('\nRecommendations:');
    for (const rec of result.recommendations) {
      console.log(`  • ${rec}`);
    }
  }

  console.log(
    `\nOverall Status: ${result.healthy ? '\x1b[32mHEALTHY\x1b[0m' : '\x1b[31mUNHEALTHY\x1b[0m'}`
  );
}

/**
 * CLI entry point for doctor command.
 */
export function parseDoctorArgs(args: string[]): DoctorOptions {
  const options: DoctorOptions = {
    targetPath: process.cwd(),
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg === '--help' || arg === '-h') {
      printDoctorHelp();
      process.exit(0);
    } else if (!arg?.startsWith('-') && arg) {
      options.targetPath = path.resolve(arg);
    }
  }

  return options;
}

/**
 * Print help for doctor command.
 */
function printDoctorHelp(): void {
  console.log(`
ARTK Doctor Command

Usage: artk doctor [path] [options]

Arguments:
  path              Target project path (default: current directory)

Options:
  --verbose, -v     Show detailed output
  --help, -h        Show this help message

Examples:
  artk doctor                      # Check current directory
  artk doctor ./my-project         # Check specific directory
  artk doctor --verbose            # Show detailed diagnostics
`);
}
