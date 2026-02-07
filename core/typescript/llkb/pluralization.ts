/**
 * LLKB Pluralization Module
 *
 * Single source of truth for English pluralization rules.
 * Used by mining.ts and template-generators.ts.
 *
 * Merged from both files with comprehensive irregular word coverage.
 *
 * Security: Uses null-prototype objects to prevent prototype pollution.
 *
 * @module llkb/pluralization
 */

// =============================================================================
// Constants
// =============================================================================

/** Maximum word length to process (defense against DoS) */
const MAX_WORD_LENGTH = 100;

// =============================================================================
// Helper: Create null-prototype dictionary (prevents prototype pollution)
// =============================================================================

/**
 * Creates a frozen, null-prototype object from entries.
 * Prevents prototype pollution attacks via __proto__, constructor, etc.
 */
function createSafeDict<T extends Record<string, string>>(entries: T): Readonly<T> {
  return Object.freeze(Object.assign(Object.create(null), entries)) as Readonly<T>;
}

// =============================================================================
// Uncountable Nouns (words that don't have plural forms)
// =============================================================================

/**
 * Uncountable nouns that should not be pluralized.
 * These words are the same in singular and plural form.
 */
export const UNCOUNTABLE_NOUNS: ReadonlySet<string> = Object.freeze(
  new Set([
    // Abstract concepts
    'advice',
    'information',
    'knowledge',
    'wisdom',
    'intelligence',
    'evidence',
    'research',
    'progress',
    'happiness',
    'sadness',
    'luck',
    'fun',

    // Materials and substances
    'water',
    'air',
    'oil',
    // Note: 'gas' removed - it has a plural form 'gases' (e.g., "noble gases")
    'milk',
    'rice',
    'bread',
    'sugar',
    'salt',
    'flour',
    'gold',
    'silver',
    'iron',
    'wood',
    'paper',
    'glass',
    'plastic',
    'cotton',
    'wool',

    // Tech/software terms
    'software',
    'hardware',
    'firmware',
    'malware',
    'freeware',
    'shareware',
    'middleware',
    // Note: 'data' is in IRREGULAR_PLURALS (datum/data), not here
    // Note: 'metadata' follows 'data' pattern
    'feedback',
    'bandwidth',
    'traffic',
    'spam',
    'code', // Usually uncountable in tech context

    // Other uncountables
    'equipment',
    'furniture',
    'luggage',
    'baggage',
    'clothing',
    'weather',
    'news',
    'homework',
    'housework',
    'money',
    'cash',
    'music',
    'art',
    'poetry',
    'literature',
    'electricity',
    'heat',
    'light',
    'darkness',
    'space',
    'time',
    'work',
    'travel',
    'accommodation',
    'scenery',
    'machinery',
    'jewelry',
    'rubbish',
    'garbage',
    'trash',
    'stuff',

    // Words same in singular and plural
    'sheep',
    'fish',
    'deer',
    'moose',
    'swine',
    'buffalo',
    'shrimp',
    'trout',
    'salmon',
    'squid',
    'aircraft',
    'spacecraft',
    'hovercraft',
    'series',
    'species',
    'means',
    'offspring',
    'chassis',
    'corps',
    'swiss',
  ])
);

// =============================================================================
// Irregular Plurals (merged from mining.ts + template-generators.ts)
// =============================================================================

/**
 * Complete irregular plurals map (52+ entries)
 * Merged from:
 * - mining.ts: 47 entries
 * - template-generators.ts: 38 entries
 * - Combined unique entries from both
 *
 * Uses null-prototype object to prevent prototype pollution.
 */
