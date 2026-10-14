---
name: speckit-jira-specstoissues
description: Create Jira hierarchy from spec and tasks
compatibility: Requires spec-kit project structure with .specify/ directory
metadata:
  author: Michal Bachorik
  source: jira:commands/specstoissues.md
---

# Create Jira Issues from Spec and Tasks

This command creates a complete Jira issue hierarchy from your specification and task breakdown:

- **Epic**: Created from SPEC.md (overall specification)
- **Stories**: Created from Phase headers in TASKS.md (e.g., `## Phase 1: Setup`) — in AB2B the type is `Tarea`
- **Tasks/Subtasks**: Created from task items under each Phase (e.g., `- [ ] T001 ...`) — in AB2B the type is `Subtask`, child of its phase

Every field available on each issue type is populated (description, labels, assignee, acceptance criteria, DoR and DoD as checklists, dependency links…), except story points, which are never set, and except those explicitly disabled in `population` (see Steps 2 and 4c).

## Prerequisites

1. MCP server providing Jira tools configured and running (server name configured in jira-config.yml)
2. Jira configuration file exists: `.specify/extensions/jira/jira-config.yml`
3. Specification directory with `spec.md` and `tasks.md` files in `specs/<spec-name>/`

## User Input

$ARGUMENTS

Accepts optional `--spec <name>` argument to specify which specification to use.
If not provided, auto-detects from current directory or available specs.

## Steps

### 1. Detect Specification Directory

Determine which specification to use (in order of priority):

1. `--spec <name>` argument
2. Git branch name (if matches a spec directory)
3. Current directory (if inside `specs/<name>/`)
4. Single spec (if only one exists)

Read the specification directory and validate that both `spec.md` and `tasks.md` exist.

### 2. Load Jira Configuration

Load the Jira configuration from `.specify/extensions/jira/jira-config.yml`:

**Artifact Mapping:**
- `mapping.spec_artifact`: Issue type for SPEC.md (default: "Epic")
- `mapping.phase_artifact`: Issue type for Phase headers (default: "Story")
- `mapping.task_artifact`: Issue type for task items (default: "Task"). Set to `""` or `"none"` for 2-level mode (Spec → Phases only)

**2-Level Mode:**

When `task_artifact` is empty (`""`) or `"none"`, the extension operates in 2-level mode:

- Only Spec and Phase issues are created in Jira
- Tasks are embedded as a checklist in the Phase description
- No individual Task issues are created
- Useful for simpler projects or when tasks don't need individual tracking

**Relationships:**
- `mapping.relationships.spec_phase`: How Phase links to Spec (default: "Epic Link")
- `mapping.relationships.phase_task`: How Task links to Phase (default: "Relates")
- `mapping.relationships.spec_task`: Direct Task-Spec link (default: "Epic Link")

Relationship options: `"Parent"`, `"Epic Link"`, `"Relates"`, `"Blocks"`, `"Implements"`, `"is child of"`, `"none"`

**Site / IDs:**
- `cloud_id`: pass as `cloudId` on every MCP call (skip `getAccessibleAtlassianResources` when set)
- `jira_base_url`: used to build issue URLs
- `mapping.issue_type_ids.{spec,phase,task}`: if creating by issue type name is rejected, retry with `additional_fields: {"issuetype": {"id": "<id>"}}`
- `mapping.dependency_link_type`: link type used for task/phase dependencies (default `"Blocks"`)

**Field population (`field_mappings` + `population`):**
- `field_mappings.*`: custom field IDs (acceptance_criteria, definition_of_ready, definition_of_done, team, sprint, start_date, epic_color, flagged)
- `population.assignee_account_id`: assignee for every created issue (`""` = unassigned)
- `population.team_id`: Atlassian team UUID for the Team field (`""` = skip)
- `population.sprint`: `"none"` (backlog, do not pass `assignToSprint`), `"active"`, a sprint name or id
- `population.dates`: `"none"` = do not fill Fecha de inicio / Fecha de vencimiento
- `population.epic_color`: value for the Epic color field
- `population.flag_blocked_tasks`: set Flagged = `Impediment` on blocked tasks
- `population.definition_of_ready` / `population.definition_of_done`: base checklist items merged into every DoR/DoD checklist

A field whose mapping is missing, or whose population value is empty/`"none"`, is skipped silently. Every other field available on the issue type MUST be filled.

