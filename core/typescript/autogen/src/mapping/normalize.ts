/**
 * Enhanced Normalization Pipeline for Step Text
 * Implements Tier 1 of the coverage improvement strategy:
 * - Stemming (verb form normalization)
 * - Glossary expansion
 * - Canonical form transformation
 * - Whitespace and punctuation normalization
 *
 * @see research/2026-02-03_multi-ai-debate-coverage-improvement.md
 */

/**
 * Common verb stems for normalization
 * Maps various verb forms to their base form
 */
const VERB_STEMS: Record<string, string> = {
  // Click variants
  clicking: 'click',
  clicked: 'click',
  clicks: 'click',

  // Fill variants
  filling: 'fill',
  filled: 'fill',
  fills: 'fill',
  entering: 'fill',
  entered: 'fill',
  enters: 'fill',
  typing: 'fill',
  typed: 'fill',
  types: 'fill',

  // Select variants
  selecting: 'select',
  selected: 'select',
  selects: 'select',
  choosing: 'select',
  chose: 'select',
  chosen: 'select',
  chooses: 'select',

  // Check variants
  checking: 'check',
  checked: 'check',
  checks: 'check',

  // Uncheck variants
  unchecking: 'uncheck',
  unchecked: 'uncheck',
  unchecks: 'uncheck',

  // Navigate variants
  navigating: 'navigate',
  navigated: 'navigate',
  navigates: 'navigate',
  going: 'navigate',
  went: 'navigate',
  goes: 'navigate',
  visiting: 'navigate',
  visited: 'navigate',
  visits: 'navigate',
  opening: 'navigate',
  opened: 'navigate',
  opens: 'navigate',

  // See/Verify variants
  seeing: 'see',
  saw: 'see',
  seen: 'see',
  sees: 'see',
  verifying: 'verify',
  verified: 'verify',
  verifies: 'verify',
  confirming: 'verify',
  confirmed: 'verify',
  confirms: 'verify',
  ensuring: 'verify',
  ensured: 'verify',
  ensures: 'verify',

  // Wait variants
  waiting: 'wait',
  waited: 'wait',
  waits: 'wait',

  // Submit variants
  submitting: 'submit',
  submitted: 'submit',
  submits: 'submit',

  // Press variants
  pressing: 'press',
  pressed: 'press',
  presses: 'press',

  // Hover variants
  hovering: 'hover',
  hovered: 'hover',
  hovers: 'hover',

  // Scroll variants
  scrolling: 'scroll',
  scrolled: 'scroll',
  scrolls: 'scroll',

  // Focus variants
  focusing: 'focus',
  focused: 'focus',
  focuses: 'focus',

  // Drag variants
  dragging: 'drag',
  dragged: 'drag',
  drags: 'drag',

  // Drop variants
  dropping: 'drop',
  dropped: 'drop',
  drops: 'drop',

  // Clear variants
  clearing: 'clear',
  cleared: 'clear',
  clears: 'clear',

  // Upload variants
  uploading: 'upload',
  uploaded: 'upload',
  uploads: 'upload',

  // Download variants
  downloading: 'download',
  downloaded: 'download',
  downloads: 'download',

  // Assert/Expect variants
  asserting: 'assert',
  asserted: 'assert',
  asserts: 'assert',
  expecting: 'expect',
  expected: 'expect',
  expects: 'expect',

  // Show/Display variants
  showing: 'show',
  showed: 'show',
  shown: 'show',
  shows: 'show',
  displaying: 'display',
  displayed: 'display',
  displays: 'display',

  // Hide variants
  hiding: 'hide',
  hid: 'hide',
  hidden: 'hide',
  hides: 'hide',

  // Enable/Disable variants
  enabling: 'enable',
  enabled: 'enable',
  enables: 'enable',
  disabling: 'disable',
  disabled: 'disable',
  disables: 'disable',
};

/**
 * Expanded glossary for abbreviation and synonym expansion
 */
