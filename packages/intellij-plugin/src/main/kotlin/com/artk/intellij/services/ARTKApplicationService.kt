package com.artk.intellij.services

import com.artk.intellij.util.ProcessUtils
import com.intellij.openapi.components.Service
import com.intellij.openapi.components.service

/**
 * Application-level service for ARTK global state
 */
@Service(Service.Level.APP)
class ARTKApplicationService {

    private var _nodeVersion: String? = null
    private var _npmVersion: String? = null
    private var _artkCliVersion: String? = null
    private var _prerequisitesChecked: Boolean = false

    val nodeVersion: String? get() = _nodeVersion
    val npmVersion: String? get() = _npmVersion
    val artkCliVersion: String? get() = _artkCliVersion
    val hasPrerequisites: Boolean
        get() = _nodeVersion != null && _npmVersion != null

    companion object {
        fun getInstance(): ARTKApplicationService = service()
    }

    init {
        checkPrerequisites()
    }

    /**
     * Check system prerequisites
     */
    fun checkPrerequisites(): PrerequisitesResult {
        _nodeVersion = ProcessUtils.getNodeVersion()
        _npmVersion = ProcessUtils.getNpmVersion()
        _artkCliVersion = detectArtkCliVersion()
        _prerequisitesChecked = true

        val issues = mutableListOf<String>()

        if (_nodeVersion == null) {
            issues.add("Node.js is not installed or not in PATH")
        } else {
            val majorVersion = _nodeVersion!!.split(".").firstOrNull()?.toIntOrNull() ?: 0
            if (majorVersion < 18) {
                issues.add("Node.js version ${_nodeVersion} is too old. ARTK requires Node.js 18+")
            }
        }

        if (_npmVersion == null) {
            issues.add("npm is not installed or not in PATH")
        }

        return PrerequisitesResult(
            nodeVersion = _nodeVersion,
            npmVersion = _npmVersion,
            artkCliVersion = _artkCliVersion,
            issues = issues,
            success = issues.isEmpty()
        )
    }

    /**
     * Detect ARTK CLI version from system
     */
    private fun detectArtkCliVersion(): String? {
        val result = ProcessUtils.execute(
            listOf("npx", "@artk/cli", "--version"),
            timeoutSeconds = 10
        )
        return if (result.success) {
            result.stdout.trim()
        } else null
    }

    /**
     * Check if Playwright is installed
     */
    fun isPlaywrightAvailable(): Boolean {
        return ProcessUtils.isCommandAvailable("npx") &&
                ProcessUtils.execute(
                    listOf("npx", "playwright", "--version"),
                    timeoutSeconds = 10
                ).success
    }
}

/**
 * Result of prerequisites check
 */
data class PrerequisitesResult(
    val nodeVersion: String?,
    val npmVersion: String?,
    val artkCliVersion: String?,
    val issues: List<String>,
    val success: Boolean
)
