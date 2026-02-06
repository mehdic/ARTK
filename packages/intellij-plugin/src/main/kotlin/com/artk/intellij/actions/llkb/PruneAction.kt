package com.artk.intellij.actions.llkb

import com.artk.intellij.services.ARTKProjectService
import com.artk.intellij.services.CLIBridgeService
import com.artk.intellij.util.NotificationUtils
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.ui.Messages

/**
 * Action to prune low-confidence LLKB patterns
 */
class PruneAction : AnAction() {

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return

        // Ask for confirmation
        val result = Messages.showYesNoDialog(
            project,
            "This will remove low-confidence patterns (< 0.3) from LLKB.\n\n" +
                    "This action cannot be undone. Continue?",
            "Prune LLKB Patterns",
            Messages.getWarningIcon()
        )

        if (result != Messages.YES) return

        CLIBridgeService.getInstance(project).runLlkbPrune(0.3) { cmdResult ->
            if (cmdResult.success) {
                NotificationUtils.info(
                    project,
                    "LLKB Pruned",
                    "Low-confidence patterns have been removed.\n\n${cmdResult.stdout}"
                )
                ARTKProjectService.getInstance(project).refresh()
            } else {
                NotificationUtils.warning(
                    project,
                    "LLKB Prune Failed",
                    "Failed to prune patterns:\n\n${cmdResult.stderr}"
                )
            }
        }
    }

    override fun update(e: AnActionEvent) {
        val project = e.project
        e.presentation.isEnabledAndVisible = project != null &&
                ARTKProjectService.getInstance(project).isInstalled &&
                ARTKProjectService.getInstance(project).llkbEnabled
    }
}
