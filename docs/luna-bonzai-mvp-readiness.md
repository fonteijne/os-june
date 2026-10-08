# Bonzai MVP readiness

**Status:** Not release-ready  
**Assessment date:** 2026-09-26  
**Scope:** Bonzai fork branch history, MVP capability gaps, and recommended
integration and release route

## Executive verdict

`bonzai-main` is the correct release trunk. It is the remote default branch at
`b2190ba4` and contains the complete Bonzai implementation through the latest
roadmap and local transcription work. `fable/bonzai-all-phases` is a divergent
decision branch at `7004e670`, two commits ahead and seven commits behind
`bonzai-main`.

The desktop implementation is substantially complete for the original direct
architecture: desktop -> Bonzai, no OS Accounts, per-project Bonzai keys,
closed desktop inference egress, disabled non-MVP tools, and paced note
transcription. The implementation plan records phases 0 to 6 and beta
feedback as done, while dictation is deliberately deferred.

The repository is **not ready for an initial release**, however. The accepted
ADR-0061 from the Fable branch mandates a different architecture:

```text
desktop client -> Clovy API in a TEE -> Bonzai
```

That decision has not been implemented. The current desktop allowlist still
permits direct Bonzai traffic, while `clovy-api` still contains direct
Venice/OpenAI/BYOK paths and unguarded HTTP clients. Before release, the team
must either implement ADR-0061 or accept a superseding ADR that explicitly
keeps the direct desktop -> Bonzai beta architecture and revises its privacy
and release claims. Shipping the current code while leaving the accepted ADR
unresolved would make the decision record and binary disagree.

There are also release configuration and live-evidence gaps. The release
workflows still expect OS Accounts and legacy Clovy API settings, do not pass
Bonzai build configuration, and do not provide a Bonzai-specific deployment
contract.

## Evaluated refs and branch history

| Ref | Commit | Role | Relationship |
| --- | --- | --- | --- |
| `bonzai-main` | `b2190ba4` (2026-09-25) | Canonical Bonzai release trunk | `origin/HEAD` points here |
| `fable/bonzai-all-phases` | `7004e670` (2026-09-14) | Divergent feature and decision branch | Common ancestor `ece2d85c` |
| `main` | `4f352dd0` (2026-08-03) | Clean upstream mirror | 13 commits behind `origin/main` |
| `docs/local-transcription-speaches-plan` | `987d6cf4` | Feature/docs branch | Merged into `bonzai-main` by PR #5 |
| `docs/local-transcription-parakeet-sidecar-plan` | `ab989c80` | Alternative local ASR proposal | Not merged into either release branch |
| `claude/whitelabel-implementation-nqe5ds` | `fc44ea27` | Branding implementation branch | Not merged into `bonzai-main` |

Both Bonzai branches share `ece2d85c`, the rate-limit pacing change, and then
diverge:

- Fable-only commits: `bd394a5d` and merge `7004e670`.
- Bonzai-main-only commits: `ed24db42`, `933dfdbb`, `f33fcc01`, `8d011f24`,
  `82acd204`, `987d6cf4`, and merge `b2190ba4`.
- `git rev-list --left-right --count bonzai-main...fable/bonzai-all-phases`
  reports `7 2`.

The branch named in the request as a possible `docs/searches` branch does not
exist in the current refs. The likely branch is
`docs/local-transcription-speaches-plan`, which is already merged into
`bonzai-main`. Hosted search itself is not restored: the external Bonzai MCP
allowlist remains empty, while exact loopback HTTP MCP is permitted for local
Docker servers by the dedicated policy exception.

The checkout has only an `origin` remote. `UPSTREAM.md` requires an
`open-software-network/os-clovy` `upstream` remote for the documented sync and
conflict canary workflow, so that maintenance setup is incomplete locally.

## What each branch contains

### Canonical `bonzai-main`

The implementation plan reports these phases as done:

