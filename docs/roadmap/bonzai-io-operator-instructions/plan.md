# Roadmap: Bonzai/iO operator instructions

**Owner:** Product, desktop engineering, and the iO deployment operator  
**Date:** 2026-09-25  
**Status:** Proposed  
**Scope:** A build-selected, operator-owned instruction profile for an iO customer or deployment context running the Bonzai fork, applied to Clovy's in-app agent without changing Clovy's product identity, security boundaries, or user-owned session guidance

This document captures product and architecture direction. It is not an implementation authorization, an ADR, a launch commitment, an Issue, or an external onboarding record. File paths, profile shapes, build arguments, prompt ordering, and protocol details are a starting inventory and must be re-verified against the current tree when the work is scheduled. This roadmap does not add a `SOUL.md`, edit the developer guide, register iO resources, create credentials, change a wire contract, or implement runtime behavior.

## Executive recommendation

Create an **immutable, build-selected operator instruction profile** for an iO deployment of Bonzai. The profile should provide the deployment-specific context that every supported in-app agent surface needs, while Clovy remains the product identity users see and Bonzai remains the managed inference destination already defined by the fork.

The profile is the safe equivalent of an operator-owned global instruction layer. It is not an `AGENTS.md` file, because `AGENTS.md` is repository guidance for coding agents. It is not a `SOUL.md` file, because the current runtime has no `SOUL.md` and the accepted runtime architecture assembles instructions in the trusted Rust host and TypeScript sidecar. It is not a user-editable personality setting, project instruction, or lazy-loaded skill.

The first version should be a build-time artifact with a stable profile id, version, and content hash. A selected iO build receives one deterministic profile; the ordinary no-profile Clovy build remains behaviorally equivalent to the current default. The profile must contain policy and deployment context only. It must contain no credentials, user data, endpoint overrides, permission grants, tool definitions, or capability switches.

The work should be staged as follows:

1. Accept the iO operator policy and identity/disclosure contract before writing prompt text.
2. Add a generated or otherwise additive profile source and compose it through the existing trusted instruction boundary.
3. Cover interactive runs, resumed runs, unattended routines, and Home where the product contract says the profile applies.
4. Provide read-only provenance and support information only if the operator contract requires user transparency.
5. Prove that the profile cannot change Clovy's identity boundary, enable disabled tools, bypass approvals, leak secrets, or weaken Bonzai's no-account and egress guarantees.

### Ownership flow

```text
iO operator
    |
    | owns policy text, approval, support wording, profile version
    v
Build-selected operator instruction profile
    |
    | validated and composed by the trusted Clovy host
    v
Clovy agent runtime
    |
    +--> interactive focused sessions
    +--> resumed sessions using their run snapshot
    +--> unattended routines
    +--> Home or other explicitly accepted agent surfaces
    |
    +--> Clovy-owned tools, approvals, permissions, and persistence
    +--> Bonzai-only inference egress and Bonzai key resolution
```

The iO operator owns the policy content, review, support destination, and deployment contract. Clovy owns instruction assembly, identity, safety enforcement, tools, approvals, local state, and compatibility. Bonzai owns managed inference and spend accounting at the already allowlisted destination. The operator profile must not become a second authority for any of those boundaries.

## Product thesis and terminology

The request uses **iO** as an operator or customer deployment context. The current repository does not define iO as a product, organization, approved partner, or external onboarding contract. A branch-only iO branding fixture is explicitly documented as a configuration scaffold rather than evidence of affiliation or adoption. This roadmap therefore treats iO as a placeholder for an operator-owned deployment profile until the external owner and contract are recorded.

