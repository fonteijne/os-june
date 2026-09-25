# Roadmap: Bonzai styling migration

**Owner:** Product, design, and desktop engineering  
**Date:** 2026-09-25  
**Status:** Proposed  
**Scope:** A colors-only Bonzai styling MVP built on Clovy's existing semantic color and theme pipeline. Typography, spacing, components, geometry, motion, assets, native identity, inference, account behavior, packaging, and release operations are deferred.

This document captures product and architecture direction. It is not implementation authorization, an ADR, a launch commitment, an Issue, or a release approval. File paths and token mappings are a starting inventory and must be re-verified against the current tree when implementation is scheduled. This roadmap does not change runtime code, add commands, change protocols, register external resources, create credentials, or change accepted ADRs.

## Executive recommendation

Adopt the supplied Bonzai design reference as a **semantic color direction only** and map its light and dark color roles into Clovy's existing token pipeline. Keep the ordinary Clovy build and its current default behavior unchanged until a separate product decision authorizes a build-selected Bonzai presentation. Do not import the bundled component system or turn a color migration into a broad visual rewrite.

The first MVP should:

1. approve a small light/dark color-token matrix from the bundled design-system export;
2. map those roles to existing Clovy semantic tokens rather than styling individual components;
3. preserve Clovy identity-led colors, status semantics, and native assets unless an explicit exception is approved;
4. keep runtime, pre-paint, and accepted secondary-window color behavior synchronized without a palette flash; and
5. prove the result in the live styleguide and representative app surfaces, with contrast and unchanged-scope evidence.

The separate Bonzai product identity, co-installation, inference, account, signing, updater, and release program remains later work. A colors-only result must not be described as a packaged Bonzai product.

### Ownership flow

```text
Design owner
    |
    | approves light/dark semantic color roles and identity exceptions
    v
Clovy design-token owner
    |
    | maps approved roles into tokens.css and existing theme semantics
    v
Desktop owner
    |
    | keeps runtime, pre-paint, and accepted secondary windows in sync
    v
QA and design review
    |
    +--> styleguide swatches and representative app surfaces
    +--> light/dark contrast and focus evidence
    +--> unchanged typography, spacing, component, and geometry audit
```

Product and design own the reference and color contract. Frontend and design-system owners own semantic token composition and styleguide evidence. Desktop engineering owns only the runtime and pre-paint seams needed for color selection and synchronization. QA owns visual, accessibility, and regression evidence. No backend, Bonzai inference, account, or release owner is required for this MVP.

## Product thesis and terminology

Bonzai has two meanings in the repository and this roadmap keeps them separate:

| Term | Meaning in the current repository | Roadmap treatment |
| --- | --- | --- |
| **Bonzai** as inference | The fork's external managed inference deployment and routing baseline | Existing foundation, not part of this styling MVP |
| **Bonzai** as styling | A proposed user-facing color treatment informed by the bundled design reference | Current roadmap scope, implemented additively through Clovy semantic colors |
| **Clovy** | The canonical user-facing product and source terminology | Preserve as the default build and identity baseline |
| **June** | Released technical identities and compatibility aliases retained by ADR-0055 | Preserve wherever compatibility requires them |
| **Clovy identity colors** | Fixed character, mark, and identity-led action colors in the current token system | Keep outside the MVP unless the approved color contract names a specific exception |

The Bonzai styling MVP is not a generic Clovy rename and does not imply that Bonzai inference, Bonzai keys, no-account behavior, or a separate deployment is being changed. It changes color roles only.

## Design-system reference and source boundary

The external design-system reference supplied for this roadmap is:

<https://claude.ai/artifact/DAyXiJMkD4NA3wHYBK6Hjp>

This API-token session could not authenticate to read the external Artifact URL directly. The repository contains the inspectable export added under:

`docs/roadmap/rebrand-to-bonzai/iodigital-design-system/`

The narrow color contract is `iodigital-design-system/tokens.json:4-144`. Its provenance metadata is in `iodigital-design-system/design-system.json:1`. The generated CSS mirrors the color values at `iodigital-design-system/tokens.css:3-59`, but that file also contains a Google Fonts import and non-color tokens later in the file, so it is reference material rather than an import target.

