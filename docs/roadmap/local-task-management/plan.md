# Roadmap: local task management

**Owner:** Product and desktop engineering  
**Date:** 2026-09-25  
**Status:** Proposed  
**Scope:** Clovy Desktop core, with later routines and connector extensions

This document captures a future feature direction. It is a product and
architecture plan, not an implementation authorization. File paths, migration
positions, command names, and protocol details are a starting inventory and
must be re-verified against the current tree when the feature is scheduled.

## Executive recommendation

Build task management as a first-class Clovy capability, not as a plugin. Tasks
should be local, Clovy-owned records in the existing SQLite database alongside
notes, Projects, stored agent sessions, and memory entries. The first release
should provide a useful task view and ordinary Tauri CRUD commands without a
Clovy API deployment or a connected third-party account.

The Clovy-owned agent harness can then use narrowly scoped host tools to read
and mutate tasks through the Rust host. Plugins, routines, and connectors can
add workflows on top of this core, such as extracting follow-ups from a Note or
creating an external issue from a Clovy task. They must not become a parallel
canonical task store.

The intended ownership boundary is:

```text
Tasks view or Clovy agent harness
              |
              v
Tauri commands or versioned runtime protocol
              |
              v
Rust validation and host-tool broker
              |
              v
SQLite task repository
              |
              v
Local task records
```

The agent harness never writes SQLite directly. A plugin never owns the same
task record in a separate file, memory store, or chat transcript.

## Product thesis and terminology

Clovy already captures the context from which work emerges. A task surface
turns that context into durable, actionable follow-through while preserving the
distinction between different kinds of information:

| Entity | Purpose | What it is not |
| --- | --- | --- |
| Task | An actionable item with state, priority, and optional due time | A durable fact or a Note |
| Note | User-authored source material and generated note content | A task list or a meeting entity |
| Memory entry | A durable fact Clovy should remember | A request to do work |
| Agent session | The conversation in which work may be discussed or created | The task record itself |
| Project | The user-facing organizational unit, stored as a `folder` in code | A task-specific workspace |

This separation matters when a user asks why a task exists. Clovy should be
able to show the originating Note or stored agent session without confusing
that source with the task's current state.

The plan uses **Project** in product copy and `folder` or `folder_id` only for
code and persistence, following `CONTEXT.md`. It calls the isolation boundary
the **current data partition**, even though existing SQLite columns and some
historical ADRs use the physical name `profile`. A task's session link always
means a stored agent session id, never the ephemeral runtime session id.

## Roadmap status

**This table is the single source of truth for this feature's phase status.**
The detailed phase sections repeat each status so the roadmap is readable in
context. Vocabulary: `not started` | `in progress` | `done` | `blocked` |
`deferred`.

| Phase | Status | Exit criterion | Evidence or blocker |
| --- | --- | --- | --- |
| 0: contract and UX definition | **not started** | Product behavior, persistence invariants, accessibility contract, and mutation policy are accepted | This plan and the task workbench sketch are the current proposal; no implementation issue or design review is active |
| 1: local task foundation | **not started** | Local CRUD works through Tauri with no agent or network dependency | Depends on Phase 0 decisions and a reviewed schema or ADR where the boundary meets the ADR test |
| 2: Tasks view | **not started** | Users can manage tasks in Clovy and recover from failed or stale mutations | Depends on the local command contract and real-app visual review |
| 3: agent interaction | **not started** | Host tools provide scoped task workflows without bypassing Rust policy | Depends on reliable local CRUD and an owning, versioned host-tool contract |
| 4: workflows and extensions | **not started** | Note extraction, routines, and connectors compose with canonical local records | Depends on usage evidence and separate connector, routine, and external-identity decisions |

## Goals

- Give Clovy a dependable local task view even when no plugin is enabled.
- Make task state inspectable and editable by the user.
- Link tasks to the Project, Note, and stored agent session that provided
  context, without making those links required.
- Let the agent query relevant tasks on demand instead of injecting every task
  into every prompt.
- Keep all local mutations behind Rust validation, persistence, and safety
  policy.
- Make future routines and connectors composable without moving canonical
  ownership out of Clovy.
