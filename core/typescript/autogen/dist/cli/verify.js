/**
 * CLI Verify Command - Run and verify generated tests
 * @see T096 - Create CLI entry point for verification
 */
import { parseArgs } from 'node:util';
import fg from 'fast-glob';
import { verifyJourneys } from '../index.js';
import { parseIntSafe } from '../utils/parsing.js';
const USAGE = `
Usage: artk-autogen verify [options] <journey-files...>

Generate and run Playwright tests from Journey files to verify they work.

Arguments:
  journey-files    Journey file paths or glob patterns

Options:
  -o, --output <dir>       Output directory for generated tests
  --heal                   Attempt to heal failing tests
  --max-heal <n>           Maximum healing attempts (default: 3)
  --stability              Run stability checks (repeat tests)
  --stability-runs <n>     Number of stability runs (default: 3)
  --format <type>          Output format: text, json (default: text)
  --reporter <name>        Playwright reporter (default: list)
  --timeout <ms>           Test timeout in milliseconds
  -q, --quiet              Suppress output except errors
  -h, --help               Show this help message

Examples:
  artk-autogen verify journeys/login.md
  artk-autogen verify "journeys/*.md" --heal
  artk-autogen verify journeys/login.md --stability --stability-runs 5
`;
export async function runVerify(args) {
    const { values, positionals } = parseArgs({
        args,
        options: {
            output: { type: 'string', short: 'o' },
            heal: { type: 'boolean', default: false },
            'max-heal': { type: 'string', default: '3' },
            stability: { type: 'boolean', default: false },
            'stability-runs': { type: 'string', default: '3' },
            format: { type: 'string', default: 'text' },
            reporter: { type: 'string', default: 'list' },
            timeout: { type: 'string' },
            quiet: { type: 'boolean', short: 'q', default: false },
            help: { type: 'boolean', short: 'h', default: false },
        },
        allowPositionals: true,
    });
    if (values.help) {
        console.log(USAGE);
        return;
    }
    if (positionals.length === 0) {
        console.error('Error: No journey files specified');
        console.log(USAGE);
        process.exit(1);
    }
    // Expand glob patterns
    const journeyFiles = await fg(positionals, {
        absolute: true,
    });
    if (journeyFiles.length === 0) {
        console.error('Error: No journey files found matching the patterns');
        process.exit(1);
    }
    if (!values.quiet && values.format === 'text') {
        console.log(`Verifying ${journeyFiles.length} journey(s)...`);
    }
    // Verify each journey
    const results = await verifyJourneys(journeyFiles, {
        outputDir: values.output,
        heal: values.heal,
        maxHealAttempts: parseIntSafe(values['max-heal'], 'max-heal', 3),
        checkStability: values.stability,
        stabilityRuns: parseIntSafe(values['stability-runs'], 'stability-runs', 3),
        reporter: values.reporter,
        timeout: values.timeout ? parseIntSafe(values.timeout, 'timeout', 30000) : undefined,
    });
    // Format output
    if (values.format === 'json') {
        const output = {};
        for (const [id, result] of results) {
            output[id] = result;
        }
        console.log(JSON.stringify(output, null, 2));
    }
    else {
        // Text format
        for (const [journeyId, result] of results) {
            const statusIcon = result.status === 'passed' ? '✓' : result.status === 'failed' ? '✗' : '⚠';
            if (!values.quiet || result.status !== 'passed') {
                console.log(`\n${statusIcon} ${journeyId}`);
                console.log(`  Status: ${result.status}`);
                console.log(`  Duration: ${result.duration}ms`);
                console.log(`  Tests: ${result.counts.passed}/${result.counts.total} passed`);
                if (result.counts.flaky > 0) {
                    console.log(`  Flaky: ${result.counts.flaky}`);
                }
                if (result.healing) {
                    console.log(`  Healing:`);
                    console.log(`    Attempted: ${result.healing.attempted}`);
                    console.log(`    Success: ${result.healing.success}`);
                    console.log(`    Attempts: ${result.healing.attempts}`);
                    if (result.healing.appliedFix) {
                        console.log(`    Applied: ${result.healing.appliedFix}`);
                    }
                }
                if (result.failures.tests.length > 0) {
                    console.log(`  Failures:`);
                    for (const testName of result.failures.tests.slice(0, 5)) {
                        const classification = result.failures.classifications[testName];
                        console.log(`    - ${testName}`);
                        if (classification) {
                            console.log(`      ${classification.category}: ${classification.explanation.substring(0, 100)}`);
                        }
                    }
                    if (result.failures.tests.length > 5) {
                        console.log(`    ... and ${result.failures.tests.length - 5} more`);
                    }
                }
                if (result.testFilePath && !values.quiet) {
                    console.log(`  Test file: ${result.testFilePath}`);
                }
            }
        }
        // Summary
        if (!values.quiet) {
            let passed = 0;
            let failed = 0;
            let healed = 0;
            for (const [, result] of results) {
                if (result.status === 'passed') {
                    passed++;
                }
                else {
                    failed++;
                }
                if (result.healing?.success) {
                    healed++;
                }
            }
            console.log(`\nSummary:`);
            console.log(`  Passed: ${passed}`);
            console.log(`  Failed: ${failed}`);
            if (healed > 0) {
                console.log(`  Healed: ${healed}`);
            }
        }
    }
    // Determine exit code
    let hasFailures = false;
    for (const [, result] of results) {
        if (result.status === 'failed' || result.status === 'error') {
            hasFailures = true;
            break;
        }
    }
    if (hasFailures) {
        process.exit(1);
    }
}
//# sourceMappingURL=verify.js.map