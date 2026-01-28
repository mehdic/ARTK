import { d as IRJourney } from './types-CBcw78BQ.js';
export { A as AccessibilityConfig, e as AccessibilityTiming, f as CleanupStrategy, C as CompletionSignal, g as CompletionSignalType, D as DataStrategy, a as IRMappingResult, I as IRPrimitive, c as IRStep, J as JourneyDataConfig, h as JourneyTier, b as LocatorSpec, L as LocatorStrategy, M as ModuleDependencies, N as NegativePath, P as PerformanceConfig, T as TestDataSet, V as ValueSpec, i as VisualRegressionConfig } from './types-CBcw78BQ.js';
export { IR, JourneyBuilder, LocatorBuilder, SerializeOptions, StepBuilder, ValueBuilder, describeLocator, describePrimitive, serializeJourney, serializePrimitive, serializeStep, summarizeJourney } from './ir/index.js';
import { A as AutogenConfig } from './schema-BIeeAav7.js';
export { a as AutogenConfigSchema, E as EslintRulesSchema, b as EslintSeverity, c as EslintSeveritySchema, H as Heal, d as HealSchema, L as LLKBIntegration, e as LLKBIntegrationLevel, f as LLKBIntegrationLevelSchema, g as LLKBIntegrationSchema, P as Paths, h as PathsSchema, R as RegenerationStrategy, i as RegenerationStrategySchema, S as SelectorPolicy, j as SelectorPolicySchema, k as SelectorStrategy, l as SelectorStrategySchema, V as Validation, m as ValidationSchema } from './schema-BIeeAav7.js';
export { ConfigLoadError, findConfigFile, getDefaultConfig, getSchemaVersion, loadConfig, loadConfigWithMigration, loadConfigs, loadLLKBConfig, mergeConfigs, needsConfigMigration, resolveConfigPath } from './config/index.js';
export { A as AcceptanceCriterion, X as CodedError, J as JourneyFrontmatter, m as JourneyFrontmatterSchema, n as JourneyParseError, o as JourneyStatus, p as JourneyStatusSchema, P as ParsedJourney, x as ProceduralStep, Y as Result, S as StructuredStep, y as StructuredStepAction, Z as andThen, _ as codedError, $ as collect, a0 as err, a1 as isErr, a2 as isOk, a3 as map, a4 as mapErr, a5 as ok, H as parseJourney, K as parseJourneyContent, O as parseJourneyForAutoGen, R as parseStructuredSteps, a6 as partition, a7 as tryCatch, a8 as tryCatchAsync, U as tryParseJourneyContent, a9 as unwrap, aa as unwrapOr } from './parseJourney-pVvnO7Mc.js';
export { N as NormalizeOptions, c as completionSignalsToAssertions, n as normalizeJourney, v as validateJourneyForCodeGen } from './normalize-CTo3B0Th.js';
export { A as ACMappingResult, E as ExtendedGlossaryMeta, G as Glossary, a as GlossaryEntry, L as LabelAlias, M as ModuleMethodMapping, P as PATTERN_VERSION, b as PatternMatch, c as PatternMetadata, d as StepMapperOptions, e as StepMappingResult, S as StepPattern, f as allPatterns, g as authPatterns, h as checkPatterns, i as clearExtendedGlossary, j as clickPatterns, k as createLocatorFromMatch, l as createValueFromText, m as defaultGlossary, n as extendedAssertionPatterns, o as extendedClickPatterns, p as extendedFillPatterns, q as extendedNavigationPatterns, r as extendedSelectPatterns, s as extendedWaitPatterns, t as fillPatterns, u as findLabelAlias, v as findMatchingPatterns, w as findModuleMethod, x as focusPatterns, y as getAllPatternNames, z as getGlossary, B as getGlossaryStats, C as getLabelAliases, D as getLocatorFromLabel, F as getMappingStats, H as getModuleMethods, I as getPatternCountByCategory, J as getPatternMatches, K as getPatternMetadata, N as getSynonyms, O as hasExtendedGlossary, Q as hoverPatterns, R as initGlossary, T as initializeLlkb, U as isLlkbAvailable, V as isSynonymOf, W as loadExtendedGlossary, X as loadGlossary, Y as lookupCoreGlossary, Z as lookupGlossary, _ as mapAcceptanceCriterion, $ as mapProceduralStep, a0 as mapStepText, a1 as mapSteps, a2 as matchPattern, a3 as mergeGlossaries, a4 as navigationPatterns, a5 as normalizeStepText, a6 as parseSelectorToLocator, a7 as resetGlossaryCache, a8 as resolveCanonical, a9 as resolveModuleMethod, aa as selectPatterns, ab as structuredPatterns, ac as suggestImprovements, ad as toastPatterns, ae as urlPatterns, af as visibilityPatterns, ag as waitPatterns } from './stepMapper-CK4Zixeq.js';
export { DEFAULT_SELECTOR_PRIORITY, ELEMENT_TYPE_STRATEGIES, NAMEABLE_ROLES, compareLocators, createCssSelector, extractName, getRecommendedStrategies, getSelectorPriority, inferBestSelector, inferButtonSelector, inferCheckboxSelector, inferElementType, inferHeadingSelector, inferInputSelector, inferLinkSelector, inferRole, inferSelectorWithCatalog, inferSelectors, inferSelectorsWithCatalog, inferTabSelector, inferTestIdSelector, inferTextSelector, isCssLocator, isForbiddenSelector, isRoleLocator, isSemanticLocator, isTestIdLocator, scoreLocator, selectBestLocator, suggestSelectorApproach, toPlaywrightLocator, validateLocator } from './selectors/index.js';
import { z } from 'zod';
import { GenerateTestOptions, GenerateModuleOptions, GenerateModuleResult, GenerateTestResult } from './codegen/index.js';
export { AddLocatorResult, AstEditOptions, AstEditResult, ImportStatement, MethodParam, ModuleDefinition, ModuleLocator, ModuleMethod, ModuleRegistry, RegistryEntry, RegistryOptions, RegistryUpdateResult, __test_checkFeature, addLocatorProperty, addMethod, addNamedImport, addToRegistry, createProject, createRegistry, extractClassStructure, extractModuleDefinition, findClass, findEntriesByScope, findEntry, findMethod, findProperty, generateIndexContent, generateModule, generateModuleCode, generateTest, generateTestCode, getImport, getModuleNames, getRegistryStats, hasImport, hasModule, loadRegistry, loadSourceFile, mergeModuleFiles, parseIndexFile, removeFromRegistry, saveRegistry, scanModulesDirectory, updateIndexFile, updateModuleFile, validateSyntax } from './codegen/index.js';
import { CodeValidationOptions, CodeValidationResult } from './validate/index.js';
export { ACCoverageResult, CoverageOptions, CoverageResult, FORBIDDEN_PATTERNS, ForbiddenPattern, JourneyValidationOptions, JourneyValidationResult, LintOptions, LintResult, PLAYWRIGHT_LINT_RULES, PatternScanResult, TAG_PATTERNS, TagValidationOptions, TagValidationResult, ValidationIssue, ValidationSeverity, categorizeTags, filterBySeverity, findACReferences, findTestSteps, generateCoverageReport, generateESLintConfig, generateExpectedTags, generateValidationReport, getPatternStats, getViolationSummary, hasErrorViolations, hasLintErrors, isCodeValid, isESLintAvailable, isJourneyReady, isPlaywrightPluginAvailable, lintCode, lintFile, parseESLintOutput, parseTagsFromCode, parseTagsFromFrontmatter, scanForbiddenPatterns, scanResultsToIssues, validateCode, validateCodeCoverage, validateCodeSync, validateIRCoverage, validateJourneyFrontmatter, validateJourneySchema, validateJourneyStatus, validateJourneyTags, validateJourneyTier, validateTags, validateTagsInCode } from './validate/index.js';
import { R as RunnerOptions, V as VerifySummary } from './summary-0k8uEcy0.js';
export { E as ErrorAttachment, F as FailureCategory, a as FailureClassification, P as ParsedSummary, b as PlaywrightReport, c as ReportStep, d as RunnerResult, S as StabilityOptions, e as StabilityResult, f as SummaryOptions, T as TestError, g as TestResult, h as TestSpec, i as TestStatus, j as TestSuite, k as buildPlaywrightArgs, l as checkStability, m as checkTestSyntax, n as classifyError, o as classifyTestResult, p as classifyTestResults, q as extractErrorMessages, r as extractErrorStacks, s as extractTestResults, t as findTestsByTag, u as findTestsByTitle, v as formatTestResult, w as formatVerifySummary, x as generateClassificationReport, y as generateMarkdownSummary, z as generateStabilityReport, A as generateSummaryFromReport, B as generateVerifySummary, C as getFailedStep, D as getFailedTests, G as getFailureStats, H as getFlakinessScore, I as getFlakyTests, J as getHealableFailures, K as getPlaywrightVersion, L as getRecommendations, M as getSummary, N as getTestCount, O as hasFailures, Q as isHealable, U as isPlaywrightAvailable, W as isReportSuccessful, X as isTestStable, Y as isVerificationPassed, Z as parseReportContent, _ as parseReportFile, $ as quickStabilityCheck, a0 as reportHasFlaky, a1 as runJourneyTests, a2 as runPlaywrightAsync, a3 as runPlaywrightSync, a4 as runTestFile, a5 as saveSummary, a6 as shouldQuarantine, a7 as summaryHasFlaky, a8 as thoroughStabilityCheck, a9 as writeAndRunTest } from './summary-0k8uEcy0.js';
export { ARIASnapshot, Evidence, EvidenceOptions, compareARIASnapshots, createEvidenceDir, findInSnapshot, formatARIATree, generateARIACaptureCode, generateEvidenceCaptureCode, generateEvidenceReport, loadEvidence, saveEvidence } from './verify/index.js';
export { ARIANodeInfo, DEFAULT_HEALING_CONFIG, DEFAULT_HEALING_RULES, DataFixContext, DataFixResult, ForbiddenFixType, HealFixType, HealingAttempt, HealingConfig, HealingLog, HealingLogger, HealingLoopOptions, HealingLoopResult, HealingRule, HealingRuleResult, HealingSummary, NavigationFixContext, NavigationFixResult, SelectorFixContext, SelectorFixResult, TimingFixContext, TimingFixResult, UNHEALABLE_CATEGORIES, addCleanupHook, addExactToLocator, addNavigationWaitAfterClick, addRunIdVariable, addTimeout, aggregateHealingLogs, applyDataFix, applyNavigationFix, applySelectorFix, applyTimingFix, containsCSSSelector, convertToWebFirstAssertion, createHealingReport, evaluateHealing, extractCSSSelector, extractNameFromSelector, extractTestDataPatterns, extractTimeoutFromError, extractUrlFromError, extractUrlFromGoto, fixMissingAwait, fixMissingGotoAwait, formatHealingLog, generateLabelLocator, generateRoleLocator, generateRunId, generateTestIdLocator, generateTextLocator, generateToHaveURL, generateWaitForURL, getApplicableRules, getHealingRecommendation, getNextFix, getPostHealingRecommendation, hasDataIsolation, hasNavigationWait, inferRoleFromSelector, inferUrlPattern, insertNavigationWait, isCategoryHealable, isFixAllowed, isFixForbidden, loadHealingLog, namespaceEmail, namespaceName, previewHealingFixes, replaceHardcodedEmail, replaceHardcodedTestData, runHealingLoop, suggestTimeoutIncrease, wouldFixApply, wrapWithExpectPoll, wrapWithExpectToPass } from './heal/index.js';
export { VariantFeatures, VariantInfo } from './variants/index.js';
import 'ts-morph';

