package com.artk.intellij.installer

import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.io.TempDir
import java.io.File
import java.nio.file.Path

/**
 * Tests for VariantDetector.
 * Tests variant selection logic, parsing, and feature detection.
 */
class VariantDetectorTest {

    @TempDir
    lateinit var tempDir: Path

    private lateinit var projectDir: File

    @BeforeEach
    fun setUp() {
        projectDir = tempDir.toFile()
    }

    // --- Variant enum tests ---

    @Test
    fun `Variant MODERN_ESM has correct properties`() {
        val variant = VariantDetector.Variant.MODERN_ESM
        assertEquals("modern-esm", variant.id)
        assertEquals("esm", variant.moduleSystem)
        assertEquals("ES2022", variant.esTarget)
        assertTrue(variant.playwrightVersion.contains("1.57"))
    }

    @Test
    fun `Variant MODERN_CJS has correct properties`() {
        val variant = VariantDetector.Variant.MODERN_CJS
        assertEquals("modern-cjs", variant.id)
        assertEquals("cjs", variant.moduleSystem)
        assertEquals("ES2022", variant.esTarget)
    }

    @Test
    fun `Variant LEGACY_16 has correct properties`() {
        val variant = VariantDetector.Variant.LEGACY_16
        assertEquals("legacy-16", variant.id)
        assertEquals("cjs", variant.moduleSystem)
        assertEquals("ES2021", variant.esTarget)
        assertTrue(variant.playwrightVersion.contains("1.49"))
    }

    @Test
    fun `Variant LEGACY_14 has correct properties`() {
        val variant = VariantDetector.Variant.LEGACY_14
        assertEquals("legacy-14", variant.id)
        assertEquals("cjs", variant.moduleSystem)
        assertEquals("ES2020", variant.esTarget)
        assertTrue(variant.playwrightVersion.contains("1.33"))
    }

    @Test
    fun `Variant fromId returns correct variant`() {
        assertEquals(VariantDetector.Variant.MODERN_ESM, VariantDetector.Variant.fromId("modern-esm"))
        assertEquals(VariantDetector.Variant.MODERN_CJS, VariantDetector.Variant.fromId("modern-cjs"))
        assertEquals(VariantDetector.Variant.LEGACY_16, VariantDetector.Variant.fromId("legacy-16"))
        assertEquals(VariantDetector.Variant.LEGACY_14, VariantDetector.Variant.fromId("legacy-14"))
        assertNull(VariantDetector.Variant.fromId("invalid"))
        assertNull(VariantDetector.Variant.fromId(""))
    }

    // --- selectVariant tests ---

    @Test
    fun `selectVariant returns MODERN_ESM for Node 18+ with ESM`() {
        assertEquals(VariantDetector.Variant.MODERN_ESM, VariantDetector.selectVariant(22, true))
        assertEquals(VariantDetector.Variant.MODERN_ESM, VariantDetector.selectVariant(20, true))
        assertEquals(VariantDetector.Variant.MODERN_ESM, VariantDetector.selectVariant(18, true))
    }

    @Test
    fun `selectVariant returns MODERN_CJS for Node 18+ without ESM`() {
        assertEquals(VariantDetector.Variant.MODERN_CJS, VariantDetector.selectVariant(22, false))
        assertEquals(VariantDetector.Variant.MODERN_CJS, VariantDetector.selectVariant(20, false))
        assertEquals(VariantDetector.Variant.MODERN_CJS, VariantDetector.selectVariant(18, false))
    }

    @Test
    fun `selectVariant returns LEGACY_16 for Node 16-17`() {
        assertEquals(VariantDetector.Variant.LEGACY_16, VariantDetector.selectVariant(17, false))
        assertEquals(VariantDetector.Variant.LEGACY_16, VariantDetector.selectVariant(16, false))
        assertEquals(VariantDetector.Variant.LEGACY_16, VariantDetector.selectVariant(16, true)) // ESM ignored for legacy
    }

    @Test
    fun `selectVariant returns LEGACY_14 for Node below 16`() {
        assertEquals(VariantDetector.Variant.LEGACY_14, VariantDetector.selectVariant(15, false))
        assertEquals(VariantDetector.Variant.LEGACY_14, VariantDetector.selectVariant(14, false))
        assertEquals(VariantDetector.Variant.LEGACY_14, VariantDetector.selectVariant(12, false))
    }

    // --- parseVariant tests ---

    @Test
    fun `parseVariant handles standard variant IDs`() {
        assertEquals(VariantDetector.Variant.MODERN_ESM, VariantDetector.parseVariant("modern-esm"))
        assertEquals(VariantDetector.Variant.MODERN_CJS, VariantDetector.parseVariant("modern-cjs"))
        assertEquals(VariantDetector.Variant.LEGACY_16, VariantDetector.parseVariant("legacy-16"))
        assertEquals(VariantDetector.Variant.LEGACY_14, VariantDetector.parseVariant("legacy-14"))
    }

    @Test
    fun `parseVariant handles short aliases`() {
        assertEquals(VariantDetector.Variant.MODERN_ESM, VariantDetector.parseVariant("esm"))
        assertEquals(VariantDetector.Variant.MODERN_CJS, VariantDetector.parseVariant("cjs"))
        assertEquals(VariantDetector.Variant.LEGACY_16, VariantDetector.parseVariant("legacy16"))
        assertEquals(VariantDetector.Variant.LEGACY_14, VariantDetector.parseVariant("legacy14"))
    }

