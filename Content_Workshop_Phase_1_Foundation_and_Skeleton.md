# Content Workshop

## Phase 1: Application Foundation and Functional Skeleton

**Document purpose:** Build the first working version of a reusable
content-creation application. This phase establishes the application
structure, navigation, data architecture, configurable workspace, and
the skeleton of every major feature. It is not intended to deliver every
feature in its final form.

**Primary build instruction:** Build a functioning, extensible
application foundation. Do not turn this document into a static mock-up,
and do not attempt to fully solve every module in this first phase.
Create the navigation, data structures, basic CRUD operations,
relationships, and clear placeholder workflows needed to test and
improve each feature in later phases.

------------------------------------------------------------------------

# 1. Product vision

Content Workshop is a configurable system that helps a person move from
an initial thought or idea to researched, planned, produced, published,
and evaluated content.

It must support more than video planning. A user may create standalone
discussions, multi-week projects, technical explainers, tutorials,
documentaries, short-form videos, written posts, carousels, reference
sheets, or other content outputs.

The application provides the **process and tools**. It must not impose
one creator's topics, beliefs, categories, branding, storytelling style,
or preferred workflow on every user.

The application must be generic and reusable. A new user should be able
to start with a blank workspace, configure it for their own needs, or
load an example workspace. The initial installation may include an
optional example workspace based on the first user's content
preferences, but those preferences must be editable data, not hardcoded
application logic.

## 1.1 Core principles

1.  Separate the application engine from each user's workspace data and
    configuration.
2.  Keep ideas, projects, content items, platform outputs, production
    tasks, and publishing records as distinct but linkable records.
3.  One idea may lead to multiple content items. One content item may be
    adapted into multiple platform-specific outputs.
4.  A project may generate multiple content items, or none. Content may
    also exist independently of a project.
5.  Workflows and templates must be configurable and versionable.
6.  Do not force every idea into production or every project into a
    video.
7.  Support both lightweight and detailed creation processes.
8.  Preserve the creator's original input separately from AI-cleaned
    text, interpretations, and suggestions.
9.  AI must not silently invent opinions, motivations, evidence,
    references, or decisions on behalf of the creator.
10. Make data portable and avoid unnecessary dependence on a proprietary
    application database.
11. Design for a simple user experience while allowing detailed
    information when needed.
12. Build the application so new content formats, platforms, workflow
    steps, fields, and modules can be added without redesigning the
    foundation.

------------------------------------------------------------------------

# 2. Scope of Phase 1

Phase 1 is the **application skeleton and foundation**.

It should deliver:

-   A working application shell and dashboard.
-   Navigation to all planned modules.
-   A configurable workspace/profile.
-   A clear separation between generic application functionality and
    workspace-specific data.
-   A consistent record and relationship model.
-   Basic create, view, edit, archive, and delete operations where
    appropriate.
-   Basic search, filters, and status handling.
-   Configurable workflow templates and the ability to instantiate a
    workflow for a new item.
-   Configurable storytelling templates.
-   Configurable platform profiles and content formats.
-   A basic idea-to-content relationship.
-   A basic content-to-platform-output relationship.
-   A basic file/folder and export structure.
-   Sample records clearly marked as examples.
-   A reset/blank-workspace option that does not delete or damage
    application functionality.
-   A coherent visual design and responsive layout.

Phase 1 should **not** attempt to deliver a full video editor, automatic
publishing to every platform, advanced analytics, sophisticated AI
agents, or a complete project-management system. Those can be developed
after the foundation is tested.

## 2.1 Definition of done

The skeleton is ready for testing when a user can:

1.  Open the application and understand its main areas.
2.  Create or select a workspace.
3.  Configure basic workspace identity and preferences.
4.  Capture an idea without completing a large form.
5.  Convert an idea into a content item.
6.  Link a content item to a project, or leave it standalone.
7.  Create more than one platform output from a content item.
8.  Select a workflow and storytelling template for a content item.
9.  See the relevant production and publishing steps.
10. Store basic notes, references, assets, and publishing information.
11. Navigate between related records without losing context.
12. Export a structured content package.
13. Reset or clear workspace data without removing the application
    itself.

