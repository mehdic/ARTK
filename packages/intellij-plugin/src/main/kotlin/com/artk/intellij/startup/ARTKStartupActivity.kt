package com.artk.intellij.startup

import com.artk.intellij.services.ARTKApplicationService
import com.artk.intellij.services.ARTKProjectService
import com.artk.intellij.util.NotificationUtils
import com.intellij.openapi.project.Project
import com.intellij.openapi.startup.ProjectActivity

/**
 * Startup activity that runs when a project is opened
 */
class ARTKStartupActivity : ProjectActivity {

    override suspend fun execute(project: Project) {
        // Initialize project service (triggers ARTK detection)
        val projectService = ARTKProjectService.getInstance(project)

        // Check prerequisites on first run
        val appService = ARTKApplicationService.getInstance()
        if (!appService.hasPrerequisites) {
            val result = appService.checkPrerequisites()
            if (result.issues.isNotEmpty()) {
                NotificationUtils.warning(
                    project,
                    "ARTK Prerequisites",
                    "Some prerequisites are missing:\n${result.issues.joinToString("\n")}"
                )
            }
        }

        // If ARTK is installed, show a welcome notification
        if (projectService.isInstalled) {
            val context = projectService.artkContext
            val journeyCount = projectService.journeys.size
            NotificationUtils.info(
                project,
                "ARTK Ready",
                "ARTK v${context?.artkVersion ?: "?"} detected with $journeyCount journeys"
            )
        }
    }
}
