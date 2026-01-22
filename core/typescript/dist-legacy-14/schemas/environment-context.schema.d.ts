/**
 * Zod Schemas for Environment Context
 *
 * Runtime validation schemas matching the JSON schema at
 * specs/001-foundation-compatibility/contracts/environment-context.schema.json
 *
 * @module @artk/core/schemas
 */
import { z } from 'zod';
/**
 * Module system schema - either CommonJS or ESM
 */
export declare const ModuleSystemSchema: z.ZodEnum<["commonjs", "esm"]>;
/**
 * Template source schema - where templates came from
 */
export declare const TemplateSourceSchema: z.ZodEnum<["bundled", "local-override"]>;
/**
 * Detection confidence schema
 */
export declare const DetectionConfidenceSchema: z.ZodEnum<["high", "medium", "low"]>;
/**
 * Detection method schema
 */
export declare const DetectionMethodSchema: z.ZodEnum<["package.json", "tsconfig.json", "fallback"]>;
/**
 * Parsed Node.js version schema
 */
export declare const NodeVersionParsedSchema: z.ZodObject<{
    /** Major version number (must be >= 18) */
    major: z.ZodNumber;
    /** Minor version number */
    minor: z.ZodNumber;
    /** Patch version number */
    patch: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    major: number;
    minor: number;
    patch: number;
}, {
    major: number;
    minor: number;
    patch: number;
}>;
/**
 * Environment Context schema
 *
 * Validates the structure of .artk/context.json
 */
export declare const EnvironmentContextSchema: z.ZodObject<{
    /** Detected module system from package.json or tsconfig.json */
    moduleSystem: z.ZodEnum<["commonjs", "esm"]>;
    /** Semantic version of Node.js (e.g., "18.12.1") */
    nodeVersion: z.ZodString;
    /** Parsed Node.js version components */
    nodeVersionParsed: z.ZodObject<{
        /** Major version number (must be >= 18) */
        major: z.ZodNumber;
        /** Minor version number */
        minor: z.ZodNumber;
        /** Patch version number */
        patch: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        major: number;
        minor: number;
        patch: number;
    }, {
        major: number;
        minor: number;
        patch: number;
    }>;
    /** TypeScript module setting from tsconfig.json, or null if not present */
    tsModule: z.ZodNullable<z.ZodString>;
    /** true if Node 18+ and ESM environment */
    supportsImportMeta: z.ZodBoolean;
    /** true if Node 20.11.0+ (has import.meta.dirname built-in) */
    supportsBuiltinDirname: z.ZodBoolean;
    /** Which template set was used for generation */
    templateVariant: z.ZodEnum<["commonjs", "esm"]>;
    /** Where templates came from */
    templateSource: z.ZodEnum<["bundled", "local-override"]>;
    /** ISO 8601 timestamp when detection ran */
    detectionTimestamp: z.ZodString;
    /** Confidence level based on signal consistency */
    detectionConfidence: z.ZodEnum<["high", "medium", "low"]>;
    /** Primary method that determined module system */
    detectionMethod: z.ZodEnum<["package.json", "tsconfig.json", "fallback"]>;
    /** List of warnings encountered during detection */
    warnings: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    warnings: string[];
    moduleSystem: "esm" | "commonjs";
    nodeVersion: string;
    nodeVersionParsed: {
        major: number;
        minor: number;
        patch: number;
    };
    tsModule: string | null;
    supportsImportMeta: boolean;
    supportsBuiltinDirname: boolean;
    templateVariant: "esm" | "commonjs";
    templateSource: "bundled" | "local-override";
    detectionTimestamp: string;
    detectionConfidence: "high" | "medium" | "low";
    detectionMethod: "fallback" | "package.json" | "tsconfig.json";
}, {
    warnings: string[];
    moduleSystem: "esm" | "commonjs";
    nodeVersion: string;
    nodeVersionParsed: {
        major: number;
        minor: number;
        patch: number;
    };
    tsModule: string | null;
    supportsImportMeta: boolean;
    supportsBuiltinDirname: boolean;
    templateVariant: "esm" | "commonjs";
    templateSource: "bundled" | "local-override";
    detectionTimestamp: string;
    detectionConfidence: "high" | "medium" | "low";
    detectionMethod: "fallback" | "package.json" | "tsconfig.json";
}>;
/**
 * Detection options schema
 */
export declare const DetectionOptionsSchema: z.ZodObject<{
    /** Project root directory */
    projectRoot: z.ZodString;
    /** Force re-detection */
    forceDetect: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    /** Timeout in milliseconds */
    timeout: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    timeout: number;
    projectRoot: string;
    forceDetect: boolean;
}, {
    projectRoot: string;
    timeout?: number | undefined;
    forceDetect?: boolean | undefined;
}>;
/**
 * Detection result schema
 */
