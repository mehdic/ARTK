package com.artk.intellij.installer

import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.io.TempDir
import java.io.File
import java.nio.file.Path

class VariantDetectorTest {

    @TempDir
    lateinit var tempDir: Path

    @Test
    fun `detect returns MODERN_ESM for Node 20 with ESM`() {
        // Create package.json with type=module
        val projectDir = tempDir.toFile()
        File(projectDir, "package.json").writeText("""
            {
                "type": "module",
                "engines": { "node": ">=20" }
            }
        """.trimIndent())

        val result = VariantDetector.detect(projectDir)

        // C1 fix: extract .variant from DetectionResult
        assertEquals(VariantDetector.Variant.MODERN_ESM, result.variant)
    }

    @Test
    fun `detect returns MODERN_CJS for Node 20 without type field`() {
        val projectDir = tempDir.toFile()
        File(projectDir, "package.json").writeText("""
            {
                "engines": { "node": ">=20" }
            }
        """.trimIndent())

        val result = VariantDetector.detect(projectDir)

        // C1 fix: extract .variant from DetectionResult
        assertEquals(VariantDetector.Variant.MODERN_CJS, result.variant)
    }

    @Test
    fun `detect returns LEGACY_16 for Node 16`() {
        val projectDir = tempDir.toFile()
        File(projectDir, "package.json").writeText("""
            {
                "engines": { "node": ">=16.0.0" }
            }
        """.trimIndent())
        File(projectDir, ".nvmrc").writeText("16.20.0")

        val result = VariantDetector.detect(projectDir)

        // C1 fix: extract .variant from DetectionResult
        assertEquals(VariantDetector.Variant.LEGACY_16, result.variant)
    }

    @Test
    fun `detect returns LEGACY_14 for Node 14`() {
        val projectDir = tempDir.toFile()
        File(projectDir, ".nvmrc").writeText("14.21.0")

        val result = VariantDetector.detect(projectDir)

        // C1 fix: extract .variant from DetectionResult
        assertEquals(VariantDetector.Variant.LEGACY_14, result.variant)
    }

    @Test
    fun `detect defaults to MODERN_ESM when no indicators`() {
        val projectDir = tempDir.toFile()
        // No package.json, no .nvmrc - defaults to Node 20 ESM

        val result = VariantDetector.detect(projectDir)

        // C1 fix: extract .variant from DetectionResult
        assertEquals(VariantDetector.Variant.MODERN_ESM, result.variant)
    }

    @Test
    fun `selectVariant correctly maps Node versions`() {
        // C1 fix: use the new selectVariant() method
        assertEquals(VariantDetector.Variant.MODERN_ESM, VariantDetector.selectVariant(22, true))
        assertEquals(VariantDetector.Variant.MODERN_ESM, VariantDetector.selectVariant(20, true))
        assertEquals(VariantDetector.Variant.MODERN_ESM, VariantDetector.selectVariant(18, true))
        assertEquals(VariantDetector.Variant.MODERN_CJS, VariantDetector.selectVariant(20, false))
        assertEquals(VariantDetector.Variant.LEGACY_16, VariantDetector.selectVariant(16, false))
        assertEquals(VariantDetector.Variant.LEGACY_14, VariantDetector.selectVariant(14, false))
        assertEquals(VariantDetector.Variant.LEGACY_14, VariantDetector.selectVariant(12, false))
    }

    @Test
    fun `variant properties are correct`() {
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

    @Test
    fun `getVariantFeatures returns correct features for modern variant`() {
        // C1 fix: use getVariantFeatures() with Map-based assertions
        val features = VariantDetector.getVariantFeatures(VariantDetector.Variant.MODERN_ESM)

        // Modern variants have all features available
        assertTrue(features["web_first_assertions"]?.available == true)
        assertTrue(features["api_testing"]?.available == true)
        assertTrue(features["clock_api"]?.available == true)
        assertTrue(features["expect_soft"]?.available == true)
        assertTrue(features["aria_snapshot_matchers"]?.available == true)
    }

    @Test
    fun `getVariantFeatures returns limited features for legacy variant`() {
        // C1 fix: use getVariantFeatures() with Map-based assertions
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

    @Test
    fun `parseVariant handles various inputs`() {
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

    @Test
    fun `Variant fromId works correctly`() {
        assertEquals(VariantDetector.Variant.MODERN_ESM, VariantDetector.Variant.fromId("modern-esm"))
        assertEquals(VariantDetector.Variant.MODERN_CJS, VariantDetector.Variant.fromId("modern-cjs"))
        assertEquals(VariantDetector.Variant.LEGACY_16, VariantDetector.Variant.fromId("legacy-16"))
        assertEquals(VariantDetector.Variant.LEGACY_14, VariantDetector.Variant.fromId("legacy-14"))
        assertNull(VariantDetector.Variant.fromId("invalid"))
    }
}
