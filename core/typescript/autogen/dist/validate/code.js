import { validateJourneyFrontmatter } from './journey.js';
import { scanForbiddenPatterns, scanResultsToIssues, getViolationSummary } from './patterns.js';
import { lintCode } from './lint.js';
import { validateTagsInCode } from './tags.js';
import { validateIRCoverage } from './coverage.js';
const DEFAULT_OPTIONS = {
    runLint: false, // ESLint requires setup, disabled by default
    validateTags: true,
    validateCoverage: true,
    validateFrontmatter: true,
    minCoverage: 80,
    allowDrafts: false,
};
/**
 * Validate generated test code
 */
export async function validateCode(code, journey, frontmatter, options = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const allIssues = [];
    const details = {
        patterns: { valid: true, violationCount: 0 },
    };
    // 1. Frontmatter validation
    if (opts.validateFrontmatter && frontmatter) {
        const frontmatterResult = validateJourneyFrontmatter(frontmatter, {
            allowDrafts: opts.allowDrafts,
        });
        details.frontmatter = frontmatterResult;
        allIssues.push(...frontmatterResult.issues);
    }
    // 2. Forbidden pattern scan
    const patternResults = scanForbiddenPatterns(code);
    const patternIssues = scanResultsToIssues(patternResults);
    allIssues.push(...patternIssues);
    const patternSummary = getViolationSummary(patternResults);
    details.patterns = {
        valid: patternSummary.errors === 0,
        violationCount: patternSummary.total,
    };
    // 3. ESLint (optional)
    if (opts.runLint) {
        const lintResult = await lintCode(code, `${journey.id.toLowerCase()}.spec.ts`);
        details.lint = lintResult;
        allIssues.push(...lintResult.issues);
    }
    // 4. Tag validation
    if (opts.validateTags) {
        const tagResult = validateTagsInCode(code, journey.id, journey.tier, journey.scope);
        details.tags = tagResult;
        allIssues.push(...tagResult.issues);
    }
    // 5. Coverage validation
    if (opts.validateCoverage) {
        const coverageResult = validateIRCoverage(journey, {
            minCoverage: opts.minCoverage,
            warnPartialCoverage: true,
        });
        details.coverage = coverageResult;
        allIssues.push(...coverageResult.issues);
    }
    // Calculate counts
    const counts = {
        errors: allIssues.filter((i) => i.severity === 'error').length,
        warnings: allIssues.filter((i) => i.severity === 'warning').length,
        info: allIssues.filter((i) => i.severity === 'info').length,
    };
    return {
        valid: counts.errors === 0,
        journeyId: journey.id,
        issues: allIssues,
        counts,
        details,
        timestamp: new Date().toISOString(),
    };
}
/**
 * Synchronous validation (without ESLint)
 */
export function validateCodeSync(code, journey, frontmatter, options = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options, runLint: false };
    const allIssues = [];
    const details = {
        patterns: { valid: true, violationCount: 0 },
    };
    // 1. Frontmatter validation
    if (opts.validateFrontmatter && frontmatter) {
        const frontmatterResult = validateJourneyFrontmatter(frontmatter, {
            allowDrafts: opts.allowDrafts,
        });
        details.frontmatter = frontmatterResult;
        allIssues.push(...frontmatterResult.issues);
    }
    // 2. Forbidden pattern scan
    const patternResults = scanForbiddenPatterns(code);
    const patternIssues = scanResultsToIssues(patternResults);
    allIssues.push(...patternIssues);
    const patternSummary = getViolationSummary(patternResults);
    details.patterns = {
        valid: patternSummary.errors === 0,
        violationCount: patternSummary.total,
    };
    // 3. Tag validation
    if (opts.validateTags) {
        const tagResult = validateTagsInCode(code, journey.id, journey.tier, journey.scope);
        details.tags = tagResult;
        allIssues.push(...tagResult.issues);
    }
    // 4. Coverage validation
    if (opts.validateCoverage) {
        const coverageResult = validateIRCoverage(journey, {
            minCoverage: opts.minCoverage,
            warnPartialCoverage: true,
        });
        details.coverage = coverageResult;
        allIssues.push(...coverageResult.issues);
    }
    // Calculate counts
    const counts = {
        errors: allIssues.filter((i) => i.severity === 'error').length,
        warnings: allIssues.filter((i) => i.severity === 'warning').length,
        info: allIssues.filter((i) => i.severity === 'info').length,
    };
    return {
        valid: counts.errors === 0,
        journeyId: journey.id,
        issues: allIssues,
        counts,
        details,
        timestamp: new Date().toISOString(),
    };
}
/**
 * Quick pass/fail check
 */
