"use strict";
/**
 * Zod schemas for @artk/core
 *
 * Provides runtime validation for configuration and result objects.
 *
 * @module @artk/core/schemas
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRollbackResult = exports.validateValidationIssue = exports.safeValidateValidationResult = exports.validateValidationResult = exports.RollbackResultSchema = exports.ValidationRuleConfigSchema = exports.ValidationOptionsSchema = exports.ValidationResultSchema = exports.ValidationRuleResultSchema = exports.ValidationIssueSchema = exports.ValidationRuleIdSchema = exports.StrictnessLevelSchema = exports.ValidationStatusSchema = exports.ValidationSeveritySchema = exports.safeValidateEnvironmentContext = exports.validateEnvironmentContext = exports.DetectionResultSchema = exports.DetectionOptionsSchema = exports.EnvironmentContextSchema = exports.NodeVersionParsedSchema = exports.DetectionMethodSchema = exports.DetectionConfidenceSchema = exports.TemplateSourceSchema = exports.ModuleSystemSchema = void 0;
// Environment Context Schemas
var environment_context_schema_js_1 = require("./environment-context.schema.js");
Object.defineProperty(exports, "ModuleSystemSchema", { enumerable: true, get: function () { return environment_context_schema_js_1.ModuleSystemSchema; } });
Object.defineProperty(exports, "TemplateSourceSchema", { enumerable: true, get: function () { return environment_context_schema_js_1.TemplateSourceSchema; } });
Object.defineProperty(exports, "DetectionConfidenceSchema", { enumerable: true, get: function () { return environment_context_schema_js_1.DetectionConfidenceSchema; } });
Object.defineProperty(exports, "DetectionMethodSchema", { enumerable: true, get: function () { return environment_context_schema_js_1.DetectionMethodSchema; } });
Object.defineProperty(exports, "NodeVersionParsedSchema", { enumerable: true, get: function () { return environment_context_schema_js_1.NodeVersionParsedSchema; } });
Object.defineProperty(exports, "EnvironmentContextSchema", { enumerable: true, get: function () { return environment_context_schema_js_1.EnvironmentContextSchema; } });
Object.defineProperty(exports, "DetectionOptionsSchema", { enumerable: true, get: function () { return environment_context_schema_js_1.DetectionOptionsSchema; } });
Object.defineProperty(exports, "DetectionResultSchema", { enumerable: true, get: function () { return environment_context_schema_js_1.DetectionResultSchema; } });
Object.defineProperty(exports, "validateEnvironmentContext", { enumerable: true, get: function () { return environment_context_schema_js_1.validateEnvironmentContext; } });
Object.defineProperty(exports, "safeValidateEnvironmentContext", { enumerable: true, get: function () { return environment_context_schema_js_1.safeValidateEnvironmentContext; } });
// Validation Result Schemas
var validation_result_schema_js_1 = require("./validation-result.schema.js");
Object.defineProperty(exports, "ValidationSeveritySchema", { enumerable: true, get: function () { return validation_result_schema_js_1.ValidationSeveritySchema; } });
Object.defineProperty(exports, "ValidationStatusSchema", { enumerable: true, get: function () { return validation_result_schema_js_1.ValidationStatusSchema; } });
Object.defineProperty(exports, "StrictnessLevelSchema", { enumerable: true, get: function () { return validation_result_schema_js_1.StrictnessLevelSchema; } });
Object.defineProperty(exports, "ValidationRuleIdSchema", { enumerable: true, get: function () { return validation_result_schema_js_1.ValidationRuleIdSchema; } });
Object.defineProperty(exports, "ValidationIssueSchema", { enumerable: true, get: function () { return validation_result_schema_js_1.ValidationIssueSchema; } });
Object.defineProperty(exports, "ValidationRuleResultSchema", { enumerable: true, get: function () { return validation_result_schema_js_1.ValidationRuleResultSchema; } });
Object.defineProperty(exports, "ValidationResultSchema", { enumerable: true, get: function () { return validation_result_schema_js_1.ValidationResultSchema; } });
Object.defineProperty(exports, "ValidationOptionsSchema", { enumerable: true, get: function () { return validation_result_schema_js_1.ValidationOptionsSchema; } });
Object.defineProperty(exports, "ValidationRuleConfigSchema", { enumerable: true, get: function () { return validation_result_schema_js_1.ValidationRuleConfigSchema; } });
Object.defineProperty(exports, "RollbackResultSchema", { enumerable: true, get: function () { return validation_result_schema_js_1.RollbackResultSchema; } });
Object.defineProperty(exports, "validateValidationResult", { enumerable: true, get: function () { return validation_result_schema_js_1.validateValidationResult; } });
Object.defineProperty(exports, "safeValidateValidationResult", { enumerable: true, get: function () { return validation_result_schema_js_1.safeValidateValidationResult; } });
Object.defineProperty(exports, "validateValidationIssue", { enumerable: true, get: function () { return validation_result_schema_js_1.validateValidationIssue; } });
Object.defineProperty(exports, "validateRollbackResult", { enumerable: true, get: function () { return validation_result_schema_js_1.validateRollbackResult; } });
//# sourceMappingURL=index.js.map