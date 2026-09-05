# Implementation plan: Bonzai model routing

Companion to [bonzai-model-routing-prd.md](bonzai-model-routing-prd.md).
Governed by
[ADR-0059](adr/0059-bonzai-egress-is-enforced-by-a-build-time-allowlist.md)
(Bonzai egress is enforced by a build-time allowlist at every client site,
superseding [ADR-0057](adr/0057-bonzai-is-the-only-inference-egress.md)) and
[ADR-0058](adr/0058-bonzai-routing-lives-in-an-additive-provider-layer.md)
(additive provider layer with a touched-line budget). Branch topology and the
sync runbook live in [UPSTREAM.md](../UPSTREAM.md).

## Objective

Route every inference call in this fork to Bonzai, attribute token spend per
project through per-project Bonzai keys, remove the OS Accounts and Clovy
credit dependencies, and do all of it without making upstream merges
expensive.

## Non-goals

Carried from the PRD, restated because they shape the file inventory: web
search and fetch, image generation and editing, video generation, computer
use and browser use are **disabled**, not reimplemented. **Dictation is
disabled for the beta** and returns in a post-beta phase; note transcription
is unaffected. Key lifecycle
(create, rotate, revoke, budget) stays in LiteLLM's own UI. Per-operation
keys and spend readback are deferred.

## Egress enforcement, in brief

The full analysis moved into
[ADR-0059](adr/0059-bonzai-egress-is-enforced-by-a-build-time-allowlist.md),
which supersedes ADR-0057. Three things it settles that this plan depends on:

- **Eight client construction sites**, not one: `http_client()`
  (`clovy_api.rs:3768`), `agent_http_client()` (`:3782`), `local_http_client()`
  (`:3809`), and five `reqwest::Client` constructions in `agent_mcp.rs`
  (`:626`, `:689`, `:762`, `:966`, `:2688`).
- **Two-part enforcement**: a runtime `assert_allowed(&url)` in the request
  helpers, plus a source-level CI guard that fails if a raw `reqwest` client
  is constructed outside `bonzai/egress.rs`. The second is what catches a
  client an upstream merge introduces.
- **The allowlist is compiled in and is not derivable from runtime config.**
  See "Base URL and allowlist" below for why that distinction is load-bearing
  rather than pedantic.

## Current inference surface (inventory)

### Rust - the paths that must move

| Symbol | Location | Today | Has a provider branch? |
| --- | --- | --- | --- |
| `transcribe_saved_audio` | `clovy_api.rs:360` | `POST /v1/notes/transcribe` | **No** |
| `generate_note_from_transcript` | `clovy_api.rs:404` | `POST /v1/notes/generate` | Yes, `:410` |
| `dictate_transcribe` | `clovy_api.rs:442` | `POST /v1/dictate` | **No** |
| dictation cleanup | `clovy_api.rs:~490` | `POST /v1/dictate/cleanup` | **No** |
| `agent_generation_route` | `clovy_api.rs:~1470` | routes Local vs Remote | Yes |
| `proxy_local_agent_chat_completions` | `clovy_api.rs:1128` | proxies to the local endpoint | n/a |
| `with_local_auth` | `clovy_api.rs:1175` | attaches the bearer token | n/a |

### Rust - provider settings

- `LocalGenerationSettings { base_url, model_id, api_key }` -
  `providers/mod.rs:118`
- `local_generation_settings()` - `providers/mod.rs:389`, a **zero-argument
  global read**. This is the seam that per-project keys must displace.
- `profile_overrides: BTreeMap<String, ProfileModelOverrides>` -
  `providers/mod.rs:113`, the existing precedent for a keyed override map.
- `PROVIDER_OPENAI` / `PROVIDER_VENICE` / `PROVIDER_LOCAL` -
  `providers/mod.rs:19-21`.

### Rust - storage and identity

