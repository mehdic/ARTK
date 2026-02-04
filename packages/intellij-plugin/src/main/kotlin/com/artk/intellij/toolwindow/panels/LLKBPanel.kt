package com.artk.intellij.toolwindow.panels

import com.artk.intellij.model.LearnedPattern
import com.artk.intellij.services.ARTKProjectService
import com.artk.intellij.services.CLIBridgeService
import com.artk.intellij.util.NotificationUtils
import com.intellij.icons.AllIcons
import com.intellij.openapi.project.Project
import com.intellij.ui.components.JBLabel
import com.intellij.ui.components.JBPanel
import com.intellij.ui.components.JBScrollPane
import com.intellij.ui.table.JBTable
import com.intellij.util.ui.JBUI
import java.awt.BorderLayout
import java.awt.FlowLayout
import java.awt.GridBagConstraints
import java.awt.GridBagLayout
import javax.swing.JButton
import javax.swing.JComponent
import javax.swing.SwingConstants
import javax.swing.table.AbstractTableModel

/**
 * Panel showing LLKB statistics and patterns
 */
class LLKBPanel(private val project: Project) : JBPanel<LLKBPanel>(BorderLayout()) {

    private val projectService = ARTKProjectService.getInstance(project)

    init {
        border = JBUI.Borders.empty(10)
        refresh()
    }

    fun refresh() {
        removeAll()

        if (!projectService.isInstalled) {
            add(createNotInstalledMessage(), BorderLayout.CENTER)
        } else if (!projectService.llkbEnabled) {
            add(createLLKBDisabledMessage(), BorderLayout.CENTER)
        } else {
            add(createLLKBView(), BorderLayout.CENTER)
        }

        revalidate()
        repaint()
    }

    private fun createNotInstalledMessage(): JComponent {
        val label = JBLabel("<html><center>Install ARTK to see LLKB.</center></html>")
        label.horizontalAlignment = SwingConstants.CENTER
        return label
    }

    private fun createLLKBDisabledMessage(): JComponent {
        val label = JBLabel("<html><center>LLKB is disabled in this project.<br><br>Enable it in artk.config.yml</center></html>")
        label.horizontalAlignment = SwingConstants.CENTER
        return label
    }

    private fun createLLKBView(): JComponent {
        val mainPanel = JBPanel<JBPanel<*>>(BorderLayout())

        // Stats section
        val statsPanel = createStatsPanel()
        mainPanel.add(statsPanel, BorderLayout.NORTH)

        // Patterns table
        val stats = projectService.llkbStats
        if (stats != null && stats.patterns.isNotEmpty()) {
            val tablePanel = createPatternsTable(stats.patterns)
            mainPanel.add(tablePanel, BorderLayout.CENTER)
        } else {
            val emptyLabel = JBLabel("<html><center>No learned patterns yet.<br><br>Patterns are learned during test generation.</center></html>")
            emptyLabel.horizontalAlignment = SwingConstants.CENTER
            mainPanel.add(emptyLabel, BorderLayout.CENTER)
        }

        // Actions section
        val actionsPanel = createActionsPanel()
        mainPanel.add(actionsPanel, BorderLayout.SOUTH)

        return JBScrollPane(mainPanel)
    }

    private fun createStatsPanel(): JComponent {
        val panel = JBPanel<JBPanel<*>>(GridBagLayout())
        panel.border = JBUI.Borders.empty(0, 0, 10, 0)

        val gbc = GridBagConstraints().apply {
            gridx = 0
            gridy = 0
            anchor = GridBagConstraints.WEST
            insets = JBUI.insets(2)
        }

        val stats = projectService.llkbStats

        panel.add(JBLabel("<html><b>LLKB Statistics</b></html>"), gbc)

        gbc.gridy++
        panel.add(JBLabel("Total Patterns: ${stats?.totalPatterns ?: 0}"), gbc)

        gbc.gridy++
        panel.add(JBLabel("High Confidence (>=0.7): ${stats?.highConfidencePatterns ?: 0}"), gbc)

        gbc.gridy++
        panel.add(JBLabel("Promotable: ${stats?.promotablePatterns ?: 0}"), gbc)

        gbc.gridy++
        val avgConf = stats?.averageConfidence ?: 0.0
        panel.add(JBLabel("Average Confidence: ${"%.2f".format(avgConf)}"), gbc)

        if (stats?.lastUpdated != null) {
            gbc.gridy++
            panel.add(JBLabel("<html><small>Last Updated: ${stats.lastUpdated}</small></html>"), gbc)
        }

        return panel
    }

    private fun createPatternsTable(patterns: List<LearnedPattern>): JComponent {
        val tableModel = object : AbstractTableModel() {
            private val columns = arrayOf("Pattern", "IR Primitive", "Confidence", "Success", "Sources")
            private val sortedPatterns = patterns.sortedByDescending { it.confidence }

            override fun getRowCount() = sortedPatterns.size.coerceAtMost(50) // Show top 50
            override fun getColumnCount() = columns.size
            override fun getColumnName(column: Int) = columns[column]

            override fun getValueAt(rowIndex: Int, columnIndex: Int): Any {
                val pattern = sortedPatterns[rowIndex]
                return when (columnIndex) {
                    0 -> pattern.text.take(40) + if (pattern.text.length > 40) "..." else ""
                    1 -> pattern.irPrimitive
                    2 -> "%.2f".format(pattern.confidence)
                    3 -> "${pattern.successCount}/${pattern.usageCount}"
                    4 -> pattern.sourceJourneys.size.toString()
                    else -> ""
                }
            }
        }

        val table = JBTable(tableModel)
        table.autoResizeMode = JBTable.AUTO_RESIZE_ALL_COLUMNS

        val panel = JBPanel<JBPanel<*>>(BorderLayout())
        panel.add(JBLabel("<html><b>Top Patterns</b></html>"), BorderLayout.NORTH)
        panel.add(JBScrollPane(table), BorderLayout.CENTER)

        return panel
    }

    private fun createActionsPanel(): JComponent {
        val panel = JBPanel<JBPanel<*>>(FlowLayout(FlowLayout.LEFT))
        panel.border = JBUI.Borders.emptyTop(10)

        val healthButton = JButton("Check Health", AllIcons.General.InspectionsOK)
        healthButton.addActionListener {
            CLIBridgeService.getInstance(project).runLlkbHealth { result ->
                NotificationUtils.info(project, "LLKB Health", result.stdout)
            }
        }
        panel.add(healthButton)

        val exportButton = JButton("Export", AllIcons.ToolbarDecorator.Export)
        exportButton.addActionListener {
            val artkE2ePath = projectService.artkE2ePath ?: return@addActionListener
            val outputPath = "$artkE2ePath/autogen-patterns.json"
            CLIBridgeService.getInstance(project).runLlkbExport(outputPath) { result ->
                if (result.success) {
                    NotificationUtils.info(project, "Export Complete", "Patterns exported to: $outputPath")
                } else {
                    NotificationUtils.error(project, "Export Failed", result.stderr)
                }
            }
        }
        panel.add(exportButton)

        val refreshButton = JButton("Refresh", AllIcons.Actions.Refresh)
        refreshButton.addActionListener {
            projectService.refresh()
            refresh()
        }
        panel.add(refreshButton)

        return panel
    }
}
