# Roadmap: original Clovy MCP integration

**Owner:** Desktop engineering and architecture
**Date:** 2026-10-01
**Status:** In progress (Phases 0 to 3 implemented 2026-10-02; Phase 4 live evidence outstanding; see the [implementation log](implementation-log.md))
**Scope:** Restore the original external MCP behavior across ordinary agent runs, unattended routines, and Bonzai builds by removing the unproven MCP-specific routine controls and Bonzai MCP host restrictions while preserving Rust ownership, Keychain custody, transport validation, approvals, bounds, cancellation, and Bonzai inference egress

This document records product and architecture direction for a future capability. It is not an ADR, a product launch commitment, an implementation authorization, or a decision to remove safety boundaries. The file paths, line references, protocol details, and implementation inventory are starting points and must be re-verified when work is scheduled. A roadmap entry is not permission to change accepted ADRs, migrations, or release policy.

---

## Executive recommendation

Restore the external MCP contract that existed before the Bonzai-only MCP overlay and the routine-specific MCP catalog control were added:

1. Every globally enabled, valid, user-configured MCP server is available to an ordinary focused agent run.
2. The same globally enabled server catalog is available to an unattended routine. A routine does not need a separate MCP toolset grant.
3. The routine `enabledToolsets` policy remains in place for Clovy-owned host tools and native connector toolsets. It is not made a no-op for the entire routine system; it simply stops being an MCP visibility mechanism.
4. MCP calls no longer pass a routine-specific server allowlist gate.
5. The MCP-specific run-policy snapshot is retired as a product control, while its schema and historical rows remain for compatibility and rollback. *(Resolved otherwise at implementation, 2026-10-02: the snapshot is retained as the call-time approval guard; it never filtered visibility. See resolution 3.)*
6. Bonzai no longer applies a separate MCP host allowlist or disables stdio MCP. External HTTPS and stdio MCP return to the shared Clovy registry behavior.
7. Bonzai inference remains separately restricted by `bonzai::egress::assert_allowed()` and the source-level guarded-client check.

The restored boundary is:

```text
Settings / persisted MCP registry
        |
        v
Rust MCP repository + Keychain + shared validation
        |
        v
Discovery and invocation for ordinary runs and routines
        |
        +--> bounded descriptors
        +--> current Rust-owned approval policy
        +--> cancellation, timeout, and output bounds
        +--> no automatic replay of outcome-unknown mutations
        v
Clovy agent harness receives typed descriptors and opaque results
```

This is a prove-need-first rollback, not a move to arbitrary shell execution. The product should not add a new routine MCP picker, a generic `run_cli` tool, a runtime host allowlist, or a Clovy-managed MCP server to make this restoration work.

### Why this is a rollback rather than a new feature

The external MCP registry and Rust transport already existed as the shared Clovy integration. The Bonzai MCP allowlist and stdio prohibition are fork-specific overlays in `src-tauri/src/bonzai/mcp_policy.rs` and `src-tauri/src/bonzai/egress.rs`. The routine catalog and call-time MCP gates were added as product policy on top of the existing host-owned registry. The target is therefore to remove unproven control layers and return to the simpler existing behavior, not to invent a new integration surface.

---

## Product thesis and distinctions

The product thesis is deliberately narrow: **do not require evidence for a new per-routine MCP control plane before allowing the already-configured external MCP integration to behave consistently across agent runs.** If users need stronger routine-specific MCP selection later, that should be justified by observed usage and designed as a separate workstream.

| Entity | Restored behavior | What this roadmap does not mean |
| --- | --- | --- |
| User-configured external MCP server | A globally enabled, valid server is discoverable in ordinary runs and routines | It is not a Clovy-managed plugin server or arbitrary shell access |
| MCP transport | Rust owns stdio and Streamable HTTP lifecycle, credentials, bounds, and cancellation | The TypeScript harness never receives credentials or process handles |
| MCP safety policy | Server include/exclude visibility, default approval, sandbox availability, timeouts, and output bounds remain | Removing the Bonzai host list does not remove validation or approval |
| Routine | Uses the same external MCP catalog as an ordinary focused run | Routine host tools and native connector trust policy are not removed |
| Bonzai | Inference remains restricted to the compiled Bonzai inference destinations | Bonzai no longer has a separate MCP destination whitelist |
| Clovy-owned capability | Remains a Rust-owned host tool or broker under ADR-0040 | This roadmap does not restore retired `june_*` MCP server shapes |

The phrase **ordinary focused agent run** means the full agent session path that starts with `run.start` and receives the normal runtime tool catalog. It does not mean the lightweight Home conversation path, which intentionally uses a compact prompt and a `start_task` handoff contract (`docs/home-assistant.md`).

---

## Roadmap status