| Term | Meaning in this roadmap | Boundary |
| --- | --- | --- |
| **Clovy** | The user-facing desktop product and canonical application identity | Remains the identity the agent presents unless a later accepted contract changes it; this roadmap does not rename Clovy |
| **Bonzai** | The fork's managed inference destination and no-account operating baseline | Egress, key custody, model access, and spend behavior remain governed by the Bonzai ADRs and native module |
| **iO operator context** | The customer or deployment context whose approved policy should be present in selected builds | Not yet a repository-defined product or partner identity; requires an owner and approved content |
| **Operator instruction profile** | A versioned, build-selected, app-owned block of deployment facts, support language, privacy disclosures, and domain workflow defaults | Advisory and policy-aware context; never a replacement for Rust enforcement, Clovy identity, or user/project instructions |
| **Project instructions** | User-written text scoped to one Project and injected at run boundaries | Remains per-project data under ADR-0027; it must not be moved into the operator profile |
| **Personality** | User-editable voice, detail, initiative, humor, and area settings | Remains local user preference assembled by `persona.rs`; it does not define operator policy |
| **Skill** | A lazy-loaded `SKILL.md` module enabled for a run | Reusable workflow/domain guidance, not a global deployment policy or permission grant |
| **AGENTS.md** | Repository-facing instructions for code-writing agents | Never bundled or implicitly injected into in-app Clovy sessions |
| **SOUL.md** | A historical Hermes-era concept | Does not exist in the current runtime and is not proposed here |

The profile may explain that inference is handled by Bonzai and that the deployment is operated for iO, but exact identity and disclosure wording remains a decision gate. It must not claim that Bonzai is local or offline, and it must not imply that iO owns Clovy's local data, OS credentials, or runtime permissions unless an external contract explicitly establishes that boundary.

## Roadmap status

**This table is the single source of truth for this roadmap's phase status.** Detailed phase headings below repeat the same statuses. Vocabulary is `not started` | `in progress` | `done` | `blocked` | `deferred`.

| Phase | Status | Exit criterion | Evidence or blocker |
| --- | --- | --- | --- |
| 0: baseline and boundary | **done** | Existing instruction seams, Bonzai constraints, iO evidence status, and dirty-tree boundary are inventoried | Repository exploration confirms no in-app `AGENTS.md` or `SOUL.md`; current Bonzai runtime and branch-only iO fixture are classified; no implementation files are changed by this roadmap |
| 1: operator policy contract | **not started** | iO owner, approved policy text, identity/disclosure wording, scope, approvers, and support path are accepted | iO is not defined on current `HEAD`; no external ownership, affiliation, support, or policy source is recorded in the repository |
| 2: additive profile and runtime composition | **not started** | A deterministic selected profile reaches every accepted runtime surface without changing default Clovy behavior or safety enforcement | Depends on Phase 1 and a re-inventory of the ADR-0060 shared-file ledger, which is near its counted ceiling |
| 3: provenance and deployment operations | **not started** | Operators can identify the profile version and users receive any approved read-only disclosure without exposing policy internals or secrets | Scope depends on whether iO requires a support/about surface, update metadata, or only build provenance |
| 4: packaged agent acceptance | **not started** | Default Clovy and selected iO builds pass prompt, identity, safety, privacy, resume, routine, Home, and release evidence gates | Requires a real approved profile fixture, an operator-owned build, Bonzai test credentials, and real-app evidence |
| Post-release: policy evolution and additional surfaces | **deferred** | Any new surface or policy authority has its own owner, compatibility decision, and acceptance evidence | Note-generation/ASR cleanup prompts, provider wire prompts, additional brands, runtime profile downloads, and user-editable global operator policy remain outside the first release |

## Goals

- Give an iO-operated Bonzai build a consistent, auditable source of deployment-specific agent guidance.
- Keep Clovy's user-facing identity, app-owned capability rules, approval semantics, privacy boundaries, and tool catalog authoritative.
- Make operator policy versioned and reproducible from the build rather than silently fetched from an unverified runtime location.
- Apply accepted operator context consistently to interactive runs, resumes, unattended routines, and Home or explicitly selected surfaces.
- Keep the default no-profile Clovy build unchanged in behavior and presentation.
- Make it possible to explain deployment ownership, support, and Bonzai inference honestly without exposing keys, user data, or internal prompt machinery.
- Preserve project instructions, personality settings, and skills as distinct user-controlled or modular mechanisms.
- Preserve Bonzai's no-account mode, compiled egress allowlist, keychain-only key custody, disabled-capability policy, and local BYO transcription exception.
- Leave a clear path for iO policy owners to review, version, approve, roll back, and support a selected profile.

## First-release non-goals

