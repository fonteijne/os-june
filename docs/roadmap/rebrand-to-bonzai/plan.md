# Roadmap: Bonzai Agent visual styling migration

**Owner:** Product, design, and desktop engineering  
**Date:** 2026-09-25  
**Status:** Active — implementation phases 2–3 complete; phase 4 blocked; merge blocked; not released
**Review snapshot:** 2026-10-17

**Scope:** A Bonzai Agent renderer-styling MVP covering semantic colors, local Manrope as the UI sans family, renderer character and action colors (including HUD actions), and visible app/assistant naming. Recording controls and recording/warning indicators retain orange, other status colors retain their semantic roles, and the HUD status/attention graphic mark remains lime. Typography scale, spacing, components, geometry, motion, graphic mark/wordmark artwork, native icon identity, Bonzai inference, account behavior, packaging, and release operations are deferred.

This document records the scope and decisions for the Bonzai Agent renderer-styling MVP. It does not authorize a release, change technical identities, add commands, alter protocols, register external resources, or create credentials. The implementation, automated test results, and Chromium inspection of styleguide and HUD screenshots are recorded below. Native Tauri launch was unsuccessful, so this does not claim a full-app screenshot review; phase 4 remains blocked on native-launch and in-app visual evidence. The proposed dated addendum to ADR-0055 remains unaccepted pending formal product/design review, and ADR-0060 policy reconciliation is a separate merge blocker.

## Executive recommendation

Apply the supplied Bonzai Agent design reference as a **Bonzai-fork renderer palette**: map its light and dark roles into the existing token pipeline, use the supplied locally licensed Manrope as the UI sans family, remove only the five selectable color presets and force the Bonzai palette, and update user-facing app/assistant names. The renderer character and blue primary actions, including non-recording HUD actions, use the approved Bonzai blue. Controls that start, stop, keep, or otherwise change a recording and warning controls retain orange; other status colors remain semantic, and the HUD status/attention graphic mark remains lime. Keep packaged native icons, graphic mark, path-drawn wordmark, and technical compatibility identities unchanged; do not select or change the Dock/Cmd-Tab icon at runtime. Do not import the bundled component system or broaden this into a layout/typography rewrite.

The first MVP should:

1. apply the approved light/dark color-token matrix from the bundled design-system export;
2. map those roles into existing Clovy semantic tokens rather than styling components individually;
3. use the supplied local Manrope variable font through the existing font-token seam without changing type scale or allowed weights;
4. replace user-facing app and assistant names with Bonzai Agent in renderer copy and native menu labels, while preserving `pkg_info.productName`, bundle identifiers, native icon assets, and all other technical/service identifiers;
5. apply the approved Bonzai renderer palette to the living character and blue primary actions, including non-recording HUD controls, while preserving orange recording controls/indicators and warning controls, other semantic statuses, and the lime HUD status/attention mark; leave static logo/wordmark and native icon assets unchanged;
6. remove selectable accent presets while keeping Theme, Text size, and Date format controls; force the palette at first paint and in the styleguide/HUD renderers; and
7. prove the result in the live styleguide and representative app/HUD surfaces, with contrast, local-font, naming, and unchanged-scope evidence.

The separate packaged Bonzai Agent identity, co-installation, Bonzai inference, account, signing, updater, and release program remains later work. This renderer treatment does not create or ship a separate packaged Bonzai Agent product.

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

Product and design own the reference and color contract. Frontend and design-system owners own semantic token composition and styleguide evidence. Desktop engineering owns only the runtime and pre-paint seams needed for color selection and synchronization. QA owns visual, accessibility, and regression evidence. No backend, Bonzai inference, account, or release owner is required for this MVP. Clovy API and OS Accounts remain the true service identities and owners; presentation copy must not attribute their work or state to Bonzai Agent.

## Product thesis and terminology

This roadmap uses two deliberately different names. **Bonzai Agent** is the
user-facing app and assistant name on this fork's renderer surfaces, under the
user-approved presentation scope recorded in the still-proposed dated addendum
to ADR-0055. **Bonzai** is the technical name of this fork's external managed
LiteLLM model provider and inference deployment. Bonzai Agent continues to use
Bonzai for model inference; it does not rename or replace that provider. **Clovy
API** remains the service name and **OS Accounts** remains the source of truth
for identity and credits. Formal product/design acceptance of the addendum is a
separate review gate; user approval to implement this scope does not mark an
ADR accepted.

