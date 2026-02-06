package com.artk.intellij.actions.llkb

import com.artk.intellij.services.ARTKProjectService
import com.artk.intellij.services.CLIBridgeService
import com.artk.intellij.util.NotificationUtils
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent

/**
 * Action to view LLKB statistics
 */
class StatsAction : AnAction() {

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return

        // First try to get stats from local data
        val projectService = ARTKProjectService.getInstance(project)
        val stats = projectService.llkbStats

        if (stats != null) {
            val message = buildString {
                appendLine("LLKB Statistics")
                appendLine()
                appendLine("Total Patterns: ${stats.totalPatterns}")
                appendLine("High Confidence (>=0.7): ${stats.highConfidencePatterns}")
                appendLine("Promotable: ${stats.promotablePatterns}")
                appendLine("Average Confidence: ${"%.2f".format(stats.averageConfidence)}")
                if (stats.lastUpdated != null) {
                    appendLine()
                    appendLine("Last Updated: ${stats.lastUpdated}")
                }
            }
            NotificationUtils.info(project, "LLKB Statistics", message)
            return
        }

        // Fall back to CLI
        CLIBridgeService.getInstance(project).runLlkbStats { result ->
            if (result.success) {
                NotificationUtils.info(
                    project,
                    "LLKB Statistics",
                    result.stdout
                )
            } else {
                NotificationUtils.warning(
                    project,
                    "LLKB Stats Error",
                    "Failed to get LLKB stats:\n\n${result.stderr}"
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
