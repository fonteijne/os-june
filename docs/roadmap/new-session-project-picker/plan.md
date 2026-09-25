# Roadmap: project-aware new sessions

**Owner:** Product and desktop engineering  
**Date:** 2026-09-25  
**Status:** Proposed  
**Scope:** Clovy Desktop agent-session entry points and Project selection

This document captures a future feature direction. It is a product and
architecture plan, not an implementation authorization. File paths and
protocol details must be re-verified against the current tree when the feature
is scheduled.

## Executive recommendation

When the user starts a new agent session from a global entry point, let them
choose its Project before the blank session is started:

```text
Sidebar / Sessions / Command-N
          |
          v
Project-selection dialog
  search -> highlighted Project -> Enter
          |
          v
existing project-scoped new-session handshake
          |
          v
lazy stored-session creation on first composer submit
```

The picker should be app-owned and should reuse the existing `Dialog` primitive
and Project-list patterns. It should pass only the selected Project's stable
`folderId` into the existing `handleNewAgentSessionInProject` flow. That flow
already captures the current data partition and assigns the first newly-created
stored session through `useAgentSessionSync`.

The dialog should also offer an explicit **No project** choice. This preserves
the current global-session behavior while making the choice visible. It should
be the default only if that behavior is confirmed in the Phase 0 contract.

## Product thesis

A Project is the user's organizational unit, while an agent session is the
conversation that may be filed in that Project. Choosing the Project before the
first message makes the relationship clear from the beginning and avoids a
post-hoc move operation. The choice must not create a stored session merely by
opening the dialog: session persistence remains lazy until the user submits the
first composer message.

The feature should use "Project" in user-facing copy and retain `folder` and
`folderId` in code and persistence, consistent with `CONTEXT.md`.

## Roadmap status

**This table is the single source of truth for this feature's phase status.**
The detailed phase sections repeat each status. Vocabulary: `not started` |
`in progress` | `done` | `blocked` | `deferred`.

| Phase | Status | Exit criterion | Evidence or blocker |
| --- | --- | --- | --- |
| 0: contract and UX definition | **not started** | The Project/no-Project behavior, keyboard contract, and cancellation semantics are accepted | This document is the proposal; no implementation issue or design review is active |
| 1: picker and trigger integration | **not started** | Intended global triggers open the picker and Enter starts the existing Project-scoped session flow without premature session creation | Depends on Phase 0 decisions and current-tree re-verification |
| 2: verification and polish | **not started** | Automated and real-app evidence covers focus, filtering, keyboard selection, cancellation, and data-partition-safe assignment | Depends on the picker contract and implementation issue |
| 3: follow-ups | **deferred** | Any deferred enhancements have separate scope and evidence | Project creation and richer ordering are intentionally not first-release requirements |

## Goals

- Open a Project-selection dialog from the global **New session** action and
  Command-N/Ctrl-N.
- Focus the search input when the dialog opens so the user can type immediately.
- Filter Projects as the query changes using stable, case-insensitive matching.
- Keep a deterministic highlighted row, with keyboard navigation and Enter to
  choose it.
- Start the new session through the existing Project assignment handshake.
- Preserve an explicit global **No project** path.
- Keep cancellation side-effect free: closing the dialog must not dispatch the
  new-session event, create a stored session, or leave pending Project intent.
- Maintain focus restoration, modal layering, data-partition isolation, and the
  existing Clovy design-system rules.

## Non-goals for the first release

- Creating or importing a Project from this dialog.
- Adding a new Tauri command, SQLite migration, Clovy API endpoint, or runtime
  protocol field.
- Changing how a stored session is persisted or how Project assignment is
  authorized.
- Automatically submitting a prompt when a Project is selected.
- Changing model, safety mode, composer, Home conversation, or session-title
  defaults.
- Replacing `MoveNoteToFolderDialog`, `MoveSessionToProjectDialog`, or the
  inline Project picker in the note editor.
- Fuzzy-search infrastructure, recent/favorite ranking, or multi-Project
  selection.
- Silently assigning an existing session or moving a session after creation.

## Existing architecture

### Global new-session triggers

The current global path is split across the app shell and sidebar:

- `src/app/App.tsx:1898-1910` clears any pending Project intent, marks a new
  session pending, switches to the Agent view, and dispatches
  `AGENT_NEW_SESSION_EVENT` on the next task.
- `src/app/App.tsx:1960-1976` handles the platform primary shortcut. On macOS
  this is Command-N; on Windows it is Ctrl-N. Dialogs suppress this listener.
- `src/components/sidebar/Sidebar.tsx:878-883` performs the sidebar-side
  pending/event delivery, and `:1186-1200` renders the New session button.
- `src/components/sidebar/Sidebar.tsx:599-617` exposes New session through the
  command prompt's quick actions.
- `src/components/agent/AgentSessionsList.tsx:287-297,327-337` provides the
  Sessions page header and empty-state triggers.

The picker must be opened before these handlers mark a new session pending or
emit the event. The trigger callback should request the picker; the commit
callback should invoke the session-start action. This avoids creating a
session, consuming a pending request, or clearing state when the user merely
opens and cancels the dialog.

### Project-scoped session handoff

The existing Project path is the intended persistence boundary:

- `src/app/app-domain-actions.ts:272-287` implements
  `handleNewAgentSessionInProject(folderId)`. It records the selected Project,
  the known stored-session ids, and the current data partition; sets the Agent
  origin; marks a new session pending; and dispatches the normal event.
- `src/app/use-app-state.ts:126-132` defines the
  `pendingSessionProjectRef` shape.
- `src/app/use-agent-session-sync.ts:61-83` consumes that intent when the
  first newly-selected stored session appears. It assigns the session to the
  Project only if the data partition still matches, and abandons the intent
  when an existing session is selected.
- `src/components/agent/AgentWorkspace.tsx:928-936` consumes the new-session
  event, while its first-send path lazily creates the stored session. The
  session-create and first-run flow is around `:1325-1512`.

The roadmap does not authorize a second assignment mechanism. The selected
Project should flow into this existing handshake, and any new transient picker
state should be cleared on cancel, partition change, or another navigation
that abandons a fresh session.

### Reusable UI patterns

The implementation inventory should start with existing components rather than
a bespoke overlay:

- `src/components/ui/Dialog.tsx:38-163` provides the portal, modal semantics,
  Escape handling, backdrop dismissal, focus trap, initial focus selector, and
  focus restoration.
- `src/components/folders/MoveSessionToProjectDialog.tsx:46-299` and
  `MoveNoteToFolderDialog.tsx` provide Project filtering, deterministic name
  sorting, search-clear focus retention, Project rows, and empty states.
- `src/components/sidebar/Sidebar.tsx:1747-1920` demonstrates an active index,
  `aria-activedescendant`, Arrow navigation, Enter selection, and scrolling the
  active result into view.
- `src/components/agent/composer/ModelPicker.tsx` contains a fuller listbox
  navigation pattern with Arrow, Home, End, and active-result semantics.
- `src/styles/app.css` contains the `.add-notes-search`, `.add-notes-list`,
  `.add-notes-row`, and empty-state styles used by existing Project dialogs.

New UI must follow `spec/sentence-case.md`,
`spec/no-typographic-dashes.md`, `spec/no-all-caps.md`,
`spec/icons-central-only.md`, `spec/design-tokens.md`,
`spec/type-scale.md`, `spec/font-weights.md`, `spec/font-families.md`,
`spec/control-sizes.md`, and `spec/scroll-fade.md` where applicable.

## Proposed first-version experience

1. The user clicks **New session** in the sidebar, chooses the Sessions-page
   New session action, or presses Command-N/Ctrl-N.
2. The app opens a modal above the shell. No new-session event is emitted yet.
3. The search field is focused before the user types. The list contains an
   explicit **No project** row and the available Projects, using a deterministic
   order. Project name and description are searchable unless Phase 0 narrows
   that contract.
4. The first visible row is highlighted according to the accepted default. A
   query change resets or clamps the highlight so it never points at a hidden
   row.
5. Arrow Up/Down and Home/End change the highlighted row while the search input
   remains the active keyboard target. The active row is exposed through
   listbox/option semantics and remains visible in the scrollport.
6. Enter commits the highlighted choice. Clicking a row should use the same
   commit path unless Phase 0 explicitly chooses highlight-then-confirm.