| Term | Meaning in the current repository | Roadmap treatment |
| --- | --- | --- |
| **Bonzai Agent** | The user-facing name for the Clovy desktop product and its agent experience on this fork's renderer surfaces, under the user-approved presentation scope | Use in approved product copy, visible labels, roadmap prose, and presentation sketches; formal product/design ADR review remains pending |
| **Bonzai** | This fork's external managed LiteLLM model provider and inference deployment | Keep in technical routing, provider, host, egress, and deployment references; not a product-facing replacement for Bonzai Agent |
| **Bonzai key** | The key used by the Bonzai inference deployment for model access and project spend attribution | Keep unchanged in technical settings, keychain, routing, and operational references |
| **Clovy** | The existing product identity and source terminology being given a Bonzai Agent presentation layer | Preserve in compatibility, source, and technical identity references; replace only approved visible product copy |
| **June** | Released technical identities and compatibility aliases retained by ADR-0055 | Preserve wherever compatibility requires them |
| **Renderer Bonzai palette** | Bonzai semantic accent plus renderer character and blue identity-led primary actions, including non-recording HUD actions; controls that start, stop, keep, or otherwise change a recording and warning indicators retain orange; other statuses remain semantic, and the HUD status/attention mark remains lime | Force the approved values in the Bonzai renderer; keep native icons and graphic mark/wordmark artwork unchanged |

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

The bundled export is the approved color-role reference for this implementation; map its color values only through existing tokens and tested renderer consumers. Its typography, spacing, shape, motion, imagery, icon, logo, and component material is excluded. In particular, `README.md:25-60`, `tokens.css:60-93`, `design-system.json:146-387`, and `components/bundle.css` must not be ported wholesale.

## Color contract from the bundled reference

These roles and values are the approved reference inputs for the current renderer implementation. They are mapped through existing tokens according to their semantic use; identically named tokens are not replaced mechanically.

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

The token mapping must confirm contrast in actual Bonzai renderer surfaces and classify each role as a direct semantic value, derived value, alias, or intentionally unused. The reference values must not be copied into arbitrary component rules. Renderer identity colors are an explicit Bonzai palette exception; graphic mark/wordmark artwork and native icon colors stay unchanged. Manrope uses the local OFL 1.1 variable WOFF2 shipped with its license, through `--font-sans`.

## Roadmap status

**This table is the single source of truth for this roadmap's phase status.** Detailed phase headings below repeat the same statuses. Vocabulary is `not started` | `in progress` | `done` | `blocked` | `deferred`. The user's approval authorizes implementation of the scoped MVP, not release or a change to ADR-0055/ADR-0060; the dated ADR-0055 addendum remains proposed pending formal product/design review.

| Phase | Status | Exit criterion | Evidence or blocker |
| --- | --- | --- | --- |
| 0: baseline and visual-scope boundary | **done** | Current token architecture, bundled reference, dirty-tree boundary, and explicit exclusions are recorded | Existing Clovy design docs and token files were inspected; the bundled reference is present under the roadmap folder; external Artifact authentication remains unavailable in this session |
| 1: design artifact and presentation contract | **done** | User-approved reference, palette/name scope, font license, identity and native/logo exceptions are captured; proposed ADR-0055 addendum records presentation change | User decisions recorded; final semantic map/contrast and copy classifications remain implementation evidence |
| 2: semantic colors and font implementation | **done** | Light/dark renderer palette and local Manrope are implemented through existing tokens without changing type scale, allowed weights, spacing, geometry, components, or motion | Frontend/Rust/API test suites pass; Chromium inspection covered the styleguide and HUD captures. No release is authorized. ADR-0060 exception is not compliance; policy reconciliation and the exact merge ledger remain required |
| 3: visible naming and renderer synchronization | **done** | Approved app/assistant labels use Bonzai Agent while Clovy service/provider and compatibility names remain truthful; main/styleguide/HUD renderers use forced palette | Copy and fixed-palette/bootstrap tests pass; legacy brand storage keys remain compatibility-only. No runtime Dock/Cmd-Tab icon selection occurs. ADR-0055 addendum remains proposed |
| 4: visual, accessibility, and regression evidence | **blocked** | Light/dark styleguide and app/HUD evidence meets contrast, font, naming, palette, and unchanged-scope criteria | Chromium screenshots of the styleguide and HUD were inspected; they are not full-app screenshots. Native Tauri launch was unsuccessful, blocking native app/HUD launch evidence and full app screenshot review. Automated results are listed in Verification results; no release |
| 5: packaged Bonzai Agent product identity and release | **deferred** | A later roadmap or implementation decision has an owner and separate acceptance gate for native identity, co-installation, Bonzai inference, account, packaging, and release | Explicitly outside this visual styling MVP; existing additive-branding and release material remains follow-up context |

