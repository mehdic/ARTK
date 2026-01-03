#!/usr/bin/env node
/**
 * ARTK AutoGen CLI - Command-line interface for test generation
 */
import { VERSION } from '../index.js';
const USAGE = `
Usage: artk-autogen <command> [options]

Commands:
  install     Install ARTK autogen instance in a project
  upgrade     Upgrade ARTK autogen instance to new version
  generate    Generate Playwright tests from Journey files
  validate    Validate generated test code
  verify      Run and verify generated tests

Options:
  -h, --help      Show this help message
  -v, --version   Show version

Examples:
  artk-autogen install --dir ./my-project
  artk-autogen upgrade --dir ./my-project
  artk-autogen generate journeys/login.md
  artk-autogen validate tests/login.spec.ts
  artk-autogen verify journeys/login.md --heal
`;
async function main() {
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
            case 'generate': {
                const { runGenerate } = await import('./generate.js');
                await runGenerate(subArgs);
                break;
            }
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
            default:
                console.error(`Unknown command: ${command}`);
                console.log(USAGE);
                process.exit(1);
        }
    }
    catch (error) {
        console.error('Error:', error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}
main();
//# sourceMappingURL=index.js.map