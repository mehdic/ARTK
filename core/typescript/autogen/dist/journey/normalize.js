/**
 * Normalize a parsed Journey into IR format
 */
export function normalizeJourney(parsed, options = {}) {
    const { includeBlocked = true, strict = false } = options;
    const blockedSteps = [];
    const warnings = [];
    // Map acceptance criteria to IR steps
    const steps = [];
    for (const ac of parsed.acceptanceCriteria) {
        const step = mapAcceptanceCriterionToStep(ac, parsed.proceduralSteps, warnings);
        // Check for blocked primitives
        const blockedPrimitives = [
            ...step.actions.filter((a) => a.type === 'blocked'),
            ...step.assertions.filter((a) => a.type === 'blocked'),
        ];
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
    const moduleDependencies = {
        foundation: parsed.frontmatter.modules?.foundation ?? [],
        feature: parsed.frontmatter.modules?.features ?? [],
    };
    // Map completion signals
    const completion = parsed.frontmatter.completion?.map((c) => ({
        type: c.type,
        value: c.value,
        options: c.options,
    }));
    // Map data config
    const data = parsed.frontmatter.data
        ? {
            strategy: parsed.frontmatter.data.strategy,
            cleanup: parsed.frontmatter.data.cleanup,
        }
        : undefined;
    // Build the IR Journey
    const journey = {
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
        sourcePath: parsed.sourcePath,
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
function mapAcceptanceCriterionToStep(ac, proceduralSteps, warnings) {
    const actions = [];
    const assertions = [];
    const notes = [];
    // Find related procedural steps
    const relatedProcedural = proceduralSteps.filter((ps) => ps.linkedAC === ac.id);
    // Process bullet points as potential actions/assertions
    for (const stepText of ac.steps) {
        const primitive = parseStepText(stepText, warnings);
        if (primitive) {
            if (isAssertion(primitive)) {
                assertions.push(primitive);
            }
            else {
                actions.push(primitive);
            }
        }
        else {
            // Cannot parse - add as blocked
            actions.push({
                type: 'blocked',
                reason: 'Could not parse step into primitive',
                sourceText: stepText,
            });
        }
    }
    // Add related procedural steps as actions
    for (const ps of relatedProcedural) {
        const primitive = parseStepText(ps.text, warnings);
        if (primitive) {
            if (isAssertion(primitive)) {
                assertions.push(primitive);
            }
            else {
                actions.push(primitive);
            }
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
function mapProceduralStepToIRStep(ps, warnings) {
    const actions = [];
    const assertions = [];
    const primitive = parseStepText(ps.text, warnings);
    if (primitive) {
        if (isAssertion(primitive)) {
            assertions.push(primitive);
        }
        else {
            actions.push(primitive);
        }
    }
    else {
        actions.push({
            type: 'blocked',
            reason: 'Could not parse procedural step',
            sourceText: ps.text,
        });
    }
    return {
        id: `PS-${ps.number}`,
        description: ps.text,
        actions,
        assertions,
    };
}
/**
 * Parse step text into an IR primitive
 * This is a heuristic parser - full implementation would use NLP or LLM
 */
function parseStepText(text, warnings) {
    const lowerText = text.toLowerCase();
    // Navigation patterns
    if (lowerText.includes('navigate to') || lowerText.includes('go to') || lowerText.includes('open')) {
        const urlMatch = text.match(/(?:navigate to|go to|open)\s+(?:the\s+)?["']?([^"'\s]+)["']?/i);
        if (urlMatch) {
            return { type: 'goto', url: urlMatch[1], waitForLoad: true };
        }
    }
    // Click patterns
    if (lowerText.includes('click') || lowerText.includes('press') || lowerText.includes('tap')) {
        const buttonMatch = text.match(/(?:click|press|tap)\s+(?:the\s+)?["']([^"']+)["']\s*button/i);
        if (buttonMatch) {
            return {
                type: 'click',
                locator: createLocator('role', 'button', buttonMatch[1]),
            };
        }
        const linkMatch = text.match(/(?:click|press|tap)\s+(?:the\s+)?["']([^"']+)["']\s*link/i);
        if (linkMatch) {
            return {
                type: 'click',
                locator: createLocator('role', 'link', linkMatch[1]),
            };
        }
        const genericMatch = text.match(/(?:click|press|tap)\s+(?:on\s+)?(?:the\s+)?["']([^"']+)["']/i);
        if (genericMatch) {
            return {
                type: 'click',
                locator: createLocator('text', genericMatch[1]),
            };
        }
    }
    // Fill/Enter/Type patterns
    if (lowerText.includes('enter') || lowerText.includes('type') || lowerText.includes('fill')) {
        const fillMatch = text.match(/(?:enter|type|fill)\s+["']([^"']+)["']\s+(?:in|into)\s+(?:the\s+)?["']?([^"']+)["']?\s*(?:field|input)?/i);
        if (fillMatch) {
            return {
                type: 'fill',
                locator: createLocator('label', fillMatch[2]),
                value: createValue(fillMatch[1]),
            };
        }
        const fillMatch2 = text.match(/(?:enter|type|fill)\s+(?:the\s+)?["']?([^"']+)["']?\s+(?:field|input)\s+(?:with\s+)?["']([^"']+)["']/i);
        if (fillMatch2) {
            return {
                type: 'fill',
                locator: createLocator('label', fillMatch2[1]),
                value: createValue(fillMatch2[2]),
            };
        }
    }
    // Select patterns
    if (lowerText.includes('select')) {
        const selectMatch = text.match(/select\s+["']([^"']+)["']\s+(?:from|in)\s+(?:the\s+)?["']?([^"']+)["']?\s*(?:dropdown|select)?/i);
        if (selectMatch) {
            return {
                type: 'select',
                locator: createLocator('label', selectMatch[2]),
                option: selectMatch[1],
            };
        }
    }
    // Assertion patterns - visibility
    if (lowerText.includes('see') || lowerText.includes('visible') || lowerText.includes('displayed')) {
        const seeMatch = text.match(/(?:should\s+)?(?:see|visible|displayed)\s+(?:the\s+)?["']([^"']+)["']/i);
        if (seeMatch) {
            return {
                type: 'expectVisible',
                locator: createLocator('text', seeMatch[1]),
            };
        }
    }
    // Assertion patterns - text content
    if (lowerText.includes('shows') || lowerText.includes('displays') || lowerText.includes('contains')) {
        const textMatch = text.match(/(?:shows?|displays?|contains?)\s+(?:the\s+)?(?:text\s+)?["']([^"']+)["']/i);
        if (textMatch) {
            return {
                type: 'expectText',
                locator: createLocator('css', 'body'),
                text: textMatch[1],
            };
        }
    }
    // Toast/notification patterns
    if (lowerText.includes('toast') || lowerText.includes('notification') || lowerText.includes('message')) {
        if (lowerText.includes('success')) {
            const msgMatch = text.match(/["']([^"']+)["']/);
            return {
                type: 'expectToast',
                toastType: 'success',
                message: msgMatch?.[1],
            };
        }
        if (lowerText.includes('error')) {
            const msgMatch = text.match(/["']([^"']+)["']/);
            return {
                type: 'expectToast',
                toastType: 'error',
                message: msgMatch?.[1],
            };
        }
    }
    // URL patterns
    if (lowerText.includes('url') || lowerText.includes('redirected')) {
        const urlMatch = text.match(/(?:url|redirected to)\s+(?:should\s+)?(?:be|contain|include)?\s*["']?([^"'\s]+)["']?/i);
        if (urlMatch) {
            return { type: 'expectURL', pattern: urlMatch[1] };
        }
    }
    // Module call patterns
    if (lowerText.includes('login') || lowerText.includes('authenticate')) {
        return {
            type: 'callModule',
            module: 'auth',
            method: 'login',
        };
    }
    if (lowerText.includes('logout') || lowerText.includes('sign out')) {
        return {
            type: 'callModule',
            module: 'auth',
            method: 'logout',
        };
    }
    // Could not parse
    warnings.push(`Could not parse step: "${text.substring(0, 50)}..."`);
    return null;
}
/**
 * Create a locator spec
 */
function createLocator(strategy, value, name) {
    const locator = { strategy, value };
    if (name) {
        locator.options = { name };
    }
    return locator;
}
/**
 * Create a value spec
 */
function createValue(value) {
    // Check for actor references
    if (value.startsWith('{{') && value.endsWith('}}')) {
        const path = value.slice(2, -2).trim();
        return { type: 'actor', value: path };
    }
    // Check for test data references
    if (value.startsWith('$')) {
        return { type: 'testData', value: value.slice(1) };
    }
    // Literal value
    return { type: 'literal', value };
}
/**
 * Check if a primitive is an assertion
 */
function isAssertion(primitive) {
    return primitive.type.startsWith('expect');
}
/**
 * Build tags for the journey
 */
function buildTags(parsed) {
    const tags = new Set();
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
export function completionSignalsToAssertions(signals) {
    return signals.map(signal => {
        switch (signal.type) {
            case 'url':
                return {
                    type: 'expectURL',
                    pattern: signal.options?.exact
                        ? signal.value
                        : new RegExp(escapeRegex(signal.value)),
                };
            case 'toast': {
                // Parse toast type from value if it contains "success", "error", "info", or "warning"
                const lowerValue = signal.value.toLowerCase();
                let toastType = 'success';
                if (lowerValue.includes('error')) {
                    toastType = 'error';
                }
                else if (lowerValue.includes('warning')) {
                    toastType = 'warning';
                }
                else if (lowerValue.includes('info')) {
                    toastType = 'info';
                }
                return {
                    type: 'expectToast',
                    toastType,
                    message: signal.value,
                };
            }
            case 'element': {
                const state = signal.options?.state || 'visible';
                return {
                    type: state === 'hidden' || state === 'detached'
                        ? 'expectNotVisible'
                        : 'expectVisible',
                    locator: parseLocatorFromSelector(signal.value),
                    timeout: signal.options?.timeout,
                };
            }
            case 'title':
                return {
                    type: 'expectTitle',
                    title: signal.options?.exact
                        ? signal.value
                        : new RegExp(escapeRegex(signal.value)),
                };
            case 'api':
                return {
                    type: 'waitForResponse',
                    urlPattern: signal.value,
                };
            default:
                throw new Error(`Unknown completion signal type: ${signal.type}`);
        }
    });
}
/**
 * Parse a selector string to LocatorSpec
 */
function parseLocatorFromSelector(selector) {
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
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');
}
/**
 * Validate that a Journey is ready for code generation
 */
export function validateJourneyForCodeGen(result) {
    const errors = [];
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
//# sourceMappingURL=normalize.js.map