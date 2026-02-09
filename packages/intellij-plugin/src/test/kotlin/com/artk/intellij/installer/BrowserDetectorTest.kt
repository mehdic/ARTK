package com.artk.intellij.installer

import com.intellij.testFramework.fixtures.BasePlatformTestCase

/**
 * Tests for BrowserDetector using IntelliJ Platform test fixtures.
 */
class BrowserDetectorTest : BasePlatformTestCase() {

    fun testBrowserInfoDisplayNameReturnsCorrectNames() {
        val edgeInfo = BrowserDetector.BrowserInfo("msedge", "120.0", "/path")
        val chromeInfo = BrowserDetector.BrowserInfo("chrome", "120.0", "/path")
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

    fun testBrowserInfoDataClass() {
        val info = BrowserDetector.BrowserInfo(
            channel = "chrome",
            version = "120.0.6099.71",
            path = "/usr/bin/google-chrome"
        )

        assertEquals("chrome", info.channel)
        assertEquals("120.0.6099.71", info.version)
        assertEquals("/usr/bin/google-chrome", info.path)
    }

    fun testBrowserPreferenceFromStringParsesEdge() {
        assertEquals(BrowserDetector.BrowserPreference.EDGE, BrowserDetector.BrowserPreference.fromString("edge"))
        assertEquals(BrowserDetector.BrowserPreference.EDGE, BrowserDetector.BrowserPreference.fromString("msedge"))
        assertEquals(BrowserDetector.BrowserPreference.EDGE, BrowserDetector.BrowserPreference.fromString("EDGE"))
    }

    fun testBrowserPreferenceFromStringParsesChrome() {
        assertEquals(BrowserDetector.BrowserPreference.CHROME, BrowserDetector.BrowserPreference.fromString("chrome"))
        assertEquals(BrowserDetector.BrowserPreference.CHROME, BrowserDetector.BrowserPreference.fromString("Chrome"))
    }

    fun testBrowserPreferenceFromStringParsesChromium() {
        assertEquals(BrowserDetector.BrowserPreference.CHROMIUM, BrowserDetector.BrowserPreference.fromString("chromium"))
        assertEquals(BrowserDetector.BrowserPreference.CHROMIUM, BrowserDetector.BrowserPreference.fromString("bundled"))
    }

    fun testBrowserPreferenceFromStringReturnsAutoForUnknown() {
        assertEquals(BrowserDetector.BrowserPreference.AUTO, BrowserDetector.BrowserPreference.fromString("auto"))
        assertEquals(BrowserDetector.BrowserPreference.AUTO, BrowserDetector.BrowserPreference.fromString(null))
        assertEquals(BrowserDetector.BrowserPreference.AUTO, BrowserDetector.BrowserPreference.fromString(""))
        assertEquals(BrowserDetector.BrowserPreference.AUTO, BrowserDetector.BrowserPreference.fromString("unknown"))
    }

    fun testDetectWithChromiumPreference() {
        val result = BrowserDetector.detect(BrowserDetector.BrowserPreference.CHROMIUM)

        assertEquals("chromium", result.channel)
        assertNull(result.version)
        assertNull(result.path)
    }

    fun testDetectWithAutoReturnsValidBrowserInfo() {
        val result = BrowserDetector.detect(BrowserDetector.BrowserPreference.AUTO)

        assertNotNull(result)
        assertTrue(result.channel in listOf("msedge", "chrome", "chromium"))
    }
}