const ABBREVIATION_EXPANSIONS: Record<string, string> = {
  // Common abbreviations
  btn: 'button',
  msg: 'message',
  err: 'error',
  pwd: 'password',
  usr: 'user',
  nav: 'navigation',
  pg: 'page',
  txt: 'text',
  num: 'number',
  val: 'value',
  img: 'image',
  pic: 'picture',
  lbl: 'label',
  chk: 'checkbox',
  chkbox: 'checkbox',
  cb: 'checkbox',
  rb: 'radio',
  dd: 'dropdown',
  sel: 'select',
  dlg: 'dialog',
  mdl: 'modal',
  lnk: 'link',
  tbl: 'table',
  col: 'column',
  hdr: 'header',
  ftr: 'footer',
  sec: 'section',

  // UI element synonyms
  textbox: 'field',
  'text field': 'field',
  'text input': 'field',
  'input field': 'field',
  inputbox: 'field',
  combobox: 'dropdown',
  'combo box': 'dropdown',
  selectbox: 'dropdown',
  'select box': 'dropdown',
  picker: 'dropdown',
  listbox: 'dropdown',
  'list box': 'dropdown',

  // Action synonyms
  'sign in': 'login',
  'log in': 'login',
  signin: 'login',
  'sign out': 'logout',
  'log out': 'logout',
  signout: 'logout',

  // Common element names
  'submit button': 'submit',
  'cancel button': 'cancel',
  'ok button': 'ok',
  'close button': 'close',
  'save button': 'save',
  'delete button': 'delete',
  'edit button': 'edit',
  'add button': 'add',
  'remove button': 'remove',
  'search button': 'search',
  'search box': 'search field',
  'search bar': 'search field',
};

/**
 * Words to remove (articles, prepositions that don't add meaning)
 */
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
  'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by',
  'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after',
  'above', 'below', 'between', 'under', 'again', 'further', 'then',
  'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each',
  'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
  'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'and',
]);

/**
 * User/Actor prefixes to remove
 */
const ACTOR_PREFIXES = [
  /^user\s+/i,
  /^the user\s+/i,
  /^i\s+/i,
  /^we\s+/i,
  /^they\s+/i,
  /^customer\s+/i,
  /^visitor\s+/i,
  /^admin\s+/i,
  /^administrator\s+/i,
];

/**
 * Normalize options
 */
export interface NormalizeOptions {
  /** Apply verb stemming */
  stemVerbs?: boolean;
  /** Expand abbreviations */
  expandAbbreviations?: boolean;
  /** Remove stop words */
  removeStopWords?: boolean;
  /** Remove actor prefixes (e.g., "user clicks" -> "click") */
  removeActorPrefixes?: boolean;
  /** Lowercase everything */
  lowercase?: boolean;
  /** Preserve quoted strings */
  preserveQuoted?: boolean;
}

const DEFAULT_OPTIONS: NormalizeOptions = {
  stemVerbs: true,
  expandAbbreviations: true,
  removeStopWords: false, // Keep stop words by default for better pattern matching
  removeActorPrefixes: true,
  lowercase: true,
  preserveQuoted: true,
};

/**
 * Stem a single word (verb normalization)
 */
export function stemWord(word: string): string {
  const lower = word.toLowerCase();
  return VERB_STEMS[lower] ?? lower;
}

/**
 * Expand abbreviations in text
 */
export function expandAbbreviations(text: string): string {
  let result = text.toLowerCase();

  // Sort by length (longest first) to avoid partial replacements
  const sorted = Object.entries(ABBREVIATION_EXPANSIONS)
    .sort(([a], [b]) => b.length - a.length);

  for (const [abbr, expansion] of sorted) {
    // Word boundary replacement
    const regex = new RegExp(`\\b${escapeRegex(abbr)}\\b`, 'gi');
    result = result.replace(regex, expansion);
  }

  return result;
}

/**
 * Escape regex special characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Remove actor prefixes from step text
 */
export function removeActorPrefixes(text: string): string {
  let result = text;
  for (const pattern of ACTOR_PREFIXES) {
    result = result.replace(pattern, '');
  }
  return result.trim();
}

/**
 * Remove stop words from text
 */
