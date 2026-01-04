/**
 * Journey Normalizer - Convert parsed Journey to IR
 * @see research/2026-01-02_autogen-refined-plan.md Section 9
 */
import type { ParsedJourney, AcceptanceCriterion, ProceduralStep } from './parseJourney.js';
import type {
  IRJourney,
  IRStep,
  IRPrimitive,
  IRMappingResult,
  ModuleDependencies,
  CompletionSignal,
  JourneyDataConfig,
  LocatorSpec,
} from '../ir/types.js';
import { mapStepText } from '../mapping/stepMapper.js';

/**
 * Options for normalizing a Journey
 */
export interface NormalizeOptions {
  /** Include blocked steps in output */
  includeBlocked?: boolean;
  /** Strict mode - fail on any blocked step */
  strict?: boolean;
  /** Default timeout for assertions (ms) */
  defaultTimeout?: number;
}

/**
 * Normalize a parsed Journey into IR format
 */
export function normalizeJourney(
  parsed: ParsedJourney,
  options: NormalizeOptions = {}
): IRMappingResult {
  const { includeBlocked = true, strict = false } = options;

  const blockedSteps: IRMappingResult['blockedSteps'] = [];
  const warnings: string[] = [];

  // Map acceptance criteria to IR steps
  const steps: IRStep[] = [];

  for (const ac of parsed.acceptanceCriteria) {
    const step = mapAcceptanceCriterionToStep(ac, parsed.proceduralSteps, warnings);

    // Check for blocked primitives
    const blockedPrimitives = [
      ...step.actions.filter((a) => a.type === 'blocked'),
      ...step.assertions.filter((a) => a.type === 'blocked'),
    ] as Array<{ type: 'blocked'; reason: string; sourceText: string }>;

    if (blockedPrimitives.length > 0) {
      for (const blocked of blockedPrimitives) {
        blockedSteps.push({
          stepId: step.id,
          sourceText: blocked.sourceText,
          reason: blocked.reason,
        });
      }

      if (strict) {
        continue; // Skip blocked steps in strict mode
      }
    }

    if (includeBlocked || blockedPrimitives.length === 0) {
      steps.push(step);
    }
  }

  // If no AC-based steps, create steps from procedural steps
  if (steps.length === 0 && parsed.proceduralSteps.length > 0) {
    for (const ps of parsed.proceduralSteps) {
      const step = mapProceduralStepToIRStep(ps, warnings);
      steps.push(step);
    }
  }

  // Build module dependencies
  const moduleDependencies: ModuleDependencies = {
    foundation: parsed.frontmatter.modules?.foundation ?? [],
    feature: parsed.frontmatter.modules?.features ?? [],
  };

  // Map completion signals
  const completion: CompletionSignal[] | undefined = parsed.frontmatter.completion?.map((c) => ({
    type: c.type,
    value: c.value,
    options: c.options,
  }));

  // Map data config
  const data: JourneyDataConfig | undefined = parsed.frontmatter.data
    ? {
        strategy: parsed.frontmatter.data.strategy,
        cleanup: parsed.frontmatter.data.cleanup,
      }
    : undefined;

  // Build the IR Journey
  const journey: IRJourney = {
    id: parsed.frontmatter.id,
    title: parsed.frontmatter.title,
    tier: parsed.frontmatter.tier,
    scope: parsed.frontmatter.scope,
    actor: parsed.frontmatter.actor,
    tags: buildTags(parsed),
    moduleDependencies,
    data,
    completion,
    steps,
    revision: parsed.frontmatter.revision,
    prerequisites: parsed.frontmatter.prerequisites,
    negativePaths: parsed.frontmatter.negativePaths,
    sourcePath: parsed.sourcePath,
    // P3 Feature fields - pass through from frontmatter
    testData: parsed.frontmatter.testData,
    visualRegression: parsed.frontmatter.visualRegression,
    accessibility: parsed.frontmatter.accessibility,
    performance: parsed.frontmatter.performance,
  };

  // Calculate stats
  const stats = {
    totalSteps: parsed.acceptanceCriteria.length || parsed.proceduralSteps.length,
    mappedSteps: steps.length,
    blockedSteps: blockedSteps.length,
    totalActions: steps.reduce((sum, s) => sum + s.actions.length, 0),
    totalAssertions: steps.reduce((sum, s) => sum + s.assertions.length, 0),
  };

  return {
    journey,
    blockedSteps,
    warnings,
    stats,
  };
}

/**
 * Map an acceptance criterion to an IR step
 */
function mapAcceptanceCriterionToStep(
  ac: AcceptanceCriterion,
  proceduralSteps: ProceduralStep[],
  warnings: string[]
): IRStep {
  const actions: IRPrimitive[] = [];
  const assertions: IRPrimitive[] = [];
  const notes: string[] = [];

  // Find related procedural steps
  const relatedProcedural = proceduralSteps.filter((ps) => ps.linkedAC === ac.id);

  // Process bullet points as potential actions/assertions
  for (const stepText of ac.steps) {
    const result = mapStepText(stepText, { normalizeText: false });

    if (result.primitive) {
      if (isAssertion(result.primitive)) {
        assertions.push(result.primitive);
      } else {
        actions.push(result.primitive);
      }
    } else {
      // Cannot parse - add as blocked
      actions.push({
        type: 'blocked',
        reason: result.message || 'Could not parse step into primitive',
        sourceText: stepText,
      });
      if (result.message) {
        warnings.push(result.message);
      }
    }
  }

  // Add related procedural steps as actions
  for (const ps of relatedProcedural) {
    const result = mapStepText(ps.text, { normalizeText: false });
    if (result.primitive) {
      if (isAssertion(result.primitive)) {
        assertions.push(result.primitive);
      } else {
        actions.push(result.primitive);
      }
    } else if (result.message) {
      warnings.push(result.message);
    }
  }

  // If no assertions from steps, add a visibility check for the AC title
  if (assertions.length === 0 && ac.title) {
    notes.push(`TODO: Add assertion for: ${ac.title}`);
  }

  return {
    id: ac.id,
    description: ac.title || `Step ${ac.id}`,
    actions,
    assertions,
    sourceText: ac.rawContent,
    notes: notes.length > 0 ? notes : undefined,
  };
}

