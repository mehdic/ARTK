package com.artk.intellij.actions.llkb

import com.artk.intellij.services.ARTKProjectService
import com.artk.intellij.services.CLIBridgeService
import com.artk.intellij.util.NotificationUtils
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.fileChooser.FileChooserFactory
import com.intellij.openapi.fileChooser.FileSaverDescriptor

/**
 * Action to export LLKB patterns
 */
class ExportAction : AnAction() {

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return

        // Show file save dialog
        val descriptor = FileSaverDescriptor(
            "Export LLKB Patterns",
            "Choose where to save the exported patterns",
            "json"
        )

        val dialog = FileChooserFactory.getInstance().createSaveFileDialog(descriptor, project)
        val artkE2ePath = ARTKProjectService.getInstance(project).artkE2ePath
        val baseDir = artkE2ePath?.toFile()?.let {
            com.intellij.openapi.vfs.LocalFileSystem.getInstance().findFileByPath(it.absolutePath)
        }

        val wrapper = dialog.save(baseDir, "autogen-patterns.json") ?: return

        val outputPath = wrapper.file.absolutePath

        CLIBridgeService.getInstance(project).runLlkbExport(outputPath) { result ->
            if (result.success) {
                NotificationUtils.info(
                    project,
                    "LLKB Export Complete",
                    "Patterns exported to: $outputPath\n\n${result.stdout}"
                )
            } else {
                NotificationUtils.error(
                    project,
                    "LLKB Export Failed",
                    "Failed to export patterns:\n\n${result.stderr}"
                )
            }
        }
    }

    override fun update(e: AnActionEvent) {
        val project = e.project
        e.presentation.isEnabledAndVisible = project != null &&
                ARTKProjectService.getInstance(project).isInstalled &&
                ARTKProjectService.getInstance(project).llkbEnabled
    }
}
