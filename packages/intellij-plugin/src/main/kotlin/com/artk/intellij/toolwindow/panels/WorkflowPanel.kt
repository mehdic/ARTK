package com.artk.intellij.toolwindow.panels

import com.artk.intellij.model.ARTKWorkflow
import com.artk.intellij.model.WorkflowStep
import com.artk.intellij.model.WorkflowStepStatus
import com.artk.intellij.services.ARTKProjectService
import com.artk.intellij.util.NotificationUtils
import com.intellij.icons.AllIcons
import com.intellij.openapi.ide.CopyPasteManager
import com.intellij.openapi.project.Project
import com.intellij.ui.components.JBLabel
import com.intellij.ui.components.JBPanel
import com.intellij.ui.components.JBScrollPane
import com.intellij.util.ui.JBUI
import java.awt.BorderLayout
import java.awt.Cursor
import java.awt.FlowLayout
import java.awt.GridBagConstraints
import java.awt.GridBagLayout
import java.awt.datatransfer.StringSelection
import java.awt.event.MouseAdapter
import java.awt.event.MouseEvent
import javax.swing.BorderFactory
import javax.swing.Icon
import javax.swing.JButton
import javax.swing.JComponent
import javax.swing.SwingConstants

/**
 * Panel showing ARTK workflow steps
 */
class WorkflowPanel(private val project: Project) : JBPanel<WorkflowPanel>(BorderLayout()) {

    private val projectService = ARTKProjectService.getInstance(project)

    init {
        border = JBUI.Borders.empty(10)
        refresh()
    }

    fun refresh() {
        removeAll()

        if (!projectService.isInstalled) {
            add(createNotInstalledMessage(), BorderLayout.CENTER)
        } else {
            add(createWorkflowView(), BorderLayout.CENTER)
        }

        revalidate()
        repaint()
    }

    private fun createNotInstalledMessage(): JComponent {
        val label = JBLabel("<html><center>Install ARTK to see workflow steps.</center></html>")
        label.horizontalAlignment = SwingConstants.CENTER
        return label
    }

    private fun createWorkflowView(): JComponent {
        val panel = JBPanel<JBPanel<*>>(GridBagLayout())
        val gbc = GridBagConstraints().apply {
            gridx = 0
            gridy = 0
            fill = GridBagConstraints.HORIZONTAL
            weightx = 1.0
            anchor = GridBagConstraints.NORTHWEST
            insets = JBUI.insets(5)
        }

        // Header
        panel.add(JBLabel("<html><b>ARTK Workflow</b></html>"), gbc)

        gbc.gridy++
        panel.add(JBLabel("<html><small>Click step to copy Copilot command</small></html>"), gbc)

        gbc.gridy++
        panel.add(JBLabel(""), gbc) // Spacer

        // Workflow steps
        for (step in ARTKWorkflow.STEPS) {
            gbc.gridy++
            panel.add(createStepCard(step), gbc)
        }

        // Add filler at bottom
        gbc.gridy++
        gbc.weighty = 1.0
        panel.add(JBLabel(""), gbc)

        return JBScrollPane(panel)
    }

    private fun createStepCard(step: WorkflowStep): JComponent {
        val card = JBPanel<JBPanel<*>>(BorderLayout())
        card.border = BorderFactory.createCompoundBorder(
            JBUI.Borders.customLine(JBUI.CurrentTheme.CustomFrameDecorations.separatorForeground(), 1),
            JBUI.Borders.empty(8)
        )

        // Icon and title
        val headerPanel = JBPanel<JBPanel<*>>(FlowLayout(FlowLayout.LEFT, 5, 0))
        val icon = getStepIcon(step.status)
        headerPanel.add(JBLabel(icon))
        headerPanel.add(JBLabel("<html><b>${step.title}</b></html>"))
        card.add(headerPanel, BorderLayout.NORTH)

        // Description
        val descLabel = JBLabel("<html><small>${step.description}</small></html>")
        descLabel.border = JBUI.Borders.emptyLeft(25)
        card.add(descLabel, BorderLayout.CENTER)

        // Command button
        if (step.copilotPrompt != null) {
            val buttonPanel = JBPanel<JBPanel<*>>(FlowLayout(FlowLayout.LEFT, 0, 5))
            val copyButton = JButton(step.copilotPrompt)
            copyButton.toolTipText = "Click to copy to clipboard"
            copyButton.cursor = Cursor.getPredefinedCursor(Cursor.HAND_CURSOR)
            copyButton.addActionListener {
                CopyPasteManager.getInstance().setContents(StringSelection(step.copilotPrompt))
                NotificationUtils.info(
                    project,
                    "Copied to Clipboard",
                    "Paste '${step.copilotPrompt}' in GitHub Copilot Chat"
                )
            }
            buttonPanel.add(copyButton)
            card.add(buttonPanel, BorderLayout.SOUTH)
        }

        // Make the card clickable
        card.cursor = Cursor.getPredefinedCursor(Cursor.HAND_CURSOR)
        card.addMouseListener(object : MouseAdapter() {
            override fun mouseClicked(e: MouseEvent) {
                if (step.copilotPrompt != null) {
                    CopyPasteManager.getInstance().setContents(StringSelection(step.copilotPrompt))
                    NotificationUtils.info(
                        project,
                        "Copied to Clipboard",
                        "Paste '${step.copilotPrompt}' in GitHub Copilot Chat"
                    )
                }
            }
        })

        return card
    }

    private fun getStepIcon(status: WorkflowStepStatus): Icon {
        return when (status) {
            WorkflowStepStatus.COMPLETED -> AllIcons.Actions.Checked
            WorkflowStepStatus.IN_PROGRESS -> AllIcons.Process.Step_1
            WorkflowStepStatus.BLOCKED -> AllIcons.General.Error
            WorkflowStepStatus.SKIPPED -> AllIcons.Actions.Forward
            WorkflowStepStatus.PENDING -> AllIcons.Actions.Execute
        }
    }
}
