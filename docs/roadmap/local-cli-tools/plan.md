# Roadmap: local CLI tools

**Owner:** Product and desktop engineering  
**Date:** 2026-09-27  
**Status:** Proposed  
**Scope:** macOS-first Clovy Desktop support for user-configured local CLI tools through the existing external MCP registry, with read-only use first and a separate path for approved actions

This document captures product and architecture direction for a future capability. It is not an ADR, a product launch commitment, an implementation authorization, or a decision to build an MCP wrapper for any particular CLI. The current file paths, protocol details, and implementation inventory are starting points and must be re-verified when work is scheduled.

## Executive recommendation

Support local CLI tools as **user-supplied external tool providers**, reusing Clovy's existing custom MCP transport and policy path rather than creating a second generic command-execution plane.

A user may already run a local CLI in a Claude Code session. Clovy cannot attach to that session's host CLI process or infer its command contract. The Clovy integration should therefore require an explicit adapter boundary owned by the user or by the CLI author. The first compatibility probe should ask whether the tool can expose MCP over stdio or a loopback Streamable HTTP endpoint. If it cannot, the user may provide a separate adapter, but designing or shipping that adapter is outside this roadmap.

The product should begin with read-only discovery and invocation. Mutating capabilities, such as sending a Slack message, remain a later phase behind explicit tool visibility, default approval, and an action-specific safety contract. A local executable is trusted with any credentials the user configures for it; Keychain custody protects Clovy's renderer and agent harness from raw secrets, not the executable from the user.

The recommended ownership flow is:

```text
User-owned CLI or user-owned adapter
        │  MCP over stdio, or loopback Streamable HTTP
        ▼
Clovy Settings: custom local tool registration
        │  explicit executable / arguments / endpoint / policy
        ▼
Rust host: validation, Keychain, process lifecycle, sandbox, discovery
        │  bounded descriptors and opaque results
        ▼
Clovy agent run or routine
        │  mcp_<server>_<tool>, run policy snapshot, approval when required
        ▼
User-visible read result or approval interruption
```

Do not make Clovy discover arbitrary binaries, install CLIs, attach to an already-running stdio process, expose a generic `run_cli` catalog, or ship a Clovy-managed MCP server for a Clovy-owned capability. Those choices would create a new execution and packaging surface and would conflict with ADR-0040.

## Product thesis and distinctions

Users already have useful local command-line tools. They should be able to make a compatible tool available to Clovy without uploading credentials or maintaining a second cloud integration. The user must understand which boundary they are configuring:

| Entity | Meaning here | What it is not |
| --- | --- | --- |
| Local CLI tool | A user-selected executable or local endpoint that exposes an external tool contract to Clovy | A Clovy-owned host tool or arbitrary shell access |
| Local adapter | A user-owned or vendor-owned process that translates a CLI's native interface into MCP | A wrapper Clovy builds, installs, signs, or manages |
| Custom MCP server | The existing Clovy registry record for a user-connected external tool provider | A Clovy-managed plugin server |
| Plugin | A user-facing Clovy capability bundle in the Plugins area | A generic executable registry |
| Connector | A private integration with a third-party account | A local CLI process |
| Runtime mode | Sandboxed or Unrestricted local system access | Connector trust mode |

The names `bridge` and `slack` are examples only. A local Slack CLI configured by the user is not the first-party Slack connector described in `docs/plugins/slack-prd.md`; that connector remains a separate product workstream with its own OAuth and channel-allowlist gate.

## Roadmap status

**This table is the single source of truth for phase status.** Detailed phase headings repeat each status. Vocabulary: `not started` | `in progress` | `done` | `blocked` | `deferred`.

| Phase | Status | Exit criterion | Evidence or blocker |
| --- | --- | --- | --- |
| 0: protocol and trust boundary | **not started** | The compatibility contract for each target CLI is documented, including whether it speaks MCP itself or needs a user-owned adapter | Blocked until the user or CLI author supplies protocol details; building the adapter is outside this roadmap |
| 1: local tool registration hardening | **not started** | Explicit local tool configuration is validated, discoverable, bounded, reviewable, and safe to remove | Reuses the current custom MCP registry; requires Rust lifecycle tests and focused settings tests |
| 2: read-only agent integration | **not started** | A configured read-only local tool works in an attended agent run with cancellation, timeout, bounded output, and no credential exposure | Requires a disposable MCP-compatible fixture and one real user-owned CLI or endpoint |
| 3: routine and approved actions | **deferred** | Read-only routine use is proven; selected mutating tools have an explicit approval and idempotency contract | Deferred until a target tool's side effects and failure semantics are reviewed; Slack first-party auth remains a separate gate |
| 4: Bonzai local-tool path | **blocked** | A local tool works without weakening the build-time egress guarantee | Current Bonzai policy rejects stdio; only exact loopback Streamable HTTP is available without a new ADR/policy decision |