7. Choosing a Project calls the existing Project-scoped new-session action,
   closes the dialog, and lets the normal event/session lifecycle continue.
8. Choosing **No project** calls the existing global new-session action and
   clears Project intent.
9. Escape, Cancel, the close button, and a backdrop click close the dialog
   without creating a session. Focus returns to the initiating control through
   the Dialog primitive.
10. If Projects are unavailable or the list is empty, the dialog still offers
    **No project** and explains how to create a Project from the Projects view.
    Project creation is not part of this modal's first release.

## Integration and safety invariants

- The row callback carries a stable `folderId`; it never reconstructs identity
  from a Project name or display position.
- Opening, searching, highlighting, and cancelling do not write to SQLite,
  emit `AGENT_NEW_SESSION_EVENT`, or create a stored session.
- A committed Project choice captures the known-session snapshot and current
  data partition through the existing domain action.
- Assignment happens only to a genuinely new stored session selected by the
  normal session-change event. If the user selects an existing session, the
  pending intent is abandoned.
- A data-partition switch invalidates the pending Project intent. The feature
  must not assign a session across partitions or leave misleading Project
  breadcrumbs.
- Repeated shortcut presses or rapid Enter events cannot produce duplicate
  session starts. The app-owned open/commit state must be idempotent or guarded.
- A failure to assign a Project must remain visible through the existing error
  handling and must not silently claim that the session was filed.
- No Project names, descriptions, prompt text, or session content are needed
  for telemetry; any future measurement should use non-content metadata.

## Implementation phases

### Phase 0: contract and UX definition

**Status: not started.**

Resolve and record:

- The requested global trigger set: sidebar, Sessions page, command prompt,
  and Command-N/Ctrl-N, or a narrower initial set.
- Whether **No project** is the default row, a selectable alternative, or a
  separate Cancel-like action. The current recommendation is a selectable
  explicit alternative, preserving global sessions.
- Whether pointer selection commits immediately or only changes the highlight.
- Exact filtering, ordering, tie-breaking, empty, loading, and stale-list copy.
- Whether Project descriptions participate in search.
- How focus, Escape, backdrop close, and cancellation behave while any future
  asynchronous commit is pending.

**Exit criterion:** product and design review accept the user-visible contract,
copy, accessibility semantics, and compatibility behavior; an implementation
issue is linked as evidence.

### Phase 1: picker and trigger integration

**Status: not started.**

- Add app-owned open state and a focused Project-picker component or a narrowly
  shared picker primitive.
- Route each approved global trigger through a request/open callback rather
  than the current immediate session-start callback.
- Preserve the existing Project detail New session path, which already knows
  its destination and should remain direct unless separately changed.
- Reuse `Dialog`, existing Project row styles, and the accepted listbox keyboard
  contract.
- On commit, call `handleNewAgentSessionInProject(folderId)` or the global
  equivalent for **No project**, then close the dialog.
- Ensure the picker does not alter the lazy first-submit creation path.

**Exit criterion:** every intended trigger opens the picker; cancelling creates
nothing; Enter on a highlighted Project starts exactly one normal fresh-session
flow with that Project's pending intent.

### Phase 2: verification and polish

**Status: not started.**

- Add component tests for initial focus, filtering, highlight reset/clamping,
  Arrow/Home/End, Enter, pointer selection, empty/no-match states, Escape,
  backdrop close, and focus restoration.
- Add App shortcut tests proving Command-N/Ctrl-N opens the picker and does not
  dispatch `AGENT_NEW_SESSION_EVENT` before a commit.
- Test dialog suppression while another dialog owns focus and regression of
  Command-Shift-N/Ctrl-Shift-N note creation.
- Test that a selected `folderId` reaches the existing Project domain action and
  that partition changes or existing-session selection abandon the intent.
- Run `pnpm test`, `pnpm typecheck`, and `pnpm check`.
- Perform real-app visual and keyboard QA, including collapsed-sidebar and
  Windows shortcut behavior. Attach a screenshot or recording to the eventual
  implementation PR.

**Exit criterion:** deterministic tests and real-app evidence cover the full
success, cancellation, empty-state, focus, keyboard, and partition-safety paths.

### Phase 3: follow-ups

**Status: deferred.**

Defer these until the first version has usage evidence:

