package com.artk.intellij.services

import com.artk.intellij.util.NotificationUtils
import com.artk.intellij.util.ProcessUtils
import com.intellij.openapi.components.Service
import com.intellij.openapi.components.service
import com.intellij.openapi.progress.ProgressIndicator
import com.intellij.openapi.progress.ProgressManager
import com.intellij.openapi.progress.Task
import com.intellij.openapi.project.Project
import java.io.File

/**
 * Service for executing ARTK CLI commands
 */
@Service(Service.Level.PROJECT)
class CLIBridgeService(private val project: Project) {

    companion object {
        fun getInstance(project: Project): CLIBridgeService = project.service()
    }

    /**
     * Run artk init command
     */
    fun runInit(
        targetPath: File,
        options: InitOptions = InitOptions(),
        onComplete: (ProcessUtils.ProcessResult) -> Unit
    ) {
        runCliCommand("Initialize ARTK", buildList {
            add("npx")
            add("@artk/cli")
            add("init")
            add(targetPath.absolutePath)
            if (options.skipNpm) add("--skip-npm")
            if (options.skipLlkb) add("--skip-llkb")
            if (options.skipBrowsers) add("--skip-browsers")
            if (options.force) add("--force")
            options.variant?.let {
                add("--variant")
                add(it)
            }
        }, targetPath.parentFile, onComplete)
    }

    /**
     * Run artk doctor command
     */
    fun runDoctor(onComplete: (ProcessUtils.ProcessResult) -> Unit) {
        val workDir = getArtkE2eDir() ?: return
        runCliCommand("Run Doctor", listOf("npx", "@artk/cli", "doctor"), workDir, onComplete)
    }

    /**
     * Run artk check command
     */
    fun runCheck(onComplete: (ProcessUtils.ProcessResult) -> Unit) {
        runCliCommand("Check Prerequisites", listOf("npx", "@artk/cli", "check"), null, onComplete)
    }

    /**
     * Run artk upgrade command
     */
    fun runUpgrade(onComplete: (ProcessUtils.ProcessResult) -> Unit) {
        val workDir = getArtkE2eDir() ?: return
        runCliCommand("Upgrade ARTK", listOf("npx", "@artk/cli", "upgrade"), workDir, onComplete)
    }

    /**
     * Run artk uninstall command
     */
    fun runUninstall(onComplete: (ProcessUtils.ProcessResult) -> Unit) {
        val workDir = project.basePath?.let { File(it) } ?: return
        runCliCommand("Uninstall ARTK", listOf("npx", "@artk/cli", "uninstall", "."), workDir, onComplete)
    }

    /**
     * Run artk llkb health command
     */
    fun runLlkbHealth(onComplete: (ProcessUtils.ProcessResult) -> Unit) {
        val workDir = getArtkE2eDir() ?: return
        runCliCommand("Check LLKB Health", listOf("npx", "@artk/cli", "llkb", "health"), workDir, onComplete)
    }

    /**
     * Run artk llkb stats command
     */
    fun runLlkbStats(onComplete: (ProcessUtils.ProcessResult) -> Unit) {
        val workDir = getArtkE2eDir() ?: return
        runCliCommand("Get LLKB Stats", listOf("npx", "@artk/cli", "llkb", "stats"), workDir, onComplete)
    }

    /**
     * Run artk llkb export command
     */
    fun runLlkbExport(outputPath: String, onComplete: (ProcessUtils.ProcessResult) -> Unit) {
        val workDir = getArtkE2eDir() ?: return
        runCliCommand(
            "Export LLKB Patterns",
            listOf("npx", "@artk/cli", "llkb", "export", "--for-autogen", "--output", outputPath),
            workDir,
            onComplete
        )
    }

    /**
     * Run artk-autogen llkb-patterns prune command
     */
    fun runLlkbPrune(minConfidence: Double = 0.3, onComplete: (ProcessUtils.ProcessResult) -> Unit) {
        val workDir = getArtkE2eDir() ?: return
        runCliCommand(
            "Prune LLKB Patterns",
            listOf("npx", "artk-autogen", "llkb-patterns", "prune", "--min-confidence", minConfidence.toString()),
            workDir,
            onComplete
        )
    }

    /**
     * Run artk-autogen llkb-patterns promote command
     */
    fun runLlkbPromote(apply: Boolean = false, onComplete: (ProcessUtils.ProcessResult) -> Unit) {
        val workDir = getArtkE2eDir() ?: return
        val command = buildList {
            add("npx")
            add("artk-autogen")
            add("llkb-patterns")
            add("promote")
            if (apply) add("--apply")
        }
        runCliCommand("Promote LLKB Patterns", command, workDir, onComplete)
    }

    /**
     * Run artk-autogen llkb-patterns clear command
     */
    fun runLlkbClear(force: Boolean = false, onComplete: (ProcessUtils.ProcessResult) -> Unit) {
        val workDir = getArtkE2eDir() ?: return
        val command = buildList {
            add("npx")
            add("artk-autogen")
            add("llkb-patterns")
            add("clear")
            if (force) add("--force")
        }
        runCliCommand("Clear LLKB Patterns", command, workDir, onComplete)
    }

