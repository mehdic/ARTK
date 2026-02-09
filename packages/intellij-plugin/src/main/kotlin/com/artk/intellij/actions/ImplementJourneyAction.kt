package com.artk.intellij.actions

import com.artk.intellij.services.ARTKProjectService
import com.artk.intellij.services.CLIBridgeService
import com.artk.intellij.util.NotificationUtils
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.ui.Messages

/**
 * Action to implement journeys by generating Playwright tests
 *
 * Runs artk-autogen generate on clarified journey files to create
 * Playwright test files using AutoGen's pattern-based code generation.
 */
class ImplementJourneyAction : AnAction() {

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return

        // Confirm with user since this generates files
        val confirm = Messages.showYesNoDialog(
            project,
            "This will generate Playwright tests from clarified journeys.\n\n" +
                    "Existing test files may be overwritten.\n\n" +
                    "Continue?",
            "Implement Journeys",
            Messages.getQuestionIcon()
        )

        if (confirm != Messages.YES) {
            return
        }

        CLIBridgeService.getInstance(project).runJourneyImplement { result ->
            if (result.success) {
                // Count generated tests from output
                val testsCreated = result.stdout.lines().count { it.contains("created:") || it.contains("Generated") }

                if (testsCreated > 0) {
                    NotificationUtils.info(
                        project,
                        "Journey Implementation",
                        "Implementation complete! $testsCreated test(s) generated.\n\n${result.stdout}"
                    )
                } else {
                    NotificationUtils.info(
                        project,
                        "Journey Implementation",
                        "Implementation complete.\n\n${result.stdout}"
                    )
                }

                // Refresh the project service to update journey statuses
                ARTKProjectService.getInstance(project).refresh()
            } else {
                NotificationUtils.error(
                    project,
                    "Implementation Failed",
                    "Journey implementation failed:\n\n${result.stderr.ifEmpty { result.stdout }}"
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