## Goals

- Let users explicitly register compatible local CLI tools or loopback endpoints in Clovy.
- Reuse the existing custom MCP discovery, namespacing, approval, cancellation, timeout, output-bound, routine, and policy-snapshot machinery.
- Make read-only local tool use useful in attended agent sessions first.
- Keep process ownership, secrets, validation, safety policy, and lifecycle in Rust.
- Keep the TypeScript agent harness limited to typed tool descriptors, approval state, and opaque results.
- Make the trust boundary visible: the selected executable receives configured environment values, and a sandboxed process is not a complete network egress boundary.
- Preserve compatibility with routines without creating a second execution model.
- Keep the first version local and additive. No Clovy API deployment is expected for the generic registry path.

## First-release non-goals

- Building an MCP wrapper for `bridge`, Slack, or any other CLI.
- Reverse-engineering or attaching to the host CLI processes used by Claude Code sessions.
- Automatic PATH scanning, executable discovery across the Mac, installation, updating, version management, or package selection.
- A generic arbitrary-command or `run_cli` agent tool.
- Shell interpretation, command interpolation, or a free-form command catalog as the local-tool contract.
- Attaching to a manually launched stdio process whose stdin, stdout, and lifecycle Clovy does not own.
- Full read/write parity in the first release.
- Autonomous outbound actions, including unattended Slack posts.
- A Clovy-owned Slack connector, Slack OAuth client-secret solution, channel indexing, or away-mode event delivery.
- A Clovy-managed MCP server for a Clovy-owned plugin capability.
- Re-enabling stdio MCP in Bonzai builds.
- Treating CLI output, tool descriptions, or provider-derived text as trusted instructions.
- Cross-platform sandbox parity. Sandboxed local MCP processes remain macOS-only until an equivalent Windows isolation boundary exists.

## Existing architecture and reusable seams

### Rust-owned custom MCP registry

The existing path already models the core capability:

- `src-tauri/src/agent_mcp.rs:35-53` defines the `agent_mcp_servers` SQLite record. It stores the nonsecret name, transport, executable or URL, opaque `secret_ref`, visibility, safety policy, and timestamps.
- `src-tauri/src/agent_mcp.rs:231-358` defines `McpServerDefinition`, validates stdio versus Streamable HTTP, bounds timeouts and output, rejects control separators in stdio arguments, and applies the build-specific custom policy.
- `src-tauri/src/agent_mcp.rs:361-426` keeps environment values and HTTP headers in an opaque Keychain bundle. The bundle is zeroized and is not serialized into runtime tool descriptors.
- `src-tauri/src/agent_mcp.rs:81-118` owns persistent per-server sessions. The process is not an ambient process: Clovy owns the stdio child, stdin, stdout, request ids, and pending requests.
- `src-tauri/src/agent_mcp.rs:3296-3489` exposes the additive Tauri commands for list, create, update, delete, test, and OAuth connection. Updates and deletes retire the server's live sessions.
- The stdio implementation is the existing host-owned transport and applies the macOS Seatbelt path for sandboxed sessions. Its process behavior, stderr diagnostics, working directory, executable resolution, and failure reporting should be reviewed before claiming hardened local CLI support.

This is the natural registry for a user-owned MCP adapter. It is not permission to expose arbitrary executable launch to the model.

### Agent run and routine boundaries

- `src-tauri/src/agent_runtime/api.rs:2243-2295` builds the host tool catalog, discovers custom MCP descriptors, and snapshots the run policy. Discovery failures are logged as bounded host events while healthy tools remain available.
- `src-tauri/src/agent_runtime/tools.rs:292-374` dispatches `mcp_` calls through the Rust host, checks routine server visibility and the run policy snapshot, handles elicitation, and retires sessions on cancellation.
- `src-tauri/src/agent_runtime/tools.rs:1031-1118` is the separate per-run shell tool. It already demonstrates macOS Seatbelt execution, workspace working-directory selection, secret-reference consumption, bounded stdout and stderr, and cancellation. It must not be conflated with persistent local MCP registration.
- ADR-0038 establishes the host boundary: the Clovy-owned TypeScript agent harness orchestrates; Rust owns secrets, persistence, execution, path validation, safety, approvals, and artifacts.
- ADR-0039 establishes the custom MCP boundary: Rust discovers and invokes user-configured MCP over stdio or Streamable HTTP; the runtime sees only typed descriptors and opaque results; unknown tools require approval by default; policy and bounds remain host-owned.
- Routine toolsets and safety modes must continue to be explicit. A configured server is not automatically available to every routine, and changing its policy during a run must not widen the active run.

