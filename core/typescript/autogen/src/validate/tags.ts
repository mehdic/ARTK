/**
 * Tag Validation - Ensure generated tests have correct Playwright tags
 * @see T042 - Tag validation (required @JRN-####, @tier-*, @scope-*)
 */
import type { ValidationIssue } from './journey.js';

/**
 * Tag pattern matchers
 */
export const TAG_PATTERNS = {
  journeyId: /^@JRN-\d{4}$/,
  tier: /^@tier-(smoke|release|regression)$/,
  scope: /^@scope-[a-z][a-z0-9-]*$/,
  actor: /^@actor-[a-z][a-z0-9-]*$/,
  custom: /^@[a-z][a-z0-9-]*$/,
};

/**
 * Tag validation options
 */
export interface TagValidationOptions {
  /** Whether journey ID tag is required */
  requireJourneyId?: boolean;
  /** Whether tier tag is required */
  requireTier?: boolean;
  /** Whether scope tag is required */
  requireScope?: boolean;
  /** Whether actor tag is required */
  requireActor?: boolean;
  /** Additional required tags */
  requiredTags?: string[];
  /** Forbidden tags */
  forbiddenTags?: string[];
  /** Maximum number of tags */
  maxTags?: number;
}

const DEFAULT_OPTIONS: TagValidationOptions = {
  requireJourneyId: true,
  requireTier: true,
  requireScope: true,
  requireActor: false,
  requiredTags: [],
  forbiddenTags: [],
  maxTags: 10,
};

/**
 * Tag validation result
 */
export interface TagValidationResult {
  /** Whether tags are valid */
  valid: boolean;
  /** Validation issues */
  issues: ValidationIssue[];
  /** Parsed tags */
  parsedTags: {
    journeyId?: string;
    tier?: string;
    scope?: string;
    actor?: string;
    custom: string[];
  };
}

/**
 * Parse tags from generated test code
 */
