package com.artk.intellij.toolwindow.panels

import com.artk.intellij.actions.CheckAction
import com.artk.intellij.actions.InitAction
import com.artk.intellij.services.ARTKApplicationService
import com.artk.intellij.services.ARTKProjectService
import com.intellij.openapi.actionSystem.ActionManager
import com.intellij.openapi.actionSystem.ActionPlaces
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.Presentation
import com.intellij.openapi.project.Project
import com.intellij.ui.components.JBLabel
import com.intellij.ui.components.JBPanel
import com.intellij.util.ui.JBUI
import java.awt.BorderLayout
import java.awt.GridBagConstraints
import java.awt.GridBagLayout
import javax.swing.JButton
import javax.swing.JComponent
import javax.swing.SwingConstants

/**
 * Panel showing ARTK installation status
 */
class StatusPanel(private val project: Project) : JBPanel<StatusPanel>(BorderLayout()) {

    private val projectService = ARTKProjectService.getInstance(project)
    private val appService = ARTKApplicationService.getInstance()

    init {
        border = JBUI.Borders.empty(10)
        refresh()
    }

    fun refresh() {
        removeAll()

        if (projectService.isInstalled) {
            add(createInstalledView(), BorderLayout.CENTER)
        } else {
            add(createNotInstalledView(), BorderLayout.CENTER)
        }

        revalidate()
        repaint()
    }

    private fun createInstalledView(): JComponent {
        val panel = JBPanel<JBPanel<*>>(GridBagLayout())
        val gbc = GridBagConstraints().apply {
            gridx = 0
            gridy = 0
            anchor = GridBagConstraints.WEST
            insets = JBUI.insets(5)
        }

        val context = projectService.artkContext
        val config = projectService.artkConfig

        // Status header
        panel.add(JBLabel("<html><b>ARTK Installed</b></html>"), gbc)

        gbc.gridy++
        panel.add(JBLabel(""), gbc) // Spacer

        // Version info
        gbc.gridy++
        panel.add(JBLabel("Version: ${context?.artkVersion ?: "Unknown"}"), gbc)

        gbc.gridy++
        panel.add(JBLabel("Variant: ${context?.variant ?: "Unknown"}"), gbc)

        gbc.gridy++
        panel.add(JBLabel("Playwright: ${context?.playwrightVersion ?: "Unknown"}"), gbc)

        gbc.gridy++
        panel.add(JBLabel(""), gbc) // Spacer

        // Config info
        if (config != null) {
            gbc.gridy++
            panel.add(JBLabel("<html><b>Configuration</b></html>"), gbc)

            gbc.gridy++
            panel.add(JBLabel("App: ${config.app.name}"), gbc)

            gbc.gridy++
            val envCount = config.environments.size
            panel.add(JBLabel("Environments: $envCount"), gbc)

            gbc.gridy++
            val llkbStatus = if (projectService.llkbEnabled) "Enabled" else "Disabled"
            panel.add(JBLabel("LLKB: $llkbStatus"), gbc)
        }

        gbc.gridy++
        panel.add(JBLabel(""), gbc) // Spacer

        // Journey stats
        gbc.gridy++
        panel.add(JBLabel("<html><b>Journeys</b></html>"), gbc)

        val journeysByStatus = projectService.getJourneysByStatus()
        val statuses = listOf("proposed", "defined", "clarified", "implemented", "quarantined")
        for (status in statuses) {
            val count = journeysByStatus[status]?.size ?: 0
            if (count > 0) {
                gbc.gridy++
                panel.add(JBLabel("  ${status.replaceFirstChar { it.uppercase() }}: $count"), gbc)
            }
        }

        // Refresh button
        gbc.gridy++
        gbc.insets = JBUI.insets(15, 5, 5, 5)
        val refreshButton = JButton("Refresh")
        refreshButton.addActionListener {
            projectService.refresh()
            refresh()
        }
        panel.add(refreshButton, gbc)

        return panel
    }

    private fun createNotInstalledView(): JComponent {
        val panel = JBPanel<JBPanel<*>>(GridBagLayout())
        val gbc = GridBagConstraints().apply {
            gridx = 0
            gridy = 0
            anchor = GridBagConstraints.CENTER
            insets = JBUI.insets(10)
        }

        // Not installed message
        val label = JBLabel("<html><center><b>ARTK Not Installed</b><br><br>Initialize ARTK in this project to get started.</center></html>")
        label.horizontalAlignment = SwingConstants.CENTER
        panel.add(label, gbc)

        gbc.gridy++
        gbc.insets = JBUI.insets(20, 10, 10, 10)

        // Prerequisites info
        val prereqLabel = JBLabel("<html><small>Node.js: ${appService.nodeVersion ?: "Not found"}<br>npm: ${appService.npmVersion ?: "Not found"}</small></html>")
        prereqLabel.horizontalAlignment = SwingConstants.CENTER
        panel.add(prereqLabel, gbc)

        // Initialize button
        gbc.gridy++
        val initButton = JButton("Initialize ARTK")
        initButton.addActionListener {
            val action = InitAction()
            val event = AnActionEvent.createFromAnAction(
                action,
                null,
                ActionPlaces.TOOLWINDOW_CONTENT,
                { project.let { p -> ActionManager.getInstance().getAction("ARTK.Init")?.templatePresentation?.clone() ?: Presentation() } }
            )
            action.actionPerformed(event)
        }
        panel.add(initButton, gbc)

        // Check prerequisites button
        gbc.gridy++
        val checkButton = JButton("Check Prerequisites")
        checkButton.addActionListener {
            val action = CheckAction()
            val event = AnActionEvent.createFromAnAction(
                action,
                null,
                ActionPlaces.TOOLWINDOW_CONTENT,
                { ActionManager.getInstance().getAction("ARTK.Check")?.templatePresentation?.clone() ?: Presentation() }
            )
            action.actionPerformed(event)
        }
        panel.add(checkButton, gbc)

        return panel
    }
}
