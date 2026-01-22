/**
 * Selector Debt Tracker - Track CSS selector usage and generate debt reports
 * @see T093 - Implement selector debt tracker
 */
import { type CSSDebtEntry, type SelectorCatalog } from './catalogSchema.js';
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
export declare function recordCSSDebt(selector: string, file: string, line: number, reason?: string): void;
/**
 * Suggest replacement for a CSS selector
 */
export declare function suggestReplacement(selector: string): {
    strategy: string;
    value: string;
    code: string;
};
/**
 * Generate debt report summary
 */
export declare function generateDebtReport(catalog?: SelectorCatalog): DebtReportSummary;
/**
 * Generate migration plan for addressing debt
 */
export declare function generateMigrationPlan(catalog?: SelectorCatalog): MigrationPlan;
/**
 * Clear all debt entries (for testing or after migration)
 */
export declare function clearDebt(): void;
/**
 * Remove specific debt entry
 */
export declare function removeDebt(selector: string): boolean;
/**
 * Update debt priority
 */
export declare function updateDebtPriority(selector: string, priority: 'low' | 'medium' | 'high'): boolean;
/**
 * Generate markdown debt report
 */
export declare function generateDebtMarkdown(catalog?: SelectorCatalog): string;
//# sourceMappingURL=debt.d.ts.map