"use strict";
/**
 * ARIA and accessibility helper functions
 *
 * Provides utilities for working with ARIA attributes and
 * accessibility-focused element queries.
 *
 * @module locators/aria
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAriaRole = getAriaRole;
exports.getAriaLabel = getAriaLabel;
exports.getAriaDescription = getAriaDescription;
exports.isAriaDisabled = isAriaDisabled;
exports.isAriaExpanded = isAriaExpanded;
exports.isAriaChecked = isAriaChecked;
exports.isAriaHidden = isAriaHidden;
exports.getAriaLive = getAriaLive;
exports.isAriaRequired = isAriaRequired;
exports.isAriaInvalid = isAriaInvalid;
exports.getAccessibleName = getAccessibleName;
exports.isValidAriaRole = isValidAriaRole;
// =============================================================================
// ARIA Attribute Helpers
// =============================================================================
/**
 * Get ARIA role from element
 *
 * @param locator - Element locator
 * @returns Promise resolving to ARIA role or null
 *
 * @example
 * ```ts
 * const button = page.locator('button').first();
 * const role = await getAriaRole(button);
 * console.log(role); // 'button'
 * ```
 */
async function getAriaRole(locator) {
    try {
        return await locator.getAttribute('role');
    }
    catch {
        return null;
    }
}
/**
 * Get ARIA label from element
 *
 * Checks aria-label attribute first, then aria-labelledby reference.
 *
 * @param locator - Element locator
 * @returns Promise resolving to accessible name or null
 *
 * @example
 * ```ts
 * const input = page.getByRole('textbox').first();
 * const label = await getAriaLabel(input);
 * console.log(label); // 'Email address'
 * ```
 */
async function getAriaLabel(locator) {
    try {
        // Check aria-label first
        const ariaLabel = await locator.getAttribute('aria-label');
        if (ariaLabel) {
            return ariaLabel;
        }
        // Check aria-labelledby reference
        const labelledBy = await locator.getAttribute('aria-labelledby');
        if (labelledBy) {
            // Note: Getting text from referenced element would require page context
            // For now, return the reference ID
            return labelledBy;
        }
        return null;
    }
    catch {
        return null;
    }
}
/**
 * Get ARIA description from element
 *
 * Checks aria-description attribute first, then aria-describedby reference.
 *
 * @param locator - Element locator
 * @returns Promise resolving to description or null
 *
 * @example
 * ```ts
 * const input = page.getByRole('textbox').first();
 * const description = await getAriaDescription(input);
 * console.log(description); // 'Enter your email address'
 * ```
 */
async function getAriaDescription(locator) {
    try {
        // Check aria-description first
        const ariaDescription = await locator.getAttribute('aria-description');
        if (ariaDescription) {
            return ariaDescription;
        }
        // Check aria-describedby reference
        const describedBy = await locator.getAttribute('aria-describedby');
        if (describedBy) {
            return describedBy;
        }
        return null;
    }
    catch {
        return null;
    }
}
/**
 * Check if element is disabled (via aria-disabled or disabled attribute)
 *
 * @param locator - Element locator
 * @returns Promise resolving to true if disabled
 *
 * @example
 * ```ts
 * const button = page.getByRole('button', { name: 'Submit' });
 * const disabled = await isAriaDisabled(button);
 * if (disabled) {
 *   console.log('Button is disabled');
 * }
 * ```
 */
async function isAriaDisabled(locator) {
    try {
        // Check aria-disabled attribute
        const ariaDisabled = await locator.getAttribute('aria-disabled');
        if (ariaDisabled === 'true') {
            return true;
        }
        // Check standard disabled attribute
        const disabled = await locator.getAttribute('disabled');
        return disabled !== null;
    }
    catch {
        return false;
    }
}
/**
 * Check if element is expanded (via aria-expanded attribute)
 *
 * @param locator - Element locator
 * @returns Promise resolving to true if expanded, false if collapsed, null if not applicable
 *
 * @example
 * ```ts
 * const accordion = page.getByRole('button', { name: 'Show details' });
 * const expanded = await isAriaExpanded(accordion);
 * if (expanded) {
 *   console.log('Accordion is expanded');
 * }
 * ```
 */
async function isAriaExpanded(locator) {
    try {
        const ariaExpanded = await locator.getAttribute('aria-expanded');
        if (ariaExpanded === 'true') {
            return true;
        }
        if (ariaExpanded === 'false') {
            return false;
        }
        return null;
    }
    catch {
        return null;
    }
}
/**
 * Check if element is checked (via aria-checked attribute)
 *
 * @param locator - Element locator
 * @returns Promise resolving to true if checked, false if unchecked, null if not applicable
 *
 * @example
 * ```ts
 * const checkbox = page.getByRole('checkbox', { name: 'Accept terms' });
 * const checked = await isAriaChecked(checkbox);
 * if (checked) {
 *   console.log('Checkbox is checked');
 * }
 * ```
 */
