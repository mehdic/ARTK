#!/usr/bin/env node
'use strict';

/*
  ARTK Core — Journey validator

  Validates all Journey files against the schema and config rules.
  Does not generate outputs. Exits non-zero on errors.
*/

const fs = require('fs');
const path = require('path');

const fg = require('fast-glob');
const YAML = require('yaml');
const Ajv = require('ajv');
const minimist = require('minimist');

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function fileExists(p) {
  try { fs.accessSync(p, fs.constants.F_OK); return true; } catch { return false; }
}

function findUp(startDir, targetName, maxDepth = 10) {
  let cur = path.resolve(startDir);
  for (let i = 0; i < maxDepth; i++) {
    const candidate = path.join(cur, targetName);
    if (fileExists(candidate)) return candidate;
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return null;
}

function inferArtkRoot() {
  const cfg = findUp(process.cwd(), 'artk.config.yml', 12);
  return cfg ? path.dirname(cfg) : null;
}

function parseFrontmatter(mdPath, content) {
  if (!content.startsWith('---')) {
    return { data: null, error: `Missing YAML frontmatter at top of ${mdPath}` };
  }
  const delimiter = '\n---';
  const idx = content.indexOf(delimiter, 3);
  if (idx === -1) {
    return { data: null, error: `Unterminated YAML frontmatter in ${mdPath}` };
  }
  const fmRaw = content.slice(3, idx + 1);
  try {
    const data = YAML.parse(fmRaw);
    return { data, error: null };
  } catch (e) {
    return { data: null, error: `YAML parse error in ${mdPath}: ${e.message}` };
  }
}

function loadYamlIfExists(p) {
  if (!fileExists(p)) return null;
  const raw = readText(p);
  return YAML.parse(raw);
}

function defaultConfig() {
  return { id: { prefix: 'JRN', width: 4 } };
}

function normalizeConfig(cfg) {
  const d = defaultConfig();
  const out = Object.assign({}, d, cfg || {});
  out.id = Object.assign({}, d.id, (cfg && cfg.id) || {});
  return out;
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildIdRegex(cfg) {
  const prefix = cfg.id?.prefix || 'JRN';
  const width = cfg.id?.width || 4;
  return new RegExp(`^${escapeRegExp(prefix)}-\\d{${width}}$`);
}

function main() {
  const args = minimist(process.argv.slice(2));
  const artkRoot = args.artkRoot || inferArtkRoot();
  if (!artkRoot) {
    console.error('ARTK: Could not infer ARTK_ROOT. Pass --artkRoot <path>.');
    process.exit(2);
  }

  const journeysDir = args.journeysDir || path.join(artkRoot, 'journeys');
  const configPath = args.config || path.join(journeysDir, 'journeys.config.yml');
  const schemaPath = args.schema || path.join(__dirname, '..', '..', 'schema', 'journey.frontmatter.schema.json');

  if (!fileExists(schemaPath)) {
    console.error(`ARTK: Missing schema at ${schemaPath}`);
    process.exit(2);
  }

  const cfg = normalizeConfig(loadYamlIfExists(configPath));
  const idRegex = buildIdRegex(cfg);

  const patterns = [
    path.join(journeysDir, '**/*.md').split(path.sep).join('/'),
    `!${path.join(journeysDir, 'templates/**').split(path.sep).join('/')}`,
    `!${path.join(journeysDir, 'schema/**').split(path.sep).join('/')}`,
    `!${path.join(journeysDir, 'BACKLOG.md').split(path.sep).join('/')}`,
    `!${path.join(journeysDir, 'README.md').split(path.sep).join('/')}`,
  ];

  const files = fg.sync(patterns, { dot: false, onlyFiles: true, unique: true });
  const schema = JSON.parse(readText(schemaPath));

  const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
  const validate = ajv.compile(schema);

  const errors = [];
  const seenIds = new Map();

  for (const file of files) {
    const content = readText(file);
    const { data, error } = parseFrontmatter(file, content);
    if (error) { errors.push(error); continue; }
    const ok = validate(data);
    if (!ok) {
      const msg = validate.errors
        .map(e => `${e.instancePath || '(root)'} ${e.message}`)
        .join('; ');
      errors.push(`Schema validation failed in ${file}: ${msg}`);
      continue;
    }

    if (!idRegex.test(String(data.id))) {
      errors.push(`Invalid id format in ${file}: "${data.id}". Expected ${idRegex}`);
      continue;
    }

    if (seenIds.has(data.id)) {
      errors.push(`Duplicate Journey id "${data.id}" in:\n- ${seenIds.get(data.id)}\n- ${file}`);
      continue;
    }
    seenIds.set(data.id, file);
  }

  if (errors.length > 0) {
    console.error('ARTK: Journey validation failed:\n');
    errors.forEach(e => console.error(`- ${e}`));
    process.exit(1);
  }

  console.log(`ARTK: OK (${files.length} journey files validated)`);
}

main();
