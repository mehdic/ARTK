package com.artk.intellij.model

import com.google.gson.annotations.SerializedName

/**
 * ARTK Context from .artk/context.json
 */
data class ARTKContext(
    @SerializedName("artkVersion")
    val artkVersion: String = "",

    @SerializedName("variant")
    val variant: String = "modern-esm",

    @SerializedName("playwrightVersion")
    val playwrightVersion: String = "",

    @SerializedName("nodeVersion")
    val nodeVersion: Int = 18,

    @SerializedName("moduleSystem")
    val moduleSystem: String = "esm",

    @SerializedName("installedAt")
    val installedAt: String = "",

    @SerializedName("browsers")
    val browsers: BrowserConfig? = null,

    @SerializedName("llkb")
    val llkb: LLKBContextConfig? = null
)

data class BrowserConfig(
    @SerializedName("channel")
    val channel: String = "bundled",

    @SerializedName("strategy")
    val strategy: String = "auto"
)

data class LLKBContextConfig(
    @SerializedName("enabled")
    val enabled: Boolean = true,

    @SerializedName("initializedAt")
    val initializedAt: String? = null
)
