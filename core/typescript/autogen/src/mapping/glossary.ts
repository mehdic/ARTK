/**
 * Glossary Loader - Load and resolve synonyms for step text normalization
 * @see research/2026-01-02_autogen-refined-plan.md Section 10
 * @see research/2026-01-23_llkb-autogen-integration-specification.md (LLKB integration)
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';
import type { IRPrimitive } from '../ir/types.js';

/**
 * Glossary entry schema
 */
const GlossaryEntrySchema = z.object({
  canonical: z.string(),
  synonyms: z.array(z.string()),
});

/**
 * Label alias entry schema (maps display labels to testids/selectors)
 * @see T082 - Extend glossary schema for labelAliases
 */
const LabelAliasSchema = z.object({
  label: z.string(),
  testid: z.string().optional(),
  role: z.string().optional(),
  selector: z.string().optional(),
});

/**
 * Module method mapping schema (maps phrases to module.method calls)
 * @see T082 - Module method resolution
 */
const ModuleMethodMappingSchema = z.object({
  phrase: z.string(),
  module: z.string(),
  method: z.string(),
  params: z.record(z.string()).optional(),
});

/**
 * Glossary file schema
 */
const GlossarySchema = z.object({
  version: z.number().default(1),
  entries: z.array(GlossaryEntrySchema),
  labelAliases: z.array(LabelAliasSchema).default([]),
  moduleMethods: z.array(ModuleMethodMappingSchema).default([]),
});

export type LabelAlias = z.infer<typeof LabelAliasSchema>;
export type ModuleMethodMapping = z.infer<typeof ModuleMethodMappingSchema>;

export type GlossaryEntry = z.infer<typeof GlossaryEntrySchema>;
export type Glossary = z.infer<typeof GlossarySchema>;

/**
 * Default glossary entries for common terms
 */
export const defaultGlossary: Glossary = {
  version: 1,
  labelAliases: [
    // Common label-to-selector mappings
    { label: 'email', testid: 'email-input', role: 'textbox' },
    { label: 'password', testid: 'password-input', role: 'textbox' },
    { label: 'username', testid: 'username-input', role: 'textbox' },
    { label: 'search', testid: 'search-input', role: 'searchbox' },
    { label: 'submit', testid: 'submit-button', role: 'button' },
    { label: 'cancel', testid: 'cancel-button', role: 'button' },
    { label: 'close', testid: 'close-button', role: 'button' },
  ],
  moduleMethods: [
    // Common phrase-to-module mappings
    { phrase: 'log in', module: 'auth', method: 'login' },
    { phrase: 'login', module: 'auth', method: 'login' },
    { phrase: 'sign in', module: 'auth', method: 'login' },
    { phrase: 'log out', module: 'auth', method: 'logout' },
    { phrase: 'logout', module: 'auth', method: 'logout' },
    { phrase: 'sign out', module: 'auth', method: 'logout' },
    { phrase: 'navigate to', module: 'navigation', method: 'goToPath' },
    { phrase: 'go to', module: 'navigation', method: 'goToPath' },
    { phrase: 'open', module: 'navigation', method: 'goToPath' },
    { phrase: 'fill form', module: 'forms', method: 'fillForm' },
    { phrase: 'submit form', module: 'forms', method: 'submitForm' },
    { phrase: 'wait for', module: 'waits', method: 'waitForSignal' },
  ],
  entries: [
    {
      canonical: 'click',
      synonyms: ['press', 'tap', 'select', 'hit'],
    },
    {
      canonical: 'enter',
      synonyms: ['type', 'fill', 'input', 'write'],
    },
    {
      canonical: 'navigate',
      synonyms: ['go', 'open', 'visit', 'browse'],
    },
    {
      canonical: 'see',
      synonyms: ['view', 'observe', 'notice', 'find'],
    },
    {
      canonical: 'visible',
      synonyms: ['displayed', 'shown', 'present'],
    },
    {
      canonical: 'button',
      synonyms: ['btn', 'action', 'cta'],
    },
    {
      canonical: 'field',
      synonyms: ['input', 'textbox', 'text field', 'text input'],
    },
    {
      canonical: 'dropdown',
      synonyms: ['select', 'combo', 'combobox', 'selector', 'picker'],
    },
    {
      canonical: 'checkbox',
      synonyms: ['check', 'tick', 'toggle'],
    },
    {
      canonical: 'login',
      synonyms: ['log in', 'sign in', 'authenticate'],
    },
    {
      canonical: 'logout',
      synonyms: ['log out', 'sign out', 'exit'],
    },
    {
      canonical: 'submit',
      synonyms: ['send', 'save', 'confirm', 'ok'],
    },
    {
      canonical: 'cancel',
      synonyms: ['close', 'dismiss', 'abort', 'back'],
    },
    {
      canonical: 'success',
      synonyms: ['passed', 'completed', 'done', 'finished'],
    },
    {
      canonical: 'error',
      synonyms: ['failure', 'failed', 'problem', 'issue'],
    },
    {
      canonical: 'toast',
      synonyms: ['notification', 'message', 'alert', 'snackbar'],
    },
    {
      canonical: 'modal',
      synonyms: ['dialog', 'popup', 'overlay', 'lightbox'],
    },
    {
      canonical: 'user',
      synonyms: ['customer', 'visitor', 'member', 'client'],
    },
    {
      canonical: 'page',
      synonyms: ['screen', 'view', 'section'],
    },
    {
      canonical: 'form',
      synonyms: ['questionnaire', 'survey', 'wizard'],
    },
  ],
};

