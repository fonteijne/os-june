# Roadmap: one model for Bonzai inference

**Owner:** Fork product and desktop engineering
**Date:** 2026-10-09
**Status:** Proposed
**Scope:** Bonzai builds only; force the Clovy-requested model ID `gpt-6-luna` for in-scope text generation and hidden desktop text helpers routed through Bonzai, while preserving the existing Bonzai destination, keys, and no-account boundary

This document captures a product and architecture direction. It is not an ADR, implementation authorization, deployment contract, model-availability claim, or launch commitment. Paths, model capabilities, service behavior, and release wiring are a starting inventory and must be re-verified when work is scheduled. This roadmap does not authorize changes to Clovy's standard builds or upstream model-routing policy.

## Executive recommendation

Add a **Bonzai-build model lock** as a separate policy from Bonzai's existing destination lock. Every in-scope text-generation request from a Bonzai build should name the single canonical model ID `gpt-6-luna`, regardless of a saved Settings choice, a session's stored model, Auto, project state, or an internal text-completion call. The build must refuse clearly if that ID is unavailable or incompatible; it must not silently fall back to another model, provider, or destination. Existing project-to-global Bonzai key resolution remains unchanged.

The user selected text-generation and hidden-call coverage. Hidden desktop chat-completion helpers that share the Bonzai proxy are in scope; server-side issue-report diagnosis remains cut off by the existing no-Clovy-API policy. Do not broaden the lock to note transcription, live preview, dictation, image generation/editing, video generation, web search/fetch, browser use, or computer use. These have separate contracts or are disabled in the Bonzai MVP. “All inference” in this plan therefore means **all in-scope text-generation inference on Bonzai builds**, not literally every inference-shaped operation in all Clovy deployments.

The boundary should be explicit:

```text
Bonzai build
   |
   +--> all in-scope desktop text completions
   |      agent, Home, note generation, and hidden helpers
   |
   +--> issue-report diagnosis remains cut off on Bonzai builds
   |
   +--> requested model id is always gpt-6-luna
   |      unavailable / unsupported -> actionable failure, no fallback
   |
   +--> request destination remains the existing Bonzai endpoint
          project/global Bonzai key and no-account policy remain unchanged
```

This is an additive policy over the current egress rule, not a replacement for it. ADR-0059 constrains **where** Bonzai traffic may go; this roadmap proposes constraining **which text model id** in-scope requests ask for. The Bonzai model-routing PRD remains the record for existing destination, project-key, and no-account behavior; it must be reconciled with this proposal before implementation is authorized.

## Product thesis and distinctions

The literal model ID in the request is `gpt-6-luna`. Repository search did not find that ID in Clovy's source, model catalog, or service configuration. The only matching setting is in `.claude/settings.json`, where Claude Code is configured with the distinct ID `gpt-6-luna[1m]`; that is developer-agent configuration, not evidence that Clovy or Bonzai serves either ID. No roadmap phase may claim the model is available until the Bonzai operator proves the exact ID, route, and operation support.

The user explicitly chose **Bonzai builds only**. This plan does not claim that standard Clovy builds, Clovy API generally, local user-configured endpoints, or other deployments use the fixed ID. Issue-report diagnosis is explicitly out of scope: Bonzai builds refuse Clovy API requests, so diagnosis stays cut off while report-delivery behavior follows the existing Bonzai contract.

The intended restriction concerns the **requested model ID**. It does not pin the physical provider, endpoint, or hardware execution mode selected behind that ID. The existing service-managed text-routing policy may still select its configured private/TEE provider path. A later requirement for one physical backend needs a separate decision and evidence.

