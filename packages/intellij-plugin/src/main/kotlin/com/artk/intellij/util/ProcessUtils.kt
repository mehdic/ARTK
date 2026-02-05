package com.artk.intellij.util

import com.intellij.execution.configurations.GeneralCommandLine
import com.intellij.execution.process.OSProcessHandler
import com.intellij.execution.process.ProcessAdapter
import com.intellij.execution.process.ProcessEvent
import com.intellij.execution.process.ProcessOutputTypes
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Key
import com.intellij.openapi.util.SystemInfo
import java.io.File
import java.util.concurrent.CompletableFuture
import java.util.concurrent.TimeUnit

/**
 * Utility functions for process execution
 */
object ProcessUtils {

    /**
     * Result of a process execution
     */
    data class ProcessResult(
        val exitCode: Int,
        val stdout: String,
        val stderr: String,
        val success: Boolean = exitCode == 0
    )

    /**
     * Check if running on Windows
     * M1 fix: Centralized OS detection - use these properties everywhere
     */
    val isWindows: Boolean
        get() = SystemInfo.isWindows

    /**
     * Check if running on macOS
     */
    val isMac: Boolean
        get() = SystemInfo.isMac

    /**
     * Check if running on Linux
     */
    val isLinux: Boolean
        get() = SystemInfo.isLinux

    /**
     * Execute a command and wait for result
     */
    fun execute(
        command: List<String>,
        workingDir: File? = null,
        timeoutSeconds: Long = 60,
        environment: Map<String, String> = emptyMap(),
        inheritParentEnv: Boolean = true
    ): ProcessResult {
        val commandLine = GeneralCommandLine(command)
            .withWorkDirectory(workingDir)
            .withCharset(Charsets.UTF_8)
            .withParentEnvironmentType(
                if (inheritParentEnv) GeneralCommandLine.ParentEnvironmentType.CONSOLE
                else GeneralCommandLine.ParentEnvironmentType.NONE
            )

        // Add custom environment variables
        if (environment.isNotEmpty()) {
            commandLine.withEnvironment(environment)
        }

        val stdout = StringBuilder()
        val stderr = StringBuilder()

        return try {
            val handler = OSProcessHandler(commandLine)

            handler.addProcessListener(object : ProcessAdapter() {
                override fun onTextAvailable(event: ProcessEvent, outputType: Key<*>) {
                    when (outputType) {
                        ProcessOutputTypes.STDOUT -> stdout.append(event.text)
                        ProcessOutputTypes.STDERR -> stderr.append(event.text)
                    }
                }
            })

            handler.startNotify()
            handler.waitFor(timeoutSeconds * 1000)

            ProcessResult(
                exitCode = handler.exitCode ?: -1,
                stdout = stdout.toString(),
                stderr = stderr.toString()
            )
        } catch (e: Exception) {
            ProcessResult(
                exitCode = -1,
                stdout = "",
                stderr = "Failed to execute command: ${e.message}"
            )
        }
    }

    /**
     * Execute a command asynchronously
     */
    fun executeAsync(
        command: List<String>,
        workingDir: File? = null,
        environment: Map<String, String> = emptyMap()
    ): CompletableFuture<ProcessResult> {
        return CompletableFuture.supplyAsync {
            execute(command, workingDir, environment = environment)
        }
    }

    /**
     * Execute npm/npx command
     * M1 fix: Use consistent isWindows property
     */
    fun executeNpm(
        args: List<String>,
        workingDir: File,
        timeoutSeconds: Long = 120
    ): ProcessResult {
        val npmCommand = if (isWindows) {
            listOf("cmd", "/c", "npm") + args
        } else {
            listOf("npm") + args
        }
        return execute(npmCommand, workingDir, timeoutSeconds)
    }

    /**
     * Execute npx command
     * M1 fix: Use consistent isWindows property
     */
    fun executeNpx(
        args: List<String>,
        workingDir: File,
        timeoutSeconds: Long = 120
    ): ProcessResult {
        val npxCommand = if (isWindows) {
            listOf("cmd", "/c", "npx") + args
        } else {
            listOf("npx") + args
        }
        return execute(npxCommand, workingDir, timeoutSeconds)
    }

    /**
     * Check if a command is available
     * M1 fix: Use consistent isWindows property
     */
    fun isCommandAvailable(command: String): Boolean {
        val checkCommand = if (isWindows) {
            listOf("cmd", "/c", "where", command)
        } else {
            listOf("which", command)
        }
        return execute(checkCommand, timeoutSeconds = 5).success
    }

    /**
     * Execute a command that may need Windows shell wrapping
     */
    fun executeShellCommand(
        command: String,
        args: List<String> = emptyList(),
        workingDir: File? = null,
        timeoutSeconds: Long = 60,
        environment: Map<String, String> = emptyMap()
    ): ProcessResult {
        val fullCommand = if (isWindows) {
            listOf("cmd", "/c", command) + args
        } else {
            listOf(command) + args
        }
        return execute(fullCommand, workingDir, timeoutSeconds, environment)
    }

    /**
     * Get Node.js version
     */
    fun getNodeVersion(): String? {
        val result = executeShellCommand("node", listOf("--version"), timeoutSeconds = 5)
        return if (result.success) {
            result.stdout.trim().removePrefix("v")
        } else null
    }

    /**
     * Get npm version
     */
    fun getNpmVersion(): String? {
        val result = executeShellCommand("npm", listOf("--version"), timeoutSeconds = 5)
        return if (result.success) {
            result.stdout.trim()
        } else null
    }

    /**
     * Execute Playwright command
     */
    fun executePlaywright(
        args: List<String>,
        workingDir: File,
        timeoutSeconds: Long = 300
    ): ProcessResult {
        return executeNpx(listOf("playwright") + args, workingDir, timeoutSeconds)
    }

    /**
     * Get system environment with PATH properly set
     */
    fun getEnvironmentWithPath(): Map<String, String> {
        val env = mutableMapOf<String, String>()

        // Inherit system PATH
        System.getenv("PATH")?.let { env["PATH"] = it }
        System.getenv("Path")?.let { env["Path"] = it }  // Windows uses "Path"

        // Add common Node locations
        if (isWindows) {
            val programFiles = System.getenv("ProgramFiles") ?: "C:\\Program Files"
            val appData = System.getenv("APPDATA") ?: ""
            val localAppData = System.getenv("LOCALAPPDATA") ?: ""

            val nodePaths = listOfNotNull(
                "$programFiles\\nodejs",
                "$appData\\npm",
                "$localAppData\\Programs\\node"
            ).filter { File(it).exists() }

            if (nodePaths.isNotEmpty()) {
                val currentPath = env["Path"] ?: env["PATH"] ?: ""
                env["Path"] = (nodePaths + currentPath).joinToString(";")
            }
        } else {
            val home = System.getenv("HOME") ?: ""
            val nodePaths = listOfNotNull(
                "$home/.nvm/versions/node",
                "/usr/local/bin",
                "/opt/homebrew/bin"
            ).filter { File(it).exists() }

            if (nodePaths.isNotEmpty()) {
                val currentPath = env["PATH"] ?: ""
                env["PATH"] = (nodePaths + currentPath).joinToString(":")
            }
        }

        return env
    }
}
