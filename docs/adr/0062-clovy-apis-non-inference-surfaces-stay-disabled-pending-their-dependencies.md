---
status: accepted
date: 2026-09-14
---

# Clovy API's non-inference surfaces stay disabled pending their dependencies

## Context

[ADR-0061](0061-clovy-api-returns-as-bonzais-tee-hosted-single-hop.md)
reinstates Clovy API as the mandatory hop to Bonzai. That same workspace also
carries three network-facing features unrelated to inference, none of them
bound by ADR-0061's "never anything but Bonzai" restriction because none of
them are LLM calls:

- **Issue/bug reporting** (`providers/src/issue_reports.rs`): posts to OS
  Platform via `OsPlatformIssueReportSink`.
- **Private note sharing** (`api/src/handlers/share.rs`,
  `share_viewer.rs`): a ciphertext-only share link — the server stores and
  serves only encrypted content, decrypted client-side from a key in the URL
  fragment it never receives — plus a share-viewer page that offers an
  embedded OS Accounts PKCE sign-in, proxied through
  `/v1/share-viewer/token`.
- **JWKS-based bearer-token verification** (`providers/src/jwks.rs`): a
  generic OIDC-shaped verifier (any issuer/JWKS URL works), currently
  configured with `OsAccountsConfig` — `jwks_url` derived from OS Accounts'
  `api_url`, `issuer`/`audience` from OS Accounts' values.

None of the three is an LLM call, so ADR-0061 does not technically forbid
them. But each either depends on infrastructure this fork does not yet have
(a ticketing backend, an identity provider) or still reaches OS Accounts,
which stays fully absent from this fork independent of the LLM-specific
restriction.

## Decision

**All three stay disabled until their real dependency exists**, not rejected
as designs:

- **Issue/bug reporting is disabled.** `OsPlatformIssueReportSink` targets OS
  Platform, which this fork does not use, and there is no Jira sink yet.
  Reports fall back to the log-only path. No sink code is removed — this is
  a placeholder pending real infrastructure.
- **Private sharing is disabled, including the share-viewer's OS Accounts
  sign-in.** The ciphertext-only design is sound and is not being rejected;
  the feature is switched off because, as configured today, opening a share
  link can initiate an OS Accounts login flow, and this fork wants no live
  OS Accounts path under any circumstance while OS Accounts stays fully
  absent.
- **JWKS-based token verification is disabled as currently configured** —
  i.e., not wired to OS Accounts' JWKS endpoint. Until Entra ID is
  integrated (see the earlier discussion of Entra ID as this fork's
  licensing gate), Clovy API's endpoints rely on network-level access
  control rather than per-request bearer-token verification.
  `JwksTokenVerifier` itself is not rewritten — it is generic — only its
  current OS-Accounts configuration is unplugged. Pointing it at Entra ID
  later is a configuration change (`jwks_url`, `issuer`, `audience` set to
  the tenant's `/.well-known/jwks.json`), not new code.

## Consequences

- Clovy API ships, for now, with no per-request caller authentication. Its
  network placement — not being reachable except where a route genuinely
  must be — is the only access control until Entra ID lands, and that must
  be enforced at the deployment/network level; nothing in this ADR enforces
  it in code.
- No bug/issue telemetry leaves this fork until a Jira sink exists;
  regressions are visible only through direct monitoring and logs in the
  interim.
- Private sharing is unavailable to end users until its OS Accounts sign-in
  is redesigned or removed.
- Re-enabling each surface is additive later (a new Jira sink, new auth
  config values, a redesigned or removed viewer sign-in) — none requires
  undoing this ADR.

## Alternatives considered

- **Wire JWKS to OS Accounts as-is, since it only fetches public keys, never
  user data.** Rejected: it is still a live network dependency on
  `accounts.opensoftware.co`, and still requires an OS-Accounts-issued token
  to authenticate — both contradict keeping OS Accounts fully out of this
  fork, even though no content or billing data is involved.
- **Wire issue reporting to a placeholder Jira project now.** Rejected: no
  Jira integration exists yet; building one prematurely would be throwaway
  work. Deferred until the Jira sink is actually built.
- **Keep the share-viewer's OS Accounts sign-in behind a feature flag
  instead of removing the path.** Rejected: a reachable code path is a
  reachable code path regardless of a flag's default. Disabling it outright
  matches the "compiled, not configured" discipline ADR-0059 uses for the
  Bonzai allowlist.
