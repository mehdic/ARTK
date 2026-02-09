# IntelliJ IDEA Plugin Implementation Plan

**Date:** 2026-02-04
**Document Type:** Detailed Implementation Plan
**Target:** ARTK IntelliJ IDEA Plugin
**Estimated Effort:** 10 weeks

---

## Table of Contents

1. [Project Setup](#1-project-setup)
2. [Plugin Architecture](#2-plugin-architecture)
3. [Feature Implementation Details](#3-feature-implementation-details)
4. [Phase-by-Phase Breakdown](#4-phase-by-phase-breakdown)
5. [Code Examples](#5-code-examples)
6. [Testing Strategy](#6-testing-strategy)
7. [Deployment & Publishing](#7-deployment--publishing)

---

## 1. Project Setup

### 1.1 Gradle Project Configuration

```kotlin
// build.gradle.kts
plugins {
    id("java")
    id("org.jetbrains.kotlin.jvm") version "1.9.22"
    id("org.jetbrains.intellij") version "1.17.2"
}

group = "com.artk"
version = "1.0.0"

repositories {
    mavenCentral()
}

intellij {
    version.set("2024.1")
    type.set("IC") // IntelliJ Community
    plugins.set(listOf(
        "org.jetbrains.plugins.terminal",
        "com.intellij.java"
    ))
}

dependencies {
    implementation("com.google.code.gson:gson:2.10.1")
    implementation("org.yaml:snakeyaml:2.2")

    testImplementation("junit:junit:4.13.2")
    testImplementation("org.mockito:mockito-core:5.8.0")
}

tasks {
    patchPluginXml {
        sinceBuild.set("241")
        untilBuild.set("251.*")
    }

    signPlugin {
        certificateChain.set(System.getenv("CERTIFICATE_CHAIN"))
        privateKey.set(System.getenv("PRIVATE_KEY"))
        password.set(System.getenv("PRIVATE_KEY_PASSWORD"))
    }

    publishPlugin {
        token.set(System.getenv("PUBLISH_TOKEN"))
    }
}
```

### 1.2 Plugin Descriptor (plugin.xml)

```xml
<!-- src/main/resources/META-INF/plugin.xml -->
<idea-plugin>
    <id>com.artk.intellij</id>
    <name>ARTK - Automatic Regression Testing Kit</name>
    <vendor email="support@artk.dev" url="https://artk.dev">ARTK</vendor>

    <description><![CDATA[
    Visual tools for ARTK test automation with Playwright.
    <ul>
        <li>Initialize and manage ARTK projects</li>
        <li>Journey management and visualization</li>
        <li>LLKB (Lessons Learned Knowledge Base) integration</li>
        <li>Workflow guidance with Copilot integration</li>
    </ul>
    ]]></description>

    <depends>com.intellij.modules.platform</depends>
    <depends optional="true" config-file="terminal.xml">org.jetbrains.plugins.terminal</depends>

    <extensions defaultExtensionNs="com.intellij">
        <!-- Tool Window -->
        <toolWindow id="ARTK"
                    anchor="right"
                    icon="/icons/artk-13.svg"
                    factoryClass="com.artk.intellij.toolwindow.ARTKToolWindowFactory"/>

        <!-- Status Bar Widget -->
        <statusBarWidgetFactory id="ARTKStatusBar"
                                implementation="com.artk.intellij.statusbar.ARTKStatusBarWidgetFactory"
                                order="after encodingWidget"/>

        <!-- Project Service -->
        <projectService serviceImplementation="com.artk.intellij.services.ARTKProjectService"/>

        <!-- Application Service -->
        <applicationService serviceImplementation="com.artk.intellij.services.ARTKApplicationService"/>

        <!-- Settings -->
        <projectConfigurable instance="com.artk.intellij.settings.ARTKSettingsConfigurable"
                             id="com.artk.intellij.settings"
                             displayName="ARTK"
                             groupId="tools"/>

        <!-- File Listener -->
        <vfs.asyncListener implementation="com.artk.intellij.listeners.ARTKFileListener"/>

        <!-- Startup Activity -->
        <postStartupActivity implementation="com.artk.intellij.startup.ARTKStartupActivity"/>

        <!-- Notification Group -->
        <notificationGroup id="ARTK Notifications"
                          displayType="BALLOON"
                          key="notification.group.artk"/>
    </extensions>

    <actions>
        <!-- Main Action Group -->
        <group id="ARTK.MainMenu" text="ARTK" popup="true">
            <add-to-group group-id="ToolsMenu" anchor="last"/>

            <action id="ARTK.Init"
                    class="com.artk.intellij.actions.InitAction"
                    text="Initialize ARTK"
                    description="Initialize ARTK in this project"
                    icon="/icons/init.svg"/>

            <action id="ARTK.Doctor"
                    class="com.artk.intellij.actions.DoctorAction"
                    text="Run Doctor"
                    description="Diagnose and fix ARTK issues"/>

            <action id="ARTK.Check"
                    class="com.artk.intellij.actions.CheckAction"
                    text="Check Prerequisites"
                    description="Check Node.js, npm, and Playwright"/>

            <separator/>

            <action id="ARTK.OpenConfig"
                    class="com.artk.intellij.actions.OpenConfigAction"
                    text="Open Configuration"
                    description="Open artk.config.yml"/>

            <action id="ARTK.OpenDashboard"
                    class="com.artk.intellij.actions.OpenDashboardAction"
                    text="Open Dashboard"
                    description="Open ARTK Dashboard"/>

            <separator/>

            <group id="ARTK.LLKB" text="LLKB" popup="true">
                <action id="ARTK.LLKB.Health"
                        class="com.artk.intellij.actions.llkb.HealthAction"
                        text="Check Health"/>
                <action id="ARTK.LLKB.Stats"
                        class="com.artk.intellij.actions.llkb.StatsAction"
                        text="View Statistics"/>
                <action id="ARTK.LLKB.Export"
                        class="com.artk.intellij.actions.llkb.ExportAction"
                        text="Export Patterns"/>
            </group>
        </group>

        <!-- Editor Context Menu -->
        <group id="ARTK.EditorPopup">
            <add-to-group group-id="EditorPopupMenu" anchor="last"/>
            <action id="ARTK.RunJourneyTest"
                    class="com.artk.intellij.actions.RunJourneyTestAction"
                    text="Run Journey Test"
                    description="Run Playwright test for this journey"/>
        </group>
    </actions>
</idea-plugin>
```

### 1.3 Directory Structure

```
artk-intellij-plugin/
├── build.gradle.kts
├── settings.gradle.kts
├── gradle.properties
├── src/
│   ├── main/
│   │   ├── kotlin/com/artk/intellij/
│   │   │   ├── ARTKPlugin.kt                    # Plugin constants
│   │   │   │
│   │   │   ├── actions/                         # AnAction implementations
│   │   │   │   ├── InitAction.kt
│   │   │   │   ├── DoctorAction.kt
│   │   │   │   ├── CheckAction.kt
│   │   │   │   ├── OpenConfigAction.kt
│   │   │   │   ├── OpenDashboardAction.kt
│   │   │   │   ├── UpgradeAction.kt
│   │   │   │   ├── UninstallAction.kt
│   │   │   │   ├── RunJourneyTestAction.kt
│   │   │   │   └── llkb/
│   │   │   │       ├── HealthAction.kt
│   │   │   │       ├── StatsAction.kt
│   │   │   │       └── ExportAction.kt
│   │   │   │
│   │   │   ├── toolwindow/                      # Tool window panels
│   │   │   │   ├── ARTKToolWindowFactory.kt
│   │   │   │   ├── panels/
│   │   │   │   │   ├── StatusPanel.kt
│   │   │   │   │   ├── WorkflowPanel.kt
│   │   │   │   │   ├── JourneysPanel.kt
│   │   │   │   │   └── LLKBPanel.kt
│   │   │   │   └── tree/
│   │   │   │       ├── JourneyTreeModel.kt
│   │   │   │       ├── JourneyTreeNode.kt
│   │   │   │       ├── WorkflowTreeModel.kt
│   │   │   │       └── LLKBTreeModel.kt
│   │   │   │
│   │   │   ├── dashboard/                       # JCEF-based dashboard
│   │   │   │   ├── DashboardPanel.kt
│   │   │   │   ├── DashboardJSBridge.kt
│   │   │   │   └── DashboardSchemeHandler.kt
│   │   │   │
│   │   │   ├── services/                        # Project/App services
│   │   │   │   ├── ARTKProjectService.kt
│   │   │   │   ├── ARTKApplicationService.kt
│   │   │   │   ├── WorkspaceContextService.kt
│   │   │   │   ├── CLIBridgeService.kt
│   │   │   │   └── InstallerService.kt
│   │   │   │
│   │   │   ├── settings/                        # Plugin settings
│   │   │   │   ├── ARTKSettings.kt
│   │   │   │   ├── ARTKSettingsState.kt
│   │   │   │   └── ARTKSettingsConfigurable.kt
│   │   │   │
│   │   │   ├── statusbar/                       # Status bar widget
│   │   │   │   ├── ARTKStatusBarWidget.kt
│   │   │   │   └── ARTKStatusBarWidgetFactory.kt
│   │   │   │
│   │   │   ├── installer/                       # Bundled installation
│   │   │   │   ├── ARTKInstaller.kt
│   │   │   │   ├── VariantDetector.kt
│   │   │   │   ├── BrowserDetector.kt
│   │   │   │   └── NodeDetector.kt
│   │   │   │
│   │   │   ├── listeners/                       # Event listeners
│   │   │   │   ├── ARTKFileListener.kt
│   │   │   │   └── ARTKProjectListener.kt
│   │   │   │
│   │   │   ├── startup/                         # Startup activities
│   │   │   │   └── ARTKStartupActivity.kt
│   │   │   │
│   │   │   ├── model/                           # Data models
│   │   │   │   ├── ARTKContext.kt
│   │   │   │   ├── ARTKConfig.kt
│   │   │   │   ├── Journey.kt
│   │   │   │   ├── WorkflowStep.kt
│   │   │   │   └── LLKBStats.kt
│   │   │   │
│   │   │   └── util/                            # Utilities
│   │   │       ├── FileUtils.kt
│   │   │       ├── JsonUtils.kt
│   │   │       ├── YamlUtils.kt
│   │   │       ├── ProcessUtils.kt
│   │   │       └── NotificationUtils.kt
│   │   │
│   │   └── resources/
│   │       ├── META-INF/
│   │       │   ├── plugin.xml
│   │       │   └── pluginIcon.svg
│   │       ├── icons/
│   │       │   ├── artk-13.svg
│   │       │   ├── artk-16.svg
│   │       │   ├── journey.svg
│   │       │   ├── workflow.svg
│   │       │   └── llkb.svg
│   │       ├── messages/
│   │       │   └── ARTKBundle.properties
│   │       ├── dashboard/
│   │       │   ├── index.html
│   │       │   ├── styles.css
│   │       │   └── dashboard.js
│   │       └── assets/
│   │           ├── core/           # Bundled @artk/core
│   │           ├── autogen/        # Bundled autogen
│   │           ├── journeys/       # Journey templates
│   │           └── prompts/        # AI prompts
│   │
│   └── test/
│       └── kotlin/com/artk/intellij/
│           ├── services/
│           │   └── ARTKProjectServiceTest.kt
│           ├── installer/
│           │   └── ARTKInstallerTest.kt
│           └── model/
│               └── JourneyTest.kt
```

---

## 2. Plugin Architecture

### 2.1 Component Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        IntelliJ IDEA                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐  │
│  │ Status Bar   │    │  Tool Window │    │   Actions (Menu)     │  │
│  │   Widget     │    │              │    │                      │  │
│  └──────┬───────┘    └──────┬───────┘    └──────────┬───────────┘  │
│         │                   │                        │              │
│         └───────────────────┼────────────────────────┘              │
│                             │                                        │
│                             ▼                                        │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   ARTKProjectService                         │   │
│  │  - isInstalled: Boolean                                      │   │
│  │  - artkContext: ARTKContext?                                 │   │
│  │  - artkConfig: ARTKConfig?                                   │   │
│  │  - llkbEnabled: Boolean                                      │   │
│  │  - onContextChanged: Event                                   │   │
│  └─────────────────────────┬───────────────────────────────────┘   │
│                             │                                        │
│         ┌───────────────────┼───────────────────┐                   │
│         ▼                   ▼                   ▼                   │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐    │
│  │ Installer   │    │ CLI Bridge  │    │ File Listener       │    │
│  │ Service     │    │ Service     │    │ (VFS)               │    │
│  └─────────────┘    └─────────────┘    └─────────────────────┘    │
│         │                   │                   │                   │
│         ▼                   ▼                   ▼                   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    File System                               │   │
│  │  artk-e2e/                                                   │   │
│  │  ├── .artk/context.json                                      │   │
│  │  ├── artk.config.yml                                         │   │
│  │  ├── journeys/                                               │   │
│  │  └── vendor/artk-core/                                       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Service Architecture

```kotlin
// ARTKProjectService.kt - Central service for ARTK state management
@Service(Service.Level.PROJECT)
class ARTKProjectService(private val project: Project) : Disposable {

    // State
    var isInstalled: Boolean = false
        private set
    var artkContext: ARTKContext? = null
        private set
    var artkConfig: ARTKConfig? = null
        private set

    // Event publishers
    private val contextChangedPublisher = project.messageBus.syncPublisher(CONTEXT_CHANGED_TOPIC)

    companion object {
        val CONTEXT_CHANGED_TOPIC = Topic.create("ARTK Context Changed", ContextChangedListener::class.java)

        fun getInstance(project: Project): ARTKProjectService = project.service()
    }

    init {
        // Initial detection
        detectInstallation()
    }

    fun detectInstallation() {
        val basePath = project.basePath ?: return
        val artkE2ePath = Paths.get(basePath, "artk-e2e")
        val contextPath = artkE2ePath.resolve(".artk/context.json")

        isInstalled = Files.exists(contextPath)

        if (isInstalled) {
            loadContext(contextPath)
            loadConfig(artkE2ePath.resolve("artk.config.yml"))
        }

        contextChangedPublisher.contextChanged(isInstalled, artkContext)
    }

    override fun dispose() {
        // Cleanup
    }
}

interface ContextChangedListener {
    fun contextChanged(isInstalled: Boolean, context: ARTKContext?)
}
```

### 2.3 VS Code → IntelliJ API Mapping Reference

| VS Code Concept | IntelliJ Equivalent | Package |
|-----------------|---------------------|---------|
| `ExtensionContext` | `Project` + services | `com.intellij.openapi.project` |
| `commands.registerCommand()` | `AnAction` + plugin.xml | `com.intellij.openapi.actionSystem` |
| `window.createTreeView()` | `ToolWindow` + `JBTree` | `com.intellij.openapi.wm` |
| `TreeDataProvider` | `TreeModel` + `TreeNode` | `javax.swing.tree` |
| `window.createWebviewPanel()` | `JBCefBrowser` | `com.intellij.ui.jcef` |
| `window.createStatusBarItem()` | `StatusBarWidgetFactory` | `com.intellij.openapi.wm` |
| `workspace.getConfiguration()` | `PersistentStateComponent` | `com.intellij.openapi.components` |
| `window.showInformationMessage()` | `Notifications.Bus.notify()` | `com.intellij.notification` |
| `window.showQuickPick()` | `JBPopupFactory.createListPopup()` | `com.intellij.openapi.ui.popup` |
| `window.showInputBox()` | `Messages.showInputDialog()` | `com.intellij.openapi.ui` |
| `window.withProgress()` | `ProgressManager.run()` | `com.intellij.openapi.progress` |
| `FileSystemWatcher` | `BulkFileListener` | `com.intellij.openapi.vfs` |
| `workspace.fs` | `VirtualFileManager` | `com.intellij.openapi.vfs` |
| `window.createTerminal()` | `TerminalView.createLocalShellWidget()` | `org.jetbrains.plugins.terminal` |
| `workspaceState` | `PropertiesComponent` (project) | `com.intellij.ide.util` |
| `globalState` | `PropertiesComponent` (app) | `com.intellij.ide.util` |

---

## 3. Feature Implementation Details

### 3.1 Feature F01: Project Detection & Context Management

**VS Code Implementation:**
- `workspace/context.ts` - WorkspaceContextManager singleton
- `workspace/detector.ts` - ARTK detection logic
- `workspace/watcher.ts` - File watchers

**IntelliJ Implementation:**

```kotlin
// services/ARTKProjectService.kt
@Service(Service.Level.PROJECT)
class ARTKProjectService(private val project: Project) : Disposable {

    private val _isInstalled = AtomicBoolean(false)
    private var _artkContext: ARTKContext? = null
    private var _artkConfig: ARTKConfig? = null

    val isInstalled: Boolean get() = _isInstalled.get()
    val artkContext: ARTKContext? get() = _artkContext
    val artkConfig: ARTKConfig? get() = _artkConfig
    val llkbEnabled: Boolean get() = _artkConfig?.llkb?.enabled ?: false

    val artkE2ePath: Path?
        get() = project.basePath?.let { Paths.get(it, "artk-e2e") }

    val contextPath: Path?
        get() = artkE2ePath?.resolve(".artk/context.json")

    val configPath: Path?
        get() = artkE2ePath?.resolve("artk.config.yml")

    init {
        refresh()
    }

    fun refresh() {
        val contextFile = contextPath?.toFile()
        val wasInstalled = _isInstalled.get()

        _isInstalled.set(contextFile?.exists() == true)

        if (_isInstalled.get()) {
            _artkContext = contextFile?.let { loadContext(it) }
            _artkConfig = configPath?.toFile()?.let { loadConfig(it) }
        } else {
            _artkContext = null
            _artkConfig = null
        }

        // Notify listeners if state changed
        if (wasInstalled != _isInstalled.get()) {
            project.messageBus.syncPublisher(ARTKTopics.CONTEXT_CHANGED)
                .onContextChanged(_isInstalled.get(), _artkContext)
        }
    }

    private fun loadContext(file: File): ARTKContext? {
        return try {
            Gson().fromJson(file.readText(), ARTKContext::class.java)
        } catch (e: Exception) {
            null
        }
    }

    private fun loadConfig(file: File): ARTKConfig? {
        return try {
            val yaml = Yaml()
            yaml.loadAs(file.readText(), ARTKConfig::class.java)
        } catch (e: Exception) {
            null
        }
    }

    companion object {
        fun getInstance(project: Project): ARTKProjectService = project.service()
    }

    override fun dispose() {}
}

// listeners/ARTKFileListener.kt
class ARTKFileListener : AsyncFileListener {

    override fun prepareChange(events: MutableList<out VFileEvent>): ChangeApplier? {
        val artkEvents = events.filter { event ->
            val path = event.path
            path.contains("artk-e2e/.artk/context.json") ||
            path.contains("artk-e2e/artk.config.yml") ||
            path.contains("artk-e2e/journeys/") ||
            path.contains("artk-e2e/.artk/llkb/")
        }

        if (artkEvents.isEmpty()) return null

        return object : ChangeApplier {
            override fun afterVfsChange() {
                // Find affected projects and refresh
                ProjectManager.getInstance().openProjects.forEach { project ->
                    val service = ARTKProjectService.getInstance(project)
                    service.refresh()
                }
            }
        }
    }
}
```

**Files to Create:**
- `services/ARTKProjectService.kt`
- `listeners/ARTKFileListener.kt`
- `model/ARTKContext.kt`
- `model/ARTKConfig.kt`
- `ARTKTopics.kt` (message bus topics)

**Effort:** 8 hours

---

### 3.2 Feature F02: Tool Window with Tabbed Panels

**VS Code Implementation:**
- 4 separate TreeDataProviders registered in package.json
- Each view has its own activation context

**IntelliJ Implementation:**

```kotlin
// toolwindow/ARTKToolWindowFactory.kt
class ARTKToolWindowFactory : ToolWindowFactory, DumbAware {

    override fun createToolWindowContent(project: Project, toolWindow: ToolWindow) {
        val service = ARTKProjectService.getInstance(project)

        // Create tabbed content
        val contentFactory = ContentFactory.getInstance()

        // Status Tab
        val statusPanel = StatusPanel(project, service)
        val statusContent = contentFactory.createContent(statusPanel, "Status", false)
        statusContent.setDisposer(statusPanel)
        toolWindow.contentManager.addContent(statusContent)

        // Journeys Tab
        val journeysPanel = JourneysPanel(project, service)
        val journeysContent = contentFactory.createContent(journeysPanel, "Journeys", false)
        journeysContent.setDisposer(journeysPanel)
        toolWindow.contentManager.addContent(journeysContent)

        // Workflow Tab
        val workflowPanel = WorkflowPanel(project, service)
        val workflowContent = contentFactory.createContent(workflowPanel, "Workflow", false)
        workflowContent.setDisposer(workflowPanel)
        toolWindow.contentManager.addContent(workflowContent)

        // LLKB Tab
        val llkbPanel = LLKBPanel(project, service)
        val llkbContent = contentFactory.createContent(llkbPanel, "LLKB", false)
        llkbContent.setDisposer(llkbPanel)
        toolWindow.contentManager.addContent(llkbContent)
    }

    override fun shouldBeAvailable(project: Project): Boolean = true
}

// toolwindow/panels/StatusPanel.kt
class StatusPanel(
    private val project: Project,
    private val service: ARTKProjectService
) : JPanel(BorderLayout()), Disposable {

    private val tree: Tree
    private val treeModel: DefaultTreeModel

    init {
        // Create root node
        val root = DefaultMutableTreeNode("ARTK Status")
        treeModel = DefaultTreeModel(root)
        tree = Tree(treeModel)

        // Configure tree
        tree.isRootVisible = false
        tree.cellRenderer = StatusTreeCellRenderer()

        // Add to panel
        add(ScrollPaneFactory.createScrollPane(tree), BorderLayout.CENTER)

        // Add toolbar
        val toolbar = createToolbar()
        add(toolbar, BorderLayout.NORTH)

        // Listen for changes
        project.messageBus.connect(this)
            .subscribe(ARTKTopics.CONTEXT_CHANGED, object : ContextChangedListener {
                override fun onContextChanged(isInstalled: Boolean, context: ARTKContext?) {
                    refresh()
                }
            })

        // Initial refresh
        refresh()
    }

    private fun createToolbar(): JComponent {
        val group = DefaultActionGroup().apply {
            add(object : AnAction("Refresh", "Refresh status", AllIcons.Actions.Refresh) {
                override fun actionPerformed(e: AnActionEvent) {
                    service.refresh()
                    refresh()
                }
            })
            add(object : AnAction("Open Config", "Open artk.config.yml", AllIcons.General.Settings) {
                override fun actionPerformed(e: AnActionEvent) {
                    service.configPath?.let { path ->
                        val vf = LocalFileSystem.getInstance().findFileByPath(path.toString())
                        vf?.let { FileEditorManager.getInstance(project).openFile(it, true) }
                    }
                }
            })
        }

        return ActionManager.getInstance()
            .createActionToolbar("ARTKStatusToolbar", group, true)
            .component
    }

    fun refresh() {
        val root = treeModel.root as DefaultMutableTreeNode
        root.removeAllChildren()

        if (!service.isInstalled) {
            root.add(DefaultMutableTreeNode(StatusItem("Not Installed", StatusType.WARNING)))
            root.add(DefaultMutableTreeNode(StatusItem("Run 'ARTK > Initialize' to set up", StatusType.INFO)))
        } else {
            // Installation status
            val installNode = DefaultMutableTreeNode(StatusItem("Installation", StatusType.HEADER))
            service.artkContext?.let { ctx ->
                installNode.add(DefaultMutableTreeNode(StatusItem("Version: ${ctx.artkVersion}", StatusType.OK)))
                installNode.add(DefaultMutableTreeNode(StatusItem("Variant: ${ctx.variant}", StatusType.OK)))
                installNode.add(DefaultMutableTreeNode(StatusItem("Playwright: ${ctx.playwrightVersion}", StatusType.OK)))
            }
            root.add(installNode)

            // Config status
            val configNode = DefaultMutableTreeNode(StatusItem("Configuration", StatusType.HEADER))
            service.artkConfig?.let { cfg ->
                configNode.add(DefaultMutableTreeNode(StatusItem("App: ${cfg.app.name}", StatusType.OK)))
                val envCount = cfg.environments?.size ?: 0
                configNode.add(DefaultMutableTreeNode(StatusItem("Environments: $envCount", StatusType.OK)))
            }
            root.add(configNode)

            // LLKB status
            if (service.llkbEnabled) {
                val llkbNode = DefaultMutableTreeNode(StatusItem("LLKB", StatusType.HEADER))
                llkbNode.add(DefaultMutableTreeNode(StatusItem("Status: Enabled", StatusType.OK)))
                root.add(llkbNode)
            }
        }

        treeModel.reload()
        TreeUtil.expandAll(tree)
    }

    override fun dispose() {}
}

data class StatusItem(val text: String, val type: StatusType)
enum class StatusType { OK, WARNING, ERROR, INFO, HEADER }
```

**Files to Create:**
- `toolwindow/ARTKToolWindowFactory.kt`
- `toolwindow/panels/StatusPanel.kt`
- `toolwindow/panels/JourneysPanel.kt`
- `toolwindow/panels/WorkflowPanel.kt`
- `toolwindow/panels/LLKBPanel.kt`
- `toolwindow/tree/StatusTreeCellRenderer.kt`
- `toolwindow/tree/JourneyTreeCellRenderer.kt`

**Effort:** 24 hours

---

### 3.3 Feature F03: Journeys Panel with File Scanning

**VS Code Implementation:**
- `views/JourneysTreeProvider.ts` - Async file scanning with 5s cache
- Groups by status (proposed, defined, clarified, implemented)
- Secondary grouping by tier

**IntelliJ Implementation:**

```kotlin
// toolwindow/panels/JourneysPanel.kt
class JourneysPanel(
    private val project: Project,
    private val service: ARTKProjectService
) : JPanel(BorderLayout()), Disposable {

    private val tree: Tree
    private val treeModel: DefaultTreeModel
    private var journeyCache: List<Journey>? = null
    private var lastCacheTime: Long = 0
    private val CACHE_DURATION_MS = 5000L

    init {
        val root = DefaultMutableTreeNode("Journeys")
        treeModel = DefaultTreeModel(root)
        tree = Tree(treeModel)

        tree.isRootVisible = false
        tree.cellRenderer = JourneyTreeCellRenderer()

        // Double-click to open
        tree.addMouseListener(object : MouseAdapter() {
            override fun mouseClicked(e: MouseEvent) {
                if (e.clickCount == 2) {
                    val node = tree.lastSelectedPathComponent as? DefaultMutableTreeNode
                    val journey = node?.userObject as? Journey
                    journey?.let { openJourney(it) }
                }
            }
        })

        // Context menu
        tree.componentPopupMenu = createContextMenu()

        add(ScrollPaneFactory.createScrollPane(tree), BorderLayout.CENTER)
        add(createToolbar(), BorderLayout.NORTH)

        // Listen for changes
        project.messageBus.connect(this)
            .subscribe(ARTKTopics.JOURNEYS_CHANGED, object : JourneysChangedListener {
                override fun onJourneysChanged() {
                    invalidateCache()
                    refresh()
                }
            })

        refresh()
    }

    fun refresh() {
        ApplicationManager.getApplication().executeOnPooledThread {
            val journeys = loadJourneys()

            ApplicationManager.getApplication().invokeLater {
                updateTree(journeys)
            }
        }
    }

    private fun loadJourneys(): List<Journey> {
        val now = System.currentTimeMillis()
        if (journeyCache != null && (now - lastCacheTime) < CACHE_DURATION_MS) {
            return journeyCache!!
        }

        val journeysPath = service.artkE2ePath?.resolve("journeys") ?: return emptyList()
        val journeys = mutableListOf<Journey>()

        // Scan for .md files
        Files.walk(journeysPath, 3)
            .filter { it.toString().endsWith(".md") }
            .forEach { path ->
                parseJourney(path)?.let { journeys.add(it) }
            }

        journeyCache = journeys
        lastCacheTime = now

        return journeys
    }

    private fun parseJourney(path: Path): Journey? {
        return try {
            val content = Files.readString(path)
            val frontmatter = extractFrontmatter(content)

            Journey(
                id = frontmatter["id"] as? String ?: return null,
                status = JourneyStatus.fromString(frontmatter["status"] as? String ?: "proposed"),
                tier = JourneyTier.fromString(frontmatter["tier"] as? String ?: "regression"),
                name = path.fileName.toString().removeSuffix(".md"),
                path = path,
                actor = frontmatter["actor"] as? String,
                scope = frontmatter["scope"] as? String
            )
        } catch (e: Exception) {
            null
        }
    }

    private fun extractFrontmatter(content: String): Map<String, Any> {
        val regex = Regex("^---\\s*\\n(.+?)\\n---", RegexOption.DOT_MATCHES_ALL)
        val match = regex.find(content) ?: return emptyMap()

        return try {
            Yaml().load(match.groupValues[1])
        } catch (e: Exception) {
            emptyMap()
        }
    }

    private fun updateTree(journeys: List<Journey>) {
        val root = treeModel.root as DefaultMutableTreeNode
        root.removeAllChildren()

        // Group by status
        val byStatus = journeys.groupBy { it.status }

        JourneyStatus.values().forEach { status ->
            val statusJourneys = byStatus[status] ?: emptyList()
            if (statusJourneys.isNotEmpty()) {
                val statusNode = DefaultMutableTreeNode(StatusGroup(status, statusJourneys.size))

                // Sub-group by tier
                statusJourneys.groupBy { it.tier }.forEach { (tier, tierJourneys) ->
                    val tierNode = DefaultMutableTreeNode(TierGroup(tier, tierJourneys.size))
                    tierJourneys.forEach { journey ->
                        tierNode.add(DefaultMutableTreeNode(journey))
                    }
                    statusNode.add(tierNode)
                }

                root.add(statusNode)
            }
        }

        treeModel.reload()
        TreeUtil.expandAll(tree)
    }

    private fun openJourney(journey: Journey) {
        val vf = LocalFileSystem.getInstance().findFileByPath(journey.path.toString())
        vf?.let { FileEditorManager.getInstance(project).openFile(it, true) }
    }

    private fun invalidateCache() {
        journeyCache = null
        lastCacheTime = 0
    }

    override fun dispose() {}
}

// model/Journey.kt
data class Journey(
    val id: String,
    val status: JourneyStatus,
    val tier: JourneyTier,
    val name: String,
    val path: Path,
    val actor: String?,
    val scope: String?
)

enum class JourneyStatus {
    PROPOSED, DEFINED, CLARIFIED, IMPLEMENTED, QUARANTINED, DEPRECATED;

    companion object {
        fun fromString(s: String): JourneyStatus = try {
            valueOf(s.uppercase())
        } catch (e: Exception) {
            PROPOSED
        }
    }
}

enum class JourneyTier {
    SMOKE, RELEASE, REGRESSION;

    companion object {
        fun fromString(s: String): JourneyTier = try {
            valueOf(s.uppercase())
        } catch (e: Exception) {
            REGRESSION
        }
    }
}

data class StatusGroup(val status: JourneyStatus, val count: Int)
data class TierGroup(val tier: JourneyTier, val count: Int)
```

**Files to Create:**
- `toolwindow/panels/JourneysPanel.kt`
- `toolwindow/tree/JourneyTreeCellRenderer.kt`
- `model/Journey.kt`

**Effort:** 12 hours

---

### 3.4 Feature F04: Workflow Panel with Copilot Workaround

**VS Code Implementation:**
- `views/WorkflowTreeProvider.ts` - 9 workflow steps
- `executeWorkflowStep()` - Opens Copilot Chat with prompt
- `editWorkflowStep()` - Opens without auto-submit

**IntelliJ Implementation (with Clipboard Workaround):**

```kotlin
// toolwindow/panels/WorkflowPanel.kt
class WorkflowPanel(
    private val project: Project,
    private val service: ARTKProjectService
) : JPanel(BorderLayout()), Disposable {

    private val tree: Tree
    private val treeModel: DefaultTreeModel
    private val completedSteps = mutableSetOf<String>()

    companion object {
        val WORKFLOW_STEPS = listOf(
            WorkflowStep(
                id = "init-playbook",
                number = 1,
                name = "Initialize Playbook",
                prompt = "/artk.init-playbook",
                description = "Generate permanent guardrails",
                mandatory = true,
                runOnce = true
            ),
            WorkflowStep(
                id = "discover-foundation",
                number = 2,
                name = "Discover Foundation",
                prompt = "/artk.discover-foundation",
                description = "Analyze app routes, features, auth",
                mandatory = true,
                dependsOn = "init-playbook"
            ),
            WorkflowStep(
                id = "journey-propose",
                number = 3,
                name = "Propose Journeys",
                prompt = "/artk.journey-propose",
                description = "Auto-propose Journeys from discovery",
                mandatory = false,
                dependsOn = "discover-foundation"
            ),
            WorkflowStep(
                id = "journey-define",
                number = 4,
                name = "Define Journey",
                prompt = "/artk.journey-define",
                description = "Create/promote Journey",
                mandatory = true,
                dependsOn = "journey-propose"
            ),
            WorkflowStep(
                id = "journey-clarify",
                number = 5,
                name = "Clarify Journey",
                prompt = "/artk.journey-clarify",
                description = "Add deterministic execution detail",
                mandatory = true,
                dependsOn = "journey-define"
            ),
            WorkflowStep(
                id = "testid-audit",
                number = 6,
                name = "Audit Test IDs",
                prompt = "/artk.testid-audit",
                description = "Audit and add data-testid attributes",
                mandatory = false,
                dependsOn = "journey-clarify"
            ),
            WorkflowStep(
                id = "journey-implement",
                number = 7,
                name = "Implement Journey",
                prompt = "/artk.journey-implement",
                description = "Generate Playwright tests",
                mandatory = true,
                dependsOn = "testid-audit"
            ),
            WorkflowStep(
                id = "journey-validate",
                number = 8,
                name = "Validate Journey",
                prompt = "/artk.journey-validate",
                description = "Static validation gate",
                mandatory = true,
                dependsOn = "journey-implement"
            ),
            WorkflowStep(
                id = "journey-verify",
                number = 9,
                name = "Verify Journey",
                prompt = "/artk.journey-verify",
                description = "Runtime verification gate",
                mandatory = true,
                dependsOn = "journey-validate"
            )
        )
    }

    init {
        val root = DefaultMutableTreeNode("Workflow")
        treeModel = DefaultTreeModel(root)
        tree = Tree(treeModel)

        tree.isRootVisible = false
        tree.cellRenderer = WorkflowTreeCellRenderer(completedSteps)

        // Double-click to execute
        tree.addMouseListener(object : MouseAdapter() {
            override fun mouseClicked(e: MouseEvent) {
                if (e.clickCount == 2) {
                    val node = tree.lastSelectedPathComponent as? DefaultMutableTreeNode
                    val step = node?.userObject as? WorkflowStep
                    step?.let { executeStep(it) }
                }
            }
        })

        add(ScrollPaneFactory.createScrollPane(tree), BorderLayout.CENTER)
        add(createToolbar(), BorderLayout.NORTH)

        loadCompletedSteps()
        refresh()
    }

    private fun createToolbar(): JComponent {
        val group = DefaultActionGroup().apply {
            add(object : AnAction("Execute", "Execute selected step", AllIcons.Actions.Execute) {
                override fun actionPerformed(e: AnActionEvent) {
                    val node = tree.lastSelectedPathComponent as? DefaultMutableTreeNode
                    val step = node?.userObject as? WorkflowStep
                    step?.let { executeStep(it) }
                }

                override fun update(e: AnActionEvent) {
                    val node = tree.lastSelectedPathComponent as? DefaultMutableTreeNode
                    e.presentation.isEnabled = node?.userObject is WorkflowStep
                }

                override fun getActionUpdateThread() = ActionUpdateThread.BGT
            })

            addSeparator()

            add(object : AnAction("Reset All", "Reset all workflow steps", AllIcons.Actions.Rollback) {
                override fun actionPerformed(e: AnActionEvent) {
                    val result = Messages.showYesNoDialog(
                        project,
                        "Reset all workflow steps? This will clear completion status.",
                        "Reset Workflow",
                        Messages.getQuestionIcon()
                    )
                    if (result == Messages.YES) {
                        completedSteps.clear()
                        saveCompletedSteps()
                        refresh()
                    }
                }
            })
        }

        return ActionManager.getInstance()
            .createActionToolbar("ARTKWorkflowToolbar", group, true)
            .component
    }

    fun executeStep(step: WorkflowStep) {
        // Check if Copilot is installed
        val copilotPlugin = PluginManager.getPlugin(PluginId.getId("com.github.copilot"))

        if (copilotPlugin == null) {
            val result = Messages.showYesNoDialog(
                project,
                "GitHub Copilot is recommended for workflow steps.\n\n" +
                "The prompt will be copied to clipboard. You can paste it into any AI assistant.\n\n" +
                "Would you like to continue?",
                "GitHub Copilot Not Found",
                "Copy Prompt",
                "Cancel",
                Messages.getQuestionIcon()
            )
            if (result != Messages.YES) return
        }

        // Copy prompt to clipboard
        val clipboard = Toolkit.getDefaultToolkit().systemClipboard
        clipboard.setContents(StringSelection(step.prompt), null)

        // Try to open Copilot Chat tool window
        val toolWindow = ToolWindowManager.getInstance(project).getToolWindow("GitHub Copilot Chat")
        toolWindow?.show()

        // Show notification with instructions
        Notifications.Bus.notify(
            Notification(
                "ARTK Notifications",
                "Workflow Step: ${step.name}",
                """
                Prompt copied to clipboard!

                1. Open GitHub Copilot Chat (or any AI assistant)
                2. Paste the prompt: ${step.prompt}
                3. Press Enter to execute

                After completion, right-click the step to mark it complete.
                """.trimIndent(),
                NotificationType.INFORMATION
            ).addAction(object : AnAction("Mark Complete") {
                override fun actionPerformed(e: AnActionEvent) {
                    markStepCompleted(step.id)
                }
            }),
            project
        )

        // For run-once steps, mark as completed
        if (step.runOnce) {
            markStepCompleted(step.id)
        }
    }

    private fun markStepCompleted(stepId: String) {
        completedSteps.add(stepId)
        saveCompletedSteps()
        refresh()
    }

    private fun loadCompletedSteps() {
        val props = PropertiesComponent.getInstance(project)
        val saved = props.getValue("artk.completedWorkflowSteps", "")
        if (saved.isNotEmpty()) {
            completedSteps.addAll(saved.split(","))
        }
    }

    private fun saveCompletedSteps() {
        val props = PropertiesComponent.getInstance(project)
        props.setValue("artk.completedWorkflowSteps", completedSteps.joinToString(","))
    }

    fun refresh() {
        val root = treeModel.root as DefaultMutableTreeNode
        root.removeAllChildren()

        WORKFLOW_STEPS.forEach { step ->
            root.add(DefaultMutableTreeNode(step))
        }

        treeModel.reload()
        TreeUtil.expandAll(tree)
    }

    override fun dispose() {}
}

// model/WorkflowStep.kt
data class WorkflowStep(
    val id: String,
    val number: Int,
    val name: String,
    val prompt: String,
    val description: String,
    val mandatory: Boolean,
    val runOnce: Boolean = false,
    val dependsOn: String? = null
)

// toolwindow/tree/WorkflowTreeCellRenderer.kt
class WorkflowTreeCellRenderer(
    private val completedSteps: Set<String>
) : ColoredTreeCellRenderer() {

    override fun customizeCellRenderer(
        tree: JTree,
        value: Any?,
        selected: Boolean,
        expanded: Boolean,
        leaf: Boolean,
        row: Int,
        hasFocus: Boolean
    ) {
        val node = value as? DefaultMutableTreeNode ?: return
        val step = node.userObject as? WorkflowStep ?: return

        // Icon
        val isCompleted = completedSteps.contains(step.id)
        icon = when {
            isCompleted && step.runOnce -> AllIcons.Actions.Checked
            step.mandatory -> AllIcons.General.BalloonInformation
            else -> AllIcons.General.Note
        }

        // Text
        append("${step.number}. ${step.name}", SimpleTextAttributes.REGULAR_ATTRIBUTES)

        // Tag
        val tag = if (step.mandatory) "(Required)" else "(Optional)"
        append(" $tag", SimpleTextAttributes.GRAYED_ATTRIBUTES)

        if (isCompleted && step.runOnce) {
            append(" ✓ Done", SimpleTextAttributes.GRAYED_ATTRIBUTES)
        }
    }
}
```

**Files to Create:**
- `toolwindow/panels/WorkflowPanel.kt`
- `toolwindow/tree/WorkflowTreeCellRenderer.kt`
- `model/WorkflowStep.kt`

**Effort:** 12 hours

---

### 3.5 Feature F05: Status Bar Widget

**VS Code Implementation:**
- `providers/StatusBarProvider.ts`
- Shows version, LLKB status, click opens dashboard

**IntelliJ Implementation:**

```kotlin
// statusbar/ARTKStatusBarWidgetFactory.kt
class ARTKStatusBarWidgetFactory : StatusBarWidgetFactory {

    override fun getId(): String = "ARTKStatusBar"

    override fun getDisplayName(): String = "ARTK Status"

    override fun isAvailable(project: Project): Boolean = true

    override fun createWidget(project: Project): StatusBarWidget {
        return ARTKStatusBarWidget(project)
    }

    override fun disposeWidget(widget: StatusBarWidget) {
        Disposer.dispose(widget)
    }

    override fun canBeEnabledOn(statusBar: StatusBar): Boolean = true
}

// statusbar/ARTKStatusBarWidget.kt
class ARTKStatusBarWidget(private val project: Project) :
    StatusBarWidget,
    StatusBarWidget.TextPresentation,
    Disposable {

    private val service = ARTKProjectService.getInstance(project)
    private var statusBar: StatusBar? = null

    init {
        // Listen for context changes
        project.messageBus.connect(this)
            .subscribe(ARTKTopics.CONTEXT_CHANGED, object : ContextChangedListener {
                override fun onContextChanged(isInstalled: Boolean, context: ARTKContext?) {
                    statusBar?.updateWidget(ID())
                }
            })
    }

    override fun ID(): String = "ARTKStatusBar"

    override fun getPresentation(): StatusBarWidget.WidgetPresentation = this

    override fun install(statusBar: StatusBar) {
        this.statusBar = statusBar
    }

    override fun getText(): String {
        return if (service.isInstalled) {
            val parts = mutableListOf("ARTK")
            service.artkContext?.artkVersion?.let { parts.add("v$it") }
            parts.add("OK")
            if (service.llkbEnabled) parts.add("| LLKB")
            parts.joinToString(" ")
        } else {
            "ARTK: Not Installed"
        }
    }

    override fun getTooltipText(): String {
        val lines = mutableListOf("ARTK Status")

        service.artkContext?.let { ctx ->
            lines.add("")
            lines.add("Version: ${ctx.artkVersion}")
            lines.add("Variant: ${ctx.variant}")
            lines.add("Playwright: ${ctx.playwrightVersion}")
        }

        service.artkConfig?.let { cfg ->
            lines.add("")
            lines.add("App: ${cfg.app.name}")
        }

        if (service.llkbEnabled) {
            lines.add("")
            lines.add("LLKB: Enabled")
        }

        lines.add("")
        lines.add("Click to open dashboard")

        return lines.joinToString("\n")
    }

    override fun getAlignment(): Float = Component.CENTER_ALIGNMENT

    override fun getClickConsumer(): Consumer<MouseEvent> = Consumer {
        // Open dashboard or tool window
        val toolWindow = ToolWindowManager.getInstance(project).getToolWindow("ARTK")
        toolWindow?.show()
    }

    override fun dispose() {}
}
```

**Files to Create:**
- `statusbar/ARTKStatusBarWidgetFactory.kt`
- `statusbar/ARTKStatusBarWidget.kt`

**Effort:** 4 hours

---

### 3.6 Feature F06: JCEF Dashboard

**VS Code Implementation:**
- `views/dashboard/DashboardPanel.ts`
- Webview with HTML/CSS/JS
- Bidirectional messaging

**IntelliJ Implementation:**

```kotlin
// dashboard/DashboardPanel.kt
class DashboardPanel(
    private val project: Project,
    private val service: ARTKProjectService
) : JPanel(BorderLayout()), Disposable {

    private var browser: JBCefBrowser? = null
    private var jsQuery: JBCefJSQuery? = null

    init {
        if (JBCefApp.isSupported()) {
            createCefBrowser()
        } else {
            // Fallback for environments without JCEF
            add(JLabel("Dashboard requires JCEF support"), BorderLayout.CENTER)
        }
    }

    private fun createCefBrowser() {
        browser = JBCefBrowser()

        // Create JS query handler for bidirectional communication
        jsQuery = JBCefJSQuery.create(browser as JBCefBrowserBase)

        jsQuery?.addHandler { request ->
            handleJSRequest(request)
            JBCefJSQuery.Response("ok")
        }

        // Load dashboard HTML
        val dashboardUrl = getDashboardUrl()
        browser?.loadURL(dashboardUrl)

        add(browser?.component ?: JLabel("Failed to create browser"), BorderLayout.CENTER)

        // Inject bridge after page loads
        browser?.jbCefClient?.addLoadHandler(object : CefLoadHandler {
            override fun onLoadingStateChange(
                browser: CefBrowser?,
                isLoading: Boolean,
                canGoBack: Boolean,
                canGoForward: Boolean
            ) {
                if (!isLoading) {
                    injectBridge()
                    sendInitialData()
                }
            }

            override fun onLoadStart(browser: CefBrowser?, frame: CefFrame?, transitionType: CefRequest.TransitionType?) {}
            override fun onLoadEnd(browser: CefBrowser?, frame: CefFrame?, httpStatusCode: Int) {}
            override fun onLoadError(browser: CefBrowser?, frame: CefFrame?, errorCode: CefLoadHandler.ErrorCode?, errorText: String?, failedUrl: String?) {}
        }, browser?.cefBrowser)
    }

    private fun getDashboardUrl(): String {
        // Load from plugin resources
        val resource = javaClass.getResource("/dashboard/index.html")
        return resource?.toExternalForm() ?: "about:blank"
    }

    private fun injectBridge() {
        val js = """
            window.artkBridge = {
                send: function(action, data) {
                    ${jsQuery?.inject("JSON.stringify({action: action, data: data})")}
                }
            };
        """.trimIndent()

        browser?.cefBrowser?.executeJavaScript(js, "", 0)
    }

    private fun sendInitialData() {
        val data = buildDashboardData()
        val js = "window.updateDashboard(${Gson().toJson(data)});"
        browser?.cefBrowser?.executeJavaScript(js, "", 0)
    }

    private fun handleJSRequest(request: String): String {
        val json = Gson().fromJson(request, JsonObject::class.java)
        val action = json.get("action")?.asString

        return when (action) {
            "refresh" -> {
                service.refresh()
                sendInitialData()
                "ok"
            }
            "openConfig" -> {
                service.configPath?.let { path ->
                    ApplicationManager.getApplication().invokeLater {
                        val vf = LocalFileSystem.getInstance().findFileByPath(path.toString())
                        vf?.let { FileEditorManager.getInstance(project).openFile(it, true) }
                    }
                }
                "ok"
            }
            "runCommand" -> {
                val command = json.get("data")?.asString
                command?.let { runCommand(it) }
                "ok"
            }
            else -> "unknown action"
        }
    }

    private fun buildDashboardData(): Map<String, Any?> {
        return mapOf(
            "isInstalled" to service.isInstalled,
            "context" to service.artkContext,
            "config" to service.artkConfig,
            "llkbEnabled" to service.llkbEnabled
        )
    }

    private fun runCommand(command: String) {
        // Execute CLI command
        val cliService = CLIBridgeService.getInstance(project)
        cliService.runCommand(command)
    }

    override fun dispose() {
        jsQuery?.dispose()
        browser?.dispose()
    }
}
```

**Dashboard HTML (resources/dashboard/index.html):**

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        :root {
            --bg-color: #1e1e1e;
            --text-color: #cccccc;
            --accent-color: #0098ff;
            --success-color: #4caf50;
            --warning-color: #ff9800;
            --error-color: #f44336;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: var(--bg-color);
            color: var(--text-color);
            margin: 0;
            padding: 16px;
        }

        .header {
            display: flex;
            align-items: center;
            margin-bottom: 24px;
        }

        .header h1 {
            margin: 0;
            font-size: 24px;
        }

        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            margin-left: 12px;
        }

        .status-badge.ok { background-color: var(--success-color); }
        .status-badge.warning { background-color: var(--warning-color); }
        .status-badge.error { background-color: var(--error-color); }

        .card {
            background-color: #2d2d2d;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 16px;
        }

        .card h2 {
            margin: 0 0 12px 0;
            font-size: 16px;
            color: var(--accent-color);
        }

        .info-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #3d3d3d;
        }

        .info-row:last-child {
            border-bottom: none;
        }

        .info-label {
            color: #888;
        }

        .button {
            background-color: var(--accent-color);
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            margin-right: 8px;
        }

        .button:hover {
            opacity: 0.9;
        }

        .not-installed {
            text-align: center;
            padding: 48px;
        }

        .not-installed h2 {
            color: var(--warning-color);
        }
    </style>
</head>
<body>
    <div id="app">
        <div class="header">
            <h1>ARTK Dashboard</h1>
            <span id="status-badge" class="status-badge">Loading...</span>
        </div>

        <div id="content"></div>
    </div>

    <script>
        function updateDashboard(data) {
            const badge = document.getElementById('status-badge');
            const content = document.getElementById('content');

            if (!data.isInstalled) {
                badge.textContent = 'Not Installed';
                badge.className = 'status-badge warning';
                content.innerHTML = `
                    <div class="not-installed">
                        <h2>ARTK Not Installed</h2>
                        <p>Initialize ARTK to get started with test automation.</p>
                        <button class="button" onclick="runAction('init')">Initialize ARTK</button>
                    </div>
                `;
                return;
            }

            badge.textContent = 'OK';
            badge.className = 'status-badge ok';

            const ctx = data.context || {};
            const cfg = data.config || {};

            content.innerHTML = `
                <div class="card">
                    <h2>Installation</h2>
                    <div class="info-row">
                        <span class="info-label">Version</span>
                        <span>${ctx.artkVersion || 'Unknown'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Variant</span>
                        <span>${ctx.variant || 'Unknown'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Playwright</span>
                        <span>${ctx.playwrightVersion || 'Unknown'}</span>
                    </div>
                </div>

                <div class="card">
                    <h2>Configuration</h2>
                    <div class="info-row">
                        <span class="info-label">App Name</span>
                        <span>${cfg.app?.name || 'Not configured'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">LLKB</span>
                        <span>${data.llkbEnabled ? 'Enabled' : 'Disabled'}</span>
                    </div>
                </div>

                <div class="card">
                    <h2>Actions</h2>
                    <button class="button" onclick="runAction('refresh')">Refresh</button>
                    <button class="button" onclick="runAction('openConfig')">Open Config</button>
                    <button class="button" onclick="runAction('doctor')">Run Doctor</button>
                </div>
            `;
        }

        function runAction(action) {
            if (window.artkBridge) {
                window.artkBridge.send(action, null);
            }
        }
    </script>
</body>
</html>
```

**Files to Create:**
- `dashboard/DashboardPanel.kt`
- `dashboard/DashboardJSBridge.kt`
- `resources/dashboard/index.html`
- `resources/dashboard/styles.css`
- `resources/dashboard/dashboard.js`

**Effort:** 20 hours

---

### 3.7 Feature F07: Bundled Installer

**VS Code Implementation:**
- `installer/index.ts` - 2000+ lines
- Variant detection, browser detection, file copying
- npm install, LLKB initialization

**IntelliJ Implementation:**

```kotlin
// installer/ARTKInstaller.kt
class ARTKInstaller(private val project: Project) {

    data class InstallOptions(
        val targetPath: Path,
        val variant: String = "auto",
        val skipNpm: Boolean = false,
        val skipLlkb: Boolean = false,
        val skipBrowsers: Boolean = false,
        val noPrompts: Boolean = false,
        val force: Boolean = false
    )

    data class InstallResult(
        val success: Boolean,
        val error: String? = null,
        val artkE2ePath: Path? = null,
        val backupPath: Path? = null
    )

    fun install(options: InstallOptions, progress: ProgressIndicator): InstallResult {
        val artkE2ePath = options.targetPath.resolve("artk-e2e")

        try {
            // Step 1: Check existing installation
            progress.text = "Checking existing installation..."
            progress.fraction = 0.05

            if (Files.exists(artkE2ePath) && !options.force) {
                return InstallResult(false, "ARTK is already installed. Use force option to reinstall.")
            }

            var backupPath: Path? = null
            if (Files.exists(artkE2ePath) && options.force) {
                progress.text = "Creating backup..."
                backupPath = createBackup(artkE2ePath)
                FileUtils.deleteDirectory(artkE2ePath.toFile())
            }

            // Step 2: Detect variant
            progress.text = "Detecting environment..."
            progress.fraction = 0.10

            val variant = if (options.variant == "auto") {
                VariantDetector.detect(options.targetPath)
            } else {
                options.variant
            }

            // Step 3: Detect browser
            progress.text = "Detecting browsers..."
            progress.fraction = 0.15

            val browserInfo = BrowserDetector.detect()

            // Step 4: Create directory structure
            progress.text = "Creating directory structure..."
            progress.fraction = 0.20

            createDirectoryStructure(artkE2ePath)

            // Step 5: Create foundation stubs
            progress.text = "Creating foundation modules..."
            progress.fraction = 0.25

            createFoundationStubs(artkE2ePath)

            // Step 6: Create configuration files
            progress.text = "Creating configuration files..."
            progress.fraction = 0.30

            createPackageJson(artkE2ePath, variant)
            createTsConfig(artkE2ePath)
            createArtkConfig(artkE2ePath, getProjectName(options.targetPath), browserInfo)
            createContext(artkE2ePath, variant, options.targetPath, browserInfo, backupPath)
            createGitignore(artkE2ePath)

            // Step 7: Copy vendor libraries
            progress.text = "Installing ARTK core libraries..."
            progress.fraction = 0.40

            copyVendorLibs(artkE2ePath, variant)

            // Step 8: Copy templates
            progress.text = "Installing templates..."
            progress.fraction = 0.45

            copyTemplates(artkE2ePath)

            // Step 9: Initialize LLKB
            if (!options.skipLlkb) {
                progress.text = "Initializing LLKB..."
                progress.fraction = 0.50

                initializeLLKB(artkE2ePath.resolve(".artk/llkb"))
            }

            // Step 10: Install prompts
            if (!options.noPrompts) {
                progress.text = "Installing AI prompts..."
                progress.fraction = 0.55

                installPrompts(options.targetPath)
            }

            // Step 11: Run npm install
            if (!options.skipNpm) {
                progress.text = "Installing npm dependencies (this may take a while)..."
                progress.fraction = 0.60

                val npmResult = runNpmInstall(artkE2ePath)
                if (!npmResult.success) {
                    return InstallResult(false, "npm install failed: ${npmResult.error}", artkE2ePath)
                }

                progress.fraction = 0.85
            }

            // Step 12: Install browsers
            if (!options.skipBrowsers && !options.skipNpm) {
                progress.text = "Setting up browsers..."
                progress.fraction = 0.90

                installBrowsers(artkE2ePath, browserInfo)
            }

            // Verify installation
            progress.text = "Verifying installation..."
            progress.fraction = 0.95

            val verificationResult = verifyInstallation(artkE2ePath)
            if (!verificationResult.success) {
                return InstallResult(false, verificationResult.error, artkE2ePath, backupPath)
            }

            progress.fraction = 1.0

            return InstallResult(true, artkE2ePath = artkE2ePath, backupPath = backupPath)

        } catch (e: Exception) {
            return InstallResult(false, e.message)
        }
    }

    private fun createDirectoryStructure(artkE2ePath: Path) {
        val dirs = listOf(
            "",
            "vendor/artk-core/dist",
            "vendor/artk-core-autogen/dist",
            "vendor/artk-core-journeys",
            "docs",
            "journeys",
            ".auth-states",
            ".artk/llkb/patterns",
            ".artk/llkb/history",
            ".artk/logs",
            "reports/discovery",
            "reports/testid",
            "reports/validation",
            "reports/verification",
            "src/modules/foundation/auth",
            "src/modules/foundation/navigation",
            "src/modules/foundation/selectors",
            "src/modules/foundation/data",
            "src/modules/features",
            "config",
            "tests/setup",
            "tests/foundation",
            "tests/smoke",
            "tests/release",
            "tests/regression",
            "tests/journeys"
        )

        dirs.forEach { dir ->
            Files.createDirectories(artkE2ePath.resolve(dir))
        }
    }

    private fun runNpmInstall(artkE2ePath: Path): ProcessResult {
        val isWindows = System.getProperty("os.name").lowercase().contains("windows")
        val npm = if (isWindows) "npm.cmd" else "npm"

        return ProcessUtils.run(
            command = listOf(npm, "install"),
            workingDir = artkE2ePath.toFile(),
            timeoutMs = 5 * 60 * 1000
        )
    }

    // ... other helper methods similar to VS Code implementation

    companion object {
        fun getInstance(project: Project): ARTKInstaller = ARTKInstaller(project)
    }
}

// installer/VariantDetector.kt
object VariantDetector {

    fun detect(targetPath: Path): String {
        val nodeVersion = detectNodeVersion(targetPath)
        val isEsm = detectModuleType(targetPath)

        return when {
            nodeVersion >= 18 -> if (isEsm) "modern-esm" else "modern-cjs"
            nodeVersion >= 16 -> "legacy-16"
            else -> "legacy-14"
        }
    }

    private fun detectNodeVersion(targetPath: Path): Int {
        // Try .nvmrc
        val nvmrc = targetPath.resolve(".nvmrc")
        if (Files.exists(nvmrc)) {
            val content = Files.readString(nvmrc).trim()
            Regex("^v?(\\d+)").find(content)?.let {
                return it.groupValues[1].toInt()
            }
        }

        // Try package.json engines
        val packageJson = targetPath.resolve("package.json")
        if (Files.exists(packageJson)) {
            try {
                val json = Gson().fromJson(Files.readString(packageJson), JsonObject::class.java)
                json.getAsJsonObject("engines")?.get("node")?.asString?.let { nodeRange ->
                    Regex("(\\d+)").find(nodeRange)?.let {
                        return it.groupValues[1].toInt()
                    }
                }
            } catch (e: Exception) {
                // Ignore
            }
        }

        // Try system node
        val result = ProcessUtils.run(listOf("node", "--version"), timeoutMs = 5000)
        if (result.success) {
            Regex("^v?(\\d+)").find(result.stdout)?.let {
                return it.groupValues[1].toInt()
            }
        }

        // Default to Node 18
        return 18
    }

    private fun detectModuleType(targetPath: Path): Boolean {
        val packageJson = targetPath.resolve("package.json")
        if (Files.exists(packageJson)) {
            try {
                val json = Gson().fromJson(Files.readString(packageJson), JsonObject::class.java)
                return json.get("type")?.asString == "module"
            } catch (e: Exception) {
                // Ignore
            }
        }
        return false
    }
}

// installer/BrowserDetector.kt
object BrowserDetector {

    data class BrowserInfo(
        val channel: String,
        val version: String?,
        val path: String?
    )

    fun detect(): BrowserInfo {
        val isWindows = System.getProperty("os.name").lowercase().contains("windows")
        val isMac = System.getProperty("os.name").lowercase().contains("mac")

        // Try Edge
        val edgePaths = when {
            isWindows -> listOf(
                "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
                "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
            )
            isMac -> listOf("/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge")
            else -> listOf("microsoft-edge", "microsoft-edge-stable")
        }

        for (edgePath in edgePaths) {
            val version = getBrowserVersion(edgePath)
            if (version != null) {
                return BrowserInfo("msedge", version, edgePath)
            }
        }

        // Try Chrome
        val chromePaths = when {
            isWindows -> listOf(
                "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
                "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
            )
            isMac -> listOf("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
            else -> listOf("google-chrome", "google-chrome-stable")
        }

        for (chromePath in chromePaths) {
            val version = getBrowserVersion(chromePath)
            if (version != null) {
                return BrowserInfo("chrome", version, chromePath)
            }
        }

        // Fallback to bundled chromium
        return BrowserInfo("chromium", null, null)
    }

    private fun getBrowserVersion(browserPath: String): String? {
        return try {
            val result = ProcessUtils.run(listOf(browserPath, "--version"), timeoutMs = 5000)
            if (result.success) {
                Regex("[\\d.]+").find(result.stdout)?.value
            } else null
        } catch (e: Exception) {
            null
        }
    }
}
```

**Files to Create:**
- `installer/ARTKInstaller.kt`
- `installer/VariantDetector.kt`
- `installer/BrowserDetector.kt`
- `installer/NodeDetector.kt`
- `util/ProcessUtils.kt`
- `util/FileUtils.kt`

**Effort:** 24 hours

---

### 3.8 Feature F08: CLI Bridge Service

**VS Code Implementation:**
- `cli/runner.ts` - Spawns CLI commands
- JSON output parsing

**IntelliJ Implementation:**

```kotlin
// services/CLIBridgeService.kt
@Service(Service.Level.PROJECT)
class CLIBridgeService(private val project: Project) {

    private val service = ARTKProjectService.getInstance(project)

    data class CLIResult(
        val success: Boolean,
        val stdout: String,
        val stderr: String,
        val exitCode: Int
    )

    fun runCommand(
        command: String,
        args: List<String> = emptyList(),
        workingDir: File? = null,
        timeoutMs: Long = 60000
    ): CLIResult {
        val artkE2ePath = service.artkE2ePath?.toFile() ?: return CLIResult(
            false, "", "ARTK not installed", -1
        )

        val isWindows = System.getProperty("os.name").lowercase().contains("windows")
        val npx = if (isWindows) "npx.cmd" else "npx"

        val fullCommand = mutableListOf(npx, "artk-autogen", command)
        fullCommand.addAll(args)

        return ProcessUtils.run(
            command = fullCommand,
            workingDir = workingDir ?: artkE2ePath,
            timeoutMs = timeoutMs
        )
    }

    fun runLLKBCommand(subcommand: String, args: List<String> = emptyList()): CLIResult {
        return runCommand("llkb-patterns", listOf(subcommand) + args)
    }

    fun getLLKBStats(): LLKBStats? {
        val result = runLLKBCommand("stats", listOf("--json"))
        if (!result.success) return null

        return try {
            Gson().fromJson(result.stdout, LLKBStats::class.java)
        } catch (e: Exception) {
            null
        }
    }

    fun validateJourney(journeyPath: Path): CLIResult {
        return runCommand("validate", listOf(journeyPath.toString()))
    }

    fun generateTests(journeyPath: Path, outputDir: Path): CLIResult {
        return runCommand("generate", listOf(
            journeyPath.toString(),
            "-o", outputDir.toString()
        ))
    }

    companion object {
        fun getInstance(project: Project): CLIBridgeService = project.service()
    }
}

// util/ProcessUtils.kt
object ProcessUtils {

    data class ProcessResult(
        val success: Boolean,
        val stdout: String,
        val stderr: String,
        val exitCode: Int
    )

    fun run(
        command: List<String>,
        workingDir: File? = null,
        timeoutMs: Long = 60000,
        env: Map<String, String> = emptyMap()
    ): ProcessResult {
        return try {
            val processBuilder = ProcessBuilder(command)
            workingDir?.let { processBuilder.directory(it) }
            processBuilder.environment().putAll(env)

            val process = processBuilder.start()

            val stdout = StringBuilder()
            val stderr = StringBuilder()

            val stdoutThread = thread {
                process.inputStream.bufferedReader().forEachLine { stdout.appendLine(it) }
            }

            val stderrThread = thread {
                process.errorStream.bufferedReader().forEachLine { stderr.appendLine(it) }
            }

            val completed = process.waitFor(timeoutMs, TimeUnit.MILLISECONDS)

            if (!completed) {
                process.destroyForcibly()
                return ProcessResult(false, stdout.toString(), "Process timed out", -1)
            }

            stdoutThread.join(1000)
            stderrThread.join(1000)

            ProcessResult(
                success = process.exitValue() == 0,
                stdout = stdout.toString().trim(),
                stderr = stderr.toString().trim(),
                exitCode = process.exitValue()
            )
        } catch (e: Exception) {
            ProcessResult(false, "", e.message ?: "Unknown error", -1)
        }
    }
}
```

**Files to Create:**
- `services/CLIBridgeService.kt`
- `util/ProcessUtils.kt`
- `model/LLKBStats.kt`

**Effort:** 8 hours

---

### 3.9 Feature F09: Settings & Configuration

**VS Code Implementation:**
- `workspace.getConfiguration('artk')`
- Settings in package.json contributes.configuration

**IntelliJ Implementation:**

```kotlin
// settings/ARTKSettingsState.kt
@State(
    name = "ARTKSettings",
    storages = [Storage("artk.xml")]
)
class ARTKSettingsState : PersistentStateComponent<ARTKSettingsState> {

    var autoRefresh: Boolean = true
    var refreshIntervalMs: Int = 30000
    var showStatusBar: Boolean = true
    var cliPath: String = ""
    var llkbShowInExplorer: Boolean = true

    override fun getState(): ARTKSettingsState = this

    override fun loadState(state: ARTKSettingsState) {
        XmlSerializerUtil.copyBean(state, this)
    }

    companion object {
        fun getInstance(project: Project): ARTKSettingsState = project.service()
    }
}

// settings/ARTKSettingsConfigurable.kt
class ARTKSettingsConfigurable(private val project: Project) : Configurable {

    private var settingsPanel: ARTKSettingsPanel? = null

    override fun getDisplayName(): String = "ARTK"

    override fun createComponent(): JComponent {
        settingsPanel = ARTKSettingsPanel(project)
        return settingsPanel!!
    }

    override fun isModified(): Boolean {
        val state = ARTKSettingsState.getInstance(project)
        val panel = settingsPanel ?: return false

        return panel.autoRefresh != state.autoRefresh ||
               panel.refreshInterval != state.refreshIntervalMs ||
               panel.showStatusBar != state.showStatusBar ||
               panel.cliPath != state.cliPath ||
               panel.llkbShowInExplorer != state.llkbShowInExplorer
    }

    override fun apply() {
        val state = ARTKSettingsState.getInstance(project)
        val panel = settingsPanel ?: return

        state.autoRefresh = panel.autoRefresh
        state.refreshIntervalMs = panel.refreshInterval
        state.showStatusBar = panel.showStatusBar
        state.cliPath = panel.cliPath
        state.llkbShowInExplorer = panel.llkbShowInExplorer
    }

    override fun reset() {
        val state = ARTKSettingsState.getInstance(project)
        val panel = settingsPanel ?: return

        panel.autoRefresh = state.autoRefresh
        panel.refreshInterval = state.refreshIntervalMs
        panel.showStatusBar = state.showStatusBar
        panel.cliPath = state.cliPath
        panel.llkbShowInExplorer = state.llkbShowInExplorer
    }

    override fun disposeUIResources() {
        settingsPanel = null
    }
}

// settings/ARTKSettingsPanel.kt
class ARTKSettingsPanel(project: Project) : JPanel(BorderLayout()) {

    private val autoRefreshCheckbox = JCheckBox("Auto-refresh views on file change")
    private val refreshIntervalSpinner = JSpinner(SpinnerNumberModel(30000, 0, 300000, 1000))
    private val showStatusBarCheckbox = JCheckBox("Show ARTK status bar")
    private val cliPathField = JTextField()
    private val llkbShowCheckbox = JCheckBox("Show LLKB in explorer")

    var autoRefresh: Boolean
        get() = autoRefreshCheckbox.isSelected
        set(value) { autoRefreshCheckbox.isSelected = value }

    var refreshInterval: Int
        get() = refreshIntervalSpinner.value as Int
        set(value) { refreshIntervalSpinner.value = value }

    var showStatusBar: Boolean
        get() = showStatusBarCheckbox.isSelected
        set(value) { showStatusBarCheckbox.isSelected = value }

    var cliPath: String
        get() = cliPathField.text
        set(value) { cliPathField.text = value }

    var llkbShowInExplorer: Boolean
        get() = llkbShowCheckbox.isSelected
        set(value) { llkbShowCheckbox.isSelected = value }

    init {
        val panel = FormBuilder.createFormBuilder()
            .addComponent(autoRefreshCheckbox)
            .addLabeledComponent("Refresh interval (ms):", refreshIntervalSpinner)
            .addComponent(showStatusBarCheckbox)
            .addLabeledComponent("Custom CLI path:", cliPathField)
            .addComponent(llkbShowCheckbox)
            .addComponentFillVertically(JPanel(), 0)
            .panel

        add(panel, BorderLayout.NORTH)
    }
}
```

**Files to Create:**
- `settings/ARTKSettingsState.kt`
- `settings/ARTKSettingsConfigurable.kt`
- `settings/ARTKSettingsPanel.kt`

**Effort:** 6 hours

---

### 3.10 Feature F10: Actions (Init, Doctor, Check, etc.)

**VS Code Implementation:**
- `commands/*.ts` - Individual command implementations

**IntelliJ Implementation:**

```kotlin
// actions/InitAction.kt
class InitAction : AnAction("Initialize ARTK", "Initialize ARTK in this project", AllIcons.Actions.Execute) {

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        val basePath = project.basePath ?: return

        // Show options dialog
        val dialog = InitOptionsDialog(project)
        if (!dialog.showAndGet()) return

        val options = ARTKInstaller.InstallOptions(
            targetPath = Paths.get(basePath),
            variant = dialog.variant,
            skipNpm = dialog.skipNpm,
            skipLlkb = dialog.skipLlkb,
            skipBrowsers = dialog.skipBrowsers,
            force = dialog.force
        )

        // Run installation with progress
        ProgressManager.getInstance().run(object : Task.Backgroundable(
            project, "Installing ARTK", true
        ) {
            override fun run(indicator: ProgressIndicator) {
                val installer = ARTKInstaller.getInstance(project)
                val result = installer.install(options, indicator)

                ApplicationManager.getApplication().invokeLater {
                    if (result.success) {
                        Notifications.Bus.notify(
                            Notification(
                                "ARTK Notifications",
                                "ARTK Installed",
                                "ARTK has been successfully installed in ${result.artkE2ePath}",
                                NotificationType.INFORMATION
                            ),
                            project
                        )

                        // Refresh project service
                        ARTKProjectService.getInstance(project).refresh()

                        // Open tool window
                        ToolWindowManager.getInstance(project).getToolWindow("ARTK")?.show()
                    } else {
                        Notifications.Bus.notify(
                            Notification(
                                "ARTK Notifications",
                                "Installation Failed",
                                result.error ?: "Unknown error",
                                NotificationType.ERROR
                            ),
                            project
                        )
                    }
                }
            }
        })
    }

    override fun update(e: AnActionEvent) {
        e.presentation.isEnabledAndVisible = e.project != null
    }

    override fun getActionUpdateThread() = ActionUpdateThread.BGT
}

// actions/DoctorAction.kt
class DoctorAction : AnAction("Run Doctor", "Diagnose and fix ARTK issues", AllIcons.General.InspectionsEye) {

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        val service = ARTKProjectService.getInstance(project)

        if (!service.isInstalled) {
            Messages.showWarningDialog(
                project,
                "ARTK is not installed in this project. Run 'Initialize ARTK' first.",
                "ARTK Not Installed"
            )
            return
        }

        ProgressManager.getInstance().run(object : Task.Backgroundable(
            project, "Running ARTK Doctor", false
        ) {
            override fun run(indicator: ProgressIndicator) {
                val cli = CLIBridgeService.getInstance(project)

                val checks = mutableListOf<DoctorCheck>()

                // Check 1: Context file
                indicator.text = "Checking context.json..."
                indicator.fraction = 0.2
                checks.add(checkContextFile(service))

                // Check 2: Config file
                indicator.text = "Checking artk.config.yml..."
                indicator.fraction = 0.4
                checks.add(checkConfigFile(service))

                // Check 3: Vendor libraries
                indicator.text = "Checking vendor libraries..."
                indicator.fraction = 0.6
                checks.add(checkVendorLibs(service))

                // Check 4: Node modules
                indicator.text = "Checking node_modules..."
                indicator.fraction = 0.8
                checks.add(checkNodeModules(service))

                // Check 5: LLKB
                indicator.text = "Checking LLKB..."
                indicator.fraction = 1.0
                checks.add(checkLLKB(service))

                ApplicationManager.getApplication().invokeLater {
                    showDoctorResults(project, checks)
                }
            }
        })
    }

    private fun checkContextFile(service: ARTKProjectService): DoctorCheck {
        val contextPath = service.contextPath
        return if (contextPath != null && Files.exists(contextPath)) {
            DoctorCheck("Context file", DoctorStatus.OK, "context.json exists")
        } else {
            DoctorCheck("Context file", DoctorStatus.ERROR, "context.json not found")
        }
    }

    // ... other check methods

    private fun showDoctorResults(project: Project, checks: List<DoctorCheck>) {
        val hasErrors = checks.any { it.status == DoctorStatus.ERROR }
        val hasWarnings = checks.any { it.status == DoctorStatus.WARNING }

        val message = buildString {
            checks.forEach { check ->
                val icon = when (check.status) {
                    DoctorStatus.OK -> "✓"
                    DoctorStatus.WARNING -> "⚠"
                    DoctorStatus.ERROR -> "✗"
                }
                appendLine("$icon ${check.name}: ${check.message}")
            }
        }

        when {
            hasErrors -> Messages.showErrorDialog(project, message, "ARTK Doctor - Issues Found")
            hasWarnings -> Messages.showWarningDialog(project, message, "ARTK Doctor - Warnings")
            else -> Messages.showInfoMessage(project, message, "ARTK Doctor - All Good")
        }
    }

    override fun update(e: AnActionEvent) {
        e.presentation.isEnabledAndVisible = e.project != null
    }

    override fun getActionUpdateThread() = ActionUpdateThread.BGT
}

data class DoctorCheck(val name: String, val status: DoctorStatus, val message: String)
enum class DoctorStatus { OK, WARNING, ERROR }
```

**Files to Create:**
- `actions/InitAction.kt`
- `actions/InitOptionsDialog.kt`
- `actions/DoctorAction.kt`
- `actions/CheckAction.kt`
- `actions/OpenConfigAction.kt`
- `actions/OpenDashboardAction.kt`
- `actions/UpgradeAction.kt`
- `actions/UninstallAction.kt`
- `actions/RunJourneyTestAction.kt`
- `actions/llkb/HealthAction.kt`
- `actions/llkb/StatsAction.kt`
- `actions/llkb/ExportAction.kt`

**Effort:** 16 hours

---

## 4. Phase-by-Phase Breakdown

### Phase 1: Foundation (Week 1-2)

| Day | Tasks | Files | Hours |
|-----|-------|-------|-------|
| 1-2 | Project setup, Gradle config, plugin.xml | build.gradle.kts, plugin.xml | 8 |
| 3-4 | Data models, utilities | model/*.kt, util/*.kt | 8 |
| 5-6 | ARTKProjectService, file listener | services/ARTKProjectService.kt, listeners/*.kt | 12 |
| 7-8 | Init action with installer | actions/InitAction.kt, installer/*.kt | 16 |
| 9-10 | Doctor, Check actions | actions/DoctorAction.kt, CheckAction.kt | 8 |

**Deliverable:** Plugin that detects ARTK and can initialize new projects

### Phase 2: Tool Windows (Week 3-4)

| Day | Tasks | Files | Hours |
|-----|-------|-------|-------|
| 1-2 | Tool window factory, Status panel | toolwindow/*.kt | 12 |
| 3-4 | Journeys panel with file scanning | toolwindow/panels/JourneysPanel.kt | 12 |
| 5-6 | Workflow panel with Copilot workaround | toolwindow/panels/WorkflowPanel.kt | 12 |
| 7-8 | LLKB panel | toolwindow/panels/LLKBPanel.kt | 8 |
| 9-10 | Tree renderers, icons, context menus | toolwindow/tree/*.kt | 8 |

**Deliverable:** Full tree view parity with VS Code

### Phase 3: Dashboard (Week 5-6)

| Day | Tasks | Files | Hours |
|-----|-------|-------|-------|
| 1-3 | JCEF browser setup, scheme handler | dashboard/DashboardPanel.kt | 16 |
| 4-5 | JS bridge, bidirectional messaging | dashboard/DashboardJSBridge.kt | 12 |
| 6-8 | Dashboard HTML/CSS/JS | resources/dashboard/* | 16 |
| 9-10 | Theme integration, polish | dashboard/*.kt | 8 |

**Deliverable:** Interactive dashboard matching VS Code

### Phase 4: Status Bar & Commands (Week 7)

| Day | Tasks | Files | Hours |
|-----|-------|-------|-------|
| 1-2 | Status bar widget | statusbar/*.kt | 8 |
| 3-4 | LLKB actions | actions/llkb/*.kt | 8 |
| 5-6 | Journey actions, terminal integration | actions/*.kt | 8 |
| 7 | Settings UI | settings/*.kt | 8 |

**Deliverable:** Full command parity

### Phase 5: Workflow Workaround (Week 8)

| Day | Tasks | Files | Hours |
|-----|-------|-------|-------|
| 1-2 | Clipboard integration | WorkflowPanel.kt updates | 8 |
| 3-4 | Copilot detection, notifications | util/CopilotUtils.kt | 8 |
| 5 | Documentation | docs/*.md | 4 |

**Deliverable:** Usable workflow with guidance

### Phase 6: Testing & Polish (Week 9-10)

| Day | Tasks | Files | Hours |
|-----|-------|-------|-------|
| 1-4 | Unit tests | test/**/*.kt | 24 |
| 5-6 | Integration tests | test/**/*.kt | 12 |
| 7-8 | UI tests, manual testing | test/**/*.kt | 12 |
| 9 | Performance optimization | Various | 6 |
| 10 | Plugin publishing setup | build.gradle.kts | 4 |

**Deliverable:** Published plugin

---

## 5. Code Examples

### 5.1 Message Bus Communication

```kotlin
// Define topic
object ARTKTopics {
    val CONTEXT_CHANGED: Topic<ContextChangedListener> = Topic.create(
        "ARTK.ContextChanged",
        ContextChangedListener::class.java
    )

    val JOURNEYS_CHANGED: Topic<JourneysChangedListener> = Topic.create(
        "ARTK.JourneysChanged",
        JourneysChangedListener::class.java
    )
}

interface ContextChangedListener {
    fun onContextChanged(isInstalled: Boolean, context: ARTKContext?)
}

interface JourneysChangedListener {
    fun onJourneysChanged()
}

// Publisher (in service)
project.messageBus.syncPublisher(ARTKTopics.CONTEXT_CHANGED)
    .onContextChanged(isInstalled, artkContext)

// Subscriber (in UI component)
project.messageBus.connect(this)
    .subscribe(ARTKTopics.CONTEXT_CHANGED, object : ContextChangedListener {
        override fun onContextChanged(isInstalled: Boolean, context: ARTKContext?) {
            refresh()
        }
    })
```

### 5.2 Progress Indicator Usage

```kotlin
ProgressManager.getInstance().run(object : Task.Backgroundable(
    project, "Installing ARTK", true
) {
    override fun run(indicator: ProgressIndicator) {
        indicator.isIndeterminate = false

        indicator.text = "Step 1: Creating directories..."
        indicator.fraction = 0.1
        // ... do work

        indicator.text = "Step 2: Installing dependencies..."
        indicator.fraction = 0.5
        // ... do work

        if (indicator.isCanceled) {
            return // User cancelled
        }

        indicator.fraction = 1.0
    }

    override fun onSuccess() {
        // Called on EDT after run() completes successfully
        Notifications.Bus.notify(...)
    }

    override fun onThrowable(error: Throwable) {
        // Called on EDT if run() throws
        Messages.showErrorDialog(project, error.message, "Error")
    }
})
```

### 5.3 File System Operations with VFS

```kotlin
// Read file
val vf = LocalFileSystem.getInstance().findFileByPath(path.toString())
val content = vf?.let {
    ApplicationManager.getApplication().runReadAction<String> {
        VfsUtilCore.loadText(it)
    }
}

// Write file (must be in write action)
WriteCommandAction.runWriteCommandAction(project) {
    val vf = LocalFileSystem.getInstance().findFileByPath(path.toString())
    vf?.let {
        VfsUtil.saveText(it, newContent)
    }
}

// Create directory
WriteCommandAction.runWriteCommandAction(project) {
    val parentVf = LocalFileSystem.getInstance().findFileByPath(parentPath.toString())
    parentVf?.createChildDirectory(this, "newDir")
}

// Watch for changes
LocalFileSystem.getInstance().addRootToWatch(path.toString(), true)
```

### 5.4 Terminal Integration

```kotlin
// Run command in terminal
fun runInTerminal(project: Project, command: String, workingDir: String) {
    val terminalView = TerminalView.getInstance(project)

    // Create new terminal tab
    val widget = terminalView.createLocalShellWidget(
        workingDir,
        "ARTK"
    )

    // Execute command
    widget.executeCommand(command)
}

// Alternative: Use ShTerminalRunner (for shell scripts)
fun runShellScript(project: Project, scriptPath: String) {
    val runner = ShTerminalRunner(project)
    runner.run(
        scriptPath,
        project.basePath ?: return,
        "ARTK Script",
        true // activate terminal
    )
}
```

---

## 6. Testing Strategy

### 6.1 Unit Tests

```kotlin
// services/ARTKProjectServiceTest.kt
class ARTKProjectServiceTest : BasePlatformTestCase() {

    fun testDetectsInstalledProject() {
        // Setup
        val artkE2e = createTempDir("artk-e2e")
        val contextFile = File(artkE2e, ".artk/context.json")
        contextFile.parentFile.mkdirs()
        contextFile.writeText("""{"artkVersion": "1.0.0", "variant": "modern-esm"}""")

        // Test
        val service = ARTKProjectService(project)
        service.refresh()

        // Assert
        assertTrue(service.isInstalled)
        assertEquals("1.0.0", service.artkContext?.artkVersion)
    }

    fun testDetectsNotInstalled() {
        val service = ARTKProjectService(project)
        assertFalse(service.isInstalled)
        assertNull(service.artkContext)
    }
}

// installer/VariantDetectorTest.kt
class VariantDetectorTest {

    @Test
    fun testDetectsModernEsmFromNvmrc() {
        val tempDir = Files.createTempDirectory("test")
        Files.writeString(tempDir.resolve(".nvmrc"), "v20")
        Files.writeString(tempDir.resolve("package.json"), """{"type": "module"}""")

        val variant = VariantDetector.detect(tempDir)

        assertEquals("modern-esm", variant)
    }

    @Test
    fun testFallsBackToLegacy14() {
        val tempDir = Files.createTempDirectory("test")
        Files.writeString(tempDir.resolve(".nvmrc"), "v14")

        val variant = VariantDetector.detect(tempDir)

        assertEquals("legacy-14", variant)
    }
}
```

### 6.2 Integration Tests

```kotlin
// ARTKPluginIntegrationTest.kt
class ARTKPluginIntegrationTest : HeavyPlatformTestCase() {

    fun testFullInstallationFlow() {
        // Install ARTK
        val installer = ARTKInstaller(project)
        val result = installer.install(
            ARTKInstaller.InstallOptions(
                targetPath = Paths.get(project.basePath!!),
                skipNpm = true, // Skip for faster tests
                skipBrowsers = true
            ),
            EmptyProgressIndicator()
        )

        assertTrue(result.success)
        assertTrue(Files.exists(result.artkE2ePath!!.resolve("package.json")))
        assertTrue(Files.exists(result.artkE2ePath!!.resolve(".artk/context.json")))

        // Verify service detects it
        val service = ARTKProjectService.getInstance(project)
        service.refresh()
        assertTrue(service.isInstalled)
    }
}
```

### 6.3 UI Tests

```kotlin
// toolwindow/StatusPanelUITest.kt
class StatusPanelUITest : LightPlatformTestCase() {

    fun testShowsNotInstalledWhenNoArtk() {
        val service = mock<ARTKProjectService>()
        whenever(service.isInstalled).thenReturn(false)

        val panel = StatusPanel(project, service)

        // Find "Not Installed" node
        val root = panel.treeModel.root as DefaultMutableTreeNode
        val firstChild = root.firstChild as DefaultMutableTreeNode
        val item = firstChild.userObject as StatusItem

        assertEquals("Not Installed", item.text)
        assertEquals(StatusType.WARNING, item.type)
    }
}
```

---

## 7. Deployment & Publishing

### 7.1 Plugin Signing

```kotlin
// build.gradle.kts
tasks {
    signPlugin {
        certificateChain.set(System.getenv("CERTIFICATE_CHAIN"))
        privateKey.set(System.getenv("PRIVATE_KEY"))
        password.set(System.getenv("PRIVATE_KEY_PASSWORD"))
    }
}
```

### 7.2 Marketplace Publishing

```kotlin
// build.gradle.kts
tasks {
    publishPlugin {
        token.set(System.getenv("PUBLISH_TOKEN"))
        channels.set(listOf("stable")) // or "beta", "eap"
    }
}
```

### 7.3 CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/build.yml
name: Build & Test

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup JDK
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'

      - name: Build
        run: ./gradlew build

      - name: Test
        run: ./gradlew test

      - name: Verify Plugin
        run: ./gradlew verifyPlugin

      - name: Upload Artifact
        uses: actions/upload-artifact@v4
        with:
          name: plugin
          path: build/distributions/*.zip

  publish:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup JDK
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'

      - name: Publish
        env:
          PUBLISH_TOKEN: ${{ secrets.JETBRAINS_PUBLISH_TOKEN }}
          CERTIFICATE_CHAIN: ${{ secrets.CERTIFICATE_CHAIN }}
          PRIVATE_KEY: ${{ secrets.PRIVATE_KEY }}
          PRIVATE_KEY_PASSWORD: ${{ secrets.PRIVATE_KEY_PASSWORD }}
        run: ./gradlew signPlugin publishPlugin
```

---

---

## 8. Critical Requirement: Dashboard Install Button

### 8.1 Requirement Overview

**CRITICAL:** The IntelliJ plugin dashboard MUST include an "Initialize ARTK" button that provides the **exact same installation process** as:
- `scripts/bootstrap.sh` / `scripts/bootstrap.ps1`
- VS Code extension's bundled installer (`packages/vscode-extension/src/installer/index.ts`)

This ensures feature parity across all ARTK installation methods.

### 8.2 Dashboard Install UI

When ARTK is **not installed**, the dashboard should show:

```
┌─────────────────────────────────────────────────────────────────┐
│                      ARTK Dashboard                              │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                                                           │  │
│  │              ⚠️ ARTK Not Installed                        │  │
│  │                                                           │  │
│  │   Initialize ARTK to start building automated tests       │  │
│  │   with Playwright.                                        │  │
│  │                                                           │  │
│  │   ┌─────────────────────────────────────────────────┐    │  │
│  │   │           [ Initialize ARTK ]                    │    │  │
│  │   │                                                  │    │  │
│  │   │   Options:                                       │    │  │
│  │   │   ☐ Skip npm install                            │    │  │
│  │   │   ☐ Skip browser detection                      │    │  │
│  │   │   ☐ Skip LLKB initialization                    │    │  │
│  │   │   Variant: [Auto-detect ▼]                      │    │  │
│  │   └─────────────────────────────────────────────────┘    │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 8.3 Installation Feature Parity Checklist

The dashboard install button MUST implement ALL of these features (matching bootstrap.sh and VS Code extension):

| # | Feature | bootstrap.sh | VS Code | IntelliJ Dashboard |
|---|---------|--------------|---------|-------------------|
| 1 | **Variant Detection** | ✓ | ✓ | **MUST IMPLEMENT** |
| 2 | Node.js version detection (.nvmrc, package.json, PATH) | ✓ | ✓ | **MUST IMPLEMENT** |
| 3 | Module system detection (ESM/CJS) | ✓ | ✓ | **MUST IMPLEMENT** |
| 4 | **Browser Detection** | ✓ | ✓ | **MUST IMPLEMENT** |
| 5 | Edge detection (Windows, Mac, Linux paths) | ✓ | ✓ | **MUST IMPLEMENT** |
| 6 | Chrome detection (Windows, Mac, Linux paths) | ✓ | ✓ | **MUST IMPLEMENT** |
| 7 | Bundled Chromium fallback | ✓ | ✓ | **MUST IMPLEMENT** |
| 8 | **Directory Structure Creation** | ✓ | ✓ | **MUST IMPLEMENT** |
| 9 | artk-e2e/ with all subdirectories | ✓ | ✓ | **MUST IMPLEMENT** |
| 10 | vendor/artk-core/, vendor/artk-core-autogen/ | ✓ | ✓ | **MUST IMPLEMENT** |
| 11 | .artk/llkb/ structure | ✓ | ✓ | **MUST IMPLEMENT** |
| 12 | **Configuration Files** | ✓ | ✓ | **MUST IMPLEMENT** |
| 13 | artk.config.yml with full schema | ✓ | ✓ | **MUST IMPLEMENT** |
| 14 | .artk/context.json with metadata | ✓ | ✓ | **MUST IMPLEMENT** |
| 15 | package.json with correct dependencies | ✓ | ✓ | **MUST IMPLEMENT** |
| 16 | tsconfig.json with path aliases | ✓ | ✓ | **MUST IMPLEMENT** |
| 17 | playwright.config.ts | ✓ | ✓ | **MUST IMPLEMENT** |
| 18 | **Foundation Module Stubs** | ✓ | ✓ | **MUST IMPLEMENT** |
| 19 | src/modules/foundation/{auth,navigation,selectors,data}/ | ✓ | ✓ | **MUST IMPLEMENT** |
| 20 | src/modules/features/ | ✓ | ✓ | **MUST IMPLEMENT** |
| 21 | **LLKB Initialization** | ✓ | ✓ | **MUST IMPLEMENT** |
| 22 | config.yml, lessons.json, components.json, analytics.json | ✓ | ✓ | **MUST IMPLEMENT** |
| 23 | patterns/ directory with selector/timing/auth patterns | ✓ | ✓ | **MUST IMPLEMENT** |
| 24 | **Prompts Installation** | ✓ | ✓ | **MUST IMPLEMENT** |
| 25 | .github/prompts/artk.*.prompt.md stubs | ✓ | ✓ | **MUST IMPLEMENT** |
| 26 | .github/agents/artk.*.agent.md full content | ✓ | ✓ | **MUST IMPLEMENT** |
| 27 | artk.variant-info.prompt.md generation | ✓ | ✓ | **MUST IMPLEMENT** |
| 28 | **npm Install** | ✓ | ✓ | **MUST IMPLEMENT** |
| 29 | Skip browser download when using system browser | ✓ | ✓ | **MUST IMPLEMENT** |
| 30 | 5-minute timeout | ✓ | ✓ | **MUST IMPLEMENT** |
| 31 | **Browser Install with Fallback** | ✓ | ✓ | **MUST IMPLEMENT** |
| 32 | Use system browser if detected | ✓ | ✓ | **MUST IMPLEMENT** |
| 33 | Install bundled chromium if no system browser | ✓ | ✓ | **MUST IMPLEMENT** |
| 34 | **Force Reinstall** | ✓ | ✓ | **MUST IMPLEMENT** |
| 35 | Backup existing installation | ✓ | ✓ | **MUST IMPLEMENT** |
| 36 | Preserve LLKB learned patterns | ✓ | ✓ | **MUST IMPLEMENT** |
| 37 | **AI Protection Markers** | ✓ | ✓ | **MUST IMPLEMENT** |
| 38 | vendor/artk-core/READONLY.md | ✓ | ✓ | **MUST IMPLEMENT** |
| 39 | vendor/artk-core/.ai-ignore | ✓ | ✓ | **MUST IMPLEMENT** |
| 40 | vendor/artk-core/variant-features.json | ✓ | ✓ | **MUST IMPLEMENT** |

### 8.4 Dashboard Install Implementation

```kotlin
// dashboard/DashboardInstallHandler.kt
class DashboardInstallHandler(
    private val project: Project,
    private val dashboardPanel: DashboardPanel
) {

    /**
     * Handle install request from dashboard JS
     *
     * Request format:
     * {
     *   "action": "install",
     *   "data": {
     *     "skipNpm": false,
     *     "skipBrowsers": false,
     *     "skipLlkb": false,
     *     "variant": "auto",
     *     "force": false
     *   }
     * }
     */
    fun handleInstallRequest(request: JsonObject) {
        val data = request.getAsJsonObject("data") ?: JsonObject()

        val options = ARTKInstaller.InstallOptions(
            targetPath = Paths.get(project.basePath!!),
            variant = data.get("variant")?.asString ?: "auto",
            skipNpm = data.get("skipNpm")?.asBoolean ?: false,
            skipLlkb = data.get("skipLlkb")?.asBoolean ?: false,
            skipBrowsers = data.get("skipBrowsers")?.asBoolean ?: false,
            noPrompts = data.get("noPrompts")?.asBoolean ?: false,
            force = data.get("force")?.asBoolean ?: false
        )

        // Run installation with progress
        ProgressManager.getInstance().run(object : Task.Backgroundable(
            project, "Installing ARTK", true
        ) {
            override fun run(indicator: ProgressIndicator) {
                // Send progress updates to dashboard
                val progressCallback = { step: String, fraction: Double ->
                    dashboardPanel.sendToDashboard(
                        "installProgress",
                        mapOf("step" to step, "fraction" to fraction)
                    )
                }

                val installer = ARTKInstaller(project)
                val result = installer.install(options, indicator, progressCallback)

                ApplicationManager.getApplication().invokeLater {
                    if (result.success) {
                        // Refresh services
                        ARTKProjectService.getInstance(project).refresh()

                        // Update dashboard to show installed state
                        dashboardPanel.sendToDashboard("installComplete", mapOf(
                            "success" to true,
                            "artkE2ePath" to result.artkE2ePath?.toString()
                        ))

                        // Show notification
                        Notifications.Bus.notify(
                            Notification(
                                "ARTK Notifications",
                                "ARTK Installed Successfully",
                                "ARTK has been initialized. Run /artk.init-playbook to continue.",
                                NotificationType.INFORMATION
                            ),
                            project
                        )
                    } else {
                        dashboardPanel.sendToDashboard("installComplete", mapOf(
                            "success" to false,
                            "error" to result.error
                        ))
                    }
                }
            }
        })
    }
}
```

### 8.5 Dashboard HTML for Install UI

```html
<!-- In resources/dashboard/index.html -->

<div id="not-installed-view" class="view" style="display: none;">
    <div class="install-card">
        <div class="install-icon">⚠️</div>
        <h2>ARTK Not Installed</h2>
        <p>Initialize ARTK to start building automated tests with Playwright.</p>

        <div class="install-options">
            <h3>Installation Options</h3>

            <label class="checkbox-option">
                <input type="checkbox" id="skip-npm"> Skip npm install
                <span class="hint">Use if you want to run npm install manually</span>
            </label>

            <label class="checkbox-option">
                <input type="checkbox" id="skip-browsers"> Skip browser detection
                <span class="hint">Use bundled Chromium instead of system browsers</span>
            </label>

            <label class="checkbox-option">
                <input type="checkbox" id="skip-llkb"> Skip LLKB initialization
                <span class="hint">Don't initialize Lessons Learned Knowledge Base</span>
            </label>

            <div class="select-option">
                <label for="variant">Variant:</label>
                <select id="variant">
                    <option value="auto" selected>Auto-detect</option>
                    <option value="modern-esm">Modern ESM (Node 18+)</option>
                    <option value="modern-cjs">Modern CJS (Node 18+)</option>
                    <option value="legacy-16">Legacy Node 16</option>
                    <option value="legacy-14">Legacy Node 14</option>
                </select>
            </div>
        </div>

        <button id="install-btn" class="primary-button" onclick="startInstall()">
            Initialize ARTK
        </button>

        <div id="install-progress" style="display: none;">
            <div class="progress-bar">
                <div class="progress-fill" id="progress-fill"></div>
            </div>
            <div class="progress-text" id="progress-text">Starting...</div>
        </div>
    </div>
</div>

<script>
function startInstall() {
    const options = {
        skipNpm: document.getElementById('skip-npm').checked,
        skipBrowsers: document.getElementById('skip-browsers').checked,
        skipLlkb: document.getElementById('skip-llkb').checked,
        variant: document.getElementById('variant').value,
        force: false
    };

    // Show progress UI
    document.getElementById('install-btn').style.display = 'none';
    document.getElementById('install-progress').style.display = 'block';

    // Send install request to Kotlin
    if (window.artkBridge) {
        window.artkBridge.send('install', options);
    }
}

// Called from Kotlin during installation
function updateInstallProgress(step, fraction) {
    document.getElementById('progress-fill').style.width = (fraction * 100) + '%';
    document.getElementById('progress-text').textContent = step;
}

// Called from Kotlin when installation completes
function onInstallComplete(success, error) {
    if (success) {
        // Reload dashboard to show installed state
        location.reload();
    } else {
        document.getElementById('install-btn').style.display = 'block';
        document.getElementById('install-progress').style.display = 'none';
        alert('Installation failed: ' + error);
    }
}
</script>
```

### 8.6 Progress Steps (Must Match VS Code)

The installation progress should show these steps (matching VS Code extension exactly):

| Step | Progress | Description |
|------|----------|-------------|
| 1/10 | 5% | Creating directory structure... |
| 2/10 | 10% | Creating foundation modules... |
| 3/10 | 15% | Creating package.json... |
| 4/10 | 20% | Creating configuration files... |
| 5/10 | 30% | Installing ARTK core libraries... |
| 6/10 | 35% | Installing templates... |
| 7/10 | 40% | Initializing LLKB... |
| 8/10 | 45% | Installing AI prompts and agents... |
| 9/10 | 55-85% | Installing npm dependencies... |
| 10/10 | 85-100% | Setting up browsers... |

### 8.7 Upgrade & Reinstall from Dashboard

When ARTK **is installed**, the dashboard should also show:

```
┌─────────────────────────────────────────────────────────────────┐
│  Actions                                                        │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │   Refresh    │ │ Open Config  │ │ Run Doctor   │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│  ┌──────────────┐ ┌──────────────┐                              │
│  │   Upgrade    │ │  Reinstall   │  ← Force reinstall          │
│  └──────────────┘ └──────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
```

**Upgrade button:** Updates @artk/core while preserving:
- User's tests
- User's journeys
- LLKB learned patterns
- Browser configuration

**Reinstall button:** Full reinstall with backup (same as `force: true`).

---

## Summary

### Total Effort by Component

| Component | Hours |
|-----------|-------|
| Project Setup & Models | 16 |
| Services (Project, CLI) | 16 |
| Tool Windows (4 panels) | 52 |
| Dashboard (JCEF) | 52 |
| Status Bar | 8 |
| Actions (Init, Doctor, etc.) | 24 |
| Installer | 24 |
| Settings | 8 |
| Testing | 48 |
| Polish & Publishing | 12 |
| **Total** | **260 hours (~10 weeks)** |

### Key Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| JCEF compatibility | Fallback to Swing-based dashboard |
| Copilot API unavailable | Clipboard workaround + notifications |
| Complex installer logic | Port VS Code implementation incrementally |
| Performance issues | Lazy loading, caching, background tasks |

### Success Criteria

1. All tree views functional and refreshing
2. Installation works on Windows, macOS, Linux
3. Dashboard loads and communicates with Kotlin
4. Workflow steps copyable with clear guidance
5. Settings persist across IDE restarts
6. Tests pass on IntelliJ 2024.1+
7. Published to JetBrains Marketplace
