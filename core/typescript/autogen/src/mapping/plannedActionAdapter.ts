/**
 * Adapter to convert IR Primitives to PlannedActions
 * This enables plan.ts to use the unified pattern matching system
 *
 * @see research/2026-02-03_unified-pattern-matching-plan.md Phase 1
 */
import type { IRPrimitive, LocatorSpec, ValueSpec } from '../ir/types.js';
import type { PlannedAction } from '../cli/plan.js';

/**
 * Convert an IR Primitive to a PlannedAction
 * This is the bridge between the unified pattern system and plan.ts
 */
export function irPrimitiveToPlannedAction(primitive: IRPrimitive): PlannedAction {
  switch (primitive.type) {
    // ═══════════════════════════════════════════════════════════════════════════
    // NAVIGATION
    // ═══════════════════════════════════════════════════════════════════════════
    case 'goto':
      return { type: 'navigate', target: primitive.url };

    case 'reload':
      return { type: 'reload' };

    case 'goBack':
      return { type: 'goBack' };

    case 'goForward':
      return { type: 'goForward' };

    case 'waitForURL':
      return {
        type: 'waitForURL',
        target: typeof primitive.pattern === 'string' ? primitive.pattern : primitive.pattern.source,
      };

    case 'waitForResponse':
      return { type: 'waitForNetwork', target: primitive.urlPattern };

    case 'waitForLoadingComplete':
      return { type: 'wait', options: { timeout: primitive.timeout ?? 5000 } };

    // ═══════════════════════════════════════════════════════════════════════════
    // WAIT PRIMITIVES
    // ═══════════════════════════════════════════════════════════════════════════
    case 'waitForVisible':
      return { type: 'waitForVisible', target: locatorToTarget(primitive.locator) };

    case 'waitForHidden':
      return { type: 'waitForHidden', target: locatorToTarget(primitive.locator) };

    case 'waitForTimeout':
      return { type: 'wait', options: { timeout: primitive.ms } };

    case 'waitForNetworkIdle':
      return { type: 'waitForNetwork' };

    // ═══════════════════════════════════════════════════════════════════════════
    // CLICK INTERACTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    case 'click':
      return { type: 'click', target: locatorToTarget(primitive.locator) };

    case 'dblclick':
      return { type: 'dblclick', target: locatorToTarget(primitive.locator) };

    case 'rightClick':
      return { type: 'rightClick', target: locatorToTarget(primitive.locator) };

    // ═══════════════════════════════════════════════════════════════════════════
    // FORM INTERACTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    case 'fill':
      return {
        type: 'fill',
        target: locatorToTarget(primitive.locator),
        value: valueToString(primitive.value),
      };

    case 'select':
      return {
        type: 'select',
        target: locatorToTarget(primitive.locator),
        value: primitive.option,
      };

    case 'check':
      return { type: 'check', target: locatorToTarget(primitive.locator) };

    case 'uncheck':
      return { type: 'uncheck', target: locatorToTarget(primitive.locator) };

    case 'clear':
      return { type: 'clear', target: locatorToTarget(primitive.locator) };

    case 'upload':
      return {
        type: 'upload',
        target: locatorToTarget(primitive.locator),
        files: primitive.files,
      };

    // ═══════════════════════════════════════════════════════════════════════════
    // OTHER INTERACTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    case 'press':
      return { type: 'press', key: primitive.key };

    case 'hover':
      return { type: 'hover', target: locatorToTarget(primitive.locator) };

    case 'focus':
      return { type: 'focus', target: locatorToTarget(primitive.locator) };

    // ═══════════════════════════════════════════════════════════════════════════
    // ASSERTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    case 'expectVisible':
      return { type: 'assert', target: locatorToTarget(primitive.locator) };

    case 'expectNotVisible':
    case 'expectHidden':
      return { type: 'assertHidden', target: locatorToTarget(primitive.locator) };

    case 'expectText':
      return {
        type: 'assertText',
        target: locatorToTarget(primitive.locator),
        value: typeof primitive.text === 'string' ? primitive.text : primitive.text.source,
      };

    case 'expectContainsText':
      return {
        type: 'assertText',
        target: locatorToTarget(primitive.locator),
        value: primitive.text,
      };

    case 'expectValue':
      return {
        type: 'assertValue',
        target: locatorToTarget(primitive.locator),
        value: primitive.value,
      };

    case 'expectChecked':
      return { type: 'assertChecked', target: locatorToTarget(primitive.locator) };

    case 'expectEnabled':
      return { type: 'assertEnabled', target: locatorToTarget(primitive.locator) };

    case 'expectDisabled':
      return { type: 'assertDisabled', target: locatorToTarget(primitive.locator) };

    case 'expectURL':
      return {
        type: 'assertURL',
        target: typeof primitive.pattern === 'string' ? primitive.pattern : primitive.pattern.source,
      };

    case 'expectTitle':
      return {
        type: 'assertTitle',
        target: typeof primitive.title === 'string' ? primitive.title : primitive.title.source,
      };

    case 'expectCount':
      return {
        type: 'assertCount',
        target: locatorToTarget(primitive.locator),
        count: primitive.count,
      };

    // ═══════════════════════════════════════════════════════════════════════════
    // SIGNALS (TOASTS, MODALS, ALERTS)
    // ═══════════════════════════════════════════════════════════════════════════
    case 'expectToast':
      return {
        type: 'assertToast',
        toastType: primitive.toastType,
        value: primitive.message,
      };

    case 'dismissModal':
      return { type: 'dismissModal' };

    case 'acceptAlert':
      return { type: 'acceptAlert' };

    case 'dismissAlert':
      return { type: 'dismissAlert' };

    // ═══════════════════════════════════════════════════════════════════════════
    // MODULE CALLS
    // ═══════════════════════════════════════════════════════════════════════════
    case 'callModule':
      return {
        type: 'callModule',
        module: primitive.module,
        method: primitive.method,
      };

    // ═══════════════════════════════════════════════════════════════════════════
    // BLOCKED/TODO
    // ═══════════════════════════════════════════════════════════════════════════
    case 'blocked':
      return { type: 'custom', target: primitive.sourceText };

    default:
      // Exhaustiveness check - this should never happen if all types are handled
      const _exhaustive: never = primitive;
      return { type: 'custom', target: String((_exhaustive as IRPrimitive).type) };
  }
}