## Goals

- Apply the bundled reference's monochrome-first color discipline through the existing semantic token system.
- Use the supplied local Manrope variable font through `--font-sans`, preserving type size/weight, serif and mono contracts.
- Force the approved light/dark Bonzai palette across the renderer character and blue primary actions, including non-recording HUD actions; preserve orange recording controls and warning/status indicators, other semantic status colors, and the lime HUD status/attention mark, as well as native icons and graphic mark/wordmark artwork.
- Remove five color preset options while keeping theme mode, text size, and date format.
- Replace user-facing app/assistant Clovy names with Bonzai Agent while keeping service ownership, compatibility identifiers, and Bonzai provider naming accurate.
- Define light/dark roles for surfaces, text, lines, accent, focus, success, and danger; retain explicit status meaning and avoid a parallel component system.
- Prevent stale first-paint or secondary-renderer palette/name changes; do not add runtime Dock/Cmd-Tab identity selection or change packaged native icon assets.
- Use the live styleguide and representative app surfaces as the visual source of truth for the implementation review.
- Produce a narrow, reviewable visual-styling change with explicit evidence that excluded styling areas did not move.

## MVP non-goals

The following are explicitly out of scope for this visual styling MVP:

- A new typography scale, font sizes, line heights, font weights, letter spacing, or text hierarchy. Manrope is the only font-family change in scope.
- Spacing, layout, widths, gaps, padding, margins, responsive geometry, or control sizes.
- Components, markup, component APIs, component replacement, or importing the bundled component bundle.
- Radius, border geometry, shadows, elevation, or motion. Color values used by an existing semantic border remain in scope only as color, not as a geometry redesign.
- Icons, imagery, native assets, Dock or Cmd-Tab identity, bundle identifiers, deep links, helper names, or packaging.
- Bonzai provider and inference routing, Bonzai keys, Clovy API behavior/ownership, OS Accounts, no-account mode, telemetry, billing, backend deployment, or provider egress.
- Separate installation, credential isolation, local-state migration, updater configuration, signing, release hosting, or support operations.
- Renaming technical compatibility identifiers, storage keys, environment variables, protocol fields, native helper identities, package names, or released artifact coordinates. User-facing presentation names are in scope; technical identity migration is not.
- A new runtime brand picker or a multi-brand build matrix.
- A blanket replacement of every Clovy or June literal. Each string must be classified as presentation, service ownership, compatibility, historical, or immutable technical identity.
- Replacing graphic mark/wordmark artwork, native icons, Dock/Cmd-Tab icon, or TCC registration names.
- Copying the bundled system's Instrument Sans, marketing type scale, generous spacing scale, pill geometry, icon assumptions, or standalone component API.
- Adding a new runtime accent selector. Bonzai colors are fixed in the renderer while theme, text-size, and date preferences remain.

## Existing architecture and reusable seams

This section describes the accepted user direction and existing implementation seams.

### Clovy semantic token and font system

- `src/styles/tokens.css` is the source of truth for the Bonzai light/dark semantic color values, fixed renderer identity colors, action roles, retained status colors, and supporting surfaces. CSS tokens apply the palette; there is no runtime brand selector or per-component recoloring system.
- `src/styles/app.css` consumes the semantic roles broadly, so token-level values are preferred to per-component edits.
- `src/styles/fonts.css` defines the local Manrope variable font alongside the existing serif and mono faces; `src/styles/tokens.css` owns the `--font-sans`, `--font-serif`, and `--font-mono` family tokens. Manrope replaces only the sans family through this seam.
- `spec/design-tokens.md` requires existing CSS variables before hand-coded color or font values.
- `spec/font-families.md` records Manrope for the Bonzai fork and retains ABC Diatype as the upstream Clovy family contract.

The current Bonzai renderer uses fixed blue for the semantic accent, renderer character, and identity-led actions, while orange is reserved for controls that start, stop, keep, or otherwise change a recording and warning indicators. Other statuses retain semantic colors; the HUD status/attention graphic mark remains lime. `docs/design/foundations.md` and `docs/design/conventions.md` describe the token and pre-paint behavior.

### Runtime and first-paint seams

