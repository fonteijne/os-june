// Shared between the bring-your-own text generation endpoint
// (local-generation.ts) and the bring-your-own transcription endpoint
// (local-transcription.ts): both are an OpenAI-compatible base URL, a model
// id, and an optional API key, surfaced in the model picker as a synthetic
// catalog option whose id is tagged so it can never collide with a remote
// model id.

export type LocalEndpointDto = {
  baseUrl: string;
  modelId: string;
  apiKey: string;
};

/** Stable synthetic catalog id for a local model: `{prefix}{encoded id}`. */
export function encodeLocalOptionId(prefix: string, modelId: string) {
  return `${prefix}${encodeURIComponent(modelId.trim())}`;
}

/** Inverse of {@link encodeLocalOptionId}: the raw model id, or null when the
 * option id does not carry the prefix (or is malformed). */
export function decodeLocalOptionId(prefix: string, optionId: string): string | null {
  if (!optionId.startsWith(prefix)) return null;
  try {
    const decoded = decodeURIComponent(optionId.slice(prefix.length)).trim();
    return decoded || null;
  } catch {
    return null;
  }
}

/** True when the endpoint resolves to this machine: localhost, any
 * *.localhost name, the 127.0.0.0/8 loopback block, or the IPv6 [::1]
 * literal. Invalid input is treated as non-loopback (returns false) so the
 * caller shows the "leaves your device" warning rather than a false
 * reassurance. */
export function isLoopbackUrl(url: string): boolean {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return false;
  }
  // URL.hostname keeps the brackets on IPv6 literals ("[::1]").
  const bare = host.replace(/^\[|\]$/g, "");
  if (bare === "localhost" || bare.endsWith(".localhost")) return true;
  if (bare === "::1") return true;
  const octets = bare.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (octets) {
    const parts = octets.slice(1).map(Number);
    if (parts.every((part) => part <= 255) && parts[0] === 127) return true;
  }
  return false;
}
