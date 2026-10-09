# Implementation Report

**Plan:** `docs/roadmap/mcp-original-integration/plan.md`
**Branch:** `implementation/mcp-original-integration`
**Commit:** `520e4586 feat: restore original Clovy MCP contract (Phases 0-3)`
**Date:** 2026-10-02
**Status:** PARTIAL - Phases 0 to 3 complete; Phase 4 live evidence remains

## Summary

Restored the shared external MCP contract across ordinary runs, unattended routines, and Bonzai builds while retaining Rust-owned transport, Keychain, validation, bounds, cancellation, no-replay behavior, managed Linear trust grants, and call-time MCP approval snapshots.

## Tasks completed

| Phase | Result | Main files |
| --- | --- | --- |
| 0: decision and compatibility contract | Done | ADR-0059 addendum, implementation log, plan resolutions |
| 1: global MCP availability | Done | `src-tauri/src/routines.rs`, `src-tauri/src/agent_runtime/tools.rs`, routine and MCP tests |
| 2: Bonzai MCP parity | Done deterministically | `agent_mcp.rs`, `bonzai/egress.rs`, `bonzai/mod.rs`, deleted `bonzai/mcp_policy.rs`, settings form |
| 3: compatibility and persistence | Done | No schema or migration changes; compatibility tests |
| 4: evidence and rollout | In progress | Live macOS walkthrough, release-build check, release note, rollback artifact remain |

## Key decisions

- Retained `snapshot_run_policies()` and `run_policy_matches()` because the TypeScript harness freezes `requiresApproval` from the run-start descriptors and Rust has no independent approval check before invocation. Removing the snapshot would allow a tightened mid-run approval policy to be bypassed.
- Retained the managed Linear routine gate because `june_linear` and `june_linear_actions` are native connector trust identities, not generic MCP server-name grants.
- Removed only the generic custom-MCP routine visibility mechanism.
- Removed the Bonzai-only MCP host allowlist and stdio refusal, but retained Bonzai inference egress and all guarded HTTP constructors.

## Validation results

| Check | Result |
| --- | --- |
| Rust formatting | Pass |
| Frontend typecheck | Pass |
| Biome on changed frontend files | Pass |
| Clippy all targets | Pass with the pre-existing `clippy::incompatible_msrv` lint explicitly allowed; the existing violation is `src-tauri/src/bonzai/audio.rs:84` |
| Focused Rust MCP/routine/Bonzai/tools tests | 138 passed, 0 failed |
| Rust migration tests | 23 passed, 0 failed |
| Rust runtime persistence tests | 15 passed, 0 failed |
| Bonzai egress guard | 4 passed, 0 failed |
| MCP build parity guard | 3 passed, 0 failed |
| Full Rust suite with Bonzai disabled | 1,572 passed, 0 failed, 6 ignored on the complete run |
| Full frontend suite | 157 files, 1,743 tests passed; Vitest exited 0 with one worker |
| MCP settings form suite | 7 passed, 0 failed |

The repository-root `.env` activates Bonzai during local Rust tests. With that environment active, unrelated local-transcription/timing tests fail because they expect the ordinary local provider; the MCP-focused suite remains green. The no-Bonzai full run is the authoritative full-suite result.

## Tests added or updated

- Routine custom MCP pass-through and managed Linear boundary tests.
- Empty routine catalog test proving custom MCP is available while host tools remain filtered.
- Shared MCP server-id parser.
- Cross-build external HTTPS, loopback HTTP, and stdio definition validation tests.
- Real stdio discovery fixture with include/exclude and default approval assertions.
- Disabled and sandbox-ineligible server omission test.
- Mid-run approval tightening failure test.
- Legacy empty snapshot cannot gain a callable server test.
- Machine-independent `mcp_build_parity_guard` source tests.
- MCP settings form parity test for both transports and persisted stdio.

## Compatibility and persistence

Migrations 027 to 029, `agent_run_mcp_policies`, `routines.tool_catalog_version`, `agent_runs.mcp_policy_snapshotted`, Keychain references, and persisted run configuration were not changed. Existing interrupted runs continue to use their immutable serialized configuration. No migration, secret rewrite, mutation replay, or destructive cleanup was introduced.

## Documentation

Updated ADR-0059 with an append-only dated addendum, updated the Bonzai implementation plan and PRD, refreshed the upstream fork ledger, updated the roadmap status and implementation plan, and recorded the full change history in `docs/roadmap/mcp-original-integration/implementation-log.md`.

## Files changed

17 files were committed: 14 updated, 1 deleted (`src-tauri/src/bonzai/mcp_policy.rs`), and 2 created (`implementation-log.md`, `mcp_build_parity_guard.rs`). Existing unrelated user WIP remains unstaged and uncommitted.

## Deviations from plan

1. The plan proposed retiring the MCP run-policy snapshot; Phase 0 research showed it is the only call-time approval guard, so it was retained.
2. The plan proposed removing the entire MCP routine call gate; it remains as a managed Linear connector grant check, while custom servers always pass.
3. The shipped MCP form fix was retained except for Bonzai-only transport restrictions.
4. The roadmap plan remains at its indexed path rather than being archived under `.claude/PRPs/plans/completed/`, because it is a tracked roadmap document. Its status table and implementation log are updated instead.

## Next steps

- Run the live ordinary and Bonzai macOS walkthrough with disposable HTTPS and stdio servers.
- Run the release-build inference egress check and preserve the rollback artifact.
- Add the user-facing release note distinguishing Bonzai inference egress from external MCP transport egress.
- Create the PR after the Phase 4 evidence gate is complete.
