# Roadmap: Microsoft Entra ID as primary Clovy access gate

**Owner:** Fork engineering (desktop)
**Date:** 2026-09-25
**Status:** Deferred
**Scope:** Fork-only, post-MVP identity iteration: complete OS Accounts replacement, Microsoft Entra ID access gate, and external commercial boundary

This document captures a fork-specific future feature direction for after the Bonzai
MVP. It is a product and architecture plan, not an implementation authorization.
File paths, OAuth protocol details, and Microsoft Entra behavior must be re-verified
against the current tree when the feature is scheduled.

**MVP boundary.** The Bonzai MVP uses the existing no-account mode: no OS Accounts
contact, no billing or credits, and Bonzai-key authorization for inference. Microsoft
Entra is not part of the MVP AccountGate or release path. This plan is intentionally
deferred to a later iteration and must not be treated as an MVP dependency.

**Fork-only notice.** This post-MVP plan proposes replacing the MVP's synthetic
identity with Microsoft Entra ID for work and school accounts. That direction
explicitly overrides the upstream product boundary stated in
`docs/clovy-api-prd.md:440-445` ("Migrating identity off OS Accounts / supporting
alternative IdPs. Out of scope forever") and the identity ownership rule in
`AGENTS.md:276-279`. It is appropriate only for this fork, which routes all model
inference through Bonzai and has no OS Accounts metering dependency. Do not propose
upstreaming this plan or its code changes without re-establishing the identity,
credits, and compatibility contract that the upstream product depends on.

## Executive recommendation

Do not implement Microsoft Entra for the Bonzai MVP. If a later iteration needs
work and school identity, replace the MVP's synthetic identity with a Microsoft
Entra ID browser-based PKCE flow. Store the resulting session in the macOS Keychain
using the existing connector token-custody pattern (`src-tauri/src/connectors/store.rs`).
Surface the Microsoft user's display name, email, and organization as Clovy's
identity state. Billing, credits, and commercial access control remain external to
Clovy and are not represented as OS Accounts concepts or replacement UI.

The fork already runs in no-account mode (see `src-tauri/src/bonzai/severance.rs`),
which is the selected MVP identity boundary. Entra would be a future authenticated
access gate layered on top of that baseline, with Bonzai key authorization remaining
independent of identity.

```text
Sign-in screen (AccountGate replacement)
       |
       v
System browser: Entra work/school authorization code + PKCE
       |
       v
Rust: PKCE exchange → token custody in Keychain
       |
       v
Clovy: Microsoft user identity (display name, email, org)
       |
       v
Bonzai key (existing, in Keychain): authorizes Bonzai requests
```

Clovy API is not in the data path for identity. The Bonzai key authorizes inference
requests independently of which user is signed in.

## Product thesis

Work and school users authenticate with the identity they already maintain through
their organization. Microsoft Entra ID becomes Clovy's only identity and access
gate in this fork. Clovy does not own billing or credits: those commercial concerns
are handled outside Clovy. Notes, sessions, recordings, and memory remain local.
The only identity network boundary is the browser-based Entra authorization round
trip at sign-in and token refresh.

Microsoft identity confirms who the user is. It is not a gateway to organizational
data. This post-MVP identity iteration does not add any Microsoft Graph API calls.
Outlook, Calendar, Files, and Teams capabilities belong to a separate connector
roadmap. The Bonzai key authorizes model requests independent of identity.

## Roadmap status

**This table is the single source of truth for this feature's phase status.**
The detailed phase sections repeat each status. Vocabulary: `not started` |
`in progress` | `done` | `blocked` | `deferred`.

| Phase | Status | Exit criterion | Evidence or blocker |
| --- | --- | --- | --- |
| 0: identity contract and Entra spike | **deferred** | Post-MVP work/school PKCE loopback behavior, token lifetime, refresh policy, and admin-consent state machine are verified; the post-MVP identity contract and data partition key are accepted; ADR gate passed | Deferred until the Bonzai no-account MVP is shipped and a real identity requirement is confirmed |
| 1: Entra OAuth shell and AccountGate replacement | **deferred** | Post-MVP users can sign in with a work/school account; token stored in Keychain; account gate, settings, and onboarding show Microsoft user identity | Depends on Phase 0 and an explicit post-MVP decision to add Entra |
| 2: complete OS Accounts replacement | **deferred** | Post-MVP no OS Accounts identity or billing dependency remains active in this fork; external commercial controls are documented as outside Clovy | Depends on Phase 1 sign-in working end to end |
| 3: compatibility and identity migration | **deferred** | Post-MVP existing local data (notes, sessions, memory, recordings) remains accessible after sign-in; data partition key is stable across sign-out and re-sign-in | Depends on the post-MVP data partition decision in Phase 0 |
| 4: verification and rc pilot | **deferred** | Post-MVP Entra account matrix, Bonzai auth, accessibility, light/dark, and real-app QA support an rc build | Depends on all prior post-MVP phases and a safe disable path |

## Goals

- Replace the OS Accounts sign-in gate with a Microsoft Entra work/school sign-in.
- Store Microsoft tokens in the existing Keychain connector pattern.
- Surface the Microsoft user's display name, email, and organization in place of the
  OS Accounts account snapshot.
- Remove OS Accounts entirely as an identity, billing, and credit dependency.
- Keep billing, credits, and any commercial access policy outside Clovy, with no
  replacement billing or credit surface in the app.
- Keep Bonzai key authorization for model requests independent of sign-in identity.
- Preserve all existing local data (notes, sessions, recordings, memory entries) and
  confirm accessibility after sign-in.
- Keep all connector, agent, and recording capabilities working under Microsoft auth.
- Target work and school accounts only.
- Keep the sign-in screen, in-flight state, and admin-consent error legible and
  actionable.

## Post-MVP iteration non-goals

These are outside the post-MVP Entra iteration described here:

- Consumer Microsoft accounts (personal Microsoft account / Live ID).
- Microsoft Graph data access - Outlook, Calendar, OneDrive, Teams, or any Microsoft
  365 content capability. Those belong to a separate connector roadmap entry.
- Multi-tenant or organization-level access control inside Clovy.
- Sovereign cloud, GCC, or national-cloud Entra endpoints.
- Multi-account or shared-device sign-in.
- OS Accounts upstream compatibility. This plan is fork-only and must not produce
  a pull request against upstream os-clovy.
- Bringing billing, credits, subscriptions, or commercial access policy into Clovy.
- Replacing the Bonzai key authorization mechanism for model requests.
- Any change to Clovy API. Clovy API is not in this fork's model-request data path.

## Existing architecture and reusable seams

This section describes shipped infrastructure this post-MVP feature can reuse or
must replace. Nothing below authorizes implementation or changes the Bonzai MVP.

### Bonzai no-account mode foundation

`src-tauri/src/bonzai/severance.rs` implements `no_account_mode()`, which creates a
synthetic always-signed-in identity with no OS Accounts contact and the `localDev`
flag set so the frontend suppresses the upstream account and commercial surfaces.
This is the selected Bonzai MVP identity boundary and the baseline that this
post-MVP feature may later extend with a real, authenticated Microsoft identity.
The MVP no-account path remains valid and supported while this roadmap is deferred.

`src-tauri/src/os_accounts.rs:466-473` guards the login command with
`bonzai::severance::no_account_mode()`. When that returns true, the command
immediately returns the synthetic identity without touching OS Accounts. A future
Microsoft identity path may replace this fork-specific shortcut only after the
post-MVP decision and ADR are accepted; it must not be implemented as part of the
Bonzai MVP or leave two ambiguous production login paths.

### OS Accounts code paths to replace or deactivate

- `src-tauri/src/os_accounts.rs:666-737` - `os_accounts_login`: opens the
  OS Accounts portal PKCE flow. To be replaced with an Entra equivalent.
- `src-tauri/src/os_accounts.rs:574-622` - `os_accounts_status`: loads stored
  tokens and fetches the account snapshot. A Microsoft path loads a locally cached
  Microsoft identity snapshot instead.
- `src-tauri/src/os_accounts.rs:629-643` - `os_accounts_status_local`: fast
  local-only path. Can serve the locally cached Microsoft identity.
- `src-tauri/src/os_accounts.rs:861-929` - upgrade, change-plan, and open-portal
  commands. These OS Accounts commands are removed from the fork's active product
  surface rather than replaced with Clovy billing commands.
- `src/components/account/AccountGate.tsx` - the OS Accounts sign-in wall. The
  full card including the `OsMark` SVG, "Continue with OpenSoftware" button, and
  terms footer must be replaced with a Microsoft-branded equivalent.
- `src/components/onboarding/steps/SignInStep.tsx` - same sign-in pattern during
  onboarding. Requires a parallel update.
- `src/app/app-account-gates.tsx` - mounts the `AccountGate` and handles
  `AccountStatusFailure`. The failure states become Entra-specific.
- `src/components/account/AccountSettings.tsx` - account settings shows OS
  Accounts-specific billing, avatar, plan, and referral sections. The billing,
  plan, and referral sections must be removed. The sign-in/out and user identity
  sections must show Microsoft user info.
- `src/components/account/FundingNotice.tsx` - the credit-exhausted notice docked
  above composers. Must be removed.

### Connector OAuth primitive (directly reusable)

`src-tauri/src/connectors/oauth.rs:289-332` - `loopback_authorize` provides the
provider-neutral PKCE S256 + loopback HTTP listener + browser open + cancel/timeout
race. An Entra path can reuse this function with only a Microsoft auth URL builder
and token exchange function. Phase 0 must confirm that Entra supports ephemeral
loopback ports for native apps under this fork's account type and app registration.

`src-tauri/src/connectors/store.rs:57-93` - per-provider Keychain storage keyed by
`(provider, account_id)`. The same pattern can store Microsoft session tokens at a
dedicated Keychain service. The naming must follow the ADR-0055 bridge pattern:
canonical `co.opensoftware.clovy.microsoft-identity` with a legacy alias.

`src-tauri/src/connectors/mod.rs:57-113` - `ConnectorProvider` enum and
`ConnectorAccountStatus`. The Microsoft identity session may use a dedicated
identity store rather than the connector account table, since it is not a connector
- it is the primary sign-in. The Phase 0 decision record should settle the
storage boundary.

### Deep-link callback

`src-tauri/tauri.conf.json` registers `plugins.deep-link.desktop.schemes: ["clovy", "osjune"]`.
Entra supports loopback redirects for native apps (RFC 8252), so a loopback TCP
listener (the existing debug path at `src-tauri/src/os_accounts.rs:440-442`)
avoids adding a new custom scheme. Phase 0 must confirm whether ephemeral ports
(like Google) or fixed registered ports (like Linear) are required for this app
registration's redirect URI configuration.

### Frontend AccountStatus type

`src/lib/tauri.ts:1283-1344` defines `AccountStatus`. A Microsoft-backed status
must satisfy the same type contract so downstream consumers (`useAccountStatus`
hook, account gate, settings) need minimal changes. The `user.email`, `user.name`
fields map naturally. `user.avatarSeed` either maps to a stable Entra object id
or falls back to the default derivation used by the existing no-account mode.

### AccountGate and onboarding wiring

`src/app/app-account-gates.tsx` mounts the `AccountGate` behind `!account.signedIn`.
The same wiring works unchanged; only the card content changes.

`src/components/onboarding/OnboardingFlow.tsx:19-49` runs the sign-in step as the
first onboarding step. The step HTML changes; the flow control does not.

### Bonzai key (not affected)

`src-tauri/src/bonzai/keys.rs` holds the Bonzai key in Keychain. The Bonzai key is
a separately managed LiteLLM virtual key. Entra authentication does not change how
Bonzai requests are authorized. The two Keychain items are independent.

## Proposed first-version experience

### Sign-in screen

If the post-MVP Entra iteration is approved, the sign-in screen replaces the OS Accounts card:

- **Card:** same centered card layout as `AccountGate.tsx`, max 320px.
- **Heading:** "Sign in to Clovy" (sentence case, serif `--fs-display`).
- **Subtitle:** "Use your work or school account." (muted, `--fs-lg`).
- **Provider button:** full-width primary action button, Microsoft mark (inline SVG
  or `central-icons` if an `IconMicrosoft` variant is available), label "Sign in
  with Microsoft".
- **Browser handoff state:** "Complete sign-in in your browser" + Cancel button.
  Same `aria-live="polite"` container as the current OS Accounts in-flight state.
- **Admin consent required state:** a distinct error message: "Your organization's
  admin must approve this app before you can sign in." A "Contact your IT admin"
  copy note and a "Try again" button. This is the most important named error state
  for work/school accounts and must not silently fail as a generic sign-in error.
- **Conditional access state:** a message that the organization's policies require
  additional verification, with a "Try again" button.
- **Generic error state:** "Sign-in did not complete. Please try again."
- **No OS Accounts terms footer.**

See [`sketch.html`](sketch.html) for the visual reference for Phase 0 UX review.

### Account settings

After sign-in, the account settings section shows:

- Display name from the Microsoft identity token.
- Email address (user principal name).
- Organization name from the Entra tenant display name (omitted for personal
  accounts, which are a non-goal in the first release).
- Sign out button that clears the Keychain token.
- **No billing, plan, credit, upgrade, or referral rows.** Commercial access is
  handled outside Clovy and has no replacement surface in this release.

### Onboarding

The sign-in onboarding step (`SignInStep.tsx`) mirrors the AccountGate changes.
Value-proposition copy should reference local privacy without mentioning OpenSoftware
plans. The terms footer is removed. The `ul.onboarding-points` grid may reference
organizational context (e.g., "Your notes never leave your Mac") rather than credits.

## Safety, privacy, and compatibility invariants

- Microsoft tokens stay in the Keychain, never in the webview or SQLite.
- The frontend never receives the raw access or refresh token; it receives the
  resolved `AccountStatus` shape via the Tauri command surface.
- This plan does not add any Microsoft Graph API calls. The identity token is
  not forwarded for data access; it is used only to confirm who the user is.
- Bonzai key authorization and Microsoft identity are independent. A failed
  identity refresh does not revoke model access in an active session. A failed
  Bonzai key does not affect identity.
- Local data (notes, sessions, recordings, memory entries) must remain accessible
  after sign-in. The data partition key under Microsoft identity must be stable and
  consistent across sign-out and re-sign-in.
- OS Accounts must receive no requests in this fork after Phase 2. The
  `no_account_mode()` guard and the replacement layer must cover all code paths.
  A CI egress test should assert this.
- Billing, credits, and commercial access controls are external systems. Clovy
  must not recreate their state, tokens, or UI, and their absence must not break
  the agent harness, host tools, or connector approval flows.
- No Microsoft token or identity claim is sent to Bonzai. Bonzai receives only
  the Bonzai key and model request contents.
- This fork's identity changes must not be backported to upstream. The
  UPSTREAM.md ledger (per ADR-0058/ADR-0060) must record any shared-file edits
  caused by this plan.

## Implementation phases

### Phase 0: post-MVP identity contract and Entra spike

**Status: deferred.**

- Run a native-app PKCE flow against Entra with a work/school account to confirm
  loopback redirect behavior: ephemeral port or fixed registered ports.
- Confirm token lifetime, refresh rotation policy (rotating vs non-rotating), and
  whether Continuous Access Evaluation (CAE) may revoke tokens before expiry.
- Confirm Entra admin-consent response shapes: what the auth endpoint returns when
  admin consent is pending, denied, or not required. Document each as a named UI
  state.
- Define what `AccountStatus` looks like under Microsoft identity: which token
  claims map to `user.name`, `user.email`, `user.id`, and `user.avatarSeed`.
- Define the data partition key strategy under Microsoft identity: whether the
  current `default` partition is reused for all users on the device, or whether the
  Entra object id becomes a per-user partition key. The current fork uses a single
  `default` partition. Changing this requires a migration.
- Define the Keychain service name and dual-write convention per ADR-0055 bridge
  pattern.
- Register an Azure app client (`MICROSOFT_OAUTH_CLIENT_ID`) as a public native
  client with the appropriate work/school audience (`organizations` or a specific
  tenant) and loopback redirect URI.
- Write a Phase 0 decision record. An ADR is required before Phase 1 code.

**Exit criterion:** loopback behavior, token lifecycle, admin-consent state machine,
`AccountStatus` shape, data partition key strategy, and Azure app registration are
accepted in a design review. Evidence: Phase 0 spike results and accepted ADR.

### Phase 1: post-MVP Entra OAuth shell and AccountGate replacement

**Status: deferred.**

- Add a Microsoft identity module in Rust, reusing
  `src-tauri/src/connectors/oauth.rs:loopback_authorize` for the PKCE flow and
  the Keychain store pattern for token custody.
- Replace `AccountGate.tsx` and `SignInStep.tsx` with Microsoft-branded equivalents.
- Implement the full sign-in, status-local, status-refresh, sign-out, and
  cancel-login command surface, targeting Microsoft instead of OS Accounts.
- Implement admin-consent and conditional-access named error states in the UI.
- Surface Microsoft display name, email, and organization in account settings.
- Remove all OS Accounts identity and commercial UI rows. Do not add a Clovy
  replacement for billing or credits because those are handled externally.
- Add `MICROSOFT_OAUTH_CLIENT_ID` env var and build-time baking, following the
  connector pattern in `src-tauri/build.rs`.

**Exit criterion:** a user can sign in with a work/school account, see their
identity in settings, and sign out. Evidence: OAuth matrix test across standard
work/school, admin-restricted, conditional-access, and revoke cases. Dated
real-app screenshot or recording attached to the implementation work.

### Phase 2: post-MVP complete OS Accounts replacement

**Status: deferred.**

- Remove OS Accounts identity calls from the active code path. After Phase 1,
  Microsoft identity is the only production sign-in path. The synthetic
  no-account mode remains only as an explicit development fallback, if retained.
- Remove `FundingNotice`, plan cards, upgrade flows, referral summary, billing
  portal links, and all other OS Accounts commercial UI from the frontend.
- Confirm that `clovy_api.rs` and agent tool calls do not send OS Accounts tokens
  or trigger OS Accounts authorize/charge. Commercial authorization is outside
  Clovy and is not replaced with a new in-app billing path.
- Add a CI egress test asserting no code path reaches OS Accounts API endpoints
  in this fork's production configuration, following the Bonzai egress-test
  pattern from ADR-0059.

**Exit criterion:** Microsoft Entra is the only production identity path, no OS
Accounts API request is made after sign-in in a real-app session, and external
commercial ownership is documented without a Clovy billing surface. Evidence:
network trace confirming zero OS Accounts traffic, green test suite, and CI egress
test.

### Phase 3: post-MVP compatibility and identity migration

**Status: deferred.**

- Implement the data partition key strategy accepted in Phase 0.
- Write a one-time migration if needed, following the append-only ADR-0037 catalog.
- Confirm re-sign-in restores the same local data without requiring a new identity.
- Test sign-out and re-sign-in on a device with pre-existing notes, sessions, and
  memory entries.

**Exit criterion:** sign-in, sign-out, and re-sign-in on a device with existing data
leaves no data inaccessible. Evidence: migration test on fresh and existing databases.

### Phase 4: post-MVP verification and rc pilot

**Status: deferred.**

- Real-app QA: sign-in screen, browser handoff, admin-consent error, settings,
  sign-out, onboarding, and every Clovy capability previously gated by account state.
- Verify Bonzai requests succeed independently of Microsoft identity refresh.
- Verify light and dark themes, reduced-motion, keyboard/focus on sign-in card and
  account settings.
- Accessibility: focus trap on error states, `aria-live` on browser-handoff
  container, screen-reader text for the Microsoft sign-in button.
- rc pilot with safe sign-in disable path.

**Exit criterion:** dated real-app QA run covering sign-in, sign-out, agent,
recording, dictation, and connector surfaces. Evidence: screenshot or recording
attached to the implementation work.

## Verification strategy

### Identity and Rust

- PKCE round-trip tests: code exchange, token storage, load, refresh, and revoke.
- Admin-consent and conditional-access error case tests.
- Token lifetime and refresh-rotation tests.
- Data partition isolation test confirming the partition key decision from Phase 0.
- Keychain dual-write test per ADR-0055 bridge pattern.
- CI egress test asserting no request reaches `OS_ACCOUNTS_URL` or
  `OS_ACCOUNTS_API_URL` in this fork's production configuration.

### Frontend

- `AccountGate` renders Microsoft sign-in as the only production identity path, not OS Accounts.
- In-flight state renders the correct browser-handoff message and Cancel button.
- Admin-consent error renders the distinct admin-consent message, not a generic error.
- Account settings shows Microsoft display name, email, organization, and sign-out
  button with no OS Accounts or commercial rows. External billing and credits are
  not represented in Clovy.
- `FundingNotice` is not rendered in any signed-in state.
- Onboarding sign-in step matches AccountGate changes.
- Sentence case, no en/em dashes, sanctioned icons, design tokens, type scale, and
  font weights enforced in all new copy.
- Keyboard: Tab navigation, Enter to submit, Esc to cancel on the sign-in card.
- `aria-live` on browser-handoff container, `aria-label` on provider button.

### Bonzai integration

- A signed-in Microsoft session can make a Bonzai model request.
- A signed-out state blocks the agent and model surfaces.
- A failed Microsoft token refresh does not interrupt an active Bonzai request.
- No Microsoft token or UPN appears in the Bonzai request body.

## Open questions and decision gates

These gates must be resolved before their associated phase begins.

1. **Entra loopback redirect port strategy.** Ephemeral (like Google, confirmed to
   work) or fixed registered ports (like Linear, due to redirect-URI matching)?
   Microsoft's native-app guidance (RFC 8252) supports ephemeral ports for loopback,
   but tenant policy and app registration configuration may require verification.
   Phase 0 spike is the gate. Affects Phase 1 connector module.

2. **Data partition key under Microsoft identity.** The `default` partition for all
   users on the device (simpler, single-user device model) versus the Entra object
   id as a per-user partition key (multi-user device model). Changing this after
   data exists requires a migration. Must be decided and recorded in the Phase 0
   decision record before Phase 3.

3. **Admin-consent state machine.** What does the Entra auth endpoint return when
   consent is pending (`admin_consent_required` in `interaction_required`)? What
   does a deferred consent return? Is there a polling or callback path for async
   admin approval? Phase 0 spike covers this.

4. **Azure app registration scope.** Single-tenant (scoped to a known tenant id),
   multi-tenant for all work/school accounts (`organizations` audience), or a
   specific partner tenant? Multi-tenant allows any work/school user to sign in but
   requires a Microsoft app-review gate for certain scopes if the app later adds
   Graph data access. For identity only, multi-tenant is straightforward.

5. **`MICROSOFT_OAUTH_CLIENT_ID` build baking.** The existing pattern in
   `src-tauri/build.rs` bakes connector client ids at compile time. The same
   approach works for the identity client id. Confirm the Azure app registration
   before Phase 1 build work begins.

6. **Microsoft sign-in icon.** Is an `IconMicrosoft` or equivalent icon available in
   the installed `central-icons` package (`spec/icons-central-only.md`)? If not,
   an inline SVG from the Microsoft brand asset library or a neutral Windows-mark SVG
   is the fallback, following the Obsidian precedent in
   `src/components/connectors/ConnectorProviderIcon.tsx:22-40`. Must be resolved
   before Phase 1 UI work.

7. **ADR threshold.** Replacing the entire identity layer is hard to reverse,
   surprising without context, and a real trade-off (identity custody, data partition
   key, Entra vs OS Accounts dependency). An ADR is required before Phase 1 code.
   This roadmap does not create one; Phase 0 exit is the gate.

## Explicit future ideas and follow-ups

The following ideas are intentionally deferred rather than implied as requirements
for this post-MVP Entra iteration:

- Consumer Microsoft account (personal account) sign-in as an optional second
  provider after work/school is stable.
- Microsoft Graph data access (Outlook, Calendar, OneDrive, Teams) as a separate
  connector. See `docs/plugins/microsoft-365-prd.md` for the proposed scope.
- Calendar-based context from Microsoft Calendar to augment meeting note detection.
- Companion pairing under a Microsoft identity. The current companion auth is
  desktop-authorized and does not depend on OS Accounts, but pairing-flow copy
  referencing "your account" would need review.
- Multi-user device support with per-Entra-object-id data partitions, if the Phase 0
  decision goes to `default` partition first.
- Federated or SSO-token continuity when a user's Entra session is already live in
  the system browser, reducing unnecessary re-authentication prompts.

## Decision summary

If a future product decision establishes a need for work and school identity,
build the Microsoft Entra identity layer on the existing connector PKCE and Keychain
primitives. The Bonzai MVP remains on no-account mode until that decision is accepted.
The post-MVP Phase 0 must confirm the loopback redirect strategy, admin-consent state
machine, data partition key, Azure app registration scope, and token lifetime before
Phase 1 code begins. An ADR is required at Phase 0 exit. Complete the OS Accounts
replacement only after real Entra sign-in works end to end. Billing, credits, and
commercial access remain external to Clovy and are not represented by replacement UI.
Keep Bonzai key authorization independent of identity throughout. Defer consumer
accounts, Graph data access, and multi-user device scenarios to follow-on work.