| Term | Meaning here | Boundary |
| --- | --- | --- |
| **Bonzai build** | A build with `BONZAI_BASE_URL` configured, activating the fork's Bonzai routing | Remains the only deployment scope in this plan |
| **Model lock** | Native enforcement that eligible Bonzai text-completion requests use one requested model ID | Does not by itself constrain the physical upstream route selected for that ID |
| **`gpt-6-luna`** | The literal requested model ID supplied by the user | Bonzai key authorization and required capability support are unverified |
| **Bonzai egress** | The existing compiled-host restriction for inference traffic | Preserved unchanged; it is a host/destination policy, not a model policy |
| **Text generation** | Chat-completion work including agent runs, Home, note generation, and hidden text helper calls | Separate from note transcription and dictation |
| **Hidden text helper** | Desktop text-completion calls not exposed as a user model picker, such as title suggestion and approval explanation | Shares the Bonzai chat proxy and must be covered explicitly; server-side issue diagnosis stays cut off |

## Roadmap status

**This table is the single source of truth for phase status.** Detailed sections repeat these exact statuses. Vocabulary: `not started` | `in progress` | `done` | `blocked` | `deferred`.

| Phase | Status | Exit criterion | Evidence or blocker |
| --- | --- | --- | --- |
| 0: model and scope contract | **not started** | Exact model ID, Bonzai availability, operation scope, and failure contract are accepted | `gpt-6-luna` is absent from the Clovy catalog/config; exact service identifier and capability are unverified |
| 1: desktop text-request enforcement | **not started** | Bonzai build emits only `gpt-6-luna` for every in-scope desktop text request, regardless of saved/session choice | Depends on Phase 0 and inventory of all desktop chat-completion call sites |
| 2: failure, capability, and compatibility proof | **not started** | Unsupported, unavailable, or refused requests fail actionably without alternate-model fallback; saved data and active runs remain compatible | Requires confirmed model contract and fixtures for request model, tools, vision, and service errors |
| 3: packaged Bonzai release evidence | **not started** | A release build demonstrates the fixed request model, Bonzai-only destination, no-account policy, and correct no-fallback behavior | Needs real Bonzai credentials/catalog, request evidence, and release workflow contract |

## Goals

- Force every in-scope text-generation request from a Bonzai build to request model ID `gpt-6-luna`.
- Cover explicit model selections, Auto, persisted session models, Home, note generation, and hidden text-completion helpers.
- Preserve the existing no-Clovy-API rule, which keeps issue-report diagnosis cut off on Bonzai builds.
- Keep Bonzai as the sole inference destination on Bonzai builds under ADR-0059.
- Preserve Bonzai key resolution, project attribution, no-account mode, no OS Accounts metering, and loud failure behavior.
- Prove that the exact model supports chat completions, streaming, tool calls, context requirements, and any vision use retained by the Bonzai build.
- Make old persisted model selections harmless on Bonzai builds without rewriting user data or changing in-flight/resumable run snapshots unexpectedly.
- Keep ordinary Clovy builds and the standard Clovy API service-managed model policy unchanged.

## First-release non-goals

- Changing standard Clovy model selection or the private-first routing policy in ADR-0022.
- Pinning a physical provider, endpoint, or TEE execution mode behind the requested model ID.
- Forcing `gpt-6-luna` for note transcription, live transcript preview, dictation, or transcript cleanup. Audio is separately scoped and contract-tested; dictation is disabled on the Bonzai MVP.
- Applying the ID to image generation/editing, video generation, web search/fetch, browser use, or computer use. Those capabilities use separate service/API contracts and are disabled or outside the current Bonzai scope.
- Enabling hidden capabilities because the requested model may support them.
- Keeping model pickers that imply a user choice remains effective on a locked surface; presentation details are a Phase 0 product gate.
- Adding a fallback to another model when the requested ID is missing, unsupported, refused, rate-limited, or unavailable.
- Renaming `gpt-6-luna` based on the Claude Code setting `gpt-6-luna[1m]` without explicit confirmation from the Bonzai operator.
- Changing user-selected local model endpoints or Venice BYOK on standard Clovy builds; those are outside the Bonzai-build-only scope. Any such path reachable on a Bonzai build must be rejected or bypassed for in-scope text calls, not allowed to override the build lock.
- Updating release architecture, Clovy API egress, or the TEE topology beyond what is necessary to deliver the accepted Bonzai-build request-model contract.
- Creating an Issue or ADR or implementing runtime changes as part of this roadmap.

## Existing architecture and current seams

This is a starting inventory, not an edit list or implementation authorization. Reverify paths and lines when the work is scheduled.

