# Claude Code CLAUDE.md Implementation Guide

**Date:** 2026-01-15
**Source:** [Claude Code Mastery](https://thedecipherist.github.io/claude-code-mastery/) by TheDecipherist
**Repository:** [github.com/TheDecipherist/claude-code-mastery](https://github.com/TheDecipherist/claude-code-mastery)

---

## Overview

This guide provides comprehensive guidance on maximizing Claude Code through global configuration files, security hooks, MCP server integration, custom commands, and skills development. The key insight: **hooks enforce rules deterministically where CLAUDE.md suggestions may fail**.

---

## Part 1: Global CLAUDE.md as Security Gatekeeper

### Memory Hierarchy

CLAUDE.md files are loaded in a specific priority order:

1. **Enterprise** - Organization-wide policies
2. **Global User** - `~/.claude/CLAUDE.md` - Personal defaults
3. **Project** - Repository root CLAUDE.md
4. **Project Local** - `.claude/CLAUDE.md` (gitignored)

The global `~/.claude/CLAUDE.md` serves dual purposes:
- Acts as a "security gatekeeper"
- Provides "project scaffolding blueprint"

This file should be defined once and inherited across all projects for consistency.

### Identity & Authentication Configuration

Your global CLAUDE.md should include your identity and account information:

```markdown
# Identity & Accounts

## GitHub
- Username: your-username
- Email: your-email@example.com

## Docker Hub
- Username: your-docker-username

## Deployment
- AWS Region: us-east-1
- Default environment: staging
```

### Critical Security Rules

Claude Code automatically reads `.env` files, making behavioral guardrails essential. Include explicit "NEVER EVER DO" rules:

```markdown
# Security Rules - NEVER EVER DO

- NEVER commit .env files or any secrets to git
- NEVER hardcode credentials, API keys, or passwords
- NEVER publish secrets to logs or console output
- NEVER expose sensitive data in error messages
- NEVER store credentials in plain text files
```

### Why CLAUDE.md Rules Aren't Enough

Community feedback indicates that **"Claude does not respect CLAUDE.md rules very rigorously"**. The rules are parsed by the LLM and potentially weighted against other context. One user reported Claude attempts to access `.env` files "a few times per week" despite explicit CLAUDE.md rules against it.

This makes **deterministic enforcement through hooks essential** for security-sensitive operations.

---

## Part 2: Global Rules for New Project Scaffolding

### Standardized Directory Structure

Define templates for all new projects in your global CLAUDE.md:

```markdown
# Project Scaffolding

## Required Files for All Projects
- `.env` - Local environment variables (never commit)
- `.env.example` - Template with dummy values (commit this)
- `.gitignore` - Must include .env, node_modules, etc.
- `.dockerignore` - Mirror of .gitignore for Docker builds
- `README.md` - Project documentation
- `CLAUDE.md` - Project-specific Claude instructions
```

### Framework-Specific Patterns

Include setup patterns for frameworks you commonly use:

```markdown
## Next.js Projects
- Use App Router (not Pages Router)
- Place components in /app/components
- Use server components by default
- Environment: NEXT_PUBLIC_ prefix for client vars

## Python Projects
- Use pyproject.toml for dependencies
- Virtual environment in .venv/
- Type hints required for all functions
- Format with black, lint with ruff

## Docker Projects
- Multi-stage builds for production
- Non-root user in production images
- Health checks required
```

### Quality Gates

Enforce quality gates before commits:

```markdown
## Pre-Commit Quality Gates
- File size limit: 500KB per file
- No TODO/FIXME in committed code
- All tests must pass
- Linting errors must be resolved
- Type checking must pass
```

---

## Part 3: MCP Servers - Claude's Integrations

### What is MCP?

Model Context Protocol (MCP) enables Claude to access external tools and services. Think of it as a plugin system for Claude Code.

### Essential MCP Servers

| Server | Purpose |
|--------|---------|
| **Context7** | Access current library documentation |
| **Playwright** | Browser automation and testing |
| **GitHub** | Repository operations |
| **PostgreSQL** | Database access |
| **Filesystem** | File system operations |

### Browser Automation Comparison

Three main options for browser automation:

| Tool | Best For | Key Features |
|------|----------|--------------|
| **Playwright MCP** | Testing/scraping | Fresh contexts, official Anthropic server |
| **Browser MCP** | Authenticated tasks | Uses your Chrome profile, local execution |
| **Browser Use** | Complex automation | AI-driven workflows, persistent cloud profiles |

**Playwright MCP**: Best for testing and scraping where you need fresh, isolated browser contexts.

**Browser MCP**: Uses your actual Chrome profile - useful for tasks requiring your logged-in sessions.

**Browser Use**: AI-driven workflows with persistent profiles, suitable for complex multi-step automation.

---

## Part 4: Context7 - Live Documentation

### The Problem

Claude's training data has a cutoff date. Library APIs change frequently, leading to outdated code suggestions.

### The Solution

Context7 provides Claude access to current library documentation beyond its training cutoff. This prevents outdated API information in generated code.

### Activation

Context7 can be activated:
- Explicitly by requesting documentation lookup
- Through context research patterns in your CLAUDE.md

```markdown
# Documentation Access

When working with libraries, use Context7 to fetch current documentation.
Always verify API signatures against current docs before generating code.
```

---

## Part 5: Custom Commands and Sub-Agents

### Slash Commands

Slash commands are stored in `.claude/commands/` and automate repetitive workflows.

**Example: Fix TypeScript Errors** (`.claude/commands/fix-types.md`):

```markdown
---
description: Fix TypeScript errors
---

Run `npx tsc --noEmit` and fix type errors.
For each error:
1. Identify root cause
2. Fix with minimal changes
3. Verify compilation
```

### Command Structure

Commands use frontmatter for metadata:

```markdown
---
description: Brief description for command listing
---

# Command Title

Instructions for Claude to follow when command is invoked.
```

### Sub-Agents

Sub-agents operate in isolated context windows, preventing pollution of the main conversation. Use them for:

- Research tasks that would clutter main context
- Parallel independent work
- Exploratory analysis

### Team Sharing

Commands can be checked into git for team sharing. Place them in:
- `.claude/commands/` - Project-specific commands
- `~/.claude/commands/` - Personal global commands

---

## Part 6: Why Single-Purpose Chats Matter

### Research Findings

Studies demonstrate significant performance degradation from topic mixing:

- **39% performance drop** when mixing topics in multi-turn conversations
- **2% early misalignment** can cascade to **40% failure rates** by conversation end
- **Recall decreases** as context grows (lost-in-the-middle problem)

### The Lost-in-the-Middle Problem

LLMs recall content at the beginning and end of context better than content in the middle. As conversations grow:

1. Attention budget stretches thin across all tokens
2. Transformers require n^2 pairwise token relationships
3. Earlier instructions get "buried" and forgotten
4. Context drift degrades accuracy

### Practical Impact

In long conversations:
- Early instructions get weighted less
- Conflicting information causes confusion
- Error recovery becomes harder
- Claude may "forget" critical rules

### Recommendations

1. **One task per chat** - Keep conversations focused
2. **Use `/clear` liberally** - Clear context between unrelated work
3. **Spawn sub-agents for research** - Prevent context bleeding
4. **Start fresh for new topics** - Don't try to pivot existing chats

---

## Part 7: Skills & Hooks - Enforcement Over Suggestion

### The Critical Difference

| Mechanism | Type | Behavior |
|-----------|------|----------|
| **CLAUDE.md rules** | Suggestions | LLM can override under pressure |
| **Hooks** | Deterministic | Always execute, cannot be bypassed |

CLAUDE.md rules are parsed by the LLM and weighted against other context. Hooks are shell commands that execute at lifecycle points - they always run.

### Hook Events

| Event | When It Fires |
|-------|---------------|
| `PreToolUse` | Before tool operations (Read, Edit, Write, Bash) |
| `PostToolUse` | After tool operations complete |
| `Stop` | At end of Claude's turn |
| `UserPromptSubmit` | When user submits a prompt |
| `SessionStart` | When a new session begins |
| `Notification` | When Claude sends a notification |

### Hook Exit Codes

| Code | Meaning |
|------|---------|
| **0** | Allow operation to proceed |
| **1** | Error (user-visible only, operation continues) |
| **2** | Block operation AND feed stderr to Claude |

Exit code 2 is crucial - it blocks the operation and sends feedback to Claude so it can adjust its approach.

### Block Secrets Access Hook

**File:** `~/.claude/hooks/block-secrets.py`

```python
#!/usr/bin/env python3
import json
import sys
from pathlib import Path

SENSITIVE_PATTERNS = {
    '.env',
    '.env.local',
    '.env.production',
    'secrets.json',
    'credentials.json',
    'id_rsa',
    'id_ed25519',
    '.npmrc',
    '.pypirc',
    'service-account.json',
    'keyfile.json'
}

def main():
    data = json.load(sys.stdin)
    file_path = data.get('tool_input', {}).get('file_path', '')
    path = Path(file_path)

    # Check filename against patterns
    if path.name in SENSITIVE_PATTERNS:
        print(f"BLOCKED: Access to '{path.name}' denied. This file contains sensitive data.", file=sys.stderr)
        sys.exit(2)

    # Check for .env anywhere in path
    if '.env' in str(path):
        print(f"BLOCKED: Access to '{path}' denied. Environment files are protected.", file=sys.stderr)
        sys.exit(2)

    # Allow operation
    sys.exit(0)

if __name__ == '__main__':
    main()
```

### Configuring Hooks in settings.json

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Read|Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "python3 ~/.claude/hooks/block-secrets.py"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/hooks/audit-bash.sh"
          }
        ]
      }
    ]
  }
}
```

### Skills

Skills are markdown files teaching Claude specific expertise. They are **progressively loaded** - only activated when relevant to the current task (should apply to <20% of conversations).

**Skill Structure** (`.claude/skills/commit-messages/SKILL.md`):

```markdown
---
name: commit-messages
description: Generate clear commit messages from git diffs.
---