**This table is the single source of truth for phase status.** Detailed phase headings repeat each status. Vocabulary: `not started` | `in progress` | `done` | `blocked` | `deferred`.

| Phase | Status | Exit criterion | Evidence or blocker |
| --- | --- | --- | --- |
| 0: decision and compatibility contract | **done** | The restored behavior, retained safety boundaries, ADR gate, and before/after matrix are approved for implementation planning | Decisions D1 to D4 in the [implementation log](implementation-log.md): run-policy snapshot retained as the only call-time approval guard; managed Linear keeps its connector gate; dated ADR-0059 addendum instead of a superseding ADR |
| 1: restore global MCP availability | **done** | Ordinary and unattended runs expose every globally enabled server that passes shared Rust availability checks | `routines.rs` `routine_mcp_descriptors()`; routine and dispatch gates admit every custom server; unit tests prove a custom descriptor reaches a routine with an empty catalog while disabled and sandbox-ineligible servers stay absent |
| 2: restore Bonzai MCP parity | **done** (deterministic); release-build walkthrough outstanding | Bonzai accepts configured external HTTPS and stdio MCP without weakening Bonzai inference egress | `bonzai/mcp_policy.rs` and the MCP host list removed; form offers stdio again; shared MCP suite green on a Bonzai-configured machine (baseline 9 failures); egress guard 4/4; new `tests/mcp_build_parity_guard.rs` |
| 3: compatibility and non-destructive persistence | **done** | Existing registry rows, Keychain references, routine data, run data, and migration history survive without destructive DDL or mutation replay | No migration, schema, repository, or Keychain change; snapshot rows still written and consulted; migrations 23/23, runtime persistence 15/15 |
| 4: evidence, rollout, and rollback | **in progress** | Deterministic tests and live ordinary/Bonzai walkthroughs prove restored behavior and retained safeguards | Deterministic Rust and frontend coverage done. Outstanding: live macOS walkthrough (ordinary and Bonzai builds), Bonzai release-build egress run, user-facing release note, rollback artifact |

---

## Goals

- Restore external MCP availability in unattended routines without a per-routine MCP picker or server-name allowlist.
- Restore external MCP transport parity between ordinary Clovy builds and Bonzai builds: Streamable HTTP is not host-allowlisted by Bonzai, and stdio is not refused by the Bonzai overlay.
- Preserve Rust as the authority for MCP discovery, invocation, process lifecycle, secrets, approvals, path validation, safety, bounds, and cancellation.
- Preserve Keychain-only storage for MCP environment values, HTTP headers, and OAuth material.
- Preserve server-level tool visibility (`include` / `exclude`) and approval defaults.
- Preserve `enabled` and `allow_sandboxed` checks, so a disabled or sandbox-ineligible server is still unavailable.
- Preserve no-replay behavior for MCP mutations whose outcome is unknown.
- Preserve the Bonzai inference destination allowlist, HTTPS enforcement, guarded HTTP constructors, and source-level CI guard.
- Keep the rollback reversible by retaining existing schema, policy rows, Keychain references, and run configuration.
- Produce evidence before treating the restored path as a supported release behavior.

---

## First-release non-goals

- Removing all routine policy or making `enabledToolsets` irrelevant to Clovy-owned host tools and native connectors.
- Removing native connector trust modes (`read_only`, `approval`, `autonomous`) or their Rust-side enforcement.
- Restoring Clovy-managed MCP servers or the retired Hermes/Python bridge architecture.
- Reintroducing `june_browser`, `june_computer_use`, `june_obsidian`, or other retired Clovy-owned MCP shapes.
- Removing Rust transport validation, URL scheme checks, command/argument checks, output limits, timeouts, or session retirement.
- Moving credentials into SQLite, the renderer, the TypeScript harness, logs, traces, or approval cards.
- Adding a runtime-configurable MCP host allowlist, arbitrary command execution, shell interpolation, or a generic `run_cli` tool.
- Adding a new MCP management UI, routine MCP selector, or connector picker. The existing global MCP Settings surface remains the configuration surface.
- Adding external providers, expanding Bonzai inference destinations, restoring hosted search, or changing the Bonzai model route.
- Replaying pending or outcome-unknown MCP mutations during upgrade, rollback, reconnect, or policy restoration.
- Removing the shared `reqwest` construction guard or weakening the Bonzai inference egress boundary.
- Implementing this roadmap, creating an Issue or ADR, changing migrations, committing, or opening a pull request.

---

## Existing architecture and current seams

### Accepted ownership boundary

ADR-0038 establishes the current host boundary: the TypeScript agent harness orchestrates the model/tool loop, while Rust owns secrets, persistence, tool execution, path validation, safety, approvals, and artifacts. The harness is not the sandbox.

