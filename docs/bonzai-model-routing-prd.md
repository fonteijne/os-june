# PRD: Bonzai model routing

Status: draft
Date: 2026-09-03
Owner: fonteijne/os-june fork

## 1. Summary

This fork routes **all** AI inference through **Bonzai**, our own LiteLLM
deployment, and nothing else. No upstream provider is called, no Clovy API
inference endpoint is used, and no OS Accounts credit is ever spent.

Token spend is attributed per client by giving each **project** its own
**Bonzai key** (a LiteLLM virtual key). The user manages keys manually in
LiteLLM (create, rotate, revoke, budget); Clovy only stores the key and
presents which project it belongs to.

The change is shaped so that upstream Clovy releases keep merging cleanly.
That constraint is a first-class requirement, not a preference, and it
follows the doctrine already set by the
[whitelabel branding ADR](adr/0054-whitelabel-branding-as-additive-config-layer.md)
(renumbering to 0056 on merge): brand- and fork-specific behavior lives in
additive files, and any edit to a shared file is the narrowest possible
substitution.

This PRD closes an open question named in
[whitelabel-implementation-plan.md](whitelabel-implementation-plan.md): who
is accountable for a fork's upstream provider costs. The answer is Bonzai —
the fork runs its own gateway and pays its own bill.

## 2. Why now

Three things make this the moment:

- **Bonzai exists.** A managed LiteLLM deployment is live, so there is a real
  endpoint to route to rather than a hypothesis.
- **The fork is at zero divergence in the inference layer.** Upstream `main`
  is `8fed7ac` and this fork is 2 commits ahead, 0 behind. The seam design
  can be validated against a real upstream merge immediately, which is the
  only way to know it worked.
- **The client-attribution requirement is concrete.** Work is done for named
  clients (see the Projects surface: a project per client). Without per-key
  attribution, spend is a single undifferentiated bill.

## 3. Who it's for

- **The fork operator** (us) — needs every token of spend attributable to the
  client it was incurred for, and needs to keep pulling upstream Clovy
  improvements without a merge fight each release.
- **The end user of this build** — an operator working across several client
  projects who should never think about keys during normal use, and should
  never silently spend the wrong client's budget.

Not for: upstream Clovy users. Nothing here is proposed for `os-clovy`.

## 4. Goals

1. **Inference egress is closed.** Every model call that ships in beta —
   agent chat, note transcription, note generation — reaches Bonzai and no
   other host. Enforced structurally, not by convention. Dictation is out of
   beta scope (see non-goals) but is covered by the same boundary when it
   returns.
2. **Per-project attribution.** Each project carries a Bonzai key; work done
   in that project is billed to that key inside LiteLLM.
3. **Clovy credits are never spent.** No OS Accounts authorize/charge call
   ever runs.
4. **No third-party identity dependency.** The app runs without contacting
   OS Accounts at all.
5. **Upstream stays mergeable.** The touched-line count in files upstream
   also edits stays small, shallow, and inventoried.

## 5. Non-goals

Explicitly out of scope, and switched off rather than rerouted:

- **Web search and web fetch.** Not an LLM primitive; LiteLLM has no
  equivalent. Restored, if wanted, only via an approved MCP server.
- **Image generation and image editing.** LiteLLM supports
  `/v1/images/generations` and `/v1/images/edits`, but the Venice contract
  differs and the product value in a meeting-notes tool is marginal.
- **Video generation.** LiteLLM's `/videos` support is thin, and the Venice
  path is an async job queue with per-request live quoting.
- **Computer use and browser use.** Clovy-side orchestration with no gateway
  equivalent.
- **Dictation, for the beta.** Postponed to a post-beta phase and shipped
  **disabled**. Dictation is latency-critical — a short phrase round-trips in
  a few hundred milliseconds — and that budget depends entirely on which
  whisper backend Bonzai routes to, which is not yet decided. Shipping it on
  an unvalidated backend would make the fork feel broken in its most
  latency-sensitive surface. Disabled means the kill switch is off, not that
  the code is removed: the surface is large (25 Rust files, 53 frontend
  files), so deletion would blow the touched-line budget for no benefit.
  Note transcription is unaffected — it tolerates seconds, not milliseconds.
