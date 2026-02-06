# IntelliJ Plugin Remaining Gaps - Implementation Research

**Date:** 2026-02-05
**Participants:** Claude (Opus 4.5) - Claude-only analysis (octo infrastructure unavailable)
**Confidence:** 0.88

---

## Executive Summary

This document analyzes the 4 remaining gaps identified in the critical review and provides implementation recommendations based on analysis of the VS Code extension, bootstrap scripts, and IntelliJ plugin best practices.

| Gap | Complexity | Recommended Approach | Effort |
|-----|------------|---------------------|--------|
| 1. Vendor Library Bundling | High | Gradle resource bundling + build task | 3-4 hours |
| 2. Node.js Version Validation | Low | Pre-install validation check | 1 hour |
| 3. Browser Preference Config | Medium | InstallOptions enhancement | 1-2 hours |
| 4. LLKB Pattern Preservation | Medium | Dedicated merge logic | 2 hours |

**Total Estimated Effort:** 7-9 hours

---

## Gap 1: Vendor Library Bundling

### Current State
- ARTKInstaller creates **stub files** for vendor libraries (empty `module.exports = {}`)
- Users must run `npm install` to get actual @artk/core functionality
- This defeats the purpose of "bundled installation without npm registry access"

### How VS Code Extension Handles This

The VS Code extension bundles actual compiled assets:

```
vscode-extension/
├── assets/
│   ├── core/           # Compiled @artk/core
│   │   ├── package.json
│   │   └── dist/
│   │       └── index.js
│   ├── autogen/        # Compiled @artk/autogen
│   ├── prompts/        # Prompt templates
│   └── bootstrap-templates/
```

**Key insight:** The extension has a build step that copies compiled assets into the extension package.

### Recommended Implementation for IntelliJ

**Option A: Gradle Resource Bundling (Recommended)**

```kotlin
// build.gradle.kts additions
tasks.register<Copy>("bundleArtkAssets") {
    description = "Bundle ARTK core assets into plugin resources"

    // Copy compiled @artk/core
    from("../../core/typescript/dist") {
        into("artk-core/dist")
    }
    from("../../core/typescript/package.json") {
        into("artk-core")
    }

    // Copy compiled @artk/autogen
    from("../../core/typescript/autogen/dist") {
        into("artk-autogen/dist")
    }

    // Copy prompts
    from("../../prompts") {
        into("prompts")
        include("**/*.prompt.md", "**/*.agent.md")
    }

    into("src/main/resources/assets")
}

tasks.named("processResources") {
    dependsOn("bundleArtkAssets")
}
```

**Option B: Fat JAR with Assets**

Bundle assets as JAR resources and extract at install time:

```kotlin
// In ARTKInstaller.kt
private fun extractBundledAssets(targetDir: File) {
    val classLoader = this::class.java.classLoader
    val assetsUrl = classLoader.getResource("assets/artk-core")

    if (assetsUrl != null) {
        // Extract from JAR to target directory
        extractResourceDirectory("assets/artk-core", File(targetDir, "vendor/artk-core"))
    }
}
```

**Option C: Hybrid - Download Cache**

- First install: Try to download from npm, cache in plugin data directory
- Subsequent installs: Use cached assets
- Fallback: Use stub files with warning

### Recommendation

**Use Option A (Gradle Resource Bundling)** because:
1. Matches VS Code extension approach for consistency
2. Build-time bundling ensures assets are always available
3. No runtime network dependency
4. Version consistency guaranteed

### Implementation Steps

1. Create `src/main/resources/assets/` directory structure
2. Add Gradle task to copy compiled assets from `core/typescript/`
3. Modify `ARTKInstaller.installVendorLibs()` to extract from resources instead of generating stubs
4. Add fallback to stubs if resources not found (dev environment)

```kotlin
// Modified installVendorLibs
private fun installVendorLibs(artkE2eDir: File, variant: VariantDetector.Variant) {
    val resourceAssets = this::class.java.classLoader.getResource("assets/artk-core")

    if (resourceAssets != null) {
        // Production: Extract bundled assets
        extractBundledAssets(artkE2eDir)
    } else {
        // Development fallback: Generate stubs
        generateVendorStubs(artkE2eDir, variant)
    }
}
```

