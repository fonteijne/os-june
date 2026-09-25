# Roadmap: Bonzai logo replacement

**Owner:** Product, design, desktop engineering, and release operations  
**Date:** 2026-09-25  
**Status:** Proposed  
**Scope:** Replace the Clovy in-app mark, wordmark treatment, packaged Tauri icon assets, and approved live macOS Dock/Cmd-Tab icon behavior with an approved Bonzai identity package. The work is blocked until the correct Bonzai source files, usage permission, and platform requirements are supplied.

This document captures product and architecture direction. It is not implementation authorization, an ADR, a launch commitment, an Issue, or a release approval. File paths and asset formats are a starting inventory and must be re-verified when the source package arrives. This roadmap does not create assets, alter native configuration, change technical identities, create credentials, or change accepted ADRs.

## Executive recommendation

Do not start logo replacement from the existing Clovy mark, a recolored Clovy mark, or the branch-only raster-derived Bonzai fixture. Request an approved Bonzai asset package first, then integrate it through the existing source and generation seams.

The asset package must establish one canonical Bonzai mark and the permitted treatments for:

1. the in-app mark and wordmark;
2. the sidebar app tile and other renderer-owned brand surfaces;
3. the packaged Tauri icon set for macOS and Windows;
4. any other packaged platform icon outputs that this product still ships; and
5. the live macOS Dock/Cmd-Tab icon when a Bonzai build is running.

The default Clovy build must remain unchanged until a separate build-selection or product-identity decision authorizes a Bonzai artifact. A logo replacement must not be treated as permission to change bundle identifiers, storage keys, deep links, updater identity, native helper identities, or inference behavior.

### Ownership flow

```text
Bonzai design owner
        |
        | supplies approved source package and usage rights
        v
Product and release owner
        |
        | accepts identity contract and platform treatments
        v
Desktop and frontend owners
        |
        | compose renderer assets and generated native icon outputs
        v
QA and release operations
        |
        +--> verify in-app mark and wordmark
        +--> verify packaged Finder, Dock, Cmd-Tab, taskbar, and installer assets
        +--> verify Clovy default regression and technical identity boundaries
```

Design owns the mark, artwork, source provenance, and permitted usage. Product owns the visible identity contract. Frontend owns renderer-owned marks and wordmarks. Desktop engineering owns Tauri packaging and live macOS icon composition. Release operations own signing, notarization, packaging evidence, and artifact provenance. QA owns visual and platform verification.

## Product thesis and terminology

This is a logo and native icon workstream, separate from the Bonzai visual styling plan at [`../rebrand-to-bonzai/plan.md`](../rebrand-to-bonzai/plan.md). That plan covers colors, Manrope, and visible product-facing names. This plan covers the visual identity asset itself and the native icon outputs that represent it.

| Term | Meaning | Roadmap treatment |
| --- | --- | --- |
| **Bonzai mark** | The approved graphic symbol supplied by the design owner | Required input, currently unavailable |
| **Bonzai wordmark** | The approved wordmark artwork or wordmark usage direction | Required input if the visible product name uses a graphic wordmark |
| **In-app identity** | Renderer-owned mark, wordmark, app tile, onboarding mark, and approved brand illustrations | In scope after asset approval |
| **Packaged icon** | Tauri-generated PNG, ICNS, ICO, and any still-supported platform outputs | In scope after asset approval |
| **Live Dock icon** | Runtime macOS application icon used by Dock and Cmd-Tab | In scope only with an explicit fixed-icon or variant policy |
| **Technical identity** | Bundle identifiers, storage keys, deep-link schemes, native helper names, updater coordinates, and released artifact names | Out of scope and protected by ADR-0055 unless a later product decision changes them |

A logo replacement changes presentation. It does not by itself create a separate installed product, migrate existing state, or change the technical identity bridge.

## Asset request and blocking gate

### Current blocker

The correct Bonzai logo and icon source files are not available in the current working tree. No production logo replacement can begin until the asset intake gate below is complete. The roadmap must remain **Proposed**, with Phase 0 **blocked**.

The user should request the following from the Bonzai design or brand owner:

### Required source package

