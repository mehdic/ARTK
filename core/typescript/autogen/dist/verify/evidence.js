/**
 * Evidence Capture - ARIA snapshots and screenshots for debugging
 * @see T054 - Implement ARIA snapshot capture helper
 */
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
/**
 * Generate Playwright code for capturing ARIA snapshot
 */
export function generateARIACaptureCode() {
    return `
// ARIA Snapshot Helper - Insert this in your test for debugging
async function captureARIASnapshot(page) {
  return await page.evaluate(() => {
    function getSnapshot(element) {
      const role = element.getAttribute('role') ||
                   element.tagName.toLowerCase();

      const snapshot = { role };

      // Get accessible name
      const name = element.getAttribute('aria-label') ||
                   element.getAttribute('aria-labelledby') ?
                   document.getElementById(element.getAttribute('aria-labelledby'))?.textContent :
                   element.textContent?.trim().slice(0, 100);
      if (name) snapshot.name = name;

      // Get ARIA states
      if (element.getAttribute('aria-disabled') === 'true') {
        snapshot.disabled = true;
      }
      if (element.getAttribute('aria-checked') === 'true') {
        snapshot.checked = true;
      }
      if (element.getAttribute('aria-expanded') === 'true') {
        snapshot.expanded = true;
      }
      if (element.getAttribute('aria-pressed') === 'true') {
        snapshot.pressed = true;
      }

      // Get heading level
      const levelMatch = element.tagName.match(/^H(\\d)$/i);
      if (levelMatch) {
        snapshot.level = parseInt(levelMatch[1], 10);
      }

      // Get children
      const children = Array.from(element.children)
        .map(child => getSnapshot(child))
        .filter(c => c.role !== 'none' && c.role !== 'presentation');

      if (children.length > 0) {
        snapshot.children = children;
      }

      return snapshot;
    }

    return getSnapshot(document.body);
  });
}
`.trim();
}
/**
 * Generate Playwright code for full evidence capture
 */
export function generateEvidenceCaptureCode(options = {}) {
    const { captureScreenshot = true, captureAria = true, captureConsole = true, } = options;
    const parts = [];
    parts.push('// Evidence Capture Helper');
    parts.push('const evidence = {');
    parts.push('  timestamp: new Date().toISOString(),');
    parts.push('  url: page.url(),');
    parts.push('  title: await page.title(),');
    if (captureAria) {
        parts.push('  ariaSnapshot: await captureARIASnapshot(page),');
    }
    if (captureScreenshot) {
        parts.push('  screenshotPath: await page.screenshot({ path: "evidence.png" }),');
    }
    if (captureConsole) {
        parts.push('  consoleMessages: [], // Collect from page.on("console")');
    }
    parts.push('};');
    return parts.join('\n');
}
/**
 * Create evidence directory
 */
export function createEvidenceDir(basePath, testId) {
    const evidenceDir = join(basePath, 'evidence', testId);
    mkdirSync(evidenceDir, { recursive: true });
    return evidenceDir;
}
/**
 * Save evidence to file
 */
export function saveEvidence(evidence, outputDir, testId) {
    const dir = createEvidenceDir(outputDir, testId);
    const filename = `evidence-${Date.now()}.json`;
    const filepath = join(dir, filename);
    writeFileSync(filepath, JSON.stringify(evidence, null, 2), 'utf-8');
    return filepath;
}
/**
 * Load evidence from file
 */
export function loadEvidence(filepath) {
    if (!existsSync(filepath)) {
        return null;
    }
    try {
        const content = readFileSync(filepath, 'utf-8');
        return JSON.parse(content);
    }
    catch {
        return null;
    }
}
/**
 * Compare two ARIA snapshots
 */
export function compareARIASnapshots(expected, actual) {
    const differences = [];
    function compare(path, exp, act) {
        if (exp.role !== act.role) {
            differences.push(`${path}: role mismatch (expected: ${exp.role}, actual: ${act.role})`);
        }
        if (exp.name !== act.name) {
            differences.push(`${path}: name mismatch (expected: ${exp.name}, actual: ${act.name})`);
        }
        if (exp.disabled !== act.disabled) {
            differences.push(`${path}: disabled state mismatch`);
        }
        if (exp.checked !== act.checked) {
            differences.push(`${path}: checked state mismatch`);
        }
        // Compare children
        const expChildren = exp.children || [];
        const actChildren = act.children || [];
        if (expChildren.length !== actChildren.length) {
            differences.push(`${path}: children count mismatch (expected: ${expChildren.length}, actual: ${actChildren.length})`);
        }
        const minLen = Math.min(expChildren.length, actChildren.length);
        for (let i = 0; i < minLen; i++) {
            compare(`${path}/${expChildren[i].role}[${i}]`, expChildren[i], actChildren[i]);
        }
    }
    compare('/', expected, actual);
    return {
        matches: differences.length === 0,
        differences,
    };
}
/**
 * Find element in ARIA snapshot by role and name
 */
export function findInSnapshot(snapshot, role, name) {
    if (snapshot.role === role && (!name || snapshot.name === name)) {
        return snapshot;
    }
    for (const child of snapshot.children || []) {
        const found = findInSnapshot(child, role, name);
        if (found)
            return found;
    }
    return null;
}
/**
 * Generate ARIA tree as text
 */
export function formatARIATree(snapshot, indent = 0) {
    const prefix = '  '.repeat(indent);
    let line = `${prefix}${snapshot.role}`;
    if (snapshot.name) {
        line += ` "${snapshot.name}"`;
    }
    const states = [];
    if (snapshot.disabled)
        states.push('disabled');
    if (snapshot.checked)
        states.push('checked');
    if (snapshot.expanded)
        states.push('expanded');
    if (snapshot.pressed)
        states.push('pressed');
    if (snapshot.level)
        states.push(`level=${snapshot.level}`);
    if (states.length > 0) {
        line += ` [${states.join(', ')}]`;
    }
    const lines = [line];
    for (const child of snapshot.children || []) {
        lines.push(formatARIATree(child, indent + 1));
    }
    return lines.join('\n');
}
/**
 * Generate evidence report
 */
export function generateEvidenceReport(evidence) {
    const lines = [];
    lines.push('# Evidence Report');
    lines.push('');
    lines.push(`**Captured**: ${evidence.timestamp}`);
    lines.push(`**URL**: ${evidence.url}`);
    lines.push(`**Title**: ${evidence.title}`);
    lines.push('');
    if (evidence.screenshotPath) {
        lines.push('## Screenshot');
        lines.push('');
        lines.push(`![Screenshot](${evidence.screenshotPath})`);
        lines.push('');
    }
    if (evidence.ariaSnapshot) {
        lines.push('## ARIA Snapshot');
        lines.push('');
        lines.push('```');
        lines.push(formatARIATree(evidence.ariaSnapshot));
        lines.push('```');
        lines.push('');
    }
    if (evidence.consoleMessages && evidence.consoleMessages.length > 0) {
        lines.push('## Console Messages');
        lines.push('');
        for (const msg of evidence.consoleMessages) {
            lines.push(`- ${msg}`);
        }
        lines.push('');
    }
    if (evidence.networkErrors && evidence.networkErrors.length > 0) {
        lines.push('## Network Errors');
        lines.push('');
        for (const err of evidence.networkErrors) {
            lines.push(`- ${err}`);
        }
        lines.push('');
    }
    return lines.join('\n');
}
//# sourceMappingURL=evidence.js.map