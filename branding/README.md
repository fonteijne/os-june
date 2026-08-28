# Whitelabel branding layer

This directory holds additive, per-brand configuration and assets for
building a rebranded instance of Clovy from this fork. It is empty upstream
and never touched by an upstream merge — see
[docs/whitelabel-implementation-plan.md](../docs/whitelabel-implementation-plan.md)
and [ADR-0056](../docs/adr/0056-whitelabel-branding-as-additive-config-layer.md)
for the full rationale.

**Nothing here changes the default build.** With no `BRAND` selected,
`pnpm dev`, `pnpm tauri:dev`, and `pnpm tauri:build` behave exactly as they do
today and produce today's Clovy identity.

## Layout

```
branding/
└── <brand-id>/
    ├── brand.json            # name, accent, support copy — read by the frontend prebuild step
    ├── tauri.override.json   # native shell identity/icons/titles/updater — read by the Tauri CLI
    └── icons/                # icon PNGs referenced from tauri.override.json
```

`branding/example/` is a synthetic fixture ("Acme Notes") that exercises the
whole mechanism. It is not a real partner and ships no real signing keys or
release infrastructure — copy it to start a real brand.

## Prerequisites (same as any other checkout)

Trying a brand needs nothing beyond this repo's normal first-time setup — see
[docs/development.md](../docs/development.md)'s Quick start:

- `cp .env.example .env && cp clovy-api/.env.example clovy-api/.env`. A
  Venice key is **not** required to start the app —
  `CLOVY__LOCAL_DEV__ENABLED=true` in `.env.example` skips that check; it
  only means Venice-backed models won't appear.
- `pnpm tauri:build` (a real production bundle) additionally requires Node
  24 active (`agent-runtime`'s `engines.node`) to package the agent-runtime
  sidecar — `pnpm tauri:dev` does not need this, since dev mode skips that
  packaging step entirely. Fastest way to see a rebrand: `pnpm tauri:dev -- --brand=example`.

## Using a brand

- **Native shell:** `BRAND=<brand-id> pnpm tauri:dev` or
  `BRAND=<brand-id> pnpm tauri:build` (equivalently `-- --brand=<brand-id>`).
  This merges `branding/<brand-id>/tauri.override.json` on top of the platform
  config via Tauri's native `--config` merge — `src-tauri/tauri.conf.json`
  itself is never edited.
- **Frontend:** the same `BRAND` env var drives `scripts/select-brand.mjs`,
  which runs automatically before `pnpm dev` / `pnpm build` (via the
  `predev`/`prebuild` package.json hooks) and writes the gitignored
  `src/lib/brand.generated.ts`. Unset `BRAND` regenerates today's Clovy
  defaults, so a fresh checkout needs no setup.
- **Backend (Clovy API):** no per-brand file is read at runtime. Copy the
  matching values from `brand.json` into that deployment's
  `CLOVY__BRAND__NAME` / `CLOVY__BRAND__SUPPORT_TEXT` environment variables
  (see [docs/configuration.md](../docs/configuration.md)). Unset, they
  default to today's "Clovy" strings.

## Adding a new brand

1. `cp -r branding/example branding/<brand-id>`
2. Edit `brand.json`: `id`, `productName`, `identifier`, `accent`,
   `accentWash` (optional), `supportText`, `deepLinkScheme`, `windowTitles`.
3. Edit `tauri.override.json` to match — `productName`, `identifier`, each
   window's `title`, the deep-link `schemes`, and `bundle.icon`. Keep every
   field of each window object (not just `title`): Tauri's config merge
   replaces an array wholesale rather than merging it element-by-element, so
   a partial window entry would silently drop the omitted fields (URL,
   transparency, `alwaysOnTop`, etc.) for that window.
4. Generate a real icon set from a source SVG:
   `pnpm tauri icon --icon branding/<brand-id>/source-icon.svg -o branding/<brand-id>/icons`
   (this is the same `tauri icon` step `scripts/generate-icons.mjs` runs for
   Clovy's own icon set — see that script's header comment). `tauri icon`
   always emits proper RGBA PNGs; if you ever hand-roll a placeholder instead,
   it must be RGBA (4 channels, not RGB) — `tauri::generate_context!()` panics
   at compile time on an RGB PNG with "is not RGBA". The example fixture ships
   only four placeholder PNGs (`32x32`, `128x128`, `128x128@2x`, `icon.png`)
   as solid swatches; a shippable build additionally needs `icon.icns`
   (macOS) and `icon.ico` (Windows), which `tauri icon` also produces.
   The `branding/bonzai` fixture's icon has no vector source (its mark is a
   raster decoded from a partner favicon), so it's built by
   `branding/bonzai/icons/_src/build-icon.py` instead — a small, documented
   Pillow script that composites the mark onto a macOS Big-Sur-style squircle
   (matching `src-tauri/icons/themed/_src/icon.template.svg`'s recipe: rounded
   tile, soft shadow, inset mark with its own drop shadow) before handing the
   result to `tauri icon`. Prefer a real vector source and this step's plain
   `tauri icon --icon ...svg` form for a new brand; fall back to that script's
   pattern only when a brand's own mark is raster-only.
