package com.artk.intellij.installer

import com.intellij.testFramework.fixtures.BasePlatformTestCase
import java.io.File

/**
 * Tests for NodeDetector using IntelliJ Platform test fixtures.
 * Platform fixtures properly initialize SystemInfo and process APIs.
 */
class NodeDetectorTest : BasePlatformTestCase() {

    private lateinit var testDir: File

    override fun setUp() {
        super.setUp()
        testDir = createTempDir("node-detector-test")
    }

    override fun tearDown() {
        try {
            testDir.deleteRecursively()
        } finally {
            super.tearDown()
        }
    }

    fun testDetectFromNvmrcReturnsCorrectVersion() {
        File(testDir, ".nvmrc").writeText("20.11.0")

        val result = NodeDetector.detect(testDir)

        assertNotNull(result)
        assertEquals("20.11.0", result?.version)
        assertEquals(20, result?.majorVersion)
        assertEquals("nvmrc", result?.source)
    }

    fun testDetectFromNvmrcHandlesVersionWithoutPatch() {
        File(testDir, ".nvmrc").writeText("20")

        val result = NodeDetector.detect(testDir)

        assertNotNull(result)
        assertEquals("20", result?.version)
        assertEquals(20, result?.majorVersion)
    }

    fun testDetectFromNvmrcHandlesLtsAlias() {
        File(testDir, ".nvmrc").writeText("lts/*")

        val result = NodeDetector.detect(testDir)

        // Should return null for aliases (can't determine version from lts/*)
        // Or it may fall back to PATH detection
        if (result != null && result.source == "nvmrc") {
            // If parsed from nvmrc, major version should be null or invalid
            fail("lts/* should not be parseable as a version from nvmrc")
        }
        // Otherwise it fell back to PATH or returned null - both valid
    }

    fun testDetectFromPackageJsonEngines() {
        File(testDir, "package.json").writeText("""
            {
                "name": "test-project",
                "engines": {
                    "node": ">=18.0.0"
                }
            }
        """.trimIndent())

        val result = NodeDetector.detect(testDir)

        assertNotNull(result)
        assertEquals(18, result?.majorVersion)
        assertEquals("package.json", result?.source)
    }

    fun testDetectPrefersNvmrcOverPackageJson() {
        File(testDir, ".nvmrc").writeText("20.10.0")
        File(testDir, "package.json").writeText("""
            {
                "engines": { "node": ">=18.0.0" }
            }
        """.trimIndent())

        val result = NodeDetector.detect(testDir)

        assertNotNull(result)
        assertEquals(20, result?.majorVersion)
        assertEquals("nvmrc", result?.source)
    }

    fun testDetectReturnsPathSourceOrNullWhenNoFileIndicators() {
        // Empty directory - no .nvmrc, no package.json
        // detect() will try PATH detection

        val result = NodeDetector.detect(testDir)

        // Either null (no node in PATH) or source must be "path"
        if (result != null) {
            assertEquals("path", result.source)
            assertTrue(result.majorVersion > 0)
            assertNotNull(result.version)
        }
        // If result is null, that's also valid (node not in PATH)
    }

    fun testParseNodeVersionHandlesVariousFormats() {
        assertEquals(20, NodeDetector.parseNodeVersion("20.11.0"))
        assertEquals(20, NodeDetector.parseNodeVersion("v20.11.0"))
        assertEquals(18, NodeDetector.parseNodeVersion("18"))
        assertEquals(16, NodeDetector.parseNodeVersion("16.20.2"))
        assertEquals(14, NodeDetector.parseNodeVersion(">=14.0.0"))
        assertEquals(18, NodeDetector.parseNodeVersion("^18.0.0"))
    }

    fun testParseNodeVersionReturnsNullForInvalidInput() {
        assertNull(NodeDetector.parseNodeVersion(""))
        assertNull(NodeDetector.parseNodeVersion("lts/*"))
        assertNull(NodeDetector.parseNodeVersion("latest"))
    }
}