/**
 * Map a procedural step to an IR step
 */
function mapProceduralStepToIRStep(ps: ProceduralStep, warnings: string[]): IRStep {
  const actions: IRPrimitive[] = [];
  const assertions: IRPrimitive[] = [];

  const result = mapStepText(ps.text, { normalizeText: false });
  if (result.primitive) {
    if (isAssertion(result.primitive)) {
      assertions.push(result.primitive);
    } else {
      actions.push(result.primitive);
    }
  } else {
    actions.push({
      type: 'blocked',
      reason: result.message || 'Could not parse procedural step',
      sourceText: ps.text,
    });
    if (result.message) {
      warnings.push(result.message);
    }
  }

  return {
    id: `PS-${ps.number}`,
    description: ps.text,
    actions,
    assertions,
  };
}

/**
 * Check if a primitive is an assertion
 */
function isAssertion(primitive: IRPrimitive): boolean {
  return primitive.type.startsWith('expect');
}

/**
 * Build tags for the journey
 */
function buildTags(parsed: ParsedJourney): string[] {
  const tags = new Set<string>();

  // Standard tags
  tags.add('@artk');
  tags.add('@journey');
  tags.add(`@${parsed.frontmatter.id}`);
  tags.add(`@tier-${parsed.frontmatter.tier}`);
  tags.add(`@scope-${parsed.frontmatter.scope}`);
  tags.add(`@actor-${parsed.frontmatter.actor}`);

  // User-defined tags
  if (parsed.frontmatter.tags) {
    for (const tag of parsed.frontmatter.tags) {
      tags.add(tag.startsWith('@') ? tag : `@${tag}`);
    }
  }

  return Array.from(tags);
}

/**
 * Convert completion signals to IR primitives (final assertions)
 */
export function completionSignalsToAssertions(
  signals: CompletionSignal[]
): IRPrimitive[] {
  return signals.map(signal => {
    switch (signal.type) {
      case 'url':
        return {
          type: 'expectURL',
          pattern: signal.options?.exact
            ? signal.value
            : new RegExp(escapeRegex(signal.value)),
        } as IRPrimitive;

      case 'toast': {
        // Parse toast type from value if it contains "success", "error", "info", or "warning"
        const lowerValue = signal.value.toLowerCase();
        let toastType: 'success' | 'error' | 'info' | 'warning' = 'success';
        if (lowerValue.includes('error')) {
          toastType = 'error';
        } else if (lowerValue.includes('warning')) {
          toastType = 'warning';
        } else if (lowerValue.includes('info')) {
          toastType = 'info';
        }

        return {
          type: 'expectToast',
          toastType,
          message: signal.value,
        } as IRPrimitive;
      }

      case 'element': {
        const state = signal.options?.state || 'visible';
        return {
          type: state === 'hidden' || state === 'detached'
            ? 'expectNotVisible'
            : 'expectVisible',
          locator: parseLocatorFromSelector(signal.value),
          timeout: signal.options?.timeout,
        } as IRPrimitive;
      }

      case 'title':
        return {
          type: 'expectTitle',
          title: signal.options?.exact
            ? signal.value
            : new RegExp(escapeRegex(signal.value)),
        } as IRPrimitive;

      case 'api':
        return {
          type: 'waitForResponse',
          urlPattern: signal.value,
        } as IRPrimitive;

      default:
        throw new Error(`Unknown completion signal type: ${(signal as CompletionSignal).type}`);
    }
  });
}

/**
 * Parse a selector string to LocatorSpec
 */
function parseLocatorFromSelector(selector: string): LocatorSpec {
  // data-testid
  if (selector.includes('data-testid')) {
    const match = selector.match(/\[data-testid=['"]([^'"]+)['"]\]/);
    if (match) {
      return { strategy: 'testid', value: match[1] };
    }
  }

  // Role selector
  if (selector.startsWith('role=')) {
    return { strategy: 'role', value: selector.slice(5) };
  }

  // Text selector
  if (selector.startsWith('text=')) {
    return { strategy: 'text', value: selector.slice(5) };
  }

  // Label selector
  if (selector.startsWith('label=')) {
    return { strategy: 'label', value: selector.slice(6) };
  }

  // Placeholder selector
  if (selector.startsWith('placeholder=')) {
    return { strategy: 'placeholder', value: selector.slice(12) };
  }

  // Default to CSS
  return { strategy: 'css', value: selector };
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');
}

/**
 * Validate that a Journey is ready for code generation
 */
export function validateJourneyForCodeGen(result: IRMappingResult): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Must have at least one step
  if (result.journey.steps.length === 0) {
    errors.push('Journey has no steps');
  }

  // Must have completion signals
  if (!result.journey.completion || result.journey.completion.length === 0) {
    errors.push('Journey has no completion signals');
  }

  // Should not have too many blocked steps
  if (result.stats.blockedSteps > result.stats.mappedSteps) {
    errors.push(`Too many blocked steps: ${result.stats.blockedSteps} blocked vs ${result.stats.mappedSteps} mapped`);
  }

  // Must have at least one assertion
  if (result.stats.totalAssertions === 0) {
    errors.push('Journey has no assertions');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
