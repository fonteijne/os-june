import { encodeLocalOptionId, decodeLocalOptionId, isLoopbackUrl } from "./local-endpoint";
import type { LocalTranscriptionSettingsDto, VeniceModelDto } from "./tauri";

// Bring-your-own speech-to-text (any OpenAI-compatible
// `/v1/audio/transcriptions` server, e.g. speaches). Sibling of
// local-generation.ts: the configured endpoint is surfaced as a synthetic
// catalog option in the transcription model picker.

export const LOCAL_TRANSCRIPTION_OPTION_ID_PREFIX = "__june_local_transcription__:";

/** Stable synthetic id for the local transcription catalog option. */
export function localTranscriptionOptionId(modelId: string) {
  return encodeLocalOptionId(LOCAL_TRANSCRIPTION_OPTION_ID_PREFIX, modelId);
}

/** The raw model id behind a synthetic local transcription option id, or
 * null when the id is not one. */
export function rawLocalTranscriptionModelId(optionId: string): string | null {
  return decodeLocalOptionId(LOCAL_TRANSCRIPTION_OPTION_ID_PREFIX, optionId);
}

/** Prepends the configured local transcription endpoint as a synthetic
 * catalog option when a model id is set. Privacy is only claimed as "local"
 * for a loopback endpoint; a remote host is marked "external" since audio
 * leaves the device. */
export function withLocalTranscriptionOption(
  models: VeniceModelDto[],
  localTranscription: LocalTranscriptionSettingsDto,
): VeniceModelDto[] {
  const modelId = localTranscription.modelId.trim();
  if (!modelId) return models;
  const loopback = isLoopbackUrl(localTranscription.baseUrl);
  const localModel: VeniceModelDto = {
    provider: "local",
    id: localTranscriptionOptionId(modelId),
    name: `Local: ${modelId}`,
    modelType: "asr",
    description: loopback
      ? "OpenAI-compatible local speech-to-text model. The first transcription after the server has been idle can take longer while the model loads."
      : "OpenAI-compatible speech-to-text model on a remote endpoint.",
    privacy: loopback ? "local" : "external",
    pricing: { display: "Local" },
    traits: ["local"],
    capabilities: [],
    priceUnit: "local",
    priceDescription: "Local",
  };
  return [localModel, ...models];
}
