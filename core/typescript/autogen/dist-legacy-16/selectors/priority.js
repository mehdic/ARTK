"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NAMEABLE_ROLES = exports.ELEMENT_TYPE_STRATEGIES = exports.DEFAULT_SELECTOR_PRIORITY = void 0;
exports.getSelectorPriority = getSelectorPriority;
exports.isForbiddenSelector = isForbiddenSelector;
exports.scoreLocator = scoreLocator;
exports.compareLocators = compareLocators;
exports.selectBestLocator = selectBestLocator;
exports.isRoleLocator = isRoleLocator;
exports.isSemanticLocator = isSemanticLocator;
exports.isTestIdLocator = isTestIdLocator;
exports.isCssLocator = isCssLocator;
exports.getRecommendedStrategies = getRecommendedStrategies;
exports.validateLocator = validateLocator;
exports.toPlaywrightLocator = toPlaywrightLocator;
/**
 * Default selector priority
 */
exports.DEFAULT_SELECTOR_PRIORITY = [
    'role',
    'label',
    'placeholder',
    'text',
    'testid',
    'css',
];
/**
 * Map from element type to preferred selector strategies
 */
exports.ELEMENT_TYPE_STRATEGIES = {
    button: ['role', 'text', 'testid'],
    link: ['role', 'text', 'testid'],
    textbox: ['role', 'label', 'placeholder', 'testid'],
    checkbox: ['role', 'label', 'testid'],
    radio: ['role', 'label', 'testid'],
    combobox: ['role', 'label', 'testid'],
    heading: ['role', 'text', 'testid'],
    listitem: ['role', 'text', 'testid'],
    menuitem: ['role', 'text', 'testid'],
    tab: ['role', 'text', 'testid'],
    dialog: ['role', 'testid'],
    alert: ['role', 'testid'],
    generic: ['text', 'testid', 'css'],
};
/**
 * ARIA roles that can have accessible names
 */
exports.NAMEABLE_ROLES = [
    'button',
    'link',
    'textbox',
    'checkbox',
    'radio',
    'combobox',
    'heading',
    'tab',
    'menuitem',
    'listitem',
    'option',
    'cell',
    'row',
    'columnheader',
    'rowheader',
];
/**
 * Get selector priority from config or use defaults
 */
function getSelectorPriority(config) {
    if (config?.selectorPolicy?.priority) {
        // Map config selector strategies to LocatorStrategy
        return config.selectorPolicy.priority.map((s) => {
            // Handle strategy name mapping if needed
            return s;
        });
    }
    return exports.DEFAULT_SELECTOR_PRIORITY;
}
/**
 * Check if a selector strategy is forbidden by config
 */
function isForbiddenSelector(locator, config) {
    const forbiddenPatterns = config?.selectorPolicy?.forbiddenPatterns ?? [];
    for (const pattern of forbiddenPatterns) {
        const regex = new RegExp(pattern);
        if (regex.test(locator.value)) {
            return true;
        }
    }
    return false;
}
/**
 * Score a locator based on priority (lower is better)
 */
function scoreLocator(locator, priority = exports.DEFAULT_SELECTOR_PRIORITY) {
    const index = priority.indexOf(locator.strategy);
    return index >= 0 ? index : priority.length;
}
/**
 * Compare two locators and return the better one
 */
function compareLocators(a, b, priority = exports.DEFAULT_SELECTOR_PRIORITY) {
    const scoreA = scoreLocator(a, priority);
    const scoreB = scoreLocator(b, priority);
    return scoreA <= scoreB ? a : b;
}
/**
 * Select the best locator from alternatives
 */
