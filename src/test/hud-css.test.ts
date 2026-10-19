import { describe, expect, it } from "vitest";
import agentHudCss from "../styles/agent-hud.css?raw";
import hudCss from "../styles/hud.css?raw";
import meetingHudCss from "../styles/meeting-hud.css?raw";
import tokensCss from "../styles/tokens.css?raw";

function cssRuleFor(css: string, selector: string) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`${escaped}\\s*\\{`).exec(css);
  if (!match) throw new Error(`Missing CSS rule for ${selector}`);
  const openIndex = match.index + match[0].length - 1;
  let depth = 0;
  for (let index = openIndex; index < css.length; index += 1) {
    if (css[index] === "{") depth += 1;
    if (css[index] === "}") {
      depth -= 1;
      if (depth === 0) return css.slice(openIndex + 1, index);
    }
  }
  throw new Error(`Unclosed CSS rule for ${selector}`);
}

describe("dictation HUD styles", () => {
  it("uses a compact overlay shadow that fits the HUD window gutter", () => {
    expect(tokensCss).toContain("--shadow-hud:");
    expect(cssRuleFor(hudCss, ".hud")).toContain("box-shadow: var(--shadow-hud);");
    expect(cssRuleFor(hudCss, ".hud-error-layer")).toContain("box-shadow: var(--shadow-hud);");
    expect(cssRuleFor(hudCss, ".hud")).not.toContain("box-shadow: var(--shadow-md);");
  });

  it("keeps HUD status marks lime, uses orange recording controls, and blue identity controls", () => {
    for (const css of [hudCss, meetingHudCss, agentHudCss]) {
      const root = cssRuleFor(css, ":root");
      expect(root).toContain("--attention: var(--clovy-lime);");
      expect(root).toContain("--attention-bright: var(--clovy-lime-top);");
    }

    const dictationRoot = cssRuleFor(hudCss, ":root");
    expect(dictationRoot).toContain("--record: #ff9a6b;");
    const dictationSurface = cssRuleFor(hudCss, ".hud");
    expect(dictationSurface).toContain("--hud-record-bg: var(--record);");
    expect(dictationSurface).toContain("--hud-record-fg: #0a0a0a;");
    const meetingRoot = cssRuleFor(meetingHudCss, ":root");
    expect(meetingRoot).toContain("--record: #ff9a6b;");
    expect(meetingRoot).toContain("--record-hover: #ffb899;");

    const recordMeetingButton = cssRuleFor(hudCss, ".hud-meeting-start");
    expect(recordMeetingButton).toContain("background: var(--hud-record-bg);");
    const recordMeetingHover = cssRuleFor(
      hudCss,
      ".hud-meeting-start.is-hovered,\n.hud-meeting-start:hover",
    );
    expect(recordMeetingHover).toContain("background: var(--record-hover);");

    const keepRecording = cssRuleFor(meetingHudCss, "#mhud-end-keep");
    expect(keepRecording).toContain("background: var(--record);");
    const keepRecordingHover = cssRuleFor(meetingHudCss, "#mhud-end-keep:hover");
    expect(keepRecordingHover).toContain("background: var(--record-hover);");
    expect(keepRecording).toContain("color: #0a0a0a;");
  });
});
