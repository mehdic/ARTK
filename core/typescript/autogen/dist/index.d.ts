import { d as IRJourney } from './types-DJnqAI1V.js';
export { i as AccessibilityConfig, A as AccessibilityTiming, e as CleanupStrategy, C as CompletionSignal, f as CompletionSignalType, D as DataStrategy, I as IRMappingResult, a as IRPrimitive, c as IRStep, g as JourneyDataConfig, J as JourneyTier, b as LocatorSpec, L as LocatorStrategy, M as ModuleDependencies, N as NegativePath, P as PerformanceConfig, T as TestDataSet, V as ValueSpec, h as VisualRegressionConfig } from './types-DJnqAI1V.js';
export { IR, JourneyBuilder, LocatorBuilder, SerializeOptions, StepBuilder, ValueBuilder, describeLocator, describePrimitive, serializeJourney, serializePrimitive, serializeStep, summarizeJourney } from './ir/index.js';
import { A as AutogenConfig } from './schema-U3rjvmCI.js';
export { d as AutogenConfigSchema, a as EslintRulesSchema, g as EslintSeverity, E as EslintSeveritySchema, j as Heal, H as HealSchema, m as LLKBIntegration, l as LLKBIntegrationLevel, L as LLKBIntegrationLevelSchema, c as LLKBIntegrationSchema, f as Paths, P as PathsSchema, k as RegenerationStrategy, R as RegenerationStrategySchema, h as SelectorPolicy, b as SelectorPolicySchema, e as SelectorStrategy, S as SelectorStrategySchema, i as Validation, V as ValidationSchema } from './schema-U3rjvmCI.js';
export { ConfigLoadError, findConfigFile, getDefaultConfig, getSchemaVersion, loadConfig, loadConfigWithMigration, loadConfigs, loadLLKBConfig, mergeConfigs, needsConfigMigration, resolveConfigPath } from './config/index.js';
export { F as AcceptanceCriterion, a9 as CodedError, x as JourneyFrontmatter, g as JourneyFrontmatterSchema, z as JourneyParseError, i as JourneyStatus, J as JourneyStatusSchema, B as ParsedJourney, G as ProceduralStep, X as Result, H as StructuredStep, S as StructuredStepAction, a4 as andThen, aa as codedError, a5 as collect, Z as err, $ as isErr, _ as isOk, a2 as map, a3 as mapErr, Y as ok, O as parseJourney, U as parseJourneyContent, R as parseJourneyForAutoGen, K as parseStructuredSteps, a6 as partition, a7 as tryCatch, a8 as tryCatchAsync, W as tryParseJourneyContent, a0 as unwrap, a1 as unwrapOr } from './parseJourney-BY3R1Dwj.js';
export { N as NormalizeOptions, c as completionSignalsToAssertions, n as normalizeJourney, v as validateJourneyForCodeGen } from './normalize-Cn4bFRDH.js';
export { a8 as ACMappingResult, $ as ExtendedGlossaryMeta, F as Glossary, G as GlossaryEntry, L as LabelAlias, M as ModuleMethodMapping, P as PATTERN_VERSION, b as PatternMatch, a as PatternMetadata, a6 as StepMapperOptions, a7 as StepMappingResult, S as StepPattern, y as allPatterns, h as authPatterns, g as checkPatterns, a1 as clearExtendedGlossary, e as clickPatterns, c as createLocatorFromMatch, d as createValueFromText, H as defaultGlossary, l as extendedAssertionPatterns, j as extendedClickPatterns, k as extendedFillPatterns, o as extendedNavigationPatterns, q as extendedSelectPatterns, m as extendedWaitPatterns, f as fillPatterns, V as findLabelAlias, E as findMatchingPatterns, X as findModuleMethod, x as focusPatterns, B as getAllPatternNames, N as getGlossary, a4 as getGlossaryStats, Z as getLabelAliases, W as getLocatorFromLabel, ad as getMappingStats, _ as getModuleMethods, C as getPatternCountByCategory, A as getPatternMatches, D as getPatternMetadata, R as getSynonyms, a5 as hasExtendedGlossary, r as hoverPatterns, K as initGlossary, ae as initializeLlkb, af as isLlkbAvailable, T as isSynonymOf, a0 as loadExtendedGlossary, I as loadGlossary, a3 as lookupCoreGlossary, a2 as lookupGlossary, aa as mapAcceptanceCriterion, ab as mapProceduralStep, a9 as mapStepText, ac as mapSteps, z as matchPattern, J as mergeGlossaries, n as navigationPatterns, Q as normalizeStepText, p as parseSelectorToLocator, U as resetGlossaryCache, O as resolveCanonical, Y as resolveModuleMethod, s as selectPatterns, i as structuredPatterns, ag as suggestImprovements, t as toastPatterns, u as urlPatterns, v as visibilityPatterns, w as waitPatterns } from './stepMapper-DzcrpZ9r.js';
export { DEFAULT_SELECTOR_PRIORITY, ELEMENT_TYPE_STRATEGIES, NAMEABLE_ROLES, compareLocators, createCssSelector, extractName, getRecommendedStrategies, getSelectorPriority, inferBestSelector, inferButtonSelector, inferCheckboxSelector, inferElementType, inferHeadingSelector, inferInputSelector, inferLinkSelector, inferRole, inferSelectorWithCatalog, inferSelectors, inferSelectorsWithCatalog, inferTabSelector, inferTestIdSelector, inferTextSelector, isCssLocator, isForbiddenSelector, isRoleLocator, isSemanticLocator, isTestIdLocator, scoreLocator, selectBestLocator, suggestSelectorApproach, toPlaywrightLocator, validateLocator } from './selectors/index.js';
import { z } from 'zod';
import { GenerateTestOptions, GenerateModuleOptions, GenerateTestResult, GenerateModuleResult } from './codegen/index.js';
export { AddLocatorResult, AstEditOptions, AstEditResult, ImportStatement, MethodParam, ModuleDefinition, ModuleLocator, ModuleMethod, ModuleRegistry, RegistryEntry, RegistryOptions, RegistryUpdateResult, __test_checkFeature, addLocatorProperty, addMethod, addNamedImport, addToRegistry, createProject, createRegistry, extractClassStructure, extractModuleDefinition, findClass, findEntriesByScope, findEntry, findMethod, findProperty, generateIndexContent, generateModule, generateModuleCode, generateTest, generateTestCode, getImport, getModuleNames, getRegistryStats, hasImport, hasModule, loadRegistry, loadSourceFile, mergeModuleFiles, parseIndexFile, removeFromRegistry, saveRegistry, scanModulesDirectory, updateIndexFile, updateModuleFile, validateSyntax } from './codegen/index.js';
import { CodeValidationOptions, CodeValidationResult } from './validate/index.js';
export { ACCoverageResult, CoverageOptions, CoverageResult, FORBIDDEN_PATTERNS, ForbiddenPattern, JourneyValidationOptions, JourneyValidationResult, LintOptions, LintResult, PLAYWRIGHT_LINT_RULES, PatternScanResult, TAG_PATTERNS, TagValidationOptions, TagValidationResult, ValidationIssue, ValidationSeverity, categorizeTags, filterBySeverity, findACReferences, findTestSteps, generateCoverageReport, generateESLintConfig, generateExpectedTags, generateValidationReport, getPatternStats, getViolationSummary, hasErrorViolations, hasLintErrors, isCodeValid, isESLintAvailable, isJourneyReady, isPlaywrightPluginAvailable, lintCode, lintFile, parseESLintOutput, parseTagsFromCode, parseTagsFromFrontmatter, scanForbiddenPatterns, scanResultsToIssues, validateCode, validateCodeCoverage, validateCodeSync, validateIRCoverage, validateJourneyFrontmatter, validateJourneySchema, validateJourneyStatus, validateJourneyTags, validateJourneyTier, validateTags, validateTagsInCode } from './validate/index.js';
import { R as RunnerOptions, V as VerifySummary } from './summary-BM0N-HYj.js';
export { E as ErrorAttachment, H as FailureCategory, I as FailureClassification, o as ParsedSummary, P as PlaywrightReport, k as ReportStep, a as RunnerResult, S as StabilityOptions, U as StabilityResult, a1 as SummaryOptions, j as TestError, l as TestResult, n as TestSpec, T as TestStatus, m as TestSuite, b as buildPlaywrightArgs, W as checkStability, f as checkTestSyntax, J as classifyError, K as classifyTestResult, L as classifyTestResults, z as extractErrorMessages, A as extractErrorStacks, s as extractTestResults, y as findTestsByTag, x as findTestsByTitle, F as formatTestResult, a8 as formatVerifySummary, Q as generateClassificationReport, G as generateMarkdownSummary, a0 as generateStabilityReport, a3 as generateSummaryFromReport, a2 as generateVerifySummary, B as getFailedStep, u as getFailedTests, M as getFailureStats, _ as getFlakinessScore, v as getFlakyTests, O as getHealableFailures, g as getPlaywrightVersion, a7 as getRecommendations, t as getSummary, h as getTestCount, a5 as hasFailures, N as isHealable, i as isPlaywrightAvailable, C as isReportSuccessful, Z as isTestStable, a4 as isVerificationPassed, q as parseReportContent, p as parseReportFile, X as quickStabilityCheck, D as reportHasFlaky, e as runJourneyTests, c as runPlaywrightAsync, r as runPlaywrightSync, d as runTestFile, a9 as saveSummary, $ as shouldQuarantine, a6 as summaryHasFlaky, Y as thoroughStabilityCheck, w as writeAndRunTest } from './summary-BM0N-HYj.js';
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
    suggestedReplacement?: {
        value: string;
        strategy: string;
    } | undefined;
    reason?: string | undefined;
}, {
    selector: string;
    usages: {
        file: string;
        line: number;
    }[];
    priority?: "low" | "medium" | "high" | undefined;
    suggestedReplacement?: {
        value: string;
        strategy: string;
    } | undefined;
    reason?: string | undefined;
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
        suggestedReplacement?: {
            value: string;
            strategy: string;
        } | undefined;
        reason?: string | undefined;
    }, {
        selector: string;
        usages: {
            file: string;
            line: number;
        }[];
        priority?: "low" | "medium" | "high" | undefined;
        suggestedReplacement?: {
            value: string;
            strategy: string;
        } | undefined;
        reason?: string | undefined;
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
        suggestedReplacement?: {
            value: string;
            strategy: string;
        } | undefined;
        reason?: string | undefined;
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
        suggestedReplacement?: {
            value: string;
            strategy: string;
        } | undefined;
        reason?: string | undefined;
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

/**
 * Get the package root directory.
 *
 * Strategy:
 * 1. Check ARTK_AUTOGEN_ROOT env var (for testing/override)
 * 2. Use module location to find package root
 * 3. Fallback to cwd-based search
 */
declare function getPackageRoot(): string;
/**
 * Get the templates directory path.
 *
 * Templates are copied to dist/codegen/templates/ during build.
 * When installed, only one dist variant exists.
 */
declare function getTemplatesDir(): string;
/**
 * Get the path to a specific template file.
 */
declare function getTemplatePath(templateName: string): string;
/**
 * Get the ARTK harness root directory (artk-e2e/).
 *
 * This function infers the correct harness root by checking:
 * 1. ARTK_HARNESS_ROOT environment variable (explicit override)
 * 2. artk-e2e/ subdirectory from cwd (standard installation)
 * 3. Current directory if it contains artk.config.yml (inside harness)
 * 4. Fallback to cwd (backwards compatibility)
 *
 * @returns Path to the harness root directory
 */
declare function getHarnessRoot(): string;
/**
 * Get the LLKB root directory (.artk/llkb inside harness root).
 *
 * @param explicitRoot - Optional explicit path override
 * @returns Path to the LLKB root directory
 */
declare function getLlkbRoot(explicitRoot?: string): string;
/**
 * Get the .artk directory inside harness root.
 *
 * @param explicitBaseDir - Optional explicit path override
 * @returns Path to the .artk directory
 */
declare function getArtkDir(explicitBaseDir?: string): string;
/**
 * Autogen artifact types
 */
type AutogenArtifact = 'analysis' | 'plan' | 'state' | 'results' | 'samples' | 'agreement' | 'telemetry';
/**
 * Get the autogen artifacts directory (.artk/autogen inside harness root).
 *
 * @param explicitBaseDir - Optional explicit path override
 * @returns Path to the autogen directory
 */
declare function getAutogenDir(explicitBaseDir?: string): string;
/**
 * Get the path to a specific autogen artifact.
 *
 * @param artifact - The artifact type to get path for
 * @param explicitBaseDir - Optional explicit path override
 * @returns Path to the artifact
 */
declare function getAutogenArtifact(artifact: AutogenArtifact, explicitBaseDir?: string): string;
/**
 * Ensure the autogen directory structure exists.
 *
 * Creates:
 * - <harnessRoot>/.artk/autogen/
 * - <harnessRoot>/.artk/autogen/samples/
 *
 * @param explicitBaseDir - Optional explicit path override
 */
declare function ensureAutogenDir(explicitBaseDir?: string): Promise<void>;
/**
 * Clean all autogen artifacts for a fresh start.
 *
 * Removes and recreates the autogen directory.
 *
 * @param explicitBaseDir - Optional explicit path override
 */
declare function cleanAutogenArtifacts(explicitBaseDir?: string): Promise<void>;
/**
 * Check if autogen artifacts exist.
 *
 * @param explicitBaseDir - Optional explicit path override
 * @returns true if the autogen directory exists and contains artifacts
 */
declare function hasAutogenArtifacts(explicitBaseDir?: string): boolean;

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
 * @module shared/types
 * @description Shared types used across all AutoGen enhancement strategies
 */

type Result<T, E = Error> = {
    ok: true;
    value: T;
} | {
    ok: false;
    error: E;
};
declare function ok<T>(value: T): Result<T, never>;
declare function err<E>(error: E): Result<never, E>;
declare function isOk<T, E>(result: Result<T, E>): result is {
    ok: true;
    value: T;
};
declare function isErr<T, E>(result: Result<T, E>): result is {
    ok: false;
    error: E;
};
type LLMProvider = 'openai' | 'anthropic' | 'azure' | 'bedrock' | 'ollama' | 'local' | 'none';
interface LLMConfig {
    provider: LLMProvider;
    model: string;
    temperature: number;
    maxTokens: number;
    timeoutMs: number;
    maxRetries: number;
    retryDelayMs: number;
}
interface TokenUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCostUsd: number;
}
interface LLMResponse<T> {
    data: T;
    tokenUsage: TokenUsage;
    latencyMs: number;
    retryCount: number;
}
interface LLMError {
    type: 'TIMEOUT' | 'RATE_LIMIT' | 'API_ERROR' | 'INVALID_RESPONSE' | 'UNAVAILABLE';
    message: string;
    retryable: boolean;
    retryAfterMs?: number;
    originalError?: Error;
}
interface CostLimits {
    perTestUsd: number;
    perSessionUsd: number;
    enabled: boolean;
}
interface CostTrackerState {
    sessionCost: number;
    testCost: number;
    totalTokens: number;
    sessionStartedAt: Date;
}
type OrchestrationPhase = 'IDLE' | 'PARSING' | 'PLANNING' | 'GENERATING' | 'SCORING' | 'EXECUTING' | 'REFINING' | 'LEARNING' | 'DONE' | 'BLOCKED' | 'DEAD_END' | 'FAILED';
interface PipelineContext {
    journeyId: string;
    state: OrchestrationPhase;
    scotEnabled: boolean;
    refinementEnabled: boolean;
    uncertaintyEnabled: boolean;
    generatedCode?: string;
    error?: PipelineError;
    startedAt: Date;
    completedAt?: Date;
    tokenUsage: TokenUsage;
}
interface StateTransition {
    from: OrchestrationPhase;
    to: OrchestrationPhase;
    guard?: (_ctx: PipelineContext) => boolean;
    action?: (_ctx: PipelineContext) => Promise<void>;
}
type PipelineErrorType = 'SCOT_FAILED' | 'GENERATION_FAILED' | 'UNCERTAINTY_BLOCKED' | 'EXECUTION_FAILED' | 'REFINEMENT_EXHAUSTED' | 'LLM_UNAVAILABLE' | 'COST_LIMIT_EXCEEDED' | 'TIMEOUT' | 'DEAD_END';
interface PipelineError {
    type: PipelineErrorType;
    message: string;
    stage: OrchestrationPhase;
    recoverable: boolean;
    suggestedAction: 'manual_review' | 'journey_revision' | 'retry' | 'abort';
    diagnostics: PipelineDiagnostics;
}
interface PipelineDiagnostics {
    journeyId: string;
    scotConfidence?: number;
    uncertaintyScore?: number;
    refinementAttempts?: number;
    lastError?: string;
    tokenUsage?: TokenUsage;
    durationMs?: number;
}
interface DeadEndResult {
    status: 'dead_end';
    error: PipelineError;
    partialCode?: string;
    report: DeadEndReport;
}
interface DeadEndReport {
    journeyId: string;
    blockedAt: OrchestrationPhase;
    reasons: string[];
    scotDiagnostics?: {
        confidence: number;
        warnings: string[];
        fallbackUsed: boolean;
    };
    uncertaintyDiagnostics?: {
        overallScore: number;
        blockedDimensions: string[];
        lowestDimension: {
            name: string;
            score: number;
        };
    };
    refinementDiagnostics?: {
        attempts: number;
        lastError: string;
        convergenceFailure: boolean;
        sameErrorRepeated: boolean;
    };
    suggestedActions: string[];
}
interface LLKBPattern {
    id: string;
    category: string;
    pattern: string;
    confidence: number;
    usageCount: number;
    lastUsed: Date;
}
interface LLKBLesson {
    id: string;
    category: string;
    content: string;
    confidence: number;
    generalizability: number;
    sourceType: 'refinement' | 'manual' | 'extraction';
    createdAt: Date;
}
interface SuccessfulFix {
    journeyId: string;
    errorCategory: string;
    originalCode: string;
    fixedCode: string;
    fixDescription: string;
    refinementAttempts: number;
    generalizability: number;
}
interface FailedAttempt {
    journeyId: string;
    errorCategory: string;
    attemptedFix: string;
    failureReason: string;
}
interface LLKBAdapter {
    isAvailable(): boolean;
    findPattern(_action: string): Promise<LLKBPattern | null>;
    findSimilarFixes(_errorCategory: string, _context: string): Promise<LLKBPattern[]>;
    calculatePatternCoverage(_code: string): Promise<number>;
    recordSuccessfulFix(_fix: SuccessfulFix): Promise<void>;
    recordFailedAttempt(_attempt: FailedAttempt): Promise<void>;
    recordLesson(_lesson: Omit<LLKBLesson, 'id' | 'createdAt'>): Promise<string>;
}
declare const LLMProviderSchema: z.ZodEnum<["openai", "anthropic", "azure", "bedrock", "ollama", "local", "none"]>;
declare const LLMConfigSchema: z.ZodObject<{
    provider: z.ZodDefault<z.ZodEnum<["openai", "anthropic", "azure", "bedrock", "ollama", "local", "none"]>>;
    model: z.ZodDefault<z.ZodString>;
    temperature: z.ZodDefault<z.ZodNumber>;
    maxTokens: z.ZodDefault<z.ZodNumber>;
    timeoutMs: z.ZodDefault<z.ZodNumber>;
    maxRetries: z.ZodDefault<z.ZodNumber>;
    retryDelayMs: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    provider: "none" | "local" | "openai" | "anthropic" | "azure" | "bedrock" | "ollama";
    model: string;
    temperature: number;
    maxTokens: number;
    timeoutMs: number;
    maxRetries: number;
    retryDelayMs: number;
}, {
    provider?: "none" | "local" | "openai" | "anthropic" | "azure" | "bedrock" | "ollama" | undefined;
    model?: string | undefined;
    temperature?: number | undefined;
    maxTokens?: number | undefined;
    timeoutMs?: number | undefined;
    maxRetries?: number | undefined;
    retryDelayMs?: number | undefined;
}>;
declare const CostLimitsSchema: z.ZodObject<{
    perTestUsd: z.ZodDefault<z.ZodNumber>;
    perSessionUsd: z.ZodDefault<z.ZodNumber>;
    enabled: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    enabled: boolean;
    perTestUsd: number;
    perSessionUsd: number;
}, {
    enabled?: boolean | undefined;
    perTestUsd?: number | undefined;
    perSessionUsd?: number | undefined;
}>;
declare const TokenUsageSchema: z.ZodObject<{
    promptTokens: z.ZodDefault<z.ZodNumber>;
    completionTokens: z.ZodDefault<z.ZodNumber>;
    totalTokens: z.ZodDefault<z.ZodNumber>;
    estimatedCostUsd: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCostUsd: number;
}, {
    promptTokens?: number | undefined;
    completionTokens?: number | undefined;
    totalTokens?: number | undefined;
    estimatedCostUsd?: number | undefined;
}>;

