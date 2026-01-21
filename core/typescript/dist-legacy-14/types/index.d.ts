import { A as ArtkTarget } from '../target-BGR8NLDg.js';
export { a as ArtkTargetType, i as isArtkTarget, c as isValidRelativePath, b as isValidTargetName } from '../target-BGR8NLDg.js';
import { z } from 'zod';
export { m as ArtkAuthConfig, l as ArtkAuthEnvironmentUrls, g as ArtkAuthProvider, c as ArtkBrowserConfig, A as ArtkBrowserType, e as ArtkConfig, b as ArtkConfigTarget, j as ArtkCredentialsEnv, a as ArtkEnvironmentUrls, h as ArtkIdpType, k as ArtkRole, d as ArtkTimeoutConfig, C as CONFIG_SCHEMA_VERSION, D as DEFAULT_BROWSER_CONFIG, q as DEFAULT_STORAGE_STATE_DIR, f as DEFAULT_TIMEOUT_CONFIG, p as isArtkAuthConfig, i as isArtkConfig, n as isArtkRole, o as isValidEnvVarName } from '../config-DBfXL5iJ.js';
export { A as ArtkConfidenceLevel, d as ArtkDetectionSignalCategory, D as DetectionConfidence, a as DetectionMethod, b as DetectionOptions, f as DetectionResult, e as DetectionSignal, c as EnvDetectionResult, E as EnvironmentContext, M as ModuleSystem, N as NodeVersionParsed, h as SubmoduleScanResult, S as SubmoduleState, g as SubmoduleStatus, T as TemplateSource, l as createEmptySubmoduleScanResult, i as isDetectionResult, k as isSubmoduleScanResult, j as isSubmoduleStatus } from '../environment-context-BrLc0RJ2.js';
export { G as GenerationTransaction, R as RollbackResult, S as StrictnessLevel, c as ValidationIssue, f as ValidationOptions, e as ValidationResult, h as ValidationRule, g as ValidationRuleConfig, b as ValidationRuleId, d as ValidationRuleResult, V as ValidationSeverity, a as ValidationStatus } from '../validation-result-BgIGL_BW.js';

/**
 * @module types/context
 * @description Context type definitions for ARTK E2E independent architecture.
 * Defines the persistent state for inter-prompt communication.
 *
 * The context file (.artk/context.json) is created by /init and read by
 * subsequent commands (/discover, /journey-propose, etc.) to maintain
 * state across prompts.
 */

/**
 * Context schema version.
 * Update this when making breaking changes to the context schema.
 */