------------------------------------------------------------------------

# 3. Application architecture: two separate layers

## 3.1 Layer A: Content Workshop application

This is the reusable application engine. It contains:

-   Navigation and interface components.
-   Record management.
-   Workflow engine.
-   Template engine.
-   Relationship handling.
-   Search and filtering.
-   File and export handling.
-   Platform profile functionality.
-   Workspace management.
-   AI integration points.
-   Future publishing and analytics integrations.

Application functionality must not depend on any particular user's
content categories, colours, channel philosophy, or subject matter.

## 3.2 Layer B: Workspace

A workspace contains the creator's own configuration and content.

Workspace configuration may include:

-   Workspace name and description.
-   Channel or brand identity.
-   Philosophy, principles, and editorial guidelines.
-   Categories and category colours.
-   Topics and tags.
-   Series.
-   Audience profiles.
-   Brand assets, fonts, colours, and visual preferences.
-   Voice, tone, and communication preferences.
-   Storytelling methods and hook styles.
-   Workflow templates.
-   Video and content templates.
-   Platform profiles.
-   Publishing checklist templates.
-   AI instructions.
-   Ideas, projects, content, outputs, assets, references, and feedback.

The application must support multiple workspaces if practical. At
minimum, it must support creating a blank workspace and resetting the
current workspace.

## 3.3 Workspace actions

Provide the following actions in Workspace Settings:

-   **Create blank workspace:** creates an empty workspace with sensible
    generic defaults.
-   **Load example workspace:** loads example configuration and clearly
    labelled sample content.
-   **Export workspace:** exports workspace configuration and data in a
    portable format.
-   **Import workspace:** imports a compatible workspace package.
-   **Reset workspace data:** clears the selected workspace's content
    records while retaining its configuration.
-   **Reset workspace configuration:** restores configuration to a
    blank/default state. Confirm before doing this.
-   **Delete workspace:** removes a workspace after an explicit
    confirmation.

Never make a workspace reset delete application code, shared application
templates, or another workspace's records. Explain exactly what will be
removed before destructive actions.

------------------------------------------------------------------------

# 4. Main navigation and application shell

Create a clean, responsive, phone-friendly application. Use a dashboard
or hub as the home screen, with clear access to the following modules.

## 4.1 Main modules

1.  **Dashboard**
    -   Overview of active work.
    -   Quick capture.
    -   Recent ideas and content.
    -   Upcoming milestones and publishing dates.
    -   Active projects.
    -   Recently edited records.
    -   Useful shortcuts.
    -   Avoid a pressure-oriented productivity scoreboard.
2.  **Ideas**
    -   Idea inbox.
    -   Idea detail.
    -   Brainstorming and development.
    -   Related ideas.
    -   Idea status and prioritisation.
3.  **Projects**
    -   Project list and detail.
    -   Project stages and milestones.
    -   Linked ideas and content.
    -   Risks, assumptions, notes, and lessons.
    -   Project review and decision history.
4.  **Content Library**
    -   All content items.
    -   Search and filters.
    -   List and board views initially; other views can follow.
    -   Content status, category, series, project, audience, and
        platform relationships.
5.  **Create Content**
    -   Content brief.
    -   Master concept.
    -   Story and structure editor.
    -   Script, outline, or talking points.
    -   Hook and ending development.
    -   Visual planning.
    -   References and assets.
6.  **Production**
    -   Production pipeline.
    -   Tasks and checklists.
    -   Recording and editing notes.
    -   Asset and footage links.
    -   Review and approval status.
7.  **Content Planner**
    -   Calendar or timeline for planned production and publishing.
    -   Separate project milestones from content production dates and
        publishing dates.
    -   Avoid treating uncommitted ideas as overdue tasks.