/**
 * @module shared/llm-response-parser
 * @description Validated JSON parsing from LLM responses with Zod schemas
 */

interface ParseError {
    type: 'INVALID_JSON' | 'SCHEMA_VALIDATION' | 'EXTRACTION_FAILED';
    message: string;
    rawResponse: string;
    validationErrors?: z.ZodError;
}
/**
 * Extract JSON from LLM response (handles markdown code blocks)
 */
declare function extractJson(response: string): string | null;
interface ParseOptions$1 {
    maxRetries?: number;
    onRetry?: (_attempt: number, _error: ParseError) => Promise<string>;
}
/**
 * Parse and validate LLM response against a Zod schema
 */
declare function parseLLMResponse<T>(rawResponse: string, schema: z.Schema<T>, options?: ParseOptions$1): Promise<Result<T, ParseError>>;
declare const SCoTAtomicStepSchema: z.ZodObject<{
    action: z.ZodString;
    target: z.ZodOptional<z.ZodString>;
    value: z.ZodOptional<z.ZodString>;
    assertion: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    action: string;
    value?: string | undefined;
    target?: string | undefined;
    assertion?: string | undefined;
}, {
    action: string;
    value?: string | undefined;
    target?: string | undefined;
    assertion?: string | undefined;
}>;
declare const SCoTConditionSchema: z.ZodObject<{
    element: z.ZodOptional<z.ZodString>;
    state: z.ZodEnum<["visible", "hidden", "enabled", "disabled", "exists", "checked", "unchecked"]>;
    negate: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    state: "enabled" | "visible" | "hidden" | "checked" | "disabled" | "exists" | "unchecked";
    element?: string | undefined;
    negate?: boolean | undefined;
}, {
    state: "enabled" | "visible" | "hidden" | "checked" | "disabled" | "exists" | "unchecked";
    element?: string | undefined;
    negate?: boolean | undefined;
}>;
declare const SCoTIteratorSchema: z.ZodObject<{
    variable: z.ZodString;
    collection: z.ZodString;
    maxIterations: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    variable: string;
    collection: string;
    maxIterations?: number | undefined;
}, {
    variable: string;
    collection: string;
    maxIterations?: number | undefined;
}>;
declare const SCoTStructureSchema: z.ZodObject<{
    type: z.ZodEnum<["sequential", "branch", "loop"]>;
    description: z.ZodString;
    steps: z.ZodOptional<z.ZodArray<z.ZodObject<{
        action: z.ZodString;
        target: z.ZodOptional<z.ZodString>;
        value: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        action: string;
        value?: string | undefined;
        target?: string | undefined;
        assertion?: string | undefined;
    }, {
        action: string;
        value?: string | undefined;
        target?: string | undefined;
        assertion?: string | undefined;
    }>, "many">>;
    condition: z.ZodOptional<z.ZodObject<{
        element: z.ZodOptional<z.ZodString>;
        state: z.ZodEnum<["visible", "hidden", "enabled", "disabled", "exists", "checked", "unchecked"]>;
        negate: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        state: "enabled" | "visible" | "hidden" | "checked" | "disabled" | "exists" | "unchecked";
        element?: string | undefined;
        negate?: boolean | undefined;
    }, {
        state: "enabled" | "visible" | "hidden" | "checked" | "disabled" | "exists" | "unchecked";
        element?: string | undefined;
        negate?: boolean | undefined;
    }>>;
    thenBranch: z.ZodOptional<z.ZodArray<z.ZodObject<{
        action: z.ZodString;
        target: z.ZodOptional<z.ZodString>;
        value: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        action: string;
        value?: string | undefined;
        target?: string | undefined;
        assertion?: string | undefined;
    }, {
        action: string;
        value?: string | undefined;
        target?: string | undefined;
        assertion?: string | undefined;
    }>, "many">>;
    elseBranch: z.ZodOptional<z.ZodArray<z.ZodObject<{
        action: z.ZodString;
        target: z.ZodOptional<z.ZodString>;
        value: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        action: string;
        value?: string | undefined;
        target?: string | undefined;
        assertion?: string | undefined;
    }, {
        action: string;
        value?: string | undefined;
        target?: string | undefined;
        assertion?: string | undefined;
    }>, "many">>;
    iterator: z.ZodOptional<z.ZodObject<{
        variable: z.ZodString;
        collection: z.ZodString;
        maxIterations: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        variable: string;
        collection: string;
        maxIterations?: number | undefined;
    }, {
        variable: string;
        collection: string;
        maxIterations?: number | undefined;
    }>>;
    body: z.ZodOptional<z.ZodArray<z.ZodObject<{
        action: z.ZodString;
        target: z.ZodOptional<z.ZodString>;
        value: z.ZodOptional<z.ZodString>;
        assertion: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        action: string;
        value?: string | undefined;
        target?: string | undefined;
        assertion?: string | undefined;
    }, {
        action: string;
        value?: string | undefined;
        target?: string | undefined;
        assertion?: string | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    type: "sequential" | "branch" | "loop";
    description: string;
    steps?: {
        action: string;
        value?: string | undefined;
        target?: string | undefined;
        assertion?: string | undefined;
    }[] | undefined;
    body?: {
        action: string;
        value?: string | undefined;
        target?: string | undefined;
        assertion?: string | undefined;
    }[] | undefined;
    condition?: {
        state: "enabled" | "visible" | "hidden" | "checked" | "disabled" | "exists" | "unchecked";
        element?: string | undefined;
        negate?: boolean | undefined;
    } | undefined;
    thenBranch?: {
        action: string;
        value?: string | undefined;
        target?: string | undefined;
        assertion?: string | undefined;
    }[] | undefined;
    elseBranch?: {
        action: string;
        value?: string | undefined;
        target?: string | undefined;
        assertion?: string | undefined;
    }[] | undefined;
    iterator?: {
        variable: string;
        collection: string;
        maxIterations?: number | undefined;
    } | undefined;
}, {
    type: "sequential" | "branch" | "loop";
    description: string;
    steps?: {
        action: string;
        value?: string | undefined;
        target?: string | undefined;
        assertion?: string | undefined;
    }[] | undefined;
    body?: {
        action: string;
        value?: string | undefined;
        target?: string | undefined;
        assertion?: string | undefined;
    }[] | undefined;
    condition?: {
        state: "enabled" | "visible" | "hidden" | "checked" | "disabled" | "exists" | "unchecked";
        element?: string | undefined;
        negate?: boolean | undefined;
    } | undefined;
    thenBranch?: {
        action: string;
        value?: string | undefined;
        target?: string | undefined;
        assertion?: string | undefined;
    }[] | undefined;
    elseBranch?: {
        action: string;
        value?: string | undefined;
        target?: string | undefined;
        assertion?: string | undefined;
    }[] | undefined;
    iterator?: {
        variable: string;
        collection: string;
        maxIterations?: number | undefined;
    } | undefined;
}>;
declare const SCoTPlanResponseSchema: z.ZodObject<{
    reasoning: z.ZodString;
    confidence: z.ZodNumber;
    plan: z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<["sequential", "branch", "loop"]>;
        description: z.ZodString;
        steps: z.ZodOptional<z.ZodArray<z.ZodObject<{
            action: z.ZodString;
            target: z.ZodOptional<z.ZodString>;
            value: z.ZodOptional<z.ZodString>;
            assertion: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            action: string;
            value?: string | undefined;
            target?: string | undefined;
            assertion?: string | undefined;
        }, {
            action: string;
            value?: string | undefined;
            target?: string | undefined;
            assertion?: string | undefined;
        }>, "many">>;
        condition: z.ZodOptional<z.ZodObject<{
            element: z.ZodOptional<z.ZodString>;
            state: z.ZodEnum<["visible", "hidden", "enabled", "disabled", "exists", "checked", "unchecked"]>;
            negate: z.ZodOptional<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            state: "enabled" | "visible" | "hidden" | "checked" | "disabled" | "exists" | "unchecked";
            element?: string | undefined;
            negate?: boolean | undefined;
        }, {
            state: "enabled" | "visible" | "hidden" | "checked" | "disabled" | "exists" | "unchecked";
            element?: string | undefined;
            negate?: boolean | undefined;
        }>>;
        thenBranch: z.ZodOptional<z.ZodArray<z.ZodObject<{
            action: z.ZodString;
            target: z.ZodOptional<z.ZodString>;
            value: z.ZodOptional<z.ZodString>;
            assertion: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            action: string;
            value?: string | undefined;
            target?: string | undefined;
            assertion?: string | undefined;
        }, {
            action: string;
            value?: string | undefined;
            target?: string | undefined;
            assertion?: string | undefined;
        }>, "many">>;
        elseBranch: z.ZodOptional<z.ZodArray<z.ZodObject<{
            action: z.ZodString;
            target: z.ZodOptional<z.ZodString>;
            value: z.ZodOptional<z.ZodString>;
            assertion: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            action: string;
            value?: string | undefined;
            target?: string | undefined;
            assertion?: string | undefined;
        }, {
            action: string;
            value?: string | undefined;
            target?: string | undefined;
            assertion?: string | undefined;
        }>, "many">>;
        iterator: z.ZodOptional<z.ZodObject<{
            variable: z.ZodString;
            collection: z.ZodString;
            maxIterations: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            variable: string;
            collection: string;
            maxIterations?: number | undefined;
        }, {
            variable: string;
            collection: string;
            maxIterations?: number | undefined;
        }>>;
        body: z.ZodOptional<z.ZodArray<z.ZodObject<{
            action: z.ZodString;
            target: z.ZodOptional<z.ZodString>;
            value: z.ZodOptional<z.ZodString>;
            assertion: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            action: string;
            value?: string | undefined;
            target?: string | undefined;
            assertion?: string | undefined;
        }, {
            action: string;
            value?: string | undefined;
            target?: string | undefined;
            assertion?: string | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        type: "sequential" | "branch" | "loop";
        description: string;
        steps?: {
            action: string;
            value?: string | undefined;
            target?: string | undefined;
            assertion?: string | undefined;
        }[] | undefined;
        body?: {
            action: string;
            value?: string | undefined;
            target?: string | undefined;
            assertion?: string | undefined;
        }[] | undefined;
        condition?: {
            state: "enabled" | "visible" | "hidden" | "checked" | "disabled" | "exists" | "unchecked";
            element?: string | undefined;
            negate?: boolean | undefined;
        } | undefined;
        thenBranch?: {
            action: string;
            value?: string | undefined;
            target?: string | undefined;
            assertion?: string | undefined;
        }[] | undefined;
        elseBranch?: {
            action: string;
            value?: string | undefined;
            target?: string | undefined;
            assertion?: string | undefined;
        }[] | undefined;
        iterator?: {
            variable: string;
            collection: string;
            maxIterations?: number | undefined;
        } | undefined;
    }, {
        type: "sequential" | "branch" | "loop";
        description: string;
        steps?: {
            action: string;
            value?: string | undefined;
            target?: string | undefined;
            assertion?: string | undefined;
        }[] | undefined;
        body?: {
            action: string;
            value?: string | undefined;
            target?: string | undefined;
            assertion?: string | undefined;
        }[] | undefined;
        condition?: {
            state: "enabled" | "visible" | "hidden" | "checked" | "disabled" | "exists" | "unchecked";
            element?: string | undefined;
            negate?: boolean | undefined;
        } | undefined;
        thenBranch?: {
            action: string;
            value?: string | undefined;
            target?: string | undefined;
            assertion?: string | undefined;
        }[] | undefined;
        elseBranch?: {
            action: string;
            value?: string | undefined;
            target?: string | undefined;
            assertion?: string | undefined;
        }[] | undefined;
        iterator?: {
            variable: string;
            collection: string;
            maxIterations?: number | undefined;
        } | undefined;
    }>, "many">;
    warnings: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    warnings: string[];
    plan: {
        type: "sequential" | "branch" | "loop";
        description: string;
        steps?: {
            action: string;
            value?: string | undefined;
            target?: string | undefined;
            assertion?: string | undefined;
        }[] | undefined;
        body?: {
            action: string;
            value?: string | undefined;
            target?: string | undefined;
            assertion?: string | undefined;
        }[] | undefined;
        condition?: {
            state: "enabled" | "visible" | "hidden" | "checked" | "disabled" | "exists" | "unchecked";
            element?: string | undefined;
            negate?: boolean | undefined;
        } | undefined;
        thenBranch?: {
            action: string;
            value?: string | undefined;
            target?: string | undefined;
            assertion?: string | undefined;
        }[] | undefined;
        elseBranch?: {
            action: string;
            value?: string | undefined;
            target?: string | undefined;
            assertion?: string | undefined;
        }[] | undefined;
        iterator?: {
            variable: string;
            collection: string;
            maxIterations?: number | undefined;
        } | undefined;
    }[];
    confidence: number;
    reasoning: string;
}, {
    plan: {
        type: "sequential" | "branch" | "loop";
        description: string;
        steps?: {
            action: string;
            value?: string | undefined;
            target?: string | undefined;
            assertion?: string | undefined;
        }[] | undefined;
        body?: {
            action: string;
            value?: string | undefined;
            target?: string | undefined;
            assertion?: string | undefined;
        }[] | undefined;
        condition?: {
            state: "enabled" | "visible" | "hidden" | "checked" | "disabled" | "exists" | "unchecked";
            element?: string | undefined;
            negate?: boolean | undefined;
        } | undefined;
        thenBranch?: {
            action: string;
            value?: string | undefined;
            target?: string | undefined;
            assertion?: string | undefined;
        }[] | undefined;
        elseBranch?: {
            action: string;
            value?: string | undefined;
            target?: string | undefined;
            assertion?: string | undefined;
        }[] | undefined;
        iterator?: {
            variable: string;
            collection: string;
            maxIterations?: number | undefined;
        } | undefined;
    }[];
    confidence: number;
    reasoning: string;
    warnings?: string[] | undefined;
}>;
declare const SuggestedApproachSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodString;
    confidence: z.ZodNumber;
    complexity: z.ZodEnum<["simple", "moderate", "complex"]>;
    requiredChanges: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    name: string;
    description: string;
    confidence: number;
    complexity: "simple" | "moderate" | "complex";
    requiredChanges: string[];
}, {
    name: string;
    description: string;
    confidence: number;
    complexity: "simple" | "moderate" | "complex";
    requiredChanges: string[];
}>;
declare const ErrorAnalysisResponseSchema: z.ZodObject<{
    rootCause: z.ZodString;
    confidence: z.ZodNumber;
    suggestedApproaches: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        description: z.ZodString;
        confidence: z.ZodNumber;
        complexity: z.ZodEnum<["simple", "moderate", "complex"]>;
        requiredChanges: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        name: string;
        description: string;
        confidence: number;
        complexity: "simple" | "moderate" | "complex";
        requiredChanges: string[];
    }, {
        name: string;
        description: string;
        confidence: number;
        complexity: "simple" | "moderate" | "complex";
        requiredChanges: string[];
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    confidence: number;
    rootCause: string;
    suggestedApproaches: {
        name: string;
        description: string;
        confidence: number;
        complexity: "simple" | "moderate" | "complex";
        requiredChanges: string[];
    }[];
}, {
    confidence: number;
    rootCause: string;
    suggestedApproaches: {
        name: string;
        description: string;
        confidence: number;
        complexity: "simple" | "moderate" | "complex";
        requiredChanges: string[];
    }[];
}>;
declare const CodeChangeSchema: z.ZodObject<{
    type: z.ZodEnum<["replace", "insert", "delete"]>;
    lineStart: z.ZodNumber;
    lineEnd: z.ZodOptional<z.ZodNumber>;
    explanation: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "replace" | "insert" | "delete";
    explanation: string;
    lineStart: number;
    lineEnd?: number | undefined;
}, {
    type: "replace" | "insert" | "delete";
    explanation: string;
    lineStart: number;
    lineEnd?: number | undefined;
}>;
declare const CodeFixResponseSchema: z.ZodObject<{
    fixedCode: z.ZodString;
    changes: z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<["replace", "insert", "delete"]>;
        lineStart: z.ZodNumber;
        lineEnd: z.ZodOptional<z.ZodNumber>;
        explanation: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "replace" | "insert" | "delete";
        explanation: string;
        lineStart: number;
        lineEnd?: number | undefined;
    }, {
        type: "replace" | "insert" | "delete";
        explanation: string;
        lineStart: number;
        lineEnd?: number | undefined;
    }>, "many">;
    explanation: z.ZodString;
}, "strip", z.ZodTypeAny, {
    explanation: string;
    fixedCode: string;
    changes: {
        type: "replace" | "insert" | "delete";
        explanation: string;
        lineStart: number;
        lineEnd?: number | undefined;
    }[];
}, {
    explanation: string;
    fixedCode: string;
    changes: {
        type: "replace" | "insert" | "delete";
        explanation: string;
        lineStart: number;
        lineEnd?: number | undefined;
    }[];
}>;
type SCoTPlanResponse = z.infer<typeof SCoTPlanResponseSchema>;
type ErrorAnalysisResponse = z.infer<typeof ErrorAnalysisResponseSchema>;
type CodeFixResponse = z.infer<typeof CodeFixResponseSchema>;
type SuggestedApproach = z.infer<typeof SuggestedApproachSchema>;