- Canonical vector mark in SVG, AI, or an equivalent lossless vector format.
- Canonical wordmark source in vector format, if the wordmark is graphical rather than rendered text.
- A source SVG that is safe for Tauri icon generation, with no external references, remote fonts, scripts, or unsupported filters.
- Light and dark treatments, or a written decision that one treatment is authoritative across both.
- Full-color, one-color, reversed, and small-size guidance where those treatments differ.
- Clear-space, safe-area, minimum-size, and crop rules for the mark and wordmark.
- Approved background and foreground colors, including whether the bundled Bonzai color reference applies to the icon artwork.
- Separate guidance for the in-app mark, sidebar tile, macOS icon, Windows icon, and any tray or helper icon.
- Source dimensions and intended aspect ratios. The icon source must be square or include an explicit square composition rule.
- Usage permission, ownership, license, and provenance for every supplied asset.
- A short changelog or version identifier for the supplied package so generated outputs can be traced back to it.

### Requested decisions with the assets

The asset handoff should answer these questions explicitly:

1. Is the Bonzai mark replacing the Clovy mark everywhere in renderer-owned UI, or only in selected surfaces?
2. Is the wordmark rendered from approved artwork, approved text, or the existing UI font treatment?
3. Is the packaged icon a fixed Bonzai icon, or should appearance presets generate variants?
4. Should the live macOS Dock/Cmd-Tab icon remain fixed to Bonzai even when the user changes the UI accent?
5. Are tray, HUD, onboarding, extension, companion, or helper icons part of this workstream?
6. Are there legal or accessibility constraints on using the mark at small sizes or on dark backgrounds?
7. Is a monochrome fallback required for platform contexts that do not preserve full color?

### Rejection conditions

The following are not sufficient as production source without explicit approval:

- a screenshot, web page crop, or favicon alone;
- a raster image without a lossless master or small-size guidance;
- a recolored Clovy mark presented as Bonzai's identity;
- an asset with unknown ownership or an unclear license;
- an SVG that depends on unavailable fonts, remote resources, scripts, or linked files;
- a single desktop PNG with no macOS, Windows, or alpha-channel requirements;
- a branch-only fixture whose provenance is not accepted by the design owner.

The branch-only fixture at `origin/claude/whitelabel-implementation-nqe5ds` contains a raster-derived Bonzai icon under `branding/bonzai/icons/`, but the branch documentation explicitly prefers a real vector source and identifies the raster source as unsuitable for final production without a proper vector master. Treat it as implementation evidence and a temporary visual reference only, not as the approved asset package.

## Roadmap status

**This table is the single source of truth for this roadmap's phase status.** Detailed phase headings below repeat the same statuses. Vocabulary is `not started` | `in progress` | `done` | `blocked` | `deferred`.

| Phase | Status | Exit criterion | Evidence or blocker |
| --- | --- | --- | --- |
| 0: asset intake and provenance | **blocked** | The approved Bonzai source package, usage rights, platform guidance, and identity decisions are received and reviewed | Correct logo/icon files are not currently available; no implementation should start from the raster fixture or a guessed mark |
| 1: identity contract and asset matrix | **not started** | Product, design, desktop, and release owners accept the mark, wordmark, treatments, surface inventory, and technical-identity boundary | Depends on Phase 0 and a written decision about fixed versus accent-variant native icons |
| 2: renderer asset integration | **not started** | In-app mark, wordmark, app tile, onboarding, and approved renderer surfaces use the accepted Bonzai assets without changing layout or component contracts | Depends on approved assets and an inventory of current Clovy asset consumers |
| 3: packaged icon generation and native integration | **not started** | Tauri-generated platform assets and any accepted runtime macOS icon path use the approved Bonzai source, while the default Clovy build remains unchanged | Depends on Phase 1's build-selection policy, source SVG validation, generated asset checks, and platform runners |
| 4: visual, platform, and regression evidence | **not started** | In-app and packaged identity evidence passes light/dark, small-size, platform, default-build, and technical-identity checks | Requires real generated artifacts and macOS/Windows verification; `tauri:dev` alone is insufficient for packaged icon evidence |
| 5: packaged Bonzai product identity and release | **deferred** | Separate installation, bundle identity, updater, signing, release hosting, and co-installation have their own approved product and release gate | Native logo replacement alone does not make a production Bonzai product or authorize technical identity changes |

