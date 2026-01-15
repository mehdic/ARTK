# ARTK Output File Standardization

**Date:** 2026-01-15
**Topic:** Standardizing folder structure and file naming across all ARTK prompts

---

## Current State Analysis

### Inconsistencies Found

| Issue | Example | Problem |
|-------|---------|---------|
| **Reports in different folders** | `docs/TESTID_FIX_REPORT.md` vs `artk/reports/testid-fix-plan.json` | No single source for reports |
| **Mixed casing in filenames** | `TESTID_FIX_REPORT.md` vs `testid-fix-plan.json` | Inconsistent naming |
| **Discovery outputs scattered** | `docs/DISCOVERY.md` + `docs/discovery/*.json` | Human + machine outputs mixed |
| **No standard for machine-readable** | Some in `docs/`, some in `.artk/`, some in `reports/` | Hard to find JSON outputs |
| **Journey validation reports** | `docs/JOURNEY_VALIDATION_<id>.md` | ID in filename but inconsistent pattern |

---

## Proposed Standard

### 1. Folder Structure

```
<ARTK_ROOT>/
├── .artk/                          # ARTK internal state (gitignored partially)
│   ├── context.json                # Project context and detection cache
│   ├── validation-results.json     # Last validation run results
│   └── core/                       # Installed core systems
│       └── journeys/               # Journey Core installation
│
├── docs/                           # Human-readable documentation
│   ├── PLAYBOOK.md                 # Governance rules
│   ├── ARCHITECTURE.md             # System architecture
│   ├── ENVIRONMENTS.md             # Environment configs
│   ├── DISCOVERY.md                # App discovery summary
│   ├── TESTABILITY.md              # Testability assessment
│   └── JOURNEY_PROPOSALS.md        # Journey proposal summary
│
├── reports/                        # Generated reports (human + machine)
│   ├── discovery/                  # Discovery phase outputs
│   │   ├── routes.json
│   │   ├── features.json
│   │   ├── apis.json
│   │   ├── risk.json
│   │   └── summary.json
│   ├── testid/                     # TestID audit outputs
│   │   ├── audit-report.md         # Human-readable
│   │   └── fix-plan.json           # Machine-readable
│   ├── validation/                 # Journey validation outputs
│   │   ├── JRN-0001.md             # Per-journey validation report
│   │   └── JRN-0001.json           # Machine-readable results
│   └── verification/               # Test run outputs
│       └── latest/                 # Symlink to most recent run
│
├── journeys/                       # Journey files
│   ├── journeys.config.yml
│   ├── BACKLOG.md                  # Generated
│   ├── index.json                  # Generated
│   └── JRN-####-slug.md            # Journey files (flat or staged)
│
├── src/                            # Test source code
│   ├── modules/
│   │   ├── foundation/             # Auth, nav, selectors, data
│   │   ├── feature/                # Feature-specific modules
│   │   └── registry.json
│   └── fixtures/
│       └── test.ts
│
├── tests/                          # Test files by tier
│   ├── setup/
│   │   └── auth.setup.ts
│   ├── smoke/
│   ├── release/
│   └── regression/
│
├── config/                         # Configuration files
│   ├── env.ts
│   └── environments.json
│
├── vendor/                         # Vendored libraries
│   ├── artk-core/
│   └── artk-core-autogen/
│
├── tools/                          # Wrapper scripts
│   └── journeys/
│       ├── generate.js
│       └── validate.js
│
├── .auth-states/                   # Storage states (gitignored)
├── test-results/                   # Test artifacts (gitignored)
├── playwright-report/              # HTML reports (gitignored)
│
├── artk.config.yml                 # Main ARTK configuration
├── playwright.config.ts
├── package.json
└── tsconfig.json
```

### 2. File Naming Conventions

#### Documentation Files (Human-Readable)
- **Location:** `docs/`
- **Format:** `SCREAMING_CASE.md`
- **Examples:**
  - `PLAYBOOK.md`
  - `DISCOVERY.md`
  - `TESTABILITY.md`
  - `ARCHITECTURE.md`
  - `ENVIRONMENTS.md`
  - `JOURNEY_PROPOSALS.md`

