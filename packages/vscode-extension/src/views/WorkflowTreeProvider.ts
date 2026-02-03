/**
 * Workflow Tree View Provider
 *
 * Displays ARTK workflow steps in order with execute/edit buttons.
 * Each step can be run in Copilot Chat or edited before running.
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { getWorkspaceContextManager, WorkspaceContextManager } from '../workspace';

/**
 * Workflow step definition
 */
interface WorkflowStep {
  id: string;
  number: number;
  name: string;
  prompt: string;
  description: string;
  mandatory: boolean;
  runOnce?: boolean;
  runOnceMessage?: string;
  dependsOn?: string; // Step ID that must be completed first
}

/**
 * All ARTK workflow steps in order
 *
 * NOTE: These must match actual prompt files in assets/prompts/
 * Verified against: /artk.init-playbook, /artk.discover-foundation,
 * /artk.journey-propose, /artk.journey-define, /artk.journey-clarify,
 * /artk.testid-audit, /artk.journey-implement, /artk.journey-validate,
 * /artk.journey-verify
 */
const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    id: 'init-playbook',
    number: 1,
    name: 'Initialize Playbook',
    prompt: '/artk.init-playbook',
    description: 'Generate permanent guardrails (Copilot instructions + docs)',
    mandatory: true,
    runOnce: true,
    runOnceMessage: 'Only run once per project',
  },
  {
    id: 'discover-foundation',
    number: 2,
    name: 'Discover Foundation',
    prompt: '/artk.discover-foundation',
    description: 'Analyze app routes, features, auth, build foundation harness',
    mandatory: true,
    dependsOn: 'init-playbook',
  },
  {
    id: 'journey-propose',
    number: 3,
    name: 'Propose Journeys (Auto-create from app)',
    prompt: '/artk.journey-propose',
    description: 'Auto-propose Journeys from discovery results',
    mandatory: false, // Optional - user can manually create journeys
    dependsOn: 'discover-foundation',
  },
  {
    id: 'journey-define',
    number: 4,
    name: 'Define Journey',
    prompt: '/artk.journey-define',
    description: 'Create/promote Journey to canonical structure',
    mandatory: true,
    dependsOn: 'journey-propose',
  },
  {
    id: 'journey-clarify',
    number: 5,
    name: 'Clarify Journey',
    prompt: '/artk.journey-clarify',
    description: 'Add deterministic execution detail to Journey',
    mandatory: true,
    dependsOn: 'journey-define',
  },
  {
    id: 'testid-audit',
    number: 6,
    name: 'Audit Test IDs',
    prompt: '/artk.testid-audit',
    description: 'Audit and add data-testid attributes for reliable selectors',
    mandatory: false, // Recommended but optional
    dependsOn: 'journey-clarify',
  },
  {
    id: 'journey-implement',
    number: 7,
    name: 'Implement Journey',
    prompt: '/artk.journey-implement',
    description: 'Generate Playwright tests from Journey',
    mandatory: true,
    dependsOn: 'testid-audit',
  },
  {
    id: 'journey-validate',
    number: 8,
    name: 'Validate Journey',
    prompt: '/artk.journey-validate',
    description: 'Static validation gate for Journey',
    mandatory: true,
    dependsOn: 'journey-implement',
  },
  {
    id: 'journey-verify',
    number: 9,
    name: 'Verify Journey',
    prompt: '/artk.journey-verify',
    description: 'Runtime verification gate - run tests',
    mandatory: true,
    dependsOn: 'journey-validate',
  },
];

/**
 * Workflow tree item
 */
