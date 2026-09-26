# Roadmap: MCP form URL field on Bonzai builds

**Owner:** Desktop engineering  
**Date:** 2026-09-26  
**Status:** Shipped  
**Scope:** Bonzai MCP form initialization plus the compiled loopback MCP egress policy; no migration, protocol, or Tauri command change

This document records the delivered form fix and loopback MCP policy, together with the
remaining known issues and follow-ups. It is not a replacement for the tracker, ADRs, or
release evidence.

---

## Root cause and delivered result

Before Phase 1, the "Add MCP server" dialog always opened in the `stdio` branch because
`EMPTY_DRAFT` in `src/components/settings/AgentMcpServersSection.tsx:40-53` defaulted to
`transport: "stdio"`. `openCreate()` restored that default before the asynchronous Bonzai
status lookup had completed. The correction effect could then re-render the form from
Command/Arguments to URL after the dialog opened.

The delivered form now waits for the cached Bonzai status before opening, guards stale
async dialog requests, and keeps structured save errors visible above the scrollable body.
On a Bonzai build, Streamable HTTP is the only transport and the URL field is visible from
first open. Phase 2 adds the exact loopback HTTP/HTTPS policy for local Docker endpoints.

---

## Executive recommendation

Deliver the work as two coordinated phases: first make the Bonzai Add MCP server dialog
initialize Streamable HTTP reliably, then allow exact loopback HTTP/HTTPS MCP endpoints in
the release policy for local Docker workflows. Keep the external MCP allowlist empty until
an external-host decision is made. No migration, protocol, or Tauri command change is
needed.

### Ownership flow

```
Frontend engineer (Phase 1)
    │  corrects openCreate() draft initialization
    ▼
AgentMcpServersSection.tsx
    │  passes transport="streamable_http" and url to save()
    ▼
create_agent_mcp_server Tauri command
    │  validate(): accepts http:// for loopback, https:// elsewhere
    │  bonzai::mcp_policy::check() → assert_mcp_allowed():
    │    - exact loopback (localhost/127.0.0.1/::1): HTTP or HTTPS — allowed
    │    - external host: HTTPS + compiled MCP_ALLOWED_HOSTS match required
    ▼
MCP_LOOPBACK_HOSTS (unconditional; release and debug)
MCP_ALLOWED_HOSTS  (external hosts only; empty by default)
```

---

## Roadmap status

**This table is the single source of truth for phase status.** Detailed phase headings
repeat each status. Vocabulary: `not started` | `in progress` | `done` | `blocked` |
`deferred`.

| Phase | Status | Exit criterion | Evidence or blocker |
| --- | --- | --- | --- |
| 0: triage and scope | **done** | Root cause, affected file, and policy context documented | Confirmed by inspecting `AgentMcpServersSection.tsx:40-53`, `:79-84`, `:173-178`, and `bonzai/egress.rs:57-70` in this session |
| 1: form fix | **done** | URL field appears on first open; async dialog and structured-error tests pass | `AgentMcpServersSection.tsx` and component tests updated; focused suite is green |
| 2: MCP allowlist policy | **done** | Loopback HTTP policy is implemented and documented without widening inference or external-host egress | User selected local Docker support; ADR-0059 addendum and policy tests are the evidence |

---

## Goals

- The URL field appears when "Add MCP server" is opened on a Bonzai build.
- A full endpoint such as `http://localhost:9998/mcp` can be entered in the URL field;
  acceptance at save time remains governed by the active Bonzai policy.
- No regression to the existing test coverage in `src/test/agent-mcp-servers.test.tsx`.
- The fixed dialog uses only existing design system primitives with no new CSS classes.

---

## First-release non-goals

- Adding runtime UI for managing external MCP allowlist entries.
- Supporting stdio MCP servers on Bonzai builds.
- Adding migrations or changing the Tauri command shape.
- Allowing arbitrary private-network or non-exact loopback destinations.
- Adding external MCP hosts to `MCP_ALLOWED_HOSTS`; each is a separate policy decision.
- Restoring hosted MCP/search through this local loopback exception.

## Known issues and follow-ups

These items are intentionally documented rather than included in this shipped scope:

1. OAuth metadata, client registration, authorization-code exchange, and refresh endpoints
   derived from an MCP server are still separate HTTPS OAuth destinations. They require a
   follow-up policy review to ensure a loopback MCP server cannot advertise an unintended
   external OAuth endpoint. Redirect handling and endpoint allowlisting must be addressed
   before making a broad claim that all MCP-related OAuth egress is locally contained.
2. An in-flight save can still complete after the user closes the dialog and opens another
   one. A follow-up should bind save completion and error state to the dialog request id and
   disable competing close/save actions while the request is pending.
3. **Persisted stdio servers only:** an existing server imported or saved before the Bonzai
   policy can still have `transport: "stdio"`. Opening Configure on Bonzai converts that
   draft to Streamable HTTP, but it has no URL unless the user supplies one, so saving it
   fails with a URL-required error. New Bonzai servers cannot enter this state because stdio
   is hidden at creation. The follow-up should present an explicit migration/review state
   rather than silently converting the draft.

---

## Existing architecture and reusable seams

### Frontend fix seam

| Location | Role |
| --- | --- |
| `AgentMcpServersSection.tsx:40-53` | `EMPTY_DRAFT` defines `transport: "stdio"` as the global default |
| `:79-84` | Bonzai correction `useEffect` fires on `bonzaiActive` changes, not on dialog open |
| `:173-178` | `openCreate()` resets to `EMPTY_DRAFT` unconditionally; this is the fix point |
| `:446-492` | Transport branch: `stdio` branch renders Command + Arguments; `streamable_http` branch renders URL + OAuth checkbox |
| `src/lib/bonzai.ts` (or equivalent) | `useBonzaiActive()` hook already used at `:76` |
| `src/test/agent-mcp-servers.test.tsx:115-143` | OAuth HTTP server test already selects `streamable_http` explicitly; continues to pass after the fix |

