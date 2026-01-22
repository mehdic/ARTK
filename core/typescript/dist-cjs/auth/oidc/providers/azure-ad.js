"use strict";
/**
 * Azure AD / Entra ID handler
 *
 * Handles Microsoft Azure Active Directory (now Entra ID) login page interactions.
 *
 * FR-006: Support OIDC with configurable Identity Provider handlers (Azure AD)
 *
 * @module auth/oidc/providers/azure-ad
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.azureAdHandler = void 0;
exports.isAzureAdLoginPage = isAzureAdLoginPage;
exports.getAzureAdErrorMessage = getAzureAdErrorMessage;
exports.isAzureAdMfaRequired = isAzureAdMfaRequired;
const flow_js_1 = require("../flow.js");
const logger_js_1 = require("../../../utils/logger.js");
const logger = (0, logger_js_1.createLogger)('auth', 'azure-ad');
// =============================================================================
// Default Selectors
// =============================================================================
/**
 * Default Azure AD form selectors
 *
 * Azure AD uses a multi-step login flow:
 * 1. Enter email/username
 * 2. Click Next
 * 3. Enter password
 * 4. Click Sign in
 * 5. (Optional) "Stay signed in?" prompt
 */
const DEFAULT_AZURE_AD_SELECTORS = {
    // Username input (email field)
    username: 'input[type="email"], input[name="loginfmt"], #i0116',
    // Password input
    password: 'input[type="password"], input[name="passwd"], #i0118, #passwordInput',
    // Primary submit button (Next / Sign in)
    submit: 'input[type="submit"], #idSIButton9',
    // "No" button on "Stay signed in?" prompt
    staySignedInNo: '#idBtn_Back, input[value="No"]',
    // TOTP/OTP selectors
    totpInput: 'input[name="otc"], #idTxtBx_SAOTCC_OTC',
    totpSubmit: 'input[type="submit"], #idSubmit_SAOTCC_Continue',
};
// =============================================================================
// Azure AD Handler
// =============================================================================
/**
 * Azure AD / Entra ID handler
 *
 * Handles:
 * - Multi-step username/password login
 * - "Stay signed in?" prompt
 * - TOTP-based MFA
 * - Conditional Access prompts
 */
exports.azureAdHandler = {
    idpType: 'azure-ad',
    /**
     * Fill credentials on Azure AD login page
     *
     * Azure AD uses a two-step process:
     * 1. Enter username, click Next
     * 2. Enter password
     */
    async fillCredentials(page, credentials, selectors) {
        const { username: usernameSelector, password: passwordSelector, submit: submitSelector, } = {
            ...DEFAULT_AZURE_AD_SELECTORS,
            ...selectors,
        };
        logger.debug('Filling Azure AD credentials (two-step flow)');
        // Step 1: Enter username
        await page.waitForSelector(usernameSelector, { state: 'visible', timeout: 10000 });
        await page.fill(usernameSelector, credentials.username);
        // Click Next to proceed to password page
        await page.click(submitSelector);
        // Step 2: Wait for password page and enter password
        await page.waitForSelector(passwordSelector, { state: 'visible', timeout: 10000 });
        await page.fill(passwordSelector, credentials.password);
    },
    /**
     * Submit the Azure AD login form (Sign in)
     */
    async submitForm(page, selectors) {
        const { submit: submitSelector } = {
            ...DEFAULT_AZURE_AD_SELECTORS,
            ...selectors,
        };
        // Click Sign in
        await page.click(submitSelector);
        // Wait for navigation or MFA page
        await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
        logger.debug('Azure AD form submitted');
    },
    /**
     * Handle "Stay signed in?" prompt
     */
    async handlePostLoginPrompts(page, selectors) {
        const { staySignedInNo } = {
            ...DEFAULT_AZURE_AD_SELECTORS,
            ...selectors,
        };
        // Check for "Stay signed in?" prompt
        try {
            const noButton = page.locator(staySignedInNo);
            const isVisible = await noButton.isVisible({ timeout: 3000 });
            if (isVisible) {
                logger.debug('Handling "Stay signed in?" prompt');
                await noButton.click();
                await page.waitForLoadState('domcontentloaded', { timeout: 5000 });
            }
        }
        catch {
            // Prompt not shown, continue
            logger.debug('"Stay signed in?" prompt not shown');
        }
    },
    /**
     * Handle Azure AD MFA challenge
     */
    async handleMFA(page, mfaConfig) {
        if (mfaConfig.type !== 'totp') {
            logger.warn('Non-TOTP MFA type for Azure AD', { type: mfaConfig.type });
            return;
        }
        const totpSelector = mfaConfig.totpInputSelector ?? DEFAULT_AZURE_AD_SELECTORS.totpInput;
        const submitSelector = mfaConfig.totpSubmitSelector ?? DEFAULT_AZURE_AD_SELECTORS.totpSubmit;
        logger.debug('Handling Azure AD TOTP MFA');
        // Wait for OTP input
        await page.waitForSelector(totpSelector, { state: 'visible', timeout: 10000 });
        // Generate and enter code
        if (!mfaConfig.totpSecretEnv) {
            throw new Error('TOTP secret environment variable not configured');
        }
        const code = (0, flow_js_1.generateTOTPCode)(mfaConfig.totpSecretEnv);
        await page.fill(totpSelector, code);
        await page.click(submitSelector);
        logger.debug('TOTP code submitted to Azure AD');
    },
    /**
     * Get default Azure AD selectors
     */
    getDefaultSelectors() {
        return { ...DEFAULT_AZURE_AD_SELECTORS };
    },
};
// =============================================================================
// Utility Functions
// =============================================================================
/**
 * Check if current page is an Azure AD login page
 */
function isAzureAdLoginPage(page) {
    const url = page.url();
    return (url.includes('login.microsoftonline.com') ||
        url.includes('login.live.com') ||
        url.includes('login.windows.net'));
}
/**
 * Check if Azure AD shows an error message
 */
async function getAzureAdErrorMessage(page) {
    const errorSelectors = [
        '#usernameError',
        '#passwordError',
        '.error-text',
        '#errorMessage',
        '.alert-error',
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
 * Check if Azure AD requires MFA
 */
async function isAzureAdMfaRequired(page) {
    const mfaIndicators = [
        '#idTxtBx_SAOTCC_OTC', // TOTP input
        '#idDiv_SAOTCC_Description', // MFA description
        '.verifyInput', // Verification input
    ];
    for (const selector of mfaIndicators) {
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
//# sourceMappingURL=azure-ad.js.map