### Bonzai destination and model selection are separate today

- `src-tauri/src/bonzai/mod.rs:63-96` activates Bonzai from its configured base URL and validates the destination. `src-tauri/src/bonzai/egress.rs` enforces the compiled allowlist for that destination.
- `src-tauri/src/bonzai/config.rs:40-61` resolves optional `BONZAI_DEFAULT_MODEL` at runtime first and build time second. `src-tauri/src/bonzai/resolve.rs:130-161` applies it only when the selected value is Auto or empty; a concrete non-Auto ID passes through unchanged. It is a fallback, not a model lock.
- `src-tauri/src/bonzai/models.rs:25-55,64-93` returns the model IDs exposed by the Bonzai `/v1/models` catalog. It currently exposes a list, not a fixed one-model policy; the catalog lookup is global-key scoped despite per-project inference keys.
- `src-tauri/src/bonzai/chat.rs:28-80,243-276` uses the resolved note-generation model and decodes agent session model tags; concrete IDs pass through to Bonzai. `src-tauri/src/bonzai/audio.rs:95-130` separately resolves the note-transcription model.
- `docs/bonzai-model-routing-prd.md:181-205` describes model lists per key and text/ASR as separate operations. This proposal would supersede its model-choice behavior for in-scope text operations only; it does not change ASR or capability scope.

### Desktop text inference paths

- `src-tauri/src/clovy_api.rs:424-466` dispatches note generation, choosing Bonzai before local or Clovy API providers. Bonzai generation funnels through `bonzai::chat::generate_note`.
- `src-tauri/src/clovy_api.rs:1034-1089` proxies agent chat to Bonzai on a Bonzai build; ordinary builds can route to local endpoints or Clovy API, and the session's tagged model is preserved to keep an active run stable.
- `src-tauri/src/clovy_api.rs:2440-2626` sends Home using an internal Auto model ID; it is not governed by a visible Agent picker.
- `src-tauri/src/clovy_api.rs:1825-1875,2642-2691,2965-3027` routes title suggestion, image-prompt classification, and approval explanation through the shared agent chat proxy. Each in-scope helper is subject to the fixed text-model ID.
- `src-tauri/src/agent_runtime/api.rs:333-340,657-713` treats a user-initiated agent run as one model snapshot. ADR-0018 requires choices to apply at run boundaries and continuations to keep the run's captured model. A future lock must not mutate an active tool loop; new Bonzai runs should request the fixed ID and the treatment of older resumable runs must be decided.
- The current model catalog does not establish that `gpt-6-luna` supports OpenAI-compatible chat completions, streaming, tool calls, required context size, or vision. ADR-0007 makes tool and vision support an authoritative catalog capability, not a name-based inference.

### Existing server-side diagnosis boundary (out of scope)

- The standard Clovy API configures issue-report diagnosis separately from desktop model state. `clovy-api/config.toml:52-59` currently sets `diagnosis_model = "zai-org-glm-5-2"` and bounds the call by timeout, output cap, and per-user rate cap.
- `clovy-api/crates/services/src/issue_reports.rs:66-82,113-169` invokes diagnosis with the configured model and delivers the issue report even if diagnosis fails. ADR-0012 says this completion runs at Clovy's own expense and is invisible to the user (`docs/adr/0012-direct-issue-report-submission.md:40-59`). This remains standard Clovy API behavior and is not changed here.
- The Bonzai build refuses Clovy API requests through `src-tauri/src/bonzai/severance.rs:79-92`; therefore issue-report diagnosis remains cut off on this build. This roadmap does not add a Bonzai-to-Clovy-API or server-side diagnosis route. That existing exclusion is deliberate, not a missing model-lock implementation.

### User-visible model controls and provider exceptions

