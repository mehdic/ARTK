# Edit Safety Rules (Shared)

Use these rules for any prompt that edits files:

- Make small, targeted edits; avoid large multi-line replacements.
- After each file edit, immediately run `get_errors` and fix syntax issues before continuing.
- If a generator or formatter exists, prefer re-running it instead of manual bulk edits.
- After batch edits, run the most relevant compile/lint check available for the touched area.
