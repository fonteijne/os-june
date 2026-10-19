import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Agent HUD attention-mark palette contract", () => {
  it("keeps needs-input commentary aligned with the lime attention token", () => {
    const source = readFileSync("src/styles/agent-hud.css", "utf8");
    const rule = source.match(/\.agent-hud-mark\[data-status="waitingForUser"\] \{[^}]*\}/)?.[0];

    expect(rule).toContain("--mark-base: var(--attention);");
    expect(rule).toContain("--mark-shine: var(--attention-bright);");
    expect(source).not.toContain("blue for input");
    expect(source).toContain("lime for waiting-for-user-input");
  });
});
