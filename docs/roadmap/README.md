# Clovy roadmap

This directory is the map for future Clovy capabilities. Each roadmap entry
captures the product intent, architectural direction, phased delivery, open
questions, and decision gates for one larger workstream.

These documents are deliberately more durable and broader than an issue or an
implementation task. They help us collect ideas without silently turning every
idea into committed scope.

## How to use this directory

- Start with the project table below to see what is proposed, active, deferred,
  or shipped.
- Open the linked plan for the full product and architecture context.
- Treat the plan's phase-status table as the source of truth for that project's
  detailed execution state.
- Move implementation-ready work into the issue tracker and a concrete feature
  plan before writing code.
- Update this README when a project's overall status, current phase, or next
  decision changes.

A roadmap plan is not an ADR, a product launch commitment, or an authorization
to register a provider, change a wire contract, deploy a service, or alter an
accepted architecture decision. Those decisions still follow the repository
workflow and the relevant documents in `docs/adr/`.

## Project status

Project-level status describes the overall maturity of a roadmap entry:

- **Proposed:** an idea has enough shape to discuss, but implementation has not
  been approved or started.
- **Active:** the work is approved and at least one phase is in progress.
- **Paused:** work started, but delivery is intentionally on hold.
- **Shipped:** the committed scope has shipped; follow-up ideas may remain in
  the plan.
- **Deferred:** the work is intentionally moved behind another priority or
  decision gate.
- **Retired:** the direction is no longer being pursued.

Phase status uses the narrower vocabulary `not started`, `in progress`, `done`,
`blocked`, and `deferred`. A linked plan should use that vocabulary consistently
and repeat the phase status in both its summary table and its detailed sections.

| Roadmap project | Status | Current phase | Plan | Next decision or milestone |
| --- | --- | --- | --- | --- |
| Local task management | **Proposed** | Phase 0: contract and UX definition | [Local task management plan](local-task-management/plan.md) · [Sketch](local-task-management/sketch.html) | Confirm the task vocabulary, date semantics, source-link behavior, and mutation policy before implementation |
| Project-aware new sessions | **Proposed** | Phase 0: contract and UX definition | [New-session Project picker plan](new-session-project-picker/plan.md) · [Sketch](new-session-project-picker/sketch.html) | Confirm the explicit No project choice, trigger coverage, and keyboard selection contract before implementation |
| Mail context for Project conversations | **Proposed** | Phase 0: context contract and external-server spike | [Mail context plan](outlook-mail-workspace/plan.md) · [Sketch](outlook-mail-workspace/sketch.html) | Confirm Project-first context selection, explicit Ask Clovy handoff, and the external server's exact read/draft tools |
| Microsoft Entra access gate | **Deferred** | Post-MVP: identity contract and Entra spike | [Microsoft Entra access gate plan](microsoft-sso-access-gate/plan.md) · [Sketch](microsoft-sso-access-gate/sketch.html) | Revisit after the Bonzai no-account MVP; then confirm the work/school PKCE contract, data partition key, and required ADR |
| Parallel-install Clovy development build | **Proposed** | Phase 0: identity and coexistence contract | [Parallel-install development build plan](fork-parallel-install/plan.md) | Confirm the separate app identity, data and credential boundary, native capability matrix, and updater policy before building the local bundle |
| Bonzai visual styling migration | **Proposed** | Phase 1: design artifact and presentation contract | [Bonzai visual styling plan](rebrand-to-bonzai/plan.md) · [Color field](rebrand-to-bonzai/sketch.html) · [App shell](rebrand-to-bonzai/app-colors.html) | Approve the light/dark color matrix, Manrope font contract, visible-name inventory, technical-identity exceptions, and contrast evidence before implementation |
| Bonzai logo replacement | **Proposed** | Phase 0: asset intake and provenance | [Bonzai logo replacement plan](bonzai-logo-replacement/plan.md) | Supply the approved vector mark, wordmark source, usage rights, platform treatments, and provenance before implementation |
| Bonzai/iO operator instructions | **Proposed** | Phase 0: baseline and boundary | [Bonzai/iO operator instructions plan](bonzai-io-operator-instructions/plan.md) | Accept the iO policy owner, disclosure wording, profile selection, and runtime surfaces before implementation |

## What belongs here

A roadmap entry is a good fit when a capability:

- crosses multiple parts of Clovy, such as the UI, SQLite, Rust commands, and
  the agent runtime;
- has a meaningful sequence of phases or decision gates;
- may collect future ideas before becoming one implementation issue;
- needs product, privacy, safety, and architecture context together; or
- is expected to support later routines, plugins, or connectors.

Keep smaller work in the issue tracker or a feature-specific implementation
plan. Keep enforceable rules in `spec/`, accepted architectural decisions in
`docs/adr/`, and one concrete Spec Kit execution in `specs/`.

## Status maintenance

Every roadmap plan should include:

1. owner, date, and project-level status;
2. a phase-status table with explicit exit criteria and evidence or blockers;
3. detailed sections whose phase headings repeat the table's status;
4. open questions and decision gates;
5. explicit non-goals and follow-ups.

When work starts, update the project row and the linked plan together. Record
actual evidence, such as an issue, design review, test result, or release, not
just a new status label. If the plan and the project table disagree, resolve
the discrepancy before treating the roadmap as current.

## Relationship to other documentation

- [`docs/index.md`](../index.md) is the complete annotated documentation index.
- [`docs/adr/`](../adr/) records accepted, append-only architectural decisions.
- [`spec/`](../../spec/) contains enforceable engineering and design rules.
- [`specs/`](../../specs/) contains concrete Spec Kit feature artifacts.
- The Open Software platform issue tracker is the source of truth for assigned
  implementation work and delivery status.

The roadmap is the navigation layer between long-term product ideas and those
more specific execution records.