## Goals

- Obtain an approved and traceable Bonzai vector asset package before changing any production logo or icon.
- Replace renderer-owned Clovy marks and wordmarks only where the accepted identity matrix says Bonzai should appear.
- Generate Tauri platform icon outputs from the accepted source rather than hand-editing derived PNGs.
- Make the live macOS Dock/Cmd-Tab behavior deliberate instead of allowing appearance preset changes to silently restore a Clovy icon.
- Preserve the default Clovy build, its technical compatibility bridge, and its current native identity unless a separate decision changes them.
- Produce visual, asset, and packaged evidence that can be traced to the exact approved source package.
- Keep the work mergeable with the existing additive branding direction rather than scattering brand-specific files through shared code.

## First-release non-goals

- Creating or guessing the Bonzai mark or wordmark.
- Replacing the correct source asset with the existing raster-derived branch fixture without approval.
- Changing the Tauri bundle identifier, product identity contract, deep-link schemes, storage keys, credential namespaces, updater endpoint, updater public key, helper names, or released artifact coordinates.
- Creating a separate install, updater feed, signing identity, releases repository, OS Accounts client, or Bonzai deployment.
- Recoloring the Clovy character, primary identity actions, recording signal, or unrelated illustrations merely because the icon changes.
- Changing typography, spacing, layout, components, radius, shadows, motion, or icon geometry outside the supplied asset composition.
- Adding a runtime brand picker or a multi-brand binary.
- Redrawing or simplifying the mark for small sizes without design approval.
- Treating `tauri:dev`, a browser preview, or a local PNG inspection as proof of packaged Finder, Dock, Cmd-Tab, installer, taskbar, signing, or notarization behavior.
- Creating an ADR, Issue, signing key, updater key, release repository, or external registration as part of roadmap authoring.

## Existing architecture and reusable seams

This section is an inventory for later implementation, not authorization.

### Base icon and Tauri bundle

- `src-tauri/icons/clovy-app-icon.svg:1-45` is the current canonical square icon source, including its dark tile, Clovy mark, gradients, and shadows.
- `scripts/generate-icons.mjs:1-35,200-212` invokes the Tauri icon generator to produce the base platform set from the source SVG.
- `package.json:30` exposes the regeneration command as `pnpm icons`.
- `src-tauri/tauri.conf.json:123-131` supplies the generated PNG and ICNS outputs to the Tauri bundle. The current config also has the existing Clovy product name and technical identifier at `:3-5`.
- The generated asset directory includes macOS iconset files, `icon.icns`, Windows `icon.ico`, PNG sizes, and platform folders. Treat generated outputs as derived files and keep the approved source as the reviewable authority.

### Themed Dock and Cmd-Tab behavior

- `src-tauri/icons/themed/_src/icon.template.svg:1-45` is the current template for accent-themed macOS icons.
- `scripts/generate-icons.mjs:14-22,64-76,164-173,214-256` reads the five `BRAND_PRESETS`, derives themed tile and mark colors, renders 1024px themed PNGs, and removes stale variants.
- `src-tauri/src/theme_icon.rs:1-19` embeds the themed PNGs and maps runtime brand ids to them. Unknown ids fall back to the Sage icon.
- `src/lib/brand.ts:135-149` calls the Tauri `set_dock_icon` command after an appearance change. This means a Bonzai build needs an explicit policy so a user-selected accent cannot silently replace a fixed Bonzai Dock icon with a Clovy-themed asset.

The recommended policy is a fixed Bonzai native icon for a Bonzai build, with UI appearance accents independent from the native icon. If accent variants are required, they must be generated from the approved Bonzai mark and tested as a complete set.

### Renderer-owned identity

