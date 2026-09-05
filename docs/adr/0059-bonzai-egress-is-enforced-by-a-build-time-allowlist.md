---
status: accepted
date: 2026-09-04
supersedes: 0057
---

# Bonzai egress is enforced by a build-time allowlist at every client site plus a source-level guard

## Context

[ADR-0057](0057-bonzai-is-the-only-inference-egress.md) established that all
inference in this fork terminates at Bonzai, and that the guarantee must be
structural rather than a policy someone remembers. That decision stands. What
it got wrong was the mechanism, in three ways that only became visible while
writing [bonzai-implementation-plan.md](../bonzai-implementation-plan.md).
Because all three concern how the guarantee is enforced - and a guarantee is
only as good as its enforcement - this supersedes rather than amends.

### Correction 1: there are eight client sites, not one

ADR-0057 named `clovy_api::http_client()` as *the* model-call chokepoint.
There are three static clients in that file and five more in `agent_mcp.rs`:

| Site | Location | Used for |
| --- | --- | --- |
| `http_client()` | `clovy_api.rs:3768` | Clovy API calls |
| `agent_http_client()` | `clovy_api.rs:3782` | Agent chat proxying |
| `local_http_client()` | `clovy_api.rs:3809` | The custom/local endpoint |
| five `reqwest::Client` constructions | `agent_mcp.rs:626, 689, 762, 966, 2688` | MCP over HTTP |

An allowlist installed at one of eight sites is not an allowlist.

### Correction 2: a runtime check cannot catch what upstream adds

A runtime `assert_allowed(&url)` guards only the call sites it was written
into. The threat ADR-0057 exists to address is an upstream merge introducing
a **new** provider call - which arrives with its own client and its own call
site, and sails straight past every check we placed by hand.

The runtime check is necessary and insufficient. What actually catches the
threat is a check on the *source*: no raw `reqwest` client may be constructed
outside the guarded constructor. That fails the build when upstream adds one,
which is the outcome the original decision asked for and did not specify a
means to obtain.

### Correction 3: an allowlist derived from runtime config validates nothing

This is the serious one, and it is a trap the repo's existing configuration
pattern walks straight into.

Config in this codebase resolves as `env_or_build_trimmed(key,
option_env!(KEY))` (`os_accounts.rs:457`, duplicated at
`connectors/mod.rs:167`): a build-time baked value, **overridden by a runtime
environment variable when one is set**. Runtime wins. And `load_local_env()`
(`os_accounts.rs:534`) searches candidate paths for a `.env` file and loads it
at startup, so "runtime environment" includes a file dropped beside the
binary.

If the Bonzai base URL follows that pattern *and* the allowlist is derived
from the configured base URL, then anything able to set an environment
variable or write a `.env` redirects every inference request to a host of its
choosing - and the allowlist approves it, because the allowlist is whatever
the config says. The check becomes self-referential and enforces nothing.

The two values look similar and are not: the base URL is *where we send*, the
allowlist is *where we are permitted to send*. Only the first may be
configurable.

### Retained from ADR-0057

The stdio problem is unchanged: an MCP server launched via
`Command::new(executable)` (`agent_mcp.rs:2415`, `:2429`) is a third-party
binary whose network calls no in-process check can observe, and the macOS
`sandbox-exec` wrapper constrains filesystem access rather than egress.

## Decision

**The allowlist is compiled in and is not derivable from runtime
configuration.** It is a build-time constant. No environment variable, `.env`
file, settings file, or user action may add a host to it. Changing it
requires a rebuild, which is the property that makes it a guarantee.

**The base URL may be runtime-overridable, but only within the allowlist.**
Bonzai's base URL follows the repo's existing `env_or_build_trimmed` pattern
so development can point at a staging gateway, and is then checked against
the compiled allowlist like any other destination. A base URL outside the
allowlist fails closed at startup with a distinct error, rather than being
silently honoured.

**Enforcement is two-part, and both parts ship together:**

1. **Runtime.** `bonzai::egress::assert_allowed(&url)` in the request
   helpers, failing closed with a distinct `egress_blocked` error that is
   never confusable with a network error.
2. **Source-level CI guard.** A test that fails if `reqwest::Client::new()`
   or `reqwest::Client::builder()` appears anywhere outside
   `bonzai/egress.rs`. All eight sites above route through the guarded
   constructor. This is the load-bearing half: it is the only part that
   catches a client we did not write.

**The two claims from ADR-0057 are retained verbatim**, because they were
right:

1. **Inference egress is closed.** All model traffic reaches Bonzai and
   nothing else.
2. **Tool egress is governed, not closed.** MCP servers are an explicit
   per-server decision against an allowlist that is empty by default.

**stdio MCP stays disabled**; only `streamable_http` servers on allowlisted
hosts are permitted. **No OS Accounts contact and no metering.** **Failures
are loud** - a revoked or invalid Bonzai key fails the operation and never
falls back to another key or to Clovy credits.

**The set of disabled capabilities is the PRD's to define**, not this ADR's.
[bonzai-model-routing-prd.md](../bonzai-model-routing-prd.md) is the
authority for what ships in beta; this ADR governs only how the egress
boundary is enforced for whatever does. That split is deliberate: capability
scope changes with a feature flag, and should not require superseding an ADR.

