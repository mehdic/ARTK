/**
 * Journey Schema Validation - Validate Journey frontmatter before code generation
 * @see T039 - Journey schema validation (status=clarified check)
 */
import type { JourneyFrontmatter } from '../journey/parseJourney.js';
import { JourneyFrontmatterSchema, JourneyStatus } from '../journey/parseJourney.js';

/**
 * Validation issue severity
 */
export type ValidationSeverity = 'error' | 'warning' | 'info';

/**
 * A single validation issue
 */
export interface ValidationIssue {
  /** Unique code for the issue */
  code: string;
  /** Human-readable message */
  message: string;
  /** Severity level */
  severity: ValidationSeverity;
  /** Field that has the issue, if applicable */
  field?: string;
  /** Suggested fix, if available */
  suggestion?: string;
}

/**
 * Result of journey validation
 */
export interface JourneyValidationResult {
  /** Whether the journey is valid for code generation */
  valid: boolean;
  /** Journey ID from frontmatter */
  journeyId: string;
  /** List of validation issues */
  issues: ValidationIssue[];
  /** Counts by severity */
  counts: {
    errors: number;
    warnings: number;
    info: number;
  };
}

/**
 * Options for journey validation
 */
export interface JourneyValidationOptions {
  /** Whether to allow draft journeys (status other than clarified) */
  allowDrafts?: boolean;
  /** Required tags that must be present */
  requiredTags?: string[];
  /** Valid tiers */
  validTiers?: string[];
  /** Warn if journey has no acceptance criteria */
  warnEmptyAC?: boolean;
}

const DEFAULT_OPTIONS: JourneyValidationOptions = {
  allowDrafts: false,
  requiredTags: [],
  validTiers: ['smoke', 'release', 'regression'],
  warnEmptyAC: true,
};

/**
 * Validate journey frontmatter schema
 */
export function validateJourneySchema(
  frontmatter: unknown
): { valid: boolean; issues: ValidationIssue[] } {
  const result = JourneyFrontmatterSchema.safeParse(frontmatter);
  const issues: ValidationIssue[] = [];

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
export function validateJourneyStatus(
  status: JourneyStatus,
  options: JourneyValidationOptions = {}
): ValidationIssue[] {
  const { allowDrafts = false } = options;
  const issues: ValidationIssue[] = [];

  // Code generation requires 'clarified' status
  const validStatuses: JourneyStatus[] = ['clarified', 'implemented'];

  if (!validStatuses.includes(status)) {
    if (allowDrafts) {
      issues.push({
        code: 'STATUS_NOT_READY',
        message: `Journey status is '${status}', ideally should be 'clarified' for code generation`,
        severity: 'warning',
        field: 'status',
        suggestion: 'Run /journey-clarify to add execution details',
      });
    } else {
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
export function validateJourneyTier(
  tier: string,
  options: JourneyValidationOptions = {}
): ValidationIssue[] {
  const { validTiers = ['smoke', 'release', 'regression'] } = options;
  const issues: ValidationIssue[] = [];

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
export function validateJourneyTags(
  tags: string[],
  journeyId: string,
  options: JourneyValidationOptions = {}
): ValidationIssue[] {
  const { requiredTags = [] } = options;
  const issues: ValidationIssue[] = [];

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
export function validateJourneyFrontmatter(
  frontmatter: JourneyFrontmatter,
  options: JourneyValidationOptions = {}
): JourneyValidationResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const issues: ValidationIssue[] = [];

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
export function isJourneyReady(frontmatter: JourneyFrontmatter): boolean {
  const result = validateJourneyFrontmatter(frontmatter, { allowDrafts: false });
  return result.valid;
}
