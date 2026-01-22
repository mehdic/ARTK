"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseHints = parseHints;
exports.extractHints = extractHints;
exports.hasLocatorHints = hasLocatorHints;
exports.hasBehaviorHints = hasBehaviorHints;
exports.generateLocatorFromHints = generateLocatorFromHints;
exports.parseModuleHint = parseModuleHint;
exports.validateHints = validateHints;
exports.mergeWithInferred = mergeWithInferred;
/**
 * Machine Hint Parser - Extract hints from Journey step text
 * @see T072 - Implement machine hint parser
 */
const hintPatterns_js_1 = require("./hintPatterns.js");
/**
 * Parse machine hints from step text
 */
function parseHints(text) {
    const hints = [];
    const warnings = [];
    if (!(0, hintPatterns_js_1.containsHints)(text)) {
        return {
            hints: [],
            cleanText: text,
            originalText: text,
            warnings: [],
        };
    }
    // Extract all hint blocks
    hintPatterns_js_1.HINT_BLOCK_PATTERN.lastIndex = 0;
    let match;
    while ((match = hintPatterns_js_1.HINT_BLOCK_PATTERN.exec(text)) !== null) {
        const key = match[1].toLowerCase();
        const value = match[2] || match[3] || match[4];
        if (!value) {
            warnings.push(`Empty value for hint: ${key}`);
            continue;
        }
        // Validate the hint type
        if (!(key in hintPatterns_js_1.HINT_PATTERNS)) {
            warnings.push(`Unknown hint type: ${key}`);
            continue;
        }
        // Validate role values
        if (key === 'role' && !(0, hintPatterns_js_1.isValidRole)(value)) {
            warnings.push(`Invalid ARIA role: ${value}`);
        }
        hints.push({
            type: key,
            value,
            raw: match[0],
        });
    }
    return {
        hints,
        cleanText: (0, hintPatterns_js_1.removeHints)(text),
        originalText: text,
        warnings,
    };
}
/**
 * Extract structured hints for code generation
 */
function extractHints(text) {
    const parsed = parseHints(text);
    const locator = {};
    const behavior = {};
    for (const hint of parsed.hints) {
        switch (hint.type) {
            case 'role':
                locator.role = hint.value;
                break;
            case 'testid':
                locator.testid = hint.value;
                break;
            case 'label':
                locator.label = hint.value;
                break;
            case 'text':
                locator.text = hint.value;
                break;
            case 'exact':
                locator.exact = hint.value.toLowerCase() === 'true';
                break;
            case 'level':
                locator.level = parseInt(hint.value, 10);
                break;
            case 'signal':
                behavior.signal = hint.value;
                break;
            case 'module':
                behavior.module = hint.value;
                break;
            case 'wait':
                behavior.wait = hint.value;
                break;
            case 'timeout':
                behavior.timeout = parseInt(hint.value, 10);
                break;
        }
    }
    return {
        locator,
        behavior,
        hasHints: parsed.hints.length > 0,
        cleanText: parsed.cleanText,
        warnings: parsed.warnings,
    };
}
/**
 * Check if hints specify a locator strategy
 */
function hasLocatorHints(hints) {
    const { locator } = hints;
    return !!(locator.role || locator.testid || locator.label || locator.text);
}
/**
 * Check if hints specify behavioral modifications
 */
function hasBehaviorHints(hints) {
    const { behavior } = hints;
    return !!(behavior.signal || behavior.module || behavior.wait || behavior.timeout);
}
/**
 * Generate locator code from hints
 */
function generateLocatorFromHints(hints) {
    // Priority: testid > role > label > text
    if (hints.testid) {
        return `page.getByTestId('${hints.testid}')`;
    }
    if (hints.role) {
        const options = [];
        if (hints.label) {
            options.push(`name: '${hints.label}'`);
        }
        if (hints.exact) {
            options.push('exact: true');
        }
        if (hints.level && hints.role === 'heading') {
            options.push(`level: ${hints.level}`);
        }
        if (options.length > 0) {
            return `page.getByRole('${hints.role}', { ${options.join(', ')} })`;
        }
        return `page.getByRole('${hints.role}')`;
    }
    if (hints.label) {
        if (hints.exact) {
            return `page.getByLabel('${hints.label}', { exact: true })`;
        }
        return `page.getByLabel('${hints.label}')`;
    }
    if (hints.text) {
        if (hints.exact) {
            return `page.getByText('${hints.text}', { exact: true })`;
        }
        return `page.getByText('${hints.text}')`;
    }
    return null;
}
/**
 * Parse module hint into module name and method
 */
function parseModuleHint(moduleHint) {
    const parts = moduleHint.split('.');
    if (parts.length !== 2) {
        return null;
    }
    return {
        module: parts[0],
        method: parts[1],
    };
}
/**
 * Validate hints for consistency
 */
function validateHints(hints) {
    const errors = [];
    // Check for conflicting locator hints
    const locatorCount = [
        hints.locator.testid,
        hints.locator.role,
        hints.locator.label && !hints.locator.role, // label with role is fine
        hints.locator.text,
    ].filter(Boolean).length;
    if (locatorCount > 1) {
        errors.push('Multiple conflicting locator hints specified');
    }
    // Check for level without heading role
    if (hints.locator.level && hints.locator.role !== 'heading') {
        errors.push('level hint only applies to role=heading');
    }
    // Check for module hint format
    if (hints.behavior.module) {
        const parsed = parseModuleHint(hints.behavior.module);
        if (!parsed) {
            errors.push('module hint must be in format: moduleName.methodName');
        }
    }
    return errors;
}
/**
 * Merge hints with inferred locator (hints take priority)
 */
function mergeWithInferred(hints, inferred) {
    // If hints specify a locator, use it
    if (hints.testid) {
        return { strategy: 'testid', value: hints.testid };
    }
    if (hints.role) {
        const options = {};
        if (hints.label) {
            options.name = hints.label;
        }
        if (hints.exact) {
            options.exact = true;
        }
        if (hints.level) {
            options.level = hints.level;
        }
        return { strategy: 'role', value: hints.role, options };
    }
    if (hints.label) {
        const options = {};
        if (hints.exact) {
            options.exact = true;
        }
        return { strategy: 'label', value: hints.label, options };
    }
    if (hints.text) {
        const options = {};
        if (hints.exact) {
            options.exact = true;
        }
        return { strategy: 'text', value: hints.text, options };
    }
    // Add exact option to inferred if specified
    if (hints.exact) {
        return { ...inferred, options: { exact: true } };
    }
    // Fall back to inferred
    return inferred;
}
//# sourceMappingURL=parseHints.js.map