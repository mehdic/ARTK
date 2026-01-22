"use strict";
/**
 * Validation Runner
 * T057-T066: Implement ValidationRunner with timeout, file tracking, rollback, persistence
 *
 * Orchestrates all validation rules and manages the validation lifecycle including
 * automatic rollback on failure and result persistence.
 *
 * @module @artk/core/validation/runner
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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationRunner = void 0;
exports.validateFoundation = validateFoundation;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const index_js_1 = require("./rules/index.js");
const rollback_js_1 = require("./rollback.js");
/**
 * Default timeout for validation (10 seconds per FR-029)
 */
const DEFAULT_TIMEOUT = 10000;
/**
 * Validation Runner
 *
 * Orchestrates validation rules and manages the validation lifecycle.
 *
 * @example
 * ```typescript
 * const runner = new ValidationRunner();
 *
 * // Track files being generated
 * runner.trackGeneratedFile('/path/to/new/file.ts');
 *
 * // Run validation
 * const result = await runner.validate({
 *   files: ['/path/to/new/file.ts'],
 *   environmentContext: 'commonjs'
 * });
 *
 * if (result.status === 'failed') {
 *   // Files have been automatically rolled back
 *   console.error('Validation failed:', result.errors);
 * }
 * ```
 */
class ValidationRunner {
    timeout;
    outputDir;
    transaction;
    rules;
    /**
     * Create a new ValidationRunner
     */
    constructor(options = {}) {
        this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
        this.outputDir = options.outputDir ?? process.cwd();
        this.transaction = (0, rollback_js_1.startTransaction)();
        this.rules = (0, index_js_1.getAllRules)();
    }
    /**
     * Get the configured timeout
     */
    getTimeout() {
        return this.timeout;
    }
    /**
     * Track a newly generated file
     */
    trackGeneratedFile(filePath) {
        (0, rollback_js_1.trackGeneratedFile)(this.transaction, filePath);
    }
    /**
     * Track an existing file before modification
     */
    trackOriginalFile(filePath) {
        return (0, rollback_js_1.trackOriginalFile)(this.transaction, filePath);
    }
    /**
     * Run validation on the specified files
     */
    async validate(options) {
        const startTime = Date.now();
        const timestamp = new Date().toISOString();
        // Handle skip validation
        if (options.skipValidation) {
            return {
                timestamp,
                environmentContext: options.environmentContext,
                executionTime: Date.now() - startTime,
                status: 'passed',
                rules: [],
                errors: [],
                warnings: [],
                validatedFiles: options.files,
                rollbackPerformed: false,
                rollbackSuccess: null,
            };
        }
        const errors = [];
        const warnings = [];
        const ruleResults = [];
        const validatedFiles = [];
        // Get strictness settings
        const strictness = options.strictness || {};
        // Validate each file with timeout
        const validationPromise = this.validateFiles(options.files, options.environmentContext, strictness, errors, warnings, ruleResults, validatedFiles);
        // Apply timeout
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Validation timeout')), this.timeout);
        });
        try {
            await Promise.race([validationPromise, timeoutPromise]);
        }
        catch (error) {
            if (error instanceof Error && error.message === 'Validation timeout') {
                warnings.push({
                    file: '',
                    line: null,
                    column: null,
                    severity: 'warning',
                    ruleId: 'timeout',
                    message: `Validation timed out after ${this.timeout}ms`,
                    suggestedFix: 'Consider increasing timeout or validating fewer files',
                });
            }
        }
        // Determine status
        let status = 'passed';
        if (errors.length > 0) {
            status = 'failed';
        }
        else if (warnings.length > 0) {
            status = 'warnings';
        }
        // Handle rollback on failure
        let rollbackPerformed = false;
        let rollbackSuccess = null;
        if (status === 'failed' &&
            (this.transaction.generatedFiles.length > 0 ||
                this.transaction.originalFiles.size > 0)) {
            const rollbackResult = (0, rollback_js_1.rollbackTransaction)(this.transaction);
            rollbackPerformed = true;
            rollbackSuccess = rollbackResult.success;
            // Log rollback message
            const message = (0, rollback_js_1.generateRollbackMessage)(rollbackResult);
            console.log(message);
        }
        else if (status === 'passed' || status === 'warnings') {
            // Commit transaction on success
            (0, rollback_js_1.commitTransaction)(this.transaction);
        }
        // Reset transaction for next use
        this.transaction = (0, rollback_js_1.startTransaction)();
        const result = {
            timestamp,
            environmentContext: options.environmentContext,
            executionTime: Date.now() - startTime,
            status,
            rules: ruleResults,
            errors,
            warnings,
            validatedFiles,
            rollbackPerformed,
            rollbackSuccess,
        };
        // Persist results
        await this.persistResult(result);
        return result;
    }
    /**
     * Validate files using all rules
     */
    async validateFiles(files, moduleSystem, strictness, errors, warnings, ruleResults, validatedFiles) {
        const affectedFilesByRule = new Map();
        for (const rule of this.rules) {
            affectedFilesByRule.set(rule.config.id, new Set());
        }
        for (const filePath of files) {
            // Skip non-existent files
            if (!fs.existsSync(filePath)) {
                continue;
            }
            validatedFiles.push(filePath);
            let content;
            try {
                content = fs.readFileSync(filePath, 'utf8');
            }
            catch {
                continue;
            }
            // Run each rule
            for (const rule of this.rules) {
                const ruleStrictness = strictness[rule.config.id] ||
                    rule.config.defaultStrictness;
                // Skip ignored rules
                if (ruleStrictness === 'ignore') {
                    continue;
                }
                const issues = rule.validate(filePath, content, moduleSystem);
                for (const issue of issues) {
                    // Track affected files
                    affectedFilesByRule.get(rule.config.id)?.add(filePath);
                    // Apply strictness
                    if (ruleStrictness === 'warning') {
                        warnings.push({ ...issue, severity: 'warning' });
                    }
                    else {
                        if (issue.severity === 'error') {
                            errors.push(issue);
                        }
                        else {
                            warnings.push(issue);
                        }
                    }
                }
            }
        }
        // Generate rule results
        for (const rule of this.rules) {
            const affectedFiles = Array.from(affectedFilesByRule.get(rule.config.id) || []);
            const pass = affectedFiles.length === 0;
            ruleResults.push({
                ruleId: rule.config.id,
                pass,
                affectedFiles,
                message: pass
                    ? `${rule.config.name}: No issues found`
                    : `${rule.config.name}: Found issues in ${affectedFiles.length} file(s)`,
            });
        }
    }
    /**
     * Persist validation result to .artk/validation-results.json
     */
    async persistResult(result) {
        const artkDir = path.join(this.outputDir, '.artk');
        const resultsPath = path.join(artkDir, 'validation-results.json');
        // Ensure .artk directory exists
        if (!fs.existsSync(artkDir)) {
            fs.mkdirSync(artkDir, { recursive: true });
        }
        // Load existing results or start fresh
        let results = [];
        if (fs.existsSync(resultsPath)) {
            try {
                const content = fs.readFileSync(resultsPath, 'utf8');
                results = JSON.parse(content);
                if (!Array.isArray(results)) {
                    results = [];
                }
            }
            catch {
                results = [];
            }
        }
        // Append new result
        results.push(result);
        // Write back
        fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    }
}
exports.ValidationRunner = ValidationRunner;
/**
 * Validate foundation modules
 *
 * Convenience function for one-off validation without creating a runner instance.
 *
 * @param options - Validation options
 * @returns Validation result
 *
 * @example
 * ```typescript
 * import { validateFoundation } from '@artk/core/validation';
 *
 * const result = await validateFoundation({
 *   files: ['auth/login.ts', 'config/env.ts'],
 *   environmentContext: 'commonjs'
 * });
 *
 * if (result.status === 'failed') {
 *   console.error('Validation failed:', result.errors);
 * }
 * ```
 */
async function validateFoundation(options) {
    const runner = new ValidationRunner();
    return runner.validate(options);
}
//# sourceMappingURL=runner.js.map