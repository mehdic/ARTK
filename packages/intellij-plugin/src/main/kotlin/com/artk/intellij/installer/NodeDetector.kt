package com.artk.intellij.installer

import com.artk.intellij.util.ProcessUtils
import java.io.File

/**
 * Detects Node.js installation and version
 * Matches VS Code extension behavior
 */
object NodeDetector {

    data class NodeInfo(
        val version: String,
        val majorVersion: Int,
        val path: String?,
        val source: String // nvmrc, package.json, path, fallback
    )

    /**
     * Detect Node.js version from multiple sources
     * Priority: .nvmrc > package.json engines > PATH node
     */
    fun detect(targetPath: File): NodeInfo? {
        // Try .nvmrc first
        detectFromNvmrc(targetPath)?.let { return it }

        // Try package.json engines.node
        detectFromPackageJson(targetPath)?.let { return it }

        // Try running 'node --version' from PATH
        detectFromPath()?.let { return it }

        return null
    }

    /**
     * Get major version from version string (e.g., "v20.10.0" -> 20)
     */
    fun parseMajorVersion(version: String): Int? {
        val match = Regex("^v?(\\d+)").find(version.trim())
        return match?.groupValues?.get(1)?.toIntOrNull()
    }

    private fun detectFromNvmrc(targetPath: File): NodeInfo? {
        val nvmrcFile = File(targetPath, ".nvmrc")
        if (!nvmrcFile.exists()) return null

        return try {
            val content = nvmrcFile.readText().trim()
            // Parse versions like "v20", "20", "v20.10.0", "lts/*"
            val match = Regex("^v?(\\d+)").find(content)
            if (match != null) {
                val majorVersion = match.groupValues[1].toInt()
                NodeInfo(
                    version = content,
                    majorVersion = majorVersion,
                    path = null,
                    source = "nvmrc"
                )
            } else null
        } catch (e: Exception) {
            null
        }
    }

    private fun detectFromPackageJson(targetPath: File): NodeInfo? {
        val pkgFile = File(targetPath, "package.json")
        if (!pkgFile.exists()) return null

        return try {
            val content = pkgFile.readText()
            // Simple regex to find engines.node
            val enginesMatch = Regex(""""engines"\s*:\s*\{[^}]*"node"\s*:\s*"([^"]+)"""")
                .find(content)

            if (enginesMatch != null) {
                val nodeSpec = enginesMatch.groupValues[1]
                // Parse versions like ">=18", "^20", "18.x", ">=18.0.0"
                val versionMatch = Regex("(\\d+)").find(nodeSpec)
                if (versionMatch != null) {
                    val majorVersion = versionMatch.groupValues[1].toInt()
                    NodeInfo(
                        version = nodeSpec,
                        majorVersion = majorVersion,
                        path = null,
                        source = "package.json"
                    )
                } else null
            } else null
        } catch (e: Exception) {
            null
        }
    }

    private fun detectFromPath(): NodeInfo? {
        val result = ProcessUtils.execute(listOf("node", "--version"), timeoutSeconds = 5)
        if (!result.success) return null

        val version = result.stdout.trim()
        val majorVersion = parseMajorVersion(version) ?: return null

        // Try to get node path
        val pathResult = if (isWindows()) {
            ProcessUtils.execute(listOf("cmd", "/c", "where", "node"), timeoutSeconds = 5)
        } else {
            ProcessUtils.execute(listOf("which", "node"), timeoutSeconds = 5)
        }

        val nodePath = if (pathResult.success) {
            pathResult.stdout.trim().lines().firstOrNull()
        } else null

        return NodeInfo(
            version = version,
            majorVersion = majorVersion,
            path = nodePath,
            source = "path"
        )
    }

    private fun isWindows(): Boolean =
        System.getProperty("os.name").lowercase().contains("windows")
}
