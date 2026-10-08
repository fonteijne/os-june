# Roadmap: Bonzai logo replacement

**Owner:** Product, design, desktop engineering, and release operations  
**Date:** 2026-09-28
**Status:** Proposed  
**Scope:** Replace the Clovy graphic mark across approved renderer, packaged Tauri, live macOS Dock/Cmd-Tab, tray, HUD, helper, and supported platform icon surfaces with an approved Bonzai identity package. A canonical horizontal SVG lockup has been received for intake; the standalone mark, platform treatments, provenance record, and production package are still required. Wordmark replacement remains a separate follow-up.

This document captures product and architecture direction. It is not implementation authorization, an ADR, a launch commitment, an Issue, or a release approval. File paths and asset formats are a starting inventory and must be re-verified when the source package arrives. This roadmap does not create assets, alter native configuration, change technical identities, create credentials, or change accepted ADRs.

## Executive recommendation

Do not start production replacement from the existing Clovy mark, a recolored Clovy mark, or the branch-only raster-derived Bonzai fixture. The received SVG is accepted as the canonical intake candidate, then must be recorded with its package metadata, provenance, rights, and platform contract before implementation. Integrate the approved mark through the existing source and generation seams only after the identity matrix is accepted.

The first release should establish one approved Bonzai graphic mark and permitted treatments for:

1. renderer-owned mark surfaces, including the sidebar app tile, onboarding, settings, provider/referral/update surfaces, styleguide, and accepted secondary windows;
2. the packaged Tauri icon set for macOS and Windows;
3. tray, HUD, helper, extension, companion, and any other supported platform icon outputs selected by the matrix; and
4. the live macOS Dock/Cmd-Tab icon when a Bonzai build is running, using a fixed Bonzai icon independent of UI appearance accents.

The supplied horizontal lockup may be retained as a separately tracked future wordmark input, but it must not be cropped, redrawn, or used as a square native icon source. The first implementation targets the graphic mark only; wordmark replacement requires its own approved source or rendered-text decision.

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
        +--> verify in-app mark surfaces and deferred wordmark boundary
        +--> verify packaged Finder, Dock, Cmd-Tab, taskbar, and installer assets
        +--> verify Clovy default regression and technical identity boundaries
