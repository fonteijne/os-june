---
status: accepted
date: 2026-09-06
supersedes: 0058 (the budget clause only; every other decision in 0058 stands)
---

# The Bonzai touched-line budget is a shape rule with an inventoried ceiling

## Context

[ADR-0058](0058-bonzai-routing-lives-in-an-additive-provider-layer.md) set a
budget of **under 40 touched lines** in files upstream also edits, and said
the number should be revised in a superseding ADR rather than quietly
exceeded. This is that ADR. The beta landed at **119 counted lines** across
Phases 1 to 6 (ledger in [UPSTREAM.md](../../UPSTREAM.md)), against an
estimate of 37. Three things account for the gap, and none of them is logic
that should have lived in `bonzai/`:

1. **The Phase 1 inventory was wrong by two.** ADR-0059 counted eight client
   construction sites; there were sixteen (its 2026-09-05 addendum). Every
   one is a single-token substitution and there is no smaller form that
   leaves the source guard crate-wide. 24 lines against ~13.
2. **Severance is broad by nature.** Routing touches three functions.
   Severance touches every surface a disabled capability has: two request
   chokepoints and three direct GETs, the tool registry and its dispatch,
   the account status and its short-circuit, telemetry, the dictation helper
   on three paths, and the sidebar in three places. Each is a one-line or
   three-line guard, and there are many of them. 62 lines against ~7.
3. **A JSX wrap re-indents what it wraps.** Hiding a twelve-line button
   behind a flag changes twelve lines. The change is one conditional; the
   diff is thirteen lines.

What the 40 was for has not changed: making growth visible, and refusing
interleaved logic in shared files. What it got wrong was treating a line
count as the invariant. The invariant that actually protects merges is the
*shape* of each edit.

## Decision

**The budget is a shape rule first and a ceiling second.**

Every edit to a shared file must be one of exactly four shapes:

| Shape | Form | Example |
| --- | --- | --- |
| **Prologue** | one or three lines at the top of an existing function, returning early or propagating an error | `if crate::bonzai::active() { return ...; }` |
| **Substitution** | one token replaced on one line, nothing restructured | `reqwest::Client::builder()` becomes `guarded_builder()` |
| **Flip** | one constant's value | `VIDEO_GENERATION_ENABLED: bool = false` |
| **Wrap** | one JSX element or one array entry placed behind a flag, with no change inside it | `{DICTATION_ENABLED ? (<button ...>) : null}` |

Anything else in a shared file - a conditional threaded through a body, a
signature change, a restructured block, a new branch in a `match` - requires
its own ADR before it lands. The fork does not have a fifth shape.

**The ceiling for the beta is 150 counted lines**, and the ledger in
`UPSTREAM.md` must be exact, not estimated, after every phase. Growth past
the ceiling is again a superseding ADR, not a quiet overrun.

**Appended blocks stay uncounted but tracked**: a seam module at the end of
`clovy_api.rs`, a fork block at the end of a flags file, a new command in a
registration list. They merge at a distinct location and carry no
conflict risk; the ledger lists them so a reviewer can see the whole surface.

**Counting rule.** A counted line is a line `git diff` reports as added or
changed inside an existing block. Re-indented lines under a wrap count,
because they are conflict surface even though nothing in them changed. This
is deliberately the pessimistic reading.

## Consequences

- The number stops being the thing reviewers argue about. A 3-line prologue
  and a 30-line interleave are not the same risk, and the old budget could
  not tell them apart; the shape rule can.
- The ledger becomes an audit of shapes as well as lines. A review that finds
  a fifth shape has found a real problem, whatever the count.
- Severance is the standing cost of a fork that switches things off. Every
  upstream capability that this fork does not want will cost a guard on each
  of its surfaces, forever. That is the price of "absent, not
  disabled-looking", and it is worth stating that it does not amortise.
- Wraps are the worst shape for merges (twelve re-indented lines conflict
  with any upstream edit to that button). Prefer a flag consumed *inside* the
  component over a wrap *around* it when upstream's code allows, and say so
  in the ledger when it does not.
- 150 is arbitrary in its precise value, exactly as 40 was. Its purpose is
  the same: a threshold at which someone has to write down why.

## Alternatives considered

- **Keep 40 and narrow the guard or skip surfaces.** Rejected: the lines
  bought back would be bought with holes in the two properties the fork
  exists for (closed egress, absent capabilities).
- **Count only Rust.** Rejected: the frontend is where upstream churns most,
  and a wrap around a sidebar button is exactly the conflict the canary will
  report.
- **No ceiling, shape rule only.** Rejected: a shape rule with no number has
  no moment at which growth forces a conversation.
- **Move severance into a build-time patch set applied over upstream.**
  Considered and deferred: it would take every guard out of the shared files,
  at the cost of a patch pipeline that fails in a different and less legible
  way when upstream moves. Revisit if the canary reports severance conflicts
  on more than one release in a row.
