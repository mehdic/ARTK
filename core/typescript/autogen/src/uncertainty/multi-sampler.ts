/**
 * @module uncertainty/multi-sampler
 * @description Multi-sampling for uncertainty quantification
 *
 * Generates multiple code samples at different temperatures and
 * analyzes agreement to quantify uncertainty.
 *
 * @see research/2026-02-02_autogen-enhancement-implementation-plan.md
 */
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  CodeSample,
  AgreementAnalysisResult,
  DisagreementArea,
} from './types.js';
import { getAutogenArtifact, ensureAutogenDir } from '../utils/paths.js';
import { TokenUsage } from '../shared/types.js';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface MultiSamplerConfig {
  /** Number of samples to generate */
  sampleCount: number;
  /** Temperatures for each sample (length should match sampleCount) */
  temperatures: number[];
  /** Minimum agreement score to accept consensus */
  minAgreementScore: number;
  /** Whether to save samples to disk */
  persistSamples: boolean;
}

export interface MultiSampleRequest {
  /** Prompt for code generation */
  prompt: string;
  /** Journey ID for tracking */
  journeyId: string;
  /** Configuration */
  config: MultiSamplerConfig;
}

export interface MultiSampleResult {
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

export interface CodeGenerator {
  /** Generate code from a prompt */
  generate(_prompt: string, _temperature: number): Promise<{
    code: string;
    tokenUsage: TokenUsage;
  }>;
}

export const DEFAULT_MULTI_SAMPLER_CONFIG: MultiSamplerConfig = {
  sampleCount: 3,
  temperatures: [0.2, 0.5, 0.8],
  minAgreementScore: 0.7,
  persistSamples: true,
};

// ═══════════════════════════════════════════════════════════════════════════
// CODE STRUCTURE ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

interface CodeStructure {
  imports: string[];
  testBlocks: string[];
  assertions: string[];
  selectors: string[];
  actions: string[];
}

/**
 * Extract structural elements from code
 */
function extractStructure(code: string): CodeStructure {
  const lines = code.split('\n');

  const imports: string[] = [];
  const testBlocks: string[] = [];
  const assertions: string[] = [];
  const selectors: string[] = [];
  const actions: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Imports
    if (trimmed.startsWith('import ')) {
      imports.push(trimmed);
    }

    // Test blocks
    if (trimmed.match(/^(test|it|describe)\s*\(/)) {
      const nameMatch = trimmed.match(/['"]([^'"]+)['"]/);
      if (nameMatch) {
        testBlocks.push(nameMatch[1]);
      }
    }

    // Assertions (expect statements)
    if (trimmed.includes('expect(') || trimmed.includes('.should')) {
      const assertMatch = trimmed.match(/expect\(([^)]+)\)|\.should\(([^)]+)\)/);
      if (assertMatch) {
        assertions.push(assertMatch[0]);
      }
    }

    // Selectors
    const selectorMatches = trimmed.matchAll(/(?:locator|getBy\w+)\(['"]([^'"]+)['"]\)/g);
    for (const match of selectorMatches) {
      selectors.push(match[1]);
    }

    // Actions
    if (trimmed.match(/\.(click|fill|type|press|check|uncheck|select|hover)\(/)) {
      actions.push(trimmed.substring(0, 100));
    }
  }

  return { imports, testBlocks, assertions, selectors, actions };
}

/**
 * Calculate similarity between two arrays
 */