ADR-0039 establishes the external MCP boundary: definitions and nonsecret policy are stored in SQLite, secrets are stored in the operating-system Keychain, Rust discovers and invokes MCP over stdio or Streamable HTTP, and TypeScript receives only typed descriptors and opaque results. Unknown custom tools require approval by default. This roadmap restores that boundary; it does not replace it.

ADR-0040 remains binding: Clovy-owned capabilities are host tools inside the Rust dispatch table, not Clovy-managed MCP servers. The external MCP path remains reserved for genuinely external servers the user connects.

### Ordinary focused agent run

`src-tauri/src/agent_runtime/api.rs:2149-2164` snapshots MCP policy for the current implementation, and `:2211-2307` builds the ordinary tool catalog. The catalog calls `AgentMcpSubsystem::refresh_registry_for_workspace_with_managed_linear()` at `:2266-2295` and appends the discovered descriptors without a routine `enabledToolsets` filter.

The restoration should keep the ordinary discovery and bounded descriptor behavior. It should remove the MCP-specific product snapshot if Phase 0 confirms that current-policy evaluation is the desired restored contract. The run configuration remains immutable for resume compatibility; removing the MCP product snapshot does not permit history or input rewriting.

### Routine catalog

`src-tauri/src/routines.rs:1169-1215` builds the unattended run parameters. `unattended_tools()` at `:1272-1364` currently:

1. filters built-in host tools through `routine_base_tool_allowed()`;
2. discovers global MCP servers through `AgentMcpSubsystem`;
3. filters each MCP descriptor through `routine_mcp_server_enabled()`;
4. filters native connector descriptors through `native_connectors::routine_tool_allowed()`.

The target is to retain steps 1 and 4, while step 3 no longer removes external MCP descriptors. The global MCP subsystem continues to apply `enabled`, `allow_sandboxed`, supported transport, workspace, discovery, tool visibility, and bounds checks.

`routine_mcp_server_enabled()` at `routines.rs:1428-1445` and `routine_mcp_server_allowed_for_session()` at `:1483-1513` are the routine-specific MCP policy seams. The implementation phase should remove their MCP-specific product use, not turn the entire routine host-tool policy into an unrestricted catalog.

### MCP dispatch and safety

`src-tauri/src/agent_runtime/tools.rs:113-263` dispatches all host tools. Non-MCP tools pass through the routine host-tool gate at `:119-132`; MCP names use the `mcp_` path at `:247`.

`mcp_tool()` at `tools.rs:292-374` refreshes discovery, resolves the current server and tool policy, currently invokes the routine-specific MCP gate at `:313-327`, checks the run policy snapshot at `:328-341`, then invokes through Rust with elicitation, cancellation, and session handling. The target is to remove the routine-specific MCP gate and snapshot dependency while retaining discovery, current descriptor policy, elicitation, cancellation, timeout/error handling, and no replay of `tools/call`.

### MCP registry and shared validation

`src-tauri/src/agent_mcp.rs` remains the primary shared implementation:

- `:35-53` defines the `agent_mcp_servers` registry schema.
- `:152-358` defines transport and definition validation, including stdio command/argument checks, Streamable HTTP URL checks, timeout/output bounds, and reserved identity checks.
- `:361-426` keeps environment/header/OAuth values in an opaque, zeroized Keychain bundle.
- `:1086-1182` persists and reads nonsecret definitions.
- `:1508-1625` discovers enabled servers, respects sandbox availability, and preserves healthy servers when another discovery fails.
- `:1626-1783` invokes registered tools through Rust-owned transport.
- `:1886-2010` implements the current run-policy snapshot and match functions, which are candidates for retirement as product control but must not be destructively removed from existing schema without a compatibility decision.
- `:2404-2419` starts stdio or Streamable HTTP sessions.
- `:2422-2476` owns the stdio child process and its bounded protocol exchange.

The restored “no whitelist” behavior still retains shared validation. In particular, ordinary external HTTP MCP remains HTTPS-only unless it is exact loopback HTTP under `agent_mcp.rs:256-263` and `:326-340`. “No MCP host whitelist” means no compiled host membership list, not no scheme, URL, command, credential, or output validation.

### Bonzai overlay and the retained inference boundary

The Bonzai MCP overlay is separate from inference egress:

- `src-tauri/src/bonzai/mcp_policy.rs:15-38` currently rejects stdio and calls `assert_mcp_allowed()` for Streamable HTTP.
- `src-tauri/src/bonzai/egress.rs:41-107` contains both the retained inference policy (`ALLOWED_HOSTS`, `assert_allowed()`, guarded client construction) and the MCP-specific policy (`MCP_ALLOWED_HOSTS`, `MCP_LOOPBACK_HOSTS`, `mcp_allowed_hosts()`, `assert_mcp_allowed()`).
- `src-tauri/src/agent_mcp.rs:345-349`, `:2404-2419`, and Tauri test/OAuth commands around `:3440-3477` apply the MCP overlay in multiple entry points.