/**
 * @module shared/config-validator
 * @description Config validation with LLM availability check
 */

declare const SCoTConfigSchema: z.ZodDefault<z.ZodObject<{
    enabled: z.ZodDefault<z.ZodBoolean>;
    minConfidence: z.ZodDefault<z.ZodNumber>;
    maxStructures: z.ZodDefault<z.ZodNumber>;
    includeReasoningComments: z.ZodDefault<z.ZodBoolean>;
    llm: z.ZodDefault<z.ZodObject<{
        provider: z.ZodDefault<z.ZodEnum<["openai", "anthropic", "azure", "bedrock", "ollama", "local", "none"]>>;
        model: z.ZodDefault<z.ZodString>;
        temperature: z.ZodDefault<z.ZodNumber>;
        maxTokens: z.ZodDefault<z.ZodNumber>;
        timeoutMs: z.ZodDefault<z.ZodNumber>;
        maxRetries: z.ZodDefault<z.ZodNumber>;
        retryDelayMs: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        provider: "none" | "local" | "openai" | "anthropic" | "azure" | "bedrock" | "ollama";
        model: string;
        temperature: number;
        maxTokens: number;
        timeoutMs: number;
        maxRetries: number;
        retryDelayMs: number;
    }, {
        provider?: "none" | "local" | "openai" | "anthropic" | "azure" | "bedrock" | "ollama" | undefined;
        model?: string | undefined;
        temperature?: number | undefined;
        maxTokens?: number | undefined;
        timeoutMs?: number | undefined;
        maxRetries?: number | undefined;
        retryDelayMs?: number | undefined;
    }>>;
    fallback: z.ZodDefault<z.ZodEnum<["pattern-only", "error"]>>;
}, "strip", z.ZodTypeAny, {
    enabled: boolean;
    minConfidence: number;
    maxStructures: number;
    includeReasoningComments: boolean;
    llm: {
        provider: "none" | "local" | "openai" | "anthropic" | "azure" | "bedrock" | "ollama";
        model: string;
        temperature: number;
        maxTokens: number;
        timeoutMs: number;
        maxRetries: number;
        retryDelayMs: number;
    };
    fallback: "error" | "pattern-only";
}, {
    enabled?: boolean | undefined;
    minConfidence?: number | undefined;
    maxStructures?: number | undefined;
    includeReasoningComments?: boolean | undefined;
    llm?: {
        provider?: "none" | "local" | "openai" | "anthropic" | "azure" | "bedrock" | "ollama" | undefined;
        model?: string | undefined;
        temperature?: number | undefined;
        maxTokens?: number | undefined;
        timeoutMs?: number | undefined;
        maxRetries?: number | undefined;
        retryDelayMs?: number | undefined;
    } | undefined;
    fallback?: "error" | "pattern-only" | undefined;
}>>;
declare const CircuitBreakerConfigSchema: z.ZodDefault<z.ZodObject<{
    sameErrorThreshold: z.ZodDefault<z.ZodNumber>;
    errorHistorySize: z.ZodDefault<z.ZodNumber>;
    degradationThreshold: z.ZodDefault<z.ZodNumber>;
    cooldownMs: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    sameErrorThreshold: number;
    errorHistorySize: number;
    degradationThreshold: number;
    cooldownMs: number;
}, {
    sameErrorThreshold?: number | undefined;
    errorHistorySize?: number | undefined;
    degradationThreshold?: number | undefined;
    cooldownMs?: number | undefined;
}>>;
declare const RefinementConfigSchema: z.ZodDefault<z.ZodObject<{
    enabled: z.ZodDefault<z.ZodBoolean>;
    maxAttempts: z.ZodDefault<z.ZodNumber>;
    timeouts: z.ZodDefault<z.ZodObject<{
        session: z.ZodDefault<z.ZodNumber>;
        execution: z.ZodDefault<z.ZodNumber>;
        delayBetweenAttempts: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        session: number;
        execution: number;
        delayBetweenAttempts: number;
    }, {
        session?: number | undefined;
        execution?: number | undefined;
        delayBetweenAttempts?: number | undefined;
    }>>;
    circuitBreaker: z.ZodDefault<z.ZodObject<{
        sameErrorThreshold: z.ZodDefault<z.ZodNumber>;
        errorHistorySize: z.ZodDefault<z.ZodNumber>;
        degradationThreshold: z.ZodDefault<z.ZodNumber>;
        cooldownMs: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        sameErrorThreshold: number;
        errorHistorySize: number;
        degradationThreshold: number;
        cooldownMs: number;
    }, {
        sameErrorThreshold?: number | undefined;
        errorHistorySize?: number | undefined;
        degradationThreshold?: number | undefined;
        cooldownMs?: number | undefined;
    }>>;
    errorHandling: z.ZodDefault<z.ZodObject<{
        categories: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        skip: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        categories: string[];
        skip: string[];
    }, {
        categories?: string[] | undefined;
        skip?: string[] | undefined;
    }>>;
    learning: z.ZodDefault<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        minGeneralizability: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        minGeneralizability: number;
    }, {
        enabled?: boolean | undefined;
        minGeneralizability?: number | undefined;
    }>>;
    llm: z.ZodDefault<z.ZodObject<{
        provider: z.ZodDefault<z.ZodEnum<["openai", "anthropic", "azure", "bedrock", "ollama", "local", "none"]>>;
        model: z.ZodDefault<z.ZodString>;
        temperature: z.ZodDefault<z.ZodNumber>;
        maxTokens: z.ZodDefault<z.ZodNumber>;
        timeoutMs: z.ZodDefault<z.ZodNumber>;
        maxRetries: z.ZodDefault<z.ZodNumber>;
        retryDelayMs: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        provider: "none" | "local" | "openai" | "anthropic" | "azure" | "bedrock" | "ollama";
        model: string;
        temperature: number;
        maxTokens: number;
        timeoutMs: number;
        maxRetries: number;
        retryDelayMs: number;
    }, {
        provider?: "none" | "local" | "openai" | "anthropic" | "azure" | "bedrock" | "ollama" | undefined;
        model?: string | undefined;
        temperature?: number | undefined;
        maxTokens?: number | undefined;
        timeoutMs?: number | undefined;
        maxRetries?: number | undefined;
        retryDelayMs?: number | undefined;
    }>>;
    advanced: z.ZodDefault<z.ZodObject<{
        minAutoFixConfidence: z.ZodDefault<z.ZodNumber>;
        includeScreenshots: z.ZodDefault<z.ZodBoolean>;
        includeTraces: z.ZodDefault<z.ZodBoolean>;
        verbose: z.ZodDefault<z.ZodBoolean>;
        dryRun: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        dryRun: boolean;
        minAutoFixConfidence: number;
        includeScreenshots: boolean;
        includeTraces: boolean;
        verbose: boolean;
    }, {
        dryRun?: boolean | undefined;
        minAutoFixConfidence?: number | undefined;
        includeScreenshots?: boolean | undefined;
        includeTraces?: boolean | undefined;
        verbose?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    enabled: boolean;
    maxAttempts: number;
    llm: {
        provider: "none" | "local" | "openai" | "anthropic" | "azure" | "bedrock" | "ollama";
        model: string;
        temperature: number;
        maxTokens: number;
        timeoutMs: number;
        maxRetries: number;
        retryDelayMs: number;
    };
    timeouts: {
        session: number;
        execution: number;
        delayBetweenAttempts: number;
    };
    circuitBreaker: {
        sameErrorThreshold: number;
        errorHistorySize: number;
        degradationThreshold: number;
        cooldownMs: number;
    };
    errorHandling: {
        categories: string[];
        skip: string[];
    };
    learning: {
        enabled: boolean;
        minGeneralizability: number;
    };
    advanced: {
        dryRun: boolean;
        minAutoFixConfidence: number;
        includeScreenshots: boolean;
        includeTraces: boolean;
        verbose: boolean;
    };
}, {
    enabled?: boolean | undefined;
    maxAttempts?: number | undefined;
    llm?: {
        provider?: "none" | "local" | "openai" | "anthropic" | "azure" | "bedrock" | "ollama" | undefined;
        model?: string | undefined;
        temperature?: number | undefined;
        maxTokens?: number | undefined;
        timeoutMs?: number | undefined;
        maxRetries?: number | undefined;
        retryDelayMs?: number | undefined;
    } | undefined;
    timeouts?: {
        session?: number | undefined;
        execution?: number | undefined;
        delayBetweenAttempts?: number | undefined;
    } | undefined;
    circuitBreaker?: {
        sameErrorThreshold?: number | undefined;
        errorHistorySize?: number | undefined;
        degradationThreshold?: number | undefined;
        cooldownMs?: number | undefined;
    } | undefined;
    errorHandling?: {
        categories?: string[] | undefined;
        skip?: string[] | undefined;
    } | undefined;
    learning?: {
        enabled?: boolean | undefined;
        minGeneralizability?: number | undefined;
    } | undefined;
    advanced?: {
        dryRun?: boolean | undefined;
        minAutoFixConfidence?: number | undefined;
        includeScreenshots?: boolean | undefined;
        includeTraces?: boolean | undefined;
        verbose?: boolean | undefined;
    } | undefined;
}>>;
declare const UncertaintyConfigSchema: z.ZodDefault<z.ZodObject<{
    enabled: z.ZodDefault<z.ZodBoolean>;
    thresholds: z.ZodDefault<z.ZodObject<{
        autoAccept: z.ZodDefault<z.ZodNumber>;
        block: z.ZodDefault<z.ZodNumber>;
        minimumPerDimension: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        autoAccept: number;
        block: number;
        minimumPerDimension: number;
    }, {
        autoAccept?: number | undefined;
        block?: number | undefined;
        minimumPerDimension?: number | undefined;
    }>>;
    weights: z.ZodDefault<z.ZodObject<{
        syntax: z.ZodDefault<z.ZodNumber>;
        pattern: z.ZodDefault<z.ZodNumber>;
        selector: z.ZodDefault<z.ZodNumber>;
        agreement: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        pattern: number;
        selector: number;
        agreement: number;
        syntax: number;
    }, {
        pattern?: number | undefined;
        selector?: number | undefined;
        agreement?: number | undefined;
        syntax?: number | undefined;
    }>>;
    sampling: z.ZodDefault<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        sampleCount: z.ZodDefault<z.ZodNumber>;
        temperatures: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        sampleCount: number;
        temperatures: number[];
    }, {
        enabled?: boolean | undefined;
        sampleCount?: number | undefined;
        temperatures?: number[] | undefined;
    }>>;
    reporting: z.ZodDefault<z.ZodObject<{
        includeInTestComments: z.ZodDefault<z.ZodBoolean>;
        generateMarkdownReport: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        includeInTestComments: boolean;
        generateMarkdownReport: boolean;
    }, {
        includeInTestComments?: boolean | undefined;
        generateMarkdownReport?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    enabled: boolean;
    thresholds: {
        autoAccept: number;
        block: number;
        minimumPerDimension: number;
    };
    weights: {
        pattern: number;
        selector: number;
        agreement: number;
        syntax: number;
    };
    sampling: {
        enabled: boolean;
        sampleCount: number;
        temperatures: number[];
    };
    reporting: {
        includeInTestComments: boolean;
        generateMarkdownReport: boolean;
    };
}, {
    enabled?: boolean | undefined;
    thresholds?: {
        autoAccept?: number | undefined;
        block?: number | undefined;
        minimumPerDimension?: number | undefined;
    } | undefined;
    weights?: {
        pattern?: number | undefined;
        selector?: number | undefined;
        agreement?: number | undefined;
        syntax?: number | undefined;
    } | undefined;
    sampling?: {
        enabled?: boolean | undefined;
        sampleCount?: number | undefined;
        temperatures?: number[] | undefined;
    } | undefined;
    reporting?: {
        includeInTestComments?: boolean | undefined;
        generateMarkdownReport?: boolean | undefined;
    } | undefined;
}>>;
declare const AutogenEnhancementConfigSchema: z.ZodObject<{
    scot: z.ZodDefault<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        minConfidence: z.ZodDefault<z.ZodNumber>;
        maxStructures: z.ZodDefault<z.ZodNumber>;
        includeReasoningComments: z.ZodDefault<z.ZodBoolean>;
        llm: z.ZodDefault<z.ZodObject<{
            provider: z.ZodDefault<z.ZodEnum<["openai", "anthropic", "azure", "bedrock", "ollama", "local", "none"]>>;
            model: z.ZodDefault<z.ZodString>;
            temperature: z.ZodDefault<z.ZodNumber>;
            maxTokens: z.ZodDefault<z.ZodNumber>;
            timeoutMs: z.ZodDefault<z.ZodNumber>;
            maxRetries: z.ZodDefault<z.ZodNumber>;
            retryDelayMs: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            provider: "none" | "local" | "openai" | "anthropic" | "azure" | "bedrock" | "ollama";
            model: string;
            temperature: number;
            maxTokens: number;
            timeoutMs: number;
            maxRetries: number;
            retryDelayMs: number;
        }, {
            provider?: "none" | "local" | "openai" | "anthropic" | "azure" | "bedrock" | "ollama" | undefined;
            model?: string | undefined;
            temperature?: number | undefined;
            maxTokens?: number | undefined;
            timeoutMs?: number | undefined;
            maxRetries?: number | undefined;
            retryDelayMs?: number | undefined;
        }>>;
        fallback: z.ZodDefault<z.ZodEnum<["pattern-only", "error"]>>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        minConfidence: number;
        maxStructures: number;
        includeReasoningComments: boolean;
        llm: {
            provider: "none" | "local" | "openai" | "anthropic" | "azure" | "bedrock" | "ollama";
            model: string;
            temperature: number;
            maxTokens: number;
            timeoutMs: number;
            maxRetries: number;
            retryDelayMs: number;
        };
        fallback: "error" | "pattern-only";
    }, {
        enabled?: boolean | undefined;
        minConfidence?: number | undefined;
        maxStructures?: number | undefined;
        includeReasoningComments?: boolean | undefined;
        llm?: {
            provider?: "none" | "local" | "openai" | "anthropic" | "azure" | "bedrock" | "ollama" | undefined;
            model?: string | undefined;
            temperature?: number | undefined;
            maxTokens?: number | undefined;
            timeoutMs?: number | undefined;
            maxRetries?: number | undefined;
            retryDelayMs?: number | undefined;
        } | undefined;
        fallback?: "error" | "pattern-only" | undefined;
    }>>;
    refinement: z.ZodDefault<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        maxAttempts: z.ZodDefault<z.ZodNumber>;
        timeouts: z.ZodDefault<z.ZodObject<{
            session: z.ZodDefault<z.ZodNumber>;
            execution: z.ZodDefault<z.ZodNumber>;
            delayBetweenAttempts: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            session: number;
            execution: number;
            delayBetweenAttempts: number;
        }, {
            session?: number | undefined;
            execution?: number | undefined;
            delayBetweenAttempts?: number | undefined;
        }>>;
        circuitBreaker: z.ZodDefault<z.ZodObject<{
            sameErrorThreshold: z.ZodDefault<z.ZodNumber>;
            errorHistorySize: z.ZodDefault<z.ZodNumber>;
            degradationThreshold: z.ZodDefault<z.ZodNumber>;
            cooldownMs: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            sameErrorThreshold: number;
            errorHistorySize: number;
            degradationThreshold: number;
            cooldownMs: number;
        }, {
            sameErrorThreshold?: number | undefined;
            errorHistorySize?: number | undefined;
            degradationThreshold?: number | undefined;
            cooldownMs?: number | undefined;
        }>>;
        errorHandling: z.ZodDefault<z.ZodObject<{
            categories: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
            skip: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            categories: string[];
            skip: string[];
        }, {
            categories?: string[] | undefined;
            skip?: string[] | undefined;
        }>>;
        learning: z.ZodDefault<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            minGeneralizability: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            minGeneralizability: number;
        }, {
            enabled?: boolean | undefined;
            minGeneralizability?: number | undefined;
        }>>;
        llm: z.ZodDefault<z.ZodObject<{
            provider: z.ZodDefault<z.ZodEnum<["openai", "anthropic", "azure", "bedrock", "ollama", "local", "none"]>>;
            model: z.ZodDefault<z.ZodString>;
            temperature: z.ZodDefault<z.ZodNumber>;
            maxTokens: z.ZodDefault<z.ZodNumber>;
            timeoutMs: z.ZodDefault<z.ZodNumber>;
            maxRetries: z.ZodDefault<z.ZodNumber>;
            retryDelayMs: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            provider: "none" | "local" | "openai" | "anthropic" | "azure" | "bedrock" | "ollama";
            model: string;
            temperature: number;
            maxTokens: number;
            timeoutMs: number;
            maxRetries: number;
            retryDelayMs: number;
        }, {
            provider?: "none" | "local" | "openai" | "anthropic" | "azure" | "bedrock" | "ollama" | undefined;
            model?: string | undefined;
            temperature?: number | undefined;
            maxTokens?: number | undefined;
            timeoutMs?: number | undefined;
            maxRetries?: number | undefined;
            retryDelayMs?: number | undefined;
        }>>;
        advanced: z.ZodDefault<z.ZodObject<{
            minAutoFixConfidence: z.ZodDefault<z.ZodNumber>;
            includeScreenshots: z.ZodDefault<z.ZodBoolean>;
            includeTraces: z.ZodDefault<z.ZodBoolean>;
            verbose: z.ZodDefault<z.ZodBoolean>;
            dryRun: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            dryRun: boolean;
            minAutoFixConfidence: number;
            includeScreenshots: boolean;
            includeTraces: boolean;
            verbose: boolean;
        }, {
            dryRun?: boolean | undefined;
            minAutoFixConfidence?: number | undefined;
            includeScreenshots?: boolean | undefined;
            includeTraces?: boolean | undefined;
            verbose?: boolean | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        maxAttempts: number;
        llm: {
            provider: "none" | "local" | "openai" | "anthropic" | "azure" | "bedrock" | "ollama";
            model: string;
            temperature: number;
            maxTokens: number;
            timeoutMs: number;
            maxRetries: number;
            retryDelayMs: number;
        };
        timeouts: {
            session: number;
            execution: number;
            delayBetweenAttempts: number;
        };
        circuitBreaker: {
            sameErrorThreshold: number;
            errorHistorySize: number;
            degradationThreshold: number;
            cooldownMs: number;
        };
        errorHandling: {
            categories: string[];
            skip: string[];
        };
        learning: {
            enabled: boolean;
            minGeneralizability: number;
        };
        advanced: {
            dryRun: boolean;
            minAutoFixConfidence: number;
            includeScreenshots: boolean;
            includeTraces: boolean;
            verbose: boolean;
        };
    }, {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        llm?: {
            provider?: "none" | "local" | "openai" | "anthropic" | "azure" | "bedrock" | "ollama" | undefined;
            model?: string | undefined;
            temperature?: number | undefined;
            maxTokens?: number | undefined;
            timeoutMs?: number | undefined;
            maxRetries?: number | undefined;
            retryDelayMs?: number | undefined;
        } | undefined;
        timeouts?: {
            session?: number | undefined;
            execution?: number | undefined;
            delayBetweenAttempts?: number | undefined;
        } | undefined;
        circuitBreaker?: {
            sameErrorThreshold?: number | undefined;
            errorHistorySize?: number | undefined;
            degradationThreshold?: number | undefined;
            cooldownMs?: number | undefined;
        } | undefined;
        errorHandling?: {
            categories?: string[] | undefined;
            skip?: string[] | undefined;
        } | undefined;
        learning?: {
            enabled?: boolean | undefined;
            minGeneralizability?: number | undefined;
        } | undefined;
        advanced?: {
            dryRun?: boolean | undefined;
            minAutoFixConfidence?: number | undefined;
            includeScreenshots?: boolean | undefined;
            includeTraces?: boolean | undefined;
            verbose?: boolean | undefined;
        } | undefined;
    }>>;
    uncertainty: z.ZodDefault<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        thresholds: z.ZodDefault<z.ZodObject<{
            autoAccept: z.ZodDefault<z.ZodNumber>;
            block: z.ZodDefault<z.ZodNumber>;
            minimumPerDimension: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            autoAccept: number;
            block: number;
            minimumPerDimension: number;
        }, {
            autoAccept?: number | undefined;
            block?: number | undefined;
            minimumPerDimension?: number | undefined;
        }>>;
        weights: z.ZodDefault<z.ZodObject<{
            syntax: z.ZodDefault<z.ZodNumber>;
            pattern: z.ZodDefault<z.ZodNumber>;
            selector: z.ZodDefault<z.ZodNumber>;
            agreement: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            pattern: number;
            selector: number;
            agreement: number;
            syntax: number;
        }, {
            pattern?: number | undefined;
            selector?: number | undefined;
            agreement?: number | undefined;
            syntax?: number | undefined;
        }>>;
        sampling: z.ZodDefault<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            sampleCount: z.ZodDefault<z.ZodNumber>;
            temperatures: z.ZodDefault<z.ZodArray<z.ZodNumber, "many">>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            sampleCount: number;
            temperatures: number[];
        }, {
            enabled?: boolean | undefined;
            sampleCount?: number | undefined;
            temperatures?: number[] | undefined;
        }>>;
        reporting: z.ZodDefault<z.ZodObject<{
            includeInTestComments: z.ZodDefault<z.ZodBoolean>;
            generateMarkdownReport: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            includeInTestComments: boolean;
            generateMarkdownReport: boolean;
        }, {
            includeInTestComments?: boolean | undefined;
            generateMarkdownReport?: boolean | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        thresholds: {
            autoAccept: number;
            block: number;
            minimumPerDimension: number;
        };
        weights: {
            pattern: number;
            selector: number;
            agreement: number;
            syntax: number;
        };
        sampling: {
            enabled: boolean;
            sampleCount: number;
            temperatures: number[];
        };
        reporting: {
            includeInTestComments: boolean;
            generateMarkdownReport: boolean;
        };
    }, {
        enabled?: boolean | undefined;
        thresholds?: {
            autoAccept?: number | undefined;
            block?: number | undefined;
            minimumPerDimension?: number | undefined;
        } | undefined;
        weights?: {
            pattern?: number | undefined;
            selector?: number | undefined;
            agreement?: number | undefined;
            syntax?: number | undefined;
        } | undefined;
        sampling?: {
            enabled?: boolean | undefined;
            sampleCount?: number | undefined;
            temperatures?: number[] | undefined;
        } | undefined;
        reporting?: {
            includeInTestComments?: boolean | undefined;
            generateMarkdownReport?: boolean | undefined;
        } | undefined;
    }>>;
    costLimits: z.ZodDefault<z.ZodObject<{
        perTestUsd: z.ZodDefault<z.ZodNumber>;
        perSessionUsd: z.ZodDefault<z.ZodNumber>;
        enabled: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        perTestUsd: number;
        perSessionUsd: number;
    }, {
        enabled?: boolean | undefined;
        perTestUsd?: number | undefined;
        perSessionUsd?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    refinement: {
        enabled: boolean;
        maxAttempts: number;
        llm: {
            provider: "none" | "local" | "openai" | "anthropic" | "azure" | "bedrock" | "ollama";
            model: string;
            temperature: number;
            maxTokens: number;
            timeoutMs: number;
            maxRetries: number;
            retryDelayMs: number;
        };
        timeouts: {
            session: number;
            execution: number;
            delayBetweenAttempts: number;
        };
        circuitBreaker: {
            sameErrorThreshold: number;
            errorHistorySize: number;
            degradationThreshold: number;
            cooldownMs: number;
        };
        errorHandling: {
            categories: string[];
            skip: string[];
        };
        learning: {
            enabled: boolean;
            minGeneralizability: number;
        };
        advanced: {
            dryRun: boolean;
            minAutoFixConfidence: number;
            includeScreenshots: boolean;
            includeTraces: boolean;
            verbose: boolean;
        };
    };
    scot: {
        enabled: boolean;
        minConfidence: number;
        maxStructures: number;
        includeReasoningComments: boolean;
        llm: {
            provider: "none" | "local" | "openai" | "anthropic" | "azure" | "bedrock" | "ollama";
            model: string;
            temperature: number;
            maxTokens: number;
            timeoutMs: number;
            maxRetries: number;
            retryDelayMs: number;
        };
        fallback: "error" | "pattern-only";
    };
    uncertainty: {
        enabled: boolean;
        thresholds: {
            autoAccept: number;
            block: number;
            minimumPerDimension: number;
        };
        weights: {
            pattern: number;
            selector: number;
            agreement: number;
            syntax: number;
        };
        sampling: {
            enabled: boolean;
            sampleCount: number;
            temperatures: number[];
        };
        reporting: {
            includeInTestComments: boolean;
            generateMarkdownReport: boolean;
        };
    };
    costLimits: {
        enabled: boolean;
        perTestUsd: number;
        perSessionUsd: number;
    };
}, {
    refinement?: {
        enabled?: boolean | undefined;
        maxAttempts?: number | undefined;
        llm?: {
            provider?: "none" | "local" | "openai" | "anthropic" | "azure" | "bedrock" | "ollama" | undefined;
            model?: string | undefined;
            temperature?: number | undefined;
            maxTokens?: number | undefined;
            timeoutMs?: number | undefined;
            maxRetries?: number | undefined;
            retryDelayMs?: number | undefined;
        } | undefined;
        timeouts?: {
            session?: number | undefined;
            execution?: number | undefined;
            delayBetweenAttempts?: number | undefined;
        } | undefined;
        circuitBreaker?: {
            sameErrorThreshold?: number | undefined;
            errorHistorySize?: number | undefined;
            degradationThreshold?: number | undefined;
            cooldownMs?: number | undefined;
        } | undefined;
        errorHandling?: {
            categories?: string[] | undefined;
            skip?: string[] | undefined;
        } | undefined;
        learning?: {
            enabled?: boolean | undefined;
            minGeneralizability?: number | undefined;
        } | undefined;
        advanced?: {
            dryRun?: boolean | undefined;
            minAutoFixConfidence?: number | undefined;
            includeScreenshots?: boolean | undefined;
            includeTraces?: boolean | undefined;
            verbose?: boolean | undefined;
        } | undefined;
    } | undefined;
    scot?: {
        enabled?: boolean | undefined;
        minConfidence?: number | undefined;
        maxStructures?: number | undefined;
        includeReasoningComments?: boolean | undefined;
        llm?: {
            provider?: "none" | "local" | "openai" | "anthropic" | "azure" | "bedrock" | "ollama" | undefined;
            model?: string | undefined;
            temperature?: number | undefined;
            maxTokens?: number | undefined;
            timeoutMs?: number | undefined;
            maxRetries?: number | undefined;
            retryDelayMs?: number | undefined;
        } | undefined;
        fallback?: "error" | "pattern-only" | undefined;
    } | undefined;
    uncertainty?: {
        enabled?: boolean | undefined;
        thresholds?: {
            autoAccept?: number | undefined;
            block?: number | undefined;
            minimumPerDimension?: number | undefined;
        } | undefined;
        weights?: {
            pattern?: number | undefined;
            selector?: number | undefined;
            agreement?: number | undefined;
            syntax?: number | undefined;
        } | undefined;
        sampling?: {
            enabled?: boolean | undefined;
            sampleCount?: number | undefined;
            temperatures?: number[] | undefined;
        } | undefined;
        reporting?: {
            includeInTestComments?: boolean | undefined;
            generateMarkdownReport?: boolean | undefined;
        } | undefined;
    } | undefined;
    costLimits?: {
        enabled?: boolean | undefined;
        perTestUsd?: number | undefined;
        perSessionUsd?: number | undefined;
    } | undefined;
}>;
type SCoTConfig$1 = z.infer<typeof SCoTConfigSchema>;
type RefinementConfig = z.infer<typeof RefinementConfigSchema>;
type UncertaintyConfig = z.infer<typeof UncertaintyConfigSchema>;
type CircuitBreakerConfig$1 = z.infer<typeof CircuitBreakerConfigSchema>;
type AutogenEnhancementConfig = z.infer<typeof AutogenEnhancementConfigSchema>;
interface LLMAvailabilityResult {
    available: boolean;
    provider: LLMProvider;
    missingEnvVar?: string;
    message: string;
}
declare function checkLLMAvailability(provider: LLMProvider): LLMAvailabilityResult;
interface ConfigValidationResult {
    valid: boolean;
    config?: AutogenEnhancementConfig;
    errors: ConfigValidationError[];
    warnings: string[];
}
interface ConfigValidationError {
    path: string;
    message: string;
    severity: 'error' | 'warning';
}
declare function validateEnhancementConfig(rawConfig: unknown): ConfigValidationResult;

