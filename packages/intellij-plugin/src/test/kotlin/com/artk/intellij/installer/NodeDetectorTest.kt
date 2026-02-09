package com.artk.intellij.installer

import com.intellij.testFramework.fixtures.BasePlatformTestCase
import java.io.File
import java.nio.file.Files

/**
 * Tests for NodeDetector using IntelliJ Platform test fixtures.
 */
class NodeDetectorTest : BasePlatformTestCase() {

    private lateinit var testDir: File

    override fun setUp() {
        super.setUp()
        testDir = Files.createTempDirectory("node-detector-test").toFile()
    }

    override fun tearDown() {
        try {
            testDir.deleteRecursively()
        } finally {
            super.tearDown()
        }
    }

    fun testParseNodeVersionHandlesStandardFormat() {
        assertEquals(20, NodeDetector.parseNodeVersion("20.11.0"))
        assertEquals(20, NodeDetector.parseNodeVersion("v20.11.0"))
        assertEquals(18, NodeDetector.parseNodeVersion("18"))
        assertEquals(16, NodeDetector.parseNodeVersion("16.20.2"))
    }

    fun testParseNodeVersionHandlesSemverRanges() {
        assertEquals(14, NodeDetector.parseNodeVersion(">=14.0.0"))
        assertEquals(18, NodeDetector.parseNodeVersion("^18.0.0"))
        assertEquals(20, NodeDetector.parseNodeVersion(">=20"))
    }

    fun testParseNodeVersionReturnsNullForInvalidInput() {
        assertNull(NodeDetector.parseNodeVersion(""))
        assertNull(NodeDetector.parseNodeVersion("lts/*"))
        assertNull(NodeDetector.parseNodeVersion("latest"))
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

    fun testDetectFromNvmrcHandlesVPrefix() {
        File(testDir, ".nvmrc").writeText("v18.17.0")

        val result = NodeDetector.detect(testDir)

        assertNotNull(result)
        assertEquals(18, result?.majorVersion)
        assertEquals("nvmrc", result?.source)
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
        // Empty directory - will fall through to PATH detection
        val result = NodeDetector.detect(testDir)

        // Either null (no node in PATH) or source must be "path"
        if (result != null) {
            assertEquals("path", result.source)
            assertTrue(result.majorVersion > 0)
        }
    }

    fun testNodeInfoDataClass() {
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
}