- The appearance UI has no selectable accent presets. Theme, text size, and date format remain independent user controls; palette selection is CSS-first, not a runtime brand preference.
- `src/main.tsx` initializes theme and font scale; the semantic Bonzai palette comes from `src/styles/tokens.css`.
- `index.html` applies the saved theme, pins the legacy `os-clovy:brand` and `os-june:brand` keys to `bonzai` for compatibility, and sets text-size scale before paint. Those keys do not select a runtime brand or a native identity. `styleguide.html` includes fixed-palette setup.
- `src/styleguide/StyleguideApp.tsx` and `src/styleguide/sections/Color.tsx` provide theme and semantic color evidence without a brand picker.
- The main renderer and HUD paths use the fixed palette; the visual-name inventory covers the main shell, titlebar, settings, onboarding, support, and secondary windows without changing technical bootstrap identity.
- `docs/roadmap/rebrand-to-bonzai/sketch.html` isolates the reference roles, while `app-colors.html` mirrors app-shell anatomy for visual review without changing production code.

The legacy `src/lib/brand.ts` runtime selector was removed. The tracked, unreferenced `src/lib/brand.generated.ts` is not the source of truth: it advertises absent `scripts/select-brand.mjs` and `branding/` inputs and contains stale `BRAND_ACCENT` (`#0000D2`) and `BRAND_NAME` (`Bonzai`) values. Do not cite or use it for the fixed renderer palette or Bonzai Agent presentation.

### Secondary windows and fixed identity surfaces

The main app and standalone HUD renderers use fixed CSS palette tokens; their pages do not subscribe to runtime brand-change events. Their stylesheets contain dedicated dark surfaces and identity controls in `src/styles/hud.css`, `src/styles/agent-hud.css`, and `src/styles/meeting-hud.css`. Blue marks identity-led HUD actions, orange marks recording-changing controls and warnings, other status colors remain semantic, and the HUD status/attention graphic mark remains lime.

The light/dark renderer palette and semantic roles live in `src/styles/tokens.css` and the theme cascade. Masks, shadows, illustrations, and other raw colors in `src/styles/app.css` should be audited by semantic role, not replaced mechanically. The legacy `set_dock_icon` Tauri command remains as compatibility surface, but current frontend startup and appearance controls do not select a Dock/Cmd-Tab icon at runtime; installed native icon identity remains unchanged.

### Accepted architecture boundaries

- ADR-0054 requires brand-specific values to live in an additive branding/config layer rather than scattered in-place edits.
- ADR-0055 preserves Clovy canonical naming and June-era technical identities through a compatibility bridge.
- ADR-0060 constrains shared-file edits and records a fork touched-line budget. Any implementation must re-check the current ledger before editing shared files.
- The existing Bonzai routing ADRs and `docs/bonzai-implementation-plan.md` govern the technical provider and inference behavior. They are not changed by this styling roadmap.

## Bonzai semantic mapping

The table below records the implementation mapping from the bundled role values to existing tokens. Do not create new layout or per-component color systems; contrast still requires review on live representative surfaces.

| Bundled role | Bonzai token role | Implementation check |
| --- | --- | --- |
| `surface` | `--background` | Keep the page ground neutral in both themes |
| `surface-alt` | `--secondary`, `--muted`, `--sidebar` | Use #f4f4f2 light / #151515 dark; retain separate consumer roles |
| `surface-raised` | `--card` and `--popover` | Use white light / #1c1c1c dark |
| `surface-inverse` | No new token for this MVP | No generic inverse-surface consumer is approved; retain existing fixed surfaces |
| `ink` | `--foreground`, `--card-foreground`, `--popover-foreground` | Use #0a0a0a light / #f4f4f2 dark |
| `ink-muted` | `--muted-foreground` and `--body-copy` | Use #595959 light / #a6a6a6 dark; verify all text surfaces |
| `ink-inverse` | `--on-solid`, `--primary-foreground`, `--primary-action-foreground` as relevant | White on light blue; dark ink on dark blue; preserve static marks |
| `line` | `--border`, `--input`, and quiet border aliases | Light uses #e2e2df; dark keeps the existing translucent white border token; geometry unchanged |
| `line-strong` | `--input`, `--ring` where they are visible boundaries | Light uses #8a8a8a; dark keeps the existing translucent white input token; focus remains separate |
| `accent` | `--brand` and `--primary` | Fixed Bonzai blue: #365fd9 light / #8aa4f2 dark; no user accent presets |
| `accent-hover` | `--brand-hover` and filled-control hover roles | #2a4bb3 light / #a9bdf6 dark; hover changes backgrounds only |
| `accent-soft` | `--brand-soft` for active/highlight surfaces | #e9eefc light / #172240 dark; generic hover remains neutral |
| `on-accent` | `--on-accent`, `--primary-foreground` | White on light accent; #0a0a0a on dark accent; verify contrast |
| `focus` | `--ring-focus`, `--focus-ring` | Bonzai blue pair; focus geometry unchanged |
| `success` | `--success` | #1b7446 light / #5ccf92 dark; retain adjacent status word/icon |
| `danger` | `--destructive`, `--record` for recording status only | #b93c0a light / #ff9a6b dark; retain status words/icons |