export const IRREGULAR_PLURALS: Readonly<Record<string, string>> = createSafeDict({
  // People
  person: 'people',
  child: 'children',
  man: 'men',
  woman: 'women',

  // Body parts
  tooth: 'teeth',
  foot: 'feet',

  // Animals
  mouse: 'mice',
  goose: 'geese',
  ox: 'oxen',

  // -f/-fe to -ves
  leaf: 'leaves',
  life: 'lives',
  knife: 'knives',
  wife: 'wives',
  half: 'halves',
  shelf: 'shelves',
  self: 'selves', // From template-generators.ts
  calf: 'calves',
  loaf: 'loaves',

  // -o to -oes
  potato: 'potatoes',
  tomato: 'tomatoes',
  hero: 'heroes',
  echo: 'echoes',
  embargo: 'embargoes', // From mining.ts
  veto: 'vetoes', // From mining.ts
  cargo: 'cargoes', // From template-generators.ts

  // Latin/Greek (-is to -es)
  analysis: 'analyses',
  basis: 'bases',
  crisis: 'crises',
  diagnosis: 'diagnoses', // From mining.ts
  hypothesis: 'hypotheses', // From mining.ts
  oasis: 'oases', // From mining.ts
  parenthesis: 'parentheses', // From mining.ts
  synopsis: 'synopses', // From mining.ts
  thesis: 'theses',

  // Latin/Greek (-on/-um to -a)
  criterion: 'criteria',
  phenomenon: 'phenomena',
  datum: 'data',
  medium: 'media',
  curriculum: 'curricula', // From mining.ts
  memorandum: 'memoranda', // From mining.ts

  // Latin (-us to -i)
  stimulus: 'stimuli', // From mining.ts
  syllabus: 'syllabi', // From mining.ts
  focus: 'foci', // From mining.ts
  fungus: 'fungi', // From mining.ts
  cactus: 'cacti', // From mining.ts

  // Latin (-ix/-ex to -ices)
  appendix: 'appendices',
  index: 'indices',
  matrix: 'matrices',
  vertex: 'vertices', // From template-generators.ts

  // Special cases
  status: 'statuses', // From template-generators.ts
  quiz: 'quizzes', // From template-generators.ts

  // Singular nouns ending in 's' that need -es (would be caught by "already plural" check)
  bus: 'buses',
  gas: 'gases',
  lens: 'lenses',
  atlas: 'atlases',
  iris: 'irises',
  plus: 'pluses',
  minus: 'minuses',
  bonus: 'bonuses',
  campus: 'campuses',
  caucus: 'caucuses',
  census: 'censuses',
  citrus: 'citruses',
  circus: 'circuses',
  corpus: 'corpora', // Latin plural
  genus: 'genera', // Latin plural
  radius: 'radii', // Latin plural
  nexus: 'nexuses',
  sinus: 'sinuses',
  surplus: 'surpluses',
  virus: 'viruses',
});

/**
 * Reverse lookup: plural to singular
 * Uses null-prototype object to prevent prototype pollution.
 */
export const IRREGULAR_SINGULARS: Readonly<Record<string, string>> = createSafeDict(
  Object.fromEntries(
    Object.entries(IRREGULAR_PLURALS).map(([singular, plural]) => [plural, singular])
  ) as Record<string, string>
);

// =============================================================================
// Pluralization Functions
// =============================================================================

/** Options for pluralize function */
export interface PluralizeOptions {
  /** Preserve the original case pattern (e.g., 'User' -> 'Users') */
  preserveCase?: boolean;
}

/**
 * Apply the original case pattern to the result.
 * Handles: lowercase, UPPERCASE, TitleCase, camelCase
 */
function applyCasePattern(original: string, result: string): string {
  if (original.length === 0) {return result;}

  // All uppercase: USER -> USERS
  if (original === original.toUpperCase() && /[A-Z]/.test(original)) {
    return result.toUpperCase();
  }

  // Title case (first letter uppercase): User -> Users
  if (original[0] === original[0].toUpperCase() && original.slice(1) === original.slice(1).toLowerCase()) {
    return result.charAt(0).toUpperCase() + result.slice(1);
  }

  // Otherwise return as-is (lowercase)
  return result;
}

/**
 * Convert a singular word to its plural form using English grammar rules.
 *
 * @param word - The singular word to pluralize
 * @param options - Optional settings (e.g., preserveCase)
 * @returns The plural form of the word
 *
 * @example
 * pluralize('user')     // 'users'
 * pluralize('person')   // 'people'
 * pluralize('category') // 'categories'
 * pluralize('status')   // 'statuses'
 * pluralize('software') // 'software' (uncountable)
 * pluralize('User', { preserveCase: true })  // 'Users'
 * pluralize('API', { preserveCase: true })   // 'APIS'
 */
