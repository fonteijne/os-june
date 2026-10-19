# App icons

Everything in this directory is generated. Do not hand-edit the PNGs, `.icns`,
or `.ico`. Edit the SVG sources, then regenerate:

```bash
pnpm icons
```

That runs `scripts/generate-icons.mjs`, which produces two things:

- **Base icon set** (`*.png`, `icon.icns`, `icon.ico`, `android/`, `ios/`) from
  `clovy-app-icon.svg` via the Tauri CLI's `tauri icon`.
- **Legacy themed native icons** (`themed/icon-<id>.png`) from the shared
  template `themed/_src/icon.template.svg`. Their static palette lives in
  `LEGACY_NATIVE_ICON_PALETTE` in `scripts/generate-icons.mjs`, separate from
  the fixed Bonzai renderer palette. These packaged icons are compatibility
  assets, not Appearance choices.

## When to run it

- You changed `clovy-app-icon.svg` (the base mark).
- You changed an entry in `LEGACY_NATIVE_ICON_PALETTE` or the themed template.
- You added or removed a legacy native palette entry. Stale themed PNGs are
  deleted automatically; coordinate any removed id with native compatibility.

## Notes

- `src-tauri/src/theme_icon.rs` embeds the themed PNGs and keeps the old
  `"amber"` alias pointing at `icon-clay.png`; retain every referenced asset.
- `tauri icon` output is deterministic for a given CLI version, so reruns are
  byte-stable.