- Preserve private-by-architecture behavior: the local task database is not
  sent to Clovy API merely because the Tasks view exists.
- Keep the first release useful without requiring reminders, recurrence, sync,
  or an external account.

## First-release non-goals

- Cloud synchronization or multi-device task state.
- Shared tasks, assignees, comments, or organization-level permissions.
- Recurring tasks, reminders, notifications, or calendar scheduling.
- Two-way synchronization with an external task or issue provider.
- A third-party plugin marketplace or plugin-owned task database.
- Automatically converting every sentence in a Note or chat into a task.
- Hard deletion as the normal way to remove a task. Cancellation retains the
  record in the first version.
- Replacing Projects, Notes, memory entries, or agent sessions with a unified
  object.
- Treating the legacy `agent_tasks` runtime records as product tasks.

## Existing architecture and reusable seams

This section describes shipped infrastructure that the feature can reuse. It
also separates that infrastructure from task-specific seams that do not exist
yet. Nothing below authorizes implementation.

### Local SQLite and data partition

- `src-tauri/src/db/migrations.rs:249` owns the release-ordered migration
  catalog. The current catalog reaches version 50 at
  `src-tauri/src/db/migrations.rs:1334`. ADR-0037 requires contiguous,
  append-only catalog entries and keeps SQL files under `src-tauri/migrations/`.
  An implementation must choose the next catalog position when scheduled; this
  plan does not reserve a number or a filename.
- `src-tauri/src/db/repositories.rs:1705-1922` shows profile-scoped Project
  and memory repository methods. `:1925-2118` shows scoped memory reads and
  writes, including validation that a Project belongs to the same partition.
  `:2160-2602` contains Note and stored-session-to-Project patterns.
- `src-tauri/src/db/repositories.rs:2495-2602` validates Note and stored session
  links against the current data partition before assignment. The same shape
  is a reusable precedent for task source-link validation, not a promise that a
  task table or a task repository exists.
- `src-tauri/src/commands.rs:3214-3217` currently exposes an
  `active_profile` seam that returns `default`. The plan treats the repository's
  profile argument as the established physical partition interface, while
  avoiding a claim that a multi-partition selector UI is currently shipped.
  Task commands must obtain the current partition through the current command
  boundary rather than trust a renderer-supplied partition.
- Existing profile-scoped rows and the session mapping tables are covered by
  ADR-0031. Product copy should say current data partition, not Profile.

### Domain, Tauri, and frontend boundaries

- `src-tauri/src/domain/types.rs:3-24` defines the `AppError` shape and
  conversion from SQLite errors. Existing DTOs use `serde(rename_all =
  "camelCase")`; `FolderDto` is at `:49-64`, `MemoryDto` at `:76-86`, and
  `NoteListItemDto` at `:105-118`. New task DTOs and request types should follow
  these conventions if Phase 1 confirms them.
- `src-tauri/src/commands.rs:445-721` provides the current Project, stored
  session-link, and memory command patterns. `src-tauri/src/lib.rs:179-289`
  registers the Tauri command surface explicitly. A future task command set
  should be additive and explicit rather than hidden behind a generic database
  command.
- `src/lib/tauri.ts:211-226` contains typed Project and stored-session mapping
  payloads, and `:865-906` contains typed invoke wrappers for those commands.
  Task bindings are tentative and must be added only after the Rust command
  contract is accepted.
- The current repository has no product task table, Task DTO, Tasks navigation,
  or task command. The old `agent_tasks` history is runtime data and is not a
  suitable canonical store.

### Agent harness and host tools

- ADR-0038 makes the Clovy-owned TypeScript agent harness an orchestration
  process over versioned newline-delimited JSON-RPC on stdio. Rust remains the
  authority for persistence, validation, tools, approvals, and local safety.
- `src-tauri/src/agent_runtime/tools.rs:22-32` defines `ToolContext`, and
  `:113-150` is the host dispatch boundary. New task operations would reuse
  this broker and its `AppError` handling, but their names and approval behavior
  remain tentative.
- `src-tauri/src/agent_runtime/api.rs:2211-2310` assembles current tool
  descriptors. Any task tool descriptor must be named and versioned in an
  owning contract before code is written, following `spec/mcp-tool-naming.md`.