- `src/components/brand/ClovyLogo.tsx:3-23,30-44,59-93` owns the current Clovy mark and wordmark geometry, gradients, labels, and accessible titles.
- `src/components/brand/ClovyLogo.tsx:97-111` owns the compact app tile used in renderer-owned surfaces.
- `src/styles/app.css:8986-9004` styles `.clovy-app-tile`, including its current Clovy pine tile and lime mark treatment.
- Current user-facing name consumers must be inventoried separately from technical identifiers. The visual styling plan already covers visible Bonzai copy; this plan covers the graphic mark and icon assets.

### Branch-only additive branding evidence

The whitelabel branch documents an additive `branding/<brand-id>/` layer and a separate Tauri override. Its instructions say to generate a real icon set from a source SVG, that all icon PNGs must be RGBA, and that a real packaged `tauri:build` is authoritative for icon verification. Those instructions are useful architecture evidence, but the branch is not current `HEAD` and its raster-derived Bonzai fixture is not an approved source package.

### Accepted identity boundaries

- ADR-0055 preserves Clovy canonical naming through a compatibility bridge and retains immutable June-era bundle, executable, updater, permission, and released identities until verified retirement gates are met.
- The logo workstream may change renderer presentation and a build-selected packaged icon only after an explicit identity matrix is accepted. It must not rename technical compatibility values by implication.
- ADR-0054's additive branding doctrine favors brand-specific assets and build composition over in-place replacement of shared defaults.
- ADR-0001 makes an updater endpoint and public key permanent for each shipped build. This plan does not provision or change them.

## Proposed first-version experience

After the asset gate is complete, the Bonzai presentation should show one coherent approved mark wherever the accepted surface matrix says the product identity is visible:

- the sidebar and app tile use the approved mark treatment;
- any visible wordmark uses the approved wordmark or approved rendered-name direction;
- onboarding and approved identity surfaces do not mix Clovy and Bonzai marks accidentally;
- a Bonzai packaged build uses the approved native icon set in Finder, Dock, Cmd-Tab, installer, and taskbar contexts; and
- a fixed Bonzai native icon remains stable when the user changes the UI appearance accent, unless the contract explicitly chooses generated variants.

The default Clovy build retains its current source SVG, generated outputs, in-app mark, and native icon behavior. The first implementation must be able to prove which build selection produced each asset.

## Invariants

- **Asset provenance invariant:** every production asset traces to an approved source package, version, owner, license, and checksum or equivalent immutable reference.
- **Source-of-truth invariant:** derived PNG, ICNS, ICO, and platform outputs are regenerated from the accepted source; hand-edited generated outputs are not the authority.
- **Default-build invariant:** an unset brand selection continues to produce the current Clovy renderer assets and packaged icon outputs.
- **Presentation invariant:** approved Bonzai marks replace Clovy marks only in the explicitly accepted surface inventory. Technical identifiers remain classified separately.
- **Platform invariant:** every supported platform receives the right dimensions, color mode, alpha behavior, safe area, and treatment for its context.
- **Native-icon invariant:** a Bonzai build does not silently fall back to a Clovy-themed Dock/Cmd-Tab icon after a UI accent change.
- **Accessibility invariant:** small-size, reversed, monochrome, and contrast treatments remain legible and are not conveyed only through color.
- **Compatibility invariant:** bundle identifiers, storage keys, deep links, updater coordinates, helper identities, protocol fields, and released artifact names remain unchanged unless a later product decision explicitly changes them.
- **Build invariant:** asset selection is deterministic and inspectable in CI and in a real packaged build. No local filesystem path or user-provided runtime input selects the production icon.
- **Evidence invariant:** browser or `tauri:dev` previews do not substitute for packaged Finder, Dock, Cmd-Tab, taskbar, installer, signing, or notarization evidence.

## Implementation phases

### Phase 0: asset intake and provenance

**Status: blocked.**

Request the approved source package listed above. Record the package version, source owner, permission, license, supplied formats, checksums, platform guidance, and explicit decisions about in-app marks, wordmarks, native icons, and accent variants.

Do not create a placeholder asset or edit `src-tauri/icons/clovy-app-icon.svg`. Do not promote the branch-only raster fixture to production source.

**Exit criterion:** the correct Bonzai source files and usage rights are present in a reviewable location, the asset package passes the source-format checks, and design/product owners accept the asset and platform matrix. Until then this phase remains blocked.

