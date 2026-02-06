package com.artk.intellij.services

import com.artk.intellij.ARTKPlugin
import com.artk.intellij.model.ARTKConfig
import com.artk.intellij.model.ARTKContext
import com.artk.intellij.model.Journey
import com.artk.intellij.model.LLKBStats
import com.artk.intellij.util.FileUtils
import com.artk.intellij.util.JsonUtils
import com.artk.intellij.util.YamlUtils
import com.intellij.openapi.Disposable
import com.intellij.openapi.components.Service
import com.intellij.openapi.components.service
import com.intellij.openapi.project.Project
import java.io.File
import java.nio.file.Path
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Project-level service for managing ARTK state
 */
@Service(Service.Level.PROJECT)
class ARTKProjectService(private val project: Project) : Disposable {

    private val _isInstalled = AtomicBoolean(false)
    private var _artkContext: ARTKContext? = null
    private var _artkConfig: ARTKConfig? = null
    private var _journeys: List<Journey> = emptyList()
    private var _llkbStats: LLKBStats? = null

    val isInstalled: Boolean get() = _isInstalled.get()
    val artkContext: ARTKContext? get() = _artkContext
    val artkConfig: ARTKConfig? get() = _artkConfig
    val journeys: List<Journey> get() = _journeys
    val llkbStats: LLKBStats? get() = _llkbStats

    val llkbEnabled: Boolean
        get() = _artkConfig?.llkb?.enabled ?: _artkContext?.llkb?.enabled ?: false

    val artkE2ePath: Path?
        get() = FileUtils.getArtkE2ePath(project)

    val artkDirPath: Path?
        get() = FileUtils.getArtkDirPath(project)

    val contextPath: Path?
        get() = FileUtils.getContextPath(project)

    val configPath: Path?
        get() = FileUtils.getConfigPath(project)

    val journeysPath: Path?
        get() = FileUtils.getJourneysPath(project)

    val llkbPath: Path?
        get() = FileUtils.getLLKBPath(project)

    companion object {
        fun getInstance(project: Project): ARTKProjectService = project.service()
    }

    init {
        refresh()
    }

    /**
     * Refresh the ARTK state by re-reading all files
     */
    fun refresh() {
        val contextFile = contextPath?.toFile()
        val wasInstalled = _isInstalled.get()

        _isInstalled.set(contextFile?.exists() == true)

        if (_isInstalled.get()) {
            // Load context
            _artkContext = contextFile?.let {
                JsonUtils.fromFile(it, ARTKContext::class.java)
            }

            // Load config
            _artkConfig = configPath?.toFile()?.let {
                YamlUtils.parseArtkConfig(it)
            }

            // Load journeys
            _journeys = loadJourneys()

            // Load LLKB stats
            _llkbStats = loadLLKBStats()
        } else {
            _artkContext = null
            _artkConfig = null
            _journeys = emptyList()
            _llkbStats = null
        }

        // Notify listeners if state changed
        if (wasInstalled != _isInstalled.get()) {
            notifyContextChanged()
        }
    }

    /**
     * Load all journey files
     */
    private fun loadJourneys(): List<Journey> {
        return FileUtils.findJourneyFiles(project).mapNotNull { file ->
            try {
                val content = file.readText()
                val frontmatter = YamlUtils.extractFrontmatter(content) ?: return@mapNotNull null
                Journey.fromFrontmatter(frontmatter, file.absolutePath).copy(
                    lastModified = file.lastModified()
                )
            } catch (e: Exception) {
                null
            }
        }
    }

    /**
     * Load LLKB statistics
     */
    private fun loadLLKBStats(): LLKBStats? {
        val llkbDir = llkbPath?.toFile() ?: return null
        if (!llkbDir.exists()) return null

        val patternsFile = File(llkbDir, ARTKPlugin.LEARNED_PATTERNS_FILE)
        return if (patternsFile.exists()) {
            JsonUtils.fromFile(patternsFile, LLKBStats::class.java)
        } else {
            LLKBStats()
        }
    }

    /**
     * Get journeys by status
     */
    fun getJourneysByStatus(): Map<String, List<Journey>> {
        return _journeys.groupBy { it.status.name.lowercase() }
    }

    /**
     * Find a journey by ID
     */
    fun findJourneyById(id: String): Journey? {
        return _journeys.find { it.id == id }
    }

    /**
     * Notify listeners that context has changed
     */
    private fun notifyContextChanged() {
        project.messageBus.syncPublisher(ARTKTopics.CONTEXT_CHANGED)
            .onContextChanged(_isInstalled.get(), _artkContext)
    }

    /**
     * Notify listeners that journeys have changed
     */
    fun notifyJourneysChanged() {
        _journeys = loadJourneys()
        project.messageBus.syncPublisher(ARTKTopics.JOURNEYS_CHANGED)
            .onJourneysChanged()
    }

    override fun dispose() {
        // Cleanup if needed
    }
}
