/**
 * Interactive Prompts - User prompts for CLI commands
 *
 * Provides interactive prompts for CLI operations.
 * Falls back to defaults when stdin is not interactive.
 */

import * as readline from 'readline';

export interface PromptOptions {
  default?: string;
  validate?: (value: string) => boolean | string;
}

/**
 * Check if stdin is interactive (TTY)
 */
export function isInteractive(): boolean {
  return process.stdin.isTTY === true && process.stdout.isTTY === true;
}

/**
 * Prompt for text input
 */
export async function promptText(question: string, options: PromptOptions = {}): Promise<string> {
  if (!isInteractive()) {
    return options.default || '';
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    const defaultSuffix = options.default ? ` [${options.default}]` : '';
    rl.question(`${question}${defaultSuffix}: `, (answer) => {
      rl.close();
      const value = answer.trim() || options.default || '';

      if (options.validate) {
        const validationResult = options.validate(value);
        if (validationResult !== true) {
          console.error(`Invalid input: ${validationResult}`);
          resolve(options.default || '');
          return;
        }
      }

      resolve(value);
    });
  });
}

/**
 * Prompt for yes/no confirmation
 */
export async function promptConfirm(question: string, defaultValue: boolean = true): Promise<boolean> {
  if (!isInteractive()) {
    return defaultValue;
  }

  const suffix = defaultValue ? '[Y/n]' : '[y/N]';

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${question} ${suffix}: `, (answer) => {
      rl.close();
      const normalized = answer.trim().toLowerCase();

      if (normalized === '') {
        resolve(defaultValue);
      } else if (normalized === 'y' || normalized === 'yes') {
        resolve(true);
      } else if (normalized === 'n' || normalized === 'no') {
        resolve(false);
      } else {
        resolve(defaultValue);
      }
    });
  });
}

/**
 * Prompt for selection from options
 */
export async function promptSelect<T extends string>(
  question: string,
  options: Array<{ value: T; label: string }>,
  defaultIndex: number = 0
): Promise<T> {
  if (!isInteractive()) {
    return options[defaultIndex].value;
  }

  console.log(`\n${question}\n`);
  options.forEach((opt, index) => {
    const marker = index === defaultIndex ? '*' : ' ';
    console.log(`  ${marker} ${index + 1}. ${opt.label}`);
  });
  console.log();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`Enter choice [${defaultIndex + 1}]: `, (answer) => {
      rl.close();

      const trimmed = answer.trim();
      if (trimmed === '') {
        resolve(options[defaultIndex].value);
        return;
      }

      const choice = parseInt(trimmed, 10);
      if (isNaN(choice) || choice < 1 || choice > options.length) {
        console.log(`Invalid choice, using default: ${options[defaultIndex].label}`);
        resolve(options[defaultIndex].value);
        return;
      }

      resolve(options[choice - 1].value);
    });
  });
}

/**
 * Prompt for module system variant selection
 */
export async function promptVariant(): Promise<'commonjs' | 'esm'> {
  return promptSelect<'commonjs' | 'esm'>(
    'Select module system variant:',
    [
      { value: 'commonjs', label: 'CommonJS - Traditional Node.js modules (require/module.exports)' },
      { value: 'esm', label: 'ESM - Modern ES modules (import/export)' },
    ],
    0 // Default to CommonJS for maximum compatibility
  );
}

/**
 * Prompt for browser strategy selection
 */
export async function promptBrowserStrategy(): Promise<'auto' | 'bundled-only' | 'system-only' | 'prefer-system' | 'prefer-bundled'> {
  return promptSelect(
    'Select browser installation strategy:',
    [
      { value: 'auto' as const, label: 'Auto - Try bundled first, fall back to system browsers' },
      { value: 'bundled-only' as const, label: 'Bundled Only - Always use Playwright\'s bundled Chromium' },
      { value: 'system-only' as const, label: 'System Only - Only use installed browsers (Edge/Chrome)' },
      { value: 'prefer-system' as const, label: 'Prefer System - Try system first, fall back to bundled' },
      { value: 'prefer-bundled' as const, label: 'Prefer Bundled - Try bundled first, fall back to system' },
    ],
    0
  );
}
