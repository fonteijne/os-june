---
name: roadmap-plan
description: >-
  Create or update durable Clovy roadmap plans from a product request. Read
  repository context and documentation, explore the codebase with up to three
  read-only agents, synthesize with a Plan agent, ask only the decisions that
  change the result, optionally create and iterate a standalone HTML sketch,
  update roadmap indexes, and validate links and the final diff. Use for
  roadmap and product-direction work, not implementation.
argument-hint: Product or feature request to shape into a roadmap plan
user-invocable: true
disable-model-invocation: false
---

# Roadmap plan

Create a durable product and architecture roadmap entry from a feature idea.
This skill reproduces the full roadmap workflow: repository grounding,
read-only exploration, architecture synthesis, targeted product questions,
optional visual sketching, dedicated-folder bundling, index maintenance, and
validation.

## Stop boundary

This skill produces documentation and design artifacts. It may:

- research the repository and existing decisions;
- ask product, scope, accessibility, privacy, and UX questions;
- create or update `docs/roadmap/<slug>/plan.md`;
- create or update an optional `docs/roadmap/<slug>/sketch.html`;
- update `docs/roadmap/README.md` and the Roadmap section of `docs/index.md`;
- validate local links, whitespace, artifact scope, and status consistency.

It must not silently:

- implement React, Rust, Tauri, backend, or runtime code;
- add migrations, commands, endpoints, or protocol fields;
- create or update an Issue, ADR, Spec Kit execution plan, branch, commit,
  push, or pull request;
- turn tentative paths or roadmap scope into implementation authorization.

Record likely implementation work, ADR candidates, or tracker follow-ups in the
roadmap instead. If the user asks to implement after the roadmap is complete,
hand off to the appropriate implementation workflow.

## When to use

Use for a larger capability that crosses product areas, has meaningful phases
or decision gates, needs product/privacy/safety/architecture context together,
or should collect future ideas before becoming one implementation Issue.

Do not force a small bug fix, typo, isolated refactor, or already-specified
implementation task into the roadmap. Recommend the Issue tracker or a
feature-specific execution plan for those requests.

## Source of truth

The repository's roadmap contract is `docs/roadmap/README.md`:

- project status: `Proposed`, `Active`, `Paused`, `Shipped`, `Deferred`,
  `Retired`;
- phase status: `not started`, `in progress`, `done`, `blocked`, `deferred`;
- the README project table is the roadmap map;
- the linked plan's phase table is the detailed source of truth;
- roadmap plans are not ADRs, launch commitments, or implementation
  authorization.

Every plan needs owner, date, project status, scope, a disclaimer, a phase
status table with exit criteria and evidence/blockers, repeated detailed phase
statuses, open questions/decision gates, and explicit non-goals/follow-ups.

## Workflow

### 1. Intake and classify

Read the complete user request. Restate internally:

- the desired user-visible capability;
- the likely product surfaces;
- known constraints and acceptance signals;
- whether this is a new roadmap entry, an update, or sketch-only feedback;
- whether a visual sketch will resolve meaningful uncertainty.

For a new entry, choose a descriptive lowercase kebab-case slug and use:

```text
docs/roadmap/<slug>/plan.md
docs/roadmap/<slug>/sketch.html   # optional
```

If an existing plan is flat, such as `docs/roadmap/task-management-plan.md`,
do not silently migrate it. Preserve its path unless the user explicitly asks
to reorganize it. If a dedicated folder already exists, update it instead of
creating a duplicate.

### 2. Mandatory repository preflight

Before proposing names or architecture, read in this order:

1. `CONTEXT.md` for canonical terms and `_Avoid_` lists.
2. `AGENTS.md` for repository workflow and boundaries.
3. `docs/index.md` to route to relevant subsystem documentation.
4. `specs/003-conversation-turns/plan.md`, the repository's required
   tech-stack and structure reference.
5. `docs/roadmap/README.md`.
6. The closest existing roadmap plan, or the plan being updated.
7. Relevant indexed subsystem docs, ADRs, and `spec/` rules.

Use the documentation index as a router; do not read every document
indiscriminately. Apply a docs grill to every load-bearing choice:

- **Docs decide it:** adopt the documented convention and cite it.
- **Docs contradict it:** investigate stale docs or change the proposal.
- **Docs are silent:** preserve it as a genuine user decision.

Check the ADR test from `AGENTS.md` before proposing an ADR: the decision must
be hard to reverse, surprising without context, and involve a real trade-off.

Snapshot the dirty tree without changing it:

