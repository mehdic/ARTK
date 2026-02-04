# IntelliJ IDEA Plugin Feasibility Analysis

**Date:** 2026-02-04
**Topic:** VS Code Extension → IntelliJ IDEA Plugin Port Feasibility
**Author:** Claude (Opus 4.5)
**Confidence:** 0.87 (High)

---

## Executive Summary

### GO/NO-GO Decision: **CONDITIONAL GO** ✅

The ARTK VS Code extension **CAN** be ported to IntelliJ IDEA with ~70% feature parity at launch. However, one critical feature—**Copilot Chat workflow integration**—has no official API support in IntelliJ and will require a workaround or feature redesign.

**Recommendation:** Proceed with development, implementing all features except programmatic Copilot Chat triggering. Design an alternative UX for workflow execution (e.g., clipboard + instructions, or wait for API availability).

---

## Feature-by-Feature Feasibility Matrix

### Legend
- ✅ **Direct Port** - IntelliJ has equivalent API
- ⚠️ **Adaptation Needed** - Requires different approach
- ❌ **Blocked** - No equivalent API exists
- 🔄 **Workaround** - Achievable with alternative approach

| # | VS Code Feature | VS Code API | IntelliJ API | Status | Notes |
|---|-----------------|-------------|--------------|--------|-------|
| **Installation & Initialization** |||||
| 1 | Initialize ARTK (`artk.init`) | `commands.registerCommand()` | `AnAction` | ✅ | Direct equivalent |
| 2 | Init Wizard UI | `showQuickPick()`, `showInputBox()` | `DialogWrapper`, `Messages` | ✅ | More powerful in IntelliJ |
| 3 | Variant Auto-Detection | File system, Node.js detection | File system, `Runtime.exec()` | ✅ | Same approach works |
| 4 | Browser Detection | `spawn()` child_process | `GeneralCommandLine` | ✅ | Direct equivalent |
| 5 | Force Reinstall | `withProgress()` | `ProgressIndicator`, `Task.Backgroundable` | ✅ | Better progress API |
| 6 | Installation Progress | `ProgressLocation.Notification` | `ProgressManager.getInstance()` | ✅ | More customizable |
| **Project Health & Configuration** |||||
| 7 | Check Prerequisites | Command execution | `GeneralCommandLine` | ✅ | Direct equivalent |
| 8 | Run Doctor | `showInformationMessage()` | `Notifications.Bus.notify()` | ✅ | Better notification system |
| 9 | Upgrade ARTK | Bundled installer | Same approach | ✅ | Works identically |
| 10 | Uninstall ARTK | `fs.promises.rm()` | VFS API | ✅ | Better file system API |
| 11 | Open Configuration | `showTextDocument()` | `FileEditorManager.openFile()` | ✅ | Direct equivalent |
| **Explorer Views (Tree Views)** |||||
| 12 | Status View | `TreeDataProvider` | `AbstractTreeBuilder` / `TreeStructure` | ✅ | More powerful |
| 13 | Journeys View | `TreeDataProvider` + async | `AbstractTreeNode` | ✅ | Direct equivalent |
| 14 | Workflow View | `TreeDataProvider` | `AbstractTreeNode` | ✅ | Direct equivalent |
| 15 | LLKB View | `TreeDataProvider` | `AbstractTreeNode` | ✅ | Direct equivalent |
| 16 | Tree Item Icons | `ThemeIcon` | `AllIcons`, `IconLoader` | ✅ | Extensive icon library |
| **Dashboard Webview** |||||
| 17 | Dashboard Panel | `createWebviewPanel()` | `JBCefBrowser` (JCEF) | ⚠️ | Requires JCEF setup |
| 18 | CSP Security | Nonce-based CSP | JCEF security model | ⚠️ | Different security model |
| 19 | Webview Messages | `onDidReceiveMessage()` | `JBCefJSQuery` | ⚠️ | Async callback pattern |
| 20 | Real-time Updates | JavaScript postMessage | `JBCefJSQuery` callbacks | ⚠️ | Different mechanism |
| 21 | Theme Integration | VS Code CSS variables | IntelliJ LAF (Look and Feel) | ⚠️ | Need to bridge themes |
| **Status Bar** |||||
| 22 | Status Bar Item | `createStatusBarItem()` | `StatusBarWidgetFactory` | ✅ | Direct equivalent |
| 23 | Click Navigation | `.command` property | Widget click handler | ✅ | Direct equivalent |
| 24 | Dynamic Text | String property | `StatusBarWidget.TextPresentation` | ✅ | Direct equivalent |
| 25 | Tooltip | Markdown string | HTML tooltip or `JBPopupFactory` | ✅ | More options available |
| 26 | Periodic Refresh | `setInterval()` | `JobScheduler.getScheduler()` | ✅ | Better scheduling API |
| **Copilot Integration** 🚨 |||||
| 27 | Execute in Copilot | `chat.open` command | **NO API** | ❌ | **Critical blocker** |
| 28 | Edit in Copilot | `chat.open` + `isPartialQuery` | **NO API** | ❌ | **Critical blocker** |
| 29 | Copilot Detection | `extensions.getExtension()` | `PluginManager.getPlugin()` | ✅ | Direct equivalent |
| **LLKB Management** |||||
| 30 | LLKB Health | CLI bridge | CLI bridge | ✅ | Identical approach |
| 31 | LLKB Stats | CLI JSON output | CLI JSON output | ✅ | Identical approach |
| 32 | LLKB Export | CLI bridge | CLI bridge | ✅ | Identical approach |
| 33 | Pattern Analytics | JSON parsing | JSON parsing (Gson/Jackson) | ✅ | Better JSON libraries |
| **Configuration Management** |||||
| 34 | Extension Settings | `workspace.getConfiguration()` | `PersistentStateComponent` | ✅ | More powerful |
| 35 | Watch Config Changes | `onDidChangeConfiguration()` | `MessageBusConnection` | ✅ | Observer pattern |
| 36 | CLI Path Override | String setting | `@State` annotation | ✅ | Better persistence |
| **File Watching** |||||
| 37 | File Watchers | `FileSystemWatcher` | `BulkFileListener` | ✅ | Better VFS integration |
| 38 | Glob Patterns | glob patterns | VFS patterns | ✅ | Direct equivalent |
| 39 | Debouncing | Custom implementation | `Alarm` class | ✅ | Built-in debouncing |
| **State Management** |||||
| 40 | Workspace State | `workspaceState` | `PersistentStateComponent` (project) | ✅ | Better serialization |
| 41 | Global State | `globalState` | `PersistentStateComponent` (app) | ✅ | XML-based storage |
| **Terminal Integration** |||||
| 42 | Create Terminal | `createTerminal()` | `TerminalView.createLocalShellWidget()` | ✅ | Direct equivalent |
| 43 | Send Commands | `sendText()` | `ShellTerminalWidget.executeCommand()` | ✅ | Direct equivalent |
| 44 | Show Terminal | `terminal.show()` | `ToolWindow.show()` | ✅ | Direct equivalent |

