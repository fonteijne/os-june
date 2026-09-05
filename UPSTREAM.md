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

**Budget: under 40 touched lines in shared files** (ADR-0058). The budget
exists to make growth visible. A change that needs more is a signal to move
logic into `src-tauri/src/bonzai/`, not to raise the number. Raising it
requires a superseding ADR.

Two kinds of change carry very different merge risk, so they are counted
separately:

- **Edits inside an existing function or block** - real conflict risk, since
  upstream edits the same region. These count against the 40.
- **A new symbol appended to a shared file** - merges cleanly at a distinct
  location. Tracked in the table, not counted.

### Shared files (merge risk)

| File | Lines | What | Why here and not in `bonzai/` |
| --- | ---: | --- | --- |
| `src-tauri/src/clovy_api.rs` | 7 | `reqwest::Client::{builder,new}()` -> `bonzai::egress::guarded_{builder,client}()` at `http_client`, `agent_http_client`, `local_http_client`, and a test probe | A client has to be constructed where it is used; only the constructor moves |
| `src-tauri/src/agent_mcp.rs` | 5 | Same substitution at the five MCP client sites | As above |
| `src-tauri/src/providers/mod.rs` | 3 | Same substitution at the local-endpoint probe and the Venice key verifier | As above |
| `src-tauri/src/os_accounts.rs` | 2 | Same substitution at `http_client` | As above |
| `src-tauri/src/connectors/oauth.rs` | 2 | Same substitution at `http_client` | As above |
| `src-tauri/src/connectors/notion.rs` | 1 | Same substitution at the hosted-MCP client | As above |
| `src-tauri/src/companion/mod.rs` | 1 | Same substitution at `companion_http_client` | As above |
| `src-tauri/src/video_download_url.rs` | 1 | Same substitution at `video_download_client_builder` | As above |
| `src-tauri/src/lib.rs` | 2 | `bonzai::setup()` first in the Tauri setup hook, so a build pointed at a host it may not reach refuses to start | The setup hook is the only place startup order is decided |

**Running total: 24 / 40.** `pub mod bonzai;` in `lib.rs` is an appended
symbol at a distinct location, so it is tracked here and not counted.

Every one of the 22 substitution lines is a single-token change:
`reqwest::Client::builder()` becomes
`crate::bonzai::egress::guarded_builder()`, and `reqwest::Client::new()`
becomes `crate::bonzai::egress::guarded_client()`. No function is
restructured and no conditional is threaded through a body, so an upstream
edit anywhere else in these functions still merges cleanly.

**The budget is projected to be exceeded.** ADR-0059 estimated eight client
sites and the plan budgeted Phase 1 at ~13 lines on that basis; the real
inventory is sixteen sites and 22 lines (see the 2026-09-05 addendum to
ADR-0059), which puts the beta total at roughly **48 / 40**. Per ADR-0058 the
budget is to be revised in a superseding ADR rather than quietly exceeded,
and that decision is due before Phase 5. Reducing the guard's scope to buy
the lines back is not an option: a guard that reads only the files we already
know about cannot see the client an upstream merge adds, which is the whole
reason it exists.

### Additive files (no merge risk)

| Path | What |
| --- | --- |
| `UPSTREAM.md` | This file |
| `.github/workflows/upstream-conflict-canary.yml` | The conflict canary |
| `docs/bonzai-model-routing-prd.md` | The PRD |
| `docs/bonzai-implementation-plan.md` | The implementation plan |
| `docs/adr/0057-bonzai-is-the-only-inference-egress.md` | ADR |
| `docs/adr/0058-bonzai-routing-lives-in-an-additive-provider-layer.md` | ADR |
| `docs/adr/0059-bonzai-egress-is-enforced-by-a-build-time-allowlist.md` | ADR |
| `src-tauri/src/bonzai/mod.rs` | Module root and the startup validation |
| `src-tauri/src/bonzai/egress.rs` | The compiled allowlist, `assert_allowed`, and the only permitted client constructors |
| `src-tauri/src/bonzai/config.rs` | Base URL resolution, checked against the allowlist |
| `src-tauri/tests/bonzai_egress_guard.rs` | The source-level CI guard |

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