- **Automatic key management.** No key creation, rotation, or budget
  administration from inside Clovy. LiteLLM's own UI owns that lifecycle.
- **Per-operation keys.** A separate key for transcription versus chat is a
  later increment; v1 is one key per project across all operations.
- **Upstream contribution.** None of this is proposed to `os-clovy`.

## 6. Current state — the seams that already exist

Most of the mechanism is already present upstream. This matters because it
determines how small the change can be.

**A custom OpenAI-compatible endpoint already ships.** The "local generation"
provider is `LocalGenerationSettings { base_url, model_id, api_key }`
(`src-tauri/src/providers/mod.rs:118`), with a bearer token attached on the
way out. Its own doc comment names the target:

> Attaches `Authorization: Bearer {api_key}` when the user configured an api
> key for their local endpoint (Ollama needs none; vLLM / **LiteLLM** / a
> hosted gateway may). — `src-tauri/src/clovy_api.rs:1175`

**Upstream already publishes the dispatch shape to extend.** At
`src-tauri/src/clovy_api.rs:410`:

```rust
if crate::providers::generation_provider() == PROVIDER_LOCAL {
    return generate_note_from_transcript_local(request).await;
}
```

A three-line prologue that delegates out. Conforming to this shape is the
most merge-stable option available, because it is a pattern upstream
maintains rather than one we impose.

**There is precedent for keyed overrides.** `profile_overrides:
BTreeMap<String, ProfileModelOverrides>` (`providers/mod.rs:113`) already
layers per-key model settings over the global ones.

**An endpoint probe already exists** (`ProbeLocalGenerationEndpointRequest`)
for validating a URL and key at paste time.

**A no-account mode already exists.** `OS_CLOVY_LOCAL_DEV=1` →
`local_dev_enabled()` (`os_accounts.rs:466`) returns a fully synthetic
account (`os_accounts.rs:502`): signed in, user `usr_local_dev` / "Local
developer", subscription active, usage remaining 100%. Zero OS Accounts
network calls.

**Two gaps:**

- **Transcription and dictation have no escape hatch.**
  `transcribe_saved_audio` (`clovy_api.rs:360`) and `dictate_transcribe`
  (`clovy_api.rs:442`) post unconditionally to Clovy API. Unlike note
  generation, there is no provider branch to extend — one must be added.
- **Provider settings are device-global.** `local_generation_settings()` is a
  zero-argument read. No project id is in scope at the call sites that need
  it.

## 7. What we're building

### 7.1 Bonzai as a provider

Add `PROVIDER_BONZAI` alongside `PROVIDER_LOCAL`, with all real logic in a
new `src-tauri/src/bonzai/` module. New files never conflict on merge.

Bonzai is deliberately **not** modelled as the existing local provider, for
two reasons:

- Bonzai is a remote managed server. `model-privacy.ts` attaches real privacy
  meaning to provider identity (E2EE / private / anonymous badges) and
  `local-generation.ts` reasons about loopback addresses. Presenting a remote
  gateway as "local" would put false privacy copy in front of the user.
- Riding `PROVIDER_LOCAL` inherits every future upstream change to a feature
  we do not control.

### 7.2 Endpoint and keys

- **One fixed, global endpoint.** The Bonzai base URL is configured once, for
  the build or the install — not per project.
- **A global Bonzai key** used for any work not attributable to a project.
- **A per-project Bonzai key**, optional; when absent, the project falls back
  to the global key.
- **Keys live in the keychain**, never in the notes database and never
  round-tripped to the frontend in plaintext. The UI shows only whether a key
  is configured, plus a non-reversible hint (last 4 characters). This is a
  deliberate departure from how the local endpoint's key is handled today
  (`ProviderModelSettingsDto` round-trips it so settings can pre-fill), and
  follows the Venice BYOK precedent instead.

