package com.artk.intellij.toolwindow.panels

import com.artk.intellij.services.ARTKProjectService
import com.artk.intellij.services.InstallerService
import com.artk.intellij.services.InstallOptions
import com.artk.intellij.services.InstallResult
import com.intellij.openapi.project.Project
import com.intellij.ui.components.JBLabel
import com.intellij.ui.components.JBPanel
import com.intellij.ui.components.JBScrollPane
import com.intellij.ui.jcef.JBCefBrowser
import com.intellij.ui.jcef.JBCefBrowserBase
import com.intellij.ui.jcef.JBCefJSQuery
import com.intellij.util.ui.JBUI
import org.cef.browser.CefBrowser
import org.cef.browser.CefFrame
import org.cef.handler.CefLoadHandlerAdapter
import java.awt.BorderLayout
import javax.swing.JComponent
import javax.swing.SwingConstants

/**
 * Panel showing ARTK dashboard using JCEF (embedded Chromium)
 */
class DashboardPanel(private val project: Project) : JBPanel<DashboardPanel>(BorderLayout()) {

    private val projectService = ARTKProjectService.getInstance(project)
    private var browser: JBCefBrowser? = null
    private var jsQuery: JBCefJSQuery? = null

    init {
        border = JBUI.Borders.empty()
        refresh()
    }

    fun refresh() {
        removeAll()

        if (!projectService.isInstalled) {
            add(createNotInstalledView(), BorderLayout.CENTER)
        } else {
            add(createDashboardView(), BorderLayout.CENTER)
        }

        revalidate()
        repaint()
    }

    private fun createNotInstalledView(): JComponent {
        val panel = JBPanel<JBPanel<*>>(BorderLayout())
        panel.border = JBUI.Borders.empty(20)

        val label = JBLabel("""
            <html>
            <center>
            <h2>Welcome to ARTK</h2>
            <p>Automatic Regression Testing Kit</p>
            <br>
            <p>ARTK is not installed in this project.</p>
            <p>Use the <b>Status</b> tab to initialize ARTK.</p>
            </center>
            </html>
        """.trimIndent())
        label.horizontalAlignment = SwingConstants.CENTER
        panel.add(label, BorderLayout.CENTER)

        return panel
    }

    private fun createDashboardView(): JComponent {
        // Check if JCEF is supported
        if (!JBCefBrowser.isCefBrowserCreationSupported()) {
            return createFallbackView()
        }

        try {
            browser = JBCefBrowser()

            // Create JS query for callbacks from JavaScript
            jsQuery = JBCefJSQuery.create(browser as JBCefBrowserBase)
            jsQuery!!.addHandler { request ->
                handleJsCallback(request)
                JBCefJSQuery.Response("ok")
            }

            // Load dashboard HTML
            browser!!.loadHTML(generateDashboardHtml())

            // Inject bridge after load
            browser!!.jbCefClient.addLoadHandler(object : CefLoadHandlerAdapter() {
                override fun onLoadEnd(browser: CefBrowser?, frame: CefFrame?, httpStatusCode: Int) {
                    injectJsBridge()
                }
            }, browser!!.cefBrowser)

            return browser!!.component
        } catch (e: Exception) {
            return createFallbackView()
        }
    }

    private fun createFallbackView(): JComponent {
        // Fallback when JCEF is not available
        val panel = JBPanel<JBPanel<*>>(BorderLayout())
        panel.border = JBUI.Borders.empty(10)

        val content = buildString {
            appendLine("<html>")
            appendLine("<h2>ARTK Dashboard</h2>")

            val context = projectService.artkContext
            val config = projectService.artkConfig

            appendLine("<h3>Status</h3>")
            appendLine("<ul>")
            appendLine("<li>Version: ${context?.artkVersion ?: "Unknown"}</li>")
            appendLine("<li>Variant: ${context?.variant ?: "Unknown"}</li>")
            appendLine("<li>Playwright: ${context?.playwrightVersion ?: "Unknown"}</li>")
            appendLine("</ul>")

            if (config != null) {
                appendLine("<h3>Configuration</h3>")
                appendLine("<ul>")
                appendLine("<li>App: ${config.app.name}</li>")
                appendLine("<li>Environments: ${config.environments.size}</li>")
                appendLine("<li>LLKB: ${if (projectService.llkbEnabled) "Enabled" else "Disabled"}</li>")
                appendLine("</ul>")
            }

            val stats = projectService.llkbStats
            if (stats != null) {
                appendLine("<h3>LLKB</h3>")
                appendLine("<ul>")
                appendLine("<li>Patterns: ${stats.totalPatterns}</li>")
                appendLine("<li>High Confidence: ${stats.highConfidencePatterns}</li>")
                appendLine("<li>Avg Confidence: ${"%.2f".format(stats.averageConfidence)}</li>")
                appendLine("</ul>")
            }

            val journeysByStatus = projectService.getJourneysByStatus()
            appendLine("<h3>Journeys</h3>")
            appendLine("<ul>")
            journeysByStatus.forEach { (status, journeys) ->
                appendLine("<li>${status.replaceFirstChar { it.uppercase() }}: ${journeys.size}</li>")
            }
            appendLine("</ul>")

            appendLine("</html>")
        }

        val label = JBLabel(content)
        label.verticalAlignment = SwingConstants.TOP

        return JBScrollPane(label)
    }

