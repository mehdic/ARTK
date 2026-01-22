/**
 * IR Serializer - Convert IR to JSON for debugging and analysis
 * @see research/2026-01-02_autogen-refined-plan.md Section 9
 */
import type { IRJourney, IRStep, IRPrimitive, LocatorSpec } from './types.js';
/**
 * Options for IR serialization
 */
export interface SerializeOptions {
    /** Include null/undefined values */
    includeEmpty?: boolean;
    /** Pretty print with indentation */
    pretty?: boolean;
    /** Indent size for pretty printing */
    indent?: number;
}
/**
 * Serialize an IR Journey to JSON string
 */
export declare function serializeJourney(journey: IRJourney, options?: SerializeOptions): string;
/**
 * Serialize an IR Step to JSON string
 */
export declare function serializeStep(step: IRStep, options?: SerializeOptions): string;
/**
 * Serialize an IR Primitive to JSON string
 */
export declare function serializePrimitive(primitive: IRPrimitive, options?: SerializeOptions): string;
/**
 * Convert a LocatorSpec to a human-readable description
 */
export declare function describeLocator(locator: LocatorSpec): string;
/**
 * Convert an IR Primitive to a human-readable description
 */
export declare function describePrimitive(primitive: IRPrimitive): string;
/**
 * Generate a summary of an IR Journey
 */
export declare function summarizeJourney(journey: IRJourney): string;
//# sourceMappingURL=serialize.d.ts.map