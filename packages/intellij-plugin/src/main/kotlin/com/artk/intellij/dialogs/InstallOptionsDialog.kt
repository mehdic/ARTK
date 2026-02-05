package com.artk.intellij.dialogs

import com.artk.intellij.installer.BrowserDetector
import com.artk.intellij.installer.VariantDetector
import com.artk.intellij.services.InstallOptions
import com.intellij.openapi.project.Project
import com.intellij.openapi.ui.ComboBox
import com.intellij.openapi.ui.DialogWrapper
import com.intellij.ui.components.JBCheckBox
import com.intellij.ui.components.JBLabel
import com.intellij.ui.dsl.builder.panel
import com.intellij.ui.dsl.builder.bindSelected
import com.intellij.ui.dsl.builder.bindItem
import java.awt.Dimension
import java.io.File
import javax.swing.JComponent

/**
 * Dialog for configuring ARTK installation options
 */
class InstallOptionsDialog(
    private val project: Project
) : DialogWrapper(project) {

    private var skipNpm = false
    private var skipLlkb = false
    private var skipBrowsers = false
    private var force = false
    private var selectedVariant: String? = null
    private var browserPreference: BrowserDetector.BrowserPreference = BrowserDetector.BrowserPreference.AUTO

    private val detectedVariant: VariantDetector.Variant?
    private val variants = VariantDetector.Variant.entries.toList()
    private val browserPreferences = BrowserDetector.BrowserPreference.entries.toList()

    init {
        title = "Install ARTK"
        setOKButtonText("Install")
        setCancelButtonText("Cancel")

        // Detect variant based on project
        val basePath = project.basePath
        detectedVariant = if (basePath != null) {
            VariantDetector.detect(File(basePath))
        } else {
            VariantDetector.Variant.MODERN_ESM
        }

        init()
    }

    override fun createCenterPanel(): JComponent {
        return panel {
            group("Installation Options") {
                row {
                    label("Configure how ARTK will be installed in your project.")
                }

                separator()

                row("Variant:") {
                    val variantItems = listOf("Auto-detect (${detectedVariant?.displayName ?: "Modern ESM"})") +
                            variants.map { it.displayName }

                    comboBox(variantItems)
                        .comment("Select the Node.js/module variant for your project")
                        .applyToComponent {
                            selectedIndex = 0
                            addActionListener {
                                selectedVariant = if (selectedIndex == 0) {
                                    null // Auto-detect
                                } else {
                                    variants[selectedIndex - 1].id
                                }
                            }
                        }
                }

                row("Browser:") {
                    val browserItems = listOf(
                        "Auto-detect (Edge > Chrome > Chromium)",
                        "Prefer Edge",
                        "Prefer Chrome",
                        "Bundled Chromium"
                    )

                    comboBox(browserItems)
                        .comment("Which browser to use for Playwright tests")
                        .applyToComponent {
                            selectedIndex = 0
                            addActionListener {
                                browserPreference = when (selectedIndex) {
                                    0 -> BrowserDetector.BrowserPreference.AUTO
                                    1 -> BrowserDetector.BrowserPreference.EDGE
                                    2 -> BrowserDetector.BrowserPreference.CHROME
                                    3 -> BrowserDetector.BrowserPreference.CHROMIUM
                                    else -> BrowserDetector.BrowserPreference.AUTO
                                }
                            }
                        }
                }

                row {
                    checkBox("Skip npm install")
                        .comment("Don't run npm install after setup")
                        .applyToComponent {
                            addActionListener { skipNpm = isSelected }
                        }
                }

                row {
                    checkBox("Skip LLKB initialization")
                        .comment("Don't initialize the Lessons Learned Knowledge Base")
                        .applyToComponent {
                            addActionListener { skipLlkb = isSelected }
                        }
                }

                row {
                    checkBox("Skip browser installation")
                        .comment("Don't install Playwright browsers")
                        .applyToComponent {
                            addActionListener { skipBrowsers = isSelected }
                        }
                }

                separator()

                row {
                    checkBox("Force reinstall")
                        .comment("Overwrite existing installation (backup will be created)")
                        .applyToComponent {
                            addActionListener { force = isSelected }
                        }
                }
            }

            group("Detected Environment") {
                row("Node.js:") {
                    val nodeInfo = project.basePath?.let {
                        com.artk.intellij.installer.NodeDetector.detect(File(it))
                    }
                    label(nodeInfo?.let { "v${it.version} (${it.source})" } ?: "Not detected")
                }

                row("Variant:") {
                    label(detectedVariant?.let { "${it.displayName} (${it.nodeRange})" } ?: "Unknown")
                }

                row("Playwright:") {
                    label(detectedVariant?.playwrightVersion ?: "Unknown")
                }

                row("Browser:") {
                    val browserInfo = com.artk.intellij.installer.BrowserDetector.detect()
                    label("${browserInfo.channel}${browserInfo.version?.let { " v$it" } ?: ""}")
                }
            }
        }.apply {
            preferredSize = Dimension(500, 400)
        }
    }

    /**
     * Get the configured install options
     */
    fun getInstallOptions(): InstallOptions {
        return InstallOptions(
            skipNpm = skipNpm,
            skipLlkb = skipLlkb,
            skipBrowsers = skipBrowsers,
            force = force,
            variant = selectedVariant,
            browserPreference = browserPreference
        )
    }

    companion object {
        /**
         * Show the dialog and return InstallOptions if user clicks Install, null if cancelled
         */
        fun showAndGet(project: Project): InstallOptions? {
            val dialog = InstallOptionsDialog(project)
            return if (dialog.showAndGet()) {
                dialog.getInstallOptions()
            } else {
                null
            }
        }
    }
}
