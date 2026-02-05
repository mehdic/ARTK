package com.artk.intellij.installer

import com.artk.intellij.util.ProcessUtils
import java.io.File

/**
 * Detects system browsers (Edge, Chrome) for Playwright
 * Matches VS Code extension behavior exactly
 */
object BrowserDetector {

    /**
     * Browser preference for installation
     */
    enum class BrowserPreference {
        AUTO,       // Use detection priority (Edge > Chrome > Chromium)
        EDGE,       // Prefer Edge if available
        CHROME,     // Prefer Chrome if available
        CHROMIUM;   // Always use bundled Chromium

        companion object {
            fun fromString(value: String?): BrowserPreference = when (value?.lowercase()) {
                "edge", "msedge" -> EDGE
                "chrome" -> CHROME
                "chromium", "bundled" -> CHROMIUM
                else -> AUTO
            }
        }
    }

    data class BrowserInfo(
        val channel: String, // msedge, chrome, chromium
        val version: String?,
        val path: String?
    ) {
        val displayName: String
            get() = when (channel) {
                "msedge" -> "Microsoft Edge"
                "chrome" -> "Google Chrome"
                "chromium" -> "Playwright Chromium (bundled)"
                else -> channel
            }

        val isSystemBrowser: Boolean
            get() = channel == "msedge" || channel == "chrome"
    }

    private val isWindows = System.getProperty("os.name").lowercase().contains("windows")
    private val isMac = System.getProperty("os.name").lowercase().contains("mac")
    private val isLinux = !isWindows && !isMac

    private val bundledChromium = BrowserInfo(
        channel = "chromium",
        version = null,
        path = null
    )

    /**
     * Detect available system browsers with optional preference
     * @param preference User's browser preference
     * @return Detected browser info based on preference and availability
     */
    fun detect(preference: BrowserPreference = BrowserPreference.AUTO): BrowserInfo {
        return when (preference) {
            BrowserPreference.AUTO -> detectWithPriority()
            BrowserPreference.EDGE -> detectEdge() ?: detectWithPriority()
            BrowserPreference.CHROME -> detectChrome() ?: detectWithPriority()
            BrowserPreference.CHROMIUM -> bundledChromium
        }
    }

    /**
     * Default detection priority: Edge > Chrome > Bundled Chromium
     */
    private fun detectWithPriority(): BrowserInfo {
        // Try Edge first
        detectEdge()?.let { return it }

        // Try Chrome
        detectChrome()?.let { return it }

        // Fallback to bundled chromium
        return bundledChromium
    }

    private fun detectEdge(): BrowserInfo? {
        val edgePaths = when {
            isWindows -> listOf(
                "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
                "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
            )
            isMac -> listOf(
                "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
            )
            else -> listOf(
                "microsoft-edge",
                "microsoft-edge-stable",
                "/snap/bin/microsoft-edge",
                "/var/lib/flatpak/exports/bin/com.microsoft.Edge"
            )
        }

        for (edgePath in edgePaths) {
            if (!browserExists(edgePath)) continue

            val version = getBrowserVersion(edgePath)
            if (version != null) {
                return BrowserInfo(
                    channel = "msedge",
                    version = extractVersionNumber(version),
                    path = edgePath
                )
            }
        }

        return null
    }

    private fun detectChrome(): BrowserInfo? {
        val chromePaths = when {
            isWindows -> listOf(
                "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
                "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
            )
            isMac -> listOf(
                "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
            )
            else -> listOf(
                "google-chrome",
                "google-chrome-stable",
                "/usr/bin/google-chrome-stable",
                "/snap/bin/chromium",
                "/var/lib/flatpak/exports/bin/com.google.Chrome"
            )
        }

        for (chromePath in chromePaths) {
            if (!browserExists(chromePath)) continue

            val version = getBrowserVersion(chromePath)
            if (version != null) {
                return BrowserInfo(
                    channel = "chrome",
                    version = extractVersionNumber(version),
                    path = chromePath
                )
            }
        }

        return null
    }

    /**
     * Check if browser executable exists
     */
    private fun browserExists(browserPath: String): Boolean {
        // Absolute paths - check with file system
        if (browserPath.startsWith("/") || browserPath.contains("\\")) {
            return File(browserPath).exists()
        }

        // Command names (Linux) - check with 'which'
        if (isLinux) {
            val result = ProcessUtils.execute(
                listOf("which", browserPath),
                timeoutSeconds = 2
            )
            return result.success
        }

        return true // On Windows, let testBrowser handle it
    }

    /**
     * Get browser version by running --version
     */
    private fun getBrowserVersion(browserPath: String): String? {
        val result = ProcessUtils.execute(
            listOf(browserPath, "--version"),
            timeoutSeconds = 5
        )

        return if (result.success && result.stdout.isNotBlank()) {
            result.stdout.trim()
        } else null
    }

    /**
     * Extract version number from version string
     * "Microsoft Edge 120.0.2210.91" -> "120.0.2210.91"
     */
    private fun extractVersionNumber(versionString: String): String? {
        val match = Regex("[\\d.]+").find(versionString)
        return match?.value
    }
}