export function pluralize(word: string, options: PluralizeOptions = {}): string {
  // Input validation
  if (typeof word !== 'string') {
    return String(word);
  }

  // Handle empty string
  if (word.length === 0) {
    return '';
  }

  // Length limit for DoS prevention
  if (word.length > MAX_WORD_LENGTH) {
    return word; // Return unchanged if too long
  }

  const lower = word.toLowerCase();

  // Check uncountable nouns first (return unchanged)
  if (UNCOUNTABLE_NOUNS.has(lower)) {
    return options.preserveCase ? word : lower;
  }

  // Check irregular plurals (safe lookup - null prototype)
  if (lower in IRREGULAR_PLURALS) {
    const result = IRREGULAR_PLURALS[lower];
    return options.preserveCase ? applyCasePattern(word, result) : result;
  }

  // Already plural check - handles both irregular and regular plurals
  // 1. Known irregular plurals (e.g., 'people', 'children', 'analyses')
  if (lower in IRREGULAR_SINGULARS) {
    return options.preserveCase ? word : lower;
  }

  // 2. Regular plurals ending in 's' - but NOT singular words ending in 's'
  // Singular words ending in 's' that need -es (bus, gas, lens) are now in IRREGULAR_PLURALS
  // so they won't reach this check. Words like 'users', 'items' should not become 'userses'.
  if (
    lower.endsWith('s') &&
    !lower.endsWith('ss') && // 'class' needs -es
    !(lower in IRREGULAR_PLURALS) // 'bus', 'gas', 'lens' etc. are handled above
  ) {
    return options.preserveCase ? word : lower;
  }

  let result: string;

  // -y preceded by consonant -> -ies
  if (lower.endsWith('y') && lower.length > 1) {
    const beforeY = lower[lower.length - 2];
    if (!'aeiou'.includes(beforeY)) {
      result = lower.slice(0, -1) + 'ies';
      return options.preserveCase ? applyCasePattern(word, result) : result;
    }
  }

  // -s, -x, -z, -ch, -sh -> -es
  if (
    lower.endsWith('s') ||
    lower.endsWith('x') ||
    lower.endsWith('z') ||
    lower.endsWith('ch') ||
    lower.endsWith('sh')
  ) {
    result = lower + 'es';
    return options.preserveCase ? applyCasePattern(word, result) : result;
  }

  // -f (not -ff, -ief, -oof, -eef) -> -ves
  if (
    lower.endsWith('f') &&
    !lower.endsWith('ff') &&
    !lower.endsWith('ief') &&
    !lower.endsWith('oof') &&
    !lower.endsWith('eef')
  ) {
    result = lower.slice(0, -1) + 'ves';
    return options.preserveCase ? applyCasePattern(word, result) : result;
  }

  // -fe -> -ves
  if (lower.endsWith('fe')) {
    result = lower.slice(0, -2) + 'ves';
    return options.preserveCase ? applyCasePattern(word, result) : result;
  }

  // -o preceded by consonant -> -es (common pattern)
  if (lower.endsWith('o') && lower.length > 1) {
    const beforeO = lower[lower.length - 2];
    if (!'aeiou'.includes(beforeO)) {
      result = lower + 'es';
      return options.preserveCase ? applyCasePattern(word, result) : result;
    }
  }

  // Default: add 's'
  result = lower + 's';
  return options.preserveCase ? applyCasePattern(word, result) : result;
}

/** Options for singularize function */
export interface SingularizeOptions {
  /** Preserve the original case pattern (e.g., 'Users' -> 'User') */
  preserveCase?: boolean;
}

/**
 * Convert a plural word to its singular form using English grammar rules.
 *
 * @param word - The plural word to singularize
 * @param options - Optional settings (e.g., preserveCase)
 * @returns The singular form of the word
 *
 * @example
 * singularize('users')      // 'user'
 * singularize('people')     // 'person'
 * singularize('categories') // 'category'
 * singularize('statuses')   // 'status'
 * singularize('software')   // 'software' (uncountable)
 * singularize('Users', { preserveCase: true })  // 'User'
 */