- A broad Clovy-to-iO rename or a runtime brand picker.
- A new iO product identity, bundle identifier, deep link, updater feed, icon set, or marketing surface.
- Treating the branch-only `branding/io` fixture as proof of adoption, affiliation, legal approval, or release readiness.
- Adding or restoring `SOUL.md`.
- Editing `AGENTS.md` to make it an in-app instruction source.
- Making a per-user global prompt editor for operator policy.
- Moving Project instructions into global system instructions or removing their marker sanitization and scoped reinjection behavior.
- Replacing Clovy's persona settings or managed skills.
- Adding OS Accounts, billing, credits, account state, or a new iO identity system merely because an operator profile exists.
- Putting Bonzai keys, service credentials, endpoint overrides, PII, or customer records in the profile or desktop binary.
- Granting tools, changing approval requirements, changing safety mode, re-enabling disabled capabilities, or bypassing native policy.
- Routing local BYO transcription through Bonzai or applying operator policy to that path without a separately accepted privacy decision.
- A signed runtime policy download, remote policy fetch, or server-side instruction injection in the first version.
- Applying changed policy retroactively to an already running or resumable run without an explicit snapshot and migration decision.
- Changing note-generation, ASR cleanup, or provider wire prompts in the first profile scope unless Phase 1 explicitly expands it.
- Creating an ADR, Issue, external OAuth client, release repository, signing key, updater key, or production deployment as part of roadmap authoring.

## Existing architecture and reusable seams

This section separates shipped infrastructure from proposed work. It is a starting inventory, not implementation authorization.

### Developer guidance is not runtime guidance

- `AGENTS.md:9-25,66-92` documents the repository, build workflow, domain terminology, and code-writing boundaries. `CLAUDE.md` is a symlink to it. It is not bundled as an app resource and is not passed to in-app runs.
- `src-tauri/tauri.conf.json:123-136` packages runtime skill resources, not `AGENTS.md`, `CLAUDE.md`, or the repository's `.agents/skills` tree.
- The current runtime has no `SOUL.md`. Historical SOUL references belong to the superseded Hermes path; `CONTEXT.md:83-90` explicitly keeps Project instructions out of a global SOUL file.

The profile must therefore be a separate application-owned artifact with an explicit build and runtime contract.

### Trusted instruction assembly

- `src-tauri/src/agent_runtime/api.rs:23` defines the native base `INSTRUCTIONS` string for focused runs.
- `src-tauri/src/agent_runtime/api.rs:658-797` creates a run, validates the request, snapshots selected skills, persists the user message, and dispatches `run.start` to the sidecar.
- `src-tauri/src/agent_runtime/api.rs:2094-2195` assembles history, attachments, tool descriptors, skills, model limits, and the instruction string. `:2192-2194` currently calls `persona::instructions_for_app()`.
- `src-tauri/src/agent_runtime/persona.rs:16-22` defines the app-owned instruction boundary. Provider safety and Clovy's enforced identity, capability, privacy, and action rules outrank user/project instructions and personality; retrieved content is data, not instructions.
- `src-tauri/src/agent_runtime/persona.rs:333-362` compiles user-editable personality settings and appends the fixed boundary. A future profile should compose additively around this seam rather than replace it or weaken it.
- `src-tauri/src/agent_runtime/host.rs:111-204` owns sidecar lifecycle and the versioned stdio RPC boundary. The sidecar is an orchestration process; Rust remains authoritative for tools, persistence, approvals, secrets, and policy.
- `agent-runtime/src/sdk-engine.ts:64-70` defines the sidecar identity and context-summary policy. `:213-239` creates the SDK `Agent`, sets its name, and combines sidecar identity, native instructions, summary policy, and skill catalog.
- `agent-runtime/src/identity.ts:3-23,44-67` has a fast-path identity response. A profile that changes deployment disclosure must account for this path or explicitly keep it Clovy-only.
- `src-tauri/src/routines.rs:1157-1215` builds unattended routine instructions through the same persona assembly. Operator coverage must be deliberate because routines are not ordinary interactive runs.
- `src-tauri/src/clovy_api.rs:1878-1892` is the separate lightweight Home prompt path. It uses persona assembly but does not necessarily load the full focused-session prompt and tool catalog.

The preferred implementation shape is an additive generated/configured profile consumed by a common composition seam. The exact source language, generated file, and whether a small shared prologue is needed must be decided during implementation planning. Any shared-file edit must be re-counted against ADR-0060's touched-line ledger, currently documented as near its 150-line ceiling.

### User and modular guidance that must remain separate

