import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { readLegacyNativeIconPalette } from "../../scripts/generate-icons.mjs";

const root = process.cwd();

function embeddedIconIds() {
  const source = readFileSync(resolve(root, "src-tauri/src/theme_icon.rs"), "utf8");
  return new Set(
    Array.from(
      source.matchAll(/include_bytes!\("\.\.\/icons\/themed\/icon-([a-z0-9-]+)\.png"\)/g),
      (match) => match[1],
    ),
  );
}

describe("legacy native icon generator palette", () => {
  it("retains the packaged native icon ids and colors outside renderer branding", () => {
    const palette = readLegacyNativeIconPalette();

    expect(palette).toEqual([
      { id: "sage", value: "#3f812f" },
      { id: "clay", value: "#b5551f" },
      { id: "rose", value: "#a5655c" },
      { id: "ocean", value: "#3d7b9a" },
      { id: "plum", value: "#965d84" },
    ]);
    expect(palette.map(({ id }) => id).sort()).toEqual([...embeddedIconIds()].sort());
    expect(readFileSync(resolve(root, "scripts/generate-icons.mjs"), "utf8")).not.toContain(
      "BRAND_PRESETS",
    );
  });

  it("still derives themed SVG materials for each packaged icon", () => {
    const source = readFileSync(
      resolve(root, "src-tauri/icons/themed/_src/icon.template.svg"),
      "utf8",
    );

    for (const { id, value } of readLegacyNativeIconPalette()) {
      expect(value).toMatch(/^#[0-9a-f]{6}$/);
      if (id !== "sage") {
        expect(value).not.toBe("#365fd9");
      }
    }
    expect(source).toContain("{{ACCENT_LIGHT}}");
    expect(source).toContain("{{ACCENT_DARK}}");
    expect(source).toContain("{{MARK_TOP}}");
  });
});