8.  **Platforms & Publishing**
    -   Platform profiles.
    -   Platform-specific content outputs.
    -   Publishing packages.
    -   Platform-specific technical requirements.
    -   Publishing checklist and published links.
9.  **Performance & Feedback**
    -   Basic feedback records and performance fields in Phase 1.
    -   More advanced analytics can be developed later.
10. **Templates & Workflows**
    -   Workflow templates.
    -   Storytelling templates.
    -   Content templates.
    -   Production checklists.
    -   Publishing templates.
11. **Workspace Settings**
    -   Workspace identity.
    -   Categories, tags, series, audiences.
    -   Branding and visual identity.
    -   Voice and tone.
    -   AI instructions.
    -   Workspace import, export, and reset.
12. **Assets & References**
    -   Reference library.
    -   Images, diagrams, footage, audio, and other assets.
    -   Links to ideas, projects, content items, and platform outputs.

A persistent quick-capture action should be available from the main
interface.

## 4.2 Navigation requirements

-   Make the current workspace visible.
-   Keep navigation consistent across modules.
-   Use clear empty states explaining what a user can do next.
-   Use sample data only when it is clearly labelled.
-   Support desktop and mobile layouts.
-   Avoid showing every advanced field on the first screen. Use
    progressive disclosure.
-   A user should be able to move from an idea to its resulting content
    and platform outputs, and back again.

------------------------------------------------------------------------

# 5. Core data model

Use unique IDs for records. Use explicit relationships rather than
copying the same information into multiple records. Store creation and
modification dates where useful.

The following are the initial record types. Fields can evolve, but the
distinctions between record types should remain.

## 5.1 Workspace

Represents one creator's environment.

Suggested fields:

-   Workspace ID.
-   Name.
-   Description.
-   Created and modified dates.
-   Workspace configuration.
-   Branding settings.
-   AI/editorial instructions.
-   Default preferences.

## 5.2 Idea

Represents an initial thought or potential content opportunity.

Suggested fields:

-   Idea ID.
-   Title.
-   Original/raw input.
-   Cleaned summary.
-   AI interpretation, stored separately.
-   Idea type.
-   Status.
-   Category and tags.
-   Related series.
-   Intended audience.
-   Potential viewer value.
-   Initial angle.
-   Research questions.
-   Related ideas.
-   Possible project.
-   Notes and attachments.
-   Created and modified dates.

Initial statuses may include Inbox, Exploring, Ready for Planning,
Planned, In Production, Published, Parked, and Rejected. Make statuses
configurable where practical.

An idea must be capturable without completing all fields.

## 5.3 Project

Represents a larger piece of work, investigation, experiment, build, or
journey.

Suggested fields:

-   Project ID.
-   Title and description.
-   Project type.
-   Problem or opportunity.
-   Initial idea.
-   Status and current stage.
-   Category, tags, and audience.
-   Start date, target date, and review date.
-   Estimated effort.
-   Milestones.
-   Risks and assumptions.
-   Success criteria.
-   Linked ideas.
-   Linked content items.
-   Lessons and decisions.
-   Final outcome and rationale.

Projects must not be treated as synonymous with videos.

## 5.4 Content item

Represents one intended piece of communication, independent of the
platform-specific versions.

Examples include a long-form video, a standalone discussion, a tutorial,
a documentary, a written article, or a carousel concept.

Suggested fields:

-   Content ID.
-   Working title.
-   Content type/format.
-   Central idea or message.
-   Viewer promise.
-   Intended audience.
-   Primary category and tags.
-   Series.
-   Linked source idea(s).
-   Linked project(s).
-   Selected workflow template and version.
-   Selected storytelling template and version.
-   Content status.
-   Target date.
-   Notes.
-   Created and modified dates.

## 5.5 Platform output

Represents a specific adaptation or publication intended for one
platform and format.

Examples: a TikTok video, YouTube long-form video, YouTube Short,
Instagram Reel, or Instagram carousel.

Suggested fields:

-   Output ID.
-   Parent content ID.
-   Platform profile ID.
-   Platform content format ID.
-   Output-specific title.
-   Output-specific angle and viewer promise.
-   Output-specific script or structure.
-   Duration target.
-   Aspect ratio and technical settings.
-   Thumbnail/cover requirements.
-   Caption/description.
-   Hashtags/tags.
-   References and links.
-   Platform assets.
-   Publishing checklist.
-   Scheduled date.
-   Published date and URL.
-   Output status.

A single content item may have zero, one, or many platform outputs. Each
output can have its own workflow, structure, assets, and publishing
package.

## 5.6 Workflow template and workflow instance

A **workflow template** defines reusable steps. A **workflow instance**
is the actual process being followed for one content item, project, or
output.

A workflow step should support:

-   Name and description.
-   Purpose/instructions.
-   Order.
-   Optional or required status.
-   Whether it can be skipped.
-   Input fields.
-   Expected output.
-   Checklist items.
-   Dependencies where needed.
-   Estimated effort or duration.
-   Relevant AI prompt/instructions.
-   Completion status.

Workflow instances must retain the template version from which they were
created. Updating a template should not silently rewrite active or
historical workflow instances.

Allow a user to add, remove, rename, reorder, duplicate, and make steps
optional.

## 5.7 Storytelling template

Defines a reusable narrative structure.

A storytelling template contains ordered, editable blocks such as:

-   Hook.
-   Context.
-   Story section.
-   Re-hook.
-   Explanation.
-   Demonstration.
-   Counterargument.
-   Payoff.
-   Conclusion.
-   CTA.

These are examples, not mandatory blocks. Blocks must be addable,
removable, reorderable, and repeatable.

A block may include:

-   Block name.
-   Purpose.
-   Prompt/instruction.
-   Talking points or script.
-   Estimated duration.
-   Visual requirements.
-   Supporting assets.
-   References.
-   Transition notes.
-   Recording/editing notes.

## 5.8 Platform profile and platform format

Keep the platform separate from its content formats.

For example, YouTube may have long-form video and Shorts formats.
Instagram may have Reels, Stories, and carousels. Each format may have
different requirements.

A platform profile should support configurable fields and checklists,
including:

-   Platform name.
-   Supported content formats.
-   Aspect ratio and resolution.
-   Duration constraints.
-   File size and export requirements.
-   Frame rate and file format.
-   Safe zones and interface overlays.
-   Thumbnail/cover requirements.
-   Title, caption, description, tags, hashtags, chapters, links, and
    other metadata fields.
-   Disclosure and reference requirements.
-   Publishing checklist.

Do not hardcode technical specifications as permanent truths. Make them
editable and allow a user to record when they were last verified.
Platform specifications can change.

## 5.9 References and assets

References should be reusable records, not just text pasted into a
script.

Reference fields may include:

-   Title.
-   Creator/author/organisation.
-   URL or source details.
-   Description.
-   What it supports or explains.
-   Relevant claim or section.
-   Date accessed.
-   Notes and verification status.

Assets may include:

-   Asset ID.
-   Name and type.
-   File location or URL.
-   Description.
-   Linked idea, project, content item, or platform output.
-   Usage notes and status.

## 5.10 Production task and publishing record

Keep production tasks separate from workflow templates. A task is an
actionable item generated from or linked to a workflow step.

Publishing records should store actual publication details, including
date, platform, URL, and any relevant notes.

------------------------------------------------------------------------

# 6. Essential end-to-end relationships

The initial skeleton must support this general structure:

``` text
Workspace
  ├── Ideas
  ├── Projects
  │     ├── Related ideas
  │     └── Related content items
  ├── Content items
  │     ├── Source ideas
  │     ├── Related projects
  │     ├── Workflow instance
  │     ├── Storytelling structure
  │     ├── References and assets
  │     └── Platform outputs
  │            ├── Platform profile and format
  │            ├── Platform-specific structure
  │            ├── Publishing package
  │            ├── Assets
  │            └── Publishing record
  └── Configuration
        ├── Categories and tags
        ├── Audiences and series
        ├── Workflow templates
        ├── Storytelling templates
        ├── Platform profiles
        └── Brand and AI instructions
```

