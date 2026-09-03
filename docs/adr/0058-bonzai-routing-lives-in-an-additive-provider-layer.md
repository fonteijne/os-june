---
status: proposed
date: 2026-09-03
---

# Bonzai routing lives in an additive provider layer with a touched-line budget

## Context

This fork must keep pulling upstream Clovy releases. That is a load-bearing
requirement, not a preference: Clovy ships and auto-updates continuously, and
a fork that cannot merge upstream is a fork that stops receiving fixes.

Routing all inference through Bonzai
([ADR-0057](0057-bonzai-is-the-only-inference-egress.md)) means changing
where every model call goes, and per-project Bonzai keys mean threading a
project id down to the point where provider settings are resolved. Both land
in the two highest-churn files in the native shell:
`src-tauri/src/clovy_api.rs` (6,073 lines) and
`src-tauri/src/providers/mod.rs` (2,707 lines). Upstream edits both regularly
for unrelated reasons.

The whitelabel work already faced this exact tension and resolved it. ADR
"whitelabel branding lives in an additive config/asset layer" (numbered 0054
on its still-open PR, renumbering to 0056 on merge) rejected a
find-and-replace rebrand precisely because it "would touch a wide, high-churn
slice of the codebase, so every subsequent `git merge upstream/main` would
re-collide with the same files upstream keeps editing", and set the house
rule: additive files first, and any edit to a shared file is "the narrowest
possible token substitution, never a restructure".

That doctrine was written for branding. Provider routing needs the same
treatment, and the reasoning transfers unchanged.

Three facts shape the design:

- **Upstream already publishes a dispatch shape to extend.** At
  `clovy_api.rs:410`, note generation branches to a non-default provider with
  a three-line early return. Conforming to a pattern upstream maintains is
  strictly safer than imposing one it does not.
- **The chokepoints are few and named.** `transcribe_saved_audio` (`:360`),
  `generate_note_from_transcript` (`:404`), `dictate_transcribe` (`:442`),
  dictation cleanup, the agent chat route, and the disabled paths.
- **A custom OpenAI-compatible provider already exists.**
  `LocalGenerationSettings { base_url, model_id, api_key }`
  (`providers/mod.rs:118`), whose own doc comment names LiteLLM as an
  intended target.

The last fact suggests an obvious shortcut — just point the existing "local"
provider at Bonzai — which this ADR rejects, for reasons recorded below.

## Decision

**Bonzai routing is an additive provider layer, budgeted and inventoried.**

- **A new provider identity.** `PROVIDER_BONZAI` sits alongside
  `PROVIDER_LOCAL`, with all real logic in a new `src-tauri/src/bonzai/`
  module. New files cannot conflict on merge, so as much behavior as possible
  lives there.
- **One dispatch prologue per operation.** Each intercepted function gets a
  three-line early return delegating into `bonzai::`, placed at the top of
  the function and mirroring the shape at `clovy_api.rs:410`. When upstream
  edits the body below, the merge stays clean.
- **Never interleave.** No `if bonzai` branches threaded through function
  bodies, and no restructuring of a shared function to "accommodate" both
  paths. An interleaved branch conflicts with every upstream edit to that
  function; a prologue does not.
- **A touched-line budget.** Under **40 lines** across files upstream also
  edits. The budget is reviewable: a change that needs more is a signal to
  move logic into `bonzai/`, not to raise the number.
- **A fork ledger.** `UPSTREAM.md` inventories every touched upstream line
  and why. Review checks it is not growing.
- **A conflict canary in CI.** A scheduled job fetches `upstream/main`,
  merges into a throwaway branch, and reports conflicts, turning "will the
  next Clovy release break us?" into a dashboard. This requires an `upstream`
  remote, which does not exist today — `git remote -v` shows only `origin`, a
  gap [whitelabel-implementation-plan.md](../whitelabel-implementation-plan.md)
  also records. GitHub's fork relationship powers the "Sync fork" button,
  which works only while merges stay trivial; a canary needs a real remote.

**Bonzai is deliberately not modelled as the existing local provider**, for
two reasons:

- **It would put false privacy copy in front of the user.**
  `model-privacy.ts` attaches real meaning to provider identity (E2EE /
  private / anonymous badges) and `local-generation.ts` reasons about
  loopback addresses. Bonzai is a remote managed server; presenting it as
  "local" would misdescribe where data goes, in a product whose central
  promise is knowing where data goes.
- **It inherits upstream churn in a feature we do not control.** Every
  upstream change to the local-endpoint feature would land directly on our
  routing.

## Consequences

- Upstream merges should rarely conflict on routing grounds, because routing
  logic lives in files upstream does not have.
- **The prologues will look unidiomatic**, and a future contributor — or an
  automated cleanup pass — will be tempted to "tidy" them into a single
  well-factored dispatch inside the shared file. That refactor is the exact
  thing this ADR forbids, and this paragraph exists so the reason survives
  the person who wrote it.
- **Some duplication with the local provider is accepted** (auth attachment,
  URL building, endpoint probing). Duplication is the price of not being
  coupled to a feature upstream may change.
- A budget of 40 lines is arbitrary in its precise value but not in its
  existence. Its purpose is to make growth visible, and it should be revised
  in a superseding ADR rather than quietly exceeded.
- **This does not make upstream refactors free.** If upstream restructures a
  chokepoint function, the prologue still needs re-applying — but it is three
  lines, and the canary surfaces it before it is urgent.
- The ledger and canary are ongoing maintenance. They pay for themselves only
  if someone reads the canary; a red canary nobody looks at is worse than
  none, because it manufactures false confidence.
- ADR-0057 disables five capabilities, which touches upstream UI surfaces
  and spends budget on deletions rather than additions. Deletions are lower
  conflict risk than restructures, but they are not free.

## Alternatives considered

- **Point the existing `PROVIDER_LOCAL` at Bonzai.** Rejected: the smallest
  possible diff, but it labels a remote managed server "local" throughout a
  privacy-facing UI, and couples this fork's routing to upstream's
  local-endpoint feature.
- **Interleaved conditionals in the existing functions.** Rejected: the
  natural way to write it and the worst possible merge behavior, conflicting
  on every upstream edit to those functions.
- **Replace the provider layer wholesale.** Rejected: cleanest resulting
  code, maximum merge cost — the same trade the whitelabel ADR rejected for
  branding.
- **Build on the plugin/host-tool layer instead of touching core.** Rejected
  as not applicable: [ADR-0040](0040-plugin-capabilities-as-host-tools.md)
  host tools are in-loop tools the model calls, not request-routing
  middleware. They cannot intercept where a chat completion is sent.
- **Keep Bonzai work on a long-lived branch over a `main` that mirrors
  upstream exactly**, as the whitelabel plan's house rule prescribes.
  Deferred, not rejected: this fork's `main` already carries branding
  commits, so the topology has diverged. The touched-line discipline matters
  more than the branch shape and applies either way. Revisit if merge cost
  turns out worse than this ADR predicts.
