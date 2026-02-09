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
        "org.jetbrains.plugins.terminal"
    ))
}

dependencies {
    implementation("com.google.code.gson:gson:2.10.1")
    implementation("org.yaml:snakeyaml:2.2")

    // JUnit 5 for unit tests (file parsing, pure functions)
    testImplementation("org.junit.jupiter:junit-jupiter:5.10.1")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks {
    // Set JVM compatibility
    withType<JavaCompile> {
        sourceCompatibility = "17"
        targetCompatibility = "17"
    }
    withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile> {
        kotlinOptions.jvmTarget = "17"
    }

    patchPluginXml {
        sinceBuild.set("241")
        // M3 fix: Remove untilBuild to allow future IntelliJ versions
        // Plugin will be tested with new versions and updated if API breaks
        untilBuild.set("")  // Empty string removes the constraint
        changeNotes.set("""
            <h3>1.0.0</h3>
            <ul>
                <li>Initial release</li>
                <li>Project detection and context management</li>
                <li>Journey tree view and management</li>
                <li>LLKB integration</li>
                <li>Workflow guidance</li>
                <li>Dashboard with webview</li>
                <li>Status bar widget</li>
                <li>Full CLI integration</li>
            </ul>
        """.trimIndent())
    }

    signPlugin {
        certificateChain.set(System.getenv("CERTIFICATE_CHAIN"))
        privateKey.set(System.getenv("PRIVATE_KEY"))
        password.set(System.getenv("PRIVATE_KEY_PASSWORD"))
    }

    publishPlugin {
        token.set(System.getenv("PUBLISH_TOKEN"))
    }

    buildSearchableOptions {
        enabled = false
    }

    test {
        useJUnitPlatform()
    }

    // Bundle ARTK assets into plugin resources
    register<Copy>("bundleArtkAssets") {
        description = "Bundle ARTK core assets into plugin resources"
        group = "build"

        val assetsDir = file("src/main/resources/assets")

        // Copy @artk/core
        from("../../core/typescript/dist") {
            into("artk-core/dist")
        }
        from("../../core/typescript/package.json") {
            into("artk-core")
        }

        // Copy @artk/autogen
        from("../../core/typescript/autogen/dist") {
            into("artk-autogen/dist")
        }
        from("../../core/typescript/autogen/package.json") {
            into("artk-autogen")
        }

        // Copy prompts
        from("../../prompts") {
            into("prompts")
            include("**/*.prompt.md", "**/*.md")
        }

        // Copy bootstrap templates
        from("../../templates") {
            into("bootstrap-templates")
            include("**/*.ts", "**/*.json", "**/*.yml")
        }

        into(assetsDir)

        // L2 fix: Use AND logic to ensure all required assets exist
        // L3 fix: Also validate templates directory
        // Only copy if ALL required source directories exist
        onlyIf {
            val coreExists = file("../../core/typescript/dist").exists()
            val autogenExists = file("../../core/typescript/autogen/dist").exists()
            val templatesExist = file("../../templates").exists()

            // Log which assets are available for debugging
            if (!coreExists) logger.warn("ARTK core dist not found - skipping asset bundling")
            if (!autogenExists) logger.warn("ARTK autogen dist not found - skipping asset bundling")
            if (!templatesExist) logger.warn("ARTK templates not found - skipping asset bundling")

            // Require core AND autogen (templates are optional but logged)
            coreExists && autogenExists
        }
    }

    // Make processResources depend on bundleArtkAssets when assets exist
    named("processResources") {
        dependsOn("bundleArtkAssets")
    }
}

kotlin {
    jvmToolchain(17)
}
