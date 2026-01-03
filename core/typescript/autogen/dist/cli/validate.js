/**
 * CLI Validate Command - Validate generated test code
 * @see T095 - Create CLI entry point for validation
 */
import { parseArgs } from 'node:util';
import { glob } from 'fast-glob';
import { validateJourneys } from '../index.js';
const USAGE = `
Usage: artk-autogen validate [options] <files...>

Validate journey files or generated test code.

Arguments:
  files    Journey files or test files to validate

Options:
  --lint             Run ESLint checks (slower but more thorough)
  --format <type>    Output format: text, json, or summary (default: text)
  --strict           Fail on warnings too
  -q, --quiet        Only show errors
  -h, --help         Show this help message

Examples:
  artk-autogen validate journeys/login.md
  artk-autogen validate "journeys/*.md" --lint
  artk-autogen validate journeys/*.md --format json
`;
export async function runValidate(args) {
    const { values, positionals } = parseArgs({
        args,
        options: {
            lint: { type: 'boolean', default: false },
            format: { type: 'string', default: 'text' },
            strict: { type: 'boolean', default: false },
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
        console.error('Error: No files specified');
        console.log(USAGE);
        process.exit(1);
    }
    // Expand glob patterns
    const files = await glob(positionals, {
        absolute: true,
    });
    if (files.length === 0) {
        console.error('Error: No files found matching the patterns');
        process.exit(1);
    }
    if (!values.quiet && values.format === 'text') {
        console.log(`Validating ${files.length} file(s)...`);
    }
    // Validate each file
    const results = await validateJourneys(files, {
        runLint: values.lint,
    });
    // Format output
    if (values.format === 'json') {
        const output = {};
        for (const [id, result] of results) {
            output[id] = result;
        }
        console.log(JSON.stringify(output, null, 2));
    }
    else if (values.format === 'summary') {
        let totalErrors = 0;
        let totalWarnings = 0;
        let passed = 0;
        let failed = 0;
        for (const [, result] of results) {
            totalErrors += result.counts.errors;
            totalWarnings += result.counts.warnings;
            if (result.valid) {
                passed++;
            }
            else {
                failed++;
            }
        }
        console.log(`\nValidation Summary:`);
        console.log(`  Passed: ${passed}`);
        console.log(`  Failed: ${failed}`);
        console.log(`  Total Errors: ${totalErrors}`);
        console.log(`  Total Warnings: ${totalWarnings}`);
    }
    else {
        // Text format
        for (const [journeyId, result] of results) {
            const status = result.valid ? '✓' : '✗';
            if (!values.quiet || !result.valid) {
                console.log(`\n${status} ${journeyId}`);
            }
            if (!result.valid || (result.counts.warnings > 0 && !values.quiet)) {
                for (const issue of result.issues) {
                    const icon = issue.severity === 'error' ? '  ✗' : issue.severity === 'warning' ? '  ⚠' : '  ℹ';
                    if (!values.quiet || issue.severity === 'error') {
                        console.log(`${icon} [${issue.code}] ${issue.message}`);
                        if (issue.field) {
                            console.log(`    field: ${issue.field}`);
                        }
                        if (issue.suggestion) {
                            console.log(`    → ${issue.suggestion}`);
                        }
                    }
                }
            }
        }
        // Summary
        if (!values.quiet) {
            let passed = 0;
            let failed = 0;
            for (const [, result] of results) {
                if (result.valid) {
                    passed++;
                }
                else {
                    failed++;
                }
            }
            console.log(`\n${passed} passed, ${failed} failed`);
        }
    }
    // Determine exit code
    let hasErrors = false;
    let hasWarnings = false;
    for (const [, result] of results) {
        if (!result.valid) {
            hasErrors = true;
        }
        if (result.counts.warnings > 0) {
            hasWarnings = true;
        }
    }
    if (hasErrors) {
        process.exit(1);
    }
    if (values.strict && hasWarnings) {
        process.exit(1);
    }
}
//# sourceMappingURL=validate.js.map