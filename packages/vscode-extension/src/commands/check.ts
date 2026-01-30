/**
 * ARTK Check Command - Check prerequisites
 */

import * as vscode from 'vscode';
import { check } from '../cli';

/**
 * Run the check command
 */
export async function runCheck(): Promise<void> {
  const result = await check();

  if (!result.success) {
    vscode.window.showErrorMessage(`Failed to check prerequisites: ${result.error}`);
    return;
  }

  const prereqs = result.data;
  if (!prereqs) {
    vscode.window.showInformationMessage('Prerequisites check completed.');
    return;
  }

  // Build result message
  const lines: string[] = ['ARTK Prerequisites Check', ''];

  // Node.js
  if (prereqs.node.found) {
    const status = prereqs.node.meetsMinimum ? '✓' : '⚠';
    lines.push(`${status} Node.js: ${prereqs.node.version}`);
    if (!prereqs.node.meetsMinimum) {
      lines.push('   Node.js 14+ required');
    }
  } else {
    lines.push('✗ Node.js: Not found');
  }

  // npm
  if (prereqs.npm.found) {
    lines.push(`✓ npm: ${prereqs.npm.version}`);
  } else {
    lines.push('✗ npm: Not found');
  }

  // Browsers
  lines.push('');
  lines.push('Browsers:');
  if (prereqs.browsers.chromium) {
    lines.push('  ✓ Chromium (bundled)');
  }
  if (prereqs.browsers.msedge) {
    lines.push('  ✓ Microsoft Edge');
  }
  if (prereqs.browsers.chrome) {
    lines.push('  ✓ Google Chrome');
  }
  if (!prereqs.browsers.chromium && !prereqs.browsers.msedge && !prereqs.browsers.chrome) {
    lines.push('  ⚠ No browsers detected');
  }

  // Issues
  if (prereqs.issues.length > 0) {
    lines.push('');
    lines.push('Issues:');
    for (const issue of prereqs.issues) {
      lines.push(`  • ${issue}`);
    }
  }

  // Show in output channel
  const outputChannel = vscode.window.createOutputChannel('ARTK');
  outputChannel.clear();
  outputChannel.appendLine(lines.join('\n'));
  outputChannel.show();

  // Show notification
  if (prereqs.passed) {
    vscode.window.showInformationMessage('All prerequisites met!');
  } else {
    vscode.window.showWarningMessage(
      'Some prerequisites not met. See Output panel for details.',
      'Show Output'
    ).then((selection) => {
      if (selection === 'Show Output') {
        outputChannel.show();
      }
    });
  }
}
