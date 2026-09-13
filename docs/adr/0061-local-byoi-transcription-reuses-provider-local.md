---
status: accepted
date: 2026-09-13
---

# Bring-your-own transcription reuses PROVIDER_LOCAL and skips the remote cleanup pass

## Context

Transcription had two egress paths, both remote: Clovy API (OpenAI/Venice)
or this fork's Bonzai gateway. Text generation already had a third:
`PROVIDER_LOCAL`, a user-configured OpenAI-compatible HTTP endpoint
(`LocalGenerationSettings`) that never touches Clovy API or Bonzai.
[docs/local-transcription-speaches-plan.md](../local-transcription-speaches-plan.md)
extends the same idea to speech-to-text: the user runs any server that
speaks `POST /v1/audio/transcriptions` (speaches is the documented reference
backend) and points Clovy at it.

Two questions had to be settled before the code was written: whether a
bring-your-own speech-to-text server is a *new* provider identity, and what
happens to a transcript after it comes back.

## Decision

**1. The transcription path reuses `PROVIDER_LOCAL`; it does not mint a new
identity.** [ADR-0058](0058-bonzai-routing-lives-in-an-additive-provider-layer.md)
set the test: `PROVIDER_LOCAL` describes a user-supplied `base_url` and
`api_key` on an arbitrary, user-controlled host with no billing. It refused
that identity for Bonzai because Bonzai is a remote managed server and the
"local" privacy copy would misdescribe where data goes. A bring-your-own
speech-to-text server is the opposite case: it *is* exactly that trust story,
for a different capability. The separately proposed bundled-sidecar plan
reaches the opposite, also-correct answer under the same test (a bundled
engine has no `base_url` or `api_key` at all), so the two plans are not in
tension. Reuse also lets `model-privacy.ts`'s loopback-versus-external badge
logic apply verbatim.

The endpoint is still a **distinct setting** (`LocalTranscriptionSettings`,
`local_transcription`), not the generation endpoint under a second name: a
user may point text at one server and audio at another, and distinct types
keep the two call sites from being interchangeable by accident.

**2. `sanitize_settings()` guards the local transcription provider the way
it already guarded generation.** Before this change,
`transcription_provider` was recomputed from `transcription_model` on every
settings load, so a persisted `"local"` would have silently reverted to
`openai`/`venice` on the next restart. Local is now kept only while its
endpoint is still configured; otherwise the last explicit remote pick
(`remote_transcription_model`, the twin of `remote_generation_model`) is
restored, never the stale local model id.

**3. `maybe_post_process_note_transcript` treats `PROVIDER_LOCAL` like
`OPENAI_PROVIDER` and skips the remote cleanup pass.** That pass is a second,
unconditional remote call (`/v1/dictate/cleanup` on Clovy API, or Bonzai).
Left alone it would send a local transcript's text off the device and defeat
the feature. **This exemption is load-bearing for the privacy claim, not an
optimisation.** On this fork it was previously masked only by the dictation
kill switch (`feature_flags::DICTATION_ENABLED == false` makes `cleanup_text`
error, silently swallowed by its caller). It must not be "simplified away"
if that switch's logic is ever refactored, and it must hold on any upstream
build where dictation is enabled.

**4. Dispatch order.** The local branch sits after the Bonzai prologue in
`transcribe_saved_audio` and after `refuse_dictation()` in
`dictate_transcribe`, exactly where `generate_note_from_transcript` checks
`generation_provider() == PROVIDER_LOCAL`. On a build with `BONZAI_BASE_URL`
configured, all inference still terminates at Bonzai
([ADR-0059](0059-bonzai-egress-is-enforced-by-a-build-time-allowlist.md));
the local transcription path is reachable on builds without it, the same
condition under which local generation is reachable today.

## Notes for future readers

- **No `bonzai/egress.rs` change was needed, and none was missed.**
  `clovy_api::local_http_client()` already exists for user-configured local
  endpoints. It is built through `guarded_builder()`, which satisfies the
  source-level guard, and it deliberately never calls `assert_allowed()`:
  local endpoints are supposed to be arbitrary hosts, and applying the
  Bonzai allowlist to them would break local generation in release builds.
  The transcription request reuses that client as-is.
- **Billing and the durable job ledger need no changes.** Transcription is
  metered server-side inside Clovy API, so skipping Clovy API means zero
  metering. [ADR-0026](0026-durable-note-transcription-jobs.md)'s job
  fingerprint already includes the transcription provider, so switching
  to or from local produces a new operation id rather than a stale cached
  transcript.
- **The probe is advisory.** "Test connection" hits `GET {base_url}/models`;
  not every speech-to-text server implements it (speaches does, a bare
  whisper.cpp server may not), so a failed probe never blocks save or
  enable.
- **The settings UI is shared, not mirrored.** The Text and Voice sections
  drive one `useLocalEndpoint` hook and one `LocalEndpointRows` component
  (`src/components/settings/LocalEndpointSettings.tsx`); only the Tauri
  commands differ. This is a fork-shaped feature written in upstream's own
  idiom (it depends on nothing in `bonzai/`), so it is a candidate to
  upstream rather than an entry in the Bonzai touched-line ledger of
  [ADR-0060](0060-the-bonzai-touched-line-budget-is-a-shape-rule-with-an-inventoried-ceiling.md).
- **Scope.** A streaming local ASR runtime
  ([ADR-0002](0002-live-transcript-preview-strategy.md) Phase 3) is out of
  scope; this change neither implements nor blocks it. Note that today's
  live preview (`live_preview.rs`) transcribes chunks through
  `transcribe_saved_audio` with `preview: true`, so while the local
  provider is active those chunks go to the local endpoint as well. That
  is the right privacy outcome (no preview text leaves the device either);
  a user whose server is too slow for the preview cadence can turn Live
  transcription off in the same Voice section.

## Consequences

- A user can transcribe notes and dictation entirely on a server they run,
  with no request to Clovy API, Bonzai, or OS Accounts.
- Two provider-settings fields are added (`localTranscription`,
  `remoteTranscriptionModel`), both defaulted, so older settings files still
  load.
- The first transcription after the server has been idle is slower (the
  model reloads); the settings copy says so rather than letting it look like
  a bug.

## Alternatives considered

- **Mint `PROVIDER_LOCAL_TRANSCRIPTION`.** Rejected: it duplicates the
  privacy copy and badge logic for a case ADR-0058's test already classifies
  as `PROVIDER_LOCAL`.
- **Reuse `LocalGenerationSettings` for transcription.** Rejected: one
  endpoint for two capabilities is the wrong default (an LLM server rarely
  serves speech-to-text) and makes the call sites interchangeable.
- **Leave the cleanup pass alone because the kill switch masks it.**
  Rejected: the guarantee would depend on an unrelated flag.
