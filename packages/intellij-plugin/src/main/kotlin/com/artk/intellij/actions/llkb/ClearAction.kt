package com.artk.intellij.actions.llkb

import com.artk.intellij.services.ARTKProjectService
import com.artk.intellij.services.CLIBridgeService
import com.artk.intellij.util.NotificationUtils
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.ui.Messages

/**
 * Action to clear all LLKB patterns
 */
class ClearAction : AnAction() {

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return

        // Ask for confirmation with strong warning
        val result = Messages.showYesNoDialog(
            project,
            "WARNING: This will permanently delete ALL learned patterns from LLKB.\n\n" +
                    "This action CANNOT be undone.\n\n" +
                    "Are you sure you want to clear all patterns?",
            "Clear LLKB Patterns",
            Messages.getWarningIcon()
        )

        if (result != Messages.YES) return

        // Double confirm for destructive operation
        val confirmResult = Messages.showYesNoDialog(
            project,
            "Please confirm: Delete ALL LLKB patterns?",
            "Confirm Clear",
            Messages.getWarningIcon()
        )

        if (confirmResult != Messages.YES) return

        CLIBridgeService.getInstance(project).runLlkbClear(force = true) { cmdResult ->
            if (cmdResult.success) {
                NotificationUtils.info(
                    project,
                    "LLKB Cleared",
                    "All patterns have been removed.\n\n${cmdResult.stdout}"
                )
                ARTKProjectService.getInstance(project).refresh()
            } else {
                NotificationUtils.warning(
                    project,
                    "LLKB Clear Failed",
                    "Failed to clear patterns:\n\n${cmdResult.stderr}"
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
