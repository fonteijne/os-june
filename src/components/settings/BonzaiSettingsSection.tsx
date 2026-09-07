import { useCallback, useEffect, useState } from "react";
import {
  type BonzaiStatusDto,
  bonzaiStatus,
  clearBonzaiGlobalKey,
  describeBonzaiError,
  setBonzaiGlobalKey,
} from "../../lib/bonzai";

// The global Bonzai key: the key work bills to when it is not attributable to
// a project. Per-project keys live in the project settings dialog. The key is
// write-only from here; the native side returns only whether one is stored
// and a last-four hint (PRD section 7.2).

export function BonzaiSettingsSection() {
  const [status, setStatus] = useState<BonzaiStatusDto>();
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();

  const refresh = useCallback(async () => {
    try {
      setStatus(await bonzaiStatus());
    } catch (error) {
      setMessage(describeBonzaiError(error));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!status?.active) return null;

  async function save() {
    setBusy(true);
    setMessage(undefined);
    try {
      const next = await setBonzaiGlobalKey(draft);
      setStatus(next);
      setDraft("");
      setMessage("Bonzai key saved. It was checked against Bonzai before saving.");
    } catch (error) {
      setMessage(describeBonzaiError(error));
    } finally {
      setBusy(false);
    }
  }

  async function clear() {
    setBusy(true);
    setMessage(undefined);
    try {
      setStatus(await clearBonzaiGlobalKey());
      setMessage(
        "Bonzai key removed. Work without a project key will refuse to run until a new one is added.",
      );
    } catch (error) {
      setMessage(describeBonzaiError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="settings-group" aria-labelledby="bonzai-heading">
      <h2 id="bonzai-heading" className="settings-group-heading">
        Bonzai
      </h2>
      <p className="settings-group-description">
        This build sends every model request to Bonzai and nowhere else. The global key pays for
        work that is not inside a project; projects can carry their own key.
      </p>
      <div className="settings-card">
        <div className="settings-rows">
          <div className="settings-row">
            <div className="settings-row-info">
              <h3 className="settings-row-title">Endpoint</h3>
              <p className="settings-row-description">{status.baseUrl ?? "Not configured"}</p>
            </div>
          </div>
          <div className="settings-row">
            <div className="settings-row-info">
              <h3 className="settings-row-title">Global Bonzai key</h3>
              <p className="settings-row-description">
                {status.globalKeyConfigured
                  ? `A key ending in ${status.globalKeyHint ?? "...."} is stored in the keychain.`
                  : "No key stored. Paste a LiteLLM virtual key; it is checked against Bonzai before it is saved."}
              </p>
            </div>
            <div className="settings-row-control settings-local-model-fields">
              <label className="settings-field">
                <span>Key</span>
                <input
                  type="password"
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder={status.globalKeyConfigured ? "Replace key" : "Paste key"}
                  value={draft}
                  disabled={busy}
                  onChange={(event) => setDraft(event.currentTarget.value)}
                />
              </label>
              <div className="settings-local-model-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={busy || draft.trim().length === 0}
                  onClick={() => void save()}
                >
                  Save
                </button>
                {status.globalKeyConfigured ? (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={busy}
                    onClick={() => void clear()}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
        {message ? (
          <p className="settings-status" role="status">
            {message}
          </p>
        ) : null}
      </div>
    </section>
  );
}