#### Report Files (Generated)
- **Location:** `reports/<category>/`
- **Human-readable:** `kebab-case.md`
- **Machine-readable:** `kebab-case.json`
- **Per-entity reports:** Use entity ID as filename
- **Examples:**
  - `reports/testid/audit-report.md`
  - `reports/testid/fix-plan.json`
  - `reports/validation/JRN-0001.md`
  - `reports/validation/JRN-0001.json`
  - `reports/discovery/routes.json`

#### Journey Files
- **Location:** `journeys/`
- **Format:** `JRN-####-slug.md`
- **Examples:**
  - `JRN-0001-user-login.md`
  - `JRN-0042-checkout-flow.md`

#### Test Files
- **Location:** `tests/<tier>/`
- **Format:** `JRN-####__slug.spec.ts`
- **Examples:**
  - `tests/smoke/JRN-0001__user-login.spec.ts`
  - `tests/release/JRN-0042__checkout-flow.spec.ts`

#### Module Files
- **Location:** `src/modules/<category>/`
- **Format:** `kebab-case.ts`
- **Examples:**
  - `src/modules/foundation/auth/login.ts`
  - `src/modules/feature/checkout/cart-actions.ts`

#### Configuration Files
- **Location:** Root or `config/`
- **Format:** `kebab-case.ext`
- **Examples:**
  - `artk.config.yml`
  - `playwright.config.ts`
  - `config/environments.json`

### 3. Report Categories

| Category | Folder | Contents |
|----------|--------|----------|
| **discovery** | `reports/discovery/` | Routes, features, APIs, risk analysis |
| **testid** | `reports/testid/` | TestID audit and fix plans |
| **validation** | `reports/validation/` | Journey validation results |
| **verification** | `reports/verification/` | Test run reports and traces |

### 4. Managed Content Markers

All generated/managed sections use consistent markers:

```markdown
<!-- ARTK:BEGIN <section-name> -->
...managed content...
<!-- ARTK:END <section-name> -->
```

**Standard section names:**
- `environment-matrix`
- `route-inventory`
- `risk-assessment`
- `clarification`
- `deterministic-steps`
- `acceptance-criteria`
- `implementation`
- `verification`
- `testid-audit`

---

## Migration from Current State

### TestID Audit Changes

| Current | Proposed |
|---------|----------|
| `docs/TESTID_FIX_REPORT.md` | `reports/testid/audit-report.md` |
| `artk/reports/testid-fix-plan.json` | `reports/testid/fix-plan.json` |

### Discovery Changes

| Current | Proposed |
|---------|----------|
| `docs/discovery/summary.json` | `reports/discovery/summary.json` |
| `docs/discovery/routes.json` | `reports/discovery/routes.json` |
| (Keep `docs/DISCOVERY.md` as human summary) | (unchanged) |

### Validation Changes

| Current | Proposed |
|---------|----------|
| `docs/JOURNEY_VALIDATION_JRN-0001.md` | `reports/validation/JRN-0001.md` |
| (no machine output) | `reports/validation/JRN-0001.json` |

---

## Implementation Checklist

### Phase 1: Add to GENERAL_RULES.md
- [ ] Add "Output File Standards" section
- [ ] Define folder structure
- [ ] Define naming conventions

### Phase 2: Update Prompts
- [ ] `artk.testid-audit.md` - Use `reports/testid/`
- [ ] `artk.discover-foundation.md` - Use `reports/discovery/`
- [ ] `artk.journey-validate.md` - Use `reports/validation/`
- [ ] `artk.journey-verify.md` - Use `reports/verification/`

### Phase 3: Update Bootstrap
- [ ] Create `reports/` directory structure
- [ ] Update `.gitignore` for reports that should be ignored

---

## Benefits

1. **Predictable locations** - Easy to find any output
2. **Clear separation** - Human docs vs machine reports
3. **Consistent naming** - No confusion about casing
4. **Scalable** - New report types fit the pattern
5. **Tooling-friendly** - Machine outputs in known locations

---

## Open Questions

1. Should `reports/` be gitignored or committed?
   - **Recommendation:** Commit `reports/discovery/` and `reports/testid/`, gitignore `reports/verification/`

2. Should we keep `docs/discovery/*.json` or move all to `reports/discovery/`?
   - **Recommendation:** Move to `reports/discovery/`, keep `docs/DISCOVERY.md` as human summary

3. Should validation reports be per-run timestamped?
   - **Recommendation:** Keep latest only, use `.artk/validation-history.json` for history
