# Implementation plan: Whitelabel capability

**Owner:** proposed by agent, for review · **Date:** 2026-08-03 · **Status:** Proposed
**ADR:** [0054-whitelabel-branding-as-additive-config-layer.md](adr/0054-whitelabel-branding-as-additive-config-layer.md)
**Repos:** `os-june` (app + June API) in this fork; `os-accounts` for per-brand OAuth client + App API key registration (operational only, no `os-accounts` code change proposed here)

## Objective

Make it possible to build and ship a rebranded instance of June from this
fork — a different product name, bundle identity, icon set, and accent
color — **while keeping `git merge`/`git rebase` from the upstream
`os-june` project close to conflict-free.** This plan covers enabling the
*capability* only. It does not onboard a specific partner, and no whitelabel
build ships as a result of this plan landing.

The fork-update requirement is not a footnote here — it is the constraint
that shapes every choice below. See "Fork-update strategy."

## Non-goals

- Onboarding an actual whitelabel customer or partner.
- Any billing, reseller, or revenue-share model between OpenSoftware and a
  whitelabel partner. OS Accounts remains the sole source of truth for
  identity and credits (per AGENTS.md's boundary); this plan does not touch
  that dependency direction.
- Multi-brand-in-one-binary or choosing a brand at runtime.
- Marketing site, legal/ToS, or app-store-listing work for a whitelabel
  brand.
- Deciding whether a whitelabel partner gets an isolated June API deployment
  or shares OpenSoftware's. Flagged as an open question below; both options
  stay available under this plan's design.
- Rewriting the ~1,000 "June" occurrences in frontend copy. Only the
  highest-visibility, most-likely-to-be-seen-in-a-demo strings are in scope
  (Phase 2); the long tail stays literal "June" until a real partner need
  justifies the cost.

## Current branding surface (inventory)

### App shell (Tauri)

- `src-tauri/tauri.conf.json:3-5` — `productName: "June"`,
  `identifier: "co.opensoftware.june"`.
- `src-tauri/tauri.conf.json:17,30,47,64` — hardcoded window titles: "June"
  (main), "June Dictation" (HUD), "June Agents" (agent HUD), "June Recording"
  (meeting HUD).
- `src-tauri/tauri.conf.json:97-101` — deep-link scheme `osjune`.
- `src-tauri/tauri.conf.json:112-116` — updater `pubkey` (Ed25519) and a
  single hardcoded endpoint pointing at
  `open-software-network/os-june-releases`.
- `src-tauri/tauri.macos.conf.json:9-19` — `bundleName: "June"`, resource
  paths reference `June.app`, `June Dictation Helper.app`,
  `June Computer Use Driver.app` by literal name.
- `src-tauri/tauri.windows.conf.json:3` — `publisher: "Open Software Network"`.
- Root `package.json` — `name: "os-june"`, `version` kept in sync with
  `tauri.conf.json` via `scripts/bump-version.mjs`.

### Icons & visual assets

- `src-tauri/icons/` — the full bundle icon set (`.icns`, `.ico`, iconset
  PNGs, Windows Store logos, tray icons), plus theme-variant icons
  (`icons/themed/icon-{rose,plum,clay,sage,ocean}.png`) and
  `june-app-icon.svg`.
- `src/components/brand/` (e.g. `JuneWordmark.tsx`, inline SVG,
  `aria-label="June"`), `src/assets/june-mark.svg`,
  `src/assets/june-agents-mark.svg`, `src/assets/onboarding/characters/`.
- `src/lib/brand.ts` — accent color presets (clay/terracotta is the default)
  and `src/lib/brand-glass.ts` — this is the one place brand color logic is
  already centralized, and the pattern this plan generalizes.

### Frontend UI copy

- 184 files, ~1,032 occurrences of the literal "June" under `src/`. The
  large majority are internal identifiers (`JuneWordmark`, `useJuneAgent`,
  test fixture names) that never render to a user. A meaningful minority are
  user-visible copy: onboarding, composer placeholders/aria-labels ("Message
  June"), empty states ("Put June to work"), settings, issue-report dialog
  ("What should the June team hear from you?"), share-dialog security copy.
- No `SOUL.md` exists in this repo — no separate agent-persona file to
  rebrand.

### Backend (`june-api`)

- `crates/providers/src/issue_reports.rs:624` — generates titles like
  `"June report: {summary}"` and default report text referencing "June".
- `crates/.../http.rs:44` — outbound `user_agent("june-api/0.1")`.
- No email templates or support-contact strings were found hardcoded
  elsewhere; the backend is otherwise already well externalized via the
  figment `JUNE__SECTION__FIELD` env-var convention documented in
  [configuration.md](configuration.md).

### Identity & billing (OS Accounts)

- June is registered with OS Accounts as **one** OAuth client
  (`OS_ACCOUNTS_CLIENT_ID`, an `ocl_...` id — see
  [os-accounts-login.md](os-accounts-login.md) and `src-tauri/src/os_accounts.rs`),
  using PKCE with a deep-link redirect (`osjune://auth/callback`) or a
  loopback port in dev.
- The Keychain service used for the account token store is hardcoded to
  `co.opensoftware.june.accounts`.
- June API separately holds its own App API key (`osk_...`, config key
  `JUNE__OS_ACCOUNTS__APP_API_KEY`) for `authorize`/`charge` metering.
- **This registration is per-app on the OS Accounts platform, not repo
  config.** A whitelabel brand needs its own `ocl_...` OAuth client
  (including getting any non-default OAuth scopes pre-allowlisted with OS
  Accounts) and its own `osk_...` App API key — both are operational steps
  against OS Accounts, independent of this plan's code changes.

### Auto-update & release signing

- [ADR-0001](adr/0001-auto-updates-via-tauri-updater.md): the updater
  endpoint and Ed25519 pubkey are **compiled into every shipped build,
  permanently** for that build's lifetime, and point at a public
  releases-only repo (`open-software-network/os-june-releases`) because the
  updater does an unauthenticated GET.
- [release-macos.md](release-macos.md) / [release-windows.md](release-windows.md)
  confirm the release pipeline further requires an org-owned GitHub Release
  App, an Apple Developer ID certificate + notarization credentials, a
  separate `TAURI_SIGNING_PRIVATE_KEY` Ed25519 updater keypair, and an
  Authenticode PFX for Windows — all singular today.
- A whitelabel brand therefore needs its own releases repo, its own updater
  keypair, and its own code-signing identities before it can auto-update in
  production. Nothing here changes without a real release for that brand.

### Fork/upstream tracking (current state: none)

- `git remote -v` in this fork shows only `origin` (`fonteijne/os-june`) —
  no `upstream` remote is configured.
- No `UPSTREAM.md`, no CI workflow that syncs from an upstream remote (the
  only "upstream" hits in `.github/` refer to CI job dependencies, not git
  remotes), and no ADR or `spec/` entry addresses white-label or
  multi-brand configuration today.

## Architecture: additive branding layer

Full rationale in [ADR-0054](adr/0054-whitelabel-branding-as-additive-config-layer.md).
Summary:

- A new `branding/<brand-id>/` directory (absent upstream, so it can never
  conflict with an upstream change) holds a `brand.json` (name, accent,
  support copy) plus icon/asset overrides.
- **Tauri config:** built with `tauri build --config branding/<brand-id>/tauri.override.json`,
  using Tauri's native config-merge feature to supply `productName`,
  `identifier`, icon paths, window titles, the updater `endpoints`/`pubkey`,
  and the deep-link scheme — without editing `src-tauri/tauri.conf.json`.
- **Frontend:** a small `scripts/select-brand.mjs` prebuild step writes a
  gitignored `src/lib/brand.generated.ts` exporting `BRAND_NAME`,
  `BRAND_ACCENT`, and asset paths, generalizing the pattern already used by
  `src/lib/brand.ts`. The committed fallback equals today's June values, so
  `pnpm dev` / `pnpm tauri:dev` need no setup and behave exactly as they do
  now.
- **Backend:** new `JUNE__BRAND__NAME`, `JUNE__BRAND__SUPPORT_TEXT` (etc.)
  figment keys, following the existing `JUNE__SECTION__FIELD` convention,
  defaulting to today's "June" strings when unset.
- Where a shared file must reference the layer at all (a component printing
  a literal "June"), the edit is the smallest possible token substitution —
  never a restructure — to keep future upstream diffs to that file low-risk.

## Phasing

1. **App-shell whitelabel** — product name, bundle identifier, icon set,
   updater target, deep-link scheme made brand-selectable via the
   `--config` override + `branding/` assets. Verifies the mechanism end to
   end with zero frontend/backend copy changes.
2. **High-visibility UI copy** — title bar, about/settings screen,
   onboarding, HUD window titles routed through `BRAND_NAME`. Scoped to the
   strings a partner would actually see in a demo, not the full ~1,032.
3. **Backend copy** — issue-report title/text and any other user-facing
   backend-generated strings routed through `JUNE__BRAND__*`.
4. **Per-brand identity & release operations** — the runbook for a new OS
   Accounts OAuth client + App API key registration, a new public releases
   repo + Ed25519 updater keypair, new Apple Developer ID / Windows
   Authenticode signing identities, and a brand-specific Keychain service id
   (today hardcoded to `co.opensoftware.june.accounts`) so a whitelabel
   build can be installed alongside stock June on the same machine without
   colliding.
5. **Brand-drift lint (deferred)** — a CI check, in the spirit of the
   existing lucide-import ban in Biome, that fails a whitelabel branch build
   when an upstream merge introduces new hardcoded "June" copy that should
   route through `BRAND_NAME`. Not built in this plan; flagged as the
   highest-leverage follow-up once Phase 2 lands, since it is what keeps
   Phase 2's scope from silently rotting after every upstream merge.

Phases are independent enough to land as separate PRs; nothing later depends
on shipping a real partner brand to be useful — each phase is verifiable
against a synthetic `branding/example/` fixture.

## Fork-update strategy

This is the explicit second requirement, so it gets its own checklist rather
than living only inside the architecture section:

- Add `git remote add upstream <source os-june repo>` and document a regular
  sync cadence (e.g., weekly `git fetch upstream && git merge upstream/main`
  into a tracking branch) — there is no such remote or cadence today.
- Keep all brand-specific commits on a long-lived `whitelabel/<brand-id>`
  branch layered on top of a `main` that otherwise mirrors upstream exactly.
  Don't rebrand `main` in place — that is what makes future upstream
  merges/rebases trivial fast-forwards instead of conflict resolution.
- House rule (load-bearing, restated from ADR-0054): brand-specific work is
  additive files first. Any edit that must touch a shared file is a
  single-line token substitution, never a restructure.
- After every upstream merge: run the brand-drift lint (Phase 5, once it
  exists) plus `pnpm typecheck`, `pnpm test`, and `cargo test` to confirm the
  branding layer still overrides cleanly and nothing new leaked into a
  build-target surface unbranded.
- Because June API must stay backward-compatible (AGENTS.md's boundary) and
  OS Accounts is never owned by June, neither boundary needs to change for
  whitelabeling — that keeps the merge surface smaller than it would be for
  a feature that touched wire contracts.

## Open questions / follow-ups

- Does a whitelabel partner get an isolated June API deployment, or share
  OpenSoftware's? Affects how far Phase 3/4 need to go and who is accountable
  for that partner's upstream provider costs. Needs a follow-up ADR once a
  real partner is scoped — not decided by this plan.
- Who registers and holds the per-brand OS Accounts OAuth client — this fork,
  or OpenSoftware on the partner's behalf?
- Where does `branding/<brand-id>/` live for a real partner — in this fork's
  repo (simplest, but signing keys and any partner-confidential assets must
  stay out of git and flow through CI secrets instead), or a private
  submodule/separate repo referenced at build time?

## Verification (for this plan's own PR)

This PR is documentation only — no code changes. Verification is that the
plan and ADR are internally consistent and match the current repo state:

- File:line references above were checked against `origin/main` at commit
  time; re-verify before starting Phase 1 implementation, since `main` moves
  frequently.
- `docs/index.md` links to both new documents.

Verification for the *implementation* phases (once built) belongs in each
phase's own PR, and should include: a `--config`-overridden build producing
a differently-named/icon'd bundle with zero diff to
`src-tauri/tauri.conf.json`; a default build (no `BRAND` set) that is
string- and asset-identical to today's June; and a sample `git merge` of a
recent batch of upstream commits onto a branch with Phase 1-3 applied,
confirming no conflicts.
