# Local transcription via a bundled sherpa-onnx/Parakeet sidecar

Fork-only implementation plan (`fable/bonzai-all-phases`). Status: proposed,
not started. Written to be handed to a dedicated developer without further
scoping conversations.

## 0. Scope honesty, up front

This is **materially bigger than a typical feature PR** in this repo. It adds:

- a brand-new native dependency class (a compiled ONNX Runtime + sherpa-onnx
  library) that has to be vendored, linked, signed, and notarized on two OS
  families;
- a new persistent sidecar process with its own lifecycle, protocol, and
  idle/reload policy;
- a new large-binary-asset download-and-verify pipeline with UI — nothing
  like it exists in the app for a user-facing feature today (only the Tauri
  auto-updater does anything comparable, and that is a different code path);
- app install-size growth even under a "download on enable" model (the
  sidecar binary itself, plus the onnxruntime dependency, ships in every
  installer);
- a new ADR, a new provider identity, and a licensing/compliance sign-off
  that has **not** been done yet;
- specific to this fork: a change to the compiled network-egress allowlist
  that gates the only `reqwest::Client` construction site permitted in the
  crate (ADR-0059).

Treat this as a multi-week effort for one dedicated developer (native crate +
FFI/linking + per-OS signing + CI + frontend download UX + ADR + legal
sign-off), not a "wire up a new provider" ticket. **Recommended split into at
least three shippable PRs:**

1. Sidecar crate + protocol + manual smoke test, no UI, no app wiring.
2. Provider identity + chokepoint wiring + settings UI + download flow.
3. CI/packaging/signing/release-pipeline changes.

Do not attempt this as one PR.

## 1. Context

### 1.1 Why bundle instead of asking the user to run their own server

An earlier proposal for this same goal asked the user to run their own
OpenAI-compatible HTTP STT server (e.g. `speaches`) and point Clovy at it —
mirroring the existing local-generation BYOI feature
(`PROVIDER_LOCAL` in `src-tauri/src/providers/mod.rs`). The user explicitly
rejected that shape for transcription: Clovy should ship and manage the ASR
engine itself, the way it already ships and manages
`clovy-agent-runtime` (`src-tauri/src/agent_runtime/host.rs`). "On" should be
a toggle, not a deployment the user has to operate.

### 1.2 Why Parakeet, why sherpa-onnx

- Clovy's remote transcription path already defaults to NVIDIA's Parakeet
  model family (`DEFAULT_TRANSCRIPTION_MODEL = "nvidia/parakeet-tdt-0.6b-v3"`
  in `src-tauri/src/providers/mod.rs`, routed through Venice). Using the same
  model family locally keeps local vs. remote transcription quality
  comparable and avoids a confusing "two unrelated models" story for users
  switching between them.
- Parakeet is an NVIDIA NeMo (FastConformer/TDT) architecture, not a
  whisper.cpp-compatible model — it needs a NeMo-capable runtime, not a
  GGML/whisper.cpp one.
- **sherpa-onnx** (`k2-fsa/sherpa-onnx`, Apache-2.0) is the practical way to
  run Parakeet without pulling in NeMo/PyTorch: it wraps ONNX Runtime, ships
  Rust bindings (a published `sherpa-onnx` crate, plus a plain C API usable
  via FFI as a fallback), and has cross-platform prebuilt binaries (Linux,
  macOS x64/arm64, Windows x64/arm64; latest verified release as of this
  writing: v1.13.8). Pre-converted ONNX exports of Parakeet TDT are published
  on Hugging Face under the `csukuangfj` account, e.g.
  `csukuangfj/sherpa-onnx-nemo-parakeet-tdt-0.6b-v2` (and `-int8`, `-fp16`
  variants), with newer `-v3` exports appearing as they become available —
  **confirm the exact current repo name and available quantizations against
  huggingface.co/csukuangfj before implementation locks anything in; do not
  assume a specific repo name is still current.**

### 1.3 This fork's shape matters more than usual here