/**
 * Convert a LocatorSpec to a target string for PlannedAction
 */
function locatorToTarget(locator: LocatorSpec): string {
  switch (locator.strategy) {
    case 'role':
      // For role locators, include the accessible name if available
      if (locator.options?.name) {
        return `${locator.value}:${locator.options.name}`;
      }
      return locator.value;

    case 'placeholder':
      // For placeholder locators, use placeholder: prefix
      return `placeholder:${locator.value}`;

    case 'label':
    case 'text':
    case 'testid':
      return locator.value;

    case 'css':
      // For CSS selectors, return as-is
      return locator.value;

    default:
      return locator.value;
  }
}

/**
 * Convert a ValueSpec to a string for PlannedAction
 */
function valueToString(value: ValueSpec): string {
  switch (value.type) {
    case 'literal':
      return value.value;

    case 'actor':
      // Actor reference: {{email}}, {{password}}
      return `{{${value.value}}}`;

    case 'testData':
      // Test data reference: $user.email
      return `$${value.value}`;

    case 'generated':
      // Generated value: ${runId}, ${timestamp}
      return value.value;

    case 'runId':
      return '${runId}';

    default:
      return value.value || '';
  }
}

/**
 * Convert PlannedAction back to an IR Primitive (for round-trip consistency)
 * This is useful for testing and debugging
 */