**Backward Compatibility:**

If old config structure is found:
- `hierarchy.epic_type` → maps to `mapping.spec_artifact`
- `hierarchy.story_type` → maps to `mapping.phase_artifact`
- `hierarchy.task_type` → maps to `mapping.task_artifact`
- `hierarchy.relationships.epic_story` → maps to `mapping.relationships.spec_phase`
- `hierarchy.relationships.story_task` → maps to `mapping.relationships.phase_task`
- `hierarchy.relationships.epic_task` → maps to `mapping.relationships.spec_task`

**Environment variable overrides:**
- `SPECKIT_JIRA_PROJECT_KEY` → `project.key`
- `SPECKIT_JIRA_SPEC_ARTIFACT` → `mapping.spec_artifact`
- `SPECKIT_JIRA_PHASE_ARTIFACT` → `mapping.phase_artifact`
- `SPECKIT_JIRA_TASK_ARTIFACT` → `mapping.task_artifact`
- `SPECKIT_JIRA_SPEC_PHASE_RELATIONSHIP` → `mapping.relationships.spec_phase`
- `SPECKIT_JIRA_PHASE_TASK_RELATIONSHIP` → `mapping.relationships.phase_task`

### 3. Parse SPEC.md

Read and parse the specification file to extract:

1. **Title**: First H1 heading (e.g., `# User Authentication System`)
2. **Summary**: Content under the first heading or "Overview" section
3. **Full content**: Entire spec for the Epic description

Example SPEC.md structure:
```markdown
# User Authentication System

## Overview
This specification defines the implementation of...

## Goals
- Goal 1
- Goal 2
```

Extract:
- Epic title: "User Authentication System"
- Epic description: Full spec content (or truncated if too long for Jira)

### 4. Parse TASKS.md for Phases and Tasks

Read and parse the tasks file to extract the phase/task hierarchy:

1. **Phases**: H2 headings starting with "Phase" (e.g., `## Phase 1: Setup`)
2. **Tasks**: List items under each phase (e.g., `- [x] T001 Initialize pnpm workspace...`)

Example TASKS.md structure:
```markdown
# Tasks: User Authentication System

## Phase 1: Setup (Shared Infrastructure)

- [x] T001 Initialize pnpm workspace with Nx and NestJS presets
- [x] T002 Add root tsconfig.base.json with path aliases
- [ ] T003 Configure root eslint.config.mjs

## Phase 2: Foundational (Blocking Prerequisites)

- [x] T010 Generate libs/core scaffold
- [ ] T011 Generate libs/config scaffold
```

Extract into a structure like:
```json
{
  "phases": [
    {
      "name": "Phase 1: Setup (Shared Infrastructure)",
      "tasks": [
        {"id": "T001", "description": "Initialize pnpm workspace with Nx and NestJS presets", "status": "completed"},
        {"id": "T002", "description": "Add root tsconfig.base.json with path aliases", "status": "completed"},
        {"id": "T003", "description": "Configure root eslint.config.mjs", "status": "pending"}
      ]
    },
    {
      "name": "Phase 2: Foundational (Blocking Prerequisites)",
      "tasks": [
        {"id": "T010", "description": "Generate libs/core scaffold", "status": "completed"},
        {"id": "T011", "description": "Generate libs/config scaffold", "status": "pending"}
      ]
    }
  ]
}
```

Task status mapping:
- `[x]` → "completed"
- `[ ]` → "pending"
- `[~]` → "in_progress" (optional convention)

**Also extract, per phase:** `**Purpose**`, `**Goal**`, `**Independent Test**`, `**Checkpoint**` lines, the priority from the heading (`(Priority: P1)`), the user story id (`User Story 1` → `US1`), and whether it is the MVP (`🎯 MVP`). Also parse the `## Dependencies` / `Execution Order` section (if present) for phase-to-phase dependencies.

**Also extract, per task** (format `- [ ] T012 [P] [US1] Description in path/to/file (depends on T010, T011)`):
- `parallel`: `[P]` present
- `story`: `[USn]` tag, if any
- `files`: file paths mentioned in the description
- `depends_on`: task IDs from `depends on …`, `after T0xx`, `requires T0xx`
- `blocked`: `[B]` tag or `BLOCKED` keyword
- `section`: the H3 sub-heading the task sits under (e.g. `Tests for User Story 1`, `Implementation for User Story 1`)

