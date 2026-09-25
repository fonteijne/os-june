# Roadmap: two installable Clovy versions

**Owner:** Product and desktop engineering  
**Date:** 2026-09-25  
**Status:** Proposed  
**Scope:** A local macOS development bundle that installs beside the official Bonzai release

This is a product and architecture direction, not implementation authorization.
It deliberately narrows the earlier parallel-install proposal to the smallest
useful outcome: two installable desktop apps. Paths and identifiers are a
starting inventory and must be re-verified when implementation begins.

## Executive recommendation

Add one explicit development build profile that produces a second installable
Clovy app:

1. **Official Bonzai release:** unchanged production app, identity, data, and
   release process.
2. **Clovy development build:** a separately named and separately identified
   local app bundle built from the working tree.

The two apps may intentionally use the same Bonzai endpoint and key behavior.
Bonzai isolation is not part of this request. The development build only needs
local app isolation so developing a feature cannot overwrite the official app's
SQLite data, settings, or release state.

The first version should be intentionally small:

- separate outer bundle identity and installable app name;
- separate app data and config roots;
- the same Bonzai configuration as the working tree, with no production fallback
  when the development profile is missing its required value;
- updater disabled for the development bundle;
- main-app microphone permission requested for the development identity;
- no new public release channel, updater repository, runtime brand switcher, or
  per-worktree identity system;
- native features whose nested helpers still use official fixed identities are
  disabled in the first bundle unless their identity work is required immediately.

This is enough to let the official Bonzai app remain installed and usable while a
separate development app is built, launched, granted microphone access, and used
to test frontend and main-app changes.

## Product decision

The required outcome is **two installable versions**, not a second public product
or a complete whitelabel system.

Bonzai behavior is intentionally shared. The official and development apps may
call the same Bonzai deployment and use the same Bonzai key. Remote spend or
project attribution is therefore outside this roadmap's isolation promise.

The isolation promise is local:

- the official app keeps its existing state;
- the development app gets a distinct app identity and local state root;
- a development build cannot update itself into the official release;
- macOS permissions are granted to the development identity separately;
- unsupported native helpers fail closed instead of using the official helper.

## Current symptom and root cause

A Tauri-built development app does not receive the microphone or voice-related
permission already listed for the official Clovy app. This is expected when the
apps do not share the same macOS TCC identity.

macOS scopes permissions to the code identity that requests them, not to the
visible product name. The outer app owns its microphone permission. The
nested dictation helper owns dictation microphone and Accessibility permission.
The system-audio helper owns Screen and System Audio Recording permission
(`CONTEXT.md:772-783`). A development app must request permission as its own
identity; copying or resetting the official grant is not the solution.

The current identity overlay is only applied by `scripts/tauri-dev.mjs:146-177`.
`scripts/tauri-build.mjs` does not apply a development identity to an installed
bundle. The development build therefore needs an explicit build profile used by
the terminal build command.

## Roadmap status

**This table is the source of truth for the project's phase status.** Detailed
phase sections repeat the same statuses. Vocabulary: `not started` |
`in progress` | `done` | `blocked` | `deferred`.

| Phase | Status | Exit criterion | Evidence or blocker |
| --- | --- | --- | --- |
| 0: minimal identity contract | **not started** | The development identifier, app name, install location, local roots, updater policy, and first capability list are accepted | Exact values are not yet chosen |
| 1: second installable bundle | **not started** | A terminal build creates an app that installs beside the official Bonzai release without replacing it or sharing local app state | `scripts/tauri-build.mjs` has no development overlay today |
| 2: microphone and safe capability boundary | **not started** | The development app can request its own main-app microphone grant; unsupported fixed-identity helpers are disabled clearly | Nested helper identities are still production-oriented |
| 3: side-by-side verification | **not started** | A clean macOS test proves both apps remain usable and the official app is unaffected | Requires a host with the official Bonzai release installed |
| 4: native parity and distribution | **deferred** | Additional native helpers or a signed development distribution have separate approved scope | Not needed for two local installable apps |

