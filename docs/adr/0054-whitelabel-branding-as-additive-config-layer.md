---
status: proposed
date: 2026-08-03
---

# Whitelabel branding lives in an additive config/asset layer, never in-place rebrand edits

## Context

There is a business requirement to sell June whitelabeled: a partner's own
product name, bundle identity, icon set, and accent color, built from this
fork. A second, load-bearing requirement travels with it: updates from the
upstream `os-june` project must stay easy to pull into the whitelabel fork.
Those two requirements pull in opposite directions unless the branding work
is shaped deliberately.

The obvious shortcut — a one-time find-and-replace rebrand across
`src-tauri/tauri.conf.json`, `src/components/brand/`, and the roughly 1,000
"June" occurrences across 184 frontend files — would work for a single,
frozen snapshot. It would also touch a wide, high-churn slice of the
codebase, so every subsequent `git merge upstream/main` would re-collide with
the same files upstream keeps editing for unrelated reasons (new UI copy,
new components, new config keys). That trade directly violates the
easy-to-update requirement, so it is rejected before this ADR's "Alternatives
considered" section restates it formally.

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
  new `JUNE__BRAND__*` figment keys on the backend, following the existing
  `JUNE__SECTION__FIELD` convention documented in
  [configuration.md](../configuration.md).
- The **default build** (no `BRAND` selected) resolves to today's June
  identity with zero extra configuration — the branding layer is strictly
  additive and opt-in, so `main` stays runnable exactly as it is upstream.
- Where a shared file must reference the brand layer at all (for example, a
  component that prints "Ask June" becoming "Ask {BRAND_NAME}"), the change
  is kept to the narrowest possible token substitution, never a restructure.
  A one-line diff on a shared file is far less likely to conflict with an
  unrelated upstream edit to that same file than a multi-line rewrite.

See [whitelabel-implementation-plan.md](../whitelabel-implementation-plan.md)
for the full inventory of what falls into which layer and the phased rollout.

## Consequences

- Merging `upstream/main` into a whitelabel branch should almost never
  conflict on branding grounds, because branding lives in files upstream
  does not have and does not touch.
- New "June"-branded strings that upstream adds later will silently ship
  unbranded in a whitelabel build until caught. The implementation plan
  proposes a lint/CI check for this drift; until it exists, catching it is a
  manual step in the post-merge checklist.
- Some brand facets are inherently per-binary and cannot be a runtime toggle:
  the updater endpoint and signing pubkey are baked into every shipped build
  permanently (per [ADR-0001](0001-auto-updates-via-tauri-updater.md)), and
  the OS Accounts OAuth client id, deep-link scheme, and Keychain service id
  are compiled and code-signed per build. A whitelabel brand therefore still
  needs its own full build, sign, and release pipeline once it ships real
  installs — this ADR only makes that pipeline configuration-driven, not
  free.
- Whitelabeling does not change who owns identity or credits. OS Accounts
  remains the source of truth for both (per AGENTS.md's boundary), and June
  API's `/v1` contracts stay backward-compatible regardless of brand.

## Alternatives considered

- **One-time find-and-replace rebrand fork.** Rejected: fastest to a single
  branded build, but destroys upstream mergeability, which is an explicit
  requirement here, not a nice-to-have.
- **Runtime-only branding (one binary, brand chosen at first launch).**
  Rejected: bundle identifier, deep-link scheme, code-signing identity, and
  the updater endpoint are fixed per Tauri build/signature, and a single
  binary cannot safely serve two OS Accounts OAuth identities or two Keychain
  services without a broader OS Accounts multi-client redesign. That
  redesign is out of scope for enabling whitelabeling.
- **Fork June API per brand from day one.** Deferred, not rejected: nothing
  in this decision requires a separate June API deployment per brand, and
  sharing one keeps Phase 3/4 small. Flagged in the plan as an open question
  for whenever a real partner is scoped.