### 7.3 Model lists per key

LiteLLM's `/v1/models` returns the models the calling key may access, and
virtual keys support per-key model restriction. So a project's model picker
is populated by calling `/v1/models` **with that project's key**. No
client-side model policy is needed.

### 7.4 Operation coverage

| Operation | Today | Bonzai target |
| --- | --- | --- |
| Note transcription | `/v1/notes/transcribe` | `/v1/audio/transcriptions` |
| Dictation | `/v1/dictate` | **disabled in beta** (post-beta: `/v1/audio/transcriptions`) |
| Dictation cleanup | `/v1/dictate/cleanup` | **disabled in beta** (post-beta: `/v1/chat/completions`) |
| Note generation | `/v1/notes/generate` | `/v1/chat/completions` |
| Agent chat | `/v1/chat/completions` | `/v1/chat/completions` |
| Model catalog | `/v1/models` | `/v1/models` (per key) |
| Web search / fetch | `/v1/web/*` | **disabled** |
| Image generate / edit | `/v1/image/*` | **disabled** |
| Video generation | `/v1/video/generate` | **disabled** |
| Computer / browser use | `/v1/computer-use/*` | **disabled** |

LiteLLM audio transcription is confirmed available across openai, azure,
vertex_ai, gemini, deepgram, groq, fireworks_ai, ovhcloud and mistral, so
whisper-class models are reachable through Bonzai with virtual-key auth.

### 7.5 Egress closure — the load-bearing guarantee

"Never call a third party" must be a property of the build, not a policy
someone remembers. Otherwise the first upstream merge that adds a provider
call leaks data, and the detection mechanism is the leak itself.

There are **three independent egress paths**, and they need different
treatment:

| Path | Location | Enforcement |
| --- | --- | --- |
| Model calls | `clovy_api::http_client()` | Host allowlist at the chokepoint |
| MCP over HTTP | `agent_mcp.rs` — its **own** `reqwest::Client` instances (`:626`, `:689`, `:762`, `:966`, `:2688`) | Second allowlist, same list |
| **MCP over stdio** | `Command::new(executable)` (`agent_mcp.rs:2415`, `:2429`) | **Not enforceable in-process** |

A stdio MCP server is a third-party binary making its own network calls. No
in-process allowlist can observe them; the macOS `sandbox-exec` wrapper
constrains filesystem access, not egress.

**Requirements:**

- A single allowlist of permitted hosts (Bonzai, plus any approved MCP host),
  enforced at both HTTP chokepoints, failing closed with a distinct error.
- A CI test asserting no egress outside the allowlist, so an upstream merge
  that introduces a new provider call **fails the build** rather than
  shipping.

### 7.6 MCP policy

Clovy's MCP support is already complete and maintained upstream
(`src-tauri/src/agent_mcp.rs`): both transports, per-server safety policy
(`requiresApproval`, `allowSandboxed`, `timeoutMs`, `maxOutputBytes`,
per-tool approval), tool visibility include/exclude filters, `sandbox-exec`
sandboxing, and secrets by reference. ADR-0040 removed only *Clovy-managed*
MCP servers; user-supplied external servers remain supported under `mcp_`.

Because stdio egress cannot be governed in-process, the "never third party"
rule splits into two claims that are each true and enforceable:

1. **Inference egress is closed.** All model traffic reaches Bonzai only.
   Structurally enforced, CI-tested.
2. **Tool egress is governed, not closed.** MCP servers are an explicit
   per-server admin decision against an allowlist that is empty by default.

**v1 policy:** permit `streamable_http` MCP servers whose host is on the
allowlist. Keep `stdio` disabled. This keeps the guarantee anchored to a real
chokepoint. Relax later, deliberately, if a stdio server is worth the
trade.

A single blanket "never third party" claim would not survive a security
review once MCP is enabled. Splitting it now is the honest framing.

### 7.7 Disabling means three things

