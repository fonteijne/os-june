import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const tokens = readFileSync(resolve("src/styles/tokens.css"), "utf8");
const appCss = readFileSync(resolve("src/styles/app.css"), "utf8");
const settings = readFileSync(resolve("src/components/settings/AppSettings.tsx"), "utf8");
const index = readFileSync(resolve("index.html"), "utf8");
const fonts = readFileSync(resolve("src/styles/fonts.css"), "utf8");
const fontRule = readFileSync(resolve("spec/font-families.md"), "utf8");
const hudFiles = [
  "src/styles/hud.css",
  "src/styles/agent-hud.css",
  "src/styles/meeting-hud.css",
].map((path) => readFileSync(resolve(path), "utf8"));

function ruleFor(source: string, selector: string) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`(?:^|\\n)${escaped}\\s*\\{`).exec(source);
  if (!match) throw new Error(`Missing CSS rule for ${selector}`);
  const start = match.index + match[0].length - 1;
  let depth = 0;
  for (let i = start; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    if (source[i] === "}" && --depth === 0) return source.slice(start + 1, i);
  }
  throw new Error(`Unclosed CSS rule for ${selector}`);
}

describe("Bonzai palette contract", () => {
  it("sets the approved accent, surfaces and role pairings in both themes", () => {
    const light = ruleFor(tokens, ":root");
    const dark = ruleFor(tokens, '[data-theme="dark"]');

    expect(light).toContain("--brand: #365fd9;");
    expect(light).toContain("--ring-focus: #365fd9;");
    expect(light).toContain("--focus-ring: color-mix(in oklch, #365fd9 72%, transparent);");
    expect(light).toContain("--brand-hover: #2a4bb3;");
    expect(light).toContain("--brand-soft: #e9eefc;");
    expect(light).toContain("--on-accent: #ffffff;");
    expect(light).toContain("--accent: var(--neutral-hover);");
    expect(light).toContain("--accent-foreground: var(--foreground);");
    expect(light).toContain("--primary: var(--brand);");
    expect(light).toContain("--primary-foreground: var(--on-accent);");
    expect(light).toContain(
      "--neutral-hover: color-mix(in oklch, var(--foreground) 4%, var(--card));",
    );
    expect(light).toContain("--background: #ffffff;");
    expect(light).toContain("--success: #1b7446;");
    expect(light).toContain("--destructive: #b93c0a;");
    expect(dark).toContain("--brand: #8aa4f2;");
    expect(dark).toContain("--brand-hover: #a9bdf6;");
    expect(dark).toContain("--brand-soft: #172240;");
    expect(dark).toContain("--focus-ring: color-mix(in oklch, #8aa4f2 70%, transparent);");
    expect(dark).toContain("--on-accent: #0a0a0a;");
    expect(dark).toContain("--accent: var(--neutral-hover);");
    expect(dark).toContain("--accent-foreground: var(--foreground);");
    expect(dark).toContain("--primary: var(--brand);");
    expect(dark).toContain("--primary-foreground: var(--on-accent);");
    expect(dark).toContain(
      "--neutral-hover: color-mix(in oklch, var(--foreground) 7%, var(--card));",
    );
    expect(dark).toContain("--background: #0a0a0a;");
    expect(dark).toContain("--success: #5ccf92;");
    expect(dark).toContain("--destructive: #ff9a6b;");
  });

  it("keeps generic hover washes neutral while active states retain blue", () => {
    const light = ruleFor(tokens, ":root");
    const dark = ruleFor(tokens, '[data-theme="dark"]');

    expect(light).toContain("--accent: var(--neutral-hover);");
    expect(light).toContain("--sidebar-accent: var(--neutral-hover);");
    expect(dark).toContain("--accent: var(--neutral-hover);");
    expect(dark).toContain("--sidebar-accent: var(--neutral-hover);");
    for (const selector of [
      '.agent-turn-action:hover:not(:disabled):not([aria-disabled="true"])',
      ".agent-activity-toggle:hover",
      ".agent-activity-drawer-close:hover",
      ".agent-activity-row-action:hover",
      ".agent-artifacts-button:hover",
      ".agent-unsupported-notice-action:hover",
      ".tab-overflow-item:hover",
      ".onboarding-area-option:hover",
    ]) {
      expect(ruleFor(appCss, selector)).toContain("background: var(--neutral-hover);");
    }
    expect(ruleFor(appCss, ".tab-overflow-item[data-active]")).toContain(
      "color-mix(in oklch, var(--brand) 14%, var(--card))",
    );
  });

  it("uses the fixed character palette for onboarding fills, eyes, depth and ambient light", () => {
    const depth = ruleFor(appCss, ".onboarding-character-depth");
    const rim = ruleFor(appCss, ".onboarding-character-rim");
    const eyeColorRule =
      ".onboarding-character-eyes {\n  color: var(--character-feature);\n  fill: currentColor;\n}";
    const darkTokens = ruleFor(tokens, '[data-theme="dark"]');

    expect(appCss).toContain(
      "background: radial-gradient(circle at center, var(--character-ambient), transparent 66%);",
    );
    expect(depth).toContain("fill: var(--character-depth);");
    expect(rim).toContain("stroke: var(--character-rim);");
    expect(appCss).toContain(eyeColorRule);
    expect(darkTokens).toContain("--character-feature: #0a0a0a;");
  });

  it("forces Bonzai character, identity action, recording, and renderer HUD colors", () => {
    const light = ruleFor(tokens, ":root");
    const dark = ruleFor(tokens, '[data-theme="dark"]');
    expect(light).toContain("--character-fill-bottom: #365fd9;");
    expect(light).toContain(
      "--primary-action-background: linear-gradient(180deg, #365fd9, #2a4bb3);",
    );
    expect(light).toContain("--record: #b93c0a;");
    expect(dark).toContain("--character-fill-bottom: #8aa4f2;");
    expect(dark).toContain(
      "--primary-action-background: linear-gradient(180deg, #8aa4f2, #718bd6);",
    );
    expect(dark).toContain("--record: #ff9a6b;");

    for (const hud of hudFiles) {
      expect(hud).toContain("--brand: #8aa4f2;");
      expect(hud).toContain("--attention: var(--clovy-lime);");
      expect(hud).toContain("--character-fill-bottom: #8aa4f2;");
      expect(hud).toContain("--character-feature: #f4f4f2;");
      expect(hud).not.toContain("BRAND_PRESETS");
    }
    expect(hudFiles[0]).toContain("--hud-record-bg: var(--record);");
    expect(hudFiles[0]).toContain("--record-hover: #ffb899;");
    expect(hudFiles[2]).toContain("#mhud-end-keep {\n  background: var(--record);");
    expect(hudFiles[2]).toContain("#mhud-end-keep:hover {\n  background: var(--record-hover);");
  });

  it("removes preset controls but keeps theme, text size and date format", () => {
    const appearanceStart = settings.indexOf('activeTab === "appearance"');
    const appearanceEnd = settings.indexOf('{activeTab === "billing"', appearanceStart);
    const appearance = settings.slice(appearanceStart, appearanceEnd);
    expect(appearance).toContain('title="Appearance"');
    expect(appearance).toContain('settings-row-title">Theme');
    expect(appearance).toContain('settings-row-title">Text size');
    expect(appearance).toContain('settings-row-title">Date format');
    expect(appearance).not.toContain('settings-row-title">Accent');
    expect(appearance).not.toContain("BRAND_PRESETS");
  });

  it("pins both legacy palette keys before the renderer bundle without selecting native icons", () => {
    expect(index).toContain('localStorage.setItem("os-clovy:brand", "bonzai");');
    expect(index).toContain('localStorage.setItem("os-june:brand", "bonzai");');
    expect(index.indexOf('localStorage.setItem("os-clovy:brand", "bonzai");')).toBeLessThan(
      index.indexOf('<script type="module"'),
    );
    expect(readFileSync(resolve("src/main.tsx"), "utf8")).not.toContain("initBrand");
    expect(readFileSync(resolve("src-tauri/src/theme_icon.rs"), "utf8")).toContain(
      "Legacy native dock-icon compatibility",
    );
  });

  it("loads local Manrope and carries its license", () => {
    expect(fonts).toContain('font-family: "Manrope";');
    expect(fonts).toContain('url("/Manrope-Variable.woff2")');
    expect(fonts).toContain("font-weight: 200 800;");
    expect(fontRule).toContain("Manrope");
    expect(readFileSync(resolve("public/Manrope-OFL.txt"), "utf8")).toContain(
      "SIL OPEN FONT LICENSE Version 1.1",
    );
  });
});
