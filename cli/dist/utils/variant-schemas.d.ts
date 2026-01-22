/**
 * ARTK Zod Schemas for Variant System
 *
 * Validation schemas for context.json, lock files, and feature compatibility.
 */
import { z } from 'zod';
/**
 * Schema for variant IDs.
 */
export declare const VariantIdSchema: z.ZodEnum<["modern-esm", "modern-cjs", "legacy-16", "legacy-14"]>;
/**
 * Schema for module system.
 */
export declare const ModuleSystemSchema: z.ZodEnum<["esm", "cjs"]>;
/**
 * Schema for install method.
 */
export declare const InstallMethodSchema: z.ZodEnum<["cli", "bootstrap", "manual"]>;
/**
 * Schema for log level.
 */
export declare const LogLevelSchema: z.ZodEnum<["INFO", "WARN", "ERROR"]>;
/**
 * Schema for operation type.
 */
export declare const OperationTypeSchema: z.ZodEnum<["install", "upgrade", "rollback", "detect"]>;
/**
 * Schema for lock operation.
 */
export declare const LockOperationSchema: z.ZodEnum<["install", "upgrade"]>;
/**
 * Schema for upgrade history record.
 */
export declare const UpgradeRecordSchema: z.ZodObject<{
    from: z.ZodEnum<["modern-esm", "modern-cjs", "legacy-16", "legacy-14"]>;
    to: z.ZodEnum<["modern-esm", "modern-cjs", "legacy-16", "legacy-14"]>;
    at: z.ZodString;
}, "strip", z.ZodTypeAny, {
    at: string;
    from: "modern-esm" | "modern-cjs" | "legacy-16" | "legacy-14";
    to: "modern-esm" | "modern-cjs" | "legacy-16" | "legacy-14";
}, {
    at: string;
    from: "modern-esm" | "modern-cjs" | "legacy-16" | "legacy-14";
    to: "modern-esm" | "modern-cjs" | "legacy-16" | "legacy-14";
}>;
/**
 * Schema for .artk/context.json file.
 */
