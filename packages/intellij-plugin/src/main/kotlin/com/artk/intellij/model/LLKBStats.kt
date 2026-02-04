package com.artk.intellij.model

import com.google.gson.annotations.SerializedName

/**
 * LLKB Statistics from learned-patterns.json
 */
data class LLKBStats(
    @SerializedName("patterns")
    val patterns: List<LearnedPattern> = emptyList(),

    @SerializedName("lastUpdated")
    val lastUpdated: String? = null
) {
    val totalPatterns: Int get() = patterns.size
    val highConfidencePatterns: Int get() = patterns.count { it.confidence >= 0.7 }
    val promotablePatterns: Int get() = patterns.count { it.isPromotable }
    val averageConfidence: Double get() = if (patterns.isEmpty()) 0.0 else patterns.map { it.confidence }.average()
}

data class LearnedPattern(
    @SerializedName("text")
    val text: String,

    @SerializedName("normalizedText")
    val normalizedText: String,

    @SerializedName("irPrimitive")
    val irPrimitive: String,

    @SerializedName("confidence")
    val confidence: Double,

    @SerializedName("successCount")
    val successCount: Int = 0,

    @SerializedName("failCount")
    val failCount: Int = 0,

    @SerializedName("sourceJourneys")
    val sourceJourneys: List<String> = emptyList(),

    @SerializedName("lastUsed")
    val lastUsed: String? = null,

    @SerializedName("promoted")
    val promoted: Boolean = false
) {
    val isPromotable: Boolean
        get() = confidence >= 0.9 && successCount >= 5 && sourceJourneys.size >= 2 && !promoted

    val usageCount: Int get() = successCount + failCount

    val successRate: Double
        get() = if (usageCount == 0) 0.0 else successCount.toDouble() / usageCount
}

/**
 * LLKB Health status
 */
data class LLKBHealth(
    val isValid: Boolean,
    val hasConfigYml: Boolean,
    val hasLessonsJson: Boolean,
    val hasLearnedPatterns: Boolean,
    val patternCount: Int,
    val issues: List<String> = emptyList()
)
