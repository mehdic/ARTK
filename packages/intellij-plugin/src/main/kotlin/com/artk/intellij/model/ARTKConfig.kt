package com.artk.intellij.model

/**
 * ARTK Configuration from artk.config.yml
 */
data class ARTKConfig(
    val app: AppConfig = AppConfig(),
    val environments: Map<String, EnvironmentConfig> = emptyMap(),
    val auth: AuthConfig? = null,
    val llkb: LLKBConfig? = null,
    val browsers: BrowsersConfig? = null
)

data class AppConfig(
    val name: String = "",
    val baseUrl: String = ""
)

data class EnvironmentConfig(
    val url: String = "",
    val users: Map<String, UserConfig>? = null
)

data class UserConfig(
    val username: String = "",
    val password: String = "",
    val role: String? = null
)

data class AuthConfig(
    val type: String = "none",
    val loginUrl: String? = null,
    val logoutUrl: String? = null,
    val selectors: AuthSelectors? = null,
    val storage: AuthStorage? = null
)

data class AuthSelectors(
    val username: String? = null,
    val password: String? = null,
    val submit: String? = null,
    val mfaInput: String? = null,
    val mfaSubmit: String? = null
)

data class AuthStorage(
    val directory: String = ".auth-states",
    val pattern: String = "{username}-{environment}.json"
)

data class LLKBConfig(
    val enabled: Boolean = true,
    val autoLearn: Boolean = true,
    val minConfidence: Double = 0.5
)

data class BrowsersConfig(
    val channel: String = "bundled",
    val strategy: String = "auto"
)