The target removes only the MCP-specific overlay. It retains:

- `assert_allowed()` for Bonzai inference;
- the compiled Bonzai inference hosts;
- HTTPS-only inference;
- exact host matching and redacted blocked errors;
- `guarded_builder()` and `guarded_client()`;
- `src-tauri/tests/bonzai_egress_guard.rs`, which prevents a new raw HTTP client from bypassing the retained construction boundary.

### Persistence and migration history

The append-only migration catalog includes:

- `src-tauri/migrations/027_agent_mcp.sql` for the global MCP registry;
- `src-tauri/migrations/028_agent_run_mcp_policy.sql` for run policy rows;
- `src-tauri/migrations/029_agent_run_mcp_snapshot.sql` for the snapshot marker behavior;
- registrations in `src-tauri/src/db/migrations.rs` around versions 34-37;
- `routines.tool_catalog_version` and `agent_runs.mcp_policy_snapshotted` compatibility fields.

The roadmap recommends leaving these structures in place initially. The runtime can stop writing or consulting MCP snapshot rows as an active product gate while old rows remain readable recovery data. Any eventual cleanup requires a later append-only migration and a separate compatibility review.

---

## Before and after policy matrix

| Scenario | Current implementation | Restored target |
| --- | --- | --- |
| Ordinary run, enabled custom HTTPS MCP | Discovered if Bonzai admission passes; descriptors appended | Discovered and appended if shared Rust availability checks pass |
| Ordinary run, enabled custom stdio MCP | Available outside the Bonzai overlay; refused by Bonzai | Available wherever shared stdio validation and platform sandbox rules pass; no Bonzai MCP refusal |
| Routine, enabled custom MCP | Discovered, then dropped unless its display name is in `enabledToolsets` | Same global catalog as ordinary focused runs, subject to global server availability and descriptor policy |
| Routine, disabled custom MCP | Omitted by `server_available()` | Omitted by `server_available()` |
| Routine, sandbox-ineligible custom MCP | Omitted by `server_available()` | Omitted by `server_available()` |
| Include/exclude tool visibility | Applied by `McpToolRegistry` | Still applied |
| Default or per-tool approval | Descriptor and Rust host policy | Still applied; removal of routine visibility does not make mutations autonomous |
| Native connector tools | Routine toolsets and trust-mode policy | Unchanged |
| Clovy-owned host tools | Routine `enabledToolsets` policy | Unchanged |
| Bonzai external MCP host | Empty compiled MCP allowlist blocks non-loopback hosts | No MCP host membership allowlist; shared Rust validation governs transport shape |
| Bonzai loopback MCP | Exact loopback exception | Ordinary shared MCP validation; no Bonzai-specific MCP list |
| Bonzai inference | Compiled Bonzai inference allowlist | Unchanged |
| Live server definition changes | MCP run snapshot may reject drift | Unchanged: the run snapshot still rejects drift for the active run, and the next run uses the current definition (Phase 0 decision D1; tested) |
| Outcome-unknown mutation | Never automatically replayed | Never automatically replayed |

The key distinction is that **MCP availability is restored globally, while host-tool and native-connector policy remains routine-specific**.

---

## Phase 0: decision and compatibility contract

**Status: done.** Decisions recorded in the [implementation log](implementation-log.md) (D1 to D4).

Before implementation, approve a short policy and compatibility contract containing:

- ordinary focused run with enabled external HTTPS MCP;
- ordinary focused run with enabled stdio MCP;
- sandboxed macOS stdio with an explicit workspace;
- sandbox-ineligible server (`allow_sandboxed = false`);
- routine with enabled external HTTPS MCP and no MCP name in `enabledToolsets`;
- routine with enabled stdio MCP and no MCP name in `enabledToolsets`;
- disabled server;
- include/exclude visibility;
- default approval and per-tool approval;
- server change during a live run;
- OAuth refresh, 401, and reconnect-required behavior;
- cancellation, timeout, child exit, malformed response, and oversized result;
- Bonzai inference URL enforcement after MCP policy removal;
- Bonzai external HTTPS and stdio MCP after policy removal.

The contract must explicitly distinguish:

- **shared Rust MCP validation**, which remains;
- **global server availability**, which remains;
- **MCP-specific routine visibility and snapshot controls**, which are being removed;
- **native connector trust and host-tool routine policy**, which remain;
- **Bonzai inference egress**, which remains;
- **Bonzai MCP destination and transport overlay**, which is being removed.

### ADR gate

