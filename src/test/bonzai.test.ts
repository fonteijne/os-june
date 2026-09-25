import { beforeEach, describe, expect, it, vi } from "vitest";

const invoke = vi.hoisted(() => vi.fn());

vi.mock("@tauri-apps/api/core", () => ({
  convertFileSrc: vi.fn((path: string) => path),
  invoke,
}));

import {
  bonzaiNoticePart,
  bonzaiProjectKeyIndex,
  bonzaiStatus,
  clearBonzaiProjectKey,
  probeBonzaiKey,
  setBonzaiGlobalKey,
  setBonzaiProjectKey,
} from "../lib/bonzai";

describe("Bonzai bindings", () => {
  beforeEach(() => invoke.mockReset());

  it("routes every action through the one Bonzai command with its wire shape", async () => {
    invoke
      .mockResolvedValueOnce({ kind: "status", active: true, globalKeyConfigured: false })
      .mockResolvedValueOnce({ kind: "status", active: true, globalKeyConfigured: true })
      .mockResolvedValueOnce({
        kind: "project_key_status",
        folderId: "f1",
        projectKeyConfigured: true,
        globalKeyConfigured: true,
      })
      .mockResolvedValueOnce({
        kind: "project_key_status",
        folderId: "f1",
        projectKeyConfigured: false,
        globalKeyConfigured: true,
      })
      .mockResolvedValueOnce({ kind: "probe", models: ["gpt-4o"] })
      .mockResolvedValueOnce({ kind: "project_key_index", folderIds: ["f1"] });

    await bonzaiStatus();
    await setBonzaiGlobalKey("sk-live-1234567890");
    await setBonzaiProjectKey("f1", "sk-live-abcdefghij");
    await clearBonzaiProjectKey("f1");
    const probe = await probeBonzaiKey("sk-x");
    const index = await bonzaiProjectKeyIndex();

    expect(invoke.mock.calls).toEqual([
      ["bonzai_command", { request: { action: "status" } }],
      ["bonzai_command", { request: { action: "set_global_key", key: "sk-live-1234567890" } }],
      [
        "bonzai_command",
        { request: { action: "set_project_key", folder_id: "f1", key: "sk-live-abcdefghij" } },
      ],
      ["bonzai_command", { request: { action: "clear_project_key", folder_id: "f1" } }],
      ["bonzai_command", { request: { action: "probe_key", key: "sk-x" } }],
      ["bonzai_command", { request: { action: "project_key_index" } }],
    ]);
    expect(probe.models).toEqual(["gpt-4o"]);
    expect(index.folderIds).toEqual(["f1"]);
  });

  it("refuses a response of the wrong kind instead of returning it as the wrong type", async () => {
    invoke.mockResolvedValueOnce({ kind: "probe", models: [] });
    await expect(bonzaiStatus()).rejects.toThrow(/probe where status/);
  });

  it("announces project key changes so mounted badges refresh", async () => {
    invoke.mockResolvedValue({
      kind: "project_key_status",
      folderId: "f1",
      projectKeyConfigured: true,
      globalKeyConfigured: false,
    });
    const heard = vi.fn();
    window.addEventListener("clovy:bonzai-project-keys-changed", heard);
    await setBonzaiProjectKey("f1", "sk-live-abcdefghij");
    expect(heard).toHaveBeenCalledTimes(1);
    window.removeEventListener("clovy:bonzai-project-keys-changed", heard);
  });

  it("renders a Bonzai refusal as a notice with its reason, and nothing else", () => {
    expect(
      bonzaiNoticePart({ code: "bonzai_key_missing", message: "No key.", retryable: false }),
    ).toEqual({ type: "notice", kind: "bonzai", text: "No key.", retryable: false });
    expect(bonzaiNoticePart({ code: "egress_blocked", message: "Blocked." })?.kind).toBe("bonzai");
    expect(bonzaiNoticePart({ code: "agent_provider_failed", message: "x" })).toBeUndefined();
    expect(bonzaiNoticePart({ message: "x" })).toBeUndefined();
  });
});
