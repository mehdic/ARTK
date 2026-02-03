import { readFileSync, existsSync, writeFileSync } from 'fs';
import { basename, dirname, relative, join } from 'path';
import ejs from 'ejs';
import { parse, stringify } from 'yaml';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';
import { Project, ModuleKind, ScriptTarget, SyntaxKind } from 'ts-morph';

var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// src/selectors/priority.ts
function toPlaywrightLocator(locator) {
  switch (locator.strategy) {
    case "role": {
      const opts = [];
      if (locator.options?.name) {
        opts.push(`name: '${escapeString(locator.options.name)}'`);
      }
      if (locator.options?.exact) {
        opts.push("exact: true");
      }
      if (locator.options?.level) {
        opts.push(`level: ${locator.options.level}`);
      }
      const optsStr = opts.length > 0 ? `, { ${opts.join(", ")} }` : "";
      return `getByRole('${locator.value}'${optsStr})`;
    }
    case "label": {
      const exact = locator.options?.exact ? ", { exact: true }" : "";
      return `getByLabel('${escapeString(locator.value)}'${exact})`;
    }
    case "placeholder": {
      const exact = locator.options?.exact ? ", { exact: true }" : "";
      return `getByPlaceholder('${escapeString(locator.value)}'${exact})`;
    }
    case "text": {
      const exact = locator.options?.exact ? ", { exact: true }" : "";
      return `getByText('${escapeString(locator.value)}'${exact})`;
    }
    case "testid":
      return `getByTestId('${escapeString(locator.value)}')`;
    case "css":
      return `locator('${escapeString(locator.value)}')`;
    default:
      return `locator('${escapeString(locator.value)}')`;
  }
}
function escapeString(str) {
  return str.replace(/'/g, "\\'").replace(/\n/g, "\\n");
}

// src/codegen/blocks.ts
var BLOCK_START = "// ARTK:BEGIN GENERATED";
var BLOCK_END = "// ARTK:END GENERATED";
var BLOCK_ID_PATTERN = /ARTK:BEGIN GENERATED(?:\s+id=([a-zA-Z0-9_-]+))?/;
function extractManagedBlocks(code) {
  const lines = code.split("\n");
  const blocks = [];
  const preservedCode = [];
  const warnings = [];
  let inBlock = false;
  let currentBlock = null;
  let blockContent = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes(BLOCK_START)) {
      if (inBlock) {
        warnings.push({
          type: "nested",
          line: i + 1,
          message: `Nested managed block detected at line ${i + 1}. Previous block starting at line ${(currentBlock?.startLine ?? 0) + 1} will be closed.`
        });
        if (currentBlock) {
          blocks.push({
            ...currentBlock,
            endLine: i - 1,
            content: blockContent.join("\n")
          });
        }
      }
      inBlock = true;
      const match = line.match(BLOCK_ID_PATTERN);
      currentBlock = {
        id: match?.[1],
        startLine: i
      };
      blockContent = [];
      continue;
    }
    if (line.includes(BLOCK_END) && inBlock) {
      inBlock = false;
      if (currentBlock) {
        blocks.push({
          ...currentBlock,
          endLine: i,
          content: blockContent.join("\n")
        });
      }
      currentBlock = null;
      blockContent = [];
      continue;
    }
    if (inBlock) {
      blockContent.push(line);
    } else {
      preservedCode.push(line);
    }
  }
  if (inBlock && currentBlock) {
    warnings.push({
      type: "unclosed",
      line: (currentBlock.startLine ?? 0) + 1,
      message: `Unclosed managed block starting at line ${(currentBlock.startLine ?? 0) + 1} - block will be ignored`
    });
  }
  return {
    blocks,
    preservedCode,
    hasBlocks: blocks.length > 0,
    warnings
  };
}
function wrapInBlock(content, id) {
  const startMarker = id ? `${BLOCK_START} id=${id}` : BLOCK_START;
  return `${startMarker}
${content}
${BLOCK_END}`;
}
function injectManagedBlocks(options) {
  const { existingCode, newBlocks } = options;
  if (!existingCode.trim()) {
    return newBlocks.map((block) => wrapInBlock(block.content, block.id)).join("\n\n");
  }
  const { preservedCode, hasBlocks } = extractManagedBlocks(existingCode);
  if (!hasBlocks) {
    const preserved = preservedCode.join("\n").trim();
    const newContent = newBlocks.map((block) => wrapInBlock(block.content, block.id)).join("\n\n");
    return preserved ? `${preserved}

${newContent}` : newContent;
  }
  const result = [];
  const processedIds = /* @__PURE__ */ new Set();
  let idLessBlockIndex = 0;
  const idLessNewBlocks = newBlocks.filter((b) => !b.id);
  const processedIdLessIndices = /* @__PURE__ */ new Set();
  const lines = existingCode.split("\n");
  let inBlock = false;
  let currentBlockId;
  let skipUntilEnd = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes(BLOCK_START)) {
      inBlock = true;
      const match = line.match(BLOCK_ID_PATTERN);
      currentBlockId = match?.[1];
      let replacement;
      if (currentBlockId) {
        replacement = newBlocks.find((b) => b.id === currentBlockId);
        if (replacement) {
          processedIds.add(currentBlockId);
        }
      } else {
        if (idLessBlockIndex < idLessNewBlocks.length) {
          replacement = idLessNewBlocks[idLessBlockIndex];
          processedIdLessIndices.add(idLessBlockIndex);
        }
        idLessBlockIndex++;
      }
      if (replacement) {
        result.push(wrapInBlock(replacement.content, replacement.id));
        skipUntilEnd = true;
      } else {
        result.push(line);
        skipUntilEnd = false;
      }
      continue;
    }
    if (line.includes(BLOCK_END) && inBlock) {
      inBlock = false;
      if (!skipUntilEnd) {
        result.push(line);
      }
      currentBlockId = void 0;
      skipUntilEnd = false;
      continue;
    }
    if (!inBlock) {
      result.push(line);
    } else if (!skipUntilEnd) {
      result.push(line);
    }
  }
  for (let i = 0; i < newBlocks.length; i++) {
    const block = newBlocks[i];
    if (block.id) {
      if (!processedIds.has(block.id)) {
        result.push("");
        result.push(wrapInBlock(block.content, block.id));
      }
    } else {
      const idLessIndex = idLessNewBlocks.indexOf(block);
      if (!processedIdLessIndices.has(idLessIndex)) {
        result.push("");
        result.push(wrapInBlock(block.content, block.id));
      }
    }
  }
  return result.join("\n");
}
function splitJourneyContent(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    throw new Error(
      "Invalid Journey format: missing frontmatter delimiters (content should be wrapped in --- ... ---)"
    );
  }
  return {
    frontmatter: match[1],
    body: match[2]
  };
}
function calculateContentHash(content) {
  return createHash("sha256").update(content).digest("hex").substring(0, 8);
}
function updateJourneyFrontmatter(options) {
  const {
    journeyPath,
    testPath,
    testContent,
    modules = { foundation: [], features: [] }
  } = options;
  const content = readFileSync(journeyPath, "utf-8");
  const { frontmatter, body } = splitJourneyContent(content);
  const parsed = parse(frontmatter);
  const previousTests = Array.isArray(parsed.tests) ? parsed.tests.map(
    (t) => typeof t === "string" ? { path: t, generated: "", hash: "" } : { ...t }
  ) : [];
  const hash = calculateContentHash(testContent);
  const testEntry = {
    path: testPath,
    generated: (/* @__PURE__ */ new Date()).toISOString(),
    hash
  };
  if (!Array.isArray(parsed.tests)) {
    parsed.tests = [];
  }
  const existingIndex = parsed.tests.findIndex(
    (t) => typeof t === "string" ? t === testPath : t.path === testPath
  );
  if (existingIndex >= 0) {
    parsed.tests[existingIndex] = testEntry;
  } else {
    parsed.tests.push(testEntry);
  }
  const modulesAdded = {
    foundation: [],
    features: []
  };
  if (!parsed.modules || typeof parsed.modules !== "object") {
    parsed.modules = { foundation: [], features: [] };
  }
  const parsedModules = parsed.modules;
  if (!Array.isArray(parsedModules.foundation)) {
    parsedModules.foundation = [];
  }
  if (!Array.isArray(parsedModules.features)) {
    parsedModules.features = [];
  }
  if (modules.foundation) {
    const existingFoundation = new Set(parsedModules.foundation);
    for (const mod of modules.foundation) {
      if (!existingFoundation.has(mod)) {
        modulesAdded.foundation.push(mod);
        parsedModules.foundation.push(mod);
      }
    }
    parsedModules.foundation.sort();
  }
  if (modules.features) {
    const existingFeatures = new Set(parsedModules.features);
    for (const mod of modules.features) {
      if (!existingFeatures.has(mod)) {
        modulesAdded.features.push(mod);
        parsedModules.features.push(mod);
      }
    }
    parsedModules.features.sort();
  }
  const newFrontmatter = stringify(parsed, {
    lineWidth: 0,
    // Prevent line wrapping
    defaultKeyType: "PLAIN",
    defaultStringType: "QUOTE_DOUBLE"
  });
  const newContent = `---
${newFrontmatter}---
${body}`;
  writeFileSync(journeyPath, newContent, "utf-8");
  return {
    success: true,
    previousTests,
    updatedTests: parsed.tests,
    modulesAdded
  };
}