/**
 * Machine Hint Syntax Patterns - Define regex patterns for parsing hints
 * @see T071 - Define machine hint syntax regex patterns
 */
/**
 * Machine hint types
 */
type HintType = 'role' | 'testid' | 'label' | 'text' | 'exact' | 'level' | 'signal' | 'module' | 'wait' | 'timeout';
/**
 * Parsed machine hint
 */
interface MachineHint {
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
declare const HINT_BLOCK_PATTERN: RegExp;
/**
 * Pattern for a complete hints section: (...hints...)
 */
declare const HINTS_SECTION_PATTERN: RegExp;
/**
 * Individual hint patterns for validation
 */
declare const HINT_PATTERNS: Record<HintType, RegExp>;
/**
 * Valid ARIA roles for validation
 */
declare const VALID_ROLES: string[];
/**
 * Check if a role is valid
 */
declare function isValidRole(role: string): boolean;
/**
 * Extract hint value from a match (handles quoted and unquoted values)
 */
declare function extractHintValue(match: RegExpMatchArray): string | null;
/**
 * Check if text contains machine hints
 */
declare function containsHints(text: string): boolean;
/**
 * Remove hints section from step text
 */
declare function removeHints(text: string): string;

/**
 * Machine Hint Parser - Extract hints from Journey step text
 * @see T072 - Implement machine hint parser
 */

/**
 * Parsed hints result
 */
interface ParsedHints {
    /** All parsed hints */
    hints: MachineHint[];
    /** Step text with hints removed */
    cleanText: string;
    /** Original text */
    originalText: string;
    /** Validation warnings */
    warnings: string[];
}
/**
 * Locator hints extracted for code generation
 */
interface LocatorHints {
    /** ARIA role */
    role?: string;
    /** Test ID */
    testid?: string;
    /** Label text */
    label?: string;
    /** Text content */
    text?: string;
    /** Exact matching */
    exact?: boolean;
    /** Heading level (for role=heading) */
    level?: number;
}
/**
 * Behavioral hints extracted for code generation
 */
interface BehaviorHints {
    /** Signal to wait for */
    signal?: string;
    /** Module method to call */
    module?: string;
    /** Wait strategy */
    wait?: 'networkidle' | 'domcontentloaded' | 'load' | 'commit';
    /** Timeout in ms */
    timeout?: number;
}
/**
 * Complete hint extraction result
 */
interface ExtractedHints {
    /** Locator-related hints */
    locator: LocatorHints;
    /** Behavior-related hints */
    behavior: BehaviorHints;
    /** Whether any hints were found */
    hasHints: boolean;
    /** Clean step text */
    cleanText: string;
    /** Warnings */
    warnings: string[];
}
/**
 * Parse machine hints from step text
 */
declare function parseHints(text: string): ParsedHints;
/**
 * Extract structured hints for code generation
 */
declare function extractHints(text: string): ExtractedHints;
/**
 * Check if hints specify a locator strategy
 */
declare function hasLocatorHints(hints: ExtractedHints): boolean;
/**
 * Check if hints specify behavioral modifications
 */
declare function hasBehaviorHints(hints: ExtractedHints): boolean;
/**
 * Generate locator code from hints
 */
declare function generateLocatorFromHints(hints: LocatorHints): string | null;
/**
 * Parse module hint into module name and method
 */
declare function parseModuleHint(moduleHint: string): {
    module: string;
    method: string;
} | null;
/**
 * Validate hints for consistency
 */
declare function validateHints(hints: ExtractedHints): string[];
/**
 * Merge hints with inferred locator (hints take priority)
 */
declare function mergeWithInferred(hints: LocatorHints, inferred: {
    strategy: string;
    value: string;
}): {
    strategy: string;
    value: string;
    options?: Record<string, unknown>;
};

/**
 * Selector Catalog Schema - Define structure for repo-local selector catalog
 * @see T088 - Define selector catalog JSON schema
 */

/**
 * Selector entry in the catalog
 */
declare const SelectorEntrySchema: z.ZodObject<{
    /** Unique identifier for this selector */
    id: z.ZodString;
    /** Human-readable description */
    description: z.ZodOptional<z.ZodString>;
    /** The selector strategy */
    strategy: z.ZodEnum<["testid", "role", "label", "text", "css", "xpath"]>;
    /** The selector value */
    value: z.ZodString;
    /** Additional options for the locator */
    options: z.ZodOptional<z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        exact: z.ZodOptional<z.ZodBoolean>;
        level: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        exact?: boolean | undefined;
        level?: number | undefined;
        name?: string | undefined;
    }, {
        exact?: boolean | undefined;
        level?: number | undefined;
        name?: string | undefined;
    }>>;
    /** Component or page this selector belongs to */
    component: z.ZodOptional<z.ZodString>;
    /** File where this selector was discovered */
    sourceFile: z.ZodOptional<z.ZodString>;
    /** Line number in source file */
    sourceLine: z.ZodOptional<z.ZodNumber>;
    /** Tags for categorization */
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    /** Whether this is a stable selector (not likely to change) */
    stable: z.ZodDefault<z.ZodBoolean>;
    /** Last verified timestamp */
    lastVerified: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    value: string;
    strategy: "role" | "label" | "text" | "testid" | "css" | "xpath";
    id: string;
    stable: boolean;
    options?: {
        exact?: boolean | undefined;
        level?: number | undefined;
        name?: string | undefined;
    } | undefined;
    tags?: string[] | undefined;
    description?: string | undefined;
    component?: string | undefined;
    sourceFile?: string | undefined;
    sourceLine?: number | undefined;
    lastVerified?: string | undefined;
}, {
    value: string;
    strategy: "role" | "label" | "text" | "testid" | "css" | "xpath";
    id: string;
    options?: {
        exact?: boolean | undefined;
        level?: number | undefined;
        name?: string | undefined;
    } | undefined;
    tags?: string[] | undefined;
    description?: string | undefined;
    component?: string | undefined;
    sourceFile?: string | undefined;
    sourceLine?: number | undefined;
    stable?: boolean | undefined;
    lastVerified?: string | undefined;
}>;
/**
 * Component entry in the catalog
 */