The reference's color guidance is `iodigital-design-system/README.md:14-23`:

- surfaces and text are monochrome first;
- accent is the only hue and is spent on primary emphasis, links, focus, and one highlight rather than broad section backgrounds;
- contrast moments use inversion rather than saturated fills;
- success and danger must be paired with a word or icon; and
- light and dark themes use distinct accent and foreground pairings.

The bundled export is a roadmap reference, not implementation authorization. Its typography, spacing, shape, motion, imagery, icon, logo, and component material is explicitly excluded below. In particular, `README.md:25-60`, `tokens.css:60-93`, `design-system.json:146-387`, and `components/bundle.css` must not be ported wholesale.

## Color contract from the bundled reference

These roles and values are the candidate design input for Phase 1. They are not an instruction to replace an identically named Clovy token without reviewing its current consumers.

| Role | Light | Dark | Intended use from the reference |
| --- | --- | --- | --- |
| `surface` | `#ffffff` | `#0a0a0a` | Default page ground |
| `surface-alt` | `#f4f4f2` | `#151515` | Alternating surface or calm card fill |
| `surface-raised` | `#ffffff` | `#1c1c1c` | Raised card or input surface |
| `surface-inverse` | `#0a0a0a` | `#f4f4f2` | Inverted contrast band |
| `ink` | `#0a0a0a` | `#f4f4f2` | Primary text and icons |
| `ink-muted` | `#595959` | `#a6a6a6` | Secondary text, metadata, and captions |
| `ink-inverse` | `#ffffff` | `#0a0a0a` | Text and icons on inverse surfaces |
| `line` | `#e2e2df` | `#2b2b2b` | Quiet hairlines and outlines |
| `line-strong` | `#8a8a8a` | `#6b6b6b` | Stronger input and secondary-control boundary |
| `accent` | `#365fd9` | `#8aa4f2` | Primary accent, links, active states, and focus |
| `accent-hover` | `#2a4bb3` | `#a9bdf6` | Hover and pressed accent state |
| `accent-soft` | `#e9eefc` | `#172240` | Quiet ground behind accent content |
| `on-accent` | `#ffffff` | `#0a0a0a` | Text and icons on accent fills |
| `focus` | `accent` | `accent` | Focus ring role |
| `success` | `#1b7446` | `#5ccf92` | Positive status with a word or icon |
| `danger` | `#b93c0a` | `#ff9a6b` | Error or destructive status with a message |

The final matrix must confirm contrast in Clovy's actual surfaces and decide whether each role is a direct replacement, a derived value, an alias, or intentionally not used. The reference values must not be copied into arbitrary component rules or into the fixed Clovy identity palette.

## Roadmap status

**This table is the single source of truth for this roadmap's phase status.** Detailed phase headings below repeat the same statuses. Vocabulary is `not started` | `in progress` | `done` | `blocked` | `deferred`.

| Phase | Status | Exit criterion | Evidence or blocker |
| --- | --- | --- | --- |
| 0: baseline and colors-only boundary | **done** | Current token architecture, bundled reference, dirty-tree boundary, and explicit exclusions are recorded | Existing Clovy design docs and token files were inspected; the bundled reference is present under the roadmap folder; external Artifact authentication remains unavailable in this session |
| 1: design artifact and token contract | **not started** | Design owner approves the light/dark role matrix, Clovy semantic mapping, fixed-identity exceptions, HUD scope, and contrast thresholds | Candidate roles are available in `iodigital-design-system/tokens.json:15-143`; approval and consumer-by-consumer classification are still required |
| 2: semantic color implementation | **not started** | Approved roles are implemented through the existing token layer without geometry, typography, spacing, component, or motion changes | Depends on Phase 1; shared-file edits must follow existing design-token and additive-branding constraints |
| 3: runtime and pre-paint synchronization | **not started** | Accepted main-window, pre-paint, and secondary-window color paths render the same selected palette without a flash or accidental identity side effect | Depends on whether Bonzai is build-selected, runtime-selectable, or only a token treatment; `brand.ts`, `index.html`, and HUD behavior need an explicit decision |
| 4: visual, accessibility, and regression evidence | **not started** | Light and dark styleguide and app evidence meet contrast and scope invariants, with no unintended non-color changes | Requires an approved matrix, a running styleguide, representative app surfaces, and focused tests |
| 5: packaged Bonzai product identity and release | **deferred** | A later roadmap or implementation decision has an owner and separate acceptance gate for identity, co-installation, inference, account, packaging, and release | Explicitly outside the colors-only MVP; existing additive-branding and release material remains follow-up context |

