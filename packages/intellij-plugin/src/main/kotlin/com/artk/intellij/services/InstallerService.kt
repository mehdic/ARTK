package com.artk.intellij.services

import com.artk.intellij.installer.ARTKInstaller
import com.artk.intellij.util.NotificationUtils
import com.intellij.openapi.components.Service
import com.intellij.openapi.components.service
import com.intellij.openapi.progress.ProgressIndicator
import com.intellij.openapi.progress.ProgressManager
import com.intellij.openapi.progress.Task
import com.intellij.openapi.project.Project
import java.io.File
import java.nio.file.Path

/**
 * Service for installing ARTK to a project
 * Delegates to ARTKInstaller for the actual bundled installation
 */
@Service(Service.Level.PROJECT)
class InstallerService(private val project: Project) {

    companion object {
        fun getInstance(project: Project): InstallerService = project.service()
    }

    private val installer = ARTKInstaller(project)
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
                    performInstallation(Path.of(basePath), options, indicator, onProgress, onComplete)
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
        targetPath: Path,
        options: InstallOptions,
        indicator: ProgressIndicator,
        onProgress: ((String, Int) -> Unit)?,
        onComplete: (InstallResult) -> Unit
    ) {
        // Convert to installer options
        val installerOptions = ARTKInstaller.InstallOptions(
            targetPath = targetPath,
            variant = options.variant,
            skipNpm = options.skipNpm,
            skipLlkb = options.skipLlkb,
            forceLlkb = false,
            skipBrowsers = options.skipBrowsers,
            noPrompts = false, // Install prompts and agents by default
            force = options.force,
            browserPreference = options.browserPreference
        )

        // Run the bundled installer
        val result = installer.install(
            options = installerOptions,
            indicator = indicator,
            progressCallback = { step, progress ->
                onProgress?.invoke(step, (progress * 100).toInt())
                notifyProgress(step, (progress * 100).toInt())
            }
        )

        // Refresh project service
        ARTKProjectService.getInstance(project).refresh()

        // H2 fix: Build message including warnings
        val baseMessage = if (result.success) "Installation successful" else (result.error ?: "Unknown error")
        val message = if (result.success && result.warnings.isNotEmpty()) {
            "$baseMessage\n\nWarnings:\n${result.warnings.joinToString("\n") { "• $it" }}"
        } else {
            baseMessage
        }

        onComplete(InstallResult(result.success, message, result.warnings))

        // H2 fix: Show warnings in notification if present
        if (result.success && result.warnings.isNotEmpty()) {
            NotificationUtils.warning(
                project,
                "Installation Complete with Warnings",
                result.warnings.joinToString("\n") { "• $it" }
            )
        }

        notifyInstallationCompleted(result.success, if (result.success) null else result.error)
    }

    /**
     * Upgrade ARTK in the current project
     */
    fun upgrade(onComplete: (InstallResult) -> Unit) {
        val basePath = project.basePath ?: run {
            onComplete(InstallResult(false, "No project path available"))
            return
        }

        ProgressManager.getInstance().run(object : Task.Backgroundable(project, "Upgrading ARTK", true) {
            override fun run(indicator: ProgressIndicator) {
                indicator.isIndeterminate = true
                indicator.text = "Upgrading ARTK..."

                val result = installer.upgrade(
                    targetPath = Path.of(basePath),
                    indicator = indicator
                )

                ARTKProjectService.getInstance(project).refresh()

                // H2 fix: Build message including warnings
                val baseMessage = if (result.success) "Upgrade successful" else (result.error ?: "Unknown error")
                val message = if (result.success && result.warnings.isNotEmpty()) {
                    "$baseMessage\n\nWarnings:\n${result.warnings.joinToString("\n") { "• $it" }}"
                } else {
                    baseMessage
                }

                onComplete(InstallResult(result.success, message, result.warnings))

                // H2 fix: Show warnings in notification if present
                if (result.success && result.warnings.isNotEmpty()) {
                    NotificationUtils.warning(
                        project,
                        "Upgrade Complete with Warnings",
                        result.warnings.joinToString("\n") { "• $it" }
                    )
                }
            }

            override fun onThrowable(error: Throwable) {
                onComplete(InstallResult(false, "Upgrade failed: ${error.message}"))
            }
        })
    }

    /**
     * Uninstall ARTK from the current project
     */
    fun uninstall(onComplete: (InstallResult) -> Unit) {
        val basePath = project.basePath ?: run {
            onComplete(InstallResult(false, "No project path available"))
            return
        }

        ProgressManager.getInstance().run(object : Task.Backgroundable(project, "Uninstalling ARTK", true) {
            override fun run(indicator: ProgressIndicator) {
                indicator.isIndeterminate = true
                indicator.text = "Uninstalling ARTK..."

                val result = installer.uninstall(Path.of(basePath))

                ARTKProjectService.getInstance(project).refresh()

                // H2 fix: Build message including warnings
                val baseMessage = if (result.success) "Uninstall successful" else (result.error ?: "Unknown error")
                val message = if (result.success && result.warnings.isNotEmpty()) {
                    "$baseMessage\n\nWarnings:\n${result.warnings.joinToString("\n") { "• $it" }}"
                } else {
                    baseMessage
                }

                onComplete(InstallResult(result.success, message, result.warnings))
            }

            override fun onThrowable(error: Throwable) {
                onComplete(InstallResult(false, "Uninstall failed: ${error.message}"))
            }
        })
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
    val variant: String? = null,
    val browserPreference: com.artk.intellij.installer.BrowserDetector.BrowserPreference =
        com.artk.intellij.installer.BrowserDetector.BrowserPreference.AUTO
)

/**
 * Result of installation
 */
data class InstallResult(
    val success: Boolean,
    val message: String,
    val warnings: List<String> = emptyList()  // H2 fix: Include warnings from installer
)
