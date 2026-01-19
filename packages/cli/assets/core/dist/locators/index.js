// locators/strategies.ts
function byRole(page, role, options) {
  const playwrightOptions = {};
  if (options) {
    if (options.name !== void 0) {
      playwrightOptions.name = options.name;
    }
    if (options.checked !== void 0) {
      playwrightOptions.checked = options.checked;
    }
    if (options.disabled !== void 0) {
      playwrightOptions.disabled = options.disabled;
    }
    if (options.expanded !== void 0) {
      playwrightOptions.expanded = options.expanded;
    }
    if (options.level !== void 0) {
      playwrightOptions.level = options.level;
    }
    if (options.pressed !== void 0) {
      playwrightOptions.pressed = options.pressed;
    }
    if (options.selected !== void 0) {
      playwrightOptions.selected = options.selected;
    }
    if (options.exact !== void 0) {
      playwrightOptions.exact = options.exact;
    }
    if (options.includeHidden !== void 0) {
      playwrightOptions.includeHidden = options.includeHidden;
    }
  }
  return page.getByRole(
    role,
    playwrightOptions
  );
}
function byLabel(page, label, options) {
  return page.getByLabel(label, options);
}
function byPlaceholder(page, placeholder, options) {
  return page.getByPlaceholder(placeholder, options);
}
function byText(page, text, options) {
  return page.getByText(text, options);
}
function byCss(page, selector) {
  return page.locator(selector);
}
function tryStrategy(page, strategy, selector, options) {
  try {
    switch (strategy) {
      case "role":
        return byRole(page, selector, options);
      case "label":
        return byLabel(
          page,
          selector,
          options
        );
      case "placeholder":
        return byPlaceholder(
          page,
          selector,
          options
        );
      case "text":
        return byText(
          page,
          selector,
          options
        );
      case "css":
        return byCss(page, selector);
      default:
        return null;
    }
  } catch {
    return null;
  }
}

// locators/testid.ts
function byTestId(page, testId, config) {
  const primarySelector = `[${config.testIdAttribute}="${testId}"]`;
  const primaryLocator = page.locator(primarySelector);
  if (!config.customTestIds || config.customTestIds.length === 0) {
    return primaryLocator;
  }
  const allSelectors = [
    config.testIdAttribute,
    ...config.customTestIds || []
  ].map((attr) => `[${attr}="${testId}"]`);
  const combinedSelector = allSelectors.join(", ");
  return page.locator(combinedSelector).first();
}
async function hasTestIdAttribute(locator, testId, config) {
  const attributes = [
    config.testIdAttribute,
    ...config.customTestIds || []
  ];
  for (const attr of attributes) {
    try {
      const value = await locator.getAttribute(attr);
      if (value === testId) {
        return true;
      }
    } catch {
      continue;
    }
  }
  return false;
}
async function getTestIdValue(locator, config) {
  const attributes = [
    config.testIdAttribute,
    ...config.customTestIds || []
  ];
  for (const attr of attributes) {
    try {
      const value = await locator.getAttribute(attr);
      if (value) {
        return value;
      }
    } catch {
      continue;
    }
  }
  return null;
}
function createTestIdSelector(testId, config) {
  return `[${config.testIdAttribute}="${testId}"]`;
}
function createCombinedTestIdSelector(testId, config) {
  const allAttributes = [
    config.testIdAttribute,
    ...config.customTestIds || []
  ];
  const selectors = allAttributes.map((attr) => `[${attr}="${testId}"]`);
  return selectors.join(", ");
}