## Goals

- Apply the bundled reference's monochrome-first color discipline to Clovy's existing semantic color pipeline.
- Define light and dark roles for surfaces, text, lines, accent, focus, success, and danger without inventing a parallel component system.
- Keep foregrounds readable and ensure status meaning is not conveyed by color alone.
- Preserve Clovy's default build behavior and current identity-led color roles unless an approved exception says otherwise.
- Prevent a stale first-paint palette when an accepted build or runtime selection changes the semantic accent.
- Use the live styleguide and representative app surfaces as the visual source of truth for the implementation review.
- Produce a narrow, reviewable color-only change with explicit evidence that excluded styling areas did not move.

## MVP non-goals

The following are explicitly out of scope for the colors-only MVP:

- Typography, font family, font size, line height, font weight, letter spacing, or text hierarchy.
- Spacing, layout, widths, gaps, padding, margins, responsive geometry, or control sizes.
- Components, markup, component APIs, component replacement, or importing the bundled component bundle.
- Radius, border geometry, shadows, elevation, or motion. Color values used by an existing semantic border remain in scope only as color, not as a geometry redesign.
- Icons, logos, imagery, native assets, Dock or Cmd-Tab identity, window titles, bundle identifiers, deep links, helper names, or packaging.
- Inference routing, Bonzai keys, Clovy API behavior, OS Accounts, no-account mode, telemetry, billing, backend deployment, or provider egress.
- Separate installation, credential isolation, local-state migration, updater configuration, signing, release hosting, or support operations.
- A new runtime brand picker or a multi-brand build matrix.
- A blanket replacement of every Clovy or June literal.
- Recoloring the Clovy character, mark, native icon, primary identity actions, or recording signal without an explicit role decision.
- Copying the bundled system's Instrument Sans, marketing type scale, generous spacing scale, pill geometry, icon assumptions, or standalone component API.

## Existing architecture and reusable seams

This section is an inventory for later implementation, not authorization.

### Clovy semantic token system

- `src/styles/tokens.css:30-47` registers `--brand` and `--brand-wash` as animatable colors.
- `src/styles/tokens.css:253-405` defines the light semantic colors, derived brand roles, fixed Clovy identity colors, status colors, and supporting surfaces.
- `src/styles/tokens.css:510-607` defines the dark semantic cascade and its dark-specific foreground, accent, status, border, and shadow values.
- `src/styles/app.css` consumes the semantic roles broadly, so a token-level change should be preferred over per-component edits.
- `spec/design-tokens.md:1-14` requires existing CSS variables before hand-coded color values.

The existing Clovy design system intentionally distinguishes appearance-driven accent roles from fixed identity-led colors. `docs/design/foundations.md:14-65` describes this boundary: `--brand`, `--brand-wash`, `--primary`, and derived roles can follow an appearance accent, while `--clovy-*` and `--primary-action-*` retain Clovy identity treatment. `docs/design/conventions.md:63-83` also requires the pre-paint maps to stay synchronized.

### Runtime and first-paint seams

- `src/lib/brand.ts:25-48` owns the five runtime accent presets, legacy ids, storage key, and default brand.
- `src/lib/brand.ts:117-139` applies `--brand` and `--brand-wash` to the document and may also synchronize the native Dock icon.
- `src/lib/brand.ts:152-164` initializes and synchronizes secondary windows.
- `src/main.tsx:38-40` initializes theme, brand, and font scale.
- `index.html:23-47` duplicates the brand map for pre-paint application. `styleguide.html` carries the corresponding styleguide bootstrap.
- `src/styleguide/StyleguideApp.tsx:25-67` and `src/styleguide/sections/Color.tsx:3-73` provide live theme, brand, and semantic color evidence.