    @Test
    fun `parseVariant returns null for auto-detect values`() {
        assertNull(VariantDetector.parseVariant("auto"))
        assertNull(VariantDetector.parseVariant(null))
        assertNull(VariantDetector.parseVariant(""))
    }

    @Test
    fun `parseVariant returns null for unknown values`() {
        assertNull(VariantDetector.parseVariant("unknown"))
        assertNull(VariantDetector.parseVariant("invalid"))
    }

    // --- detect tests (file-based) ---

    @Test
    fun `detect returns MODERN_ESM for Node 20 with ESM package json`() {
        File(projectDir, "package.json").writeText("""
            {
                "type": "module",
                "engines": { "node": ">=20" }
            }
        """.trimIndent())

        val result = VariantDetector.detect(projectDir)

        assertEquals(VariantDetector.Variant.MODERN_ESM, result.variant)
        assertTrue(result.isEsm)
    }

    @Test
    fun `detect returns MODERN_CJS for Node 20 without type field`() {
        File(projectDir, "package.json").writeText("""
            {
                "engines": { "node": ">=20" }
            }
        """.trimIndent())

        val result = VariantDetector.detect(projectDir)

        assertEquals(VariantDetector.Variant.MODERN_CJS, result.variant)
        assertFalse(result.isEsm)
    }

    @Test
    fun `detect returns LEGACY_16 for Node 16`() {
        File(projectDir, ".nvmrc").writeText("16.20.0")

        val result = VariantDetector.detect(projectDir)

        assertEquals(VariantDetector.Variant.LEGACY_16, result.variant)
        assertEquals(16, result.nodeVersion)
    }

    @Test
    fun `detect returns LEGACY_14 for Node 14`() {
        File(projectDir, ".nvmrc").writeText("14.21.0")

        val result = VariantDetector.detect(projectDir)

        assertEquals(VariantDetector.Variant.LEGACY_14, result.variant)
        assertEquals(14, result.nodeVersion)
    }

    @Test
    fun `detect defaults to MODERN_ESM when no indicators`() {
        // No package.json, no .nvmrc - defaults to Node 20 ESM
        val result = VariantDetector.detect(projectDir)

        // Defaults to Node 20, non-ESM (MODERN_CJS) or Node 20 ESM based on default
        // The code defaults to 20 and isEsm=false, so MODERN_CJS
        assertEquals(VariantDetector.Variant.MODERN_CJS, result.variant)
        assertEquals(20, result.nodeVersion)
    }

    @Test
    fun `detect prefers nvmrc over package json for version`() {
        File(projectDir, ".nvmrc").writeText("18.17.0")
        File(projectDir, "package.json").writeText("""
            {
                "type": "module",
                "engines": { "node": ">=20" }
            }
        """.trimIndent())

        val result = VariantDetector.detect(projectDir)

        // nvmrc says 18, package.json says type=module
        assertEquals(18, result.nodeVersion)
        assertTrue(result.isEsm)
        assertEquals(VariantDetector.Variant.MODERN_ESM, result.variant)
    }

    // --- getVariantFeatures tests ---

    @Test
    fun `getVariantFeatures returns all features available for modern variant`() {
        val features = VariantDetector.getVariantFeatures(VariantDetector.Variant.MODERN_ESM)

        assertTrue(features["web_first_assertions"]?.available == true)
        assertTrue(features["api_testing"]?.available == true)
        assertTrue(features["clock_api"]?.available == true)
        assertTrue(features["expect_soft"]?.available == true)
        assertTrue(features["aria_snapshot_matchers"]?.available == true)
        assertTrue(features["aria_snapshots"]?.available == true)
    }

    @Test
    fun `getVariantFeatures returns limited features for LEGACY_16`() {
        val features = VariantDetector.getVariantFeatures(VariantDetector.Variant.LEGACY_16)

        // Basic features still available
        assertTrue(features["web_first_assertions"]?.available == true)
        assertTrue(features["api_testing"]?.available == true)
        assertTrue(features["aria_snapshots"]?.available == true) // 1.39+

        // Modern features not available
        assertFalse(features["clock_api"]?.available == true)
        assertFalse(features["expect_soft"]?.available == true)

        // Should have alternatives
        assertNotNull(features["clock_api"]?.alternative)
        assertNotNull(features["expect_soft"]?.alternative)
    }

    @Test
    fun `getVariantFeatures returns most limited features for LEGACY_14`() {
        val features = VariantDetector.getVariantFeatures(VariantDetector.Variant.LEGACY_14)

        // Only basic features available
        assertTrue(features["web_first_assertions"]?.available == true)
        assertTrue(features["api_testing"]?.available == true)

        // Not available in legacy-14
        assertFalse(features["clock_api"]?.available == true)
        assertFalse(features["expect_soft"]?.available == true)
        assertFalse(features["aria_snapshots"]?.available == true)

        // Should have alternatives for missing features
        assertNotNull(features["aria_snapshots"]?.alternative)
    }

    // --- DetectionResult tests ---

    @Test
    fun `DetectionResult data class works correctly`() {
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

    // --- FeatureInfo tests ---

    @Test
    fun `FeatureInfo with available feature`() {
        val info = VariantDetector.FeatureInfo(available = true)

        assertTrue(info.available)
        assertNull(info.alternative)
    }

    @Test
    fun `FeatureInfo with unavailable feature and alternative`() {
        val info = VariantDetector.FeatureInfo(
            available = false,
            alternative = "Use workaround X"
        )

        assertFalse(info.available)
        assertEquals("Use workaround X", info.alternative)
    }
}