- Keychain access uses the `keyring` v3 crate (`src-tauri/Cargo.toml:112`
  apple-native, `:151` windows-native); `credential_compat.rs` is the
  existing pattern to copy.
- Projects are the `folders` table. `set_folder_instructions`
  (`db/repositories.rs:1856`) is the closest template for a per-project
  scalar write. Highest migration is `034_*`, so the next is **035**.
- `local_dev_account_status()` - `os_accounts.rs:502`, the synthetic account
  to model the no-account mode on. `local_dev_enabled()` - `:466`.

### Frontend

- `src/lib/local-generation.ts` - synthetic catalog option for a
  bring-your-own endpoint.
- `src/lib/model-privacy.ts` - privacy badges keyed on provider identity.
- `src/lib/account-gate.ts:10` - `shouldBlockOnSignIn`, self-declared as the
  policy file.
- `src/app/App.tsx:449,453,485` - `devAccountsUnconfigured`,
  `signInRequired`, `fundingRequired`.
- `src/lib/agent-project-context.ts` - already selects the project that
  supplies context for a session; the same selection feeds key resolution.

## Architecture

### The additive module

```
src-tauri/src/bonzai/
├── mod.rs          # provider identity, PROVIDER_BONZAI, public entry points
├── config.rs       # base URL resolution (build-time env + dev override)
├── egress.rs       # host allowlist, assert_allowed(), guarded client ctor
├── keys.rs         # keychain-backed key store, global + per-project
├── resolve.rs      # (project id) -> effective key + model list
├── chat.rs         # /v1/chat/completions
├── audio.rs        # /v1/audio/transcriptions
└── models.rs       # /v1/models, per key
```

Everything upstream does not have lives here. New files cannot conflict.

### The dispatch prologue

Every interception is the same three lines at the **top** of an existing
function, mirroring the shape upstream already publishes at
`clovy_api.rs:410`:

```rust
if crate::providers::generation_provider() == PROVIDER_BONZAI {
    return crate::bonzai::chat::generate_note(request).await;
}
```

Placed above the existing body so an upstream edit below it merges cleanly.
Never an `if` threaded through the body.

### Two-part egress enforcement

Neither mechanism is sufficient alone, so both ship:

1. **Runtime.** `bonzai::egress::assert_allowed(&url)` in the small set of
   request helpers (`post_json`, `post_multipart`, `authed_send`, the agent
   proxy, and the MCP request sites). Fails closed with a distinct
   `egress_blocked` error, never a generic network error.
2. **Source-level CI guard.** A test that fails if `reqwest::Client::new()`
   or `reqwest::Client::builder()` appears anywhere outside
   `bonzai/egress.rs`. This is the mechanism that actually catches an
   upstream merge adding a new provider call - the runtime check only guards
   call sites we already know about, and a new upstream client would bypass
   it entirely.

The source-level guard is the load-bearing half. Note that it will fail the
moment it lands, because five construction sites already exist; part of
Phase 1 is routing those through the guarded constructor.

### Base URL and allowlist (open question 3, resolved)

Two values that look like one, and conflating them is the failure mode.

| | Base URL | Allowlist |
| --- | --- | --- |
| Answers | where do we send? | where are we *permitted* to send? |
| Changes | per environment | per build |
| Configurable at runtime | yes, within the allowlist | **never** |

**The trap.** The repo's configuration idiom is
`env_or_build_trimmed(key, option_env!(KEY))` (`os_accounts.rs:457`,
duplicated at `connectors/mod.rs:167`): a value baked at build time,
**overridden by a runtime environment variable when one is present**. Runtime
wins. And `load_local_env()` (`os_accounts.rs:534`) walks candidate paths for
a `.env` file and loads it at startup, so "runtime environment" includes a
file dropped next to the binary.

Follow that idiom for the Bonzai base URL *and* derive the allowlist from the
configured base URL, and the guarantee evaporates: anything that can set an
environment variable or write a `.env` redirects every prompt, transcript, and
meeting recording to a host of its choosing, and the allowlist approves it,
because the allowlist is whatever the config said. The check validates itself.