/**
 * @module shared/cost-tracker
 * @description LLM cost tracking with limits to prevent cost explosion
 */

declare function estimateCost(usage: TokenUsage, model: string): number;
declare function estimateTokensFromText(text: string): number;
declare class CostTracker {
    private state;
    private limits;
    private model;
    constructor(limits: CostLimits, model?: string);
    /**
     * Track token usage and update costs
     */
    trackUsage(usage: TokenUsage): void;
    /**
     * Get current session cost
     */
    getSessionCost(): number;
    /**
     * Get current test cost
     */
    getTestCost(): number;
    /**
     * Get total tokens used
     */
    getTotalTokens(): number;
    /**
     * Reset test cost (call between tests)
     */
    resetTestCost(): void;
    /**
     * Check if we are still under budget (have not exceeded limit)
     * @returns true if cost is UNDER the limit (can continue), false if limit exceeded
     */
    isUnderBudget(type: 'test' | 'session'): boolean;
    /**
     * @deprecated Use isUnderBudget() instead - clearer naming
     */
    checkLimit(type: 'test' | 'session'): boolean;
    /**
     * Check if adding estimated tokens would exceed limit
     */
    wouldExceedLimit(estimatedTokens: number, type?: 'test' | 'session'): boolean;
    /**
     * Get remaining budget
     */
    getRemainingBudget(type: 'test' | 'session'): number;
    /**
     * Get state snapshot
     */
    getState(): CostTrackerState;
    /**
     * Create summary report
     */
    getSummary(): CostTrackerSummary;
}
interface CostTrackerSummary {
    sessionCost: number;
    testCost: number;
    totalTokens: number;
    sessionDurationMs: number;
    testBudgetRemaining: number;
    sessionBudgetRemaining: number;
    limitsEnabled: boolean;
}
/**
 * Create a cost tracker with default limits
 */
declare function createCostTracker(limits?: Partial<CostLimits>, model?: string): CostTracker;

/**
 * @module shared/telemetry
 * @description Pipeline telemetry for tracking performance, costs, and errors
 *
 * Persists data to .artk/autogen/telemetry.json for analysis and debugging.
 */

interface TelemetryEvent {
    /** Event timestamp (ISO 8601) */
    timestamp: string;
    /** Event type */
    type: 'command_start' | 'command_end' | 'llm_call' | 'error' | 'pipeline_transition';
    /** Command that generated the event */
    command: string;
    /** Additional event data */
    data: Record<string, unknown>;
}
interface CommandStats {
    /** Total executions */
    count: number;
    /** Total successful executions */
    successCount: number;
    /** Total failed executions */
    errorCount: number;
    /** Average duration in milliseconds */
    avgDurationMs: number;
    /** Total duration in milliseconds */
    totalDurationMs: number;
    /** Last execution timestamp */
    lastRun: string | null;
}
interface TelemetryData {
    /** Version of telemetry schema */
    version: number;
    /** Session ID */
    sessionId: string;
    /** When this telemetry file was created */
    createdAt: string;
    /** Last update time */
    updatedAt: string;
    /** Total tokens used across all commands */
    totalTokens: number;
    /** Total estimated cost in USD */
    totalCostUsd: number;
    /** Command-level stats */
    commandStats: Record<string, CommandStats>;
    /** Recent events (last 100) */
    recentEvents: TelemetryEvent[];
    /** Error counts by type */
    errorCounts: Record<string, number>;
}
interface TelemetryConfig {
    /** Whether telemetry is enabled */
    enabled: boolean;
    /** Maximum number of events to keep */
    maxEvents: number;
    /** Default model for cost estimation */
    defaultModel: string;
}
declare class Telemetry {
    private data;
    private config;
    private sessionId;
    private pendingCommands;
    constructor(config?: Partial<TelemetryConfig>);
    private generateSessionId;
    /**
     * Load existing telemetry data or create new
     */
    load(baseDir?: string): Promise<void>;
    /**
     * Save telemetry data to disk
     */
    save(baseDir?: string): Promise<void>;
    /**
     * Track command start
     */
    trackCommandStart(command: string): string;
    /**
     * Track command end
     */
    trackCommandEnd(eventId: string, success: boolean, data?: Record<string, unknown>): void;
    /**
     * Track LLM usage
     */
    trackLLMUsage(command: string, usage: TokenUsage, model?: string): void;
    /**
     * Track error
     */
    trackError(command: string, errorType: string, message: string): void;
    /**
     * Track pipeline state transition
     */
    trackPipelineTransition(command: string, fromStage: string, toStage: string, data?: Record<string, unknown>): void;
    private addEvent;
    /**
     * Get telemetry summary
     */
    getSummary(): TelemetrySummary;
    /**
     * Get raw data (for debugging)
     */
    getData(): TelemetryData;
    /**
     * Reset telemetry (for testing)
     */
    reset(): void;
}
interface TelemetrySummary {
    sessionId: string;
    totalTokens: number;
    totalCostUsd: number;
    commandStats: Record<string, CommandStats>;
    topErrors: Array<{
        type: string;
        count: number;
    }>;
    eventCount: number;
}
/**
 * Get the global telemetry instance
 */
declare function getTelemetry(config?: Partial<TelemetryConfig>): Telemetry;
/**
 * Create a new telemetry instance (for testing)
 */
declare function createTelemetry(config?: Partial<TelemetryConfig>): Telemetry;
/**
 * Reset global telemetry (for testing)
 */
declare function resetGlobalTelemetry(): void;

/**
 * @module shared
 * @description Shared infrastructure for AutoGen enhancement strategies
 */