## Goals

- Build a second Clovy app from the working tree with one explicit terminal
  command.
- Install and launch it beside the official Bonzai release.
- Keep the official app's SQLite database, recordings, settings, and release
  preferences untouched by the development app.
- Give the development app its own outer bundle identifier and microphone TCC
  grant.
- Keep Bonzai endpoint and key behavior shared by deliberate choice.
- Disable the development updater completely so it cannot consume official
  release metadata or install an official artifact.
- Keep the official production release configuration and release workflow
  unchanged.

## Non-goals for the first release

- A second public release channel, DMG, updater repository, or signed team-wide
  development distribution.
- Per-worktree app identities or multiple simultaneous development bundles.
- A runtime brand picker or full whitelabel implementation.
- Separate Bonzai endpoints, Bonzai keys, spend scopes, or project attribution.
- Production data import, production-data overrides, or an account migration.
- New Clovy API endpoints, `/v1/*` changes, or a Clovy API deployment.
- Side-by-side support for browser extension registration, autostart, Computer
  use, system-audio capture, or dictation when their helper identity and
  process cleanup remain tied to the official app.
- Changing the official app's `co.opensoftware.june` identity, `June.app` path,
  `os-june` executable, updater configuration, or compatibility aliases.

## Existing architecture and constraints

### Official identity and current development behavior

`src-tauri/tauri.conf.json:2-5` defines the official product and identifier
`co.opensoftware.june`. The macOS overlay keeps compatibility bundle and helper
names in `src-tauri/tauri.macos.conf.json:2-27`.

`scripts/dev-app-identity.mjs:1-20` only adds an issue suffix for
`codex/JUN-NNN` and `claude/JUN-NNN` branches. The generated overlay is applied
by `scripts/tauri-dev.mjs:146-177`, not by `scripts/tauri-build.mjs`. This is
useful precedent but not a second installable release-profile app.

`src-tauri/src/app_paths.rs:63-127` appends `-dev` for debug data and config
paths, while release builds use the configured production path. That means a
release-profile development bundle needs an explicit development flavor or
root. It cannot rely only on `cfg!(debug_assertions)`.

### Bonzai is intentionally shared

The development bundle should use the same Bonzai configuration behavior as the
working tree. No new Bonzai service namespace or spend-isolation contract is
needed for this roadmap.

The build command must still make the selected Bonzai configuration explicit.
`BONZAI_BASE_URL` is resolved from runtime environment before compile-time
configuration (`src-tauri/src/bonzai/config.rs:23-38`). A packaged development
bundle must carry the intended value or fail closed. It must not silently fall
back to the production Clovy API when the development profile is incomplete
(`src-tauri/src/clovy_api.rs:30,4009-4020`). This is a safety check, not Bonzai
behavior isolation.

### Local paths that must be separated

The first implementation should route the development bundle's app-owned state
to its own root. The central paths are in `src-tauri/src/app_paths.rs`, but
several direct config consumers need checking:

- `src-tauri/src/updates.rs:88-93` reads `release-settings.json` directly;
- `src-tauri/src/commands.rs:908-912` reads memory settings;
- `src-tauri/src/dictation.rs:3523-3528` reads dictation settings;
- `src-tauri/src/p3a/mod.rs:527-532` reads telemetry settings;
- `src-tauri/src/computer_use.rs:1214-1220` reads the release grant file.

The frontend data partition is not the installation boundary. The partition key
in `src/lib/data-partition.ts:10-18` is intra-install state, while
`src/lib/storage-compat.ts:22-181` is a Clovy/June browser-storage alias
bridge. Verify that the separate Tauri identity provides separate webview
storage; add an installation prefix only if it does not.

### TCC and native helpers

The development outer bundle must request its own main-app microphone permission.
The official grant must remain intact after the development grant is accepted.

Dictation, system audio, and Computer use are not part of the minimal first
bundle unless their helper contracts are explicitly parameterized:

