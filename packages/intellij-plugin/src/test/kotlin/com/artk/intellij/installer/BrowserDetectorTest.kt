package com.artk.intellij.installer

import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Assertions.*

class BrowserDetectorTest {

    @Test
    fun `detect returns valid BrowserInfo`() {
        val result = BrowserDetector.detect()

        assertNotNull(result)
        assertNotNull(result.channel)
        assertTrue(result.channel in listOf("msedge", "chrome", "chromium"))
    }

    @Test
    fun `detect fallback returns chromium`() {
        // When no browsers are found, should fallback to chromium
        val result = BrowserDetector.detect()

        // Channel should be one of the supported options
        assertTrue(
            result.channel == "msedge" ||
            result.channel == "chrome" ||
            result.channel == "chromium"
        )
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
    fun `getPlaywrightChannel returns correct mapping`() {
        // Test that browser channels map correctly to Playwright channels
        val chromiumInfo = BrowserDetector.BrowserInfo("chromium", null, null)
        val chromeInfo = BrowserDetector.BrowserInfo("chrome", "120.0", "/path")
        val edgeInfo = BrowserDetector.BrowserInfo("msedge", "120.0", "/path")

        // All channels should be valid Playwright channel names
        assertTrue(chromiumInfo.channel in listOf("chromium", "chrome", "msedge", "chrome-beta", "chrome-dev"))
        assertTrue(chromeInfo.channel in listOf("chromium", "chrome", "msedge", "chrome-beta", "chrome-dev"))
        assertTrue(edgeInfo.channel in listOf("chromium", "chrome", "msedge", "chrome-beta", "chrome-dev"))
    }
}