function selectBestLocator(alternatives, config) {
    if (alternatives.length === 0) {
        return null;
    }
    const priority = getSelectorPriority(config);
    // Filter out forbidden selectors
    const allowed = alternatives.filter((loc) => !isForbiddenSelector(loc, config));
    if (allowed.length === 0) {
        // All forbidden, return first original
        return alternatives[0] ?? null;
    }
    // Sort by priority
    allowed.sort((a, b) => scoreLocator(a, priority) - scoreLocator(b, priority));
    return allowed[0] ?? null;
}
/**
 * Check if a locator is a role locator
 */
function isRoleLocator(locator) {
    return locator.strategy === 'role';
}
/**
 * Check if a locator uses semantic selectors (role, label, text)
 */
function isSemanticLocator(locator) {
    return ['role', 'label', 'text', 'placeholder'].includes(locator.strategy);
}
/**
 * Check if a locator is a test ID locator
 */
function isTestIdLocator(locator) {
    return locator.strategy === 'testid';
}
/**
 * Check if a locator is a CSS locator (last resort)
 */
function isCssLocator(locator) {
    return locator.strategy === 'css';
}
/**
 * Get recommended strategies for an element type
 */
function getRecommendedStrategies(elementType) {
    return exports.ELEMENT_TYPE_STRATEGIES[elementType] ?? exports.ELEMENT_TYPE_STRATEGIES.generic;
}
/**
 * Validate a locator against best practices
 */
function validateLocator(locator, config) {
    const warnings = [];
    // Check if forbidden
    if (isForbiddenSelector(locator, config)) {
        warnings.push(`Selector matches forbidden pattern: ${locator.value}`);
    }
    // Warn about CSS selectors
    if (isCssLocator(locator)) {
        warnings.push(`CSS selector "${locator.value}" is fragile. Consider using role, label, or testid.`);
    }
    // Warn about XPath-like patterns in CSS
    if (locator.value.includes('//') || locator.value.includes('..')) {
        warnings.push(`Selector "${locator.value}" appears to use XPath syntax in CSS.`);
    }
    // Warn about nth-child selectors
    if (locator.value.includes('nth-child') || locator.value.includes('nth-of-type')) {
        warnings.push(`Selector "${locator.value}" uses nth-child which is position-dependent.`);
    }
    // Warn about ID selectors that might be dynamic
    if (locator.strategy === 'css' && /^#[a-z]+-\d+$/i.test(locator.value)) {
        warnings.push(`Selector "${locator.value}" appears to have a dynamic ID.`);
    }
    return {
        valid: warnings.length === 0,
        warnings,
    };
}
/**
 * Generate Playwright locator code from LocatorSpec
 */
function toPlaywrightLocator(locator) {
    switch (locator.strategy) {
        case 'role': {
            const opts = [];
            if (locator.options?.name) {
                opts.push(`name: '${escapeString(locator.options.name)}'`);
            }
            if (locator.options?.exact) {
                opts.push('exact: true');
            }
            if (locator.options?.level) {
                opts.push(`level: ${locator.options.level}`);
            }
            const optsStr = opts.length > 0 ? `, { ${opts.join(', ')} }` : '';
            return `getByRole('${locator.value}'${optsStr})`;
        }
        case 'label': {
            const exact = locator.options?.exact ? ', { exact: true }' : '';
            return `getByLabel('${escapeString(locator.value)}'${exact})`;
        }
        case 'placeholder': {
            const exact = locator.options?.exact ? ', { exact: true }' : '';
            return `getByPlaceholder('${escapeString(locator.value)}'${exact})`;
        }
        case 'text': {
            const exact = locator.options?.exact ? ', { exact: true }' : '';
            return `getByText('${escapeString(locator.value)}'${exact})`;
        }
        case 'testid':
            return `getByTestId('${escapeString(locator.value)}')`;
        case 'css':
            return `locator('${escapeString(locator.value)}')`;
        default:
            return `locator('${escapeString(locator.value)}')`;
    }
}
/**
 * Escape string for use in generated code
 */
function escapeString(str) {
    return str.replace(/'/g, "\\'").replace(/\n/g, '\\n');
}
//# sourceMappingURL=priority.js.map