/**
 * Loaded glossary cache
 */
let glossaryCache: Glossary | null = null;
let synonymMap: Map<string, string> | null = null;

/**
 * Build a synonym lookup map from glossary
 */
function buildSynonymMap(glossary: Glossary): Map<string, string> {
  const map = new Map<string, string>();

  for (const entry of glossary.entries) {
    // Map canonical to itself
    map.set(entry.canonical.toLowerCase(), entry.canonical);

    // Map all synonyms to canonical
    for (const synonym of entry.synonyms) {
      map.set(synonym.toLowerCase(), entry.canonical);
    }
  }

  return map;
}

/**
 * Load glossary from file
 * @param glossaryPath - Path to glossary YAML file
 */
export function loadGlossary(glossaryPath: string): Glossary {
  const resolvedPath = resolve(glossaryPath);

  if (!existsSync(resolvedPath)) {
    console.warn(`Glossary file not found at ${resolvedPath}, using defaults`);
    return defaultGlossary;
  }

  try {
    const content = readFileSync(resolvedPath, 'utf-8');
    const parsed = parseYaml(content);
    const result = GlossarySchema.safeParse(parsed);

    if (!result.success) {
      console.warn(`Invalid glossary file at ${resolvedPath}, using defaults`);
      return defaultGlossary;
    }

    // Merge with defaults
    return mergeGlossaries(defaultGlossary, result.data);
  } catch {
    console.warn(`Failed to load glossary from ${resolvedPath}, using defaults`);
    return defaultGlossary;
  }
}

/**
 * Merge two glossaries (user glossary extends defaults)
 */
