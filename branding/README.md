# Whitelabel branding layer

This directory holds additive, per-brand configuration and assets for
building a rebranded instance of June from this fork. It is empty upstream
and never touched by an upstream merge — see
[docs/whitelabel-implementation-plan.md](../docs/whitelabel-implementation-plan.md)
and [ADR-0054](../docs/adr/0054-whitelabel-branding-as-additive-config-layer.md)
for the full rationale.

**Nothing here changes the default build.** With no `BRAND` selected,
`pnpm dev`, `pnpm tauri:dev`, and `pnpm tauri:build` behave exactly as they do
today and produce today's June identity.

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

## Using a brand

- **Native shell:** `BRAND=<brand-id> pnpm tauri:dev` or
  `BRAND=<brand-id> pnpm tauri:build` (equivalently `-- --brand=<brand-id>`).
  This merges `branding/<brand-id>/tauri.override.json` on top of the platform
  config via Tauri's native `--config` merge — `src-tauri/tauri.conf.json`
  itself is never edited.
- **Frontend:** the same `BRAND` env var drives `scripts/select-brand.mjs`,
  which runs automatically before `pnpm dev` / `pnpm build` (via the
  `predev`/`prebuild` package.json hooks) and writes the gitignored
  `src/lib/brand.generated.ts`. Unset `BRAND` regenerates today's June
  defaults, so a fresh checkout needs no setup.
- **Backend (June API):** no per-brand file is read at runtime. Copy the
  matching values from `brand.json` into that deployment's
  `JUNE__BRAND__NAME` / `JUNE__BRAND__SUPPORT_TEXT` environment variables
  (see [docs/configuration.md](../docs/configuration.md)). Unset, they
  default to today's "June" strings.

## Adding a new brand

1. `cp -r branding/example branding/<brand-id>`
2. Edit `brand.json`: `id`, `productName`, `identifier`, `accent`,
   `supportText`, `deepLinkScheme`, `windowTitles`.
3. Edit `tauri.override.json` to match — `productName`, `identifier`, each
   window's `title`, the deep-link `schemes`, and `bundle.icon`. Keep every
   field of each window object (not just `title`): Tauri's config merge
   replaces an array wholesale rather than merging it element-by-element, so
   a partial window entry would silently drop the omitted fields (URL,
   transparency, `alwaysOnTop`, etc.) for that window.
4. Generate a real icon set from a source SVG:
   `pnpm tauri icon --icon branding/<brand-id>/source-icon.svg -o branding/<brand-id>/icons`
   (this is the same `tauri icon` step `scripts/generate-icons.mjs` runs for
   June's own icon set — see that script's header comment). The example
   fixture ships only four placeholder PNGs (`32x32`, `128x128`, `128x128@2x`,
   `icon.png`) as solid swatches; a shippable build additionally needs
   `icon.icns` (macOS) and `icon.ico` (Windows), which `tauri icon` also
   produces.
5. Generate a brand-owned updater keypair with `pnpm tauri signer generate`
   and put the public half in `tauri.override.json`'s
   `plugins.updater.pubkey`; keep the private half out of git (CI secret).
   Point `plugins.updater.endpoints` at that brand's own public releases repo.
   Per [ADR-0001](../docs/adr/0001-auto-updates-via-tauri-updater.md), this key
   and endpoint are compiled into every shipped build permanently, so treat
   them as a one-time, per-brand decision — see Phase 4 in the implementation
   plan for the rest of the per-brand release/signing checklist (OS Accounts
   OAuth client, code-signing identities, Keychain service id).

## A note on icon path resolution

`tauri.override.json`'s `bundle.icon` paths are written relative to
`src-tauri/` (matching how the base `tauri.conf.json` and the existing
`tauri.macos.conf.json` / `tauri.windows.conf.json` platform overrides resolve
their own paths), since Tauri resolves bundle paths against the directory of
the primary config regardless of which `--config` fragment supplied the
value. This has not been exercised against a real `tauri build` in this
change (no macOS/Windows toolchain was available while writing it) — verify
the icon actually swaps on a real `pnpm tauri:build -- --brand=example` run
on your platform before relying on it for a shipping brand.

## What this layer does not cover

- Choosing a brand at runtime in one binary — bundle identifier, deep-link
  scheme, and code signing are fixed per build (see ADR-0054's "Alternatives
  considered").
- Onboarding a real partner: registering an OS Accounts OAuth client and App
  API key, a releases repo, code-signing identities, and a distinct Keychain
  service id are operational steps, not code — see Phase 4 of
  [docs/whitelabel-implementation-plan.md](../docs/whitelabel-implementation-plan.md).
- The long tail of "June" copy in `src/`. Only the highest-visibility,
  most-likely-to-be-seen-in-a-demo strings are routed through
  `BRAND_NAME` (Phase 2); everything else stays literal "June" until a real
  partner need justifies the cost.