declare const ComponentEntrySchema: z.ZodObject<{
    /** Component name */
    name: z.ZodString;
    /** Component file path */
    path: z.ZodOptional<z.ZodString>;
    /** Selectors within this component */
    selectors: z.ZodArray<z.ZodString, "many">;
    /** Child components */
    children: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    name: string;
    selectors: string[];
    path?: string | undefined;
    children?: string[] | undefined;
}, {
    name: string;
    selectors: string[];
    path?: string | undefined;
    children?: string[] | undefined;
}>;
/**
 * Page entry in the catalog
 */
declare const PageEntrySchema: z.ZodObject<{
    /** Page name */
    name: z.ZodString;
    /** Route pattern */
    route: z.ZodOptional<z.ZodString>;
    /** Page file path */
    path: z.ZodOptional<z.ZodString>;
    /** Components on this page */
    components: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    /** Direct selectors on this page */
    selectors: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    name: string;
    path?: string | undefined;
    selectors?: string[] | undefined;
    route?: string | undefined;
    components?: string[] | undefined;
}, {
    name: string;
    path?: string | undefined;
    selectors?: string[] | undefined;
    route?: string | undefined;
    components?: string[] | undefined;
}>;
/**
 * CSS debt entry - tracks CSS selectors that should be migrated
 */
declare const CSSDebtEntrySchema: z.ZodObject<{
    /** The CSS selector being used */
    selector: z.ZodString;
    /** Files using this selector */
    usages: z.ZodArray<z.ZodObject<{
        file: z.ZodString;
        line: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        file: string;
        line: number;
    }, {
        file: string;
        line: number;
    }>, "many">;
    /** Suggested replacement */
    suggestedReplacement: z.ZodOptional<z.ZodObject<{
        strategy: z.ZodString;
        value: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        value: string;
        strategy: string;
    }, {
        value: string;
        strategy: string;
    }>>;
    /** Priority for migration (higher = more urgent) */
    priority: z.ZodDefault<z.ZodEnum<["low", "medium", "high"]>>;
    /** Reason this is considered debt */
    reason: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    priority: "low" | "medium" | "high";
    selector: string;
    usages: {
        file: string;
        line: number;
    }[];
    reason?: string | undefined;
    suggestedReplacement?: {
        value: string;
        strategy: string;
    } | undefined;
}, {
    selector: string;
    usages: {
        file: string;
        line: number;
    }[];
    priority?: "low" | "medium" | "high" | undefined;
    reason?: string | undefined;
    suggestedReplacement?: {
        value: string;
        strategy: string;
    } | undefined;
}>;
/**
 * Complete selector catalog schema
 */
