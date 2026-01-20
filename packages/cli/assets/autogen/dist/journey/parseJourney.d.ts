import { JourneyFrontmatterSchema, JourneyStatusSchema, type JourneyFrontmatter, type JourneyStatus } from './schema.js';
import { type Result, CodedError } from '../utils/result.js';
export { JourneyFrontmatterSchema, JourneyStatusSchema };
export type { JourneyFrontmatter, JourneyStatus };
/**
 * Error thrown when journey parsing fails
 */
export declare class JourneyParseError extends Error {
    readonly filePath: string;
    readonly cause?: unknown;
    constructor(message: string, filePath: string, cause?: unknown);
}
/**
 * Parsed journey structure
 */
export interface ParsedJourney {
    /** Journey frontmatter (validated) */
    frontmatter: JourneyFrontmatter;
    /** Raw markdown body (everything after frontmatter) */
    body: string;
    /** Acceptance Criteria section */
    acceptanceCriteria: AcceptanceCriterion[];
    /** Procedural Steps section */
    proceduralSteps: ProceduralStep[];
    /** Data/Environment notes */
    dataNotes: string[];
    /** Source file path */
    sourcePath: string;
}
/**
 * Acceptance criterion from journey body
 */
export interface AcceptanceCriterion {
    /** Criterion ID (e.g., 'AC-1') */
    id: string;
    /** Title/description */
    title: string;
    /** Bullet points under this criterion */
    steps: string[];
    /** Raw markdown content */
    rawContent: string;
}
/**
 * Procedural step from journey body
 */
export interface ProceduralStep {
    /** Step number */
    number: number;
    /** Step text */
    text: string;
    /** Associated AC (if any) */
    linkedAC?: string;
}
/**
 * Structured step action from journey body
 */
export interface StructuredStepAction {
    /** Action type: 'action', 'wait', or 'assert' */
    type: 'action' | 'wait' | 'assert';
    /** The parsed action string */
    action: string;
    /** Target element or condition */
    target: string;
    /** Optional value for the action */
    value?: string;
}
/**
 * Structured step from journey body
 */
export interface StructuredStep {
    /** Step number */
    stepNumber: number;
    /** Step name/title */
    stepName: string;
    /** Array of parsed actions */
    actions: StructuredStepAction[];
}
/**
 * Parse structured steps from markdown content
 * Parses the new structured format with Action/Wait for/Assert bullets
 * @param content - The markdown content containing structured steps
 * @returns Array of parsed structured steps
 */
export declare function parseStructuredSteps(content: string): StructuredStep[];
/**
 * Parse a journey markdown file
 * @param filePath - Path to the journey file
 * @returns Parsed journey structure
 * @throws JourneyParseError if parsing fails
 */
export declare function parseJourney(filePath: string): ParsedJourney;
/**
 * Parse and validate a journey for AutoGen (must be clarified)
 */
export declare function parseJourneyForAutoGen(filePath: string): ParsedJourney;
/**
 * Parse journey from string content (for testing)
 */
export declare function parseJourneyContent(content: string, virtualPath?: string): ParsedJourney;
/**
 * Parse journey from string content with Result type (no exceptions)
 *
 * This is the recommended way to parse journey content as it returns
 * structured errors via Result type instead of throwing exceptions.
 *
 * @param content - Raw markdown content to parse
 * @param virtualPath - Virtual path for error reporting (default: 'virtual.journey.md')
 * @returns Result with ParsedJourney on success or CodedError on failure
 *
 * @example
 * ```typescript
 * const result = tryParseJourneyContent(markdownContent);
 * if (result.success) {
 *   console.log('Parsed:', result.value.frontmatter.id);
 * } else {
 *   console.error(`[${result.error.code}] ${result.error.message}`);
 * }
 * ```
 */
export declare function tryParseJourneyContent(content: string, virtualPath?: string): Result<ParsedJourney, CodedError>;
//# sourceMappingURL=parseJourney.d.ts.map