export function mergeGlossaries(base: Glossary, extension: Glossary): Glossary {
  const merged: Glossary = {
    version: Math.max(base.version, extension.version),
    entries: [...base.entries],
    labelAliases: [...(base.labelAliases ?? [])],
    moduleMethods: [...(base.moduleMethods ?? [])],
  };

  // Add or extend entries from extension
  for (const extEntry of extension.entries) {
    const existing = merged.entries.find(
      (e) => e.canonical.toLowerCase() === extEntry.canonical.toLowerCase()
    );

    if (existing) {
      // Merge synonyms
      const allSynonyms = new Set([...existing.synonyms, ...extEntry.synonyms]);
      existing.synonyms = Array.from(allSynonyms);
    } else {
      // Add new entry
      merged.entries.push(extEntry);
    }
  }

  // Add or extend label aliases from extension
  for (const extAlias of extension.labelAliases ?? []) {
    const existing = merged.labelAliases.find(
      (a) => a.label.toLowerCase() === extAlias.label.toLowerCase()
    );

    if (!existing) {
      merged.labelAliases.push(extAlias);
    } else {
      // Override with extension values
      Object.assign(existing, extAlias);
    }
  }

  // Add or extend module methods from extension
  for (const extMethod of extension.moduleMethods ?? []) {
    const existing = merged.moduleMethods.find(
      (m) => m.phrase.toLowerCase() === extMethod.phrase.toLowerCase()
    );

    if (!existing) {
      merged.moduleMethods.push(extMethod);
    } else {
      // Override with extension values
      Object.assign(existing, extMethod);
    }
  }

  return merged;
}

/**
 * Initialize the glossary (call once at startup)
 * @param glossaryPath - Optional path to custom glossary
 */
export function initGlossary(glossaryPath?: string): void {
  if (glossaryPath) {
    glossaryCache = loadGlossary(glossaryPath);
  } else {
    glossaryCache = defaultGlossary;
  }
  synonymMap = buildSynonymMap(glossaryCache);
}

/**
 * Get the current glossary
 */
export function getGlossary(): Glossary {
  if (!glossaryCache) {
    initGlossary();
  }
  return glossaryCache!;
}

/**
 * Resolve a term to its canonical form
 * @param term - Term to resolve
 * @returns Canonical form or original term if not found
 */
export function resolveCanonical(term: string): string {
  if (!synonymMap) {
    initGlossary();
  }
  return synonymMap!.get(term.toLowerCase()) ?? term;
}

/**
 * Normalize step text by replacing synonyms with canonical terms
 * @param text - Step text to normalize
 * @returns Normalized text
 */
export function normalizeStepText(text: string): string {
  if (!synonymMap) {
    initGlossary();
  }

  // Split into words, preserving quoted strings
  const parts: string[] = [];
  const regex = /(['"][^'"]+['"])|(\S+)/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const part = match[0];

    // Don't normalize quoted strings
    if (part.startsWith('"') || part.startsWith("'")) {
      parts.push(part);
    } else {
      // Check if this word has a canonical form
      const canonical = synonymMap!.get(part.toLowerCase());
      parts.push(canonical ?? part);
    }
  }

  return parts.join(' ');
}

/**
 * Get all synonyms for a canonical term
 */
export function getSynonyms(canonical: string): string[] {
  if (!glossaryCache) {
    initGlossary();
  }

  const entry = glossaryCache!.entries.find(
    (e) => e.canonical.toLowerCase() === canonical.toLowerCase()
  );

  return entry?.synonyms ?? [];
}

/**
 * Check if a term is a synonym of a canonical term
 */
export function isSynonymOf(term: string, canonical: string): boolean {
  const resolved = resolveCanonical(term);
  return resolved.toLowerCase() === canonical.toLowerCase();
}

/**
 * Reset the glossary cache (for testing)
 */
export function resetGlossaryCache(): void {
  glossaryCache = null;
  synonymMap = null;
}

/**
 * Find a label alias by label text
 * @see T082 - Label alias matching
 */
export function findLabelAlias(label: string): LabelAlias | null {
  if (!glossaryCache) {
    initGlossary();
  }

  const normalizedLabel = label.toLowerCase().trim();

  return (
    glossaryCache!.labelAliases?.find(
      (alias) => alias.label.toLowerCase() === normalizedLabel
    ) ?? null
  );
}

/**
 * Get locator info from label alias
 */
export function getLocatorFromLabel(label: string): { strategy: string; value: string } | null {
  const alias = findLabelAlias(label);
  if (!alias) return null;

  // Priority: testid > role > selector
  if (alias.testid) {
    return { strategy: 'testid', value: alias.testid };
  }
  if (alias.role) {
    return { strategy: 'role', value: alias.role };
  }
  if (alias.selector) {
    return { strategy: 'css', value: alias.selector };
  }

  return null;
}

