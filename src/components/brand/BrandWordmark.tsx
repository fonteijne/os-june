import { BRAND_ID, BRAND_NAME } from "../../lib/brand.generated";
import { JuneMark, JuneWordmark } from "./JuneWordmark";

/**
 * The sidebar's brand mark. June's own build keeps the hand-traced wordmark
 * (JuneWordmark) unchanged. A whitelabel build (BRAND_ID !== "june") falls
 * back to the squircle mark plus BRAND_NAME as plain text — the traced
 * lettering paths are geometry for the literal word "June" and can't be
 * relabeled to an arbitrary brand name or length.
 */
export function BrandWordmark({ className }: { className?: string }) {
  if (BRAND_ID === "june") {
    return <JuneWordmark className={className} />;
  }
  return (
    <span
      className={className ? `${className} brand-wordmark-fallback` : "brand-wordmark-fallback"}
    >
      <JuneMark size={14} className="brand-wordmark-fallback-mark" />
      <span className="brand-wordmark-fallback-text">{BRAND_NAME}</span>
    </span>
  );
}
