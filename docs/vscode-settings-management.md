# VS Code Settings Management

This document describes how ARTK manages VS Code settings during bootstrap, including Copilot tool auto-approve configuration.

## Overview

ARTK bootstrap installs a `.vscode/settings.json` file that enables GitHub Copilot features required for autonomous test generation workflows. The settings include:

- **Agent mode** - Enables Copilot's autonomous code generation
- **Terminal auto-approve** - Allows safe commands to run without confirmation
- **URL auto-approve** - Allows fetching from trusted documentation sites

## Bootstrap Options

### `--yes` / `-Yes` / `-y`

Skip all confirmation prompts and auto-approve changes.

```bash
# Bash
./scripts/bootstrap.sh ~/project --yes

# PowerShell
.\scripts\bootstrap.ps1 C:\project -Yes
```

**Use cases:**
- CI/CD pipelines
- Automated setup scripts
- When you trust ARTK's defaults

### `--dry-run` / `-DryRun`

Preview what changes would be made without actually applying them.

```bash
# Bash
./scripts/bootstrap.sh ~/project --dry-run

# PowerShell
.\scripts\bootstrap.ps1 C:\project -DryRun
```

**Output shows:**
- New settings that would be added
- Nested objects that would be deep-merged
- Arrays that would be extended
- Conflicts with ARTK requirements
- Whether comments would be lost

## Settings Merge Behavior

When an existing `.vscode/settings.json` is found, ARTK performs a **safe merge**:

### What Gets Added

| Category | Behavior |
|----------|----------|
| **New keys** | Added to your settings |
| **Nested objects** | Deep-merged (your keys preserved, new keys added) |
| **Arrays** | Union merge (your items kept, new items appended) |
| **Existing values** | **Never overwritten** |

### Example Merge

**Your existing settings:**
```json
{
  "editor.fontSize": 14,
  "chat.tools.urls.autoApprove": ["https://mycompany.com/*"],
  "files.associations": {
    "*.custom": "json"
  }
}
```

**ARTK template:**
```json
{
  "chat.agent.enabled": true,
  "chat.tools.urls.autoApprove": ["https://playwright.dev/*", "https://nodejs.org/*"],
  "files.associations": {
    "*.prompt.md": "markdown"
  }
}
```

**Result after merge:**
```json
{
  "editor.fontSize": 14,
  "chat.agent.enabled": true,
  "chat.tools.urls.autoApprove": [
    "https://mycompany.com/*",
    "https://playwright.dev/*",
    "https://nodejs.org/*"
  ],
  "files.associations": {
    "*.custom": "json",
    "*.prompt.md": "markdown"
  }
}
```

### Backup Creation

Before any merge, a timestamped backup is created:

```
.vscode/settings.json.backup-20260130-143022
```

If the merge fails, the backup is automatically restored.

### Comment Loss Warning

VS Code settings files often contain JSONC comments (`//` or `/* */`). Since JSON doesn't support comments, they are **removed during merge**.

The bootstrap script:
1. Detects if your file has comments
2. Warns you explicitly before proceeding
3. Creates a backup (preserves your commented version)

```
⚠ Warning: Your settings.json contains comments.
  Comments will be REMOVED during merge (JSON limitation).
  A backup will be created.
```

### Conflict Detection

ARTK requires certain settings to be enabled. If your settings conflict, you're warned:

```
⚠ Conflicts with ARTK requirements (will NOT be changed):
  ! chat.tools.terminal.enableAutoApprove (yours: false, ARTK needs: true)
  ARTK prompts may require manual approval for each command.
```

**Critical settings ARTK needs:**
- `chat.tools.terminal.enableAutoApprove: true`
- `github.copilot.chat.terminalAccess.enabled: true`
- `github.copilot.chat.agent.runInTerminal: true`

## Terminal Command Auto-Approve

ARTK configures pattern-based auto-approval for terminal commands.

### Allowed Commands (Auto-Approved)