- `src-tauri/src/agent_runtime/host.rs:1-29` owns the local runtime host and
  `src-tauri/src/agent_runtime/protocol.rs:4-25` declares protocol version 1.
  The runtime protocol is a reusable boundary, not a reason to expose the
  SQLite database to the harness.
- ADR-0040 requires Clovy-owned capabilities to be in-loop host tools, never
  Clovy-managed MCP servers. ADR-0039's MCP path remains for genuinely
  external, user-connected servers.

### Design and interaction patterns

There is no existing task surface or task sketch. Phase 0 should compose the
existing system rather than create a parallel visual language:

- `src/components/sidebar/Sidebar.tsx:1171-1255` is the current primary
  navigation pattern.
- `src/components/agent/AgentSessionsList.tsx:117-205,302-376` provides
  searchable list filtering, stable selection behavior, empty states, and
  action recovery patterns.
- `src/components/ui/Dialog.tsx:38-163` provides modal semantics, focus trap,
  Escape handling, backdrop dismissal, and focus restoration.
- `src/components/ui/EmptyState.tsx`, `InlineNotice.tsx`, and `Spinner.tsx`
  are the canonical empty, error, and loading primitives.
- `docs/design/components.md:13-32` maps recurring patterns to canonical
  primitives. `docs/design/foundations.md` and `docs/design/conventions.md`
  define the token, type, spacing, focus, hover, and scroll-fade rules.
- The task sketch at [sketch.html](sketch.html) is a static interaction
  reference for Phase 0. It uses clearly marked example tasks and demonstrates
  the proposed list/detail shape, lens navigation, filters, keyboard hint,
  state feedback, and a responsive collapsed layout. It is not a production
  component or an implementation contract.

## Proposed first-version experience

### Tasks area

Add a first-class Tasks area to Clovy navigation with these views:

- **Inbox:** tasks without a resolved next step or explicit scheduling.
- **Today:** open tasks due today, plus overdue tasks shown clearly as overdue.
- **Upcoming:** open tasks with a future due time.
- **Projects:** tasks grouped or filtered by Project.
- **Completed:** tasks whose status is `done`.

Provide an all-task search and filter path so users are not forced to infer
which view contains a task. Ordering should be stable and predictable: overdue
and due items first, then priority, then updated time, with a stable id or other
explicit user-visible tie-breaker if needed.

The task list should support:

- creating a task with a title;
- inline status and priority changes where the transition is unambiguous;
- opening a detail panel;
- filtering by status, priority, due range, Project, and source link;
- opening the linked Note or stored agent session;
- cancelling a task without destroying its history;
- visible loading, empty, no-match, stale-selection, and mutation-error states.

The UI should use the existing Clovy design system and enforce the rules in
`spec/` for sentence case, typography, tokens, controls, focus, icons, and
scrolling. Labels should use sentence case, such as "In progress" and
"Completed", even though internal status values remain stable lowercase
identifiers.

### Task detail

The detail view should support these first-version fields:

- title;
- description;
- status;
- priority;
- due time, represented as an optional UTC instant and rendered in the local
  timezone;
- Project;
- linked Note;
- linked stored agent session;
- created and updated timestamps;
- a clear indication when the task was created from an agent or routine.

A change-history or activity timeline is useful, but it must not block the first
task view. If it is not included, the implementation issue must keep it as an
explicit follow-up rather than implying that `updated_at` is a complete audit
history.

### Context links

A task can be:

- global, with no Project;
- associated with one Project, represented by `folder_id` in persistence;
- linked to the Note that produced or motivated it;
- linked to the stored agent session in which it was created or discussed.

When the current agent session is filed in a Project, that Project may be the
default task destination only when the context is unambiguous. The UI and agent
must make the association visible. They must not silently attach a task to a
Project when the user has supplied conflicting or ambiguous context.

## Proposed local data contract

The following is a recommended shape for Phase 0 review, not a schema approval.
It deliberately uses a physical `profile` column only to match the existing
partition convention. Product and command documentation should call this the
current data partition.