# Commit Message Skill

Use conventional commit format: `type(scope): description`

Keep subject line under 72 characters.
Use imperative mood ("add" not "added").

## Types
- feat: New feature for the user
- fix: Bug fix for the user
- docs: Documentation changes
- style: Formatting, missing semicolons, etc.
- refactor: Code change that neither fixes a bug nor adds a feature
- perf: Performance improvement
- test: Adding or updating tests
- chore: Updating build tasks, package manager configs, etc.

## Examples
- feat(auth): add OAuth2 login support
- fix(api): handle null response from payment gateway
- docs(readme): update installation instructions
```

### Defense in Depth

Combine multiple layers for robust security:

1. **CLAUDE.md rules** - First line of defense, behavioral guidance
2. **Hooks** - Deterministic enforcement, cannot be bypassed
3. **Deny lists** - Explicitly blocked patterns
4. **.gitignore** - Prevent accidental commits
5. **Skills** - Teach best practices contextually

---

## Installation

### Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/TheDecipherist/claude-code-mastery.git
   cd claude-code-mastery
   ```

2. **Install hooks:**
   ```bash
   mkdir -p ~/.claude/hooks
   cp hooks/* ~/.claude/hooks/
   chmod +x ~/.claude/hooks/*
   ```

3. **Merge settings.json:**
   ```bash
   # If you have existing settings, merge manually
   # Otherwise, copy the template
   cp templates/settings.json ~/.claude/settings.json
   ```