### 4b. Gather Context for Field Content

Read, if present, `plan.md`, `data-model.md`, `contracts/`, and `research.md` from the spec directory, plus `.specify/memory/constitution.md`. From `spec.md`, extract for each user story its **Acceptance Scenarios** (Given/When/Then), its priority, and the related **Functional Requirements** (FR-xxx) and **Success Criteria** (SC-xxx).

Use this context to generate the content of the fields below. All generated text is in **Spanish** (project language), concrete and verifiable — never placeholders such as "TBD" or "N/A".

### 4c. Compute Field Values

**Story points: NEVER set.** Do not send the Story point estimate field on any issue (Epic, Tarea or Subtask) and do not estimate tasks.

**Labels** (deduplicated, lowercase, no spaces): `defaults.<level>.labels` + spec directory name (e.g. `001-user-auth`) + phase slug (`phase-1-setup`) + for tasks: `us1` if `[US1]`, `parallel` if `[P]`, `test` if in a Tests section; for phases: `p1`/`p2`/… from priority, `mvp` if 🎯 MVP.

**Acceptance criteria (`acceptance_criteria`)** — markdown bullet list:
- **Phase (Tarea):** for a User Story phase, the Given/When/Then scenarios of that story from spec.md plus the phase's `Independent Test`; for Setup/Foundational/Polish phases, derive from `Purpose` and `Checkpoint`.
- **Task (Subtask):** 2–5 verifiable criteria specific to the task: the file(s) exist/are modified at the stated path, the behaviour required by the related FR-xxx / scenario, tests pass (for test tasks: the test exists and FAILS before implementation, per TDD note).

**Definition of Ready (`definition_of_ready`)** — CHECKLIST: `population.definition_of_ready` base items + task-specific items: each `depends_on` task as "T0xx completada (KEY)" once known, required design docs (e.g. "Entidad X definida en data-model.md", "Contrato `POST /x` definido en contracts/").

**Definition of Done (`definition_of_done`)** — CHECKLIST: `population.definition_of_done` base items + task-specific items: phase `Checkpoint` (for phases), "Test independiente de la historia superado" (US phases), related SC-xxx success criteria.

**Checklist format for DoR and DoD.** Both fields are rich-text `textarea` fields. Send them as an ADF document containing a single `taskList` (native Jira checkboxes), one `taskItem` per item, all unchecked:

```json
{
  "type": "doc",
  "version": 1,
  "content": [
    {
      "type": "taskList",
      "attrs": {"localId": "dor-T012"},
      "content": [
        {"type": "taskItem", "attrs": {"localId": "dor-T012-1", "state": "TODO"},
         "content": [{"type": "text", "text": "Las dependencias (bloqueantes) están resueltas o identificadas"}]},
        {"type": "taskItem", "attrs": {"localId": "dor-T012-2", "state": "TODO"},
         "content": [{"type": "text", "text": "T010 completada (AB2B-120)"}]}
      ]
    }
  ]
}
```

- `localId`s must be unique within the document: `{dor|dod}-{T0xx|phase-n}` for the list, `-{index}` for each item.
- Use `"state": "DONE"` on every item only when the issue is created already completed (`[x]` in tasks.md; for a phase, all its tasks completed).
- If Jira rejects the ADF value, retry that field as a markdown task list string (`- [ ] item` per line) and report the fallback in the summary.

**Description** (markdown):
- **Epic:** spec overview + user stories with priority + link list of phases (filled after creation is not required).
- **Phase (Tarea):** spec name, Goal/Purpose, Independent Test, priority, checklist of its tasks (`- [ ] T001 …`), phase dependencies.
- **Task (Subtask):** full task text, phase, user story (title + priority), files to touch, `[P]` note ("Se puede ejecutar en paralelo"), dependencies, relevant excerpt of plan.md / data-model.md / contracts, spec-kit status.

**Other fields:**
- `assignee`: `population.assignee_account_id` on every issue
- Team (`team`): `{"id": population.team_id}` only when set
- Epic color (`epic_color`): `population.epic_color` on the Epic only
- Flagged (`flagged`): `[{"value": "Impediment"}]` only for tasks with `blocked = true` and `flag_blocked_tasks: true`
- Sprint: pass `assignToSprint` only when `population.sprint` is not `"none"`
- Fecha de inicio / vencimiento: only when `population.dates` is not `"none"`
- Read-only/automatic fields — never set: development, Clasificación (rank), reporter, attachment, issuerestriction

