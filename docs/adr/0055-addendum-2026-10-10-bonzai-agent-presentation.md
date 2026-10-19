---
status: proposed
date: 2026-10-10
---

# Dated addendum: Bonzai Agent renderer presentation

This addendum proposes a Bonzai-fork-specific supplement to
[ADR-0055](0055-clovy-technical-identity-migrates-through-a-compatibility-bridge.md).
It does not change ADR-0055's canonical technical-identity migration matrix or
June-era compatibility requirements. The user has approved implementation of
this scoped presentation work, but this addendum remains proposed and does not
become an accepted ADR without the repository's product/design review.

## Proposal

On the Bonzai fork, present the desktop app and assistant as **Bonzai Agent**
in renderer surfaces and native menu labels. This is a presentation-layer
exception to ADR-0055's statement that window titles, notifications, and other
presentation continue to say Clovy. It covers app/assistant copy and accessible
names in the main shell, onboarding, settings, agent and note surfaces,
notifications, renderer HUDs, and the displayed macOS app-menu and About, Hide,
and Quit labels. It does not change `pkg_info.productName`, package names,
bundle identifiers, Dock/Cmd-Tab identity, TCC registrations, service identity,
or ownership. **Clovy API** remains the service name, and **OS Accounts** remains
the source of truth for identity and credits. Keep copy accurate about which
service performs or owns an operation. Static path-drawn logo and wordmark
artwork remains unchanged; its art is covered by a separate logo roadmap.

The renderer styling uses the bundled iO design-system export as its color
reference. Its accent pair is `#365fd9` in light theme and `#8aa4f2` in dark
theme. Apply semantic colors through the existing token pipeline. The Bonzai
renderer palette covers the living character and identity-led action surfaces,
including controls in the renderer HUDs: use the blue accent for primary actions
and the orange role where the action starts or controls a recording, or signals
an active recording or warning state. Remove
the five user-selectable color presets only. Keep the existing Theme, Text size,
and Date format controls and the rest of their behavior.

This is not a blanket recoloring of status signals. Retain green completion and
other semantic status roles. The HUD status/attention graphic mark remains lime
(`#c4f979`, with its existing bright lime highlight); do not recolor it blue or
orange. Static mark and wordmark artwork, native and packaged icons, and the
live macOS Dock/Cmd-Tab icon remain unchanged. The Bonzai name used for the
technical inference provider and deployment also remains distinct from the
Bonzai Agent app/assistant name.

The UI sans family changes to the locally bundled Manrope variable font, with
its SIL Open Font License 1.1 distributed alongside it. This does not change the
type scale, the allowed font-weight contract, serif or mono roles, spacing,
layout, components, geometry, or motion. It does not change native helper/TCC
identities, protocol or storage names, package identifiers, release artifacts,
June aliases, or the Clovy API and OS Accounts contracts.

Implementation proceeds under the user's explicit ADR-0060 policy exception.
That authorization is not a claim of compliance with ADR-0060's accepted shared-
file shapes or ceiling. `UPSTREAM.md` must carry the exact final shared-path,
edit-shape, and counted-line ledger after concurrent implementation changes
settle. The exception and ledger do not mark a superseding ADR or policy change
as accepted; that reconciliation remains a separate merge-policy follow-up.

## Consequences if accepted

- Renderer app and assistant copy may say Bonzai Agent while API, service,
  provider, and compatibility identities retain their technical meanings.
- New UI copy and native menu labels must distinguish the app/assistant from
  Clovy API, OS Accounts, Bonzai inference, system permission registrations,
  compatibility aliases, and historical records.
- Displayed macOS app-menu and About/Hide/Quit titles may say Bonzai Agent, while
  `pkg_info.productName`, package/bundle identifiers, Dock/Cmd-Tab identity, and
  TCC registrations remain unchanged.
- Existing theme, text-size, and date-format controls remain; only the five
  selectable color presets are removed.
- Renderer character and identity-led controls use the iO light/dark blue accent
  pair. Controls that start, stop, keep, or otherwise change a recording, plus
  warning indicators, retain their orange semantic color; the HUD status/attention
  graphic mark remains lime, and
  completion/other statuses retain their semantic colors.
- The wordmark and graphic-mark artwork, native/package icons, and Dock/Cmd-Tab
  identity remain unchanged.
- Manrope is local and licensed with the app; its adoption does not broaden into
  a typography-system redesign.
- The proposal applies only to this Bonzai fork and does not supersede Clovy
  upstream's presentation policy.