This roadmap does not create an ADR. Before implementation, review ADR-0038, ADR-0039, ADR-0040, and ADR-0059. Removing the Bonzai MCP host allowlist and stdio prohibition changes an accepted security/interoperability trade-off, even though it restores the original shared MCP contract. If the team judges that change hard to reverse, surprising without context, and materially security-sensitive, add a dated superseding ADR or addendum before implementation. If the change is judged a reversible restoration of the original Clovy contract with no new architectural boundary, record the superseded Bonzai MCP clauses in the implementation plan and release notes instead.

Either path must preserve the accepted inference egress mechanism. No ADR outcome authorizes removing `assert_allowed()` or the source-level guarded-client check.

**Exit criterion:** the policy matrix and ADR gate are accepted for implementation planning, with the active-run treatment of legacy snapshot rows explicitly documented.

---

## Phase 1: restore global MCP availability

**Status: done.**

Restore the same global external MCP catalog for ordinary focused runs and unattended routines.

### Routine catalog

In `src-tauri/src/routines.rs`:

- retain filtering of built-in host tools through `routine_base_tool_allowed()`;
- retain native connector filtering through `native_connectors::routine_tool_allowed()`, `routine_trust()`, and trust mode;
- retain routine browser grants and host-tool policy;
- retain the global MCP refresh with `enabled`, `allow_sandboxed`, transport, workspace, and discovery checks;
- stop filtering discovered MCP descriptors through `routine_mcp_server_enabled()`;
- stop using `routine_mcp_server_enabled()` to map managed Linear routine identities for generic MCP visibility;
- preserve `routine_id` where connector policy still needs it, but ensure it no longer implies an MCP catalog allowlist.

The routine catalog should append each descriptor returned by the global MCP subsystem, exactly as the ordinary catalog does, after global availability and discovery succeed.

### Call-time dispatch

In `src-tauri/src/agent_runtime/tools.rs`:

- retain the non-MCP routine host-tool gate at `:119-132`;
- retain native connector dispatch and trust enforcement;
- remove the MCP-specific call to `routine_mcp_server_allowed_for_session()`;
- retain MCP registry refresh, server/tool resolution, current server availability, descriptor policy, elicitation, cancellation, and session retirement;
- remove reliance on the MCP run-policy snapshot if Phase 0 accepts current host-owned policy evaluation; *(Phase 0 did not: retained, decision D1)*
- retain the `mcp_` namespace and fail-closed errors.

The desired effect is not “routines can call any host tool.” It is “routines receive the same external MCP catalog, and external MCP remains constrained by the shared Rust MCP boundary.”

### Run construction

In `src-tauri/src/agent_runtime/api.rs`:

- retain ordinary discovery and descriptor serialization;
- remove MCP policy snapshot creation from new run setup if Phase 0 accepts that product control is unnecessary; *(Phase 0 did not: retained, decision D1)*
- retain immutable `run_config_json` for resume and interruption compatibility;
- preserve bounded discovery failures so one unhealthy server does not remove healthy tools.

**Exit criterion:** a deterministic fixture proves that an enabled custom MCP descriptor reaches both an ordinary run and an unattended routine without a routine MCP toolset entry, while disabled and sandbox-ineligible servers remain absent.

---

## Phase 2: restore Bonzai MCP parity

**Status: done** (deterministic); release-build walkthrough outstanding.

Remove the Bonzai-only MCP admission overlay so external MCP behaves as it did in the original Clovy integration.

### MCP-specific controls to remove or retire

The implementation inventory should cover:

- `src-tauri/src/bonzai/mcp_policy.rs` and its tests;
- `MCP_ALLOWED_HOSTS` and `MCP_LOOPBACK_HOSTS` in `src-tauri/src/bonzai/egress.rs`;
- `mcp_allowed_hosts()` and `assert_mcp_allowed()`;
- `crate::bonzai::mcp_policy::check()` from `agent_mcp.rs:345-349` (`validate_custom`);
- the transport-start check around `agent_mcp.rs:2404-2419`;
- the save/test/OAuth checks around `agent_mcp.rs:3440-3477`;
- Bonzai UI behavior that hides stdio, if any remains after the policy calls are removed;
- tests that assert an empty MCP allowlist, loopback-only admission, or unconditional stdio refusal.

The exact removal shape must be reverified against the current tree when implementation begins. The goal is not to delete the entire `bonzai` module or its HTTP constructor guard.

### Shared validation to keep

`McpServerDefinition::validate()` must continue enforcing:

- valid server name and id;
- valid stdio command and argument shape;
- no control separators in stdio arguments;
- valid Streamable HTTP URL;
- HTTPS for non-loopback HTTP MCP;
- timeout and output bounds;
- tool visibility and approval defaults;
- reserved managed-server identity rules.

