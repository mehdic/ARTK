package com.artk.intellij.actions

import com.artk.intellij.services.ARTKProjectService
import com.artk.intellij.services.CLIBridgeService
import com.artk.intellij.util.NotificationUtils
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.ui.Messages

/**
 * Action to upgrade ARTK to the latest version
 */
class UpgradeAction : AnAction() {

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return

        val result = Messages.showYesNoDialog(
            project,
            "Upgrade @artk/core to the latest version?\n\nThis will update the vendored core library.",
            "Upgrade ARTK",
            "Upgrade",
            "Cancel",
            Messages.getQuestionIcon()
        )

        if (result != Messages.YES) return

        CLIBridgeService.getInstance(project).runUpgrade { upgradeResult ->
            if (upgradeResult.success) {
                NotificationUtils.info(
                    project,
                    "ARTK Upgraded",
                    "ARTK has been upgraded successfully.\n\n${upgradeResult.stdout}"
                )
                // Refresh project state
                ARTKProjectService.getInstance(project).refresh()
            } else {
                NotificationUtils.error(
                    project,
                    "Upgrade Failed",
                    "Failed to upgrade ARTK:\n\n${upgradeResult.stderr}"
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