/**
 * Find a module method mapping by phrase
 * @see T083 - Module method resolution in step mapper
 */
export function findModuleMethod(text: string): ModuleMethodMapping | null {
  if (!glossaryCache) {
    initGlossary();
  }

  const normalizedText = text.toLowerCase().trim();

  // Find the best matching phrase (longest match wins)
  let bestMatch: ModuleMethodMapping | null = null;
  let bestMatchLength = 0;

  for (const mapping of glossaryCache!.moduleMethods ?? []) {
    const phrase = mapping.phrase.toLowerCase();
    if (normalizedText.includes(phrase) && phrase.length > bestMatchLength) {
      bestMatch = mapping;
      bestMatchLength = phrase.length;
    }
  }

  return bestMatch;
}

/**
 * Resolve a step to a module method call if it matches
 */
export function resolveModuleMethod(
  text: string
): { module: string; method: string; params?: Record<string, string> } | null {
  const mapping = findModuleMethod(text);
  if (!mapping) return null;

  return {
    module: mapping.module,
    method: mapping.method,
    params: mapping.params,
  };
}

/**
 * Get all label aliases
 */
export function getLabelAliases(): LabelAlias[] {
  if (!glossaryCache) {
    initGlossary();
  }
  return glossaryCache!.labelAliases ?? [];
}

/**
 * Get all module method mappings
 */
export function getModuleMethods(): ModuleMethodMapping[] {
  if (!glossaryCache) {
    initGlossary();
  }
  return glossaryCache!.moduleMethods ?? [];
}

// ============================================================================
// LLKB Extended Glossary Support
// @see research/2026-01-23_llkb-autogen-integration-specification.md
// ============================================================================

/**
 * Extended glossary metadata from LLKB export
 */
export interface ExtendedGlossaryMeta {
  exportedAt: string;
  entryCount: number;
  minConfidence?: number;
  sourceComponents?: string[];
  sourceLessons?: string[];
}

/**
 * Extended glossary loaded from LLKB export
 */
let extendedGlossary: Map<string, IRPrimitive> | null = null;
let extendedGlossaryMeta: ExtendedGlossaryMeta | null = null;

/**
 * Load extended glossary from LLKB export file
 * @param glossaryPath - Path to the LLKB-generated glossary TypeScript file
 * @returns Loading result with entry count and metadata
 */