- `src-tauri/src/providers/mod.rs:19-45,62-159` has separate transcription, generation, image, and video defaults and persisted provider settings. Text generation defaults to `zai-org-glm-5-2`; ASR defaults to Parakeet; image and video have their own model IDs.
- The Bonzai composer and Settings picker are upstream Clovy UI and currently display the live `/v1/models` list. A locked model contract may require a read-only indicator, one-option state, or hiding choice controls in Bonzai builds. This is a product/design decision, not determined by destination egress policy.
- The provider model settings support Auto, local OpenAI-compatible model endpoints, and a Venice API key (`src-tauri/src/providers/mod.rs:62-95,126-159`). On a Bonzai build, agent-local selection is explicitly refused in `bonzai/chat.rs:243-256`, while Bonzai dispatch takes precedence for note generation. Phase 1 must audit every in-scope entry for bypasses rather than rely on a picker-level restriction.

### Accepted decisions and constraints

- ADR-0059 keeps the Bonzai inference destination on a compiled host allowlist, with runtime checks and a source-level HTTP-client guard (`docs/adr/0059-bonzai-egress-is-enforced-by-a-build-time-allowlist.md:76-118`). It is a host policy and defers capability scope to the PRD; it is not a model allowlist.
- ADR-0058 requires additive Bonzai provider code and narrow shared-file edits; ADR-0060 limits shared edit shapes and keeps a 150 counted-line ceiling (`docs/adr/0058-bonzai-routing-lives-in-an-additive-provider-layer.md:52-70`; `docs/adr/0060-the-bonzai-touched-line-budget-is-a-shape-rule-with-an-inventoried-ceiling.md:38-67`). `UPSTREAM.md` and the implementation plan currently disagree on the ledger (135/150 vs 148/150); reconcile before implementation.
- ADR-0061 in this checkout preserves local BYO transcription and its no-remote-cleanup privacy guarantee. It does not conflict with the text-only Bonzai proposal, but is evidence that local inference is a real privacy boundary and must not be accidentally reclassified as Bonzai inference.
- The Bonzai PRD is marked draft and fork-only (`docs/bonzai-model-routing-prd.md:3-5,45-54`). This roadmap does not promote it or change the upstream Clovy API contract.

## Proposed first-version contract

### What gets locked

For Bonzai builds, the native boundary must make `gpt-6-luna` the only requested model ID for eligible text-completion operations, including explicit user selections, Auto, persisted session IDs, Home's internal Auto request, and internal title/classifier/approval-helper requests. Clovy API issue-report diagnosis remains cut off by the existing Bonzai API refusal and is explicitly not a second model path in scope. There is no alternate model path after a failure.

A frontend picker setting is not enforcement. The native Bonzai request boundary must normalize conflicting explicit, Auto, or session model IDs according to the reviewed policy. The roadmap recommends that the native Bonzai request boundary **replace** any saved or session-selected text model with the fixed build policy for new requests, while preserving older persisted values as inert compatibility data. It must not trust model-supplied or renderer-supplied model IDs. Exact contract and error surface remain a Phase 0 gate.

For active and resumable agent runs, preserve ADR-0018's run snapshot: no running tool loop is changed mid-run. New user-initiated runs on Bonzai builds use the fixed requested ID. Existing resumable runs whose saved model differs require an explicit fail-closed, restart-under-policy, or completion-under-snapshot decision before implementation; do not silently rewrite their conversation history or replay mutations.

### Availability, capability, and failure contract

Before enabling the fixed model in a release build, establish that the exact string is recognized by the Bonzai model catalog and every in-scope Bonzai key can invoke it. The recommended authoritative gate is the LiteLLM virtual-key model restriction: the global key and every project key should be permitted to call only `gpt-6-luna`, so an older client cannot use another model through those credentials. The desktop request boundary should also replace saved/session choices for new in-scope calls. Project-key and global-key behavior must be proven separately because keys can have different allowlists and spend attribution. The picker currently asks for the global catalog; that mismatch is relevant to the lock's availability signal and must be resolved or deliberately documented.

Confirm the service accepts the request protocol required by each in-scope path: chat completions, streaming, tool calls, context length, required response parsing, and any retained vision inputs. Image prompt classification is a text call and is in scope only if the image surface remains reachable; actual image generation itself is not. If a text call requires a capability the fixed model lacks, the feature must fail clearly or remain disabled; it must not select a different model automatically.

