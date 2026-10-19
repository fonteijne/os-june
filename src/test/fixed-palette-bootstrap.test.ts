import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

describe("Bonzai first-paint bootstrap", () => {
  it("applies theme and font scale when brand storage writes fail", () => {
    const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8");
    const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
    expect(scriptMatch).not.toBeNull();
    const scriptBody = scriptMatch?.[1] ?? "";
    const setAttribute = vi.fn();
    const setProperty = vi.fn();
    const getItem = vi.fn((key: string) => {
      if (key === "os-clovy:theme") return "dark";
      if (key === "os-clovy:font-scale") return "larger";
      return null;
    });
    const setItem = vi.fn((key: string) => {
      if (key === "os-clovy:brand" || key === "os-june:brand") {
        throw new DOMException("Storage quota exceeded", "QuotaExceededError");
      }
    });

    runInNewContext(scriptBody, {
      localStorage: { getItem, setItem },
      window: { matchMedia: vi.fn(() => ({ matches: false })) },
      document: { documentElement: { setAttribute, style: { setProperty } } },
    });

    expect(getItem).toHaveBeenCalledWith("os-clovy:theme");
    expect(setAttribute).toHaveBeenCalledWith("data-theme", "dark");
    expect(getItem).toHaveBeenCalledWith("os-clovy:font-scale");
    expect(setItem).toHaveBeenCalledWith("os-clovy:brand", "bonzai");
    expect(setItem).toHaveBeenCalledWith("os-june:brand", "bonzai");
    expect(setProperty).toHaveBeenCalledWith("--font-scale", "1.2");
  });

  it("keeps the inline first-paint script synchronized with the CSP hash", () => {
    const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8");
    const tauriConf = JSON.parse(
      readFileSync(resolve(process.cwd(), "src-tauri", "tauri.conf.json"), "utf8"),
    );
    const csp: string = tauriConf.app.security.csp;

    // Extract the single inline <script> block (no type=module, no src).
    const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
    expect(scriptMatch).not.toBeNull();
    const scriptBody = scriptMatch?.[1] ?? "";

    const digest = createHash("sha256").update(scriptBody).digest("base64");
    const cspHash = `sha256-${digest}`;
    const scriptPolicy = csp
      .split(";")
      .find((directive: string) => directive.trim().startsWith("script-src"));
    expect(scriptPolicy).toBeDefined();
    const configHash = scriptPolicy?.match(/sha256-[A-Za-z0-9+/=]+/)?.[0];

    expect(configHash, "tauri.conf.json script-src must contain this inline script's hash").toBe(
      cspHash,
    );
  });
});
