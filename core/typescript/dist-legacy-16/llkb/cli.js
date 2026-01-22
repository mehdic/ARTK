"use strict";
/**
 * CLI Commands for LLKB
 *
 * Provides command-line interface functions for LLKB management.
 *
 * @module llkb/cli
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.runHealthCheck = runHealthCheck;
exports.getStats = getStats;
exports.prune = prune;
exports.formatHealthCheck = formatHealthCheck;
exports.formatStats = formatStats;
exports.formatPruneResult = formatPruneResult;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const file_utils_js_1 = require("./file-utils.js");
const analytics_js_1 = require("./analytics.js");
const history_js_1 = require("./history.js");
const confidence_js_1 = require("./confidence.js");
/**
 * Default LLKB root directory
 */
const DEFAULT_LLKB_ROOT = '.artk/llkb';
/**
 * Run health check on LLKB
 *
 * Verifies that:
 * - All required files exist
 * - JSON files are valid
 * - No data corruption detected
 * - Configuration is valid
 *
 * @param llkbRoot - Root LLKB directory
 * @returns Health check result
 *
 * @example
 * ```typescript
 * const result = runHealthCheck();
 * if (result.status === 'error') {
 *   console.error('LLKB needs attention:', result.summary);
 * }
 * ```
 */
function runHealthCheck(llkbRoot = DEFAULT_LLKB_ROOT) {
    const checks = [];
    let hasError = false;
    let hasWarning = false;
    // Check 1: Directory exists
    if (fs.existsSync(llkbRoot)) {
        checks.push({
            name: 'Directory exists',
            status: 'pass',
            message: `LLKB directory found at ${llkbRoot}`,
        });
    }
    else {
        checks.push({
            name: 'Directory exists',
            status: 'fail',
            message: `LLKB directory not found at ${llkbRoot}`,
        });
        hasError = true;
    }
    // Check 2: Config file
    const configPath = path.join(llkbRoot, 'config.yml');
    if (fs.existsSync(configPath)) {
        checks.push({
            name: 'Config file',
            status: 'pass',
            message: 'config.yml found',
        });
    }
    else {
        checks.push({
            name: 'Config file',
            status: 'warn',
            message: 'config.yml not found - using defaults',
        });
        hasWarning = true;
    }
    // Check 3: Lessons file
    const lessonsPath = path.join(llkbRoot, 'lessons.json');
    const lessonsCheck = checkJSONFile(lessonsPath, 'lessons.json');
    checks.push(lessonsCheck);
    if (lessonsCheck.status === 'fail')
        hasError = true;
    if (lessonsCheck.status === 'warn')
        hasWarning = true;
    // Check 4: Components file
    const componentsPath = path.join(llkbRoot, 'components.json');
    const componentsCheck = checkJSONFile(componentsPath, 'components.json');
    checks.push(componentsCheck);
    if (componentsCheck.status === 'fail')
        hasError = true;
    if (componentsCheck.status === 'warn')
        hasWarning = true;
    // Check 5: Analytics file
    const analyticsPath = path.join(llkbRoot, 'analytics.json');
    const analyticsCheck = checkJSONFile(analyticsPath, 'analytics.json');
    checks.push(analyticsCheck);
    if (analyticsCheck.status === 'fail')
        hasError = true;
    if (analyticsCheck.status === 'warn')
        hasWarning = true;
    // Check 6: History directory
    const historyDir = (0, history_js_1.getHistoryDir)(llkbRoot);
    if (fs.existsSync(historyDir)) {
        const historyFiles = fs.readdirSync(historyDir).filter((f) => f.endsWith('.jsonl'));
        checks.push({
            name: 'History directory',
            status: 'pass',
            message: `History directory found with ${historyFiles.length} files`,
        });
    }
    else {
        checks.push({
            name: 'History directory',
            status: 'warn',
            message: 'History directory not found - will be created on first event',
        });
        hasWarning = true;
    }
    // Check 7: Low confidence lessons
    // Only check if lessons.json was valid (checkJSONFile passed)
    if (lessonsCheck.status === 'pass') {
        try {
            const lessons = (0, file_utils_js_1.loadJSON)(lessonsPath);
            if (lessons) {
                const lowConfidence = lessons.lessons.filter((l) => !l.archived && (0, confidence_js_1.needsConfidenceReview)(l));
                const declining = lessons.lessons.filter((l) => !l.archived && (0, confidence_js_1.detectDecliningConfidence)(l));
                if (lowConfidence.length > 0 || declining.length > 0) {
                    checks.push({
                        name: 'Lesson health',
                        status: 'warn',
                        message: `${lowConfidence.length} low confidence, ${declining.length} declining`,
                        details: [
                            ...lowConfidence.map((l) => `Low confidence: ${l.id} (${l.metrics.confidence})`),
                            ...declining.map((l) => `Declining: ${l.id}`),
                        ].join(', '),
                    });
                    hasWarning = true;
                }
                else {
                    checks.push({
                        name: 'Lesson health',
                        status: 'pass',
                        message: 'All lessons healthy',
                    });
                }
            }
        }
        catch {
            // Skip lesson health check if JSON is invalid (already flagged by checkJSONFile)
        }
    }
    // Determine overall status
    let status;
    let summary;
    if (hasError) {
        status = 'error';
        summary = `LLKB has errors: ${checks.filter((c) => c.status === 'fail').length} failed checks`;
    }
    else if (hasWarning) {
        status = 'warning';
        summary = `LLKB has warnings: ${checks.filter((c) => c.status === 'warn').length} warnings`;
    }
    else {
        status = 'healthy';
        summary = 'LLKB is healthy';
    }
    return { status, checks, summary };
}
/**
 * Check a JSON file for validity
 */
