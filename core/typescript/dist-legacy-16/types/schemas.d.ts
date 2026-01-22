/**
 * @module types/schemas
 * @description Zod validation schemas for ARTK E2E independent architecture.
 * Provides runtime type checking and validation for ArtkContext and ArtkConfig.
 */
import { z } from 'zod';
/** Target type schema */
export declare const ArtkTargetTypeSchema: z.ZodEnum<["react-spa", "vue-spa", "angular", "next", "nuxt", "other"]>;
/**
 * Schema for ArtkTarget (used in ArtkContext).
 */
export declare const ArtkTargetSchema: z.ZodObject<{
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
 * Schema for ArtkContext stored in .artk/context.json.
 * Used for inter-prompt communication.
 */
export declare const ArtkContextSchema: z.ZodEffects<z.ZodObject<{
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
}>, {
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
}>;
/** Auth provider type schema */
export declare const ArtkAuthProviderSchema: z.ZodEnum<["oidc", "saml", "basic", "custom"]>;
/** Identity provider type schema */
export declare const ArtkIdpTypeSchema: z.ZodEnum<["keycloak", "auth0", "okta", "azure-ad", "other"]>;
/** Credentials environment schema */
export declare const ArtkCredentialsEnvSchema: z.ZodObject<{
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
export declare const ArtkRoleSchema: z.ZodObject<{
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
export declare const ArtkAuthEnvironmentUrlsSchema: z.ZodObject<{
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
export declare const ArtkAuthConfigSchema: z.ZodObject<{
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
    environments: Record<string, {
        loginUrl: string;
        logoutUrl?: string | undefined;
    }>;
    provider: "oidc" | "custom" | "saml" | "basic";
    roles: Record<string, {
        credentialsEnv: {
            username: string;
            password: string;
        };
        totpSecretEnv?: string | undefined;
        storageState?: Record<string, string> | undefined;
    }>;
    storageStateDir: string;
    idpType?: "keycloak" | "azure-ad" | "okta" | "auth0" | "other" | undefined;
}, {
    environments: Record<string, {
        loginUrl: string;
        logoutUrl?: string | undefined;
    }>;
    provider: "oidc" | "custom" | "saml" | "basic";
    roles: Record<string, {
        credentialsEnv: {
            username: string;
            password: string;
        };
        totpSecretEnv?: string | undefined;
        storageState?: Record<string, string> | undefined;
    }>;
    idpType?: "keycloak" | "azure-ad" | "okta" | "auth0" | "other" | undefined;
    storageStateDir?: string | undefined;
}>;
/** Environment URLs schema */
export declare const ArtkEnvironmentUrlsSchema: z.ZodObject<{
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
export declare const ArtkConfigTargetSchema: z.ZodObject<{
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
    type: "react-spa" | "vue-spa" | "angular" | "next" | "nuxt" | "other";
    path: string;
    environments: Record<string, {
        baseUrl: string;
        apiUrl?: string | undefined;
    }>;
    description?: string | undefined;
}, {
    name: string;
    type: "react-spa" | "vue-spa" | "angular" | "next" | "nuxt" | "other";
    path: string;
    environments: Record<string, {
        baseUrl: string;
        apiUrl?: string | undefined;
    }>;
    description?: string | undefined;
}>;
/** Browser type schema */
export declare const ArtkBrowserTypeSchema: z.ZodEnum<["chromium", "firefox", "webkit"]>;
/** Browser configuration schema */
export declare const ArtkBrowserConfigSchema: z.ZodObject<{
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
export declare const ArtkTimeoutConfigSchema: z.ZodObject<{
    /** Default timeout for operations (ms) */
    default: z.ZodDefault<z.ZodNumber>;
    /** Navigation timeout (ms) */
    navigation: z.ZodDefault<z.ZodNumber>;
    /** Authentication timeout (ms) */
    auth: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    navigation: number;
    auth: number;
    default: number;
}, {
    navigation?: number | undefined;
    auth?: number | undefined;
    default?: number | undefined;
}>;
/**
 * Schema for ArtkConfig stored in artk.config.yml.
 * Main configuration file for ARTK E2E suite.
 */
export declare const ArtkConfigSchema: z.ZodEffects<z.ZodObject<{
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
        type: "react-spa" | "vue-spa" | "angular" | "next" | "nuxt" | "other";
        path: string;
        environments: Record<string, {
            baseUrl: string;
            apiUrl?: string | undefined;
        }>;
        description?: string | undefined;
    }, {
        name: string;
        type: "react-spa" | "vue-spa" | "angular" | "next" | "nuxt" | "other";
        path: string;
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
        environment: string;
        target: string;
    }, {
        environment: string;
        target: string;
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
        environments: Record<string, {
            loginUrl: string;
            logoutUrl?: string | undefined;
        }>;
        provider: "oidc" | "custom" | "saml" | "basic";
        roles: Record<string, {
            credentialsEnv: {
                username: string;
                password: string;
            };
            totpSecretEnv?: string | undefined;
            storageState?: Record<string, string> | undefined;
        }>;
        storageStateDir: string;
        idpType?: "keycloak" | "azure-ad" | "okta" | "auth0" | "other" | undefined;
    }, {
        environments: Record<string, {
            loginUrl: string;
            logoutUrl?: string | undefined;
        }>;
        provider: "oidc" | "custom" | "saml" | "basic";
        roles: Record<string, {
            credentialsEnv: {
                username: string;
                password: string;
            };
            totpSecretEnv?: string | undefined;
            storageState?: Record<string, string> | undefined;
        }>;
        idpType?: "keycloak" | "azure-ad" | "okta" | "auth0" | "other" | undefined;
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
        navigation: number;
        auth: number;
        default: number;
    }, {
        navigation?: number | undefined;
        auth?: number | undefined;
        default?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    targets: {
        name: string;
        type: "react-spa" | "vue-spa" | "angular" | "next" | "nuxt" | "other";
        path: string;
        environments: Record<string, {
            baseUrl: string;
            apiUrl?: string | undefined;
        }>;
        description?: string | undefined;
    }[];
    schemaVersion: "2.0";
    project: {
        name: string;
        description?: string | undefined;
    };
    defaults: {
        environment: string;
        target: string;
    };
    auth?: {
        environments: Record<string, {
            loginUrl: string;
            logoutUrl?: string | undefined;
        }>;
        provider: "oidc" | "custom" | "saml" | "basic";
        roles: Record<string, {
            credentialsEnv: {
                username: string;
                password: string;
            };
            totpSecretEnv?: string | undefined;
            storageState?: Record<string, string> | undefined;
        }>;
        storageStateDir: string;
        idpType?: "keycloak" | "azure-ad" | "okta" | "auth0" | "other" | undefined;
    } | undefined;
    timeouts?: {
        navigation: number;
        auth: number;
        default: number;
    } | undefined;
    browsers?: {
        enabled: ("chromium" | "firefox" | "webkit")[];
        headless: boolean;
    } | undefined;
}, {
    targets: {
        name: string;
        type: "react-spa" | "vue-spa" | "angular" | "next" | "nuxt" | "other";
        path: string;
        environments: Record<string, {
            baseUrl: string;
            apiUrl?: string | undefined;
        }>;
        description?: string | undefined;
    }[];
    schemaVersion: "2.0";
    project: {
        name: string;
        description?: string | undefined;
    };
    defaults: {
        environment: string;
        target: string;
    };
    auth?: {
        environments: Record<string, {
            loginUrl: string;
            logoutUrl?: string | undefined;
        }>;
        provider: "oidc" | "custom" | "saml" | "basic";
        roles: Record<string, {
            credentialsEnv: {
                username: string;
                password: string;
            };
            totpSecretEnv?: string | undefined;
            storageState?: Record<string, string> | undefined;
        }>;
        idpType?: "keycloak" | "azure-ad" | "okta" | "auth0" | "other" | undefined;
        storageStateDir?: string | undefined;
    } | undefined;
    timeouts?: {
        navigation?: number | undefined;
        auth?: number | undefined;
        default?: number | undefined;
    } | undefined;
    browsers?: {
        enabled?: ("chromium" | "firefox" | "webkit")[] | undefined;
        headless?: boolean | undefined;
    } | undefined;
}>, {
    targets: {
        name: string;
        type: "react-spa" | "vue-spa" | "angular" | "next" | "nuxt" | "other";
        path: string;
        environments: Record<string, {
            baseUrl: string;
            apiUrl?: string | undefined;
        }>;
        description?: string | undefined;
    }[];
    schemaVersion: "2.0";
    project: {
        name: string;
        description?: string | undefined;
    };
    defaults: {
        environment: string;
        target: string;
    };
    auth?: {
        environments: Record<string, {
            loginUrl: string;
            logoutUrl?: string | undefined;
        }>;
        provider: "oidc" | "custom" | "saml" | "basic";
        roles: Record<string, {
            credentialsEnv: {
                username: string;
                password: string;
            };
            totpSecretEnv?: string | undefined;
            storageState?: Record<string, string> | undefined;
        }>;
        storageStateDir: string;
        idpType?: "keycloak" | "azure-ad" | "okta" | "auth0" | "other" | undefined;
    } | undefined;
    timeouts?: {
        navigation: number;
        auth: number;
        default: number;
    } | undefined;
    browsers?: {
        enabled: ("chromium" | "firefox" | "webkit")[];
        headless: boolean;
    } | undefined;
}, {
    targets: {
        name: string;
        type: "react-spa" | "vue-spa" | "angular" | "next" | "nuxt" | "other";
        path: string;
        environments: Record<string, {
            baseUrl: string;
            apiUrl?: string | undefined;
        }>;
        description?: string | undefined;
    }[];
    schemaVersion: "2.0";
    project: {
        name: string;
        description?: string | undefined;
    };
    defaults: {
        environment: string;
        target: string;
    };
    auth?: {
        environments: Record<string, {
            loginUrl: string;
            logoutUrl?: string | undefined;
        }>;
        provider: "oidc" | "custom" | "saml" | "basic";
        roles: Record<string, {
            credentialsEnv: {
                username: string;
                password: string;
            };
            totpSecretEnv?: string | undefined;
            storageState?: Record<string, string> | undefined;
        }>;
        idpType?: "keycloak" | "azure-ad" | "okta" | "auth0" | "other" | undefined;
        storageStateDir?: string | undefined;
    } | undefined;
    timeouts?: {
        navigation?: number | undefined;
        auth?: number | undefined;
        default?: number | undefined;
    } | undefined;
    browsers?: {
        enabled?: ("chromium" | "firefox" | "webkit")[] | undefined;
        headless?: boolean | undefined;
    } | undefined;
}>;
/** Confidence level schema */
export declare const ArtkConfidenceLevelSchema: z.ZodEnum<["high", "medium", "low"]>;
/** Detection signal schema */
export declare const DetectionSignalSchema: z.ZodObject<{
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
export declare const DetectionResultSchema: z.ZodObject<{
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
    type: "react-spa" | "vue-spa" | "angular" | "next" | "nuxt" | "other";
    path: string;
    relativePath: string;
    confidence: "high" | "medium" | "low";
    signals: string[];
    score: number;
    detailedSignals?: {
        type: "package-dependency" | "entry-file" | "directory-name" | "index-html" | "config-file";
        source: string;
        weight: number;
        description?: string | undefined;
    }[] | undefined;
}, {
    type: "react-spa" | "vue-spa" | "angular" | "next" | "nuxt" | "other";
    path: string;
    relativePath: string;
    confidence: "high" | "medium" | "low";
    signals: string[];
    score: number;
    detailedSignals?: {
        type: "package-dependency" | "entry-file" | "directory-name" | "index-html" | "config-file";
        source: string;
        weight: number;
        description?: string | undefined;
    }[] | undefined;
}>;
/** Submodule status schema */
export declare const SubmoduleStatusSchema: z.ZodObject<{
    path: z.ZodString;
    initialized: z.ZodBoolean;
    commit: z.ZodOptional<z.ZodString>;
    url: z.ZodOptional<z.ZodString>;
    warning: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    path: string;
    initialized: boolean;
    url?: string | undefined;
    commit?: string | undefined;
    warning?: string | undefined;
}, {
    path: string;
    initialized: boolean;
    url?: string | undefined;
    commit?: string | undefined;
    warning?: string | undefined;
}>;
/** Submodule scan result schema */
export declare const SubmoduleScanResultSchema: z.ZodObject<{
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
        url?: string | undefined;
        commit?: string | undefined;
        warning?: string | undefined;
    }, {
        path: string;
        initialized: boolean;
        url?: string | undefined;
        commit?: string | undefined;
        warning?: string | undefined;
    }>, "many">;
    warnings: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    submodules: {
        path: string;
        initialized: boolean;
        url?: string | undefined;
        commit?: string | undefined;
        warning?: string | undefined;
    }[];
    warnings: string[];
    hasSubmodules: boolean;
}, {
    submodules: {
        path: string;
        initialized: boolean;
        url?: string | undefined;
        commit?: string | undefined;
        warning?: string | undefined;
    }[];
    warnings: string[];
    hasSubmodules: boolean;
}>;
/** Inferred type from ArtkContextSchema */
export type ArtkContextInput = z.input<typeof ArtkContextSchema>;
/** Validated ArtkContext type */
export type ArtkContextOutput = z.output<typeof ArtkContextSchema>;
/** Inferred type from ArtkConfigSchema */
export type ArtkConfigInput = z.input<typeof ArtkConfigSchema>;
/** Validated ArtkConfig type */
export type ArtkConfigOutput = z.output<typeof ArtkConfigSchema>;
/** Inferred type from ArtkTargetSchema */
export type ArtkTargetInput = z.input<typeof ArtkTargetSchema>;
/** Validated ArtkTarget type */
export type ArtkTargetOutput = z.output<typeof ArtkTargetSchema>;
/**
 * Validates an ArtkContext object.
 * @returns Validated context or throws ZodError
 */
export declare function validateArtkContext(data: unknown): ArtkContextOutput;
/**
 * Safely validates an ArtkContext object.
 * @returns Result object with success/error
 */
export declare function safeValidateArtkContext(data: unknown): z.SafeParseReturnType<{
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
}>;
/**
 * Validates an ArtkConfig object.
 * @returns Validated config or throws ZodError
 */
export declare function validateArtkConfig(data: unknown): ArtkConfigOutput;
/**
 * Safely validates an ArtkConfig object.
 * @returns Result object with success/error
 */
export declare function safeValidateArtkConfig(data: unknown): z.SafeParseReturnType<{
    targets: {
        name: string;
        type: "react-spa" | "vue-spa" | "angular" | "next" | "nuxt" | "other";
        path: string;
        environments: Record<string, {
            baseUrl: string;
            apiUrl?: string | undefined;
        }>;
        description?: string | undefined;
    }[];
    schemaVersion: "2.0";
    project: {
        name: string;
        description?: string | undefined;
    };
    defaults: {
        environment: string;
        target: string;
    };
    auth?: {
        environments: Record<string, {
            loginUrl: string;
            logoutUrl?: string | undefined;
        }>;
        provider: "oidc" | "custom" | "saml" | "basic";
        roles: Record<string, {
            credentialsEnv: {
                username: string;
                password: string;
            };
            totpSecretEnv?: string | undefined;
            storageState?: Record<string, string> | undefined;
        }>;
        idpType?: "keycloak" | "azure-ad" | "okta" | "auth0" | "other" | undefined;
        storageStateDir?: string | undefined;
    } | undefined;
    timeouts?: {
        navigation?: number | undefined;
        auth?: number | undefined;
        default?: number | undefined;
    } | undefined;
    browsers?: {
        enabled?: ("chromium" | "firefox" | "webkit")[] | undefined;
        headless?: boolean | undefined;
    } | undefined;
}, {
    targets: {
        name: string;
        type: "react-spa" | "vue-spa" | "angular" | "next" | "nuxt" | "other";
        path: string;
        environments: Record<string, {
            baseUrl: string;
            apiUrl?: string | undefined;
        }>;
        description?: string | undefined;
    }[];
    schemaVersion: "2.0";
    project: {
        name: string;
        description?: string | undefined;
    };
    defaults: {
        environment: string;
        target: string;
    };
    auth?: {
        environments: Record<string, {
            loginUrl: string;
            logoutUrl?: string | undefined;
        }>;
        provider: "oidc" | "custom" | "saml" | "basic";
        roles: Record<string, {
            credentialsEnv: {
                username: string;
                password: string;
            };
            totpSecretEnv?: string | undefined;
            storageState?: Record<string, string> | undefined;
        }>;
        storageStateDir: string;
        idpType?: "keycloak" | "azure-ad" | "okta" | "auth0" | "other" | undefined;
    } | undefined;
    timeouts?: {
        navigation: number;
        auth: number;
        default: number;
    } | undefined;
    browsers?: {
        enabled: ("chromium" | "firefox" | "webkit")[];
        headless: boolean;
    } | undefined;
}>;
//# sourceMappingURL=schemas.d.ts.map