/**
 * CommonJS Template: Navigation Module
 * Generated for: {{projectName}}
 * Generated at: {{generatedAt}}
 * Module System: CommonJS
 */
import type { Page } from '@playwright/test';

/**
 * Navigate to a page
 */
export async function navigateTo(page: Page, route: string): Promise<void> {
  await page.goto(route);
  await page.waitForLoadState('domcontentloaded');
}

/**
 * Navigate to dashboard
 */
export async function goToDashboard(page: Page): Promise<void> {
  await navigateTo(page, '/dashboard');
}

/**
 * Navigate to settings
 */
export async function goToSettings(page: Page): Promise<void> {
  await navigateTo(page, '/settings');
}

/**
 * Go back in browser history
 */
export async function goBack(page: Page): Promise<void> {
  await page.goBack();
  await page.waitForLoadState('domcontentloaded');
}