### Existing settings surface

`src/components/settings/AgentMcpServersSection.tsx:70-598` already provides the main product seam:

- It lives in the Plugins settings tab and currently labels the group `Custom MCP servers`.
- It supports local process (stdio) and Streamable HTTP, command plus one-argument-per-line input, URL input, Keychain-backed environment and header JSON, tool include/exclude lists, approval settings, sandbox availability, OAuth, testing, enable/disable, configure, and deletion.
- `src/lib/agent-mcp.ts:1-74` provides typed frontend bindings for the Tauri registry commands and keeps the default safety policy approval-required.
- `src/test/agent-mcp-servers.test.tsx` covers lifecycle, secrets, Bonzai behavior, OAuth, and error states. The local-tool hardening phase should extend this focused suite rather than start a parallel settings API.

The current form is intentionally minimal. It does not yet provide executable validation or discovery, working-directory semantics, PATH diagnostics, captured stderr, persistent health state, process status, explicit restart/stop controls, or an in-dialog inventory of discovered tools. Those are roadmap gaps, not authorization to add all of them at once.

### Bonzai constraint

- `src-tauri/src/bonzai/mcp_policy.rs` rejects stdio MCP in Bonzai builds.
- `docs/adr/0059-bonzai-egress-is-enforced-by-a-build-time-allowlist.md` records why: a third-party stdio executable can make network requests that the in-process allowlist cannot observe; the macOS write jail is not a network egress sandbox.
- `docs/roadmap/mcp-form-url-field-fix/plan.md` records the shipped exact loopback HTTP/HTTPS exception. A local adapter that exposes Streamable HTTP on `localhost`, `127.0.0.1`, or `::1` can fit that path without adding an external host to the compiled allowlist.

The Bonzai decision is a hard gate. A roadmap phase must not imply that arbitrary local stdio tools work in Bonzai. Supporting them would require a separately accepted ADR or policy change and evidence for the egress boundary.

### Slack overlap

`docs/plugins/slack-prd.md` and `docs/plugins/slack-implementation-plan.md` describe a first-party Slack connector with account authorization, channel allowlists, local calls, approval-only posts, polling, and a release-blocking OAuth feasibility spike. The implementation plan's old MCP server names are explicitly stale under ADR-0040.

A user-supplied Slack CLI can be registered as an external local MCP provider if it exposes an acceptable contract. It must not inherit the first-party connector's product promise, channel policy, OAuth boundary, or success criteria. The two workstreams remain separate.

## Proposed first-version experience

### Configure a local tool

1. Open Settings and enter the custom local tool registry. The first implementation may extend `Custom MCP servers`; if the distinction becomes confusing, introduce a clearly labeled `Local tools` subsection or destination rather than making a local executable look like a third-party account connector.
2. Choose `Local process (stdio)` in an ordinary Clovy build, or `Streamable HTTP` for a user-owned loopback adapter.
3. Enter a display name and an explicit executable path plus argument list, or an exact loopback URL. Clovy does not scan the Mac or install the tool.
4. Add optional environment values or HTTP headers. Clovy stores these in the system Keychain, but the configured executable receives the values when it runs.
5. Review the local-process disclosure and default approval policy. Read-only visibility should be the initial target.
6. Test discovery. Rust starts or contacts the provider, performs bounded MCP initialization and `tools/list`, and shows a concise inventory and actionable failure state without exposing secrets.
7. Enable the server only after discovery succeeds. The tool appears in a future agent run under the existing `mcp_<server>_<tool>` namespace.

### Use a read-only tool

- An attended run discovers the enabled provider at run start and captures its tool descriptors and safety policy.
- The user or routine explicitly enables the server/toolset. The model receives only the bounded descriptor and opaque result.
- Read-only tools may run without an interruption only when the host policy marks them safe. Unknown or ambiguous tools remain approval-required by default.
- Cancellation, timeout, child exit, protocol error, oversized result, disable, delete, and app shutdown fail closed and retire the owned session.
- Changing a server policy during a live run invalidates that run's server policy. The user starts a new run to pick up the change.