type index$3_AutogenEnhancementConfig = AutogenEnhancementConfig;
declare const index$3_AutogenEnhancementConfigSchema: typeof AutogenEnhancementConfigSchema;
declare const index$3_CircuitBreakerConfigSchema: typeof CircuitBreakerConfigSchema;
declare const index$3_CodeChangeSchema: typeof CodeChangeSchema;
type index$3_CodeFixResponse = CodeFixResponse;
declare const index$3_CodeFixResponseSchema: typeof CodeFixResponseSchema;
type index$3_CommandStats = CommandStats;
type index$3_ConfigValidationError = ConfigValidationError;
type index$3_ConfigValidationResult = ConfigValidationResult;
type index$3_CostLimits = CostLimits;
declare const index$3_CostLimitsSchema: typeof CostLimitsSchema;
type index$3_CostTracker = CostTracker;
declare const index$3_CostTracker: typeof CostTracker;
type index$3_CostTrackerState = CostTrackerState;
type index$3_CostTrackerSummary = CostTrackerSummary;
type index$3_DeadEndReport = DeadEndReport;
type index$3_DeadEndResult = DeadEndResult;
type index$3_ErrorAnalysisResponse = ErrorAnalysisResponse;
declare const index$3_ErrorAnalysisResponseSchema: typeof ErrorAnalysisResponseSchema;
type index$3_FailedAttempt = FailedAttempt;
type index$3_LLKBAdapter = LLKBAdapter;
type index$3_LLKBLesson = LLKBLesson;
type index$3_LLKBPattern = LLKBPattern;
type index$3_LLMAvailabilityResult = LLMAvailabilityResult;
type index$3_LLMConfig = LLMConfig;
declare const index$3_LLMConfigSchema: typeof LLMConfigSchema;
type index$3_LLMError = LLMError;
type index$3_LLMProvider = LLMProvider;
declare const index$3_LLMProviderSchema: typeof LLMProviderSchema;
type index$3_LLMResponse<T> = LLMResponse<T>;
type index$3_OrchestrationPhase = OrchestrationPhase;
type index$3_ParseError = ParseError;
type index$3_PipelineContext = PipelineContext;
type index$3_PipelineDiagnostics = PipelineDiagnostics;
type index$3_PipelineError = PipelineError;
type index$3_PipelineErrorType = PipelineErrorType;
type index$3_RefinementConfig = RefinementConfig;
declare const index$3_RefinementConfigSchema: typeof RefinementConfigSchema;
type index$3_Result<T, E = Error> = Result<T, E>;
declare const index$3_SCoTAtomicStepSchema: typeof SCoTAtomicStepSchema;
declare const index$3_SCoTConditionSchema: typeof SCoTConditionSchema;
declare const index$3_SCoTConfigSchema: typeof SCoTConfigSchema;
declare const index$3_SCoTIteratorSchema: typeof SCoTIteratorSchema;
type index$3_SCoTPlanResponse = SCoTPlanResponse;
declare const index$3_SCoTPlanResponseSchema: typeof SCoTPlanResponseSchema;
declare const index$3_SCoTStructureSchema: typeof SCoTStructureSchema;
type index$3_StateTransition = StateTransition;
type index$3_SuccessfulFix = SuccessfulFix;
type index$3_SuggestedApproach = SuggestedApproach;
declare const index$3_SuggestedApproachSchema: typeof SuggestedApproachSchema;
type index$3_Telemetry = Telemetry;
declare const index$3_Telemetry: typeof Telemetry;
type index$3_TelemetryConfig = TelemetryConfig;
type index$3_TelemetryData = TelemetryData;
type index$3_TelemetryEvent = TelemetryEvent;
type index$3_TelemetrySummary = TelemetrySummary;
type index$3_TokenUsage = TokenUsage;
declare const index$3_TokenUsageSchema: typeof TokenUsageSchema;
type index$3_UncertaintyConfig = UncertaintyConfig;
declare const index$3_UncertaintyConfigSchema: typeof UncertaintyConfigSchema;
declare const index$3_checkLLMAvailability: typeof checkLLMAvailability;
declare const index$3_createCostTracker: typeof createCostTracker;
declare const index$3_createTelemetry: typeof createTelemetry;
declare const index$3_err: typeof err;
declare const index$3_estimateCost: typeof estimateCost;
declare const index$3_estimateTokensFromText: typeof estimateTokensFromText;
declare const index$3_extractJson: typeof extractJson;
declare const index$3_getTelemetry: typeof getTelemetry;
declare const index$3_isErr: typeof isErr;
declare const index$3_isOk: typeof isOk;
declare const index$3_ok: typeof ok;
declare const index$3_parseLLMResponse: typeof parseLLMResponse;
declare const index$3_resetGlobalTelemetry: typeof resetGlobalTelemetry;
declare const index$3_validateEnhancementConfig: typeof validateEnhancementConfig;
declare namespace index$3 {
  export { type index$3_AutogenEnhancementConfig as AutogenEnhancementConfig, index$3_AutogenEnhancementConfigSchema as AutogenEnhancementConfigSchema, type CircuitBreakerConfig$1 as CircuitBreakerConfig, index$3_CircuitBreakerConfigSchema as CircuitBreakerConfigSchema, index$3_CodeChangeSchema as CodeChangeSchema, type index$3_CodeFixResponse as CodeFixResponse, index$3_CodeFixResponseSchema as CodeFixResponseSchema, type index$3_CommandStats as CommandStats, type index$3_ConfigValidationError as ConfigValidationError, type index$3_ConfigValidationResult as ConfigValidationResult, type index$3_CostLimits as CostLimits, index$3_CostLimitsSchema as CostLimitsSchema, index$3_CostTracker as CostTracker, type index$3_CostTrackerState as CostTrackerState, type index$3_CostTrackerSummary as CostTrackerSummary, type index$3_DeadEndReport as DeadEndReport, type index$3_DeadEndResult as DeadEndResult, type index$3_ErrorAnalysisResponse as ErrorAnalysisResponse, index$3_ErrorAnalysisResponseSchema as ErrorAnalysisResponseSchema, type index$3_FailedAttempt as FailedAttempt, type index$3_LLKBAdapter as LLKBAdapter, type index$3_LLKBLesson as LLKBLesson, type index$3_LLKBPattern as LLKBPattern, type index$3_LLMAvailabilityResult as LLMAvailabilityResult, type index$3_LLMConfig as LLMConfig, index$3_LLMConfigSchema as LLMConfigSchema, type index$3_LLMError as LLMError, type index$3_LLMProvider as LLMProvider, index$3_LLMProviderSchema as LLMProviderSchema, type index$3_LLMResponse as LLMResponse, type index$3_OrchestrationPhase as OrchestrationPhase, type index$3_ParseError as ParseError, type ParseOptions$1 as ParseOptions, type index$3_PipelineContext as PipelineContext, type index$3_PipelineDiagnostics as PipelineDiagnostics, type index$3_PipelineError as PipelineError, type index$3_PipelineErrorType as PipelineErrorType, type index$3_RefinementConfig as RefinementConfig, index$3_RefinementConfigSchema as RefinementConfigSchema, type index$3_Result as Result, index$3_SCoTAtomicStepSchema as SCoTAtomicStepSchema, index$3_SCoTConditionSchema as SCoTConditionSchema, type SCoTConfig$1 as SCoTConfig, index$3_SCoTConfigSchema as SCoTConfigSchema, index$3_SCoTIteratorSchema as SCoTIteratorSchema, type index$3_SCoTPlanResponse as SCoTPlanResponse, index$3_SCoTPlanResponseSchema as SCoTPlanResponseSchema, index$3_SCoTStructureSchema as SCoTStructureSchema, type index$3_StateTransition as StateTransition, type index$3_SuccessfulFix as SuccessfulFix, type index$3_SuggestedApproach as SuggestedApproach, index$3_SuggestedApproachSchema as SuggestedApproachSchema, index$3_Telemetry as Telemetry, type index$3_TelemetryConfig as TelemetryConfig, type index$3_TelemetryData as TelemetryData, type index$3_TelemetryEvent as TelemetryEvent, type index$3_TelemetrySummary as TelemetrySummary, type index$3_TokenUsage as TokenUsage, index$3_TokenUsageSchema as TokenUsageSchema, type index$3_UncertaintyConfig as UncertaintyConfig, index$3_UncertaintyConfigSchema as UncertaintyConfigSchema, index$3_checkLLMAvailability as checkLLMAvailability, index$3_createCostTracker as createCostTracker, index$3_createTelemetry as createTelemetry, index$3_err as err, index$3_estimateCost as estimateCost, index$3_estimateTokensFromText as estimateTokensFromText, index$3_extractJson as extractJson, index$3_getTelemetry as getTelemetry, index$3_isErr as isErr, index$3_isOk as isOk, index$3_ok as ok, index$3_parseLLMResponse as parseLLMResponse, index$3_resetGlobalTelemetry as resetGlobalTelemetry, index$3_validateEnhancementConfig as validateEnhancementConfig };
}

/**
 * @module scot/types
 * @description Type definitions for Structured Chain-of-Thought (SCoT) planning
 */

interface SCoTAtomicStep {
    /** The action to perform (e.g., 'click', 'fill', 'navigate', 'assert') */
    action: string;
    /** The target element or URL */
    target?: string;
    /** The value to input (for fill actions) */
    value?: string;
    /** An assertion to verify after the action */
    assertion?: string;
    /** Optional timeout override in milliseconds */
    timeoutMs?: number;
    /** Whether this step is optional (won't fail the test if it fails) */
    optional?: boolean;
}
type ConditionState = 'visible' | 'hidden' | 'enabled' | 'disabled' | 'exists' | 'checked' | 'unchecked';
interface SCoTCondition {
    /** The element to check (selector or description) */
    element?: string;
    /** The state to check for */
    state: ConditionState;
    /** Whether to negate the condition (NOT visible, etc.) */
    negate?: boolean;
    /** Alternative: a custom JavaScript expression to evaluate */
    expression?: string;
    /** Timeout for waiting on the condition */
    timeoutMs?: number;
}
interface SCoTIterator {
    /** The variable name for each iteration */
    variable: string;
    /** The collection to iterate over (selector or data source) */
    collection: string;
    /** Maximum iterations to prevent infinite loops */
    maxIterations?: number;
    /** Whether to continue on error (vs fail fast) */
    continueOnError?: boolean;
}
type SCoTStructureType = 'sequential' | 'branch' | 'loop';
interface SCoTSequential {
    type: 'sequential';
    description: string;
    steps: SCoTAtomicStep[];
}
interface SCoTBranch {
    type: 'branch';
    description: string;
    condition: SCoTCondition;
    thenBranch: SCoTAtomicStep[];
    elseBranch?: SCoTAtomicStep[];
}
interface SCoTLoop {
    type: 'loop';
    description: string;
    iterator: SCoTIterator;
    body: SCoTAtomicStep[];
    maxIterations?: number;
}
/** Union type for all structure types */
type SCoTStructure = SCoTSequential | SCoTBranch | SCoTLoop;
interface SCoTPlan {
    journeyId: string;
    structures: SCoTStructure[];
    reasoning: string;
    confidence: number;
    warnings: string[];
    metadata: SCoTPlanMetadata;
}
interface SCoTPlanMetadata {
    generatedAt: Date;
    llmModel: string;
    tokenUsage: TokenUsage;
    parseAttempts: number;
    parsingMethod: 'json' | 'text';
}
interface SCoTConfig {
    enabled: boolean;
    minConfidence: number;
    maxStructures: number;
    includeReasoningComments: boolean;
    llm: LLMConfig;
    fallback: 'pattern-only' | 'error';
}
type SCoTPlanResult = {
    success: true;
    plan: SCoTPlan;
} | {
    success: false;
    error: SCoTPlanError;
    fallbackUsed: boolean;
};
type SCoTPlanErrorType = 'LLM_ERROR' | 'PARSE_ERROR' | 'VALIDATION_ERROR' | 'LOW_CONFIDENCE' | 'TIMEOUT' | 'COST_LIMIT';
interface SCoTPlanError {
    type: SCoTPlanErrorType;
    message: string;
    details?: unknown;
    tokenUsage?: TokenUsage;
}
interface SCoTValidationResult {
    valid: boolean;
    errors: SCoTValidationError[];
    warnings: string[];
}
interface SCoTValidationError {
    path: string;
    message: string;
    severity: 'error' | 'warning';
}
declare function isSequential(structure: SCoTStructure): structure is SCoTSequential;
declare function isBranch(structure: SCoTStructure): structure is SCoTBranch;
declare function isLoop(structure: SCoTStructure): structure is SCoTLoop;

/**
 * @module scot/parser
 * @description Parse LLM output to structured SCoT plan
 */

interface SCoTParseError {
    type: 'EXTRACTION_FAILED' | 'INVALID_JSON' | 'SCHEMA_VALIDATION' | 'STRUCTURE_ERROR';
    message: string;
    line?: number;
    rawContent?: string;
}
interface ParseOptions {
    journeyId: string;
    llmModel?: string;
    maxRetries?: number;
}
/**
 * Parse SCoT plan from LLM response
 * Tries JSON first, falls back to text parsing
 */
declare function parseSCoTPlan(llmResponse: string, options: ParseOptions): Promise<Result<SCoTPlan, SCoTParseError>>;

/**
 * @module scot/validator
 * @description Validate SCoT plans for correctness and completeness
 */

declare function validateSCoTPlan(plan: SCoTPlan, config: SCoTConfig): SCoTValidationResult;
declare function quickValidateConfidence(plan: SCoTPlan, minConfidence: number): boolean;
declare function getValidationSummary(result: SCoTValidationResult): string;

/**
 * @module scot/planner
 * @description Main SCoT planning module - generates structured plans from journeys
 */

interface LLMClient {
    generate(_prompt: string, _systemPrompt: string, _options: LLMGenerateOptions): Promise<LLMGenerateResult>;
}
interface LLMGenerateOptions {
    temperature: number;
    maxTokens: number;
    timeoutMs: number;
}
interface LLMGenerateResult {
    content: string;
    tokenUsage: TokenUsage;
    model: string;
}
interface JourneyInput {
    id: string;
    title: string;
    description?: string;
    steps: JourneyStep[];
    acceptanceCriteria?: string[];
    tier?: 'smoke' | 'release' | 'regression';
    rawMarkdown?: string;
}
interface JourneyStep {
    number: number;
    text: string;
    substeps?: string[];
}
type PlannerMode = 'direct' | 'orchestrator';
interface PlannerOptions {
    config: SCoTConfig$1;
    /** LLM client - required for 'direct' mode, optional for 'orchestrator' mode */
    llmClient?: LLMClient;
    costTracker?: CostTracker;
    /** Planning mode: 'direct' calls LLM API, 'orchestrator' outputs prompts for external LLM */
    mode?: PlannerMode;
}
/**
 * Output for orchestrator mode - the LLM prompt to send to the orchestrating LLM
 */
interface OrchestratorPromptOutput {
    /** System prompt for the LLM */
    systemPrompt: string;
    /** User prompt with journey context */
    userPrompt: string;
    /** Expected response format description */
    expectedFormat: string;
    /** Journey ID for tracking */
    journeyId: string;
    /** Function to parse the LLM response */
    parseResponse: (_response: string) => Promise<SCoTPlanResult>;
}
/**
 * Generate a SCoT plan from a journey
 *
 * Supports two modes:
 * - 'direct': Calls LLM API directly (requires llmClient)
 * - 'orchestrator': Returns prompts for the orchestrating LLM (hybrid agentic pattern)
 */
declare function generateSCoTPlan(journey: JourneyInput, options: PlannerOptions): Promise<SCoTPlanResult>;
interface CodeContext {
    reasoning: string;
    structureComments: string[];
    hasConditionals: boolean;
    hasLoops: boolean;
    estimatedSteps: number;
}
declare function extractCodeContext(plan: SCoTPlan, includeReasoning: boolean): CodeContext;
/**
 * Generate prompts for the orchestrating LLM (Hybrid Agentic Pattern)
 *
 * Instead of calling an LLM directly, this returns the prompts that the
 * orchestrating LLM (Copilot/Claude Code) should use to generate the plan.
 *
 * @example
 * ```typescript
 * const prompts = generateSCoTPrompts(journey, { config });
 *
 * // The orchestrating LLM generates a response
 * const llmResponse = await orchestratorLLM.generate(prompts.userPrompt);
 *
 * // Parse the response
 * const result = await prompts.parseResponse(llmResponse);
 * ```
 */
declare function generateSCoTPrompts(journey: JourneyInput, config: SCoTConfig$1): OrchestratorPromptOutput;
/**
 * Process a plan from orchestrator-provided JSON
 *
 * For cases where the orchestrating LLM has already generated a plan
 * and we just need to parse and validate it.
 */
declare function processSCoTPlanFromJSON(planJson: string, journeyId: string, config: SCoTConfig$1): Promise<SCoTPlanResult>;

/**
 * @module scot/prompts
 * @description LLM prompt templates for SCoT planning
 */

declare const SCOT_SYSTEM_PROMPT = "You are an expert test automation architect specializing in Playwright E2E tests.\n\nYour task is to analyze a Journey specification and create a Structured Chain-of-Thought (SCoT) plan using these programming structures:\n\n## SEQUENTIAL Structure\nFor linear, step-by-step actions that must happen in order:\n```\nSEQUENTIAL: <description>\n1. <action>\n2. <action>\n3. <action>\n```\n\n## BRANCH Structure\nFor conditional logic where different paths may be taken:\n```\nBRANCH: <condition description>\nIF <condition> THEN\n  - <action if true>\n  - <another action if true>\nELSE\n  - <action if false>\nENDIF\n```\n\n## LOOP Structure\nFor repeated actions over a collection or until a condition:\n```\nLOOP: <iteration description>\nFOR EACH <variable> IN <collection>\n  - <action with variable>\nENDFOR\n```\n\n## Guidelines\n1. Use SEQUENTIAL for straightforward test flows\n2. Use BRANCH when the test may take different paths (e.g., MFA prompt, error handling)\n3. Use LOOP when iterating over table rows, list items, or form fields\n4. Each step should be atomic and testable\n5. Include assertions as steps (e.g., \"Verify redirect to dashboard\")\n6. Consider edge cases and potential failure points\n\n## Output Format\nYour response MUST be valid JSON:\n```json\n{\n  \"reasoning\": \"Brief explanation of your understanding of the test flow\",\n  \"confidence\": 0.85,\n  \"plan\": [\n    {\n      \"type\": \"sequential\",\n      \"description\": \"Login flow\",\n      \"steps\": [\n        {\"action\": \"navigate\", \"target\": \"/login\"},\n        {\"action\": \"fill\", \"target\": \"username field\", \"value\": \"test user\"},\n        {\"action\": \"fill\", \"target\": \"password field\", \"value\": \"password\"},\n        {\"action\": \"click\", \"target\": \"submit button\"},\n        {\"action\": \"assert\", \"assertion\": \"redirect to dashboard\"}\n      ]\n    },\n    {\n      \"type\": \"branch\",\n      \"description\": \"Handle optional MFA\",\n      \"condition\": {\"element\": \"MFA prompt\", \"state\": \"visible\"},\n      \"thenBranch\": [\n        {\"action\": \"fill\", \"target\": \"TOTP code field\", \"value\": \"generated code\"},\n        {\"action\": \"click\", \"target\": \"verify button\"}\n      ]\n    }\n  ],\n  \"warnings\": [\"MFA handling may need specific TOTP generator setup\"]\n}\n```\n\n## Confidence Scoring\n- 0.9-1.0: Clear, unambiguous journey with well-defined steps\n- 0.7-0.9: Minor ambiguities but overall clear intent\n- 0.5-0.7: Several ambiguities or missing details\n- Below 0.5: Too vague to create reliable test\n\nBe precise, thorough, and focus on creating a plan that maps directly to Playwright actions.";
declare function createUserPrompt(journey: JourneyInput): string;
declare function createErrorCorrectionPrompt(originalResponse: string, error: string): string;
declare const FEW_SHOT_EXAMPLES: {
    simpleLogin: {
        input: string;
        output: {
            reasoning: string;
            confidence: number;
            plan: {
                type: string;
                description: string;
                steps: ({
                    action: string;
                    target: string;
                    value?: undefined;
                    assertion?: undefined;
                } | {
                    action: string;
                    target: string;
                    value: string;
                    assertion?: undefined;
                } | {
                    action: string;
                    assertion: string;
                    target?: undefined;
                    value?: undefined;
                })[];
            }[];
            warnings: never[];
        };
    };
    loginWithMFA: {
        input: string;
        output: {
            reasoning: string;
            confidence: number;
            plan: ({
                type: string;
                description: string;
                steps: ({
                    action: string;
                    target: string;
                    value?: undefined;
                } | {
                    action: string;
                    target: string;
                    value: string;
                })[];
                condition?: undefined;
                thenBranch?: undefined;
            } | {
                type: string;
                description: string;
                condition: {
                    element: string;
                    state: string;
                };
                thenBranch: ({
                    action: string;
                    target: string;
                    value: string;
                } | {
                    action: string;
                    target: string;
                    value?: undefined;
                })[];
                steps?: undefined;
            } | {
                type: string;
                description: string;
                steps: {
                    action: string;
                    assertion: string;
                }[];
                condition?: undefined;
                thenBranch?: undefined;
            })[];
            warnings: string[];
        };
    };
    tableIteration: {
        input: string;
        output: {
            reasoning: string;
            confidence: number;
            plan: ({
                type: string;
                description: string;
                steps: {
                    action: string;
                    target: string;
                }[];
                iterator?: undefined;
                body?: undefined;
            } | {
                type: string;
                description: string;
                iterator: {
                    variable: string;
                    collection: string;
                    maxIterations: number;
                };
                body: {
                    action: string;
                    assertion: string;
                }[];
                steps?: undefined;
            } | {
                type: string;
                description: string;
                steps: {
                    action: string;
                    assertion: string;
                }[];
                iterator?: undefined;
                body?: undefined;
            })[];
            warnings: string[];
        };
    };
};

/**
 * @module scot
 * @description Structured Chain-of-Thought (SCoT) planning for Playwright test generation
 */

