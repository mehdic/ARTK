/**
 * Angular Framework Pack
 *
 * Provides Angular-specific patterns for directives, pipes, services, router, forms, and change detection.
 *
 * @module llkb/packs/angular
 */

import type { FrameworkPack, PackPattern } from './types.js';

const ANGULAR_PATTERNS: PackPattern[] = [
  // Directives
  { text: 'verify ngIf shows element', primitive: 'assert', category: 'assertion' },
  { text: 'verify ngIf hides element', primitive: 'assert', category: 'assertion' },
  { text: 'verify ngFor items', primitive: 'assert', category: 'assertion' },
  { text: 'interact with ngSwitch', primitive: 'click', category: 'ui-interaction' },
  { text: 'verify ngClass applied', primitive: 'assert', category: 'assertion' },
  { text: 'verify ngStyle applied', primitive: 'assert', category: 'assertion' },
  { text: 'trigger ngModel update', primitive: 'fill', category: 'ui-interaction' },

  // Pipes
  { text: 'verify async pipe output', primitive: 'assert', category: 'assertion' },
  { text: 'verify date pipe format', primitive: 'assert', category: 'assertion' },
  { text: 'verify currency pipe', primitive: 'assert', category: 'assertion' },
  { text: 'verify decimal pipe', primitive: 'assert', category: 'assertion' },
  { text: 'verify percent pipe', primitive: 'assert', category: 'assertion' },
  { text: 'verify custom pipe output', primitive: 'assert', category: 'assertion' },

  // Services
  { text: 'wait for service response', primitive: 'wait', category: 'timing' },
  { text: 'verify service call', primitive: 'assert', category: 'assertion' },
  { text: 'trigger service method', primitive: 'click', category: 'ui-interaction' },
  { text: 'verify dependency injection', primitive: 'assert', category: 'assertion' },

  // Router
  { text: 'navigate to angular route', primitive: 'navigate', category: 'navigation' },
  { text: 'verify router outlet', primitive: 'assert', category: 'assertion' },
  { text: 'verify activated route', primitive: 'assert', category: 'assertion' },
  { text: 'verify route params', primitive: 'assert', category: 'assertion' },
  { text: 'verify route guards', primitive: 'assert', category: 'assertion' },
  { text: 'trigger route navigation', primitive: 'click', category: 'navigation' },

  // Forms - Reactive
  { text: 'verify reactive form valid', primitive: 'assert', category: 'assertion' },
  { text: 'verify reactive form invalid', primitive: 'assert', category: 'assertion' },
  { text: 'fill reactive form control', primitive: 'fill', category: 'ui-interaction' },
  { text: 'verify form control errors', primitive: 'assert', category: 'assertion' },
  { text: 'submit reactive form', primitive: 'click', category: 'ui-interaction' },

  // Forms - Template-driven
  { text: 'verify template-driven form', primitive: 'assert', category: 'assertion' },
  { text: 'fill template form field', primitive: 'fill', category: 'ui-interaction' },
  { text: 'submit template form', primitive: 'click', category: 'ui-interaction' },

  // Change Detection
  { text: 'trigger change detection', primitive: 'click', category: 'ui-interaction' },
  { text: 'wait for zone stable', primitive: 'wait', category: 'timing' },
  { text: 'verify change detection ran', primitive: 'assert', category: 'assertion' },
  { text: 'wait for async operation', primitive: 'wait', category: 'timing' },
];

/**
 * Get the Angular framework pack
 */
export function getAngularPack(): FrameworkPack {
  return {
    name: 'angular',
    framework: 'angular',
    version: '1.0.0',
    description: 'Angular-specific patterns for directives, pipes, services, router, forms, and change detection',
    patterns: ANGULAR_PATTERNS,
  };
}
