package com.artk.intellij.settings

import com.intellij.openapi.options.Configurable
import com.intellij.openapi.project.Project
import com.intellij.ui.components.JBCheckBox
import com.intellij.ui.components.JBLabel
import com.intellij.ui.components.JBTextField
import com.intellij.util.ui.FormBuilder
import javax.swing.JComponent
import javax.swing.JPanel

/**
 * Settings configurable for ARTK plugin
 */
class ARTKSettingsConfigurable(private val project: Project) : Configurable {

    private var mainPanel: JPanel? = null
    private val settings = ARTKSettings.getInstance(project)

    // UI components
    private val showStatusBarCheckbox = JBCheckBox("Show status bar widget")
    private val showNotificationsCheckbox = JBCheckBox("Show notifications")
    private val autoRefreshCheckbox = JBCheckBox("Auto-refresh on file changes")
    private val refreshIntervalField = JBTextField()
    private val headedModeCheckbox = JBCheckBox("Run tests in headed mode by default")

    override fun getDisplayName(): String = "ARTK"

    override fun createComponent(): JComponent {
        mainPanel = FormBuilder.createFormBuilder()
            .addComponent(JBLabel("<html><b>Display</b></html>"))
            .addComponent(showStatusBarCheckbox)
            .addComponent(showNotificationsCheckbox)
            .addSeparator()
            .addComponent(JBLabel("<html><b>Refresh</b></html>"))
            .addComponent(autoRefreshCheckbox)
            .addLabeledComponent("Refresh interval (ms):", refreshIntervalField)
            .addSeparator()
            .addComponent(JBLabel("<html><b>Testing</b></html>"))
            .addComponent(headedModeCheckbox)
            .addComponentFillVertically(JPanel(), 0)
            .panel

        return mainPanel!!
    }

    override fun isModified(): Boolean {
        return showStatusBarCheckbox.isSelected != settings.showStatusBar ||
                showNotificationsCheckbox.isSelected != settings.showNotifications ||
                autoRefreshCheckbox.isSelected != settings.autoRefresh ||
                refreshIntervalField.text.toIntOrNull() != settings.refreshIntervalMs ||
                headedModeCheckbox.isSelected != settings.headedMode
    }

    override fun apply() {
        settings.showStatusBar = showStatusBarCheckbox.isSelected
        settings.showNotifications = showNotificationsCheckbox.isSelected
        settings.autoRefresh = autoRefreshCheckbox.isSelected
        settings.refreshIntervalMs = refreshIntervalField.text.toIntOrNull() ?: 30000
        settings.headedMode = headedModeCheckbox.isSelected
    }

    override fun reset() {
        showStatusBarCheckbox.isSelected = settings.showStatusBar
        showNotificationsCheckbox.isSelected = settings.showNotifications
        autoRefreshCheckbox.isSelected = settings.autoRefresh
        refreshIntervalField.text = settings.refreshIntervalMs.toString()
        headedModeCheckbox.isSelected = settings.headedMode
    }

    override fun disposeUIResources() {
        mainPanel = null
    }
}