declare const SelectorCatalogSchema: z.ZodObject<{
    /** Schema version */
    version: z.ZodDefault<z.ZodString>;
    /** Generation timestamp */
    generatedAt: z.ZodString;
    /** Source directory that was scanned */
    sourceDir: z.ZodOptional<z.ZodString>;
    /** All selectors indexed by ID */
    selectors: z.ZodRecord<z.ZodString, z.ZodObject<{
        /** Unique identifier for this selector */
        id: z.ZodString;
        /** Human-readable description */
        description: z.ZodOptional<z.ZodString>;
        /** The selector strategy */
        strategy: z.ZodEnum<["testid", "role", "label", "text", "css", "xpath"]>;
        /** The selector value */
        value: z.ZodString;
        /** Additional options for the locator */
        options: z.ZodOptional<z.ZodObject<{
            name: z.ZodOptional<z.ZodString>;
            exact: z.ZodOptional<z.ZodBoolean>;
            level: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            exact?: boolean | undefined;
            level?: number | undefined;
            name?: string | undefined;
        }, {
            exact?: boolean | undefined;
            level?: number | undefined;
            name?: string | undefined;
        }>>;
        /** Component or page this selector belongs to */
        component: z.ZodOptional<z.ZodString>;
        /** File where this selector was discovered */
        sourceFile: z.ZodOptional<z.ZodString>;
        /** Line number in source file */
        sourceLine: z.ZodOptional<z.ZodNumber>;
        /** Tags for categorization */
        tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Whether this is a stable selector (not likely to change) */
        stable: z.ZodDefault<z.ZodBoolean>;
        /** Last verified timestamp */
        lastVerified: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        value: string;
        strategy: "role" | "label" | "text" | "testid" | "css" | "xpath";
        id: string;
        stable: boolean;
        options?: {
            exact?: boolean | undefined;
            level?: number | undefined;
            name?: string | undefined;
        } | undefined;
        tags?: string[] | undefined;
        description?: string | undefined;
        component?: string | undefined;
        sourceFile?: string | undefined;
        sourceLine?: number | undefined;
        lastVerified?: string | undefined;
    }, {
        value: string;
        strategy: "role" | "label" | "text" | "testid" | "css" | "xpath";
        id: string;
        options?: {
            exact?: boolean | undefined;
            level?: number | undefined;
            name?: string | undefined;
        } | undefined;
        tags?: string[] | undefined;
        description?: string | undefined;
        component?: string | undefined;
        sourceFile?: string | undefined;
        sourceLine?: number | undefined;
        stable?: boolean | undefined;
        lastVerified?: string | undefined;
    }>>;
    /** Components indexed by name */
    components: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodObject<{
        /** Component name */
        name: z.ZodString;
        /** Component file path */
        path: z.ZodOptional<z.ZodString>;
        /** Selectors within this component */
        selectors: z.ZodArray<z.ZodString, "many">;
        /** Child components */
        children: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        selectors: string[];
        path?: string | undefined;
        children?: string[] | undefined;
    }, {
        name: string;
        selectors: string[];
        path?: string | undefined;
        children?: string[] | undefined;
    }>>>;
    /** Pages indexed by name */
    pages: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodObject<{
        /** Page name */
        name: z.ZodString;
        /** Route pattern */
        route: z.ZodOptional<z.ZodString>;
        /** Page file path */
        path: z.ZodOptional<z.ZodString>;
        /** Components on this page */
        components: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        /** Direct selectors on this page */
        selectors: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        path?: string | undefined;
        selectors?: string[] | undefined;
        route?: string | undefined;
        components?: string[] | undefined;
    }, {
        name: string;
        path?: string | undefined;
        selectors?: string[] | undefined;
        route?: string | undefined;
        components?: string[] | undefined;
    }>>>;
    /** TestIDs found in the codebase */
    testIds: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    /** CSS debt entries */
    cssDebt: z.ZodDefault<z.ZodArray<z.ZodObject<{
        /** The CSS selector being used */
        selector: z.ZodString;
        /** Files using this selector */
        usages: z.ZodArray<z.ZodObject<{
            file: z.ZodString;
            line: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            file: string;
            line: number;
        }, {
            file: string;
            line: number;
        }>, "many">;
        /** Suggested replacement */
        suggestedReplacement: z.ZodOptional<z.ZodObject<{
            strategy: z.ZodString;
            value: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            value: string;
            strategy: string;
        }, {
            value: string;
            strategy: string;
        }>>;
        /** Priority for migration (higher = more urgent) */
        priority: z.ZodDefault<z.ZodEnum<["low", "medium", "high"]>>;
        /** Reason this is considered debt */
        reason: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        priority: "low" | "medium" | "high";
        selector: string;
        usages: {
            file: string;
            line: number;
        }[];
        reason?: string | undefined;
        suggestedReplacement?: {
            value: string;
            strategy: string;
        } | undefined;
    }, {
        selector: string;
        usages: {
            file: string;
            line: number;
        }[];
        priority?: "low" | "medium" | "high" | undefined;
        reason?: string | undefined;
        suggestedReplacement?: {
            value: string;
            strategy: string;
        } | undefined;
    }>, "many">>;
    /** Statistics */
    stats: z.ZodOptional<z.ZodObject<{
        totalSelectors: z.ZodNumber;
        byStrategy: z.ZodRecord<z.ZodString, z.ZodNumber>;
        stableCount: z.ZodNumber;
        unstableCount: z.ZodNumber;
        cssDebtCount: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        totalSelectors: number;
        byStrategy: Record<string, number>;
        stableCount: number;
        unstableCount: number;
        cssDebtCount: number;
    }, {
        totalSelectors: number;
        byStrategy: Record<string, number>;
        stableCount: number;
        unstableCount: number;
        cssDebtCount: number;
    }>>;
}, "strip", z.ZodTypeAny, {
    version: string;
    selectors: Record<string, {
        value: string;
        strategy: "role" | "label" | "text" | "testid" | "css" | "xpath";
        id: string;
        stable: boolean;
        options?: {
            exact?: boolean | undefined;
            level?: number | undefined;
            name?: string | undefined;
        } | undefined;
        tags?: string[] | undefined;
        description?: string | undefined;
        component?: string | undefined;
        sourceFile?: string | undefined;
        sourceLine?: number | undefined;
        lastVerified?: string | undefined;
    }>;
    components: Record<string, {
        name: string;
        selectors: string[];
        path?: string | undefined;
        children?: string[] | undefined;
    }>;
    generatedAt: string;
    pages: Record<string, {
        name: string;
        path?: string | undefined;
        selectors?: string[] | undefined;
        route?: string | undefined;
        components?: string[] | undefined;
    }>;
    testIds: string[];
    cssDebt: {
        priority: "low" | "medium" | "high";
        selector: string;
        usages: {
            file: string;
            line: number;
        }[];
        reason?: string | undefined;
        suggestedReplacement?: {
            value: string;
            strategy: string;
        } | undefined;
    }[];
    sourceDir?: string | undefined;
    stats?: {
        totalSelectors: number;
        byStrategy: Record<string, number>;
        stableCount: number;
        unstableCount: number;
        cssDebtCount: number;
    } | undefined;
}, {
    selectors: Record<string, {
        value: string;
        strategy: "role" | "label" | "text" | "testid" | "css" | "xpath";
        id: string;
        options?: {
            exact?: boolean | undefined;
            level?: number | undefined;
            name?: string | undefined;
        } | undefined;
        tags?: string[] | undefined;
        description?: string | undefined;
        component?: string | undefined;
        sourceFile?: string | undefined;
        sourceLine?: number | undefined;
        stable?: boolean | undefined;
        lastVerified?: string | undefined;
    }>;
    generatedAt: string;
    version?: string | undefined;
    components?: Record<string, {
        name: string;
        selectors: string[];
        path?: string | undefined;
        children?: string[] | undefined;
    }> | undefined;
    sourceDir?: string | undefined;
    pages?: Record<string, {
        name: string;
        path?: string | undefined;
        selectors?: string[] | undefined;
        route?: string | undefined;
        components?: string[] | undefined;
    }> | undefined;
    testIds?: string[] | undefined;
    cssDebt?: {
        selector: string;
        usages: {
            file: string;
            line: number;
        }[];
        priority?: "low" | "medium" | "high" | undefined;
        reason?: string | undefined;
        suggestedReplacement?: {
            value: string;
            strategy: string;
        } | undefined;
    }[] | undefined;
    stats?: {
        totalSelectors: number;
        byStrategy: Record<string, number>;
        stableCount: number;
        unstableCount: number;
        cssDebtCount: number;
    } | undefined;
}>;
type SelectorEntry = z.infer<typeof SelectorEntrySchema>;
type ComponentEntry = z.infer<typeof ComponentEntrySchema>;
type PageEntry = z.infer<typeof PageEntrySchema>;
type CSSDebtEntry = z.infer<typeof CSSDebtEntrySchema>;
type SelectorCatalog = z.infer<typeof SelectorCatalogSchema>;
/**
 * Create an empty catalog
 */
