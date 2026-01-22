"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.installAutogenInstance = installAutogenInstance;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const yaml_1 = require("yaml");
// Get CURRENT_CONFIG_VERSION from config schema
const CURRENT_CONFIG_VERSION = 1;
/**
 * Install ARTK autogen instance in a project
 */
async function installAutogenInstance(options) {
    const { rootDir, projectName = 'my-project', baseUrl = 'http://localhost:3000', testIdAttribute = 'data-testid', skipIfExists = false, includeExample = true, force = false, } = options;
    const result = {
        success: true,
        created: [],
        skipped: [],
        errors: [],
    };
    try {
        // 1. Create directory structure
        const directories = [
            'journeys',
            'tests/journeys',
            'tests/modules',
            '.artk',
        ];
        for (const dir of directories) {
            const fullPath = (0, node_path_1.join)(rootDir, dir);
            if ((0, node_fs_1.existsSync)(fullPath)) {
                if (skipIfExists && !force) {
                    result.skipped.push(dir);
                    continue;
                }
            }
            else {
                (0, node_fs_1.mkdirSync)(fullPath, { recursive: true });
                result.created.push(dir);
            }
        }
        // 2. Create config file
        const configPath = (0, node_path_1.join)(rootDir, 'autogen.config.yml');
        if (!(0, node_fs_1.existsSync)(configPath) || force) {
            const config = {
                version: CURRENT_CONFIG_VERSION,
                project: projectName,
                baseUrl,
                testIdAttribute,
                paths: {
                    journeys: 'journeys',
                    tests: 'tests/journeys',
                    modules: 'tests/modules',
                },
                healing: {
                    enabled: true,
                    maxAttempts: 3,
                },
                validation: {
                    requireClarified: true,
                    forbiddenPatterns: [
                        'page\\.waitForTimeout',
                        'force:\\s*true',
                    ],
                },
            };
            (0, node_fs_1.writeFileSync)(configPath, (0, yaml_1.stringify)(config));
            result.created.push('autogen.config.yml');
        }
        else if (skipIfExists) {
            result.skipped.push('autogen.config.yml');
        }
        // 3. Create .artk/.gitignore
        const gitignorePath = (0, node_path_1.join)(rootDir, '.artk/.gitignore');
        if (!(0, node_fs_1.existsSync)(gitignorePath) || force) {
            (0, node_fs_1.writeFileSync)(gitignorePath, [
                '# ARTK temporary files',
                'heal-logs/',
                '*.heal.json',
                'selector-catalog.local.json',
            ].join('\n'));
            result.created.push('.artk/.gitignore');
        }
        else if (skipIfExists) {
            result.skipped.push('.artk/.gitignore');
        }
        // 4. Create glossary.yml
        const glossaryPath = (0, node_path_1.join)(rootDir, '.artk/glossary.yml');
        if (!(0, node_fs_1.existsSync)(glossaryPath) || force) {
            const glossary = {
                terms: [],
                aliases: {},
            };
            (0, node_fs_1.writeFileSync)(glossaryPath, (0, yaml_1.stringify)(glossary));
            result.created.push('.artk/glossary.yml');
        }
        else if (skipIfExists) {
            result.skipped.push('.artk/glossary.yml');
        }
        // 5. Create example Journey (optional)
        if (includeExample) {
            const examplePath = (0, node_path_1.join)(rootDir, 'journeys/EXAMPLE-001.md');
            if (!(0, node_fs_1.existsSync)(examplePath) || force) {
                const exampleJourney = `---
id: EXAMPLE-001
title: Example Journey
status: proposed
tier: smoke
scope: example
actor: user
tags:
  - example
  - smoke
tests: []
modules: []
---

# Example Journey

## Overview
This is an example Journey to demonstrate the format.

## Preconditions
- User is on the home page

## Acceptance Criteria
- [ ] AC1: User can see the welcome message

## Steps
1. Navigate to the home page
2. Verify the welcome message is visible
`;
                (0, node_fs_1.writeFileSync)(examplePath, exampleJourney);
                result.created.push('journeys/EXAMPLE-001.md');
            }
            else if (skipIfExists) {
                result.skipped.push('journeys/EXAMPLE-001.md');
            }
        }
        // 6. Create VS Code settings (optional)
        const vscodePath = (0, node_path_1.join)(rootDir, '.vscode');
        if (!(0, node_fs_1.existsSync)(vscodePath)) {
            (0, node_fs_1.mkdirSync)(vscodePath, { recursive: true });
        }
        const settingsPath = (0, node_path_1.join)(vscodePath, 'settings.json');
        if (!(0, node_fs_1.existsSync)(settingsPath) || force) {
            const settings = {
                'files.associations': {
                    '*.journey.md': 'markdown',
                },
                'editor.quickSuggestions': {
                    strings: true,
                },
                'chat.promptFilesRecommendations': {
                    'artk.init-playbook': true,
                    'artk.discover-foundation': true,
                    'artk.journey-propose': true,
                    'artk.journey-define': true,
                    'artk.journey-clarify': true,
                    'artk.testid-audit': true,
                    'artk.journey-implement': true,
                    'artk.journey-validate': true,
                    'artk.journey-verify': true,
                },
            };
            (0, node_fs_1.writeFileSync)(settingsPath, JSON.stringify(settings, null, 2));
            result.created.push('.vscode/settings.json');
        }
        else if (skipIfExists) {
            result.skipped.push('.vscode/settings.json');
        }
    }
    catch (error) {
        result.success = false;
        result.errors.push(String(error));
    }
    return result;
}
//# sourceMappingURL=install.js.map