package com.artk.intellij.installer

import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.io.TempDir
import java.io.File
import java.nio.file.Path

class NodeDetectorTest {

    @TempDir
    lateinit var tempDir: Path

    @Test
    fun `detect from nvmrc returns correct version`() {
        val projectDir = tempDir.toFile()
        File(projectDir, ".nvmrc").writeText("20.11.0")

        val result = NodeDetector.detect(projectDir)

        assertNotNull(result)
        assertEquals("20.11.0", result?.version)
        assertEquals(20, result?.majorVersion)
        assertEquals("nvmrc", result?.source)
    }

    @Test
    fun `detect from nvmrc handles version without patch`() {
        val projectDir = tempDir.toFile()
        File(projectDir, ".nvmrc").writeText("20")

        val result = NodeDetector.detect(projectDir)

        assertNotNull(result)
        assertEquals("20", result?.version)
        assertEquals(20, result?.majorVersion)
    }

    @Test
    fun `detect from nvmrc handles lts alias`() {
        val projectDir = tempDir.toFile()
        File(projectDir, ".nvmrc").writeText("lts/*")

        val result = NodeDetector.detect(projectDir)

        // Should return null for aliases (can't determine version)
        assertNull(result?.majorVersion?.let { it > 0 } ?: false.also {
            // lts/* will try to be parsed, may fail
        })
    }

    @Test
    fun `detect from package json engines`() {
        val projectDir = tempDir.toFile()
        File(projectDir, "package.json").writeText("""
            {
                "name": "test-project",
                "engines": {
                    "node": ">=18.0.0"
                }
            }
        """.trimIndent())

        val result = NodeDetector.detect(projectDir)

        assertNotNull(result)
        assertEquals(18, result?.majorVersion)
        assertEquals("package.json", result?.source)
    }

    @Test
    fun `detect prefers nvmrc over package json`() {
        val projectDir = tempDir.toFile()
        File(projectDir, ".nvmrc").writeText("20.10.0")
        File(projectDir, "package.json").writeText("""
            {
                "engines": { "node": ">=18.0.0" }
            }
        """.trimIndent())

        val result = NodeDetector.detect(projectDir)

        assertNotNull(result)
        assertEquals(20, result?.majorVersion)
        assertEquals("nvmrc", result?.source)
    }

    @Test
    fun `detect returns path source or null when no file indicators`() {
        // L1 fix: Make test environment-independent
        // When no .nvmrc or package.json exists, detect() either:
        // 1. Returns NodeInfo with source="path" if node is in PATH
        // 2. Returns null if node is not in PATH
        // Both outcomes are valid - we just verify consistency
        val projectDir = tempDir.toFile()
        // Empty directory - no .nvmrc, no package.json

        val result = NodeDetector.detect(projectDir)

        // Either null (no node in PATH) or source must be "path"
        if (result != null) {
            assertEquals("path", result.source, "When no file indicators exist, source must be 'path'")
            assertTrue(result.majorVersion > 0, "Major version must be positive")
            assertNotNull(result.version, "Version string must not be null")
        }
        // If result is null, that's also valid (node not in PATH)
    }

    @Test
    fun `parseNodeVersion handles various formats`() {
        assertEquals(20, NodeDetector.parseNodeVersion("20.11.0"))
        assertEquals(20, NodeDetector.parseNodeVersion("v20.11.0"))
        assertEquals(18, NodeDetector.parseNodeVersion("18"))
        assertEquals(16, NodeDetector.parseNodeVersion("16.20.2"))
        assertEquals(14, NodeDetector.parseNodeVersion(">=14.0.0"))
        assertEquals(18, NodeDetector.parseNodeVersion("^18.0.0"))
    }

    @Test
    fun `parseNodeVersion returns null for invalid input`() {
        assertNull(NodeDetector.parseNodeVersion(""))
        assertNull(NodeDetector.parseNodeVersion("lts/*"))
        assertNull(NodeDetector.parseNodeVersion("latest"))
    }
}
