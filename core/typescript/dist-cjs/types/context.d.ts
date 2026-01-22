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
export declare const CONTEXT_SCHEMA_VERSION: "1.0";
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
export declare function isArtkContext(value: unknown): value is ArtkContext;
/**
 * Maximum number of targets allowed.
 */
export declare const MAX_TARGETS = 5;
/**
 * Minimum number of targets required.
 */
export declare const MIN_TARGETS = 1;
/**
 * Pilot workflow phase tracking.
 */
export type PilotPhase = 'discovery' | 'propose' | 'define' | 'implement' | 'validate' | 'verify';
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
/**
 * Zod schema for ArtkTarget.
 */
export declare const ArtkTargetSchema: z.ZodObject<{
    name: z.ZodString;
    path: z.ZodString;
    type: z.ZodEnum<["react-spa", "vue-spa", "angular", "next", "nuxt", "other"]>;
    detected_by: z.ZodArray<z.ZodString, "many">;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    type: "react-spa" | "vue-spa" | "angular" | "next" | "nuxt" | "other";
    path: string;
    detected_by: string[];
    description?: string | undefined;
}, {
    name: string;
    type: "react-spa" | "vue-spa" | "angular" | "next" | "nuxt" | "other";
    path: string;
    detected_by: string[];
    description?: string | undefined;
}>;
/**
 * Zod schema for PilotContext.
 */
export declare const PilotContextSchema: z.ZodObject<{
    project: z.ZodString;
    phase: z.ZodEnum<["discovery", "propose", "define", "implement", "validate", "verify"]>;
    lastCommand: z.ZodString;
    lastCommandAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    phase: "define" | "verify" | "discovery" | "propose" | "implement" | "validate";
    project: string;
    lastCommand: string;
    lastCommandAt: string;
}, {
    phase: "define" | "verify" | "discovery" | "propose" | "implement" | "validate";
    project: string;
    lastCommand: string;
    lastCommandAt: string;
}>;
/**
 * Zod schema for DetectedTarget.
 */
export declare const DetectedTargetSchema: z.ZodObject<{
    name: z.ZodString;
    path: z.ZodString;
    type: z.ZodEnum<["react-spa", "vue-spa", "angular", "next", "nuxt", "other"]>;
    confidence: z.ZodEnum<["high", "medium", "low"]>;
    signals: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    name: string;
    type: "react-spa" | "vue-spa" | "angular" | "next" | "nuxt" | "other";
    path: string;
    confidence: "high" | "medium" | "low";
    signals: string[];
}, {
    name: string;
    type: "react-spa" | "vue-spa" | "angular" | "next" | "nuxt" | "other";
    path: string;
    confidence: "high" | "medium" | "low";
    signals: string[];
}>;
/**
 * Zod schema for DiscoveryContext.
 */
export declare const DiscoveryContextSchema: z.ZodObject<{
    routes: z.ZodArray<z.ZodObject<{
        path: z.ZodString;
        name: z.ZodString;
        authRequired: z.ZodBoolean;
        roles: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        path: string;
        authRequired: boolean;
        roles?: string[] | undefined;
    }, {
        name: string;
        path: string;
        authRequired: boolean;
        roles?: string[] | undefined;
    }>, "many">;
    components: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        path: z.ZodString;
        type: z.ZodEnum<["page", "layout", "form", "table", "modal"]>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        type: "form" | "layout" | "page" | "table" | "modal";
        path: string;
    }, {
        name: string;
        type: "form" | "layout" | "page" | "table" | "modal";
        path: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    components: {
        name: string;
        type: "form" | "layout" | "page" | "table" | "modal";
        path: string;
    }[];
    routes: {
        name: string;
        path: string;
        authRequired: boolean;
        roles?: string[] | undefined;
    }[];
}, {
    components: {
        name: string;
        type: "form" | "layout" | "page" | "table" | "modal";
        path: string;
    }[];
    routes: {
        name: string;
        path: string;
        authRequired: boolean;
        roles?: string[] | undefined;
    }[];
}>;
/**
 * Zod schema for JourneyStats.
 */