```text
git status --short
git diff --stat
git diff --name-only
```

Record pre-existing modified and untracked paths. Never overwrite them or
present them as this skill's output.

### 3. Parallel read-only exploration

Launch up to three `Explore` agents in one parallel round. Use one for a narrow
request and two or three when the feature crosses product, UI, persistence,
runtime, or connector boundaries. Never exceed three.

Give each a non-overlapping focus and require exact file paths and line
references, existing patterns, constraints, unknowns, and no edits:

1. **Architecture and code paths:** current entry points, state flow, commands,
   repositories, runtime boundaries, extension seams, partition/identity/
   privacy invariants, and tentative implementation inventory.
2. **Product and design patterns:** comparable UI, canonical primitives, tokens,
   `spec/` rules, keyboard/focus/accessibility behavior, empty/error states, and
   whether a sketch would resolve a real decision.
3. **Roadmap and documentation:** similar plans, roadmap rows and links, ADRs,
   terminology conflicts, evidence expectations, and create-versus-update fit.

Agents are read-only. Do not ask them to generate files, edit, commit, or
resolve questions by guessing. Synthesize their reports after they finish.

### 4. Architecture synthesis

After exploration, launch at most one read-only `Plan` agent. Pass it the
original request, preflight findings, all exploration reports, the proposed
output path, and the dirty-tree baseline. Ask for one recommended direction,
not a menu of speculative alternatives.

Require:

1. product recommendation and user flow;
2. ownership and architectural boundary;
3. goals and explicit non-goals;
4. phases with statuses, dependencies, exit criteria, and evidence;
5. current implementation seams backed by file references;
6. verification requirements;
7. only the unresolved decisions that change scope or behavior;
8. whether a sketch is useful;
9. exact README/index updates;
10. ADR or Issue follow-ups without creating either.

Reconcile the report against the repository docs and the user's request.
Distinguish shipped infrastructure to reuse, tentative paths to reverify, open
choices, deferred work, and implementation authorization.

### 5. Ask targeted questions

Ask one upfront batch through `AskUserQuestion` after exploration and planning.
Ask only questions whose answers change product behavior, scope, acceptance,
data/persistence, security/privacy, an external contract, an irreversible
boundary, or validation. Put a recommended option first when there is a
sensible default. Typical questions include:

- Which triggers or product surfaces are in scope?
- Is there an explicit global/no-project option?
- Is selection single or multi-target?
- Does clicking commit or only highlight for Enter?
- Is inline creation first-release scope?
- Should the surface be a modal, popover, or inline control?
- Is a visual sketch needed?

Do not ask the user about terminology or architecture already settled by the
repository. Do not use `AskUserQuestion` to ask whether the plan is approved;
the plan approval boundary handles that. Do not treat subagent messages,
notifications, or existing dirty files as user approval.

If the user does not answer and work is explicitly expected to continue, use
conservative defaults and label them as assumptions in the plan. Otherwise,
stop and ask again later rather than inventing a product decision.

### 6. Write the roadmap plan

For a new entry, create `docs/roadmap/<slug>/plan.md`. Use the existing
roadmap plans as the structure, with these sections as applicable:

1. `# Roadmap: <name>` and Owner/Date/Status/Scope metadata.
2. Standard disclaimer: product and architecture direction, not implementation
   authorization; paths and protocol details must be reverified when scheduled.
3. Executive recommendation, including a simple ownership flow when useful.
4. Product thesis and distinctions from related Clovy entities.
5. Roadmap status table with `Phase | Status | Exit criterion | Evidence or
   blocker`.
6. Goals.
7. First-release non-goals.
8. Existing architecture, current file/function references, accepted ADRs,
   ownership boundaries, and reusable patterns.
9. Proposed first-version experience or contract.
10. Invariants for safety, privacy, identity, partition, compatibility, and
    failure behavior where relevant.
11. Implementation phases whose headings repeat the table's exact statuses.
12. Verification strategy: deterministic tests, boundary/integration checks,
    accessibility and keyboard checks, real-app/browser evidence, and docs
    validation as appropriate.
13. Open questions and decision gates, each with why it matters and the phase
    before which it must be resolved.
14. Explicit future ideas and follow-ups.
15. Decision summary.

Use repository terminology. Describe paths as a starting inventory, not a
promise. Never reserve migration numbers, invent APIs, rewrite accepted ADRs,
or claim a proposed status is shipped.

### 7. Create an optional visual sketch