class WorkflowTreeItem extends vscode.TreeItem {
  constructor(
    public readonly step: WorkflowStep,
    public readonly isCompleted: boolean,
    public readonly isDisabled: boolean,
    public readonly disabledReason?: string
  ) {
    super(
      `${step.number}. ${step.name}`,
      vscode.TreeItemCollapsibleState.None
    );

    // Build description with mandatory/optional tag
    const tag = step.mandatory ? '(Required)' : '(Optional)';
    const statusTag = isCompleted && step.runOnce ? ' ✓ Done' : '';
    this.description = `${tag}${statusTag}`;

    // Tooltip with full details
    const tooltipLines = [
      `**${step.number}. ${step.name}**`,
      '',
      step.description,
      '',
      `Command: \`${step.prompt}\``,
      '',
      step.mandatory ? '🔴 Required step' : '🟢 Optional step',
    ];

    if (step.runOnce) {
      tooltipLines.push('', `⚠️ ${step.runOnceMessage}`);
    }

    if (isDisabled && disabledReason) {
      tooltipLines.push('', `🚫 ${disabledReason}`);
    }

    this.tooltip = new vscode.MarkdownString(tooltipLines.join('\n'));

    // Icon based on state
    if (isDisabled) {
      this.iconPath = new vscode.ThemeIcon('circle-slash', new vscode.ThemeColor('disabledForeground'));
    } else if (isCompleted && step.runOnce) {
      this.iconPath = new vscode.ThemeIcon('check', new vscode.ThemeColor('testing.iconPassed'));
    } else if (step.mandatory) {
      this.iconPath = new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.red'));
    } else {
      this.iconPath = new vscode.ThemeIcon('circle-outline', new vscode.ThemeColor('charts.green'));
    }

    // Context value for menu filtering
    if (isDisabled) {
      this.contextValue = 'workflowStep-disabled';
    } else {
      this.contextValue = 'workflowStep';
    }
  }
}

/**
 * Workflow Tree Data Provider
 */
export class WorkflowTreeProvider implements vscode.TreeDataProvider<WorkflowTreeItem> {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<WorkflowTreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private readonly contextManager: WorkspaceContextManager;
  private completedSteps: Set<string> = new Set();

  constructor(private readonly context: vscode.ExtensionContext) {
    this.contextManager = getWorkspaceContextManager();

    // Load completed steps from workspace state
    this.loadCompletedSteps();

    // Listen for workspace changes
    this.contextManager.onDidChangeWorkspace(() => this.refresh());
  }

  /**
   * Load completed steps from workspace state
   */
  private loadCompletedSteps(): void {
    const completed = this.context.workspaceState.get<string[]>('artk.completedWorkflowSteps', []);
    this.completedSteps = new Set(completed);
  }

  /**
   * Save completed steps to workspace state
   */
  private async saveCompletedSteps(): Promise<void> {
    await this.context.workspaceState.update(
      'artk.completedWorkflowSteps',
      Array.from(this.completedSteps)
    );
  }

  /**
   * Mark a step as completed
   */
  async markStepCompleted(stepId: string): Promise<void> {
    this.completedSteps.add(stepId);
    await this.saveCompletedSteps();
    this.refresh();
  }

  /**
   * Reset a step's completion status
   */
  async resetStep(stepId: string): Promise<void> {
    this.completedSteps.delete(stepId);
    await this.saveCompletedSteps();
    this.refresh();
  }

  /**
   * Reset all steps
   */
  async resetAllSteps(): Promise<void> {
    this.completedSteps.clear();
    await this.saveCompletedSteps();
    this.refresh();
  }

  /**
   * Check if init-playbook has been run by looking for playbook files
   */
  private checkInitPlaybookCompleted(): boolean {
    const workspaceInfo = this.contextManager.workspaceInfo;
    if (!workspaceInfo?.projectRoot) return false;

    // Check for .github/copilot-instructions.md (created by init-playbook)
    const copilotInstructionsPath = path.join(
      workspaceInfo.projectRoot,
      '.github',
      'copilot-instructions.md'
    );

    return fs.existsSync(copilotInstructionsPath);
  }

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: WorkflowTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: WorkflowTreeItem): WorkflowTreeItem[] {
    if (element) {
      return []; // No children for workflow items
    }

    // Root level - check if ARTK is installed
    if (!this.contextManager.isInstalled) {
      return [];
    }

    // Auto-detect init-playbook completion
    if (this.checkInitPlaybookCompleted()) {
      this.completedSteps.add('init-playbook');
    }

    return WORKFLOW_STEPS.map((step) => {
      const isCompleted = this.completedSteps.has(step.id);

      // Check if step should be disabled
      let isDisabled = false;
      let disabledReason: string | undefined;

      // Disable if run-once and already completed
      if (step.runOnce && isCompleted) {
        isDisabled = true;
        disabledReason = 'Already completed (run-once step)';
      }

      return new WorkflowTreeItem(step, isCompleted, isDisabled, disabledReason);
    });
  }

  /**
   * Get step by ID
   */
  getStep(stepId: string): WorkflowStep | undefined {
    return WORKFLOW_STEPS.find((s) => s.id === stepId);
  }
}

// Delay constant for chat initialization
const CHAT_INIT_DELAY_MS = 150;

