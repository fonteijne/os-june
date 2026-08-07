# Whitelabel release runbook (Phase 4)

Phase 4 of [whitelabel-implementation-plan.md](whitelabel-implementation-plan.md):
what a real partner brand needs, once, before it can build, sign, install, and
auto-update alongside stock June on the same machine. Phases 1-3 (the
`branding/<brand-id>/` layer, `BRAND_NAME`/`BRAND_SUPPORT_TEXT` copy, and the
`JUNE__BRAND__*` backend config) are code and ship with this repo. Everything
below is either a one-time operational registration against a system this repo
does not own, or a build-time secret threaded the same way June's own release
workflows already thread `OS_ACCOUNTS_CLIENT_ID` — see
[release-macos.md](release-macos.md) / [release-windows.md](release-windows.md)
for the equivalent checklist June's own releases already run.

None of this is required to build the `branding/example/` fixture locally —
it only matters once a brand ships a real, signed, auto-updating install.

## Checklist

- [ ] **OS Accounts OAuth client + App API key.** Register a new `ocl_...`
  OAuth client with OS Accounts for the brand (redirect URI
  `<deepLinkScheme>://auth/callback`, matching `brand.json`'s
  `deepLinkScheme`), plus any non-default OAuth scopes the app needs
  pre-allowlisted. Separately, register a new `osk_...` App API key for the
  brand's June API deployment to use for `authorize`/`charge` metering. Both
  are OS Accounts-side registrations, not code changes here — see
  [os-accounts-login.md](os-accounts-login.md) and the `os-accounts-integration`
  skill for the client-side contract they plug into
  (`OS_ACCOUNTS_CLIENT_ID` / `JUNE__OS_ACCOUNTS__APP_API_KEY`).
- [ ] **Public releases repo.** A new `<brand>/<brand>-releases` GitHub repo,
  mirroring `open-software-network/os-june-releases` — the Tauri updater does
  an unauthenticated GET, so this must be public and hold only release
  artifacts (ADR-0001).
- [ ] **Updater keypair.** `pnpm tauri signer generate --write-keys keys/<brand>-updater.key`
  (branding/README.md step 5). Public half goes in
  `branding/<brand-id>/tauri.override.json`'s `plugins.updater.pubkey`
  (committed); private half is a CI secret only, never committed. This key is
  compiled into every shipped build permanently (ADR-0001) — losing it
  permanently breaks auto-update for every install signed with it.
- [ ] **Apple Developer ID + notarization.** A brand-owned Apple Developer
  account, Developer ID Application certificate, and App Store Connect API
  key for notarization — the same four secrets `release-macos.md` lists
  (`APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`,
  `APPLE_API_ISSUER`/`APPLE_API_KEY`/`APPLE_API_KEY_P8`), scoped to the brand's
  own bundle identifier (`branding/<brand-id>/brand.json`'s `identifier`).
- [ ] **Windows Authenticode certificate.** A brand-owned code-signing
  certificate exported as a password-protected PFX — the same
  `WINDOWS_CERTIFICATE` / `WINDOWS_CERTIFICATE_PASSWORD` pair
  `release-windows.md` lists.
- [ ] **Keychain service id.** Set at build time, the same way
  `OS_ACCOUNTS_CLIENT_ID` already is (`option_env!`, threaded as a plain env
  var at the `cargo build` / `tauri build` step from a repo secret — see any
  `production-desktop-*.yml` workflow for the pattern):
  - `OS_JUNE_KEYCHAIN_SERVICE` — release builds' OS keychain service id for
    the OS Accounts token store. Defaults to `co.opensoftware.june.accounts`
    when unset.
  - `OS_JUNE_DEV_KEYCHAIN_SERVICE` — the debug-build equivalent. Defaults to
    `co.opensoftware.june-dev.accounts`.

  Without a distinct value here, a whitelabel build installed on the same
  machine as stock June would read and write **stock June's** OS Accounts
  token store (same keychain service id, same OS-level entry) — sign-in state
  would bleed between the two apps. Pick anything brand-scoped, e.g.
  `com.<brand>.accounts` / `com.<brand>-dev.accounts`.

## Known gap: other June keychain namespaces

The plan's original inventory named only the OS Accounts token store
(`co.opensoftware.june.accounts`, `src-tauri/src/os_accounts.rs`) as a
hardcoded Keychain service id, and that is what Phase 4 makes
brand-configurable above. A repo-wide search while implementing this phase
found five more `co.opensoftware.june*` service ids that are **not yet**
brand-configurable and were out of this phase's reviewed scope:

- `src-tauri/src/agent_mcp.rs` — agent MCP server secrets
- `src-tauri/src/agent_runtime/secrets.rs` — agent runtime secrets
- `src-tauri/src/companion/mod.rs` — companion device identity
- `src-tauri/src/connectors/notion.rs` — Notion connector tokens
- `src-tauri/src/connectors/store.rs` — the generic connector token store
  (prefix-based, covers every other connector)

A whitelabel build installed alongside stock June today would still share
these five keychain namespaces with it. Extending the same
`env_or_build_trimmed`-style build-time override to all of them is a
reasonable fast-follow once a real partner needs it, but is deliberately not
bundled into this change — it touches five additional files' credential
storage and deserves its own review rather than riding along here.

## Open questions (unchanged from the plan)

See "Open questions / follow-ups" in
[whitelabel-implementation-plan.md](whitelabel-implementation-plan.md): shared
vs. isolated June API deployment per brand, and who holds the per-brand OS
Accounts OAuth client registration.
