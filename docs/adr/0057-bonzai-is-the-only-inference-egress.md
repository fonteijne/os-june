---
status: accepted
date: 2026-09-03
---

# Bonzai is the only inference egress, enforced at the HTTP chokepoints

## Context

This fork (`fonteijne/os-june`) runs its own LiteLLM deployment, **Bonzai**,
on an external managed server. Two requirements travel together: no request
may reach a third-party AI provider, and no OS Accounts credit may ever be
spent. Token spend is attributed per client through per-project Bonzai keys
(LiteLLM virtual keys). See
[bonzai-model-routing-prd.md](../bonzai-model-routing-prd.md).

Stating that as a policy is not enough. Clovy ships and auto-updates, and
this fork pulls upstream releases. The first upstream release that adds a new
provider call would silently reopen egress, and the detection mechanism would
be the leak itself. A guarantee that depends on a reviewer noticing a new
`reqwest` call in a 6,000-line file is not a guarantee.

There are **three independent egress paths**, and they are not equally
governable:

| Path | Location | Governable in-process |
| --- | --- | --- |
| Model calls | `clovy_api::http_client()` | Yes, one chokepoint |
| MCP over HTTP | `agent_mcp.rs` — its **own** `reqwest::Client` instances (`:626`, `:689`, `:762`, `:966`, `:2688`) | Yes, a second chokepoint |
| MCP over stdio | `Command::new(executable)` (`agent_mcp.rs:2415`, `:2429`) | **No** |

A stdio MCP server is a third-party binary making its own network calls. No
in-process allowlist can observe them, and the macOS `sandbox-exec` wrapper
around them constrains filesystem access, not egress.

That makes "never call a third party" and "connect MCPs" mutually exclusive
as absolutes. One of them has to give, and the choice should be explicit
rather than discovered later by someone reading the code.

Not every capability has a Bonzai equivalent. LiteLLM exposes
`/v1/chat/completions`, `/v1/audio/transcriptions` (whisper-class models
across openai, azure, vertex_ai, gemini, deepgram, groq, fireworks_ai,
ovhcloud, mistral), `/v1/models`, and image endpoints. It has no answer for
web search, and only thin support for video. Computer use and browser use are
Clovy-side orchestration with no gateway analogue.

## Decision

**All inference egress terminates at Bonzai, enforced structurally.**

- A single **host allowlist** is enforced at both HTTP chokepoints
  (`clovy_api::http_client()` and the clients in `agent_mcp.rs`). A request
  to any other host **fails closed** with an egress-policy error distinct
  from a network error, so it is unmistakable in logs.
- A **CI test asserts no egress outside the allowlist.** An upstream merge
  that introduces a new provider call fails the build rather than shipping.
  This test is the actual deliverable of this ADR; the allowlist without it
  is back to being a policy.
- The allowlist ships **before** any routing work, so every later change is
  verified by construction rather than audited afterwards.

**The guarantee is split into two claims, each true and each enforceable:**

1. **Inference egress is closed.** All model traffic — agent chat, note
   transcription, dictation, dictation cleanup, note generation — reaches
   Bonzai and nothing else.
2. **Tool egress is governed, not closed.** MCP servers are an explicit
   per-server decision against an allowlist that is empty by default.

For v1, only `streamable_http` MCP servers whose host is on the allowlist are
permitted; **stdio is disabled**, because it is the one path that cannot be
anchored to a chokepoint.

**Capabilities without a Bonzai equivalent are switched off, not rerouted:**
web search and fetch, image generation and editing, video generation,
computer use, and browser use. "Off" means three things together — the tool
is not registered in the agent loop, the UI surface is absent rather than
disabled-looking, and the underlying path fails closed if reached. Hiding UI
while leaving a tool registered is precisely how this guarantee leaks.

**No OS Accounts contact and no metering.** OS Accounts
(`accounts.opensoftware.co`, `api.accounts.opensoftware.co`) is a hosted
third-party service. It never received meeting content — only identity and
billing metadata — but it is an external dependency this fork does not want.
The sign-in gate is satisfied locally with a synthetic account rather than
removed. No authorize or charge call runs on any path.

**Failures are loud.** A revoked or invalid Bonzai key fails the operation,
naming the project and key. It never falls back to the global key, to another
project's key, or to Clovy credits. Silent fallback would destroy the
attribution the feature exists for, and could spend the wrong client's
budget.

## Consequences

- The "never a third party" claim becomes a property of the build. A new
  upstream provider call breaks CI, which is the outcome we want.
- **Real product loss**: no web search, image generation, video generation,
  computer use, or browser use in this fork. Search can return only through
  an approved `streamable_http` MCP server.
- **stdio MCP servers are unavailable in v1.** This excludes the large
  population of MCP servers distributed as local binaries. Relaxing it is a
  deliberate future decision that trades away the chokepoint guarantee, and
  should supersede this ADR rather than quietly widen the allowlist.
- The allowlist is a maintained artifact. Adding an MCP host is a real
  decision with a real review, not a config tweak.
- The split framing survives a security review. A single blanket "never a
  third party" claim would not, once MCP is enabled, and would be a false
  statement in a document someone relies on.
- Disabling five capabilities touches upstream UI surfaces, which carries
  merge cost. [ADR-0058](0058-bonzai-routing-lives-in-an-additive-provider-layer.md)
  governs how that cost is bounded.
- Losing OS Accounts also loses its identity, referral, and subscription
  surfaces. For a single-operator fork this is acceptable; for a multi-user
  deployment it would need revisiting.

## Alternatives considered

- **Policy only — document the rule, review for violations.** Rejected: it
  fails silently and asymmetrically. The cost of a miss is a data leak; the
  cost of the guard is a CI job.
- **A blanket "never a third party" covering MCP too.** Rejected as
  unenforceable. stdio subprocess egress cannot be observed in-process, so
  the claim would be false the moment a stdio server was enabled. A narrower
  true claim beats a broader false one.
- **Route web search through Bonzai.** Rejected: search is not an LLM
  primitive and LiteLLM does not proxy it. Model-native search tools would
  reintroduce third-party egress from the provider side.
- **Keep Clovy API as a fallback when Bonzai is unreachable.** Rejected: a
  fallback path is an egress path. It would also make availability failures
  invisible and spend credits, both of which this fork exists to avoid.
- **Enforce egress at the OS level (firewall, proxy) instead of in-process.**
  Rejected as the primary mechanism: it is per-machine configuration, not a
  property of the build, so it does not travel with the artifact and cannot
  fail a merge. Worth adding as defense in depth, particularly if stdio MCP
  is ever enabled — that is the only mechanism that would govern it.
- **Allow stdio MCP with the existing `sandbox-exec` wrapper.** Rejected for
  v1: the sandbox profile constrains filesystem access, not network access,
  so it does not address the concern that motivates this ADR.