The implemented renderer color scope covers the Bonzai character and blue identity-led primary actions, including non-recording HUD actions. Controls that start, stop, keep, or otherwise change a recording and warning indicators use orange; other statuses retain their semantic colors, and the HUD status/attention graphic mark remains lime. Static Clovy logo/wordmark art and packaged native icon assets remain unchanged; no runtime Dock/Cmd-Tab icon selection occurs. Technical Clovy/June identities are not color roles and remain governed by ADR-0055. The dated ADR-0055 addendum remains proposed pending formal product/design review.

## Current renderer experience

The implemented renderer is a monochrome-first Bonzai Agent interface with fixed blue accents, the local Manrope sans family, and Bonzai Agent app/assistant naming. The renderer character and blue identity-led actions, including non-recording HUD actions, use Bonzai blue. Controls that start, stop, keep, or otherwise change a recording and warning indicators use orange; other statuses retain semantic colors; the HUD status/attention graphic mark remains lime. Packaged native icons and path-drawn mark/wordmark artwork remain unchanged. Runtime Dock/Cmd-Tab icon selection is not part of the renderer path; technical Clovy/June identities and provider/service ownership remain unchanged.

In light and dark themes:

- neutral surfaces and text establish the hierarchy;
- accent is reserved for primary emphasis, links, selected states, focus, and approved highlights;
- accent hover and on-accent values remain theme-specific;
- success and danger retain explicit text or icon context; and
- renderer character/actions use the approved Bonzai palette; graphic marks and native icons remain unchanged.

The styleguide is the preferred review surface for token values. The companion sketches show two review layers: `sketch.html` isolates the semantic color field, while `app-colors.html` places those roles on Clovy's actual titlebar, sidebar, note list, note detail, and agent composer anatomy. They are visual studies only and do not authorize production layout or component changes.

## Invariants

- **Fork palette invariant:** Bonzai renderer colors are fixed in this fork regardless of legacy stored Clovy/June accent choices. This does not change the ordinary upstream Clovy build; Theme, text size, and date format remain user-selectable preferences.
- **Visual-scope invariant:** the MVP changes semantic color values, the approved UI sans family to Manrope, approved user-facing product names, and required synchronization only. Type scale, spacing, components, geometry, motion, shadows, assets, and technical identifiers remain unchanged.
- **Theme invariant:** every approved color role has deliberate light and dark values and does not rely on a system-preference fallback that contradicts Clovy's `data-theme` cascade.
- **Token invariant:** visible semantic colors flow through CSS custom properties in `src/styles/tokens.css` or an explicitly approved additive token layer; no scattered component literals replace the system.
- **Contrast invariant:** text, muted text, accent fills, on-accent content, focus, success, danger, orange recording controls, and lime HUD attention meet the approved contrast threshold in representative light and dark surfaces.
- **Status invariant:** success and danger are never communicated by color alone. Existing words, icons, and state semantics remain present.
- **Renderer palette exception:** Bonzai blue applies to the renderer character and blue primary actions, including non-recording HUD actions. Controls that start, stop, keep, or otherwise change a recording and warning controls retain orange; other statuses retain semantic colors; the HUD status/attention graphic mark remains lime. Static mark/wordmark art, packaged native icons, and TCC identities remain unchanged. Runtime Dock/Cmd-Tab icon selection is not part of this path. Technical Bonzai provider names remain unchanged.
- **Synchronization invariant:** accepted main-window, pre-paint, styleguide, and secondary-window presentation paths do not show stale colors, fonts, or visible names, and do not invoke an unintended native identity side effect.
- **Compatibility invariant:** existing stored appearance ids and legacy mappings continue to behave deliberately; no storage key, protocol field, or June compatibility identity is renamed as part of the visual presentation change.
- **Evidence invariant:** a green unit test or styleguide swatch is not enough. The phase needs light/dark screenshots, contrast results, and an explicit unchanged-scope audit.

