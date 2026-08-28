---
status: accepted
date: 2026-08-03
---

# Whitelabel branding lives in an additive config/asset layer, never in-place rebrand edits

## Context

There is a business requirement to sell Clovy whitelabeled: a partner's own
product name, bundle identity, icon set, and accent color, built from this
fork. A second, load-bearing requirement travels with it: updates from the
upstream `os-june` project must stay easy to pull into the whitelabel fork.
Those two requirements pull in opposite directions unless the branding work
is shaped deliberately.

The obvious shortcut — a one-time find-and-replace rebrand across
`src-tauri/tauri.conf.json`, `src/components/brand/`, and every user-facing
occurrence of the product name across the frontend — would work for a single,
frozen snapshot. It would also touch a wide, high-churn slice of the
codebase, so every subsequent `git merge upstream/main` would re-collide with
the same files upstream keeps editing for unrelated reasons (new UI copy,
new components, new config keys). That this is not a hypothetical cost is
already proven upstream: the June → Clovy rebrand itself (
[ADR-0054](0054-clovy-presentation-retains-june-era-technical-identities.md),
[ADR-0055](0055-clovy-technical-identity-migrates-through-a-compatibility-bridge.md))
touched roughly 800 files in one pass. Paying that cost on every future
whitelabel rebrand directly violates the easy-to-update requirement, so it is
rejected before this ADR's "Alternatives considered" section restates it
formally.

This ADR is deliberately orthogonal to ADR-0054/0055's June-era compatibility
bridge, not a replacement for it. That bridge is about *this product's own*
one-time historical transition (preserving already-shipped June installs'
data, credentials, and OS permissions while the canonical name moves to
Clovy). Whitelabeling is about *a partner's* brand-new install, with no
June-era or Clovy-era history to preserve — a whitelabel build participates
in none of that bridge's dual-read/dual-write machinery. Where the two
intersect (the Keychain service id, most notably), the whitelabel layer
takes the brand's own single clean identity instead of joining the bridge —
see "Consequences" below and
[whitelabel-release-runbook.md](../whitelabel-release-runbook.md).

## Decision

Brand-specific values (product name, bundle identifier, icon set, accent
color, window titles, updater endpoint/pubkey, OS Accounts OAuth client id,
backend copy strings) are extracted into a small number of new, additive
files and directories — not scattered as literal edits through existing
files.

- A `branding/<brand-id>/` tree (new, not present upstream) holds a
  `brand.json` (name, accent, support copy) plus icon/asset overrides.
- Build tooling composes brand + core at build time rather than mutating
  shared source: Tauri's native `--config` merge for `tauri.conf.json` and
  icon paths, a small prebuild script that selects frontend asset paths, and
  new `CLOVY__BRAND__*` figment keys on the backend, following the existing
  `CLOVY__SECTION__FIELD` convention documented in
  [configuration.md](../configuration.md).
- The **default build** (no `BRAND` selected) resolves to today's Clovy
  identity with zero extra configuration — the branding layer is strictly
  additive and opt-in, so `main` stays runnable exactly as it is upstream.
- Where a shared file must reference the brand layer at all (for example, a
  component that prints "Ask Clovy" becoming "Ask {BRAND_NAME}"), the change
  is kept to the narrowest possible token substitution, never a restructure.
  A one-line diff on a shared file is far less likely to conflict with an
  unrelated upstream edit to that same file than a multi-line rewrite.

See [whitelabel-implementation-plan.md](../whitelabel-implementation-plan.md)
for the full inventory of what falls into which layer and the phased rollout.

## Consequences

- Merging `upstream/main` into a whitelabel branch should almost never
  conflict on branding grounds, because branding lives in files upstream
  does not have and does not touch. It will still conflict on files upstream
  edits for unrelated reasons that this layer also has to touch (a handful of
  curated high-visibility copy files, `os_accounts.rs`) — additive-first
  keeps that surface small, it does not make it zero.
- New Clovy-branded strings that upstream adds later will silently ship
  unbranded in a whitelabel build until caught. `scripts/check-brand-drift.mjs`
  (Phase 5) is the CI check for this; see "Guarding against brand drift" in
  [branding/README.md](../../branding/README.md).
- Some brand facets are inherently per-binary and cannot be a runtime toggle:
  the updater endpoint and signing pubkey are baked into every shipped build
  permanently (per [ADR-0001](0001-auto-updates-via-tauri-updater.md)), and
  the OS Accounts OAuth client id, deep-link scheme, and Keychain service id
  are compiled and code-signed per build. A whitelabel brand therefore still
  needs its own full build, sign, and release pipeline once it ships real
  installs — this ADR only makes that pipeline configuration-driven, not
  free.
- The Keychain service id is the one place this layer and ADR-0055's
  compatibility bridge share a surface (`src-tauri/src/os_accounts.rs`). A
  whitelabel build does not participate in the Clovy/June dual-read/dual-write
  bridge — it has no legacy installs of either to reconcile — so its override
  replaces the *canonical* (Clovy) identity outright rather than joining the
  bridge. The bridge itself, and the default (unbranded) build's participation
  in it, are entirely ADR-0055's concern and unaffected by this one.
- Whitelabeling does not change who owns identity or credits. OS Accounts
  remains the source of truth for both (per AGENTS.md's boundary), and Clovy
  API's `/v1` contracts stay backward-compatible regardless of brand.

## Alternatives considered

- **One-time find-and-replace rebrand fork.** Rejected: fastest to a single
  branded build, but destroys upstream mergeability, which is an explicit
  requirement here, not a nice-to-have. (This is, in effect, what upstream's
  own June → Clovy rebrand had to do for *this product's* one-time
  transition — acceptable there because it happens once for the canonical
  product; not acceptable to repeat for every whitelabel partner.)
- **Runtime-only branding (one binary, brand chosen at first launch).**
  Rejected: bundle identifier, deep-link scheme, code-signing identity, and
  the updater endpoint are fixed per Tauri build/signature, and a single
  binary cannot safely serve two OS Accounts OAuth identities or two Keychain
  services without a broader OS Accounts multi-client redesign. That
  redesign is out of scope for enabling whitelabeling.
- **Fork Clovy API per brand from day one.** Deferred, not rejected: nothing
  in this decision requires a separate Clovy API deployment per brand, and
  sharing one keeps Phase 3/4 small. Flagged in the plan as an open question
  for whenever a real partner is scoped.
- **Join the whitelabel Keychain override to ADR-0055's compatibility
  bridge**, so a whitelabel build also dual-reads/writes Clovy- and
  June-named services. Rejected: that bridge exists to protect *this
  product's own* already-shipped June-era installs; a whitelabel partner has
  none, so joining it would add real complexity (reconciliation markers,
  dual-write ordering) for a case it was never designed to protect.
