import { useEffect, useRef, useState } from "react";
import { Switch } from "../ui/Switch";
import { messageFromError } from "../../lib/errors";
import { isLoopbackUrl, type LocalEndpointDto } from "../../lib/local-endpoint";
import type { ProviderModelSettingsDto } from "../../lib/tauri";

// One "bring your own OpenAI-compatible endpoint" surface, shared by the
// Text (generation) and Voice (transcription) sections of Settings. Both
// follow the same contract: saving a draft never activates the endpoint,
// enabling requires saved settings, disabling never touches them, and a
// non-loopback endpoint takes an explicit confirm before anything leaves the
// device. The Tauri commands differ per mode and are injected.

export type LocalEndpointCommands = {
  /** The persisted endpoint and whether it is the active provider. */
  saved: LocalEndpointDto;
  enabled: boolean;
  save: (draft: LocalEndpointDto) => Promise<ProviderModelSettingsDto>;
  setEnabled: (enabled: boolean) => Promise<ProviderModelSettingsDto>;
  probe: (input: { baseUrl: string; apiKey: string }) => Promise<{ models: string[] }>;
  /** Receives every updated settings snapshot the commands return. */
  onSettings: (next: ProviderModelSettingsDto) => void;
  /** Expands the section's "More options" disclosure so the confirm
   * affordance and the active toggle are reachable. */
  revealMoreOptions: () => void;
};

export function useLocalEndpoint({
  saved,
  enabled,
  save,
  setEnabled,
  probe,
  onSettings,
  revealMoreOptions,
}: LocalEndpointCommands) {
  const [draft, setDraft] = useState<LocalEndpointDto>(saved);
  const [status, setStatus] = useState<string>();
  // Model ids returned by the last successful "Test connection" probe, used to
  // populate the Model ID field's datalist (free text is still allowed).
  const [probeModels, setProbeModels] = useState<string[]>([]);
  // A non-loopback endpoint requires an explicit confirm before enabling, so
  // the switch doesn't silently start sending data off the device.
  const [enableConfirm, setEnableConfirm] = useState(false);
  const [setupVisible, setSetupVisible] = useState(false);

  useEffect(() => {
    setDraft({ baseUrl: saved.baseUrl, modelId: saved.modelId, apiKey: saved.apiKey });
  }, [saved.baseUrl, saved.modelId, saved.apiKey]);

  // Auto-expand the disclosure when the endpoint is already enabled so the
  // active toggle and config are never hidden. It only ever expands (a later
  // manual collapse is left alone), so the callback is read through a ref
  // rather than re-running the effect on every render.
  const revealMoreOptionsRef = useRef(revealMoreOptions);
  revealMoreOptionsRef.current = revealMoreOptions;
  useEffect(() => {
    if (enabled) {
      revealMoreOptionsRef.current();
      setSetupVisible(true);
    }
  }, [enabled]);

  const draftBaseUrl = draft.baseUrl.trim();
  const nonLoopback = draftBaseUrl.length > 0 && !isLoopbackUrl(draftBaseUrl);
  const hasDraft =
    draftBaseUrl.length > 0 || draft.modelId.trim().length > 0 || draft.apiKey.length > 0;
  const hasSavedConfig = saved.baseUrl.trim().length > 0 || saved.modelId.trim().length > 0;
  const showFields = enabled || setupVisible || hasDraft || hasSavedConfig;

  function updateDraft(field: keyof LocalEndpointDto, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    if (field === "baseUrl") setEnableConfirm(false);
    setStatus(undefined);
  }

  function draftMatchesSaved() {
    return (
      draft.baseUrl.trim() === saved.baseUrl.trim() &&
      draft.modelId.trim() === saved.modelId.trim() &&
      draft.apiKey === saved.apiKey
    );
  }

  // Persists the draft without changing the active provider. Returns the
  // updated settings on success; surfaces validation errors inline.
  async function commitSettings() {
    try {
      const next = await save(draft);
      onSettings(next);
      return next;
    } catch (error) {
      setStatus(messageFromError(error));
      return undefined;
    }
  }

  async function handleSave() {
    const saved = await commitSettings();
    if (saved) setStatus("Local model saved.");
  }

  // Flips the provider to the saved endpoint. The backend enables from
  // stored settings, so callers save any dirty draft first.
  async function commitEnabled() {
    try {
      const next = await setEnabled(true);
      onSettings(next);
      setEnableConfirm(false);
      setSetupVisible(true);
      setStatus("Local model enabled.");
    } catch (error) {
      setStatus(messageFromError(error));
    }
  }

  // The model picker's local option enables from the SAVED settings (never
  // the draft), but honors the same off-device invariant as the toggle: a
  // non-loopback endpoint is never enabled silently. It reveals the confirm
  // affordance instead; a loopback endpoint enables in one step.
  function enableFromPicker() {
    if (!isLoopbackUrl(saved.baseUrl.trim())) {
      setEnableConfirm(true);
      setSetupVisible(true);
      revealMoreOptions();
      setStatus(
        "This endpoint is not on this machine. Requests will leave your device. Confirm in More options to enable it.",
      );
      return;
    }
    void commitEnabled();
  }

  async function enable() {
    const baseUrl = draft.baseUrl.trim();
    const modelId = draft.modelId.trim();
    if (!baseUrl || !modelId) {
      setSetupVisible(true);
      setStatus("Enter a local endpoint and model ID first.");
      return;
    }
    // A remote endpoint takes a deliberate second step: the first flip reveals
    // the confirm affordance instead of enabling.
    if (!isLoopbackUrl(baseUrl) && !enableConfirm) {
      setEnableConfirm(true);
      setSetupVisible(true);
      return;
    }
    if (!draftMatchesSaved()) {
      const saved = await commitSettings();
      if (!saved) return;
    }
    await commitEnabled();
  }

  async function disable() {
    // Toggle-off never saves the draft: it only flips the provider back and
    // leaves the stored fields untouched.
    setEnableConfirm(false);
    try {
      const next = await setEnabled(false);
      onSettings(next);
      setStatus("Local model disabled.");
    } catch (error) {
      setStatus(messageFromError(error));
    }
  }

  function handleToggle(next: boolean) {
    setSetupVisible(true);
    if (next) {
      void enable();
    } else {
      void disable();
    }
  }

  async function testConnection() {
    try {
      const result = await probe({ baseUrl: draft.baseUrl, apiKey: draft.apiKey });
      setProbeModels(result.models);
      setStatus(`Connected. ${result.models.length} models available.`);
    } catch (error) {
      setStatus(messageFromError(error));
    }
  }

  return {
    enabled,
    draft,
    status,
    probeModels,
    enableConfirm,
    nonLoopback,
    showFields,
    updateDraft,
    handleSave,
    handleToggle,
    enable,
    enableFromPicker,
    testConnection,
  };
}

