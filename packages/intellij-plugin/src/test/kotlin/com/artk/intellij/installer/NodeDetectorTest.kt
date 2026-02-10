package com.artk.intellij.installer

import com.intellij.testFramework.fixtures.BasePlatformTestCase

class NodeDetectorTest : BasePlatformTestCase() {

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

    fun testParseMajorVersionHandlesVPrefix() {
        assertEquals(20, NodeDetector.parseMajorVersion("v20.10.0"))
        assertEquals(18, NodeDetector.parseMajorVersion("v18"))
        assertEquals(14, NodeDetector.parseMajorVersion("v14.21.3"))
    }

    fun testParseMajorVersionHandlesPlainVersion() {
        assertEquals(20, NodeDetector.parseMajorVersion("20.10.0"))
        assertEquals(18, NodeDetector.parseMajorVersion("18.17.0"))
        assertEquals(16, NodeDetector.parseMajorVersion("16"))
    }

    fun testParseMajorVersionReturnsNullForInvalid() {
        assertNull(NodeDetector.parseMajorVersion(""))
        assertNull(NodeDetector.parseMajorVersion("abc"))
        assertNull(NodeDetector.parseMajorVersion("lts"))
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

    fun testNodeInfoWithNullPath() {
        val info = NodeDetector.NodeInfo(
            version = "18.17.0",
            majorVersion = 18,
            path = null,
            source = "nvmrc"
        )

        assertEquals("18.17.0", info.version)
        assertEquals(18, info.majorVersion)
        assertNull(info.path)
        assertEquals("nvmrc", info.source)
    }
}