“No whitelist” means the absence of compiled MCP host membership checks. It does not mean arbitrary URL schemes, malformed definitions, unbounded output, or credentials leaving Rust.

### Inference egress to keep

In `src-tauri/src/bonzai/egress.rs`, preserve:

- `ALLOWED_HOSTS` for inference;
- `assert_allowed()`;
- HTTPS-only inference and exact host matching;
- blocked-error redaction;
- `guarded_builder()` and `guarded_client()`;
- `src-tauri/tests/bonzai_egress_guard.rs`.

MCP HTTP clients may continue using the guarded constructor as a source-level construction invariant. They must not use the inference destination assertion as an MCP host whitelist.

### Explicit trade-off

Restoring stdio in Bonzai means a user-owned MCP process can make network requests that the in-process inference egress check cannot observe. The roadmap must state this honestly. The retained Bonzai egress claim applies to Bonzai inference traffic and does not claim to sandbox arbitrary external stdio process egress.

**Exit criterion:** release-build fixtures prove external HTTPS MCP and stdio MCP can be configured and reached on Bonzai, while the same build still rejects an inference request to a non-allowlisted host and the source-level raw-client guard remains effective.

---

## Phase 3: compatibility and non-destructive persistence

**Status: done.**

Do not rewrite the append-only migration history to erase the work being rolled back. Keep:

- `027_agent_mcp.sql` and `agent_mcp_servers`;
- `028_agent_run_mcp_policy.sql` and `agent_run_mcp_policies`;
- `029_agent_run_mcp_snapshot.sql`;
- migration registrations around versions 34-37;
- `routines.tool_catalog_version`;
- `agent_runs.mcp_policy_snapshotted`;
- all existing schema migration rows;
- all Keychain `secret_ref` values;
- all server metadata, visibility, safety, and approval configuration.

The new runtime may stop writing and consulting MCP snapshot rows as an active product gate, but old rows and marker fields remain available for downgrade, recovery, and forensic compatibility. Do not mass-clear `enabledToolsets`: it remains meaningful for host tools and native connector policy.

### Legacy run handling

- New runs use the restored global MCP catalog and current host-owned MCP policy.
- Existing interrupted runs retain their persisted `run_config_json` and history.
- A legacy run with snapshot rows must not silently gain a new tool or replay a pending mutation merely because the snapshot is no longer an active product control.
- If a run resumes with a pending MCP elicitation or approval, the implementation must choose and test one explicit behavior: preserve the old serialized interruption contract, or require a new explicit retry. It must never automatically redispatch an outcome-unknown `tools/call`.
- Policy drift, disable/delete, and credential revocation still fail closed through the current Rust transport and server availability checks.

### Migration verification

Use the existing migration and persistence test style to prove:

- every historical migration prefix upgrades to the current schema;
- upgrades are idempotent;
- existing registry rows and Keychain references are preserved;
- policy rows and snapshot markers remain without being newly required for normal new runs;
- no destructive delete, secret re-encryption, or mutation replay occurs;
- malformed migration states fail transactionally.

**Exit criterion:** a downgrade-compatible, non-destructive persistence review signs off on the new runtime's treatment of old MCP policy state and interrupted runs.

---

## Phase 4: evidence, rollout, and rollback

**Status: in progress.** Deterministic coverage done; live and release-build evidence outstanding.

### Deterministic runtime and Rust checks

Add or update focused coverage for:

- enabled custom MCP descriptors in ordinary runs;
- enabled custom MCP descriptors in unattended routines without a routine MCP allowlist entry;
- disabled servers omitted;
- sandbox-ineligible servers omitted;
- external HTTPS and stdio discovery/invocation;
- non-loopback HTTP rejected by shared validation, not a Bonzai host list;
- include/exclude visibility;
- default approval and per-tool approval;
- elicitation and clarification;
- timeout, output bound, malformed response, hostile descriptor, and child exit;
- cancellation retiring stdio and HTTP sessions;
- server disable/delete retiring active sessions;
- OAuth refresh and reconnect behavior;
- no automatic retry or replay after outcome-unknown mutation;
- Bonzai inference allowlist and HTTPS tests unchanged and green;
- the source-level egress guard still catches a raw client constructor outside `bonzai/egress.rs`.

### Live evidence

Use disposable providers and a real macOS walkthrough:

1. Configure an external HTTPS MCP server in ordinary Clovy.
2. Configure a user-owned stdio MCP server in ordinary Clovy.
3. Confirm both appear in an ordinary focused run.
4. Confirm both appear in a routine without adding a routine MCP toolset.
5. Exercise include/exclude visibility and default approval.
6. Cancel an in-flight call and confirm process/session retirement.
7. Disable or delete the server and confirm no stale invocation.
8. Repeat external HTTPS and stdio checks on a Bonzai build.
9. Confirm Bonzai inference still rejects a non-allowlisted destination.
10. Confirm no MCP secret appears in SQLite, descriptors, logs, traces, approval cards, or diagnostics.