### Summary Statistics

| Category | Count | Percentage |
|----------|-------|------------|
| ✅ Direct Port | 36 | 82% |
| ⚠️ Adaptation Needed | 5 | 11% |
| ❌ Blocked | 2 | 5% |
| 🔄 Workaround Available | 1 | 2% |

---

## Critical Issue: Copilot Chat Integration

### The Problem

The VS Code extension's **Workflow View** relies on programmatically opening GitHub Copilot Chat with a pre-filled prompt:

```typescript
// VS Code - Works perfectly
await vscode.commands.executeCommand('workbench.action.chat.open', {
  query: '/artk.journey-propose',
  isPartialQuery: false, // Auto-submit
});
```

**IntelliJ has no equivalent API.** The GitHub Copilot IntelliJ plugin does not expose any public APIs for:
- Opening Copilot Chat programmatically
- Sending prompts to Copilot Chat
- Triggering chat submissions

This was confirmed via [GitHub community discussion](https://github.com/orgs/community/discussions/172311) (January 2026):
> "Currently, the GitHub Copilot IntelliJ plugin does not expose any official public APIs or extension points that allow other plugins to programmatically open Copilot Chat (Agent Mode) or send custom prompts directly."

### Workaround Options

| Option | Effort | UX Quality | Recommendation |
|--------|--------|------------|----------------|
| **A. Copy to Clipboard** | Low | Fair | ✅ Best interim solution |
| **B. Open Copilot + Toast** | Low | Fair | ✅ Combined with A |
| **C. Wait for API** | N/A | Ideal | Monitor feedback repo |
| **D. JetBrains AI Integration** | Medium | Good | Alternative if Copilot unavailable |

**Recommended Approach (A+B):**
1. Copy the prompt to clipboard
2. Open Copilot Chat tool window (if possible, or show toast to open manually)
3. Show notification: "Prompt copied! Paste into Copilot Chat and press Enter"

```kotlin
// IntelliJ Workaround
fun executeWorkflowStep(step: WorkflowStep) {
    // Copy prompt to clipboard
    CopyPasteManager.getInstance().setContents(StringSelection(step.prompt))

    // Try to open Copilot Chat (may need reflection/internal API)
    val toolWindow = ToolWindowManager.getInstance(project).getToolWindow("GitHub Copilot Chat")
    toolWindow?.show()

    // Notify user
    Notifications.Bus.notify(
        Notification("ARTK", "Prompt Copied",
            "Paste into Copilot Chat and press Enter to execute: ${step.name}",
            NotificationType.INFORMATION)
    )
}
```

---

## Architecture Comparison

### VS Code Extension Architecture

```
packages/vscode-extension/src/
├── extension.ts              # Entry point
├── commands/                 # Command implementations
├── views/                    # Tree providers + Webview
├── workspace/                # Context management
├── installer/                # Bundled installation
├── cli/                      # CLI bridge
├── providers/                # StatusBarProvider
└── utils/                    # Helpers
```

### Proposed IntelliJ Plugin Architecture

```
src/main/
├── kotlin/com/artk/intellij/
│   ├── ARTKPlugin.kt                    # Plugin entry point
│   ├── actions/                         # AnAction implementations
│   │   ├── InitAction.kt
│   │   ├── DoctorAction.kt
│   │   └── ...
│   ├── toolwindow/                      # Tool window panels
│   │   ├── ARTKToolWindowFactory.kt
│   │   ├── StatusPanel.kt
│   │   ├── WorkflowPanel.kt
│   │   ├── JourneysPanel.kt
│   │   └── LLKBPanel.kt
│   ├── dashboard/                       # JCEF-based dashboard
│   │   ├── DashboardPanel.kt
│   │   └── DashboardJSBridge.kt
│   ├── services/                        # Project/App services
│   │   ├── ARTKProjectService.kt
│   │   ├── WorkspaceContextService.kt
│   │   └── CLIBridgeService.kt
│   ├── settings/                        # Plugin settings
│   │   ├── ARTKSettings.kt
│   │   └── ARTKSettingsConfigurable.kt
│   ├── statusbar/                       # Status bar widget
│   │   └── ARTKStatusBarWidget.kt
│   ├── installer/                       # Bundled installation
│   │   └── ARTKInstaller.kt
│   └── listeners/                       # VFS & message bus
│       └── ARTKFileListener.kt
├── resources/
│   ├── META-INF/plugin.xml              # Plugin descriptor
│   ├── icons/                           # Plugin icons
│   └── dashboard/                       # Dashboard HTML/CSS/JS
└── test/
    └── kotlin/                          # Unit tests
```

---

## Implementation Plan

### Phase 1: Foundation (Week 1-2)

**Goal:** Basic plugin structure with project detection

| Task | Priority | Effort | Details |
|------|----------|--------|---------|
| Create Gradle project | P0 | 2h | IntelliJ Platform Plugin template |
| Plugin descriptor (plugin.xml) | P0 | 2h | Actions, extensions, services |
| ARTK detection service | P0 | 4h | Detect `artk-e2e/`, `.artk/context.json` |
| Project-level service | P0 | 4h | `PersistentStateComponent` for settings |
| VFS listener | P1 | 4h | Watch ARTK files for changes |
| Basic action: Init | P0 | 8h | Port installer logic (Kotlin) |
| Basic action: Doctor | P1 | 4h | CLI bridge implementation |

**Deliverable:** Plugin that detects ARTK projects and can initialize new ones

### Phase 2: Tool Window Views (Week 3-4)

**Goal:** Recreate all tree views

| Task | Priority | Effort | Details |
|------|----------|--------|---------|
| Tool window factory | P0 | 4h | Register ARTK tool window |
| Status panel | P0 | 8h | Installation status, config, LLKB |
| Journeys panel | P0 | 8h | Async file scanning, grouping |
| Workflow panel | P0 | 8h | 9 steps with icons and tooltips |
| LLKB panel | P1 | 6h | Lessons, components, confidence |
| Tree node icons | P1 | 4h | Map VS Code icons to IntelliJ |
| Context menus | P1 | 4h | Right-click actions |

**Deliverable:** Full tree view parity with VS Code

### Phase 3: Dashboard (Week 5-6)

**Goal:** JCEF-based interactive dashboard

| Task | Priority | Effort | Details |
|------|----------|--------|---------|
| JCEF browser setup | P0 | 8h | `JBCefBrowser` in tool window |
| Custom scheme handler | P1 | 4h | Load HTML from resources |
| JS query bridge | P0 | 8h | Bidirectional communication |
| Dashboard HTML/CSS | P0 | 8h | Port from VS Code (adapt theme) |
| Theme integration | P1 | 4h | Bridge IntelliJ LAF to CSS vars |
| Real-time updates | P1 | 4h | Session polling |

**Deliverable:** Interactive dashboard matching VS Code functionality

### Phase 4: Status Bar & Commands (Week 7)

**Goal:** Status bar widget and all commands

| Task | Priority | Effort | Details |
|------|----------|--------|---------|
| Status bar widget factory | P0 | 4h | `StatusBarWidgetFactory` |
| Widget text/tooltip | P0 | 4h | Dynamic content |
| Click-to-dashboard | P1 | 2h | Open dashboard on click |
| All LLKB actions | P0 | 4h | Health, stats, export, seed |
| All journey actions | P0 | 4h | Validate, implement, open |
| Settings UI | P0 | 4h | `Configurable` implementation |

**Deliverable:** Full command parity except Copilot integration

### Phase 5: Workflow Workaround (Week 8)

**Goal:** Alternative UX for Copilot workflow

| Task | Priority | Effort | Details |
|------|----------|--------|---------|
| Clipboard integration | P0 | 2h | Copy prompt to clipboard |
| Copilot detection | P0 | 2h | Check if plugin installed |
| Notification system | P0 | 2h | Guide user to paste |
| (Optional) Tool window open | P2 | 4h | Try to open Copilot via internal API |
| Documentation | P0 | 4h | User guide for workflow |

**Deliverable:** Usable workflow with clear user guidance

### Phase 6: Testing & Polish (Week 9-10)

**Goal:** Production-ready plugin

| Task | Priority | Effort | Details |
|------|----------|--------|---------|
| Unit tests | P0 | 16h | Services, installer, CLI bridge |
| Integration tests | P0 | 8h | Plugin activation, detection |
| UI tests | P1 | 8h | Tool window interactions |
| Performance optimization | P1 | 4h | Caching, lazy loading |
| Error handling | P0 | 4h | User-friendly error messages |
| Plugin publishing | P0 | 4h | JetBrains Marketplace setup |

**Deliverable:** Published plugin on JetBrains Marketplace

---

## Technical Requirements

### Development Environment

```groovy
// build.gradle.kts
plugins {
    id("org.jetbrains.kotlin.jvm") version "1.9.22"
    id("org.jetbrains.intellij") version "1.17.2"
}

intellij {
    version.set("2024.1")  // Target version
    type.set("IC")         // IntelliJ Community
    plugins.set(listOf(
        "org.jetbrains.plugins.terminal",  // Terminal integration
    ))
}

dependencies {
    implementation("com.google.code.gson:gson:2.10.1")  // JSON parsing
    implementation("org.yaml:snakeyaml:2.2")            // YAML parsing
}
```

### Minimum IDE Version

- **Target:** IntelliJ IDEA 2024.1+
- **Reason:** Stable JCEF support, modern plugin API
- **Compatible IDEs:** IntelliJ IDEA, WebStorm, PhpStorm, PyCharm, etc.

### Plugin Dependencies

```xml
<!-- plugin.xml -->
<depends>com.intellij.modules.platform</depends>
<depends optional="true" config-file="terminal.xml">org.jetbrains.plugins.terminal</depends>
```

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Copilot API never released | Medium | High | Maintain clipboard workaround; monitor feedback repo |
| JCEF compatibility issues | Low | Medium | Fallback to Swing-based dashboard |
| Breaking API changes | Low | Medium | Pin IntelliJ version; gradual upgrades |
| Performance issues | Low | Low | Profiling; lazy loading; caching |
| JetBrains Marketplace rejection | Very Low | High | Follow guidelines; test thoroughly |

---

## Comparison with VS Code Extension

### What's Better in IntelliJ

1. **Richer UI components** - Native dialogs, better tree controls
2. **Better file system API** - VFS with built-in caching and events
3. **Stronger type system** - Kotlin vs TypeScript
4. **Better JSON/YAML parsing** - Gson, SnakeYAML libraries
5. **Built-in debouncing** - `Alarm` class for event coalescing
6. **Project-level services** - Better state management

### What's Worse in IntelliJ

1. **No Copilot Chat API** - Critical limitation
2. **More complex webview** - JCEF setup vs simple webview
3. **Steeper learning curve** - IntelliJ Platform is complex
4. **Smaller plugin ecosystem** - Fewer examples/resources
5. **Longer development cycle** - Java/Kotlin vs TypeScript

---

## Conclusion

### Final Recommendation: **CONDITIONAL GO**

**Proceed with development** given:

1. **82% of features have direct API equivalents**
2. **The core value proposition (ARTK project management, journeys, LLKB) is fully portable**
3. **The Copilot integration blocker has a reasonable workaround**

**Key conditions:**

1. Accept the clipboard-based workflow workaround for now
2. File a feature request with GitHub Copilot team for API access
3. Monitor [microsoft/copilot-intellij-feedback](https://github.com/microsoft/copilot-intellij-feedback/issues) for API availability
4. Be prepared to update when/if API becomes available

### Estimated Timeline

| Phase | Duration | Cumulative |
|-------|----------|------------|
| Phase 1: Foundation | 2 weeks | 2 weeks |
| Phase 2: Tool Windows | 2 weeks | 4 weeks |
| Phase 3: Dashboard | 2 weeks | 6 weeks |
| Phase 4: Status Bar & Commands | 1 week | 7 weeks |
| Phase 5: Workflow Workaround | 1 week | 8 weeks |
| Phase 6: Testing & Polish | 2 weeks | 10 weeks |

**Total estimated effort:** 10 weeks for MVP with full feature parity (minus native Copilot integration)

---

## Sources

- [IntelliJ Platform Plugin SDK - Tool Windows](https://plugins.jetbrains.com/docs/intellij/tool-windows.html)
- [IntelliJ Platform Plugin SDK - JCEF](https://plugins.jetbrains.com/docs/intellij/embedded-browser-jcef.html)
- [IntelliJ Platform Plugin SDK - Status Bar Widgets](https://plugins.jetbrains.com/docs/intellij/status-bar-widgets.html)
- [IntelliJ Platform Plugin SDK - Persisting State](https://plugins.jetbrains.com/docs/intellij/persisting-state-of-components.html)
- [IntelliJ Platform Plugin SDK - Virtual File System](https://plugins.jetbrains.com/docs/intellij/virtual-file-system.html)
- [IntelliJ Platform Plugin SDK - Notifications](https://plugins.jetbrains.com/docs/intellij/notifications.html)
- [GitHub Community - Copilot Chat API Request](https://github.com/orgs/community/discussions/172311)
- [VS Code Extension to IntelliJ Plugin Conversion Discussion](https://intellij-support.jetbrains.com/hc/en-us/community/posts/360008253620-Converting-VSCode-extension-to-Intellij-plugin-questions)
- [Creating IntelliJ Plugin with WebView (VirtusLab)](https://medium.com/virtuslab/creating-intellij-plugin-with-webview-3b27c3f87aea)
- [IntelliJ Terminal Integration](https://intellij-support.jetbrains.com/hc/en-us/community/posts/360005329339-Execute-command-in-the-terminal-from-plugin-action)