### Phase 1: identity contract and asset matrix

**Status: not started.**

Build a surface matrix that names every renderer and native consumer, the approved Bonzai treatment, the source file, and the expected generated output. Decide whether a Bonzai build uses a fixed native icon or generated accent variants. Classify each current Clovy and June value as presentation, compatibility, historical, or immutable technical identity.

**Exit criterion:** design, product, desktop, and release owners accept the surface matrix, fixed-versus-variant native policy, small-size guidance, and technical-identity boundary. Evidence is a reviewed matrix and source package reference.

### Phase 2: renderer asset integration

**Status: not started.**

Replace only the approved renderer-owned marks and wordmarks using the accepted source or generated asset path. Update accessible labels and titles consistently, preserving layout, component contracts, sanctioned icon rules, and the visual styling plan's Manrope and color decisions. Keep the default Clovy path intact.

**Exit criterion:** every approved renderer surface shows the correct Bonzai mark or wordmark, no unapproved Clovy mark remains in the accepted inventory, and technical strings are unchanged. Evidence is focused UI tests, asset references, and light/dark screenshots.

### Phase 3: packaged icon generation and native integration

**Status: not started.**

Generate platform outputs from the approved source using the Tauri icon pipeline. Integrate them through an additive build-selected configuration rather than overwriting the default Clovy icon source. If live macOS Dock/Cmd-Tab behavior is included, implement and test the fixed-icon or variant policy through the existing runtime seam.

**Exit criterion:** the selected Bonzai build contains valid RGBA PNG, ICNS, ICO, and any required platform outputs; runtime icon behavior follows the accepted policy; and the default Clovy build remains byte- or behavior-equivalent where required. Evidence is generated asset verification and a real packaged build.

### Phase 4: visual, platform, and regression evidence

**Status: not started.**

Verify in-app renderer surfaces in light and dark themes, small-size legibility, reversed and monochrome treatments, transparent edges, and no accidental Clovy/Bonzai mixing. Verify a real packaged macOS app in Finder, Dock, and Cmd-Tab and a real Windows artifact in installer, taskbar, and app metadata contexts. Test the default Clovy build separately.

**Exit criterion:** design, product, desktop, QA, and release owners accept dated evidence for every supported context, including asset hashes, source package version, build selection, platform, and technical-identity regression results.

### Phase 5: packaged Bonzai product identity and release

**Status: deferred.**

Separate installation, bundle identifier, deep-link identity, credential isolation, updater, signing, release hosting, support, and co-installation remain a later product and release workstream. A correct logo package does not authorize those changes.

**Exit criterion:** deferred product identity and release work has its own owner, contract, and acceptance gate.

## Verification strategy

### Asset intake

- Confirm the source package contains approved vector master files and no unresolved external references.
- Record file hashes, package version, owner, license, permission, and source date.
- Validate square icon composition, safe area, alpha, color profile, and small-size guidance.
- Confirm the supplied source renders consistently in the approved design tooling and the pinned Tauri generation path.
- Reject raster-only or unknown-provenance substitutions unless the design owner explicitly accepts them as temporary.

### Deterministic generation

- Run the repository icon generation command against the approved source and verify all expected outputs are present.
- Verify PNGs are RGBA and have the required dimensions.
- Verify ICNS and ICO outputs contain the expected sizes and do not reference the Clovy source.
- Verify stale Bonzai or Clovy themed variants cannot be selected accidentally.
- Verify the generated output is reproducible from the source package and build selection.
- Test runtime macOS icon mapping for fixed Bonzai and every accepted accent variant, or prove the runtime path is bypassed for a fixed icon.

### Renderer and accessibility

- Test the sidebar app tile, wordmark, onboarding, settings, HUD, and any other accepted renderer consumers.
- Verify accessible names and SVG titles say Bonzai where the surface is presentation-facing.
- Verify the mark remains legible at compact sizes, in dark mode, on inverse surfaces, and in any monochrome treatment.
- Verify no layout or component contract changes were smuggled into the asset replacement.
- Verify the default Clovy renderer still uses the current mark and labels where the product contract requires them.

