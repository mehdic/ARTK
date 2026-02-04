package com.artk.intellij.actions

import com.artk.intellij.services.ARTKProjectService
import com.artk.intellij.services.CLIBridgeService
import com.artk.intellij.util.NotificationUtils
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent

/**
 * Action to run ARTK doctor command
 */
class DoctorAction : AnAction() {

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return

        CLIBridgeService.getInstance(project).runDoctor { result ->
            if (result.success) {
                NotificationUtils.info(
                    project,
                    "ARTK Doctor",
                    "Doctor completed successfully.\n\n${result.stdout}"
                )
            } else {
                NotificationUtils.warning(
                    project,
                    "ARTK Doctor",
                    "Doctor found issues:\n\n${result.stdout}\n${result.stderr}"
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
