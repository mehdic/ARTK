package com.artk.intellij.util

import com.artk.intellij.ARTKPlugin
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.LocalFileSystem
import com.intellij.openapi.vfs.VirtualFile
import java.io.File
import java.nio.file.Path
import java.nio.file.Paths

/**
 * Utility functions for file operations
 */
object FileUtils {

    /**
     * Get the artk-e2e directory path for a project
     */
    fun getArtkE2ePath(project: Project): Path? {
        return project.basePath?.let { Paths.get(it, ARTKPlugin.ARTK_E2E_DIR) }
    }

    /**
     * Get the .artk directory path
     */
    fun getArtkDirPath(project: Project): Path? {
        return getArtkE2ePath(project)?.resolve(ARTKPlugin.ARTK_DIR)
    }

    /**
     * Get the context.json file path
     */
    fun getContextPath(project: Project): Path? {
        return getArtkDirPath(project)?.resolve(ARTKPlugin.CONTEXT_FILE)
    }

    /**
     * Get the artk.config.yml file path
     */
    fun getConfigPath(project: Project): Path? {
        return getArtkE2ePath(project)?.resolve(ARTKPlugin.CONFIG_FILE)
    }

    /**
     * Get the journeys directory path
     */
    fun getJourneysPath(project: Project): Path? {
        return getArtkE2ePath(project)?.resolve(ARTKPlugin.JOURNEYS_DIR)
    }

    /**
     * Get the LLKB directory path
     */
    fun getLLKBPath(project: Project): Path? {
        return getArtkDirPath(project)?.resolve(ARTKPlugin.LLKB_DIR)
    }

    /**
     * Get VirtualFile from path
     */
    fun getVirtualFile(path: Path): VirtualFile? {
        return LocalFileSystem.getInstance().findFileByPath(path.toString())
    }

    /**
     * Check if ARTK is installed in the project
     */
    fun isArtkInstalled(project: Project): Boolean {
        val contextPath = getContextPath(project) ?: return false
        return contextPath.toFile().exists()
    }

    /**
     * Find all journey files in the project
     */
    fun findJourneyFiles(project: Project): List<File> {
        val journeysPath = getJourneysPath(project) ?: return emptyList()
        val journeysDir = journeysPath.toFile()

        if (!journeysDir.exists() || !journeysDir.isDirectory) {
            return emptyList()
        }

        return journeysDir.walkTopDown()
            .filter { it.isFile && it.extension == "md" }
            .toList()
    }

    /**
     * Read file content safely
     */
    fun readFileContent(file: File): String? {
        return try {
            if (file.exists()) file.readText() else null
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Write file content safely
     */
    fun writeFileContent(file: File, content: String): Boolean {
        return try {
            file.parentFile?.mkdirs()
            file.writeText(content)
            true
        } catch (e: Exception) {
            false
        }
    }
}
