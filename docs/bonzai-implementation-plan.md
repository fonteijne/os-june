# Implementation plan: Bonzai model routing

Companion to [bonzai-model-routing-prd.md](bonzai-model-routing-prd.md).
Governed by [ADR-0057](adr/0057-bonzai-is-the-only-inference-egress.md)
(Bonzai is the only inference egress) and
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
use and browser use are **disabled**, not reimplemented. Key lifecycle
(create, rotate, revoke, budget) stays in LiteLLM's own UI. Per-operation
keys and spend readback are deferred.

## Correction to the ADR-0057 chokepoint count

ADR-0057 names `clovy_api::http_client()` as the model-call chokepoint. At
file level there are **three** static clients in that file, not one:

| Function | Line | Used for |
| --- | ---: | --- |
| `http_client()` | `clovy_api.rs:3768` | Clovy API calls |
| `agent_http_client()` | `clovy_api.rs:3782` | Agent chat proxying |
| `local_http_client()` | `clovy_api.rs:3809` | The custom/local endpoint |

Plus the separate clients in `agent_mcp.rs` (`:626`, `:689`, `:762`, `:966`,
`:2688`). The ADR's decision is unchanged - egress is enforced at the
chokepoints - but the plan must cover five construction sites in two files,
not one. ADRs are append-only, so this is recorded here rather than by
editing the accepted decision.

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
| 3 - transcription | ~9 | 30 |
| 4 - per-project keys | ~4 | 34 |
| 5 - severance | ~5 | 39 |
| 6 - MCP policy | ~1 | 40 |

That lands on the budget with nothing to spare, which is the intended
pressure: it forces logic into `bonzai/` rather than into shared files. If a
phase overruns, move code, do not raise the number.

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

### Phase 3 - transcription and dictation

The two paths with no existing escape hatch, and the ones where quality risk
is real rather than structural.

**Additive:** `bonzai/audio.rs` - multipart to `/v1/audio/transcriptions`.

**Shared:** prologues in `transcribe_saved_audio`, `dictate_transcribe`, and
dictation cleanup.

**Verify:** transcribe a real meeting recording and a dictation utterance
through Bonzai and compare against the current Venice output for accuracy,
punctuation, and speaker handling. **Do not proceed to Phase 4 on a
structural pass alone** - dictation is latency-critical (a few hundred ms for
a short phrase) and a whisper backend that is accurate but slow fails the
product even though it passes the test.

**Exit:** all five inference operations reach Bonzai; measured dictation
latency is recorded.

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
   configuration decision, but Phase 3 cannot be signed off without it, and
   dictation latency depends on it entirely.
2. **Shares and companion pairing** (`/v1/shares`, `/v1/companion/pairings`)
   - sever or keep? Not inference, so not blocking, but they are Clovy API
   egress. Decide before Phase 5.
3. **Base URL location** - build-time env with a dev override is the
   recommendation, following the existing OS Accounts config pattern. Confirm
   before Phase 1, since `bonzai/config.rs` is built there.
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