---

## Gap 2: Node.js Version Validation

### Current State
- User can select variant manually (e.g., `modern-esm`)
- No validation that actual Node.js version supports the selected variant
- Hardcoded `nodeVersion = 20` when variant is overridden

### Problem Scenario
```
User has Node.js 14.x installed
User selects "modern-esm" variant (requires Node 18+)
Installation succeeds but tests fail at runtime with ES2022 syntax errors
```

### Recommended Implementation

**Add validation in ARTKInstaller.install():**

```kotlin
// In ARTKInstaller.kt
private fun validateVariantCompatibility(
    requestedVariant: VariantDetector.Variant,
    targetPath: File
): ValidationResult {
    val nodeInfo = NodeDetector.detect(targetPath)
    val actualNodeVersion = nodeInfo?.majorVersion

    // If we can't detect Node, allow the install with a warning
    if (actualNodeVersion == null) {
        return ValidationResult(
            valid = true,
            warning = "Could not detect Node.js version. Please ensure Node.js ${getMinNodeVersion(requestedVariant)}+ is installed."
        )
    }

    val minRequired = getMinNodeVersion(requestedVariant)

    if (actualNodeVersion < minRequired) {
        return ValidationResult(
            valid = false,
            error = "Node.js $actualNodeVersion is incompatible with variant '${requestedVariant.id}'. " +
                    "Required: Node.js $minRequired+. " +
                    "Options: 1) Upgrade Node.js, 2) Select a compatible variant (legacy-${actualNodeVersion})"
        )
    }

    return ValidationResult(valid = true)
}

private fun getMinNodeVersion(variant: VariantDetector.Variant): Int = when (variant) {
    VariantDetector.Variant.MODERN_ESM,
    VariantDetector.Variant.MODERN_CJS -> 18
    VariantDetector.Variant.LEGACY_16 -> 16
    VariantDetector.Variant.LEGACY_14 -> 14
}

data class ValidationResult(
    val valid: Boolean,
    val error: String? = null,
    val warning: String? = null
)
```

**Integration point in install():**

```kotlin
fun install(options: InstallOptions, ...): InstallResult {
    // ... existing code ...

    // NEW: Validate variant compatibility
    val variant = if (options.variant != null && options.variant != "auto") {
        val requestedVariant = VariantDetector.parseVariant(options.variant)
            ?: return InstallResult(false, "Invalid variant: ${options.variant}")

        val validation = validateVariantCompatibility(requestedVariant, targetDir)
        if (!validation.valid) {
            return InstallResult(false, validation.error)
        }

        // Show warning if present
        validation.warning?.let { indicator?.text = "Warning: $it" }

        requestedVariant
    } else {
        // Auto-detect (existing logic)
        VariantDetector.detect(targetDir).variant
    }

    // ... rest of install ...
}
```

### Edge Cases

| Scenario | Behavior |
|----------|----------|
| Node not installed | Warning, allow install (user may install Node later) |
| Node 14 + modern-esm | **Block** with clear error message |
| Node 22 + legacy-14 | Allow (higher versions are compatible) |
| .nvmrc says 18, PATH has 14 | Use .nvmrc version (higher priority) |

---

## Gap 3: Browser Preference Configuration

### Current State
- Browser detection priority: Edge > Chrome > Chromium (bundled)
- User cannot override this priority
- On Windows with both Edge and Chrome, Edge is always selected

### User Story
> "As a developer using Chrome for manual testing, I want ARTK tests to also run in Chrome so I can debug with the same DevTools setup."

### Recommended Implementation

**1. Add browser preference to InstallOptions:**

```kotlin
data class InstallOptions(
    // ... existing fields ...
    val browserPreference: BrowserPreference = BrowserPreference.AUTO
)

enum class BrowserPreference {
    AUTO,       // Use detection priority (Edge > Chrome > Chromium)
    EDGE,       // Prefer Edge if available
    CHROME,     // Prefer Chrome if available
    CHROMIUM    // Always use bundled Chromium
}
```

**2. Modify BrowserDetector:**