- system-audio and dictation resources use fixed names in
  `src-tauri/tauri.macos.conf.json:11-18`;
- system-audio cleanup uses install-unscoped process-name cleanup in
  `src-tauri/src/audio/system_macos.rs:465-499`;
- Computer use checks fixed helper and parent identities in
  `src-tauri/src/computer_use_driver.rs:474-550` and expects `os-june` in
  `src-tauri/src/computer_use.rs:1376-1387`;
- installed helper resolution currently checks source-tree `.tauri-helper`
  candidates before packaged resources in
  `src-tauri/src/audio/system_macos.rs:416-440` and
  `src-tauri/src/dictation.rs:3601-3683`.

The simple first bundle should disable these features with an actionable
status. It should not pretend that a distinct outer identifier makes the nested
helpers safe.

### Updater and global registrations

The official updater configuration is in `src-tauri/tauri.conf.json:116-120`.
The updater plugin is registered in `src-tauri/src/lib.rs:141-146`, and the Rust
update commands are in `src-tauri/src/updates.rs:186-216`. The manual update
menu path reaches IPC through `src-tauri/src/lib.rs:160-163`,
`src/app/App.tsx:1032-1043`, and `src/lib/updater.ts:43-50`.

The development bundle must omit or disable the updater plugin, automatic
checks, manual checks, and install commands. Hiding the About button is not
sufficient. The official release workflow remains unchanged.

Deep links, the browser native messaging host, and autostart are also shared or
global registrations today. The minimal development bundle should not register
these features until separate support is approved:

- desktop deep links are registered in `src-tauri/tauri.conf.json:109-113`;
- extension manifests are written to global browser host directories by
  `src-tauri/src/extension_host.rs:912-923,996-1024`;
- autostart uses `.app_name("June")` and the macOS LaunchAgent
  `~/Library/LaunchAgents/June.plist` in `src-tauri/src/lib.rs:150-159`.

## First-version experience

1. Run the new development build command from the working tree.
2. The command applies a development Tauri overlay and builds a local app
   bundle with a distinct app name and bundle identifier.
3. Install or launch that app beside the official Bonzai release.
4. The development app uses the same Bonzai configuration behavior as the
   working tree and its own local app/config root.
5. The development app requests microphone permission as its own identity.
6. The About section shows that this is the development build, using the
   existing metadata pattern in `src/components/settings/AppSettings.tsx:2401-2455`.
7. Updater, extension, autostart, Computer use, system audio, and dictation
   are unavailable unless separately enabled by a later phase.

## Safety invariants

- Production `co.opensoftware.june`, `June.app`, `os-june`, production data, and
  production release configuration remain unchanged.
- The development bundle has a distinct stable identity and install location.
- Development SQLite/config/settings paths are distinct from the official app.
- Bonzai endpoint and key sharing is intentional and not represented as local
  isolation.
- The development build cannot fetch or install official updates.
- The development main app receives and stores its own microphone grant.
- A disabled native feature fails closed and does not launch an official helper.
- Missing development profile configuration fails closed instead of contacting
  the production Clovy API.
- Removing or rebuilding the development app cannot remove official state or
  reset official TCC grants.

## Implementation phases

### Phase 0: minimal identity contract

**Status: not started.**

Choose and document only:

- fixed development bundle identifier and visible app name;
- stable local install/output location;
- development app/config root derivation;
- exact Bonzai profile value required at launch;
- updater-disabled mechanism;
- first capability list: main-app microphone enabled, fixed-identity helpers
  disabled unless explicitly parameterized.

**Exit criterion:** those values are accepted and an implementation issue is
linked. No second updater channel, Bonzai namespace, or whitelabel decision is
needed.

### Phase 1: second installable bundle

**Status: not started.**

Add an explicit development profile to the build path, likely around
`scripts/tauri-build.mjs` and an additive Tauri config overlay. Route app-owned
paths and direct config consumers to the development root. Keep the official
Tauri config unchanged for normal release builds.

