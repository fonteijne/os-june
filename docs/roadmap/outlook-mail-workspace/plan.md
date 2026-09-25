# Roadmap: mail context for Project conversations

**Owner:** Product and desktop engineering  
**Date:** 2026-09-25  
**Status:** Proposed  
**Scope:** Clovy Project conversations, bounded Outlook context, and the optional mail-first handoff

This document captures a future feature direction. It is a product and
architecture plan, not an implementation authorization. File paths, MCP tool
names, provider behavior, and protocol details must be re-verified against the
current tree and selected server version when the feature is scheduled.

The external server under consideration is the self-hosted Docker deployment
from [softeria/ms-365-mcp-server](https://github.com/softeria/ms-365-mcp-server).
Its tool inventory, OAuth behavior, permissions, and release behavior remain
external inputs.

## Executive recommendation

Do not copy Outlook into Clovy. Make the Project conversation the center of
gravity and add **Mail context** as a bounded source picker:

```text
Project conversation
    -> Add context
        -> Mail context search
            -> select one email
                -> preview and add to this chat
                    -> Clovy can compare it with Project context and Obsidian
```

The first release should support two related entry points:

1. **Project-first, recommended:** while chatting in a Project, open Mail
   context, start with the 20 newest received messages, select one, and add it
   to the current stored agent session. Search can narrow that initial set on
   demand.
2. **Mail-first, optional:** open the Mail context surface, see the same 20
   newest received messages, select a message, then choose **Ask Clovy about
   this email**. Clovy opens or resumes a Project-scoped session only after
   that explicit action. Merely opening or previewing an email never creates a
   new session.

Both paths converge on the same normal agent session context. The email is
selected source material, not a second mailbox UI or a new conversation store.
A later draft-reply flow can be initiated from that chat, but it remains
draft-only and approval-gated in the first release.

The external MCP boundary remains:

```text
User-operated Docker MCP server
    -> Microsoft Graph / Outlook
    -> Rust-owned external MCP transport and policy
        -> bounded mail tools in the agent run
            -> explicit Mail context selection
                -> Project conversation
```

Clovy should not package or launch the Docker container in the first release.
The user or their operator owns its deployment and availability. Clovy owns the
connection configuration, secret custody required by its MCP contract, tool
policy, approvals, bounds, and user-facing disclosure.

## Product thesis

Clovy should help a user work with the information that matters to a Project,
without becoming the system that owns every source of that information. Mail is
therefore a contextual lens, similar in spirit to bringing a Note reference
into a conversation:

- search is bounded and on demand;
- full email content enters the session only after explicit selection;
- the selected email is visible as context in the chat;
- Project instructions, Project memory, and enabled Obsidian access remain
  available through the normal session policy;
- opening a message does not create a stored session or silently persist a
  mailbox copy.

The workspace is intentionally not an Outlook clone. It should not reproduce
folders, labels, archive workflows, unread management, mailbox synchronization,
or a full email composer. Its job is one compact loop:

```text
find one message -> select it -> discuss it with Project context
```

The feature uses **Project**, **Mail context**, **Outlook**, **email message**,
**agent session**, **stored session id**, **runtime session id**, **Connector**,
and **MCP server** according to `CONTEXT.md`. The user-facing product name is
Clovy; `folder` and `folderId` remain implementation terms where applicable.

## Roadmap status

**This table is the single source of truth for this feature's phase status.**
The detailed phase sections repeat the status. Vocabulary: `not started` |
`in progress` | `done` | `blocked` | `deferred`.

| Phase | Status | Exit criterion | Evidence or blocker |
| --- | --- | --- | --- |
| 0: context contract and external-server spike | **not started** | Mail context behavior, exact read tools, permissions, bounds, and session handoff are verified | The external server version/tool inventory is not pinned; no implementation Issue is active |
| 1: Project-first Mail context | **not started** | A Project chat can search, preview, and explicitly add one bounded email to the current session without creating a new session on open | Depends on Phase 0 and the chosen runtime-mediated read boundary |
| 2: mail-first Ask Clovy handoff | **not started** | An explicit Ask Clovy action opens or resumes a Project session with the selected email, while preview alone has no session side effect | Depends on session reuse, Project selection, and context persistence decisions |
| 3: draft reply from context | **not started** | The user can request a reply draft in the Project chat and approve saving it to Outlook, with no send capability | Depends on a verified separable draft tool and approval presentation |
| 4: verification and pilot rollout | **not started** | Privacy, prompt-injection, permissions, accessibility, failure, and real-app evidence support an rc pilot | Depends on all prior phases and a safe disable path |
| 5: broader mail and Microsoft 365 features | **deferred** | Each later capability has separate scope, policy, and evidence | Full Outlook management, sending, Calendar, Files, Teams, and unattended routines are deferred |

## Goals

- Keep Project chat as the primary Clovy experience.
- Add an explicit, lightweight Mail context picker to an existing Project
  conversation.
- Start Mail context with a bounded top 20 of the newest received messages,
  sorted newest first, then let the user narrow those results without creating
  a local mailbox index.
- Let the user preview one email and explicitly add it to the current stored
  agent session.
- Make selected context visible, removable, and attributable to its source.
- Offer an explicit **Ask Clovy about this email** action for mail-first use,
  without auto-creating sessions when users browse or preview.
- Let the resulting session use Project instructions, Project memory, and
  enabled Obsidian capabilities under the existing runtime policy.
- Preserve external MCP and Rust-owned credential, approval, timeout, and
  output-boundary controls.
- Keep draft creation behind the existing approval surface and keep sending out
  of the first release.
- Explain the actual data path from Outlook through the self-hosted MCP server
  and the selected Clovy model path.

## Non-goals for the first release

- Recreating Outlook's inbox, folders, labels, archive, delete, move, or unread
  management inside Clovy.
- A permanent Outlook dashboard or full mailbox synchronization.
- Automatically creating a new stored session when an email is opened or
  previewed.
- Automatically adding every related message to chat.
- Automatic mail search or full email-body loading at Project-session start.
- Sending email, reply-all, forwarding, inferred recipients, or bulk drafts.
- Calendar, OneDrive, SharePoint, Teams, Planner, To Do, contacts, shared
  mailboxes, multiple tenants, or broad Microsoft 365 dashboard scope.
- Application permissions, tenant-wide impersonation, enterprise indexing, or
  unattended mail routines.
- Clovy-managed Docker lifecycle, image updates, health supervision, or
  container orchestration.
- A native Microsoft connector with Clovy-owned Graph OAuth and provider code.
- Direct MCP calls from TypeScript that bypass Rust policy.
- Copying a mailbox or full-text message corpus into SQLite.
- Attachments, inline images, full HTML fidelity, or bulk thread loading until
  a separate bounded-content decision is accepted.

## Existing product and architecture

### Existing Microsoft direction

`docs/plugins/microsoft-365-prd.md` is the proposed broader Microsoft 365
product direction. It includes Outlook mail search/read/draft/send, but also
Calendar, Files, Teams, and future enterprise capabilities. This roadmap
narrows the first user outcome to selected Mail context inside Project
conversations.

`docs/plugins/microsoft-365-implementation-plan.md` contains useful permission,
tenant, bounds, and approval questions. Its proposed `june_*` MCP integration
shape is stale: the file itself says the runtime migration superseded it. New
planning must not copy those server names or treat that plan as a current
contract.

### External MCP boundary

The existing external MCP path is the intended integration seam:

- `src/components/settings/AgentMcpServersSection.tsx` provides Custom MCP
  server configuration, Streamable HTTP settings, enable/disable, discovery
  testing, tool visibility, safety policy, and OAuth reconnect actions.
- `src/lib/agent-mcp.ts:1-74` provides typed bindings for listing, creating,
  updating, deleting, testing, and connecting custom MCP servers.
- `src-tauri/src/agent_mcp.rs` owns the custom-server repository, validation,
  transports, secret bundles, discovery, invocation, output bounds, timeouts,
  and run-policy snapshots. Exact lines must be reverified when scheduled.
- `src-tauri/src/agent_runtime/api.rs` adds discovered MCP descriptors to the
  run catalog and snapshots MCP policy.
- `src-tauri/src/agent_runtime/tools.rs:292-370` dispatches `mcp_` tools through
  Rust policy, handles elicitation, and maps failures to app errors.
- `src-tauri/src/agent_runtime/host.rs` and the existing interruption protocol
  persist and resume approvals.

ADR-0039 requires Rust-owned MCP transport and policy, OS-keychain secret
custody, HTTPS except loopback HTTP, bounded output, timeouts, and approval for
unknown or mutating tools. ADR-0040 reserves Clovy-owned capabilities for
in-loop host tools and keeps MCP for genuinely external servers. The
user-operated Microsoft server belongs to the external path.

### Existing session and context surfaces

- `src/components/agent/AgentWorkspace.tsx` owns normal focused agent session
  state, composer context, project context, and runtime interaction.
- `src/lib/agent-project-context.ts` supplies Project instructions and context
  at session boundaries. Mail content must be added as clearly delimited user
  context, not silently promoted to system or Project instructions.
- `src/lib/agent-session-drafts.ts` keeps composer drafts separated by stored
  session id. A Mail context selection must not leak into another session.
- `src/components/agent/chat-turns/AgentSessionBar.tsx` and related chat-turn
  surfaces provide the existing session chrome where a selected-context marker
  could be represented.
- Existing note-reference and attachment patterns are useful precedents for
  explicit source selection and visible context, but email must retain its own
  untrusted-content and privacy rules.

### Existing UI and approval patterns

- `src/components/ui/Dialog.tsx` provides the canonical modal, portal, focus
  trap, Escape, backdrop, and focus restoration behavior.
- `src/components/ui/Select.tsx` and existing searchable Project dialogs provide
  selection and filtering patterns.
- `src/app/app-layout.tsx` mounts `ConnectorApprovalsTray` globally.
- `src/components/connectors/ConnectorApprovalsTray.tsx` provides bounded,
  redacted approval rows and individual/bulk decisions.
- Existing `src/components/agent/` composer and chat components provide the
  normal Project conversation rather than a parallel mail chat database.

Likely UI inventory for later implementation:

- a Mail context affordance in the Project agent surface;
- a bounded search/result panel and selected-message preview;
- a visible selected-context block in the existing conversation;
- an explicit mail-first Ask Clovy action that resolves a Project and opens or
  resumes a stored agent session;
- existing MCP settings and approval surfaces, with final paths reverified.

These are starting inventories, not implementation promises. The key Phase 0
choice is whether read results can safely travel through an existing short
agent-runtime operation or need a new Rust-owned typed read boundary. The
renderer must never bypass MCP policy or receive credentials.

## Proposed first-version experience

### Project-first: add Mail context to chat

1. The user is inside a Project-scoped Clovy agent session.
2. They choose **Add context** and then **Mail context**. This is a contextual
   action, not a new primary navigation destination that competes with Outlook.
3. Clovy opens a lightweight search panel. It first shows the 20 newest
   received messages, sorted newest first. Search can narrow that initial set;
   it must not silently search the entire mailbox and inject results.
4. The panel returns bounded message summaries: sender, subject, received time,
   and a short sanitized preview. The initial list is capped at 20 and any
   broader search or pagination remains bounded.
5. The user selects one message. Clovy shows a preview with source metadata and
   bounded plain-text content. Opening the preview does not modify the session.
6. The user chooses **Add to chat**. Only then does the bounded email context
   enter the current stored agent session.
7. The conversation renders a visible context block such as:

   ```text
   Email context added
   Re: Q3 launch timeline
   Priya Nair · Today, 09:42
   [Show message] [Remove context]
   ```

8. Clovy can now compare the email with Project instructions, Project memory,
   enabled Obsidian content, and the user's direct question.

### Mail-first: Ask Clovy about this email

1. The user opens Mail context from a Project or a lightweight launcher.
2. They search and select one email. Previewing it does not create a session.
3. They choose **Ask Clovy about this email**.
4. Clovy asks for or uses an unambiguous Project target. If a Project is not
   unambiguous, it asks a targeted clarification rather than guessing.
5. Clovy opens or resumes a normal stored agent session for that Project and
   adds the selected email as explicit context.
6. The user asks follow-up questions. Clovy may search the enabled Obsidian
   vault or other Project context through the normal tools and approval policy.

The mail-first action must not create a fresh stored session on every email
open. It creates or resumes only after the user explicitly asks Clovy to work
with the selected email.

### Draft reply from context

1. From either path, the user asks Clovy to draft a reply.
2. Clovy uses the selected message's verified sender, subject, and thread data
   only when supplied by the host and present in the selected context.
3. Clovy calls the exact verified draft tool discovered in Phase 0.
4. Clovy pauses with an approval card showing recipient, subject, and the full
   proposed body.
5. Approval saves one Outlook draft. Denial, timeout, or failure saves nothing
   and returns an actionable result to the Project conversation.
6. No send button, send tool, or delivery implication is available in this
   release.

## Architecture and safety invariants

- Project chat is the center of gravity. Mail context is a bounded source lens,
  not a second Outlook client or session database.
- Opening a Mail context panel, searching, selecting, or previewing a message
  does not create a stored session, add context, or persist a mailbox copy.
- Only explicit **Add to chat** or **Ask Clovy about this email** crosses the
  message-content boundary into an agent session.
- The selected stored session id, never the runtime session id, identifies the
  durable context handoff.
- If Project context is ambiguous, Clovy asks a targeted clarification. It
  never infers a Project from a sender name or email content alone.
- Email bodies, HTML, signatures, quoted history, links, and attachments are
  untrusted data. They cannot change tool policy, grant capabilities, select a
  recipient, or bypass draft approval.
- Full message reads and previews are bounded. Malformed or oversized content
  produces a recoverable error rather than silent semantic truncation.
- The initial Mail context request returns at most 20 messages sorted by
  received time, newest first. Filtering keeps that stable order and does not
  silently expand the mailbox window.
- The Docker MCP server is external, user-operated infrastructure. Clovy does
  not download, launch, update, or supervise it in v1.
- Rust validates server URL, account binding, OAuth state, tool visibility,
  safety policy, timeout, and output limits. The renderer sees typed
  descriptors and sanitized results, never MCP credentials.
- The first-release allowlist exposes verified read tools plus an exact draft
  tool. Send-capable tools must be absent from the effective run catalog and
  rejected by host policy if invoked by name.
- Draft creation always requires approval regardless of remote annotations.
- Any Project-specific memory or Obsidian access remains governed by the
  existing Project and runtime policy. Email content does not become Project
  memory automatically.
- Privacy copy accurately explains that selected content travels from Outlook
  through the self-hosted MCP process into the selected Clovy model path.

## Implementation phases

### Phase 0: context contract and external-server spike

**Status: not started.**

- Confirm Project-first versus mail-first entry points and exact copy.
- Run a pinned `ms-365-mcp-server` version in Docker and verify its HTTP MCP
  endpoint and OAuth mode.
- Capture exact tools for bounded message listing, message retrieval, and draft
  creation. Confirm draft and send are separate operations.
- Verify permissions, account/tenant states, pagination, body format, HTML,
  attachments, throttling, auth expiry, and output sizes.
- Test an include-list that excludes every send-capable tool.
- Decide whether list/detail reads use an existing short runtime operation or a
  narrowly scoped Rust-owned read boundary. Direct renderer MCP calls are not
  allowed.

**Exit criterion:** the Project-first Mail context contract, mail-first handoff
contract, exact read/draft tool inventory, permission matrix, safe allowlist,
auth/reconnect behavior, bounds, and session context rules are documented. The
feature is blocked if the server cannot isolate drafting from sending.

### Phase 1: Project-first Mail context

**Status: not started.**

- Add a contextual Mail context affordance to Project chat rather than a
  permanent Outlook-like navigation destination.
- Implement bounded search, message summaries, loading, empty, no-match,
  disconnected, unavailable, and permission-error states.
- Preview one message with source metadata and bounded plain text.
- Add selected context to the current stored agent session only after explicit
  user action. Make the context visible and removable.
- Add keyboard and screen-reader behavior, focus restoration, and data-partition
  guards.

**Exit criterion:** a Project conversation can search, preview, and explicitly
add one email context without creating a new session or local mailbox index.

### Phase 2: mail-first Ask Clovy handoff

**Status: not started.**

- Provide a lightweight mail-first entry only where the product surface earns
  it. Do not turn every email open into a session.
- Add explicit **Ask Clovy about this email** action.
- Resume an existing Project session or create one only after that action and
  only with an unambiguous Project target.
- Reuse normal AgentWorkspace session creation, Project context, Obsidian
  policy, drafts, and stored-session identity.
- Add cancellation and stale-selection handling so closing the panel leaves no
  pending session intent.

**Exit criterion:** previewing or opening an email has no session side effect;
explicit Ask Clovy opens or resumes one Project session with one selected email
context.

### Phase 3: draft reply from context

**Status: not started.**

- Add the verified draft tool only after Phase 0 confirms its exact contract.
- Present full recipient, subject, and body approval preview.
- Save exactly one draft after approval; denial, timeout, expired auth, and
  server failures are actionable.
- Verify send tools are absent from descriptors and rejected by host policy.
- Test hostile email content and recipient manipulation attempts.

**Exit criterion:** one approved reply becomes one Outlook draft; denied or
failed drafts create nothing; no send operation is reachable.

### Phase 4: verification and pilot rollout

**Status: not started.**

- Test personal and standard work/school account states, admin denial, expired
  auth, revoke, unavailable server, timeout, throttling, and malformed content.
- Run prompt-injection corpus tests against selected message content and
  Obsidian results.
- Perform accessibility and real-app QA for Project-first context, mail-first
  handoff, session reuse, cancellation, and approval recovery.
- Pilot behind a safe disable path while preserving MCP configuration and
  existing sessions.
- Publish a support guide for Docker persistence, OAuth reconnect, privacy, and
  secure container operation.

**Exit criterion:** deterministic tests, visual/keyboard evidence, privacy copy,
support guidance, and rc pilot/rollback evidence are complete.

### Phase 5: broader mail and Microsoft 365 features

**Status: deferred.**

Defer Outlook management, sending, attachments, shared mailboxes, multiple
accounts, Calendar, Files, Teams, mail triggers, unattended routines, and local
message history until each has a separate product, permission, privacy, and
safety contract.

**Exit criterion:** each follow-up has a separate decision and implementation
Issue; none is implied by Mail context.

## Verification strategy

### Product and session behavior

- Opening or previewing Mail context creates no stored session and emits no new
  session event.
- Project-first **Add to chat** adds exactly one selected message to the current
  stored session and can remove it without leaking into another session.
- Mail-first **Ask Clovy about this email** opens or resumes only after explicit
  action and uses an unambiguous Project target.
- Partition changes and stale selections cannot add context to the wrong stored
  session.
- Project instructions, Project memory, and enabled Obsidian access remain on
  the normal policy path.

### External MCP and transport

- Docker startup and persistent token-cache behavior.
- Streamable HTTP discovery, OAuth, reconnect, and invalidation.
- HTTPS and loopback validation through the existing MCP subsystem.
- Exact server-version tool discovery fixtures.
- Read and draft tools appear in the effective catalog; send tools do not.
- Timeout, output-bound, pagination, throttling, and no-mutation-retry tests.

### UI and accessibility

- Project chat opens Mail context with focus restored on close.
- Search, bounded result list, preview, Add to chat, Ask Clovy, cancel, empty,
  no-match, loading, disconnected, and failure states are accessible.
- The initial result state contains at most 20 messages and is ordered by
  received time, newest first. Filtering keeps the same stable order.
- Selected context is visible in the conversation and has a clear source label.
- No Outlook-like folder/navigation surface is required for the first release.
- Test light/dark themes, responsive width, collapsed sidebar, keyboard
  navigation, and screen-reader semantics.

### Draft approval and security

- Approval shows the complete recipient, subject, and body before saving.
- Approval saves one draft; denial, timeout, and failure save nothing.
- No send tool, send action, or send approval exists in the first-release
  catalog or UI.
- Hostile email content cannot alter policy, select recipients, invoke tools, or
  bypass approval.
- Privacy copy matches the actual external MCP and model data path.
- Logs, telemetry, and errors do not expose OAuth tokens or unnecessary mail
  content.

### Real-app release evidence

- Open a Project chat, search Mail context, select one email, add it to chat,
  ask a question that uses Project/Obsidian context, and remove the context.
- Open Mail context separately, preview a message, verify no session is created,
  then choose Ask Clovy and verify Project session handoff.
- Draft a reply, review the approval card, save or deny it, and verify no send
  operation is possible.
- Capture light/dark screenshots or a recording and record environment,
  checks, artifacts, and gaps in the dated QA run.

## Open questions and decision gates

1. **Project-first trigger:** Where should Add context -> Mail context live in
   Project chat: composer action, session-bar action, or a compact context tray?
2. **Mail-first entry:** Does the optional mail-first flow deserve a launcher at
   all in v1, or should it be reachable only from an existing Project session?
3. **Project resolution:** When Ask Clovy starts from Mail context, how should
   Clovy choose a Project if there is no active Project? Recommendation: require
   an explicit Project choice rather than guessing from email content.
4. **Session reuse:** Should Ask Clovy resume the most recent Project session,
   let the user choose among Project sessions, or always ask before opening?
5. **Read boundary:** Can bounded list/detail reads safely use an existing
   runtime-mediated operation, or is a new Rust-owned typed boundary required?
6. **Context shape:** Should the chat store bounded body text, a source reference
   that the runtime re-reads, or both? Recommendation: visible bounded context
   plus stable source metadata, with no mailbox index.
7. **Initial list:** The first request returns at most 20 messages sorted by
   received time, newest first. Confirm whether filtering searches only that
   top-20 window or may request another bounded page from the external server.
   Recommendation: start with top 20 and make broader search an explicit,
   bounded follow-up.
8. **Body handling:** Convert HTML to bounded plain text, provide a sanitized
   preview, or reject unsupported messages until a safe renderer exists?
9. **Exact external server:** Which tagged server release is supported, and does
   it expose a genuinely separate draft operation?
10. **OAuth and account scope:** Is one personal or standard work/school account
    sufficient for v1? Shared mailboxes and multiple tenants are recommended
    deferrals.
11. **Privacy disclosure:** Which model destinations and local-model options must
    be named before the user adds email context?
12. **ADR threshold:** Add an ADR only if the Project-context/MCP boundary is
    accepted as a hard-to-reverse, surprising product architecture choice with
    a real trade-off. It is a candidate, not an accepted decision.

These decisions should be resolved before their corresponding phase starts.
They are not reasons to reproduce Outlook's full surface.

## Explicit future ideas

- Ask Clovy about an email with a richer split view, only if the mail-first path
  proves useful.
- Draft replies using Project and Obsidian context with explicit source labels.
- Send after a separate recipient-aware approval decision.
- Reply-all, forward, attachments, and bounded document context.
- Search across multiple external source connectors through one context picker.
- Shared mailboxes, multiple accounts, and tenant-aware Project permissions.
- User-approved mail triggers and routines.
- Calendar-aware context suggestions.
- Local message-reference history without copying mailbox content.
- A broader Microsoft 365 workspace only if the context lens cannot serve the
  observed workflow.

## Documentation and handoff

When implementation is scheduled, create or update concrete guidance for
Docker setup, OAuth, persistent token storage, tool policy, privacy disclosure,
context retention, reconnect, and secure operation. Link the accepted Issue,
feature plan, ADR if required, and QA evidence from the roadmap row.

The existing broader documents remain distinct:

- `docs/plugins/microsoft-365-prd.md` remains the proposed broad Microsoft 365
  product direction.
- `docs/plugins/microsoft-365-implementation-plan.md` remains a historical
  proposal whose `june_*` MCP integration shape is stale.
- This roadmap is the narrower Project-first Mail context direction, with an
  optional explicit mail-first handoff and draft-only action.

## Decision summary

Do not build Outlook inside Clovy. Start with Project-first Mail context: a
bounded search and preview surface opened from an existing Project chat, with
full email content entering the session only after explicit Add to chat. Treat
mail-first Ask Clovy as an optional explicit handoff, never an automatic session
creator. Reuse the external MCP and Rust-owned policy boundary, keep selected
context visible and removable, and defer sending and the broader Microsoft 365
surface until the context workflow proves its value.
