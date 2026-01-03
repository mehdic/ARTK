/**
 * Selector Debt Tracker - Track CSS selector usage and generate debt reports
 * @see T093 - Implement selector debt tracker
 */
import { type CSSDebtEntry, type SelectorCatalog } from './catalogSchema.js';
import { getCatalog } from './catalog.js';

/**
 * Debt report summary
 */
export interface DebtReportSummary {
  /** Total number of CSS debt entries */
  totalDebt: number;
  /** Breakdown by priority */
  byPriority: {
    high: number;
    medium: number;
    low: number;
  };
  /** Total usage count across all debt */
  totalUsages: number;
  /** Files with most debt */
  topDebtFiles: Array<{
    file: string;
    count: number;
  }>;
  /** Most common problematic selectors */
  topSelectors: Array<{
    selector: string;
    usageCount: number;
    priority: string;
  }>;
}

/**
 * Debt migration plan
 */
export interface MigrationPlan {
  /** Entries to migrate */
  entries: Array<{
    debt: CSSDebtEntry;
    suggestedFix: string;
    effort: 'low' | 'medium' | 'high';
  }>;
  /** Estimated total effort */
  estimatedEffort: string;
  /** Recommended migration order */
  migrationOrder: string[];
}

/**
 * Record CSS selector usage as debt
 */
export function recordCSSDebt(
  selector: string,
  file: string,
  line: number,
  reason?: string
): void {
  const catalog = getCatalog();

  // Find or create debt entry
  let debt = catalog.cssDebt?.find((d) => d.selector === selector);

  if (!debt) {
    debt = {
      selector,
      usages: [],
      priority: determinePriority(selector),
      reason: reason ?? inferDebtReason(selector),
    };
    catalog.cssDebt = catalog.cssDebt ?? [];
    catalog.cssDebt.push(debt);
  }

  // Add usage if not already tracked
  const existingUsage = debt.usages.find((u) => u.file === file && u.line === line);
  if (!existingUsage) {
    debt.usages.push({ file, line });
  }
}

/**
 * Determine priority based on selector type
 */
function determinePriority(selector: string): 'low' | 'medium' | 'high' {
  // High priority: dynamic or fragile selectors
  if (selector.includes('[class*=') || selector.includes('[class^=')) {
    return 'high';
  }
  if (selector.match(/\d+/)) {
    // Contains numbers (likely auto-generated)
    return 'high';
  }
  if (selector.split(' ').length > 3) {
    // Complex nested selector
    return 'high';
  }

  // Medium priority: class selectors
  if (selector.startsWith('.')) {
    return 'medium';
  }

  // Low priority: ID selectors (more stable)
  if (selector.startsWith('#')) {
    return 'low';
  }

  return 'medium';
}

/**
 * Infer reason for debt based on selector pattern
 */
function inferDebtReason(selector: string): string {
  if (selector.includes('[class*=') || selector.includes('[class^=')) {
    return 'Partial class matching is fragile - may break with CSS changes';
  }
  if (selector.match(/\d+/)) {
    return 'Selector contains numbers - may be auto-generated and unstable';
  }
  if (selector.split(' ').length > 3) {
    return 'Complex nested selector - hard to maintain and fragile';
  }
  if (selector.startsWith('.')) {
    return 'Class selector - consider using testid or role';
  }
  if (selector.startsWith('#')) {
    return 'ID selector - consider using testid for test stability';
  }
  return 'CSS selector - consider using semantic locators';
}

/**
 * Suggest replacement for a CSS selector
 */
