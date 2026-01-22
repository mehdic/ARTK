"use strict";
/**
 * Import Meta Usage Validation Rule
 * T053: Implement import-meta-usage rule (FR-022)
 *
 * Detects usage of import.meta in CommonJS environments where it would cause runtime errors.
 *
 * @module @artk/core/validation/rules/import-meta-usage
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImportMetaUsageRule = void 0;
exports.createImportMetaUsageRule = createImportMetaUsageRule;
/**
 * Regex patterns to detect import.meta usage
 */
const IMPORT_META_PATTERNS = [
    /import\.meta\.url/g,
    /import\.meta\.dirname/g,
    /import\.meta\.filename/g,
    /import\.meta\.resolve/g,
    /import\.meta(?!\.)/g, // Just import.meta without property
];
/**
 * Rule configuration
 */
const config = {
    id: 'import-meta-usage',
    name: 'Import Meta Usage',
    description: 'Detects usage of import.meta in CommonJS environments where it is not available',
    defaultStrictness: 'error',
};
/**
 * Check if a position is inside a comment or string literal
 */
function isInCommentOrString(content, position) {
    const before = content.substring(0, position);
    // Check if in single-line comment
    const lastNewline = before.lastIndexOf('\n');
    const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;
    const lineBefore = before.substring(lineStart);
    if (lineBefore.includes('//')) {
        return true;
    }
    // Check if in block comment
    const lastBlockStart = before.lastIndexOf('/*');
    const lastBlockEnd = before.lastIndexOf('*/');
    if (lastBlockStart > lastBlockEnd) {
        return true;
    }
    // Check if in string literal (simple heuristic)
    let inString = false;
    let stringChar = '';
    let escaped = false;
    for (let i = 0; i < position; i++) {
        const char = content[i];
        if (escaped) {
            escaped = false;
            continue;
        }
        if (char === '\\') {
            escaped = true;
            continue;
        }
        if (char === '"' || char === "'" || char === '`') {
            if (!inString) {
                inString = true;
                stringChar = char;
            }
            else if (char === stringChar) {
                inString = false;
                stringChar = '';
            }
        }
    }
    return inString;
}
/**
 * Get line number for a position in content
 */
function getLineNumber(content, position) {
    const before = content.substring(0, position);
    return before.split('\n').length;
}
/**
 * Import Meta Usage Rule
 *
 * Detects import.meta usage in CommonJS environments
 */
class ImportMetaUsageRule {
    config = config;
    /**
     * Validate a file for import.meta usage
     */
    validate(filePath, content, moduleSystem) {
        // import.meta is valid in ESM
        if (moduleSystem === 'esm') {
            return [];
        }
        const issues = [];
        const processedPositions = new Set();
        for (const pattern of IMPORT_META_PATTERNS) {
            // Reset lastIndex for global patterns
            pattern.lastIndex = 0;
            let match;
            while ((match = pattern.exec(content)) !== null) {
                const position = match.index;
                // Skip if we've already processed this position
                if (processedPositions.has(position)) {
                    continue;
                }
                processedPositions.add(position);
                // Skip if in comment or string literal
                if (isInCommentOrString(content, position)) {
                    continue;
                }
                const lineNumber = getLineNumber(content, position);
                const matchedText = match[0];
                issues.push({
                    file: filePath,
                    line: lineNumber,
                    column: null,
                    severity: 'error',
                    ruleId: this.config.id,
                    message: `import.meta is not available in CommonJS modules. Found: ${matchedText}`,
                    suggestedFix: "Use getDirname() from '@artk/core/compat' instead of import.meta.url, or switch to ESM by adding \"type\": \"module\" to package.json",
                });
            }
        }
        return issues;
    }
}
exports.ImportMetaUsageRule = ImportMetaUsageRule;
/**
 * Create a new ImportMetaUsageRule instance
 */
function createImportMetaUsageRule() {
    return new ImportMetaUsageRule();
}
//# sourceMappingURL=import-meta-usage.js.map