declare function createEmptyCatalog(): SelectorCatalog;
/**
 * Validate a catalog object
 */
declare function validateCatalog(catalog: unknown): {
    valid: boolean;
    errors: string[];
    catalog?: SelectorCatalog;
};

/**
 * Load selector catalog from file
 * @param path - Path to catalog JSON file
 */
declare function loadCatalog(path?: string): SelectorCatalog;
/**
 * Save catalog to file
 * @param catalog - Catalog to save
 * @param path - Path to save to
 */
declare function saveCatalog(catalog: SelectorCatalog, path?: string): void;
/**
 * Get the current catalog (loads if not cached)
 */
declare function getCatalog(): SelectorCatalog;
/**
 * Reset catalog cache (for testing)
 */
declare function resetCatalogCache(): void;
/**
 * Find a selector by ID
 */
declare function findSelectorById(id: string): SelectorEntry | null;
/**
 * Find selectors by testid
 */
declare function findByTestId(testId: string): SelectorEntry | null;
/**
 * Find selectors by component name
 */
declare function findByComponent(componentName: string): SelectorEntry[];
/**
 * Find selectors by page name
 */
declare function findByPage(pageName: string): SelectorEntry[];
/**
 * Search selectors by text (searches description, value, tags)
 */
declare function searchSelectors(query: string): SelectorEntry[];
/**
 * Get all testids in the catalog
 */
declare function getAllTestIds(): string[];
/**
 * Check if a testid exists in the catalog
 */
declare function hasTestId(testId: string): boolean;
/**
 * Add a selector to the catalog
 */
declare function addSelector(selector: SelectorEntry): void;
/**
 * Remove a selector from the catalog
 */
declare function removeSelector(id: string): boolean;
/**
 * Get selectors that need migration (CSS debt)
 */
declare function getCSSDebt(): SelectorCatalog['cssDebt'];
/**
 * Get stable selectors for a given element description
 * Useful for test generation to find the best available selector
 */
declare function suggestSelector(description: string): SelectorEntry | null;

/**
 * Scanner options
 */
interface ScannerOptions {
    /** Source directory to scan */
    sourceDir: string;
    /** Test ID attribute name */
    testIdAttribute?: string;
    /** File patterns to include */
    include?: string[];
    /** File patterns to exclude */
    exclude?: string[];
    /** Whether to track CSS selector debt */
    trackCSSDebt?: boolean;
    /** Existing catalog to merge with */
    existingCatalog?: SelectorCatalog;
}
/**
 * Scanner result
 */
interface ScannerResult {
    /** Generated catalog */
    catalog: SelectorCatalog;
    /** Files scanned */
    filesScanned: number;
    /** TestIDs found */
    testIdsFound: number;
    /** CSS debt entries found */
    cssDebtFound: number;
    /** Warnings during scanning */
    warnings: string[];
}
/**
 * Scan source directory for testids
 */
declare function scanForTestIds(options: ScannerOptions): Promise<ScannerResult>;
/**
 * Quick scan to just get testids (faster, no full catalog)
 */
declare function quickScanTestIds(sourceDir: string, testIdAttribute?: string): Promise<string[]>;

/**
 * Selector Debt Tracker - Track CSS selector usage and generate debt reports
 * @see T093 - Implement selector debt tracker
 */

/**
 * Debt report summary
 */
interface DebtReportSummary {
    /** Total number of CSS debt entries */
    totalDebt: number;
    /** Breakdown by priority */
    byPriority: {
        high: number;
        medium: number;
        low: number;
    };
    /** Total usage count across all debt */
    totalUsages: number;
    /** Files with most debt */
    topDebtFiles: Array<{
        file: string;
        count: number;
    }>;
    /** Most common problematic selectors */
    topSelectors: Array<{
        selector: string;
        usageCount: number;
        priority: string;
    }>;
}
/**
 * Debt migration plan
 */
interface MigrationPlan {
    /** Entries to migrate */
    entries: Array<{
        debt: CSSDebtEntry;
        suggestedFix: string;
        effort: 'low' | 'medium' | 'high';
    }>;
    /** Estimated total effort */
    estimatedEffort: string;
    /** Recommended migration order */
    migrationOrder: string[];
}
/**
 * Record CSS selector usage as debt
 */
declare function recordCSSDebt(selector: string, file: string, line: number, reason?: string): void;
/**
 * Suggest replacement for a CSS selector
 */
declare function suggestReplacement(selector: string): {
    strategy: string;
    value: string;
    code: string;
};
/**
 * Generate debt report summary
 */