type index$2_CodeContext = CodeContext;
type index$2_ConditionState = ConditionState;
declare const index$2_FEW_SHOT_EXAMPLES: typeof FEW_SHOT_EXAMPLES;
type index$2_JourneyInput = JourneyInput;
type index$2_JourneyStep = JourneyStep;
type index$2_LLMClient = LLMClient;
type index$2_LLMGenerateOptions = LLMGenerateOptions;
type index$2_LLMGenerateResult = LLMGenerateResult;
type index$2_OrchestratorPromptOutput = OrchestratorPromptOutput;
type index$2_PlannerMode = PlannerMode;
type index$2_PlannerOptions = PlannerOptions;
declare const index$2_SCOT_SYSTEM_PROMPT: typeof SCOT_SYSTEM_PROMPT;
type index$2_SCoTAtomicStep = SCoTAtomicStep;
type index$2_SCoTBranch = SCoTBranch;
type index$2_SCoTCondition = SCoTCondition;
type index$2_SCoTConfig = SCoTConfig;
type index$2_SCoTIterator = SCoTIterator;
type index$2_SCoTLoop = SCoTLoop;
type index$2_SCoTParseError = SCoTParseError;
type index$2_SCoTPlan = SCoTPlan;
type index$2_SCoTPlanError = SCoTPlanError;
type index$2_SCoTPlanErrorType = SCoTPlanErrorType;
type index$2_SCoTPlanMetadata = SCoTPlanMetadata;
type index$2_SCoTPlanResult = SCoTPlanResult;
type index$2_SCoTSequential = SCoTSequential;
type index$2_SCoTStructure = SCoTStructure;
type index$2_SCoTStructureType = SCoTStructureType;
type index$2_SCoTValidationError = SCoTValidationError;
type index$2_SCoTValidationResult = SCoTValidationResult;
declare const index$2_createErrorCorrectionPrompt: typeof createErrorCorrectionPrompt;
declare const index$2_createUserPrompt: typeof createUserPrompt;
declare const index$2_extractCodeContext: typeof extractCodeContext;
declare const index$2_generateSCoTPlan: typeof generateSCoTPlan;
declare const index$2_generateSCoTPrompts: typeof generateSCoTPrompts;
declare const index$2_getValidationSummary: typeof getValidationSummary;
declare const index$2_isBranch: typeof isBranch;
declare const index$2_isLoop: typeof isLoop;
declare const index$2_isSequential: typeof isSequential;
declare const index$2_parseSCoTPlan: typeof parseSCoTPlan;
declare const index$2_processSCoTPlanFromJSON: typeof processSCoTPlanFromJSON;
declare const index$2_quickValidateConfidence: typeof quickValidateConfidence;
declare const index$2_validateSCoTPlan: typeof validateSCoTPlan;
declare namespace index$2 {
  export { type index$2_CodeContext as CodeContext, type index$2_ConditionState as ConditionState, index$2_FEW_SHOT_EXAMPLES as FEW_SHOT_EXAMPLES, type index$2_JourneyInput as JourneyInput, type index$2_JourneyStep as JourneyStep, type index$2_LLMClient as LLMClient, type index$2_LLMGenerateOptions as LLMGenerateOptions, type index$2_LLMGenerateResult as LLMGenerateResult, type index$2_OrchestratorPromptOutput as OrchestratorPromptOutput, type index$2_PlannerMode as PlannerMode, type index$2_PlannerOptions as PlannerOptions, index$2_SCOT_SYSTEM_PROMPT as SCOT_SYSTEM_PROMPT, type index$2_SCoTAtomicStep as SCoTAtomicStep, type index$2_SCoTBranch as SCoTBranch, type index$2_SCoTCondition as SCoTCondition, type index$2_SCoTConfig as SCoTConfig, type index$2_SCoTIterator as SCoTIterator, type index$2_SCoTLoop as SCoTLoop, type index$2_SCoTParseError as SCoTParseError, type index$2_SCoTPlan as SCoTPlan, type index$2_SCoTPlanError as SCoTPlanError, type index$2_SCoTPlanErrorType as SCoTPlanErrorType, type index$2_SCoTPlanMetadata as SCoTPlanMetadata, type index$2_SCoTPlanResult as SCoTPlanResult, type index$2_SCoTSequential as SCoTSequential, type index$2_SCoTStructure as SCoTStructure, type index$2_SCoTStructureType as SCoTStructureType, type index$2_SCoTValidationError as SCoTValidationError, type index$2_SCoTValidationResult as SCoTValidationResult, index$2_createErrorCorrectionPrompt as createErrorCorrectionPrompt, index$2_createUserPrompt as createUserPrompt, index$2_extractCodeContext as extractCodeContext, index$2_generateSCoTPlan as generateSCoTPlan, index$2_generateSCoTPrompts as generateSCoTPrompts, index$2_getValidationSummary as getValidationSummary, index$2_isBranch as isBranch, index$2_isLoop as isLoop, index$2_isSequential as isSequential, index$2_parseSCoTPlan as parseSCoTPlan, index$2_processSCoTPlanFromJSON as processSCoTPlanFromJSON, index$2_quickValidateConfidence as quickValidateConfidence, index$2_validateSCoTPlan as validateSCoTPlan };
}

/**
 * @module refinement/types
 * @description Type definitions for Self-Refinement strategy
 */

type ErrorCategory = 'SELECTOR_NOT_FOUND' | 'TIMEOUT' | 'ASSERTION_FAILED' | 'NAVIGATION_ERROR' | 'TYPE_ERROR' | 'RUNTIME_ERROR' | 'NETWORK_ERROR' | 'AUTHENTICATION_ERROR' | 'PERMISSION_ERROR' | 'SYNTAX_ERROR' | 'UNKNOWN';
type ErrorSeverity = 'critical' | 'major' | 'minor' | 'warning';
interface ErrorLocation {
    file: string;
    line: number;
    column?: number;
    testName?: string;
    stepDescription?: string;
}
interface ErrorAnalysis {
    category: ErrorCategory;
    severity: ErrorSeverity;
    message: string;
    originalError: string;
    location?: ErrorLocation;
    selector?: string;
    expectedValue?: string;
    actualValue?: string;
    stackTrace?: string;
    timestamp: Date;
    fingerprint: string;
}
type FixType = 'SELECTOR_CHANGE' | 'WAIT_ADDED' | 'ASSERTION_MODIFIED' | 'FLOW_REORDERED' | 'ERROR_HANDLING_ADDED' | 'TIMEOUT_INCREASED' | 'RETRY_ADDED' | 'LOCATOR_STRATEGY_CHANGED' | 'FRAME_CONTEXT_ADDED' | 'OTHER';
interface CodeFix {
    type: FixType;
    description: string;
    originalCode: string;
    fixedCode: string;
    location: ErrorLocation;
    confidence: number;
    reasoning?: string;
}
interface FixAttempt {
    attemptNumber: number;
    timestamp: Date;
    error: ErrorAnalysis;
    proposedFixes: CodeFix[];
    appliedFix?: CodeFix;
    outcome: 'success' | 'failure' | 'partial' | 'skipped';
    newErrors?: ErrorAnalysis[];
    tokenUsage?: TokenUsage;
}
type TestStatus = 'passed' | 'failed' | 'timedOut' | 'skipped' | 'interrupted';
interface PlaywrightTestResult {
    testId: string;
    testName: string;
    testFile: string;
    status: TestStatus;
    duration: number;
    errors: ErrorAnalysis[];
    retries: number;
    stdout?: string;
    stderr?: string;
    attachments?: TestAttachment[];
}
interface TestAttachment {
    name: string;
    contentType: string;
    path?: string;
    body?: Buffer;
}
interface CircuitBreakerConfig {
    /** Maximum refinement attempts before giving up */
    maxAttempts: number;
    /** Stop if same error fingerprint repeats this many times */
    sameErrorThreshold: number;
    /** Detect oscillation: A→B→A error pattern */
    oscillationDetection: boolean;
    /** Window size for oscillation detection */
    oscillationWindowSize: number;
    /** Maximum time for all refinement attempts (ms) */
    totalTimeoutMs: number;
    /** Time between refinement attempts (ms) - for rate limiting */
    cooldownMs: number;
    /** Maximum token budget for refinement */
    maxTokenBudget: number;
}
interface CircuitBreakerState {
    isOpen: boolean;
    openReason?: 'MAX_ATTEMPTS' | 'SAME_ERROR' | 'OSCILLATION' | 'TIMEOUT' | 'BUDGET_EXCEEDED';
    attemptCount: number;
    errorHistory: string[];
    startTime?: Date;
    tokensUsed: number;
    /** Max attempts config (for state restoration) */
    maxAttempts?: number;
}
interface ConvergenceInfo {
    converged: boolean;
    attempts: number;
    errorCountHistory: number[];
    uniqueErrorsHistory: Set<string>[];
    lastImprovement?: number;
    stagnationCount: number;
    trend: 'improving' | 'stagnating' | 'degrading' | 'oscillating';
}
interface RefinementSession {
    sessionId: string;
    journeyId: string;
    testFile: string;
    startTime: Date;
    endTime?: Date;
    originalCode: string;
    currentCode: string;
    attempts: FixAttempt[];
    circuitBreakerState: CircuitBreakerState;
    convergenceInfo: ConvergenceInfo;
    finalStatus: RefinementStatus;
    totalTokenUsage: TokenUsage;
}
type RefinementStatus = 'SUCCESS' | 'PARTIAL_SUCCESS' | 'MAX_ATTEMPTS_REACHED' | 'SAME_ERROR_LOOP' | 'OSCILLATION_DETECTED' | 'TIMEOUT' | 'BUDGET_EXCEEDED' | 'CANNOT_FIX' | 'ABORTED';
interface RefinementResult {
    success: boolean;
    session: RefinementSession;
    fixedCode?: string;
    remainingErrors: ErrorAnalysis[];
    appliedFixes: CodeFix[];
    /** Lessons learned for LLKB */
    lessonsLearned: LessonLearned[];
    /** Diagnostics for dead-end reporting */
    diagnostics: RefinementDiagnostics;
}
interface RefinementDiagnostics {
    attempts: number;
    lastError: string;
    convergenceFailure: boolean;
    sameErrorRepeated: boolean;
    oscillationDetected: boolean;
    budgetExhausted: boolean;
    timedOut: boolean;
}
interface LessonLearned {
    id: string;
    type: 'selector_pattern' | 'error_fix' | 'wait_strategy' | 'flow_pattern';
    context: {
        journeyId: string;
        errorCategory: ErrorCategory;
        originalSelector?: string;
        element?: string;
    };
    solution: {
        pattern: string;
        code: string;
        explanation: string;
    };
    confidence: number;
    createdAt: Date;
    verified: boolean;
}

/**
 * @module refinement/error-parser
 * @description Parse and categorize Playwright test errors
 */

interface ParseErrorOptions {
    testFile?: string;
    testName?: string;
    includeStackTrace?: boolean;
}
/**
 * Parse a raw error string into structured ErrorAnalysis
 */
declare function parseError(errorText: string, options?: ParseErrorOptions): ErrorAnalysis;
/**
 * Parse multiple errors from test output
 */
declare function parseErrors(testOutput: string, options?: ParseErrorOptions): ErrorAnalysis[];
interface PlaywrightJsonReport {
    suites?: PlaywrightSuite[];
    stats?: {
        total?: number;
        passed?: number;
        failed?: number;
        skipped?: number;
        duration?: number;
    };
}
interface PlaywrightSuite {
    title: string;
    file?: string;
    specs?: PlaywrightSpec[];
    suites?: PlaywrightSuite[];
}
interface PlaywrightSpec {
    title: string;
    tests?: PlaywrightTest[];
}
interface PlaywrightTest {
    title: string;
    status: string;
    duration: number;
    results?: PlaywrightTestRun[];
}
interface PlaywrightTestRun {
    status: string;
    duration: number;
    error?: {
        message?: string;
        stack?: string;
    };
    stdout?: string[];
    stderr?: string[];
    attachments?: Array<{
        name: string;
        contentType: string;
        path?: string;
    }>;
}
/**
 * Parse Playwright JSON report into structured test results
 */
declare function parsePlaywrightReport(report: PlaywrightJsonReport): PlaywrightTestResult[];
/**
 * Check if error is likely fixable by selector change
 */
declare function isSelectorRelated(error: ErrorAnalysis): boolean;
/**
 * Check if error is likely fixable by adding waits
 */
declare function isTimingRelated(error: ErrorAnalysis): boolean;
/**
 * Check if error is likely an environmental issue (not code-fixable)
 */
declare function isEnvironmentalError(error: ErrorAnalysis): boolean;
/**
 * Check if error is a syntax/type error requiring code fix
 */
declare function isCodeError(error: ErrorAnalysis): boolean;
/**
 * Get suggested fix types for an error category
 */
declare function getSuggestedFixTypes(category: ErrorCategory): string[];

/**
 * @module refinement/convergence-detector
 * @description Circuit breaker and convergence detection for refinement loops
 */

declare const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig;
interface CircuitBreakerOptions extends Partial<CircuitBreakerConfig> {
    /** Optional initial state for restoration from saved state */
    initialState?: CircuitBreakerState;
}
declare class CircuitBreaker {
    private config;
    private state;
    constructor(options?: CircuitBreakerOptions);
    private createInitialState;
    /**
     * Restore state from a saved CircuitBreakerState
     * This allows the circuit breaker to continue from a previous session
     * without double-counting attempts
     */
    private restoreState;
    /**
     * Reset the circuit breaker to initial state
     */
    reset(): void;
    /**
     * Get current state
     */
    getState(): CircuitBreakerState;
    /**
     * Record an attempt and check if circuit should open
     */
    recordAttempt(errors: ErrorAnalysis[], tokenUsage?: TokenUsage): CircuitBreakerState;
    /**
     * Check if we can make another attempt
     */
    canAttempt(): boolean;
    /**
     * Get remaining attempts
     */
    remainingAttempts(): number;
    /**
     * Get remaining token budget
     */
    remainingTokenBudget(): number;
    /**
     * Estimate if operation would exceed budget
     */
    wouldExceedBudget(estimatedTokens: number): boolean;
    private checkMaxAttempts;
    private checkSameError;
    private checkOscillation;
    private checkTimeout;
    private checkBudget;
    private openCircuit;
}
declare class ConvergenceDetector {
    private errorCountHistory;
    private uniqueErrorsHistory;
    private lastImprovement;
    private stagnationCount;
    /**
     * Record errors from an attempt
     */
    recordAttempt(errors: ErrorAnalysis[]): void;
    /**
     * Get convergence information
     */
    getInfo(): ConvergenceInfo;
    /**
     * Check if we've converged (no errors)
     */
    isConverged(): boolean;
    /**
     * Detect the trend in error counts
     */
    detectTrend(): ConvergenceInfo['trend'];
    /**
     * Check if error counts are oscillating
     */
    private isOscillating;
    /**
     * Calculate improvement percentage
     */
    getImprovementPercentage(): number;
    /**
     * Get new errors introduced in last attempt (not in previous)
     */
    getNewErrors(): Set<string>;
    /**
     * Get errors fixed in last attempt (in previous but not current)
     */
    getFixedErrors(): Set<string>;
    /**
     * Reset the detector
     */
    reset(): void;
    /**
     * Restore detector state from saved error count history
     * This allows the detector to continue from a previous session
     * without losing context about convergence trends
     */
    restoreFromHistory(savedErrorCounts: number[]): void;
    /**
     * Get the error count history for serialization
     */
    getErrorCountHistory(): number[];
}
interface RefinementAnalysis {
    shouldContinue: boolean;
    reason: string;
    circuitBreaker: CircuitBreakerState;
    convergence: ConvergenceInfo;
    recommendation: 'continue' | 'stop' | 'escalate';
}
/**
 * Analyze refinement progress and decide whether to continue
 */
declare function analyzeRefinementProgress(_attempts: FixAttempt[], circuitBreaker: CircuitBreaker, convergenceDetector: ConvergenceDetector): RefinementAnalysis;

/**
 * @module refinement/refinement-loop
 * @description Main orchestrator for self-refinement of generated tests
 */

interface RefinementLLMClient {
    generateFix(_code: string, _errors: ErrorAnalysis[], _previousAttempts: FixAttempt[], _options: FixGenerationOptions): Promise<FixGenerationResult>;
}
interface FixGenerationOptions {
    maxTokens: number;
    temperature: number;
    systemPrompt: string;
}
interface FixGenerationResult {
    fixes: CodeFix[];
    tokenUsage: TokenUsage;
    reasoning?: string;
}
interface TestRunner {
    runTest(_testFile: string, _testCode: string): Promise<PlaywrightTestResult>;
}
interface RefinementOptions {
    config: RefinementConfig;
    llmClient: RefinementLLMClient;
    testRunner: TestRunner;
    costTracker?: CostTracker;
    circuitBreakerConfig?: Partial<CircuitBreakerConfig>;
    onAttemptComplete?: (_attempt: FixAttempt) => void;
    onProgressUpdate?: (_progress: RefinementProgress) => void;
}
interface RefinementProgress {
    attemptNumber: number;
    maxAttempts: number;
    currentErrorCount: number;
    originalErrorCount: number;
    trend: string;
    status: 'running' | 'success' | 'failed';
}
declare function runRefinementLoop(journeyId: string, testFile: string, originalCode: string, initialErrors: ErrorAnalysis[], options: RefinementOptions): Promise<RefinementResult>;
/**
 * Run a single refinement attempt (for testing or manual control)
 */
declare function runSingleRefinementAttempt(code: string, errors: ErrorAnalysis[], llmClient: RefinementLLMClient, options?: {
    maxTokens?: number;
    temperature?: number;
}): Promise<Result<{
    fixes: CodeFix[];
    reasoning?: string;
}, string>>;

/**
 * @module refinement/llkb-learning
 * @description Record successful fixes to LLKB for future learning
 */

interface LLKBStorage {
    saveLessons(_lessons: LessonLearned[]): Promise<void>;
    getLessons(_filter: LessonFilter): Promise<LessonLearned[]>;
    updateLessonConfidence(_lessonId: string, _newConfidence: number): Promise<void>;
    markLessonAsVerified(_lessonId: string, _verified: boolean): Promise<void>;
}
interface LessonFilter {
    journeyId?: string;
    errorCategory?: ErrorCategory;
    type?: LessonLearned['type'];
    minConfidence?: number;
    verified?: boolean;
}
interface LessonExtractionOptions {
    minConfidence: number;
    includeUnverified: boolean;
    maxLessonsPerSession: number;
}
/**
 * Extract lessons from a completed refinement session
 */
declare function extractLessonsFromSession(session: RefinementSession, options?: Partial<LessonExtractionOptions>): LessonLearned[];
interface AggregatedPattern {
    pattern: string;
    occurrences: number;
    averageConfidence: number;
    contexts: string[];
    representativeCode: string;
}
/**
 * Aggregate similar lessons into patterns
 */
