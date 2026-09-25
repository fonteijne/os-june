---
name: roadmap-portfolio-audit
description: >-
  Audit Clovy roadmap plans as a portfolio: surface contradictions between
  visions, plans that would invalidate each other's assumptions, implicit
  dependencies, scope overlaps, sequencing risks, shared assumptions, and
  missing decision gates. Reads the roadmap map and linked plans, then produces
  a structured, read-only coherence report. Use when multiple roadmap entries
  need a cross-plan health check or sequencing view, not an individual plan
  review.
argument-hint: Optional filter: proposed | active | paused | <slug> [<slug> ...]
user-invocable: true
disable-model-invocation: false
---

# Roadmap portfolio audit

Audit the roadmap at portfolio altitude. This skill answers questions such as:

- Do two plans describe incompatible product, identity, privacy, or ownership
  boundaries?
- Could implementing one plan invalidate an assumption, migration, contract, or
  acceptance criterion in another plan?
- Which plans overlap on the same app surface, persistence boundary, native
  identity, connector, or safety policy?
- Which decision gates and prerequisites should be resolved before plans can be
  implemented together?
- Which work can proceed in parallel, and which work should be serialized?

This is not a completeness review of one plan. Use `roadmap-plan` for creating or
updating an individual roadmap entry. Use this skill when relationships among two
or more existing entries are the subject.

## User input

```text
$ARGUMENTS
```

Treat non-empty arguments as scope. The default scope is every unimplemented
roadmap plan: rows whose project status is `Proposed`, `Active`, or `Paused`.
A named slug is included even when its status is `Shipped`, `Deferred`, or
`Retired`. A status filter such as `proposed`, `active`, or `paused` selects rows
with that project status. Multiple slugs may be supplied. If a requested slug is
not in the roadmap map, report it as a scope error rather than silently selecting
an unlisted file.

Do not invent a command-line grammar beyond these simple filters. Treat natural
language after the scope as a request to interpret conservatively and state the
interpretation in the report.

## Stop boundary

This is a strictly read-only analysis skill.

It may:

- read `CONTEXT.md`, `AGENTS.md`, `docs/index.md`,
  `docs/roadmap/README.md`, selected roadmap plans and sketches, referenced ADRs,
  indexed documentation, and relevant `spec/` rules;
- inspect the dirty-tree baseline with read-only git commands;
- produce a Markdown coherence report in the conversation.

It must never:

- edit, create, delete, rename, or move a roadmap plan, sketch, index, ADR, spec,
  Issue, or generated report;
- create or update an Issue, ADR, Spec Kit artifact, branch, commit, push, or pull
  request;
- run implementation, migration, build, release, or deployment work;
- turn an inferred relationship or a proposed sequencing recommendation into an
  implementation authorization;
- present a plan-local assumption as a repository-wide decision without evidence.

The report is ephemeral chat output. Do not write it to a file, even if a path is
suggested in a plan or referenced by a roadmap entry. If the user wants a durable
portfolio document, that is a separate documentation request and must be handled
outside this read-only audit.

## Source-of-truth contract

Use the following authority order:

1. `CONTEXT.md` for canonical domain terms and `_Avoid_` lists.
2. `AGENTS.md` for repository boundaries, identity rules, ADR criteria, and
   workflow constraints.
3. `docs/roadmap/README.md` for the roadmap project map and status vocabularies.
4. The linked plan's `## Roadmap status` table for detailed phase state.
5. The plan's detailed phase headings, which must repeat the table status.
6. `docs/index.md`, ADRs, and indexed subsystem documents for constraints and
   accepted decisions, not as additional roadmap projects.

Project status must use `Proposed`, `Active`, `Paused`, `Shipped`, `Deferred`, or
`Retired`. Phase status must use `not started`, `in progress`, `done`, `blocked`,
or `deferred`. Treat a discrepancy between the README row, plan metadata, phase
table, and repeated phase heading as a source-of-truth finding before making any
portfolio recommendation.

A roadmap plan is not an ADR, a launch commitment, an Issue, or implementation
authorization. Do not use the audit to ratify a proposal or to silently resolve an
open gate.

## Workflow

### 1. Establish scope and baseline

Read the complete request and record the selected scope. Before interpreting
findings, capture the existing dirty-tree state without changing it:

```text
git status --short
git diff --stat
git diff --name-only
```

Treat all paths shown by this baseline as pre-existing unless the user explicitly
says otherwise. Do not call them audit findings or overwrite them.

### 2. Mandatory preflight

Read in this order:

1. `CONTEXT.md`;
2. `AGENTS.md`;
3. `docs/index.md`;
4. `specs/003-conversation-turns/plan.md` when repository grounding is needed;
5. `docs/roadmap/README.md`;
6. each selected roadmap plan in full;
7. only the ADRs and indexed documents needed to verify a load-bearing finding.

Use the documentation index and plan references as a router. Do not read the
entire repository indiscriminately.

### 3. Build a normalized portfolio inventory

For every selected plan, extract an ephemeral record containing:

- canonical slug and plan path;
- owner, date, scope, fork/product qualifier, and project status;
- README status/current phase and plan metadata status;
- every phase's name, status, exit criterion, evidence, and blocker;
- goals, explicit non-goals, follow-ups, and deferred work;
- open questions, policy gates, decision gates, and ADR candidates;
- explicit dependency statements and external prerequisites;
- named entities and boundaries: Projects/folders, stored and runtime session
  ids, data partitions, SQLite tables and migrations, Tauri commands, runtime
  protocol fields, app/bundle/executable identities, deep links, native helpers,
  keychain namespaces, updater coordinates, OS Accounts, Microsoft Entra,
  connectors, external MCP servers, and trust/approval policies;
- references to files, ADRs, Issues, branches, external services, and evidence.

Normalize only for comparison. Preserve the plan's wording in citations and do
not treat matching words as proof that two plans share an implementation seam.

### 4. Run the portfolio detection lenses

Run each lens across the normalized inventory. Use a fixed traversal order: the
README table order for plans, phase order within each plan, then alphabetical
order for pairwise plan comparisons. Limit the report to 50 findings; summarize
additional findings with their count and categories.

Every finding must include:

- a stable category-prefixed ID;
- category and severity (`blocker`, `high`, `medium`, or `low`);
- confidence (`high`, `medium`, or `low`);
- classification: `confirmed`, `inferred`, or `unverified`;
- impacted plan(s) and phase(s);
- exact repo-relative path, heading, and line reference where available;
- a short evidence quote or a precise description of the checked relationship;
- the portfolio impact and a concrete recommended resolution.

Use `confirmed` only for a direct contradiction, explicit dependency, or verified
local link/status fact. Use `inferred` for a relationship derived from compatible
surfaces or implied sequencing. Use `unverified` when the plan points to a
current-tree or external fact that was not checked. Never promote an inferred
edge to a confirmed dependency merely because it seems sensible.

#### A. Contradictions and source-of-truth drift

Check:

- README project status/current phase against plan metadata and phase tables;
- phase-table status against the repeated detailed phase status;
- goals against non-goals and the plan's own invariants;
- cross-plan identity, privacy, account, billing, ownership, release, or product
  policy assumptions;
- fork-only exceptions against generally scoped plans;
- proposed behavior against accepted ADRs and binding `AGENTS.md` boundaries.

Classify a relationship as a contradiction only when both claims apply to the
same scope. A fork-only override may be intentional; report it as a material
scope boundary or assumption instead of calling it a contradiction without
showing the scope collision.

#### B. Invalidation and dependency risk

Identify where implementing or deciding one plan could make another plan's
architecture, migration, acceptance evidence, or user promise obsolete. Look for:

- a plan changing a data partition key or identity provider used by another plan;
- migrations that independently append to the same catalog or transform the same
  records;
- callback/deep-link, keychain, app-root, updater, or native-helper ownership
  that can route state to the wrong install;
- a downstream phase that assumes an upstream decision still marked open,
  `not started`, `blocked`, or `deferred`;
- entity migration lists that omit entities introduced by another plan;
- a general Clovy plan accidentally depending on a fork-only identity or build;
- external registration, release signing, provider, or evidence blockers.

State direction (`A -> B`), the affected phase, and why the relationship is
confirmed or inferred. Distinguish a prerequisite from mere conceptual overlap.

#### C. Links and portfolio overlap

Audit local Markdown and HTML links in the README, selected plans, and selected
sketches. Resolve relative targets from the linking file. Check fragments when
practical. Report missing targets, stale roadmap links, duplicate entries, and
unlisted plans. Do not fetch external URLs by default; report them as
`external, not locally verified`.

Also compare overlaps across:

- product surfaces and UI entry points;
- SQLite tables, schema/migration catalogs, repositories, and data partitions;
- Tauri commands and runtime protocol or host-tool contracts;
- app identity, bundle identifiers, executable names, deep-link schemes, native
  helpers, permissions, keychain services, and updater configuration;
- connector stores, MCP server configuration, external OAuth accounts, and token
  custody;
