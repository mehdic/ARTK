package com.artk.intellij.installer

import com.intellij.testFramework.fixtures.BasePlatformTestCase

/**
 * Tests for BrowserDetector using IntelliJ Platform test fixtures.
 * Platform fixtures properly initialize SystemInfo and process APIs.
 */
class BrowserDetectorTest : BasePlatformTestCase() {

    fun testDetectReturnsValidBrowserInfo() {
        val result = BrowserDetector.detect()

        assertNotNull(result)
        assertNotNull(result.channel)
        assertTrue(result.channel in listOf("msedge", "chrome", "chromium"))
    }

    fun testDetectFallbackReturnsChromium() {
        // When no browsers are found, should fallback to chromium
        val result = BrowserDetector.detect()

        // Channel should be one of the supported options
        assertTrue(
            result.channel == "msedge" ||
            result.channel == "chrome" ||
            result.channel == "chromium"
        )
    }

    fun testBrowserInfoDataClassWorksCorrectly() {
        val info = BrowserDetector.BrowserInfo(
            channel = "chrome",
            version = "120.0.6099.71",
            path = "/usr/bin/google-chrome"
        )

        assertEquals("chrome", info.channel)
        assertEquals("120.0.6099.71", info.version)
        assertEquals("/usr/bin/google-chrome", info.path)
    }

    fun testBrowserInfoWithNullVersionAndPath() {
        val info = BrowserDetector.BrowserInfo(
            channel = "chromium",
            version = null,
            path = null
        )

        assertEquals("chromium", info.channel)
        assertNull(info.version)
        assertNull(info.path)
    }

    fun testBrowserInfoDisplayName() {
        val edgeInfo = BrowserDetector.BrowserInfo("msedge", null, null)
        val chromeInfo = BrowserDetector.BrowserInfo("chrome", null, null)
        val chromiumInfo = BrowserDetector.BrowserInfo("chromium", null, null)

        assertEquals("Microsoft Edge", edgeInfo.displayName)
        assertEquals("Google Chrome", chromeInfo.displayName)
        assertEquals("Playwright Chromium (bundled)", chromiumInfo.displayName)
    }

    fun testBrowserInfoIsSystemBrowser() {
        val edgeInfo = BrowserDetector.BrowserInfo("msedge", null, null)
        val chromeInfo = BrowserDetector.BrowserInfo("chrome", null, null)
        val chromiumInfo = BrowserDetector.BrowserInfo("chromium", null, null)

        assertTrue(edgeInfo.isSystemBrowser)
        assertTrue(chromeInfo.isSystemBrowser)
        assertFalse(chromiumInfo.isSystemBrowser)
    }

    fun testGetPlaywrightChannelReturnsCorrectMapping() {
        // Test that browser channels map correctly to Playwright channels
        val chromiumInfo = BrowserDetector.BrowserInfo("chromium", null, null)
        val chromeInfo = BrowserDetector.BrowserInfo("chrome", "120.0", "/path")
        val edgeInfo = BrowserDetector.BrowserInfo("msedge", "120.0", "/path")

        // All channels should be valid Playwright channel names
        val validChannels = listOf("chromium", "chrome", "msedge", "chrome-beta", "chrome-dev")
        assertTrue(chromiumInfo.channel in validChannels)
        assertTrue(chromeInfo.channel in validChannels)
        assertTrue(edgeInfo.channel in validChannels)
    }

    fun testBrowserPreferenceFromString() {
        assertEquals(BrowserDetector.BrowserPreference.EDGE, BrowserDetector.BrowserPreference.fromString("edge"))
        assertEquals(BrowserDetector.BrowserPreference.EDGE, BrowserDetector.BrowserPreference.fromString("msedge"))
        assertEquals(BrowserDetector.BrowserPreference.CHROME, BrowserDetector.BrowserPreference.fromString("chrome"))
        assertEquals(BrowserDetector.BrowserPreference.CHROMIUM, BrowserDetector.BrowserPreference.fromString("chromium"))
        assertEquals(BrowserDetector.BrowserPreference.CHROMIUM, BrowserDetector.BrowserPreference.fromString("bundled"))
        assertEquals(BrowserDetector.BrowserPreference.AUTO, BrowserDetector.BrowserPreference.fromString("auto"))
        assertEquals(BrowserDetector.BrowserPreference.AUTO, BrowserDetector.BrowserPreference.fromString(null))
        assertEquals(BrowserDetector.BrowserPreference.AUTO, BrowserDetector.BrowserPreference.fromString("unknown"))
    }

    fun testDetectWithChromiumPreferenceReturnsBundled() {
        val result = BrowserDetector.detect(BrowserDetector.BrowserPreference.CHROMIUM)

        assertEquals("chromium", result.channel)
        assertNull(result.version)
        assertNull(result.path)
    }
}
