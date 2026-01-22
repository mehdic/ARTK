"use strict";
/**
 * Data Harness Module
 *
 * Provides test data isolation, namespacing, cleanup, and builder utilities.
 *
 * Features:
 * - Unique run ID generation for test isolation (FR-025)
 * - Namespacing utilities for parallel test execution (FR-026)
 * - Cleanup manager with priority ordering (FR-027, FR-028)
 * - Abstract DataBuilder base class
 * - Data API client for HTTP operations
 * - Factory utilities for test data creation
 *
 * @module data
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCustomFactory = exports.createSequencedFactory = exports.createFactory = exports.DataApiClient = exports.DataBuilder = exports.CleanupManager = exports.isNamespaced = exports.parseNamespace = exports.namespace = exports.generateRunId = void 0;
// Namespace utilities
var namespace_js_1 = require("./namespace.js");
Object.defineProperty(exports, "generateRunId", { enumerable: true, get: function () { return namespace_js_1.generateRunId; } });
Object.defineProperty(exports, "namespace", { enumerable: true, get: function () { return namespace_js_1.namespace; } });
Object.defineProperty(exports, "parseNamespace", { enumerable: true, get: function () { return namespace_js_1.parseNamespace; } });
Object.defineProperty(exports, "isNamespaced", { enumerable: true, get: function () { return namespace_js_1.isNamespaced; } });
// Cleanup management
var cleanup_js_1 = require("./cleanup.js");
Object.defineProperty(exports, "CleanupManager", { enumerable: true, get: function () { return cleanup_js_1.CleanupManager; } });
// Data builders
var builders_js_1 = require("./builders.js");
Object.defineProperty(exports, "DataBuilder", { enumerable: true, get: function () { return builders_js_1.DataBuilder; } });
// API client
var api_client_js_1 = require("./api-client.js");
Object.defineProperty(exports, "DataApiClient", { enumerable: true, get: function () { return api_client_js_1.DataApiClient; } });
// Factory utilities
var factories_js_1 = require("./factories.js");
Object.defineProperty(exports, "createFactory", { enumerable: true, get: function () { return factories_js_1.createFactory; } });
Object.defineProperty(exports, "createSequencedFactory", { enumerable: true, get: function () { return factories_js_1.createSequencedFactory; } });
Object.defineProperty(exports, "createCustomFactory", { enumerable: true, get: function () { return factories_js_1.createCustomFactory; } });
//# sourceMappingURL=index.js.map