- agent tool allowlists, trust modes, confirmation rules, and untrusted-input
  policies;
- ADRs, shared files, release evidence, and ownership boundaries.

Classify an overlap as intentional reuse, coordination required, potential
conflict, or likely serialization. A shared filename alone is not proof of a
conflict; explain the shared boundary and cite both plans.

#### D. Sequencing and parallelization

Construct an ephemeral dependency and sequencing matrix:

| Upstream phase | Downstream phase | Relationship | Evidence | Confidence | Recommended order |
| --- | --- | --- | --- | --- | --- |

Include explicit edges, strong inferred edges, shared prerequisites, and potential
invalidation edges as separate relationship types. Detect cycles and phases that
are scheduled before their decision gates. Identify work that can safely proceed
in parallel and work that should serialize because it changes a shared boundary.

Prefer execution batches over invented calendar dates:

1. shared product, identity, partition, safety, and ownership decisions;
2. foundational persistence and build/isolation contracts;
3. independent product surfaces;
4. connector and external-service integration;
5. integration, migration, release, and acceptance evidence.

Do not claim that the matrix is a durable dependency graph. It is an audit model
for the current text and must be regenerated after plan changes.

#### E. Shared assumptions and safety composition

Create an assumption register for cross-plan claims such as:

- no-account mode, Bonzai routing, and OS Accounts identity/credits;
- current data-partition semantics and identity migration;
- Project, stored-session, and session-reuse behavior;
- additive branding, co-installation, app roots, callback ownership, and updater
  identity;
- connector/MCP ownership, keychain namespaces, and external account scope;
- agent approval, prompt-injection, untrusted-content, and mutation policy.

For each assumption, list relying plans, canonical documentation, status
(documented, plan-local, contested, or unverified), consequence if invalidated,
and an owner only when the plan or repository explicitly names one. Flag when two
plans define separate safety rules that need a single composition contract.

#### F. Missing decisions and gates

Deduplicate open questions that affect more than one plan. Report:

- the decision or gate;
- affected plans and earliest phase that relies on it;
- why it changes scope, sequencing, safety, privacy, or acceptance;
- current evidence/blocker and whether it is explicitly deferred;
- the named owner, if one exists, otherwise `owner not named`;
- whether it meets the repository's ADR test, without creating an ADR.

Do not answer the decision by choosing a silent default. Recommend the artifact or
cross-plan contract needed to resolve it.

### 5. Produce the report in chat

Use this structure:

```markdown
# Roadmap portfolio audit

## Scope and baseline

## Executive health

## Portfolio inventory
| Project | README status | Current phase | Plan status | Readiness | Key dependencies |

## Findings
### Contradictions and source-of-truth drift
### Invalidation and dependency risk
### Link integrity and portfolio overlap
### Sequencing and parallelization
### Shared assumptions and safety composition
### Missing decisions and gates

## Dependency and sequencing matrix

## Shared-assumption register

## Recommended execution batches

## Evidence and limitations

## Safety statement
```

The executive summary must state whether the portfolio is safe to implement as
written, what must be resolved first, and which conclusions are inferred. The
portfolio table must include every selected plan. Keep findings actionable and
cite evidence inline; do not dump entire plans into the report.

Recommended stable ID prefixes are:

- `CON-` contradictions;
- `DEP-` invalidation/dependency risk;
- `LNK-` link or source-of-truth integrity;
- `OVR-` overlap;
- `SEQ-` sequencing;
- `ASM-` shared assumptions and safety composition;
- `DEC-` missing decisions.

At the end, state that the report is read-only analysis, does not authorize
implementation, and does not create or update roadmap plans, Issues, ADRs,
branches, commits, or other files.

### 6. Validate without mutation

After reporting, recheck:

```text
git status --short
git diff --stat
git diff --name-only
```

Confirm no files changed during the audit. Verify that every README plan link
resolves, every selected plan has the required metadata/status table, and every
phase table status is repeated in its detailed heading. Inspect untracked paths
separately because ordinary `git diff` omits them. Report any inability to verify
links, fragments, external URLs, or current-tree references rather than claiming
success.

## Invocation examples

```text
/roadmap-portfolio-audit
/roadmap-portfolio-audit proposed
/roadmap-portfolio-audit rebrand-to-bonzai fork-parallel-install
```

## Related skills

- `roadmap-plan`: shape or update one product roadmap entry.
- `speckit-analyze`: analyze consistency across one concrete Spec Kit feature's
  spec, plan, and tasks artifacts.
- `repo-build-pr`: implement an approved, concrete outcome after roadmap scope
  and cross-plan gates are resolved.