The following are explicit failures, not fallback triggers: model not listed, key not authorized, unsupported operation, provider refusal, malformed response, or rate limit/network failure. Error text should name the fixed model or relevant Bonzai key scope when safe, distinguish policy/model rejection from an unreachable service, and preserve Bonzai's existing no-fallback semantics.

### User experience direction

The user must be able to tell that model selection is locked on a Bonzai build and which model ID will be requested, without seeing a misleading editable picker. Phase 0 should compare a read-only model row with a compact one-option selector and choose one. Standard Clovy build Settings and per-session model selection remain unchanged. Accessibility should preserve the existing picker control's accessible model label, expanded state, and description if a control remains.

## Implementation phases

### Phase 0: model and scope contract

**Status: not started.**

- Obtain written confirmation from the Bonzai operator that the exact API/catalog ID is `gpt-6-luna`, not `gpt-6-luna[1m]`, and identify whether the ID is per-key or global.
- Confirm in-scope chat compatibility: streamed chat completion, function/tool calls, context limit, any image input requirements for retained helper calls, and response/error semantics.
- Confirm the existing no-Clovy-API policy continues to cut off issue-report diagnosis on Bonzai builds; no diagnosis route is added by this roadmap.
- Decide locked picker presentation and whether its Bonzai catalog is a one-entry catalog or continues showing capability metadata while selection is read-only.
- Decide handling of an existing resumable agent run whose persisted model is not `gpt-6-luna`, respecting ADR-0018 and no mutation replay.
- Confirm all in-scope Bonzai project/global keys can invoke the model and that the fixed model is available under the existing spend attribution behavior.
- Reconcile the Bonzai PRD's per-key model-picker promise with the fixed-model policy. Record whether a key lacking the model is refused before work starts or is considered a key-provisioning blocker.
- Reconcile `UPSTREAM.md` and `docs/bonzai-implementation-plan.md` touched-line counts before authorizing shared edits.

**Exit criterion:** the Bonzai operator, product owner, and desktop owners accept the exact identifier, operation/call-path inventory, capability evidence, picker behavior, key behavior, active/resumable-run policy, and failure contract. Evidence is a documented decision review and real model-catalog/request proof, not the Claude Code settings value. The existing Clovy API refusal remains in force for issue-report diagnosis.

### Phase 1: desktop text-request enforcement

**Status: not started.**

- Re-inventory every Bonzai-build text-completion request, including ordinary agent chat, tool continuations, Home, note generation, and helper calls.
- Apply one fixed model policy at the Bonzai request boundary so explicit settings, Auto, saved session model tags, and helper-call defaults cannot send a different ID.
- Preserve the existing build activation and Bonzai host allowlist; do not introduce a second configurable model provider path.
- Keep standard Clovy build model behavior, Venice BYOK, and local endpoint settings unchanged outside Bonzai builds; prove no in-scope Bonzai text request can escape to them.
- Update the Bonzai model list and any applicable model-control UI to communicate the fixed model without presenting misleading choices.
- Add focused tests at the request serialization/proxy boundary for conflicting saved settings, Auto, explicit user selection, Home, helper calls, and continuations.

**Exit criterion:** tests show that every in-scope desktop text request on Bonzai builds contains only the accepted fixed ID and still preserves the intended key scope, route, tool request, stream behavior, and Clovy prompt contract. Standard Clovy behavior is unchanged by the Bonzai policy.

### Phase 2: failure, capability, and compatibility proof

**Status: not started.**

- Test unavailable model, model-not-authorized key, provider refusals, unsupported tool/vision needs, rate limits, malformed responses, and network failure.
- Prove each failure surfaces an actionable notice and never retries under a different model ID.
- Prove project and global Bonzai key resolution and spend attribution are unchanged; the fixed model does not collapse project keys or silently use a different key.
- Exercise old saved Settings values, Auto state, session model state, Note Chat selection, run resumption, and model catalog refresh.
- Preserve active run behavior at ADR-0018 boundaries and durable note-transcription job fingerprints (ADR-0026) even though ASR is out of this plan.
- Verify every disabled Bonzai capability still fails closed and no text-model claim is used to imply support for ASR/image/video.

