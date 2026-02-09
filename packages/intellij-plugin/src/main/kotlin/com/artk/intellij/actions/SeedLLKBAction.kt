package com.artk.intellij.actions

import com.artk.intellij.services.ARTKProjectService
import com.artk.intellij.services.CLIBridgeService
import com.artk.intellij.util.NotificationUtils
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.ui.Messages

/**
 * Action to seed LLKB with universal patterns
 *
 * Seeds the Lessons Learned Knowledge Base with common Playwright patterns
 * for forms, tables, navigation, etc. to bootstrap pattern recognition.
 */
class SeedLLKBAction : AnAction() {

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        val projectService = ARTKProjectService.getInstance(project)

        if (!projectService.llkbEnabled) {
            Messages.showWarningDialog(
                project,
                "LLKB is not enabled in this project.\n\nRun 'ARTK: Doctor' to initialize LLKB.",
                "LLKB Not Enabled"
            )
            return
        }

        // Ask for confirmation with options
        val options = arrayOf("Preview First", "Seed Now", "Cancel")
        val choice = Messages.showDialog(
            project,
            "This will add universal Playwright patterns to your LLKB.\n\n" +
                    "Universal patterns include common interactions for:\n" +
                    "• Forms (fill, submit, validate)\n" +
                    "• Tables (sort, filter, paginate)\n" +
                    "• Navigation (click, navigate, wait)\n" +
                    "• Modals and dialogs\n\n" +
                    "Existing patterns with the same ID will be skipped.",
            "Seed LLKB",
            options,
            0,
            Messages.getQuestionIcon()
        )

        when (choice) {
            0 -> runSeed(project, dryRun = true)  // Preview First
            1 -> runSeed(project, dryRun = false) // Seed Now
            // 2 or -1 = Cancel, do nothing
        }
    }

    private fun runSeed(project: com.intellij.openapi.project.Project, dryRun: Boolean) {
        CLIBridgeService.getInstance(project).runLlkbSeed(dryRun = dryRun) { result ->
            if (result.success) {
                if (dryRun) {
                    // Show preview and offer to apply
                    val apply = Messages.showYesNoDialog(
                        project,
                        "Preview of patterns to add:\n\n${result.stdout}\n\nApply these patterns?",
                        "LLKB Seed Preview",
                        Messages.getQuestionIcon()
                    )
                    if (apply == Messages.YES) {
                        runSeed(project, dryRun = false)
                    }
                } else {
                    NotificationUtils.info(
                        project,
                        "LLKB Seeded",
                        "Universal patterns added to LLKB.\n\n${result.stdout}"
                    )
                    // Refresh to update LLKB stats
                    ARTKProjectService.getInstance(project).refresh()
                }
            } else {
                NotificationUtils.error(
                    project,
                    "LLKB Seed Failed",
                    "Failed to seed LLKB:\n\n${result.stderr.ifEmpty { result.stdout }}"
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
