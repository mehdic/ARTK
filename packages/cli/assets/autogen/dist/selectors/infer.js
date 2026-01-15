import { NAMEABLE_ROLES, selectBestLocator, } from './priority.js';
import { suggestSelector, hasTestId } from './catalog.js';
/**
 * Common element type keywords
 */
const ELEMENT_KEYWORDS = {
    button: 'button',
    btn: 'button',
    submit: 'button',
    link: 'link',
    anchor: 'link',
    input: 'textbox',
    textbox: 'textbox',
    field: 'textbox',
    textarea: 'textbox',
    checkbox: 'checkbox',
    check: 'checkbox',
    radio: 'radio',
    dropdown: 'combobox',
    select: 'combobox',
    combo: 'combobox',
    heading: 'heading',
    title: 'heading',
    header: 'heading',
    menu: 'menu',
    menuitem: 'menuitem',
    tab: 'tab',
    dialog: 'dialog',
    modal: 'dialog',
    alert: 'alert',
    list: 'list',
    listitem: 'listitem',
    table: 'table',
    row: 'row',
    cell: 'cell',
};
/**
 * Infer the element type from text
 */
export function inferElementType(text) {
    const lowerText = text.toLowerCase();
    for (const [keyword, elementType] of Object.entries(ELEMENT_KEYWORDS)) {
        if (lowerText.includes(keyword)) {
            return elementType;
        }
    }
    return null;
}
/**
 * Infer the ARIA role from element type
 */
export function inferRole(elementType) {
    // Most element types map directly to roles
    const roleMap = {
        button: 'button',
        link: 'link',
        textbox: 'textbox',
        checkbox: 'checkbox',
        radio: 'radio',
        combobox: 'combobox',
        heading: 'heading',
        menu: 'menu',
        menuitem: 'menuitem',
        tab: 'tab',
        dialog: 'dialog',
        alert: 'alert',
        list: 'list',
        listitem: 'listitem',
        table: 'table',
        row: 'row',
        cell: 'cell',
    };
    return roleMap[elementType] ?? null;
}
/**
 * Extract a name/label from text
 */
export function extractName(text) {
    // Look for quoted strings
    const quotedMatch = text.match(/['"]([^'"]+)['"]/);
    if (quotedMatch) {
        return quotedMatch[1];
    }
    // Look for "the X button" pattern
    const theMatch = text.match(/(?:the\s+)?['"]?([^'"]+?)['"]?\s+(?:button|link|field|input|checkbox|dropdown)/i);
    if (theMatch) {
        return theMatch[1].trim();
    }
    return null;
}
/**
 * Infer selector alternatives from step text
 */
export function inferSelectors(text) {
    const alternatives = [];
    const elementType = inferElementType(text);
    const name = extractName(text);
    const role = elementType ? inferRole(elementType) : null;
    // Try role-based selector if we have a role
    if (role && NAMEABLE_ROLES.includes(role)) {
        if (name) {
            alternatives.push({
                strategy: 'role',
                value: role,
                options: { name },
            });
        }
        else {
            alternatives.push({
                strategy: 'role',
                value: role,
            });
        }
    }
    // Try label selector for form elements
    if (name && ['textbox', 'checkbox', 'radio', 'combobox'].includes(elementType || '')) {
        alternatives.push({
            strategy: 'label',
            value: name,
        });
    }
    // Try text selector
    if (name) {
        alternatives.push({
            strategy: 'text',
            value: name,
        });
    }
    return alternatives;
}
/**
 * Infer the best selector from step text
 */
export function inferBestSelector(text) {
    const alternatives = inferSelectors(text);
    return selectBestLocator(alternatives);
}
/**
 * Infer selector for a button element
 */
export function inferButtonSelector(name) {
    return {
        strategy: 'role',
        value: 'button',
        options: { name },
    };
}
/**
 * Infer selector for a link element
 */
export function inferLinkSelector(name) {
    return {
        strategy: 'role',
        value: 'link',
        options: { name },
    };
}
/**
 * Infer selector for an input field
 */
