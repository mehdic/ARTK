package com.artk.intellij.installer

import com.intellij.testFramework.fixtures.BasePlatformTestCase
import java.io.File

/**
 * Tests for VariantDetector using IntelliJ Platform test fixtures.
 * Platform fixtures properly initialize SystemInfo and process APIs.
 */
class VariantDetectorTest : BasePlatformTestCase() {

    private lateinit var testDir: File

    override fun setUp() {
        super.setUp()
        testDir = createTempDir("variant-detector-test")
    }

    override fun tearDown() {
        try {
            testDir.deleteRecursively()
        } finally {
            super.tearDown()
        }
    }

    fun testDetectReturnsModernEsmForNode20WithEsm() {
        // Create package.json with type=module
        File(testDir, "package.json").writeText("""
            {
                "type": "module",
                "engines": { "node": ">=20" }
            }
        """.trimIndent())

        val result = VariantDetector.detect(testDir)

        assertEquals(VariantDetector.Variant.MODERN_ESM, result.variant)
    }

    fun testDetectReturnsModernCjsForNode20WithoutTypeField() {
        File(testDir, "package.json").writeText("""
            {
                "engines": { "node": ">=20" }
            }
        """.trimIndent())

        val result = VariantDetector.detect(testDir)

        assertEquals(VariantDetector.Variant.MODERN_CJS, result.variant)
    }

    fun testDetectReturnsLegacy16ForNode16() {
        File(testDir, "package.json").writeText("""
            {
                "engines": { "node": ">=16.0.0" }
            }
        """.trimIndent())
        File(testDir, ".nvmrc").writeText("16.20.0")

        val result = VariantDetector.detect(testDir)

        assertEquals(VariantDetector.Variant.LEGACY_16, result.variant)
    }

    fun testDetectReturnsLegacy14ForNode14() {
        File(testDir, ".nvmrc").writeText("14.21.0")

        val result = VariantDetector.detect(testDir)

        assertEquals(VariantDetector.Variant.LEGACY_14, result.variant)
    }

    fun testDetectDefaultsToModernEsmWhenNoIndicators() {
        // No package.json, no .nvmrc - defaults to Node 20 ESM

        val result = VariantDetector.detect(testDir)

        assertEquals(VariantDetector.Variant.MODERN_ESM, result.variant)
    }

    fun testSelectVariantCorrectlyMapsNodeVersions() {
        assertEquals(VariantDetector.Variant.MODERN_ESM, VariantDetector.selectVariant(22, true))
        assertEquals(VariantDetector.Variant.MODERN_ESM, VariantDetector.selectVariant(20, true))
        assertEquals(VariantDetector.Variant.MODERN_ESM, VariantDetector.selectVariant(18, true))
        assertEquals(VariantDetector.Variant.MODERN_CJS, VariantDetector.selectVariant(20, false))
        assertEquals(VariantDetector.Variant.LEGACY_16, VariantDetector.selectVariant(16, false))
        assertEquals(VariantDetector.Variant.LEGACY_14, VariantDetector.selectVariant(14, false))
        assertEquals(VariantDetector.Variant.LEGACY_14, VariantDetector.selectVariant(12, false))
    }

    fun testVariantPropertiesAreCorrect() {
        val modernEsm = VariantDetector.Variant.MODERN_ESM
        assertEquals("modern-esm", modernEsm.id)
        assertEquals("esm", modernEsm.moduleSystem)
        assertEquals("ES2022", modernEsm.esTarget)
        assertTrue(modernEsm.playwrightVersion.contains("1.57"))

        val legacy14 = VariantDetector.Variant.LEGACY_14
        assertEquals("legacy-14", legacy14.id)
        assertEquals("cjs", legacy14.moduleSystem)
        assertEquals("ES2020", legacy14.esTarget)
        assertTrue(legacy14.playwrightVersion.contains("1.33"))
    }

    fun testGetVariantFeaturesReturnsCorrectFeaturesForModernVariant() {
        val features = VariantDetector.getVariantFeatures(VariantDetector.Variant.MODERN_ESM)

        // Modern variants have all features available
        assertTrue(features["web_first_assertions"]?.available == true)
        assertTrue(features["api_testing"]?.available == true)
        assertTrue(features["clock_api"]?.available == true)
        assertTrue(features["expect_soft"]?.available == true)
        assertTrue(features["aria_snapshot_matchers"]?.available == true)
    }

    fun testGetVariantFeaturesReturnsLimitedFeaturesForLegacyVariant() {
        val features = VariantDetector.getVariantFeatures(VariantDetector.Variant.LEGACY_14)

        // Legacy 14 has limited features
        assertTrue(features["web_first_assertions"]?.available == true) // Available in all versions
        assertTrue(features["api_testing"]?.available == true)          // Available in all versions
        assertFalse(features["clock_api"]?.available == true)           // Not in legacy
        assertFalse(features["expect_soft"]?.available == true)         // Not in legacy
        assertFalse(features["aria_snapshots"]?.available == true)      // Not in legacy-14

        // Check alternatives are provided
        assertNotNull(features["clock_api"]?.alternative)
        assertNotNull(features["expect_soft"]?.alternative)
    }

    fun testParseVariantHandlesVariousInputs() {
        assertEquals(VariantDetector.Variant.MODERN_ESM, VariantDetector.parseVariant("modern-esm"))
        assertEquals(VariantDetector.Variant.MODERN_ESM, VariantDetector.parseVariant("esm"))
        assertEquals(VariantDetector.Variant.MODERN_CJS, VariantDetector.parseVariant("modern-cjs"))
        assertEquals(VariantDetector.Variant.MODERN_CJS, VariantDetector.parseVariant("cjs"))
        assertEquals(VariantDetector.Variant.LEGACY_16, VariantDetector.parseVariant("legacy-16"))
        assertEquals(VariantDetector.Variant.LEGACY_14, VariantDetector.parseVariant("legacy-14"))
        assertNull(VariantDetector.parseVariant("auto"))
        assertNull(VariantDetector.parseVariant(null))
        assertNull(VariantDetector.parseVariant(""))
        assertNull(VariantDetector.parseVariant("unknown"))
    }

    fun testVariantFromIdWorksCorrectly() {
        assertEquals(VariantDetector.Variant.MODERN_ESM, VariantDetector.Variant.fromId("modern-esm"))
        assertEquals(VariantDetector.Variant.MODERN_CJS, VariantDetector.Variant.fromId("modern-cjs"))
        assertEquals(VariantDetector.Variant.LEGACY_16, VariantDetector.Variant.fromId("legacy-16"))
        assertEquals(VariantDetector.Variant.LEGACY_14, VariantDetector.Variant.fromId("legacy-14"))
        assertNull(VariantDetector.Variant.fromId("invalid"))
    }
}