export function singularize(word: string, options: SingularizeOptions = {}): string {
  // Input validation
  if (typeof word !== 'string') {
    return String(word);
  }

  // Handle empty string
  if (word.length === 0) {
    return '';
  }

  // Length limit for DoS prevention
  if (word.length > MAX_WORD_LENGTH) {
    return word; // Return unchanged if too long
  }

  const lower = word.toLowerCase();

  // Check uncountable nouns first (return unchanged)
  if (UNCOUNTABLE_NOUNS.has(lower)) {
    return options.preserveCase ? word : lower;
  }

  // Check irregular singulars (safe lookup - null prototype)
  if (lower in IRREGULAR_SINGULARS) {
    const result = IRREGULAR_SINGULARS[lower];
    return options.preserveCase ? applyCasePattern(word, result) : result;
  }

  let result: string;

  // -ies -> -y
  if (lower.endsWith('ies') && lower.length > 3) {
    result = lower.slice(0, -3) + 'y';
    return options.preserveCase ? applyCasePattern(word, result) : result;
  }

  // -ves -> -f or -fe
  if (lower.endsWith('ves')) {
    const stem = lower.slice(0, -3);
    // Words that take -f (not -fe): leaf, loaf, shelf, etc.
    if (
      stem.endsWith('l') ||
      stem.endsWith('r') ||
      stem.endsWith('n') ||
      stem.endsWith('a') ||
      stem.endsWith('o')
    ) {
      result = stem + 'f';
    } else {
      result = stem + 'fe';
    }
    return options.preserveCase ? applyCasePattern(word, result) : result;
  }

  // -zzes -> -zz (buzz -> buzzes, fizz -> fizzes)
  if (lower.endsWith('zzes')) {
    result = lower.slice(0, -2); // Remove 'es', keep 'zz'
    return options.preserveCase ? applyCasePattern(word, result) : result;
  }

  // -es for -ss, -x, -z, -ch, -sh, -o endings
  if (lower.endsWith('es')) {
    const stem = lower.slice(0, -2);
    if (
      stem.endsWith('ss') || // class -> classes
      stem.endsWith('x') || // box -> boxes
      stem.endsWith('z') || // quiz -> quizzes (but handled above for -zz)
      stem.endsWith('ch') || // watch -> watches
      stem.endsWith('sh') || // wish -> wishes
      stem.endsWith('o') // hero -> heroes
    ) {
      return options.preserveCase ? applyCasePattern(word, stem) : stem;
    }
    // Handle single 's' ending (bus -> buses)
    if (stem.endsWith('s') && !stem.endsWith('ss')) {
      return options.preserveCase ? applyCasePattern(word, stem) : stem;
    }
  }

  // Default: remove trailing 's' (but not -ss)
  if (lower.endsWith('s') && lower.length > 1 && !lower.endsWith('ss')) {
    result = lower.slice(0, -1);
    return options.preserveCase ? applyCasePattern(word, result) : result;
  }

  return options.preserveCase ? word : lower;
}

/**
 * Get both singular and plural forms from any input word.
 *
 * @param word - Any form of the word (singular or plural)
 * @returns Object with both singular and plural forms
 *
 * @example
 * getSingularPlural('user')     // { singular: 'user', plural: 'users' }
 * getSingularPlural('users')    // { singular: 'user', plural: 'users' }
 * getSingularPlural('people')   // { singular: 'person', plural: 'people' }
 * getSingularPlural('software') // { singular: 'software', plural: 'software' }
 */
export function getSingularPlural(word: string): { singular: string; plural: string } {
  // Input validation
  if (typeof word !== 'string' || word.length === 0) {
    return { singular: '', plural: '' };
  }

  const lower = word.toLowerCase();

  // Check uncountable nouns (same in both forms)
  if (UNCOUNTABLE_NOUNS.has(lower)) {
    return { singular: lower, plural: lower };
  }

  // Check if it's a known plural (safe lookup - null prototype)
  if (lower in IRREGULAR_SINGULARS) {
    return {
      singular: IRREGULAR_SINGULARS[lower],
      plural: lower,
    };
  }

  // Check if it's a known singular (safe lookup - null prototype)
  if (lower in IRREGULAR_PLURALS) {
    return {
      singular: lower,
      plural: IRREGULAR_PLURALS[lower],
    };
  }

  // Heuristic: singularize first, then pluralize
  const singular = singularize(lower);
  const plural = pluralize(singular);

  return { singular, plural };
}

/**
 * Check if a word is uncountable (has no plural form).
 *
 * @param word - The word to check
 * @returns True if the word is uncountable
 *
 * @example
 * isUncountable('software')    // true
 * isUncountable('information') // true
 * isUncountable('user')        // false
 */
export function isUncountable(word: string): boolean {
  if (typeof word !== 'string') {return false;}
  return UNCOUNTABLE_NOUNS.has(word.toLowerCase());
}