// src/utils/escaping.ts
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\\/]/g, "\\$&");
}
var cachedPackageRoot;
var cachedModuleDir;
function getModuleDir() {
  if (cachedModuleDir) {
    return cachedModuleDir;
  }
  if (typeof __dirname === "string" && __dirname.length > 0) {
    cachedModuleDir = __dirname;
    return cachedModuleDir;
  }
  try {
    const metaUrl = import.meta.url;
    if (metaUrl) {
      cachedModuleDir = dirname(fileURLToPath(metaUrl));
      return cachedModuleDir;
    }
  } catch {
  }
  try {
    if (typeof __require !== "undefined" && __require?.resolve) {
      const resolved = __require.resolve("@artk/core-autogen/package.json");
      cachedModuleDir = dirname(resolved);
      return cachedModuleDir;
    }
  } catch {
  }
  cachedModuleDir = process.cwd();
  return cachedModuleDir;
}
function getPackageRoot() {
  if (cachedPackageRoot) {
    return cachedPackageRoot;
  }
  const envRoot = process.env["ARTK_AUTOGEN_ROOT"];
  if (envRoot && existsSync(join(envRoot, "package.json"))) {
    cachedPackageRoot = envRoot;
    return cachedPackageRoot;
  }
  const moduleDir = getModuleDir();
  const possibleRoots = [
    join(moduleDir, "..", ".."),
    // from dist/utils/ or dist-cjs/utils/
    join(moduleDir, ".."),
    // from dist/ directly
    moduleDir
    // if already at root
  ];
  for (const root of possibleRoots) {
    const pkgPath = join(root, "package.json");
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
        if (pkg.name === "@artk/core-autogen") {
          cachedPackageRoot = root;
          return cachedPackageRoot;
        }
      } catch {
      }
    }
  }
  const cwdPaths = [
    join(process.cwd(), "node_modules", "@artk", "core-autogen"),
    join(process.cwd(), "artk-e2e", "vendor", "artk-core-autogen"),
    process.cwd()
  ];
  for (const searchPath of cwdPaths) {
    const pkgPath = join(searchPath, "package.json");
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
        if (pkg.name === "@artk/core-autogen") {
          cachedPackageRoot = searchPath;
          return cachedPackageRoot;
        }
      } catch {
      }
    }
  }
  cachedPackageRoot = join(moduleDir, "..", "..");
  return cachedPackageRoot;
}
function getTemplatesDir() {
  const root = getPackageRoot();
  const moduleDir = getModuleDir();
  const relativeToModule = join(moduleDir, "..", "codegen", "templates");
  if (existsSync(relativeToModule)) {
    return relativeToModule;
  }
  const possiblePaths = [
    join(root, "dist", "codegen", "templates"),
    join(root, "dist-cjs", "codegen", "templates"),
    join(root, "dist-legacy-16", "codegen", "templates"),
    join(root, "dist-legacy-14", "codegen", "templates")
  ];
  for (const templatesPath of possiblePaths) {
    if (existsSync(templatesPath)) {
      return templatesPath;
    }
  }
  return possiblePaths[0] ?? join(root, "dist", "codegen", "templates");
}
function getTemplatePath(templateName) {
  return join(getTemplatesDir(), templateName);
}

