package com.artk.intellij.actions.llkb

import com.artk.intellij.services.ARTKProjectService
import com.artk.intellij.services.CLIBridgeService
import com.artk.intellij.util.NotificationUtils
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.ui.Messages

/**
 * Action to promote high-confidence LLKB patterns
 */
class PromoteAction : AnAction() {

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return

        // First, check which patterns are promotable
        CLIBridgeService.getInstance(project).runLlkbPromote(apply = false) { result ->
            if (result.success) {
                val output = result.stdout.trim()
                if (output.contains("No patterns") || output.contains("0 patterns")) {
                    NotificationUtils.info(
                        project,
                        "No Patterns to Promote",
                        "No patterns meet the promotion criteria.\n\n" +
                                "Patterns need ≥90% confidence, ≥5 successes, and ≥2 journeys."
                    )
                } else {
                    // Show promotable patterns and ask to apply
                    val applyResult = Messages.showYesNoDialog(
                        project,
                        "Promotable patterns found:\n\n$output\n\nApply promotion?",
                        "Promote LLKB Patterns",
                        Messages.getQuestionIcon()
                    )

                    if (applyResult == Messages.YES) {
                        CLIBridgeService.getInstance(project).runLlkbPromote(apply = true) { applyOutput ->
                            if (applyOutput.success) {
                                NotificationUtils.info(
                                    project,
                                    "Patterns Promoted",
                                    applyOutput.stdout
                                )
                                ARTKProjectService.getInstance(project).refresh()
                            } else {
                                NotificationUtils.warning(
                                    project,
                                    "Promotion Failed",
                                    applyOutput.stderr
                                )
                            }
                        }
                    }
                }
            } else {
                NotificationUtils.warning(
                    project,
                    "LLKB Promote Failed",
                    "Failed to check promotable patterns:\n\n${result.stderr}"
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
