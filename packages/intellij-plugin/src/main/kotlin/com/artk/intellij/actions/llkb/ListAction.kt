package com.artk.intellij.actions.llkb

import com.artk.intellij.services.ARTKProjectService
import com.artk.intellij.services.CLIBridgeService
import com.artk.intellij.util.NotificationUtils
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.ui.DialogWrapper
import com.intellij.ui.components.JBScrollPane
import java.awt.BorderLayout
import java.awt.Dimension
import javax.swing.JComponent
import javax.swing.JPanel
import javax.swing.JTextArea

/**
 * Action to list LLKB patterns
 */
class ListAction : AnAction() {

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return

        CLIBridgeService.getInstance(project).runLlkbList(limit = 50) { result ->
            if (result.success) {
                // Show patterns in a dialog
                com.intellij.openapi.application.ApplicationManager.getApplication().invokeLater {
                    object : DialogWrapper(project) {
                        init {
                            title = "LLKB Patterns"
                            init()
                        }

                        override fun createCenterPanel(): JComponent {
                            val panel = JPanel(BorderLayout())
                            val textArea = JTextArea(result.stdout)
                            textArea.isEditable = false
                            textArea.font = java.awt.Font(java.awt.Font.MONOSPACED, java.awt.Font.PLAIN, 12)
                            val scrollPane = JBScrollPane(textArea)
                            scrollPane.preferredSize = Dimension(700, 500)
                            panel.add(scrollPane, BorderLayout.CENTER)
                            return panel
                        }
                    }.show()
                }
            } else {
                NotificationUtils.warning(
                    project,
                    "LLKB List Failed",
                    "Failed to list patterns:\n\n${result.stderr}"
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
