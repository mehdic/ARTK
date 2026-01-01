# ARTK Project Roadmap Analysis

**Date:** 2026-01-01
**Topic:** What's next after completing ARTK Core v1?

---

## Executive Summary

We have completed **001-artk-core-v1** (116 tasks) - the foundational TypeScript library that provides:
- Type definitions (ArtkTarget, ArtkContext, ArtkConfig, etc.)
- Zod validation schemas
- Auth harness with storage state management
- Config loader (artk.config.yml)
- Playwright fixtures (page, context, auth)
- Locator strategies
- Assertion utilities
- Data harness scaffolding
- Reporter infrastructure
- Detection modules (frontend detection, signals, submodules)

**The critical insight:** This is the **@artk/core library** - the reusable engine. But we haven't yet made it **installable** into target projects, nor have we **used it** on a real pilot.

---

## Current State vs Master Document Phases

| Master Document Phase | Status | Notes |
|-----------------------|--------|-------|
| Phase 0: Pilot Selection | **NOT STARTED** | Need to select a real pilot app |
| Phase 1: Skeleton Bootstrap (/init) | **PARTIAL** | Prompts exist, but 002 spec not implemented |
| Phase 2: Playbook + Guardrails | **PARTIAL** | Prompts exist, needs real-world testing |
| Phase 3: Journey System | **PARTIAL** | Core schema exists, generators need testing |
| Phase 4: Discovery (/discover) | **PARTIAL** | Prompt exists, untested |
| Phase 5: Journey Propose | **PARTIAL** | Prompt exists, untested |
| Phase 6: Journey Define/Clarify | **PARTIAL** | Prompts exist, untested |
| Phase 7: Foundation Build | **80% DONE** | 001-artk-core-v1 built the library! |
| Phase 8: Implement MVP Journeys | **NOT STARTED** | No pilot = no journeys |
| Phase 9: Maintenance | **NOT STARTED** | Need journeys first |
| Phase 10: Multi-Product Rollout | **NOT STARTED** | Need Phase 8-9 first |

---

## The Two Specs: How They Relate

### 001-artk-core-v1 (COMPLETED)
**What it is:** The @artk/core TypeScript library
**What it provides:**
- Core types, schemas, fixtures
- Auth, config, locators, assertions, data harness
- Detection logic for frontend discovery

**Status:** 116/116 tasks complete, merged to main

### 002-artk-e2e-independent-architecture (NOT STARTED)
**What it is:** The INSTALLATION mechanism for @artk/core
**What it solves:**
- Installing @artk/core WITHOUT conflicting with app dependencies
- Creating isolated `artk-e2e/` directory at project root
- Vendoring @artk/core to avoid npm registry issues
- Multi-target (monorepo) support

**Key Tasks:**
- Frontend detection heuristics (signals.ts, entry-detector.ts, etc.)
- Install script (`install-to-project.sh`)
- Config generator for `artk.config.yml`
- Context persistence (`.artk/context.json`)
- Update `/init` prompt to use the new architecture

**Status:** ~80+ tasks defined, 0 complete

---

## Critical Path Analysis

```
                    ┌────────────────────────────────────────┐
                    │  ARTK Core v1 Library (DONE)           │
                    │  - Types, schemas, fixtures            │
                    │  - Auth, config, locators              │
                    │  - Detection modules                   │
                    └──────────────────┬─────────────────────┘
                                       │
                                       ▼
                    ┌────────────────────────────────────────┐
                    │  002: Independent Architecture         │
                    │  - Install script for isolation        │◄─── NEXT
                    │  - Multi-target config                 │
                    │  - /init prompt integration            │
                    └──────────────────┬─────────────────────┘
                                       │
                                       ▼
                    ┌────────────────────────────────────────┐
                    │  Phase 0: Select Pilot Project         │
                    │  - ITSS (ignore/req-apps-it-service-   │
                    │    shop) is the reference project      │
                    └──────────────────┬─────────────────────┘
                                       │
                                       ▼
                    ┌────────────────────────────────────────┐
                    │  Phase 1-6: Run /init → /discover      │
                    │  → /journey-propose → /journey-define  │
                    │  → /journey-clarify                    │
                    └──────────────────┬─────────────────────┘
                                       │
                                       ▼
                    ┌────────────────────────────────────────┐
                    │  Phase 8: Implement MVP Journeys       │
                    │  - 2-3 smoke journeys                  │
                    │  - 3-7 release journeys                │
                    │  - /journey-implement                  │
                    │  - /journey-validate                   │
                    │  - /journey-verify                     │
                    └────────────────────────────────────────┘
```

---

## Recommended Next Steps (Prioritized)

### Option A: Complete 002 Spec First (Technical Purity)

