import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { stringify as stringifyYaml } from 'yaml';

// Get CURRENT_CONFIG_VERSION from config schema
const CURRENT_CONFIG_VERSION = 1;

export interface InstallOptions {
  /** Root directory to install into */
  rootDir: string;
  /** Project name (for config) */
  projectName?: string;
  /** Base URL for tests */
  baseUrl?: string;
  /** Test ID attribute */
  testIdAttribute?: string;
  /** Skip if already installed */
  skipIfExists?: boolean;
  /** Include example Journey */
  includeExample?: boolean;
  /** Force overwrite existing files */
  force?: boolean;
}

export interface InstallResult {
  success: boolean;
  created: string[];
  skipped: string[];
  errors: string[];
}

/**
 * Install ARTK autogen instance in a project
 */
export async function installAutogenInstance(
  options: InstallOptions
): Promise<InstallResult> {
  const {
    rootDir,
    projectName = 'my-project',
    baseUrl = 'http://localhost:3000',
    testIdAttribute = 'data-testid',
    skipIfExists = false,
    includeExample = true,
    force = false,
  } = options;

  const result: InstallResult = {
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
      const fullPath = join(rootDir, dir);
      if (existsSync(fullPath)) {
        if (skipIfExists && !force) {
          result.skipped.push(dir);
          continue;
        }
      } else {
        mkdirSync(fullPath, { recursive: true });
        result.created.push(dir);
      }
    }

    // 2. Create config file
    const configPath = join(rootDir, 'autogen.config.yml');
    if (!existsSync(configPath) || force) {
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

      writeFileSync(configPath, stringifyYaml(config));
      result.created.push('autogen.config.yml');
    } else if (skipIfExists) {
      result.skipped.push('autogen.config.yml');
    }

    // 3. Create .artk/.gitignore
    const gitignorePath = join(rootDir, '.artk/.gitignore');
    if (!existsSync(gitignorePath) || force) {
      writeFileSync(gitignorePath, [
        '# ARTK temporary files',
        'heal-logs/',
        '*.heal.json',
        'selector-catalog.local.json',
      ].join('\n'));
      result.created.push('.artk/.gitignore');
    } else if (skipIfExists) {
      result.skipped.push('.artk/.gitignore');
    }

    // 4. Create glossary.yml
    const glossaryPath = join(rootDir, '.artk/glossary.yml');
    if (!existsSync(glossaryPath) || force) {
      const glossary = {
        terms: [],
        aliases: {},
      };
      writeFileSync(glossaryPath, stringifyYaml(glossary));
      result.created.push('.artk/glossary.yml');
    } else if (skipIfExists) {
      result.skipped.push('.artk/glossary.yml');
    }

    // 5. Create example Journey (optional)
    if (includeExample) {
      const examplePath = join(rootDir, 'journeys/EXAMPLE-001.md');
      if (!existsSync(examplePath) || force) {
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
        writeFileSync(examplePath, exampleJourney);
        result.created.push('journeys/EXAMPLE-001.md');
      } else if (skipIfExists) {
        result.skipped.push('journeys/EXAMPLE-001.md');
      }
    }

    // 6. Create VS Code settings (optional)
    const vscodePath = join(rootDir, '.vscode');
    if (!existsSync(vscodePath)) {
      mkdirSync(vscodePath, { recursive: true });
    }

    const settingsPath = join(vscodePath, 'settings.json');
    if (!existsSync(settingsPath) || force) {
      const settings = {
        'files.associations': {
          '*.journey.md': 'markdown',
        },
        'editor.quickSuggestions': {
          strings: true,
        },
      };
      writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
      result.created.push('.vscode/settings.json');
    } else if (skipIfExists) {
      result.skipped.push('.vscode/settings.json');
    }

  } catch (error) {
    result.success = false;
    result.errors.push(String(error));
  }

  return result;
}