The untracked `src/lib/brand.generated.ts` is not current source of truth. Its generated header refers to a selector script and branding tree absent from current `HEAD`; its Bonzai blue value must not be treated as the approved design-system value merely because the file exists.

### Secondary windows and fixed identity surfaces

The HUD entry points subscribe to brand changes through `src/hud.ts:24-31`, `src/agent-hud.ts:35-52`, and `src/meeting-hud.ts:23-30`. Their stylesheets also contain dedicated dark and identity declarations in `src/styles/hud.css`, `src/styles/agent-hud.css`, and `src/styles/meeting-hud.css`. Phase 1 must decide whether these surfaces participate in the colors-only contract or remain Clovy identity surfaces.

The fixed Clovy palette is in `src/styles/tokens.css:324-337`, the identity-led primary action gradients are in `src/styles/tokens.css:346-362`, and the recording signal begins at `src/styles/tokens.css:364`. These roles require classification before any replacement. Masks, shadows, illustrations, and other raw colors in `src/styles/app.css` should be audited by semantic role, not replaced mechanically.

### Accepted architecture boundaries

- ADR-0054 requires brand-specific values to live in an additive branding/config layer rather than scattered in-place edits.
- ADR-0055 preserves Clovy canonical naming and June-era technical identities through a compatibility bridge.
- ADR-0060 constrains shared-file edits and records a fork touched-line budget. Any implementation must re-check the current ledger before editing shared files.
- The existing Bonzai routing ADRs and `docs/bonzai-implementation-plan.md` govern inference behavior. They are not changed by this styling roadmap.

## Candidate semantic mapping

This is a design-review proposal, not an implementation instruction. The final map must be approved role by role and must account for current consumers.

| Bundled role | Candidate Clovy role | Decision needed |
| --- | --- | --- |
| `surface` | `--background` | Confirm whether the existing brand-washed background should become neutral or remain subtly washed |
| `surface-alt` | `--secondary`, `--muted`, or `--sidebar` | Choose one semantic role per current consumer rather than collapsing distinct surfaces |
| `surface-raised` | `--card` and `--popover` | Confirm raised-surface contrast in both themes |
| `surface-inverse` | Existing inverse or fixed dark surfaces, or a new semantic alias | Identify actual current surfaces before adding a token |
| `ink` | `--foreground`, `--card-foreground`, and `--popover-foreground` | Preserve neutral readable text across themes |
| `ink-muted` | `--muted-foreground` and `--body-copy` | Verify the reference's contrast promise against Clovy's actual surfaces |
| `ink-inverse` | Existing solid and inverse foreground roles | Do not replace fixed Clovy identity foregrounds by name alone |
| `line` | `--border`, `--input`, and quiet border aliases | Keep border geometry unchanged; change only approved color values |
| `line-strong` | Strong input or secondary-control boundary | Confirm current focus and input behavior before mapping |
| `accent` | `--brand` and `--primary` | Decide whether the palette is a build-selected Bonzai default or an appearance preset |
| `accent-hover` | Existing accent hover consumers or a new semantic alias | Avoid adding per-component hover colors |
| `accent-soft` | `--accent`, `--brand-tint`, or a dedicated soft-accent alias | Preserve neutral generic hovers from `docs/design/conventions.md:23-31` |
| `on-accent` | `--primary-foreground` | Confirm dark mode uses the dark foreground from the reference rather than literal white |
| `focus` | `--ring-focus` and `--focus-ring` | Separate the focus color decision from focus geometry, which is out of scope |
| `success` | `--success` | Keep a word or icon with status meaning; do not change layout to satisfy this rule |
| `danger` | `--destructive` | Confirm orange danger treatment and existing destructive contracts |

