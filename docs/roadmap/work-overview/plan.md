# Roadmap: work overview

**Owner:** Product and desktop engineering  
**Date:** 2026-10-01  
**Status:** Proposed  
**Scope:** Clovy Desktop primary navigation and a read-only, cross-entity view of current work status

This document captures a future product and architecture direction. It is not an
implementation authorization, launch commitment, ADR, or issue. The file paths,
provider contracts, and component names below are a starting inventory and must
be re-verified against the current tree when the feature is scheduled. This
roadmap does not add a Tauri command, SQLite migration, provider, endpoint,
runtime protocol field, issue, ADR, commit, or push.

## Executive recommendation

Add a first-class **Overview** destination to Clovy's primary navigation. Its
single job is project-first orientation: in a few seconds, the user can see what
is happening across all Projects, then open one Project and see only the work,
activity, mail, calendar, and commitments belonging to that Project.

Overview is a read-only, data-partition-scoped lens. It has an explicit scope:
**All Projects** is the initial aggregate view, and selecting a Project changes
the entire page to that Project. It is not a collection of unrelated source
cards and it does not attempt to reproduce each connected product.

```text
Overview
  |
  +--> Scope: All Projects | Project A | Project B | ... | No Project
  |
  +--> All Projects: aggregate project summaries and cross-project attention
  |
  `--> Project: Now / Needs attention / Today / Recent activity
             + local Notes and agent sessions
             + Microsoft Calendar, Mail, and To Do via bounded MCP reads
             + Project involvement context
