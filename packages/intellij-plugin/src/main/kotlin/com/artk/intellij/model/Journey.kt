package com.artk.intellij.model

/**
 * Journey data model representing an ARTK journey file
 */
data class Journey(
    val id: String,
    val title: String,
    val status: JourneyStatus,
    val tier: JourneyTier,
    val actor: String? = null,
    val scope: String? = null,
    val tests: List<String> = emptyList(),
    val owner: String? = null,
    val statusReason: String? = null,
    val filePath: String,
    val lastModified: Long = 0
) {
    val hasTests: Boolean get() = tests.isNotEmpty()

    companion object {
        fun fromFrontmatter(frontmatter: Map<String, Any?>, filePath: String): Journey {
            return Journey(
                id = frontmatter["id"]?.toString() ?: "",
                title = frontmatter["title"]?.toString() ?: "",
                status = JourneyStatus.fromString(frontmatter["status"]?.toString()),
                tier = JourneyTier.fromString(frontmatter["tier"]?.toString()),
                actor = frontmatter["actor"]?.toString(),
                scope = frontmatter["scope"]?.toString(),
                tests = (frontmatter["tests"] as? List<*>)?.mapNotNull { it?.toString() } ?: emptyList(),
                owner = frontmatter["owner"]?.toString(),
                statusReason = frontmatter["statusReason"]?.toString(),
                filePath = filePath
            )
        }
    }
}

enum class JourneyStatus(val displayName: String, val icon: String) {
    PROPOSED("Proposed", "proposed"),
    DEFINED("Defined", "defined"),
    CLARIFIED("Clarified", "clarified"),
    IMPLEMENTED("Implemented", "implemented"),
    QUARANTINED("Quarantined", "quarantined"),
    DEPRECATED("Deprecated", "deprecated"),
    UNKNOWN("Unknown", "unknown");

    companion object {
        fun fromString(value: String?): JourneyStatus {
            return entries.find { it.name.equals(value, ignoreCase = true) } ?: UNKNOWN
        }
    }
}

enum class JourneyTier(val displayName: String) {
    SMOKE("Smoke"),
    RELEASE("Release"),
    REGRESSION("Regression"),
    UNKNOWN("Unknown");

    companion object {
        fun fromString(value: String?): JourneyTier {
            return entries.find { it.name.equals(value, ignoreCase = true) } ?: UNKNOWN
        }
    }
}
