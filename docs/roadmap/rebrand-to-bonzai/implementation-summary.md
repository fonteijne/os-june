# Bonzai Agent renderer styling

**Status:** Implemented on `feature/bonzai-agent-visual`. Not committed, merged, or released. Native visual acceptance and formal merge-policy review remain open.

## What changed

### Fixed Bonzai palette

- Replaced selectable renderer accent presets with a fixed Bonzai palette in the existing semantic CSS tokens: `#365fd9` in light theme and `#8aa4f2` in dark theme.
- Removed the five accent presets while keeping Theme, Text size, and Date format controls.
- Applied the palette to the renderer character, primary identity actions, styleguide, extension, and secondary HUDs. Recording controls and warnings remain orange; other status colors retain their semantic roles; the HUD attention mark remains lime.
- Made theme and text-size preferences apply before first paint. Legacy Clovy and June brand preference keys remain compatibility-only and no longer select a runtime palette.
- Kept packaged native icons, Dock/Cmd-Tab identity, TCC registrations, path-drawn logo and wordmark artwork, and technical package identifiers unchanged. Appearance no longer selects a native Dock icon.

### Local typography

- Bundled the Manrope variable font and SIL Open Font License 1.1 with both the desktop renderer and browser extension.
- Updated the sans-font tokens and documentation. The established type scale, allowed 400 and `var(--fw-medium)` weights, serif/mono roles, spacing, layout, and component geometry remain unchanged.

### Bonzai Agent presentation

- Updated reviewed app and assistant copy and accessibility names across onboarding, Home, Agent chat, notes, settings, routines, notifications, reports, menus, and HUDs.
- Aligned Home, focused Agent, and unattended Routine instructions, the sidecar SDK agent name, and direct identity replies with Bonzai Agent. Bonzai Agent questions use a no-model identity reply; legacy Clovy and June greetings remain accepted aliases.
- Neutralized assistant-facing tool, secret, and skill wording where Clovy was incorrectly presented as the active app or assistant. Obsidian skill prose is neutral while its canonical and rollback-compatible identifiers remain unchanged.
- Clarified routing and privacy copy: Bonzai routes Home requests, model/provider choices affect privacy and retention, and the app does not claim to strip identifying text locally. The Settings community link names the Clovy community it opens, and the memory-tidy template refers to the user's saved memories.
- Preserved accurate ownership: Clovy API remains the technical backend, OS Accounts owns sign-in and credits, and Bonzai remains the inference provider. Account, billing, and inference behavior were not changed.

## Verification

- **Frontend:** 162 test files, 1,756 passed, zero failed.
- **Agent runtime:** 72 passed; typecheck and build passed.
- **Rust unit and integration targets:** 1,727 passed, zero failed, 13 ignored.
- **Clovy API workspace:** 535 passed, zero failed.
- **Extension:** 41 passed; build and typecheck passed.
- **Static checks:** Biome, TypeScript, Rust formatting, `cargo check`, and `git diff --check` passed.
- **Ledger:** `UPSTREAM.md` records 161 shared paths, +1,776 / −1,865 raw lines, and 2,348 changed-hunk maxima. The independent validator found no missing, extra, duplicate, or mismatched path/hunk rows.

Vitest logs the known caught jsdom `Chunk unavailable` event in the workspace-lazy test; all frontend tests pass. Biome reports existing warnings and informational diagnostics without failing its configured check.

**`make verify` is not green.** Clippy stops at the existing `.is_none_or()` use in `src-tauri/src/bonzai/audio.rs`. The crate declares Rust 1.80, while that method is stable from Rust 1.82. The same line exists in `origin/bonzai-main` and was left unchanged.

## Visual evidence and open gates

- Inspected Chromium styleguide screenshots in light and dark themes, including token swatches and local Manrope. Standalone HUD captures cover listening/dictation, meeting detection with the Record action, recording, countdown, and Agent needs-input states.
- The user-uploaded reference images were available only as resolution metadata in this session, so no pixel comparison is claimed.
- Native Tauri launch failed. Browser-only Home/Settings previews used a fake IPC bridge and displayed missing-native-bridge errors, so they are not clean full-app acceptance evidence. Native app/HUD review and remaining contrast/accessibility review remain open.
- The dated ADR-0055 presentation addendum remains **proposed**, pending formal product/design review. The branch uses the user's explicit ADR-0060 exception, not compliance. Its merge-policy reconciliation remains a blocker.
- OS Platform synchronization was skipped under the authorized offline exception. No local tracker substitute was created. No commit, push, PR, or release was made.

## Local testing

Run `pnpm tauri:dev` from the worktree root. The launcher starts the local Clovy API and Vite together. If the API reports `missing required config os_accounts.api_url`, ensure `clovy-api/.env` exists and has `CLOVY__LOCAL_DEV__ENABLED=true`; the local-development example enables this mode without OS Accounts credentials. If `clovy-api/.env` is absent, copy `clovy-api/.env.example` to it. Keep any real provider key in the API-side file, never in the desktop `.env` or a committed file.
