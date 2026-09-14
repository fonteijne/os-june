import type { RuntimeFailureDetails } from "./sanitize.js";

// A Bonzai refusal from the host (no key, a rejected key, a model the key
// cannot reach, the egress guard) arrives as an RPC error carrying the
// `AppError` code in `data.appErrorCode`. Left to the generic classifier its
// message matches nothing and it lands in the "runtime" bucket, which the UI
// renders as "Clovy stopped unexpectedly". This names it as a provider
// failure and keeps the host's message, so the UI can show the reason.

const BONZAI_CODE = /^(?:bonzai_[a-z_]+|egress_blocked)$/;

export function bonzaiFailure(error: unknown): RuntimeFailureDetails | undefined {
  const seen = new Set<unknown>();
  let current = error;
  for (let depth = 0; depth < 8 && current != null && !seen.has(current); depth += 1) {
    seen.add(current);
    if (typeof current !== "object") return undefined;
    const candidate = current as { data?: unknown; message?: unknown; error?: unknown; cause?: unknown };
    const data = candidate.data as { appErrorCode?: unknown } | null | undefined;
    const code = typeof data?.appErrorCode === "string" ? data.appErrorCode : undefined;
    if (code && BONZAI_CODE.test(code)) {
      const message = typeof candidate.message === "string" ? candidate.message : code;
      return { message, category: "provider", code, retryable: false };
    }
    current = candidate.error ?? candidate.cause;
  }
  return undefined;
}