| Field | Type and behavior |
| --- | --- |
| `id` | Stable local identifier using the existing Clovy id convention |
| `profile` | Current data partition; every read and mutation is scoped by it |
| `title` | Required, trimmed, bounded text |
| `description` | Optional bounded text |
| `status` | `inbox`, `next`, `in_progress`, `waiting`, `done`, or `cancelled` |
| `priority` | `none`, `low`, `medium`, or `high` |
| `due_at` | Optional UTC timestamp; date-only and all-day behavior remains deferred |
| `folder_id` | Optional Project link; `folder` is the persistence name |
| `source_note_id` | Optional Note link |
| `source_session_id` | Optional stored agent session id, never a runtime session id |
| `origin` | Host-recorded origin such as `user`, `agent`, `routine`, or `extraction` |
| `created_at` | Required creation timestamp |
| `updated_at` | Required last-change timestamp |
| `revision` | Monotonically increasing optimistic-concurrency revision |
| `completed_at` | Set when entering `done`, cleared when reopened |
| `cancelled_at` | Set when entering `cancelled`, cleared when reopened |

The current product recommendation retains all six proposed statuses. `inbox`
is the capture state, `next` is an actionable state, `in_progress` is active
work, `waiting` is blocked on another person or event, and `done` and
`cancelled` are retained terminal states. Phase 0 must still confirm the copy,
transition matrix, and whether users need every state visible in the first UI.

The database should enforce status and priority enums with constraints, not rely
only on frontend validation. Add indexes for common partition, status, due-time,
Project, Note, and stored-session queries. Task creation and updates should be
transactional with timestamp changes. The first version should use cancellation
as a retained terminal state rather than normal hard deletion.

Tasks are independent records. Removing a source Note or stored session must not
silently delete a task. Removing a Project must likewise have an explicit policy
for its tasks, such as moving them to the global list or requiring a user choice.
It must never cause accidental task loss.

## Rust and Tauri command direction

The Rust host remains the authority for task validation, data partition scoping,
link validation, status transitions, optimistic concurrency, and persistence.
The likely implementation inventory is:

- `src-tauri/src/db/migrations.rs` and a new migration entry for the schema;
- `src-tauri/src/db/repositories.rs` for task queries and mutations;
- `src-tauri/src/domain/types.rs` for task DTOs and request types;
- `src-tauri/src/commands.rs` for renderer-facing commands;
- `src-tauri/src/lib.rs` for explicit command registration;
- `src/lib/tauri.ts` for typed frontend bindings.

The initial command surface is proposed as:

- `list_tasks` with bounded filters and pagination;
- `get_task` by id;
- `create_task`;
- `update_task` for non-terminal fields and supported status transitions;
- `complete_task`;
- `cancel_task`.

`complete_task` and `cancel_task` should be idempotent where possible and return
the resulting task. Reopening can initially use `update_task`; a dedicated
`reopen_task` command can be added if the UI or agent contract benefits from a
narrower operation.

The command layer must reject:

- task ids from another data partition;
- source ids that do not exist or are not visible in the current partition;
- invalid enum values;
- oversized title or description values;
- impossible timestamp transitions;
- stale revisions or ambiguous Project associations that the caller has not
  resolved.

These command names are a proposal only. Phase 0 must decide whether a
narrower command shape improves confirmation, idempotency, and error recovery
before an implementation issue names them as a contract.

## Agent interaction direction

The agent surface should follow ADR-0038 and ADR-0040: task operations are
Clovy-owned in-loop host tools, not a Clovy-managed MCP server. The likely first
tool set mirrors the local command intent:

| Tool | Purpose | Default result shape |
| --- | --- | --- |
| `create_task` | Create one task after validating its fields and links | Created task summary |
| `list_tasks` | Query open or explicitly requested tasks | Bounded task summaries and counts |
| `get_task` | Fetch one task by stable id | Full task detail and links |
| `update_task` | Change editable fields or a supported status | Updated task summary |
| `complete_task` | Mark one task as done | Updated task summary |
| `cancel_task` | Retain a task while marking it cancelled | Updated task summary |

These names remain proposed until an owning contract is accepted. They must
follow `spec/mcp-tool-naming.md` and must not be implemented merely because they
appear in this roadmap.