- Create a new Project inline from the picker.
- Recent or favorite Project ordering.
- Fuzzy matching or ranking beyond deterministic filtering.
- Richer session-start metadata or a visible pre-submit Project breadcrumb
  beyond the existing Agent origin behavior.
- Multi-Project selection or bulk session filing.

**Exit criterion:** each follow-up has a separate product decision and issue;
none is implied to be part of the first release.

## Verification strategy

### Component and accessibility tests

- Opening focuses the named search field, including when the initiating button
  is in the collapsed sidebar or Sessions page.
- The list exposes one active/highlighted option and resets it when filtering
  removes the previous row.
- Arrow Up/Down and Home/End update the active option without losing search
  focus; Enter commits the active option.
- The **No project** row is distinguishable from a Project row and preserves
  global-session semantics.
- Escape, Cancel, close, and backdrop close do not emit the new-session event.
- Dialog focus remains trapped while open and returns to the initiating control
  after close.
- Empty Projects and no-match states are legible and keyboard-safe.

### App and session integration tests

- Command-N on macOS and Ctrl-N on Windows open the picker; the wrong primary
  modifier is ignored.
- Command-Shift-N/Ctrl-Shift-N continues to create a note and does not open the
  Project picker.
- A committed Project reaches `handleNewAgentSessionInProject` and the normal
  `AGENT_NEW_SESSION_EVENT` path only once.
- The existing lazy create path still creates the stored session on first send,
  not when the dialog opens or a row is highlighted.
- `useAgentSessionSync` assigns only the first genuinely new stored session and
  never crosses a data-partition boundary.
- Existing Project-detail New session behavior remains covered by
  `src/test/folders-workspace.test.tsx`.

### Required eventual gates

- `pnpm test`
- `pnpm typecheck`
- `pnpm check`
- Real-app keyboard and visual walkthrough with evidence in the implementation
  PR or the dated QA run directory.

## Open questions and decision gates

1. Should the modal be shown for the Sessions page and command-prompt action as
   well as the sidebar and Command-N/Ctrl-N? The recommendation is to keep the
   global entry points consistent.
2. Is **No project** the initially highlighted row, or should the first Project
   be highlighted when Projects exist? The choice affects accidental Enter and
   must be explicit.
3. Does a pointer click commit immediately, or only select a row for a later
   Enter/confirmation? Keyboard-first behavior requires Enter to commit the
   highlighted row in either case.
4. Should Arrow navigation clamp at the list ends or wrap around? The behavior
   must be consistent with the chosen accessibility pattern.
5. Are Project descriptions searchable, displayed, or both? What is the stable
   tie-breaker for Projects with equivalent names?
6. What does the modal show while the Project list is still loading or becomes
   stale while it is open?
7. If assignment fails after the stored session exists, should the UI offer a
   retry, show an actionable notice, or leave the session visibly unfiled?
8. Does a future inline Create project action belong in this dialog, or should
   Project creation remain in the Projects view?
9. Should the command-prompt quick action be treated as the same global trigger
   or remain a fast path for users who do not want a picker?
10. Does this feature need an ADR? Not currently: it reuses accepted Project
    assignment and runtime boundaries. Create an ADR only if implementation
    settles a hard-to-reverse, surprising choice with a real trade-off.

These decisions should be resolved before Phase 1 starts. They are not reasons
to add a second assignment protocol or to change the existing Project model.

## Explicit future ideas

- Search and create a Project without leaving the new-session flow.
- Rank Projects by recent use while retaining an accessible deterministic order.
- Show the selected Project in the fresh-session hero before the first message.
- Offer a recent-project keyboard shortcut only after shortcut discoverability
  and collision behavior are understood.
- Record privacy-preserving selection metrics if they are useful and approved.

## Decision summary

Adopt one app-owned, searchable Project-selection modal for approved global
new-session entry points. Focus search on open, keep the active Project
keyboard-selectable, and make Enter the commit action. Include an explicit
**No project** choice to preserve global sessions. Reuse the existing
`handleNewAgentSessionInProject` and `useAgentSessionSync` handoff rather than
adding persistence or protocol surface. Keep Project creation, ranking, and
richer context as deferred follow-ups until the initial contract and usage
justify them.