| Phase | State | Important evidence or caveat |
| --- | --- | --- |
| 0. Fork hygiene | Done | `UPSTREAM.md` and conflict canary exist; current remote setup is missing `upstream` |
| 1. Egress guard | Done | Desktop source guard and compiled allowlist cover the inventoried client sites |
| 2. Bonzai provider and chat | Done | Chat, note generation, model catalog, keychain handling; live E2E still owed |
| 3. Note transcription | Done for routing | Pacing and retries landed; real-audio quality gate still owed |
| 4. Per-project keys | Done for code paths | Project-then-global resolution exists; live billing reconciliation still owed |
| 5. Severance | Done for code paths | No-account mode and disabled tools exist; packet-capture proof still owed |
| 6. MCP policy | Done for policy | Streamable HTTP only; external MCP host list is empty; exact loopback HTTP is permitted |
| Beta feedback round 1 | Done | Project-create key probe, refusal notices, and runtime logging landed |
| Post-beta dictation | Deferred | Requires ASR backend and latency benchmark |

Since the original phase branch, `bonzai-main` also gained:

- `src-tauri/src/bonzai/compat.rs`, which makes agent requests portable across
  LiteLLM model backends by removing unsupported strict tool metadata and
  retrying eligible tuning-parameter refusals.
- BYO local transcription using the existing `PROVIDER_LOCAL` contract,
  documented by `docs/adr/0061-local-byoi-transcription-reuses-provider-local.md`.
- A full roadmap portfolio, including local tasks, project-aware sessions,
  mail context, parallel installation, visual styling, logo intake, operator
  instructions, and post-MVP Entra access.
- Additional release and coworker-DMG documentation and skills.

The Bonzai shared-file ledger is already at 148 of the 150 counted-line
ceiling defined by ADR-0060. Any new shared-file implementation needs a budget
decision or an explicit reduction elsewhere.

### Divergent `fable/bonzai-all-phases`

Fable contains the same implementation baseline but adds two architectural
decisions that are absent from `bonzai-main`:

- `docs/adr/0061-clovy-api-returns-as-bonzais-tee-hosted-single-hop.md` accepts
  Clovy API as the mandatory TEE-hosted hop and requires a second Bonzai-only
  egress boundary.
- `docs/adr/0062-clovy-apis-non-inference-surfaces-stay-disabled-pending-their-dependencies.md`
  keeps issue reporting, private sharing, and OS Accounts JWKS authentication
  disabled until their actual dependencies exist.

Those ADRs are documentation-only on Fable. There is no corresponding
Clovy-API Bonzai proxy, Clovy-API allowlist, or Venice removal in that branch.

### ADR collision to resolve

`bonzai-main` already uses ADR-0061 for BYO transcription. Fable independently
uses ADR-0061 for the TEE hop and ADR-0062 for disabled non-inference surfaces.
Do not copy both files under their current names. When carrying the decisions
onto `bonzai-main`, retain its existing ADR-0061 and renumber the Fable TEE-hop
and non-inference decisions to the next available ADR numbers, likely 0063 and
0064 after checking the tree. Update `docs/index.md` and cross-references in
the same change.

## MVP contract: implemented versus verified

### Substantially implemented

- Bonzai chat, note generation, and saved-audio note transcription paths.
- Desktop compiled host allowlist, HTTPS checks, guarded request constructors,
  and a source-level egress test.
- Global and project-scoped Bonzai keys stored in the OS keychain, with
  project-then-global resolution and no plaintext key round-trip to the UI.
- Bonzai error mapping for invalid keys, model restrictions, rate limits,
  unreachable service, and blocked egress.
- No-account mode with no OS Accounts authorize or charge path.
- Disabled image, video, web, browser, computer, and dictation surfaces that
  are hidden and fail closed when reached.
- Saved-audio-first dual-source recording, turn detection, echo handling,
  background processing, recovery, and manual-note preservation.
- Note transcription pacing with a two-request concurrency cap, shared
  cooldown, `Retry-After` handling, and bounded retries.
- MCP policy that rejects stdio and checks streamable HTTP hosts at save and
  connect time.
- Agent request compatibility for LiteLLM models and actionable Bonzai refusal
  notices.

