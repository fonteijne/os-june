# Local transcription via a BYO speaches server

Fork-only implementation plan (`fable/bonzai-all-phases`). Status: proposed,
not started. Written to be handed to a dedicated developer without further
scoping conversations.

This is the **bring-your-own-server** alternative to
[`local-transcription-parakeet-sidecar-plan.md`](local-transcription-parakeet-sidecar-plan.md),
which bundles a native ASR sidecar Clovy manages itself. Both plans exist
side by side because they trade off differently: this one needs the user to
run a server, but is a small, low-risk change; the sidecar plan needs no
external server at all, but is a multi-week native-packaging effort. Neither
depends on the other; pick whichever fits, or ship this one first as a
low-cost win while the sidecar is scoped separately.

## 0. Context

### 0.1 Why speaches, why BYO-server

Transcription today has exactly two egress paths, both remote: Clovy API
(OpenAI/Venice), or this fork's Bonzai LiteLLM gateway. Text generation
already has a third path — `PROVIDER_LOCAL`, a user-configured
OpenAI-compatible HTTP endpoint (`LocalGenerationSettings` in
`src-tauri/src/providers/mod.rs`) that never touches Clovy API or Bonzai.
This plan extends that exact idea to transcription: the user runs their own
OpenAI-compatible speech-to-text server and points Clovy at it. No new
Clovy-side inference code, no model bundling, no packaging work — the same
shape as a feature that already ships today, just for a different capability.

**[speaches](https://github.com/speaches-ai/speaches)** (MIT-licensed,
"Ollama for TTS/STT") is the recommended reference backend to document and
test against, but the implementation should stay **generic BYOI** — any
OpenAI-compatible `/v1/audio/transcriptions` server works, exactly as local
generation targets any OpenAI-compatible chat-completions server (LM Studio,
Ollama, vLLM, etc.), not just one named product.

### 0.2 The egress-guard question — resolved, no change needed

This fork enforces a build-time network-egress allowlist (ADR-0059):
`src-tauri/tests/bonzai_egress_guard.rs` fails the build if any
`reqwest::Client`/`ClientBuilder` is constructed anywhere in
`src-tauri/src/**`/`src-tauri/tests/**` other than
`src-tauri/src/bonzai/egress.rs`. This looks, at first glance, like it might
block any new local-transcription HTTP call — but it doesn't, and the reason
is worth stating explicitly because it is easy to get wrong:

Verified by reading `src-tauri/src/clovy_api.rs:3821-3836` — `local_http_client()`
**already exists**, is explicitly documented "For user-configured local/BYO
inference endpoints," and is used today by local generation's BYOI feature.
It satisfies the source-level guard because it is built via
`crate::bonzai::egress::guarded_builder()` (the guard only requires that the
literal `Client::new()`/`Client::builder()` text appear inside
`bonzai/egress.rs`; `guarded_builder()`/`guarded_client()` are exactly the
functions that make that true wherever they're called from). Critically,
`local_http_client()` **deliberately never calls `assert_allowed()`** — the
separate runtime host-allowlist check in the same file that *does* restrict
Bonzai's own inference calls to `ALLOWED_HOSTS = ["api-v2.bonzai.iodigital.com"]`.
That omission is not an oversight; it is the whole point of the function
existing separately from `http_client()`/`agent_http_client()` — local/BYO
endpoints are supposed to be arbitrary, user-controlled hosts, and applying
the Bonzai allowlist to them would break the already-shipped local-generation
feature entirely in release builds.

**Conclusion**: a new local-transcription HTTP call can reuse
`local_http_client()` exactly as-is. **No changes to `src-tauri/src/bonzai/egress.rs`
are needed for this plan** — a direct, deliberate contrast with the
sidecar plan, where downloading model weights *is* a genuinely new network
destination class and does require a new guarded allowlist entry there.

### 0.3 speaches specifics (verified live against speaches.ai docs)

- Docker images: `ghcr.io/speaches-ai/speaches:latest-cpu` and `:latest-cuda`.
  Default port `8000`. Models cache in a `hf-hub-cache` volume
  (`/home/ubuntu/.cache/huggingface/hub`) — fully offline after the first
  download.
- Endpoint: `POST /v1/audio/transcriptions`, multipart `file` + `model` (+
  standard OpenAI-compatible optional fields: `language`, `response_format`,
  `stream`). Model ids look like `Systran/faster-whisper-small` /
  `Systran/faster-distil-whisper-small.en`.
- Models load dynamically per the `model` field in the request (no
  pre-registration needed) and unload after `stt_model_ttl` (default 300s of
  idle) — **the first request after an idle period will be noticeably
  slower** (cold model load); worth surfacing in user-facing copy rather than
  letting it look like a bug.
- Optional bearer auth via the `API_KEY` env var (public exceptions:
  `/health`, `/docs`, `/openapi.json`, the web UI) — maps directly onto the
  existing `api_key`/bearer-header pattern local generation already uses.
- `ALLOW_ORIGINS` env var controls CORS if needed.
- Streaming (SSE) transcription and a Realtime API exist in speaches but are
  for the **live-preview** use case, out of scope here (see §7).

### 0.4 Scope

**In scope**: final note transcription (`transcribe_saved_audio`,
`src-tauri/src/clovy_api.rs:360`) and dictation (`dictate_transcribe`,
`:448`).

**Out of scope**: live preview / streaming transcription
(`src-tauri/src/audio/live_preview.rs`, ADR-0002's unbuilt "Phase 3: local
streaming ASR runtime").

## 1. Two structural gaps that must be fixed, not just a new dispatch branch

These were found by reading the actual code, not assumed, and both apply
regardless of which OpenAI-compatible server the user points Clovy at.

### 1.1 `sanitize_settings()` has no local-transcription survival guard

`transcription_provider_for_model()` (`providers/mod.rs:~553`) is called
unconditionally inside `sanitize_settings()` on every settings load, and
recomputes `transcription_provider` from `transcription_model` every time.
Generation avoids clobbering an active local selection via a `local_active`
guard (`generation_provider == PROVIDER_LOCAL && local_generation_settings_configured(...)`)
checked *before* trusting the persisted provider. **Transcription has no
equivalent guard today.** Left as-is, setting `transcription_provider =
"local"` would silently revert to `openai`/`venice` on the very next app
restart. This is the single most important fix in this plan — everything
else is additive, this is a correctness bug waiting to happen the moment a
local transcription provider exists.

### 1.2 The note-cleanup pass would leak a "local" transcript's text remotely

`domain/processing.rs::maybe_post_process_note_transcript` sends every
transcript except ones from `OPENAI_PROVIDER` through
`cleanup_note_transcript_text` → `clovy_api::cleanup_text` →
`POST /v1/dictate/cleanup` on Clovy API (or Bonzai). Left alone, a "local"
transcript's text would still leave the device through this **second**,
unconditional remote call — defeating the entire point of local
transcription. On this fork specifically this happens to be inert today
because `cleanup_text` calls `bonzai::severance::refuse_dictation()` and
`feature_flags::DICTATION_ENABLED == false` makes every call to it error
(silently swallowed by the caller's `if let Ok(...)`) — but that is
incidental to the dictation kill switch, not a transcription-provider
guarantee, and it will start firing again the moment dictation ships or on
an upstream (non-Bonzai) build where dictation is enabled. **Fix this now**,
not later: add `PROVIDER_LOCAL` alongside `OPENAI_PROVIDER` in that
function's early return.

## 2. Decisions (with reasoning)

### 2.1 Reuse `PROVIDER_LOCAL` — do not mint a new identity

This is a genuine judgment call the developer should not re-litigate:
ADR-0058 established the test for when a new provider identity is warranted
versus reusing `PROVIDER_LOCAL` (it blocked reusing `PROVIDER_LOCAL` for
Bonzai, on the grounds that Bonzai is a remote managed server, not a
user-controlled arbitrary endpoint — reusing `PROVIDER_LOCAL`'s privacy copy
for it would misdescribe where data goes). A BYOI STT server is exactly the
opposite case: it **is** a user-supplied `base_url`/`api_key`, arbitrary
host, no billing — precisely `PROVIDER_LOCAL`'s existing trust story, just
for a different capability (transcription instead of generation). Reusing
the identity is correct here, and keeps `model-privacy.ts`'s existing
loopback-vs-external badge logic reusable verbatim.

(Contrast: the bundled Parakeet-sidecar plan correctly does **not** reuse
`PROVIDER_LOCAL`, because a bundled engine has no `base_url`/`api_key` at
all — a different case reaching a different, also-correct answer under the
same test.)

### 2.2 Billing and the durable job ledger need no changes

No OS Accounts authorize/charge call happens client-side for transcription
today — billing is entirely server-side inside Clovy API when it receives
the request, so skipping Clovy API entirely (as the local branch does)
already means zero metering, exactly like local generation. ADR-0026's job
fingerprint already includes "transcription provider" as a first-class
field, so switching to/from `PROVIDER_LOCAL` naturally produces a new
job/operation id rather than reusing a stale cached transcript.

### 2.3 The probe is advisory-only, never a save/enable gate

`probe_local_generation_endpoint` (generation's equivalent) hits `GET
{base_url}/models` and is non-blocking — the "Test connection" button in
Settings is separate from save/enable. Follow the same contract for
transcription: not every OpenAI-compatible STT server implements
`GET /v1/models` (speaches and faster-whisper-server do; a bare whisper.cpp
`server` build may not), so a probe failure must never block save or enable.

## 3. File-by-file plan

### 3.1 `src-tauri/src/providers/mod.rs`

- New `LocalTranscriptionSettings { base_url: String, model_id: String,
  #[serde(default)] api_key: String }` — a **distinct type** from
  `LocalGenerationSettings` (not a reused alias), because transcription and
  generation endpoints are independently configured — a user may point text
  generation at Ollama and transcription at speaches — and a distinct type
  keeps the two features' call sites from being interchangeable by accident.
- New `ProviderModelSettings` fields: `local_transcription:
  LocalTranscriptionSettings`, `remote_transcription_model: String` (mirrors
  `remote_generation_model`; restores the last explicit remote pick on
  disable rather than resetting to the hardcoded default). Mirror onto
  `ProviderModelSettingsDto`.
- **The `sanitize_settings()` fix** (§1.1): add the `local_active` guard
  transcription currently lacks, mirroring generation's:
  ```
  let local_transcription = sanitize_local_transcription(settings.local_transcription);
  let transcription_local_active = settings.transcription_provider == PROVIDER_LOCAL
      && local_transcription_settings_configured(&local_transcription);
  let transcription_model = if transcription_local_active {
      local_transcription.model_id.clone()
  } else if settings.transcription_provider == PROVIDER_LOCAL {
      remote_transcription_model.clone() // local selected but no longer configured — fall back
  } else {
      let configured = non_empty_or(settings.transcription_model, &remote_transcription_model);
      remote_transcription_model = configured.clone();
      configured
  };
  let transcription_provider = if transcription_local_active {
      PROVIDER_LOCAL.to_string()
  } else {
      transcription_provider_for_model(&transcription_model).to_string()
  };
  ```
  `transcription_provider_for_model` keeps its current job (classifying a
  *remote* model id into openai/venice) and is simply not called when local
  is active.
- New helpers mirroring the generation ones 1:1: `sanitize_local_transcription`,
  `local_transcription_settings_configured`, `local_transcription_settings()`.
- New Tauri commands mirroring the generation trio: `save_local_transcription_settings`,
  `set_local_transcription_enabled`, `probe_local_transcription_endpoint`
  (advisory only per §2.3).
- `set_venice_model`'s `ModelMode::Transcription` arm: also write
  `remote_transcription_model`.
- `default_settings()`: initialize the two new fields.

### 3.2 `src-tauri/src/clovy_api.rs`

- In `transcribe_saved_audio` (line ~360), after the existing
  `bonzai::active()` check, add:
  ```
  if crate::providers::configured_transcription_provider() == PROVIDER_LOCAL {
      return transcribe_saved_audio_local(request).await;
  }
  ```
  placed exactly the way `generate_note_from_transcript` checks
  `generation_provider() == PROVIDER_LOCAL` right after its own Bonzai
  prologue.
- In `dictate_transcribe` (line ~448), after
  `bonzai::severance::refuse_dictation()?`, add the equivalent check
  dispatching to a new `dictate_transcribe_local`.
- New `transcribe_saved_audio_local` / `dictate_transcribe_local`: build
  entirely from existing provider-agnostic helpers already in this file —
  **`local_http_client()` (reuse as-is, see §0.2 — do not construct a new
  client)**, `with_local_auth`, `read_audio`, `audio_part`,
  `filename_for_audio`, `normalized_language`. Multipart POST to
  `{base_url}/audio/transcriptions` (OpenAI wire contract — the same shape
  `bonzai/audio.rs` already uses for its own transcription calls; consider
  sharing that response struct rather than duplicating it). Return
  `TranscriptionProviderResult { provider: PROVIDER_LOCAL, .. }`.
- New `local_transcription_url` / `local_transcription_settings_or_error`
  helpers mirroring the generation equivalents.

### 3.3 `src-tauri/src/domain/processing.rs`

- **The cleanup-skip fix** (§1.2): in `maybe_post_process_note_transcript`,
  add `PROVIDER_LOCAL` to the existing early return alongside
  `OPENAI_PROVIDER`:
  ```
  if provider == crate::providers::OPENAI_PROVIDER || provider == crate::providers::PROVIDER_LOCAL {
      return transcript;
  }
  ```
  Comment explaining why, referencing the new ADR (§5) — this is the single
  highest-priority line in this whole plan.

### 3.4 Frontend

- `src/lib/tauri.ts`: add `LocalTranscriptionSettingsDto`, extend
  `ProviderModelSettingsDto`, add the three command bindings
  (`saveLocalTranscriptionSettings`, `setLocalTranscriptionEnabled`,
  `probeLocalTranscriptionEndpoint`).
- New `src/lib/local-transcription.ts` (sibling of `local-generation.ts`, not
  an edit to it): `localTranscriptionOptionId`, `rawLocalTranscriptionModelId`,
  `unavailableLocalTranscriptionOption`, `withLocalTranscriptionOption`
  (STT-flavored copy, `modelType: "asr"`). Hoist the shared `isLoopbackUrl`
  (no generation-specific logic) into `model-privacy.ts` or a small shared
  module so both files import one copy instead of duplicating it.
- `src/components/settings/ModelPickerDialog.tsx`: **no change needed** —
  the "Tools not verified" caveat is generation-only and
  `modelAvailableForMode` already passes non-generation modes through
  unfiltered. Add a regression test instead (§6) so this stays true.
- `src/lib/model-privacy.ts`: no functional change — `modelPrivacyBadge`
  already handles `privacy === "local"` generically.
- `src/components/settings/AppSettings.tsx`: the main frontend diff. Mirror
  the existing "Text" local-model block (state, handlers, JSX) into the
  "Voice" section's `voice-more-options-panel`: new draft state
  (`localTranscriptionDraft`, enable-confirm, status, probe models,
  setup-visible), new handlers 1:1 with the generation ones, wrap
  `transcriptionOptions` with `withLocalTranscriptionOption`, extend
  `selectModelFromPicker` and `modelValueForMode("transcription")`, update
  `DEFAULT_PROVIDER_MODELS`.

## 4. Licensing

speaches is MIT-licensed — no redistribution concern, since nothing about
it is bundled; the user runs their own instance. No licensing sign-off
needed for this plan (unlike the sidecar plan, which bundles model weights
and needs an explicit model-license check before shipping).

## 5. New ADR

`docs/adr/00NN-local-byoi-transcription-reuses-provider-local.md` — confirm
the next free number against `docs/adr/` at implementation time (0061 was
free as of the sidecar plan; if that plan's ADR lands first, this one is
0062 or whatever is next). Content:

- **Decision**: transcription's BYOI path reuses `PROVIDER_LOCAL`, not a new
  identity (§2.1), and why that is the *opposite*, also-correct answer from
  the bundled-sidecar plan's decision to mint `PROVIDER_ON_DEVICE` — both
  follow ADR-0058's test, applied to genuinely different cases.
- **Decision**: `maybe_post_process_note_transcript` must treat
  `PROVIDER_LOCAL` the same as `OPENAI_PROVIDER` — skip the remote cleanup
  pass — and this exemption is **load-bearing** for the local-transcription
  privacy claim, not incidental. Explicitly note it was previously masked by
  the dictation kill switch and must not be "simplified away" if that
  switch's logic is ever refactored.
- **Note**: no `bonzai/egress.rs` change was needed, and why (§0.2) — worth
  recording so a future reviewer doesn't assume one was missed.
- **Scope note**: live preview (`live_preview.rs`, ADR-0002) is explicitly
  out of scope; this change does not implement or block ADR-0002 Phase 3.

## 6. Testing plan

**Rust (`src-tauri`, `cargo test`):**
- `providers::tests`: `sanitize_settings` round-trips a persisted
  `transcription_provider = "local"` with a configured `local_transcription`
  across a simulated reload (the exact regression §1.1 fixes); falls back to
  `remote_transcription_model` when `local_transcription` becomes
  unconfigured while `transcription_provider` was persisted as `"local"`;
  `save_local_transcription_settings_impl` rejects a save that would leave
  an active local provider unconfigured (mirrors the existing
  `local_model_in_use` test for generation); `set_local_transcription_enabled_impl`
  enable/disable round-trip including the "not configured" error path.
- `clovy_api::tests` (synchronous, no network): `transcribe_saved_audio` and
  `dictate_transcribe` route to the local branch when
  `configured_transcription_provider() == PROVIDER_LOCAL` and to the
  existing paths otherwise (use the existing `replace_current_settings_for_tests`
  hook); error mapping for missing settings (`local_model_not_configured`)
  and non-2xx responses.
- A `#[ignore]`-gated live test module (mirroring the existing
  `live_local_generation` pattern) pointed at `CLOVY_QA_LOCAL_TRANSCRIPTION_BASE_URL`/
  `CLOVY_QA_LOCAL_TRANSCRIPTION_MODEL`, defaulting to a local speaches
  instance, skipping gracefully if unreachable, otherwise transcribing a
  short fixture WAV and asserting `result.provider == PROVIDER_LOCAL` and
  non-empty text.
- `domain::processing::tests`: extend/add a case asserting
  `maybe_post_process_note_transcript` returns the transcript unchanged (no
  cleanup call attempted) when `provider == PROVIDER_LOCAL`, alongside the
  existing OpenAI case.

**Frontend (vitest):**
- `local-transcription.ts`: unit tests for option-id round-trip and
  `withLocalTranscriptionOption` privacy-copy branching (loopback vs.
  external), mirroring whatever covers `local-generation.ts`.
- `AppSettings.tsx`: extend existing settings tests with the transcription
  toggle flow — save without enabling, enable requires configured settings,
  disable restores the remote model, non-loopback endpoint requires the
  confirm step.
- `ModelPickerDialog.tsx`: a regression test asserting a `provider: "local"`
  transcription-mode option renders without the "Tools not verified" caveat.

## 7. Manual end-to-end verification

1. Run speaches via docker-compose, e.g.:
   ```yaml
   services:
     speaches:
       image: ghcr.io/speaches-ai/speaches:latest-cpu
       ports: ["8000:8000"]
       volumes: ["hf-hub-cache:/home/ubuntu/.cache/huggingface/hub"]
   volumes:
     hf-hub-cache:
   ```
   (swap to `:latest-cuda` + a `gpus: all` deploy block for GPU). Also try a
   LAN host, not just loopback, to exercise the "external" privacy badge
   path.
2. In Settings → Voice → More options, enter the base URL and a model id the
   server serves (e.g. `Systran/faster-whisper-small`); confirm "Test
   connection" and also verify save/enable still work if that probe fails.
3. Enable "Use local model" for transcription; **restart the app** and
   confirm it's still active — this is exactly the regression §1.1's
   `sanitize_settings` fix targets.
4. Record a short meeting; confirm the transcript is correct. Note the first
   transcription after a `stt_model_ttl`-idle period will be slower (cold
   model load) — don't mistake this for a bug.
5. Confirm no request reaches Clovy API or Bonzai (packet capture, or point
   `CLOVY_API_URL` at an invalid host and confirm transcription still
   succeeds) and no OS Accounts charge fires.
6. Disable the local model; confirm transcription reverts to the previously
   selected remote model, not the hardcoded default.
7. Dictation half: `feature_flags::DICTATION_ENABLED` is `false` in this
   fork's beta, so full end-to-end dictation verification requires
   temporarily flipping that constant locally (never ship it flipped) to
   exercise `dictate_transcribe_local` against the same speaches instance;
   otherwise rely on the routing unit tests for CI-safe coverage.
8. With the local provider active and (temporarily, for this one test)
   `DICTATION_ENABLED` flipped true, verify no request to
   `/v1/dictate/cleanup` fires for a local transcript — the regression §1.2's
   fix targets, invisible in normal beta testing because the kill switch
   currently masks it.

## 8. Explicitly out of scope

Live preview / streaming transcription stays a distinct, not-yet-scheduled
follow-up (ADR-0002 Phase 3) — speaches' SSE/Realtime API could serve it
later, but that is a different, streaming-shaped design not covered here.

## Critical files for implementation

- `src-tauri/src/providers/mod.rs`
- `src-tauri/src/clovy_api.rs` (`transcribe_saved_audio`, `dictate_transcribe`,
  `local_http_client`)
- `src-tauri/src/domain/processing.rs` (`maybe_post_process_note_transcript`)
- `src-tauri/src/bonzai/egress.rs` (read-only reference — confirms no change
  needed, see §0.2)
- `src/components/settings/AppSettings.tsx`
- `src/lib/tauri.ts`
- `src/lib/local-generation.ts` (template for the new `src/lib/local-transcription.ts`)
- `docs/adr/0058-bonzai-routing-lives-in-an-additive-provider-layer.md` (the
  provider-identity test applied in §2.1)
- `docs/adr/0026-durable-note-transcription-jobs.md` (fingerprint
  compatibility, §2.2)