export async function loadExtendedGlossary(glossaryPath: string): Promise<{
  loaded: boolean;
  entryCount: number;
  exportedAt: string | null;
  error?: string;
}> {
  try {
    const resolvedPath = resolve(glossaryPath);

    if (!existsSync(resolvedPath)) {
      return {
        loaded: false,
        entryCount: 0,
        exportedAt: null,
        error: `Glossary file not found: ${resolvedPath}`,
      };
    }

    // Dynamic import of the generated glossary file
    // Use file:// URL for Windows compatibility
    const fileUrl = pathToFileURL(resolvedPath).href;
    const module = await import(fileUrl);

    if (module.llkbGlossary instanceof Map) {
      const glossaryMap: Map<string, IRPrimitive> = module.llkbGlossary;
      extendedGlossary = glossaryMap;
      extendedGlossaryMeta = module.llkbGlossaryMeta ?? null;

      return {
        loaded: true,
        entryCount: glossaryMap.size,
        exportedAt: extendedGlossaryMeta?.exportedAt ?? null,
      };
    }

    // If llkbGlossary is a plain object, convert to Map
    if (module.llkbGlossary && typeof module.llkbGlossary === 'object') {
      const glossaryMap = new Map<string, IRPrimitive>(
        Object.entries(module.llkbGlossary) as [string, IRPrimitive][]
      );
      extendedGlossary = glossaryMap;
      extendedGlossaryMeta = module.llkbGlossaryMeta ?? null;

      return {
        loaded: true,
        entryCount: glossaryMap.size,
        exportedAt: extendedGlossaryMeta?.exportedAt ?? null,
      };
    }

    return {
      loaded: false,
      entryCount: 0,
      exportedAt: null,
      error: 'Invalid glossary format: llkbGlossary not found or not a Map/object',
    };
  } catch (err) {
    return {
      loaded: false,
      entryCount: 0,
      exportedAt: null,
      error: `Failed to load glossary: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Clear extended glossary (for testing)
 */
export function clearExtendedGlossary(): void {
  extendedGlossary = null;
  extendedGlossaryMeta = null;
}

/**
 * Check if a term exactly matches a core glossary phrase
 * (not just a partial/substring match)
 */
function isExactCoreMatch(term: string): boolean {
  if (!glossaryCache) {
    initGlossary();
  }

  const normalizedTerm = term.toLowerCase().trim();

  // Check if any module method phrase exactly matches the term
  for (const mapping of glossaryCache!.moduleMethods ?? []) {
    if (mapping.phrase.toLowerCase() === normalizedTerm) {
      return true;
    }
  }

  return false;
}

/**
 * Lookup a term in both core glossary and extended LLKB glossary
 * Core glossary takes precedence for exact matches (LLKB only extends, never overrides)
 * @param term - Term to look up
 * @returns IR primitive if found, undefined otherwise
 */
export function lookupGlossary(term: string): IRPrimitive | undefined {
  const normalizedTerm = term.toLowerCase().trim();

  // First check if core glossary has an EXACT match for this term
  // Core always wins for exact matches (LLKB never overrides core)
  if (isExactCoreMatch(normalizedTerm)) {
    const coreMapping = findModuleMethod(normalizedTerm);
    if (coreMapping) {
      return {
        type: 'callModule',
        module: coreMapping.module,
        method: coreMapping.method,
        args: coreMapping.params ? [coreMapping.params] : undefined,
      };
    }
  }

  // Then check extended glossary for exact match
  // LLKB extends core glossary with new terms
  if (extendedGlossary) {
    const extendedMatch = extendedGlossary.get(normalizedTerm);
    if (extendedMatch) {
      return extendedMatch;
    }
  }

  // Finally, check core glossary for partial/substring matches
  // This allows core patterns like "wait for" to match "wait for something"
  const coreMapping = findModuleMethod(normalizedTerm);
  if (coreMapping) {
    return {
      type: 'callModule',
      module: coreMapping.module,
      method: coreMapping.method,
      args: coreMapping.params ? [coreMapping.params] : undefined,
    };
  }

  return undefined;
}

/**
 * Lookup a term in core glossary only (for priority enforcement)
 * Used when LLKB should NOT override core mappings
 * @param term - Term to look up
 * @returns IR primitive if found, undefined otherwise
 */
export function lookupCoreGlossary(term: string): IRPrimitive | undefined {
  const normalizedTerm = term.toLowerCase().trim();

  const coreMapping = findModuleMethod(normalizedTerm);
  if (coreMapping) {
    return {
      type: 'callModule',
      module: coreMapping.module,
      method: coreMapping.method,
      args: coreMapping.params ? [coreMapping.params] : undefined,
    };
  }

  return undefined;
}

/**
 * Get glossary statistics
 */
export function getGlossaryStats(): {
  coreEntries: number;
  extendedEntries: number;
  extendedExportedAt: string | null;
  extendedMeta: ExtendedGlossaryMeta | null;
} {
  if (!glossaryCache) {
    initGlossary();
  }

  return {
    coreEntries: glossaryCache!.moduleMethods?.length ?? 0,
    extendedEntries: extendedGlossary?.size ?? 0,
    extendedExportedAt: extendedGlossaryMeta?.exportedAt ?? null,
    extendedMeta: extendedGlossaryMeta,
  };
}

/**
 * Check if extended glossary is loaded
 */
export function hasExtendedGlossary(): boolean {
  return extendedGlossary !== null && extendedGlossary.size > 0;
}
