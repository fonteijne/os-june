import { invoke } from "@tauri-apps/api/core";

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

type BonzaiRequest =
  | { action: "status" }
  | { action: "set_global_key"; key: string }
  | { action: "clear_global_key" }
  | { action: "set_project_key"; folder_id: string; key: string }
  | { action: "clear_project_key"; folder_id: string }
  | { action: "project_key_status"; folder_id: string }
  | { action: "probe_key"; key: string };

type BonzaiResponse =
  | ({ kind: "status" } & BonzaiStatusDto)
  | ({ kind: "project_key_status" } & BonzaiProjectKeyStatusDto)
  | ({ kind: "probe" } & BonzaiProbeDto);

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

export function setBonzaiProjectKey(folderId: string, key: string) {
  return dispatch({ action: "set_project_key", folder_id: folderId, key }, "project_key_status");
}

export function clearBonzaiProjectKey(folderId: string) {
  return dispatch({ action: "clear_project_key", folder_id: folderId }, "project_key_status");
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