/**
 * Check if GitHub Copilot Chat extension is installed
 */
function isCopilotChatInstalled(): boolean {
  return vscode.extensions.getExtension('GitHub.copilot-chat') !== undefined;
}

/**
 * Execute a workflow step in Copilot Chat (clear chat first, then auto-submit)
 */
export async function executeWorkflowStep(
  item: WorkflowTreeItem,
  provider: WorkflowTreeProvider
): Promise<void> {
  if (item.isDisabled) {
    vscode.window.showWarningMessage(
      `This step is disabled: ${item.disabledReason}`
    );
    return;
  }

  // Check for Copilot Chat extension
  if (!isCopilotChatInstalled()) {
    const action = await vscode.window.showWarningMessage(
      'GitHub Copilot Chat is required for workflow steps. Please install it first.',
      'Open Extensions'
    );
    if (action === 'Open Extensions') {
      await vscode.commands.executeCommand('workbench.extensions.search', 'GitHub.copilot-chat');
    }
    return;
  }

  try {
    // Clear chat and start fresh
    await vscode.commands.executeCommand('workbench.action.chat.newChat');

    // Delay to ensure new chat is ready (VS Code issue #261118)
    await new Promise((resolve) => setTimeout(resolve, CHAT_INIT_DELAY_MS));

    // Open chat with prompt and auto-execute
    await vscode.commands.executeCommand('workbench.action.chat.open', {
      query: item.step.prompt,
      isPartialQuery: false, // Auto-submit
    });

    // For run-once steps, mark completed
    // Note: This marks it when sent, not when completed. For init-playbook,
    // we also have file-based detection as a backup.
    if (item.step.runOnce) {
      await provider.markStepCompleted(item.step.id);
    }

    vscode.window.showInformationMessage(
      `Executing: ${item.step.name}`
    );
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to execute workflow step: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Open a workflow step in Copilot Chat for editing (don't auto-submit)
 */
export async function editWorkflowStep(item: WorkflowTreeItem): Promise<void> {
  if (item.isDisabled) {
    vscode.window.showWarningMessage(
      `This step is disabled: ${item.disabledReason}`
    );
    return;
  }

  // Check for Copilot Chat extension
  if (!isCopilotChatInstalled()) {
    const action = await vscode.window.showWarningMessage(
      'GitHub Copilot Chat is required for workflow steps. Please install it first.',
      'Open Extensions'
    );
    if (action === 'Open Extensions') {
      await vscode.commands.executeCommand('workbench.extensions.search', 'GitHub.copilot-chat');
    }
    return;
  }

  try {
    // Clear chat and start fresh
    await vscode.commands.executeCommand('workbench.action.chat.newChat');

    // Delay to ensure new chat is ready (VS Code issue #261118)
    await new Promise((resolve) => setTimeout(resolve, CHAT_INIT_DELAY_MS));

    // Open chat with prompt but DON'T auto-execute
    await vscode.commands.executeCommand('workbench.action.chat.open', {
      query: item.step.prompt,
      isPartialQuery: true, // Wait for user to edit and submit
    });

    vscode.window.showInformationMessage(
      `Edit the prompt and press Enter to run: ${item.step.name}`
    );
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to open workflow step: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Register workflow commands
 */
export function registerWorkflowCommands(
  context: vscode.ExtensionContext,
  provider: WorkflowTreeProvider
): void {
  // Execute step (auto-submit)
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'artk.workflow.execute',
      (item: WorkflowTreeItem) => executeWorkflowStep(item, provider)
    )
  );

  // Edit step (don't auto-submit)
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'artk.workflow.edit',
      (item: WorkflowTreeItem) => editWorkflowStep(item)
    )
  );

  // Reset step
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'artk.workflow.resetStep',
      async (item: WorkflowTreeItem) => {
        await provider.resetStep(item.step.id);
        vscode.window.showInformationMessage(`Reset: ${item.step.name}`);
      }
    )
  );

  // Reset all steps
  context.subscriptions.push(
    vscode.commands.registerCommand('artk.workflow.resetAll', async () => {
      const confirm = await vscode.window.showWarningMessage(
        'Reset all workflow steps? This will clear completion status.',
        'Reset',
        'Cancel'
      );
      if (confirm === 'Reset') {
        await provider.resetAllSteps();
        vscode.window.showInformationMessage('All workflow steps reset');
      }
    })
  );
}
