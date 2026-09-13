import { encodeLocalOptionId, decodeLocalOptionId, isLoopbackUrl } from "./local-endpoint";
import type { LocalGenerationSettingsDto, VeniceModelDto } from "./tauri";

// Bring-your-own local text generation. The model catalog is derived
// client-side from provider settings, so the user's configured local endpoint
// is surfaced as a synthetic catalog option. These helpers are shared between
// the settings surface and the agent composer, so they live outside
// AppSettings.

export const LOCAL_GENERATION_OPTION_ID_PREFIX = "__june_local_generation__:";

/** Stable synthetic id for the local model catalog option. Prefixed so it can
 * never collide with a real remote model id (finding: a raw local id that
 * matched a remote id let the picker persist it as the remote model). */
export function localGenerationOptionId(modelId: string) {
  return encodeLocalOptionId(LOCAL_GENERATION_OPTION_ID_PREFIX, modelId);
}

/** Inverse of {@link localGenerationOptionId}: the raw local model id encoded
 * in a synthetic option id, or null when the id is not a synthetic local
 * option (or is malformed). The tagged id stays intact in session settings to
 * retain upstream provenance; Clovy's on-device integration uses this inverse
 * only when it needs to display or forward the raw local id. */
export function rawLocalGenerationModelId(optionId: string): string | null {
  return decodeLocalOptionId(LOCAL_GENERATION_OPTION_ID_PREFIX, optionId);
}

/** Display-only row for a session whose tagged local choice no longer matches
 * the configured endpoint. Keep the original choice visible; sends fail closed
 * in Clovy's on-device provider proxy until the user reconfigures or selects
 * another model. */
export function unavailableLocalGenerationOption(optionId: string): VeniceModelDto | null {
  const modelId = rawLocalGenerationModelId(optionId);
  if (!modelId) return null;
  return {
    provider: "local",
    id: optionId,
    name: `Local: ${modelId}`,
    modelType: "text",
    description: "This local model is no longer configured.",
    pricing: { display: "Local" },
    traits: ["local"],
    capabilities: [],
    priceUnit: "local",
    priceDescription: "Local",
  };
}

/** Prepends the user's configured local endpoint as a synthetic catalog
 * option when a model id is set. Capabilities are left empty: a local model's
 * tool support can't be verified from here, so it must not be advertised as
 * tool-capable (see modelSupportsTools, which special-cases the local
 * provider instead). Privacy is only claimed as "local" for a loopback
 * endpoint; a remote endpoint is marked "external" since prompts leave the
 * device. */
export function withLocalGenerationOption(
  models: VeniceModelDto[],
  localGeneration: LocalGenerationSettingsDto,
): VeniceModelDto[] {
  const modelId = localGeneration.modelId.trim();
  if (!modelId) return models;
  const loopback = isLoopbackUrl(localGeneration.baseUrl);
  const localModel: VeniceModelDto = {
    provider: "local",
    id: localGenerationOptionId(modelId),
    name: `Local: ${modelId}`,
    modelType: "text",
    description: loopback
      ? "OpenAI-compatible local text model."
      : "OpenAI-compatible text model on a remote endpoint.",
    privacy: loopback ? "local" : "external",
    pricing: { display: "Local" },
    traits: ["local"],
    capabilities: [],
    priceUnit: "local",
    priceDescription: "Local",
  };
  return [localModel, ...models];
}
