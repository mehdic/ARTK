import { expect } from '@playwright/test';

// assertions/toast.ts
async function expectToast(page, message, options = {}, config) {
  const { type, timeout = 5e3, exact = false } = options;
  const toastConfig = config?.assertions?.toast ?? {
    containerSelector: '[role="alert"], .toast, .notification',
    typeAttribute: "data-type"
  };
  const { containerSelector, typeAttribute } = toastConfig;
  const toastContainer = page.locator(containerSelector);
  await expect(toastContainer).toBeVisible({ timeout });
  if (exact) {
    await expect(toastContainer).toHaveText(message, { timeout });
  } else {
    await expect(toastContainer).toContainText(message, { timeout });
  }
  if (type !== void 0) {
    const actualType = await toastContainer.getAttribute(typeAttribute);
    if (actualType !== type) {
      throw new Error(
        `Expected toast type "${type}" but got "${actualType ?? "none"}"`
      );
    }
  }
}
async function expectNoToast(page, config, timeout = 5e3) {
  const toastConfig = config?.assertions?.toast ?? {
    containerSelector: '[role="alert"], .toast, .notification'};
  const { containerSelector } = toastConfig;
  const toastContainer = page.locator(containerSelector);
  await expect(toastContainer).not.toBeVisible({ timeout });
}
async function waitForToastDismiss(page, message, options = {}, config) {
  await expectToast(page, message, options, config);
  const toastConfig = config?.assertions?.toast ?? {
    containerSelector: '[role="alert"], .toast, .notification'};
  const { containerSelector } = toastConfig;
  const { timeout = 5e3 } = options;
  const toastContainer = page.locator(containerSelector);
  await expect(toastContainer).not.toBeVisible({ timeout: timeout * 2 });
}
async function expectTableToContainRow(page, tableSelector, rowData, options = {}) {
  const { timeout = 5e3, exact = false } = options;
  const table = getTableLocator(page, tableSelector);
  const rows = table.locator("tbody tr, tr").filter({ has: page.locator("td") });
  await expect(table).toBeAttached({ timeout });
  const rowCount = await rows.count();
  if (rowCount === 0) {
    throw new Error(`Table "${tableSelector}" has no data rows`);
  }
  await expect(table).toBeVisible({ timeout });
  let foundMatch = false;
  for (let i = 0; i < rowCount; i++) {
    const row = rows.nth(i);
    const matches = await rowMatchesData(row, rowData, exact);
    if (matches) {
      foundMatch = true;
      break;
    }
  }
  if (!foundMatch) {
    const rowDataStr = JSON.stringify(rowData);
    throw new Error(
      `Table "${tableSelector}" does not contain a row matching: ${rowDataStr}`
    );
  }
}
async function expectTableRowCount(page, tableSelector, expectedCount, options = {}) {
  const { timeout = 5e3 } = options;
  const table = getTableLocator(page, tableSelector);
  if (expectedCount > 0) {
    await expect(table).toBeVisible({ timeout });
  } else {
    await expect(table).toBeAttached({ timeout });
  }
  const rows = table.locator("tbody tr, tr").filter({ has: page.locator("td") });
  await expect(rows).toHaveCount(expectedCount, { timeout });
}
function getTableLocator(page, tableSelector) {
  if (!tableSelector.includes("[") && !tableSelector.includes(".") && !tableSelector.includes("#")) {
    return page.getByTestId(tableSelector);
  }
  if (tableSelector === "table") {
    return page.getByRole("table");
  }
  return page.locator(tableSelector);
}
async function rowMatchesData(row, expectedData, exact) {
  for (const [column, expectedValue] of Object.entries(expectedData)) {
    const cell = row.locator(`[data-testid="${column}"], [data-column="${column}"]`);
    if (await cell.count() === 0) {
      const cells = row.locator("td");
      const cellCount = await cells.count();
      let foundCell = false;
      for (let i = 0; i < cellCount; i++) {
        const cellText = await cells.nth(i).textContent();
        const expectedStr = String(expectedValue);
        if (exact ? cellText?.trim() === expectedStr : cellText?.includes(expectedStr)) {
          foundCell = true;
          break;
        }
      }
      if (!foundCell) {
        return false;
      }
    } else {
      const cellText = await cell.textContent();
      const expectedStr = String(expectedValue);
      const matches = exact ? cellText?.trim() === expectedStr : cellText?.includes(expectedStr);
      if (!matches) {
        return false;
      }
    }
  }
  return true;
}
async function expectTableEmpty(page, tableSelector, options = {}) {
  await expectTableRowCount(page, tableSelector, 0, options);
}
async function expectFormFieldError(page, fieldName, expectedError, options = {}, config) {
  const { timeout = 5e3, exact = false } = options;
  const formConfig = config?.assertions?.form ?? {
    errorSelector: '[data-field-error="{field}"], [data-error-for="{field}"], #error-{field}'};
  const { errorSelector } = formConfig;
  const fieldErrorSelector = errorSelector.replace(/{field}/g, fieldName);
  const errorElement = page.locator(fieldErrorSelector);
  await expect(errorElement).toBeVisible({ timeout });
  if (exact) {
    await expect(errorElement).toHaveText(expectedError, { timeout });
  } else {
    await expect(errorElement).toContainText(expectedError, { timeout });
  }
}
async function expectFormValid(page, formSelector, options = {}, config) {
  const { timeout = 5e3 } = options;
  const formConfig = config?.assertions?.form ?? {
    formErrorSelector: '.form-error, [role="alert"]'
  };
  const { formErrorSelector } = formConfig;
  const form = getFormLocator(page, formSelector);
  await expect(form).toBeVisible({ timeout });
  const errorElements = form.locator(formErrorSelector);
  await expect(errorElements).toHaveCount(0, { timeout });
}
async function expectNoFormFieldError(page, fieldName, options = {}, config) {
  const { timeout = 5e3 } = options;
  const formConfig = config?.assertions?.form ?? {
    errorSelector: '[data-field-error="{field}"], [data-error-for="{field}"], #error-{field}'};
  const { errorSelector } = formConfig;
  const fieldErrorSelector = errorSelector.replace(/{field}/g, fieldName);
  const errorElement = page.locator(fieldErrorSelector);
  await expect(errorElement).not.toBeVisible({ timeout });
}
async function expectFormError(page, formSelector, expectedError, options = {}, config) {
  const { timeout = 5e3, exact = false } = options;
  const formConfig = config?.assertions?.form ?? {
    formErrorSelector: '.form-error, [role="alert"]'
  };
  const { formErrorSelector } = formConfig;
  const form = getFormLocator(page, formSelector);
  await expect(form).toBeVisible({ timeout });
  const formError = form.locator(formErrorSelector);
  await expect(formError).toBeVisible({ timeout });
  if (exact) {
    await expect(formError).toHaveText(expectedError, { timeout });
  } else {
    await expect(formError).toContainText(expectedError, { timeout });
  }
}
function getFormLocator(page, formSelector) {
  if (!formSelector.includes("[") && !formSelector.includes(".") && !formSelector.includes("#")) {
    return page.getByTestId(formSelector);
  }
  if (formSelector === "form") {
    return page.getByRole("form");
  }
  return page.locator(formSelector);
}
var DEFAULT_LOADING_SELECTORS = [
  '[data-loading="true"]',
  ".loading",
  ".spinner",
  '[aria-busy="true"]',
  ".loading-overlay",
  '[role="progressbar"]'
];
async function expectLoading(page, options = {}, config) {
  const { timeout = 5e3, selectors } = options;
  const loadingSelectors = selectors ?? config?.assertions?.loading?.selectors ?? DEFAULT_LOADING_SELECTORS;
  const combinedSelector = loadingSelectors.join(", ");
  const loadingIndicator = page.locator(combinedSelector);
  await expect(loadingIndicator.first()).toBeVisible({ timeout });
}
async function expectNotLoading(page, options = {}, config) {
  const { timeout = 5e3, selectors } = options;
  const loadingSelectors = selectors ?? config?.assertions?.loading?.selectors ?? DEFAULT_LOADING_SELECTORS;
  for (const selector of loadingSelectors) {
    const loadingIndicator = page.locator(selector);
    await expect(loadingIndicator).not.toBeVisible({ timeout });
  }
}
async function waitForLoadingComplete(page, options = {}, config) {
  const { timeout = 3e4, selectors } = options;
  const loadingSelectors = selectors ?? config?.assertions?.loading?.selectors ?? DEFAULT_LOADING_SELECTORS;
  const combinedSelector = loadingSelectors.join(", ");
  const loadingIndicator = page.locator(combinedSelector);
  try {
    await expect(loadingIndicator.first()).toBeVisible({ timeout: 1e3 });
  } catch {
  }
  for (const selector of loadingSelectors) {
    const indicator = page.locator(selector);
    await expect(indicator).not.toBeVisible({ timeout });
  }
}
async function waitForLoadingOperation(page, operation, options = {}, config) {
  const { timeout = 3e4, selectors } = options;
  const loadingSelectors = selectors ?? config?.assertions?.loading?.selectors ?? DEFAULT_LOADING_SELECTORS;
  const combinedSelector = loadingSelectors.join(", ");
  const loadingIndicator = page.locator(combinedSelector);
  await operation();
  const appearTimeout = Math.min(timeout / 2, 3e3);
  await expect(loadingIndicator.first()).toBeVisible({ timeout: appearTimeout });
  await waitForLoadingComplete(page, { timeout, selectors }, config);
}