    private fun generateDashboardHtml(): String {
        val context = projectService.artkContext
        val config = projectService.artkConfig
        val stats = projectService.llkbStats
        val journeysByStatus = projectService.getJourneysByStatus()

        return """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        :root {
            --bg-color: #1e1e1e;
            --card-bg: #2d2d2d;
            --text-color: #cccccc;
            --accent-color: #4fc3f7;
            --success-color: #81c784;
            --warning-color: #ffb74d;
            --border-color: #404040;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: var(--bg-color);
            color: var(--text-color);
            margin: 0;
            padding: 20px;
        }
        h1, h2, h3 { color: var(--text-color); margin-top: 0; }
        .dashboard { max-width: 800px; margin: 0 auto; }
        .card {
            background: var(--card-bg);
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 16px;
            border: 1px solid var(--border-color);
        }
        .card h3 { color: var(--accent-color); margin-bottom: 12px; }
        .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; }
        .stat-item { text-align: center; }
        .stat-value { font-size: 24px; font-weight: bold; color: var(--accent-color); }
        .stat-label { font-size: 12px; color: #888; }
        .journey-list { list-style: none; padding: 0; margin: 0; }
        .journey-item { padding: 8px 0; border-bottom: 1px solid var(--border-color); }
        .journey-item:last-child { border-bottom: none; }
        .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            margin-left: 8px;
        }
        .badge-proposed { background: #616161; }
        .badge-defined { background: #1565c0; }
        .badge-clarified { background: #6a1b9a; }
        .badge-implemented { background: #2e7d32; }
        .badge-quarantined { background: #e65100; }
        .btn {
            background: var(--accent-color);
            color: #000;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            margin-right: 8px;
            margin-top: 8px;
        }
        .btn:hover { opacity: 0.9; }
        .btn-secondary { background: #555; color: #fff; }
    </style>
</head>
<body>
    <div class="dashboard">
        <h1>ARTK Dashboard</h1>

        <div class="card">
            <h3>Status</h3>
            <div class="stat-grid">
                <div class="stat-item">
                    <div class="stat-value">${context?.artkVersion ?: "-"}</div>
                    <div class="stat-label">Version</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${context?.variant ?: "-"}</div>
                    <div class="stat-label">Variant</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${context?.playwrightVersion ?: "-"}</div>
                    <div class="stat-label">Playwright</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${if (projectService.llkbEnabled) "On" else "Off"}</div>
                    <div class="stat-label">LLKB</div>
                </div>
            </div>
        </div>

        <div class="card">
            <h3>Journeys</h3>
            <div class="stat-grid">
                ${journeysByStatus.map { (status, journeys) -> """
                <div class="stat-item">
                    <div class="stat-value">${journeys.size}</div>
                    <div class="stat-label">${status.replaceFirstChar { it.uppercase() }}</div>
                </div>
                """ }.joinToString("")}
            </div>
        </div>

        ${if (stats != null) """
        <div class="card">
            <h3>LLKB Patterns</h3>
            <div class="stat-grid">
                <div class="stat-item">
                    <div class="stat-value">${stats.totalPatterns}</div>
                    <div class="stat-label">Total</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${stats.highConfidencePatterns}</div>
                    <div class="stat-label">High Conf.</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${stats.promotablePatterns}</div>
                    <div class="stat-label">Promotable</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${"%.0f".format(stats.averageConfidence * 100)}%</div>
                    <div class="stat-label">Avg Conf.</div>
                </div>
            </div>
        </div>
        """ else ""}

        <div class="card">
            <h3>Quick Actions</h3>
            <button class="btn" onclick="sendToIde('doctor')">Run Doctor</button>
            <button class="btn" onclick="sendToIde('check')">Check Prerequisites</button>
            <button class="btn btn-secondary" onclick="sendToIde('config')">Open Config</button>
            <button class="btn btn-secondary" onclick="sendToIde('refresh')">Refresh</button>
        </div>
    </div>

    <script>
        function sendToIde(action) {
            if (window.artkBridge) {
                window.artkBridge(action);
            }
        }
    </script>
</body>
</html>
        """.trimIndent()
    }