The mapping must not silently overwrite `--clovy-*`, `--primary-action-*`, `--record`, or native icon colors. A separate approved exception list is required if Bonzai styling is intended to recolor any of those identity-led surfaces.

## Proposed first-version experience

A user should see a calmer, monochrome-first Clovy surface with a restrained Bonzai accent in the roles selected by the approved matrix. The experience is still the existing Clovy application: the MVP does not rename the app, change copy, alter controls, add a branded onboarding path, or expose a Bonzai account or inference contract.

In light and dark themes:

- neutral surfaces and text establish the hierarchy;
- accent is reserved for primary emphasis, links, selected states, focus, and approved highlights;
- accent hover and on-accent values remain theme-specific;
- success and danger retain explicit text or icon context; and
- fixed Clovy character and identity-led action treatment remains unchanged unless Phase 1 records an exception.

The styleguide is the preferred review surface. A standalone sketch is not needed because the uncertainty is token mapping and contrast, not a new interaction or layout.

## Invariants

- **Default-build invariant:** no Bonzai styling selection leaves the ordinary Clovy default behavior and identity changed by accident.
- **Color-only invariant:** the MVP changes semantic color values and required synchronization only. Typography, spacing, components, geometry, motion, shadows, assets, and copy remain unchanged.
- **Theme invariant:** every approved color role has deliberate light and dark values and does not rely on a system-preference fallback that contradicts Clovy's `data-theme` cascade.
- **Token invariant:** visible semantic colors flow through `src/styles/tokens.css` or an explicitly approved additive token layer; no scattered component literals replace the system.
- **Contrast invariant:** text, muted text, accent fills, on-accent content, focus, success, and danger meet the approved contrast threshold in representative light and dark surfaces.
- **Status invariant:** success and danger are never communicated by color alone. Existing words, icons, and state semantics remain present.
- **Identity invariant:** Clovy mark, character, identity-led actions, native icons, and recording signals remain unchanged unless an explicit Phase 1 exception names them.
- **Synchronization invariant:** accepted main-window, pre-paint, styleguide, and secondary-window color paths do not show a stale palette or invoke an unintended native identity side effect.
- **Compatibility invariant:** existing stored appearance ids and legacy mappings continue to behave deliberately; no storage key or June compatibility identity is renamed as part of a color-only change.
- **Evidence invariant:** a green unit test or styleguide swatch is not enough. The phase needs light/dark screenshots, contrast results, and an explicit unchanged-scope audit.

## Implementation phases

### Phase 0: baseline and colors-only boundary

**Status: done.**

The current token architecture, runtime seams, bundled design-system export, and dirty-tree boundary have been inventoried. The external Artifact URL is recorded as provenance but was not directly readable in this API-token session. The roadmap now distinguishes inspectable color reference data from untracked generated artifacts and excludes non-color styling work.

**Exit criterion:** met for roadmap authoring. No runtime or native implementation was performed.

### Phase 1: design artifact and token contract

**Status: not started.**

Before implementation, product and design should approve:

- whether the bundled `tokens.json` export is the accepted review source for the supplied Artifact;
- the light/dark values and role usage in the color contract above;
- the candidate mapping into Clovy's semantic tokens;
- whether `surface-inverse` has an actual current Clovy consumer or needs a new semantic alias;
- whether fixed Clovy identity colors, primary identity actions, recording signals, and HUDs participate;
- whether Bonzai is a build-selected default, a runtime Appearance preset, or only a color-token treatment;
- how existing Appearance storage and legacy ids behave; and
- the contrast threshold and non-color status evidence required for acceptance.

**Exit criterion:** a reviewed color matrix, mapping table, identity exception list, HUD scope decision, and accessibility threshold exist. The evidence is a design review or approved implementation Issue, not a changed status label alone.

### Phase 2: semantic color implementation

**Status: not started.**

Implement only the approved semantic color changes through the existing token boundary. Prefer changing `src/styles/tokens.css` or an additive generated token layer over editing `src/styles/app.css` call sites. Keep the light and dark cascade explicit. Audit raw colors by role and leave masks, shadows, illustrations, system/status colors, and fixed identity colors untouched unless the approved matrix includes them.