Do not assume every record must be linked to every other record.
Standalone content is valid. A project without content is valid. An idea
that remains parked is valid.

------------------------------------------------------------------------

# 7. Initial creator workflow seed

Include an optional example workflow based on the following process. It
must be editable and must not be hardcoded as the only possible process.

1.  Capture the idea.
2.  Develop the concept and viewer value.
3.  Research and challenge the idea.
4.  Define the story and central message.
5.  Create the script, outline, or talking points.
6.  Develop the opening hook, re-hooks, ending, and CTA.
7.  Plan visuals and supporting assets.
8.  Gather references and verify factual claims.
9.  Record or create the content.
10. Edit and assemble.
11. Review factual, legal, and quality requirements.
12. Prepare platform-specific outputs and publishing packages.
13. Publish.
14. Evaluate performance and feedback.
15. Record lessons and possible follow-up content.

Some steps may happen in a different order, be combined, repeated, or
skipped. Different content types should be able to use different
workflow templates.

Support lightweight workflows as well as detailed workflows.

------------------------------------------------------------------------

# 8. Initial storytelling and platform examples

Provide optional examples, clearly labelled as examples.

## 8.1 Short-form storytelling example

-   Hook.
-   Re-hook.
-   Main point.
-   Re-hook or new development.
-   Explanation/payoff.
-   CTA.

## 8.2 Long-form storytelling example

-   Opening hook.
-   Context and problem.
-   Investigation or story setup.
-   Main sections.
-   Examples and demonstrations.
-   Complications, limitations, or counterarguments.
-   Resolution and conclusion.
-   Viewer takeaway.
-   CTA.

The app must not assume that TikTok always uses one structure or that
YouTube always uses another. The creator chooses and edits the template.

## 8.3 Platform output examples

Seed configurable examples for:

-   TikTok short-form video.
-   YouTube long-form video.
-   YouTube Short.
-   Instagram Reel.
-   Instagram carousel.

Do not imply that example technical settings are guaranteed to be
current. Use placeholder or editable values and make verification dates
visible.

------------------------------------------------------------------------

# 9. Content creation interface

Create a content detail page with clearly separated sections or tabs.

Suggested sections:

1.  Overview and brief.
2.  Master concept and viewer promise.
3.  Story and structure.
4.  Script, outline, and talking points.
5.  Hooks, re-hooks, ending, and CTA.
6.  Research and references.
7.  Visual plan and assets.
8.  Platform outputs.
9.  Production workflow and tasks.
10. Publishing packages.
11. Performance and feedback.
12. History and notes.

The user should be able to work on the master concept without having to
create platform outputs immediately.

When creating a platform output, allow the user to:

-   Start from the master content.
-   Select a platform and format.
-   Choose a storytelling template.
-   Adapt or rewrite the content for that platform.
-   Keep the output linked to the parent content.
-   Override inherited details without changing the master content.

Do not automatically copy changes from the master content into an
already customised platform output without asking or providing a clear
update/merge action.

------------------------------------------------------------------------

# 10. AI integration points

Phase 1 should create the interface and data structure for AI
assistance, even if some AI functions are initially manual or simulated.

Potential AI actions:

-   Clean up raw idea input while preserving the original.
-   Summarise and classify an idea.
-   Ask clarifying questions.
-   Identify the central message and viewer value.
-   Suggest research questions and counterarguments.
-   Help structure a story.
-   Generate hook and re-hook options.
-   Create a first script or outline.
-   Adapt a master concept to a platform.
-   Draft captions, descriptions, hashtags, titles, and thumbnail
    briefs.
-   Identify missing references or production requirements.
-   Generate an export brief for an external assistant such as Claude.

AI behaviour requirements:

-   Clearly distinguish creator-provided information from AI-generated
    suggestions.