**The resolution** (ADR-0059): the allowlist is a **compile-time constant**
in `bonzai/egress.rs`, unreachable from any runtime input. The base URL keeps
the repo idiom so development can point at a staging gateway, and is then
checked against the compiled allowlist like any other destination.

**Shape:**

```rust
// bonzai/egress.rs - compiled in. Not configurable. Not derived.
const ALLOWED_HOSTS: &[&str] = &[ /* build-time set */ ];

// bonzai/config.rs
pub fn base_url() -> Result<Url, AppError> {
    let raw = env_or_build_trimmed("BONZAI_BASE_URL", option_env!("BONZAI_BASE_URL"));
    let url = Url::parse(&raw).map_err(|_| AppError::new("bonzai_base_url_invalid", ...))?;
    crate::bonzai::egress::assert_allowed(&url)?;   // config is a *subject* of the policy
    Ok(url)
}
```

**Rules that follow:**

- The base URL is validated **at startup**, not at first use. A build
  configured to point somewhere it may not reach should refuse to start with
  a clear error, rather than appear healthy and fail on the user's first
  recording.
- **`https` only**, and the scheme is checked alongside the host. A permitted
  host over plaintext is still plaintext.
- Host comparison is exact, after normalisation. No suffix matching -
  `bonzai.example.com.attacker.net` must not match `bonzai.example.com`. No
  wildcards.
- **Development and release builds carry different allowlists**, and that
  difference must be explicit in the build configuration rather than
  incidental. A release build must never carry a localhost entry.

**Cost, accepted deliberately:** pointing the fork at a different gateway
needs a rebuild. For a fork whose central promise is knowing where data goes,
a compile-time answer to "where may this send?" is worth more than the
convenience of editing a settings field - and it mirrors what ADR-0054 found
for updater endpoints and signing identities, which are per-build for the
same reason.

### Budget accounting

ADR-0058 sets a budget of **under 40 touched lines in shared files**. Two
kinds of change have very different merge risk, so the ledger counts them
separately:

- **Edits inside an existing function or block** - real conflict risk. These
  count against the 40.
- **A new symbol appended to a shared file** - merges cleanly at a distinct
  location. Tracked, not counted.

Estimated against the budget:

| Phase | Edits in existing blocks | Running total |
| --- | ---: | ---: |
| 1 - egress guard | ~13 | 13 |
| 2 - chat paths | ~8 | 21 |
| 3 - note transcription | ~4 | 25 |
| 4 - per-project keys | ~4 | 29 |
| 5 - severance (incl. dictation kill switch) | ~7 | 36 |
| 6 - MCP policy | ~1 | 37 |
| **Beta total** | | **~37 / 40** |
| Post-beta - dictation | ~6 | 43 |

Beta lands at roughly 37 of 40. Deferring dictation buys back the headroom
that Phase 3 would otherwise have spent on two extra prologues - but note
that turning dictation on afterwards **exceeds the budget**. That is a real
signal, not an accounting quirk: either dictation's prologues get folded into
`bonzai/` more aggressively when the time comes, or the budget is revisited
in a superseding ADR. It should not be quietly exceeded.

## Phasing

### Phase 0 - fork hygiene (done)

- `upstream` remote added; `bonzai-main` branched from `main`.
- [UPSTREAM.md](../UPSTREAM.md) - topology, sync runbook, ledger, post-merge
  checklist.
- `.github/workflows/upstream-conflict-canary.yml` - scheduled canary testing
  both merges.

**Verified:** both merge steps run clean at `main` = `693a125`,
`upstream/main` = `8fed7ac`.

### Phase 1 - the egress guard

Lands **before** any routing, so every later phase is verified by
construction.

**Additive:** `bonzai/egress.rs`, `bonzai/config.rs`, `bonzai/mod.rs`; a
`src-tauri/tests/` case for the source-level guard.