The implementation must not import the bundled `tokens.css`, `components/bundle.css`, or `bundle.js`. It must not adopt Instrument Sans, the bundled spacing scale, radius scale, component API, icon guidance, or marketing layout.

**Exit criterion:** a narrow reviewed diff implements only approved semantic color roles and passes the unchanged-scope audit. Evidence includes the final token matrix, diff review, focused tests, and the current ADR-0060 ledger check if shared files are touched.

### Phase 3: runtime and pre-paint synchronization

**Status: not started.**

If Phase 1 selects a build or runtime palette, update only the required runtime color seams:

- keep `src/lib/brand.ts` and the pre-paint maps synchronized;
- preserve deliberate storage compatibility and legacy ids;
- ensure `src/main.tsx` initialization does not flash an unintended accent;
- decide whether `subscribeBrand` and each HUD are in scope; and
- prevent color application from changing the native Dock icon or other identity assets unless that side effect is explicitly accepted.

If the accepted design is a token-only Bonzai build default rather than a runtime preset, document why the existing Appearance preference behavior is preserved or isolated rather than silently changing it.

**Exit criterion:** deterministic tests or equivalent evidence cover unset/default state, explicit Bonzai selection, stored preferences, pre-paint behavior, and every accepted secondary window. No unintended native identity change occurs.

### Phase 4: visual, accessibility, and regression evidence

**Status: not started.**

Review the live styleguide and representative real-app surfaces in light and dark themes. Verify surfaces, text, lines, accent states, focus, success, danger, disabled states, and any accepted inverse surfaces. Confirm status meaning remains available without color perception.

The evidence must also show that typography, spacing, layout, components, control geometry, icons, assets, motion, shadows, copy, and native identity did not change. Use the styleguide rather than a standalone sketch as the primary visual evidence. If browser or native rendering is unavailable, report the validation as blocked rather than claiming visual completion.

**Exit criterion:** dated screenshots or recordings, contrast results, focused test output, and an unchanged-scope report are reviewed. The project remains Proposed until a later decision authorizes implementation and delivery.

### Phase 5: packaged Bonzai product identity and release

**Status: deferred.**

Separate installation, product naming, native identity, icons, deep links, credential and local-state isolation, Bonzai inference packaging, account mode, updater, signing, release hosting, support, and rollback remain follow-up work. They require their own product contract, implementation Issues, and evidence gates. The existing additive-branding ADR and the broader rebrand context remain relevant, but none of that work is implied by completion of the colors-only MVP.

**Exit criterion:** deferred work has an owner and a separate acceptance gate. It must not be marked shipped because a colors-only token change landed.

## Verification strategy

### Documentation and roadmap validation

- Validate local Markdown links from this plan, `docs/roadmap/README.md`, and the Roadmap section of `docs/index.md`.
- Confirm the README row, index annotation, phase table, and detailed phase headings agree on project and phase status.
- Run `git diff --check` and inspect tracked and untracked changes separately.
- Confirm the bundled design-system export remains under the dedicated roadmap folder and is treated as reference data.
- Confirm no implementation, Issue, ADR, commit, or push was created by roadmap authoring.

### Deterministic checks after implementation

- Token-level tests for approved light/dark values and semantic role presence.
- Runtime and pre-paint synchronization tests for accepted brand-selection behavior.
- Secondary-window synchronization tests if HUDs are included.
- Styleguide token rendering and URL-selected theme/brand checks.
- Contrast checks for primary text, muted text, accent text and fills, on-accent content, focus, success, and danger.
- A diff audit proving no typography, spacing, component, geometry, icon, asset, motion, shadow, copy, native, backend, or release changes.
- `UPSTREAM.md` and ADR-0060 checks if shared-file edits are scheduled in the later implementation workflow.

### Visual acceptance

