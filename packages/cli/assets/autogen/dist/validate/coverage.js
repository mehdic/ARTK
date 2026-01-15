const DEFAULT_OPTIONS = {
    minCoverage: 80,
    warnPartialCoverage: true,
    maxBlockedSteps: 2,
};
/**
 * Find test.step calls in generated code
 */
export function findTestSteps(code) {
    const steps = [];
    // Match test.step('ID: Description', async () => { ... })
    const stepRegex = /test\.step\s*\(\s*['"]([^:]+):\s*([^'"]+)['"]/g;
    let match;
    while ((match = stepRegex.exec(code)) !== null) {
        steps.push({
            id: match[1].trim(),
            description: match[2].trim(),
        });
    }
    return steps;
}
/**
 * Find AC IDs mentioned in code comments
 */
export function findACReferences(code) {
    const references = [];
    // Match AC-### in comments
    const acRegex = /\/\/\s*(AC-\d+)|['"]?(AC-\d+)['"]?/g;
    let match;
    while ((match = acRegex.exec(code)) !== null) {
        const acId = match[1] || match[2];
        if (acId && !references.includes(acId)) {
            references.push(acId);
        }
    }
    return references;
}
/**
 * Calculate coverage for an IR step
 */
function calculateStepCoverage(step) {
    const totalSteps = step.actions.length + step.assertions.length;
    const blockedSteps = step.actions.filter((a) => a.type === 'blocked').length;
    const mappedSteps = totalSteps - blockedSteps;
    const unmappedSteps = [];
    for (const action of step.actions) {
        if (action.type === 'blocked' && action.sourceText) {
            unmappedSteps.push(action.sourceText);
        }
    }
    return {
        acId: step.id,
        acTitle: step.description,
        hasCoverage: mappedSteps > 0,
        mappedSteps,
        blockedSteps,
        coveragePercent: totalSteps > 0 ? (mappedSteps / totalSteps) * 100 : 100,
        unmappedSteps,
    };
}
/**
 * Validate AC coverage in IR journey
 */
export function validateIRCoverage(journey, options = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const issues = [];
    const perAC = [];
    // Calculate coverage for each step (which corresponds to an AC)
    for (const step of journey.steps) {
        const coverage = calculateStepCoverage(step);
        perAC.push(coverage);
        // Check coverage issues
        if (!coverage.hasCoverage) {
            issues.push({
                code: 'AC_NO_COVERAGE',
                message: `${step.id} has no mapped test steps`,
                severity: 'error',
                field: step.id,
                suggestion: 'Clarify the AC steps or add supported patterns',
            });
        }
        else if (coverage.coveragePercent < (opts.minCoverage || 80)) {
            if (opts.warnPartialCoverage) {
                issues.push({
                    code: 'AC_PARTIAL_COVERAGE',
                    message: `${step.id} has only ${Math.round(coverage.coveragePercent)}% coverage (${coverage.mappedSteps}/${coverage.mappedSteps + coverage.blockedSteps} steps)`,
                    severity: 'warning',
                    field: step.id,
                    suggestion: `Unmapped steps: ${coverage.unmappedSteps.join(', ')}`,
                });
            }
        }
        // Check blocked step count
        if (opts.maxBlockedSteps && coverage.blockedSteps > opts.maxBlockedSteps) {
            issues.push({
                code: 'AC_TOO_MANY_BLOCKED',
                message: `${step.id} has ${coverage.blockedSteps} blocked steps (max: ${opts.maxBlockedSteps})`,
                severity: 'warning',
                field: step.id,
                suggestion: 'Consider clarifying these steps or marking the journey as needing manual implementation',
            });
        }
    }
    // Calculate overall stats
    const totalACs = perAC.length;
    const coveredACs = perAC.filter((ac) => ac.hasCoverage).length;
    const overallCoverage = totalACs > 0 ? (coveredACs / totalACs) * 100 : 100;
    // Overall coverage check
    if (totalACs > 0 && overallCoverage < (opts.minCoverage || 80)) {
        issues.push({
            code: 'JOURNEY_LOW_COVERAGE',
            message: `Journey has only ${Math.round(overallCoverage)}% AC coverage (${coveredACs}/${totalACs} ACs)`,
            severity: overallCoverage < 50 ? 'error' : 'warning',
            suggestion: 'Review and clarify uncovered acceptance criteria',
        });
    }
    return {
        fullCoverage: coveredACs === totalACs && issues.filter((i) => i.severity === 'error').length === 0,
        totalACs,
        coveredACs,
        overallCoverage,
        perAC,
        issues,
    };
}
/**
 * Validate coverage in generated test code
 */
export function validateCodeCoverage(code, acceptanceCriteria, _options = {}) {
    // Options reserved for future use (e.g., minCoverage threshold)
    const issues = [];
    const perAC = [];
    // Find test steps in code
    const testSteps = findTestSteps(code);
    const stepIds = testSteps.map((s) => s.id);
    // Check each AC
    for (const ac of acceptanceCriteria) {
        const hasCoverage = stepIds.includes(ac.id);
        perAC.push({
            acId: ac.id,
            acTitle: ac.title,
            hasCoverage,
            mappedSteps: hasCoverage ? ac.steps.length : 0,
            blockedSteps: hasCoverage ? 0 : ac.steps.length,
            coveragePercent: hasCoverage ? 100 : 0,
            unmappedSteps: hasCoverage ? [] : ac.steps,
        });
        if (!hasCoverage) {
            issues.push({
                code: 'AC_NOT_IN_CODE',
                message: `${ac.id}: ${ac.title} is not covered in generated test`,
                severity: 'error',
                field: ac.id,
                suggestion: 'Regenerate the test or add manual test.step',
            });
        }
    }
    // Check for orphan test steps (not matching any AC)
    for (const step of testSteps) {
        if (!acceptanceCriteria.find((ac) => ac.id === step.id)) {
            issues.push({
                code: 'ORPHAN_TEST_STEP',
                message: `test.step '${step.id}' does not match any acceptance criterion`,
                severity: 'warning',
                suggestion: 'Remove orphan step or add corresponding AC',
            });
        }
    }
    // Calculate overall stats
    const totalACs = perAC.length;
    const coveredACs = perAC.filter((ac) => ac.hasCoverage).length;
    const overallCoverage = totalACs > 0 ? (coveredACs / totalACs) * 100 : 100;
    return {
        fullCoverage: coveredACs === totalACs,
        totalACs,
        coveredACs,
        overallCoverage,
        perAC,
        issues,
    };
}
/**
 * Generate coverage report as markdown
 */
export function generateCoverageReport(result) {
    const lines = [];
    lines.push('# AC Coverage Report');
    lines.push('');
    lines.push(`**Overall Coverage**: ${Math.round(result.overallCoverage)}% (${result.coveredACs}/${result.totalACs} ACs)`);
    lines.push('');
    if (result.fullCoverage) {
        lines.push('✅ All acceptance criteria are covered');
    }
    else {
        lines.push('⚠️ Some acceptance criteria are missing coverage');
    }
    lines.push('');
    lines.push('## Per-AC Coverage');
    lines.push('');
    lines.push('| AC ID | Title | Coverage | Status |');
    lines.push('|-------|-------|----------|--------|');
    for (const ac of result.perAC) {
        const status = ac.hasCoverage ? (ac.coveragePercent >= 80 ? '✅' : '⚠️') : '❌';
        lines.push(`| ${ac.acId} | ${ac.acTitle.slice(0, 30)}${ac.acTitle.length > 30 ? '...' : ''} | ${Math.round(ac.coveragePercent)}% | ${status} |`);
    }
    if (result.issues.length > 0) {
        lines.push('');
        lines.push('## Issues');
        lines.push('');
        for (const issue of result.issues) {
            const icon = issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️';
            lines.push(`- ${icon} **${issue.code}**: ${issue.message}`);
            if (issue.suggestion) {
                lines.push(`  - Suggestion: ${issue.suggestion}`);
            }
        }
    }
    return lines.join('\n');
}
//# sourceMappingURL=coverage.js.map