- `src/lib/agent-project-context.ts:14-143` selects the Project context, renders the `[Clovy project context]` envelope, sanitizes marker lines, and injects it into user-role prompt text because the runtime protocol has no separate structured Project field.
- `src/lib/agent-project-context.ts:146-262` persists context signatures, reinjects after compaction or changes, emits a clearing marker when a session leaves a Project, and strips generated context from display previews.
- `src/components/folders/ProjectSettingsDialog.tsx:201-225` exposes the user-editable Project Instructions field, capped and validated at 4,000 characters. `:226` places the Bonzai Project key field beside it, but the key and instructions have different authority and custody.
- ADR-0027 requires Project instructions to remain inert at rest and scoped to the Project at run boundaries. The operator profile must not absorb or reinterpret them.
- `src-tauri/src/agent_runtime/api.rs:1819-2058` exposes the runtime skill catalog, managed editing, enablement, and two skill roots: the app-data managed root and `$HOME/.agents/skills` read-only root.
- `src-tauri/src/agent_runtime/tools.rs:1187-1258` lets a run list and lazily load only its enabled skills. `src-tauri/resources/agent-skills/clovy-obsidian/SKILL.md` is the bundled skill example.
- `src-tauri/src/app_paths.rs:63-127` isolates debug app data/config paths from production paths. The operator profile must not silently merge or migrate user data partitions.

### Bonzai and compatibility constraints

- `CONTEXT.md:637-666` defines Bonzai, Bonzai key, Global Bonzai key, and no-account mode. Bonzai is remote managed inference, not offline or generic local inference.
- ADR-0057 and ADR-0059 require closed inference egress, a compiled host allowlist, no silent provider fallback, no OS Accounts metering, and fail-closed behavior.
- ADR-0061 keeps user-owned local BYO transcription under `PROVIDER_LOCAL` and preserves its remote-cleanup exemption. The operator profile must not imply that every audio path reaches Bonzai.
- ADR-0055 keeps Clovy canonical while preserving June-era bundle, executable, storage, credential, updater, and external identities where required. A profile is not permission to rename compatibility strings.
- ADR-0060 limits shared-file edit shapes and records a near-ceiling touched-line ledger. Additive generated/configured files are preferred; any required new shared shape needs an addendum before implementation.
- `docs/roadmap/rebrand-to-bonzai/plan.md:1-454` is the broader packaged product/release roadmap. This plan complements it by defining operator policy for an iO deployment; it does not duplicate or replace branding, co-installation, updater, signing, or packaged release work.

### iO evidence boundary

The current `HEAD` contains Bonzai infrastructure associated with `https://api-v2.bonzai.iodigital.com`, but this establishes a managed inference endpoint, not an iO operator contract. The explicit iO brand fixture exists only on a separate whitelabel branch and its originating commit says it is a scaffold, not an onboarded partner or claim of affiliation; its identifiers, updater values, deep link, and icons are placeholders.

Phase 1 must therefore obtain an operator-owned policy source and approval record before any iO-specific identity, support, legal, or deployment statement is placed in an application profile. Until then, “iO” is a roadmap scope label, not a canonical glossary term.

## Proposed first-version operator profile

### Profile contents

The first profile should contain only approved, non-secret text and metadata:

- **Profile metadata:** stable id, schema/profile version, content hash, build selection provenance, and an operator owner reference that does not contain credentials or PII.
- **Deployment context:** a factual explanation of the operator/customer context and how Clovy, Bonzai, and the operator relate.
- **Identity disclosure:** approved wording for “who Clovy is” and, if required, how to explain that the deployment is operated for iO. Clovy should remain the agent identity by default.
- **Privacy and inference disclosure:** accurate wording that managed inference reaches Bonzai; no claim of offline operation; no-account and local-transcription distinctions where relevant.
- **Support and escalation:** approved support destination or escalation wording, without embedding tokens, private URLs, or user-specific data.
- **Domain workflow defaults:** non-binding guidance for the operator's domain, such as terminology, response conventions, or escalation expectations.
- **Unsupported or deferred capability wording:** only if the operator requires a user-facing explanation; it cannot enable the capability.

The profile must reject or exclude endpoint URLs that would affect routing, credentials, key material, tool descriptors, permission requests, raw user records, unbounded external instructions, and arbitrary executable content. A build with an invalid selected profile must fail build or startup validation rather than silently fall back to a different operator policy. The no-profile Clovy build must remain the explicit default path.

### Prompt precedence

