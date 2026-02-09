package com.artk.intellij.model

/**
 * Workflow step for the ARTK workflow panel
 */
data class WorkflowStep(
    val id: String,
    val title: String,
    val description: String,
    val command: String,
    val status: WorkflowStepStatus = WorkflowStepStatus.PENDING,
    val copilotPrompt: String? = null,
    val prerequisites: List<String> = emptyList()
)

enum class WorkflowStepStatus {
    PENDING,
    IN_PROGRESS,
    COMPLETED,
    SKIPPED,
    BLOCKED
}

/**
 * Predefined ARTK workflow steps
 */
object ARTKWorkflow {
    val STEPS = listOf(
        WorkflowStep(
            id = "init",
            title = "Initialize ARTK",
            description = "Set up ARTK structure in your project",
            command = "artk init .",
            copilotPrompt = "/artk.init"
        ),
        WorkflowStep(
            id = "discover",
            title = "Discover Foundation",
            description = "Analyze app routes, features, and auth patterns",
            command = "artk discover",
            copilotPrompt = "/artk.discover-foundation",
            prerequisites = listOf("init")
        ),
        WorkflowStep(
            id = "propose",
            title = "Propose Journeys",
            description = "Auto-propose journeys from discovery",
            command = "artk journey propose",
            copilotPrompt = "/artk.journey-propose",
            prerequisites = listOf("discover")
        ),
        WorkflowStep(
            id = "define",
            title = "Define Journeys",
            description = "Create canonical journey structure",
            command = "artk journey define",
            copilotPrompt = "/artk.journey-define",
            prerequisites = listOf("propose")
        ),
        WorkflowStep(
            id = "clarify",
            title = "Clarify Journeys",
            description = "Add execution details to journeys",
            command = "artk journey clarify",
            copilotPrompt = "/artk.journey-clarify",
            prerequisites = listOf("define")
        ),
        WorkflowStep(
            id = "implement",
            title = "Implement Tests",
            description = "Generate Playwright tests from journeys",
            command = "artk journey implement",
            copilotPrompt = "/artk.journey-implement",
            prerequisites = listOf("clarify")
        ),
        WorkflowStep(
            id = "validate",
            title = "Validate Tests",
            description = "Static validation gate",
            command = "artk journey validate",
            copilotPrompt = "/artk.journey-validate",
            prerequisites = listOf("implement")
        ),
        WorkflowStep(
            id = "verify",
            title = "Verify Tests",
            description = "Runtime verification gate",
            command = "artk journey verify",
            copilotPrompt = "/artk.journey-verify",
            prerequisites = listOf("validate")
        )
    )
}