export function inferInputSelector(labelOrPlaceholder) {
    return {
        strategy: 'label',
        value: labelOrPlaceholder,
    };
}
/**
 * Infer selector for a checkbox
 */
export function inferCheckboxSelector(label) {
    return {
        strategy: 'role',
        value: 'checkbox',
        options: { name: label },
    };
}
/**
 * Infer selector for a heading
 */
export function inferHeadingSelector(text, level) {
    const locator = {
        strategy: 'role',
        value: 'heading',
        options: { name: text },
    };
    if (level) {
        locator.options.level = level;
    }
    return locator;
}
/**
 * Infer selector for a tab
 */
export function inferTabSelector(name) {
    return {
        strategy: 'role',
        value: 'tab',
        options: { name },
    };
}
/**
 * Infer selector for generic text content
 */
export function inferTextSelector(text) {
    return {
        strategy: 'text',
        value: text,
    };
}
/**
 * Infer selector from a test ID
 */
export function inferTestIdSelector(testId) {
    return {
        strategy: 'testid',
        value: testId,
    };
}
/**
 * Create a CSS selector (last resort)
 */
export function createCssSelector(selector) {
    return {
        strategy: 'css',
        value: selector,
    };
}
/**
 * Analyze text and suggest the best selector approach
 */
export function suggestSelectorApproach(text) {
    const elementType = inferElementType(text);
    const role = elementType ? inferRole(elementType) : null;
    const name = extractName(text);
    const alternatives = inferSelectors(text);
    // Determine recommended strategy
    let recommendedStrategy = 'text';
    if (role && NAMEABLE_ROLES.includes(role)) {
        recommendedStrategy = 'role';
    }
    else if (name && ['textbox', 'checkbox', 'radio', 'combobox'].includes(elementType || '')) {
        recommendedStrategy = 'label';
    }
    else if (name) {
        recommendedStrategy = 'text';
    }
    return {
        elementType,
        role,
        name,
        recommendedStrategy,
        alternatives,
    };
}
/**
 * Infer selector with catalog lookup (T092)
 * First checks the catalog for a known selector, then falls back to inference
 */
export function inferSelectorWithCatalog(text, options) {
    const useCatalog = options?.useCatalog ?? true;
    // Try catalog first if enabled
    if (useCatalog) {
        const catalogEntry = suggestSelector(text);
        if (catalogEntry) {
            return {
                strategy: catalogEntry.strategy,
                value: catalogEntry.value,
                options: catalogEntry.options,
            };
        }
        // Also try extracting a name and checking if it's a known testid
        const name = extractName(text);
        if (name) {
            // Try common testid patterns
            const possibleTestIds = [
                name.toLowerCase().replace(/\s+/g, '-'),
                name.toLowerCase().replace(/\s+/g, '_'),
                name,
            ];
            for (const testId of possibleTestIds) {
                if (hasTestId(testId)) {
                    return {
                        strategy: 'testid',
                        value: testId,
                    };
                }
            }
        }
    }
    // Fall back to inference
    return inferBestSelector(text);
}
/**
 * Infer selectors with catalog augmentation (T092)
 * Returns catalog-based selectors first, then inferred alternatives
 */
export function inferSelectorsWithCatalog(text, options) {
    const useCatalog = options?.useCatalog ?? true;
    const alternatives = [];
    // Try catalog first if enabled
    if (useCatalog) {
        const catalogEntry = suggestSelector(text);
        if (catalogEntry) {
            alternatives.push({
                strategy: catalogEntry.strategy,
                value: catalogEntry.value,
                options: catalogEntry.options,
            });
        }
    }
    // Add inferred selectors
    alternatives.push(...inferSelectors(text));
    // Deduplicate by strategy+value
    const seen = new Set();
    return alternatives.filter((loc) => {
        const key = `${loc.strategy}:${loc.value}`;
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
}
//# sourceMappingURL=infer.js.map