export type LocalEndpointState = ReturnType<typeof useLocalEndpoint>;

type LocalEndpointRowsProps = {
  endpoint: LocalEndpointState;
  toggleTitle: string;
  toggleDescription: string;
  toggleAriaLabel: string;
  fieldsDescription: string;
  baseUrlPlaceholder: string;
  modelIdPlaceholder: string;
  /** Unique per surface: the datalist the Model ID field reads from. */
  datalistId: string;
};

/** The toggle row plus the endpoint fields row for one local endpoint. */
export function LocalEndpointRows({
  endpoint,
  toggleTitle,
  toggleDescription,
  toggleAriaLabel,
  fieldsDescription,
  baseUrlPlaceholder,
  modelIdPlaceholder,
  datalistId,
}: LocalEndpointRowsProps) {
  return (
    <>
      <div className="settings-row settings-local-model-toggle-row">
        <div className="settings-row-info">
          <h3 className="settings-row-title">{toggleTitle}</h3>
          <p className="settings-row-description">{toggleDescription}</p>
        </div>
        <div className="settings-row-control">
          <Switch
            checked={endpoint.enabled}
            aria-label={toggleAriaLabel}
            onCheckedChange={endpoint.handleToggle}
          />
        </div>
      </div>

      {endpoint.showFields ? (
        <div className="settings-row settings-row-stack settings-local-model-fields-row">
          <div className="settings-row-info">
            <h3 className="settings-row-title">Endpoint</h3>
            <p className="settings-row-description">{fieldsDescription}</p>
          </div>
          <div className="settings-row-control settings-local-model-fields">
            <label className="settings-field">
              <span>Base URL</span>
              <input
                value={endpoint.draft.baseUrl}
                onChange={(event) => endpoint.updateDraft("baseUrl", event.currentTarget.value)}
                placeholder={baseUrlPlaceholder}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            </label>
            <label className="settings-field">
              <span>Model ID</span>
              <input
                value={endpoint.draft.modelId}
                onChange={(event) => endpoint.updateDraft("modelId", event.currentTarget.value)}
                placeholder={modelIdPlaceholder}
                list={datalistId}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
              <datalist id={datalistId}>
                {endpoint.probeModels.map((id) => (
                  <option key={id} value={id} />
                ))}
              </datalist>
            </label>
            <label className="settings-field">
              <span>Local API key</span>
              <input
                type="password"
                value={endpoint.draft.apiKey}
                onChange={(event) => endpoint.updateDraft("apiKey", event.currentTarget.value)}
                placeholder="Optional"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            </label>
            {endpoint.nonLoopback ? (
              <p className="settings-local-model-warning" role="note">
                This endpoint is not on this machine. Requests will leave your device.
              </p>
            ) : null}
            <div className="settings-local-model-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => void endpoint.testConnection()}
              >
                Test connection
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => void endpoint.handleSave()}
              >
                Save local model
              </button>
            </div>
            {endpoint.status ? (
              <p className="settings-local-model-status" role="status">
                {endpoint.status}
              </p>
            ) : null}
            {endpoint.enableConfirm ? (
              <div className="settings-local-model-confirm" role="alert">
                <p className="settings-row-error">
                  This endpoint is not on this machine. Requests will leave your device.
                </p>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => void endpoint.enable()}
                >
                  Enable anyway
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