-   Never present an unverified suggestion as a fact.
-   Never invent sources, quotes, statistics, personal experiences, or
    creator beliefs.
-   Preserve original input and allow comparison with AI revisions.
-   Ask for clarification when the creator's intended meaning is
    unclear.
-   Allow the creator to accept, edit, or reject AI suggestions
    individually.
-   Do not silently overwrite creator-authored material.

------------------------------------------------------------------------

# 11. File and export structure

The storage implementation can be refined later, but the application
must be designed around portable data and predictable exports.

Where folder-based storage is supported, use a structure similar to:

``` text
ContentWorkshop/
  ApplicationData/
  Workspaces/
    Workspace_Name/
      Configuration/
      Ideas/
      Projects/
      Content/
        Content_ID_Content_Name/
          Brief.md
          Master_Concept.md
          Story_and_Structure.md
          Script_or_Talking_Points.md
          Research_and_References.md
          Visual_Direction.md
          Production_Notes.md
          Platform_Outputs/
            TikTok/
              Platform_Brief.md
              Caption_and_Hashtags.md
              Export_Requirements.md
              Assets/
            YouTube_Long_Form/
              Platform_Brief.md
              Title_Description_and_Chapters.md
              Thumbnail_Brief.md
              References_and_Links.md
              Assets/
            Instagram/
              Platform_Brief.md
              Caption_and_Carousel_Structure.md
              Assets/
          Footage/
          Audio/
          Exports/
      Shared_Assets/
      Reference_Library/
      Exports/
```

This is an illustrative structure. Do not create every possible file for
every content item. Create relevant files based on the content type,
workflow, and platform outputs actually selected.

The application should use stable IDs and maintain links between records
and files. Avoid relying on folder names as the only identifier.

## 11.1 Export package

Allow a user to export a content package containing:

-   Content brief.
-   Master concept.
-   Story and structure.
-   Script or talking points.
-   Platform-specific briefs.
-   Publishing metadata.
-   References.
-   Visual direction.
-   Production instructions.
-   Relevant AI instructions.
-   Asset manifest and file references.

The export should be clear enough that an external AI assistant or
collaborator can understand the project without guessing what each file
means.

------------------------------------------------------------------------

# 12. User experience and visual design

The interface should feel like a practical creative workspace, not a
corporate project-management dashboard.

Requirements:

-   Simple, clean, professional design.
-   Responsive and usable on desktop and mobile.
-   Clear visual hierarchy.
-   Large, understandable navigation areas.
-   Fast access to idea capture.
-   Detailed information available without cluttering the initial view.
-   Consistent status labels and controls.
-   Useful empty states.
-   Search and filtering where records accumulate.
-   Confirm destructive actions.
-   Autosave or clear save-state feedback.
-   Avoid unnecessary animations and decorative complexity.

Use a neutral default visual theme. Workspace-specific brand colours and
identity should be configurable separately.

Do not hardcode the first user's category colours or brand identity into
the application theme.

------------------------------------------------------------------------

# 13. Data integrity and safety

-   Use stable unique IDs.
-   Track created and modified dates.
-   Avoid duplicate copies of shared information where relationships can
    be used.
-   Preserve raw idea input.
-   Keep AI-generated text distinguishable from creator-authored text.
-   Provide archive/restore where practical.
-   Confirm permanent deletion.
-   Provide workspace export and backup capability.
-   Do not let one workspace's reset affect another workspace.
-   Do not let a template update silently alter existing workflow
    instances.
-   Do not let a master content edit silently overwrite
    platform-specific adaptations.
-   Keep application configuration separate from workspace
    configuration.
-   Validate imported workspace packages before applying them.

------------------------------------------------------------------------

# 14. Build approach

Build in small, testable increments. Do not attempt to implement every
advanced capability in one pass.

## Step 1: Application shell

-   Establish the project structure.
-   Create the responsive application shell.
-   Create the main navigation.
-   Create the dashboard.
-   Create all module landing pages.
-   Add consistent page layouts, empty states, and navigation.

## Step 2: Workspace foundation