export function plannedActionToIRPrimitive(action: PlannedAction): IRPrimitive | null {
  switch (action.type) {
    case 'navigate':
      return { type: 'goto', url: action.target || '/' };

    case 'reload':
      return { type: 'reload' };

    case 'goBack':
      return { type: 'goBack' };

    case 'goForward':
      return { type: 'goForward' };

    case 'click':
      return { type: 'click', locator: targetToLocator(action.target || '') };

    case 'dblclick':
      return { type: 'dblclick', locator: targetToLocator(action.target || '') };

    case 'rightClick':
      return { type: 'rightClick', locator: targetToLocator(action.target || '') };

    case 'fill':
      return {
        type: 'fill',
        locator: targetToLocator(action.target || ''),
        value: stringToValue(action.value || ''),
      };

    case 'select':
      return {
        type: 'select',
        locator: targetToLocator(action.target || ''),
        option: action.value || '',
      };

    case 'check':
      return { type: 'check', locator: targetToLocator(action.target || '') };

    case 'uncheck':
      return { type: 'uncheck', locator: targetToLocator(action.target || '') };

    case 'press':
      return { type: 'press', key: action.key || 'Enter' };

    case 'hover':
      return { type: 'hover', locator: targetToLocator(action.target || '') };

    case 'focus':
      return { type: 'focus', locator: targetToLocator(action.target || '') };

    case 'clear':
      return { type: 'clear', locator: targetToLocator(action.target || '') };

    case 'assert':
      return { type: 'expectVisible', locator: targetToLocator(action.target || '') };

    case 'assertHidden':
      return { type: 'expectHidden', locator: targetToLocator(action.target || '') };

    case 'assertText':
      return {
        type: 'expectText',
        locator: targetToLocator(action.target || ''),
        text: action.value || '',
      };

    case 'assertURL':
      return { type: 'expectURL', pattern: action.target || '/' };

    case 'assertTitle':
      return { type: 'expectTitle', title: action.target || '' };

    case 'assertToast':
      return {
        type: 'expectToast',
        toastType: action.toastType || 'info',
        message: action.value,
      };

    case 'waitForVisible':
      return { type: 'waitForVisible', locator: targetToLocator(action.target || '') };

    case 'waitForHidden':
      return { type: 'waitForHidden', locator: targetToLocator(action.target || '') };

    case 'waitForNetwork':
      return { type: 'waitForNetworkIdle' };

    case 'wait':
      return { type: 'waitForTimeout', ms: (action.options?.timeout as number) || 5000 };

    case 'dismissModal':
      return { type: 'dismissModal' };

    case 'acceptAlert':
      return { type: 'acceptAlert' };

    case 'dismissAlert':
      return { type: 'dismissAlert' };

    case 'callModule':
      return {
        type: 'callModule',
        module: action.module || 'unknown',
        method: action.method || 'unknown',
      };

    case 'custom':
      return { type: 'blocked', reason: 'custom action', sourceText: action.target || '' };

    default:
      return null;
  }
}

/**
 * Convert a target string back to a LocatorSpec
 */
function targetToLocator(target: string): LocatorSpec {
  // Check for role:name pattern (e.g., "button:Submit")
  const roleMatch = target.match(/^(\w+):(.+)$/);
  if (roleMatch) {
    return {
      strategy: 'role',
      value: roleMatch[1]!,
      options: { name: roleMatch[2] },
    };
  }

  // Default to text locator
  return { strategy: 'text', value: target };
}

/**
 * Convert a string value back to a ValueSpec
 */
function stringToValue(str: string): ValueSpec {
  // Actor reference: {{email}}
  if (/^\{\{.+\}\}$/.test(str)) {
    return { type: 'actor', value: str.slice(2, -2) };
  }

  // Test data reference: $user.email
  if (/^\$.+/.test(str)) {
    return { type: 'testData', value: str.slice(1) };
  }

  // Generated value: ${runId}
  if (/\$\{.+\}/.test(str)) {
    return { type: 'generated', value: str };
  }

  // Literal
  return { type: 'literal', value: str };
}
