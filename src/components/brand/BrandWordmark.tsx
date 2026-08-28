import { BRAND_ID, BRAND_NAME } from "../../lib/brand.generated";
import { ClovyWordmark } from "./ClovyLogo";

/**
 * The sidebar's brand mark. Clovy's own build keeps the traced ClovyWordmark
 * unchanged. A whitelabel build (BRAND_ID !== "clovy") falls back to a
 * generic accent-colored initial tile plus BRAND_NAME as plain text — the
 * Clovy wordmark and leaf mark are artwork traced from Clovy's own marketing
 * source and can't be relabeled to an arbitrary brand name.
 */
export function BrandWordmark({ className }: { className?: string }) {
  if (BRAND_ID === "clovy") {
    return <ClovyWordmark className={className} label={BRAND_NAME} variant="mono" />;
  }
  const initial = BRAND_NAME.trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      className={className ? `${className} brand-wordmark-fallback` : "brand-wordmark-fallback"}
    >
      <span className="brand-wordmark-fallback-mark" aria-hidden>
        {initial}
      </span>
      <span className="brand-wordmark-fallback-text">{BRAND_NAME}</span>
    </span>
  );
}