### Packaged platform evidence

- Build a real Bonzai `.app` and inspect Finder, Dock, and Cmd-Tab identity. Do not use `tauri:dev` as the final icon proof.
- Build the supported Windows installer or packaged artifact and inspect taskbar, installer, executable metadata, and icon resources.
- Record build commit, brand selection, source package version, asset hashes, platform, signer, and artifact hashes without storing private signing material.
- Test install and launch from a clean machine or isolated test environment where possible.
- Verify default Clovy packaging separately and confirm no Bonzai asset leaks into the default build.

## Open questions and decision gates

1. **Which approved Bonzai source package should be used?**

   The correct files are currently unavailable. This is the blocker for Phase 0. Request the vector mark, wordmark source, platform exports or generation guidance, usage rights, provenance, and versioned package.

2. **Is the supplied mark a vector master or only a reference image?**

   The branch fixture is raster-derived from a favicon. A production icon should prefer a real vector master so small-size and platform outputs are controllable and reproducible.

3. **Should the wordmark be artwork or rendered Manrope text?**

   This changes asset intake, localization, accessibility, and font-loading behavior. Resolve with the design owner before renderer integration.

4. **Should the Bonzai native icon be fixed or follow UI appearance accents?**

   The current Clovy runtime swaps themed Dock icons when the appearance accent changes. The recommendation is a fixed Bonzai native icon for a Bonzai build so the native identity does not silently revert to a Clovy icon.

5. **Which renderer surfaces are in scope?**

   At minimum, decide sidebar tile, wordmark, onboarding, settings, HUDs, and any extension or companion surfaces. Do not infer scope from the existence of a current Clovy asset consumer.

6. **Does this work include technical package identity?**

   The recommendation is no. Bundle identifiers, deep links, updater coordinates, helper identities, storage keys, and released artifact names remain under ADR-0055 and the later packaged-product plan.

7. **Which platforms are release targets for this icon package?**

   Confirm macOS and Windows first, then decide whether Android, iOS, tray, extension, and helper outputs are still maintained and need Bonzai assets.

8. **What is the acceptance bar for small sizes and accessibility?**

   Decide minimum mark size, contrast, monochrome fallback, reversed treatment, alpha edges, and whether the mark must remain recognizable without its background tile.

## ADR and Issue follow-ups

This roadmap creates none of these records. When the source package arrives and implementation is scheduled, consider:

- an implementation Issue for asset intake validation and the approved surface matrix;
- an implementation Issue for renderer-owned mark and wordmark replacement;
- an implementation Issue for generated packaged icon integration and native Dock policy;
- an ADR only if fixed versus variant native icon behavior or presentation versus technical identity creates a hard-to-reverse, surprising trade-off under the ADR test in `AGENTS.md`;
- a later release Issue for signing, notarization, updater, and packaged co-installation evidence; and
- a legal or design review record for asset ownership and usage permission if the supplied package requires it.

Do not reserve an ADR number, create an Issue, create assets, or provision release infrastructure as part of this roadmap document.

## Explicit future ideas and follow-ups

- Obtain a real vector Bonzai mark and wordmark package from the design owner.
- Add small-size and monochrome variants only if the approved brand guide requires them.
- Decide whether the same Bonzai mark should be applied to extension, helper, companion, tray, and mobile outputs.
- Revisit the current themed Dock icon mechanism after the fixed-versus-variant decision.
- Keep the existing Clovy asset set available for the default build and rollback paths.
- Reconcile the separate logo plan with the broader visual styling plan before implementation begins, without merging their scopes or silently changing either status.

## Decision summary

The correct next step is an asset request, not an implementation. The Bonzai logo replacement remains Proposed and Phase 0 blocked until an approved, provenance-traceable vector source package and platform usage contract arrive. After that gate, integrate the mark through renderer-owned asset seams and generate packaged native icons through the Tauri pipeline, with a deliberate fixed Bonzai Dock/Cmd-Tab policy. Preserve the default Clovy build and all technical compatibility identities. No implementation, Issue, ADR, asset creation, commit, or push is part of this roadmap plan.