```kotlin
object BrowserDetector {
    fun detect(preference: BrowserPreference = BrowserPreference.AUTO): BrowserInfo {
        return when (preference) {
            BrowserPreference.AUTO -> detectWithPriority(listOf(::detectEdge, ::detectChrome))
            BrowserPreference.EDGE -> detectEdge() ?: detectWithPriority(listOf(::detectChrome))
            BrowserPreference.CHROME -> detectChrome() ?: detectWithPriority(listOf(::detectEdge))
            BrowserPreference.CHROMIUM -> BrowserInfo(channel = "chromium", isSystemBrowser = false)
        } ?: BrowserInfo(channel = "chromium", isSystemBrowser = false)
    }

    private fun detectWithPriority(detectors: List<() -> BrowserInfo?>): BrowserInfo? {
        for (detector in detectors) {
            detector()?.let { return it }
        }
        return null
    }
}
```

**3. Add UI option in InstallOptionsDialog:**

```kotlin
// In InstallOptionsDialog.kt
row("Browser:") {
    comboBox(listOf("Auto-detect", "Prefer Edge", "Prefer Chrome", "Bundled Chromium"))
        .comment("Which browser to use for Playwright tests")
        .applyToComponent {
            selectedIndex = 0
            addActionListener {
                browserPreference = when (selectedIndex) {
                    0 -> BrowserPreference.AUTO
                    1 -> BrowserPreference.EDGE
                    2 -> BrowserPreference.CHROME
                    3 -> BrowserPreference.CHROMIUM
                    else -> BrowserPreference.AUTO
                }
            }
        }
}
```

**4. Persist preference in artk.config.yml:**

```yaml
browsers:
  channel: chrome
  strategy: prefer-chrome  # NEW: user preference
  version: "120.0.2210.91"
```

### Benefits

1. **Developer experience:** Match manual testing environment
2. **CI/CD flexibility:** Can force bundled Chromium for consistency
3. **Corporate environments:** May have policies requiring specific browsers

---

## Gap 4: LLKB Pattern Preservation

### Current State
- During force reinstall, `.artk` directory is backed up
- If restore fails, LLKB patterns are lost
- No specific handling for `learned-patterns.json` (the most valuable LLKB artifact)

### Value at Risk
LLKB patterns represent accumulated project-specific learning:
- Test selectors that worked
- Timing patterns for slow operations
- Authentication sequences
- Custom assertion patterns

**Losing this data means re-learning from scratch**, potentially adding hours to test authoring.

### Recommended Implementation

**1. Dedicated LLKB preservation before backup:**

```kotlin
private fun preserveLlkbPatterns(artkE2eDir: File): File? {
    val llkbDir = File(artkE2eDir, ".artk/llkb")
    val learnedPatterns = File(llkbDir, "learned-patterns.json")

    if (!learnedPatterns.exists()) return null

    // Create dedicated preservation location (outside artk-e2e)
    val preserveDir = File(artkE2eDir.parentFile, ".artk-preserved")
    preserveDir.mkdirs()

    val timestamp = System.currentTimeMillis()
    val preservedFile = File(preserveDir, "learned-patterns-$timestamp.json")

    learnedPatterns.copyTo(preservedFile, overwrite = true)

    return preservedFile
}
```

**2. LLKB merge after reinstall:**

