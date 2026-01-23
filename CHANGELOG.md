# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- **LLKB file generation location**: LLKB files now generate to `artk-e2e/llkb/` by default instead of `.artk/llkb/`. This change aligns LLKB storage with the standard ARTK test harness structure. [Migration note: Existing projects can continue using `--llkb-root .artk/llkb` flag, or migrate files manually to `artk-e2e/llkb/` and update configs]

### Added
- Documentation for `update-test` singular command alias in CLI reference
- Clarified naming conventions for CLI arguments (kebab-case) vs TypeScript properties (camelCase)

### Documentation
- Updated `docs/llkb-autogen-integration.md` with new `artk-e2e/llkb/` paths
- Added migration notes for projects using legacy `.artk/llkb/` location
- Documented CI/CD considerations for new file paths

## [1.0.0] - 2025-12-29

### Added
- Initial release of ARTK Core v1
- Config-driven test setup with YAML configuration
- OIDC authentication with storage state management
- Pre-built fixtures for authenticated testing
- Accessibility-first locator strategies
- Common assertion helpers
- Test data management with namespacing
- Journey-aware reporting
- AG Grid helpers for enterprise features
- Multi-variant build system supporting Node.js 14+, 16+, 18+ with ESM/CJS
- LLKB (Lessons Learned Knowledge Base) system
- AutoGen test generation engine

[Unreleased]: https://github.com/your-org/artk/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/your-org/artk/releases/tag/v1.0.0