**Exit criterion:** focused native, runtime, and request-contract tests demonstrate the no-fallback and compatibility contract across new and resumed work, with all failure cases distinguishable and no unintended provider/key route.

### Phase 3: packaged Bonzai release evidence

**Status: not started.**

- Run a real Bonzai build with a global key and at least two project keys carrying the accepted model permission.
- Capture request-level evidence that chat, Home, note generation, and hidden text helper requests use `gpt-6-luna` and the Bonzai allowlisted host.
- Confirm the desktop still refuses Clovy API requests under the Bonzai no-account policy.
- Exercise revoked/no-key/model-not-allowed/unavailable/unsupported paths and confirm they do not fall back.
- Confirm zero OS Accounts and Clovy-credit usage under the Bonzai no-account mode and confirm per-project LiteLLM attribution remains correct.
- Update the fork-only Bonzai PRD and implementation status board after implementation evidence exists; confirm release workflows bake/ship the agreed policy rather than relying on an unverified runtime environment setting.
- Record the actual model catalog response, key scope, build commit, platform, and test result with secrets and user content excluded.

**Exit criterion:** product and release owners accept dated packaged-build evidence proving the exact model request, Bonzai destination, per-key authorization, no-fallback behavior, and no-account invariant on each supported desktop target.

## Verification strategy

### Model and route contract

- Verify the exact `gpt-6-luna` identifier appears in the Bonzai `/v1/models` response and is callable through the same endpoint contract used by each in-scope operation.
- Verify chat completion, streaming, tool calls, required context window, and supported input modalities against actual service behavior, not a marketing name or Claude Code config.
- Ensure every in-scope Bonzai request's serialized model field is exactly the fixed ID, including call sites which internally use Auto or a separately configured model.
- Assert there is no attempted second model after 401/403/model-not-found/unsupported-parameter/rate-limit/network failures.
- Confirm the standard service-managed private-first routing policy remains unchanged and distinguish requested model ID from selected physical provider/privacy route.

### Native, agent, and compatibility tests

- Unit tests for request-model normalization on ordinary agent requests, Auto, explicit choice, resumed session, Home, note generation, title suggestion, classifier, and approval explanation.
- Run-boundary tests proving an active run retains its captured model; explicit policy for old run resumption is covered separately.
- Tests for global/project key availability and operation-ID/project attribution; the fixed model policy never substitutes another key.
- Settings and catalog tests show the fixed model state on Bonzai builds and preserve normal model choice on non-Bonzai builds.
- No local model endpoint or Venice BYOK path can win dispatch precedence over the Bonzai text lock.
- Tests confirm transcription/ASR and disabled image/video/web/browser/computer behaviors are unaffected by the text-only model policy.

### API and release evidence

- Verify that Bonzai builds continue to refuse Clovy API requests under the no-account policy; diagnosis remains outside this model lock.
- Failure-path tests verify unavailable model, key refusal, unsupported request, and response parsing failures remain bounded and actionable.
- Real-app walkthrough of model indicator/picker, agent send, Home request, note generation, and error notice in a Bonzai build; include keyboard and accessibility checks if the model control changes.
- Request trace or equivalent host evidence proves only Bonzai is the destination for in-scope desktop inference, while no OS Accounts request or Clovy credit charge occurs.
- Full release verification uses the existing Bonzai egress guard and the repository's documented `make verify` gates when implementation is scheduled. This roadmap authoring does not run them.

### Documentation validation for this roadmap

- Validate local Markdown links from the plan, `docs/roadmap/README.md`, and the Roadmap section of `docs/index.md`.
- Confirm the phase-status table matches the README row and all detailed phase headings.
- Run `git diff --check`; inspect both tracked and untracked roadmap changes and confirm no pre-existing paths changed.
- Re-verify all referenced code and release configuration when implementation is scheduled.

## Open questions and decision gates

