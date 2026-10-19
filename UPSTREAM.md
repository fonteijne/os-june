# Upstream tracking and the fork ledger

This fork (`fonteijne/os-june`) is downstream of
[`open-software-network/os-clovy`](https://github.com/open-software-network/os-clovy).
It routes all AI inference through **Bonzai**, our own LiteLLM deployment
(see [docs/bonzai-model-routing-prd.md](docs/bonzai-model-routing-prd.md)).

Staying mergeable with upstream is a load-bearing requirement, not a
preference: Clovy ships and auto-updates continuously, and a fork that cannot
merge upstream is a fork that stops receiving fixes. This file is the
operational half of
[ADR-0058](docs/adr/0058-bonzai-routing-lives-in-an-additive-provider-layer.md).

## Branch topology

```
open-software-network/os-clovy : main
                 |
                 |  (1) sync: fast-forward or merge
                 v
fonteijne/os-june : main            <- mirrors upstream, no Bonzai code
                 |
                 |  (2) integrate: merge main -> bonzai-main
                 v
fonteijne/os-june : bonzai-main     <- the working trunk for this fork
                 ^
                 |  (3) PR
        feature branches
```

| Branch | Role | Rule |
| --- | --- | --- |
| `upstream/main` | Clovy's trunk | Read-only. Never pushed to. |
| `main` | Upstream mirror | **No Bonzai code.** Only upstream commits plus pre-existing fork docs. |
| `bonzai-main` | This fork's trunk | Every Bonzai change lands here. `main` merges **into** it, never the reverse. |
| `<topic>` branches | Work in progress | Branch from `bonzai-main`, PR back into `bonzai-main`. |

**Never merge `bonzai-main` into `main`.** That would put Bonzai code on the
mirror and destroy the whole point of the split: `main` must stay a clean
comparison point against upstream, so that a conflict during step (1) is
always upstream's doing and a conflict during step (2) is always ours.

At the time of writing, `main` is upstream plus one docs-only commit
(`4f352dd docs: propose whitelabel enablement plan (#1)`), and upstream has
nothing `main` lacks.

## Remotes

The `upstream` remote is not created by `git clone`. Add it once per checkout:

```sh
git remote add upstream https://github.com/open-software-network/os-clovy
git fetch upstream main
```

The repository is public, so no credentials are needed. GitHub's own "Sync
fork" button works only while the merge stays trivial; once `main` and
upstream diverge it hands you back to the CLI, and the conflict canary cannot
use it at all. Hence a real remote.

## Sync runbook

Run this whenever upstream cuts a release, or when the canary reports a
conflict.

```sh
# (1) Bring upstream into the mirror.
git fetch upstream main
git checkout main
git merge --ff-only upstream/main   # should fast-forward; if it refuses, see below
git push origin main

# (2) Integrate the mirror into the Bonzai trunk.
git checkout bonzai-main
git merge main                      # resolve conflicts here, never on main
```

If step (1) refuses to fast-forward, something landed on `main` that is not
upstream's. Move it to `bonzai-main` rather than merging it forward.

Resolve step (2) conflicts by these rules:

- **Never rewrite history on a shared branch.** No rebase, amend, or
  force-push on `main` or `bonzai-main`. A merge commit keeps everyone's
  checkout valid.
- **Regenerate lockfiles and generated files with the repo's tooling**, never
  by hand.
- If both sides changed the same logic and picking either loses behavior,
  stop and ask rather than guessing.

Then run the post-merge checklist below before pushing.

## Post-merge checklist

After every `main` -> `bonzai-main` merge:

- [ ] `pnpm check` and `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm test:rust` and `pnpm test:clovy-api`
- [ ] `make verify` (adds `cargo clippy --all-targets`, which the narrower
      targets skip - green from `cargo test` + `pnpm test` alone is **not**
      CI-green)
- [ ] **The egress guard** - `cargo test --manifest-path src-tauri/Cargo.toml
      --test bonzai_egress_guard`. The guarantee in
      [ADR-0059](docs/adr/0059-bonzai-egress-is-enforced-by-a-build-time-allowlist.md)
      (superseding ADR-0057) is exactly what an upstream merge can silently
      reopen, so this is the check that matters most here. A failure names the
      file and line of the new client; route it through
      `crate::bonzai::egress::guarded_builder()` or `guarded_client()` and
      decide what it is for. Never add an exemption
- [ ] The ledger below still matches reality; update it in the same commit if
      a prologue moved
- [ ] A red gate that is not your bug: check
      [TROUBLESHOOTING.md](TROUBLESHOOTING.md) before chasing it (Node 26
      storage tests, vitest teardown exit codes, ProseMirror flake, and
      pnpm's non-TTY purge prompt are documented false alarms)

## The fork ledger

### Explicit exception: Bonzai Agent renderer styling

This work exceeds ADR-0060's four shared-file edit shapes and 150-counted-line
ceiling under the user's explicit exception. It is a deliberate policy exception,
not compliant with ADR-0060. It includes changes to `src-tauri/tauri.conf.json`
(window `title` fields and the CSP hash for the changed first-paint script),
`src-tauri/src/lib.rs` (displayed macOS app-menu and About/Hide/Quit labels), and
`src-tauri/src/menu_bar.rs` (displayed tray/menu copy). These are presentation
labels and the required script-policy hash refresh; `pkg_info.productName`,
bundle identifiers, Dock/Cmd-Tab identity, TCC names, helper names, and the
binary name remain unchanged and outside this exception. Static native icon
assets and path-drawn logo/wordmark artwork are unchanged.

The renderer exception has its own shared-path ledger below, separate from the
prior Bonzai-routing ledger. After the coordinator's final orange-recording and
documentation edits settled, this inventory was recomputed against
`origin/bonzai-main` at `18e2d64f`. Each table row uses the changed-block method:
sum the `max(added lines, deleted lines)` for each changed hunk from
`git diff --unified=0 origin/bonzai-main`. Raw addition/deletion and path-level
max totals below are separately reported from `git diff --numstat`; they are
not the table row-count method. All changed paths, including tests and docs/spec,
are listed in the appropriate table below. The explicit user exception does not
amend ADR-0060 or make this work compliant. A future formal policy reconciliation
is still a merge blocker; do not merge until it is resolved and accepted.

**Exact audit totals, excluding this accounting file's self-diff:** 161 existing
shared paths; `git diff --numstat` reports 1,776 added and 1,865 deleted lines.
An independent final validator compared every source path and per-file changed-hunk
maximum to the table: 161 rows, with no missing, extra, duplicate, or mismatched
entries.
The sum of path-level `max(added lines, deleted lines)` is 2,248. Changed-block
per-hunk maxima, which are the table's counted-line convention, total 2,348
(implementation/config/renderer 1,514; tests 480; docs/spec 354). For the separate
path-level max comparison, the groups are: 121 implementation/config/renderer
paths = 1,464 counted lines (1,032 added, 1,246 deleted); 30 existing test paths =
460 (460 added, 318 deleted); and 10 existing documentation/spec paths = 324
(284 added, 301 deleted). The final raw per-file numstat for late runtime identity,
model-fed copy, and presentation rows is:
`agent-runtime/src/bonzai.ts` +1/-1, `agent-runtime/src/compaction.ts` +1/-1,
`agent-runtime/src/identity.ts` +10/-3, `agent-runtime/src/main.ts` +2/-2,
`agent-runtime/src/rpc-model-provider.ts` +7/-7, `agent-runtime/src/sdk-engine.ts` +6/-6,
`agent-runtime/src/types.ts` +1/-1,
`agent-runtime/test/sdk-tool-loop.test.ts` +87/-58,
`agent-runtime/test/service.test.ts` +2/-2,
`src-tauri/resources/agent-skills/clovy-obsidian/SKILL.md` +4/-4,
`src-tauri/src/agent_runtime/api.rs` +50/-47, `src-tauri/src/routines.rs` +30/-7,
`src/test/onboarding.test.tsx` +34/-25,
`docs/roadmap/rebrand-to-bonzai/plan.md` +142/-178,
`docs/design/conventions.md` +18/-21, `docs/design/foundations.md` +46/-39,
`docs/design/taste.md` +16/-16, `src/components/settings/AppSettings.tsx` +29/-60,
`src/components/routines/routine-templates.ts` +1/-1, and
`src/components/onboarding/OnboardingCharacter.tsx` +3/-3. Their corresponding
changed-block per-hunk maxima are 1, 1, 10, 2, 7, 6, 1, 102, 2, 4, 51, 30, 34,
206, 22, 47, 16, 60, 1, and 3, respectively. Pure-deletion or zero-addition paths
are also included in the implementation table: `src/agent-hud.ts` 4,
`src/hud.ts` 4, deleted `src/lib/brand.ts` 164, `src/main.tsx` 2, and
`src/styleguide/sections/SelectionControls.tsx` 22 changed-block maxima. The
1,514-line implementation/config/renderer count under the table method exceeds
ADR-0060's 150-line ceiling by 1,364 lines. These totals exclude new additive
files and the separate prior Bonzai-routing inventory. The full tracked diff has
162 paths including `UPSTREAM.md`; its self-diff is maintained separately and is
not counted recursively in the visual total.

The per-path tables distinguish descriptive edit shapes; none claims to be one
of ADR-0060's four permitted source-edit shapes. **C** visible copy or
presentation-label substitution; **P** palette/token/style-role rewrite; **F**
font-family and local-face wiring; **A** appearance/runtime behavior such as
removing selectable accents or stopping live native-icon sync; **I** assistant
identity prompt/parser behavior; **N** native-icon compatibility generator
refactor; **S** styleguide surface; **B** pre-paint/window configuration; **M**
comment-only change; **X** test/fixture/expectation update; **D** documentation or
spec prose. Combined codes mean the path has multiple descriptive shapes; they
are not ADR-0060's accepted P/S/F/W shape labels.

**Workflow status:** OS Platform synchronization was skipped under the user's
explicit exception. No Issue status, memory, or post update is claimed here.

**Extension token status:** `extension/src/tokens.css` now carries the local
Manrope face, the same font stack, and the Bonzai light token values mirrored
from `src/styles/tokens.css`. This source inspection does not claim that the Rust
parity test was run or passed.

#### Bonzai Agent renderer-styling ledger (final frozen diff)

Implementation/config/renderer paths are counted against the 150-line source
ceiling; tests and docs are included in their own exact inventories below, as in
the prior ledger's source-versus-test reporting. Each row sums the
`max(added lines, deleted lines)` for every changed hunk, including comment
changes such as the Home character comment in `src/styles/app.css`. The separate
2,248 count is the sum of path-level maxima from `git diff --numstat`; it is not
the row-sum convention. This work is explicitly outside the accepted shape rule
and ceiling; no entry below should be labeled compliant. **The 1,514-line
implementation/config/renderer total is non-compliant and exceeds that ceiling;
formal policy reconciliation and acceptance remain a merge blocker.**

| Shared path | Counted lines | Shape |
| --- | ---: | --- |
| `agent-hud.html` | 1 | C |
| `extension/src/tokens.css` | 22 | P, F |
| `hud.html` | 1 | C |
| `index.html` | 49 | B, A, C |
| `meeting-hud.html` | 2 | C |
| `scripts/generate-icons.mjs` | 65 | N |
| `src-tauri/native/mac-dictation-helper/main.swift` | 2 | C |
| `src-tauri/native/windows-dictation-helper/src/main.rs` | 9 | C |
| `src-tauri/src/agent_runtime/api.rs` | 51 | C, I |
| `src-tauri/src/agent_runtime/host.rs` | 4 | C |
| `src-tauri/src/agent_runtime/persona.rs` | 13 | C |
| `agent-runtime/src/bonzai.ts` | 1 | C |
| `agent-runtime/src/compaction.ts` | 1 | C |
| `agent-runtime/src/identity.ts` | 10 | C, I |
| `agent-runtime/src/main.ts` | 2 | C |
| `agent-runtime/src/rpc-model-provider.ts` | 7 | C |
| `agent-runtime/src/sdk-engine.ts` | 6 | C, I |
| `agent-runtime/src/types.ts` | 1 | C |
| `src-tauri/resources/agent-skills/clovy-obsidian/SKILL.md` | 4 | C |
| `src-tauri/src/bonzai/audio.rs` | 1 | C |
| `src-tauri/src/bonzai/chat.rs` | 1 | C |
| `src-tauri/src/bonzai/models.rs` | 1 | C |
| `src-tauri/src/clovy_api.rs` | 77 | C, I |
| `src-tauri/src/computer_use.rs` | 21 | C |
| `src-tauri/src/dictation.rs` | 8 | C |
| `src-tauri/src/lib.rs` | 5 | C |
| `src-tauri/src/menu_bar.rs` | 22 | C |
| `src-tauri/src/routines.rs` | 30 | C, I |
| `src-tauri/src/shutdown.rs` | 2 | C |
| `src-tauri/src/theme_icon.rs` | 5 | M |
| `src-tauri/tauri.conf.json` | 5 | B, C |
| `src/agent-hud.ts` | 4 | A |
| `src/main.tsx` | 2 | A |
| `src/app/app-account-gates.tsx` | 2 | C |
| `src/app/app-effects/update-ui.tsx` | 1 | C |
| `src/app/app-layout.tsx` | 3 | C |
| `src/app/update-decision.ts` | 1 | C |
| `src/app/use-dictation-events.ts` | 1 | C |
| `src/app/use-recording-controls.ts` | 1 | C |
| `src/app/workspace-lazy.tsx` | 1 | C |
| `src/components/account/AccountGate.tsx` | 2 | C |
| `src/components/account/AccountSettings.tsx` | 2 | C |
| `src/components/account/FundingNotice.tsx` | 4 | C |
| `src/components/agent/AgentSessionsList.tsx` | 2 | C |
| `src/components/agent/AgentThinking.tsx` | 1 | C |
| `src/components/agent/AgentWorkspace.tsx` | 9 | C |
| `src/components/agent/ComputerUseApprovalsTray.tsx` | 3 | C |
| `src/components/agent/ReportDialog.tsx` | 1 | C |
| `src/components/agent/agent-workspace-config.tsx` | 7 | C |
| `src/components/agent/chat-turns/AgentActionCards.tsx` | 10 | C |
| `src/components/agent/chat-turns/AgentChatTurnRow.tsx` | 2 | C |
| `src/components/agent/chat-turns/RunNotices.tsx` | 2 | C |
| `src/components/agent/chat-turns/ThinkingAndTools.tsx` | 1 | C |
| `src/components/agent/chat-turns/TurnPresentation.tsx` | 1 | C |
| `src/components/agent/composer/ComposerEditor.tsx` | 1 | C |
| `src/components/agent/composer/ModelPicker.tsx` | 11 | C |
| `src/components/agent/composer/reportCategory.ts` | 2 | C |
| `src/components/brand/ClovyLogo.tsx` | 2 | C |
| `src/components/folders/FoldersWorkspace.tsx` | 1 | C |
| `src/components/folders/ImportClaudeProjectsDialog.tsx` | 2 | C |
| `src/components/folders/ProjectSettingsDialog.tsx` | 2 | C |
| `src/components/note-chat/NoteChatPanel.tsx` | 7 | C |
| `src/components/note-editor/NoteFailureBanner.tsx` | 1 | C |
| `src/components/note-editor/NoteHeaderActions.tsx` | 5 | C |
| `src/components/notes-list/NotesList.tsx` | 1 | C |
| `src/components/onboarding/OnboardingCharacter.tsx` | 3 | P |
| `src/components/onboarding/steps/AreaStep.tsx` | 1 | C |
| `src/components/onboarding/steps/MoodStep.tsx` | 1 | C |
| `src/components/onboarding/steps/PermissionSteps.tsx` | 14 | C |
| `src/components/onboarding/steps/SignInStep.tsx` | 3 | C |
| `src/components/onboarding/steps/TelemetryConsentStep.tsx` | 1 | C |
| `src/components/plugins/ComputerUseControl.tsx` | 6 | C |
| `src/components/routines/RoutineDetail.tsx` | 2 | C |
| `src/components/routines/RoutineModePicker.tsx` | 1 | C |
| `src/components/routines/RoutinesView.tsx` | 10 | C |
| `src/components/routines/routine-templates.ts` | 1 | C |
| `src/components/settings/AgentMcpServersSection.tsx` | 3 | C |
| `src/components/settings/AgentSettingsSection.tsx` | 4 | C |
| `src/components/settings/AppSettings.tsx` | 60 | A, C |
| `src/components/settings/ClovyPersonalitySettingsSection.tsx` | 8 | C |
| `src/components/settings/ConnectorsSection.tsx` | 10 | C |
| `src/components/settings/DictionarySettingsSection.tsx` | 1 | C |
| `src/components/settings/LinkedDevicesSection.tsx` | 5 | C |
| `src/components/settings/MemorySettingsSection.tsx` | 14 | C |
| `src/components/settings/ModelPickerPopover.tsx` | 2 | C |
| `src/components/settings/PrivacySettingsSection.tsx` | 2 | C |
| `src/components/settings/ProviderLogo.tsx` | 1 | C |
| `src/components/share/ShareDialog.tsx` | 3 | C |
| `src/components/sidebar/Sidebar.tsx` | 3 | C |
| `src/components/ui/Toaster.tsx` | 1 | C |
| `src/hud.ts` | 4 | A |
| `src/lib/agent-chat-gallery.ts` | 1 | C |
| `src/lib/agent-file-drop.ts` | 1 | C |
| `src/lib/agent-hud-demo.ts` | 1 | C |
| `src/lib/agent-notifications.ts` | 5 | C |
| `src/lib/agent-routines.ts` | 1 | C |
| `src/lib/brand.ts` | 164 | A |
| `src/lib/chat-image-generation.ts` | 3 | C |
| `src/lib/connectors.ts` | 6 | C |
| `src/lib/errors.ts` | 1 | C |
| `src/lib/model-privacy.ts` | 1 | C |
| `src/lib/recording-notifications.ts` | 3 | C |
| `src/lib/toast-demo.ts` | 1 | C |
| `src/meeting-hud.ts` | 10 | A, C |
| `src/model-picker-preview.tsx` | 1 | C |
| `src/styleguide/StyleguideApp.tsx` | 40 | S, A |
| `src/styleguide/main.tsx` | 4 | S, A |
| `src/styleguide/sections/Color.tsx` | 32 | S, P |
| `src/styleguide/sections/FeedbackIndicators.tsx` | 5 | S, C |
| `src/styleguide/sections/SelectionControls.tsx` | 22 | S, A |
| `src/styleguide/sections/SettingsPattern.tsx` | 2 | S, C |
| `src/styleguide/sections/Type.tsx` | 5 | S, C |
| `src/styleguide/styleguide.css` | 28 | S, P |
| `src/styleguide/tokens-catalog.ts` | 1 | S |
| `src/styles/agent-hud.css` | 43 | P |
| `src/styles/app.css` | 65 | P, M |
| `src/styles/fonts.css` | 17 | F |
| `src/styles/hud.css` | 54 | P |
| `src/styles/meeting-hud.css` | 56 | P |
| `src/styles/tokens.css` | 211 | P, F |
| `styleguide.html` | 39 | S, A |

#### Existing test paths (tracked; counted separately)

| Shared test path | Counted lines | Shape |
| --- | ---: | --- |
| `agent-runtime/test/service.test.ts` | 2 | X, I |
| `agent-runtime/test/sdk-tool-loop.test.ts` | 102 | X, I |
| `src/test/agent-chat-turn-row.test.tsx` | 2 | X |
| `src/test/agent-hud.test.ts` | 5 | X |
| `src/test/agent-note-entry-points.test.ts` | 8 | X |
| `src/test/agent-notifications.test.ts` | 15 | X |
| `src/test/agent-thinking.test.tsx` | 1 | X |
| `src/test/agent-workspace-runtime.test.tsx` | 131 | X |
| `src/test/app-shortcut.test.tsx` | 18 | X |
| `src/test/chat-image-generation.test.ts` | 1 | X |
| `src/test/composer-editor-change-publishing.test.tsx` | 4 | X |
| `src/test/composer-editor-lifecycle.test.tsx` | 2 | X |
| `src/test/composer-editor-slash-menu.test.tsx` | 4 | X |
| `src/test/computer-use-approvals-tray.test.tsx` | 9 | X |
| `src/test/computer-use-control.test.tsx` | 2 | X |
| `src/test/connectors-section.test.tsx` | 11 | X |
| `src/test/connectors.test.ts` | 1 | X |
| `src/test/folders.test.tsx` | 1 | X |
| `src/test/funding-notice.test.tsx` | 5 | X |
| `src/test/home-polish-css.test.ts` | 47 | X, P |
| `src/test/hud-css.test.ts` | 20 | X, P |
| `src/test/hud-listener-lifecycle.test.ts` | 3 | X, A |
| `src/test/memory-settings-section.test.tsx` | 8 | X |
| `src/test/menu-bar.test.ts` | 2 | X |
| `src/test/note-pdf.test.ts` | 2 | X |
| `src/test/onboarding.test.tsx` | 34 | X |
| `src/test/provider-logo.test.tsx` | 10 | X |
| `src/test/report-dialog.test.tsx` | 1 | X |
| `src/test/routines-view.test.tsx` | 27 | X |
| `src/test/share-dialog.test.tsx` | 2 | X |

#### Existing documentation and spec paths (tracked; counted separately)

| Shared path | Counted lines | Shape |
| --- | ---: | --- |
| `CONTEXT.md` | 33 | D |
| `docs/design/conventions.md` | 22 | D |
| `docs/design/foundations.md` | 47 | D |
| `docs/design/taste.md` | 16 | D |
| `docs/index.md` | 4 | D |
| `docs/roadmap/README.md` | 1 | D |
| `docs/roadmap/rebrand-to-bonzai/plan.md` | 206 | D |
| `spec/font-families.md` | 10 | D |
| `spec/font-weights.md` | 4 | D |
| `src-tauri/icons/README.md` | 11 | D |

These test and prose/spec counts are not merged into the 1,514-line
implementation/config/renderer total; the full shared-path inventory is 2,348
counted lines under the changed-block per-hunk method.
The proposed ADR-0055 addendum remains proposed, not accepted. The user-approved
implementation exception is not a replacement for the future formal policy
reconciliation, which remains a merge blocker.

#### Appended blocks in existing shared files

No new end-of-file append-only symbol blocks were found in the frozen 157-path
shared diff. New font-face/token and identity/test hunks are inserted inside existing
CSS, Rust, TypeScript, HTML, or test blocks and remain counted in their rows.
New standalone files and binary/license assets are listed separately below.

**Known lint blocker (pre-existing, unrelated to this renderer work):**
The coordinator reports `tauri-lint` is blocked by
`src-tauri/src/bonzai/audio.rs:84`, where `.is_none_or()` requires Rust 1.82
while the crate declares MSRV 1.80.0. The call is present in
`origin/bonzai-main` and unchanged by this renderer-styling work. Track any MSRV
or call-site fix separately; do not attribute this lint blocker to the menu or
renderer changes.

The original Bonzai-routing table below is preserved as its own historical
inventory. It does not include renderer-styling exception counts, fork-feature
deltas, or the separate documentation reconciliation. The final visual ledger
above is separate and does not change the prior routing totals.

**Budget: every shared-file edit is one of four shapes, under a ceiling of
150 counted lines** (ADR-0060, superseding ADR-0058's 40-line clause). The shape rule is
the invariant; the ceiling exists to make growth visible. A fifth shape, or
growth past the ceiling, requires a superseding ADR.

Two kinds of change carry very different merge risk, so they are counted
separately:

- **Edits inside an existing function or block** - real conflict risk, since
  upstream edits the same region. These count against the 150-line ceiling.
- **A new symbol appended to a shared file** - merges cleanly at a distinct
  location. Tracked in the table, not counted.

### Fork features outside the Bonzai ledger

Not every fork change is a Bonzai guard. **Bring-your-own transcription**
([ADR-0061](docs/adr/0061-local-byoi-transcription-reuses-provider-local.md))
is a feature written in upstream's own idiom, mirroring local generation and
depending on nothing in `bonzai/`; it is a candidate to upstream, and its
edits are tracked here rather than counted against the Bonzai ceiling:
`src-tauri/src/providers/mod.rs` (settings, sanitize guard, commands),
`src-tauri/src/clovy_api.rs` (local dispatch and request),
`src-tauri/src/domain/processing.rs` (cleanup skip, one condition),
`src-tauri/src/lib.rs` (three command registrations), `src/lib/tauri.ts`,
`src/components/settings/AppSettings.tsx` (both local endpoints now share
`LocalEndpointSettings.tsx`), and `src/lib/local-generation.ts` (option-id
and loopback helpers hoisted into `src/lib/local-endpoint.ts`). Expect
conflicts in these regions when upstream touches local generation; resolve
towards upstream's shape and re-apply the transcription twin.

**Global external MCP for routines**
([plan](docs/roadmap/mcp-original-integration/plan.md),
[implementation log](docs/roadmap/mcp-original-integration/implementation-log.md))
is a deliberate behavior divergence, not a Bonzai guard: a routine receives
every globally enabled external MCP server, exactly as an ordinary run does,
instead of only the servers whose display name appears in its saved
toolsets. The managed Linear identities (`june_linear`,
`june_linear_actions`) and the MCP run-policy snapshot keep upstream's
behavior. Edits: `src-tauri/src/routines.rs` (`routine_mcp_descriptors`
appended; `unattended_tools` appends its result; `routine_mcp_server_enabled`
and `routine_mcp_server_allowed_for_session` lose their `server_name`
parameter and admit every custom server) and
`src-tauri/src/agent_runtime/tools.rs` (one argument removed from the
routine MCP gate call). Expect conflicts when upstream touches routine MCP
filtering; keep upstream's managed Linear and snapshot logic and re-apply
the custom-server pass-through.

### Shared files (merge risk)

Every edit below is one of the four shapes ADR-0060 permits: **P** a one- or
three-line prologue at the top of an existing function, **S** a one-token
substitution, **F** a one-token constant flip, **W** a JSX wrap behind a flag.
Counts for this prior Bonzai-routing inventory are `git diff` added-or-changed
lines against `origin/bonzai-main`, with re-indented lines under a wrap counted
(the pessimistic reading). They do not include the current renderer-styling
exception, whose exact frozen-diff ledger appears in the section above.

| File | Lines | Shape | What | Why here and not in `bonzai/` |
| --- | ---: | :-: | --- | --- |
| `src-tauri/src/clovy_api.rs` | 23 | S, P | Phase 1: 7 client-constructor substitutions. Phase 2: prologues in `generate_note_from_transcript` and `proxy_agent_chat_completions`. Phase 3: prologue in `transcribe_saved_audio`. Phase 5: `refuse_clovy_api` in `authed_send`, `send_multipart`, `list_models`, `fetch_browser_transport_policy`, `computer_use_rollout`; `refuse_dictation` in `dictate_transcribe`, `cleanup_text` | The functions upstream dispatches through are the only place a prologue can intercept |
| `src-tauri/src/os_accounts.rs` | 8 | S, P | Phase 1: 2 substitutions. Phase 5: prologues in `local_dev_enabled` (covers all 17 OS Accounts short-circuits) and `local_dev_account_status` | One prologue in the predicate every short-circuit consults |
| `src-tauri/src/agent_mcp.rs` | 5 | S | Phase 1: 5 substitutions. Phase 6's `mcp_policy::check` prologues were removed when external MCP returned to the shared contract (ADR-0059 addendum of 2026-10-02) | - |
| `src-tauri/src/providers/mod.rs` | 6 | S, P | Phase 1: 3 substitutions. Phase 2: prologue in `list_venice_models` | The picker's command is upstream's; Bonzai serves its shape |
| `src-tauri/src/dictation.rs` | 5 | P | Phase 5: `refuse_dictation` in `spawn_helper` and `dictation_helper_command`; early return in `retry_helper_spawn` | The helper is spawned, retried, and driven from three functions |
| `src-tauri/src/lib.rs` | 3 | P | Phase 1: `bonzai::setup(app)` first in the setup hook (2). Phase 2: one command registration (1) | Startup order and the command list live only here |
| `src-tauri/src/p3a/mod.rs` | 3 | P | Phase 5: `record_question` returns early | The single recording entry point |
| `src-tauri/src/connectors/oauth.rs` | 2 | S | Phase 1 | - |
| `src-tauri/src/agent_runtime/api.rs` | 1 | P | Phase 5: `strip_disabled_tools` after the descriptor list | Where the advertised list is built |
| `src-tauri/src/agent_runtime/tools.rs` | 1 | P | Phase 5: `refuse_disabled_tool` at the top of `dispatch_tool` | The single dispatch |
| `src-tauri/src/agent_runtime/host.rs` | 1 | P | Phase 4: `tag_agent_request` stamps the session id | The only place the session id and the request body meet |
| `src-tauri/src/feature_flags.rs` | 1 | F | Phase 5: `VIDEO_GENERATION_ENABLED` off | Upstream's own kill switch |
| `src-tauri/src/connectors/notion.rs` | 1 | S | Phase 1 | - |
| `src-tauri/src/companion/mod.rs` | 1 | S | Phase 1 | - |
| `src-tauri/src/video_download_url.rs` | 1 | S | Phase 1 | - |
| `src/components/sidebar/Sidebar.tsx` | 29 | W | Phase 5: dictation nav button wrapped (13), palette entry wrapped (11), `HIDDEN_SETTINGS_TABS` gains `dictation` (3), import (1). Upstream keeps no flag for dictation, so a wrap is the only shape available | The nav, palette, and tab list are upstream's |
| `src/components/settings/AppSettings.tsx` | 5 | P, W | Phase 2: import and mount of the Bonzai section (2). Phase 5: hook, import, and the issue-report row gated (3) | The Models tab and the report row are upstream's |
| `src/components/settings/PrivacySettingsSection.tsx` | 4 | P | Phase 5: returns null on a Bonzai build | The telemetry section is upstream's |
| `src/components/folders/ProjectSettingsDialog.tsx` | 2 | P | Phase 4: import and mount of the project key field | Beside instructions, per the PRD |
| `src/components/folders/FoldersWorkspace.tsx` | 5 | P, S | Phase 4: import and mount of the key badge (2). Beta feedback: the create dialog's `onCreate` returns the folder (3, a reflowed one-token change) | The project card and the create dialog's mount are upstream's |
| `src/components/folders/CreateFolderDialog.tsx` | 7 | P | Beta feedback: `useBonzaiCreateKey` hook, reset, probe before create, attach after, field mounted, import | Creating a project is upstream's dialog; the key must be known before the project exists |
| `src/lib/agent-runtime-adapter.ts` | 5 | P | Beta feedback: `bonzaiNoticePart` returns a Bonzai refusal as its own notice (4), import (1) | Where a failed run becomes a chat part |
| `src/components/agent/chat-turns/RunNotices.tsx` | 4 | P, S | Beta feedback: `text` prop (3), shown for the `bonzai` kind (1) | The failure notice is upstream's component |
| `src/components/agent/chat-turns/AgentChatTurnRow.tsx` | 3 | P | Beta feedback: the `bonzai` kind routed to the notice with its text | Upstream's part dispatch |
| `agent-runtime/src/sanitize.ts` | 3 | P | Beta feedback: `bonzaiFailure` prologue in `runtimeFailureDetails` keeps a Bonzai `AppError` code out of the "runtime" fallback | The one classifier every failed run passes through |
| `src/lib/agent-chat-runtime.ts` | 1 | S | Beta feedback: `bonzai` added to the notice kind union | The part type is upstream's |
| `src/components/folders/EditFolderDialog.tsx` | 2 | P | Beta feedback: import and mount of the project key field, as in the settings dialog | The edit dialog is upstream's |
| `src-tauri/Cargo.toml` | 1 | P | Beta feedback: `tracing-subscriber`, for the stderr subscriber `bonzai/logging.rs` installs (upstream emits `tracing` events and never subscribes to them) | The dependency list is upstream's |
| `src/lib/feature-flags.ts` | 2 | F | Phase 5: `IMAGE_GENERATION_ENABLED`, `VIDEO_GENERATION_ENABLED` off | Upstream's own kill switches |
| `src/test/app-notes-reliability.test.tsx` | 6 | P | Phase 5: `feature-flags` mocked with dictation on, following the slash-command test's convention | Upstream tests click the dictation entry this fork hides |
| `src/test/folders-workspace.test.tsx` | 6 | P | As above | As above |
| `agent-runtime/test/sanitize.test.ts` | 16 | P | Beta feedback: one appended test for the Bonzai classifier | Beside the classifier's own tests |

**Running total: 135 counted lines in source (plus 28 in tests) against
ADR-0060's ceiling of 150.** By phase: 1 - 24, 2 - 12, 3 - 3, 4 - 5,
5 - 62, 6 - 0, beta feedback - 29 (key at project creation 10, key in the
edit dialog 2, Bonzai refusals shown with their reason 16, log output 1).
Phase 6 spent 13 lines (2 prologues in `agent_mcp.rs`, 11 in
`AgentMcpServersSection.tsx`); all were removed on 2026-10-02 when external
MCP returned to the shared Clovy contract, leaving fifteen lines of headroom.
The MCP settings form still differs from upstream by one moved line (the
save-error notice rendered above the scrollable dialog body, from the shipped
MCP form fix); it is a form correction rather than a Bonzai guard, so it is
noted here and not counted. The
28 test lines sit outside the count because a mock at
the top of a test file carries no merge risk to the code under test; they are
listed so the surface is whole.

ADR-0058's original budget of 40 was exceeded in Phase 4 and its estimate of
37 by more than three times; ADR-0060 records why (a wrong inventory, the
breadth of severance, and the cost of JSX wraps) and replaces the number with
a shape rule and a ceiling. Reducing the guard's scope or leaving a disabled
capability visible to buy lines back was not an option on the table.

### Appended blocks (tracked, not counted)

| File | What |
| --- | --- |
| `src-tauri/src/clovy_api.rs` | `bonzai_seam`: thin wrappers over the note prompt, parsers, audio helpers, and the response wrapper, so the Bonzai path cannot drift from the local-provider path |
| `src-tauri/src/lib.rs` | `pub mod bonzai;` |
| `src-tauri/src/feature_flags.rs` | `DICTATION_ENABLED` |
| `src/lib/feature-flags.ts` | `DICTATION_ENABLED` |
| `.env.example` | `BONZAI_BASE_URL`, `BONZAI_DEFAULT_MODEL` |

### Prior Bonzai-routing additive files (no merge risk)

| Path | What |
| --- | --- |
| `UPSTREAM.md` | This file |
| `.github/workflows/upstream-conflict-canary.yml` | The conflict canary |
| `docs/bonzai-model-routing-prd.md` | The PRD |
| `docs/bonzai-implementation-plan.md` | The implementation plan |
| `docs/adr/0057-bonzai-is-the-only-inference-egress.md` | ADR (superseded by 0059) |
| `docs/adr/0058-bonzai-routing-lives-in-an-additive-provider-layer.md` | ADR (budget clause superseded by 0060) |
| `docs/adr/0059-bonzai-egress-is-enforced-by-a-build-time-allowlist.md` | ADR |
| `docs/adr/0060-the-bonzai-touched-line-budget-is-a-shape-rule-with-an-inventoried-ceiling.md` | ADR |
| `src-tauri/src/bonzai/mod.rs` | Module root, activation, startup validation, the session tag |
| `src-tauri/src/bonzai/egress.rs` | The compiled inference allowlist, `assert_allowed`, and the only permitted client constructors |
| `src-tauri/src/bonzai/config.rs` | Base URL and default model resolution, checked against the allowlist |
| `src-tauri/src/bonzai/http.rs` | The one request helper: allowlist, key, error mapping |
| `src-tauri/src/bonzai/keys.rs` | Keychain-backed keys, global and per-project, with the project index |
| `src-tauri/src/bonzai/resolve.rs` | Which key and which model for a piece of work |
| `src-tauri/src/bonzai/models.rs` | `/v1/models` per key, served into upstream's picker |
| `src-tauri/src/bonzai/chat.rs` | Note generation and the streaming agent proxy |
| `src-tauri/src/bonzai/audio.rs` | Note transcription |
| `src-tauri/src/bonzai/severance.rs` | The no-account mode, disabled tools, Clovy API and dictation refusals |
| `src-tauri/src/bonzai/commands.rs` | The one dispatching Tauri command |
| `src-tauri/tests/bonzai_egress_guard.rs` | The source-level CI guard |
| `src-tauri/tests/mcp_build_parity_guard.rs` | Source-level check that external MCP carries no build-specific admission |
| `src/lib/bonzai.ts` | Typed wrapper over the command, activation and index hooks |
| `src/components/settings/BonzaiSettingsSection.tsx` | The global key, in Settings > Models |
| `src/components/folders/BonzaiProjectKeyField.tsx` | A project's key, in project settings |
| `src/components/folders/BonzaiKeyBadge.tsx` | Own or global key, on the project card |
| `src/test/bonzai.test.ts` | Binding tests |

`docs/index.md` is shared and gains one row per document. Index rows are
append-only single lines and conflict trivially, so they are exempt from the
prior Bonzai-routing budget. The current renderer work also edits existing
index descriptions, so its exact documentation diff must be listed separately
in the documentation reconciliation below.

### Renderer documentation reconciliation

The renderer-styling work is accompanied by documentation and rule changes that
are not included in either ledger's implementation/test counts. The affected
paths relative to `origin/bonzai-main` are:

| Path | Documentation change |
| --- | --- |
| `UPSTREAM.md` | Preserves the prior Bonzai-routing ledger and records this visual exception, the integration-freeze blocker, and the exact final shared-path, test, docs/spec, and additive-file inventories. This self-diff is not included in the shared totals. |
| `CONTEXT.md` | Clarifies Clovy's technical identity and the proposed Bonzai Agent presentation exception while preserving OS Accounts ownership and compatibility naming. |
| `docs/adr/0055-addendum-2026-10-10-bonzai-agent-presentation.md` (new) | Dated proposal for renderer/menu presentation, blue renderer/HUD actions, orange recording/warning roles, the lime HUD status/attention mark, font, exclusions, and explicit ADR-0060 exception; status remains **proposed**, not accepted. |
| `docs/design/conventions.md` | Records fixed Bonzai palette, forced theme behavior, and updated styleguide convention. |
| `docs/design/foundations.md` | Records the fork-local Manrope/type-family distinction and updated palette foundation. |
| `docs/design/taste.md` | Reconciles the design sensibility with the changed visual palette. |
| `docs/index.md` | Updates ADR-0055 addendum link and design/roadmap descriptions. |
| `docs/roadmap/README.md` | Marks renderer styling active and records pending visual evidence and proposed-ADR review gate. |
| `docs/roadmap/rebrand-to-bonzai/plan.md` | Reconciles scope, active phase status, exclusions, implementation and evidence gates. |
| `spec/font-families.md` | Documents the Bonzai fork's local Manrope exception without changing the upstream font rule. |
| `spec/font-weights.md` | Clarifies that Manrope's variable range does not change the allowed app weights. |
| `src-tauri/icons/README.md` | Documents preserved native icon assets as legacy compatibility assets, separate from renderer appearance. |

The addendum is an additive proposal; its existence does not turn the
user-authorized implementation exception into formal ADR-0055/ADR-0060
acceptance. The existing shared prose paths are tracked documentation deltas,
not renderer-policy-compliant shared-code edits. The proposal and plan specify
orange recording controls and indicators; the implementation paths above carry
the corresponding ledger counts, independently verified against the final diff.

### Renderer-styling additive files and assets

These new paths are absent from `origin/bonzai-main`; they are inventoried
separately from shared-path counted lines. `src/lib/brand.ts` is deleted rather
than additive; `src/main.tsx` is a changed shared startup path and is counted in
the implementation table. The 157-path shared total already accounts for both.

| Path | Kind | What |
| --- | --- | --- |
| `docs/adr/0055-addendum-2026-10-10-bonzai-agent-presentation.md` | Proposed ADR addendum | New additive proposal; not accepted and does not satisfy the formal policy-reconciliation merge blocker. |
| `public/Manrope-Variable.woff2` | Binary asset, 55,308 bytes | Locally served variable font for the main renderer. |
| `public/Manrope-OFL.txt` | License, 4,386 bytes | SIL Open Font License 1.1 for the main renderer font asset. |
| `extension/public/Manrope-Variable.woff2` | Binary asset, 55,308 bytes | Extension-local copy for its separate document origin. |
| `extension/public/Manrope-OFL.txt` | License, 4,386 bytes | SIL Open Font License 1.1 alongside the extension font copy. |
| `src/test/appearance-settings.test.tsx` | Test | Appearance controls keep theme/text-size/date-format while removing the accent picker. |
| `src/test/fixed-palette-bootstrap.test.ts` | Test | Theme/font-scale bootstrap remains active when fixed-brand storage writes fail; inline-script CSP hash stays synchronized. |
| `src/test/fixed-palette-contract.test.ts` | Test | Palette tokens, neutral hover roles, character/HUD colors, appearance settings, and local font/license contract. |
| `src/test/native-icon-generator-source.test.mjs` | Test | Legacy packaged native icon palette remains separately maintained and embedded. |
| `src/test/styleguide-fixed-palette.test.tsx` | Test | Styleguide retains theme selection without old accent presets. |

The two bundled WOFF2 files are identical local copies (each 55,308 bytes); the
license is provided alongside both served copies. Additive assets/files carry no
shared-file merge-line count, but still require normal license, packaging, and
review checks.

## The conflict canary

[`.github/workflows/upstream-conflict-canary.yml`](.github/workflows/upstream-conflict-canary.yml)
runs on a schedule and on demand. It tests both merges of the topology in
throwaway worktrees and pushes nothing:

1. `upstream/main` -> `main`
2. `main` (with upstream merged in) -> `bonzai-main`

A red canary means the next sync needs hands. It reports **which** step
conflicted, which tells you immediately whether the problem is upstream's
change or our layer.

A canary nobody reads is worse than no canary, because it manufactures false
confidence. If it goes red and stays red, either fix it or turn it off.