declare function aggregateLessons(lessons: LessonLearned[]): AggregatedPattern[];
interface ConfidenceAdjustment {
    lessonId: string;
    oldConfidence: number;
    newConfidence: number;
    reason: 'success' | 'failure' | 'decay';
}
/**
 * Calculate confidence adjustment based on outcome
 */
declare function calculateConfidenceAdjustment(lesson: LessonLearned, outcome: 'success' | 'failure', currentUsageCount: number): ConfidenceAdjustment;
/**
 * Apply time-based decay to confidence scores
 */
declare function applyConfidenceDecay(lessons: LessonLearned[], decayRate?: number, referenceDate?: Date): ConfidenceAdjustment[];
interface LessonRecommendation {
    lesson: LessonLearned;
    relevanceScore: number;
    applicabilityReason: string;
}
/**
 * Recommend lessons that might help fix given errors
 */
declare function recommendLessons(errors: ErrorAnalysis[], availableLessons: LessonLearned[], maxRecommendations?: number): LessonRecommendation[];

interface LlkbLesson {
    id: string;
    type: LessonType;
    pattern: string;
    context: LessonContext;
    fix: LessonFix;
    confidence: number;
    successCount: number;
    failureCount: number;
    createdAt: string;
    lastUsedAt?: string;
    lastSuccessAt?: string;
}
type LessonType = 'selector' | 'timing' | 'assertion' | 'navigation' | 'form' | 'error-fix';
interface LessonContext {
    errorType?: string;
    errorMessage?: string;
    stepType?: string;
    pageContext?: string;
    componentType?: string;
}
interface LessonFix {
    type: 'replace' | 'insert' | 'wrap' | 'config';
    pattern: string;
    replacement: string;
    explanation: string;
}
interface LlkbStore {
    version: '1.0';
    lessons: LlkbLesson[];
    stats: LlkbStats;
    lastUpdated: string;
}
interface LlkbStats {
    totalLessons: number;
    lessonsByType: Record<LessonType, number>;
    avgConfidence: number;
    totalApplications: number;
    successRate: number;
}
/**
 * Get the path to the LLKB refinement lessons file
 */
declare function getLlkbRefinementPath(): string;
/**
 * Load the LLKB store from disk
 */
declare function loadLlkbStore(): LlkbStore;
/**
 * Save the LLKB store to disk
 */
declare function saveLlkbStore(store: LlkbStore): void;
/**
 * Find an existing lesson by type and pattern
 */
declare function findLesson(store: LlkbStore, type: LessonType, pattern: string): LlkbLesson | undefined;
/**
 * Find lessons matching a context
 */
declare function findLessonsForContext(store: LlkbStore, context: Partial<LessonContext>, minConfidence?: number): LlkbLesson[];
/**
 * Add or update a lesson
 */
declare function addLesson(store: LlkbStore, type: LessonType, pattern: string, context: LessonContext, fix: LessonFix, initialConfidence?: number): LlkbLesson;
/**
 * Record a successful application of a lesson
 */
declare function recordSuccess(store: LlkbStore, lessonId: string): void;
/**
 * Record a failed application of a lesson
 */
declare function recordFailure(store: LlkbStore, lessonId: string): void;
/**
 * Remove low-confidence lessons
 */
declare function pruneLessons(store: LlkbStore, minConfidence?: number, minApplications?: number): number;
/**
 * Learn from a successful refinement
 */
declare function learnFromRefinement(errorType: string, errorMessage: string, originalCode: string, fixedCode: string, stepType?: string): LlkbLesson;
/**
 * Get suggested fixes for an error
 */
declare function getSuggestedFixes(errorType: string, errorMessage: string, stepType?: string): LlkbLesson[];
/**
 * Apply a learned fix and record result
 */
declare function applyLearnedFix(lessonId: string, success: boolean): void;
/**
 * Export lessons as JSON for the orchestrating LLM
 */
declare function exportLessonsForOrchestrator(): {
    lessons: LlkbLesson[];
    stats: LlkbStats;
    exportedAt: string;
};

interface PlaywrightRunOptions {
    /** Test file(s) to run */
    testFiles: string[];
    /** Working directory (default: harness root) */
    cwd?: string;
    /** Timeout per test in ms (default: 30000) */
    timeout?: number;
    /** Number of retries (default: 0) */
    retries?: number;
    /** Run in headed mode */
    headed?: boolean;
    /** Run in debug mode (pause on failure) */
    debug?: boolean;
    /** Custom reporter (default: list) */
    reporter?: string;
    /** Additional Playwright args */
    extraArgs?: string[];
    /** Environment variables */
    env?: Record<string, string>;
    /** Grep filter for test names */
    grep?: string;
    /** Project to run */
    project?: string;
    /** Number of workers (default: 1 for sequential) */
    workers?: number;
}
interface PlaywrightRunResult {
    /** Overall status */
    status: 'passed' | 'failed' | 'timeout' | 'error';
    /** Exit code from Playwright */
    exitCode: number;
    /** Total duration in ms */
    duration: number;
    /** Test counts */
    counts: {
        total: number;
        passed: number;
        failed: number;
        skipped: number;
        flaky: number;
    };
    /** Parsed test failures */
    failures: TestFailure[];
    /** Raw stdout */
    stdout: string;
    /** Raw stderr */
    stderr: string;
    /** Path to generated report (if any) */
    reportPath?: string;
    /** Path to trace file (if any) */
    tracePath?: string;
}
interface TestFailure {
    /** Test title */
    title: string;
    /** Full test path */
    fullTitle: string;
    /** File path */
    file: string;
    /** Line number */
    line?: number;
    /** Error message */
    error: string;
    /** Error type classification */
    errorType: ErrorType;
    /** Stack trace excerpt */
    stack?: string;
    /** Duration of failed test */
    duration?: number;
    /** Retry count when failed */
    retryCount?: number;
}
type ErrorType = 'selector' | 'timeout' | 'assertion' | 'navigation' | 'typescript' | 'network' | 'unknown';
/**
 * Run Playwright tests and return structured results
 *
 * Uses JSON reporter for reliable parsing, with stdout/stderr regex as fallback.
 */
declare function runPlaywright(options: PlaywrightRunOptions): Promise<PlaywrightRunResult>;
/**
 * Run a single test file and return results
 */
declare function runSingleTest(testFile: string, options?: Omit<PlaywrightRunOptions, 'testFiles'>): Promise<PlaywrightRunResult>;
/**
 * Quick check if a test passes (minimal output)
 */
declare function quickCheck(testFile: string, cwd?: string): Promise<boolean>;
/**
 * Format failures for display
 */
declare function formatFailures(failures: TestFailure[]): string;
/**
 * Get summary string
 */
declare function formatSummary(result: PlaywrightRunResult): string;

/**
 * @module refinement
 * @description Self-Refinement strategy for iterative test fixing
 */

type index$1_AggregatedPattern = AggregatedPattern;
type index$1_CircuitBreaker = CircuitBreaker;
declare const index$1_CircuitBreaker: typeof CircuitBreaker;
type index$1_CircuitBreakerConfig = CircuitBreakerConfig;
type index$1_CircuitBreakerState = CircuitBreakerState;
type index$1_CodeFix = CodeFix;
type index$1_ConfidenceAdjustment = ConfidenceAdjustment;
type index$1_ConvergenceDetector = ConvergenceDetector;
declare const index$1_ConvergenceDetector: typeof ConvergenceDetector;
type index$1_ConvergenceInfo = ConvergenceInfo;
declare const index$1_DEFAULT_CIRCUIT_BREAKER_CONFIG: typeof DEFAULT_CIRCUIT_BREAKER_CONFIG;
type index$1_ErrorAnalysis = ErrorAnalysis;
type index$1_ErrorCategory = ErrorCategory;
type index$1_ErrorLocation = ErrorLocation;
type index$1_ErrorSeverity = ErrorSeverity;
type index$1_ErrorType = ErrorType;
type index$1_FixAttempt = FixAttempt;
type index$1_FixGenerationOptions = FixGenerationOptions;
type index$1_FixGenerationResult = FixGenerationResult;
type index$1_FixType = FixType;
type index$1_LLKBStorage = LLKBStorage;
type index$1_LessonContext = LessonContext;
type index$1_LessonExtractionOptions = LessonExtractionOptions;
type index$1_LessonFilter = LessonFilter;
type index$1_LessonFix = LessonFix;
type index$1_LessonLearned = LessonLearned;
type index$1_LessonRecommendation = LessonRecommendation;
type index$1_LessonType = LessonType;
type index$1_LlkbLesson = LlkbLesson;
type index$1_LlkbStats = LlkbStats;
type index$1_LlkbStore = LlkbStore;
type index$1_ParseErrorOptions = ParseErrorOptions;
type index$1_PlaywrightJsonReport = PlaywrightJsonReport;
type index$1_PlaywrightRunOptions = PlaywrightRunOptions;
type index$1_PlaywrightRunResult = PlaywrightRunResult;
type index$1_PlaywrightTestResult = PlaywrightTestResult;
type index$1_RefinementAnalysis = RefinementAnalysis;
type index$1_RefinementConfig = RefinementConfig;
type index$1_RefinementDiagnostics = RefinementDiagnostics;
type index$1_RefinementLLMClient = RefinementLLMClient;
type index$1_RefinementOptions = RefinementOptions;
type index$1_RefinementProgress = RefinementProgress;
type index$1_RefinementResult = RefinementResult;
type index$1_RefinementSession = RefinementSession;
type index$1_RefinementStatus = RefinementStatus;
type index$1_TestAttachment = TestAttachment;
type index$1_TestFailure = TestFailure;
type index$1_TestRunner = TestRunner;
type index$1_TestStatus = TestStatus;
declare const index$1_addLesson: typeof addLesson;
declare const index$1_aggregateLessons: typeof aggregateLessons;
declare const index$1_analyzeRefinementProgress: typeof analyzeRefinementProgress;
declare const index$1_applyConfidenceDecay: typeof applyConfidenceDecay;
declare const index$1_applyLearnedFix: typeof applyLearnedFix;
declare const index$1_calculateConfidenceAdjustment: typeof calculateConfidenceAdjustment;
declare const index$1_exportLessonsForOrchestrator: typeof exportLessonsForOrchestrator;
declare const index$1_extractLessonsFromSession: typeof extractLessonsFromSession;
declare const index$1_findLesson: typeof findLesson;
declare const index$1_findLessonsForContext: typeof findLessonsForContext;
declare const index$1_formatFailures: typeof formatFailures;
declare const index$1_formatSummary: typeof formatSummary;
declare const index$1_getLlkbRefinementPath: typeof getLlkbRefinementPath;
declare const index$1_getSuggestedFixTypes: typeof getSuggestedFixTypes;
declare const index$1_getSuggestedFixes: typeof getSuggestedFixes;
declare const index$1_isCodeError: typeof isCodeError;
declare const index$1_isEnvironmentalError: typeof isEnvironmentalError;
declare const index$1_isSelectorRelated: typeof isSelectorRelated;
declare const index$1_isTimingRelated: typeof isTimingRelated;
declare const index$1_learnFromRefinement: typeof learnFromRefinement;
declare const index$1_loadLlkbStore: typeof loadLlkbStore;
declare const index$1_parseError: typeof parseError;
declare const index$1_parseErrors: typeof parseErrors;
declare const index$1_parsePlaywrightReport: typeof parsePlaywrightReport;
declare const index$1_pruneLessons: typeof pruneLessons;
declare const index$1_quickCheck: typeof quickCheck;
declare const index$1_recommendLessons: typeof recommendLessons;
declare const index$1_recordFailure: typeof recordFailure;
declare const index$1_recordSuccess: typeof recordSuccess;
declare const index$1_runPlaywright: typeof runPlaywright;
declare const index$1_runRefinementLoop: typeof runRefinementLoop;
declare const index$1_runSingleRefinementAttempt: typeof runSingleRefinementAttempt;
declare const index$1_runSingleTest: typeof runSingleTest;
declare const index$1_saveLlkbStore: typeof saveLlkbStore;
declare namespace index$1 {
  export { type index$1_AggregatedPattern as AggregatedPattern, index$1_CircuitBreaker as CircuitBreaker, type index$1_CircuitBreakerConfig as CircuitBreakerConfig, type index$1_CircuitBreakerState as CircuitBreakerState, type index$1_CodeFix as CodeFix, type index$1_ConfidenceAdjustment as ConfidenceAdjustment, index$1_ConvergenceDetector as ConvergenceDetector, type index$1_ConvergenceInfo as ConvergenceInfo, index$1_DEFAULT_CIRCUIT_BREAKER_CONFIG as DEFAULT_CIRCUIT_BREAKER_CONFIG, type index$1_ErrorAnalysis as ErrorAnalysis, type index$1_ErrorCategory as ErrorCategory, type index$1_ErrorLocation as ErrorLocation, type index$1_ErrorSeverity as ErrorSeverity, type index$1_ErrorType as ErrorType, type index$1_FixAttempt as FixAttempt, type index$1_FixGenerationOptions as FixGenerationOptions, type index$1_FixGenerationResult as FixGenerationResult, type index$1_FixType as FixType, type index$1_LLKBStorage as LLKBStorage, type index$1_LessonContext as LessonContext, type index$1_LessonExtractionOptions as LessonExtractionOptions, type index$1_LessonFilter as LessonFilter, type index$1_LessonFix as LessonFix, type index$1_LessonLearned as LessonLearned, type index$1_LessonRecommendation as LessonRecommendation, type index$1_LessonType as LessonType, type index$1_LlkbLesson as LlkbLesson, type index$1_LlkbStats as LlkbStats, type index$1_LlkbStore as LlkbStore, type index$1_ParseErrorOptions as ParseErrorOptions, type index$1_PlaywrightJsonReport as PlaywrightJsonReport, type index$1_PlaywrightRunOptions as PlaywrightRunOptions, type index$1_PlaywrightRunResult as PlaywrightRunResult, type index$1_PlaywrightTestResult as PlaywrightTestResult, type index$1_RefinementAnalysis as RefinementAnalysis, type index$1_RefinementConfig as RefinementConfig, type index$1_RefinementDiagnostics as RefinementDiagnostics, type index$1_RefinementLLMClient as RefinementLLMClient, type index$1_RefinementOptions as RefinementOptions, type index$1_RefinementProgress as RefinementProgress, type index$1_RefinementResult as RefinementResult, type index$1_RefinementSession as RefinementSession, type index$1_RefinementStatus as RefinementStatus, type index$1_TestAttachment as TestAttachment, type index$1_TestFailure as TestFailure, type index$1_TestRunner as TestRunner, type index$1_TestStatus as TestStatus, index$1_addLesson as addLesson, index$1_aggregateLessons as aggregateLessons, index$1_analyzeRefinementProgress as analyzeRefinementProgress, index$1_applyConfidenceDecay as applyConfidenceDecay, index$1_applyLearnedFix as applyLearnedFix, index$1_calculateConfidenceAdjustment as calculateConfidenceAdjustment, index$1_exportLessonsForOrchestrator as exportLessonsForOrchestrator, index$1_extractLessonsFromSession as extractLessonsFromSession, index$1_findLesson as findLesson, index$1_findLessonsForContext as findLessonsForContext, index$1_formatFailures as formatFailures, index$1_formatSummary as formatSummary, index$1_getLlkbRefinementPath as getLlkbRefinementPath, index$1_getSuggestedFixTypes as getSuggestedFixTypes, index$1_getSuggestedFixes as getSuggestedFixes, index$1_isCodeError as isCodeError, index$1_isEnvironmentalError as isEnvironmentalError, index$1_isSelectorRelated as isSelectorRelated, index$1_isTimingRelated as isTimingRelated, index$1_learnFromRefinement as learnFromRefinement, index$1_loadLlkbStore as loadLlkbStore, index$1_parseError as parseError, index$1_parseErrors as parseErrors, index$1_parsePlaywrightReport as parsePlaywrightReport, index$1_pruneLessons as pruneLessons, index$1_quickCheck as quickCheck, index$1_recommendLessons as recommendLessons, index$1_recordFailure as recordFailure, index$1_recordSuccess as recordSuccess, index$1_runPlaywright as runPlaywright, index$1_runRefinementLoop as runRefinementLoop, index$1_runSingleRefinementAttempt as runSingleRefinementAttempt, index$1_runSingleTest as runSingleTest, index$1_saveLlkbStore as saveLlkbStore };
}

/**
 * @module uncertainty/types
 * @description Type definitions for Uncertainty Quantification strategy
 */

type ConfidenceDimension = 'syntax' | 'pattern' | 'selector' | 'agreement';
interface DimensionScore {
    dimension: ConfidenceDimension;
    score: number;
    weight: number;
    reasoning: string;
    subScores?: SubScore[];
}
interface SubScore {
    name: string;
    score: number;
    details?: string;
}
interface SyntaxValidationResult {
    valid: boolean;
    score: number;
    errors: SyntaxError[];
    warnings: SyntaxWarning[];
    typescript: TypeScriptValidation;
    playwright: PlaywrightValidation;
}
interface SyntaxError {
    line: number;
    column: number;
    message: string;
    code: string;
    severity: 'error' | 'warning';
}
interface SyntaxWarning {
    line: number;
    message: string;
    suggestion?: string;
}
interface TypeScriptValidation {
    compiles: boolean;
    errors: SyntaxError[];
    typeInferenceScore: number;
}
interface PlaywrightValidation {
    hasValidImports: boolean;
    usesTestFixtures: boolean;
    hasValidTestBlocks: boolean;
    apiUsageScore: number;
    deprecatedAPIs: string[];
}
interface PatternMatchResult {
    score: number;
    matchedPatterns: MatchedPattern[];
    unmatchedElements: UnmatchedElement[];
    noveltyScore: number;
    consistencyScore: number;
}
interface MatchedPattern {
    patternId: string;
    patternName: string;
    confidence: number;
    codeLocation: {
        startLine: number;
        endLine: number;
    };
    source: 'glossary' | 'llkb' | 'builtin' | 'inferred';
}
interface UnmatchedElement {
    element: string;
    reason: string;
    suggestedPatterns: string[];
    riskLevel: 'low' | 'medium' | 'high';
}
type SelectorStrategy = 'testId' | 'role' | 'text' | 'label' | 'placeholder' | 'title' | 'altText' | 'css' | 'xpath' | 'nth' | 'chain';
interface SelectorAnalysisResult {
    score: number;
    selectors: SelectorInfo[];
    strategyDistribution: Record<SelectorStrategy, number>;
    stabilityScore: number;
    accessibilityScore: number;
    recommendations: SelectorRecommendation[];
}
interface SelectorInfo {
    selector: string;
    strategy: SelectorStrategy;
    stabilityScore: number;
    specificity: number;
    hasTestId: boolean;
    usesRole: boolean;
    isFragile: boolean;
    fragilityReasons: string[];
    line: number;
}
interface SelectorRecommendation {
    selector: string;
    currentStrategy: SelectorStrategy;
    suggestedStrategy: SelectorStrategy;
    reason: string;
    priority: 'low' | 'medium' | 'high';
}
interface AgreementAnalysisResult {
    score: number;
    sampleCount: number;
    structuralAgreement: number;
    selectorAgreement: number;
    flowAgreement: number;
    assertionAgreement: number;
    consensusCode?: string;
    disagreementAreas: DisagreementArea[];
}
interface DisagreementArea {
    area: string;
    variants: string[];
    voteCounts: Record<string, number>;
    selectedVariant?: string;
    confidence: number;
}
interface CodeSample {
    id: string;
    code: string;
    temperature: number;
    tokenUsage?: TokenUsage;
}
interface ConfidenceScore {
    overall: number;
    dimensions: DimensionScore[];
    threshold: ConfidenceThreshold;
    verdict: ConfidenceVerdict;
    blockedDimensions: ConfidenceDimension[];
    diagnostics: ConfidenceDiagnostics;
}
type ConfidenceVerdict = 'ACCEPT' | 'REVIEW' | 'REJECT';
interface ConfidenceThreshold {
    overall: number;
    perDimension: Record<ConfidenceDimension, number>;
    blockOnAnyBelow: number;
}
interface ConfidenceDiagnostics {
    lowestDimension: {
        name: ConfidenceDimension;
        score: number;
    };
    highestDimension: {
        name: ConfidenceDimension;
        score: number;
    };
    improvementSuggestions: string[];
    riskAreas: string[];
}
interface ScoringOptions {
    weights: DimensionWeights;
    thresholds: ConfidenceThreshold;
    enableMultiSampling: boolean;
    sampleCount: number;
    sampleTemperatures: number[];
}
interface DimensionWeights {
    syntax: number;
    pattern: number;
    selector: number;
    agreement: number;
}
declare const DEFAULT_DIMENSION_WEIGHTS: DimensionWeights;
declare const DEFAULT_THRESHOLDS: ConfidenceThreshold;