declare function generateDebtReport(catalog?: SelectorCatalog): DebtReportSummary;
/**
 * Generate migration plan for addressing debt
 */
declare function generateMigrationPlan(catalog?: SelectorCatalog): MigrationPlan;
/**
 * Clear all debt entries (for testing or after migration)
 */
declare function clearDebt(): void;
/**
 * Remove specific debt entry
 */
declare function removeDebt(selector: string): boolean;
/**
 * Update debt priority
 */
declare function updateDebtPriority(selector: string, priority: 'low' | 'medium' | 'high'): boolean;
/**
 * Generate markdown debt report
 */
declare function generateDebtMarkdown(catalog?: SelectorCatalog): string;

/**
 * Managed Blocks - Alternative to AST editing for simpler code regeneration
 * @see research/2026-01-03_autogen-remaining-features-plan.md Feature 4
 */
/**
 * Block markers for generated code boundaries
 */
declare const BLOCK_START = "// ARTK:BEGIN GENERATED";
declare const BLOCK_END = "// ARTK:END GENERATED";
declare const BLOCK_ID_PATTERN: RegExp;
/**
 * Represents a managed block of generated code
 */
interface ManagedBlock {
    /** Optional identifier for the block */
    id?: string;
    /** Starting line number (0-indexed) */
    startLine: number;
    /** Ending line number (0-indexed) */
    endLine: number;
    /** Content between markers (excluding markers themselves) */
    content: string;
}
/**
 * Information about a malformed block
 */
interface BlockWarning {
    /** Type of warning */
    type: 'nested' | 'unclosed';
    /** Line number where the issue occurred */
    line: number;
    /** Human-readable message */
    message: string;
}
/**
 * Result of extracting managed blocks from code
 */
interface BlockExtractionResult {
    /** All managed blocks found */
    blocks: ManagedBlock[];
    /** Code outside of managed blocks */
    preservedCode: string[];
    /** Whether any blocks were found */
    hasBlocks: boolean;
    /** Warnings about malformed blocks */
    warnings: BlockWarning[];
}
/**
 * Options for injecting managed blocks
 */
interface InjectBlocksOptions {
    /** Existing file content */
    existingCode: string;
    /** New blocks to inject */
    newBlocks: Array<{
        id?: string;
        content: string;
    }>;
    /** Whether to preserve block order (default: true) */
    preserveOrder?: boolean;
}
/**
 * Extract managed blocks from existing code
 *
 * @param code - Source code to analyze
 * @returns Extraction result with blocks and preserved code
 *
 * @example
 * ```typescript
 * const result = extractManagedBlocks(`
 *   // User code
 *   // ARTK:BEGIN GENERATED id=test-1
 *   test('example', () => {});
 *   // ARTK:END GENERATED
 *   // More user code
 * `);
 * // result.blocks.length === 1
 * // result.blocks[0].id === 'test-1'
 * ```
 */
declare function extractManagedBlocks(code: string): BlockExtractionResult;
/**
 * Wrap content in managed block markers
 *
 * @param content - Code to wrap
 * @param id - Optional block identifier
 * @returns Wrapped content with markers
 *
 * @example
 * ```typescript
 * const wrapped = wrapInBlock("test('foo', () => {});", 'test-foo');
 * // Returns:
 * // // ARTK:BEGIN GENERATED id=test-foo
 * // test('foo', () => {});
 * // // ARTK:END GENERATED
 * ```
 */
declare function wrapInBlock(content: string, id?: string): string;
/**
 * Inject managed blocks into code, preserving user code outside blocks
 *
 * Behavior:
 * - If existing code has no blocks: append new blocks at end
 * - If existing code has blocks: replace matching blocks by ID
 * - If block ID not found: append new block at end
 * - All code outside blocks is preserved
 *
 * @param options - Injection options
 * @returns Updated code with injected blocks
 *
 * @example
 * ```typescript
 * const result = injectManagedBlocks({
 *   existingCode: `
 *     // User helper
 *     // ARTK:BEGIN GENERATED id=old-test
 *     test('old', () => {});
 *     // ARTK:END GENERATED
 *   `,
 *   newBlocks: [
 *     { id: 'old-test', content: "test('new', () => {});" }
 *   ]
 * });
 * // result contains replaced block with new content
 * ```
 */
declare function injectManagedBlocks(options: InjectBlocksOptions): string;

/**
 * Shared escaping utilities for code generation.
 * Consolidates escapeRegex and escapeString from multiple locations.
 */
/**
 * Escape special regex characters in a string.
 * Includes forward slash for URL patterns.
 */
declare function escapeRegex(str: string): string;
/**
 * Escape a string for use in generated JavaScript/TypeScript code.
 * Handles quotes, backslashes, newlines, and carriage returns.
 */
declare function escapeString(str: string): string;
/**
 * Escape a selector string for use in Playwright locators.
 * Handles quotes that would break the selector syntax.
 */
declare function escapeSelector(str: string): string;

/**
 * Get the package version
 *
 * Priority:
 * 1. Build-time define (__ARTK_VERSION__)
 * 2. Environment variable (ARTK_VERSION)
 * 3. Runtime package.json reading (fallback)
 */
declare function getPackageVersion(): string;
/**
 * Get ISO timestamp for generated file headers
 */
declare function getGeneratedTimestamp(): string;
/**
 * Generate a standard header comment for generated files
 */
interface GeneratedHeaderOptions {
    title?: string;
    journeyId?: string;
    tags?: string[];
    tier?: string;
    scope?: string;
    actor?: string;
}
declare function generateFileHeader(options?: GeneratedHeaderOptions): string;
/**
 * Branding string for inline comments
 */
declare function getBrandingComment(): string;

/**
 * Safe parsing utilities for CLI arguments and configuration values
 *
 * These utilities prevent common issues with parseInt/parseFloat:
 * - NaN propagation from invalid input
 * - Silent failures from unexpected input types
 * - Negative values where only positive are expected
 *
 * @see research/2026-01-15_code_quality_standards.md Category 4
 */
/**
 * Parse integer with validation and fallback
 *
 * @param value - String value to parse (or undefined)
 * @param name - Option name for error messages
 * @param defaultValue - Default value if parsing fails
 * @returns Parsed integer or default value
 *
 * @example
 * ```typescript
 * // Basic usage
 * const timeout = parseIntSafe(args.timeout, 'timeout', 30000);
 *
 * // Handles invalid input gracefully
 * parseIntSafe('abc', 'count', 10); // Returns 10, logs warning
 * parseIntSafe('-5', 'count', 10);  // Returns 10, logs warning
 * parseIntSafe(undefined, 'count', 10); // Returns 10, no warning
 * ```
 */
declare function parseIntSafe(value: string | undefined, name: string, defaultValue: number): number;
/**
 * Parse integer allowing negative values
 *
 * @param value - String value to parse (or undefined)
 * @param name - Option name for error messages
 * @param defaultValue - Default value if parsing fails
 * @returns Parsed integer or default value
 */
