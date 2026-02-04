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

        assertEquals(VariantDetector.Variant.MODERN_ESM, result)
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

        assertEquals(VariantDetector.Variant.MODERN_CJS, result)
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

        assertEquals(VariantDetector.Variant.LEGACY_16, result)
    }

    @Test
    fun `detect returns LEGACY_14 for Node 14`() {
        val projectDir = tempDir.toFile()
        File(projectDir, ".nvmrc").writeText("14.21.0")

        val result = VariantDetector.detect(projectDir)

        assertEquals(VariantDetector.Variant.LEGACY_14, result)
    }

    @Test
    fun `detect defaults to MODERN_ESM when no indicators`() {
        val projectDir = tempDir.toFile()
        // No package.json, no .nvmrc

        val result = VariantDetector.detect(projectDir)

        assertEquals(VariantDetector.Variant.MODERN_ESM, result)
    }

    @Test
    fun `selectVariant correctly maps Node versions`() {
        assertEquals(VariantDetector.Variant.MODERN_ESM, VariantDetector.selectVariant(22, "esm"))
        assertEquals(VariantDetector.Variant.MODERN_ESM, VariantDetector.selectVariant(20, "esm"))
        assertEquals(VariantDetector.Variant.MODERN_ESM, VariantDetector.selectVariant(18, "esm"))
        assertEquals(VariantDetector.Variant.MODERN_CJS, VariantDetector.selectVariant(20, "cjs"))
        assertEquals(VariantDetector.Variant.LEGACY_16, VariantDetector.selectVariant(16, "cjs"))
        assertEquals(VariantDetector.Variant.LEGACY_14, VariantDetector.selectVariant(14, "cjs"))
        assertEquals(VariantDetector.Variant.LEGACY_14, VariantDetector.selectVariant(12, "cjs"))
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
    fun `getFeatureAvailability returns correct features for modern variant`() {
        val features = VariantDetector.getFeatureAvailability(VariantDetector.Variant.MODERN_ESM)

        assertTrue(features.locatorHandler)
        assertTrue(features.webFirstAssertions)
        assertTrue(features.componentTesting)
        assertTrue(features.apiTesting)
        assertTrue(features.sharding)
    }

    @Test
    fun `getFeatureAvailability returns limited features for legacy variant`() {
        val features = VariantDetector.getFeatureAvailability(VariantDetector.Variant.LEGACY_14)

        assertFalse(features.locatorHandler)
        assertFalse(features.webFirstAssertions)
        assertFalse(features.componentTesting)
        assertFalse(features.apiTesting)
        assertFalse(features.sharding)
    }
}
