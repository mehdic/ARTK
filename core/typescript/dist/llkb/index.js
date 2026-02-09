import { randomUUID } from 'crypto';
import * as fsp3 from 'fs/promises';
import * as path13 from 'path';
import { join } from 'path';
import * as fs from 'fs';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { stringify } from 'yaml';

var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// llkb/pluralization.ts
function createSafeDict(entries) {
  return Object.freeze(Object.assign(/* @__PURE__ */ Object.create(null), entries));
}
function applyCasePattern(original, result) {
  if (original.length === 0) {
    return result;
  }
  if (original === original.toUpperCase() && /[A-Z]/.test(original)) {
    return result.toUpperCase();
  }
  if (original[0] === original[0].toUpperCase() && original.slice(1) === original.slice(1).toLowerCase()) {
    return result.charAt(0).toUpperCase() + result.slice(1);
  }
  return result;
}
function pluralize(word, options = {}) {
  if (typeof word !== "string") {
    return String(word);
  }
  if (word.length === 0) {
    return "";
  }
  if (word.length > MAX_WORD_LENGTH) {
    return word;
  }
  const lower = word.toLowerCase();
  if (UNCOUNTABLE_NOUNS.has(lower)) {
    return options.preserveCase ? word : lower;
  }
  if (lower in IRREGULAR_PLURALS) {
    const result2 = IRREGULAR_PLURALS[lower];
    return options.preserveCase ? applyCasePattern(word, result2) : result2;
  }
  if (lower in IRREGULAR_SINGULARS) {
    return options.preserveCase ? word : lower;
  }
  if (lower.endsWith("s") && !lower.endsWith("ss") && // 'class' needs -es
  !(lower in IRREGULAR_PLURALS)) {
    return options.preserveCase ? word : lower;
  }
  let result;
  if (lower.endsWith("y") && lower.length > 1) {
    const beforeY = lower[lower.length - 2];
    if (!"aeiou".includes(beforeY)) {
      result = lower.slice(0, -1) + "ies";
      return options.preserveCase ? applyCasePattern(word, result) : result;
    }
  }
  if (lower.endsWith("s") || lower.endsWith("x") || lower.endsWith("z") || lower.endsWith("ch") || lower.endsWith("sh")) {
    result = lower + "es";
    return options.preserveCase ? applyCasePattern(word, result) : result;
  }
  if (lower.endsWith("f") && !lower.endsWith("ff") && !lower.endsWith("ief") && !lower.endsWith("oof") && !lower.endsWith("eef")) {
    result = lower.slice(0, -1) + "ves";
    return options.preserveCase ? applyCasePattern(word, result) : result;
  }
  if (lower.endsWith("fe")) {
    result = lower.slice(0, -2) + "ves";
    return options.preserveCase ? applyCasePattern(word, result) : result;
  }
  if (lower.endsWith("o") && lower.length > 1) {
    const beforeO = lower[lower.length - 2];
    if (!"aeiou".includes(beforeO)) {
      result = lower + "es";
      return options.preserveCase ? applyCasePattern(word, result) : result;
    }
  }
  result = lower + "s";
  return options.preserveCase ? applyCasePattern(word, result) : result;
}
function singularize(word, options = {}) {
  if (typeof word !== "string") {
    return String(word);
  }
  if (word.length === 0) {
    return "";
  }
  if (word.length > MAX_WORD_LENGTH) {
    return word;
  }
  const lower = word.toLowerCase();
  if (UNCOUNTABLE_NOUNS.has(lower)) {
    return options.preserveCase ? word : lower;
  }
  if (lower in IRREGULAR_SINGULARS) {
    const result2 = IRREGULAR_SINGULARS[lower];
    return options.preserveCase ? applyCasePattern(word, result2) : result2;
  }
  let result;
  if (lower.endsWith("ies") && lower.length > 3) {
    result = lower.slice(0, -3) + "y";
    return options.preserveCase ? applyCasePattern(word, result) : result;
  }
  if (lower.endsWith("ves")) {
    const stem = lower.slice(0, -3);
    if (stem.endsWith("l") || stem.endsWith("r") || stem.endsWith("n") || stem.endsWith("a") || stem.endsWith("o")) {
      result = stem + "f";
    } else {
      result = stem + "fe";
    }
    return options.preserveCase ? applyCasePattern(word, result) : result;
  }
  if (lower.endsWith("zzes")) {
    result = lower.slice(0, -2);
    return options.preserveCase ? applyCasePattern(word, result) : result;
  }
  if (lower.endsWith("es")) {
    const stem = lower.slice(0, -2);
    if (stem.endsWith("ss") || // class -> classes
    stem.endsWith("x") || // box -> boxes
    stem.endsWith("z") || // quiz -> quizzes (but handled above for -zz)
    stem.endsWith("ch") || // watch -> watches
    stem.endsWith("sh") || // wish -> wishes
    stem.endsWith("o")) {
      return options.preserveCase ? applyCasePattern(word, stem) : stem;
    }
    if (stem.endsWith("s") && !stem.endsWith("ss")) {
      return options.preserveCase ? applyCasePattern(word, stem) : stem;
    }
  }
  if (lower.endsWith("s") && lower.length > 1 && !lower.endsWith("ss")) {
    result = lower.slice(0, -1);
    return options.preserveCase ? applyCasePattern(word, result) : result;
  }
  return options.preserveCase ? word : lower;
}
function getSingularPlural(word) {
  if (typeof word !== "string" || word.length === 0) {
    return { singular: "", plural: "" };
  }
  const lower = word.toLowerCase();
  if (UNCOUNTABLE_NOUNS.has(lower)) {
    return { singular: lower, plural: lower };
  }
  if (lower in IRREGULAR_SINGULARS) {
    return {
      singular: IRREGULAR_SINGULARS[lower],
      plural: lower
    };
  }
  if (lower in IRREGULAR_PLURALS) {
    return {
      singular: lower,
      plural: IRREGULAR_PLURALS[lower]
    };
  }
  const singular = singularize(lower);
  const plural = pluralize(singular);
  return { singular, plural };
}
function isUncountable(word) {
  if (typeof word !== "string") {
    return false;
  }
  return UNCOUNTABLE_NOUNS.has(word.toLowerCase());
}
var MAX_WORD_LENGTH, UNCOUNTABLE_NOUNS, IRREGULAR_PLURALS, IRREGULAR_SINGULARS;
var init_pluralization = __esm({
  "llkb/pluralization.ts"() {
    MAX_WORD_LENGTH = 100;
    UNCOUNTABLE_NOUNS = Object.freeze(
      /* @__PURE__ */ new Set([
        // Abstract concepts
        "advice",
        "information",
        "knowledge",
        "wisdom",
        "intelligence",
        "evidence",
        "research",
        "progress",
        "happiness",
        "sadness",
        "luck",
        "fun",
        // Materials and substances
        "water",
        "air",
        "oil",
        // Note: 'gas' removed - it has a plural form 'gases' (e.g., "noble gases")
        "milk",
        "rice",
        "bread",
        "sugar",
        "salt",
        "flour",
        "gold",
        "silver",
        "iron",
        "wood",
        "paper",
        "glass",
        "plastic",
        "cotton",
        "wool",
        // Tech/software terms
        "software",
        "hardware",
        "firmware",
        "malware",
        "freeware",
        "shareware",
        "middleware",
        // Note: 'data' is in IRREGULAR_PLURALS (datum/data), not here
        // Note: 'metadata' follows 'data' pattern
        "feedback",
        "bandwidth",
        "traffic",
        "spam",
        "code",
        // Usually uncountable in tech context
        // Other uncountables
        "equipment",
        "furniture",
        "luggage",
        "baggage",
        "clothing",
        "weather",
        "news",
        "homework",
        "housework",
        "money",
        "cash",
        "music",
        "art",
        "poetry",
        "literature",
        "electricity",
        "heat",
        "light",
        "darkness",
        "space",
        "time",
        "work",
        "travel",
        "accommodation",
        "scenery",
        "machinery",
        "jewelry",
        "rubbish",
        "garbage",
        "trash",
        "stuff",
        // Words same in singular and plural
        "sheep",
        "fish",
        "deer",
        "moose",
        "swine",
        "buffalo",
        "shrimp",
        "trout",
        "salmon",
        "squid",
        "aircraft",
        "spacecraft",
        "hovercraft",
        "series",
        "species",
        "means",
        "offspring",
        "chassis",
        "corps",
        "swiss"
      ])
    );
    IRREGULAR_PLURALS = createSafeDict({
      // People
      person: "people",
      child: "children",
      man: "men",
      woman: "women",
      // Body parts
      tooth: "teeth",
      foot: "feet",
      // Animals
      mouse: "mice",
      goose: "geese",
      ox: "oxen",
      // -f/-fe to -ves
      leaf: "leaves",
      life: "lives",
      knife: "knives",
      wife: "wives",
      half: "halves",
      shelf: "shelves",
      self: "selves",
      // From template-generators.ts
      calf: "calves",
      loaf: "loaves",
      // -o to -oes
      potato: "potatoes",
      tomato: "tomatoes",
      hero: "heroes",
      echo: "echoes",
      embargo: "embargoes",
      // From mining.ts
      veto: "vetoes",
      // From mining.ts
      cargo: "cargoes",
      // From template-generators.ts
      // Latin/Greek (-is to -es)
      analysis: "analyses",
      basis: "bases",
      crisis: "crises",
      diagnosis: "diagnoses",
      // From mining.ts
      hypothesis: "hypotheses",
      // From mining.ts
      oasis: "oases",
      // From mining.ts
      parenthesis: "parentheses",
      // From mining.ts
      synopsis: "synopses",
      // From mining.ts
      thesis: "theses",
      // Latin/Greek (-on/-um to -a)
      criterion: "criteria",
      phenomenon: "phenomena",
      datum: "data",
      medium: "media",
      curriculum: "curricula",
      // From mining.ts
      memorandum: "memoranda",
      // From mining.ts
      // Latin (-us to -i)
      stimulus: "stimuli",
      // From mining.ts
      syllabus: "syllabi",
      // From mining.ts
      focus: "foci",
      // From mining.ts
      fungus: "fungi",
      // From mining.ts
      cactus: "cacti",
      // From mining.ts
      // Latin (-ix/-ex to -ices)
      appendix: "appendices",
      index: "indices",
      matrix: "matrices",
      vertex: "vertices",
      // From template-generators.ts
      // Special cases
      status: "statuses",
      // From template-generators.ts
      quiz: "quizzes",
      // From template-generators.ts
      // Singular nouns ending in 's' that need -es (would be caught by "already plural" check)
      bus: "buses",
      gas: "gases",
      lens: "lenses",
      atlas: "atlases",
      iris: "irises",
      plus: "pluses",
      minus: "minuses",
      bonus: "bonuses",
      campus: "campuses",
      caucus: "caucuses",
      census: "censuses",
      citrus: "citruses",
      circus: "circuses",
      corpus: "corpora",
      // Latin plural
      genus: "genera",
      // Latin plural
      radius: "radii",
      // Latin plural
      nexus: "nexuses",
      sinus: "sinuses",
      surplus: "surpluses",
      virus: "viruses"
    });
    IRREGULAR_SINGULARS = createSafeDict(
      Object.fromEntries(
        Object.entries(IRREGULAR_PLURALS).map(([singular, plural]) => [plural, singular])
      )
    );
  }
});

// llkb/template-generators.ts
var template_generators_exports = {};
__export(template_generators_exports, {
  CRUD_TEMPLATES: () => CRUD_TEMPLATES,
  EXTENDED_NAVIGATION_TEMPLATES: () => EXTENDED_NAVIGATION_TEMPLATES,
  FORM_TEMPLATES: () => FORM_TEMPLATES,
  MODAL_TEMPLATES: () => MODAL_TEMPLATES,
  NOTIFICATION_TEMPLATES: () => NOTIFICATION_TEMPLATES,
  TABLE_TEMPLATES: () => TABLE_TEMPLATES,
  createEntity: () => createEntity,
  createForm: () => createForm,
  createModal: () => createModal,
  createRoute: () => createRoute,
  createTable: () => createTable,
  generateAllPatterns: () => generateAllPatterns,
  generateCrudPatterns: () => generateCrudPatterns,
  generateFormPatterns: () => generateFormPatterns,
  generateModalPatterns: () => generateModalPatterns,
  generateNavigationPatterns: () => generateNavigationPatterns2,
  generateNotificationPatterns: () => generateNotificationPatterns,
  generateTablePatterns: () => generateTablePatterns
});
function generatePatternId2() {
  return `DP-${randomUUID().slice(0, 8)}`;
}
function expandEntityTemplate(template, entity, confidence = DEFAULT_GENERATED_CONFIDENCE) {
  const patterns = [];
  if (template.placeholders.includes("entity")) {
    const text = template.text.replace("{entity}", entity.singular);
    patterns.push(createPattern(template, text, entity.singular, confidence));
  }
  if (template.placeholders.includes("entities")) {
    const text = template.text.replace("{entities}", entity.plural);
    patterns.push(createPattern(template, text, entity.plural, confidence));
  }
  return patterns;
}
function expandFormTemplate(template, form, confidence = DEFAULT_GENERATED_CONFIDENCE) {
  const patterns = [];
  if (template.placeholders.includes("form") && !template.placeholders.includes("field")) {
    const text = template.text.replace("{form}", form.name);
    const selectorHints = [];
    if (form.submitSelector && template.text.includes("submit")) {
      selectorHints.push({
        strategy: "css",
        value: form.submitSelector,
        confidence: confidence + SELECTOR_CONFIDENCE_BOOST
      });
    }
    patterns.push(createPattern(template, text, form.name, confidence, selectorHints));
  }
  if (template.placeholders.includes("field")) {
    for (const field of form.fields) {
      let text = template.text.replace("{field}", field.label || field.name);
      if (template.placeholders.includes("form")) {
        text = text.replace("{form}", form.name);
      }
      const selectorHints = [];
      if (field.selector) {
        selectorHints.push({
          strategy: "css",
          value: field.selector,
          confidence: confidence + SELECTOR_CONFIDENCE_BOOST
        });
      }
      patterns.push(createPattern(template, text, field.name, confidence, selectorHints));
    }
  }
  return patterns;
}
function expandTableTemplate(template, table, confidence = DEFAULT_GENERATED_CONFIDENCE) {
  const patterns = [];
  if (template.placeholders.includes("table") && !template.placeholders.includes("column")) {
    const text = template.text.replace("{table}", table.name);
    const selectorHints = [];
    if (table.selectors?.table) {
      selectorHints.push({
        strategy: "css",
        value: table.selectors.table,
        confidence: confidence + SELECTOR_CONFIDENCE_BOOST
      });
    }
    patterns.push(createPattern(template, text, table.name, confidence, selectorHints));
  }
  if (template.placeholders.includes("column")) {
    for (const column of table.columns) {
      let text = template.text.replace("{column}", column);
      if (template.placeholders.includes("table")) {
        text = text.replace("{table}", table.name);
      }
      const selectorHints = [];
      if (table.selectors?.header) {
        selectorHints.push({
          strategy: "css",
          value: `${table.selectors.header}:has-text("${column}")`,
          confidence: confidence + SELECTOR_CONFIDENCE_BOOST * 0.5
        });
      }
      patterns.push(createPattern(template, text, column, confidence, selectorHints));
    }
  }
  return patterns;
}
function expandModalTemplate(template, modal, confidence = DEFAULT_GENERATED_CONFIDENCE) {
  const patterns = [];
  if (template.placeholders.includes("modal")) {
    const text = template.text.replace("{modal}", modal.name);
    const selectorHints = [];
    if (template.text.includes("open") && modal.triggerSelector) {
      selectorHints.push({
        strategy: "css",
        value: modal.triggerSelector,
        confidence: confidence + SELECTOR_CONFIDENCE_BOOST
      });
    } else if (template.text.includes("close") && modal.closeSelector) {
      selectorHints.push({
        strategy: "css",
        value: modal.closeSelector,
        confidence: confidence + SELECTOR_CONFIDENCE_BOOST
      });
    } else if ((template.text.includes("confirm") || template.text.includes("OK") || template.text.includes("Yes")) && modal.confirmSelector) {
      selectorHints.push({
        strategy: "css",
        value: modal.confirmSelector,
        confidence: confidence + SELECTOR_CONFIDENCE_BOOST
      });
    }
    patterns.push(createPattern(template, text, modal.name, confidence, selectorHints));
  }
  return patterns;
}
function expandRouteTemplate(template, route, confidence = DEFAULT_GENERATED_CONFIDENCE) {
  const patterns = [];
  if (template.placeholders.includes("route")) {
    const text = template.text.replace("{route}", route.name);
    const selectorHints = [];
    if (template.primitive === "navigate") {
      selectorHints.push({
        strategy: "text",
        value: route.name,
        confidence
      });
    }
    patterns.push(createPattern(template, text, route.name, confidence, selectorHints));
  }
  return patterns;
}
function createPattern(template, text, entityName, confidence, selectorHints = []) {
  return {
    id: generatePatternId2(),
    normalizedText: text.toLowerCase(),
    originalText: text,
    mappedPrimitive: template.primitive,
    selectorHints,
    confidence: Math.min(confidence, MAX_CONFIDENCE2),
    layer: "app-specific",
    category: template.category,
    sourceJourneys: [],
    successCount: 0,
    failCount: 0,
    templateSource: template.templateSource,
    entityName: entityName || void 0
  };
}
function generateCrudPatterns(entities, confidence = DEFAULT_GENERATED_CONFIDENCE) {
  const patterns = [];
  for (const entity of entities) {
    for (const template of CRUD_TEMPLATES) {
      patterns.push(...expandEntityTemplate(template, entity, confidence));
    }
  }
  return patterns;
}
function generateFormPatterns(forms, confidence = DEFAULT_GENERATED_CONFIDENCE) {
  const patterns = [];
  for (const form of forms) {
    for (const template of FORM_TEMPLATES) {
      patterns.push(...expandFormTemplate(template, form, confidence));
    }
  }
  return patterns;
}
function generateTablePatterns(tables, confidence = DEFAULT_GENERATED_CONFIDENCE) {
  const patterns = [];
  for (const table of tables) {
    for (const template of TABLE_TEMPLATES) {
      patterns.push(...expandTableTemplate(template, table, confidence));
    }
  }
  return patterns;
}
function generateModalPatterns(modals, confidence = DEFAULT_GENERATED_CONFIDENCE) {
  const patterns = [];
  for (const modal of modals) {
    for (const template of MODAL_TEMPLATES) {
      patterns.push(...expandModalTemplate(template, modal, confidence));
    }
  }
  return patterns;
}
function generateNavigationPatterns2(routes, confidence = DEFAULT_GENERATED_CONFIDENCE) {
  const patterns = [];
  const addedGenericPatterns = /* @__PURE__ */ new Set();
  for (const route of routes) {
    for (const template of EXTENDED_NAVIGATION_TEMPLATES) {
      if (template.placeholders.length === 0) {
        if (!addedGenericPatterns.has(template.text)) {
          patterns.push(createPattern(template, template.text, "", confidence, []));
          addedGenericPatterns.add(template.text);
        }
      } else {
        patterns.push(...expandRouteTemplate(template, route, confidence));
      }
    }
  }
  return patterns;
}
function generateNotificationPatterns(confidence = DEFAULT_GENERATED_CONFIDENCE) {
  return NOTIFICATION_TEMPLATES.map((template) => createPattern(
    template,
    template.text,
    "",
    confidence,
    []
  ));
}
function generateAllPatterns(elements, confidence = DEFAULT_GENERATED_CONFIDENCE) {
  const crudPatterns = generateCrudPatterns(elements.entities, confidence);
  const formPatterns = generateFormPatterns(elements.forms, confidence);
  const tablePatterns = generateTablePatterns(elements.tables, confidence);
  const modalPatterns = generateModalPatterns(elements.modals, confidence);
  const navigationPatterns = generateNavigationPatterns2(elements.routes, confidence);
  const notificationPatterns = generateNotificationPatterns(confidence);
  let allPatterns = [
    ...crudPatterns,
    ...formPatterns,
    ...tablePatterns,
    ...modalPatterns,
    ...navigationPatterns,
    ...notificationPatterns
  ];
  if (allPatterns.length > MAX_GENERATED_PATTERNS) {
    allPatterns.sort((a, b) => b.confidence - a.confidence);
    allPatterns = allPatterns.slice(0, MAX_GENERATED_PATTERNS);
  }
  return {
    patterns: allPatterns,
    stats: {
      crudPatterns: crudPatterns.length,
      formPatterns: formPatterns.length,
      tablePatterns: tablePatterns.length,
      modalPatterns: modalPatterns.length,
      navigationPatterns: navigationPatterns.length,
      notificationPatterns: notificationPatterns.length,
      totalPatterns: allPatterns.length
    }
  };
}
function createEntity(name) {
  const lower = name.toLowerCase();
  const likelySingular = singularize(lower);
  const likelyPlural = pluralize(likelySingular);
  const singular = likelySingular;
  const plural = likelyPlural;
  return {
    name,
    singular,
    plural
  };
}
function createForm(name, fields = []) {
  return {
    id: `form-${name.toLowerCase().replace(/\s+/g, "-")}`,
    name,
    fields: fields.map((f) => ({
      name: f.toLowerCase().replace(/\s+/g, "_"),
      type: "text",
      label: f
    }))
  };
}
function createTable(name, columns = []) {
  return {
    id: `table-${name.toLowerCase().replace(/\s+/g, "-")}`,
    name,
    columns
  };
}
function createModal(name) {
  return {
    id: `modal-${name.toLowerCase().replace(/\s+/g, "-")}`,
    name
  };
}
function createRoute(path17, name) {
  const routeName = name || path17.split("/").filter(Boolean).pop() || "home";
  return {
    path: path17,
    name: routeName.charAt(0).toUpperCase() + routeName.slice(1)
  };
}
var DEFAULT_GENERATED_CONFIDENCE, SELECTOR_CONFIDENCE_BOOST, MAX_CONFIDENCE2, MAX_GENERATED_PATTERNS, CRUD_TEMPLATES, FORM_TEMPLATES, TABLE_TEMPLATES, MODAL_TEMPLATES, EXTENDED_NAVIGATION_TEMPLATES, NOTIFICATION_TEMPLATES;
var init_template_generators = __esm({
  "llkb/template-generators.ts"() {
    init_pluralization();
    DEFAULT_GENERATED_CONFIDENCE = 0.7;
    SELECTOR_CONFIDENCE_BOOST = 0.15;
    MAX_CONFIDENCE2 = 0.95;
    MAX_GENERATED_PATTERNS = 2e3;
    CRUD_TEMPLATES = [
      // Create operations
      { text: "create new {entity}", primitive: "click", placeholders: ["entity"], category: "data", templateSource: "crud" },
      { text: "add {entity}", primitive: "click", placeholders: ["entity"], category: "data", templateSource: "crud" },
      { text: "click add {entity} button", primitive: "click", placeholders: ["entity"], category: "data", templateSource: "crud" },
      { text: "click create {entity} button", primitive: "click", placeholders: ["entity"], category: "data", templateSource: "crud" },
      { text: "open new {entity} form", primitive: "click", placeholders: ["entity"], category: "data", templateSource: "crud" },
      // Read operations
      { text: "view {entity} details", primitive: "click", placeholders: ["entity"], category: "data", templateSource: "crud" },
      { text: "open {entity}", primitive: "click", placeholders: ["entity"], category: "data", templateSource: "crud" },
      { text: "click on {entity}", primitive: "click", placeholders: ["entity"], category: "data", templateSource: "crud" },
      { text: "select {entity} from list", primitive: "click", placeholders: ["entity"], category: "data", templateSource: "crud" },
      { text: "view {entity} list", primitive: "navigate", placeholders: ["entity"], category: "data", templateSource: "crud" },
      // Update operations
      { text: "edit {entity}", primitive: "click", placeholders: ["entity"], category: "data", templateSource: "crud" },
      { text: "update {entity}", primitive: "click", placeholders: ["entity"], category: "data", templateSource: "crud" },
      { text: "modify {entity}", primitive: "click", placeholders: ["entity"], category: "data", templateSource: "crud" },
      { text: "click edit {entity} button", primitive: "click", placeholders: ["entity"], category: "data", templateSource: "crud" },
      { text: "save {entity} changes", primitive: "click", placeholders: ["entity"], category: "data", templateSource: "crud" },
      // Delete operations
      { text: "delete {entity}", primitive: "click", placeholders: ["entity"], category: "data", templateSource: "crud" },
      { text: "remove {entity}", primitive: "click", placeholders: ["entity"], category: "data", templateSource: "crud" },
      { text: "click delete {entity} button", primitive: "click", placeholders: ["entity"], category: "data", templateSource: "crud" },
      { text: "confirm {entity} deletion", primitive: "click", placeholders: ["entity"], category: "data", templateSource: "crud" },
      { text: "cancel {entity} deletion", primitive: "click", placeholders: ["entity"], category: "data", templateSource: "crud" },
      // Search/filter operations
      { text: "search for {entity}", primitive: "fill", placeholders: ["entity"], category: "data", templateSource: "crud" },
      { text: "filter {entities}", primitive: "fill", placeholders: ["entities"], category: "data", templateSource: "crud" },
      { text: "clear {entity} filter", primitive: "click", placeholders: ["entity"], category: "data", templateSource: "crud" }
    ];
    FORM_TEMPLATES = [
      // Form interactions
      { text: "fill {form} form", primitive: "fill", placeholders: ["form"], category: "data", templateSource: "form" },
      { text: "submit {form} form", primitive: "click", placeholders: ["form"], category: "data", templateSource: "form" },
      { text: "cancel {form} form", primitive: "click", placeholders: ["form"], category: "data", templateSource: "form" },
      { text: "reset {form} form", primitive: "click", placeholders: ["form"], category: "data", templateSource: "form" },
      { text: "clear {form} form", primitive: "click", placeholders: ["form"], category: "data", templateSource: "form" },
      // Field operations
      { text: "enter {field} in {form}", primitive: "fill", placeholders: ["field", "form"], category: "data", templateSource: "form" },
      { text: "fill in {field}", primitive: "fill", placeholders: ["field"], category: "data", templateSource: "form" },
      { text: "select {field} option", primitive: "click", placeholders: ["field"], category: "data", templateSource: "form" },
      { text: "check {field} checkbox", primitive: "check", placeholders: ["field"], category: "data", templateSource: "form" },
      { text: "uncheck {field} checkbox", primitive: "uncheck", placeholders: ["field"], category: "data", templateSource: "form" },
      { text: "toggle {field}", primitive: "click", placeholders: ["field"], category: "data", templateSource: "form" },
      { text: "upload file to {field}", primitive: "upload", placeholders: ["field"], category: "data", templateSource: "form" },
      { text: "clear {field} field", primitive: "clear", placeholders: ["field"], category: "data", templateSource: "form" },
      // Validation
      { text: "verify {field} error message", primitive: "assert", placeholders: ["field"], category: "assertion", templateSource: "form" },
      { text: "verify {form} validation error", primitive: "assert", placeholders: ["form"], category: "assertion", templateSource: "form" },
      { text: "verify {field} is required", primitive: "assert", placeholders: ["field"], category: "assertion", templateSource: "form" },
      { text: "verify {form} submitted successfully", primitive: "assert", placeholders: ["form"], category: "assertion", templateSource: "form" }
    ];
    TABLE_TEMPLATES = [
      // Row operations
      { text: "click row in {table}", primitive: "click", placeholders: ["table"], category: "ui-interaction", templateSource: "table" },
      { text: "select row in {table}", primitive: "click", placeholders: ["table"], category: "ui-interaction", templateSource: "table" },
      { text: "double-click row in {table}", primitive: "dblclick", placeholders: ["table"], category: "ui-interaction", templateSource: "table" },
      { text: "expand row in {table}", primitive: "click", placeholders: ["table"], category: "ui-interaction", templateSource: "table" },
      { text: "collapse row in {table}", primitive: "click", placeholders: ["table"], category: "ui-interaction", templateSource: "table" },
      { text: "hover over row in {table}", primitive: "hover", placeholders: ["table"], category: "ui-interaction", templateSource: "table" },
      // Column operations
      { text: "sort {column} column in {table}", primitive: "click", placeholders: ["column", "table"], category: "ui-interaction", templateSource: "table" },
      { text: "sort {table} by {column}", primitive: "click", placeholders: ["table", "column"], category: "ui-interaction", templateSource: "table" },
      { text: "filter {column} in {table}", primitive: "fill", placeholders: ["column", "table"], category: "ui-interaction", templateSource: "table" },
      { text: "resize {column} column", primitive: "drag", placeholders: ["column"], category: "ui-interaction", templateSource: "table" },
      { text: "hide {column} column", primitive: "click", placeholders: ["column"], category: "ui-interaction", templateSource: "table" },
      { text: "show {column} column", primitive: "click", placeholders: ["column"], category: "ui-interaction", templateSource: "table" },
      // Pagination
      { text: "go to next page in {table}", primitive: "click", placeholders: ["table"], category: "ui-interaction", templateSource: "table" },
      { text: "go to previous page in {table}", primitive: "click", placeholders: ["table"], category: "ui-interaction", templateSource: "table" },
      { text: "go to page {page} in {table}", primitive: "click", placeholders: ["page", "table"], category: "ui-interaction", templateSource: "table" },
      { text: "change page size in {table}", primitive: "click", placeholders: ["table"], category: "ui-interaction", templateSource: "table" },
      // Cell operations
      { text: "edit cell in {table}", primitive: "dblclick", placeholders: ["table"], category: "ui-interaction", templateSource: "table" },
      { text: "click cell in {table}", primitive: "click", placeholders: ["table"], category: "ui-interaction", templateSource: "table" },
      // Selection
      { text: "select all rows in {table}", primitive: "click", placeholders: ["table"], category: "ui-interaction", templateSource: "table" },
      { text: "deselect all rows in {table}", primitive: "click", placeholders: ["table"], category: "ui-interaction", templateSource: "table" },
      // Assertions
      { text: "verify {table} has {count} rows", primitive: "assert", placeholders: ["table", "count"], category: "assertion", templateSource: "table" },
      { text: "verify {table} contains {text}", primitive: "assert", placeholders: ["table", "text"], category: "assertion", templateSource: "table" },
      { text: "verify {table} is empty", primitive: "assert", placeholders: ["table"], category: "assertion", templateSource: "table" },
      { text: "verify {column} is sorted", primitive: "assert", placeholders: ["column"], category: "assertion", templateSource: "table" }
    ];
    MODAL_TEMPLATES = [
      // Open/close
      { text: "open {modal} modal", primitive: "click", placeholders: ["modal"], category: "ui-interaction", templateSource: "modal" },
      { text: "open {modal} dialog", primitive: "click", placeholders: ["modal"], category: "ui-interaction", templateSource: "modal" },
      { text: "close {modal} modal", primitive: "click", placeholders: ["modal"], category: "ui-interaction", templateSource: "modal" },
      { text: "close {modal} dialog", primitive: "click", placeholders: ["modal"], category: "ui-interaction", templateSource: "modal" },
      { text: "dismiss {modal}", primitive: "click", placeholders: ["modal"], category: "ui-interaction", templateSource: "modal" },
      // Actions
      { text: "confirm {modal}", primitive: "click", placeholders: ["modal"], category: "ui-interaction", templateSource: "modal" },
      { text: "cancel {modal}", primitive: "click", placeholders: ["modal"], category: "ui-interaction", templateSource: "modal" },
      { text: "click OK in {modal}", primitive: "click", placeholders: ["modal"], category: "ui-interaction", templateSource: "modal" },
      { text: "click Cancel in {modal}", primitive: "click", placeholders: ["modal"], category: "ui-interaction", templateSource: "modal" },
      { text: "click Yes in {modal}", primitive: "click", placeholders: ["modal"], category: "ui-interaction", templateSource: "modal" },
      { text: "click No in {modal}", primitive: "click", placeholders: ["modal"], category: "ui-interaction", templateSource: "modal" },
      { text: "submit {modal}", primitive: "click", placeholders: ["modal"], category: "ui-interaction", templateSource: "modal" },
      // Close methods
      { text: "press Escape to close {modal}", primitive: "keyboard", placeholders: ["modal"], category: "ui-interaction", templateSource: "modal" },
      { text: "click outside {modal} to close", primitive: "click", placeholders: ["modal"], category: "ui-interaction", templateSource: "modal" },
      { text: "click backdrop to close {modal}", primitive: "click", placeholders: ["modal"], category: "ui-interaction", templateSource: "modal" },
      // Assertions
      { text: "verify {modal} is open", primitive: "assert", placeholders: ["modal"], category: "assertion", templateSource: "modal" },
      { text: "verify {modal} is closed", primitive: "assert", placeholders: ["modal"], category: "assertion", templateSource: "modal" },
      { text: "verify {modal} contains {text}", primitive: "assert", placeholders: ["modal", "text"], category: "assertion", templateSource: "modal" },
      { text: "verify {modal} title is {title}", primitive: "assert", placeholders: ["modal", "title"], category: "assertion", templateSource: "modal" }
    ];
    EXTENDED_NAVIGATION_TEMPLATES = [
      // Direct navigation
      { text: "navigate to {route}", primitive: "navigate", placeholders: ["route"], category: "navigation", templateSource: "navigation" },
      { text: "go to {route}", primitive: "navigate", placeholders: ["route"], category: "navigation", templateSource: "navigation" },
      { text: "open {route} page", primitive: "navigate", placeholders: ["route"], category: "navigation", templateSource: "navigation" },
      { text: "visit {route}", primitive: "navigate", placeholders: ["route"], category: "navigation", templateSource: "navigation" },
      // Menu/sidebar navigation
      { text: "click {route} in navigation", primitive: "click", placeholders: ["route"], category: "navigation", templateSource: "navigation" },
      { text: "click {route} in sidebar", primitive: "click", placeholders: ["route"], category: "navigation", templateSource: "navigation" },
      { text: "click {route} in menu", primitive: "click", placeholders: ["route"], category: "navigation", templateSource: "navigation" },
      { text: "select {route} from menu", primitive: "click", placeholders: ["route"], category: "navigation", templateSource: "navigation" },
      { text: "expand {route} menu", primitive: "click", placeholders: ["route"], category: "navigation", templateSource: "navigation" },
      { text: "collapse {route} menu", primitive: "click", placeholders: ["route"], category: "navigation", templateSource: "navigation" },
      // Breadcrumb navigation
      { text: "click {route} in breadcrumb", primitive: "click", placeholders: ["route"], category: "navigation", templateSource: "navigation" },
      { text: "navigate via breadcrumb to {route}", primitive: "click", placeholders: ["route"], category: "navigation", templateSource: "navigation" },
      // Tab navigation
      { text: "click {route} tab", primitive: "click", placeholders: ["route"], category: "navigation", templateSource: "navigation" },
      { text: "switch to {route} tab", primitive: "click", placeholders: ["route"], category: "navigation", templateSource: "navigation" },
      // Header/footer navigation
      { text: "click {route} in header", primitive: "click", placeholders: ["route"], category: "navigation", templateSource: "navigation" },
      { text: "click {route} in footer", primitive: "click", placeholders: ["route"], category: "navigation", templateSource: "navigation" },
      // Back/forward
      { text: "go back", primitive: "navigate", placeholders: [], category: "navigation", templateSource: "navigation" },
      { text: "go forward", primitive: "navigate", placeholders: [], category: "navigation", templateSource: "navigation" },
      { text: "return to {route}", primitive: "navigate", placeholders: ["route"], category: "navigation", templateSource: "navigation" },
      // Assertions
      { text: "verify on {route} page", primitive: "assert", placeholders: ["route"], category: "assertion", templateSource: "navigation" },
      { text: "verify URL contains {route}", primitive: "assert", placeholders: ["route"], category: "assertion", templateSource: "navigation" },
      { text: "verify {route} is active in navigation", primitive: "assert", placeholders: ["route"], category: "assertion", templateSource: "navigation" }
    ];
    NOTIFICATION_TEMPLATES = [
      // Toast/notification appearance
      { text: "a success notification appears", primitive: "assert", placeholders: [], category: "assertion", templateSource: "static" },
      { text: "an error notification appears", primitive: "assert", placeholders: [], category: "assertion", templateSource: "static" },
      { text: "a warning notification appears", primitive: "assert", placeholders: [], category: "assertion", templateSource: "static" },
      { text: "an info notification appears", primitive: "assert", placeholders: [], category: "assertion", templateSource: "static" },
      { text: "a toast message appears", primitive: "assert", placeholders: [], category: "assertion", templateSource: "static" },
      { text: "a notification with text {text} appears", primitive: "assert", placeholders: ["text"], category: "assertion", templateSource: "static" },
      // Toast/notification content
      { text: "verify success message is displayed", primitive: "assert", placeholders: [], category: "assertion", templateSource: "static" },
      { text: "verify error message is displayed", primitive: "assert", placeholders: [], category: "assertion", templateSource: "static" },
      { text: "verify notification contains {text}", primitive: "assert", placeholders: ["text"], category: "assertion", templateSource: "static" },
      { text: "verify toast shows {text}", primitive: "assert", placeholders: ["text"], category: "assertion", templateSource: "static" },
      // Dismiss/close
      { text: "dismiss notification", primitive: "click", placeholders: [], category: "ui-interaction", templateSource: "static" },
      { text: "close toast", primitive: "click", placeholders: [], category: "ui-interaction", templateSource: "static" },
      { text: "dismiss all notifications", primitive: "click", placeholders: [], category: "ui-interaction", templateSource: "static" },
      // Wait for
      { text: "wait for notification to appear", primitive: "waitForVisible", placeholders: [], category: "timing", templateSource: "static" },
      { text: "wait for toast to disappear", primitive: "waitForVisible", placeholders: [], category: "timing", templateSource: "static" },
      { text: "wait for notification to close", primitive: "waitForVisible", placeholders: [], category: "timing", templateSource: "static" },
      // Alert dialogs
      { text: "verify alert message contains {text}", primitive: "assert", placeholders: ["text"], category: "assertion", templateSource: "static" },
      { text: "accept alert dialog", primitive: "click", placeholders: [], category: "ui-interaction", templateSource: "static" },
      { text: "dismiss alert dialog", primitive: "click", placeholders: [], category: "ui-interaction", templateSource: "static" },
      { text: "verify alert is shown", primitive: "assert", placeholders: [], category: "assertion", templateSource: "static" }
    ];
  }
});

// llkb/mining-cache.ts
var mining_cache_exports = {};
__export(mining_cache_exports, {
  MiningCache: () => MiningCache,
  SOURCE_DIRECTORIES: () => SOURCE_DIRECTORIES,
  createCacheFromFiles: () => createCacheFromFiles,
  scanAllSourceDirectories: () => scanAllSourceDirectories,
  scanDirectory: () => scanDirectory
});
async function scanDirectory(dir, cache, options = {}) {
  const maxDepth = options.maxDepth ?? 15;
  const maxFiles = options.maxFiles ?? 3e3;
  const extensions = options.extensions ?? DEFAULT_EXTENSIONS2;
  const files = [];
  async function scanRecursive(currentDir, depth) {
    if (depth > maxDepth || files.length >= maxFiles) {
      return;
    }
    let entries;
    try {
      entries = await fsp3.readdir(currentDir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (files.length >= maxFiles) {
        break;
      }
      const fullPath = path13.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith(".") && entry.name !== "node_modules" && entry.name !== "dist" && entry.name !== "build" && entry.name !== "coverage" && entry.name !== "__pycache__" && entry.name !== ".git" && entry.name !== ".svn" && !entry.isSymbolicLink()) {
          await scanRecursive(fullPath, depth + 1);
        }
      } else if (entry.isFile() && extensions.some((ext) => entry.name.endsWith(ext))) {
        if (entry.isSymbolicLink()) {
          continue;
        }
        const content = await cache.getContent(fullPath);
        if (content !== null) {
          files.push({ path: fullPath, content });
        }
      }
    }
  }
  await scanRecursive(dir, 0);
  return files;
}
async function scanAllSourceDirectories(projectRoot, cache, options = {}) {
  const resolvedRoot = path13.resolve(projectRoot);
  const allFiles = [];
  const seenPaths = /* @__PURE__ */ new Set();
  for (const dir of SOURCE_DIRECTORIES) {
    const fullPath = path13.join(resolvedRoot, dir);
    const resolvedPath = path13.resolve(fullPath);
    if (!resolvedPath.startsWith(resolvedRoot + path13.sep) && resolvedPath !== resolvedRoot) {
      continue;
    }
    try {
      const stat = await fsp3.lstat(fullPath);
      if (stat.isSymbolicLink() || !stat.isDirectory()) {
        continue;
      }
    } catch {
      continue;
    }
    const files = await scanDirectory(fullPath, cache, options);
    for (const file of files) {
      if (!seenPaths.has(file.path)) {
        seenPaths.add(file.path);
        allFiles.push(file);
      }
    }
  }
  return allFiles;
}
async function createCacheFromFiles(files) {
  const cache = new MiningCache({ validateMtime: false });
  await cache.warmUp(
    files.map((f) => ({
      path: f.path,
      content: f.content
    }))
  );
  return cache;
}
var MAX_CACHE_FILE_SIZE, MAX_CACHED_FILES, MAX_CACHE_MEMORY, EVICTION_BATCH_PERCENT, V8_STRING_BYTES_PER_CHAR, SOURCE_DIRECTORIES, MiningCache, DEFAULT_EXTENSIONS2;
var init_mining_cache = __esm({
  "llkb/mining-cache.ts"() {
    MAX_CACHE_FILE_SIZE = 5 * 1024 * 1024;
    MAX_CACHED_FILES = 5e3;
    MAX_CACHE_MEMORY = 100 * 1024 * 1024;
    EVICTION_BATCH_PERCENT = 0.1;
    V8_STRING_BYTES_PER_CHAR = 2;
    SOURCE_DIRECTORIES = [
      // Core directories (always present in most projects)
      "src",
      "app",
      // Component directories
      "components",
      "lib",
      // Page/View directories
      "pages",
      "views",
      // Model/Type directories
      "models",
      "entities",
      "types",
      // Route directories
      "routes",
      // Form directories
      "forms",
      "schemas",
      "validation",
      // Table directories
      "tables",
      "grids",
      // Modal directories
      "modals",
      "dialogs",
      // Additional common directories (expanded coverage)
      "features",
      // Feature-sliced design
      "modules",
      // NestJS, Angular
      "services",
      // Common for service layers
      "utils",
      // Utility functions
      "helpers",
      // Helper functions
      "api",
      // API routes
      "stores",
      // Pinia, Vuex, Redux stores
      "hooks",
      // React hooks
      "contexts",
      // React contexts
      "providers",
      // Context providers
      "layouts",
      // Layout components
      "shared",
      // Shared code
      "common"
      // Common utilities
    ];
    MiningCache = class {
      cache = /* @__PURE__ */ new Map();
      currentMemoryUsage = 0;
      stats = {
        hits: 0,
        misses: 0,
        skipped: 0,
        invalidations: 0,
        evictions: 0,
        cacheSize: 0,
        memoryUsage: 0,
        totalBytesRead: 0
      };
      /** Optional: Skip mtime validation for performance (use with caution) */
      validateMtime;
      // LRU doubly-linked list: head is most recently used, tail is least recently used
      lruHead = null;
      lruTail = null;
      /**
       * Create a new MiningCache.
       *
       * @param options - Cache configuration options
       */
      constructor(options = {}) {
        this.validateMtime = options.validateMtime !== false;
      }
      /**
       * Get file content, using cache if available.
       * Validates mtime to ensure content freshness.
       *
       * @param filePath - Absolute path to the file
       * @returns File content or null if unreadable/too large
       */
      async getContent(filePath) {
        const normalizedPath = path13.resolve(filePath);
        const cached = this.cache.get(normalizedPath);
        if (cached) {
          if (this.validateMtime) {
            try {
              const currentStat = await fsp3.lstat(normalizedPath);
              if (currentStat.isSymbolicLink()) {
                this.removeEntry(normalizedPath);
                return null;
              }
              if (currentStat.mtimeMs !== cached.mtime) {
                this.removeEntry(normalizedPath);
                this.stats.invalidations++;
              } else {
                cached.lastAccessed = Date.now();
                this.moveToHead(cached.node);
                this.stats.hits++;
                return cached.content;
              }
            } catch {
              this.removeEntry(normalizedPath);
              return null;
            }
          } else {
            cached.lastAccessed = Date.now();
            this.moveToHead(cached.node);
            this.stats.hits++;
            return cached.content;
          }
        }
        let stat;
        try {
          stat = await fsp3.lstat(normalizedPath);
        } catch {
          return null;
        }
        if (stat.isSymbolicLink()) {
          return null;
        }
        if (stat.size > MAX_CACHE_FILE_SIZE) {
          this.stats.skipped++;
          return null;
        }
        let content;
        try {
          content = await fsp3.readFile(normalizedPath, "utf-8");
        } catch {
          return null;
        }
        const memorySize = content.length * V8_STRING_BYTES_PER_CHAR;
        this.stats.totalBytesRead += stat.size;
        this.stats.misses++;
        if (this.canCache(memorySize)) {
          this.ensureCapacity(memorySize);
          const node = { key: normalizedPath, prev: null, next: null };
          this.addEntry(normalizedPath, {
            content,
            size: memorySize,
            mtime: stat.mtimeMs,
            lastAccessed: Date.now(),
            node
          });
        }
        return content;
      }
      /**
       * Check if a file has been cached.
       *
       * @param filePath - Absolute path to the file
       * @returns True if the file is in cache
       */
      has(filePath) {
        return this.cache.has(path13.resolve(filePath));
      }
      /**
       * Manually invalidate a cached file.
       *
       * @param filePath - Absolute path to the file
       * @returns True if the file was in cache and removed
       */
      invalidate(filePath) {
        const normalizedPath = path13.resolve(filePath);
        if (this.cache.has(normalizedPath)) {
          this.removeEntry(normalizedPath);
          this.stats.invalidations++;
          return true;
        }
        return false;
      }
      /**
       * Warm up the cache with pre-read files.
       * Useful for testing or when files are already in memory.
       *
       * @param files - Array of files with path, content, and optional mtime
       */
      async warmUp(files) {
        for (const file of files) {
          const normalizedPath = path13.resolve(file.path);
          const size = file.size ?? file.content.length * V8_STRING_BYTES_PER_CHAR;
          if (size > MAX_CACHE_FILE_SIZE) {
            continue;
          }
          if (!this.canCache(size)) {
            break;
          }
          let mtime = file.mtime;
          if (mtime === void 0) {
            try {
              const stat = await fsp3.lstat(normalizedPath);
              if (stat.isSymbolicLink()) {
                continue;
              }
              mtime = stat.mtimeMs;
            } catch {
              mtime = Date.now();
            }
          }
          const node = { key: normalizedPath, prev: null, next: null };
          this.addEntry(normalizedPath, {
            content: file.content,
            size,
            mtime,
            lastAccessed: Date.now(),
            node
          });
        }
      }
      /**
       * Get cache statistics.
       *
       * @returns Cache hit/miss statistics
       */
      getStats() {
        return { ...this.stats };
      }
      /**
       * Get the hit rate as a percentage.
       *
       * @returns Hit rate between 0 and 100
       */
      getHitRate() {
        const total = this.stats.hits + this.stats.misses;
        if (total === 0) {
          return 0;
        }
        return Math.round(this.stats.hits / total * 100);
      }
      /**
       * Clear the cache and reset statistics.
       * Call this after mining to free memory.
       */
      clear() {
        this.cache.clear();
        this.currentMemoryUsage = 0;
        this.lruHead = null;
        this.lruTail = null;
        this.stats = {
          hits: 0,
          misses: 0,
          skipped: 0,
          invalidations: 0,
          evictions: 0,
          cacheSize: 0,
          memoryUsage: 0,
          totalBytesRead: 0
        };
      }
      /**
       * Get the number of cached files.
       *
       * @returns Number of files in cache
       */
      get size() {
        return this.cache.size;
      }
      /**
       * Get current memory usage in bytes.
       *
       * @returns Memory usage in bytes
       */
      get memoryUsage() {
        return this.currentMemoryUsage;
      }
      // =========================================================================
      // Private methods
      // =========================================================================
      /**
       * Check if we can cache a file of the given size.
       */
      canCache(size) {
        return this.currentMemoryUsage + size <= MAX_CACHE_MEMORY;
      }
      /**
       * Ensure capacity for a new entry by evicting if necessary.
       */
      ensureCapacity(requiredSize) {
        if (this.cache.size >= MAX_CACHED_FILES) {
          const evictCount = Math.ceil(MAX_CACHED_FILES * EVICTION_BATCH_PERCENT);
          this.evictLRU(evictCount);
        }
        while (!this.canCache(requiredSize) && this.cache.size > 0) {
          this.evictLRU(1);
        }
      }
      /**
       * Evict least-recently-used entries from the tail of the LRU list.
       * O(1) per eviction using doubly-linked list.
       */
      evictLRU(count) {
        for (let i = 0; i < count && this.lruTail; i++) {
          const keyToRemove = this.lruTail.key;
          this.removeEntry(keyToRemove);
          this.stats.evictions++;
        }
      }
      /**
       * Move a node to the head of the LRU list (most recently used).
       * O(1) operation.
       */
      moveToHead(node) {
        if (node === this.lruHead) {
          return;
        }
        this.unlinkNode(node);
        node.prev = null;
        node.next = this.lruHead;
        if (this.lruHead) {
          this.lruHead.prev = node;
        }
        this.lruHead = node;
        if (!this.lruTail) {
          this.lruTail = node;
        }
      }
      /**
       * Remove a node from the LRU list without deleting it.
       * O(1) operation.
       */
      unlinkNode(node) {
        if (node.prev) {
          node.prev.next = node.next;
        } else {
          this.lruHead = node.next;
        }
        if (node.next) {
          node.next.prev = node.prev;
        } else {
          this.lruTail = node.prev;
        }
      }
      /**
       * Add an entry to the cache and the head of the LRU list.
       */
      addEntry(key, entry) {
        this.cache.set(key, entry);
        this.currentMemoryUsage += entry.size;
        this.moveToHead(entry.node);
        this.stats.cacheSize = this.cache.size;
        this.stats.memoryUsage = this.currentMemoryUsage;
      }
      /**
       * Remove an entry from the cache and the LRU list.
       */
      removeEntry(key) {
        const entry = this.cache.get(key);
        if (entry) {
          this.unlinkNode(entry.node);
          this.currentMemoryUsage -= entry.size;
          this.cache.delete(key);
          this.stats.cacheSize = this.cache.size;
          this.stats.memoryUsage = this.currentMemoryUsage;
        }
      }
    };
    DEFAULT_EXTENSIONS2 = [".ts", ".tsx", ".js", ".jsx", ".vue", ".svelte"];
  }
});

// llkb/normalize.ts
function normalizeCode(code) {
  let normalized = code;
  normalized = normalized.replace(/'[^']*'/g, "<STRING>");
  normalized = normalized.replace(/"[^"]*"/g, "<STRING>");
  normalized = normalized.replace(/`[^`]*`/g, "<STRING>");
  normalized = normalized.replace(/\b\d+(?:\.\d+)?\b/g, "<NUMBER>");
  normalized = normalized.replace(/\bconst\s+(\w+)/g, "const <VAR>");
  normalized = normalized.replace(/\blet\s+(\w+)/g, "let <VAR>");
  normalized = normalized.replace(/\bvar\s+(\w+)/g, "var <VAR>");
  normalized = normalized.replace(/\s+/g, " ");
  normalized = normalized.trim();
  return normalized;
}
function hashCode(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + str.charCodeAt(i) >>> 0;
  }
  return hash.toString(16);
}
function tokenize(code) {
  const tokens = code.split(/[\s.,;:(){}[\]<>]+/).filter((token) => token.length > 0);
  return new Set(tokens);
}
function countLines(code) {
  if (!code || code.length === 0) {
    return 0;
  }
  return code.split("\n").length;
}

// llkb/index.ts
init_pluralization();

// llkb/similarity.ts
function calculateSimilarity(codeA, codeB) {
  const normA = normalizeCode(codeA);
  const normB = normalizeCode(codeB);
  if (normA === normB) {
    return 1;
  }
  const tokensA = tokenize(normA);
  const tokensB = tokenize(normB);
  const jaccardScore = jaccardSimilarity(tokensA, tokensB);
  const linesA = countLines(codeA);
  const linesB = countLines(codeB);
  const lineSimilarity = lineCountSimilarity(linesA, linesB);
  const similarity = jaccardScore * 0.8 + lineSimilarity * 0.2;
  return Math.round(similarity * 100) / 100;
}
function jaccardSimilarity(setA, setB) {
  if (setA.size === 0 && setB.size === 0) {
    return 1;
  }
  if (setA.size === 0 || setB.size === 0) {
    return 0;
  }
  const intersection = /* @__PURE__ */ new Set();
  for (const item of setA) {
    if (setB.has(item)) {
      intersection.add(item);
    }
  }
  const union = /* @__PURE__ */ new Set([...setA, ...setB]);
  return intersection.size / union.size;
}
function lineCountSimilarity(linesA, linesB) {
  if (linesA === 0 && linesB === 0) {
    return 1;
  }
  const maxLines = Math.max(linesA, linesB);
  const diff = Math.abs(linesA - linesB);
  return 1 - diff / maxLines;
}
function isNearDuplicate(codeA, codeB, threshold = 0.8) {
  return calculateSimilarity(codeA, codeB) >= threshold;
}
function findNearDuplicates(pattern, candidates, threshold = 0.8) {
  const duplicates = [];
  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    if (candidate !== void 0 && isNearDuplicate(pattern, candidate, threshold)) {
      duplicates.push(i);
    }
  }
  return duplicates;
}
function findSimilarPatterns(target, patterns, threshold = 0.8) {
  const results = [];
  for (let i = 0; i < patterns.length; i++) {
    const pattern = patterns[i];
    if (pattern !== void 0) {
      const similarity = calculateSimilarity(target, pattern);
      if (similarity >= threshold) {
        results.push({ pattern, similarity, index: i });
      }
    }
  }
  results.sort((a, b) => b.similarity - a.similarity);
  return results;
}

// llkb/inference.ts
var CATEGORY_PATTERNS = {
  navigation: [
    "goto",
    "navigate",
    "route",
    "url",
    "path",
    "sidebar",
    "menu",
    "breadcrumb",
    "nav",
    "link",
    "href",
    "router"
  ],
  auth: [
    "login",
    "logout",
    "auth",
    "password",
    "credential",
    "session",
    "token",
    "user",
    "signin",
    "signout",
    "authenticate",
    "authorization"
  ],
  assertion: [
    "expect",
    "assert",
    "verify",
    "should",
    "tobevisible",
    "tohavetext",
    "tobehidden",
    "tocontain",
    "tohaveattribute",
    "tobeenabled",
    "tobedisabled",
    "tohavevalue"
  ],
  data: [
    "api",
    "fetch",
    "response",
    "request",
    "json",
    "payload",
    "data",
    "post",
    "get",
    "put",
    "delete",
    "endpoint",
    "graphql",
    "rest"
  ],
  selector: [
    "locator",
    "getby",
    "selector",
    "testid",
    "data-testid",
    "queryselector",
    "findby",
    "getbyrole",
    "getbylabel",
    "getbytext",
    "getbyplaceholder"
  ],
  timing: [
    "wait",
    "timeout",
    "delay",
    "sleep",
    "settimeout",
    "poll",
    "retry",
    "interval",
    "waitfor",
    "waituntil"
  ],
  "ui-interaction": [
    "click",
    "fill",
    "type",
    "select",
    "check",
    "uncheck",
    "upload",
    "drag",
    "drop",
    "hover",
    "focus",
    "blur",
    "press",
    "scroll",
    "dblclick"
  ]
};
var CATEGORY_PRIORITY = [
  "auth",
  // Auth patterns are distinctive
  "navigation",
  // Navigation patterns are common
  "assertion",
  // Assertions are easy to identify
  "data",
  // Data/API patterns
  "timing",
  // Wait patterns
  "selector",
  // Selector patterns
  "ui-interaction"
  // Default fallback for UI ops
];
function inferCategory(code) {
  const codeLower = code.toLowerCase();
  for (const category of CATEGORY_PRIORITY) {
    const patterns = CATEGORY_PATTERNS[category];
    if (patterns !== void 0) {
      for (const pattern of patterns) {
        if (codeLower.includes(pattern)) {
          return category;
        }
      }
    }
  }
  return "ui-interaction";
}
function inferCategoryWithConfidence(code) {
  const codeLower = code.toLowerCase();
  const categoryMatches = /* @__PURE__ */ new Map();
  for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
    let matchCount = 0;
    for (const pattern of patterns) {
      if (codeLower.includes(pattern)) {
        matchCount++;
      }
    }
    if (matchCount > 0) {
      categoryMatches.set(category, matchCount);
    }
  }
  let bestCategory = "ui-interaction";
  let maxMatches = 0;
  for (const [category, count] of categoryMatches) {
    if (count > maxMatches) {
      maxMatches = count;
      bestCategory = category;
    }
  }
  const totalPatterns = CATEGORY_PATTERNS[bestCategory]?.length ?? 1;
  const confidence = Math.min(maxMatches / Math.min(totalPatterns, 5), 1);
  return {
    category: bestCategory,
    confidence: Math.round(confidence * 100) / 100,
    matchCount: maxMatches
  };
}
function isComponentCategory(category) {
  return category !== "quirk";
}
function getAllCategories() {
  return [
    "selector",
    "timing",
    "quirk",
    "auth",
    "data",
    "assertion",
    "navigation",
    "ui-interaction"
  ];
}
function getComponentCategories() {
  return [
    "selector",
    "timing",
    "auth",
    "data",
    "assertion",
    "navigation",
    "ui-interaction"
  ];
}

// llkb/confidence.ts
var MAX_CONFIDENCE_HISTORY_ENTRIES = 100;
var CONFIDENCE_HISTORY_RETENTION_DAYS = 90;
function calculateConfidence(lesson) {
  const metrics = lesson.metrics;
  const occurrences = metrics.occurrences;
  const baseScore = Math.min(occurrences / 10, 1);
  let recencyFactor;
  if (metrics.lastSuccess) {
    const daysSinceLastSuccess = daysBetween(/* @__PURE__ */ new Date(), new Date(metrics.lastSuccess));
    recencyFactor = Math.max(1 - daysSinceLastSuccess / 90 * 0.3, 0.7);
  } else {
    const daysSinceCreation = daysBetween(/* @__PURE__ */ new Date(), new Date(metrics.firstSeen));
    recencyFactor = Math.max(1 - daysSinceCreation / 30 * 0.5, 0.5);
  }
  const successRate = metrics.successRate;
  const successFactor = Math.sqrt(successRate);
  const validationBoost = lesson.validation.humanReviewed ? 1.2 : 1;
  const rawConfidence = baseScore * recencyFactor * successFactor * validationBoost;
  const confidence = Math.min(Math.max(rawConfidence, 0), 1);
  return Math.round(confidence * 100) / 100;
}
function detectDecliningConfidence(lesson) {
  const history = lesson.metrics.confidenceHistory;
  if (!history || history.length < 2) {
    return false;
  }
  const currentConfidence = lesson.metrics.confidence;
  const recentHistory = history.slice(-30);
  const sum = recentHistory.reduce((acc, entry) => acc + entry.value, 0);
  const historicalAverage = sum / recentHistory.length;
  return currentConfidence < historicalAverage * 0.8;
}
function updateConfidenceHistory(lesson) {
  const history = lesson.metrics.confidenceHistory ?? [];
  const now = /* @__PURE__ */ new Date();
  const newEntry = {
    date: now.toISOString(),
    value: lesson.metrics.confidence
  };
  history.push(newEntry);
  const cutoffDate = /* @__PURE__ */ new Date();
  cutoffDate.setDate(cutoffDate.getDate() - CONFIDENCE_HISTORY_RETENTION_DAYS);
  const filtered = history.filter((entry) => new Date(entry.date) >= cutoffDate);
  return filtered.slice(-MAX_CONFIDENCE_HISTORY_ENTRIES);
}
function getConfidenceTrend(history) {
  if (!history || history.length < 3) {
    return "unknown";
  }
  const third = Math.floor(history.length / 3);
  const firstThird = history.slice(0, third);
  const lastThird = history.slice(-third);
  const firstAvg = firstThird.reduce((acc, e) => acc + e.value, 0) / firstThird.length;
  const lastAvg = lastThird.reduce((acc, e) => acc + e.value, 0) / lastThird.length;
  const change = (lastAvg - firstAvg) / firstAvg;
  if (change > 0.1) {
    return "increasing";
  } else if (change < -0.1) {
    return "decreasing";
  } else {
    return "stable";
  }
}
function daysBetween(date1, date2) {
  const msPerDay = 24 * 60 * 60 * 1e3;
  return Math.abs(date1.getTime() - date2.getTime()) / msPerDay;
}
function needsConfidenceReview(lesson, threshold = 0.4) {
  return lesson.metrics.confidence < threshold;
}
var LOCK_MAX_WAIT_MS = 5e3;
var STALE_LOCK_THRESHOLD_MS = 3e4;
var LOCK_RETRY_INTERVAL_MS = 50;
function generateRandomId() {
  return Math.random().toString(36).substring(2, 15);
}
async function saveJSONAtomic(filePath, data) {
  const tempPath = `${filePath}.tmp.${generateRandomId()}`;
  try {
    const dir = path13.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const content = JSON.stringify(data, null, 2);
    fs.writeFileSync(tempPath, content, "utf-8");
    fs.renameSync(tempPath, filePath);
    return { success: true };
  } catch (error) {
    try {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    } catch {
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
function saveJSONAtomicSync(filePath, data) {
  const tempPath = `${filePath}.tmp.${generateRandomId()}`;
  try {
    const dir = path13.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const content = JSON.stringify(data, null, 2);
    fs.writeFileSync(tempPath, content, "utf-8");
    fs.renameSync(tempPath, filePath);
    return { success: true };
  } catch (error) {
    try {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    } catch {
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
function acquireLock(filePath) {
  const lockPath = `${filePath}.lock`;
  const now = Date.now();
  try {
    if (fs.existsSync(lockPath)) {
      const lockStat = fs.statSync(lockPath);
      const lockAge = now - lockStat.mtimeMs;
      if (lockAge > STALE_LOCK_THRESHOLD_MS) {
        fs.unlinkSync(lockPath);
      } else {
        return false;
      }
    }
    fs.writeFileSync(lockPath, String(now), { flag: "wx" });
    return true;
  } catch (error) {
    if (error.code === "EEXIST") {
      return false;
    }
    throw error;
  }
}
function releaseLock(filePath) {
  const lockPath = `${filePath}.lock`;
  try {
    if (fs.existsSync(lockPath)) {
      fs.unlinkSync(lockPath);
    }
  } catch {
  }
}
async function updateJSONWithLock(filePath, updateFn) {
  const startTime = Date.now();
  let retriesNeeded = 0;
  while (Date.now() - startTime < LOCK_MAX_WAIT_MS) {
    if (acquireLock(filePath)) {
      try {
        let data;
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, "utf-8");
          data = JSON.parse(content);
        } else {
          data = {};
        }
        const updated = updateFn(data);
        const saveResult = await saveJSONAtomic(filePath, updated);
        if (!saveResult.success) {
          return {
            success: false,
            error: saveResult.error,
            retriesNeeded
          };
        }
        return { success: true, retriesNeeded };
      } finally {
        releaseLock(filePath);
      }
    }
    retriesNeeded++;
    await sleep(LOCK_RETRY_INTERVAL_MS);
  }
  return {
    success: false,
    error: `Could not acquire lock within ${LOCK_MAX_WAIT_MS}ms`,
    retriesNeeded
  };
}
function updateJSONWithLockSync(filePath, updateFn) {
  const startTime = Date.now();
  let retriesNeeded = 0;
  while (Date.now() - startTime < LOCK_MAX_WAIT_MS) {
    if (acquireLock(filePath)) {
      try {
        let data;
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, "utf-8");
          data = JSON.parse(content);
        } else {
          data = {};
        }
        const updated = updateFn(data);
        const saveResult = saveJSONAtomicSync(filePath, updated);
        if (!saveResult.success) {
          return {
            success: false,
            error: saveResult.error,
            retriesNeeded
          };
        }
        return { success: true, retriesNeeded };
      } finally {
        releaseLock(filePath);
      }
    }
    retriesNeeded++;
  }
  return {
    success: false,
    error: `Could not acquire lock within ${LOCK_MAX_WAIT_MS}ms`,
    retriesNeeded
  };
}
function loadJSON(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    throw new Error(
      `Failed to load JSON from ${filePath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}
function sleep(ms) {
  return new Promise((resolve6) => setTimeout(resolve6, ms));
}
var DEFAULT_LLKB_ROOT = ".artk/llkb";
function getHistoryDir(llkbRoot = DEFAULT_LLKB_ROOT) {
  return path13.join(llkbRoot, "history");
}
function getHistoryFilePath(date = /* @__PURE__ */ new Date(), llkbRoot = DEFAULT_LLKB_ROOT) {
  const dateStr = formatDate(date);
  return path13.join(getHistoryDir(llkbRoot), `${dateStr}.jsonl`);
}
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function appendToHistory(event, llkbRoot = DEFAULT_LLKB_ROOT) {
  try {
    const historyDir = getHistoryDir(llkbRoot);
    ensureDir(historyDir);
    const filePath = getHistoryFilePath(/* @__PURE__ */ new Date(), llkbRoot);
    const line = JSON.stringify(event) + "\n";
    fs.appendFileSync(filePath, line, "utf-8");
    return true;
  } catch (error) {
    console.warn(
      `[LLKB] Failed to append to history: ${error instanceof Error ? error.message : String(error)}`
    );
    return false;
  }
}
function readHistoryFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n").filter((line) => line.trim().length > 0);
  return lines.map((line) => JSON.parse(line));
}
function readTodayHistory(llkbRoot = DEFAULT_LLKB_ROOT) {
  const filePath = getHistoryFilePath(/* @__PURE__ */ new Date(), llkbRoot);
  return readHistoryFile(filePath);
}
function countTodayEvents(eventType, filter, llkbRoot = DEFAULT_LLKB_ROOT) {
  const events = readTodayHistory(llkbRoot);
  return events.filter((e) => {
    if (e.event !== eventType) {
      return false;
    }
    return filter ? filter(e) : true;
  }).length;
}
function countPredictiveExtractionsToday(llkbRoot = DEFAULT_LLKB_ROOT) {
  return countTodayEvents(
    "component_extracted",
    (e) => e.event === "component_extracted" && e.prompt === "journey-implement",
    llkbRoot
  );
}
function countJourneyExtractionsToday(journeyId, llkbRoot = DEFAULT_LLKB_ROOT) {
  return countTodayEvents(
    "component_extracted",
    (e) => e.event === "component_extracted" && e.prompt === "journey-implement" && e.journeyId === journeyId,
    llkbRoot
  );
}
function isDailyRateLimitReached(config, llkbRoot = DEFAULT_LLKB_ROOT) {
  const count = countPredictiveExtractionsToday(llkbRoot);
  return count >= config.extraction.maxPredictivePerDay;
}
function isJourneyRateLimitReached(journeyId, config, llkbRoot = DEFAULT_LLKB_ROOT) {
  const count = countJourneyExtractionsToday(journeyId, llkbRoot);
  return count >= config.extraction.maxPredictivePerJourney;
}
function getHistoryFilesInRange(startDate, endDate, llkbRoot = DEFAULT_LLKB_ROOT) {
  const historyDir = getHistoryDir(llkbRoot);
  if (!fs.existsSync(historyDir)) {
    return [];
  }
  const files = fs.readdirSync(historyDir).filter((f) => f.endsWith(".jsonl"));
  const results = [];
  for (const file of files) {
    const match = file.match(/^(\d{4}-\d{2}-\d{2})\.jsonl$/);
    if (match?.[1]) {
      const fileDate = new Date(match[1]);
      if (fileDate >= startDate && fileDate <= endDate) {
        results.push(path13.join(historyDir, file));
      }
    }
  }
  return results.sort();
}
function cleanupOldHistoryFiles(retentionDays = 365, llkbRoot = DEFAULT_LLKB_ROOT) {
  const historyDir = getHistoryDir(llkbRoot);
  if (!fs.existsSync(historyDir)) {
    return [];
  }
  const files = fs.readdirSync(historyDir).filter((f) => f.endsWith(".jsonl"));
  const now = /* @__PURE__ */ new Date();
  const cutoffDate = /* @__PURE__ */ new Date();
  cutoffDate.setDate(now.getDate() - retentionDays);
  const deleted = [];
  for (const file of files) {
    const match = file.match(/^(\d{4}-\d{2}-\d{2})\.jsonl$/);
    if (match?.[1]) {
      const fileDate = new Date(match[1]);
      if (fileDate < cutoffDate) {
        const filePath = path13.join(historyDir, file);
        fs.unlinkSync(filePath);
        deleted.push(filePath);
      }
    }
  }
  return deleted;
}
var DEFAULT_LLKB_ROOT2 = ".artk/llkb";
var ALL_CATEGORIES = [
  "selector",
  "timing",
  "quirk",
  "auth",
  "data",
  "assertion",
  "navigation",
  "ui-interaction"
];
var COMPONENT_CATEGORIES = [
  "selector",
  "timing",
  "auth",
  "data",
  "assertion",
  "navigation",
  "ui-interaction"
];
var ALL_SCOPES = [
  "universal",
  "framework:angular",
  "framework:react",
  "framework:vue",
  "framework:ag-grid",
  "app-specific"
];
function updateAnalytics(llkbRoot = DEFAULT_LLKB_ROOT2) {
  try {
    const lessonsPath = path13.join(llkbRoot, "lessons.json");
    const componentsPath = path13.join(llkbRoot, "components.json");
    const analyticsPath = path13.join(llkbRoot, "analytics.json");
    const lessons = loadJSON(lessonsPath);
    const components = loadJSON(componentsPath);
    let analytics = loadJSON(analyticsPath);
    if (!lessons || !components) {
      console.warn("[LLKB] Cannot update analytics: lessons or components not found");
      return false;
    }
    if (!analytics) {
      analytics = createEmptyAnalytics();
    }
    analytics.overview = calculateOverview(lessons, components);
    analytics.lessonStats = calculateLessonStats(lessons);
    analytics.componentStats = calculateComponentStats(components);
    analytics.topPerformers = calculateTopPerformers(lessons, components);
    analytics.needsReview = calculateNeedsReview(lessons, components);
    analytics.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
    const result = saveJSONAtomicSync(analyticsPath, analytics);
    return result.success;
  } catch (error) {
    console.error(
      `[LLKB] Failed to update analytics: ${error instanceof Error ? error.message : String(error)}`
    );
    return false;
  }
}
function updateAnalyticsWithData(lessons, components, analyticsPath) {
  try {
    let analytics = loadJSON(analyticsPath) ?? createEmptyAnalytics();
    analytics.overview = calculateOverview(lessons, components);
    analytics.lessonStats = calculateLessonStats(lessons);
    analytics.componentStats = calculateComponentStats(components);
    analytics.topPerformers = calculateTopPerformers(lessons, components);
    analytics.needsReview = calculateNeedsReview(lessons, components);
    analytics.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
    const result = saveJSONAtomicSync(analyticsPath, analytics);
    return result.success;
  } catch (error) {
    console.error(`[LLKB] Failed to update analytics: ${error}`);
    return false;
  }
}
function createEmptyAnalytics() {
  return {
    version: "1.0.0",
    lastUpdated: (/* @__PURE__ */ new Date()).toISOString(),
    overview: {
      totalLessons: 0,
      activeLessons: 0,
      archivedLessons: 0,
      totalComponents: 0,
      activeComponents: 0,
      archivedComponents: 0
    },
    lessonStats: {
      byCategory: Object.fromEntries(ALL_CATEGORIES.map((c) => [c, 0])),
      avgConfidence: 0,
      avgSuccessRate: 0
    },
    componentStats: {
      byCategory: Object.fromEntries(COMPONENT_CATEGORIES.map((c) => [c, 0])),
      byScope: Object.fromEntries(ALL_SCOPES.map((s) => [s, 0])),
      totalReuses: 0,
      avgReusesPerComponent: 0
    },
    impact: {
      verifyIterationsSaved: 0,
      avgIterationsBeforeLLKB: 0,
      avgIterationsAfterLLKB: 0,
      codeDeduplicationRate: 0,
      estimatedHoursSaved: 0
    },
    topPerformers: {
      lessons: [],
      components: []
    },
    needsReview: {
      lowConfidenceLessons: [],
      lowUsageComponents: [],
      decliningSuccessRate: []
    }
  };
}
function calculateOverview(lessons, components) {
  const activeLessons = lessons.lessons.filter((l) => !l.archived);
  const activeComponents = components.components.filter((c) => !c.archived);
  const archivedComponents = components.components.filter((c) => c.archived);
  return {
    totalLessons: lessons.lessons.length,
    activeLessons: activeLessons.length,
    archivedLessons: (lessons.archived ?? []).length,
    totalComponents: components.components.length,
    activeComponents: activeComponents.length,
    archivedComponents: archivedComponents.length
  };
}
function calculateLessonStats(lessons) {
  const activeLessons = lessons.lessons.filter((l) => !l.archived);
  const byCategory = Object.fromEntries(ALL_CATEGORIES.map((c) => [c, 0]));
  for (const lesson of activeLessons) {
    const category = lesson.category;
    if (category in byCategory) {
      byCategory[category]++;
    }
  }
  let avgConfidence = 0;
  let avgSuccessRate = 0;
  if (activeLessons.length > 0) {
    const confidenceSum = activeLessons.reduce((acc, l) => acc + l.metrics.confidence, 0);
    const successRateSum = activeLessons.reduce((acc, l) => acc + l.metrics.successRate, 0);
    avgConfidence = Math.round(confidenceSum / activeLessons.length * 100) / 100;
    avgSuccessRate = Math.round(successRateSum / activeLessons.length * 100) / 100;
  }
  return {
    byCategory,
    avgConfidence,
    avgSuccessRate
  };
}
function calculateComponentStats(components) {
  const activeComponents = components.components.filter((c) => !c.archived);
  const byCategory = Object.fromEntries(COMPONENT_CATEGORIES.map((c) => [c, 0]));
  for (const comp of activeComponents) {
    const category = comp.category;
    if (category in byCategory) {
      byCategory[category]++;
    }
  }
  const byScope = Object.fromEntries(ALL_SCOPES.map((s) => [s, 0]));
  for (const comp of activeComponents) {
    const scope = comp.scope;
    if (scope in byScope) {
      byScope[scope]++;
    }
  }
  let totalReuses = 0;
  let avgReusesPerComponent = 0;
  if (activeComponents.length > 0) {
    totalReuses = activeComponents.reduce((acc, c) => acc + (c.metrics.totalUses ?? 0), 0);
    avgReusesPerComponent = Math.round(totalReuses / activeComponents.length * 100) / 100;
  }
  return {
    byCategory,
    byScope,
    totalReuses,
    avgReusesPerComponent
  };
}
function calculateTopPerformers(lessons, components) {
  const activeLessons = lessons.lessons.filter((l) => !l.archived);
  const activeComponents = components.components.filter((c) => !c.archived);
  const topLessons = activeLessons.map((l) => ({
    id: l.id,
    title: l.title,
    score: Math.round(l.metrics.successRate * l.metrics.occurrences * 100) / 100
  })).sort((a, b) => b.score - a.score).slice(0, 5);
  const topComponents = activeComponents.map((c) => ({
    id: c.id,
    name: c.name,
    uses: c.metrics.totalUses ?? 0
  })).sort((a, b) => b.uses - a.uses).slice(0, 5);
  return {
    lessons: topLessons,
    components: topComponents
  };
}
function calculateNeedsReview(lessons, components) {
  const activeLessons = lessons.lessons.filter((l) => !l.archived);
  const activeComponents = components.components.filter((c) => !c.archived);
  const now = /* @__PURE__ */ new Date();
  const lowConfidenceLessons = activeLessons.filter((l) => l.metrics.confidence < 0.4).map((l) => l.id);
  const decliningSuccessRate = activeLessons.filter((l) => detectDecliningConfidence(l)).map((l) => l.id);
  const lowUsageComponents = activeComponents.filter((c) => {
    const uses = c.metrics.totalUses ?? 0;
    const extractedAt = new Date(c.source.extractedAt);
    const age = daysBetween(now, extractedAt);
    return uses < 2 && age > 30;
  }).map((c) => c.id);
  return {
    lowConfidenceLessons,
    lowUsageComponents,
    decliningSuccessRate
  };
}
function getAnalyticsSummary(llkbRoot = DEFAULT_LLKB_ROOT2) {
  const analyticsPath = path13.join(llkbRoot, "analytics.json");
  const analytics = loadJSON(analyticsPath);
  if (!analytics) {
    return "Analytics not available";
  }
  const o = analytics.overview;
  const l = analytics.lessonStats;
  const c = analytics.componentStats;
  return [
    `LLKB Analytics (${analytics.lastUpdated})`,
    "\u2500".repeat(50),
    `Lessons: ${o.activeLessons} active, ${o.archivedLessons} archived`,
    `  Avg Confidence: ${l.avgConfidence}`,
    `  Avg Success Rate: ${l.avgSuccessRate}`,
    `Components: ${o.activeComponents} active, ${o.archivedComponents} archived`,
    `  Total Reuses: ${c.totalReuses}`,
    `  Avg Reuses/Component: ${c.avgReusesPerComponent}`,
    `Items Needing Review: ${analytics.needsReview.lowConfidenceLessons.length + analytics.needsReview.lowUsageComponents.length + analytics.needsReview.decliningSuccessRate.length}`
  ].join("\n");
}

// llkb/quality-controls.ts
var DEFAULT_CONFIDENCE_THRESHOLD = 0.7;
var DEFAULT_MAX_AGE_DAYS = 90;
var CROSS_SOURCE_BOOST = 0.1;
var MAX_CONFIDENCE = 0.95;
var MS_PER_DAY = 24 * 60 * 60 * 1e3;
var SIGNAL_CONFIDENCES = {
  strong: 0.85,
  medium: 0.75,
  weak: 0.6
};
function deduplicatePatterns(patterns) {
  const seen = /* @__PURE__ */ new Map();
  for (const pattern of patterns) {
    const key = `${pattern.normalizedText.toLowerCase()}::${pattern.mappedPrimitive}`;
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, {
        ...pattern
        // Store original templateSource and entityName in a way that cross-source can detect
        // We'll keep the first one's values, but cross-source boosting will look at all patterns
      });
    } else {
      const merged = {
        ...existing,
        confidence: Math.max(existing.confidence, pattern.confidence),
        successCount: existing.successCount + pattern.successCount,
        failCount: existing.failCount + pattern.failCount,
        sourceJourneys: Array.from(/* @__PURE__ */ new Set([...existing.sourceJourneys, ...pattern.sourceJourneys])),
        selectorHints: mergeSelectors(existing.selectorHints, pattern.selectorHints)
        // Keep existing templateSource and entityName (first wins)
        // Cross-source boosting happens AFTER dedup, so it won't see these merged patterns as cross-source
      };
      seen.set(key, merged);
    }
  }
  return Array.from(seen.values());
}
function mergeSelectors(hints1, hints2) {
  const seen = /* @__PURE__ */ new Map();
  for (const hint of [...hints1, ...hints2]) {
    const key = `${hint.strategy}:${hint.value}`;
    const existing = seen.get(key);
    if (!existing || hint.confidence && (!existing.confidence || hint.confidence > existing.confidence)) {
      seen.set(key, hint);
    }
  }
  return Array.from(seen.values());
}
function applyConfidenceThreshold(patterns, threshold = DEFAULT_CONFIDENCE_THRESHOLD) {
  return patterns.filter((p) => p.confidence >= threshold);
}
function boostCrossSourcePatterns(patterns) {
  const groups = /* @__PURE__ */ new Map();
  for (const pattern of patterns) {
    const key = pattern.normalizedText;
    const group = groups.get(key) || [];
    group.push(pattern);
    groups.set(key, group);
  }
  const boosted = [];
  const groupsArray = Array.from(groups.values());
  for (const group of groupsArray) {
    if (group.length === 1) {
      boosted.push({ ...group[0] });
      continue;
    }
    const templateSources = new Set(group.map((p) => p.templateSource).filter(Boolean));
    const entityNames = new Set(group.map((p) => p.entityName).filter(Boolean));
    const sourceJourneys = new Set(group.flatMap((p) => p.sourceJourneys));
    const uniqueSources = Math.max(templateSources.size, entityNames.size, sourceJourneys.size);
    if (uniqueSources >= 2) {
      for (const pattern of group) {
        const newConfidence = Math.min(pattern.confidence + CROSS_SOURCE_BOOST, MAX_CONFIDENCE);
        boosted.push({ ...pattern, confidence: newConfidence });
      }
    } else {
      for (const pattern of group) {
        boosted.push({ ...pattern });
      }
    }
  }
  return boosted;
}
function pruneUnusedPatterns(patterns, usageStats, maxAgeDays = DEFAULT_MAX_AGE_DAYS) {
  const now = Date.now();
  const maxAgeMs = maxAgeDays * MS_PER_DAY;
  return patterns.filter((pattern) => {
    const totalAttempts = pattern.successCount + pattern.failCount;
    if (totalAttempts === 0) {
      return true;
    }
    const usage = usageStats.patternUsage.get(pattern.id);
    if (!usage) {
      return true;
    }
    const age = now - usage.lastUsed;
    const isStale = age > maxAgeMs;
    return !isStale;
  });
}
function applySignalWeighting(patterns, signalStrengths) {
  return patterns.map((pattern) => {
    const strength = signalStrengths.get(pattern.id);
    if (!strength) {
      return { ...pattern };
    }
    const baseConfidence = SIGNAL_CONFIDENCES[strength];
    return {
      ...pattern,
      confidence: Math.min(Math.max(pattern.confidence, baseConfidence), MAX_CONFIDENCE)
    };
  });
}
function applyAllQualityControls(patterns, options) {
  const inputCount = patterns.length;
  const preboostConfidence = /* @__PURE__ */ new Map();
  for (const p of patterns) {
    preboostConfidence.set(p.id, p.confidence);
  }
  const afterBoost = boostCrossSourcePatterns(patterns);
  const crossSourceBoosted = afterBoost.filter((p) => {
    const before = preboostConfidence.get(p.id);
    return before !== void 0 && p.confidence > before;
  }).length;
  const afterDedup = deduplicatePatterns(afterBoost);
  const deduplicated = afterBoost.length - afterDedup.length;
  const afterThreshold = applyConfidenceThreshold(afterDedup, options?.threshold);
  const thresholdFiltered = afterDedup.length - afterThreshold.length;
  let afterPrune = afterThreshold;
  let pruned = 0;
  if (options?.usageStats) {
    afterPrune = pruneUnusedPatterns(afterThreshold, options.usageStats, options?.maxAgeDays);
    pruned = afterThreshold.length - afterPrune.length;
  }
  const outputCount = afterPrune.length;
  return {
    patterns: afterPrune,
    result: {
      inputCount,
      outputCount,
      deduplicated,
      thresholdFiltered,
      crossSourceBoosted,
      pruned
    }
  };
}

// llkb/pattern-generation.ts
var HIGH_CONFIDENCE_AUTH = 0.85;
var MEDIUM_CONFIDENCE_AUTH = 0.7;
var FRAMEWORK_PATTERN_CONFIDENCE = 0.6;
var MAX_UI_PATTERN_CONFIDENCE = 0.75;
var PERCENTAGE_DIVISOR = 100;
var AUTH_PATTERN_TEMPLATES = [
  { text: "click login button", primitive: "click", selectorKey: "submitButton" },
  { text: "click sign in button", primitive: "click", selectorKey: "submitButton" },
  { text: "enter username", primitive: "fill", selectorKey: "usernameField" },
  { text: "enter email", primitive: "fill", selectorKey: "usernameField" },
  { text: "enter password", primitive: "fill", selectorKey: "passwordField" },
  { text: "submit login form", primitive: "click", selectorKey: "submitButton" },
  { text: "click logout button", primitive: "click" },
  { text: "click sign out button", primitive: "click" },
  { text: "verify logged in", primitive: "assert" },
  { text: "verify logged out", primitive: "assert" }
];
var NAVIGATION_PATTERN_TEMPLATES = [
  { text: "navigate to {route}", primitive: "navigate" },
  { text: "go to {route}", primitive: "navigate" },
  { text: "open {route} page", primitive: "navigate" },
  { text: "click {item} in navigation", primitive: "click" },
  { text: "click {item} in sidebar", primitive: "click" },
  { text: "click {item} in menu", primitive: "click" },
  { text: "return to home", primitive: "navigate" },
  { text: "go back", primitive: "navigate" }
];
var UI_LIBRARY_PATTERNS = {
  mui: [
    { text: "click MUI button", primitive: "click", component: "Button" },
    { text: "open MUI dialog", primitive: "click", component: "Dialog" },
    { text: "close MUI dialog", primitive: "click", component: "Dialog" },
    { text: "select MUI option", primitive: "click", component: "Select" },
    { text: "fill MUI text field", primitive: "fill", component: "TextField" },
    { text: "open MUI menu", primitive: "click", component: "Menu" },
    { text: "click MUI tab", primitive: "click", component: "Tabs" },
    { text: "toggle MUI switch", primitive: "click", component: "Switch" },
    { text: "check MUI checkbox", primitive: "check", component: "Checkbox" },
    { text: "dismiss MUI snackbar", primitive: "click", component: "Snackbar" }
  ],
  antd: [
    { text: "click Ant button", primitive: "click", component: "Button" },
    { text: "open Ant modal", primitive: "click", component: "Modal" },
    { text: "close Ant modal", primitive: "click", component: "Modal" },
    { text: "select Ant option", primitive: "click", component: "Select" },
    { text: "fill Ant input", primitive: "fill", component: "Input" },
    { text: "click Ant table row", primitive: "click", component: "Table" },
    { text: "sort Ant table column", primitive: "click", component: "Table" },
    { text: "dismiss Ant message", primitive: "click", component: "Message" }
  ],
  chakra: [
    { text: "click Chakra button", primitive: "click", component: "Button" },
    { text: "open Chakra modal", primitive: "click", component: "Modal" },
    { text: "close Chakra modal", primitive: "click", component: "Modal" },
    { text: "fill Chakra input", primitive: "fill", component: "Input" },
    { text: "dismiss Chakra toast", primitive: "click", component: "Toast" }
  ],
  "ag-grid": [
    { text: "click AG Grid row", primitive: "click", component: "agGrid" },
    { text: "select AG Grid row", primitive: "click", component: "agGrid" },
    { text: "sort AG Grid column", primitive: "click", component: "agGrid" },
    { text: "filter AG Grid column", primitive: "fill", component: "agGrid" },
    { text: "expand AG Grid row", primitive: "click", component: "agGrid" },
    { text: "collapse AG Grid row", primitive: "click", component: "agGrid" },
    { text: "edit AG Grid cell", primitive: "fill", component: "agGrid" },
    { text: "clear AG Grid filter", primitive: "click", component: "agGrid" }
  ]
};
function generatePatternId() {
  return `DP-${randomUUID().slice(0, 8)}`;
}
function resetPatternIdCounter() {
}
function generatePatterns(profile, signals) {
  const patterns = [];
  if (profile.auth.detected) {
    patterns.push(...generateAuthPatterns(profile.auth, signals));
  }
  patterns.push(...generateNavigationPatterns());
  for (const uiLib of profile.uiLibraries) {
    const libPatterns = UI_LIBRARY_PATTERNS[uiLib.name];
    if (libPatterns) {
      patterns.push(...generateUiLibraryPatterns(uiLib.name, libPatterns, signals, uiLib.confidence));
    }
  }
  return patterns;
}
function generateAuthPatterns(auth, signals) {
  const patterns = [];
  for (const template of AUTH_PATTERN_TEMPLATES) {
    const selectorHints = [];
    const selectorKey = template.selectorKey;
    const selectorValue = selectorKey ? auth.selectors?.[selectorKey] : void 0;
    if (selectorKey && selectorValue) {
      selectorHints.push({
        strategy: signals.primaryAttribute,
        value: selectorValue,
        confidence: HIGH_CONFIDENCE_AUTH
      });
    }
    patterns.push({
      id: generatePatternId(),
      normalizedText: template.text.toLowerCase(),
      originalText: template.text,
      mappedPrimitive: template.primitive,
      selectorHints,
      confidence: auth.selectors?.[template.selectorKey || ""] ? HIGH_CONFIDENCE_AUTH : MEDIUM_CONFIDENCE_AUTH,
      layer: "app-specific",
      category: "auth",
      sourceJourneys: [],
      successCount: 0,
      failCount: 0,
      templateSource: "auth"
    });
  }
  return patterns;
}
function generateNavigationPatterns(_signals) {
  const patterns = [];
  for (const template of NAVIGATION_PATTERN_TEMPLATES) {
    patterns.push({
      id: generatePatternId(),
      normalizedText: template.text.toLowerCase(),
      originalText: template.text,
      mappedPrimitive: template.primitive,
      selectorHints: [],
      confidence: 0.7,
      layer: "app-specific",
      category: "navigation",
      sourceJourneys: [],
      successCount: 0,
      failCount: 0,
      templateSource: "navigation"
    });
  }
  return patterns;
}
function generateUiLibraryPatterns(_libraryName, templates, signals, libraryConfidence) {
  const patterns = [];
  for (const template of templates) {
    const selectorHints = [];
    if (template.component) {
      const componentKebab = template.component.replace(/([A-Z])/g, "-$1").toLowerCase().replace(/^-/, "");
      selectorHints.push({
        strategy: signals.primaryAttribute,
        value: componentKebab,
        confidence: FRAMEWORK_PATTERN_CONFIDENCE
      });
    }
    patterns.push({
      id: generatePatternId(),
      normalizedText: template.text.toLowerCase(),
      originalText: template.text,
      mappedPrimitive: template.primitive,
      selectorHints,
      confidence: Math.min(libraryConfidence, MAX_UI_PATTERN_CONFIDENCE),
      layer: "framework",
      category: "ui-interaction",
      sourceJourneys: [],
      successCount: 0,
      failCount: 0
    });
  }
  return patterns;
}
function mergeDiscoveredPatterns(existing, discovered) {
  const existingTextsMap = /* @__PURE__ */ new Map();
  for (const p of existing) {
    existingTextsMap.set(`${p.normalizedText.toLowerCase()}:${p.irPrimitive}`, true);
  }
  const merged = [...existing];
  for (const pattern of discovered) {
    const key = `${pattern.normalizedText.toLowerCase()}:${pattern.mappedPrimitive}`;
    if (existingTextsMap.has(key)) {
      const existingIdx = merged.findIndex(
        (p) => `${p.normalizedText.toLowerCase()}:${p.irPrimitive}` === key
      );
      if (existingIdx >= 0 && pattern.confidence > merged[existingIdx].confidence) {
        merged[existingIdx] = {
          normalizedText: pattern.normalizedText,
          originalText: pattern.originalText,
          irPrimitive: pattern.mappedPrimitive,
          confidence: pattern.confidence,
          successCount: pattern.successCount,
          failCount: pattern.failCount,
          sourceJourneys: pattern.sourceJourneys,
          lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
        };
      }
      continue;
    }
    merged.push({
      normalizedText: pattern.normalizedText,
      originalText: pattern.originalText,
      irPrimitive: pattern.mappedPrimitive,
      confidence: pattern.confidence,
      successCount: pattern.successCount,
      failCount: pattern.failCount,
      sourceJourneys: pattern.sourceJourneys,
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
    });
    existingTextsMap.set(key, true);
  }
  return merged;
}
function createDiscoveredPatternsFile(patterns, profile, durationMs) {
  const byCategory = {};
  const byTemplate = {};
  for (const pattern of patterns) {
    if (pattern.category) {
      byCategory[pattern.category] = (byCategory[pattern.category] || 0) + 1;
    }
    if (pattern.templateSource) {
      byTemplate[pattern.templateSource] = (byTemplate[pattern.templateSource] || 0) + 1;
    }
  }
  const avgConfidence = patterns.length > 0 ? patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length : 0;
  return {
    version: "1.0",
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    source: "discover-foundation:F12",
    patterns,
    metadata: {
      frameworks: profile.frameworks.map((f) => f.name),
      uiLibraries: profile.uiLibraries.map((l) => l.name),
      totalPatterns: patterns.length,
      byCategory,
      byTemplate,
      averageConfidence: Math.round(avgConfidence * PERCENTAGE_DIVISOR) / PERCENTAGE_DIVISOR,
      discoveryDuration: durationMs
    }
  };
}
function deduplicatePatterns2(patterns) {
  return deduplicatePatterns(patterns);
}
function saveDiscoveredPatterns(patternsFile, outputDir) {
  const outputPath = path13.join(outputDir, "discovered-patterns.json");
  fs.mkdirSync(outputDir, { recursive: true });
  saveJSONAtomicSync(outputPath, patternsFile);
}
function loadDiscoveredPatterns(llkbDir) {
  const patternsPath = path13.join(llkbDir, "discovered-patterns.json");
  if (!fs.existsSync(patternsPath)) {
    return null;
  }
  try {
    const content = fs.readFileSync(patternsPath, "utf-8");
    const data = JSON.parse(content);
    if (typeof data !== "object" || data === null || !("patterns" in data) || !Array.isArray(data.patterns) || !("version" in data) || typeof data.version !== "string") {
      console.warn(`[LLKB] Invalid discovered patterns shape in ${patternsPath}`);
      return null;
    }
    return data;
  } catch (err) {
    console.warn(`[LLKB] Failed to load discovered patterns from ${patternsPath}: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

// llkb/loaders.ts
var DEFAULT_LLKB_CONFIG = {
  version: "1.0.0",
  enabled: true,
  extraction: {
    minOccurrences: 2,
    predictiveExtraction: true,
    confidenceThreshold: 0.7,
    maxPredictivePerDay: 5,
    maxPredictivePerJourney: 2,
    minLinesForExtraction: 3,
    similarityThreshold: 0.8
  },
  retention: {
    maxLessonAge: 90,
    minSuccessRate: 0.6,
    archiveUnused: 30
  },
  injection: {
    prioritizeByConfidence: true
  },
  scopes: {
    universal: true,
    frameworkSpecific: true,
    appSpecific: true
  },
  history: {
    retentionDays: 365
  },
  overrides: {
    allowUserOverride: true,
    logOverrides: true,
    flagAfterOverrides: 3
  }
};
function loadLLKBConfig(llkbRoot = ".artk/llkb") {
  const configPath = join(llkbRoot, "config.yml");
  if (!existsSync(configPath)) {
    return { ...DEFAULT_LLKB_CONFIG };
  }
  try {
    const content = readFileSync(configPath, "utf-8");
    const config = parseSimpleYAML(content);
    return mergeConfig(DEFAULT_LLKB_CONFIG, config);
  } catch {
    return { ...DEFAULT_LLKB_CONFIG };
  }
}
function parseSimpleYAML(content) {
  const result = {};
  const lines = content.split("\n");
  const stack = [{ obj: result, indent: -1 }];
  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith("#")) {
      continue;
    }
    const indent = line.search(/\S/);
    const trimmed = line.trim();
    const colonIndex = trimmed.indexOf(":");
    if (colonIndex === -1) {
      continue;
    }
    const key = trimmed.substring(0, colonIndex).trim();
    const valueStr = trimmed.substring(colonIndex + 1).trim();
    while (stack.length > 1) {
      const top2 = stack[stack.length - 1];
      if (!top2 || top2.indent < indent) {
        break;
      }
      stack.pop();
    }
    const top = stack[stack.length - 1];
    if (!top) {
      continue;
    }
    const parent = top.obj;
    if (valueStr === "" || valueStr === "|" || valueStr === ">") {
      const newObj = {};
      parent[key] = newObj;
      stack.push({ obj: newObj, indent });
    } else {
      parent[key] = parseYAMLValue(valueStr);
    }
  }
  return result;
}
function parseYAMLValue(value) {
  if (value.startsWith('"') && value.endsWith('"') || value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  const num = Number(value);
  if (!isNaN(num)) {
    return num;
  }
  return value;
}
function mergeConfig(defaults, overrides) {
  const result = { ...defaults };
  for (const key of Object.keys(overrides)) {
    const override = overrides[key];
    if (override !== void 0) {
      if (typeof override === "object" && override !== null && !Array.isArray(override)) {
        const defaultValue = defaults[key];
        result[key] = {
          ...typeof defaultValue === "object" && defaultValue !== null ? defaultValue : {},
          ...override
        };
      } else {
        result[key] = override;
      }
    }
  }
  return result;
}
function isLLKBEnabled(llkbRoot = ".artk/llkb") {
  if (!existsSync(llkbRoot)) {
    return false;
  }
  const config = loadLLKBConfig(llkbRoot);
  return config.enabled;
}
function loadAppProfile(llkbRoot = ".artk/llkb") {
  const profilePath = join(llkbRoot, "app-profile.json");
  return loadJSON(profilePath);
}
function loadLessonsFile(llkbRoot = ".artk/llkb") {
  const lessonsPath = join(llkbRoot, "lessons.json");
  const data = loadJSON(lessonsPath);
  if (!data) {
    return {
      version: "1.0.0",
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString(),
      lessons: [],
      archived: [],
      globalRules: [],
      appQuirks: []
    };
  }
  return data;
}
function loadLessons(llkbRoot = ".artk/llkb", options = {}) {
  const lessonsFile = loadLessonsFile(llkbRoot);
  let lessons = lessonsFile.lessons;
  if (!options.includeArchived) {
    lessons = lessons.filter((l) => !l.archived);
  }
  if (options.category) {
    const categories = Array.isArray(options.category) ? options.category : [options.category];
    lessons = lessons.filter((l) => categories.includes(l.category));
  }
  if (options.scope) {
    const scopes = Array.isArray(options.scope) ? options.scope : [options.scope];
    lessons = lessons.filter((l) => scopes.includes(l.scope));
  }
  if (options.minConfidence !== void 0) {
    lessons = lessons.filter((l) => l.metrics.confidence >= options.minConfidence);
  }
  if (options.tags && options.tags.length > 0) {
    lessons = lessons.filter((l) => l.tags && options.tags.some((tag) => l.tags.includes(tag)));
  }
  return lessons;
}
function loadComponentsFile(llkbRoot = ".artk/llkb") {
  const componentsPath = join(llkbRoot, "components.json");
  const data = loadJSON(componentsPath);
  if (!data) {
    return {
      version: "1.0.0",
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString(),
      components: [],
      componentsByCategory: {
        selector: [],
        timing: [],
        auth: [],
        data: [],
        assertion: [],
        navigation: [],
        "ui-interaction": []
      },
      componentsByScope: {
        universal: [],
        "framework:angular": [],
        "framework:react": [],
        "framework:vue": [],
        "framework:ag-grid": [],
        "app-specific": []
      }
    };
  }
  return data;
}
function loadComponents(llkbRoot = ".artk/llkb", options = {}) {
  const componentsFile = loadComponentsFile(llkbRoot);
  let components = componentsFile.components;
  if (!options.includeArchived) {
    components = components.filter((c) => !c.archived);
  }
  if (options.category) {
    const categories = Array.isArray(options.category) ? options.category : [options.category];
    components = components.filter((c) => categories.includes(c.category));
  }
  if (options.scope) {
    const scopes = Array.isArray(options.scope) ? options.scope : [options.scope];
    components = components.filter((c) => scopes.includes(c.scope));
  }
  if (options.minConfidence !== void 0) {
    components = components.filter((c) => c.metrics.successRate >= options.minConfidence);
  }
  return components;
}
function loadPatterns(llkbRoot = ".artk/llkb") {
  const patternsDir = join(llkbRoot, "patterns");
  if (!existsSync(patternsDir)) {
    return {};
  }
  const patterns = {};
  const selectorPatterns = loadJSON(join(patternsDir, "selectors.json"));
  if (selectorPatterns) {
    patterns.selectors = selectorPatterns;
  }
  const timingPatterns = loadJSON(join(patternsDir, "timing.json"));
  if (timingPatterns) {
    patterns.timing = timingPatterns;
  }
  const assertionPatterns = loadJSON(join(patternsDir, "assertions.json"));
  if (assertionPatterns) {
    patterns.assertions = assertionPatterns;
  }
  const dataPatterns = loadJSON(join(patternsDir, "data.json"));
  if (dataPatterns) {
    patterns.data = dataPatterns;
  }
  const authPatterns = loadJSON(join(patternsDir, "auth.json"));
  if (authPatterns) {
    patterns.auth = authPatterns;
  }
  return patterns;
}
function loadLLKBData(llkbRoot = ".artk/llkb") {
  return {
    config: loadLLKBConfig(llkbRoot),
    appProfile: loadAppProfile(llkbRoot),
    lessons: loadLessonsFile(llkbRoot),
    components: loadComponentsFile(llkbRoot),
    patterns: loadPatterns(llkbRoot),
    discoveredPatterns: loadDiscoveredPatterns(llkbRoot)
  };
}
function llkbExists(llkbRoot = ".artk/llkb") {
  return existsSync(llkbRoot) && existsSync(join(llkbRoot, "config.yml"));
}

// llkb/constants.ts
var CONFIDENCE = {
  DEFAULT_WEIGHT: 0.5};
var TIMEOUTS = {
  SHORT_MS: 300,
  MEDIUM_MS: 1e3,
  LONG_MS: 2e3
};
var TABLE = {
  COLUMN_WIDTH: 50
};
var TIME = {
  MS_PER_SECOND: 1e3,
  SECONDS_PER_MINUTE: 60,
  MINUTES_PER_HOUR: 60,
  HOURS_PER_DAY: 24
};
var LIMITS = {
  MAX_RECENT_ITEMS: 5,
  DEFAULT_RETENTION_DAYS: 30
};
var PERCENTAGES = {
  FULL: 100
};

// llkb/adapter-transforms.ts
function categoryToPrimitiveType(category) {
  switch (category) {
    case "navigation":
      return "navigate";
    case "timing":
      return "wait";
    case "assertion":
      return "assert";
    case "selector":
    case "ui-interaction":
      return "click";
    default:
      return "callModule";
  }
}
function inferModuleFromCategory(category) {
  switch (category) {
    case "selector":
      return "selectors";
    case "timing":
      return "timing";
    case "auth":
      return "auth";
    case "data":
      return "data";
    case "assertion":
      return "assertions";
    case "navigation":
      return "navigation";
    case "ui-interaction":
      return "ui";
    default:
      return "helpers";
  }
}
function triggerToRegex(trigger) {
  if (!trigger || trigger.trim().length === 0) {
    return null;
  }
  let pattern = trigger.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\\bthe\\b/gi, "(?:the\\s+)?").replace(/\\ba\\b/gi, "(?:a\\s+)?").replace(/\\ban\\b/gi, "(?:an\\s+)?");
  pattern = pattern.replace(/\s+/g, "\\s+");
  pattern = `(?i)${pattern}`;
  return pattern;
}
function componentNameToTrigger(name) {
  const words = name.replace(/([A-Z])/g, " $1").replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase().trim().split(/\s+/);
  const pattern = words.map((word) => {
    if (word === "ag" || word === "aggrid") {
      return "(?:ag-?)?grid";
    }
    return word;
  }).join("\\s+");
  return `(?:${pattern})`;
}
function generateNameVariations(name) {
  const variations = [];
  const words = name.replace(/([A-Z])/g, " $1").replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase().trim();
  variations.push(words);
  variations.push(`the ${words}`);
  if (words.includes("grid")) {
    variations.push(words.replace("grid", "ag-grid"));
    variations.push(words.replace("grid", "ag grid"));
  }
  if (words.includes("wait for")) {
    const afterWaitFor = words.replace("wait for ", "").replace(" to load", "");
    variations.push(`${afterWaitFor} loads`);
    variations.push(`${afterWaitFor} is loaded`);
  }
  return [...new Set(variations)];
}
function lessonToPattern(lesson) {
  const patternCategories = ["selector", "timing", "navigation", "ui-interaction"];
  if (!patternCategories.includes(lesson.category)) {
    return null;
  }
  if (lesson.metrics.confidence < CONFIDENCE.DEFAULT_WEIGHT) {
    return null;
  }
  const regex = triggerToRegex(lesson.trigger);
  if (!regex) {
    return null;
  }
  const source = {
    lessonId: lesson.id,
    confidence: lesson.metrics.confidence,
    occurrences: lesson.metrics.occurrences
  };
  return {
    name: `llkb-${lesson.id.toLowerCase()}`,
    regex,
    primitiveType: categoryToPrimitiveType(lesson.category),
    source
  };
}
function lessonToSelectorOverride(lesson) {
  if (lesson.category !== "selector") {
    return null;
  }
  const pattern = lesson.pattern;
  const testIdMatch = pattern.match(/data-testid[=:]\s*["']?([^"'\s]+)["']?/i);
  const roleMatch = pattern.match(/role[=:]\s*["']?([^"'\s]+)["']?/i);
  const labelMatch = pattern.match(/aria-label[=:]\s*["']?([^"'\s]+)["']?/i);
  let strategy = "testid";
  let value = "";
  if (testIdMatch?.[1]) {
    strategy = "testid";
    value = testIdMatch[1];
  } else if (roleMatch?.[1]) {
    strategy = "role";
    value = roleMatch[1];
  } else if (labelMatch?.[1]) {
    strategy = "label";
    value = labelMatch[1];
  } else {
    return null;
  }
  const source = {
    lessonId: lesson.id,
    confidence: lesson.metrics.confidence,
    occurrences: lesson.metrics.occurrences
  };
  return {
    pattern: lesson.trigger,
    override: {
      strategy,
      value
    },
    source
  };
}
function lessonToTimingHint(lesson) {
  if (lesson.category !== "timing") {
    return null;
  }
  const pattern = lesson.pattern;
  const waitMatch = pattern.match(/wait\s*(?:for\s*)?\s*(\d+)\s*(?:ms|milliseconds?)?/i);
  const timeoutMatch = pattern.match(/timeout\s*(?:of\s*)?\s*(\d+)\s*(?:ms|milliseconds?)?/i);
  const delayMatch = pattern.match(/delay\s*(?:of\s*)?\s*(\d+)\s*(?:ms|milliseconds?)?/i);
  let waitMs = 0;
  if (waitMatch?.[1]) {
    waitMs = parseInt(waitMatch[1], 10);
  } else if (timeoutMatch?.[1]) {
    waitMs = parseInt(timeoutMatch[1], 10);
  } else if (delayMatch?.[1]) {
    waitMs = parseInt(delayMatch[1], 10);
  }
  if (waitMs === 0) {
    if (pattern.toLowerCase().includes("animation")) {
      waitMs = TIMEOUTS.SHORT_MS;
    } else if (pattern.toLowerCase().includes("load")) {
      waitMs = TIMEOUTS.MEDIUM_MS;
    } else if (pattern.toLowerCase().includes("network")) {
      waitMs = TIMEOUTS.LONG_MS;
    } else {
      return null;
    }
  }
  const source = {
    lessonId: lesson.id,
    confidence: lesson.metrics.confidence,
    occurrences: lesson.metrics.occurrences
  };
  return {
    trigger: lesson.trigger,
    waitMs,
    source
  };
}
function componentToModule(component) {
  const trigger = componentNameToTrigger(component.name);
  return {
    name: component.name,
    trigger,
    componentId: component.id,
    importPath: component.filePath,
    confidence: component.metrics.successRate
  };
}
function componentToGlossaryEntries(component) {
  const entries = [];
  const variations = generateNameVariations(component.name);
  const moduleName = inferModuleFromCategory(component.category);
  const primitive = {
    type: "callModule",
    module: moduleName,
    method: component.name
  };
  for (const phrase of variations) {
    entries.push({
      phrase,
      primitive,
      sourceId: component.id,
      confidence: component.metrics.successRate
    });
  }
  return entries;
}
function lessonToGlossaryEntries(lesson) {
  const glossaryCategories = ["navigation", "ui-interaction", "assertion"];
  if (!glossaryCategories.includes(lesson.category)) {
    return [];
  }
  const primitive = {
    type: categoryToPrimitiveType(lesson.category)
  };
  const phrase = lesson.trigger.toLowerCase().trim();
  if (!phrase) {
    return [];
  }
  return [
    {
      phrase,
      primitive,
      sourceId: lesson.id,
      confidence: lesson.metrics.confidence
    }
  ];
}

// llkb/adapter.ts
var DEFAULT_MIN_CONFIDENCE = 0.7;
var DEFAULT_LLKB_ROOT3 = ".artk/llkb";
var LLKB_VERSION = "1.0.0";
function exportForAutogen(config) {
  const {
    llkbRoot = DEFAULT_LLKB_ROOT3,
    outputDir,
    minConfidence = DEFAULT_MIN_CONFIDENCE,
    includeCategories,
    includeScopes,
    generateGlossary = true,
    generateConfig = true,
    configFormat = "yaml"
  } = config;
  const warnings = [];
  const exportedAt = (/* @__PURE__ */ new Date()).toISOString();
  if (!llkbExists(llkbRoot)) {
    return {
      configPath: null,
      glossaryPath: null,
      stats: createEmptyStats(),
      warnings: [`LLKB not found at ${llkbRoot}. Run /artk.discover-foundation first.`],
      exportedAt
    };
  }
  const llkbConfig = loadLLKBConfig(llkbRoot);
  if (!llkbConfig.enabled) {
    return {
      configPath: null,
      glossaryPath: null,
      stats: createEmptyStats(),
      warnings: ["LLKB is disabled in config.yml. Enable it to export."],
      exportedAt
    };
  }
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  const lessons = loadLessons(llkbRoot, {
    category: includeCategories,
    scope: includeScopes,
    minConfidence,
    includeArchived: false
  });
  const components = loadComponents(llkbRoot, {
    category: includeCategories,
    scope: includeScopes,
    minConfidence,
    includeArchived: false
  });
  const allLessons = loadLessons(llkbRoot, { includeArchived: false });
  const allComponents = loadComponents(llkbRoot, { includeArchived: false });
  const lessonsSkipped = allLessons.length - lessons.length;
  const componentsSkipped = allComponents.length - components.length;
  const patterns = [];
  const selectorOverrides = [];
  const timingHints = [];
  for (const lesson of lessons) {
    const pattern = lessonToPattern(lesson);
    if (pattern) {
      patterns.push(pattern);
    }
    const selector = lessonToSelectorOverride(lesson);
    if (selector) {
      selectorOverrides.push(selector);
    }
    const timing = lessonToTimingHint(lesson);
    if (timing) {
      timingHints.push(timing);
    }
  }
  const modules = [];
  const glossaryEntries = [];
  const sourceComponents = [];
  const sourceLessons = [];
  for (const component of components) {
    const moduleMapping = componentToModule(component);
    modules.push(moduleMapping);
    sourceComponents.push(component.id);
    if (generateGlossary) {
      const entries = componentToGlossaryEntries(component);
      glossaryEntries.push(...entries);
    }
  }
  if (generateGlossary) {
    for (const lesson of lessons) {
      const entries = lessonToGlossaryEntries(lesson);
      if (entries.length > 0) {
        glossaryEntries.push(...entries);
        sourceLessons.push(lesson.id);
      }
    }
  }
  const stats = {
    patternsExported: patterns.length,
    selectorsExported: selectorOverrides.length,
    timingHintsExported: timingHints.length,
    modulesExported: modules.length,
    glossaryEntriesExported: glossaryEntries.length,
    lessonsSkipped,
    componentsSkipped
  };
  let configPath = null;
  if (generateConfig) {
    const autogenConfig = {
      version: 1,
      exportedAt,
      llkbVersion: LLKB_VERSION,
      minConfidence,
      additionalPatterns: patterns,
      selectorOverrides,
      timingHints,
      modules
    };
    const filename = configFormat === "yaml" ? "autogen-llkb.config.yml" : "autogen-llkb.config.json";
    configPath = join(outputDir, filename);
    if (configFormat === "yaml") {
      writeFileSync(configPath, generateYAML(autogenConfig), "utf-8");
    } else {
      writeFileSync(configPath, JSON.stringify(autogenConfig, null, 2), "utf-8");
    }
  }
  let glossaryPath = null;
  if (generateGlossary && glossaryEntries.length > 0) {
    const glossaryMeta = {
      exportedAt,
      minConfidence,
      entryCount: glossaryEntries.length,
      sourceComponents: [...new Set(sourceComponents)],
      sourceLessons: [...new Set(sourceLessons)]
    };
    glossaryPath = join(outputDir, "llkb-glossary.ts");
    writeFileSync(glossaryPath, generateGlossaryFile(glossaryEntries, glossaryMeta), "utf-8");
  }
  if (stats.patternsExported === 0 && stats.modulesExported === 0) {
    warnings.push("No patterns or modules were exported. Consider lowering minConfidence.");
  }
  return {
    configPath,
    glossaryPath,
    stats,
    warnings,
    exportedAt
  };
}
function createEmptyStats() {
  return {
    patternsExported: 0,
    selectorsExported: 0,
    timingHintsExported: 0,
    modulesExported: 0,
    glossaryEntriesExported: 0,
    lessonsSkipped: 0,
    componentsSkipped: 0
  };
}
function generateYAML(config) {
  const header = "# Generated by LLKB Adapter - DO NOT EDIT MANUALLY\n# Regenerate with: npx artk-llkb export --for-autogen\n\n";
  return header + stringify(config, { lineWidth: 120 });
}
function generateGlossaryFile(entries, meta) {
  const lines = [
    "/**",
    " * LLKB-Generated Glossary Extension",
    ` * Generated: ${meta.exportedAt}`,
    " * Source: .artk/llkb/",
    ` * Min Confidence: ${meta.minConfidence}`,
    " *",
    " * DO NOT EDIT - Regenerate with: npx artk-llkb export --for-autogen",
    " */",
    "",
    "export interface IRPrimitive {",
    "  type: 'callModule' | 'click' | 'fill' | 'navigate' | 'wait' | 'assert';",
    "  module?: string;",
    "  method?: string;",
    "  params?: Record<string, unknown>;",
    "}",
    "",
    "export const llkbGlossary = new Map<string, IRPrimitive>(["
  ];
  const entriesBySource = /* @__PURE__ */ new Map();
  for (const entry of entries) {
    const source = entry.sourceId;
    if (!entriesBySource.has(source)) {
      entriesBySource.set(source, []);
    }
    entriesBySource.get(source)?.push(entry);
  }
  for (const [sourceId, sourceEntries] of entriesBySource) {
    const confidence = sourceEntries[0]?.confidence ?? 0;
    lines.push(`  // From ${sourceId} (confidence: ${confidence.toFixed(2)})`);
    for (const entry of sourceEntries) {
      const primitiveStr = JSON.stringify(entry.primitive);
      lines.push(`  ["${escapeJSString(entry.phrase)}", ${primitiveStr}],`);
    }
    lines.push("");
  }
  lines.push("]);");
  lines.push("");
  lines.push("export const llkbGlossaryMeta = {");
  lines.push(`  exportedAt: "${meta.exportedAt}",`);
  lines.push(`  minConfidence: ${meta.minConfidence},`);
  lines.push(`  entryCount: ${meta.entryCount},`);
  lines.push(`  sourceComponents: ${JSON.stringify(meta.sourceComponents)},`);
  lines.push(`  sourceLessons: ${JSON.stringify(meta.sourceLessons)},`);
  lines.push("};");
  lines.push("");
  return lines.join("\n");
}
function escapeJSString(str) {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}
function formatExportResult(result) {
  const lines = [];
  lines.push("LLKB Export for AutoGen");
  lines.push("========================");
  lines.push(`Exported patterns: ${result.stats.patternsExported}`);
  lines.push(`Exported selector overrides: ${result.stats.selectorsExported}`);
  lines.push(`Exported timing hints: ${result.stats.timingHintsExported}`);
  lines.push(`Exported modules: ${result.stats.modulesExported}`);
  lines.push(`Generated glossary entries: ${result.stats.glossaryEntriesExported}`);
  lines.push("");
  if (result.stats.lessonsSkipped > 0 || result.stats.componentsSkipped > 0) {
    lines.push("Skipped (low confidence):");
    lines.push(`  Lessons: ${result.stats.lessonsSkipped}`);
    lines.push(`  Components: ${result.stats.componentsSkipped}`);
    lines.push("");
  }
  lines.push("Output files:");
  if (result.configPath) {
    lines.push(`  - ${result.configPath}`);
  }
  if (result.glossaryPath) {
    lines.push(`  - ${result.glossaryPath}`);
  }
  if (result.warnings.length > 0) {
    lines.push("");
    lines.push("Warnings:");
    for (const warning of result.warnings) {
      lines.push(`  ! ${warning}`);
    }
  }
  lines.push("");
  lines.push(`Export completed at: ${result.exportedAt}`);
  return lines.join("\n");
}
function parseAdapterArgs(args) {
  const config = {
    outputDir: "./artk-e2e",
    minConfidence: DEFAULT_MIN_CONFIDENCE,
    generateGlossary: true,
    generateConfig: true,
    configFormat: "yaml"
  };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--output-dir":
      case "-o":
        config.outputDir = args[++i] ?? "./artk-e2e";
        break;
      case "--llkb-root":
        config.llkbRoot = args[++i];
        break;
      case "--min-confidence":
        config.minConfidence = parseFloat(args[++i] ?? String(DEFAULT_MIN_CONFIDENCE));
        break;
      case "--format":
        config.configFormat = args[++i] === "json" ? "json" : "yaml";
        break;
      case "--no-glossary":
        config.generateGlossary = false;
        break;
      case "--no-config":
        config.generateConfig = false;
        break;
      case "--categories":
        config.includeCategories = args[++i]?.split(",");
        break;
      case "--scopes":
        config.includeScopes = args[++i]?.split(",");
        break;
    }
  }
  return config;
}
function runAdapterCLI(args) {
  const parsed = parseAdapterArgs(args);
  const result = exportForAutogen(parsed);
  console.log(formatExportResult(result));
}
function calculateNewSuccessRate(currentSuccessRate, currentOccurrences, newSuccess) {
  const totalSuccesses = currentSuccessRate * currentOccurrences;
  const newSuccesses = newSuccess ? totalSuccesses + 1 : totalSuccesses;
  const newOccurrences = currentOccurrences + 1;
  return Math.round(newSuccesses / newOccurrences * PERCENTAGES.FULL) / PERCENTAGES.FULL;
}
function findMatchingLesson(lessons, selectorValue, stepText) {
  const exactMatch = lessons.find(
    (l) => !l.archived && l.pattern.includes(selectorValue)
  );
  if (exactMatch) {
    return exactMatch;
  }
  const triggerMatch = lessons.find(
    (l) => !l.archived && l.trigger.toLowerCase().includes(stepText.toLowerCase())
  );
  return triggerMatch;
}
function recordPatternLearned(input) {
  const llkbRoot = input.llkbRoot ?? DEFAULT_LLKB_ROOT;
  const lessonsPath = path13.join(llkbRoot, "lessons.json");
  try {
    let matchedLessonId;
    let updatedMetrics;
    const updateResult = updateJSONWithLockSync(
      lessonsPath,
      (data) => {
        const existingLesson = findMatchingLesson(
          data.lessons,
          input.selectorUsed.value,
          input.stepText
        );
        if (existingLesson) {
          matchedLessonId = existingLesson.id;
          existingLesson.metrics.occurrences++;
          existingLesson.metrics.lastApplied = (/* @__PURE__ */ new Date()).toISOString();
          if (input.success) {
            existingLesson.metrics.lastSuccess = (/* @__PURE__ */ new Date()).toISOString();
          }
          existingLesson.metrics.successRate = calculateNewSuccessRate(
            existingLesson.metrics.successRate,
            existingLesson.metrics.occurrences - 1,
            input.success
          );
          existingLesson.metrics.confidence = calculateConfidence(existingLesson);
          if (!existingLesson.journeyIds.includes(input.journeyId)) {
            existingLesson.journeyIds.push(input.journeyId);
          }
          updatedMetrics = {
            confidence: existingLesson.metrics.confidence,
            successRate: existingLesson.metrics.successRate,
            occurrences: existingLesson.metrics.occurrences
          };
        }
        data.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
        return data;
      }
    );
    if (matchedLessonId) {
      appendToHistory(
        {
          event: "lesson_applied",
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          journeyId: input.journeyId,
          prompt: input.prompt,
          lessonId: matchedLessonId,
          success: input.success,
          context: input.stepText
        },
        llkbRoot
      );
    }
    return {
      success: updateResult.success,
      error: updateResult.error,
      metrics: updatedMetrics,
      entityId: matchedLessonId
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[LLKB] Failed to record pattern learned: ${message}`);
    return {
      success: false,
      error: message
    };
  }
}
function recordComponentUsed(input) {
  const llkbRoot = input.llkbRoot ?? DEFAULT_LLKB_ROOT;
  const componentsPath = path13.join(llkbRoot, "components.json");
  try {
    let foundComponent = false;
    let updatedMetrics;
    const updateResult = updateJSONWithLockSync(
      componentsPath,
      (data) => {
        const component = data.components.find((c) => c.id === input.componentId);
        if (component && !component.archived) {
          foundComponent = true;
          component.metrics.totalUses++;
          component.metrics.lastUsed = (/* @__PURE__ */ new Date()).toISOString();
          component.metrics.successRate = calculateNewSuccessRate(
            component.metrics.successRate,
            component.metrics.totalUses - 1,
            input.success
          );
          updatedMetrics = {
            totalUses: component.metrics.totalUses,
            successRate: component.metrics.successRate
          };
        }
        data.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
        return data;
      }
    );
    appendToHistory(
      {
        event: "component_used",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        journeyId: input.journeyId,
        prompt: input.prompt,
        componentId: input.componentId,
        success: input.success
      },
      llkbRoot
    );
    if (!foundComponent) {
      return {
        success: false,
        error: `Component not found: ${input.componentId}`
      };
    }
    return {
      success: updateResult.success,
      error: updateResult.error,
      metrics: updatedMetrics,
      entityId: input.componentId
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[LLKB] Failed to record component used: ${message}`);
    return {
      success: false,
      error: message
    };
  }
}
function recordLessonApplied(input) {
  const llkbRoot = input.llkbRoot ?? DEFAULT_LLKB_ROOT;
  const lessonsPath = path13.join(llkbRoot, "lessons.json");
  try {
    let foundLesson = false;
    let updatedMetrics;
    const updateResult = updateJSONWithLockSync(
      lessonsPath,
      (data) => {
        const lesson = data.lessons.find((l) => l.id === input.lessonId);
        if (lesson && !lesson.archived) {
          foundLesson = true;
          lesson.metrics.occurrences++;
          lesson.metrics.lastApplied = (/* @__PURE__ */ new Date()).toISOString();
          if (input.success) {
            lesson.metrics.lastSuccess = (/* @__PURE__ */ new Date()).toISOString();
          }
          lesson.metrics.successRate = calculateNewSuccessRate(
            lesson.metrics.successRate,
            lesson.metrics.occurrences - 1,
            input.success
          );
          lesson.metrics.confidence = calculateConfidence(lesson);
          if (!lesson.journeyIds.includes(input.journeyId)) {
            lesson.journeyIds.push(input.journeyId);
          }
          updatedMetrics = {
            confidence: lesson.metrics.confidence,
            successRate: lesson.metrics.successRate,
            occurrences: lesson.metrics.occurrences
          };
        }
        data.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
        return data;
      }
    );
    appendToHistory(
      {
        event: "lesson_applied",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        journeyId: input.journeyId,
        prompt: input.prompt,
        lessonId: input.lessonId,
        success: input.success,
        context: input.context
      },
      llkbRoot
    );
    if (!foundLesson) {
      return {
        success: false,
        error: `Lesson not found: ${input.lessonId}`
      };
    }
    return {
      success: updateResult.success,
      error: updateResult.error,
      metrics: updatedMetrics,
      entityId: input.lessonId
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[LLKB] Failed to record lesson applied: ${message}`);
    return {
      success: false,
      error: message
    };
  }
}
function recordLearning(args) {
  const baseInput = {
    journeyId: args.journeyId,
    testFile: args.testFile ?? "unknown",
    prompt: args.prompt ?? "journey-verify",
    llkbRoot: args.llkbRoot
  };
  switch (args.type) {
    case "pattern":
      return recordPatternLearned({
        ...baseInput,
        stepText: args.stepText ?? args.context ?? "",
        selectorUsed: {
          strategy: args.selectorStrategy ?? "unknown",
          value: args.selectorValue ?? ""
        },
        success: args.success
      });
    case "component":
      if (!args.id) {
        return {
          success: false,
          error: "Component ID is required for component learning"
        };
      }
      return recordComponentUsed({
        ...baseInput,
        componentId: args.id,
        success: args.success
      });
    case "lesson":
      if (!args.id) {
        return {
          success: false,
          error: "Lesson ID is required for lesson learning"
        };
      }
      return recordLessonApplied({
        ...baseInput,
        lessonId: args.id,
        success: args.success,
        context: args.context
      });
    default:
      return {
        success: false,
        error: `Unknown learning type: ${args.type}`
      };
  }
}
function formatLearningResult(result) {
  const lines = [];
  if (result.success) {
    lines.push("Learning recorded successfully");
    if (result.entityId) {
      lines.push(`  Entity: ${result.entityId}`);
    }
    if (result.metrics) {
      lines.push("  Updated metrics:");
      if (result.metrics.confidence !== void 0) {
        lines.push(`    - Confidence: ${result.metrics.confidence}`);
      }
      if (result.metrics.successRate !== void 0) {
        lines.push(`    - Success Rate: ${result.metrics.successRate}`);
      }
      if (result.metrics.occurrences !== void 0) {
        lines.push(`    - Occurrences: ${result.metrics.occurrences}`);
      }
      if (result.metrics.totalUses !== void 0) {
        lines.push(`    - Total Uses: ${result.metrics.totalUses}`);
      }
    }
  } else {
    lines.push("Learning recording failed");
    if (result.error) {
      lines.push(`  Error: ${result.error}`);
    }
  }
  return lines.join("\n");
}
function recordBatch(events, llkbRoot) {
  const root = llkbRoot ?? DEFAULT_LLKB_ROOT;
  const lessonsPath = path13.join(root, "lessons.json");
  const componentsPath = path13.join(root, "components.json");
  const result = {
    processed: 0,
    failed: 0,
    errors: []
  };
  if (events.length === 0) {
    return result;
  }
  try {
    const componentEvents = events.filter((e) => e.type === "component");
    const lessonEvents = events.filter(
      (e) => e.type === "lesson" || e.type === "pattern"
    );
    if (componentEvents.length > 0) {
      const componentResult = updateJSONWithLockSync(
        componentsPath,
        (data) => {
          for (const event of componentEvents) {
            const component = data.components.find((c) => c.id === event.componentId);
            if (component && !component.archived) {
              component.metrics.totalUses++;
              component.metrics.lastUsed = (/* @__PURE__ */ new Date()).toISOString();
              component.metrics.successRate = calculateNewSuccessRate(
                component.metrics.successRate,
                component.metrics.totalUses - 1,
                event.success
              );
            }
          }
          data.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
          return data;
        }
      );
      if (!componentResult.success) {
        return {
          processed: 0,
          failed: events.length,
          errors: [{ index: 0, error: componentResult.error ?? "Component batch update failed" }]
        };
      }
      result.processed += componentEvents.length;
    }
    if (lessonEvents.length > 0) {
      const lessonResult = updateJSONWithLockSync(
        lessonsPath,
        (data) => {
          for (const event of lessonEvents) {
            let lesson;
            if (event.type === "lesson") {
              lesson = data.lessons.find((l) => l.id === event.lessonId);
            } else if (event.type === "pattern") {
              lesson = findMatchingLesson(
                data.lessons,
                event.selectorUsed.value,
                event.stepText
              );
            }
            if (lesson && !lesson.archived) {
              lesson.metrics.occurrences++;
              lesson.metrics.lastApplied = (/* @__PURE__ */ new Date()).toISOString();
              if (event.success) {
                lesson.metrics.lastSuccess = (/* @__PURE__ */ new Date()).toISOString();
              }
              lesson.metrics.successRate = calculateNewSuccessRate(
                lesson.metrics.successRate,
                lesson.metrics.occurrences - 1,
                event.success
              );
              lesson.metrics.confidence = calculateConfidence(lesson);
              if (!lesson.journeyIds.includes(event.journeyId)) {
                lesson.journeyIds.push(event.journeyId);
              }
            }
          }
          data.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
          return data;
        }
      );
      if (!lessonResult.success) {
        return {
          processed: componentEvents.length,
          // Component updates succeeded
          failed: lessonEvents.length,
          errors: [{ index: componentEvents.length, error: lessonResult.error ?? "Lesson batch update failed" }]
        };
      }
      result.processed += lessonEvents.length;
    }
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      if (!event) {
        continue;
      }
      try {
        if (event.type === "component") {
          appendToHistory(
            {
              event: "component_used",
              timestamp: (/* @__PURE__ */ new Date()).toISOString(),
              journeyId: event.journeyId,
              prompt: event.prompt,
              componentId: event.componentId,
              success: event.success
            },
            root
          );
        } else if (event.type === "lesson") {
          appendToHistory(
            {
              event: "lesson_applied",
              timestamp: (/* @__PURE__ */ new Date()).toISOString(),
              journeyId: event.journeyId,
              prompt: event.prompt,
              lessonId: event.lessonId,
              success: event.success,
              context: event.context
            },
            root
          );
        } else if (event.type === "pattern") {
        }
      } catch {
      }
    }
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      processed: 0,
      failed: events.length,
      errors: [{ index: 0, error: `Batch operation failed: ${message}` }]
    };
  }
}
var DEFAULT_LLKB_ROOT4 = ".artk/llkb";
function extractLlkbVersionFromTest(testContent) {
  const match = testContent.match(/@llkb-version\s+(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)/);
  return match ? match[1] ?? null : null;
}
function extractLlkbEntriesFromTest(testContent) {
  const match = testContent.match(/@llkb-entries\s+(\d+)/);
  return match ? parseInt(match[1] ?? "0", 10) : null;
}
function updateTestLlkbVersion(testContent, newVersion, entryCount) {
  let result = testContent;
  const versionRegex = /(@llkb-version\s+)\S+/;
  if (versionRegex.test(result)) {
    result = result.replace(versionRegex, `$1${newVersion}`);
  } else {
    const timestampRegex = /(@timestamp\s+\S+)/;
    if (timestampRegex.test(result)) {
      result = result.replace(timestampRegex, `$1
 * @llkb-version ${newVersion}`);
    }
  }
  if (entryCount !== void 0) {
    const entriesRegex = /(@llkb-entries\s+)\d+/;
    if (entriesRegex.test(result)) {
      result = result.replace(entriesRegex, `$1${entryCount}`);
    } else {
      const llkbVersionRegex = /(@llkb-version\s+\S+)/;
      if (llkbVersionRegex.test(result)) {
        result = result.replace(llkbVersionRegex, `$1
 * @llkb-entries ${entryCount}`);
      }
    }
  }
  return result;
}
function getCurrentLlkbVersion(llkbRoot = DEFAULT_LLKB_ROOT4) {
  const analyticsPath = path13.join(llkbRoot, "analytics.json");
  try {
    const analytics = loadJSON(analyticsPath);
    if (analytics?.lastUpdated) {
      return analytics.lastUpdated;
    }
  } catch {
  }
  return (/* @__PURE__ */ new Date()).toISOString();
}
function countNewEntriesSince(sinceTimestamp, type, llkbRoot = DEFAULT_LLKB_ROOT4) {
  if (!sinceTimestamp) {
    return 0;
  }
  const sinceDate = new Date(sinceTimestamp);
  if (type === "lessons") {
    const lessonsPath = path13.join(llkbRoot, "lessons.json");
    try {
      const lessons = loadJSON(lessonsPath);
      if (!lessons?.lessons) {
        return 0;
      }
      return lessons.lessons.filter((lesson) => {
        const firstSeen = lesson.metrics.firstSeen;
        if (!firstSeen) {
          return false;
        }
        return new Date(firstSeen) > sinceDate;
      }).length;
    } catch {
      return 0;
    }
  } else {
    const componentsPath = path13.join(llkbRoot, "components.json");
    try {
      const components = loadJSON(componentsPath);
      if (!components?.components) {
        return 0;
      }
      return components.components.filter((component) => {
        const extractedAt = component.source?.extractedAt;
        if (!extractedAt) {
          return false;
        }
        return new Date(extractedAt) > sinceDate;
      }).length;
    } catch {
      return 0;
    }
  }
}
function compareVersions(testFilePath, llkbRoot = DEFAULT_LLKB_ROOT4) {
  const testContent = fs.readFileSync(testFilePath, "utf-8");
  const testLlkbVersion = extractLlkbVersionFromTest(testContent);
  const currentLlkbVersion = getCurrentLlkbVersion(llkbRoot);
  const isOutdated = !testLlkbVersion || new Date(testLlkbVersion) < new Date(currentLlkbVersion);
  const daysSinceUpdate = testLlkbVersion ? Math.floor((Date.now() - new Date(testLlkbVersion).getTime()) / (TIME.MS_PER_SECOND * TIME.SECONDS_PER_MINUTE * TIME.MINUTES_PER_HOUR * TIME.HOURS_PER_DAY)) : Infinity;
  const newPatternsAvailable = countNewEntriesSince(testLlkbVersion, "lessons", llkbRoot);
  const newComponentsAvailable = countNewEntriesSince(testLlkbVersion, "components", llkbRoot);
  let recommendation = "skip";
  if (isOutdated && (newPatternsAvailable > LIMITS.MAX_RECENT_ITEMS || newComponentsAvailable > 2)) {
    recommendation = "update";
  } else if (isOutdated && daysSinceUpdate > LIMITS.DEFAULT_RETENTION_DAYS) {
    recommendation = "review";
  } else if (newPatternsAvailable > 0 || newComponentsAvailable > 0) {
    recommendation = "review";
  }
  return {
    testLlkbVersion,
    currentLlkbVersion,
    isOutdated,
    daysSinceUpdate,
    newPatternsAvailable,
    newComponentsAvailable,
    recommendation
  };
}
function checkUpdates(testsDir, llkbRoot = DEFAULT_LLKB_ROOT4, pattern = "*.spec.ts") {
  const result = {
    outdated: [],
    upToDate: [],
    errors: [],
    summary: {
      total: 0,
      outdated: 0,
      upToDate: 0,
      errors: 0,
      recommendation: ""
    }
  };
  if (!fs.existsSync(testsDir)) {
    return result;
  }
  const testFiles = findTestFiles(testsDir, pattern);
  result.summary.total = testFiles.length;
  for (const testFile of testFiles) {
    try {
      const comparison = compareVersions(testFile, llkbRoot);
      if (comparison.isOutdated) {
        result.outdated.push({ testFile, comparison });
        result.summary.outdated++;
      } else {
        result.upToDate.push({ testFile, comparison });
        result.summary.upToDate++;
      }
    } catch (error) {
      result.errors.push({
        testFile,
        error: error instanceof Error ? error.message : String(error)
      });
      result.summary.errors++;
    }
  }
  if (result.summary.outdated === 0) {
    result.summary.recommendation = "All tests are up to date";
  } else if (result.summary.outdated === 1) {
    result.summary.recommendation = "1 test should be updated";
  } else {
    result.summary.recommendation = `${result.summary.outdated} tests should be updated`;
  }
  return result;
}
function findTestFiles(dir, pattern) {
  const files = [];
  const patternRegex = globToRegex(pattern);
  function walkDir(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path13.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith(".") && entry.name !== "node_modules") {
          walkDir(fullPath);
        }
      } else if (entry.isFile() && patternRegex.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }
  walkDir(dir);
  return files;
}
function globToRegex(pattern) {
  const escaped = pattern.replace(/\./g, "\\.").replace(/\*/g, ".*").replace(/\?/g, ".");
  return new RegExp(`^${escaped}$`);
}
function formatVersionComparison(testFile, comparison) {
  const status = comparison.isOutdated ? "!" : "\u2713";
  const llkbVer = comparison.testLlkbVersion ? comparison.testLlkbVersion.split("T")[0] : "none";
  const currentVer = comparison.currentLlkbVersion.split("T")[0];
  let info = `${status} ${path13.basename(testFile)}`;
  info += ` (LLKB: ${llkbVer}, current: ${currentVer}`;
  if (comparison.newPatternsAvailable > 0 || comparison.newComponentsAvailable > 0) {
    const parts = [];
    if (comparison.newPatternsAvailable > 0) {
      parts.push(`+${comparison.newPatternsAvailable} patterns`);
    }
    if (comparison.newComponentsAvailable > 0) {
      parts.push(`+${comparison.newComponentsAvailable} components`);
    }
    info += `, ${parts.join(", ")}`;
  }
  info += ")";
  return info;
}
function formatUpdateCheckResult(result) {
  const lines = [];
  lines.push("LLKB Version Check");
  lines.push("\u2500".repeat(TABLE.COLUMN_WIDTH));
  lines.push("");
  if (result.outdated.length > 0) {
    lines.push("Tests needing LLKB update:");
    for (const { testFile, comparison } of result.outdated) {
      lines.push(`  ${formatVersionComparison(testFile, comparison)}`);
    }
    lines.push("");
  }
  if (result.upToDate.length > 0 && result.outdated.length === 0) {
    lines.push("All tests are up to date");
    lines.push("");
  } else if (result.upToDate.length > 0) {
    lines.push(`Up to date: ${result.upToDate.length} tests`);
    lines.push("");
  }
  if (result.errors.length > 0) {
    lines.push("Errors:");
    for (const { testFile, error } of result.errors) {
      lines.push(`  \u2717 ${path13.basename(testFile)}: ${error}`);
    }
    lines.push("");
  }
  lines.push("\u2500".repeat(TABLE.COLUMN_WIDTH));
  lines.push(`Total: ${result.summary.total} tests`);
  lines.push(result.summary.recommendation);
  return lines.join("\n");
}
async function updateTestSafe(options) {
  const {
    testPath,
    llkbRoot = DEFAULT_LLKB_ROOT4,
    verifyAfterUpdate = false,
    rollbackOnFailure = true,
    verificationCommand
  } = options;
  let backupPath = null;
  try {
    backupPath = `${testPath}.backup`;
    try {
      fs.copyFileSync(testPath, backupPath);
    } catch (error) {
      return {
        success: false,
        error: `Failed to create backup: ${error instanceof Error ? error.message : String(error)}`
      };
    }
    const currentVersion = getCurrentLlkbVersion(llkbRoot);
    let testContent;
    try {
      testContent = fs.readFileSync(testPath, "utf-8");
    } catch (error) {
      if (backupPath) {
        fs.copyFileSync(backupPath, testPath);
        fs.unlinkSync(backupPath);
      }
      return {
        success: false,
        error: `Failed to read test file: ${error instanceof Error ? error.message : String(error)}`
      };
    }
    const updatedContent = updateTestLlkbVersion(testContent, currentVersion);
    try {
      fs.writeFileSync(testPath, updatedContent, "utf-8");
    } catch (error) {
      if (backupPath) {
        fs.copyFileSync(backupPath, testPath);
        fs.unlinkSync(backupPath);
      }
      return {
        success: false,
        error: `Failed to write updated test: ${error instanceof Error ? error.message : String(error)}`
      };
    }
    if (verifyAfterUpdate) {
      const verificationResult = await verifyTest(testPath, verificationCommand);
      if (!verificationResult.success) {
        if (rollbackOnFailure && backupPath) {
          try {
            fs.copyFileSync(backupPath, testPath);
            fs.unlinkSync(backupPath);
            return {
              success: false,
              rolledBack: true,
              originalBackupPath: backupPath,
              error: "Verification failed, rolled back to original",
              verificationResult
            };
          } catch (rollbackError) {
            return {
              success: false,
              rolledBack: false,
              error: `Verification failed and rollback failed: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`,
              verificationResult
            };
          }
        }
        return {
          success: false,
          rolledBack: false,
          error: "Verification failed, no rollback requested",
          verificationResult
        };
      }
      if (backupPath) {
        try {
          fs.unlinkSync(backupPath);
        } catch {
        }
      }
      return {
        success: true,
        rolledBack: false,
        newVersion: currentVersion,
        verificationResult
      };
    }
    if (backupPath) {
      try {
        fs.unlinkSync(backupPath);
      } catch {
      }
    }
    return {
      success: true,
      rolledBack: false,
      newVersion: currentVersion
    };
  } catch (error) {
    if (backupPath && fs.existsSync(backupPath)) {
      try {
        fs.copyFileSync(backupPath, testPath);
        fs.unlinkSync(backupPath);
        return {
          success: false,
          rolledBack: true,
          error: `Unexpected error, rolled back: ${error instanceof Error ? error.message : String(error)}`
        };
      } catch {
        return {
          success: false,
          rolledBack: false,
          error: `Unexpected error and rollback failed: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
async function verifyTest(testPath, customCommand) {
  const { execSync } = await import('child_process');
  const command = customCommand ?? `npx playwright test ${testPath}`;
  try {
    const output = execSync(command, {
      encoding: "utf-8",
      stdio: "pipe",
      timeout: 6e4
      // 60 second timeout
    });
    return {
      success: true,
      output
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// llkb/cli.ts
var DEFAULT_LLKB_ROOT5 = ".artk/llkb";
function runHealthCheck(llkbRoot = DEFAULT_LLKB_ROOT5) {
  const checks = [];
  let hasError = false;
  let hasWarning = false;
  if (fs.existsSync(llkbRoot)) {
    checks.push({
      name: "Directory exists",
      status: "pass",
      message: `LLKB directory found at ${llkbRoot}`
    });
  } else {
    checks.push({
      name: "Directory exists",
      status: "fail",
      message: `LLKB directory not found at ${llkbRoot}`
    });
    hasError = true;
  }
  const configPath = path13.join(llkbRoot, "config.yml");
  if (fs.existsSync(configPath)) {
    checks.push({
      name: "Config file",
      status: "pass",
      message: "config.yml found"
    });
  } else {
    checks.push({
      name: "Config file",
      status: "warn",
      message: "config.yml not found - using defaults"
    });
    hasWarning = true;
  }
  const lessonsPath = path13.join(llkbRoot, "lessons.json");
  const lessonsCheck = checkJSONFile(lessonsPath, "lessons.json");
  checks.push(lessonsCheck);
  if (lessonsCheck.status === "fail") {
    hasError = true;
  }
  if (lessonsCheck.status === "warn") {
    hasWarning = true;
  }
  const componentsPath = path13.join(llkbRoot, "components.json");
  const componentsCheck = checkJSONFile(componentsPath, "components.json");
  checks.push(componentsCheck);
  if (componentsCheck.status === "fail") {
    hasError = true;
  }
  if (componentsCheck.status === "warn") {
    hasWarning = true;
  }
  const analyticsPath = path13.join(llkbRoot, "analytics.json");
  const analyticsCheck = checkJSONFile(analyticsPath, "analytics.json");
  checks.push(analyticsCheck);
  if (analyticsCheck.status === "fail") {
    hasError = true;
  }
  if (analyticsCheck.status === "warn") {
    hasWarning = true;
  }
  const historyDir = getHistoryDir(llkbRoot);
  if (fs.existsSync(historyDir)) {
    const historyFiles = fs.readdirSync(historyDir).filter((f) => f.endsWith(".jsonl"));
    checks.push({
      name: "History directory",
      status: "pass",
      message: `History directory found with ${historyFiles.length} files`
    });
  } else {
    checks.push({
      name: "History directory",
      status: "warn",
      message: "History directory not found - will be created on first event"
    });
    hasWarning = true;
  }
  if (lessonsCheck.status === "pass") {
    try {
      const lessons = loadJSON(lessonsPath);
      if (lessons) {
        const lowConfidence = lessons.lessons.filter(
          (l) => !l.archived && needsConfidenceReview(l)
        );
        const declining = lessons.lessons.filter(
          (l) => !l.archived && detectDecliningConfidence(l)
        );
        if (lowConfidence.length > 0 || declining.length > 0) {
          checks.push({
            name: "Lesson health",
            status: "warn",
            message: `${lowConfidence.length} low confidence, ${declining.length} declining`,
            details: [
              ...lowConfidence.map((l) => `Low confidence: ${l.id} (${l.metrics.confidence})`),
              ...declining.map((l) => `Declining: ${l.id}`)
            ].join(", ")
          });
          hasWarning = true;
        } else {
          checks.push({
            name: "Lesson health",
            status: "pass",
            message: "All lessons healthy"
          });
        }
      }
    } catch {
    }
  }
  let status;
  let summary;
  if (hasError) {
    status = "error";
    summary = `LLKB has errors: ${checks.filter((c) => c.status === "fail").length} failed checks`;
  } else if (hasWarning) {
    status = "warning";
    summary = `LLKB has warnings: ${checks.filter((c) => c.status === "warn").length} warnings`;
  } else {
    status = "healthy";
    summary = "LLKB is healthy";
  }
  return { status, checks, summary };
}
function checkJSONFile(filePath, fileName) {
  if (!fs.existsSync(filePath)) {
    return {
      name: fileName,
      status: "warn",
      message: `${fileName} not found`
    };
  }
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    JSON.parse(content);
    return {
      name: fileName,
      status: "pass",
      message: `${fileName} is valid JSON`
    };
  } catch (error) {
    return {
      name: fileName,
      status: "fail",
      message: `${fileName} is invalid JSON`,
      details: error instanceof Error ? error.message : String(error)
    };
  }
}
function getStats(llkbRoot = DEFAULT_LLKB_ROOT5) {
  const lessonsPath = path13.join(llkbRoot, "lessons.json");
  const componentsPath = path13.join(llkbRoot, "components.json");
  const historyDir = getHistoryDir(llkbRoot);
  const lessons = loadJSON(lessonsPath);
  const activeLessons = lessons?.lessons.filter((l) => !l.archived) ?? [];
  const archivedLessons = lessons?.archived ?? [];
  let avgConfidence = 0;
  let avgSuccessRate = 0;
  let needsReview = 0;
  if (activeLessons.length > 0) {
    avgConfidence = Math.round(
      activeLessons.reduce((acc, l) => acc + l.metrics.confidence, 0) / activeLessons.length * PERCENTAGES.FULL
    ) / PERCENTAGES.FULL;
    avgSuccessRate = Math.round(
      activeLessons.reduce((acc, l) => acc + l.metrics.successRate, 0) / activeLessons.length * PERCENTAGES.FULL
    ) / PERCENTAGES.FULL;
    needsReview = activeLessons.filter(
      (l) => needsConfidenceReview(l) || detectDecliningConfidence(l)
    ).length;
  }
  const components = loadJSON(componentsPath);
  const activeComponents = components?.components.filter((c) => !c.archived) ?? [];
  const archivedComponents = components?.components.filter((c) => c.archived) ?? [];
  let totalReuses = 0;
  let avgReusesPerComponent = 0;
  if (activeComponents.length > 0) {
    totalReuses = activeComponents.reduce((acc, c) => acc + (c.metrics.totalUses ?? 0), 0);
    avgReusesPerComponent = Math.round(totalReuses / activeComponents.length * PERCENTAGES.FULL) / PERCENTAGES.FULL;
  }
  let todayEvents = 0;
  let historyFiles = 0;
  let oldestFile = null;
  let newestFile = null;
  if (fs.existsSync(historyDir)) {
    const files = fs.readdirSync(historyDir).filter((f) => f.endsWith(".jsonl")).sort();
    historyFiles = files.length;
    if (files.length > 0) {
      oldestFile = files[0] ?? null;
      newestFile = files[files.length - 1] ?? null;
    }
    todayEvents = readTodayHistory(llkbRoot).length;
  }
  return {
    lessons: {
      total: (lessons?.lessons.length ?? 0) + archivedLessons.length,
      active: activeLessons.length,
      archived: archivedLessons.length,
      avgConfidence,
      avgSuccessRate,
      needsReview
    },
    components: {
      total: components?.components.length ?? 0,
      active: activeComponents.length,
      archived: archivedComponents.length,
      totalReuses,
      avgReusesPerComponent
    },
    history: {
      todayEvents,
      historyFiles,
      oldestFile,
      newestFile
    }
  };
}
function prune(options = {}) {
  const {
    llkbRoot = DEFAULT_LLKB_ROOT5,
    historyRetentionDays = 365,
    archiveInactiveLessons = false,
    archiveInactiveComponents = false,
    inactiveDays = 180
  } = options;
  const result = {
    historyFilesDeleted: 0,
    deletedFiles: [],
    archivedLessons: 0,
    archivedComponents: 0,
    errors: []
  };
  try {
    const deletedFiles = cleanupOldHistoryFiles(historyRetentionDays, llkbRoot);
    result.historyFilesDeleted = deletedFiles.length;
    result.deletedFiles = deletedFiles;
  } catch (error) {
    result.errors.push(
      `Failed to clean history files: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  if (archiveInactiveLessons) {
    try {
      const archivedCount = archiveInactiveItems(
        path13.join(llkbRoot, "lessons.json"),
        "lessons",
        inactiveDays
      );
      result.archivedLessons = archivedCount;
    } catch (error) {
      result.errors.push(
        `Failed to archive lessons: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  if (archiveInactiveComponents) {
    try {
      const archivedCount = archiveInactiveItems(
        path13.join(llkbRoot, "components.json"),
        "components",
        inactiveDays
      );
      result.archivedComponents = archivedCount;
    } catch (error) {
      result.errors.push(
        `Failed to archive components: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  try {
    updateAnalytics(llkbRoot);
  } catch (error) {
    result.errors.push(
      `Failed to update analytics: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  return result;
}
function archiveInactiveItems(filePath, itemsKey, inactiveDays) {
  if (!fs.existsSync(filePath)) {
    return 0;
  }
  const content = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(content);
  const items = data[itemsKey];
  if (!Array.isArray(items)) {
    return 0;
  }
  const now = /* @__PURE__ */ new Date();
  const cutoffDate = /* @__PURE__ */ new Date();
  cutoffDate.setDate(now.getDate() - inactiveDays);
  let archivedCount = 0;
  for (const item of items) {
    if (item.archived) {
      continue;
    }
    const lastUsedStr = item.metrics.lastSuccess ?? item.metrics.lastUsed;
    if (!lastUsedStr) {
      continue;
    }
    const lastUsed = new Date(lastUsedStr);
    if (lastUsed < cutoffDate) {
      item.archived = true;
      archivedCount++;
    }
  }
  if (archivedCount > 0) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  }
  return archivedCount;
}
function formatHealthCheck(result) {
  const lines = [];
  const statusIcon = result.status === "healthy" ? "\u2713" : result.status === "warning" ? "\u26A0" : "\u2717";
  lines.push(`${statusIcon} LLKB Health Check: ${result.status.toUpperCase()}`);
  lines.push("\u2500".repeat(TABLE.COLUMN_WIDTH));
  for (const check of result.checks) {
    const icon = check.status === "pass" ? "\u2713" : check.status === "warn" ? "\u26A0" : "\u2717";
    lines.push(`${icon} ${check.name}: ${check.message}`);
    if (check.details) {
      lines.push(`  ${check.details}`);
    }
  }
  lines.push("\u2500".repeat(TABLE.COLUMN_WIDTH));
  lines.push(result.summary);
  return lines.join("\n");
}
function formatStats(stats) {
  const lines = [];
  lines.push("LLKB Statistics");
  lines.push("\u2500".repeat(TABLE.COLUMN_WIDTH));
  lines.push("");
  lines.push("Lessons:");
  lines.push(`  Total: ${stats.lessons.total} (${stats.lessons.active} active, ${stats.lessons.archived} archived)`);
  lines.push(`  Avg Confidence: ${stats.lessons.avgConfidence}`);
  lines.push(`  Avg Success Rate: ${stats.lessons.avgSuccessRate}`);
  lines.push(`  Needs Review: ${stats.lessons.needsReview}`);
  lines.push("");
  lines.push("Components:");
  lines.push(`  Total: ${stats.components.total} (${stats.components.active} active, ${stats.components.archived} archived)`);
  lines.push(`  Total Reuses: ${stats.components.totalReuses}`);
  lines.push(`  Avg Reuses/Component: ${stats.components.avgReusesPerComponent}`);
  lines.push("");
  lines.push("History:");
  lines.push(`  Today's Events: ${stats.history.todayEvents}`);
  lines.push(`  History Files: ${stats.history.historyFiles}`);
  if (stats.history.oldestFile) {
    lines.push(`  Date Range: ${stats.history.oldestFile} to ${stats.history.newestFile}`);
  }
  return lines.join("\n");
}
function formatPruneResult(result) {
  const lines = [];
  lines.push("LLKB Prune Results");
  lines.push("\u2500".repeat(TABLE.COLUMN_WIDTH));
  lines.push(`History files deleted: ${result.historyFilesDeleted}`);
  if (result.archivedLessons > 0) {
    lines.push(`Lessons archived: ${result.archivedLessons}`);
  }
  if (result.archivedComponents > 0) {
    lines.push(`Components archived: ${result.archivedComponents}`);
  }
  if (result.errors.length > 0) {
    lines.push("");
    lines.push("Errors:");
    for (const error of result.errors) {
      lines.push(`  \u2717 ${error}`);
    }
  }
  return lines.join("\n");
}
function runExportForAutogen(options) {
  const config = {
    llkbRoot: options.llkbRoot,
    outputDir: options.outputDir,
    minConfidence: options.minConfidence,
    includeCategories: options.includeCategories,
    includeScopes: options.includeScopes,
    generateGlossary: options.generateGlossary,
    generateConfig: options.generateConfig,
    configFormat: options.configFormat
  };
  return exportForAutogen(config);
}
function formatExportResultForConsole(result) {
  return formatExportResult(result);
}
function runLearnCommand(options) {
  return recordLearning({
    type: options.type,
    journeyId: options.journeyId,
    testFile: options.testFile,
    prompt: options.prompt,
    id: options.id,
    success: options.success,
    context: options.context,
    stepText: options.context,
    selectorStrategy: options.selectorStrategy,
    selectorValue: options.selectorValue,
    llkbRoot: options.llkbRoot
  });
}
function formatLearnResult(result) {
  return formatLearningResult(result);
}
function runCheckUpdates(options) {
  return checkUpdates(
    options.testsDir,
    options.llkbRoot || DEFAULT_LLKB_ROOT5,
    options.pattern || "*.spec.ts"
  );
}
function formatCheckUpdatesResult(result) {
  return formatUpdateCheckResult(result);
}
function runUpdateTest(options) {
  const { testPath, llkbRoot = DEFAULT_LLKB_ROOT5, dryRun = false } = options;
  try {
    const content = fs.readFileSync(testPath, "utf-8");
    const previousVersion = extractLlkbVersionFromTest(content);
    const newVersion = getCurrentLlkbVersion(llkbRoot);
    if (previousVersion && previousVersion === newVersion) {
      return {
        success: true,
        testPath,
        previousVersion,
        newVersion,
        modified: false,
        dryRun
      };
    }
    const updatedContent = updateTestLlkbVersion(content, newVersion);
    const modified = content !== updatedContent;
    if (!dryRun && modified) {
      fs.writeFileSync(testPath, updatedContent, "utf-8");
    }
    return {
      success: true,
      testPath,
      previousVersion,
      newVersion,
      modified,
      dryRun
    };
  } catch (error) {
    return {
      success: false,
      testPath,
      previousVersion: null,
      newVersion: getCurrentLlkbVersion(llkbRoot),
      modified: false,
      error: error instanceof Error ? error.message : String(error),
      dryRun
    };
  }
}
function formatUpdateTestResult(result) {
  const lines = [];
  const filename = path13.basename(result.testPath);
  if (!result.success) {
    lines.push(`\u2717 ${filename}: ${result.error}`);
    return lines.join("\n");
  }
  if (!result.modified) {
    lines.push(`\u2713 ${filename}: Already up to date`);
    return lines.join("\n");
  }
  const action = result.dryRun ? "Would update" : "Updated";
  const prevVer = result.previousVersion?.split("T")[0] || "none";
  const newVer = result.newVersion.split("T")[0] ?? "unknown";
  lines.push(`\u2713 ${filename}: ${action} LLKB version ${prevVer} \u2192 ${newVer}`);
  if (result.dryRun) {
    lines.push("  (dry run - no changes written)");
  }
  return lines.join("\n");
}
function runUpdateTests(options) {
  const {
    testsDir,
    llkbRoot = DEFAULT_LLKB_ROOT5,
    pattern = "*.spec.ts",
    dryRun = false
  } = options;
  const result = {
    updated: [],
    skipped: [],
    failed: [],
    summary: {
      total: 0,
      updated: 0,
      skipped: 0,
      failed: 0
    }
  };
  const checkResult = checkUpdates(testsDir, llkbRoot, pattern);
  result.summary.total = checkResult.summary.total;
  for (const { testFile } of checkResult.outdated) {
    const updateResult = runUpdateTest({
      testPath: testFile,
      llkbRoot,
      dryRun
    });
    if (updateResult.success) {
      if (updateResult.modified) {
        result.updated.push(updateResult);
        result.summary.updated++;
      } else {
        result.skipped.push({
          testPath: testFile,
          reason: "No changes needed after header update attempt"
        });
        result.summary.skipped++;
      }
    } else {
      result.failed.push({
        testPath: testFile,
        error: updateResult.error || "Unknown error"
      });
      result.summary.failed++;
    }
  }
  for (const { testFile } of checkResult.upToDate) {
    result.skipped.push({
      testPath: testFile,
      reason: "Already up to date"
    });
    result.summary.skipped++;
  }
  for (const { testFile, error } of checkResult.errors) {
    result.failed.push({ testPath: testFile, error });
    result.summary.failed++;
  }
  return result;
}
function formatUpdateTestsResult(result) {
  const lines = [];
  lines.push("LLKB Batch Update Results");
  lines.push("\u2500".repeat(TABLE.COLUMN_WIDTH));
  lines.push("");
  if (result.updated.length > 0) {
    lines.push("Updated:");
    for (const update of result.updated) {
      lines.push(`  ${formatUpdateTestResult(update)}`);
    }
    lines.push("");
  }
  if (result.failed.length > 0) {
    lines.push("Failed:");
    for (const { testPath, error } of result.failed) {
      lines.push(`  \u2717 ${path13.basename(testPath)}: ${error}`);
    }
    lines.push("");
  }
  lines.push("\u2500".repeat(TABLE.COLUMN_WIDTH));
  lines.push(`Total: ${result.summary.total} tests`);
  lines.push(`  Updated: ${result.summary.updated}`);
  lines.push(`  Skipped: ${result.summary.skipped}`);
  lines.push(`  Failed: ${result.summary.failed}`);
  return lines.join("\n");
}

// llkb/context.ts
var DEFAULT_MAX_LESSONS = 10;
var DEFAULT_MAX_COMPONENTS = 10;
function calculateLessonRelevance(lesson, journey, appProfile) {
  let score = 0;
  const reasons = [];
  score += lesson.metrics.confidence * 0.3;
  if (lesson.scope === "universal") {
    score += 0.2;
    reasons.push("universal scope");
  } else if (appProfile && lesson.scope === `framework:${appProfile.application.framework}`) {
    score += 0.25;
    reasons.push(`framework match: ${appProfile.application.framework}`);
  } else if (lesson.scope === "app-specific") {
    score += 0.15;
    reasons.push("app-specific");
  }
  const journeyKeywords = journey.keywords || extractKeywords(journey);
  if (lesson.tags && lesson.tags.length > 0) {
    const matchingTags = lesson.tags.filter(
      (tag) => journeyKeywords.some((kw) => tag.toLowerCase().includes(kw.toLowerCase()))
    );
    if (matchingTags.length > 0) {
      score += Math.min(matchingTags.length * 0.1, 0.3);
      reasons.push(`tags: ${matchingTags.join(", ")}`);
    }
  }
  if (lesson.journeyIds && lesson.journeyIds.length > 0) {
    if (lesson.journeyIds.includes(journey.id)) {
      score += 0.25;
      reasons.push("same journey");
    } else {
      const journeyScopePattern = journey.scope.toLowerCase();
      const matchingJourneys = lesson.journeyIds.filter(
        (jid) => jid.toLowerCase().includes(journeyScopePattern)
      );
      if (matchingJourneys.length > 0) {
        score += 0.15;
        reasons.push(`similar journeys: ${matchingJourneys.length}`);
      }
    }
  }
  if (journey.categories && journey.categories.includes(lesson.category)) {
    score += 0.15;
    reasons.push(`category: ${lesson.category}`);
  }
  const triggerTokens = tokenize(lesson.trigger);
  const triggerMatches = journeyKeywords.filter(
    (kw) => [...triggerTokens].some((t) => t.toLowerCase().includes(kw.toLowerCase()))
  );
  if (triggerMatches.length > 0) {
    score += Math.min(triggerMatches.length * 0.05, 0.15);
    reasons.push(`trigger match: ${triggerMatches.slice(0, 2).join(", ")}`);
  }
  if (lesson.metrics.lastSuccess) {
    const daysSinceSuccess = daysSince(lesson.metrics.lastSuccess);
    if (daysSinceSuccess < 7) {
      score += 0.1;
      reasons.push("recently successful");
    } else if (daysSinceSuccess < 30) {
      score += 0.05;
    }
  }
  if (lesson.metrics.successRate >= 0.9) {
    score += 0.1;
    reasons.push("high success rate");
  }
  return { score: Math.min(score, 1), reasons };
}
function calculateComponentRelevance(component, journey, appProfile) {
  let score = 0;
  const reasons = [];
  score += component.metrics.successRate * 0.3;
  if (component.scope === "universal") {
    score += 0.2;
    reasons.push("universal scope");
  } else if (appProfile && component.scope === `framework:${appProfile.application.framework}`) {
    score += 0.25;
    reasons.push(`framework match: ${appProfile.application.framework}`);
  } else if (appProfile && component.scope === `framework:${appProfile.application.dataGrid}` && appProfile.application.dataGrid !== "none") {
    score += 0.25;
    reasons.push(`data grid match: ${appProfile.application.dataGrid}`);
  }
  if (journey.categories && journey.categories.includes(component.category)) {
    score += 0.2;
    reasons.push(`category: ${component.category}`);
  }
  const journeyKeywords = journey.keywords || extractKeywords(journey);
  const descTokens = tokenize(component.description);
  const contextMatches = journeyKeywords.filter(
    (kw) => [...descTokens].some((t) => t.toLowerCase().includes(kw.toLowerCase()))
  );
  if (contextMatches.length > 0) {
    score += Math.min(contextMatches.length * 0.05, 0.2);
    reasons.push(`context match: ${contextMatches.slice(0, 3).join(", ")}`);
  }
  if (component.metrics.totalUses > 10) {
    score += 0.15;
    reasons.push("widely used");
  } else if (component.metrics.totalUses > 3) {
    score += 0.1;
    reasons.push("commonly used");
  }
  if (component.metrics.successRate >= 0.95) {
    score += 0.1;
    reasons.push("high reliability");
  }
  return { score: Math.min(score, 1), reasons };
}
function getRelevantContext(journey, lessons, components, config, appProfile = null, patterns = {}) {
  const maxLessons = DEFAULT_MAX_LESSONS;
  const maxComponents = DEFAULT_MAX_COMPONENTS;
  const journeyWithKeywords = {
    ...journey,
    keywords: journey.keywords || extractKeywords(journey)
  };
  const scoredLessons = lessons.filter((l) => !l.archived).map((lesson) => {
    const { score, reasons } = calculateLessonRelevance(lesson, journeyWithKeywords, appProfile);
    return { ...lesson, relevanceScore: score, matchReasons: reasons };
  }).filter((l) => l.relevanceScore > 0.2).sort((a, b) => {
    if (config.injection.prioritizeByConfidence) {
      return b.metrics.confidence - a.metrics.confidence || b.relevanceScore - a.relevanceScore;
    }
    return b.relevanceScore - a.relevanceScore;
  }).slice(0, maxLessons);
  const scoredComponents = components.filter((c) => !c.archived).map((component) => {
    const { score, reasons } = calculateComponentRelevance(
      component,
      journeyWithKeywords,
      appProfile
    );
    return { ...component, relevanceScore: score, matchReasons: reasons };
  }).filter((c) => c.relevanceScore > 0.2).sort((a, b) => {
    if (config.injection.prioritizeByConfidence) {
      return b.metrics.successRate - a.metrics.successRate || b.relevanceScore - a.relevanceScore;
    }
    return b.relevanceScore - a.relevanceScore;
  }).slice(0, maxComponents);
  const quirks = extractRelevantQuirks(lessons, journeyWithKeywords);
  const selectorPatterns = extractRelevantSelectorPatterns(
    patterns.selectors,
    journeyWithKeywords,
    appProfile
  );
  const timingPatterns = extractRelevantTimingPatterns(patterns.timing, journeyWithKeywords);
  const summary = calculateSummary(scoredLessons, scoredComponents, quirks);
  return {
    lessons: scoredLessons,
    components: scoredComponents,
    quirks,
    selectorPatterns,
    timingPatterns,
    summary
  };
}
function extractRelevantQuirks(lessons, journey) {
  const quirks = [];
  for (const lesson of lessons) {
    if (lesson.category === "quirk") {
      const journeyKeywords = journey.keywords || extractKeywords(journey);
      const triggerTokens = tokenize(lesson.trigger);
      const patternTokens = tokenize(lesson.pattern);
      const matchesScope = lesson.journeyIds.some(
        (jid) => journey.scope.toLowerCase().includes(jid.toLowerCase()) || jid.toLowerCase().includes(journey.scope.toLowerCase())
      ) || journeyKeywords.some(
        (kw) => [...triggerTokens].some((t) => t.toLowerCase().includes(kw.toLowerCase())) || [...patternTokens].some((t) => t.toLowerCase().includes(kw.toLowerCase()))
      ) || journey.routes && journey.routes.some(
        (route) => lesson.journeyIds.some((jid) => route.toLowerCase().includes(jid.toLowerCase()))
      );
      if (matchesScope) {
        quirks.push({
          id: lesson.id,
          component: lesson.title,
          location: lesson.journeyIds.join(", ") || lesson.scope,
          quirk: lesson.trigger,
          impact: `Confidence: ${Math.round(lesson.metrics.confidence * 100)}%`,
          workaround: lesson.pattern
        });
      }
    }
  }
  return quirks.slice(0, 5);
}
function extractRelevantSelectorPatterns(selectorPatterns, journey, appProfile) {
  if (!selectorPatterns) return [];
  const relevant = [];
  for (const pattern of selectorPatterns.selectorPatterns || []) {
    const matchesApp = appProfile && pattern.applicableTo.some(
      (app) => app === appProfile.application.framework || app === appProfile.application.dataGrid || app === appProfile.application.uiLibrary
    );
    const matchesKeywords = journey.keywords && pattern.applicableTo.some(
      (app) => journey.keywords.some((kw) => app.toLowerCase().includes(kw.toLowerCase()))
    );
    if (matchesApp || matchesKeywords || pattern.confidence >= 0.9) {
      relevant.push({
        id: pattern.id,
        name: pattern.name,
        template: pattern.template,
        confidence: pattern.confidence
      });
    }
  }
  return relevant.slice(0, 5);
}
function extractRelevantTimingPatterns(timingPatterns, journey) {
  if (!timingPatterns) return [];
  const relevant = [];
  for (const pattern of timingPatterns.asyncPatterns || []) {
    const contextTokens = tokenize(pattern.context);
    const journeyKeywords = journey.keywords || [];
    const matches = journeyKeywords.some(
      (kw) => [...contextTokens].some((t) => t.toLowerCase().includes(kw.toLowerCase()))
    );
    if (matches) {
      relevant.push({
        id: pattern.id,
        name: pattern.name,
        pattern: pattern.pattern,
        recommendation: pattern.recommendation
      });
    }
  }
  return relevant.slice(0, 5);
}
function calculateSummary(lessons, components, quirks) {
  const avgLessonConfidence = lessons.length > 0 ? lessons.reduce((sum, l) => sum + l.metrics.confidence, 0) / lessons.length : 0;
  const avgComponentSuccessRate = components.length > 0 ? components.reduce((sum, c) => sum + c.metrics.successRate, 0) / components.length : 0;
  const categoryCounts = {};
  for (const lesson of lessons) {
    categoryCounts[lesson.category] = (categoryCounts[lesson.category] || 0) + 1;
  }
  for (const component of components) {
    categoryCounts[component.category] = (categoryCounts[component.category] || 0) + 1;
  }
  const topCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([cat]) => cat);
  return {
    totalLessons: lessons.length,
    totalComponents: components.length,
    totalQuirks: quirks.length,
    avgLessonConfidence,
    avgComponentSuccessRate,
    topCategories
  };
}
function extractKeywords(journey) {
  const keywords = [];
  const titleTokens = journey.title.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  keywords.push(...titleTokens);
  keywords.push(journey.scope.toLowerCase());
  if (journey.routes) {
    for (const route of journey.routes) {
      const routeParts = route.split("/").filter((p) => p && p.length > 2).map((p) => p.toLowerCase());
      keywords.push(...routeParts);
    }
  }
  return [...new Set(keywords)];
}
function daysSince(dateStr) {
  const date = new Date(dateStr);
  const now = /* @__PURE__ */ new Date();
  return Math.floor((now.getTime() - date.getTime()) / (1e3 * 60 * 60 * 24));
}
function formatContextForPrompt(context, journey) {
  const lines = [];
  lines.push(`## LLKB Context (Auto-Injected for ${journey.id})`);
  lines.push("");
  if (context.components.length > 0) {
    lines.push(`### Available Components (Top ${context.components.length} for this scope)`);
    lines.push("");
    lines.push("| Component | File | Success Rate | Description |");
    lines.push("|-----------|------|--------------|-------------|");
    for (const comp of context.components) {
      const successRate = Math.round(comp.metrics.successRate * 100);
      const description = comp.description.slice(0, 50) + (comp.description.length > 50 ? "..." : "");
      lines.push(`| ${comp.name} | ${comp.filePath} | ${successRate}% | ${description} |`);
    }
    lines.push("");
    lines.push("**Import Example:**");
    lines.push("```typescript");
    const byPath = {};
    for (const comp of context.components) {
      const importPath = comp.filePath.replace(/\.ts$/, "").replace(/^\.\//, "");
      if (!byPath[importPath]) byPath[importPath] = [];
      byPath[importPath].push(comp.name);
    }
    for (const [path17, names] of Object.entries(byPath)) {
      lines.push(`import { ${names.join(", ")} } from './${path17}';`);
    }
    lines.push("```");
    lines.push("");
  }
  if (context.lessons.length > 0) {
    lines.push(`### Relevant Lessons (Top ${context.lessons.length})`);
    lines.push("");
    for (let i = 0; i < context.lessons.length; i++) {
      const lesson = context.lessons[i];
      if (!lesson) continue;
      const confidence = lesson.metrics.confidence >= 0.8 ? "HIGH" : lesson.metrics.confidence >= 0.5 ? "MEDIUM" : "LOW";
      lines.push(`${i + 1}. **[${confidence}] ${lesson.id}: ${lesson.title}**`);
      lines.push(`   - Trigger: ${lesson.trigger}`);
      lines.push(`   - Pattern: \`${lesson.pattern.slice(0, 100)}${lesson.pattern.length > 100 ? "..." : ""}\``);
      lines.push("");
    }
  }
  if (context.quirks.length > 0) {
    lines.push("### Known Quirks for This Scope");
    lines.push("");
    for (const quirk of context.quirks) {
      lines.push(`- **${quirk.id} (${quirk.component})**: ${quirk.quirk}`);
      if (quirk.workaround) {
        lines.push(`  - Workaround: ${quirk.workaround}`);
      }
    }
    lines.push("");
  }
  lines.push("---");
  return lines.join("\n");
}
function getRelevantScopes(appProfile) {
  const scopes = ["universal", "app-specific"];
  if (appProfile) {
    if (appProfile.application.framework !== "other") {
      scopes.push(`framework:${appProfile.application.framework}`);
    }
    if (appProfile.application.dataGrid !== "none") {
      scopes.push(`framework:${appProfile.application.dataGrid}`);
    }
    if (appProfile.application.uiLibrary !== "custom" && appProfile.application.uiLibrary !== "none") {
      scopes.push(`framework:${appProfile.application.uiLibrary}`);
    }
  }
  return scopes;
}

// llkb/matching.ts
var ACTION_KEYWORDS = [
  "verify",
  "check",
  "assert",
  "expect",
  "navigate",
  "goto",
  "click",
  "fill",
  "type",
  "select",
  "wait",
  "load",
  "submit",
  "upload",
  "download",
  "hover",
  "drag",
  "drop",
  "scroll",
  "resize",
  "close",
  "open",
  "toggle",
  "expand",
  "collapse",
  "search",
  "filter",
  "sort",
  "create",
  "delete",
  "update",
  "edit",
  "save",
  "cancel",
  "confirm",
  "login",
  "logout",
  "authenticate"
];
var REUSABLE_PATTERNS = [
  { pattern: /navigation|sidebar|menu|breadcrumb/i, category: "navigation" },
  { pattern: /form|input|submit|validation/i, category: "ui-interaction" },
  { pattern: /table|grid|row|cell|column/i, category: "data" },
  { pattern: /modal|dialog|popup|overlay/i, category: "ui-interaction" },
  { pattern: /toast|alert|notification|message/i, category: "assertion" },
  { pattern: /login|auth|logout|session/i, category: "auth" },
  { pattern: /loading|spinner|skeleton|progress/i, category: "timing" },
  { pattern: /select|dropdown|picker|autocomplete/i, category: "ui-interaction" },
  { pattern: /tab|accordion|panel|collapse/i, category: "ui-interaction" },
  { pattern: /search|filter|sort|pagination/i, category: "data" }
];
function extractStepKeywords(step) {
  const text = `${step.name} ${step.description || ""}`.toLowerCase();
  const keywords = [];
  for (const keyword of ACTION_KEYWORDS) {
    if (text.includes(keyword)) {
      keywords.push(keyword);
    }
  }
  if (step.keywords) {
    keywords.push(...step.keywords.map((k) => k.toLowerCase()));
  }
  const elementMatches = text.match(/\b(button|link|input|field|table|grid|form|modal|dialog|toast|sidebar|menu|dropdown|checkbox|radio)\b/gi);
  if (elementMatches) {
    keywords.push(...elementMatches.map((m) => m.toLowerCase()));
  }
  return [...new Set(keywords)];
}
function calculateStepComponentSimilarity(step, component, stepKeywords) {
  let score = 0;
  let factors = 0;
  if (step.code) {
    const stepCategory = inferCategory(step.code);
    if (stepCategory === component.category) {
      score += 0.3;
    }
  }
  factors += 0.3;
  const componentKeywords = [
    component.category,
    ...component.description?.toLowerCase().split(/\s+/) || [],
    component.name.toLowerCase()
  ];
  const keywordOverlap = stepKeywords.filter(
    (k) => componentKeywords.some((ck) => ck.includes(k) || k.includes(ck))
  ).length;
  const keywordScore = Math.min(keywordOverlap / Math.max(stepKeywords.length, 1), 1);
  score += keywordScore * 0.4;
  factors += 0.4;
  const stepText = `${step.name} ${step.description || ""}`.toLowerCase();
  const componentText = `${component.name} ${component.description}`.toLowerCase();
  const stepWords = new Set(stepText.split(/\s+/).filter((w) => w.length > 2));
  const componentWords = new Set(componentText.split(/\s+/).filter((w) => w.length > 2));
  let overlap = 0;
  for (const word of stepWords) {
    if (componentWords.has(word)) {
      overlap++;
    }
  }
  const nameScore = overlap / Math.max(stepWords.size, 1);
  score += nameScore * 0.3;
  factors += 0.3;
  return score / factors;
}
function scopeMatches(componentScope, _journeyScope, appFramework) {
  if (componentScope === "universal") {
    return true;
  }
  if (componentScope.startsWith("framework:")) {
    const framework = componentScope.replace("framework:", "");
    return appFramework === framework;
  }
  if (componentScope === "app-specific") {
    return true;
  }
  return false;
}
function matchStepsToComponents(steps, components, options = {}) {
  const { useThreshold = 0.7, suggestThreshold = 0.4, appFramework, categories } = options;
  const filteredComponents = components.filter((c) => {
    if (c.archived) {
      return false;
    }
    if (categories && categories.length > 0 && !categories.includes(c.category)) {
      return false;
    }
    return true;
  });
  return steps.map((step) => {
    const stepKeywords = extractStepKeywords(step);
    let bestMatch = null;
    let bestScore = 0;
    for (const component of filteredComponents) {
      if (!scopeMatches(component.scope, step.scope, appFramework)) {
        continue;
      }
      const score = calculateStepComponentSimilarity(step, component, stepKeywords);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = component;
      }
    }
    let recommendation;
    let reason;
    if (bestScore >= useThreshold) {
      recommendation = "USE";
      reason = `High confidence match (${(bestScore * 100).toFixed(0)}%) - use ${bestMatch.name} component`;
    } else if (bestScore >= suggestThreshold) {
      recommendation = "SUGGEST";
      reason = `Moderate match (${(bestScore * 100).toFixed(0)}%) - consider ${bestMatch.name} component`;
    } else {
      recommendation = "NONE";
      reason = bestMatch ? `Low match score (${(bestScore * 100).toFixed(0)}%) - write inline code` : "No matching components found";
      bestMatch = null;
    }
    return {
      step,
      component: bestMatch,
      score: bestScore,
      recommendation,
      reason
    };
  });
}
function matchesReusablePattern(code) {
  for (const { pattern, category } of REUSABLE_PATTERNS) {
    if (pattern.test(code)) {
      return { matches: true, category };
    }
  }
  return { matches: false };
}
function suggestModulePath(category, scope) {
  if (scope.startsWith("framework:")) {
    const framework = scope.replace("framework:", "");
    return `@artk/core/${framework}/${category}`;
  }
  return `modules/foundation/${category}`;
}
function shouldExtractAsComponent(code, occurrences, config, existingComponents = []) {
  const {
    minOccurrences = 2,
    predictiveExtraction = true,
    minLinesForExtraction = 3,
    similarityThreshold = 0.8
  } = config.extraction;
  const lineCount = countLines(code);
  if (lineCount < minLinesForExtraction) {
    return {
      shouldExtract: false,
      confidence: 0,
      reason: `Code too short (${lineCount} lines < ${minLinesForExtraction} minimum)`
    };
  }
  const normalizedCode = normalizeCode(code);
  for (const component of existingComponents) {
    if (component.archived) continue;
    const sourceNormalized = normalizeCode(component.source.originalCode);
    const similarity = calculateSimilarity(normalizedCode, sourceNormalized);
    if (similarity >= similarityThreshold) {
      return {
        shouldExtract: false,
        confidence: 1,
        reason: `Similar component already exists: ${component.name} (${(similarity * 100).toFixed(0)}% similar)`
      };
    }
  }
  const category = inferCategory(code);
  const patternMatch = matchesReusablePattern(code);
  const uniqueJourneys = new Set(occurrences.map((o) => o.journeyId)).size;
  if (occurrences.length >= minOccurrences) {
    return {
      shouldExtract: true,
      confidence: Math.min(0.7 + uniqueJourneys * 0.1, 0.95),
      reason: `Pattern appears ${occurrences.length} times across ${uniqueJourneys} journey(s) (>= ${minOccurrences} threshold)`,
      suggestedCategory: patternMatch.category || category,
      suggestedPath: suggestModulePath(patternMatch.category || category, "app-specific")
    };
  }
  if (predictiveExtraction && patternMatch.matches) {
    return {
      shouldExtract: true,
      confidence: 0.6,
      reason: `Predictive extraction: matches common ${patternMatch.category} pattern`,
      suggestedCategory: patternMatch.category,
      suggestedPath: suggestModulePath(patternMatch.category, "app-specific")
    };
  }
  if (occurrences.length === 1 && !patternMatch.matches) {
    return {
      shouldExtract: false,
      confidence: 0.3,
      reason: "Single occurrence, not a common pattern - keep inline",
      suggestedCategory: category
    };
  }
  return {
    shouldExtract: false,
    confidence: 0.4,
    reason: `Not enough occurrences (${occurrences.length} < ${minOccurrences}) and no common pattern match`,
    suggestedCategory: category
  };
}
function findExtractionCandidates(codeSnippets, config, existingComponents = []) {
  const { similarityThreshold = 0.8 } = config.extraction;
  const groups = /* @__PURE__ */ new Map();
  const codeByHash = /* @__PURE__ */ new Map();
  for (const snippet of codeSnippets) {
    const normalized = normalizeCode(snippet.code);
    const hash = hashCode(normalized);
    let matchedHash = null;
    for (const [existingHash, existingCode] of codeByHash.entries()) {
      const similarity = calculateSimilarity(normalized, existingCode);
      if (similarity >= similarityThreshold) {
        matchedHash = existingHash;
        break;
      }
    }
    const groupHash = matchedHash || hash;
    if (!groups.has(groupHash)) {
      groups.set(groupHash, []);
      codeByHash.set(groupHash, normalized);
    }
    groups.get(groupHash).push({
      file: snippet.file,
      journeyId: snippet.journeyId,
      stepName: snippet.stepName,
      lineStart: snippet.lineStart,
      lineEnd: snippet.lineEnd
    });
  }
  const candidates = [];
  for (const [hash, occurrences] of groups.entries()) {
    const code = codeByHash.get(hash);
    const firstOccurrence = occurrences[0];
    if (!firstOccurrence) continue;
    const originalSnippet = codeSnippets.find(
      (s) => s.file === firstOccurrence.file && s.lineStart === firstOccurrence.lineStart
    );
    const checkResult = shouldExtractAsComponent(
      originalSnippet?.code || code,
      occurrences,
      config,
      existingComponents
    );
    const uniqueJourneys = new Set(occurrences.map((o) => o.journeyId)).size;
    const score = occurrences.length * 0.3 + uniqueJourneys * 0.4 + checkResult.confidence * 0.3;
    let recommendation;
    if (checkResult.shouldExtract && score >= 0.7) {
      recommendation = "EXTRACT_NOW";
    } else if (checkResult.shouldExtract || score >= 0.5) {
      recommendation = "CONSIDER";
    } else {
      recommendation = "SKIP";
    }
    candidates.push({
      pattern: code,
      originalCode: originalSnippet?.code || code,
      occurrences: occurrences.length,
      journeys: [...new Set(occurrences.map((o) => o.journeyId))],
      files: [...new Set(occurrences.map((o) => o.file))],
      category: checkResult.suggestedCategory || inferCategory(code),
      score,
      recommendation
    });
  }
  return candidates.sort((a, b) => b.score - a.score);
}
var DEFAULT_EXTENSIONS = [".ts", ".js"];
var DEFAULT_EXCLUDE_DIRS = ["node_modules", "dist", "build", ".git", "coverage"];
var TEST_STEP_REGEX = /(?:await\s+)?test\.step\s*\(\s*(['"`])(.+?)\1\s*,\s*async\s*\([^)]*\)\s*=>\s*\{([\s\S]*?)\}\s*\)/g;
var JOURNEY_ID_REGEX = /(?:JRN|jrn)[-_]?(\d+)/i;
function extractJourneyId(filePath, content) {
  const fileMatch = path13.basename(filePath).match(JOURNEY_ID_REGEX);
  if (fileMatch && fileMatch[1]) {
    return `JRN-${fileMatch[1].padStart(4, "0")}`;
  }
  const contentMatch = content.match(JOURNEY_ID_REGEX);
  if (contentMatch && contentMatch[1]) {
    return `JRN-${contentMatch[1].padStart(4, "0")}`;
  }
  const basename7 = path13.basename(filePath, path13.extname(filePath));
  return `JRN-${basename7.toUpperCase().replace(/[^A-Z0-9]/g, "-").slice(0, 20)}`;
}
function parseTestSteps(filePath, content) {
  const steps = [];
  const journeyId = extractJourneyId(filePath, content);
  TEST_STEP_REGEX.lastIndex = 0;
  let match;
  while ((match = TEST_STEP_REGEX.exec(content)) !== null) {
    const stepName = match[2];
    const stepCode = match[3];
    if (!stepName || !stepCode) continue;
    const trimmedCode = stepCode.trim();
    const beforeMatch = content.slice(0, match.index);
    const lineStart = beforeMatch.split("\n").length;
    const lineEnd = lineStart + match[0].split("\n").length - 1;
    const codeWithoutComments = trimmedCode.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "").trim();
    if (codeWithoutComments.length > 0) {
      steps.push({
        file: filePath,
        journeyId,
        stepName,
        code: trimmedCode,
        lineStart,
        lineEnd
      });
    }
  }
  return steps;
}
function findTestFiles2(dir, extensions, excludeDirs) {
  const files = [];
  if (!fs.existsSync(dir)) {
    return files;
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path13.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!excludeDirs.includes(entry.name)) {
        files.push(...findTestFiles2(fullPath, extensions, excludeDirs));
      }
    } else if (entry.isFile()) {
      const ext = path13.extname(entry.name);
      if (extensions.includes(ext)) {
        if (entry.name.includes(".spec.") || entry.name.includes(".test.") || entry.name.includes(".e2e.")) {
          files.push(fullPath);
        }
      }
    }
  }
  return files;
}
function groupSimilarPatterns(steps, similarityThreshold, minLines) {
  const groups = /* @__PURE__ */ new Map();
  const normalizedByStep = /* @__PURE__ */ new Map();
  for (const step of steps) {
    const normalized = normalizeCode(step.code);
    const lineCount = countLines(step.code);
    if (lineCount < minLines) {
      continue;
    }
    normalizedByStep.set(step, normalized);
  }
  const processed = /* @__PURE__ */ new Set();
  for (const [step, normalized] of normalizedByStep) {
    if (processed.has(step)) continue;
    const hash = hashCode(normalized);
    let foundGroup = false;
    for (const [groupHash, groupSteps] of groups) {
      const firstGroupStep = groupSteps[0];
      if (!firstGroupStep) continue;
      const groupNormalized = normalizedByStep.get(firstGroupStep);
      if (!groupNormalized) continue;
      const similarity = calculateSimilarity(normalized, groupNormalized);
      if (similarity >= similarityThreshold) {
        const existingGroup = groups.get(groupHash);
        if (existingGroup) {
          existingGroup.push(step);
        }
        processed.add(step);
        foundGroup = true;
        break;
      }
    }
    if (!foundGroup) {
      groups.set(hash, [step]);
      processed.add(step);
    }
  }
  return groups;
}
function buildDuplicateGroups(stepGroups, minOccurrences) {
  const duplicateGroups = [];
  for (const [hash, steps] of stepGroups) {
    if (steps.length < minOccurrences) {
      continue;
    }
    const uniqueJourneys = new Set(steps.map((s) => s.journeyId)).size;
    const uniqueFiles = new Set(steps.map((s) => s.file)).size;
    let totalSimilarity = 0;
    let pairs = 0;
    for (let i = 0; i < steps.length; i++) {
      for (let j = i + 1; j < steps.length; j++) {
        const stepI = steps[i];
        const stepJ = steps[j];
        if (!stepI || !stepJ) continue;
        const sim = calculateSimilarity(
          normalizeCode(stepI.code),
          normalizeCode(stepJ.code)
        );
        totalSimilarity += sim;
        pairs++;
      }
    }
    const internalSimilarity = pairs > 0 ? totalSimilarity / pairs : 1;
    const originalSamples = steps.slice(0, 3).map((s) => s.code);
    const firstStep = steps[0];
    if (!firstStep) continue;
    const category = inferCategory(firstStep.code);
    const occurrences = steps.map((s) => ({
      file: s.file,
      journey: s.journeyId,
      stepName: s.stepName,
      code: s.code,
      normalizedCode: normalizeCode(s.code),
      hash: hashCode(normalizeCode(s.code)),
      lineStart: s.lineStart,
      lineEnd: s.lineEnd
    }));
    duplicateGroups.push({
      patternHash: hash,
      normalizedCode: normalizeCode(firstStep.code),
      originalSamples,
      occurrences,
      uniqueJourneys,
      uniqueFiles,
      category,
      internalSimilarity
    });
  }
  return duplicateGroups.sort((a, b) => b.occurrences.length - a.occurrences.length);
}
function detectDuplicatesAcrossFiles(testDir, options = {}) {
  const {
    similarityThreshold = 0.8,
    minOccurrences = 2,
    minLines = 3,
    extensions = DEFAULT_EXTENSIONS,
    excludeDirs = DEFAULT_EXCLUDE_DIRS
  } = options;
  const testFiles = findTestFiles2(testDir, extensions, excludeDirs);
  const allSteps = [];
  for (const file of testFiles) {
    try {
      const content = fs.readFileSync(file, "utf-8");
      const steps = parseTestSteps(file, content);
      allSteps.push(...steps);
    } catch (error) {
      console.warn(`Warning: Could not read file ${file}`);
    }
  }
  const stepGroups = groupSimilarPatterns(allSteps, similarityThreshold, minLines);
  const duplicateGroups = buildDuplicateGroups(stepGroups, minOccurrences);
  const uniquePatterns = Array.from(stepGroups.values()).filter(
    (g) => g.length === 1
  ).length;
  const extractionCandidates = duplicateGroups.map((group) => ({
    pattern: group.normalizedCode,
    originalCode: group.originalSamples[0] || group.normalizedCode,
    occurrences: group.occurrences.length,
    journeys: [...new Set(group.occurrences.map((o) => o.journey))],
    files: [...new Set(group.occurrences.map((o) => o.file))],
    category: group.category,
    score: group.occurrences.length * 0.3 + group.uniqueJourneys * 0.4 + group.internalSimilarity * 0.3,
    recommendation: group.occurrences.length >= 3 ? "EXTRACT_NOW" : group.occurrences.length >= 2 ? "CONSIDER" : "SKIP"
  }));
  return {
    totalSteps: allSteps.length,
    uniquePatterns,
    duplicatePatterns: duplicateGroups.length,
    duplicateGroups,
    extractionCandidates: extractionCandidates.sort((a, b) => b.score - a.score),
    filesAnalyzed: testFiles
  };
}
function detectDuplicatesInFile(filePath, options = {}) {
  const {
    similarityThreshold = 0.8,
    minOccurrences = 2,
    minLines = 2
    // Lower threshold for single file
  } = options;
  if (!fs.existsSync(filePath)) {
    return {
      totalSteps: 0,
      uniquePatterns: 0,
      duplicatePatterns: 0,
      duplicateGroups: [],
      extractionCandidates: [],
      filesAnalyzed: []
    };
  }
  const content = fs.readFileSync(filePath, "utf-8");
  const steps = parseTestSteps(filePath, content);
  const stepGroups = groupSimilarPatterns(steps, similarityThreshold, minLines);
  const duplicateGroups = buildDuplicateGroups(stepGroups, minOccurrences);
  const uniquePatterns = Array.from(stepGroups.values()).filter(
    (g) => g.length === 1
  ).length;
  const extractionCandidates = duplicateGroups.map((group) => {
    const firstOccurrence = group.occurrences[0];
    return {
      pattern: group.normalizedCode,
      originalCode: group.originalSamples[0] || group.normalizedCode,
      occurrences: group.occurrences.length,
      journeys: firstOccurrence ? [firstOccurrence.journey] : [],
      files: [filePath],
      category: group.category,
      score: group.occurrences.length * 0.5 + group.internalSimilarity * 0.5,
      recommendation: group.occurrences.length >= 2 ? "CONSIDER" : "SKIP"
    };
  });
  return {
    totalSteps: steps.length,
    uniquePatterns,
    duplicatePatterns: duplicateGroups.length,
    duplicateGroups,
    extractionCandidates: extractionCandidates.sort((a, b) => b.score - a.score),
    filesAnalyzed: [filePath]
  };
}
function findUnusedComponentOpportunities(testDir, components, options = {}) {
  const {
    similarityThreshold = 0.6,
    // Lower threshold for opportunities
    extensions = DEFAULT_EXTENSIONS,
    excludeDirs = DEFAULT_EXCLUDE_DIRS
  } = options;
  const testFiles = findTestFiles2(testDir, extensions, excludeDirs);
  const opportunities = /* @__PURE__ */ new Map();
  for (const component of components) {
    if (!component.archived) {
      opportunities.set(component.id, []);
    }
  }
  for (const file of testFiles) {
    try {
      const content = fs.readFileSync(file, "utf-8");
      const steps = parseTestSteps(file, content);
      for (const step of steps) {
        const normalizedStep = normalizeCode(step.code);
        for (const component of components) {
          if (component.archived) continue;
          const normalizedComponent = normalizeCode(component.source.originalCode);
          const similarity = calculateSimilarity(normalizedStep, normalizedComponent);
          if (similarity >= similarityThreshold) {
            const componentOpportunities = opportunities.get(component.id);
            if (componentOpportunities) {
              componentOpportunities.push({
                file: step.file,
                stepName: step.stepName,
                similarity,
                lineStart: step.lineStart,
                lineEnd: step.lineEnd
              });
            }
          }
        }
      }
    } catch {
    }
  }
  return components.filter((c) => {
    if (c.archived) return false;
    const ops = opportunities.get(c.id);
    return ops && ops.length > 0;
  }).map((component) => ({
    component,
    matches: (opportunities.get(component.id) || []).sort((a, b) => b.similarity - a.similarity)
  })).sort((a, b) => b.matches.length - a.matches.length);
}
var REGISTRY_FILENAME = "registry.json";
var DEFAULT_MODULES_DIR = "src/modules";
function getRegistryPath(harnessRoot) {
  return path13.join(harnessRoot, DEFAULT_MODULES_DIR, REGISTRY_FILENAME);
}
function createEmptyRegistry() {
  return {
    version: "1.0.0",
    lastUpdated: (/* @__PURE__ */ new Date()).toISOString(),
    modules: [],
    componentToModule: {},
    exportToModule: {}
  };
}
function loadRegistry(harnessRoot) {
  const registryPath = getRegistryPath(harnessRoot);
  try {
    const data = loadJSON(registryPath);
    return data || createEmptyRegistry();
  } catch {
    return null;
  }
}
async function saveRegistry(harnessRoot, registry) {
  const registryPath = getRegistryPath(harnessRoot);
  registry.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
  const dir = path13.dirname(registryPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return saveJSONAtomic(registryPath, registry);
}
function rebuildIndexes(registry) {
  registry.componentToModule = {};
  registry.exportToModule = {};
  for (const module of registry.modules) {
    for (const exp of module.exports) {
      if (exp.componentId) {
        registry.componentToModule[exp.componentId] = module.path;
      }
      registry.exportToModule[exp.name] = module.path;
    }
  }
}
async function addComponentToRegistry(harnessRoot, component, options) {
  let registry = loadRegistry(harnessRoot);
  if (!registry) {
    registry = createEmptyRegistry();
  }
  let moduleEntry = registry.modules.find((m) => m.path === options.modulePath);
  if (!moduleEntry) {
    moduleEntry = {
      name: options.moduleName,
      path: options.modulePath,
      description: options.moduleDescription || `${options.moduleName} utilities`,
      exports: [],
      dependencies: options.dependencies || [],
      peerDependencies: options.peerDependencies || ["@playwright/test"],
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
    };
    registry.modules.push(moduleEntry);
  }
  const existingExport = moduleEntry.exports.find((e) => e.name === options.exportDetails.name);
  if (existingExport) {
    existingExport.componentId = component.id;
    existingExport.signature = options.exportDetails.signature;
    existingExport.description = options.exportDetails.description;
  } else {
    moduleEntry.exports.push({
      name: options.exportDetails.name,
      type: options.exportDetails.type,
      componentId: component.id,
      signature: options.exportDetails.signature,
      description: options.exportDetails.description
    });
  }
  moduleEntry.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
  rebuildIndexes(registry);
  return saveRegistry(harnessRoot, registry);
}
async function removeComponentFromRegistry(harnessRoot, componentId) {
  const registry = loadRegistry(harnessRoot);
  if (!registry) {
    return { success: false, error: "Registry not found" };
  }
  let found = false;
  for (const module of registry.modules) {
    const exportIndex = module.exports.findIndex((e) => e.componentId === componentId);
    if (exportIndex !== -1) {
      module.exports.splice(exportIndex, 1);
      module.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
      found = true;
      break;
    }
  }
  if (!found) {
    return { success: false, error: `Component ${componentId} not found in registry` };
  }
  rebuildIndexes(registry);
  return saveRegistry(harnessRoot, registry);
}
async function updateComponentInRegistry(harnessRoot, componentId, updates) {
  const registry = loadRegistry(harnessRoot);
  if (!registry) {
    return { success: false, error: "Registry not found" };
  }
  let found = false;
  for (const module of registry.modules) {
    const exportEntry = module.exports.find((e) => e.componentId === componentId);
    if (exportEntry) {
      if (updates.signature !== void 0) {
        exportEntry.signature = updates.signature;
      }
      if (updates.description !== void 0) {
        exportEntry.description = updates.description;
      }
      if (updates.type !== void 0) {
        exportEntry.type = updates.type;
      }
      module.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
      found = true;
      break;
    }
  }
  if (!found) {
    return { success: false, error: `Component ${componentId} not found in registry` };
  }
  return saveRegistry(harnessRoot, registry);
}
function getModuleForComponent(harnessRoot, componentId) {
  const registry = loadRegistry(harnessRoot);
  if (!registry) {
    return null;
  }
  const modulePath = registry.componentToModule[componentId];
  if (!modulePath) {
    return null;
  }
  const module = registry.modules.find((m) => m.path === modulePath);
  if (!module) {
    return null;
  }
  const exportEntry = module.exports.find((e) => e.componentId === componentId);
  if (!exportEntry) {
    return null;
  }
  return { module, export: exportEntry };
}
function getImportPath(harnessRoot, componentId) {
  const info = getModuleForComponent(harnessRoot, componentId);
  if (!info) {
    return null;
  }
  return `import { ${info.export.name} } from '@modules/${info.module.path}';`;
}
function listModules(harnessRoot) {
  const registry = loadRegistry(harnessRoot);
  return registry?.modules || [];
}
function findModulesByCategory(harnessRoot, category) {
  const registry = loadRegistry(harnessRoot);
  if (!registry) {
    return [];
  }
  return registry.modules.filter(
    (m) => m.path.includes(category) || m.name.includes(category)
  );
}
function validateRegistryConsistency(harnessRoot, components) {
  const registry = loadRegistry(harnessRoot);
  const result = {
    valid: true,
    missingInRegistry: [],
    missingInComponents: [],
    pathMismatches: []
  };
  if (!registry) {
    result.valid = false;
    result.missingInRegistry = components.filter((c) => !c.archived).map((c) => c.id);
    return result;
  }
  const registryComponentIds = /* @__PURE__ */ new Set();
  for (const module of registry.modules) {
    for (const exp of module.exports) {
      if (exp.componentId) {
        registryComponentIds.add(exp.componentId);
      }
    }
  }
  for (const component of components) {
    if (component.archived) continue;
    if (!registryComponentIds.has(component.id)) {
      result.missingInRegistry.push(component.id);
      result.valid = false;
    } else {
      const modulePath = registry.componentToModule[component.id];
      if (modulePath && !component.filePath.includes(modulePath)) {
        result.pathMismatches.push({
          componentId: component.id,
          registryPath: modulePath,
          componentPath: component.filePath
        });
        result.valid = false;
      }
    }
  }
  const componentIds = new Set(components.map((c) => c.id));
  for (const componentId of registryComponentIds) {
    if (!componentIds.has(componentId)) {
      result.missingInComponents.push(componentId);
      result.valid = false;
    }
  }
  return result;
}
async function syncRegistryWithComponents(harnessRoot, components) {
  const validation = validateRegistryConsistency(harnessRoot, components);
  let registry = loadRegistry(harnessRoot);
  if (!registry) {
    registry = createEmptyRegistry();
  }
  let added = 0;
  let removed = 0;
  for (const staleId of validation.missingInComponents) {
    for (const module of registry.modules) {
      const index = module.exports.findIndex((e) => e.componentId === staleId);
      if (index !== -1) {
        module.exports.splice(index, 1);
        removed++;
      }
    }
  }
  registry.modules = registry.modules.filter((m) => m.exports.length > 0);
  added = validation.missingInRegistry.length;
  rebuildIndexes(registry);
  const saveResult = await saveRegistry(harnessRoot, registry);
  return {
    ...saveResult,
    added,
    removed
  };
}
var CURRENT_VERSION = "1.0.0";
var MIN_SUPPORTED_VERSION = "0.1.0";
function parseVersion(version) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) {
    return { major: 0, minor: 0, patch: 0, full: "0.0.0" };
  }
  const major = match[1] || "0";
  const minor = match[2] || "0";
  const patch = match[3] || "0";
  return {
    major: parseInt(major, 10),
    minor: parseInt(minor, 10),
    patch: parseInt(patch, 10),
    full: `${major}.${minor}.${patch}`
  };
}
function compareVersions2(a, b) {
  const va = parseVersion(a);
  const vb = parseVersion(b);
  if (va.major !== vb.major) return va.major < vb.major ? -1 : 1;
  if (va.minor !== vb.minor) return va.minor < vb.minor ? -1 : 1;
  if (va.patch !== vb.patch) return va.patch < vb.patch ? -1 : 1;
  return 0;
}
function isVersionSupported(version) {
  return compareVersions2(version, MIN_SUPPORTED_VERSION) >= 0;
}
function needsMigration(version) {
  return compareVersions2(version, CURRENT_VERSION) < 0;
}
var migrations = /* @__PURE__ */ new Map();
migrations.set("0.x->1.0.0", async (data, _llkbRoot) => {
  const warnings = [];
  if (data.lessons && Array.isArray(data.lessons)) {
    data.lessons = data.lessons.map((lesson) => {
      if (!lesson.metrics) {
        lesson.metrics = {
          occurrences: lesson.occurrences || 0,
          successRate: lesson.successRate || 0.5,
          confidence: lesson.confidence || 0.5,
          firstSeen: lesson.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
          lastSuccess: null,
          lastApplied: null
        };
        warnings.push(`Added missing metrics to lesson ${lesson.id}`);
      }
      if (!lesson.validation) {
        lesson.validation = {
          humanReviewed: false
        };
      }
      if (lesson.created && !lesson.metrics.firstSeen) {
        lesson.metrics.firstSeen = lesson.created;
        delete lesson.created;
      }
      return lesson;
    });
  }
  if (data.components && Array.isArray(data.components)) {
    data.components = data.components.map((component) => {
      if (!component.metrics) {
        component.metrics = {
          totalUses: component.uses || 0,
          successRate: 1,
          lastUsed: null
        };
        delete component.uses;
        warnings.push(`Added missing metrics to component ${component.id}`);
      }
      if (!component.source) {
        component.source = {
          originalCode: component.code || "",
          extractedFrom: component.journeyId || "unknown",
          extractedBy: "journey-verify",
          extractedAt: component.createdAt || (/* @__PURE__ */ new Date()).toISOString()
        };
        delete component.code;
        delete component.journeyId;
        warnings.push(`Added missing source info to component ${component.id}`);
      }
      return component;
    });
  }
  data.version = "1.0.0";
  data.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
  return { data, warnings };
});
function getMigrationPath(fromVersion, toVersion) {
  const from = parseVersion(fromVersion);
  const to = parseVersion(toVersion);
  const path17 = [];
  if (from.major === 0 && to.major >= 1) {
    path17.push("0.x->1.0.0");
  }
  return path17;
}
async function applyMigration(data, migrationKey, llkbRoot) {
  const migrationFn = migrations.get(migrationKey);
  if (!migrationFn) {
    return { data, warnings: [`No migration found for ${migrationKey}`] };
  }
  return migrationFn(data, llkbRoot);
}
async function migrateFile(filePath, llkbRoot) {
  try {
    const data = loadJSON(filePath);
    if (!data) {
      return { success: false, warnings: [], error: `Could not read ${filePath}` };
    }
    const currentVersion = data.version || "0.0.0";
    if (!needsMigration(currentVersion)) {
      return { success: true, warnings: ["Already at current version"] };
    }
    if (!isVersionSupported(currentVersion)) {
      return {
        success: false,
        warnings: [],
        error: `Version ${currentVersion} is not supported (min: ${MIN_SUPPORTED_VERSION})`
      };
    }
    const migrationPath = getMigrationPath(currentVersion, CURRENT_VERSION);
    let migratedData = data;
    const allWarnings = [];
    for (const migrationKey of migrationPath) {
      const result = await applyMigration(migratedData, migrationKey, llkbRoot);
      migratedData = result.data;
      allWarnings.push(...result.warnings);
    }
    const backupPath = `${filePath}.backup.${Date.now()}`;
    fs.copyFileSync(filePath, backupPath);
    const saveResult = await saveJSONAtomic(filePath, migratedData);
    if (!saveResult.success) {
      fs.copyFileSync(backupPath, filePath);
      return { success: false, warnings: allWarnings, error: saveResult.error };
    }
    fs.unlinkSync(backupPath);
    return { success: true, warnings: allWarnings };
  } catch (error) {
    return {
      success: false,
      warnings: [],
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
async function migrateLLKB(llkbRoot) {
  const result = {
    success: true,
    migratedFiles: [],
    errors: [],
    warnings: [],
    fromVersion: "0.0.0",
    toVersion: CURRENT_VERSION
  };
  const files = [
    path13.join(llkbRoot, "lessons.json"),
    path13.join(llkbRoot, "components.json"),
    path13.join(llkbRoot, "analytics.json")
  ];
  const lessonsPath = path13.join(llkbRoot, "lessons.json");
  if (fs.existsSync(lessonsPath)) {
    const lessonsData = loadJSON(lessonsPath);
    result.fromVersion = lessonsData?.version || "0.0.0";
  }
  for (const file of files) {
    if (!fs.existsSync(file)) {
      result.warnings.push(`File not found: ${file}`);
      continue;
    }
    const migrationResult = await migrateFile(file, llkbRoot);
    if (migrationResult.success) {
      result.migratedFiles.push(file);
    } else {
      result.success = false;
      if (migrationResult.error) {
        result.errors.push(`${file}: ${migrationResult.error}`);
      }
    }
    result.warnings.push(...migrationResult.warnings.map((w) => `${path13.basename(file)}: ${w}`));
  }
  return result;
}
function checkMigrationNeeded(llkbRoot) {
  const lessonsPath = path13.join(llkbRoot, "lessons.json");
  if (!fs.existsSync(lessonsPath)) {
    return {
      needsMigration: false,
      currentVersion: CURRENT_VERSION,
      targetVersion: CURRENT_VERSION,
      supported: true
    };
  }
  const lessonsData = loadJSON(lessonsPath);
  const currentVersion = lessonsData?.version || "0.0.0";
  return {
    needsMigration: needsMigration(currentVersion),
    currentVersion,
    targetVersion: CURRENT_VERSION,
    supported: isVersionSupported(currentVersion)
  };
}
async function initializeLLKB(llkbRoot) {
  try {
    ensureDir(llkbRoot);
    ensureDir(path13.join(llkbRoot, "patterns"));
    ensureDir(path13.join(llkbRoot, "history"));
    const configPath = path13.join(llkbRoot, "config.yml");
    if (!fs.existsSync(configPath)) {
      const defaultConfig = `# LLKB Configuration
version: "1.0.0"
enabled: true

extraction:
  minOccurrences: 2
  predictiveExtraction: true
  confidenceThreshold: 0.7
  maxPredictivePerJourney: 3
  maxPredictivePerDay: 10
  minLinesForExtraction: 3
  similarityThreshold: 0.8

retention:
  maxLessonAge: 90
  minSuccessRate: 0.6
  archiveUnused: 30

history:
  retentionDays: 365

injection:
  prioritizeByConfidence: true

scopes:
  universal: true
  frameworkSpecific: true
  appSpecific: true

overrides:
  allowUserOverride: true
  logOverrides: true
  flagAfterOverrides: 3
`;
      fs.writeFileSync(configPath, defaultConfig, "utf-8");
    }
    const lessonsPath = path13.join(llkbRoot, "lessons.json");
    if (!fs.existsSync(lessonsPath)) {
      const defaultLessons = {
        version: CURRENT_VERSION,
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString(),
        lessons: [],
        archived: [],
        globalRules: [],
        appQuirks: []
      };
      await saveJSONAtomic(lessonsPath, defaultLessons);
    }
    const componentsPath = path13.join(llkbRoot, "components.json");
    if (!fs.existsSync(componentsPath)) {
      const defaultComponents = {
        version: CURRENT_VERSION,
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString(),
        components: [],
        componentsByCategory: {
          selector: [],
          timing: [],
          auth: [],
          data: [],
          assertion: [],
          navigation: [],
          "ui-interaction": []
        },
        componentsByScope: {
          universal: [],
          "framework:angular": [],
          "framework:react": [],
          "framework:vue": [],
          "framework:ag-grid": [],
          "app-specific": []
        }
      };
      await saveJSONAtomic(componentsPath, defaultComponents);
    }
    const analyticsPath = path13.join(llkbRoot, "analytics.json");
    if (!fs.existsSync(analyticsPath)) {
      const defaultAnalytics = createEmptyAnalytics();
      await saveJSONAtomic(analyticsPath, defaultAnalytics);
    }
    const patternFiles = ["selectors.json", "timing.json", "assertions.json", "auth.json", "data.json"];
    for (const patternFile of patternFiles) {
      const patternPath = path13.join(llkbRoot, "patterns", patternFile);
      if (!fs.existsSync(patternPath)) {
        await saveJSONAtomic(patternPath, {
          version: CURRENT_VERSION,
          patterns: []
        });
      }
    }
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
function validateLLKBInstallation(llkbRoot) {
  const result = {
    valid: true,
    missingFiles: [],
    invalidFiles: [],
    version: CURRENT_VERSION
  };
  const requiredFiles = [
    "config.yml",
    "lessons.json",
    "components.json",
    "analytics.json"
  ];
  for (const file of requiredFiles) {
    const filePath = path13.join(llkbRoot, file);
    if (!fs.existsSync(filePath)) {
      result.missingFiles.push(file);
      result.valid = false;
    } else if (file.endsWith(".json")) {
      try {
        const data = loadJSON(filePath);
        if (!data || !data.version) {
          result.invalidFiles.push(file);
          result.valid = false;
        } else if (file === "lessons.json") {
          result.version = data.version;
        }
      } catch {
        result.invalidFiles.push(file);
        result.valid = false;
      }
    }
  }
  const patternsDir = path13.join(llkbRoot, "patterns");
  if (!fs.existsSync(patternsDir)) {
    result.missingFiles.push("patterns/");
    result.valid = false;
  }
  return result;
}
function calculateTextRelevance(text, query) {
  if (!query) return 1;
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const queryWords = lowerQuery.split(/\s+/).filter((w) => w.length > 1);
  if (queryWords.length === 0) return 1;
  if (lowerText.includes(lowerQuery)) {
    return 1;
  }
  let matchedWords = 0;
  for (const word of queryWords) {
    if (lowerText.includes(word)) {
      matchedWords++;
    }
  }
  return matchedWords / queryWords.length;
}
function searchLessons(lessons, query) {
  return lessons.filter((lesson) => {
    if (!query.includeArchived && lesson.archived) {
      return false;
    }
    if (query.category && lesson.category !== query.category) {
      return false;
    }
    if (query.scope && lesson.scope !== query.scope) {
      return false;
    }
    if (query.tags && query.tags.length > 0) {
      const lessonTags = lesson.tags || [];
      if (!query.tags.some((t) => lessonTags.includes(t))) {
        return false;
      }
    }
    if (query.minConfidence !== void 0) {
      if (lesson.metrics.confidence < query.minConfidence) {
        return false;
      }
    }
    if (query.journeyId && !lesson.journeyIds.includes(query.journeyId)) {
      return false;
    }
    return true;
  }).map((lesson) => {
    const searchText = `${lesson.title} ${lesson.pattern} ${lesson.trigger}`;
    const relevance = calculateTextRelevance(searchText, query.text || "");
    return {
      type: "lesson",
      id: lesson.id,
      title: lesson.title,
      description: lesson.pattern,
      category: lesson.category,
      scope: lesson.scope,
      relevance,
      item: lesson
    };
  }).filter((result) => result.relevance > 0.1);
}
function searchComponents(components, query) {
  return components.filter((component) => {
    if (!query.includeArchived && component.archived) {
      return false;
    }
    if (query.category && component.category !== query.category) {
      return false;
    }
    if (query.scope && component.scope !== query.scope) {
      return false;
    }
    return true;
  }).map((component) => {
    const searchText = `${component.name} ${component.description}`;
    const relevance = calculateTextRelevance(searchText, query.text || "");
    return {
      type: "component",
      id: component.id,
      title: component.name,
      description: component.description,
      category: component.category,
      scope: component.scope,
      relevance,
      item: component
    };
  }).filter((result) => result.relevance > 0.1);
}
function search(llkbRoot, query) {
  const lessons = loadLessons(llkbRoot, { includeArchived: query.includeArchived });
  const components = loadComponents(llkbRoot, { includeArchived: query.includeArchived });
  const lessonResults = searchLessons(lessons, query);
  const componentResults = searchComponents(components, query);
  const allResults = [...lessonResults, ...componentResults];
  allResults.sort((a, b) => b.relevance - a.relevance);
  if (query.limit && query.limit > 0) {
    return allResults.slice(0, query.limit);
  }
  return allResults;
}
function findLessonsByPattern(llkbRoot, pattern) {
  const lessons = loadLessons(llkbRoot);
  return lessons.filter((lesson) => {
    const lowerPattern = pattern.toLowerCase();
    const lowerLessonPattern = lesson.pattern.toLowerCase();
    const lowerTrigger = lesson.trigger.toLowerCase();
    return lowerLessonPattern.includes(lowerPattern) || lowerTrigger.includes(lowerPattern);
  });
}
function findComponents(llkbRoot, searchTerm) {
  const components = loadComponents(llkbRoot);
  const lowerSearch = searchTerm.toLowerCase();
  return components.filter((component) => {
    return component.name.toLowerCase().includes(lowerSearch) || component.description.toLowerCase().includes(lowerSearch);
  });
}
function getLessonsForJourney(llkbRoot, journeyId) {
  const lessons = loadLessons(llkbRoot);
  return lessons.filter((lesson) => lesson.journeyIds.includes(journeyId));
}
function getComponentsForJourney(llkbRoot, journeyId) {
  const components = loadComponents(llkbRoot);
  return components.filter(
    (component) => component.source.extractedFrom === journeyId
  );
}
function exportLessonsToMarkdown(lessons, includeMetrics) {
  let md = "# Lessons\n\n";
  const byCategory = /* @__PURE__ */ new Map();
  for (const lesson of lessons) {
    const category = lesson.category;
    if (!byCategory.has(category)) {
      byCategory.set(category, []);
    }
    byCategory.get(category).push(lesson);
  }
  for (const [category, categoryLessons] of byCategory) {
    md += `## ${category.charAt(0).toUpperCase() + category.slice(1)}

`;
    for (const lesson of categoryLessons) {
      md += `### ${lesson.id}: ${lesson.title}

`;
      md += `**Trigger:** ${lesson.trigger}

`;
      md += `**Pattern:** ${lesson.pattern}

`;
      md += `**Scope:** ${lesson.scope}

`;
      if (includeMetrics) {
        md += `**Metrics:**
`;
        md += `- Occurrences: ${lesson.metrics.occurrences}
`;
        md += `- Success Rate: ${(lesson.metrics.successRate * 100).toFixed(1)}%
`;
        md += `- Confidence: ${(lesson.metrics.confidence * 100).toFixed(1)}%
`;
        md += "\n";
      }
      md += "---\n\n";
    }
  }
  return md;
}
function exportComponentsToMarkdown(components, includeMetrics, includeSource) {
  let md = "# Components\n\n";
  const byCategory = /* @__PURE__ */ new Map();
  for (const component of components) {
    const category = component.category;
    if (!byCategory.has(category)) {
      byCategory.set(category, []);
    }
    byCategory.get(category).push(component);
  }
  for (const [category, categoryComponents] of byCategory) {
    md += `## ${category.charAt(0).toUpperCase() + category.slice(1)}

`;
    for (const component of categoryComponents) {
      md += `### ${component.id}: ${component.name}

`;
      md += `${component.description}

`;
      md += `**File:** \`${component.filePath}\`

`;
      md += `**Scope:** ${component.scope}

`;
      if (includeMetrics) {
        md += `**Metrics:**
`;
        md += `- Total Uses: ${component.metrics.totalUses}
`;
        md += `- Success Rate: ${(component.metrics.successRate * 100).toFixed(1)}%
`;
        md += "\n";
      }
      if (includeSource && component.source.originalCode) {
        md += "**Original Code:**\n\n";
        md += "```typescript\n";
        md += component.source.originalCode;
        md += "\n```\n\n";
      }
      md += "---\n\n";
    }
  }
  return md;
}
function exportLessonsToCSV(lessons) {
  const headers = [
    "ID",
    "Title",
    "Category",
    "Scope",
    "Trigger",
    "Pattern",
    "Occurrences",
    "Success Rate",
    "Confidence"
  ];
  const rows = lessons.map((lesson) => [
    lesson.id,
    `"${lesson.title.replace(/"/g, '""')}"`,
    lesson.category,
    lesson.scope,
    `"${lesson.trigger.replace(/"/g, '""')}"`,
    `"${lesson.pattern.replace(/"/g, '""')}"`,
    lesson.metrics.occurrences.toString(),
    lesson.metrics.successRate.toFixed(3),
    lesson.metrics.confidence.toFixed(3)
  ]);
  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}
function exportComponentsToCSV(components) {
  const headers = [
    "ID",
    "Name",
    "Category",
    "Scope",
    "File Path",
    "Description",
    "Total Uses",
    "Success Rate",
    "Extracted From"
  ];
  const rows = components.map((component) => [
    component.id,
    component.name,
    component.category,
    component.scope,
    `"${component.filePath}"`,
    `"${component.description.replace(/"/g, '""')}"`,
    component.metrics.totalUses.toString(),
    component.metrics.successRate.toFixed(3),
    component.source.extractedFrom
  ]);
  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}
function exportLLKB(llkbRoot, options) {
  const lessons = loadLessons(llkbRoot, {
    includeArchived: options.includeArchived,
    category: options.categories,
    scope: options.scopes
  });
  const components = loadComponents(llkbRoot, {
    includeArchived: options.includeArchived,
    category: options.categories,
    scope: options.scopes
  });
  switch (options.format) {
    case "markdown":
      return [
        exportLessonsToMarkdown(lessons, options.includeMetrics || false),
        exportComponentsToMarkdown(
          components,
          options.includeMetrics || false,
          options.includeSource || false
        )
      ].join("\n\n");
    case "csv":
      return [
        "# Lessons",
        exportLessonsToCSV(lessons),
        "",
        "# Components",
        exportComponentsToCSV(components)
      ].join("\n");
    case "json":
    default:
      return JSON.stringify(
        {
          exported: (/* @__PURE__ */ new Date()).toISOString(),
          lessons,
          components
        },
        null,
        2
      );
  }
}
function generateReport(llkbRoot) {
  loadLLKBConfig(llkbRoot);
  const lessons = loadLessons(llkbRoot);
  const components = loadComponents(llkbRoot);
  const appProfile = loadAppProfile(llkbRoot);
  const archivedLessons = loadLessons(llkbRoot, { includeArchived: true }).filter(
    (l) => l.archived
  ).length;
  const archivedComponents = loadComponents(llkbRoot, { includeArchived: true }).filter(
    (c) => c.archived
  ).length;
  const avgConfidence = lessons.length > 0 ? lessons.reduce((sum, l) => sum + l.metrics.confidence, 0) / lessons.length : 0;
  const avgSuccessRate = lessons.length > 0 ? lessons.reduce((sum, l) => sum + l.metrics.successRate, 0) / lessons.length : 0;
  const totalComponentUses = components.reduce(
    (sum, c) => sum + c.metrics.totalUses,
    0
  );
  const lessonsByCategory = /* @__PURE__ */ new Map();
  for (const lesson of lessons) {
    const count = lessonsByCategory.get(lesson.category) || 0;
    lessonsByCategory.set(lesson.category, count + 1);
  }
  const componentsByCategory = /* @__PURE__ */ new Map();
  for (const component of components) {
    const count = componentsByCategory.get(component.category) || 0;
    componentsByCategory.set(component.category, count + 1);
  }
  let report = "# LLKB Status Report\n\n";
  report += `**Generated:** ${(/* @__PURE__ */ new Date()).toISOString()}

`;
  if (appProfile) {
    report += "## Application Profile\n\n";
    report += `- **Framework:** ${appProfile.application.framework}
`;
    report += `- **UI Library:** ${appProfile.application.uiLibrary}
`;
    report += `- **Data Grid:** ${appProfile.application.dataGrid}
`;
    report += "\n";
  }
  report += "## Overview\n\n";
  report += `| Metric | Value |
`;
  report += `|--------|-------|
`;
  report += `| Active Lessons | ${lessons.length} |
`;
  report += `| Archived Lessons | ${archivedLessons} |
`;
  report += `| Active Components | ${components.length} |
`;
  report += `| Archived Components | ${archivedComponents} |
`;
  report += `| Avg. Lesson Confidence | ${(avgConfidence * 100).toFixed(1)}% |
`;
  report += `| Avg. Lesson Success Rate | ${(avgSuccessRate * 100).toFixed(1)}% |
`;
  report += `| Total Component Uses | ${totalComponentUses} |
`;
  report += "\n";
  report += "## Lessons by Category\n\n";
  report += `| Category | Count |
`;
  report += `|----------|-------|
`;
  for (const [category, count] of lessonsByCategory) {
    report += `| ${category} | ${count} |
`;
  }
  report += "\n";
  report += "## Components by Category\n\n";
  report += `| Category | Count |
`;
  report += `|----------|-------|
`;
  for (const [category, count] of componentsByCategory) {
    report += `| ${category} | ${count} |
`;
  }
  report += "\n";
  const topLessons = [...lessons].sort((a, b) => b.metrics.confidence - a.metrics.confidence).slice(0, 5);
  if (topLessons.length > 0) {
    report += "## Top Lessons (by Confidence)\n\n";
    for (const lesson of topLessons) {
      report += `- **${lesson.id}** - ${lesson.title} (${(lesson.metrics.confidence * 100).toFixed(0)}%)
`;
    }
    report += "\n";
  }
  const topComponents = [...components].sort((a, b) => b.metrics.totalUses - a.metrics.totalUses).slice(0, 5);
  if (topComponents.length > 0) {
    report += "## Most Used Components\n\n";
    for (const component of topComponents) {
      report += `- **${component.id}** - ${component.name} (${component.metrics.totalUses} uses)
`;
    }
    report += "\n";
  }
  const lowConfidence = lessons.filter((l) => l.metrics.confidence < 0.4);
  if (lowConfidence.length > 0) {
    report += "## Needs Review (Low Confidence)\n\n";
    for (const lesson of lowConfidence.slice(0, 5)) {
      report += `- **${lesson.id}** - ${lesson.title} (${(lesson.metrics.confidence * 100).toFixed(0)}%)
`;
    }
    report += "\n";
  }
  return report;
}
async function exportToFile(llkbRoot, outputPath, options) {
  const content = exportLLKB(llkbRoot, options);
  fs.writeFileSync(outputPath, content, "utf-8");
}

// llkb/result-types.ts
function ok(data, warnings = []) {
  return {
    success: true,
    data,
    warnings
  };
}
function fail(error, warnings = []) {
  return {
    success: false,
    error,
    warnings
  };
}
function tryCatch(fn, errorMessage) {
  try {
    const data = fn();
    return ok(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const fullMessage = errorMessage ? `${errorMessage}: ${message}` : message;
    return fail(fullMessage);
  }
}
function mapResult(result, mapper) {
  if (!result.success) {
    return {
      success: false,
      error: result.error,
      warnings: result.warnings
    };
  }
  try {
    const mappedData = mapper(result.data);
    return ok(mappedData, result.warnings);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return fail(`Mapping failed: ${message}`, result.warnings);
  }
}
function combineResults(results) {
  const allWarnings = [];
  const allData = [];
  for (const result of results) {
    allWarnings.push(...result.warnings);
    if (!result.success) {
      return fail(result.error ?? "Unknown error", allWarnings);
    }
    if (result.data !== void 0) {
      allData.push(result.data);
    }
  }
  return ok(allData, allWarnings);
}
function isOk(result) {
  return result.success && result.data !== void 0;
}
function isFail(result) {
  return !result.success && result.error !== void 0;
}
var PACKAGE_CONFIDENCE_BOOST = 0.3;
var FILE_CONFIDENCE_BOOST = 0.2;
var UI_PACKAGE_CONFIDENCE_BOOST = 0.25;
var UI_ENTERPRISE_BOOST = 0.15;
var MAX_SAMPLE_SELECTORS = 50;
var FRAMEWORK_PATTERNS = {
  react: {
    packages: ["react", "react-dom"],
    files: ["src/App.tsx", "src/App.jsx", "src/index.tsx", "src/index.jsx"],
    baseConfidence: 0.95
  },
  angular: {
    packages: ["@angular/core", "@angular/common"],
    files: ["angular.json", "src/app/app.module.ts", "src/app/app.component.ts"],
    baseConfidence: 0.95
  },
  vue: {
    packages: ["vue"],
    files: ["src/App.vue", "src/main.ts", "vue.config.js", "vite.config.ts"],
    baseConfidence: 0.9
  },
  nextjs: {
    packages: ["next"],
    files: ["next.config.js", "next.config.mjs", "next.config.ts", "src/app/page.tsx", "pages/_app.tsx"],
    baseConfidence: 0.95
  },
  svelte: {
    packages: ["svelte"],
    files: ["svelte.config.js", "src/App.svelte"],
    baseConfidence: 0.9
  }
};
var UI_LIBRARY_PATTERNS2 = {
  mui: {
    packages: ["@mui/material", "@mui/core", "@emotion/react", "@emotion/styled"],
    enterprisePackages: ["@mui/x-data-grid-pro", "@mui/x-data-grid-premium"],
    baseConfidence: 0.85
  },
  antd: {
    packages: ["antd", "@ant-design/icons"],
    enterprisePackages: ["@ant-design/pro-components", "@ant-design/pro-layout"],
    baseConfidence: 0.85
  },
  chakra: {
    packages: ["@chakra-ui/react", "@chakra-ui/core"],
    baseConfidence: 0.85
  },
  "ag-grid": {
    packages: ["ag-grid-community", "ag-grid-react", "ag-grid-angular", "ag-grid-vue"],
    enterprisePackages: ["ag-grid-enterprise", "@ag-grid-enterprise/core"],
    baseConfidence: 0.9
  },
  tailwind: {
    packages: ["tailwindcss"],
    baseConfidence: 0.8
  },
  bootstrap: {
    packages: ["bootstrap", "react-bootstrap", "ng-bootstrap", "bootstrap-vue"],
    baseConfidence: 0.8
  }
};
var SELECTOR_PATTERN_SOURCES = {
  "data-testid": `data-testid=['"]([^'"]+)['"]`,
  "data-cy": `data-cy=['"]([^'"]+)['"]`,
  "data-test": `data-test=['"]([^'"]+)['"]`,
  "data-test-id": `data-test-id=['"]([^'"]+)['"]`,
  "aria-label": `aria-label=['"]([^'"]+)['"]`,
  "role": `role=['"]([^'"]+)['"]`
};
function createSelectorPatterns() {
  const patterns = {};
  for (const [key, source] of Object.entries(SELECTOR_PATTERN_SOURCES)) {
    patterns[key] = new RegExp(source, "g");
  }
  return patterns;
}
var SELECTOR_PATTERNS = createSelectorPatterns();
function detectFrameworks(projectRoot) {
  const signals = [];
  const packageJsonPath = path13.join(projectRoot, "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    return signals;
  }
  let packageJson;
  try {
    const content = fs.readFileSync(packageJsonPath, "utf-8");
    const parsed = JSON.parse(content);
    if (typeof parsed !== "object" || parsed === null) {
      return signals;
    }
    packageJson = parsed;
  } catch {
    return signals;
  }
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  };
  for (const [framework, patterns] of Object.entries(FRAMEWORK_PATTERNS)) {
    const evidence = [];
    let confidence = 0;
    for (const pkg of patterns.packages) {
      if (allDeps[pkg]) {
        evidence.push(`package.json:${pkg}@${allDeps[pkg]}`);
        confidence += PACKAGE_CONFIDENCE_BOOST;
      }
    }
    for (const file of patterns.files) {
      const filePath = path13.join(projectRoot, file);
      if (fs.existsSync(filePath)) {
        evidence.push(`file:${file}`);
        confidence += FILE_CONFIDENCE_BOOST;
      }
    }
    if (evidence.length > 0) {
      confidence = Math.min(confidence, patterns.baseConfidence);
      const primaryPkg = patterns.packages[0] ?? "";
      const version = primaryPkg ? allDeps[primaryPkg]?.replace(/[\^~>=<]/, "") : void 0;
      signals.push({
        name: framework,
        version,
        confidence,
        evidence
      });
    }
  }
  return signals.sort((a, b) => b.confidence - a.confidence);
}
function detectUiLibraries(projectRoot) {
  const signals = [];
  const packageJsonPath = path13.join(projectRoot, "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    return signals;
  }
  let packageJson;
  try {
    const content = fs.readFileSync(packageJsonPath, "utf-8");
    const parsed = JSON.parse(content);
    if (typeof parsed !== "object" || parsed === null) {
      return signals;
    }
    packageJson = parsed;
  } catch {
    return signals;
  }
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  };
  for (const [library, patterns] of Object.entries(UI_LIBRARY_PATTERNS2)) {
    const evidence = [];
    let confidence = 0;
    let hasEnterprise = false;
    for (const pkg of patterns.packages) {
      if (allDeps[pkg]) {
        evidence.push(`package.json:${pkg}`);
        confidence += UI_PACKAGE_CONFIDENCE_BOOST;
      }
    }
    if (patterns.enterprisePackages) {
      for (const pkg of patterns.enterprisePackages) {
        if (allDeps[pkg]) {
          evidence.push(`package.json:${pkg} (enterprise)`);
          hasEnterprise = true;
          confidence += UI_ENTERPRISE_BOOST;
        }
      }
    }
    if (evidence.length > 0) {
      confidence = Math.min(confidence, patterns.baseConfidence);
      signals.push({
        name: library,
        confidence,
        evidence,
        hasEnterprise: hasEnterprise || void 0
      });
    }
  }
  return signals.sort((a, b) => b.confidence - a.confidence);
}
async function analyzeSelectorSignals(projectRoot) {
  const coverage = {};
  const selectorCounts = {};
  const sampleSelectors = [];
  let totalFiles = 0;
  for (const attr of Object.keys(SELECTOR_PATTERNS)) {
    selectorCounts[attr] = 0;
  }
  const srcDir = path13.join(projectRoot, "src");
  if (fs.existsSync(srcDir)) {
    await scanDirectoryForSelectors(srcDir, selectorCounts, sampleSelectors);
    totalFiles = await countSourceFiles(srcDir);
  }
  const totalSelectors = Object.values(selectorCounts).reduce((sum, count) => sum + count, 0);
  for (const [attr, count] of Object.entries(selectorCounts)) {
    coverage[attr] = totalSelectors > 0 ? count / totalSelectors : 0;
  }
  const primaryAttribute = Object.entries(selectorCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || "data-testid";
  const namingConvention = detectNamingConvention(sampleSelectors);
  return {
    primaryAttribute,
    namingConvention,
    coverage,
    totalComponentsAnalyzed: totalFiles,
    sampleSelectors: sampleSelectors.slice(0, 10)
    // Keep top 10 samples
  };
}
async function extractAuthHints(projectRoot) {
  const hints = {
    detected: false
  };
  const artkDiscoveryPath = path13.join(projectRoot, ".artk", "discovery.json");
  if (fs.existsSync(artkDiscoveryPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(artkDiscoveryPath, "utf-8"));
      if (typeof parsed !== "object" || parsed === null) {
        throw new Error("Invalid discovery.json shape");
      }
      const discovery = parsed;
      if (discovery.auth) {
        hints.detected = true;
        hints.type = discovery.auth.type;
        hints.loginRoute = discovery.auth.loginRoute;
        hints.selectors = discovery.auth.selectors;
        hints.bypassAvailable = discovery.auth.bypassAvailable;
        hints.bypassMethod = discovery.auth.bypassMethod;
        return hints;
      }
    } catch {
    }
  }
  const srcDir = path13.join(projectRoot, "src");
  if (!fs.existsSync(srcDir)) {
    return hints;
  }
  const authPatterns = await scanForAuthPatterns(srcDir);
  if (authPatterns.hasAuth) {
    hints.detected = true;
    hints.type = authPatterns.type;
    hints.loginRoute = authPatterns.loginRoute;
    hints.selectors = authPatterns.selectors;
  }
  return hints;
}
async function runDiscovery(projectRoot) {
  const errors = [];
  const warnings = [];
  if (!fs.existsSync(projectRoot)) {
    return {
      success: false,
      profile: null,
      errors: [`Project root does not exist: ${projectRoot}`],
      warnings: []
    };
  }
  let frameworks = [];
  let uiLibraries = [];
  let selectorSignals;
  let auth;
  try {
    frameworks = detectFrameworks(projectRoot);
    if (frameworks.length === 0) {
      warnings.push("No frameworks detected");
    }
  } catch (e) {
    errors.push(`Framework detection failed: ${String(e)}`);
  }
  try {
    uiLibraries = detectUiLibraries(projectRoot);
  } catch (e) {
    warnings.push(`UI library detection failed: ${String(e)}`);
  }
  try {
    selectorSignals = await analyzeSelectorSignals(projectRoot);
  } catch (e) {
    warnings.push(`Selector analysis failed: ${String(e)}`);
    selectorSignals = {
      primaryAttribute: "data-testid",
      namingConvention: "kebab-case",
      coverage: {},
      totalComponentsAnalyzed: 0,
      sampleSelectors: []
    };
  }
  try {
    auth = await extractAuthHints(projectRoot);
  } catch (e) {
    warnings.push(`Auth hint extraction failed: ${String(e)}`);
    auth = { detected: false };
  }
  const profile = {
    version: "1.0",
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    projectRoot,
    frameworks,
    uiLibraries,
    selectorSignals,
    auth,
    runtime: {
      validated: false,
      scanUrl: null,
      domSampleCount: 0
    }
  };
  return {
    success: errors.length === 0,
    profile,
    errors,
    warnings
  };
}
function saveDiscoveredProfile(profile, outputDir) {
  const outputPath = path13.join(outputDir, "discovered-profile.json");
  fs.mkdirSync(outputDir, { recursive: true });
  const redactedAuth = profile.auth.selectors ? { ...profile.auth, selectors: Object.fromEntries(
    Object.keys(profile.auth.selectors).map((k) => [k, "[REDACTED]"])
  ) } : profile.auth;
  const redacted = {
    ...profile,
    projectRoot: path13.basename(profile.projectRoot),
    auth: redactedAuth
  };
  saveJSONAtomicSync(outputPath, redacted);
}
function loadDiscoveredProfile(llkbDir) {
  const filePath = path13.join(llkbDir, "discovered-profile.json");
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(content);
    if (typeof parsed !== "object" || parsed === null) {
      return null;
    }
    const obj = parsed;
    if (!obj.version || !Array.isArray(obj.frameworks)) {
      return null;
    }
    return obj;
  } catch {
    return null;
  }
}
var saveAppProfile = saveDiscoveredProfile;
var MAX_SCAN_DEPTH = 20;
var MAX_FILES_TO_SCAN = 5e3;
async function scanDirectoryForSelectors(dir, selectorCounts, sampleSelectors, depth = 0, fileCount = { count: 0 }) {
  if (depth > MAX_SCAN_DEPTH || fileCount.count > MAX_FILES_TO_SCAN) {
    return;
  }
  const extensions = [".tsx", ".jsx", ".vue", ".html", ".ts", ".js"];
  let entries;
  try {
    entries = await fsp3.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (fileCount.count > MAX_FILES_TO_SCAN) {
      break;
    }
    const fullPath = path13.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && !entry.name.startsWith(".") && !entry.isSymbolicLink()) {
        await scanDirectoryForSelectors(fullPath, selectorCounts, sampleSelectors, depth + 1, fileCount);
      }
    } else if (entry.isFile() && extensions.some((ext) => entry.name.endsWith(ext))) {
      fileCount.count++;
      try {
        const content = await fsp3.readFile(fullPath, "utf-8");
        const freshPatterns = createSelectorPatterns();
        for (const [attr, pattern] of Object.entries(freshPatterns)) {
          let match;
          while ((match = pattern.exec(content)) !== null) {
            selectorCounts[attr]++;
            if (sampleSelectors.length < MAX_SAMPLE_SELECTORS && match[1]) {
              sampleSelectors.push(match[1]);
            }
          }
        }
      } catch {
      }
    }
  }
}
async function countSourceFiles(dir, depth = 0) {
  if (depth > MAX_SCAN_DEPTH) {
    return 0;
  }
  const extensions = [".tsx", ".jsx", ".vue", ".ts", ".js"];
  let count = 0;
  let entries;
  try {
    entries = await fsp3.readdir(dir, { withFileTypes: true });
  } catch {
    return 0;
  }
  for (const entry of entries) {
    const fullPath = path13.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== "node_modules" && !entry.name.startsWith(".") && !entry.isSymbolicLink()) {
      count += await countSourceFiles(fullPath, depth + 1);
    } else if (entry.isFile() && extensions.some((ext) => entry.name.endsWith(ext))) {
      count++;
    }
  }
  return count;
}
function detectNamingConvention(samples) {
  if (samples.length === 0) {
    return "kebab-case";
  }
  let kebabCount = 0;
  let camelCount = 0;
  let snakeCount = 0;
  for (const sample of samples) {
    if (sample.includes("-")) {
      kebabCount++;
    }
    if (/[a-z][A-Z]/.test(sample)) {
      camelCount++;
    }
    if (sample.includes("_")) {
      snakeCount++;
    }
  }
  const maxCount = Math.max(kebabCount, camelCount, snakeCount);
  if (maxCount === 0) {
    return "kebab-case";
  }
  if (kebabCount === maxCount && camelCount < maxCount && snakeCount < maxCount) {
    return "kebab-case";
  }
  if (camelCount === maxCount && kebabCount < maxCount && snakeCount < maxCount) {
    return "camelCase";
  }
  if (snakeCount === maxCount && kebabCount < maxCount && camelCount < maxCount) {
    return "snake_case";
  }
  return "mixed";
}
async function scanForAuthPatterns(srcDir, depth = 0) {
  if (depth > MAX_SCAN_DEPTH) {
    return { hasAuth: false };
  }
  const result = {
    hasAuth: false
  };
  const authFilePatterns = [
    /auth/i,
    /login/i,
    /signin/i,
    /oauth/i,
    /sso/i
  ];
  const authCodePatterns = {
    oidc: [/oidc/i, /openid/i, /id_token/i, /authorization_code/i],
    oauth: [/oauth/i, /access_token/i, /refresh_token/i],
    form: [/login.*form/i, /username.*password/i, /signin/i],
    sso: [/sso/i, /saml/i, /federation/i]
  };
  let entries;
  try {
    entries = await fsp3.readdir(srcDir, { withFileTypes: true });
  } catch {
    return result;
  }
  for (const entry of entries) {
    const fullPath = path13.join(srcDir, entry.name);
    if (entry.isFile() && authFilePatterns.some((p) => p.test(entry.name))) {
      result.hasAuth = true;
      try {
        const content = await fsp3.readFile(fullPath, "utf-8");
        for (const [type, patterns] of Object.entries(authCodePatterns)) {
          if (patterns.some((p) => p.test(content))) {
            result.type = type;
            break;
          }
        }
        const routeMatch = content.match(/['"](\/login|\/signin|\/auth)['"]/i);
        if (routeMatch) {
          result.loginRoute = routeMatch[1];
        }
      } catch {
      }
    } else if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
      const subResult = await scanForAuthPatterns(fullPath, depth + 1);
      if (subResult.hasAuth) {
        result.hasAuth = true;
        result.type = result.type || subResult.type;
        result.loginRoute = result.loginRoute || subResult.loginRoute;
      }
    }
  }
  return result;
}

// llkb/index.ts
init_template_generators();

// llkb/mining.ts
init_pluralization();
init_mining_cache();
var MAX_SCAN_DEPTH2 = 15;
var MAX_FILES_TO_SCAN2 = 3e3;
var MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
var MAX_REGEX_ITERATIONS = 1e4;
var SOURCE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".vue", ".svelte"];
function validatePathWithinRoot(projectRoot, targetPath) {
  const resolvedRoot = path13.resolve(projectRoot);
  const resolvedTarget = path13.resolve(targetPath);
  return resolvedTarget.startsWith(resolvedRoot + path13.sep) || resolvedTarget === resolvedRoot;
}
async function isFileSizeWithinLimit(filePath) {
  try {
    const stats = await fsp3.lstat(filePath);
    if (stats.isSymbolicLink()) {
      return false;
    }
    return stats.size <= MAX_FILE_SIZE_BYTES;
  } catch {
    return false;
  }
}
var ENTITY_PATTERNS = {
  // TypeScript/JavaScript types and interfaces (including exported)
  // BUG-002 FIX: Added optional export prefix to catch exported interfaces/types
  typeInterface: /(?:export\s+)?(?:interface|type)\s+(\w+)(?:\s+extends|\s*[={<])/g,
  // Class names (often entities in ORM) - also handle exported classes
  className: /(?:export\s+)?class\s+(\w+)(?:\s+extends|\s+implements|\s*\{)/g,
  // Prisma model
  prismaModel: /model\s+(\w+)\s*\{/g,
  // TypeORM Entity
  typeormEntity: /@Entity\s*\(\s*['"]?(\w+)?['"]?\s*\)/g,
  // API fetch patterns
  apiFetch: /(?:fetch|axios\.(?:get|post|put|delete|patch))\s*\(\s*[`'"]\/?(?:api\/)?(\w+)/gi,
  // REST resource patterns
  restResource: /\/api\/(\w+)(?:\/|['"`])/gi,
  // GraphQL types
  graphqlType: /type\s+(\w+)\s*(?:@|\{|implements)/g,
  // Mongoose/MongoDB schema
  mongooseSchema: /new\s+(?:mongoose\.)?Schema\s*<?\s*(\w+)?/g,
  mongooseModel: /mongoose\.model\s*[<(]\s*['"]?(\w+)/g,
  // Sequelize model
  sequelizeModel: /sequelize\.define\s*\(\s*['"](\w+)/g,
  // MikroORM entity
  mikroEntity: /@Entity\s*\(\s*\{\s*(?:tableName|collection)\s*:\s*['"](\w+)/g
};
var ENTITY_EXCLUSIONS = /* @__PURE__ */ new Set([
  // Common utility types
  "props",
  "state",
  "context",
  "config",
  "options",
  "params",
  "args",
  "request",
  "response",
  "result",
  "error",
  "data",
  "payload",
  // React types
  "component",
  "element",
  "node",
  "children",
  "ref",
  "handler",
  "event",
  "callback",
  "dispatch",
  "action",
  "reducer",
  "store",
  // Common suffixes that aren't entities
  "service",
  "controller",
  "repository",
  "factory",
  "builder",
  "helper",
  "util",
  "utils",
  "hook",
  "provider",
  "consumer",
  // Generic types
  "string",
  "number",
  "boolean",
  "object",
  "array",
  "function",
  "any",
  "unknown",
  "void",
  "null",
  "undefined",
  "never",
  "partial",
  "required",
  "readonly",
  "pick",
  "omit",
  "record",
  "promise",
  "async",
  "await",
  "import",
  "export",
  "default"
]);
async function mineEntities(projectRoot, options = {}) {
  const resolvedRoot = path13.resolve(projectRoot);
  const maxDepth = options.maxDepth ?? MAX_SCAN_DEPTH2;
  const maxFiles = options.maxFiles ?? MAX_FILES_TO_SCAN2;
  const entityMap = /* @__PURE__ */ new Map();
  const fileCount = { count: 0 };
  const srcDirs = ["src", "app", "lib", "pages", "components", "models", "entities", "types"];
  for (const dir of srcDirs) {
    const fullPath = path13.join(resolvedRoot, dir);
    if (!validatePathWithinRoot(resolvedRoot, fullPath)) {
      continue;
    }
    if (fs.existsSync(fullPath)) {
      await scanForEntities(fullPath, entityMap, fileCount, 0, maxDepth, maxFiles);
    }
  }
  const prismaPath = path13.join(projectRoot, "prisma", "schema.prisma");
  if (fs.existsSync(prismaPath)) {
    await extractPrismaEntities(prismaPath, entityMap);
  }
  return Array.from(entityMap.values()).map(({ name, sources, endpoints }) => {
    const singular = singularize(name);
    const plural = pluralize(singular);
    return {
      name,
      singular,
      plural,
      source: sources[0],
      endpoint: endpoints[0]
    };
  });
}
async function scanForEntities(dir, entityMap, fileCount, depth, maxDepth, maxFiles) {
  if (depth > maxDepth || fileCount.count > maxFiles) {
    return;
  }
  let entries;
  try {
    entries = await fsp3.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (fileCount.count > maxFiles) {
      break;
    }
    const fullPath = path13.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!entry.name.startsWith(".") && entry.name !== "node_modules" && entry.name !== "dist" && entry.name !== "build" && !entry.isSymbolicLink()) {
        await scanForEntities(fullPath, entityMap, fileCount, depth + 1, maxDepth, maxFiles);
      }
    } else if (entry.isFile() && !entry.isSymbolicLink() && SOURCE_EXTENSIONS.some((ext) => entry.name.endsWith(ext))) {
      fileCount.count++;
      try {
        if (!await isFileSizeWithinLimit(fullPath)) {
          continue;
        }
        const content = await fsp3.readFile(fullPath, "utf-8");
        extractEntitiesFromContent(content, fullPath, entityMap);
      } catch {
      }
    }
  }
}
function extractEntitiesFromContent(content, source, entityMap) {
  for (const [patternName, pattern] of Object.entries(ENTITY_PATTERNS)) {
    pattern.lastIndex = 0;
    let match;
    const isApiPattern = patternName.includes("api") || patternName.includes("rest") || patternName.includes("fetch");
    let iterations = 0;
    while ((match = pattern.exec(content)) !== null) {
      if (++iterations > MAX_REGEX_ITERATIONS) {
        break;
      }
      const rawName = match[1];
      if (!rawName) {
        continue;
      }
      const name = rawName.replace(/(?:Model|Entity|Schema|Type|Interface|DTO|Input|Output)$/i, "");
      let normalized = name.toLowerCase();
      if (isApiPattern) {
        normalized = singularize(normalized);
      }
      if (ENTITY_EXCLUSIONS.has(normalized) || normalized.length < 3) {
        continue;
      }
      if (/(?:Props|State|Context|Config|Options|Params|Args|Handler|Callback|Service|Controller|Repository)$/i.test(rawName)) {
        continue;
      }
      const existing = entityMap.get(normalized);
      if (existing) {
        if (!existing.sources.includes(source)) {
          existing.sources.push(source);
        }
      } else {
        entityMap.set(normalized, {
          name: normalized,
          sources: [source],
          endpoints: []
        });
      }
      if (isApiPattern) {
        const entry = entityMap.get(normalized);
        const pluralForm = pluralize(normalized);
        if (entry && !entry.endpoints.includes(`/api/${pluralForm}`)) {
          entry.endpoints.push(`/api/${pluralForm}`);
        }
      }
    }
  }
}
async function extractPrismaEntities(prismaPath, entityMap) {
  try {
    const content = await fsp3.readFile(prismaPath, "utf-8");
    const modelPattern = /model\s+(\w+)\s*\{/g;
    let match;
    let iterations = 0;
    while ((match = modelPattern.exec(content)) !== null) {
      if (++iterations > MAX_REGEX_ITERATIONS) {
        break;
      }
      const name = match[1].toLowerCase();
      if (!ENTITY_EXCLUSIONS.has(name) && name.length >= 3) {
        const existing = entityMap.get(name);
        if (existing) {
          if (!existing.sources.includes(prismaPath)) {
            existing.sources.push(prismaPath);
          }
        } else {
          entityMap.set(name, {
            name,
            sources: [prismaPath],
            endpoints: [`/api/${name}`]
          });
        }
      }
    }
  } catch {
  }
}
var ROUTE_PATTERNS = {
  // React Router v6 - BUG-004 FIX: Handle JSX expressions and variable references
  reactRouterPath: /<Route\s+[^>]*path\s*=\s*[{'"]([\w/:.-]+)['"}\s]/gi,
  reactRouterElement: /path:\s*['"]([^'"]+)['"]/g,
  // Route config arrays: { path: '/users', element: <Users /> }
  routeConfigPath: /\{\s*path:\s*['"]([^'"]+)['"][^}]*(?:element|component)/g,
  // React Router useRoutes
  useRoutesPath: /\{\s*path:\s*['"]([^'"]+)['"]/g,
  // Route constants (ROUTES.USERS = '/users')
  routeConstants: /(?:ROUTES|PATHS|routes|paths)\s*[.:=]\s*\{[^}]*(\w+)\s*:\s*['"]([^'"]+)['"]/gi,
  // Next.js pages directory (from file names)
  nextPage: /pages\/(.+?)(?:\/index)?\.(?:tsx?|jsx?)/,
  // Next.js app directory
  nextAppRoute: /app\/(.+?)\/page\.(?:tsx?|jsx?)/,
  // Angular router
  angularPath: /path:\s*['"]([^'"]+)['"],?\s*(?:component|loadComponent|children)/g,
  // Vue Router
  vueRouterPath: /path:\s*['"]([^'"]+)['"],?\s*(?:name|component|components)/g,
  // Express/Fastify routes
  expressRoute: /(?:app|router)\.(?:get|post|put|delete|patch|all)\s*\(\s*['"]([^'"]+)['"]/gi,
  // NestJS routes
  nestRoute: /@(?:Get|Post|Put|Delete|Patch|All)\s*\(\s*['"]?([^'")\s]*)/gi
};
async function mineRoutes(projectRoot, options = {}) {
  const resolvedRoot = path13.resolve(projectRoot);
  const maxDepth = options.maxDepth ?? MAX_SCAN_DEPTH2;
  const maxFiles = options.maxFiles ?? MAX_FILES_TO_SCAN2;
  const routeMap = /* @__PURE__ */ new Map();
  const fileCount = { count: 0 };
  const srcDirs = ["src", "app", "pages", "routes", "views"];
  for (const dir of srcDirs) {
    const fullPath = path13.join(resolvedRoot, dir);
    if (!validatePathWithinRoot(resolvedRoot, fullPath)) {
      continue;
    }
    if (fs.existsSync(fullPath)) {
      await scanForRoutes(fullPath, routeMap, fileCount, 0, maxDepth, maxFiles);
    }
  }
  const pagesDir = path13.join(resolvedRoot, "pages");
  if (validatePathWithinRoot(resolvedRoot, pagesDir) && fs.existsSync(pagesDir)) {
    await extractNextJsPages(pagesDir, routeMap, "");
  }
  const appDir = path13.join(resolvedRoot, "app");
  if (validatePathWithinRoot(resolvedRoot, appDir) && fs.existsSync(appDir)) {
    await extractNextJsAppRoutes(appDir, routeMap, "");
  }
  return Array.from(routeMap.values());
}
async function scanForRoutes(dir, routeMap, fileCount, depth, maxDepth, maxFiles) {
  if (depth > maxDepth || fileCount.count > maxFiles) {
    return;
  }
  let entries;
  try {
    entries = await fsp3.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (fileCount.count > maxFiles) {
      break;
    }
    const fullPath = path13.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!entry.name.startsWith(".") && entry.name !== "node_modules" && entry.name !== "dist" && entry.name !== "build" && !entry.isSymbolicLink()) {
        await scanForRoutes(fullPath, routeMap, fileCount, depth + 1, maxDepth, maxFiles);
      }
    } else if (entry.isFile() && !entry.isSymbolicLink() && SOURCE_EXTENSIONS.some((ext) => entry.name.endsWith(ext))) {
      fileCount.count++;
      try {
        if (!await isFileSizeWithinLimit(fullPath)) {
          continue;
        }
        const content = await fsp3.readFile(fullPath, "utf-8");
        extractRoutesFromContent(content, fullPath, routeMap);
      } catch {
      }
    }
  }
}
function extractRoutesFromContent(content, source, routeMap) {
  for (const pattern of Object.values(ROUTE_PATTERNS)) {
    if (typeof pattern === "function") {
      continue;
    }
    pattern.lastIndex = 0;
    let match;
    let iterations = 0;
    while ((match = pattern.exec(content)) !== null) {
      if (++iterations > MAX_REGEX_ITERATIONS) {
        break;
      }
      const routePath = match[1];
      if (!routePath || routePath === "*" || routePath === "**") {
        continue;
      }
      const normalizedPath = routePath.startsWith("/") ? routePath : `/${routePath}`;
      if (normalizedPath.startsWith("/api/")) {
        continue;
      }
      const name = pathToName(normalizedPath);
      const params = extractRouteParams(normalizedPath);
      if (!routeMap.has(normalizedPath)) {
        routeMap.set(normalizedPath, {
          path: normalizedPath,
          name,
          params: params.length > 0 ? params : void 0,
          component: source
        });
      }
    }
  }
}
async function extractNextJsPages(dir, routeMap, basePath) {
  let entries;
  try {
    entries = await fsp3.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const fullPath = path13.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!entry.name.startsWith("_") && !entry.name.startsWith(".")) {
        const segment = entry.name.startsWith("[") && entry.name.endsWith("]") ? `:${entry.name.slice(1, -1)}` : entry.name;
        await extractNextJsPages(fullPath, routeMap, `${basePath}/${segment}`);
      }
    } else if (entry.isFile()) {
      const ext = path13.extname(entry.name);
      const base = path13.basename(entry.name, ext);
      if ([".tsx", ".ts", ".jsx", ".js"].includes(ext) && !base.startsWith("_")) {
        let routePath;
        if (base === "index") {
          routePath = basePath || "/";
        } else if (base.startsWith("[") && base.endsWith("]")) {
          routePath = `${basePath}/:${base.slice(1, -1)}`;
        } else {
          routePath = `${basePath}/${base}`;
        }
        const name = pathToName(routePath);
        const params = extractRouteParams(routePath);
        routeMap.set(routePath, {
          path: routePath,
          name,
          params: params.length > 0 ? params : void 0,
          component: fullPath
        });
      }
    }
  }
}
async function extractNextJsAppRoutes(dir, routeMap, basePath) {
  let entries;
  try {
    entries = await fsp3.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const fullPath = path13.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!entry.name.startsWith("_") && !entry.name.startsWith(".")) {
        let segment;
        if (entry.name.startsWith("(") && entry.name.endsWith(")")) {
          segment = "";
        } else if (entry.name.startsWith("[") && entry.name.endsWith("]")) {
          segment = `:${entry.name.slice(1, -1)}`;
        } else {
          segment = entry.name;
        }
        const newPath = segment ? `${basePath}/${segment}` : basePath;
        await extractNextJsAppRoutes(fullPath, routeMap, newPath);
      }
    } else if (entry.name === "page.tsx" || entry.name === "page.ts" || entry.name === "page.jsx" || entry.name === "page.js") {
      const routePath = basePath || "/";
      const name = pathToName(routePath);
      const params = extractRouteParams(routePath);
      routeMap.set(routePath, {
        path: routePath,
        name,
        params: params.length > 0 ? params : void 0,
        component: fullPath
      });
    }
  }
}
function pathToName(routePath) {
  if (routePath === "/") {
    return "Home";
  }
  const segments = routePath.split("/").filter((s) => s && !s.startsWith(":"));
  if (segments.length === 0) {
    return "Home";
  }
  const lastSegment = segments[segments.length - 1];
  return lastSegment.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}
function extractRouteParams(routePath) {
  const params = [];
  const paramPattern = /:(\w+)/g;
  let match;
  let iterations = 0;
  while ((match = paramPattern.exec(routePath)) !== null) {
    if (++iterations > MAX_REGEX_ITERATIONS) {
      break;
    }
    params.push(match[1]);
  }
  return params;
}
var FORM_PATTERNS = {
  // Zod schema - SEC-F01 FIX: Bounded match (max 2000 chars) to prevent ReDoS.
  // Uses [\s\S]{0,2000}? lazy quantifier with length cap (supports nested braces).
  zodSchema: /z\.object\s*\(\s*\{([\s\S]{0,2000}?)\}\s*\)/g,
  // BUG-003 FIX: Handle chained methods like z.string().email().min(1)
  // SEC-F01 FIX: Limit chained methods to max 5 to prevent backtracking
  zodField: /(\w+)\s*:\s*z\.(\w+)(?:\([^)]*\))?(?:\.\w+(?:\([^)]*\))?){0,5}/g,
  // Yup schema - same SEC-F01 fixes applied (bounded lazy match, supports nested braces)
  yupSchema: /(?:yup|Yup)\.object\s*\(\s*\{([\s\S]{0,2000}?)\}\s*\)/g,
  yupField: /(\w+)\s*:\s*(?:yup|Yup)\.(\w+)(?:\([^)]*\))?(?:\.\w+(?:\([^)]*\))?){0,5}/g,
  // React Hook Form
  rhfRegister: /register\s*\(\s*['"](\w+)['"]/g,
  // HTML form elements - BUG-005 FIX: Handle attributes in any order
  // Pattern 1: name before type
  htmlInputNameFirst: /<input[^>]+name\s*=\s*['"](\w+)['"][^>]*(?:type\s*=\s*['"](\w+)['"])?/gi,
  // Pattern 2: type before name
  htmlInputTypeFirst: /<input[^>]+type\s*=\s*['"](\w+)['"][^>]+name\s*=\s*['"](\w+)['"]/gi};
async function mineForms(projectRoot, options = {}) {
  const resolvedRoot = path13.resolve(projectRoot);
  const maxDepth = options.maxDepth ?? MAX_SCAN_DEPTH2;
  const maxFiles = options.maxFiles ?? MAX_FILES_TO_SCAN2;
  const formMap = /* @__PURE__ */ new Map();
  const fileCount = { count: 0 };
  const srcDirs = ["src", "app", "components", "forms", "schemas", "validation"];
  for (const dir of srcDirs) {
    const fullPath = path13.join(resolvedRoot, dir);
    if (!validatePathWithinRoot(resolvedRoot, fullPath)) {
      continue;
    }
    if (fs.existsSync(fullPath)) {
      await scanForForms(fullPath, formMap, fileCount, 0, maxDepth, maxFiles);
    }
  }
  return Array.from(formMap.values());
}
async function scanForForms(dir, formMap, fileCount, depth, maxDepth, maxFiles) {
  if (depth > maxDepth || fileCount.count > maxFiles) {
    return;
  }
  let entries;
  try {
    entries = await fsp3.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (fileCount.count > maxFiles) {
      break;
    }
    const fullPath = path13.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!entry.name.startsWith(".") && entry.name !== "node_modules" && entry.name !== "dist" && entry.name !== "build" && !entry.isSymbolicLink()) {
        await scanForForms(fullPath, formMap, fileCount, depth + 1, maxDepth, maxFiles);
      }
    } else if (entry.isFile() && !entry.isSymbolicLink() && SOURCE_EXTENSIONS.some((ext) => entry.name.endsWith(ext))) {
      fileCount.count++;
      try {
        if (!await isFileSizeWithinLimit(fullPath)) {
          continue;
        }
        const content = await fsp3.readFile(fullPath, "utf-8");
        extractFormsFromContent(content, fullPath, formMap);
      } catch {
      }
    }
  }
}
function extractFormsFromContent(content, source, formMap) {
  const fileName = path13.basename(source, path13.extname(source));
  const formNameFromFile = fileName.replace(/(?:Form|Schema|Validation)$/i, "");
  const fields = [];
  const zodMatch = FORM_PATTERNS.zodSchema.exec(content);
  if (zodMatch) {
    FORM_PATTERNS.zodField.lastIndex = 0;
    let fieldMatch;
    let fieldIter = 0;
    while ((fieldMatch = FORM_PATTERNS.zodField.exec(zodMatch[1])) !== null) {
      if (++fieldIter > MAX_REGEX_ITERATIONS) {
        break;
      }
      fields.push({
        name: fieldMatch[1],
        type: zodTypeToHtmlType(fieldMatch[2]),
        label: fieldNameToLabel(fieldMatch[1])
      });
    }
    FORM_PATTERNS.zodSchema.lastIndex = 0;
  }
  const yupMatch = FORM_PATTERNS.yupSchema.exec(content);
  if (yupMatch) {
    FORM_PATTERNS.yupField.lastIndex = 0;
    let fieldMatch;
    let yupIter = 0;
    while ((fieldMatch = FORM_PATTERNS.yupField.exec(yupMatch[1])) !== null) {
      if (++yupIter > MAX_REGEX_ITERATIONS) {
        break;
      }
      const existingField = fields.find((f) => f.name === fieldMatch[1]);
      if (!existingField) {
        fields.push({
          name: fieldMatch[1],
          type: yupTypeToHtmlType(fieldMatch[2]),
          label: fieldNameToLabel(fieldMatch[1])
        });
      }
    }
    FORM_PATTERNS.yupSchema.lastIndex = 0;
  }
  FORM_PATTERNS.rhfRegister.lastIndex = 0;
  let rhfMatch;
  let rhfIter = 0;
  while ((rhfMatch = FORM_PATTERNS.rhfRegister.exec(content)) !== null) {
    if (++rhfIter > MAX_REGEX_ITERATIONS) {
      break;
    }
    const existingField = fields.find((f) => f.name === rhfMatch[1]);
    if (!existingField) {
      fields.push({
        name: rhfMatch[1],
        type: "text",
        label: fieldNameToLabel(rhfMatch[1])
      });
    }
  }
  FORM_PATTERNS.htmlInputNameFirst.lastIndex = 0;
  let htmlMatch;
  let htmlIter = 0;
  while ((htmlMatch = FORM_PATTERNS.htmlInputNameFirst.exec(content)) !== null) {
    if (++htmlIter > MAX_REGEX_ITERATIONS) {
      break;
    }
    const existingField = fields.find((f) => f.name === htmlMatch[1]);
    if (!existingField) {
      fields.push({
        name: htmlMatch[1],
        type: htmlMatch[2] || "text",
        label: fieldNameToLabel(htmlMatch[1])
      });
    }
  }
  FORM_PATTERNS.htmlInputTypeFirst.lastIndex = 0;
  let htmlIter2 = 0;
  while ((htmlMatch = FORM_PATTERNS.htmlInputTypeFirst.exec(content)) !== null) {
    if (++htmlIter2 > MAX_REGEX_ITERATIONS) {
      break;
    }
    const existingField = fields.find((f) => f.name === htmlMatch[2]);
    if (!existingField) {
      fields.push({
        name: htmlMatch[2],
        type: htmlMatch[1] || "text",
        label: fieldNameToLabel(htmlMatch[2])
      });
    }
  }
  if (fields.length > 0) {
    const formId = formNameFromFile.toLowerCase();
    const formName = fieldNameToLabel(formNameFromFile);
    if (!formMap.has(formId)) {
      formMap.set(formId, {
        id: formId,
        name: formName,
        fields,
        schema: source
      });
    }
  }
}
function zodTypeToHtmlType(zodType) {
  const typeMap = {
    string: "text",
    email: "email",
    number: "number",
    boolean: "checkbox",
    date: "date",
    enum: "select",
    password: "password"
  };
  return typeMap[zodType.toLowerCase()] || "text";
}
function yupTypeToHtmlType(yupType) {
  const typeMap = {
    string: "text",
    email: "email",
    number: "number",
    boolean: "checkbox",
    date: "date",
    mixed: "text"
  };
  return typeMap[yupType.toLowerCase()] || "text";
}
function fieldNameToLabel(fieldName) {
  return fieldName.replace(/([A-Z])/g, " $1").replace(/[_-]/g, " ").trim().split(" ").map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ");
}
var TABLE_PATTERNS = {
  // AG Grid
  agGridColumns: /columnDefs\s*[:=]\s*\[([^\]]+)\]/gs,
  agGridField: /field:\s*['"](\w+)['"]/g,
  // TanStack Table / React Table
  tanstackColumn: /accessorKey:\s*['"](\w+)['"]/g,
  // MUI DataGrid
  muiColumns: /columns\s*[:=]\s*\[([^\]]+)\]/gs,
  muiField: /field:\s*['"](\w+)['"]/g,
  // HTML table
  htmlTh: /<th[^>]*>([^<]+)<\/th>/gi,
  // Ant Design Table
  antdDataIndex: /dataIndex:\s*['"](\w+)['"]/g};
async function mineTables(projectRoot, options = {}) {
  const resolvedRoot = path13.resolve(projectRoot);
  const maxDepth = options.maxDepth ?? MAX_SCAN_DEPTH2;
  const maxFiles = options.maxFiles ?? MAX_FILES_TO_SCAN2;
  const tableMap = /* @__PURE__ */ new Map();
  const fileCount = { count: 0 };
  const srcDirs = ["src", "app", "components", "tables", "grids", "views"];
  for (const dir of srcDirs) {
    const fullPath = path13.join(resolvedRoot, dir);
    if (!validatePathWithinRoot(resolvedRoot, fullPath)) {
      continue;
    }
    if (fs.existsSync(fullPath)) {
      await scanForTables(fullPath, tableMap, fileCount, 0, maxDepth, maxFiles);
    }
  }
  return Array.from(tableMap.values());
}
async function scanForTables(dir, tableMap, fileCount, depth, maxDepth, maxFiles) {
  if (depth > maxDepth || fileCount.count > maxFiles) {
    return;
  }
  let entries;
  try {
    entries = await fsp3.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (fileCount.count > maxFiles) {
      break;
    }
    const fullPath = path13.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!entry.name.startsWith(".") && entry.name !== "node_modules" && entry.name !== "dist" && entry.name !== "build" && !entry.isSymbolicLink()) {
        await scanForTables(fullPath, tableMap, fileCount, depth + 1, maxDepth, maxFiles);
      }
    } else if (entry.isFile() && !entry.isSymbolicLink() && SOURCE_EXTENSIONS.some((ext) => entry.name.endsWith(ext))) {
      fileCount.count++;
      try {
        if (!await isFileSizeWithinLimit(fullPath)) {
          continue;
        }
        const content = await fsp3.readFile(fullPath, "utf-8");
        extractTablesFromContent(content, fullPath, tableMap);
      } catch {
      }
    }
  }
}
function extractTablesFromContent(content, source, tableMap) {
  const fileName = path13.basename(source, path13.extname(source));
  const tableNameFromFile = fileName.replace(/(?:Table|Grid|List|DataGrid)$/i, "");
  const columns = [];
  const hasTableImport = /(?:AgGridReact|DataGrid|useReactTable|Table)/i.test(content);
  if (!hasTableImport && !/<table/i.test(content)) {
    return;
  }
  const columnDefsMatch = TABLE_PATTERNS.agGridColumns.exec(content) || TABLE_PATTERNS.muiColumns.exec(content);
  if (columnDefsMatch) {
    TABLE_PATTERNS.agGridField.lastIndex = 0;
    TABLE_PATTERNS.muiField.lastIndex = 0;
    let fieldMatch;
    let colIter = 0;
    while ((fieldMatch = TABLE_PATTERNS.agGridField.exec(columnDefsMatch[1])) !== null) {
      if (++colIter > MAX_REGEX_ITERATIONS) {
        break;
      }
      if (!columns.includes(fieldMatch[1])) {
        columns.push(fieldMatch[1]);
      }
    }
    colIter = 0;
    while ((fieldMatch = TABLE_PATTERNS.muiField.exec(columnDefsMatch[1])) !== null) {
      if (++colIter > MAX_REGEX_ITERATIONS) {
        break;
      }
      if (!columns.includes(fieldMatch[1])) {
        columns.push(fieldMatch[1]);
      }
    }
    TABLE_PATTERNS.agGridColumns.lastIndex = 0;
    TABLE_PATTERNS.muiColumns.lastIndex = 0;
  }
  TABLE_PATTERNS.tanstackColumn.lastIndex = 0;
  let tanstackMatch;
  let tanstackIter = 0;
  while ((tanstackMatch = TABLE_PATTERNS.tanstackColumn.exec(content)) !== null) {
    if (++tanstackIter > MAX_REGEX_ITERATIONS) {
      break;
    }
    if (!columns.includes(tanstackMatch[1])) {
      columns.push(tanstackMatch[1]);
    }
  }
  TABLE_PATTERNS.antdDataIndex.lastIndex = 0;
  let antdMatch;
  let antdIter = 0;
  while ((antdMatch = TABLE_PATTERNS.antdDataIndex.exec(content)) !== null) {
    if (++antdIter > MAX_REGEX_ITERATIONS) {
      break;
    }
    if (!columns.includes(antdMatch[1])) {
      columns.push(antdMatch[1]);
    }
  }
  TABLE_PATTERNS.htmlTh.lastIndex = 0;
  let thMatch;
  let thIter = 0;
  while ((thMatch = TABLE_PATTERNS.htmlTh.exec(content)) !== null) {
    if (++thIter > MAX_REGEX_ITERATIONS) {
      break;
    }
    const header = thMatch[1].trim();
    if (header && !columns.includes(header)) {
      columns.push(header);
    }
  }
  if (columns.length > 0) {
    const tableId = tableNameFromFile.toLowerCase();
    const tableName = fieldNameToLabel(tableNameFromFile);
    if (!tableMap.has(tableId)) {
      tableMap.set(tableId, {
        id: tableId,
        name: tableName || "Data Table",
        columns
      });
    }
  }
}
var MODAL_PATTERNS = {
  // MUI Dialog
  muiDialog: /<Dialog[^>]*(?:open|onClose)[^>]*>/gi,
  muiDialogTitle: /<DialogTitle[^>]*>([^<]+)<\/DialogTitle>/gi,
  // Radix Dialog
  radixDialog: /<Dialog\.Root/gi,
  radixDialogTitle: /<Dialog\.Title[^>]*>([^<]+)<\/Dialog\.Title>/gi,
  // React Modal
  reactModal: /<Modal[^>]*(?:isOpen|onRequestClose)[^>]*>/gi,
  // Chakra Modal
  chakraModal: /<Modal[^>]*(?:isOpen|onClose)[^>]*>/gi,
  chakraModalHeader: /<ModalHeader[^>]*>([^<]+)<\/ModalHeader>/gi,
  // Ant Design Modal
  antdModal: /<Modal[^>]*(?:open|visible|onCancel)[^>]*>/gi,
  antdModalTitle: /title\s*=\s*[{'"]([\w\s]+)['"}]/gi,
  // Generic modal patterns
  modalComponent: /(?:Modal|Dialog|Popup|Overlay)\s*(?:name|id|title)\s*=\s*['"](\w+)['"]/gi,
  openModal: /(?:open|show|toggle)(?:Modal|Dialog)\s*\(\s*['"]?(\w+)/gi
};
async function mineModals(projectRoot, options = {}) {
  const resolvedRoot = path13.resolve(projectRoot);
  const maxDepth = options.maxDepth ?? MAX_SCAN_DEPTH2;
  const maxFiles = options.maxFiles ?? MAX_FILES_TO_SCAN2;
  const modalMap = /* @__PURE__ */ new Map();
  const fileCount = { count: 0 };
  const srcDirs = ["src", "app", "components", "modals", "dialogs"];
  for (const dir of srcDirs) {
    const fullPath = path13.join(resolvedRoot, dir);
    if (!validatePathWithinRoot(resolvedRoot, fullPath)) {
      continue;
    }
    if (fs.existsSync(fullPath)) {
      await scanForModals(fullPath, modalMap, fileCount, 0, maxDepth, maxFiles);
    }
  }
  return Array.from(modalMap.values());
}
async function scanForModals(dir, modalMap, fileCount, depth, maxDepth, maxFiles) {
  if (depth > maxDepth || fileCount.count > maxFiles) {
    return;
  }
  let entries;
  try {
    entries = await fsp3.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (fileCount.count > maxFiles) {
      break;
    }
    const fullPath = path13.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!entry.name.startsWith(".") && entry.name !== "node_modules" && entry.name !== "dist" && entry.name !== "build" && !entry.isSymbolicLink()) {
        await scanForModals(fullPath, modalMap, fileCount, depth + 1, maxDepth, maxFiles);
      }
    } else if (entry.isFile() && !entry.isSymbolicLink() && SOURCE_EXTENSIONS.some((ext) => entry.name.endsWith(ext))) {
      fileCount.count++;
      try {
        if (!await isFileSizeWithinLimit(fullPath)) {
          continue;
        }
        const content = await fsp3.readFile(fullPath, "utf-8");
        extractModalsFromContent(content, fullPath, modalMap);
      } catch {
      }
    }
  }
}
function extractModalsFromContent(content, source, modalMap) {
  const fileName = path13.basename(source, path13.extname(source));
  const modalNameFromFile = fileName.replace(/(?:Modal|Dialog|Popup)$/i, "");
  const hasModal = Object.values(MODAL_PATTERNS).some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(content);
  });
  if (!hasModal) {
    return;
  }
  let modalTitle;
  MODAL_PATTERNS.muiDialogTitle.lastIndex = 0;
  const muiTitleMatch = MODAL_PATTERNS.muiDialogTitle.exec(content);
  if (muiTitleMatch) {
    modalTitle = muiTitleMatch[1].trim();
  }
  if (!modalTitle) {
    MODAL_PATTERNS.chakraModalHeader.lastIndex = 0;
    const chakraTitleMatch = MODAL_PATTERNS.chakraModalHeader.exec(content);
    if (chakraTitleMatch) {
      modalTitle = chakraTitleMatch[1].trim();
    }
  }
  if (!modalTitle) {
    MODAL_PATTERNS.antdModalTitle.lastIndex = 0;
    const antdTitleMatch = MODAL_PATTERNS.antdModalTitle.exec(content);
    if (antdTitleMatch) {
      modalTitle = antdTitleMatch[1].trim();
    }
  }
  const modalId = modalNameFromFile.toLowerCase();
  const modalName = modalTitle || fieldNameToLabel(modalNameFromFile) || "Modal";
  if (!modalMap.has(modalId) && modalId) {
    modalMap.set(modalId, {
      id: modalId,
      name: modalName
    });
  }
}
function extractEntitiesFromFiles(files, entityMap) {
  for (const file of files) {
    extractEntitiesFromContent(file.content, file.path, entityMap);
  }
}
function extractRoutesFromFiles(files, routeMap) {
  for (const file of files) {
    extractRoutesFromContent(file.content, file.path, routeMap);
  }
}
function extractFormsFromFiles(files, formMap) {
  for (const file of files) {
    extractFormsFromContent(file.content, file.path, formMap);
  }
}
function extractTablesFromFiles(files, tableMap) {
  for (const file of files) {
    extractTablesFromContent(file.content, file.path, tableMap);
  }
}
function extractModalsFromFiles(files, modalMap) {
  for (const file of files) {
    extractModalsFromContent(file.content, file.path, modalMap);
  }
}
async function mineElements(projectRoot, options = {}) {
  const startTime = Date.now();
  const resolvedRoot = path13.resolve(projectRoot);
  const cache = new MiningCache();
  try {
    const files = await scanAllSourceDirectories(resolvedRoot, cache, {
      maxDepth: options.maxDepth ?? MAX_SCAN_DEPTH2,
      maxFiles: options.maxFiles ?? MAX_FILES_TO_SCAN2
    });
    const entityMap = /* @__PURE__ */ new Map();
    const routeMap = /* @__PURE__ */ new Map();
    const formMap = /* @__PURE__ */ new Map();
    const tableMap = /* @__PURE__ */ new Map();
    const modalMap = /* @__PURE__ */ new Map();
    extractEntitiesFromFiles(files, entityMap);
    extractRoutesFromFiles(files, routeMap);
    extractFormsFromFiles(files, formMap);
    extractTablesFromFiles(files, tableMap);
    extractModalsFromFiles(files, modalMap);
    const prismaPath = path13.join(resolvedRoot, "prisma", "schema.prisma");
    if (fs.existsSync(prismaPath)) {
      await extractPrismaEntities(prismaPath, entityMap);
    }
    const pagesDir = path13.join(resolvedRoot, "pages");
    if (validatePathWithinRoot(resolvedRoot, pagesDir) && fs.existsSync(pagesDir)) {
      await extractNextJsPages(pagesDir, routeMap, "");
    }
    const appDir = path13.join(resolvedRoot, "app");
    if (validatePathWithinRoot(resolvedRoot, appDir) && fs.existsSync(appDir)) {
      await extractNextJsAppRoutes(appDir, routeMap, "");
    }
    const entities = Array.from(entityMap.values()).map(({ name, sources, endpoints }) => {
      const singular = singularize(name);
      const plural = pluralize(singular);
      return {
        name,
        singular,
        plural,
        source: sources[0],
        endpoint: endpoints[0]
      };
    });
    const routes = Array.from(routeMap.values());
    const forms = Array.from(formMap.values());
    const tables = Array.from(tableMap.values());
    const modals = Array.from(modalMap.values());
    const elements = {
      entities,
      routes,
      forms,
      tables,
      modals
    };
    const cacheStats = cache.getStats();
    const duration = Date.now() - startTime;
    return {
      elements,
      stats: {
        entitiesFound: entities.length,
        routesFound: routes.length,
        formsFound: forms.length,
        tablesFound: tables.length,
        modalsFound: modals.length,
        totalElements: entities.length + routes.length + forms.length + tables.length + modals.length,
        filesScanned: files.length,
        // ARCH-002: Include cache statistics
        cacheHits: cacheStats.hits,
        cacheMisses: cacheStats.misses,
        cacheHitRate: cache.getHitRate()
      },
      duration
    };
  } finally {
    cache.clear();
  }
}
async function runMiningPipeline(projectRoot, options = {}) {
  const { generateAllPatterns: generateAllPatterns2 } = await Promise.resolve().then(() => (init_template_generators(), template_generators_exports));
  const mining = await mineElements(projectRoot, options);
  const patterns = generateAllPatterns2(mining.elements, options.confidence);
  return {
    mining,
    patterns
  };
}

// llkb/index.ts
init_mining_cache();

// llkb/packs/react.ts
var REACT_PATTERNS = [
  // Hooks
  { text: "wait for useEffect to complete", primitive: "wait", category: "timing" },
  { text: "verify useState update", primitive: "assert", category: "assertion" },
  { text: "trigger useCallback", primitive: "click", category: "ui-interaction" },
  { text: "wait for useMemo recalculation", primitive: "wait", category: "timing" },
  { text: "verify useReducer state", primitive: "assert", category: "assertion" },
  { text: "trigger useRef focus", primitive: "click", category: "ui-interaction" },
  { text: "wait for custom hook", primitive: "wait", category: "timing" },
  { text: "verify hook dependency update", primitive: "assert", category: "assertion" },
  // Context
  { text: "verify context value", primitive: "assert", category: "assertion" },
  { text: "switch context provider", primitive: "click", category: "ui-interaction" },
  { text: "verify context consumer updates", primitive: "assert", category: "assertion" },
  { text: "wait for context propagation", primitive: "wait", category: "timing" },
  // Portal
  { text: "interact with portal content", primitive: "click", category: "ui-interaction" },
  { text: "verify portal renders", primitive: "assert", category: "assertion" },
  { text: "close portal", primitive: "click", category: "ui-interaction" },
  { text: "wait for portal mount", primitive: "wait", category: "timing" },
  // Suspense
  { text: "wait for lazy component to load", primitive: "wait", category: "timing" },
  { text: "verify suspense fallback", primitive: "assert", category: "assertion" },
  { text: "wait for suspense boundary", primitive: "wait", category: "timing" },
  { text: "verify lazy component rendered", primitive: "assert", category: "assertion" },
  // Event handling
  { text: "trigger onChange event", primitive: "fill", category: "ui-interaction" },
  { text: "trigger onSubmit event", primitive: "click", category: "ui-interaction" },
  { text: "trigger onClick event", primitive: "click", category: "ui-interaction" },
  { text: "trigger onBlur event", primitive: "click", category: "ui-interaction" },
  { text: "trigger onFocus event", primitive: "click", category: "ui-interaction" },
  { text: "trigger onKeyDown event", primitive: "fill", category: "ui-interaction" },
  { text: "trigger onMouseEnter event", primitive: "hover", category: "ui-interaction" },
  // Refs
  { text: "verify ref is attached", primitive: "assert", category: "assertion" },
  { text: "focus ref element", primitive: "click", category: "ui-interaction" },
  { text: "scroll to ref element", primitive: "scroll", category: "ui-interaction" },
  { text: "verify ref value updates", primitive: "assert", category: "assertion" },
  // Error boundaries
  { text: "verify error boundary catches error", primitive: "assert", category: "assertion" },
  { text: "trigger error boundary fallback", primitive: "click", category: "ui-interaction" }
];
function getReactPack() {
  return {
    name: "react",
    framework: "react",
    version: "1.0.0",
    description: "React-specific patterns for hooks, context, portals, suspense, and event handling",
    patterns: REACT_PATTERNS
  };
}

// llkb/packs/angular.ts
var ANGULAR_PATTERNS = [
  // Directives
  { text: "verify ngIf shows element", primitive: "assert", category: "assertion" },
  { text: "verify ngIf hides element", primitive: "assert", category: "assertion" },
  { text: "verify ngFor items", primitive: "assert", category: "assertion" },
  { text: "interact with ngSwitch", primitive: "click", category: "ui-interaction" },
  { text: "verify ngClass applied", primitive: "assert", category: "assertion" },
  { text: "verify ngStyle applied", primitive: "assert", category: "assertion" },
  { text: "trigger ngModel update", primitive: "fill", category: "ui-interaction" },
  // Pipes
  { text: "verify async pipe output", primitive: "assert", category: "assertion" },
  { text: "verify date pipe format", primitive: "assert", category: "assertion" },
  { text: "verify currency pipe", primitive: "assert", category: "assertion" },
  { text: "verify decimal pipe", primitive: "assert", category: "assertion" },
  { text: "verify percent pipe", primitive: "assert", category: "assertion" },
  { text: "verify custom pipe output", primitive: "assert", category: "assertion" },
  // Services
  { text: "wait for service response", primitive: "wait", category: "timing" },
  { text: "verify service call", primitive: "assert", category: "assertion" },
  { text: "trigger service method", primitive: "click", category: "ui-interaction" },
  { text: "verify dependency injection", primitive: "assert", category: "assertion" },
  // Router
  { text: "navigate to angular route", primitive: "navigate", category: "navigation" },
  { text: "verify router outlet", primitive: "assert", category: "assertion" },
  { text: "verify activated route", primitive: "assert", category: "assertion" },
  { text: "verify route params", primitive: "assert", category: "assertion" },
  { text: "verify route guards", primitive: "assert", category: "assertion" },
  { text: "trigger route navigation", primitive: "click", category: "navigation" },
  // Forms - Reactive
  { text: "verify reactive form valid", primitive: "assert", category: "assertion" },
  { text: "verify reactive form invalid", primitive: "assert", category: "assertion" },
  { text: "fill reactive form control", primitive: "fill", category: "ui-interaction" },
  { text: "verify form control errors", primitive: "assert", category: "assertion" },
  { text: "submit reactive form", primitive: "click", category: "ui-interaction" },
  // Forms - Template-driven
  { text: "verify template-driven form", primitive: "assert", category: "assertion" },
  { text: "fill template form field", primitive: "fill", category: "ui-interaction" },
  { text: "submit template form", primitive: "click", category: "ui-interaction" },
  // Change Detection
  { text: "trigger change detection", primitive: "click", category: "ui-interaction" },
  { text: "wait for zone stable", primitive: "wait", category: "timing" },
  { text: "verify change detection ran", primitive: "assert", category: "assertion" },
  { text: "wait for async operation", primitive: "wait", category: "timing" }
];
function getAngularPack() {
  return {
    name: "angular",
    framework: "angular",
    version: "1.0.0",
    description: "Angular-specific patterns for directives, pipes, services, router, forms, and change detection",
    patterns: ANGULAR_PATTERNS
  };
}

// llkb/packs/mui.ts
var MUI_PATTERNS = [
  // DataGrid
  {
    text: "sort MUI DataGrid column",
    primitive: "click",
    category: "ui-interaction",
    selectorHints: [{ strategy: "css", value: ".MuiDataGrid-columnHeader" }]
  },
  {
    text: "filter MUI DataGrid",
    primitive: "fill",
    category: "ui-interaction",
    selectorHints: [{ strategy: "css", value: ".MuiDataGrid-filterForm" }]
  },
  {
    text: "select DataGrid row",
    primitive: "click",
    category: "ui-interaction",
    selectorHints: [{ strategy: "css", value: ".MuiDataGrid-row" }]
  },
  {
    text: "paginate DataGrid",
    primitive: "click",
    category: "ui-interaction",
    selectorHints: [{ strategy: "css", value: ".MuiTablePagination-actions button" }]
  },
  {
    text: "expand DataGrid row",
    primitive: "click",
    category: "ui-interaction",
    selectorHints: [{ strategy: "css", value: ".MuiDataGrid-detailPanelToggle" }]
  },
  {
    text: "edit DataGrid cell",
    primitive: "fill",
    category: "ui-interaction",
    selectorHints: [{ strategy: "css", value: ".MuiDataGrid-cell--editable" }]
  },
  // Dialog
  {
    text: "open MUI dialog",
    primitive: "click",
    category: "ui-interaction",
    selectorHints: [{ strategy: "css", value: '[aria-haspopup="dialog"]' }]
  },
  {
    text: "close MUI dialog",
    primitive: "click",
    category: "ui-interaction",
    selectorHints: [{ strategy: "css", value: '.MuiDialog-root [aria-label="close"]' }]
  },
  {
    text: "confirm MUI dialog",
    primitive: "click",
    category: "ui-interaction",
    selectorHints: [{ strategy: "css", value: ".MuiDialogActions-root button:last-child" }]
  },
  {
    text: "verify MUI dialog open",
    primitive: "assert",
    category: "assertion",
    selectorHints: [{ strategy: "role", value: "dialog" }]
  },
  // Snackbar
  {
    text: "verify MUI snackbar message",
    primitive: "assert",
    category: "assertion",
    selectorHints: [{ strategy: "css", value: ".MuiSnackbar-root" }]
  },
  {
    text: "dismiss MUI snackbar",
    primitive: "click",
    category: "ui-interaction",
    selectorHints: [{ strategy: "css", value: '.MuiSnackbar-root [aria-label="close"]' }]
  },
  // Autocomplete
  {
    text: "type in MUI autocomplete",
    primitive: "fill",
    category: "ui-interaction",
    selectorHints: [{ strategy: "css", value: ".MuiAutocomplete-input" }]
  },
  {
    text: "select MUI autocomplete option",
    primitive: "click",
    category: "ui-interaction",
    selectorHints: [{ strategy: "css", value: ".MuiAutocomplete-option" }]
  },
  {
    text: "clear MUI autocomplete",
    primitive: "click",
    category: "ui-interaction",
    selectorHints: [{ strategy: "css", value: ".MuiAutocomplete-clearIndicator" }]
  },
  // DatePicker
  {
    text: "open MUI date picker",
    primitive: "click",
    category: "ui-interaction",
    selectorHints: [{ strategy: "css", value: ".MuiPickersPopper-root" }]
  },
  {
    text: "select date in picker",
    primitive: "click",
    category: "ui-interaction",
    selectorHints: [{ strategy: "css", value: ".MuiPickersDay-root" }]
  },
  {
    text: "navigate picker month",
    primitive: "click",
    category: "ui-interaction",
    selectorHints: [{ strategy: "css", value: ".MuiPickersCalendarHeader-switchViewButton" }]
  },
  // Select
  {
    text: "open MUI select",
    primitive: "click",
    category: "ui-interaction",
    selectorHints: [{ strategy: "css", value: ".MuiSelect-select" }]
  },
  {
    text: "select MUI option",
    primitive: "click",
    category: "ui-interaction",
    selectorHints: [{ strategy: "css", value: ".MuiMenuItem-root" }]
  },
  // TextField
  {
    text: "fill MUI text field",
    primitive: "fill",
    category: "ui-interaction",
    selectorHints: [{ strategy: "css", value: ".MuiTextField-root input" }]
  },
  {
    text: "verify MUI text field error",
    primitive: "assert",
    category: "assertion",
    selectorHints: [{ strategy: "css", value: ".MuiFormHelperText-root.Mui-error" }]
  },
  // Menu
  {
    text: "open MUI menu",
    primitive: "click",
    category: "ui-interaction",
    selectorHints: [{ strategy: "role", value: "button", name: "menu" }]
  },
  {
    text: "select MUI menu item",
    primitive: "click",
    category: "ui-interaction",
    selectorHints: [{ strategy: "role", value: "menuitem" }]
  },
  // Tabs
  {
    text: "click MUI tab",
    primitive: "click",
    category: "ui-interaction",
    selectorHints: [{ strategy: "role", value: "tab" }]
  },
  {
    text: "verify MUI tab selected",
    primitive: "assert",
    category: "assertion",
    selectorHints: [{ strategy: "css", value: '.MuiTab-root[aria-selected="true"]' }]
  }
];
function getMuiPack() {
  return {
    name: "mui",
    framework: "mui",
    version: "1.0.0",
    description: "Material-UI specific patterns for DataGrid, Dialog, Snackbar, Autocomplete, DatePicker, and more",
    patterns: MUI_PATTERNS
  };
}

// llkb/packs/antd.ts
var ANTD_PATTERNS = [
  // Table
  {
    text: "sort Ant table column",
    primitive: "click",
    category: "ui-interaction",
    selectorHints: [{ strategy: "css", value: ".ant-table-column-sorters" }]
  },
  {
    text: "filter Ant table",
    primitive: "click",
    category: "ui-interaction",
    selectorHints: [{ strategy: "css", value: ".ant-table-filter-trigger" }]
  },
  {
    text: "expand Ant table row",
    primitive: "click",
    category: "ui-interaction",
    selectorHints: [{ strategy: "css", value: ".ant-table-row-expand-icon" }]
  },
  {
    text: "select Ant table row",
    primitive: "click",
    category: "ui-interaction",
    selectorHints: [{ strategy: "css", value: ".ant-table-row" }]
  },
  {
    text: "paginate Ant table",
    primitive: "click",
    category: "ui-interaction",
    selectorHints: [{ strategy: "css", value: ".ant-pagination-item" }]
  },
  {
    text: "search Ant table",
    primitive: "fill",
    category: "ui-interaction",
    selectorHints: [{ strategy: "css", value: ".ant-table-filter-dropdown input" }]
  },
  // Modal
  {
    text: "open Ant modal",
    primitive: "click",
    category: "ui-interaction",
    selectorHints: [{ strategy: "css", value: "[data-trigger-modal]" }]
  },
  {
    text: "close Ant modal",
    primitive: "click",
    category: "ui-interaction",
    selectorHints: [{ strategy: "css", value: ".ant-modal-close" }]
  },
  {
    text: "confirm Ant modal",
    primitive: "click",
    category: "ui-interaction",
    selectorHints: [{ strategy: "css", value: ".ant-modal-footer .ant-btn-primary" }]
  },
  {
    text: "cancel Ant modal",
    primitive: "click",
    category: "ui-interaction",
    selectorHints: [{ strategy: "css", value: ".ant-modal-footer .ant-btn-default" }]
  },
  // Message & Notification
  {
    text: "verify Ant message",
    primitive: "assert",
    category: "assertion",
    selectorHints: [{ strategy: "css", value: ".ant-message" }]
  },
  {
    text: "verify Ant notification",
    primitive: "assert",
    category: "assertion",
    selectorHints: [{ strategy: "css", value: ".ant-notification" }]
  },
  {
    text: "close Ant notification",
    primitive: "click",
    category: "ui-interaction",
    selectorHints: [{ strategy: "css", value: ".ant-notification-close-icon" }]
  },
  // Select
  {
    text: "open Ant select dropdown",
    primitive: "click",
    category: "ui-interaction",
    selectorHints: [{ strategy: "css", value: ".ant-select-selector" }]
  },
  {
    text: "search Ant select",
    primitive: "fill",
    category: "ui-interaction",
    selectorHints: [{ strategy: "css", value: ".ant-select-selection-search-input" }]
  },
  {
    text: "select Ant option",
    primitive: "click",
    category: "ui-interaction",
    selectorHints: [{ strategy: "css", value: ".ant-select-item-option" }]
  },
  {
    text: "clear Ant select",
    primitive: "click",
    category: "ui-interaction",
    selectorHints: [{ strategy: "css", value: ".ant-select-clear" }]
  },
  // Form
  {
    text: "submit Ant form",
    primitive: "click",
    category: "ui-interaction",
    selectorHints: [{ strategy: "css", value: '.ant-form button[type="submit"]' }]
  },
  {
    text: "verify Ant form validation",
    primitive: "assert",
    category: "assertion",
    selectorHints: [{ strategy: "css", value: ".ant-form-item-explain-error" }]
  },
  {
    text: "fill Ant input",
    primitive: "fill",
    category: "ui-interaction",
    selectorHints: [{ strategy: "css", value: ".ant-input" }]
  },
  {
    text: "reset Ant form",
    primitive: "click",
    category: "ui-interaction",
    selectorHints: [{ strategy: "css", value: '.ant-form button[type="reset"]' }]
  },
  // DatePicker
  {
    text: "open Ant date picker",
    primitive: "click",
    category: "ui-interaction",
    selectorHints: [{ strategy: "css", value: ".ant-picker" }]
  },
  {
    text: "select Ant date",
    primitive: "click",
    category: "ui-interaction",
    selectorHints: [{ strategy: "css", value: ".ant-picker-cell" }]
  },
  // Drawer
  {
    text: "open Ant drawer",
    primitive: "click",
    category: "ui-interaction",
    selectorHints: [{ strategy: "css", value: "[data-trigger-drawer]" }]
  },
  {
    text: "close Ant drawer",
    primitive: "click",
    category: "ui-interaction",
    selectorHints: [{ strategy: "css", value: ".ant-drawer-close" }]
  }
];
function getAntdPack() {
  return {
    name: "antd",
    framework: "antd",
    version: "1.0.0",
    description: "Ant Design specific patterns for Table, Modal, Message, Select, Form, and more",
    patterns: ANTD_PATTERNS
  };
}

// llkb/packs/chakra.ts
var CHAKRA_PATTERNS = [
  // Modal
  {
    text: "open Chakra modal",
    primitive: "click",
    category: "ui-interaction",
    selectorHints: [{ strategy: "css", value: "[data-chakra-modal-trigger]" }]
  },
  {
    text: "close Chakra modal",
    primitive: "click",
    category: "ui-interaction",
    selectorHints: [{ strategy: "css", value: '[aria-label="Close"]' }]
  },
  {
    text: "verify Chakra modal open",
    primitive: "assert",
    category: "assertion",
    selectorHints: [{ strategy: "role", value: "dialog" }]
  },
  {
    text: "confirm Chakra modal",
    primitive: "click",
    category: "ui-interaction",
    selectorHints: [{ strategy: "css", value: '[role="dialog"] footer button:last-child' }]
  },
  // Toast
  {
    text: "verify Chakra toast",
    primitive: "assert",
    category: "assertion",
    selectorHints: [{ strategy: "role", value: "status" }]
  },
  {
    text: "dismiss Chakra toast",
    primitive: "click",
    category: "ui-interaction",
    selectorHints: [{ strategy: "css", value: '[role="status"] button[aria-label="Close"]' }]
  },
  {
    text: "verify Chakra toast message",
    primitive: "assert",
    category: "assertion",
    selectorHints: [{ strategy: "css", value: '[role="status"]' }]
  },
  // Menu
  {
    text: "open Chakra menu",
    primitive: "click",
    category: "ui-interaction",
    selectorHints: [{ strategy: "role", value: "button", name: "menu" }]
  },
  {
    text: "select Chakra menu item",
    primitive: "click",
    category: "ui-interaction",
    selectorHints: [{ strategy: "role", value: "menuitem" }]
  },
  {
    text: "close Chakra menu",
    primitive: "click",
    category: "ui-interaction",
    selectorHints: [{ strategy: "css", value: "body" }]
  },
  // Drawer
  {
    text: "open Chakra drawer",
    primitive: "click",
    category: "ui-interaction",
    selectorHints: [{ strategy: "css", value: "[data-chakra-drawer-trigger]" }]
  },
  {
    text: "close Chakra drawer",
    primitive: "click",
    category: "ui-interaction",
    selectorHints: [{ strategy: "css", value: '[role="dialog"] [aria-label="Close"]' }]
  },
  {
    text: "verify Chakra drawer open",
    primitive: "assert",
    category: "assertion",
    selectorHints: [{ strategy: "role", value: "dialog" }]
  },
  // Tabs
  {
    text: "switch Chakra tab",
    primitive: "click",
    category: "ui-interaction",
    selectorHints: [{ strategy: "role", value: "tab" }]
  },
  {
    text: "verify Chakra tab content",
    primitive: "assert",
    category: "assertion",
    selectorHints: [{ strategy: "role", value: "tabpanel" }]
  },
  {
    text: "verify Chakra tab selected",
    primitive: "assert",
    category: "assertion",
    selectorHints: [{ strategy: "css", value: '[role="tab"][aria-selected="true"]' }]
  },
  // Form
  {
    text: "fill Chakra input",
    primitive: "fill",
    category: "ui-interaction",
    selectorHints: [{ strategy: "css", value: "input" }]
  },
  {
    text: "verify Chakra form error",
    primitive: "assert",
    category: "assertion",
    selectorHints: [{ strategy: "css", value: '[role="alert"]' }]
  },
  {
    text: "submit Chakra form",
    primitive: "click",
    category: "ui-interaction",
    selectorHints: [{ strategy: "css", value: 'button[type="submit"]' }]
  },
  // Popover
  {
    text: "open Chakra popover",
    primitive: "click",
    category: "ui-interaction",
    selectorHints: [{ strategy: "css", value: "[data-chakra-popover-trigger]" }]
  },
  {
    text: "close Chakra popover",
    primitive: "click",
    category: "ui-interaction",
    selectorHints: [{ strategy: "css", value: '[role="tooltip"] [aria-label="Close"]' }]
  }
];
function getChakraPack() {
  return {
    name: "chakra",
    framework: "chakra",
    version: "1.0.0",
    description: "Chakra UI specific patterns for Modal, Toast, Menu, Drawer, Tabs, and more",
    patterns: CHAKRA_PATTERNS
  };
}
var DEFAULT_PACK_CONFIDENCE = 0.65;
var PACK_REGISTRY = [
  {
    name: "react",
    frameworks: ["react", "nextjs"],
    loader: getReactPack
  },
  {
    name: "angular",
    frameworks: ["angular"],
    loader: getAngularPack
  },
  {
    name: "mui",
    frameworks: ["mui"],
    loader: getMuiPack
  },
  {
    name: "antd",
    frameworks: ["antd"],
    loader: getAntdPack
  },
  {
    name: "chakra",
    frameworks: ["chakra"],
    loader: getChakraPack
  }
];
function getPackRegistry() {
  return PACK_REGISTRY;
}
function loadPacksForFrameworks(frameworks) {
  const packs = [];
  const loadedPackNames = /* @__PURE__ */ new Set();
  const normalizedFrameworks = frameworks.map((f) => f.toLowerCase());
  for (const entry of PACK_REGISTRY) {
    const shouldLoad = entry.frameworks.some(
      (f) => normalizedFrameworks.includes(f.toLowerCase())
    );
    if (shouldLoad && !loadedPackNames.has(entry.name)) {
      const pack = entry.loader();
      packs.push(pack);
      loadedPackNames.add(entry.name);
    }
  }
  return packs;
}
function packPatternToDiscovered(packPattern, packName) {
  return {
    id: `DP-${randomUUID().slice(0, 8)}`,
    normalizedText: packPattern.text.toLowerCase(),
    originalText: packPattern.text,
    mappedPrimitive: packPattern.primitive,
    selectorHints: packPattern.selectorHints || [],
    confidence: packPattern.confidence || DEFAULT_PACK_CONFIDENCE,
    layer: "framework",
    category: packPattern.category,
    sourceJourneys: [],
    successCount: 0,
    failCount: 0,
    templateSource: "static",
    entityName: packName
  };
}
function packPatternsToDiscovered(pack) {
  return pack.patterns.map((pattern) => packPatternToDiscovered(pattern, pack.name));
}
function loadDiscoveredPatternsForFrameworks(frameworks) {
  const packs = loadPacksForFrameworks(frameworks);
  const patterns = [];
  for (const pack of packs) {
    patterns.push(...packPatternsToDiscovered(pack));
  }
  return patterns;
}

// llkb/mining/i18n-mining.ts
init_mining_cache();
var MAX_REGEX_ITERATIONS2 = 1e4;
var I18N_PATTERN_CONFIDENCE = 0.75;
var I18N_LIBRARY_PATTERNS = {
  "react-i18next": /(?:import|from)\s+['"]react-i18next['"]|useTranslation\(/g,
  "angular-translate": /\$translate\.get\(|translate\s+filter|\|\s*translate/g,
  "vue-i18n": /(?:import|from)\s+['"]vue-i18n['"]|createI18n\(|\$t\(/g,
  "next-intl": /(?:import|from)\s+['"]next-intl['"]|useTranslations\(/g
};
var I18N_KEY_PATTERNS = {
  // react-i18next: t('key'), t('namespace:key'), t('key', { defaultValue: '...' })
  reactI18next: /\bt\s*\(\s*['"`]([^'"`]+)['"`]\s*(?:,\s*\{[^}]*defaultValue\s*:\s*['"`]([^'"`]+)['"`][^}]*\})?\)/g,
  // Trans component: <Trans i18nKey="key">...</Trans>
  transComponent: /<Trans\s+i18nKey\s*=\s*['"`]([^'"`]+)['"`]/g,
  // angular-translate: {{ 'key' | translate }}, $translate.get('key')
  angularTranslate: /(?:\{\{\s*['"`]([^'"`]+)['"`]\s*\|\s*translate\s*\}\}|\$translate\.get\s*\(\s*['"`]([^'"`]+)['"`]\))/g,
  // vue-i18n: $t('key'), t('key') in setup
  vueI18n: /\$t\s*\(\s*['"`]([^'"`]+)['"`]\)|(?:^|[^\w])t\s*\(\s*['"`]([^'"`]+)['"`]\)/g,
  // next-intl: t('key')
  nextIntl: /\bt\s*\(\s*['"`]([^'"`]+)['"`]\)/g
};
async function mineI18nKeys(projectRoot, cache) {
  const resolvedRoot = path13.resolve(projectRoot);
  const miningCache = cache ?? new (await Promise.resolve().then(() => (init_mining_cache(), mining_cache_exports))).MiningCache();
  const shouldCleanup = !cache;
  try {
    const files = await scanAllSourceDirectories(resolvedRoot, miningCache);
    const library = detectI18nLibrary(files);
    const keys = extractI18nKeys(files, library);
    const localeFiles = await findLocaleFiles(resolvedRoot);
    return {
      library,
      keys,
      localeFiles
    };
  } finally {
    if (shouldCleanup) {
      miningCache.clear();
    }
  }
}
function detectI18nLibrary(files) {
  const detectionScores = {
    "react-i18next": 0,
    "angular-translate": 0,
    "vue-i18n": 0,
    "next-intl": 0
  };
  for (const file of files) {
    for (const [library, pattern] of Object.entries(I18N_LIBRARY_PATTERNS)) {
      pattern.lastIndex = 0;
      if (pattern.test(file.content)) {
        detectionScores[library]++;
      }
    }
  }
  let maxScore = 0;
  let detectedLibrary = "unknown";
  for (const [library, score] of Object.entries(detectionScores)) {
    if (score > maxScore) {
      maxScore = score;
      detectedLibrary = library;
    }
  }
  return detectedLibrary;
}
function extractI18nKeys(files, _library) {
  const keys = [];
  const seenKeys = /* @__PURE__ */ new Set();
  for (const file of files) {
    for (const [patternName, pattern] of Object.entries(I18N_KEY_PATTERNS)) {
      pattern.lastIndex = 0;
      let match;
      let iterations = 0;
      while ((match = pattern.exec(file.content)) !== null) {
        if (++iterations > MAX_REGEX_ITERATIONS2) {
          break;
        }
        const key = match[1] || match[2];
        if (!key) {
          continue;
        }
        const keyId = `${key}:${file.path}`;
        if (seenKeys.has(keyId)) {
          continue;
        }
        seenKeys.add(keyId);
        let namespace;
        let cleanKey = key;
        if (key.includes(":")) {
          const parts = key.split(":");
          if (parts.length === 2) {
            namespace = parts[0];
            cleanKey = parts[1];
          }
        } else if (key.includes(".")) {
          const parts = key.split(".");
          cleanKey = parts[parts.length - 1];
        }
        const defaultValue = match[2] && patternName === "reactI18next" ? match[2] : void 0;
        keys.push({
          key: cleanKey,
          namespace,
          defaultValue,
          source: file.path
        });
      }
    }
  }
  return keys;
}
async function findLocaleFiles(projectRoot) {
  const localeFiles = [];
  const localeDirs = ["locales", "i18n", "translations", "lang", "public/locales"];
  for (const dir of localeDirs) {
    const fullPath = path13.join(projectRoot, dir);
    try {
      const stat = await fsp3.lstat(fullPath);
      if (stat.isSymbolicLink()) {
        continue;
      }
      if (!stat.isDirectory()) {
        continue;
      }
      const files = await findJsonFilesRecursive(fullPath);
      localeFiles.push(...files);
    } catch {
      continue;
    }
  }
  return localeFiles;
}
async function findJsonFilesRecursive(dir, depth = 0, maxDepth = 5) {
  if (depth > maxDepth) {
    return [];
  }
  const files = [];
  try {
    const entries = await fsp3.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isSymbolicLink()) {
        continue;
      }
      const fullPath = path13.join(dir, entry.name);
      if (entry.isDirectory()) {
        const subFiles = await findJsonFilesRecursive(fullPath, depth + 1, maxDepth);
        files.push(...subFiles);
      } else if (entry.isFile() && entry.name.endsWith(".json")) {
        files.push(fullPath);
      }
    }
  } catch {
  }
  return files;
}
function generateI18nPatterns(result) {
  const patterns = [];
  const seenPatterns = /* @__PURE__ */ new Set();
  for (const i18nKey of result.keys) {
    const label = keyToLabel(i18nKey.key);
    const verifyTextPattern = `verify ${label} text`;
    const verifyTextKey = `${verifyTextPattern}:assert`;
    if (!seenPatterns.has(verifyTextKey)) {
      seenPatterns.add(verifyTextKey);
      patterns.push({
        id: `DP-${randomUUID().slice(0, 8)}`,
        normalizedText: verifyTextPattern.toLowerCase(),
        originalText: verifyTextPattern,
        mappedPrimitive: "assert",
        selectorHints: [
          {
            strategy: "text",
            value: i18nKey.defaultValue || i18nKey.key,
            confidence: I18N_PATTERN_CONFIDENCE
          }
        ],
        confidence: I18N_PATTERN_CONFIDENCE,
        layer: "app-specific",
        category: "assertion",
        sourceJourneys: [],
        successCount: 0,
        failCount: 0,
        templateSource: "static"
      });
    }
    const verifyVisiblePattern = `verify ${label} is visible`;
    const verifyVisibleKey = `${verifyVisiblePattern}:assert`;
    if (!seenPatterns.has(verifyVisibleKey)) {
      seenPatterns.add(verifyVisibleKey);
      patterns.push({
        id: `DP-${randomUUID().slice(0, 8)}`,
        normalizedText: verifyVisiblePattern.toLowerCase(),
        originalText: verifyVisiblePattern,
        mappedPrimitive: "assert",
        selectorHints: [
          {
            strategy: "text",
            value: i18nKey.defaultValue || i18nKey.key,
            confidence: I18N_PATTERN_CONFIDENCE
          }
        ],
        confidence: I18N_PATTERN_CONFIDENCE,
        layer: "app-specific",
        category: "assertion",
        sourceJourneys: [],
        successCount: 0,
        failCount: 0,
        templateSource: "static"
      });
    }
  }
  return patterns;
}
function keyToLabel(key) {
  return key.replace(/[_-]/g, " ").replace(/([A-Z])/g, " $1").trim().split(/\s+/).map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ");
}

// llkb/mining/analytics-mining.ts
init_mining_cache();
var MAX_REGEX_ITERATIONS3 = 1e4;
var ANALYTICS_PATTERN_CONFIDENCE = 0.7;
var ANALYTICS_PROVIDER_PATTERNS = {
  ga4: /gtag\s*\(\s*['"]event['"]|ReactGA\.event\(|window\.gtag\(/g,
  mixpanel: /mixpanel\.track\(|import.*mixpanel|from\s+['"]mixpanel['"]/g,
  segment: /analytics\.track\(|window\.analytics\.track\(|import.*@segment/g,
  amplitude: /amplitude\.logEvent\(|import.*@amplitude|Amplitude\.getInstance\(\)/g
};
var ANALYTICS_EVENT_PATTERNS = {
  // GA4/gtag: gtag('event', 'eventName', {...})
  ga4Gtag: /gtag\s*\(\s*['"]event['"]\s*,\s*['"]([^'"]+)['"]/g,
  // React GA: ReactGA.event({ category: '...', action: '...' })
  reactGa: /ReactGA\.event\s*\(\s*\{[^}]*action\s*:\s*['"]([^'"]+)['"]/g,
  // Mixpanel: mixpanel.track('eventName', {...})
  mixpanel: /mixpanel\.track\s*\(\s*['"]([^'"]+)['"]/g,
  // Segment: analytics.track('eventName', {...})
  segment: /analytics\.track\s*\(\s*['"]([^'"]+)['"]/g,
  // Amplitude: amplitude.logEvent('eventName', {...})
  amplitude: /amplitude\.logEvent\s*\(\s*['"]([^'"]+)['"]/g,
  // Custom analytics: trackEvent('eventName'), logEvent('eventName')
  custom: /(?:trackEvent|logEvent|sendEvent)\s*\(\s*['"]([^'"]+)['"]/g
};
var EVENT_PROPERTIES_PATTERN = /\{\s*([^}]+)\s*\}/g;
async function mineAnalyticsEvents(projectRoot, cache) {
  const resolvedRoot = path13.resolve(projectRoot);
  const miningCache = cache ?? new (await Promise.resolve().then(() => (init_mining_cache(), mining_cache_exports))).MiningCache();
  const shouldCleanup = !cache;
  try {
    const files = await scanAllSourceDirectories(resolvedRoot, miningCache);
    const provider = detectAnalyticsProvider(files);
    const events = extractAnalyticsEvents(files, provider);
    return {
      provider,
      events
    };
  } finally {
    if (shouldCleanup) {
      miningCache.clear();
    }
  }
}
function detectAnalyticsProvider(files) {
  const detectionScores = {
    ga4: 0,
    mixpanel: 0,
    segment: 0,
    amplitude: 0,
    custom: 0
  };
  for (const file of files) {
    for (const [provider, pattern] of Object.entries(ANALYTICS_PROVIDER_PATTERNS)) {
      pattern.lastIndex = 0;
      if (pattern.test(file.content)) {
        detectionScores[provider]++;
      }
    }
    const customPattern = /(?:trackEvent|logEvent|sendEvent)\s*\(/g;
    customPattern.lastIndex = 0;
    if (customPattern.test(file.content)) {
      detectionScores.custom++;
    }
  }
  let maxScore = 0;
  let detectedProvider = "unknown";
  for (const [provider, score] of Object.entries(detectionScores)) {
    if (score > maxScore) {
      maxScore = score;
      detectedProvider = provider;
    }
  }
  return detectedProvider;
}
function extractAnalyticsEvents(files, provider) {
  const events = [];
  const seenEvents = /* @__PURE__ */ new Set();
  for (const file of files) {
    for (const [patternName, pattern] of Object.entries(ANALYTICS_EVENT_PATTERNS)) {
      pattern.lastIndex = 0;
      let match;
      let iterations = 0;
      while ((match = pattern.exec(file.content)) !== null) {
        if (++iterations > MAX_REGEX_ITERATIONS3) {
          break;
        }
        const eventName = match[1];
        if (!eventName) {
          continue;
        }
        const eventId = `${eventName}:${file.path}`;
        if (seenEvents.has(eventId)) {
          continue;
        }
        seenEvents.add(eventId);
        const properties = extractEventProperties(file.content, match.index);
        let eventProvider = provider;
        if (patternName.includes("ga4") || patternName.includes("reactGa")) {
          eventProvider = "ga4";
        } else if (patternName.includes("mixpanel")) {
          eventProvider = "mixpanel";
        } else if (patternName.includes("segment")) {
          eventProvider = "segment";
        } else if (patternName.includes("amplitude")) {
          eventProvider = "amplitude";
        } else if (patternName.includes("custom")) {
          eventProvider = "custom";
        }
        events.push({
          name: eventName,
          provider: eventProvider,
          properties,
          source: file.path
        });
      }
    }
  }
  return events;
}
function extractEventProperties(content, matchIndex) {
  const searchEnd = Math.min(matchIndex + 200, content.length);
  const snippet = content.slice(matchIndex, searchEnd);
  EVENT_PROPERTIES_PATTERN.lastIndex = 0;
  const propsMatch = EVENT_PROPERTIES_PATTERN.exec(snippet);
  if (!propsMatch) {
    return void 0;
  }
  const propsText = propsMatch[1];
  const propertyPattern = /(\w+)\s*:/g;
  const properties = [];
  let propMatch;
  let iterations = 0;
  while ((propMatch = propertyPattern.exec(propsText)) !== null) {
    if (++iterations > MAX_REGEX_ITERATIONS3) {
      break;
    }
    properties.push(propMatch[1]);
  }
  return properties.length > 0 ? properties : void 0;
}
function generateAnalyticsPatterns(result) {
  const patterns = [];
  const seenPatterns = /* @__PURE__ */ new Set();
  for (const event of result.events) {
    const label = eventNameToLabel(event.name);
    const verifyTrackedPattern = `verify ${label} tracked`;
    const verifyTrackedKey = `${verifyTrackedPattern}:assert`;
    if (!seenPatterns.has(verifyTrackedKey)) {
      seenPatterns.add(verifyTrackedKey);
      patterns.push({
        id: `DP-${randomUUID().slice(0, 8)}`,
        normalizedText: verifyTrackedPattern.toLowerCase(),
        originalText: verifyTrackedPattern,
        mappedPrimitive: "assert",
        selectorHints: [],
        confidence: ANALYTICS_PATTERN_CONFIDENCE,
        layer: "app-specific",
        category: "assertion",
        sourceJourneys: [],
        successCount: 0,
        failCount: 0,
        templateSource: "static"
      });
    }
    const triggerEventPattern = `trigger ${label} event`;
    const triggerEventKey = `${triggerEventPattern}:click`;
    if (!seenPatterns.has(triggerEventKey)) {
      seenPatterns.add(triggerEventKey);
      patterns.push({
        id: `DP-${randomUUID().slice(0, 8)}`,
        normalizedText: triggerEventPattern.toLowerCase(),
        originalText: triggerEventPattern,
        mappedPrimitive: "click",
        selectorHints: [],
        confidence: ANALYTICS_PATTERN_CONFIDENCE,
        layer: "app-specific",
        category: "ui-interaction",
        sourceJourneys: [],
        successCount: 0,
        failCount: 0,
        templateSource: "static"
      });
    }
  }
  return patterns;
}
function eventNameToLabel(eventName) {
  return eventName.replace(/[_-]/g, " ").replace(/([A-Z])/g, " $1").trim().split(/\s+/).map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ");
}

// llkb/mining/feature-flag-mining.ts
init_mining_cache();
var MAX_REGEX_ITERATIONS4 = 1e4;
var FEATURE_FLAG_PATTERN_CONFIDENCE = 0.7;
var FEATURE_FLAG_PROVIDER_PATTERNS = {
  launchdarkly: /useFlags\s*\(|ldClient\.variation\(|useLDClient\(|import.*launchdarkly|from\s+['"]launchdarkly['"]/g,
  split: /splitClient\.getTreatment\(|import.*@splitsoftware|from\s+['"]@splitsoftware['"]/g,
  flagsmith: /flagsmith\.hasFeature\(|flagsmith\.getValue\(|import.*flagsmith|from\s+['"]flagsmith['"]/g,
  unleash: /useFlag\s*\(|unleash\.isEnabled\(|import.*unleash-proxy|from\s+['"]unleash-proxy['"]/g
};
var FEATURE_FLAG_PATTERNS = {
  // LaunchDarkly: useFlags(), ldClient.variation('flagName', defaultValue)
  launchDarklyVariation: /ldClient\?\.variation\s*\(\s*['"]([^'"]+)['"]\s*(?:,\s*(true|false))?\)/g,
  launchDarklyUseFlags: /flags\[['"]([^'"]+)['"]\]/g,
  // Split.io: splitClient.getTreatment('flagName')
  split: /getTreatment\s*\(\s*['"]([^'"]+)['"]/g,
  // Flagsmith: flagsmith.hasFeature('flagName'), flagsmith.getValue('flagName')
  flagsmith: /(?:hasFeature|getValue)\s*\(\s*['"]([^'"]+)['"]/g,
  // Unleash: useFlag('flagName'), unleash.isEnabled('flagName')
  unleash: /(?:useFlag|isEnabled)\s*\(\s*['"]([^'"]+)['"]/g,
  // Custom: featureFlags.isEnabled('flagName'), isFeatureEnabled('flagName')
  custom: /(?:featureFlags|features)\.(?:isEnabled|enabled|has)\s*\(\s*['"]([^'"]+)['"]/g,
  customFunction: /isFeatureEnabled\s*\(\s*['"]([^'"]+)['"]/g,
  // Environment variables: process.env.FEATURE_FLAG_NAME, import.meta.env.FEATURE_FLAG_NAME
  envVar: /(?:process\.env|import\.meta\.env)\.FEATURE_(\w+)/g
};
async function mineFeatureFlags(projectRoot, cache) {
  const resolvedRoot = path13.resolve(projectRoot);
  const miningCache = cache ?? new (await Promise.resolve().then(() => (init_mining_cache(), mining_cache_exports))).MiningCache();
  const shouldCleanup = !cache;
  try {
    const files = await scanAllSourceDirectories(resolvedRoot, miningCache);
    const provider = detectFeatureFlagProvider(files);
    const flags = extractFeatureFlags(files, provider);
    return {
      provider,
      flags
    };
  } finally {
    if (shouldCleanup) {
      miningCache.clear();
    }
  }
}
function detectFeatureFlagProvider(files) {
  const detectionScores = {
    launchdarkly: 0,
    split: 0,
    flagsmith: 0,
    unleash: 0,
    custom: 0
  };
  for (const file of files) {
    for (const [provider, pattern] of Object.entries(FEATURE_FLAG_PROVIDER_PATTERNS)) {
      pattern.lastIndex = 0;
      if (pattern.test(file.content)) {
        detectionScores[provider]++;
      }
    }
    const customPattern = /(?:featureFlags|isFeatureEnabled)\s*[.(]/g;
    customPattern.lastIndex = 0;
    if (customPattern.test(file.content)) {
      detectionScores.custom++;
    }
  }
  let maxScore = 0;
  let detectedProvider = "unknown";
  for (const [provider, score] of Object.entries(detectionScores)) {
    if (score > maxScore) {
      maxScore = score;
      detectedProvider = provider;
    }
  }
  return detectedProvider;
}
function extractFeatureFlags(files, provider) {
  const flags = [];
  const seenFlags = /* @__PURE__ */ new Set();
  for (const file of files) {
    for (const [patternName, pattern] of Object.entries(FEATURE_FLAG_PATTERNS)) {
      pattern.lastIndex = 0;
      let match;
      let iterations = 0;
      while ((match = pattern.exec(file.content)) !== null) {
        if (++iterations > MAX_REGEX_ITERATIONS4) {
          break;
        }
        const flagName = match[1];
        if (!flagName) {
          continue;
        }
        const flagId = `${flagName}:${file.path}`;
        if (seenFlags.has(flagId)) {
          continue;
        }
        seenFlags.add(flagId);
        let defaultValue;
        if (match[2] !== void 0 && patternName === "launchDarklyVariation") {
          defaultValue = match[2] === "true";
        }
        let flagProvider = provider;
        if (patternName.includes("launchDarkly")) {
          flagProvider = "launchdarkly";
        } else if (patternName.includes("split")) {
          flagProvider = "split";
        } else if (patternName.includes("flagsmith")) {
          flagProvider = "flagsmith";
        } else if (patternName.includes("unleash")) {
          flagProvider = "unleash";
        } else {
          flagProvider = "custom";
        }
        flags.push({
          name: flagName,
          provider: flagProvider,
          defaultValue,
          source: file.path
        });
      }
    }
  }
  return flags;
}
function generateFeatureFlagPatterns(result) {
  const patterns = [];
  const seenPatterns = /* @__PURE__ */ new Set();
  for (const flag of result.flags) {
    const label = flagNameToLabel(flag.name);
    const ensureVisiblePattern = `ensure ${label} visible`;
    const ensureVisibleKey = `${ensureVisiblePattern}:assert`;
    if (!seenPatterns.has(ensureVisibleKey)) {
      seenPatterns.add(ensureVisibleKey);
      patterns.push({
        id: `DP-${randomUUID().slice(0, 8)}`,
        normalizedText: ensureVisiblePattern.toLowerCase(),
        originalText: ensureVisiblePattern,
        mappedPrimitive: "assert",
        selectorHints: [],
        confidence: FEATURE_FLAG_PATTERN_CONFIDENCE,
        layer: "app-specific",
        category: "assertion",
        sourceJourneys: [],
        successCount: 0,
        failCount: 0,
        templateSource: "static"
      });
    }
    const verifyEnabledPattern = `verify ${label} enabled`;
    const verifyEnabledKey = `${verifyEnabledPattern}:assert`;
    if (!seenPatterns.has(verifyEnabledKey)) {
      seenPatterns.add(verifyEnabledKey);
      patterns.push({
        id: `DP-${randomUUID().slice(0, 8)}`,
        normalizedText: verifyEnabledPattern.toLowerCase(),
        originalText: verifyEnabledPattern,
        mappedPrimitive: "assert",
        selectorHints: [],
        confidence: FEATURE_FLAG_PATTERN_CONFIDENCE,
        layer: "app-specific",
        category: "assertion",
        sourceJourneys: [],
        successCount: 0,
        failCount: 0,
        templateSource: "static"
      });
    }
    const testDisabledPattern = `test with ${label} disabled`;
    const testDisabledKey = `${testDisabledPattern}:navigate`;
    if (!seenPatterns.has(testDisabledKey)) {
      seenPatterns.add(testDisabledKey);
      patterns.push({
        id: `DP-${randomUUID().slice(0, 8)}`,
        normalizedText: testDisabledPattern.toLowerCase(),
        originalText: testDisabledPattern,
        mappedPrimitive: "navigate",
        selectorHints: [],
        confidence: FEATURE_FLAG_PATTERN_CONFIDENCE,
        layer: "app-specific",
        category: "navigation",
        sourceJourneys: [],
        successCount: 0,
        failCount: 0,
        templateSource: "static"
      });
    }
  }
  return patterns;
}
function flagNameToLabel(flagName) {
  return flagName.replace(/[_-]/g, " ").replace(/([A-Z])/g, " $1").trim().split(/\s+/).map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ");
}

// llkb/pipeline.ts
init_template_generators();
init_mining_cache();
var SPEC_CONFIDENCE_THRESHOLD = 0.7;
var MAX_PIPELINE_PATTERNS = 2e3;
var SPEC_PATTERN_TARGET = 360;
async function runFullDiscoveryPipeline(projectRoot, llkbDir, options = {}) {
  const startTime = Date.now();
  const warnings = [];
  const errors = [];
  const threshold = options.confidenceThreshold ?? SPEC_CONFIDENCE_THRESHOLD;
  const maxPatterns = options.maxPatterns ?? MAX_PIPELINE_PATTERNS;
  const allPatterns = [];
  const patternSources = {
    discovery: 0,
    templates: 0,
    frameworkPacks: 0,
    i18n: 0,
    analytics: 0,
    featureFlags: 0
  };
  const strongIds = [];
  const mediumIds = [];
  const weakIds = [];
  let profile = null;
  let miningStats = null;
  let discoveryResult;
  try {
    discoveryResult = await runDiscovery(projectRoot);
    profile = discoveryResult.profile;
    warnings.push(...discoveryResult.warnings);
    if (!discoveryResult.success) {
      errors.push(...discoveryResult.errors);
    }
  } catch (e) {
    errors.push(`Discovery failed: ${String(e)}`);
    discoveryResult = { success: false, profile: null, errors: [], warnings: [] };
  }
  if (profile) {
    try {
      const discoveryPatterns = generatePatterns(profile, profile.selectorSignals);
      allPatterns.push(...discoveryPatterns);
      patternSources.discovery = discoveryPatterns.length;
      strongIds.push(...discoveryPatterns.map((p) => p.id));
    } catch (e) {
      warnings.push(`Discovery pattern generation failed: ${String(e)}`);
    }
  }
  try {
    const miningResult = await mineElements(projectRoot, {
      maxDepth: options.maxDepth,
      maxFiles: options.maxFiles
    });
    miningStats = {
      entitiesFound: miningResult.stats.entitiesFound,
      routesFound: miningResult.stats.routesFound,
      formsFound: miningResult.stats.formsFound,
      tablesFound: miningResult.stats.tablesFound,
      modalsFound: miningResult.stats.modalsFound,
      filesScanned: miningResult.stats.filesScanned
    };
    const templateResult = generateAllPatterns(miningResult.elements);
    allPatterns.push(...templateResult.patterns);
    patternSources.templates = templateResult.patterns.length;
    mediumIds.push(...templateResult.patterns.map((p) => p.id));
  } catch (e) {
    warnings.push(`Mining/template generation failed: ${String(e)}`);
  }
  if (!options.skipPacks && profile) {
    try {
      const frameworkNames = [
        ...profile.frameworks.map((f) => f.name),
        ...profile.uiLibraries.map((l) => l.name)
      ];
      if (frameworkNames.length > 0) {
        const packPatterns = loadDiscoveredPatternsForFrameworks(frameworkNames);
        allPatterns.push(...packPatterns);
        patternSources.frameworkPacks = packPatterns.length;
        mediumIds.push(...packPatterns.map((p) => p.id));
      }
    } catch (e) {
      warnings.push(`Framework pack loading failed: ${String(e)}`);
    }
  }
  if (!options.skipMiningModules) {
    const cache = options.cache ?? new MiningCache();
    const ownsCache = !options.cache;
    try {
      try {
        const i18nResult = await mineI18nKeys(projectRoot, cache);
        if (i18nResult.keys.length > 0) {
          const i18nPatterns = generateI18nPatterns(i18nResult);
          allPatterns.push(...i18nPatterns);
          patternSources.i18n = i18nPatterns.length;
          mediumIds.push(...i18nPatterns.map((p) => p.id));
        }
      } catch (e) {
        warnings.push(`i18n mining failed: ${String(e)}`);
      }
      try {
        const analyticsResult = await mineAnalyticsEvents(projectRoot, cache);
        if (analyticsResult.events.length > 0) {
          const analyticsPatterns = generateAnalyticsPatterns(analyticsResult);
          allPatterns.push(...analyticsPatterns);
          patternSources.analytics = analyticsPatterns.length;
          weakIds.push(...analyticsPatterns.map((p) => p.id));
        }
      } catch (e) {
        warnings.push(`Analytics mining failed: ${String(e)}`);
      }
      try {
        const ffResult = await mineFeatureFlags(projectRoot, cache);
        if (ffResult.flags.length > 0) {
          const ffPatterns = generateFeatureFlagPatterns(ffResult);
          allPatterns.push(...ffPatterns);
          patternSources.featureFlags = ffPatterns.length;
          weakIds.push(...ffPatterns.map((p) => p.id));
        }
      } catch (e) {
        warnings.push(`Feature flag mining failed: ${String(e)}`);
      }
    } finally {
      if (ownsCache) {
        cache.clear();
      }
    }
  }
  const signalStrengths = /* @__PURE__ */ new Map();
  for (const id of strongIds) {
    signalStrengths.set(id, "strong");
  }
  for (const id of mediumIds) {
    signalStrengths.set(id, "medium");
  }
  for (const id of weakIds) {
    signalStrengths.set(id, "weak");
  }
  const weightedPatterns = signalStrengths.size > 0 ? applySignalWeighting(allPatterns, signalStrengths) : allPatterns;
  const totalBeforeQC = weightedPatterns.length;
  let finalPatterns;
  let qcResult = null;
  try {
    const { patterns: validated, result } = applyAllQualityControls(weightedPatterns, {
      threshold
    });
    finalPatterns = validated;
    qcResult = result;
  } catch (e) {
    warnings.push(`Quality controls failed, using unvalidated patterns: ${String(e)}`);
    finalPatterns = weightedPatterns;
  }
  if (finalPatterns.length < SPEC_PATTERN_TARGET) {
    warnings.push(
      `Pattern count (${finalPatterns.length}) is below spec target (${SPEC_PATTERN_TARGET}). Consider adding framework packs or mining modules to increase coverage.`
    );
  }
  warnings.push(
    "Runtime validation of generated patterns against a live app is not yet implemented. Patterns are validated structurally only."
  );
  if (finalPatterns.length > maxPatterns) {
    finalPatterns.sort((a, b) => b.confidence - a.confidence);
    finalPatterns = finalPatterns.slice(0, maxPatterns);
    warnings.push(
      `Pattern count (${totalBeforeQC}) exceeded cap (${maxPatterns}), truncated to top ${maxPatterns} by confidence`
    );
  }
  const outputDir = options.outputDir ?? llkbDir;
  let patternsFile = null;
  if (profile) {
    try {
      const durationMs2 = Date.now() - startTime;
      patternsFile = createDiscoveredPatternsFile(finalPatterns, profile, durationMs2);
      saveDiscoveredPatterns(patternsFile, outputDir);
      saveDiscoveredProfile(profile, outputDir);
    } catch (e) {
      errors.push(`Persistence failed: ${String(e)}`);
    }
  }
  const durationMs = Date.now() - startTime;
  return {
    success: errors.length === 0,
    profile,
    patternsFile,
    stats: {
      durationMs,
      patternSources,
      totalBeforeQC,
      totalAfterQC: finalPatterns.length,
      qualityControls: qcResult,
      mining: miningStats
    },
    warnings,
    errors
  };
}

export { AUTH_PATTERN_TEMPLATES, CONFIDENCE_HISTORY_RETENTION_DAYS, CRUD_TEMPLATES, CURRENT_VERSION, DEFAULT_LLKB_ROOT, UI_LIBRARY_PATTERNS2 as DISCOVERY_UI_LIBRARY_PATTERNS, EXTENDED_NAVIGATION_TEMPLATES, FORM_TEMPLATES, FRAMEWORK_PATTERNS, IRREGULAR_PLURALS, IRREGULAR_SINGULARS, LOCK_MAX_WAIT_MS, LOCK_RETRY_INTERVAL_MS, MAX_CONFIDENCE_HISTORY_ENTRIES, MIN_SUPPORTED_VERSION, MODAL_TEMPLATES, MiningCache, NAVIGATION_PATTERN_TEMPLATES, NOTIFICATION_TEMPLATES, UI_LIBRARY_PATTERNS as PATTERN_UI_LIBRARY_PATTERNS, SELECTOR_PATTERNS, SOURCE_DIRECTORIES, STALE_LOCK_THRESHOLD_MS, TABLE_TEMPLATES, UNCOUNTABLE_NOUNS, addComponentToRegistry, analyzeSelectorSignals, appendToHistory, applyAllQualityControls, applyConfidenceThreshold, applySignalWeighting, boostCrossSourcePatterns, calculateConfidence, calculateSimilarity, checkMigrationNeeded, checkUpdates, cleanupOldHistoryFiles, combineResults, compareVersions as compareTestVersion, compareVersions as compareTestVersions, compareVersions2 as compareVersions, componentNameToTrigger, componentToGlossaryEntries, componentToModule, countJourneyExtractionsToday, countLines, countNewEntriesSince, countPredictiveExtractionsToday, countTodayEvents, createCacheFromFiles, createDiscoveredPatternsFile, createEmptyAnalytics, createEmptyRegistry, createEntity, createForm, createModal, createRoute, createTable, daysBetween, deduplicatePatterns2 as deduplicatePatterns, deduplicatePatterns as deduplicatePatternsQC, detectDecliningConfidence, detectDuplicatesAcrossFiles, detectDuplicatesInFile, detectFrameworks, detectUiLibraries, ensureDir, exportForAutogen, exportLLKB, exportToFile, extractAuthHints, extractKeywords, extractLlkbEntriesFromTest, extractLlkbVersionFromTest, extractStepKeywords, extractLlkbVersionFromTest as extractVersionFromTest, fail, findComponents, findExtractionCandidates, findLessonsByPattern, findModulesByCategory, findNearDuplicates, findSimilarPatterns, findUnusedComponentOpportunities, formatCheckUpdatesResult, formatVersionComparison as formatComparison, formatContextForPrompt, formatDate, formatExportResult, formatExportResultForConsole, formatHealthCheck, formatLearnResult, formatLearningResult, formatPruneResult, formatStats, formatUpdateCheckResult, formatUpdateTestResult, formatUpdateTestsResult, formatVersionComparison, generateAllPatterns, generateAnalyticsPatterns, generateCrudPatterns, generateNavigationPatterns2 as generateExtendedNavigationPatterns, generateFeatureFlagPatterns, generateFormPatterns, generateI18nPatterns, generateModalPatterns, generateNameVariations, generateNotificationPatterns, generatePatterns, generateReport, generateTablePatterns, getAllCategories, getAnalyticsSummary, getComponentCategories, getComponentsForJourney, getConfidenceTrend, getCurrentLlkbVersion, getHistoryDir, getHistoryFilePath, getHistoryFilesInRange, getImportPath, getLessonsForJourney, getCurrentLlkbVersion as getLlkbVersion, getModuleForComponent, getPackRegistry, getRelevantContext, getRelevantScopes, getSingularPlural, getStats, hashCode, inferCategory, inferCategoryWithConfidence, initializeLLKB, isComponentCategory, isDailyRateLimitReached, isFail, isJourneyRateLimitReached, isLLKBEnabled, isNearDuplicate, isOk, isUncountable, isVersionSupported, jaccardSimilarity, lessonToGlossaryEntries, lessonToPattern, lessonToSelectorOverride, lessonToTimingHint, lineCountSimilarity, listModules, llkbExists, loadAppProfile, loadComponents, loadDiscoveredPatterns, loadDiscoveredPatternsForFrameworks, loadDiscoveredProfile, loadJSON, loadLLKBConfig, loadLLKBData, loadLessons, loadPacksForFrameworks, loadPatterns, loadRegistry, mapResult, matchStepsToComponents, mergeDiscoveredPatterns, migrateLLKB, mineAnalyticsEvents, mineElements, mineEntities, mineFeatureFlags, mineForms, mineI18nKeys, mineModals, mineRoutes, mineTables, needsConfidenceReview, needsMigration, normalizeCode, ok, packPatternsToDiscovered, parseAdapterArgs, parseVersion, pluralize, prune, pruneUnusedPatterns, readHistoryFile, readTodayHistory, recordBatch, recordComponentUsed, recordLearning, recordLessonApplied, recordPatternLearned, removeComponentFromRegistry, resetPatternIdCounter, runAdapterCLI, runCheckUpdates, runDiscovery, runExportForAutogen, runFullDiscoveryPipeline, runHealthCheck, runLearnCommand, runMiningPipeline, runUpdateTest, runUpdateTests, saveAppProfile, saveDiscoveredPatterns, saveDiscoveredProfile, saveJSONAtomic, saveJSONAtomicSync, saveRegistry, scanAllSourceDirectories, scanDirectory, search, shouldExtractAsComponent, singularize, syncRegistryWithComponents, tokenize, triggerToRegex, tryCatch, updateAnalytics, updateAnalyticsWithData, updateComponentInRegistry, updateConfidenceHistory, updateJSONWithLock, updateJSONWithLockSync, updateTestLlkbVersion, updateTestSafe, updateTestLlkbVersion as updateVersionInTest, validateLLKBInstallation, validateRegistryConsistency };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map