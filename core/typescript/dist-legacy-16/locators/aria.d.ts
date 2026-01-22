/**
 * ARIA and accessibility helper functions
 *
 * Provides utilities for working with ARIA attributes and
 * accessibility-focused element queries.
 *
 * @module locators/aria
 */
import type { Locator } from '@playwright/test';
import type { AriaRole } from './types.js';
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
export declare function getAriaRole(locator: Locator): Promise<string | null>;
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
export declare function getAriaLabel(locator: Locator): Promise<string | null>;
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
export declare function getAriaDescription(locator: Locator): Promise<string | null>;
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
export declare function isAriaDisabled(locator: Locator): Promise<boolean>;
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
export declare function isAriaExpanded(locator: Locator): Promise<boolean | null>;
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
export declare function isAriaChecked(locator: Locator): Promise<boolean | null>;
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
export declare function isAriaHidden(locator: Locator): Promise<boolean>;
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
export declare function getAriaLive(locator: Locator): Promise<'polite' | 'assertive' | 'off' | null>;
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
export declare function isAriaRequired(locator: Locator): Promise<boolean>;
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
export declare function isAriaInvalid(locator: Locator): Promise<boolean>;
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
export declare function getAccessibleName(locator: Locator): Promise<string | null>;
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
export declare function isValidAriaRole(role: string): role is AriaRole;
//# sourceMappingURL=aria.d.ts.map