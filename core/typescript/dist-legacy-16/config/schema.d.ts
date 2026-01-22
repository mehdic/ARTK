/**
 * Zod validation schemas for ARTK configuration
 *
 * Provides runtime type checking and validation for configuration loaded
 * from artk.config.yml. All validation errors include field paths for
 * easy debugging (FR-002).
 *
 * @module config/schema
 */
import { z } from 'zod';
/**
 * Current configuration version
 *
 * Used for schema migration. When breaking changes are made to the config
 * schema, this version is incremented and a migration is added to migrate.ts.
 */
export declare const CURRENT_CONFIG_VERSION = 1;
/** Application configuration schema */
export declare const AppConfigSchema: z.ZodObject<{
    name: z.ZodString;
    baseUrl: z.ZodString;
    type: z.ZodDefault<z.ZodEnum<["spa", "ssr", "hybrid"]>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    baseUrl: string;
    type: "spa" | "ssr" | "hybrid";
}, {
    name: string;
    baseUrl: string;
    type?: "spa" | "ssr" | "hybrid" | undefined;
}>;
/** Environment configuration schema */
export declare const EnvironmentConfigSchema: z.ZodObject<{
    baseUrl: z.ZodString;
    apiUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    baseUrl: string;
    apiUrl?: string | undefined;
}, {
    baseUrl: string;
    apiUrl?: string | undefined;
}>;
/** Environments record schema */
export declare const EnvironmentsSchema: z.ZodRecord<z.ZodString, z.ZodObject<{
    baseUrl: z.ZodString;
    apiUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    baseUrl: string;
    apiUrl?: string | undefined;
}, {
    baseUrl: string;
    apiUrl?: string | undefined;
}>>;
/** Storage state configuration schema */
export declare const StorageStateConfigSchema: z.ZodObject<{
    directory: z.ZodDefault<z.ZodString>;
    maxAgeMinutes: z.ZodDefault<z.ZodNumber>;
    filePattern: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    directory: string;
    maxAgeMinutes: number;
    filePattern: string;
}, {
    directory?: string | undefined;
    maxAgeMinutes?: number | undefined;
    filePattern?: string | undefined;
}>;
/** Credentials environment variable schema */
export declare const CredentialsEnvConfigSchema: z.ZodObject<{
    username: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    username: string;
    password: string;
}, {
    username: string;
    password: string;
}>;
/** OIDC success configuration schema */
export declare const OIDCSuccessConfigSchema: z.ZodEffects<z.ZodObject<{
    url: z.ZodOptional<z.ZodString>;
    selector: z.ZodOptional<z.ZodString>;
    timeout: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    timeout: number;
    url?: string | undefined;
    selector?: string | undefined;
}, {
    url?: string | undefined;
    selector?: string | undefined;
    timeout?: number | undefined;
}>, {
    timeout: number;
    url?: string | undefined;
    selector?: string | undefined;
}, {
    url?: string | undefined;
    selector?: string | undefined;
    timeout?: number | undefined;
}>;
/** OIDC IdP selectors schema */
export declare const OIDCIdpSelectorsSchema: z.ZodOptional<z.ZodObject<{
    username: z.ZodOptional<z.ZodString>;
    password: z.ZodOptional<z.ZodString>;
    submit: z.ZodOptional<z.ZodString>;
    staySignedInNo: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    username?: string | undefined;
    password?: string | undefined;
    submit?: string | undefined;
    staySignedInNo?: string | undefined;
}, {
    username?: string | undefined;
    password?: string | undefined;
    submit?: string | undefined;
    staySignedInNo?: string | undefined;
}>>;
/** MFA configuration schema */
export declare const MFAConfigSchema: z.ZodOptional<z.ZodObject<{
    enabled: z.ZodDefault<z.ZodBoolean>;
    type: z.ZodDefault<z.ZodEnum<["totp", "push", "sms", "none"]>>;
    totpSecretEnv: z.ZodOptional<z.ZodString>;
    pushTimeoutMs: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    enabled: boolean;
    type: "none" | "totp" | "push" | "sms";
    pushTimeoutMs: number;
    totpSecretEnv?: string | undefined;
}, {
    enabled?: boolean | undefined;
    type?: "none" | "totp" | "push" | "sms" | undefined;
    totpSecretEnv?: string | undefined;
    pushTimeoutMs?: number | undefined;
}>>;
/** OIDC timeouts schema */
export declare const OIDCTimeoutsSchema: z.ZodOptional<z.ZodObject<{
    loginFlowMs: z.ZodDefault<z.ZodNumber>;
    idpRedirectMs: z.ZodDefault<z.ZodNumber>;
    callbackMs: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    loginFlowMs: number;
    idpRedirectMs: number;
    callbackMs: number;
}, {
    loginFlowMs?: number | undefined;
    idpRedirectMs?: number | undefined;
    callbackMs?: number | undefined;
}>>;
/** OIDC logout schema */
export declare const OIDCLogoutConfigSchema: z.ZodOptional<z.ZodObject<{
    url: z.ZodOptional<z.ZodString>;
    idpLogout: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    url?: string | undefined;
    idpLogout?: boolean | undefined;
}, {
    url?: string | undefined;
    idpLogout?: boolean | undefined;
}>>;
/** OIDC configuration schema */
export declare const OIDCConfigSchema: z.ZodOptional<z.ZodObject<{
    idpType: z.ZodEnum<["keycloak", "azure-ad", "okta", "auth0", "generic"]>;
    loginUrl: z.ZodString;
    idpLoginUrl: z.ZodOptional<z.ZodString>;
    success: z.ZodEffects<z.ZodObject<{
        url: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
        timeout: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        timeout: number;
        url?: string | undefined;
        selector?: string | undefined;
    }, {
        url?: string | undefined;
        selector?: string | undefined;
        timeout?: number | undefined;
    }>, {
        timeout: number;
        url?: string | undefined;
        selector?: string | undefined;
    }, {
        url?: string | undefined;
        selector?: string | undefined;
        timeout?: number | undefined;
    }>;
    idpSelectors: z.ZodOptional<z.ZodObject<{
        username: z.ZodOptional<z.ZodString>;
        password: z.ZodOptional<z.ZodString>;
        submit: z.ZodOptional<z.ZodString>;
        staySignedInNo: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        username?: string | undefined;
        password?: string | undefined;
        submit?: string | undefined;
        staySignedInNo?: string | undefined;
    }, {
        username?: string | undefined;
        password?: string | undefined;
        submit?: string | undefined;
        staySignedInNo?: string | undefined;
    }>>;
    mfa: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        type: z.ZodDefault<z.ZodEnum<["totp", "push", "sms", "none"]>>;
        totpSecretEnv: z.ZodOptional<z.ZodString>;
        pushTimeoutMs: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        type: "none" | "totp" | "push" | "sms";
        pushTimeoutMs: number;
        totpSecretEnv?: string | undefined;
    }, {
        enabled?: boolean | undefined;
        type?: "none" | "totp" | "push" | "sms" | undefined;
        totpSecretEnv?: string | undefined;
        pushTimeoutMs?: number | undefined;
    }>>;
    timeouts: z.ZodOptional<z.ZodObject<{
        loginFlowMs: z.ZodDefault<z.ZodNumber>;
        idpRedirectMs: z.ZodDefault<z.ZodNumber>;
        callbackMs: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        loginFlowMs: number;
        idpRedirectMs: number;
        callbackMs: number;
    }, {
        loginFlowMs?: number | undefined;
        idpRedirectMs?: number | undefined;
        callbackMs?: number | undefined;
    }>>;
    logout: z.ZodOptional<z.ZodObject<{
        url: z.ZodOptional<z.ZodString>;
        idpLogout: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        url?: string | undefined;
        idpLogout?: boolean | undefined;
    }, {
        url?: string | undefined;
        idpLogout?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
    loginUrl: string;
    success: {
        timeout: number;
        url?: string | undefined;
        selector?: string | undefined;
    };
    mfa?: {
        enabled: boolean;
        type: "none" | "totp" | "push" | "sms";
        pushTimeoutMs: number;
        totpSecretEnv?: string | undefined;
    } | undefined;
    idpLoginUrl?: string | undefined;
    idpSelectors?: {
        username?: string | undefined;
        password?: string | undefined;
        submit?: string | undefined;
        staySignedInNo?: string | undefined;
    } | undefined;
    timeouts?: {
        loginFlowMs: number;
        idpRedirectMs: number;
        callbackMs: number;
    } | undefined;
    logout?: {
        url?: string | undefined;
        idpLogout?: boolean | undefined;
    } | undefined;
}, {
    idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
    loginUrl: string;
    success: {
        url?: string | undefined;
        selector?: string | undefined;
        timeout?: number | undefined;
    };
    mfa?: {
        enabled?: boolean | undefined;
        type?: "none" | "totp" | "push" | "sms" | undefined;
        totpSecretEnv?: string | undefined;
        pushTimeoutMs?: number | undefined;
    } | undefined;
    idpLoginUrl?: string | undefined;
    idpSelectors?: {
        username?: string | undefined;
        password?: string | undefined;
        submit?: string | undefined;
        staySignedInNo?: string | undefined;
    } | undefined;
    timeouts?: {
        loginFlowMs?: number | undefined;
        idpRedirectMs?: number | undefined;
        callbackMs?: number | undefined;
    } | undefined;
    logout?: {
        url?: string | undefined;
        idpLogout?: boolean | undefined;
    } | undefined;
}>>;
/** Form auth selectors schema */
export declare const FormAuthSelectorsSchema: z.ZodObject<{
    username: z.ZodString;
    password: z.ZodString;
    submit: z.ZodString;
}, "strip", z.ZodTypeAny, {
    username: string;
    password: string;
    submit: string;
}, {
    username: string;
    password: string;
    submit: string;
}>;
/** Form auth success schema */
export declare const FormAuthSuccessConfigSchema: z.ZodObject<{
    url: z.ZodOptional<z.ZodString>;
    selector: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    url?: string | undefined;
    selector?: string | undefined;
}, {
    url?: string | undefined;
    selector?: string | undefined;
}>;
/** Form auth configuration schema */
export declare const FormAuthConfigSchema: z.ZodOptional<z.ZodObject<{
    loginUrl: z.ZodString;
    selectors: z.ZodObject<{
        username: z.ZodString;
        password: z.ZodString;
        submit: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        username: string;
        password: string;
        submit: string;
    }, {
        username: string;
        password: string;
        submit: string;
    }>;
    success: z.ZodObject<{
        url: z.ZodOptional<z.ZodString>;
        selector: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        url?: string | undefined;
        selector?: string | undefined;
    }, {
        url?: string | undefined;
        selector?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    loginUrl: string;
    success: {
        url?: string | undefined;
        selector?: string | undefined;
    };
    selectors: {
        username: string;
        password: string;
        submit: string;
    };
}, {
    loginUrl: string;
    success: {
        url?: string | undefined;
        selector?: string | undefined;
    };
    selectors: {
        username: string;
        password: string;
        submit: string;
    };
}>>;
/** Role configuration schema */
export declare const RoleConfigSchema: z.ZodObject<{
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
    description: z.ZodOptional<z.ZodString>;
    oidcOverrides: z.ZodOptional<z.ZodOptional<z.ZodObject<{
        idpType: z.ZodEnum<["keycloak", "azure-ad", "okta", "auth0", "generic"]>;
        loginUrl: z.ZodString;
        idpLoginUrl: z.ZodOptional<z.ZodString>;
        success: z.ZodEffects<z.ZodObject<{
            url: z.ZodOptional<z.ZodString>;
            selector: z.ZodOptional<z.ZodString>;
            timeout: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            timeout: number;
            url?: string | undefined;
            selector?: string | undefined;
        }, {
            url?: string | undefined;
            selector?: string | undefined;
            timeout?: number | undefined;
        }>, {
            timeout: number;
            url?: string | undefined;
            selector?: string | undefined;
        }, {
            url?: string | undefined;
            selector?: string | undefined;
            timeout?: number | undefined;
        }>;
        idpSelectors: z.ZodOptional<z.ZodObject<{
            username: z.ZodOptional<z.ZodString>;
            password: z.ZodOptional<z.ZodString>;
            submit: z.ZodOptional<z.ZodString>;
            staySignedInNo: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            username?: string | undefined;
            password?: string | undefined;
            submit?: string | undefined;
            staySignedInNo?: string | undefined;
        }, {
            username?: string | undefined;
            password?: string | undefined;
            submit?: string | undefined;
            staySignedInNo?: string | undefined;
        }>>;
        mfa: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            type: z.ZodDefault<z.ZodEnum<["totp", "push", "sms", "none"]>>;
            totpSecretEnv: z.ZodOptional<z.ZodString>;
            pushTimeoutMs: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            type: "none" | "totp" | "push" | "sms";
            pushTimeoutMs: number;
            totpSecretEnv?: string | undefined;
        }, {
            enabled?: boolean | undefined;
            type?: "none" | "totp" | "push" | "sms" | undefined;
            totpSecretEnv?: string | undefined;
            pushTimeoutMs?: number | undefined;
        }>>;
        timeouts: z.ZodOptional<z.ZodObject<{
            loginFlowMs: z.ZodDefault<z.ZodNumber>;
            idpRedirectMs: z.ZodDefault<z.ZodNumber>;
            callbackMs: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            loginFlowMs: number;
            idpRedirectMs: number;
            callbackMs: number;
        }, {
            loginFlowMs?: number | undefined;
            idpRedirectMs?: number | undefined;
            callbackMs?: number | undefined;
        }>>;
        logout: z.ZodOptional<z.ZodObject<{
            url: z.ZodOptional<z.ZodString>;
            idpLogout: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            url?: string | undefined;
            idpLogout?: boolean | undefined;
        }, {
            url?: string | undefined;
            idpLogout?: boolean | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
        loginUrl: string;
        success: {
            timeout: number;
            url?: string | undefined;
            selector?: string | undefined;
        };
        mfa?: {
            enabled: boolean;
            type: "none" | "totp" | "push" | "sms";
            pushTimeoutMs: number;
            totpSecretEnv?: string | undefined;
        } | undefined;
        idpLoginUrl?: string | undefined;
        idpSelectors?: {
            username?: string | undefined;
            password?: string | undefined;
            submit?: string | undefined;
            staySignedInNo?: string | undefined;
        } | undefined;
        timeouts?: {
            loginFlowMs: number;
            idpRedirectMs: number;
            callbackMs: number;
        } | undefined;
        logout?: {
            url?: string | undefined;
            idpLogout?: boolean | undefined;
        } | undefined;
    }, {
        idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
        loginUrl: string;
        success: {
            url?: string | undefined;
            selector?: string | undefined;
            timeout?: number | undefined;
        };
        mfa?: {
            enabled?: boolean | undefined;
            type?: "none" | "totp" | "push" | "sms" | undefined;
            totpSecretEnv?: string | undefined;
            pushTimeoutMs?: number | undefined;
        } | undefined;
        idpLoginUrl?: string | undefined;
        idpSelectors?: {
            username?: string | undefined;
            password?: string | undefined;
            submit?: string | undefined;
            staySignedInNo?: string | undefined;
        } | undefined;
        timeouts?: {
            loginFlowMs?: number | undefined;
            idpRedirectMs?: number | undefined;
            callbackMs?: number | undefined;
        } | undefined;
        logout?: {
            url?: string | undefined;
            idpLogout?: boolean | undefined;
        } | undefined;
    }>>>;
}, "strip", z.ZodTypeAny, {
    credentialsEnv: {
        username: string;
        password: string;
    };
    description?: string | undefined;
    oidcOverrides?: {
        idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
        loginUrl: string;
        success: {
            timeout: number;
            url?: string | undefined;
            selector?: string | undefined;
        };
        mfa?: {
            enabled: boolean;
            type: "none" | "totp" | "push" | "sms";
            pushTimeoutMs: number;
            totpSecretEnv?: string | undefined;
        } | undefined;
        idpLoginUrl?: string | undefined;
        idpSelectors?: {
            username?: string | undefined;
            password?: string | undefined;
            submit?: string | undefined;
            staySignedInNo?: string | undefined;
        } | undefined;
        timeouts?: {
            loginFlowMs: number;
            idpRedirectMs: number;
            callbackMs: number;
        } | undefined;
        logout?: {
            url?: string | undefined;
            idpLogout?: boolean | undefined;
        } | undefined;
    } | undefined;
}, {
    credentialsEnv: {
        username: string;
        password: string;
    };
    description?: string | undefined;
    oidcOverrides?: {
        idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
        loginUrl: string;
        success: {
            url?: string | undefined;
            selector?: string | undefined;
            timeout?: number | undefined;
        };
        mfa?: {
            enabled?: boolean | undefined;
            type?: "none" | "totp" | "push" | "sms" | undefined;
            totpSecretEnv?: string | undefined;
            pushTimeoutMs?: number | undefined;
        } | undefined;
        idpLoginUrl?: string | undefined;
        idpSelectors?: {
            username?: string | undefined;
            password?: string | undefined;
            submit?: string | undefined;
            staySignedInNo?: string | undefined;
        } | undefined;
        timeouts?: {
            loginFlowMs?: number | undefined;
            idpRedirectMs?: number | undefined;
            callbackMs?: number | undefined;
        } | undefined;
        logout?: {
            url?: string | undefined;
            idpLogout?: boolean | undefined;
        } | undefined;
    } | undefined;
}>;
/** Roles record schema */
export declare const RolesSchema: z.ZodRecord<z.ZodString, z.ZodObject<{
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
    description: z.ZodOptional<z.ZodString>;
    oidcOverrides: z.ZodOptional<z.ZodOptional<z.ZodObject<{
        idpType: z.ZodEnum<["keycloak", "azure-ad", "okta", "auth0", "generic"]>;
        loginUrl: z.ZodString;
        idpLoginUrl: z.ZodOptional<z.ZodString>;
        success: z.ZodEffects<z.ZodObject<{
            url: z.ZodOptional<z.ZodString>;
            selector: z.ZodOptional<z.ZodString>;
            timeout: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            timeout: number;
            url?: string | undefined;
            selector?: string | undefined;
        }, {
            url?: string | undefined;
            selector?: string | undefined;
            timeout?: number | undefined;
        }>, {
            timeout: number;
            url?: string | undefined;
            selector?: string | undefined;
        }, {
            url?: string | undefined;
            selector?: string | undefined;
            timeout?: number | undefined;
        }>;
        idpSelectors: z.ZodOptional<z.ZodObject<{
            username: z.ZodOptional<z.ZodString>;
            password: z.ZodOptional<z.ZodString>;
            submit: z.ZodOptional<z.ZodString>;
            staySignedInNo: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            username?: string | undefined;
            password?: string | undefined;
            submit?: string | undefined;
            staySignedInNo?: string | undefined;
        }, {
            username?: string | undefined;
            password?: string | undefined;
            submit?: string | undefined;
            staySignedInNo?: string | undefined;
        }>>;
        mfa: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            type: z.ZodDefault<z.ZodEnum<["totp", "push", "sms", "none"]>>;
            totpSecretEnv: z.ZodOptional<z.ZodString>;
            pushTimeoutMs: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            type: "none" | "totp" | "push" | "sms";
            pushTimeoutMs: number;
            totpSecretEnv?: string | undefined;
        }, {
            enabled?: boolean | undefined;
            type?: "none" | "totp" | "push" | "sms" | undefined;
            totpSecretEnv?: string | undefined;
            pushTimeoutMs?: number | undefined;
        }>>;
        timeouts: z.ZodOptional<z.ZodObject<{
            loginFlowMs: z.ZodDefault<z.ZodNumber>;
            idpRedirectMs: z.ZodDefault<z.ZodNumber>;
            callbackMs: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            loginFlowMs: number;
            idpRedirectMs: number;
            callbackMs: number;
        }, {
            loginFlowMs?: number | undefined;
            idpRedirectMs?: number | undefined;
            callbackMs?: number | undefined;
        }>>;
        logout: z.ZodOptional<z.ZodObject<{
            url: z.ZodOptional<z.ZodString>;
            idpLogout: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            url?: string | undefined;
            idpLogout?: boolean | undefined;
        }, {
            url?: string | undefined;
            idpLogout?: boolean | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
        loginUrl: string;
        success: {
            timeout: number;
            url?: string | undefined;
            selector?: string | undefined;
        };
        mfa?: {
            enabled: boolean;
            type: "none" | "totp" | "push" | "sms";
            pushTimeoutMs: number;
            totpSecretEnv?: string | undefined;
        } | undefined;
        idpLoginUrl?: string | undefined;
        idpSelectors?: {
            username?: string | undefined;
            password?: string | undefined;
            submit?: string | undefined;
            staySignedInNo?: string | undefined;
        } | undefined;
        timeouts?: {
            loginFlowMs: number;
            idpRedirectMs: number;
            callbackMs: number;
        } | undefined;
        logout?: {
            url?: string | undefined;
            idpLogout?: boolean | undefined;
        } | undefined;
    }, {
        idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
        loginUrl: string;
        success: {
            url?: string | undefined;
            selector?: string | undefined;
            timeout?: number | undefined;
        };
        mfa?: {
            enabled?: boolean | undefined;
            type?: "none" | "totp" | "push" | "sms" | undefined;
            totpSecretEnv?: string | undefined;
            pushTimeoutMs?: number | undefined;
        } | undefined;
        idpLoginUrl?: string | undefined;
        idpSelectors?: {
            username?: string | undefined;
            password?: string | undefined;
            submit?: string | undefined;
            staySignedInNo?: string | undefined;
        } | undefined;
        timeouts?: {
            loginFlowMs?: number | undefined;
            idpRedirectMs?: number | undefined;
            callbackMs?: number | undefined;
        } | undefined;
        logout?: {
            url?: string | undefined;
            idpLogout?: boolean | undefined;
        } | undefined;
    }>>>;
}, "strip", z.ZodTypeAny, {
    credentialsEnv: {
        username: string;
        password: string;
    };
    description?: string | undefined;
    oidcOverrides?: {
        idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
        loginUrl: string;
        success: {
            timeout: number;
            url?: string | undefined;
            selector?: string | undefined;
        };
        mfa?: {
            enabled: boolean;
            type: "none" | "totp" | "push" | "sms";
            pushTimeoutMs: number;
            totpSecretEnv?: string | undefined;
        } | undefined;
        idpLoginUrl?: string | undefined;
        idpSelectors?: {
            username?: string | undefined;
            password?: string | undefined;
            submit?: string | undefined;
            staySignedInNo?: string | undefined;
        } | undefined;
        timeouts?: {
            loginFlowMs: number;
            idpRedirectMs: number;
            callbackMs: number;
        } | undefined;
        logout?: {
            url?: string | undefined;
            idpLogout?: boolean | undefined;
        } | undefined;
    } | undefined;
}, {
    credentialsEnv: {
        username: string;
        password: string;
    };
    description?: string | undefined;
    oidcOverrides?: {
        idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
        loginUrl: string;
        success: {
            url?: string | undefined;
            selector?: string | undefined;
            timeout?: number | undefined;
        };
        mfa?: {
            enabled?: boolean | undefined;
            type?: "none" | "totp" | "push" | "sms" | undefined;
            totpSecretEnv?: string | undefined;
            pushTimeoutMs?: number | undefined;
        } | undefined;
        idpLoginUrl?: string | undefined;
        idpSelectors?: {
            username?: string | undefined;
            password?: string | undefined;
            submit?: string | undefined;
            staySignedInNo?: string | undefined;
        } | undefined;
        timeouts?: {
            loginFlowMs?: number | undefined;
            idpRedirectMs?: number | undefined;
            callbackMs?: number | undefined;
        } | undefined;
        logout?: {
            url?: string | undefined;
            idpLogout?: boolean | undefined;
        } | undefined;
    } | undefined;
}>>;
/** Auth bypass configuration schema */
export declare const AuthBypassConfigSchema: z.ZodObject<{
    mode: z.ZodDefault<z.ZodEnum<["none", "identityless", "mock-identity", "unknown"]>>;
    toggle: z.ZodOptional<z.ZodString>;
    environments: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    mode: "none" | "identityless" | "mock-identity" | "unknown";
    toggle?: string | undefined;
    environments?: string[] | undefined;
}, {
    mode?: "none" | "identityless" | "mock-identity" | "unknown" | undefined;
    toggle?: string | undefined;
    environments?: string[] | undefined;
}>;
/** Auth configuration schema with provider-specific validation */
export declare const AuthConfigSchema: z.ZodEffects<z.ZodObject<{
    provider: z.ZodEnum<["oidc", "form", "token", "custom"]>;
    storageState: z.ZodDefault<z.ZodObject<{
        directory: z.ZodDefault<z.ZodString>;
        maxAgeMinutes: z.ZodDefault<z.ZodNumber>;
        filePattern: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        directory: string;
        maxAgeMinutes: number;
        filePattern: string;
    }, {
        directory?: string | undefined;
        maxAgeMinutes?: number | undefined;
        filePattern?: string | undefined;
    }>>;
    roles: z.ZodEffects<z.ZodRecord<z.ZodString, z.ZodObject<{
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
        description: z.ZodOptional<z.ZodString>;
        oidcOverrides: z.ZodOptional<z.ZodOptional<z.ZodObject<{
            idpType: z.ZodEnum<["keycloak", "azure-ad", "okta", "auth0", "generic"]>;
            loginUrl: z.ZodString;
            idpLoginUrl: z.ZodOptional<z.ZodString>;
            success: z.ZodEffects<z.ZodObject<{
                url: z.ZodOptional<z.ZodString>;
                selector: z.ZodOptional<z.ZodString>;
                timeout: z.ZodDefault<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                timeout: number;
                url?: string | undefined;
                selector?: string | undefined;
            }, {
                url?: string | undefined;
                selector?: string | undefined;
                timeout?: number | undefined;
            }>, {
                timeout: number;
                url?: string | undefined;
                selector?: string | undefined;
            }, {
                url?: string | undefined;
                selector?: string | undefined;
                timeout?: number | undefined;
            }>;
            idpSelectors: z.ZodOptional<z.ZodObject<{
                username: z.ZodOptional<z.ZodString>;
                password: z.ZodOptional<z.ZodString>;
                submit: z.ZodOptional<z.ZodString>;
                staySignedInNo: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                username?: string | undefined;
                password?: string | undefined;
                submit?: string | undefined;
                staySignedInNo?: string | undefined;
            }, {
                username?: string | undefined;
                password?: string | undefined;
                submit?: string | undefined;
                staySignedInNo?: string | undefined;
            }>>;
            mfa: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodDefault<z.ZodBoolean>;
                type: z.ZodDefault<z.ZodEnum<["totp", "push", "sms", "none"]>>;
                totpSecretEnv: z.ZodOptional<z.ZodString>;
                pushTimeoutMs: z.ZodDefault<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                enabled: boolean;
                type: "none" | "totp" | "push" | "sms";
                pushTimeoutMs: number;
                totpSecretEnv?: string | undefined;
            }, {
                enabled?: boolean | undefined;
                type?: "none" | "totp" | "push" | "sms" | undefined;
                totpSecretEnv?: string | undefined;
                pushTimeoutMs?: number | undefined;
            }>>;
            timeouts: z.ZodOptional<z.ZodObject<{
                loginFlowMs: z.ZodDefault<z.ZodNumber>;
                idpRedirectMs: z.ZodDefault<z.ZodNumber>;
                callbackMs: z.ZodDefault<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                loginFlowMs: number;
                idpRedirectMs: number;
                callbackMs: number;
            }, {
                loginFlowMs?: number | undefined;
                idpRedirectMs?: number | undefined;
                callbackMs?: number | undefined;
            }>>;
            logout: z.ZodOptional<z.ZodObject<{
                url: z.ZodOptional<z.ZodString>;
                idpLogout: z.ZodOptional<z.ZodBoolean>;
            }, "strip", z.ZodTypeAny, {
                url?: string | undefined;
                idpLogout?: boolean | undefined;
            }, {
                url?: string | undefined;
                idpLogout?: boolean | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
            loginUrl: string;
            success: {
                timeout: number;
                url?: string | undefined;
                selector?: string | undefined;
            };
            mfa?: {
                enabled: boolean;
                type: "none" | "totp" | "push" | "sms";
                pushTimeoutMs: number;
                totpSecretEnv?: string | undefined;
            } | undefined;
            idpLoginUrl?: string | undefined;
            idpSelectors?: {
                username?: string | undefined;
                password?: string | undefined;
                submit?: string | undefined;
                staySignedInNo?: string | undefined;
            } | undefined;
            timeouts?: {
                loginFlowMs: number;
                idpRedirectMs: number;
                callbackMs: number;
            } | undefined;
            logout?: {
                url?: string | undefined;
                idpLogout?: boolean | undefined;
            } | undefined;
        }, {
            idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
            loginUrl: string;
            success: {
                url?: string | undefined;
                selector?: string | undefined;
                timeout?: number | undefined;
            };
            mfa?: {
                enabled?: boolean | undefined;
                type?: "none" | "totp" | "push" | "sms" | undefined;
                totpSecretEnv?: string | undefined;
                pushTimeoutMs?: number | undefined;
            } | undefined;
            idpLoginUrl?: string | undefined;
            idpSelectors?: {
                username?: string | undefined;
                password?: string | undefined;
                submit?: string | undefined;
                staySignedInNo?: string | undefined;
            } | undefined;
            timeouts?: {
                loginFlowMs?: number | undefined;
                idpRedirectMs?: number | undefined;
                callbackMs?: number | undefined;
            } | undefined;
            logout?: {
                url?: string | undefined;
                idpLogout?: boolean | undefined;
            } | undefined;
        }>>>;
    }, "strip", z.ZodTypeAny, {
        credentialsEnv: {
            username: string;
            password: string;
        };
        description?: string | undefined;
        oidcOverrides?: {
            idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
            loginUrl: string;
            success: {
                timeout: number;
                url?: string | undefined;
                selector?: string | undefined;
            };
            mfa?: {
                enabled: boolean;
                type: "none" | "totp" | "push" | "sms";
                pushTimeoutMs: number;
                totpSecretEnv?: string | undefined;
            } | undefined;
            idpLoginUrl?: string | undefined;
            idpSelectors?: {
                username?: string | undefined;
                password?: string | undefined;
                submit?: string | undefined;
                staySignedInNo?: string | undefined;
            } | undefined;
            timeouts?: {
                loginFlowMs: number;
                idpRedirectMs: number;
                callbackMs: number;
            } | undefined;
            logout?: {
                url?: string | undefined;
                idpLogout?: boolean | undefined;
            } | undefined;
        } | undefined;
    }, {
        credentialsEnv: {
            username: string;
            password: string;
        };
        description?: string | undefined;
        oidcOverrides?: {
            idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
            loginUrl: string;
            success: {
                url?: string | undefined;
                selector?: string | undefined;
                timeout?: number | undefined;
            };
            mfa?: {
                enabled?: boolean | undefined;
                type?: "none" | "totp" | "push" | "sms" | undefined;
                totpSecretEnv?: string | undefined;
                pushTimeoutMs?: number | undefined;
            } | undefined;
            idpLoginUrl?: string | undefined;
            idpSelectors?: {
                username?: string | undefined;
                password?: string | undefined;
                submit?: string | undefined;
                staySignedInNo?: string | undefined;
            } | undefined;
            timeouts?: {
                loginFlowMs?: number | undefined;
                idpRedirectMs?: number | undefined;
                callbackMs?: number | undefined;
            } | undefined;
            logout?: {
                url?: string | undefined;
                idpLogout?: boolean | undefined;
            } | undefined;
        } | undefined;
    }>>, Record<string, {
        credentialsEnv: {
            username: string;
            password: string;
        };
        description?: string | undefined;
        oidcOverrides?: {
            idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
            loginUrl: string;
            success: {
                timeout: number;
                url?: string | undefined;
                selector?: string | undefined;
            };
            mfa?: {
                enabled: boolean;
                type: "none" | "totp" | "push" | "sms";
                pushTimeoutMs: number;
                totpSecretEnv?: string | undefined;
            } | undefined;
            idpLoginUrl?: string | undefined;
            idpSelectors?: {
                username?: string | undefined;
                password?: string | undefined;
                submit?: string | undefined;
                staySignedInNo?: string | undefined;
            } | undefined;
            timeouts?: {
                loginFlowMs: number;
                idpRedirectMs: number;
                callbackMs: number;
            } | undefined;
            logout?: {
                url?: string | undefined;
                idpLogout?: boolean | undefined;
            } | undefined;
        } | undefined;
    }>, Record<string, {
        credentialsEnv: {
            username: string;
            password: string;
        };
        description?: string | undefined;
        oidcOverrides?: {
            idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
            loginUrl: string;
            success: {
                url?: string | undefined;
                selector?: string | undefined;
                timeout?: number | undefined;
            };
            mfa?: {
                enabled?: boolean | undefined;
                type?: "none" | "totp" | "push" | "sms" | undefined;
                totpSecretEnv?: string | undefined;
                pushTimeoutMs?: number | undefined;
            } | undefined;
            idpLoginUrl?: string | undefined;
            idpSelectors?: {
                username?: string | undefined;
                password?: string | undefined;
                submit?: string | undefined;
                staySignedInNo?: string | undefined;
            } | undefined;
            timeouts?: {
                loginFlowMs?: number | undefined;
                idpRedirectMs?: number | undefined;
                callbackMs?: number | undefined;
            } | undefined;
            logout?: {
                url?: string | undefined;
                idpLogout?: boolean | undefined;
            } | undefined;
        } | undefined;
    }>>;
    bypass: z.ZodOptional<z.ZodObject<{
        mode: z.ZodDefault<z.ZodEnum<["none", "identityless", "mock-identity", "unknown"]>>;
        toggle: z.ZodOptional<z.ZodString>;
        environments: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        mode: "none" | "identityless" | "mock-identity" | "unknown";
        toggle?: string | undefined;
        environments?: string[] | undefined;
    }, {
        mode?: "none" | "identityless" | "mock-identity" | "unknown" | undefined;
        toggle?: string | undefined;
        environments?: string[] | undefined;
    }>>;
    oidc: z.ZodOptional<z.ZodObject<{
        idpType: z.ZodEnum<["keycloak", "azure-ad", "okta", "auth0", "generic"]>;
        loginUrl: z.ZodString;
        idpLoginUrl: z.ZodOptional<z.ZodString>;
        success: z.ZodEffects<z.ZodObject<{
            url: z.ZodOptional<z.ZodString>;
            selector: z.ZodOptional<z.ZodString>;
            timeout: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            timeout: number;
            url?: string | undefined;
            selector?: string | undefined;
        }, {
            url?: string | undefined;
            selector?: string | undefined;
            timeout?: number | undefined;
        }>, {
            timeout: number;
            url?: string | undefined;
            selector?: string | undefined;
        }, {
            url?: string | undefined;
            selector?: string | undefined;
            timeout?: number | undefined;
        }>;
        idpSelectors: z.ZodOptional<z.ZodObject<{
            username: z.ZodOptional<z.ZodString>;
            password: z.ZodOptional<z.ZodString>;
            submit: z.ZodOptional<z.ZodString>;
            staySignedInNo: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            username?: string | undefined;
            password?: string | undefined;
            submit?: string | undefined;
            staySignedInNo?: string | undefined;
        }, {
            username?: string | undefined;
            password?: string | undefined;
            submit?: string | undefined;
            staySignedInNo?: string | undefined;
        }>>;
        mfa: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            type: z.ZodDefault<z.ZodEnum<["totp", "push", "sms", "none"]>>;
            totpSecretEnv: z.ZodOptional<z.ZodString>;
            pushTimeoutMs: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            type: "none" | "totp" | "push" | "sms";
            pushTimeoutMs: number;
            totpSecretEnv?: string | undefined;
        }, {
            enabled?: boolean | undefined;
            type?: "none" | "totp" | "push" | "sms" | undefined;
            totpSecretEnv?: string | undefined;
            pushTimeoutMs?: number | undefined;
        }>>;
        timeouts: z.ZodOptional<z.ZodObject<{
            loginFlowMs: z.ZodDefault<z.ZodNumber>;
            idpRedirectMs: z.ZodDefault<z.ZodNumber>;
            callbackMs: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            loginFlowMs: number;
            idpRedirectMs: number;
            callbackMs: number;
        }, {
            loginFlowMs?: number | undefined;
            idpRedirectMs?: number | undefined;
            callbackMs?: number | undefined;
        }>>;
        logout: z.ZodOptional<z.ZodObject<{
            url: z.ZodOptional<z.ZodString>;
            idpLogout: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            url?: string | undefined;
            idpLogout?: boolean | undefined;
        }, {
            url?: string | undefined;
            idpLogout?: boolean | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
        loginUrl: string;
        success: {
            timeout: number;
            url?: string | undefined;
            selector?: string | undefined;
        };
        mfa?: {
            enabled: boolean;
            type: "none" | "totp" | "push" | "sms";
            pushTimeoutMs: number;
            totpSecretEnv?: string | undefined;
        } | undefined;
        idpLoginUrl?: string | undefined;
        idpSelectors?: {
            username?: string | undefined;
            password?: string | undefined;
            submit?: string | undefined;
            staySignedInNo?: string | undefined;
        } | undefined;
        timeouts?: {
            loginFlowMs: number;
            idpRedirectMs: number;
            callbackMs: number;
        } | undefined;
        logout?: {
            url?: string | undefined;
            idpLogout?: boolean | undefined;
        } | undefined;
    }, {
        idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
        loginUrl: string;
        success: {
            url?: string | undefined;
            selector?: string | undefined;
            timeout?: number | undefined;
        };
        mfa?: {
            enabled?: boolean | undefined;
            type?: "none" | "totp" | "push" | "sms" | undefined;
            totpSecretEnv?: string | undefined;
            pushTimeoutMs?: number | undefined;
        } | undefined;
        idpLoginUrl?: string | undefined;
        idpSelectors?: {
            username?: string | undefined;
            password?: string | undefined;
            submit?: string | undefined;
            staySignedInNo?: string | undefined;
        } | undefined;
        timeouts?: {
            loginFlowMs?: number | undefined;
            idpRedirectMs?: number | undefined;
            callbackMs?: number | undefined;
        } | undefined;
        logout?: {
            url?: string | undefined;
            idpLogout?: boolean | undefined;
        } | undefined;
    }>>;
    form: z.ZodOptional<z.ZodObject<{
        loginUrl: z.ZodString;
        selectors: z.ZodObject<{
            username: z.ZodString;
            password: z.ZodString;
            submit: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            username: string;
            password: string;
            submit: string;
        }, {
            username: string;
            password: string;
            submit: string;
        }>;
        success: z.ZodObject<{
            url: z.ZodOptional<z.ZodString>;
            selector: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            url?: string | undefined;
            selector?: string | undefined;
        }, {
            url?: string | undefined;
            selector?: string | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        loginUrl: string;
        success: {
            url?: string | undefined;
            selector?: string | undefined;
        };
        selectors: {
            username: string;
            password: string;
            submit: string;
        };
    }, {
        loginUrl: string;
        success: {
            url?: string | undefined;
            selector?: string | undefined;
        };
        selectors: {
            username: string;
            password: string;
            submit: string;
        };
    }>>;
}, "strip", z.ZodTypeAny, {
    provider: "oidc" | "form" | "token" | "custom";
    storageState: {
        directory: string;
        maxAgeMinutes: number;
        filePattern: string;
    };
    roles: Record<string, {
        credentialsEnv: {
            username: string;
            password: string;
        };
        description?: string | undefined;
        oidcOverrides?: {
            idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
            loginUrl: string;
            success: {
                timeout: number;
                url?: string | undefined;
                selector?: string | undefined;
            };
            mfa?: {
                enabled: boolean;
                type: "none" | "totp" | "push" | "sms";
                pushTimeoutMs: number;
                totpSecretEnv?: string | undefined;
            } | undefined;
            idpLoginUrl?: string | undefined;
            idpSelectors?: {
                username?: string | undefined;
                password?: string | undefined;
                submit?: string | undefined;
                staySignedInNo?: string | undefined;
            } | undefined;
            timeouts?: {
                loginFlowMs: number;
                idpRedirectMs: number;
                callbackMs: number;
            } | undefined;
            logout?: {
                url?: string | undefined;
                idpLogout?: boolean | undefined;
            } | undefined;
        } | undefined;
    }>;
    oidc?: {
        idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
        loginUrl: string;
        success: {
            timeout: number;
            url?: string | undefined;
            selector?: string | undefined;
        };
        mfa?: {
            enabled: boolean;
            type: "none" | "totp" | "push" | "sms";
            pushTimeoutMs: number;
            totpSecretEnv?: string | undefined;
        } | undefined;
        idpLoginUrl?: string | undefined;
        idpSelectors?: {
            username?: string | undefined;
            password?: string | undefined;
            submit?: string | undefined;
            staySignedInNo?: string | undefined;
        } | undefined;
        timeouts?: {
            loginFlowMs: number;
            idpRedirectMs: number;
            callbackMs: number;
        } | undefined;
        logout?: {
            url?: string | undefined;
            idpLogout?: boolean | undefined;
        } | undefined;
    } | undefined;
    form?: {
        loginUrl: string;
        success: {
            url?: string | undefined;
            selector?: string | undefined;
        };
        selectors: {
            username: string;
            password: string;
            submit: string;
        };
    } | undefined;
    bypass?: {
        mode: "none" | "identityless" | "mock-identity" | "unknown";
        toggle?: string | undefined;
        environments?: string[] | undefined;
    } | undefined;
}, {
    provider: "oidc" | "form" | "token" | "custom";
    roles: Record<string, {
        credentialsEnv: {
            username: string;
            password: string;
        };
        description?: string | undefined;
        oidcOverrides?: {
            idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
            loginUrl: string;
            success: {
                url?: string | undefined;
                selector?: string | undefined;
                timeout?: number | undefined;
            };
            mfa?: {
                enabled?: boolean | undefined;
                type?: "none" | "totp" | "push" | "sms" | undefined;
                totpSecretEnv?: string | undefined;
                pushTimeoutMs?: number | undefined;
            } | undefined;
            idpLoginUrl?: string | undefined;
            idpSelectors?: {
                username?: string | undefined;
                password?: string | undefined;
                submit?: string | undefined;
                staySignedInNo?: string | undefined;
            } | undefined;
            timeouts?: {
                loginFlowMs?: number | undefined;
                idpRedirectMs?: number | undefined;
                callbackMs?: number | undefined;
            } | undefined;
            logout?: {
                url?: string | undefined;
                idpLogout?: boolean | undefined;
            } | undefined;
        } | undefined;
    }>;
    oidc?: {
        idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
        loginUrl: string;
        success: {
            url?: string | undefined;
            selector?: string | undefined;
            timeout?: number | undefined;
        };
        mfa?: {
            enabled?: boolean | undefined;
            type?: "none" | "totp" | "push" | "sms" | undefined;
            totpSecretEnv?: string | undefined;
            pushTimeoutMs?: number | undefined;
        } | undefined;
        idpLoginUrl?: string | undefined;
        idpSelectors?: {
            username?: string | undefined;
            password?: string | undefined;
            submit?: string | undefined;
            staySignedInNo?: string | undefined;
        } | undefined;
        timeouts?: {
            loginFlowMs?: number | undefined;
            idpRedirectMs?: number | undefined;
            callbackMs?: number | undefined;
        } | undefined;
        logout?: {
            url?: string | undefined;
            idpLogout?: boolean | undefined;
        } | undefined;
    } | undefined;
    form?: {
        loginUrl: string;
        success: {
            url?: string | undefined;
            selector?: string | undefined;
        };
        selectors: {
            username: string;
            password: string;
            submit: string;
        };
    } | undefined;
    storageState?: {
        directory?: string | undefined;
        maxAgeMinutes?: number | undefined;
        filePattern?: string | undefined;
    } | undefined;
    bypass?: {
        mode?: "none" | "identityless" | "mock-identity" | "unknown" | undefined;
        toggle?: string | undefined;
        environments?: string[] | undefined;
    } | undefined;
}>, {
    provider: "oidc" | "form" | "token" | "custom";
    storageState: {
        directory: string;
        maxAgeMinutes: number;
        filePattern: string;
    };
    roles: Record<string, {
        credentialsEnv: {
            username: string;
            password: string;
        };
        description?: string | undefined;
        oidcOverrides?: {
            idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
            loginUrl: string;
            success: {
                timeout: number;
                url?: string | undefined;
                selector?: string | undefined;
            };
            mfa?: {
                enabled: boolean;
                type: "none" | "totp" | "push" | "sms";
                pushTimeoutMs: number;
                totpSecretEnv?: string | undefined;
            } | undefined;
            idpLoginUrl?: string | undefined;
            idpSelectors?: {
                username?: string | undefined;
                password?: string | undefined;
                submit?: string | undefined;
                staySignedInNo?: string | undefined;
            } | undefined;
            timeouts?: {
                loginFlowMs: number;
                idpRedirectMs: number;
                callbackMs: number;
            } | undefined;
            logout?: {
                url?: string | undefined;
                idpLogout?: boolean | undefined;
            } | undefined;
        } | undefined;
    }>;
    oidc?: {
        idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
        loginUrl: string;
        success: {
            timeout: number;
            url?: string | undefined;
            selector?: string | undefined;
        };
        mfa?: {
            enabled: boolean;
            type: "none" | "totp" | "push" | "sms";
            pushTimeoutMs: number;
            totpSecretEnv?: string | undefined;
        } | undefined;
        idpLoginUrl?: string | undefined;
        idpSelectors?: {
            username?: string | undefined;
            password?: string | undefined;
            submit?: string | undefined;
            staySignedInNo?: string | undefined;
        } | undefined;
        timeouts?: {
            loginFlowMs: number;
            idpRedirectMs: number;
            callbackMs: number;
        } | undefined;
        logout?: {
            url?: string | undefined;
            idpLogout?: boolean | undefined;
        } | undefined;
    } | undefined;
    form?: {
        loginUrl: string;
        success: {
            url?: string | undefined;
            selector?: string | undefined;
        };
        selectors: {
            username: string;
            password: string;
            submit: string;
        };
    } | undefined;
    bypass?: {
        mode: "none" | "identityless" | "mock-identity" | "unknown";
        toggle?: string | undefined;
        environments?: string[] | undefined;
    } | undefined;
}, {
    provider: "oidc" | "form" | "token" | "custom";
    roles: Record<string, {
        credentialsEnv: {
            username: string;
            password: string;
        };
        description?: string | undefined;
        oidcOverrides?: {
            idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
            loginUrl: string;
            success: {
                url?: string | undefined;
                selector?: string | undefined;
                timeout?: number | undefined;
            };
            mfa?: {
                enabled?: boolean | undefined;
                type?: "none" | "totp" | "push" | "sms" | undefined;
                totpSecretEnv?: string | undefined;
                pushTimeoutMs?: number | undefined;
            } | undefined;
            idpLoginUrl?: string | undefined;
            idpSelectors?: {
                username?: string | undefined;
                password?: string | undefined;
                submit?: string | undefined;
                staySignedInNo?: string | undefined;
            } | undefined;
            timeouts?: {
                loginFlowMs?: number | undefined;
                idpRedirectMs?: number | undefined;
                callbackMs?: number | undefined;
            } | undefined;
            logout?: {
                url?: string | undefined;
                idpLogout?: boolean | undefined;
            } | undefined;
        } | undefined;
    }>;
    oidc?: {
        idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
        loginUrl: string;
        success: {
            url?: string | undefined;
            selector?: string | undefined;
            timeout?: number | undefined;
        };
        mfa?: {
            enabled?: boolean | undefined;
            type?: "none" | "totp" | "push" | "sms" | undefined;
            totpSecretEnv?: string | undefined;
            pushTimeoutMs?: number | undefined;
        } | undefined;
        idpLoginUrl?: string | undefined;
        idpSelectors?: {
            username?: string | undefined;
            password?: string | undefined;
            submit?: string | undefined;
            staySignedInNo?: string | undefined;
        } | undefined;
        timeouts?: {
            loginFlowMs?: number | undefined;
            idpRedirectMs?: number | undefined;
            callbackMs?: number | undefined;
        } | undefined;
        logout?: {
            url?: string | undefined;
            idpLogout?: boolean | undefined;
        } | undefined;
    } | undefined;
    form?: {
        loginUrl: string;
        success: {
            url?: string | undefined;
            selector?: string | undefined;
        };
        selectors: {
            username: string;
            password: string;
            submit: string;
        };
    } | undefined;
    storageState?: {
        directory?: string | undefined;
        maxAgeMinutes?: number | undefined;
        filePattern?: string | undefined;
    } | undefined;
    bypass?: {
        mode?: "none" | "identityless" | "mock-identity" | "unknown" | undefined;
        toggle?: string | undefined;
        environments?: string[] | undefined;
    } | undefined;
}>;
/** Selectors configuration schema */
export declare const SelectorsConfigSchema: z.ZodObject<{
    testIdAttribute: z.ZodDefault<z.ZodString>;
    strategy: z.ZodDefault<z.ZodArray<z.ZodEnum<["role", "label", "placeholder", "testid", "text", "css"]>, "many">>;
    customTestIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    testIdAttribute: string;
    strategy: ("role" | "label" | "placeholder" | "testid" | "text" | "css")[];
    customTestIds?: string[] | undefined;
}, {
    testIdAttribute?: string | undefined;
    strategy?: ("role" | "label" | "placeholder" | "testid" | "text" | "css")[] | undefined;
    customTestIds?: string[] | undefined;
}>;
/** Toast assertion schema */
export declare const ToastAssertionConfigSchema: z.ZodObject<{
    containerSelector: z.ZodString;
    messageSelector: z.ZodString;
    typeAttribute: z.ZodString;
    timeout: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    timeout: number;
    containerSelector: string;
    messageSelector: string;
    typeAttribute: string;
}, {
    containerSelector: string;
    messageSelector: string;
    typeAttribute: string;
    timeout?: number | undefined;
}>;
/** Loading assertion schema */
export declare const LoadingAssertionConfigSchema: z.ZodObject<{
    selectors: z.ZodArray<z.ZodString, "many">;
    timeout: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    timeout: number;
    selectors: string[];
}, {
    selectors: string[];
    timeout?: number | undefined;
}>;
/** Form assertion schema */
export declare const FormAssertionConfigSchema: z.ZodObject<{
    errorSelector: z.ZodString;
    formErrorSelector: z.ZodString;
}, "strip", z.ZodTypeAny, {
    errorSelector: string;
    formErrorSelector: string;
}, {
    errorSelector: string;
    formErrorSelector: string;
}>;
/** Assertions configuration schema */
export declare const AssertionsConfigSchema: z.ZodObject<{
    toast: z.ZodDefault<z.ZodObject<{
        containerSelector: z.ZodString;
        messageSelector: z.ZodString;
        typeAttribute: z.ZodString;
        timeout: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        timeout: number;
        containerSelector: string;
        messageSelector: string;
        typeAttribute: string;
    }, {
        containerSelector: string;
        messageSelector: string;
        typeAttribute: string;
        timeout?: number | undefined;
    }>>;
    loading: z.ZodDefault<z.ZodObject<{
        selectors: z.ZodArray<z.ZodString, "many">;
        timeout: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        timeout: number;
        selectors: string[];
    }, {
        selectors: string[];
        timeout?: number | undefined;
    }>>;
    form: z.ZodDefault<z.ZodObject<{
        errorSelector: z.ZodString;
        formErrorSelector: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        errorSelector: string;
        formErrorSelector: string;
    }, {
        errorSelector: string;
        formErrorSelector: string;
    }>>;
}, "strip", z.ZodTypeAny, {
    form: {
        errorSelector: string;
        formErrorSelector: string;
    };
    toast: {
        timeout: number;
        containerSelector: string;
        messageSelector: string;
        typeAttribute: string;
    };
    loading: {
        timeout: number;
        selectors: string[];
    };
}, {
    form?: {
        errorSelector: string;
        formErrorSelector: string;
    } | undefined;
    toast?: {
        containerSelector: string;
        messageSelector: string;
        typeAttribute: string;
        timeout?: number | undefined;
    } | undefined;
    loading?: {
        selectors: string[];
        timeout?: number | undefined;
    } | undefined;
}>;
/** Namespace configuration schema */
export declare const NamespaceConfigSchema: z.ZodObject<{
    prefix: z.ZodDefault<z.ZodString>;
    suffix: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    prefix: string;
    suffix: string;
}, {
    prefix?: string | undefined;
    suffix?: string | undefined;
}>;
/** Cleanup configuration schema */
export declare const CleanupConfigSchema: z.ZodObject<{
    enabled: z.ZodDefault<z.ZodBoolean>;
    onFailure: z.ZodDefault<z.ZodBoolean>;
    parallel: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    enabled: boolean;
    onFailure: boolean;
    parallel: boolean;
}, {
    enabled?: boolean | undefined;
    onFailure?: boolean | undefined;
    parallel?: boolean | undefined;
}>;
/** Data API configuration schema */
export declare const DataApiConfigSchema: z.ZodOptional<z.ZodObject<{
    baseUrl: z.ZodString;
    useMainAuth: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    baseUrl: string;
    useMainAuth: boolean;
}, {
    baseUrl: string;
    useMainAuth?: boolean | undefined;
}>>;
/** Data configuration schema */
export declare const DataConfigSchema: z.ZodObject<{
    namespace: z.ZodDefault<z.ZodObject<{
        prefix: z.ZodDefault<z.ZodString>;
        suffix: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        prefix: string;
        suffix: string;
    }, {
        prefix?: string | undefined;
        suffix?: string | undefined;
    }>>;
    cleanup: z.ZodDefault<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        onFailure: z.ZodDefault<z.ZodBoolean>;
        parallel: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        onFailure: boolean;
        parallel: boolean;
    }, {
        enabled?: boolean | undefined;
        onFailure?: boolean | undefined;
        parallel?: boolean | undefined;
    }>>;
    api: z.ZodOptional<z.ZodObject<{
        baseUrl: z.ZodString;
        useMainAuth: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        baseUrl: string;
        useMainAuth: boolean;
    }, {
        baseUrl: string;
        useMainAuth?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    namespace: {
        prefix: string;
        suffix: string;
    };
    cleanup: {
        enabled: boolean;
        onFailure: boolean;
        parallel: boolean;
    };
    api?: {
        baseUrl: string;
        useMainAuth: boolean;
    } | undefined;
}, {
    namespace?: {
        prefix?: string | undefined;
        suffix?: string | undefined;
    } | undefined;
    cleanup?: {
        enabled?: boolean | undefined;
        onFailure?: boolean | undefined;
        parallel?: boolean | undefined;
    } | undefined;
    api?: {
        baseUrl: string;
        useMainAuth?: boolean | undefined;
    } | undefined;
}>;
/** Fixtures API configuration schema */
export declare const FixturesApiConfigSchema: z.ZodOptional<z.ZodObject<{
    baseURL: z.ZodString;
    extraHTTPHeaders: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    baseURL: string;
    extraHTTPHeaders?: Record<string, string> | undefined;
}, {
    baseURL: string;
    extraHTTPHeaders?: Record<string, string> | undefined;
}>>;
/** Fixtures configuration schema */
export declare const FixturesConfigSchema: z.ZodObject<{
    defaultRole: z.ZodString;
    roleFixtures: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    api: z.ZodOptional<z.ZodObject<{
        baseURL: z.ZodString;
        extraHTTPHeaders: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        baseURL: string;
        extraHTTPHeaders?: Record<string, string> | undefined;
    }, {
        baseURL: string;
        extraHTTPHeaders?: Record<string, string> | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    defaultRole: string;
    roleFixtures: string[];
    api?: {
        baseURL: string;
        extraHTTPHeaders?: Record<string, string> | undefined;
    } | undefined;
}, {
    defaultRole: string;
    api?: {
        baseURL: string;
        extraHTTPHeaders?: Record<string, string> | undefined;
    } | undefined;
    roleFixtures?: string[] | undefined;
}>;
/** Tier configuration schema */
export declare const TierConfigSchema: z.ZodObject<{
    retries: z.ZodNumber;
    workers: z.ZodNumber;
    timeout: z.ZodNumber;
    tag: z.ZodString;
}, "strip", z.ZodTypeAny, {
    timeout: number;
    retries: number;
    workers: number;
    tag: string;
}, {
    timeout: number;
    retries: number;
    workers: number;
    tag: string;
}>;
/** Tiers record schema */
export declare const TiersSchema: z.ZodRecord<z.ZodString, z.ZodObject<{
    retries: z.ZodNumber;
    workers: z.ZodNumber;
    timeout: z.ZodNumber;
    tag: z.ZodString;
}, "strip", z.ZodTypeAny, {
    timeout: number;
    retries: number;
    workers: number;
    tag: string;
}, {
    timeout: number;
    retries: number;
    workers: number;
    tag: string;
}>>;
/** HTML reporter schema */
export declare const HtmlReporterConfigSchema: z.ZodOptional<z.ZodObject<{
    enabled: z.ZodDefault<z.ZodBoolean>;
    outputFolder: z.ZodDefault<z.ZodString>;
    open: z.ZodDefault<z.ZodEnum<["always", "never", "on-failure"]>>;
}, "strip", z.ZodTypeAny, {
    enabled: boolean;
    outputFolder: string;
    open: "always" | "never" | "on-failure";
}, {
    enabled?: boolean | undefined;
    outputFolder?: string | undefined;
    open?: "always" | "never" | "on-failure" | undefined;
}>>;
/** JSON reporter schema */
export declare const JsonReporterConfigSchema: z.ZodOptional<z.ZodObject<{
    enabled: z.ZodDefault<z.ZodBoolean>;
    outputFile: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    enabled: boolean;
    outputFile: string;
}, {
    enabled?: boolean | undefined;
    outputFile?: string | undefined;
}>>;
/** JUnit reporter schema */
export declare const JunitReporterConfigSchema: z.ZodOptional<z.ZodObject<{
    enabled: z.ZodDefault<z.ZodBoolean>;
    outputFile: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    enabled: boolean;
    outputFile: string;
}, {
    enabled?: boolean | undefined;
    outputFile?: string | undefined;
}>>;
/** ARTK reporter schema */
export declare const ArtkReporterConfigSchema: z.ZodOptional<z.ZodObject<{
    enabled: z.ZodDefault<z.ZodBoolean>;
    outputFile: z.ZodDefault<z.ZodString>;
    includeJourneyMapping: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    enabled: boolean;
    outputFile: string;
    includeJourneyMapping: boolean;
}, {
    enabled?: boolean | undefined;
    outputFile?: string | undefined;
    includeJourneyMapping?: boolean | undefined;
}>>;
/** Reporters configuration schema */
export declare const ReportersConfigSchema: z.ZodObject<{
    html: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        outputFolder: z.ZodDefault<z.ZodString>;
        open: z.ZodDefault<z.ZodEnum<["always", "never", "on-failure"]>>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        outputFolder: string;
        open: "always" | "never" | "on-failure";
    }, {
        enabled?: boolean | undefined;
        outputFolder?: string | undefined;
        open?: "always" | "never" | "on-failure" | undefined;
    }>>;
    json: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        outputFile: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        outputFile: string;
    }, {
        enabled?: boolean | undefined;
        outputFile?: string | undefined;
    }>>;
    junit: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        outputFile: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        outputFile: string;
    }, {
        enabled?: boolean | undefined;
        outputFile?: string | undefined;
    }>>;
    artk: z.ZodOptional<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        outputFile: z.ZodDefault<z.ZodString>;
        includeJourneyMapping: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        outputFile: string;
        includeJourneyMapping: boolean;
    }, {
        enabled?: boolean | undefined;
        outputFile?: string | undefined;
        includeJourneyMapping?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    json?: {
        enabled: boolean;
        outputFile: string;
    } | undefined;
    html?: {
        enabled: boolean;
        outputFolder: string;
        open: "always" | "never" | "on-failure";
    } | undefined;
    junit?: {
        enabled: boolean;
        outputFile: string;
    } | undefined;
    artk?: {
        enabled: boolean;
        outputFile: string;
        includeJourneyMapping: boolean;
    } | undefined;
}, {
    json?: {
        enabled?: boolean | undefined;
        outputFile?: string | undefined;
    } | undefined;
    html?: {
        enabled?: boolean | undefined;
        outputFolder?: string | undefined;
        open?: "always" | "never" | "on-failure" | undefined;
    } | undefined;
    junit?: {
        enabled?: boolean | undefined;
        outputFile?: string | undefined;
    } | undefined;
    artk?: {
        enabled?: boolean | undefined;
        outputFile?: string | undefined;
        includeJourneyMapping?: boolean | undefined;
    } | undefined;
}>;
/** Video size schema */
export declare const VideoSizeSchema: z.ZodOptional<z.ZodObject<{
    width: z.ZodNumber;
    height: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    width: number;
    height: number;
}, {
    width: number;
    height: number;
}>>;
/** Screenshots configuration schema */
export declare const ScreenshotsConfigSchema: z.ZodObject<{
    mode: z.ZodDefault<z.ZodEnum<["off", "on", "only-on-failure"]>>;
    fullPage: z.ZodDefault<z.ZodBoolean>;
    maskPii: z.ZodDefault<z.ZodBoolean>;
    piiSelectors: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    mode: "off" | "on" | "only-on-failure";
    fullPage: boolean;
    maskPii: boolean;
    piiSelectors: string[];
}, {
    mode?: "off" | "on" | "only-on-failure" | undefined;
    fullPage?: boolean | undefined;
    maskPii?: boolean | undefined;
    piiSelectors?: string[] | undefined;
}>;
/** Video configuration schema */
export declare const VideoConfigSchema: z.ZodObject<{
    mode: z.ZodDefault<z.ZodEnum<["off", "on", "retain-on-failure", "on-first-retry"]>>;
    size: z.ZodOptional<z.ZodObject<{
        width: z.ZodNumber;
        height: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        width: number;
        height: number;
    }, {
        width: number;
        height: number;
    }>>;
}, "strip", z.ZodTypeAny, {
    mode: "off" | "on" | "retain-on-failure" | "on-first-retry";
    size?: {
        width: number;
        height: number;
    } | undefined;
}, {
    mode?: "off" | "on" | "retain-on-failure" | "on-first-retry" | undefined;
    size?: {
        width: number;
        height: number;
    } | undefined;
}>;
/** Trace configuration schema */
export declare const TraceConfigSchema: z.ZodObject<{
    mode: z.ZodDefault<z.ZodEnum<["off", "on", "retain-on-failure", "on-first-retry"]>>;
    screenshots: z.ZodDefault<z.ZodBoolean>;
    snapshots: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    mode: "off" | "on" | "retain-on-failure" | "on-first-retry";
    screenshots: boolean;
    snapshots: boolean;
}, {
    mode?: "off" | "on" | "retain-on-failure" | "on-first-retry" | undefined;
    screenshots?: boolean | undefined;
    snapshots?: boolean | undefined;
}>;
/** Artifacts configuration schema */
export declare const ArtifactsConfigSchema: z.ZodObject<{
    outputDir: z.ZodDefault<z.ZodString>;
    screenshots: z.ZodDefault<z.ZodObject<{
        mode: z.ZodDefault<z.ZodEnum<["off", "on", "only-on-failure"]>>;
        fullPage: z.ZodDefault<z.ZodBoolean>;
        maskPii: z.ZodDefault<z.ZodBoolean>;
        piiSelectors: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        mode: "off" | "on" | "only-on-failure";
        fullPage: boolean;
        maskPii: boolean;
        piiSelectors: string[];
    }, {
        mode?: "off" | "on" | "only-on-failure" | undefined;
        fullPage?: boolean | undefined;
        maskPii?: boolean | undefined;
        piiSelectors?: string[] | undefined;
    }>>;
    video: z.ZodDefault<z.ZodObject<{
        mode: z.ZodDefault<z.ZodEnum<["off", "on", "retain-on-failure", "on-first-retry"]>>;
        size: z.ZodOptional<z.ZodObject<{
            width: z.ZodNumber;
            height: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            width: number;
            height: number;
        }, {
            width: number;
            height: number;
        }>>;
    }, "strip", z.ZodTypeAny, {
        mode: "off" | "on" | "retain-on-failure" | "on-first-retry";
        size?: {
            width: number;
            height: number;
        } | undefined;
    }, {
        mode?: "off" | "on" | "retain-on-failure" | "on-first-retry" | undefined;
        size?: {
            width: number;
            height: number;
        } | undefined;
    }>>;
    trace: z.ZodDefault<z.ZodObject<{
        mode: z.ZodDefault<z.ZodEnum<["off", "on", "retain-on-failure", "on-first-retry"]>>;
        screenshots: z.ZodDefault<z.ZodBoolean>;
        snapshots: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        mode: "off" | "on" | "retain-on-failure" | "on-first-retry";
        screenshots: boolean;
        snapshots: boolean;
    }, {
        mode?: "off" | "on" | "retain-on-failure" | "on-first-retry" | undefined;
        screenshots?: boolean | undefined;
        snapshots?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    screenshots: {
        mode: "off" | "on" | "only-on-failure";
        fullPage: boolean;
        maskPii: boolean;
        piiSelectors: string[];
    };
    outputDir: string;
    video: {
        mode: "off" | "on" | "retain-on-failure" | "on-first-retry";
        size?: {
            width: number;
            height: number;
        } | undefined;
    };
    trace: {
        mode: "off" | "on" | "retain-on-failure" | "on-first-retry";
        screenshots: boolean;
        snapshots: boolean;
    };
}, {
    screenshots?: {
        mode?: "off" | "on" | "only-on-failure" | undefined;
        fullPage?: boolean | undefined;
        maskPii?: boolean | undefined;
        piiSelectors?: string[] | undefined;
    } | undefined;
    outputDir?: string | undefined;
    video?: {
        mode?: "off" | "on" | "retain-on-failure" | "on-first-retry" | undefined;
        size?: {
            width: number;
            height: number;
        } | undefined;
    } | undefined;
    trace?: {
        mode?: "off" | "on" | "retain-on-failure" | "on-first-retry" | undefined;
        screenshots?: boolean | undefined;
        snapshots?: boolean | undefined;
    } | undefined;
}>;
/** Viewport size schema */
export declare const ViewportSizeSchema: z.ZodObject<{
    width: z.ZodNumber;
    height: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    width: number;
    height: number;
}, {
    width: number;
    height: number;
}>;
/** Browsers configuration schema */
export declare const BrowsersConfigSchema: z.ZodEffects<z.ZodObject<{
    enabled: z.ZodDefault<z.ZodArray<z.ZodEnum<["chromium", "firefox", "webkit"]>, "many">>;
    channel: z.ZodDefault<z.ZodOptional<z.ZodEnum<["bundled", "msedge", "chrome", "chrome-beta", "chrome-dev"]>>>;
    strategy: z.ZodDefault<z.ZodOptional<z.ZodEnum<["auto", "prefer-bundled", "prefer-system", "bundled-only", "system-only"]>>>;
    viewport: z.ZodDefault<z.ZodObject<{
        width: z.ZodNumber;
        height: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        width: number;
        height: number;
    }, {
        width: number;
        height: number;
    }>>;
    headless: z.ZodDefault<z.ZodBoolean>;
    slowMo: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    enabled: ("chromium" | "firefox" | "webkit")[];
    strategy: "auto" | "prefer-bundled" | "prefer-system" | "bundled-only" | "system-only";
    channel: "bundled" | "msedge" | "chrome" | "chrome-beta" | "chrome-dev";
    viewport: {
        width: number;
        height: number;
    };
    headless: boolean;
    slowMo?: number | undefined;
}, {
    enabled?: ("chromium" | "firefox" | "webkit")[] | undefined;
    strategy?: "auto" | "prefer-bundled" | "prefer-system" | "bundled-only" | "system-only" | undefined;
    channel?: "bundled" | "msedge" | "chrome" | "chrome-beta" | "chrome-dev" | undefined;
    viewport?: {
        width: number;
        height: number;
    } | undefined;
    headless?: boolean | undefined;
    slowMo?: number | undefined;
}>, {
    enabled: ("chromium" | "firefox" | "webkit")[];
    strategy: "auto" | "prefer-bundled" | "prefer-system" | "bundled-only" | "system-only";
    channel: "bundled" | "msedge" | "chrome" | "chrome-beta" | "chrome-dev";
    viewport: {
        width: number;
        height: number;
    };
    headless: boolean;
    slowMo?: number | undefined;
}, {
    enabled?: ("chromium" | "firefox" | "webkit")[] | undefined;
    strategy?: "auto" | "prefer-bundled" | "prefer-system" | "bundled-only" | "system-only" | undefined;
    channel?: "bundled" | "msedge" | "chrome" | "chrome-beta" | "chrome-dev" | undefined;
    viewport?: {
        width: number;
        height: number;
    } | undefined;
    headless?: boolean | undefined;
    slowMo?: number | undefined;
}>;
/** Journey ID configuration schema */
export declare const JourneyIdConfigSchema: z.ZodObject<{
    prefix: z.ZodDefault<z.ZodString>;
    width: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    prefix: string;
    width: number;
}, {
    prefix?: string | undefined;
    width?: number | undefined;
}>;
/** Journey backlog configuration schema */
export declare const JourneyBacklogConfigSchema: z.ZodObject<{
    groupBy: z.ZodDefault<z.ZodEnum<["tier", "status", "scope"]>>;
    thenBy: z.ZodOptional<z.ZodEnum<["tier", "status", "scope"]>>;
}, "strip", z.ZodTypeAny, {
    groupBy: "tier" | "status" | "scope";
    thenBy?: "tier" | "status" | "scope" | undefined;
}, {
    groupBy?: "tier" | "status" | "scope" | undefined;
    thenBy?: "tier" | "status" | "scope" | undefined;
}>;
/** Journeys configuration schema */
export declare const JourneysConfigSchema: z.ZodObject<{
    id: z.ZodDefault<z.ZodObject<{
        prefix: z.ZodDefault<z.ZodString>;
        width: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        prefix: string;
        width: number;
    }, {
        prefix?: string | undefined;
        width?: number | undefined;
    }>>;
    layout: z.ZodDefault<z.ZodEnum<["flat", "staged"]>>;
    backlog: z.ZodDefault<z.ZodObject<{
        groupBy: z.ZodDefault<z.ZodEnum<["tier", "status", "scope"]>>;
        thenBy: z.ZodOptional<z.ZodEnum<["tier", "status", "scope"]>>;
    }, "strip", z.ZodTypeAny, {
        groupBy: "tier" | "status" | "scope";
        thenBy?: "tier" | "status" | "scope" | undefined;
    }, {
        groupBy?: "tier" | "status" | "scope" | undefined;
        thenBy?: "tier" | "status" | "scope" | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    id: {
        prefix: string;
        width: number;
    };
    layout: "flat" | "staged";
    backlog: {
        groupBy: "tier" | "status" | "scope";
        thenBy?: "tier" | "status" | "scope" | undefined;
    };
}, {
    id?: {
        prefix?: string | undefined;
        width?: number | undefined;
    } | undefined;
    layout?: "flat" | "staged" | undefined;
    backlog?: {
        groupBy?: "tier" | "status" | "scope" | undefined;
        thenBy?: "tier" | "status" | "scope" | undefined;
    } | undefined;
}>;
/**
 * Root configuration schema with all validation rules
 *
 * Validates:
 * - version must equal SUPPORTED_CONFIG_VERSION (currently 1)
 * - app.baseUrl must be present (validated after env var resolution)
 * - auth.roles must have at least one role
 * - activeEnvironment must match a key in environments or be env var template
 * - Provider-specific configuration must be present
 */
export declare const ARTKConfigSchema: z.ZodEffects<z.ZodObject<{
    version: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    app: z.ZodObject<{
        name: z.ZodString;
        baseUrl: z.ZodString;
        type: z.ZodDefault<z.ZodEnum<["spa", "ssr", "hybrid"]>>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        baseUrl: string;
        type: "spa" | "ssr" | "hybrid";
    }, {
        name: string;
        baseUrl: string;
        type?: "spa" | "ssr" | "hybrid" | undefined;
    }>;
    environments: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodObject<{
        baseUrl: z.ZodString;
        apiUrl: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        baseUrl: string;
        apiUrl?: string | undefined;
    }, {
        baseUrl: string;
        apiUrl?: string | undefined;
    }>>>;
    activeEnvironment: z.ZodDefault<z.ZodString>;
    auth: z.ZodEffects<z.ZodObject<{
        provider: z.ZodEnum<["oidc", "form", "token", "custom"]>;
        storageState: z.ZodDefault<z.ZodObject<{
            directory: z.ZodDefault<z.ZodString>;
            maxAgeMinutes: z.ZodDefault<z.ZodNumber>;
            filePattern: z.ZodDefault<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            directory: string;
            maxAgeMinutes: number;
            filePattern: string;
        }, {
            directory?: string | undefined;
            maxAgeMinutes?: number | undefined;
            filePattern?: string | undefined;
        }>>;
        roles: z.ZodEffects<z.ZodRecord<z.ZodString, z.ZodObject<{
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
            description: z.ZodOptional<z.ZodString>;
            oidcOverrides: z.ZodOptional<z.ZodOptional<z.ZodObject<{
                idpType: z.ZodEnum<["keycloak", "azure-ad", "okta", "auth0", "generic"]>;
                loginUrl: z.ZodString;
                idpLoginUrl: z.ZodOptional<z.ZodString>;
                success: z.ZodEffects<z.ZodObject<{
                    url: z.ZodOptional<z.ZodString>;
                    selector: z.ZodOptional<z.ZodString>;
                    timeout: z.ZodDefault<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    timeout: number;
                    url?: string | undefined;
                    selector?: string | undefined;
                }, {
                    url?: string | undefined;
                    selector?: string | undefined;
                    timeout?: number | undefined;
                }>, {
                    timeout: number;
                    url?: string | undefined;
                    selector?: string | undefined;
                }, {
                    url?: string | undefined;
                    selector?: string | undefined;
                    timeout?: number | undefined;
                }>;
                idpSelectors: z.ZodOptional<z.ZodObject<{
                    username: z.ZodOptional<z.ZodString>;
                    password: z.ZodOptional<z.ZodString>;
                    submit: z.ZodOptional<z.ZodString>;
                    staySignedInNo: z.ZodOptional<z.ZodString>;
                }, "strip", z.ZodTypeAny, {
                    username?: string | undefined;
                    password?: string | undefined;
                    submit?: string | undefined;
                    staySignedInNo?: string | undefined;
                }, {
                    username?: string | undefined;
                    password?: string | undefined;
                    submit?: string | undefined;
                    staySignedInNo?: string | undefined;
                }>>;
                mfa: z.ZodOptional<z.ZodObject<{
                    enabled: z.ZodDefault<z.ZodBoolean>;
                    type: z.ZodDefault<z.ZodEnum<["totp", "push", "sms", "none"]>>;
                    totpSecretEnv: z.ZodOptional<z.ZodString>;
                    pushTimeoutMs: z.ZodDefault<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    enabled: boolean;
                    type: "none" | "totp" | "push" | "sms";
                    pushTimeoutMs: number;
                    totpSecretEnv?: string | undefined;
                }, {
                    enabled?: boolean | undefined;
                    type?: "none" | "totp" | "push" | "sms" | undefined;
                    totpSecretEnv?: string | undefined;
                    pushTimeoutMs?: number | undefined;
                }>>;
                timeouts: z.ZodOptional<z.ZodObject<{
                    loginFlowMs: z.ZodDefault<z.ZodNumber>;
                    idpRedirectMs: z.ZodDefault<z.ZodNumber>;
                    callbackMs: z.ZodDefault<z.ZodNumber>;
                }, "strip", z.ZodTypeAny, {
                    loginFlowMs: number;
                    idpRedirectMs: number;
                    callbackMs: number;
                }, {
                    loginFlowMs?: number | undefined;
                    idpRedirectMs?: number | undefined;
                    callbackMs?: number | undefined;
                }>>;
                logout: z.ZodOptional<z.ZodObject<{
                    url: z.ZodOptional<z.ZodString>;
                    idpLogout: z.ZodOptional<z.ZodBoolean>;
                }, "strip", z.ZodTypeAny, {
                    url?: string | undefined;
                    idpLogout?: boolean | undefined;
                }, {
                    url?: string | undefined;
                    idpLogout?: boolean | undefined;
                }>>;
            }, "strip", z.ZodTypeAny, {
                idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
                loginUrl: string;
                success: {
                    timeout: number;
                    url?: string | undefined;
                    selector?: string | undefined;
                };
                mfa?: {
                    enabled: boolean;
                    type: "none" | "totp" | "push" | "sms";
                    pushTimeoutMs: number;
                    totpSecretEnv?: string | undefined;
                } | undefined;
                idpLoginUrl?: string | undefined;
                idpSelectors?: {
                    username?: string | undefined;
                    password?: string | undefined;
                    submit?: string | undefined;
                    staySignedInNo?: string | undefined;
                } | undefined;
                timeouts?: {
                    loginFlowMs: number;
                    idpRedirectMs: number;
                    callbackMs: number;
                } | undefined;
                logout?: {
                    url?: string | undefined;
                    idpLogout?: boolean | undefined;
                } | undefined;
            }, {
                idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
                loginUrl: string;
                success: {
                    url?: string | undefined;
                    selector?: string | undefined;
                    timeout?: number | undefined;
                };
                mfa?: {
                    enabled?: boolean | undefined;
                    type?: "none" | "totp" | "push" | "sms" | undefined;
                    totpSecretEnv?: string | undefined;
                    pushTimeoutMs?: number | undefined;
                } | undefined;
                idpLoginUrl?: string | undefined;
                idpSelectors?: {
                    username?: string | undefined;
                    password?: string | undefined;
                    submit?: string | undefined;
                    staySignedInNo?: string | undefined;
                } | undefined;
                timeouts?: {
                    loginFlowMs?: number | undefined;
                    idpRedirectMs?: number | undefined;
                    callbackMs?: number | undefined;
                } | undefined;
                logout?: {
                    url?: string | undefined;
                    idpLogout?: boolean | undefined;
                } | undefined;
            }>>>;
        }, "strip", z.ZodTypeAny, {
            credentialsEnv: {
                username: string;
                password: string;
            };
            description?: string | undefined;
            oidcOverrides?: {
                idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
                loginUrl: string;
                success: {
                    timeout: number;
                    url?: string | undefined;
                    selector?: string | undefined;
                };
                mfa?: {
                    enabled: boolean;
                    type: "none" | "totp" | "push" | "sms";
                    pushTimeoutMs: number;
                    totpSecretEnv?: string | undefined;
                } | undefined;
                idpLoginUrl?: string | undefined;
                idpSelectors?: {
                    username?: string | undefined;
                    password?: string | undefined;
                    submit?: string | undefined;
                    staySignedInNo?: string | undefined;
                } | undefined;
                timeouts?: {
                    loginFlowMs: number;
                    idpRedirectMs: number;
                    callbackMs: number;
                } | undefined;
                logout?: {
                    url?: string | undefined;
                    idpLogout?: boolean | undefined;
                } | undefined;
            } | undefined;
        }, {
            credentialsEnv: {
                username: string;
                password: string;
            };
            description?: string | undefined;
            oidcOverrides?: {
                idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
                loginUrl: string;
                success: {
                    url?: string | undefined;
                    selector?: string | undefined;
                    timeout?: number | undefined;
                };
                mfa?: {
                    enabled?: boolean | undefined;
                    type?: "none" | "totp" | "push" | "sms" | undefined;
                    totpSecretEnv?: string | undefined;
                    pushTimeoutMs?: number | undefined;
                } | undefined;
                idpLoginUrl?: string | undefined;
                idpSelectors?: {
                    username?: string | undefined;
                    password?: string | undefined;
                    submit?: string | undefined;
                    staySignedInNo?: string | undefined;
                } | undefined;
                timeouts?: {
                    loginFlowMs?: number | undefined;
                    idpRedirectMs?: number | undefined;
                    callbackMs?: number | undefined;
                } | undefined;
                logout?: {
                    url?: string | undefined;
                    idpLogout?: boolean | undefined;
                } | undefined;
            } | undefined;
        }>>, Record<string, {
            credentialsEnv: {
                username: string;
                password: string;
            };
            description?: string | undefined;
            oidcOverrides?: {
                idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
                loginUrl: string;
                success: {
                    timeout: number;
                    url?: string | undefined;
                    selector?: string | undefined;
                };
                mfa?: {
                    enabled: boolean;
                    type: "none" | "totp" | "push" | "sms";
                    pushTimeoutMs: number;
                    totpSecretEnv?: string | undefined;
                } | undefined;
                idpLoginUrl?: string | undefined;
                idpSelectors?: {
                    username?: string | undefined;
                    password?: string | undefined;
                    submit?: string | undefined;
                    staySignedInNo?: string | undefined;
                } | undefined;
                timeouts?: {
                    loginFlowMs: number;
                    idpRedirectMs: number;
                    callbackMs: number;
                } | undefined;
                logout?: {
                    url?: string | undefined;
                    idpLogout?: boolean | undefined;
                } | undefined;
            } | undefined;
        }>, Record<string, {
            credentialsEnv: {
                username: string;
                password: string;
            };
            description?: string | undefined;
            oidcOverrides?: {
                idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
                loginUrl: string;
                success: {
                    url?: string | undefined;
                    selector?: string | undefined;
                    timeout?: number | undefined;
                };
                mfa?: {
                    enabled?: boolean | undefined;
                    type?: "none" | "totp" | "push" | "sms" | undefined;
                    totpSecretEnv?: string | undefined;
                    pushTimeoutMs?: number | undefined;
                } | undefined;
                idpLoginUrl?: string | undefined;
                idpSelectors?: {
                    username?: string | undefined;
                    password?: string | undefined;
                    submit?: string | undefined;
                    staySignedInNo?: string | undefined;
                } | undefined;
                timeouts?: {
                    loginFlowMs?: number | undefined;
                    idpRedirectMs?: number | undefined;
                    callbackMs?: number | undefined;
                } | undefined;
                logout?: {
                    url?: string | undefined;
                    idpLogout?: boolean | undefined;
                } | undefined;
            } | undefined;
        }>>;
        bypass: z.ZodOptional<z.ZodObject<{
            mode: z.ZodDefault<z.ZodEnum<["none", "identityless", "mock-identity", "unknown"]>>;
            toggle: z.ZodOptional<z.ZodString>;
            environments: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            mode: "none" | "identityless" | "mock-identity" | "unknown";
            toggle?: string | undefined;
            environments?: string[] | undefined;
        }, {
            mode?: "none" | "identityless" | "mock-identity" | "unknown" | undefined;
            toggle?: string | undefined;
            environments?: string[] | undefined;
        }>>;
        oidc: z.ZodOptional<z.ZodObject<{
            idpType: z.ZodEnum<["keycloak", "azure-ad", "okta", "auth0", "generic"]>;
            loginUrl: z.ZodString;
            idpLoginUrl: z.ZodOptional<z.ZodString>;
            success: z.ZodEffects<z.ZodObject<{
                url: z.ZodOptional<z.ZodString>;
                selector: z.ZodOptional<z.ZodString>;
                timeout: z.ZodDefault<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                timeout: number;
                url?: string | undefined;
                selector?: string | undefined;
            }, {
                url?: string | undefined;
                selector?: string | undefined;
                timeout?: number | undefined;
            }>, {
                timeout: number;
                url?: string | undefined;
                selector?: string | undefined;
            }, {
                url?: string | undefined;
                selector?: string | undefined;
                timeout?: number | undefined;
            }>;
            idpSelectors: z.ZodOptional<z.ZodObject<{
                username: z.ZodOptional<z.ZodString>;
                password: z.ZodOptional<z.ZodString>;
                submit: z.ZodOptional<z.ZodString>;
                staySignedInNo: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                username?: string | undefined;
                password?: string | undefined;
                submit?: string | undefined;
                staySignedInNo?: string | undefined;
            }, {
                username?: string | undefined;
                password?: string | undefined;
                submit?: string | undefined;
                staySignedInNo?: string | undefined;
            }>>;
            mfa: z.ZodOptional<z.ZodObject<{
                enabled: z.ZodDefault<z.ZodBoolean>;
                type: z.ZodDefault<z.ZodEnum<["totp", "push", "sms", "none"]>>;
                totpSecretEnv: z.ZodOptional<z.ZodString>;
                pushTimeoutMs: z.ZodDefault<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                enabled: boolean;
                type: "none" | "totp" | "push" | "sms";
                pushTimeoutMs: number;
                totpSecretEnv?: string | undefined;
            }, {
                enabled?: boolean | undefined;
                type?: "none" | "totp" | "push" | "sms" | undefined;
                totpSecretEnv?: string | undefined;
                pushTimeoutMs?: number | undefined;
            }>>;
            timeouts: z.ZodOptional<z.ZodObject<{
                loginFlowMs: z.ZodDefault<z.ZodNumber>;
                idpRedirectMs: z.ZodDefault<z.ZodNumber>;
                callbackMs: z.ZodDefault<z.ZodNumber>;
            }, "strip", z.ZodTypeAny, {
                loginFlowMs: number;
                idpRedirectMs: number;
                callbackMs: number;
            }, {
                loginFlowMs?: number | undefined;
                idpRedirectMs?: number | undefined;
                callbackMs?: number | undefined;
            }>>;
            logout: z.ZodOptional<z.ZodObject<{
                url: z.ZodOptional<z.ZodString>;
                idpLogout: z.ZodOptional<z.ZodBoolean>;
            }, "strip", z.ZodTypeAny, {
                url?: string | undefined;
                idpLogout?: boolean | undefined;
            }, {
                url?: string | undefined;
                idpLogout?: boolean | undefined;
            }>>;
        }, "strip", z.ZodTypeAny, {
            idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
            loginUrl: string;
            success: {
                timeout: number;
                url?: string | undefined;
                selector?: string | undefined;
            };
            mfa?: {
                enabled: boolean;
                type: "none" | "totp" | "push" | "sms";
                pushTimeoutMs: number;
                totpSecretEnv?: string | undefined;
            } | undefined;
            idpLoginUrl?: string | undefined;
            idpSelectors?: {
                username?: string | undefined;
                password?: string | undefined;
                submit?: string | undefined;
                staySignedInNo?: string | undefined;
            } | undefined;
            timeouts?: {
                loginFlowMs: number;
                idpRedirectMs: number;
                callbackMs: number;
            } | undefined;
            logout?: {
                url?: string | undefined;
                idpLogout?: boolean | undefined;
            } | undefined;
        }, {
            idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
            loginUrl: string;
            success: {
                url?: string | undefined;
                selector?: string | undefined;
                timeout?: number | undefined;
            };
            mfa?: {
                enabled?: boolean | undefined;
                type?: "none" | "totp" | "push" | "sms" | undefined;
                totpSecretEnv?: string | undefined;
                pushTimeoutMs?: number | undefined;
            } | undefined;
            idpLoginUrl?: string | undefined;
            idpSelectors?: {
                username?: string | undefined;
                password?: string | undefined;
                submit?: string | undefined;
                staySignedInNo?: string | undefined;
            } | undefined;
            timeouts?: {
                loginFlowMs?: number | undefined;
                idpRedirectMs?: number | undefined;
                callbackMs?: number | undefined;
            } | undefined;
            logout?: {
                url?: string | undefined;
                idpLogout?: boolean | undefined;
            } | undefined;
        }>>;
        form: z.ZodOptional<z.ZodObject<{
            loginUrl: z.ZodString;
            selectors: z.ZodObject<{
                username: z.ZodString;
                password: z.ZodString;
                submit: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                username: string;
                password: string;
                submit: string;
            }, {
                username: string;
                password: string;
                submit: string;
            }>;
            success: z.ZodObject<{
                url: z.ZodOptional<z.ZodString>;
                selector: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                url?: string | undefined;
                selector?: string | undefined;
            }, {
                url?: string | undefined;
                selector?: string | undefined;
            }>;
        }, "strip", z.ZodTypeAny, {
            loginUrl: string;
            success: {
                url?: string | undefined;
                selector?: string | undefined;
            };
            selectors: {
                username: string;
                password: string;
                submit: string;
            };
        }, {
            loginUrl: string;
            success: {
                url?: string | undefined;
                selector?: string | undefined;
            };
            selectors: {
                username: string;
                password: string;
                submit: string;
            };
        }>>;
    }, "strip", z.ZodTypeAny, {
        provider: "oidc" | "form" | "token" | "custom";
        storageState: {
            directory: string;
            maxAgeMinutes: number;
            filePattern: string;
        };
        roles: Record<string, {
            credentialsEnv: {
                username: string;
                password: string;
            };
            description?: string | undefined;
            oidcOverrides?: {
                idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
                loginUrl: string;
                success: {
                    timeout: number;
                    url?: string | undefined;
                    selector?: string | undefined;
                };
                mfa?: {
                    enabled: boolean;
                    type: "none" | "totp" | "push" | "sms";
                    pushTimeoutMs: number;
                    totpSecretEnv?: string | undefined;
                } | undefined;
                idpLoginUrl?: string | undefined;
                idpSelectors?: {
                    username?: string | undefined;
                    password?: string | undefined;
                    submit?: string | undefined;
                    staySignedInNo?: string | undefined;
                } | undefined;
                timeouts?: {
                    loginFlowMs: number;
                    idpRedirectMs: number;
                    callbackMs: number;
                } | undefined;
                logout?: {
                    url?: string | undefined;
                    idpLogout?: boolean | undefined;
                } | undefined;
            } | undefined;
        }>;
        oidc?: {
            idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
            loginUrl: string;
            success: {
                timeout: number;
                url?: string | undefined;
                selector?: string | undefined;
            };
            mfa?: {
                enabled: boolean;
                type: "none" | "totp" | "push" | "sms";
                pushTimeoutMs: number;
                totpSecretEnv?: string | undefined;
            } | undefined;
            idpLoginUrl?: string | undefined;
            idpSelectors?: {
                username?: string | undefined;
                password?: string | undefined;
                submit?: string | undefined;
                staySignedInNo?: string | undefined;
            } | undefined;
            timeouts?: {
                loginFlowMs: number;
                idpRedirectMs: number;
                callbackMs: number;
            } | undefined;
            logout?: {
                url?: string | undefined;
                idpLogout?: boolean | undefined;
            } | undefined;
        } | undefined;
        form?: {
            loginUrl: string;
            success: {
                url?: string | undefined;
                selector?: string | undefined;
            };
            selectors: {
                username: string;
                password: string;
                submit: string;
            };
        } | undefined;
        bypass?: {
            mode: "none" | "identityless" | "mock-identity" | "unknown";
            toggle?: string | undefined;
            environments?: string[] | undefined;
        } | undefined;
    }, {
        provider: "oidc" | "form" | "token" | "custom";
        roles: Record<string, {
            credentialsEnv: {
                username: string;
                password: string;
            };
            description?: string | undefined;
            oidcOverrides?: {
                idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
                loginUrl: string;
                success: {
                    url?: string | undefined;
                    selector?: string | undefined;
                    timeout?: number | undefined;
                };
                mfa?: {
                    enabled?: boolean | undefined;
                    type?: "none" | "totp" | "push" | "sms" | undefined;
                    totpSecretEnv?: string | undefined;
                    pushTimeoutMs?: number | undefined;
                } | undefined;
                idpLoginUrl?: string | undefined;
                idpSelectors?: {
                    username?: string | undefined;
                    password?: string | undefined;
                    submit?: string | undefined;
                    staySignedInNo?: string | undefined;
                } | undefined;
                timeouts?: {
                    loginFlowMs?: number | undefined;
                    idpRedirectMs?: number | undefined;
                    callbackMs?: number | undefined;
                } | undefined;
                logout?: {
                    url?: string | undefined;
                    idpLogout?: boolean | undefined;
                } | undefined;
            } | undefined;
        }>;
        oidc?: {
            idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
            loginUrl: string;
            success: {
                url?: string | undefined;
                selector?: string | undefined;
                timeout?: number | undefined;
            };
            mfa?: {
                enabled?: boolean | undefined;
                type?: "none" | "totp" | "push" | "sms" | undefined;
                totpSecretEnv?: string | undefined;
                pushTimeoutMs?: number | undefined;
            } | undefined;
            idpLoginUrl?: string | undefined;
            idpSelectors?: {
                username?: string | undefined;
                password?: string | undefined;
                submit?: string | undefined;
                staySignedInNo?: string | undefined;
            } | undefined;
            timeouts?: {
                loginFlowMs?: number | undefined;
                idpRedirectMs?: number | undefined;
                callbackMs?: number | undefined;
            } | undefined;
            logout?: {
                url?: string | undefined;
                idpLogout?: boolean | undefined;
            } | undefined;
        } | undefined;
        form?: {
            loginUrl: string;
            success: {
                url?: string | undefined;
                selector?: string | undefined;
            };
            selectors: {
                username: string;
                password: string;
                submit: string;
            };
        } | undefined;
        storageState?: {
            directory?: string | undefined;
            maxAgeMinutes?: number | undefined;
            filePattern?: string | undefined;
        } | undefined;
        bypass?: {
            mode?: "none" | "identityless" | "mock-identity" | "unknown" | undefined;
            toggle?: string | undefined;
            environments?: string[] | undefined;
        } | undefined;
    }>, {
        provider: "oidc" | "form" | "token" | "custom";
        storageState: {
            directory: string;
            maxAgeMinutes: number;
            filePattern: string;
        };
        roles: Record<string, {
            credentialsEnv: {
                username: string;
                password: string;
            };
            description?: string | undefined;
            oidcOverrides?: {
                idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
                loginUrl: string;
                success: {
                    timeout: number;
                    url?: string | undefined;
                    selector?: string | undefined;
                };
                mfa?: {
                    enabled: boolean;
                    type: "none" | "totp" | "push" | "sms";
                    pushTimeoutMs: number;
                    totpSecretEnv?: string | undefined;
                } | undefined;
                idpLoginUrl?: string | undefined;
                idpSelectors?: {
                    username?: string | undefined;
                    password?: string | undefined;
                    submit?: string | undefined;
                    staySignedInNo?: string | undefined;
                } | undefined;
                timeouts?: {
                    loginFlowMs: number;
                    idpRedirectMs: number;
                    callbackMs: number;
                } | undefined;
                logout?: {
                    url?: string | undefined;
                    idpLogout?: boolean | undefined;
                } | undefined;
            } | undefined;
        }>;
        oidc?: {
            idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
            loginUrl: string;
            success: {
                timeout: number;
                url?: string | undefined;
                selector?: string | undefined;
            };
            mfa?: {
                enabled: boolean;
                type: "none" | "totp" | "push" | "sms";
                pushTimeoutMs: number;
                totpSecretEnv?: string | undefined;
            } | undefined;
            idpLoginUrl?: string | undefined;
            idpSelectors?: {
                username?: string | undefined;
                password?: string | undefined;
                submit?: string | undefined;
                staySignedInNo?: string | undefined;
            } | undefined;
            timeouts?: {
                loginFlowMs: number;
                idpRedirectMs: number;
                callbackMs: number;
            } | undefined;
            logout?: {
                url?: string | undefined;
                idpLogout?: boolean | undefined;
            } | undefined;
        } | undefined;
        form?: {
            loginUrl: string;
            success: {
                url?: string | undefined;
                selector?: string | undefined;
            };
            selectors: {
                username: string;
                password: string;
                submit: string;
            };
        } | undefined;
        bypass?: {
            mode: "none" | "identityless" | "mock-identity" | "unknown";
            toggle?: string | undefined;
            environments?: string[] | undefined;
        } | undefined;
    }, {
        provider: "oidc" | "form" | "token" | "custom";
        roles: Record<string, {
            credentialsEnv: {
                username: string;
                password: string;
            };
            description?: string | undefined;
            oidcOverrides?: {
                idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
                loginUrl: string;
                success: {
                    url?: string | undefined;
                    selector?: string | undefined;
                    timeout?: number | undefined;
                };
                mfa?: {
                    enabled?: boolean | undefined;
                    type?: "none" | "totp" | "push" | "sms" | undefined;
                    totpSecretEnv?: string | undefined;
                    pushTimeoutMs?: number | undefined;
                } | undefined;
                idpLoginUrl?: string | undefined;
                idpSelectors?: {
                    username?: string | undefined;
                    password?: string | undefined;
                    submit?: string | undefined;
                    staySignedInNo?: string | undefined;
                } | undefined;
                timeouts?: {
                    loginFlowMs?: number | undefined;
                    idpRedirectMs?: number | undefined;
                    callbackMs?: number | undefined;
                } | undefined;
                logout?: {
                    url?: string | undefined;
                    idpLogout?: boolean | undefined;
                } | undefined;
            } | undefined;
        }>;
        oidc?: {
            idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
            loginUrl: string;
            success: {
                url?: string | undefined;
                selector?: string | undefined;
                timeout?: number | undefined;
            };
            mfa?: {
                enabled?: boolean | undefined;
                type?: "none" | "totp" | "push" | "sms" | undefined;
                totpSecretEnv?: string | undefined;
                pushTimeoutMs?: number | undefined;
            } | undefined;
            idpLoginUrl?: string | undefined;
            idpSelectors?: {
                username?: string | undefined;
                password?: string | undefined;
                submit?: string | undefined;
                staySignedInNo?: string | undefined;
            } | undefined;
            timeouts?: {
                loginFlowMs?: number | undefined;
                idpRedirectMs?: number | undefined;
                callbackMs?: number | undefined;
            } | undefined;
            logout?: {
                url?: string | undefined;
                idpLogout?: boolean | undefined;
            } | undefined;
        } | undefined;
        form?: {
            loginUrl: string;
            success: {
                url?: string | undefined;
                selector?: string | undefined;
            };
            selectors: {
                username: string;
                password: string;
                submit: string;
            };
        } | undefined;
        storageState?: {
            directory?: string | undefined;
            maxAgeMinutes?: number | undefined;
            filePattern?: string | undefined;
        } | undefined;
        bypass?: {
            mode?: "none" | "identityless" | "mock-identity" | "unknown" | undefined;
            toggle?: string | undefined;
            environments?: string[] | undefined;
        } | undefined;
    }>;
    selectors: z.ZodDefault<z.ZodObject<{
        testIdAttribute: z.ZodDefault<z.ZodString>;
        strategy: z.ZodDefault<z.ZodArray<z.ZodEnum<["role", "label", "placeholder", "testid", "text", "css"]>, "many">>;
        customTestIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        testIdAttribute: string;
        strategy: ("role" | "label" | "placeholder" | "testid" | "text" | "css")[];
        customTestIds?: string[] | undefined;
    }, {
        testIdAttribute?: string | undefined;
        strategy?: ("role" | "label" | "placeholder" | "testid" | "text" | "css")[] | undefined;
        customTestIds?: string[] | undefined;
    }>>;
    assertions: z.ZodDefault<z.ZodObject<{
        toast: z.ZodDefault<z.ZodObject<{
            containerSelector: z.ZodString;
            messageSelector: z.ZodString;
            typeAttribute: z.ZodString;
            timeout: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            timeout: number;
            containerSelector: string;
            messageSelector: string;
            typeAttribute: string;
        }, {
            containerSelector: string;
            messageSelector: string;
            typeAttribute: string;
            timeout?: number | undefined;
        }>>;
        loading: z.ZodDefault<z.ZodObject<{
            selectors: z.ZodArray<z.ZodString, "many">;
            timeout: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            timeout: number;
            selectors: string[];
        }, {
            selectors: string[];
            timeout?: number | undefined;
        }>>;
        form: z.ZodDefault<z.ZodObject<{
            errorSelector: z.ZodString;
            formErrorSelector: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            errorSelector: string;
            formErrorSelector: string;
        }, {
            errorSelector: string;
            formErrorSelector: string;
        }>>;
    }, "strip", z.ZodTypeAny, {
        form: {
            errorSelector: string;
            formErrorSelector: string;
        };
        toast: {
            timeout: number;
            containerSelector: string;
            messageSelector: string;
            typeAttribute: string;
        };
        loading: {
            timeout: number;
            selectors: string[];
        };
    }, {
        form?: {
            errorSelector: string;
            formErrorSelector: string;
        } | undefined;
        toast?: {
            containerSelector: string;
            messageSelector: string;
            typeAttribute: string;
            timeout?: number | undefined;
        } | undefined;
        loading?: {
            selectors: string[];
            timeout?: number | undefined;
        } | undefined;
    }>>;
    data: z.ZodDefault<z.ZodObject<{
        namespace: z.ZodDefault<z.ZodObject<{
            prefix: z.ZodDefault<z.ZodString>;
            suffix: z.ZodDefault<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            prefix: string;
            suffix: string;
        }, {
            prefix?: string | undefined;
            suffix?: string | undefined;
        }>>;
        cleanup: z.ZodDefault<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            onFailure: z.ZodDefault<z.ZodBoolean>;
            parallel: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            onFailure: boolean;
            parallel: boolean;
        }, {
            enabled?: boolean | undefined;
            onFailure?: boolean | undefined;
            parallel?: boolean | undefined;
        }>>;
        api: z.ZodOptional<z.ZodObject<{
            baseUrl: z.ZodString;
            useMainAuth: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            baseUrl: string;
            useMainAuth: boolean;
        }, {
            baseUrl: string;
            useMainAuth?: boolean | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        namespace: {
            prefix: string;
            suffix: string;
        };
        cleanup: {
            enabled: boolean;
            onFailure: boolean;
            parallel: boolean;
        };
        api?: {
            baseUrl: string;
            useMainAuth: boolean;
        } | undefined;
    }, {
        namespace?: {
            prefix?: string | undefined;
            suffix?: string | undefined;
        } | undefined;
        cleanup?: {
            enabled?: boolean | undefined;
            onFailure?: boolean | undefined;
            parallel?: boolean | undefined;
        } | undefined;
        api?: {
            baseUrl: string;
            useMainAuth?: boolean | undefined;
        } | undefined;
    }>>;
    fixtures: z.ZodObject<{
        defaultRole: z.ZodString;
        roleFixtures: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        api: z.ZodOptional<z.ZodObject<{
            baseURL: z.ZodString;
            extraHTTPHeaders: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
        }, "strip", z.ZodTypeAny, {
            baseURL: string;
            extraHTTPHeaders?: Record<string, string> | undefined;
        }, {
            baseURL: string;
            extraHTTPHeaders?: Record<string, string> | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        defaultRole: string;
        roleFixtures: string[];
        api?: {
            baseURL: string;
            extraHTTPHeaders?: Record<string, string> | undefined;
        } | undefined;
    }, {
        defaultRole: string;
        api?: {
            baseURL: string;
            extraHTTPHeaders?: Record<string, string> | undefined;
        } | undefined;
        roleFixtures?: string[] | undefined;
    }>;
    tiers: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodObject<{
        retries: z.ZodNumber;
        workers: z.ZodNumber;
        timeout: z.ZodNumber;
        tag: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        timeout: number;
        retries: number;
        workers: number;
        tag: string;
    }, {
        timeout: number;
        retries: number;
        workers: number;
        tag: string;
    }>>>;
    reporters: z.ZodDefault<z.ZodObject<{
        html: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            outputFolder: z.ZodDefault<z.ZodString>;
            open: z.ZodDefault<z.ZodEnum<["always", "never", "on-failure"]>>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            outputFolder: string;
            open: "always" | "never" | "on-failure";
        }, {
            enabled?: boolean | undefined;
            outputFolder?: string | undefined;
            open?: "always" | "never" | "on-failure" | undefined;
        }>>;
        json: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            outputFile: z.ZodDefault<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            outputFile: string;
        }, {
            enabled?: boolean | undefined;
            outputFile?: string | undefined;
        }>>;
        junit: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            outputFile: z.ZodDefault<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            outputFile: string;
        }, {
            enabled?: boolean | undefined;
            outputFile?: string | undefined;
        }>>;
        artk: z.ZodOptional<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            outputFile: z.ZodDefault<z.ZodString>;
            includeJourneyMapping: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            outputFile: string;
            includeJourneyMapping: boolean;
        }, {
            enabled?: boolean | undefined;
            outputFile?: string | undefined;
            includeJourneyMapping?: boolean | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        json?: {
            enabled: boolean;
            outputFile: string;
        } | undefined;
        html?: {
            enabled: boolean;
            outputFolder: string;
            open: "always" | "never" | "on-failure";
        } | undefined;
        junit?: {
            enabled: boolean;
            outputFile: string;
        } | undefined;
        artk?: {
            enabled: boolean;
            outputFile: string;
            includeJourneyMapping: boolean;
        } | undefined;
    }, {
        json?: {
            enabled?: boolean | undefined;
            outputFile?: string | undefined;
        } | undefined;
        html?: {
            enabled?: boolean | undefined;
            outputFolder?: string | undefined;
            open?: "always" | "never" | "on-failure" | undefined;
        } | undefined;
        junit?: {
            enabled?: boolean | undefined;
            outputFile?: string | undefined;
        } | undefined;
        artk?: {
            enabled?: boolean | undefined;
            outputFile?: string | undefined;
            includeJourneyMapping?: boolean | undefined;
        } | undefined;
    }>>;
    artifacts: z.ZodDefault<z.ZodObject<{
        outputDir: z.ZodDefault<z.ZodString>;
        screenshots: z.ZodDefault<z.ZodObject<{
            mode: z.ZodDefault<z.ZodEnum<["off", "on", "only-on-failure"]>>;
            fullPage: z.ZodDefault<z.ZodBoolean>;
            maskPii: z.ZodDefault<z.ZodBoolean>;
            piiSelectors: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            mode: "off" | "on" | "only-on-failure";
            fullPage: boolean;
            maskPii: boolean;
            piiSelectors: string[];
        }, {
            mode?: "off" | "on" | "only-on-failure" | undefined;
            fullPage?: boolean | undefined;
            maskPii?: boolean | undefined;
            piiSelectors?: string[] | undefined;
        }>>;
        video: z.ZodDefault<z.ZodObject<{
            mode: z.ZodDefault<z.ZodEnum<["off", "on", "retain-on-failure", "on-first-retry"]>>;
            size: z.ZodOptional<z.ZodObject<{
                width: z.ZodNumber;
                height: z.ZodNumber;
            }, "strip", z.ZodTypeAny, {
                width: number;
                height: number;
            }, {
                width: number;
                height: number;
            }>>;
        }, "strip", z.ZodTypeAny, {
            mode: "off" | "on" | "retain-on-failure" | "on-first-retry";
            size?: {
                width: number;
                height: number;
            } | undefined;
        }, {
            mode?: "off" | "on" | "retain-on-failure" | "on-first-retry" | undefined;
            size?: {
                width: number;
                height: number;
            } | undefined;
        }>>;
        trace: z.ZodDefault<z.ZodObject<{
            mode: z.ZodDefault<z.ZodEnum<["off", "on", "retain-on-failure", "on-first-retry"]>>;
            screenshots: z.ZodDefault<z.ZodBoolean>;
            snapshots: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            mode: "off" | "on" | "retain-on-failure" | "on-first-retry";
            screenshots: boolean;
            snapshots: boolean;
        }, {
            mode?: "off" | "on" | "retain-on-failure" | "on-first-retry" | undefined;
            screenshots?: boolean | undefined;
            snapshots?: boolean | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        screenshots: {
            mode: "off" | "on" | "only-on-failure";
            fullPage: boolean;
            maskPii: boolean;
            piiSelectors: string[];
        };
        outputDir: string;
        video: {
            mode: "off" | "on" | "retain-on-failure" | "on-first-retry";
            size?: {
                width: number;
                height: number;
            } | undefined;
        };
        trace: {
            mode: "off" | "on" | "retain-on-failure" | "on-first-retry";
            screenshots: boolean;
            snapshots: boolean;
        };
    }, {
        screenshots?: {
            mode?: "off" | "on" | "only-on-failure" | undefined;
            fullPage?: boolean | undefined;
            maskPii?: boolean | undefined;
            piiSelectors?: string[] | undefined;
        } | undefined;
        outputDir?: string | undefined;
        video?: {
            mode?: "off" | "on" | "retain-on-failure" | "on-first-retry" | undefined;
            size?: {
                width: number;
                height: number;
            } | undefined;
        } | undefined;
        trace?: {
            mode?: "off" | "on" | "retain-on-failure" | "on-first-retry" | undefined;
            screenshots?: boolean | undefined;
            snapshots?: boolean | undefined;
        } | undefined;
    }>>;
    browsers: z.ZodDefault<z.ZodEffects<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodArray<z.ZodEnum<["chromium", "firefox", "webkit"]>, "many">>;
        channel: z.ZodDefault<z.ZodOptional<z.ZodEnum<["bundled", "msedge", "chrome", "chrome-beta", "chrome-dev"]>>>;
        strategy: z.ZodDefault<z.ZodOptional<z.ZodEnum<["auto", "prefer-bundled", "prefer-system", "bundled-only", "system-only"]>>>;
        viewport: z.ZodDefault<z.ZodObject<{
            width: z.ZodNumber;
            height: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            width: number;
            height: number;
        }, {
            width: number;
            height: number;
        }>>;
        headless: z.ZodDefault<z.ZodBoolean>;
        slowMo: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        enabled: ("chromium" | "firefox" | "webkit")[];
        strategy: "auto" | "prefer-bundled" | "prefer-system" | "bundled-only" | "system-only";
        channel: "bundled" | "msedge" | "chrome" | "chrome-beta" | "chrome-dev";
        viewport: {
            width: number;
            height: number;
        };
        headless: boolean;
        slowMo?: number | undefined;
    }, {
        enabled?: ("chromium" | "firefox" | "webkit")[] | undefined;
        strategy?: "auto" | "prefer-bundled" | "prefer-system" | "bundled-only" | "system-only" | undefined;
        channel?: "bundled" | "msedge" | "chrome" | "chrome-beta" | "chrome-dev" | undefined;
        viewport?: {
            width: number;
            height: number;
        } | undefined;
        headless?: boolean | undefined;
        slowMo?: number | undefined;
    }>, {
        enabled: ("chromium" | "firefox" | "webkit")[];
        strategy: "auto" | "prefer-bundled" | "prefer-system" | "bundled-only" | "system-only";
        channel: "bundled" | "msedge" | "chrome" | "chrome-beta" | "chrome-dev";
        viewport: {
            width: number;
            height: number;
        };
        headless: boolean;
        slowMo?: number | undefined;
    }, {
        enabled?: ("chromium" | "firefox" | "webkit")[] | undefined;
        strategy?: "auto" | "prefer-bundled" | "prefer-system" | "bundled-only" | "system-only" | undefined;
        channel?: "bundled" | "msedge" | "chrome" | "chrome-beta" | "chrome-dev" | undefined;
        viewport?: {
            width: number;
            height: number;
        } | undefined;
        headless?: boolean | undefined;
        slowMo?: number | undefined;
    }>>;
    journeys: z.ZodDefault<z.ZodObject<{
        id: z.ZodDefault<z.ZodObject<{
            prefix: z.ZodDefault<z.ZodString>;
            width: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            prefix: string;
            width: number;
        }, {
            prefix?: string | undefined;
            width?: number | undefined;
        }>>;
        layout: z.ZodDefault<z.ZodEnum<["flat", "staged"]>>;
        backlog: z.ZodDefault<z.ZodObject<{
            groupBy: z.ZodDefault<z.ZodEnum<["tier", "status", "scope"]>>;
            thenBy: z.ZodOptional<z.ZodEnum<["tier", "status", "scope"]>>;
        }, "strip", z.ZodTypeAny, {
            groupBy: "tier" | "status" | "scope";
            thenBy?: "tier" | "status" | "scope" | undefined;
        }, {
            groupBy?: "tier" | "status" | "scope" | undefined;
            thenBy?: "tier" | "status" | "scope" | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        id: {
            prefix: string;
            width: number;
        };
        layout: "flat" | "staged";
        backlog: {
            groupBy: "tier" | "status" | "scope";
            thenBy?: "tier" | "status" | "scope" | undefined;
        };
    }, {
        id?: {
            prefix?: string | undefined;
            width?: number | undefined;
        } | undefined;
        layout?: "flat" | "staged" | undefined;
        backlog?: {
            groupBy?: "tier" | "status" | "scope" | undefined;
            thenBy?: "tier" | "status" | "scope" | undefined;
        } | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    auth: {
        provider: "oidc" | "form" | "token" | "custom";
        storageState: {
            directory: string;
            maxAgeMinutes: number;
            filePattern: string;
        };
        roles: Record<string, {
            credentialsEnv: {
                username: string;
                password: string;
            };
            description?: string | undefined;
            oidcOverrides?: {
                idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
                loginUrl: string;
                success: {
                    timeout: number;
                    url?: string | undefined;
                    selector?: string | undefined;
                };
                mfa?: {
                    enabled: boolean;
                    type: "none" | "totp" | "push" | "sms";
                    pushTimeoutMs: number;
                    totpSecretEnv?: string | undefined;
                } | undefined;
                idpLoginUrl?: string | undefined;
                idpSelectors?: {
                    username?: string | undefined;
                    password?: string | undefined;
                    submit?: string | undefined;
                    staySignedInNo?: string | undefined;
                } | undefined;
                timeouts?: {
                    loginFlowMs: number;
                    idpRedirectMs: number;
                    callbackMs: number;
                } | undefined;
                logout?: {
                    url?: string | undefined;
                    idpLogout?: boolean | undefined;
                } | undefined;
            } | undefined;
        }>;
        oidc?: {
            idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
            loginUrl: string;
            success: {
                timeout: number;
                url?: string | undefined;
                selector?: string | undefined;
            };
            mfa?: {
                enabled: boolean;
                type: "none" | "totp" | "push" | "sms";
                pushTimeoutMs: number;
                totpSecretEnv?: string | undefined;
            } | undefined;
            idpLoginUrl?: string | undefined;
            idpSelectors?: {
                username?: string | undefined;
                password?: string | undefined;
                submit?: string | undefined;
                staySignedInNo?: string | undefined;
            } | undefined;
            timeouts?: {
                loginFlowMs: number;
                idpRedirectMs: number;
                callbackMs: number;
            } | undefined;
            logout?: {
                url?: string | undefined;
                idpLogout?: boolean | undefined;
            } | undefined;
        } | undefined;
        form?: {
            loginUrl: string;
            success: {
                url?: string | undefined;
                selector?: string | undefined;
            };
            selectors: {
                username: string;
                password: string;
                submit: string;
            };
        } | undefined;
        bypass?: {
            mode: "none" | "identityless" | "mock-identity" | "unknown";
            toggle?: string | undefined;
            environments?: string[] | undefined;
        } | undefined;
    };
    selectors: {
        testIdAttribute: string;
        strategy: ("role" | "label" | "placeholder" | "testid" | "text" | "css")[];
        customTestIds?: string[] | undefined;
    };
    environments: Record<string, {
        baseUrl: string;
        apiUrl?: string | undefined;
    }>;
    version: number;
    app: {
        name: string;
        baseUrl: string;
        type: "spa" | "ssr" | "hybrid";
    };
    activeEnvironment: string;
    assertions: {
        form: {
            errorSelector: string;
            formErrorSelector: string;
        };
        toast: {
            timeout: number;
            containerSelector: string;
            messageSelector: string;
            typeAttribute: string;
        };
        loading: {
            timeout: number;
            selectors: string[];
        };
    };
    data: {
        namespace: {
            prefix: string;
            suffix: string;
        };
        cleanup: {
            enabled: boolean;
            onFailure: boolean;
            parallel: boolean;
        };
        api?: {
            baseUrl: string;
            useMainAuth: boolean;
        } | undefined;
    };
    fixtures: {
        defaultRole: string;
        roleFixtures: string[];
        api?: {
            baseURL: string;
            extraHTTPHeaders?: Record<string, string> | undefined;
        } | undefined;
    };
    tiers: Record<string, {
        timeout: number;
        retries: number;
        workers: number;
        tag: string;
    }>;
    reporters: {
        json?: {
            enabled: boolean;
            outputFile: string;
        } | undefined;
        html?: {
            enabled: boolean;
            outputFolder: string;
            open: "always" | "never" | "on-failure";
        } | undefined;
        junit?: {
            enabled: boolean;
            outputFile: string;
        } | undefined;
        artk?: {
            enabled: boolean;
            outputFile: string;
            includeJourneyMapping: boolean;
        } | undefined;
    };
    artifacts: {
        screenshots: {
            mode: "off" | "on" | "only-on-failure";
            fullPage: boolean;
            maskPii: boolean;
            piiSelectors: string[];
        };
        outputDir: string;
        video: {
            mode: "off" | "on" | "retain-on-failure" | "on-first-retry";
            size?: {
                width: number;
                height: number;
            } | undefined;
        };
        trace: {
            mode: "off" | "on" | "retain-on-failure" | "on-first-retry";
            screenshots: boolean;
            snapshots: boolean;
        };
    };
    browsers: {
        enabled: ("chromium" | "firefox" | "webkit")[];
        strategy: "auto" | "prefer-bundled" | "prefer-system" | "bundled-only" | "system-only";
        channel: "bundled" | "msedge" | "chrome" | "chrome-beta" | "chrome-dev";
        viewport: {
            width: number;
            height: number;
        };
        headless: boolean;
        slowMo?: number | undefined;
    };
    journeys: {
        id: {
            prefix: string;
            width: number;
        };
        layout: "flat" | "staged";
        backlog: {
            groupBy: "tier" | "status" | "scope";
            thenBy?: "tier" | "status" | "scope" | undefined;
        };
    };
}, {
    auth: {
        provider: "oidc" | "form" | "token" | "custom";
        roles: Record<string, {
            credentialsEnv: {
                username: string;
                password: string;
            };
            description?: string | undefined;
            oidcOverrides?: {
                idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
                loginUrl: string;
                success: {
                    url?: string | undefined;
                    selector?: string | undefined;
                    timeout?: number | undefined;
                };
                mfa?: {
                    enabled?: boolean | undefined;
                    type?: "none" | "totp" | "push" | "sms" | undefined;
                    totpSecretEnv?: string | undefined;
                    pushTimeoutMs?: number | undefined;
                } | undefined;
                idpLoginUrl?: string | undefined;
                idpSelectors?: {
                    username?: string | undefined;
                    password?: string | undefined;
                    submit?: string | undefined;
                    staySignedInNo?: string | undefined;
                } | undefined;
                timeouts?: {
                    loginFlowMs?: number | undefined;
                    idpRedirectMs?: number | undefined;
                    callbackMs?: number | undefined;
                } | undefined;
                logout?: {
                    url?: string | undefined;
                    idpLogout?: boolean | undefined;
                } | undefined;
            } | undefined;
        }>;
        oidc?: {
            idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
            loginUrl: string;
            success: {
                url?: string | undefined;
                selector?: string | undefined;
                timeout?: number | undefined;
            };
            mfa?: {
                enabled?: boolean | undefined;
                type?: "none" | "totp" | "push" | "sms" | undefined;
                totpSecretEnv?: string | undefined;
                pushTimeoutMs?: number | undefined;
            } | undefined;
            idpLoginUrl?: string | undefined;
            idpSelectors?: {
                username?: string | undefined;
                password?: string | undefined;
                submit?: string | undefined;
                staySignedInNo?: string | undefined;
            } | undefined;
            timeouts?: {
                loginFlowMs?: number | undefined;
                idpRedirectMs?: number | undefined;
                callbackMs?: number | undefined;
            } | undefined;
            logout?: {
                url?: string | undefined;
                idpLogout?: boolean | undefined;
            } | undefined;
        } | undefined;
        form?: {
            loginUrl: string;
            success: {
                url?: string | undefined;
                selector?: string | undefined;
            };
            selectors: {
                username: string;
                password: string;
                submit: string;
            };
        } | undefined;
        storageState?: {
            directory?: string | undefined;
            maxAgeMinutes?: number | undefined;
            filePattern?: string | undefined;
        } | undefined;
        bypass?: {
            mode?: "none" | "identityless" | "mock-identity" | "unknown" | undefined;
            toggle?: string | undefined;
            environments?: string[] | undefined;
        } | undefined;
    };
    app: {
        name: string;
        baseUrl: string;
        type?: "spa" | "ssr" | "hybrid" | undefined;
    };
    fixtures: {
        defaultRole: string;
        api?: {
            baseURL: string;
            extraHTTPHeaders?: Record<string, string> | undefined;
        } | undefined;
        roleFixtures?: string[] | undefined;
    };
    selectors?: {
        testIdAttribute?: string | undefined;
        strategy?: ("role" | "label" | "placeholder" | "testid" | "text" | "css")[] | undefined;
        customTestIds?: string[] | undefined;
    } | undefined;
    environments?: Record<string, {
        baseUrl: string;
        apiUrl?: string | undefined;
    }> | undefined;
    version?: number | undefined;
    activeEnvironment?: string | undefined;
    assertions?: {
        form?: {
            errorSelector: string;
            formErrorSelector: string;
        } | undefined;
        toast?: {
            containerSelector: string;
            messageSelector: string;
            typeAttribute: string;
            timeout?: number | undefined;
        } | undefined;
        loading?: {
            selectors: string[];
            timeout?: number | undefined;
        } | undefined;
    } | undefined;
    data?: {
        namespace?: {
            prefix?: string | undefined;
            suffix?: string | undefined;
        } | undefined;
        cleanup?: {
            enabled?: boolean | undefined;
            onFailure?: boolean | undefined;
            parallel?: boolean | undefined;
        } | undefined;
        api?: {
            baseUrl: string;
            useMainAuth?: boolean | undefined;
        } | undefined;
    } | undefined;
    tiers?: Record<string, {
        timeout: number;
        retries: number;
        workers: number;
        tag: string;
    }> | undefined;
    reporters?: {
        json?: {
            enabled?: boolean | undefined;
            outputFile?: string | undefined;
        } | undefined;
        html?: {
            enabled?: boolean | undefined;
            outputFolder?: string | undefined;
            open?: "always" | "never" | "on-failure" | undefined;
        } | undefined;
        junit?: {
            enabled?: boolean | undefined;
            outputFile?: string | undefined;
        } | undefined;
        artk?: {
            enabled?: boolean | undefined;
            outputFile?: string | undefined;
            includeJourneyMapping?: boolean | undefined;
        } | undefined;
    } | undefined;
    artifacts?: {
        screenshots?: {
            mode?: "off" | "on" | "only-on-failure" | undefined;
            fullPage?: boolean | undefined;
            maskPii?: boolean | undefined;
            piiSelectors?: string[] | undefined;
        } | undefined;
        outputDir?: string | undefined;
        video?: {
            mode?: "off" | "on" | "retain-on-failure" | "on-first-retry" | undefined;
            size?: {
                width: number;
                height: number;
            } | undefined;
        } | undefined;
        trace?: {
            mode?: "off" | "on" | "retain-on-failure" | "on-first-retry" | undefined;
            screenshots?: boolean | undefined;
            snapshots?: boolean | undefined;
        } | undefined;
    } | undefined;
    browsers?: {
        enabled?: ("chromium" | "firefox" | "webkit")[] | undefined;
        strategy?: "auto" | "prefer-bundled" | "prefer-system" | "bundled-only" | "system-only" | undefined;
        channel?: "bundled" | "msedge" | "chrome" | "chrome-beta" | "chrome-dev" | undefined;
        viewport?: {
            width: number;
            height: number;
        } | undefined;
        headless?: boolean | undefined;
        slowMo?: number | undefined;
    } | undefined;
    journeys?: {
        id?: {
            prefix?: string | undefined;
            width?: number | undefined;
        } | undefined;
        layout?: "flat" | "staged" | undefined;
        backlog?: {
            groupBy?: "tier" | "status" | "scope" | undefined;
            thenBy?: "tier" | "status" | "scope" | undefined;
        } | undefined;
    } | undefined;
}>, {
    auth: {
        provider: "oidc" | "form" | "token" | "custom";
        storageState: {
            directory: string;
            maxAgeMinutes: number;
            filePattern: string;
        };
        roles: Record<string, {
            credentialsEnv: {
                username: string;
                password: string;
            };
            description?: string | undefined;
            oidcOverrides?: {
                idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
                loginUrl: string;
                success: {
                    timeout: number;
                    url?: string | undefined;
                    selector?: string | undefined;
                };
                mfa?: {
                    enabled: boolean;
                    type: "none" | "totp" | "push" | "sms";
                    pushTimeoutMs: number;
                    totpSecretEnv?: string | undefined;
                } | undefined;
                idpLoginUrl?: string | undefined;
                idpSelectors?: {
                    username?: string | undefined;
                    password?: string | undefined;
                    submit?: string | undefined;
                    staySignedInNo?: string | undefined;
                } | undefined;
                timeouts?: {
                    loginFlowMs: number;
                    idpRedirectMs: number;
                    callbackMs: number;
                } | undefined;
                logout?: {
                    url?: string | undefined;
                    idpLogout?: boolean | undefined;
                } | undefined;
            } | undefined;
        }>;
        oidc?: {
            idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
            loginUrl: string;
            success: {
                timeout: number;
                url?: string | undefined;
                selector?: string | undefined;
            };
            mfa?: {
                enabled: boolean;
                type: "none" | "totp" | "push" | "sms";
                pushTimeoutMs: number;
                totpSecretEnv?: string | undefined;
            } | undefined;
            idpLoginUrl?: string | undefined;
            idpSelectors?: {
                username?: string | undefined;
                password?: string | undefined;
                submit?: string | undefined;
                staySignedInNo?: string | undefined;
            } | undefined;
            timeouts?: {
                loginFlowMs: number;
                idpRedirectMs: number;
                callbackMs: number;
            } | undefined;
            logout?: {
                url?: string | undefined;
                idpLogout?: boolean | undefined;
            } | undefined;
        } | undefined;
        form?: {
            loginUrl: string;
            success: {
                url?: string | undefined;
                selector?: string | undefined;
            };
            selectors: {
                username: string;
                password: string;
                submit: string;
            };
        } | undefined;
        bypass?: {
            mode: "none" | "identityless" | "mock-identity" | "unknown";
            toggle?: string | undefined;
            environments?: string[] | undefined;
        } | undefined;
    };
    selectors: {
        testIdAttribute: string;
        strategy: ("role" | "label" | "placeholder" | "testid" | "text" | "css")[];
        customTestIds?: string[] | undefined;
    };
    environments: Record<string, {
        baseUrl: string;
        apiUrl?: string | undefined;
    }>;
    version: number;
    app: {
        name: string;
        baseUrl: string;
        type: "spa" | "ssr" | "hybrid";
    };
    activeEnvironment: string;
    assertions: {
        form: {
            errorSelector: string;
            formErrorSelector: string;
        };
        toast: {
            timeout: number;
            containerSelector: string;
            messageSelector: string;
            typeAttribute: string;
        };
        loading: {
            timeout: number;
            selectors: string[];
        };
    };
    data: {
        namespace: {
            prefix: string;
            suffix: string;
        };
        cleanup: {
            enabled: boolean;
            onFailure: boolean;
            parallel: boolean;
        };
        api?: {
            baseUrl: string;
            useMainAuth: boolean;
        } | undefined;
    };
    fixtures: {
        defaultRole: string;
        roleFixtures: string[];
        api?: {
            baseURL: string;
            extraHTTPHeaders?: Record<string, string> | undefined;
        } | undefined;
    };
    tiers: Record<string, {
        timeout: number;
        retries: number;
        workers: number;
        tag: string;
    }>;
    reporters: {
        json?: {
            enabled: boolean;
            outputFile: string;
        } | undefined;
        html?: {
            enabled: boolean;
            outputFolder: string;
            open: "always" | "never" | "on-failure";
        } | undefined;
        junit?: {
            enabled: boolean;
            outputFile: string;
        } | undefined;
        artk?: {
            enabled: boolean;
            outputFile: string;
            includeJourneyMapping: boolean;
        } | undefined;
    };
    artifacts: {
        screenshots: {
            mode: "off" | "on" | "only-on-failure";
            fullPage: boolean;
            maskPii: boolean;
            piiSelectors: string[];
        };
        outputDir: string;
        video: {
            mode: "off" | "on" | "retain-on-failure" | "on-first-retry";
            size?: {
                width: number;
                height: number;
            } | undefined;
        };
        trace: {
            mode: "off" | "on" | "retain-on-failure" | "on-first-retry";
            screenshots: boolean;
            snapshots: boolean;
        };
    };
    browsers: {
        enabled: ("chromium" | "firefox" | "webkit")[];
        strategy: "auto" | "prefer-bundled" | "prefer-system" | "bundled-only" | "system-only";
        channel: "bundled" | "msedge" | "chrome" | "chrome-beta" | "chrome-dev";
        viewport: {
            width: number;
            height: number;
        };
        headless: boolean;
        slowMo?: number | undefined;
    };
    journeys: {
        id: {
            prefix: string;
            width: number;
        };
        layout: "flat" | "staged";
        backlog: {
            groupBy: "tier" | "status" | "scope";
            thenBy?: "tier" | "status" | "scope" | undefined;
        };
    };
}, {
    auth: {
        provider: "oidc" | "form" | "token" | "custom";
        roles: Record<string, {
            credentialsEnv: {
                username: string;
                password: string;
            };
            description?: string | undefined;
            oidcOverrides?: {
                idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
                loginUrl: string;
                success: {
                    url?: string | undefined;
                    selector?: string | undefined;
                    timeout?: number | undefined;
                };
                mfa?: {
                    enabled?: boolean | undefined;
                    type?: "none" | "totp" | "push" | "sms" | undefined;
                    totpSecretEnv?: string | undefined;
                    pushTimeoutMs?: number | undefined;
                } | undefined;
                idpLoginUrl?: string | undefined;
                idpSelectors?: {
                    username?: string | undefined;
                    password?: string | undefined;
                    submit?: string | undefined;
                    staySignedInNo?: string | undefined;
                } | undefined;
                timeouts?: {
                    loginFlowMs?: number | undefined;
                    idpRedirectMs?: number | undefined;
                    callbackMs?: number | undefined;
                } | undefined;
                logout?: {
                    url?: string | undefined;
                    idpLogout?: boolean | undefined;
                } | undefined;
            } | undefined;
        }>;
        oidc?: {
            idpType: "keycloak" | "azure-ad" | "okta" | "auth0" | "generic";
            loginUrl: string;
            success: {
                url?: string | undefined;
                selector?: string | undefined;
                timeout?: number | undefined;
            };
            mfa?: {
                enabled?: boolean | undefined;
                type?: "none" | "totp" | "push" | "sms" | undefined;
                totpSecretEnv?: string | undefined;
                pushTimeoutMs?: number | undefined;
            } | undefined;
            idpLoginUrl?: string | undefined;
            idpSelectors?: {
                username?: string | undefined;
                password?: string | undefined;
                submit?: string | undefined;
                staySignedInNo?: string | undefined;
            } | undefined;
            timeouts?: {
                loginFlowMs?: number | undefined;
                idpRedirectMs?: number | undefined;
                callbackMs?: number | undefined;
            } | undefined;
            logout?: {
                url?: string | undefined;
                idpLogout?: boolean | undefined;
            } | undefined;
        } | undefined;
        form?: {
            loginUrl: string;
            success: {
                url?: string | undefined;
                selector?: string | undefined;
            };
            selectors: {
                username: string;
                password: string;
                submit: string;
            };
        } | undefined;
        storageState?: {
            directory?: string | undefined;
            maxAgeMinutes?: number | undefined;
            filePattern?: string | undefined;
        } | undefined;
        bypass?: {
            mode?: "none" | "identityless" | "mock-identity" | "unknown" | undefined;
            toggle?: string | undefined;
            environments?: string[] | undefined;
        } | undefined;
    };
    app: {
        name: string;
        baseUrl: string;
        type?: "spa" | "ssr" | "hybrid" | undefined;
    };
    fixtures: {
        defaultRole: string;
        api?: {
            baseURL: string;
            extraHTTPHeaders?: Record<string, string> | undefined;
        } | undefined;
        roleFixtures?: string[] | undefined;
    };
    selectors?: {
        testIdAttribute?: string | undefined;
        strategy?: ("role" | "label" | "placeholder" | "testid" | "text" | "css")[] | undefined;
        customTestIds?: string[] | undefined;
    } | undefined;
    environments?: Record<string, {
        baseUrl: string;
        apiUrl?: string | undefined;
    }> | undefined;
    version?: number | undefined;
    activeEnvironment?: string | undefined;
    assertions?: {
        form?: {
            errorSelector: string;
            formErrorSelector: string;
        } | undefined;
        toast?: {
            containerSelector: string;
            messageSelector: string;
            typeAttribute: string;
            timeout?: number | undefined;
        } | undefined;
        loading?: {
            selectors: string[];
            timeout?: number | undefined;
        } | undefined;
    } | undefined;
    data?: {
        namespace?: {
            prefix?: string | undefined;
            suffix?: string | undefined;
        } | undefined;
        cleanup?: {
            enabled?: boolean | undefined;
            onFailure?: boolean | undefined;
            parallel?: boolean | undefined;
        } | undefined;
        api?: {
            baseUrl: string;
            useMainAuth?: boolean | undefined;
        } | undefined;
    } | undefined;
    tiers?: Record<string, {
        timeout: number;
        retries: number;
        workers: number;
        tag: string;
    }> | undefined;
    reporters?: {
        json?: {
            enabled?: boolean | undefined;
            outputFile?: string | undefined;
        } | undefined;
        html?: {
            enabled?: boolean | undefined;
            outputFolder?: string | undefined;
            open?: "always" | "never" | "on-failure" | undefined;
        } | undefined;
        junit?: {
            enabled?: boolean | undefined;
            outputFile?: string | undefined;
        } | undefined;
        artk?: {
            enabled?: boolean | undefined;
            outputFile?: string | undefined;
            includeJourneyMapping?: boolean | undefined;
        } | undefined;
    } | undefined;
    artifacts?: {
        screenshots?: {
            mode?: "off" | "on" | "only-on-failure" | undefined;
            fullPage?: boolean | undefined;
            maskPii?: boolean | undefined;
            piiSelectors?: string[] | undefined;
        } | undefined;
        outputDir?: string | undefined;
        video?: {
            mode?: "off" | "on" | "retain-on-failure" | "on-first-retry" | undefined;
            size?: {
                width: number;
                height: number;
            } | undefined;
        } | undefined;
        trace?: {
            mode?: "off" | "on" | "retain-on-failure" | "on-first-retry" | undefined;
            screenshots?: boolean | undefined;
            snapshots?: boolean | undefined;
        } | undefined;
    } | undefined;
    browsers?: {
        enabled?: ("chromium" | "firefox" | "webkit")[] | undefined;
        strategy?: "auto" | "prefer-bundled" | "prefer-system" | "bundled-only" | "system-only" | undefined;
        channel?: "bundled" | "msedge" | "chrome" | "chrome-beta" | "chrome-dev" | undefined;
        viewport?: {
            width: number;
            height: number;
        } | undefined;
        headless?: boolean | undefined;
        slowMo?: number | undefined;
    } | undefined;
    journeys?: {
        id?: {
            prefix?: string | undefined;
            width?: number | undefined;
        } | undefined;
        layout?: "flat" | "staged" | undefined;
        backlog?: {
            groupBy?: "tier" | "status" | "scope" | undefined;
            thenBy?: "tier" | "status" | "scope" | undefined;
        } | undefined;
    } | undefined;
}>;
/** Inferred type from ARTKConfigSchema */
export type ARTKConfigInput = z.input<typeof ARTKConfigSchema>;
/** Validated ARTKConfig type */
export type ARTKConfigOutput = z.output<typeof ARTKConfigSchema>;
//# sourceMappingURL=schema.d.ts.map