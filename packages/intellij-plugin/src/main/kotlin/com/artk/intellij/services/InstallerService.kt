package com.artk.intellij.services

import com.artk.intellij.util.FileUtils
import com.artk.intellij.util.NotificationUtils
import com.artk.intellij.util.ProcessUtils
import com.intellij.openapi.components.Service
import com.intellij.openapi.components.service
import com.intellij.openapi.progress.ProgressIndicator
import com.intellij.openapi.progress.ProgressManager
import com.intellij.openapi.progress.Task
import com.intellij.openapi.project.Project
import java.io.File

/**
 * Service for installing ARTK to a project
 * Mirrors the VS Code extension bundled installer behavior
 */
@Service(Service.Level.PROJECT)
class InstallerService(private val project: Project) {

    companion object {
        fun getInstance(project: Project): InstallerService = project.service()

        // Installation steps matching VS Code extension
        val INSTALL_STEPS = listOf(
            "Detecting environment...",
            "Checking prerequisites...",
            "Creating directory structure...",
            "Installing @artk/core...",
            "Configuring Playwright...",
            "Initializing LLKB...",
            "Installing dependencies...",
            "Finalizing installation..."
        )
    }

    private var installationInProgress = false

    /**
     * Install ARTK to the current project
     */
    fun install(
        options: InstallOptions = InstallOptions(),
        onProgress: ((String, Int) -> Unit)? = null,
        onComplete: (InstallResult) -> Unit
    ) {
        if (installationInProgress) {
            NotificationUtils.warning(project, "Installation In Progress", "An installation is already in progress")
            return
        }

        val basePath = project.basePath
        if (basePath == null) {
            onComplete(InstallResult(false, "No project path available"))
            return
        }

        installationInProgress = true
        notifyInstallationStarted()

        ProgressManager.getInstance().run(object : Task.Backgroundable(project, "Installing ARTK", true) {
            override fun run(indicator: ProgressIndicator) {
                try {
                    performInstallation(File(basePath), options, indicator, onProgress, onComplete)
                } finally {
                    installationInProgress = false
                }
            }

            override fun onThrowable(error: Throwable) {
                installationInProgress = false
                onComplete(InstallResult(false, "Installation failed: ${error.message}"))
                notifyInstallationCompleted(false, error.message)
            }
        })
    }

    private fun performInstallation(
        targetDir: File,
        options: InstallOptions,
        indicator: ProgressIndicator,
        onProgress: ((String, Int) -> Unit)?,
        onComplete: (InstallResult) -> Unit
    ) {
        val totalSteps = INSTALL_STEPS.size
        var currentStep = 0

        fun updateProgress(step: String) {
            currentStep++
            val progress = (currentStep * 100) / totalSteps
            indicator.fraction = currentStep.toDouble() / totalSteps
            indicator.text = step
            onProgress?.invoke(step, progress)
            notifyProgress(step, progress)
        }

        // Step 1: Detect environment
        updateProgress(INSTALL_STEPS[0])
        val nodeVersion = ProcessUtils.getNodeVersion()
        if (nodeVersion == null) {
            onComplete(InstallResult(false, "Node.js is not installed"))
            notifyInstallationCompleted(false, "Node.js is not installed")
            return
        }

        // Step 2: Check prerequisites
        updateProgress(INSTALL_STEPS[1])
        val npmVersion = ProcessUtils.getNpmVersion()
        if (npmVersion == null) {
            onComplete(InstallResult(false, "npm is not installed"))
            notifyInstallationCompleted(false, "npm is not installed")
            return
        }

        // Step 3: Create directory structure
        updateProgress(INSTALL_STEPS[2])
        val artkE2eDir = File(targetDir, "artk-e2e")
        createDirectoryStructure(artkE2eDir)

        // Step 4: Install @artk/core
        updateProgress(INSTALL_STEPS[3])
        // Using npx @artk/cli init for full installation
        val initResult = ProcessUtils.execute(
            buildList {
                add("npx")
                add("@artk/cli")
                add("init")
                add(targetDir.absolutePath)
                if (options.skipNpm) add("--skip-npm")
                if (options.skipLlkb) add("--skip-llkb")
                if (options.skipBrowsers) add("--skip-browsers")
                if (options.force) add("--force")
                options.variant?.let {
                    add("--variant")
                    add(it)
                }
                add("--no-prompts")
            },
            targetDir,
            timeoutSeconds = 300
        )

        if (!initResult.success) {
            onComplete(InstallResult(false, "CLI init failed: ${initResult.stderr}"))
            notifyInstallationCompleted(false, initResult.stderr)
            return
        }

        // Step 5: Configure Playwright
        updateProgress(INSTALL_STEPS[4])
        // Already handled by CLI

        // Step 6: Initialize LLKB
        updateProgress(INSTALL_STEPS[5])
        if (!options.skipLlkb) {
            // LLKB is initialized by CLI
        }

        // Step 7: Install dependencies
        updateProgress(INSTALL_STEPS[6])
        if (!options.skipNpm) {
            val npmInstallResult = ProcessUtils.executeNpm(
                listOf("install"),
                artkE2eDir,
                timeoutSeconds = 300
            )
            if (!npmInstallResult.success) {
                NotificationUtils.warning(project, "npm Install Warning", "npm install had issues: ${npmInstallResult.stderr}")
            }
        }

        // Step 8: Finalize
        updateProgress(INSTALL_STEPS[7])

        // Refresh project service
        ARTKProjectService.getInstance(project).refresh()

        onComplete(InstallResult(true, "ARTK installed successfully"))
        notifyInstallationCompleted(true, null)
    }

    private fun createDirectoryStructure(artkE2eDir: File) {
        // Create base directories
        listOf(
            artkE2eDir,
            File(artkE2eDir, ".artk"),
            File(artkE2eDir, ".artk/llkb"),
            File(artkE2eDir, ".artk/autogen"),
            File(artkE2eDir, ".auth-states"),
            File(artkE2eDir, "journeys"),
            File(artkE2eDir, "journeys/proposed"),
            File(artkE2eDir, "journeys/defined"),
            File(artkE2eDir, "journeys/clarified"),
            File(artkE2eDir, "journeys/implemented"),
            File(artkE2eDir, "tests"),
            File(artkE2eDir, "vendor")
        ).forEach { it.mkdirs() }
    }

    private fun notifyInstallationStarted() {
        project.messageBus.syncPublisher(ARTKTopics.INSTALLATION_CHANGED).onInstallationStarted()
    }

    private fun notifyProgress(step: String, progress: Int) {
        project.messageBus.syncPublisher(ARTKTopics.INSTALLATION_CHANGED).onInstallationProgress(step, progress)
    }

    private fun notifyInstallationCompleted(success: Boolean, message: String?) {
        project.messageBus.syncPublisher(ARTKTopics.INSTALLATION_CHANGED).onInstallationCompleted(success, message)
    }
}

/**
 * Options for installation
 */
data class InstallOptions(
    val skipNpm: Boolean = false,
    val skipLlkb: Boolean = false,
    val skipBrowsers: Boolean = false,
    val force: Boolean = false,
    val variant: String? = null
)

/**
 * Result of installation
 */
data class InstallResult(
    val success: Boolean,
    val message: String
)