`os-june` on `fable/bonzai-all-phases` is not upstream Clovy — it is the
Bonzai fork, governed by ADR-0057/0058/0059/0060. Two of those constraints
directly shape this plan and are easy to miss by only reading the two
dispatch chokepoints:

- **ADR-0058** ("Bonzai routing lives in an additive provider layer")
  establishes the house rule this plan must also follow: new provider
  behavior goes in new files with a short dispatch prologue at the top of
  each chokepoint function, never interleaved into the shared body.
  `clovy_api.rs` (6,000+ lines) and `providers/mod.rs` (2,700+ lines) are the
  two highest-churn files upstream edits constantly; every line touched in
  them is a future merge-conflict liability, and ADR-0060 tracks a touched-line
  budget/ledger (`UPSTREAM.md`) for exactly this reason.
- **ADR-0059** ("Bonzai egress is enforced by a build-time allowlist") is the
  sharper constraint. `src-tauri/tests/bonzai_egress_guard.rs` fails the
  build if **any** `reqwest::Client`/`ClientBuilder` is constructed anywhere
  in `src-tauri/src/**` or `src-tauri/tests/**` other than
  `src-tauri/src/bonzai/egress.rs`. This is a blanket source-text scan, not
  something scoped semantically to "inference calls." The compiled
  `ALLOWED_HOSTS` list in that file currently contains exactly one host
  (`api-v2.bonzai.iodigital.com`). **Any HTTP client this feature needs (the
  one-time model-weights download) must be built through a guarded
  constructor added to that same file, and the download host must be added
  to a compiled allowlist there** — there is no other legal way to make an
  HTTP request from the main crate. This is the single most important
  non-obvious finding in this plan; see §3.6.

This means the work is not just "ADR-0026/0058-compatible feature work" — it
has to be written and reviewed against this fork's specific egress-closure
guarantee, which upstream Clovy does not have.

### 1.4 Scope

**In scope**: final note transcription (`transcribe_saved_audio`,
`src-tauri/src/clovy_api.rs:360`) and dictation (`dictate_transcribe`,
`:448`).

**Out of scope**: live preview / streaming transcription
(`src-tauri/src/audio/live_preview.rs`, ADR-0002's "Phase 3: local streaming
ASR runtime," never built). One forward-looking note only: sherpa-onnx also
ships online/streaming ASR models, so ADR-0002 Phase 3 could plausibly reuse
this same sidecar process and wire protocol later via a streaming session
type — that is not designed here.

## 2. Decisions (with reasoning to preserve, not just conclusions)

### 2.1 Sidecar shape: a small standalone Rust binary linking the `sherpa-onnx` crate

Reject a Node/SEA sidecar (that shape was chosen for `agent-runtime`
specifically because it reuses the TypeScript agent harness and the OpenAI
Agents SDK — no equivalent reason exists here) and reject a Swift helper (the
two existing Swift helpers, `mac-dictation-helper` and
`mac-system-audio-recorder`, exist specifically to isolate CoreAudio/TCC
permission surfaces on macOS; a pure ONNX inference worker has no
OS-permission surface to isolate and needs to behave identically on Windows
and macOS).

The direct, already-established template is
`src-tauri/native/windows-dictation-helper/` (its own `Cargo.toml`), built by
`build_windows_dictation_helper()` in `src-tauri/build.rs` via
`cargo build --release --locked --manifest-path <helper>/Cargo.toml
--target-dir <target-dir>`, with the output binary copied to
`src-tauri/native/bin/june-dictation-helper.exe`, referenced verbatim in
`src-tauri/tauri.windows.conf.json`'s `bundle.resources` map. Follow this
shape for a new `src-tauri/native/asr-sidecar/` crate, built on both macOS
and Windows.

**Protocol**: mirror `agent_runtime/host.rs` — newline-delimited JSON over
stdio (`write_frame` appends `\n` and flushes; `spawn_stdout_reader` reads
lines; **not** length-prefixed framing). Reuse that exact shape:
`{method, params, id}` requests in, `{id, result}` / `{id, error}` responses
out, one persistent process per app session, model loaded once and kept warm
across many transcription calls so the ~0.6B-parameter model is not reloaded
per turn.

The sidecar must be a pure compute worker with **no network access at all**.
Model weights are resolved to a local filesystem path and handed to it at
spawn/`load` time; it never fetches anything itself. This keeps it
structurally outside `tests/bonzai_egress_guard.rs`'s concern (the guard
scans `src-tauri/src`/`src-tauri/tests`, and the sidecar crate lives outside
that), but the correct framing is "the sidecar simply never links `reqwest`,"
not "the sidecar happens to be unscanned" — do not treat the latter as a
loophole.

