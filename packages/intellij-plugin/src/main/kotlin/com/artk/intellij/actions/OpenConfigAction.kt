package com.artk.intellij.actions

import com.artk.intellij.services.ARTKProjectService
import com.artk.intellij.util.NotificationUtils
import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.vfs.LocalFileSystem

/**
 * Action to open the artk.config.yml file
 */
class OpenConfigAction : AnAction() {

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        val configPath = ARTKProjectService.getInstance(project).configPath ?: return

        val virtualFile = LocalFileSystem.getInstance().findFileByPath(configPath.toString())
        if (virtualFile != null) {
            FileEditorManager.getInstance(project).openFile(virtualFile, true)
        } else {
            NotificationUtils.warning(
                project,
                "Config Not Found",
                "artk.config.yml not found at: $configPath"
            )
        }
    }

    override fun update(e: AnActionEvent) {
        val project = e.project
        e.presentation.isEnabledAndVisible = project != null &&
                ARTKProjectService.getInstance(project).isInstalled
    }
}
