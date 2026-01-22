"use strict";
/**
 * Okta IdP handler
 *
 * Handles Okta-specific login page interactions.
 *
 * FR-006: Support OIDC with configurable Identity Provider handlers (Okta)
 *
 * @module auth/oidc/providers/okta
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.oktaHandler = void 0;
exports.isOktaLoginPage = isOktaLoginPage;
exports.getOktaErrorMessage = getOktaErrorMessage;
exports.isOktaFactorSelectionRequired = isOktaFactorSelectionRequired;
const flow_js_1 = require("../flow.js");
const logger_js_1 = require("../../../utils/logger.js");
const logger = (0, logger_js_1.createLogger)('auth', 'okta');
// =============================================================================
// Default Selectors
// =============================================================================
/**
 * Default Okta form selectors
 *
 * Okta supports multiple login flows:
 * - Classic hosted login
 * - Okta Identity Engine (OIE)
 * - Custom login widgets
 */
const DEFAULT_OKTA_SELECTORS = {
    // Username input
    username: '#okta-signin-username, input[name="identifier"], input[name="username"]',
    // Password input
    password: '#okta-signin-password, input[name="credentials.passcode"], input[name="password"]',
    // Submit button
    submit: '#okta-signin-submit, input[type="submit"], button[type="submit"]',
    // TOTP/OTP selectors
    totpInput: 'input[name="credentials.passcode"], input[name="answer"], #input-container input',
    totpSubmit: 'input[type="submit"], button[type="submit"]',
};
// =============================================================================
// Okta Handler
// =============================================================================
/**
 * Okta Identity Provider handler
 *
 * Handles:
 * - Standard username/password login
 * - Okta Identity Engine flows
 * - TOTP-based MFA
 * - Push notification MFA (with timeout)
 */
exports.oktaHandler = {
    idpType: 'okta',
    /**
     * Fill credentials on Okta login page
     */
    async fillCredentials(page, credentials, selectors) {
        const { username: usernameSelector, password: passwordSelector } = {
            ...DEFAULT_OKTA_SELECTORS,
            ...selectors,
        };
        logger.debug('Filling Okta credentials');
        // Wait for username field
        await page.waitForSelector(usernameSelector, { state: 'visible', timeout: 10000 });
        // Check if this is OIE (two-step) or classic (single-page) flow
        const passwordField = page.locator(passwordSelector);
        const isPasswordVisible = await passwordField.isVisible().catch(() => false);
        if (isPasswordVisible) {
            // Classic flow - both fields visible
            await page.fill(usernameSelector, credentials.username);
            await page.fill(passwordSelector, credentials.password);
        }
        else {
            // OIE flow - username first, then password
            await page.fill(usernameSelector, credentials.username);
            // Submit will be called next, then password appears
        }
    },
    /**
     * Submit the Okta login form
     */
    async submitForm(page, selectors) {
        const { submit: submitSelector, password: passwordSelector } = {
            ...DEFAULT_OKTA_SELECTORS,
            ...selectors,
        };
        // Click submit
        await page.click(submitSelector);
        // Wait for potential page transition
        await page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => { });
        // Check if password field appeared (OIE two-step flow)
        try {
            const passwordField = page.locator(passwordSelector);
            const isPasswordVisible = await passwordField.isVisible({ timeout: 2000 });
            if (isPasswordVisible) {
                const passwordValue = await passwordField.inputValue();
                if (!passwordValue) {
                    logger.debug('OIE two-step flow detected, password page loaded');
                    // Note: Password should have been filled in fillCredentials
                    // This handles edge cases
                }
            }
        }
        catch {
            // Password field not visible, continue
        }
        logger.debug('Okta form submitted');
    },
    /**
     * Handle Okta MFA challenge
     */
    async handleMFA(page, mfaConfig) {
        if (mfaConfig.type !== 'totp') {
            logger.warn('Non-TOTP MFA type for Okta', { type: mfaConfig.type });
            // For push, we just wait
            if (mfaConfig.type === 'push') {
                await handleOktaPushMfa(page, mfaConfig);
                return;
            }
            return;
        }
        const totpSelector = mfaConfig.totpInputSelector ?? DEFAULT_OKTA_SELECTORS.totpInput;
        const submitSelector = mfaConfig.totpSubmitSelector ?? DEFAULT_OKTA_SELECTORS.totpSubmit;
        logger.debug('Handling Okta TOTP MFA');
        // Wait for OTP input
        await page.waitForSelector(totpSelector, { state: 'visible', timeout: 10000 });
        // Generate and enter code
        if (!mfaConfig.totpSecretEnv) {
            throw new Error('TOTP secret environment variable not configured');
        }
        const code = (0, flow_js_1.generateTOTPCode)(mfaConfig.totpSecretEnv);
        await page.fill(totpSelector, code);
        await page.click(submitSelector);
        logger.debug('TOTP code submitted to Okta');
    },
    /**
     * Get default Okta selectors
     */
    getDefaultSelectors() {
        return { ...DEFAULT_OKTA_SELECTORS };
    },
};
// =============================================================================
// Helper Functions
// =============================================================================
/**
 * Handle Okta Push MFA
 */
async function handleOktaPushMfa(page, mfaConfig) {
    const timeout = mfaConfig.pushTimeoutMs ?? 30000;
    logger.info('Waiting for Okta Push approval', { timeoutMs: timeout });
    // Wait for push to be approved (page navigates away from MFA)
    try {
        await page.waitForFunction(() => {
            const url = window.location.href;
            return !url.includes('/signin/verify') && !url.includes('/mfa/');
        }, { timeout });
    }
    catch {
        throw new Error(`Okta Push MFA approval timeout after ${timeout}ms`);
    }
}
// =============================================================================
// Utility Functions
// =============================================================================
/**
 * Check if current page is an Okta login page
 */
function isOktaLoginPage(page) {
    const url = page.url();
    return (url.includes('.okta.com') ||
        url.includes('.oktapreview.com') ||
        url.includes('/oauth2/') ||
        url.includes('/login/login.htm'));
}
/**
 * Check if Okta shows an error message
 */
async function getOktaErrorMessage(page) {
    const errorSelectors = [
        '.okta-form-infobox-error',
        '.o-form-error-container',
        '.error-box',
        '[data-se="o-form-error-container"]',
    ];
    for (const selector of errorSelectors) {
        try {
            const element = page.locator(selector);
            if (await element.isVisible({ timeout: 500 })) {
                return await element.textContent() ?? undefined;
            }
        }
        catch {
            // Continue
        }
    }
    return undefined;
}
/**
 * Check if Okta requires MFA factor selection
 */
async function isOktaFactorSelectionRequired(page) {
    const factorSelectors = [
        '.factor-list',
        '[data-se="factor-list"]',
        '.authenticator-verify-list',
    ];
    for (const selector of factorSelectors) {
        try {
            const element = page.locator(selector);
            if (await element.isVisible({ timeout: 500 })) {
                return true;
            }
        }
        catch {
            // Continue
        }
    }
    return false;
}
//# sourceMappingURL=okta.js.map