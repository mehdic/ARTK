package com.artk.intellij.actions

import com.artk.intellij.services.ARTKProjectService
import com.artk.intellij.services.CLIBridgeService
import com.artk.intellij.util.NotificationUtils
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.ui.Messages

/**
 * Action to uninstall ARTK from the current project
 */
class UninstallAction : AnAction() {

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return

        val result = Messages.showYesNoDialog(
            project,
            "Are you sure you want to uninstall ARTK?\n\n" +
                    "This will remove the artk-e2e directory and all related files.\n" +
                    "This action cannot be undone!",
            "Uninstall ARTK",
            "Uninstall",
            "Cancel",
            Messages.getWarningIcon()
        )

        if (result != Messages.YES) return

        // Double confirmation for destructive action
        val confirmResult = Messages.showInputDialog(
            project,
            "Type 'uninstall' to confirm:",
            "Confirm Uninstall",
            Messages.getWarningIcon()
        )

        if (confirmResult != "uninstall") {
            NotificationUtils.info(project, "Uninstall Cancelled", "Uninstall was cancelled.")
            return
        }

        CLIBridgeService.getInstance(project).runUninstall { uninstallResult ->
            if (uninstallResult.success) {
                NotificationUtils.info(
                    project,
                    "ARTK Uninstalled",
                    "ARTK has been removed from this project."
                )
                // Refresh project state
                ARTKProjectService.getInstance(project).refresh()
            } else {
                NotificationUtils.error(
                    project,
                    "Uninstall Failed",
                    "Failed to uninstall ARTK:\n\n${uninstallResult.stderr}"
                )
            }
        }
    }

    override fun update(e: AnActionEvent) {
        val project = e.project
        e.presentation.isEnabledAndVisible = project != null &&
                ARTKProjectService.getInstance(project).isInstalled
    }
}