**Fields per issue type in AB2B:**

| Field | Epic | Tarea (phase) | Subtask (task) |
|-------|:---:|:---:|:---:|
| summary, description, labels, assignee | ✅ | ✅ | ✅ |
| parent | — | Epic | Tarea (required) |
| Story point estimate | ❌ never | ❌ never | ❌ never |
| Criterios de aceptación | — | ✅ | ✅ |
| DoR / DoD (checklist) | — | ✅ | ✅ |
| Color de la incidencia | ✅ | — | — |
| Fecha inicio / vencimiento | ✅ | ✅ | — |
| Team, Sprint, Flagged | ✅ | ✅ | ✅ |
| issuelinks (dependencies) | — | ✅ | ✅ |

Do NOT send a field to an issue type that does not have it (Jira rejects the create).

### 5. Check for Existing Issues

Before creating issues, check if a mapping file already exists at `specs/<spec-name>/jira-mapping.json`.

If it exists:
1. Display existing mapping summary
2. Ask user whether to:
   - Skip existing issues and only create missing ones
   - Re-create all issues (creates duplicates)
   - Abort and review existing mapping

### 6. Create Epic from SPEC.md

Use the configured MCP server to create the Spec issue:

```
Tool: {mcp_server}/createJiraIssue
Parameters:
  - cloudId: {cloud_id}
  - projectKey: {project.key}
  - issueType: {mapping.spec_artifact}
  - summary: {spec_title}
  - description: {epic_description}            # see 4c
  - labels: {epic_labels}
  - assignee: {population.assignee_account_id} # omit if ""
  - additional_fields:
      {field_mappings.epic_color}: {population.epic_color}
      {field_mappings.team}: {"id": population.team_id}   # only if set
      ...defaults.spec.custom_fields
  - assignToSprint: {population.sprint}        # omit if "none"
```
Store the created Epic key (e.g., "PROJ-100") for linking stories.

Display:
```
✅ Created Epic: PROJ-100 - User Authentication System
   URL: https://your-jira.atlassian.net/browse/PROJ-100
```

### 7. Create Stories for Each Phase

For each phase extracted from TASKS.md, create a Story and link it to the Epic.

**First, check if 2-level mode is enabled:**

```
is_two_level_mode = (task_artifact == "" OR task_artifact == "none" OR task_artifact is not set)
```

**Step 7a: Create the Phase Issue**

The Phase description varies based on mode:

**3-Level Mode (default):** Full phase description and all fields (see 4c)
```
Tool: {mcp_server}/createJiraIssue
Parameters:
  - cloudId: {cloud_id}
  - projectKey: {project.key}
  - issueType: {mapping.phase_artifact}
  - summary: {phase_name}
  - parent: {epic_key}                          # when spec_phase == "Parent"
  - description: {phase_description}
  - labels: {phase_labels}
  - assignee: {population.assignee_account_id}
  - additional_fields:
      {field_mappings.acceptance_criteria}: {phase_acceptance_criteria}
      {field_mappings.definition_of_ready}: {phase_dor}   # ADF taskList checklist
      {field_mappings.definition_of_done}: {phase_dod}    # ADF taskList checklist
      {field_mappings.team}: {"id": population.team_id}   # only if set
      ...defaults.phase.custom_fields
  - assignToSprint: {population.sprint}         # omit if "none"
```

**2-Level Mode:** Full task checklist embedded in description
```
Tool: {mcp_server}/createJiraIssue
Parameters:
  - projectKey: {project.key}
  - issueType: {mapping.phase_artifact}
  - summary: {phase_name}
  - description: |
      Phase from spec: {spec_name}

      ## Tasks

      - [x] T001: Initialize pnpm workspace with Nx and NestJS presets
      - [x] T002: Add root tsconfig.base.json with path aliases
      - [ ] T003: Configure root eslint.config.mjs
      ...
  - additional_fields: {defaults.phase.custom_fields}
```

**Step 7b: Link Phase to Spec based on `relationships.spec_phase`**

| spec_phase value | Action |
|------------------|--------|
| `"Parent"` | Set Phase's parent field to Spec key |
| `"Epic Link"` | Set Epic Link custom field on Phase to Spec key |
| `"Relates"` / `"Blocks"` / etc. | Create issue link from Phase to Spec |
| `"none"` | No link created |

