#!/usr/bin/env node
'use strict';

/*
  ARTK Core — Journey Backlog + Index generator

  Design goals:
  - deterministic output
  - actionable validation errors
  - schema-driven frontmatter validation (AJV)
  - supports flat or staged directory layouts

  This script is intended to be invoked via a repo-local wrapper, e.g.:
    node <ARTK_ROOT>/tools/journeys/generate.js

  Or directly:
    node <ARTK_ROOT>/.artk/core/journeys/tools/node/generate.js --artkRoot <ARTK_ROOT>
*/

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const fg = require('fast-glob');
const YAML = require('yaml');
const Ajv = require('ajv');
const minimist = require('minimist');

function sha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function writeText(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function writeJson(filePath, obj) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2) + '\n', 'utf8');
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
  // Heuristic: if current working dir is inside ARTK_ROOT, find artk.config.yml above.
  const cfg = findUp(process.cwd(), 'artk.config.yml', 12);
  return cfg ? path.dirname(cfg) : null;
}

function parseFrontmatter(mdPath, content) {
  // Frontmatter must be at top: ---\n ... \n---\n
  if (!content.startsWith('---')) {
    return { data: null, body: content, error: `Missing YAML frontmatter at top of ${mdPath}` };
  }
  const delimiter = '\n---';
  const idx = content.indexOf(delimiter, 3);
  if (idx === -1) {
    return { data: null, body: content, error: `Unterminated YAML frontmatter in ${mdPath}` };
  }
  const fmRaw = content.slice(3, idx + 1); // include trailing newline
  const body = content.slice(idx + delimiter.length);
  try {
    const data = YAML.parse(fmRaw);
    return { data, body, error: null };
  } catch (e) {
    return { data: null, body: content, error: `YAML parse error in ${mdPath}: ${e.message}` };
  }
}

function loadYamlIfExists(p) {
  if (!fileExists(p)) return null;
  const raw = readText(p);
  try {
    return YAML.parse(raw);
  } catch (e) {
    throw new Error(`Failed to parse YAML: ${p}\n${e.message}`);
  }
}

function defaultConfig() {
  return {
    id: { prefix: 'JRN', width: 4, style: 'sequential' },
    layout: 'flat',
    tiers: ['smoke', 'release', 'regression'],
    statuses: ['proposed', 'defined', 'clarified', 'implemented', 'quarantined', 'deprecated'],
    backlog: { groupBy: 'tier', thenBy: 'status' },
  };
}

function normalizeConfig(cfg) {
  const d = defaultConfig();
  const out = Object.assign({}, d, cfg || {});
  out.id = Object.assign({}, d.id, (cfg && cfg.id) || {});
  out.backlog = Object.assign({}, d.backlog, (cfg && cfg.backlog) || {});
  out.tiers = Array.isArray(out.tiers) ? out.tiers : d.tiers;
  out.statuses = Array.isArray(out.statuses) ? out.statuses : d.statuses;
  return out;
}