5. Generate a brand-owned updater keypair with `pnpm tauri signer generate`
   and put the public half in `tauri.override.json`'s
   `plugins.updater.pubkey`; keep the private half out of git (CI secret).
   Point `plugins.updater.endpoints` at that brand's own public releases repo.
   Per [ADR-0001](../docs/adr/0001-auto-updates-via-tauri-updater.md), this key
   and endpoint are compiled into every shipped build permanently, so treat
   them as a one-time, per-brand decision.
6. Work through
   [docs/whitelabel-release-runbook.md](../docs/whitelabel-release-runbook.md)
   (Phase 4) for the rest of the per-brand release checklist: OS Accounts
   OAuth client + App API key, code-signing identities, and the
   `OS_CLOVY_KEYCHAIN_SERVICE` / `OS_CLOVY_DEV_KEYCHAIN_SERVICE` build-time
   env vars so a whitelabel build doesn't read or write stock Clovy's OS
   Accounts keychain entry when both are installed on the same machine — and
   never joins ADR-0055's June-era compatibility bridge, since a whitelabel
   install has no legacy June-era state of its own to migrate.

## A note on icon *and Dock name* resolution — and why `pnpm tauri:dev` won't show either

`tauri.override.json`'s `bundle.icon` paths are written relative to
`src-tauri/` (matching how the base `tauri.conf.json` and the existing
`tauri.macos.conf.json` / `tauri.windows.conf.json` platform overrides resolve
their own paths), since Tauri resolves bundle paths against the directory of
the primary config regardless of which `--config` fragment supplied the
value. `tauri::generate_context!()` does read this override correctly at
compile time — it's exactly why the icon PNGs shipped here have to be RGBA
(see above); a plain-RGB placeholder makes that macro panic.