function checkJSONFile(filePath, fileName) {
    if (!fs.existsSync(filePath)) {
        return {
            name: fileName,
            status: 'warn',
            message: `${fileName} not found`,
        };
    }
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        JSON.parse(content);
        return {
            name: fileName,
            status: 'pass',
            message: `${fileName} is valid JSON`,
        };
    }
    catch (error) {
        return {
            name: fileName,
            status: 'fail',
            message: `${fileName} is invalid JSON`,
            details: error instanceof Error ? error.message : String(error),
        };
    }
}
/**
 * Get LLKB statistics
 *
 * @param llkbRoot - Root LLKB directory
 * @returns Statistics about LLKB contents
 *
 * @example
 * ```typescript
 * const stats = getStats();
 * console.log(`Total lessons: ${stats.lessons.total}`);
 * console.log(`Total reuses: ${stats.components.totalReuses}`);
 * ```
 */
function getStats(llkbRoot = DEFAULT_LLKB_ROOT) {
    const lessonsPath = path.join(llkbRoot, 'lessons.json');
    const componentsPath = path.join(llkbRoot, 'components.json');
    const historyDir = (0, history_js_1.getHistoryDir)(llkbRoot);
    // Lessons stats
    const lessons = (0, file_utils_js_1.loadJSON)(lessonsPath);
    const activeLessons = lessons?.lessons.filter((l) => !l.archived) ?? [];
    const archivedLessons = lessons?.archived ?? [];
    let avgConfidence = 0;
    let avgSuccessRate = 0;
    let needsReview = 0;
    if (activeLessons.length > 0) {
        avgConfidence =
            Math.round((activeLessons.reduce((acc, l) => acc + l.metrics.confidence, 0) /
                activeLessons.length) *
                100) / 100;
        avgSuccessRate =
            Math.round((activeLessons.reduce((acc, l) => acc + l.metrics.successRate, 0) /
                activeLessons.length) *
                100) / 100;
        needsReview = activeLessons.filter((l) => (0, confidence_js_1.needsConfidenceReview)(l) || (0, confidence_js_1.detectDecliningConfidence)(l)).length;
    }
    // Components stats
    const components = (0, file_utils_js_1.loadJSON)(componentsPath);
    const activeComponents = components?.components.filter((c) => !c.archived) ?? [];
    const archivedComponents = components?.components.filter((c) => c.archived) ?? [];
    let totalReuses = 0;
    let avgReusesPerComponent = 0;
    if (activeComponents.length > 0) {
        totalReuses = activeComponents.reduce((acc, c) => acc + (c.metrics.totalUses ?? 0), 0);
        avgReusesPerComponent =
            Math.round((totalReuses / activeComponents.length) * 100) / 100;
    }
    // History stats
    let todayEvents = 0;
    let historyFiles = 0;
    let oldestFile = null;
    let newestFile = null;
    if (fs.existsSync(historyDir)) {
        const files = fs
            .readdirSync(historyDir)
            .filter((f) => f.endsWith('.jsonl'))
            .sort();
        historyFiles = files.length;
        if (files.length > 0) {
            oldestFile = files[0] ?? null;
            newestFile = files[files.length - 1] ?? null;
        }
        todayEvents = (0, history_js_1.readTodayHistory)(llkbRoot).length;
    }
    return {
        lessons: {
            total: (lessons?.lessons.length ?? 0) + archivedLessons.length,
            active: activeLessons.length,
            archived: archivedLessons.length,
            avgConfidence,
            avgSuccessRate,
            needsReview,
        },
        components: {
            total: components?.components.length ?? 0,
            active: activeComponents.length,
            archived: archivedComponents.length,
            totalReuses,
            avgReusesPerComponent,
        },
        history: {
            todayEvents,
            historyFiles,
            oldestFile,
            newestFile,
        },
    };
}
/**
 * Prune old history files and optionally archive stale items
 *
 * @param options - Prune options
 * @returns Prune result with counts of deleted/archived items
 *
 * @example
 * ```typescript
 * const result = prune({ historyRetentionDays: 90 });
 * console.log(`Deleted ${result.historyFilesDeleted} old history files`);
 * ```
 */