function arraySimilarity(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const setA = new Set(a);
  const setB = new Set(b);

  const intersection = [...setA].filter(x => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;

  return intersection / union;
}

/**
 * Calculate structural agreement between two code samples
 */
function calculateStructuralAgreement(
  struct1: CodeStructure,
  struct2: CodeStructure
): number {
  const weights = {
    imports: 0.1,
    testBlocks: 0.2,
    assertions: 0.3,
    selectors: 0.25,
    actions: 0.15,
  };

  let score = 0;
  score += weights.imports * arraySimilarity(struct1.imports, struct2.imports);
  score += weights.testBlocks * arraySimilarity(struct1.testBlocks, struct2.testBlocks);
  score += weights.assertions * arraySimilarity(struct1.assertions, struct2.assertions);
  score += weights.selectors * arraySimilarity(struct1.selectors, struct2.selectors);
  score += weights.actions * arraySimilarity(struct1.actions, struct2.actions);

  return score;
}

// ═══════════════════════════════════════════════════════════════════════════
// AGREEMENT ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Find disagreement areas between samples
 */
function findDisagreements(structures: CodeStructure[]): DisagreementArea[] {
  const areas: DisagreementArea[] = [];

  // Check selectors disagreement
  const allSelectors = structures.flatMap(s => s.selectors);
  const selectorCounts = new Map<string, number>();
  for (const sel of allSelectors) {
    selectorCounts.set(sel, (selectorCounts.get(sel) || 0) + 1);
  }

  const uniqueSelectors = [...selectorCounts.entries()]
    .filter(([, count]) => count < structures.length)
    .map(([sel]) => sel);

  if (uniqueSelectors.length > 0) {
    const voteCounts: Record<string, number> = {};
    for (const [sel, count] of selectorCounts) {
      voteCounts[sel] = count;
    }
    areas.push({
      area: 'selectors',
      variants: uniqueSelectors,
      voteCounts,
      confidence: Math.max(...selectorCounts.values()) / structures.length,
    });
  }

  // Check assertions disagreement
  const allAssertions = structures.flatMap(s => s.assertions);
  const assertionCounts = new Map<string, number>();
  for (const a of allAssertions) {
    assertionCounts.set(a, (assertionCounts.get(a) || 0) + 1);
  }

  const uniqueAssertions = [...assertionCounts.entries()]
    .filter(([, count]) => count < structures.length)
    .map(([a]) => a);

  if (uniqueAssertions.length > 0) {
    const voteCounts: Record<string, number> = {};
    for (const [a, count] of assertionCounts) {
      voteCounts[a] = count;
    }
    areas.push({
      area: 'assertions',
      variants: uniqueAssertions,
      voteCounts,
      confidence: Math.max(...assertionCounts.values()) / structures.length,
    });
  }

  return areas;
}

/**
 * Analyze agreement across multiple samples
 */
export function analyzeAgreement(samples: CodeSample[]): AgreementAnalysisResult {
  if (samples.length === 0) {
    return {
      score: 0,
      sampleCount: 0,
      structuralAgreement: 0,
      selectorAgreement: 0,
      flowAgreement: 0,
      assertionAgreement: 0,
      disagreementAreas: [],
    };
  }

  if (samples.length === 1) {
    return {
      score: 1, // Single sample has perfect agreement with itself
      sampleCount: 1,
      structuralAgreement: 1,
      selectorAgreement: 1,
      flowAgreement: 1,
      assertionAgreement: 1,
      consensusCode: samples[0].code,
      disagreementAreas: [],
    };
  }

  // Extract structures
  const structures = samples.map(s => extractStructure(s.code));

  // Calculate pairwise agreements
  let totalStructural = 0;
  let totalSelector = 0;
  let totalAssertion = 0;
  let pairCount = 0;

  for (let i = 0; i < structures.length; i++) {
    for (let j = i + 1; j < structures.length; j++) {
      totalStructural += calculateStructuralAgreement(structures[i], structures[j]);
      totalSelector += arraySimilarity(structures[i].selectors, structures[j].selectors);
      totalAssertion += arraySimilarity(structures[i].assertions, structures[j].assertions);
      pairCount++;
    }
  }

  const structuralAgreement = totalStructural / pairCount;
  const selectorAgreement = totalSelector / pairCount;
  const assertionAgreement = totalAssertion / pairCount;

  // Flow agreement based on action sequence similarity
  let totalFlow = 0;
  for (let i = 0; i < structures.length; i++) {
    for (let j = i + 1; j < structures.length; j++) {
      totalFlow += arraySimilarity(structures[i].actions, structures[j].actions);
    }
  }
  const flowAgreement = totalFlow / pairCount;

  // Overall score (weighted)
  const score = (
    structuralAgreement * 0.3 +
    selectorAgreement * 0.3 +
    assertionAgreement * 0.25 +
    flowAgreement * 0.15
  );

  // Find disagreement areas
  const disagreementAreas = findDisagreements(structures);

  // Determine consensus code (sample with highest agreement to others)
  let bestSampleIndex = 0;
  let bestAvgAgreement = 0;

  for (let i = 0; i < samples.length; i++) {
    let avgAgreement = 0;
    for (let j = 0; j < samples.length; j++) {
      if (i !== j) {
        avgAgreement += calculateStructuralAgreement(structures[i], structures[j]);
      }
    }
    avgAgreement /= (samples.length - 1);
    if (avgAgreement > bestAvgAgreement) {
      bestAvgAgreement = avgAgreement;
      bestSampleIndex = i;
    }
  }

  return {
    score,
    sampleCount: samples.length,
    structuralAgreement,
    selectorAgreement,
    flowAgreement,
    assertionAgreement,
    consensusCode: samples[bestSampleIndex].code,
    disagreementAreas,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// MULTI-SAMPLER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate multiple code samples and analyze agreement
 */
export async function generateMultipleSamples(
  request: MultiSampleRequest,
  generator: CodeGenerator
): Promise<MultiSampleResult> {
  const { prompt, journeyId, config } = request;
  const samples: CodeSample[] = [];
  const totalTokenUsage: TokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCostUsd: 0 };

  // Generate samples at different temperatures
  for (let i = 0; i < config.sampleCount; i++) {
    const temperature = config.temperatures[i] ?? 0.5;

    try {
      const result = await generator.generate(prompt, temperature);

      samples.push({
        id: `sample-${i}-t${temperature}`,
        code: result.code,
        temperature,
        tokenUsage: result.tokenUsage,
      });

      totalTokenUsage.promptTokens += result.tokenUsage.promptTokens;
      totalTokenUsage.completionTokens += result.tokenUsage.completionTokens;
      totalTokenUsage.totalTokens += result.tokenUsage.totalTokens;
    } catch (error) {
      // Continue with other samples on error
      console.warn(`Sample ${i} generation failed:`, error);
    }
  }

  // Analyze agreement
  const agreement = analyzeAgreement(samples);

  // Select best sample
  const bestSampleIndex = samples.findIndex(s => s.code === agreement.consensusCode);
  const bestSample = samples[bestSampleIndex >= 0 ? bestSampleIndex : 0] || samples[0];

  // Persist samples if configured
  let samplesDir: string | undefined;
  if (config.persistSamples && samples.length > 0) {
    await ensureAutogenDir();
    samplesDir = getAutogenArtifact('samples');
    mkdirSync(samplesDir, { recursive: true });

    // Save each sample
    for (let i = 0; i < samples.length; i++) {
      const samplePath = join(samplesDir, `${journeyId}-sample-${i}.ts`);
      writeFileSync(samplePath, samples[i].code, 'utf-8');
    }

    // Save agreement analysis
    const agreementPath = getAutogenArtifact('agreement');
    writeFileSync(agreementPath, JSON.stringify({
      journeyId,
      agreement,
      samples: samples.map(s => ({
        id: s.id,
        temperature: s.temperature,
        tokenUsage: s.tokenUsage,
      })),
      totalTokenUsage,
      generatedAt: new Date().toISOString(),
    }, null, 2), 'utf-8');
  }

  return {
    samples,
    agreement,
    bestSample,
    totalTokenUsage,
    samplesDir,
  };
}

/**
 * Load previously generated samples
 */
export function loadSamples(journeyId: string): CodeSample[] | null {
  const samplesDir = getAutogenArtifact('samples');
  const agreementPath = getAutogenArtifact('agreement');

  if (!existsSync(agreementPath)) {
    return null;
  }

  try {
    const agreementData = JSON.parse(readFileSync(agreementPath, 'utf-8'));
    if (agreementData.journeyId !== journeyId) {
      return null;
    }

    const samples: CodeSample[] = [];
    for (let i = 0; ; i++) {
      const samplePath = join(samplesDir, `${journeyId}-sample-${i}.ts`);
      if (!existsSync(samplePath)) break;

      const code = readFileSync(samplePath, 'utf-8');
      const meta = agreementData.samples[i] || { id: `sample-${i}`, temperature: 0.5 };

      samples.push({
        id: meta.id,
        code,
        temperature: meta.temperature,
        tokenUsage: meta.tokenUsage,
      });
    }

    return samples.length > 0 ? samples : null;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ORCHESTRATOR SUPPORT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Output for orchestrator to generate multiple samples
 */
export interface OrchestratorSampleRequest {
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
export function createOrchestratorSampleRequest(
  prompt: string,
  journeyId: string,
  config: MultiSamplerConfig = DEFAULT_MULTI_SAMPLER_CONFIG
): OrchestratorSampleRequest {
  return {
    prompt,
    journeyId,
    temperatures: config.temperatures,
    instructions: `
Generate ${config.sampleCount} different versions of the Playwright test code.
For each version, use a different "creative temperature":
${config.temperatures.map((t, i) => `- Version ${i + 1}: Temperature ${t} (${t < 0.3 ? 'conservative' : t < 0.6 ? 'balanced' : 'creative'})`).join('\n')}

Save each version as a separate code block labeled with the version number.
The goal is to explore different approaches and identify areas of agreement/disagreement.

After generating all versions, provide a brief analysis:
1. What elements are consistent across all versions (high agreement)
2. What elements differ between versions (disagreement areas)
3. Which version you recommend as the best consensus

Minimum agreement score threshold: ${config.minAgreementScore}
`,
  };
}

/**
 * Process orchestrator-provided samples
 */
export function processOrchestratorSamples(
  samples: Array<{ code: string; temperature: number }>,
  _journeyId: string
): MultiSampleResult {
  const codeSamples: CodeSample[] = samples.map((s, i) => ({
    id: `orchestrator-sample-${i}`,
    code: s.code,
    temperature: s.temperature,
  }));

  const agreement = analyzeAgreement(codeSamples);

  const bestSampleIndex = codeSamples.findIndex(s => s.code === agreement.consensusCode);
  const bestSample = codeSamples[bestSampleIndex >= 0 ? bestSampleIndex : 0];

  return {
    samples: codeSamples,
    agreement,
    bestSample,
    totalTokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCostUsd: 0 },
  };
}
