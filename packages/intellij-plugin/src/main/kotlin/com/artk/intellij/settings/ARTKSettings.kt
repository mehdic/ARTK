package com.artk.intellij.settings

import com.intellij.openapi.components.*
import com.intellij.openapi.project.Project

/**
 * ARTK plugin settings for a project
 */
@Service(Service.Level.PROJECT)
@State(
    name = "ARTKSettings",
    storages = [Storage("artk.xml")]
)
class ARTKSettings : PersistentStateComponent<ARTKSettingsState> {

    private var state = ARTKSettingsState()

    override fun getState(): ARTKSettingsState = state

    override fun loadState(state: ARTKSettingsState) {
        this.state = state
    }

    companion object {
        fun getInstance(project: Project): ARTKSettings = project.service()
    }

    // Settings accessors
    var showStatusBar: Boolean
        get() = state.showStatusBar
        set(value) { state.showStatusBar = value }

    var showNotifications: Boolean
        get() = state.showNotifications
        set(value) { state.showNotifications = value }

    var autoRefresh: Boolean
        get() = state.autoRefresh
        set(value) { state.autoRefresh = value }

    var refreshIntervalMs: Int
        get() = state.refreshIntervalMs
        set(value) { state.refreshIntervalMs = value }

    var defaultTestRunner: String
        get() = state.defaultTestRunner
        set(value) { state.defaultTestRunner = value }

    var headedMode: Boolean
        get() = state.headedMode
        set(value) { state.headedMode = value }
}

/**
 * State class for ARTK settings
 */
data class ARTKSettingsState(
    var showStatusBar: Boolean = true,
    var showNotifications: Boolean = true,
    var autoRefresh: Boolean = true,
    var refreshIntervalMs: Int = 30000,
    var defaultTestRunner: String = "playwright",
    var headedMode: Boolean = false
)