export function suggestReplacement(selector: string): {
  strategy: string;
  value: string;
  code: string;
} {
  // Extract meaningful name from selector
  let name = selector
    .replace(/[.#\[\]="'^*~$]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((s) => s.length > 2)
    .join('-')
    .toLowerCase();

  if (!name) {
    name = 'element';
  }

  // Generate testid suggestion
  const testId = name.replace(/\s+/g, '-');

  return {
    strategy: 'testid',
    value: testId,
    code: `page.getByTestId('${testId}')`,
  };
}

/**
 * Generate debt report summary
 */
export function generateDebtReport(catalog?: SelectorCatalog): DebtReportSummary {
  const cat = catalog ?? getCatalog();
  const debt = cat.cssDebt ?? [];

  // Count by priority
  const byPriority = { high: 0, medium: 0, low: 0 };
  let totalUsages = 0;
  const fileUsages: Record<string, number> = {};

  for (const entry of debt) {
    byPriority[entry.priority]++;
    totalUsages += entry.usages.length;

    for (const usage of entry.usages) {
      fileUsages[usage.file] = (fileUsages[usage.file] ?? 0) + 1;
    }
  }

  // Top debt files
  const topDebtFiles = Object.entries(fileUsages)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([file, count]) => ({ file, count }));

  // Top selectors
  const topSelectors = debt
    .sort((a, b) => b.usages.length - a.usages.length)
    .slice(0, 10)
    .map((d) => ({
      selector: d.selector,
      usageCount: d.usages.length,
      priority: d.priority,
    }));

  return {
    totalDebt: debt.length,
    byPriority,
    totalUsages,
    topDebtFiles,
    topSelectors,
  };
}

/**
 * Generate migration plan for addressing debt
 */
export function generateMigrationPlan(catalog?: SelectorCatalog): MigrationPlan {
  const cat = catalog ?? getCatalog();
  const debt = cat.cssDebt ?? [];

  const entries = debt.map((d) => {
    const suggestion = suggestReplacement(d.selector);
    const effort = d.priority === 'high' ? 'high' : d.usages.length > 5 ? 'medium' : 'low';

    return {
      debt: d,
      suggestedFix: suggestion.code,
      effort: effort as 'low' | 'medium' | 'high',
    };
  });

  // Sort by priority (high first) then by usage count (most used first)
  entries.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const pDiff = priorityOrder[a.debt.priority] - priorityOrder[b.debt.priority];
    if (pDiff !== 0) return pDiff;
    return b.debt.usages.length - a.debt.usages.length;
  });

  // Calculate estimated effort
  const effortCounts = { low: 0, medium: 0, high: 0 };
  for (const entry of entries) {
    effortCounts[entry.effort]++;
  }

  let estimatedEffort: string;
  if (effortCounts.high > 10 || effortCounts.medium > 20) {
    estimatedEffort = 'Large refactoring effort required';
  } else if (effortCounts.high > 5 || effortCounts.medium > 10) {
    estimatedEffort = 'Medium refactoring effort required';
  } else {
    estimatedEffort = 'Small refactoring effort required';
  }

  // Migration order
  const migrationOrder = entries.slice(0, 20).map((e) => e.debt.selector);

  return {
    entries,
    estimatedEffort,
    migrationOrder,
  };
}

/**
 * Clear all debt entries (for testing or after migration)
 */
export function clearDebt(): void {
  const catalog = getCatalog();
  catalog.cssDebt = [];
}

/**
 * Remove specific debt entry
 */
export function removeDebt(selector: string): boolean {
  const catalog = getCatalog();
  const index = catalog.cssDebt?.findIndex((d) => d.selector === selector) ?? -1;

  if (index >= 0) {
    catalog.cssDebt?.splice(index, 1);
    return true;
  }
  return false;
}

/**
 * Update debt priority
 */
export function updateDebtPriority(
  selector: string,
  priority: 'low' | 'medium' | 'high'
): boolean {
  const catalog = getCatalog();
  const debt = catalog.cssDebt?.find((d) => d.selector === selector);

  if (debt) {
    debt.priority = priority;
    return true;
  }
  return false;
}

/**
 * Generate markdown debt report
 */
export function generateDebtMarkdown(catalog?: SelectorCatalog): string {
  const report = generateDebtReport(catalog);
  const plan = generateMigrationPlan(catalog);

  const lines: string[] = [
    '# Selector Debt Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Summary',
    '',
    `- **Total Debt Entries:** ${report.totalDebt}`,
    `- **Total Usages:** ${report.totalUsages}`,
    `- **High Priority:** ${report.byPriority.high}`,
    `- **Medium Priority:** ${report.byPriority.medium}`,
    `- **Low Priority:** ${report.byPriority.low}`,
    '',
    `**Effort Estimate:** ${plan.estimatedEffort}`,
    '',
    '## Top Selectors to Address',
    '',
    '| Selector | Usages | Priority | Suggested Fix |',
    '|----------|--------|----------|---------------|',
  ];

  for (const entry of plan.entries.slice(0, 15)) {
    lines.push(
      `| \`${entry.debt.selector}\` | ${entry.debt.usages.length} | ${entry.debt.priority} | \`${entry.suggestedFix}\` |`
    );
  }

  lines.push('', '## Files with Most Debt', '');

  for (const file of report.topDebtFiles.slice(0, 10)) {
    lines.push(`- \`${file.file}\`: ${file.count} debt usages`);
  }

  lines.push('', '## Migration Order', '', 'Address these selectors first:', '');

  for (let i = 0; i < Math.min(10, plan.migrationOrder.length); i++) {
    lines.push(`${i + 1}. \`${plan.migrationOrder[i]}\``);
  }

  return lines.join('\n');
}