### Rollout gate

Do not promote the restored behavior based on unit tests alone. Require:

- a green focused Rust/runtime suite;
- migration and persistence evidence;
- a Bonzai release-build evidence run;
- evidence that the retained inference egress guard still blocks an unapproved model destination;
- a documented user-facing note that Bonzai no longer restricts MCP hosts but still restricts Bonzai inference;
- a rollback artifact or previous build available before any release promotion.

**Exit criterion:** the restored behavior and retained boundaries are demonstrated in ordinary and Bonzai builds, and a previous artifact can be shipped without data or credential loss.

---

## Compatibility, safety, and rollback invariants

- **Rust owns MCP.** The renderer and TypeScript harness never spawn MCP processes, read Keychain values, choose policy, or receive process handles.
- **Global availability is not unrestricted execution.** A server must be enabled, valid, reachable, and allowed in the current sandbox/runtime context. Its tools still pass server visibility and approval policy.
- **No MCP host whitelist.** External MCP host admission is not based on `MCP_ALLOWED_HOSTS` or a runtime replacement. Shared transport validation remains.
- **Bonzai inference remains closed.** No change may permit model traffic to bypass `assert_allowed()` or the source-level guarded-client check.
- **Credential custody remains local.** Secret values never enter SQLite content fields, descriptors, logs, traces, approval previews, or issue reports.
- **Run boundaries remain durable.** Immutable run configuration and persisted interruptions remain compatible. Removing the MCP-specific snapshot is not permission to rewrite run history.
- **No mutation replay.** A transport timeout, cancellation, process exit, or ambiguous response never causes automatic redispatch of the same MCP mutation.
- **Native connector policy remains explicit.** Connector trust and routine host-tool policy are not silently broadened as a side effect of restoring external MCP.
- **Clovy-owned capabilities remain host tools.** The rollback does not recreate the retired MCP server shapes rejected by ADR-0040.
- **Failure is loud and bounded.** Invalid definitions, unavailable servers, timeouts, protocol errors, oversized responses, and revoked credentials surface actionable errors without a shell fallback.

---

## Adjacent roadmap and documentation impact

### Shipped MCP form plan

`docs/roadmap/mcp-form-url-field-fix/plan.md` remains a valid historical record of the delivered Bonzai form fix. Its Phase 1 result remains shipped. Its Phase 2 MCP allowlist policy and follow-ups about compiling external hosts become superseded if this roadmap is implemented. The plan should be reclassified in a later documentation cleanup rather than rewritten as part of this roadmap.

The shipped UI form correction does not need to be undone merely because the policy overlay is removed. A form that initializes correctly remains useful for both transports.

### Proposed local CLI tools plan

`docs/roadmap/local-cli-tools/plan.md` remains Proposed and its recommendation to reuse the Rust-owned external MCP registry remains valid. Its Bonzai-only Phase 4 blocker, stdio boundary, and loopback-only framing become fork-specific or obsolete under the restored behavior and should be reconciled when that roadmap is next updated. Read-only-first and user-owned adapter boundaries remain product decisions independent of the whitelist.

### Existing Bonzai docs and ADR-0059

ADR-0059 and the Bonzai implementation/readiness docs currently describe an empty external MCP allowlist and disabled stdio. Implementation work must either add an append-only dated addendum/superseding ADR or explicitly record why the restoration is treated as a reversible compatibility correction under the ADR test. The accepted inference egress mechanism must remain authoritative.

Historical ADRs remain append-only. Do not rewrite pre-existing decisions to make them appear never to have existed. Add a supersession or dated clarification where current release claims would otherwise be ambiguous.

### QA and terminology

The restored contract needs a generic MCP matrix in QA. The current QA coverage is sparse outside Computer use parity, and several historical plugin plans still describe retired Clovy-managed MCP shapes. Implementation follow-up should update current QA language to distinguish:

- user-configured external MCP;
- hosted connector MCP;
- Clovy-owned host tools;
- ordinary focused runs;
- unattended routines;
- Bonzai inference egress versus MCP transport admission.

---

## Open questions and decision gates

