package com.artk.intellij.actions

import com.artk.intellij.services.ARTKProjectService
import com.artk.intellij.services.CLIBridgeService
import com.artk.intellij.util.NotificationUtils
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent

/**
 * Action to validate clarified journeys
 *
 * Runs artk-autogen validate on all clarified journey files to check
 * if they are ready for test generation.
 */
class ValidateJourneyAction : AnAction() {

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return

        CLIBridgeService.getInstance(project).runJourneyValidate { result ->
            if (result.success) {
                // Try to parse JSON result
                try {
                    val output = result.stdout
                    val validCount = output.count { it == '✓' || output.contains("\"valid\":true") }
                    val invalidCount = output.count { it == '✗' || output.contains("\"valid\":false") }

                    if (invalidCount == 0) {
                        NotificationUtils.info(
                            project,
                            "Journey Validation",
                            "All journeys are valid and ready for implementation."
                        )
                    } else {
                        NotificationUtils.warning(
                            project,
                            "Journey Validation",
                            "Some journeys have validation errors:\n\n${result.stdout}"
                        )
                    }
                } catch (ex: Exception) {
                    NotificationUtils.info(
                        project,
                        "Journey Validation",
                        "Validation complete:\n\n${result.stdout}"
                    )
                }
            } else {
                NotificationUtils.error(
                    project,
                    "Validation Failed",
                    "Journey validation failed:\n\n${result.stderr.ifEmpty { result.stdout }}"
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