The host should fill metadata that belongs to Clovy, such as the current data
partition, the stored agent session id, and the creation origin. The model may
supply an explicit Note or Project id only when the host can validate that it is
visible and allowed for the current session.

Tool behavior should follow these principles:

1. List results are compact. The agent fetches full details only when needed.
2. Queries are scoped to the current data partition and never expose unrelated
   Projects by default.
3. A session's Project context is a default only when it is unambiguous and is
   shown in the tool result.
4. Note-to-task extraction is a proposal workflow. The agent first presents the
   proposed task fields and creates records only after user confirmation.
5. An explicit user instruction can create or update one clearly identified task
   without asking the user to confirm the same instruction twice. Ambiguous or
   inferred mutations stop and ask for the missing choice.
6. Cancellation, bulk changes, and any future hard deletion require an approval
   or confirmation surface appropriate to the operation.
7. Routine-created tasks use an explicit routine policy. The connector-oriented
   `trust mode` must not silently become permission for all local data mutations.
8. Tool errors are actionable and are not swallowed by a generic assistant
   response.
9. Task titles, descriptions, Note content, and provider-derived text are
   untrusted data. They cannot grant themselves tools or bypass confirmation.

## Open questions and policy gates

Phase 0 must resolve these gates before the migration, command schemas, or host
tool descriptors are treated as implementation-ready:

1. **Status contract:** confirm the six-state vocabulary, user-facing labels,
   legal transitions, and whether `cancelled` can be reopened.
2. **Due semantics:** the current recommendation is an optional UTC instant
   rendered in the local timezone. Decide whether date-only or all-day tasks
   belong in v1 and define behavior when the timezone changes.
3. **Project deletion:** decide whether linked tasks move to the global list,
   require a choice, or block Project deletion.
4. **Source deletion:** decide whether a deleted Note or stored session clears
   the link or leaves a visible source-unavailable reference.
5. **Revision behavior:** decide the stale-revision error shape and whether the
   UI refreshes, merges, or asks the user to choose.
6. **Cancellation and deletion:** confirm that cancellation is the retained
   terminal path and define any exceptional hard-delete policy.
7. **Origin and approval:** define which user, agent, extraction, and routine
   mutations execute directly and which require approval.
8. **Routine scope:** decide whether local task writes get a dedicated routine
   capability or an explicit local-task scope in the existing routine policy.
9. **Task references:** decide whether a future `@task:<id>` composer token is
   worth adding and what happens when its task is unavailable.
10. **External identity:** if a connector creates an external item, define the
    minimum opaque reference and reconciliation fields without implying
    two-way synchronization.
11. **History:** decide whether `updated_at` is adequate for v1 or a task
    activity table is required before users trust agent-created changes.
12. **ADR boundary:** create an ADR only if the accepted design settles a hard-
    to-reverse, surprising trade-off between the local store, host-tool
    contract, and future synchronization. This roadmap does not create one.

## Plugins, routines, and connectors

The core task system ships first. Extensions layer on top:

### Task extraction

A future workflow can inspect a specific Note, identify actionable follow-ups,
show a confirmation-oriented proposal, and create tasks with `source_note_id`
and `source_session_id` links. It must not scan every Note or write inferred
tasks without a visible review step.

### Daily planning and review

A routine can query today's, overdue, and waiting tasks, then produce a plan or
ask the user which items to reprioritize. Generated local mutations require an
explicit routine policy and should begin in approval mode. Scheduled reminders
and unattended execution are later features, not prerequisites for the task
database.

### External connectors

A connector may offer an explicit action such as "Create an external issue from
this Clovy task." The Clovy task remains the local canonical record and stores
only an opaque external reference if that action is accepted. External
synchronization is deferred until identity mapping, conflict resolution,
provider deletion semantics, retry behavior, and privacy boundaries are
specified. Connector writes remain approval-gated and provider-specific.

## Safety, privacy, and compatibility invariants

- The task database is local Clovy-owned state. The first version does not
  require Clovy API, OS Accounts billing, or an upstream provider call.
- The agent harness receives task data only through bounded host-tool results. It
  does not receive an automatic dump of all tasks at run start.