| Category | Commands |
|----------|----------|
| **Git (read-only)** | `git status`, `git diff`, `git log`, `git show`, `git branch`, `git fetch` |
| **npm/yarn/pnpm** | `npm test`, `npm run build`, `npm run lint`, `yarn test`, `pnpm test` |
| **npx (specific packages)** | `npx playwright`, `npx artk-autogen`, `npx tsc`, `npx tsup`, `npx vitest`, `npx jest`, `npx prettier`, `npx eslint` |
| **Directory operations** | `ls`, `dir`, `pwd`, `cd`, `find`, `wc` |
| **Search** | `grep`, `rg` |

### Blocked Commands (Always Require Confirmation)

| Category | Commands | Reason |
|----------|----------|--------|
| **Destructive file ops** | `rm`, `rmdir`, `del`, `Remove-Item` | Could delete important files |
| **Process control** | `kill`, `pkill`, `killall` | Could terminate critical processes |
| **Network** | `curl`, `wget` | Security risk - could exfiltrate data |
| **Permissions** | `chmod`, `chown`, `sudo` | System security |
| **Code execution** | `eval`, `exec` | Arbitrary code execution |
| **Dangerous git** | `git push --force`, `git reset --hard`, `git clean -fd` | Could lose work |

### Security Note: npx Restrictions

Unlike a blanket `npx` allowlist, ARTK only auto-approves **specific known-safe packages**:

```json
"/^npx\\s+(playwright|artk-autogen|tsc|tsup|vitest|jest|prettier|eslint)\\b/": true
```

This prevents attacks like:
```bash
npx malicious-package@latest  # BLOCKED - requires confirmation
npx -c "rm -rf /"             # BLOCKED - requires confirmation
```

### File Content Commands Removed

Commands like `cat`, `head`, `tail`, `less`, `more` are **not auto-approved** because they can leak sensitive data:

```bash
cat ~/.ssh/id_rsa           # Could expose SSH keys
head -100 ~/.aws/credentials # Could expose AWS secrets
```

## URL Fetch Auto-Approve

The `#fetch` tool can auto-approve requests to trusted documentation sites:

```json
"chat.tools.urls.autoApprove": [
  "https://playwright.dev/*",
  "https://code.visualstudio.com/*",
  "https://docs.github.com/*",
  "https://nodejs.org/*",
  "https://www.npmjs.com/*",
  "https://developer.mozilla.org/*"
]
```

## Fallback Mode

If JSON parsing fails (complex comments, malformed JSON), bootstrap falls back to **text-based append**:

1. Searches for essential settings as text patterns
2. Appends missing settings before the closing `}`
3. Preserves your existing file structure

This ensures ARTK's minimum requirements are met even when full merge isn't possible.

## PowerShell 5.1 Compatibility

The PowerShell script works on both:
- **PowerShell 5.1** (Windows default)
- **PowerShell 7+** (cross-platform)

It uses a custom `ConvertTo-Hashtable` function instead of the PS7-only `-AsHashtable` parameter.

## Full Settings Template

The complete settings template is at `templates/vscode/settings.json` and includes:

- Copilot agent mode settings
- Terminal command auto-approve patterns
- URL fetch auto-approve list
- Legacy Copilot settings (backward compatibility)
- Editor settings for TypeScript
- Playwright test explorer integration
- File associations and search exclusions

## Troubleshooting

### "ARTK prompts require manual approval"

Your settings have `enableAutoApprove: false`. Either:
1. Change it to `true` in your settings
2. Accept manual confirmation for each command

### "Comments will be removed"

Back up your commented settings file before merging, or decline the merge and manually add the required settings.

### "Could not parse settings.json"

Your settings file has syntax errors or unsupported comment styles. The script will use fallback mode to append essential settings.

### Restore from Backup

```bash
# Find your backup
ls .vscode/settings.json.backup-*

# Restore it
cp .vscode/settings.json.backup-20260130-143022 .vscode/settings.json
```