function prune(options = {}) {
    const { llkbRoot = DEFAULT_LLKB_ROOT, historyRetentionDays = 365, archiveInactiveLessons = false, archiveInactiveComponents = false, inactiveDays = 180, } = options;
    const result = {
        historyFilesDeleted: 0,
        deletedFiles: [],
        archivedLessons: 0,
        archivedComponents: 0,
        errors: [],
    };
    // Clean up old history files
    try {
        const deletedFiles = (0, history_js_1.cleanupOldHistoryFiles)(historyRetentionDays, llkbRoot);
        result.historyFilesDeleted = deletedFiles.length;
        result.deletedFiles = deletedFiles;
    }
    catch (error) {
        result.errors.push(`Failed to clean history files: ${error instanceof Error ? error.message : String(error)}`);
    }
    // Archive inactive lessons
    if (archiveInactiveLessons) {
        try {
            const archivedCount = archiveInactiveItems(path.join(llkbRoot, 'lessons.json'), 'lessons', inactiveDays);
            result.archivedLessons = archivedCount;
        }
        catch (error) {
            result.errors.push(`Failed to archive lessons: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    // Archive inactive components
    if (archiveInactiveComponents) {
        try {
            const archivedCount = archiveInactiveItems(path.join(llkbRoot, 'components.json'), 'components', inactiveDays);
            result.archivedComponents = archivedCount;
        }
        catch (error) {
            result.errors.push(`Failed to archive components: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    // Update analytics after pruning
    try {
        (0, analytics_js_1.updateAnalytics)(llkbRoot);
    }
    catch (error) {
        result.errors.push(`Failed to update analytics: ${error instanceof Error ? error.message : String(error)}`);
    }
    return result;
}
/**
 * Archive items that haven't been used in a specified number of days
 */
function archiveInactiveItems(filePath, itemsKey, inactiveDays) {
    if (!fs.existsSync(filePath)) {
        return 0;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    const items = data[itemsKey];
    if (!Array.isArray(items)) {
        return 0;
    }
    const now = new Date();
    const cutoffDate = new Date();
    cutoffDate.setDate(now.getDate() - inactiveDays);
    let archivedCount = 0;
    for (const item of items) {
        if (item.archived)
            continue;
        const lastUsedStr = item.metrics.lastSuccess ?? item.metrics.lastUsed;
        if (!lastUsedStr)
            continue;
        const lastUsed = new Date(lastUsedStr);
        if (lastUsed < cutoffDate) {
            item.archived = true;
            archivedCount++;
        }
    }
    if (archivedCount > 0) {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    }
    return archivedCount;
}
/**
 * Format health check result for console output
 *
 * @param result - Health check result
 * @returns Formatted string for console
 */
function formatHealthCheck(result) {
    const lines = [];
    const statusIcon = result.status === 'healthy' ? '✓' : result.status === 'warning' ? '⚠' : '✗';
    lines.push(`${statusIcon} LLKB Health Check: ${result.status.toUpperCase()}`);
    lines.push('─'.repeat(50));
    for (const check of result.checks) {
        const icon = check.status === 'pass' ? '✓' : check.status === 'warn' ? '⚠' : '✗';
        lines.push(`${icon} ${check.name}: ${check.message}`);
        if (check.details) {
            lines.push(`  ${check.details}`);
        }
    }
    lines.push('─'.repeat(50));
    lines.push(result.summary);
    return lines.join('\n');
}
/**
 * Format stats result for console output
 *
 * @param stats - Stats result
 * @returns Formatted string for console
 */
function formatStats(stats) {
    const lines = [];
    lines.push('LLKB Statistics');
    lines.push('─'.repeat(50));
    lines.push('');
    lines.push('Lessons:');
    lines.push(`  Total: ${stats.lessons.total} (${stats.lessons.active} active, ${stats.lessons.archived} archived)`);
    lines.push(`  Avg Confidence: ${stats.lessons.avgConfidence}`);
    lines.push(`  Avg Success Rate: ${stats.lessons.avgSuccessRate}`);
    lines.push(`  Needs Review: ${stats.lessons.needsReview}`);
    lines.push('');
    lines.push('Components:');
    lines.push(`  Total: ${stats.components.total} (${stats.components.active} active, ${stats.components.archived} archived)`);
    lines.push(`  Total Reuses: ${stats.components.totalReuses}`);
    lines.push(`  Avg Reuses/Component: ${stats.components.avgReusesPerComponent}`);
    lines.push('');
    lines.push('History:');
    lines.push(`  Today's Events: ${stats.history.todayEvents}`);
    lines.push(`  History Files: ${stats.history.historyFiles}`);
    if (stats.history.oldestFile) {
        lines.push(`  Date Range: ${stats.history.oldestFile} to ${stats.history.newestFile}`);
    }
    return lines.join('\n');
}
/**
 * Format prune result for console output
 *
 * @param result - Prune result
 * @returns Formatted string for console
 */
function formatPruneResult(result) {
    const lines = [];
    lines.push('LLKB Prune Results');
    lines.push('─'.repeat(50));
    lines.push(`History files deleted: ${result.historyFilesDeleted}`);
    if (result.archivedLessons > 0) {
        lines.push(`Lessons archived: ${result.archivedLessons}`);
    }
    if (result.archivedComponents > 0) {
        lines.push(`Components archived: ${result.archivedComponents}`);
    }
    if (result.errors.length > 0) {
        lines.push('');
        lines.push('Errors:');
        for (const error of result.errors) {
            lines.push(`  ✗ ${error}`);
        }
    }
    return lines.join('\n');
}
//# sourceMappingURL=cli.js.map