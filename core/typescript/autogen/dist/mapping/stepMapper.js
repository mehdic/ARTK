import { matchPattern } from './patterns.js';
import { normalizeStepText } from './glossary.js';
import { extractHints, hasLocatorHints, hasBehaviorHints, parseModuleHint, } from '../journey/parseHints.js';
/**
 * Check if a primitive is an assertion
 */
function isAssertion(primitive) {
    return primitive.type.startsWith('expect');
}
/**
 * Map a single text step to an IR primitive
 */
export function mapStepText(text, options = {}) {
    const { normalizeText = true } = options;
    // Extract machine hints first (T073 - hints take priority)
    const hints = extractHints(text);
    const cleanText = hints.hasHints ? hints.cleanText : text;
    // Normalize text if enabled
    const processedText = normalizeText ? normalizeStepText(cleanText) : cleanText;
    // Try to match against patterns
    let primitive = matchPattern(processedText);
    // If we have hints, enhance or override the primitive
    if (primitive && hints.hasHints) {
        primitive = applyHintsToPrimitive(primitive, hints);
    }
    else if (!primitive && hasLocatorHints(hints)) {
        // If no pattern match but we have locator hints, try to create primitive from hints
        primitive = createPrimitiveFromHints(processedText, hints);
    }
    if (primitive) {
        return {
            primitive,
            sourceText: text,
            isAssertion: isAssertion(primitive),
        };
    }
    // No match - return blocked
    return {
        primitive: null,
        sourceText: text,
        isAssertion: false,
        message: `Could not map step: "${text}"`,
    };
}
/**
 * Apply hints to an existing primitive (override inferred values)
 */
function applyHintsToPrimitive(primitive, hints) {
    // Clone the primitive to avoid mutation
    const enhanced = { ...primitive };
    // Apply locator hints if present
    if (hasLocatorHints(hints)) {
        const locatorSpec = buildLocatorFromHints(hints);
        if (locatorSpec && 'locator' in enhanced) {
            enhanced.locator = locatorSpec;
        }
    }
    // Apply behavior hints
    if (hasBehaviorHints(hints)) {
        if (hints.behavior.timeout !== undefined && 'timeout' in enhanced) {
            enhanced.timeout = hints.behavior.timeout;
        }
        if (hints.behavior.signal && 'signal' in enhanced) {
            enhanced.signal = hints.behavior.signal;
        }
        if (hints.behavior.module) {
            const parsed = parseModuleHint(hints.behavior.module);
            if (parsed) {
                enhanced.module = parsed.module;
                enhanced.method = parsed.method;
            }
        }
    }
    return enhanced;
}
/**
 * Build LocatorSpec from hints
 */
function buildLocatorFromHints(hints) {
    const { locator } = hints;
    if (locator.testid) {
        return { strategy: 'testid', value: locator.testid };
    }
    if (locator.role) {
        const options = {};
        if (locator.label)
            options.name = locator.label;
        if (locator.exact)
            options.exact = true;
        if (locator.level)
            options.level = locator.level;
        return {
            strategy: 'role',
            value: locator.role,
            options: Object.keys(options).length > 0 ? options : undefined,
        };
    }
    if (locator.label) {
        return {
            strategy: 'label',
            value: locator.label,
            options: locator.exact ? { exact: true } : undefined,
        };
    }
    if (locator.text) {
        return {
            strategy: 'text',
            value: locator.text,
            options: locator.exact ? { exact: true } : undefined,
        };
    }
    return null;
}
/**
 * Create a primitive from hints when no pattern matched
 */
function createPrimitiveFromHints(text, hints) {
    const locator = buildLocatorFromHints(hints);
    if (!locator)
        return null;
    const lowerText = text.toLowerCase();
    // Infer action type from text
    if (lowerText.includes('click') || lowerText.includes('press')) {
        return { type: 'click', locator };
    }
    if (lowerText.includes('enter') || lowerText.includes('type') || lowerText.includes('fill')) {
        // Try to extract value from text
        const valueMatch = text.match(/['"]([^'"]+)['"]/);
        return {
            type: 'fill',
            locator,
            value: { type: 'literal', value: valueMatch ? valueMatch[1] : '' },
        };
    }
    if (lowerText.includes('see') || lowerText.includes('visible') || lowerText.includes('display')) {
        return { type: 'expectVisible', locator };
    }
    if (lowerText.includes('check') || lowerText.includes('select')) {
        return { type: 'check', locator };
    }
    // Default to click if we have a locator but can't determine action
    return { type: 'click', locator };
}
/**
 * Map an acceptance criterion to an IR step
 */
