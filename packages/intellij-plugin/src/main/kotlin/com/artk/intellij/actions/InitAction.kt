package com.artk.intellij.actions

import com.artk.intellij.services.ARTKProjectService
import com.artk.intellij.services.InstallOptions
import com.artk.intellij.services.InstallerService
import com.artk.intellij.util.NotificationUtils
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.ui.Messages

/**
 * Action to initialize ARTK in the current project
 */
class InitAction : AnAction() {

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return

        // Check if already installed
        if (ARTKProjectService.getInstance(project).isInstalled) {
            val result = Messages.showYesNoDialog(
                project,
                "ARTK is already installed in this project. Do you want to reinstall?",
                "ARTK Already Installed",
                "Reinstall",
                "Cancel",
                Messages.getQuestionIcon()
            )
            if (result != Messages.YES) return
        }

        // Show options dialog
        val options = showOptionsDialog(project) ?: return

        // Run installation
        InstallerService.getInstance(project).install(
            options = options,
            onProgress = { step, progress ->
                // Progress is shown in the background task
            },
            onComplete = { result ->
                if (result.success) {
                    NotificationUtils.info(project, "ARTK Installed", result.message)
                } else {
                    NotificationUtils.error(project, "Installation Failed", result.message)
                }
            }
        )
    }

    private fun showOptionsDialog(project: com.intellij.openapi.project.Project): InstallOptions? {
        // For now, use defaults. A full dialog can be implemented later.
        val result = Messages.showYesNoDialog(
            project,
            "Initialize ARTK in this project?\n\nThis will create the artk-e2e directory structure and install dependencies.",
            "Initialize ARTK",
            "Initialize",
            "Cancel",
            Messages.getQuestionIcon()
        )

        return if (result == Messages.YES) {
            InstallOptions()
        } else null
    }

    override fun update(e: AnActionEvent) {
        e.presentation.isEnabledAndVisible = e.project != null
    }
}
