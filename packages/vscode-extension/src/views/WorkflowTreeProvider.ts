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
  fullDescription: string; // Detailed description for tooltip
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
    fullDescription: `**What it does:**
- Creates \`.github/copilot-instructions.md\` with project-specific AI guidelines
- Generates documentation templates in \`artk-e2e/docs/\`
- Installs the Journey system (schema, templates, tools)
- Sets up the foundation for all subsequent ARTK commands

**Output files:**
- \`.github/copilot-instructions.md\`
- \`artk-e2e/docs/PLAYBOOK.md\`
- \`artk-e2e/docs/CONVENTIONS.md\`

**When to run:** Once at project setup. Re-running will overwrite existing files.`,
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
    fullDescription: `**What it does:**
- Analyzes your application's routes and navigation structure
- Detects authentication patterns (OIDC, basic auth, MFA, etc.)
- Identifies UI frameworks and component patterns
- Creates the Playwright test harness with proper configuration
- Builds foundation modules (auth, config, navigation)

**Output files:**
- \`artk-e2e/DISCOVERY.md\` - Analysis results
- \`artk-e2e/src/foundation/\` - Auth, config, and navigation modules
- \`artk-e2e/playwright.config.ts\` - Configured for your app

**When to run:** After init-playbook, whenever app structure changes significantly.`,
    mandatory: true,
    dependsOn: 'init-playbook',
  },
  {
    id: 'journey-propose',
    number: 3,
    name: 'Propose Journeys (Auto-create from app)',
    prompt: '/artk.journey-propose',
    description: 'Auto-propose Journeys from discovery results',
    fullDescription: `**What it does:**
- Reads DISCOVERY.md analysis results
- Automatically proposes test Journeys based on detected features
- Creates Journey files in \`proposed/\` status
- Suggests smoke, release, and regression tier assignments

**Output files:**
- \`artk-e2e/journeys/proposed/JRN-XXXX__*.md\` - Proposed journey files

**When to run:** After discover-foundation. Optional - you can manually create journeys instead.

**Tip:** Review proposed journeys and promote the ones you want to implement.`,
    mandatory: false,
    dependsOn: 'discover-foundation',
  },
  {
    id: 'journey-define',
    number: 4,
    name: 'Define Journey',
    prompt: '/artk.journey-define',
    description: 'Create/promote Journey to canonical structure',
    fullDescription: `**What it does:**
- Creates a new Journey or promotes a proposed Journey
- Establishes the canonical Journey structure with YAML frontmatter
- Sets Journey ID, status, tier, actor, and scope
- Defines acceptance criteria and high-level steps

**Output files:**
- \`artk-e2e/journeys/defined/JRN-XXXX__*.md\` - Defined journey

**Journey structure:**
\`\`\`yaml
id: JRN-0001
status: defined
tier: smoke | release | regression
actor: user role
scope: feature area
\`\`\`

**When to run:** For each user journey you want to test.`,
    mandatory: true,
    dependsOn: 'journey-propose',
  },
  {
    id: 'journey-clarify',
    number: 5,
    name: 'Clarify Journey',
    prompt: '/artk.journey-clarify',
    description: 'Add deterministic execution detail to Journey',
    fullDescription: `**What it does:**
- Adds precise, deterministic steps to the Journey
- Specifies exact selectors, inputs, and expected outcomes
- Defines test data requirements
- Identifies module dependencies (foundation + feature)

**Output files:**
- \`artk-e2e/journeys/clarified/JRN-XXXX__*.md\` - Clarified journey

**Clarification adds:**
- Exact UI element selectors (preferably data-testid)
- Input values and test data
- Expected assertions and outcomes
- Timing and wait conditions

**When to run:** After defining a journey, before implementation.`,
    mandatory: true,
    dependsOn: 'journey-define',
  },
  {
    id: 'testid-audit',
    number: 6,
    name: 'Audit Test IDs',
    prompt: '/artk.testid-audit',
    description: 'Audit and add data-testid attributes for reliable selectors',
    fullDescription: `**What it does:**
- Scans your application's source code for UI elements
- Identifies elements that need \`data-testid\` attributes
- Suggests consistent naming conventions
- Can auto-add test IDs to your codebase (with confirmation)

**Benefits:**
- More reliable selectors than CSS classes or text
- Survives UI refactoring and styling changes
- Clear separation of test concerns from styling
- Industry best practice for E2E testing

**When to run:** Before implementing journeys. Recommended but optional.

**Tip:** Run this if your app doesn't have data-testid attributes yet.`,
    mandatory: false,
    dependsOn: 'journey-clarify',
  },
  {
    id: 'journey-implement',
    number: 7,
    name: 'Implement Journey',
    prompt: '/artk.journey-implement',
    description: 'Generate Playwright tests from Journey',
    fullDescription: `**What it does:**
- Reads the clarified Journey specification
- Generates Playwright test code using ARTK patterns
- Creates Page Objects and Flow modules as needed
- Links tests back to the Journey via \`@journey\` annotation

**Output files:**
- \`artk-e2e/tests/[tier]/jrn-XXXX__*.spec.ts\` - Test file
- \`artk-e2e/src/pages/*.ts\` - Page Objects (if needed)
- \`artk-e2e/src/flows/*.ts\` - Flow modules (if needed)

**Generated test includes:**
- Proper fixtures and authentication
- Step-by-step implementation of Journey
- Assertions matching acceptance criteria
- LLKB integration for learning

**When to run:** After clarifying a journey.`,
    mandatory: true,
    dependsOn: 'testid-audit',
  },
  {
    id: 'journey-validate',
    number: 8,
    name: 'Validate Journey',
    prompt: '/artk.journey-validate',
    description: 'Static validation gate for Journey',
    fullDescription: `**What it does:**
- Validates Journey YAML frontmatter against schema
- Checks that all required fields are present
- Verifies status transitions are valid
- Ensures tests[] array is populated for implemented journeys
- Validates module dependencies exist

**Validation checks:**
- ✓ Valid Journey ID format (JRN-XXXX)
- ✓ Valid status (proposed → defined → clarified → implemented)
- ✓ Required fields present (tier, actor, scope)
- ✓ Tests linked for implemented status
- ✓ Quarantine requirements (owner, reason, issues)

**When to run:** After implementing, before running tests.`,
    mandatory: true,
    dependsOn: 'journey-implement',
  },
  {
    id: 'journey-verify',
    number: 9,
    name: 'Verify Journey',
    prompt: '/artk.journey-verify',
    description: 'Runtime verification gate - run tests',
    fullDescription: `**What it does:**
- Executes the generated Playwright tests
- Verifies tests pass against the actual application
- Records results and updates LLKB with learnings
- Identifies flaky tests or environment issues

**Verification process:**
1. Runs tests in headed or headless mode
2. Captures screenshots and traces on failure
3. Reports pass/fail status with details
4. Updates Journey status based on results

**On success:** Journey is fully implemented and verified
**On failure:** Provides debugging info and suggests fixes

**When to run:** After validation passes, to confirm tests work.`,
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

    // Rich tooltip with full description
    const tooltipLines = [
      `## ${step.number}. ${step.name}`,
      '',
      `Command: \`${step.prompt}\``,
      '',
      '---',
      '',
      step.fullDescription,
    ];

    if (step.runOnce) {
      tooltipLines.push('', '---', '', `⚠️ **${step.runOnceMessage}**`);
    }

    if (isDisabled && disabledReason) {
      tooltipLines.push('', '---', '', `🚫 **Disabled:** ${disabledReason}`);
    }

    const tooltip = new vscode.MarkdownString(tooltipLines.join('\n'));
    tooltip.isTrusted = true; // Allow command links if needed
    this.tooltip = tooltip;

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
   * Check if init-playbook has been run
   *
   * Bootstrap installs the ARTK structure, prompts, and LLKB directories.
   * init-playbook additionally creates:
   * - artk-e2e/docs/PLAYBOOK.md (the governance playbook)
   * - .github/copilot-instructions.md with project-specific content
   *
   * We check for PLAYBOOK.md as the definitive marker since:
   * - Bootstrap does NOT create it
   * - init-playbook ALWAYS creates it
   */
  private checkInitPlaybookCompleted(): boolean {
    const workspaceInfo = this.contextManager.workspaceInfo;
    if (!workspaceInfo?.artkRoot) return false;

    // Check for PLAYBOOK.md - this is specifically created by init-playbook
    const playbookPath = path.join(workspaceInfo.artkRoot, 'docs', 'PLAYBOOK.md');

    return fs.existsSync(playbookPath);
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