/**
 * @module uncertainty/syntax-validator
 * @description Validate TypeScript and Playwright syntax
 */

/**
 * Validate syntax of generated Playwright test code
 */
declare function validateSyntax(code: string): SyntaxValidationResult;
/**
 * Create a dimension score from syntax validation
 */
declare function createSyntaxDimensionScore(result: SyntaxValidationResult): DimensionScore;
/**
 * Quick check if code has valid structure (no full validation)
 */
declare function quickSyntaxCheck(code: string): boolean;
/**
 * Get list of deprecated APIs used
 */
declare function getDeprecatedAPIs(code: string): Array<{
    api: string;
    suggestion: string;
}>;

/**
 * @module uncertainty/pattern-matcher
 * @description Match generated code against known patterns from LLKB/glossary
 */

interface PatternDefinition {
    id: string;
    name: string;
    category: PatternCategory;
    patterns: RegExp[];
    confidence: number;
    source: 'glossary' | 'llkb' | 'builtin';
}
type PatternCategory = 'navigation' | 'interaction' | 'assertion' | 'wait' | 'form' | 'authentication' | 'data' | 'utility';
interface PatternMatcherOptions {
    customPatterns?: PatternDefinition[];
    llkbPatterns?: PatternDefinition[];
    includeBuiltins?: boolean;
    minConfidence?: number;
}
/**
 * Match code against known patterns
 */
declare function matchPatterns(code: string, options?: PatternMatcherOptions): PatternMatchResult;
/**
 * Create a dimension score from pattern matching
 */
declare function createPatternDimensionScore(result: PatternMatchResult): DimensionScore;
/**
 * Get pattern categories used in code
 */
declare function getPatternCategories(matchedPatterns: MatchedPattern[]): Record<PatternCategory, number>;
/**
 * Check if code has minimum required patterns
 */
declare function hasMinimumPatterns(matchedPatterns: MatchedPattern[], requirements: Partial<Record<PatternCategory, number>>): boolean;
/**
 * Get all built-in patterns (for external use)
 */
declare function getBuiltinPatterns(): PatternDefinition[];

/**
 * @module uncertainty/selector-analyzer
 * @description Analyze selector quality and stability
 */

/**
 * Analyze selectors in generated code
 */
declare function analyzeSelectors(code: string): SelectorAnalysisResult;
/**
 * Create a dimension score from selector analysis
 */
declare function createSelectorDimensionScore(result: SelectorAnalysisResult): DimensionScore;
/**
 * Quick check if code uses recommended selector strategies
 */
declare function usesRecommendedSelectors(code: string): boolean;
/**
 * Get selector strategy from code snippet
 */
declare function identifyStrategy(selectorCode: string): SelectorStrategy;
/**
 * Check if selector is likely fragile
 */
declare function isSelectorFragile(selector: string): boolean;

/**
 * @module uncertainty/confidence-scorer
 * @description Multi-dimensional confidence scoring for generated code
 */

interface UncertaintyLLMClient {
    generateSample(_prompt: string, _systemPrompt: string, _temperature: number, _maxTokens: number): Promise<{
        code: string;
        tokenUsage: TokenUsage;
    }>;
}
interface ScorerOptions {
    config: UncertaintyConfig;
    llmClient?: UncertaintyLLMClient;
    costTracker?: CostTracker;
    customPatterns?: PatternDefinition[];
    llkbPatterns?: PatternDefinition[];
}
/**
 * Calculate confidence score for generated code
 */
declare function calculateConfidence(code: string, options: ScorerOptions): Promise<ConfidenceScore>;
/**
 * Calculate confidence with multiple samples
 */
declare function calculateConfidenceWithSamples(samples: CodeSample[], options: ScorerOptions): Promise<ConfidenceScore>;
/**
 * Quick confidence check (single dimension)
 */
declare function quickConfidenceCheck(code: string, dimension: ConfidenceDimension): number;
/**
 * Check if code passes minimum confidence
 */
declare function passesMinimumConfidence(code: string, minOverall?: number, minPerDimension?: number): boolean;
/**
 * Get blocking issues (reasons code would be rejected)
 */
declare function getBlockingIssues(code: string): string[];

interface MultiSamplerConfig {
    /** Number of samples to generate */
    sampleCount: number;
    /** Temperatures for each sample (length should match sampleCount) */
    temperatures: number[];
    /** Minimum agreement score to accept consensus */
    minAgreementScore: number;
    /** Whether to save samples to disk */
    persistSamples: boolean;
}
interface MultiSampleRequest {
    /** Prompt for code generation */
    prompt: string;
    /** Journey ID for tracking */
    journeyId: string;
    /** Configuration */
    config: MultiSamplerConfig;
}
interface MultiSampleResult {
    /** Generated samples */
    samples: CodeSample[];
    /** Agreement analysis */
    agreement: AgreementAnalysisResult;
    /** Best sample (highest agreement or first if no consensus) */
    bestSample: CodeSample;
    /** Total tokens used across all samples */
    totalTokenUsage: TokenUsage;
    /** Path to samples directory (if persisted) */
    samplesDir?: string;
}
interface CodeGenerator {
    /** Generate code from a prompt */
    generate(_prompt: string, _temperature: number): Promise<{
        code: string;
        tokenUsage: TokenUsage;
    }>;
}
declare const DEFAULT_MULTI_SAMPLER_CONFIG: MultiSamplerConfig;
/**
 * Analyze agreement across multiple samples
 */
declare function analyzeAgreement(samples: CodeSample[]): AgreementAnalysisResult;
/**
 * Generate multiple code samples and analyze agreement
 */
declare function generateMultipleSamples(request: MultiSampleRequest, generator: CodeGenerator): Promise<MultiSampleResult>;
/**
 * Load previously generated samples
 */
declare function loadSamples(journeyId: string): CodeSample[] | null;
/**
 * Output for orchestrator to generate multiple samples
 */
interface OrchestratorSampleRequest {
    /** The prompt to use */
    prompt: string;
    /** Journey ID */
    journeyId: string;
    /** Temperatures to sample at */
    temperatures: number[];
    /** Instructions for the orchestrator */
    instructions: string;
}
/**
 * Generate instructions for orchestrator to create multiple samples
 */
declare function createOrchestratorSampleRequest(prompt: string, journeyId: string, config?: MultiSamplerConfig): OrchestratorSampleRequest;
/**
 * Process orchestrator-provided samples
 */
declare function processOrchestratorSamples(samples: Array<{
    code: string;
    temperature: number;
}>, _journeyId: string): MultiSampleResult;

/**
 * @module uncertainty
 * @description Uncertainty Quantification strategy for confidence scoring
 */

type index_AgreementAnalysisResult = AgreementAnalysisResult;
type index_CodeGenerator = CodeGenerator;
type index_CodeSample = CodeSample;
type index_ConfidenceDiagnostics = ConfidenceDiagnostics;
type index_ConfidenceDimension = ConfidenceDimension;
type index_ConfidenceScore = ConfidenceScore;
type index_ConfidenceThreshold = ConfidenceThreshold;
type index_ConfidenceVerdict = ConfidenceVerdict;
declare const index_DEFAULT_DIMENSION_WEIGHTS: typeof DEFAULT_DIMENSION_WEIGHTS;
declare const index_DEFAULT_MULTI_SAMPLER_CONFIG: typeof DEFAULT_MULTI_SAMPLER_CONFIG;
declare const index_DEFAULT_THRESHOLDS: typeof DEFAULT_THRESHOLDS;
type index_DimensionScore = DimensionScore;
type index_DimensionWeights = DimensionWeights;
type index_DisagreementArea = DisagreementArea;
type index_MatchedPattern = MatchedPattern;
type index_MultiSampleRequest = MultiSampleRequest;
type index_MultiSampleResult = MultiSampleResult;
type index_MultiSamplerConfig = MultiSamplerConfig;
type index_OrchestratorSampleRequest = OrchestratorSampleRequest;
type index_PatternCategory = PatternCategory;
type index_PatternDefinition = PatternDefinition;
type index_PatternMatchResult = PatternMatchResult;
type index_PatternMatcherOptions = PatternMatcherOptions;
type index_PlaywrightValidation = PlaywrightValidation;
type index_ScorerOptions = ScorerOptions;
type index_ScoringOptions = ScoringOptions;
type index_SelectorAnalysisResult = SelectorAnalysisResult;
type index_SelectorInfo = SelectorInfo;
type index_SelectorRecommendation = SelectorRecommendation;
type index_SelectorStrategy = SelectorStrategy;
type index_SubScore = SubScore;
type index_SyntaxError = SyntaxError;
type index_SyntaxValidationResult = SyntaxValidationResult;
type index_SyntaxWarning = SyntaxWarning;
type index_TypeScriptValidation = TypeScriptValidation;
type index_UncertaintyConfig = UncertaintyConfig;
type index_UncertaintyLLMClient = UncertaintyLLMClient;
type index_UnmatchedElement = UnmatchedElement;
declare const index_analyzeAgreement: typeof analyzeAgreement;
declare const index_analyzeSelectors: typeof analyzeSelectors;
declare const index_calculateConfidence: typeof calculateConfidence;
declare const index_calculateConfidenceWithSamples: typeof calculateConfidenceWithSamples;
declare const index_createOrchestratorSampleRequest: typeof createOrchestratorSampleRequest;
declare const index_createPatternDimensionScore: typeof createPatternDimensionScore;
declare const index_createSelectorDimensionScore: typeof createSelectorDimensionScore;
declare const index_createSyntaxDimensionScore: typeof createSyntaxDimensionScore;
declare const index_generateMultipleSamples: typeof generateMultipleSamples;
declare const index_getBlockingIssues: typeof getBlockingIssues;
declare const index_getBuiltinPatterns: typeof getBuiltinPatterns;
declare const index_getDeprecatedAPIs: typeof getDeprecatedAPIs;
declare const index_getPatternCategories: typeof getPatternCategories;
declare const index_hasMinimumPatterns: typeof hasMinimumPatterns;
declare const index_identifyStrategy: typeof identifyStrategy;
declare const index_isSelectorFragile: typeof isSelectorFragile;
declare const index_loadSamples: typeof loadSamples;
declare const index_matchPatterns: typeof matchPatterns;
declare const index_passesMinimumConfidence: typeof passesMinimumConfidence;
declare const index_processOrchestratorSamples: typeof processOrchestratorSamples;
declare const index_quickConfidenceCheck: typeof quickConfidenceCheck;
declare const index_quickSyntaxCheck: typeof quickSyntaxCheck;
declare const index_usesRecommendedSelectors: typeof usesRecommendedSelectors;
declare const index_validateSyntax: typeof validateSyntax;
declare namespace index {
  export { type index_AgreementAnalysisResult as AgreementAnalysisResult, type index_CodeGenerator as CodeGenerator, type index_CodeSample as CodeSample, type index_ConfidenceDiagnostics as ConfidenceDiagnostics, type index_ConfidenceDimension as ConfidenceDimension, type index_ConfidenceScore as ConfidenceScore, type index_ConfidenceThreshold as ConfidenceThreshold, type index_ConfidenceVerdict as ConfidenceVerdict, index_DEFAULT_DIMENSION_WEIGHTS as DEFAULT_DIMENSION_WEIGHTS, index_DEFAULT_MULTI_SAMPLER_CONFIG as DEFAULT_MULTI_SAMPLER_CONFIG, index_DEFAULT_THRESHOLDS as DEFAULT_THRESHOLDS, type index_DimensionScore as DimensionScore, type index_DimensionWeights as DimensionWeights, type index_DisagreementArea as DisagreementArea, type index_MatchedPattern as MatchedPattern, type index_MultiSampleRequest as MultiSampleRequest, type index_MultiSampleResult as MultiSampleResult, type index_MultiSamplerConfig as MultiSamplerConfig, type index_OrchestratorSampleRequest as OrchestratorSampleRequest, type index_PatternCategory as PatternCategory, type index_PatternDefinition as PatternDefinition, type index_PatternMatchResult as PatternMatchResult, type index_PatternMatcherOptions as PatternMatcherOptions, type index_PlaywrightValidation as PlaywrightValidation, type index_ScorerOptions as ScorerOptions, type index_ScoringOptions as ScoringOptions, type index_SelectorAnalysisResult as SelectorAnalysisResult, type index_SelectorInfo as SelectorInfo, type index_SelectorRecommendation as SelectorRecommendation, type index_SelectorStrategy as SelectorStrategy, type index_SubScore as SubScore, type index_SyntaxError as SyntaxError, type index_SyntaxValidationResult as SyntaxValidationResult, type index_SyntaxWarning as SyntaxWarning, type index_TypeScriptValidation as TypeScriptValidation, type index_UncertaintyConfig as UncertaintyConfig, type index_UncertaintyLLMClient as UncertaintyLLMClient, type index_UnmatchedElement as UnmatchedElement, index_analyzeAgreement as analyzeAgreement, index_analyzeSelectors as analyzeSelectors, index_calculateConfidence as calculateConfidence, index_calculateConfidenceWithSamples as calculateConfidenceWithSamples, index_createOrchestratorSampleRequest as createOrchestratorSampleRequest, index_createPatternDimensionScore as createPatternDimensionScore, index_createSelectorDimensionScore as createSelectorDimensionScore, index_createSyntaxDimensionScore as createSyntaxDimensionScore, index_generateMultipleSamples as generateMultipleSamples, index_getBlockingIssues as getBlockingIssues, index_getBuiltinPatterns as getBuiltinPatterns, index_getDeprecatedAPIs as getDeprecatedAPIs, index_getPatternCategories as getPatternCategories, index_hasMinimumPatterns as hasMinimumPatterns, index_identifyStrategy as identifyStrategy, index_isSelectorFragile as isSelectorFragile, index_loadSamples as loadSamples, index_matchPatterns as matchPatterns, index_passesMinimumConfidence as passesMinimumConfidence, index_processOrchestratorSamples as processOrchestratorSamples, index_quickConfidenceCheck as quickConfidenceCheck, index_quickSyntaxCheck as quickSyntaxCheck, index_usesRecommendedSelectors as usesRecommendedSelectors, index_validateSyntax as validateSyntax };
}

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

export { type AutogenArtifact, AutogenConfig, BLOCK_END, BLOCK_ID_PATTERN, BLOCK_START, type BehaviorHints, type BlockExtractionResult, type BlockWarning, type CSSDebtEntry, CSSDebtEntrySchema, CodeValidationOptions, CodeValidationResult, type ComponentEntry, ComponentEntrySchema, type DebtReportSummary, type ExtractedHints, type GenerateJourneyTestsOptions, type GenerateJourneyTestsResult, GenerateModuleOptions, GenerateModuleResult, GenerateTestOptions, GenerateTestResult, type GeneratedHeaderOptions, HINTS_SECTION_PATTERN, HINT_BLOCK_PATTERN, HINT_PATTERNS, type HintType, IRJourney, type InjectBlocksOptions, type InstallOptions, type InstallResult, type LocatorHints, type MachineHint, type ManagedBlock, type MigrationPlan, type PageEntry, PageEntrySchema, type ParsedHints, RunnerOptions, type ScannerOptions, type ScannerResult, type SelectorCatalog, SelectorCatalogSchema, type SelectorEntry, SelectorEntrySchema, type UpgradeChange, type UpgradeOptions, type UpgradeResult, VALID_ROLES, VERSION, type ValidateJourneyOptions, type ValidateJourneyResult, type VerifyJourneyOptions, type VerifyJourneyResult, VerifySummary, addSelector, cleanAutogenArtifacts, clearDebt, containsHints, createEmptyCatalog, index$3 as enhancementShared, ensureAutogenDir, escapeRegex, escapeSelector, escapeString, extractHintValue, extractHints, extractManagedBlocks, findByComponent, findByPage, findByTestId, findSelectorById, generateDebtMarkdown, generateDebtReport, generateFileHeader, generateJourneyTests, generateLocatorFromHints, generateMigrationPlan, generateModuleFromIR, generateTestFromIR, getAllTestIds, getArtkDir, getAutogenArtifact, getAutogenDir, getBrandingComment, getCSSDebt, getCatalog, getGeneratedTimestamp, getHarnessRoot, getLlkbRoot, getPackageRoot, getPackageVersion, getTemplatePath, getTemplatesDir, hasAutogenArtifacts, hasBehaviorHints, hasLocatorHints, hasTestId, injectManagedBlocks, installAutogenInstance, isValidRole, isVersionSupported, loadCatalog, mergeWithInferred, needsMigration, parseAndNormalize, parseBoolSafe, parseEnumSafe, parseFloatSafe, parseHints, parseIntSafe, parseIntSafeAllowNegative, parseModuleHint, parseWithValidator, quickScanTestIds, recordCSSDebt, index$1 as refinement, regenerateTestWithBlocks, removeDebt, removeHints, removeSelector, resetCatalogCache, saveCatalog, scanForTestIds, index$2 as scot, searchSelectors, suggestReplacement, suggestSelector, index as uncertainty, updateDebtPriority, upgradeAutogenInstance, validateCatalog, validateHints, validateJourney, validateJourneys, verifyJourney, verifyJourneys, wrapInBlock };
