/**
 * @module types/context
 * @description Context type definitions for ARTK E2E independent architecture.
 * Defines the persistent state for inter-prompt communication.
 *
 * The context file (.artk/context.json) is created by /init and read by
 * subsequent commands (/discover, /journey-propose, etc.) to maintain
 * state across prompts.
 */

import { z } from 'zod';
import type { ArtkTarget } from './target.js';

/**
 * Context schema version.
 * Update this when making breaking changes to the context schema.
 */
export const CONTEXT_SCHEMA_VERSION = '1.0' as const;

/**
 * Persistent state for inter-prompt communication in ARTK E2E suites.
 * Stored in artk-e2e/.artk/context.json and committed to version control.
 *
 * @example
 * ```typescript
 * const context: ArtkContext = {
 *   version: '1.0',
 *   initialized_at: '2024-01-15T10:30:00Z',
 *   project: {
 *     name: 'my-monorepo',
 *     root: '..'
 *   },
 *   targets: [
 *     {
 *       name: 'user-portal',
 *       path: '../iss-frontend',
 *       type: 'react-spa',
 *       detected_by: ['package.json:react']
 *     }
 *   ],
 *   install: {
 *     artk_core_version: '1.0.0',
 *     playwright_version: '1.57.0',
 *     script_path: '/path/to/install-to-project.sh'
 *   }
 * };
 * ```
 */
export interface ArtkContext {
  /**
   * Schema version for migration support.
   * Always '1.0' for this version.
   */
  version: typeof CONTEXT_SCHEMA_VERSION;

  /**
   * ISO8601 timestamp when this context was created.
   */
  initialized_at: string;

  /**
   * Project metadata.
   */
  project: {
    /**
     * Human-readable project name.
     */
    name: string;

    /**
     * Relative path to project root from artk-e2e/.
     * Typically '..' for standard setup.
     */
    root: string;
  };

  /**
   * Configured frontend targets.
   * Must have 1-5 elements.
   */
  targets: ArtkTarget[];

  /**
   * Installation metadata.
   */
  install: {
    /**
     * Semantic version of @artk/core.
     * @pattern ^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$
     */
    artk_core_version: string;

    /**
     * Semantic version of @playwright/test.
     * @pattern ^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$
     */
    playwright_version: string;

    /**
     * Path to the install script used.
     */
    script_path: string;
  };
}

/**
 * Type guard to check if a value is a valid ArtkContext.
 */
export function isArtkContext(value: unknown): value is ArtkContext {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;

  // Check version
  if (obj.version !== CONTEXT_SCHEMA_VERSION) return false;

  // Check initialized_at
  if (typeof obj.initialized_at !== 'string') return false;

  // Check project
  if (typeof obj.project !== 'object' || obj.project === null) return false;
  const project = obj.project as Record<string, unknown>;
  if (typeof project.name !== 'string') return false;
  if (typeof project.root !== 'string') return false;

  // Check targets (basic check, detailed validation elsewhere)
  if (!Array.isArray(obj.targets)) return false;
  if (obj.targets.length < 1 || obj.targets.length > 5) return false;

  // Check install
  if (typeof obj.install !== 'object' || obj.install === null) return false;
  const install = obj.install as Record<string, unknown>;
  if (typeof install.artk_core_version !== 'string') return false;
  if (typeof install.playwright_version !== 'string') return false;
  if (typeof install.script_path !== 'string') return false;

  return true;
}

/**
 * Maximum number of targets allowed.
 */
export const MAX_TARGETS = 5;

/**
 * Minimum number of targets required.
 */
export const MIN_TARGETS = 1;

// =============================================================================
// Pilot-Specific Extensions (per 003-artk-pilot-launch/data-model.md)
// =============================================================================

/**
 * Pilot workflow phase tracking.
 */
export type PilotPhase =
  | 'discovery'
  | 'propose'
  | 'define'
  | 'implement'
  | 'validate'
  | 'verify';

/**
 * Pilot-specific context extensions.
 */
export interface PilotContext {
  /**
   * Pilot project identifier.
   */
  project: 'itss' | string;

  /**
   * Current phase in the pilot workflow.
   */
  phase: PilotPhase;

  /**
   * Last executed command.
   */
  lastCommand: string;

  /**
   * Timestamp of last command execution.
   */
  lastCommandAt: string;
}

/**
 * Detected target with confidence information.
 */
export interface DetectedTarget {
  /**
   * Target name.
   */
  name: string;

  /**
   * Path to the frontend directory.
   */
  path: string;

  /**
   * Detected application type.
   */
  type: 'react-spa' | 'vue-spa' | 'angular' | 'next' | 'nuxt' | 'other';

