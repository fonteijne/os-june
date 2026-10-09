# Roadmap: Bonzai Agent visual styling migration

**Owner:** Product, design, and desktop engineering  
**Date:** 2026-09-25  
**Status:** Proposed  
**Scope:** A narrowly bounded Bonzai Agent visual styling MVP covering semantic colors, Manrope as the UI sans family, and visible Clovy-to-Bonzai Agent product naming. Typography scale, spacing, components, geometry, motion, icons, native identity, Bonzai inference, account behavior, packaging, and release operations are deferred.

This document captures product and architecture direction. It is not implementation authorization, an ADR, a launch commitment, an Issue, or a release approval. File paths and token mappings are a starting inventory and must be re-verified against the current tree when implementation is scheduled. This roadmap does not change runtime code, add commands, change protocols, register external resources, create credentials, or change accepted ADRs.

## Executive recommendation

Adopt the supplied Bonzai Agent design reference as a **bounded visual styling direction**: map its light and dark color roles into Clovy's existing token pipeline, use Manrope as the UI sans family, and update visible product-facing names from Clovy to Bonzai Agent. Keep the ordinary Clovy build's technical identities and behavior unchanged until a separate product decision authorizes a packaged Bonzai Agent product. Do not import the bundled component system or turn this into a broad visual rewrite.

The first MVP should:

1. approve a small light/dark color-token matrix from the bundled design-system export;
2. map those roles to existing Clovy semantic tokens rather than styling individual components;
3. use Manrope through the existing font-token seam without changing the type scale or weight contract;
4. replace visible product-facing Clovy names with Bonzai Agent while preserving technical compatibility identifiers;
5. preserve Clovy identity-led colors, status semantics, and native assets unless an explicit exception is approved;
6. keep runtime, pre-paint, and accepted secondary-window behavior synchronized without a palette or naming flash; and
7. prove the result in the live styleguide and representative app surfaces, with contrast, font, naming, and unchanged-scope evidence.

The separate packaged Bonzai Agent identity, co-installation, Bonzai inference, account, signing, updater, and release program remains later work. This visual styling result must not be described as a packaged Bonzai Agent product.

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
    +--> unchanged type scale, spacing, component, and geometry audit