export declare const JourneyStatsSchema: z.ZodObject<{
    proposed: z.ZodNumber;
    defined: z.ZodNumber;
    implemented: z.ZodNumber;
    verified: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    proposed: number;
    defined: number;
    implemented: number;
    verified: number;
}, {
    proposed: number;
    defined: number;
    implemented: number;
    verified: number;
}>;
/**
 * Zod schema for extended ArtkContext with pilot fields.
 */
export declare const ArtkContextExtendedSchema: z.ZodObject<{
    version: z.ZodLiteral<"1.0">;
    initialized_at: z.ZodString;
    project: z.ZodObject<{
        name: z.ZodString;
        root: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        root: string;
    }, {
        name: string;
        root: string;
    }>;
    targets: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        path: z.ZodString;
        type: z.ZodEnum<["react-spa", "vue-spa", "angular", "next", "nuxt", "other"]>;
        detected_by: z.ZodArray<z.ZodString, "many">;
        description: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        type: "react-spa" | "vue-spa" | "angular" | "next" | "nuxt" | "other";
        path: string;
        detected_by: string[];
        description?: string | undefined;
    }, {
        name: string;
        type: "react-spa" | "vue-spa" | "angular" | "next" | "nuxt" | "other";
        path: string;
        detected_by: string[];
        description?: string | undefined;
    }>, "many">;
    install: z.ZodObject<{
        artk_core_version: z.ZodString;
        playwright_version: z.ZodString;
        script_path: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        artk_core_version: string;
        playwright_version: string;
        script_path: string;
    }, {
        artk_core_version: string;
        playwright_version: string;
        script_path: string;
    }>;
} & {
    pilot: z.ZodOptional<z.ZodObject<{
        project: z.ZodString;
        phase: z.ZodEnum<["discovery", "propose", "define", "implement", "validate", "verify"]>;
        lastCommand: z.ZodString;
        lastCommandAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        phase: "define" | "verify" | "discovery" | "propose" | "implement" | "validate";
        project: string;
        lastCommand: string;
        lastCommandAt: string;
    }, {
        phase: "define" | "verify" | "discovery" | "propose" | "implement" | "validate";
        project: string;
        lastCommand: string;
        lastCommandAt: string;
    }>>;
    detectedTargets: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        path: z.ZodString;
        type: z.ZodEnum<["react-spa", "vue-spa", "angular", "next", "nuxt", "other"]>;
        confidence: z.ZodEnum<["high", "medium", "low"]>;
        signals: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        name: string;
        type: "react-spa" | "vue-spa" | "angular" | "next" | "nuxt" | "other";
        path: string;
        confidence: "high" | "medium" | "low";
        signals: string[];
    }, {
        name: string;
        type: "react-spa" | "vue-spa" | "angular" | "next" | "nuxt" | "other";
        path: string;
        confidence: "high" | "medium" | "low";
        signals: string[];
    }>, "many">>;
    discovery: z.ZodOptional<z.ZodObject<{
        routes: z.ZodArray<z.ZodObject<{
            path: z.ZodString;
            name: z.ZodString;
            authRequired: z.ZodBoolean;
            roles: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            path: string;
            authRequired: boolean;
            roles?: string[] | undefined;
        }, {
            name: string;
            path: string;
            authRequired: boolean;
            roles?: string[] | undefined;
        }>, "many">;
        components: z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            path: z.ZodString;
            type: z.ZodEnum<["page", "layout", "form", "table", "modal"]>;
        }, "strip", z.ZodTypeAny, {
            name: string;
            type: "form" | "layout" | "page" | "table" | "modal";
            path: string;
        }, {
            name: string;
            type: "form" | "layout" | "page" | "table" | "modal";
            path: string;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        components: {
            name: string;
            type: "form" | "layout" | "page" | "table" | "modal";
            path: string;
        }[];
        routes: {
            name: string;
            path: string;
            authRequired: boolean;
            roles?: string[] | undefined;
        }[];
    }, {
        components: {
            name: string;
            type: "form" | "layout" | "page" | "table" | "modal";
            path: string;
        }[];
        routes: {
            name: string;
            path: string;
            authRequired: boolean;
            roles?: string[] | undefined;
        }[];
    }>>;
    journeys: z.ZodOptional<z.ZodObject<{
        proposed: z.ZodNumber;
        defined: z.ZodNumber;
        implemented: z.ZodNumber;
        verified: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        proposed: number;
        defined: number;
        implemented: number;
        verified: number;
    }, {
        proposed: number;
        defined: number;
        implemented: number;
        verified: number;
    }>>;
}, "strip", z.ZodTypeAny, {
    version: "1.0";
    targets: {
        name: string;
        type: "react-spa" | "vue-spa" | "angular" | "next" | "nuxt" | "other";
        path: string;
        detected_by: string[];
        description?: string | undefined;
    }[];
    project: {
        name: string;
        root: string;
    };
    initialized_at: string;
    install: {
        artk_core_version: string;
        playwright_version: string;
        script_path: string;
    };
    journeys?: {
        proposed: number;
        defined: number;
        implemented: number;
        verified: number;
    } | undefined;
    discovery?: {
        components: {
            name: string;
            type: "form" | "layout" | "page" | "table" | "modal";
            path: string;
        }[];
        routes: {
            name: string;
            path: string;
            authRequired: boolean;
            roles?: string[] | undefined;
        }[];
    } | undefined;
    pilot?: {
        phase: "define" | "verify" | "discovery" | "propose" | "implement" | "validate";
        project: string;
        lastCommand: string;
        lastCommandAt: string;
    } | undefined;
    detectedTargets?: {
        name: string;
        type: "react-spa" | "vue-spa" | "angular" | "next" | "nuxt" | "other";
        path: string;
        confidence: "high" | "medium" | "low";
        signals: string[];
    }[] | undefined;
}, {
    version: "1.0";
    targets: {
        name: string;
        type: "react-spa" | "vue-spa" | "angular" | "next" | "nuxt" | "other";
        path: string;
        detected_by: string[];
        description?: string | undefined;
    }[];
    project: {
        name: string;
        root: string;
    };
    initialized_at: string;
    install: {
        artk_core_version: string;
        playwright_version: string;
        script_path: string;
    };
    journeys?: {
        proposed: number;
        defined: number;
        implemented: number;
        verified: number;
    } | undefined;
    discovery?: {
        components: {
            name: string;
            type: "form" | "layout" | "page" | "table" | "modal";
            path: string;
        }[];
        routes: {
            name: string;
            path: string;
            authRequired: boolean;
            roles?: string[] | undefined;
        }[];
    } | undefined;
    pilot?: {
        phase: "define" | "verify" | "discovery" | "propose" | "implement" | "validate";
        project: string;
        lastCommand: string;
        lastCommandAt: string;
    } | undefined;
    detectedTargets?: {
        name: string;
        type: "react-spa" | "vue-spa" | "angular" | "next" | "nuxt" | "other";
        path: string;
        confidence: "high" | "medium" | "low";
        signals: string[];
    }[] | undefined;
}>;
/**
 * Validates an ArtkContext object using Zod (internal version).
 * Note: This uses the base schema. For full validation with refinements,
 * use validateArtkContext from schemas.ts.
 */
export declare function validateArtkContext(value: unknown): {
    success: true;
    data: ArtkContext;
} | {
    success: false;
    error: z.ZodError;
};
/**
 * Validates an extended ArtkContext object using Zod.
 */
export declare function validateArtkContextExtended(value: unknown): {
    success: true;
    data: ArtkContextExtended;
} | {
    success: false;
    error: z.ZodError;
};
//# sourceMappingURL=context.d.ts.map