async function isAriaChecked(locator) {
    try {
        const ariaChecked = await locator.getAttribute('aria-checked');
        if (ariaChecked === 'true') {
            return true;
        }
        if (ariaChecked === 'false') {
            return false;
        }
        return null;
    }
    catch {
        return null;
    }
}
/**
 * Check if element is hidden (via aria-hidden attribute)
 *
 * @param locator - Element locator
 * @returns Promise resolving to true if aria-hidden="true"
 *
 * @example
 * ```ts
 * const icon = page.locator('.icon').first();
 * const hidden = await isAriaHidden(icon);
 * if (hidden) {
 *   console.log('Icon is hidden from screen readers');
 * }
 * ```
 */
async function isAriaHidden(locator) {
    try {
        const ariaHidden = await locator.getAttribute('aria-hidden');
        return ariaHidden === 'true';
    }
    catch {
        return false;
    }
}
/**
 * Get ARIA live region politeness setting
 *
 * @param locator - Element locator
 * @returns Promise resolving to 'polite', 'assertive', 'off', or null
 *
 * @example
 * ```ts
 * const notification = page.locator('.notification').first();
 * const live = await getAriaLive(notification);
 * console.log(live); // 'polite'
 * ```
 */
async function getAriaLive(locator) {
    try {
        const ariaLive = await locator.getAttribute('aria-live');
        if (ariaLive === 'polite' ||
            ariaLive === 'assertive' ||
            ariaLive === 'off') {
            return ariaLive;
        }
        return null;
    }
    catch {
        return null;
    }
}
/**
 * Check if element is required (via aria-required attribute)
 *
 * @param locator - Element locator
 * @returns Promise resolving to true if required
 *
 * @example
 * ```ts
 * const input = page.getByLabel('Email');
 * const required = await isAriaRequired(input);
 * if (required) {
 *   console.log('Email is a required field');
 * }
 * ```
 */
async function isAriaRequired(locator) {
    try {
        const ariaRequired = await locator.getAttribute('aria-required');
        return ariaRequired === 'true';
    }
    catch {
        return false;
    }
}
/**
 * Check if element is invalid (via aria-invalid attribute)
 *
 * @param locator - Element locator
 * @returns Promise resolving to true if invalid
 *
 * @example
 * ```ts
 * const input = page.getByLabel('Email');
 * const invalid = await isAriaInvalid(input);
 * if (invalid) {
 *   console.log('Email has validation errors');
 * }
 * ```
 */
async function isAriaInvalid(locator) {
    try {
        const ariaInvalid = await locator.getAttribute('aria-invalid');
        return ariaInvalid === 'true';
    }
    catch {
        return false;
    }
}
/**
 * Get accessible name computed from element
 *
 * Uses Playwright's textContent as a fallback for computing accessible name.
 * Note: This is a simplified version; full accessible name computation
 * requires browser's accessibility tree.
 *
 * @param locator - Element locator
 * @returns Promise resolving to accessible name or null
 *
 * @example
 * ```ts
 * const button = page.getByRole('button').first();
 * const name = await getAccessibleName(button);
 * console.log(name); // 'Submit form'
 * ```
 */
async function getAccessibleName(locator) {
    try {
        // Check aria-label first
        const ariaLabel = await getAriaLabel(locator);
        if (ariaLabel) {
            return ariaLabel;
        }
        // Fall back to text content
        const textContent = await locator.textContent();
        return textContent?.trim() || null;
    }
    catch {
        return null;
    }
}
// =============================================================================
// Validation Helpers
// =============================================================================
/**
 * Validate if role is a standard ARIA role
 *
 * @param role - Role string to validate
 * @returns True if role is a valid ARIA role
 *
 * @example
 * ```ts
 * const isValid = isValidAriaRole('button'); // true
 * const isInvalid = isValidAriaRole('invalid-role'); // false
 * ```
 */
function isValidAriaRole(role) {
    const validRoles = [
        // Document structure roles
        'article',
        'banner',
        'complementary',
        'contentinfo',
        'form',
        'main',
        'navigation',
        'region',
        'search',
        // Landmark roles
        'application',
        'directory',
        'document',
        'feed',
        'figure',
        'img',
        'list',
        'listitem',
        'math',
        'note',
        'presentation',
        'table',
        'term',
        // Widget roles
        'alert',
        'alertdialog',
        'button',
        'checkbox',
        'dialog',
        'gridcell',
        'link',
        'log',
        'marquee',
        'menuitem',
        'menuitemcheckbox',
        'menuitemradio',
        'option',
        'progressbar',
        'radio',
        'scrollbar',
        'searchbox',
        'slider',
        'spinbutton',
        'status',
        'switch',
        'tab',
        'tabpanel',
        'textbox',
        'timer',
        'tooltip',
        'tree',
        'treeitem',
        // Composite widget roles
        'combobox',
        'grid',
        'listbox',
        'menu',
        'menubar',
        'radiogroup',
        'tablist',
        'toolbar',
        'treegrid',
        // Heading roles
        'heading',
        // Row and cell roles
        'row',
        'rowheader',
        'columnheader',
        'cell',
    ];
    return validRoles.includes(role);
}
//# sourceMappingURL=aria.js.map