For each disabled capability, all three are required. Hiding UI while leaving
the tool registered is how the guarantee leaks:

1. The tool is **not registered** in the agent loop.
2. The UI surface is **absent**, not disabled-looking.
3. The underlying call path **fails closed** if reached.

### 7.8 Account and billing severance

- **No OS Accounts contact.** OS Accounts is a hosted third-party service
  (`accounts.opensoftware.co`, `api.accounts.opensoftware.co`) exposing
  `/me`, `/billing/balance`, `/billing/subscription`,
  `/referrals/me`. It never received meeting content — only identity and
  billing metadata — but it is still an external dependency this fork does
  not want.
- **Satisfy the gate locally rather than removing it.** A synthetic
  always-signed-in account, modelled on `local_dev_account_status()`, keeps
  all 46 `signedIn` references across 13 files working unchanged (avatar,
  settings, onboarding, sidebar, app shell). Because it reports an active
  subscription with full usage remaining, it also satisfies the funding gate
  with no change to `shouldBlockOnFunding`.
- **Promote it out of dev.** `devAccountsUnconfigured` (`App.tsx:449`) is
  gated on `import.meta.env.DEV` and does not apply to release builds, and
  upstream could restrict `local_dev_enabled()` to debug builds at any time.
  Bonzai therefore needs its own named no-account mode using the same
  mechanism, not a dependency on an upstream dev affordance.
- **No metering.** No authorize or charge call runs on any path.
- **Cut P3A telemetry and issue reports.** Both phone home about a build
  upstream does not operate.

Two touch points do the whole job: `shouldBlockOnSignIn`
(`src/lib/account-gate.ts:10`, whose own comment designates it the policy
file) and the synthetic account status in Rust.

Verified non-issue: the data partition is a localStorage value defaulting to
`"default"`, **not** derived from the account user id, so switching off OS
Accounts does not orphan existing notes or projects.

## 8. Fork maintenance contract

This section is a deliverable, not commentary. It extends the whitelabel
additive-layer doctrine from branding to provider routing, and is recorded as
[ADR-0058](adr/0058-bonzai-routing-lives-in-an-additive-provider-layer.md).

- **Add the `upstream` remote.** It does not exist today — `git remote -v`
  shows only `origin` — a gap `whitelabel-implementation-plan.md` also
  records. GitHub's fork relationship powers the "Sync fork" button, which
  works only while merges stay trivial; a CI canary and post-divergence
  merges both need a real remote. `open-software-network/os-clovy` is
  publicly reachable anonymously, so no credentials are required.
- **One dispatch prologue per operation.** For beta:
  `transcribe_saved_audio`, `generate_note_from_transcript`, and the agent
  chat route, plus the disabled paths — each a three-line early return into
  `bonzai::`. `dictate_transcribe` and dictation cleanup gain theirs
  post-beta. Target budget: **under 40 touched lines** in files upstream also
  edits.
- **Never interleave.** No `if bonzai` branches threaded through function
  bodies. A prologue at the top of a function merges cleanly when upstream
  edits the body below it; an interleaved branch does not.
- **A fork ledger.** `UPSTREAM.md` inventories every touched upstream line
  and why. Review checks the ledger is not growing.
- **A conflict canary in CI.** A scheduled job that fetches `upstream/main`,
  merges into a throwaway branch, and reports conflicts. Turns "will the next
  Clovy release break us?" into a dashboard.
- **A post-merge checklist.** After every upstream merge: the egress
  allowlist test, `pnpm typecheck`, `pnpm test`, `cargo test`, and `make
  verify`.

## 9. UX requirements

- A project's Bonzai key is set in the project detail view, beside project
  instructions. Label: "Bonzai key" (sentence case, per
  [spec/sentence-case.md](../spec/sentence-case.md)).
- The projects list shows which projects have their own key and which fall
  back to the global one. The existing subtitle slot (currently showing a
  short project identifier) is the natural place.
- The model picker for a session reflects the models that project's key can
  reach, fetched from `/v1/models`.