Store each Phase key for linking tasks (if 3-level mode).

Display (3-level mode):
```
✅ Created Phase: PROJ-101 - Phase 1: Setup (Shared Infrastructure)
   URL: https://your-jira.atlassian.net/browse/PROJ-101
   Linked to Spec via: {relationships.spec_phase}
   Tasks: 9 tasks to create
```

Display (2-level mode):
```
✅ Created Phase: PROJ-101 - Phase 1: Setup (Shared Infrastructure)
   URL: https://your-jira.atlassian.net/browse/PROJ-101
   Linked to Spec via: {relationships.spec_phase}
   Tasks: 9 tasks (embedded in description)
```

### 8. Create Individual Jira Issues for EACH Task

**⚠️ SKIP THIS STEP IF 2-LEVEL MODE IS ENABLED**

If `task_artifact` is empty (`""`) or `"none"`, skip this entire step and proceed to Step 9.
In 2-level mode, tasks are already embedded in Phase descriptions.

---

#### 3-Level Mode Only

**CRITICAL: This step is MANDATORY in 3-level mode. You MUST create a separate Jira issue for EVERY task listed in TASKS.md.**

DO NOT skip this step in 3-level mode. DO NOT just put tasks in the Phase description. Each `- [ ] T001 ...` line in TASKS.md becomes its own Jira issue.

**For each task item** (e.g., `- [x] T001 Initialize pnpm workspace...`):

**Step 8a: Create the Jira Task issue**

Call the MCP tool to create the task:

```
Tool: {mcp_server}/createJiraIssue
Parameters:
  - cloudId: {cloud_id}
  - projectKey: {project.key}
  - issueType: {mapping.task_artifact}          # "Subtask"
  - parent: {phase_key}                         # REQUIRED for Subtask — set at creation
  - summary: "{task_id}: {task_description}"    # max 255 chars; truncate with "…"
  - description: {task_description_full}        # see 4c
  - labels: {task_labels}
  - assignee: {population.assignee_account_id}
  - additional_fields:
      {field_mappings.acceptance_criteria}: {task_acceptance_criteria}
      {field_mappings.definition_of_ready}: {task_dor}    # ADF taskList checklist
      {field_mappings.definition_of_done}: {task_dod}     # ADF taskList checklist
      {field_mappings.flagged}: [{"value": "Impediment"}]  # only if blocked
      {field_mappings.team}: {"id": population.team_id}    # only if set
      ...defaults.task.custom_fields
  - assignToSprint: {population.sprint}         # omit if "none"
```

If the task is already `completed` (`[x]`) or `in_progress` (`[~]`) in tasks.md, transition it right after creation to `status_mapping.completed` / `status_mapping.in_progress` with `transitionJiraIssue`. Do the same for a phase whose tasks are all completed.

**Step 8b: Link Task to Phase based on `relationships.phase_task`**

| phase_task value | Action |
|------------------|--------|
| `"Parent"` | Already done: `parent` is passed in the create call (mandatory for Subtask) |
| `"Relates"` / `"Blocks"` / etc. | Create issue link from Task to Phase |
| `"none"` | No link created |

**Step 8c: Link Task to Spec based on `relationships.spec_task`**

| spec_task value | Action |
|-----------------|--------|
| `"Epic Link"` | Set Epic Link custom field on Task to Spec key |
| `"Relates"` / `"Blocks"` / etc. | Create issue link from Task to Spec |
| `"none"` | No direct Task-Spec link |

**Repeat steps 8a-8c for EVERY task** in the phase before moving to the next Phase.

**Step 8d: Create dependency links (after ALL issues exist)**

Using `createJiraIssueLink` (via `executeWrite`) with `linkType: {mapping.dependency_link_type}`:
- For each task `depends_on` T0xx: `inwardIssue` = key of T0xx (blocker), `outwardIssue` = key of the dependent task.
- For each phase dependency from the Dependencies section (e.g. "Foundational blocks all user stories"): link blocker phase → dependent phase.
- Skip links whose target task is not in the mapping and report them as warnings.

Then update each Subtask's DoR (`editJiraIssue`) only if it references dependencies by task ID and the Jira keys are now known (replace "T0xx" with "T0xx (AB2B-123)").