-   Create workspace data structure.
-   Create blank workspace.
-   Add example workspace option.
-   Add workspace settings.
-   Add reset/export/import interfaces.
-   Ensure workspace data is separate from application functionality.

## Step 3: Core records

-   Implement ideas.
-   Implement projects.
-   Implement content items.
-   Implement platform outputs.
-   Implement references and assets.
-   Implement basic search, filters, and relationships.

## Step 4: Configurable workflows and templates

-   Implement workflow template editor.
-   Implement workflow instances.
-   Implement storytelling template editor.
-   Implement platform profiles and formats.
-   Implement basic production and publishing checklists.

## Step 5: End-to-end test

Test this complete scenario:

1.  Capture a new idea.
2.  Edit the raw idea and add notes.
3.  Develop it into a content concept.
4.  Create a standalone content item.
5.  Link it to a project.
6.  Select a workflow and storytelling template.
7.  Create a TikTok output and a YouTube output.
8.  Give each output a different structure.
9.  Add references and assets.
10. Add platform-specific captions, metadata, and publishing
    requirements.
11. Export the content package.
12. Confirm all relationships and files remain intact.

Also test:

-   A standalone video with no project.
-   A project with no content.
-   An idea that is parked.
-   A lightweight workflow.
-   A detailed workflow.
-   A content item with only one platform output.
-   A content item with several platform outputs.
-   A blank workspace with no personal data.
-   Workspace reset without loss of application functionality.

------------------------------------------------------------------------

# 15. Important decisions to leave configurable or unresolved

Do not make irreversible assumptions about:

-   Final storage technology.
-   Whether all data lives directly in cloud-drive folders or whether a
    local data layer is needed.
-   Exact platform technical limits.
-   Final content categories and colours.
-   Final channel philosophy and AI instructions.
-   Exact workflow stages.
-   Exact storytelling templates.
-   Number of active projects.
-   Publishing integrations.
-   Advanced analytics.
-   Multi-user collaboration and permissions.

Use sensible temporary defaults where needed, but isolate them in
configuration so they can be changed later.

------------------------------------------------------------------------

# 16. Initial workspace data: optional seed, not application logic

The first workspace may later be populated with the creator's own:

-   Channel philosophy and principles.
-   Content pillars and colours.
-   Series.
-   Audience profiles.
-   Existing ideas and standalone topics.
-   Existing projects.
-   Storytelling preferences.
-   Workflow preferences.
-   Brand identity.
-   AI instructions.

These must be loaded as workspace data or configuration. Do not hardcode
them into the application.

The first creator's example topics, projects, categories, and
preferences are not universal defaults. A new user must be able to start
with a blank workspace or remove all example data.

------------------------------------------------------------------------

# 17. Instructions to the developer / coding assistant

Before implementing:

1.  Inspect the existing codebase and identify its framework, storage
    approach, and current capabilities.
2.  Preserve working functionality unless there is a clear reason to
    change it.
3.  Identify any architectural conflicts with this specification before
    making major changes.
4.  Propose the implementation structure briefly.
5.  Build the application foundation in the steps above.

During implementation:

-   Keep components and modules modular.
-   Keep workspace configuration out of hardcoded UI logic.
-   Use a consistent data model and stable IDs.
-   Use realistic example data only when clearly labelled.
-   Do not create fake integrations or claim that publishing/AI
    automation works when it does not.
-   Provide useful error and empty states.
-   Make all visible controls functional. If a feature is not
    implemented yet, label it as a planned feature rather than
    presenting an inert control as working.
-   Avoid overengineering future features before the foundation is
    tested.

At the end, provide:

-   What was implemented.
-   What is functional.
-   What is only a placeholder.
-   Any architectural decisions made.
-   Any assumptions that need user approval.
-   How to test the end-to-end scenario.
-   Known limitations and recommended next development step.

**Most important:** Build a solid, generic Content Workshop foundation
that can evolve with the creator. Do not mistake the initial example
workspace for the application itself.
