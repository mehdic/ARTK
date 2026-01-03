import { JourneyFrontmatterSchema, JourneyStatusSchema, type JourneyFrontmatter, type JourneyStatus } from './schema.js';
export { JourneyFrontmatterSchema, JourneyStatusSchema };
export type { JourneyFrontmatter, JourneyStatus };
/**
 * Error thrown when journey parsing fails
 */
export declare class JourneyParseError extends Error {
    readonly filePath: string;
    readonly cause?: unknown | undefined;
    constructor(message: string, filePath: string, cause?: unknown | undefined);
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
//# sourceMappingURL=parseJourney.d.ts.map