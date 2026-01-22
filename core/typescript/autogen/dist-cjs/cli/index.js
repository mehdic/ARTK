#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * ARTK AutoGen CLI - Command-line interface for test generation
 */
const index_js_1 = require("../index.js");
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
        console.log(`@artk/core-autogen v${index_js_1.VERSION}`);
        process.exit(0);
    }
    // Route to subcommands
    const subArgs = args.slice(1);
    try {
        switch (command) {
            case 'install': {
                const { runInstall } = await Promise.resolve().then(() => __importStar(require('./install.js')));
                await runInstall(subArgs);
                break;
            }
            case 'upgrade': {
                const { runUpgrade } = await Promise.resolve().then(() => __importStar(require('./upgrade.js')));
                await runUpgrade(subArgs);
                break;
            }
            case 'generate': {
                const { runGenerate } = await Promise.resolve().then(() => __importStar(require('./generate.js')));
                await runGenerate(subArgs);
                break;
            }
            case 'validate': {
                const { runValidate } = await Promise.resolve().then(() => __importStar(require('./validate.js')));
                await runValidate(subArgs);
                break;
            }
            case 'verify': {
                const { runVerify } = await Promise.resolve().then(() => __importStar(require('./verify.js')));
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