Example: If Phase 1 has 9 tasks (T001-T009), you create 9 Jira issues:
```
Creating tasks for Story PROJ-101 (Phase 1: Setup):
  ├── ✅ PROJ-110 - T001: Initialize pnpm workspace
  ├── ✅ PROJ-111 - T002: Add root tsconfig.base.json
  ├── ✅ PROJ-112 - T003: Configure root eslint.config.mjs
  ├── ✅ PROJ-113 - T004: Configure prettier
  ├── ✅ PROJ-114 - T005: Add root vitest.config.ts
  ├── ✅ PROJ-115 - T006: Add .npmrc
  ├── ✅ PROJ-116 - T007: Add Nx workspace config
  ├── ✅ PROJ-117 - T008: Add workspace lint/test scripts
  └── ✅ PROJ-118 - T009: Add .gitignore updates

9 tasks created for Phase 1
```

**IMPORTANT**: The jira-mapping.json must include ALL created task keys. If tasks are missing from the mapping, you have not completed this step correctly.

### 9. Save Issue Mapping

Save a comprehensive mapping file at `specs/<spec-name>/jira-mapping.json`.

**Include `"mode": "2-level"` or `"mode": "3-level"`** to indicate the hierarchy type used.

#### 3-Level Mode Mapping

```json
{
  "created_at": "2026-01-29T10:30:00Z",
  "updated_at": "2026-01-29T10:35:00Z",
  "spec": "001-user-auth",
  "project": "PROJ",
  "jira_base_url": "https://your-jira.atlassian.net",
  "epic": {
    "key": "PROJ-100",
    "summary": "User Authentication System",
    "url": "https://your-jira.atlassian.net/browse/PROJ-100"
  },
  "stories": [
    {
      "key": "PROJ-101",
      "summary": "Phase 1: Setup (Shared Infrastructure)",
      "url": "https://your-jira.atlassian.net/browse/PROJ-101",
      "tasks": [
        {
          "key": "PROJ-110",
          "id": "T001",
          "summary": "Initialize pnpm workspace with Nx and NestJS presets",
          "status": "completed",
          "depends_on": [],
          "url": "https://your-jira.atlassian.net/browse/PROJ-110"
        },
        {
          "key": "PROJ-111",
          "id": "T002",
          "summary": "Add root tsconfig.base.json with path aliases",
          "status": "completed",
          "url": "https://your-jira.atlassian.net/browse/PROJ-111"
        }
      ]
    },
    {
      "key": "PROJ-102",
      "summary": "Phase 2: Foundational (Blocking Prerequisites)",
      "url": "https://your-jira.atlassian.net/browse/PROJ-102",
      "tasks": [
        {
          "key": "PROJ-120",
          "id": "T010",
          "summary": "Generate libs/core scaffold",
          "status": "completed",
          "url": "https://your-jira.atlassian.net/browse/PROJ-120"
        }
      ]
    }
  ],
  "mode": "3-level",
  "links": [
    {"type": "Blocks", "from": "PROJ-110", "to": "PROJ-111"}
  ],
  "summary": {
    "total_stories": 10,
    "total_tasks": 94,
    "completed_tasks": 87,
    "pending_tasks": 7
  }
}
```

#### 2-Level Mode Mapping

```json
{
  "created_at": "2026-01-29T10:30:00Z",
  "updated_at": "2026-01-29T10:35:00Z",
  "spec": "001-user-auth",
  "project": "PROJ",
  "jira_base_url": "https://your-jira.atlassian.net",
  "mode": "2-level",
  "epic": {
    "key": "PROJ-100",
    "summary": "User Authentication System",
    "url": "https://your-jira.atlassian.net/browse/PROJ-100"
  },
  "stories": [
    {
      "key": "PROJ-101",
      "summary": "Phase 1: Setup (Shared Infrastructure)",
      "url": "https://your-jira.atlassian.net/browse/PROJ-101",
      "embedded_tasks": [
        {"id": "T001", "summary": "Initialize pnpm workspace", "status": "completed"},
        {"id": "T002", "summary": "Add root tsconfig.base.json", "status": "completed"},
        {"id": "T003", "summary": "Configure root eslint.config.mjs", "status": "pending"}
      ]
    }
  ],
  "summary": {
    "total_stories": 10,
    "total_embedded_tasks": 94,
    "completed_tasks": 87,
    "pending_tasks": 7
  }
}
```

Note: In 2-level mode, `embedded_tasks` contains task metadata without Jira keys (since no Jira issues were created for tasks).