```

The requested Calendar, Mail, To Do, and second-brain data are expected to arrive
through Microsoft MCP, but no accepted MCP tool contract exists in the current
repository. Those parts must remain connector-needed until their bounded read
contracts are accepted. The plan must not invent a local task store, treat the
runtime `todo` toolset id as Microsoft To Do, infer Project membership from
untrusted message text, or make an unbounded MCP transcript the source of a
summary.

The Overview owns no records. Every row links back to the canonical surface that
owns the entity: a Calendar event opens its verified provider link, an agent
session opens the Agent view, a Project opens Projects, a Note opens the note
editor, a routine opens Routines, and a Microsoft Mail or To Do item opens its
provider-backed destination only when the provider contract supplies a safe deep
link.

## Product thesis and entity distinctions

Clovy captures work across Projects and source systems with different lifecycles.
Today a user must inspect Projects, Sessions, Notes, and Routines separately, and
leave Clovy for Microsoft work context. A project-first Overview gives a quick
answer at two levels: the aggregate view shows which Projects need attention,
and a selected Project shows what is active now, what changed recently, what is
coming up today, and what needs a decision or next action inside that Project.
The underlying entities keep their existing ownership and lifecycle.

The product label is **Overview**, not Dashboard. `CONTEXT.md` explicitly
reserves **Home conversation** for Clovy's persistent relationship-level chat
and lists "dashboard" under its terms to avoid. Overview is a separate
structured surface; it does not replace, rename, or add status panels to Home.

| Entity | Overview role | Source of truth | First owner view |
| --- | --- | --- | --- |
| High priority | A derived, bounded lens over source-backed attention signals | The source entity and its status / priority fields | The source's own view |
| Calendar event | A bounded Today agenda item and time anchor inside the selected Project | Future Microsoft Calendar MCP read path with explicit Project mapping | Verified Microsoft Calendar link |
| Email message | Project-scoped Mail context and recent activity, not a mailbox mirror | Future Microsoft Mail MCP read path with explicit Project mapping | Verified Mail provider link |
| Active agent session | A live Clovy work item filed in the selected Project | `AgentSessionDto`, runtime events, and session-to-folder mapping | Agent view or Sessions |
| Commitment | An external Microsoft To Do item mapped explicitly to the selected Project | Future delegated Microsoft To Do read adapter | Microsoft provider destination |
| Involvement status | A second-brain relationship or work-state classification: high, medium, low, or simmering | Future bounded MCP read of second-brain records with Project scope | Second-brain source or Project view |
| Project | The scope selector and aggregation boundary | `FolderDto`, note folder ids, and session folder ids | Projects |
| Note | Recent or processing work filed in the selected Project | `NoteListItemDto` in app state | Note editor |
| Routine | Scheduled or recently run automation, with Project scope only when explicit | Clovy-owned routine and run-history bindings | Routines |
| Memory entry | Durable context, not an actionable work item | Clovy-owned SQLite memory store | Project detail or Settings |

### Now, next, and recent vocabulary

The primary information architecture is temporal rather than source-first:

- **Now** means something is currently happening: a running agent session, an
  event in progress, a routine run in progress, or a provider item explicitly
  marked active. It must not be inferred from a stale update timestamp alone.
- **Next** means the next bounded calendar event, the next actionable commitment,
  or the next local item that needs a user decision. It is a selection, not a
  complete queue.
- **Recent activity** means a compact chronological timeline of bounded events
  that actually happened or changed: a completed or interrupted agent run, a
  Note becoming ready or needing recovery, a routine run outcome, a calendar
  event that ended, or an external item changing state. Every entry includes a
  source, timestamp, and owning destination. The timeline is not an audit log and
  does not claim completeness across providers.

The source sections remain useful as drill-down context, but the page should not
lead with one card per integration. The first scan should lead with the current
moment, the next decision, and the recent story.

### High priorities vocabulary

The user request calls for cross-entity high priorities. Clovy has no universal
priority field across sessions, Projects, Notes, routines, and provider items, so
Overview must not assign an arbitrary numeric score or infer importance from a
title. The recommended first contract is a source-backed attention lens:

- an active agent session waiting for the user or interrupted;
- a Note in a recoverable, failed, or user-action-required processing state;
- a routine with a failed recent run or an accepted action that needs review;
- a Microsoft To Do item marked high importance or overdue, once the connector
  exposes those semantics;
- a Project rollup only when one of its visible child items qualifies, with the
  reason and child source shown.

The first release should display the reason beside each item, such as "Needs
your answer", "Recoverable recording", "Failed run", "High importance", or
"Overdue". Phase 0 must decide whether the heading remains **High priorities**
or becomes the more literal **Needs attention** while preserving the user's
cross-entity intent.

### Commitments vocabulary

**Commitments** means external Microsoft To Do items only for this roadmap. It
does not mean active agent sessions, Clovy routines, Notes, or a future local
Tasks view. Active agent sessions remain a separate section because a session is
a conversation and runtime work state, not an external commitment record.

The local task-management roadmap remains a sibling workstream. It proposes a
Clovy-owned task store and explicitly defers external synchronization until
identity mapping, conflicts, deletion, retry, and privacy semantics are
specified. This Overview plan does not expand that roadmap or introduce a
second local task model.

## Roadmap status

This table is the single source of truth for this feature's phase status. Phase
headings below repeat these statuses. Vocabulary is `not started`, `in progress`,
`done`, `blocked`, and `deferred`.

| Phase | Status | Exit criterion | Evidence or blocker |
| --- | --- | --- | --- |
| 0: contract and UX definition | **not started** | The project-first scope model, All Projects aggregate, selected Project view, No Project behavior, temporal hierarchy, priority semantics, sidebar placement, partial-failure behavior, data freshness, and Microsoft MCP dependency are accepted | This plan and the Overview sketch are proposals; no design review or implementation issue is active |
| 1: local Project-scoped Overview shell | **not started** | Users can open Overview, compare Projects, select a Project, and navigate through scoped active sessions, local status signals, Notes, and routines without a new network dependency | Depends on Phase 0; existing local data seams are available, but no Overview route or scope selector exists |
| 2: Microsoft MCP read contract | **blocked** | Project-scoped Calendar, Mail, To Do, and second-brain read tools, explicit Project mapping, auth boundary, bounds, freshness, error states, and verified deep links are accepted | Blocked on the external Microsoft MCP configuration and a reviewed tool inventory; no Microsoft provider is currently registered |
| 3: Project-scoped Today, Mail, Commitments, and Involvement | **blocked** | A selected Project shows bounded Microsoft Calendar, Mail, To Do, and second-brain data; All Projects shows only safe aggregates; each source has isolated failure states | Depends on Phase 2; the source tools may arrive together or separately |
| 4: cross-entity priority and reliability | **not started** | Needs attention combines scoped local and Microsoft signals with stable ordering, visible reasons, safe Project mappings, and isolated stale/error states | Depends on Phase 3's item contracts and real-app evidence across aggregate, selected-Project, and disconnected states |
| 5: agent query follow-up | **deferred** | A separately accepted, bounded host-tool contract supports on-demand Overview summaries without prompt injection or automatic data dumps | Deferred until usage evidence supports it and an owning contract passes the host-tool naming and ADR checks |

## Goals

- Make Overview **project-first**: start at All Projects, then scope the whole
  page to one selected Project.
- Make the aggregate view useful for comparing Projects without leaking content
  from one Project into another.
- Within a selected Project, answer what is happening now, what needs attention,
  what is next today, and what changed recently.
- Keep Active agent sessions, Mail, Calendar, Commitments, and Involvement as
  separate source semantics while presenting their signals in one Project scope.
- Show a compact recent activity timeline with source, Project, and timestamp on
  every entry.
- Show cross-entity Needs attention only from authoritative, source-backed state.
- Show the second-brain's four involvement states as a compact distribution of
  second-brain records for the current scope, with counts and labels that remain
  understandable without color.
- Make every item navigable to its owning view or a provider-supplied deep link.
- Add Overview as a new top-level sidebar destination rather than changing Home.
- Make Microsoft Calendar, Mail, and To Do sections honest when disconnected,
  unavailable, stale, or not yet supported.
- Keep Phase 1 useful with local data and no new Clovy API or external network
  requirement.
- Keep every read scoped to the current data partition where the source is
  partitioned.
- Use existing Clovy primitives and design rules for loading, empty, failure,
  focus, keyboard, and reduced-motion behavior.
- Preserve private-by-architecture behavior: provider content is fetched only
  through an accepted local connector boundary, not sent to Clovy API merely
  because Overview exists.

## First-release non-goals

- A new local SQLite task or commitment table.
- A Tasks view, `TaskDto`, `list_tasks`, or any task-command contract in this
  roadmap.
- Treating runtime records or the generic internal `todo` toolset as product
  commitments.
- Building a new native Calendar or Mail provider, or duplicating provider
  persistence; the selected Project reads accepted Microsoft MCP boundaries.
- Replacing the Home conversation, Sessions list, Projects view, Notes list, or
  Routines view.
- Silently assigning a Mail, Calendar, or To Do record to a Project based on its
  title, body, sender, or other unverified text.
- Creating, editing, completing, cancelling, or synchronizing provider items
  from Overview.
- Two-way synchronization, conflict resolution, offline mutation queues, or
  provider-side deletion mirroring.
- A generic MCP transcript cache presented as a reliable dashboard data source.
- Broad Microsoft 365 scope such as Mail, Files, Teams, Planner, or shared
  mailboxes. Calendar, To Do, and second-brain involvement remain bounded,
  read-only MCP capabilities with their own accepted contracts.
- Cross-data-partition aggregation.
- Cross-Project content mixing when a record has no explicit Project mapping.
- A global numeric priority score that hides each source's semantics.
- Notifications, reminders, recurring task behavior, or push alerts.
- Charts, trend analytics, productivity scoring, or historical reporting beyond
  the bounded Involvement distribution.
- Automatic injection of Overview content into every agent run.
- Cloud sync, companion sync, or a Clovy API deployment for the local shell.

## Existing architecture and reusable seams

Nothing in this section authorizes implementation. It records the seams to
re-verify when the work is scheduled.

### Navigation and workspace routing

- `src/components/sidebar/Sidebar.tsx:130-140` defines the `SidebarView` union.
  It currently has no Overview value.
- `src/components/sidebar/Sidebar.tsx:1171-1255` renders the primary navigation
  with `data-active` and `aria-current="page"`. Overview should be a new
  top-level button, following the user's placement decision.
- `src/app/app-workspace-view.tsx:156-662` is the single workspace switch. The
  Overview route should be a distinct branch, not an overloaded Home branch.
- `src/app/workspace-lazy.tsx:104-145` contains the lazy workspace loader pattern
  for heavier views. A future Overview component can use the same pattern.
- `src/app/app-layout.tsx:204-232` handles navigation transitions and clears
  agent/project origins when leaving agent views. The new view must preserve
  those boundaries.
- `src/app/tabs/tabs.ts` accepts `SidebarView` in `TabNav`; Overview should not
  require an entity-specific tab payload unless a later decision adds one.
- `src/components/sidebar/Sidebar.tsx:599-702` contains command-prompt quick
  actions. Phase 0 must decide whether Overview is included there as well as in
  the primary nav.

### Local source data

- `AgentSessionDto` in `src/lib/agent-runtime-contract.ts` carries stored session
  identity, title, runtime status, timestamps, and error state.
- App state already maintains `agentSessions`, working and waiting session id
  sets, `completedSessions`, `sessionFolders`, and `state.folders`. The Overview
  must use the same current-data-partition filtering as the existing sidebar and
  Sessions view.
- `src/lib/tauri.ts:180-189` defines `FolderDto`; session-to-Project links use
  `SessionFolderDto` at `:211-215`.
- `src/lib/tauri.ts:217-220` defines Clovy-owned archive metadata for stored
  sessions. Product copy must say **archived session**, while internal
  persistence retains historical `completed_at` names per `CONTEXT.md` and
  ADR-0032.
- `src/lib/tauri.ts:243-254` defines `NoteListItemDto`, including processing
  status, folder ids, and updated time. Notes are already available in app state.
- `src/lib/agent-routines.ts` and `src/lib/agent-routine-history.ts` are the
  existing routine and run-history seams used by `RoutinesView`. A future
  Overview must not duplicate routine persistence.
- Calendar context is already persisted on Notes and used for recording-time
  matching, but that is not a Today agenda. `src-tauri/src/meeting_calendar_context.rs`
  and `src/lib/tauri.ts:662-680` are useful identity and deep-link precedents,
  not a new Overview data store.

### Existing local UI patterns

- `src/components/agent/AgentSessionsList.tsx` provides stable session ordering,
  status filtering, selection, empty states, and action recovery.
- `src/components/folders/FoldersWorkspace.tsx` provides Project cards, counts,
  keyboard activation, and Project navigation patterns.
- `src/components/notes-list/NotesList.tsx` provides processing-state labels,
  bulk selection, and no-match behavior.
- `src/components/routines/RoutinesView.tsx` provides loading, error-retry,
  recent run history, and refresh/event patterns.
- `src/components/ui/EmptyState.tsx`, `InlineNotice.tsx`, and `Spinner.tsx` are
  canonical for empty, error, and loading states. New Overview markup should
  compose these rather than inventing parallel primitives.
- `src/components/ui/Dialog.tsx` provides focus trap, Escape handling, and focus
  restoration if a provider connection or detail confirmation is ever added.
  Overview itself should remain non-modal in the first release.

### Microsoft provider reality and possible boundary

There is no current native Microsoft connector:

- `src/lib/tauri.ts:1750-1801` currently models `ConnectorProvider` as
  `google | linear | notion | github`; there is no Microsoft or To Do provider.
- `src-tauri/src/connectors/policy.rs:47-75` lists released connector toolset
  identities without Microsoft To Do. Those persisted identities are compatibility
  contracts, not a place to add an unreviewed provider name.
- `docs/plugins/microsoft-365-prd.md:36-98` proposes delegated Microsoft 365
  access, local credential custody, and bounded Rust-owned calls, but explicitly
  defers Planner and To Do at `:61-65`.
- `docs/roadmap/outlook-mail-workspace/plan.md:130-191` is scoped to selected
  Mail context and excludes broad Microsoft dashboard scope. Its custom MCP
  settings path is useful context but is not a direct Overview data feed.
- `src/components/settings/AgentMcpServersSection.tsx`, `src/lib/agent-mcp.ts`,
  and `src-tauri/src/agent_mcp.rs` provide the current user-configured external
  MCP boundary. ADR-0039 keeps transport, secrets, bounds, timeouts, and policy
  in Rust. A generic MCP server cannot be assumed to expose the stable To Do
  fields or deep links an Overview needs.

Phase 0 must choose and document whether Microsoft To Do will arrive through a
native Connector provider or a dedicated, bounded provider adapter behind the
existing Rust-owned external boundary. The renderer must not call Graph or an
MCP server directly. The choice should be recorded as an ADR only if it meets
all three repository criteria: hard to reverse, surprising without context, and
a real trade-off between alternatives.

## Proposed first-version experience

### Project-first Overview layout

The recommended layout is one calm, scrollable workspace with a persistent scope
selector at the top:

1. **Scope selector**: starts at **All Projects**. Selecting a Project changes
   every section below it to that Project. The selector includes an explicit
   **No Project** option only if Phase 0 accepts it. The active scope is visible
   in the page title and in every provider-backed state.
2. **Aggregate All Projects**: show Project rows with counts and compact signals,
   not a blended stream of provider content. Each row can show active work,
   needs-attention count, today's next event, recent activity count, and a clear
   reason to open that Project.
3. **Selected Project temporal view**: within one Project, show:
   - **Now**: active agent sessions, current Calendar events, and explicitly active
     routines;
   - **Needs attention**: the short list of actions and decisions;
   - **Today / Next**: the next Calendar events and Project-scoped commitments;
   - **Recent activity**: a chronological timeline of what happened or changed;
   - **Context**: Project-local Notes, Mail summary, and the Involvement chart.
4. **Provider states**: Microsoft Calendar, Mail, and To Do are separate bounded
   source contributions. A missing or stale tool affects only its contribution,
   not the selected Project shell or local data.

The source-specific views remain available as drill-down destinations, but they
should not define the primary page hierarchy. The All Projects view must not
silently show full Mail or To Do content from every Project; it shows aggregate
metadata and requires a Project selection for provider details.

The sketch at `sketch.html` demonstrates this structure with clearly labeled
example data. Example rows are design content only and are not presented as
real user records.

### Active agent sessions

Active sessions remain a distinct source from commitments, but the primary
question is whether one is happening **now** or needs the user. The recommended
initial filter includes `running`, `waiting_for_user`, and `interrupted`, plus a
small accepted recent-activity window only if Phase 0 confirms that idle sessions
are useful. Archived sessions do not appear in Now or Needs attention.

The ordering should put sessions needing the user first, then sessions running
now, then recent activity. Existing working and waiting indicators should be
reused, and rows should expose status text to assistive technology. A session row
must distinguish the stable stored session id used for navigation from any live
runtime session id.

### Commitments

The Today, Mail, Commitments, and Involvement contributions use the external
Microsoft MCP boundary but remain separate source semantics inside the selected
Project. Today is a Calendar agenda; Mail is bounded context and activity;
Commitments is a To Do list; Involvement is a second-brain distribution. A
failure in one must not hide the others.

Both cards have four honest states:

- **Connector needed**: the required Microsoft MCP server is not configured or
  does not expose the required read tool. Explain what is unavailable without
  implying a local replacement.
- **Disconnected or reauthorization needed**: the account or delegated grant is
  missing or expired. Offer a bounded link to the MCP settings surface when the
  existing connection contract defines one.
- **Loading or stale**: show a quiet Spinner or freshness notice while a bounded
  read is in flight. A stale result must be labeled stale rather than presented
  as current.
- **Connected**: display the bounded, read-only Microsoft result with source
  semantics. Mutations remain out of scope.

Today requires a Calendar read tool and verified event fields: title, start,
end, all-day state, calendar label, account context, and provider deep link.
Mail requires a Mail read tool and verified message fields: subject, sender,
date, snippet, Project category or folder mapping, and provider deep link; full
email body enters only on explicit selection by the user, following the principle
in `docs/roadmap/outlook-mail-workspace/plan.md`. Commitments requires a To Do
read tool and stable item fields: list, due state, importance, completion state,
and provider deep link. Involvement requires a second-brain read tool that
returns the four allowed statuses and bounded counts or records, together with
the Project scope and freshness. The plan does not assume that one Microsoft MCP
server exposes all four inventories. Each source must also supply an explicit
Project mapping that the Overview can validate; no record may be silently
assigned to a Project by name matching on content.

The provider contract must define list limits, pagination or continuation,
which lists are included, open/completed filtering, due-date timezone behavior,
importance semantics, stable provider id, account identity label, last-refresh
metadata, error classes, and deep-link behavior. It must also define whether
content is retained locally between refreshes. No provider-derived content
should be included in telemetry or sent to Clovy API by default.

### Needs attention

Needs attention is the operational presentation of High priorities. It should
use explicit source semantics and stable ordering, with a small cap so it remains
a decision list rather than a backlog:

1. an active session waiting for the user or interrupted;
2. a calendar event requiring preparation or currently at risk, only when the
   provider exposes that signal;
3. overdue or high-importance Microsoft To Do items;
4. recoverable or failed Notes;
5. failed routine runs;
6. second-brain records with High involvement, only when they have a concrete
   linked action or current context.

Each row includes a source label, reason, and next action or destination. The
page must not compare an external provider's importance number directly with a
session timestamp as if they were one universal scale. If a source is
unavailable, Needs attention says that its view is partial and retains the local
signals it can prove.

### Context section

The context section sits below the temporal sections and carries slower-moving
information:

**Projects**: In All Projects, rows are the scope selector and aggregate summary.
A row shows its name, active session count, recent Note count, needs-attention
count, next-event metadata, and recent-activity count. It must not show full
provider content before the user selects the Project.

**Mail**: In a selected Project, Mail is a bounded recent or explicitly mapped
summary. It is context and recent activity, not an Outlook clone. Full message
content enters only after explicit selection. A Project view must not infer
membership from subject, body, sender, or a coincidental matching name.

**Involvement**: a horizontal bar distribution of second-brain records across
the four statuses, scoped to All Projects or the selected Project. This is
background context for deciding where to invest attention, not an action list.
It lives in the context section because it is strategic, not urgency-driven.

### Empty, loading, error, and freshness behavior

- On first load, local sections use the canonical Spinner or quiet skeleton
  pattern and then resolve independently.
- A failure in one local section does not remove the other sections. Use
  `InlineNotice` with an actionable retry where a retry is meaningful.
- Microsoft failure is isolated to the affected Today, Mail, Commitments, or
  Involvement source and marks Needs attention as partial if relevant items
  could be missing.
- Changing the Project scope clears provider rows from the prior scope before
  the new scoped read lands, so Mail, Calendar, To Do, and Involvement content
  cannot flash across Project boundaries.
- If all local sections are empty, use one `EmptyState` that explains that
  Overview fills as the user creates Notes, Projects, sessions, or routines.
- A section that has no items after a successful load gets an explicit compact
  empty message rather than a large blank gap.
- Recent activity has a bounded time window and count cap. It says when the
  window is partial rather than implying a complete audit history.
- "Now" is based on an explicit active state or time interval, never on a
  provider's last-updated timestamp alone.
- Refresh behavior should use existing runtime events where appropriate plus a
  bounded fallback refresh, matching the RoutinesView pattern. Phase 0 must
  decide the interval and whether `visibilitychange` triggers a refresh.
- A timestamp is never used as a substitute for provider freshness. Provider
  cards show the last successful read and the age or stale state explicitly.

## Safety, privacy, identity, and compatibility invariants

- Overview reads only data available to the current data partition. It must not
  accept a renderer-supplied partition name as an authority boundary.
- Local Phase 1 does not introduce a network request. Microsoft reads occur only
  after an accepted provider contract and through Rust-owned connector policy.
- The renderer never holds provider credentials and never calls Microsoft Graph,
  a custom MCP endpoint, or a provider API directly.
- Provider content is bounded by item count, field lengths, request timeout,
  output size, and refresh policy. Errors fail closed and retain no secret data.
- A provider account label and stable source id may be shown; raw access tokens,
  opaque credentials, and unnecessary tenant metadata never appear in Overview.
- The Overview never creates, edits, completes, or deletes an external item.
- Provider-derived content is untrusted data. It cannot grant tools, change
  policy, or alter navigation outside explicit user interaction.
- Stored agent session ids are used for local navigation; runtime session ids are
  ephemeral and never become durable Overview identity.
- Archived session state remains Clovy-owned local state as described by
  ADR-0032. Runtime status `completed` must not be confused with user-facing
  archive state.
- Provider records are assigned to a Project only through an explicit, verifiable
  mapping from the provider source, such as a category, list, folder name, or
  tag. Implicit assignment by text matching is not a safe Project boundary.
- Mail content enters Overview only as bounded metadata; full body, attachments,
  and inline images require explicit user selection.
- No provider or local Overview content is sent to Clovy API or included in
  issue reports and telemetry by default.
- Existing provider identities and persisted toolset names remain compatible.
  A future Microsoft provider must be additive and follow the relevant connector
  and migration contracts.
- The Home conversation remains a separate conversational surface and keeps its
  existing contract in `docs/home-assistant.md`.

## Implementation phases

### Phase 0: contract and UX definition

**Status: not started.**

Resolve and record before implementation:

- final user-facing copy: recommended page label **Overview**, temporal sections
  **Now**, **Needs attention**, **Today**, **Recent activity**, and **Context**;
  source labels such as **Active agent sessions**, **Commitments**, **Projects**,
  and **Involvement** remain descriptive drill-down language;
- sidebar position and whether Overview appears in the command-prompt quick
  actions;
- the definition of Now and its explicit active-state/time-window rules;
- the Recent activity window, event types, ordering, and count cap;
- source-backed priority classification and stable ordering / cap;
- the Microsoft MCP integration path, delegated scopes, account boundary,
  supported Calendar and To Do tools, open-item semantics, importance and
  due-date semantics, freshness, bounded reads, error states, and deep links;
- the second-brain MCP read tool, scope, exact involvement values, count
  semantics, and relationship between a High involvement record and a concrete
  Needs attention row;
- whether provider content is read live only or retained as a bounded local
  snapshot, and how deletion / reauthorization affects that snapshot;
- whether the Overview can open provider settings for connection repair;
- refresh on mount, runtime event, interval, and window visibility;
- keyboard, focus, list semantics, reduced-motion behavior, and narrow-window
  stacking;
- the data-partition and no-network guarantee for Phase 1;
- whether the Microsoft provider boundary passes the ADR test.

**Exit criterion:** product and design review accept the Overview section contract,
priority semantics, navigation behavior, empty/loading/error/freshness states,
privacy boundary, and Microsoft To Do dependency. Evidence is an accepted Phase
0 decision record or design-review artifact plus a linked implementation issue
when the work becomes ready.

### Phase 1: local Overview shell

**Status: not started.**

- Add the new `overview` `SidebarView` and primary navigation entry.
- Add a lazy Overview workspace route and the workspace switch branch.
- Add the All Projects scope and Project selection behavior, including the
  accepted No Project behavior if Phase 0 includes it.
- Build the local Project aggregate rows and selected-Project sections for
  active agent sessions, Notes, recent activity, and routines from existing
  app state and bindings.
- Add the Needs attention list using only local source-backed signals accepted
  in Phase 0.
- Add connector-needed states for Microsoft Calendar, Mail, To Do, and
  Involvement, without local task fallback or invented provider records.
- Thread only existing state and navigation callbacks; do not add an aggregate
  persistence layer.
- Clear scoped rows on Project changes, subscribe to accepted local runtime
  events, and use a bounded refresh fallback.
- Add scope-aware loading, empty, error, stale-selection, and keyboard states.

**Exit criterion:** a user can open Overview at All Projects, compare Project
summaries, select one Project, and understand what is happening now, what needs
attention, and what happened recently within that scope. They can navigate to
local owning views and understand why Microsoft-backed sections are unavailable.
Evidence is deterministic frontend coverage and a dated real-app screenshot or
recording in light and dark themes, including a narrow window, an empty state,
a scope change, and a recent-activity timeline.

### Phase 2: Microsoft MCP read contract

**Status: blocked.**

This phase is a decision gate, not a feature phase. It must be resolved before
any Microsoft-backed section renders data. The gate defines:

- which Microsoft MCP server or servers expose Calendar, Mail, To Do, and
  second-brain involvement data;
- the exact tool names, schema, parameters, and Project-scope inputs for each
  read operation;
- the explicit Project mapping for each provider record, including how All
  Projects aggregates safely and how unmapped records are handled;
- the OAuth or delegated auth path, scopes, account identity, and account label;
- token custody in Rust, never in the renderer;
- bounded list size, page size, freshness interval, and stale-result behavior;
- verified deep-link format for Calendar, Mail, and To Do records;
- connected, loading, stale, disconnected, and error state behavior for each
  source;
- whether one MCP configuration covers all sources, or separate connections are
  required;
- that credential material and unnecessary tenant metadata never reach React;
- that provider text is untrusted data and cannot alter agent policy, Project
  membership, or navigation.

The existing custom MCP infrastructure at `src/components/settings/AgentMcpServersSection.tsx`
and `src-tauri/src/agent_mcp.rs` is the likely boundary. ADR-0039 keeps
transport, secrets, bounds, timeouts, and policy in Rust. The existing Mail
context roadmap is the closest product precedent, but this scope adds a
Project-level read summary and must not turn into a mailbox mirror.

**Exit criterion:** the tool inventory, Project mapping contract, auth path,
bounded semantics, freshness policy, and error contract are accepted. Evidence
is a decision record and a linked implementation issue scoped to the selected
Microsoft read surfaces.

### Phase 3: Today, Commitments, and Involvement sections

**Status: blocked.**

When the Phase 2 gate is resolved:

- replace the Today card's connector-needed state with a bounded Project-scoped
  Microsoft Calendar agenda: events with title, start, end, all-day indicator,
  calendar label, explicit Project mapping, and a verified deep link;
- replace the Mail card's connector-needed state with a bounded Project-scoped
  Mail summary: recent or flagged messages with subject, sender, date, and a
  verified deep link; never load full message body without explicit user action;
- replace the Commitments card's connector-needed state with a bounded
  Project-scoped Microsoft To Do list: items with title, list name, due state,
  importance, explicit Project mapping, and a verified deep link;
- replace the Involvement card's connector-needed state with the four
  second-brain statuses (High, Medium, Low, Simmering) as a horizontal bar
  chart: one bar per status, ordered from High to Simmering, with a text count
  and label on every bar and an accessible table fallback. Use a sequential
  single-hue ramp (four steps, dark to light, anchored by the accent color) so
  the chart is readable in forced-colors and in grayscale; do not use a four-hue
  categorical palette for what is an ordered set with no identity job. The chart
  must have `role="img" aria-label="Involvement distribution"` or equivalent
  accessible markup, with the raw counts in a visible or `visually-hidden` table.
  Validate the chosen four-step ordinal ramp against both light and dark chart
  surfaces before implementation; the sketch's candidate ramp is recorded in
  its CSS only as design reference and is not a production token contract.
- keep all three cards as independent read surfaces with isolated failure states;
- show freshness labels on all three cards and mark stale results explicitly;
- add tests for provider fixtures, field bounds, auth/error mapping, freshness,
  isolated failure, stable ordering, chart count accuracy, table view parity,
  deep-link behavior, and proof that credentials never reach renderer state.

**Exit criterion:** a selected Project renders accurate, bounded Microsoft
Calendar, Mail, and To Do data with explicit Project mapping, isolated failure
states, and verified deep links. All Projects renders safe aggregate metadata
without leaking full provider content across Projects. Evidence is tests, a
privacy and error-state review, and dated real-app evidence for connected,
disconnected, stale, empty, aggregate, and selected-Project states.

### Phase 4: cross-entity priority and reliability

**Status: not started.**

- Combine scoped local signals and Microsoft Calendar, Mail, and To Do items into
  the accepted Needs attention ordering without inventing a universal score.
- Show the reason, source, Project scope, freshness, and owning destination for
  every item.
- Add All Projects rollups only from explicit Project mappings.
- Confirm partial results are understandable when one Microsoft source is
  unavailable, stale, or returns only a subset of records.
- Exercise Project switching, refresh, app restart, data-partition changes,
  provider reauthorization, and concurrent runtime status changes.
- Validate that no provider content from Project A remains visible after opening
  Project B, and that All Projects never becomes an unbounded cross-project feed.
- Validate that the page remains useful when no provider is connected and does not
  overstate completeness.

**Exit criterion:** users can trust the High priorities band as a transparent,
source-backed cross-entity lens, while local and external failures remain
isolated and visible. Evidence is deterministic classification and ordering
coverage, accessibility checks, connected/disconnected real-app walkthroughs,
and a dated screenshot or recording attached to the implementation work.

### Phase 5: agent query follow-up

**Status: deferred.**

Only revisit this phase after usage evidence shows that users need Clovy to
answer Overview questions inside an agent session. Define a bounded host tool
under the Clovy Rust broker and the existing runtime contract. It must return a
compact summary on demand, never inject the full Overview into every prompt, and
must treat provider content as untrusted data. Tool naming must follow
`spec/mcp-tool-naming.md`; an ADR is needed only if the boundary meets the
repository's three-part ADR test.

**Exit criterion:** deferred until a separate product decision, host-tool
contract, privacy review, and implementation issue are accepted. No Phase 1 or
Phase 2 work depends on this phase.

## Verification strategy

### Frontend and navigation

- Test the `SidebarView` route, active nav state, command-prompt entry if
  accepted, tab label behavior, and navigation callbacks.
- Test All Projects aggregate rendering, Project selection, explicit No Project
  behavior if accepted, scope persistence, and clearing of stale scoped rows.
- Test that selecting a stored session, Project, Note, routine, Mail, Calendar,
  or To Do item reaches the correct owning surface without changing unrelated
  context.
- Test keyboard focus, Enter / Space activation, visible focus, list semantics,
  Escape no-op behavior, narrow-window stacking, and reduced-motion behavior.
- Test local loading, empty, no-match if search is added, retryable failure,
  connector-needed, disconnected, stale, and partial-result states.
- Test Involvement bar chart labels, ordered High / Medium / Low / Simmering
  presentation, per-bar hover and keyboard details, accessible table parity,
  zero-count states, and no-color fallback behavior.
- Confirm copy follows sentence case and contains no typographic dashes or ALL
  CAPS. Confirm all visual values use tokens and sanctioned icons.
- Confirm clipped lists use the shared scroll-fade primitive where required.

### Local data and runtime

- Test current data-partition filtering for sessions, Projects, Notes, and
  session-to-Project assignments.
- Test running, waiting, interrupted, archived, recoverable, failed, and recent
  status classification without conflating runtime completion and archive state.
- Test event-driven refresh and bounded fallback refresh without duplicate
  listeners or updates after unmount.
- Test Project scope transitions and prove records from the previous scope are
  removed before the next scope is rendered.
- Test that All Projects counts derive from current source state and do not create
  denormalized records.

### Microsoft provider boundary and chart

Once Phase 2 is unblocked, add fixture and integration coverage for:

- delegated account and scope handling;
- explicit Project mapping validation for Calendar, Mail, To Do, and involvement;
- proof that All Projects never renders full-body Mail or To Do details;
- proof that Project A records are absent after switching to Project B;
- bounded list size, field lengths, timeout, pagination, and output size;
- Calendar event fields, all-day and timezone semantics, calendar inclusion,
  Mail subject and snippet only, To Do importance and completion fields, list
  inclusion, and deep-link semantics;
- second-brain involvement values restricted to exactly High, Medium, Low, and
  Simmering, with deterministic order and count reconciliation;
- expired grant, disconnected account, unsupported provider, rate limit, partial
  response, malformed item, and stale-result behavior;
- account and data-partition scoping;
- proof that credentials and unnecessary tenant metadata never reach React;
- proof that provider text remains data and cannot alter Project membership,
  policy, or tool access;
- palette validation for the four-step sequential ramp in light and dark modes,
  plus chart rendering checks for labels, bar geometry, hover/focus details, and
  table parity. The table is the non-color fallback, not an optional extra.

### Real-app and documentation evidence

- Open Overview in light and dark themes and at a narrow window.
- Verify local status changes update the Now and Needs attention sections.
- Verify All Projects aggregation, Project selection, and scope clearing.
- Verify the connector-needed states for Today, Mail, Commitments, and
  Involvement before the Microsoft MCP tools exist.
- After Phase 3, walk through connected, expired, stale, empty, partial,
  aggregate, and selected-Project Microsoft states and verify safe deep-link
  behavior.
- Attach a dated screenshot or recording for every UI phase as required by
  `AGENTS.md`.
- Validate all local Markdown and HTML links from both roadmap indexes and the
  dedicated Overview folder.
- Confirm the project row and plan phase table agree on status.
- Inspect untracked sketch files separately; preserve the pre-existing dirty
  worktree paths recorded by the roadmap workflow.

## Open questions and decision gates

1. **What is the Project scope model?** Confirm All Projects as the initial
   aggregate, the selected Project as the page-wide filter, and whether No Project
   is an explicit scope. Decide whether the scope persists while navigating to a
   source view and how it resets when the user returns.
3. **Which Microsoft MCP server?** The user states Microsoft tools will be
   available via MCP. Phase 0 must confirm which server or servers expose
   Calendar, Mail, and To Do, whether one connection covers them, and which
   scopes or tokens are needed. The custom MCP path at `AgentMcpServersSection`
   and `agent_mcp.rs` is the likely boundary; its auth, freshness, and policy
   contracts must be defined before Phase 2 begins.
4. **How is Project membership established?** Decide the explicit mapping for
   Microsoft records: provider folder/list, category, tag, configured rule, or a
   bounded source relationship. Unmapped records must remain in All Projects only
   as clearly marked unscoped data, or stay out of the selected Project view.
5. **Which Calendar calendars and To Do lists are included?** Decide whether the
   view uses primary/default sources, all visible sources, or a selected subset.
   This affects privacy, volume, and stable ordering.
6. **Which Mail records qualify?** Decide whether Project view shows recent mail,
   unread mail, flagged mail, or explicitly mapped threads. Do not infer Project
   membership from message text alone.
7. **Which second-brain source and scope does Involvement read?** Decide which MCP
   tool exposes the four statuses, whether it returns counts only or records, and
   how the result maps to the selected Project. `Simmering` must survive
   round-tripping without being renamed or reordered.
8. **What does importance mean?** Decide how Calendar, Mail, To Do, and involvement
   signals enter Needs attention without comparing provider values as one numeric
   scale.
9. **What is the freshness promise?** Decide live read, bounded snapshot, or
   last-successful-read presentation for each Microsoft source and label stale
   behavior explicitly.
10. **Can an item open its source?** A provider deep link may be unavailable,
    account-specific, or unsafe to construct. Decide the accepted fallback when
    no verified link exists.
11. **What is the recent activity contract?** Decide the event types, lookback
    window, ordering, cap, and whether aggregate activity can include only
    metadata or selected provider titles.
12. **How does partial data read?** Decide whether a stale or failed Microsoft
    source marks Needs attention partial and how that is announced to assistive
    technology.
13. **Does the provider boundary meet the ADR test?** Record an ADR only if the
    accepted choice is hard to reverse, surprising without context, and a real
    trade-off. Otherwise keep the rationale in the roadmap and implementation
    issue.

## Explicit future ideas and follow-ups

These are intentionally collected here rather than implied as first-release
requirements:

- A provider-neutral commitment adapter after the Microsoft To Do contract is
  proven, with each provider retaining its own source semantics.
- A local Clovy task view from the separate local-task-management roadmap, with
  explicit rules for how it could later appear beside external commitments.
- A user-selectable priority lens or per-source filters after the fixed first
  contract proves useful.
- A compact sidebar attention count that links to Overview.
- A morning review routine that reads bounded Overview state and proposes a plan.
- A provider deep-link repair action when account context changes.
- An export or share flow with an explicit privacy review.
- Companion support for a bounded Overview snapshot.
- An agent host tool that answers a specific Overview query on demand.

## Index updates

When this roadmap entry is filed, update both roadmap indexes in the same
change. Add the project row after **Local task management** in
`docs/roadmap/README.md`:

```markdown
| Work overview | **Proposed** | Phase 0: contract and UX definition | [Work overview plan](work-overview/plan.md) · [Sketch](work-overview/sketch.html) | Confirm the Overview sections, Microsoft To Do read contract, priority semantics, and partial-failure behavior before implementation |
```

Add this annotated link under the Roadmap heading in `docs/index.md`, directly
after the Task management entry:

```markdown
  - [Work overview](roadmap/work-overview/plan.md) - proposed read-only Overview of High priorities, active agent sessions, Projects, local status, and connector-gated Microsoft To Do commitments; [interactive sketch](roadmap/work-overview/sketch.html)