**Shared:** the five client constructors route through
`bonzai::egress::guarded_client()`; `assert_allowed` in the request helpers.

**Verify:** a request to a non-allowlisted host returns `egress_blocked`, not
a network error; the source-level guard fails when a raw
`reqwest::Client::new()` is reintroduced; `cargo test`.

**Exit:** no code path can reach a host outside the allowlist without failing
CI.

### Phase 2 - Bonzai provider, chat paths

**Additive:** `bonzai/chat.rs`, `bonzai/models.rs`, `bonzai/keys.rs` (global
key only), `PROVIDER_BONZAI`.

**Shared:** prologues in `generate_note_from_transcript` and
`agent_generation_route`; a `Bonzai` arm alongside `Local` in the route enum.

**Verify:** a note generates end to end against Bonzai with the global key;
the model picker lists what `/v1/models` returns for that key; a revoked key
fails loudly and never falls back.

**Exit:** chat and note generation reach Bonzai only.

### Phase 3 - note transcription

The one remaining path with no existing escape hatch. Dictation is disabled
here rather than ported (see the post-beta phase).

**Additive:** `bonzai/audio.rs` - multipart to `/v1/audio/transcriptions`.

**Shared:** a prologue in `transcribe_saved_audio` (`clovy_api.rs:360`).

**Verify:** transcribe real meeting recordings through Bonzai and compare
against the current Venice output for accuracy, punctuation, and speaker
handling. Note transcription tolerates seconds of latency, so this is a
quality gate rather than a latency one.

**Exit:** note transcription reaches Bonzai; the three beta inference
operations (agent chat, note generation, note transcription) are fully
routed.

### Phase 4 - per-project keys

The feature the PRD is named for, and structurally the safest phase.

**Additive:** migration `035_folder_bonzai_key.sql` (a key reference on
`folders`, never the secret); `bonzai/resolve.rs`; a project-detail UI
section; Tauri commands for set/clear/probe.

**Shared:** a `set_folder_bonzai_key_ref` repository function modelled on
`set_folder_instructions` (`repositories.rs:1856`) - appended, so tracked not
counted; `resolve.rs` consulted where `local_generation_settings()` is read.

**Threading the project id** is the one genuinely invasive part. Use the
existing `selectSessionProjectContext`
(`src/lib/agent-project-context.ts`) selection and carry the resulting
project id on the request structs already crossing the boundary
(`TranscriptionRequest`, `GenerationRequest`, the agent chat body) rather
than adding a parallel channel. Adding an optional field to an existing
struct is an append, not an edit.

**Secrets:** the key value goes in the keychain via the `keyring` crate,
following `credential_compat.rs`. The database stores only a reference. The
DTO returns `configured: bool` plus a last-4 hint - deliberately unlike
`ProviderModelSettingsDto`, which round-trips the local endpoint's key in
plaintext.

**Verify:** two projects with different keys bill to different keys in
LiteLLM; a project with no key uses the global key; no key anywhere refuses
before work starts; the key never appears in a frontend payload or a log.

**Exit:** spend in LiteLLM reconciles to the project worked in.

### Phase 5 - severance

**Shared:** unregister the disabled tools; remove their UI surfaces; fail
closed on their call paths; `shouldBlockOnSignIn` returns false under the
no-account mode; cut P3A and issue reports.

**Dictation is disabled here, by kill switch, not by deletion.** The repo
already has the mechanism and a live precedent: paired constants in
`src/lib/feature-flags.ts` and `src-tauri/src/feature_flags.rs`, kept in
lockstep, with `BROWSER_USE_ENABLED = false` shipping a complete but hidden
capability today. Add `DICTATION_ENABLED = false` to both. Off means the
sidebar entry and command-palette action are absent, the global hotkey is not
registered, the dictation HUD never arms, and `dictate_transcribe` and
dictation cleanup fail closed if reached.