### 10. Display Summary

Output a complete summary based on the mode used.

#### 3-Level Mode Summary

```
═══════════════════════════════════════════════════════════════
✅ Jira Hierarchy Created Successfully! (3-level mode)
═══════════════════════════════════════════════════════════════

📋 Project: PROJ
📁 Spec: 001-user-auth

Epic: PROJ-100 - User Authentication System
  └── https://your-jira.atlassian.net/browse/PROJ-100

Stories (10):
  ├── PROJ-101 - Phase 1: Setup (9 tasks)
  ├── PROJ-102 - Phase 2: Foundational (17 tasks)
  ├── PROJ-103 - Phase 3: User Story 1 (10 tasks)
  └── ... (7 more)

Summary:
  • Total Stories: 10
  • Total Tasks: 94 (as Jira issues)
  • Completed: 87 (93%)
  • Pending: 7 (7%)

💾 Mapping saved to: specs/001-user-auth/jira-mapping.json

Next steps:
  • View Epic in Jira: https://your-jira.atlassian.net/browse/PROJ-100
  • Sync status later: /speckit.jira.sync-status --spec 001-user-auth
═══════════════════════════════════════════════════════════════
```

#### 2-Level Mode Summary

```text
═══════════════════════════════════════════════════════════════
✅ Jira Hierarchy Created Successfully! (2-level mode)
═══════════════════════════════════════════════════════════════

📋 Project: PROJ
📁 Spec: 001-user-auth

Epic: PROJ-100 - User Authentication System
  └── https://your-jira.atlassian.net/browse/PROJ-100

Stories (10):
  ├── PROJ-101 - Phase 1: Setup (9 tasks embedded)
  ├── PROJ-102 - Phase 2: Foundational (17 tasks embedded)
  ├── PROJ-103 - Phase 3: User Story 1 (10 tasks embedded)
  └── ... (7 more)

Summary:
  • Mode: 2-level (Epic → Stories only)
  • Total Stories: 10
  • Total Tasks: 94 (embedded in Story descriptions)

💾 Mapping saved to: specs/001-user-auth/jira-mapping.json

Next steps:
  • View Epic in Jira: https://your-jira.atlassian.net/browse/PROJ-100
  • Tasks are tracked as checklists within Stories
═══════════════════════════════════════════════════════════════
```

## Configuration Reference

Edit `.specify/extensions/jira/jira-config.yml` to customize:

| Config Key | Description | Default |
|------------|-------------|---------|
| `mcp_server` | MCP server name | "atlassian" |
| `project.key` | Jira project key | (required) |
| `mapping.spec_artifact` | Issue type for SPEC.md | "Epic" |
| `mapping.phase_artifact` | Issue type for Phases | "Story" |
| `mapping.task_artifact` | Issue type for Tasks. Set to `""` or `"none"` for 2-level mode | "Task" |
| `mapping.relationships.*` | Link types between issues | See docs |
| `defaults.spec.labels` | Labels for Spec | [] |
| `defaults.phase.labels` | Labels for Phases | [] |
| `defaults.task.labels` | Labels for Tasks (3-level only) | [] |

## Troubleshooting

### "Jira configuration not found"

Copy the template and configure:
```bash
cp .specify/extensions/jira/jira-config.template.yml .specify/extensions/jira/jira-config.yml
# Edit jira-config.yml with your project settings
```

### "Sub-task cannot have Epic as parent"

Some Jira configurations don't allow subtasks under Epics. The command handles this by:
1. Creating Stories under the Epic
2. Creating Sub-tasks under Stories (not directly under Epic)

### "Issue type not found"

Use `/speckit.jira.discover-fields` to discover available issue types in your Jira project, then update `jira-config.yml` accordingly.

### Custom Fields

If your Jira project requires custom fields (e.g., Team, Sprint), discover them with `/speckit.jira.discover-fields` and add to the config:

```yaml
defaults:
  epic:
    custom_fields:
      customfield_10001: "Platform Team"
  story:
    custom_fields:
      customfield_10002: "Sprint 1"
```

## Notes

- This command creates issues in sequence: Epic → Stories → Tasks
- The mapping file enables `/speckit.jira.sync-status` to sync completion status
- Re-running creates new issues unless you manually update the mapping
- Task IDs (T001, T002) are preserved in Jira summaries for traceability