export function removeStopWords(text: string): string {
  const words = text.split(/\s+/);
  const filtered = words.filter(word => !STOP_WORDS.has(word.toLowerCase()));
  return filtered.join(' ');
}

/**
 * Extract quoted strings and replace with placeholders
 * Returns the modified text and a map of placeholders to original values
 */
function extractQuotedStrings(text: string): { text: string; quotes: Map<string, string> } {
  const quotes = new Map<string, string>();
  let placeholderIndex = 0;

  const processedText = text.replace(/(['"])([^'"]*)\1/g, (_match, quote, content) => {
    const placeholder = `__QUOTED_${placeholderIndex}__`;
    quotes.set(placeholder, `${quote}${content}${quote}`);
    placeholderIndex++;
    return placeholder;
  });

  return { text: processedText, quotes };
}

/**
 * Restore quoted strings from placeholders
 */
function restoreQuotedStrings(text: string, quotes: Map<string, string>): string {
  let result = text;
  for (const [placeholder, original] of quotes) {
    result = result.replace(placeholder, original);
  }
  return result;
}

/**
 * Enhanced step text normalization
 * Applies all normalization transformations
 */
export function normalizeStepTextEnhanced(text: string, options: NormalizeOptions = {}): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  let result = text.trim();

  // Extract quoted strings to preserve them
  let quotesMap = new Map<string, string>();
  if (opts.preserveQuoted) {
    const extracted = extractQuotedStrings(result);
    result = extracted.text;
    quotesMap = extracted.quotes;
  }

  // Remove actor prefixes first
  if (opts.removeActorPrefixes) {
    result = removeActorPrefixes(result);
  }

  // Lowercase
  if (opts.lowercase) {
    result = result.toLowerCase();
  }

  // Expand abbreviations
  if (opts.expandAbbreviations) {
    result = expandAbbreviations(result);
  }

  // Stem verbs (word by word)
  if (opts.stemVerbs) {
    const words = result.split(/\s+/);
    result = words.map(word => {
      // Don't stem placeholders or words with special chars
      if (word.startsWith('__QUOTED_') || /[^a-z]/.test(word)) {
        return word;
      }
      return stemWord(word);
    }).join(' ');
  }

  // Remove stop words (optional, off by default)
  if (opts.removeStopWords) {
    result = removeStopWords(result);
  }

  // Normalize whitespace
  result = result.replace(/\s+/g, ' ').trim();

  // Restore quoted strings
  if (opts.preserveQuoted) {
    result = restoreQuotedStrings(result, quotesMap);
  }

  return result;
}

/**
 * Get the canonical form of a step (most normalized version)
 */
export function getCanonicalForm(text: string): string {
  return normalizeStepTextEnhanced(text, {
    stemVerbs: true,
    expandAbbreviations: true,
    removeStopWords: true,
    removeActorPrefixes: true,
    lowercase: true,
    preserveQuoted: true,
  });
}

/**
 * Get a less aggressive normalization (preserves more structure)
 */
export function getLightNormalization(text: string): string {
  return normalizeStepTextEnhanced(text, {
    stemVerbs: true,
    expandAbbreviations: true,
    removeStopWords: false,
    removeActorPrefixes: true,
    lowercase: true,
    preserveQuoted: true,
  });
}

/**
 * Check if two step texts are semantically equivalent after normalization
 */
export function areStepsEquivalent(step1: string, step2: string): boolean {
  const canonical1 = getCanonicalForm(step1);
  const canonical2 = getCanonicalForm(step2);
  return canonical1 === canonical2;
}

/**
 * Get all possible normalizations of a step (for fuzzy matching)
 */
export function getAllNormalizations(text: string): string[] {
  const normalizations = new Set<string>();

  // Original (lowercased)
  normalizations.add(text.toLowerCase().trim());

  // Light normalization
  normalizations.add(getLightNormalization(text));

  // Full canonical form
  normalizations.add(getCanonicalForm(text));

  // Without actor prefix only
  normalizations.add(removeActorPrefixes(text.toLowerCase().trim()));

  return Array.from(normalizations);
}