// src/utils/version.ts
var cachedVersion;
function getPackageVersion() {
  if (cachedVersion) {
    return cachedVersion;
  }
  try {
    if (typeof __ARTK_VERSION__ !== "undefined" && __ARTK_VERSION__) {
      cachedVersion = __ARTK_VERSION__;
      return cachedVersion;
    }
  } catch {
  }
  const envVersion = process.env["ARTK_VERSION"];
  if (envVersion) {
    cachedVersion = envVersion;
    return cachedVersion;
  }
  try {
    const packageRoot = getPackageRoot();
    const pkgPath = join(packageRoot, "package.json");
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      if (pkg.version) {
        cachedVersion = pkg.version;
        return cachedVersion;
      }
    }
  } catch {
  }
  cachedVersion = "unknown";
  return cachedVersion;
}
function getGeneratedTimestamp() {
  return (/* @__PURE__ */ new Date()).toISOString();
}

// src/variants/index.ts
function detectVariant() {
  const nodeVersionStr = process.version.slice(1);
  const nodeVersion = parseInt(nodeVersionStr.split(".")[0] ?? "18", 10);
  const isESM = typeof import.meta !== "undefined";
  if (nodeVersion >= 18) {
    return {
      id: isESM ? "modern-esm" : "modern-cjs",
      nodeVersion,
      moduleSystem: isESM ? "esm" : "cjs",
      playwrightVersion: "1.57.x",
      features: {
        ariaSnapshots: true,
        clockApi: true,
        topLevelAwait: true,
        promiseAny: true
      }
    };
  } else if (nodeVersion >= 16) {
    return {
      id: "legacy-16",
      nodeVersion,
      moduleSystem: "cjs",
      playwrightVersion: "1.49.x",
      features: {
        ariaSnapshots: true,
        clockApi: true,
        topLevelAwait: true,
        promiseAny: true
      }
    };
  } else {
    return {
      id: "legacy-14",
      nodeVersion,
      moduleSystem: "cjs",
      playwrightVersion: "1.33.x",
      features: {
        ariaSnapshots: false,
        clockApi: false,
        topLevelAwait: false,
        promiseAny: false
      }
    };
  }
}

