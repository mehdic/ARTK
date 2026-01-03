/**
 * Journey Parser - Parse YAML frontmatter + markdown body
 * @see research/2026-01-02_autogen-refined-plan.md Section 8
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { JourneyFrontmatterSchema, JourneyStatusSchema, validateForAutoGen, } from './schema.js';
// Re-export for convenience
export { JourneyFrontmatterSchema, JourneyStatusSchema };
/**
 * Error thrown when journey parsing fails
 */
export class JourneyParseError extends Error {
    filePath;
    cause;
    constructor(message, filePath, cause) {
        super(message);
        this.filePath = filePath;
        this.cause = cause;
        this.name = 'JourneyParseError';
    }
}
/**
 * Regex patterns for parsing
 */
const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---/;
/**
 * Extract frontmatter from markdown content
 */
function extractFrontmatter(content) {
    const match = FRONTMATTER_REGEX.exec(content);
    if (!match) {
        throw new Error('No YAML frontmatter found (content should start with ---)');
    }
    return {
        frontmatter: match[1],
        body: content.slice(match[0].length).trim(),
    };
}
/**
 * Parse acceptance criteria from markdown body
 */
function parseAcceptanceCriteria(body) {
    const criteria = [];
    // Find the Acceptance Criteria section
    const acSectionMatch = body.match(/##\s*Acceptance\s*Criteria\s*\n([\s\S]*?)(?=\n##\s[^#]|$)/i);
    if (!acSectionMatch) {
        return criteria;
    }
    const acSection = acSectionMatch[1];
    // Split by AC headers (### AC-N or ## AC-N)
    const acPattern = /^###?\s*(AC-\d+)[:\s]*(.*?)$/gim;
    const parts = [];
    let match;
    while ((match = acPattern.exec(acSection)) !== null) {
        parts.push({
            id: match[1].toUpperCase(),
            title: match[2].trim(),
            startIndex: match.index + match[0].length,
        });
    }
    // Extract content for each AC
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        // Get content between this AC header and the next
        const contentStart = part.startIndex;
        const contentEnd = i + 1 < parts.length
            ? acSection.lastIndexOf('###', parts[i + 1].startIndex)
            : acSection.length;
        const content = acSection.slice(contentStart, contentEnd > contentStart ? contentEnd : acSection.length);
        // Extract bullet points as steps
        const steps = [];
        const bulletPattern = /^[-*]\s+(.+)$/gm;
        let bulletMatch;
        while ((bulletMatch = bulletPattern.exec(content)) !== null) {
            steps.push(bulletMatch[1].trim());
        }
        // Build raw content
        const headerMatch = acSection.match(new RegExp(`###?\\s*${part.id}[:\\s]*${part.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i'));
        const rawContent = headerMatch
            ? headerMatch[0] + content.slice(0, content.indexOf('\n###') > 0 ? content.indexOf('\n###') : content.length)
            : content;
        criteria.push({
            id: part.id,
            title: part.title,
            steps,
            rawContent: rawContent.trim(),
        });
    }
    return criteria;
}
/**
 * Parse procedural steps from markdown body
 */
function parseProceduralSteps(body) {
    const steps = [];
    // Find the Procedural Steps section
    const psMatch = body.match(/##\s*Procedural\s*Steps?\s*\n([\s\S]*?)(?=\n##\s[^#]|$)/i);
    if (!psMatch) {
        return steps;
    }
    const psSection = psMatch[1];
    // Parse numbered steps
    const numberedPattern = /^\d+\.\s+(.+)$/gm;
    let match;
    let stepNumber = 1;
    while ((match = numberedPattern.exec(psSection)) !== null) {
        const text = match[1].trim();
        // Check for AC reference in text (e.g., "(AC-1)")
        const acRef = text.match(/\(AC-(\d+)\)/i);
        steps.push({
            number: stepNumber++,
            text: text.replace(/\s*\(AC-\d+\)\s*/gi, '').trim(),
            linkedAC: acRef ? `AC-${acRef[1]}` : undefined,
        });
    }
    // Also parse bullet points if no numbered steps
    if (steps.length === 0) {
        const bulletPattern = /^[-*]\s+(.+)$/gm;
        while ((match = bulletPattern.exec(psSection)) !== null) {
            const text = match[1].trim();
            const acRef = text.match(/\(AC-(\d+)\)/i);
            steps.push({
                number: stepNumber++,
                text: text.replace(/\s*\(AC-\d+\)\s*/gi, '').trim(),
                linkedAC: acRef ? `AC-${acRef[1]}` : undefined,
            });
        }
    }
    return steps;
}
/**
 * Parse data/environment notes from markdown body
 */
function parseDataNotes(body) {
    const notes = [];
    // Find Data/Environment section
    const dataMatch = body.match(/##\s*(Data|Environment|Data\/Environment)\s*(Notes?)?\s*\n([\s\S]*?)(?=\n##\s[^#]|$)/i);
    if (!dataMatch) {
        return notes;
    }
    const dataSection = dataMatch[3];
    // Extract bullet points
    const bulletPattern = /^[-*]\s+(.+)$/gm;
    let match;
    while ((match = bulletPattern.exec(dataSection)) !== null) {
        notes.push(match[1].trim());
    }
    return notes;
}
/**
 * Parse a journey markdown file
 * @param filePath - Path to the journey file
 * @returns Parsed journey structure
 * @throws JourneyParseError if parsing fails
 */
export function parseJourney(filePath) {
    const resolvedPath = resolve(filePath);
    if (!existsSync(resolvedPath)) {
        throw new JourneyParseError(`Journey file not found: ${resolvedPath}`, resolvedPath);
    }
    let content;
    try {
        content = readFileSync(resolvedPath, 'utf-8');
    }
    catch (err) {
        throw new JourneyParseError(`Failed to read journey file: ${resolvedPath}`, resolvedPath, err);
    }
    // Extract frontmatter and body
    let frontmatterStr;
    let body;
    try {
        const extracted = extractFrontmatter(content);
        frontmatterStr = extracted.frontmatter;
        body = extracted.body;
    }
    catch (err) {
        throw new JourneyParseError(`Invalid frontmatter in journey file: ${resolvedPath}`, resolvedPath, err);
    }
    // Parse YAML frontmatter
    let rawFrontmatter;
    try {
        rawFrontmatter = parseYaml(frontmatterStr);
    }
    catch (err) {
        throw new JourneyParseError(`Invalid YAML in journey frontmatter: ${resolvedPath}`, resolvedPath, err);
    }
    // Validate frontmatter with Zod
    const result = JourneyFrontmatterSchema.safeParse(rawFrontmatter);
    if (!result.success) {
        const issues = result.error.issues
            .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
            .join('\n');
        throw new JourneyParseError(`Invalid journey frontmatter in ${resolvedPath}:\n${issues}`, resolvedPath, result.error);
    }
    // Parse body sections
    const acceptanceCriteria = parseAcceptanceCriteria(body);
    const proceduralSteps = parseProceduralSteps(body);
    const dataNotes = parseDataNotes(body);
    return {
        frontmatter: result.data,
        body,
        acceptanceCriteria,
        proceduralSteps,
        dataNotes,
        sourcePath: resolvedPath,
    };
}
/**
 * Parse and validate a journey for AutoGen (must be clarified)
 */
export function parseJourneyForAutoGen(filePath) {
    const parsed = parseJourney(filePath);
    const validation = validateForAutoGen(parsed.frontmatter);
    if (!validation.valid) {
        throw new JourneyParseError(`Journey not ready for AutoGen:\n${validation.errors.map((e) => `  - ${e}`).join('\n')}`, filePath);
    }
    return parsed;
}
/**
 * Parse journey from string content (for testing)
 */
export function parseJourneyContent(content, virtualPath = 'virtual.journey.md') {
    // Extract frontmatter and body
    const { frontmatter: frontmatterStr, body } = extractFrontmatter(content);
    // Parse YAML frontmatter
    const rawFrontmatter = parseYaml(frontmatterStr);
    // Validate frontmatter with Zod
    const result = JourneyFrontmatterSchema.safeParse(rawFrontmatter);
    if (!result.success) {
        const issues = result.error.issues
            .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
            .join('\n');
        throw new JourneyParseError(`Invalid journey frontmatter:\n${issues}`, virtualPath, result.error);
    }
    // Parse body sections
    const acceptanceCriteria = parseAcceptanceCriteria(body);
    const proceduralSteps = parseProceduralSteps(body);
    const dataNotes = parseDataNotes(body);
    return {
        frontmatter: result.data,
        body,
        acceptanceCriteria,
        proceduralSteps,
        dataNotes,
        sourcePath: virtualPath,
    };
}
//# sourceMappingURL=parseJourney.js.map