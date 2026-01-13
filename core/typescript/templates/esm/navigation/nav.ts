/**
 * ESM Template: Navigation Module
 * Generated for: {{projectName}}
 * Generated at: {{generatedAt}}
 * Module System: ESM
 */
import type { Page } from '@playwright/test';

export async function navigateTo(page: Page, route: string): Promise<void> {
  await page.goto(route);
  await page.waitForLoadState('domcontentloaded');
}

export async function goToDashboard(page: Page): Promise<void> {
  await navigateTo(page, '/dashboard');
}

export async function goToSettings(page: Page): Promise<void> {
  await navigateTo(page, '/settings');
}

export async function goBack(page: Page): Promise<void> {
  await page.goBack();
  await page.waitForLoadState('domcontentloaded');
}
