import { useState } from "react";
import {
  describeBonzaiError,
  probeBonzaiKey,
  setBonzaiProjectKey,
  useBonzaiActive,
} from "../../lib/bonzai";
import type { FolderDto } from "../../lib/tauri";
import { DialogField } from "../ui/Dialog";

// The Bonzai key a project starts with, entered in the create dialog so no
// project exists without knowing what it bills to. The key is checked against
// Bonzai before the project is created (a bad key stops the submit with its
// reason and creates nothing) and stored once the project has an id. Empty
// means the project bills to the global key, as before.

export function useBonzaiCreateKey() {
  const active = useBonzaiActive();
  const [draft, setDraft] = useState("");
  const [message, setMessage] = useState<string>();

  function reset() {
    setDraft("");
    setMessage(undefined);
  }

  /** Probes the key. False stops the submit and shows why. */
  async function prepare(): Promise<boolean> {
    const key = draft.trim();
    if (!active || !key) return true;
    setMessage(undefined);
    try {
      await probeBonzaiKey(key);
      return true;
    } catch (error) {
      setMessage(describeBonzaiError(error));
      return false;
    }
  }

  /** Stores the probed key against the new project. */
  async function attach(folder: unknown) {
    const key = draft.trim();
    const folderId = (folder as FolderDto | undefined)?.id;
    if (!active || !key || !folderId) return;
    await setBonzaiProjectKey(folderId, key);
  }

  const field = active ? (
    <DialogField
      label="Bonzai key"
      htmlFor="create-folder-bonzai-key"
      hint="Work in this project bills to this key. Leave empty to use the global Bonzai key."
    >
      <input
        id="create-folder-bonzai-key"
        name="create-folder-bonzai-key"
        className="dialog-input"
        type="password"
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        placeholder="Paste key (optional)"
        value={draft}
        onChange={(event) => setDraft(event.currentTarget.value)}
      />
      {message ? (
        <p className="settings-status" role="status">
          {message}
        </p>
      ) : null}
    </DialogField>
  ) : null;

  return { field, prepare, attach, reset };
}