### Evidence still missing

The implementation plan explicitly records these release-relevant gaps:

1. A live note-generation and agent-chat run against Bonzai with a real key.
2. Real meeting-audio transcription quality comparison against the prior path,
   including the selected Bonzai whisper backend and its rate limits.
3. A two-project LiteLLM reconciliation proving that project keys attribute
   spend correctly and that global fallback is deliberate.
4. Packet-capture or equivalent session evidence proving the selected
   architecture's expected destinations and zero forbidden OS Accounts or
   Clovy API traffic.
5. A full `make verify` run on the canonical release branch. The plan still
   leaves this unchecked, and the post-merge checklist requires it.
6. Verification of revoked-key, no-key, model-not-permitted, rate-limit, and
   unreachable-service behavior against a live Bonzai endpoint.

### Likely MVP defect: model picker scope

The PRD requires `/v1/models` to be queried with the active project's Bonzai
key. On `bonzai-main`, `src-tauri/src/bonzai/models.rs:64-92` calls
`resolve::key_for(None)`, and the picker request carries no project id. A
project with a restricted key can therefore receive the global key's model
list. Operation requests do use project context, but the picker does not.

Before release, either thread the active project id through the picker contract
and test two different model restrictions, or explicitly reduce the MVP
contract to a global model list and document the consequence.

## Release blockers and decisions

| Priority | Area | Current problem | Exit criterion |
| --- | --- | --- | --- |
| P0 | ADR-0061 architecture | Accepted TEE-hop decision conflicts with direct desktop implementation | Implement ADR-0061, or accept a superseding ADR and update all claims and docs |
| P0 if ADR-0061 is retained | Clovy API egress | Direct Venice/OpenAI/BYOK paths and raw HTTP clients remain | Bonzai-only compiled allowlist, guarded client factory, source guard, and no direct upstream paths |
| P0 | Release automation | Workflows require OS Accounts and legacy Clovy API settings; no Bonzai build/deploy contract | Architecture-specific staging, production, health, secret, promotion, and rollback wiring |
| P0 | Functional evidence | Live chat, audio quality, key attribution, and egress measurements are not recorded | Complete the evidence ledger against a real endpoint and real project keys |
| P1 | Model isolation | Picker is global-key scoped despite per-project model restrictions | Add project context or document and test the reduced behavior |
| P1 | Release contract | `docs/bonzai-model-routing-prd.md` remains `Status: draft` | Accept an MVP contract that reflects the final architecture and capabilities |
| P1 | Integration hygiene | `upstream` remote is absent and old canary evidence references stale heads | Configure the remote, refresh the canary, and run the full post-merge checklist |

### ADR-0061 implementation scope

If the accepted TEE-hop decision is retained, the minimum implementation is
larger than a desktop patch:

1. Repoint the desktop compiled allowlist and Bonzai HTTP calls to the Clovy API
   host.
2. Add a Clovy API allowlist restricted to
   `api-v2.bonzai.iodigital.com`, with runtime URL checks and a source-level
   guard for all raw `reqwest` client construction.
3. Replace or remove the provider composition that can call Venice/OpenAI.
4. Remove `byok_base_url`, the Venice public-base-url bypass, and all direct
   Venice/OpenAI inference routes.
5. Define authentication and network placement for the TEE hop while keeping
   OS Accounts absent, as required by ADR-0062.
6. Update Clovy API image build, deployment, health, watchdog, promotion,
   rollback, and reproducibility evidence.
7. Add integration tests proving that non-Bonzai destinations fail closed.

If the direct architecture is selected instead, the superseding ADR must state
why the TEE guarantee is no longer required, revise the PRD and release copy,
and keep the desktop Bonzai allowlist and no-account claims internally
consistent. It must not be inferred from incomplete implementation.

### Release configuration gap

The following workflows and runbooks still describe the upstream architecture:

- `.github/workflows/rc-desktop-dmg.yml`
- `.github/workflows/promote-desktop.yml`
- `.github/workflows/production-desktop-windows.yml`
- `.github/workflows/staging-desktop-dmg.yml`
- `docs/release-macos.md`
- `docs/release-windows.md`
- `.github/workflows/build-clovy-api.yml`
- `.github/workflows/deploy-clovy-link.yml`

They mention `PRODUCTION_OS_ACCOUNTS_*`, `PRODUCTION_CLOVY_API_URL`, legacy
service/image assumptions, and do not provide a Bonzai-specific
`BONZAI_BASE_URL` and `BONZAI_DEFAULT_MODEL` contract. Do not solve this with
dummy OS Accounts secrets. Decide the architecture and then make the release
pipeline describe and build that architecture.

The Clovy API reproducible-build document also says Phase B proof and the
strong digest-pinned deployment anchor remain open. If Clovy API becomes the
mandatory TEE hop, this is a release gate rather than optional infrastructure
documentation.

## Deferred scope that should not block the Bonzai MVP

The following are intentionally deferred or disabled, provided the release
contract describes them honestly:

- Dictation and dictation cleanup, pending a selected whisper backend and p50
  and p95 latency evidence.
- Hosted web search and fetch while the external MCP allowlist is empty. Local
  loopback MCP remains available for user-run Docker servers, but that does not
  restore hosted search.
- Image generation, image editing, video generation, browser use, and computer
  use.
- Issue reporting, private sharing, and OS Accounts JWKS authentication under
  the Fable ADR-0062 decision, once that decision is ported and renumbered.
- Automatic key lifecycle management, per-operation keys, and spend readback.
- Microsoft Entra access gate, which the roadmap explicitly marks post-MVP.
- Local task management, project-aware new sessions, Outlook mail context,
  iO operator instructions, and parallel-install development build.
- Visual styling and logo replacement. Logo intake is blocked until an approved
  vector/source package, usage rights, and provenance arrive.
- The bundled Parakeet sidecar proposal. It is an alternative to the already
  merged BYO transcription implementation, not an MVP prerequisite.

Brand presentation requires a separate decision. The open whitelabel branch
has useful implementation work, but the roadmap still treats styling as
Proposed and logo replacement as blocked. The lowest-risk first release keeps
the existing Clovy/June compatibility identity and does not invent a new
bundle id, updater identity, signing identity, or release repository without an
approved product decision.

## Recommended route from here

1. **Use `bonzai-main@b2190ba4` as the integration base.** It is the canonical
   remote default branch and contains the newer LiteLLM portability, BYO
   transcription, and roadmap work. Do not merge the stale Fable tip wholesale
   or merge Bonzai code into clean `main`.
2. **Create an integration topic from `bonzai-main`.** Carry Fable's two
   decisions as deliberate documentation changes, renumbering the ADRs and
   updating `CONTEXT.md` and `docs/index.md`. Preserve `f33fcc01`, the Speaches
   implementation, PR #5, and the canonical roadmap files.
3. **Resolve the architecture decision before release implementation.** The
   preferred route is to implement accepted ADR-0061, because it restores the
   stated TEE property without weakening the Bonzai-only rule. If that is too
   large for the first cut, write and accept the superseding direct-architecture
   ADR first, then update the PRD, phase board, privacy claims, and release
   runbooks before shipping a direct beta.
4. **Configure the documented fork topology.** Add the missing `upstream`
   remote in the integration environment, refresh `upstream/main`, and keep
   `main` as the clean mirror. Run the conflict canary against current heads.
5. **Close the release contract.** Promote the PRD from draft, record the
   selected ASR backend and rate limit, decide whether project-scoped model
   lists are required for MVP, and decide whether the first release presents
   as Clovy/June or Bonzai.
6. **Wire release automation to the selected architecture.** Add the correct
   Bonzai host/model build settings, service deployment and health checks, TEE
   provenance, secrets, promotion, rollback, and macOS/Windows runbook steps.
7. **Run release evidence, not only unit tests.** Complete live chat and note
   generation, real-audio quality, two-project billing, negative key paths,
   packet-capture egress proof, project model-picker behavior, and the full
   `make verify` and egress-guard checklist.