export function parseTagsFromCode(code: string): string[] {
  // Match tag array in test.describe
  const tagArrayMatch = code.match(/tag:\s*\[([^\]]*)\]/);
  if (!tagArrayMatch) {
    return [];
  }

  // Extract individual tags
  const tagArrayContent = tagArrayMatch[1]!;
  const tagMatches = tagArrayContent.match(/'[^']+'/g) || [];

  return tagMatches.map((t) => t.replace(/'/g, ''));
}

/**
 * Parse tags from frontmatter tags array
 */
export function parseTagsFromFrontmatter(tags: string[]): string[] {
  // Normalize tags - remove quotes if present
  return tags.map((t) => {
    const cleaned = t.replace(/^['"]|['"]$/g, '');
    // Ensure @ prefix
    return cleaned.startsWith('@') ? cleaned : `@${cleaned}`;
  });
}

/**
 * Categorize tags by type
 */
export function categorizeTags(tags: string[]): {
  journeyId?: string;
  tier?: string;
  scope?: string;
  actor?: string;
  custom: string[];
} {
  const result: {
    journeyId?: string;
    tier?: string;
    scope?: string;
    actor?: string;
    custom: string[];
  } = { custom: [] };

  for (const tag of tags) {
    if (TAG_PATTERNS.journeyId.test(tag)) {
      result.journeyId = tag;
    } else if (TAG_PATTERNS.tier.test(tag)) {
      result.tier = tag;
    } else if (TAG_PATTERNS.scope.test(tag)) {
      result.scope = tag;
    } else if (TAG_PATTERNS.actor.test(tag)) {
      result.actor = tag;
    } else if (TAG_PATTERNS.custom.test(tag)) {
      result.custom.push(tag);
    }
  }

  return result;
}

/**
 * Validate tags against requirements
 */
export function validateTags(
  tags: string[],
  journeyId: string,
  tier: string,
  scope: string,
  options: TagValidationOptions = {}
): TagValidationResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const issues: ValidationIssue[] = [];
  const parsedTags = categorizeTags(tags);

  // Check journey ID tag
  if (opts.requireJourneyId) {
    const expectedIdTag = `@${journeyId}`;
    if (!tags.includes(expectedIdTag) && parsedTags.journeyId !== expectedIdTag) {
      issues.push({
        code: 'TAG_MISSING_JOURNEY_ID',
        message: `Missing journey ID tag '${expectedIdTag}'`,
        severity: 'error',
        field: 'tags',
        suggestion: `Add '${expectedIdTag}' to the tags array`,
      });
    }
  }

  // Check tier tag
  if (opts.requireTier) {
    const expectedTierTag = `@tier-${tier}`;
    if (!tags.includes(expectedTierTag) && parsedTags.tier !== expectedTierTag) {
      // Check if any tier tag exists
      if (!parsedTags.tier) {
        issues.push({
          code: 'TAG_MISSING_TIER',
          message: `Missing tier tag, expected '${expectedTierTag}'`,
          severity: 'warning',
          field: 'tags',
          suggestion: `Add '${expectedTierTag}' to the tags array`,
        });
      } else if (parsedTags.tier !== expectedTierTag) {
        issues.push({
          code: 'TAG_TIER_MISMATCH',
          message: `Tier tag '${parsedTags.tier}' does not match journey tier '${tier}'`,
          severity: 'warning',
          field: 'tags',
          suggestion: `Change to '${expectedTierTag}' or update journey tier`,
        });
      }
    }
  }

  // Check scope tag
  if (opts.requireScope) {
    const expectedScopeTag = `@scope-${scope}`;
    if (!tags.includes(expectedScopeTag) && parsedTags.scope !== expectedScopeTag) {
      // Check if any scope tag exists
      if (!parsedTags.scope) {
        issues.push({
          code: 'TAG_MISSING_SCOPE',
          message: `Missing scope tag, expected '${expectedScopeTag}'`,
          severity: 'warning',
          field: 'tags',
          suggestion: `Add '${expectedScopeTag}' to the tags array`,
        });
      } else if (parsedTags.scope !== expectedScopeTag) {
        issues.push({
          code: 'TAG_SCOPE_MISMATCH',
          message: `Scope tag '${parsedTags.scope}' does not match journey scope '${scope}'`,
          severity: 'warning',
          field: 'tags',
          suggestion: `Change to '${expectedScopeTag}' or update journey scope`,
        });
      }
    }
  }

  // Check required custom tags
  for (const requiredTag of opts.requiredTags || []) {
    if (!tags.includes(requiredTag)) {
      issues.push({
        code: 'TAG_MISSING_REQUIRED',
        message: `Missing required tag '${requiredTag}'`,
        severity: 'error',
        field: 'tags',
        suggestion: `Add '${requiredTag}' to the tags array`,
      });
    }
  }

  // Check forbidden tags
  for (const forbiddenTag of opts.forbiddenTags || []) {
    if (tags.includes(forbiddenTag)) {
      issues.push({
        code: 'TAG_FORBIDDEN',
        message: `Forbidden tag '${forbiddenTag}' should not be used`,
        severity: 'error',
        field: 'tags',
        suggestion: `Remove '${forbiddenTag}' from the tags array`,
      });
    }
  }

  // Check max tags
  if (opts.maxTags && tags.length > opts.maxTags) {
    issues.push({
      code: 'TAG_TOO_MANY',
      message: `Too many tags (${tags.length}), maximum is ${opts.maxTags}`,
      severity: 'warning',
      field: 'tags',
      suggestion: 'Remove unnecessary tags',
    });
  }

  // Check for invalid tag format
  for (const tag of tags) {
    if (!TAG_PATTERNS.custom.test(tag)) {
      issues.push({
        code: 'TAG_INVALID_FORMAT',
        message: `Invalid tag format '${tag}', tags should start with @ followed by lowercase letters`,
        severity: 'warning',
        field: 'tags',
        suggestion: `Rename to a valid format like '@${tag.replace(/[^a-z0-9-]/gi, '-').toLowerCase()}'`,
      });
    }
  }

  // Check for duplicate tags
  const duplicates = tags.filter((tag, index) => tags.indexOf(tag) !== index);
  for (const duplicate of new Set(duplicates)) {
    issues.push({
      code: 'TAG_DUPLICATE',
      message: `Duplicate tag '${duplicate}'`,
      severity: 'warning',
      field: 'tags',
      suggestion: 'Remove duplicate tags',
    });
  }

  return {
    valid: issues.filter((i) => i.severity === 'error').length === 0,
    issues,
    parsedTags,
  };
}

/**
 * Generate expected tags for a journey
 */
export function generateExpectedTags(
  journeyId: string,
  tier: string,
  scope: string,
  additionalTags: string[] = []
): string[] {
  return [
    `@${journeyId}`,
    `@tier-${tier}`,
    `@scope-${scope}`,
    ...additionalTags,
  ];
}

/**
 * Validate tags in generated test code
 */
export function validateTagsInCode(
  code: string,
  journeyId: string,
  tier: string,
  scope: string,
  options: TagValidationOptions = {}
): TagValidationResult {
  const tags = parseTagsFromCode(code);
  return validateTags(tags, journeyId, tier, scope, options);
}