// src/codegen/generateTest.ts
function _checkFeature(ctx, feature, featureName, primitiveType) {
  const available = ctx.variant.features[feature];
  if (!available && ctx.warnOnIncompatible) {
    ctx.warnings.push(
      `Primitive '${primitiveType}' uses ${featureName} which requires ${getFeatureRequirement(feature)}. Current variant: ${ctx.variant.id} (Playwright ${ctx.variant.playwrightVersion})`
    );
  }
  return available;
}
var __test_checkFeature = _checkFeature;
function getFeatureRequirement(feature) {
  switch (feature) {
    case "ariaSnapshots":
      return "Playwright 1.49+ (Node 16+)";
    case "clockApi":
      return "Playwright 1.45+ (Node 18+)";
    case "topLevelAwait":
      return "Node 14.8+ with ESM";
    case "promiseAny":
      return "Node 15+ or polyfill";
    default:
      return "unknown version";
  }
}
function escapeString2(str) {
  return str.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "\\r");
}
function renderValue(value) {
  switch (value.type) {
    case "literal":
      return `'${escapeString2(value.value)}'`;
    case "actor":
      return `actor.${value.value}`;
    case "runId":
      return "runId";
    case "generated":
      return `\`${value.value}\``;
    case "testData":
      return `testData.${value.value}`;
    default:
      return `'${escapeString2(value.value)}'`;
  }
}
function renderPrimitive(primitive, indent = "", _ctx) {
  switch (primitive.type) {
    // Navigation
    case "goto":
      return `${indent}await page.goto('${escapeString2(primitive.url)}');`;
    case "waitForURL":
      const urlPattern = typeof primitive.pattern === "string" ? `/${escapeRegex(primitive.pattern)}/` : primitive.pattern.toString();
      return `${indent}await page.waitForURL(${urlPattern});`;
    case "waitForResponse":
      return `${indent}await page.waitForResponse(resp => resp.url().includes('${escapeString2(primitive.urlPattern)}'));`;
    case "waitForLoadingComplete":
      return `${indent}await page.waitForLoadState('networkidle');`;
    case "reload":
      return `${indent}await page.reload();`;
    case "goBack":
      return `${indent}await page.goBack();`;
    case "goForward":
      return `${indent}await page.goForward();`;
    // Wait primitives
    case "waitForVisible":
      const waitVisibleTimeout = primitive.timeout ? `, timeout: ${primitive.timeout}` : "";
      return `${indent}await page.${toPlaywrightLocator(primitive.locator)}.waitFor({ state: 'visible'${waitVisibleTimeout} });`;
    case "waitForHidden":
      const waitHiddenTimeout = primitive.timeout ? `, timeout: ${primitive.timeout}` : "";
      return `${indent}await page.${toPlaywrightLocator(primitive.locator)}.waitFor({ state: 'hidden'${waitHiddenTimeout} });`;
    case "waitForTimeout":
      return `${indent}await page.waitForTimeout(${primitive.ms});`;
    case "waitForNetworkIdle":
      const networkIdleOptions = primitive.timeout ? `, { timeout: ${primitive.timeout} }` : "";
      return `${indent}await page.waitForLoadState('networkidle'${networkIdleOptions});`;
    // Interactions
    case "click":
      return `${indent}await page.${toPlaywrightLocator(primitive.locator)}.click();`;
    case "dblclick":
      return `${indent}await page.${toPlaywrightLocator(primitive.locator)}.dblclick();`;
    case "rightClick":
      return `${indent}await page.${toPlaywrightLocator(primitive.locator)}.click({ button: 'right' });`;
    case "fill":
      return `${indent}await page.${toPlaywrightLocator(primitive.locator)}.fill(${renderValue(primitive.value)});`;
    case "select":
      return `${indent}await page.${toPlaywrightLocator(primitive.locator)}.selectOption('${escapeString2(primitive.option)}');`;
    case "check":
      return `${indent}await page.${toPlaywrightLocator(primitive.locator)}.check();`;
    case "uncheck":
      return `${indent}await page.${toPlaywrightLocator(primitive.locator)}.uncheck();`;
    case "press":
      if (primitive.locator) {
        return `${indent}await page.${toPlaywrightLocator(primitive.locator)}.press('${primitive.key}');`;
      }
      return `${indent}await page.keyboard.press('${primitive.key}');`;
    case "hover":
      return `${indent}await page.${toPlaywrightLocator(primitive.locator)}.hover();`;
    case "focus":
      return `${indent}await page.${toPlaywrightLocator(primitive.locator)}.focus();`;
    case "clear":
      return `${indent}await page.${toPlaywrightLocator(primitive.locator)}.clear();`;
    case "upload":
      return `${indent}await page.${toPlaywrightLocator(primitive.locator)}.setInputFiles([${primitive.files.map((f) => `'${escapeString2(f)}'`).join(", ")}]);`;
    // Assertions
    case "expectVisible":
      const visibleOptions = primitive.timeout ? `{ timeout: ${primitive.timeout} }` : "";
      return `${indent}await expect(page.${toPlaywrightLocator(primitive.locator)}).toBeVisible(${visibleOptions});`;
    case "expectNotVisible":
      return `${indent}await expect(page.${toPlaywrightLocator(primitive.locator)}).not.toBeVisible();`;
    case "expectHidden":
      return `${indent}await expect(page.${toPlaywrightLocator(primitive.locator)}).toBeHidden();`;
    case "expectText":
      const textPattern = typeof primitive.text === "string" ? `'${escapeString2(primitive.text)}'` : primitive.text.toString();
      return `${indent}await expect(page.${toPlaywrightLocator(primitive.locator)}).toHaveText(${textPattern});`;
    case "expectValue":
      return `${indent}await expect(page.${toPlaywrightLocator(primitive.locator)}).toHaveValue('${escapeString2(primitive.value)}');`;
    case "expectChecked":
      if (primitive.checked === false) {
        return `${indent}await expect(page.${toPlaywrightLocator(primitive.locator)}).not.toBeChecked();`;
      }
      return `${indent}await expect(page.${toPlaywrightLocator(primitive.locator)}).toBeChecked();`;
    case "expectEnabled":
      return `${indent}await expect(page.${toPlaywrightLocator(primitive.locator)}).toBeEnabled();`;
    case "expectDisabled":
      return `${indent}await expect(page.${toPlaywrightLocator(primitive.locator)}).toBeDisabled();`;
    case "expectURL":
      const urlExpectPattern = typeof primitive.pattern === "string" ? `/${escapeRegex(primitive.pattern)}/` : primitive.pattern.toString();
      return `${indent}await expect(page).toHaveURL(${urlExpectPattern});`;
    case "expectTitle":
      const titlePattern = typeof primitive.title === "string" ? `'${escapeString2(primitive.title)}'` : primitive.title.toString();
      return `${indent}await expect(page).toHaveTitle(${titlePattern});`;
    case "expectCount":
      return `${indent}await expect(page.${toPlaywrightLocator(primitive.locator)}).toHaveCount(${primitive.count});`;
    case "expectContainsText":
      return `${indent}await expect(page.${toPlaywrightLocator(primitive.locator)}).toContainText('${escapeString2(primitive.text)}');`;
    // Signals
    case "expectToast":
      const toastSelector = primitive.message ? `getByText('${escapeString2(primitive.message)}')` : `getByRole('alert')`;
      return `${indent}await expect(page.${toastSelector}).toBeVisible();`;
    case "dismissModal":
      return `${indent}await page.getByRole('dialog').getByRole('button', { name: /close|cancel|dismiss/i }).click();`;
    case "acceptAlert":
      return `${indent}page.on('dialog', dialog => dialog.accept());`;
    case "dismissAlert":
      return `${indent}page.on('dialog', dialog => dialog.dismiss());`;
    // Module calls - use factory function to create instance
    case "callModule":
      const factoryName = `create${primitive.module}`;
      const args = primitive.args ? primitive.args.map((a) => JSON.stringify(a)).join(", ") : "";
      return `${indent}await ${factoryName}(page).${primitive.method}(${args});`;
    // Blocked - must throw to fail the test
    case "blocked":
      return `${indent}// ARTK BLOCKED: ${primitive.reason}
${indent}// Source: ${escapeString2(primitive.sourceText)}
${indent}throw new Error('ARTK BLOCKED: ${escapeString2(primitive.reason)}');`;
    default:
      return `${indent}// Unknown primitive type: ${primitive.type}`;
  }
}
function createVariantAwareRenderer(ctx) {
  return (primitive, indent = "") => renderPrimitive(primitive, indent);
}
function loadDefaultTemplate() {
  const templatePath = getTemplatePath("test.ejs");
  return readFileSync(templatePath, "utf-8");
}
function collectImports(journey) {
  const imports = [];
  const usedModules = /* @__PURE__ */ new Set();
  for (const step of journey.steps) {
    for (const action of step.actions) {
      if (action.type === "callModule") {
        usedModules.add(action.module);
      }
    }
  }
  for (const module of usedModules) {
    const modulePath = module.charAt(0).toLowerCase() + module.slice(1);
    const factoryName = `create${module}`;
    imports.push({
      members: [factoryName],
      from: `@modules/${modulePath}`
    });
  }
  return imports;
}
function getLlkbInfo(llkbRoot) {
  const analyticsPath = join(llkbRoot, "analytics.json");
  if (!existsSync(analyticsPath)) {
    return { llkbVersion: null, llkbEntries: null };
  }
  try {
    const content = readFileSync(analyticsPath, "utf-8");
    const analytics = JSON.parse(content);
    const llkbVersion = analytics.lastUpdated || (/* @__PURE__ */ new Date()).toISOString();
    const totalLessons = analytics.overview?.totalLessons || 0;
    const totalComponents = analytics.overview?.totalComponents || 0;
    const llkbEntries = totalLessons + totalComponents;
    return { llkbVersion, llkbEntries };
  } catch {
    return { llkbVersion: null, llkbEntries: null };
  }
}
function generateTest(journey, options = {}) {
  const {
    templatePath,
    imports: additionalImports = [],
    strategy = "full",
    existingCode,
    llkbRoot = ".artk/llkb",
    includeLlkbVersion = true,
    targetVariant,
    warnOnIncompatible = true
  } = options;
  const variant = targetVariant || detectVariant();
  const variantCtx = {
    warnings: []};
  const template = templatePath ? readFileSync(templatePath, "utf-8") : loadDefaultTemplate();
  const imports = [...collectImports(journey), ...additionalImports];
  let llkbVersion = null;
  let llkbEntries = null;
  if (includeLlkbVersion) {
    const llkbInfo = getLlkbInfo(llkbRoot);
    llkbVersion = llkbInfo.llkbVersion;
    llkbEntries = llkbInfo.llkbEntries;
  }
  const variantAwareRenderPrimitive = createVariantAwareRenderer();
  let code = ejs.render(template, {
    journey,
    imports,
    renderPrimitive: variantAwareRenderPrimitive,
    escapeString: escapeString2,
    escapeRegex,
    version: getPackageVersion(),
    timestamp: getGeneratedTimestamp(),
    llkbVersion,
    llkbEntries,
    variant: variant.id,
    playwrightVersion: variant.playwrightVersion
  });
  if (strategy === "blocks" && existingCode) {
    const testBlock = {
      id: `test-${journey.id}`,
      content: code.trim()
    };
    code = injectManagedBlocks({
      existingCode,
      newBlocks: [testBlock]
    });
  } else if (strategy === "ast" && existingCode) {
    console.warn("AST strategy not yet implemented for blocks integration, using full generation");
  }
  const filename = `${journey.id.toLowerCase()}.spec.ts`;
  if (options.updateJourney && options.journeyPath) {
    try {
      const testPath = options.outputPath || filename;
      const modules = {
        foundation: journey.moduleDependencies?.foundation || [],
        features: journey.moduleDependencies?.feature || []
        // Note: IR uses 'feature' (singular)
      };
      updateJourneyFrontmatter({
        journeyPath: options.journeyPath,
        testPath,
        testContent: code,
        modules
      });
    } catch (error) {
      console.error(
        `Warning: Failed to update journey frontmatter: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  return {
    code,
    journeyId: journey.id,
    filename,
    imports,
    variant,
    variantWarnings: variantCtx.warnings.length > 0 ? variantCtx.warnings : void 0
  };
}
function generateTestCode(journey) {
  return generateTest(journey).code;
}
function toPascalCase(str) {
  return str.split(/[-_\s]+/).map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join("");
}
function toCamelCase(str) {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}
function generateLocatorName(spec, existingNames) {
  let baseName;
  switch (spec.strategy) {
    case "role":
      baseName = spec.options?.name ? `${toCamelCase(spec.options.name)}${toPascalCase(spec.value)}` : `${toCamelCase(spec.value)}Element`;
      break;
    case "label":
    case "placeholder":
    case "text":
      baseName = `${toCamelCase(spec.value)}Field`;
      break;
    case "testid":
      baseName = toCamelCase(spec.value);
      break;
    case "css":
      const match = spec.value.match(/[#.]?([a-zA-Z][a-zA-Z0-9_-]*)/);
      baseName = match ? toCamelCase(match[1]) : "element";
      break;
    default:
      baseName = "element";
  }
  let name = baseName;
  let counter = 1;
  while (existingNames.has(name)) {
    name = `${baseName}${counter}`;
    counter++;
  }
  existingNames.add(name);
  return name;
}
function extractLocators(journey) {
  const locators = [];
  const existingNames = /* @__PURE__ */ new Set();
  const seenSpecs = /* @__PURE__ */ new Map();
  const processPrimitive = (primitive) => {
    const locatorSpec = primitive.locator;
    if (!locatorSpec) return;
    const specKey = JSON.stringify(locatorSpec);
    if (seenSpecs.has(specKey)) return;
    const name = generateLocatorName(locatorSpec, existingNames);
    const playwrightLocator = toPlaywrightLocator(locatorSpec);
    const locator = {
      name,
      playwright: playwrightLocator,
      spec: locatorSpec,
      description: `Locator for ${locatorSpec.strategy}: ${locatorSpec.value}`
    };
    locators.push(locator);
    seenSpecs.set(specKey, locator);
  };
  if (journey.setup) {
    for (const primitive of journey.setup) {
      processPrimitive(primitive);
    }
  }
  for (const step of journey.steps) {
    for (const action of step.actions) {
      processPrimitive(action);
    }
    for (const assertion of step.assertions) {
      processPrimitive(assertion);
    }
  }
  if (journey.cleanup) {
    for (const primitive of journey.cleanup) {
      processPrimitive(primitive);
    }
  }
  return locators;
}
function generateMethods(journey, locators) {
  const methods = [];
  const locatorMap = /* @__PURE__ */ new Map();
  for (const locator of locators) {
    const specKey = JSON.stringify(locator.spec);
    locatorMap.set(specKey, locator.name);
  }
  const getLocatorRef = (spec) => {
    const specKey = JSON.stringify(spec);
    const locatorName = locatorMap.get(specKey);
    return locatorName ? `this.${locatorName}` : `this.page.${toPlaywrightLocator(spec)}`;
  };
  for (const step of journey.steps) {
    const methodName = toCamelCase(step.id.replace(/[^a-zA-Z0-9]/g, "_"));
    const body = [];
    for (const action of step.actions) {
      const line = primitiveToMethodLine(action, getLocatorRef);
      if (line) {
        body.push(line);
      }
    }
    for (const assertion of step.assertions) {
      const line = primitiveToMethodLine(assertion, getLocatorRef);
      if (line) {
        body.push(line);
      }
    }
    if (body.length > 0) {
      methods.push({
        name: methodName,
        description: step.description,
        params: [],
        returnType: "void",
        body
      });
    }
  }
  return methods;
}
function primitiveToMethodLine(primitive, getLocatorRef) {
  switch (primitive.type) {
    // Navigation
    case "goto":
      return `await this.page.goto('${escapeString3(primitive.url)}');`;
    case "waitForURL":
      const urlPattern = typeof primitive.pattern === "string" ? `'${escapeString3(primitive.pattern)}'` : primitive.pattern.toString();
      return `await this.page.waitForURL(${urlPattern});`;
    case "waitForLoadingComplete":
      return `await this.page.waitForLoadState('networkidle');`;
    // Interactions
    case "click":
      return `await ${getLocatorRef(primitive.locator)}.click();`;
    case "fill":
      const value = primitive.value.type === "literal" ? `'${escapeString3(primitive.value.value)}'` : primitive.value.value;
      return `await ${getLocatorRef(primitive.locator)}.fill(${value});`;
    case "select":
      return `await ${getLocatorRef(primitive.locator)}.selectOption('${escapeString3(primitive.option)}');`;
    case "check":
      return `await ${getLocatorRef(primitive.locator)}.check();`;
    case "uncheck":
      return `await ${getLocatorRef(primitive.locator)}.uncheck();`;
    case "press":
      if (primitive.locator) {
        return `await ${getLocatorRef(primitive.locator)}.press('${primitive.key}');`;
      }
      return `await this.page.keyboard.press('${primitive.key}');`;
    case "hover":
      return `await ${getLocatorRef(primitive.locator)}.hover();`;
    case "focus":
      return `await ${getLocatorRef(primitive.locator)}.focus();`;
    case "clear":
      return `await ${getLocatorRef(primitive.locator)}.clear();`;
    // Assertions (using expect)
    case "expectVisible":
      return `await expect(${getLocatorRef(primitive.locator)}).toBeVisible();`;
    case "expectNotVisible":
      return `await expect(${getLocatorRef(primitive.locator)}).not.toBeVisible();`;
    case "expectText":
      const textPattern = typeof primitive.text === "string" ? `'${escapeString3(primitive.text)}'` : primitive.text.toString();
      return `await expect(${getLocatorRef(primitive.locator)}).toHaveText(${textPattern});`;
    case "expectValue":
      return `await expect(${getLocatorRef(primitive.locator)}).toHaveValue('${escapeString3(primitive.value)}');`;
    case "expectEnabled":
      return `await expect(${getLocatorRef(primitive.locator)}).toBeEnabled();`;
    case "expectDisabled":
      return `await expect(${getLocatorRef(primitive.locator)}).toBeDisabled();`;
    // Blocked - must throw to fail the test
    case "blocked":
      return `// ARTK BLOCKED: ${primitive.reason}
    throw new Error('ARTK BLOCKED: ${primitive.reason}');`;
    default:
      return null;
  }
}
function escapeString3(str) {
  return str.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "\\r");
}
function loadDefaultTemplate2() {
  const templatePath = getTemplatePath("module.ejs");
  return readFileSync(templatePath, "utf-8");
}
function generateModule(journey, options = {}) {
  const { templatePath, suffix = "Page" } = options;
  const template = templatePath ? readFileSync(templatePath, "utf-8") : loadDefaultTemplate2();
  const moduleName = toPascalCase(journey.scope);
  const className = `${moduleName}${suffix}`;
  const locators = extractLocators(journey);
  const methods = generateMethods(journey, locators);
  const moduleDef = {
    moduleName,
    className,
    scope: journey.scope,
    locators,
    methods
  };
  const code = ejs.render(template, {
    ...moduleDef,
    version: getPackageVersion(),
    timestamp: getGeneratedTimestamp()
  });
  const filename = `${journey.scope.toLowerCase()}.page.ts`;
  return {
    code,
    moduleName,
    filename,
    locators,
    methods
  };
}
function generateModuleCode(journey) {
  return generateModule(journey).code;
}
function extractModuleDefinition(journey, options = {}) {
  const { suffix = "Page" } = options;
  const moduleName = toPascalCase(journey.scope);
  const className = `${moduleName}${suffix}`;
  const locators = extractLocators(journey);
  const methods = generateMethods(journey, locators);
  return {
    moduleName,
    className,
    scope: journey.scope,
    locators,
    methods
  };
}
function createProject() {
  return new Project({
    useInMemoryFileSystem: true,
    compilerOptions: {
      target: ScriptTarget.ESNext,
      module: ModuleKind.ESNext,
      strict: true
    }
  });
}
function loadSourceFile(project, code, filename = "temp.ts") {
  return project.createSourceFile(filename, code, { overwrite: true });
}
function findClass(sourceFile, className) {
  return sourceFile.getClass(className);
}
function findMethod(classDecl, methodName) {
  return classDecl.getMethod(methodName);
}
function findProperty(classDecl, propertyName) {
  return classDecl.getProperty(propertyName);
}
function hasImport(sourceFile, moduleSpecifier) {
  return sourceFile.getImportDeclarations().some(
    (imp) => imp.getModuleSpecifierValue() === moduleSpecifier
  );
}
function getImport(sourceFile, moduleSpecifier) {
  return sourceFile.getImportDeclarations().find(
    (imp) => imp.getModuleSpecifierValue() === moduleSpecifier
  );
}
function addNamedImport(sourceFile, moduleSpecifier, namedImport) {
  const existingImport = getImport(sourceFile, moduleSpecifier);
  if (existingImport) {
    const namedImports = existingImport.getNamedImports();
    const exists = namedImports.some((ni) => ni.getName() === namedImport);
    if (!exists) {
      existingImport.addNamedImport(namedImport);
      return true;
    }
    return false;
  }
  sourceFile.addImportDeclaration({
    moduleSpecifier,
    namedImports: [namedImport]
  });
  return true;
}
function addLocatorProperty(classDecl, locator, options = {}) {
  const existing = findProperty(classDecl, locator.name);
  if (existing) {
    if (options.preserveExisting) {
      return { added: false, initialized: false };
    }
    existing.remove();
  }
  classDecl.addProperty({
    name: locator.name,
    isReadonly: true,
    type: "Locator",
    docs: locator.description ? [{ description: locator.description }] : void 0
  });
  const initStatement = `this.${locator.name} = page.${locator.playwright};`;
  let constructor = classDecl.getConstructors()[0];
  if (!constructor) {
    constructor = classDecl.addConstructor({
      parameters: [{ name: "page", type: "Page" }],
      statements: [`this.page = page;`, initStatement]
    });
    if (!findProperty(classDecl, "page")) {
      classDecl.insertProperty(0, {
        name: "page",
        isReadonly: true,
        type: "Page"
      });
    }
    return { added: true, initialized: true };
  }
  let body = constructor.getBody();
  if (!body) {
    constructor.setBodyText("");
    body = constructor.getBody();
    if (!body) {
      return {
        added: true,
        initialized: false,
        warning: `Cannot add body to constructor for '${locator.name}' initialization`
      };
    }
  }
  const existingInit = body.getDescendantsOfKind(SyntaxKind.ExpressionStatement).find((stmt) => stmt.getText().includes(`this.${locator.name}`));
  if (!existingInit) {
    constructor.addStatements(initStatement);
  }
  return { added: true, initialized: true };
}
function addMethod(classDecl, method, options = {}) {
  const existing = findMethod(classDecl, method.name);
  if (existing) {
    if (options.preserveExisting) {
      return false;
    }
    existing.remove();
  }
  classDecl.addMethod({
    name: method.name,
    isAsync: true,
    parameters: method.params.map((p) => ({
      name: p.name,
      type: p.type,
      hasQuestionToken: p.optional,
      initializer: p.defaultValue
    })),
    returnType: `Promise<${method.returnType}>`,
    docs: [{ description: method.description }],
    statements: method.body.join("\n")
  });
  return true;
}
function updateModuleFile(code, className, locators, methods, options = {}) {
  const project = createProject();
  const sourceFile = loadSourceFile(project, code);
  const changes = [];
  const warnings = [];
  const classDecl = findClass(sourceFile, className);
  if (!classDecl) {
    return {
      modified: false,
      changes: [],
      code,
      warnings: [`Class '${className}' not found in source file`]
    };
  }
  if (options.addImports !== false) {
    if (addNamedImport(sourceFile, "@playwright/test", "Locator")) {
      changes.push("Added Locator import");
    }
    if (addNamedImport(sourceFile, "@playwright/test", "expect")) {
      changes.push("Added expect import");
    }
  }
  for (const locator of locators) {
    const result = addLocatorProperty(classDecl, locator, options);
    if (result.added) {
      changes.push(`Added locator: ${locator.name}`);
      if (result.warning) {
        warnings.push(result.warning);
      }
    } else if (options.preserveExisting) {
      warnings.push(`Skipped existing locator: ${locator.name}`);
    }
  }
  for (const method of methods) {
    const added = addMethod(classDecl, method, options);
    if (added) {
      changes.push(`Added method: ${method.name}`);
    } else if (options.preserveExisting) {
      warnings.push(`Skipped existing method: ${method.name}`);
    }
  }
  if (options.formatOutput !== false) {
    sourceFile.formatText();
  }
  return {
    modified: changes.length > 0,
    changes,
    code: sourceFile.getFullText(),
    warnings
  };
}
function extractMethodBodyText(method) {
  const body = method.getBody();
  if (!body) return "";
  const fullText = body.getText();
  const inner = fullText.slice(1, -1).trim();
  return inner;
}
function mergeModuleFiles(existingCode, newCode, className, options = {}) {
  const project = createProject();
  const existingFile = loadSourceFile(project, existingCode, "existing.ts");
  const newFile = loadSourceFile(project, newCode, "new.ts");
  const changes = [];
  const warnings = [];
  const existingClass = findClass(existingFile, className);
  const newClass = findClass(newFile, className);
  if (!existingClass) {
    return {
      modified: false,
      changes: [],
      code: existingCode,
      warnings: [`Class '${className}' not found in existing file`]
    };
  }
  if (!newClass) {
    return {
      modified: false,
      changes: [],
      code: existingCode,
      warnings: [`Class '${className}' not found in new file`]
    };
  }
  const newImports = newFile.getImportDeclarations();
  for (const imp of newImports) {
    const moduleSpec = imp.getModuleSpecifierValue();
    for (const namedImp of imp.getNamedImports()) {
      if (addNamedImport(existingFile, moduleSpec, namedImp.getName())) {
        changes.push(`Added import: ${namedImp.getName()} from ${moduleSpec}`);
      }
    }
  }
  const newProperties = newClass.getProperties();
  for (const prop of newProperties) {
    const propName = prop.getName();
    const existingProp = findProperty(existingClass, propName);
    if (!existingProp) {
      existingClass.addProperty({
        name: propName,
        isReadonly: prop.isReadonly(),
        type: prop.getType().getText()
      });
      changes.push(`Added property: ${propName}`);
    } else if (!options.preserveExisting) {
      existingProp.remove();
      existingClass.addProperty({
        name: propName,
        isReadonly: prop.isReadonly(),
        type: prop.getType().getText()
      });
      changes.push(`Updated property: ${propName}`);
    } else {
      warnings.push(`Skipped existing property: ${propName}`);
    }
  }
  const newMethods = newClass.getMethods();
  for (const method of newMethods) {
    const methodName = method.getName();
    const existingMethod = findMethod(existingClass, methodName);
    if (!existingMethod) {
      existingClass.addMethod({
        name: methodName,
        isAsync: method.isAsync(),
        parameters: method.getParameters().map((p) => ({
          name: p.getName(),
          type: p.getType().getText(),
          hasQuestionToken: p.hasQuestionToken(),
          initializer: p.getInitializer()?.getText()
        })),
        returnType: method.getReturnType().getText(),
        statements: extractMethodBodyText(method)
      });
      changes.push(`Added method: ${methodName}`);
    } else if (!options.preserveExisting) {
      existingMethod.remove();
      existingClass.addMethod({
        name: methodName,
        isAsync: method.isAsync(),
        parameters: method.getParameters().map((p) => ({
          name: p.getName(),
          type: p.getType().getText(),
          hasQuestionToken: p.hasQuestionToken(),
          initializer: p.getInitializer()?.getText()
        })),
        returnType: method.getReturnType().getText(),
        statements: extractMethodBodyText(method)
      });
      changes.push(`Updated method: ${methodName}`);
    } else {
      warnings.push(`Skipped existing method: ${methodName}`);
    }
  }
  if (options.formatOutput !== false) {
    existingFile.formatText();
  }
  return {
    modified: changes.length > 0,
    changes,
    code: existingFile.getFullText(),
    warnings
  };
}
function extractClassStructure(code, className) {
  const project = createProject();
  const sourceFile = loadSourceFile(project, code);
  const classDecl = findClass(sourceFile, className);
  if (!classDecl) {
    return null;
  }
  return {
    properties: classDecl.getProperties().map((p) => p.getName()),
    methods: classDecl.getMethods().map((m) => m.getName()),
    imports: sourceFile.getImportDeclarations().flatMap((imp) => imp.getNamedImports().map((ni) => ni.getName()))
  };
}
function validateSyntax(code) {
  const project = createProject();
  try {
    const sourceFile = loadSourceFile(project, code);
    const diagnostics = sourceFile.getPreEmitDiagnostics();
    const errors = diagnostics.filter((d) => d.getCategory() === 1).map((d) => d.getMessageText().toString());
    return {
      valid: errors.length === 0,
      errors
    };
  } catch (error) {
    return {
      valid: false,
      errors: [error.message]
    };
  }
}
function loadRegistry(indexPath) {
  if (!existsSync(indexPath)) {
    return null;
  }
  const content = readFileSync(indexPath, "utf-8");
  const entries = parseIndexFile(content);
  return {
    registryPath: indexPath,
    entries,
    lastUpdated: /* @__PURE__ */ new Date()
  };
}
function parseIndexFile(content, _indexPath) {
  const entries = [];
  const project = new Project({ useInMemoryFileSystem: true });
  const sourceFile = project.createSourceFile("index.ts", content);
  const exportDeclarations = sourceFile.getExportDeclarations();
  for (const exportDecl of exportDeclarations) {
    const moduleSpecifier = exportDecl.getModuleSpecifierValue();
    if (!moduleSpecifier) continue;
    const namedExports = exportDecl.getNamedExports();
    for (const namedExport of namedExports) {
      const exportName = namedExport.getName();
      const aliasNode = namedExport.getAliasNode();
      const alias = aliasNode ? aliasNode.getText() : exportName;
      let exportType = "class";
      if (exportName.startsWith("create") || exportName.endsWith("Factory")) {
        exportType = "function";
      } else if (exportName === exportName.toUpperCase()) {
        exportType = "const";
      }
      entries.push({
        moduleName: alias,
        className: exportName,
        filePath: moduleSpecifier,
        scope: extractScope(moduleSpecifier),
        exportType
      });
    }
  }
  const starExports = content.match(/export\s+\*\s+from\s+['"]([^'"]+)['"]/g);
  if (starExports) {
    for (const match of starExports) {
      const pathMatch = match.match(/['"]([^'"]+)['"]/);
      if (pathMatch) {
        const modulePath = pathMatch[1];
        entries.push({
          moduleName: extractModuleName(modulePath),
          className: "*",
          filePath: modulePath,
          scope: extractScope(modulePath),
          exportType: "class"
        });
      }
    }
  }
  return entries;
}
function extractModuleName(filePath) {
  const base = basename(filePath, ".js").replace(".page", "");
  return toPascalCase2(base);
}
function extractScope(filePath) {
  const dir = dirname(filePath);
  if (dir === "." || dir === "./") {
    return basename(filePath, ".js").replace(".page", "");
  }
  return basename(dir);
}
function toPascalCase2(str) {
  return str.split(/[-_\s]+/).map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join("");
}
function generateIndexContent(entries, options = {}) {
  const lines = [
    "/**",
    " * Module Registry - Auto-generated index",
    " * @generated by @artk/core-autogen",
    " */"
  ];
  const byFile = /* @__PURE__ */ new Map();
  for (const entry of entries) {
    const existing = byFile.get(entry.filePath) || [];
    existing.push(entry);
    byFile.set(entry.filePath, existing);
  }
  let filePaths = Array.from(byFile.keys());
  if (options.sortExports) {
    filePaths = filePaths.sort();
  }
  for (const filePath of filePaths) {
    const fileEntries = byFile.get(filePath);
    if (fileEntries.length === 1 && fileEntries[0].className === "*") {
      lines.push(`export * from '${filePath}';`);
    } else {
      const exports$1 = fileEntries.map((e) => {
        if (e.moduleName !== e.className) {
          return `${e.className} as ${e.moduleName}`;
        }
        return e.className;
      });
      if (options.sortExports) {
        exports$1.sort();
      }
      lines.push(`export { ${exports$1.join(", ")} } from '${filePath}';`);
    }
  }
  return lines.join("\n") + "\n";
}
function addToRegistry(registry, module, filePath) {
  const entry = {
    moduleName: module.moduleName,
    className: module.className,
    filePath,
    scope: module.scope,
    exportType: "class"
  };
  const existingIndex = registry.entries.findIndex(
    (e) => e.filePath === filePath || e.moduleName === module.moduleName
  );
  if (existingIndex >= 0) {
    registry.entries[existingIndex] = entry;
  } else {
    registry.entries.push(entry);
  }
  registry.lastUpdated = /* @__PURE__ */ new Date();
  return entry;
}
function removeFromRegistry(registry, moduleNameOrPath) {
  const initialLength = registry.entries.length;
  registry.entries = registry.entries.filter(
    (e) => e.moduleName !== moduleNameOrPath && e.filePath !== moduleNameOrPath
  );
  const removed = registry.entries.length < initialLength;
  if (removed) {
    registry.lastUpdated = /* @__PURE__ */ new Date();
  }
  return removed;
}
function updateIndexFile(indexPath, newModules, options = {}) {
  let registry = loadRegistry(indexPath);
  const added = [];
  const removed = [];
  if (!registry) {
    if (!options.createIfMissing) {
      return {
        modified: false,
        added: [],
        removed: [],
        content: ""
      };
    }
    registry = {
      registryPath: indexPath,
      entries: [],
      lastUpdated: /* @__PURE__ */ new Date()
    };
  }
  const existingNames = new Set(registry.entries.map((e) => e.moduleName));
  for (const { module, filePath } of newModules) {
    const relativePath = filePath.startsWith(".") ? filePath : `./${relative(dirname(indexPath), filePath).replace(/\\/g, "/")}`;
    const importPath = relativePath.replace(/\.ts$/, ".js");
    addToRegistry(registry, module, importPath);
    if (!existingNames.has(module.moduleName)) {
      added.push(module.moduleName);
    }
  }
  const content = generateIndexContent(registry.entries, options);
  return {
    modified: added.length > 0 || removed.length > 0,
    added,
    removed,
    content
  };
}
function scanModulesDirectory(_dirPath, _pattern = "*.page.ts") {
  return [];
}
function createRegistry(indexPath) {
  return {
    registryPath: indexPath,
    entries: [],
    lastUpdated: /* @__PURE__ */ new Date()
  };
}
function saveRegistry(registry, options = {}) {
  const content = generateIndexContent(registry.entries, options);
  writeFileSync(registry.registryPath, content, "utf-8");
}
function findEntry(registry, moduleName) {
  return registry.entries.find((e) => e.moduleName === moduleName);
}
function findEntriesByScope(registry, scope) {
  return registry.entries.filter((e) => e.scope === scope);
}
function hasModule(registry, moduleName) {
  return registry.entries.some((e) => e.moduleName === moduleName);
}
function getModuleNames(registry) {
  return registry.entries.map((e) => e.moduleName);
}
function getRegistryStats(registry) {
  const byScope = {};
  const byType = {};
  for (const entry of registry.entries) {
    byScope[entry.scope] = (byScope[entry.scope] || 0) + 1;
    byType[entry.exportType] = (byType[entry.exportType] || 0) + 1;
  }
  return {
    totalModules: registry.entries.length,
    byScope,
    byType
  };
}

export { __test_checkFeature, addLocatorProperty, addMethod, addNamedImport, addToRegistry, createProject, createRegistry, extractClassStructure, extractModuleDefinition, findClass, findEntriesByScope, findEntry, findMethod, findProperty, generateIndexContent, generateModule, generateModuleCode, generateTest, generateTestCode, getImport, getModuleNames, getRegistryStats, hasImport, hasModule, loadRegistry, loadSourceFile, mergeModuleFiles, parseIndexFile, removeFromRegistry, saveRegistry, scanModulesDirectory, updateIndexFile, updateModuleFile, validateSyntax };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map