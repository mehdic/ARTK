package com.artk.intellij.actions

import com.artk.intellij.services.ARTKProjectService
import com.artk.intellij.services.CLIBridgeService
import com.artk.intellij.services.PlaywrightOptions
import com.artk.intellij.util.NotificationUtils
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.CommonDataKeys

/**
 * Action to run Playwright test for a journey file
 */
class RunJourneyTestAction : AnAction() {

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        val file = e.getData(CommonDataKeys.VIRTUAL_FILE) ?: return

        // Check if this is a journey file
        if (!file.path.contains("/journeys/") || file.extension != "md") {
            NotificationUtils.warning(
                project,
                "Not a Journey File",
                "This action can only be used on journey markdown files."
            )
            return
        }

        // Find corresponding test file
        val journeyId = extractJourneyId(file.nameWithoutExtension)
        if (journeyId == null) {
            NotificationUtils.warning(
                project,
                "Invalid Journey",
                "Could not extract journey ID from filename."
            )
            return
        }

        // Run the test
        CLIBridgeService.getInstance(project).runPlaywrightTest(
            testPath = "**/*${journeyId.lowercase()}*.spec.ts",
            options = PlaywrightOptions(),
            onComplete = { result ->
                if (result.success) {
                    NotificationUtils.info(
                        project,
                        "Tests Passed",
                        "Journey tests completed successfully."
                    )
                } else {
                    NotificationUtils.warning(
                        project,
                        "Tests Failed",
                        "Some tests failed. Check the terminal for details."
                    )
                }
            }
        )
    }

    private fun extractJourneyId(filename: String): String? {
        // Extract ID from filename like "JRN-0001__user-login" -> "JRN-0001"
        val match = Regex("^(JRN-\\d+)").find(filename)
        return match?.groupValues?.get(1)
    }

    override fun update(e: AnActionEvent) {
        val project = e.project
        val file = e.getData(CommonDataKeys.VIRTUAL_FILE)

        val isJourneyFile = file != null &&
                file.path.contains("/journeys/") &&
                file.extension == "md"

        e.presentation.isEnabledAndVisible = project != null &&
                ARTKProjectService.getInstance(project).isInstalled &&
                isJourneyFile
    }
}
