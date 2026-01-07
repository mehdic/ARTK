Use CLAUDE.md as the AGENTS.md instructions for this repository.

## Export local commits as patches

When you cannot push from this machine (e.g., no permissions / blocked auth), export your local-only commits as patch files and apply them on another PC.

- Export patches from this repo:
	- Run: `powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\export-patches.ps1`
	- Optional: `-OutputDir C:\temp\artk-patches`

- Transfer and apply on the other PC:
	- Copy the output folder (default: `./patches/`)
	- In the repo: `git am patches/*.patch`
	- Then: `git push`