### Rust validation and policy

| Location | Behavior |
| --- | --- |
| `src-tauri/src/agent_mcp.rs:256-337` | Shared exact loopback predicate accepts `http://` for `localhost`, `127.0.0.1`, and bracketed or unbracketed `::1`; accepts `https://` for all hosts |
| `src-tauri/src/bonzai/mcp_policy.rs:22-36` | Bonzai rejects stdio, permits exact loopback HTTP/HTTPS, and applies external HTTPS allowlisting |
| `src-tauri/src/bonzai/egress.rs:57-107` | `MCP_ALLOWED_HOSTS` remains external and empty; `MCP_LOOPBACK_HOSTS` is unconditional and separate from inference egress |

The form fix makes the URL field reachable. The release policy now permits the local Docker
endpoint `http://localhost:9998/mcp`; external MCP hosts remain governed by the compiled
allowlist.

### Design system (existing, no changes needed)

The form already uses `.dialog-field` / `.dialog-input` / `.dialog-textarea` from
`app.css:23954-24007`. The Transport `<select>` uses the native `<select>` with
`.dialog-input` applied; the URL and Command inputs both use `.dialog-input`. No new
CSS classes or design system components are needed for Phase 1.

---

## Phase 0: triage and scope (done)

Root cause, fix point, policy context, and non-goals are recorded above. The original
frontend diagnosis and the later release-loopback policy decision are documented; no
additional product scope is implied.

---

## Phase 1: form fix (done)

### Delivered change

`AgentMcpServersSection.tsx` now waits for the cached Bonzai status before opening Add MCP
server, initializes the draft on the correct transport, and guards stale async dialog
requests from overwriting a subsequent edit. Save errors render outside the scrollable body
so policy failures remain visible. The component tests cover deferred Bonzai resolution,
HTTP form rendering, structured errors, and dialog retention after failure.

### Verification evidence

1. The Bonzai form test resolves deferred status, confirms the dialog waits for status, and
   asserts URL is present while Command, Arguments, and stdio are absent.
2. The save-error test confirms structured errors remain inside the open dialog.
3. Focused frontend MCP tests, typecheck, and Biome are green.
4. Visual QA should still capture the fixed form in both light and dark themes when the PR
   is prepared.

---

## Phase 2: MCP allowlist policy (done)

### Context

After Phase 1, the Bonzai release policy still rejects external MCP hosts unless they are
compiled into `MCP_ALLOWED_HOSTS` (`src-tauri/src/bonzai/egress.rs:61`). A Docker server at
`http://localhost:9998` is now handled by the dedicated loopback MCP policy instead of the
external host list.

### Decision

Permit exact loopback MCP hosts (`localhost`, `127.0.0.1`, `::1`) over HTTP or HTTPS in
release and debug builds through a dedicated compiled `MCP_LOOPBACK_HOSTS` policy branch.
Keep external `MCP_ALLOWED_HOSTS` empty until a separate host decision is made. Keep
stdio disabled. This decision is recorded as an addendum to ADR-0059 because it changes
the HTTPS rule for MCP loopback only.

### Exit criterion

The loopback policy is implemented and tested without changing inference egress or
external-host admission. Local Docker MCP endpoints can be saved and connected from a
release build.

---

## Verification strategy (combined)

| Check | Phase | Method |
| --- | --- | --- |
| URL field visible on open | 1 | Visual in Bonzai dev build |
| Command/Arguments absent | 1 | Visual in Bonzai dev build |
| Loopback URL accepted by validator | 1 | Rust unit test (already in `agent_mcp.rs`) |
| `pnpm test` clean | 1 | `pnpm test` |
| New Bonzai-default test | 1 | Vitest with mocked `useBonzaiActive` |
| Non-Bonzai regression | 1 | Vitest existing cases |
| Light and dark screenshots in PR | 1 | Visual inspection |
| Allowlist policy decision recorded | 2 | Product decision + note in plan |

---

## Open questions and decision gates

1. **External MCP hosts**: Which external HTTPS MCP hosts, if any, should be added to
   `MCP_ALLOWED_HOSTS` in a future rebuild? Loopback support is resolved by Phase 2, but
   hosted MCP and web search remain separate decisions.

2. **Error message at save time**: When a user enters an HTTPS URL for an external host not
   in `MCP_ALLOWED_HOSTS`, the error message ("the MCP server host is not in this build's
   compiled MCP allowlist") is technically accurate but may be opaque. Consider whether a
   more actionable message would help in a future policy update.

---

## Future ideas and follow-ups

- Add specific external hosts to `MCP_ALLOWED_HOSTS` when the product is ready to allow
  external MCP servers on release builds (requires a rebuild).
- Show an inline note on the URL field explaining the HTTPS + allowlist requirement to
  engineers using release builds.
- Add a dev-build UI affordance that lists the currently allowed MCP hosts for debugging.
- Investigate whether the `EMPTY_DRAFT` constant pattern should be replaced with a factory
  function that is aware of build-time flags, to avoid similar drift for future
  transport-specific fields.

---

## Decision summary

Phase 0 confirmed: the original bug was a draft initialization oversight in `openCreate()`
in `AgentMcpServersSection.tsx`. Phase 1 corrects the form state. Phase 2 now permits
exact loopback HTTP MCP in release builds through a dedicated egress branch, with an ADR
addendum documenting why inference and external MCP policy remain unchanged.