## Implementation phases

### Phase 0: baseline and visual-scope boundary

**Status: done.**

The current token and font architecture, runtime seams, bundled design-system export, visible-name boundaries, and dirty-tree baseline have been inventoried. The external Artifact URL is recorded as provenance but was not directly readable in this API-token session. The roadmap distinguishes Bonzai Agent presentation naming from technical Bonzai provider terminology, and limits the MVP to colors, Manrope, and approved visible presentation names.

**Exit criterion:** met for the recorded baseline. The renderer-styling implementation is a separate active phase and does not change the documented scope boundaries.

### Phase 1: design artifact and presentation contract

**Status: done.**

Product direction is recorded for the bundled `tokens.json` color reference, local Manrope variable font and OFL, fixed Bonzai palette with only the five color presets removed, renderer character/action colors including HUD actions, the lime HUD status/attention mark, Bonzai Agent app/assistant naming, path-drawn wordmark/native icon preservation, and a proposed ADR-0055 addendum. Token-consumer checks and copy classification are recorded in the implementation and verification sections below; the addendum remains proposed pending formal product/design review.

**Exit criterion:** user-approved direction and exception list are captured here and in the proposed dated ADR addendum. Remaining implementation mapping and evidence belong to Phases 2-4.

### Phase 2: semantic colors and font implementation

**Status: done.**

The approved light/dark token matrix is implemented through the existing semantic CSS-token pipeline, with the supplied local Manrope variable font and OFL license. The appearance UI no longer offers selectable accent presets; theme, text size, and date format remain. The Bonzai palette is CSS-first and fixed: the living character and identity-led actions use blue; controls that start, stop, keep, or otherwise change a recording and warning indicators use orange; other statuses retain their semantic colors; the HUD status/attention graphic mark remains lime. Type scale, allowed weights, serif and mono roles remain in their established seams. No component-system, layout, or geometry import is part of this work.

**Exit criterion:** implementation and focused/full automated tests are recorded below. Contrast report, live native app evidence, and accepted unchanged-scope/policy review remain phase 4/merge gates, not claims of completed native visual acceptance.

### Phase 3: visible naming and synchronization

**Status: done.**

User-facing app/assistant copy and accessible labels use Bonzai Agent across the reviewed renderer, title/document names, onboarding, settings, support, composer, notes, reports, notifications, and renderer HUD surfaces. Focused Agent and unattended Routine instructions, SDK agent identity, and deterministic assistant identity replies also use Bonzai Agent; legacy Clovy/June greetings remain accepted aliases. Displayed macOS menu/About/Hide/Quit labels use the approved presentation name. The path-drawn sidebar wordmark and its artwork remain unchanged.

The naming change is limited to displayed presentation copy. `pkg_info.productName`, Cargo package names, the macOS bundle identifier, the installed Dock/Cmd-Tab icon, TCC permission registrations, binary name, and updater artifacts remain unchanged. Clovy API/service ownership, OS Accounts identity and credit ownership, technical/provider names, June compatibility values, protocols and storage keys remain distinct. The CSS-first fixed palette is applied from first paint and across the styleguide/HUD renderers. Legacy `os-clovy:brand` / `os-june:brand` storage keys are pinned to `bonzai` only as rollback compatibility; they do not power a selector. Runtime Dock/Cmd-Tab identity selection is not part of startup or appearance behavior.

**Exit criterion:** fixed-palette/bootstrap, visible-name, and technical-identity tests pass; see Verification results. Formal acceptance of the proposed ADR-0055 addendum remains pending and is not implied by implementation completion.

### Phase 4: visual, accessibility, and regression evidence

**Status: blocked.**

Chromium-rendered styleguide and HUD screenshots were inspected for light/dark palette, character/actions, recording colors, HUD status mark, and visible labels. This is browser-rendered styleguide/HUD evidence only; it is not a full-app screenshot review and does not establish native Tauri appearance. A native Tauri launch attempt was unsuccessful, so representative native app and native HUD launch evidence remains missing. Keep phase 4 blocked until native app/HUD rendering can be inspected and any required contrast/accessibility evidence is reviewed.

