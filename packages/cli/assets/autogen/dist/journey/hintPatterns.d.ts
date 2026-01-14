/**
 * Machine Hint Syntax Patterns - Define regex patterns for parsing hints
 * @see T071 - Define machine hint syntax regex patterns
 */
/**
 * Machine hint types
 */
export type HintType = 'role' | 'testid' | 'label' | 'text' | 'exact' | 'level' | 'signal' | 'module' | 'wait' | 'timeout';
/**
 * Parsed machine hint
 */
export interface MachineHint {
    /** Hint type */
    type: HintType;
    /** Hint value */
    value: string;
    /** Raw hint string */
    raw: string;
}
/**
 * Pattern for detecting hint blocks: (key=value) or (key="value with spaces")
 */
export declare const HINT_BLOCK_PATTERN: RegExp;
/**
 * Pattern for a complete hints section: (...hints...)
 */
export declare const HINTS_SECTION_PATTERN: RegExp;
/**
 * Individual hint patterns for validation
 */
export declare const HINT_PATTERNS: Record<HintType, RegExp>;
/**
 * Valid ARIA roles for validation
 */
export declare const VALID_ROLES: string[];
/**
 * Check if a role is valid
 */
export declare function isValidRole(role: string): boolean;
/**
 * Extract hint value from a match (handles quoted and unquoted values)
 */
export declare function extractHintValue(match: RegExpMatchArray): string | null;
/**
 * Check if text contains machine hints
 */
export declare function containsHints(text: string): boolean;
/**
 * Remove hints section from step text
 */
export declare function removeHints(text: string): string;
//# sourceMappingURL=hintPatterns.d.ts.map