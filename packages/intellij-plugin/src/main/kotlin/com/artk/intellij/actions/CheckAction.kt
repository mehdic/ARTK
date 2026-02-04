package com.artk.intellij.actions

import com.artk.intellij.services.ARTKApplicationService
import com.artk.intellij.util.NotificationUtils
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent

/**
 * Action to check prerequisites (Node.js, npm, etc.)
 */
class CheckAction : AnAction() {

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project

        val result = ARTKApplicationService.getInstance().checkPrerequisites()

        val message = buildString {
            appendLine("Prerequisites Check:")
            appendLine()
            appendLine("Node.js: ${result.nodeVersion ?: "Not found"}")
            appendLine("npm: ${result.npmVersion ?: "Not found"}")
            appendLine("ARTK CLI: ${result.artkCliVersion ?: "Not installed"}")

            if (result.issues.isNotEmpty()) {
                appendLine()
                appendLine("Issues:")
                result.issues.forEach { issue ->
                    appendLine("  - $issue")
                }
            }
        }

        if (result.success) {
            NotificationUtils.info(project, "Prerequisites OK", message)
        } else {
            NotificationUtils.warning(project, "Prerequisites Issues", message)
        }
    }

    override fun update(e: AnActionEvent) {
        e.presentation.isEnabledAndVisible = true
    }
}