### Add approved actions later

A later phase may allow a target tool's mutating calls, such as posting to a selected Slack channel, only after defining:

- a named tool allowlist, not a broad command permission;
- an explicit approval preview and one-shot resolution;
- provider-side identity and target validation;
- idempotency and ambiguous-timeout behavior;
- an append-only local action record where needed;
- retry rules that never replay an outcome-unknown mutation;
- prompt-injection tests for CLI and provider output.

## Safety, privacy, identity, and failure invariants

- **Rust owns the boundary.** The renderer and TypeScript harness never spawn the CLI, read Keychain values, choose approval policy, or receive process handles.
- **Explicit ownership.** For stdio, Clovy owns stdin, stdout, process lifetime, cancellation, restart, and shutdown. A process launched separately by the user must use a configured loopback HTTP adapter instead of being attached.
- **Credentials stay local.** SQLite contains only an opaque Keychain reference. Environment and header values never enter descriptors, logs, traces, approval cards, or issue reports. The selected executable can read any credentials intentionally supplied to it.
- **Sandbox claims stay narrow.** macOS Seatbelt constrains the configured process's writes as implemented, but is not presented as a complete network boundary.
- **No ambient discovery.** The user chooses the exact executable or endpoint. Clovy does not search PATH, install packages, or infer a tool from a process list.
- **Bounded untrusted data.** Tool names, descriptions, schemas, stderr, and returned content are size-bounded, sanitized for display, and treated as data. They cannot redefine Clovy identity, grant capabilities, or bypass approval.
- **Default-deny mutations.** Read-only is the first product target. Unknown custom tools and all later mutating tools require explicit host policy and approval by default.
- **Run-boundary consistency.** Server visibility and approval policy are captured at run start. Mid-run edits do not silently widen access.
- **Fail closed.** Invalid command or endpoint, missing executable, failed startup, child crash, timeout, cancellation, protocol violation, oversized output, and stale policy produce actionable errors and do not fall through to a shell command.
- **Clovy identity remains canonical.** A local tool is an external provider; it does not redefine Clovy identity or become a new product package, service, or credential namespace.
- **Bonzai remains constrained.** No direct stdio local process in Bonzai unless a new accepted policy decision proves an observable egress boundary. Loopback Streamable HTTP remains the supported local path.

## Implementation phases

### Phase 0: protocol and trust boundary

**Status: not started.**

Confirm, for each target CLI:

- whether it already exposes MCP over stdio;
- whether it exposes Streamable HTTP on an exact loopback address;
- whether it needs a user-owned adapter and who owns that adapter's packaging, updates, and license;
- what credentials it needs and whether they can be passed through the existing Keychain bundle;
- whether it has read-only and mutating operations that can be separated;
- whether its output is bounded, structured, and safe to treat as untrusted data;
- whether its lifecycle can be owned by Clovy for stdio.

This phase does **not** build an MCP wrapper. It records the protocol and trust facts supplied by the tool author or user, then classifies each CLI as supported, adapter-dependent, loopback-only, or deferred.

**Exit criterion:** two target tools or fixtures have protocol transcripts without credentials, ownership and lifecycle are documented, and a security review confirms that the proposed boundary does not become arbitrary shell execution. If the tools do not expose a compatible contract, the phase stops with an adapter requirement rather than inventing one here.

### Phase 1: local tool registration hardening

**Status: not started.**

Harden the existing registry only where the protocol spike demonstrates a need:

- validate the configured executable path and executable identity without ambient discovery;
- decide whether arguments are structured and whether working directory is explicit;
- define inherited-environment behavior and keep secret injection explicit;
- capture bounded stderr for actionable setup and crash diagnostics without persisting secrets;
- define test discovery lifecycle, sandbox workspace behavior, startup timeout, restart, and child retirement;
- surface transport, risk, approval, and health status in the existing settings pattern;
- keep tool include/exclude and approval defaults host-owned;
- extend migrations only if an accepted contract needs durable status or additional nonsecret fields.

**Exit criterion:** Rust validation, child lifecycle, bounded output, secrets-redaction, cancellation, policy, and migration tests are green; the settings flow has deterministic validation and failure-state coverage.

### Phase 2: read-only agent integration

**Status: not started.**

Prove the complete path with one disposable fixture and one real user-owned local tool:

- discover a read-only tool set;
- register descriptors under `mcp_<server>_<tool>`;
- invoke through the Rust host from an attended run;
- verify approval defaults for unknown tools;
- cancel a blocked call and confirm the child is retired;
- exercise timeout, child crash, protocol error, oversized result, and restart;
- confirm a server policy change blocks the old run and applies on the next run;
- confirm no raw command path or secret appears in the TypeScript harness or UI diagnostics.

**Exit criterion:** a user can configure, test, enable, use, cancel, disable, and delete a read-only local tool without affecting other agent tools or healthy external providers. Evidence includes deterministic tests, protocol fixtures, and a real-app walkthrough on macOS.

### Phase 3: routine and approved actions

**Status: deferred.**

Only after Phase 2 has evidence:

- add explicit routine toolset binding for selected local providers;
- define read-only versus mutating capability metadata;
- add approval previews and action journals for side effects;
- define target allowlists and identity checks for provider actions;
- define at-most-once or reconciliation behavior for ambiguous timeouts;
- exercise prompt-injection and hostile-output fixtures;
- keep unattended mutation disabled until a separate trust decision earns it.

**Exit criterion:** one selected mutating capability can run only with an explicit host policy and approval, and restart, timeout, duplicate, revoke, and disconnect tests show no unsafe replay. This phase is not a generic write permission for a CLI.

### Phase 4: Bonzai local-tool path

**Status: blocked.**

Keep the current policy while the generic path is explored:

- stdio local MCP remains unavailable in Bonzai;
- a local tool must expose Streamable HTTP on `localhost`, `127.0.0.1`, or `::1` to fit the shipped loopback exception;
- external HTTP hosts require the compiled allowlist and a separate policy decision;
- no runtime user-controlled egress allowlist or stdio override is added;
- if direct stdio becomes a product requirement, create a new ADR or addendum first and prove an operating-system egress boundary.

**Exit criterion:** only if a target tool supports loopback HTTP, a release-build fixture proves the existing policy, and the egress review confirms no inference or external-host policy changed. Otherwise the phase remains blocked and the tool is documented as upstream-only or loopback-adapter-only.

## Verification strategy

### Deterministic Rust and runtime checks

- Definition validation for empty or non-executable commands, control characters, invalid arguments, invalid URLs, unsupported transports, and bounds.
- Process tests for explicit executable and argument handling, current directory, inherited environment, startup, graceful shutdown, child crash, restart, kill-on-cancel, timeout, and app shutdown.
- MCP fixture tests for initialization, paged discovery, malformed responses, hostile descriptions and schemas, oversized descriptors, oversized results, protocol errors, elicitation, and bounded stderr.
- Policy tests for include/exclude visibility, approval defaults, sandbox availability, routine server allowlists, run-start snapshots, mid-run policy changes, and fail-closed disable/delete behavior.
- Keychain and redaction tests proving secret values never enter SQLite, descriptors, logs, approval previews, or errors.
- Tests proving discovery cannot silently bypass the intended sandbox or execute a command through a shell.

### Frontend and settings checks

Extend `src/test/agent-mcp-servers.test.tsx` for:

- explicit local process configuration and exact arguments;
- path and executable validation errors;
- in-dialog discovery results or a clear bounded test result;
- health, startup, crash, restart, disable, delete, and test-busy states;
- secret values flowing only through the secure input shape and never through rendered diagnostics;
- default approval and tool include/exclude controls;
- Bonzai hiding stdio while retaining loopback HTTP;
- narrow-window layout, keyboard focus, dialog Escape and restoration, and accessible labels.

The settings surface should compose existing `Dialog`, `InlineNotice`, `Switch`, `Select`, `EmptyState`, `Spinner`, and `HoverTip` patterns. Use the existing tokens and central icons. Keep local-process risk copy near transport and approval controls rather than hiding it at the bottom of a long form.

### Live macOS evidence

Use a disposable MCP fixture, then a real user-owned CLI or loopback endpoint:

1. Register a read-only fixture and discover its bounded inventory.
2. Invoke a read-only tool through an attended agent run.
3. Block a call, cancel it, and verify the child is killed.
4. Force a child crash and verify the error is actionable and bounded.
5. Change policy during a run and verify the old run cannot widen access.
6. Restart Clovy and confirm no plaintext secret or stale process state is retained.
7. Run the same read-only server from a routine with an explicit toolset.
8. On Bonzai, verify stdio is rejected and exact loopback Streamable HTTP remains available.

