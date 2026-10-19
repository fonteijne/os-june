import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import appCss from "../styles/app.css?raw";
import tokensCss from "../styles/tokens.css?raw";

function cssRuleFor(selector: string, css = appCss) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`(?:^|\\n)${escaped}\\s*\\{`).exec(css);
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

describe("Home polish styles", () => {
  it("gives the Home thread room at the top edge", () => {
    const timeline = cssRuleFor('.agent-timeline[data-home="true"]');

    expect(timeline).toContain("padding-top: var(--sp-8);");
  });

  it("aligns idle suggestions with the composer and keeps the pending mark bare", () => {
    const nudges = cssRuleFor(".agent-home-nudges-idle");
    const pending = cssRuleFor(".agent-home-task-pending");

    expect(nudges).toContain("padding-inline: 0;");
    expect(pending).not.toMatch(/^\s*width:/m);
    expect(pending).not.toMatch(/^\s*height:/m);
    expect(pending).not.toMatch(/^\s*padding:/m);
    expect(pending).toContain("justify-self: start;");
  });

  it("uses the brighter themed action color on the dark Home canvas", () => {
    const action = cssRuleFor('[data-theme="dark"] .agent-home-task-message > button');

    expect(action).toContain("color: var(--brand-bright);");
  });

  it("keeps the editor width stable when a draft wraps", () => {
    const editor = cssRuleFor('.agent-workspace[data-home="true"] .agent-composer-editor-root');
    const multiline = cssRuleFor(
      '.agent-workspace[data-home="true"] .agent-composer-box[data-multiline]',
    );
    const multilineEditor = cssRuleFor(
      '.agent-workspace[data-home="true"] .agent-composer-box[data-multiline] .agent-composer-editor-root',
    );
    const multilineAttach = cssRuleFor(
      '.agent-workspace[data-home="true"] .agent-composer-box[data-multiline] .agent-composer-attach',
    );

    expect(editor).toContain("grid-column: 2;");
    expect(multiline).toContain("align-items: end;");
    expect(multilineEditor).toContain("grid-row: 1;");
    expect(multilineEditor).toContain("grid-column: 1 / -1;");
    expect(multilineAttach).toContain("grid-row: 2;");
  });

  it("aligns a wrapped Home draft with the conversation rail", () => {
    const timeline = cssRuleFor('.agent-timeline[data-home="true"]');
    const multilineEditor = cssRuleFor(
      '.agent-workspace[data-home="true"] .agent-composer-box[data-multiline] .agent-composer-editor',
    );

    expect(timeline).toContain("padding-inline: calc(var(--sp-px) + var(--sp-1) + var(--sp-2));");
    expect(multilineEditor).toContain("padding-inline: var(--sp-2);");
  });

  it("preserves whole words when markdown tables calculate column widths", () => {
    const cells = cssRuleFor(".agent-md-table th,\n.agent-md-table td");

    expect(cells).toContain("overflow-wrap: break-word;");
    expect(cells).toContain("vertical-align: top;");
  });

  it("lets the living Home mark move its body while keeping pine eyes", () => {
    const body = cssRuleFor(".clovy-alive-body");
    const sheen = cssRuleFor(".clovy-alive-sheen");
    const eyes = cssRuleFor(".clovy-alive-eye");

    expect(body).toContain("transform-box: fill-box;");
    expect(body).toContain("transform-origin: 50% 55%;");
    expect(sheen).toContain("opacity: 0.16;");
    expect(eyes).toContain("fill: var(--clovy-pine);");
  });

  it("contains the new-session tint inside a broad bottom-rising falloff", () => {
    const glow = cssRuleFor(".agent-workspace::before");
    const activeGlow = cssRuleFor('.agent-workspace[data-hero="true"]::before');

    expect(glow).toContain("background: linear-gradient(");
    expect(glow).toContain("to bottom");
    expect(glow).toContain("var(--hero-wash-soft) 42%");
    expect(glow).toContain("var(--hero-wash) 100%");
    expect(glow).toContain("mask-image: linear-gradient(");
    expect(glow).not.toContain("radial-gradient(");
    expect(activeGlow).toContain("opacity: 1;");
  });

  it("keeps recording status dots inside the semantic orange family", () => {
    const sidebarDot = cssRuleFor(".sidebar-recording-dot");
    const noteDot = cssRuleFor(".note-recording-dot");
    const pulse = cssRuleFor("@keyframes note-recording-breathe");

    for (const rule of [sidebarDot, noteDot]) {
      expect(rule).toContain("--recording-pulse-rest: var(--record);");
      expect(rule).toContain("--recording-pulse-peak: var(--record-hover);");
    }
    expect(pulse).toContain("var(--recording-pulse-rest, var(--record))");
    expect(pulse).toContain("var(--recording-pulse-peak, var(--record-hover))");
  });

  it("drops a composer edge fade immediately when it reaches the visible caret", () => {
    const endCaret = cssRuleFor('.agent-composer-editor-root[data-caret-edge="end"]::after');

    expect(endCaret).toContain("opacity: 0;");
    expect(endCaret).toContain("transition: none;");
  });
});