    private fun injectJsBridge() {
        val jsCode = """
            window.artkBridge = function(action) {
                ${jsQuery?.inject("action")}
            };
        """.trimIndent()
        browser?.cefBrowser?.executeJavaScript(jsCode, "", 0)
    }

    private fun handleJsCallback(action: String) {
        com.intellij.openapi.application.ApplicationManager.getApplication().invokeLater {
            when (action) {
                "doctor" -> {
                    com.artk.intellij.services.CLIBridgeService.getInstance(project).runDoctor { result ->
                        com.intellij.openapi.application.ApplicationManager.getApplication().invokeLater {
                            if (result.success) {
                                com.artk.intellij.util.NotificationUtils.info(
                                    project,
                                    "ARTK Doctor",
                                    "Doctor completed successfully.\n\n${result.stdout}"
                                )
                            } else {
                                com.artk.intellij.util.NotificationUtils.warning(
                                    project,
                                    "ARTK Doctor",
                                    "Doctor found issues:\n\n${result.stdout}\n${result.stderr}"
                                )
                            }
                        }
                    }
                }
                "check" -> {
                    val result = com.artk.intellij.services.ARTKApplicationService.getInstance().checkPrerequisites()
                    val message = buildString {
                        appendLine("Prerequisites Check:")
                        appendLine()
                        appendLine("Node.js: ${result.nodeVersion ?: "Not found"}")
                        appendLine("npm: ${result.npmVersion ?: "Not found"}")
                        appendLine("ARTK CLI: ${result.artkCliVersion ?: "Not installed"}")
                        if (result.issues.isNotEmpty()) {
                            appendLine()
                            appendLine("Issues:")
                            result.issues.forEach { issue ->
                                appendLine("  - $issue")
                            }
                        }
                    }
                    if (result.success) {
                        com.artk.intellij.util.NotificationUtils.info(project, "Prerequisites OK", message)
                    } else {
                        com.artk.intellij.util.NotificationUtils.warning(project, "Prerequisites Issues", message)
                    }
                }
                "config" -> {
                    val configPath = projectService.configPath
                    if (configPath != null) {
                        val virtualFile = com.intellij.openapi.vfs.LocalFileSystem.getInstance()
                            .findFileByPath(configPath.toString())
                        if (virtualFile != null) {
                            com.intellij.openapi.fileEditor.FileEditorManager.getInstance(project)
                                .openFile(virtualFile, true)
                        } else {
                            com.artk.intellij.util.NotificationUtils.warning(
                                project,
                                "Config Not Found",
                                "artk.config.yml not found at: $configPath"
                            )
                        }
                    }
                }
                "refresh" -> {
                    projectService.refresh()
                    refresh()
                }
                "install" -> {
                    // Show install options dialog
                    val options = com.artk.intellij.dialogs.InstallOptionsDialog.showAndGet(project)
                    if (options != null) {
                        InstallerService.getInstance(project).install(
                            options = options,
                            onComplete = { result: InstallResult ->
                                com.intellij.openapi.application.ApplicationManager.getApplication().invokeLater {
                                    if (result.success) {
                                        com.artk.intellij.util.NotificationUtils.info(
                                            project,
                                            "ARTK Installed",
                                            "ARTK has been successfully installed to your project."
                                        )
                                        refresh()
                                    } else {
                                        com.artk.intellij.util.NotificationUtils.error(
                                            project,
                                            "Installation Failed",
                                            result.message
                                        )
                                    }
                                }
                            }
                        )
                    }
                }
            }
        }
    }

    fun dispose() {
        jsQuery?.dispose()
        browser?.dispose()
    }
}
