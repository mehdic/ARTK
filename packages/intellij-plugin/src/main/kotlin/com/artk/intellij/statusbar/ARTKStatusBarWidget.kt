package com.artk.intellij.statusbar

import com.artk.intellij.ARTKPlugin
import com.artk.intellij.model.ARTKContext
import com.artk.intellij.services.ARTKProjectService
import com.artk.intellij.services.ARTKTopics
import com.artk.intellij.services.ContextChangedListener
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Disposer
import com.intellij.openapi.wm.StatusBar
import com.intellij.openapi.wm.StatusBarWidget
import com.intellij.openapi.wm.ToolWindowManager
import com.intellij.util.Consumer
import java.awt.Component
import java.awt.event.MouseEvent
import javax.swing.Icon

/**
 * Status bar widget showing ARTK status
 */
class ARTKStatusBarWidget(private val project: Project) : StatusBarWidget,
    StatusBarWidget.TextPresentation {

    private var statusBar: StatusBar? = null
    private val projectService = ARTKProjectService.getInstance(project)
    private val connection = project.messageBus.connect()

    init {
        // Listen for context changes
        connection.subscribe(ARTKTopics.CONTEXT_CHANGED, object : ContextChangedListener {
            override fun onContextChanged(isInstalled: Boolean, context: ARTKContext?) {
                statusBar?.updateWidget(ID())
            }
        })
    }

    override fun ID(): String = "ARTKStatusBarWidget"

    override fun getPresentation(): StatusBarWidget.WidgetPresentation = this

    override fun install(statusBar: StatusBar) {
        this.statusBar = statusBar
    }

    override fun dispose() {
        connection.disconnect()
        statusBar = null
    }

    // TextPresentation implementation

    override fun getText(): String {
        return if (projectService.isInstalled) {
            val context = projectService.artkContext
            val parts = mutableListOf("ARTK")
            context?.artkVersion?.let { parts.add("v$it") }
            if (projectService.llkbEnabled) {
                parts.add("| LLKB")
            }
            parts.joinToString(" ")
        } else {
            "ARTK: Not Installed"
        }
    }

    override fun getAlignment(): Float = Component.CENTER_ALIGNMENT

    override fun getTooltipText(): String {
        return if (projectService.isInstalled) {
            val context = projectService.artkContext
            val config = projectService.artkConfig
            val journeys = projectService.journeys

            buildString {
                appendLine("ARTK Status")
                appendLine()
                appendLine("Version: ${context?.artkVersion ?: "Unknown"}")
                appendLine("Variant: ${context?.variant ?: "Unknown"}")
                appendLine("Playwright: ${context?.playwrightVersion ?: "Unknown"}")
                appendLine()
                config?.let {
                    appendLine("App: ${it.app.name}")
                    appendLine("Environments: ${it.environments.size}")
                }
                appendLine()
                appendLine("Journeys: ${journeys.size}")
                val implemented = journeys.count { it.hasTests }
                appendLine("Implemented: $implemented")
                appendLine()
                appendLine("LLKB: ${if (projectService.llkbEnabled) "Enabled" else "Disabled"}")
                appendLine()
                appendLine("Click to open ARTK dashboard")
            }
        } else {
            "ARTK is not installed in this project.\nClick to initialize."
        }
    }

    override fun getClickConsumer(): Consumer<MouseEvent> = Consumer {
        // Open the ARTK tool window
        val toolWindow = ToolWindowManager.getInstance(project).getToolWindow(ARTKPlugin.TOOL_WINDOW_ID)
        toolWindow?.show()
    }
}
