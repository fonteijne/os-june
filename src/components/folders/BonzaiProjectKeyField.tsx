import { useEffect, useState } from "react";
import {
  type BonzaiProjectKeyStatusDto,
  bonzaiProjectKeyStatus,
  clearBonzaiProjectKey,
  describeBonzaiError,
  setBonzaiProjectKey,
  useBonzaiActive,
} from "../../lib/bonzai";
import { DialogField } from "../ui/Dialog";

// A project's own Bonzai key, beside its instructions (PRD section 9). Work in
// the project bills to this key; without one it falls back to the global key.
// The key is checked against Bonzai before it is stored and is never read
// back: only whether one exists and its last four characters.

export function BonzaiProjectKeyField({ folderId }: { folderId: string }) {
  const active = useBonzaiActive();
  const [status, setStatus] = useState<BonzaiProjectKeyStatusDto>();
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    setDraft("");
    setMessage(undefined);
    bonzaiProjectKeyStatus(folderId)
      .then((next) => {
        if (!cancelled) setStatus(next);
      })
      .catch((error) => {
        if (!cancelled) setMessage(describeBonzaiError(error));
      });
    return () => {
      cancelled = true;
    };
  }, [active, folderId]);

  if (!active) return null;

  async function save() {
    setBusy(true);
    setMessage(undefined);
    try {
      setStatus(await setBonzaiProjectKey(folderId, draft));
      setDraft("");
      setMessage("Key saved. Work in this project now bills to it.");
    } catch (error) {
      setMessage(describeBonzaiError(error));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setMessage(undefined);
    try {
      setStatus(await clearBonzaiProjectKey(folderId));
      setMessage(
        status?.globalKeyConfigured
          ? "Key removed. Work in this project bills to the global Bonzai key."
          : "Key removed. There is no global Bonzai key, so work in this project will refuse to run.",
      );
    } catch (error) {
      setMessage(describeBonzaiError(error));
    } finally {
      setBusy(false);
    }
  }

  const hint = status?.projectKeyConfigured
    ? `This project bills to its own key ending in ${status.projectKeyHint ?? "...."}.`
    : status?.globalKeyConfigured
      ? "This project bills to the global Bonzai key. Paste a key to give it its own."
      : "No key here and no global Bonzai key. Paste one, or add a global key in Settings.";

  return (
    <DialogField label="Bonzai key" htmlFor="project-bonzai-key" hint={hint}>
      <div className="project-bonzai-key">
        <input
          id="project-bonzai-key"
          name="project-bonzai-key"
          className="dialog-input"
          type="password"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder={status?.projectKeyConfigured ? "Replace key" : "Paste key"}
          value={draft}
          disabled={busy}
          onChange={(event) => setDraft(event.currentTarget.value)}
        />
        <div className="dialog-footer-group">
          <button
            type="button"
            className="primary-action"
            disabled={busy || draft.trim().length === 0}
            onClick={() => void save()}
          >
            Save key
          </button>
          {status?.projectKeyConfigured ? (
            <button
              type="button"
              className="primary-action"
              disabled={busy}
              onClick={() => void remove()}
            >
              Remove key
            </button>
          ) : null}
        </div>
        {message ? (
          <p className="settings-status" role="status">
            {message}
          </p>
        ) : null}
      </div>
    </DialogField>
  );
}