- Render `styleguide.html` in light and dark themes and inspect semantic color swatches.
- Inspect representative surfaces in the real app, including the shell, sidebar, cards, composer accent, selected state, focus state, status state, and any accepted HUD.
- Verify generic rows, navigation, and menus retain neutral hover treatment unless they are already accent-bearing surfaces.
- Verify high-chroma or dark-mode accent behavior uses the approved `on-accent` role rather than a hard-coded foreground.
- Capture screenshots or recordings with the selected theme and build state. Do not use a development window as evidence for native packaging or product identity, which are deferred.

## Open questions and decision gates

1. **Is the bundled export the accepted color source?**

   The external Artifact URL is provenance for the supplied design system, but this session could not authenticate to read it. The repository export is inspectable and has a narrow `tokens.json` color contract. Resolve whether that export is accepted as the review artifact before Phase 2.

2. **Is Bonzai a build-selected color treatment or a runtime Appearance preset?**

   A build-selected default can preserve ordinary Clovy behavior, while a runtime preset affects storage, pre-paint maps, secondary windows, and possibly native icon synchronization. Resolve before changing `src/lib/brand.ts` or the pre-paint maps.

3. **Which Clovy identity surfaces are intentionally fixed?**

   The current system separates `--brand` from `--clovy-*` and `--primary-action-*`. Decide whether the character, identity-led actions, recording signal, and HUDs remain Clovy colors. The recommendation is to keep them fixed for this MVP.

4. **How should `surface-inverse` map into the desktop?**

   The reference uses inversion for contrast bands, but the existing desktop may not have a matching generic role. Adding a new semantic role could affect more than colors if it requires new markup. Resolve whether existing surfaces are enough and keep new layout out of scope.

5. **What contrast threshold and status treatment are required?**

   Approve thresholds for text, muted text, accent fills, focus, success, and danger, and confirm that existing labels or icons carry status meaning without adding new component or layout work.

6. **Which raw colors count as semantic color work?**

   `app.css` and the HUD styles contain raw values for masks, shadows, illustrations, and dedicated dark surfaces. Classify each by role before editing; do not use a blanket hex replacement.

7. **When should later styling and product work begin?**

   Typography, spacing, components, native identity, packaging, inference, account, and release work need separate acceptance decisions. Do not let the MVP create an implicit commitment to a full rebrand.

## ADR and Issue follow-ups

This roadmap creates none of these records. When implementation is scheduled, consider:

- an implementation Issue for the approved semantic color matrix and unchanged-scope acceptance;
- an implementation Issue for runtime/pre-paint synchronization only if Phase 1 selects a build or runtime palette;
- an ADR only if the build-selected versus runtime brand boundary is hard to reverse, surprising without context, and carries a real trade-off under the ADR test in `AGENTS.md`;
- a later product and release decision for separate Bonzai identity, co-installation, account mode, inference ownership, updater, signing, and support; and
- a later evidence Issue for packaged identity and release, independent of this MVP.

Do not reserve an ADR number, create an Issue, or provision an external resource as part of this roadmap document.

## Explicit future ideas and follow-ups

- Review typography against the bundled reference only in a separate, Clovy-spec-compliant design effort.
- Review spacing, layout, radius, shadows, motion, components, iconography, and imagery as separate scopes rather than smuggling them into a color migration.
- Decide whether a Bonzai build should carry an additive branding tree and deterministic build selector.
- Resolve native identity, co-installation, credential namespaces, local state, account mode, inference ownership, updater, signing, release hosting, support, and rollback in a later product roadmap or implementation plan.
- Revisit the external Artifact URL when a Claude account session can authenticate, and reconcile any differences against the bundled export before implementation.
- Keep the untracked generated `src/lib/brand.generated.ts` out of the source-of-truth path until its generator and branding inputs are present on the active branch.

## Decision summary

The recommended path is a Proposed Bonzai styling migration whose MVP changes colors only: approve the bundled design-system color roles, map them into Clovy's existing light/dark semantic token pipeline, preserve fixed Clovy identity colors by default, keep runtime and pre-paint behavior deliberate, and require styleguide, contrast, visual, and unchanged-scope evidence. Typography, spacing, components, geometry, motion, assets, native identity, inference, account behavior, packaging, and release operations remain explicitly deferred. No implementation, Issue, ADR, commit, or push is part of this roadmap update.