describe("Bonzai theme-state parity", () => {
  it("uses the approved fixed light/dark Bonzai accent and foregrounds", () => {
    const lightTokens = cssRuleFor(":root", tokensCss);
    const darkTokens = cssRuleFor('[data-theme="dark"]', tokensCss);

    expect(lightTokens).toContain("--brand: #365fd9;");
    expect(lightTokens).toContain("--primary-foreground: var(--on-accent);");
    expect(darkTokens).toContain("--brand: #8aa4f2;");
    expect(darkTokens).toContain("--primary: var(--brand);");
    expect(darkTokens).toContain("--primary-foreground: var(--on-accent);");
  });

  it("routes onboarding progress and checked switches through the semantic accent", () => {
    const progress = cssRuleFor('.onboarding-progress-seg[data-state="current"]');
    const checkedSwitch = cssRuleFor('.switch[data-state="checked"]');

    expect(progress).toContain("background: var(--primary);");
    expect(checkedSwitch).toContain("background: var(--primary);");
  });

  it("clears the active highlight from dormant send controls", () => {
    const send = cssRuleFor(".agent-composer-send:disabled");
    const steerSend = cssRuleFor(".agent-composer-steer-send:disabled");

    expect(send).toContain("box-shadow: none;");
    expect(steerSend).toContain("box-shadow: none;");
  });

  it("routes active composer sends through the selected Appearance accent", () => {
    const send = cssRuleFor(".agent-composer-send");
    const steerSend = cssRuleFor(".agent-composer-steer-send");

    for (const rule of [send, steerSend]) {
      expect(rule).toContain("background: var(--primary);");
      expect(rule).toContain("color: var(--primary-foreground);");
      expect(rule).not.toContain("var(--primary-action-background)");
    }
  });

  it("uses the active Appearance accent for home shortcut icons", () => {
    const icon = cssRuleFor(".agent-hero-chip-icon");

    expect(icon).toContain("color: var(--primary);");
  });

  it("keeps the static character lime and fixes the Home character to blue", () => {
    const identityCharacter = cssRuleFor(".clovy-alive");
    const appearanceCharacter = cssRuleFor('.clovy-alive[data-palette="appearance"]');
    const lightTokens = cssRuleFor(":root", tokensCss);
    const darkTokens = cssRuleFor('[data-theme="dark"]', tokensCss);
    const character = readFileSync("src/components/brand/ClovyAlive.tsx", "utf8");

    expect(lightTokens).toContain("--clovy-glow: var(--clovy-lime);");
    expect(lightTokens).toContain("--character-fill-bottom: #365fd9;");
    expect(darkTokens).toContain("--character-fill-bottom: #8aa4f2;");
    expect(identityCharacter).toContain("--clovy-alive-fill-bottom: var(--clovy-glow);");
    expect(appearanceCharacter).toContain(
      "--clovy-alive-fill-bottom: var(--character-fill-bottom);",
    );
    expect(appearanceCharacter).toContain("var(--character-fill-bottom) 68%");
    expect(appearanceCharacter).toContain("var(--clovy-ink)");
    expect(appCss).not.toContain(':root[data-brand="sage"] .clovy-alive');
    expect(character).toContain("var(--clovy-alive-fill-bottom, var(--clovy-glow))");
    expect(character).toContain('<title>{label ?? "Bonzai Agent"}</title>');
    expect(character).toContain('palette === "appearance"');
    expect(character).toContain('"aria-label": label ?? "Bonzai Agent"');
  });

  it("keeps the fixed Bonzai palette independent of saved Appearance colors", () => {
    expect(tokensCss).toContain("--brand: #365fd9;");
    expect(tokensCss).toContain("--brand: #8aa4f2;");
    expect(tokensCss).not.toContain("--brand: #3f812f;");
  });
});
