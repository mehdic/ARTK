"use strict";
/**
 * @module types
 * @description Shared types index for ARTK Core v1.
 *
 * This barrel export provides common types used across multiple modules
 * for the ARTK E2E independent architecture.
 *
 * @example
 * ```typescript
 * import {
 *   ArtkTarget,
 *   ArtkContext,
 *   ArtkConfig,
 *   ArtkAuthConfig,
 *   DetectionResult,
 *   SubmoduleStatus,
 *   // Zod schemas
 *   ArtkContextSchema,
 *   ArtkConfigSchema,
 *   validateArtkContext,
 *   validateArtkConfig
 * } from '@artk/core/types';
 * ```
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateArtkContextExtended = exports.ArtkContextExtendedSchema = exports.JourneyStatsSchema = exports.DiscoveryContextSchema = exports.DetectedTargetSchema = exports.PilotContextSchema = exports.MIN_TARGETS = exports.MAX_TARGETS = exports.isArtkContext = exports.CONTEXT_SCHEMA_VERSION = void 0;
// Target types
__exportStar(require("./target.js"), exports);
var context_js_1 = require("./context.js");
Object.defineProperty(exports, "CONTEXT_SCHEMA_VERSION", { enumerable: true, get: function () { return context_js_1.CONTEXT_SCHEMA_VERSION; } });
Object.defineProperty(exports, "isArtkContext", { enumerable: true, get: function () { return context_js_1.isArtkContext; } });
Object.defineProperty(exports, "MAX_TARGETS", { enumerable: true, get: function () { return context_js_1.MAX_TARGETS; } });
Object.defineProperty(exports, "MIN_TARGETS", { enumerable: true, get: function () { return context_js_1.MIN_TARGETS; } });
Object.defineProperty(exports, "PilotContextSchema", { enumerable: true, get: function () { return context_js_1.PilotContextSchema; } });
Object.defineProperty(exports, "DetectedTargetSchema", { enumerable: true, get: function () { return context_js_1.DetectedTargetSchema; } });
Object.defineProperty(exports, "DiscoveryContextSchema", { enumerable: true, get: function () { return context_js_1.DiscoveryContextSchema; } });
Object.defineProperty(exports, "JourneyStatsSchema", { enumerable: true, get: function () { return context_js_1.JourneyStatsSchema; } });
Object.defineProperty(exports, "ArtkContextExtendedSchema", { enumerable: true, get: function () { return context_js_1.ArtkContextExtendedSchema; } });
Object.defineProperty(exports, "validateArtkContextExtended", { enumerable: true, get: function () { return context_js_1.validateArtkContextExtended; } });
// Config types (artk.config.yml)
__exportStar(require("./config.js"), exports);
// Auth types
__exportStar(require("./auth.js"), exports);
// Detection types (frontend detection heuristics)
__exportStar(require("./detection.js"), exports);
// Submodule types (git submodule state)
__exportStar(require("./submodule.js"), exports);
// Zod schemas and validation helpers (canonical source)
// ArtkContextSchema, ArtkTargetSchema, validateArtkContext from here
__exportStar(require("./schemas.js"), exports);
//# sourceMappingURL=index.js.map