```

Design owns the mark, artwork, source provenance, and permitted usage. Product owns the visible identity contract. Frontend owns renderer-owned marks and wordmarks. Desktop engineering owns Tauri packaging and live macOS icon composition. Release operations own signing, notarization, packaging evidence, and artifact provenance. QA owns visual and platform verification.

## Product thesis and terminology

This is a logo and native icon workstream, separate from the Bonzai visual styling plan at [`../rebrand-to-bonzai/plan.md`](../rebrand-to-bonzai/plan.md). That plan covers colors, Manrope, and visible product-facing names. This plan covers the visual identity asset itself and the native icon outputs that represent it.

| Term | Meaning | Roadmap treatment |
| --- | --- | --- |
| **Bonzai mark** | The approved graphic symbol supplied by the design owner | Canonical horizontal SVG lockup received for intake; standalone mark or approved derivation remains required |
| **Bonzai wordmark** | The approved wordmark artwork or wordmark usage direction | Separate follow-up; the received lockup is not yet an approved first-release wordmark contract |
| **In-app identity** | Renderer-owned mark, app tile, onboarding mark, and approved platform-facing mark surfaces | Full mark-bearing surface package in scope after the identity matrix is accepted |
| **Packaged icon** | Tauri-generated PNG, ICNS, ICO, and any still-supported platform outputs | In scope after approved square mark/composition and build-selection policy |
| **Live Dock icon** | Runtime macOS application icon used by Dock and Cmd-Tab | In scope with the resolved fixed Bonzai icon policy |
| **Technical identity** | Bundle identifiers, storage keys, deep-link schemes, native helper names, updater coordinates, and released artifact names | Out of scope and protected by ADR-0055 unless a later product decision changes them |

A logo replacement changes presentation. It does not by itself create a separate installed product, migrate existing state, or change the technical identity bridge.

## Asset request and blocking gate

### Current intake state

The supplied [`Logo-Bonzai.svg`](Logo-Bonzai.svg) is now stored beside this plan as the canonical intake candidate. Its SHA-256 is `982039721236cc4ae6f9496719214deadbecb5fb7075925a3dce082a548d1005`; it is 39 lines and 12,324 bytes with `viewBox="0 0 154 64"`. It is a horizontal white mark-plus-wordmark lockup with no external references, fonts, scripts, or images. The project-local copy is the reviewable source; the original Downloads location is no longer required.

The file is not yet a complete production identity package: it is not square, supplies only one white treatment, and does not provide a standalone mark, square composition, safe-area/minimum-size rules, platform treatments, or owner/rights/provenance/version metadata. Phase 0 is therefore **in progress**, while the project remains **Proposed**. No production logo replacement should begin until the intake ledger and identity matrix are complete.

The design or brand owner must still supply or approve the following:

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
| 0: asset intake and provenance | **in progress** | The received SVG is recorded as a canonical intake candidate, with package metadata, rights/provenance, source checks, standalone-mark decision, and platform guidance reviewed | Candidate lockup is present, but the external file is not yet a versioned repository package and lacks square mark/composition, treatment guidance, and provenance metadata |
| 1: identity contract and asset matrix | **not started** | Product, design, desktop, and release owners accept the mark-only surface matrix, fixed Bonzai native icon policy, platform treatments, and technical-identity boundary | Depends on Phase 0 and approval of a standalone mark or deterministic derivation; wordmark remains separate |
| 2: renderer asset integration | **not started** | Approved renderer-owned mark surfaces use the Bonzai graphic mark without changing layout or component contracts; wordmark consumers remain intentionally unchanged | Depends on Phase 1 and the current mark-consumer inventory |
| 3: packaged icon generation and native integration | **not started** | Tauri-generated platform assets, tray/HUD/helper outputs, and the live macOS icon path use the approved Bonzai mark with a fixed native policy, while the default Clovy build remains unchanged | Depends on an approved square composition, additive build selection, generated asset checks, and platform runners |
| 4: visual, platform, and regression evidence | **not started** | Mark-only renderer and packaged evidence passes light/dark, small-size, platform, default-build, accent-change, accessibility, and technical-identity checks | Requires real generated artifacts and macOS/Windows/platform verification; `tauri:dev` alone is insufficient for packaged icon evidence |
| 5: packaged Bonzai product identity and release | **deferred** | Separate installation, bundle identity, updater, signing, release hosting, and co-installation have their own approved product and release gate | Native logo replacement alone does not make a production Bonzai product or authorize technical identity changes |

## Goals

- Formalize the received Bonzai SVG as an approved, traceable source package, and obtain or approve a standalone graphic mark for square/platform contexts.
- Replace renderer-owned Clovy marks only where the accepted mark-only identity matrix says Bonzai should appear; keep wordmark replacement separate.
- Generate Tauri platform icon outputs from the accepted square mark/composition rather than hand-editing derived PNGs.
- Make the live macOS Dock/Cmd-Tab behavior deliberate and fixed to Bonzai instead of allowing appearance preset changes to silently restore a Clovy icon.
- Cover the accepted tray, HUD, helper, extension, companion, and other maintained platform mark consumers through the same matrix rather than discovering them during implementation.
- Preserve the default Clovy build, its technical compatibility bridge, and its current native identity unless a separate decision changes them.
- Produce visual, asset, and packaged evidence that can be traced to the exact approved source package.
- Keep the work mergeable with the existing additive branding direction rather than scattering brand-specific files through shared code.

## First-release non-goals

- Creating or guessing the Bonzai mark or wordmark; obtaining a standalone mark or approving a deterministic derivation remains an intake/design gate.
- Replacing the received source package with the existing raster-derived branch fixture without approval.
- Replacing or shipping the horizontal wordmark/lockup in the first mark-only release.
- Cropping, redrawing, simplifying, or recoloring the received horizontal lockup to make a square icon without explicit design approval.
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
- mark-bearing surfaces use the approved graphic mark, while wordmark consumers remain unchanged until a separate wordmark contract is accepted;
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

**Status: in progress.**

Record the project-local `Logo-Bonzai.svg` checksum, dimensions, format checks, source owner, permission, license, provenance, package version, and source date in the intake ledger. Obtain or approve a standalone graphic mark or a deterministic derivation rule, plus square composition, safe-area, minimum-size, alpha, contrast, light/dark, reversed, monochrome, and platform guidance. The horizontal lockup remains separately tracked input for later wordmark decisions.

Do not create a placeholder asset or edit `src-tauri/icons/clovy-app-icon.svg`. Do not promote the branch-only raster fixture to production source, and do not crop or redraw the lockup into a square mark without design approval.

**Exit criterion:** the candidate source and metadata are reviewable and provenance-traceable, a standalone mark or approved derivation is accepted, and design/product owners accept the mark-only surface and platform matrix. Until then this phase remains in progress.

### Phase 1: identity contract and asset matrix

**Status: not started.**

Build a mark-only surface matrix that names every renderer, packaged, tray, HUD, helper, extension, companion, and supported platform consumer; the approved Bonzai treatment; the source file; and the expected generated output. Mark wordmark/lockup consumers as intentionally deferred unless a later contract supplies the wordmark. Adopt the fixed Bonzai native icon policy: UI appearance accents must not select the existing Clovy-themed Dock/Cmd-Tab assets. Classify each current Clovy and June value as presentation, compatibility, historical, or immutable technical identity.

**Exit criterion:** design, product, desktop, and release owners accept the mark-only surface matrix, fixed Bonzai native policy, platform treatments, small-size guidance, wordmark deferral, and technical-identity boundary. Evidence is a reviewed matrix and source package reference.

### Phase 2: renderer asset integration

**Status: not started.**

Replace only the approved renderer-owned graphic marks and app tiles using the accepted standalone source or generated asset path. Cover the accepted sidebar, onboarding, account, settings, provider, referral, update, styleguide, HUD, and other mark-bearing surfaces from the matrix. Keep wordmark consumers intentionally unchanged until a separate wordmark contract is accepted. Update accessible labels and titles consistently, preserving layout, component contracts, sanctioned icon rules, and the visual styling plan's Manrope and color decisions. Keep the default Clovy path intact.

**Exit criterion:** every approved renderer mark surface shows the Bonzai mark, no unapproved Clovy mark remains in the accepted mark inventory, deferred wordmark consumers are documented, and technical strings are unchanged. Evidence is focused UI tests, asset references, accessibility checks, and light/dark screenshots.

### Phase 3: packaged icon generation and native integration

**Status: not started.**

Generate platform outputs from the approved standalone mark or square composition using the Tauri icon pipeline. Integrate them through an additive build-selected configuration rather than overwriting the default Clovy icon source. Apply the fixed Bonzai icon policy to live macOS Dock/Cmd-Tab behavior by preventing the existing appearance-change callback from restoring a Clovy-themed asset. Add the accepted tray, HUD, helper, extension, companion, and other maintained platform outputs through their actual packaging seams.

**Exit criterion:** the selected Bonzai build contains valid RGBA PNG, ICNS, ICO, and any required platform outputs; the fixed Bonzai runtime icon remains stable across UI accent changes; accepted auxiliary surfaces use the approved mark; and the default Clovy build remains byte- or behavior-equivalent where required. Evidence is generated asset verification and a real packaged build.

### Phase 4: visual, platform, and regression evidence

**Status: not started.**

Verify mark-only renderer and auxiliary surfaces in light and dark themes, small-size legibility, reversed and monochrome treatments, transparent edges, accessibility labels, and no accidental Clovy/Bonzai mixing. Verify a real packaged macOS app in Finder, Dock, and Cmd-Tab, a real Windows artifact in installer, taskbar, and app metadata contexts, and each accepted tray, HUD, helper, extension, companion, or other supported platform context. Exercise UI accent changes and prove the Bonzai native icon remains fixed. Test the default Clovy build separately and show wordmark surfaces remain intentionally deferred.

**Exit criterion:** design, product, desktop, QA, and release owners accept dated evidence for every supported context, including source hash, package version, build selection, platform, auxiliary-surface treatment, accent-change regression, and technical-identity regression results.

### Phase 5: packaged Bonzai product identity and release

**Status: deferred.**

Separate installation, bundle identifier, deep-link identity, credential isolation, updater, signing, release hosting, support, and co-installation remain a later product and release workstream. A correct logo package does not authorize those changes.

**Exit criterion:** deferred product identity and release work has its own owner, contract, and acceptance gate.

## Verification strategy

### Asset intake

- Confirm the received horizontal SVG is the approved vector intake source and contains no unresolved external references.
- Record its SHA-256 (`982039721236cc4ae6f9496719214deadbecb5fb7075925a3dce082a548d1005`), dimensions, package version, owner, license, permission, provenance, and source date.
- Obtain or validate the approved standalone square mark or deterministic square composition, including safe area, alpha, color profile, and small-size guidance.
- Confirm the supplied source renders consistently in the approved design tooling and the pinned Tauri generation path.
- Reject raster-only or unknown-provenance substitutions unless the design owner explicitly accepts them as temporary.

### Deterministic generation

- Run the repository icon generation command against the approved source and verify all expected outputs are present.
- Verify PNGs are RGBA and have the required dimensions.
- Verify ICNS and ICO outputs contain the expected sizes and do not reference the Clovy source.
- Verify stale Bonzai or Clovy themed variants cannot be selected accidentally.
- Verify the generated output is reproducible from the source package and build selection.
- Test the fixed Bonzai runtime icon mapping and prove the runtime path cannot restore a Clovy-themed asset after an appearance accent change.

### Renderer and accessibility

- Test the sidebar app tile, onboarding, settings, HUD, and any other accepted mark-bearing renderer consumers; record deferred wordmark consumers separately.
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

1. **How is the received source package formalized?**

   The canonical intake candidate is [`Logo-Bonzai.svg`](Logo-Bonzai.svg) with SHA-256 `982039721236cc4ae6f9496719214deadbecb5fb7075925a3dce082a548d1005`. Record its owner, permission, license, provenance, source date, and package version before implementation.

2. **Where does the standalone mark come from?**

   The supplied file is a 154x64 horizontal white lockup, not a square source. Obtain an approved standalone mark or written deterministic derivation and square composition rule. Do not crop or redraw it by assumption.

3. **Should the wordmark be artwork or rendered Manrope text?**

   This changes asset intake, localization, accessibility, and font-loading behavior. The first release is mark-only; resolve the wordmark contract before changing wordmark consumers.

4. **Which mark-bearing surfaces are maintained?**

   The selected scope is the full identity package: renderer, packaged, Dock/Cmd-Tab, tray, HUD, helper, extension, companion, and supported platform surfaces. Phase 1 must verify which of these are actually shipped and assign each its treatment.

5. **Does this work include technical package identity?**

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

- Formalize the received vector lockup and obtain or approve a standalone Bonzai mark; resolve the wordmark package separately.
- Add small-size and monochrome variants only if the approved brand guide requires them.
- Decide whether the same Bonzai mark should be applied to extension, helper, companion, tray, and mobile outputs.
- Replace or bypass the current themed Dock icon mechanism for the Bonzai build after the fixed-icon implementation is authorized; keep the default Clovy path intact.
- Keep the existing Clovy asset set available for the default build and rollback paths.
- Reconcile the separate logo plan with the broader visual styling plan before implementation begins, without merging their scopes or silently changing either status.

## Decision summary

The correct next step is to formalize the received SVG intake and complete the standalone-mark and platform contract, not to implement production assets immediately. The Bonzai logo replacement remains Proposed and Phase 0 is in progress: the candidate is a 154x64 horizontal white lockup with a recorded checksum, but the versioned source package, provenance metadata, square mark/composition, and platform treatments remain open. After that gate, integrate the graphic mark across the accepted full identity surface matrix and generate packaged native icons through the Tauri pipeline, with a fixed Bonzai Dock/Cmd-Tab policy. Keep wordmark replacement separate, preserve the default Clovy build and all technical compatibility identities, and do not create an Issue, ADR, asset, commit, or push as part of this roadmap plan.