8. **Cut an RC only after all P0 gates pass.** Keep deferred features hidden and
   fail-closed, and do not claim search, dictation, sharing, identity, or
   branding work that is not in the selected build.

## Release checklist

### Architecture and security

- [ ] ADR-0061 is implemented, or a superseding ADR is accepted and reflected
      in the PRD and release documentation.
- [ ] Desktop and Clovy API allowlists match the selected topology.
- [ ] Clovy API raw HTTP construction is guarded if the TEE hop is retained.
- [ ] Direct Venice, OpenAI, and BYOK inference paths are removed or proven
      unreachable when the TEE hop is retained.
- [ ] Packet capture proves only expected destinations and no forbidden OS
      Accounts or provider traffic.
- [ ] The empty external MCP allowlist, loopback MCP exception, and disabled hosted search behavior are documented.

### Functional behavior

- [ ] Live agent chat and note generation succeed with a real Bonzai key.
- [ ] Real meeting-audio transcription meets the selected quality bar.
- [ ] Two project keys reconcile to two LiteLLM spend buckets.
- [ ] Global-key fallback and no-key refusal are tested.
- [ ] Revoked key, model restriction, rate-limit, and unreachable-service
      failures are actionable and fail closed.
- [ ] Model picker behavior is project-scoped, or the reduced global contract
      is explicitly accepted and tested.

### Operations and release

- [ ] `BONZAI_BASE_URL` and `BONZAI_DEFAULT_MODEL` are wired into the selected
      release build contract.
- [ ] TEE deployment, health, watchdog, promotion, rollback, and provenance
      are documented if Clovy API is the hop.
- [ ] macOS and Windows release runbooks no longer require irrelevant dummy
      OS Accounts configuration.
- [ ] `upstream` remote and current conflict-canary evidence are present.
- [ ] The ADR-0060 ledger is reconciled before any shared-file implementation.
- [ ] `pnpm check`, `pnpm typecheck`, `pnpm test`, `pnpm test:rust`,
      `pnpm test:clovy-api`, the Bonzai egress test, and `make verify` pass.
- [ ] RC install, updater, recording, processing recovery, and disabled-surface
      behavior are manually validated on the supported desktop targets.

## Evidence index

- Branch graph and history: `git log --all --graph`, branch tips, and
  `git rev-list --left-right --count bonzai-main...fable/bonzai-all-phases`.
- Product contract: `docs/bonzai-model-routing-prd.md`.
- Phase board and owed evidence: `docs/bonzai-implementation-plan.md`.
- Accepted TEE-hop decision on Fable:
  `docs/adr/0061-clovy-api-returns-as-bonzais-tee-hosted-single-hop.md`.
- Disabled Clovy API surfaces on Fable:
  `docs/adr/0062-clovy-apis-non-inference-surfaces-stay-disabled-pending-their-dependencies.md`.
- Canonical BYO transcription decision:
  `docs/adr/0061-local-byoi-transcription-reuses-provider-local.md`.
- Desktop egress implementation:
  `src-tauri/src/bonzai/egress.rs` and
  `src-tauri/tests/bonzai_egress_guard.rs`.
- Desktop direct Bonzai requests: `src-tauri/src/bonzai/chat.rs`,
  `src-tauri/src/bonzai/audio.rs`, and `src-tauri/src/bonzai/http.rs`.
- Clovy API paths requiring change for ADR-0061:
  `clovy-api/crates/providers/src/http.rs`, `venice.rs`, `openai.rs`,
  `clovy-api/crates/api/src/state.rs`, and
  `clovy-api/crates/app/src/main.rs`.
- Release assumptions: `.github/workflows/rc-desktop-dmg.yml`,
  `.github/workflows/promote-desktop.yml`,
  `.github/workflows/production-desktop-windows.yml`,
  `docs/release-macos.md`, and `docs/release-windows.md`.
- Branch integration and shared-file budget: `UPSTREAM.md` and ADR-0060.
- Future roadmap status: `docs/roadmap/README.md` on `bonzai-main`.