export function mapAcceptanceCriterion(ac, proceduralSteps, options = {}) {
    const { includeBlocked = true } = options;
    const actions = [];
    const assertions = [];
    const mappings = [];
    const notes = [];
    // Find procedural steps linked to this AC
    const linkedProcedural = proceduralSteps.filter((ps) => ps.linkedAC === ac.id);
    // Map all bullet points from the AC
    for (const stepText of ac.steps) {
        const result = mapStepText(stepText, options);
        mappings.push(result);
        if (result.primitive) {
            if (result.isAssertion) {
                assertions.push(result.primitive);
            }
            else {
                actions.push(result.primitive);
            }
        }
        else if (includeBlocked) {
            actions.push({
                type: 'blocked',
                reason: result.message || 'Could not map step',
                sourceText: stepText,
            });
        }
    }
    // Also map linked procedural steps
    for (const ps of linkedProcedural) {
        const result = mapStepText(ps.text, options);
        // Don't duplicate in mappings, but add to actions if different from AC steps
        if (result.primitive && !ac.steps.includes(ps.text)) {
            if (result.isAssertion) {
                assertions.push(result.primitive);
            }
            else {
                actions.push(result.primitive);
            }
        }
    }
    // Add note if no assertions
    if (assertions.length === 0 && ac.title) {
        notes.push(`TODO: Add assertion for: ${ac.title}`);
    }
    const step = {
        id: ac.id,
        description: ac.title || `Step ${ac.id}`,
        actions,
        assertions,
        sourceText: ac.rawContent,
        notes: notes.length > 0 ? notes : undefined,
    };
    return {
        step,
        mappings,
        mappedCount: mappings.filter((m) => m.primitive !== null).length,
        blockedCount: mappings.filter((m) => m.primitive === null).length,
    };
}
/**
 * Map a procedural step to an IR step
 */
export function mapProceduralStep(ps, options = {}) {
    const { includeBlocked = true } = options;
    const result = mapStepText(ps.text, options);
    const actions = [];
    const assertions = [];
    if (result.primitive) {
        if (result.isAssertion) {
            assertions.push(result.primitive);
        }
        else {
            actions.push(result.primitive);
        }
    }
    else if (includeBlocked) {
        actions.push({
            type: 'blocked',
            reason: result.message || 'Could not map procedural step',
            sourceText: ps.text,
        });
    }
    const step = {
        id: `PS-${ps.number}`,
        description: ps.text,
        actions,
        assertions,
    };
    return {
        step,
        mappings: [result],
        mappedCount: result.primitive ? 1 : 0,
        blockedCount: result.primitive ? 0 : 1,
    };
}
/**
 * Batch map multiple steps
 */
export function mapSteps(steps, options = {}) {
    return steps.map((step) => mapStepText(step, options));
}
/**
 * Get mapping statistics
 */
export function getMappingStats(mappings) {
    const mapped = mappings.filter((m) => m.primitive !== null);
    const blocked = mappings.filter((m) => m.primitive === null);
    const actions = mapped.filter((m) => !m.isAssertion);
    const assertions = mapped.filter((m) => m.isAssertion);
    return {
        total: mappings.length,
        mapped: mapped.length,
        blocked: blocked.length,
        actions: actions.length,
        assertions: assertions.length,
        mappingRate: mappings.length > 0 ? mapped.length / mappings.length : 0,
    };
}
/**
 * Suggest improvements for blocked steps
 */
export function suggestImprovements(blockedSteps) {
    const suggestions = [];
    for (const step of blockedSteps) {
        const text = step.sourceText.toLowerCase();
        // Navigation suggestions
        if (text.includes('go') || text.includes('open') || text.includes('navigate')) {
            suggestions.push(`"${step.sourceText}" - Try: "User navigates to /path" or "User opens /path"`);
        }
        // Click suggestions
        else if (text.includes('click') || text.includes('press') || text.includes('button')) {
            suggestions.push(`"${step.sourceText}" - Try: "User clicks 'Button Name' button" or "Click the 'Label' button"`);
        }
        // Fill suggestions
        else if (text.includes('enter') || text.includes('type') || text.includes('field')) {
            suggestions.push(`"${step.sourceText}" - Try: "User enters 'value' in 'Field Label' field"`);
        }
        // Visibility suggestions
        else if (text.includes('see') || text.includes('visible') || text.includes('display')) {
            suggestions.push(`"${step.sourceText}" - Try: "User should see 'Text'" or "'Element' is visible"`);
        }
        // Generic suggestion
        else {
            suggestions.push(`"${step.sourceText}" - Could not determine intent. Check the patterns documentation.`);
        }
    }
    return suggestions;
}
//# sourceMappingURL=stepMapper.js.map