- A key is validated at paste time via the existing endpoint probe, so a bad
  key is caught while the user is looking at the field.
- Spend readback is **out of scope for v1**. LiteLLM's `/key/info` returns
  per-key spend, which would let Clovy show attributed cost per project;
  deferred to keep v1 small, and noted as the highest-value follow-up.

## 10. Failure behavior

Hard-fail, loudly, everywhere. A silent fallback would destroy the
attribution the feature exists for, and could spend the wrong client's
budget.

- **Revoked or invalid key (401/403):** the operation fails with a distinct,
  actionable error naming the project and the key. **Never** fall back to the
  global key, to another project's key, or to Clovy credits.
- **Model not permitted for that key:** fail with the model name and the
  project, and prompt re-selection from that key's actual model list.
- **Bonzai unreachable:** fail. No upstream provider fallback exists by
  design.
- **Non-allowlisted host attempted:** fail closed with an egress-policy
  error, distinct from a network error, so it is unmistakable in logs.
- **Project with no key and no global key:** refuse before any work starts,
  matching the existing "an upstream model with no credit price is rejected
  at the boundary" discipline in CONTEXT.md.

## 11. Success metrics

- 100% of inference requests in a session reach the Bonzai host; zero reach
  any other host. Measured by the egress test, not by sampling.
- Zero requests on the dictation paths, since the capability is off in beta.
- Zero OS Accounts requests over an app session.
- Zero authorize/charge calls.
- Per-project spend in LiteLLM reconciles to the projects worked in.
- **Upstream merge cost**: conflicts per upstream release stays in single
  digits, and the canary is green between releases.

## 12. Risks

| Risk | Mitigation |
| --- | --- |
| Upstream adds a new provider call; a merge silently reopens egress | Allowlist fails closed; CI egress test breaks the build |
| Upstream refactors a chokepoint function, breaking a prologue | Conflict canary catches it before it is urgent; prologues are small enough to re-apply |
| A stdio MCP server exfiltrates data | stdio disabled in v1; allowlist governs HTTP servers |
| A key is pasted into the wrong project, billing the wrong client | Show the key's owning project prominently; probe on paste; no silent fallback |
| `local_dev_enabled()` restricted to debug builds upstream | Own named no-account mode rather than a dependency on the dev flag |
| Transcription quality differs from Venice's tuned path | Validate whisper-class model quality on real meeting audio before cutover; dictation, where latency matters most, is deferred out of beta entirely |
| Keys in keychain are per-device; a new device needs re-entry | Accepted. Manual key management is a stated requirement |

## 13. Rollout