That said, **`bundle.icon` never reaches the macOS Dock/Cmd-Tab icon during
`pnpm tauri:dev`.** Traced to the source: `tao` (Tauri's windowing library)
implements `set_window_icon` as a literal no-op on macOS
(`tao-0.35.3/src/platform_impl/macos/window.rs`, with the comment "macOS
doesn't have window icons"). The only thing in this codebase that ever sets
the live NSApplication icon is `src-tauri/src/theme_icon.rs`'s
`set_dock_icon` command — and it only recognizes Clovy's own five named
accent presets (sage/clay/rose/ocean/plum), falling back to Clovy's own
`icon-sage.png` for anything else, including a whitelabel `BRAND_ID`. So:

- With no accent explicitly picked (the common case for a fresh whitelabel
  install), `src/lib/brand.ts`'s `initBrand()` skips calling
  `set_dock_icon` entirely for a whitelabel build (see "Accent color"
  above) — so the Dock icon during `pnpm tauri:dev` is whatever macOS
  assigns a bare unsigned dev binary by default, not your bundled icon.
- If a whitelabel user explicitly picks one of the five presets from
  Settings, the Dock icon flips to Clovy's own themed PNG for that preset —
  not the whitelabel one either.

None of this touches a **real, packaged `.app`** (`pnpm tauri:build`):
`bundle.icon` is what macOS reads from the bundle's `Info.plist` /
`icon.icns` for the Dock, Finder, and Cmd-Tab in that case, independent of
`tao`'s no-op and of `theme_icon.rs`. **`pnpm tauri:build -- --brand=<id>`
(needs Node 24 active — see Prerequisites above) is the only way to
actually verify a brand's icon.** Extending `theme_icon.rs` to fall back to
the compiled default icon for an unrecognized brand (rather than clay)
would fix the dev-mode case too, but needs a new Rust dependency
(`image`, to re-encode the already-decoded default icon back to PNG bytes)
and native `objc2`/AppKit code that can't be compiled or tested from a
Linux sandbox — a real follow-up, not done here.

**The Dock/Cmd-Tab *name* has the same "trust `tauri:build`, not
`tauri:dev`" caveat, for a related but distinct reason.** `tauri.override.json`'s
`productName` does reach `tauri::generate_context!()` — the config merge
chain is correct (`scripts/tauri-dev.mjs` pushes the platform config, then
the brand override, then a dev-identity overlay that deliberately
contributes `{}` for a non-isolated-worktree branch, so it never clobbers a
brand's `productName`) and nothing in this codebase ever calls an AppKit API
to *rename* the running process. The compiled binary's own file name (see
`src-tauri/Cargo.toml`'s `[[bin]] name = "os-june"`, a pre-rebrand leftover)
doesn't match either "Clovy" or a brand's `productName`, which rules out the
raw binary name as what the Dock is displaying. That combination — a config
chain that's provably correct on paper, plus a Dock name that matches
neither the base config's compile-time default nor the raw binary — points
at **macOS's own Launch Services/Dock cache**, not a code bug: an unbundled
`tauri dev` process is not code-signed and has no fresh `Info.plist` for
Launch Services to re-read on every launch, so a stale name (often the
plain "Clovy" default from an earlier unbranded `pnpm tauri:dev` run at the
same executable path) can stick in the Dock across brand switches until
that cache is invalidated. If a brand's Dock name looks stale after
switching `--brand=<id>`, fully quit the dev app first, then relaunch; if it
still looks stale, `killall Dock` (harmless — it just restarts the Dock
process) forces macOS to drop cached app identities. As with the icon,
**`pnpm tauri:build -- --brand=<id>` is the authoritative check** — a real
signed `.app` bundle's name is read fresh from its own `Info.plist` and
doesn't share dev's unbundled-process cache behavior. This is untested from
this repo's Linux dev sandbox (no macOS to run the built app on) — if you
hit this and the above doesn't resolve it, that's a real follow-up worth
filing, not a known-and-accepted limitation the way the dev-mode icon is.

## Guarding against brand drift (Phase 5)

`node scripts/check-brand-drift.mjs` (wired into CI via the Biome check job,
and into `make check` / `make lint` / `make verify`) fails when one of the
curated high-visibility files listed in that script gains a new literal
"Clovy" string that isn't already recorded in
`scripts/brand-drift-allowlist.json` as a deliberate exception (a reference to
Clovy's own product, infrastructure, or community, rather than the whitelabel
identity). This is what keeps an upstream merge from silently reintroducing
unbranded copy into the surfaces Phase 2 already converted. Route new copy on
one of those files through `BRAND_NAME` / `BRAND_SUPPORT_TEXT`; if a failure
is a genuine exception, review it and then run
`node scripts/check-brand-drift.mjs --update-allowlist` to record the
decision — never to silence a failure you haven't looked at.

## Accent color (`accent` / `accentWash`)

`brand.json`'s `accent` seeds `--brand` (and `accentWash` seeds
`--brand-wash`) app-wide — the sidebar mark, buttons, and every other
`var(--brand)` consumer — the *first* time the app runs with no accent
explicitly picked yet (`src/lib/brand.ts`'s `initBrand()`/`subscribeBrand()`).
It does not touch `src/lib/brand.ts`'s own five named presets
(sage/clay/rose/ocean/plum) or their selector in Settings — that picker,
and its behavior once a whitelabel user explicitly chooses one of the five,
are unchanged. Two known limitations, deliberately not fixed here:

- **A brief flash of sage on load.** `index.html`'s pre-paint bootstrap
  (which sets `--brand` before the JS bundle runs, to avoid a flash for the
  five-preset picker) doesn't know about `branding/<brand-id>/brand.json` —
  it's a static, unprocessed file. `initBrand()` corrects the color as soon
  as the bundle runs, so this is a sub-frame flash in practice, not a
  persistent wrong color.
- **The dock icon doesn't follow a manually picked accent.** If a
  whitelabel user opens Settings and explicitly picks one of the five named
  presets, `src-tauri/src/theme_icon.rs` only knows those five and falls
  back to Clovy's own sage-colored dock icon — overwriting the correctly
  bundled whitelabel dock icon Tauri set at launch. `accentWash` alone can't
  fix this; it needs `theme_icon.rs` to know the brand's own icon too. Left
  alone with no accent explicitly picked, this doesn't happen — the bundled
  dock icon is never touched.

If `accentWash` is omitted, it falls back to `accent` itself — less refined
(the five hand-tuned presets use a subtly different wash than their base
accent) but not wrong.

## What this layer does not cover

- Choosing a brand at runtime in one binary — bundle identifier, deep-link
  scheme, and code signing are fixed per build (see ADR-0056's "Alternatives
  considered").
- Onboarding a real partner: registering an OS Accounts OAuth client and App
  API key, a releases repo, and code-signing identities are operational steps,
  not code — see
  [docs/whitelabel-release-runbook.md](../docs/whitelabel-release-runbook.md)
  (Phase 4). The Keychain service id for the OS Accounts token store *is* code
  now (`OS_CLOVY_KEYCHAIN_SERVICE`); five other `co.opensoftware.clovy*`
  keychain namespaces (agent MCP, agent runtime, companion, Notion connector,
  the generic connector store) are not yet brand-configurable — see the
  runbook's "Known gap" section. All five already dual-read/write against
  their own `co.opensoftware.june*` counterpart per ADR-0055, but that bridge
  is Clovy's own June-era migration path — it has nothing to do with a
  whitelabel build, which never had June-era installs to migrate from.
- The long tail of "Clovy" copy in `src/`. Only the highest-visibility,
  most-likely-to-be-seen-in-a-demo strings are routed through
  `BRAND_NAME` (Phase 2); everything else stays literal "Clovy" until a real
  partner need justifies the cost. The brand-drift check above only watches
  that curated set — it does not chase the rest.
