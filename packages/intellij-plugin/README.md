# ARTK IntelliJ IDEA Plugin

Visual tools for ARTK test automation with Playwright, for IntelliJ IDEA and other JetBrains IDEs.

## Features

- **Project Detection** - Automatically detects ARTK installations
- **Journey Tree** - Browse and manage test journeys by status
- **Workflow Panel** - Step-by-step ARTK workflow guidance with Copilot integration
- **LLKB Panel** - View and manage learned patterns
- **Dashboard** - Interactive overview with stats and quick actions
- **Status Bar** - Quick status indicator with click-to-dashboard
- **CLI Integration** - Full artk-cli and autogen command support

## Installation

### From JetBrains Marketplace (Recommended)

1. In IntelliJ IDEA, go to `Settings` → `Plugins` → `Marketplace`
2. Search for "ARTK"
3. Click `Install`

### Manual Installation

1. Download the `.zip` file from [Releases](https://github.com/your-repo/releases)
2. In IntelliJ IDEA, go to `Settings` → `Plugins` → `⚙️` → `Install Plugin from Disk...`
3. Select the downloaded file

## Compatibility

- IntelliJ IDEA 2024.1+
- WebStorm, PhpStorm, PyCharm, and other JetBrains IDEs

## Building from Source

### Prerequisites

- JDK 17+
- Gradle 8.5+

### Build

```bash
# Build the plugin
./gradlew buildPlugin

# Run tests
./gradlew test

# Verify plugin
./gradlew verifyPlugin

# Run IDE for testing
./gradlew runIde
```

The built plugin will be in `build/distributions/`.

## Development

### Project Structure

```
src/main/kotlin/com/artk/intellij/
├── ARTKPlugin.kt                 # Plugin constants
├── actions/                      # Menu actions
├── model/                        # Data models
├── services/                     # Project and app services
├── settings/                     # Plugin settings
├── statusbar/                    # Status bar widget
├── toolwindow/                   # Tool window and panels
├── listeners/                    # File listeners
├── startup/                      # Startup activities
└── util/                         # Utilities
```

### Key Components

| Component | Description |
|-----------|-------------|
| `ARTKProjectService` | Central service for ARTK state management |
| `InstallerService` | Handles ARTK installation with progress |
| `CLIBridgeService` | Executes ARTK CLI commands |
| `ARTKToolWindowFactory` | Creates the tool window with all panels |
| `ARTKStatusBarWidget` | Shows ARTK status in status bar |
| `ARTKFileListener` | Watches for ARTK file changes |

## License

MIT License - see LICENSE file for details.