export declare const DetectionResultSchema: z.ZodObject<{
    /** The detected environment context */
    context: z.ZodObject<{
        /** Detected module system from package.json or tsconfig.json */
        moduleSystem: z.ZodEnum<["commonjs", "esm"]>;
        /** Semantic version of Node.js (e.g., "18.12.1") */
        nodeVersion: z.ZodString;
        /** Parsed Node.js version components */
        nodeVersionParsed: z.ZodObject<{
            /** Major version number (must be >= 18) */
            major: z.ZodNumber;
            /** Minor version number */
            minor: z.ZodNumber;
            /** Patch version number */
            patch: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            major: number;
            minor: number;
            patch: number;
        }, {
            major: number;
            minor: number;
            patch: number;
        }>;
        /** TypeScript module setting from tsconfig.json, or null if not present */
        tsModule: z.ZodNullable<z.ZodString>;
        /** true if Node 18+ and ESM environment */
        supportsImportMeta: z.ZodBoolean;
        /** true if Node 20.11.0+ (has import.meta.dirname built-in) */
        supportsBuiltinDirname: z.ZodBoolean;
        /** Which template set was used for generation */
        templateVariant: z.ZodEnum<["commonjs", "esm"]>;
        /** Where templates came from */
        templateSource: z.ZodEnum<["bundled", "local-override"]>;
        /** ISO 8601 timestamp when detection ran */
        detectionTimestamp: z.ZodString;
        /** Confidence level based on signal consistency */
        detectionConfidence: z.ZodEnum<["high", "medium", "low"]>;
        /** Primary method that determined module system */
        detectionMethod: z.ZodEnum<["package.json", "tsconfig.json", "fallback"]>;
        /** List of warnings encountered during detection */
        warnings: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        warnings: string[];
        moduleSystem: "esm" | "commonjs";
        nodeVersion: string;
        nodeVersionParsed: {
            major: number;
            minor: number;
            patch: number;
        };
        tsModule: string | null;
        supportsImportMeta: boolean;
        supportsBuiltinDirname: boolean;
        templateVariant: "esm" | "commonjs";
        templateSource: "bundled" | "local-override";
        detectionTimestamp: string;
        detectionConfidence: "high" | "medium" | "low";
        detectionMethod: "fallback" | "package.json" | "tsconfig.json";
    }, {
        warnings: string[];
        moduleSystem: "esm" | "commonjs";
        nodeVersion: string;
        nodeVersionParsed: {
            major: number;
            minor: number;
            patch: number;
        };
        tsModule: string | null;
        supportsImportMeta: boolean;
        supportsBuiltinDirname: boolean;
        templateVariant: "esm" | "commonjs";
        templateSource: "bundled" | "local-override";
        detectionTimestamp: string;
        detectionConfidence: "high" | "medium" | "low";
        detectionMethod: "fallback" | "package.json" | "tsconfig.json";
    }>;
    /** Whether results were loaded from cache */
    fromCache: z.ZodBoolean;
    /** Time taken for detection in milliseconds */
    detectionTime: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    context: {
        warnings: string[];
        moduleSystem: "esm" | "commonjs";
        nodeVersion: string;
        nodeVersionParsed: {
            major: number;
            minor: number;
            patch: number;
        };
        tsModule: string | null;
        supportsImportMeta: boolean;
        supportsBuiltinDirname: boolean;
        templateVariant: "esm" | "commonjs";
        templateSource: "bundled" | "local-override";
        detectionTimestamp: string;
        detectionConfidence: "high" | "medium" | "low";
        detectionMethod: "fallback" | "package.json" | "tsconfig.json";
    };
    fromCache: boolean;
    detectionTime: number;
}, {
    context: {
        warnings: string[];
        moduleSystem: "esm" | "commonjs";
        nodeVersion: string;
        nodeVersionParsed: {
            major: number;
            minor: number;
            patch: number;
        };
        tsModule: string | null;
        supportsImportMeta: boolean;
        supportsBuiltinDirname: boolean;
        templateVariant: "esm" | "commonjs";
        templateSource: "bundled" | "local-override";
        detectionTimestamp: string;
        detectionConfidence: "high" | "medium" | "low";
        detectionMethod: "fallback" | "package.json" | "tsconfig.json";
    };
    fromCache: boolean;
    detectionTime: number;
}>;
/**
 * Type inference helpers
 */
export type ModuleSystemType = z.infer<typeof ModuleSystemSchema>;
export type TemplateSourceType = z.infer<typeof TemplateSourceSchema>;
export type DetectionConfidenceType = z.infer<typeof DetectionConfidenceSchema>;
export type DetectionMethodType = z.infer<typeof DetectionMethodSchema>;
export type NodeVersionParsedType = z.infer<typeof NodeVersionParsedSchema>;
export type EnvironmentContextType = z.infer<typeof EnvironmentContextSchema>;
export type DetectionOptionsType = z.infer<typeof DetectionOptionsSchema>;
export type DetectionResultType = z.infer<typeof DetectionResultSchema>;
/**
 * Validates an EnvironmentContext object
 *
 * @param data - Data to validate
 * @returns Validated EnvironmentContext or throws ZodError
 *
 * @example
 * ```typescript
 * import { validateEnvironmentContext } from '@artk/core/schemas';
 *
 * const context = validateEnvironmentContext({
 *   moduleSystem: 'commonjs',
 *   nodeVersion: '18.12.1',
 *   // ... other fields
 * });
 * ```
 */
export declare function validateEnvironmentContext(data: unknown): EnvironmentContextType;
/**
 * Safely validates an EnvironmentContext object
 *
 * @param data - Data to validate
 * @returns Result object with success status and data or error
 */
export declare function safeValidateEnvironmentContext(data: unknown): z.SafeParseReturnType<unknown, EnvironmentContextType>;
//# sourceMappingURL=environment-context.schema.d.ts.map