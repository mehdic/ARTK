/**
 * Journey Commands
 *
 * Command handlers for journey validation and implementation.
 */

import * as vscode from 'vscode';
import { getWorkspaceContextManager } from '../workspace';
import { journeyValidate, journeyImplement, journeySummary } from '../cli';

/**
 * Run journey validation for all clarified journeys
 */
export async function runJourneyValidate(): Promise<void> {
  const contextManager = getWorkspaceContextManager();

  if (!contextManager.isInstalled) {
    vscode.window.showWarningMessage('ARTK is not installed in this workspace.');
    return;
  }

  const harnessRoot = contextManager.workspaceInfo?.artkE2ePath;
  if (!harnessRoot) {
    vscode.window.showErrorMessage('Could not find artk-e2e directory.');
    return;
  }

  // Get journey summary to find journeys to validate
  const summaryResult = await journeySummary(harnessRoot);
  if (!summaryResult.success || !summaryResult.stdout) {
    vscode.window.showErrorMessage('Failed to get journey summary.');
    return;
  }

  let summary;
  try {
    summary = JSON.parse(summaryResult.stdout);
  } catch {
    vscode.window.showErrorMessage('Failed to parse journey summary.');
    return;
  }

  const readyToImplement = summary.readyToImplement || [];
  if (readyToImplement.length === 0) {
    vscode.window.showInformationMessage('No journeys ready for validation. Journeys must be in "clarified" status.');
    return;
  }

  // Run validation
  const result = await journeyValidate({
    journeyIds: readyToImplement,
    harnessRoot,
    json: true,
  });

  if (result.success) {
    try {
      const validationResult = JSON.parse(result.stdout);
      const validCount = validationResult.results?.filter((r: { valid: boolean }) => r.valid).length ?? 0;
      const totalCount = validationResult.results?.length ?? readyToImplement.length;

      if (validCount === totalCount) {
        vscode.window.showInformationMessage(`All ${totalCount} journeys are valid and ready for implementation.`);
      } else {
        const invalidCount = totalCount - validCount;
        const action = await vscode.window.showWarningMessage(
          `${validCount}/${totalCount} journeys are valid. ${invalidCount} have validation errors.`,
          'View Details',
          'Dismiss'
        );

        if (action === 'View Details') {
          // Show validation results in output channel
          const channel = vscode.window.createOutputChannel('ARTK Validation');
          channel.clear();
          channel.appendLine('=== Journey Validation Results ===\n');

          for (const res of validationResult.results || []) {
            channel.appendLine(`Journey: ${res.journeyId}`);
            channel.appendLine(`  Valid: ${res.valid ? 'Yes' : 'No'}`);
            if (res.errors?.length) {
              channel.appendLine('  Errors:');
              for (const err of res.errors) {
                channel.appendLine(`    - ${err}`);
              }
            }
            if (res.warnings?.length) {
              channel.appendLine('  Warnings:');
              for (const warn of res.warnings) {
                channel.appendLine(`    - ${warn}`);
              }
            }
            channel.appendLine('');
          }

          channel.show();
        }
      }
    } catch {
      // If we can't parse JSON, show raw output
      vscode.window.showInformationMessage('Journey validation complete. Check output for details.');
    }
  } else {
    vscode.window.showErrorMessage(`Validation failed: ${result.error}`);
  }
}

/**
 * Arguments for journey implementation
 */
interface JourneyImplementArgs {
  journeyIds?: string[];
}

/**
 * Run journey implementation
 */
export async function runJourneyImplement(args?: JourneyImplementArgs): Promise<void> {
  const contextManager = getWorkspaceContextManager();

  if (!contextManager.isInstalled) {
    vscode.window.showWarningMessage('ARTK is not installed in this workspace.');
    return;
  }

  const harnessRoot = contextManager.workspaceInfo?.artkE2ePath;
  if (!harnessRoot) {
    vscode.window.showErrorMessage('Could not find artk-e2e directory.');
    return;
  }

  // Determine which journeys to implement
  let journeyIds = args?.journeyIds;

  if (!journeyIds || journeyIds.length === 0) {
    // Get journey summary to find journeys ready to implement
    const summaryResult = await journeySummary(harnessRoot);
    if (!summaryResult.success || !summaryResult.stdout) {
      vscode.window.showErrorMessage('Failed to get journey summary.');
      return;
    }

    let summary;
    try {
      summary = JSON.parse(summaryResult.stdout);
    } catch {
      vscode.window.showErrorMessage('Failed to parse journey summary.');
      return;
    }

    journeyIds = summary.readyToImplement || [];
    if (journeyIds.length === 0) {
      vscode.window.showInformationMessage(
        'No journeys ready for implementation. Journeys must be in "clarified" status.'
      );
      return;
    }

    // Confirm with user
    const confirm = await vscode.window.showInformationMessage(
      `Implement ${journeyIds.length} journey(s)?`,
      { detail: journeyIds.join(', ') },
      'Implement',
      'Select Journeys',
      'Cancel'
    );

    if (confirm === 'Cancel' || !confirm) {
      return;
    }

    if (confirm === 'Select Journeys') {
      // Let user select which journeys to implement
      const selected = await vscode.window.showQuickPick(
        journeyIds.map((id) => ({ label: id, picked: true })),
        {
          canPickMany: true,
          placeHolder: 'Select journeys to implement',
          title: 'ARTK: Select Journeys',
        }
      );

      if (!selected || selected.length === 0) {
        return;
      }

      journeyIds = selected.map((s) => s.label);
    }
  }

  // Run implementation
  const result = await journeyImplement({
    journeyIds,
    harnessRoot,
    verbose: true,
  });

  if (result.success) {
    const testsCreated = (result.stdout.match(/created:/gi) || []).length;
    vscode.window.showInformationMessage(
      `Journey implementation complete.${testsCreated > 0 ? ` ${testsCreated} test(s) created.` : ''}`
    );

    // Refresh views to show updated journey statuses
    contextManager.refresh();
  } else {
    const action = await vscode.window.showErrorMessage(
      `Implementation failed: ${result.error}`,
      'View Output',
      'Dismiss'
    );

    if (action === 'View Output') {
      const channel = vscode.window.createOutputChannel('ARTK Implementation');
      channel.clear();
      channel.appendLine('=== Journey Implementation Output ===\n');
      if (result.stdout) {
        channel.appendLine('STDOUT:');
        channel.appendLine(result.stdout);
        channel.appendLine('');
      }
      if (result.stderr) {
        channel.appendLine('STDERR:');
        channel.appendLine(result.stderr);
      }
      channel.show();
    }
  }
}