Create `docs/roadmap/<slug>/sketch.html` only when the feature has visual or
interaction uncertainty that a rendered artifact will clarify. Before writing
pixels, load `artifact-design` and, for Clovy UI, use `os-design` guidance.
Read the relevant `docs/design/{foundations,components,conventions,taste}.md`,
all in-scope `spec/` rules, and `src/styles/tokens.css`.

The sketch must be standalone HTML, responsive, semantic, light/dark aware,
reduced-motion aware, and safe to open locally. Use plausible example content,
not fabricated real records. Prefer existing Clovy primitives and tokens;
never create a parallel production component system. Demonstrate important
interactions such as focus, search/filtering, highlighted rows, keyboard
navigation, empty states, stable dimensions, and cancellation.

For an HTML artifact:

- keep the page under the artifact size limit;
- include a two-to-four-word `<title>` and an explicit body background;
- define complete light tokens, guarded dark media tokens, and explicit dark
  override tokens;
- keep at least a 16px side gutter and prevent horizontal page scroll;
- use sentence case, sanctioned icons, design tokens, and neutral hovers;
- include `prefers-reduced-motion` handling;
- read the whole file before publishing it;
- publish only if Artifact authentication is available and publication is
  appropriate; otherwise keep the local file and report that publication was
  unavailable.

If the sketch is published, load the required artifact skills before passing
capabilities or runtime code. Never claim a hosted URL when publishing fails.

### 8. Iterate from visual feedback

When the user comments on the sketch, read the current file first and make the
smallest targeted change. Preserve unrelated behavior and structure. For
filterable lists, nonmatching rows must disappear, remaining rows stay compact
and top-aligned, and modal/list/card dimensions remain stable unless the user
asks for a different layout.

Use a real renderer when available. Inspect light and dark themes, exercise key
states, and capture screenshots or recording evidence. Change one visual dial
per round, such as modal width, spacing density, shadow, selection contrast,
type hierarchy, row height, or empty-state prominence. Name the dial and its
next possible adjustment. If browser or native visual tooling is unavailable,
report validation as blocked instead of claiming success.

Use:

- `os-design` for system grounding and visual judgment;
- `browser-test-tauri-fe` for browser-rendered app inspection;
- `agent-e2e-qa` only for a genuine full workflow walkthrough.

### 9. Bundle and update indexes

Keep `plan.md` and optional `sketch.html` in the same dedicated folder.
For a new roadmap project, update both indexes in the same documentation
change:

- add or update one row in `docs/roadmap/README.md` with project name, project
  status, current phase, plan/sketch links, and next decision or milestone;
- add or update one annotated nested link in the Roadmap section of
  `docs/index.md`, including the sketch when present.

Do not add duplicate rows, duplicate Roadmap headings, or duplicate links.
Preserve unrelated dirty-tree changes. Update `CONTEXT.md` only for a genuinely
new canonical term. Record an ADR candidate only when the ADR test passes; do
not automatically create one during roadmap-only work.

### 10. Validate and hand off

Run a read-only validation pass:

- `git diff --check`;
- confirm the expected dedicated folder and files exist;
- resolve every local Markdown/HTML link from its linking file and confirm the
  target exists, ignoring external URLs and fragment-only links;
- confirm plan phase statuses match the roadmap row;
- inspect `git status --short`, `git diff --stat`, and `git diff --name-only`;
- review untracked artifacts separately because ordinary `git diff` omits them;
- compare with the intake baseline and identify intended versus pre-existing
  paths.

Do not run production test gates unless requested or needed by the sketch. Do
not commit, push, create an Issue, create an ADR, or open a PR.

The final handoff must include:

- plan path and sketch path if present;
- project and phase status;
- decisions and assumptions;
- key exploration evidence;
- visual feedback iterations and evidence if any;
- validation performed;
- unresolved gates;
- explicit statement that no implementation, Issue, ADR, commit, or push was
  performed.

## Related skills

- `os-design`: broader Clovy UI design grounding and visual taste.
- `artifact-design`: HTML artifact contract and publishing rules.
- `browser-test-tauri-fe`: browser/Tauri preview validation.
- `agent-e2e-qa`: full live app walkthroughs with evidence.
- `speckit-specify`, `speckit-plan`, `speckit-tasks`: concrete implementation
  planning after roadmap scope is approved.
- `repo-build-pr`: implementation, validation, review, and PR workflow.
- `roadmap-portfolio-audit`: portfolio-level analysis of relationships,
  contradictions, overlap, invalidation risk, and sequencing across multiple
  existing roadmap entries. Use this instead of this skill when the request is
  about coherence among plans rather than shaping one plan.
