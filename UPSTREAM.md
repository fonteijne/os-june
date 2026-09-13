# Upstream tracking and the fork ledger

This fork (`fonteijne/os-june`) is downstream of
[`open-software-network/os-clovy`](https://github.com/open-software-network/os-clovy).
It routes all AI inference through **Bonzai**, our own LiteLLM deployment
(see [docs/bonzai-model-routing-prd.md](docs/bonzai-model-routing-prd.md)).

Staying mergeable with upstream is a load-bearing requirement, not a
preference: Clovy ships and auto-updates continuously, and a fork that cannot
merge upstream is a fork that stops receiving fixes. This file is the
operational half of
[ADR-0058](docs/adr/0058-bonzai-routing-lives-in-an-additive-provider-layer.md).

## Branch topology

```
open-software-network/os-clovy : main
                 |
                 |  (1) sync: fast-forward or merge
                 v
fonteijne/os-june : main            <- mirrors upstream, no Bonzai code
                 |
                 |  (2) integrate: merge main -> bonzai-main
                 v
fonteijne/os-june : bonzai-main     <- the working trunk for this fork
                 ^
                 |  (3) PR
        feature branches
```

| Branch | Role | Rule |
| --- | --- | --- |
| `upstream/main` | Clovy's trunk | Read-only. Never pushed to. |
| `main` | Upstream mirror | **No Bonzai code.** Only upstream commits plus pre-existing fork docs. |
| `bonzai-main` | This fork's trunk | Every Bonzai change lands here. `main` merges **into** it, never the reverse. |
| `<topic>` branches | Work in progress | Branch from `bonzai-main`, PR back into `bonzai-main`. |

**Never merge `bonzai-main` into `main`.** That would put Bonzai code on the
mirror and destroy the whole point of the split: `main` must stay a clean
comparison point against upstream, so that a conflict during step (1) is
always upstream's doing and a conflict during step (2) is always ours.

At the time of writing, `main` is upstream plus one docs-only commit
(`4f352dd docs: propose whitelabel enablement plan (#1)`), and upstream has
nothing `main` lacks.

## Remotes

The `upstream` remote is not created by `git clone`. Add it once per checkout:

```sh
git remote add upstream https://github.com/open-software-network/os-clovy
git fetch upstream main
```

The repository is public, so no credentials are needed. GitHub's own "Sync
fork" button works only while the merge stays trivial; once `main` and
upstream diverge it hands you back to the CLI, and the conflict canary cannot
use it at all. Hence a real remote.

## Sync runbook

Run this whenever upstream cuts a release, or when the canary reports a
conflict.

```sh
# (1) Bring upstream into the mirror.
git fetch upstream main
git checkout main
git merge --ff-only upstream/main   # should fast-forward; if it refuses, see below
git push origin main

# (2) Integrate the mirror into the Bonzai trunk.
git checkout bonzai-main
git merge main                      # resolve conflicts here, never on main
```

If step (1) refuses to fast-forward, something landed on `main` that is not
upstream's. Move it to `bonzai-main` rather than merging it forward.

Resolve step (2) conflicts by these rules:

- **Never rewrite history on a shared branch.** No rebase, amend, or
  force-push on `main` or `bonzai-main`. A merge commit keeps everyone's
  checkout valid.
- **Regenerate lockfiles and generated files with the repo's tooling**, never
  by hand.
- If both sides changed the same logic and picking either loses behavior,
  stop and ask rather than guessing.

Then run the post-merge checklist below before pushing.

## Post-merge checklist

After every `main` -> `bonzai-main` merge:

- [ ] `pnpm check` and `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm test:rust` and `pnpm test:clovy-api`
- [ ] `make verify` (adds `cargo clippy --all-targets`, which the narrower
      targets skip - green from `cargo test` + `pnpm test` alone is **not**
      CI-green)
- [ ] **The egress guard** - `cargo test --manifest-path src-tauri/Cargo.toml
      --test bonzai_egress_guard`. The guarantee in
      [ADR-0059](docs/adr/0059-bonzai-egress-is-enforced-by-a-build-time-allowlist.md)
      (superseding ADR-0057) is exactly what an upstream merge can silently
      reopen, so this is the check that matters most here. A failure names the
      file and line of the new client; route it through
      `crate::bonzai::egress::guarded_builder()` or `guarded_client()` and
      decide what it is for. Never add an exemption
- [ ] The ledger below still matches reality; update it in the same commit if
      a prologue moved
- [ ] A red gate that is not your bug: check
      [TROUBLESHOOTING.md](TROUBLESHOOTING.md) before chasing it (Node 26
      storage tests, vitest teardown exit codes, ProseMirror flake, and
      pnpm's non-TTY purge prompt are documented false alarms)

## The fork ledger

Every line this fork changes in a file that also exists upstream. Additive
files - ones upstream does not have - are listed separately and carry no
merge risk.

**Budget: every shared-file edit is one of four shapes, under a ceiling of
150 counted lines** (ADR-0060, superseding ADR-0058's 40). The shape rule is
the invariant; the ceiling exists to make growth visible. A fifth shape, or
growth past the ceiling, requires a superseding ADR.

Two kinds of change carry very different merge risk, so they are counted
separately:

- **Edits inside an existing function or block** - real conflict risk, since
  upstream edits the same region. These count against the 40.
- **A new symbol appended to a shared file** - merges cleanly at a distinct
  location. Tracked in the table, not counted.

### Fork features outside the Bonzai ledger

Not every fork change is a Bonzai guard. **Bring-your-own transcription**
([ADR-0061](docs/adr/0061-local-byoi-transcription-reuses-provider-local.md))
is a feature written in upstream's own idiom, mirroring local generation and
depending on nothing in `bonzai/`; it is a candidate to upstream, and its
edits are tracked here rather than counted against the Bonzai ceiling:
`src-tauri/src/providers/mod.rs` (settings, sanitize guard, commands),
`src-tauri/src/clovy_api.rs` (local dispatch and request),
`src-tauri/src/domain/processing.rs` (cleanup skip, one condition),
`src-tauri/src/lib.rs` (three command registrations), `src/lib/tauri.ts`,
`src/components/settings/AppSettings.tsx` (both local endpoints now share
`LocalEndpointSettings.tsx`), and `src/lib/local-generation.ts` (option-id
and loopback helpers hoisted into `src/lib/local-endpoint.ts`). Expect
conflicts in these regions when upstream touches local generation; resolve
towards upstream's shape and re-apply the transcription twin.

### Shared files (merge risk)

Every edit below is one of the four shapes ADR-0060 permits: **P** a one- or
three-line prologue at the top of an existing function, **S** a one-token
substitution, **F** a one-token constant flip, **W** a JSX wrap behind a flag.
Counts are `git diff` added-or-changed lines against `origin/bonzai-main`,
with re-indented lines under a wrap counted (the pessimistic reading).

| File | Lines | Shape | What | Why here and not in `bonzai/` |
| --- | ---: | :-: | --- | --- |
| `src-tauri/src/clovy_api.rs` | 23 | S, P | Phase 1: 7 client-constructor substitutions. Phase 2: prologues in `generate_note_from_transcript` and `proxy_agent_chat_completions`. Phase 3: prologue in `transcribe_saved_audio`. Phase 5: `refuse_clovy_api` in `authed_send`, `send_multipart`, `list_models`, `fetch_browser_transport_policy`, `computer_use_rollout`; `refuse_dictation` in `dictate_transcribe`, `cleanup_text` | The functions upstream dispatches through are the only place a prologue can intercept |
| `src-tauri/src/os_accounts.rs` | 8 | S, P | Phase 1: 2 substitutions. Phase 5: prologues in `local_dev_enabled` (covers all 17 OS Accounts short-circuits) and `local_dev_account_status` | One prologue in the predicate every short-circuit consults |
| `src-tauri/src/agent_mcp.rs` | 7 | S, P | Phase 1: 5 substitutions. Phase 6: `mcp_policy::check` in `validate_custom` and `start_transport` | Save-time and connect-time are upstream's two funnels |
| `src-tauri/src/providers/mod.rs` | 6 | S, P | Phase 1: 3 substitutions. Phase 2: prologue in `list_venice_models` | The picker's command is upstream's; Bonzai serves its shape |
| `src-tauri/src/dictation.rs` | 5 | P | Phase 5: `refuse_dictation` in `spawn_helper` and `dictation_helper_command`; early return in `retry_helper_spawn` | The helper is spawned, retried, and driven from three functions |
| `src-tauri/src/lib.rs` | 3 | P | Phase 1: `bonzai::setup(app)` first in the setup hook (2). Phase 2: one command registration (1) | Startup order and the command list live only here |
| `src-tauri/src/p3a/mod.rs` | 3 | P | Phase 5: `record_question` returns early | The single recording entry point |
| `src-tauri/src/connectors/oauth.rs` | 2 | S | Phase 1 | - |
| `src-tauri/src/agent_runtime/api.rs` | 1 | P | Phase 5: `strip_disabled_tools` after the descriptor list | Where the advertised list is built |
| `src-tauri/src/agent_runtime/tools.rs` | 1 | P | Phase 5: `refuse_disabled_tool` at the top of `dispatch_tool` | The single dispatch |
| `src-tauri/src/agent_runtime/host.rs` | 1 | P | Phase 4: `tag_agent_request` stamps the session id | The only place the session id and the request body meet |
| `src-tauri/src/feature_flags.rs` | 1 | F | Phase 5: `VIDEO_GENERATION_ENABLED` off | Upstream's own kill switch |
| `src-tauri/src/connectors/notion.rs` | 1 | S | Phase 1 | - |
| `src-tauri/src/companion/mod.rs` | 1 | S | Phase 1 | - |
| `src-tauri/src/video_download_url.rs` | 1 | S | Phase 1 | - |
| `src/components/sidebar/Sidebar.tsx` | 29 | W | Phase 5: dictation nav button wrapped (13), palette entry wrapped (11), `HIDDEN_SETTINGS_TABS` gains `dictation` (3), import (1). Upstream keeps no flag for dictation, so a wrap is the only shape available | The nav, palette, and tab list are upstream's |
| `src/components/settings/AgentMcpServersSection.tsx` | 11 | W, P | Phase 6: stdio option hidden on a Bonzai build (1), draft moved off stdio (8), hook and import (2) | The transport select is upstream's form |
| `src/components/settings/AppSettings.tsx` | 5 | P, W | Phase 2: import and mount of the Bonzai section (2). Phase 5: hook, import, and the issue-report row gated (3) | The Models tab and the report row are upstream's |
| `src/components/settings/PrivacySettingsSection.tsx` | 4 | P | Phase 5: returns null on a Bonzai build | The telemetry section is upstream's |
| `src/components/folders/ProjectSettingsDialog.tsx` | 2 | P | Phase 4: import and mount of the project key field | Beside instructions, per the PRD |
| `src/components/folders/FoldersWorkspace.tsx` | 5 | P, S | Phase 4: import and mount of the key badge (2). Beta feedback: the create dialog's `onCreate` returns the folder (3, a reflowed one-token change) | The project card and the create dialog's mount are upstream's |
| `src/components/folders/CreateFolderDialog.tsx` | 7 | P | Beta feedback: `useBonzaiCreateKey` hook, reset, probe before create, attach after, field mounted, import | Creating a project is upstream's dialog; the key must be known before the project exists |
| `src/lib/agent-runtime-adapter.ts` | 5 | P | Beta feedback: `bonzaiNoticePart` returns a Bonzai refusal as its own notice (4), import (1) | Where a failed run becomes a chat part |
| `src/components/agent/chat-turns/RunNotices.tsx` | 4 | P, S | Beta feedback: `text` prop (3), shown for the `bonzai` kind (1) | The failure notice is upstream's component |
| `src/components/agent/chat-turns/AgentChatTurnRow.tsx` | 3 | P | Beta feedback: the `bonzai` kind routed to the notice with its text | Upstream's part dispatch |
| `agent-runtime/src/sanitize.ts` | 3 | P | Beta feedback: `bonzaiFailure` prologue in `runtimeFailureDetails` keeps a Bonzai `AppError` code out of the "runtime" fallback | The one classifier every failed run passes through |
| `src/lib/agent-chat-runtime.ts` | 1 | S | Beta feedback: `bonzai` added to the notice kind union | The part type is upstream's |
| `src/components/folders/EditFolderDialog.tsx` | 2 | P | Beta feedback: import and mount of the project key field, as in the settings dialog | The edit dialog is upstream's |
| `src-tauri/Cargo.toml` | 1 | P | Beta feedback: `tracing-subscriber`, for the stderr subscriber `bonzai/logging.rs` installs (upstream emits `tracing` events and never subscribes to them) | The dependency list is upstream's |
| `src/lib/feature-flags.ts` | 2 | F | Phase 5: `IMAGE_GENERATION_ENABLED`, `VIDEO_GENERATION_ENABLED` off | Upstream's own kill switches |
| `src/test/app-notes-reliability.test.tsx` | 6 | P | Phase 5: `feature-flags` mocked with dictation on, following the slash-command test's convention | Upstream tests click the dictation entry this fork hides |
| `src/test/folders-workspace.test.tsx` | 6 | P | As above | As above |
| `agent-runtime/test/sanitize.test.ts` | 16 | P | Beta feedback: one appended test for the Bonzai classifier | Beside the classifier's own tests |

**Running total: 148 counted lines in source (plus 28 in tests) against
ADR-0060's ceiling of 150.** By phase: 1 - 24, 2 - 12, 3 - 3, 4 - 5,
5 - 62, 6 - 13, beta feedback - 29 (key at project creation 10, key in the
edit dialog 2, Bonzai refusals shown with their reason 16, log output 1).
Two lines of headroom remain; the next
shared-line change needs a matching reduction or an ADR-0060 addendum. The
28 test lines sit outside the count because a mock at
the top of a test file carries no merge risk to the code under test; they are
listed so the surface is whole.

ADR-0058's original budget of 40 was exceeded in Phase 4 and its estimate of
37 by more than three times; ADR-0060 records why (a wrong inventory, the
breadth of severance, and the cost of JSX wraps) and replaces the number with
a shape rule and a ceiling. Reducing the guard's scope or leaving a disabled
capability visible to buy lines back was not an option on the table.

### Appended blocks (tracked, not counted)

| File | What |
| --- | --- |
| `src-tauri/src/clovy_api.rs` | `bonzai_seam`: thin wrappers over the note prompt, parsers, audio helpers, and the response wrapper, so the Bonzai path cannot drift from the local-provider path |
| `src-tauri/src/lib.rs` | `pub mod bonzai;` |
| `src-tauri/src/feature_flags.rs` | `DICTATION_ENABLED` |
| `src/lib/feature-flags.ts` | `DICTATION_ENABLED` |
| `.env.example` | `BONZAI_BASE_URL`, `BONZAI_DEFAULT_MODEL` |

### Additive files (no merge risk)

| Path | What |
| --- | --- |
| `UPSTREAM.md` | This file |
| `.github/workflows/upstream-conflict-canary.yml` | The conflict canary |
| `docs/bonzai-model-routing-prd.md` | The PRD |
| `docs/bonzai-implementation-plan.md` | The implementation plan |
| `docs/adr/0057-bonzai-is-the-only-inference-egress.md` | ADR (superseded by 0059) |
| `docs/adr/0058-bonzai-routing-lives-in-an-additive-provider-layer.md` | ADR (budget clause superseded by 0060) |
| `docs/adr/0059-bonzai-egress-is-enforced-by-a-build-time-allowlist.md` | ADR |
| `docs/adr/0060-the-bonzai-touched-line-budget-is-a-shape-rule-with-an-inventoried-ceiling.md` | ADR |
| `src-tauri/src/bonzai/mod.rs` | Module root, activation, startup validation, the session tag |
| `src-tauri/src/bonzai/egress.rs` | The compiled allowlists (inference and MCP), `assert_allowed`, `assert_mcp_allowed`, and the only permitted client constructors |
| `src-tauri/src/bonzai/config.rs` | Base URL and default model resolution, checked against the allowlist |
| `src-tauri/src/bonzai/http.rs` | The one request helper: allowlist, key, error mapping |
| `src-tauri/src/bonzai/keys.rs` | Keychain-backed keys, global and per-project, with the project index |
| `src-tauri/src/bonzai/resolve.rs` | Which key and which model for a piece of work |
| `src-tauri/src/bonzai/models.rs` | `/v1/models` per key, served into upstream's picker |
| `src-tauri/src/bonzai/chat.rs` | Note generation and the streaming agent proxy |
| `src-tauri/src/bonzai/audio.rs` | Note transcription |
| `src-tauri/src/bonzai/severance.rs` | The no-account mode, disabled tools, Clovy API and dictation refusals |
| `src-tauri/src/bonzai/mcp_policy.rs` | Streamable HTTP on allowlisted hosts only |
| `src-tauri/src/bonzai/commands.rs` | The one dispatching Tauri command |
| `src-tauri/tests/bonzai_egress_guard.rs` | The source-level CI guard |
| `src/lib/bonzai.ts` | Typed wrapper over the command, activation and index hooks |
| `src/components/settings/BonzaiSettingsSection.tsx` | The global key, in Settings > Models |
| `src/components/folders/BonzaiProjectKeyField.tsx` | A project's key, in project settings |
| `src/components/folders/BonzaiKeyBadge.tsx` | Own or global key, on the project card |
| `src/test/bonzai.test.ts` | Binding tests |

`docs/index.md` is shared and gains one row per document. Index rows are
append-only single lines and conflict trivially, so they are exempt from the
budget; note them here rather than counting them.

## The conflict canary

[`.github/workflows/upstream-conflict-canary.yml`](.github/workflows/upstream-conflict-canary.yml)
runs on a schedule and on demand. It tests both merges of the topology in
throwaway worktrees and pushes nothing:

1. `upstream/main` -> `main`
2. `main` (with upstream merged in) -> `bonzai-main`

A red canary means the next sync needs hands. It reports **which** step
conflicted, which tells you immediately whether the problem is upstream's
change or our layer.

A canary nobody reads is worse than no canary, because it manufactures false
confidence. If it goes red and stays red, either fix it or turn it off.