```

Product and design own the reference and color contract. Frontend and design-system owners own semantic token composition and styleguide evidence. Desktop engineering owns only the runtime and pre-paint seams needed for color selection and synchronization. QA owns visual, accessibility, and regression evidence. No backend, Bonzai inference, account, or release owner is required for this MVP.

## Product thesis and terminology

This roadmap uses two deliberately different names. **Bonzai Agent** is the
whitelabel name presented to users for the Clovy desktop product and its agent
surfaces. **Bonzai** is the technical name of this fork's external managed
LiteLLM model provider and inference deployment. Bonzai Agent continues to use
Bonzai for model inference; it does not rename or replace that provider.

| Term | Meaning in the current repository | Roadmap treatment |
| --- | --- | --- |
| **Bonzai Agent** | The proposed whitelabel, user-facing name for the Clovy desktop product and its agent experience | Use in approved product copy, visible labels, roadmap prose, and presentation sketches |
| **Bonzai** | This fork's external managed LiteLLM model provider and inference deployment | Keep in technical routing, provider, host, egress, and deployment references; not a product-facing replacement for Bonzai Agent |
| **Bonzai key** | The key used by the Bonzai inference deployment for model access and project spend attribution | Keep unchanged in technical settings, keychain, routing, and operational references |
| **Clovy** | The existing product identity and source terminology being given a Bonzai Agent presentation layer | Preserve in compatibility, source, and technical identity references; replace only approved visible product copy |
| **June** | Released technical identities and compatibility aliases retained by ADR-0055 | Preserve wherever compatibility requires them |
| **Clovy identity colors** | Fixed character, mark, and identity-led action colors in the current token system | Keep outside the MVP unless the approved color contract names a specific exception |

The Bonzai Agent visual styling MVP is a deliberate visible presentation change,
not a technical identity migration. It changes semantic colors, the UI sans
family, and approved user-facing product names. It does not rename Bonzai's
LiteLLM provider or inference deployment, Bonzai keys, no-account behavior,
storage, permissions, provider routing, or a separate deployment.

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

The final matrix must confirm contrast in Clovy's actual surfaces and decide whether each role is a direct replacement, a derived value, an alias, or intentionally not used. The reference values must not be copied into arbitrary component rules or into the fixed Clovy identity palette. Manrope should be previewed in these sketches only as a family direction; production font loading, licensing, and token adoption remain implementation gates.

## Roadmap status

**This table is the single source of truth for this roadmap's phase status.** Detailed phase headings below repeat the same statuses. Vocabulary is `not started` | `in progress` | `done` | `blocked` | `deferred`.

| Phase | Status | Exit criterion | Evidence or blocker |
| --- | --- | --- | --- |
| 0: baseline and visual-scope boundary | **done** | Current token architecture, bundled reference, dirty-tree boundary, and explicit exclusions are recorded | Existing Clovy design docs and token files were inspected; the bundled reference is present under the roadmap folder; external Artifact authentication remains unavailable in this session |
| 1: design artifact and presentation contract | **not started** | Design owner approves the light/dark role matrix, Manrope usage, visible-name inventory, fixed-identity exceptions, HUD scope, and contrast thresholds | Candidate color roles are available in `iodigital-design-system/tokens.json:15-143`; font and copy decisions still need review |
| 2: semantic colors and font implementation | **not started** | Approved color roles and Manrope are implemented through existing tokens without changing type scale, weights, spacing, geometry, components, or motion | Depends on Phase 1; shared-file edits must follow existing design-token, font, and additive-branding constraints |
| 3: visible naming and synchronization | **not started** | Approved user-facing Clovy names become Bonzai Agent while technical Bonzai provider and compatibility identifiers remain deliberate; pre-paint and secondary-window surfaces do not flash stale names or colors | Depends on the Bonzai Agent visible-name inventory and the boundary between presentation copy and immutable technical identity |
| 4: visual, accessibility, and regression evidence | **not started** | Light and dark styleguide and app evidence meet contrast, font, naming, and scope invariants, with no unintended non-MVP changes | Requires an approved matrix, running styleguide, representative app surfaces, copy audit, and focused tests |
| 5: packaged Bonzai Agent product identity and release | **deferred** | A later roadmap or implementation decision has an owner and separate acceptance gate for native identity, co-installation, Bonzai inference, account, packaging, and release | Explicitly outside this visual styling MVP; existing additive-branding and release material remains follow-up context |

## Goals

- Apply the bundled reference's monochrome-first color discipline to Clovy's existing semantic color pipeline.
- Use Manrope as the UI sans family through the existing `--font-sans` token, while preserving the existing size, weight, serif, and mono rules.
- Replace visible Clovy product names with Bonzai Agent in approved user-facing presentation surfaces.
- Define light and dark roles for surfaces, text, lines, accent, focus, success, and danger without inventing a parallel component system.
- Keep foregrounds readable and ensure status meaning is not conveyed by color alone.
- Preserve technical compatibility identities, native assets, and current identity-led color roles unless an approved exception says otherwise.
- Prevent stale first-paint colors or names when accepted build or runtime selection changes the presentation.
- Use the live styleguide and representative app surfaces as the visual source of truth for the implementation review.
- Produce a narrow, reviewable visual-styling change with explicit evidence that excluded styling areas did not move.

## MVP non-goals

The following are explicitly out of scope for this visual styling MVP:

- A new typography scale, font sizes, line heights, font weights, letter spacing, or text hierarchy. Manrope is the only font-family change in scope.
- Spacing, layout, widths, gaps, padding, margins, responsive geometry, or control sizes.
- Components, markup, component APIs, component replacement, or importing the bundled component bundle.
- Radius, border geometry, shadows, elevation, or motion. Color values used by an existing semantic border remain in scope only as color, not as a geometry redesign.
- Icons, imagery, native assets, Dock or Cmd-Tab identity, bundle identifiers, deep links, helper names, or packaging.
- Bonzai provider and inference routing, Bonzai keys, Clovy API behavior, OS Accounts, no-account mode, telemetry, billing, backend deployment, or provider egress.
- Separate installation, credential isolation, local-state migration, updater configuration, signing, release hosting, or support operations.
- Renaming technical compatibility identifiers, storage keys, environment variables, protocol fields, native helper identities, package names, or released artifact coordinates. User-facing presentation names are in scope; technical identity migration is not.
- A new runtime brand picker or a multi-brand build matrix.
- A blanket replacement of every Clovy or June literal. Each visible string must be classified as presentation, compatibility, historical, or immutable technical identity.
- Recoloring the Clovy character, mark, native icon, primary identity actions, or recording signal without an explicit role decision.
- Copying the bundled system's Instrument Sans, marketing type scale, generous spacing scale, pill geometry, icon assumptions, or standalone component API.

## Existing architecture and reusable seams

This section is an inventory for later implementation, not authorization.

### Clovy semantic token and font system

- `src/styles/tokens.css:30-47` registers `--brand` and `--brand-wash` as animatable colors.
- `src/styles/tokens.css:253-405` defines the light semantic colors, derived brand roles, fixed Clovy identity colors, status colors, and supporting surfaces.
- `src/styles/tokens.css:510-607` defines the dark semantic cascade and its dark-specific foreground, accent, status, border, and shadow values.
- `src/styles/app.css` consumes the semantic roles broadly, so a token-level change should be preferred over per-component edits.
- `src/styles/fonts.css:9-47` defines the current bundled font faces, and `src/styles/tokens.css:99-103` owns the `--font-sans`, `--font-serif`, and `--font-mono` family tokens. Manrope should replace only the sans family through this seam; the repository must confirm the approved Manrope font source and weights before implementation.
- `spec/design-tokens.md:1-14` requires existing CSS variables before hand-coded color or font values.
- `spec/font-families.md:1-19` currently defines ABC Diatype, Martina Plantijn, and Berkeley Mono as the Clovy family contract. A Manrope change therefore needs a reviewed exception or update to that enforceable rule before implementation.

The existing Clovy design system intentionally distinguishes appearance-driven accent roles from fixed identity-led colors. `docs/design/foundations.md:14-65` describes this boundary: `--brand`, `--brand-wash`, `--primary`, and derived roles can follow an appearance accent, while `--clovy-*` and `--primary-action-*` retain Clovy identity treatment. `docs/design/conventions.md:63-83` also requires the pre-paint maps to stay synchronized.

### Runtime and first-paint seams

- `src/lib/brand.ts:25-48` owns the five runtime accent presets, legacy ids, storage key, and default brand.
- `src/lib/brand.ts:117-139` applies `--brand` and `--brand-wash` to the document and may also synchronize the native Dock icon.
- `src/lib/brand.ts:152-164` initializes and synchronizes secondary windows.
- `src/main.tsx:38-40` initializes theme, brand, and font scale.
- `index.html:23-47` duplicates the brand map for pre-paint application. `styleguide.html` carries the corresponding styleguide bootstrap.
- `src/styleguide/StyleguideApp.tsx:25-67` and `src/styleguide/sections/Color.tsx:3-73` provide live theme, brand, and semantic color evidence.
- `src/main.tsx:38-40` initializes theme, brand, and font scale before the application mounts; the visual-name inventory must cover the main shell, titlebar, settings, onboarding, support, and secondary windows without changing the technical bootstrap identity.
- `docs/roadmap/rebrand-to-bonzai/sketch.html` isolates the reference roles, while `app-colors.html` mirrors the current app shell anatomy for visual review without changing production code.

The untracked `src/lib/brand.generated.ts` is not current source of truth. Its generated header refers to a selector script and branding tree absent from current `HEAD`; its Bonzai blue value must not be treated as the approved design-system value or as a Bonzai Agent product-name source merely because the file exists.

### Secondary windows and fixed identity surfaces

The HUD entry points subscribe to brand changes through `src/hud.ts:24-31`, `src/agent-hud.ts:35-52`, and `src/meeting-hud.ts:23-30`. Their stylesheets also contain dedicated dark and identity declarations in `src/styles/hud.css`, `src/styles/agent-hud.css`, and `src/styles/meeting-hud.css`. Phase 1 must decide whether these surfaces participate in the colors-only contract or remain Clovy identity surfaces.

The fixed Clovy palette is in `src/styles/tokens.css:324-337`, the identity-led primary action gradients are in `src/styles/tokens.css:346-362`, and the recording signal begins at `src/styles/tokens.css:364`. These roles require classification before any replacement. Masks, shadows, illustrations, and other raw colors in `src/styles/app.css` should be audited by semantic role, not replaced mechanically.

### Accepted architecture boundaries

- ADR-0054 requires brand-specific values to live in an additive branding/config layer rather than scattered in-place edits.
- ADR-0055 preserves Clovy canonical naming and June-era technical identities through a compatibility bridge.
- ADR-0060 constrains shared-file edits and records a fork touched-line budget. Any implementation must re-check the current ledger before editing shared files.
- The existing Bonzai routing ADRs and `docs/bonzai-implementation-plan.md` govern the technical provider and inference behavior. They are not changed by this styling roadmap.

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
| `accent` | `--brand` and `--primary` | Decide whether the palette is a build-selected Bonzai Agent default or an appearance preset; this is separate from the technical Bonzai provider |
| `accent-hover` | Existing accent hover consumers or a new semantic alias | Avoid adding per-component hover colors |
| `accent-soft` | `--accent`, `--brand-tint`, or a dedicated soft-accent alias | Preserve neutral generic hovers from `docs/design/conventions.md:23-31` |
| `on-accent` | `--primary-foreground` | Confirm dark mode uses the dark foreground from the reference rather than literal white |
| `focus` | `--ring-focus` and `--focus-ring` | Separate the focus color decision from focus geometry, which is out of scope |
| `success` | `--success` | Keep a word or icon with status meaning; do not change layout to satisfy this rule |
| `danger` | `--destructive` | Confirm orange danger treatment and existing destructive contracts |

The mapping must not silently overwrite `--clovy-*`, `--primary-action-*`, `--record`, or native icon colors. A separate approved exception list is required if Bonzai Agent styling is intended to recolor any of those identity-led surfaces.

## Proposed first-version experience

A user should see a calmer, monochrome-first Bonzai Agent surface with a restrained accent in the roles selected by the approved matrix. The visible UI uses Manrope through the existing sans-family token and presents the product as Bonzai Agent in approved user-facing surfaces. The experience remains the existing Clovy application underneath: the MVP does not alter controls, add a branded onboarding flow, change technical identifiers, or expose a new Bonzai Agent account or Bonzai inference contract.

In light and dark themes:

- neutral surfaces and text establish the hierarchy;
- accent is reserved for primary emphasis, links, selected states, focus, and approved highlights;
- accent hover and on-accent values remain theme-specific;
- success and danger retain explicit text or icon context; and
- fixed Clovy character and identity-led action treatment remains unchanged unless Phase 1 records an exception.

The styleguide is the preferred review surface for token values. The companion sketches show two review layers: `sketch.html` isolates the semantic color field, while `app-colors.html` places those roles on Clovy's actual titlebar, sidebar, note list, note detail, and agent composer anatomy. They are visual studies only and do not authorize production layout or component changes.

## Invariants

- **Default-build invariant:** no Bonzai Agent presentation selection leaves the ordinary Clovy default behavior and identity changed by accident.
- **Visual-scope invariant:** the MVP changes semantic color values, the approved UI sans family to Manrope, approved user-facing product names, and required synchronization only. Type scale, spacing, components, geometry, motion, shadows, assets, and technical identifiers remain unchanged.
- **Theme invariant:** every approved color role has deliberate light and dark values and does not rely on a system-preference fallback that contradicts Clovy's `data-theme` cascade.
- **Token invariant:** visible semantic colors flow through `src/styles/tokens.css` or an explicitly approved additive token layer; no scattered component literals replace the system.
- **Contrast invariant:** text, muted text, accent fills, on-accent content, focus, success, and danger meet the approved contrast threshold in representative light and dark surfaces.
- **Status invariant:** success and danger are never communicated by color alone. Existing words, icons, and state semantics remain present.
- **Identity invariant:** Clovy mark, character, identity-led actions, native icons, and recording signals remain unchanged unless an explicit Phase 1 exception names them; visible wordmarks and labels may change to Bonzai Agent only where the presentation inventory approves them, while technical Bonzai names remain unchanged.
- **Synchronization invariant:** accepted main-window, pre-paint, styleguide, and secondary-window presentation paths do not show stale colors, fonts, or visible names, and do not invoke an unintended native identity side effect.
- **Compatibility invariant:** existing stored appearance ids and legacy mappings continue to behave deliberately; no storage key, protocol field, or June compatibility identity is renamed as part of the visual presentation change.
- **Evidence invariant:** a green unit test or styleguide swatch is not enough. The phase needs light/dark screenshots, contrast results, and an explicit unchanged-scope audit.

## Implementation phases

### Phase 0: baseline and visual-scope boundary

**Status: done.**

The current token and font architecture, runtime seams, bundled design-system export, visible-name boundaries, and dirty-tree baseline have been inventoried. The external Artifact URL is recorded as provenance but was not directly readable in this API-token session. The roadmap distinguishes Bonzai Agent presentation naming from technical Bonzai provider terminology, and limits the MVP to colors, Manrope, and approved visible presentation names.

**Exit criterion:** met for roadmap authoring. No runtime or native implementation was performed.

### Phase 1: design artifact and presentation contract

**Status: not started.**

Before implementation, product and design should approve:

- whether the bundled `tokens.json` export is the accepted review source for the supplied Bonzai Agent design Artifact;
- the light/dark values and role usage in the color contract above;
- the candidate mapping into Clovy's semantic tokens;
- Manrope as the UI sans family, its approved source, and the weights available without changing the type-scale contract;
- the visible-name inventory, including titlebar, sidebar, navigation, settings, onboarding, support, styleguide, and secondary-window copy;
- which Clovy or June strings are presentation copy versus technical compatibility identifiers;
- whether `surface-inverse` has an actual current Clovy consumer or needs a new semantic alias;
- whether fixed Clovy identity colors, primary identity actions, recording signals, and HUDs participate;
- whether Bonzai Agent is a build-selected default, a runtime Appearance preset, or only a presentation treatment, while Bonzai remains the technical inference provider name;
- how existing Appearance storage and legacy ids behave, without conflating an Appearance id with the technical Bonzai provider; and
- the contrast, font-rendering, copy, and non-color evidence required for acceptance.

**Exit criterion:** a reviewed color matrix, Manrope font contract, visible-name inventory, technical-identity exception list, HUD scope decision, and accessibility threshold exist. The evidence is a design review or approved implementation Issue, not a changed status label alone.

### Phase 2: semantic colors and font implementation

**Status: not started.**

Implement only the approved semantic colors and Manrope family through the existing token boundaries. Prefer changing `src/styles/tokens.css`, `src/styles/fonts.css`, or an additive generated layer over editing individual `src/styles/app.css` call sites. Keep the light and dark cascade explicit. Audit raw colors by role and leave masks, shadows, illustrations, system/status colors, and fixed identity colors untouched unless the approved matrix includes them.

Manrope replaces the UI sans family only. Preserve the existing `--fs-*` scale, approved weight values, serif display exceptions, and mono technical identifiers unless a later scope explicitly changes them. Do not import the bundled `tokens.css`, `components/bundle.css`, or `bundle.js`, and do not adopt Instrument Sans, the bundled spacing scale, radius scale, component API, icon guidance, or marketing layout.

**Exit criterion:** a narrow reviewed diff implements only approved semantic colors and Manrope, passes the unchanged-scope audit, and has a confirmed font source and license/provenance. Evidence includes the final token matrix, font contract, diff review, focused tests, and the current ADR-0060 ledger check if shared files are touched.

### Phase 3: visible naming and synchronization

**Status: not started.**

Apply the approved Clovy-to-Bonzai Agent rename only to user-facing presentation surfaces:

- visible titlebar and app-surface labels;
- sidebar wordmark and navigation labels;
- settings, onboarding, help, and support copy;
- styleguide and documentation-facing preview labels where appropriate; and
- accepted secondary-window labels.

Do not rename technical compatibility identities, storage keys, environment variables, protocol fields, native helper identities, package names, bundle identifiers, deep links, updater coordinates, or released artifact names. Keep `src/lib/brand.ts` and pre-paint maps synchronized only if the approved presentation selection needs them. Ensure `src/main.tsx` initialization and accepted secondary windows do not flash stale colors, fonts, or visible names. Prevent presentation changes from changing native icons or other identity assets unless explicitly accepted.

**Exit criterion:** deterministic copy-audit and runtime evidence prove that approved visible Clovy labels render as Bonzai Agent, every retained Clovy, Bonzai, or June string has a classification, technical provider and compatibility paths remain unchanged, and accepted secondary windows are synchronized.

### Phase 4: visual, accessibility, and regression evidence

**Status: not started.**

Review the live styleguide and representative real-app surfaces in light and dark themes. Verify surfaces, text, lines, accent states, focus, success, danger, disabled states, approved inverse surfaces, Manrope rendering, and visible Bonzai Agent names. Confirm status meaning remains available without color perception and that visible text remains sentence case.

The evidence must also show that type scale, spacing, layout, components, control geometry, icons, assets, motion, shadows, technical identifiers, and backend behavior did not change. Use the styleguide and both app-shell sketches as visual review surfaces. If browser or native rendering is unavailable, report the validation as blocked rather than claiming visual completion.

**Exit criterion:** dated light/dark screenshots or recordings, contrast results, font/source review, naming audit, focused test output, and an unchanged-scope report are reviewed. The project remains Proposed until a later decision authorizes implementation and delivery.

### Phase 5: packaged Bonzai Agent product identity and release

**Status: deferred.**

The visible Clovy-to-Bonzai Agent rename, separate installation, product naming beyond copy, native identity, icons, deep links, credential and local-state isolation, Bonzai inference packaging, account mode, updater, signing, release hosting, support, and rollback remain follow-up work. They require their own product contract, implementation Issues, and evidence gates. The existing additive-branding ADR and the broader rebrand context remain relevant, but none of that work is implied by completion of the Bonzai Agent colors-only MVP.

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
- Font-token and font-loading checks proving Manrope is selected without changing the approved type scale or weight contract.
- Visible-name audit tests for approved Bonzai Agent presentation strings and retained technical Bonzai, Clovy, and June compatibility strings.
- Runtime and pre-paint synchronization tests for accepted brand-selection and presentation behavior.
- Secondary-window synchronization tests if HUDs are included.
- Styleguide token rendering and URL-selected theme/brand checks.
- Contrast checks for primary text, muted text, accent text and fills, on-accent content, focus, success, and danger.
- A diff audit proving no type scale, spacing, component, geometry, icon, asset, motion, shadow, technical identity, backend, or release changes.
- `UPSTREAM.md` and ADR-0060 checks if shared-file edits are scheduled in the later implementation workflow.

### Visual acceptance

- Render `styleguide.html` in light and dark themes and inspect semantic color swatches and Manrope in representative text roles.
- Inspect representative surfaces in the real app, including the shell, sidebar, cards, composer accent, selected state, focus state, status state, visible Bonzai Agent names, and any accepted HUD.
- Verify generic rows, navigation, and menus retain neutral hover treatment unless they are already accent-bearing surfaces.
- Verify high-chroma or dark-mode accent behavior uses the approved `on-accent` role rather than a hard-coded foreground.
- Capture screenshots or recordings with the selected theme and build state. Do not use a development window as evidence for native packaging or product identity, which remain deferred.
- Confirm the visible-name audit does not rename technical compatibility strings, native identifiers, storage keys, or released artifact coordinates.

## Open questions and decision gates

1. **Is the bundled export the accepted visual source?**

   The external Artifact URL is provenance for the supplied design system, but this session could not authenticate to read it. The repository export is inspectable and has a narrow `tokens.json` color contract. Resolve whether that export is accepted for Bonzai Agent colors, Manrope direction, and presentation review before Phase 2.

2. **Which Manrope source and weights are approved?**

   The current app bundles ABC Diatype and the enforceable font-family rule names it as the sans voice. Approve the Manrope source, license/provenance, fallback stack, and available weights before changing `src/styles/fonts.css` or the `--font-sans` token. Preserve the existing size and weight contract.

3. **Which visible names become Bonzai Agent?**

   Inventory user-facing labels, wordmarks, titlebar text, onboarding, settings, support, styleguide, and secondary windows. Classify every retained Clovy, Bonzai, or June string as Bonzai Agent presentation copy, technical provider/inference terminology, compatibility, historical, or intentionally visible. Resolve before Phase 3.

4. **Is Bonzai Agent a build-selected visual treatment or a runtime Appearance preset?**

   A build-selected default can preserve ordinary Clovy behavior, while a runtime preset affects storage, pre-paint maps, secondary windows, and possibly native icon synchronization. Resolve before changing `src/lib/brand.ts` or the pre-paint maps. This choice must not rename or reconfigure the technical Bonzai inference provider.

5. **Which Clovy identity surfaces are intentionally fixed?**

   The current system separates `--brand` from `--clovy-*` and `--primary-action-*`. Decide whether the character, identity-led actions, recording signal, and HUDs remain Clovy colors. The recommendation is to keep them fixed for this MVP.

6. **How should `surface-inverse` map into the desktop?**

   The reference uses inversion for contrast bands, but the existing desktop may not have a matching generic role. Adding a new semantic role could affect more than colors if it requires new markup. Resolve whether existing surfaces are enough and keep new layout out of scope.

7. **What contrast threshold and status treatment are required?**

   Approve thresholds for text, muted text, accent fills, focus, success, and danger, and confirm that existing labels or icons carry status meaning without adding new component or layout work.

8. **Which raw colors count as semantic color work?**

   `app.css` and the HUD styles contain raw values for masks, shadows, illustrations, and dedicated dark surfaces. Classify each by role before editing; do not use a blanket hex replacement.

9. **When should later styling and product work begin?**

   Typography, spacing, components, native identity, packaging, inference, account, and release work need separate acceptance decisions. Do not let the MVP create an implicit commitment to a full rebrand.

## ADR and Issue follow-ups

This roadmap creates none of these records. When implementation is scheduled, consider:

- an implementation Issue for the approved semantic color, Manrope, visible-name, and unchanged-scope contract;
- an implementation Issue for runtime/pre-paint synchronization only if Phase 1 selects a build or runtime presentation;
- an ADR only if the technical Bonzai provider versus visible Bonzai Agent identity boundary is hard to reverse, surprising without context, and carries a real trade-off under the ADR test in `AGENTS.md`;
- a later product and release decision for the Bonzai Agent identity, co-installation, account mode, Bonzai inference ownership, updater, signing, and support; and
- a later evidence Issue for packaged identity and release, independent of this MVP.

Do not reserve an ADR number, create an Issue, or provision an external resource as part of this roadmap document.

## Explicit future ideas and follow-ups

- Review typography scale, weights, and display treatments separately; this MVP changes only the sans family to Manrope.
- Review the visible Clovy-to-Bonzai Agent presentation rename through the approved user-facing inventory; the technical Bonzai provider and inference identity remains separate.
- Review spacing, layout, radius, shadows, motion, components, iconography, and imagery as separate scopes rather than smuggling them into this visual migration.
- Decide whether a Bonzai Agent build should carry an additive branding tree and deterministic build selector, without changing the technical Bonzai provider or inference configuration.
- Resolve native identity, co-installation, credential namespaces, local state, account mode, inference ownership, updater, signing, release hosting, support, and rollback in a later product roadmap or implementation plan.
- Revisit the external Artifact URL when a Claude account session can authenticate, and reconcile any differences against the bundled export before implementation.
- Keep the untracked generated `src/lib/brand.generated.ts` out of the source-of-truth path until its generator and branding inputs are present on the active branch.

## Decision summary

The recommended path is a Proposed Bonzai Agent visual styling migration whose MVP changes semantic colors, the UI sans family to Manrope, and approved visible product-facing names. Bonzai Agent is the whitelabel presentation name for Clovy; Bonzai remains the external managed LiteLLM model provider and inference deployment. Map the color roles through Clovy's existing light/dark token pipeline, preserve fixed Clovy identity colors and technical compatibility identities by default, keep runtime and pre-paint behavior deliberate, and require styleguide, font, naming, contrast, visual, and unchanged-scope evidence. Type scale, spacing, components, geometry, motion, assets, native identity, Bonzai inference, account behavior, packaging, and release operations remain explicitly deferred. No implementation, Issue, ADR, commit, or push is part of this roadmap update.