function buildIdRegex(cfg) {
  const prefix = cfg.id?.prefix || 'JRN';
  const width = cfg.id?.width || 4;
  // sequential pattern: PREFIX-0001
  return new RegExp(`^${escapeRegExp(prefix)}-\\d{${width}}$`);
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function naturalIdKey(id) {
  // JRN-0007 -> {prefix:'JRN', n:7}
  const m = String(id).match(/^([A-Za-z0-9]+)-(\d+)$/);
  if (!m) return { prefix: id, n: Number.MAX_SAFE_INTEGER, raw: id };
  return { prefix: m[1], n: parseInt(m[2], 10), raw: id };
}

function sortById(a, b) {
  const ka = naturalIdKey(a.id);
  const kb = naturalIdKey(b.id);
  if (ka.prefix !== kb.prefix) return ka.prefix.localeCompare(kb.prefix);
  if (ka.n !== kb.n) return ka.n - kb.n;
  return ka.raw.localeCompare(kb.raw);
}

function formatLabel(k, v) {
  return `\`${k}:${v}\``;
}

function relativeLink(fromDir, targetPath) {
  const rel = path.relative(fromDir, targetPath).split(path.sep).join('/');
  return rel.startsWith('.') ? rel : `./${rel}`;
}

function nowIso() {
  return new Date().toISOString();
}

function generateBacklogMd(journeysDir, journeys, cfg) {
  const tiers = cfg.tiers;
  const statuses = cfg.statuses;

  const counts = {};
  function inc(tier, status) {
    counts[tier] = counts[tier] || {};
    counts[tier][status] = (counts[tier][status] || 0) + 1;
  }

  journeys.forEach(j => inc(j.tier, j.status));

  const lines = [];
  lines.push('# Journey Backlog');
  lines.push('');
  lines.push('> ⚠️ **Generated file.** Do not edit by hand. Regenerate via ARTK journey generator.');
  lines.push(`> Generated: ${nowIso()}`);
  lines.push('');

  // Summary table
  lines.push('## Summary');
  lines.push('');
  lines.push('| Tier | Status | Count |');
  lines.push('|---|---:|---:|');
  tiers.forEach(t => {
    statuses.forEach(s => {
      const c = counts[t]?.[s] || 0;
      if (c > 0) lines.push(`| ${t} | ${s} | ${c} |`);
    });
  });
  lines.push('');

  // Grouping: tier -> status (default)
  tiers.forEach(tier => {
    const byTier = journeys.filter(j => j.tier === tier);
    if (byTier.length === 0) return;
    lines.push(`## Tier: ${tier}`);
    lines.push('');
    statuses.forEach(status => {
      const items = byTier.filter(j => j.status === status).sort(sortById);
      if (items.length === 0) return;
      lines.push(`### Status: ${status}`);
      lines.push('');
      items.forEach(j => {
        const checked = j.status === 'implemented' && Array.isArray(j.tests) && j.tests.length > 0;
        const cb = checked ? '[x]' : '[ ]';
        const link = relativeLink(journeysDir, j.file);
        const extras = [
          formatLabel('status', j.status),
          formatLabel('tier', j.tier),
          j.owner ? formatLabel('owner', j.owner) : null
        ].filter(Boolean).join(' ');
        lines.push(`- ${cb} ${j.id} — ${j.title} ([journey](${link})) ${extras}`);
      });
      lines.push('');
    });
  });

  return lines.join('\n') + '\n';
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

  const outBacklog = args.outBacklog || path.join(journeysDir, 'BACKLOG.md');
  const outIndex = args.outIndex || path.join(journeysDir, 'index.json');

  const schemaPath = args.schema || path.join(__dirname, '..', '..', 'schema', 'journey.frontmatter.schema.json');
  if (!fileExists(schemaPath)) {
    console.error(`ARTK: Missing schema at ${schemaPath}`);
    process.exit(2);
  }

  const cfg = normalizeConfig(loadYamlIfExists(configPath));
  const idRegex = buildIdRegex(cfg);

  // Use relative patterns with cwd for cross-platform compatibility
  // Absolute paths with ** can fail on Windows due to drive letter handling
  const patterns = [
    '**/*.md',
    '!templates/**',
    '!schema/**',
    '!BACKLOG.md',
    '!README.md',
  ];

  const files = fg.sync(patterns, {
    cwd: journeysDir,
    dot: false,
    onlyFiles: true,
    unique: true,
    absolute: true  // Return absolute paths for downstream processing
  });
  const schema = JSON.parse(readText(schemaPath));

  const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
  const validate = ajv.compile(schema);

  const journeys = [];
  const errors = [];

  const seenIds = new Map();

  for (const file of files) {
    const content = readText(file);
    const { data, body, error } = parseFrontmatter(file, content);

    if (error) {
      errors.push(error);
      continue;
    }
    if (!data || typeof data !== 'object') {
      errors.push(`Invalid frontmatter object in ${file}`);
      continue;
    }

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

    journeys.push({
      id: String(data.id),
      title: String(data.title),
      status: String(data.status),
      tier: String(data.tier),
      actor: String(data.actor),
      scope: String(data.scope),
      tags: Array.isArray(data.tags) ? data.tags : [],
      modules: data.modules || { foundation: [], feature: [] },
      tests: Array.isArray(data.tests) ? data.tests : [],
      links: data.links || { requirements: [], issues: [], docs: [] },
      owner: data.owner || null,
      statusReason: data.statusReason || null,
      file: path.resolve(file),
      bodyHash: sha256(body || '')
    });
  }

  if (errors.length > 0) {
    console.error('ARTK: Journey validation failed:\n');
    errors.forEach(e => console.error(`- ${e}`));
    process.exit(1);
  }

  journeys.sort(sortById);

  const backlogMd = generateBacklogMd(path.resolve(journeysDir), journeys, cfg);
  writeText(outBacklog, backlogMd);

  const index = {
    schema_version: 1,
    generated_at: nowIso(),
    journeys: journeys.map(j => ({
      id: j.id,
      title: j.title,
      status: j.status,
      tier: j.tier,
      actor: j.actor,
      scope: j.scope,
      tags: j.tags,
      modules: j.modules,
      tests: j.tests,
      links: j.links,
      owner: j.owner,
      statusReason: j.statusReason,
      file: path.relative(artkRoot, j.file).split(path.sep).join('/'),
      bodyHash: j.bodyHash
    }))
  };

  writeJson(outIndex, index);
  console.log(`ARTK: Generated backlog -> ${outBacklog}`);
  console.log(`ARTK: Generated index   -> ${outIndex}`);
}

main();
