/**
 * React Framework Pack
 *
 * Provides React-specific patterns for hooks, context, portals, suspense, etc.
 *
 * @module llkb/packs/react
 */

import type { FrameworkPack, PackPattern } from './types.js';

const REACT_PATTERNS: PackPattern[] = [
  // Hooks
  { text: 'wait for useEffect to complete', primitive: 'wait', category: 'timing' },
  { text: 'verify useState update', primitive: 'assert', category: 'assertion' },
  { text: 'trigger useCallback', primitive: 'click', category: 'ui-interaction' },
  { text: 'wait for useMemo recalculation', primitive: 'wait', category: 'timing' },
  { text: 'verify useReducer state', primitive: 'assert', category: 'assertion' },
  { text: 'trigger useRef focus', primitive: 'click', category: 'ui-interaction' },
  { text: 'wait for custom hook', primitive: 'wait', category: 'timing' },
  { text: 'verify hook dependency update', primitive: 'assert', category: 'assertion' },

  // Context
  { text: 'verify context value', primitive: 'assert', category: 'assertion' },
  { text: 'switch context provider', primitive: 'click', category: 'ui-interaction' },
  { text: 'verify context consumer updates', primitive: 'assert', category: 'assertion' },
  { text: 'wait for context propagation', primitive: 'wait', category: 'timing' },

  // Portal
  { text: 'interact with portal content', primitive: 'click', category: 'ui-interaction' },
  { text: 'verify portal renders', primitive: 'assert', category: 'assertion' },
  { text: 'close portal', primitive: 'click', category: 'ui-interaction' },
  { text: 'wait for portal mount', primitive: 'wait', category: 'timing' },

  // Suspense
  { text: 'wait for lazy component to load', primitive: 'wait', category: 'timing' },
  { text: 'verify suspense fallback', primitive: 'assert', category: 'assertion' },
  { text: 'wait for suspense boundary', primitive: 'wait', category: 'timing' },
  { text: 'verify lazy component rendered', primitive: 'assert', category: 'assertion' },

  // Event handling
  { text: 'trigger onChange event', primitive: 'fill', category: 'ui-interaction' },
  { text: 'trigger onSubmit event', primitive: 'click', category: 'ui-interaction' },
  { text: 'trigger onClick event', primitive: 'click', category: 'ui-interaction' },
  { text: 'trigger onBlur event', primitive: 'click', category: 'ui-interaction' },
  { text: 'trigger onFocus event', primitive: 'click', category: 'ui-interaction' },
  { text: 'trigger onKeyDown event', primitive: 'fill', category: 'ui-interaction' },
  { text: 'trigger onMouseEnter event', primitive: 'hover', category: 'ui-interaction' },

  // Refs
  { text: 'verify ref is attached', primitive: 'assert', category: 'assertion' },
  { text: 'focus ref element', primitive: 'click', category: 'ui-interaction' },
  { text: 'scroll to ref element', primitive: 'scroll', category: 'ui-interaction' },
  { text: 'verify ref value updates', primitive: 'assert', category: 'assertion' },

  // Error boundaries
  { text: 'verify error boundary catches error', primitive: 'assert', category: 'assertion' },
  { text: 'trigger error boundary fallback', primitive: 'click', category: 'ui-interaction' },
];

/**
 * Get the React framework pack
 */
export function getReactPack(): FrameworkPack {
  return {
    name: 'react',
    framework: 'react',
    version: '1.0.0',
    description: 'React-specific patterns for hooks, context, portals, suspense, and event handling',
    patterns: REACT_PATTERNS,
  };
}