1. **Is the exact identifier `gpt-6-luna` available to Bonzai?** The repository only contains `gpt-6-luna[1m]` in Claude Code settings, which is not evidence of a Clovy model. Confirm the canonical API ID, `/v1/models` entry, provider route, and exact supported operation contracts before Phase 0 exits.
2. **Should the Bonzai picker remain visible?** The current PRD expects per-key model choice. A fixed model may turn Settings and composer controls into read-only status, a one-option control, or no control. Decide the product state and how unavailable key/model combinations are explained.
3. **What is the exact meaning of “force”?** This plan assumes the requested ID is locked while the existing managed text-routing service may choose the physical provider/privacy route for that ID. If the requirement also pins Venice/Phala or hardware execution, that is a separate cross-service decision.
4. **What happens to resumable runs created under another model?** ADR-0018 preserves the model captured at the agent-run boundary. Decide whether to resume under the stored snapshot, refuse and offer a new run under `gpt-6-luna`, or apply another explicit policy without rewriting history or replaying tools.
5. **Do all global and project keys permit the fixed model?** Prove key-level availability before release; otherwise the policy can make some Projects unusable. Decide whether missing permission is an operator provisioning error or a release blocker.
6. **What is the Bonzai failure surface when the model is unsupported?** The policy must distinguish model rejection from egress/network errors and never silently choose another model. Confirm exact user-facing error and retry behavior before implementation.
7. **Does model-lock UI need a sketch?** The main design uncertainty is whether existing selectors become hidden, read-only, or one-option; after Phase 0 confirms which, a small Settings/composer sketch may help. It is not useful before the model's catalog availability and policy scope are confirmed.
8. **Does this need an ADR?** The existing destination ADR does not answer which model ID is permitted. A hard, build-selected model lock that intentionally removes per-key model choice is a genuine product and operational trade-off, likely hard to reverse and surprising without context. At implementation planning, apply the repository ADR test; if the lock is accepted as a long-lived Bonzai invariant, record a new additive ADR rather than rewriting ADR-0059 or the Bonzai PRD history. No ADR is created here.

## Explicit future ideas and follow-ups

- A separate roadmap/PRD decision for fixing all inference operations, including audio, image, and video, to one model or model family.
- A separate architecture decision if one physical upstream provider, hardware TEE mode, or route endpoint must be pinned rather than only the requested model ID.
- Revisit the global-key model catalog discrepancy independently if per-project key restrictions remain relevant after locking to one model.
- Consider a user-visible “Model locked by this Bonzai build” indicator after Phase 0 picks the UI behavior.
- Revisit standard Clovy model choice only through a new product decision; this Bonzai-only entry does not extend to ordinary builds.

## ADR and Issue follow-ups

This roadmap creates neither an Issue nor an ADR.

Likely independently reviewable implementation work, after the scope and model contract are accepted:

- Confirm and provision the exact Bonzai model ID for all required keys and capabilities.
- Enforce the model ID at every Bonzai-build text-completion boundary and make the model state clear in Settings/composer UI.
- Confirm issue-report diagnosis remains cut off under the existing no-Clovy-API Bonzai policy.
- Prove key/model failures never trigger alternate-model or alternate-provider fallback; preserve run and persistence compatibility.
- Add packaged release evidence and reconcile the Bonzai model-routing PRD, implementation plan, and touched-line ledger.

A new ADR candidate should be considered only after Phase 0 confirms the exact contract: the model lock removes a supported per-key model-selection capability and chooses a fixed model across multiple UI and native request paths. ADR-0059 remains about Bonzai destination egress; it must not be rewritten to appear to decide model policy.

## Decision summary

For Bonzai builds only, the proposal is to force every in-scope text-generation request to use the requested model ID `gpt-6-luna`, including hidden desktop text-completion helpers. Issue-report diagnosis remains cut off by the existing no-Clovy-API policy. Do not force the ID for ASR, dictation, image/video, or web/tool capabilities in this plan. Preserve Bonzai-only inference destination enforcement, per-project keys, no-account mode, and no-fallback behavior. Treat availability and capability as unverified until the Bonzai operator supplies catalog and request evidence. Keep normal Clovy deployments unchanged. Resolve the exact ID, model-control UX, key coverage, and active/resumable-run behavior before implementation is authorized.
