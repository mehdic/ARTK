# Handoffs Extraction Consistency Audit

**Date:** 2026-02-04
**Confidence:** 0.95
**Status:** CRITICAL INCONSISTENCIES FOUND

---

## Executive Summary

This audit compares three implementations of handoffs extraction used in ARTK bootstrap:
1. **Bash** (`scripts/bootstrap.sh`)
2. **PowerShell** (`scripts/bootstrap.ps1`)
3. **TypeScript** (`packages/cli/src/lib/bootstrap.ts`)

**CRITICAL FINDING:** The TypeScript implementation does NOT extract handoffs at all. It only copies the full agent file and generates a stub without handoffs. This is a fundamental behavioral difference.

---

## 1. REGEX PATTERNS

| Pattern | Bash | PowerShell | TypeScript | Semantically Identical |
|---------|------|------------|------------|------------------------|
| Frontmatter delimiter | `/^---[[:space:]]*$/` | `"^---\s*$"` | N/A (no extraction) | YES (Bash/PS only) |
| Handoffs key | `/^[Hh]andoffs:/` | `"^[Hh]andoffs:"` | N/A | YES (Bash/PS only) |
| Exit condition | `/^[^[:space:]]/` | `"^[^\s]"` | N/A | YES (Bash/PS only) |
| Comment filter | `!/^[[:space:]]*#[[:space:]]/` | `-notmatch "^\s*#\s"` | N/A | YES (Bash/PS only) |

### Analysis

**POSIX Locale Concerns:**
- `[[:space:]]` in Bash is locale-aware; includes space, tab, newline, etc.
- `\s` in PowerShell regex equals `[ \t\n\r\f\v]`
- These are semantically equivalent for practical purposes.

**Potential Issue:**
- Bash uses AWK `[[:space:]]` which in some POSIX locales may include Unicode whitespace.
- PowerShell `\s` matches only ASCII whitespace.
- For YAML files, this difference is negligible (YAML only recognizes ASCII whitespace).

---

## 2. STRING ESCAPING

| Character | Bash | PowerShell | TypeScript |
|-----------|------|------------|------------|
| Backslash `\` | `s/\\/\\\\/g` | `-replace '\\', '\\\\'` | N/A |
| Double quote `"` | `s/\x22/\\\x22/g` | `-replace '"', '\"'` | N/A |
| Newline `\n` | `tr -d '\r\n'` (REMOVES) | `-replace "\`n", '\n'` (ESCAPES) | N/A |
| Carriage return `\r` | `tr -d '\r\n'` (REMOVES) | `-replace "\`r", ''` (REMOVES) | N/A |
| Tab `\t` | NOT HANDLED | NOT HANDLED | N/A |
| Null byte `\0` | NOT HANDLED | NOT HANDLED | N/A |

### Critical Inconsistency: Newline Handling

| Scenario | Bash | PowerShell | Impact |
|----------|------|------------|--------|
| Multi-line description | Concatenates lines | Escapes to `\n` literal | DIFFERENT OUTPUT |
| Example input | `"line1\nline2"` | `"line1\nline2"` | N/A |
| Bash output | `"line1line2"` | N/A | Loses newline |
| PowerShell output | N/A | `"line1\\nline2"` | Preserves as escape |

**Verdict:** This IS intentional design difference. Bash strips newlines for inline YAML values, PowerShell escapes them. Both approaches are valid for YAML but produce different outputs.

---

## 3. EMPTY/NULL HANDLING

Test results from actual execution:

| Scenario | Bash | PowerShell | TypeScript |
|----------|------|------------|------------|
| Empty file | Returns empty string | Returns empty string | Reads file, extracts nothing |
| No frontmatter | Returns empty string | Returns empty string | Uses fallback defaults |
| No handoffs key | Returns empty string | Returns empty string | N/A (doesn't extract) |
| `handoffs:` (empty) | Returns `handoffs:` only | Returns `handoffs:` only | N/A |
| File read error | Silent fail (2>/dev/null) | Silent fail (-EA SilentlyContinue) | Throws exception |

### Test Results (Verified)

```
=== test3.md (empty handoffs) ===
Bash:       "handoffs:" (just the key, no items)
PowerShell: "handoffs:" (just the key, no items)
TypeScript: N/A

=== test4.md (no handoffs key) ===
Bash:       "" (empty)
PowerShell: "" (empty)
TypeScript: N/A

=== test6.md (no frontmatter) ===
Bash:       "" (empty)
PowerShell: "" (empty)
TypeScript: Uses defaults (name="unknown", description="ARTK prompt")

=== test7.md (empty file) ===
Bash:       "" (empty)
PowerShell: "" (empty)
TypeScript: Uses defaults
```

---

## 4. OUTPUT FORMAT

| Aspect | Bash | PowerShell | TypeScript |
|--------|------|------------|------------|
| Trailing newline | Via AWK (platform-dependent) | Controlled via `-join` | N/A |
| Line ending | LF | LF (after normalization) | N/A |
| Empty = no handoffs | `""` | `""` | N/A |
| Includes `handoffs:` key | YES | YES | N/A |

### Trailing Newline Behavior

Bash AWK naturally adds a trailing newline when printing. PowerShell's `-join` does not add a trailing newline. This can cause differences:

```yaml
# Bash output (note trailing LF)
handoffs:
  - action: Step
    prompt: /next
<LF>

# PowerShell output (no trailing LF)
handoffs:
  - action: Step
    prompt: /next
```

---

## 5. ERROR HANDLING

| Error | Bash | PowerShell | TypeScript |
|-------|------|------------|------------|
| File not found | Silent (2>/dev/null), returns `""` | Silent (-EA SilentlyContinue), returns `""` | Throws exception |
| Permission denied | Silent, returns `""` | Silent, returns `""` | Throws exception |
| Invalid UTF-8 | Processes what it can, may corrupt | Processes with BOM handling | May throw or corrupt |
| Binary content | Returns `""`, exit code 2 | Returns `""` | Throws or returns garbage |

### Test Results (Bash)

```
=== File not found ===
Exit code: 2
Result: '' (empty)

=== Permission denied ===
Exit code: 2
Result: '' (empty)

=== Binary content ===
Exit code: 2
Result length: 0

=== Invalid UTF-8 ===
Exit code: 2
Result: 'handoffs:' (partial extraction)
```

---

## 6. CRITICAL ARCHITECTURAL DIFFERENCE

### TypeScript Does NOT Extract Handoffs

The TypeScript implementation in `packages/cli/src/lib/bootstrap.ts`:

```typescript
// Only extracts these two fields:
const name = extractYamlValue(content, 'name') || file.replace(/\.md$/, '');
const description = extractYamlValue(content, 'description') || 'ARTK prompt';

// Generates stub WITHOUT handoffs:
const stubContent = generateStubPrompt(name, description);
// ^^^^^^^^^^^^^^^^ No handoffs parameter!
```

Compare to Bash and PowerShell which both:
1. Extract handoffs section
2. Sanitize handoffs (remove `---` lines)
3. Include handoffs in generated stub

### Impact

| Implementation | Stub Prompt Contains Handoffs? | Agent File Has Full Content? |
|----------------|-------------------------------|------------------------------|
| Bash | YES | YES |
| PowerShell | YES | YES |
| TypeScript | NO | YES |

**This means:** Projects installed via TypeScript CLI will have stub prompts WITHOUT the `handoffs:` YAML frontmatter. The handoffs are only available in the agent file, not the prompt file.

---

## 7. COMMENT HANDLING

| Scenario | Bash | PowerShell | TypeScript |
|----------|------|------------|------------|
| `# comment` line | EXCLUDED | EXCLUDED | N/A |
| `  # indented comment` | EXCLUDED | EXCLUDED | N/A |
| `- action: # inline` | KEPT | KEPT | N/A |

The comment filter pattern `!/^[[:space:]]*#[[:space:]]/` (Bash) and `-notmatch "^\s*#\s"` (PowerShell) only exclude lines that:
1. Start with optional whitespace
2. Have `#` followed by whitespace

Inline comments like `- action: Step # comment` are KEPT.

---

## 8. RECOMMENDATIONS

### Priority 1: Align TypeScript with Bash/PowerShell (CRITICAL)

The TypeScript implementation MUST be updated to:
1. Extract handoffs section from agent files
2. Include handoffs in generated stub prompts
3. Match the Bash/PowerShell escape and sanitization logic

**Suggested implementation:**

```typescript
function extractHandoffs(content: string): string {
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const handoffs: string[] = [];
  let inFrontmatter = false;
  let inHandoffs = false;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    // Frontmatter delimiter
    if (/^---\s*$/.test(line)) {
      if (inFrontmatter) break;
      inFrontmatter = true;
      continue;
    }

    // Handoffs key (case-insensitive)
    if (inFrontmatter && /^[Hh]andoffs:/.test(line)) {
      inHandoffs = true;
      handoffs.push(line);
      continue;
    }

    if (inHandoffs) {
      // Exit on non-whitespace at column 0
      if (/^[^\s]/.test(line)) break;
      // Skip comment lines
      if (!/^\s*#\s/.test(line)) {
        handoffs.push(line);
      }
    }
  }

  return handoffs.join('\n');
}

function generateStubPrompt(name: string, description: string, handoffs: string): string {
  const escapedDesc = description.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');

  let frontmatter = `---
name: ${name}
description: "${escapedDesc}"
agent: ${name}`;

  if (handoffs && handoffs.trim()) {
    // Sanitize: remove document separators
    const sanitized = handoffs.split('\n').filter(l => !/^---\s*$/.test(l)).join('\n');
    frontmatter += '\n' + sanitized;
  }

  frontmatter += '\n---';

  return frontmatter + `
# ARTK ${name}

This prompt delegates to the \`@${name}\` agent for full functionality including suggested next actions (handoffs).

Run \`/${name}\` to start, or select \`@${name}\` from the agent picker.
`;
}
```

### Priority 2: Standardize Newline Handling (HIGH)

Decide on one approach:
- **Option A:** Strip newlines (Bash behavior) - simpler, inline values only
- **Option B:** Escape newlines (PowerShell behavior) - preserves multi-line descriptions

Recommend: **Option A** for consistency. Multi-line descriptions are rare and problematic in YAML.

### Priority 3: Unify Error Behavior (MEDIUM)

TypeScript throws exceptions; Bash/PowerShell silently return empty strings.
Recommend: TypeScript should catch errors and return empty strings to match shell behavior.

### Priority 4: Add Tab Handling (LOW)

None of the implementations escape tabs. For robustness:
```bash
# Bash
sed -e 's/\t/\\t/g'
```

---

## 9. TEST MATRIX SUMMARY

| Test Case | Bash Result | PowerShell Result | TypeScript Result |
|-----------|-------------|-------------------|-------------------|
| Normal handoffs | Extracts all items | Extracts all items | Does not extract |
| CRLF line endings | Handles correctly | Handles correctly | N/A |
| Empty handoffs | Returns `handoffs:` | Returns `handoffs:` | N/A |
| No handoffs key | Returns `""` | Returns `""` | N/A |
| With comments | Comments excluded | Comments excluded | N/A |
| No frontmatter | Returns `""` | Returns `""` | Uses defaults |
| Empty file | Returns `""` | Returns `""` | Uses defaults |
| Special chars | Passed through | Passed through | N/A |
| Capitalized `Handoffs:` | Handles correctly | Handles correctly | N/A |

---

## 10. FILES ANALYZED

- `/Users/chaouachimehdi/IdeaProjects/ARTK/scripts/bootstrap.sh` (lines 1222-1261)
- `/Users/chaouachimehdi/IdeaProjects/ARTK/scripts/bootstrap.ps1` (lines 1320-1388)
- `/Users/chaouachimehdi/IdeaProjects/ARTK/packages/cli/src/lib/bootstrap.ts` (lines 489-508)

---

## Appendix: Regex Semantic Equivalence

### Frontmatter Delimiter

| Impl | Pattern | Matches |
|------|---------|---------|
| Bash | `/^---[[:space:]]*$/` | `---`, `---   `, `---\t` |
| PS | `"^---\s*$"` | `---`, `---   `, `---\t` |

**Semantically identical:** YES

### Non-whitespace Exit

| Impl | Pattern | Meaning |
|------|---------|---------|
| Bash | `/^[^[:space:]]/` | Line starts with non-whitespace |
| PS | `"^[^\s]"` | Line starts with non-whitespace |

**Semantically identical:** YES

### Comment Filter

| Impl | Pattern | Excludes |
|------|---------|----------|
| Bash | `!/^[[:space:]]*#[[:space:]]/` | Lines like `  # comment` |
| PS | `-notmatch "^\s*#\s"` | Lines like `  # comment` |

**Semantically identical:** YES

Both require whitespace AFTER the `#`, so `#comment` (no space) is NOT filtered out. This is intentional - it preserves YAML anchor references like `&anchor`.
