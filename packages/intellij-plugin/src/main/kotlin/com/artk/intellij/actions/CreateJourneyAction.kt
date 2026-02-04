package com.artk.intellij.actions

import com.artk.intellij.services.ARTKProjectService
import com.artk.intellij.util.FileUtils
import com.artk.intellij.util.NotificationUtils
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.ui.Messages
import com.intellij.openapi.vfs.LocalFileSystem
import java.io.File

/**
 * Action to create a new journey file
 */
class CreateJourneyAction : AnAction() {

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return

        // Get journey ID
        val journeyId = Messages.showInputDialog(
            project,
            "Enter journey ID (e.g., JRN-0001):",
            "New ARTK Journey",
            Messages.getQuestionIcon()
        ) ?: return

        if (!journeyId.matches(Regex("^JRN-\\d{4}$"))) {
            NotificationUtils.warning(
                project,
                "Invalid Journey ID",
                "Journey ID must be in format JRN-XXXX (e.g., JRN-0001)"
            )
            return
        }

        // Get journey title
        val title = Messages.showInputDialog(
            project,
            "Enter journey title:",
            "Journey Title",
            Messages.getQuestionIcon()
        ) ?: return

        // Create journey file
        val journeysPath = ARTKProjectService.getInstance(project).journeysPath ?: return
        val proposedDir = File(journeysPath.toFile(), "proposed")
        proposedDir.mkdirs()

        val filename = "${journeyId}__${title.lowercase().replace(Regex("[^a-z0-9]+"), "-")}.md"
        val journeyFile = File(proposedDir, filename)

        if (journeyFile.exists()) {
            NotificationUtils.warning(
                project,
                "Journey Exists",
                "A journey with this ID already exists."
            )
            return
        }

        // Write journey template
        val content = createJourneyTemplate(journeyId, title)
        FileUtils.writeFileContent(journeyFile, content)

        // Refresh and open
        LocalFileSystem.getInstance().refresh(false)
        val virtualFile = LocalFileSystem.getInstance().findFileByPath(journeyFile.absolutePath)
        if (virtualFile != null) {
            FileEditorManager.getInstance(project).openFile(virtualFile, true)
        }

        // Refresh journeys
        ARTKProjectService.getInstance(project).notifyJourneysChanged()

        NotificationUtils.info(
            project,
            "Journey Created",
            "Created journey: $filename"
        )
    }

    private fun createJourneyTemplate(id: String, title: String): String {
        return """---
id: $id
title: "$title"
status: proposed
tier: regression
actor: user
scope: feature

# Links
links:
  requirements: []
  issues: []

# Tests (populated when implemented)
tests: []
---

# $title

## Summary

[Brief description of what this journey tests]

## Preconditions

- [ ] User is logged in
- [ ] Required data exists

## Acceptance Criteria

1. **GIVEN** [initial context]
   **WHEN** [action taken]
   **THEN** [expected result]

## Steps

### Step 1: [Action Name]

[Description of what the user does]

**Expected Result:** [What should happen]

### Step 2: [Action Name]

[Description of what the user does]

**Expected Result:** [What should happen]

## Notes

[Any additional notes or considerations]
"""
    }

    override fun update(e: AnActionEvent) {
        val project = e.project
        e.presentation.isEnabledAndVisible = project != null &&
                ARTKProjectService.getInstance(project).isInstalled
    }
}
