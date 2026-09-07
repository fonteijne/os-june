import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import type { AgentChatNoticePart } from "./agent-chat-runtime";

// Bonzai is this fork's own LiteLLM deployment and its only inference
// destination. The native side exposes one dispatching Tauri command so the
// whole surface stays inside the additive `bonzai/` module (ADR-0058); this
// file gives each action a typed function so callers never see the dispatch.

export type BonzaiStatusDto = {
  active: boolean;
  baseUrl?: string;
  globalKeyConfigured: boolean;
  /** Last four characters of the global key, for display. Never the key. */
  globalKeyHint?: string;
};

export type BonzaiProjectKeyStatusDto = {
  folderId: string;
  /** True when the project bills to its own key; false when it falls back to
   * the global key. */
  projectKeyConfigured: boolean;
  projectKeyHint?: string;
  globalKeyConfigured: boolean;
};

export type BonzaiProbeDto = {
  /** The model ids the probed key may reach. */
  models: string[];
};

export type BonzaiProjectKeyIndexDto = {
  /** Folder ids that carry their own Bonzai key. Everything else bills to the
   * global key. */
  folderIds: string[];
};

type BonzaiRequest =
  | { action: "status" }
  | { action: "project_key_index" }
  | { action: "set_global_key"; key: string }
  | { action: "clear_global_key" }
  | { action: "set_project_key"; folder_id: string; key: string }
  | { action: "clear_project_key"; folder_id: string }
  | { action: "project_key_status"; folder_id: string }
  | { action: "probe_key"; key: string };

type BonzaiResponse =
  | ({ kind: "status" } & BonzaiStatusDto)
  | ({ kind: "project_key_status" } & BonzaiProjectKeyStatusDto)
  | ({ kind: "probe" } & BonzaiProbeDto)
  | ({ kind: "project_key_index" } & BonzaiProjectKeyIndexDto);

async function dispatch<K extends BonzaiResponse["kind"]>(
  request: BonzaiRequest,
  kind: K,
): Promise<Extract<BonzaiResponse, { kind: K }>> {
  const response = await invoke<BonzaiResponse>("bonzai_command", { request });
  if (response.kind !== kind) {
    throw new Error(`Bonzai returned ${response.kind} where ${kind} was expected.`);
  }
  return response as Extract<BonzaiResponse, { kind: K }>;
}

export function bonzaiStatus() {
  return dispatch({ action: "status" }, "status");
}

/** Probes the key against Bonzai first; a bad key is caught while the user is
 * looking at the field, and nothing is stored. */
export function setBonzaiGlobalKey(key: string) {
  return dispatch({ action: "set_global_key", key }, "status");
}

export function clearBonzaiGlobalKey() {
  return dispatch({ action: "clear_global_key" }, "status");
}

/** Fired on `window` whenever a project's key is stored or removed, so every
 * mounted badge refreshes without a shared store. */
export const BONZAI_PROJECT_KEYS_CHANGED_EVENT = "clovy:bonzai-project-keys-changed";

function dispatchProjectKeysChanged() {
  window.dispatchEvent(new Event(BONZAI_PROJECT_KEYS_CHANGED_EVENT));
}

export async function setBonzaiProjectKey(folderId: string, key: string) {
  const status = await dispatch(
    { action: "set_project_key", folder_id: folderId, key },
    "project_key_status",
  );
  dispatchProjectKeysChanged();
  return status;
}

export async function clearBonzaiProjectKey(folderId: string) {
  const status = await dispatch(
    { action: "clear_project_key", folder_id: folderId },
    "project_key_status",
  );
  dispatchProjectKeysChanged();
  return status;
}

export function bonzaiProjectKeyIndex() {
  return dispatch({ action: "project_key_index" }, "project_key_index");
}

let activePromise: Promise<boolean> | undefined;

/** Whether this build routes to Bonzai. A build property, so it is fetched
 * once and shared; a failed lookup reads as inactive so nothing Bonzai-only
 * renders on a build that is not. */
export function bonzaiActive(): Promise<boolean> {
  activePromise ??= bonzaiStatus()
    .then((status) => status.active)
    .catch(() => false);
  return activePromise;
}

export function useBonzaiActive() {
  const [active, setActive] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void bonzaiActive().then((value) => {
      if (!cancelled) setActive(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return active;
}

/** The set of folder ids with their own key, kept fresh across key changes.
 * Undefined until the first answer arrives so callers can avoid flashing the
 * wrong badge. */
export function useBonzaiProjectKeyIndex(enabled: boolean) {
  const [folderIds, setFolderIds] = useState<ReadonlySet<string>>();
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const refresh = () => {
      bonzaiProjectKeyIndex()
        .then((index) => {
          if (!cancelled) setFolderIds(new Set(index.folderIds));
        })
        .catch(() => {
          if (!cancelled) setFolderIds(new Set());
        });
    };
    refresh();
    window.addEventListener(BONZAI_PROJECT_KEYS_CHANGED_EVENT, refresh);
    return () => {
      cancelled = true;
      window.removeEventListener(BONZAI_PROJECT_KEYS_CHANGED_EVENT, refresh);
    };
  }, [enabled]);
  return folderIds;
}

export function bonzaiProjectKeyStatus(folderId: string) {
  return dispatch({ action: "project_key_status", folder_id: folderId }, "project_key_status");
}

export function probeBonzaiKey(key: string) {
  return dispatch({ action: "probe_key", key }, "probe");
}

/** The user-facing name of the error Bonzai reports, or the raw code. Codes
 * are stable identifiers from `bonzai/http.rs` and `bonzai/keys.rs`. */
export function describeBonzaiError(error: unknown): string {
  const record = error as { code?: unknown; message?: unknown } | null;
  const message = typeof record?.message === "string" ? record.message : undefined;
  if (message) return message;
  if (error instanceof Error) return error.message;
  return "Bonzai request failed.";
}

/** A Bonzai refusal (no key, rejected key, model not permitted, egress
 * blocked) reaches the chat as a failed run whose code the sidecar preserved.
 * Rendered with its reason, so the user can fix the key instead of retrying
 * against "Clovy stopped unexpectedly". */
export function bonzaiNoticePart(item: {
  code?: string;
  message: string;
  retryable?: boolean;
}): AgentChatNoticePart | undefined {
  if (!item.code || !/^(?:bonzai_[a-z_]+|egress_blocked)$/.test(item.code)) return undefined;
  return { type: "notice", kind: "bonzai", text: item.message, retryable: item.retryable };
}