export function isCodeValid(code, journey, frontmatter) {
    const result = validateCodeSync(code, journey, frontmatter);
    return result.valid;
}
/**
 * Generate validation report as markdown
 */
export function generateValidationReport(result) {
    const lines = [];
    lines.push('# Code Validation Report');
    lines.push('');
    lines.push(`**Journey**: ${result.journeyId}`);
    lines.push(`**Status**: ${result.valid ? '✅ PASSED' : '❌ FAILED'}`);
    lines.push(`**Timestamp**: ${result.timestamp}`);
    lines.push('');
    lines.push('## Summary');
    lines.push('');
    lines.push(`- Errors: ${result.counts.errors}`);
    lines.push(`- Warnings: ${result.counts.warnings}`);
    lines.push(`- Info: ${result.counts.info}`);
    lines.push('');
    lines.push('## Validation Checks');
    lines.push('');
    // Frontmatter
    if (result.details.frontmatter) {
        const fm = result.details.frontmatter;
        lines.push(`### Frontmatter: ${fm.valid ? '✅' : '❌'}`);
        lines.push('');
    }
    // Patterns
    const patterns = result.details.patterns;
    lines.push(`### Forbidden Patterns: ${patterns.valid ? '✅' : '❌'}`);
    lines.push(`- Violations found: ${patterns.violationCount}`);
    lines.push('');
    // ESLint
    if (result.details.lint) {
        const lint = result.details.lint;
        lines.push(`### ESLint: ${lint.passed ? '✅' : '❌'}`);
        lines.push(`- Errors: ${lint.errorCount}`);
        lines.push(`- Warnings: ${lint.warningCount}`);
        lines.push('');
    }
    // Tags
    if (result.details.tags) {
        const tags = result.details.tags;
        lines.push(`### Tags: ${tags.valid ? '✅' : '❌'}`);
        lines.push('');
    }
    // Coverage
    if (result.details.coverage) {
        const coverage = result.details.coverage;
        lines.push(`### Coverage: ${coverage.fullCoverage ? '✅' : '❌'}`);
        lines.push(`- Overall: ${Math.round(coverage.overallCoverage)}%`);
        lines.push(`- ACs Covered: ${coverage.coveredACs}/${coverage.totalACs}`);
        lines.push('');
    }
    // Issues
    if (result.issues.length > 0) {
        lines.push('## Issues');
        lines.push('');
        const groupedIssues = {
            error: [],
            warning: [],
            info: [],
        };
        for (const issue of result.issues) {
            groupedIssues[issue.severity].push(issue);
        }
        if (groupedIssues.error.length > 0) {
            lines.push('### Errors');
            for (const issue of groupedIssues.error) {
                lines.push(`- ❌ **${issue.code}**: ${issue.message}`);
                if (issue.suggestion) {
                    lines.push(`  - 💡 ${issue.suggestion}`);
                }
            }
            lines.push('');
        }
        if (groupedIssues.warning.length > 0) {
            lines.push('### Warnings');
            for (const issue of groupedIssues.warning) {
                lines.push(`- ⚠️ **${issue.code}**: ${issue.message}`);
                if (issue.suggestion) {
                    lines.push(`  - 💡 ${issue.suggestion}`);
                }
            }
            lines.push('');
        }
        if (groupedIssues.info.length > 0) {
            lines.push('### Info');
            for (const issue of groupedIssues.info) {
                lines.push(`- ℹ️ **${issue.code}**: ${issue.message}`);
                if (issue.suggestion) {
                    lines.push(`  - 💡 ${issue.suggestion}`);
                }
            }
            lines.push('');
        }
    }
    return lines.join('\n');
}
//# sourceMappingURL=code.js.map