Deletion is the wrong tool here: the surface spans 25 Rust files and 53
frontend files, so removing it would dwarf the entire touched-line budget to
achieve the same user-visible result as one constant.

**Additive:** the named no-account mode, modelled on
`local_dev_account_status()` (`os_accounts.rs:502`) but not gated on a dev
flag.

**Verify:** an app session produces **zero** requests to
`accounts.opensoftware.co`, `api.accounts.opensoftware.co`, and the Clovy API
host; no authorize or charge call runs; each disabled capability is absent
from the UI **and** fails closed if invoked directly. Confirm existing notes
and projects still load - the data partition is a localStorage value
defaulting to `"default"` and is not derived from the account user id, so
this should hold, but it is the change most likely to surprise.

**Exit:** the app runs with no third-party identity dependency.

### Phase 6 - MCP policy

**Shared:** restrict server creation to `streamable_http`; validate the host
against the allowlist at save time and at connect time.

**Verify:** a stdio server cannot be created; a `streamable_http` server on a
non-allowlisted host is refused at both points.

**Exit:** search is restorable through an approved server without reopening
inference egress.

### Post-beta - dictation

Deliberately outside the beta because the risk is a product risk, not a
structural one.

**Gate:** a chosen whisper backend on Bonzai, benchmarked against the
dictation latency budget - a short phrase must round-trip in a few hundred
milliseconds. A backend that is accurate but slow fails this phase while
passing every functional test, which is exactly why it is not a beta
checkbox.

**Additive:** dictation reuses `bonzai/audio.rs` from Phase 3; cleanup reuses
`bonzai/chat.rs`.

**Shared:** prologues in `dictate_transcribe` (`clovy_api.rs:442`) and
dictation cleanup (`~:490`); flip `DICTATION_ENABLED` to true in both
feature-flag files.

**Verify:** measured p50 and p95 round-trip latency for a short phrase and a
sustained block, compared against the pre-fork baseline; accuracy on the same
utterances; the paste path stays correct across the full window.

**Exit:** dictation is on and no slower than the baseline it replaced.

## Fork-update strategy

Governed by [UPSTREAM.md](../UPSTREAM.md). Restated because it is a
requirement, not a nicety:

- Work branches from `bonzai-main` and PRs back into it. `main` stays a clean
  upstream mirror; **never merge `bonzai-main` into `main`.**
- Update the ledger in the same commit that touches a shared file.
- After every upstream merge, run the post-merge checklist - the egress
  allowlist test above all, since that is what an upstream merge can silently
  reopen.

## Open questions

1. **Which whisper backend does Bonzai route to?** A Bonzai-side
   configuration decision. Phase 3 needs it for note-transcription *quality*;
   the post-beta dictation phase needs it for *latency*, which is the harder
   bar. Deferring dictation buys time to answer this properly rather than
   under release pressure.
2. **Shares and companion pairing** (`/v1/shares`, `/v1/companion/pairings`)
   - sever or keep? Not inference, so not blocking, but they are Clovy API
   egress. Decide before Phase 5.
3. ~~**Base URL location**~~ **Resolved** - see "Base URL and allowlist"
   above. The base URL follows the repo's `env_or_build_trimmed` idiom; the
   **allowlist** is a compile-time constant that no runtime input can reach.
   Recorded in ADR-0059.
4. **Does the global Bonzai key live in the keychain too?** Assumed yes for
   consistency; it means a fresh install cannot run until a key is entered,
   which onboarding must handle.

## Verification for this plan's own PR

- [x] The canary workflow parses as valid YAML and its actions are SHA-pinned
      (`repository-hygiene` enforces the pin).
- [x] Both canary merge steps dry-run clean locally at the current heads.
- [x] `bonzai-main` exists on `origin` and points at `main`.
- [ ] Docs-only otherwise - no build gate applies, but `make verify` should
      be green on `bonzai-main` before Phase 1 opens.