declare function parseIntSafeAllowNegative(value: string | undefined, name: string, defaultValue: number): number;
/**
 * Parse float with validation and fallback
 *
 * @param value - String value to parse (or undefined)
 * @param name - Option name for error messages
 * @param defaultValue - Default value if parsing fails
 * @returns Parsed float or default value
 *
 * @example
 * ```typescript
 * const threshold = parseFloatSafe(args.threshold, 'threshold', 0.1);
 * ```
 */
declare function parseFloatSafe(value: string | undefined, name: string, defaultValue: number): number;
/**
 * Parse boolean from string with common truthy/falsy values
 *
 * @param value - String value to parse (or undefined)
 * @param defaultValue - Default value if parsing fails
 * @returns Parsed boolean or default value
 *
 * @example
 * ```typescript
 * parseBoolSafe('true', false);  // Returns true
 * parseBoolSafe('yes', false);   // Returns true
 * parseBoolSafe('1', false);     // Returns true
 * parseBoolSafe('false', true);  // Returns false
 * parseBoolSafe('no', true);     // Returns false
 * parseBoolSafe('0', true);      // Returns false
 * parseBoolSafe('invalid', true); // Returns true (default)
 * ```
 */
declare function parseBoolSafe(value: string | undefined, defaultValue: boolean): boolean;
/**
 * Parse enum value with validation
 *
 * @param value - String value to parse (or undefined)
 * @param validValues - Array of valid enum values
 * @param name - Option name for error messages
 * @param defaultValue - Default value if parsing fails
 * @returns Parsed enum value or default value
 *
 * @example
 * ```typescript
 * type LogLevel = 'debug' | 'info' | 'warn' | 'error';
 * const level = parseEnumSafe<LogLevel>(
 *   args.level,
 *   ['debug', 'info', 'warn', 'error'],
 *   'level',
 *   'info'
 * );
 * ```
 */
declare function parseEnumSafe<T extends string>(value: string | undefined, validValues: readonly T[], name: string, defaultValue: T): T;
/**
 * Parse a value with a custom parser function
 *
 * @param value - String value to parse (or undefined)
 * @param parser - Custom parser function
 * @param name - Option name for error messages
 * @param defaultValue - Default value if parsing fails
 * @returns Parsed value or default value
 *
 * @example
 * ```typescript
 * const date = parseWithValidator(
 *   args.date,
 *   (v) => new Date(v),
 *   (d) => !isNaN(d.getTime()),
 *   'date',
 *   new Date()
 * );
 * ```
 */
declare function parseWithValidator<T>(value: string | undefined, parser: (_value: string) => T, validator: (_parsed: T) => boolean, name: string, defaultValue: T): T;

interface InstallOptions {
    /** Root directory to install into */
    rootDir: string;
    /** Project name (for config) */
    projectName?: string;
    /** Base URL for tests */
    baseUrl?: string;
    /** Test ID attribute */
    testIdAttribute?: string;
    /** Skip if already installed */
    skipIfExists?: boolean;
    /** Include example Journey */
    includeExample?: boolean;
    /** Force overwrite existing files */
    force?: boolean;
}
interface InstallResult {
    success: boolean;
    created: string[];
    skipped: string[];
    errors: string[];
}
/**
 * Install ARTK autogen instance in a project
 */
declare function installAutogenInstance(options: InstallOptions): Promise<InstallResult>;

interface UpgradeOptions {
    /** Root directory of ARTK instance */
    rootDir: string;
    /** Target version (default: current) */
    toVersion?: number;
    /** Create backup before upgrade */
    backup?: boolean;
    /** Dry run - don't write changes */
    dryRun?: boolean;
}
interface UpgradeResult {
    success: boolean;
    fromVersion: number;
    toVersion: number;
    changes: UpgradeChange[];
    backupPath?: string;
    errors: string[];
}
interface UpgradeChange {
    type: 'config' | 'file' | 'directory';
    path: string;
    description: string;
}
/**
 * Upgrade ARTK autogen instance to new version
 */
declare function upgradeAutogenInstance(options: UpgradeOptions): Promise<UpgradeResult>;
/**
 * Check if config needs migration
 */
declare function needsMigration(config: Record<string, unknown>): boolean;
/**
 * Validate config version is supported
 */
declare function isVersionSupported(version: number): boolean;

/**
 * @artk/core-autogen - Deterministic Test Generation Engine
 *
 * Transforms clarified Journey markdown files into Playwright E2E tests.
 *
 * @packageDocumentation
 * @module @artk/core-autogen
 */

/**
 * Options for the main generation pipeline
 */
interface GenerateJourneyTestsOptions {
    /** Journey file paths or content */
    journeys: string[];
    /** Whether inputs are file paths (true) or content (false) */
    isFilePaths?: boolean;
    /** Output directory for generated files */
    outputDir?: string;
    /** Configuration object or path to config file */
    config?: AutogenConfig | string;
    /** Generate modules alongside tests */
    generateModules?: boolean;
    /** Test generation options */
    testOptions?: GenerateTestOptions;
    /** Module generation options */
    moduleOptions?: GenerateModuleOptions;
    /** Whether to use LLKB patterns for step mapping (default: true) */
    useLlkb?: boolean;
    /** LLKB root directory (default: .artk/llkb) */
    llkbRoot?: string;
}
/**
 * Result of the generation pipeline
 */
interface GenerateJourneyTestsResult {
    /** Generated test files */
    tests: Array<{
        journeyId: string;
        filename: string;
        code: string;
    }>;
    /** Generated module files (if requested) */
    modules: Array<{
        moduleName: string;
        filename: string;
        code: string;
    }>;
    /** Warnings encountered during generation */
    warnings: string[];
    /** Errors encountered (generation continues on non-fatal errors) */
    errors: string[];
    /** Whether LLKB patterns were used */
    llkbEnabled?: boolean;
}

/**
 * Main API: Generate Playwright tests from Journey files
 *
 * @example
 * ```typescript
 * import { generateJourneyTests } from '@artk/core-autogen';
 *
 * const result = await generateJourneyTests({
 *   journeys: ['journeys/login.md', 'journeys/checkout.md'],
 *   isFilePaths: true,
 *   generateModules: true,
 * });
 *
 * for (const test of result.tests) {
 *   console.log(`Generated: ${test.filename}`);
 * }
 * ```
 */
declare function generateJourneyTests(options: GenerateJourneyTestsOptions): Promise<GenerateJourneyTestsResult>;
/**
 * Generate a single test from an IR Journey
 */