### 2.2 Provider identity: mint `PROVIDER_ON_DEVICE`, do not reuse `PROVIDER_LOCAL`

Apply ADR-0058's own test (it rejected reusing `PROVIDER_LOCAL` for Bonzai;
both of its reasons apply *more* strongly here):

- **False privacy/trust copy.** `src/lib/local-generation.ts` derives its
  entire "local" privacy claim from whether a configured `base_url` resolves
  to a loopback address (`isLoopbackUrl`) — fundamentally BYO-endpoint
  reasoning. A bundled engine has no `base_url` and no `api_key` at all;
  there is nothing to probe. Routing it through `PROVIDER_LOCAL` would either
  force a synthetic loopback URL through machinery that doesn't need it, or
  silently break the loopback-privacy-badge logic for the one case where
  "local" is unconditionally and structurally true (unlike BYO-local, which
  is only privately local if the user happened to point it at a loopback
  address).
- **Inherited upstream churn in a feature this fork doesn't fully control.**
  `LocalGenerationSettings { base_url, model_id, api_key }`
  (`providers/mod.rs:118`) is upstream's BYO-inference feature; every
  upstream change to it would land on this fork's on-device ASR routing for
  free but also for worse — a schema change to accommodate "sometimes there
  is no base_url" is exactly the kind of shared-struct restructure ADR-0058
  forbids.

