/**
 * ARTK Init Command - Multi-step wizard for initializing ARTK
 *
 * Uses bundled assets for installation - no npm registry access required.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { installBundled, type BundledInstallOptions } from '../installer';
import { getWorkspaceContextManager } from '../workspace';
import type { InitOptions } from '../types';

// Module-level extension context reference
let extensionContext: vscode.ExtensionContext | undefined;

/**
 * Set the extension context (called during activation)
 */
export function setExtensionContext(context: vscode.ExtensionContext): void {
  extensionContext = context;
}

/**
 * Get the extension context
 */
function getExtensionContext(): vscode.ExtensionContext | undefined {
  return extensionContext;
}

interface VariantOption {
  label: string;
  description: string;
  value: InitOptions['variant'];
}

const VARIANT_OPTIONS: VariantOption[] = [
  {
    label: '$(sparkle) Auto-detect (Recommended)',
    description: 'Automatically detect Node.js version and module system',
    value: 'auto',
  },
  {
    label: 'Modern ESM',
    description: 'Node.js 18+ with ES Modules',
    value: 'modern-esm',
  },
  {
    label: 'Modern CJS',
    description: 'Node.js 18+ with CommonJS',
    value: 'modern-cjs',
  },
  {
    label: 'Legacy Node 16',
    description: 'Node.js 16+ with CommonJS',
    value: 'legacy-16',
  },
  {
    label: 'Legacy Node 14',
    description: 'Node.js 14+ with CommonJS',
    value: 'legacy-14',
  },
];

/**
 * Run the init wizard
 */
export async function runInitWizard(): Promise<void> {
  const workspaceFolders = vscode.workspace.workspaceFolders;

  // Step 1: Select target directory
  let targetPath: string;

  if (!workspaceFolders || workspaceFolders.length === 0) {
    // No workspace open - ask user to open a folder
    const openFolder = await vscode.window.showInformationMessage(
      'No workspace folder open. Would you like to open a folder?',
      'Open Folder',
      'Cancel'
    );

    if (openFolder === 'Open Folder') {
      await vscode.commands.executeCommand('vscode.openFolder');
    }
    return;
  } else if (workspaceFolders.length === 1) {
    targetPath = workspaceFolders[0].uri.fsPath;
  } else {
    // Multiple workspace folders - let user choose
    const selected = await vscode.window.showQuickPick(
      workspaceFolders.map((f) => ({
        label: f.name,
        description: f.uri.fsPath,
        folder: f,
      })),
      {
        title: 'ARTK: Select Project Folder',
        placeHolder: 'Choose which folder to initialize ARTK in',
      }
    );

    if (!selected) {
      return;
    }
    targetPath = selected.folder.uri.fsPath;
  }

  // Check if already installed
  const contextManager = getWorkspaceContextManager();
  if (contextManager.isInstalled) {
    const reinstall = await vscode.window.showWarningMessage(
      'ARTK is already installed in this workspace. Do you want to reinstall?',
      'Reinstall',
      'Cancel'
    );

    if (reinstall !== 'Reinstall') {
      return;
    }
  }

  // Step 2: Select variant
  const variantSelection = await vscode.window.showQuickPick(
    VARIANT_OPTIONS.map((opt) => ({
      label: opt.label,
      description: opt.description,
      value: opt.value,
    })),
    {
      title: 'ARTK: Select Build Variant',
      placeHolder: 'Choose the variant for your environment',
    }
  );

  if (!variantSelection) {
    return;
  }

  // Step 4: Additional options
  const options = await collectOptions();
  if (!options) {
    return; // User cancelled
  }

  // Step 5: Confirmation
  const confirmMessage = buildConfirmationMessage(targetPath, variantSelection.value, options);
  const confirm = await vscode.window.showInformationMessage(
    confirmMessage,
    { modal: true },
    'Install'
  );

  if (confirm !== 'Install') {
    return;
  }

  // Step 5: Run installation using bundled assets
  const installOptions: BundledInstallOptions = {
    targetPath,
    variant: variantSelection.value,
    ...options,
    force: contextManager.isInstalled, // Force if reinstalling
  };

  // Get extension context for accessing bundled assets
  const extensionContext = getExtensionContext();
  if (!extensionContext) {
    vscode.window.showErrorMessage('Failed to get extension context');
    return;
  }

  const result = await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Installing ARTK...',
      cancellable: false,
    },
    async (progress) => {
      return await installBundled(extensionContext, installOptions, progress);
    }
  );

  if (result.success) {
    // Refresh workspace context
    contextManager.refresh();

    // Show success message with next steps
    const action = await vscode.window.showInformationMessage(
      'ARTK installed successfully! Run discovery to get started.',
      'Open Dashboard',
      'View Documentation'
    );

    if (action === 'Open Dashboard') {
      await vscode.commands.executeCommand('artk.openDashboard');
    } else if (action === 'View Documentation') {
      const docPath = path.join(targetPath, 'artk-e2e', 'docs', 'README.md');
      const docUri = vscode.Uri.file(docPath);
      try {
        await vscode.commands.executeCommand('markdown.showPreview', docUri);
      } catch {
        // Fallback to opening the file
        await vscode.workspace.openTextDocument(docUri);
      }
    }
  } else {
    vscode.window.showErrorMessage(`Failed to install ARTK: ${result.error}`);
  }
}

/**
 * Collect additional installation options
 */
async function collectOptions(): Promise<Partial<InitOptions> | undefined> {
  const optionItems = [
    {
      label: '$(package) Install npm dependencies',
      description: 'Run npm install after setup',
      picked: true,
      id: 'npm',
    },
    {
      label: '$(database) Initialize LLKB',
      description: 'Set up Lessons Learned Knowledge Base',
      picked: true,
      id: 'llkb',
    },
    {
      label: '$(browser) Install browsers',
      description: 'Install Playwright browsers',
      picked: true,
      id: 'browsers',
    },
    {
      label: '$(comment) Install AI prompts',
      description: 'Install GitHub Copilot prompts',
      picked: true,
      id: 'prompts',
    },
  ];

  const selected = await vscode.window.showQuickPick(optionItems, {
    title: 'ARTK: Installation Options',
    placeHolder: 'Select components to install (Space to toggle, Enter to confirm)',
    canPickMany: true,
  });

  if (!selected) {
    return undefined; // User cancelled
  }

  const selectedIds = new Set(selected.map((s) => s.id));

  return {
    skipNpm: !selectedIds.has('npm'),
    skipLlkb: !selectedIds.has('llkb'),
    skipBrowsers: !selectedIds.has('browsers'),
    noPrompts: !selectedIds.has('prompts'),
  };
}

/**
 * Build confirmation message
 */
function buildConfirmationMessage(
  targetPath: string,
  variant: InitOptions['variant'],
  options: Partial<InitOptions>
): string {
  const lines = [
    'Ready to install ARTK:',
    '',
    `📁 Target: ${targetPath}`,
    `🔧 Variant: ${variant}`,
    '',
    'Components:',
  ];

  if (!options.skipNpm) {
    lines.push('  ✓ npm dependencies');
  }
  if (!options.skipLlkb) {
    lines.push('  ✓ LLKB (Lessons Learned)');
  }
  if (!options.skipBrowsers) {
    lines.push('  ✓ Playwright browsers');
  }
  if (!options.noPrompts) {
    lines.push('  ✓ AI prompts');
  }

  return lines.join('\n');
}
