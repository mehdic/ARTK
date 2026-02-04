package com.artk.intellij.actions.llkb

import com.artk.intellij.services.ARTKProjectService
import com.artk.intellij.services.CLIBridgeService
import com.artk.intellij.util.NotificationUtils
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent

/**
 * Action to check LLKB health
 */
class HealthAction : AnAction() {

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return

        CLIBridgeService.getInstance(project).runLlkbHealth { result ->
            if (result.success) {
                NotificationUtils.info(
                    project,
                    "LLKB Health",
                    "LLKB is healthy.\n\n${result.stdout}"
                )
            } else {
                NotificationUtils.warning(
                    project,
                    "LLKB Health Issues",
                    "LLKB has issues:\n\n${result.stdout}\n${result.stderr}"
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
