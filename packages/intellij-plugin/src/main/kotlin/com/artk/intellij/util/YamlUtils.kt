package com.artk.intellij.util

import com.artk.intellij.model.*
import org.yaml.snakeyaml.Yaml
import java.io.File

/**
 * Utility functions for YAML operations
 */
object YamlUtils {

    private val yaml = Yaml()

    /**
     * Parse YAML file to map
     */
    fun parseFile(file: File): Map<String, Any?>? {
        return try {
            if (!file.exists()) return null
            @Suppress("UNCHECKED_CAST")
            yaml.load(file.readText()) as? Map<String, Any?>
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Parse YAML string to map
     */
    fun parse(content: String): Map<String, Any?>? {
        return try {
            @Suppress("UNCHECKED_CAST")
            yaml.load(content) as? Map<String, Any?>
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Parse ARTK config file
     */
    fun parseArtkConfig(file: File): ARTKConfig? {
        val map = parseFile(file) ?: return null
        return try {
            ARTKConfig(
                app = parseAppConfig(map["app"]),
                environments = parseEnvironments(map["environments"]),
                auth = parseAuthConfig(map["auth"]),
                llkb = parseLLKBConfig(map["llkb"]),
                browsers = parseBrowsersConfig(map["browsers"])
            )
        } catch (e: Exception) {
            null
        }
    }

    @Suppress("UNCHECKED_CAST")
    private fun parseAppConfig(data: Any?): AppConfig {
        val map = data as? Map<String, Any?> ?: return AppConfig()
        return AppConfig(
            name = map["name"]?.toString() ?: "",
            baseUrl = map["baseUrl"]?.toString() ?: ""
        )
    }

    @Suppress("UNCHECKED_CAST")
    private fun parseEnvironments(data: Any?): Map<String, EnvironmentConfig> {
        val map = data as? Map<String, Any?> ?: return emptyMap()
        return map.mapNotNull { (key, value) ->
            val envMap = value as? Map<String, Any?> ?: return@mapNotNull null
            key to EnvironmentConfig(
                url = envMap["url"]?.toString() ?: "",
                users = parseUsers(envMap["users"])
            )
        }.toMap()
    }

    @Suppress("UNCHECKED_CAST")
    private fun parseUsers(data: Any?): Map<String, UserConfig>? {
        val map = data as? Map<String, Any?> ?: return null
        return map.mapNotNull { (key, value) ->
            val userMap = value as? Map<String, Any?> ?: return@mapNotNull null
            key to UserConfig(
                username = userMap["username"]?.toString() ?: "",
                password = userMap["password"]?.toString() ?: "",
                role = userMap["role"]?.toString()
            )
        }.toMap()
    }

    @Suppress("UNCHECKED_CAST")
    private fun parseAuthConfig(data: Any?): AuthConfig? {
        val map = data as? Map<String, Any?> ?: return null
        return AuthConfig(
            type = map["type"]?.toString() ?: "none",
            loginUrl = map["loginUrl"]?.toString(),
            logoutUrl = map["logoutUrl"]?.toString(),
            selectors = parseAuthSelectors(map["selectors"]),
            storage = parseAuthStorage(map["storage"])
        )
    }

    @Suppress("UNCHECKED_CAST")
    private fun parseAuthSelectors(data: Any?): AuthSelectors? {
        val map = data as? Map<String, Any?> ?: return null
        return AuthSelectors(
            username = map["username"]?.toString(),
            password = map["password"]?.toString(),
            submit = map["submit"]?.toString(),
            mfaInput = map["mfaInput"]?.toString(),
            mfaSubmit = map["mfaSubmit"]?.toString()
        )
    }

    @Suppress("UNCHECKED_CAST")
    private fun parseAuthStorage(data: Any?): AuthStorage? {
        val map = data as? Map<String, Any?> ?: return null
        return AuthStorage(
            directory = map["directory"]?.toString() ?: ".auth-states",
            pattern = map["pattern"]?.toString() ?: "{username}-{environment}.json"
        )
    }

    @Suppress("UNCHECKED_CAST")
    private fun parseLLKBConfig(data: Any?): LLKBConfig? {
        val map = data as? Map<String, Any?> ?: return null
        return LLKBConfig(
            enabled = map["enabled"] as? Boolean ?: true,
            autoLearn = map["autoLearn"] as? Boolean ?: true,
            minConfidence = (map["minConfidence"] as? Number)?.toDouble() ?: 0.5
        )
    }

    @Suppress("UNCHECKED_CAST")
    private fun parseBrowsersConfig(data: Any?): BrowsersConfig? {
        val map = data as? Map<String, Any?> ?: return null
        return BrowsersConfig(
            channel = map["channel"]?.toString() ?: "bundled",
            strategy = map["strategy"]?.toString() ?: "auto"
        )
    }

    /**
     * Extract YAML frontmatter from a markdown file
     */
    fun extractFrontmatter(content: String): Map<String, Any?>? {
        val lines = content.lines()
        if (lines.isEmpty() || lines[0].trim() != "---") return null

        val endIndex = lines.drop(1).indexOfFirst { it.trim() == "---" }
        if (endIndex == -1) return null

        val yamlContent = lines.subList(1, endIndex + 1).joinToString("\n")
        return parse(yamlContent)
    }
}
