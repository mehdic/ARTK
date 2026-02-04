package com.artk.intellij.installer

import java.io.File

/**
 * Detects appropriate ARTK variant based on Node.js version and module system
 * Matches VS Code extension behavior exactly
 */
object VariantDetector {

    /**
     * Available ARTK variants
     */
    enum class Variant(
        val id: String,
        val displayName: String,
        val nodeRange: String,
        val playwrightVersion: String,
        val moduleSystem: String,
        val esTarget: String
    ) {
        MODERN_ESM(
            id = "modern-esm",
            displayName = "Modern ESM",
            nodeRange = "18, 20, 22 (LTS)",
            playwrightVersion = "^1.57.0",
            moduleSystem = "esm",
            esTarget = "ES2022"
        ),
        MODERN_CJS(
            id = "modern-cjs",
            displayName = "Modern CJS",
            nodeRange = "18, 20, 22 (LTS)",
            playwrightVersion = "^1.57.0",
            moduleSystem = "cjs",
            esTarget = "ES2022"
        ),
        LEGACY_16(
            id = "legacy-16",
            displayName = "Legacy Node 16",
            nodeRange = "16, 18, 20 (LTS)",
            playwrightVersion = "^1.49.0",
            moduleSystem = "cjs",
            esTarget = "ES2021"
        ),
        LEGACY_14(
            id = "legacy-14",
            displayName = "Legacy Node 14",
            nodeRange = "14, 16, 18 (LTS)",
            playwrightVersion = "^1.33.0",
            moduleSystem = "cjs",
            esTarget = "ES2020"
        );

        companion object {
            fun fromId(id: String): Variant? = entries.find { it.id == id }
        }
    }

    data class DetectionResult(
        val variant: Variant,
        val nodeVersion: Int,
        val isEsm: Boolean,
        val source: String
    )

    /**
     * Detect appropriate variant for the target project
     */
    fun detect(targetPath: File): DetectionResult {
        // Get Node.js version
        val nodeInfo = NodeDetector.detect(targetPath)
        val majorVersion = nodeInfo?.majorVersion ?: 20 // Default to Node 20

        // Check package.json for module type
        val isEsm = detectModuleType(targetPath)

        // Determine variant
        val variant = when {
            majorVersion >= 18 -> if (isEsm) Variant.MODERN_ESM else Variant.MODERN_CJS
            majorVersion >= 16 -> Variant.LEGACY_16
            else -> Variant.LEGACY_14
        }

        return DetectionResult(
            variant = variant,
            nodeVersion = majorVersion,
            isEsm = isEsm,
            source = nodeInfo?.source ?: "default"
        )
    }

    /**
     * Detect if project uses ES Modules
     */
    private fun detectModuleType(targetPath: File): Boolean {
        val pkgFile = File(targetPath, "package.json")
        if (!pkgFile.exists()) return false

        return try {
            val content = pkgFile.readText()
            // Check for "type": "module"
            Regex(""""type"\s*:\s*"module"""").containsMatchIn(content)
        } catch (e: Exception) {
            false
        }
    }

    /**
     * Parse variant from string (for user override)
     */
    fun parseVariant(value: String?): Variant? {
        return when (value?.lowercase()) {
            "auto", null, "" -> null // Auto-detect
            "modern-esm", "esm" -> Variant.MODERN_ESM
            "modern-cjs", "cjs" -> Variant.MODERN_CJS
            "legacy-16", "legacy16" -> Variant.LEGACY_16
            "legacy-14", "legacy14" -> Variant.LEGACY_14
            else -> null
        }
    }

    /**
     * Get variant-specific Playwright features availability
     */
    fun getVariantFeatures(variant: Variant): Map<String, FeatureInfo> {
        val isLegacy14 = variant == Variant.LEGACY_14
        val isLegacy16 = variant == Variant.LEGACY_16
        val isLegacy = isLegacy14 || isLegacy16

        return mapOf(
            // Available in all versions (Playwright 1.33+)
            "route_from_har" to FeatureInfo(true),
            "locator_filter" to FeatureInfo(true),
            "web_first_assertions" to FeatureInfo(true),
            "trace_viewer" to FeatureInfo(true),
            "api_testing" to FeatureInfo(true),

            // Playwright 1.39+ features (not in legacy-14)
            "aria_snapshots" to FeatureInfo(
                available = !isLegacy14,
                alternative = if (isLegacy14) "Use page.locator(\"[role=...]\") with manual ARIA queries" else null
            ),
            "locator_or" to FeatureInfo(
                available = !isLegacy14,
                alternative = if (isLegacy14) "Use CSS selector with comma: page.locator(\"sel1, sel2\")" else null
            ),
            "locator_and" to FeatureInfo(
                available = !isLegacy14,
                alternative = if (isLegacy14) "Chain locators: page.locator(\"sel1\").locator(\"sel2\")" else null
            ),

            // Playwright 1.45+ features (not in legacy-14 or legacy-16)
            "clock_api" to FeatureInfo(
                available = !isLegacy,
                alternative = if (isLegacy) "Use page.addInitScript() to mock Date" else null
            ),
            "expect_soft" to FeatureInfo(
                available = !isLegacy,
                alternative = if (isLegacy) "Collect assertions in array and check at end" else null
            ),

            // Playwright 1.49+ features (only modern)
            "aria_snapshot_matchers" to FeatureInfo(
                available = !isLegacy,
                alternative = if (isLegacy) "Use toHaveAttribute for ARIA attributes" else null
            )
        )
    }

    data class FeatureInfo(
        val available: Boolean,
        val alternative: String? = null
    )
}
