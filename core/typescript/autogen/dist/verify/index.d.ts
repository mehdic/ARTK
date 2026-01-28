export { E as ErrorAttachment, F as FailureCategory, a as FailureClassification, P as ParsedSummary, b as PlaywrightReport, c as ReportStep, R as RunnerOptions, d as RunnerResult, S as StabilityOptions, e as StabilityResult, f as SummaryOptions, T as TestError, g as TestResult, h as TestSpec, i as TestStatus, j as TestSuite, V as VerifySummary, k as buildPlaywrightArgs, l as checkStability, m as checkTestSyntax, n as classifyError, o as classifyTestResult, p as classifyTestResults, q as extractErrorMessages, r as extractErrorStacks, s as extractTestResults, t as findTestsByTag, u as findTestsByTitle, v as formatTestResult, w as formatVerifySummary, x as generateClassificationReport, y as generateMarkdownSummary, z as generateStabilityReport, A as generateSummaryFromReport, B as generateVerifySummary, C as getFailedStep, D as getFailedTests, G as getFailureStats, H as getFlakinessScore, I as getFlakyTests, J as getHealableFailures, K as getPlaywrightVersion, L as getRecommendations, M as getSummary, N as getTestCount, O as hasFailures, Q as isHealable, U as isPlaywrightAvailable, W as isReportSuccessful, X as isTestStable, Y as isVerificationPassed, Z as parseReportContent, _ as parseReportFile, $ as quickStabilityCheck, a0 as reportHasFlaky, a1 as runJourneyTests, a2 as runPlaywrightAsync, a3 as runPlaywrightSync, a4 as runTestFile, a5 as saveSummary, a6 as shouldQuarantine, a7 as summaryHasFlaky, a8 as thoroughStabilityCheck, a9 as writeAndRunTest } from '../summary-CbZa5Rg8.js';

/**
 * ARIA snapshot for an element
 */
interface ARIASnapshot {
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
interface Evidence {
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
interface EvidenceOptions {
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
declare function generateARIACaptureCode(): string;
/**
 * Generate Playwright code for full evidence capture
 */
declare function generateEvidenceCaptureCode(options?: EvidenceOptions): string;
/**
 * Create evidence directory
 */
declare function createEvidenceDir(basePath: string, testId: string): string;
/**
 * Save evidence to file
 */
declare function saveEvidence(evidence: Evidence, outputDir: string, testId: string): string;
/**
 * Load evidence from file
 */
declare function loadEvidence(filepath: string): Evidence | null;
/**
 * Compare two ARIA snapshots
 */
declare function compareARIASnapshots(expected: ARIASnapshot, actual: ARIASnapshot): {
    matches: boolean;
    differences: string[];
};
/**
 * Find element in ARIA snapshot by role and name
 */
declare function findInSnapshot(snapshot: ARIASnapshot, role: string, name?: string): ARIASnapshot | null;
/**
 * Generate ARIA tree as text
 */
declare function formatARIATree(snapshot: ARIASnapshot, indent?: number): string;
/**
 * Generate evidence report
 */
declare function generateEvidenceReport(evidence: Evidence): string;

export { type ARIASnapshot, type Evidence, type EvidenceOptions, compareARIASnapshots, createEvidenceDir, findInSnapshot, formatARIATree, generateARIACaptureCode, generateEvidenceCaptureCode, generateEvidenceReport, loadEvidence, saveEvidence };