- Host tools enforce data partition, link visibility, validation, revision, and
  mutation policy. Prompt instructions are not a security boundary.
- Task descriptions are untrusted input when they enter an agent run. A task
  description must never grant itself tools or bypass confirmation.
- Direct user requests, inferred task extraction, and routine-generated
  mutations are distinct origins and should be visible where that explains
  behavior.
- Local task changes are not included in telemetry or issue reports by default.
  Any future export or connector action states exactly what leaves the device.
- A task link uses the stored agent session id when it points to a session;
  runtime session ids are ephemeral and must not become durable task identity.
- Removing a source or Project never silently deletes a task. The selected
  deletion policy is transactional and testable.
- No local task data crosses a network boundary merely because the Tasks view or
  local CRUD exists.
- The desktop change does not require a Clovy API deploy. Any future external
  connector is a separate compatibility and privacy decision.

## Implementation phases

### Phase 0: contract and UX definition

**Status: not started.**

- Confirm the six-state status and priority vocabulary.
- Confirm the UTC instant recommendation, local rendering, and any deferred
  date-only behavior.
- Define task list navigation, detail behavior, empty states, filtering,
  selection, stale-selection recovery, and source-link actions.
- Decide Project, Note, and stored-session deletion behavior.
- Define the revision and mutation confirmation contract.
- Decide whether a task activity table is needed before trusting agent changes.
- Write an ADR and the owning host-tool contract only if the ADR test and tool
  contract gates are met.
- Review [the task workbench sketch](sketch.html) against the existing Clovy
  design system and keyboard/focus rules.

**Exit criterion:** product and design review accept the user-visible contract,
copy, accessibility semantics, privacy invariants, status transitions, and
persistence policy. Evidence is the accepted Phase 0 decision record and an
implementation issue, if one is opened.

### Phase 1: local task foundation

**Status: not started.**

- Add the versioned SQLite migration and repository methods.
- Add domain DTOs, validation, revision checks, and Tauri commands.
- Add frontend bindings and focused Rust repository tests.
- Verify data partition isolation, idempotent completion and cancellation, link
  validation, source deletion behavior, and migration behavior on existing
  databases.
- Keep the local path independent of the agent harness and network.

**Exit criterion:** a task can be created, listed, fetched, updated, completed,
and cancelled through Tauri with no agent or network dependency. Evidence is a
green focused Rust and binding test set plus migration evidence on fresh and
existing databases.

### Phase 2: Tasks view

**Status: not started.**

- Add Tasks navigation and the Inbox, Today, Upcoming, Projects, and Completed
  views.
- Add the list/detail experience, filters, ordering, source links, and the
  first-release create flow.
- Follow the existing design-system specs, `Dialog`/`EmptyState`/`Spinner` /
  `InlineNotice` patterns, and accessibility behavior.
- Add frontend tests for loading, empty and no-match states, focus, stale
  selection, optimistic or refreshed mutations, and failed mutations.
- Perform real-app visual QA in light and dark themes, including the collapsed
  sidebar and narrow window behavior.

**Exit criterion:** a user can manage a useful task list entirely from the Clovy
UI and recover cleanly from a failed mutation, stale revision, missing source,
or stale selection. Evidence is deterministic frontend coverage and a dated
real-app screenshot or recording in the implementation work.

### Phase 3: agent interaction

**Status: not started.**

- Register the accepted host-tool schemas in the Clovy agent runtime.
- Route every tool through the Rust broker and repository.
- Add confirmation behavior for extraction, ambiguous changes, cancellation,
  and bulk operations.
- Add runtime protocol and tool-catalog fixtures for compact results,
  partition scoping, revision errors, and actionable failures.
- Add task-aware chat affordances only after the base tools are reliable.

**Exit criterion:** a user can ask Clovy to create, find, inspect, update, and
complete tasks without the agent receiving unrelated task data or writing around
Rust policy. Evidence is a protocol fixture set, host-tool tests, approval
checks, and an end-to-end local request through SQLite and back to the run.

### Phase 4: workflows and extensions

**Status: not started.**

