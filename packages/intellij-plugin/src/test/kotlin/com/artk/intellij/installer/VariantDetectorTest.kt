package com.artk.intellij.installer

import com.intellij.testFramework.fixtures.BasePlatformTestCase

/**
 * Tests for VariantDetector - focuses on variant selection logic that doesn't require process execution.
 */
class VariantDetectorTest : BasePlatformTestCase() {

    // --- Variant enum tests ---

    fun testVariantModernEsmProperties() {
        val variant = VariantDetector.Variant.MODERN_ESM
        assertEquals("modern-esm", variant.id)
        assertEquals("esm", variant.moduleSystem)
        assertEquals("ES2022", variant.esTarget)
        assertTrue(variant.playwrightVersion.contains("1.57"))
    }

    fun testVariantModernCjsProperties() {
        val variant = VariantDetector.Variant.MODERN_CJS
        assertEquals("modern-cjs", variant.id)
        assertEquals("cjs", variant.moduleSystem)
        assertEquals("ES2022", variant.esTarget)
        assertTrue(variant.playwrightVersion.contains("1.57"))
    }

    fun testVariantLegacy16Properties() {
        val variant = VariantDetector.Variant.LEGACY_16
        assertEquals("legacy-16", variant.id)
        assertEquals("cjs", variant.moduleSystem)
        assertEquals("ES2021", variant.esTarget)
        assertTrue(variant.playwrightVersion.contains("1.49"))
    }

    fun testVariantLegacy14Properties() {
        val variant = VariantDetector.Variant.LEGACY_14
        assertEquals("legacy-14", variant.id)
        assertEquals("cjs", variant.moduleSystem)
        assertEquals("ES2020", variant.esTarget)
        assertTrue(variant.playwrightVersion.contains("1.33"))
    }

    fun testVariantFromId() {
        assertEquals(VariantDetector.Variant.MODERN_ESM, VariantDetector.Variant.fromId("modern-esm"))
        assertEquals(VariantDetector.Variant.MODERN_CJS, VariantDetector.Variant.fromId("modern-cjs"))
        assertEquals(VariantDetector.Variant.LEGACY_16, VariantDetector.Variant.fromId("legacy-16"))
        assertEquals(VariantDetector.Variant.LEGACY_14, VariantDetector.Variant.fromId("legacy-14"))
        assertNull(VariantDetector.Variant.fromId("invalid"))
    }

    // --- selectVariant tests (pure logic, no I/O) ---

    fun testSelectVariantReturnsModernEsmForNode18PlusWithEsm() {
        assertEquals(VariantDetector.Variant.MODERN_ESM, VariantDetector.selectVariant(22, true))
        assertEquals(VariantDetector.Variant.MODERN_ESM, VariantDetector.selectVariant(20, true))
        assertEquals(VariantDetector.Variant.MODERN_ESM, VariantDetector.selectVariant(18, true))
    }

    fun testSelectVariantReturnsModernCjsForNode18PlusWithoutEsm() {
        assertEquals(VariantDetector.Variant.MODERN_CJS, VariantDetector.selectVariant(22, false))
        assertEquals(VariantDetector.Variant.MODERN_CJS, VariantDetector.selectVariant(20, false))
        assertEquals(VariantDetector.Variant.MODERN_CJS, VariantDetector.selectVariant(18, false))
    }

    fun testSelectVariantReturnsLegacy16ForNode16And17() {
        assertEquals(VariantDetector.Variant.LEGACY_16, VariantDetector.selectVariant(17, false))
        assertEquals(VariantDetector.Variant.LEGACY_16, VariantDetector.selectVariant(16, false))
        assertEquals(VariantDetector.Variant.LEGACY_16, VariantDetector.selectVariant(17, true))
        assertEquals(VariantDetector.Variant.LEGACY_16, VariantDetector.selectVariant(16, true))
    }

    fun testSelectVariantReturnsLegacy14ForNodeBelow16() {
        assertEquals(VariantDetector.Variant.LEGACY_14, VariantDetector.selectVariant(15, false))
        assertEquals(VariantDetector.Variant.LEGACY_14, VariantDetector.selectVariant(14, false))
        assertEquals(VariantDetector.Variant.LEGACY_14, VariantDetector.selectVariant(12, false))
        assertEquals(VariantDetector.Variant.LEGACY_14, VariantDetector.selectVariant(10, true))
    }

    // --- parseVariant tests ---

    fun testParseVariantHandlesStandardIds() {
        assertEquals(VariantDetector.Variant.MODERN_ESM, VariantDetector.parseVariant("modern-esm"))
        assertEquals(VariantDetector.Variant.MODERN_CJS, VariantDetector.parseVariant("modern-cjs"))
        assertEquals(VariantDetector.Variant.LEGACY_16, VariantDetector.parseVariant("legacy-16"))
        assertEquals(VariantDetector.Variant.LEGACY_14, VariantDetector.parseVariant("legacy-14"))
    }

    fun testParseVariantHandlesShortAliases() {
        assertEquals(VariantDetector.Variant.MODERN_ESM, VariantDetector.parseVariant("esm"))
        assertEquals(VariantDetector.Variant.MODERN_CJS, VariantDetector.parseVariant("cjs"))
    }

    fun testParseVariantReturnsNullForAutoDetect() {
        assertNull(VariantDetector.parseVariant("auto"))
        assertNull(VariantDetector.parseVariant(null))
        assertNull(VariantDetector.parseVariant(""))
    }

    // --- getVariantFeatures tests ---

    fun testGetVariantFeaturesReturnsAllFeaturesForModernEsm() {
        val features = VariantDetector.getVariantFeatures(VariantDetector.Variant.MODERN_ESM)

        assertTrue(features["web_first_assertions"]?.available == true)
        assertTrue(features["clock_api"]?.available == true)
        assertTrue(features["expect_soft"]?.available == true)
    }

    fun testGetVariantFeaturesReturnsAllFeaturesForModernCjs() {
        val features = VariantDetector.getVariantFeatures(VariantDetector.Variant.MODERN_CJS)

        assertTrue(features["web_first_assertions"]?.available == true)
        assertTrue(features["clock_api"]?.available == true)
        assertTrue(features["expect_soft"]?.available == true)
    }

    fun testGetVariantFeaturesReturnsLimitedFeaturesForLegacy14() {
        val features = VariantDetector.getVariantFeatures(VariantDetector.Variant.LEGACY_14)

        assertTrue(features["web_first_assertions"]?.available == true)
        assertFalse(features["clock_api"]?.available == true)
        assertFalse(features["expect_soft"]?.available == true)
        assertNotNull(features["clock_api"]?.alternative)
    }

    // --- Data class tests ---

    fun testDetectionResultDataClass() {
        val result = VariantDetector.DetectionResult(
            variant = VariantDetector.Variant.MODERN_ESM,
            nodeVersion = 20,
            isEsm = true,
            source = "nvmrc"
        )

        assertEquals(VariantDetector.Variant.MODERN_ESM, result.variant)
        assertEquals(20, result.nodeVersion)
        assertTrue(result.isEsm)
        assertEquals("nvmrc", result.source)
    }

    fun testFeatureInfoDataClass() {
        val available = VariantDetector.FeatureInfo(available = true)
        val unavailable = VariantDetector.FeatureInfo(available = false, alternative = "Use workaround")

        assertTrue(available.available)
        assertNull(available.alternative)
        assertFalse(unavailable.available)
        assertEquals("Use workaround", unavailable.alternative)
    }
}
