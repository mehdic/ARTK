'use strict';

var fs = require('fs');
var path = require('path');
var zod = require('zod');

// src/selectors/priority.ts
var DEFAULT_SELECTOR_PRIORITY = [
  "role",
  "label",
  "placeholder",
  "text",
  "testid",
  "css"
];
var ELEMENT_TYPE_STRATEGIES = {
  button: ["role", "text", "testid"],
  link: ["role", "text", "testid"],
  textbox: ["role", "label", "placeholder", "testid"],
  checkbox: ["role", "label", "testid"],
  radio: ["role", "label", "testid"],
  combobox: ["role", "label", "testid"],
  heading: ["role", "text", "testid"],
  listitem: ["role", "text", "testid"],
  menuitem: ["role", "text", "testid"],
  tab: ["role", "text", "testid"],
  dialog: ["role", "testid"],
  alert: ["role", "testid"],
  generic: ["text", "testid", "css"]
};
var NAMEABLE_ROLES = [
  "button",
  "link",
  "textbox",
  "checkbox",
  "radio",
  "combobox",
  "heading",
  "tab",
  "menuitem",
  "listitem",
  "option",
  "cell",
  "row",
  "columnheader",
  "rowheader"
];
function getSelectorPriority(config) {
  if (config?.selectorPolicy?.priority) {
    return config.selectorPolicy.priority.map((s) => {
      return s;
    });
  }
  return DEFAULT_SELECTOR_PRIORITY;
}
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
function scoreLocator(locator, priority = DEFAULT_SELECTOR_PRIORITY) {
  const index = priority.indexOf(locator.strategy);
  return index >= 0 ? index : priority.length;
}
function compareLocators(a, b, priority = DEFAULT_SELECTOR_PRIORITY) {
  const scoreA = scoreLocator(a, priority);
  const scoreB = scoreLocator(b, priority);
  return scoreA <= scoreB ? a : b;
}
function selectBestLocator(alternatives, config) {
  if (alternatives.length === 0) {
    return null;
  }
  const priority = getSelectorPriority(config);
  const allowed = alternatives.filter((loc) => !isForbiddenSelector(loc, config));
  if (allowed.length === 0) {
    return alternatives[0] ?? null;
  }
  allowed.sort((a, b) => scoreLocator(a, priority) - scoreLocator(b, priority));
  return allowed[0] ?? null;
}
function isRoleLocator(locator) {
  return locator.strategy === "role";
}
function isSemanticLocator(locator) {
  return ["role", "label", "text", "placeholder"].includes(locator.strategy);
}
function isTestIdLocator(locator) {
  return locator.strategy === "testid";
}
function isCssLocator(locator) {
  return locator.strategy === "css";
}
function getRecommendedStrategies(elementType) {
  return ELEMENT_TYPE_STRATEGIES[elementType] ?? ELEMENT_TYPE_STRATEGIES.generic;
}
function validateLocator(locator, config) {
  const warnings = [];
  if (isForbiddenSelector(locator, config)) {
    warnings.push(`Selector matches forbidden pattern: ${locator.value}`);
  }
  if (isCssLocator(locator)) {
    warnings.push(
      `CSS selector "${locator.value}" is fragile. Consider using role, label, or testid.`
    );
  }
  if (locator.value.includes("//") || locator.value.includes("..")) {
    warnings.push(`Selector "${locator.value}" appears to use XPath syntax in CSS.`);
  }
  if (locator.value.includes("nth-child") || locator.value.includes("nth-of-type")) {
    warnings.push(`Selector "${locator.value}" uses nth-child which is position-dependent.`);
  }
  if (locator.strategy === "css" && /^#[a-z]+-\d+$/i.test(locator.value)) {
    warnings.push(`Selector "${locator.value}" appears to have a dynamic ID.`);
  }
  return {
    valid: warnings.length === 0,
    warnings
  };
}
function toPlaywrightLocator(locator) {
  switch (locator.strategy) {
    case "role": {
      const opts = [];
      if (locator.options?.name) {
        opts.push(`name: '${escapeString(locator.options.name)}'`);
      }
      if (locator.options?.exact) {
        opts.push("exact: true");
      }
      if (locator.options?.level) {
        opts.push(`level: ${locator.options.level}`);
      }
      const optsStr = opts.length > 0 ? `, { ${opts.join(", ")} }` : "";
      return `getByRole('${locator.value}'${optsStr})`;
    }
    case "label": {
      const exact = locator.options?.exact ? ", { exact: true }" : "";
      return `getByLabel('${escapeString(locator.value)}'${exact})`;
    }
    case "placeholder": {
      const exact = locator.options?.exact ? ", { exact: true }" : "";
      return `getByPlaceholder('${escapeString(locator.value)}'${exact})`;
    }
    case "text": {
      const exact = locator.options?.exact ? ", { exact: true }" : "";
      return `getByText('${escapeString(locator.value)}'${exact})`;
    }
    case "testid":
      return `getByTestId('${escapeString(locator.value)}')`;
    case "css":
      return `locator('${escapeString(locator.value)}')`;
    default:
      return `locator('${escapeString(locator.value)}')`;
  }
}
function escapeString(str) {
  return str.replace(/'/g, "\\'").replace(/\n/g, "\\n");
}
var SelectorEntrySchema = zod.z.object({
  /** Unique identifier for this selector */
  id: zod.z.string(),
  /** Human-readable description */
  description: zod.z.string().optional(),
  /** The selector strategy */
  strategy: zod.z.enum(["testid", "role", "label", "text", "css", "xpath"]),
  /** The selector value */
  value: zod.z.string(),
  /** Additional options for the locator */
  options: zod.z.object({
    name: zod.z.string().optional(),
    exact: zod.z.boolean().optional(),
    level: zod.z.number().optional()
  }).optional(),
  /** Component or page this selector belongs to */
  component: zod.z.string().optional(),
  /** File where this selector was discovered */
  sourceFile: zod.z.string().optional(),
  /** Line number in source file */
  sourceLine: zod.z.number().optional(),
  /** Tags for categorization */
  tags: zod.z.array(zod.z.string()).optional(),
  /** Whether this is a stable selector (not likely to change) */
  stable: zod.z.boolean().default(true),
  /** Last verified timestamp */
  lastVerified: zod.z.string().optional()
});
var ComponentEntrySchema = zod.z.object({
  /** Component name */
  name: zod.z.string(),
  /** Component file path */
  path: zod.z.string().optional(),
  /** Selectors within this component */
  selectors: zod.z.array(zod.z.string()),
  // References to selector IDs
  /** Child components */
  children: zod.z.array(zod.z.string()).optional()
});
var PageEntrySchema = zod.z.object({
  /** Page name */
  name: zod.z.string(),
  /** Route pattern */
  route: zod.z.string().optional(),
  /** Page file path */
  path: zod.z.string().optional(),
  /** Components on this page */
  components: zod.z.array(zod.z.string()).optional(),
  /** Direct selectors on this page */
  selectors: zod.z.array(zod.z.string()).optional()
});
var CSSDebtEntrySchema = zod.z.object({
  /** The CSS selector being used */
  selector: zod.z.string(),
  /** Files using this selector */
  usages: zod.z.array(
    zod.z.object({
      file: zod.z.string(),
      line: zod.z.number()
    })
  ),
  /** Suggested replacement */
  suggestedReplacement: zod.z.object({
    strategy: zod.z.string(),
    value: zod.z.string()
  }).optional(),
  /** Priority for migration (higher = more urgent) */
  priority: zod.z.enum(["low", "medium", "high"]).default("medium"),
  /** Reason this is considered debt */
  reason: zod.z.string().optional()
});
var SelectorCatalogSchema = zod.z.object({
  /** Schema version */
  version: zod.z.string().default("1.0.0"),
  /** Generation timestamp */
  generatedAt: zod.z.string(),
  /** Source directory that was scanned */
  sourceDir: zod.z.string().optional(),
  /** All selectors indexed by ID */
  selectors: zod.z.record(SelectorEntrySchema),
  /** Components indexed by name */
  components: zod.z.record(ComponentEntrySchema).default({}),
  /** Pages indexed by name */
  pages: zod.z.record(PageEntrySchema).default({}),
  /** TestIDs found in the codebase */
  testIds: zod.z.array(zod.z.string()).default([]),
  /** CSS debt entries */
  cssDebt: zod.z.array(CSSDebtEntrySchema).default([]),
  /** Statistics */
  stats: zod.z.object({
    totalSelectors: zod.z.number(),
    byStrategy: zod.z.record(zod.z.number()),
    stableCount: zod.z.number(),
    unstableCount: zod.z.number(),
    cssDebtCount: zod.z.number()
  }).optional()
});
function createEmptyCatalog() {
  return {
    version: "1.0.0",
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    selectors: {},
    components: {},
    pages: {},
    testIds: [],
    cssDebt: []
  };
}
function validateCatalog(catalog) {
  const result = SelectorCatalogSchema.safeParse(catalog);
  if (result.success) {
    return { valid: true, errors: [], catalog: result.data };
  }
  return {
    valid: false,
    errors: result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`)
  };
}

// src/selectors/catalog.ts
var DEFAULT_CATALOG_PATH = "config/selector-catalog.json";
var catalogCache = null;
var catalogPath = null;
function loadCatalog(path$1) {
  const resolvedPath = path.resolve(DEFAULT_CATALOG_PATH);
  if (!fs.existsSync(resolvedPath)) {
    console.warn(`Selector catalog not found at ${resolvedPath}, using empty catalog`);
    return createEmptyCatalog();
  }
  try {
    const content = fs.readFileSync(resolvedPath, "utf-8");
    const parsed = JSON.parse(content);
    const result = validateCatalog(parsed);
    if (!result.valid) {
      console.warn(`Invalid selector catalog at ${resolvedPath}: ${result.errors.join(", ")}`);
      return createEmptyCatalog();
    }
    catalogCache = result.catalog;
    catalogPath = resolvedPath;
    return catalogCache;
  } catch (_err) {
    console.warn(`Failed to load selector catalog from ${resolvedPath}`);
    return createEmptyCatalog();
  }
}
function getCatalog() {
  if (!catalogCache) {
    catalogCache = loadCatalog();
  }
  return catalogCache;
}
function searchSelectors(query) {
  const catalog = getCatalog();
  const lowerQuery = query.toLowerCase();
  return Object.values(catalog.selectors).filter((selector) => {
    if (selector.value.toLowerCase().includes(lowerQuery)) return true;
    if (selector.description?.toLowerCase().includes(lowerQuery)) return true;
    if (selector.component?.toLowerCase().includes(lowerQuery)) return true;
    if (selector.tags?.some((t) => t.toLowerCase().includes(lowerQuery))) return true;
    return false;
  });
}
function hasTestId(testId) {
  const catalog = getCatalog();
  return catalog.testIds.includes(testId);
}
function suggestSelector(description) {
  const results = searchSelectors(description);
  if (results.length === 0) {
    return null;
  }
  const strategyPriority = {
    testid: 1,
    role: 2,
    label: 3,
    text: 4,
    css: 5,
    xpath: 6
  };
  return results.sort((a, b) => {
    if (a.stable && !b.stable) return -1;
    if (!a.stable && b.stable) return 1;
    return (strategyPriority[a.strategy] ?? 99) - (strategyPriority[b.strategy] ?? 99);
  })[0] ?? null;
}

// src/selectors/infer.ts
var ELEMENT_KEYWORDS = {
  button: "button",
  btn: "button",
  submit: "button",
  link: "link",
  anchor: "link",
  input: "textbox",
  textbox: "textbox",
  field: "textbox",
  textarea: "textbox",
  checkbox: "checkbox",
  check: "checkbox",
  radio: "radio",
  dropdown: "combobox",
  select: "combobox",
  combo: "combobox",
  heading: "heading",
  title: "heading",
  header: "heading",
  menu: "menu",
  menuitem: "menuitem",
  tab: "tab",
  dialog: "dialog",
  modal: "dialog",
  alert: "alert",
  list: "list",
  listitem: "listitem",
  table: "table",
  row: "row",
  cell: "cell"
};
function inferElementType(text) {
  const lowerText = text.toLowerCase();
  for (const [keyword, elementType] of Object.entries(ELEMENT_KEYWORDS)) {
    if (lowerText.includes(keyword)) {
      return elementType;
    }
  }
  return null;
}
function inferRole(elementType) {
  const roleMap = {
    button: "button",
    link: "link",
    textbox: "textbox",
    checkbox: "checkbox",
    radio: "radio",
    combobox: "combobox",
    heading: "heading",
    menu: "menu",
    menuitem: "menuitem",
    tab: "tab",
    dialog: "dialog",
    alert: "alert",
    list: "list",
    listitem: "listitem",
    table: "table",
    row: "row",
    cell: "cell"
  };
  return roleMap[elementType] ?? null;
}
function extractName(text) {
  const quotedMatch = text.match(/['"]([^'"]+)['"]/);
  if (quotedMatch) {
    return quotedMatch[1] ?? null;
  }
  const theMatch = text.match(/(?:the\s+)?['"]?([^'"]+?)['"]?\s+(?:button|link|field|input|checkbox|dropdown)/i);
  if (theMatch) {
    return theMatch[1].trim();
  }
  return null;
}
function inferSelectors(text) {
  const alternatives = [];
  const elementType = inferElementType(text);
  const name = extractName(text);
  const role = elementType ? inferRole(elementType) : null;
  if (role && NAMEABLE_ROLES.includes(role)) {
    if (name) {
      alternatives.push({
        strategy: "role",
        value: role,
        options: { name }
      });
    } else {
      alternatives.push({
        strategy: "role",
        value: role
      });
    }
  }
  if (name && ["textbox", "checkbox", "radio", "combobox"].includes(elementType || "")) {
    alternatives.push({
      strategy: "label",
      value: name
    });
  }
  if (name) {
    alternatives.push({
      strategy: "text",
      value: name
    });
  }
  return alternatives;
}
function inferBestSelector(text) {
  const alternatives = inferSelectors(text);
  return selectBestLocator(alternatives);
}
function inferButtonSelector(name) {
  return {
    strategy: "role",
    value: "button",
    options: { name }
  };
}
function inferLinkSelector(name) {
  return {
    strategy: "role",
    value: "link",
    options: { name }
  };
}
function inferInputSelector(labelOrPlaceholder) {
  return {
    strategy: "label",
    value: labelOrPlaceholder
  };
}
function inferCheckboxSelector(label) {
  return {
    strategy: "role",
    value: "checkbox",
    options: { name: label }
  };
}
function inferHeadingSelector(text, level) {
  const locator = {
    strategy: "role",
    value: "heading",
    options: { name: text }
  };
  if (level) {
    locator.options.level = level;
  }
  return locator;
}
function inferTabSelector(name) {
  return {
    strategy: "role",
    value: "tab",
    options: { name }
  };
}
function inferTextSelector(text) {
  return {
    strategy: "text",
    value: text
  };
}
function inferTestIdSelector(testId) {
  return {
    strategy: "testid",
    value: testId
  };
}
function createCssSelector(selector) {
  return {
    strategy: "css",
    value: selector
  };
}
function suggestSelectorApproach(text) {
  const elementType = inferElementType(text);
  const role = elementType ? inferRole(elementType) : null;
  const name = extractName(text);
  const alternatives = inferSelectors(text);
  let recommendedStrategy = "text";
  if (role && NAMEABLE_ROLES.includes(role)) {
    recommendedStrategy = "role";
  } else if (name && ["textbox", "checkbox", "radio", "combobox"].includes(elementType || "")) {
    recommendedStrategy = "label";
  } else if (name) {
    recommendedStrategy = "text";
  }
  return {
    elementType,
    role,
    name,
    recommendedStrategy,
    alternatives
  };
}
function inferSelectorWithCatalog(text, options) {
  const useCatalog = options?.useCatalog ?? true;
  if (useCatalog) {
    const catalogEntry = suggestSelector(text);
    if (catalogEntry) {
      return {
        strategy: catalogEntry.strategy,
        value: catalogEntry.value,
        options: catalogEntry.options
      };
    }
    const name = extractName(text);
    if (name) {
      const possibleTestIds = [
        name.toLowerCase().replace(/\s+/g, "-"),
        name.toLowerCase().replace(/\s+/g, "_"),
        name
      ];
      for (const testId of possibleTestIds) {
        if (hasTestId(testId)) {
          return {
            strategy: "testid",
            value: testId
          };
        }
      }
    }
  }
  return inferBestSelector(text);
}
function inferSelectorsWithCatalog(text, options) {
  const useCatalog = options?.useCatalog ?? true;
  const alternatives = [];
  if (useCatalog) {
    const catalogEntry = suggestSelector(text);
    if (catalogEntry) {
      alternatives.push({
        strategy: catalogEntry.strategy,
        value: catalogEntry.value,
        options: catalogEntry.options
      });
    }
  }
  alternatives.push(...inferSelectors(text));
  const seen = /* @__PURE__ */ new Set();
  return alternatives.filter((loc) => {
    const key = `${loc.strategy}:${loc.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

exports.DEFAULT_SELECTOR_PRIORITY = DEFAULT_SELECTOR_PRIORITY;
exports.ELEMENT_TYPE_STRATEGIES = ELEMENT_TYPE_STRATEGIES;
exports.NAMEABLE_ROLES = NAMEABLE_ROLES;
exports.compareLocators = compareLocators;
exports.createCssSelector = createCssSelector;
exports.extractName = extractName;
exports.getRecommendedStrategies = getRecommendedStrategies;
exports.getSelectorPriority = getSelectorPriority;
exports.inferBestSelector = inferBestSelector;
exports.inferButtonSelector = inferButtonSelector;
exports.inferCheckboxSelector = inferCheckboxSelector;
exports.inferElementType = inferElementType;
exports.inferHeadingSelector = inferHeadingSelector;
exports.inferInputSelector = inferInputSelector;
exports.inferLinkSelector = inferLinkSelector;
exports.inferRole = inferRole;
exports.inferSelectorWithCatalog = inferSelectorWithCatalog;
exports.inferSelectors = inferSelectors;
exports.inferSelectorsWithCatalog = inferSelectorsWithCatalog;
exports.inferTabSelector = inferTabSelector;
exports.inferTestIdSelector = inferTestIdSelector;
exports.inferTextSelector = inferTextSelector;
exports.isCssLocator = isCssLocator;
exports.isForbiddenSelector = isForbiddenSelector;
exports.isRoleLocator = isRoleLocator;
exports.isSemanticLocator = isSemanticLocator;
exports.isTestIdLocator = isTestIdLocator;
exports.scoreLocator = scoreLocator;
exports.selectBestLocator = selectBestLocator;
exports.suggestSelectorApproach = suggestSelectorApproach;
exports.toPlaywrightLocator = toPlaywrightLocator;
exports.validateLocator = validateLocator;
//# sourceMappingURL=index.cjs.map
//# sourceMappingURL=index.cjs.map