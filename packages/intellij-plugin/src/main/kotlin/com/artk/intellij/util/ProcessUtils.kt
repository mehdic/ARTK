package com.artk.intellij.util

import com.intellij.execution.configurations.GeneralCommandLine
import com.intellij.execution.process.OSProcessHandler
import com.intellij.execution.process.ProcessAdapter
import com.intellij.execution.process.ProcessEvent
import com.intellij.execution.process.ProcessOutputTypes
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Key
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
     * Execute a command and wait for result
     */
    fun execute(
        command: List<String>,
        workingDir: File? = null,
        timeoutSeconds: Long = 60,
        environment: Map<String, String> = emptyMap()
    ): ProcessResult {
        val commandLine = GeneralCommandLine(command)
            .withWorkDirectory(workingDir)
            .withEnvironment(environment)
            .withCharset(Charsets.UTF_8)

        val stdout = StringBuilder()
        val stderr = StringBuilder()

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

        return ProcessResult(
            exitCode = handler.exitCode ?: -1,
            stdout = stdout.toString(),
            stderr = stderr.toString()
        )
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
     */
    fun executeNpm(
        args: List<String>,
        workingDir: File,
        timeoutSeconds: Long = 120
    ): ProcessResult {
        val npmCommand = if (System.getProperty("os.name").lowercase().contains("windows")) {
            listOf("cmd", "/c", "npm") + args
        } else {
            listOf("npm") + args
        }
        return execute(npmCommand, workingDir, timeoutSeconds)
    }

    /**
     * Execute npx command
     */
    fun executeNpx(
        args: List<String>,
        workingDir: File,
        timeoutSeconds: Long = 120
    ): ProcessResult {
        val npxCommand = if (System.getProperty("os.name").lowercase().contains("windows")) {
            listOf("cmd", "/c", "npx") + args
        } else {
            listOf("npx") + args
        }
        return execute(npxCommand, workingDir, timeoutSeconds)
    }

    /**
     * Check if a command is available
     */
    fun isCommandAvailable(command: String): Boolean {
        val checkCommand = if (System.getProperty("os.name").lowercase().contains("windows")) {
            listOf("cmd", "/c", "where", command)
        } else {
            listOf("which", command)
        }
        return execute(checkCommand, timeoutSeconds = 5).success
    }

    /**
     * Get Node.js version
     */
    fun getNodeVersion(): String? {
        val result = execute(listOf("node", "--version"), timeoutSeconds = 5)
        return if (result.success) {
            result.stdout.trim().removePrefix("v")
        } else null
    }

    /**
     * Get npm version
     */
    fun getNpmVersion(): String? {
        val result = execute(listOf("npm", "--version"), timeoutSeconds = 5)
        return if (result.success) {
            result.stdout.trim()
        } else null
    }
}
