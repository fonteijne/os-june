#!/usr/bin/env node

// Brand-drift lint (Phase 5, docs/whitelabel-implementation-plan.md; ADR-0056).
// In the spirit of the lucide-import ban (biome.json's noRestrictedImports):
// fails when one of the curated "branded surface" files below gains a new
// literal "Clovy" string that isn't already on record as a deliberate
// exception. The surface list is exactly the high-visibility copy Phase 2
// routed through src/lib/brand.generated.ts (BRAND_NAME / BRAND_SUPPORT_TEXT)
// — not the many other "Clovy" occurrences across src/, which stay out of
// scope per the plan's own non-goals.
//
// Usage:
//   node scripts/check-brand-drift.mjs              # CI mode: fail on drift
//   node scripts/check-brand-drift.mjs --update-allowlist
//     Regenerates brand-drift-allowlist.json from the current file contents.
//     Run this after a deliberate, reviewed decision to leave a new "Clovy"
//     string literal in one of these files (e.g. a reference to Clovy's own
//     community or infrastructure, not the whitelabel identity) — never to
//     silence a failure you haven't looked at.
//
// A literal "Clovy" in one of these files should almost always instead route
// through BRAND_NAME / BRAND_SUPPORT_TEXT (see branding/README.md). The
// allowlist exists for the genuine exceptions: places that name Clovy's own
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
  "src/app/App.tsx",
  "src/app/app-account-gates.tsx",
  "src/app/app-effects/update-ui.tsx",
  "src/app/app-layout.tsx",
  "src/app/update-decision.ts",
  "src/app/use-dictation-events.ts",
  "src/app/use-recording-controls.ts",
  "src/app/workspace-lazy.tsx",
  "src/components/account/AccountGate.tsx",
  "src/components/account/AccountSettings.tsx",
  "src/components/account/FundingNotice.tsx",
  "src/components/agent/AgentSessionsList.tsx",
  "src/components/agent/AgentThinking.tsx",
  "src/components/agent/AgentWorkspace.tsx",
  "src/components/agent/ComputerUseApprovalsTray.tsx",
  "src/components/agent/ReportDialog.tsx",
  "src/components/agent/agent-workspace-config.tsx",
  "src/components/agent/chat-turns/AgentActionCards.tsx",
  "src/components/agent/chat-turns/RunNotices.tsx",
  "src/components/agent/chat-turns/TurnPresentation.tsx",
  "src/components/agent/composer/ComposerEditor.tsx",
  "src/components/agent/composer/ModelPicker.tsx",
  "src/components/agent/composer/reportCategory.ts",
  "src/components/folders/FoldersWorkspace.tsx",
  "src/components/folders/ImportClaudeProjectsDialog.tsx",
  "src/components/folders/ProjectSettingsDialog.tsx",
  "src/components/note-chat/NoteChatPanel.tsx",
  "src/components/note-editor/NoteFailureBanner.tsx",
  "src/components/note-editor/NoteHeaderActions.tsx",
  "src/components/notes-list/NotesList.tsx",
  "src/components/onboarding/steps/AreaStep.tsx",
  "src/components/onboarding/steps/MoodStep.tsx",
  "src/components/onboarding/steps/PermissionSteps.tsx",
  "src/components/onboarding/steps/SignInStep.tsx",
  "src/components/onboarding/steps/TelemetryConsentStep.tsx",
  "src/components/plugins/ComputerUseControl.tsx",
  "src/components/referral/ReferralNudge.tsx",
  "src/components/routines/RoutineDetail.tsx",
  "src/components/routines/RoutineModePicker.tsx",
  "src/components/routines/RoutinesView.tsx",
  "src/components/routines/routine-templates.ts",
  "src/components/settings/AgentMcpServersSection.tsx",
  "src/components/settings/AgentSettingsSection.tsx",
  "src/components/settings/AppSettings.tsx",
  "src/components/settings/ClovyPersonalitySettingsSection.tsx",
  "src/components/settings/ConnectorsSection.tsx",
  "src/components/settings/DictionarySettingsSection.tsx",
  "src/components/settings/LinkedDevicesSection.tsx",
  "src/components/settings/MemorySettingsSection.tsx",
  "src/components/settings/ModelPickerPopover.tsx",
  "src/components/settings/PrivacySettingsSection.tsx",
  "src/components/share/ShareDialog.tsx",
  "src/components/sidebar/Sidebar.tsx",
  "src/components/ui/Toaster.tsx",
  "src/lib/agent-chat-gallery.ts",
  "src/lib/agent-file-drop.ts",
  "src/lib/agent-notifications.ts",
  "src/lib/agent-routines.ts",
  "src/lib/chat-image-generation.ts",
  "src/lib/connectors.ts",
  "src/lib/model-privacy.ts",
  "src/lib/recording-notifications.ts",
  "src/meeting-hud.ts",
];

const CLOVY_WORD = /\bClovy\b/;

function isCommentLine(trimmed) {
  return (
    trimmed.startsWith("//") ||
    trimmed.startsWith("*") ||
    trimmed.startsWith("/*") ||
    trimmed.startsWith("/**")
  );
}

// Module specifiers (import/export ... from "...") are always internal paths
// or identifiers (ClovyWordmark, useClovyAgent, ...), never user-facing copy
// — see the plan's own non-goal about internal identifiers.
function isImportLine(trimmed) {
  return /^(import|export)\b.*\bfrom\b/.test(trimmed);
}

function clovyLinesIn(relativePath) {
  const text = readFileSync(resolve(ROOT_DIR, relativePath), "utf8");
  const hits = [];
  text.split("\n").forEach((rawLine, index) => {
    const trimmed = rawLine.trim();
    if (!trimmed || isCommentLine(trimmed) || isImportLine(trimmed)) return;
    if (!CLOVY_WORD.test(trimmed)) return;
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
    const lines = clovyLinesIn(file).map((hit) => hit.text);
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
  for (const hit of clovyLinesIn(file)) {
    if (allowed.has(hit.text)) continue;
    violations.push({ file, ...hit });
  }
}

if (violations.length > 0) {
  console.error('Brand drift: new literal "Clovy" text in a branded high-visibility surface.\n');
  for (const violation of violations) {
    console.error(`  ${violation.file}:${violation.line}: ${violation.text}`);
  }
  console.error(
    "\nRoute this through BRAND_NAME / BRAND_SUPPORT_TEXT (src/lib/brand.generated.ts) " +
      'instead of a literal "Clovy" — see branding/README.md. If this line ' +
      "genuinely refers to Clovy's own product, infrastructure, or community " +
      "rather than the whitelabel identity, record that decision with " +
      "`node scripts/check-brand-drift.mjs --update-allowlist`.",
  );
  process.exit(1);
}

console.log(`No brand drift across ${SURFACE_FILES.length} branded surface file(s).`);
