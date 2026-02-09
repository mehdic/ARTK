package com.artk.intellij.installer

import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Assertions.*

/**
 * Tests for BrowserDetector.
 * Tests data classes and pure functions that don't require ProcessUtils.
 * Note: detect() tests are environment-dependent (require actual browsers).
 */
class BrowserDetectorTest {

    @Test
    fun `BrowserInfo displayName returns correct names`() {
        val edgeInfo = BrowserDetector.BrowserInfo("msedge", "120.0", "/path")
        val chromeInfo = BrowserDetector.BrowserInfo("chrome", "120.0", "/path")
        val chromiumInfo = BrowserDetector.BrowserInfo("chromium", null, null)

        assertEquals("Microsoft Edge", edgeInfo.displayName)
        assertEquals("Google Chrome", chromeInfo.displayName)
        assertEquals("Playwright Chromium (bundled)", chromiumInfo.displayName)
    }

    @Test
    fun `BrowserInfo isSystemBrowser returns true for Edge and Chrome`() {
        val edgeInfo = BrowserDetector.BrowserInfo("msedge", null, null)
        val chromeInfo = BrowserDetector.BrowserInfo("chrome", null, null)
        val chromiumInfo = BrowserDetector.BrowserInfo("chromium", null, null)

        assertTrue(edgeInfo.isSystemBrowser)
        assertTrue(chromeInfo.isSystemBrowser)
        assertFalse(chromiumInfo.isSystemBrowser)
    }

    @Test
    fun `BrowserInfo data class works correctly`() {
        val info = BrowserDetector.BrowserInfo(
            channel = "chrome",
            version = "120.0.6099.71",
            path = "/usr/bin/google-chrome"
        )

        assertEquals("chrome", info.channel)
        assertEquals("120.0.6099.71", info.version)
        assertEquals("/usr/bin/google-chrome", info.path)
    }

    @Test
    fun `BrowserInfo with null version and path`() {
        val info = BrowserDetector.BrowserInfo(
            channel = "chromium",
            version = null,
            path = null
        )

        assertEquals("chromium", info.channel)
        assertNull(info.version)
        assertNull(info.path)
    }

    @Test
    fun `BrowserPreference fromString parses edge variants`() {
        assertEquals(BrowserDetector.BrowserPreference.EDGE, BrowserDetector.BrowserPreference.fromString("edge"))
        assertEquals(BrowserDetector.BrowserPreference.EDGE, BrowserDetector.BrowserPreference.fromString("msedge"))
        assertEquals(BrowserDetector.BrowserPreference.EDGE, BrowserDetector.BrowserPreference.fromString("EDGE"))
        assertEquals(BrowserDetector.BrowserPreference.EDGE, BrowserDetector.BrowserPreference.fromString("MsEdge"))
    }

    @Test
    fun `BrowserPreference fromString parses chrome`() {
        assertEquals(BrowserDetector.BrowserPreference.CHROME, BrowserDetector.BrowserPreference.fromString("chrome"))
        assertEquals(BrowserDetector.BrowserPreference.CHROME, BrowserDetector.BrowserPreference.fromString("Chrome"))
        assertEquals(BrowserDetector.BrowserPreference.CHROME, BrowserDetector.BrowserPreference.fromString("CHROME"))
    }

    @Test
    fun `BrowserPreference fromString parses chromium variants`() {
        assertEquals(BrowserDetector.BrowserPreference.CHROMIUM, BrowserDetector.BrowserPreference.fromString("chromium"))
        assertEquals(BrowserDetector.BrowserPreference.CHROMIUM, BrowserDetector.BrowserPreference.fromString("bundled"))
        assertEquals(BrowserDetector.BrowserPreference.CHROMIUM, BrowserDetector.BrowserPreference.fromString("Chromium"))
    }

    @Test
    fun `BrowserPreference fromString returns AUTO for unknown values`() {
        assertEquals(BrowserDetector.BrowserPreference.AUTO, BrowserDetector.BrowserPreference.fromString("auto"))
        assertEquals(BrowserDetector.BrowserPreference.AUTO, BrowserDetector.BrowserPreference.fromString(null))
        assertEquals(BrowserDetector.BrowserPreference.AUTO, BrowserDetector.BrowserPreference.fromString(""))
        assertEquals(BrowserDetector.BrowserPreference.AUTO, BrowserDetector.BrowserPreference.fromString("unknown"))
        assertEquals(BrowserDetector.BrowserPreference.AUTO, BrowserDetector.BrowserPreference.fromString("firefox"))
    }

    @Test
    fun `detect with CHROMIUM preference returns bundled chromium`() {
        val result = BrowserDetector.detect(BrowserDetector.BrowserPreference.CHROMIUM)

        assertEquals("chromium", result.channel)
        assertNull(result.version)
        assertNull(result.path)
        assertEquals("Playwright Chromium (bundled)", result.displayName)
        assertFalse(result.isSystemBrowser)
    }

    @Test
    fun `detect with AUTO returns valid browser info`() {
        // This test is environment-dependent but should always return a valid BrowserInfo
        val result = BrowserDetector.detect(BrowserDetector.BrowserPreference.AUTO)

        assertNotNull(result)
        assertTrue(result.channel in listOf("msedge", "chrome", "chromium"))
    }

    @Test
    fun `BrowserInfo channel values are valid Playwright channels`() {
        // All possible channels should be valid Playwright channel names
        val validChannels = listOf("chromium", "chrome", "msedge", "chrome-beta", "chrome-dev")

        val edgeInfo = BrowserDetector.BrowserInfo("msedge", null, null)
        val chromeInfo = BrowserDetector.BrowserInfo("chrome", null, null)
        val chromiumInfo = BrowserDetector.BrowserInfo("chromium", null, null)

        assertTrue(edgeInfo.channel in validChannels)
        assertTrue(chromeInfo.channel in validChannels)
        assertTrue(chromiumInfo.channel in validChannels)
    }
}
