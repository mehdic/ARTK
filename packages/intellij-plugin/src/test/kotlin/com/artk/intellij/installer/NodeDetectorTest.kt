package com.artk.intellij.installer

import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.io.TempDir
import java.io.File
import java.nio.file.Path

/**
 * Tests for NodeDetector.
 * Tests file-based detection and pure parsing functions.
 * Note: Tests that require ProcessUtils (PATH detection) are skipped in CI.
 */
class NodeDetectorTest {

    @TempDir
    lateinit var tempDir: Path

    private lateinit var projectDir: File

    @BeforeEach
    fun setUp() {
        projectDir = tempDir.toFile()
    }

    @Test
    fun `parseNodeVersion handles standard version format`() {
        assertEquals(20, NodeDetector.parseNodeVersion("20.11.0"))
        assertEquals(20, NodeDetector.parseNodeVersion("v20.11.0"))
        assertEquals(18, NodeDetector.parseNodeVersion("18"))
        assertEquals(16, NodeDetector.parseNodeVersion("16.20.2"))
    }

    @Test
    fun `parseNodeVersion handles semver ranges`() {
        assertEquals(14, NodeDetector.parseNodeVersion(">=14.0.0"))
        assertEquals(18, NodeDetector.parseNodeVersion("^18.0.0"))
        assertEquals(20, NodeDetector.parseNodeVersion(">=20"))
    }

    @Test
    fun `parseNodeVersion returns null for invalid input`() {
        assertNull(NodeDetector.parseNodeVersion(""))
        assertNull(NodeDetector.parseNodeVersion("lts/*"))
        assertNull(NodeDetector.parseNodeVersion("latest"))
        assertNull(NodeDetector.parseNodeVersion("node"))
    }

    @Test
    fun `detect from nvmrc returns correct version`() {
        File(projectDir, ".nvmrc").writeText("20.11.0")

        val result = NodeDetector.detect(projectDir)

        assertNotNull(result)
        assertEquals("20.11.0", result?.version)
        assertEquals(20, result?.majorVersion)
        assertEquals("nvmrc", result?.source)
    }

    @Test
    fun `detect from nvmrc handles version without patch`() {
        File(projectDir, ".nvmrc").writeText("20")

        val result = NodeDetector.detect(projectDir)

        assertNotNull(result)
        assertEquals("20", result?.version)
        assertEquals(20, result?.majorVersion)
        assertEquals("nvmrc", result?.source)
    }

    @Test
    fun `detect from nvmrc handles v prefix`() {
        File(projectDir, ".nvmrc").writeText("v18.17.0")

        val result = NodeDetector.detect(projectDir)

        assertNotNull(result)
        assertEquals("v18.17.0", result?.version)
        assertEquals(18, result?.majorVersion)
        assertEquals("nvmrc", result?.source)
    }

    @Test
    fun `detect from nvmrc returns null for lts alias`() {
        File(projectDir, ".nvmrc").writeText("lts/*")

        val result = NodeDetector.detect(projectDir)

        // lts/* can't be parsed to a version number, falls through to other methods
        // Result depends on whether node is in PATH (may be null or from PATH)
        if (result != null) {
            assertNotEquals("nvmrc", result.source)
        }
    }

    @Test
    fun `detect from package json engines`() {
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
    fun `detect from package json with caret range`() {
        File(projectDir, "package.json").writeText("""
            {
                "engines": { "node": "^20.0.0" }
            }
        """.trimIndent())

        val result = NodeDetector.detect(projectDir)

        assertNotNull(result)
        assertEquals(20, result?.majorVersion)
        assertEquals("package.json", result?.source)
    }

    @Test
    fun `detect prefers nvmrc over package json`() {
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
    fun `detect returns null or path when no file indicators`() {
        // Empty directory - no .nvmrc, no package.json
        // Will fall through to PATH detection

        val result = NodeDetector.detect(projectDir)

        // Either null (no node in PATH) or source must be "path"
        if (result != null) {
            assertEquals("path", result.source)
            assertTrue(result.majorVersion > 0)
        }
        // If result is null, that's also valid (node not in PATH)
    }

    @Test
    fun `NodeInfo data class works correctly`() {
        val info = NodeDetector.NodeInfo(
            version = "20.10.0",
            majorVersion = 20,
            path = "/usr/bin/node",
            source = "path"
        )

        assertEquals("20.10.0", info.version)
        assertEquals(20, info.majorVersion)
        assertEquals("/usr/bin/node", info.path)
        assertEquals("path", info.source)
    }

    @Test
    fun `NodeInfo with null path`() {
        val info = NodeDetector.NodeInfo(
            version = "18",
            majorVersion = 18,
            path = null,
            source = "nvmrc"
        )

        assertEquals("18", info.version)
        assertEquals(18, info.majorVersion)
        assertNull(info.path)
        assertEquals("nvmrc", info.source)
    }
}