// locators/aria.ts
async function getAriaRole(locator) {
  try {
    return await locator.getAttribute("role");
  } catch {
    return null;
  }
}
async function getAriaLabel(locator) {
  try {
    const ariaLabel = await locator.getAttribute("aria-label");
    if (ariaLabel) {
      return ariaLabel;
    }
    const labelledBy = await locator.getAttribute("aria-labelledby");
    if (labelledBy) {
      return labelledBy;
    }
    return null;
  } catch {
    return null;
  }
}
async function getAriaDescription(locator) {
  try {
    const ariaDescription = await locator.getAttribute("aria-description");
    if (ariaDescription) {
      return ariaDescription;
    }
    const describedBy = await locator.getAttribute("aria-describedby");
    if (describedBy) {
      return describedBy;
    }
    return null;
  } catch {
    return null;
  }
}
async function isAriaDisabled(locator) {
  try {
    const ariaDisabled = await locator.getAttribute("aria-disabled");
    if (ariaDisabled === "true") {
      return true;
    }
    const disabled = await locator.getAttribute("disabled");
    return disabled !== null;
  } catch {
    return false;
  }
}
async function isAriaExpanded(locator) {
  try {
    const ariaExpanded = await locator.getAttribute("aria-expanded");
    if (ariaExpanded === "true") {
      return true;
    }
    if (ariaExpanded === "false") {
      return false;
    }
    return null;
  } catch {
    return null;
  }
}
async function isAriaChecked(locator) {
  try {
    const ariaChecked = await locator.getAttribute("aria-checked");
    if (ariaChecked === "true") {
      return true;
    }
    if (ariaChecked === "false") {
      return false;
    }
    return null;
  } catch {
    return null;
  }
}
async function isAriaHidden(locator) {
  try {
    const ariaHidden = await locator.getAttribute("aria-hidden");
    return ariaHidden === "true";
  } catch {
    return false;
  }
}
async function getAriaLive(locator) {
  try {
    const ariaLive = await locator.getAttribute("aria-live");
    if (ariaLive === "polite" || ariaLive === "assertive" || ariaLive === "off") {
      return ariaLive;
    }
    return null;
  } catch {
    return null;
  }
}
async function isAriaRequired(locator) {
  try {
    const ariaRequired = await locator.getAttribute("aria-required");
    return ariaRequired === "true";
  } catch {
    return false;
  }
}
async function isAriaInvalid(locator) {
  try {
    const ariaInvalid = await locator.getAttribute("aria-invalid");
    return ariaInvalid === "true";
  } catch {
    return false;
  }
}
async function getAccessibleName(locator) {
  try {
    const ariaLabel = await getAriaLabel(locator);
    if (ariaLabel) {
      return ariaLabel;
    }
    const textContent = await locator.textContent();
    return textContent?.trim() || null;
  } catch {
    return null;
  }
}
function isValidAriaRole(role) {
  const validRoles = [
    // Document structure roles
    "article",
    "banner",
    "complementary",
    "contentinfo",
    "form",
    "main",
    "navigation",
    "region",
    "search",
    // Landmark roles
    "application",
    "directory",
    "document",
    "feed",
    "figure",
    "img",
    "list",
    "listitem",
    "math",
    "note",
    "presentation",
    "table",
    "term",
    // Widget roles
    "alert",
    "alertdialog",
    "button",
    "checkbox",
    "dialog",
    "gridcell",
    "link",
    "log",
    "marquee",
    "menuitem",
    "menuitemcheckbox",
    "menuitemradio",
    "option",
    "progressbar",
    "radio",
    "scrollbar",
    "searchbox",
    "slider",
    "spinbutton",
    "status",
    "switch",
    "tab",
    "tabpanel",
    "textbox",
    "timer",
    "tooltip",
    "tree",
    "treeitem",
    // Composite widget roles
    "combobox",
    "grid",
    "listbox",
    "menu",
    "menubar",
    "radiogroup",
    "tablist",
    "toolbar",
    "treegrid",
    // Heading roles
    "heading",
    // Row and cell roles
    "row",
    "rowheader",
    "columnheader",
    "cell"
  ];
  return validRoles.includes(role);
}

// locators/factory.ts
function locate(page, selector, config, options) {
  for (const strategy of config.strategies) {
    try {
      switch (strategy) {
        case "role":
          return byRole(page, selector, options);
        case "label":
          return byLabel(page, selector, options);
        case "placeholder":
          return byPlaceholder(page, selector, options);
        case "testid":
          return byTestId(page, selector, config);
        case "text":
          return byText(page, selector, options);
        case "css":
          return byCss(page, selector);
      }
    } catch {
      continue;
    }
  }
  return byCss(page, selector);
}
function withinForm(formLocator, config) {
  return {
    field(name) {
      const byName = formLocator.locator(`[name="${name}"]`);
      if (byName) {
        return byName;
      }
      return byTestId(
        formLocator.page(),
        name,
        config
      ).and(formLocator.locator("input, select, textarea"));
    },
    fieldByLabel(label) {
      return formLocator.getByLabel(label);
    },
    submit() {
      return formLocator.locator(
        'button[type="submit"], input[type="submit"]'
      );
    },
    cancel() {
      return formLocator.getByRole("button", { name: /cancel|close/i });
    },
    error(field) {
      return formLocator.locator(
        `[data-field="${field}"][role="alert"], [data-field="${field}"].error, #${field}-error, .${field}-error`
      );
    }
  };
}
function withinTable(tableLocator) {
  return {
    row(index) {
      return tableLocator.locator("tbody tr").nth(index);
    },
    rowContaining(text) {
      return tableLocator.locator("tbody tr").filter({ hasText: text });
    },
    cell(row, column) {
      const rowLocator = tableLocator.locator("tbody tr").nth(row);
      if (typeof column === "number") {
        return rowLocator.locator("td").nth(column);
      } else {
        return rowLocator.locator("td").filter({
          has: tableLocator.locator(`thead th:has-text("${column}")`)
        }).first();
      }
    },
    header(column) {
      if (typeof column === "number") {
        return tableLocator.locator("thead th").nth(column);
      } else {
        return tableLocator.locator("thead th").filter({ hasText: column });
      }
    }
  };
}
function withinSection(sectionLocator, config) {
  return {
    locator(selector) {
      return sectionLocator.locator(selector);
    },
    byTestId(testId) {
      const selector = `[${config.testIdAttribute}="${testId}"]`;
      return sectionLocator.locator(selector);
    },
    byRole(role, options) {
      return sectionLocator.getByRole(
        role,
        options
      );
    }
  };
}
function createDefaultConfig() {
  return {
    strategies: ["role", "label", "placeholder", "testid", "text", "css"],
    testIdAttribute: "data-testid",
    customTestIds: []
  };
}
function createConfigFromSelectors(selectorsConfig) {
  return {
    strategies: selectorsConfig.strategy,
    testIdAttribute: selectorsConfig.testIdAttribute,
    customTestIds: selectorsConfig.customTestIds
  };
}

export { byCss, byLabel, byPlaceholder, byRole, byTestId, byText, createCombinedTestIdSelector, createConfigFromSelectors, createDefaultConfig, createTestIdSelector, getAccessibleName, getAriaDescription, getAriaLabel, getAriaLive, getAriaRole, getTestIdValue, hasTestIdAttribute, isAriaChecked, isAriaDisabled, isAriaExpanded, isAriaHidden, isAriaInvalid, isAriaRequired, isValidAriaRole, locate, tryStrategy, withinForm, withinSection, withinTable };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map