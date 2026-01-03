/**
 * ARIA snapshot for an element
 */
export interface ARIASnapshot {
    /** Role of the element */
    role: string;
    /** Accessible name */
    name?: string;
    /** Current value */
    value?: string;
    /** Whether element is disabled */
    disabled?: boolean;
    /** Whether element is checked (for checkboxes/radios) */
    checked?: boolean;
    /** Whether element is expanded (for accordions/dropdowns) */
    expanded?: boolean;
    /** Whether element is pressed (for toggle buttons) */
    pressed?: boolean;
    /** Hierarchical level (for headings) */
    level?: number;
    /** Child elements */
    children?: ARIASnapshot[];
    /** Element's text content */
    text?: string;
    /** Additional ARIA attributes */
    attributes?: Record<string, string>;
}
/**
 * Evidence collection result
 */
export interface Evidence {
    /** Timestamp of collection */
    timestamp: string;
    /** URL where evidence was captured */
    url: string;
    /** Page title */
    title: string;
    /** ARIA snapshot of the page */
    ariaSnapshot?: ARIASnapshot;
    /** Path to screenshot */
    screenshotPath?: string;
    /** Path to trace file */
    tracePath?: string;
    /** Console messages */
    consoleMessages?: string[];
    /** Network errors */
    networkErrors?: string[];
    /** Custom metadata */
    metadata?: Record<string, unknown>;
}
/**
 * Evidence collection options
 */
export interface EvidenceOptions {
    /** Directory to save evidence */
    outputDir?: string;
    /** Capture screenshot */
    captureScreenshot?: boolean;
    /** Capture ARIA snapshot */
    captureAria?: boolean;
    /** Capture console logs */
    captureConsole?: boolean;
    /** Capture network errors */
    captureNetwork?: boolean;
    /** Custom filename prefix */
    prefix?: string;
}
/**
 * Generate Playwright code for capturing ARIA snapshot
 */
export declare function generateARIACaptureCode(): string;
/**
 * Generate Playwright code for full evidence capture
 */
export declare function generateEvidenceCaptureCode(options?: EvidenceOptions): string;
/**
 * Create evidence directory
 */
export declare function createEvidenceDir(basePath: string, testId: string): string;
/**
 * Save evidence to file
 */
export declare function saveEvidence(evidence: Evidence, outputDir: string, testId: string): string;
/**
 * Load evidence from file
 */
export declare function loadEvidence(filepath: string): Evidence | null;
/**
 * Compare two ARIA snapshots
 */
export declare function compareARIASnapshots(expected: ARIASnapshot, actual: ARIASnapshot): {
    matches: boolean;
    differences: string[];
};
/**
 * Find element in ARIA snapshot by role and name
 */
export declare function findInSnapshot(snapshot: ARIASnapshot, role: string, name?: string): ARIASnapshot | null;
/**
 * Generate ARIA tree as text
 */
export declare function formatARIATree(snapshot: ARIASnapshot, indent?: number): string;
/**
 * Generate evidence report
 */
export declare function generateEvidenceReport(evidence: Evidence): string;
//# sourceMappingURL=evidence.d.ts.map