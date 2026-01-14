/**
 * Logger - Colorful console output utilities
 */

import chalk from 'chalk';
import ora, { type Ora } from 'ora';

export class Logger {
  private spinner: Ora | null = null;
  private verbose: boolean;

  constructor(options: { verbose?: boolean } = {}) {
    this.verbose = options.verbose ?? false;
  }

  header(text: string): void {
    console.log('');
    console.log(chalk.green('╔' + '═'.repeat(text.length + 6) + '╗'));
    console.log(chalk.green('║   ') + chalk.bold.green(text) + chalk.green('   ║'));
    console.log(chalk.green('╚' + '═'.repeat(text.length + 6) + '╝'));
    console.log('');
  }

  step(current: number, total: number, message: string): void {
    this.stopSpinner();
    console.log(chalk.yellow(`[${current}/${total}]`) + ' ' + message);
  }

  startSpinner(message: string): void {
    this.stopSpinner();
    this.spinner = ora(message).start();
  }

  updateSpinner(message: string): void {
    if (this.spinner) {
      this.spinner.text = message;
    }
  }

  succeedSpinner(message?: string): void {
    if (this.spinner) {
      this.spinner.succeed(message);
      this.spinner = null;
    }
  }

  failSpinner(message?: string): void {
    if (this.spinner) {
      this.spinner.fail(message);
      this.spinner = null;
    }
  }

  stopSpinner(): void {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = null;
    }
  }

  info(message: string): void {
    console.log(chalk.cyan('ℹ') + ' ' + message);
  }

  success(message: string): void {
    console.log(chalk.green('✓') + ' ' + message);
  }

  warning(message: string): void {
    console.log(chalk.yellow('⚠') + ' ' + chalk.yellow(message));
  }

  error(message: string): void {
    console.log(chalk.red('✗') + ' ' + chalk.red(message));
  }

  debug(message: string): void {
    if (this.verbose) {
      console.log(chalk.gray('  ' + message));
    }
  }

  list(items: string[], indent: number = 2): void {
    const prefix = ' '.repeat(indent);
    for (const item of items) {
      console.log(prefix + chalk.dim('•') + ' ' + item);
    }
  }

  table(rows: Array<{ label: string; value: string }>): void {
    const maxLabelLength = Math.max(...rows.map((r) => r.label.length));
    for (const row of rows) {
      const paddedLabel = row.label.padEnd(maxLabelLength);
      console.log('  ' + chalk.dim(paddedLabel) + '  ' + row.value);
    }
  }

  nextSteps(steps: string[]): void {
    console.log('');
    console.log(chalk.cyan('Next steps:'));
    steps.forEach((step, i) => {
      console.log(chalk.dim(`  ${i + 1}.`) + ' ' + step);
    });
    console.log('');
  }

  blank(): void {
    console.log('');
  }

  divider(): void {
    console.log(chalk.dim('─'.repeat(50)));
  }
}

// Singleton instance for simple usage
export const logger = new Logger();