The build must work without depending on the current branch name and must not
apply the development overlay to RC or stable production workflows.

**Exit criterion:** the terminal command creates an installable development app
that can launch while the official Bonzai release remains installed and usable.
Sentinel notes and settings created in each app remain invisible to the other.

### Phase 2: microphone and safe capability boundary

**Status: not started.**

Ensure the outer development bundle requests its own microphone permission and
that accepting it does not remove or overwrite the official grant. Add the
About build indicator and clear unavailable states for disabled native features.

**Exit criterion:** the development app can record through its main-app
microphone path after a new TCC prompt, while the official app still records
normally. Disabled helper features never launch the official helper.

### Phase 3: side-by-side verification and handoff

**Status: not started.**

Document the build command, install location, first launch, permission prompts,
Bonzai configuration requirement, disabled capabilities, cleanup, and how to
return to the official app. Validate on a macOS account with the official
Bonzai release installed:

1. create a sentinel note/settings value in the official app;
2. build and launch the development app without uninstalling the official one;
3. grant the development app microphone access;
4. create a different sentinel note/settings value;
5. confirm each app sees only its own local state;
6. confirm the official app remains usable and its permission remains granted;
7. confirm no updater, extension, autostart, or disabled helper path affects the
   official app;
8. remove the development app and confirm official state remains intact.

**Exit criterion:** a developer can build, use, and remove the second app without
impacting the official Bonzai release.

### Phase 4: native parity and distribution

**Status: deferred.**

Parameterize and test dictation, system audio, Computer use, browser extension,
autostart, and deep links only when a concrete need justifies the extra scope.
A signed development DMG or hosted updater also requires a separate release
proposal. None is needed for the two local installable versions.

## Verification strategy

### Deterministic checks

- Production builds use the existing Tauri identity and configuration.
- The development overlay produces the accepted app name, bundle identifier,
  resource map, separate root, and updater-disabled state.
- The development profile fails closed when its required Bonzai value is absent.
- Official and development data/config paths differ.
- Official and development webview storage are separate, or the implementation
  adds an explicit installation prefix.
- No development build path reads or writes official release settings.

### macOS packaging and TCC checks

- Inspect the outer development bundle identifier and executable metadata.
- Confirm the official app remains registered under `co.opensoftware.june`.
- Trigger the development app's main-app microphone prompt and accept it.
- Confirm the official app's microphone grant remains present and functional.
- Confirm disabled nested helpers are not launched.
- Confirm source-tree helper bundles are not used by the installed development
  app.

### Release-process checks

- Normal production `tauri build`, RC, and stable workflows produce no development
  overlay or development identity.
- The development bundle produces no official updater artifact and makes no
  official update request.
- No production release repository, signing key, or release workflow changes are
  required for the local-only development bundle.

## Open questions and decision gates

1. What fixed development bundle identifier and visible app name should be used?
   A single stable identity is recommended. Per-worktree identities are out of
   scope.
2. Where should the local development app be installed or copied for repeatable
   use?
3. Is main-app microphone support sufficient for the first version? The
   recommendation is yes. Dictation and other nested-helper features remain
   deferred unless they become an immediate requirement.
4. Which exact build-time mechanism disables the updater plugin and commands?

These decisions are small enough for one implementation issue. No Bonzai
behavior decision is required.

## Explicit follow-ups

- Add safe identity-aware dictation and system-audio helpers if development work
  needs those capabilities.
- Parameterize Computer use helper and parent identities if it must run in the
  development app.
- Add isolated browser extension and autostart registration only with explicit
  ownership tests.
- Add a signed development distribution only if local bundles become
  impractical.

## Decision summary

Implement the smallest useful solution: one explicit development build profile
that produces a second installable Clovy app beside the official Bonzai release.
Give it a distinct app identity, separate local app/config state, its own main-app
microphone permission, shared Bonzai behavior, and no updater. Leave nested
helper parity, extension, autostart, Computer use, and public distribution out
of the first version. Keep the official Bonzai release configuration and release
process unchanged.