**Rationale:** The 002 spec makes ARTK actually installable. Without it, we can't deploy @artk/core to any project.

**Steps:**
1. Implement 002-artk-e2e-independent-architecture tasks (~80+ tasks)
2. Create install script for isolated `artk-e2e/` directory
3. Update /init prompt to use new architecture
4. Test on ITSS reference project

**Pros:**
- Clean, complete infrastructure before pilot
- Install script is reusable across all future projects

**Cons:**
- More work before seeing end-to-end value
- 002 tasks overlap with what 001 already built (detection, signals)

### Option B: Pilot-First Approach (Practical Value)

**Rationale:** The 001 spec already built most of what 002 needs. We can manually set up ITSS as a pilot and iterate.

**Steps:**
1. Manually create `artk-e2e/` in ITSS project
2. Copy @artk/core as vendor
3. Run through Phase 0-8 manually
4. Use learnings to refine 002 spec

**Pros:**
- Faster to real value
- Real-world validation of @artk/core
- Identify gaps in prompts

**Cons:**
- Manual setup isn't repeatable
- May need to redo work when 002 is complete

### Option C: Hybrid (Recommended)

**Rationale:** 002 spec's tasks.md shows ~80% overlap with what 001 already built. We should:

1. **Audit 002 tasks.md** against 001 completion
2. **Mark done** what 001 already implemented
3. **Complete remaining 002 tasks** (likely install script + config generator)
4. **Run pilot on ITSS**

**What 001 Already Delivered (Check Against 002):**
- ✅ Signal scoring (signals.ts)
- ✅ Entry detector (entry-detector.ts)
- ✅ Frontend detector (frontend-detector.ts)
- ✅ Package scanner (package-scanner.ts)
- ✅ Directory heuristics (directory-heuristics.ts)
- ✅ Submodule checker (submodule-checker.ts)
- ✅ ArtkTarget, ArtkConfig, ArtkContext types
- ✅ Zod schemas
- ✅ Auth harness
- ✅ Config loader

**What 002 Still Needs:**
- ❌ Install script (`install-to-project.sh`)
- ❌ Config generator (`config-generator.ts` - exists but needs testing)
- ❌ /init prompt updates for independent architecture
- ❌ `.artk/context.json` persistence
- ❌ Multi-target playwright.config.ts generation

---

## The ITSS Reference Project

The master document mentions ITSS (`ignore/req-apps-it-service-shop/`) as the intended pilot:

> "The `ignore/` folder contains the ITSS project (`req-apps-it-service-shop`) as a reference for building and testing ARTK Core."

**ITSS Characteristics:**
- OIDC authentication with MFA
- Multiple user roles
- Complex UI with forms
- React-based SPA

**Using ITSS for Pilot:**
1. Create `ignore/req-apps-it-service-shop/artk-e2e/`
2. Configure for ITSS's auth patterns
3. Run /discover to understand routes
4. Propose and implement first journeys
5. Validate the entire ARTK workflow end-to-end

---

## Effort Estimates

| Task | Complexity | Estimated Tasks |
|------|------------|-----------------|
| Audit 002 vs 001 overlap | Low | 1-2 hours |
| Complete remaining 002 tasks | Medium | ~20 tasks |
| Set up ITSS pilot | Medium | ~10 tasks |
| Run Phase 0-6 on ITSS | Medium | ~20 tasks |
| Implement MVP journeys | High | ~30 tasks |

**Total remaining to "working pilot":** ~80-100 tasks

---

## Recommendation

**Proceed with Option C (Hybrid):**

1. **Immediate:** Audit specs/002 tasks.md - mark what 001 already completed
2. **Short-term:** Complete remaining 002 tasks (install script, config generator)
3. **Then:** Set up ITSS pilot with new independent architecture
4. **Finally:** Run through Phases 0-8 on ITSS

This gives us:
- A working install mechanism (002)
- A validated pilot (ITSS)
- Real-world testing of all prompts
- Foundation for Phase 10 (multi-product rollout)

---

## Questions to Resolve

1. **Is ITSS still the intended pilot?** Or is there another project?
2. **What's the priority:** Finish 002 completely, or start pilot in parallel?
3. **Are the prompts (init, discover, etc.) ready for real use?** They reference Core v1 APIs but haven't been tested end-to-end.

---

## Appendix: File Locations

| Artifact | Path |
|----------|------|
| Master Document | `docs/ARTK_Master_Launch_Document_v0.6.md` |
| 001 Spec (Core) | `specs/001-artk-core-v1/` |
| 002 Spec (Architecture) | `specs/002-artk-e2e-independent-architecture/` |
| Core TypeScript | `core/typescript/` |
| Prompts | `prompts/*.md` |
| ITSS Reference | `ignore/req-apps-it-service-shop/` |
