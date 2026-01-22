"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateJourneySchema = validateJourneySchema;
exports.validateJourneyStatus = validateJourneyStatus;
exports.validateJourneyTier = validateJourneyTier;
exports.validateJourneyTags = validateJourneyTags;
exports.validateJourneyFrontmatter = validateJourneyFrontmatter;
exports.isJourneyReady = isJourneyReady;
const parseJourney_js_1 = require("../journey/parseJourney.js");
const DEFAULT_OPTIONS = {
    allowDrafts: false,
    requiredTags: [],
    validTiers: ['smoke', 'release', 'regression'],
    warnEmptyAC: true,
};
/**
 * Validate journey frontmatter schema
 */
function validateJourneySchema(frontmatter) {
    const result = parseJourney_js_1.JourneyFrontmatterSchema.safeParse(frontmatter);
    const issues = [];
    if (!result.success) {
        for (const error of result.error.errors) {
            issues.push({
                code: 'SCHEMA_INVALID',
                message: `${error.path.join('.')}: ${error.message}`,
                severity: 'error',
                field: error.path.join('.'),
            });
        }
    }
    return { valid: result.success, issues };
}
/**
 * Validate journey status is appropriate for code generation
 */
function validateJourneyStatus(status, options = {}) {
    const { allowDrafts = false } = options;
    const issues = [];
    // Code generation requires 'clarified' status
    const validStatuses = ['clarified', 'implemented'];
    if (!validStatuses.includes(status)) {
        if (allowDrafts) {
            issues.push({
                code: 'STATUS_NOT_READY',
                message: `Journey status is '${status}', ideally should be 'clarified' for code generation`,
                severity: 'warning',
                field: 'status',
                suggestion: 'Run /journey-clarify to add execution details',
            });
        }
        else {
            issues.push({
                code: 'STATUS_NOT_CLARIFIED',
                message: `Journey status is '${status}', must be 'clarified' for code generation`,
                severity: 'error',
                field: 'status',
                suggestion: 'Run /journey-clarify to add execution details',
            });
        }
    }
    // Warn about quarantined or deprecated
    if (status === 'quarantined') {
        issues.push({
            code: 'STATUS_QUARANTINED',
            message: 'Journey is quarantined - tests are disabled',
            severity: 'warning',
            field: 'status',
        });
    }
    if (status === 'deprecated') {
        issues.push({
            code: 'STATUS_DEPRECATED',
            message: 'Journey is deprecated - consider removing',
            severity: 'warning',
            field: 'status',
        });
    }
    return issues;
}
/**
 * Validate journey tier is valid
 */
function validateJourneyTier(tier, options = {}) {
    const { validTiers = ['smoke', 'release', 'regression'] } = options;
    const issues = [];
    if (!validTiers.includes(tier)) {
        issues.push({
            code: 'TIER_INVALID',
            message: `Invalid tier '${tier}', expected one of: ${validTiers.join(', ')}`,
            severity: 'error',
            field: 'tier',
        });
    }
    return issues;
}
/**
 * Validate journey has required tags
 */
function validateJourneyTags(tags, journeyId, options = {}) {
    const { requiredTags = [] } = options;
    const issues = [];
    // Check for journey ID tag
    const idTag = `@${journeyId}`;
    if (!tags.includes(idTag)) {
        issues.push({
            code: 'TAG_MISSING_ID',
            message: `Journey should have ID tag '${idTag}'`,
            severity: 'warning',
            field: 'tags',
            suggestion: `Add '${idTag}' to tags array`,
        });
    }
    // Check for required tags
    for (const requiredTag of requiredTags) {
        if (!tags.includes(requiredTag)) {
            issues.push({
                code: 'TAG_MISSING_REQUIRED',
                message: `Missing required tag '${requiredTag}'`,
                severity: 'error',
                field: 'tags',
                suggestion: `Add '${requiredTag}' to tags array`,
            });
        }
    }
    return issues;
}
/**
 * Validate journey frontmatter for code generation
 */
function validateJourneyFrontmatter(frontmatter, options = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const issues = [];
    // Schema validation
    const schemaResult = validateJourneySchema(frontmatter);
    issues.push(...schemaResult.issues);
    // Status validation
    issues.push(...validateJourneyStatus(frontmatter.status, opts));
    // Tier validation
    issues.push(...validateJourneyTier(frontmatter.tier, opts));
    // Tags validation
    issues.push(...validateJourneyTags(frontmatter.tags || [], frontmatter.id, opts));
    // Check for actor
    if (!frontmatter.actor) {
        issues.push({
            code: 'ACTOR_MISSING',
            message: 'Journey should specify an actor (user role)',
            severity: 'warning',
            field: 'actor',
        });
    }
    // Check for scope
    if (!frontmatter.scope) {
        issues.push({
            code: 'SCOPE_MISSING',
            message: 'Journey should specify a scope (feature area)',
            severity: 'warning',
            field: 'scope',
        });
    }
    // Calculate counts
    const counts = {
        errors: issues.filter((i) => i.severity === 'error').length,
        warnings: issues.filter((i) => i.severity === 'warning').length,
        info: issues.filter((i) => i.severity === 'info').length,
    };
    return {
        valid: counts.errors === 0,
        journeyId: frontmatter.id,
        issues,
        counts,
    };
}
/**
 * Quick check if journey is ready for code generation
 */
function isJourneyReady(frontmatter) {
    const result = validateJourneyFrontmatter(frontmatter, { allowDrafts: false });
    return result.valid;
}
//# sourceMappingURL=journey.js.map