**Decision**: introduce `PROVIDER_ON_DEVICE` as a new constant, sibling to
`PROVIDER_BONZAI`/`PROVIDER_LOCAL`/`PROVIDER_VENICE`/`PROVIDER_OPENAI` in
`providers/mod.rs`, with all real logic in a new additive module
`src-tauri/src/on_device_asr/` (mirroring `src-tauri/src/bonzai/`'s shape),
and a short dispatch prologue in each chokepoint. This is scoped to
**transcription only** — Parakeet is not a generation model, so
`generation_provider()`/`PROVIDER_LOCAL`'s generation meaning is untouched.

Dispatch precedence at each chokepoint: Bonzai check first (unchanged), then
the new on-device branch, then fall through to the existing Clovy API POST —
consistent with how `bonzai::audio::transcribe_saved_audio` already
intercepts before the Clovy API path today.

### 2.3 CPU-only for v1; GPU flagged as future work, not promised

Ship CPU-only (ONNX Runtime's default CPU execution provider) across macOS,
Windows, and Linux dev builds for v1.

- It is the only execution provider guaranteed to behave identically across
  every target this app ships/dev-builds for, which matters when the
  debugging surface is already large for a first release of a brand-new
  native dependency (linking, signing, sherpa-onnx's API surface).
- CoreML/CUDA/DirectML execution-provider coverage for RNN-T/TDT-style
  stateful decoders like Parakeet TDT is not confirmed mature in sherpa-onnx
  as of this writing — partial operator support commonly causes silent CPU
  fallback for unsupported ops, or (worse) subtly different numerics, which
  is a bad thing to discover after shipping a "faster on Apple Silicon"
  claim.
- The int8-quantized model variant (§2.4) is specifically designed to run
  well on CPU — that is the whole point of choosing it for a bundled,
  always-there feature. Final-note transcription already tolerates some
  latency by design; dictation utterances are short, so CPU real-time-factor
  for an int8 0.6B model should clear the bar without GPU.
- Uniform CPU-only avoids a second signing/entitlement/DLL-bundling problem
  per platform (CUDA needs its runtime bundled or a system dependency;
  DirectML has its own bundling story) before the feature has proven its
  value.

Write the CoreML (and possibly DirectML) evaluation into the new ADR's
"Consequences / future work" as an explicit, measured follow-up once real
usage data exists — not a v1 promise.

### 2.4 Model variant: int8-quantized Parakeet TDT 0.6B, v3 if published else v2

Default to the int8-quantized export (v3 if a `csukuangfj` ONNX export exists
at implementation time, else v2 — verify the exact current repo name before
locking it in). Int8 trades a modest accuracy loss for a much smaller
download and faster CPU inference, which is the right default for a bundled,
no-setup, CPU-first feature where every opt-in user pays the download/disk
cost. fp16/fp32 can be exposed later as an advanced "higher accuracy, larger
download" opt-in if users ask — do not build that toggle in v1.

### 2.5 Model distribution: download on first enable, not bundled in the installer

There is **no existing precedent** in this repo for bundling a large opt-in
ML asset into the installer, and the app's actual asset patterns argue
against it: `agent-runtime`'s SEA binary is compact (no model weights);
`native/agent-skills` and `native/extension` resources are small; the only
large-download UX that exists at all is the Tauri auto-updater's own download
(`src/app/update-decision.ts`, `src/app/app-effects/update-ui.tsx` —
chunked progress, throttled percent reporting, a
`"downloading" | "installing"` state machine). Bloating every installer by
200MB-2.4GB for a feature most users may never enable contradicts the app's
lean-install posture.

**Decision**: ship the sidecar *binary* in every installer (it is small,
like the other native helpers), but download the *model weights* on first
enable of the setting, into the app data directory
(`app_paths::app_data_dir()`), with:

- a Tauri command returning a `tauri::ipc::Channel`-based progress stream
  (reuse the pattern already used elsewhere in `clovy_api.rs` for streamed
  progress rather than inventing a second mechanism);
- a `downloading → verifying → ready` state machine in the frontend, modeled
  on `update-decision.ts`'s `downloading → installing` shape;
- mandatory SHA-256 checksum verification against a pinned value before the
  model is considered usable (mirroring the checksum discipline already used
  for `clovy-agent-runtime.sha256` and the
  `cua-driver-pin.json`/`cua-driver-sbom.spdx.json` vendoring pattern, see
  §3.2);
- explicit UI copy: "this needs an internet connection once; after that,
  on-device transcription works fully offline" — a real, user-facing
  limitation worth stating plainly.

## 3. File-by-file plan

### 3.1 New native crate: the sidecar itself

- `src-tauri/native/asr-sidecar/Cargo.toml` — new standalone crate (own
  manifest, does not depend on `clovy_lib`), depends on the `sherpa-onnx`
  Rust crate. Fall back to the plain C API via FFI only if the crate proves
  insufficient for TDT decoding — confirm at implementation start.
- `src-tauri/native/asr-sidecar/src/main.rs` — stdio JSON-RPC loop
  (newline-delimited), reimplementing (not importing — it's a separate crate
  root) `agent_runtime/host.rs`'s framing shape.
- `src-tauri/native/asr-sidecar/src/protocol.rs` — request/response types:
  `load { model_path, tokens_path, provider: "cpu" }`,
  `transcribe { audio_path | pcm_bytes, language_hint }`, `unload`,
  `shutdown`.
- `src-tauri/native/asr-sidecar/src/engine.rs` — sherpa-onnx offline-recognizer
  setup for Parakeet TDT, one loaded-model instance reused across
  `transcribe` calls.

### 3.2 Vendoring the sherpa-onnx prebuilt library

sherpa-onnx is a prebuilt third-party binary artifact, not first-party
source — closer to the **Computer Use driver** vendoring case already in this
repo than to the source-built dictation helpers:

- `src-tauri/cua-driver-pin.json` → template for a new
  `src-tauri/sherpa-onnx-pin.json` (`source: "k2-fsa/sherpa-onnx"`,
  `releaseTag`, per-target-triple asset names, expected checksums).
- `src-tauri/cua-driver-sbom.spdx.json` → template for
  `src-tauri/sherpa-onnx-sbom.spdx.json`.
- `src-tauri/cua-driver-LICENSE.md` → template for
  `src-tauri/sherpa-onnx-LICENSE.md` (Apache-2.0 text), **plus a separate**
  `src-tauri/parakeet-model-LICENSE.md` once the model license is confirmed
  (§4) — do not conflate the library's license with the model's license; they
  are different grants from different parties.
- `scripts/prepare-cua-driver.mjs` → template for a new
  `scripts/prepare-asr-sidecar.mjs`: fetch the pinned sherpa-onnx release
  asset for the current target triple, verify its checksum against the pin
  file, build/link the Rust crate against it, copy the resulting
  `clovy-asr-sidecar`/`clovy-asr-sidecar.exe` into `.tauri-asr-sidecar/`
  (mirroring `.tauri-agent-runtime/` and `.tauri-helper/`), write a `.sha256`
  beside it.

### 3.3 `src-tauri/build.rs`

Add `build_asr_sidecar()` alongside `build_system_audio_helper()`,
`build_dictation_helper()`, `build_windows_dictation_helper()`,
`ensure_agent_runtime_placeholder()` — invoked from `main()`. On macOS this
needs its own universal-binary (arm64+x86_64) `lipo` step and codesign step,
following `scripts/build-agent-runtime.mjs`'s `universal-apple-darwin` branch
and `signMac()` function as the template (a new
`src-tauri/AsrSidecarEntitlements.plist`, likely a lighter entitlement set
than `AgentRuntimeEntitlements.plist` since a plain CPU-EP onnxruntime binary
should not need JIT/unsigned-executable-memory entitlements — confirm during
implementation, do not assume).

### 3.4 Bundling wiring

- `src-tauri/tauri.macos.conf.json` — add
  `"../.tauri-asr-sidecar/clovy-asr-sidecar": "native/bin/clovy-asr-sidecar"`
  and its `.sha256` to `bundle.resources`, exactly like the
  `clovy-agent-runtime` entries.
- `src-tauri/tauri.windows.conf.json` — same shape with `.exe`, wired through
  `scripts/windows-sign.ps1`'s existing `signCommand` so the new binary gets
  Authenticode-signed like the other Windows resources.
- `scripts/verify-windows-artifacts.ps1` — extend the existing `native/bin`
  assertion to also require the new sidecar executable is present.
- `scripts/build-signed-dmg.sh` — add a smoke-test block for
  `clovy-asr-sidecar` (send a `load` + `shutdown` frame, assert clean exit)
  analogous to the existing `clovy-agent-runtime` smoke block.

### 3.5 Runtime resolution and process host (main crate)

New `src-tauri/src/on_device_asr/` module (additive, ADR-0058 shape):

- `mod.rs` — public surface: `enabled()`, `transcribe_saved_audio(...)`,
  `dictate_transcribe(...)`.
- `host.rs` — `resolve_sidecar_command()` mirrors
  `agent_runtime::host::resolve_runtime_command()`: release resolves
  `app.path().resource_dir()?.join("native").join("bin").join(name)`; debug
  mode runs the locally-built `.tauri-asr-sidecar/clovy-asr-sidecar` binary
  directly (no interpreter needed, unlike the Node-based agent-runtime).
  Owns spawn, newline-delimited JSON write/read, and an **idle-unload
  timer**: unload the loaded model (send `unload`, keep the process alive or
  exit it) after no transcription request for a configurable window.
  Recommend 10-15 minutes — longer than `browser/managed.rs`'s
  `MANAGED_SESSION_IDLE_TIMEOUT` (300s) precedent, since re-warming a 0.6B
  model has real latency cost a browser session doesn't incur.
- `resolve.rs` — model file path resolution under a new
  `app_paths::app_data_dir()` subdirectory (e.g.
  `on-device-asr/models/<variant>/`), checksum verification before use.
- `download.rs` — the model-weights download. **This is the file where the
  egress decision in §3.6 gets implemented**; it must call the new guarded
  constructor from `bonzai::egress`, never construct a raw `reqwest::Client`.

### 3.6 `src-tauri/src/bonzai/egress.rs` (shared file — small, deliberate edit)

Add a clearly-named, clearly-scoped allowlist entry for the model-download
host(s) (e.g. `huggingface.co` and its LFS/CDN host — confirm the exact hosts
the chosen `csukuangfj` repo actually serves from before hardcoding), and a
guarded constructor for that purpose, kept **distinct** from the inference
`ALLOWED_HOSTS`/`guarded_client()` used for Bonzai — e.g.
`ASSET_DOWNLOAD_ALLOWED_HOSTS` + `guarded_asset_download_client()` — so the
code and its governing ADR can say precisely "this is a one-time, non-inference
asset fetch, not a reopening of the inference-egress guarantee ADR-0057/0059
closed." This is a compiled, reviewed, deliberate change to a file whose
whole existence is "no host reaches this list without a rebuild and a
review" — treat it accordingly, and write it up explicitly in the new ADR
(§3.9) rather than slipping it in as an unremarked one-liner.

### 3.7 `src-tauri/src/providers/mod.rs` (shared file — small, deliberate edit, ADR-0058 shape)

- Add `pub const PROVIDER_ON_DEVICE: &str = "on_device";` next to the
  existing provider constants.
- Extend `transcription_provider_for_model`/`configured_transcription_provider()`
  so the latter returns `PROVIDER_ON_DEVICE` when the feature is enabled —
  this is what ADR-0026's job fingerprint already keys on ("transcription
  provider and configured language/dictionary revision"), so toggling the
  setting naturally invalidates cached jobs with no `domain/processing.rs`
  changes needed.
- Add a settings/status shape analogous to
  `SaveLocalGenerationSettingsRequest`/`SetLocalGenerationEnabledRequest` —
  e.g. `SetOnDeviceTranscriptionEnabledRequest { enabled: bool }` plus
  `OnDeviceTranscriptionStatusDto { enabled, model_ready, downloading,
  model_variant }` and corresponding `#[tauri::command]`s, following the
  exact shape already used for local-generation settings in this file.

### 3.8 `src-tauri/src/clovy_api.rs` (shared file — dispatch prologue only, ADR-0058 shape)

Three-line early-return prologues at the top of both functions, after the
existing `bonzai::active()` check and before the body — exactly like the
Bonzai prologue already there:

```
transcribe_saved_audio:
  if crate::bonzai::active() { ... }
  else if crate::on_device_asr::enabled() {
      return crate::on_device_asr::transcribe_saved_audio(request).await;
  }

dictate_transcribe:
  crate::bonzai::severance::refuse_dictation()?;
  if crate::on_device_asr::enabled() {
      return crate::on_device_asr::dictate_transcribe(request).await;
  }
```

Keep this within ADR-0060's touched-line budget/ledger discipline
(`UPSTREAM.md`) — this is fork-specific bookkeeping the developer must
update, not optional.

### 3.9 New ADR

`docs/adr/0061-bundled-on-device-transcription-sidecar.md` (0061 is the next
free number as of this writing — confirm against `docs/adr/` before filing).
Cover: the provider-identity decision (§2.2), CPU-only-for-v1 with CoreML as
flagged future work (§2.3), download-on-enable (§2.5), the `bonzai/egress.rs`
allowlist addition and explicitly why it does not reopen
ADR-0057/0059's egress-closure guarantee (§3.6), the idle-unload policy, and
licensing status as an open item until confirmed (§4).

### 3.10 Frontend

- `src/components/settings/AppSettings.tsx` — new "On-device transcription"
  toggle in the transcription settings section, alongside the existing
  local-generation UI (`localGenerationDraft` etc.), wired to the new
  commands from §3.7.
- New `src/app/on-device-asr-download.ts` (or similar) — download/progress
  state, modeled directly on `update-decision.ts`'s
  `downloadAndInstallClovyUpdate` throttled-progress pattern.
- New small progress UI component, modeled on `update-ui.tsx`'s
  `UpdateHub`/progress-percent rendering.
- `src/lib/suggested-models.ts` / `src/components/settings/ProviderLogo.tsx`
  — likely no change needed for the transcription model catalog itself (the
  on-device engine is a toggle, not a model-id selection, per §2.4), but
  confirm `ProviderLogo.tsx`'s existing nvidia/parakeet icon matching still
  fires correctly for the on-device badge/copy.

## 4. Licensing/compliance — blocking, confirm before vendoring work starts

Two separate licenses are in play and **both** must be cleared before this
ships in a commercial installer:

1. **sherpa-onnx itself**: Apache-2.0 — permissive, redistribution-compatible,
   low risk. Still needs a proper `sherpa-onnx-LICENSE.md` and an attribution
   entry in the app's third-party notices.
2. **The NVIDIA Parakeet checkpoint** (via the `csukuangfj` ONNX conversion):
   NVIDIA NeMo/Parakeet checkpoints are commonly released under CC-BY-4.0 on
   Hugging Face, but **this must be confirmed on the exact model-card page
   for the exact repo/variant chosen** (v3 vs v2, int8 vs fp32) before
   implementation locks it in. NVIDIA has used different license terms across
   different checkpoint families and versions historically. CC-BY-4.0 (if
   that is indeed the license) requires attribution but is compatible with
   commercial redistribution; a non-commercial or more restrictive variant
   would not be. **This is a legal/compliance sign-off item, not an
   engineering assumption** — get an explicit answer from whoever owns that
   call at this org before starting §3.2's vendoring work. Do not treat "the
   license is likely CC-BY-4.0" as sufficient confirmation to ship on.

## 5. Testing plan

**Rust unit tests:**
- `on_device_asr::resolve` — model path resolution; checksum verification
  success/failure paths (file changed, wrong SHA-256, missing file).
- `on_device_asr::host` — idle-unload timer logic (mock clock or short
  test-only timeout); request/response framing round-trip against a fake
  sidecar process (or a stub binary); error propagation on sidecar
  crash/unexpected exit.
- `providers::mod` — extend the existing settings tests (already has
  extensive coverage around `PROVIDER_LOCAL`/`PROVIDER_VENICE` sanitization)
  with equivalent cases for `PROVIDER_ON_DEVICE`: enabling/disabling,
  effective-settings resolution, `configured_transcription_provider()`
  correctly reporting the new identity.
- `bonzai::egress` — a positive test that the new asset-download host is
  reachable through the guarded constructor, and a negative test that an
  arbitrary host is still rejected (mirror the existing
  `assert_allowed`/`ALLOWED_HOSTS` test shape).
- `tests/bonzai_egress_guard.rs` — no code change needed if the download
  client is correctly routed through `egress.rs`, but this is exactly the
  test that will fail loudly (by design) if it isn't. Treat a green run of
  this specific test as a hard gate on the download implementation, not just
  CI noise.
- Sidecar crate (`native/asr-sidecar`): unit tests around protocol
  (de)serialization; a smoke test that loads a tiny/synthetic ONNX graph (or
  is skipped in CI without model weights present) to validate the
  load→transcribe→unload lifecycle without depending on downloading real
  Parakeet weights in CI.

**Live/manual smoke test (developer machine, not CI):**
1. Build the sidecar via `scripts/prepare-asr-sidecar.mjs` (or its
   build.rs-invoked equivalent) for the local platform.
2. Run the standalone sidecar binary directly: feed it a `load` frame
   pointing at a locally-downloaded int8 Parakeet model, then a `transcribe`
   frame against a known WAV fixture, and confirm the output text is
   reasonable — before ever wiring it into the app.
3. Enable the on-device toggle in a dev build of Clovy, trigger the download
   flow, confirm checksum verification, confirm the sidecar spawns and stays
   warm across two consecutive note transcriptions, confirm the idle-unload
   timer actually frees memory after the configured window (watch RSS).

## 6. Manual end-to-end verification (pre-release)

1. **Provider-identity correctness**: with the setting on, transcribe a
   saved meeting recording; confirm the resulting transcript row's provider
   metadata reads `PROVIDER_ON_DEVICE`, and that toggling the setting off and
   re-transcribing produces a *new* job under ADR-0026's fingerprinting (not
   a stale cached row).
2. **Dictation path**: with Bonzai inactive and the setting on, dictate a
   short utterance and confirm it routes to the sidecar rather than the
   Clovy API, with acceptable latency for the dictation UX bar.
3. **Coexistence under load**: start a meeting recording (audio capture
   pipeline active), run an agent-runtime chat session concurrently, and run
   a note transcription through the on-device engine; watch combined
   resident memory (audio capture + agent-runtime Node process + main Rust
   process + sidecar with a warm ~0.6B int8 model — budget roughly an extra
   800MB-1.2GB while warm) and confirm no contention/starvation.
4. **Offline behavior**: after the model is downloaded once, disconnect
   network entirely and confirm both chokepoints keep working with the
   setting on, and that no other code path accidentally tries to reach Clovy
   API or Bonzai when the on-device branch is selected.
5. **Cold-start / first-run**: fresh install, enable the setting, verify the
   download progress UI reports sane percentages, a corrupted/interrupted
   download is detected (checksum mismatch) and recoverable (retry), and
   declining/cancelling mid-download leaves the app in a clean "not enabled"
   state.
6. **Crash/interruption resilience**: kill the sidecar process externally
   mid-transcription and confirm the host detects the disconnect, surfaces a
   clear error (not a silent hang), and can respawn for the next request —
   mirroring how `agent_runtime::host` already handles unexpected exits.
7. **Signing/notarization**: confirm the shipped sidecar binary passes macOS
   Gatekeeper/notarization and Windows SmartScreen/Authenticode checks on a
   clean machine, via the same `scripts/build-signed-dmg.sh` /
   `scripts/windows-sign.ps1` pipeline used for the other native helpers.
8. **Licensing sign-off**: confirm §4's legal review is complete and
   attribution text is present in the shipped app's third-party notices
   before this leaves internal testing.

## 7. Explicitly out of scope

Live preview / streaming transcription stays a distinct, not-yet-scheduled
follow-up (ADR-0002 Phase 3). This sidecar's protocol could plausibly extend
to it later via a streaming session type — noted here, not designed.

## Critical files for implementation

- `src-tauri/src/agent_runtime/host.rs` — sidecar host/protocol template
- `src-tauri/build.rs` — native helper build steps
- `src-tauri/src/bonzai/egress.rs` — the guarded-client allowlist
- `src-tauri/tests/bonzai_egress_guard.rs` — the CI gate on egress
- `src-tauri/tauri.macos.conf.json` / `src-tauri/tauri.windows.conf.json` —
  resource bundling
- `src-tauri/cua-driver-pin.json` (+ `-sbom.spdx.json`, `-LICENSE.md`) —
  template for pinning/vendoring sherpa-onnx
- `src-tauri/src/clovy_api.rs` (`transcribe_saved_audio`, `dictate_transcribe`)
- `src-tauri/src/providers/mod.rs`
- `docs/adr/0058-bonzai-routing-lives-in-an-additive-provider-layer.md` —
  pattern to follow
- `docs/adr/0026-durable-note-transcription-jobs.md` — fingerprint
  compatibility
