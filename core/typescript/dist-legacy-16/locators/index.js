"use strict";
/**
 * ARTK Locators Module - Accessibility-First Locator Utilities
 *
 * Provides a strategy-based locator system that prioritizes accessibility
 * and semantic HTML over brittle CSS selectors.
 *
 * Key Features:
 * - FR-017: Multiple locator strategies (role, label, placeholder, testid, text, css)
 * - FR-018: Configurable strategy chain (first match wins)
 * - FR-019: Custom test ID attribute support
 * - FR-020: Scoped locators for forms, tables, sections
 * - ARIA/accessibility helper functions
 *
 * @module locators
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createConfigFromSelectors = exports.createDefaultConfig = exports.withinSection = exports.withinTable = exports.withinForm = exports.locate = exports.isValidAriaRole = exports.getAccessibleName = exports.isAriaInvalid = exports.isAriaRequired = exports.getAriaLive = exports.isAriaHidden = exports.isAriaChecked = exports.isAriaExpanded = exports.isAriaDisabled = exports.getAriaDescription = exports.getAriaLabel = exports.getAriaRole = exports.createCombinedTestIdSelector = exports.createTestIdSelector = exports.getTestIdValue = exports.hasTestIdAttribute = exports.byTestId = exports.tryStrategy = exports.byCss = exports.byText = exports.byPlaceholder = exports.byLabel = exports.byRole = void 0;
// =============================================================================
// Strategy Functions
// =============================================================================
var strategies_js_1 = require("./strategies.js");
Object.defineProperty(exports, "byRole", { enumerable: true, get: function () { return strategies_js_1.byRole; } });
Object.defineProperty(exports, "byLabel", { enumerable: true, get: function () { return strategies_js_1.byLabel; } });
Object.defineProperty(exports, "byPlaceholder", { enumerable: true, get: function () { return strategies_js_1.byPlaceholder; } });
Object.defineProperty(exports, "byText", { enumerable: true, get: function () { return strategies_js_1.byText; } });
Object.defineProperty(exports, "byCss", { enumerable: true, get: function () { return strategies_js_1.byCss; } });
Object.defineProperty(exports, "tryStrategy", { enumerable: true, get: function () { return strategies_js_1.tryStrategy; } });
// =============================================================================
// Test ID Functions
// =============================================================================
var testid_js_1 = require("./testid.js");
Object.defineProperty(exports, "byTestId", { enumerable: true, get: function () { return testid_js_1.byTestId; } });
Object.defineProperty(exports, "hasTestIdAttribute", { enumerable: true, get: function () { return testid_js_1.hasTestIdAttribute; } });
Object.defineProperty(exports, "getTestIdValue", { enumerable: true, get: function () { return testid_js_1.getTestIdValue; } });
Object.defineProperty(exports, "createTestIdSelector", { enumerable: true, get: function () { return testid_js_1.createTestIdSelector; } });
Object.defineProperty(exports, "createCombinedTestIdSelector", { enumerable: true, get: function () { return testid_js_1.createCombinedTestIdSelector; } });
// =============================================================================
// ARIA Helpers
// =============================================================================
var aria_js_1 = require("./aria.js");
Object.defineProperty(exports, "getAriaRole", { enumerable: true, get: function () { return aria_js_1.getAriaRole; } });
Object.defineProperty(exports, "getAriaLabel", { enumerable: true, get: function () { return aria_js_1.getAriaLabel; } });
Object.defineProperty(exports, "getAriaDescription", { enumerable: true, get: function () { return aria_js_1.getAriaDescription; } });
Object.defineProperty(exports, "isAriaDisabled", { enumerable: true, get: function () { return aria_js_1.isAriaDisabled; } });
Object.defineProperty(exports, "isAriaExpanded", { enumerable: true, get: function () { return aria_js_1.isAriaExpanded; } });
Object.defineProperty(exports, "isAriaChecked", { enumerable: true, get: function () { return aria_js_1.isAriaChecked; } });
Object.defineProperty(exports, "isAriaHidden", { enumerable: true, get: function () { return aria_js_1.isAriaHidden; } });
Object.defineProperty(exports, "getAriaLive", { enumerable: true, get: function () { return aria_js_1.getAriaLive; } });
Object.defineProperty(exports, "isAriaRequired", { enumerable: true, get: function () { return aria_js_1.isAriaRequired; } });
Object.defineProperty(exports, "isAriaInvalid", { enumerable: true, get: function () { return aria_js_1.isAriaInvalid; } });
Object.defineProperty(exports, "getAccessibleName", { enumerable: true, get: function () { return aria_js_1.getAccessibleName; } });
Object.defineProperty(exports, "isValidAriaRole", { enumerable: true, get: function () { return aria_js_1.isValidAriaRole; } });
// =============================================================================
// Locator Factory & Scoped Locators
// =============================================================================
var factory_js_1 = require("./factory.js");
Object.defineProperty(exports, "locate", { enumerable: true, get: function () { return factory_js_1.locate; } });
Object.defineProperty(exports, "withinForm", { enumerable: true, get: function () { return factory_js_1.withinForm; } });
Object.defineProperty(exports, "withinTable", { enumerable: true, get: function () { return factory_js_1.withinTable; } });
Object.defineProperty(exports, "withinSection", { enumerable: true, get: function () { return factory_js_1.withinSection; } });
Object.defineProperty(exports, "createDefaultConfig", { enumerable: true, get: function () { return factory_js_1.createDefaultConfig; } });
Object.defineProperty(exports, "createConfigFromSelectors", { enumerable: true, get: function () { return factory_js_1.createConfigFromSelectors; } });
//# sourceMappingURL=index.js.map