## Consequences

- The guarantee now has a mechanism that matches its ambition. An upstream
  merge adding a provider call fails CI at the source guard.
- **The source guard fails the moment it lands**, because eight raw client
  constructions already exist. Routing them through the guarded constructor
  is the bulk of Phase 1, and that is intended: the guard's first act is to
  prove it can see every site.
- **Pointing the fork at a different gateway now requires a rebuild.** This
  is a real operational cost, deliberately accepted. A deployment that needs
  several gateways needs several builds, exactly as ADR-0054's whitelabel
  analysis found for updater endpoints and signing identities.
- The allowlist is compiled in, so it cannot be audited by inspecting a
  running install's configuration. It is auditable by reading the source of
  the tagged build, which is a stronger property and a less convenient one.
- Development against a local or staging LiteLLM requires that host to be in
  the compiled allowlist, so development and release builds differ in their
  allowlist contents. That difference must be visible in the build, not
  incidental.
- Two enforcement mechanisms mean two things to maintain, and the source
  guard will occasionally be a nuisance when a legitimate new client is
  needed. That friction is the feature.

## Alternatives considered

- **Runtime check only (ADR-0057 as written).** Rejected by Correction 2: it
  cannot see a client it was not written into, which is precisely the failure
  mode that matters.
- **Source guard only.** Rejected: it proves every client comes from the
  guarded constructor but says nothing about the URLs passed at runtime. The
  two checks cover different halves.
- **Derive the allowlist from the configured base URL.** Rejected by
  Correction 3. It is the most natural design - one source of truth, no
  duplication - and it reduces the guarantee to a tautology.
- **Make the allowlist a signed runtime policy file.** Rejected as
  disproportionate: it reintroduces key management and a verification path to
  solve a problem a compile-time constant already solves, for a fork with one
  operator.
- **Enforce at the OS level (firewall or forced proxy) instead.** Rejected as
  the primary mechanism, retained as defense in depth: it is per-machine
  configuration rather than a property of the build, so it does not travel
  with the artifact and cannot fail a merge. It is, however, the only
  mechanism that would govern stdio MCP subprocesses if those are ever
  enabled.
- **Allow a runtime override with a confirmation prompt.** Rejected: a prompt
  is a policy, and this ADR exists because policies do not survive contact
  with an automated merge.

## Addendum - the inventory was sixteen sites, not eight (2026-09-05)

Correction 1 above named eight client construction sites. Implementing the
guard found **sixteen**, across eight files rather than two. The eight this
ADR missed:

| Site | Location | Used for |
| --- | --- | --- |
| `probe_local_generation_endpoint` | `providers/mod.rs:1120` | probing a user's local endpoint |
| `venice_verify_http_client()` | `providers/mod.rs:1517` | verifying a Venice BYOK key |
| `video_download_client_builder()` | `video_download_url.rs:56` | pinned video downloads |
| `live_server_reachable()` | `clovy_api.rs:5856` | a test-only reachability probe |
| Notion hosted-MCP client | `connectors/notion.rs:142` | Notion connector traffic |
| `connectors::oauth::http_client()` | `connectors/oauth.rs:55` | connector OAuth |
| `os_accounts::http_client()` | `os_accounts.rs:1289` | OS Accounts |
| `companion_http_client()` | `companion/mod.rs:2272` | the companion relay |

Implementing it also widened what the guard looks for. The decision above
names `reqwest::Client::new()` and `reqwest::Client::builder()`; the guard as
shipped also rejects `Client::default()`, `ClientBuilder::new()`, and
`ClientBuilder::default()`, which are equivalents an idiomatic upstream commit
could plausibly use. It does not catch a client reached through an alias or a
function pointer, and does not try to: the threat is an upstream merge writing
ordinary `reqwest`, not evasion from inside this repo.

The correction strengthens the argument rather than weakening it. An
inventory compiled by hand was wrong by a factor of two within two days of
being written, which is precisely why the decision is a source-level guard
and not a list of call sites someone maintains.

Counted as touched lines the number is **22**, not sixteen: six sites carry
an `.unwrap_or_else(|_| reqwest::Client::new())` fallback on its own line,
and that fallback constructs a client too. With the two lines that call the
startup validation from the Tauri setup hook, Phase 1 spends **24**.

**Consequence for the budget.** ADR-0058 sets a budget of under 40 touched
lines in shared files, and
[bonzai-implementation-plan.md](../bonzai-implementation-plan.md) estimated
Phase 1 at ~13 of it on the strength of the eight-site figure. At 24 the beta
total projects to **~48 / 40**. The overrun is not logic leaking out of
`bonzai/` - every one of the 22 is a single-token substitution to a guarded
constructor, and there is no smaller form that still leaves the guard
crate-wide. It is an estimate that rested on a wrong count.

This addendum records the overrun rather than resolving it: ADR-0058 requires
that its budget be revised in a superseding ADR rather than quietly exceeded,
and that decision is due before Phase 5. Narrowing the guard's scope to buy
the lines back is not an option on the table - a guard that reads only the
files we already know about is the failure mode Correction 2 exists to close.
