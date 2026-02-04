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

    testImplementation("junit:junit:4.13.2")
    testImplementation("org.mockito:mockito-core:5.8.0")
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
        untilBuild.set("251.*")
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
}

kotlin {
    jvmToolchain(17)
}