  /**
   * Detection confidence level.
   */
  confidence: 'high' | 'medium' | 'low';

  /**
   * Detection signals that matched.
   */
  signals: string[];
}

/**
 * Discovery results context.
 */
export interface DiscoveryContext {
  /**
   * Discovered routes.
   */
  routes: Array<{
    path: string;
    name: string;
    authRequired: boolean;
    roles?: string[];
  }>;

  /**
   * Discovered components.
   */
  components: Array<{
    name: string;
    path: string;
    type: 'page' | 'layout' | 'form' | 'table' | 'modal';
  }>;
}

/**
 * Journey tracking statistics.
 */
export interface JourneyStats {
  proposed: number;
  defined: number;
  implemented: number;
  verified: number;
}

/**
 * Extended ARTK Context with pilot-specific fields.
 * This extends the base ArtkContext for pilot projects.
 */
export interface ArtkContextExtended extends ArtkContext {
  /**
   * Pilot-specific context (optional).
   */
  pilot?: PilotContext;

  /**
   * Detected targets with confidence information.
   */
  detectedTargets?: DetectedTarget[];

  /**
   * Discovery results (from /discover).
   */
  discovery?: DiscoveryContext;

  /**
   * Journey statistics.
   */
  journeys?: JourneyStats;
}

// =============================================================================
// Zod Schemas for Validation
// =============================================================================

/**
 * Zod schema for ArtkTarget.
 */
export const ArtkTargetSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9-]*$/),
  path: z.string(),
  type: z.enum(['react-spa', 'vue-spa', 'angular', 'next', 'nuxt', 'other']),
  detected_by: z.array(z.string()),
  description: z.string().optional(),
});

/**
 * Zod schema for PilotContext.
 */
export const PilotContextSchema = z.object({
  project: z.string(),
  phase: z.enum([
    'discovery',
    'propose',
    'define',
    'implement',
    'validate',
    'verify',
  ]),
  lastCommand: z.string(),
  lastCommandAt: z.string(),
});

/**
 * Zod schema for DetectedTarget.
 */
export const DetectedTargetSchema = z.object({
  name: z.string(),
  path: z.string(),
  type: z.enum(['react-spa', 'vue-spa', 'angular', 'next', 'nuxt', 'other']),
  confidence: z.enum(['high', 'medium', 'low']),
  signals: z.array(z.string()),
});

/**
 * Zod schema for DiscoveryContext.
 */
export const DiscoveryContextSchema = z.object({
  routes: z.array(
    z.object({
      path: z.string(),
      name: z.string(),
      authRequired: z.boolean(),
      roles: z.array(z.string()).optional(),
    })
  ),
  components: z.array(
    z.object({
      name: z.string(),
      path: z.string(),
      type: z.enum(['page', 'layout', 'form', 'table', 'modal']),
    })
  ),
});

/**
 * Zod schema for JourneyStats.
 */
export const JourneyStatsSchema = z.object({
  proposed: z.number().int().min(0),
  defined: z.number().int().min(0),
  implemented: z.number().int().min(0),
  verified: z.number().int().min(0),
});

/**
 * Zod schema for base ArtkContext.
 */
export const ArtkContextSchema = z.object({
  version: z.literal(CONTEXT_SCHEMA_VERSION),
  initialized_at: z.string(),
  project: z.object({
    name: z.string(),
    root: z.string(),
  }),
  targets: z.array(ArtkTargetSchema).min(1).max(5),
  install: z.object({
    artk_core_version: z.string(),
    playwright_version: z.string(),
    script_path: z.string(),
  }),
});

/**
 * Zod schema for extended ArtkContext with pilot fields.
 */
export const ArtkContextExtendedSchema = ArtkContextSchema.extend({
  pilot: PilotContextSchema.optional(),
  detectedTargets: z.array(DetectedTargetSchema).optional(),
  discovery: DiscoveryContextSchema.optional(),
  journeys: JourneyStatsSchema.optional(),
});

/**
 * Validates an ArtkContext object using Zod.
 */
export function validateArtkContext(
  value: unknown
): { success: true; data: ArtkContext } | { success: false; error: z.ZodError } {
  const result = ArtkContextSchema.safeParse(value);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Validates an extended ArtkContext object using Zod.
 */
export function validateArtkContextExtended(
  value: unknown
): { success: true; data: ArtkContextExtended } | { success: false; error: z.ZodError } {
  const result = ArtkContextExtendedSchema.safeParse(value);
  if (result.success) {
    return { success: true, data: result.data as ArtkContextExtended };
  }
  return { success: false, error: result.error };
}