**Live status for every phase below lives in the
[implementation plan's status board](bonzai-implementation-plan.md#phase-status),
which is the single source of truth.** This section describes the sequence and
why it is ordered this way; it deliberately carries no status of its own, so
the two documents cannot drift apart.

**Beta is phases 1 to 6.** Phase 0 is groundwork; the dictation phase is
post-beta by decision.

1. **Phase 0 — fork hygiene.** The `upstream` remote, the `bonzai-main`
   trunk, [UPSTREAM.md](../UPSTREAM.md), and the conflict canary. First
   because it is cheapest while divergence from upstream is near zero.
2. **Phase 1 — the guard.** Egress allowlist at both HTTP chokepoints plus
   the CI test. Landing this before any routing means every later phase is
   verified by construction.
3. **Phase 2 — Bonzai provider, chat paths.** `PROVIDER_BONZAI`, the
   `bonzai/` module, global key, note generation and agent chat.
4. **Phase 3 — note transcription.** The path with no existing escape hatch.
   Validate quality on real meeting audio. Dictation is disabled here rather
   than ported.
5. **Phase 4 — per-project keys.** Thread the project id to the resolution
   seam; keychain storage; project detail UI; per-key model lists.
6. **Phase 5 — severance.** Disable web/image/video/computer use. No-account
   mode. Cut P3A and issue reports.
7. **Phase 6 — MCP policy.** Allowlisted `streamable_http` servers to restore
   search where wanted.
8. **Post-beta — dictation.** Choose and benchmark a whisper backend against
   the latency budget, port `dictate_transcribe` and cleanup, then flip the
   kill switch on. Gated on measured latency, not on the code compiling.

Phases 1 and 2 are the risky ones; 4 is the one the feature is named for.

## 14. Open decisions

1. ~~**Does Bonzai live on `main` or a long-lived branch?**~~ **Decided:** a
   long-lived `bonzai-main` branch, following the whitelabel plan's house
   rule. `main` stays a clean upstream mirror carrying no Bonzai code;
   upstream syncs into `main`, `main` merges into `bonzai-main`, and feature
   branches PR into `bonzai-main`. `bonzai-main` is never merged back into
   `main`, so a conflict during the upstream sync is always upstream's doing
   and a conflict during integration is always ours. Topology, sync runbook,
   and ledger live in [UPSTREAM.md](../UPSTREAM.md).
2. **Shares and companion pairing** (`/v1/shares`, `/v1/companion/pairings`)
   — sever or keep? **Recommendation:** cut unless in active use; both are
   Clovy-API-hosted and add egress surface for features a single-operator
   fork may not need.
3. **Where does the Bonzai base URL live** — build-time env (per the
   whitelabel config-layer pattern) or a runtime setting? **Recommendation:** build-time
   env with a runtime override for development, matching how OS Accounts
   config already works.
4. **Whose whisper model?** LiteLLM offers several transcription backends.
   Which one Bonzai routes to determines quality and cost, and is a Bonzai-
   side configuration decision this PRD does not make.

## 15. Naming (CONTEXT.md additions)

Per AGENTS.md, domain terms sharpened here must land in the glossary in the
same change:

- **Bonzai** — this fork's own LiteLLM deployment, on an external managed
  server. The only inference destination. _Avoid_: the gateway, the proxy,
  LiteLLM (say Bonzai; LiteLLM is the software it runs).
- **Bonzai key** — a LiteLLM virtual key held by this fork, scoping model
  access and accruing spend for one project. Managed by hand in LiteLLM.
  _Avoid_: API key, virtual key, LiteLLM key, provider key.
- **Global Bonzai key** — the key used for work not attributable to a
  project. _Avoid_: default key, fallback key.
- **No-account mode** — this fork's operating mode with no OS Accounts
  contact and a synthetic local account. _Avoid_: local dev mode (that is
  upstream's dev affordance), offline mode (unrelated to network state).

Note: "project" stays the UI word and `folder` stays the code and schema
word, per the existing CONTEXT.md entry.

## 16. Companion ADRs

Two decisions here meet the AGENTS.md bar (hard to reverse, surprising
without context, a real trade-off) and should be recorded:

- [ADR-0059](adr/0059-bonzai-egress-is-enforced-by-a-build-time-allowlist.md)
  — **Bonzai egress is enforced by a build-time allowlist at every client
  site plus a source-level guard.** Supersedes
  [ADR-0057](adr/0057-bonzai-is-the-only-inference-egress.md): the allowlist
  is compiled in and not derivable from runtime config, enforcement covers
  all eight client construction sites, and the split between closed inference
  egress and governed tool egress is retained.
- [ADR-0058](adr/0058-bonzai-routing-lives-in-an-additive-provider-layer.md)
  — **Bonzai routing lives in an additive provider layer with a touched-line
  budget.** Extends the whitelabel additive-layer doctrine to provider
  dispatch, and records why interleaved branching is rejected so a future
  contributor does not "tidy" the prologues into something unmergeable.

Numbering note: `docs/adr/` carries an unreconciled collision on 0054
(`0054-clovy-presentation-retains-june-era-technical-identities.md`, which
ADR-0055 supersedes, and `0054-whitelabel-branding-as-additive-config-layer.md`,
which renumbers itself to **0056** when its still-open PR merges, per
[docs/index.md](index.md)). 0056 is therefore spoken for, and these ADRs take
**0057** and **0058**.