The profile should be assembled in a way that preserves this ordering:

1. Provider safety policy and enforced runtime permissions.
2. Clovy's app-owned identity, capability, privacy, approval, and action rules.
3. Mandatory operator facts and disclosures from the selected profile.
4. The current user request and current Project instructions for task-specific behavior.
5. Personality defaults and inferred preferences.
6. Retrieved files, pages, notes, transcripts, connector content, and tool results as untrusted data only.

Operator workflow defaults yield to an explicit user request when there is no safety, privacy, legal, or deployment disclosure conflict. No profile text may redefine Clovy's identity, claim a tool succeeded without its result, grant a capability, bypass an approval, change the Bonzai endpoint, disclose a secret, or turn retrieved content into instructions.

### Surface coverage

The initial contract should explicitly enumerate the surfaces that receive the profile:

- focused interactive `run.start`;
- resumed runs, using the policy snapshot associated with that run;
- unattended routines;
- Home's lightweight path, if the operator requires the same deployment disclosure there;
- identity fast-path responses, if the approved wording differs from the current Clovy-only response.

A changed profile should apply to new runs only unless a later migration decision defines how to handle an active or resumable run. Persisted run configuration already retains instructions for resumption; implementation should use that existing snapshot behavior or an additive equivalent rather than silently changing the meaning of old runs.

Note generation, ASR cleanup, provider wire prompts, and local BYO transcription remain outside the initial profile unless Phase 1 explicitly expands the scope and the corresponding privacy/quality evidence is accepted.

### Operator and user experience

The operator receives a versioned profile fixture and build provenance, not a runtime editor. Users may receive a small read-only deployment/support disclosure only if Phase 1 requires it. The UI must not expose hidden system-prompt text, profile hashes as if they were user settings, or policy controls that imply users can change the operator contract.

Project instructions remain visible in Project settings and remain user-owned. Personality remains editable in Settings. Skills remain individually enabled and lazily loaded. These mechanisms should not be collapsed into an “iO instructions” control.

## Safety, privacy, identity, and compatibility invariants

- **Default-build invariant:** no selected operator profile preserves current Clovy behavior and presentation. A generated iO artifact never becomes the default accidentally.
- **Clovy-identity invariant:** the agent presents as Clovy unless a later accepted identity contract says otherwise. Operator context may explain deployment ownership but cannot make the agent claim to be an unverified external product or person.
- **Profile-provenance invariant:** every selected profile has a stable id, version, content hash, and build provenance. Invalid or missing required profile metadata fails closed.
- **Operator-authority invariant:** the operator owns approved policy text and support wording; Clovy owns prompt assembly, tools, approvals, permissions, persistence, and enforcement.
- **Instruction-order invariant:** provider safety and Clovy app-owned boundaries outrank operator policy; operator workflow defaults do not override explicit user or Project instructions where no mandatory disclosure or safety rule applies.
- **Capability invariant:** profile text cannot register tools, alter the tool catalog, change approval requirements, change safety mode, or re-enable Bonzai-disabled capabilities.
- **Secret invariant:** profiles contain no keys, tokens, credentials, PII, user content, private deployment secrets, or agent runtime secrets. Bonzai keys remain in native credential storage and never enter prompts.
- **Egress invariant:** profile selection cannot change the compiled Bonzai allowlist, endpoint policy, no-account behavior, or local BYO transcription boundary.
- **Project-scope invariant:** Project instructions remain per-project prompt data under ADR-0027. They are not copied into, overridden by, or persisted as operator policy.
- **Personality invariant:** user-editable personality remains a lower-priority preference and does not mutate the operator profile.
- **Untrusted-content invariant:** profile text is app-owned configuration, but retrieved content, tool output, files, notes, transcripts, comments, and Project/user data cannot rewrite it or become higher-priority instructions.
- **Resume invariant:** an active or resumable run uses the profile snapshot it was created with unless a separately accepted migration policy says otherwise.
- **Surface invariant:** interactive, routine, Home, and identity fast-path behavior is either covered consistently or explicitly documented as out of scope; there is no accidental mixed iO/Clovy disclosure.
- **Compatibility invariant:** operator adoption does not remove or repurpose June-era identities, persisted values, updater paths, or released `/v1` contracts under ADR-0055.
- **State invariant:** adopting an operator profile does not migrate, orphan, or reinterpret notes, Projects, recordings, memories, stored sessions, credentials, or data partitions.
- **Honest-account invariant:** no-account copy agrees with request evidence. The profile cannot imply OS Accounts identity, billing, or credits if the Bonzai build remains in no-account mode.
- **Rollback invariant:** rolling back from a newer profile preserves the prior profile's deterministic behavior for existing runs and does not require a runtime network fetch to reconstruct policy.

