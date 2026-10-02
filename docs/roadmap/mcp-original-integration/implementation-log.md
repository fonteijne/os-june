# Implementation log: original Clovy MCP integration

**Plan:** [plan.md](plan.md)
**Branch:** `implementation/mcp-original-integration` (existing feature branch, two commits ahead of `origin/bonzai-main`)
**Started:** 2026-10-02
**Tracker:** OS Platform not configured in this session (no `OS_PLATFORM_API_KEY`, no `os_platform_*` tools); platform sync skipped.

This log records what changed, why, and every place the implementation deliberately departed from the plan's wording. Entries are appended in the order the work happened.

---

## Phase 0: decision and compatibility contract

### Provenance findings (verified against git history)

| Control | Introduced by | Origin |
| --- | --- | --- |
| Routine MCP catalog filter `routine_mcp_server_enabled()` and call-time gate `routine_mcp_server_allowed_for_session()` | `28a067f1 fix(agent): close routines and MCP review gaps`, extended by `725d3be4` (#1000, managed Linear) | Upstream Clovy |
| MCP run-policy snapshot `snapshot_run_policies()` / `run_policy_matches()`, migrations 028 and 029 | `28a067f1`, `56062ade fix(agent): freeze empty MCP run policies`, `725d3be4` | Upstream Clovy |
| Bonzai MCP overlay `bonzai/mcp_policy.rs`, `MCP_ALLOWED_HOSTS`, `assert_mcp_allowed()`, stdio refusal, hidden stdio option | `313f1a2a Phase 6: MCP policy` | This fork |
| Exact loopback MCP exception `MCP_LOOPBACK_HOSTS`, check in Tauri test/OAuth commands | `7f45cc20 fix: allow loopback HTTP MCP servers` | This fork |

### Decisions taken at implementation time

The plan leaves three decisions to Phase 0. Research on the current tree settled them as follows.

**D1. The MCP run-policy snapshot is retained (plan open questions 2 and 3).**
The plan allows retiring the snapshot "if Phase 0 accepts current host-owned policy evaluation". Phase 0 does not accept it, because the snapshot is the only call-time approval enforcement for MCP:

- The TypeScript harness decides whether to pause for approval solely from the `requiresApproval` flag in the descriptors it received at `run.start` (`agent-runtime/src/sdk-engine.ts`, `needsApproval: descriptor.requiresApproval ?? false`). `validateRunStart` in `agent-runtime/src/service.ts` does not recompute it.
- Those descriptors are frozen into the immutable `run_config_json`. A normal interrupted resume reuses them verbatim; it does not rebuild the catalog.
- Rust has no independent "was this call approved?" check before `invoke_in_workspace_with_elicitation_and_managed_linear()`.
- Therefore, if a server's approval policy is tightened mid-run (approval off at run start, on now), the harness would execute the call without pausing. `run_policy_matches()` is the only thing that fails that call closed (`agent_mcp_policy_changed`).

Removing it would break the plan's own invariants ("removal of routine visibility does not make mutations autonomous", "Preserve server-level ... approval defaults"). The snapshot is not a visibility control: it never filters which servers a run sees, it pins approval state per run for both ordinary runs and routines. Keeping it costs nothing in the restored behavior and needs no schema decision. Live-drift behavior is therefore: a server definition change fails the next call of that run closed with an actionable "retry the turn" error, and the next run uses the current definition.

**D2. Managed Linear keeps its routine gate.**
`routine_mcp_server_enabled()` has two branches. The generic branch (custom server display name must appear in `enabledToolsets`) is the MCP-specific product control the plan removes. The managed Linear branch maps the historical `june_linear` / `june_linear_actions` connector toolsets to Linear's hosted read and action tools. Those identities come from native connector policy (`src-tauri/src/connectors/policy.rs`), not from a user MCP picker, and the action identity is only granted to routines in the `approval` trust mode. That is native connector trust policy, which the plan says is retained ("Native connector policy remains explicit"). It stays, both at catalog time and at call time.

**D3. Bonzai MCP overlay: release-notes path, not a superseding ADR (plan open question 1).**
The removal restores the shared Clovy contract that ADR-0039 already records, adds no new architectural boundary, and is reversible by restoring the removed overlay. Following the plan's ADR gate, it is recorded as a dated addendum on ADR-0059 (append-only; the original decision text is untouched), plus this log and the fork ledger in `UPSTREAM.md`. The inference allowlist, `assert_allowed()`, and the source-level guard are explicitly unchanged.

**D4. Plan file stays in place.**
The `prp-implement` workflow archives plans to `.claude/PRPs/plans/completed/`. This plan is a tracked, indexed roadmap document, so it stays at `docs/roadmap/mcp-original-integration/plan.md` and its status table is updated instead. The implementation report is written to `.claude/PRPs/reports/`, which is local scratch.

---

## Change log

### Baseline (before any change)

`cargo test --lib -- agent_mcp:: routines:: bonzai:: agent_runtime::tools` on this checkout: **129 passed, 9 failed**. All nine are shared `agent_mcp` tests (`server_definition_round_trips_and_stays_nonsecret`, `human_readable_server_names_match_the_settings_ui_contract`, `duplicate_names_are_rejected_across_repository_restart`, the three snapshot tests, and the four stdio session tests). Root cause: the repository-root `.env` sets `BONZAI_BASE_URL`, `load_local_env()` loads it inside `cargo test`, so `bonzai::active()` is true and the Bonzai overlay rejects stdio and every external HTTPS definition at `validate_custom()` / `start_transport()`. CI has no `.env`, so CI was green while a Bonzai-configured machine could not pass the shared MCP suite. This is direct evidence for the plan's thesis that the overlay breaks the shared MCP contract on Bonzai builds.

### Task 1: Phase 1, routine MCP catalog (`src-tauri/src/routines.rs`)

- `unattended_tools()` now appends every descriptor returned by `AgentMcpSubsystem::refresh_registry_for_workspace_with_managed_linear()` through a new pure helper, `routine_mcp_descriptors()`, instead of an inline loop that dropped any custom server whose display name was missing from `enabledToolsets`. The per-descriptor `AgentMcpRepository::get()` lookup that only existed to read that display name is gone.
- `routine_mcp_server_enabled()` lost its `server_name` parameter. Custom servers return `true`; the managed Linear branch (`june_linear` read, `june_linear_actions` action) is unchanged (decision D2).
- `routine_mcp_server_allowed_for_session()` lost its `server_name` parameter and now only enforces the managed Linear connector grant at call time.
- Retained untouched: `routine_base_tool_allowed()`, `native_connectors::routine_tool_allowed()`, `routine_trust()`, `routine_tool_allowed_for_session()`, `enabled_toolsets_from_metadata()`, the discovery failure warning, and the run-policy snapshot call in `unattended_run_params()` (decision D1).
- Tests: rewrote `historical_linear_toolsets_preserve_read_and_action_boundaries` for the new signature (managed boundaries unchanged); added `custom_mcp_servers_need_no_routine_toolset_entry`, `routine_catalog_keeps_every_discovered_custom_mcp_descriptor` (custom descriptors reach a routine with an empty catalog, managed Linear only with its grants, approval flags preserved), and `routine_with_an_empty_catalog_reaches_custom_mcp_but_not_unlisted_host_tools` (the call-time gate admits a custom server while host tools stay withheld). Updated `routine_session_gate_maps_saved_linear_toolsets_to_hosted_policy`: a custom server named `linear` is now admitted (`Some(true)`) instead of refused, and a non-routine session returns `None`.
- Why a pure helper: `unattended_tools()` needs a real `tauri::AppHandle` (managed Linear discovery and native connector descriptors), and the repo has no `tauri::test::mock_app` usage. Extracting the filter makes the restored catalog contract testable without changing the function's behavior.
- Validation: `cargo check --all-targets` clean; `cargo test --lib -- routines::` 37 passed, 0 failed.

### Task 2: Phase 1, call-time dispatch (`src-tauri/src/agent_runtime/tools.rs`)

- `mcp_tool()` no longer passes the server display name to the routine gate; the gate now only refuses a managed Linear tool the routine's connector grants do not cover. The non-MCP routine host-tool gate at the top of `dispatch_tool()`, the registry refresh, current-policy resolution, `run_policy_matches()` (decision D1), elicitation, cancellation, and session retirement are unchanged.
- Deviation from the plan's wording: the plan says "remove the MCP-specific call to `routine_mcp_server_allowed_for_session()`". The call stays because it now carries only the managed Linear connector check (D2); for every custom server it returns `Some(true)`. Removing it outright would let an approval-trust or read-only routine call Linear hosted action tools it was never granted, if such a descriptor ever reached it.

### Task 3: Phase 2, Bonzai MCP overlay removed in Rust

- `src-tauri/src/agent_mcp.rs`: removed the four `crate::bonzai::mcp_policy::check(...)` calls in `McpServerDefinition::validate_custom()` (save), `start_transport()` (connect), `test_agent_mcp_server` (Test command), and `connect_agent_mcp_oauth` (OAuth connect). These hunks now match upstream exactly. Retained deliberately: the five `crate::bonzai::egress::guarded_builder()` substitutions (source-level guard invariant), the `.no_proxy()` calls and the `is_loopback_mcp_host()` helper with its `[::1]` test from the shipped loopback fix (`7f45cc20`), and all shared validation in `McpServerDefinition::validate()` (name, id, stdio command and control-separator checks, HTTPS or exact loopback HTTP, timeout and output bounds, reserved managed id).
- `src-tauri/src/bonzai/mcp_policy.rs`: deleted (`git rm`), with its four tests (`stdio_is_refused_outright`, `a_loopback_http_server_is_permitted`, `an_http_server_off_the_allowlist_is_refused_with_the_egress_reason`, `a_missing_or_malformed_url_is_still_a_definition_error`). The last property survives as shared validation and is covered by `transport_validation_rejects_ambiguous_and_unsafe_shapes` and the new save test below.
- `src-tauri/src/bonzai/mod.rs`: dropped `pub mod mcp_policy` and its index line; the module doc now states that external MCP is not governed by the Bonzai layer.
- `src-tauri/src/bonzai/egress.rs`: removed `MCP_ALLOWED_HOSTS`, `MCP_LOOPBACK_HOSTS`, `mcp_allowed_hosts()`, `assert_mcp_allowed()` and their four tests (`the_mcp_allowlist_is_empty_in_release_and_refuses_external_hosts`, `loopback_http_mcp_is_permitted_in_all_builds`, `loopback_https_mcp_is_also_permitted`, `non_loopback_http_mcp_is_still_refused`). Unchanged: `ALLOWED_HOSTS`, `DEV_ALLOWED_HOSTS`, `allowed_hosts()`, `assert_allowed()`, `is_allowed_host()`, `normalize_host()`, `blocked()`, `guarded_builder()`, `guarded_client()`, and every inference test. `loopback_mcp_does_not_bypass_inference_egress` is kept as `plaintext_loopback_inference_is_refused`; new `an_external_mcp_host_is_not_an_inference_destination` proves an MCP-style host (including `mcp.linear.app`) is still blocked for inference.
- New `agent_mcp` tests:
  - `external_https_and_stdio_definitions_save_on_every_build`: external HTTPS, stdio, and loopback HTTP definitions save through `validate_custom()`; non-loopback HTTP, private-network HTTP, `file://`, and stdio arguments with control separators are still rejected.
  - `global_discovery_registers_an_enabled_custom_stdio_server`: a real stdio fixture is discovered by the same global subsystem ordinary runs and routines use; `exclude` visibility drops a tool; the unknown custom tool keeps `requiresApproval: true` by default; `policy_for_tool()` resolves it.
  - `global_discovery_admits_enabled_servers_and_omits_unavailable_ones`: a disabled server and an `allow_sandboxed = false` server are never started or registered for a sandboxed run.
  - `live_approval_tightening_fails_the_active_run_closed`: pins decision D1. A server switched from no approval to approval mid-run is refused by `run_policy_matches()`, both through the changed `updated_at` and through the pinned approval bit alone.
- New integration test `src-tauri/tests/mcp_build_parity_guard.rs` (3 tests): a source-level guard that fails on every machine, including CI, if `src/agent_mcp.rs` names any `bonzai::` item other than the guarded constructors, if `bonzai/mcp_policy.rs` or its `mod` declaration returns, or if `egress.rs` regains an MCP host list or MCP assertion. Why: CI has no Bonzai base URL, so the Bonzai prologues are inert there and unit tests alone cannot catch a reintroduced build-specific MCP check. Setting `BONZAI_BASE_URL` inside a unit test was rejected because it is process-wide and would flip the Bonzai prologues in `clovy_api.rs` and `providers/mod.rs` for concurrently running tests.
- Validation: `cargo check --all-targets` clean; scoped suite `agent_mcp:: routines:: bonzai:: agent_runtime::tools` **138 passed, 0 failed** (baseline 129/9) on this Bonzai-configured machine; `--test bonzai_egress_guard` 4/4; `--test mcp_build_parity_guard` 3/3.
- Mutation checks (each reverted immediately, verified by grep): a Bonzai-gated stdio refusal reinserted into `validate_custom()` made `external_https_and_stdio_definitions_save_on_every_build` and `global_discovery_registers_an_enabled_custom_stdio_server` fail locally, and made `the_mcp_registry_consults_bonzai_only_for_guarded_http_clients` fail with the offending file and line.

### Task 4: Phase 2, MCP settings form parity (`src/components/settings/AgentMcpServersSection.tsx`)

- Removed the Bonzai transport overlay: the `useBonzaiActive()` hook and its effect that moved a draft off stdio, the `bonzaiActive()` lookups in `openCreate()` / `openEdit()` that defaulted new drafts to HTTP and coerced persisted stdio servers to HTTP, and the conditional that hid the "Local process (stdio)" option.
- With the Bonzai lookup gone, the dialog no longer has an asynchronous step, so `openCreate()` / `openEdit()` are synchronous again and the `dialogRequestRef` stale-request guard (which only existed to discard a late Bonzai lookup) is removed. Both functions are now byte-identical to upstream.
- Retained: the save-error notice rendered above the scrollable `.dialog-body` (shipped form fix) and the scrollable dialog body CSS (`9d764841`). The component's only remaining diff from upstream is that notice placement.
- Deviation from the plan's wording: the plan says the shipped form correction "does not need to be undone". The visible form behavior it shipped (URL field present when HTTP is selected, errors visible, scrollable body) is kept; only the parts whose sole purpose was the Bonzai transport restriction are removed.
- `src/test/agent-mcp-servers.test.tsx`: removed the `../lib/bonzai` mock and replaced `opens Bonzai server creation on the HTTP transport` with `offers both transports on every build and keeps a saved stdio server on stdio` (both options present, new drafts open on stdio, switching to HTTP shows URL, a persisted stdio server opens and saves as stdio). The `findByRole("dialog")` waits are kept; they are correct for a synchronous open.
- Validation: `pnpm typecheck` clean; `vitest run src/test/agent-mcp-servers.test.tsx` 7/7.
- Mutation check: with the previous component and a Bonzai-active mock, the new test fails ("Unable to find an accessible element with the role option and name /stdio/i"). Scratch files removed and the restored component verified.

### Task 5: Phase 3, compatibility and non-destructive persistence

No persistence code changed. `git status` on `src-tauri/migrations/`, `src-tauri/src/db/`, `agent_runtime/repository.rs`, and `agent_runtime/migration.rs` is empty. Specifically:

- Migrations 027, 028, 029, their registrations, `routines.tool_catalog_version`, `agent_runs.mcp_policy_snapshotted`, and every `schema_migrations` row are untouched. No DDL, no data rewrite, no secret re-encryption, no Keychain change.
- Because the snapshot is retained (D1), `agent_run_mcp_policies` is still written for every new run and still consulted at call time. Old rows keep their meaning, so downgrade to the previous build reads exactly the shape it wrote.
- `enabledToolsets` is not cleared or rewritten. It remains meaningful for host tools, skills, browser grants, native connectors, and the managed Linear identities.
- `McpServerDefinition` serialization, `secret_ref` handling, and the Keychain bundle are unchanged, so every existing server definition loads as before. Definitions that the Bonzai overlay used to refuse at connect time (stdio, external HTTPS) now start under shared validation; no definition that shared validation rejects becomes usable.

Legacy run handling, verified in code (`resolve_agent_interruption_inner`, `agent_runtime/api.rs`):

- A run with a persisted `run_config_json` (every run created by a build with immutable run configuration) resumes with its exact frozen tool list. A routine run started before this change therefore keeps its narrower MCP catalog through resume and does not gain the newly visible custom tools. New routine runs get the restored global catalog.
- Pending MCP approvals and elicitations keep the existing serialized interruption contract. Nothing in this change redispatches a `tools/call`; `call_server()` and the managed Linear path still never replay after a timeout, disconnect, or 401.
- Only prerelease runs with no persisted configuration are rebuilt (`reconstruct_unattended_resume_params()` or the generic `run_params()` fallback). Migration 029 already marked those runs snapshotted, so `snapshot_run_policies()` adds no rows for them. If the rebuilt catalog now advertises a custom server the run never snapshotted, `run_policy_matches()` finds no row and the call fails closed with `agent_mcp_policy_changed`: the tool is visible but cannot execute, and the user is told to retry the turn. New assertion added to `empty_run_policy_snapshot_cannot_gain_a_server_on_resume` pins this for both approval states.
- Disable, delete, policy drift, and credential revocation still fail closed through `server_available()`, the registry refresh in `mcp_tool()`, `run_policy_matches()`, and the OAuth refresh path.

Validation: `cargo test --lib -- db::migrations::` 23/23 (includes `prerelease_agent_runs_get_an_immutable_mcp_snapshot_marker`); `--test agent_runtime_persistence` 15/15; `--test agent_mcp_compile` 1/1; the four snapshot tests 4/4.

### Task 6: documentation and release claims

- `docs/adr/0059-bonzai-egress-is-enforced-by-a-build-time-allowlist.md`: appended `## Addendum - external MCP returns to the shared Clovy contract (2026-10-02)`. It names the superseded MCP clauses (empty MCP allowlist, stdio disabled, streamable HTTP on allowlisted hosts only, and the loopback addendum that depended on them), states what is unchanged (inference allowlist, `assert_allowed()`, HTTPS-only inference, startup refusal, guarded constructors, source guard), and states the trade-off: the fork's claim is about inference, and a user-configured stdio or remote MCP server's own egress is outside the inference allowlist. The original decision text and earlier addenda are untouched (append-only).
- `UPSTREAM.md`: the `agent_mcp.rs` ledger row drops from 7 to 5 (Phase 1 substitutions only); the `AgentMcpServersSection.tsx` row is removed; running total 148 to **135** of 150, Phase 6 to 0, verified by summing the table (135 source, 28 test). The one remaining form difference from upstream (save-error notice placement from the shipped form fix) is noted as uncounted. The routine catalog divergence is recorded under "Fork features outside the Bonzai ledger" with conflict-resolution guidance, because it is a behavior divergence rather than a Bonzai guard. Additive-file table: `bonzai/mcp_policy.rs` removed, `egress.rs` description narrowed to inference, `tests/mcp_build_parity_guard.rs` added.
- `docs/bonzai-implementation-plan.md`: Phase 6 status row and section marked "done, then superseded (2026-10-02)" with a pointer; the shipped Phase 6 record is kept as history. The "Inference destinations remain HTTPS-only" bullet gained a dated note.
- `docs/bonzai-model-routing-prd.md`: dated update notes in sections 7.5 and 7.6 (claim 1 unchanged; claim 2 now "tool egress is the user's configuration"), and the stdio risk row marked superseded with the remaining mitigations.
- `docs/roadmap/mcp-original-integration/plan.md`: status line and status table updated (Phases 0, 1, 3 done; Phase 2 done deterministically with the release-build walkthrough outstanding; Phase 4 in progress); each detailed phase heading repeats its status; added "Resolutions (2026-10-02)" under the open questions (including the verified OAuth endpoint validation answer for question 5); the live-drift matrix row now states the decided behavior; the four lines that were conditional on retiring the snapshot carry short dated notes instead of being rewritten.
- `docs/roadmap/README.md` and `docs/index.md`: only the "Original Clovy MCP integration" rows were edited (status, phase, implementation log link) plus a pointer to the new addendum in the ADR-0059 index row. Both files also carry the user's own uncommitted roadmap edits, which were left untouched.
- Not changed, by scope decision (plan open question 6): `docs/roadmap/mcp-form-url-field-fix/plan.md` (historical shipped record), the pre-existing untracked `docs/roadmap/local-cli-tools/plan.md`, the pre-existing untracked `docs/luna-bonzai-mvp-readiness.md`, superseded ADR-0057, and historical ADR-0016 / ADR-0017 statements about the retired Hermes toolset model. The tracked navigation now describes the shared MCP contract; the two untracked WIP documents still need a separate cleanup pass before they are committed. They were not edited to avoid taking ownership of unrelated user work.

### Task 7: final validation and small refactor

- Added `agent_mcp::mcp_server_id_from_tool_id()` as the single parser for `mcp:<server-id>/<remote-tool>` descriptor IDs; the routine catalog and run-policy snapshot now share it. This preserves malformed-ID behavior while preventing the two policy paths from drifting.
- Simplified the managed Linear branch in `routine_mcp_server_enabled()` to return custom-server admission first, then compare the one required historical connector toolset.
- Validation after the refactor: `cargo check --all-targets`, `cargo fmt --check`, clippy with the repository's pre-existing `clippy::incompatible_msrv` issue explicitly allowed, focused Rust suite 138/138, guard tests 7/7, frontend typecheck, Biome changed files, and MCP form tests 7/7.
- Full frontend suite: 157 files and 1,743 tests passed with one worker; jsdom emitted existing `workspace-lazy` "Chunk unavailable" diagnostics but Vitest exited 0.
- Full Rust suite: **1,572 passed, 0 failed, 6 ignored** with `BONZAI_BASE_URL=` and `BONZAI_DEFAULT_MODEL=` explicitly disabling the repository's local Bonzai `.env`. With the local Bonzai `.env` active, 1,568 passed and 4 unrelated local-transcription/timing tests fail because they expect the ordinary local provider while Bonzai routes those calls; the MCP-focused suite remains green in that environment. A rerun with Bonzai disabled had one unrelated flaky multipart assertion (`local_transcription_posts_openai_multipart_and_maps_failures`), while the prior complete no-Bonzai run was fully green.
- Full Rust clippy is green with `-A clippy::incompatible_msrv`; without that narrow allowance, the pre-existing `src-tauri/src/bonzai/audio.rs:84` `Option::is_none_or` triggers the repository's Rust 1.80 MSRV lint. No changed file triggers the lint.

### Task 8: stale descriptor deletion race

- Fixed `snapshot_run_policies()` so a custom descriptor whose server was deleted after discovery is skipped as stale instead of returning `AgentMcpError::NotFound` and aborting routine startup. Managed Linear fingerprints remain fail-closed errors when missing.
- Added `snapshot_skips_a_custom_descriptor_deleted_after_discovery`, asserting the run still reaches the snapshotted state with zero policy rows. Invocation remains fail-closed because the deleted server is unavailable on registry refresh.
- Validation: the deletion-race regression, snapshot tests, managed Linear tests, approval-tightening test, and all routine tests passed (41 selected tests, 0 failed).

### Task 9: malformed descriptor IDs

- Hardened `mcp_server_id_from_tool_id()` to require the exact `mcp:<server-id>/<remote-tool>` shape with non-empty server and remote segments. Malformed IDs such as `mcp:/tool`, `mcp:server/`, and `mcp:server` are now ignored by both routine catalog filtering and run-policy snapshotting.
- Added `mcp_server_id_parser_rejects_malformed_descriptor_ids` coverage.
- Did not add persisted-row revalidation in this pass: normal repository writes validate, legacy imports validate and disable/quarantine invalid definitions before insertion, and discovery skips disabled rows. That lower-confidence candidate needs a concrete migration/state reproduction before changing the load boundary.
- Validation: `agent_mcp::` and `routines::` suites 80/80, formatting clean.

