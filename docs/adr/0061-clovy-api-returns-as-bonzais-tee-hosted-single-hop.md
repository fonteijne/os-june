---
status: accepted
date: 2026-09-14
---

# Clovy API returns as Bonzai's TEE-hosted single hop

## Context

Phase 5 ("severance") of the Bonzai rollout, executed under
[ADR-0057](0057-bonzai-is-the-only-inference-egress.md) and
[ADR-0059](0059-bonzai-egress-is-enforced-by-a-build-time-allowlist.md), cut
every call from the desktop client to Clovy API and to OS Accounts, landing
on **"Zero OS Accounts and Clovy API requests in a session"** as the beta
target (`bonzai-implementation-plan.md`, Phase 5). Clovy API was removed
under the assumption that it shared meeting content with OS Accounts.

That assumption does not hold. ADR-0057 records, in its own words, that OS
Accounts *"never received meeting content — only identity and billing
metadata."* Clovy API's confidential-compute deployment (a TEE, so that
prompt data is not readable even by Clovy's own operators) is a property of
Clovy API's hosting, not of OS Accounts, and the two were removed together
only because they happened to leave in the same phase. Losing the TEE
guarantee was a side effect, not a goal.

This fork's operator has since stated a hard, unconditional restriction:
**no LLM API call, ever, reaches anything other than this fork's own Bonzai
deployment.** That restriction is not renegotiated by this ADR — it is the
frame this ADR designs inside.

An inventory of `clovy-api/` (the confidential backend workspace, distinct
from the Tauri client's `src-tauri/src/clovy_api.rs` module of the same
name) found:

- **`clovy-api/crates/providers/src/http.rs`** is a shared, unguarded HTTP
  client factory (`default_client()`, `client_with_timeout()`,
  `issue_report_client()`, `jwks_client()`). No allowlist exists — expected,
  since nothing has called this workspace since severance.
- **`providers/src/venice.rs`** and **`providers/src/openai.rs`** are the two
  LLM-relevant provider adapters, each pointed by config
  (`UpstreamsConfig.venice.base_url` / `.openai.base_url`) at the real public
  API (`https://api.venice.ai/api/v1`, `https://api.openai.com/v1`).
- **A deliberate, by-design bypass**: `venice.rs`'s BYOK (bring-your-own-key)
  path hardcodes `VENICE_PUBLIC_BASE_URL` and routes a user-supplied Venice
  key straight to Venice's public API, because Venice only accepts a key at
  the endpoint that issued it — it will not authenticate a user's key
  presented through a gateway. This is incompatible with the hard
  restriction above and is not something a gateway change can fix.
- Three **non-LLM** network surfaces (issue reporting to OS Platform, private
  note sharing, JWKS-based token verification against OS Accounts) exist in
  the same workspace. They do not bear on the LLM-egress restriction and are
  addressed separately in
  [ADR-0062](0062-clovy-apis-non-inference-surfaces-stay-disabled-pending-their-dependencies.md).

ADR-0057 considered and rejected *"Keep Clovy API as a fallback when Bonzai
is unreachable."* This ADR is not that alternative. A fallback is a second,
conditional path to a third party when the primary path fails — precisely
the hole ADR-0057 closed. What this ADR adopts is a mandatory, unconditional
single hop: every inference call, always, travels client → Clovy API →
Bonzai, with no other destination reachable from either leg. Clovy API never
gets to reach anything Bonzai's guard would refuse; it sits inside the one
permitted path, not beside it.

## Decision

**Clovy API is reinstated as the mandatory, exclusive hop between the
desktop client and Bonzai, deployed inside a TEE.**

- **Client → Clovy API → Bonzai, and nothing else, on either leg.** No path
  exists from the desktop client to any host but Clovy API, and no path
  exists from Clovy API to any host but Bonzai.
- **The TEE property is restored, not reinvented.** Clovy API runs in
  confidential compute, exactly as it did upstream, so prompt data stays
  unreadable to infrastructure — including this fork's own operators.
