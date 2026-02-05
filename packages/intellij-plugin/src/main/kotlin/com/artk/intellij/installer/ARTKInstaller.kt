package com.artk.intellij.installer

import com.artk.intellij.util.ProcessUtils
import com.google.gson.Gson
import com.google.gson.GsonBuilder
import com.intellij.openapi.progress.ProgressIndicator
import com.intellij.openapi.project.Project
import java.io.File
import java.nio.file.Files
import java.nio.file.Path
import java.nio.file.StandardCopyOption
import java.time.Instant

/**
 * Bundled ARTK Installer
 *
 * Installs ARTK directly from bundled assets without requiring npm registry access.
 * This mirrors the functionality of:
 * - scripts/bootstrap.sh
 * - packages/vscode-extension/src/installer/index.ts
 *
 * Implements the 40-point feature parity checklist from the implementation plan.
 */
class ARTKInstaller(private val project: Project) {

    companion object {
        private val LLKB_VERSION = "1.0.0"
        private val ARTK_VERSION = "1.0.0"
        private val gson: Gson = GsonBuilder().setPrettyPrinting().create()

        // Installation steps with progress percentages
        val INSTALL_STEPS = listOf(
            InstallStep("Creating directory structure...", 5),
            InstallStep("Creating foundation modules...", 10),
            InstallStep("Creating package.json...", 15),
            InstallStep("Creating configuration files...", 20),
            InstallStep("Installing ARTK core libraries...", 30),
            InstallStep("Installing templates...", 35),
            InstallStep("Initializing LLKB...", 40),
            InstallStep("Installing AI prompts and agents...", 45),
            InstallStep("Installing npm dependencies...", 55),
            InstallStep("Setting up browsers...", 85)
        )
    }

    data class InstallStep(val message: String, val progress: Int)

    data class InstallOptions(
        val targetPath: Path,
        val variant: String? = null, // null = auto-detect
        val skipNpm: Boolean = false,
        val skipLlkb: Boolean = false,
        val forceLlkb: Boolean = false,
        val skipBrowsers: Boolean = false,
        val noPrompts: Boolean = false,
        val force: Boolean = false,
        val browserPreference: BrowserDetector.BrowserPreference = BrowserDetector.BrowserPreference.AUTO
    )

    /**
     * Result of variant compatibility validation
     */
    data class ValidationResult(
        val valid: Boolean,
        val error: String? = null,
        val warning: String? = null
    )

    data class InstallResult(
        val success: Boolean,
        val error: String? = null,
        val artkE2ePath: String? = null,
        val backupPath: String? = null,
        val variant: VariantDetector.Variant? = null,
        val browserInfo: BrowserDetector.BrowserInfo? = null
    )

    /**
     * Install ARTK to the target directory
     */
    fun install(
        options: InstallOptions,
        indicator: ProgressIndicator? = null,
        progressCallback: ((String, Double) -> Unit)? = null
    ): InstallResult {
        val targetDir = options.targetPath.toFile()
        val artkE2eDir = File(targetDir, "artk-e2e")

        fun updateProgress(step: InstallStep) {
            indicator?.text = step.message
            indicator?.fraction = step.progress / 100.0
            progressCallback?.invoke(step.message, step.progress / 100.0)
        }

        try {
            // Preserve LLKB patterns before any destructive operations
            var preservedLlkb: File? = null

            // Check for existing installation
            var backupPath: String? = null
            if (artkE2eDir.exists()) {
                if (options.force) {
                    // Preserve LLKB patterns before backup
                    preservedLlkb = preserveLlkbPatterns(artkE2eDir)

                    backupPath = createBackup(artkE2eDir)
                    // Delete existing (but preserve backup)
                    artkE2eDir.deleteRecursively()
                } else {
                    return InstallResult(
                        success = false,
                        error = "ARTK is already installed. Use force option to reinstall."
                    )
                }
            }

            // Detect variant
            val detectionResult = if (options.variant != null && options.variant != "auto") {
                val variant = VariantDetector.parseVariant(options.variant)
                    ?: return InstallResult(false, "Invalid variant: ${options.variant}")

                // Validate variant compatibility with installed Node.js
                val validation = validateVariantCompatibility(variant, targetDir)
                if (!validation.valid) {
                    return InstallResult(false, validation.error)
                }
                // Show warning if present
                validation.warning?.let {
                    indicator?.text = "Warning: $it"
                }

                // Use actual detected Node version for accurate detection result
                val nodeInfo = NodeDetector.detect(targetDir)
                VariantDetector.DetectionResult(variant, nodeInfo?.majorVersion ?: 20, false, "override")
            } else {
                VariantDetector.detect(targetDir)
            }

            // Detect browser with user preference
            val browserInfo = BrowserDetector.detect(options.browserPreference)

            // Step 1: Create directory structure
            updateProgress(INSTALL_STEPS[0])
            createDirectoryStructure(artkE2eDir)

            // Step 2: Create foundation modules
            updateProgress(INSTALL_STEPS[1])
            createFoundationStubs(artkE2eDir)

            // Step 3: Create package.json
            updateProgress(INSTALL_STEPS[2])
            createPackageJson(artkE2eDir, detectionResult.variant)

            // Step 4: Create configuration files
            updateProgress(INSTALL_STEPS[3])
            createTsConfig(artkE2eDir)
            createGitignore(artkE2eDir)
            createConfig(artkE2eDir, targetDir.name, browserInfo.channel,
                if (browserInfo.isSystemBrowser) "system" else "bundled")
            createContext(artkE2eDir, detectionResult, browserInfo, backupPath)

            // Step 5: Install ARTK core libraries (vendor copy)
            updateProgress(INSTALL_STEPS[4])
            installVendorLibs(artkE2eDir, detectionResult.variant)

            // Step 6: Install templates
            updateProgress(INSTALL_STEPS[5])
            installTemplates(artkE2eDir)

            // Step 7: Initialize LLKB
            updateProgress(INSTALL_STEPS[6])
            if (!options.skipLlkb) {
                val llkbDir = File(artkE2eDir, ".artk/llkb")
                if (options.forceLlkb && llkbDir.exists()) {
                    llkbDir.deleteRecursively()
                }
                initializeLLKB(llkbDir)
            }

            // Step 8: Install AI prompts and agents
            updateProgress(INSTALL_STEPS[7])
            if (!options.noPrompts) {
                installPrompts(targetDir, detectionResult.variant)
            }

            // Step 9: Install npm dependencies
            updateProgress(INSTALL_STEPS[8])
            if (!options.skipNpm) {
                val npmResult = runNpmInstall(artkE2eDir, browserInfo.isSystemBrowser)
                if (!npmResult.success) {
                    // Warning only, not fatal
                    indicator?.text = "npm install had issues: ${npmResult.error}"
                }
            }

            // Step 10: Set up browsers
            updateProgress(INSTALL_STEPS[9])
            if (!options.skipBrowsers) {
                installBrowsersWithFallback(artkE2eDir, browserInfo)
            }

            // Restore/merge LLKB patterns after install
            if (preservedLlkb != null) {
                mergeLlkbPatterns(artkE2eDir, preservedLlkb)
                // Clean up preservation file after successful merge
                try {
                    preservedLlkb.delete()
                } catch (e: Exception) {
                    // Cleanup failed - not critical
                }
            }

            // Final step
            indicator?.fraction = 1.0
            indicator?.text = "Installation complete"
            progressCallback?.invoke("Installation complete", 1.0)

            return InstallResult(
                success = true,
                artkE2ePath = artkE2eDir.absolutePath,
                backupPath = backupPath,
                variant = detectionResult.variant,
                browserInfo = browserInfo
            )

        } catch (e: Exception) {
            return InstallResult(
                success = false,
                error = "Installation failed: ${e.message}"
            )
        }
    }

