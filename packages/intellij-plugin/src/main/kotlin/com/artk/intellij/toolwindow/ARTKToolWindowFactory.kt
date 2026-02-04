package com.artk.intellij.toolwindow

import com.artk.intellij.ARTKPlugin
import com.artk.intellij.services.ARTKProjectService
import com.artk.intellij.services.ARTKTopics
import com.artk.intellij.services.ContextChangedListener
import com.artk.intellij.toolwindow.panels.*
import com.artk.intellij.model.ARTKContext
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.ToolWindow
import com.intellij.openapi.wm.ToolWindowFactory
import com.intellij.ui.content.ContentFactory

/**
 * Factory for creating the ARTK tool window
 */
class ARTKToolWindowFactory : ToolWindowFactory, DumbAware {

    override fun createToolWindowContent(project: Project, toolWindow: ToolWindow) {
        val contentFactory = ContentFactory.getInstance()

        // Status Panel (always shown first)
        val statusPanel = StatusPanel(project)
        val statusContent = contentFactory.createContent(statusPanel, "Status", false)
        toolWindow.contentManager.addContent(statusContent)

        // Workflow Panel
        val workflowPanel = WorkflowPanel(project)
        val workflowContent = contentFactory.createContent(workflowPanel, "Workflow", false)
        toolWindow.contentManager.addContent(workflowContent)

        // Journeys Panel
        val journeysPanel = JourneysPanel(project)
        val journeysContent = contentFactory.createContent(journeysPanel, "Journeys", false)
        toolWindow.contentManager.addContent(journeysContent)

        // LLKB Panel
        val llkbPanel = LLKBPanel(project)
        val llkbContent = contentFactory.createContent(llkbPanel, "LLKB", false)
        toolWindow.contentManager.addContent(llkbContent)

        // Dashboard Panel (webview)
        val dashboardPanel = DashboardPanel(project)
        val dashboardContent = contentFactory.createContent(dashboardPanel, "Dashboard", false)
        toolWindow.contentManager.addContent(dashboardContent)

        // Listen for context changes to update panels
        project.messageBus.connect().subscribe(
            ARTKTopics.CONTEXT_CHANGED,
            object : ContextChangedListener {
                override fun onContextChanged(isInstalled: Boolean, context: ARTKContext?) {
                    statusPanel.refresh()
                    workflowPanel.refresh()
                    journeysPanel.refresh()
                    llkbPanel.refresh()
                    dashboardPanel.refresh()
                }
            }
        )
    }

    override fun shouldBeAvailable(project: Project): Boolean {
        // Always show the tool window - it will display appropriate content
        // based on whether ARTK is installed
        return true
    }
}