## Implementation phases

### Phase 0: baseline and boundary

**Status: done.**

The roadmap authoring baseline is complete:

- `AGENTS.md` is classified as developer-facing only.
- No current `SOUL.md` exists; the current runtime uses Rust and TypeScript instruction assembly.
- Bonzai's no-account, keychain, egress, disabled-capability, and local-transcription boundaries are documented by the current glossary and ADRs.
- Existing operator/user guidance mechanisms are inventoried: native instructions, persona, Project instructions, skills, routines, and Home.
- No iO operator policy or approved onboarding record is present on current `HEAD`.
- The branch-only iO fixture is explicitly not treated as adoption evidence.
- The pre-existing dirty paths remain outside this roadmap's output: modified `AGENTS.md` and `docs/index.md`; untracked roadmap skill links/content, `docs/roadmap/`, and `src/lib/brand.generated.ts`.

**Exit criterion:** met for roadmap authoring. The direction is separated from product rebranding, runtime implementation, and external onboarding.

### Phase 1: operator policy contract

**Status: not started.**

Accept the iO operator contract before selecting prompt wording or implementation paths:

- identify the iO policy owner, approver, support owner, and deployment owner;
- provide the authoritative source for operator policy and its review/expiry process;
- define whether the profile describes “operated by iO,” “deployed for iO,” or another relationship, and where that disclosure may appear;
- define the exact Clovy identity response and Bonzai/no-account/privacy wording;
- list the domain terms, workflow defaults, escalation rules, and unsupported-capability explanations that are actually required;
- choose the supported runtime surfaces: focused sessions, resumes, routines, Home, identity fast path, or an explicit subset;
- decide whether profile changes are build-time only and whether old runs retain their snapshot;
- define support and incident escalation without embedding secrets or user data;
- explicitly confirm that the first profile does not alter egress, account mode, key custody, tools, approvals, or local transcription.

The contract should produce an approved profile fixture or content package, an owner, a versioning policy, and a testable acceptance list. It should not yet create production credentials, register an external identity, or modify the runtime.

**Exit criterion:** product, iO operator, privacy, desktop, and release owners accept one policy and disclosure contract, including profile scope and rollback semantics. Evidence is an approved decision record or implementation Issue; no profile integration begins before this exit.

### Phase 2: additive profile and runtime composition

**Status: not started.**

Implement only after Phase 1:

- add an additive profile source and generated/static representation with schema validation, stable id/version/hash, and deterministic build selection;
- compose profile text through a trusted native seam that preserves the existing app-owned instruction boundary;
- ensure the TypeScript sidecar receives one authoritative composed instruction result rather than independently inventing iO identity text;
- cover focused runs, resumes, routines, Home, and identity fast paths according to the Phase 1 surface matrix;
- snapshot profile provenance with a run's resumable configuration so changed profiles do not silently rewrite historical runs;
- preserve the no-profile default and make malformed selected profiles fail closed;
- keep operator policy out of Project instruction storage, personality files, skill files, and provider routing;
- prefer additive/generated files because ADR-0060's shared touched-line ledger is near its ceiling; re-inventory the ledger before any shared-file edit and stop for an addendum if required.

Potential implementation files are the current seams named above, not a pre-authorized edit list. The implementation plan must re-verify whether a common composition point can cover Home and routines without duplicating policy or changing their distinct prompt contracts.

**Exit criterion:** deterministic tests show that an explicit iO profile changes only the approved instruction/disclosure content, every accepted runtime surface receives the expected profile, resumed runs preserve their snapshot, and the no-profile Clovy path remains equivalent. Evidence includes reviewed generated output, profile fixtures, tests, and the ledger update.

### Phase 3: provenance and deployment operations

**Status: not started.**

If Phase 1 requires operator or user transparency:

- expose only the approved read-only deployment/support disclosure;
- make the selected profile id/version visible in an appropriate support or diagnostic context without exposing hidden instructions, hashes as editable settings, or secrets;
- record build provenance and profile hash in release evidence, not in user content or agent prompts beyond what the runtime needs;
- define support escalation for a bad profile, wrong build selection, or stale policy;
- document profile approval, replacement, rollback, and expiry procedures;
- ensure the release process cannot silently substitute a different operator profile.

If no user-facing surface is needed, retain this phase as an operational provenance and release-evidence phase rather than adding UI for its own sake.

**Exit criterion:** an operator can identify exactly which approved profile a build contains, support can diagnose a mismatch without user data or secrets, and rollback/replacement behavior is documented and tested.

### Phase 4: packaged agent acceptance

**Status: not started.**

Run acceptance against a real selected iO build and the unchanged default Clovy build:

- focused prompt receives the profile and still presents as Clovy;
- identity fast path uses the accepted wording;
- explicit user and Project instructions behave according to precedence;
- an enabled skill remains lazy-loaded and profile text cannot grant an unenabled skill;
- a routine receives the profile and cannot bypass approval or safety mode;
- Home either receives the same accepted disclosure or is demonstrably out of scope;
- a profile change affects only new runs while a resumed run retains its stored policy snapshot;
- malformed, missing, or mismatched profiles fail closed;
- no profile preserves the default behavior and presentation;
- no secrets, keys, PII, or hidden operator content appear in logs, database rows, frontend DTOs, or tool inputs;
- disabled Bonzai capabilities remain absent and fail closed;
- no-account request evidence still shows no OS Accounts, billing, or Clovy API inference traffic;
- Bonzai inference remains within the compiled allowlist;
- local BYO transcription remains local and does not inherit a false Bonzai privacy claim;
- support/provenance evidence identifies profile version, build commit, platform, and artifact hash without including secrets.

**Exit criterion:** product, operator, privacy, desktop, and release owners accept dated evidence for every selected surface and failure path. A passing source build without packaged prompt and runtime evidence is insufficient.

### Post-release: policy evolution and additional surfaces

**Status: deferred.**

Keep the following out of the first profile release unless a new decision changes scope:

- signed runtime policy fetch or operator-managed remote configuration;
- profile-specific branding, bundle identity, updater identity, or app-store metadata;
- user-selectable operator profiles or multi-operator binaries;
- applying operator policy to ASR cleanup, note-generation internals, provider wire prompts, or local transcription;
- iO-specific skills or connectors that require new tools, credentials, or permissions;
- a new account, billing, or telemetry boundary;
- retirement of Clovy or June compatibility aliases.

**Exit criterion:** each deferred item has an owner or an explicit decision to retire it. Deferred behavior must not be implied by the first profile.

## Verification strategy

### Documentation and roadmap validation

- Validate local links from this plan, `docs/roadmap/README.md`, and the Roadmap section of `docs/index.md`.
- Confirm this plan's phase table and detailed headings use identical statuses.
- Run `git diff --check` and inspect tracked and untracked changes separately.
- Preserve the dirty-tree baseline and verify that `src/lib/brand.generated.ts` is not represented as an iO source of truth.
- Re-verify all line references and branch-only claims when implementation is scheduled.
- Do not update `CONTEXT.md` with iO as a canonical term until an operator contract establishes the term's meaning and owner.

### Deterministic profile and runtime checks after implementation

- Validate profile schema, allowed fields, size limits, stable id/version/hash, and rejection of secrets, endpoint overrides, executable content, or PII.
- Test deterministic build selection for no profile and explicit iO profile.
- Compare generated instruction output for default and selected profiles; the default must remain equivalent.
- Test precedence: app safety and capability rules cannot be overridden; mandatory operator disclosures are retained; user and Project instructions can still direct task-specific behavior; personality remains lower priority.
- Test interactive start, resume, compaction, routine, Home, and identity fast-path coverage according to the accepted matrix.
- Test profile snapshot and rollback behavior for old runs and new runs.
- Scan logs, persisted run config, frontend DTOs, and tool arguments for secrets and forbidden profile content.
- Re-run the ADR-0060 touched-line ledger and the Bonzai source-level egress guard after every shared-file edit.
- Run the repository's documented focused and full gates when implementation is ready, including the agent runtime typecheck/test/build gate for sidecar changes.

### Real-app and packaged evidence