    /**
     * Run artk-autogen llkb-patterns list command
     */
    fun runLlkbList(limit: Int = 20, onComplete: (ProcessUtils.ProcessResult) -> Unit) {
        val workDir = getArtkE2eDir() ?: return
        runCliCommand(
            "List LLKB Patterns",
            listOf("npx", "artk-autogen", "llkb-patterns", "list", "--limit", limit.toString()),
            workDir,
            onComplete
        )
    }

    /**
     * Run artk-autogen generate command
     */
    fun runAutogenGenerate(
        journeyPath: String,
        outputDir: String,
        onComplete: (ProcessUtils.ProcessResult) -> Unit
    ) {
        val workDir = getArtkE2eDir() ?: return
        runCliCommand(
            "Generate Tests",
            listOf("npx", "artk-autogen", "generate", journeyPath, "-o", outputDir),
            workDir,
            onComplete,
            timeoutSeconds = 300
        )
    }

    /**
     * Run artk-autogen validate command for journey validation
     */
    fun runJourneyValidate(
        journeyPattern: String = "../journeys/clarified/*.md",
        onComplete: (ProcessUtils.ProcessResult) -> Unit
    ) {
        val workDir = getArtkE2eDir() ?: return
        runCliCommand(
            "Validate Journeys",
            listOf("npx", "artk-autogen", "validate", journeyPattern, "--json"),
            workDir,
            onComplete,
            timeoutSeconds = 120
        )
    }

    /**
     * Run artk-autogen generate command for journey implementation
     */
    fun runJourneyImplement(
        journeyPattern: String = "../journeys/clarified/*.md",
        outputDir: String = "tests/",
        onComplete: (ProcessUtils.ProcessResult) -> Unit
    ) {
        val workDir = getArtkE2eDir() ?: return
        runCliCommand(
            "Implement Journeys",
            listOf("npx", "artk-autogen", "generate", journeyPattern, "-o", outputDir, "--force"),
            workDir,
            onComplete,
            timeoutSeconds = 600
        )
    }

    /**
     * Run LLKB seed command to add universal patterns
     */
    fun runLlkbSeed(
        patterns: String = "universal",
        dryRun: Boolean = false,
        onComplete: (ProcessUtils.ProcessResult) -> Unit
    ) {
        val workDir = getArtkE2eDir() ?: return
        runCliCommand(
            "Seed LLKB",
            buildList {
                add("npx")
                add("@artk/cli")
                add("llkb")
                add("seed")
                add("--patterns")
                add(patterns)
                if (dryRun) add("--dry-run")
            },
            workDir,
            onComplete
        )
    }

    /**
     * Run Playwright test command
     */
    fun runPlaywrightTest(
        testPath: String? = null,
        options: PlaywrightOptions = PlaywrightOptions(),
        onComplete: (ProcessUtils.ProcessResult) -> Unit
    ) {
        val workDir = getArtkE2eDir() ?: return
        runCliCommand("Run Tests", buildList {
            add("npx")
            add("playwright")
            add("test")
            testPath?.let { add(it) }
            if (options.headed) add("--headed")
            if (options.debug) add("--debug")
            options.project?.let {
                add("--project")
                add(it)
            }
            options.grep?.let {
                add("--grep")
                add(it)
            }
        }, workDir, onComplete, timeoutSeconds = 600)
    }

    /**
     * Execute a CLI command with progress indicator
     */
    private fun runCliCommand(
        title: String,
        command: List<String>,
        workDir: File?,
        onComplete: (ProcessUtils.ProcessResult) -> Unit,
        timeoutSeconds: Long = 120
    ) {
        ProgressManager.getInstance().run(object : Task.Backgroundable(project, title, true) {
            override fun run(indicator: ProgressIndicator) {
                indicator.isIndeterminate = true
                indicator.text = "Running: ${command.joinToString(" ")}"

                val result = ProcessUtils.execute(
                    command,
                    workDir,
                    timeoutSeconds
                )

                onComplete(result)
            }

            override fun onThrowable(error: Throwable) {
                NotificationUtils.error(
                    project,
                    "Command Failed",
                    "Error running $title: ${error.message}"
                )
            }
        })
    }

    private fun getArtkE2eDir(): File? {
        val basePath = project.basePath ?: return null
        val artkE2eDir = File(basePath, "artk-e2e")
        return if (artkE2eDir.exists()) artkE2eDir else File(basePath)
    }
}

/**
 * Options for artk init command
 */
data class InitOptions(
    val skipNpm: Boolean = false,
    val skipLlkb: Boolean = false,
    val skipBrowsers: Boolean = false,
    val force: Boolean = false,
    val variant: String? = null
)

/**
 * Options for Playwright test command
 */
data class PlaywrightOptions(
    val headed: Boolean = false,
    val debug: Boolean = false,
    val project: String? = null,
    val grep: String? = null
)