declare function generateTestFromIR(journey: IRJourney, options?: GenerateTestOptions): GenerateTestResult;
/**
 * Regenerate a test using managed blocks strategy
 *
 * This preserves user code outside of ARTK:BEGIN/END GENERATED markers
 * while updating the generated portions.
 *
 * @example
 * ```typescript
 * import { regenerateTestWithBlocks, parseAndNormalize } from '@artk/core-autogen';
 *
 * const { journey } = parseAndNormalize('journeys/login.md');
 * const existingCode = readFileSync('tests/login.spec.ts', 'utf-8');
 *
 * const result = regenerateTestWithBlocks(journey, existingCode);
 * writeFileSync('tests/login.spec.ts', result.code);
 *
 * // User code outside ARTK markers is preserved
 * // Generated code inside markers is updated
 * ```
 */
declare function regenerateTestWithBlocks(journey: IRJourney, existingCode: string, options?: Omit<GenerateTestOptions, 'strategy' | 'existingCode'>): GenerateTestResult;
/**
 * Generate a single module from an IR Journey
 */
declare function generateModuleFromIR(journey: IRJourney, options?: GenerateModuleOptions): GenerateModuleResult;
/**
 * Parse and normalize a journey file
 */
declare function parseAndNormalize(filePath: string): {
    journey: IRJourney;
    warnings: string[];
};
/**
 * Version of the autogen engine
 */
declare const VERSION = "1.0.0";

/**
 * Options for validating a journey
 */
interface ValidateJourneyOptions extends CodeValidationOptions {
    /** Journey ID to validate */
    journeyId?: string;
    /** Whether inputs are file paths (true) or content (false) */
    isFilePath?: boolean;
}
/**
 * Result of journey validation
 */
interface ValidateJourneyResult extends CodeValidationResult {
    /** The generated code that was validated */
    generatedCode?: string;
}
/**
 * Validate a generated journey test
 *
 * @example
 * ```typescript
 * import { validateJourney } from '@artk/core-autogen';
 *
 * const result = await validateJourney('journeys/login.md', {
 *   isFilePath: true,
 *   runLint: true,
 * });
 *
 * if (result.valid) {
 *   console.log('Journey passes validation');
 * } else {
 *   console.log('Issues:', result.issues);
 * }
 * ```
 */
declare function validateJourney(journeyInput: string, options?: ValidateJourneyOptions): Promise<ValidateJourneyResult>;
/**
 * Validate multiple journeys
 */
declare function validateJourneys(journeys: string[], options?: ValidateJourneyOptions): Promise<Map<string, ValidateJourneyResult>>;

/**
 * Options for verifying a journey
 */
interface VerifyJourneyOptions extends RunnerOptions {
    /** Journey ID to verify */
    journeyId?: string;
    /** Whether input is a file path (true) or content (false) */
    isFilePath?: boolean;
    /** Output directory for generated test */
    outputDir?: string;
    /** Whether to check stability (repeat runs) */
    checkStability?: boolean;
    /** Number of stability runs */
    stabilityRuns?: number;
    /** Whether to attempt healing on failure */
    heal?: boolean;
    /** Maximum healing attempts */
    maxHealAttempts?: number;
}
/**
 * Result of journey verification
 */
interface VerifyJourneyResult extends VerifySummary {
    /** The generated test code */
    generatedCode?: string;
    /** Path to generated test file */
    testFilePath?: string;
    /** Healing result (if heal was enabled) */
    healing?: {
        attempted: boolean;
        success: boolean;
        attempts: number;
        appliedFix?: string;
        logPath?: string;
    };
}
/**
 * Verify a journey by generating and running tests
 *
 * @example
 * ```typescript
 * import { verifyJourney } from '@artk/core-autogen';
 *
 * const result = await verifyJourney('journeys/login.md', {
 *   isFilePath: true,
 *   checkStability: true,
 * });
 *
 * if (result.status === 'passed') {
 *   console.log('Journey verification passed!');
 * } else {
 *   console.log('Failures:', result.failures.tests);
 * }
 * ```
 */
declare function verifyJourney(journeyInput: string, options?: VerifyJourneyOptions): Promise<VerifyJourneyResult>;
/**
 * Verify multiple journeys
 */
declare function verifyJourneys(journeys: string[], options?: VerifyJourneyOptions): Promise<Map<string, VerifyJourneyResult>>;

export { AutogenConfig, BLOCK_END, BLOCK_ID_PATTERN, BLOCK_START, type BehaviorHints, type BlockExtractionResult, type BlockWarning, type CSSDebtEntry, CSSDebtEntrySchema, CodeValidationOptions, CodeValidationResult, type ComponentEntry, ComponentEntrySchema, type DebtReportSummary, type ExtractedHints, type GenerateJourneyTestsOptions, type GenerateJourneyTestsResult, GenerateModuleOptions, GenerateModuleResult, GenerateTestOptions, GenerateTestResult, type GeneratedHeaderOptions, HINTS_SECTION_PATTERN, HINT_BLOCK_PATTERN, HINT_PATTERNS, type HintType, IRJourney, type InjectBlocksOptions, type InstallOptions, type InstallResult, type LocatorHints, type MachineHint, type ManagedBlock, type MigrationPlan, type PageEntry, PageEntrySchema, type ParsedHints, RunnerOptions, type ScannerOptions, type ScannerResult, type SelectorCatalog, SelectorCatalogSchema, type SelectorEntry, SelectorEntrySchema, type UpgradeChange, type UpgradeOptions, type UpgradeResult, VALID_ROLES, VERSION, type ValidateJourneyOptions, type ValidateJourneyResult, type VerifyJourneyOptions, type VerifyJourneyResult, VerifySummary, addSelector, clearDebt, containsHints, createEmptyCatalog, escapeRegex, escapeSelector, escapeString, extractHintValue, extractHints, extractManagedBlocks, findByComponent, findByPage, findByTestId, findSelectorById, generateDebtMarkdown, generateDebtReport, generateFileHeader, generateJourneyTests, generateLocatorFromHints, generateMigrationPlan, generateModuleFromIR, generateTestFromIR, getAllTestIds, getBrandingComment, getCSSDebt, getCatalog, getGeneratedTimestamp, getPackageVersion, hasBehaviorHints, hasLocatorHints, hasTestId, injectManagedBlocks, installAutogenInstance, isValidRole, isVersionSupported, loadCatalog, mergeWithInferred, needsMigration, parseAndNormalize, parseBoolSafe, parseEnumSafe, parseFloatSafe, parseHints, parseIntSafe, parseIntSafeAllowNegative, parseModuleHint, parseWithValidator, quickScanTestIds, recordCSSDebt, regenerateTestWithBlocks, removeDebt, removeHints, removeSelector, resetCatalogCache, saveCatalog, scanForTestIds, searchSelectors, suggestReplacement, suggestSelector, updateDebtPriority, upgradeAutogenInstance, validateCatalog, validateHints, validateJourney, validateJourneys, verifyJourney, verifyJourneys, wrapInBlock };