A future UI implementation should receive light and dark real-app screenshots or a short recording. A roadmap-only sketch is a design artifact, not product QA evidence.

### Documentation validation

- Validate all local Markdown and HTML links from the new roadmap folder and both indexes.
- Confirm the README row and every detailed phase heading use matching project and phase statuses.
- Preserve unrelated dirty files, especially `docs/luna-bonzai-mvp-readiness.md`.
- Do not run or claim production test gates for this documentation-only change.

## Open questions and decision gates

1. **Protocol classification:** Do the named CLIs already speak MCP over stdio or loopback Streamable HTTP? If not, who owns and maintains the adapter? This is the Phase 0 gate and is intentionally not answered by this roadmap.
2. **Executable semantics:** Must v1 require an absolute executable path, or may Clovy resolve a user-entered command through a fixed, displayed PATH? This changes provenance, reproducibility, and diagnostics. Prefer explicit paths unless evidence supports a safer alternative.
3. **Process trust disclosure:** What exact copy explains that the selected executable receives configured credentials and may make unobserved network requests? This matters for the privacy promise and for Bonzai exclusion.
4. **Working directory and environment:** Should a user configure a working directory, and should the child inherit the parent environment beyond explicit values? These choices affect reproducibility and secret leakage.
5. **Read-only classification:** How does the host identify a read-only tool? Prefer an explicit user/tool-provided allowlist and conservative default approval rather than trusting names or descriptions.
6. **Test lifecycle:** Does Settings Test use the same sandbox and workspace semantics as an agent run? A test that bypasses safety would give a false sense of security.
7. **Health and lifecycle UX:** Is lazy per-run startup sufficient, or does a local tool need explicit start, stop, restart, and health state? The current registry starts sessions lazily and retires them on update, delete, cancellation, or app shutdown.
8. **Bonzai policy:** Is loopback HTTP enough for the Bonzai target, or is direct stdio a non-negotiable requirement? Direct stdio requires a separately accepted egress decision.
9. **Slack boundary:** Is the target a user-owned Slack CLI or the first-party Slack connector? The former belongs here only as external MCP; the latter follows the Slack PRD and its OAuth feasibility gate.

## Explicit future ideas and follow-ups

- Add a dedicated Local tools subsection or destination if Custom MCP servers alongside account connectors causes user confusion.
- Add an in-dialog bounded tool inventory, persistent last-test status, expandable redacted diagnostics, and a clearer local-process trust disclosure.
- Provide a path picker or executable validation only after provenance and working-directory semantics are accepted.
- Add a disposable fixture package for protocol and lifecycle tests without auto-installing user tools.
- Evaluate a user-owned adapter contract for CLIs that do not speak MCP. Keep adapter packaging, updates, licensing, and security review outside Clovy unless a future product decision explicitly changes scope.
- Revisit approved actions with a provider-specific action journal and no-replay-on-ambiguous-timeout rule.
- Revisit Bonzai only through an ADR-level egress decision. Do not weaken the current compiled allowlist or stdio prohibition in a roadmap update.
- Update the first-party Slack documents only when that connector work begins; do not fold a local Slack CLI into the connector's OAuth or channel policy claims.

## ADR and Issue follow-ups

This roadmap does not create either artifact.

The Phase 0 and Phase 4 choices may meet the ADR test in `AGENTS.md`: they are hard to reverse, surprising without context, and involve real security and interoperability trade-offs. When implementation is scheduled, consider a new numbered ADR after re-scanning `docs/adr/` for the highest number. A candidate decision would record that user-supplied local CLI adapters remain external MCP providers, Rust owns process and secret policy, stdio is not supported in Bonzai, and no arbitrary command plane is introduced.

The likely tracker work is separate and should be created only when the protocol evidence exists:

- Protocol and trust-boundary spike for the named local tools.
- Hardening of custom stdio registration and diagnostics.
- Read-only local tool integration and macOS walkthrough.
- A later provider-specific approved-action contract, if needed.

## Decision summary

The roadmap recommendation is to reuse Clovy's existing user-supplied MCP registry for explicit local CLI adapters. Clovy should not build or manage the MCP wrapper itself in this workstream. Read-only use comes first. Rust owns executable launch, credentials, sandbox, discovery, lifecycle, bounds, and policy; the agent harness sees typed descriptors and opaque results. Bonzai keeps its current stdio prohibition and supports local tools only through the shipped exact loopback HTTP path. First-party Slack remains separate from a user-supplied Slack CLI.