- Start the default Clovy build and the selected iO build from clean data; verify the profile selection and default equivalence.
- Run a normal focused session that asks who Clovy is, asks about the deployment, uses Project instructions, and loads a permitted skill.
- Run an unattended routine and verify the same policy boundary, tool approvals, and failure behavior.
- Exercise Home and either verify the accepted profile disclosure or record the approved out-of-scope result.
- Resume an interrupted run after changing the selected profile and prove that the stored run policy remains coherent.
- Capture screenshots or recordings only for any new user-facing transparency surface; no visual sketch is proposed because the main uncertainty is policy ownership and prompt coverage, not layout.
- Use Bonzai request evidence to verify no-account, allowlist, disabled-capability, and local-transcription invariants remain intact.
- Record build commit, profile id/version/hash, platform, artifact hash, and test environment while excluding credentials and user content.

## Open questions and decision gates

1. **Who owns and approves the iO policy?**

   The repository has no iO policy source or onboarding record. Name the operator, approver, support owner, and deployment owner before Phase 1 exits. This determines whether the profile is a real product contract or only a local experiment.

2. **What relationship should Clovy disclose?**

   Decide whether the agent should say it is deployed for iO, operated by iO, supported by iO, or only running in an iO-managed environment. The recommendation is to keep “Clovy” as the identity and add only an approved deployment disclosure where needed.

3. **Build-time profile or signed runtime fetch?**

   The recommendation is build-time selection for the first version. A runtime fetch adds availability, authenticity, caching, rollback, privacy, and prompt-injection questions. Revisit only with a separate security and deployment decision.

4. **Which runtime surfaces must receive the profile?**

   Focused sessions, resumes, routines, Home, and the identity fast path have separate assembly paths. The first release should explicitly select the required set rather than assume one path covers all of them.

5. **Should note-generation, ASR cleanup, or provider prompts receive operator policy?**

   The recommendation is no for the first release. These paths have different quality and privacy contracts, and local BYO transcription is an explicit privacy exception. Expanding scope requires separate evidence.

6. **What is user-visible?**

   Decide whether a read-only deployment/support disclosure is required. The recommendation is to provide one only if it helps users or support; do not expose hidden system instructions or create a user-editable operator-policy panel.

7. **What happens when policy changes?**

   The recommendation is that new runs use the new profile while active and resumable runs retain their snapshot. Confirm whether a support or migration path is needed for interrupted runs.

8. **Does the iO deployment remain no-account Bonzai?**

   The recommendation is to preserve the current no-account mode unless an independently approved identity and billing contract says otherwise. A profile must not imply OS Accounts, credits, or Clovy API inference that the build does not use.

9. **Does this scope need an ADR?**

   A follow-up ADR is appropriate only if the implementation chooses an immutable build-time operator policy with a surprising precedence or rollback contract that is hard to reverse and has meaningful alternatives. This roadmap does not reserve a number or create the ADR.

## Explicit follow-ups

Do not create these as part of roadmap authoring; record them when the contract is accepted:

- **Operator policy contract Issue:** owner, approved text, identity/disclosure wording, support, profile scope, and expiry.
- **Profile integration Issue:** additive source, schema/hash validation, build selection, common composition, and run snapshot behavior.
- **Transparency/provenance Issue:** read-only disclosure, profile diagnostics, release evidence, and rollback procedure if required.
- **Acceptance/evidence Issue:** default equivalence, interactive/routine/Home/identity paths, safety and capability tests, no-account/egress packet evidence, and local-transcription privacy evidence.
- **Potential ADR:** immutable operator-policy authority, precedence, and rollback semantics if the ADR test is satisfied.
- **Glossary update:** only after iO has an approved, stable meaning as an operator/customer deployment context rather than a temporary roadmap label.

## Decision summary

Adopt iO through a separate, immutable, build-selected operator instruction profile for Bonzai deployments. Keep Clovy as the product identity, Bonzai as the managed inference destination, and Rust as the authority for security, tools, permissions, approvals, persistence, and egress. Keep `AGENTS.md`, Project instructions, personality, and skills in their existing separate roles; do not add `SOUL.md`. Start with an approved operator policy and disclosure contract, then implement an additive profile that covers the accepted runtime surfaces and snapshots policy for resumable runs. Do not call the work adopted, branded, provisioned, or production-ready until operator ownership, profile provenance, default regression, real-app prompt behavior, no-account/egress evidence, and rollback evidence are all present.
