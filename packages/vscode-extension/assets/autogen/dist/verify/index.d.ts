export { E as ErrorAttachment, H as FailureCategory, I as FailureClassification, o as ParsedSummary, P as PlaywrightReport, k as ReportStep, R as RunnerOptions, a as RunnerResult, S as StabilityOptions, U as StabilityResult, a1 as SummaryOptions, j as TestError, l as TestResult, n as TestSpec, T as TestStatus, m as TestSuite, V as VerifySummary, b as buildPlaywrightArgs, W as checkStability, f as checkTestSyntax, J as classifyError, K as classifyTestResult, L as classifyTestResults, z as extractErrorMessages, A as extractErrorStacks, s as extractTestResults, y as findTestsByTag, x as findTestsByTitle, F as formatTestResult, a8 as formatVerifySummary, Q as generateClassificationReport, G as generateMarkdownSummary, a0 as generateStabilityReport, a3 as generateSummaryFromReport, a2 as generateVerifySummary, B as getFailedStep, u as getFailedTests, M as getFailureStats, _ as getFlakinessScore, v as getFlakyTests, O as getHealableFailures, g as getPlaywrightVersion, a7 as getRecommendations, t as getSummary, h as getTestCount, a5 as hasFailures, N as isHealable, i as isPlaywrightAvailable, C as isReportSuccessful, Z as isTestStable, a4 as isVerificationPassed, q as parseReportContent, p as parseReportFile, X as quickStabilityCheck, D as reportHasFlaky, e as runJourneyTests, c as runPlaywrightAsync, r as runPlaywrightSync, d as runTestFile, a9 as saveSummary, $ as shouldQuarantine, a6 as summaryHasFlaky, Y as thoroughStabilityCheck, w as writeAndRunTest } from '../summary-BM0N-HYj.js';

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
