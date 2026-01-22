"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRunId = generateRunId;
exports.hasDataIsolation = hasDataIsolation;
exports.addRunIdVariable = addRunIdVariable;
exports.namespaceEmail = namespaceEmail;
exports.namespaceName = namespaceName;
exports.replaceHardcodedEmail = replaceHardcodedEmail;
exports.replaceHardcodedTestData = replaceHardcodedTestData;
exports.applyDataFix = applyDataFix;
exports.addCleanupHook = addCleanupHook;
exports.extractTestDataPatterns = extractTestDataPatterns;
/**
 * Data Isolation Fix - Namespace test data with runId
 * @see T065 - Implement data isolation fix (runId namespace)
 */
const node_crypto_1 = require("node:crypto");
/**
 * Generate unique run ID
 */
function generateRunId() {
    const timestamp = Date.now().toString(36);
    const random = (0, node_crypto_1.randomBytes)(4).toString('hex');
    return `${timestamp}-${random}`;
}
// Note: Patterns defined for reference, may be used in future enhancements
/**
 * Check if code has data isolation
 */
function hasDataIsolation(code) {
    // Check for runId pattern
    if (/\brunId\b/i.test(code)) {
        return true;
    }
    // Check for testInfo.testId usage
    if (/testInfo\.testId/i.test(code)) {
        return true;
    }
    // Check for dynamic data generation
    if (/Date\.now\(\)|Math\.random\(\)|crypto|uuid/i.test(code)) {
        return true;
    }
    return false;
}
/**
 * Add runId variable to test
 */
