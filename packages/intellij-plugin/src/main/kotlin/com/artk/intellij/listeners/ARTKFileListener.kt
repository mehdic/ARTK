package com.artk.intellij.listeners

import com.artk.intellij.ARTKPlugin
import com.artk.intellij.services.ARTKProjectService
import com.intellij.openapi.project.Project
import com.intellij.openapi.project.ProjectManager
import com.intellij.openapi.vfs.AsyncFileListener
import com.intellij.openapi.vfs.newvfs.events.VFileContentChangeEvent
import com.intellij.openapi.vfs.newvfs.events.VFileCreateEvent
import com.intellij.openapi.vfs.newvfs.events.VFileDeleteEvent
import com.intellij.openapi.vfs.newvfs.events.VFileEvent

/**
 * File listener that detects changes to ARTK-related files
 */
class ARTKFileListener : AsyncFileListener {

    override fun prepareChange(events: MutableList<out VFileEvent>): AsyncFileListener.ChangeApplier? {
        val relevantEvents = events.filter { event ->
            val path = event.path
            isArtkRelatedPath(path)
        }

        if (relevantEvents.isEmpty()) {
            return null
        }

        return object : AsyncFileListener.ChangeApplier {
            override fun afterVfsChange() {
                for (event in relevantEvents) {
                    handleFileEvent(event)
                }
            }
        }
    }

    private fun isArtkRelatedPath(path: String): Boolean {
        return path.contains("/${ARTKPlugin.ARTK_E2E_DIR}/") &&
                (path.endsWith(ARTKPlugin.CONTEXT_FILE) ||
                        path.endsWith(ARTKPlugin.CONFIG_FILE) ||
                        path.contains("/journeys/") && path.endsWith(".md") ||
                        path.contains("/${ARTKPlugin.LLKB_DIR}/"))
    }

    private fun handleFileEvent(event: VFileEvent) {
        val path = event.path

        // Find the project that contains this file
        val project = findProjectForPath(path) ?: return

        when (event) {
            is VFileCreateEvent, is VFileDeleteEvent -> {
                // Context or config file created/deleted - refresh everything
                if (path.endsWith(ARTKPlugin.CONTEXT_FILE) || path.endsWith(ARTKPlugin.CONFIG_FILE)) {
                    ARTKProjectService.getInstance(project).refresh()
                }
                // Journey file created/deleted - refresh journeys
                else if (path.contains("/journeys/") && path.endsWith(".md")) {
                    ARTKProjectService.getInstance(project).notifyJourneysChanged()
                }
            }
            is VFileContentChangeEvent -> {
                // Config changed - refresh config
                if (path.endsWith(ARTKPlugin.CONFIG_FILE)) {
                    ARTKProjectService.getInstance(project).refresh()
                }
                // Journey changed - refresh journeys
                else if (path.contains("/journeys/") && path.endsWith(".md")) {
                    ARTKProjectService.getInstance(project).notifyJourneysChanged()
                }
                // LLKB changed - refresh
                else if (path.contains("/${ARTKPlugin.LLKB_DIR}/")) {
                    ARTKProjectService.getInstance(project).refresh()
                }
            }
        }
    }

    private fun findProjectForPath(path: String): Project? {
        return ProjectManager.getInstance().openProjects.find { project ->
            project.basePath?.let { basePath ->
                path.startsWith(basePath)
            } ?: false
        }
    }
}
