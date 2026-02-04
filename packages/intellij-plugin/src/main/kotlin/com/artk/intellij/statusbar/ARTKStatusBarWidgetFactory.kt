package com.artk.intellij.statusbar

import com.artk.intellij.ARTKPlugin
import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.StatusBar
import com.intellij.openapi.wm.StatusBarWidget
import com.intellij.openapi.wm.StatusBarWidgetFactory

/**
 * Factory for creating the ARTK status bar widget
 */
class ARTKStatusBarWidgetFactory : StatusBarWidgetFactory {

    override fun getId(): String = "ARTKStatusBar"

    override fun getDisplayName(): String = "ARTK Status"

    override fun isAvailable(project: Project): Boolean = true

    override fun createWidget(project: Project): StatusBarWidget {
        return ARTKStatusBarWidget(project)
    }

    override fun disposeWidget(widget: StatusBarWidget) {
        // Cleanup handled by widget's dispose method
    }

    override fun canBeEnabledOn(statusBar: StatusBar): Boolean = true
}