- Add confirmed Note-to-task extraction.
- Add a daily task review routine with explicit task-write policy.
- Measure real usage before adding reminders, recurrence, or richer history.
- Design the first one-way connector action only after the local task model
  proves stable.
- Keep external references opaque and preserve the local record as canonical.

**Exit criterion:** extensions compose with the same canonical task records and
cannot create a parallel source of truth. Evidence is a reviewed workflow
contract, approval tests, privacy review, and provider-specific decisions for
any connector action.

## Verification strategy

### Rust and persistence

- Migration tests for fresh and existing databases under the append-only
  catalog.
- Repository tests for current data partition isolation.
- Validation tests for enum, length, timestamp, revision, and source-link rules.
- State-transition tests for `inbox`, `next`, `in_progress`, `waiting`, `done`,
  and `cancelled`.
- Tests proving source deletion does not silently delete tasks.
- Query tests for Inbox, Today, Upcoming, Project, Completed, overdue, stable
  ordering, and bounded pagination.
- Tests proving the host tool cannot address a task outside its allowed
  partition or session context.

### Frontend

- Tauri binding tests for each command and error path.
- Component tests for each task view, detail editing, filters, source links,
  loading, empty states, stale selection, and failed mutations.
- Accessibility checks for keyboard navigation, status controls, list semantics,
  focus after a mutation, and focus restoration after dialogs.
- Checks that task copy uses sentence case, sanctioned icons, design tokens,
  type-scale tokens, and no typographic dashes.
- Visual QA in the real app before the feature is marked ready. Attach a
  screenshot or recording to the implementation work as required by repository
  conventions.

### Agent runtime

- Tool catalog and runtime protocol fixture tests.
- Contract tests that list results stay bounded and omit unrelated fields.
- Approval tests for proposed extraction, ambiguous Project selection,
  cancellation, and bulk changes.
- Tests that a malicious task description is returned as data and cannot alter
  host policy.
- Tests for current data partition scoping, stored versus runtime session ids,
  revision conflicts, actionable errors, and idempotent terminal operations.
- End-to-end tests from an agent request through the Rust broker to SQLite and
  back to the conversation.

### Documentation and rollout

- Validate all local Markdown and HTML links from the dedicated roadmap folder
  and both indexes.
- Confirm the README project row and every detailed phase heading agree on
  project and phase status.
- Preserve unrelated dirty-tree changes and inspect untracked roadmap files
  separately from ordinary `git diff` output.
- Roll out the local foundation in an rc build first, with a safe disable path
  for agent tools if that matches the existing feature-flag model. Preserve all
  task records when agent tools are disabled; the UI remains a local manager.

Measure at least:

- users who create at least one task;
- weekly active task users;
- completion and cancellation rates;
- time from Note or agent session to first linked task;
- task extraction proposal acceptance and correction rates;
- mutation errors and duplicate-operation reports.

Telemetry must remain metadata-only unless a separate export or privacy review
accepts more detail.

## Explicit future ideas and follow-ups

The following ideas are intentionally collected here rather than implied as
first-version requirements:

- Extract follow-up tasks from a specific Note with a reviewable proposal.
- Ask Clovy for open tasks associated with a Note, Project, or stored session.
- Daily planning that turns due and overdue tasks into a focused agenda.
- Morning task review through a routine while preserving approval for writes.
- Task references in chat and a "why does this exist?" source explanation.
- Project-specific task views driven by Project instructions without mixing
  instructions and task data.
- One-way creation of an external issue or task with an approval preview.
- Calendar-aware due-time suggestions without making a calendar connector a
  prerequisite.
- Task activity history and local export after the core model proves stable.
- A future sync design with explicit conflict, deletion, and privacy rules.

## Decision summary

When scheduled, start with a local Clovy-owned task system and a small Tasks
view. Make the Rust host the only mutation boundary. Retain the six-state task
vocabulary as the Phase 0 baseline and model v1 due times as UTC instants unless
Phase 0 explicitly changes that decision. Add agent tools after local CRUD is
reliable and after their owning contract names the tools. Treat Note extraction,
routines, and external connectors as layered workflows, not alternative stores.
Keep synchronization, recurrence, reminders, collaboration, and hard deletion
out of the first release until their data and safety contracts are separately
accepted.
