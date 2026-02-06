package com.artk.intellij.util

import com.artk.intellij.ARTKPlugin
import com.intellij.notification.NotificationGroupManager
import com.intellij.notification.NotificationType
import com.intellij.openapi.project.Project

/**
 * Utility functions for showing notifications
 */
object NotificationUtils {

    fun info(project: Project?, title: String, content: String) {
        notify(project, title, content, NotificationType.INFORMATION)
    }

    fun warning(project: Project?, title: String, content: String) {
        notify(project, title, content, NotificationType.WARNING)
    }

    fun error(project: Project?, title: String, content: String) {
        notify(project, title, content, NotificationType.ERROR)
    }

    private fun notify(project: Project?, title: String, content: String, type: NotificationType) {
        NotificationGroupManager.getInstance()
            .getNotificationGroup(ARTKPlugin.NOTIFICATION_GROUP_ID)
            .createNotification(title, content, type)
            .notify(project)
    }
}