    /**
     * Upgrade ARTK in the target directory
     * Preserves user customizations while updating core files
     */
    fun upgrade(
        targetPath: Path,
        indicator: ProgressIndicator? = null
    ): InstallResult {
        val targetDir = targetPath.toFile()
        val artkE2eDir = File(targetDir, "artk-e2e")

        if (!artkE2eDir.exists()) {
            return InstallResult(
                success = false,
                error = "ARTK is not installed. Cannot upgrade."
            )
        }

        try {
            indicator?.text = "Creating backup..."
            indicator?.fraction = 0.1

            // Backup existing installation
            val backupPath = createBackup(artkE2eDir)

            indicator?.text = "Upgrading vendor libraries..."
            indicator?.fraction = 0.3

            // Re-detect variant from existing context
            val contextFile = File(artkE2eDir, ".artk/context.json")
            val variant = if (contextFile.exists()) {
                try {
                    val content = contextFile.readText()
                    val variantId = Regex(""""variant"\s*:\s*"([^"]+)"""").find(content)?.groupValues?.get(1)
                    VariantDetector.Variant.fromId(variantId ?: "modern-esm") ?: VariantDetector.Variant.MODERN_ESM
                } catch (e: Exception) {
                    VariantDetector.Variant.MODERN_ESM
                }
            } else {
                VariantDetector.Variant.MODERN_ESM
            }

            // Upgrade vendor libs
            installVendorLibs(artkE2eDir, variant)

            indicator?.text = "Updating configuration..."
            indicator?.fraction = 0.6

            // Update context with upgrade info
            if (contextFile.exists()) {
                var content = contextFile.readText()
                content = content.replace(
                    Regex(""""artkVersion"\s*:\s*"[^"]*""""),
                    """"artkVersion": "$ARTK_VERSION""""
                )
                content = content.replace(
                    Regex(""""variantInstalledAt"\s*:\s*"[^"]*""""),
                    """"variantInstalledAt": "${Instant.now()}""""
                )
                contextFile.writeText(content)
            }

            indicator?.text = "Upgrade complete"
            indicator?.fraction = 1.0

            return InstallResult(
                success = true,
                artkE2ePath = artkE2eDir.absolutePath,
                backupPath = backupPath,
                variant = variant
            )

        } catch (e: Exception) {
            return InstallResult(
                success = false,
                error = "Upgrade failed: ${e.message}"
            )
        }
    }

    /**
     * Uninstall ARTK from the target directory
     */
    fun uninstall(targetPath: Path): InstallResult {
        val targetDir = targetPath.toFile()
        val artkE2eDir = File(targetDir, "artk-e2e")

        if (!artkE2eDir.exists()) {
            return InstallResult(
                success = false,
                error = "ARTK is not installed. Nothing to uninstall."
            )
        }

        try {
            // Create backup before uninstall
            val backupPath = createBackup(artkE2eDir)

            // Remove artk-e2e directory
            artkE2eDir.deleteRecursively()

            // Remove .github/prompts/artk.* files
            val promptsDir = File(targetDir, ".github/prompts")
            if (promptsDir.exists()) {
                promptsDir.listFiles()?.filter { it.name.startsWith("artk.") }?.forEach { it.delete() }
            }

            // Remove .github/agents/artk.* files
            val agentsDir = File(targetDir, ".github/agents")
            if (agentsDir.exists()) {
                agentsDir.listFiles()?.filter { it.name.startsWith("artk.") }?.forEach { it.delete() }
            }

            return InstallResult(
                success = true,
                backupPath = backupPath
            )

        } catch (e: Exception) {
            return InstallResult(
                success = false,
                error = "Uninstall failed: ${e.message}"
            )
        }
    }

    /**
     * Create backup of existing installation
     */
    private fun createBackup(artkE2eDir: File): String {
        val backupPath = "${artkE2eDir.absolutePath}.backup-${System.currentTimeMillis()}"
        val backupDir = File(backupPath)
        backupDir.mkdirs()

        // Files to backup
        val filesToBackup = listOf("artk.config.yml", "playwright.config.ts", "tsconfig.json")
        for (file in filesToBackup) {
            val src = File(artkE2eDir, file)
            if (src.exists()) {
                src.copyTo(File(backupDir, file), overwrite = true)
            }
        }

        // Directories to backup (user customizations)
        val dirsToBackup = listOf(".artk", "journeys", "tests", "src/modules")
        for (dir in dirsToBackup) {
            val src = File(artkE2eDir, dir)
            if (src.exists() && src.isDirectory) {
                src.copyRecursively(File(backupDir, dir), overwrite = true)
            }
        }

        return backupPath
    }

    /**
     * Create artk-e2e directory structure
     */
    private fun createDirectoryStructure(artkE2eDir: File) {
        val dirs = listOf(
            "",
            "vendor/artk-core",
            "vendor/artk-core/dist",
            "vendor/artk-core-autogen",
            "vendor/artk-core-autogen/dist",
            "vendor/artk-core-journeys",
            "docs",
            "journeys",
            "journeys/proposed",
            "journeys/defined",
            "journeys/clarified",
            "journeys/implemented",
            ".auth-states",
            ".artk",
            ".artk/llkb",
            ".artk/llkb/patterns",
            ".artk/llkb/history",
            ".artk/logs",
            ".artk/autogen",
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

        for (dir in dirs) {
            File(artkE2eDir, dir).mkdirs()
        }
    }

    /**
     * Create foundation module stubs
     */
    private fun createFoundationStubs(artkE2eDir: File) {
        // Foundation index
        val foundationIndex = """/**
 * Foundation Modules - Core testing infrastructure
 *
 * These modules are populated by /artk.discover-foundation and provide:
 * - Auth: Login flows and storage state management
 * - Navigation: Route helpers and URL builders
 * - Selectors: Locator utilities and data-testid helpers
 * - Data: Test data builders and cleanup
 */

// Exports will be populated by /artk.discover-foundation
export * from './auth';
export * from './navigation';
export * from './selectors';
export * from './data';
"""
        File(artkE2eDir, "src/modules/foundation/index.ts").writeText(foundationIndex)

        // Module stubs
        val modules = listOf("auth", "navigation", "selectors", "data")
        for (module in modules) {
            val stub = """/**
 * Foundation Module: $module
 *
 * This file will be populated by /artk.discover-foundation
 */

// Placeholder export to prevent import errors
export {};
"""
            File(artkE2eDir, "src/modules/foundation/$module/index.ts").writeText(stub)
        }

        // Features index
        val featuresIndex = """/**
 * Feature Modules - Journey-specific page objects
 *
 * These modules are created as Journeys are implemented and provide
 * page objects and flows for specific feature areas.
 */

// Exports will be added as features are implemented
export {};
"""
        File(artkE2eDir, "src/modules/features/index.ts").writeText(featuresIndex)

        // Config env stub
        val configEnv = """/**
 * Environment Configuration Loader
 *
 * Loads environment-specific config from artk.config.yml
 */
import * as fs from 'fs';
import * as path from 'path';

export interface EnvironmentConfig {
  name: string;
  baseUrl: string;
}

export function getBaseUrl(env?: string): string {
  const targetEnv = env || process.env.ARTK_ENV || 'local';

  const configPath = path.join(__dirname, '..', 'artk.config.yml');
  if (fs.existsSync(configPath)) {
    const yaml = require('yaml');
    const config = yaml.parse(fs.readFileSync(configPath, 'utf8'));
    return config.environments?.[targetEnv]?.baseUrl || 'http://localhost:3000';
  }

  const defaults: Record<string, string> = {
    local: 'http://localhost:3000',
    intg: 'https://intg.example.com',
    ctlq: 'https://ctlq.example.com',
    prod: 'https://example.com',
  };

  return defaults[targetEnv] || defaults.local;
}

export function getCurrentEnv(): string {
  return process.env.ARTK_ENV || 'local';
}
"""
        File(artkE2eDir, "config/env.ts").writeText(configEnv)

        // Foundation validation spec
        val validationSpec = """import { test, expect } from '@playwright/test';

test.describe('ARTK Foundation Validation', () => {
  test('baseURL is configured', async ({ baseURL }) => {
    expect(baseURL).toBeTruthy();
    expect(baseURL).toMatch(/^https?:\/\//);
  });

  test('baseURL is not a placeholder', async ({ baseURL }) => {
    expect(baseURL).not.toContain('${'$'}{');
  });

  test('Playwright is correctly installed', async ({ browserName }) => {
    expect(browserName).toBeTruthy();
  });
});
"""
        File(artkE2eDir, "tests/foundation/foundation.validation.spec.ts").writeText(validationSpec)

        // Test tier gitkeeps
        for (tier in listOf("smoke", "release", "regression")) {
            File(artkE2eDir, "tests/$tier/.gitkeep").writeText(
                "# $tier tier tests\n# Tests in this directory should be tagged with @$tier\n"
            )
        }
    }

    /**
     * Create package.json
     */
    private fun createPackageJson(artkE2eDir: File, variant: VariantDetector.Variant) {
        val pkg = mapOf(
            "name" to "artk-e2e",
            "version" to "1.0.0",
            "private" to true,
            "description" to "ARTK End-to-End Tests",
            "scripts" to mapOf(
                "test" to "playwright test",
                "test:smoke" to "playwright test --grep @smoke",
                "test:release" to "playwright test --grep @release",
                "test:regression" to "playwright test --grep @regression",
                "test:validation" to "playwright test --project=validation",
                "test:ui" to "playwright test --ui",
                "report" to "playwright show-report",
                "typecheck" to "tsc --noEmit"
            ),
            "dependencies" to mapOf(
                "yaml" to "^2.3.4"
            ),
            "devDependencies" to mapOf(
                "@artk/core" to "file:./vendor/artk-core",
                "@artk/core-autogen" to "file:./vendor/artk-core-autogen",
                "@playwright/test" to variant.playwrightVersion,
                "@types/node" to "^20.10.0",
                "typescript" to "^5.3.0"
            )
        )

        File(artkE2eDir, "package.json").writeText(gson.toJson(pkg))
    }

    /**
     * Create tsconfig.json
     */
    private fun createTsConfig(artkE2eDir: File) {
        val tsconfig = mapOf(
            "compilerOptions" to mapOf(
                "target" to "ES2022",
                "module" to "CommonJS",
                "moduleResolution" to "Node",
                "lib" to listOf("ES2022", "DOM"),
                "strict" to true,
                "esModuleInterop" to true,
                "allowSyntheticDefaultImports" to true,
                "skipLibCheck" to true,
                "forceConsistentCasingInFileNames" to true,
                "outDir" to "./dist",
                "rootDir" to ".",
                "declaration" to true,
                "resolveJsonModule" to true,
                "baseUrl" to ".",
                "paths" to mapOf(
                    "@artk/core" to listOf("./vendor/artk-core/dist"),
                    "@artk/core/*" to listOf("./vendor/artk-core/dist/*")
                )
            ),
            "include" to listOf("tests/**/*", "src/**/*", "config/**/*", "*.ts"),
            "exclude" to listOf("node_modules", "dist", "vendor")
        )

        File(artkE2eDir, "tsconfig.json").writeText(gson.toJson(tsconfig))
    }

    /**
     * Create .gitignore
     */
    private fun createGitignore(artkE2eDir: File) {
        val gitignore = """# Dependencies
node_modules/

# Build outputs
dist/

# Playwright
test-results/
playwright-report/
playwright/.cache/

# Auth states (contain sensitive tokens)
.auth-states/*.json
!.auth-states/.gitkeep

# ARTK logs and temp files
.artk/logs/
.artk/autogen/
*.log

# OS files
.DS_Store
Thumbs.db

# IDE
.idea/
*.swp
*.swo
"""
        File(artkE2eDir, ".gitignore").writeText(gitignore)

        // .auth-states/.gitkeep
        File(artkE2eDir, ".auth-states/.gitkeep").writeText(
            "# Auth state files are gitignored for security\n"
        )
    }

    /**
     * Create artk.config.yml
     */
    private fun createConfig(
        artkE2eDir: File,
        projectName: String,
        browserChannel: String,
        browserStrategy: String
    ) {
        val timestamp = Instant.now().toString()
        val config = """# ARTK Configuration
# Generated by ARTK IntelliJ Plugin on $timestamp

version: "1.0"

app:
  name: "$projectName"
  type: web
  description: "E2E tests for $projectName"

environments:
  local:
    baseUrl: "http://localhost:3000"
  dev:
    baseUrl: "https://dev.example.com"
  staging:
    baseUrl: "https://staging.example.com"

# Authentication configuration (uncomment and configure as needed)
# auth:
#   provider: "oidc"
#   users:
#     default:
#       username: "${'$'}{TEST_USER}"
#       password: "${'$'}{TEST_PASSWORD}"

# Browser configuration
browsers:
  enabled:
    - chromium
  channel: $browserChannel
  strategy: $browserStrategy
  viewport:
    width: 1280
    height: 720
  headless: true

# LLKB configuration
llkb:
  enabled: true
  minConfidence: 0.7

# Core component versions
core:
  runtime:
    install: vendor
    installDir: vendor/artk-core
  autogen:
    install: vendor
    installDir: vendor/artk-core-autogen
  journeys:
    install: vendor
    installDir: vendor/artk-core-journeys
"""
        File(artkE2eDir, "artk.config.yml").writeText(config)
    }

    /**
     * Create .artk/context.json
     */
    private fun createContext(
        artkE2eDir: File,
        detectionResult: VariantDetector.DetectionResult,
        browserInfo: BrowserDetector.BrowserInfo,
        backupPath: String?
    ) {
        val context = mutableMapOf(
            "version" to "1.0",
            "artkVersion" to ARTK_VERSION,
            "variant" to detectionResult.variant.id,
            "variantInstalledAt" to Instant.now().toString(),
            "nodeVersion" to detectionResult.nodeVersion.toString(),
            "playwrightVersion" to detectionResult.variant.playwrightVersion.removePrefix("^"),
            "moduleSystem" to detectionResult.variant.moduleSystem,
            "templateVariant" to if (detectionResult.isEsm) "esm" else "commonjs",
            "installedAt" to Instant.now().toString(),
            "installMethod" to "intellij-plugin",
            "overrideUsed" to (detectionResult.source == "override"),
            "projectRoot" to artkE2eDir.parentFile.absolutePath,
            "artkRoot" to artkE2eDir.absolutePath,
            "harnessRoot" to artkE2eDir.absolutePath,
            "next_suggested" to "/artk.init-playbook",
            "browser" to mapOf(
                "channel" to browserInfo.channel,
                "version" to browserInfo.version,
                "path" to browserInfo.path,
                "detected_at" to Instant.now().toString()
            )
        )

        if (backupPath != null) {
            context["previousInstallBackup"] = backupPath
        }

        File(artkE2eDir, ".artk/context.json").writeText(gson.toJson(context))
    }

    /**
     * Install vendor libraries (artk-core, autogen, journeys)
     * Tries to extract from bundled resources first, falls back to stubs
     */
    private fun installVendorLibs(artkE2eDir: File, variant: VariantDetector.Variant) {
        val coreDest = File(artkE2eDir, "vendor/artk-core")
        val autogenDest = File(artkE2eDir, "vendor/artk-core-autogen")
        val journeysDest = File(artkE2eDir, "vendor/artk-core-journeys")

        // Try to extract bundled assets first
        val hasBundledCore = extractBundledAssets("assets/artk-core", coreDest)
        val hasBundledAutogen = extractBundledAssets("assets/artk-autogen", autogenDest)

        // Create AI protection markers (always)
        createAiProtectionMarkers(coreDest, variant)
        createAiProtectionMarkers(autogenDest, variant, isAutogen = true)

        // If no bundled assets, create stubs
        if (!hasBundledCore) {
            createVendorStubs(coreDest, "@artk/core")
        }
        if (!hasBundledAutogen) {
            createVendorStubs(autogenDest, "@artk/core-autogen")
        }

        // Journeys protection markers
        journeysDest.mkdirs()
        File(journeysDest, "READONLY.md").writeText(
            "# ⚠️ DO NOT MODIFY THIS DIRECTORY\n\nThis directory contains artk-core-journeys.\n"
        )
        File(journeysDest, ".ai-ignore").writeText("# AI agents should not modify\n*\n")
    }

    /**
     * Extract bundled assets from plugin resources
     * @return true if assets were extracted, false if not available
     */
    private fun extractBundledAssets(resourcePath: String, destDir: File): Boolean {
        val classLoader = this::class.java.classLoader
        val resourceUrl = classLoader.getResource(resourcePath)

        if (resourceUrl == null) {
            // Bundled assets not available (development mode)
            return false
        }

        try {
            destDir.mkdirs()

            // List and copy all resources
            val resources = classLoader.getResources(resourcePath)
            while (resources.hasMoreElements()) {
                val url = resources.nextElement()
                extractResourceRecursively(url, resourcePath, destDir)
            }

            // Verify extraction was successful
            return File(destDir, "dist/index.js").exists() ||
                   File(destDir, "package.json").exists()
        } catch (e: Exception) {
            // Extraction failed, will fall back to stubs
            return false
        }
    }

    /**
     * Recursively extract resources from a URL
     */
    private fun extractResourceRecursively(url: java.net.URL, basePath: String, destDir: File) {
        val connection = url.openConnection()

        if (connection is java.net.JarURLConnection) {
            // Extract from JAR - use() ensures proper resource cleanup
            connection.jarFile.use { jarFile ->
                val entries = jarFile.entries()

                while (entries.hasMoreElements()) {
                    val entry = entries.nextElement()
                    if (entry.name.startsWith(basePath) && !entry.isDirectory) {
                        val relativePath = entry.name.removePrefix("$basePath/")
                        val destFile = File(destDir, relativePath)
                        destFile.parentFile?.mkdirs()

                        try {
                            jarFile.getInputStream(entry).use { input ->
                                destFile.outputStream().use { output ->
                                    input.copyTo(output)
                                }
                            }
                        } catch (e: Exception) {
                            // Log but continue - individual file failures shouldn't stop extraction
                            // Other files may still be usable
                        }
                    }
                }
            }
        } else {
            // Extract from file system (development mode)
            try {
                // Only handle file:// URLs
                if (url.protocol != "file") {
                    return
                }
                val sourceDir = File(url.toURI())
                if (sourceDir.isDirectory) {
                    sourceDir.walkTopDown().forEach { file ->
                        if (file.isFile) {
                            val relativePath = file.relativeTo(sourceDir).path
                            val destFile = File(destDir, relativePath)
                            destFile.parentFile?.mkdirs()
                            try {
                                file.copyTo(destFile, overwrite = true)
                            } catch (e: Exception) {
                                // Log but continue
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                // Non-fatal: will fall back to stubs
            }
        }
    }

    /**
     * Create AI protection markers for vendor directory
     */
    private fun createAiProtectionMarkers(destDir: File, variant: VariantDetector.Variant, isAutogen: Boolean = false) {
        destDir.mkdirs()

        // Create READONLY.md
        val packageName = if (isAutogen) "@artk/core-autogen" else "@artk/core"
        val readme = """# ⚠️ DO NOT MODIFY THIS DIRECTORY

## Variant Information

| Property | Value |
|----------|-------|
| **Package** | $packageName |
| **Variant** | ${variant.id} |
| **Node.js Version** | ${variant.nodeRange} |
| **Playwright Version** | ${variant.playwrightVersion} |
| **Module System** | ${variant.moduleSystem} |
| **Installed At** | ${Instant.now()} |
| **Install Method** | intellij-plugin |

**DO NOT modify files in this directory.**

If you need different functionality:
1. Check if the correct variant is installed: `cat .artk/context.json | jq .variant`
2. Reinstall with correct variant: `artk init --force`
3. Check feature availability: `cat vendor/artk-core/variant-features.json`

---

*Generated by ARTK IntelliJ Plugin v1.0.0*
"""
        File(destDir, "READONLY.md").writeText(readme)

        // Create .ai-ignore
        File(destDir, ".ai-ignore").writeText(
            "# AI agents should not modify files in this directory\n# This is vendored code managed by ARTK\n\n*\n"
        )

        // Create variant-features.json (only for core, not autogen)
        if (!isAutogen) {
            val features = VariantDetector.getVariantFeatures(variant)
            val featuresJson = mapOf(
                "variant" to variant.id,
                "playwrightVersion" to variant.playwrightVersion.removePrefix("^"),
                "moduleSystem" to variant.moduleSystem,
                "generatedAt" to Instant.now().toString(),
                "features" to features.mapValues { (_, info) ->
                    if (info.alternative != null) {
                        mapOf("available" to info.available, "alternative" to info.alternative)
                    } else {
                        mapOf("available" to info.available)
                    }
                }
            )
            File(destDir, "variant-features.json").writeText(gson.toJson(featuresJson))
        }
    }

    /**
     * Create stub files when bundled assets are not available
     */
    private fun createVendorStubs(destDir: File, packageName: String) {
        destDir.mkdirs()

        // Create stub package.json
        val vendorPkg = mapOf(
            "name" to packageName,
            "version" to ARTK_VERSION,
            "main" to "dist/index.js",
            "types" to "dist/index.d.ts",
            "_stub" to true,
            "_note" to "This is a stub. Run 'npm install' in artk-e2e to get the full library."
        )
        File(destDir, "package.json").writeText(gson.toJson(vendorPkg))

        // Create dist/index.js stub
        File(destDir, "dist").mkdirs()
        File(destDir, "dist/index.js").writeText(
            "// $packageName stub - run 'npm install' in artk-e2e to get full library\n" +
            "// This stub was created because bundled assets were not available\n" +
            "module.exports = {};\n"
        )
        File(destDir, "dist/index.d.ts").writeText(
            "// $packageName type definitions stub\nexport {};\n"
        )
    }

    /**
     * Install Playwright config template
     */
    private fun installTemplates(artkE2eDir: File) {
        val playwrightConfig = """import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['list']
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'validation',
      testDir: './tests/foundation',
      testMatch: '**/*.validation.spec.ts',
    },
  ],
});
"""
        File(artkE2eDir, "playwright.config.ts").writeText(playwrightConfig)
    }

    /**
     * Initialize LLKB structure
     */
    private fun initializeLLKB(llkbDir: File) {
        llkbDir.mkdirs()
        File(llkbDir, "patterns").mkdirs()
        File(llkbDir, "history").mkdirs()

        // config.yml
        val configYml = """# LLKB Configuration
# Generated by ARTK IntelliJ Plugin
version: "$LLKB_VERSION"
enabled: true

extraction:
  minOccurrences: 2
  predictiveExtraction: true
  confidenceThreshold: 0.7
  maxPredictivePerJourney: 3
  maxPredictivePerDay: 10
  minLinesForExtraction: 3
  similarityThreshold: 0.8

retention:
  maxLessonAge: 90
  minSuccessRate: 0.6
  archiveUnused: 30

history:
  retentionDays: 365

injection:
  prioritizeByConfidence: true

scopes:
  universal: true
  frameworkSpecific: true
  appSpecific: true

overrides:
  allowUserOverride: true
  logOverrides: true
  flagAfterOverrides: 3
"""
        File(llkbDir, "config.yml").writeText(configYml)

        // lessons.json
        val lessons = mapOf(
            "version" to LLKB_VERSION,
            "lastUpdated" to Instant.now().toString(),
            "lessons" to emptyList<Any>(),
            "archived" to emptyList<Any>(),
            "globalRules" to emptyList<Any>(),
            "appQuirks" to emptyList<Any>()
        )
        File(llkbDir, "lessons.json").writeText(gson.toJson(lessons))

        // components.json
        val components = mapOf(
            "version" to LLKB_VERSION,
            "lastUpdated" to Instant.now().toString(),
            "components" to emptyList<Any>(),
            "componentsByCategory" to mapOf(
                "selector" to emptyList<Any>(),
                "timing" to emptyList<Any>(),
                "auth" to emptyList<Any>(),
                "data" to emptyList<Any>(),
                "assertion" to emptyList<Any>(),
                "navigation" to emptyList<Any>(),
                "ui-interaction" to emptyList<Any>()
            ),
            "componentsByScope" to mapOf(
                "universal" to emptyList<Any>(),
                "framework:angular" to emptyList<Any>(),
                "framework:react" to emptyList<Any>(),
                "framework:vue" to emptyList<Any>(),
                "framework:ag-grid" to emptyList<Any>(),
                "app-specific" to emptyList<Any>()
            )
        )
        File(llkbDir, "components.json").writeText(gson.toJson(components))

        // analytics.json
        val analytics = mapOf(
            "version" to LLKB_VERSION,
            "lastUpdated" to Instant.now().toString(),
            "overview" to mapOf(
                "totalLessons" to 0,
                "totalComponents" to 0,
                "totalApplications" to 0,
                "lastAnalyzed" to null
            ),
            "lessonStats" to mapOf(
                "byCategory" to emptyMap<String, Any>(),
                "byConfidence" to mapOf("high" to 0, "medium" to 0, "low" to 0),
                "trending" to emptyList<Any>()
            ),
            "componentStats" to mapOf(
                "byCategory" to emptyMap<String, Any>(),
                "mostUsed" to emptyList<Any>(),
                "recentlyAdded" to emptyList<Any>()
            ),
            "impactMetrics" to mapOf(
                "avgIterationsBeforeLLKB" to 0,
                "avgIterationsAfterLLKB" to 0,
                "timesSaved" to 0
            )
        )
        File(llkbDir, "analytics.json").writeText(gson.toJson(analytics))

        // learned-patterns.json
        val patterns = mapOf(
            "version" to LLKB_VERSION,
            "lastUpdated" to Instant.now().toString(),
            "patterns" to emptyList<Any>()
        )
        File(llkbDir, "learned-patterns.json").writeText(gson.toJson(patterns))

        // Pattern files
        val patternFiles = listOf("selectors.json", "timing.json", "assertions.json", "auth.json", "data.json")
        for (filename in patternFiles) {
            val content = mapOf("version" to LLKB_VERSION, "patterns" to emptyList<Any>())
            File(llkbDir, "patterns/$filename").writeText(gson.toJson(content))
        }
    }

    /**
     * Install AI prompts and agents
     */
    private fun installPrompts(targetDir: File, variant: VariantDetector.Variant) {
        val promptsDir = File(targetDir, ".github/prompts")
        val agentsDir = File(targetDir, ".github/agents")
        promptsDir.mkdirs()
        agentsDir.mkdirs()

        // Create variant-info prompt
        createVariantInfoPrompt(promptsDir, variant)

        // Create stub prompts that delegate to agents
        val promptConfigs = listOf(
            PromptConfig("init-playbook", "Initialize ARTK playbook and configuration"),
            PromptConfig("discover-foundation", "Discover and build foundation modules"),
            PromptConfig("journey-propose", "Propose new test journeys from discovery"),
            PromptConfig("journey-define", "Define journey structure and acceptance criteria"),
            PromptConfig("journey-clarify", "Clarify journey with deterministic execution detail"),
            PromptConfig("journey-implement", "Implement journey as Playwright tests")
        )

        for (config in promptConfigs) {
            createStubPrompt(promptsDir, config)
            createAgentFile(agentsDir, config)
        }
    }

    private data class PromptConfig(val name: String, val description: String)

    private fun createStubPrompt(promptsDir: File, config: PromptConfig) {
        val content = """---
name: artk.${config.name}
description: "${config.description}"
agent: artk.${config.name}
---

# ARTK ${config.name.replace("-", " ").replaceFirstChar { it.uppercase() }}

This prompt delegates to the `@artk.${config.name}` agent.

To use this prompt, invoke it with `/artk.${config.name}` in GitHub Copilot Chat.
"""
        File(promptsDir, "artk.${config.name}.prompt.md").writeText(content)
    }

    private fun createAgentFile(agentsDir: File, config: PromptConfig) {
        val content = """---
name: artk.${config.name}
description: "${config.description}"
---

# ARTK ${config.name.replace("-", " ").replaceFirstChar { it.uppercase() }} Agent

## Overview

This agent handles the `${config.name}` phase of the ARTK workflow.

## Instructions

${getAgentInstructions(config.name)}

## Handoffs

When this task is complete, the following prompts may be useful:
${getHandoffs(config.name)}
"""
        File(agentsDir, "artk.${config.name}.agent.md").writeText(content)
    }

    private fun getAgentInstructions(name: String): String = when (name) {
        "init-playbook" -> """
1. Read the existing ARTK configuration from `artk-e2e/artk.config.yml`
2. Verify the installation is complete by checking `.artk/context.json`
3. Generate project-specific Copilot instructions based on the detected variant
4. Create or update the playbook document in `artk-e2e/docs/playbook.md`
"""
        "discover-foundation" -> """
1. Analyze the target application's route structure
2. Identify authentication patterns and user roles
3. Detect UI frameworks and component libraries
4. Build foundation modules in `src/modules/foundation/`
5. Initialize LLKB if not already done
"""
        "journey-propose" -> """
1. Read discovery reports from `artk-e2e/reports/discovery/`
2. Identify high-value test scenarios based on user flows
3. Generate proposed journeys in `artk-e2e/journeys/proposed/`
4. Create journey files with proper frontmatter schema
"""
        "journey-define" -> """
1. Read a proposed journey file
2. Add structured acceptance criteria
3. Define the actor, scope, and tier
4. Move the journey to `artk-e2e/journeys/defined/`
"""
        "journey-clarify" -> """
1. Read a defined journey file
2. Add deterministic execution steps
3. Specify exact selectors and data requirements
4. Move the journey to `artk-e2e/journeys/clarified/`
"""
        "journey-implement" -> """
1. Verify LLKB is initialized
2. Read a clarified journey file
3. Generate Playwright test code using AutoGen patterns
4. Create test file in appropriate tier directory
5. Update journey status to `implemented`
6. Move to `artk-e2e/journeys/implemented/`
"""
        else -> "Follow the standard ARTK workflow for this phase."
    }

    private fun getHandoffs(name: String): String = when (name) {
        "init-playbook" -> "- `/artk.discover-foundation` - Build foundation modules"
        "discover-foundation" -> "- `/artk.journey-propose` - Propose test journeys"
        "journey-propose" -> "- `/artk.journey-define` - Define a proposed journey"
        "journey-define" -> "- `/artk.journey-clarify` - Clarify the journey"
        "journey-clarify" -> "- `/artk.journey-implement` - Implement as tests"
        "journey-implement" -> "- `/artk.journey-propose` - Propose more journeys\n- `/artk.discover-foundation` - Expand foundation modules"
        else -> "- See ARTK documentation for next steps"
    }

    /**
     * Create variant-info.prompt.md
     */
    private fun createVariantInfoPrompt(promptsDir: File, variant: VariantDetector.Variant) {
        val isLegacy = variant == VariantDetector.Variant.LEGACY_14 ||
                variant == VariantDetector.Variant.LEGACY_16
        val isEsm = variant == VariantDetector.Variant.MODERN_ESM

        val content = buildString {
            appendLine("---")
            appendLine("name: artk.variant-info")
            appendLine("description: \"Variant-specific Copilot instructions for ARTK tests\"")
            appendLine("---")
            appendLine()
            appendLine("# ARTK Variant Information")
            appendLine()
            appendLine("## Installed Variant: ${variant.id}")
            appendLine()
            appendLine("| Property | Value |")
            appendLine("|----------|-------|")
            appendLine("| **Display Name** | ${variant.displayName} |")
            appendLine("| **Node.js Range** | ${variant.nodeRange} |")
            appendLine("| **Playwright Version** | ${variant.playwrightVersion} |")
            appendLine("| **Module System** | ${variant.moduleSystem} |")
            appendLine()
            appendLine("## Critical: Vendor Directory Rules")
            appendLine()
            appendLine("**DO NOT modify files in `artk-e2e/vendor/artk-core/`.**")
            appendLine()
            appendLine("These directories contain vendored ARTK code that:")
            appendLine("1. Is automatically managed by ARTK CLI/bootstrap")
            appendLine("2. Will be overwritten on upgrades")
            appendLine("3. Is built for a specific Node.js version and module system")
            appendLine()

            if (isLegacy) {
                appendLine("## Legacy Variant Limitations")
                appendLine()
                appendLine("This project uses a legacy ARTK variant with limited features.")
                appendLine("Always check `variant-features.json` before using modern Playwright APIs.")
                appendLine()
            }

            appendLine("## Import Patterns (${if (isEsm) "ESM" else "CommonJS"})")
            appendLine()
            appendLine("```typescript")
            appendLine("import { test, expect } from '@playwright/test';")
            appendLine("import { loadConfig } from '@artk/core/config';")
            appendLine("```")
        }

        File(promptsDir, "artk.variant-info.prompt.md").writeText(content)
    }

    /**
     * Run npm install
     */
    private fun runNpmInstall(artkE2eDir: File, skipBrowserDownload: Boolean): ProcessUtils.ProcessResult {
        val env = if (skipBrowserDownload) {
            mapOf("PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD" to "1")
        } else emptyMap()

        // Use execute() instead of executeNpm() to pass environment variables
        val command = if (ProcessUtils.isWindows) {
            listOf("cmd", "/c", "npm", "install")
        } else {
            listOf("npm", "install")
        }

        return ProcessUtils.execute(command, artkE2eDir, 300, env)
    }

    /**
     * Install browsers with fallback logic
     */
    private fun installBrowsersWithFallback(
        artkE2eDir: File,
        detectedBrowser: BrowserDetector.BrowserInfo
    ) {
        // If system browser detected, just update config
        if (detectedBrowser.isSystemBrowser) {
            updatePlaywrightConfigChannel(artkE2eDir, detectedBrowser.channel)
            return
        }

        // Try installing bundled chromium
        val result = ProcessUtils.executeNpx(
            listOf("playwright", "install", "chromium"),
            artkE2eDir,
            300
        )

        if (!result.success) {
            // Browser install failed - tests may not work
            // This is logged but not fatal
        }
    }

    private fun updatePlaywrightConfigChannel(artkE2eDir: File, channel: String) {
        val configFile = File(artkE2eDir, "playwright.config.ts")
        if (!configFile.exists()) return

        var content = configFile.readText()

        // Update or add channel
        content = if (content.contains("channel:")) {
            content.replace(
                Regex("""channel:\s*['"][^'"]*['"]"""),
                "channel: '$channel'"
            )
        } else {
            content.replace(
                Regex("""(use:\s*\{)"""),
                "$1\n    channel: '$channel',"
            )
        }

        configFile.writeText(content)
    }

    // ========================================
    // Node.js Version Validation
    // ========================================

    /**
     * Validate that the selected variant is compatible with the installed Node.js version
     */
    private fun validateVariantCompatibility(
        requestedVariant: VariantDetector.Variant,
        targetPath: File
    ): ValidationResult {
        val nodeInfo = NodeDetector.detect(targetPath)
        val actualNodeVersion = nodeInfo?.majorVersion

        // If we can't detect Node, allow the install with a warning
        if (actualNodeVersion == null) {
            return ValidationResult(
                valid = true,
                warning = "Could not detect Node.js version. Please ensure Node.js ${getMinNodeVersion(requestedVariant)}+ is installed."
            )
        }

        val minRequired = getMinNodeVersion(requestedVariant)

        if (actualNodeVersion < minRequired) {
            return ValidationResult(
                valid = false,
                error = "Node.js $actualNodeVersion is incompatible with variant '${requestedVariant.id}'. " +
                        "Required: Node.js $minRequired+. " +
                        "Options: 1) Upgrade Node.js, 2) Select a compatible variant (e.g., legacy-$actualNodeVersion)"
            )
        }

        return ValidationResult(valid = true)
    }

    /**
     * Get minimum Node.js version required for a variant
     */
    private fun getMinNodeVersion(variant: VariantDetector.Variant): Int = when (variant) {
        VariantDetector.Variant.MODERN_ESM,
        VariantDetector.Variant.MODERN_CJS -> 18
        VariantDetector.Variant.LEGACY_16 -> 16
        VariantDetector.Variant.LEGACY_14 -> 14
    }

    // ========================================
    // LLKB Pattern Preservation
    // ========================================

    /**
     * Data class for learned patterns JSON structure
     * Uses default values for robustness against schema changes
     */
    private data class LearnedPattern(
        val normalizedText: String = "",
        val originalText: String = "",
        val irPrimitive: String = "",
        val confidence: Double = 0.0,
        val successCount: Int = 0,
        val failCount: Int = 0,
        val sourceJourneys: List<String> = emptyList()
    ) {
        fun isValid(): Boolean = normalizedText.isNotEmpty()
    }

    private data class LearnedPatterns(
        val version: String = LLKB_VERSION,
        val lastUpdated: String = "",
        val patterns: List<LearnedPattern> = emptyList()
    ) {
        fun isValid(): Boolean = patterns.all { it.isValid() }
    }

    /**
     * Safely parse learned patterns JSON with fallback
     */
    private fun parseLearnedPatterns(jsonContent: String): LearnedPatterns? {
        return try {
            val parsed = gson.fromJson(jsonContent, LearnedPatterns::class.java)
            if (parsed != null && parsed.isValid()) {
                parsed
            } else {
                null
            }
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Preserve LLKB learned patterns before destructive operations
     * @return Path to preserved file, or null if nothing to preserve
     */
    private fun preserveLlkbPatterns(artkE2eDir: File): File? {
        val llkbDir = File(artkE2eDir, ".artk/llkb")
        val learnedPatterns = File(llkbDir, "learned-patterns.json")

        if (!learnedPatterns.exists()) return null

        try {
            // Create dedicated preservation location (outside artk-e2e)
            val preserveDir = File(artkE2eDir.parentFile, ".artk-preserved")
            preserveDir.mkdirs()

            // Clean up old preservation files (keep only last 7 days)
            cleanupOldPreservations(preserveDir)

            val timestamp = System.currentTimeMillis()
            val preservedFile = File(preserveDir, "learned-patterns-$timestamp.json")

            learnedPatterns.copyTo(preservedFile, overwrite = true)

            return preservedFile
        } catch (e: Exception) {
            // Preservation failed - continue without it
            return null
        }
    }

    /**
     * Merge preserved LLKB patterns after reinstall
     */
    private fun mergeLlkbPatterns(artkE2eDir: File, preservedFile: File?) {
        if (preservedFile == null || !preservedFile.exists()) return

        val newLlkbDir = File(artkE2eDir, ".artk/llkb")
        val newLearnedPatterns = File(newLlkbDir, "learned-patterns.json")

        try {
            if (!newLearnedPatterns.exists()) {
                // New install has no patterns - just copy preserved
                preservedFile.copyTo(newLearnedPatterns, overwrite = true)
                return
            }

            // Parse with validation
            val preserved = parseLearnedPatterns(preservedFile.readText())
            val current = parseLearnedPatterns(newLearnedPatterns.readText())

            when {
                preserved == null && current == null -> {
                    // Both invalid - nothing to merge
                }
                preserved == null -> {
                    // Preserved is invalid, keep current
                }
                current == null -> {
                    // Current is invalid, use preserved
                    preservedFile.copyTo(newLearnedPatterns, overwrite = true)
                }
                else -> {
                    // Both valid - merge
                    val merged = mergePatternLists(preserved, current)
                    newLearnedPatterns.writeText(gson.toJson(merged))
                }
            }

        } catch (e: Exception) {
            // Merge failed - preserve original as fallback
            try {
                preservedFile.copyTo(
                    File(newLlkbDir, "learned-patterns-preserved.json"),
                    overwrite = true
                )
            } catch (e2: Exception) {
                // Fallback also failed - nothing we can do
            }
        }
    }

    /**
     * Merge two pattern lists using weighted confidence averaging
     */
    private fun mergePatternLists(old: LearnedPatterns, new: LearnedPatterns): LearnedPatterns {
        val mergedPatterns = mutableMapOf<String, LearnedPattern>()

        // Add old patterns
        for (pattern in old.patterns) {
            mergedPatterns[pattern.normalizedText] = pattern
        }

        // Merge new patterns
        for (pattern in new.patterns) {
            val existing = mergedPatterns[pattern.normalizedText]
            if (existing != null) {
                // Update confidence using weighted average
                val totalCount = existing.successCount + pattern.successCount
                val mergedConfidence = if (totalCount > 0) {
                    (existing.confidence * existing.successCount +
                            pattern.confidence * pattern.successCount) / totalCount
                } else {
                    (existing.confidence + pattern.confidence) / 2
                }

                mergedPatterns[pattern.normalizedText] = pattern.copy(
                    confidence = mergedConfidence,
                    successCount = existing.successCount + pattern.successCount,
                    failCount = existing.failCount + pattern.failCount,
                    sourceJourneys = (existing.sourceJourneys + pattern.sourceJourneys).distinct()
                )
            } else {
                mergedPatterns[pattern.normalizedText] = pattern
            }
        }

        return LearnedPatterns(
            version = new.version,
            lastUpdated = Instant.now().toString(),
            patterns = mergedPatterns.values.toList()
        )
    }

    /**
     * Clean up old preservation files (keep only last 7 days)
     */
    private fun cleanupOldPreservations(preserveDir: File) {
        val sevenDaysAgo = System.currentTimeMillis() - (7 * 24 * 60 * 60 * 1000)

        preserveDir.listFiles()
            ?.filter { it.name.startsWith("learned-patterns-") }
            ?.filter { it.lastModified() < sevenDaysAgo }
            ?.forEach { it.delete() }
    }
}