4. **Install skills:**
   ```bash
   mkdir -p ~/.claude/skills
   cp -r skills/* ~/.claude/skills/
   ```

5. **Configure global CLAUDE.md:**
   ```bash
   cp templates/global-claude.md ~/.claude/CLAUDE.md
   # Edit with your personal settings
   ```

6. **Verify installation:**
   ```
   /hooks    # Should list installed hooks
   /skills   # Should list installed skills
   ```

### Repository Structure

```
claude-code-mastery/
├── GUIDE.md              # Complete documentation
├── README.md             # Quick start guide
├── templates/
│   ├── global-claude.md  # Global CLAUDE.md template
│   ├── project-claude.md # Project CLAUDE.md template
│   ├── settings.json     # Settings with hooks configured
│   └── .gitignore        # Standard gitignore
├── hooks/
│   ├── block-secrets.py  # Block access to sensitive files
│   ├── audit-bash.sh     # Audit bash commands
│   └── end-of-turn.sh    # End of turn validation
├── skills/
│   ├── commit-messages/  # Commit message generation
│   └── security-audit/   # Security review skill
└── commands/
    ├── new-project.md    # Project scaffolding command
    └── security-check.md # Security review command
```

---

## Best Practices Summary

### CLAUDE.md

1. **Define once, inherit everywhere** - Use global CLAUDE.md for consistency
2. **Layer project-specific rules** - Add local CLAUDE.md for project needs
3. **Update iteratively** - When Claude makes mistakes, add rules to prevent recurrence
4. **Check into git** - Share project CLAUDE.md with team

### Hooks

1. **Use for security** - Block access to secrets, dangerous commands
2. **Exit code 2** - Block AND provide feedback to Claude
3. **Test thoroughly** - Hooks run on every operation
4. **Keep them fast** - Hooks add latency to every tool call

### Context Management

1. **One task per chat** - Avoid topic mixing
2. **Use `/clear`** - Clear context between tasks
3. **Spawn sub-agents** - Isolate research from main work
4. **Start fresh** - New topic = new chat

### Skills

1. **Progressive loading** - Only load when relevant
2. **Specific expertise** - Each skill should have a clear purpose
3. **Under 20% usage** - If used more often, put in CLAUDE.md
4. **Combine with hooks** - Skills suggest, hooks enforce

---

## Key Takeaways

1. **CLAUDE.md is suggestions, hooks are rules** - Use both for defense in depth
2. **39% performance drop from topic mixing** - Keep chats focused
3. **Context rot is real** - Use `/clear` and sub-agents liberally
4. **Claude reads .env files** - Protect secrets with hooks, not just rules
5. **Skills load progressively** - Design them for specific, uncommon scenarios
6. **Check CLAUDE.md into git** - Iterate as you discover gaps

---

## Resources

- **Repository:** [github.com/TheDecipherist/claude-code-mastery](https://github.com/TheDecipherist/claude-code-mastery)
- **Website:** [thedecipherist.com](https://thedecipherist.com)
- **Guide:** [thedecipherist.github.io/claude-code-mastery](https://thedecipherist.github.io/claude-code-mastery/)

---

## License

MIT License - See repository for details.