function addRunIdVariable(code) {
    // Check if runId already exists
    if (/\bconst\s+runId\b/.test(code)) {
        return {
            applied: false,
            code,
            description: 'runId already defined',
            confidence: 0,
        };
    }
    // Find the test function start
    const testMatch = code.match(/test\s*\(\s*['"`][^'"`]+['"`]\s*,\s*async\s*\(\s*\{[^}]*\}\s*\)\s*=>\s*\{/);
    if (!testMatch) {
        return {
            applied: false,
            code,
            description: 'Unable to find test function',
            confidence: 0,
        };
    }
    // Insert runId after the test function opening brace
    const insertIndex = testMatch.index + testMatch[0].length;
    const indentation = '    ';
    const runIdDeclaration = `\n${indentation}const runId = \`\${Date.now()}-\${Math.random().toString(36).slice(2, 8)}\`;`;
    const modifiedCode = code.slice(0, insertIndex) + runIdDeclaration + code.slice(insertIndex);
    return {
        applied: true,
        code: modifiedCode,
        description: 'Added runId variable for data isolation',
        confidence: 0.8,
    };
}
/**
 * Namespace email with runId
 */
function namespaceEmail(email, runId) {
    const [local, domain] = email.split('@');
    if (!domain)
        return `${email}-${runId}`;
    return `${local}+${runId}@${domain}`;
}
/**
 * Namespace name with runId
 */
function namespaceName(name, runId) {
    return `${name} ${runId}`;
}
/**
 * Replace hardcoded email with namespaced version
 */
function replaceHardcodedEmail(code) {
    const emailPattern = /(['"`])([\w.+-]+@[\w.-]+\.[\w]{2,})(['"`])/g;
    let applied = false;
    const modifiedCode = code.replace(emailPattern, (match, _q1, email, _q2) => {
        // Don't replace if already using template literals with runId
        if (code.includes('`') && code.includes('${runId}')) {
            return match;
        }
        // Check if this is in a fill() or similar
        const before = code.slice(Math.max(0, code.indexOf(match) - 50), code.indexOf(match));
        if (/\.fill\s*\([^,]*$/.test(before)) {
            applied = true;
            const [local, domain] = email.split('@');
            return `\`${local}+\${runId}@${domain}\``;
        }
        return match;
    });
    return {
        applied,
        code: modifiedCode,
        description: applied ? 'Namespaced email with runId' : 'No hardcoded email to namespace',
        confidence: applied ? 0.7 : 0,
    };
}
/**
 * Replace hardcoded test data with namespaced version
 */
function replaceHardcodedTestData(code) {
    let modifiedCode = code;
    let applied = false;
    // Replace test names
    modifiedCode = modifiedCode.replace(/(['"`])(Test\s*(?:User|Name|Account|Client|Customer))\s*(['"`])/gi, (_match, _q1, name, _q2) => {
        applied = true;
        return `\`${name} \${runId}\``;
    });
    // Replace test- prefixed strings in fill operations
    modifiedCode = modifiedCode.replace(/\.fill\s*\([^,]+,\s*['"`](test[-_]?\w+)['"`]\s*\)/gi, (match, value) => {
        applied = true;
        return match.replace(`'${value}'`, `\`${value}-\${runId}\``).replace(`"${value}"`, `\`${value}-\${runId}\``);
    });
    return {
        applied,
        code: modifiedCode,
        description: applied ? 'Namespaced test data with runId' : 'No hardcoded test data found',
        confidence: applied ? 0.6 : 0,
    };
}
/**
 * Apply data isolation fix
 */
function applyDataFix(context) {
    const { code } = context;
    // Check if already has isolation
    if (hasDataIsolation(code)) {
        return {
            applied: false,
            code,
            description: 'Data isolation already present',
            confidence: 0,
        };
    }
    // First, add runId variable
    let result = addRunIdVariable(code);
    if (!result.applied) {
        return result;
    }
    let modifiedCode = result.code;
    let fixCount = 1;
    // Then namespace emails
    const emailResult = replaceHardcodedEmail(modifiedCode);
    if (emailResult.applied) {
        modifiedCode = emailResult.code;
        fixCount++;
    }
    // Then namespace test data
    const dataResult = replaceHardcodedTestData(modifiedCode);
    if (dataResult.applied) {
        modifiedCode = dataResult.code;
        fixCount++;
    }
    return {
        applied: true,
        code: modifiedCode,
        description: `Applied ${fixCount} data isolation fix(es)`,
        confidence: 0.7,
    };
}
/**
 * Add cleanup hook for test data
 */
function addCleanupHook(code, cleanupCode) {
    // Check if afterEach already exists
    if (/test\.afterEach\s*\(/.test(code)) {
        return {
            applied: false,
            code,
            description: 'afterEach hook already exists',
            confidence: 0,
        };
    }
    // Find test.describe or test block
    const describeMatch = code.match(/test\.describe\s*\(\s*['"`][^'"`]+['"`]\s*,\s*\(\s*\)\s*=>\s*\{/);
    if (describeMatch) {
        // Add after describe opening
        const insertIndex = describeMatch.index + describeMatch[0].length;
        const indentation = '  ';
        const hookCode = `\n${indentation}test.afterEach(async () => {\n${indentation}  ${cleanupCode}\n${indentation}});\n`;
        const modifiedCode = code.slice(0, insertIndex) + hookCode + code.slice(insertIndex);
        return {
            applied: true,
            code: modifiedCode,
            description: 'Added afterEach cleanup hook',
            confidence: 0.7,
        };
    }
    return {
        applied: false,
        code,
        description: 'Unable to find suitable location for cleanup hook',
        confidence: 0,
    };
}
/**
 * Extract test data patterns from code
 */
function extractTestDataPatterns(code) {
    const patterns = [];
    // Find fill operations
    const fillMatches = code.matchAll(/\.fill\s*\([^,]+,\s*['"`]([^'"`]+)['"`]\s*\)/g);
    for (const match of fillMatches) {
        patterns.push(match[1]);
    }
    // Find email patterns
    const emailMatches = code.matchAll(/['"`]([\w.+-]+@[\w.-]+\.[\w]{2,})['"`]/g);
    for (const match of emailMatches) {
        patterns.push(match[1]);
    }
    return patterns;
}
//# sourceMappingURL=data.js.map