declare const CONTEXT_SCHEMA_VERSION: "1.0";
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
interface ArtkContext {
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
declare function isArtkContext(value: unknown): value is ArtkContext;
/**
 * Maximum number of targets allowed.
 */
declare const MAX_TARGETS = 5;
/**
 * Minimum number of targets required.
 */
declare const MIN_TARGETS = 1;
/**
 * Pilot workflow phase tracking.
 */
type PilotPhase = 'discovery' | 'propose' | 'define' | 'implement' | 'validate' | 'verify';
/**
 * Pilot-specific context extensions.
 */
interface PilotContext {
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
interface DetectedTarget {
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
interface DiscoveryContext {
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
interface JourneyStats {
    proposed: number;
    defined: number;
    implemented: number;
    verified: number;
}
/**
 * Extended ARTK Context with pilot-specific fields.
 * This extends the base ArtkContext for pilot projects.
 */
interface ArtkContextExtended extends ArtkContext {
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
 * Zod schema for PilotContext.
 */
declare const PilotContextSchema: z.ZodObject<{
    project: z.ZodString;
    phase: z.ZodEnum<["discovery", "propose", "define", "implement", "validate", "verify"]>;
    lastCommand: z.ZodString;
    lastCommandAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    project: string;
    phase: "discovery" | "propose" | "define" | "implement" | "validate" | "verify";
    lastCommand: string;
    lastCommandAt: string;
}, {
    project: string;
    phase: "discovery" | "propose" | "define" | "implement" | "validate" | "verify";
    lastCommand: string;
    lastCommandAt: string;
}>;
/**
 * Zod schema for DetectedTarget.
 */
declare const DetectedTargetSchema: z.ZodObject<{
    name: z.ZodString;
    path: z.ZodString;
    type: z.ZodEnum<["react-spa", "vue-spa", "angular", "next", "nuxt", "other"]>;
    confidence: z.ZodEnum<["high", "medium", "low"]>;
    signals: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    name: string;
    path: string;
    type: "react-spa" | "vue-spa" | "angular" | "next" | "nuxt" | "other";
    confidence: "high" | "medium" | "low";
    signals: string[];
}, {
    name: string;
    path: string;
    type: "react-spa" | "vue-spa" | "angular" | "next" | "nuxt" | "other";
    confidence: "high" | "medium" | "low";
    signals: string[];
}>;
/**
 * Zod schema for DiscoveryContext.
 */
declare const DiscoveryContextSchema: z.ZodObject<{
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
        path: string;
        type: "page" | "layout" | "form" | "table" | "modal";
    }, {
        name: string;
        path: string;
        type: "page" | "layout" | "form" | "table" | "modal";
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    routes: {
        name: string;
        path: string;
        authRequired: boolean;
        roles?: string[] | undefined;
    }[];
    components: {
        name: string;
        path: string;
        type: "page" | "layout" | "form" | "table" | "modal";
    }[];
}, {
    routes: {
        name: string;
        path: string;
        authRequired: boolean;
        roles?: string[] | undefined;
    }[];
    components: {
        name: string;
        path: string;
        type: "page" | "layout" | "form" | "table" | "modal";
    }[];
}>;
/**
 * Zod schema for JourneyStats.
 */
declare const JourneyStatsSchema: z.ZodObject<{
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
declare const ArtkContextExtendedSchema: z.ZodObject<{
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
        path: string;
        type: "react-spa" | "vue-spa" | "angular" | "next" | "nuxt" | "other";
        detected_by: string[];
        description?: string | undefined;
    }, {
        name: string;
        path: string;
        type: "react-spa" | "vue-spa" | "angular" | "next" | "nuxt" | "other";
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
        project: string;
        phase: "discovery" | "propose" | "define" | "implement" | "validate" | "verify";
        lastCommand: string;
        lastCommandAt: string;
    }, {
        project: string;
        phase: "discovery" | "propose" | "define" | "implement" | "validate" | "verify";
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
        path: string;
        type: "react-spa" | "vue-spa" | "angular" | "next" | "nuxt" | "other";
        confidence: "high" | "medium" | "low";
        signals: string[];
    }, {
        name: string;
        path: string;
        type: "react-spa" | "vue-spa" | "angular" | "next" | "nuxt" | "other";
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
            path: string;
            type: "page" | "layout" | "form" | "table" | "modal";
        }, {
            name: string;
            path: string;
            type: "page" | "layout" | "form" | "table" | "modal";
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        routes: {
            name: string;
            path: string;
            authRequired: boolean;
            roles?: string[] | undefined;
        }[];
        components: {
            name: string;
            path: string;
            type: "page" | "layout" | "form" | "table" | "modal";
        }[];
    }, {
        routes: {
            name: string;
            path: string;
            authRequired: boolean;
            roles?: string[] | undefined;
        }[];
        components: {
            name: string;
            path: string;
            type: "page" | "layout" | "form" | "table" | "modal";
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
    initialized_at: string;
    project: {
        name: string;
        root: string;
    };
    targets: {
        name: string;
        path: string;
        type: "react-spa" | "vue-spa" | "angular" | "next" | "nuxt" | "other";
        detected_by: string[];
        description?: string | undefined;
    }[];
    install: {
        artk_core_version: string;
        playwright_version: string;
        script_path: string;
    };
    discovery?: {
        routes: {
            name: string;
            path: string;
            authRequired: boolean;
            roles?: string[] | undefined;
        }[];
        components: {
            name: string;
            path: string;
            type: "page" | "layout" | "form" | "table" | "modal";
        }[];
    } | undefined;
    pilot?: {
        project: string;
        phase: "discovery" | "propose" | "define" | "implement" | "validate" | "verify";
        lastCommand: string;
        lastCommandAt: string;
    } | undefined;
    detectedTargets?: {
        name: string;
        path: string;
        type: "react-spa" | "vue-spa" | "angular" | "next" | "nuxt" | "other";
        confidence: "high" | "medium" | "low";
        signals: string[];
    }[] | undefined;
    journeys?: {
        proposed: number;
        defined: number;
        implemented: number;
        verified: number;
    } | undefined;
}, {
    version: "1.0";
    initialized_at: string;
    project: {
        name: string;
        root: string;
    };
    targets: {
        name: string;
        path: string;
        type: "react-spa" | "vue-spa" | "angular" | "next" | "nuxt" | "other";
        detected_by: string[];
        description?: string | undefined;
    }[];
    install: {
        artk_core_version: string;
        playwright_version: string;
        script_path: string;
    };
    discovery?: {
        routes: {
            name: string;
            path: string;
            authRequired: boolean;
            roles?: string[] | undefined;
        }[];
        components: {
            name: string;
            path: string;
            type: "page" | "layout" | "form" | "table" | "modal";
        }[];
    } | undefined;
    pilot?: {
        project: string;
        phase: "discovery" | "propose" | "define" | "implement" | "validate" | "verify";
        lastCommand: string;
        lastCommandAt: string;
    } | undefined;
    detectedTargets?: {
        name: string;
        path: string;
        type: "react-spa" | "vue-spa" | "angular" | "next" | "nuxt" | "other";
        confidence: "high" | "medium" | "low";
        signals: string[];
    }[] | undefined;
    journeys?: {
        proposed: number;
        defined: number;
        implemented: number;
        verified: number;
    } | undefined;
}>;
/**
 * Validates an extended ArtkContext object using Zod.
 */
declare function validateArtkContextExtended(value: unknown): {
    success: true;
    data: ArtkContextExtended;
} | {
    success: false;
    error: z.ZodError;
};

/**
 * @module types/schemas
 * @description Zod validation schemas for ARTK E2E independent architecture.
 * Provides runtime type checking and validation for ArtkContext and ArtkConfig.
 */

/** Target type schema */
declare const ArtkTargetTypeSchema: z.ZodEnum<["react-spa", "vue-spa", "angular", "next", "nuxt", "other"]>;
/**
 * Schema for ArtkTarget (used in ArtkContext).
 */
declare const ArtkTargetSchema: z.ZodObject<{
    /** Unique identifier, lowercase-kebab-case */
    name: z.ZodString;
    /** Relative path to frontend directory from artk-e2e/ */
    path: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
    /** Detected or specified application type */
    type: z.ZodEnum<["react-spa", "vue-spa", "angular", "next", "nuxt", "other"]>;
    /** Signals that identified this target during detection */
    detected_by: z.ZodArray<z.ZodString, "many">;
    /** Optional description */
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    path: string;
    type: "react-spa" | "vue-spa" | "angular" | "next" | "nuxt" | "other";
    detected_by: string[];
    description?: string | undefined;
}, {
    name: string;
    path: string;
    type: "react-spa" | "vue-spa" | "angular" | "next" | "nuxt" | "other";
    detected_by: string[];
    description?: string | undefined;
}>;
/**
 * Schema for ArtkContext stored in .artk/context.json.
 * Used for inter-prompt communication.
 */
declare const ArtkContextSchema: z.ZodEffects<z.ZodObject<{
    /** Schema version for migration support */
    version: z.ZodLiteral<"1.0">;
    /** When this context was created (ISO8601) */
    initialized_at: z.ZodString;
    /** Project metadata */
    project: z.ZodObject<{
        /** Human-readable project name */
        name: z.ZodString;
        /** Relative path to project root from artk-e2e/ */
        root: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        root: string;
    }, {
        name: string;
        root: string;
    }>;
    /** Configured frontend targets (1-5 max) */
    targets: z.ZodArray<z.ZodObject<{
        /** Unique identifier, lowercase-kebab-case */
        name: z.ZodString;
        /** Relative path to frontend directory from artk-e2e/ */
        path: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
        /** Detected or specified application type */
        type: z.ZodEnum<["react-spa", "vue-spa", "angular", "next", "nuxt", "other"]>;
        /** Signals that identified this target during detection */
        detected_by: z.ZodArray<z.ZodString, "many">;
        /** Optional description */
        description: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        path: string;
        type: "react-spa" | "vue-spa" | "angular" | "next" | "nuxt" | "other";
        detected_by: string[];
        description?: string | undefined;
    }, {
        name: string;
        path: string;
        type: "react-spa" | "vue-spa" | "angular" | "next" | "nuxt" | "other";
        detected_by: string[];
        description?: string | undefined;
    }>, "many">;
    /** Installation metadata */
    install: z.ZodObject<{
        /** Semantic version of @artk/core */
        artk_core_version: z.ZodString;
        /** Semantic version of @playwright/test */
        playwright_version: z.ZodString;
        /** Path to the install script used */
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
}, "strip", z.ZodTypeAny, {
    version: "1.0";
    initialized_at: string;
    project: {
        name: string;
        root: string;
    };
    targets: {
        name: string;
        path: string;
        type: "react-spa" | "vue-spa" | "angular" | "next" | "nuxt" | "other";
        detected_by: string[];
        description?: string | undefined;
    }[];
    install: {
        artk_core_version: string;
        playwright_version: string;
        script_path: string;
    };
}, {
    version: "1.0";
    initialized_at: string;
    project: {
        name: string;
        root: string;
    };
    targets: {
        name: string;
        path: string;
        type: "react-spa" | "vue-spa" | "angular" | "next" | "nuxt" | "other";
        detected_by: string[];
        description?: string | undefined;
    }[];
    install: {
        artk_core_version: string;
        playwright_version: string;
        script_path: string;
    };
}>, {
    version: "1.0";
    initialized_at: string;
    project: {
        name: string;
        root: string;
    };
    targets: {
        name: string;
        path: string;
        type: "react-spa" | "vue-spa" | "angular" | "next" | "nuxt" | "other";
        detected_by: string[];
        description?: string | undefined;
    }[];
    install: {
        artk_core_version: string;
        playwright_version: string;
        script_path: string;
    };
}, {
    version: "1.0";
    initialized_at: string;
    project: {
        name: string;
        root: string;
    };
    targets: {
        name: string;
        path: string;
        type: "react-spa" | "vue-spa" | "angular" | "next" | "nuxt" | "other";
        detected_by: string[];
        description?: string | undefined;
    }[];
    install: {
        artk_core_version: string;
        playwright_version: string;
        script_path: string;
    };
}>;
/** Auth provider type schema */
declare const ArtkAuthProviderSchema: z.ZodEnum<["oidc", "saml", "basic", "custom"]>;
/** Identity provider type schema */
declare const ArtkIdpTypeSchema: z.ZodEnum<["keycloak", "auth0", "okta", "azure-ad", "other"]>;
/** Credentials environment schema */
declare const ArtkCredentialsEnvSchema: z.ZodObject<{
    username: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    username: string;
    password: string;
}, {
    username: string;
    password: string;
}>;
/** Role configuration schema */
declare const ArtkRoleSchema: z.ZodObject<{
    /** Environment variable names for credentials */
    credentialsEnv: z.ZodObject<{
        username: z.ZodString;
        password: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        username: string;
        password: string;
    }, {
        username: string;
        password: string;
    }>;
    /** TOTP secret environment variable (if MFA enabled) */
    totpSecretEnv: z.ZodOptional<z.ZodString>;
    /** Per-target storage state path overrides */
    storageState: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>>>;
}, "strip", z.ZodTypeAny, {
    credentialsEnv: {
        username: string;
        password: string;
    };
    totpSecretEnv?: string | undefined;
    storageState?: Record<string, string> | undefined;
}, {
    credentialsEnv: {
        username: string;
        password: string;
    };
    totpSecretEnv?: string | undefined;
    storageState?: Record<string, string> | undefined;
}>;
/** Auth environment URLs schema */
declare const ArtkAuthEnvironmentUrlsSchema: z.ZodObject<{
    /** Login URL for this environment */
    loginUrl: z.ZodString;
    /** Optional logout URL for this environment */
    logoutUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    loginUrl: string;
    logoutUrl?: string | undefined;
}, {
    loginUrl: string;
    logoutUrl?: string | undefined;
}>;
/** Auth configuration schema */
declare const ArtkAuthConfigSchema: z.ZodObject<{
    /** Authentication provider type */
    provider: z.ZodEnum<["oidc", "saml", "basic", "custom"]>;
    /** Identity provider type (for OIDC provider) */
    idpType: z.ZodOptional<z.ZodEnum<["keycloak", "auth0", "okta", "azure-ad", "other"]>>;
    /** Directory for storage states (relative to artk-e2e/) */
    storageStateDir: z.ZodDefault<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>>;
    /** Per-environment authentication URLs */
    environments: z.ZodRecord<z.ZodString, z.ZodObject<{
        /** Login URL for this environment */
        loginUrl: z.ZodString;
        /** Optional logout URL for this environment */
        logoutUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        loginUrl: string;
        logoutUrl?: string | undefined;
    }, {
        loginUrl: string;
        logoutUrl?: string | undefined;
    }>>;
    /** Role definitions */
    roles: z.ZodEffects<z.ZodRecord<z.ZodString, z.ZodObject<{
        /** Environment variable names for credentials */
        credentialsEnv: z.ZodObject<{
            username: z.ZodString;
            password: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            username: string;
            password: string;
        }, {
            username: string;
            password: string;
        }>;
        /** TOTP secret environment variable (if MFA enabled) */
        totpSecretEnv: z.ZodOptional<z.ZodString>;
        /** Per-target storage state path overrides */
        storageState: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>>>;
    }, "strip", z.ZodTypeAny, {
        credentialsEnv: {
            username: string;
            password: string;
        };
        totpSecretEnv?: string | undefined;
        storageState?: Record<string, string> | undefined;
    }, {
        credentialsEnv: {
            username: string;
            password: string;
        };
        totpSecretEnv?: string | undefined;
        storageState?: Record<string, string> | undefined;
    }>>, Record<string, {
        credentialsEnv: {
            username: string;
            password: string;
        };
        totpSecretEnv?: string | undefined;
        storageState?: Record<string, string> | undefined;
    }>, Record<string, {
        credentialsEnv: {
            username: string;
            password: string;
        };
        totpSecretEnv?: string | undefined;
        storageState?: Record<string, string> | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    roles: Record<string, {
        credentialsEnv: {
            username: string;
            password: string;
        };
        totpSecretEnv?: string | undefined;
        storageState?: Record<string, string> | undefined;
    }>;
    provider: "custom" | "oidc" | "saml" | "basic";
    storageStateDir: string;
    environments: Record<string, {
        loginUrl: string;
        logoutUrl?: string | undefined;
    }>;
    idpType?: "other" | "keycloak" | "auth0" | "okta" | "azure-ad" | undefined;
}, {
    roles: Record<string, {
        credentialsEnv: {
            username: string;
            password: string;
        };
        totpSecretEnv?: string | undefined;
        storageState?: Record<string, string> | undefined;
    }>;
    provider: "custom" | "oidc" | "saml" | "basic";
    environments: Record<string, {
        loginUrl: string;
        logoutUrl?: string | undefined;
    }>;
    idpType?: "other" | "keycloak" | "auth0" | "okta" | "azure-ad" | undefined;
    storageStateDir?: string | undefined;
}>;
/** Environment URLs schema */
declare const ArtkEnvironmentUrlsSchema: z.ZodObject<{
    /** Base URL for the environment */
    baseUrl: z.ZodString;
    /** Optional API URL if different from baseUrl */
    apiUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    baseUrl: string;
    apiUrl?: string | undefined;
}, {
    baseUrl: string;
    apiUrl?: string | undefined;
}>;
/** Config target schema (extended from ArtkTarget) */
declare const ArtkConfigTargetSchema: z.ZodObject<{
    /** Unique identifier */
    name: z.ZodString;
    /** Relative path to frontend directory */
    path: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
    /** Application type */
    type: z.ZodEnum<["react-spa", "vue-spa", "angular", "next", "nuxt", "other"]>;
    /** Optional description */
    description: z.ZodOptional<z.ZodString>;
    /** Environment-specific URLs */
    environments: z.ZodEffects<z.ZodRecord<z.ZodString, z.ZodObject<{
        /** Base URL for the environment */
        baseUrl: z.ZodString;
        /** Optional API URL if different from baseUrl */
        apiUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        baseUrl: string;
        apiUrl?: string | undefined;
    }, {
        baseUrl: string;
        apiUrl?: string | undefined;
    }>>, Record<string, {
        baseUrl: string;
        apiUrl?: string | undefined;
    }>, Record<string, {
        baseUrl: string;
        apiUrl?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    path: string;
    type: "react-spa" | "vue-spa" | "angular" | "next" | "nuxt" | "other";
    environments: Record<string, {
        baseUrl: string;
        apiUrl?: string | undefined;
    }>;
    description?: string | undefined;
}, {
    name: string;
    path: string;
    type: "react-spa" | "vue-spa" | "angular" | "next" | "nuxt" | "other";
    environments: Record<string, {
        baseUrl: string;
        apiUrl?: string | undefined;
    }>;
    description?: string | undefined;
}>;
/** Browser type schema */
declare const ArtkBrowserTypeSchema: z.ZodEnum<["chromium", "firefox", "webkit"]>;
/** Browser configuration schema */
declare const ArtkBrowserConfigSchema: z.ZodObject<{
    /** Enabled browser types */
    enabled: z.ZodDefault<z.ZodArray<z.ZodEnum<["chromium", "firefox", "webkit"]>, "many">>;
    /** Whether to run in headless mode */
    headless: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    enabled: ("chromium" | "firefox" | "webkit")[];
    headless: boolean;
}, {
    enabled?: ("chromium" | "firefox" | "webkit")[] | undefined;
    headless?: boolean | undefined;
}>;
/** Timeout configuration schema */
declare const ArtkTimeoutConfigSchema: z.ZodObject<{
    /** Default timeout for operations (ms) */
    default: z.ZodDefault<z.ZodNumber>;
    /** Navigation timeout (ms) */
    navigation: z.ZodDefault<z.ZodNumber>;
    /** Authentication timeout (ms) */
    auth: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    default: number;
    navigation: number;
    auth: number;
}, {
    default?: number | undefined;
    navigation?: number | undefined;
    auth?: number | undefined;
}>;
/**
 * Schema for ArtkConfig stored in artk.config.yml.
 * Main configuration file for ARTK E2E suite.
 */
declare const ArtkConfigSchema: z.ZodEffects<z.ZodObject<{
    /** Schema version for backward compatibility */
    schemaVersion: z.ZodLiteral<"2.0">;
    /** Project metadata */
    project: z.ZodObject<{
        /** Project name */
        name: z.ZodString;
        /** Optional project description */
        description: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        description?: string | undefined;
    }, {
        name: string;
        description?: string | undefined;
    }>;
    /** Frontend targets with environment URLs */
    targets: z.ZodArray<z.ZodObject<{
        /** Unique identifier */
        name: z.ZodString;
        /** Relative path to frontend directory */
        path: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
        /** Application type */
        type: z.ZodEnum<["react-spa", "vue-spa", "angular", "next", "nuxt", "other"]>;
        /** Optional description */
        description: z.ZodOptional<z.ZodString>;
        /** Environment-specific URLs */
        environments: z.ZodEffects<z.ZodRecord<z.ZodString, z.ZodObject<{
            /** Base URL for the environment */
            baseUrl: z.ZodString;
            /** Optional API URL if different from baseUrl */
            apiUrl: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            baseUrl: string;
            apiUrl?: string | undefined;
        }, {
            baseUrl: string;
            apiUrl?: string | undefined;
        }>>, Record<string, {
            baseUrl: string;
            apiUrl?: string | undefined;
        }>, Record<string, {
            baseUrl: string;
            apiUrl?: string | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        path: string;
        type: "react-spa" | "vue-spa" | "angular" | "next" | "nuxt" | "other";
        environments: Record<string, {
            baseUrl: string;
            apiUrl?: string | undefined;
        }>;
        description?: string | undefined;
    }, {
        name: string;
        path: string;
        type: "react-spa" | "vue-spa" | "angular" | "next" | "nuxt" | "other";
        environments: Record<string, {
            baseUrl: string;
            apiUrl?: string | undefined;
        }>;
        description?: string | undefined;
    }>, "many">;
    /** Default settings */
    defaults: z.ZodObject<{
        /** Default target name (must match a targets[].name) */
        target: z.ZodString;
        /** Default environment name (must exist in all targets' environments) */
        environment: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        target: string;
        environment: string;
    }, {
        target: string;
        environment: string;
    }>;
    /** Optional authentication configuration */
    auth: z.ZodOptional<z.ZodObject<{
        /** Authentication provider type */
        provider: z.ZodEnum<["oidc", "saml", "basic", "custom"]>;
        /** Identity provider type (for OIDC provider) */
        idpType: z.ZodOptional<z.ZodEnum<["keycloak", "auth0", "okta", "azure-ad", "other"]>>;
        /** Directory for storage states (relative to artk-e2e/) */
        storageStateDir: z.ZodDefault<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>>;
        /** Per-environment authentication URLs */
        environments: z.ZodRecord<z.ZodString, z.ZodObject<{
            /** Login URL for this environment */
            loginUrl: z.ZodString;
            /** Optional logout URL for this environment */
            logoutUrl: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            loginUrl: string;
            logoutUrl?: string | undefined;
        }, {
            loginUrl: string;
            logoutUrl?: string | undefined;
        }>>;
        /** Role definitions */
        roles: z.ZodEffects<z.ZodRecord<z.ZodString, z.ZodObject<{
            /** Environment variable names for credentials */
            credentialsEnv: z.ZodObject<{
                username: z.ZodString;
                password: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                username: string;
                password: string;
            }, {
                username: string;
                password: string;
            }>;
            /** TOTP secret environment variable (if MFA enabled) */
            totpSecretEnv: z.ZodOptional<z.ZodString>;
            /** Per-target storage state path overrides */
            storageState: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>>>;
        }, "strip", z.ZodTypeAny, {
            credentialsEnv: {
                username: string;
                password: string;
            };
            totpSecretEnv?: string | undefined;
            storageState?: Record<string, string> | undefined;
        }, {
            credentialsEnv: {
                username: string;
                password: string;
            };
            totpSecretEnv?: string | undefined;
            storageState?: Record<string, string> | undefined;
        }>>, Record<string, {
            credentialsEnv: {
                username: string;
                password: string;
            };
            totpSecretEnv?: string | undefined;
            storageState?: Record<string, string> | undefined;
        }>, Record<string, {
            credentialsEnv: {
                username: string;
                password: string;
            };
            totpSecretEnv?: string | undefined;
            storageState?: Record<string, string> | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        roles: Record<string, {
            credentialsEnv: {
                username: string;
                password: string;
            };
            totpSecretEnv?: string | undefined;
            storageState?: Record<string, string> | undefined;
        }>;
        provider: "custom" | "oidc" | "saml" | "basic";
        storageStateDir: string;
        environments: Record<string, {
            loginUrl: string;
            logoutUrl?: string | undefined;
        }>;
        idpType?: "other" | "keycloak" | "auth0" | "okta" | "azure-ad" | undefined;
    }, {
        roles: Record<string, {
            credentialsEnv: {
                username: string;
                password: string;
            };
            totpSecretEnv?: string | undefined;
            storageState?: Record<string, string> | undefined;
        }>;
        provider: "custom" | "oidc" | "saml" | "basic";
        environments: Record<string, {
            loginUrl: string;
            logoutUrl?: string | undefined;
        }>;
        idpType?: "other" | "keycloak" | "auth0" | "okta" | "azure-ad" | undefined;
        storageStateDir?: string | undefined;
    }>>;
    /** Optional browser configuration */
    browsers: z.ZodOptional<z.ZodObject<{
        /** Enabled browser types */
        enabled: z.ZodDefault<z.ZodArray<z.ZodEnum<["chromium", "firefox", "webkit"]>, "many">>;
        /** Whether to run in headless mode */
        headless: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        enabled: ("chromium" | "firefox" | "webkit")[];
        headless: boolean;
    }, {
        enabled?: ("chromium" | "firefox" | "webkit")[] | undefined;
        headless?: boolean | undefined;
    }>>;
    /** Optional timeout configuration */
    timeouts: z.ZodOptional<z.ZodObject<{
        /** Default timeout for operations (ms) */
        default: z.ZodDefault<z.ZodNumber>;
        /** Navigation timeout (ms) */
        navigation: z.ZodDefault<z.ZodNumber>;
        /** Authentication timeout (ms) */
        auth: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        default: number;
        navigation: number;
        auth: number;
    }, {
        default?: number | undefined;
        navigation?: number | undefined;
        auth?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    project: {
        name: string;
        description?: string | undefined;
    };
    targets: {
        name: string;
        path: string;
        type: "react-spa" | "vue-spa" | "angular" | "next" | "nuxt" | "other";
        environments: Record<string, {
            baseUrl: string;
            apiUrl?: string | undefined;
        }>;
        description?: string | undefined;
    }[];
    schemaVersion: "2.0";
    defaults: {
        target: string;
        environment: string;
    };
    auth?: {
        roles: Record<string, {
            credentialsEnv: {
                username: string;
                password: string;
            };
            totpSecretEnv?: string | undefined;
            storageState?: Record<string, string> | undefined;
        }>;
        provider: "custom" | "oidc" | "saml" | "basic";
        storageStateDir: string;
        environments: Record<string, {
            loginUrl: string;
            logoutUrl?: string | undefined;
        }>;
        idpType?: "other" | "keycloak" | "auth0" | "okta" | "azure-ad" | undefined;
    } | undefined;
    browsers?: {
        enabled: ("chromium" | "firefox" | "webkit")[];
        headless: boolean;
    } | undefined;
    timeouts?: {
        default: number;
        navigation: number;
        auth: number;
    } | undefined;
}, {
    project: {
        name: string;
        description?: string | undefined;
    };
    targets: {
        name: string;
        path: string;
        type: "react-spa" | "vue-spa" | "angular" | "next" | "nuxt" | "other";
        environments: Record<string, {
            baseUrl: string;
            apiUrl?: string | undefined;
        }>;
        description?: string | undefined;
    }[];
    schemaVersion: "2.0";
    defaults: {
        target: string;
        environment: string;
    };
    auth?: {
        roles: Record<string, {
            credentialsEnv: {
                username: string;
                password: string;
            };
            totpSecretEnv?: string | undefined;
            storageState?: Record<string, string> | undefined;
        }>;
        provider: "custom" | "oidc" | "saml" | "basic";
        environments: Record<string, {
            loginUrl: string;
            logoutUrl?: string | undefined;
        }>;
        idpType?: "other" | "keycloak" | "auth0" | "okta" | "azure-ad" | undefined;
        storageStateDir?: string | undefined;
    } | undefined;
    browsers?: {
        enabled?: ("chromium" | "firefox" | "webkit")[] | undefined;
        headless?: boolean | undefined;
    } | undefined;
    timeouts?: {
        default?: number | undefined;
        navigation?: number | undefined;
        auth?: number | undefined;
    } | undefined;
}>, {
    project: {
        name: string;
        description?: string | undefined;
    };
    targets: {
        name: string;
        path: string;
        type: "react-spa" | "vue-spa" | "angular" | "next" | "nuxt" | "other";
        environments: Record<string, {
            baseUrl: string;
            apiUrl?: string | undefined;
        }>;
        description?: string | undefined;
    }[];
    schemaVersion: "2.0";
    defaults: {
        target: string;
        environment: string;
    };
    auth?: {
        roles: Record<string, {
            credentialsEnv: {
                username: string;
                password: string;
            };
            totpSecretEnv?: string | undefined;
            storageState?: Record<string, string> | undefined;
        }>;
        provider: "custom" | "oidc" | "saml" | "basic";
        storageStateDir: string;
        environments: Record<string, {
            loginUrl: string;
            logoutUrl?: string | undefined;
        }>;
        idpType?: "other" | "keycloak" | "auth0" | "okta" | "azure-ad" | undefined;
    } | undefined;
    browsers?: {
        enabled: ("chromium" | "firefox" | "webkit")[];
        headless: boolean;
    } | undefined;
    timeouts?: {
        default: number;
        navigation: number;
        auth: number;
    } | undefined;
}, {
    project: {
        name: string;
        description?: string | undefined;
    };
    targets: {
        name: string;
        path: string;
        type: "react-spa" | "vue-spa" | "angular" | "next" | "nuxt" | "other";
        environments: Record<string, {
            baseUrl: string;
            apiUrl?: string | undefined;
        }>;
        description?: string | undefined;
    }[];
    schemaVersion: "2.0";
    defaults: {
        target: string;
        environment: string;
    };
    auth?: {
        roles: Record<string, {
            credentialsEnv: {
                username: string;
                password: string;
            };
            totpSecretEnv?: string | undefined;
            storageState?: Record<string, string> | undefined;
        }>;
        provider: "custom" | "oidc" | "saml" | "basic";
        environments: Record<string, {
            loginUrl: string;
            logoutUrl?: string | undefined;
        }>;
        idpType?: "other" | "keycloak" | "auth0" | "okta" | "azure-ad" | undefined;
        storageStateDir?: string | undefined;
    } | undefined;
    browsers?: {
        enabled?: ("chromium" | "firefox" | "webkit")[] | undefined;
        headless?: boolean | undefined;
    } | undefined;
    timeouts?: {
        default?: number | undefined;
        navigation?: number | undefined;
        auth?: number | undefined;
    } | undefined;
}>;
/** Confidence level schema */
declare const ArtkConfidenceLevelSchema: z.ZodEnum<["high", "medium", "low"]>;
/** Detection signal schema */
declare const DetectionSignalSchema: z.ZodObject<{
    type: z.ZodEnum<["package-dependency", "entry-file", "directory-name", "index-html", "config-file"]>;
    source: z.ZodString;
    weight: z.ZodNumber;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "package-dependency" | "entry-file" | "directory-name" | "index-html" | "config-file";
    source: string;
    weight: number;
    description?: string | undefined;
}, {
    type: "package-dependency" | "entry-file" | "directory-name" | "index-html" | "config-file";
    source: string;
    weight: number;
    description?: string | undefined;
}>;
/** Detection result schema */
declare const DetectionResultSchema: z.ZodObject<{
    path: z.ZodString;
    relativePath: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
    confidence: z.ZodEnum<["high", "medium", "low"]>;
    type: z.ZodEnum<["react-spa", "vue-spa", "angular", "next", "nuxt", "other"]>;
    signals: z.ZodArray<z.ZodString, "many">;
    score: z.ZodNumber;
    detailedSignals: z.ZodOptional<z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<["package-dependency", "entry-file", "directory-name", "index-html", "config-file"]>;
        source: z.ZodString;
        weight: z.ZodNumber;
        description: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "package-dependency" | "entry-file" | "directory-name" | "index-html" | "config-file";
        source: string;
        weight: number;
        description?: string | undefined;
    }, {
        type: "package-dependency" | "entry-file" | "directory-name" | "index-html" | "config-file";
        source: string;
        weight: number;
        description?: string | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    path: string;
    type: "react-spa" | "vue-spa" | "angular" | "next" | "nuxt" | "other";
    confidence: "high" | "medium" | "low";
    signals: string[];
    relativePath: string;
    score: number;
    detailedSignals?: {
        type: "package-dependency" | "entry-file" | "directory-name" | "index-html" | "config-file";
        source: string;
        weight: number;
        description?: string | undefined;
    }[] | undefined;
}, {
    path: string;
    type: "react-spa" | "vue-spa" | "angular" | "next" | "nuxt" | "other";
    confidence: "high" | "medium" | "low";
    signals: string[];
    relativePath: string;
    score: number;
    detailedSignals?: {
        type: "package-dependency" | "entry-file" | "directory-name" | "index-html" | "config-file";
        source: string;
        weight: number;
        description?: string | undefined;
    }[] | undefined;
}>;
/** Submodule status schema */
declare const SubmoduleStatusSchema: z.ZodObject<{
    path: z.ZodString;
    initialized: z.ZodBoolean;
    commit: z.ZodOptional<z.ZodString>;
    url: z.ZodOptional<z.ZodString>;
    warning: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    path: string;
    initialized: boolean;
    commit?: string | undefined;
    url?: string | undefined;
    warning?: string | undefined;
}, {
    path: string;
    initialized: boolean;
    commit?: string | undefined;
    url?: string | undefined;
    warning?: string | undefined;
}>;
/** Submodule scan result schema */
declare const SubmoduleScanResultSchema: z.ZodObject<{
    hasSubmodules: z.ZodBoolean;
    submodules: z.ZodArray<z.ZodObject<{
        path: z.ZodString;
        initialized: z.ZodBoolean;
        commit: z.ZodOptional<z.ZodString>;
        url: z.ZodOptional<z.ZodString>;
        warning: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        path: string;
        initialized: boolean;
        commit?: string | undefined;
        url?: string | undefined;
        warning?: string | undefined;
    }, {
        path: string;
        initialized: boolean;
        commit?: string | undefined;
        url?: string | undefined;
        warning?: string | undefined;
    }>, "many">;
    warnings: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    submodules: {
        path: string;
        initialized: boolean;
        commit?: string | undefined;
        url?: string | undefined;
        warning?: string | undefined;
    }[];
    warnings: string[];
    hasSubmodules: boolean;
}, {
    submodules: {
        path: string;
        initialized: boolean;
        commit?: string | undefined;
        url?: string | undefined;
        warning?: string | undefined;
    }[];
    warnings: string[];
    hasSubmodules: boolean;
}>;
/** Inferred type from ArtkContextSchema */
type ArtkContextInput = z.input<typeof ArtkContextSchema>;
/** Validated ArtkContext type */
type ArtkContextOutput = z.output<typeof ArtkContextSchema>;
/** Inferred type from ArtkConfigSchema */
type ArtkConfigInput = z.input<typeof ArtkConfigSchema>;
/** Validated ArtkConfig type */
type ArtkConfigOutput = z.output<typeof ArtkConfigSchema>;
/** Inferred type from ArtkTargetSchema */
type ArtkTargetInput = z.input<typeof ArtkTargetSchema>;
/** Validated ArtkTarget type */
type ArtkTargetOutput = z.output<typeof ArtkTargetSchema>;
/**
 * Validates an ArtkContext object.
 * @returns Validated context or throws ZodError
 */
declare function validateArtkContext(data: unknown): ArtkContextOutput;
/**
 * Safely validates an ArtkContext object.
 * @returns Result object with success/error
 */
declare function safeValidateArtkContext(data: unknown): z.SafeParseReturnType<{
    version: "1.0";
    initialized_at: string;
    project: {
        name: string;
        root: string;
    };
    targets: {
        name: string;
        path: string;
        type: "react-spa" | "vue-spa" | "angular" | "next" | "nuxt" | "other";
        detected_by: string[];
        description?: string | undefined;
    }[];
    install: {
        artk_core_version: string;
        playwright_version: string;
        script_path: string;
    };
}, {
    version: "1.0";
    initialized_at: string;
    project: {
        name: string;
        root: string;
    };
    targets: {
        name: string;
        path: string;
        type: "react-spa" | "vue-spa" | "angular" | "next" | "nuxt" | "other";
        detected_by: string[];
        description?: string | undefined;
    }[];
    install: {
        artk_core_version: string;
        playwright_version: string;
        script_path: string;
    };
}>;
/**
 * Validates an ArtkConfig object.
 * @returns Validated config or throws ZodError
 */
declare function validateArtkConfig(data: unknown): ArtkConfigOutput;
/**
 * Safely validates an ArtkConfig object.
 * @returns Result object with success/error
 */
declare function safeValidateArtkConfig(data: unknown): z.SafeParseReturnType<{
    project: {
        name: string;
        description?: string | undefined;
    };
    targets: {
        name: string;
        path: string;
        type: "react-spa" | "vue-spa" | "angular" | "next" | "nuxt" | "other";
        environments: Record<string, {
            baseUrl: string;
            apiUrl?: string | undefined;
        }>;
        description?: string | undefined;
    }[];
    schemaVersion: "2.0";
    defaults: {
        target: string;
        environment: string;
    };
    auth?: {
        roles: Record<string, {
            credentialsEnv: {
                username: string;
                password: string;
            };
            totpSecretEnv?: string | undefined;
            storageState?: Record<string, string> | undefined;
        }>;
        provider: "custom" | "oidc" | "saml" | "basic";
        environments: Record<string, {
            loginUrl: string;
            logoutUrl?: string | undefined;
        }>;
        idpType?: "other" | "keycloak" | "auth0" | "okta" | "azure-ad" | undefined;
        storageStateDir?: string | undefined;
    } | undefined;
    browsers?: {
        enabled?: ("chromium" | "firefox" | "webkit")[] | undefined;
        headless?: boolean | undefined;
    } | undefined;
    timeouts?: {
        default?: number | undefined;
        navigation?: number | undefined;
        auth?: number | undefined;
    } | undefined;
}, {
    project: {
        name: string;
        description?: string | undefined;
    };
    targets: {
        name: string;
        path: string;
        type: "react-spa" | "vue-spa" | "angular" | "next" | "nuxt" | "other";
        environments: Record<string, {
            baseUrl: string;
            apiUrl?: string | undefined;
        }>;
        description?: string | undefined;
    }[];
    schemaVersion: "2.0";
    defaults: {
        target: string;
        environment: string;
    };
    auth?: {
        roles: Record<string, {
            credentialsEnv: {
                username: string;
                password: string;
            };
            totpSecretEnv?: string | undefined;
            storageState?: Record<string, string> | undefined;
        }>;
        provider: "custom" | "oidc" | "saml" | "basic";
        storageStateDir: string;
        environments: Record<string, {
            loginUrl: string;
            logoutUrl?: string | undefined;
        }>;
        idpType?: "other" | "keycloak" | "auth0" | "okta" | "azure-ad" | undefined;
    } | undefined;
    browsers?: {
        enabled: ("chromium" | "firefox" | "webkit")[];
        headless: boolean;
    } | undefined;
    timeouts?: {
        default: number;
        navigation: number;
        auth: number;
    } | undefined;
}>;

export { ArtkAuthConfigSchema, ArtkAuthEnvironmentUrlsSchema, ArtkAuthProviderSchema, ArtkBrowserConfigSchema, ArtkBrowserTypeSchema, ArtkConfidenceLevelSchema, type ArtkConfigInput, type ArtkConfigOutput, ArtkConfigSchema, ArtkConfigTargetSchema, type ArtkContext, type ArtkContextExtended, ArtkContextExtendedSchema, type ArtkContextInput, type ArtkContextOutput, ArtkContextSchema, ArtkCredentialsEnvSchema, ArtkEnvironmentUrlsSchema, ArtkIdpTypeSchema, ArtkRoleSchema, ArtkTarget, type ArtkTargetInput, type ArtkTargetOutput, ArtkTargetSchema, ArtkTargetTypeSchema, ArtkTimeoutConfigSchema, CONTEXT_SCHEMA_VERSION, type DetectedTarget, DetectedTargetSchema, DetectionResultSchema, DetectionSignalSchema, type DiscoveryContext, DiscoveryContextSchema, type JourneyStats, JourneyStatsSchema, MAX_TARGETS, MIN_TARGETS, type PilotContext, PilotContextSchema, type PilotPhase, SubmoduleScanResultSchema, SubmoduleStatusSchema, isArtkContext, safeValidateArtkConfig, safeValidateArtkContext, validateArtkConfig, validateArtkContext, validateArtkContextExtended };