// assertions/url.ts
async function expectUrlContains(page, expectedSubstring, options = {}) {
  const { timeout = 5e3, ignoreQueryParams = false, ignoreHash = false } = options;
  await page.waitForURL(
    (url) => {
      let urlStr = url.toString();
      if (ignoreQueryParams) {
        const urlObj = new URL(urlStr);
        urlStr = `${urlObj.origin}${urlObj.pathname}`;
      }
      if (ignoreHash) {
        urlStr = urlStr.split("#")[0] ?? urlStr;
      }
      return urlStr.includes(expectedSubstring);
    },
    { timeout }
  );
}
async function expectUrlMatches(page, pattern, options = {}) {
  const { timeout = 5e3, ignoreQueryParams = false, ignoreHash = false } = options;
  const regex = typeof pattern === "string" ? new RegExp(pattern) : pattern;
  await page.waitForURL(
    (url) => {
      let urlStr = url.toString();
      if (ignoreQueryParams) {
        const urlObj = new URL(urlStr);
        urlStr = `${urlObj.origin}${urlObj.pathname}`;
      }
      if (ignoreHash) {
        urlStr = urlStr.split("#")[0] ?? urlStr;
      }
      return regex.test(urlStr);
    },
    { timeout }
  );
}
async function expectUrlEquals(page, expectedUrl, options = {}) {
  const { timeout = 5e3, ignoreQueryParams = false, ignoreHash = false } = options;
  let normalizedExpected = expectedUrl;
  if (ignoreQueryParams || ignoreHash) {
    const expectedUrlObj = new URL(expectedUrl, "http://dummy.com");
    if (ignoreQueryParams) {
      normalizedExpected = `${expectedUrlObj.origin}${expectedUrlObj.pathname}`;
    }
    if (ignoreHash) {
      normalizedExpected = normalizedExpected.split("#")[0] ?? normalizedExpected;
    }
  }
  await page.waitForURL(
    (url) => {
      let urlStr = url.toString();
      if (ignoreQueryParams) {
        const urlObj = new URL(urlStr);
        urlStr = `${urlObj.origin}${urlObj.pathname}`;
      }
      if (ignoreHash) {
        urlStr = urlStr.split("#")[0] ?? urlStr;
      }
      return urlStr === normalizedExpected;
    },
    { timeout }
  );
}
async function expectUrlPath(page, expectedPath, options = {}) {
  const { timeout = 5e3, ignoreQueryParams = false, ignoreHash = false } = options;
  let normalizedExpectedPath = expectedPath;
  if (ignoreQueryParams || ignoreHash) {
    if (ignoreQueryParams) {
      normalizedExpectedPath = normalizedExpectedPath.split("?")[0] ?? normalizedExpectedPath;
    }
    if (ignoreHash) {
      normalizedExpectedPath = normalizedExpectedPath.split("#")[0] ?? normalizedExpectedPath;
    }
  }
  await page.waitForURL(
    (url) => {
      let pathname = url.pathname;
      if (ignoreQueryParams) {
        pathname = pathname.split("?")[0] ?? pathname;
      }
      if (ignoreHash) {
        pathname = pathname.split("#")[0] ?? pathname;
      }
      return pathname === normalizedExpectedPath;
    },
    { timeout }
  );
}
async function expectApiResponse(response, expected, options = {}) {
  const { exactBodyMatch = false } = options;
  if (expected.status !== void 0) {
    expect(response.status(), `Expected status ${expected.status}`).toBe(expected.status);
  }
  if (expected.contentType !== void 0) {
    const actualContentType = response.headers()["content-type"] ?? "";
    expect(actualContentType, `Expected content type ${expected.contentType}`).toContain(
      expected.contentType
    );
  }
  if (expected.headers !== void 0) {
    const actualHeaders = response.headers();
    for (const [headerName, expectedValue] of Object.entries(expected.headers)) {
      const actualValue = actualHeaders[headerName.toLowerCase()];
      expect(actualValue, `Expected header ${headerName}: ${expectedValue}`).toBe(expectedValue);
    }
  }
  if (expected.body !== void 0) {
    const actualBody = await response.json();
    if (exactBodyMatch) {
      expect(actualBody, "Expected exact body match").toEqual(expected.body);
    } else {
      for (const [key, expectedValue] of Object.entries(expected.body)) {
        expect(actualBody, `Expected body to have key "${key}"`).toHaveProperty(key);
        expect(actualBody[key], `Expected ${key} to equal ${expectedValue}`).toEqual(
          expectedValue
        );
      }
    }
  }
}
async function expectApiSuccess(response) {
  const status = response.status();
  expect(status, `Expected 2xx status but got ${status}`).toBeGreaterThanOrEqual(200);
  expect(status, `Expected 2xx status but got ${status}`).toBeLessThan(300);
}
async function expectApiError(response, expectedStatus) {
  const status = response.status();
  if (expectedStatus !== void 0) {
    expect(status, `Expected status ${expectedStatus} but got ${status}`).toBe(expectedStatus);
  } else {
    const isError = status >= 400 && status < 600;
    expect(isError, `Expected error status (4xx or 5xx) but got ${status}`).toBe(true);
  }
}
async function expectApiBodyHasFields(response, expectedFields) {
  const actualBody = await response.json();
  for (const field of expectedFields) {
    expect(actualBody, `Expected response body to have field "${field}"`).toHaveProperty(field);
  }
}
async function expectApiBodyIsArray(response, expectedLength) {
  const actualBody = await response.json();
  expect(Array.isArray(actualBody), "Expected response body to be an array").toBe(true);
  if (expectedLength !== void 0) {
    expect(
      actualBody.length,
      `Expected array length ${expectedLength} but got ${actualBody.length}`
    ).toBe(expectedLength);
  }
}
async function expectApiValidationError(response, expectedMessage) {
  expect(response.status(), "Expected validation error status 400").toBe(400);
  const body = await response.json();
  const errorMessage = body.error ?? body.message ?? body.errorMessage ?? JSON.stringify(body);
  expect(
    typeof errorMessage === "string" && errorMessage.includes(expectedMessage),
    `Expected error message to contain "${expectedMessage}" but got "${errorMessage}"`
  ).toBe(true);
}

export { expectApiBodyHasFields, expectApiBodyIsArray, expectApiError, expectApiResponse, expectApiSuccess, expectApiValidationError, expectFormError, expectFormFieldError, expectFormValid, expectLoading, expectNoFormFieldError, expectNoToast, expectNotLoading, expectTableEmpty, expectTableRowCount, expectTableToContainRow, expectToast, expectUrlContains, expectUrlEquals, expectUrlMatches, expectUrlPath, waitForLoadingComplete, waitForLoadingOperation, waitForToastDismiss };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map