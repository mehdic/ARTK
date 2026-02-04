package com.artk.intellij.services

import com.artk.intellij.model.ARTKContext
import com.intellij.util.messages.Topic

/**
 * Message bus topics for ARTK events
 */
object ARTKTopics {

    /**
     * Topic for context change events
     */
    val CONTEXT_CHANGED: Topic<ContextChangedListener> = Topic.create(
        "ARTK Context Changed",
        ContextChangedListener::class.java
    )

    /**
     * Topic for installation events
     */
    val INSTALLATION_CHANGED: Topic<InstallationListener> = Topic.create(
        "ARTK Installation Changed",
        InstallationListener::class.java
    )

    /**
     * Topic for journey change events
     */
    val JOURNEYS_CHANGED: Topic<JourneysChangedListener> = Topic.create(
        "ARTK Journeys Changed",
        JourneysChangedListener::class.java
    )
}

/**
 * Listener for context changes
 */
interface ContextChangedListener {
    fun onContextChanged(isInstalled: Boolean, context: ARTKContext?)
}

/**
 * Listener for installation changes
 */
interface InstallationListener {
    fun onInstallationStarted()
    fun onInstallationProgress(step: String, progress: Int)
    fun onInstallationCompleted(success: Boolean, message: String?)
}

/**
 * Listener for journey changes
 */
interface JourneysChangedListener {
    fun onJourneysChanged()
}
