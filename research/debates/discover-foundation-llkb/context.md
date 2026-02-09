# Debate: Enhancing discover-foundation for LLKB Pattern Generation

**Debate ID**: discover-foundation-llkb
**Rounds**: 1
**Style**: thorough
**Advisors**: gemini, codex, claude
**Started**: 2026-02-04

## Question

How should the `/artk.discover-foundation` prompt be enhanced to analyze the target application and build an initial set of LLKB patterns that are specific and beneficial to that app?

## Sub-Questions

1. **What should discover-foundation analyze?** (selectors, auth flows, common UI patterns, framework)
2. **How should it extract patterns?** (static analysis, runtime DOM crawling, existing test analysis)
3. **How to balance generic patterns vs app-specific patterns?**
4. **What's the minimum viable approach vs comprehensive approach?**

## Context

ARTK (Automatic Regression Testing Kit) uses LLKB (Lessons Learned Knowledge Base) to store patterns that help AutoGen generate better Playwright tests. Currently:

- LLKB has 79 seed patterns from generic E2E test scenarios
- Patterns are stored in `.artk/llkb/learned-patterns.json`
- Pattern matching uses fuzzy matching (Levenshtein similarity >= 0.7)
- Patterns map natural language steps to IR primitives (click, fill, navigate, etc.)
- ~82% of test steps can be handled by the 84 core patterns
- ~18% of steps become TODO comments due to missing patterns

## Goal

Make LLKB immediately useful for each new project by having discover-foundation:
1. Analyze the target application during foundation discovery
2. Generate app-specific patterns that augment the generic seed patterns
3. Reduce the ~18% TODO rate by providing better context-specific patterns
