"use strict";
/**
 * ARTK Core v1 Error Types
 *
 * This module exports custom error classes for ARTK Core with detailed
 * context for debugging and remediation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ARTKStorageStateError = exports.ARTKAuthError = exports.ARTKConfigError = void 0;
var config_error_js_1 = require("./config-error.js");
Object.defineProperty(exports, "ARTKConfigError", { enumerable: true, get: function () { return config_error_js_1.ARTKConfigError; } });
var auth_error_js_1 = require("./auth-error.js");
Object.defineProperty(exports, "ARTKAuthError", { enumerable: true, get: function () { return auth_error_js_1.ARTKAuthError; } });
var storage_state_error_js_1 = require("./storage-state-error.js");
Object.defineProperty(exports, "ARTKStorageStateError", { enumerable: true, get: function () { return storage_state_error_js_1.ARTKStorageStateError; } });
//# sourceMappingURL=index.js.map