1. **ADR treatment of the Bonzai MCP rollback:** Does removing the allowlist and stdio prohibition meet the repository's hard-to-reverse, surprising, real-trade-off test? If yes, add a superseding ADR/addendum before implementation; if no, record the superseded policy and release claim changes in the implementation work.
2. **Legacy active runs:** Should a run created under MCP snapshot policy preserve its serialized behavior through one resume, or should an MCP interruption require explicit retry under the restored policy? The answer must never permit automatic mutation replay.
3. **Live policy drift:** After snapshot retirement, should a server definition change fail only at the next descriptor refresh, or should the runtime preserve a narrower current-definition fingerprint check? This is a safety decision, not a reason to retain the entire routine-specific catalog control by default.
4. **Bonzai stdio disclosure:** What user-facing disclosure is required for a user-owned stdio process whose network egress is not observable by Bonzai's in-process guard? The implementation must not imply that the Bonzai inference allowlist governs that subprocess.
5. **External MCP OAuth egress:** Generic OAuth endpoint validation, same-origin checks, Keychain custody, refresh, and no-replay behavior remain required after removing the MCP host list. Confirm that OAuth metadata endpoints are still validated by shared MCP code.
6. **Existing plan cleanup:** Should the shipped MCP form plan and local CLI plan be updated in the same implementation release, or in a docs-only follow-up? Avoid changing the dirty untracked local CLI plan without an explicit scope decision.

### Resolutions (2026-10-02, at implementation)

Details and evidence are in the [implementation log](implementation-log.md).

1. **ADR treatment:** a dated addendum on ADR-0059 records the superseded MCP clauses and restates the unchanged inference decision; no superseding ADR. The change restores an existing contract (ADR-0039), adds no boundary, and is reversible.
2. **Legacy active runs:** a run resumes from its immutable `run_config_json`, so it keeps its original catalog and serialized interruption contract. Nothing redispatches a `tools/call`. A prerelease run rebuilt without a persisted config can advertise a server it never snapshotted, but calling it fails closed (`agent_mcp_policy_changed`).
3. **Live policy drift:** the run-policy snapshot is **retained**, not retired. It is the only call-time guard against an approval policy tightened mid-run, because the harness pauses only for the `requiresApproval` flags frozen at run start. It never filters which servers a run sees, so it does not conflict with global availability.
4. **Bonzai stdio disclosure:** recorded in the ADR-0059 addendum and the PRD update; the user-facing release note is a Phase 4 deliverable and still outstanding.
5. **External MCP OAuth egress:** confirmed in code. Every OAuth endpoint passes `secure_oauth_url()` (HTTPS or exact loopback HTTP, no embedded credentials), the metadata hint and declared resource are same-origin checked, discovery disables redirects, and tokens stay in the keychain bundle. None of it depended on the removed host list.
6. **Existing plan cleanup:** deferred to a docs-only follow-up. The shipped MCP form plan stays a historical record, and the untracked local CLI plan is not touched.

---

## Explicit future ideas and follow-ups

- Revisit routine-specific MCP visibility only if usage evidence shows that global MCP availability creates a real product or safety problem.
- If users later need selective routine MCP access, design it as a new, evidence-backed capability with stable server IDs rather than display-name matching.
- Consider a separate, provider-specific approval/action contract for unattended mutations instead of a generic MCP trust layer.
- Add a current MCP visibility matrix to QA and the documentation index.
- Reconcile stale provider plans that still describe retired Clovy-managed MCP shapes when those plans are next touched.
- Keep local CLI adapter work read-only-first and user-owned; do not infer that restoring stdio means Clovy should discover or install arbitrary executables.

---

## ADR and Issue follow-ups

This roadmap creates neither artifact.

When implementation is scheduled, likely tracker work should be split into independently reviewable outcomes:

- restore global MCP availability for routines;
- remove MCP-specific Bonzai host admission and stdio refusal;
- preserve schema and run compatibility without replay;
- update tests, release evidence, and current documentation.

An ADR candidate is appropriate only if the team confirms that removing the Bonzai MCP egress/stdio restriction is a hard-to-reverse, surprising security trade-off. The candidate must explicitly preserve the Bonzai inference allowlist and distinguish inference egress from external MCP transport.

---

## Decision summary

The recommendation is to restore the original Clovy external MCP integration rather than build a new routine MCP control plane. All globally enabled, valid external MCP servers should be available to ordinary focused runs and unattended routines. The routine `enabledToolsets` machinery remains for Clovy-owned host tools and native connector policy, but no longer filters external MCP. The routine-specific MCP call gate and MCP product snapshot are retired without destructive schema cleanup. *(At implementation the call gate kept only the managed Linear connector check and the snapshot was retained as the approval guard; see the resolutions above.)*

Bonzai removes its MCP-only host whitelist and stdio prohibition, returning external MCP admission to shared Clovy validation. This does not remove Rust transport ownership, Keychain custody, server visibility, approval defaults, bounds, cancellation, no-replay behavior, or the separate Bonzai inference egress guard. The work starts with a decision and compatibility contract, proves the restored path with disposable and live evidence, and keeps a previous artifact and all local state available for rollback.