The automated frontend and Rust/API suites pass as recorded below; `make verify` remains blocked on the unchanged Clippy MSRV issue. `cargo clippy --all-targets` reports `Option::is_none_or()` at `src-tauri/src/bonzai/audio.rs:84`, which stabilized in Rust 1.82 while this crate declares MSRV 1.80. A clean Tauri rustfmt check completed in the final verification run before Clippy stopped the gate. Biome check completed with 684 warnings and no fixes; TypeScript typecheck completed.

**Exit criterion:** native app/HUD screenshots or recordings in light and dark, contrast/accessibility results, font/license review, naming audit, focused tests, exact changed-file/ADR-0060 deviation inventory, and unchanged-scope report are reviewed. Do not mark visual validation complete from styleguide swatches or HUD screenshots alone.

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
- Confirm implementation does not get mistaken for ADR acceptance, release approval, OS Platform sync, commit, or push.

### Verification results for this implementation snapshot

- `pnpm check`: passed; Biome checked 566 files, reported 684 warnings and 3 infos, and applied no fixes. Warnings are existing repo diagnostics; no lint errors stopped the check.
- `pnpm typecheck`: passed (`tsc --noEmit` and `tsc --noEmit -p extension`).
- `pnpm test`: passed, 162 files and 1,756 tests. Vitest/jsdom emitted the known caught `Chunk unavailable` event in the workspace-lazy test; the suite had zero failed tests.
- `pnpm test:rust`: passed, 1,727 passed, 0 failed, and 13 ignored across the library and integration targets.
- `pnpm test:clovy-api`: passed, 535 tests across targets and zero failures.
- `cargo fmt --manifest-path src-tauri/Cargo.toml --all -- --check`: passed in the final full-gate run.
- `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --locked -- -D warnings`: blocked only by the unchanged `Option::is_none_or()` baseline use at `src-tauri/src/bonzai/audio.rs:84`; crate MSRV is Rust 1.80 and the method stabilized in Rust 1.82.
- `make verify`: not green; the final run passed `pnpm check`, `pnpm typecheck`, `pnpm test` and Tauri formatting, then stopped at the unchanged Clippy MSRV issue above. Do not describe the gate as passing.
- Focused fixed-palette, Bootstrap, appearance, visible-name and technical-identity tests are included in the passing frontend/Rust suites; the dedicated Bonzai egress guard also passed (4 tests).
- Chromium visual inspection covered styleguide and HUD screenshot renders, not the full app. Native Tauri launch failed, so native app/HUD visual acceptance and full-app screenshots remain blocked. Contrast/accessibility and final unchanged-scope review remain phase-4 evidence gates; no release has been made or authorized.

### Deterministic checks after implementation

- Token-level tests for approved light/dark values and semantic role presence.
- Font-token and font-loading checks proving Manrope is selected without changing the approved type scale or weight contract. The extension popup maintains a separate copied token subset, so include its font stack and the Rust popup-token parity test in that evidence; shared-file parity must remain intact when updated.
- Visible-name audit tests for approved Bonzai Agent presentation strings and retained technical Bonzai, Clovy, and June compatibility strings.
- Runtime and pre-paint synchronization tests for fixed palette and presentation behavior.
- Source-level verification that displayed macOS menu labels and window titles use Bonzai Agent while `pkg_info.productName`, Cargo package/bundle identifiers, packaged native icon assets, and TCC registrations stay unchanged; runtime Dock/Cmd-Tab icon selection is not part of the Bonzai renderer path.
- Secondary-window checks for fixed HUD palette, including blue action controls and lime status/attention mark.
- Styleguide token rendering and URL-selected theme checks; the Bonzai accent itself is fixed.
- Contrast checks for primary text, muted text, accent text and fills, on-accent content, focus, success, and danger.
- A diff audit proving no type scale, spacing, component, geometry, icon, asset, motion, shadow, technical identity, backend, or release changes.
- `UPSTREAM.md` and ADR-0060 checks for every changed shared path, including any extension popup token/font parity update; the final 161-path / 1,776-add / 1,865-delete ledger was validated against `origin/bonzai-main` after copy changes.

### Visual acceptance