export declare const ArtkContextSchema: z.ZodObject<{
    variant: z.ZodEnum<["modern-esm", "modern-cjs", "legacy-16", "legacy-14"]>;
    variantInstalledAt: z.ZodString;
    nodeVersion: z.ZodNumber;
    moduleSystem: z.ZodEnum<["esm", "cjs"]>;
    playwrightVersion: z.ZodString;
    artkVersion: z.ZodString;
    installMethod: z.ZodEnum<["cli", "bootstrap", "manual"]>;
    overrideUsed: z.ZodOptional<z.ZodBoolean>;
    previousVariant: z.ZodOptional<z.ZodEnum<["modern-esm", "modern-cjs", "legacy-16", "legacy-14"]>>;
    upgradeHistory: z.ZodOptional<z.ZodArray<z.ZodObject<{
        from: z.ZodEnum<["modern-esm", "modern-cjs", "legacy-16", "legacy-14"]>;
        to: z.ZodEnum<["modern-esm", "modern-cjs", "legacy-16", "legacy-14"]>;
        at: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        at: string;
        from: "modern-esm" | "modern-cjs" | "legacy-16" | "legacy-14";
        to: "modern-esm" | "modern-cjs" | "legacy-16" | "legacy-14";
    }, {
        at: string;
        from: "modern-esm" | "modern-cjs" | "legacy-16" | "legacy-14";
        to: "modern-esm" | "modern-cjs" | "legacy-16" | "legacy-14";
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    nodeVersion: number;
    variant: "modern-esm" | "modern-cjs" | "legacy-16" | "legacy-14";
    moduleSystem: "esm" | "cjs";
    variantInstalledAt: string;
    playwrightVersion: string;
    artkVersion: string;
    installMethod: "cli" | "bootstrap" | "manual";
    overrideUsed?: boolean | undefined;
    previousVariant?: "modern-esm" | "modern-cjs" | "legacy-16" | "legacy-14" | undefined;
    upgradeHistory?: {
        at: string;
        from: "modern-esm" | "modern-cjs" | "legacy-16" | "legacy-14";
        to: "modern-esm" | "modern-cjs" | "legacy-16" | "legacy-14";
    }[] | undefined;
}, {
    nodeVersion: number;
    variant: "modern-esm" | "modern-cjs" | "legacy-16" | "legacy-14";
    moduleSystem: "esm" | "cjs";
    variantInstalledAt: string;
    playwrightVersion: string;
    artkVersion: string;
    installMethod: "cli" | "bootstrap" | "manual";
    overrideUsed?: boolean | undefined;
    previousVariant?: "modern-esm" | "modern-cjs" | "legacy-16" | "legacy-14" | undefined;
    upgradeHistory?: {
        at: string;
        from: "modern-esm" | "modern-cjs" | "legacy-16" | "legacy-14";
        to: "modern-esm" | "modern-cjs" | "legacy-16" | "legacy-14";
    }[] | undefined;
}>;
/**
 * Schema for .artk/install.lock file.
 */
export declare const LockFileSchema: z.ZodObject<{
    pid: z.ZodNumber;
    startedAt: z.ZodString;
    operation: z.ZodEnum<["install", "upgrade"]>;
}, "strip", z.ZodTypeAny, {
    pid: number;
    startedAt: string;
    operation: "install" | "upgrade";
}, {
    pid: number;
    startedAt: string;
    operation: "install" | "upgrade";
}>;
/**
 * Schema for install log entry.
 */
export declare const InstallLogEntrySchema: z.ZodObject<{
    timestamp: z.ZodString;
    level: z.ZodEnum<["INFO", "WARN", "ERROR"]>;
    operation: z.ZodEnum<["install", "upgrade", "rollback", "detect"]>;
    message: z.ZodString;
    details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    message: string;
    operation: "install" | "upgrade" | "rollback" | "detect";
    timestamp: string;
    level: "INFO" | "WARN" | "ERROR";
    details?: Record<string, unknown> | undefined;
}, {
    message: string;
    operation: "install" | "upgrade" | "rollback" | "detect";
    timestamp: string;
    level: "INFO" | "WARN" | "ERROR";
    details?: Record<string, unknown> | undefined;
}>;
/**
 * Schema for feature entry in variant-features.json.
 */
export declare const FeatureEntrySchema: z.ZodObject<{
    available: z.ZodBoolean;
    alternative: z.ZodOptional<z.ZodString>;
    notes: z.ZodOptional<z.ZodString>;
    sincePlaywright: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    available: boolean;
    alternative?: string | undefined;
    notes?: string | undefined;
    sincePlaywright?: string | undefined;
}, {
    available: boolean;
    alternative?: string | undefined;
    notes?: string | undefined;
    sincePlaywright?: string | undefined;
}>;
/**
 * Schema for variant-features.json file.
 */
export declare const FeatureCompatibilitySchema: z.ZodObject<{
    variant: z.ZodEnum<["modern-esm", "modern-cjs", "legacy-16", "legacy-14"]>;
    playwrightVersion: z.ZodString;
    nodeRange: z.ZodArray<z.ZodString, "many">;
    moduleSystem: z.ZodOptional<z.ZodEnum<["esm", "cjs"]>>;
    features: z.ZodRecord<z.ZodString, z.ZodObject<{
        available: z.ZodBoolean;
        alternative: z.ZodOptional<z.ZodString>;
        notes: z.ZodOptional<z.ZodString>;
        sincePlaywright: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        available: boolean;
        alternative?: string | undefined;
        notes?: string | undefined;
        sincePlaywright?: string | undefined;
    }, {
        available: boolean;
        alternative?: string | undefined;
        notes?: string | undefined;
        sincePlaywright?: string | undefined;
    }>>;
    generatedAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    variant: "modern-esm" | "modern-cjs" | "legacy-16" | "legacy-14";
    playwrightVersion: string;
    nodeRange: string[];
    features: Record<string, {
        available: boolean;
        alternative?: string | undefined;
        notes?: string | undefined;
        sincePlaywright?: string | undefined;
    }>;
    moduleSystem?: "esm" | "cjs" | undefined;
    generatedAt?: string | undefined;
}, {
    variant: "modern-esm" | "modern-cjs" | "legacy-16" | "legacy-14";
    playwrightVersion: string;
    nodeRange: string[];
    features: Record<string, {
        available: boolean;
        alternative?: string | undefined;
        notes?: string | undefined;
        sincePlaywright?: string | undefined;
    }>;
    moduleSystem?: "esm" | "cjs" | undefined;
    generatedAt?: string | undefined;
}>;
/**
 * Schema for variant definition.
 */
export declare const VariantDefinitionSchema: z.ZodObject<{
    id: z.ZodEnum<["modern-esm", "modern-cjs", "legacy-16", "legacy-14"]>;
    displayName: z.ZodString;
    nodeRange: z.ZodArray<z.ZodString, "many">;
    playwrightVersion: z.ZodString;
    moduleSystem: z.ZodEnum<["esm", "cjs"]>;
    tsTarget: z.ZodString;
    distDirectory: z.ZodString;
}, "strip", z.ZodTypeAny, {
    moduleSystem: "esm" | "cjs";
    playwrightVersion: string;
    nodeRange: string[];
    id: "modern-esm" | "modern-cjs" | "legacy-16" | "legacy-14";
    displayName: string;
    tsTarget: string;
    distDirectory: string;
}, {
    moduleSystem: "esm" | "cjs";
    playwrightVersion: string;
    nodeRange: string[];
    id: "modern-esm" | "modern-cjs" | "legacy-16" | "legacy-14";
    displayName: string;
    tsTarget: string;
    distDirectory: string;
}>;
/**
 * Schema for detection result.
 */
export declare const DetectionResultSchema: z.ZodObject<{
    nodeVersion: z.ZodNumber;
    nodeVersionFull: z.ZodString;
    moduleSystem: z.ZodEnum<["esm", "cjs"]>;
    selectedVariant: z.ZodEnum<["modern-esm", "modern-cjs", "legacy-16", "legacy-14"]>;
    success: z.ZodBoolean;
    error: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    nodeVersion: number;
    nodeVersionFull: string;
    moduleSystem: "esm" | "cjs";
    selectedVariant: "modern-esm" | "modern-cjs" | "legacy-16" | "legacy-14";
    success: boolean;
    error?: string | undefined;
}, {
    nodeVersion: number;
    nodeVersionFull: string;
    moduleSystem: "esm" | "cjs";
    selectedVariant: "modern-esm" | "modern-cjs" | "legacy-16" | "legacy-14";
    success: boolean;
    error?: string | undefined;
}>;
/**
 * Type exports inferred from schemas.
 */
export type VariantIdSchemaType = z.infer<typeof VariantIdSchema>;
export type ModuleSystemSchemaType = z.infer<typeof ModuleSystemSchema>;
export type ArtkContextSchemaType = z.infer<typeof ArtkContextSchema>;
export type LockFileSchemaType = z.infer<typeof LockFileSchema>;
export type InstallLogEntrySchemaType = z.infer<typeof InstallLogEntrySchema>;
export type FeatureCompatibilitySchemaType = z.infer<typeof FeatureCompatibilitySchema>;
export type DetectionResultSchemaType = z.infer<typeof DetectionResultSchema>;
/**
 * Validate context.json content.
 */
export declare function validateContext(data: unknown): z.SafeParseReturnType<unknown, ArtkContextSchemaType>;
/**
 * Validate lock file content.
 */
export declare function validateLockFile(data: unknown): z.SafeParseReturnType<unknown, LockFileSchemaType>;
/**
 * Validate feature compatibility content.
 */
export declare function validateFeatureCompatibility(data: unknown): z.SafeParseReturnType<unknown, FeatureCompatibilitySchemaType>;
//# sourceMappingURL=variant-schemas.d.ts.map