```

## ADR and Issue follow-ups

No ADR or Issue is created by this roadmap. At Phase 0, create a design / product
review issue and a decision record only if the work becomes implementation-ready
and the relevant boundary passes the repository's ADR test. The implementation
issue should be split so the local Overview shell is independently reviewable
from the Microsoft connector dependency.

A future provider decision may be an ADR candidate if it locks in a native
Microsoft boundary, a stable external data contract, or a durable local snapshot
with genuine alternatives. A simple new read-only view that reuses accepted
local seams does not automatically warrant an ADR.

## Decision summary

Build a separate top-level **Overview** organized by time, not by integration.
The primary job is temporal orientation: the user sees **what is happening now,
what needs attention, what is coming up today, and what happened recently**. A
quieter context section provides Project and second-brain involvement signals.

Source systems contribute bounded signals to those temporal sections rather than
owning their own equal-weight cards. Treat Microsoft Calendar, To Do, and
second-brain involvement as connector-gated contributions to the temporal
experience. Gate all three on an accepted Microsoft MCP tool inventory, auth
boundary, freshness model, bounded reads, privacy review, and deep-link behavior.
Derive Needs attention from explicit source semantics, always show the reason and
source, and preserve partial results when one source is unavailable. Keep local
task management, mutations, synchronization, Home conversation changes, and agent
host tools outside the first release.