- **Two-tier compiled egress enforcement**, mirroring ADR-0059's mechanism at
  both ends:
  1. **Desktop client** (Tauri + agent-runtime): the existing compiled
     allowlist (`src-tauri/src/bonzai/egress.rs`) is repointed to Clovy API's
     host only. The sixteen-plus guarded call sites ADR-0059 inventoried
     keep their guard; they now enforce "only Clovy API" instead of "only
     Bonzai."
  2. **Clovy API**: a new compiled allowlist restricted to the Bonzai host
     (`api-v2.bonzai.iodigital.com`, the same host already compiled into the
     Tauri client), enforced at a guarded constructor replacing
     `providers/src/http.rs`'s unguarded one, plus a source-level CI guard
     over the `clovy-api` workspace that fails the build on any
     `reqwest::Client::new()` / `::builder()` / `::default()` (and
     `ClientBuilder` equivalents) outside that constructor — the same
     two-part mechanism (runtime check *and* source guard) ADR-0059
     established for the desktop client, now extended to a second codebase.
     ADR-0059's own corrections apply here too: the real inventory of
     construction sites must be counted, not assumed, before the guarantee
     is claimed.
- **Venice BYOK is removed, not hidden.** `UpstreamConfig.byok_base_url`, the
  `byok_base_url()` resolver, and the BYOK branch in `request_base_url()` are
  deleted from `venice.rs` and its config. No code path may construct a
  request to `api.venice.ai`, `api.openai.com`, or any other upstream AI
  host, under any configuration.
- **OS Accounts stays fully absent.** This ADR adds no OS Accounts contact.
  Clovy API's authorize/charge machinery
  (`services/src/charge_flow.rs`, `providers/src/os_accounts.rs`) is not
  wired into this path. No-account mode (see CONTEXT.md) is unaffected.
- **The additive-layer discipline from
  [ADR-0058](0058-bonzai-routing-lives-in-an-additive-provider-layer.md) /
  [ADR-0060](0060-the-bonzai-touched-line-budget-is-a-shape-rule-with-an-inventoried-ceiling.md)
  extends to `clovy-api`.** New guard logic lives in new files; any edit to
  a file upstream also maintains is the narrowest possible substitution. No
  specific line budget is set here — ADR-0058's guessed budget was wrong by
  a factor of three before ADR-0060 corrected it from a real inventory, and
  the same discipline (measure first, budget second) applies.

## Consequences

- The TEE / "prompt data unreadable by infra" property returns for this
  fork.
- Clovy API becomes live operational infrastructure again: something to
  build, deploy inside a TEE, and keep running — a real cost Phase 5 had
  removed.
- Enforcement now spans two codebases. ADR-0059's "sixteen sites, not eight"
  lesson applies again: the actual construction-site inventory for
  `clovy-api` must be done before the guarantee is claimed as shipped, not
  assumed from this ADR's description.
- Removing Venice BYOK is a real capability loss for anyone who relied on
  bringing their own Venice key. Accepted deliberately: the operator's
  restriction is unconditional, and a standing exception is exactly the
  "policy, not guarantee" gap ADR-0057/0059 exist to close.
- `bonzai-implementation-plan.md`'s Phase 5 status line ("Zero OS Accounts
  and Clovy API requests in a session") no longer describes Clovy API
  accurately and needs a documentation update alongside implementation —
  noted here as a followup, not performed in this ADR.
- CONTEXT.md's "Clovy API" glossary entry is updated in the same change: its
  authorize/charge-against-OS-Accounts description was accurate upstream and
  no longer describes this fork's use.

## Alternatives considered

- **Keep the direct client → Bonzai design (status quo).** Rejected: it
  loses the TEE privacy property for a reason (data sharing with OS
  Accounts) that, on inspection, was never true.
- **Clovy API as a fallback when Bonzai is unreachable** (ADR-0057's
  rejected alternative). Still rejected, for the same reason: a conditional
  second path is an egress hole. This ADR's design is not conditional —
  Clovy API is mandatory and exclusive on both legs, not a backup route.
- **Keep Venice BYOK as an explicit, documented exception.** Considered and
  rejected: the operator's restriction is stated as absolute, and a standing
  exception is the exact gap ADR-0057/0059 were written to close.
- **Model Bonzai as `clovy-api`'s existing generic/custom-OpenAI-compatible
  provider path.** Rejected for the reason ADR-0058 rejected the equivalent
  shortcut on the desktop side: it would misdescribe a managed remote
  gateway as a private/local endpoint and couple this fork's routing to a
  feature upstream may change independently.