```kotlin
private fun mergeLlkbPatterns(
    artkE2eDir: File,
    preservedFile: File?
) {
    if (preservedFile == null || !preservedFile.exists()) return

    val newLlkbDir = File(artkE2eDir, ".artk/llkb")
    val newLearnedPatterns = File(newLlkbDir, "learned-patterns.json")

    if (!newLearnedPatterns.exists()) {
        // New install has no patterns - just copy preserved
        preservedFile.copyTo(newLearnedPatterns, overwrite = true)
        return
    }

    // Merge patterns
    try {
        val preserved = gson.fromJson(preservedFile.readText(), LearnedPatterns::class.java)
        val current = gson.fromJson(newLearnedPatterns.readText(), LearnedPatterns::class.java)

        val merged = mergePatterns(preserved, current)
        newLearnedPatterns.writeText(gson.toJson(merged))

    } catch (e: Exception) {
        // Merge failed - preserve original as fallback
        preservedFile.copyTo(
            File(newLlkbDir, "learned-patterns-preserved.json"),
            overwrite = true
        )
    }
}

private fun mergePatterns(old: LearnedPatterns, new: LearnedPatterns): LearnedPatterns {
    // Strategy: Keep all old patterns, add new ones, update confidence for duplicates
    val mergedPatterns = mutableMapOf<String, Pattern>()

    // Add old patterns
    for (pattern in old.patterns) {
        mergedPatterns[pattern.normalizedText] = pattern
    }

    // Merge new patterns
    for (pattern in new.patterns) {
        val existing = mergedPatterns[pattern.normalizedText]
        if (existing != null) {
            // Update confidence using weighted average
            val mergedConfidence = (existing.confidence * existing.successCount +
                                    pattern.confidence * pattern.successCount) /
                                   (existing.successCount + pattern.successCount)
            mergedPatterns[pattern.normalizedText] = pattern.copy(
                confidence = mergedConfidence,
                successCount = existing.successCount + pattern.successCount,
                sourceJourneys = (existing.sourceJourneys + pattern.sourceJourneys).distinct()
            )
        } else {
            mergedPatterns[pattern.normalizedText] = pattern
        }
    }

    return LearnedPatterns(
        version = new.version,
        lastUpdated = Instant.now().toString(),
        patterns = mergedPatterns.values.toList()
    )
}
```

**3. Integration in install():**

```kotlin
fun install(options: InstallOptions, ...): InstallResult {
    val targetDir = options.targetPath.toFile()
    val artkE2eDir = File(targetDir, "artk-e2e")

    // NEW: Preserve LLKB before any destructive operations
    val preservedLlkb = if (options.force && artkE2eDir.exists()) {
        preserveLlkbPatterns(artkE2eDir)
    } else null

    // ... existing install logic ...

    // NEW: Restore/merge LLKB patterns after install
    if (preservedLlkb != null) {
        mergeLlkbPatterns(artkE2eDir, preservedLlkb)

        // Clean up preservation file after successful merge
        preservedLlkb.delete()
    }

    return InstallResult(success = true, ...)
}
```

### Cleanup Policy

Keep preservation files for 7 days in case of issues:

```kotlin
private fun cleanupOldPreservations(preserveDir: File) {
    val sevenDaysAgo = System.currentTimeMillis() - (7 * 24 * 60 * 60 * 1000)

    preserveDir.listFiles()
        ?.filter { it.name.startsWith("learned-patterns-") }
        ?.filter { it.lastModified() < sevenDaysAgo }
        ?.forEach { it.delete() }
}
```

---

## Implementation Priority

### Phase 1: Quick Wins (1-2 hours)
1. **Node.js version validation** - Prevents user frustration from mismatched variants
2. **Browser preference** - Simple UX improvement

### Phase 2: Core Functionality (3-4 hours)
3. **LLKB pattern preservation** - Protects valuable accumulated learning

### Phase 3: Full Feature Parity (3-4 hours)
4. **Vendor library bundling** - Completes offline installation capability

---

## Testing Strategy

### Unit Tests Needed

| Gap | Test Cases |
|-----|------------|
| Node validation | Node 14 + modern-esm → error; Node 22 + legacy-14 → ok |
| Browser preference | AUTO returns Edge; CHROME skips Edge |
| LLKB preservation | Patterns survive force reinstall |
| Vendor bundling | Resources extracted correctly |

### Integration Test

```kotlin
@Test
fun `force reinstall preserves LLKB patterns`() {
    // 1. Install ARTK
    // 2. Add some learned patterns to LLKB
    // 3. Force reinstall with --force
    // 4. Verify patterns are preserved
}
```

---

## Conclusion

The 4 remaining gaps are all solvable with reasonable effort. The recommended approach:

1. **Start with Node.js validation** - Quick win, prevents user errors
2. **Add browser preference** - Improves developer experience
3. **Implement LLKB preservation** - Protects project investment
4. **Add vendor bundling last** - Most complex, requires build pipeline changes

Total effort: 7-9 hours for full implementation.

---

*Research conducted by Claude (Opus 4.5)*
*Note: Multi-LLM review via octo infrastructure was unavailable. This is a single-model analysis.*
