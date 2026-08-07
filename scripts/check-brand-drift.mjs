#!/usr/bin/env node

// Brand-drift lint (Phase 5, docs/whitelabel-implementation-plan.md; ADR-0054).
// In the spirit of the lucide-import ban (biome.json's noRestrictedImports):
// fails when one of the curated "branded surface" files below gains a new
// literal "June" string that isn't already on record as a deliberate
// exception. The surface list is exactly the high-visibility copy Phase 2
// routed through src/lib/brand.generated.ts (BRAND_NAME / BRAND_SUPPORT_TEXT)
// — not the ~1,000 other "June" occurrences across src/, which stay out of
// scope per the plan's own non-goals.
//
// Usage:
//   node scripts/check-brand-drift.mjs              # CI mode: fail on drift
//   node scripts/check-brand-drift.mjs --update-allowlist
//     Regenerates brand-drift-allowlist.json from the current file contents.
//     Run this after a deliberate, reviewed decision to leave a new "June"
//     string literal in one of these files (e.g. a reference to June's own
//     community or infrastructure, not the whitelabel identity) — never to
//     silence a failure you haven't looked at.
//
// A literal "June" in one of these files should almost always instead route
// through BRAND_NAME / BRAND_SUPPORT_TEXT (see branding/README.md). The
// allowlist exists for the genuine exceptions: places that name June's own
// product, infrastructure, or community rather than the whitelabel identity.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ALLOWLIST_PATH = resolve(ROOT_DIR, "scripts", "brand-drift-allowlist.json");

// The curated high-visibility surface (Phase 2). Add a file here only when a
// new piece of copy on it is genuinely the kind of thing a partner would see
// in a demo — see docs/whitelabel-implementation-plan.md's Phase 2 scoping.
const SURFACE_FILES = [
  "src/components/agent/composer/ComposerEditor.tsx",
  "src/components/agent/composer/reportCategory.ts",
  "src/components/agent/ReportDialog.tsx",
  "src/components/agent/AgentSessionsList.tsx",
  "src/components/settings/AppSettings.tsx",
  "src/components/share/ShareDialog.tsx",
  "src/components/onboarding/steps/SignInStep.tsx",
];

const JUNE_WORD = /\bJune\b/;

function isCommentLine(trimmed) {
  return (
    trimmed.startsWith("//") ||
    trimmed.startsWith("*") ||
    trimmed.startsWith("/*") ||
    trimmed.startsWith("/**")
  );
}

function juneLinesIn(relativePath) {
  const text = readFileSync(resolve(ROOT_DIR, relativePath), "utf8");
  const hits = [];
  text.split("\n").forEach((rawLine, index) => {
    const trimmed = rawLine.trim();
    if (!trimmed || isCommentLine(trimmed)) return;
    if (!JUNE_WORD.test(trimmed)) return;
    hits.push({ line: index + 1, text: trimmed });
  });
  return hits;
}

function loadAllowlist() {
  try {
    return JSON.parse(readFileSync(ALLOWLIST_PATH, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return {};
    throw error;
  }
}

const update = process.argv.includes("--update-allowlist");

if (update) {
  const allowlist = {};
  for (const file of SURFACE_FILES) {
    const lines = juneLinesIn(file).map((hit) => hit.text);
    if (lines.length > 0) allowlist[file] = lines;
  }
  writeFileSync(ALLOWLIST_PATH, `${JSON.stringify(allowlist, null, 2)}\n`);
  console.log(`Wrote ${ALLOWLIST_PATH} with ${Object.keys(allowlist).length} file(s).`);
  process.exit(0);
}

const allowlist = loadAllowlist();
const violations = [];

for (const file of SURFACE_FILES) {
  const allowed = new Set(allowlist[file] ?? []);
  for (const hit of juneLinesIn(file)) {
    if (allowed.has(hit.text)) continue;
    violations.push({ file, ...hit });
  }
}

if (violations.length > 0) {
  console.error('Brand drift: new literal "June" text in a branded high-visibility surface.\n');
  for (const violation of violations) {
    console.error(`  ${violation.file}:${violation.line}: ${violation.text}`);
  }
  console.error(
    "\nRoute this through BRAND_NAME / BRAND_SUPPORT_TEXT (src/lib/brand.generated.ts) " +
      'instead of a literal "June" — see branding/README.md. If this line ' +
      "genuinely refers to June's own product, infrastructure, or community " +
      "rather than the whitelabel identity, record that decision with " +
      "`node scripts/check-brand-drift.mjs --update-allowlist`.",
  );
  process.exit(1);
}

console.log(`No brand drift across ${SURFACE_FILES.length} branded surface file(s).`);