- Render `styleguide.html` in light and dark themes and inspect semantic color swatches and Manrope in representative text roles.
- Inspect representative surfaces in the real app and renderer HUDs, including the shell, sidebar, cards, composer accent, character, primary and HUD action controls, recording signal, lime HUD status/attention mark, focus/status state, visible Bonzai Agent names, and accepted HUD labels.
- Verify generic rows, navigation, and menus retain neutral hover treatment unless they are already accent-bearing surfaces.
- Verify high-chroma or dark-mode accent behavior uses the approved `on-accent` role rather than a hard-coded foreground.
- Capture screenshots or recordings with the selected theme and build state. Do not use a development window as evidence for native packaging or product identity, which remain deferred.
- Confirm the visible-name audit does not rename technical compatibility strings, native identifiers, storage keys, or released artifact coordinates.

## Implementation decisions and remaining validation

The remaining implementation questions are role-level rather than product-direction gates:

- Map `surface-inverse` only if a current consumer exists; do not add layout for an unused reference role.
- Confirm raw values are semantic colors before changing them. Masks, shadows, static logo artwork, and unrelated illustrations are not color-token replacements.
- Verify all light/dark text, status, focus, selection, action, and HUD contrast at actual usage sizes, including lime HUD attention against the dark overlay. Status meaning must remain available without hue alone.
- Do not imply the renderer work changes package/native identity, account behavior, inference ownership, or release operations.

## ADR, issue, and merge-policy follow-ups

- `docs/adr/0055-addendum-2026-10-10-bonzai-agent-presentation.md` is a **proposed** dated addendum for the Bonzai renderer presentation exception. Product/design owners must review it before accepting it.
- OS Platform was unavailable during this implementation session and the user authorized offline work; tracker sync was not performed. Create/associate a delivery Issue and update it when platform access is restored.
- This implementation deliberately exceeds ADR-0060's accepted shared-file shapes and 150-counted-line ceiling under the user's explicit exception. `UPSTREAM.md` records the final 161-shared-path ledger, exact edit shapes, and counted lines against `origin/bonzai-main`; a 161-path validator confirmed complete coverage with no missing, extra, duplicate, or mismatched hunk-count rows. The ledger and user exception do not make the work compliant. A superseding ADR or merge-policy decision is a prerequisite to merge, not an implied part of this renderer work.
- Packaged Bonzai identity, co-installation, account mode, inference ownership, updater, signing, and release remain later decisions.

## Explicit future ideas and follow-ups

- Review typography scale, weights, and display treatments separately; this MVP changes only the sans family to Manrope.
- Complete formal product/design review of the proposed Bonzai Agent presentation exception; the technical Bonzai provider and inference identity remain separate.
- Review spacing, layout, radius, shadows, motion, components, iconography, and imagery as separate scopes rather than smuggling them into this visual migration.
- Maintain the explicit ADR-0060 exception and obtain separate merge-policy reconciliation before merge; the final shared-path/edit-shape/line-count inventory is recorded in `UPSTREAM.md`.
- Resolve native identity, co-installation, credential namespaces, local state, account mode, inference ownership, updater, signing, release hosting, support, and rollback in a later product roadmap or implementation plan.
- Revisit the external Artifact URL when a Claude account session can authenticate, and reconcile any differences against the bundled export before merge.
- Do not treat the tracked but unreferenced `src/lib/brand.generated.ts` as the palette or visible-name source of truth: its cited `scripts/select-brand.mjs` and `branding/` inputs are absent, and it contains stale brand values.

## Decision summary

The Bonzai Agent renderer-styling MVP implements fixed light/dark CSS-token colors, the supplied local Manrope UI font, and Bonzai Agent app/assistant copy. The technical Bonzai provider and Clovy service ownership remain distinct; OS Accounts remains the source of truth for identity and credits, and June compatibility identifiers remain unchanged. Blue applies to the renderer character and identity-led actions, including non-recording HUD actions; controls that start, stop, keep, or otherwise change a recording and warning indicators use orange; other statuses retain semantic colors; and the HUD status/attention graphic mark remains lime. Static wordmark/mark artwork and packaged native icon assets remain unchanged. Runtime Dock/Cmd-Tab icon selection is not part of the renderer path. Type scale, spacing, components, geometry, motion, backend, account behavior, packaging, and release operations remain deferred. Phase 4 is blocked because native Tauri launch failed; inspected Chromium styleguide/HUD screenshots do not constitute full-app screenshot review. Automated test suites pass, but `make verify` is blocked by the unchanged Rust 1.80 MSRV conflict with `Option::is_none_or()` stabilized in Rust 1.82. The dated ADR-0055 addendum remains proposed pending formal product/design review; ADR-0060 merge-policy reconciliation and exact shared-path inventory are also merge blockers. OS Platform sync was skipped offline, and no commit, push, or release has been made.
