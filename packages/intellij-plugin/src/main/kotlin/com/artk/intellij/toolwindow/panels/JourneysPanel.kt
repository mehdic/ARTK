package com.artk.intellij.toolwindow.panels

import com.artk.intellij.model.Journey
import com.artk.intellij.model.JourneyStatus
import com.artk.intellij.services.ARTKProjectService
import com.artk.intellij.services.ARTKTopics
import com.artk.intellij.services.JourneysChangedListener
import com.intellij.icons.AllIcons
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.LocalFileSystem
import com.intellij.ui.components.JBLabel
import com.intellij.ui.components.JBPanel
import com.intellij.ui.components.JBScrollPane
import com.intellij.ui.treeStructure.Tree
import com.intellij.util.ui.JBUI
import java.awt.BorderLayout
import java.awt.event.MouseAdapter
import java.awt.event.MouseEvent
import javax.swing.Icon
import javax.swing.JComponent
import javax.swing.SwingConstants
import javax.swing.tree.DefaultMutableTreeNode
import javax.swing.tree.DefaultTreeCellRenderer
import javax.swing.tree.DefaultTreeModel

/**
 * Panel showing journey tree organized by status
 */
class JourneysPanel(private val project: Project) : JBPanel<JourneysPanel>(BorderLayout()) {

    private val projectService = ARTKProjectService.getInstance(project)
    private var tree: Tree? = null

    init {
        border = JBUI.Borders.empty(10)

        // Listen for journey changes
        project.messageBus.connect().subscribe(
            ARTKTopics.JOURNEYS_CHANGED,
            object : JourneysChangedListener {
                override fun onJourneysChanged() {
                    refresh()
                }
            }
        )

        refresh()
    }

    fun refresh() {
        removeAll()

        if (!projectService.isInstalled) {
            add(createNotInstalledMessage(), BorderLayout.CENTER)
        } else {
            add(createJourneysTree(), BorderLayout.CENTER)
        }

        revalidate()
        repaint()
    }

    private fun createNotInstalledMessage(): JComponent {
        val label = JBLabel("<html><center>Install ARTK to see journeys.</center></html>")
        label.horizontalAlignment = SwingConstants.CENTER
        return label
    }

    private fun createJourneysTree(): JComponent {
        val root = DefaultMutableTreeNode("Journeys")

        val journeysByStatus = projectService.getJourneysByStatus()

        // Add nodes for each status
        for (status in JourneyStatus.entries) {
            if (status == JourneyStatus.UNKNOWN) continue

            val journeys = journeysByStatus[status.name.lowercase()] ?: emptyList()
            val statusNode = DefaultMutableTreeNode(StatusNode(status, journeys.size))

            for (journey in journeys.sortedBy { it.id }) {
                statusNode.add(DefaultMutableTreeNode(JourneyNode(journey)))
            }

            root.add(statusNode)
        }

        tree = Tree(DefaultTreeModel(root))
        tree!!.isRootVisible = false
        tree!!.showsRootHandles = true

        // Custom renderer
        tree!!.cellRenderer = JourneyCellRenderer()

        // Double-click to open
        tree!!.addMouseListener(object : MouseAdapter() {
            override fun mouseClicked(e: MouseEvent) {
                if (e.clickCount == 2) {
                    val node = tree!!.lastSelectedPathComponent as? DefaultMutableTreeNode
                    val userObject = node?.userObject
                    if (userObject is JourneyNode) {
                        openJourney(userObject.journey)
                    }
                }
            }
        })

        // Expand first level
        for (i in 0 until tree!!.rowCount) {
            tree!!.expandRow(i)
        }

        return JBScrollPane(tree)
    }

    private fun openJourney(journey: Journey) {
        val virtualFile = LocalFileSystem.getInstance().findFileByPath(journey.filePath)
        if (virtualFile != null) {
            FileEditorManager.getInstance(project).openFile(virtualFile, true)
        }
    }

    // Node wrapper classes
    data class StatusNode(val status: JourneyStatus, val count: Int)
    data class JourneyNode(val journey: Journey)

    // Custom cell renderer
    private inner class JourneyCellRenderer : DefaultTreeCellRenderer() {
        override fun getTreeCellRendererComponent(
            tree: javax.swing.JTree?,
            value: Any?,
            sel: Boolean,
            expanded: Boolean,
            leaf: Boolean,
            row: Int,
            hasFocus: Boolean
        ): java.awt.Component {
            super.getTreeCellRendererComponent(tree, value, sel, expanded, leaf, row, hasFocus)

            val node = value as? DefaultMutableTreeNode
            when (val userObject = node?.userObject) {
                is StatusNode -> {
                    text = "${userObject.status.displayName} (${userObject.count})"
                    icon = getStatusIcon(userObject.status)
                }
                is JourneyNode -> {
                    text = "${userObject.journey.id}: ${userObject.journey.title}"
                    icon = getJourneyIcon(userObject.journey)
                }
            }

            return this
        }

        private fun getStatusIcon(status: JourneyStatus): Icon {
            return when (status) {
                JourneyStatus.PROPOSED -> AllIcons.General.Add
                JourneyStatus.DEFINED -> AllIcons.Actions.Edit
                JourneyStatus.CLARIFIED -> AllIcons.Actions.Preview
                JourneyStatus.IMPLEMENTED -> AllIcons.Actions.Checked
                JourneyStatus.QUARANTINED -> AllIcons.General.Warning
                JourneyStatus.DEPRECATED -> AllIcons.Actions.GC
                JourneyStatus.UNKNOWN -> AllIcons.General.QuestionDialog
            }
        }

        private fun getJourneyIcon(journey: Journey): Icon {
            return if (journey.hasTests) {
                AllIcons.RunConfigurations.TestState.Green2
            } else {
                AllIcons.FileTypes.Any_type
            }
        }
    }
}
